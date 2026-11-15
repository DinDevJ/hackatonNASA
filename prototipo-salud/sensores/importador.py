"""Importador de mediciones de reloj/anillo/otros sensores (PASO 5). CSV/JSON largo o CSV ancho.

Formato largo: subject_id,timestamp,device,variable,value,unit,quality,simulated,metric_detail,notes
Formato ancho: subject_id,timestamp,device + una columna por variable (nombre canonico o alias;
sufijo opcional de unidad con doble guion bajo, p. ej. temp_body__F) y opcionalmente quality,
simulated, notes.

Reglas: un valor ausente es NaN (NUNCA 0); no se exigen todas las variables; lo que se descarta
se descarta con aviso explicito (cuantas filas y por que); las unidades solo se convierten si
es inequivoco y queda anotado en `notes`. Solo pandas/numpy (stdlib).
"""
from __future__ import annotations

import io
import json
import math
import re
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

from core.formato import fila

COLUMNAS = ["subject_id", "timestamp", "device", "variable", "value", "unit", "quality",
            "simulated", "metric_detail", "notes"]
OBLIGATORIAS = ["subject_id", "timestamp", "device"]

VARIABLES: dict[str, dict[str, str]] = {
    "heart_rate": {"unidad": "bpm", "descripcion": "Frecuencia cardiaca"},
    "hrv_rmssd": {"unidad": "ms", "descripcion": "Variabilidad de la FC, metrica RMSSD"},
    "hrv_sdnn": {"unidad": "ms", "descripcion": "Variabilidad de la FC, metrica SDNN"},
    "spo2": {"unidad": "%", "descripcion": "Saturacion de oxigeno (SpO2); en reloj tiende a sobreestimar en hipoxemia"},
    "bp_systolic": {"unidad": "mmHg", "descripcion": "Presion arterial sistolica"},
    "bp_diastolic": {"unidad": "mmHg", "descripcion": "Presion arterial diastolica"},
    "temp_skin": {"unidad": "°C", "descripcion": "Temperatura CUTANEA (reloj/anillo): solo cambio relativo, no es temperatura corporal"},
    "temp_body": {"unidad": "°C", "descripcion": "Temperatura CORPORAL (termometro clinico/oral/timpanico)"},
    "sleep_duration": {"unidad": "h", "descripcion": "Duracion del sueno"},
    "sleep_efficiency": {"unidad": "%", "descripcion": "Eficiencia del sueno"},
    "steps": {"unidad": "count", "descripcion": "Pasos"},
    "active_minutes": {"unidad": "min", "descripcion": "Minutos activos"},
    "symptom": {"unidad": "texto", "descripcion": "Sintoma referido (texto libre; en `value`)"},
}

_ALIAS_VAR = {
    "hr": "heart_rate", "fc": "heart_rate", "heart_rate": "heart_rate", "heartrate": "heart_rate",
    "pulse": "heart_rate", "frecuencia_cardiaca": "heart_rate",
    "rmssd": "hrv_rmssd", "hrv_rmssd": "hrv_rmssd", "sdnn": "hrv_sdnn", "hrv_sdnn": "hrv_sdnn",
    "hrv": "hrv",  # ambigua: exige metric_detail
    "spo2": "spo2", "sp_o2": "spo2", "oxygen_saturation": "spo2",
    "bp_systolic": "bp_systolic", "systolic": "bp_systolic", "sbp": "bp_systolic", "bp_sys": "bp_systolic",
    "bp_diastolic": "bp_diastolic", "diastolic": "bp_diastolic", "dbp": "bp_diastolic", "bp_dia": "bp_diastolic",
    "temp_skin": "temp_skin", "skin_temp": "temp_skin", "skin_temperature": "temp_skin",
    "temp_body": "temp_body", "body_temp": "temp_body", "body_temperature": "temp_body",
    "temperature": "temperatura_ambigua", "temp": "temperatura_ambigua",
    "sleep_duration": "sleep_duration", "sleep_hours": "sleep_duration",
    "sleep_efficiency": "sleep_efficiency", "steps": "steps", "active_minutes": "active_minutes",
    "symptom": "symptom", "symptoms": "symptom",
}
_ALIAS_UNIT = {
    "bpm": "bpm", "lpm": "bpm", "beats/min": "bpm", "ms": "ms", "%": "%", "percent": "%", "pct": "%",
    "mmhg": "mmHg", "°c": "°C", "c": "°C", "degc": "°C", "celsius": "°C", "°f": "°F", "f": "°F",
    "degf": "°F", "fahrenheit": "°F", "k": "K", "kelvin": "K", "h": "h", "hr": "h", "hours": "h",
    "horas": "h", "min": "min", "minutes": "min", "minutos": "min", "count": "count", "steps": "count",
    "pasos": "count", "text": "texto", "texto": "texto",
}
# (variable, unidad_origen) -> (unidad_canonica, funcion, descripcion). Solo conversiones inequivocas.
_CONVERSIONES = {
    ("temp_skin", "°F"): ("°C", lambda x: (x - 32.0) * 5.0 / 9.0, "°F->°C"),
    ("temp_body", "°F"): ("°C", lambda x: (x - 32.0) * 5.0 / 9.0, "°F->°C"),
    ("temp_skin", "K"): ("°C", lambda x: x - 273.15, "K->°C"),
    ("temp_body", "K"): ("°C", lambda x: x - 273.15, "K->°C"),
    ("sleep_duration", "min"): ("h", lambda x: x / 60.0, "min->h"),
    ("active_minutes", "h"): ("min", lambda x: x * 60.0, "h->min"),
}
_TZ_RE = re.compile(r"(?:Z|z|[+-]\d{2}:?\d{2})\s*$")


