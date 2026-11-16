# Lunna · Space Apps 2026 submission (ready to paste)

> Draft for the submission form. Every figure below is verified in the repository (README, `documentacion/`, CI).
> Challenge: **Create Health Monitoring Software for Astronauts on Space Missions** · Team **Monarcas**.

## Project name
Lunna — onboard health monitoring that learns each astronaut's own normal

## High-level summary
On a mission to Mars, Earth can be up to ~20 minutes away by light, so the crew must detect and act on health
problems on board. Lunna learns each astronaut's own normal and warns the crew medical officer before a problem grows.
Sensors (an ESP32 smart shirt, a blood-pressure cuff and a watch) stream over Bluetooth to an onboard central computer
that works fully offline. A Bayesian model (LUNNA) predicts the expected value of each vital sign for that person in
that environment, with a 95% band, and a second criterion checks clinical thresholds; the worse of the two wins and the
alert says why. A 20-condition engine links variables to NASA HRP risks with evidence levels. Earth receives the same
data with the light-time delay through a delay-tolerant link (sequence numbers, ACKs, retries: zero losses and zero
duplicates in fault-injection tests) and answers with notices. Four interfaces (crew phone, watch, central computer for
the CMO, Earth base for the flight surgeon), a spacecraft simulator and a bilingual landing page are deployed live.
Prototype: not a medical device; the demo crew is fictional and its data is synthetic and labeled as such.

## Link to project demo
https://lunna.danaus.dev  (landing with the three devices running live, video, math, models, validation)
Simulator: https://app.lunna.danaus.dev

## Final project link
https://github.com/DinDevJ/lunna  (must be public for judges)

## Details — what it does and how it works
- **Hardware chain:** ESP32 firmware reads ECG-derived heart rate, breathing and temperature and builds 17-byte binary
  frames (13-byte header); a BLE gateway collects all devices, timestamps them and buffers up to 50,000 frames if the
  central computer is down; the shirt itself buffers ~1,800 readings (~30 min) offline. Firmware (C++), gateway
  (Python) and backend (TypeScript) produce the same bytes — checked automatically in CI.
- **LUNNA (Bayesian, explainable):** three-layer normal-normal update (literature prior, previous missions, the person's
  first 14 flight days). Calibration freezes on day 14 so a slow drift never becomes "the new normal". Every prediction
  has its 95% band and every alert the probability that it is noise.
- **Two alert criteria:** personal (window median vs. expected for that person) catches slow drifts; clinical threshold
  (median of 5 readings in 10 min vs. a sourced limit) catches acute events — an SpO₂ of 87% is serious even if it is
  "normal for you".
- **20-condition traffic light:** 350 variable–condition links with evidence levels (9 A · 31 B · 310 C) and weights
  editable by the flight surgeon; shrunk pre-flight baseline, protected EWMA, anchored CUSUM; it shows no probabilities
  and stays GRAY when evidence is insufficient instead of guessing.
- **Offline + Earth sync:** store-and-forward everywhere; red alerts first, raw data last; idempotent receiver.
- **ECG and echo models** callable from the central computer (NeuroKit2 ECG; PanEcho and others), entered at the lowest
  evidence level: on their own they never trigger red.

## Benefits and intended impact
Autonomy when Earth cannot answer in time; fewer false alarms than population ranges (the same 85 bpm reading is an
alert for one simulated crew member, z 9.17, and normal for another, z 0.43); every number auditable, with its source.

## Tools, languages, hardware
TypeScript/Node 22 (built-in SQLite, zero dependencies), vanilla JS/HTML/CSS interfaces (ES/EN), Python (condition
engine, ECG/echo adapters), C++ (ESP32 firmware), BLE, nginx, GitHub Actions CI.

## Space agency data used
- **NASA OSDR — Inspiration4 open labs (OSD-569, OSD-575):** external validation of the condition engine with real data
  from the 4 civilian crew members (n = 4, honest and limited: 80/80 cells GRAY with only 3 pre-flight draws).
