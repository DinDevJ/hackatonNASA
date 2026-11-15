"""Valor normal por variable (detalle.referencias). Datos sinteticos de prueba; nada es un diagnostico."""
import json
import math
import sqlite3

import pytest

from motor import evadb, normalizacion as N, parametros, referencias as R
from tests.test_evadb import bd  # noqa: F401  (fixture; se salta sin node)


def _item(*vids, **kw):
    return {"ligas": [{"variable_id": v, "unidad": "u", **kw} for v in vids]}


def _base(mu=70.0, s=4.0, **kw):
    return {"mu": mu, "s": s, "n0": 12, "B": 0.08, "clase": "reloj_ppg", "congelada": True, "s_w_fuente": "propia",
            "ref_fuente": "x", "transformacion": None, **kw}


def test_fc_hombre_44():
    r = R.referencias_detalle(_item("01:V3", z_pob=0.0), {"perfil": {"sexo": "M", "edad": 44}}, "real")["01:V3"]
    assert r["tipo"] == "poblacional" and r["rango"] == [52, 90] and r["centro"] == 68 and r["unidad"] == "lpm"
    assert r["poblacional"]["grupo"] == "M 40–59 años" and r["fuente_corta"] == "NHANES (Ostchega 2011)"
    assert r["poblacional"]["percentiles"] == {"p5": 52, "p50": 68, "p95": 90}
    assert r["poblacional"]["percentil_valor_aprox"] == 50.0 and r["simulado"] is False


def test_fc_mujer_33():
    r = R.referencias_detalle(_item("01:V3"), {"perfil": {"sexo": "F", "edad": 33}}, "real")["01:V3"]
    assert r["rango"] == [57, 95] and r["poblacional"]["percentil_valor_aprox"] is None


def test_fc_sin_perfil_cae_a_personal():
    pers = {"perfil": {}, "variables": {"01:V3": {"base": _base()}}}
    r = R.referencias_detalle(_item("01:V3"), pers, "real")["01:V3"]
    k = parametros.valor("rampa_inicio")
    assert r["tipo"] == "base personal prevuelo" and r["poblacional"] is None
    assert r["rango"] == [round(70 - k * 4, 2), round(70 + k * 4, 2)] and r["centro"] == 70 and r["unidad"] == "u"
    assert r["personal"]["k"] == k and "rampa_inicio" in r["calculo"]
    pers["perfil"] = {"sexo": "M", "edad": 61}      # fuera de 20-59
    assert R.referencias_detalle(_item("01:V3"), pers, "real")["01:V3"]["tipo"] == "base personal prevuelo"


def test_temperatura():
    r = R.referencias_detalle(_item("04:A1"), {}, "real")["04:A1"]
    assert r["rango"] == [35.7, 37.3] and r["centro"] == 36.6 and r["unidad"] == "°C" and r["fuente_corta"] == "Obermeyer 2017"


def test_hrv_destransformado():
    r = R.referencias_detalle(_item("03:V17", z_pob=0.1), {}, "real")["03:V17"]
    assert r["unidad"] == "ms" and r["rango"] == pytest.approx([19.96, 78.7], abs=0.05)
    assert "5 min" in r["calculo"]
    # sin z_pob la rama poblacional no se uso: sin base -> sin referencia
    assert R.referencias_detalle(_item("03:V17"), {}, "real")["03:V17"]["tipo"] == "sin referencia"


def test_hrv_personal_destransforma():
    b = _base(mu=math.log(50), s=0.2, transformacion="ln")
    pers = {"variables": {"03:V17": {"base": b}}}
    r = R.referencias_detalle(_item("03:V17"), pers, "real")["03:V17"]
    k = parametros.valor("rampa_inicio")
    assert r["centro"] == pytest.approx(50, abs=0.01)
    assert r["rango"][1] == pytest.approx(50 * math.exp(k * 0.2), abs=0.01)


def test_sin_referencia():
    r = R.referencias_detalle(_item("04:A9"), {}, "real")["04:A9"]
    assert r["tipo"] == "sin referencia" and r["rango"] is None and "ALGORITMOS c.2" in r["motivo"]
    assert r["fuente_corta"] == "sin referencia"


def test_cusum_y_simulado():
    def est(c):
        pers = {"variables": {"04:A9": {"cusum": c}}}
        return R.referencias_detalle(_item("04:A9"), pers, "SIMULADO")["04:A9"]
    assert est({"pos": 5, "neg": 0, "senal_pos": True, "senal_neg": False, "n": 9})["cusum"]["estado"] == "señal ↑"
    assert est({"pos": 0, "neg": 5, "senal_pos": False, "senal_neg": True, "n": 9})["cusum"]["estado"] == "señal ↓"
    assert est({"pos": 5, "neg": 5, "senal_pos": True, "senal_neg": True, "n": 9})["cusum"]["estado"] == "señal ↑↓"
    assert est({"pos": 0, "neg": 0, "senal_pos": False, "senal_neg": False, "n": 9})["cusum"]["estado"] == "sin señal"
    assert est(None)["cusum"] is None and est(None)["simulado"] is True


def test_json_sin_nan():
    pers = {"perfil": {"sexo": "M", "edad": 30}, "variables": {"04:A9": {"base": _base(mu=float("nan"))}}}
    it = _item("01:V3", "04:A1", "03:V17", "04:A9", z_pob=float("nan"), z_fase=1.0)
    out = R.referencias_detalle(it, pers, "real")
    json.dumps(out, allow_nan=False)
    assert out["04:A9"]["tipo"] == "sin referencia"


def test_temp_de_sin_cambio():
    assert N.TEMP_DE == (37.3 - 35.7) / (2 * 1.96) and N.TEMP_RANGO == (35.7, 37.3)


def test_integracion_simulada(bd):  # noqa: F811
    r = evadb.evaluar_eva_db(guardar=True, simulado=True)
    assert r["filas_escritas"] > 0
    con = sqlite3.connect(bd)
    filas = con.execute("SELECT tripulante, detalle FROM evaluaciones WHERE canal='SIMULADO'").fetchall()
    con.close()
    assert filas
    tipos, fc = set(), {}
    for trip, det in filas:
        d = json.loads(det)
        assert "referencias" in d and d["referencias"]
        for vid, e in d["referencias"].items():
            assert e["simulado"] is True and e["variable_id"] == vid
            tipos.add(e["tipo"])
            if vid == "01:V3" and e["tipo"] == "poblacional":
                fc[trip] = e["rango"]
    assert {"poblacional", "base personal prevuelo"} <= tipos
    assert fc.get("SIM-T01") == [52, 89]
