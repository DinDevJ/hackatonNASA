# Prototipo: modelos de ecocardiografía + ECG + sensores (NASA Space Apps 2026, "Health Monitoring Software for Astronauts")

> **Prototipo de investigación. No es un dispositivo médico ni un diagnóstico. No está validado en astronautas.**
> En la máquina donde se armó (Linux, sin GPU) **NO se corrió inferencia real ni se descargaron pesos**: solo pruebas
> de carga con datos dummy. La primera inferencia real se hace en la PC de Iker con los comandos de abajo.
> Excepción: el **módulo ECG** (procesamiento de señal en CPU, sin pesos) sí se ejecutó aquí sobre registros públicos
> de PhysioNet; ver la sección "Módulo ECG" y `validacion/ecg/VALIDACION.md`.

## Qué hace
- Corre 5 modelos oficiales de ecocardiografía (PanEcho, EchoNet-Dynamic, MedSAM2, EchoPrime y EchoCLIP). Cada uno tiene su propio venv y se invoca por subprocess con JSON (`adapters/<modelo>/infer.py`).
- Cada adaptador usa el preprocesamiento oficial de su repo; las desviaciones quedan anotadas en `config`.
- Valida la modalidad (imagen 2D, video 2D, volumen 3D, Doppler color, Doppler espectral, ECG 1D). Ante una incompatible responde **"análisis no implementado"** y no convierte nada.
- Módulo **ECG** (`ecg`, NeuroKit2 + wfdb, sin torch ni pesos): FC, HRV, PR, QTc, latidos irregulares y una **bandera experimental (no diagnóstica)** de ritmo irregular compatible con FA, con comparación contra las anotaciones del registro cuando existen.
- Guarda la entrada, la salida original, la config, el checkpoint y su sha256, el tiempo y los errores en `outputs/raw/<run_id>/`, y añade las filas al formato común `outputs/normalized.csv`.
- Importa sensores (reloj, anillo, manguito, termómetro) desde CSV o JSON. Incluye un ejemplo **sintético marcado `simulated=true`**.
- Construye una tabla conjunta por persona (nunca mezcla personas) y compara modelos lado a lado (sin promediar).
- Aplica reglas **experimentales** con su fórmula y los datos que las activaron. Trae un stub de red de fusión que responde "no existe predictor entrenado".
- La app Streamlit es de una sola página y tiene los 7 elementos del encargo.

Estado de cada modelo: **`MODELOS-TABLA.md`**. Entorno: `ENTORNO.md`. Revisiones de los repos: `vendor/REVISIONES.md`.
Muestras y licencias: `samples/FUENTES.md`. Avance: `AVANCE.md`. Contrato interno: `CONTRATO.md`.
Validación del módulo ECG: `validacion/ecg/VALIDACION.md`.

## Decisión de entornos (y por qué)
- **Modelos: un venv por repo con Python 3.11, creado con `uv`**. Hay dos motivos:
  - Los pines de los repos no tienen wheels para el Python 3.13 de tu PC: echo_CLIP pide numpy 1.24.4 y tokenizers 0.13.3; EchoPrime, opencv 4.5.5.64 y pydicom 2.3.1; PanEcho se hizo en 3.10.
  - 3.11 cumple el `python>=3.10` de MedSAM2.
  - `uv` descarga solo un CPython 3.11 autónomo, sin tocar tu 3.13. Si falla, el script prueba `py -3.11`.
- **PyTorch 2.5.1 + torchvision 0.20.1 con wheels cu124** en todos los venvs:
  - MedSAM2 exige torch ≥2.5.1.
  - CUDA 12.4 funciona con tu driver 621.14 (pide ≥551.61) y soporta la RTX 4050 (Ada).
  - El wheel `torch-2.5.1+cu124` para Windows/cp311 existe y pesa 2,51 GB. uv lo guarda en caché una vez y lo enlaza en cada venv.
  - Las desviaciones respecto a lo que pide cada repo (torch 1.8 en EchoNet, 2.0.1 en EchoCLIP, 2.1 en PanEcho) están en `adapters/<modelo>/manifest.json` → `env.notas`.
