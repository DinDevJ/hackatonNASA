> 🌐 [Español](ONBOARDING.md) · **English**

# Onboarding · Lunna

Entry guide with two routes: **for judges and scientists** (what it does, how to see it working and where the evidence
for each claim is) and **for developers** (how it is built and how to work on it).

> In one sentence: Lunna learns each astronaut's normal, compares every reading with what is expected **for that person
> in that environment** and warns the crew medical officer before a problem grows, without depending on Earth.

---

## Route 1 · Judges and scientists (10 minutes)

### 1. See it working

Requires **Node.js 22.6+**. No `npm install` and no internet needed.

```bash
cd Simulacion
npm start
```

| Step | Where | What you should see |
|---|---|---|
| 1 | http://localhost:8787/simulador → **Prepare mission** | 112 days of history for 4 crew members are loaded; LUNNA learns each one's normal during their first 14 days |
| 2 | **▶ Live** | The sensors transmit. Click the smart shirt, the ESP32, the watch or the cuff: each one opens its terminal with the frames it sends (the ESP32, its serial monitor) |
| 3 | Terminal of the **central PC**: `scenario hypoxia` | Ana's SpO₂ drops gradually; in ~1 to 2 min LUNNA raises an alert and indicates whether it was triggered by her normal or by the clinical threshold |
| 4 | Click **Earth** | The Earth base receives the alert with the light-time delay and its age (18 min each way in the scenario; 20 s by default in the demo backend) |
| 5 | From the Earth base, a manual alert to Ana | It reaches Ana's phone as a notification; the spacecraft sends back the acknowledgment of receipt |
| 6 | Terminal of the PC: `scenario normal` | The values return to normal and the alert goes back to green |
| 7 | Smart shirt: `ble off`, wait 20 s, `ble on` | Without Bluetooth the ESP32 stores the readings; on reconnecting, all of them are sent with their original time |

Other scenarios: `infection`, `fatigue`, `hypertension`. The simulator is in English; the commands are also
accepted in Spanish (`escenario hipoxia`, `ayuda`). Type `help` in any terminal to see its commands.

> **Demo mode.** In a mission, LUNNA's personal criterion uses the 24 h median. So that a demo lasting a few
> minutes can show the alert and the recovery, the simulator shortens it to 5 min and announces this in the terminal
> (`mode mission` sets it back to 24 h). The clinical thresholds do not change.

### 2. Where the evidence for each claim is

