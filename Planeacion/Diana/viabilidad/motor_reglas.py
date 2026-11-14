"""Motor de reglas mínimo para probar las reglas YAML de Diana antes de pasarlas a TypeScript.

Entrada: `actual` = valores de hoy {variable: valor}; `historial` = {variable: [valores diarios,
el más reciente al final, SIN incluir hoy]}. Para `below_personal_baseline_by` el historial
incluye los días a evaluar al final (hoy incluido), porque mira varios días seguidos.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path

import numpy as np
import yaml

VENTANA_BASE = 14
MIN_DIAS_BASE = 7


@dataclass
class Resultado:
    id: str
    semaphore: str
    escalation_level: int
    action_protocol: str | None = None
    privacy_override: list[str] = field(default_factory=list)


def cargar_reglas(ruta: str | Path) -> list[dict]:
    return yaml.safe_load(Path(ruta).read_text(encoding="utf-8"))["rules"]


def z_robusto(x: float, base: list[float]) -> float | None:
    b = np.asarray([v for v in base[-VENTANA_BASE:] if v is not None], float)
    if len(b) < MIN_DIAS_BASE:
        return None
    med = np.median(b)
    mad = np.median(np.abs(b - med))
    if mad == 0:
        return None
    return 0.6745 * (x - med) / mad


def _cond(c: dict, actual: dict, historial: dict) -> bool:
    if "any_of" in c:
        return any(_cond(s, actual, historial) for s in c["any_of"])
    var, op, val = c["variable"], c["operator"], c["value"]

    if op == "below_personal_baseline_by":
        serie = historial.get(var, [])
        n = int(c.get("consecutive_days", 1))
        recientes, previos = serie[-n:], serie[:-n][-VENTANA_BASE:]
        if len(recientes) < n or len(previos) < MIN_DIAS_BASE or None in recientes:
            return False
        base = float(np.median(previos))
        return all(v < base - val for v in recientes)

    if var not in actual or actual[var] is None:
        return False
    x = actual[var]
    if op.startswith("robust_z_"):
        z = z_robusto(x, historial.get(var, []))
        if z is None:
            return False
        return {"robust_z_gte": z >= val, "robust_z_lte": z <= val,
                "robust_z_lt": z < val, "robust_z_gt": z > val}[op]
    return {"equals": lambda: x == val, "gte": lambda: x >= val, "gt": lambda: x > val,
            "lte": lambda: x <= val, "lt": lambda: x < val, "in": lambda: x in val}[op]()


def evaluar(reglas: list[dict], actual: dict, historial: dict | None = None) -> list[Resultado]:
    historial = historial or {}
    out = [Resultado(r["id"], r["semaphore"], r["escalation_level"], r.get("action_protocol"),
                     r.get("privacy_override", []))
           for r in reglas if all(_cond(c, actual, historial) for c in r["conditions"])]
    return sorted(out, key=lambda r: -r.escalation_level)
