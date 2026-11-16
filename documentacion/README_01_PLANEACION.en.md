> 🌐 [Español](README_01_PLANEACION.md) · **English**

# 01 · General project planning

**Project:** EVA / LUNNA, health monitoring for space missions
**Team:** Monarcas · NASA Space Apps Challenge 2026
**Revision date:** November 15, 2026

> **Scope warning.** LUNNA is an educational and research prototype developed during a hackathon. It is not a medical device, it does not diagnose, and it is not validated for clinical use, for use in space, or for use in astronauts. The demonstration crew is fictional and the demo data are synthetic.

## 1. General description

The project brings together three software blocks that share data contracts:

| Block | Location | What it is |
|---|---|---|
| **EVA/LUNNA system** | [`Sistema/`](../Sistema/) | Central computer (Node/TypeScript backend + SQLite), web interfaces (phone, central computer, Earth base and watch), Bluetooth gateway and firmware for the ESP32 smart shirt. |
| **Simulation** | [`Simulacion/`](../Simulacion/) | Starts the same backend in *simulation mode*, with a visual simulator, a synthetic scenario for the interfaces, a telemetry generator and space weather data from NASA DONKI. |
| **Health prototype** | [`prototipo-salud/`](../prototipo-salud/) | Standalone Streamlit application: adapters for five echocardiography models, ECG processing, a sensor importer and the **condition engine** (20 conditions, GREEN/YELLOW/RED/GRAY traffic light — `VERDE`/`AMARILLO`/`ROJO`/`GRIS` in the code). |

In addition, [`Planeacion/`](../Planeacion/) keeps the research catalogs (variables, conditions), the per-ailment weight matrix and working material from the team members.

**EVA** designates the system (central computer, frame profile, link). **LUNNA** (*Live-telemetry Updating Network for Nominal-deviation & Anomalies*) designates both the model that defines "what is expected" for each person and the brand of the interfaces. **Lunna** is the moon-shaped assistant that appears on the screens.

## 2. Rationale and problem statement

On a long-duration mission:

1. **Population ranges do not describe each individual.** A heart rate of 55 bpm may be normal for one trained crew member and anomalous for another. In addition, microgravity shifts several variables in expected ways (for example, 24-h mean arterial pressure drops by 8 to 10 mmHg in orbit; see the [dictionary](README_07_DICCIONARIO_DATOS_VARIABLES.en.md)).
2. **Communication with Earth has delays and windows.** Toward Mars, the one-way delay ranges from 4 to 24 minutes (240–1,440 s, the values used by the project), and the link may close. Monitoring must work on board.
3. **Alerts must be explainable.** A flight surgeon needs to know which data point, against which reference and with what evidence produced an alert.

## 3. Objectives

### 3.1 General objective

Build a reproducible prototype that receives physiological telemetry from several devices, attributes it to the correct crew member, compares it with what is expected for that person in that environment, generates explainable alerts and communicates what is relevant to Earth over a link with delay and interruptions.

### 3.2 Specific objectives

| # | Objective | Status in the repository |
|---|---|---|
| O1 | Define a binary frame contract (EVA profile) and a JSON contract for intermediate devices | Implemented: [`esquema.ts`](../Sistema/backend/src/esquema.ts), [`ingesta.ts`](../Sistema/backend/src/ingesta.ts) |
| O2 | Attribute each sample to the crew member through an assignment table with a time interval | Implemented (`asignaciones` table) |
| O3 | Model what is expected per person with three-layer Bayesian updating | Implemented: [`lunna.ts`](../Sistema/backend/src/lunna.ts) |
| O4 | Combine the personal criterion with absolute clinical reference thresholds | Implemented: [`referencias.ts`](../Sistema/backend/src/referencias.ts), [`semillas/medibles.json`](../Sistema/backend/semillas/medibles.json) |
| O5 | Simulate the link with Earth (delay, window, priority, acknowledgment) | Implemented: [`enlace.ts`](../Sistema/backend/src/enlace.ts) |
| O6 | Real HTTPS transport spacecraft ↔ Earth with no losses or duplicates | Implemented with a self-signed development certificate: [`sincro.ts`](../Sistema/backend/src/sincro.ts), [`enlace-https.ts`](../Sistema/backend/src/enlace-https.ts) |
| O7 | Interfaces for the crew, CMO, Earth and watch | Implemented as mock-ups; they largely render a synthetic scenario (see the [manual](README_03_MANUAL_USUARIO.en.md)) |
| O8 | 20-condition engine with traffic light and evidence traceability | Implemented in Python: [`prototipo-salud/motor/`](../prototipo-salud/motor/) |
| O9 | Integrate echocardiography and ECG models | ECG run on CPU on public data; echo only with load tests on the development machine (see [models](README_06_MODELOS_COMPUTACIONALES_ALGORITMOS.en.md)) |
| O10 | Separate operational mode and simulation mode without duplicating code | Implemented: `--modo operativo|simulacion`, `config.js`, `modo.js` |