| Claim | Code | Test that demonstrates it (`Sistema/backend/test/`) |
|---|---|---|
| Per-person Bayesian prediction in three layers (literature, previous missions, own calibration) | [`lunna.ts`](Sistema/backend/src/lunna.ts) | `unidad.test.ts`: «sin datos propios manda la literatura» (*with no data of their own, the literature dominates*), «una misión previa de −10 % arrastra la predicción» (*a previous mission at −10% pulls the prediction*), «tras la calibración mandan los datos propios» (*after calibration, the person's own data dominate*), «el tipo de sangre no cambia nada» (*blood type changes nothing*) |
| The calibration is frozen: a slow drift does not become "normal" | [`ingesta.ts`](Sistema/backend/src/ingesta.ts) | `integracion.test.ts`: «LUNNA detecta la deriva tras la calibración, no durante» (*LUNNA detects the drift after calibration, not during it*) |
| Every alert comes with the probability that it is noise | [`lunna.ts`](Sistema/backend/src/lunna.ts) | `unidad.test.ts`: «probabilidad de que la desviación sea ruido normal» (*probability that the deviation is normal noise*) |
| The clinical threshold warns even if the personal normal is green; an isolated artifact does not trigger it | [`ingesta.ts`](Sistema/backend/src/ingesta.ts) · [`referencias.ts`](Sistema/backend/src/referencias.ts) | `umbrales.test.ts` (12 tests) |
| Synchronization with Earth without losses or duplicates | [`sincro.ts`](Sistema/backend/src/sincro.ts) · [`enlace-https.ts`](Sistema/backend/src/enlace-https.ts) | `sincro.test.ts`: «pérdida de ACK» (*ACK loss*), «llegada fuera de orden» (*out-of-order arrival*), «fuzz determinista: 200 mensajes con fallos al azar llegan exactamente una vez» (*deterministic fuzz: 200 messages with random failures arrive exactly once*); `enlace-https.test.ts` |
| Light-time delay, closed window and return notices | [`enlace.ts`](Sistema/backend/src/enlace.ts) | `integracion.test.ts`: «enlace con Tierra: retraso de la luz, ventana cerrada y avisos de vuelta» (*link with Earth: light-time delay, closed window and return notices*) |
| A resent frame is not duplicated; a device without an owner is rejected | [`ingesta.ts`](Sistema/backend/src/ingesta.ts) | `integracion.test.ts`: «un reenvío no duplica» (*a resend does not duplicate*), «un dispositivo sin asignar se rechaza» (*an unassigned device is rejected*) |
| Firmware, gateway and backend produce the same bytes | [`trama_eva.h`](Sistema/esp32/playera_eva/trama_eva.h) · [`trama_eva.py`](Sistema/pasarela/trama_eva.py) · [`esquema.ts`](Sistema/backend/src/esquema.ts) | `Sistema/esp32/test/test_trama.cpp` and `Sistema/pasarela/test_trama.py` against `vectores.json` |
| 20-condition engine with weights editable by the flight surgeon | [`prototipo-salud/motor/`](prototipo-salud/motor) · [`semaforo.ts`](Sistema/backend/src/semaforo.ts) | `salud.test.ts`, `semaforo.test.ts`; `prototipo-salud/tests/` |
| Schema formulas cannot execute code | [`formula.ts`](Sistema/backend/src/formula.ts) | `unidad.test.ts`: «rechaza todo lo que no sea aritmética» (*rejects anything that is not arithmetic*) |

### 3. Medical basis

- **Each threshold states where it comes from:** **[A]** if it comes from NASA or was validated in astronauts, **[T]** if it is an Earth
  clinical threshold. The vital-sign thresholds in the catalog are **[T]**: no public NASA table was found for
  them. Item-by-item traceability, with file and row: [`medibles.en.md`](Sistema/backend/semillas/medibles.en.md).
- **The expected changes in microgravity** (for example, blood pressure in orbit) come from the literature
  cataloged by the team; see the [data dictionary](documentacion/README_07_DICCIONARIO_DATOS_VARIABLES.en.md).
- **The cabin environment** (CO₂, O₂, noise) uses the NASA-STD-3001 limits.
- **The weights per condition** carry their level of evidence (A measured, B mechanism, C team judgment) and their DOI.
- **It does not diagnose:** it points out what to watch and why; the clinical decision belongs to the CMO and the flight surgeon.

Full rigor: [research protocol](documentacion/README_02_PROTOCOLO_INVESTIGACION.en.md) →
[algorithms](documentacion/README_06_MODELOS_COMPUTACIONALES_ALGORITMOS.en.md) →
[testing and validation](documentacion/README_08_PRUEBAS_VALIDACION.en.md) →
[risks](documentacion/README_10_SEGURIDAD_CONFIABILIDAD_RIESGOS.en.md).

### 4. What it is not yet

- For the ESP32 firmware, the frame encoder (same bytes as the backend) and the program's syntax were verified on a desktop
  computer, but **it has not been compiled or tested on a physical board**.
- **There are no data from astronauts in flight.** The external validation with Inspiration4 is limited (n = 4, no open
  vital signs and a partially simulated baseline) and is reported as such.
- **No authentication or encryption** in the API: it is a demo, not a mission-ready system.

---

## Route 2 · Development

### Repository map

| Folder | What it is | Language |
|---|---|---|
| [`Sistema/backend/`](Sistema/backend) | Central computer: ingestion, LUNNA, conditions, link with Earth, REST API + SSE. Serves the interfaces | TypeScript (Node 22, no dependencies, built-in SQLite) |
| [`Sistema/interfaces/eva/`](Sistema/interfaces/eva) | Phone (`/app/`), central computer (`/app/central.html`) and Earth base (`/app/base.html`) | HTML, CSS, JS |
| [`Sistema/interfaces/reloj/`](Sistema/interfaces/reloj) | Watch (`/reloj/`) | HTML, CSS, JS |
| [`Sistema/esp32/`](Sistema/esp32) | Smart shirt firmware (Arduino) and test vectors | C++ |
| [`Sistema/pasarela/`](Sistema/pasarela) | Bluetooth LE gateway (bleak) | Python |
| [`Simulacion/`](Simulacion) | Visual simulator, terminal-based generator, interface scenario and DONKI events | HTML, TS, Python |
| [`prototipo-salud/`](prototipo-salud) | Condition engine, ECG and echo models, Streamlit app, Inspiration4 validation | Python |
| [`documentacion/`](documentacion/INDICE.en.md) | Ten technical documents | Markdown |
| [`landing/`](landing) · [`despliegue/`](despliegue) | Presentation page and installation on a VPS | HTML · Bash |

### Path of a reading

```
ESP32 reads the sensor ──► queues it (millis) ──► with Bluetooth and the time set: builds the 17 B frame and notifies it
   └► pasarela_ble.py: validates, detects gaps by seq ──► POST /api/tramas/binaria (batches)
        └► ingesta.ts: is the device registered? who is wearing it at that time? ──► decodes with its schema
             └► stores in SQLite with the on-board time (SCET), no duplicates
                  └► vigilar(): personal criterion (LUNNA) + clinical threshold ──► alert if the state changes
                       ├► SSE /api/stream ──► central computer, phone, watch
                       └► enlace.ts / sincro.ts: queue to Earth by priority, with seq and ACK
```

### Modes

| Mode | Command | What it loads |
|---|---|---|
| **Simulation** (demo) | `cd Simulacion && npm start` | Backend from `Sistema/` + simulator, synthetic scenario and a separate database (`Simulacion/eva-simulacion.db`) |
| **Operational** | `cd Sistema/backend && npm start` | Only the real system; `/simulador` returns 404 |
| **Roles with HTTPS link** | `npm run certs` · `npm run tierra` · `npm run nave` (in `Sistema/backend`) | Two processes, each with its own database, synchronized over HTTPS |

### Tests

```bash
cd Sistema/backend && npm test                                     # backend
cd Simulacion && npm test                                          # simulation mode
cd Sistema/interfaces/eva && node --test *.test.mjs                # interface engine
cd Sistema/pasarela && python3 test_trama.py                       # gateway = backend
cd Sistema/esp32/test && g++ -std=c++17 -I../playera_eva test_trama.cpp -o t && ./t   # firmware = backend
cd prototipo-salud && python -m pytest                             # condition engine
```

### Common tasks

- **Add a sensor:** register the variable and its schema (`POST /api/variables`, `POST /api/esquemas`) and the
  device (`POST /api/dispositivos`); the firmware only replicates `codificar()`. See
  [integration](documentacion/README_05_INTEGRACION_INTEROPERABILIDAD.en.md).
- **Change a clinical threshold:** edit `Sistema/backend/semillas/medibles.json` with its source and its [A]/[T] type, and
  update `medibles.md`.
- **Deploy:** [`despliegue/README.en.md`](despliegue/README.en.md).

### Conventions

- **All synthetic data are labeled** ("SIMULATED", "Simulation · synthetic data"). Nothing simulated enters the real channel.
- **Each threshold carries its provenance** [A]/[T] and its source; without a source it is not published.
- **The system warns and explains; it does not diagnose.**
- Code in Spanish. The documentation is in Spanish and English: every document has its `.en.md` version next to it. The interfaces and the landing page have an English translation.

---

## Glossary

| Term | Meaning |
|---|---|
| **CMO** | *Crew Medical Officer*: the on-board physician |
| **LUNNA** | *Live-telemetry Updating Network for Nominal-deviation & Anomalies*: the per-person Bayesian model |
| **Personal normal** | What is expected for that person in that environment, with its 95% band |
| **[A] / [T]** | Threshold from NASA or validated in astronauts / Earth clinical threshold, not validated in microgravity |
| **OWLT** | One-way light time. At Mars, the physical delay ranges from minutes to more than 20 min. The mock-up scenario uses 18 min each way; the demo backend defaults to 20 s |
| **SCET / ERT** | Time at which it occurred on board / time at which it reached Earth |
| **DTN** | Store and forward: nothing is lost if the link drops |
| **EVA profile** | Binary frame format: 13-byte header + payload defined by a schema |
