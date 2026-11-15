"""Genera los ejemplos SINTETICOS de sensores (semilla fija). Todo es simulated=true.

Uso (desde la raiz del proyecto):  python sensores/generar_sintetico.py [directorio_salida]
Por defecto escribe en la carpeta sensores/. Sin dependencias fuera de numpy/pandas.

SIM-A01: dos noches seguidas (2026-11-08 y 2026-11-09, de 22:00 a 06:00) con FC nocturna
         ~+6 bpm sobre su basal => activa la regla tipo NightSignal con datos SIMULADOS.
SIM-B02: sin elevacion (control); sin SpO2 ni presion arterial (variables ausentes).
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import pandas as pd

SEMILLA = 20261114
NOTA = "DATO SINTÉTICO generado por generar_sintetico.py, no es de ninguna persona"
INICIO = pd.Timestamp("2026-11-01 00:00:00")
FIN = pd.Timestamp("2026-11-10 08:00:00")
NOCHES_ELEVADAS_A01 = ("2026-11-08", "2026-11-09")  # fecha en la que EMPIEZA la noche (22:00)
COLS = ["subject_id", "timestamp", "device", "variable", "value", "unit", "quality",
        "simulated", "metric_detail", "notes"]


def _noche_de(ts: pd.Timestamp) -> tuple[bool, str]:
    """(es_noche 22:00-06:00, fecha en que empezo esa noche)."""
    if ts.hour >= 22:
        return True, ts.strftime("%Y-%m-%d")
    if ts.hour < 6:
        return True, (ts - pd.Timedelta(days=1)).strftime("%Y-%m-%d")
    return False, ""


def generar() -> pd.DataFrame:
    rng = np.random.default_rng(SEMILLA)
    filas: list[dict] = []

    def add(sid, ts, dev, var, val, unit, q="buena", md=None):
        filas.append({"subject_id": sid, "timestamp": ts.strftime("%Y-%m-%dT%H:%M:%S"), "device": dev,
                      "variable": var, "value": val, "unit": unit, "quality": q, "simulated": True,
                      "metric_detail": md, "notes": NOTA})

    personas = {"SIM-A01": dict(fc_noche=55.0, fc_dia=72.0, rm=48.0, sd=62.0, ts=33.2, tb=36.6),
                "SIM-B02": dict(fc_noche=60.0, fc_dia=76.0, rm=38.0, sd=52.0, ts=33.6, tb=36.8)}
    for sid, p in personas.items():
        tiene_anillo = sid == "SIM-A01"
        tiene_pa = sid == "SIM-A01"
        for ts in pd.date_range(INICIO, FIN, freq="30min"):
            noche, ini = _noche_de(ts)
            base = p["fc_noche"] if noche else p["fc_dia"]
            if sid == "SIM-A01" and noche and ini in NOCHES_ELEVADAS_A01:
                base += 6.0
            hr = base + rng.normal(0, 1.2 if noche else 4.0)
            # reloj: ~6 % de huecos (NaN) y calidad baja si hay movimiento
            if rng.random() < 0.06:
                add(sid, ts, "reloj_sim", "heart_rate", np.nan, "bpm", "sin_dato")
            else:
                add(sid, ts, "reloj_sim", "heart_rate", round(hr, 1), "bpm", "buena" if noche else "media")
            if tiene_anillo and noche and rng.random() > 0.10:
                add(sid, ts, "anillo_sim", "heart_rate", round(hr + rng.normal(0, 0.8), 1), "bpm")
            if ts.hour % 3 == 0 and ts.minute == 0 and sid == "SIM-A01":
                add(sid, ts, "reloj_sim", "spo2", round(float(np.clip(97 + rng.normal(0, 0.8), 90, 100)), 0), "%", "media")
        for d in pd.date_range(INICIO.normalize(), FIN.normalize(), freq="D"):
            t_am = d + pd.Timedelta(hours=7)
            # HRV nocturna con metrica explicita; el anillo da SDNN, el reloj RMSSD
            if t_am <= FIN:
                if rng.random() > 0.15:
                    add(sid, t_am, "reloj_sim", "hrv_rmssd", round(p["rm"] + rng.normal(0, 4), 1), "ms", "media", "rmssd")
                if tiene_anillo and rng.random() > 0.15:
                    add(sid, t_am, "anillo_sim", "hrv_sdnn", round(p["sd"] + rng.normal(0, 5), 1), "ms", "buena", "sdnn")
                add(sid, t_am, "reloj_sim", "sleep_duration", round(7.0 + rng.normal(0, 0.5), 2), "h")
                add(sid, t_am, "reloj_sim", "sleep_efficiency", round(float(np.clip(90 + rng.normal(0, 3), 70, 99)), 1), "%")
                add(sid, t_am, "reloj_sim" if sid == "SIM-B02" else "anillo_sim", "temp_skin",
                    round(p["ts"] + rng.normal(0, 0.25), 2), "°C", "media")
            if d + pd.Timedelta(hours=20) <= FIN:
                add(sid, d + pd.Timedelta(hours=20), "reloj_sim", "steps", int(rng.normal(8000, 1500)), "count")
                add(sid, d + pd.Timedelta(hours=20), "reloj_sim", "active_minutes", int(rng.normal(45, 10)), "min")
            # termometro clinico: 1/dia, con dias sin medir (NaN explicito)
            t_t = d + pd.Timedelta(hours=8)
            if t_t <= FIN:
                if rng.random() < 0.2:
                    add(sid, t_t, "termometro_sim", "temp_body", np.nan, "°C", "sin_dato")
                else:
                    add(sid, t_t, "termometro_sim", "temp_body", round(p["tb"] + rng.normal(0, 0.15), 1), "°C", "buena")
            if tiene_pa:
                for h in (8, 19):
                    t_p = d + pd.Timedelta(hours=h)
                    if t_p > FIN:
                        continue
                    if rng.random() < 0.25:  # medicion manual omitida
                        continue
                    add(sid, t_p, "manguito_manual_sim", "bp_systolic", int(round(118 + rng.normal(0, 5))), "mmHg", "buena")
                    add(sid, t_p, "manguito_manual_sim", "bp_diastolic", int(round(76 + rng.normal(0, 4))), "mmHg", "buena")
    add("SIM-A01", pd.Timestamp("2026-11-09 09:00:00"), "diario_manual_sim", "symptom",
        "cansancio leve y sueño interrumpido (texto simulado)", "texto", "autorreporte")
    add("SIM-B02", pd.Timestamp("2026-11-05 12:00:00"), "diario_manual_sim", "symptom",
        "cefalea leve (texto simulado)", "texto", "autorreporte")
    df = pd.DataFrame(filas, columns=COLS).sort_values(["subject_id", "timestamp", "device", "variable"], kind="stable")
    return df.reset_index(drop=True)


def ancho_pequeno() -> pd.DataFrame:
    """Ejemplo ancho: 4 filas; la temperatura corporal viene en °F (se convierte) y hay celdas vacias."""
    f = [
        ("SIM-A01", "2026-11-09T08:00:00", "reloj_sim", 62, 49.5, 97, "", 33.1, "true"),
        ("SIM-A01", "2026-11-09T20:00:00", "reloj_sim", 74, "", "", "", 33.0, "true"),
        ("SIM-B02", "2026-11-09T08:00:00", "reloj_sim", 60, 38.2, "", 98.2, 33.5, "true"),
        ("SIM-B02", "2026-11-09T20:00:00", "reloj_sim", "", 37.0, "", "", "", "true"),
    ]
    d = pd.DataFrame(f, columns=["subject_id", "timestamp", "device", "heart_rate", "hrv_rmssd",
                                 "spo2", "temp_body__F", "temp_skin", "simulated"])
    d["notes"] = NOTA
    return d


def main(salida: Path) -> None:
    salida.mkdir(parents=True, exist_ok=True)
    df = generar()
    c = df.copy()
    c["simulated"] = c["simulated"].map({True: "true", False: "false"})
    c.to_csv(salida / "ejemplo_sintetico_sensores.csv", index=False, na_rep="")
    j = df.astype(object).where(df.notna(), None)
    j.to_json(salida / "ejemplo_sintetico_sensores.json", orient="records", force_ascii=False, indent=1)
    ancho_pequeno().to_csv(salida / "ejemplo_sintetico_ancho.csv", index=False)
    print(f"{len(df)} filas -> {salida}")


if __name__ == "__main__":
    main(Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parent)