- **Instalación de cada venv en 2 pasos**:
  1. torch/torchvision desde el índice cu124.
  2. `adapters/<modelo>/requirements-win.lock.txt`, compilado para Windows/cp311 con `uv pip compile` y sin torch. Los requisitos legibles están en `requirements.in`.
- **App** (Streamlit, sensores, fusión y verificación): venv `envs\app` con **tu Python 3.13**, con `requirements-app.txt` fijado para Windows/3.13. De ahí sale el `uv` que crea los venvs de modelos.

## Comandos exactos (PowerShell, en orden)
Requisitos:
- Windows 10/11, `python` 3.13.5 en el PATH, `git`, el driver NVIDIA 621.14 e internet.
- Espacio en disco: estimado ≥30 GB libres. Son 6,3 GB de pesos, la caché de torch y 5 venvs (estimación, no medida).
- Copia la carpeta `prototipo` a una ruta **corta** (p. ej. `C:\nasa\prototipo`) para evitar el límite de 260 caracteres.

```powershell
# 0) Entrar a la carpeta y permitir scripts en esta sesión
cd C:\nasa\prototipo
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
Get-ChildItem -Recurse -File | Unblock-File          # solo si la copiaste desde un .zip descargado

# 1) Repos oficiales (ya vienen en vendor\; esto solo clona los que falten, en el commit registrado)
.\scripts\clonar_repos.ps1

# 2) Entorno de la app (Python 3.13 del sistema) + muestras oficiales con verificacion sha256
.\scripts\instalar_app.ps1
.\scripts\preparar_muestras.ps1

# 3) Verificacion previa (sin pesos): debe dar PASA en 3-6 y PENDIENTE en 1-2
.\scripts\verificar.ps1

# 4) PRIMER MODELO: PanEcho de punta a punta
.\scripts\instalar_modelo.ps1 -Modelo panecho          # imprime torch, CUDA 12.4, GPU y VRAM
.\scripts\inferir.ps1 -Modelo panecho -Entrada samples\echoclip_example_video.avi -Sujeto PRUEBA-CARGA -PruebaCarga   # opcional: carga sin pesos (NO es resultado)
.\scripts\descargar_pesos.ps1 -Modelo panecho -Si      # 505 MB
.\scripts\inferir.ps1 -Modelo panecho -Entrada samples\echoclip_example_video.avi -Sujeto MUESTRA-echoclip_example_video -Estudio echoclip_example_video -Modalidad video_2d -Vista desconocida

# 5) SEGUNDO MODELO: EchoNet-Dynamic (solo A4C) y PanEcho sobre el MISMO video A4C para compararlos
.\scripts\instalar_modelo.ps1 -Modelo echonet_dynamic
.\scripts\descargar_pesos.ps1 -Modelo echonet_dynamic -Si   # 568 MB
.\scripts\inferir.ps1 -Modelo echonet_dynamic -Entrada samples\echonet_dynamic_Example1.mp4 -Sujeto MUESTRA-echonet_dynamic_Example1 -Estudio echonet_dynamic_Example1 -Modalidad video_2d -Vista A4C
.\scripts\inferir.ps1 -Modelo panecho -Entrada samples\echonet_dynamic_Example1.mp4 -Sujeto MUESTRA-echonet_dynamic_Example1 -Estudio echonet_dynamic_Example1 -Modalidad video_2d -Vista A4C

# 6) Resto (opcional, uno por uno): MedSAM2 (156 MB), EchoCLIP (1,2 GB), EchoPrime (3,9 GB; usa mucha RAM)
.\scripts\instalar_modelo.ps1 -Modelo medsam2;  .\scripts\descargar_pesos.ps1 -Modelo medsam2 -Si
.\scripts\instalar_modelo.ps1 -Modelo echoclip; .\scripts\descargar_pesos.ps1 -Modelo echoclip -Si
.\scripts\inferir.ps1 -Modelo echoclip -Entrada samples\echoclip_example_video.avi -Sujeto MUESTRA-echoclip_example_video -Estudio echoclip_example_video -Modalidad video_2d
.\scripts\instalar_modelo.ps1 -Modelo echoprime; .\scripts\descargar_pesos.ps1 -Modelo echoprime -Si
.\scripts\inferir.ps1 -Modelo echoprime -Entrada samples\echoclip_example_video.avi -Sujeto MUESTRA-echoclip_example_video -Estudio echoclip_example_video -Modalidad video_2d
#    Atajo para todo lo anterior: .\scripts\instalar_todo.ps1 -Si   y luego   .\scripts\inferir_muestras.ps1
#    MedSAM2 necesita una caja inicial: usala desde la app (muestra un frame para elegirla)
#    o: .\scripts\inferir_muestras.ps1 -Modelos medsam2 -CajaMedSAM2 "x0,y0,x1,y1"

# 7) Verificacion con runs reales: ahora (1) y (2) deben pasar a PASA
.\scripts\verificar.ps1

# 8) Abrir la app (http://localhost:8501)
.\scripts\lanzar_app.ps1
```

