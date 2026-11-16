> 🌐 [Español](README_03_MANUAL_USUARIO.md) · **English**

# 03 · User manual

> All crew data shown on the screens are **synthetic**. No screen should be used to diagnose, treat or authorize medical decisions. The thresholds are provisional.

## 1. Introduction

LUNNA has four mission screens, served from the central computer. There are also two technical consoles, a visual simulator and a standalone analysis application (the health prototype).

| Screen | Who uses it | Address |
|---|---|---|
| Crew **phone** | Each astronaut | `/app/` |
| **Central computer** | The CMO (crew medical officer; in the demo, Mei) | `/app/central.html` |
| **Earth base** | The flight surgeon | `/app/base.html` |
| **Watch** | Each astronaut | `/reloj/` |
| Mission control console | Earth (technical) | `/tierra` |
| Spacecraft link panel | Technical | `/nave` |
| Visual spacecraft simulator | Demonstration, simulation mode only | `/simulador` |
| Health prototype (Streamlit) | Analysis of models and conditions | `http://localhost:8501` |

## 2. Requirements for use

- A modern browser. The interfaces use no external libraries or fonts and work without internet.
- The backend running. For the full demonstration: `cd Simulacion` and `npm start` (see [installation](README_09_INSTALACION_CONFIGURACION_DESPLIEGUE.en.md)).
- **There is no login.** The system has no accounts or passwords. The active person is chosen on the screens themselves (see §4).

## 3. Operating modes

| How it is opened | Mode | What is shown |
|---|---|---|
| `cd Simulacion` and then `npm start` | **Simulation** | Everything, with the synthetic scenario. A yellow badge at the bottom left reads **"Simulation · synthetic data"** |
| `cd Sistema/backend` and then `npm start` | **Operational** | The scenario is not loaded. Phone, base and watch show the **"Operational mode"** (*«Modo operativo»*) notice, because they are still rendered with the scenario. The central computer shows only its live blocks. `/simulador` returns 404 |
| Double-click on `Sistema/interfaces/eva/index.html`, `central.html`, `base.html` or `Sistema/interfaces/reloj/index.html` | Simulation, without backend | The mock-up with the local scenario, without live data |

## 4. Phone navigation (`/app/`)

On a desktop it is shown inside a phone frame; on a mobile device it fills the whole screen. The floating navigation bar is at the bottom.

| Tab | Contents |
|---|---|
| **Home** | LUNNA Body, notices (fatigue, note from Earth, solar event), check-in, body data and your crew (with role-based privacy) |
| **Log** | Food, glucose, blood pressure, temperature, water, mass, symptoms, sleep, exercise, strength, mind (stress, PHQ-9, KSS, journal), urine strip and camera photo |
| **Cycle** | Only for female crew members, private: cycle ring, week, logging by category |
| **Reports** | Alerts and protocols, signs and trends, reflexes (PVT-B), radiation, Earth, solar event, CMO view and achievements |
| **Settings** | Simulation (person and day), privacy, Lunna, light/navy blue theme, notifications, help and what is real or simulated |
| **Lunna** (floating button) | What Lunna sees today, how it monitors you, space weather, library and talk |

**Useful URL parameters:**

| Parameter | Example | Effect |
|---|---|---|
| `persona` | `/app/?persona=MS-1` | Opens as another crew member |
| `dia` | `/app/?dia=115` | Opens on another day of the scenario (106–115) |
| `pantalla` | `/app/?pantalla=ciclo` | Opens a tab directly |
| `tema` | `/app/?tema=oscuro` | Navy blue theme |
| `demo` | `/app/?demo` | Automatic demo of a full day (~3 min) |

Person, day and theme are shared among the phone, central computer, base and watch when they are opened from the same origin (keys `eva:persona`, `eva:dia`, `eva:tema`).

## 5. Display of physiological information

### 5.1 LUNNA Body

This is the scanner figure that appears first on Home. The tappable zones are the head, eyes, heart, lungs, abdomen, kidneys and bladder, muscles, skin and the radiation halo. Tapping one zooms the figure in and opens a panel with:

- the organ viewer;
- the associated HRP hazard;
- the indicators with their traffic light;
- the provenance of the data;
- a 14-day chart.

### 5.2 Indicator cards

Each card shows the value, **your normal** (the previous 14 days), the chart, the reason for the state, how it is measured and the threshold with its source. The tags indicate **NASA** (official) or **Earth** (terrestrial clinical, not validated in space).

### 5.3 Interpreting states

The state is always indicated with shape and color, never with color alone.

