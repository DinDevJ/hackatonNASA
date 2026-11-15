# Contrato interno entre módulos (lo fija el coordinador; no cambiar sin avisar)

Destino: la carpeta `prototipo/` se copia a la PC de Iker (Windows + PowerShell, Python 3.13.5 como `python`,
RTX 4050 Laptop 6 GB VRAM, driver 621.14 → CUDA 12.x). En esta máquina Linux (sin GPU) NO se descargan pesos ni se
corre inferencia real: solo pruebas de carga con datos dummy, marcadas "NO se ha corrido inferencia real".

**Rutas: SIEMPRE relativas a la raíz `prototipo/`** (en código: `core.runs.ROOT`, `Path(__file__)`; en .ps1: `$PSScriptRoot`
+ `Join-Path`). Nada de `/home/box` en archivos entregables. En JSON las rutas van con `/`.

## Decisión de entornos (fijada)
- **Modelos: un venv por repo con Python 3.11**, creado con **uv** (`uv venv --python 3.11 envs\<key>`; uv descarga un
  CPython 3.11 autónomo si no existe; alternativa documentada: `py -3.11 -m venv`). Motivo: Python 3.13 no sirve para los
  pines de los repos (p. ej. echo_CLIP pide numpy 1.24.4/tokenizers 0.13.3, EchoPrime opencv 4.5.5.64/pydicom 2.3.1/
  polars 0.15.14, PanEcho se desarrolló en 3.10): no tienen wheels cp313. 3.11 cumple `python>=3.10` de MedSAM2.
- **PyTorch 2.5.1 + torchvision 0.20.1, wheels cu124** (`--index-url https://download.pytorch.org/whl/cu124`) en todos los
  venvs de modelos. Motivo: MedSAM2 exige torch>=2.5.1; cu124 es compatible con driver ≥551.61 en Windows (621.14 lo
  cumple) y la RTX 4050 (Ada, sm_89) está soportada. Desviaciones respecto a lo que pide cada repo se documentan en su manifest.
- **Instalación en 2 pasos por venv**: (1) torch/torchvision desde el índice cu124; (2) `requirements-win.lock.txt`
  (generado con `uv pip compile --python-platform x86_64-pc-windows-msvc --python-version 3.11 --no-emit-package torch
  --no-emit-package torchvision`, contra PyPI, es decir SIN torch dentro).
- **App** (Streamlit + sensores + fusión + runner + verificar): venv ligero `envs\app` con el Python 3.13 del sistema
  (`python -m venv envs\app`), `requirements-app.txt` con pines; incluye `uv` (de ahí se usa para crear los venvs de modelos).
- En Linux, para pruebas, los venvs de prueba van FUERA de la entrega (p. ej. `/tmp/nasa-linux-envs/<key>`, CPU torch
  2.5.1) y se apuntan con la variable `PROTOTIPO_ENVS_DIR`.

## Carpetas
```
app.py                     Streamlit (una página, 7 elementos)
verificar.py               6 comprobaciones de VERIFICACIÓN (+ tests/ con pytest)
requirements-app.txt       pines del venv de la app
core/runs.py               run_id, JSON, sha256, rutas relativas, ejecutar_adaptador(), rechazar()  [coordinador]
core/formato.py            formato común + append a outputs/normalized.csv                          [coordinador]
core/modalidad.py          detectar()/validar() de modalidad                                         [coordinador]
core/registry.py           lee adapters/*/manifest.json y calcula estado de cada modelo
core/run_model.py          runner por subprocess (app y CLI: python -m core.run_model ...)
adapters/<key>/infer.py    adaptador (se ejecuta con el python de envs/<key>)
adapters/<key>/manifest.json, requirements.in, requirements-win.lock.txt
sensores/                  importador CSV/JSON, ejemplo sintético simulated=true, resúmenes
fusion/                    tabla conjunta, comparación entre modelos, reglas experimentales, stub de red de fusión
scripts/*.ps1              instalación, pesos, inferencia, streamlit, verificación (compatibles con Windows PowerShell 5.1)
envs/  weights/  samples/  outputs/raw/  outputs/normalized.csv
```
`<key>` ∈ `panecho`, `echonet_dynamic`, `medsam2`, `echoprime`, `echoclip`, `ecg` (ECG: sin torch ni pesos; ver "Módulo ECG" al final).

