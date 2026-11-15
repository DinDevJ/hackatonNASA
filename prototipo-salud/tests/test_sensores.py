import io
import math

import pandas as pd
import pytest

from sensores import resumen
from sensores.importador import VARIABLES, a_formato_comun, cargar

CAB = "subject_id,timestamp,device,variable,value,unit,quality,simulated,metric_detail,notes\n"


def _c(txt):
    return cargar(io.StringIO(CAB + txt), "t.csv")


def test_variables_canonicas():
    for v in ["heart_rate", "hrv_rmssd", "hrv_sdnn", "spo2", "bp_systolic", "bp_diastolic", "temp_skin",
              "temp_body", "sleep_duration", "sleep_efficiency", "steps", "active_minutes", "symptom"]:
        assert VARIABLES[v]["unidad"] and VARIABLES[v]["descripcion"]


def test_descarta_con_aviso_y_no_inventa_ceros():
    df, av = _c("S1,2026-11-01T08:00:00,w,heart_rate,60,bpm,,true,,\n"
                ",2026-11-01T09:00:00,w,heart_rate,61,bpm,,true,,\n"
                "S1,no-es-fecha,w,heart_rate,62,bpm,,true,,\n"
                "S1,2026-11-01T10:00:00,w,heart_rate,,bpm,,true,,\n")
    assert len(df) == 2
    txt = "\n".join(av)
    assert "DESCARTADAS 1 filas: sin subject_id" in txt
    assert "DESCARTADAS 1 filas: timestamp" in txt
    assert df["value"].isna().sum() == 1 and (df["value"].dropna() != 0).all()


def test_hrv_exige_metrica_y_temperatura_ambigua():
    df, av = _c("S1,2026-11-01T08:00:00,w,hrv,40,ms,,true,,\n"
                "S1,2026-11-01T08:00:00,w,hrv,41,ms,,true,rmssd,\n"
                "S1,2026-11-01T08:00:00,w,temperature,36,°C,,true,,\n")
    assert list(df["variable"]) == ["hrv_rmssd"]
    assert any("HRV sin metrica" in a for a in av) and any("temperatura ambigua" in a for a in av)


def test_conversion_f_a_c_anotada_y_unidad_incompatible_descartada():
    df, av = _c("S1,2026-11-01T08:00:00,t,temp_body,98.6,F,,true,,\n"
                "S1,2026-11-01T08:00:00,t,heart_rate,60,mph,,true,,\n"
                "S1,2026-11-01T08:00:00,t,spo2,97,,,true,,\n")
    tb = df[df.variable == "temp_body"].iloc[0]
    assert tb["unit"] == "°C" and math.isclose(tb["value"], 37.0, abs_tol=1e-3) and "°F->°C" in tb["notes"]
    assert "heart_rate" not in set(df["variable"])
    assert df[df.variable == "spo2"].iloc[0]["unit"] == "%" and any("sin unidad" in a for a in av)


def test_simulated_se_conserva_y_faltan_columnas_obligatorias():
    df, _ = _c("S1,2026-11-01T08:00:00,w,heart_rate,60,bpm,,false,,\nS1,2026-11-01T09:00:00,w,heart_rate,60,bpm,,true,,\n")
    assert list(df["simulated"]) == [False, True]
    with pytest.raises(ValueError):
        cargar(io.StringIO("subject_id,timestamp,variable,value\nS1,2026-11-01T08:00:00,heart_rate,60\n"), "x.csv")


def test_formato_comun_sintoma_es_hallazgo():
    df, _ = _c("S1,2026-11-01T08:00:00,d,symptom,dolor de cabeza,texto,,true,,\n"
               "S1,2026-11-01T08:00:00,w,heart_rate,,bpm,,true,,\n")
    f = a_formato_comun(df)
    s = [r for r in f if r["metric"] == "symptom"][0]
    assert s["tipo"] == "hallazgo" and s["value"] == "dolor de cabeza" and s["source"] == "sensor"
    h = [r for r in f if r["metric"] == "heart_rate"][0]
    assert h["tipo"] == "medicion" and h["value"] is None


def test_resumen_tendencia_basal_y_motivos():
    filas = []
    for d in range(1, 9):  # basal: dias 1..8 a 60
        filas.append(f"S1,2026-11-{d:02d}T08:00:00,w,heart_rate,60,bpm,,true,,\n")
    filas += ["S1,2026-11-10T01:00:00,w,heart_rate,70,bpm,,true,,\n", "S1,2026-11-10T02:00:00,w,heart_rate,72,bpm,,true,,\n",
              "S1,2026-11-10T03:00:00,w,heart_rate,74,bpm,,true,,\n",
              "S2,2026-11-10T03:00:00,w,heart_rate,1,bpm,,true,,\n"]
    df, _ = _c("".join(filas))
    r = resumen.resumir(df, "S1", ventana_h=24, basal_dias=7, referencia="2026-11-10T04:00:00").iloc[0]
    assert r["n"] == 3 and r["mediana"] == 72 and r["max"] == 74
    assert r["basal"] == 60 and r["diferencia_vs_basal"] == 12
    assert math.isclose(r["tendencia_por_dia"], 48.0, rel_tol=1e-9)  # 2 bpm/h = 48 bpm/dia
    r2 = resumen.resumir(df, "S1", ventana_h=3, basal_dias=7, referencia="2026-11-10T04:00:00").iloc[0]
    assert r2["n"] == 2 and math.isnan(r2["tendencia_por_dia"]) and "n=2" in r2["tendencia_motivo"]
    r3 = resumen.resumir(df, "S1", ventana_h=24, basal_dias=0.5, referencia="2026-11-10T04:00:00").iloc[0]
    assert math.isnan(r3["basal"]) and r3["basal_motivo"] and math.isnan(r3["diferencia_vs_basal"])
    assert set(resumen.resumir(df, "S1")["subject_id"]) == {"S1"}