## 4. Scope

### 4.1 In scope

- Ingestion, storage, per-variable model, alerts and link in the backend.
- Web interfaces served by the backend.
- Smart shirt firmware and BLE gateway, in code. The firmware **has not been tested on a real board**.
- Condition engine and model adapters in `prototipo-salud/`.
- Complete simulation with labeled synthetic data.

### 4.2 Out of scope

- Clinical use, diagnosis, treatment or mission decisions.
- Medical or space certification, radiation tolerance and deterministic real-time operation.
- User authentication, database encryption and identity management (see [security](README_10_SEGURIDAD_CONFIABILIDAD_RIESGOS.en.md)).
- Training or fine-tuning the weights of the echocardiography models.
- Use of controlled-access data (LSAH, LSDA, restricted OSDR).

## 5. General requirements

| Type | Requirement | Source |
|---|---|---|
| Functional | Receive binary frames (`POST /api/tramas/binaria`) and JSON frames (`POST /api/tramas`) | `servidor.ts` |
| Functional | Reject unregistered devices, unknown schemas, unassigned devices and estimated values without a method or `ic95` | `ingesta.ts` |
| Functional | A resend does not duplicate samples (`UNIQUE (tripulante, dispositivo, seq, variable, t_scet)`) | `db.ts` |
| Functional | Every prediction carries a 95% band and the weight of each source | `lunna.ts` |
| Functional | A prior without a `fuente` is rejected | `PUT /api/priores` |
| Functional | Synthetic data never end up in the operational database | `servidor.ts` (separate database per mode) |
| Non-functional | Node.js 22.6 or later, no npm dependencies | `package.json` |
| Non-functional | Work without internet (interfaces with no external libraries) | Interfaces README |
| Non-functional | Every provisional number in the condition engine is labeled *provisional* | `motor/parametros.py` |

## 6. Development stages

The stages and their dates are those recorded in the Git history and in the team's progress logs.

| Stage | Date (Mexico City) | Result | Evidence |
|---|---|---|---|
| Research catalogs | before Nov 14, 2026 | Variables measured in astronauts (388 rows), conditions and condition-variable matrix | [`Planeacion/data/`](../Planeacion/data/) |
| Health prototype structure | Nov 14, 09:40–10:15 | Common core, adapters for 5 models, runner, Streamlit app, PowerShell scripts | AVANCE section of the consolidated README |
| First real inference (PanEcho) | Nov 14, ~10:25 and ~11:06 | Reported by Iker on his PC: CPU 42.8 s; CUDA 17.4 s | Same |
| ECG module | Nov 14, ~16:45 | NeuroKit2 + wfdb run on Linux/CPU on MIT-BIH | Same |
| Condition engine | Nov 15, ~01:10 | 20 conditions, "Padecimientos" (Conditions) and "Configuración" (Configuration) views | Same |
| Backend, interfaces, HTTPS link, simulator | Nov 14–15 | Central computer v0.7.0 | `Sistema/backend/src/servidor.ts` |
| `Sistema/` · `Simulacion/` split | Nov 15 | Operational and simulation modes | commit `3a69503` and later |
| Integration of the most recent work into `Sistema/` | Nov 15 | Condition traffic light via API, model analysis from the central computer, engine normal value, simulator in English | Three-way merge from `Planeacion/` |
| Modular documentation | Nov 15 | This `documentacion/` folder and the consolidated README | — |

## 7. Activities and deliverables

