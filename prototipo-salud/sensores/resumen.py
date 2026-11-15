"""Resumenes descriptivos por variable y dispositivo, de UN solo sujeto (PASO 5).

Nada de lo que sale de aqui es diagnostico. Faltantes: NaN + columna `*_motivo`; nunca 0.
Tiempos: los timestamps sin zona se tratan como UTC al comparar (aviso del importador).
"""
from __future__ import annotations

import math
from typing import Any

import numpy as np
import pandas as pd

from .importador import VARIABLES

MIN_TENDENCIA = 3      # n minimo para pendiente por minimos cuadrados
MIN_BASAL = 3          # valores minimos en la ventana basal para aceptar un basal

COLUMNAS = ["subject_id", "variable", "device", "unit", "metric_detail", "ventana_inicio", "ventana_fin",
            "n", "faltantes", "media", "mediana", "min", "max", "ultimo_valor", "ultimo_timestamp",
            "antiguedad_h", "tendencia_por_dia", "tendencia_motivo", "basal", "n_basal", "basal_motivo",
            "diferencia_vs_basal", "diferencia_motivo", "simulated"]


def a_utc(x: Any) -> pd.Timestamp | pd.Series:
    """Timestamp(s) -> UTC (los naive se asumen UTC)."""
    if isinstance(x, pd.Series):
        return pd.to_datetime(x, utc=True)
    t = pd.Timestamp(x)
    return t.tz_localize("UTC") if t.tzinfo is None else t.tz_convert("UTC")


def _prep(df: pd.DataFrame, subject_id: str) -> pd.DataFrame:
    d = df[df["subject_id"] == subject_id].copy()
    d["_t"] = a_utc(d["timestamp"])
    d["_v"] = pd.to_numeric(d["value"].where(d["variable"] != "symptom"), errors="coerce")
    return d


def referencia_por_defecto(df: pd.DataFrame, subject_id: str) -> pd.Timestamp | None:
    d = df[df["subject_id"] == subject_id]
    return None if d.empty else a_utc(d["timestamp"]).max()


def _pendiente_por_dia(t: pd.Series, v: pd.Series) -> float:
    x = (t - t.iloc[0]).dt.total_seconds().to_numpy() / 86400.0
    if np.ptp(x) == 0:
        return float("nan")
    return float(np.polyfit(x, v.to_numpy(float), 1)[0])


def resumir(df: pd.DataFrame, subject_id: str, ventana_h: float = 24, basal_dias: float = 7,
            referencia: Any = None, min_basal: int = MIN_BASAL) -> pd.DataFrame:
    """Una fila por (variable, device) del sujeto. Ventana = (ref-ventana_h, ref]; basal = mediana de los
    `basal_dias` previos a la ventana (si hay >= min_basal valores)."""
    d = _prep(df, subject_id)
    if d.empty:
        return pd.DataFrame(columns=COLUMNAS)
    ref = a_utc(referencia) if referencia is not None else d["_t"].max()
    v_ini = ref - pd.Timedelta(hours=ventana_h)
    b_ini = v_ini - pd.Timedelta(days=basal_dias)
    filas = []
    for (var, dev), g in d.groupby(["variable", "device"], sort=True):
        g = g[g["_t"] <= ref]
        unit = g["unit"].iloc[0] if len(g) else VARIABLES.get(var, {}).get("unidad")
        mds = sorted({str(m) for m in g["metric_detail"].dropna()})
        w = g[(g["_t"] > v_ini)]
        r: dict[str, Any] = {"subject_id": subject_id, "variable": var, "device": dev, "unit": unit,
                             "metric_detail": ",".join(mds) or None,
                             "ventana_inicio": v_ini, "ventana_fin": ref,
                             "simulated": bool(w["simulated"].any() if len(w) else g["simulated"].any())}
        if var == "symptom":
            txt = g[g["value"].notna()]
            r.update(n=int(w["value"].notna().sum()), faltantes=int(w["value"].isna().sum()))
            for k in ("media", "mediana", "min", "max", "ultimo_valor"):
                r[k] = np.nan
            if len(txt):
                u = txt.iloc[-1]
                r["ultimo_valor"], r["ultimo_timestamp"] = u["value"], u["_t"]
                r["antiguedad_h"] = (ref - u["_t"]).total_seconds() / 3600
            r["tendencia_motivo"] = r["basal_motivo"] = r["diferencia_motivo"] = "variable de texto: sin estadisticos numericos"
            r["tendencia_por_dia"] = r["basal"] = r["diferencia_vs_basal"] = np.nan
            r["n_basal"] = 0
            filas.append(r)
            continue
        wv = w["_v"].dropna()
        r["n"] = int(len(wv))
        r["faltantes"] = int(w["_v"].isna().sum())
        if len(wv):
            r.update(media=float(wv.mean()), mediana=float(wv.median()), min=float(wv.min()), max=float(wv.max()))
        else:
            r.update(media=np.nan, mediana=np.nan, min=np.nan, max=np.nan)
        ok = g[g["_v"].notna()]
        if len(ok):
            u = ok.iloc[-1]
            r["ultimo_valor"], r["ultimo_timestamp"] = float(u["_v"]), u["_t"]
            r["antiguedad_h"] = (ref - u["_t"]).total_seconds() / 3600
        else:
            r["ultimo_valor"], r["ultimo_timestamp"], r["antiguedad_h"] = np.nan, pd.NaT, np.nan
        # tendencia
        wok = w[w["_v"].notna()]
        if len(wok) >= MIN_TENDENCIA:
            p = _pendiente_por_dia(wok["_t"], wok["_v"])
            r["tendencia_por_dia"] = p
            r["tendencia_motivo"] = None if not math.isnan(p) else "todas las mediciones tienen el mismo instante"
        else:
            r["tendencia_por_dia"] = np.nan
            r["tendencia_motivo"] = f"n={len(wok)} < {MIN_TENDENCIA} en la ventana: no se estima tendencia"
        # basal
        b = g[(g["_t"] > b_ini) & (g["_t"] <= v_ini) & g["_v"].notna()]["_v"]
        r["n_basal"] = int(len(b))
        if len(b) >= min_basal:
            r["basal"] = float(b.median())
            r["basal_motivo"] = None
        else:
            r["basal"] = np.nan
            r["basal_motivo"] = f"n_basal={len(b)} < {min_basal} en los {basal_dias} dias previos a la ventana"
        if not math.isnan(r["basal"]) and r["n"] > 0:
            r["diferencia_vs_basal"] = r["mediana"] - r["basal"]
            r["diferencia_motivo"] = None
        else:
            r["diferencia_vs_basal"] = np.nan
            r["diferencia_motivo"] = ("sin basal suficiente" if math.isnan(r["basal"])
                                      else "sin datos en la ventana")
        filas.append(r)
    out = pd.DataFrame(filas)
    for c in COLUMNAS:
        if c not in out.columns:
            out[c] = np.nan
    return out[COLUMNAS].reset_index(drop=True)


