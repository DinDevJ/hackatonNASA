# AVANCE (se actualiza con cada hito)

## 2026-11-14 09:41 CDMX — Cambio de plan
- Iker pidió que las pruebas reales se hagan en su PC (Windows, RTX 4050 6 GB). En esta máquina (Linux, 8 CPU, sin GPU)
  **NO se ha corrido inferencia real** y **no se han descargado pesos**.
- Hecho antes del cambio: entorno detectado (ENTORNO.md); 5 repos oficiales clonados en vendor/ (vendor/REVISIONES.md);
  3 muestras oficiales copiadas de los repos a samples/ con procedencia y licencia (samples/FUENTES.md).

## 2026-11-14 ~09:50 CDMX — Construcción de la estructura para la PC
- Núcleo común escrito y probado con datos de prueba: core/runs.py (run_id, JSON, sha256, rutas relativas),
  core/formato.py (formato común), core/modalidad.py (detección/rechazo de modalidades incompatibles).
- En curso (subagentes): adaptadores de los 5 modelos con preprocesamiento oficial, sensores, fusión/reglas/stub,
  runner + app Streamlit, scripts PowerShell.

## 2026-11-14 ~10:15 CDMX — Estructura completa, lista para la PC de Iker
- **Inferencia real: NO se ha corrido** (esta máquina no tiene GPU y no se descargaron pesos). Primera inferencia real:
  pendiente en la PC de Iker con `README.md` → pasos 4 y 5 (PanEcho y luego EchoNet-Dynamic).
- Adaptadores de los 5 modelos con preprocesamiento oficial citado (archivo:líneas) y validación de modalidad/vista:
  PanEcho, EchoNet-Dynamic, MedSAM2, EchoPrime, EchoCLIP (`adapters/`). Pesos de los 5 son públicos (sin login ni
  términos), comprobado por cabeceras HTTP/API HF; tamaños en `MODELOS-TABLA.md`. Ningún modelo "bloqueado".
- Pruebas hechas aquí (Linux CPU, torch 2.5.1 CPU, venvs de prueba fuera de la entrega):
  - prueba de carga dummy de los 5 adaptadores a través del runner (`core.run_model`): status `prueba_carga`,
    `inferencia_real=false`, nada escrito en `outputs/normalized.csv`; runs de prueba borrados después;
  - rechazos con mensaje claro: vista no A4C en EchoNet-Dynamic, Doppler espectral en PanEcho, MedSAM2 sin caja,
    volumen 3D, DICOM Color Flow/PW, PNG declarado como video, video muy coloreado; estudio con un PNG mezclado:
    el PNG se lista como no analizado y se conserva;
  - error limpio por pesos faltantes (indica el comando de descarga);
  - `verificar.py`: (3)-(6) PASA, (1)-(2) PENDIENTE; `pytest -q tests`: 25 passed;
  - app Streamlit con AppTest: sin excepciones, 8 secciones, ejemplo sintético marcado SIMULADO, ejecución desde la UI
    (prueba de carga de EchoNet-Dynamic) con visor de frames;
  - scripts .ps1: 11 archivos, 0 errores de parseo (pwsh 7.7 en Linux), ASCII puro; `preparar_muestras` verifica sha256
    OK; `descargar_pesos -SoloMostrar` no descarga nada. **No probados en Windows PowerShell 5.1 real.**
- Licencias corregidas tras revisión: pesos MedSAM2 en HF = CC BY-SA 4.0; EchoNet-Dynamic tiene LICENSE (MIT) y
  LICENSE.txt restrictivo (uso solo local, sin redistribuir).

## 2026-11-14 ~10:25 CDMX — PRIMERA INFERENCIA REAL (reportada por Iker, en su PC)
- **Modelo:** PanEcho (`envs\panecho`), **CPU** (en ese momento torch quedó sin CUDA, ver bug abajo).
- **Resultado:** 58 filas normalizadas, 42,8 s. Run `outputs\raw\20261114T102516_panecho_4d352df3` (en la PC de Iker; no está en
  esta máquina, donde sigue sin haber inferencia real). Entrada, fuente y licencia: según `samples/FUENTES.md` (muestra oficial
  del repo, no de astronautas). No es diagnóstico.
- Pendiente de confirmar por Iker: qué muestra usó exactamente y que `verificar.py` pase (1) y (2) con ese run.

## 2026-11-14 ~10:40 CDMX — BUG: torch cu124 se reemplazaba por torch 2.15.0+cpu
- **Síntoma (PC de Iker):** `instalar_modelo.ps1 -Modelo panecho` instaló torch 2.5.1+cu124 y luego, al instalar
  `adapters/panecho/requirements-win.lock.txt`, quedó torch 2.15.0 (+cpu) y torchvision 0.29.2 -> `torch.cuda.is_available()=False`.
- **Causa:** los locks excluyen torch (`--no-emit-package`) pero conservan paquetes que lo requieren sin versión (timm, open-clip...).
  `uv pip install -r <lock>` volvía a resolver torch desde PyPI. Reproducido en esta máquina: `uv pip compile` de `timm==0.9.10`
  para Windows/3.11 resuelve `torch==2.15.0` y `torchvision==0.29.2`, con o sin el índice cu124 como extra.