- **NASA DONKI:** real solar particle events; the scenario's solar event is modeled on 2024-05-11T02:10:00-SEP-001.
- **NASA-STD-3001:** cabin environment limits (CO₂, radiation…), marked [A] in the interfaces.
- **NASA HRP risks:** each of the 20 conditions is tied to a documented HRP/OCHMO risk.

## Verification (automated, on every change — GitHub Actions)
Backend 93/93 (89.8% line / 82.7% branch coverage of the source) · simulation 4/4 · interface engine 25/25 ·
firmware and gateway byte-identical to the backend · condition engine (Python) 109/109. Four clinical scenarios
(hypoxia, infection, fatigue, hypertension) alert and return to green; 0 false alarms in 3 min without anomalies.

## Honest limitations
Firmware not yet tested on a physical board; no real in-flight astronaut data; no threshold clinically validated in
microgravity; no user authentication or encryption at rest in this prototype (the deployment binds the backend to
localhost, rate-limits per IP and sets security headers).

## Use of AI
Development was assisted by AI coding tools (code, documentation, translation). All figures were verified against the
repository's tests and documents. Inside the product, alerts come from deterministic and statistical methods (Bayesian
model, clinical thresholds, rule-based condition engine); no generative model makes health decisions.

## References (selection; full list in `documentacion/`)
NASA OSDR (OSD-569, OSD-575) · NASA DONKI · NASA-STD-3001 · NASA Human Research Program risks · PhysioNet MIT-BIH ·
NHANES · Sottas et al. 2007 (shrunk baseline) · Coskun et al. 2021 · Obermeyer et al. 2017.

## NASA data (form: Link Text · URL)
| Link text | URL |
|---|---|
| NASA OSDR OSD-569 — Inspiration4 complete blood count | https://osdr.nasa.gov/bio/repo/data/studies/OSD-569 |
| NASA OSDR OSD-575 — Inspiration4 metabolic panel and serum markers | https://osdr.nasa.gov/bio/repo/data/studies/OSD-575 |
| NASA OSDR Biological Data API | https://visualization.osdr.nasa.gov/biodata/api/ |
| NASA DONKI space weather API | https://api.nasa.gov |
| NASA-STD-3001 Vol. 1 Rev. C | https://standards.nasa.gov/sites/default/files/standards/NASA/C//nasa-std-3001-vol-1-rev-c-signature.pdf |
| NASA HRP Cardiovascular Risk Evidence Report | https://humanresearchroadmap.nasa.gov/evidence/reports/Cardio%20Risk%20EB%202022%20FINAL_4-3-2023.pdf |
| NASA Risk of SANS | https://www.nasa.gov/reference/risk-of-spaceflight-associated-neuro-ocular-syndrome-sans/ |
| NASA Risk of Decompression Sickness | https://www.nasa.gov/reference/risk-of-decompression-sickness/ |
| NASA OCHMO Technical Brief — Bone loss | https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-030-bone-loss.pdf |
| NASA OCHMO Medical Technical Brief — SANS | https://www.nasa.gov/wp-content/uploads/2024/02/ochmo-mtb-001-sans.pdf |

## Other data and tools (form: Space Agency Partner & Other Data)
| Link text | URL |
|---|---|
| PhysioNet MIT-BIH Arrhythmia Database | https://physionet.org/content/mitdb/1.0.0/ |
| PhysioNet MIT-BIH Atrial Fibrillation Database | https://physionet.org/content/afdb/1.0.0/ |
| NeuroKit2 (ECG processing) | https://github.com/neuropsychology/NeuroKit |
| PanEcho (echocardiography model) | https://github.com/CarDS-Yale/PanEcho |
| EchoNet-Dynamic | https://github.com/echonet/dynamic |
| EchoPrime | https://github.com/echonet/EchoPrime |
| MedSAM2 | https://github.com/bowang-lab/MedSAM2 |