Notas:
- `inferir.ps1` sale con código 0 (ok), 2 (rechazado: modalidad o vista incompatible) o 1 (error). Cada ejecución queda en `outputs\raw\<run_id>\` (`request.json`, `response.json`, `stdout.log`, `stderr.log`, `input\`, artefactos).
- `instalar_modelo.ps1` termina con error si torch no queda en cu124 con CUDA disponible (revisa el driver con `nvidia-smi`; para un entorno ya instalado, ver "Reparar entorno ya instalado" abajo). En CPU también corre, pero lento.
- EchoNet-Dynamic rechaza cualquier vista que no sea `A4C`. Ninguna vista se adivina.
- MedSAM2 rechaza si no hay caja o máscara inicial; no hay segmentación automática.

## Módulo ECG (experimental, NO diagnóstico)
> **Todo lo que calcula este módulo es una estimación por procesamiento de señal. La bandera de ritmo irregular es una
> BANDERA EXPERIMENTAL, NO UN DIAGNÓSTICO.** No está validado clínicamente ni en astronautas. Las muestras son **datos
> reales públicos de pacientes hospitalarios** (MIT-BIH Arrhythmia Database y MIT-BIH Atrial Fibrillation Database,
> PhysioNet, ODC-By 1.0): **no son de Iker ni de astronautas** (fuente exacta, licencia y citas en `samples/FUENTES.md`).

Qué es: `adapters/ecg` usa NeuroKit2 0.3.0 y wfdb 4.3.1 (ambos MIT) en CPU. No hay modelo entrenado, ni pesos, ni torch;
su entorno `envs\ecg` (Python 3.11) es ligero y `instalar_modelo.ps1` se salta en él la instalación y reparación de torch.

Entrada (modalidad `ecg_1d`):
- **Registro WFDB**: basta pasar el `.hea`; el runner copia el `.dat` y, si existen, el `.atr`/`.qrs` del mismo nombre.
  La frecuencia de muestreo sale del encabezado.
- **CSV/TXT/TSV** con la señal en una columna: hay que dar la frecuencia de muestreo con `-Fs` (Hz). Sin ella se
  rechaza: no se adivina. Otras opciones (canal, columna, inicio y duración en segundos…) van en `-OpcionesJson`; la
  lista completa con sus valores por defecto está en `adapters/ecg/manifest.json` → `opciones`.
- Los modelos de eco rechazan `ecg_1d` y `ecg` rechaza videos, imágenes, DICOM y volúmenes, con mensaje claro.

Comandos exactos (PowerShell, desde la carpeta del prototipo, después de `instalar_app.ps1`):
```powershell
cd C:\nasa\prototipo
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass

