# Nota de instalación: vistas «Padecimientos» y «Configuración»

Paquete de actualización del prototipo (15 nov 2026). Solo trae archivos nuevos o cambiados. **Nada de esto es un
diagnóstico**: el semáforo ordena qué revisar y recomienda consultar al cirujano de vuelo; todos los umbrales son
provisionales y ninguno está validado en astronautas.

## Cómo instalarlo
1. Cierra la app si está abierta.
2. (Recomendado) guarda una copia de tu `app.py`, `README.md`, `AVANCE.md` y `tests/conftest.py` actuales: son los únicos
   archivos existentes que este paquete reemplaza.
3. Descomprime el zip **encima** de la carpeta del prototipo (la que contiene `app.py`), aceptando reemplazar. En PowerShell:
   ```powershell
   Expand-Archive -Path .\prototipo-padecimientos.zip -DestinationPath .\prototipo -Force
   ```
   (cambia `.\prototipo` por la ruta de tu carpeta).
4. Abre la app como siempre: `.\scripts\lanzar_app.ps1`. En la barra lateral aparece el selector «Vista»:
   «Modelos y sensores» (lo de siempre, secciones 0–7 sin cambios) | «Padecimientos» | «Configuración».

No hace falta GPU, ni pesos, ni instalar paquetes: usa el mismo entorno `envs\app` (streamlit, pandas, numpy). No toca
`envs\`, `vendor\`, `weights\` ni `outputs\`.

## Qué trae
- `app.py` (solo se añadió el selector de vistas), `.streamlit/config.toml` (tema claro), `paginas/` (las dos vistas y el CSS).
- `motor/` (el algoritmo de `ALGORITMOS.md`; diseño y límites en `motor/DISENO.md`).
- `datos/modelo/` (copias de `PADECIMIENTOS.csv` y `PADECIMIENTO-VARIABLE.csv`, y la clasificación provisional de `direccion`).
- `datos/simulado/` (tripulación **SIMULADA**: 5 personas, 30 días, `simulated=true`; no es fisiología real ni dato de vuelo).
- `tests/` nuevos (`test_motor_*.py`, `test_paginas.py`, `motor_testutil.py`), `tests/conftest.py` (los tests no leen ni
  tocan tu `overrides.json` ni tus runs de `outputs\raw`), `README.md` y `AVANCE.md` actualizados.

## Cómo se usa
- **Padecimientos:** elige una persona. Las de la tripulación sintética llevan el rótulo grande **SIMULADO** y nunca se
  mezclan con datos reales. Las personas reales aparecen cuando hay runs en `outputs\raw` (hoy: ECG) o sensores cargados en la
  sección 5. «Ver» abre el detalle: variables, peso, nivel de evidencia, enlace a la fuente, cálculo paso a paso y por qué
  ese color. En «Contexto de la persona» puedes declarar fecha de lanzamiento, edad, sexo y si el ECG se tomó en reposo.
- **Configuración:** edita umbrales, peso y `prior_de`. Lo editado se guarda en `datos/modelo/overrides.json`, queda marcado
  «modificado por el usuario» (sin fuente) y no cambia los CSV. «Restaurar valores con fuente» borra ese archivo.
- La app escribe su estado local en `datos/estado/` y `datos/simulado/calibracion_SIMULADO.json`; se pueden borrar sin perder nada.

## Comprobar (opcional)
`.\scripts\verificar.ps1` ejecuta también los tests nuevos (en Linux: 98 passed, 5 skipped). No se ha probado en Windows.

## Límites
Umbrales provisionales; pesos de nivel mayoritariamente C; sin validación en vuelo; las salidas de eco y las banderas del ECG
son experimentales (nivel C forzado, no dan ROJO solas); la FEVE y las reglas R1–R5 no mueven el semáforo. **No es un diagnóstico.**
