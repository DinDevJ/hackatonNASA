"""Tabla conjunta eco + sensores de UNA persona y comparacion descriptiva entre modelos (PASO 4 y 6).

- Solo el subject_id pedido: las filas de otros sujetos se excluyen y se informan en `df.attrs["avisos"]`.
- Nada se promedia entre modelos; el acuerdo entre modelos no implica exactitud.
- Faltantes: filas con `faltante=True` y `motivo_faltante`; tiempos ausentes = NaT/NaN con motivo.
- Diferencia temporal `dif_sensor_menos_eco_h` = t_sensor - t_eco (horas, con signo). En filas de sensor,
  t_eco es el eco mas reciente del sujeto; en filas de eco, t_sensor es el dato de sensor mas reciente.
  Si el eco no trae timestamp NO se inventa: queda NaN con motivo.
"""
from __future__ import annotations

import math
from pathlib import PurePosixPath, PureWindowsPath
from typing import Any

import numpy as np
import pandas as pd

from core import runs
from sensores.importador import VARIABLES
from sensores.resumen import a_utc, noches, resumir

CLASES = ("salida_modelo_preentrenado", "comparacion_descriptiva", "resumen_sensor", "dato_simulado",
          "alerta_experimental")
NOTA_ACUERDO = "el acuerdo entre modelos no implica exactitud; no se promedian"

# alias de nombre de metrica (en minusculas) -> nombre canonico. Los adaptadores pueden ampliarlo con
# registrar_equivalencia(). Solo tipo `medicion`: nunca se comparan probabilidades ni similitudes.
EQUIVALENCIAS: dict[str, str] = {
    "ef": "FEVE", "lvef": "FEVE", "feve": "FEVE", "ejection_fraction": "FEVE", "ef_percent": "FEVE",
    "left_ventricular_ejection_fraction": "FEVE", "lvef_percent": "FEVE", "fevi": "FEVE",
    # EchoCLIP: FEVE zero-shot derivada de similitudes (se compara como medicion; su quality lo indica)
    "ejection_fraction_zero_shot": "FEVE",
}
TOLERANCIAS_DEFECTO: dict[str, float] = {"FEVE": 10.0}  # puntos porcentuales; PARAMETRO EXPERIMENTAL de demostracion

COLUMNAS = ["subject_id", "origen", "clase_dato", "fuente", "metric", "metrica_canonica", "estadistico",
            "periodo", "value", "unit", "tipo", "run_id", "study_id", "timestamp", "antiguedad_h",
            "dif_sensor_menos_eco_h", "dif_motivo", "valor_basal", "diferencia_vs_basal", "n", "faltante",
            "motivo_faltante", "simulated", "metric_detail"]


def registrar_equivalencia(alias: str, canonica: str) -> None:
    """Amplia el diccionario de metricas equivalentes (para adaptadores)."""
    EQUIVALENCIAS[alias.strip().lower()] = canonica


def canonica(metric: str | None) -> str | None:
    if metric is None:
        return None
    return EQUIVALENCIAS.get(str(metric).strip().lower())


def _num(x: Any) -> float:
    try:
        v = float(x)
    except (TypeError, ValueError):
        return float("nan")
    return v


def _bool(x: Any) -> bool:
    return str(x).strip().lower() in ("true", "1", "yes")


def _ts(x: Any) -> pd.Timestamp | None:
    if x is None or (not isinstance(x, str) and pd.isna(x)) or str(x).strip() == "":
        return None
    try:
        return a_utc(pd.Timestamp(x))
    except (ValueError, TypeError):
        return None


def _eco_subject(normalized_df: pd.DataFrame | None, subject_id: str, avisos: list[str]) -> pd.DataFrame:
    if normalized_df is None or len(normalized_df) == 0:
        return pd.DataFrame()
    d = normalized_df
    otros = d[d["subject_id"].astype(str) != subject_id]
    if len(otros):
        avisos.append(f"Eco: se excluyeron {len(otros)} filas de otros sujetos "
                      f"({sorted(otros['subject_id'].astype(str).unique())}); nunca se unen personas distintas.")
    d = d[d["subject_id"].astype(str) == subject_id]
    if "source" in d.columns:
        d = d[d["source"] == "modelo_preentrenado"]
    return d.reset_index(drop=True)


