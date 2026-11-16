> 🌐 [Español](README_09_INSTALACION_CONFIGURACION_DESPLIEGUE.md) · **English**

# 09 · Installation, configuration and deployment

All commands in this document are the ones defined by the `package.json` files, the `.ps1` scripts and the repository code. They are run from the indicated folder. The examples use PowerShell; on macOS or Linux the same `npm` and `node` syntax is used.

## 1. Requirements

### 1.1 Hardware

| Use | Documented minimum |
|---|---|
| Backend, interfaces, simulation | Any computer with Node 22.6+ (no GPU) |
| Condition engine, ECG | CPU; no GPU or weights |
| Echocardiography models | NVIDIA GPU with a driver compatible with CUDA 12.x (reference: RTX 4050 Laptop 6 GB, driver 621.14); about 6.3 GB of weights; **at least 30 GB free** for the full installation |
| Smart shirt | ESP32 with BLE (firmware not tested on a board) |
| Gateway | Computer with Bluetooth LE |

### 1.2 Software

| Tool | Version | For |
|---|---|---|
| Node.js | **≥ 22.6** (uses `node:sqlite` and `--experimental-strip-types`) | Backend, simulation, tests |
| npm | The one bundled with Node | Running the scripts (there is no `npm install`: zero dependencies) |
| Python | **3.13** for the prototype app (`envs\app`); **3.11** for the model environments (created by `uv`) | Health prototype |
| uv | Included in `requirements-app.txt` | Creating the model environments |
| PyTorch | 2.5.1 + torchvision 0.20.1, cu124 wheels | Echo models |
| Python + `bleak>=0.22` | — | BLE gateway |
| openssl | Any version on the `PATH` | HTTPS link certificates and their 8 tests |
| Arduino IDE with ESP32 core (BLE) | — | Firmware |
| g++ | — | `esp32/test/test_trama.cpp` test |

To check Node:

```powershell
node --version
```

## 2. Installation

```powershell
git clone https://github.com/DinDevJ/lunna.git
Set-Location lunna
```

The backend and the simulation **do not require installing any dependencies**.

## 3. Running each service

### 3.1 Full demonstration (simulation mode)

```powershell
Set-Location .\Simulacion
npm start                 # backend de Sistema/ en modo simulación → http://localhost:8787
```

In another terminal, also inside `Simulacion`, you can launch the terminal-based telemetry generator:

```powershell
npm run generador
```

The database is `Simulacion/eva-simulacion.db`, which is ignored by git.

### 3.2 Operational mode

```powershell
Set-Location .\Sistema\backend
npm start                 # http://localhost:8787 · sin simulador ni escenario
```

The database is `Sistema/backend/eva.db`. Both modes use **port 8787**: stop one before starting the other.

Other backend scripts:

```powershell
npm run migrar                          # crea o actualiza el esquema de la base (BD o eva.db)
npm run evaluar -- --simulado           # corre el motor de padecimientos sobre la base
npm run evaluar -- --origen-simulador   # base que viene del simulador: se guarda con canal SIMULADO
```

`npm run evaluar` requires Python 3 with pandas. It uses `PYTHON` and `PROTOTIPO_DIR` if they are defined.

### 3.3 Spacecraft ↔ Earth HTTPS link

```powershell
Set-Location .\Sistema\backend
npm run certs             # certs/tierra.crt + tierra.key (autofirmado; --forzar regenera)
npm run tierra            # HTTPS :8443 (consola /tierra, /enlace/*)
npm run nave              # HTTP :8787 (UI, /nave) + cliente HTTPS hacia Tierra
```

`npm run tierra` and `npm run nave` are run in separate terminals. Without `BD`, each role uses its own database: `eva-tierra.db` and `eva-nave.db`.

### 3.4 BLE gateway