def noches(df: pd.DataFrame, subject_id: str, variable: str = "heart_rate", referencia: Any = None,
           basal_dias: float = 7, hora_inicio: int = 22, hora_fin: int = 6, min_muestras: int = 6,
           min_noches_basal: int = 3, ultimas: int | None = None) -> pd.DataFrame:
    """Mediana nocturna por (device, noche) y su basal = mediana de las medianas de las noches previas
    (hasta `basal_dias` dias antes). Una noche empieza a las `hora_inicio` de la fecha `noche` y termina a
    las `hora_fin` del dia siguiente (hora del timestamp tal como esta almacenado). Noches con menos de
    `min_muestras` valores validos o que terminan despues de `referencia` se omiten."""
    d = _prep(df, subject_id)
    d = d[(d["variable"] == variable) & d["_v"].notna()]
    cols = ["subject_id", "variable", "device", "noche", "inicio", "fin", "n", "mediana", "basal", "n_noches_basal",
            "diferencia_vs_basal", "motivo", "simulated"]
    if d.empty:
        return pd.DataFrame(columns=cols)
    ref = a_utc(referencia) if referencia is not None else d["_t"].max()
    h = d["_t"].dt.hour
    noche = (h >= hora_inicio) | (h < hora_fin)
    d = d[noche].copy()
    d["noche"] = (d["_t"] - pd.to_timedelta((d["_t"].dt.hour < hora_fin).astype(int), unit="D")).dt.strftime("%Y-%m-%d")
    filas = []
    for dev, gd in d.groupby("device"):
        res = []
        for nch, g in gd.groupby("noche"):
            ini = a_utc(f"{nch} {hora_inicio:02d}:00:00")
            fin = ini + pd.Timedelta(hours=(24 - hora_inicio + hora_fin))
            if fin > ref + pd.Timedelta(hours=0):
                continue
            if len(g) < min_muestras:
                continue
            res.append(dict(noche=nch, inicio=ini, fin=fin, n=len(g), mediana=float(g["_v"].median()),
                            simulated=bool(g["simulated"].any())))
        for i, r in enumerate(res):
            prev = [x["mediana"] for x in res[:i] if (r["inicio"] - x["inicio"]) <= pd.Timedelta(days=basal_dias)]
            row = {"subject_id": subject_id, "variable": variable, "device": dev, **r, "n_noches_basal": len(prev)}
            if len(prev) >= min_noches_basal:
                row["basal"] = float(np.median(prev))
                row["diferencia_vs_basal"] = r["mediana"] - row["basal"]
                row["motivo"] = None
            else:
                row["basal"] = np.nan
                row["diferencia_vs_basal"] = np.nan
                row["motivo"] = f"solo {len(prev)} noches previas (< {min_noches_basal}) para el basal"
            filas.append(row)
    out = pd.DataFrame(filas, columns=cols)
    if ultimas and len(out):
        out = out.sort_values(["device", "inicio"]).groupby("device").tail(ultimas)
    return out.sort_values(["device", "inicio"]).reset_index(drop=True)