# 1) Entorno del modulo ECG (uv venv envs\ecg con Python 3.11; SIN torch; no descarga pesos)
.\scripts\instalar_modelo.ps1 -Modelo ecg
.\scripts\preparar_muestras.ps1                      # verifica el sha256 de todas las muestras, tambien las de ECG

# 2) Las tres muestras (ritmo normal, FA, extrasistoles); cada una es una persona distinta
.\scripts\inferir.ps1 -Modelo ecg -Entrada samples\ecg_normal_mitdb100.hea -Sujeto MUESTRA-ecg_normal_mitdb100 -Estudio ecg_normal_mitdb100 -Modalidad ecg_1d -Vista desconocida
.\scripts\inferir.ps1 -Modelo ecg -Entrada samples\ecg_fa_afdb04015.hea -Sujeto MUESTRA-ecg_fa_afdb04015 -Estudio ecg_fa_afdb04015 -Modalidad ecg_1d -Vista desconocida
.\scripts\inferir.ps1 -Modelo ecg -Entrada samples\ecg_extrasistoles_mitdb201.hea -Sujeto MUESTRA-ecg_extrasistoles_mitdb201 -Estudio ecg_extrasistoles_mitdb201 -Modalidad ecg_1d -Vista desconocida
#    Atajo para las tres: .\scripts\inferir_muestras.ps1 -Modelos ecg

# 3) Un CSV propio (una columna con la senal): la frecuencia de muestreo es obligatoria
.\scripts\inferir.ps1 -Modelo ecg -Entrada C:\datos\mi_ecg.csv -Sujeto S1 -Estudio ecg1 -Modalidad ecg_1d -Fs 250
#    Otro canal o un tramo: -OpcionesJson '{"canal":1,"inicio_s":60,"duracion_s":300}'