def construir(normalized_df: pd.DataFrame | None, sensores_df: pd.DataFrame | None, subject_id: str,
              ventana_h: float = 24, basal_dias: float = 7, referencia: Any = None,
              noches_recientes: int = 3, hora_noche_inicio: int = 22, hora_noche_fin: int = 6) -> pd.DataFrame:
    """Tabla conjunta (formato largo) de `subject_id`. Ver docstring del modulo."""
    avisos: list[str] = []
    eco = _eco_subject(normalized_df, subject_id, avisos)
    if sensores_df is None or len(sensores_df) == 0:
        sens = pd.DataFrame(columns=["subject_id", "timestamp"])
    else:
        sens = sensores_df
        otros = sens[sens["subject_id"].astype(str) != subject_id]
        if len(otros):
            avisos.append(f"Sensores: se excluyeron {len(otros)} filas de otros sujetos "
                          f"({sorted(otros['subject_id'].astype(str).unique())}); nunca se unen personas distintas.")
        sens = sens[sens["subject_id"].astype(str) == subject_id]

    tiempos = [t for t in (_ts(x) for x in eco.get("timestamp", [])) if t is not None]
    if len(sens):
        tiempos += list(a_utc(sens["timestamp"]))
    ref = a_utc(referencia) if referencia is not None else (max(tiempos) if tiempos else None)

    eco_ts = [t for t in (_ts(x) for x in eco.get("timestamp", [])) if t is not None]
    eco_ref = max(eco_ts) if eco_ts else None
    sens_validos = sens[sens["value"].notna()] if len(sens) else sens
    sens_ref = a_utc(sens_validos["timestamp"]).max() if len(sens_validos) else None

    filas: list[dict] = []

    def base(**kw) -> dict:
        r = {c: np.nan for c in COLUMNAS}
        r.update(subject_id=subject_id, faltante=False, simulated=False)
        r.update(kw)
        return r

    # --- eco
    for _, e in eco.iterrows():
        t = _ts(e.get("timestamp"))
        val = e.get("value")
        falta = val is None or (isinstance(val, float) and math.isnan(val)) or str(val).strip() == ""
        sim = _bool(e.get("simulated"))
        r = base(origen="eco", clase_dato="dato_simulado" if sim else "salida_modelo_preentrenado",
                 fuente=e.get("model"), metric=e.get("metric"), metrica_canonica=canonica(e.get("metric")),
                 estadistico="valor_modelo", value=np.nan if falta else val, unit=e.get("unit"),
                 tipo=e.get("tipo"), run_id=e.get("run_id"), study_id=e.get("study_id"),
                 timestamp=t, faltante=bool(falta), simulated=sim,
                 motivo_faltante="el modelo no devolvio valor" if falta else None)
        if t is None:
            r["antiguedad_h"] = np.nan
            r["dif_sensor_menos_eco_h"] = np.nan
            r["dif_motivo"] = "el eco no tiene timestamp: no se inventa; sin antiguedad ni diferencia temporal"
        else:
            r["antiguedad_h"] = (ref - t).total_seconds() / 3600 if ref is not None else np.nan
            if sens_ref is None:
                r["dif_sensor_menos_eco_h"] = np.nan
                r["dif_motivo"] = "no hay datos de sensores para este sujeto"
            else:
                r["dif_sensor_menos_eco_h"] = (sens_ref - t).total_seconds() / 3600
        filas.append(r)
    if eco.empty:
        filas.append(base(origen="eco", clase_dato="salida_modelo_preentrenado", estadistico="valor_modelo",
                          faltante=True, motivo_faltante="sin salidas de modelos de ecografia para este sujeto"))

    # --- sensores
    def dif_eco(t: pd.Timestamp | None) -> tuple[float, str | None]:
        if t is None or pd.isna(t):
            return np.nan, "sin timestamp del dato de sensor"
        if eco_ref is None:
            return np.nan, ("el eco no tiene timestamp: no se inventa la diferencia temporal"
                            if len(eco) else "no hay eco para este sujeto")
        return (t - eco_ref).total_seconds() / 3600, None

    if len(sens):
        res = resumir(sens, subject_id, ventana_h, basal_dias, ref)
        for _, s in res.iterrows():
            sim = bool(s["simulated"])
            clase = "dato_simulado" if sim else "resumen_sensor"
            tu = s["ultimo_timestamp"] if not pd.isna(s["ultimo_timestamp"]) else None
            dh, motivo = dif_eco(tu)
            comun = dict(origen="sensor", clase_dato=clase, fuente=s["device"], metric=s["variable"],
                         unit=s["unit"], tipo="medicion" if s["variable"] != "symptom" else "hallazgo",
                         simulated=sim, metric_detail=s["metric_detail"], antiguedad_h=s["antiguedad_h"],
                         dif_sensor_menos_eco_h=dh, dif_motivo=motivo)
            stats = [("ultimo", s["ultimo_valor"], tu, {}),
                     ("mediana_ventana", s["mediana"], s["ventana_fin"],
                      {"valor_basal": s["basal"], "diferencia_vs_basal": s["diferencia_vs_basal"], "n": s["n"]}),
                     ("tendencia_por_dia", s["tendencia_por_dia"], s["ventana_fin"], {"n": s["n"]})]
            for nombre, v, t, extra in stats:
                if s["variable"] == "symptom" and nombre != "ultimo":
                    continue
                falta = v is None or (not isinstance(v, str) and pd.isna(v))
                motivo_f = None
                if falta:
                    motivo_f = {"ultimo": "sin valor valido de esta variable",
                                "mediana_ventana": f"sin datos validos en la ventana de {ventana_h} h",
                                "tendencia_por_dia": s["tendencia_motivo"]}[nombre]
                    if nombre == "mediana_ventana" and not pd.isna(s["basal"]):
                        pass
                r = base(**comun, estadistico=nombre, value=np.nan if falta else v, timestamp=t,
                         faltante=bool(falta), motivo_faltante=motivo_f, **extra)
                if nombre == "mediana_ventana" and not falta and pd.isna(s["basal"]):
                    r["motivo_faltante"] = "valor presente; " + str(s["basal_motivo"])
                filas.append(r)
        # noches (FC) para la regla tipo NightSignal
        nn = noches(sens, subject_id, "heart_rate", ref, basal_dias, hora_noche_inicio, hora_noche_fin,
                    ultimas=noches_recientes)
        for _, n in nn.iterrows():
            sim = bool(n["simulated"])
            dh, motivo = dif_eco(n["fin"])
            filas.append(base(origen="sensor", clase_dato="dato_simulado" if sim else "resumen_sensor",
                              fuente=n["device"], metric="heart_rate", estadistico="mediana_noche",
                              periodo=n["noche"], value=n["mediana"], unit="bpm", tipo="medicion",
                              timestamp=n["fin"], antiguedad_h=(ref - n["fin"]).total_seconds() / 3600,
                              dif_sensor_menos_eco_h=dh, dif_motivo=motivo, valor_basal=n["basal"],
                              diferencia_vs_basal=n["diferencia_vs_basal"], n=n["n"], simulated=sim,
                              faltante=False, motivo_faltante=n["motivo"]))
        presentes = set(sens["variable"].unique())
    else:
        presentes = set()
        avisos.append("Sin datos de sensores para este sujeto.")
    sim_ph = bool(len(sens) and sens["simulated"].astype(bool).all())  # marcador de ausencia hereda simulated
    for v in VARIABLES:
        if v not in presentes:
            filas.append(base(origen="sensor", clase_dato="dato_simulado" if sim_ph else "resumen_sensor", simulated=sim_ph,
                              metric=v, unit=VARIABLES[v]["unidad"],
                              estadistico="ultimo", faltante=True,
                              motivo_faltante="variable ausente en los datos de este sujeto (no es 0)"))

    df = pd.DataFrame(filas, columns=COLUMNAS)
    df.attrs["avisos"] = avisos
    df.attrs["referencia"] = None if ref is None else ref.isoformat()
    df.attrs["subject_id"] = subject_id
    df.attrs["parametros"] = dict(ventana_h=ventana_h, basal_dias=basal_dias, noches_recientes=noches_recientes,
                                  hora_noche_inicio=hora_noche_inicio, hora_noche_fin=hora_noche_fin)
    return df