## manifest.json (uno por modelo; lo leen registry.py, app.py y los .ps1)
```json
{
  "key": "panecho", "nombre": "PanEcho",
  "repo": "vendor/PanEcho", "repo_url": "https://github.com/CarDS-Yale/PanEcho", "repo_commit": "836c46e…",
  "entrypoint": "adapters/panecho/infer.py",
  "env": {"dir": "envs/panecho", "python": "3.11", "torch": "2.5.1", "torchvision": "0.20.1",
          "torch_index_url": "https://download.pytorch.org/whl/cu124",
          "requirements_in": "adapters/panecho/requirements.in",
          "lock_windows": "adapters/panecho/requirements-win.lock.txt",
          "install_vars": {}, "editable": [], "notas": "desviaciones respecto al repo y por qué"},
  "pesos": [{"archivo": "weights/panecho/panecho.pt", "url": "https://…", "tamano_bytes": 0,
             "tamano_fuente": "HEAD Content-Length 2026-11-14 (no se descargó)", "sha256": null,
             "acceso": "publico|gated|registro", "licencia": "…", "pasos_manuales": null,
             "descomprimir_en": null}],
  "muestras": [{"archivo": "samples/…", "fuente": "…", "licencia": "…"}],
  "modalidades_admitidas": ["video_2d"], "vistas_admitidas": ["cualquiera"],
  "entrada": "descripción", "salidas": ["lista de salidas reales que expone el repo"],
  "requiere_prompt": false, "opciones": {"clave": "valor por defecto"},
  "vram_estimada": {"gb": 1.0, "base": "parámetros medidos × 4 B + activaciones estimadas / o 'estimación sin medir'", "cabe_en_6gb": "probable|dudoso|no"},
  "licencia": "…", "estado": "pendiente de probar en PC" , "motivo_estado": "…", "timeout_s": 1800
}
```
`acceso` ≠ `publico` ⇒ los scripts NO descargan: imprimen `pasos_manuales` y el modelo queda "bloqueado" hasta que Iker
lo haga por su cuenta.

## Interfaz de un adaptador
```
envs\<key>\Scripts\python.exe adapters\<key>\infer.py --request <run_dir>\request.json --response <run_dir>\response.json
```
El adaptador usa `core.runs.ejecutar_adaptador(model, run)` (añade la raíz a `sys.path` con
`sys.path.insert(0, str(Path(__file__).resolve().parents[2]))`). `run(request, resp)`:
1. `core.modalidad.validar(input, declared_modality, admitidas, modelo)`; si no ok ⇒ `core.runs.rechazar(resp, motivo)` y return.
2. Valida vista si el modelo la exige (p. ej. EchoNet-Dynamic solo A4C); si no ⇒ rechazar.
3. Si `options.prueba_carga_dummy` ⇒ `resp["random_load_test"]=True`, construir la arquitectura SIN pesos, pasar un tensor
   aleatorio, guardar shapes/claves de salida; NO es inferencia real (ejecutar_adaptador añade el aviso).
4. Si no hay pesos en `weights/…` ⇒ status error con mensaje claro ("ejecuta scripts\descargar_pesos.ps1 -Modelo <key>" o
   pasos manuales si es gated).
5. Preprocesamiento OFICIAL del repo (citar archivo y líneas en `resp["config"]["preprocesamiento_fuente"]`), inferencia
   con `torch.no_grad()`, device `auto` (cuda si hay), `resp["raw_output"]` = salida original sin redondear,
   `resp["normalized"]` con `core.formato.filas_modelo(...)`, artefactos (máscaras .npz, overlay .mp4/.png) en run_dir,
   `resp["checkpoint"]` (ruta relativa, url, sha256), `resp["config"]`, `resp["device"]`, `resp["inferencia_real"]=True`,
   `resp["raw_output"]["vram_pico_mb"]=core.runs.vram_pico_mb()`.

