"""Formato común de resultados (paso 4 del encargo). Solo biblioteca estándar.

Columnas (en este orden):
subject_id, study_id, timestamp, source, model, metric, value, unit, quality,
simulated, tipo, run_id, input_file, notes

- `tipo` distingue: medicion | probabilidad_clase | similitud | hallazgo | regla_alerta
  (+ `comparacion` para diferencias descriptivas entre modelos).
- `source` distingue: modelo_preentrenado | algoritmo_senal | sensor | regla_experimental | comparacion_descriptiva
  (`algoritmo_senal` = procesamiento de señal sin entrenamiento, p. ej. el módulo ECG con NeuroKit2).
- Un valor ausente es celda vacía (None/NaN), NUNCA 0.
"""
from __future__ import annotations

import csv
import math
import os
from pathlib import Path
from typing import Any, Iterable

from .runs import ROOT, resolve

COLUMNS = [
    "subject_id", "study_id", "timestamp", "source", "model", "metric", "value",
    "unit", "quality", "simulated", "tipo", "run_id", "input_file", "notes",
]
TIPOS = {"medicion", "probabilidad_clase", "similitud", "hallazgo", "regla_alerta", "comparacion"}
SOURCES = {"modelo_preentrenado", "algoritmo_senal", "sensor", "regla_experimental", "comparacion_descriptiva"}
NORMALIZED_CSV = ROOT / "outputs" / "normalized.csv"

# Unidades prohibidas para segmentación/similitud sin calibración (se validan abajo).
UNIDADES_FISICAS = {"mm", "cm", "mm2", "cm2", "ml", "mL", "cm/s", "m/s"}


def _valor(v: Any) -> float | str | None:
    if v is None:
        return None
    if isinstance(v, bool):
        return float(v)
    if isinstance(v, (int, float)):
        return None if (isinstance(v, float) and math.isnan(v)) else float(v)
    if hasattr(v, "item"):
        return _valor(v.item())
    s = str(v).strip()
    if s == "" or s.lower() in {"nan", "none", "null", "na"}:
        return None
    try:
        return float(s)
    except ValueError:
        return s  # p. ej. un hallazgo textual


def fila(*, subject_id: str, study_id: str | None, timestamp: str | None, source: str,
         model: str, metric: str, value: Any, unit: str | None, quality: str | None,
         simulated: bool, tipo: str, run_id: str | None = None,
         input_file: str | None = None, notes: str | None = None) -> dict:
    """Construye y valida una fila del formato común."""
    row = {
        "subject_id": subject_id, "study_id": study_id, "timestamp": timestamp,
        "source": source, "model": model, "metric": metric, "value": _valor(value),
        "unit": unit, "quality": quality, "simulated": bool(simulated), "tipo": tipo,
        "run_id": run_id, "input_file": input_file, "notes": notes,
    }
    errs = validar_fila(row)
    if errs:
        raise ValueError("Fila inválida: " + "; ".join(errs))
    return row


def validar_fila(row: dict) -> list[str]:
    errs = []
    faltan = [c for c in COLUMNS if c not in row]
    if faltan:
        errs.append(f"faltan columnas {faltan}")
    if not row.get("subject_id"):
        errs.append("subject_id vacío")
    if row.get("tipo") not in TIPOS:
        errs.append(f"tipo {row.get('tipo')!r} no está en {sorted(TIPOS)}")
    if row.get("source") not in SOURCES:
        errs.append(f"source {row.get('source')!r} no está en {sorted(SOURCES)}")
    sim = row.get("simulated")
    if not isinstance(sim, bool) and str(sim).lower() not in {"true", "false"}:
        errs.append("simulated debe ser true/false")
    unit = (row.get("unit") or "").strip()
    if row.get("tipo") == "similitud" and unit.startswith("probabilidad"):
        errs.append("una similitud no puede expresarse como probabilidad")
    if row.get("tipo") in {"hallazgo", "similitud"} and unit in UNIDADES_FISICAS:
        if "calibrado" not in (row.get("quality") or ""):
            errs.append(f"unidad física {unit!r} sin calibración declarada en quality")
    if row.get("tipo") == "probabilidad_clase" and isinstance(row.get("value"), float):
        if not (0.0 <= row["value"] <= 1.0):
            errs.append("probabilidad_clase fuera de [0,1]")
    return errs


def append_normalized(rows: Iterable[dict], csv_path: str | os.PathLike = NORMALIZED_CSV) -> int:
    """Añade filas validadas al CSV común (crea cabecera si no existe). Devuelve nº de filas."""
    rows = list(rows)
    for r in rows:
        errs = validar_fila(r)
        if errs:
            raise ValueError(f"Fila inválida {r.get('metric')}: {errs}")
        if "prueba_de_carga" in str(r.get("quality") or ""):
            raise ValueError("Las filas de prueba de carga NO se escriben en normalized.csv")
    p = resolve(csv_path)
    p.parent.mkdir(parents=True, exist_ok=True)
    nuevo = not p.exists() or p.stat().st_size == 0
    with open(p, "a", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=COLUMNS, extrasaction="ignore")
        if nuevo:
            w.writeheader()
        for r in rows:
            out = dict(r)
            out["simulated"] = "true" if str(r["simulated"]).lower() == "true" else "false"
            out["value"] = "" if r["value"] is None else r["value"]
            w.writerow({k: ("" if out.get(k) is None else out.get(k)) for k in COLUMNS})
    return len(rows)


def leer_normalized(csv_path: str | os.PathLike = NORMALIZED_CSV) -> list[dict]:
    p = resolve(csv_path)
    if not p.exists():
        return []
    with open(p, newline="", encoding="utf-8") as f:
        out = []
        for r in csv.DictReader(f):
            r["value"] = _valor(r.get("value"))
            r["simulated"] = str(r.get("simulated")).lower() == "true"
            out.append(r)
        return out


def filas_modelo(resp: dict, *, metric: str, value: Any, unit: str | None, tipo: str,
                 quality: str = "ok", notes: str | None = None, timestamp: str | None = None,
                 source: str = "modelo_preentrenado") -> dict:
    """Atajo para adaptadores: fila de salida atada a su run_id (por defecto, de modelo preentrenado;
    `source="algoritmo_senal"` para procesamiento de señal y `"regla_experimental"` para banderas)."""
    return fila(
        subject_id=resp.get("subject_id") or "desconocido",
        study_id=resp.get("study_id"),
        timestamp=timestamp or resp.get("timestamp"),
        source=source,
        model=resp["model"],
        metric=metric, value=value, unit=unit, quality=quality,
        simulated=bool(resp.get("simulated", False)), tipo=tipo, run_id=resp.get("run_id"),
        input_file=(resp.get("input") or {}).get("path"), notes=notes,
    )