| Symbol | State | Meaning |
|---|---|---|
| ● | In your normal | Within what is expected for you |
| ■ | Attention | Something is moving away from your normal or crosses an attention threshold |
| ▲ | Act now | Priority alert |
| ○ | No data | There is no current measurement |

Mock-up rules: a single signal calls for attention at |z| ≥ 3; several signals at |z| ≥ 2 at the same time also call for it, as in the FATIGA-03 episode. Your normal never produces red on its own.

### 5.4 Lunna's phase

| Appearance | Meaning |
|---|---|
| Full moon, cyan halo | Everything within their normal |
| Gibbous or quarter, amber halo | Something to review |
| Nearly new, pulsing red | Priority alert / emergency |

The floating bubble can be dragged, snaps to the edge and remembers its position. Tapping it opens "What Lunna sees today": which signals, with what numbers against your normal, which rule was met and what is advisable to do. **Lunna warns; it does not diagnose.**

## 6. Central computer (`/app/central.html`)

| Section | Contents |
|---|---|
| **Today** | Mission, Lunna, crew with their bodies, notices, environment, space weather, history of warnings and emergencies |
| **Clinical panel** (`#tripulante/MS-2`) | Signs against their normal, LUNNA Body, sleep and reflexes, goals, doses, per-condition index, medical intervention |
| **Statistics** | State per day, what most called for attention, notices per mission |
| **Link with Earth** | Prioritized queue, what has been received and queries to the base |
| **Traffic light** (`#semaforo`) | The 20 conditions of the Python engine: color, detail of the variables that moved it and editable weights. It is different from the per-condition index in the clinical panel (11 ailments, Leo's weights) |

Blocks marked **"Live · backend"** show real data from the backend: crew members, latest value versus what is expected, LUNNA alerts and link status. What the backend does not yet provide appears under the label **"Simulated scenario · not from the backend"**.

Available actions:
- **Send to …**: notice from the CMO to a crew member's phone (`POST /api/abordo/avisos`). It arrives without delay.
- **Ask Earth**: a query that is sent down the link (`POST /api/central/consultas`).

In the Traffic light view, below the list of conditions, is the **Analyze with models** card (PR [#13](https://github.com/DinDevJ/lunna/pull/13)). It starts collapsed and remembers whether it was left open (local storage `eva:sm-mod-abierto`). From there an echo or ECG analysis is launched (`POST /api/modelos/analizar`) on a sample from the samples folder, with the SIMULATED mark when applicable. **It is not a diagnosis.**

## 7. Earth base (`/app/base.html`)

It shows only what has already arrived, always with its SCET (on-board event time) and its age.

- **Forecasts** (`#pronosticos`): crew × 11 conditions map with the weighted index from the weight matrix, what each variable contributes and a 3-day trend. The trend is **illustrative**; the index **is not a probability**.
- **Messages**: notices and warnings to the spacecraft with their path (drafted → on the way → on board → acknowledgment).

It is **intentional** that Earth sees the past: messages travel with the link delay (18 min one way in the mock-up scenario; 20 s by default in the demo backend).

## 8. Watch (`/reloj/`)

| Screen | Contents |
|---|---|
| Watch face | Time, mission day and Lunna with the person's state |
| Heart rate | Live pulse and 40-s chart; resting pulse against their normal |
| Oxygen (SpO₂) | Ring from 80 to 100%, with a notice that wrist SpO₂ may overestimate |
| Temperature | Skin temperature, 14 days against their normal |
| Sleep | Hours last night and the last 7 nights |
| Mood | Low / normal / intermediate / high (0–100: < 25 · 25–49 · 50–74 · ≥ 75) |
| More signs | Breathing, HRV, exercise, water, radiation dose |
| What Lunna sees | Summary and what is advisable to do |

Lunna's little face changes with the state: **good** (happy), **unwell** (worried), **critical** (alarmed; the screen flashes red) and **asleep** (from 23:00 to 07:00, if nothing is critical).

With the backend, the "now" pulse and SpO₂ carry the **LIVE** mark. If no reading arrives within 20 s, the watch falls back to the simulated value and indicates this. `/reloj/?embebido` shows only the watch, without the simulation panel.

## 9. Visual simulator (`/simulador`)

It exists only in simulation mode. It shows the astronaut, her devices, the central PC and Earth. Clicking an object opens its window:

| Object | *Frontend* tab | *Backend* tab |
|---|---|---|
| Smartphone | The phone (`/app/`) | The phone's terminal |
| PC | The central computer (`/app/central.html`) | The PC's terminal |
| Earth | The base (`/app/base.html`) | Earth's terminal |
| Watch | The watch (`/reloj/?embebido&persona=MS-2`) | The watch's terminal |

When switched to "Live", the simulator shortens the LUNNA window to 5 min and announces it, so that an anomaly becomes visible within minutes. The `modo mision` command in the PC terminal returns it to 24 h.

Practical example: with "▶ Live" on, type `hipoxia 12` in the watch terminal and the SpO₂ drops on the watch face.

## 10. Common procedures

**Walking through the demonstration scenario**

1. Start in simulation mode and open `/app/`.
2. In Settings → Simulation, choose **Ana** and **day 112**: the synthetic FATIGA-03 episode appears (sleep z −2.4, PVT-B lapses z +2.0, resting pulse z +2.2).
3. Move to **days 113–114**: improvement and closing of the notice.
4. Open **day 115**: solar event modeled on DONKI `2024-05-11T02:10:00-SEP-001` and ▲ for the whole crew.
5. Check **Luis**: he always appears with ■ because of blood pressure of 130–139 mmHg (AHA threshold [T]).

**Illustrative emergency**

The red **SOS** button (top right) starts the demonstration sequence without confirmation:

1. the vital signs drop (simulated hypoxia: SpO₂ 97 → 84%);
2. the T+ timer starts;
3. the CMO is notified;
4. a priority packet is sent to Earth;
5. a sealed record is kept.

With the backend, it is recorded via `POST /api/emergencias`. The steps are marked **"Illustrative: not a medical protocol"**.

**Sending a notice from Earth**

In `/tierra` or in the base, draft a notice. It reaches the recipient's phone as a notification after the link delay. Red alerts stay until they are dismissed; the others disappear on their own.

## 11. Health prototype (Streamlit)

Sidebar → **View** (*Vista*):

- **Models and sensors** (*Modelos y sensores*; sections 0–7): run the echo and ECG adapters, import CSV/JSON sensor data, compare models.
- **Conditions** (*Padecimientos*): choose a person. Those of the synthetic crew carry the **SIMULATED** (*SIMULADO*) label. "View" (*Ver*) opens the detail: links, weight, evidence level, source, step-by-step calculation and why that color.
- **Configuration** (*Configuración*): edit thresholds, weights and `prior_de`. Changes are marked "modified by the user" (*modificado por el usuario*) and have no source. "Restore sourced values" (*Restaurar valores con fuente*) undoes them.

Reading the traffic light: **GREEN** (`VERDE`) means "no deviations in what was measured, with sufficient coverage", not "healthy". **GRAY** (`GRIS`) means "there is nothing to base an opinion on". No probability percentage is shown.

## 12. Error messages and solutions

| Message or symptom | Cause | Solution |
|---|---|---|
| `npm error enoent Could not read package.json` | `npm start` run in a folder without `package.json` (for example, `Sistema/`) | Use `Simulacion/` or `Sistema/backend/` |
| `✗ El puerto 8787 ya está en uso` | Another backend is still running | Ctrl+C in its terminal and start again |
| "Operational mode" (*«Modo operativo»*) on the phone, base or watch | Backend started from `Sistema/backend` | To see the scenario: `cd Simulacion` and `npm start` |
| `/simulador` → «sólo disponible en modo simulación» ("only available in simulation mode") | Operational mode | Same as above |
| "No connection to the backend" in the central computer | The backend is not responding | The central computer retries every 5 s; check that the backend is running |
| The watch shows the simulated value instead of LIVE | No reading arrived within 20 s | Check that the simulator is "Live" |
| Screens without data when opened with `python -m http.server` | There is no `config.js` and simulation is not assumed | Open from the backend or by double-clicking |

## 13. Privacy

- Each person sees their personal data and their journal.
- The CMO sees the weekly mood trend and what is needed for the mission.
- Earth receives the mood score and the vital signs as a daily summary.
- The journal and the cycle are shared only with permission.

Privacy is enforced by the interface; **the backend does not implement access control** (see [security](README_10_SEGURIDAD_CONFIABILIDAD_RIESGOS.en.md)).

## 14. Usage recommendations

- Always read the "Simulation", "Live · backend" and "Simulated scenario" labels.
- Remember that the consoles may show information older than the current situation of the spacecraft.
- Do not interpret the per-condition index or the traffic light as a diagnosis or as a probability.
- Wrist SpO₂ should not be the only signal of hypoxia.

## Related documentation

- [Installation, configuration and deployment](README_09_INSTALACION_CONFIGURACION_DESPLIEGUE.en.md)
- [System architecture](README_04_ARQUITECTURA_SISTEMA.en.md)
- [Computational models and algorithms](README_06_MODELOS_COMPUTACIONALES_ALGORITMOS.en.md)
- [Data and variable dictionary](README_07_DICCIONARIO_DATOS_VARIABLES.en.md)