request.json:
```json
{"run_id": "...", "run_dir": "outputs/raw/<run_id>", "input_path": "outputs/raw/<run_id>/input/<archivo o carpeta>",
 "subject_id": "...", "study_id": "...", "timestamp": "ISO o null", "simulated": false,
 "declared_modality": "video_2d|imagen_2d|volumen_3d|doppler_color|doppler_espectral|desconocida",
 "declared_view": "A4C|A2C|PLAX|PSAX|...|desconocida", "options": {"device": "auto"}}
```
response.json: ver `core.runs.nueva_respuesta()` (status ok|error|rechazado|prueba_carga, message, model, run_id,
checkpoint, device, random_load_test, inferencia_real, config, input, raw_output, normalized, artifacts, elapsed_s,
warnings, errors, entorno, started_at, finished_at).

## Formato común (outputs/normalized.csv) — ver core/formato.py
`subject_id, study_id, timestamp, source, model, metric, value, unit, quality, simulated, tipo, run_id, input_file, notes`
- `tipo`: medicion | probabilidad_clase | similitud | hallazgo | regla_alerta | comparacion
- Probabilidad de clase: metric `<tarea>:<clase>`, unit `probabilidad_modelo_0_1`. Similitud: unit `coseno`.
  Segmentación: `hallazgo`, áreas en `px2`; NUNCA mm/ml/cm/s sin calibración.
- Ausente = vacío, nunca 0. Prueba de carga nunca se escribe en normalized.csv.

## Runner (core/run_model.py, venv app)
`ejecutar(key, inputs, subject_id, study_id, timestamp, declared_modality, declared_view, options, simulated=False)`:
pre-valida modalidad con el manifest (rechaza sin lanzar subprocess), crea `outputs/raw/<run_id>/`, copia las entradas a
`input/`, escribe request.json, lanza el python de `envs/<key>` (o `$PROTOTIPO_ENVS_DIR/<key>`) con cwd=ROOT y timeout,
guarda stdout.log/stderr.log, lee response.json, escribe `run_dir/normalized_run.csv` y, si status=ok y no es prueba de
carga, añade a outputs/normalized.csv. CLI: `python -m core.run_model --model panecho --input samples\x.avi --subject S1 ...`.

## APIs para la app (sensores/ y fusion/)
- `sensores.importador.cargar(origen, nombre=None) -> (DataFrame largo, avisos)`; columnas
  `subject_id, timestamp, device, variable, value, unit, quality, simulated, metric_detail, notes`. Acepta CSV/JSON largo
  y CSV ancho. Variables canónicas en `sensores.importador.VARIABLES`. Faltante = NaN.
- `sensores.importador.a_formato_comun(df) -> list[dict]` (source=sensor).
- `sensores.resumen.resumir(df, subject_id, ventana_h=24, basal_dias=7, referencia=None) -> DataFrame`.
- `fusion.tabla.construir(normalized_df, sensores_df, subject_id, ventana_h=24, basal_dias=7, referencia=None) -> DataFrame`
- `fusion.tabla.comparar_modelos(normalized_df, subject_id, tolerancias=None) -> DataFrame` (lado a lado, diferencia,
  discrepancia; sin promediar; nota "acuerdo ≠ exactitud").
- `fusion.reglas.REGLAS`; `fusion.reglas.evaluar(tabla, comparacion, params=None) -> list[dict]` con
  `id, nombre, etiqueta="REGLA EXPERIMENTAL – no diagnóstica", formula, parametros, activada, datos (filas que la activaron), mensaje`.
- `fusion.red_fusion_stub.predecir(tabla) -> {"disponible": False, "motivo": "...", "probabilidades": None}`.