```powershell
Set-Location .\Sistema\pasarela
python -m pip install -r requirements.txt
python pasarela_ble.py --backend http://localhost:8787            # busca dispositivos EVA
python pasarela_ble.py --prueba                                   # sin hardware: tramas simuladas
python pasarela_ble.py --asignar 401=ana                          # asigna un dispositivo a un tripulante
python test_trama.py                                              # mismos bytes que el backend
```

### 3.5 Smart shirt firmware

Open `Sistema/esp32/playera_eva/playera_eva.ino` in the Arduino environment for ESP32. `#define SIMULAR 1` sends simulated readings; set it to `0` when real sensors are present.

To regenerate the test vectors with the backend's encoder:

```powershell
node --experimental-strip-types Sistema/esp32/test/generar_vectores.ts
```

### 3.6 Health prototype (Streamlit)

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass    # solo si PowerShell bloquea scripts
Set-Location .\prototipo-salud
.\scripts\instalar_app.ps1        # crea envs\app (Python 3.13) con requirements-app.txt
.\scripts\lanzar_app.ps1          # http://localhost:8501
.\scripts\verificar.ps1           # verificar.py + pytest
```

The first installation requires internet access. No weights or GPU are needed to explore the views.

**Installing and running a model** (one at a time; each one downloads several GB):

```powershell
.\scripts\instalar_modelo.ps1 -Modelo panecho        # venv Python 3.11 + torch cu124 + lock
.\scripts\descargar_pesos.ps1 -Modelo panecho        # -SoloMostrar para ver sin descargar
.\scripts\preparar_muestras.ps1                      # verifica sha256 de samples\
.\scripts\inferir.ps1 ...                            # ver ayuda del script; ECG CSV requiere -Fs
.\scripts\reparar_torch.ps1 -Modelo <modelo|todos>   # si torch.cuda.is_available() = False
```

Available models: `panecho`, `echonet_dynamic`, `medsam2`, `echoprime`, `echoclip` and `ecg`. The ECG model does not use torch or weights.

From the command line, from `envs\app`:

```powershell
python -m core.run_model --model panecho --input samples\echonet_dynamic_Example1.mp4 --subject S1
```

**Condition engine on the EVA database** (optional):

```powershell
Set-Location .\prototipo-salud
$env:EVA_DB = "..\Sistema\backend\eva.db"
.\envs\app\Scripts\python.exe -m motor.evadb --evaluar               # canal real
.\envs\app\Scripts\python.exe -m motor.evadb --evaluar --simulado
.\envs\app\Scripts\python.exe -m motor.evadb --evaluar --origen-simulador
```

**Regenerating derived data:**

```powershell
python -m motor.simulador                               # tripulación SIMULADA (datos/simulado/)
python sensores/generar_sintetico.py                    # ejemplos de sensores
python Planeacion/Leo/modelo-pesos/generar_pesos.py     # pesos.csv, pesos.json y Sistema/interfaces/eva/pesos.js
python Simulacion/donki/fetch_donki.py                  # eventos DONKI (requiere NASA_API_KEY en .env de la raíz)
```

## 4. Configuration

### 4.1 Backend environment variables

| Variable | Default | Use |
|---|---|---|
| `PUERTO` | 8787 (8443 in the Earth role) | HTTP port. `0` = ephemeral |
| `BD` | `eva.db` (operational) · `Simulacion/eva-simulacion.db` · `eva-nave.db` / `eva-tierra.db` (roles) | Path of the SQLite database |
| `MEDIBLES` | `Sistema/backend/semillas/medibles.json` | Clinical references |
| `APP_MOVIL` | `Sistema/interfaces/eva` | Folder served at `/app/` |
| `MODELO_SALUD` | `prototipo-salud/datos/modelo` | Condition CSVs that are seeded |
| `ROL` | — | `nave` or `tierra`, an alternative to the `rol.ts` argument |
| `TIERRA_URL` | `https://localhost:8443` | Link destination (spacecraft role) |
| `TIERRA_CA`, `TLS_CERT`, `TLS_KEY` | `certs/tierra.crt` and `certs/tierra.key` | Certificates |
| `PING_S` | 60 (15 is recommended) | Link heartbeat |
| `TIMEOUT_S` | 5 | Maximum time per request |
| `SIMULAR_OWLT` | — | `1` adds the modeled delay (`owlt_s`) before and after each HTTPS request. The demo backend uses 20 s by default; the mock-up scenario uses 18 min each way |
| `PROTOTIPO_DIR` (or `PROTOTIPO_SALUD`) | The repository's `prototipo-salud/` | Prototype folder for the engine and the models |
| `PYTHON` | `python` on Windows, `python3` elsewhere | Python for the app and the engine (e.g. `prototipo-salud\envs\app\Scripts\python.exe`) |
| `ENVS_DIR` (or `PROTOTIPO_ENVS_DIR`) | `<PROTOTIPO_DIR>/envs` | Model environments |
| `MUESTRAS_DIR` | `<PROTOTIPO_DIR>/samples` | Samples offered by the central computer |
| `MODELO_TIMEOUT_S` | `timeout_s` from the manifest; if missing, 1,800 s | Maximum time for a model |
| `MODELO_MARGEN_S` | 60 | Grace margin after which the spacecraft terminates the process tree (`taskkill /T /F` on Windows) |

