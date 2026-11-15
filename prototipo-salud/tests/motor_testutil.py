"""Utilidades de los tests del motor (observaciones a mano; PROVISIONAL; nada es un diagnostico)."""
from datetime import date, timedelta

import pandas as pd

from motor import calidad

OFFSETS = [-1.1, -0.9, -0.7, -0.5, -0.3, -0.1, 0.1, 0.3, 0.5, 0.7, 0.9, 1.1]   # media 0; sd ~ 0.7


def dia(n: int, base: str = "2026-09-01") -> str:
    return (date.fromisoformat(base) + timedelta(days=n)).isoformat()


def fila(sid, vid, valor, d, *, nivel="N1", clase="ecg_prenda_holter", unidad="", contexto=None, metodo=None, sim=False,
         hora="03:00:00", buena=True, decide=True, sin_dato=None, vig=None, etiquetas=""):
    return calidad.fila_obs(subject_id=sid, timestamp=pd.Timestamp(f"{d}T{hora}"), variable_id=vid,
                            valor=float("nan") if valor is None else float(valor), unidad=unidad, clase_dispositivo=clase,
                            nivel=nivel, simulated=sim, contexto=contexto, metodo=metodo, decide=decide, calidad_buena=buena,
                            sin_dato=sin_dato, vigencia_h=float("nan") if vig is None else vig, etiquetas=etiquetas)


def df(filas):
    return calidad.obs_a_df(filas)


def serie(sid, vid, media, de, d0, d1, **kw):
    """Valores diarios media + de*offset (PRE, 12 dias) entre los dias d0..d1 (indices desde 2026-09-01)."""
    out = []
    for i in range(d0, d1 + 1):
        out.append(fila(sid, vid, media + de * OFFSETS[i % 12], dia(i), **kw))
    return out


def pad(res, sid, pid):
    return next(x for x in res["personas"][sid]["padecimientos"] if x["padecimiento_id"] == pid)


def liga(item, vid):
    return next(l for l in item["ligas"] if l["variable_id"] == vid)


MISION = {"S": {"lanzamiento": "2026-09-13", "aterrizaje": None}}
