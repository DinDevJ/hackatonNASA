"""Punto de conexion para una FUTURA red de fusion (eco + sensores). NO existe predictor entrenado.

Interfaz futura (no implementada):
    predecir(tabla: pandas.DataFrame) -> {"disponible": True, "probabilidades": {...}, "modelo": {...}}
donde `tabla` es la salida de fusion.tabla.construir (una sola persona). Hasta que exista un modelo
entrenado y validado, esta funcion NO calcula nada y NO devuelve probabilidades. Ver NOTA-ENTRENAMIENTO.md.
"""
from __future__ import annotations


def predecir(tabla) -> dict:
    cols = [str(c) for c in getattr(tabla, "columns", [])]
    return {"disponible": False,
            "motivo": "No existe un predictor entrenado; no se devuelven probabilidades",
            "probabilidades": None,
            "entradas_recibidas": cols}