def _leer_bytes(origen: Any, nombre: str | None) -> tuple[bytes, str]:
    if isinstance(origen, (str, Path)):
        p = Path(origen)
        return p.read_bytes(), nombre or p.name
    if hasattr(origen, "getvalue"):
        data = origen.getvalue()
    elif hasattr(origen, "read"):
        data = origen.read()
    else:
        raise TypeError("origen debe ser ruta o buffer (p. ej. st.file_uploader)")
    if isinstance(data, str):
        data = data.encode("utf-8")
    return data, nombre or getattr(origen, "name", "") or ""


def _vacio(s: pd.Series) -> pd.Series:
    return s.isna() | s.astype(str).str.strip().str.lower().isin(["", "nan", "none", "null", "na"])


def _parse_simulated(s: pd.Series) -> pd.Series:
    m = {"true": True, "1": True, "yes": True, "si": True, "sí": True, "false": False, "0": False, "no": False}
    return s.astype(str).str.strip().str.lower().map(m)


def _tabla_desde_texto(data: bytes, nombre: str) -> tuple[pd.DataFrame, list[str]]:
    avisos: list[str] = []
    txt = data.decode("utf-8-sig")
    es_json = nombre.lower().endswith(".json") or txt.lstrip()[:1] in "[{"
    if es_json:
        obj = json.loads(txt)
        if isinstance(obj, dict):
            for k in ("rows", "data", "records", "mediciones"):
                if isinstance(obj.get(k), list):
                    obj = obj[k]
                    break
        if not isinstance(obj, list):
            raise ValueError("JSON no reconocido: se espera una lista de registros (o {'rows': [...]})")
        df = pd.DataFrame(obj)
    else:
        df = pd.read_csv(io.StringIO(txt), dtype=str, keep_default_na=False)
    df.columns = [str(c).strip() for c in df.columns]
    return df, avisos


def _ancho_a_largo(df: pd.DataFrame, avisos: list[str]) -> pd.DataFrame:
    extra = {"quality", "simulated", "notes", "metric_detail", "unit"}
    base = set(OBLIGATORIAS) | extra
    cols_var = [c for c in df.columns if c not in base]
    if not cols_var:
        raise ValueError("CSV ancho sin columnas de variables")
    partes = []
    for c in cols_var:
        nom, _, uni = c.partition("__")
        v = _ALIAS_VAR.get(nom.strip().lower())
        sub = df[OBLIGATORIAS + [e for e in extra if e in df.columns and e != "unit"]].copy()
        sub["variable_original"] = c
        sub["variable"] = v if v else nom
        sub["value"] = df[c]
        sub["unit"] = uni if uni else (df["unit"] if "unit" in df.columns else None)
        vacias = int(_vacio(sub["value"]).sum())
        if vacias:
            sub = sub[~_vacio(sub["value"])]
            avisos.append(f"Ancho: columna '{c}': {vacias} celdas vacias no se convierten en filas "
                          f"(ausente no es cero; no se rellenan).")
        partes.append(sub)
    largo = pd.concat(partes, ignore_index=True)
    return largo