# ------------------------------------------------------------------ comparacion entre modelos
def _sha_de_run(run_id: Any, raw_dir) -> str | None:
    if not run_id or str(run_id) == "nan":
        return None
    p = raw_dir / str(run_id) / "response.json"
    if not p.exists():
        return None
    try:
        return (runs.read_json(p).get("input") or {}).get("sha256")
    except (OSError, ValueError):
        return None


def _nombre_archivo(x: Any) -> str | None:
    if x is None or str(x) in ("", "nan", "None"):
        return None
    return PureWindowsPath(str(x)).name or PurePosixPath(str(x)).name


COLS_COMPARACION = ["subject_id", "entrada", "criterio_entrada", "entrada_verificada", "metrica", "unit",
                    "modelo_a", "run_a", "valor_a", "modelo_b", "run_b", "valor_b", "diferencia_b_menos_a",
                    "abs_diferencia", "tolerancia", "discrepancia", "motivo", "parametro_experimental",
                    "simulated", "clase_dato", "nota"]


def comparar_modelos(normalized_df: pd.DataFrame | None, subject_id: str,
                     tolerancias: dict[str, float] | None = None, raw_dir=None) -> pd.DataFrame:
    """Compara lado a lado modelos distintos que dan la MISMA metrica (mapeada por EQUIVALENCIAS, solo tipo
    medicion, misma unidad) sobre la misma entrada del MISMO sujeto. No promedia. Discrepancia si
    |b-a| > tolerancia (parametro experimental; FEVE=10 puntos por defecto)."""
    raw_dir = raw_dir or runs.RAW_DIR
    tol = dict(TOLERANCIAS_DEFECTO)
    tol.update(tolerancias or {})
    vacio = pd.DataFrame(columns=COLS_COMPARACION)
    if normalized_df is None or len(normalized_df) == 0:
        return vacio
    d = normalized_df[(normalized_df["subject_id"].astype(str) == subject_id)]
    if "source" in d.columns:
        d = d[d["source"] == "modelo_preentrenado"]
    d = d[d["tipo"] == "medicion"].copy()
    # PanEcho con varios videos emite filas por video y una agregada de estudio con el mismo metric:
    # para comparar se usa solo la agregada de estudio de ese run (no se promedia nada aqui).
    q = d["quality"].fillna("").astype(str) if "quality" in d.columns else pd.Series("", index=d.index)
    runs_estudio = set(d.loc[q.str.contains("nivel_estudio_agregado"), "run_id"])
    d = d[~(d["run_id"].isin(runs_estudio) & q.str.contains("nivel_video"))]
    d["_canon"] = d["metric"].map(canonica)
    d = d[d["_canon"].notna()]
    if d.empty:
        return vacio
    d["_sha"] = d["run_id"].map(lambda r: _sha_de_run(r, raw_dir))
    filas = []

    def clave(r) -> str | None:
        st = r.get("study_id")
        if st is not None and str(st) not in ("", "nan", "None"):
            return "study_id\t" + str(st)
        if r["_sha"]:
            return "sha256\t" + r["_sha"]
        nm = _nombre_archivo(r.get("input_file"))
        return "nombre_archivo\t" + nm if nm else None

    d["_k"] = [clave(r) for _, r in d.iterrows()]
    d = d[d["_k"].notna()]
    d["_u"] = d["unit"].fillna("").astype(str)
    for (k_s, canon_m, unit), g in d.groupby(["_k", "_canon", "_u"], sort=True):
        k = tuple(k_s.split("\t", 1))
        modelos = sorted(g["model"].unique())
        for i in range(len(modelos)):
            for j in range(i + 1, len(modelos)):
                a = g[g["model"] == modelos[i]].iloc[-1]
                b = g[g["model"] == modelos[j]].iloc[-1]
                va, vb = _num(a["value"]), _num(b["value"])
                shas = {a["_sha"], b["_sha"]}
                if k[0] == "sha256":
                    verif, motivo = True, None
                elif None not in shas and len(shas) == 1:
                    verif, motivo = True, None
                else:
                    verif = False
                    motivo = (f"misma clave por {k[0]}, pero NO se pudo verificar que sea el mismo archivo (sha256 "
                              "no disponible o distinto)")
                dif = vb - va if not (math.isnan(va) or math.isnan(vb)) else float("nan")
                t = tol.get(canon_m)
                if math.isnan(dif):
                    disc, motivo = None, "algun modelo no devolvio valor: no hay comparacion"
                elif t is None:
                    disc, motivo = None, ((motivo + "; ") if motivo else "") + "sin tolerancia definida para esta metrica"
                else:
                    disc = bool(abs(dif) > t)
                filas.append(dict(
                    subject_id=subject_id, entrada=k[1], criterio_entrada=k[0], entrada_verificada=verif,
                    metrica=canon_m, unit=unit or None, modelo_a=modelos[i], run_a=a["run_id"], valor_a=va,
                    modelo_b=modelos[j], run_b=b["run_id"], valor_b=vb, diferencia_b_menos_a=dif,
                    abs_diferencia=abs(dif) if not math.isnan(dif) else float("nan"), tolerancia=t,
                    discrepancia=disc, motivo=motivo, parametro_experimental=True,
                    simulated=_bool(a["simulated"]) or _bool(b["simulated"]),
                    clase_dato="comparacion_descriptiva", nota=NOTA_ACUERDO))
    return pd.DataFrame(filas, columns=COLS_COMPARACION)