## Módulo ECG (`adapters/ecg`, key `ecg`) — añadido 2026-11-14
No es un modelo entrenado: es procesamiento de señal (NeuroKit2 0.3.0 + wfdb 4.3.1), CPU, **sin torch y sin pesos**
(`manifest.env` sin `torch`/`torchvision`/`torch_index_url`; `pesos: []`). Todo es estimación experimental; la bandera
de ritmo irregular es **BANDERA, NO DIAGNÓSTICO**.

- Modalidad nueva `ecg_1d` (`core/modalidad.py`): registro WFDB (`.hea` + `.dat`, opcional `.atr`/`.qrs`; el `.hea` fija
  la modalidad) o tabla CSV/TXT/TSV declarada `ecg_1d` (exige `options.fs`). Los modelos de eco rechazan `ecg_1d`; `ecg`
  rechaza video/imagen/DICOM/volumen. `source` nuevo en el formato común: `algoritmo_senal`.
- Runner: si la entrada es un archivo de un registro WFDB, copia a `input/` todos los compañeros del mismo nombre
  (`.hea/.dat/.atr/.qrs`) y `input_path` es la carpeta `input/` (el sha256 cubre todo). Varios archivos subidos = carpeta.
  El adaptador recibe por tanto una CARPETA con exactamente un `.hea`, o un archivo CSV/TXT/TSV.
  `ejecutar(..., raw_dir=None, normalized_csv=None)` y CLI `--raw-dir/--normalized-csv` redirigen runs y CSV (validación).
- Estructura: `adapters/ecg/infer.py` (E/S, NeuroKit2, artefactos) + `adapters/ecg/metricas.py` (**solo numpy +
  biblioteca estándar + core.formato**: RR, HRV, regla de ventanas, emparejamiento con anotaciones, filas normalizadas;
  importable desde el venv de la app para pruebas).
- Opciones (`manifest.opciones`, todas con valor por defecto escalar para que la app genere el control):
  `fs` (0.0 = usar la del .hea; obligatorio >0 en CSV), `canal` (0), `canal_nombre` (""), `csv_columna` (""),
  `inicio_s` (0.0), `duracion_s` (0.0 = hasta el final), `traza_max_s` (1800.0), `rr_min_s` (0.25), `rr_max_s` (3.0),
  `min_rr_hrv` (20), `ect_fraccion_prematuro` (0.80), `ect_n_previos` (8), `fa_latidos_segmento` (128),
  `fa_paso_latidos` (32), `fa_n_atipicos` (8), `fa_filtro_ectopicos` (true), `fa_umbral_nrmssd` (0.10), `fa_tpr_min` (0.54), `fa_tpr_max` (0.77),
  `fa_umbral_entropia` (0.70), `fa_min_ventanas_consecutivas` (2), `tolerancia_pico_ms` (150.0),
  `prueba_carga_dummy` (false).