| Deliverable | Location |
|---|---|
| Central computer backend | `Sistema/backend/` |
| Web interfaces (phone, central, base, watch) | `Sistema/interfaces/eva/`, `Sistema/interfaces/reloj/` |
| `/tierra` and `/nave` consoles | `Sistema/backend/web/` |
| ESP32 firmware and test vectors | `Sistema/esp32/` |
| BLE gateway | `Sistema/pasarela/` |
| Visual simulator and generator | `Simulacion/simulador/`, `Simulacion/generador/` |
| Health prototype (app, engine, adapters, validation) | `prototipo-salud/` |
| Per-ailment weight matrix | `Planeacion/Leo/modelo-pesos/` |
| Presentation video | `video/lunna-video.mp4` |
| Documentation | `documentacion/` and `prototipo-salud/README.md` (consolidated) |

## 8. Technology resources

| Resource | Use |
|---|---|
| Node.js ≥ 22.6 (`node:sqlite`, `--experimental-strip-types`) | Backend and tests, no npm dependencies |
| SQLite (WAL mode) | `Sistema/backend/eva.db` and `Simulacion/eva-simulacion.db` |
| HTML, CSS and JavaScript without a framework | Interfaces |
| Python 3.13 (app) and 3.11 (model environments), `uv` manager | Health prototype |
| PyTorch 2.5.1 + cu124 | Echocardiography models (PC with GPU) |
| NeuroKit2 0.3.0 + wfdb 4.3.1 | ECG |
| Streamlit | Prototype app |
| Python + `bleak` | BLE gateway |
| Arduino/ESP32 BLE | Smart shirt firmware |
| Reference GPU | NVIDIA RTX 4050 Laptop 6 GB (Iker's PC, Windows) |

## 9. General risks and considerations

| Risk | Impact | Current control |
|---|---|---|
| Clinical over-interpretation | High | SIMULATED / provisional / [T] terrestrial labels; "not a diagnosis" notices |
| Priors and thresholds not validated in flight | High | Declared as assumptions; a prior without a source is rejected |
| Divergence between copies of the code | Medium | A single source of active code: `Sistema/` (see [§10](#10-repository-status-as-of-the-revision-date)) |
| SQLite corruption when moving it | Medium | Stop the backend before copying `eva.db` |
| Broken relative paths after reorganizations | Medium | Compatibility redirects `/maquetas/…` → `/interfaces/…` |
| Untested hardware | Medium | Test vectors shared between TypeScript, Python and C++ |
| Restrictive licenses on echo weights | Medium | Local, non-commercial use; see the models table |

## 10. Repository status as of the revision date

Status as of November 15, 2026:

1. **Documentation.** By team decision, the technical documents are consolidated in [`prototipo-salud/README.md`](../prototipo-salud/README.en.md) and in this folder.
2. **Single active codebase in `Sistema/`.** The most recent work, which lived in `Planeacion/Julio/backend/` and `Planeacion/Leo/maqueta-eva/`, was integrated into `Sistema/` through a three-way merge. Both the operational and simulation modes were preserved. What was integrated:
   - condition traffic light via API (`semaforo.ts`);
   - model analysis from the central computer (`modelos.ts`);
   - engine normal value (`referencias-motor.ts`, `referencias.js`, `alertas-motor.js`);
   - `npm run evaluar` command (`evaluar-salud.ts`);
   - traffic light view in the central computer (`semaforo.js`);
   - visual simulator in English.
   The old folders were removed from the tree; their complete history is in git.
3. **A single condition matrix.** The source of truth is [`prototipo-salud/datos/modelo/PADECIMIENTO-VARIABLE.csv`](../prototipo-salud/datos/modelo/PADECIMIENTO-VARIABLE.csv), used by both the engine and the backend: 350 links. The copy in `Planeacion/data/padecimientos/` was made identical to it.

## Related documentation

- [General index](INDICE.en.md)
- [Research protocol](README_02_PROTOCOLO_INVESTIGACION.en.md)
- [System architecture](README_04_ARQUITECTURA_SISTEMA.en.md)
- [Testing and validation](README_08_PRUEBAS_VALIDACION.en.md)
- [Security, reliability and risks](README_10_SEGURIDAD_CONFIABILIDAD_RIESGOS.en.md)