### 4.2 Server arguments

```text
node --experimental-strip-types src/servidor.ts [--modo operativo|simulacion] [--simulacion <carpeta Simulacion/>]
```

`Simulacion/package.json` invokes it as `../Sistema/backend/src/servidor.ts --modo simulacion --simulacion .`.

### 4.3 Health prototype variables

| Variable | Use |
|---|---|
| `EVA_DB` | Path to `eva.db` for the engine bridge. If it does not exist, the engine uses `datos/modelo/overrides.json` |
| `PROTOTIPO_ENVS_DIR` | Alternative folder for the model environments (on Linux, for example, `/tmp/nasa-linux-envs`) |
| `NASA_API_KEY` | `api.nasa.gov` key, in the root `.env`, for `fetch_donki.py` |

**Example: analysis with models from the central computer** (PC with GPU, PowerShell):

```powershell
$env:PROTOTIPO_DIR = "C:\ruta\a\hackatonNASA\prototipo-salud"
$env:PYTHON        = "$env:PROTOTIPO_DIR\envs\app\Scripts\python.exe"
$env:ENVS_DIR      = "$env:PROTOTIPO_DIR\envs"
Set-Location C:\ruta\a\hackatonNASA\Sistema\backend
npm run certs        # solo la primera vez
npm run nave         # http://localhost:8787/app/central.html#semaforo → «Analizar con modelos»
```

Via the API:

```powershell
$b = @{ tripulante = "ana"; modelo = "ecg"; archivo = "ecg_fa_afdb04015.hea"; simulado = $true } | ConvertTo-Json
$t = Invoke-RestMethod -Method Post -Uri http://localhost:8787/api/modelos/analizar -ContentType "application/json" -Body $b
Invoke-RestMethod http://localhost:8787/api/modelos/trabajos/$($t.id)   # repetir hasta estado ok o error
```

### 4.4 Configuration files

| File | Content |
|---|---|
| `Sistema/backend/semillas/inicial.json` | Fictional crew, variables, schemas, devices and orbit priors (loaded idempotently at startup) |
| `Sistema/backend/semillas/medibles.json` | Clinical references and thresholds |
| `prototipo-salud/datos/modelo/*.csv` | The engine's sourced tables; **not to be edited** |
| `prototipo-salud/datos/modelo/overrides.json` | User changes; does not exist until the first edit |
| `prototipo-salud/.streamlit/config.toml` | App theme |
| `adapters/<modelo>/manifest.json` | Repository, weights, modalities, options, license and `timeout_s` of each model |
| `prototipo-salud/requirements-app.in` and `requirements-app.txt` | App dependencies (streamlit, pandas, numpy, opencv-python-headless, pydicom, pytest, uv) |