- Métodos. Historia honesta: la v1 (2026-11-14) usaba Kubios para los latidos irregulares y, para la bandera, ventanas
  de 30 s con nRMSSD > 0,10 + prueba de puntos de inflexión. Al correrla sobre mitdb 100/201/203 y afdb 04015 dio mala
  especificidad (marcaba ectopia aislada, trigeminismo y ruido) y Kubios detectó <10 % de los ectópicos anotados en
  201/203. La v2 (abajo) NO ajusta umbrales a esos registros: adopta los estadísticos y umbrales publicados por Dash et
  al. 2009 y un criterio RR de prematuridad del 20 %. Aun así, v2 se eligió después de ver v1 sobre los mismos
  registros: sus cifras NO son una validación independiente.
  1. Picos R: `nk.ecg_clean(method="neurokit")` + `nk.ecg_peaks(method="neurokit", correct_artifacts=False)`.
  2. RR válidos: `rr_min_s ≤ RR ≤ rr_max_s`. FC = 60 / media(RR).
  3. Latidos irregulares (criterio RR documentado, principal): el latido i es "prematuro" si su RR previo cumple
     RR_i < `ect_fraccion_prematuro` × mediana(los `ect_n_previos` RR válidos anteriores; mínimo 4). El 20 % de
     prematuridad es la convención habitual del "filtro del 20 %" en HRV; aquí es EXPERIMENTAL. No distingue
     supraventricular de ventricular y en FA marca muchos latidos (no son extrasístoles). Se informa aparte, solo como
     comparación, la clase `ectopic` de `nk.signal_fixpeaks(method="Kubios", iterative=False)` (Lipponen & Tarvainen
     2019) con sus `longshort/missed/extra`.
  4. HRV (RMSSD, SDNN, ddof=1) sobre el segmento analizado completo con intervalos NN = RR válidos excluyendo el RR
     previo y el posterior de cada latido marcado en (3); se informa también el valor sin filtrar y por ventanas de
     300 s. Mínimo `min_rr_hrv`.
  5. PR = inicio QRS (`ECG_R_Onsets`) − inicio P (`ECG_P_Onsets`); QT = fin T (`ECG_T_Offsets`) − inicio QRS;
     QTc Bazett = QT / sqrt(RR previo en s); medianas por latido, de `nk.ecg_delineate(method="dwt")`. Mínimo 5 latidos.
  6. Bandera "ritmo irregular compatible con FA" (EXPERIMENTAL): reimplementación de los tres estadísticos de Dash
     et al. 2009 (Ann Biomed Eng 37(9):1701-9, doi:10.1007/s10439-009-9740-z) con SUS umbrales, sobre segmentos de
     `fa_latidos_segmento` = 128 latidos consecutivos (paso `fa_paso_latidos`): (C1) RMSSD/media(RR) >
     `fa_umbral_nrmssd`, (C2) razón de puntos de inflexión TPR dentro de [`fa_tpr_min`, `fa_tpr_max`], (C3) entropía
     de Shannon (16 intervalos, normalizada) > `fa_umbral_entropia`; tratamiento de atípicos (`fa_n_atipicos` RR más
     largos y más cortos) tal como lo describe el artículo (citar sección/tabla en `bandera_fa.fuente`; cualquier
     detalle que el artículo no fije se documenta como decisión propia). Segmento marcado = C1 y C2 y C3. Un segmento
     solo es evaluable si sus 128 latidos dan RR válidos suficientes (documentar). Bandera del registro = 1 si hay
     ≥ `fa_min_ventanas_consecutivas` segmentos marcados consecutivos; 0 si no; **vacía** (None) si hay menos segmentos
     evaluables que ese mínimo (p. ej. registros de menos de ~160 latidos). No se validó clínicamente; el paso entre
     segmentos y la regla de consecutivos son decisiones propias. `ventanas[]` describe cada segmento (duración variable).
     Antes de C1–C3 se aplica el filtro de ectópicos del artículo (p. 1703: RR[i]/RR[i−1] < Perc1, RR[i+1]/RR[i] > Perc99
     y RR[i+1]/RR[i+2] > Perc25; se eliminan RR[i] y su pausa compensadora y se enlaza la serie), con percentiles
     calculados dentro de cada segmento (decisión propia: el artículo no precisa el conjunto). La rama de "RR omitidos"
     del artículo NO se implementa (el texto no dice qué RR eliminar). `fa_filtro_ectopicos=false` lo desactiva.