def cargar(origen: Any, nombre: str | None = None) -> tuple[pd.DataFrame, list[str]]:
    """Carga y valida. Devuelve (df_largo con COLUMNAS, avisos)."""
    data, nombre = _leer_bytes(origen, nombre)
    df, avisos = _tabla_desde_texto(data, nombre)
    n_entrada = len(df)
    faltan = [c for c in OBLIGATORIAS if c not in df.columns]
    if faltan:
        raise ValueError(f"Faltan columnas obligatorias {faltan}. Columnas recibidas: {list(df.columns)}")
    if "variable" in df.columns and "value" in df.columns:
        largo = df.copy()
        formato = "largo"
    else:
        largo = _ancho_a_largo(df, avisos)
        formato = "ancho"
    for c in COLUMNAS:
        if c not in largo.columns:
            largo[c] = None
    avisos.insert(0, f"Formato detectado: {formato}; {n_entrada} filas de entrada.")
    descartes: dict[str, int] = {}

    def descartar(mask: pd.Series, motivo: str) -> None:
        nonlocal largo
        n = int(mask.sum())
        if n:
            descartes[motivo] = descartes.get(motivo, 0) + n
            largo = largo[~mask].copy()

    # identificacion obligatoria
    descartar(_vacio(largo["subject_id"]), "sin subject_id")
    descartar(_vacio(largo["device"]), "sin device")
    largo["subject_id"] = largo["subject_id"].astype(str).str.strip()
    largo["device"] = largo["device"].astype(str).str.strip()

    # timestamp (ISO-8601 estricto)
    ts_txt = largo["timestamp"].astype(str).str.strip()
    hay_tz = ts_txt.str.contains(_TZ_RE)
    if hay_tz.any():
        ts = pd.to_datetime(ts_txt, errors="coerce", format="ISO8601", utc=True)
        if (~hay_tz).any():
            avisos.append("Hay timestamps con zona horaria y otros sin zona: los sin zona se asumen UTC.")
    else:
        ts = pd.to_datetime(ts_txt, errors="coerce", format="ISO8601")
        avisos.append("Timestamps sin zona horaria: se conservan tal cual (hora local del dispositivo; "
                      "al cruzar con otras fuentes se asumen en UTC).")
    largo["timestamp"] = ts
    descartar(largo["timestamp"].isna(), "timestamp vacio o no ISO-8601 (ej. 2026-11-01T08:30:00)")

    # variable
    var_in = largo["variable"].astype(str).str.strip().str.lower()
    var = var_in.map(_ALIAS_VAR)
    md = largo["metric_detail"].astype(str).str.strip().str.lower()
    es_hrv = var == "hrv"
    hrv_ok = es_hrv & md.isin(["rmssd", "sdnn"])
    var = var.mask(hrv_ok, "hrv_" + md)
    descartar(var == "hrv", "HRV sin metrica explicita (metric_detail debe ser rmssd o sdnn)")
    var = var[largo.index.intersection(var.index)]
    descartar(var.reindex(largo.index) == "temperatura_ambigua",
              "temperatura ambigua: usa temp_skin (cutanea) o temp_body (corporal)")
    var = var.reindex(largo.index)
    descartar(var.isna(), "variable desconocida (no esta en VARIABLES ni en alias)")
    largo["variable"] = var.reindex(largo.index)
    largo.loc[largo["variable"].isin(["hrv_rmssd", "hrv_sdnn"]), "metric_detail"] = \
        largo["variable"].str.replace("hrv_", "", regex=False)

    # valores (symptom = texto)
    es_sint = largo["variable"] == "symptom"
    vac = _vacio(largo["value"])
    num = pd.to_numeric(largo["value"], errors="coerce")
    malos = (~es_sint) & (~vac) & num.isna()
    if int(malos.sum()):
        avisos.append(f"{int(malos.sum())} valores no numericos en variables numericas quedan como NaN (no 0).")
    valor = num.astype(object).where(~es_sint, largo["value"].where(~vac, np.nan))
    valor = valor.where(~(vac | malos), np.nan)
    largo["value"] = valor
    if not es_sint.any():
        largo["value"] = pd.to_numeric(largo["value"], errors="coerce")

    # unidades
    u_vacia = _vacio(largo["unit"])
    u_norm = [None if vac_ else _ALIAS_UNIT.get(str(u).strip().lower(), str(u).strip())
              for u, vac_ in zip(largo["unit"], u_vacia)]
    deducidas: dict[str, int] = {}
    conv: dict[str, int] = {}
    mask_drop = pd.Series(False, index=largo.index)
    motivos_u: dict[str, int] = {}
    unidad_final = []
    for idx, (v, u) in zip(largo.index, zip(largo["variable"], u_norm)):
        canon = VARIABLES[v]["unidad"]
        if u is None:
            deducidas[v] = deducidas.get(v, 0) + 1
            unidad_final.append(canon)
        elif u == canon:
            unidad_final.append(canon)
        elif (v, u) in _CONVERSIONES and _CONVERSIONES[(v, u)][0] == canon:
            conv[f"{v} {_CONVERSIONES[(v, u)][2]}"] = conv.get(f"{v} {_CONVERSIONES[(v, u)][2]}", 0) + 1
            unidad_final.append(("CONV", u))
        else:
            mask_drop[idx] = True
            k = f"{v}: unidad '{u}' no convertible de forma inequivoca a '{canon}'"
            motivos_u[k] = motivos_u.get(k, 0) + 1
            unidad_final.append(canon)
    largo["unit"] = [x if isinstance(x, str) else VARIABLES[v]["unidad"]
                     for x, v in zip(unidad_final, largo["variable"])]
    conv_idx = [i for i, x in zip(largo.index, unidad_final) if isinstance(x, tuple)]
    for i, x in zip(largo.index, unidad_final):
        if isinstance(x, tuple):
            v = largo.at[i, "variable"]
            f = _CONVERSIONES[(v, x[1])][1]
            val = largo.at[i, "value"]
            if isinstance(val, (int, float)) and not (isinstance(val, float) and math.isnan(val)):
                largo.at[i, "value"] = round(float(f(float(val))), 4)
            nota = f"convertido {_CONVERSIONES[(v, x[1])][2]} por el importador (original: {val} {x[1]})"
            prev = largo.at[i, "notes"]
            largo.at[i, "notes"] = nota if _vacio(pd.Series([prev])).iloc[0] else f"{prev} | {nota}"
    for k, n in motivos_u.items():
        descartes[k] = n
    largo = largo[~mask_drop].copy()
    for v, n in deducidas.items():
        avisos.append(f"{n} filas de '{v}' sin unidad: se deduce '{VARIABLES[v]['unidad']}' (VARIABLES).")
    for k, n in conv.items():
        avisos.append(f"{n} filas convertidas {k} (anotado en `notes`).")

    # simulated, quality, metric_detail, notes
    if "simulated" in df.columns or "simulated" in largo.columns:
        sim = _parse_simulated(largo["simulated"])
        if sim.isna().any():
            avisos.append(f"{int(sim.isna().sum())} filas con `simulated` vacio/invalido: se tratan como False "
                          "(real). Revisa si son datos simulados.")
        largo["simulated"] = sim.fillna(False).astype(bool)
    else:
        largo["simulated"] = False
        avisos.append("Sin columna `simulated`: todas las filas se marcan simulated=False (se declaran como reales).")
    for c in ("quality", "metric_detail", "notes"):
        largo[c] = largo[c].astype(object).where(~_vacio(largo[c]), None)

    for motivo, n in descartes.items():
        avisos.append(f"DESCARTADAS {n} filas: {motivo}.")
    if descartes:
        avisos.append(f"Total descartado: {sum(descartes.values())} filas/celdas (entrada: {n_entrada} filas).")
    nan_n = int(pd.to_numeric(largo.loc[largo['variable'] != 'symptom', 'value'], errors='coerce').isna().sum())
    if nan_n:
        avisos.append(f"{nan_n} filas con valor ausente conservadas como NaN (no se rellenan con 0).")
    out = largo[COLUMNAS].sort_values(["subject_id", "timestamp"], kind="stable").reset_index(drop=True)
    return out, avisos


def _iso(ts: Any) -> str | None:
    if ts is None or (not isinstance(ts, str) and pd.isna(ts)):
        return None
    return pd.Timestamp(ts).isoformat()


def a_formato_comun(df: pd.DataFrame) -> list[dict]:
    """Filas del formato comun (core.formato.fila): source=sensor, tipo medicion; symptom => hallazgo."""
    out = []
    for r in df.itertuples(index=False):
        sint = r.variable == "symptom"
        notas = [str(x) for x in (r.metric_detail and f"metrica={r.metric_detail}", r.notes) if x]
        valor = r.value
        if not sint and isinstance(valor, float) and math.isnan(valor):
            valor = None
        if sint and not isinstance(valor, str):
            valor = None
        out.append(fila(
            subject_id=r.subject_id, study_id=None, timestamp=_iso(r.timestamp), source="sensor",
            model=r.device, metric=r.variable, value=valor, unit=r.unit,
            quality=(r.quality or None), simulated=bool(r.simulated),
            tipo="hallazgo" if sint else "medicion", notes=" | ".join(notas) or None))
    return out