## 5. Ports

| Port | Service |
|---|---|
| 8787 | Backend (any mode) and spacecraft side of the HTTPS link |
| 8443 | Earth side of the HTTPS link |
| 8501 | Streamlit app of the health prototype |

## 6. Deployment

The project is designed for **local execution**. There is no container, system service or cloud configuration in the repository. Nor is it prepared to be exposed as a public service: CORS is open, there is no authentication and the certificate is a development certificate (see [security](README_10_SEGURIDAD_CONFIABILIDAD_RIESGOS.en.md)).

Recommendations for a demonstration installation:

- Run on a trusted local network.
- Back up `eva.db` with the backend **stopped** (WAL: also copy `-wal` and `-shm`, or stop it first).
- Do not put databases, `certs/`, weights or `.env` under version control.

## 7. Verifying operation

```powershell
Invoke-RestMethod http://localhost:8787/api/salud    # ok, version 0.7.0, modo, entorno
```

| Check | Expected |
|---|---|
| `http://localhost:8787/` | Self-refreshing status page; it says MODO SIMULACIÓN (simulation mode) or modo operativo (operational mode) |
| `/api/salud` | `"modo": "simulacion"` or `"operativo"` |
| `/app/config.js` | `window.EVA_CONFIG = {"modo":…}` |
| `/simulador` | 200 in simulation; 404 in operational |
| `cd Sistema/backend` and `npm test` | 97 tests; 85 passed and 12 skipped if openssl and the Python test environments are missing |
| `cd Simulacion` and `npm test` | 4 passed |
| `node --test Sistema/interfaces/eva/motor.test.mjs Sistema/interfaces/eva/alertas-motor.test.mjs` | 25 passed |
| `.\scripts\verificar.ps1` in `prototipo-salud` | `verificar.py` + pytest |

## 8. Troubleshooting common errors

| Symptom | Cause | Solution |
|---|---|---|
| `npm error enoent … package.json` | `npm start` run in `Sistema/` or in the root | Use `Simulacion/` or `Sistema/backend/` |
| `✗ El puerto 8787 ya está en uso` | Another backend is running | Close it (Ctrl+C) |
| `✗ el modo simulación necesita --simulacion <carpeta>` | `--modo simulacion` without the folder | Start with `cd Simulacion` and `npm start` |
| The interfaces say “Modo operativo” (operational mode) | The backend is running from `Sistema/backend` | Start it from `Simulacion/` |
| The gateway says “El backend … es una versión VIEJA” (“the backend … is an OLD version”) | Another, older backend is on the port | Stop it and start again |
| `torch.cuda.is_available() = False` after installing a model | uv resolved CPU torch | `.\scripts\reparar_torch.ps1 -Modelo <modelo>` |
| EchoNet-Dynamic: `UnpicklingError` | Weights with numpy scalars | Already fixed in `infer.py` |
| pytest: `No module named 'streamlit'` or `'cv2'` | The system Python was used | Use `envs\app` (created by `instalar_app.ps1`) |
| `POST /api/padecimientos/evaluar` returns 503 | Python or pandas cannot be found | Set `PYTHON` to the Python in `envs\app` |
| `POST /api/padecimientos/evaluar` returns 409 | In-memory database or evaluation in progress | Use a file-based database and wait for it to finish |
| PowerShell blocks the `.ps1` files | Execution policy | `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` |
| The 8 HTTPS tests are skipped | openssl is missing | Install openssl and add it to the `PATH` |

## Related documentation

- [User manual](README_03_MANUAL_USUARIO.en.md)
- [System architecture](README_04_ARQUITECTURA_SISTEMA.en.md)
- [Integration and interoperability](README_05_INTEGRACION_INTEROPERABILIDAD.en.md)
- [Testing and validation](README_08_PRUEBAS_VALIDACION.en.md)
