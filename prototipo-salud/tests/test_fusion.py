import pandas as pd
import pytest

import verificar as V
from fusion import reglas, tabla
from fusion.red_fusion_stub import predecir
from sensores.importador import cargar


@pytest.fixture(scope="module")
def sens():
    return cargar(V.EJEMPLO_CSV)[0]


def test_tabla_solo_un_sujeto(sens):
    eco = V.eco_fixture()
    t = tabla.construir(eco, sens, "SIM-A01")
    assert set(t["subject_id"]) == {"SIM-A01"}
    assert any("SIM-B02" in a for a in t.attrs["avisos"])
    assert set(t["clase_dato"]) <= set(tabla.CLASES)


def test_comparar_modelos_diferencia_tolerancia_y_nota():
    eco = V.eco_fixture()
    c = tabla.comparar_modelos(eco, "SIM-A01")
    r = c.iloc[0]
    assert (r["modelo_a"], r["modelo_b"]) == ("echonet_dynamic", "panecho")
    assert r["diferencia_b_menos_a"] == -17 and r["abs_diferencia"] == 17 and r["discrepancia"] == True  # noqa: E712
    assert "no implica exactitud" in r["nota"] and "no se promedian" in r["nota"]
    assert tabla.comparar_modelos(eco, "SIM-B02").iloc[0]["discrepancia"] == False  # noqa: E712
    c2 = tabla.comparar_modelos(eco, "SIM-A01", tolerancias={"FEVE": 20})
    assert c2.iloc[0]["discrepancia"] == False  # noqa: E712
    assert not any(col in c.columns for col in ("promedio", "media"))


def test_no_compara_probabilidades_ni_similitudes_ni_unidades_distintas():
    e = V.eco_fixture()
    e.loc[:, "tipo"] = "probabilidad_clase"
    assert tabla.comparar_modelos(e, "SIM-A01").empty
    e2 = V.eco_fixture()
    e2.loc[e2.model == "panecho", "unit"] = "mm"
    assert tabla.comparar_modelos(e2, "SIM-A01").empty


def test_equivalencias_ampliables():
    tabla.registrar_equivalencia("EF_Panecho_X", "FEVE")
    assert tabla.canonica("ef_panecho_x") == "FEVE"
    tabla.EQUIVALENCIAS.pop("ef_panecho_x")


def test_r3_nightsignal_activa_en_a01_y_no_en_b02(sens):
    ta = tabla.construir(None, sens, "SIM-A01")
    r3 = next(a for a in reglas.evaluar(ta, None) if a["id"] == "R3")
    assert r3["activada"] and r3["simulada"] and len(r3["datos"]) == 2
    assert {d["periodo"] for d in r3["datos"]} == {"2026-11-08", "2026-11-09"}
    assert all(d["diferencia_vs_basal"] >= 4 for d in r3["datos"])
    assert "Alavi" in r3["fuente"] and r3["etiqueta"].startswith("REGLA EXPERIMENTAL")
    tb = tabla.construir(None, sens, "SIM-B02")
    assert not next(a for a in reglas.evaluar(tb, None) if a["id"] == "R3")["activada"]
    # parametro configurable: con umbral 7 bpm ya no se activa
    r3b = next(a for a in reglas.evaluar(ta, None, {"R3": {"umbral_bpm": 7}}) if a["id"] == "R3")
    assert not r3b["activada"]


def test_reglas_r1_r2_r4_r5(sens):
    eco = V.eco_fixture()
    t = tabla.construir(eco, sens, "SIM-A01")
    c = tabla.comparar_modelos(eco, "SIM-A01")
    al = {a["id"]: a for a in reglas.evaluar(t, c)}
    assert al["R1"]["activada"] and [d["fuente"] for d in al["R1"]["datos"]] == ["panecho"]
    assert al["R2"]["activada"] and al["R4"]["activada"] and al["R5"]["activada"]
    off = {a["id"]: a for a in reglas.evaluar(t, c, {"R1": {"umbral_feve": 30}, "R4": {"max_horas": 500}})}
    assert not off["R1"]["activada"] and not off["R4"]["activada"] and not off["R5"]["activada"]
    for a in al.values():
        assert {"id", "nombre", "etiqueta", "formula", "parametros", "activada", "datos", "mensaje", "fuente"} <= set(a)
        assert "%" not in a["mensaje"].replace("40 %", "") or "riesgo" not in a["mensaje"].lower()
    with pytest.raises(ValueError):
        reglas.evaluar(pd.concat([t, tabla.construir(eco, sens, "SIM-B02")]), None)


def test_r4_sin_timestamp_no_se_inventa(sens):
    eco = V.eco_fixture()
    eco["timestamp"] = None
    t = tabla.construir(eco, sens, "SIM-A01")
    assert t[t.origen == "eco"]["dif_sensor_menos_eco_h"].isna().all()
    r4 = next(a for a in reglas.evaluar(t, None) if a["id"] == "R4")
    assert not r4["activada"] and "No evaluable" in r4["mensaje"]


def test_stub_sin_probabilidades(sens):
    t = tabla.construir(None, sens, "SIM-A01")
    r = predecir(t)
    assert r["disponible"] is False and r["probabilidades"] is None
    assert "No existe un predictor entrenado" in r["motivo"] and r["entradas_recibidas"] == list(t.columns)