- Filas normalizadas (siempre las 8; valor ausente = None con `quality="sin_dato: <motivo>"`, nunca 0), `model="ecg"`:

  | metric | unit | tipo | source | variable |
  |---|---|---|---|---|
  | `heart_rate` | bpm | medicion | algoritmo_senal | — |
  | `hrv_rmssd` | ms | medicion | algoritmo_senal | V43 |
  | `hrv_sdnn` | ms | medicion | algoritmo_senal | V43 |
  | `pr_interval` | ms | medicion | algoritmo_senal | V35 |
  | `qtc_bazett` | ms | medicion | algoritmo_senal | V34 |
  | `latidos_irregulares` | latidos | hallazgo | algoritmo_senal | proxy V32/V33 (criterio RR; quality `experimental_criterio_rr_prematuridad`) |
  | `ritmo_irregular_fraccion_ventanas` | fraccion_0_1 | hallazgo | regla_experimental | proxy V31 |
  | `ritmo_irregular_compatible_fa` | bandera_0_1_no_diagnostica | regla_alerta | regla_experimental | proxy V31 |

  La fila de la bandera lleva `quality="BANDERA_EXPERIMENTAL_NO_DIAGNOSTICO"` y `notes` que empieza por
  `BANDERA EXPERIMENTAL – NO DIAGNÓSTICO:` seguido de fórmula, parámetros y ventana. Las `notes` de HRV/FC indican la
  ventana (t inicio–fin en s) y n. PR y QTc nunca llevan `quality="ok"`: `experimental_delineacion_dwt` (o el aviso de
  ritmo irregular), porque la delineación no está validada aquí.
- `raw_output` (resúmenes; nada de arreglos por latido): `aviso`, `entrada`, `metodos`, `picos_r`, `fc`, `hrv`,
  `intervalos`, `latidos_irregulares`, `bandera_fa` (con `etiqueta`, `formula`, `parametros`, `fuente`, `valor`,
  `motivo`, `n_ventanas`, `n_evaluables`, `n_marcadas`, `fraccion_marcadas`, `max_consecutivas`, `ventanas[]` =
  `{i,t0_s,t1_s,n_rr,n_rr_filtrados_ectopicos,nrmssd,tpr,entropia,c1,c2,c3,marcada}`), `comparacion_anotaciones` (None si no hay
  `.atr`/`.qrs`), `tiempos_s`.
- `comparacion_anotaciones` (cuando hay anotaciones junto al registro; se recortan al segmento analizado):
  `picos_r` {referencia (`atr` o `qrs (detector automático no auditado)`), tolerancia_ms=150 (ventana de emparejamiento
  de ANSI/AAMI EC57), n_ref, n_det, tp, fn, fp, sensibilidad, ppv}; `ectopicos` {anotados_por_simbolo, n_anotados_V,
  n_anotados_A, n_anotados_otros, n_anotados_total, n_detectados, tp, fn, fp, sensibilidad, ppv,
  criterio_emparejamiento} para el criterio RR y `ectopicos_kubios` (mismos campos) para Kubios; `fa` {criterio_ventana (segmento AFIB si ≥50 % de su duración está en `(AFIB`),
  ritmos_anotados_s, fraccion_tiempo_afib_anotada, n_ventanas_evaluables, n_ventanas_afib, tp, fp, fn, tn,
  sensibilidad, especificidad, ppv, ventanas_afl {n, marcadas}, bandera_segmento}; `fc_hrv` {detectados, anotados,
  diferencias} (mismas funciones aplicadas a los latidos anotados). Una razón con denominador 0 es None, no 0.
- Artefacto `ecg_traza.npz` (numpy, sin pickle; lo lee la app, que no tiene wfdb): `fs`, `t0_s`, `senal` (float32,
  canal elegido, unidades físicas, primeros `traza_max_s` del segmento), `unidad`, `picos_r` e `picos_irregulares`
  (muestras relativas al inicio del segmento, todos), `ann_muestras`, `ann_simbolos`, `ritmo_inicio_s`, `ritmo_fin_s`,
  `ritmo_etiqueta`, `vent_t0_s`, `vent_t1_s`, `vent_marcada` (1/0/NaN).
- `options.prueba_carga_dummy`: señal sintética `nk.ecg_simulate` ⇒ `random_load_test=True` (NO es resultado).
- `inferencia_real=True` significa aquí "ejecución real del algoritmo sobre la señal entregada" (no hay red ni pesos).
