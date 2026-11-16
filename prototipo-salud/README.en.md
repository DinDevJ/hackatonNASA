> 🌐 [Español](README.md) · **English**

# Health prototype · models, ECG and conditions

Single guide for exploring the prototype and understanding its data, models, results and limits. All the necessary information —including the technical details of the models, installation, inputs, outputs, licenses, resources, algorithms and limits— is consolidated in this same README.

> **This is not a medical device or a diagnosis.** The thresholds of the condition engine are provisional and have not been validated in astronauts. The demonstration crew is synthetic. The public ECG samples come from hospital patients, not from astronauts.

## Open the interface

The app lets you review models and sensors, conditions and configuration. Exploring these views does not require installing model weights or having a GPU.

On Windows, open PowerShell from the repository root. If PowerShell blocks scripts, allow them to run for the current session only:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
Set-Location .\prototipo-salud
.\scripts\instalar_app.ps1
.\scripts\lanzar_app.ps1
```

Open [http://localhost:8501](http://localhost:8501). The first installation requires internet access. The full installation steps for each model are independent and download several GB; they are described in [Run models](#run-models).

## What it does

- Runs five echocardiography models through separate adapters and adds 1D ECG processing.
- Rejects incompatible modalities instead of converting or interpreting an input that the model does not accept.
- Imports sensors from CSV or JSON and lets you compare their measurements with those of the models.
- Keeps each run, its configuration, origin, errors and artifacts in `outputs/raw/<run_id>/`; normalizes the measurements in `outputs/normalized.csv`.
- Includes an experimental engine that compares a person's data with their own reference and presents a conditions traffic light.
- Keeps the **real** and **SIMULATED** channels separate. Missing values stay empty and are never converted to zero; people are not mixed and outputs from different models are not averaged.

There is no trained fusion network: the comparison view shows results side by side and the fusion component is a *stub*.

## How the analysis is organized

1. **Input validation:** modality, view and quality are checked. An incompatible input is rejected with a reason.
2. **Isolated execution:** each adapter is launched in its model's environment and records the configuration and the checkpoint used.
3. **Traceable output:** both the original results and the rows in the common format are saved; a test with random data is identified as a load test, not as inference.
4. **Condition engine:** applies a quality gate, compares against the available population and personal references, and keeps its two evidence channels separate. The personal pre-flight baseline is frozen; a guarded update and CUSUM look for sustained changes without directly absorbing alerted points.
5. **Traffic light:** shows GREEN, YELLOW, RED or GRAY with the reason and the calculation. GRAY means there is not enough evidence; no normality is invented.

The traffic light serves to prioritize a review, not to compute a diagnosis or a clinical probability. If there is not enough data or a reliable threshold, the result may remain GRAY.

## Models and data

| Component | Main input and output | Approximate weights / resources | Status and limits |
|---|---|---|---|
| **PanEcho** | 2D video; classification tasks and echocardiographic estimates. The model's probabilities are not calibrated. | 505 MB; ~2 GB of estimated VRAM. | One run was reported on the RTX 4050 PC: CUDA, 17.4 s. This is not clinical validation. Weights CC BY-NC-SA 4.0; code AGPLv3. |
| **EchoNet-Dynamic** | A4C echocardiographic video; estimates LVEF and left ventricular area in px². | 568 MB; ~3 GB of estimated VRAM. | The view must be declared as A4C. The repository license is contradictory and the weights have no explicit license: local use, no redistribution. |
| **MedSAM2** | 2D image or video with an initial box or mask; produces masks and areas in px². | 156 MB; ~1.5 GB of estimated VRAM. | Does not segment automatically without an initial prompt. Code Apache-2.0; weights CC BY-SA 4.0. |
| **EchoPrime** | Multi-view echocardiographic study; classification and retrieval of similar studies. | ~3.9 GB of weights; ~1.6–2 GB of estimated VRAM, plus RAM. | The retrieved results are not a report written for the current study. Academic/non-commercial license. |
| **EchoCLIP / EchoCLIP-R** | 2D video or image; computes similarity with text and *zero-shot* estimates. | ~1.2 GB; ~1.5 GB of estimated VRAM. | Similarity is not a probability. The most restrictive license among the sources consulted (academic) is applied. |
| **ECG** | WFDB record or CSV/TXT/TSV with a sampling rate; computes HR, HRV, PR, QTc and rhythm findings. | No weights or GPU; CPU. | Signal processing, not a trained model. The AF-compatible flag is **experimental and not diagnostic**. |

The VRAM estimates are not measurements. Together, the five echo families require about 6.3 GB of weights and independent environments; the full installation may need at least 30 GB of free space. The app environment uses Python 3.13; the model environments, Python 3.11. See the input, output, version and license details in the [complete model table](#complete-model-table) and in the technical sections of this same README, together with the `manifest.json` files in `adapters/`.

### Run models

Installing the interface does not install the environments or download the echocardiography weights. For inference, follow the **installation procedure and detailed commands in the technical document**, which include Windows requirements, GPU/driver, weight download and an example command for each adapter. Install and test the models one by one; do not download all of them if you only need to show the interface.

The complete output of each run is stored in `outputs/raw/`. To load public samples, review their licenses or confirm their provenance, see **samples/FUENTES.md**.

## The «Padecimientos» (Conditions) and «Configuración» (Settings) views

The engine includes 20 conditions and 350 condition-variable links. It uses the tables with sources stored in `datos/modelo/`; the Settings view lets you adjust weights and thresholds without overwriting those tables. User changes are saved in `datos/modelo/overrides.json` and are marked as modified by the user.

The synthetic crew contains five people and 30 days of data, with `simulated=true`; it is used to walk through the interface, not as real physiology. The app keeps its evaluations separate from those of real data. Configuration changes are saved in `datos/modelo/overrides.json`; local state and calibration, in `datos/estado/` and `datos/simulado/`. For details on persistence, installation of this update and the limits of each rule, see **NOTA-INSTALACION-PADECIMIENTOS.md** and **motor/DISENO.md**.

### Optional connection with EVA

The prototype can read and save evaluations in the EVA database. This integration is optional; the database and its schema are managed by Node:

```powershell
Set-Location .\prototipo-salud
$env:EVA_DB = "..\Sistema\backend\eva.db"
.\envs\app\Scripts\python.exe -m motor.evadb --evaluar
```

If the database has not yet been created or migrated, see **Sistema/backend/README.md**. The simulation database is separate and contains synthetic data; do not treat it as real records.

## Reported results and limits

- **Echocardiography:** the progress log reports one real PanEcho inference on the development PC. The other echo inferences remain pending validation on that PC; load tests with random weights are not results.
- **ECG:** it was run on CPU over public MIT-BIH records. For R-peak detection, the progress log reports sensitivity 0.999/1.000/0.919 and PPV 1.000/0.972/0.989 on three records. The irregularity rule detects RR irregularity, not AF: its specificity varied widely across records. PR and QTc were not validated.
- **Inspiration4:** public laboratory results from four participants were analyzed. There are only three pre-flight draws and no in-flight blood in those files; the normal configuration stays GRAY when there is not enough data for a personal baseline. An experiment that completes the baseline with SIMULATED data is not validation and does not demonstrate clinical efficacy.
- **Software tests:** **AVANCE.md** reports 98 tests passed and 5 skipped on Linux. This must not be interpreted as certification, clinical validation or testing on Windows.
- **General limits:** small samples, model outputs that depend on their training data, provisional thresholds and no validation in astronauts. Do not use for diagnosis, treatment or mission decisions.

## Sources and references

- NASA OSDR: [OSD-569](https://osdr.nasa.gov/bio/repo/data/studies/OSD-569) and [OSD-575](https://osdr.nasa.gov/bio/repo/data/studies/OSD-575), open laboratory data from Inspiration4. They do not include the HR/HRV/SpO₂ signals from the watch.
- PhysioNet: provenance, licenses and citations of the ECG samples in **samples/FUENTES.md**.
- Dash et al. (2009), experimental irregularity method: [doi:10.1007/s10439-009-9740-z](https://doi.org/10.1007/s10439-009-9740-z).
- Jones et al. (2024), [Nature](https://doi.org/10.1038/s41586-024-07648-x); Kim et al. (2024), [Nature Communications](https://doi.org/10.1038/s41467-024-49211-2). They are cited as context for the Inspiration4 data, not as validation of the engine.
- The repositories, licenses and requirements of each model are in the [complete model table](#complete-model-table) and in the `manifest.json` files in `adapters/`.

## Index of the consolidated technical documentation

This README contains the purpose, the commands, the complete specifications and the traceability. The names in the table identify the historical sources of the content; it is no longer necessary to open any external document.

| Document | Content it provides |
|---|---|
| **AVANCE.md** | Implemented milestones, run status, ECG metrics and reported checks. |
| **CONTRATO.md** | Contract between adapters, runner, sensors, common format and execution. |
| **ENTORNO.md** | Development environment and differences between the Linux machine and the target Windows PC. |
| **MODELOS.md** | Installation/inference commands, input parameters and ECG details. |
| **MODELOS-TABLA.md** | Detailed table of weights, inputs, outputs, licenses and resource estimates. |
| **NOTA-INSTALACION-PADECIMIENTOS.md** | Installation and use of the Padecimientos (Conditions) and Configuración (Settings) views. |
| **validacion/README.md** | Scope and results of the test with public Inspiration4 data. |

---

# Consolidated repository documentation

This README also contains the complete content of the Markdown documents that existed in the repository. The path shown in each heading identifies the historical origin of the text; the original documents were removed to keep a single Markdown file.

## Main documents

- [General planning](../documentacion/README_01_PLANEACION.en.md): operational plan of the project, structure, phases, acceptance criteria and risks.
- [User manual](../documentacion/README_03_MANUAL_USUARIO.en.md): manual for walking through the LUNNA mock-up and its interfaces.
- [Research protocol](../documentacion/README_02_PROTOCOLO_INVESTIGACION.en.md): objectives, variables, model, sources, limits and traceability of the research.


## Consolidated document: `Planeacion/Julio/backend/ENLACE-HTTPS.md`

> Original source: `Planeacion/Julio/backend/ENLACE-HTTPS.md`

# HTTPS link spacecraft ↔ Earth

Real transport (TLS) between two processes of the same backend. All the demo data are SIMULATED.

## How to run it
```
npm run certs      # certs/tierra.crt + tierra.key (autofirmado, desarrollo; --forzar regenera)
npm run tierra     # HTTPS :8443  (consola /tierra, /enlace/*)
npm run nave       # HTTP  :8787  (UI, app, /nave) + cliente HTTPS hacia Tierra
```
Variables: `BD`, `PUERTO` (0 = ephemeral; prints `PUERTO=<n>`), `TIERRA_URL` (default `https://localhost:8443`), `TIERRA_CA`, `TLS_CERT`, `TLS_KEY`, `PING_S` (default 60), `TIMEOUT_S` (default 5), `SIMULAR_OWLT=1`.
Status: `GET /api/enlace/estado` (spacecraft and Earth). Code: `src/sincro.ts` (protocol), `src/enlace-https.ts` (transport).

## Algorithm
- Each side has its own output queue (outbox): `bajada` (spacecraft→Earth) and `subida` (Earth→spacecraft). Each message carries `(emisor, seq)`, with seq monotonic per sender.
- Batches by priority and then seq; the JSON body is sent with `x-eva-sha256`. If it does not match: 422 and nothing is applied.
- The receiver stores each `(emisor, seq)` only once (UNIQUE in `entrada`); inbox + application in a single transaction. Resends = ignored duplicates.
- Cumulative ACK (1..n complete) + selective ACKs; the sender marks `ack=1`. Anything unconfirmed is automatically re-included in the next batch: resumption starts from what is pending.
- Failure of any request (timeout, network, status ≠ 200) → immediate DISCONNECTED and retry with exponential backoff with jitter (base 1 s, cap = `PING_S`).
- Effect: at-least-once in the transport + idempotence = exactly-once.

## Times and channels
- `t_evento` (when it happened), `t_envio` (batch departure), `t_recepcion` (applied at the receiver); age = now − t_evento.
- Earth→spacecraft notices: `subida`. Spacecraft→Earth notices: `bajada` of type `aviso` (`POST /api/nave/avisos`). Data: `alerta`, `resumen`, `crudos`, `evaluacion`, `acuse`.

## Heartbeat
Default 60 s; `PING_S=15` is recommended. Outage detection latency ≤ `PING_S` + `TIMEOUT_S` (batch failures are seen instantly). A GET with keep-alive costs almost nothing. Below ~10 s with `TIMEOUT_S=5`, the risk of false DISCONNECTED states due to jitter increases.
With a real Mars link (RTT of 8 to 48 min), a heartbeat of seconds only models the terrestrial segment: the window and the delay govern (`SIMULAR_OWLT=1` adds owlt before and after each request). Closed window = store and forward, no traffic.

## Limits
- Server TLS only, with a self-signed development certificate: there is no authentication of the spacecraft to Earth (`x-eva-emisor` is informational, not a credential) and no encryption of the databases.
- One spacecraft and one Earth; no certificate rotation or rate limits. The keys live in `certs/` (ignored by git); they are not versioned.
- Resumption at batch level, not byte level.

<!-- END OF CONSOLIDATED DOCUMENT: Planeacion/Julio/backend/ENLACE-HTTPS.md -->

## Consolidated document: `Planeacion/Julio/backend/MODELOS-CENTRAL.md`

> Original source: `Planeacion/Julio/backend/MODELOS-CENTRAL.md`

# Echo and ECG models from the central computer

The central computer (**Semáforo** tab → «Analizar con modelos» card) launches a `prototipo-salud` model on a sample,
saves in `eva.db` what the engine knows how to use and re-evaluates the traffic light. **None of this is a diagnosis.**

## Flow