# 4) Verificacion (incluye la comprobacion 7, del ECG) y app
.\scripts\verificar.ps1
.\scripts\lanzar_app.ps1
```
Cada ejecución queda en `outputs\raw\<fecha>_ecg_<id>\` (igual que los demás modelos: `request.json`, `response.json`,
`input\`, `normalized_run.csv`, más `ecg_traza.npz` con la señal y los picos) y sus 8 filas se añaden a
`outputs\normalized.csv` con las mismas columnas que el resto. `descargar_pesos.ps1 -Modelo ecg` responde "no requiere".

Salidas (formato común; un valor que no se puede calcular queda **vacío**, nunca 0):

| metric | unidad | tipo | qué es |
|---|---|---|---|
| `heart_rate` | bpm | medicion | 60 / media de los RR válidos del tramo analizado |
| `hrv_rmssd`, `hrv_sdnn` | ms | medicion | HRV sobre el tramo analizado (la ventana en segundos va en `notes`), excluyendo los RR vecinos a latidos prematuros; también por ventanas de 300 s en `raw_output` |
| `pr_interval` | ms | medicion | mediana de (inicio QRS − inicio P), delineación DWT de NeuroKit2; `quality` nunca es "ok" |
| `qtc_bazett` | ms | medicion | mediana de QT / √RR previo (Bazett), misma delineación |
| `latidos_irregulares` | latidos | hallazgo | latidos prematuros por criterio RR: RR < 0,80 × mediana de los 8 RR previos. No distingue supraventricular de ventricular |
| `ritmo_irregular_fraccion_ventanas` | fraccion_0_1 | hallazgo | fracción de segmentos de 128 latidos marcados por la regla |
| `ritmo_irregular_compatible_fa` | bandera_0_1_no_diagnostica | regla_alerta | **BANDERA EXPERIMENTAL – NO DIAGNÓSTICO** |

La bandera reimplementa los tres estadísticos de Dash et al. 2009 (Ann Biomed Eng 37(9):1701-9,
doi:10.1007/s10439-009-9740-z) con los umbrales del artículo, sobre segmentos de 128 intervalos RR: RMSSD/media RR > 0,1,
razón de puntos de inflexión entre 0,54 y 0,77 y entropía de Shannon > 0,7, después del filtro de latidos ectópicos del
mismo artículo. Vale 1 si hay al menos 2 segmentos marcados consecutivos, 0 si no, y queda vacía si el registro es
demasiado corto (menos de ~160 latidos). El paso entre segmentos, la regla de los 2 consecutivos y algunos detalles que
el artículo no fija son decisiones nuestras; la rama de "RR omitidos" de su filtro no está implementada. Fórmula, parámetros y fuente van en cada
`response.json` (`raw_output.bandera_fa`) y en la fila del CSV.

En la app (sección "4b. ECG"): traza con los picos R marcados, métricas, bandera rotulada y, cuando el registro trae
anotaciones (`.atr` de MIT-BIH/AFDB), la **comparación contra las etiquetas reales**: sensibilidad y PPV de los picos R
(tolerancia ±150 ms), latidos irregulares frente a los latidos anotados V/A/otros, y bandera frente al ritmo `(AFIB`
anotado, por segmento.

Validación en Linux contra las anotaciones de 4 registros públicos (tablas completas, run_id y runs guardados en
`validacion/ecg/`; captura de la vista en `validacion/ecg/captura_ecg.png`). Limitaciones medidas ahí:
- La regla detecta **irregularidad del RR, no FA**. Marcó todos los segmentos con FA anotada (registros 201, 203 y 04015), pero
  también casi todos los segmentos sin FA del registro 201 (ectopia frecuente, trigeminismo), todos los de flúter del
  203 y cerca del 10 % de los segmentos sin FA del 04015. En el registro 100 (sin FA) no marcó ninguno.
- El criterio RR de latidos irregulares no distingue supraventricular de ventricular y, con FA, marca latidos que no son
  extrasístoles.
- PR y QTc dependen de una delineación automática que **no se pudo validar** (los registros no traen esas etiquetas) y
  no tienen sentido con ritmo irregular (en FA no hay onda P).
- Se analiza un solo canal por ejecución. No está probado en Windows ni con ECG de reloj.
- La versión final de la regla se eligió después de ver una versión previa sobre esos mismos 4 registros: **no es una
  validación independiente**.

## Reparar entorno ya instalado (CUDA False)
Sintoma: `torch.cuda.is_available()` da `False` y `torch.__version__` ya no dice `2.5.1+cu124` (por ejemplo `2.15.0+cpu`).
Causa: los locks no incluyen torch, pero `timm`, `open-clip` y otros lo piden sin version; al instalar el lock, `uv` resolvia torch
otra vez desde PyPI (hoy 2.15.0 / torchvision 0.29.2, solo CPU) y reemplazaba la build cu124.
Arreglo (ya aplicado en los scripts): el lock se instala con `--no-deps --override scripts\torch-cu124-overrides.txt`, y al final
`instalar_modelo.ps1` reinstala torch 2.5.1 / torchvision 0.20.1 cu124 y **falla con error** si no queda `cu124` con CUDA disponible.

El entorno de PanEcho es **`envs\panecho`** y su Python es **`envs\panecho\Scripts\python.exe`** (el `uv` esta en `envs\app\Scripts\uv.exe`).
Para reparar un entorno que ya instalaste con la version anterior de los scripts, sin reinstalar todo:

```powershell
cd C:\nasa\prototipo
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass

# Opcion A (recomendada): script (reinstala solo torch/torchvision y verifica; sale con codigo 1 si sigue sin CUDA)
.\scripts\reparar_torch.ps1 -Modelo panecho          # o: todos

# Opcion B: los mismos pasos a mano
.\envs\app\Scripts\uv.exe pip install --python .\envs\panecho\Scripts\python.exe --reinstall-package torch --reinstall-package torchvision torch==2.5.1 torchvision==0.20.1 --index-url https://download.pytorch.org/whl/cu124 --override .\scripts\torch-cu124-overrides.txt

# Verificacion de CUDA (debe imprimir 2.5.1+cu124, 12.4, True y el nombre de la GPU)
.\envs\panecho\Scripts\python.exe -c "import torch; print(torch.__version__, torch.version.cuda, torch.cuda.is_available(), torch.cuda.get_device_name(0) if torch.cuda.is_available() else '-')"
```
Si la opcion B falla con "no matching distribution", agrega `--extra-index-url https://pypi.org/simple --index-strategy unsafe-best-match`.
Repite con `echonet_dynamic`, `medsam2`, `echoprime` y `echoclip` si tambien los instalaste antes del arreglo.
La inferencia de PanEcho **ya corrio en CPU** en tu PC (ver `AVANCE.md`); la reparacion solo es para que use la GPU.

## Sensores, cruce y reglas
- Formato largo: `subject_id,timestamp,device,variable,value,unit,quality,simulated,metric_detail,notes`. También se acepta CSV ancho; ver `sensores/ESQUEMA.md`.
- Ejemplo sintético: `sensores/ejemplo_sintetico_sensores.csv`/`.json`, con 2 personas simuladas y huecos (NaN, nunca 0).
- Las reglas experimentales R1–R5 están en `fusion/reglas.py`, con fórmula, parámetros y fuente. Ninguna da porcentajes de riesgo ni diagnóstico. El ejemplo sintético activa R3 en SIM-A01 a propósito.
- El stub de fusión está en `fusion/red_fusion_stub.py`. Los datos emparejados y desenlaces que harían falta para entrenarlo están en `fusion/NOTA-ENTRENAMIENTO.md`.

## Padecimientos (motor analítico, provisional; NO diagnóstico)
La app tiene ahora tres vistas en la barra lateral: «Modelos y sensores» (las secciones 0–7 de siempre), «Padecimientos» y
«Configuración». `motor/` implementa la especificación `ALGORITMOS.md` del equipo: puerta de calidad (N0–N4), z poblacional,
z personal y delta de tripulación, dos canales que no se suman (log-odds solo para las 6 ligas con LR/OR publicado; peso ×
activación con incertidumbre `prior_de` para el resto), autocalibración con base prevuelo inmutable, EWMA protegido, CUSUM y
cuarentena de 72 h, y un semáforo VERDE / AMARILLO / ROJO / GRIS por cada uno de los 20 padecimientos. Lee las tablas con
fuente copiadas en `datos/modelo/` (nunca se escriben); lo que se edita en «Configuración» va a `datos/modelo/overrides.json`
y queda marcado «modificado por el usuario». Entradas: runs guardados en `outputs/raw/`, sensores cargados en la sección 5 y
una tripulación **SIMULADA** (`datos/simulado/`, 5 personas, 30 días, `simulated=true`; no es fisiología real ni dato de
vuelo) que solo ejercita el flujo y nunca se mezcla con datos reales. **Todos los umbrales son provisionales, ninguno está
validado en astronautas y nada es un diagnóstico**; las reglas R1–R5 y la FEVE no mueven este semáforo. Interfaces,
decisiones y límites: `motor/DISENO.md`. Instalación sobre una copia existente: `NOTA-INSTALACION-PADECIMIENTOS.md`.

## Verificación (VERIFICACIÓN del encargo)
`verificar.py` revisa las 7 comprobaciones, y `tests/` (pytest) cubre lo mismo:
1. Inferencia real: **PENDIENTE** hasta correrla en la PC.
2. Salidas atadas a su ejecución: la lógica se probó con una fixture; con runs reales revisa sha256, `run_id` y filas.
3. Rechazo de incompatibles.
4. No mezclar personas.
5. Faltantes y diferencias temporales.
6. Simulados identificados.
7. ECG: modalidades cruzadas rechazadas, bandera rotulada como no diagnóstica, faltantes vacíos (y, si `envs\ecg` está
   instalado, una ejecución real sobre una muestra).

Resultado en la máquina Linux (2026-11-14, tras añadir el módulo ECG): 3–7 **PASA**, 1–2 **PENDIENTE** (no hay runs en
`outputs/raw`; los de la validación del ECG están aparte, en `validacion/ecg/runs/`); pytest dio 48 passed.
