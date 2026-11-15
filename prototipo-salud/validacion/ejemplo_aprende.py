"""Ejemplo reproducible de autocalibracion personal del motor. Datos SIMULADO (no son astronautas reales).

Dos tripulantes simulados, hombres de 30 anos, FC en sueno con prenda ECG: SIM-A con base ~58 lpm y SIM-B con base ~84 lpm
(14 noches prevuelo, N(media, 4 lpm), semilla 0). El dia 5 de vuelo ambos marcan 85 lpm.
1) Mismo valor, distinta lectura: z poblacional (NHANES) igual para ambos; z personal distinto.
2) La base se construye al acumular noches prevuelo (encogimiento hacia la referencia con pocos datos).
No es entrenamiento de una red: es estadistica por persona (motor/normalizacion.py, motor/calibracion.py).
Uso: cd prototipo-salud && python -m validacion.ejemplo_aprende [--json salida.json]
PROVISIONAL. No es un diagnostico.
"""
from __future__ import annotations

import argparse
import json
import sys
import tempfile
from datetime import date, timedelta
from pathlib import Path

import numpy as np
import pandas as pd

RAIZ = Path(__file__).resolve().parents[1]
if str(RAIZ) not in sys.path:
    sys.path.insert(0, str(RAIZ))

from motor import entradas, evaluacion  # noqa: E402
from motor.calidad import NATIVO_COLUMNAS  # noqa: E402

LANZ = date(2026, 9, 15)
VALOR = 85.0
BASES = {"SIM-A": 58.0, "SIM-B": 84.0}
DE_SIM = 4.0
NOCHES = 14
PERFIL = {"edad": 30, "sexo": "M"}


def _fila(sid, d, v):
    return dict(subject_id=sid, timestamp=f"{d.isoformat()}T03:00:00", variable_id="01:V3", value=f"{v:.1f}", unit="bpm",
                device_class="ecg_prenda_holter", quality="buena", context="sueno", method="", simulated="true",
                notes="SIMULADO: ejemplo_aprende, no es fisiologia real")


def _serie(semilla=0) -> dict[str, list[float]]:
    rng = np.random.default_rng(semilla)
    return {sid: [float(x) for x in rng.normal(mu, DE_SIM, NOCHES)] for sid, mu in BASES.items()}


def evaluar(series: dict[str, list[float]]) -> dict:
    rows = []
    for sid, xs in series.items():
        for k, x in enumerate(xs):
            rows.append(_fila(sid, LANZ - timedelta(days=len(xs) - k), x))
        rows.append(_fila(sid, LANZ + timedelta(days=5), VALOR))
    obs, rech, _ = entradas.desde_nativo(pd.DataFrame(rows, columns=NATIVO_COLUMNAS))
    sids = list(series)
    with tempfile.TemporaryDirectory() as t:
        r = evaluacion.evaluar(obs, mision={s: {"lanzamiento": LANZ.isoformat()} for s in sids},
                               perfiles={s: dict(PERFIL) for s in sids}, canal="simulado",
                               ruta_estado=Path(t) / "estado.json", guardar=False, rechazadas=rech)
    out = {}
    for sid in sids:
        p = r["personas"][sid]
        v = p["variables"]["01:V3"]
        liga = next(l for it in p["padecimientos"] if it["padecimiento_id"] == "P04" for l in it["ligas"]
                    if l["variable_id"] == "01:V3")
        b = v.get("base") or {}
        out[sid] = {"valor": VALOR, "z_poblacional": liga.get("z_pob"), "z_personal": v.get("z"), "estado": v.get("estado"),
                    "base_mu": b.get("mu"), "base_s": b.get("s"), "n0": b.get("n0"), "B_encogimiento": b.get("B"),
                    "s_w_fuente": b.get("s_w_fuente"), "cusum_senal": (v.get("cusum") or {}).get("senal_pos")}
    return out


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--json", default=None)
    a = ap.parse_args(argv)
    s = _serie()
    res = {"aviso": "SIMULADO. PROVISIONAL, no es diagnostico.", "mismo_valor": evaluar(s), "acumulando_noches": {}}
    for n in (2, 3, 5, 7, 14):
        res["acumulando_noches"][n] = evaluar({sid: xs[-n:] for sid, xs in s.items()})
    f = lambda x, d=2: "-" if x is None else f"{x:.{d}f}"  # noqa: E731
    print(res["aviso"], f"FC en sueno = {VALOR:g} lpm el dia 5 de vuelo.\n")
    print("1) Mismo valor, dos tripulantes (14 noches prevuelo):")
    for sid, r in res["mismo_valor"].items():
        print(f"  {sid}: base {f(r['base_mu'],1)} ± {f(r['base_s'],1)} lpm | z poblacional {f(r['z_poblacional'])} | "
              f"z personal {f(r['z_personal'])} | estado {r['estado']}")
    print("\n2) Base al acumular noches prevuelo (SIM-A y SIM-B):")
    for n, rr in res["acumulando_noches"].items():
        print(f"  n={n:>2}: " + " | ".join(
            f"{sid} base {f(r['base_mu'],1)} ± {f(r['base_s'],1)} (B={f(r['B_encogimiento'],2)}, s_w {r['s_w_fuente']}) "
            f"z {f(r['z_personal'])} {r['estado']}" for sid, r in rr.items()))
    if a.json:
        Path(a.json).write_text(json.dumps(res, ensure_ascii=False, indent=1, default=str), encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
