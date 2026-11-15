"""Motor de padecimientos del prototipo (NASA Space Apps; investigación).

Implementa la especificación ALGORITMOS.md: de observaciones ya filtradas por la puerta de calidad a un semáforo
(VERDE, AMARILLO, ROJO, GRIS) por padecimiento, con autocalibración personal y capas fijas. **No es un diagnóstico**:
ordena qué revisar y recomienda consultar al cirujano de vuelo. Todos los umbrales, pesos fuera de las tablas con fuente
y supuestos S1-S20 son PROVISIONALES; ningún dato sintético (SIMULADO) interviene en el canal real. Importar este
paquete no lee ni escribe archivos.
"""
from . import parametros, tablas, calidad, entradas, evaluacion
from .evaluacion import evaluar, evaluar_todo

__all__ = ["parametros", "tablas", "calidad", "entradas", "evaluacion", "evaluar", "evaluar_todo"]