- **Arreglo:** `scripts/torch-cu124-overrides.txt` (torch==2.5.1, torchvision==0.20.1) usado en toda instalación; el lock se
  instala con `--no-deps --override`; nueva función `Repair-TorchCuda` en `scripts/_comun.ps1` (reinstala torch/torchvision cu124 con
  `uv --reinstall-package` y verifica `cu124` + `cuda_disponible`, con error si no); `instalar_modelo.ps1` la ejecuta al final y,
  si el entorno ya estaba instalado pero sin CUDA, lo repara; nuevo `scripts/reparar_torch.ps1 -Modelo <modelo|todos>`.
  Sección "Reparar entorno ya instalado (CUDA False)" en `README.md`.
- **Probado aquí:** 12 .ps1 parsean sin errores (pwsh 7.7), ASCII puro; ningún lock/requirements fija torch/torchvision/nvidia/triton;
  `uv pip compile` para Windows/3.11 con el override y el índice cu124 resuelve `torch==2.5.1+cu124` y `torchvision==0.20.1+cu124`
  en los 5 modelos. **No probado:** la reinstalación real en Windows (no se instaló torch CUDA aquí).

## 2026-11-14 ~11:06 CDMX — PanEcho en CUDA en la PC de Iker (reportado por Iker)
- PanEcho corre en **CUDA** en la PC de Iker: **17,4 s**, run `20261114T105021_panecho_c753f120` (antes, en CPU: 42,8 s).
  Confirma la reparación de torch cu124. La app Streamlit abre en http://localhost:8501.
- Estos runs están en la PC de Iker, no en esta máquina (aquí sigue sin haber inferencia real).

## 2026-11-14 ~11:20 CDMX — BUG EchoNet-Dynamic: UnpicklingError al cargar pesos (numpy.core.multiarray.scalar)
- **Síntoma (PC de Iker):** run `20261114T105607_echonet_dynamic_33220f31` (cuda, torch 2.5.1 cu124, Python 3.11, numpy 1.26.4):
  `Weights only load failed ... Unsupported global numpy.core.multiarray.scalar`. Los checkpoints oficiales traen escalares numpy
  (`best_loss`, `epoch`...) y `torch.load(weights_only=True)` a secas los rechaza.
- **Arreglo** (`adapters/echonet_dynamic/infer.py`, `cargar_pesos`):
  1. Camino por defecto: `weights_only=True` dentro de `torch.serialization.safe_globals([...])` (o `add_safe_globals` si la torch
     no lo trae) con `numpy.core/_core.multiarray.scalar` y `_reconstruct`, `numpy.dtype`, `numpy.ndarray` y las clases dtype
     (`Float64DType`, `Int64DType`, ...). Cualquier otro objeto sigue bloqueado.
  2. Solo si eso da `UnpicklingError`, o si el usuario pone `options.torch_load_weights_only=false`: `weights_only=False` **solo**
     tras verificar nombre de archivo oficial y **tamaño exacto** (250572083 B y 317401511 B, por cabeceras HTTP); si no coincide,
     no se carga y hay error claro. El sha256 oficial no se conoce: se registra el calculado.
  3. El JSON del run registra `checkpoint.carga` (`weights_only_true_safe_globals` | `weights_only_false_verificado_tamano`),
     `checkpoint.globals_permitidos` y, en el segundo caso, una advertencia.
- **Probado en Linux** (numpy 1.26.4, torch 2.5.1 CPU, pesos ALEATORIOS creados en /tmp, **no son inferencia real**; no se
  descargaron pesos reales): se reproduce el error con `torch.load(weights_only=True)` a secas; `cargar_pesos` carga ambos
  checkpoints por el camino 1; con `weights_only=False` y tamaño distinto se rechaza; con tamaño coincidente carga por el camino
  2; un nombre de archivo no oficial se rechaza; un objeto arbitrario sigue bloqueado. Flujo completo del adaptador con pesos
  aleatorios: status ok, `carga = weights_only_true_safe_globals` en ambos checkpoints. **Pendiente:** confirmar en la PC de
  Iker con los pesos reales.
- Otros adaptadores: PanEcho (`weights_only=True`, checkpoint con clave `weights`) y EchoPrime (`weights_only=True`) usan el
  mismo patrón; PanEcho ya corrió bien en la PC de Iker. No se cambiaron.

## 2026-11-14 ~16:45 CDMX — Módulo ECG (`ecg`): NeuroKit2 + wfdb, sin torch ni pesos
- **Qué hay:** `adapters/ecg/` (`infer.py`, `metricas.py`, `manifest.json`, `requirements.in`, lock de Windows/cp311),
  modalidad nueva `ecg_1d` en `core/modalidad.py` (WFDB o CSV + `fs`; rechazo cruzado con los modelos de eco), runner
  que copia el registro WFDB completo a `input/`, fuente `algoritmo_senal` en el formato común, scripts PowerShell que
  toleran un modelo sin torch ni pesos (`instalar_modelo`, `inferir -Fs`, `descargar_pesos`, `instalar_todo`,
  `inferir_muestras`, `reparar_torch`, `preparar_muestras`), sección "4b. ECG" en la app, 3 muestras recortadas de
  PhysioNet en `samples/` (ODC-By 1.0, verificado en las páginas), pruebas y comprobación (7) en `verificar.py`.