1. `POST /api/modelos/analizar {tripulante, modelo, archivo, simulado, vista?, prueba_carga?}` → **202** with the job (`en_cola`).
2. The spacecraft launches (asynchronous, `child_process.spawn`, one job at a time per model, in-memory queue):
   `PYTHON -m core.run_model --model <m> --input <muestra> --subject <tripulante> --timeout <T> …` with cwd = `PROTOTIPO_DIR`.
   `core.run_model` is the runner (stdlib, the app's python) and it launches the adapter with the **python of the model's venv**
   (`<ENVS_DIR>\<modelo>\Scripts\python.exe` on Windows, `bin/python` on Linux), just like `core/registry.py`.
3. If the run is `ok`/`prueba_carga`: `PYTHON -m motor.puente_modelos --db eva.db --run-dir … --tripulante … --modelo … --archivo … [--simulado]`
   - echo (echonet_dynamic, panecho, echoclip, echoprime) → LVEF in `muestras` (01:V18, `modelo_eco`, N4) with `evadb.guardar_muestra_eco`.
   - ECG (`ecg`, NeuroKit2) → metrics mapped by the existing quality gate (`calidad.puerta`) to 04:A4, 03:V17, 01:V34,
     01:V35, 01:V32, 01:V31; only those that are decisive are saved (`modelo_ecg`). Without a sourced link in `padecimiento_variable`
     → it is saved and marked **EXPERIMENTAL** (no links or weights are invented). SDNN and the fraction of windows are informational.
   - Load test (random tensor / no weights) → nothing is saved; label «PRUEBA DE CARGA — no es resultado» (LOAD TEST — not a result).
4. If something was saved: `python -m motor.evadb --evaluar` (the same path as «Evaluar» in the central computer) and the job shows
   the traffic light before → after. With **SIMULATED**, the real channel ignores the data point (G1): the real traffic light does not change.
5. `GET /api/modelos/trabajos/:id` (and `GET /api/modelos/trabajos`): `estado` en_cola/corriendo/ok/error, `fase`, times,
   summarized output, bridge result, traffic-light changes and error. Jobs live in memory (max. 50); the data
   remain in `eva.db` and in `prototipo\outputs\raw\<run_id>\`.
6. `GET /api/modelos/disponibles`: models (manifests from `adapters\`) and samples (videos and `.hea` in `MUESTRAS_DIR`, without
   subfolders). The `archivo` must be a name from that list: `..`, paths, absolute paths and links that point outside → 400.

## Variables

| Variable | Default | Use |
|---|---|---|
| `PROTOTIPO_DIR` | `..\..\..\prototipo-salud` (from the backend); also reads `PROTOTIPO_SALUD` | prototype root |
| `PYTHON` | `python` (Windows) / `python3` | the app's python: runner, bridge and engine |
| `ENVS_DIR` | `PROTOTIPO_ENVS_DIR` or `<PROTOTIPO_DIR>\envs` | model venvs (passed as `PROTOTIPO_ENVS_DIR`) |
| `MUESTRAS_DIR` | `<PROTOTIPO_DIR>\samples` | samples offered by the central computer |
| `MODELO_TIMEOUT_S` | `timeout_s` from the manifest; if missing, **1800 s** | maximum model time |
| `MODELO_MARGEN_S` | 60 | the spacecraft kills the process tree (`taskkill /T /F`) at timeout + margin → status `error` |

## Iker's PC (Windows, PowerShell)

Prerequisites (already existing in `prototipo`): `scripts\instalar_app.ps1` (creates `envs\app`), `scripts\instalar_modelo.ps1 -Modelo <m>`,
`scripts\descargar_pesos.ps1 -Modelo <m>` and `scripts\preparar_muestras.ps1` (echo videos in `samples\`).
Adjust `$REPO` if the hackatonNASA clone is in another folder.

```powershell
$REPO = "C:\Users\ikerc\Desktop\nasa-salud-espacial\hackatonNASA"
$env:PROTOTIPO_DIR = "C:\Users\ikerc\Desktop\nasa-salud-espacial\prototipo"
$env:ENVS_DIR      = "$env:PROTOTIPO_DIR\envs"
$env:PYTHON        = "$env:PROTOTIPO_DIR\envs\app\Scripts\python.exe"
# opcional: $env:MUESTRAS_DIR = "$env:PROTOTIPO_DIR\samples"

cd "$REPO\Planeacion\Julio\backend"
npm run certs        # solo la primera vez (la nave exige certs\tierra.crt)
npm run nave         # http://localhost:8787
```

Open the central computer: <http://localhost:8787/app/central.html#semaforo> → **Analizar con modelos** card (it sits below the crew and the conditions; it starts collapsed and the browser remembers whether you left it open).

- **ECG**: «Analizar ECG» → crew member → ECG model (NeuroKit2) → sample `ecg_fa_afdb04015.hea` → leave **SIMULADO** checked
  (the MIT-BIH samples do not belong to the crew member) → «Analizar». To see the traffic light move in a demo, uncheck SIMULADO
  knowing that it will be saved as real data for that crew member.
- **Echo**: «Analizar eco» → EchoNet-Dynamic model → `echonet_dynamic_Example1.mp4` → **A4C** view → «Analizar». Without weights,
  check «Prueba de carga (sin pesos)» (load test, no weights): nothing is saved and it is labeled PRUEBA DE CARGA (LOAD TEST).

Via the API (another PowerShell terminal):

```powershell
$b = @{ tripulante = "ana"; modelo = "ecg"; archivo = "ecg_fa_afdb04015.hea"; simulado = $true } | ConvertTo-Json
$t = Invoke-RestMethod -Method Post -Uri http://localhost:8787/api/modelos/analizar -ContentType "application/json" -Body $b
Invoke-RestMethod http://localhost:8787/api/modelos/trabajos/$($t.id)   # repetir hasta estado ok/error
```

## What was tested and what is missing

- Linux without GPU (`npm test`, `pytest`): fake python that emits the real `core.run_model` format; real bridge and engine
  with the app's venv; **real** end-to-end ECG (NeuroKit2, `/tmp/nasa-linux-envs/ecg`). Smoke test with the spacecraft
  running: ECG `ecg_fa_afdb04015` → P01 GRAY → YELLOW in a temporary database.
- **Still to be validated on the GPU PC**: real run of EchoNet-Dynamic/PanEcho/EchoCLIP/EchoPrime with weights and CUDA (times
  against the 1800 s timeout; EchoPrime 3600 s), real LVEF → sample 01:V18; `taskkill /T /F` killing the process tree when
  the time runs out (written, not executed on Windows); paths with spaces; the UI in the browser (ES/EN).

<!-- END OF CONSOLIDATED DOCUMENT: Planeacion/Julio/backend/MODELOS-CENTRAL.md -->

## Consolidated document: `Planeacion/Julio/backend/README.md`

> Original source: `Planeacion/Julio/backend/README.md`

# EVA · Central computer + LUNNA

Receives frames from any device, attributes them to the correct crew member, stores them,
and gives notice when a vital sign departs from **what is expected for that person in that environment**.

**LUNNA** — *Live-telemetry Updating Network for Nominal-deviation & Anomalies* — is the
model that defines "what is expected".

```bash
npm start      # servidor; http://localhost:8787 = estado · /simulador = simulador visual
npm run sim    # simulador de hardware: 119 días de misión y luego en vivo
npm test       # 37 pruebas
```

Requires **Node 22.6+** and nothing else: SQLite and TypeScript are built into Node.
**Zero dependencies**, so there is no `npm install`.

---

## Architecture

```
 playera (ESP32) ─┐  binaria, perfil EVA, BLE directo
 brazalete ───────┤
 simulador ───────┘
                 ┌──────────────────── COMPUTADORA CENTRAL ────────────────────┐
 reloj ───┐ JSON │  dispositivo → tripulante → decodificar → fórmula → validar │
 celular ─┘      │       (tabla de asignaciones)   (esquema)                   │
                 │                         │                                   │
 semillas ──────►│                    SQLite ──► LUNNA ──► alerta              │
 (Leo, Iker)     └─────────────────────────┬───────────────────┬───────────────┘
                                           │                   │
                               REST + eventos en vivo     cola para Tierra
                                    (Fany)                (rojo primero)
```

---

## Contracts per team

### Fany · central interface

| For | Call |
|---|---|
| See everything live | `GET /api/stream` — events `muestra`, `alerta`, `rechazo` (SSE) |
| Current crew status | `GET /api/estado` |
| Chart of a variable | `GET /api/muestras?tripulante=ana&variable=04:A4&desde=…` |
| Prediction and expected band | `GET /api/prediccion/ana` |
| **Everything for one crew member, already evaluated** (used by the phone and the central computer) | `GET /api/app/:tripulante` — per variable: last value, median, expected value, band, z, `estado`, `motivo`, clinical threshold, 14-day series; plus their alerts and notices |
| Reference clinical thresholds | `GET /api/referencias` (from `semillas/medibles.json`) |
| LUNNA window (demonstrations only) | `GET/PUT /api/lunna/ventana` `{ minutos }` — 1440 in mission |
| Alerts | `GET /api/alertas` |
| Edit variables · schemas · devices | `GET/POST /api/variables` · `/api/esquemas` · `/api/dispositivos` |
| Crew members, baselines and history | `GET/POST /api/tripulantes` · `PUT …/:id/basales` · `POST …/:id/historial` |
| Put on a device | `POST /api/asignaciones` `{ dispositivo, tripulante }` |
| Mission phases | `GET/POST /api/fases` `{ desde, entorno }` |
| Link with Earth | `GET/PUT /api/enlace` `{ owlt_s, abierto }` |
| What has reached Earth | `GET /api/tierra/bandeja[?tipo=resumen\|alerta\|crudos\|acuse\|consulta\|emergencia]` (with the age of each item) |
| Earth sends a notice | `POST /api/tierra/avisos` `{ para, texto, prioridad }` |
| Earth sends a manual alert | `POST /api/tierra/avisos` `{ tipo: "alerta", nivel: "ambar"\|"rojo", para, variable?, texto }` |
| Mission control console | `GET /tierra` |
| Notices that have already reached the spacecraft | `GET /api/avisos` |
| The CMO sends a notice to a crew member (on board, no delay) | `POST /api/abordo/avisos` `{ para, texto, nivel?: "ambar"\|"rojo", de? }` · `GET /api/abordo/avisos` |
| The central computer consults Earth (downlinked) | `POST /api/central/consultas` `{ sobre?, texto, nivel?, de? }` → `consulta` package in the inbox |
| The phone records an emergency | `POST /api/emergencias` `{ tripulante, modo: "SOS manual"\|"automático", causa?, disparadores? }` · `PUT /api/emergencias/:id` `{ resultado }` · `GET /api/emergencias[?tripulante=]` → `emergencia` package (priority 0) |

Events of `/api/stream`: `muestra`, `alerta`, `rechazo`, `tierra` (something reached Earth),
`aviso` (a notice from Earth reached the spacecraft, or one from the CMO with `origen: "abordo"`), `enlace` and
`emergencia` (an emergency was opened or closed). The on-board logic lives in `src/abordo.ts`.

```js
const es = new EventSource('http://localhost:8787/api/stream');
es.addEventListener('alerta', (e) => mostrar(JSON.parse(e.data)));
```

Each prediction carries `pesos: { poblacion, historial, vuelo }`: it is the
**"where does this come from?"** button, already computed.

### Katia and Diana · intermediate devices

Phone or watch forward via `POST /api/tramas` (one frame or a list):

```json
{
  "frame": "eva.telemetry.v1",
  "source": { "id": "reloj-ana", "kind": "wrist" },
  "subject": "ana",
  "t_scet": "2027-03-18T07:42:09Z",
  "seq": 10452,
  "samples": [
    { "var": "04:A4", "value": 75, "unit": "bpm", "origin": "sensor", "quality": { "contacto": true } }
  ]
}
```

- `source.id` must be registered as a device (`perfil: "json"`).
- `t_scet` is when it **happened**, not when it is sent.
- `subject` is a fallback: if the device is assigned, **the assignment governs**.
- `quality.contacto: false` → it is stored, but LUNNA does not evaluate it.
- `origin: "estimated"` without `method` or `quality.ic95` → **it is rejected**.

### Leo and Iker · seeds

- **Data:** `POST /api/semillas` with their `SalidaTipo` as is
  (`Planeacion/Leo/ingesta/src/contrato.ts`). Missing variables and subjects are registered automatically.
- **Priors for LUNNA:** `PUT /api/priores`, one per variable and environment:

```json
{ "variable": "01:V1", "entorno": "orbita", "escala": "relativa",
  "mu0": -0.067, "tau0": 0.05, "sigma_mision": 0.03, "sigma_dia": 0.05,
  "extrapolado": false,
  "fuente": "cat.01 V1: media 24 h sistólica −8 ± 2 mmHg (n = 8)" }
```

`mu0` is the mean change (relative: −0.067 = −6.7%; absolute: units). **A prior
without `fuente` is rejected.** What we need from them: the final variables and, for
each one, `mu0` and `tau0` with their source. Today almost all of them are provisional.

### Hardware · EVA binary profile

What the ESP32 of the smart shirt, the cuff and the simulator send, little-endian:

```
┌ cabecera, 13 B ──────────────────────────────────────┬ carga ────────────────┐
│ ver u8 │ id_disp u32 │ id_esquema u16 │ seq u16 │ t_scet u32 │ según esquema │
└──────────────────────────────────────────────────────┴───────────────────────┘
```

`POST /api/tramas/binaria` with the raw body, or `{ "b64": "…" }`, or
`{ "b64": ["…", "…"] }` in a batch. `src/esquema.ts` provides `codificar()` and `decodificar()`:
the firmware only has to replicate `codificar()`.

---

## Add a new sensor

What you asked for: put a sensor in the suit and declare it from the interface, without touching
code.

```bash
# 1. La variable: nombre, descripción, unidad
POST /api/variables
{ "id": "X:TPIEL", "nombre": "Temperatura de piel", "unidad": "°C",
  "descripcion": "Termistor en el pecho del traje", "procedencia": "sensor" }

# 2. La trama: dónde llega, de qué tipo, y la fórmula
POST /api/esquemas
{ "nombre": "traje-v1", "campos": [
    { "clave": "fc",    "variable": "04:A4",   "tipo": "u8" },
    { "clave": "tpiel", "variable": "X:TPIEL", "tipo": "u16", "formula": "x / 100 - 40" } ] }
# → responde con un id nuevo: el esquema viejo sigue decodificando las tramas viejas

# 3. El dispositivo pasa a usarlo
POST /api/dispositivos  { "id": 102, ..., "esquema_id": <id nuevo> }
```

**Formulas.** Arithmetic, `sqrt abs log log10 exp round floor ceil min max pow`, and other
fields of the same frame by their key: `(sis + 2 * dia) / 3`. A field **without a type** is
virtual: it takes up no bytes and comes only from its formula. **`eval` is never used**: it is a
custom interpreter that rejects everything else, and the formula is validated when saved, not when
received. Variables added by the team use the `X:` prefix.

---

## LUNNA

Bayesian updating in three layers. Each one is weighted according to how much evidence it provides:

| Layer | Source | Example |
|---|---|---|
| ① Population prior | Literature (Iker's catalogs) | Systolic BP −6.7% in orbit |
| ② Personal history | Imported previous missions | "On Artemis their HR dropped 10%" |
| ③ Calibration | Their first 14 days in the environment | Daily median of each day |

Without the person's own data, the literature governs; with a previous mission, their history; after
calibration, their data. **The prediction always carries its 95% band**, and each alert its
`prob_nominal`: the probability of seeing that deviation if the person remained normal.

### Two criteria, the worse one governs

| Criterion | What it compares | What for |
|---|---|---|
| **Personal** (LUNNA) | 24 h median against what is expected for **that** person in that environment | Slow drifts that a generic range does not see (fatigue, deconditioning) |
| **Clinical threshold** | Median of the last 5 valid samples (≤ 10 min) against the limit in `semillas/medibles.json` | Acute events: an SpO₂ of 87% is serious even if it is "normal for you". It also applies during calibration |

Each alert states its `motivo`: `personal`, `umbral` or `ambos`, and, if a threshold was involved, which one and from what source.
The vital-sign thresholds in Iker's catalog are **[T] terrestrial clinical thresholds**: no public
NASA table was found for them. Traceability, data point by data point, in **`semillas/medibles.md`**.

⚠️ **Demonstration mode.** With 24 h, an anomaly triggered in a demo lasting minutes takes a long time to move the
median, and the return to green is not seen. When switching to «En vivo» (Live), the simulator shortens the window to 5 min and
announces it (`modo mision` in the PC terminal returns it to 24 h). `/api/salud` and the status page
always state which window is active.

Relationship with the notebook's Bayes formula, the ESP32 firmware and the Bluetooth gateway: `INTEGRACION.md`,
in the `planeacion-archivo` tag (`git checkout planeacion-archivo -- Planeacion/Julio/INTEGRACION.md`).

### Result with the simulator

4 crew members · 7 variables · 119 days · 6,188 binary frames:

- Prediction of Ana's HR: **57.4 bpm** (real simulated response: −8%, predicted −7.6%)
- Weights: literature **1%** · history **11%** · flight **88%**
- **2 alerts, both true**: her fatigue, amber on day 111 and red on day 112 (z = 3.34)
- **Zero false positives** in the rest of the crew

⚠️ **Synthetic** data, with the scenario written on purpose. It demonstrates that the pipeline
works; it does not validate the model against real people.

---

## Design decisions

| Decision | Why |
|---|---|
| **The crew member is not in the frame** | The device does not know who is wearing it. Suits are reused: if the ID is hard-coded, the vital signs get attributed to someone else. The assignments table solves this, with a time interval |
| **Calibration is frozen at 14 days** | If it kept learning, a slow drift such as fatigue would be absorbed as "their new normal" and would never trigger |
| **The 24 h median is evaluated** | The Smart Fusion validation showed that the instantaneous value barely outperforms a constant; the aggregate does carry signal |
| **Only state changes generate an alert** | Without this, every out-of-band sample would be a new alert |
| **Blood type does not enter the model** | There is no evidence that it predicts adaptation. It is stored in the profile, with zero weight |
| **Moon, transit and Mars are marked as extrapolated** | There are no human data. They are derived from orbit with doubled uncertainty |
| **Editing a schema creates a new version** | Old frames must still be readable with the schema they were sent with |

---

## Conditions traffic light (20-condition engine)

Reads the evaluations written by the Python engine in `prototipo-salud/` (20 conditions, 350 links) and lets you edit their weights. It is **different** from Leo's "per-condition index" (`pesos.js`, 11 ailments). Provisional: this is not a diagnosis; the rows of the synthetic crew carry the `SIMULADO` channel.

| Route | What it does |
|---|---|
| `GET /api/padecimientos/semaforo[?tripulante=ID]` | The 20 colors per crew member (GRAY if there is no evaluation), with `vacio` and `como_poblar` |
| `GET /api/padecimientos/semaforo/:tripulante/:padecimiento` | Evaluation and breakdown per variable (source weight, user weight, effective weight, contribution) |
| `GET /api/padecimientos/referencias?tripulante=ID[&variable=VID]` | Normal value per variable stored by the engine in its last evaluation (range, source, personal baseline; `SIMULADO` if applicable) |
| `GET /api/padecimientos/pesos[?padecimiento=P07]` | Weights per link, range [0, 3] and changed thresholds |
| `PUT /api/padecimientos/pesos` | `{padecimiento_id, variable_id, peso?, prior_de?}` or `{umbral, valor}` |
| `POST /api/padecimientos/pesos/restaurar` | `{}` (everything), `{padecimiento_id[, variable_id]}` or `{umbral}` |
| `POST /api/padecimientos/evaluar` | `{simulado?: boolean, origen_simulador?: boolean}`: runs the engine (409 if the database is in memory or the engine is already running; 503 without Python) |

Changed weights are applied in the **next evaluation**. To populate `evaluaciones` (requires `eva.db` as a file and Python 3 with pandas):

```
npm run evaluar -- --simulado            # o --db ruta; por defecto BD o eva.db
npm run evaluar -- --origen-simulador    # eva.db viene de `npm run sim`: se evalúa igual, se guarda con canal SIMULADO
cd prototipo-salud && EVA_DB=<ruta a eva.db> python3 -m motor.evadb --evaluar [--simulado]
curl -X POST localhost:8787/api/padecimientos/evaluar -d '{"simulado": true}'
curl -X POST localhost:8787/api/padecimientos/evaluar -d '{"origen_simulador": true}'
```

Optional environment variables: `PYTHON`, `PROTOTIPO_SALUD`.

## Files

```
src/formula.ts     intérprete de fórmulas seguro
src/esquema.ts     perfil EVA: cabecera, esquemas, codificar y decodificar
src/lunna.ts       el modelo
src/db.ts          esquema de la base de datos
src/ingesta.ts     tubería: asignación, decodificación, guardado y vigilancia
src/semillas.ts    configuración inicial e importación del contrato de Leo
src/enlace.ts      enlace con Tierra: retraso de la luz, ventanas y avisos de vuelta
src/servidor.ts    API REST y eventos en vivo
src/semaforo.ts    semáforo de padecimientos, pesos del usuario y ejecución del motor Python
src/evaluar-salud.ts  npm run evaluar
src/simulador.ts   simulador de terminal: 4 tripulantes, 119 días
web/simulador.html simulador visual (astronauta, dispositivos, PC central, Tierra) en /simulador
                   el PC abre la computadora central de LUNNA (/app/central.html, de
                   Leo/maqueta-eva), que lee /api/app, /api/alertas, /api/enlace y /api/stream
                   y el reloj abre el de Fani (/reloj → /maquetas/Fani/maqueta-reloj/),
                   con pulso y SpO₂ en vivo de /api/stream
semillas/inicial.json   tripulación, esquemas y priores PROVISIONALES
```

## Pending

- **Real priors** from Leo and Iker: today most of them are non-informative and say so
- **Fusion** when two devices measure the same thing (suit and watch): today both are stored
- **Assignment cross-check**: if the suit and watch of the same crew member disagree widely, warn of a possible wrong assignment
- **Translate standard Bluetooth profiles** (heart rate, blood pressure) in the gateway, to accept commercial watches and cuffs
- **Hysteresis** in the alerts so that they do not oscillate amber–green near the threshold

## Credits

Photo of Earth in the simulator: *Blue Marble*, taken by the Apollo 17 crew
on December 7, 1972 (NASA, public domain). Downloaded from the NASA page
"Blue Marble - Image of the Earth from Apollo 17" (www.nasa.gov) and embedded in
`web/simulador.html` so that the mock-up works without internet.

<!-- END OF CONSOLIDATED DOCUMENT: Planeacion/Julio/backend/README.md -->

## Consolidated document: `Planeacion/Julio/backend/semillas/medibles.md`

> Original source: `Planeacion/Julio/backend/semillas/medibles.md`

# Measurable variables by sensor: what the catalog says

Team Monarcas · 2026-11-15 · Data: [`medibles.json`](../Sistema/backend/semillas/medibles.json) (loaded by the backend at startup)

The seven variables that the system receives from sensors (smart shirt, watch, cuff), with what
the repo's research catalogs say about each one.

**How to read it**

- **Nothing is from memory.** Every number comes from a file in the repo, and the "Where it
  comes from" column says which one and in which row. What is not in the catalog is marked **not found**.
- **[A]** = NASA threshold or validated in astronauts · **[T]** = terrestrial clinical, not
  validated in microgravity. **All vital-sign thresholds are [T]**: the catalog
  did not find any public NASA table for them.
- **The system does not diagnose.** It points out what to monitor and which conditions a
  deviation points to; the interpretation belongs to the flight surgeon.
- The absolute thresholds **complement** the comparison with the person's own baseline (LUNNA);
  they do not replace it. The catalog asks for exactly that: "use the crew member's own baseline".

Source abbreviations: **VMA** = `VARIABLES-MEDIDAS-ASTRONAUTAS.csv` · **PV** =
`PADECIMIENTO-VARIABLE.csv` · **cat. 01 / 03 / 04** = files in `variables-diagnostico/`
(with line number) · **index** = `variables-diagnostico/00-indice-priorizado.md`.

> The two CSVs are still in `Planeacion/`. The `variables-diagnostico/` folder was removed from the tree to keep
> only what runs; it is intact in the `planeacion-archivo` tag:
> `git checkout planeacion-archivo -- Planeacion/variables-diagnostico`

---

## 1. Who has measured it in flight and how we measure it

All seven are listed as **"yes in flight"** in the catalog.

| Variable (id) | Real in-flight equipment | Here | Where it comes from |
|---|---|---|---|
| Heart rate (`04:A4`), bpm | ISS: ALSP automatic cuff (40–200 bpm, ±5%), Polar Heart Rate Monitor 2 (continuous during exercise), BP/ECG, CSA Bio-Monitor (shirt, since Dec 2018). At rest: Holter/ECG. Orion: ECG in the medical kit | Smart shirt with ECG and watch with PPG | VMA row 310 · cat. 04 A4 (l. 27) and table B.1 · VMA row 4 (`01:V3`) |
| SpO2 (`04:A3`), % | Pulse oximeter in the ISS kit (ALSP/AMP), Bio-Monitor. Orion: pulse oximeter in the kit; the value "can be entered manually". Range and accuracy: not found | Watch with red/infrared PPG | VMA row 309 · cat. 04 A3 (l. 26) and B.1 |
| Respiratory rate (`04:A2`), resp/min | Bio-Monitor (respiratory rate and volume); manual count; ECG + respiratory sensor | Chest band of the smart shirt | VMA row 308 · cat. 04 A2 (l. 25) |
| Body temperature (`04:A1`), °C | Disposable oral and skin thermometers from the kits (ISS AMP; Shuttle); heat-flux sensor on the forehead (Thermolab, ESA/DLR, research); Bio-Monitor: skin temperature | Axillary thermometer of the smart shirt | VMA row 307 · cat. 04 A1 (l. 24) and B.1 |
| Systolic (`01:V1`) and diastolic (`X:PAD`) pressure, mmHg | ISS: 24 h ambulatory recording with portable equipment; ALSP oscillometric cuff (20–280 mmHg, ±3 mmHg or 2%); BP/ECG; Bio-Monitor. Orion: can be noted down manually | Oscillometric cuff | VMA row 2 · cat. 01 V1 (l. 31) · cat. 04 A5 (l. 28, merged) |
| Mean pressure (`X:PAM`), mmHg | No equipment or row of its own: it is obtained from systolic and diastolic pressure | Calculated: (sys + 2·dia)/3 | cat. 01 V1 (l. 31) · VMA row 7 (`01:V6` uses mean BP) |

The ISS kit inventory comes from the 2011 CHeCS hardware catalog, which
cat. 04 itself describes as an "old inventory, partly already replaced".

---

## 2. Thresholds

| Variable | Amber | Red | Type | Source cited by the catalog | Where it comes from |
|---|---|---|---|---|---|
| Heart rate | > 100 bpm at rest | not found | [T] | Range 60–100 bpm (MedlinePlus); inappropriate sinus tachycardia: rest > 100 bpm and 24 h mean > 90 (HRS 2015 consensus) | cat. 04 A4 (l. 27) · cat. 01 V3 (l. 33) |
| SpO2 | ≤ 92% ("contact") | ≤ 88% ("immediate attention") | [T], unofficial proposal | MedlinePlus, pulse oximetry | cat. 04 A3 (l. 26) and C.5 · index §2.2 |
| Respiratory rate | > 18 resp/min | not found | [T] | Range 12–18/min (MedlinePlus) | cat. 04 A2 (l. 25) |
| Temperature | ≥ 39.4 °C sustained | ≥ 40.6 °C | [T], unofficial proposal | MedlinePlus, fever (oral values) | cat. 04 A1 (l. 24) and C.5 |
| Systolic pressure | < 90 or ≥ 140 mmHg | < 70 **[A]** or > 180 mmHg | [T] | ACC/AHA categories (via CDC); acute range 90/60–120/80 (MedlinePlus); < 70 = presyncope | cat. 01 V1 (l. 31) and V47 (l. 93) |
| Diastolic pressure | < 60 or ≥ 90 mmHg | > 120 mmHg | [T] | Same as systolic | cat. 01 V1 (l. 31) |
| Mean pressure | — | — | — | **No threshold in the catalog** | — |

**How they were encoded** (our decisions on the catalog's numbers; the details are in
the `nota` field of each variable):

1. If the catalog gives an explicit alert criterion, that one is used (SpO2, temperature, pressure).
2. If it only gives a reference range, its edge is used as amber **only in the
   direction that the catalog associates with some condition** (high HR and high respiratory rate).
3. **Catalog edges that are not used as alerts**, because they would trigger with
   normal values of a trained adult at rest:
   - HR < 60 bpm. The same catalog records 53.3 ± 7.3 bpm in sleeping astronauts (cat. 03 V18).
   - Respiratory rate < 12 resp/min. The catalog says that respiratory rate decreases in flight.
   - Temperature < 36.5 °C, and "fever likely if oral > 37.2–37.5 °C": core
     temperature rises ~1 °C in flight, so that cutoff would trigger with normal values.
   - "Elevated" pressure (120–129) and stage 1 (130–139 or 80–89).
4. **Nuances that change the reading:**
   - The < 70 mmHg [A] was defined for the orthostatic test after landing, not for
     rest in flight; here it is a safety floor.
   - The temperature values are oral and the smart shirt measures in the armpit; the catalog does not
     give the equivalence.
   - NASA sets the oxygen limit on inspired air (target PIO2 145–155 mmHg,
     minimum 127), not on SpO2. The index warns that watch SpO2 overestimates
     in hypoxemia: it must not be the only alert.
   - In flight, pressure drops (§3): the 90/60 edge ends up closer to normal values.
5. **Exact value of the limit.** The catalog's "≤" and "≥" criteria are inclusive, but the
   system compares with "less/greater than": a reading equal to the limit (SpO2 of 92% or 88%,
   systolic of 140) does not trigger by threshold.

---

## 3. Expected change in microgravity

| Variable | What the catalog says | n | Source | Where it comes from |
|---|---|---|---|---|
| Heart rate (rest) | No change in flight; relative bradycardia in long flights compared with short ones. Asleep: 53.3 ± 7.3 bpm before flight, no change in flight | 8 astronauts + 8 cosmonauts; sleep: Xu 2013 | Norsk 2015; Baevsky 2007; Xu 2013 | cat. 01 V3 (l. 33) · cat. 03 V18 (l. 38) |
| SpO2 | **not found** | — | — | cat. 04 A3 |
| Respiratory rate | Decreases; **magnitude not found** | 8 | Baevsky 2007; Bio-Monitor | cat. 04 A2 (l. 25) |
| Temperature | Resting **core** temperature rises ~1 °C gradually over 2.5 months | 11 (ISS) | Stahn 2017 | cat. 04 A1 (l. 24) · cat. 03 V47 (l. 90) |
| Systolic pressure | 24 h mean: −8 ± 2 mmHg (days 85–192). Another study: 120 ± 10 → 106 ± 9 mmHg | 8 | Norsk 2015 / Fu 2019 | cat. 01 V1 (l. 31) |
| Diastolic pressure | 24 h mean: −9 ± 2 mmHg | 8 | Norsk 2015 | cat. 01 V1 (l. 31) |
| Mean pressure | 24 h mean: −10 ± 3 mmHg | 8 | Norsk 2015 | cat. 01 V1 (l. 31) |

- All of these are ISS data (low orbit) with 8–11 people: they provide orientation, they do not predict an individual.
- The +1 °C refers to **core** temperature (forehead sensor). It is not interchangeable with an
  axillary or oral reading.
- The catalog does not say whether "±" is the standard deviation or the standard error, nor does it assign each pressure figure
  to a study; the attribution to Norsk 2015 is inferred (same n = 8 as row V2).

### Compared with LUNNA's current priors (`semillas/inicial.json`, orbit)

| Variable | Current prior | Catalog | Result |
|---|---|---|---|
| Heart rate | 0%, "no verified population change" | "No change in flight" (n = 8 + 8) | The value matches. The source text falls short: the catalog does report the data |
| SpO2 | 0%, non-informative | not found | Consistent |
| Respiratory rate | 0% | Decreases, no magnitude | No number to use; the prior centered on 0 does not reflect the known direction |
| Temperature | +1.0 °C | ~+1 °C core (n = 11) | Matches, but it is applied to an axillary thermometer (the prior itself notes this) |
| Systolic pressure | −6.7% (= −8/120) | −8 ± 2 mmHg | Same origin. The 120 in the denominator is an assumption; the second study (−14 mmHg) is not used |
| Diastolic pressure | −11.25% (= −9/80) | −9 ± 2 mmHg | Same origin. The 80 is an assumption |
| Mean pressure | −9.3%, derived from systolic and diastolic | −10 ± 3 mmHg, direct data | **Discrepancy:** the prior does not use the catalog's direct data |

Between-person, between-mission and day-to-day dispersion (τ₀, σ): **not in the
catalog**; in `inicial.json` they are assumptions and are labeled as such.

---

## 4. Which conditions each variable contributes to

Each cell: **weight · direction · level of evidence**. This is not a diagnosis: it indicates in which
conditions a deviation of that variable carries weight.

| Condition | HR | SpO2 | Resp. rate | Temperature | Blood pressure |
|---|---|---|---|---|---|
| P01 Arrhythmia / atrial fibrillation | — | 1 ↓ C | — | — | 1 ↓ C |
| P02 Deconditioning and orthostatic intolerance | — | — | — | — | 1 ↓ C |
| P03 Hypoxia / respiratory problem | 2 ↑ B | **3 ↓ A** | **3 ↑ B** | — | 1 ↑/↓ C |
| P04 Infection, fever or immune dysregulation | 2 ↑ A | 1 ↓ B | 1 ↑ B | **3 ↑ B** | 1 ↓ B |
| P05 Sleep loss and circadian misalignment | 1 ↑ C | — | — | — | — |
| P06 Fatigue and cognitive impairment | 1 ↑ C | — | — | — | — |
| P07 CO2 exposure / headache | 1 ↑ C | — | 2 ↑ C | — | — |
| P08 Acute radiation from a solar event | 1 ↑ C | — | — | 1 ↑ C | — |
| P09 Stress / behavioral health | 1 ↑ C | — | 1 ↑ C | — | 1 ↑ C |
| P10 Decompression sickness after EVA | 1 ↑ C | 1 ↓ C | 1 ↑ C | — | 1 ↓ C |
| **Where it comes from (PV, rows)** | 33, 41, 66, 97, 128, 142, 158, 187 | 3, 34, 42, 188 | 35, 43, 129, 159, 189 | 44, 143 | 4, 23, 36, 45, 160, 190 |

- **Weight:** 1 associated marker · 2 direct causal link · 3 the variable is the mechanism.
  **Evidence:** A relationship measured with a number · B mechanism documented in a source ·
  C physiological judgment of the team, without a direct source (legend in `Leo/modelo-pesos/README.md`).
- **17 of the 25 links are level C.** The A and B links cite Smith 2013 (NEWS score),
  Mishra 2020 (infection detected by a watch) and Call 2005 (fever in influenza, LR+ 1.8,
  labeled "terrestrial"). No weight in this table is validated in astronauts
  (`Leo/modelo-pesos/README.md`).
- The HR column uses the rows of `01:V3` (resting HR): PV has no rows for `04:A4`.
- The catalog treats systolic and diastolic as a single variable (`01:V1`) and does not link
  mean pressure to any condition.

---

## 5. What the catalog does NOT have

1. **No [A] threshold for vital signs in flight.** NASA-STD-3001 refers to "clinically
   accepted values" and to non-public program documents (cat. 04 C.5; index §4).
2. Red threshold for HR and respiratory rate. Threshold for bradycardia, low respiratory rate and
   hypothermia.
3. Threshold, conditions and a row of its own for mean arterial pressure.
4. Magnitude of the decrease in respiratory rate in flight. Change in SpO2 in flight.
5. Equivalence between axillary, oral and core temperature. How long "sustained" lasts in the
   fever criterion.
6. Whether the "±" of blood pressure is the standard deviation or the standard error, and which study each
   figure comes from.
7. Between-person dispersion and day-to-day variability of any of the seven.
8. Transit, Moon or Mars data: everything measured is from the ISS.
9. Accuracy of the flight pulse oximeter. The summary that supports the warning about watch
   SpO2 (`RESUMEN-MAESTRO.md`) is not in the repo.
10. Condition–variable link for instantaneous HR (`04:A4`).

**Reliability caveats inherited by this document** (index §5): many articles were
read only as abstracts through the PubMed or Europe PMC API; the first author of
reference [63] in cat. 01 (HR > 100 bpm criterion) was written down from memory, although the URL
was opened; the SpO2 thresholds are a terrestrial clinical proposal, not an official one.

---

## 6. Future sensor-measurable candidates (not implemented)

| Candidate (id) | Measured in flight | Our sensor | What the catalog supports | Threshold | Where it comes from |
|---|---|---|---|---|---|
| HR variability: RMSSD, SDNN, LF/HF (`01:V43`, `03:V17`) | Yes: Holter during sleep (n = 7), Bio-Monitor | Smart shirt ECG (RR intervals) | Reduced in flight during sleep (n = 7); another row says bands unchanged (n = 8): **the two entries do not agree** and the duplicate is still open. Contributes to P09 (weight 2, C) | No cutoff; use own baseline. Terrestrial norms: RMSSD 42 ± 15 ms, SDNN 50 ± 16 ms | VMA rows 44 and 235 · cat. 01 V43 (l. 80) · cat. 03 V17 (l. 37) · PV row 178 · `Iker/iker_variables.csv` row 14 |
| Irregular rhythm / atrial fibrillation (`01:V31`) | Yes: 48 h Holter (n = 13, no cases) | Smart shirt ECG | Contributes to P01 with weight 3, evidence A. Only as an irregular-rhythm flag, not a diagnosis | No numerical threshold | VMA row 32 · cat. 01 V31 (l. 68) · PV row 2 · `iker_variables.csv` row 2 |
| QTc interval (`01:V34`) | Yes: Holter (n = 3) | Smart shirt ECG | QTc > 440 ms appears in the first month of long-duration flight. Contributes to P01 (weight 2, B) | [T] 450/460 ms; risk ≥ 500. [A] > 440 ms in the astronaut study | VMA row 35 · cat. 01 V34 (l. 71) · PV row 8 |
| Pulse wave transit time (`01:V23`) | Yes: cosmonauts, 162–196 days | Smart shirt ECG + watch PPG | Decreases in flight (n = 8); magnitude not found | not found | VMA row 24 · cat. 01 V23 (l. 53) |
| Nocturnal blood pressure dip (`01:V2`) | Yes: 24 h recording | Cuff at scheduled readings | Dip of 8 ± 3 mmHg, preserved in flight (n = 8) | not found | VMA row 3 · cat. 01 V2 (l. 32) |
| Stand test: pressure drop and HR rise (`01:V47`, `01:V48`) | Only before and after flight (requires gravity) | Cuff + smart shirt | Contributes to P02 (weight 3, A and weight 2, B). Applicable on landing or on a surface | [T] drop ≥ 20/10 mmHg; [T] ≥ 30 bpm; [A] systolic < 70 = presyncope | VMA rows 48 and 49 · cat. 01 V47–V48 (l. 93–94) · PV rows 16 and 17 |
| Sleep by actigraphy (`03:V30`, `03:V31`) | Yes: Actiwatch | Watch accelerometer | ISS: 6.09 h on average, 43.8% of nights < 6 h (n = 21) | [T] 7–9 h; < 6 h is associated with worse performance | VMA rows 248 and 249 · cat. 03 V30–V31 (l. 66–67) |

Known limit for the first three: according to `Leo/modelo-pesos/README.md`, the team's
watch does not send RR intervals; they would have to come from the smart shirt ECG.

<!-- END OF CONSOLIDATED DOCUMENT: Planeacion/Julio/backend/semillas/medibles.md -->


## Consolidated document: `Planeacion/Leo/modelo-pesos/README.md`

> Original source: `Planeacion/Leo/modelo-pesos/README.md`

# Physiological weights + Bayesian updating

Package for adapting the weights of the variables to each space ailment with **Bayesian updating**.
Foundations and context: **../modelo-predictivo-fundamentos.md** (sections 1 to 8).

✅ DOI verified at doi.org and Crossref (14-11-2026) · 🔶 our decision or judgment

## Files

| File | What it is |
|---|---|
| [pesos.csv](../Planeacion/Leo/modelo-pesos/pesos.csv) | **99 cells** (11 ailments × 9 variables): weight 0–3, direction, mechanism, level of evidence, reference with DOI and Bayesian prior. Opens in Excel |
| [pesos.json](../Planeacion/Leo/modelo-pesos/pesos.json) | The same in JSON, plus the list of references |
| [generar_pesos.py](../Planeacion/Leo/modelo-pesos/generar_pesos.py) | **Source of truth**: the weights are edited here and the CSV and JSON are regenerated |
| [actualizacion_bayesiana.py](../Planeacion/Leo/modelo-pesos/actualizacion_bayesiana.py) | Reference implementation in pure Python (no dependencies) with a demonstration |
| [Sistema/interfaces/eva/pesos.js](../Sistema/interfaces/eva/pesos.js) | Lightweight copy (only cells with weight) used by the central computer and the Earth base for the per-condition index. It is generated by `generar_pesos.py` |

```bash
cd Planeacion/Leo/modelo-pesos
python generar_pesos.py            # regenera pesos.csv, pesos.json y Sistema/interfaces/eva/pesos.js
python actualizacion_bayesiana.py  # demostración con datos simulados
```

## Table columns

| Column | Meaning |
|---|---|
| `peso_fisiologico` | 0 no physiological pathway (discarded) · 1 associated marker · 2 direct causal link · 3 the variable **is** the mechanism |
| `direccion` | Which way the variable moves in the ailment (↑, ↓, "irregular", "on standing up") |
| `nivel_evidencia` | **A** relationship measured with a number · **B** mechanism documented in a source · **C** physiological judgment of the team, without a direct source |
| `referencia`, `doi`, `url` | Verified source (empty at level C) |
| `prior_media`, `prior_de` | Normal prior of the weight. The SD depends on the evidence: **A 0.5 · B 1.0 · C 1.5**; weight 0 → 0.5 |

**Count:** 54 cells with weight (11 A · 14 B · 29 C) and 45 discarded. **More than half of the weights are
our judgment (C)**: that is why they have the widest prior, so that the data can correct them.

## Mathematical model

For each ailment *m* and each day:

1. **Personal deviation.** Each variable is converted into z against the person's baseline (robust z with
   moving median and MAD, Julio's engine).
2. **Points** (like the MEWS/NEWS early warning scores), only in the physiological direction:
   `x_v = 0 si |z|<1 · 1 si 1–2 · 2 si 2–3 · 3 si >3`
3. **Probability of the ailment** (logistic regression):

   `η = β₀ + Σ_v β_v · x_v`  and  `P(malestar) = σ(η) = 1 / (1 + e^(−η))`

4. **Prior** from the table, with scale κ = ln(20)/9 ≈ 0.333 (weight 3 with extreme deviation ⇒ odds × 20):

   `β_v ~ Normal(κ · prior_media_v, (κ · prior_de_v)²)`
   `β₀ ~ Normal(logit(p₀), 1)`, with p₀ = daily baseline probability of the ailment (for example, from the incidence
   in Crucian et al. 2016, [doi:10.2147/IJGM.S114188](https://doi.org/10.2147/IJGM.S114188))

5. **Update with labeled data** (days with and without the ailment), by Laplace approximation:

   `β̂ = argmax Σ [y log σ(η) + (1−y) log(1−σ(η))] − ½ (β−μ)ᵀ Σ⁻¹ (β−μ)`
   `Σ_post = (Xᵀ W X + Σ⁻¹)⁻¹`, with `W = diag(p(1−p))`

6. **Sequential learning:** the posterior `Normal(β̂, Σ_post)` is the prior for the next update.
7. **Variable selection:** `P(β_v > 0)` from the posterior. If it is low (🔶 for example < 0.5), the variable can be
   left aside for that ailment.

### Demonstration result (simulated data, ailment 4: infection)

| Variable | Initial weight | Updated weight | Simulated "truth" | P(effect) |
|---|---:|---:|---:|---:|
| Resting HR | 2.00 | 2.36 | 2.6 | 1.000 |
| Temperature | 3.00 | 2.97 | 3.0 | 1.000 |
| Blood pressure | 1.00 | 0.59 | 0.0 | 0.972 |
| PVT | 0.00 | −0.30 | 0.0 | 0.122 |
| Cabin CO₂ | 0.00 | −0.09 | 0.0 | 0.371 |

With 600 simulated days the model approaches the truth, but **the prior still carries weight** (blood pressure does not
reach 0). With less data, the physiological prior dominates; with more, the data govern.

## Ideas for your teammate

- **Without labels** (the usual case today) only the baselines and "the crew's normal" are adapted; the weights
  stay at their prior. With labels (from analogs or from flight) the weights are updated.
- **Weights that change over time:** add a forgetting step between updates (`Σ ← Σ + Q`, Kalman
  filter) so that the model adapts to each mission phase.
- **Hierarchical by person:** share the weights among crew members, but with a small individual variation.
- **Sensitivity analysis:** change each C weight by ±1 and see whether the alarms change.
- Tuning κ and the deviation levels (A 0.5 · B 1.0 · C 1.5) are 🔶 our decisions: they must be justified
  or varied.

## Limitations

- The `riesgo_nasa` column uses the **official HRR names**, the same as in Iker's table (`Planeacion/data/variables/VARIABLES-CARDIOBASCULAR.csv`). Hypoxia, immune and acute radiation (which Iker does not cover) were taken from NASA's risk pages and from the Evidence Report NTRS 20160003870. CO₂ has no HRR risk of its own: it is marked as a *Hostile/Closed Environments* hazard, just as Iker did.
- No weight is validated in astronauts, except CO₂ → headache (level A, Law et al. 2014).
- HRV is not included because the team's watch does not send RR intervals.

## References used in the table (all ✅)

| Key | Reference | DOI |
|---|---|---|
| PEREZ2019 | Perez et al. 2019, NEJM — atrial fibrillation by watch | [10.1056/NEJMoa1901183](https://doi.org/10.1056/NEJMoa1901183) |
| LEE2015 | Lee et al. 2015 — orthostatic intolerance after the ISS | [10.3357/AMHP.EC08.2015](https://doi.org/10.3357/AMHP.EC08.2015) |
| GALLO2020 | Gallo et al. 2020 — model of cardiovascular deconditioning | [10.1038/s41526-020-00117-5](https://doi.org/10.1038/s41526-020-00117-5) |
| NEWS2013 | Smith et al. 2013 — NEWS | [10.1016/j.resuscitation.2012.12.016](https://doi.org/10.1016/j.resuscitation.2012.12.016) |
| MEWS2001 | Subbe et al. 2001 — MEWS | [10.1093/qjmed/94.10.521](https://doi.org/10.1093/qjmed/94.10.521) |
| MISHRA2020 | Mishra et al. 2020 — infection detected by watch | [10.1038/s41551-020-00640-6](https://doi.org/10.1038/s41551-020-00640-6) |
| ALAVI2022 | Alavi et al. 2022 — real-time alerts | [10.1038/s41591-021-01593-2](https://doi.org/10.1038/s41591-021-01593-2) |
| CRUCIAN2016 | Crucian et al. 2016 — incidence of symptoms in flight | [10.2147/IJGM.S114188](https://doi.org/10.2147/IJGM.S114188) |
| BARGER2014 | Barger et al. 2014 — sleep in astronauts | [10.1016/S1474-4422(14)70122-X](https://doi.org/10.1016/S1474-4422(14)70122-X) |
| BASNER2011 | Basner and Dinges 2011 — PVT | [10.1093/sleep/34.5.581](https://doi.org/10.1093/sleep/34.5.581) |
| LAW2014 | Law et al. 2014 — CO₂ and headache on the ISS | [10.1097/JOM.0000000000000158](https://doi.org/10.1097/JOM.0000000000000158) |
| BASNER2013 | Basner et al. 2013 — sleep in Mars-500 | [10.1073/pnas.1212646110](https://doi.org/10.1073/pnas.1212646110) |
| BASNER2014 | Basner et al. 2014 — psychology in Mars-500 | [10.1371/journal.pone.0093298](https://doi.org/10.1371/journal.pone.0093298) |
| PNAS2026 | Antarctic overwintering, PNAS 2026 | [10.1073/pnas.2533420123](https://doi.org/10.1073/pnas.2533420123) |
| PALINKAS2008 | Palinkas and Suedfeld 2008 — polar expeditions | [10.1016/S0140-6736(07)61056-3](https://doi.org/10.1016/S0140-6736(07)61056-3) |
| MG2019 | Marshall-Goebel et al. 2019 — jugular thrombosis | [10.1001/jamanetworkopen.2019.15011](https://doi.org/10.1001/jamanetworkopen.2019.15011) |
| LEE2020 | Lee et al. 2020 — SANS | [10.1038/s41526-020-0097-9](https://doi.org/10.1038/s41526-020-0097-9) |

Statistical methods (adaptive lasso, mixed models, EWMA, CUSUM, Isolation Forest, transfer learning) and their DOIs:
see **../modelo-predictivo-fundamentos.md** §4.

<!-- END OF CONSOLIDATED DOCUMENT: Planeacion/Leo/modelo-pesos/README.md -->


## Consolidated document: `prototipo-salud/AVANCE.md`

> Original source: `prototipo-salud/AVANCE.md`

# PROGRESS LOG (updated with each milestone)

## 2026-11-14 09:41 CDMX — Change of plan
- Iker asked for the real tests to be done on his PC (Windows, RTX 4050 6 GB). On this machine (Linux, 8 CPU, no GPU)
  **NO real inference has been run** and **no weights have been downloaded**.
- Done before the change: environment detected (ENTORNO.md); 5 official repos cloned into vendor/ (vendor/REVISIONES.md);
  3 official samples copied from the repos to samples/ with provenance and license (samples/FUENTES.md).

## 2026-11-14 ~09:50 CDMX — Building the structure for the PC
- Common core written and tested with test data: core/runs.py (run_id, JSON, sha256, relative paths),
  core/formato.py (common format), core/modalidad.py (detection/rejection of incompatible modalities).
- In progress (subagents): adapters for the 5 models with official preprocessing, sensors, fusion/rules/stub,
  runner + Streamlit app, PowerShell scripts.

## 2026-11-14 ~10:15 CDMX — Structure complete, ready for Iker's PC
- **Real inference: NOT run** (this machine has no GPU and no weights were downloaded). First real inference:
  pending on Iker's PC with `README.md` → steps 4 and 5 (PanEcho and then EchoNet-Dynamic).
- Adapters for the 5 models with cited official preprocessing (file:lines) and modality/view validation:
  PanEcho, EchoNet-Dynamic, MedSAM2, EchoPrime, EchoCLIP (`adapters/`). The weights of all 5 are public (no login or
  terms), checked via HTTP headers/HF API; sizes in `MODELOS-TABLA.md`. No model is "blocked".
- Tests done here (Linux CPU, torch 2.5.1 CPU, test venvs outside the deliverable):
  - dummy load test of the 5 adapters through the runner (`core.run_model`): status `prueba_carga`,
    `inferencia_real=false`, nothing written to `outputs/normalized.csv`; test runs deleted afterwards;
  - rejections with a clear message: non-A4C view in EchoNet-Dynamic, spectral Doppler in PanEcho, MedSAM2 without a box,
    3D volume, DICOM Color Flow/PW, PNG declared as video, heavily colored video; study with a mixed-in PNG:
    the PNG is listed as not analyzed and is kept;
  - clean error for missing weights (it shows the download command);
  - `verificar.py`: (3)-(6) PASS, (1)-(2) PENDING; `pytest -q tests`: 25 passed;
  - Streamlit app with AppTest: no exceptions, 8 sections, synthetic example marked SIMULATED, execution from the UI
    (EchoNet-Dynamic load test) with a frame viewer;
  - .ps1 scripts: 11 files, 0 parse errors (pwsh 7.7 on Linux), pure ASCII; `preparar_muestras` verifies sha256
    OK; `descargar_pesos -SoloMostrar` downloads nothing. **Not tested on real Windows PowerShell 5.1.**
- Licenses corrected after review: MedSAM2 weights on HF = CC BY-SA 4.0; EchoNet-Dynamic has a LICENSE (MIT) and
  a restrictive LICENSE.txt (local use only, no redistribution).

## 2026-11-14 ~10:25 CDMX — FIRST REAL INFERENCE (reported by Iker, on his PC)
- **Model:** PanEcho (`envs\panecho`), **CPU** (at that moment torch ended up without CUDA, see bug below).
- **Result:** 58 normalized rows, 42.8 s. Run `outputs\raw\20261114T102516_panecho_4d352df3` (on Iker's PC; it is not on
  this machine, where there is still no real inference). Input, source and license: according to `samples/FUENTES.md` (official sample
  from the repo, not from astronauts). Not a diagnosis.
- Pending confirmation by Iker: exactly which sample he used and that `verificar.py` passes (1) and (2) with that run.

## 2026-11-14 ~10:40 CDMX — BUG: torch cu124 was being replaced by torch 2.15.0+cpu
- **Symptom (Iker's PC):** `instalar_modelo.ps1 -Modelo panecho` installed torch 2.5.1+cu124 and then, when installing
  `adapters/panecho/requirements-win.lock.txt`, ended up with torch 2.15.0 (+cpu) and torchvision 0.29.2 -> `torch.cuda.is_available()=False`.
- **Cause:** the locks exclude torch (`--no-emit-package`) but keep packages that require it without a version (timm, open-clip...).
  `uv pip install -r <lock>` re-resolved torch from PyPI. Reproduced on this machine: `uv pip compile` of `timm==0.9.10`
  for Windows/3.11 resolves `torch==2.15.0` and `torchvision==0.29.2`, with or without the cu124 index as an extra.
- **Fix:** `scripts/torch-cu124-overrides.txt` (torch==2.5.1, torchvision==0.20.1) used in every installation; the lock is
  installed with `--no-deps --override`; new function `Repair-TorchCuda` in `scripts/_comun.ps1` (reinstalls torch/torchvision cu124 with
  `uv --reinstall-package` and verifies `cu124` + `cuda_disponible`, raising an error if not); `instalar_modelo.ps1` runs it at the end and,
  if the environment was already installed but without CUDA, repairs it; new `scripts/reparar_torch.ps1 -Modelo <modelo|todos>`.
  Section "Reparar entorno ya instalado (CUDA False)" in `README.md`.
- **Tested here:** 12 .ps1 files parse without errors (pwsh 7.7), pure ASCII; no lock/requirements file pins torch/torchvision/nvidia/triton;
  `uv pip compile` for Windows/3.11 with the override and the cu124 index resolves `torch==2.5.1+cu124` and `torchvision==0.20.1+cu124`
  in the 5 models. **Not tested:** the real reinstallation on Windows (CUDA torch was not installed here).

## 2026-11-14 ~11:06 CDMX — PanEcho on CUDA on Iker's PC (reported by Iker)
- PanEcho runs on **CUDA** on Iker's PC: **17.4 s**, run `20261114T105021_panecho_c753f120` (before, on CPU: 42.8 s).
  Confirms the torch cu124 fix. The Streamlit app opens at http://localhost:8501.
- These runs are on Iker's PC, not on this machine (there is still no real inference here).

## 2026-11-14 ~11:20 CDMX — BUG EchoNet-Dynamic: UnpicklingError when loading weights (numpy.core.multiarray.scalar)
- **Symptom (Iker's PC):** run `20261114T105607_echonet_dynamic_33220f31` (cuda, torch 2.5.1 cu124, Python 3.11, numpy 1.26.4):
  `Weights only load failed ... Unsupported global numpy.core.multiarray.scalar`. The official checkpoints contain numpy scalars
  (`best_loss`, `epoch`...) and a plain `torch.load(weights_only=True)` rejects them.
- **Fix** (`adapters/echonet_dynamic/infer.py`, `cargar_pesos`):
  1. Default path: `weights_only=True` inside `torch.serialization.safe_globals([...])` (or `add_safe_globals` if the torch version
     does not have it) with `numpy.core/_core.multiarray.scalar` and `_reconstruct`, `numpy.dtype`, `numpy.ndarray` and the dtype classes
     (`Float64DType`, `Int64DType`, ...). Any other object remains blocked.
  2. Only if that gives `UnpicklingError`, or if the user sets `options.torch_load_weights_only=false`: `weights_only=False` **only**
     after verifying the official file name and **exact size** (250572083 B and 317401511 B, from HTTP headers); if it does not match,
     nothing is loaded and there is a clear error. The official sha256 is not known: the computed one is recorded.
  3. The run JSON records `checkpoint.carga` (`weights_only_true_safe_globals` | `weights_only_false_verificado_tamano`),
     `checkpoint.globals_permitidos` and, in the second case, a warning.
- **Tested on Linux** (numpy 1.26.4, torch 2.5.1 CPU, RANDOM weights created in /tmp, **this is not real inference**; no
  real weights were downloaded): the error is reproduced with a plain `torch.load(weights_only=True)`; `cargar_pesos` loads both
  checkpoints via path 1; with `weights_only=False` and a different size it is rejected; with a matching size it loads via path
  2; a non-official file name is rejected; an arbitrary object remains blocked. Full adapter flow with random
  weights: status ok, `carga = weights_only_true_safe_globals` in both checkpoints. **Pending:** confirm on
  Iker's PC with the real weights.
- Other adapters: PanEcho (`weights_only=True`, checkpoint with key `weights`) and EchoPrime (`weights_only=True`) use the
  same pattern; PanEcho already ran correctly on Iker's PC. They were not changed.

## 2026-11-14 ~16:45 CDMX — ECG module (`ecg`): NeuroKit2 + wfdb, no torch or weights
- **What there is:** `adapters/ecg/` (`infer.py`, `metricas.py`, `manifest.json`, `requirements.in`, Windows/cp311 lock),
  new modality `ecg_1d` in `core/modalidad.py` (WFDB or CSV + `fs`; cross-rejection with the echo models), runner
  that copies the complete WFDB record to `input/`, source `algoritmo_senal` in the common format, PowerShell scripts that
  tolerate a model without torch or weights (`instalar_modelo`, `inferir -Fs`, `descargar_pesos`, `instalar_todo`,
  `inferir_muestras`, `reparar_torch`, `preparar_muestras`), section "4b. ECG" in the app, 3 trimmed samples from
  PhysioNet in `samples/` (ODC-By 1.0, verified on the pages), tests and check (7) in `verificar.py`.
- **Outputs:** HR, HRV (RMSSD, SDNN), PR, Bazett QTc, irregular beats (RR criterion) and an AF-compatible irregular-rhythm
  flag. The flag is **BANDERA EXPERIMENTAL – NO DIAGNÓSTICO** (EXPERIMENTAL FLAG – NOT A DIAGNOSIS) in JSON, CSV, app and README.
- **Actually run here (Linux, CPU, Python 3.11 with the lock versions):** complete records mitdb 100, 201,
  203 and afdb 04015 and the 3 samples; the original text said that the runs were stored in `validacion/ecg/runs/` and the
  report in `validacion/ecg/VALIDACION.md` (+ `validacion_por_registro.csv`). On Nov 15, 2026 that report was searched for
  across the entire git history and **it is not, and never was, in the repository** (nor are the runs or the CSV). Pending:
  the report is not in the repository. The figures in the following summary were already in this README. Summary:
  - R peaks vs annotated beats (±150 ms): sensitivity 0.9987 / 1.0000 / 0.9191 and PPV 1.0000 / 0.9718 / 0.9892 on 100 / 201 / 203.
  - Irregular beats (RR criterion) vs annotated ectopic beats: sensitivity 0.882 / 0.595 / 0.425, PPV 1.000 / 0.450 / 0.234.
  - Per-segment flag vs `(AFIB`: sensitivity 1.000 / 1.000 / 1.000 on 201 / 203 / 04015; specificity 1.000 / 0.054 / 0.000 / 0.904 on 100 / 201 / 203 / 04015. It detects irregularity, not AF.
  - PR and QTc: no labels to compare them against; not validated. PTB-XL+ was not usable (there is only a features CSV, no signals).
- **History:** the first version of the flag (30 s windows) and Kubios for the ectopic beats gave worse results
  (`validacion/ecg/v1_resumen.json`). The current version uses what was published by Dash et al. 2009 without tuning thresholds, but
  it was chosen after seeing v1 on the same 4 records: **it is not an independent validation**.
- **Screenshot:** `validacion/ecg/captura_ecg.png` (headless Streamlit + Playwright, sample `ecg_fa_afdb04015`; the screenshot's
  run was deleted from `outputs/`, its figures match the `muestra_fa_afdb04015` case of the validation).
- **Checked:** pytest 48 passed; `verificar.py` (3)–(7) PASS, (1)–(2) PENDING; the 12 `.ps1` files parse with pwsh 7 and
  are ASCII. **Not tested at that time:** anything on Windows (neither `instalar_modelo.ps1 -Modelo ecg` nor the app there).
  On Nov 15, 2026 there was a **functional test** on Iker's PC (Windows, CPU, `POST /api/modelos/analizar`,
  SIMULATED): see [testing and validation §4.1](../documentacion/README_08_PRUEBAS_VALIDACION.en.md). It is not validation.
- **Minor change in core:** `entorno.executable` no longer resolves symbolic links (it was recording uv's base interpreter).

## 2026-11-15 ~01:10 CDMX — Condition engine (`motor/`) and «Padecimientos» (Conditions) and «Configuración» (Settings) views
- **What:** `ALGORITMOS.md` was implemented (authorized by Iker on Nov 14). `motor/`: quality gate and mapping of a.2/a.4
  (`calidad.py`, `entradas.py`), normalization (`normalizacion.py`), self-calibration (`calibracion.py`), two-channel score
  (`score.py`), traffic light (`semaforo.py`), orchestration (`evaluacion.py`), provisional parameters and overrides
  (`parametros.py`, `tablas.py`) and generator of the SIMULATED crew (`simulador.py` → `datos/simulado/`). Sourced tables
  copied into `datos/modelo/`. In the app, a sidebar selector with three views; sections 0–7 did not change.
- **Checked on Linux:** pytest 98 passed, 5 skipped (43 previous + 55 new: d.7 arithmetic, traffic light, not learning from
  alerted or quarantined points, frozen baseline, simulated never treated as real, overrides, views with AppTest). Screenshots with
  headless Streamlit + Playwright. With the 7 runs in `validacion/ecg/runs` (real channel, read-only; those runs **are not
  in the repository**, see the Nov 14 note about `VALIDACION.md`): the sample with AF gives
  P01 YELLOW «confirmar» (confirm) and never RED (all N4).
- **Known limits:** all thresholds are provisional (S1–S20) and nothing is validated in astronauts; phase δ = 0;
  of the fixed layers only PHQ-9 is computed (the rest «incompleto»/«inactivo», incomplete/inactive); no interface for RED acknowledgment or for closing
  a CUSUM review; the SIMULATED dataset uses bounded noise on purpose: with free Gaussian noise, CUSUM and the ramp give
  many alerts in the control, so the false alarm rate is **not** measured; the experimental QTc of the ECG adapter
  can meet the Rautaharju criterion and give YELLOW «confirmar» (confirm) on a normal record (mitdb 100: 335 ms). **Not
  tested:** anything on Windows or with real echo outputs. **This is not a diagnosis.**

<!-- END OF CONSOLIDATED DOCUMENT: prototipo-salud/AVANCE.md -->

## Consolidated document: `prototipo-salud/CONTRATO.md`

> Original source: `prototipo-salud/CONTRATO.md`

# Internal contract between modules (set by the coordinator; do not change without notice)

Destination: the `prototipo/` folder is copied to Iker's PC (Windows + PowerShell, Python 3.13.5 as `python`,
RTX 4050 Laptop 6 GB VRAM, driver 621.14 → CUDA 12.x). On this Linux machine (no GPU) NO weights are downloaded and NO
real inference is run: only load tests with dummy data, marked "NO se ha corrido inferencia real" (no real inference has been run).

**Paths: ALWAYS relative to the `prototipo/` root** (in code: `core.runs.ROOT`, `Path(__file__)`; in .ps1: `$PSScriptRoot`
+ `Join-Path`). No `/home/box` in deliverable files. In JSON, paths use `/`.

## Environment decision (fixed)
- **Models: one venv per repo with Python 3.11**, created with **uv** (`uv venv --python 3.11 envs\<key>`; uv downloads a
  standalone CPython 3.11 if it does not exist; documented alternative: `py -3.11 -m venv`). Reason: Python 3.13 does not work with the
  repos' pins (e.g. echo_CLIP requires numpy 1.24.4/tokenizers 0.13.3, EchoPrime opencv 4.5.5.64/pydicom 2.3.1/
  polars 0.15.14, PanEcho was developed on 3.10): they have no cp313 wheels. 3.11 satisfies MedSAM2's `python>=3.10`.
- **PyTorch 2.5.1 + torchvision 0.20.1, cu124 wheels** (`--index-url https://download.pytorch.org/whl/cu124`) in all the
  model venvs. Reason: MedSAM2 requires torch>=2.5.1; cu124 is compatible with driver ≥551.61 on Windows (621.14
  satisfies it) and the RTX 4050 (Ada, sm_89) is supported. Deviations from what each repo requires are documented in its manifest.
- **Installation in 2 steps per venv**: (1) torch/torchvision from the cu124 index; (2) `requirements-win.lock.txt`
  (generated with `uv pip compile --python-platform x86_64-pc-windows-msvc --python-version 3.11 --no-emit-package torch
  --no-emit-package torchvision`, against PyPI, that is, WITHOUT torch inside).
- **App** (Streamlit + sensors + fusion + runner + verification): lightweight venv `envs\app` with the system's Python 3.13
  (`python -m venv envs\app`), `requirements-app.txt` with pins; it includes `uv` (which is then used to create the model venvs).
- On Linux, for testing, the test venvs go OUTSIDE the deliverable (e.g. `/tmp/nasa-linux-envs/<key>`, CPU torch
  2.5.1) and are pointed to with the `PROTOTIPO_ENVS_DIR` variable.

## Folders
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
`<key>` ∈ `panecho`, `echonet_dynamic`, `medsam2`, `echoprime`, `echoclip`, `ecg` (ECG: no torch or weights; see "ECG module" at the end).

## manifest.json (one per model; read by registry.py, app.py and the .ps1 scripts)
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
`acceso` ≠ `publico` ⇒ the scripts do NOT download: they print `pasos_manuales` and the model remains "blocked" until Iker
does it on his own.

## Adapter interface
```
envs\<key>\Scripts\python.exe adapters\<key>\infer.py --request <run_dir>\request.json --response <run_dir>\response.json
```
The adapter uses `core.runs.ejecutar_adaptador(model, run)` (it adds the root to `sys.path` with
`sys.path.insert(0, str(Path(__file__).resolve().parents[2]))`). `run(request, resp)`:
1. `core.modalidad.validar(input, declared_modality, admitidas, modelo)`; if not ok ⇒ `core.runs.rechazar(resp, motivo)` and return.
2. Validates the view if the model requires it (e.g. EchoNet-Dynamic only A4C); if not ⇒ reject.
3. If `options.prueba_carga_dummy` ⇒ `resp["random_load_test"]=True`, build the architecture WITHOUT weights, pass a random
   tensor, save output shapes/keys; this is NOT real inference (ejecutar_adaptador adds the warning).
4. If there are no weights in `weights/…` ⇒ status error with a clear message ("ejecuta scripts\descargar_pesos.ps1 -Modelo <key>" or
   manual steps if it is gated).
5. OFFICIAL preprocessing from the repo (cite file and lines in `resp["config"]["preprocesamiento_fuente"]`), inference
   with `torch.no_grad()`, device `auto` (cuda if available), `resp["raw_output"]` = original unrounded output,
   `resp["normalized"]` with `core.formato.filas_modelo(...)`, artifacts (.npz masks, .mp4/.png overlay) in run_dir,
   `resp["checkpoint"]` (relative path, url, sha256), `resp["config"]`, `resp["device"]`, `resp["inferencia_real"]=True`,
   `resp["raw_output"]["vram_pico_mb"]=core.runs.vram_pico_mb()`.

request.json:
```json
{"run_id": "...", "run_dir": "outputs/raw/<run_id>", "input_path": "outputs/raw/<run_id>/input/<archivo o carpeta>",
 "subject_id": "...", "study_id": "...", "timestamp": "ISO o null", "simulated": false,
 "declared_modality": "video_2d|imagen_2d|volumen_3d|doppler_color|doppler_espectral|desconocida",
 "declared_view": "A4C|A2C|PLAX|PSAX|...|desconocida", "options": {"device": "auto"}}
```
response.json: see `core.runs.nueva_respuesta()` (status ok|error|rechazado|prueba_carga, message, model, run_id,
checkpoint, device, random_load_test, inferencia_real, config, input, raw_output, normalized, artifacts, elapsed_s,
warnings, errors, entorno, started_at, finished_at).

## Common format (outputs/normalized.csv) — see core/formato.py
`subject_id, study_id, timestamp, source, model, metric, value, unit, quality, simulated, tipo, run_id, input_file, notes`
- `tipo`: medicion | probabilidad_clase | similitud | hallazgo | regla_alerta | comparacion
- Class probability: metric `<tarea>:<clase>`, unit `probabilidad_modelo_0_1`. Similarity: unit `coseno`.
  Segmentation: `hallazgo`, areas in `px2`; NEVER mm/ml/cm/s without calibration.
- Missing = empty, never 0. A load test is never written to normalized.csv.

## Runner (core/run_model.py, app venv)
`ejecutar(key, inputs, subject_id, study_id, timestamp, declared_modality, declared_view, options, simulated=False)`:
pre-validates the modality against the manifest (rejects without launching a subprocess), creates `outputs/raw/<run_id>/`, copies the inputs to
`input/`, writes request.json, launches the python of `envs/<key>` (or `$PROTOTIPO_ENVS_DIR/<key>`) with cwd=ROOT and a timeout,
saves stdout.log/stderr.log, reads response.json, writes `run_dir/normalized_run.csv` and, if status=ok and it is not a load
test, appends to outputs/normalized.csv. CLI: `python -m core.run_model --model panecho --input samples\x.avi --subject S1 ...`.

## APIs for the app (sensores/ and fusion/)
- `sensores.importador.cargar(origen, nombre=None) -> (DataFrame largo, avisos)`; columns
  `subject_id, timestamp, device, variable, value, unit, quality, simulated, metric_detail, notes`. Accepts long CSV/JSON
  and wide CSV. Canonical variables in `sensores.importador.VARIABLES`. Missing = NaN.
- `sensores.importador.a_formato_comun(df) -> list[dict]` (source=sensor).
- `sensores.resumen.resumir(df, subject_id, ventana_h=24, basal_dias=7, referencia=None) -> DataFrame`.
- `fusion.tabla.construir(normalized_df, sensores_df, subject_id, ventana_h=24, basal_dias=7, referencia=None) -> DataFrame`
- `fusion.tabla.comparar_modelos(normalized_df, subject_id, tolerancias=None) -> DataFrame` (side by side, difference,
  discrepancy; no averaging; note "acuerdo ≠ exactitud" (agreement ≠ accuracy)).
- `fusion.reglas.REGLAS`; `fusion.reglas.evaluar(tabla, comparacion, params=None) -> list[dict]` with
  `id, nombre, etiqueta="REGLA EXPERIMENTAL – no diagnóstica", formula, parametros, activada, datos (filas que la activaron), mensaje`.
- `fusion.red_fusion_stub.predecir(tabla) -> {"disponible": False, "motivo": "...", "probabilidades": None}`.

## ECG module (`adapters/ecg`, key `ecg`) — added 2026-11-14
It is not a trained model: it is signal processing (NeuroKit2 0.3.0 + wfdb 4.3.1), CPU, **no torch and no weights**
(`manifest.env` without `torch`/`torchvision`/`torch_index_url`; `pesos: []`). Everything is an experimental estimate; the irregular-rhythm
flag is **A FLAG, NOT A DIAGNOSIS**.

- New modality `ecg_1d` (`core/modalidad.py`): WFDB record (`.hea` + `.dat`, optional `.atr`/`.qrs`; the `.hea` determines
  the modality) or a CSV/TXT/TSV table declared as `ecg_1d` (requires `options.fs`). The echo models reject `ecg_1d`; `ecg`
  rejects video/image/DICOM/volume. New `source` in the common format: `algoritmo_senal`.
- Runner: if the input is a file from a WFDB record, it copies to `input/` all the companion files with the same name
  (`.hea/.dat/.atr/.qrs`) and `input_path` is the `input/` folder (the sha256 covers everything). Several uploaded files = folder.
  The adapter therefore receives a FOLDER with exactly one `.hea`, or a CSV/TXT/TSV file.
  `ejecutar(..., raw_dir=None, normalized_csv=None)` and the CLI `--raw-dir/--normalized-csv` redirect runs and CSV (validation).
- Structure: `adapters/ecg/infer.py` (I/O, NeuroKit2, artifacts) + `adapters/ecg/metricas.py` (**only numpy +
  standard library + core.formato**: RR, HRV, window rule, matching with annotations, normalized rows;
  importable from the app venv for testing).
- Options (`manifest.opciones`, all with a scalar default value so that the app can generate the control):
  `fs` (0.0 = use the one in the .hea; mandatory >0 for CSV), `canal` (0), `canal_nombre` (""), `csv_columna` (""),
  `inicio_s` (0.0), `duracion_s` (0.0 = until the end), `traza_max_s` (1800.0), `rr_min_s` (0.25), `rr_max_s` (3.0),
  `min_rr_hrv` (20), `ect_fraccion_prematuro` (0.80), `ect_n_previos` (8), `fa_latidos_segmento` (128),
  `fa_paso_latidos` (32), `fa_n_atipicos` (8), `fa_filtro_ectopicos` (true), `fa_umbral_nrmssd` (0.10), `fa_tpr_min` (0.54), `fa_tpr_max` (0.77),
  `fa_umbral_entropia` (0.70), `fa_min_ventanas_consecutivas` (2), `tolerancia_pico_ms` (150.0),
  `prueba_carga_dummy` (false).
- Methods. Honest history: v1 (2026-11-14) used Kubios for the irregular beats and, for the flag, windows
  of 30 s with nRMSSD > 0.10 + a turning-points test. When run on mitdb 100/201/203 and afdb 04015 it gave poor
  specificity (it flagged isolated ectopy, trigeminy and noise) and Kubios detected <10% of the annotated ectopic beats in
  201/203. v2 (below) does NOT tune thresholds to those records: it adopts the statistics and thresholds published by Dash et
  al. 2009 and an RR prematurity criterion of 20%. Even so, v2 was chosen after seeing v1 on the same
  records: its figures are NOT an independent validation.
  1. R peaks: `nk.ecg_clean(method="neurokit")` + `nk.ecg_peaks(method="neurokit", correct_artifacts=False)`.
  2. Valid RR: `rr_min_s ≤ RR ≤ rr_max_s`. HR = 60 / mean(RR).
  3. Irregular beats (documented RR criterion, primary): beat i is "premature" if its preceding RR satisfies
     RR_i < `ect_fraccion_prematuro` × median(the `ect_n_previos` preceding valid RRs; minimum 4). The 20%
     prematurity threshold is the usual convention of the "20% filter" in HRV; here it is EXPERIMENTAL. It does not distinguish
     supraventricular from ventricular and in AF it flags many beats (they are not extrasystoles). Reported separately, only as a
     comparison, is the `ectopic` class of `nk.signal_fixpeaks(method="Kubios", iterative=False)` (Lipponen & Tarvainen
     2019) with its `longshort/missed/extra`.
  4. HRV (RMSSD, SDNN, ddof=1) over the complete analyzed segment with NN intervals = valid RRs excluding the RR
     before and after each beat flagged in (3); the unfiltered value and the value per 300 s windows
     are also reported. Minimum `min_rr_hrv`.
  5. PR = QRS onset (`ECG_R_Onsets`) − P onset (`ECG_P_Onsets`); QT = T offset (`ECG_T_Offsets`) − QRS onset;
     Bazett QTc = QT / sqrt(preceding RR in s); per-beat medians, from `nk.ecg_delineate(method="dwt")`. Minimum 5 beats.
  6. "Irregular rhythm compatible with AF" flag (EXPERIMENTAL): reimplementation of the three statistics of Dash
     et al. 2009 (Ann Biomed Eng 37(9):1701-9, doi:10.1007/s10439-009-9740-z) with THEIR thresholds, over segments of
     `fa_latidos_segmento` = 128 consecutive beats (step `fa_paso_latidos`): (C1) RMSSD/mean(RR) >
     `fa_umbral_nrmssd`, (C2) turning point ratio TPR within [`fa_tpr_min`, `fa_tpr_max`], (C3) Shannon
     entropy (16 bins, normalized) > `fa_umbral_entropia`; outlier handling (`fa_n_atipicos` longest and shortest
     RRs) exactly as described in the article (cite section/table in `bandera_fa.fuente`; any
     detail that the article does not specify is documented as our own decision). Flagged segment = C1 and C2 and C3. A segment
     is only evaluable if its 128 beats yield enough valid RRs (document this). Record flag = 1 if there are
     ≥ `fa_min_ventanas_consecutivas` consecutive flagged segments; 0 otherwise; **empty** (None) if there are fewer evaluable segments
     than that minimum (e.g. records of fewer than ~160 beats). It was not clinically validated; the step between
     segments and the consecutive-segment rule are our own decisions. `ventanas[]` describes each segment (variable duration).
     Before C1–C3 the article's ectopic filter is applied (p. 1703: RR[i]/RR[i−1] < Perc1, RR[i+1]/RR[i] > Perc99
     and RR[i+1]/RR[i+2] > Perc25; RR[i] and its compensatory pause are removed and the series is joined), with percentiles
     computed within each segment (our own decision: the article does not specify the set). The article's "omitted RR" branch
     is NOT implemented (the text does not say which RR to remove). `fa_filtro_ectopicos=false` disables it.
- Normalized rows (always all 8; missing value = None with `quality="sin_dato: <motivo>"`, never 0), `model="ecg"`:

  | metric | unit | tipo | source | variable |
  |---|---|---|---|---|
  | `heart_rate` | bpm | medicion | algoritmo_senal | — |
  | `hrv_rmssd` | ms | medicion | algoritmo_senal | V43 |
  | `hrv_sdnn` | ms | medicion | algoritmo_senal | V43 |
  | `pr_interval` | ms | medicion | algoritmo_senal | V35 |
  | `qtc_bazett` | ms | medicion | algoritmo_senal | V34 |
  | `latidos_irregulares` | latidos | hallazgo | algoritmo_senal | proxy V32/V33 (RR criterion; quality `experimental_criterio_rr_prematuridad`) |
  | `ritmo_irregular_fraccion_ventanas` | fraccion_0_1 | hallazgo | regla_experimental | proxy V31 |
  | `ritmo_irregular_compatible_fa` | bandera_0_1_no_diagnostica | regla_alerta | regla_experimental | proxy V31 |

  The flag row carries `quality="BANDERA_EXPERIMENTAL_NO_DIAGNOSTICO"` and `notes` beginning with
  `BANDERA EXPERIMENTAL – NO DIAGNÓSTICO:` followed by formula, parameters and window. The HRV/HR `notes` indicate the
  window (t start–end in s) and n. PR and QTc never carry `quality="ok"`: `experimental_delineacion_dwt` (or the irregular-rhythm
  warning), because the delineation is not validated here.
- `raw_output` (summaries; no per-beat arrays): `aviso`, `entrada`, `metodos`, `picos_r`, `fc`, `hrv`,
  `intervalos`, `latidos_irregulares`, `bandera_fa` (with `etiqueta`, `formula`, `parametros`, `fuente`, `valor`,
  `motivo`, `n_ventanas`, `n_evaluables`, `n_marcadas`, `fraccion_marcadas`, `max_consecutivas`, `ventanas[]` =
  `{i,t0_s,t1_s,n_rr,n_rr_filtrados_ectopicos,nrmssd,tpr,entropia,c1,c2,c3,marcada}`), `comparacion_anotaciones` (None if there is no
  `.atr`/`.qrs`), `tiempos_s`.
- `comparacion_anotaciones` (when there are annotations alongside the record; they are trimmed to the analyzed segment):
  `picos_r` {referencia (`atr` or `qrs (detector automático no auditado)`), tolerancia_ms=150 (matching window
  of ANSI/AAMI EC57), n_ref, n_det, tp, fn, fp, sensibilidad, ppv}; `ectopicos` {anotados_por_simbolo, n_anotados_V,
  n_anotados_A, n_anotados_otros, n_anotados_total, n_detectados, tp, fn, fp, sensibilidad, ppv,
  criterio_emparejamiento} for the RR criterion and `ectopicos_kubios` (same fields) for Kubios; `fa` {criterio_ventana (AFIB segment if ≥50% of its duration is in `(AFIB`),
  ritmos_anotados_s, fraccion_tiempo_afib_anotada, n_ventanas_evaluables, n_ventanas_afib, tp, fp, fn, tn,
  sensibilidad, especificidad, ppv, ventanas_afl {n, marcadas}, bandera_segmento}; `fc_hrv` {detectados, anotados,
  diferencias} (same functions applied to the annotated beats). A ratio with denominator 0 is None, not 0.
- Artifact `ecg_traza.npz` (numpy, no pickle; read by the app, which does not have wfdb): `fs`, `t0_s`, `senal` (float32,
  selected channel, physical units, first `traza_max_s` of the segment), `unidad`, `picos_r` and `picos_irregulares`
  (samples relative to the start of the segment, all of them), `ann_muestras`, `ann_simbolos`, `ritmo_inicio_s`, `ritmo_fin_s`,
  `ritmo_etiqueta`, `vent_t0_s`, `vent_t1_s`, `vent_marcada` (1/0/NaN).
- `options.prueba_carga_dummy`: synthetic signal `nk.ecg_simulate` ⇒ `random_load_test=True` (NOT a result).
- `inferencia_real=True` here means "real execution of the algorithm on the provided signal" (there is no network and no weights).

<!-- END OF CONSOLIDATED DOCUMENT: prototipo-salud/CONTRATO.md -->

## Consolidated document: `prototipo-salud/datos/simulado/LEEME.md`

> Original source: `prototipo-salud/datos/simulado/LEEME.md`

# SIMULATED crew (synthetic data)

**SIMULATED. This is not flight data, it is not real physiology, and it is not data from astronauts or from any person.**
These are synthetic values: independent variables with bounded noise around arbitrary means (PRE: 12 symmetric, equally spaced deviations up to ±1.0 simulated SD, in random order, so that the pre-flight baseline is stable; flight: uniform up to ±0.5 SD; provisional).
They only serve to exercise the flow of the condition engine (ALGORITMOS.md, section h.2). No figure
here is a validation or a result; all numbers are provisional. Nothing is a diagnosis.

## Contents
- `tripulacion_simulada.csv`: native CSV of the engine (`subject_id,timestamp,variable_id,value,unit,device_class,quality,context,method,simulated,notes`). All rows carry `simulated=true` and `notes` beginning with «SIMULADO».
- `tripulacion_simulada.json`: mission (launch 2026-09-13), profiles (age and sex MADE UP), scenarios, simulated variables and the (provisional) parameters with which it was generated.
- 5 people (`SIM-T01`…`SIM-T05`), 30 days: PRE 2026-09-01…2026-09-12, flight 2026-09-13…2026-09-30; one daily value per variable.
- Variables: all the `sí en vuelo` (yes in flight) variables of conditions P03, P04, P05, P06, P07, P10, P16, P18 and P19 from `datos/modelo/PADECIMIENTO-VARIABLE.csv`. Only HR, SpO2, respiratory rate, temperature, sleep and ppCO2 have plausible-looking values; the rest are in «u.a. SIMULADA» (SIMULATED arbitrary units; mean 100, SD 5). The presence/symptom variables are 0 (absent) every day.

## Scenarios (provisional)
SIM-T01 control; SIM-T02 abrupt jump in 04:A1 and 01:V3 (+5 SD, Sep 27–30); SIM-T03 slow sleep ramp in 03:V30 (−0.10 SD/day from launch); SIM-T04 missing data (no SpO2, respiratory rate or PIO2 in flight, and `sin_dato: <motivo>` rows); SIM-T05 N4 data (strongly deviated cuffless BP, ECG flag = 1 and adapter-type QTc of 470 ms, Sep 28–30); the whole crew: ppCO2 (04:A23) +1.5 SD on September 18 (a single day: a longer excursion would leave a CUSUM drift signal that only one person closes) («desviación compartida», shared deviation).

## Regenerate (deterministic with the seed)
```
python -m motor.simulador
```
From the prototype root. For another seed or folder: `from motor.simulador import generar; generar(dir_salida, semilla)`.

<!-- END OF CONSOLIDATED DOCUMENT: prototipo-salud/datos/simulado/LEEME.md -->

## Consolidated document: `prototipo-salud/docs-modelo/ALGORITMOS.md`

> Original source: `prototipo-salud/docs-modelo/ALGORITMOS.md`

# Algorithm specification: from model outputs to the per-condition traffic light

Nov 14, 2026 (Mexico City). **Specification document; it contains no executable code.** Research only: **nothing is a diagnosis**. The system prioritizes what to review and recommends consulting the flight surgeon.

## 0. Conventions

**Sources used (the only ones).** Every number in this document comes from one of them or carries the mark **[P]**.

| Abbreviation | File |
|---|---|
| [PV] | `PADECIMIENTO-VARIABLE.csv` (350 links) |
| [PAD] | `PADECIMIENTOS.csv` and `PADECIMIENTOS.md` |
| [VMA] | `VARIABLES-MEDIDAS-ASTRONAUTAS.csv` / `.md` |
| [PREC] | `PRECISION-VARIABLES.md` |
| [IP§x] | `INVESTIGACION-PESOS.md`, section x |
| [CON] | `prototipo/CONTRATO.md` |
| [REG] | `prototipo/fusion/reglas.py` and `fusion/tabla.py` |
| [INV] | Inventory of models in the assignment (read from the `manifest.json` files, Nov 14, 2026) |

**Marks.**

- **[P]** = provisional/assumption: there is no source in the tables. All [P] items are gathered in section (i) with their number (S1, S2…).
- **[terrestrial]** / **[spaceflight]** = same as in [IP].
- **SIMULATED** = synthetic data; it is never presented as real and never enters learning.
- **[experimental]** = output of a non-validated adapter (e.g., irregular-rhythm flag, PR, QTc).

**Symbols.**

| Symbol | Meaning | Unit |
|---|---|---|
| i | crew member | — |
| v | team variable (canonical `variable_id`) | — |
| p | condition P01–P20 | — |
| c | device class or method with which v was measured | — |
| t | time of the observation | time |
| φ(t) | mission phase: PRE (pre-flight), VT (early flight), VTa (late flight), POST (post-flight) | — |
| x | admitted observation of v, in the canonical unit of v | that of v |
| μ_pv, σ_pv | `prior_media` (= weight 1–3) and `prior_de` of link (p, v) in [PV] | weight points |
| a_pv | activation of the link, between 0 and 1, or NA if there is no data | dimensionless |
| T_p | weighted-evidence index of the condition | weight points |
| ΔL_p | change in log-odds from links with a published LR/OR | nats (natural logarithm) |
| Cob_p | coverage: fraction of the measurable weight that was actually observed | 0–1 |

**Architecture (agreed; this document only details it).**

1. **Layer 1 – terrestrial population reference** (age, sex, BMI) with the ranges from [IP§c].
2. **Layer 2 – personal self-calibration**: frozen pre-flight baseline + protected update + CUSUM anchored to pre-flight.
3. **Layer 3 – crew as context**, never as a new normal.
4. **Fixed layers**: published scores, computed separately and unmodified.
5. **Output**: one traffic light per condition with four states: GREEN, YELLOW, RED and GRAY ("insufficient evidence").

**Order of computation in each evaluation** (once per day and every time a new data point arrives [P·S20]):

```
PARA cada tripulante i:
  1. Leer las filas del contrato; separar las SIMULADAS (b, G1).
  2. Puerta de calidad por fila → variable_id (o «sin variable de equipo»),
     clase de dispositivo c, nivel de calidad N0–N4, contexto.            (a, b)
  3. Por variable con observación vigente: z poblacional, z personal,
     z reciente, delta de tripulación, CUSUM → estado de la variable.     (c, e)
  4. Por padecimiento: activaciones, T_p, ΔL_p, cobertura, capas fijas.   (d, g)
  5. Semáforo y motivo.                                                   (f)
  6. Aprendizaje (solo después del paso 5, con cuarentena).               (e)
  7. Salida: color, variables que aportan, faltantes, capas fijas,
     etiquetas y «se recomienda revisión por el cirujano de vuelo».
```

---

## (a) Mapping of existing models → variables → conditions

### a.1 Actual status of the models [INV]

- **ECG** (`ecg`): the only adapter actually executed (Linux/CPU, records mitdb 100/201/203 and afdb 04015). It can contribute **now**, with the caveats in a.2.
- **Echo** (`panecho`, `echonet_dynamic`, `echoclip`, `echoprime`, `medsam2`): load test with dummy data only. **No real inference exists.** The algorithm must work without these rows and accept them when they exist, always with quality level N4 (see b) until there is validation.
- There is no PPG or watch adapter. Sensor data enter through `sensores/importador.py` (a.4).

### a.2 Outputs with a team variable

The links (condition, weight, level) were copied from [PV] and verified one by one.

| Model · metric | Unit · type · contract quality | `variable_id` | Links in [PV] (condition: weight, level) | How it enters |
|---|---|---|---|---|
| `ecg` · `heart_rate` | bpm · medicion · `ok` or `sin_dato` | `01:V3` **only if the record is declared at rest or during sleep**; otherwise `04:A4` (instantaneous HR) | `01:V3`: P03 (2, B); P04 (2, A); P05, P06, P07, P08, P09, P10 (1, C each). **It is not linked to P01** (correction 1 of [PAD]) **nor to P02**. `04:A4`: no links | Measurement. Level N1 at rest with rhythm not flagged as irregular; N2 otherwise (b.3). Not counted three times with `03:V18` or `04:A4` |
| `ecg` · `hrv_rmssd`, `hrv_sdnn` | ms · medicion | `03:V17` (canonical). The prototype contract labels them "V43" (= `01:V43`, a duplicate with no links): treated as an alias | P09 (2, C; direction "↓ HF / ↑ LF") | **A single contribution** (not two). Decision metric: ln RMSSD [P·S14]; SDNN informational only. The adapter does not produce LF/HF |
| `ecg` · `qtc_bazett` | ms · medicion · `experimental_delineacion_dwt` (never `ok`) | `01:V34` | P01 (2, B; Rautaharju criterion) | N4: the link is evaluated as level C; it does not update the baseline; it cannot produce RED on its own. Not evaluable if the rhythm is flagged as irregular |
| `ecg` · `pr_interval` | ms · medicion · `experimental_delineacion_dwt` | `01:V35` | P01 (1, C) | N4. In addition, `01:V35` is **pre-post only** in astronauts [VMA] |
| `ecg` · `latidos_irregulares` | beats · hallazgo · `experimental_criterio_rr_prematuridad` | **Not one-to-one**: proxy for `01:V32` and/or `01:V33` (the RR criterion does not distinguish supraventricular from ventricular [CON]) | `01:V32`: P01 (2, C). `01:V33`: P01 (3, C) | **A single contribution**, with the lower weight of the two (2, C) [P·S12]. It is never counted as `01:V33`. N4. It goes in the same correlation group as the flag (d.3) |
| `ecg` · `ritmo_irregular_compatible_fa` and `ritmo_irregular_fraccion_ventanas` | flag 0/1 · regla_alerta · `BANDERA_EXPERIMENTAL_NO_DIAGNOSTICO`; fraction 0–1 · hallazgo | `01:V31` (proxy) | P01 (3, A; Perez 2019 / Taggar 2016) | **The flag does not inherit level A.** It enters as N4 → level C (σ = 1.5), without the Taggar LR (d.2). The two rows are the same evidence: the flag is used; the fraction is descriptive. Empty flag = `sin_dato`, not 0 |
| `panecho` · `EF`; `echonet_dynamic` · `EF`; `echoclip` · `feve`; `echoprime` · `ejection_fraction` | % · medicion (EchoCLIP: `zero_shot_por_similitud`; EchoPrime: `recuperacion_por_vecinos_no_calibrado`) | `01:V18` (LVEF) | `01:V18` is in [PV] (P01 and P02, weight 1, evidence C) | **Enters the score as an N4 link of weight 1 in P01 and P02** (terrestrial criterion Lang 2015: LVEF <52% M / <54% F); it cannot produce RED on its own. Several models on the same day: median across models and the discordance gate a.5.4 (D > 10 pp = "discordant", does not activate). R1 remains a demonstration layer (a.6). In astronauts: yes, in flight (Hamilton 2011, ISS, n = 6; [VMA] corrected on Nov 15, 2026) |
| `panecho` · `LVSV` | cm³ (≡ mL) · medicion | `01:V4` (stroke volume) | P02 (1, C; ↓) | N4. The unit is identical; what is **not** demonstrated is that the model's estimate is comparable with the in-flight method (rebreathing / echocardiography) [P·S15] |
| `panecho` · `LVEDV` | cm³ · medicion | `01:V17` (**partial**: the variable is "mass and end-diastolic volume"; the model does not provide mass) | P02 (1, C; ↓) | N4. `01:V17` is **pre-post only** [VMA] |
| `panecho` · `LAVol` | cm³ · medicion | `01:V36` (left atrial volume; ID verified in [VMA]) | P01 (1, C; ↑) | N4. `01:V36` is **pre-post only** (MRI) [VMA] |

Consequence: with the current tables, the echo models can only contribute three links of weight 1 and level C (two to P02, one to P01). No mapping to SANS, stones, bone or others is forced.

### a.3 Outputs **without a team variable** (stored and displayed; they do not enter any score)

| Model | Outputs | Reason |
|---|---|---|
| `panecho` | GLS; LVESV; LVSize; LVWallThickness (2); LVSystolicFunction; LVWallMotionAbnormalities; IVSd, LVPWd, LVIDs, LVIDd, LVOTDiam; LVDiastolicFunction; E/e'; RVSP; RVSize; RVSystolicFunction; RVIDd; TAPSE; RVSVel; RASize; RADimensionM-L; AVStructure; AVStenosis; AVPkVel; AVRegurg; LVOT20mmHg; MVStenosis; MVRegurgitation; TVRegurgitation; TVPkGrad; RAP-8-or-higher; AORoot; pericardial-effusion | There is no equivalent variable in [VMA]. LVESV and the LV diameters are "related" to `01:V17`, but they are neither the mass nor the end-diastolic volume |
| `panecho` | LASize (multiclass), LAIDs2D (cm) | Related to `01:V36`, but they are not a volume. They are not converted |
| `echoprime` | `left_atrium_dilation` | Fraction of neighbors, not a volume: it is not mapped to `01:V36` |
| `echoprime` | `dilated_ivc` | The candidate variable `01:V16` is a **diameter**; the output is a fraction of neighbors 0–1. In addition, `01:V16` has no links in [PV] and is analog-only |
| `echoprime` | The other 18 phenotypes (impella, pacemaker, valvular diseases, `pericardial_effusion`, `pulmonary_artery_pressure_continuous`, etc.), the per-video view and the retrieved report | No team variable. The report is text from other studies |
| `echoclip` | `similitud_texto`; zero-shot binaries (e.g., pacemaker) | Cosine similarity: it is neither a probability nor a measurement. The authors' 0.298 threshold stays in `raw_output` |
| `echonet_dynamic`, `medsam2` | Areas in px², systole frames, masks | **No physical calibration.** They are not converted to mL, mm or cm. Permitted use: quality control and relative tracking within the same study and crop (c.6) |
| `ecg` | `heart_rate` outside rest | Goes to `04:A4`, which has no links |

No composite variables are derived (e.g., cardiac output = LVSV × HR → `01:V5`) at this stage; moreover, `01:V5` has no links.

### a.4 Sensor importer inputs (these are not models)

| Importer variable | `variable_id` | Note |
|---|---|---|
| `heart_rate` | `01:V3` only with rest or night context; otherwise `04:A4` | PPG watch: N2 |
| `hrv_rmssd`, `hrv_sdnn` | `03:V17` | A single contribution |
| `spo2` | `04:A3` | Wrist or garment: N2 |
| `bp_systolic`, `bp_diastolic` | `01:V1` | Without a validated cuff: N4 |
| `temp_body` | `04:A1` | Oral: accuracy not evaluated [PAD] |
| `temp_skin` | None as an absolute value | Skin is not body temperature [PREC]. Only a personal trend from the same sensor; not used for "fever" |
| `sleep_duration` | `03:V30` | Actigraphy: N2 |
| `sleep_efficiency` | `03:V34` | Accuracy not evaluated |
| `steps`, `active_minutes` | No link (`01:V29` is not in [PV]) | Context only (rest / activity) |
| `symptom` (free text) | No automatic one | Requires a person to code it to a symptom variable |

### a.5 Several models for the same metric (LVEF)

1. **They are not averaged** (same as `comparar_modelos` [REG]). They are shown side by side with their `quality`.
2. From PanEcho only the `nivel_estudio_agregado` row is used (not the `nivel_video` ones), to avoid double counting.
3. If in the future a link needs a single value: the **median** of the admitted models, with spread D = maximum − minimum (percentage points), and the label "single model" if there is only one [P·S16].
4. **R2 is wrapped as a quality gate:** if D exceeds the tolerance (10 points in [REG], a demonstration value), the metric is marked "discordant", activates nothing and is not learned from.
5. **Agreement does not raise the quality level.** Models agreeing does not prove accuracy; EchoCLIP and EchoPrime have the same provenance (Cedars-Sinai license [INV]), so their errors may be correlated (not verified).
6. EchoCLIP is admitted to the comparison only if the declared view is apical (manifest warning, not verified here); EchoNet-Dynamic only with A4C.

### a.6 Relationship with the five demonstration rules R1–R5 [REG]

The parameters remain **demonstration values, without validation**, as the code itself states.

| Rule | What happens to it | Detail |
|---|---|---|
| R1 (LVEF < 40%) | **Kept as a separate layer** | It does not enter the traffic light: the 40% is not validated in astronauts. Shown as a demonstration notice |
| R2 (discrepancy between models) | **Wrapped** | Becomes the gate of a.5 item 4. The tolerance remains a demonstration value |
| R3 (nighttime HR ≥ baseline + 4 bpm, 2 nights; inspired by Alavi 2022) | **Wrapped and its baseline corrected** | Its current baseline is the median of the previous 7 days, without excluding alerted nights: this allows an anomaly to be learned as normal. In this specification the baseline comes from (e). The detector is kept as an activation of `01:V3` in P04, labeled [experimental] |
| R4 (echo older than 72 h) | **Wrapped** | Becomes the validity rule of (g). The 72 h remain provisional |
| R5 (R1 ∧ R3) | **Kept as a separate layer** | Source cross-checking is done by the score of (d). R5 does not enter the traffic light |

### a.7 `quality` and `simulated`

- `simulated = true`: the row goes to a separate channel (b, G1). It does not feed baselines, CUSUM, crew statistics or the real traffic light.
- `quality` determines the level N0–N4 (b.2). An empty value with `sin_dato: <motivo>` is a missing value with a reason, **never a 0**.

---

## (b) Quality gate per sensor

### b.1 Admission steps

| Step | Rule | If it fails |
|---|---|---|
| G0 Contract | The 14 columns; empty `value` ⇔ `quality` starts with `sin_dato`. A `prueba_de_carga` row should never arrive [CON] | Rejected (N0). A 0 accompanied by `sin_dato` is a contract violation |
| G1 Simulation | `simulated = true` → SIMULATED channel | The real traffic light ignores it. Demonstration mode shows it with "[DATOS SIMULADOS]" (simulated data) |
| G2 Mapping | Metric → `variable_id` according to (a). Never to a merged pointer (`01:V27`, `02:V75`, `04:A5`) | "No team variable": stored, not scored |
| G3 Type | `probabilidad_clase` and `similitud` are never treated as a measurement or as a clinical probability | Descriptive only |
| G4 Level | Assign N1–N4 by variable, device class and `quality` (b.2, b.3) | — |
| G5 Unit and domain | Expected unit; impossible values (SpO2 > 100%, fraction outside 0–1, negative duration). For the HR of the ECG adapter, its own RR limits (0.25–3.0 s [CON]) are equivalent to 20–240 bpm | N0 |
| G6 Context | Rest / sleep / exercise / EVA / medication. A "resting" variable measured during activity is not admitted as such | Reassigned (e.g., to `04:A4`) or N0 |
| G7 Duplicates | Same person, variable and window: a single observation. The best level wins; on a tie, the most recent `run_id` [P·S20] | — |

### b.2 Quality levels and their effect

Quality **downgrades the evidence level of the link, not its weight**. This reuses the team's scale (`prior_de`: A = 0.5, B = 1.0, C = 1.5 [PAD]) and no multipliers are invented.

| Level | When | Evidence level of the link | Does it update the personal baseline? | Does it enter published scores? | Does it count toward the coverage that allows GREEN? |
|---|---|---|---|---|---|
| **N1** high / reference | "High" verdict in [PREC], or declared reference instrument | The one in the table | Yes | Yes | Yes |
| **N2** medium / trend | "Medium" verdict | Drops one step (A→B, B→C) | Only the baseline of **its own device class**, marked "trend" | No | Yes |
| **N3** unknown | (a) "low due to evidence" in [PREC] (cabin CO2, symptoms other than PHQ-9): drops one step. (b) No accuracy evaluation (295 of the 350 links): the one in the table, with the mark "accuracy not evaluated" | According to (a) or (b) | Only if the quality declared by the adapter or by whoever enters the data is good | Yes, when the score requires exactly that modality (questionnaire items, manually taken vital signs) | Yes |
| **N4** low due to measured error, experimental, or unvalidated model | Cuffless; sleep stages; spot core temperature; PR/QTc from the adapter; rhythm flag; RR criterion; **every echo model output**; discordant metric (R2) | Forced to C | **Never** | **Never** | **No** |
| **N0** rejected | G0, G5 or G6 | — | — | — | — |

Two additional rules for N4: (1) a condition cannot reach RED if all of its active links are N4; (2) a negative N4 result does not support a GREEN (e.g., flag = 0 rules nothing out).

For N3(b) no error threshold is invented: the gate is "quality declared by the adapter / unknown".

### b.3 Assignment by variable (only the 10 variables covered by [PREC])

| Variable | N1 | N2 | N3 | N4 |
|---|---|---|---|---|
| Resting HR `01:V3` | ECG in garment or Holter, at rest (LoA −3.2 to +2.9 bpm, Villar 2015). The `ecg` adapter output is admitted here by analogy [P·S13] | PPG watch at rest (MAE 7.2 bpm); garment in motion (−1.77 ± 7.22 bpm); ECG with rhythm flagged as irregular | — | PPG during activity: not admitted as resting HR |
| Irregularity `01:V31` | ECG or Holter read by a person [P·S13] | PPG with repeated confirmation (PPV 0.84 and 98.2%; no population sensitivity) | — | `ecg` adapter flag (Dash 2009 without the missed-RR branch) |
| SpO2 `04:A3` | Finger oximeter (reference according to [PREC]; no figure of its own) | Wrist or garment (bias 0.8%, LoA −2.7 to +4.1; Astroskin overestimates by ~3% in hypoxia, n = 2) | — | — |
| Respiration `04:A2` | Chest bands at rest (1 ± 3 breaths/min) | Maximal exercise (2 ± 7 breaths/min); derived from abdominal band (−0.32 ± 5.27) | Manual count | — |
| Temperature `04:A1` | — | Garment skin: only as a trend from the same sensor | Oral (accuracy not evaluated [PAD]) | Estimated core as a spot value (+0.34 ± 0.2 °C; "not accurate enough", Gunga 2009) |
| Core temperature `03:V47` (circadian phase) | — | Dual sensor or estimate, **for rhythm only** | — | Spot value |
| BP `01:V1` | Cuff with ISO 81060-2 validation (no specific model verified [PREC]) | — | Cuff without declared validation | Cuffless (−2.13 ± 11.57 mmHg; the ESH advises against clinical use) |
| Sleep `03:V30` | — | Actigraphy, duration (sensitivity 0.965, specificity 0.329) | — | Stages from consumer devices |
| PVT `03:V66` | — | PVT-B on laptop | PVT on watch (latency not quantified) | — |
| CO2 `04:A23` | — | — | Cabin analyzer, CDM, PCO2M ("low due to evidence", not because of the sensor) | — |
| Symptoms | PHQ-9 | — | Other self-reports | — |

Warnings the gate must always display: no wearable is validated in microgravity [PREC]; wrist SpO2 tends to overestimate in hypoxia, so a normal N2 value does not rule out P03.

---

## (c) Normalization and deviation per variable

### c.1 Observation unit

- Continuous vital signs (HR, HRV, resp. rate, SpO2): one value per day = median of the rest or sleep segments [P·S20]. To compare HRV with the population norm, 5-min windows at rest are used (the adapter already reports 300 s windows); the RMSSD or SDNN of a complete long record is not comparable with Nunan 2010.
- Counts (extrasystoles): rate = n × 24 h / analyzed duration (beats per 24 h). Extrapolating a short record is an assumption and is labeled "extrapolated rate" [P·S12].
- Tests and questionnaires: the result of each administration.

### c.2 Population z (Layer 1)

`z_pob = (x − m_pob) / s_pob`, with m_pob and s_pob by age, sex and BMI **only where [IP§c] gives the range**. Everything is [terrestrial] and not validated in microgravity.

| Variable | Reference from [IP§c] | How it is used | Gaps |
|---|---|---|---|
| Resting HR `01:V3` | NHANES 5th/50th/95th percentiles (Ostchega 2011): 20–39 years ♂ 52/69/89, ♀ 57/74/95; 40–59 years ♂ 52/68/90, ♀ 56/71/92 bpm | Asymmetric z: m_pob = P50; s_pob = (P95 − P50)/1.645 if x ≥ P50, and (P50 − P5)/1.645 if x < P50 (assumes each side is half of a normal distribution [P·S14]). Example ♂ 20–39: 12.2 bpm upward and 10.3 downward | No range for < 20 or ≥ 60 years. No BMI adjustment (Quer 2020: age, sex, BMI and sleep explain < 10%; it gives no coefficients) |
| BP `01:V1` | ACC/AHA 2017 categories (normal < 120/< 80; elevated 120–129/< 80; stage 1 HTN: 130–139 or 80–89; stage 2 HTN: ≥ 140 or ≥ 90) | **Ordinal category, not z** | No distribution and no low-BP range. No adjustment for age, sex or BMI |
| SpO2 `04:A3` | NEWS2 Scale 1: ≥ 96 → 0; 94–95 → 1; 92–93 → 2; ≤ 91 → 3 | **Ordinal band, not z** (ceiling effect) | Trends by age, BMI and sex (Apple 2023) without coefficients. At night it is 0.8% lower. The cabin atmosphere changes what is expected [PREC] |
| Temperature `04:A1` | Obermeyer 2017: mean 36.6 °C; 95% range 35.7–37.3; −0.021 °C per decade; +0.002 °C per kg/m² | m_pob = 36.6; s_pob = (37.3 − 35.7)/(2 × 1.96) ≈ 0.41 °C | The reference age and BMI of the cohort are not in the tables: the adjustment stays inactive until they are available [P·S14] |
| Resp. rate `04:A2` | NEWS2: 12–20 breaths/min = 0 points | **Within / outside range, not z** | No distribution or adjustment |
| HRV `03:V17` | Nunan 2010 (5 min): RMSSD 42 ± 15 ms; SDNN 50 ± 16 ms | On a log scale, because of the skewness [P·S14]: ln RMSSD with m = 3.68 and s = 0.35; ln SDNN with m = 3.86 and s = 0.31 (moments of a lognormal with Nunan's mean and SD) | Values by sex and decade (Voss 2015, Umetani 1998) not transcribed: no age adjustment |
| QTc `01:V34` | Rautaharju 2009: prolonged ≥ 450 ms (♂) / ≥ 460 ms (♀); short ≤ 390 ms | **Criterion, not z** | — |
| All others | **No range in the tables** | Population branch **inactive**; only personal z and, where applicable, crew are used | — |

BMI is computed from mass (`01:V8`) and height (`02:V61`); there is no BMI variable in [VMA].

### c.3 Personal z (Layer 2)

Baseline per **(crew member, variable, device class)**: classes are never mixed (a wrist SpO2 baseline is different from a finger one).

**Frozen pre-flight baseline.** With n0 admitted and stable pre-flight observations (minimum 5, Coskun 2021 via [IP§d]):

- mean shrunk toward the population or the crew (Sottas 2007):
  `μ_i = B · m_ref + (1 − B) · x̄_i`, with `B = (s_w²/n0) / (s_w²/n0 + s_b²)`
  - x̄_i: the person's pre-flight mean (or median); m_ref: population mean from c.2 or, if it does not exist, the crew's pre-flight mean;
  - s_w: within-person SD; s_b: between-person SD. With little data, s_w is taken from the pooled crew and with more data, from the person themselves (Coskun). The only s_w figure in the tables is the median weekly variation of 3 bpm for watch HR (Quer 2020); the rest is estimated [P·S5].
- predictive variance: `s_i² = s_w² + B · s_b²`. With n0 = 0, B = 1 and the formula reduces to the population z; with each data point the reference narrows.
- dispersion floor: `s_i ≥` sensor error when [PREC] gives it (e.g., 3 breaths/min for resting resp. rate). Without a figure, no floor is set.

**Anchored, phase-adjusted z** (the one that decides):

`z_fase = (x − μ_i − δ_vφ) / s_i`

- δ_vφ: expected shift of variable v in phase φ, in the unit of v; δ = 0 in PRE. See (e.4) for when δ ≠ 0 is allowed.

**Recent z** (detects acute events and protects learning):

`z_act = (x − m_i(t)) / s_i`, with m_i(t) the protected adaptive mean from (e.3).

**Error of the z itself** (approximation): `Var(z) ≈ 1/n0 + z²/(2·(n0 − 1))`. It is propagated to the activation in (d.4).

### c.4 Delta relative to the crew (Layer 3; context)

For crew member i, with the other n − 1 crew members in the same phase and window:

`Δ_trip = (x_i − x̄_−i) / (s_−i · √(1 + 1/(n − 1)))`

- x̄_−i and s_−i: mean and SD of the others (i is excluded).
- With small n, Δ_trip follows a Student's t with n − 2 degrees of freedom, not a normal: it is converted to an equivalent z with the same percentile before comparing it with any cutoff.

| Crew size n | What is done [P·S6] |
|---|---|
| n ≤ 3 | Branch **inactive** (with n = 3 there is 1 degree of freedom left and no power) |
| 4 ≤ n ≤ 6 | Descriptive only: it is displayed, it activates nothing. In Mars-500 the responses of the 6 crew members varied widely [IP§d] |
| 7 ≤ n ≤ 14 | The label "isolated deviation" is allowed when the equivalent z exceeds ±1.5 (**provisional** generalization [P·S1]) |

**Only cutoff with a NASA source:** cognition (`03:V68`), z ≤ −1.5 relative to the sample's pre-flight mean (NTRS 20240012108 [IP§d]):
`z_cog = (x_i(t) − m_pre) / s_pre`, with m_pre and s_pre the crew's pre-flight mean and SD on that test. If n does not allow s_pre to be estimated, it is applied to the personal baseline and labeled "variant of the criterion".

Permitted uses of Layer 3: (1) the cognition criterion; (2) the label "shared deviation" when at least half of the crew deviates on the same variable and window [P·S6], which points toward an environmental cause (P03, P05, P07); (3) the label "isolated deviation". It **never** changes a baseline, **never** silences an individual alert because "everyone is the same", and the −1.5 is not copied to BP or SpO2 as if it were official.

### c.5 State of each variable

| State | Condition | Source of the cutoff |
|---|---|---|
| Normal | adverse deviation u < 1.5 | [P·S1] |
| Deviated | 1.5 ≤ u < u1 | generalization of the −1.5 from Cognition [P·S1] |
| Alerted | u ≥ u1, with u1 = 2.33 (one-direction variable) or 2.58 (two directions): p < 0.01 | "yellow with p < 0.01" [IP§d]; assumes normality [P·S2] |
| Persistent | alerted for ≥ 24 h, or at the next scheduled measurement if the variable is not daily | "red if it persists 24 h" [IP§d] |
| Drift | CUSUM signaling (e.5) with no alerted point | — |

u is the deviation in the adverse direction of the link: `u = z_fase` if the direction is ↑; `u = −z_fase` if it is ↓; `u = |z_fase|` if it is "↑/↓", "change" or "altered".

### c.6 Units and transformations

- **GLS (PanEcho):** the stored value is −1 × the raw output. The sign is not changed again and, until this is checked with a real inference, the adverse direction is defined on |GLS| [P·S15]. Today GLS has no team variable.
- **Fractions 0–1** (fraction of neighbors, uncalibrated softmax or sigmoid, fraction of windows): they are neither z-scores of a physical measurement nor clinical probabilities. They are not converted to cm, mL or %.
- **Cosine similarity:** descriptive only.
- **px²:** no physical conversion. Only use: ratio against its own value from the same study and crop (e.g., minimum area / maximum area) as quality control.
- **cm³ and mL:** the same unit. The caveat is about method, not unit (a.2).
- **Ordinal bands** (SpO2, BP, resp. rate): used as categories; no population z is computed for them.

---

## (d) Score per condition

The score has **two channels that are not added together** and a coverage. Published scores are kept separate (d.6).

### d.1 Activation of a link

Each link (p, v) is classified by the text of its `direccion` column. The classification of the 350 rows is a pending configuration table [P·S10].

| Type | Examples of `direccion` | Activation a_pv |
|---|---|---|
| One direction | ↑, ↓ | ramp: 0 if u ≤ 1.5; 1 if u ≥ u1; linear in between |
| Two directions | ↑/↓, change, altered | same, with u = \|z\| and u1 = 2.58 |
| Presence | present, positive, use | 1 if reported present; 0 if reported absent; NA if not asked |
| Published criterion | see next table | 1 if met; otherwise, the ramp |
| Phase-dependent | "↑ in flight / ↓ post-flight", "third quarter" | the sign or the condition changes with φ |
| Not automatic | "atypical pattern", "phenotype", "clinical finding" | only if a person codes it |
| Context or predisposition | history, contraception, QT-prolonging drugs, prior susceptibility | 1 if present, but it **cannot trigger on its own** (f.1) |

**Published criteria that are in the tables** (the others are not used as criteria):

| Variable | Criterion | Source | Scope |
|---|---|---|---|
| `01:V34` QTc | ≥ 450 ms ♂ / ≥ 460 ms ♀, or ≤ 390 ms | Rautaharju 2009 [PV] | [terrestrial] |
| `01:V47` orthostatic drop | ≥ 20/10 mmHg within 3 min | Freeman 2011 [PV] | [terrestrial] |
| `01:V48` HR on standing | ≥ 30 bpm | McGee 1999; Freeman 2011 (POTS, within 10 min) | [terrestrial] |
| `03:V68` Cognition | ≤ −1.5 SD relative to pre-flight | NTRS 20240012108 | [spaceflight] |
| `03:V1` PHQ-9 | ≥ 10 | Kroenke 2001 | [terrestrial] |
| `04:A23` CO2 | 7-day mean ≥ 2.5 mmHg (outside the < 1% headache-risk zone) | Law 2014 | [spaceflight] |
| `04:A3` SpO2 | NEWS2 band with 3 points (≤ 91%) | RCP NEWS2 [IP§c] | [terrestrial] |
| `04:A2` Resp. rate | outside 12–20 breaths/min | RCP NEWS2 [IP§c] | [terrestrial] |

The PVT lapse ≥ 355 ms is the definition of a lapse, not a cutoff on the number of lapses: `03:V66` is evaluated by z.

### d.2 Bayesian channel (only links with a published LR or OR)

`ℓ_p = ℓ0_p + ΔL_p`, with `ΔL_p = Σ_v κ_v · ln LR_v(resultado)`

- ℓ0_p = ln(π_p / (1 − π_p)): prior log-odds, with π_p the prevalence (d.5).
- κ_v = 1 only if the measurement is of the same type as that of the source study; otherwise, κ_v = 0 and the link contributes only through the weight channel. No intermediate discounts are used.
- The sum assumes conditional independence. **Today no condition has more than one link with a figure**, so the assumption is not yet put to the test.

The six links with a figure in [PV]:

| Link | Figure in the table | Derived LR | ln LR | When κ = 1 |
|---|---|---|---|---|
| P01–`01:V31` | Sens 92%, spec 82% (irregular pulse on palpation; Taggar 2016) [terrestrial] | LR+ = 0.92/0.18 = 5.1; LR− = 0.08/0.82 = 0.10 | +1.63 / −2.33 | Irregular pulse on palpation or a record read by a person. **Never** with the adapter flag |
| P09–`03:V1` | Sens 88%, spec 88% (PHQ-9 ≥ 10; Kroenke 2001) [terrestrial] | LR+ = 7.3; LR− = 0.14 | +1.99 / −1.99 | Complete PHQ-9. It refers to major depression; applying it to all of P09 is an assumption [P·S9] |
| P02–`01:V48` and P13–`01:V48` | LR+ 1.7 (postural pulse increase ≥ 30 bpm; McGee 1999) [terrestrial] | LR− not published in the tables | +0.53 / 0 | Standing test under gravity (pre-post only). A negative contributes 0 |
| P04–`04:A1` | LR+ 1.8 (fever, influenza; Call 2005) [terrestrial] | LR− not published | +0.59 / 0 | "Fever" needs a definition; it is not in the tables. Provisional: N1 or N3 body temperature > 37.3 °C (upper limit of the Obermeyer range) [P·S9] |
| P07–`04:A23` | OR × 2 for headache per +1 mmHg (Law 2014) [spaceflight] | ΔL = ln 2 × (c̄7 − 2.5), with c̄7 the 7-day mean ppCO2 in mmHg | 0.69 per mmHg | Cabin sensor. The anchor (1% risk at 2.5 mmHg) and the time unit of that risk are our own reading of the abstract [P·S9] |

**Uncertainty.** The tables do not include confidence intervals for these LRs. The relative uncertainty the team already assigned to the link is used: `DE(ln LR_v) = |ln LR_v| × σ_pv / μ_pv` [P·S8]. Example: Taggar (weight 3, level A): 1.63 × 0.5/3 = 0.27. `Var(ΔL_p) = Σ DE²`; `Var(ℓ_p) = Var(ℓ0_p) + Var(ΔL_p)`.

If the measurement falls within its error of the criterion threshold, the result is "indeterminate" and contributes 0.

### d.3 Weight channel (all links; it is the only one for the 310 at level C)

The weight is treated as **weak evidence with uncertainty**, not as an LR: `w_pv ~ Normal(μ_pv, σ_pv²)`, truncated at 0, with σ_pv according to the effective level after the gate (b.2).

**Correlation groups.** Variables that measure almost the same thing are not added together: within a group g only the largest contribution counts.

- Declared in [PAD]: {`03:V82`, `03:V83`, `04:A6`} (headache); {`01:V3`, `04:A4`} (HR).
- From this document: {`01:V31` flag, `latidos_irregulares`} (in AF the RR criterion flags many beats [CON]); {`hrv_rmssd`, `hrv_sdnn`}.
- The rest (e.g., sleep duration by actigraphy, diary and `04:A40`; BMD, T-score and Z-score) must be declared by the team [P·S11].

`T_p = Σ_g max_{v∈g} (μ_pv · a_pv)`  (weight points)

Only links with current data enter; NAs do not add 0, they are left out and reduce coverage (g).

### d.4 Uncertainty of the weight channel

With the chosen member of each group (marked with *):

`Var(T_p) ≈ Σ_g [ a*² · σ*² + μ*² · Var(a*) ]`

- first term: uncertainty of the weight (dominates at level C);
- second: uncertainty of the measurement; `Var(a) ≈ Var(z) / (u1 − 1.5)²` within the ramp and 0 outside it.

`T_p` is reported with an approximate 90% interval: `T_p ± 1.645 · DE(T_p)`, and the lower bound `T_p^inf = max(0, T_p − 1.645 · DE(T_p))`. This is a normal approximation with independent groups; **it is not a calibration**.

Intended effect: a single link of weight 3 gives T = 3 at any level, but T^inf = 2.18 if it is A, 1.36 if it is B and 0.53 if it is C. Level C evidence raises an alert, but it is not convincing on its own.

### d.5 Prior prevalence π_p

Only where [PAD] gives a figure. These are mission or phase prevalences, not per-window probabilities: using them as π_p is an assumption [P·S7]. For proportions x/n, `ℓ0 = ln((x + 0.5)/(n − x + 0.5))` and `Var(ℓ0) = 1/(x + 0.5) + 1/(n − x + 0.5)` are used.

| Condition | Data from [PAD] | ℓ0 ± SD | Phase in which it applies |
|---|---|---|---|
| P02 | Presyncope 5/6 after Mir; 1/6 after Shuttle (Meck 2001) | +1.30 ± 0.92 (long duration); −1.30 ± 0.92 (short) | POST only |
| P04 | 3.40 events per flight-year (Crucian 2016) | π(Δ) = 1 − exp(−λ·Δ), λ = 3.40/365.25 per day; with Δ = 7 d, π = 0.063 and ℓ0 = −2.70. Assumes a constant rate [P·S7] | Flight |
| P07 | Headache in up to 90% during the first days (MTB-004); Law 2014 anchor | Anchor from d.2 | VT (context) and flight |
| P11 | 1/11 with occlusive thrombus (Marshall-Goebel 2019) | −1.95 ± 0.87 | Flight |
| P12 | 18% with clinically relevant SANS; 70% with ≥ 1 sign (MTB-001) | −1.52; SD not derivable (no n) | Flight |
| P16 | 57/85 on first flight (Davis 1988); up to 73% during the first 2–3 days | +0.70 ± 0.23 | VT |
| P10, P13 | Counts without a denominator ("0 type II events"; "8 post-flight out of 43") | **Not derivable** | — |
| P05 | Mean sleep 5.96–6.09 h; hypnotics in 75% | Not a prevalence of the condition: context only | — |
| P01, P03, P06, P08, P09, P14, P15, P17–P20 | Empty | **No prior** | — |

Without a prior, no number is invented: only ΔL_p is reported, labeled "prior not available".

### d.6 Published-score layers (in parallel, not mixed)

- They are not retrained, and their points or charts are not modified. They are computed **only with all their inputs present** and at level N1 or N3; if one is missing, the state is "incomplete: X missing". An item is never imputed.
- **They do not change T_p or ΔL_p.** They are shown next to the score with their label.
- Bands or cutoffs that are not in the tables are not re-transcribed here: they are taken from the publication cited in [IP§a].

| Score | Scope | Condition it is shown next to | Inputs and status with the team's current list |
|---|---|---|---|
| NEWS2 | [terrestrial] | P03, P04 | Resp. rate `04:A2`, SpO2 `04:A3`, SBP `01:V1`, pulse `01:V3`/`04:A4`, temperature `04:A1`. **Missing as team variables:** supplemental O2 and level of consciousness → currently "incomplete" unless entered manually |
| qSOFA | [terrestrial] | P04 | SBP ≤ 100, resp. rate ≥ 22, altered mentation. There is no mentation variable; substituting the PVT would give a derived score that **is not qSOFA** and must be named as such |
| Lake Louise 2018 | [terrestrial] | P03 (shares symptoms with P16 and P07) | Four items 0–3 with their own wording; they are not derived from the 0–10 headache scale. AMS = ≥ 3 with headache ≥ 1 after ≥ 6 h |
| Conkin (DCS) | [spaceflight: chamber] | P10 | **Inactive.** TR, prebreathe, suit pressure, ambulation and EVA time are missing (gap in [PAD]). The formula is not computed or reconstructed from the coefficients |
| PHQ-9 | [terrestrial] | P09 | 9 items. No documented use in astronauts [VMA] |
| Centor | [terrestrial] | P04 | Fever `04:A1`, throat `04:A19`; there is no lymph-node or cough variable → "incomplete" |
| STONE | [terrestrial] | P13 | Hematuria `04:A22c`, colic `02:V37`; the race item does not apply [IP§a] → no total is given; the items are shown |
| Constans | [terrestrial; upper limb] | P11 | Only as an analogy; not validated in the neck or in flight |

No score is validated in microgravity [IP§e].

### d.7 Check examples (hypothetical values, only to verify the arithmetic)

**P01 with only the ECG adapter:** flag = 1 (weight 3, N4 → C); QTc meets the criterion (weight 2, N4 → C); many irregular beats (same group as the flag, does not add).
T = 3 + 2 = 5; SD = √(1.5² + 1.5²) = 2.12; T^inf = 1.51. Result: YELLOW, with the text "confirm with an ECG read by a person". It cannot be RED (everything is N4).

**P04 with resting ECG HR and an oral thermometer:** HR alerted (weight 2, A, N1); temperature alerted (weight 3, B, N3b).
T = 5; SD = √(0.5² + 1.0²) = 1.12; T^inf = 3.16. Bayesian channel: LR+ 1.8, below the cutoff. Result: YELLOW immediately and RED if it persists 24 h.

---

## (e) Self-calibration and safeguards

### e.1 Invariants (normative; any implementation must satisfy them)

1. **The pre-flight baseline is immutable.** It is frozen at launch. No process rewrites it; a human correction creates a new version and preserves the previous one.
2. **Detecting is not learning.** The CUSUM and the z-scores use all admitted points; learning uses only those that pass e.2.
3. **Only a person accepts a "new normal".** The system never adopts it on its own.
4. **Nothing SIMULATED, N4 or N0 enters learning.**
5. **The crew does not redefine anyone's normal.**
6. **Baselines are not mixed across device classes.**

### e.2 Which points can update the adaptive reference

A point enters only if it meets **all** of the following:

| Condition | Detail |
|---|---|
| Quality | N1; N2 only for the baseline of its own class; N3 with declared good quality |
| Not simulated | `simulated = false` |
| Stable | \|z_act\| < 1.5 [P·S1] and in the variable's standard context (rest, night) |
| No alert | No condition linked to the variable is YELLOW or RED, and the variable is neither "alerted" nor "persistent" |
| No trend | The variable's CUSUM is not signaling (Coskun: outliers and trends are excluded) |
| Outside an episode | It does not fall within the window of an episode: reported symptom, rhythm flag, fever, EVA, exercise, drug that alters the variable (e.g., `01:V42`, `03:V87`) |
| Outside a transition | It does not fall within the adaptation period after launch or after landing (e.4) |
| Quarantine completed | 72 h [P·S4] have passed without a subsequent alert appearing; this retroactively excludes prodromal points |

### e.3 Update rule

**Minimum version (protected EWMA):**

`m_i(t) = m_i(t−1) + α · g(t) · (x(t) − m_i(t−1))`

- m_i: adaptive mean, in the unit of the variable; it starts at μ_i (pre-flight baseline).
- g(t) = 1 if the point meets e.2; 0 otherwise (the mean does not move).
- α = 0.1 [P·S3] (effective memory ≈ 2/α − 1 = 19 observations).
- **Cap:** `|m_i(t) − (μ_i + δ_vφ)| ≤ 1.5 · s_i` [P·S3]. When the cap is reached, the mean freezes and the variable moves to "drift": a person decides.

**Target version (hierarchical Bayesian, population → crew → individual):**

`x_i(t) ~ Normal(μ_i + δ_vφ(t), s_w²)`;  `μ_i ~ Normal(m_trip, s_b²)`;  `m_trip ~ Normal(m_pob, s_pob²)`

- μ_i is estimated **with pre-flight data only** (closed-form formula of c.3) and stays fixed.
- In flight only δ_vφ is updated, with points that meet e.2 and within the limits of e.4.
- Both versions must produce the same behavior under the tests of (h.2).

### e.4 Mission phase as a covariate

- Phases: PRE, VT, VTa, POST. The duration of the early phase **is not established** [IP§e]; provisional value 30 days [P·S4], only so that the pipeline can run.
- δ_vφ ≠ 0 **only for variables with a documented expected adaptation**. Candidates with a note in [VMA]: stroke volume `01:V4` (+35% in months 3–6), resp. rate `04:A2` (decreases, n = 8), HRV during sleep `03:V17` (reduced, n = 7). The final list is decided by the team [P·S4].
- For everything else (SpO2, temperature, sleep, PVT, symptoms, bone, muscle, body mass) δ = 0: a change shared by the whole crew is still a deviation. This way a collective bone loss or sleep deficit is not "normalized".
- δ_vφ of crew member i is estimated **without their own data** (median of the others, shrunk toward the prior value) and with a limit around that prior value. With n ≤ 3 only the prior value is used.
- After each phase change there is a period without learning (provisional: 72 h [P·S4]).
- POST data never modify the pre-flight baseline or the in-flight estimates. In POST everything is compared against pre-flight (recovery tracking).

### e.5 Slow trends: CUSUM anchored to pre-flight

Standardized residual in the adverse direction: `r(t) = ± (x(t) − μ_i − δ_vφ) / s_i` (sign according to the direction of the link).

`C(t) = max(0, C(t−1) + r(t) − k)`; signal when `C(t) ≥ h`.

- k = 0.5 and h = 5, in SD units [P·S3] (usual values for the tabular CUSUM; they are not in the tables).
- For two-direction variables, two CUSUMs are kept.
- Without data, C is held (it does not decay). Learning does **not** reset it; only the closing of a human review does.
- Documented equivalents: the individual limits of Sottas 2007 or the set point of Coskun 2021, always anchored to pre-flight.

### e.6 Drift versus event

| | Event | Drift |
|---|---|---|
| Signal | Variable "alerted" at one or a few points, or a reported episode | CUSUM signaling, or EWMA cap, with no alerted point |
| Time scale | Hours to 1–2 days | Days to weeks |
| Effect on learning | The episode and its quarantine are excluded | The adaptive mean is frozen |
| Output | Activation of the link (d.1) | YELLOW "due to drift" if the link weighs ≥ 2 (f.1) |
| Closing | Returns to normal with hysteresis (f.3) | Only by human review, which can record an individual adjustment with date and author |

### e.7 What is never learned as normal

- An irregular rhythm or AF (neither the flag nor the HR or HRV measured during the episode).
- The BP drop or tachycardia after landing, and any orthostatic test.
- Periods with fever, with active symptoms or with a linked condition in YELLOW or RED.
- Sustained sleep deficit, mass loss and cognitive decline (δ = 0 for those variables).
- Values under a drug that alters the variable.
- N4 measurements (cuffless, experimental PR/QTc, echo model outputs) and SIMULATED ones.

---

## (f) Traffic-light thresholds

All cutoffs in this section are **provisional** except where the source is cited. None is validated in astronauts.

### f.1 Common rule

**YELLOW** if at least one is met:

| # | Condition | Justification |
|---|---|---|
| A1 | T_p ≥ 3, with at least one active link that is not context or predisposition | 3 = one fully activated maximum-weight variable, or several smaller ones [P·S2] |
| A2 | ΔL_p ≥ ln 3 ≈ 1.10 | [P·S2]. With the current figures only Taggar (5.1) and PHQ-9 (7.3) reach it |
| A3 | A published criterion from d.1 is met on a link of weight ≥ 2 | Sourced criterion; if the measurement is N4 the text says "confirm" |
| A4 | Drift (e.5) on a link of weight ≥ 2 | [P·S2] |
| A5 | A fixed layer exceeds its own published criterion present in the tables (today: PHQ-9 ≥ 10; Lake Louise AMS definition) | The condition cannot be shown as GREEN; it is labeled "due to fixed layer [terrestrial]" |

**RED** if at least one is met, **and** at least one active link is not N4:

| # | Condition | Justification |
|---|---|---|
| R-1 | T_p^inf ≥ 2 **and** it persists ≥ 24 h (or recurs at the next scheduled measurement) | Persistence from [IP§d]; the cutoff of 2 is [P·S2] |
| R-2 | Lower bound of ΔL_p ≥ ln 10 ≈ 2.30 | [P·S2]. No single terrestrial LR in the tables reaches it: concordant evidence is needed |
| R-3 | Sentinel event reported by a person | List to be decided with the team; candidates: `04:A37` (type II DCS symptoms), `01:V55` (visible thrombus). **No source** [P·S2] |

**GREEN** only if there is no YELLOW or RED condition **and** coverage is sufficient (g.3). Otherwise, **GRAY** ("insufficient evidence").

The demonstration rules R1–R5 do not take part (a.6); echo LVEF enters only as an N4 link of weight 1 in P01 and P02. The 40% of R1 is not used as a threshold.

### f.2 Condition-specific details

"In-flight weight" = sum of the weights of links with `medido_en_vuelo = sí en vuelo` over the total [PV]. "Core" = links of weight 3.

| ID | Usable sourced criterion | Bayesian channel · prior | Fixed layer | In-flight weight / total · core in flight | Note |
|---|---|---|---|---|---|
| P01 | QTc (Rautaharju) | Taggar, only with human reading · no prior | — | 16/21 · 2 of 2 | With only the ECG adapter: YELLOW or GRAY, never GREEN or RED |
| P02 | Drop ≥ 20/10 mmHg; HR +≥ 30 bpm | McGee · Meck 2001 (POST only) | — | 5/24 · 0 of 1 | In flight it is structurally GRAY: it only monitors deconditioning with indirect indicators |
| P03 | NEWS2 SpO2 and resp. rate bands | — · no prior | NEWS2, Lake Louise | 16/16 · 3 of 3 | Law 2014 is not used here (correction 2). Wrist SpO2 (N2) does not produce RED without confirmation |
| P04 | — | Call 2005 · Crucian 2016 | NEWS2, qSOFA, Centor | 39/41 · 1 of 1 | R3 wrapped: nighttime HR with the baseline from (e) |
| P05 | — (the "< 6 h" of `03:V31` is the variable's definition, level C) | — · no prior | — | 42/51 · 3 of 4 | DLMO not measurable in flight; aMT6s is analyzed on the ground |
| P06 | Cognition ≤ −1.5 SD (NASA) | — · no prior | — | 36/49 · 2 of 2 | The only cognition cutoff with a NASA source |
| P07 | CO2: 7-day mean ≥ 2.5 mmHg (Law) | Law (continuous) · own anchor | — | 24/24 · 2 of 2 | The headaches at 2.8–4.5 mmHg from TB-004 are anecdotal. Headache group: counts once |
| P08 | — | — · no prior (no cases) | — (REMM is not implemented: time to vomiting is confounded with P16) | 23/28 · 2 of 2 | There have been no events and there is no symptom record [VMA] |
| P09 | PHQ-9 ≥ 10 | Kroenke · no prior | PHQ-9 | 21/43 · 0 of 1 | PHQ-9 has no documented use in astronauts |
| P10 | — | — · not derivable | Conkin (inactive) | 14/16 · 2 of 2 | Everything is level C: RED requires two independent links of weight 3 or a sentinel |
| P11 | — | — · 1/11 (Marshall-Goebel) | Constans (analogy) | 17/25 · 2 of 3 | D-dimer not available on board |
| P12 | — | — · 18% (MTB-001) | — | 30/44 · 5 of 5 | No symptom LR |
| P13 | — | McGee (pre-post only) · not derivable | STONE (no total) | 41/50 · 5 of 6 | Part of the urine chemistry is analyzed upon return [VMA]: see F6 |
| P14 | — | — · no prior | — | 14/32 · 0 of 3 | Structurally GRAY in flight: there is no densitometry on board |
| P15 | — | — · no prior | — | 20/34 · 2 of 4 | — |
| P16 | — | — · 57/85 (Davis 1988), VT only | — | 6/10 · 1 of 1 | JSC criteria not published |
| P17 | — | — · no prior | — | 14/19 · 1 of 2 | — |
| P18 | — | — · no prior | — | 12/17 · 1 of 1 | — |
| P19 | — | — · no prior | — | 20/20 · 2 of 2 | — |
| P20 | — | — · no prior | — | 14/19 · 3 of 4 | Clinical criteria (ADA) without a source in the tables |

### f.3 Hysteresis and output text

- Going down from YELLOW to GREEN: two consecutive evaluations (or 48 h) without an active condition [P·S2]. Going down from RED: in addition, acknowledgement by a person.
- Every YELLOW or RED output carries: the links that contributed (variable, value, quality level, weight and evidence level), what was missing, the labels [terrestrial] / [experimental] / SIMULATED, and the sentence "This is not a diagnosis. Review by the flight surgeon is recommended".
- **No probability percentage is shown.** ℓ_p is internal and serves only for ordering: first by color, then by T_p^inf and, on a tie, by ℓ_p when the prior has a source.

---

## (g) Missing data and pre/post-only or analog-only variables

### g.1 General rule

No clinical value is imputed. A link without current data is NA: it does not add 0, it does not enter T_p and it reduces coverage. The last known value is shown with its age, but it is not evidence outside its validity period.

### g.2 Types of absence

| State | Definition | Effect |
|---|---|---|
| F1 Not measured in this window | The variable is measurable in the current phase, but there is no current data | NA; lowers coverage |
| F2 `sin_dato: <motivo>` | The adapter ran and could not compute (e.g., flag with too few segments) | Like F1; the reason is kept |
| F3 Pre/post only | `medido_en_vuelo = solo pre-post vuelo` (50 links). Examples: DXA for P14, orthostatic tests for P02, `01:V35` | In flight it is a **structural absence**: it leaves the denominator of in-flight coverage and is reported separately. In PRE and POST it is evaluated normally |
| F4 Analog only | 12 links | Not expected. If a data point arrives (e.g., from an echo model) it enters as N4 |
| F5 No / not found | 33 links (e.g., DLMO `03:V45`, PHQ-9 `03:V1`) | Neither expected nor penalized. If someone enters it, it enters as N3 |
| F6 Pending ground analysis | Sample taken in flight and analyzed upon return ([VMA] counts this as "sí en vuelo") | NA in flight. A latency column is needed that does not exist today [P·S17] |
| F7 Expired | Data older than its validity period | NA; shown as "last known" |

Validity periods, all provisional [P·S18]: continuous vital signs, 24 h; diaries and symptoms, 48 h; cognitive tests, until the next scheduled administration (the RST is done every 4 days [PREC]); echo, 72 h (R4 wrapped, demonstration value); laboratory, until the next sample.

### g.3 Coverage and GRAY state

`Cob_p = Σ (μ_pv de las ligas con dato vigente N1–N3) / Σ (μ_pv de las ligas medibles en la fase actual)`

GREEN requires both conditions [P·S19]:

1. Cob_p ≥ 0.5;
2. at least one core link (weight 3) with current N1–N3 data.

If they are not met and there is no alert, the state is **GRAY** with the reason: "X, Y missing" or "structural: the core only exists pre/post". A condition in YELLOW or RED with low coverage keeps its color and adds "low coverage".

To give an idea of what is unknown, `T_p^máx = T_p + Σ μ_pv de las ligas medibles sin dato` is also reported: the value T_p would have if everything not measured were activated.

---

## (h) Validation plan

No result of this plan is a spaceflight validation. At this stage **no weight of the echo models is trained or tuned**.

### h.1 Arm 1: public terrestrial data

Open-access data only, with no registration or acceptance of terms. Excluded: the EchoNet-Dynamic dataset, LSAH, LSDA and controlled-access OSDR.

| Object | Data | Metrics | Rule |
|---|---|---|---|
| R peaks | PhysioNet records **not used** to choose v2 (others from mitdb and afdb) | Sensitivity and PPV with a 150 ms tolerance (the contract's) | Thresholds frozen before looking at the records; split by record, not by segment |
| Irregular-rhythm flag | The same, plus sinus-rhythm and AF records from other open PhysioNet databases (access conditions to be verified before using them) | Sensitivity, specificity and PPV per segment and per record; false alarms per 24 h in sinus rhythm | The figures for 100/201/203/04015 do not count: they are not independent [INV] |
| RR prematurity criterion | Records with beat annotations | Sensitivity and PPV; supraventricular and ventricular are reported separately to document that it does not distinguish them | — |
| HR and HRV | Annotated versus detected beats | Bias and limits of agreement | Compare with the margin in [PREC] (±5 bpm) |
| PR and QTc | Only if there is an open database with wave onset and offset annotations (to be verified) | Bias and limits of agreement | Until this is done, they remain at N4 |
| P01 traffic light | Label per record (AF present or not) | Confusion matrix color × label and fraction of records with AF in each color | This is a consistency check of the color, not a calibration of probabilities |
| Other conditions | There are no labeled open data | Verification by construction only: cases worked out by hand like those in d.7 | Declared as a gap |
| Echo models | Only the samples already included in `prototipo/samples`, once weights exist on Iker's PC | Technical checks: rejection by modality and view, repeatability, discrepancy statistics (R2) | There is no clinical reference: they remain at N4 |

### h.2 Arm 2: SIMULATED crew

Synthetic data **with no real physiological relationship** (independent variables with noise around arbitrary means), always with `simulated = true` and the label **SIMULATED** on every output. They only test the pipeline.

| # | SIMULATED scenario | Expected result |
|---|---|---|
| 1 | Everything within baseline, full coverage | GREEN |
| 2 | The core of a condition is missing | GRAY, not GREEN |
| 3 | Row with `sin_dato` | Treated as missing, never as 0 |
| 4 | Sudden jump in a variable | Alert; the adaptive mean **does not change** |
| 5 | Slow ramp | CUSUM signal; EWMA cap; pre-flight baseline intact |
| 6 | N4 data (cuffless, flag, echo output) | Does not update the baseline; does not produce RED; does not support GREEN |
| 7 | Attempt to write the pre-flight baseline | Rejected; a record is kept |
| 8 | Points prior to an alert, within the quarantine | Excluded retroactively |
| 9 | Phase change | Period without learning; δ only in the permitted variables |
| 10 | The whole crew deviates at once | Label "shared deviation"; no individual alert is silenced; no baseline changes |
| 11 | Crew of 3 | Layer 3 inactive |
| 12 | Fixed layer missing one input | "Incomplete: X missing" |
| 13 | Two models with discordant LVEF | Metric "discordant"; activates nothing |
| 14 | Simulated rows mixed with real ones | The real traffic light does not change |

Metrics: compliance with the invariants of e.1 (yes/no) and, on the injected anomalies, detection delay and rate of alerts without an anomaly. These figures depend on the chosen noise and **cannot be transferred** to real people.

---

## (i) Open assumptions

| # | Assumption | Where |
|---|---|---|
| S1 | Generalizing the −1.5 SD of NASA Cognition to other variables as the start of the ramp and as the cutoff for "stable" and "isolated deviation" | c.4, c.5, d.1, e.2 |
| S2 | Traffic-light thresholds: T ≥ 3; T^inf ≥ 2; ln 3 and ln 10; sentinel list; hysteresis; assuming normality to translate p < 0.01 into 2.33/2.58 | c.5, f |
| S3 | EWMA α = 0.1; cap of 1.5 SD; CUSUM with k = 0.5 and h = 5 | e.3, e.5 |
| S4 | Duration of the early phase (30 days) and of the periods without learning (72 h); 72 h quarantine; list of variables with expected adaptation (δ ≠ 0) | e.2, e.4 |
| S5 | Within- and between-person SD: there is a figure only for watch HR (Quer); the rest is estimated from the crew itself | c.3 |
| S6 | Minimum crew sizes (4 and 7) and the "half" fraction for shared deviation | c.4 |
| S7 | Using mission prevalences as prior log-odds; constant rate for P04. No usable prior for P01, P03, P05, P06, P08–P10, P13–P15 and P17–P20 | d.5 |
| S8 | Uncertainty of ln LR taken from the link's σ/μ; normal approximation and independence between groups for the T interval | d.2, d.4 |
| S9 | Applying terrestrial LRs to broader conditions (PHQ-9 → P09; influenza → P04); provisional definition of fever (> 37.3 °C); reading of the Law 2014 anchor and its time unit | d.2 |
| S10 | Classification of the `direccion` column (free text) of the 350 links, including the context or predisposition ones | d.1 |
| S11 | Correlation groups beyond the two declared in [PAD] | d.3 |
| S12 | `latidos_irregulares` does not distinguish supraventricular from ventricular: it is given the lower weight (2, C); extrapolating counts to 24 h | a.2, c.1 |
| S13 | Treating the HR from the `ecg` adapter as "high" by analogy with the ECG garment of Villar 2015; treating human ECG reading and the finger oximeter as references without a figure of their own | b.3 |
| S14 | Distribution shapes: half of a normal on each side for HR; lognormal for HRV; RMSSD as a proxy for "↓ HF"; no age adjustment for HRV nor age/BMI adjustment for temperature | c.2 |
| S15 | Sign and direction of GLS not checked with a real inference; that a model's LVSV, LVEDV and LAVol are comparable with the in-flight method or with MRI (cm³ and mL are indeed the same unit) | a.2, c.6 |
| S16 | Median across models and 10-point tolerance for LVEF; view precedence | a.5 |
| S17 | A latency column (real time versus ground analysis) is missing in [VMA] | g.2 |
| S18 | Validity period of each data type, including the 72 h for echo | g.2 |
| S19 | Minimum coverage of 0.5 and requirement of one core link for GREEN | g.3 |
| S20 | Evaluation frequency, daily aggregation by median and duplicate rule | 0, b.1, c.1 |

Facts that limit all of the above (they are not parameters, but they must remain visible):

1. **The echo models have no real inference at all** and LVEF (`01:V18`) enters only as N4 with weight 1 in P01 and P02: on its own it does not change any color (it adds T = 1) and it cannot produce RED.
2. The rhythm flag is an **incomplete** reimplementation of Dash 2009 (without the missed-RR branch) and its figures are not an independent validation. PR and QTc are not validated.
3. **No published score is validated in microgravity**, and neither is any wearable.
4. There are no symptom weights derived in flight; 310 of the 350 links are level C.
5. The Conkin model cannot be computed: its variables are missing.
6. NEWS2, qSOFA and Centor remain "incomplete" with the current list of variables.
7. The parameters of R1–R5 remain demonstration values.
8. No individual astronaut data were used (LSAH, LSDA and OSDR are controlled-access).

---

## Limits

This system **does not diagnose**. It prioritizes what to review first, states which data it uses to do so and which are missing, and in every alert it recommends consulting the flight surgeon. A GREEN means "no deviations in what was measured, with sufficient coverage", not "healthy"; a GRAY means "there is nothing to base an opinion on". The colors are not probabilities: they come from weights that are mostly level C, from terrestrial figures and from provisional thresholds, and none is validated in spaceflight. The outputs of the echo models and the ECG flags are research results. All synthetic data appear as **SIMULATED** and do not take part in any decision or learning.

<!-- END OF CONSOLIDATED DOCUMENT: prototipo-salud/docs-modelo/ALGORITMOS.md -->

## Consolidated document: `prototipo-salud/docs-modelo/PADECIMIENTOS.md`

> Original source: `prototipo-salud/docs-modelo/PADECIMIENTOS.md`

# Conditions linked to team variables (weights for statistics)

Nov 14, 2026. Research only; **nothing is a diagnosis**. Files: `PADECIMIENTOS.csv` (20 rows) and `PADECIMIENTO-VARIABLE.csv` (350 links, all with weight 1–3; weights of 0 are not listed).

## Method

- **Controlled list:** Iker's 11 conditions (P01–P11) and 9 that form entire sections of catalogs 01–02 (P12–P20). Jugular thrombosis (P11) and SANS (P12) were separated because Iker's CSV grouped them together and the team treats them in different blocks (01 §4 and §5). Synonyms were merged: space headache (03 §7) goes in P07 and orthostatic hypovolemia in P02.
- **Base:** Iker's 54 non-zero weights, with the generic names converted to team IDs according to `_inventario/mapeo-y-correcciones.md`. This yields 56 rows:
  - 2 were removed: CO2→hypoxia (correction 2) and dyspnea→hypoxia, because the catalog has no dyspnea variable;
  - 4 were added when splitting "symptoms" into concrete variables: P04 into 04:A17 and 04:A44; P09 into 03:V1 and 03:V24; P10 into 04:A36 and 04:A37; Iker's row for P11 was split into 01:V58 (P11) and 01:V86 (P12).
- **Expansion (292 rows):** variables whose `que_senala` or section clearly points to the condition. If there is no source in the inputs, they get level C.
- **Duplicates:**
  - the merged pointers (01:V27, 02:V75, 04:A5) were not linked;
  - for unmerged duplicates only one entry was linked: CO2 → 04:A23; HR → 01:V3; HRV → 03:V17; cabin temperature → 04:A27; serum calcium → 02:V14;
  - for the same reason other equivalent pairs were left out: 01:V19↔02:V51, 01:V24↔02:V90, 04:A9↔02:V67a, 04:A45↔02:V58 and 02:V32↔04:A22h.
- **Priors:** `prior_media` = weight. `prior_de`: A = 0.5, B = 1.0, C = 1.5.
- **Copied columns:** `medido_en_vuelo` comes from `variables-para-pesos.csv`. `precision` comes from `PRECISION-VARIABLES.md` and was filled in only for the variables it covers; 04:A1 (oral) is left empty because that file only evaluates skin and core.

### The 5 mandatory corrections

| # | Correction | Applied | Rows |
|---|---|---|---|
| 1 | AF: the high weight goes to irregularity, not to fc_reposo | Yes | P01–01:V31 (3, A, Perez 2019 + Taggar 2016). 01:V3 is not linked to P01 |
| 2 | Do not use Law 2014 for hypoxia | Yes | CO2 was removed from P03. Law 2014 only appears in P07 (04:A23, 03:V82) |
| 3 | DCS: Conkin variables if they exist | Yes (gap) | No Conkin variable (EVA, prebreathe, suit pressure) is on the list. Linked: 04:A36, 04:A37, 04:A38, 04:A39, plus 04:A26 (total cabin pressure) and 04:A50. 04:A24 was not linked to P10 because no sourced contribution was found |
| 4 | Crucian and Barger from A to B | Yes | Crucian: P04–04:A17 and P04–04:A44. Barger: P05–03:V30 and P06–03:V30. The other rows with Crucian/Barger are also B: P01–01:V45 and P05–03:V87 |
| 5 | CO2→respiration can be B only with a real URL | Remains C | P07–04:A2. OCHMO TB-004 (already cited) was reviewed: the text mentions dyspnea, but not the increase in ventilation (which only appears in a figure). There is no other source in the inputs |

## Summary by condition

| ID | Condition | n variables | n A or B | The 3 with the highest weight (weight and level) |
|---|---|---|---|---|
| P01 | Arrhythmia / atrial fibrillation | 15 | 3 | `01:V31` Heart rhythm (atrial fibrillation  (3A); `01:V33` Ventricular extrasystoles and tachycar (3C); `01:V45` Symptoms: palpitations, syncope, pai (2B) |
| P02 | Deconditioning and orthostatic intolerance | 18 | 4 | `01:V47` Drop in blood pressure on stand (3A); `01:V48` Increase in heart rate on st (2B); `01:V50` Presyncope symptoms: dizziness, nausea, (2B) |
| P03 | Hypoxia / respiratory problem | 8 | 3 | `04:A3` SpO2 (3A); `04:A2` Respiratory rate (3B); `04:A25` Inspired O2 (PIO2) (3C) |
| P04 | Infection, fever or immune dysregulation | 25 | 9 | `04:A1` Body temperature (3B); `01:V3` Resting heart rate (2A); `04:A17` Skin rash / hypersensitivity ( (2B) |
| P05 | Sleep loss and circadian misalignment | 31 | 3 | `03:V30` Total sleep time (actigraphy) (3B); `03:V44` Circadian alignment of the episode of  (3C); `03:V45` Salivary melatonin (dim-light onse (3C) |
| P06 | Fatigue and cognitive impairment | 31 | 3 | `03:V66` PVT-B: lapses (3A); `03:V68` Cognition battery (speed, accurac (3B); `03:V30` Total sleep time (actigraphy) (2B) |
| P07 | CO2 exposure / headache | 14 | 2 | `04:A23` Cabin ppCO2 (3A); `03:V82` Headache episode (yes/no, date, dur (3A); `04:A2` Respiratory rate (2C) |
| P08 | Acute radiation from a solar event | 16 | 3 | `01:V98` Absolute lymphocyte count and its c (3B); `01:V93` Effective dose per particle event (3C); `01:V100` Time to first vomiting after the  (2B) |
| P09 | Stress / behavioral health | 29 | 3 | `03:V1` PHQ-9 (3A); `03:V30` Total sleep time (actigraphy) (2B); `03:V24` Dyadic conflict (2B) |
| P10 | Decompression sickness after EVA | 10 | 0 | `04:A36` Type I DCS symptoms (3C); `04:A37` Type II DCS symptoms (3C); `04:A38` Venous bubbles (VGE) (2C) |
| P11 | Jugular thrombosis | 16 | 3 | `01:V58` Thrombosis symptoms: visible swell (3B); `01:V54` Internal jugular flow grade i (3B); `01:V55` Visible thrombus (echogenic material int (3B) |
| P12 | SANS / intracranial pressure | 25 | 1 | `01:V86` Visual symptoms: blurred near vision (3B); `01:V67` Change in total peri retinal thickness (3C); `01:V68` Optic disc edema, Frisé grade (3C) |
| P13 | Kidney stones and dehydration | 26 | 3 | `02:V37` Renal colic symptoms (flank pain (3B); `02:V17` 24-h urine volume (3C); `02:V18` 24-h urinary calcium (3C) |
| P14 | Bone density loss | 20 | 0 | `02:V01` Areal BMD by DXA (total hip, neck (3C); `02:V02` T-score (DXA) (3C); `02:V05` Volumetric BMD and microarchitecture (Q (3C) |
| P15 | Muscle atrophy and loss of aerobic capacity | 19 | 0 | `02:V51` VO2peak / VO2max (3C); `02:V40` Isokinetic knee strength (extensi (3C); `02:V46` Muscle volume or cross-sectional area by (3C) |
| P16 | Space motion sickness (SMS) | 5 | 0 | `02:V67a` Space motion sickness symptoms (nausea, vo (3C); `02:V67b` Prior susceptibility to motion sickness (2C); `02:V68a` Use of and response to anti-motion-sickness medication (2C) |
| P17 | Space anemia | 12 | 0 | `01:V108` Hemoglobin (3C); `01:V111` Total red cell mass (3C); `01:V109` Hematocrit (2C) |
| P18 | Back pain and spinal elongation | 9 | 0 | `02:V58` Back pain: presence and intensit (3C); `02:V59` Location, day of onset and duration (2C); `02:V61` Standing height (2C) |
| P19 | Inadequate nutrition and body mass loss | 12 | 0 | `01:V8` Body mass (3C); `02:V81` Energy intake (3C); `02:V76` Serum 25-OH vitamin D (2C) |
| P20 | Glucose metabolism / insulin resistance | 9 | 0 | `02:V86` Fasting plasma glucose (3C); `02:V87` 2-h glucose after oral load ( (3C); `02:V89` HbA1c (3C) |
Totals: 350 links; A = 9, B = 31, C = 310.

## Gaps

- **DCS (P10):** the variables of the Conkin model (EVA time, prebreathe, suit pressure, ambulation) are missing from the list. Without them Conkin's risk prior cannot be computed. There is no per-symptom LR.
- **No in-flight LR or sens/spec** for any condition. The figures in the `lr_o_or` column are terrestrial, except Law 2014 (ISS). Nor is there a sourced LR for sleep, fatigue, SANS symptoms, space motion sickness, DCS or acute radiation.
- **Dyspnea:** the catalog has no dyspnea variable, so Iker's hypoxia symptom could not be linked.
- **P12–P20:** almost everything is level C. The known clinical criteria (T-score, ADA, Frisén…) have no source in the inputs of this task. The sources for each row of catalogs 01–02 were not transferred one by one; that is the next step to raise C → B.
- **Empty prevalence** in P01, P03, P06, P08, P09 and P14–P20: there is no figure in the inputs.
- **Accuracy:** only evaluated for the 10 generic variables of `PRECISION-VARIABLES.md`. The rest is left empty.
- **Iker's attributions not verified in this task:** Basner 2014 for conflict (03:V24) and Crucian 2016 for palpitations (01:V45). They are kept as B.
- **Possible redundancy:** 03:V82, 03:V83 and 04:A6 (headache) and 01:V3/04:A4 (HR) measure similar things. They should be modeled as correlated, not as independent evidence.
- **Duplicates pending a team decision:** calcium (01:V41/02:V14) and HRV (01:V43/03:V17). One was chosen here; if the team decides on a different canonical one, the ID must be changed.

<!-- END OF CONSOLIDATED DOCUMENT: prototipo-salud/docs-modelo/PADECIMIENTOS.md -->

## Consolidated document: `prototipo-salud/ENTORNO.md`

> Original source: `prototipo-salud/ENTORNO.md`

# Execution environment (detected 2026-11-14 ~09:41 Mexico City time)

- OS: Debian GNU/Linux 13 (trixie), kernel 6.12.113+, x86_64
- CPU: 8 cores (Intel(R) Xeon(R) Processor)
- RAM: 15 GB, no swap
- Free disk: 110G on /
- **GPU: NONE.** `nvidia-smi` does not exist, there is no /usr/local/cuda. **Everything runs CPU-only (no GPU, no CUDA, no VRAM).**
- System Python: Python 3.13.5; environment manager: uv 0.13.7 (/usr/local/bin/uv), one venv per repo in envs/.
- Tools: git 2.47.3, ffmpeg 7.1.5-0+deb13u1; git-lfs NOT installed.
- Consequence: PyTorch CPU wheels are used (index https://download.pytorch.org/whl/cpu), batches of 1, short clips and few frames. The reported times are CPU times.

## Change of plan (Iker, Nov 14 09:41 Mexico City time): the real tests are run on his PC
- **On this Linux machine NO weights were downloaded and NO real inference was run.** Only load tests with dummy data
  (architecture without weights + random tensor), marked "NO se ha corrido inferencia real" (no real inference has been run), in test venvs outside the
  deliverable (`/tmp/nasa-linux-envs/`, torch 2.5.1 CPU).
- **Execution target (Iker's PC):** Windows + PowerShell, Python 3.13.5 (`python`), NVIDIA RTX 4050 Laptop GPU 6 GB VRAM,
  driver 621.14 (CUDA 12.x).
- Environment decision for the PC: see README.md and CONTRATO.md (model venvs with Python 3.11 via uv and torch 2.5.1 cu124;
  app venv with the system's Python 3.13).

<!-- END OF CONSOLIDATED DOCUMENT: prototipo-salud/ENTORNO.md -->

## Consolidated document: `prototipo-salud/fusion/NOTA-ENTRENAMIENTO.md`

> Original source: `prototipo-salud/fusion/NOTA-ENTRENAMIENTO.md`

# Note: what would be needed to train a fusion network (not trained now)

Status: `fusion/red_fusion_stub.py` only declares that there is no predictor. Nothing is trained in this prototype.

Required data and outcomes:
- **Paired data from the same individual**: ultrasound (studies with metadata and calibration) + wearables
  (HR, HRV with metric, SpO2, skin temperature, sleep, activity) **synchronized in time**
  (windows defined in advance, clocks with a known time zone).
- **Outcomes adjudicated by clinicians** (e.g., reference LVEF measured by an echocardiographer, clinical
  events defined with written criteria), not automatic labels or outputs of other models.
- **Size**: sufficient for the number of predictors and the prevalence of the outcome (compute the sample
  size before collecting; with few events only a simple, regularized model is feasible).
- **Consent and data use agreements (DUA)**: informed consent, ethics approval, de-identification,
  and the DUAs/licenses of each source (several echo datasets require registration and acceptance of terms).
- **External validation**: another center/another device/another population; split by person (never by row).
- **Ground analogs vs flight**: ground data (patients, volunteers, isolation/analogs) do not
  represent microgravity, radiation or fluid shifts; flight data or validated analogs
  are needed before claiming anything for astronauts.

Why it is not trained now: no paired data with adjudicated outcomes exist; the assignment prohibits
training/tuning models at this stage; and returning probabilities without them would be inventing a result.
The prototype's synthetic data are not usable for training (simulated=true, no real physiological relationship).

<!-- END OF CONSOLIDATED DOCUMENT: prototipo-salud/fusion/NOTA-ENTRENAMIENTO.md -->

## Consolidated document: `prototipo-salud/MODELOS.md`

> Original source: `prototipo-salud/MODELOS.md`

# Who did what: prototype (Nov 14, 2026, Mexico City time)

CLI: Claude Code 2.1.318 on the box. Coordinator session: `f26aa405-cb72-458a-8d5e-35a536b6b636`. cwd: prototipo/.
Command: `claude --model claude-opus-5-5 --effort xhigh -p … --agents agents.json --output-format stream-json --verbose --permission-mode bypassPermissions --strict-mcp-config --disallowedTools "mcp__*"`

| Step | Time (Mexico City) | Model | What it did | Verification |
|---|---|---|---|---|
| Run 1 (run1.jsonl) | 9:40–9:43 | Coordinator **claude-opus-5-5**, effort xhigh | Detected the environment (ENTORNO.md), cloned the 5 repos into vendor/ (REVISIONES.md), reviewed README/licenses/samples | `modelUsage`: claude-opus-5-5; 30 Opus messages |
| Interruption | 9:43 | Executor agent (Grok Bot) | Stopped run 1 because of Iker's change of plan (9:41): tests on his PC, no inference or weights on the box | — |
| Run 2 (run2.jsonl, `--resume`) | 9:44–10:09 | Coordinator **claude-opus-5-5** xhigh | Wrote core/ (format, modality, runs), integrated, reviewed, verified public weights via HTTP headers/HF API, wrote README, MODELOS-TABLA, AVANCE | 134 Opus messages; `modelUsage.canonicalModel` = claude-opus-5-5 |
| "Implementer" subagents (Task) | same window | **claude-sonnet-5-5** | Adapters for the 5 models, environments/requirements, sensors, fusion/rules/stub, runner + Streamlit app, 11 .ps1 scripts, tests and load tests with random weights | 286 subagent messages with `message.model = claude-sonnet-5-5`; `modelUsage.canonicalModel` = claude-sonnet-5-5 |
| Final QA | 10:10–10:12 | Executor agent (Grok Bot) | Ran `verificar.py` (no failures; 2 PENDIENTE) and `pytest` (25 passed), checked that there were no /home/box paths in deliverables and that no weights had been downloaded. **Did not edit code.** Wrote this file. | — |

Cost reported by the CLI (run 2): USD 12.76 (Opus 6.89, Sonnet 5.87).
Note: the test venvs on Linux (CPU, torch 2.5.1 CPU) are in /tmp/nasa-linux-envs, outside the deliverable. The "fake" (random) weight files from the load tests are in /tmp/nasa-test-runs, outside the deliverable.

## CUDA fix (bug reported by Iker via Jarvis, 10:40 Mexico City time)
| Step | Time (Mexico City) | Model | What it did | Verification |
|---|---|---|---|---|
| Run 3 (run3.jsonl, `--resume` same session, `--model claude-sonnet-5-5 --effort high`) | 10:42–10:48 | **claude-sonnet-5-5** high, no Opus or subagents | Diagnosed the cause (timm/open-clip request torch without a version and uv re-resolved it from PyPI → 2.15.0+cpu); created scripts/torch-cu124-overrides.txt, Repair-TorchCuda/Test-TorchOk in _comun.ps1, changed instalar_modelo.ps1 (lock with --no-deps --override, cu124 reinstallation and CUDA verification with exit 1), new reparar_torch.ps1, README section and AVANCE.md | 17 messages with `message.model = claude-sonnet-5-5`. The result's `modelUsage` is cumulative for the session (it includes the Opus from run 2); in this run there were no Opus messages |
| Zip and QA | 10:48–10:50 | Executor agent (Grok Bot) | Created ../prototipo-fix-cuda.zip (only scripts/ and adapters/*/requirements*) with Python zipfile. Did not edit code. | — |

## EchoNet-Dynamic weight-loading fix (Iker via Jarvis, 11:06 Mexico City time)
| Step | Time (Mexico City) | Model | What it did | Verification |
|---|---|---|---|---|
| Run 4 (run4.jsonl, `--resume` same session, `--model claude-sonnet-5-5 --effort high`) | 11:07–11:13 | **claude-sonnet-5-5** high, no Opus or subagents | `adapters/echonet_dynamic/infer.py`: loading with weights_only=True + numpy safe_globals (numpy.core/_core), weights_only=False fallback only for official files with the exact size, path recorded in `checkpoint.carga`; tests with random checkpoints in /tmp that reproduce the error; AVANCE.md (PanEcho on CUDA on Iker's PC, 17.4 s, run 20261114T105021_panecho_c753f120; app on :8501) | 18 messages with `message.model = claude-sonnet-5-5` |
| Zip | 11:14 | Executor agent (Grok Bot) | Created ../prototipo-fix-echonet.zip (infer.py + AVANCE.md). Did not edit code. | — |

## ECG module (Iker via Jarvis, 15:46 Mexico City time)
| Step | Time (Mexico City) | Model | What it did | Verification |
|---|---|---|---|---|
| Run 5 (run5.jsonl, NEW session `58b8b78a-5de6-407e-a611-3dc200a1a7ed`, `--model claude-fable-5-2 --effort high`) | 15:53–16:46 | Coordinator **claude-fable-5-2** high | Design, review, core/run_model and modality, validation (validar_ecg.py), docs, ECG-ARCHIVOS.txt | 113 messages with `message.model = claude-fable-5-2`; `modelUsage.canonicalModel` = claude-fable-5-2 (USD 13.95). The CLI warned `unrecognized_model` on stderr but the effective model was fable-5-2 |
| "Implementer" subagents (Task) | same window | **claude-sonnet-5-5** | adapters/ecg (NeuroKit2 + wfdb), trimmed samples, ECG view in app.py, .ps1 scripts, tests, screenshot with Playwright | 258 subagent messages with `message.model = claude-sonnet-5-5` (USD 5.18) |
| Internal CLI usage | — | claude-haiku-5-5 | Was not a subagent; appears in `modelUsage` (USD 0.04) | `result.modelUsage` |
| Packaging and QA | 16:46–16:50 | Executor agent (Grok Bot) | Reviewed the screenshot, checked that the 117 files in ECG-ARCHIVOS.txt exist, cross-checked the table against validacion_por_registro.csv, created ../prototipo-ecg.zip. Did not edit code. | — |

Total cost of run 5 according to the CLI: USD 19.17.

<!-- END OF CONSOLIDATED DOCUMENT: prototipo-salud/MODELOS.md -->

## Complete model table

> Consolidated content from the historical source `prototipo-salud/MODELOS-TABLA.md`.

# Model table (status as of 2026-11-14; ECG row added ~16:45 Mexico City time)

**On the machine where this was built (Linux, 8 CPUs, NO GPU) NO real inference was run and NO weights were downloaded.**
(This applies to the 5 echo models. The ECG module in the last row has no weights and was indeed run here, on CPU.)
Only load tests were done: the architecture was built without weights and a random tensor was passed through it, on CPU, with
torch 2.5.1. These tests show that the code imports and that the shapes match. **They are not results.** Everything remains
"pending testing on PC" (Windows, RTX 4050 Laptop 6 GB).

The sizes come from HTTP headers (`curl -sIL`, without downloading) queried on 2026-11-14. The VRAM is an
**estimate**: parameters measured in the load test × 4 B, plus estimated activations. It was not measured on a GPU; each
adapter reports `raw_output.vram_pico_mb` when running on the PC. Full details in `adapters/<modelo>/manifest.json`.

| Model | Weights and access | Accepted input | Actual outputs exposed by the repo (and how they are labeled) | Requirements | License / restrictions | Estimated VRAM vs 6 GB | Status |
|---|---|---|---|---|---|---|---|
| **PanEcho** (CarDS-Yale, commit 836c46e) | `panecho.pt` from GitHub Releases v1.0, **505,054,604 B**. Public, no login. | **2D B-mode video**, any view (view-agnostic). One file or a folder from the same study. Rejects 2D image, 3D volume and Doppler. | 40 tasks (`content/tasks.md`; the README says 39). Classification → `probabilidad_clase` (the model's softmax/sigmoid, not calibrated). Regression (EF %, dimensions in cm, volumes, gradients, velocities…) → `medicion`, as a model estimate and not computed from pixels. Per-study aggregation labeled. | Python 3.11, torch 2.5.1 cu124, timm 0.9.10, opencv. Preprocessing from `src/dataset.py`: 16 frames, 4 clips, CenterCrop 224, ImageNet. Resizes if the video is not 224 (flagged deviation). | Weights CC BY-NC-SA 4.0 (non-commercial); code AGPLv3. | ~2 GB (42.1 M parameters measured). **Probable** | Pending testing on PC |
| **EchoNet-Dynamic** (echonet/dynamic, commit e01d029) | `r2plus1d_18_32_2_pretrained.pt` **250,572,083 B** + `deeplabv3_resnet50_random.pt` **317,401,511 B** (GitHub Releases douyang/EchoNetDynamic v1.0.0, URL from `InitializationNotebook.ipynb`). Public. The **dataset** requires registration + RUA and is **not** used. | **2D A4C video** (the view is declared; if it is not A4C it is rejected). Converts to 112×112 according to `ConvertDICOMToAVI.ipynb`. Rejects everything else. | LVEF in % (`medicion`, mean of all 32-frame clips with period 2). LV area per frame in **px²** (`hallazgo`; never ml or mm). Candidate systole frames. `.npz` masks and overlay. Beat-to-beat analysis (R) is **not** implemented. | Python 3.11, torch 2.5.1 cu124, scipy, opencv. Mean/std normalization computed on the video itself (flagged deviation: the repo uses that of the training dataset). | **Two contradictory licenses**: LICENSE (MIT) and LICENSE.txt (prohibits redistribution and use without written permission). Local, non-commercial use only. Weights without an explicit license. | ~3 GB (70.9 M parameters measured). **Probable**; if OOM, `block_size=8` | Pending testing on PC (license notice) |
| **MedSAM2** (bowang-lab, commit 332f30d) | `MedSAM2_US_Heart.pt` (fine-tuned on cardiac echo), HF `wanglab/MedSAM2`, **156,041,079 B**, sha256 `295c0ff8…d933`. Public (HF API: `gated=false`). | **2D video** or **2D image** + **mandatory initial prompt** from the user (box `[x0,y0,x1,y1]` + frame, or mask). Without a prompt it is rejected: there is no automatic segmentation. Rejects 3D volume and Doppler. | Per-frame masks (`.npz`), overlay and per-frame area in **px²** (`hallazgo`). It is generic visual segmentation, not diagnosis. No probabilities. | Python 3.11, torch 2.5.1 cu124, hydra-core, iopath. Does **not** compile the CUDA extension on Windows (uses `vendor/MedSAM2` via `sys.path`). Config `sam2.1_hiera_t512`. | Code Apache-2.0; **weights CC BY-SA 4.0** (HF card). | ~1.5 GB (39.0 M parameters measured). **Probable** | Pending testing on PC |
| **EchoPrime** (echonet/EchoPrime, commit 6d9c1ee) | `model_data.zip` **1,338,009,590 B** + `candidate_embeddings_p1.pt` and `_p2.pt` **1,260,213,315 B each** (GitHub Releases v1.0.0). Public, no login. | **Multiview study**: folder of multiframe DICOMs (official procedure with sector mask) and/or mp4/avi. Color Doppler only enters as a view within the study, without quantification. Still images and spectral Doppler are skipped (as in the repo); 3D volume is rejected. | View per video (`probabilidad_clase`, softmax added; the repo uses argmax). 21 metrics **by retrieval** (k=50): EF %, PAP mmHg and binaries as `fraccion_vecinos_0_1` (not a probability). Report **retrieved** from other studies (`hallazgo`, text not written for this study). `.npy` embeddings. | Python 3.11, torch 2.5.1 cu124, transformers 4.57.1, pydicom 2.3.1, opencv 4.5.5.64. Batch of 4 videos (the repo uses 50, which does not fit). **High CPU RAM** (>6 GB estimated with report). | Cedars-Sinai Academic Software License: academic or non-profit use only, no transfer to third parties. | ~1.6–2 GB on GPU (122.2 M parameters measured). The candidate embeddings (2.4 GB) stay in RAM. **Probable** | Pending testing on PC |
| **EchoCLIP / EchoCLIP-R** (echonet/echo_CLIP, commit 23cd327) | HF `mkaichristensen/echo-clip` and `echo-clip-r`: `open_clip_pytorch_model.bin` **606,262,375 B each** + config. **Not gated** (HF API: `gated=false`; the repo's comment about `huggingface-cli login` does not apply). | **2D video** or **2D image** (frames). Rejects 3D volume and Doppler. | Video↔text similarity (`similitud`, cosine). **Zero-shot** LVEF (`medicion` %, quality `zero_shot_por_similitud`, derived from similarities). Binary zero-shot scores, e.g., pacemaker (`similitud`, **never** a probability). Embeddings. | Python 3.11, torch 2.5.1 cu124 (the repo asked for 2.0.1), open_clip_torch 2.20.0, huggingface_hub 0.16.4, numpy 1.24.4. | Repo: Cedars-Sinai Academic Software License. HF card: MIT. The most restrictive condition applies. | ~1.5 GB (151.5 M parameters measured; the two models are loaded separately). **Probable** | Pending testing on PC |
| **ECG** (`ecg`; NeuroKit2 0.3.0 + wfdb 4.3.1; not a trained model) | **No weights**: nothing to download (`descargar_pesos.ps1 -Modelo ecg` replies "no requiere" (not required)). | **1D ECG** (`ecg_1d`): WFDB record (`.hea` + `.dat`, optional `.atr`/`.qrs`) or CSV/TXT/TSV with the sampling frequency (`-Fs`). One channel per run. Rejects video, image, DICOM and volume; the echo models reject `ecg_1d`. | HR (bpm), HRV RMSSD and SDNN (ms), PR and Bazett QTc (ms, medians of the DWT delineation) → `medicion`, source `algoritmo_senal`. Irregular beats by RR criterion → `hallazgo`. AF-compatible irregular-rhythm flag → `regla_alerta`, **EXPERIMENTAL FLAG – NOT A DIAGNOSIS** (statistics and thresholds from Dash et al. 2009). With `.atr`: comparison against the annotations. Trace `ecg_traza.npz`. | Python 3.11, **no torch, CPU**. numpy 2.2.6, scipy 1.15.3, pandas 2.3.3, scikit-learn 1.7.2, PyWavelets 1.9.0 (Windows lock compiled with uv). | NeuroKit2: MIT; wfdb: MIT (read from the metadata and the `LICENSE` of the installed packages). Samples: PhysioNet, ODC-By 1.0, with mandatory citation (`samples/FUENTES.md`). | Does not use GPU (0 GB). | **Actually run on Linux/CPU** on mitdb 100/201/203 and afdb 04015 (figures in this README; the cited report `validacion/ecg/VALIDACION.md` is not in the repository): R peaks with sensitivity 0.999/1.000/0.919 and PPV 1.000/0.972/0.989 on 100/201/203; the flag has per-segment specificity 1.000/0.054/0.000/0.904 on 100/201/203/04015 (it flags irregularity, not AF). PR/QTc not validated. **Functional test on Iker's PC** on Nov 15, 2026 (Windows, CPU, `POST /api/modelos/analizar`, SIMULATED): see [testing and validation §4.1](../documentacion/README_08_PRUEBAS_VALIDACION.en.md). This is not validation. |

**No model ended up "blocked":** the 5 echo models have public weights, with no login or acceptance of terms, verified via
HTTP headers and the HF API. The scripts never ask for or use tokens. The restrictions come from the licenses
(academic or non-commercial; EchoNet-Dynamic with contradictory licenses). No dataset requiring registration is used
(EchoNet-Dynamic, CAMUS, MIMIC-IV-ECHO, etc.).

Total weights if all 5 are downloaded: **≈6.30 GB**. In addition, each venv downloads torch cu124 (wheel of 2,510,750,521 B for
Windows/cp311, which uv caches only once).

<!-- END OF CONSOLIDATED DOCUMENT: prototipo-salud/MODELOS-TABLA.md -->

## Consolidated document: `prototipo-salud/motor/DISENO.md`

> Original source: `prototipo-salud/motor/DISENO.md`

# Condition engine: design and interfaces

Implements `ALGORITMOS.md` (the team's normative specification, Nov 14, 2026). This file fixes the
interfaces between modules and the implementation decisions where the specification leaves room.
**Nothing is a diagnosis.** Every number marked [P] in the specification is **provisional** and must be
labeled `provisional` in code, JSON, CSV and UI. Only `numpy`, `pandas` and the standard library (there is no scipy).

## 1. Modules

| File | Contents |
|---|---|
| `motor/parametros.py` | Provisional constants (each with `valor`, `provisional`, `supuesto` S1–S20, `descripcion`); editable thresholds; reading and writing of `datos/modelo/overrides.json` |
| `motor/tablas.py` | Loads `datos/modelo/PADECIMIENTOS.csv` and `PADECIMIENTO-VARIABLE.csv` (copies of the sourced tables, never written to), applies overrides, classifies `direccion` (S10), published criteria (d.1), the 6 links with LR/OR (d.2), priors (d.5), correlation groups (d.3), fixed layers (d.6) |
| `motor/calidad.py` | Quality gate G0–G7, metric → `variable_id` mapping (a.2, a.4), device class, level N0–N4, validity period |
| `motor/entradas.py` | Reads `outputs/raw/*/` (saved runs), sensors (`sensores/importador.py`) and the engine's native CSV (SIMULATED dataset); returns observations (§3) |
| `motor/simulador.py` | Generates the **SIMULATED** crew in `datos/simulado/` |
| `motor/normalizacion.py` | Daily aggregation, population z (c.2), personal baseline and z (c.3), crew delta (c.4), variable state (c.5) |
| `motor/calibracion.py` | Immutable pre-flight baseline, protected EWMA, CUSUM, quarantine, JSON persistence (e) |
| `motor/score.py` | Activation (d.1), weight channel T_p with uncertainty (d.3, d.4), Bayesian channel (d.2, d.5), coverage (g.3) |
| `motor/semaforo.py` | Rules A1–A5, R-1..R-3, GREEN/GRAY, hysteresis, ordering and text (f) |
| `motor/evaluacion.py` | Orchestrates the order of computation in §0 of the specification and returns the result (§5) |

Paths: always relative to the prototype root (`Path(__file__).resolve().parents[1]`). No deliverable
file contains absolute paths from the development team.

## 2. Shared vocabulary

- **Channel**: `"real"` or `"simulado"`. A row with `simulated=true` exists only in the simulated channel. The two
  channels **never** share baselines, CUSUM, crew statistics or traffic light. The simulated channel has its
  own calibration store (a "sandbox" labeled SIMULATED) so that the pipeline of (h.2) can be exercised;
  the real store rejects and logs any simulated point (invariant e.1.4).
- **Quality level** (`nivel`): `"N0"`, `"N1"`, `"N2"`, `"N3a"` (low due to evidence: drops one step),
  `"N3b"` (accuracy not evaluated: table level), `"N4"`.
- **Phase**: `"PRE"`, `"VT"`, `"VTa"`, `"POST"`. Without a declared launch everything is `PRE` ("no mission declared").
- **Colors**: `"VERDE"`, `"AMARILLO"`, `"ROJO"`, `"GRIS"` (green, yellow, red, gray).
- **Device class** (`clase_dispositivo`), closed vocabulary defined in `calidad.py`:
  `ecg_adaptador`, `ecg_prenda_holter`, `lectura_humana_ecg`, `palpacion_pulso`, `reloj_ppg`, `oximetro_dedo`,
  `spo2_muneca`, `bandas_toracicas`, `conteo_manual`, `termometro_oral`, `temp_piel`, `temp_central_estimada`,
  `manguito_validado`, `manguito_sin_validar`, `cuffless`, `actigrafia`, `sueno_etapas_consumo`, `pvt_laptop`,
  `pvt_reloj`, `prueba_cognitiva`, `analizador_cabina`, `cuestionario_phq9`, `autorreporte`, `diario`,
  `prueba_ortostatica`, `laboratorio`, `modelo_eco`, `captura_manual`, `desconocido`.
- **Method** (`metodo`, decides κ of the Bayesian channel): `lectura_humana`, `cuestionario_completo`,
  `prueba_ortostatica`, `termometro`, `sensor_cabina` or empty.

## 3. Observations (output of the gate; input to the rest of the engine)

`pandas.DataFrame` with exactly these columns (`calidad.OBS_COLUMNAS`):

| Column | Type | Meaning |
|---|---|---|
| `subject_id` | str | Person. People are never mixed |
| `timestamp` | `pd.Timestamp` without time zone | Time of the observation |
| `variable_id` | str or None | Team canonical ID (`01:V3`…). None = "no team variable" (stored, not scored) |
| `valor` | float | In the canonical unit. NaN if `sin_dato`. Presence: 1.0 present, 0.0 absent |
| `unidad` | str | |
| `clase_dispositivo` | str | §2 |
| `nivel` | str | §2 |
| `nivel_motivo` | str | Why that level (short text) |
| `simulated` | bool | |
| `contexto` | str or None | `reposo`, `sueno`, `actividad`, `ejercicio`, `eva` |
| `metodo` | str or None | §2 |
| `decide` | bool | False = informational-only row (SDNN, diastolic, fraction of windows): displayed, not scored |
| `calidad_buena` | bool | Quality declared good by the adapter or by whoever enters the data (learning condition for N3) |
| `vigencia_h` | float | Provisional validity period [P·S18] in hours; NaN = no expiry (laboratory: until the next sample) |
| `z_pob_permitido` | bool | False if the measurement is not comparable with the population norm (e.g., HRV with window ≠ 5 min) |
| `sin_dato` | str or None | Reason for the missing value (`sin_dato: …`). A missing value is **never** 0 |
| `origen` | str | `outputs_raw`, `sensores`, `nativo` |
| `metric` | str | Original metric |
| `quality` | str | Original `quality` |
| `run_id` | str or None | |
| `etiquetas` | str | Separated by `; ` (e.g., `[experimental]; tasa extrapolada [P·S12]`) |
| `notas` | str | |

N0 rows are returned separately (rejected, with a reason); they do not enter `obs`.

### 3.1 Native engine CSV (SIMULATED dataset and manual entry)

Columns: `subject_id,timestamp,variable_id,value,unit,device_class,quality,context,method,simulated,notes`.
Empty `value` ⇔ `quality` starts with `sin_dato`. `device_class` from the vocabulary in §2.

### 3.2 Mission and profiles

`mision = {subject_id: {"lanzamiento": "YYYY-MM-DD" | None, "aterrizaje": "YYYY-MM-DD" | None}}`;
`perfiles = {subject_id: {"edad": int | None, "sexo": "M" | "F" | None}}`. If missing: phase PRE and the
population branch for HR/QTc inactive (age and sex are not invented).

## 4. Implementation decisions (all provisional unless they cite the specification)

D1. **Daily aggregation** (c.1, G7): one observation per (person, variable, day). The best level wins
(N1 > N2 > N3a = N3b > N4); on a tie, the class with the most recent `run_id`/timestamp. Value = median of the
rows of that class and level on that day (presence variables: maximum). Only rows with `decide=True` and without `sin_dato`.
If all rows of the day are `sin_dato`, the reason is kept (absence F2).

D2. **Evaluations**: one per calendar day, from the first to the last date with data for the person; the state
(adaptive mean, CUSUM, quarantine, color history) advances in chronological order. The engine is a
**deterministic recomputation** over all observations; at the end it saves the state to JSON. If the file already
contains a **frozen** baseline, that baseline is used as is and any attempt to rewrite it is rejected and
logged (invariant e.1.1). Human actions (acknowledgement of RED, closing of a CUSUM review, new version of
a baseline) are saved in the same JSON with date and author and are applied on their date.

D3. **Validity in daily evaluations**: a value from day d is current on day D if `(D − d) < ceil(vigencia_h/24)`.

D4. **Pre-flight baseline** per (person, variable, class): admitted PRE points (N1; N2 of its own class; N3 with
`calidad_buena`), in the standard context; outliers are excluded with a robust z (median/MAD) ≥ 2.58 [P·S5].
It is frozen on the first day with phase ≠ PRE. Without a declared launch the baseline is "provisional, not frozen".
- `s_w`: own SD if n0 ≥ 5; otherwise, the crew's pooled within-person SD (same variable and class);
  for watch HR, 3 bpm (Quer 2020) if there is no other; if there is none, the personal branch is inactive.
- `s_b`: `s_pob` from c.2 if it exists; otherwise, SD of the crew's pre-flight means (≥ 3 people); if there is none,
  B = 0 (no shrinkage) and it is labeled.
- `m_ref`: population mean from c.2 or the crew's pre-flight mean.
- `B`, `μ_i`, `s_i²` as in c.3. Floor: 3 breaths/min for `04:A2` (the only one with a figure). If n0 < 5 and there is no population
  reference, the link is **NA** with the reason "no baseline (n0 < 5) and no population reference" (it does not add 0).
- Variables with a transformation: `03:V17` is handled as ln(RMSSD) [P·S14].

D5. **δ_vφ = 0** for all variables in this prototype (prior value; the crew-based estimation of
e.4 is not implemented). It is the conservative option: a deviation is still a deviation. Known limitation.

D6. **Var(z)**: `1/n0 + z²/(2·(n0−1))` with n0 ≥ 2; with a population-only branch, 0 (it is labeled).

D7. **Ordinal bands** (SpO2, resp. rate, BP): no population z is computed. If the published criterion is met,
a = 1; otherwise, a ramp with the personal z; if there is no personal baseline, a = 0 with "criterion not met; no personal baseline
for the ramp" (current data: counts toward coverage if it is N1–N3).

D8. **Variable state for learning**: "alerted" if any of its links has u ≥ u1.

D9. **Episode** (e.2): on a day when the person has rhythm flag = 1, fever (> 37.3 °C [P·S9]),
context `eva`/`ejercicio`, a presence symptom = 1 or a drug (`01:V42`, `03:V87`) present, no variable
of that person is learned.

D10. **Quarantine**: a point that meets e.2 enters a queue; it is applied to the EWMA once 72 h have passed without a
subsequent alert (alerted variable or linked condition in YELLOW/RED); if there is one, it is discarded and
logged as "excluded retroactively".

D11. **R-1 persistence** with daily evaluations: `T_inf ≥ 2` in the evaluation of day D and in that of day D−1.

D12. **Hysteresis**: YELLOW goes down after 2 consecutive evaluations without a condition; RED additionally requires human acknowledgement
(no interface in this prototype: it stays RED "pending acknowledgement").

D13. **Coverage**: "measurable in the phase": in VT/VTa only `sí en vuelo`; in PRE/POST also `solo pre-post
vuelo`. `solo análogo`, `no`, `no encontrado` never enter the denominator (F4, F5). Core = links of weight 3
(effective weight). No measurable core in the phase → GRAY "structural: the core only exists pre/post".

D14. **Effective σ**: the link's `prior_de` if the level does not downgrade; if it downgrades, `max(prior_de, σ del nivel
degradado)` with A = 0.5, B = 1.0, C = 1.5 [PAD]. N2 and N3a drop one step; N4 forces C.

D15. **Fixed layers** (d.6): they do not change T_p or ΔL_p. Only PHQ-9 is computed (it needs `03:V1` with
`metodo=cuestionario_completo`); the others are reported as "incomplete: X missing" or "inactive" according to table d.6.

D16. **Unknown sex in QTc**: ≥ 460 ms and ≤ 390 ms are evaluated; between 450 and 460 ms it remains "indeterminate: sex missing".

D17. **No probability is shown.** ℓ_p is internal and only orders.

D18. **Crew** (c.4): n = people in the same channel and phase with data for that variable on that day. Without scipy:
the t → equivalent z conversion is done with the t CDF by numerical integration and `statistics.NormalDist`.

## 5. Result of `evaluacion.evaluar(...)`

```python
evaluar(obs, *, tablas, params=None, mision=None, perfiles=None, canal="real",
        ruta_estado=None, guardar=True) -> dict
```

Returns a JSON-serializable `dict`:

```python
{
  "canal": "real" | "simulado", "simulated": bool, "etiqueta": "SIMULADO" | None,
  "provisional": True,
  "aviso": "No es un diagnóstico. Se recomienda revisión por el cirujano de vuelo.",
  "umbrales": {nombre: {"valor":…, "provisional": True, "supuesto": "S2", "modificado_por_usuario": bool}},
  "personas": {
    subject_id: {
      "simulated": bool, "fase": "PRE"|"VT"|"VTa"|"POST", "fecha_evaluacion": "YYYY-MM-DD",
      "fechas": ["YYYY-MM-DD", …],                       # todas las evaluaciones
      "padecimientos": [                                   # los 20, ordenados según f.3
        {"padecimiento_id", "padecimiento", "color", "motivo",   # motivo: por qué ese color, en texto
         "condiciones": ["A1", …], "estructural": bool, "todo_n4": bool,
         "T", "T_de", "T_inf", "T_max", "dL", "dL_de", "dL_inf", "prior": {…} | None,
         "cobertura", "cobertura_ok", "nucleo_con_dato",
         "ligas": [ {"variable_id", "variable", "peso", "prior_de", "nivel_evidencia",
                     "nivel_efectivo", "sigma_efectiva", "modificado_por_usuario", "fuente",
                     "fuente_urls": [..], "direccion", "tipo_direccion", "medido_en_vuelo",
                     "ausencia": "F1"…"F7" | None, "motivo_ausencia",
                     "valor", "unidad", "fecha_dato", "antiguedad_dias", "nivel_calidad",
                     "clase_dispositivo", "z_pob", "z_fase", "z_act", "u", "var_z",
                     "activacion", "aporte", "grupo", "cuenta_en_T", "criterio": {…} | None,
                     "bayes": {"kappa", "ln_lr", "de"} | None, "estado_variable",
                     "delta_tripulacion": {…} | None, "etiquetas": [..]} ],
         "pasos": ["1. …", "2. …"],                       # cálculo paso a paso, en texto llano
         "capas_fijas": [{"nombre", "estado", "detalle"}],
         "etiquetas": ["[terrestre]", "cobertura baja", …],
         "historial": [{"fecha", "color", "T", "T_inf"}]}
      ],
      "variables": {variable_id: {"clase", "base": {…}, "media_adaptativa", "cusum", "aprendidos",
                                  "excluidos", "estado"}},
      "sin_variable": [ … ], "rechazadas": [ … ]
    }
  },
  "registro": [ … ]                                         # intentos rechazados, exclusiones
}
```

In addition: `evaluacion.evaluar_en(resultado_o_estado, fecha)` is not needed; to view another day,
`historial` (color, T, T_inf per date) is used.

## 6. User overrides

`datos/modelo/overrides.json` (does not exist until the user edits something):

```json
{"version": 1,
 "nota": "Valores modificados por el usuario. No tienen fuente. Provisional.",
 "ligas": {"P01|01:V31": {"peso": 2.0, "prior_de": 1.0, "modificado": "2026-11-14T22:10:00"}},
 "umbrales": {"T_amarillo": {"valor": 3.5, "modificado": "…"}}}
```

`parametros.restaurar()` deletes the file (it returns to the sourced tables and the default provisional
thresholds). The CSVs in `datos/modelo/` are never written to.

## 7. Mandatory arithmetic checks (d.4, d.7)

- One fully activated link of weight 3: T = 3; T_inf = 2.18 (A), 1.36 (B), 0.53 (C).
- P01 with only the ECG adapter (flag = 1, QTc meets the criterion, beats in the flag's group):
  T = 5; SD = 2.12; T_inf = 1.51; YELLOW; never RED (all N4).
- P04 with alerted HR (2, A, N1) and alerted temperature (3, B, N3b): T = 5; SD = 1.12; T_inf = 3.16;
  YELLOW immediately and RED if it persists 24 h.

## 8. Implementation status (Nov 15, 2026)

Actual signature: `evaluar(obs, *, tablas=None, params=None, mision=None, perfiles=None, canal="real", ruta_estado=None,
guardar=True, ruta_overrides=None, rechazadas=None)` and `evaluar_todo(sens_df=None, raw_dir=None, ecg_en_reposo=False,
mision_real=None, perfiles_real=None, guardar=True, *, simulado=True, ruta_estado_real=None, ruta_estado_simulado=None,
ruta_overrides=None)`.

Simplified or not implemented (all provisional): phase δ = 0 (D5); of the fixed layers only PHQ-9 is computed (D15);
absence F6 (the latency column is missing, S17); "phase-dependent" only for `↑ en vuelo / ↓ postvuelo`; "indeterminate"
only for QTc without sex (D16); P02 prior not used (it depends on mission duration); crew labels only in
the last evaluation; no interface for acknowledging RED or closing a CUSUM review (they remain as functions of
`Calibracion`); R-1 and R-2 additionally require an active link that is not context (stricter than f.1). The false-alarm
rate is not measured: the SIMULATED dataset deliberately uses bounded noise. Nothing is a diagnosis.

<!-- END OF CONSOLIDATED DOCUMENT: prototipo-salud/motor/DISENO.md -->

## Consolidated document: `prototipo-salud/NOTA-INSTALACION-PADECIMIENTOS.md`

> Original source: `prototipo-salud/NOTA-INSTALACION-PADECIMIENTOS.md`

# Installation note: "Padecimientos" (Conditions) and "Configuración" (Settings) views

Prototype update package (Nov 15, 2026). It only includes new or changed files. **None of this is a
diagnosis**: the traffic light prioritizes what to review and recommends consulting the flight surgeon; all thresholds are
provisional and none is validated in astronauts.

## How to install it
1. Close the app if it is open.
2. (Recommended) save a copy of your current `app.py`, `README.md`, `AVANCE.md` and `tests/conftest.py`: they are the only
   existing files this package replaces.
3. Unzip the zip **on top of** the prototype folder (the one that contains `app.py`), accepting replacement. In PowerShell:
   ```powershell
   Expand-Archive -Path .\prototipo-padecimientos.zip -DestinationPath .\prototipo -Force
   ```
   (replace `.\prototipo` with the path of your folder).
4. Open the app as usual: `.\scripts\lanzar_app.ps1`. The «Vista» (View) selector appears in the sidebar:
   «Modelos y sensores» (Models and sensors; the usual content, sections 0–7 unchanged) | «Padecimientos» (Conditions) | «Configuración» (Settings).

No GPU, weights or package installation is needed: it uses the same `envs\app` environment (streamlit, pandas, numpy). It does not touch
`envs\`, `vendor\`, `weights\` or `outputs\`.

## What it includes
- `app.py` (only the view selector was added), `.streamlit/config.toml` (light theme), `paginas/` (the two views and the CSS).
- `motor/` (the algorithm of `ALGORITMOS.md`; design and limits in `motor/DISENO.md`).
- `datos/modelo/` (copies of `PADECIMIENTOS.csv` and `PADECIMIENTO-VARIABLE.csv`, and the provisional classification of `direccion`).
- `datos/simulado/` (**SIMULATED** crew: 5 people, 30 days, `simulated=true`; it is not real physiology or flight data).
- New `tests/` (`test_motor_*.py`, `test_paginas.py`, `motor_testutil.py`), `tests/conftest.py` (the tests neither read nor
  touch your `overrides.json` or your runs in `outputs\raw`), updated `README.md` and `AVANCE.md`.

## How to use it
- **Padecimientos (Conditions):** choose a person. Those of the synthetic crew carry the large **SIMULADO** (SIMULATED) label and are never
  mixed with real data. Real people appear when there are runs in `outputs\raw` (today: ECG) or sensors loaded in
  section 5. «Ver» (View) opens the detail: variables, weight, evidence level, link to the source, step-by-step computation and why
  that color. In «Contexto de la persona» (Person context) you can declare launch date, age, sex and whether the ECG was taken at rest.
- **Configuración (Settings):** edit thresholds, weight and `prior_de`. Edits are saved in `datos/modelo/overrides.json`, are marked
  «modificado por el usuario» (modified by the user; no source) and do not change the CSVs. «Restaurar valores con fuente» (Restore sourced values) deletes that file.
- The app writes its local state to `datos/estado/` and `datos/simulado/calibracion_SIMULADO.json`; they can be deleted without losing anything.

## Check (optional)
`.\scripts\verificar.ps1` also runs the new tests (on Linux: 98 passed, 5 skipped). It has not been tested on Windows.

## Limits
Provisional thresholds; weights mostly at level C; no in-flight validation; the echo outputs and the ECG flags
are experimental (forced level C, they do not produce RED on their own); LVEF and the rules R1–R5 do not move the traffic light. **This is not a diagnosis.**

<!-- END OF CONSOLIDATED DOCUMENT: prototipo-salud/NOTA-INSTALACION-PADECIMIENTOS.md -->

## Consolidated document: `prototipo-salud/samples/FUENTES.md`

> Original source: `prototipo-salud/samples/FUENTES.md`

# Samples (provenance and license)

All are OFFICIAL samples published within the repositories cloned into `vendor/` (revisions in
`vendor/REVISIONES.md`). They were copied without modification (sha256 below). No dataset requiring registration was downloaded.
Use: local, non-commercial tests, with no redistribution outside the team. None is from astronauts.

| File | Exact origin | License / conditions | Modality / view | Format | sha256 |
|---|---|---|---|---|---|
| `echoclip_example_video.avi` | `vendor/echo_CLIP/example_video.avi` (https://github.com/echonet/echo_CLIP, commit 23cd327) | Cedars-Sinai Academic Software License (the repo's LICENSE file): educational/academic research or non-profit use only, no transfer to third parties. | 2D B-mode video; apical view (not verified by us) | MJPEG 224×224, 113 frames, 30 fps | b50434d04509bcc6dd080095a8f3021e1f6d92c094a598d6a945f0566cc40ce0 |
| `echonet_dynamic_Example1.mp4` | `vendor/dynamic/docs/media/Example1.mp4` (https://github.com/echonet/dynamic, commit e01d029) | The repo includes LICENSE (MIT) and LICENSE.txt (prohibits redistribution/use of the code and "associated material" without written permission). The README does not state the origin of this clip; the EchoNet-Dynamic dataset requires a Research Use Agreement, so only this file published in the repo is used, locally and without redistribution. | 2D B-mode video; apical 4-chamber (A4C) by visual inspection | H.264 582×582, 120 frames, 30 fps | 7a5c13107a2e28b83e6e0b0f68f4682fd869b214a4fecd6206ae5a26b8af5d78 |
| `echonet_dynamic_example_small.mp4` | `vendor/dynamic/docs/media/example_small.mp4` (same repo and commit) | Same as the previous row | 2D B-mode video (same type as Example1, different file) | H.264 582×582, 120 frames, 30 fps | 34fd7ff392f26a35b623de5108806cc5cac3d6f67112f98df278e4c8f87f6fbd |

Notes:
- `vendor/dynamic/docs/media/0X*.mp4` are NOT used as input: they are 224×112 visualizations with the original video and the
  segmentation overlaid side by side (they are not raw videos).
- The view is declared manually at run time; there is no verified view classifier in this prototype.


## ECG samples (`ecg` module)

**REAL PUBLIC DATA from hospital patients (MIT-BIH Arrhythmia Database and MIT-BIH Atrial Fibrillation Database, PhysioNet). They are NOT from Iker or from astronauts.**

They are lossless 180 s excerpts (same ADC values, same 2 channels, same format 212) of public records already downloaded into `../datos/ecg`. They are not a diagnosis. Open access without credentials or prior acceptance of terms (according to the pages, consulted on 2026-11-14).

| File | Exact origin | License / conditions | Contents | Format | sha256 |
|---|---|---|---|---|---|
| `ecg_normal_mitdb100.hea` | `physionet:mitdb/1.0.0/100` (https://physionet.org/content/mitdb/1.0.0/) | Open Data Commons Attribution License v1.0 (ODC-By 1.0); attribution required | WFDB header (2 channels, format 212) | WFDB text | b270d5590ce01996b54e4d9fd5e8c94b961e3917bc072d185fcc915007590bf0 |
| `ecg_normal_mitdb100.dat` | `physionet:mitdb/1.0.0/100` (https://physionet.org/content/mitdb/1.0.0/) | Open Data Commons Attribution License v1.0 (ODC-By 1.0); attribution required | 2-channel ECG signal, ADC values identical to the original | WFDB format 212 | 81fdaff8a4c839a69fd12f47887ea6d2eb51fa5641ed667eb521179884c4a122 |
| `ecg_normal_mitdb100.atr` | `physionet:mitdb/1.0.0/100` (https://physionet.org/content/mitdb/1.0.0/) | Open Data Commons Attribution License v1.0 (ODC-By 1.0); attribution required | Trimmed annotations (beats and rhythm) | WFDB annotation | 90159f7e878c0961daa718f96b92ffc34b8c06311e44e917e0407a7b1274248c |
| `ecg_fa_afdb04015.hea` | `physionet:afdb/1.0.0/04015` (https://physionet.org/content/afdb/1.0.0/) | Open Data Commons Attribution License v1.0 (ODC-By 1.0); attribution required | WFDB header (2 channels, format 212) | WFDB text | a8084e7e5fe609d1254d8f977f246de9c156d82b99b8e25ad48eb0ce4a49222e |
| `ecg_fa_afdb04015.dat` | `physionet:afdb/1.0.0/04015` (https://physionet.org/content/afdb/1.0.0/) | Open Data Commons Attribution License v1.0 (ODC-By 1.0); attribution required | 2-channel ECG signal, ADC values identical to the original | WFDB format 212 | 5ca3a2077b94afc6163f9882e88c56e50b4001b51d7c172e9a0e61c7ac043d9a |
| `ecg_fa_afdb04015.atr` | `physionet:afdb/1.0.0/04015` (https://physionet.org/content/afdb/1.0.0/) | Open Data Commons Attribution License v1.0 (ODC-By 1.0); attribution required | Trimmed rhythm annotations only (+ initial rhythm added); the original has no beats | WFDB annotation | 6eb941ad66de253f256c105a7cb3795b2db10dbfd82c1683b2674862b27417ea |
| `ecg_fa_afdb04015.qrs` | `physionet:afdb/1.0.0/04015` (https://physionet.org/content/afdb/1.0.0/) | Open Data Commons Attribution License v1.0 (ODC-By 1.0); attribution required | Beats from an automatic detector, NOT audited | WFDB annotation | 2f016d04797b874c1f3920a3d51ed26407a3d32cf403da174169e385d1e6fdd2 |
| `ecg_extrasistoles_mitdb201.hea` | `physionet:mitdb/1.0.0/201` (https://physionet.org/content/mitdb/1.0.0/) | Open Data Commons Attribution License v1.0 (ODC-By 1.0); attribution required | WFDB header (2 channels, format 212) | WFDB text | 0954cdb45622cb02bd3277c2e2dac955a06f40188e17aa8b6abd1507670c6dbb |
| `ecg_extrasistoles_mitdb201.dat` | `physionet:mitdb/1.0.0/201` (https://physionet.org/content/mitdb/1.0.0/) | Open Data Commons Attribution License v1.0 (ODC-By 1.0); attribution required | 2-channel ECG signal, ADC values identical to the original | WFDB format 212 | 25f0e712c3c8d695e18d7e70e583ccf62f38a968a31b2ebfee1f809c51a3ce3b |
| `ecg_extrasistoles_mitdb201.atr` | `physionet:mitdb/1.0.0/201` (https://physionet.org/content/mitdb/1.0.0/) | Open Data Commons Attribution License v1.0 (ODC-By 1.0); attribution required | Trimmed annotations (beats and rhythm) | WFDB annotation | 376cfdd23a004b6f0ce3da5b33181c1acd7e12a937f757acef694fdb17a2dced |

### ecg_normal_mitdb100
- Record 100, MIT-BIH Arrhythmia Database v1.0.0. Channels MLII, V5. 360 Hz.
- Samples 172800–237600 of the original (480–660 s); 64800 samples = 180 s.
- Annotated rhythm: (N throughout the segment (0–180 s).
- Beats in the segment: N=230; no A or V (window chosen by code: the first one aligned to multiples of 30 s without A/V beats; the earlier ones contained A or V).

### ecg_fa_afdb04015
- Record 04015, MIT-BIH Atrial Fibrillation Database v1.0.0. Channels ECG1, ECG2. 250 Hz.
- Samples 130000–175000 of the original (520–700 s); 45000 samples = 180 s.
- Rhythms (times relative to the segment; verified against the actual .atr): (N 0–13.392 s (13.4 s); (AFIB 13.392–147.428 s (134.0 s); (N 147.428–180 s (32.6 s). In the original: (AFIB at sample 133348, (N at 166857.
- The original .atr only has rhythm annotations (no beats). Trimmed `.qrs`: N=359 (automatic detector, NOT audited; use only as an unverified reference).

### ecg_extrasistoles_mitdb201
- Record 201, MIT-BIH Arrhythmia Database v1.0.0. Channels MLII, V1. 360 Hz.
- Samples 194400–259200 of the original (540–720 s); 64800 samples = 180 s.
- Rhythms (relative s): (N 0–14.47; (T 14.47–36.84; (N 36.84–68.09; (T 68.09–79.97; (N 79.97–101.33; (T 101.33–116.31; (N 116.31–121.02; (T 121.02–180 (T = trigeminy). No (AFIB. Window chosen by code: the first one aligned to 30 s within 188387–570586 with only N/(T rhythms and ≥10 V.
- Beats in the segment: N=110, V=40, a=2 (aberrated atrial premature), x=4 (non-conducted P); no A.

### How it was generated
`python samples/crear_muestras_ecg.py` (optional `--datos RUTA`, default `../datos/ecg`). It uses wfdb 4.3.1 (`rdrecord`/`wrsamp`/`wrann`) and checks with `assert` that the re-read signal, beats and rhythms match the shifted original.

**Clarification:** in the three trimmed `.atr` files, the rhythm annotation (symbol `+`, aux_note with the current label) at sample 0 was ADDED by the script to preserve the rhythm in effect at the start of the segment; it is not at that position in the original. In all three it is `(N`. The AFDB `.qrs` is the output of an automatic detector and has not been audited.

### Verified license
Pages consulted on 2026-11-14 (WebFetch): https://physionet.org/content/mitdb/1.0.0/ and https://physionet.org/content/afdb/1.0.0/. Both show the license **Open Data Commons Attribution License v1.0** and say "Anyone can access the files, as long as they conform to the terms of the specified license" (open access; login only serves to see the author's contact). Attribution is required with the following citations.

### Required citations
MIT-BIH Arrhythmia Database (according to https://physionet.org/content/mitdb/1.0.0/):
- Moody, G., & Mark, R. (2005). MIT-BIH Arrhythmia Database (version 1.0.0). PhysioNet. RRID:SCR_007345. https://doi.org/10.13026/C2F305
- Moody GB, Mark RG. The impact of the MIT-BIH Arrhythmia Database. IEEE Eng in Med and Biol 20(3):45-50 (2001). PMID: 11446209. https://doi.org/10.1109/51.932724
- Standard PhysioNet citation (the page now gives it this way, not as Goldberger et al. 2000): Pollard, T., et al. (2026). PhysioNet as a global platform for biomedical research. Nature Health. https://doi.org/10.1038/s44360-026-00096-z

MIT-BIH Atrial Fibrillation Database (according to https://physionet.org/content/afdb/1.0.0/):
- Moody GB, Mark RG. A new method for detecting atrial fibrillation using R-R intervals. Computers in Cardiology 10:227-230 (1983). http://ecg.mit.edu/george/publications/afib-cinc-1983.pdf (no DOI on the page)
- Dataset DOI v1.0.0: 10.13026/C2MW2D
- Standard PhysioNet citation: Pollard, T., Moody, B. E., Lehman, L., Gow, B., Fernandes, C., Xie, C., Johnson, A., Mark, R. G., & Heldt, T. (2026). PhysioNet as a global platform for biomedical research. Nature Health. DOI 10.1038/s44360-026-00096-z

Note: license, access policy and citations were additionally checked against the HTML of both pages (downloaded with `curl` on 2026-11-14, without logging in): the license text, the DOI of each database, the Moody & Mark citation and the standard PhysioNet citation (Pollard et al. 2026, Nature Health 1(8):792–795) appear verbatim in the "please cite" block of each page.

### Copies of complete records in the validation
The following text describes the planned layout of `validacion/ecg/runs/<run_id>/input/`. As of Nov 15, 2026 that folder
**is not in the repository** (same pending item as `validacion/ecg/VALIDACION.md`).
`validacion/ecg/runs/<run_id>/input/` would store an unmodified copy of each record analyzed in the validation of the
ECG module: 100, 201 and 203 from the MIT-BIH Arrhythmia Database v1.0.0 (`.hea`, `.dat`, `.atr`) and 04015 from the MIT-BIH
Atrial Fibrillation Database v1.0.0 (`.hea`, `.dat`, `.atr`, `.qrs`). Same license (ODC-By 1.0) and same citations as
above. They are also **real public data from hospital patients, not from Iker or from astronauts**.

<!-- END OF CONSOLIDATED DOCUMENT: prototipo-salud/samples/FUENTES.md -->

## Consolidated document: `prototipo-salud/sensores/ESQUEMA.md`

> Original source: `prototipo-salud/sensores/ESQUEMA.md`

# Sensor schema (STEP 5)

Every example in this folder is **SYNTHETIC** (`simulated=true`, notes "DATO SINTÉTICO generado por
generar_sintetico.py, no es de ninguna persona" — synthetic data generated by generar_sintetico.py, not from any person). None of this is a diagnosis.

## Long format (CSV or JSON: list of objects, or `{"rows": [...]}`)
`subject_id, timestamp, device, variable, value, unit, quality, simulated, metric_detail, notes`

- Required: `subject_id`, `timestamp` (ISO-8601, e.g., `2026-11-01T08:30:00` or with time zone `...+00:00`), `device`.
  Rows without subject_id/device or with an invalid timestamp are DISCARDED with a warning (how many and why).
- `unit`: required, or it is inferred from `VARIABLES` (with a warning). It is only converted if unambiguous
  (°F->°C, K->°C, min->h in sleep_duration, h->min in active_minutes) and this is noted in `notes`; any other incompatible unit => row discarded with a warning.
- `simulated`: kept as is; if the column or the cell is missing, `false` is assumed and a warning is issued.
- `metric_detail`: HRV ALWAYS carries its metric (`hrv_rmssd` or `hrv_sdnn`; a generic `hrv` is only accepted if metric_detail is rmssd/sdnn).
- Unspecified `temperature`/`temp` is rejected: use `temp_skin` (skin) or `temp_body` (body).

## Wide format (CSV)
`subject_id, timestamp, device` + one column per variable (canonical name or alias; optional unit suffix
`temp_body__F`) + optional `quality, simulated, notes`. Empty cells do NOT generate rows (absent != 0).

## Variables (canonical unit)
heart_rate (bpm), hrv_rmssd (ms), hrv_sdnn (ms), spo2 (%), bp_systolic / bp_diastolic (mmHg), temp_skin (°C, skin),
temp_body (°C, body), sleep_duration (h), sleep_efficiency (%), steps (count), active_minutes (min), symptom (text in `value`).
Not all are required. Evidence notes: watch SpO2 tends to overestimate in hypoxemia; watch/ring temperature
is only useful as a relative change.

## Missing values
Empty value => `NaN` (never 0). In long format the row is kept with `value=NaN`; in summaries: `n` (valid), `faltantes`
(NaN in the window) and `*_motivo` columns when something cannot be computed (trend with n<3, baseline with <3 values).
A `timestamp` without a time zone is kept as is and, when cross-referencing with other sources, UTC is assumed (the "night" 22:00-06:00 uses the stored time).

## Examples and test data for the NightSignal-type rule
`ejemplo_sintetico_sensores.csv|json` (1285 rows, 2 people, 2026-11-01 to 2026-11-10 08:00, seed 20261114; regenerate:
`python sensores/generar_sintetico.py`), `ejemplo_sintetico_ancho.csv` (11 rows, temp_body in °F).
- **SIM-A01**: watch, ring, manual cuff, thermometer, diary; **the nights of November 8 and 9 have nighttime HR ~+6 bpm
  above their baseline**, so rule R3 (NightSignal-type, Alavi 2022) activates with SIMULATED data.
- **SIM-B02**: control without elevation; no SpO2 or blood pressure (absent variables); no ring.
- There are NaN gaps (~6% of the watch HR, days without a thermometer), varied qualities and HRV with an explicit metric.

<!-- END OF CONSOLIDATED DOCUMENT: prototipo-salud/sensores/ESQUEMA.md -->

## Consolidated document: `prototipo-salud/validacion/README.md`

> Original source: `prototipo-salud/validacion/README.md`

# External validation: Inspiration4 (OSDR, open)

PROVISIONAL. This is not a diagnosis. **Real** data (not SIMULATED) from the 4 Inspiration4 civilians (C001–C004; 3 days in orbit, 2021-09-16 → 2021-09-18 UTC).

## Sources (public access, no registration or data use agreement)
| OSDR | File | Engine variables |
|---|---|---|
| [OSD-569](https://osdr.nasa.gov/bio/repo/data/studies/OSD-569) (LSDS-7) | `LSDS-7_Complete_Blood_Count_CBC.upload_SUBMITTED.csv` | 04:A10 leukocytes, 01:V98 abs. lymphocytes, 01:V99 abs. neutrophils, 01:V60 platelets, 01:V108 Hb, 01:V109 Hct |
| [OSD-575](https://osdr.nasa.gov/bio/repo/data/studies/OSD-575) (LSDS-8) | `LSDS-8_Comprehensive_Metabolic_Panel_CMP.upload_SUBMITTED.csv` | 01:V39 potassium, 02:V31 sodium, 02:V14 calcium |
| OSD-575 (LSDS-8) | `LSDS-8_Multiplex_serum.cardiovascular.EvePanel_SUBMITTED.csv` | 04:A13 CRP (pg/mL → mg/L) |

The OSDR metadata do not declare an explicit license; the download is public. **The raw files are not uploaded to the repo**: the script downloads them.
There are no open HR, HRV or SpO2 data for Inspiration4 in OSDR (the Apple Watch data are in Jones et al. 2024, not as an open file in OSDR); nothing controlled was used (LSDA/LSAH/restricted OSDR).
Time points: PRE L-92, L-44, L-3 · POST R+1, R+45, R+82, R+194 (there is no in-flight blood in these files). Dates computed from launch/splashdown; the time of the blood draw is not reported.

## Usage
```bash
cd prototipo-salud
python -m validacion.inspiration4 --dir /tmp/i4_osdr --json /tmp/i4_resultado.json
```
It evaluates cumulatively at each time point, with temporary state (it does not touch `eva.db`). It runs two configurations: the default one and a **sensitivity** one with `n0_min = 3` (the engine requires 5 pre-flight points, Coskun 2021).

## Results (run of 2026-11-15)
- 278 native rows, 0 rejected by the quality gate.
- **Default configuration:** 80/80 cells GRAY at all time points. With 3 pre-flight blood draws there is no personal baseline (n0 < 5) and the lab tests have no population reference in the engine; the engine refuses to assign a color rather than invent one.
- **Sensitivity n0_min = 3:** at R+1 it flags potassium ↓ (C002 z −3.5, C003 z −2.4; C003 = 3.0 mmol/L, below the laboratory range 3.5–5.3) and leukocytes ↓ in C003 (z −8.8 with 7.0 ×10³/µL, within range: the pre-flight SD with 3 points is very small, which shows why the engine requires ≥ 5). No condition comes out RED; only P17 YELLOW in C004 at R+194.
- **Laboratory flag (Quest, in the same file):** at R+1 only C003's potassium (3.0) is out of range; the engine detects it in the sensitivity configuration.
- **Questionable data point in the source:** C003 L-92 has platelets 12.9 and neutrophils 10.1 (incompatible with the other time points; probable unit error). The quality gate does not reject it (it is a possible value).

## What the study reported
- Jones et al. 2024, *Nature* 632:1155 ([doi:10.1038/s41586-024-07648-x](https://doi.org/10.1038/s41586-024-07648-x)): almost all changes returned to baseline after return; short missions without significant risk.
- Kim et al. 2024, *Nat Commun* 15:4954 ([doi:10.1038/s41467-024-49211-2](https://doi.org/10.1038/s41467-024-49211-2)): cell proportions stable during flight, also in the CBC.
- Houerbi et al. 2024, *Nat Commun* 15:4862: acute changes at R+1 in coagulation, platelet activation and inflammation measured with proteomics (not with the engine's variables).

Concordance: the engine does not raise any RED at R+1, consistent with what was reported. Limitation: this is concordance by absence of alerts, with n = 4, no in-flight data and no vital signs.

## Experiment: pre-flight baseline completed with SIMULATED filler (`--rellenar-simulado`)
**This is not validation and does not prove anything clinical.** The pre-flight baseline becomes partially SIMULATED.
- The 4 CBC rows of C003 at L-92 (platelets 12.9, neutrophils 10.1, lymphocytes 6826, leukocytes 9.6), suspected of unit error, are excluded.
- Per crew member/variable, PRE points are added up to 5 (dates L-75, L-60, L-30, L-20, L-10): N(mean of their real PRE measurements, SD of those measurements); if the SD is 0 or there are < 2 measurements, the crew's pooled within-subject SD. Seeds 0, 1, 2. 84 filler points per seed.
- Since the engine never mixes channels (G1), everything is evaluated in the **SIMULATED** channel; the real rows keep `Inspiration4 (OSDR, abierto)` in `notes`.
- Normal engine configuration (n0_min = 5), temporary state.

Result (2026-11-15): no RED in any seed or time point. What repeats in ≥ 2 of 3 seeds: at R+1 potassium ↓ (C002, C003) and leukocytes/neutrophils ↓ in C003; P17 YELLOW in C004 at R+82/R+194. P08 YELLOW in C003 (R+1 to R+194) only with seed 2. The z-scores change a lot between seeds (e.g., leukocytes C003 at R+1 from −2 to −12): with 3 real measurements, the baseline depends on the filler.
Laboratory (Quest): at R+1 only C003's potassium (3.0 mmol/L) is out of range. Jones 2024 / Kim 2024: almost everything returned to baseline; CBC stable.

<!-- END OF CONSOLIDATED DOCUMENT: prototipo-salud/validacion/README.md -->

## Consolidated document: `README.md`

> Original source: `README.md`

# LUNNA · Health monitoring for space missions

Project by the Monarcas team for NASA Space Apps Challenge 2026. It brings together the EVA/LUNNA system, its simulation mode and an independent research prototype for analyzing health signals and data.

> This is an educational/research prototype: it is not a medical device, it does not diagnose, and it is not validated for clinical use or for use in astronauts. The initial crew is fictitious; the demo data are synthetic.

## Requirements

- **Node.js 22.6 or later** for EVA and the simulation. Neither requires `npm install`.
- **Python** only for the **health prototype**; its requirements and detailed procedure are documented there.
- PowerShell on Windows, Terminal on macOS/Linux.

Check Node with:

```powershell
node --version
```

## Start the demo

Open PowerShell in the repository root folder and run:

```powershell
Set-Location .\Simulacion
npm start
```

Open the screens in the browser using the links in the [Interfaces](#interfaces) section. The simulation uses synthetic data and a separate database: `Simulacion/eva-simulacion.db`.

Optionally, from another terminal in `Simulacion`, start the telemetry generator:

```powershell
npm run generador
```

## Start the system without the simulation scenario

First stop any other project server; both modes use port **8787**.

```powershell
Set-Location .\Sistema\backend
npm start
```

This mode does not load the simulator or the synthetic scenario. Its local database is `Sistema/backend/eva.db`. The crew seeds are fictitious and the parameters are provisional; the backend does not create real sensor data on its own.

To stop either server, go back to its terminal and press **Ctrl+C**.

## Interfaces

With the server running, open:

| Interface | Address |
|---|---|
| Crew app | [http://localhost:8787/app/](http://localhost:8787/app/) |
| Central computer | [http://localhost:8787/app/central.html](http://localhost:8787/app/central.html) |
| Earth base | [http://localhost:8787/app/base.html](http://localhost:8787/app/base.html) |
| Watch | [http://localhost:8787/reloj/](http://localhost:8787/reloj/) |
| Earth console | [http://localhost:8787/tierra](http://localhost:8787/tierra) |
| Spacecraft panel | [http://localhost:8787/nave](http://localhost:8787/nave) |
| Visual spacecraft simulator · simulation only | [http://localhost:8787/simulador](http://localhost:8787/simulador) |
| Backend status | [http://localhost:8787/api/salud](http://localhost:8787/api/salud) |

The status endpoint reports the active mode. In operational mode, the visual simulator is not available.

## Checks

Run each command from the indicated folder:

```powershell
# Sistema operativo
Set-Location .\Sistema\backend
npm test

# Simulación
Set-Location ..\..\Simulacion
npm test
```

## Health prototype (optional)

The Streamlit app in `prototipo-salud` is a separate project from the EVA interfaces. To start its basic interface:

```powershell
Set-Location .\prototipo-salud
.\scripts\instalar_app.ps1
.\scripts\lanzar_app.ps1
```

Then open [http://localhost:8501](http://localhost:8501). The initial setup lets you explore the app without downloading the model weights; echocardiography inference requires additional steps and resources. See **prototipo-salud/README.md**.

## Guides

- **EVA/LUNNA system** · operational mode and components.
- **Backend** · API, telemetry and contracts.
- **EVA interfaces** · app, central computer and base.
- **Watch interface**.
- **Simulation** · synthetic scenario and generator.
- **Health prototype** · installation, models, engine, data and limitations.

## Deployment

These instructions are intended for running the demo locally. The project is not prepared for medical operation or for exposure as a public service; do not use its data, traffic lights or alerts to make clinical decisions.

<!-- END OF CONSOLIDATED DOCUMENT: README.md -->

## Consolidated document: `Simulacion/README.md`

> Original source: `Simulacion/README.md`

# Simulation

Everything that produces or displays **synthetic data**. Nothing in this folder comes from an astronaut or from a
real sensor. It uses the code in **`Sistema/`** without copying it: `Sistema/` does not depend on
this folder, but this folder does depend on `Sistema/`.

```bash
cd Simulacion
npm start          # el backend de Sistema/ en modo simulación → http://localhost:8787
npm run generador  # generador de telemetría sintética por terminal (antes: npm run sim)
npm test           # pruebas del modo simulación
```

Requires **Node 22.6+**, no `npm install`. `npm start` uses its own database, `eva-simulacion.db` (in this
folder, ignored by git), so that synthetic data never end up in the operational database
(`Sistema/backend/eva.db`).

| Folder | What it is |
|---|---|
| `simulador/simulador.html` | Visual spacecraft simulator at **/simulador**: astronaut, devices, central PC and Earth. The PC opens the central computer (`/app/central.html`), the smartphone the app (`/app/`), Earth the base (`/app/base.html`) and the watch the crew watch (`/reloj/`) |
| `generador/simulador.ts` | Terminal generator: binary frames in the EVA profile and JSON frames like the gateway's, 4 crew members and 112 days |
| `escenarios/interfaces/` | Interface scenario: `datos.js` (days 106–115 with a fixed seed) and `demo.js` (automatic demo, `?demo`). The backend serves them at `/app/escenario/…` only in this mode |
| `donki/` | Solar particle events from **NASA DONKI** (real data, used as the model for the day-115 event) and `fetch_donki.py`, which downloads them with the `NASA_API_KEY` from the root `.env` |
| `test/` | The simulator windows, the scenario, the demo reset and the generator, end to end |

In this mode every screen carries the **«Simulación · datos sintéticos»** ("Simulation · synthetic data") badge, the backend
status page says **MODO SIMULACIÓN** ("SIMULATION MODE") and `GET /api/salud` responds `"modo": "simulacion"`.

URLs: `/simulador`, `/app/`, `/app/central.html`, `/app/base.html`, `/reloj/` and `/tierra`, the same as
always.

<!-- END OF CONSOLIDATED DOCUMENT: Simulacion/README.md -->

## Consolidated document: `Sistema/backend/ENLACE-HTTPS.md`

> Original source: `Sistema/backend/ENLACE-HTTPS.md`

# HTTPS link spacecraft ↔ Earth

Real transport (TLS) between two processes of the same backend. All demo data are SIMULATED.

## How to run it
```
npm run certs      # certs/tierra.crt + tierra.key (autofirmado, desarrollo; --forzar regenera)
npm run tierra     # HTTPS :8443  (consola /tierra, /enlace/*)
npm run nave       # HTTP  :8787  (UI, app, /nave) + cliente HTTPS hacia Tierra
```
Variables: `BD`, `PUERTO` (0 = ephemeral; prints `PUERTO=<n>`), `TIERRA_URL` (default `https://localhost:8443`), `TIERRA_CA`, `TLS_CERT`, `TLS_KEY`, `PING_S` (default 60), `TIMEOUT_S` (default 5), `SIMULAR_OWLT=1`.
Status: `GET /api/enlace/estado` (spacecraft and Earth). Code: `src/sincro.ts` (protocol), `src/enlace-https.ts` (transport).

## Algorithm
- Each side has its own output queue (outbox): `bajada` (spacecraft→Earth) and `subida` (Earth→spacecraft). Each message carries `(emisor, seq)`, with seq monotonic per sender.
- Batches by priority and then seq; the JSON body is sent with `x-eva-sha256`. If it does not match: 422 and nothing is applied.
- The receiver stores each `(emisor, seq)` only once (UNIQUE on `entrada`); inbox + application in a single transaction. Retransmissions = ignored duplicates.
- Cumulative ACK (1..n complete) + selective ACKs; the sender marks `ack=1`. Anything unacknowledged is automatically re-included in the next batch: resumption starts from what is pending.
- Failure of any request (timeout, network, status ≠ 200) → immediate DESCONECTADO (disconnected) and retry with exponential backoff with jitter (base 1 s, cap = `PING_S`).
- Effect: at-least-once in transport + idempotence = exactly-once.

## Times and channels
- `t_evento` (when it occurred), `t_envio` (batch departure), `t_recepcion` (applied at the receiver); age = now − t_evento.
- Earth→spacecraft notices: `subida`. Spacecraft→Earth notices: `bajada` of type `aviso` (`POST /api/nave/avisos`). Data: `alerta`, `resumen`, `crudos`, `evaluacion`, `acuse`.

## Heartbeat
Default 60 s; `PING_S=15` is recommended. Outage detection latency ≤ `PING_S` + `TIMEOUT_S` (batch failures are seen instantly). A GET with keep-alive costs almost nothing. Below ~10 s with `TIMEOUT_S=5`, the risk of false DESCONECTADO states due to jitter grows.
With real Mars (RTT of 8 to 48 min), a heartbeat of seconds only models the terrestrial segment: the window and the delay govern (`SIMULAR_OWLT=1` adds owlt before and after each request). Closed window = store and forward, no traffic.

## Limitations
- Server TLS only, with a self-signed development certificate: there is no authentication of the spacecraft to Earth (`x-eva-emisor` is informational, not a credential) and no encryption of the databases.
- One spacecraft and one Earth; no certificate rotation or rate limits. The keys live in `certs/` (ignored by git); they are not versioned.
- Resumption at batch level, not byte level.

<!-- END OF CONSOLIDATED DOCUMENT: Sistema/backend/ENLACE-HTTPS.md -->

## Consolidated document: `Sistema/backend/README.md`

> Original source: `Sistema/backend/README.md`

# EVA · Central computer + LUNNA

Receives frames from any device, attributes them to the correct crew member, stores them,
and gives notice when a vital sign departs from **what is expected for that person in that environment**.

**LUNNA** — *Live-telemetry Updating Network for Nominal-deviation & Anomalies* — is the
model that defines "what is expected".

```bash
npm start      # servidor en modo operativo; http://localhost:8787 = estado
npm test       # pruebas del backend (las del modo simulación están en Simulacion/test)
```

The visual simulator (`/simulador`), the synthetic telemetry generator and the interface scenario
live in **`Simulacion/`**: `cd Simulacion && npm start` starts **this same
server** in simulation mode (`--modo simulacion --simulacion <carpeta>`, with its own database
`Simulacion/eva-simulacion.db`) and `npm run generador` is the former `npm run sim`. In operational mode
`/simulador` and the scenario return 404 and `POST /api/demo/reiniciar` returns 403; `GET /api/salud`
says which mode it is running in.

Requires **Node 22.6+** and nothing else: SQLite and TypeScript are built into Node.
**Zero dependencies**, so there is no `npm install`.

---

## Architecture

```
 playera (ESP32) ─┐  binaria, perfil EVA, BLE directo
 brazalete ───────┤
 simulador ───────┘
                 ┌──────────────────── COMPUTADORA CENTRAL ────────────────────┐
 reloj ───┐ JSON │  dispositivo → tripulante → decodificar → fórmula → validar │
 celular ─┘      │       (tabla de asignaciones)   (esquema)                   │
                 │                         │                                   │
 semillas ──────►│                    SQLite ──► LUNNA ──► alerta              │
 (Leo, Iker)     └─────────────────────────┬───────────────────┬───────────────┘
                                           │                   │
                               REST + eventos en vivo     cola para Tierra
                                    (Fany)                (rojo primero)
```

---

## Contracts by team

### Fany · central interface

| For | Call |
|---|---|
| See everything live | `GET /api/stream` — `muestra`, `alerta`, `rechazo` events (SSE) |
| Current crew status | `GET /api/estado` |
| Chart of a variable | `GET /api/muestras?tripulante=ana&variable=04:A4&desde=…` |
| Prediction and expected band | `GET /api/prediccion/ana` |
| **Everything for one crew member, already evaluated** (used by the phone and the central computer) | `GET /api/app/:tripulante` — per variable: latest value, median, expected value, band, z, `estado`, `motivo`, clinical threshold, 14-day series; plus their alerts and notices |
| Reference clinical thresholds | `GET /api/referencias` (from `semillas/medibles.json`) |
| LUNNA window (demonstrations only) | `GET/PUT /api/lunna/ventana` `{ minutos }` — 1,440 during the mission |
| Alerts | `GET /api/alertas` |
| Edit variables · schemas · devices | `GET/POST /api/variables` · `/api/esquemas` · `/api/dispositivos` |
| Crew members, baselines and history | `GET/POST /api/tripulantes` · `PUT …/:id/basales` · `POST …/:id/historial` |
| Put on a device | `POST /api/asignaciones` `{ dispositivo, tripulante }` |
| Mission phases | `GET/POST /api/fases` `{ desde, entorno }` |
| Link with Earth | `GET/PUT /api/enlace` `{ owlt_s, abierto }` |
| What has reached Earth | `GET /api/tierra/bandeja[?tipo=resumen\|alerta\|crudos\|acuse\|consulta\|emergencia]` (with the age of each item) |
| Earth sends a notice | `POST /api/tierra/avisos` `{ para, texto, prioridad }` |
| Earth sends a manual alert | `POST /api/tierra/avisos` `{ tipo: "alerta", nivel: "ambar"\|"rojo", para, variable?, texto }` |
| Mission control console | `GET /tierra` |
| Notices already delivered to the spacecraft | `GET /api/avisos` |
| The CMO notifies a crew member (on board, no delay) | `POST /api/abordo/avisos` `{ para, texto, nivel?: "ambar"\|"rojo", de? }` · `GET /api/abordo/avisos` |
| The central computer queries Earth (goes down the link) | `POST /api/central/consultas` `{ sobre?, texto, nivel?, de? }` → `consulta` packet in the inbox |
| The phone logs an emergency | `POST /api/emergencias` `{ tripulante, modo: "SOS manual"\|"automático", causa?, disparadores? }` · `PUT /api/emergencias/:id` `{ resultado }` · `GET /api/emergencias[?tripulante=]` → `emergencia` packet (priority 0) |

Events of `/api/stream`: `muestra`, `alerta`, `rechazo`, `tierra` (something reached Earth),
`aviso` (a notice from Earth reached the spacecraft, or one from the CMO with `origen: "abordo"`), `enlace` and
`emergencia` (an emergency was opened or closed). The on-board logic lives in `src/abordo.ts`.

```js
const es = new EventSource('http://localhost:8787/api/stream');
es.addEventListener('alerta', (e) => mostrar(JSON.parse(e.data)));
```

Each prediction includes `pesos: { poblacion, historial, vuelo }`: it is the
**"where does this come from?"** button, already computed.

### Katia and Diana · intermediate devices

Phone or watch forward via `POST /api/tramas` (one frame or a list):

```json
{
  "frame": "eva.telemetry.v1",
  "source": { "id": "reloj-ana", "kind": "wrist" },
  "subject": "ana",
  "t_scet": "2027-03-18T07:42:09Z",
  "seq": 10452,
  "samples": [
    { "var": "04:A4", "value": 75, "unit": "bpm", "origin": "sensor", "quality": { "contacto": true } }
  ]
}
```

- `source.id` must be registered as a device (`perfil: "json"`).
- `t_scet` is when it **occurred**, not when it is sent.
- `subject` is a fallback: if the device is assigned, **the assignment prevails**.
- `quality.contacto: false` → it is stored, but LUNNA does not evaluate it.
- `origin: "estimated"` without `method` or `quality.ic95` → **rejected**.

### Leo and Iker · seeds

- **Data:** `POST /api/semillas` with their `SalidaTipo` as is
  (`Planeacion/Leo/ingesta/src/contrato.ts`). Missing variables and subjects are registered automatically.
- **Priors for LUNNA:** `PUT /api/priores`, one per variable and environment:

```json
{ "variable": "01:V1", "entorno": "orbita", "escala": "relativa",
  "mu0": -0.067, "tau0": 0.05, "sigma_mision": 0.03, "sigma_dia": 0.05,
  "extrapolado": false,
  "fuente": "cat.01 V1: media 24 h sistólica −8 ± 2 mmHg (n = 8)" }
```

`mu0` is the mean change (relative: −0.067 = −6.7%; absolute: units). **A prior
without `fuente` is rejected.** What we need from them: the final variables and, for
each one, `mu0` and `tau0` with their source. Today almost all are provisional.

### Hardware · binary EVA profile

What the smart shirt's ESP32, the cuff and the simulator send, little-endian:

```
┌ cabecera, 13 B ──────────────────────────────────────┬ carga ────────────────┐
│ ver u8 │ id_disp u32 │ id_esquema u16 │ seq u16 │ t_scet u32 │ según esquema │
└──────────────────────────────────────────────────────┴───────────────────────┘
```

`POST /api/tramas/binaria` with the raw body, or `{ "b64": "…" }`, or
`{ "b64": ["…", "…"] }` as a batch. `src/esquema.ts` provides `codificar()` and `decodificar()`:
the firmware only has to replicate `codificar()`.

---

## Adding a new sensor

What you asked for: put a sensor on the suit and declare it from the interface, without touching
code.

```bash
# 1. La variable: nombre, descripción, unidad
POST /api/variables
{ "id": "X:TPIEL", "nombre": "Temperatura de piel", "unidad": "°C",
  "descripcion": "Termistor en el pecho del traje", "procedencia": "sensor" }

# 2. La trama: dónde llega, de qué tipo, y la fórmula
POST /api/esquemas
{ "nombre": "traje-v1", "campos": [
    { "clave": "fc",    "variable": "04:A4",   "tipo": "u8" },
    { "clave": "tpiel", "variable": "X:TPIEL", "tipo": "u16", "formula": "x / 100 - 40" } ] }
# → responde con un id nuevo: el esquema viejo sigue decodificando las tramas viejas

# 3. El dispositivo pasa a usarlo
POST /api/dispositivos  { "id": 102, ..., "esquema_id": <id nuevo> }
```

**Formulas.** Arithmetic, `sqrt abs log log10 exp round floor ceil min max pow`, and other
fields of the same frame by their key: `(sis + 2 * dia) / 3`. A field **without a type** is
virtual: it takes up no bytes and is derived solely from its formula. **`eval` is never used**: it is a
custom interpreter that rejects everything else, and the formula is validated when saved, not when
received. Variables added by the team use the `X:` prefix.

---

## LUNNA

Bayesian updating in three layers. Each one is weighted according to how much evidence it provides:

| Layer | Source | Example |
|---|---|---|
| ① Population prior | Literature (Iker's catalogs) | Systolic BP −6.7% in orbit |
| ② Personal history | Imported previous missions | "On Artemis their HR dropped 10%" |
| ③ Calibration | Their first 14 days in the environment | Daily median of each day |

Without the person's own data, the literature prevails; with a previous mission, their history; after
calibration, their data. **The prediction always comes with its 95% band**, and each alert with its
`prob_nominal`: the probability of seeing that deviation if the person were still normal.

### Two criteria, the worse one prevails

| Criterion | What it compares | What for |
|---|---|---|
| **Personal** (LUNNA) | 24-h median against what is expected for **that** person in that environment | Slow drifts that a generic range does not catch (fatigue, deconditioning) |
| **Clinical threshold** | Median of the last 5 valid samples (≤ 10 min) against the limit in `semillas/medibles.json` | Acute events: an SpO₂ of 87% is serious even if it is "normal for you". Also applies during calibration |

Each alert states its `motivo`: `personal`, `umbral` or `ambos`, and, if a threshold was involved, which one and from which source.
The vital-sign thresholds in Iker's catalog are **[T] terrestrial clinical**: no public NASA
table was found for them. Item-by-item traceability is in **`semillas/medibles.md`**, within the consolidated content of this README.

⚠️ **Demonstration mode.** With 24 h, an anomaly triggered during a demo lasting minutes takes a long time to move the
median, and the return to green is not seen. When switching to «En vivo» ("Live"), the simulator shortens the window to 5 min and
announces it (`modo mision` in the PC terminal sets it back to 24 h). `/api/salud` and the status page
always say which window is active.

Relationship with the notebook's Bayes formula, the ESP32 firmware and the Bluetooth gateway: `INTEGRACION.md`,
in the `planeacion-archivo` tag (`git checkout planeacion-archivo -- Planeacion/Julio/INTEGRACION.md`).

### Result with the simulator

4 crew members · 7 variables · 119 days · 6,188 binary frames:

- Prediction of Ana's HR: **57.4 bpm** (simulated true response: −8%, predicted −7.6%)
- Weights: literature **1%** · history **11%** · flight **88%**
- **2 alerts, both true**: her fatigue, amber on day 111 and red on day 112 (z = 3.34)
- **Zero false positives** in the rest of the crew

⚠️ **Synthetic** data, with a deliberately scripted scenario. It shows that the pipeline
works; it does not validate the model against real people.

---

## Design decisions

| Decision | Why |
|---|---|
| **The crew member is not in the frame** | The device does not know who is wearing it. Suits are reused: if the ID is hard-coded, the vital signs get attributed to someone else. The assignment table, with time intervals, solves this |
| **Calibration freezes at 14 days** | If it kept learning, a slow drift such as fatigue would be absorbed as "their new normal" and would never trigger |
| **The 24-h median is evaluated** | The Smart Fusion validation showed that the instantaneous value barely outperforms a constant; the aggregate does carry signal |
| **Only status changes generate alerts** | Otherwise, every out-of-band sample would be a new alert |
| **Blood type is not part of the model** | There is no evidence that it predicts adaptation. It is stored in the profile, with zero weight |
| **Moon, transit and Mars are flagged as extrapolated** | There are no human data. They are derived from orbit with doubled uncertainty |
| **Editing a schema creates a new version** | Old frames must still be read with the schema they were sent with |

---

## Files

```
src/formula.ts     intérprete de fórmulas seguro
src/esquema.ts     perfil EVA: cabecera, esquemas, codificar y decodificar
src/lunna.ts       el modelo
src/db.ts          esquema de la base de datos
src/ingesta.ts     tubería: asignación, decodificación, guardado y vigilancia
src/semillas.ts    configuración inicial e importación del contrato de Leo
src/enlace.ts      enlace con Tierra: retraso de la luz, ventanas y avisos de vuelta
src/servidor.ts    API REST y eventos en vivo
web/tierra.html    consola de control de misión en /tierra
web/nave.html      panel del enlace HTTPS de la nave en /nave
                   /app/ sirve Sistema/interfaces/eva (celular, central, base) y /reloj lleva a
                   /interfaces/reloj/; /app/config.js dice a las interfaces en qué modo corre el
                   servidor. Las rutas antiguas /maquetas/Leo/maqueta-eva/… y
                   /maquetas/Fani/maqueta-reloj/… redirigen (301) a /interfaces/…
(el simulador visual y el de terminal están en Simulacion/simulador y Simulacion/generador)
semillas/inicial.json   tripulación, esquemas y priores PROVISIONALES
```

## Pending

- **Real priors** from Leo and Iker: today most are non-informative and say so
- **Fusion** when two devices measure the same thing (suit and watch): today both are stored
- **Assignment cross-check**: if the suit and the watch of the same crew member disagree substantially, warn of a possible wrong assignment
- **Translate standard Bluetooth profiles** (heart rate, blood pressure) in the gateway, to accept commercial watches and cuffs
- **Hysteresis** in alerts so they do not oscillate amber–green near the threshold

## Credits

Photo of Earth in the simulator: *Blue Marble*, taken by the Apollo 17 crew
on December 7, 1972 (NASA, public domain). Downloaded from the NASA page
"Blue Marble - Image of the Earth from Apollo 17" (www.nasa.gov) and embedded in
`Simulacion/simulador/simulador.html` so that the mock-up works without internet.

<!-- END OF CONSOLIDATED DOCUMENT: Sistema/backend/README.md -->

## Consolidated document: `Sistema/backend/semillas/medibles.md`

> Original source: `Sistema/backend/semillas/medibles.md`

# Sensor-measurable variables: what the catalog says

Monarcas team · 2026-11-15 · Data: [`medibles.json`](../Sistema/backend/semillas/medibles.json) (loaded by the backend at startup)

The seven variables the system receives from sensors (smart shirt, watch, blood-pressure cuff), with what
the repo's research catalogs say about each one.

**How to read it**

- **Nothing is from memory.** Every number comes from a file in the repo, and the "Where it comes
  from" column says which one and in which row. Anything not in the catalog is marked **not found**.
- **[A]** = NASA threshold or validated in astronauts · **[T]** = terrestrial clinical, not
  validated in microgravity. **All vital-sign thresholds are [T]**: the catalog
  found no public NASA table for them.
- **The system does not diagnose.** It indicates what to watch and which conditions a
  deviation points to; interpretation belongs to the flight surgeon.
- Absolute thresholds **complement** the comparison against the person's own baseline (LUNNA);
  they do not replace it. The catalog asks for exactly this: "use the crew member's own baseline".

Source abbreviations: **VMA** = `VARIABLES-MEDIDAS-ASTRONAUTAS.csv` · **PV** =
`PADECIMIENTO-VARIABLE.csv` · **cat. 01 / 03 / 04** = files in `variables-diagnostico/`
(with line number) · **index** = `variables-diagnostico/00-indice-priorizado.md`.

> The two CSVs remain in `Planeacion/`. The `variables-diagnostico/` folder was removed from the tree to keep
> only what runs; it is intact in the `planeacion-archivo` tag:
> `git checkout planeacion-archivo -- Planeacion/variables-diagnostico`

---

## 1. Who has measured it in flight and how we measure it

All seven are listed as **"yes in flight"** in the catalog.

| Variable (id) | Actual flight equipment | Here | Where it comes from |
|---|---|---|---|
| Heart rate (`04:A4`), bpm | ISS: ALSP automated cuff (40–200 bpm, ±5%), Polar Heart Rate Monitor 2 (continuous during exercise), BP/ECG, CSA Bio-Monitor (shirt, since Dec 2018). At rest: Holter/ECG. Orion: ECG in the medical kit | Smart shirt with ECG and watch with PPG | VMA row 310 · cat. 04 A4 (l. 27) and table B.1 · VMA row 4 (`01:V3`) |
| SpO2 (`04:A3`), % | ISS kit pulse oximeter (ALSP/AMP), Bio-Monitor. Orion: pulse oximeter in the kit; the value "can be entered manually". Range and accuracy: not found | Watch with red/infrared PPG | VMA row 309 · cat. 04 A3 (l. 26) and B.1 |
| Respiratory rate (`04:A2`), resp/min | Bio-Monitor (respiratory rate and volume); manual count; ECG + respiratory sensor | Smart-shirt chest band | VMA row 308 · cat. 04 A2 (l. 25) |
| Body temperature (`04:A1`), °C | Disposable oral and skin thermometers from the kits (ISS AMP; Shuttle); forehead heat-flux sensor (Thermolab, ESA/DLR, research); Bio-Monitor: skin temperature | Smart-shirt axillary thermometer | VMA row 307 · cat. 04 A1 (l. 24) and B.1 |
| Systolic (`01:V1`) and diastolic (`X:PAD`) pressure, mmHg | ISS: 24-h ambulatory recording with portable equipment; ALSP oscillometric cuff (20–280 mmHg, ±3 mmHg or 2%); BP/ECG; Bio-Monitor. Orion: can be recorded manually | Oscillometric blood-pressure cuff | VMA row 2 · cat. 01 V1 (l. 31) · cat. 04 A5 (l. 28, merged) |
| Mean arterial pressure (`X:PAM`), mmHg | No dedicated equipment or row: derived from systolic and diastolic | Calculated: (sis + 2·dia)/3 | cat. 01 V1 (l. 31) · VMA row 7 (`01:V6` uses mean BP) |

The ISS kit inventory comes from the 2011 CHeCS hardware catalog, which
cat. 04 itself describes as "old inventory, partly already replaced".

---

## 2. Thresholds

| Variable | Amber | Red | Type | Source cited by the catalog | Where it comes from |
|---|---|---|---|---|---|
| Heart rate | > 100 bpm at rest | not found | [T] | Range 60–100 bpm (MedlinePlus); inappropriate sinus tachycardia: resting > 100 bpm and 24-h mean > 90 (HRS 2015 consensus) | cat. 04 A4 (l. 27) · cat. 01 V3 (l. 33) |
| SpO2 | ≤ 92% ("contact") | ≤ 88% ("immediate attention") | [T], unofficial proposal | MedlinePlus, pulse oximetry | cat. 04 A3 (l. 26) and C.5 · index §2.2 |
| Respiratory rate | > 18 resp/min | not found | [T] | Range 12–18/min (MedlinePlus) | cat. 04 A2 (l. 25) |
| Temperature | ≥ 39.4 °C sustained | ≥ 40.6 °C | [T], unofficial proposal | MedlinePlus, fever (oral values) | cat. 04 A1 (l. 24) and C.5 |
| Systolic pressure | < 90 or ≥ 140 mmHg | < 70 **[A]** or > 180 mmHg | [T] | ACC/AHA categories (via CDC); acute range 90/60–120/80 (MedlinePlus); < 70 = presyncope | cat. 01 V1 (l. 31) and V47 (l. 93) |
| Diastolic pressure | < 60 or ≥ 90 mmHg | > 120 mmHg | [T] | Same as systolic | cat. 01 V1 (l. 31) |
| Mean arterial pressure | — | — | — | **No threshold in the catalog** | — |

**How they were encoded** (our decisions about the catalog's numbers; the details are in
the `nota` field of each variable):

1. If the catalog gives an explicit alert criterion, that one is used (SpO2, temperature, blood pressure).
2. If it only gives a reference range, its edge is used as amber **only in the
   direction that the catalog associates with some condition** (high HR and RR).
3. **Catalog edges that are not used as alerts**, because they would trigger on
   normal values of a trained adult at rest:
   - HR < 60 bpm. The same catalog records 53.3 ± 7.3 bpm in sleeping astronauts (cat. 03 V18).
   - RR < 12 resp/min. The catalog says that RR decreases in flight.
   - Temperature < 36.5 °C, and "probable fever if oral > 37.2–37.5 °C": core
     temperature rises ~1 °C in flight, so that cutoff would trigger on normal values.
   - "Elevated" blood pressure (120–129) and stage 1 (130–139 or 80–89).
4. **Nuances that change the reading:**
   - The < 70 mmHg [A] was defined for the post-landing orthostatic test, not for
     rest in flight; here it is a safety floor.
   - The temperature values are oral and the smart shirt measures in the armpit; the catalog does not
     give the equivalence.
   - NASA sets the oxygen limit on inspired air (PIO2 target 145–155 mmHg,
     minimum 127), not on SpO2. The index warns that watch SpO2 overestimates
     in hypoxemia: it must not be the only alert.
   - In flight, blood pressure decreases (§3): the 90/60 edge ends up closer to normal values.
5. **Exact limit value.** The catalog's "≤" and "≥" criteria are inclusive, but the
   system compares with "less than/greater than": a reading equal to the limit (SpO2 of 92% or 88%,
   systolic of 140) does not trigger by threshold.

---

## 3. Expected change in microgravity

| Variable | What the catalog says | n | Source | Where it comes from |
|---|---|---|---|---|
| Heart rate (rest) | No change in flight; relative bradycardia in long versus short flights. Asleep: 53.3 ± 7.3 bpm before flight, no change in flight | 8 astronauts + 8 cosmonauts; sleep: Xu 2013 | Norsk 2015; Baevsky 2007; Xu 2013 | cat. 01 V3 (l. 33) · cat. 03 V18 (l. 38) |
| SpO2 | **not found** | — | — | cat. 04 A3 |
| Respiratory rate | Decreases; **magnitude not found** | 8 | Baevsky 2007; Bio-Monitor | cat. 04 A2 (l. 25) |
| Temperature | **Core** temperature at rest rises ~1 °C gradually over 2.5 months | 11 (ISS) | Stahn 2017 | cat. 04 A1 (l. 24) · cat. 03 V47 (l. 90) |
| Systolic pressure | 24-h mean: −8 ± 2 mmHg (days 85–192). Another study: 120 ± 10 → 106 ± 9 mmHg | 8 | Norsk 2015 / Fu 2019 | cat. 01 V1 (l. 31) |
| Diastolic pressure | 24-h mean: −9 ± 2 mmHg | 8 | Norsk 2015 | cat. 01 V1 (l. 31) |
| Mean arterial pressure | 24-h mean: −10 ± 3 mmHg | 8 | Norsk 2015 | cat. 01 V1 (l. 31) |

- All of these are ISS (low Earth orbit) data from 8–11 people: they provide guidance; they do not predict an individual.
- The +1 °C refers to **core** temperature (forehead sensor). It is not interchangeable with an
  axillary or oral reading.
- The catalog does not say whether "±" is the standard deviation or the standard error, nor does it assign each pressure figure
  to a study; the attribution to Norsk 2015 is inferred (same n = 8 as row V2).

### Compared with LUNNA's current priors (`semillas/inicial.json`, orbit)

| Variable | Current prior | Catalog | Result |
|---|---|---|---|
| Heart rate | 0%, "no verified population change" | "No change in flight" (n = 8 + 8) | The value matches. The source text falls short: the catalog does report the data |
| SpO2 | 0%, non-informative | not found | Consistent |
| Respiratory rate | 0% | Decreases, no magnitude | No number to use; the prior centered on 0 does not reflect the known direction |
| Temperature | +1.0 °C | ~+1 °C core (n = 11) | Matches, but it is applied to an axillary thermometer (the prior itself notes this) |
| Systolic pressure | −6.7% (= −8/120) | −8 ± 2 mmHg | Same origin. The 120 in the denominator is an assumption; the second study (−14 mmHg) is not used |
| Diastolic pressure | −11.25% (= −9/80) | −9 ± 2 mmHg | Same origin. The 80 is an assumption |
| Mean arterial pressure | −9.3%, derived from systolic and diastolic | −10 ± 3 mmHg, direct data | **Discrepancy:** the prior does not use the catalog's direct data |

Between-person, between-mission and day-to-day dispersion (τ₀, σ): **not in the
catalog**; in `inicial.json` they are assumptions and are labeled as such.

---

## 4. Which conditions each variable contributes to

Each cell: **weight · direction · evidence level**. It is not a diagnosis: it indicates in which
conditions a deviation of that variable carries weight.

| Condition | HR | SpO2 | RR | Temperature | Blood pressure |
|---|---|---|---|---|---|
| P01 Arrhythmia / atrial fibrillation | — | 1 ↓ C | — | — | 1 ↓ C |
| P02 Deconditioning and orthostatic intolerance | — | — | — | — | 1 ↓ C |
| P03 Hypoxia / respiratory problem | 2 ↑ B | **3 ↓ A** | **3 ↑ B** | — | 1 ↑/↓ C |
| P04 Infection, fever or immune dysregulation | 2 ↑ A | 1 ↓ B | 1 ↑ B | **3 ↑ B** | 1 ↓ B |
| P05 Sleep loss and circadian misalignment | 1 ↑ C | — | — | — | — |
| P06 Fatigue and cognitive impairment | 1 ↑ C | — | — | — | — |
| P07 CO2 exposure / headache | 1 ↑ C | — | 2 ↑ C | — | — |
| P08 Acute radiation from a solar event | 1 ↑ C | — | — | 1 ↑ C | — |
| P09 Stress / behavioral health | 1 ↑ C | — | 1 ↑ C | — | 1 ↑ C |
| P10 Decompression sickness after EVA | 1 ↑ C | 1 ↓ C | 1 ↑ C | — | 1 ↓ C |
| **Where it comes from (PV, rows)** | 33, 41, 66, 97, 128, 142, 158, 187 | 3, 34, 42, 188 | 35, 43, 129, 159, 189 | 44, 143 | 4, 23, 36, 45, 160, 190 |

- **Weight:** 1 associated marker · 2 direct causal link · 3 the variable is the mechanism.
  **Evidence:** A measured relationship with a number · B mechanism documented in a source ·
  C the team's physiological judgment, without a direct source (legend in `Leo/modelo-pesos/README.md`).
- **17 of the 25 links are level C.** The A and B links cite Smith 2013 (NEWS scale),
  Mishra 2020 (watch-detected infection) and Call 2005 (fever in influenza, LR+ 1.8,
  labeled "terrestrial"). No weight in this table is validated in astronauts
  (`Leo/modelo-pesos/README.md`).
- The HR column uses the rows of `01:V3` (resting HR): PV has no rows for `04:A4`.
- The catalog treats systolic and diastolic as a single variable (`01:V1`) and does not link
  mean arterial pressure to any condition.

---

## 5. What the catalog does NOT have

1. **No [A] vital-sign threshold in flight.** NASA-STD-3001 refers to "clinically
   accepted values" and to non-public program documents (cat. 04 C.5; index §4).
2. Red threshold for HR and RR. Thresholds for bradycardia, low respiratory rate and
   hypothermia.
3. Threshold, conditions and a dedicated row for mean arterial pressure.
4. Magnitude of the decrease in respiratory rate in flight. Change in SpO2 in flight.
5. Equivalence between axillary, oral and core temperature. How long "sustained" lasts in the
   fever criterion.
6. Whether the "±" of blood pressure is the standard deviation or the standard error, and which study each
   figure comes from.
7. Between-person dispersion and day-to-day variability of any of the seven.
8. Transit, Moon or Mars data: everything measured is from the ISS.
9. Accuracy of the flight pulse oximeter. The summary that backs the warning about watch SpO2
   (`RESUMEN-MAESTRO.md`) is not in the repo.
10. Condition–variable link for instantaneous HR (`04:A4`).

**Reliability warnings inherited by this document** (index §5): many articles were
read only as abstracts via the PubMed or Europe PMC API; the first author of
reference [63] in cat. 01 (HR > 100 bpm criterion) was noted from memory, although the URL
was opened; the SpO2 thresholds are a terrestrial clinical proposal, not an official one.

---

## 6. Future sensor-measurable candidates (not implemented)

| Candidate (id) | Measured in flight | Our sensor | What the catalog supports | Threshold | Where it comes from |
|---|---|---|---|---|---|
| HR variability: RMSSD, SDNN, LF/HF (`01:V43`, `03:V17`) | Yes: Holter during sleep (n = 7), Bio-Monitor | Smart-shirt ECG (RR intervals) | Reduced in flight during sleep (n = 7); another row says bands unchanged (n = 8): **the two entries do not agree** and the duplicate remains open. Contributes to P09 (weight 2, C) | No cutoff; use own baseline. Terrestrial norms: RMSSD 42 ± 15 ms, SDNN 50 ± 16 ms | VMA rows 44 and 235 · cat. 01 V43 (l. 80) · cat. 03 V17 (l. 37) · PV row 178 · `Iker/iker_variables.csv` row 14 |
| Irregular rhythm / atrial fibrillation (`01:V31`) | Yes: 48-h Holter (n = 13, no cases) | Smart-shirt ECG | Contributes to P01 with weight 3, evidence A. Only as an irregular-rhythm flag, not a diagnosis | No numeric threshold | VMA row 32 · cat. 01 V31 (l. 68) · PV row 2 · `iker_variables.csv` row 2 |
| QTc interval (`01:V34`) | Yes: Holter (n = 3) | Smart-shirt ECG | QTc > 440 ms appears in the first month of long-duration flight. Contributes to P01 (weight 2, B) | [T] 450/460 ms; risk ≥ 500. [A] > 440 ms in the astronaut study | VMA row 35 · cat. 01 V34 (l. 71) · PV row 8 |
| Pulse wave transit time (`01:V23`) | Yes: cosmonauts, 162–196 days | Smart-shirt ECG + watch PPG | Decreases in flight (n = 8); magnitude not found | not found | VMA row 24 · cat. 01 V23 (l. 53) |
| Nocturnal blood-pressure dip (`01:V2`) | Yes: 24-h recording | Cuff at scheduled readings | Dip of 8 ± 3 mmHg, preserved in flight (n = 8) | not found | VMA row 3 · cat. 01 V2 (l. 32) |
| Stand test: pressure drop and HR rise (`01:V47`, `01:V48`) | Only before and after flight (requires gravity) | Cuff + smart shirt | Contributes to P02 (weight 3, A and weight 2, B). Applicable on landing or on a surface | [T] drop ≥ 20/10 mmHg; [T] ≥ 30 bpm; [A] systolic < 70 = presyncope | VMA rows 48 and 49 · cat. 01 V47–V48 (l. 93–94) · PV rows 16 and 17 |
| Sleep by actigraphy (`03:V30`, `03:V31`) | Yes: Actiwatch | Watch accelerometer | ISS: 6.09 h on average, 43.8% of nights < 6 h (n = 21) | [T] 7–9 h; < 6 h is associated with worse performance | VMA rows 248 and 249 · cat. 03 V30–V31 (l. 66–67) |

Known limitation for the first three: according to `Leo/modelo-pesos/README.md`, the team's
watch does not send RR intervals; they would have to come from the smart-shirt ECG.

<!-- END OF CONSOLIDATED DOCUMENT: Sistema/backend/semillas/medibles.md -->

## Consolidated document: `Sistema/interfaces/eva/README.md`

> Original source: `Sistema/interfaces/eva/README.md`

# LUNNA mock-up with Lunna — the metrics experience

## Operational mode and simulation mode

This folder (`Sistema/interfaces/eva`) is the same for both modes; what changes is what the
backend says in `config.js`, which `modo.js` reads before anything else:

| How it is opened | Mode | What you see |
|---|---|---|
| `cd Sistema/backend && npm start` → http://localhost:8787/app/ | **Operational** | The synthetic scenario (`datos.js`, `demo.js`) is not loaded. The phone, the base and the watch are still drawn from that scenario, so they say «Modo operativo» ("Operational mode") instead of showing it; the central computer shows only its live backend blocks |
| `cd Simulacion && npm start` → http://localhost:8787/app/ | **Simulation** | Everything, with the scenario that arrives from `Simulacion/escenarios/interfaces/` via `/app/escenario/…` and the **«Simulación · datos sintéticos»** ("Simulation · synthetic data") badge |
| Open `index.html`, `central.html` or `base.html` as a file | Simulation | The mock-up, with the scenario read from `../../../Simulacion/escenarios/interfaces/` |

When served without the backend (for example with `python -m http.server`), there is no `config.js` and it stays in operational
mode: simulation is never assumed. Pending: `motor.js` still generates the crew and the scenario
series internally; separating it and rendering these screens with live data is a separate change.

## App structure (Katy, 14 Nov 2026)

Built on the LUNNA Body, the engine and Diana's floating Lunna. Phone only. Unified
**glassmorphism** design in **light** and **navy blue** versions (Settings → Appearance), with a **floating
navigation bar** at the bottom.

| Tab | What it has |
|---|---|
| **Home** | LUNNA Body, notices (fatigue, note from Earth, solar event), check-in, body data and your crew (with role-based privacy) |
| **Log** | Food, glucose, blood pressure, temperature, water, mass, symptoms, sleep, exercise, strength, mind (stress, PHQ-9, KSS, journal), urine strip and camera photo |
| **Cycle** | Only for women, private and Clue-style: cycle ring, week, logging by category and what changes in space |
| **Reports** | Summary of alerts and protocols, vital signs and trends, reflexes (PVT-B), radiation, Earth, solar event, CMO view and achievements. The detailed breakdown goes in the desktop panel |
| **Settings** | Simulation (person and day), privacy, Lunna, theme, notifications, help, and what is real or simulated |
| **Lunna (floating button)** | Everything AI: what it sees today, how it monitors you, space weather, what it processes, library and talk |

New files: `modulos.js` (screens and Lunna panel) and `tema.css` (design). Open a view
directly: `?pantalla=ciclo`, `?persona=MS-1`, `?dia=115`, `?tema=oscuro`. Demo: `?demo`.

Interactive mock-up of how the astronaut experiences their health metrics in the **LUNNA** app (formerly EVA),
accompanied by their assistant **Lunna**. **All data are simulated**: it does not yet receive real data,
not even from the watch.

## Desktop consoles: central computer and Earth base (Leo, 15 Nov 2026)

The three LUNNA screens belong to the same series: they use the same styles (`estilos.css`, `cuerpo.css`,
`tema.css`), the same icons, the same **LUNNA Body**, the same engine (`motor.js`), the same
crew (Ana, Luis, Mei, Tomás) and the same scenario (days 106–115). Theme and day are shared
among the three (keys `eva:tema` and `eva:dia`).

| Screen | Who uses it | What it has |
|---|---|---|
| `index.html` · **phone** | Each astronaut | The usual app. It now also receives, as notifications, what the central computer and the base send |
| `central.html` · **central computer** | The CMO (Mei), on board | Fani's medical-panel design in the LUNNA style: **Today** (mission, Lunna, crew with their bodies, notices, environment, space weather, history of warnings and emergencies), **clinical panel** for each crew member (vital signs against their personal normal, LUNNA Body with its zones, sleep and reflexes, goals, dose, what Lunna told them, per-condition index, medical intervention), **Statistics** (status by day, what most needed attention, notices per mission) and **Link with Earth** (prioritized queue, what was received and queries to the base) |
| `base.html` · **Earth base** | The flight surgeon | Almost the same as the central computer, but only with what has arrived (always the past, with its SCET and its age). **Forecasts**: crew × 11 conditions map with the index from Leo's weights, what each variable contributes and its 3-day trend. **Messages**: notices and warnings to the spacecraft with their route (drafted → in transit → on board → acknowledgment) |

Open in simulation mode (`cd Simulacion && npm start`):

- Central computer: **http://localhost:8787/app/central.html** · Ana's panel: `central.html#tripulante/MS-2`
- Base: **http://localhost:8787/app/base.html** · forecasts: `base.html#pronosticos`

**Link with Earth.** Without the backend, the central computer and the base talk to each other through this same browser
(`localStorage`, key `lunna:enlace`) with the light-time delay: the scenario uses 18 min per one-way trip and
the demo covers it in 18 s (this is changed in *Link with Earth*). What the base sends reaches the central computer
and, as a notification, the phone of the recipient; the CMO's notices reach the phone
instantly. With the backend, the base also sends the notice via `POST /api/tierra/avisos` and the phone
receives it via `/api/stream`, as in Julio's `/tierra` console.

**Privacy**, the same matrix as the phone (ERS §6.5): the CMO sees the weekly mood trend; Earth sees
its score and the vital signs as a daily summary; the journal and the cycle only with permission.

**Per-condition index** (`../modelo-pesos`): index = Σ weight × points / maximum, with 0–3 points by
|z| against the personal normal in the physiological direction. 🔶 Our decisions: blood pressure, SpO₂ and CO₂ use the
phone's thresholds (attention → 2, alert → 3); what is not measured daily (symptoms, irregular pulse,
orthostatism, circadian phase) is left out and the coverage is shown; if the highest-weight variable is missing,
the index comes out **incomplete**; the 3-day trend is an **illustrative** linear extrapolation. It is
neither a probability nor a diagnosis.

### The central computer connected to Julio's backend (and to the simulator's PC)

With the backend running, **the PC in `/simulador` opens this screen** (`/app/central.html`, same
origin) in a window like those of the smartphone and Earth: *Frontend* is the central computer and *Backend* is the
usual PC terminal. `central-vivo.js` reads what the central computer actually knows and renders it
in blocks labeled **«En vivo · backend»** ("Live · backend"):

| Where | What it shows | Where it comes from |
|---|---|---|
| **Today** | Registered crew, latest value of each variable against the expected value, LUNNA status and alerts | `GET /api/tripulantes`, `/api/app/:tripulante`, `/api/alertas` |
| **Clinical panel** | That person's variables (latest, 24-h median, expected value and band, z, status and reason, mission days, device), their alerts and the notices from Earth they received | `GET /api/app/:tripulante` |
| **Link with Earth** | Window, delay, what is queued or in transit and the notices delivered on board | `GET /api/enlace`, `/api/tierra/pendientes`, `/api/avisos` |

It updates itself with the `muestra`, `alerta`, `aviso`, `enlace` and `rechazo` events from `/api/stream`
(at most one reload every 2 s) and with polling every 10 s. If the backend does not respond, the bar says
**«Sin conexión con el backend»** ("No connection to the backend"), each block explains the error and the time of the latest data, and it retries
every 5 s. It does not invent routes or data: what the backend does not yet offer (LUNNA Body, 14 days against the
personal normal, indices, environment, space weather, statistics and the CMO's messages, which still travel
via `localStorage`) stays under the label **«Escenario simulado · no viene del backend»** ("Simulated scenario · not from the backend").
Test: `cd Sistema/backend && npm test` (`test/central.test.ts`) and, for the simulator's PC,
`cd Simulacion && npm test`.

Files: `central-vivo.js` (live backend data), `consola.css` and `consola.js` (shared pieces), `central.js`, `base.js`, `iconos.js` (the
phone icons plus the console icons) and `pesos.js` (generated by `../modelo-pesos/generar_pesos.py`;
not edited by hand). The reference missions in Statistics are Fani's, with fictitious names.

## New on the Today screen: LUNNA Body and what Lunna sees

Integrates into this mock-up the health panel (module 1) that was built in `app/`.

| What | Where | How it works |
|---|---|---|
| **LUNNA Body**, the first thing on Today | `cuerpo.js`, `cuerpo.css` | Navy-blue scanner in a medical-hologram style: faint skeleton, **arteries with flow**, a beating **anatomical heart** (aorta, vena cava, pulmonary trunk, coronary arteries), lungs with lobes, liver, stomach, intestines, kidneys and bladder. **Changes according to sex:** female (narrower shoulders, waist, hips, chest, long hair) or male (broader shoulders and neck, straight torso, pectorals, short hair) |
| Tappable zones | `cuerpo.js` | Head, eyes, heart, lungs, abdomen, kidneys and bladder, muscles, skin (wrist sensor) and radiation halo. Each zone shows the worst status of its indicators in its outline and its marker: ● within your normal · ■ attention · ▲ act now · ○ no data |
| **Zoom and tech panel** | `app.js` → `abrirRegion` | When an organ is tapped, the figure zooms in on it and the information expands from that point until it covers the screen: organ viewer, HRP hazard, traffic-light indicators, provenance and 14-day chart. On closing, it returns to the full body |
| Zone row | `app.js` | The same information without the figure, keyboard-navigable. "Women's health" appears only to women and behind a lock |
| **Floating Lunna** | `app.js` → `crearLunaFlotante` | AssistiveTouch-like bubble: it can be dragged, snaps to the edge, dims when not in use and remembers its position. Its face and a badge say how many things need looking at. Tapping it opens **"What Lunna sees today"**: which signals, with which numbers against your normal, which rule was met and what to do. It does not diagnose |
| Typeface | `estilos.css` | Technical system sans-serif (Segoe UI Variable, SF Pro, Inter) and monospace for the data |
| Cards | `app.js` → `ficha` | Blood pressure, temperature, mood, SpO₂ and breathing: value, your normal, chart, why, how it is measured and threshold with its source. Heart, Sleep and Glucose get the "against your normal" card |
| Simulation | Today, at the top | Switch crew member (Ana, Luis, Mei, Tomás) and day (106–115) to walk through the scenario |

### The scenario (ERS-LUNNA)

| Day | What happens |
|---|---|
| 112 | **Ana's FATIGA-03**: sleep z −2.4, PVT-B lapses z +2.0 and resting pulse z +2.2. None alone would trigger (all below \|z\| 3); all three together do. Head and heart at ■ |
| 113 | "You're improving": the signals come down; the notice remains open |
| 114 | Two days with z < 2: the notice closes at ● green |
| 115 | Solar particle event, modeled on the real DONKI event 2024-05-11T02:10:00-SEP-001 (notice 20 min later). ▲ red for everyone |
| Always | Luis at ■ due to blood pressure 130–139 (AHA threshold [T]) |

Engine rules (`motor.js`): your normal = previous 14 days (minimum 7), robust z, minimum credible
variation per indicator; a single signal asks for attention at |z| ≥ 3; your normal alone never yields red.

Tests: `node --test Sistema/interfaces/eva/motor.test.mjs`.

## Open

```bash
cd Simulacion
npm start
```

- App: **http://localhost:8787/app/**
- Automatic demo (one full day, ~3 min): **http://localhost:8787/app/?demo** (or *Ayuda → Ver demo automática*, i.e. Help → View automatic demo)
- Emergency: red **SOS** button at the top right, always visible.

Works without internet: it uses no external libraries or fonts. On desktop it appears inside a phone
frame; on mobile, full screen.

## Lunna

Assistant **shaped like a moon**, with no hands or feet. **Its phase reflects the person's vital signs:**

| Phase | Halo | Meaning |
|---|---|---|
| Full Lunna | Cyan | Everything within their normal |
| Gibbous / quarter | Amber | Something is moving away from their normal (each alert makes it wane) |
| Almost new | Pulsing red | Emergency |

On top of it, its little face (11 emotions) or a status icon (`radiacion`, `latido`, `escaneo`) is drawn.

```js
const luna = LUNA.crear(elemento, { cara: "tranquila", accesorio: "corazon", tam: 88 }); // sigue la fase global
luna.poner("radiacion");
LUNA.ponerFase(0.4);               // todas las Lunas cambian de fase
LUNA.crear(otro, { fase: 0.05 });  // o una fase propia
```

## Emergency mode (simulation)

Follows Julio's design (`../../Julio/comportamiento-del-software.md` §8):

- **Activation:** always-visible **SOS** button (one tap, no confirmation) and **automatic** when SpO₂ drops.
- **Simulated scenario:** hypoxia (a risk NASA tracks). SpO₂ 97 → 84%, pulse 62 → 128 bpm,
  breathing 14 → 26, blood pressure 116/74 → 94/60. **The moon wanes to almost new** as the vital signs fall.
- Each value is shown **against their normal** ("pulse 2.1× their normal").
- **T+** timer, **notice to the crew medical officer (Mei)**, priority packet to Earth and **sealed automatic log**.
- **One step per screen**, large text, no menu. The steps are labeled **"Ilustrativo: no es
  protocolo médico"** ("Illustrative: not a medical protocol"): real clinical content is not invented.
- When the steps are completed, the vital signs recover and the moon waxes again.

## Sections (Leo's variables)

| Section | Variables | What you can do |
|---|---|---|
| Today | summary | Team patch, traffic-light mosaic, **space weather** notice |
| Heart | 02:V52, V53 | Simulated live HR, zones, exercise session |
| Sleep | 03:V30–V37, V43 | Hours, week, sleep debt, "how did you wake up?" |
| Food | 02:V79–V85, V93 | Add food with icons, 3,035 kcal goal, sodium with target zone |
| Glucose | 02:V92, V86 | 24-h curve with a 70–180 range, finger-stick glucometer |
| Symptoms | 02:V58, V67a · 03:V82–V83 | Pain 0–10, headache, dizziness; suggests seeing the doctor if severe |
| Strength | 02:V44, V43 | Estimated strength (Epley) against NASA's goal of 1.6× body weight |
| Check-in · Achievements · Help | — | 1-minute check-in, mission patches, tutorials |

## About the NASA logo

**It is not used.** NASA states that its insignia, logotype and identifiers *"are not in the public domain"*
and that their use *"is protected by law"* ([nasa.gov/nasa-brand-center](https://www.nasa.gov/nasa-brand-center/images-and-media/)).
Putting it on an app screen suggests that NASA endorses the app. Instead there is an **original team
patch** (moon + monarch butterfly) and the factual text *"proyecto para NASA Space Apps Challenge 2026"* ("project for NASA Space Apps Challenge 2026").

## Principles

- Short tutorials (2–3 steps) the first time each section is opened; they can be replayed from Help.
- Threshold labels: **NASA** (official) or **Earth** (terrestrial clinical, not validated in space).
- It does not diagnose: if something is severe, it suggests contacting the crew medical officer.
- It rewards the habit, not the result.
- Motion follows Emil Kowalski's guidelines (*ease-out* < 300 ms, buttons that shrink when pressed,
  no `scale(0)`) and respects *reduced motion*.

Palette: `#B541FA` purple · `#4FD2E9` cyan · white · `#192584` deep blue · `#74706D` gray.

## Files

`index.html` · `estilos.css` · `luna.js` (avatar and phases) · `app.js` (screens, tutorials, emergency) ·
`modo.js` (operational or simulation). The scenario is in `Simulacion/escenarios/interfaces/`: `datos.js`
(simulated data with a fixed seed) and `demo.js` (automatic demo).

## Connected to the EVA backend (notifications from Earth)

With the backend running in simulation mode (`cd Simulacion && npm start`), the app is served at
**http://localhost:8787/app/** and also opens when the smartphone is tapped in the simulator
(`/simulador`, *Frontend* tab; *Backend* shows the phone's terminal).

`notificaciones.js` listens for the notices and alerts that the flight surgeon sends from the
Earth console (`/tierra`) and, when they arrive on board, shows them as phone
notifications: at the top, over the app, with vibration if the device supports it. Red alerts stay
until dismissed; the others go away on their own. One tap opens the full text; a second tap, the
Earth screen.

- The active person sees it if the message is for them or for the whole crew; the CMO sees all of them.
- When opened as a file, there is no backend and this file does nothing.

### With Julio's backend (15 Nov 2026)

When opened from `http://localhost:8787/app/…`, the three screens use the real central computer in addition to the scenario:

| Screen | What it sends to or receives from the backend |
|---|---|
| Phone (`telefono-vivo.js`) | **En vivo** ("Live") card on Today with their real vital signs (`GET /api/app/:tripulante`, updated with `muestra` and `alerta`). The SOS or the automatic emergency is logged (`POST /api/emergencias`) and closed on exit (`PUT`). Notices from Earth and from the CMO reach it via `/api/stream` |
| Central computer | «Enviar a …» ("Send to …") goes via `POST /api/abordo/avisos` and «Consultar a Tierra» ("Consult Earth") via `POST /api/central/consultas`. Emergencies from the phone appear in the history with a floating notice (`emergencia` event) |
| Earth base | The inbox shows what actually came down the link (`GET /api/tierra/bandeja` and `tierra` event): LUNNA alerts, CMO queries, emergencies, the latest summary and the raw frames. Its messages go via `POST /api/tierra/avisos` and show the real **acknowledgment** when it comes back |

<!-- END OF CONSOLIDATED DOCUMENT: Sistema/interfaces/eva/README.md -->

## Consolidated document: `Sistema/interfaces/reloj/README.md`

> Original source: `Sistema/interfaces/reloj/README.md`

# Lunna on the watch — interfaces

Mock-up of the crew watch screens, with the **global design of Leo's mock-up**
(`Sistema/interfaces/eva`): the same color and glass variables (`estilos.css`, `tema.css`),
the same **Lunna** (`luna.js`) and the same **engine** with the crew and the scenario (`motor.js`).
It does not copy those files: it loads them from their folder, so any change by Leo shows up here.

**The data are simulated.** When opened as a file, everything comes from the mock-up's scenario; with the
backend, pulse and SpO₂ come from the simulator's watch (which is also synthetic). Nothing comes from
a real watch.

## Open

Double-click `index.html` (no server or internet needed): it opens as a mock-up, in simulation
mode. `../eva` (`Sistema/interfaces/eva`) must still exist in its place, because that is where it takes the
styles, Lunna, the engine and `modo.js` from.

With the backend in simulation mode (`cd Simulacion && npm start`):

- **http://localhost:8787/reloj** — the full mock-up (leads to `/interfaces/reloj/`).
- **In the simulator** (`/simulador`): clicking the astronaut's **watch** opens this
  screen in its window, just like the smartphone, the PC and Earth. *Frontend* is the watch (the
  watch only, `?embebido&persona=MS-2`, because it is Ana's watch) and *Backend* is the watch's terminal.

In operational mode (`cd Sistema/backend && npm start`), `/reloj` says «Modo operativo» ("Operational mode") instead of
showing the simulated scenario, on which it still depends.

### Linked to the simulation's watch

When served by the backend, the watch uses what actually reaches the central computer:

| On the watch | Where it comes from |
|---|---|
| Pulse and SpO₂ «ahora» ("now") (**EN VIVO** ("LIVE") marker on the watch face) | `muestra` events from `/api/stream` for that person (04:A4 and 04:A3). In the simulator they are sent by `reloj-ana` every 5 s; the smart shirt also sends pulse |
| Lunna's status | The worse of the day's scenario and the status LUNNA assigns to that person's variables in `GET /api/app/<tripulante>`, re-read on each `alerta` event. If it is set by the central computer, the watch face says which variable it was |
| Power off | The `apagar` and `encender` commands in the watch terminal in the simulator |

If no reading arrives within 20 s, or the connection is lost, it falls back to the simulated value and says so on the
screen of each data item. The rest (temperature, sleep, stress, days 106–115) is still the simulated
scenario: the simulator's watch does not measure it. Test: with *▶ En vivo* (Live), type `hipoxia 12` in the
watch terminal and the SpO₂ drops on the watch face.

## Lunna's face according to the person's status

| Status | Lunna's face | When («Automático» / Automatic mode) |
|---|---|---|
| **Well** | `feliz`, full moon, cyan halo | Everything within their normal |
| **Unwell** | `preocupada`, half moon, amber halo | Something is moving away from their normal (■ attention) |
| **Critical** | `alerta`, almost new moon, pulsing red halo; the screen flashes red | ▲ act now (e.g. the solar event on day 115). Wakes Lunna up even at night |
| **Asleep** | `dormida`: little eyes closed and «zzz»; the screen dims | From 23:00 to 07:00, if nothing is critical |

In the simulation panel, any of the four statuses can be forced in order to show it.

## Screens (swipeable; the crown returns to the watch face)

1. **Watch face**: time, mission day and a large Lunna with the person's status (tapping it opens what Lunna sees).
2. **Heart rate**: live (simulated) pulse with heartbeat and 40-s chart; the day's resting pulse
   against their normal.
3. **Oxygen (SpO₂)**: 80 to 100% ring, the team's thresholds and a notice that wrist SpO₂ may
   overestimate.
4. **Temperature**: skin, 14 days against their normal band.
5. **Sleep**: last night's hours, last 7 nights and their normal; shows whether they are sleeping now.
6. **Mood (stress)**: **low, normal, intermediate or high** on the check-in scale
   (0–100: < 25 · 25–49 · 50–74 · ≥ 75; 🔶 decision of this mock-up) and, separately, against their normal.
7. **More signs**: breathing, HRV, exercise (90 min goal), water (32 mL/kg), mission radiation dose and
   rate in the cabin.
8. **What Lunna sees**: its summary and what is advisable to do. Lunna warns; it does not diagnose.

Each data item carries a shape as well as a color: ● within their normal · ■ attention · ▲ act now · ○ no data.

## Simulation

Person (Ana, Luis, Mei, Tomás), day 106–115 (112 Ana's fatigue · 114 closure · 115 solar event),
real or simulated time and Lunna's status. Person and day are shared with the phone and the consoles
(keys `eva:persona` and `eva:dia`) when opened from the same origin.

Below the interactive watch are **the four statuses** of the watch face and **all the screens**
side by side, to review them without swiping.

## Files

`index.html` · `reloj.css` (watch frame and screens) · `reloj.js` (status, screens and navigation).

<!-- END OF CONSOLIDATED DOCUMENT: Sistema/interfaces/reloj/README.md -->

## Consolidated document: `Sistema/README.md`

> Original source: `Sistema/README.md`

# System

The Lunna software that would run on the spacecraft and on Earth. It starts in **operational mode**: it does not load the
simulator or the synthetic scenario. For the simulation, see **`Simulacion/`**.

```bash
cd Sistema/backend
npm start          # http://localhost:8787 (modo operativo)
npm test
```

| Folder | What it is |
|---|---|
| **`backend/`** | Central computer: frame ingestion, LUNNA, link with Earth (simulated and HTTPS), health. Serves the interfaces |
| **`interfaces/eva/`** | Phone (`/app/`), central computer (`/app/central.html`) and Earth base (`/app/base.html`) |
| **`interfaces/reloj/`** | Crew watch (`/reloj/`) |
| `pasarela/` | Bluetooth gateway to the central computer (`python test_trama.py` checks that it produces the same bytes as the backend) |
| `esp32/` | Smart-shirt firmware and its test vectors (`test/generar_vectores.ts` generates them with the backend's encoder) |

In operational mode:

- `/simulador` and `/app/escenario/…` return 404, and `POST /api/demo/reiniciar` returns 403.
- `/app/config.js` says `"modo":"operativo"`; `interfaces/eva/modo.js` reads it and does not load the scenario.
- The phone, the base and the watch are still drawn from the simulated scenario, so they say
  «Modo operativo» ("Operational mode") instead of showing it. The central computer shows only its live backend blocks.
- `backend/semillas/inicial.json` (crew, schemas, devices and provisional priors) is
  configuration that the backend needs in order to start. **The crew (Ana, Luis, Mei, Tomás) is
  fictitious** and the priors are provisional; a real mission would change them.

Pending: `interfaces/eva/motor.js` still generates the crew and the scenario series internally;
separating it and rendering the phone, the base and the watch with live data is a separate change.

This is a hackathon prototype: it is not validated for medical or space use.

<!-- END OF CONSOLIDATED DOCUMENT: Sistema/README.md -->