- **Salidas:** FC, HRV (RMSSD, SDNN), PR, QTc Bazett, latidos irregulares (criterio RR) y bandera de ritmo irregular
  compatible con FA. La bandera es **BANDERA EXPERIMENTAL – NO DIAGNÓSTICO** en JSON, CSV, app y README.
- **Ejecutado de verdad aquí (Linux, CPU, Python 3.11 con las versiones del lock):** registros completos mitdb 100, 201,
  203 y afdb 04015 y las 3 muestras; runs guardados en `validacion/ecg/runs/` e informe generado desde ellos en
  `validacion/ecg/VALIDACION.md` (+ `validacion_por_registro.csv`). Resumen:
  - Picos R vs latidos anotados (±150 ms): sensibilidad 0,9987 / 1,0000 / 0,9191 y PPV 1,0000 / 0,9718 / 0,9892 en 100 / 201 / 203.
  - Latidos irregulares (criterio RR) vs ectópicos anotados: sensibilidad 0,882 / 0,595 / 0,425, PPV 1,000 / 0,450 / 0,234.
  - Bandera por segmento vs `(AFIB`: sensibilidad 1,000 / 1,000 / 1,000 en 201 / 203 / 04015; especificidad 1,000 / 0,054 / 0,000 / 0,904 en 100 / 201 / 203 / 04015. Detecta irregularidad, no FA.
  - PR y QTc: sin etiquetas con que compararlos; no validados. PTB-XL+ no sirvió (solo hay un CSV de características, sin señales).
- **Historia:** la primera versión de la bandera (ventanas de 30 s) y Kubios para los ectópicos dieron peores resultados
  (`validacion/ecg/v1_resumen.json`). La versión actual usa lo publicado por Dash et al. 2009 sin ajustar umbrales, pero
  se eligió después de ver la v1 sobre los mismos 4 registros: **no es una validación independiente**.
- **Captura:** `validacion/ecg/captura_ecg.png` (Streamlit headless + Playwright, muestra `ecg_fa_afdb04015`; el run de
  la captura se borró de `outputs/`, sus cifras coinciden con el caso `muestra_fa_afdb04015` de la validación).
- **Comprobado:** pytest 48 passed; `verificar.py` (3)–(7) PASA, (1)–(2) PENDIENTE; los 12 `.ps1` parsean con pwsh 7 y
  son ASCII. **No probado:** nada en Windows (ni `instalar_modelo.ps1 -Modelo ecg` ni la app allí).
- **Cambio menor en core:** `entorno.executable` ya no resuelve enlaces simbólicos (registraba el intérprete base de uv).

## 2026-11-15 ~01:10 CDMX — Motor de padecimientos (`motor/`) y vistas «Padecimientos» y «Configuración»
- **Qué:** se implementó `ALGORITMOS.md` (autorizado por Iker el 14 nov). `motor/`: puerta de calidad y mapeo de a.2/a.4
  (`calidad.py`, `entradas.py`), normalización (`normalizacion.py`), autocalibración (`calibracion.py`), score de dos canales
  (`score.py`), semáforo (`semaforo.py`), orquestación (`evaluacion.py`), parámetros provisionales y overrides
  (`parametros.py`, `tablas.py`) y generador de la tripulación SIMULADA (`simulador.py` → `datos/simulado/`). Tablas con
  fuente copiadas en `datos/modelo/`. En la app, selector lateral con tres vistas; las secciones 0–7 no cambiaron.
- **Comprobado en Linux:** pytest 98 passed, 5 skipped (43 previos + 55 nuevos: aritmética de d.7, semáforo, no aprender
  puntos alertados ni en cuarentena, base congelada, simulado nunca como real, overrides, vistas con AppTest). Capturas con
  Streamlit headless + Playwright. Con los 7 runs de `validacion/ecg/runs` (canal real, solo lectura): la muestra con FA da
  P01 AMARILLO «confirmar» y nunca ROJO (todo N4).
- **Límites conocidos:** todos los umbrales son provisionales (S1–S20) y nada está validado en astronautas; δ de fase = 0;
  de las capas fijas solo se calcula PHQ-9 (el resto «incompleto»/«inactivo»); sin interfaz para acuse de ROJO ni cierre de
  revisión de CUSUM; el dataset SIMULADO usa ruido acotado a propósito: con ruido gaussiano libre el CUSUM y la rampa dan
  muchas alertas en el control, así que la tasa de falsas alarmas **no** está medida; el QTc experimental del adaptador ECG
  puede cumplir el criterio de Rautaharju y dar AMARILLO «confirmar» en un registro normal (mitdb 100: 335 ms). **No
  probado:** nada en Windows ni con salidas reales de eco. **No es un diagnóstico.**

