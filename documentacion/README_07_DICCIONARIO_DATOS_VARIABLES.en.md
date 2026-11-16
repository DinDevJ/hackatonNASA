> 🌐 [Español](README_07_DICCIONARIO_DATOS_VARIABLES.md) · **English**

# 07 · Data dictionary and variable specification

**Conventions**

- `NN:Xn` identifiers: the team's research catalog.
  - Prefix `01:` cardiovascular / hematological.
  - Prefix `02:` musculoskeletal, renal and nutrition.
  - Prefix `03:` sleep, cognition and behavior.
  - Prefix `04:` vital signs, environment and symptoms.
- `X:`: variable added by the team.
- **[T]**: terrestrial clinical threshold, not validated in microgravity. **[A]**: validated in astronauts or from NASA.
- Values that are not in the sources are marked **not found**. No ranges or units are inferred here.

## 1. Variables evaluated by the backend

Sources: [`semillas/inicial.json`](../Sistema/backend/semillas/inicial.json) (variables, schemas, priors) and [`semillas/medibles.json`](../Sistema/backend/semillas/medibles.json) (references and thresholds).

| ID | Name | Unit | Type in the frame | Provenance | Acquisition source |
|---|---|---|---|---|---|
| `04:A4` | Heart rate (instantaneous) | bpm | `u8` | sensor | ECG smart shirt / PPG watch (in the simulator, `reloj-ana` sends every 5 s) |
| `04:A3` | SpO₂ | % | `u8` | sensor | Red/infrared PPG watch |
| `04:A2` | Respiratory rate | resp/min | `u8` | sensor | Smart shirt chest strap |
| `04:A1` | Body temperature | °C | `i16`, factor 0.01 | sensor | Smart shirt axillary thermometer |
| `01:V1` | Systolic pressure | mmHg | `u8` | sensor | Oscillometric cuff, at each reading |
| `X:PAD` | Diastolic pressure | mmHg | `u8` | sensor | Cuff, at each reading |
| `X:PAM` | Mean arterial pressure | mmHg | virtual | derived | Calculated with each reading: `round((sis + 2 * dia) / 3 * 10) / 10` |

### 1.1 Configured absolute thresholds

| Variable | Amber | Red | Type | Source |
|---|---|---|---|---|
| HR | > 100 bpm | not found | [T] | MedlinePlus; HRS 2015 |
| SpO₂ | < 92% | < 88% | [T], unofficial proposal | MedlinePlus |
| RR | > 18 resp/min | not found | [T] | MedlinePlus (12–18/min) |
| Temperature | > 39.4 °C | > 40.6 °C | [T], unofficial proposal | MedlinePlus (oral values) |
| Systolic | < 90 or > 140 mmHg | < 70 **[A]** or > 180 mmHg | [T] | ACC/AHA via CDC; < 70 = presyncope, orthostatic test |
| Diastolic | < 60 or > 90 mmHg | > 120 mmHg | [T] | Same |
| MAP | — | — | — | No threshold in the catalog |

> The catalog gives inclusive criteria (“≤ 92%”, “≥ 140”), but the system compares strictly (`<`, `>`). A value equal to the limit does not trigger. This is a semantic discrepancy that remains to be resolved.

Catalog cutoffs that are **not** used as alerts, because they would fire on normal values: HR < 60, RR < 12, temperature < 36.5 °C, and “elevated” or stage 1 blood pressure.

### 1.2 Startup baselines (synthetic)

| Fictional crew member | Role | HR | SpO₂ | RR | Temp. | Sys. | Dia. | MAP |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| `tomas` Tomás | commander | 58 | 98 | 13 | 36.6 | 122 | 78 | 92.7 |
| `ana` Ana | specialist | 62 | 98 | 14 | 36.6 | 115 | 75 | 88.3 |
| `mei` Mei | CMO | 60 | 98 | 14 | 36.7 | 118 | 76 | 90.0 |
| `luis` Luis | engineer | 64 | 97 | 15 | 36.5 | 125 | 80 | 95.0 |

### 1.3 Seeded orbit priors

All of them are marked as provisional.

| Variable | Scale | μ₀ | τ₀ | σ_mission | σ_day | Provenance |
|---|---|---:|---:|---:|---:|---|
| HR | relative | 0 | 0.10 | 0.03 | 0.04 | Non-informative; assumed dispersion |
| SpO₂ | relative | 0 | 0.02 | 0.01 | 0.01 | Non-informative |
| RR | relative | 0 | 0.10 | 0.05 | 0.08 | The catalog says it decreases (n = 8), without a magnitude |
| Temperature | absolute | +1.0 °C | 0.40 | 0.20 | 0.25 | +~1 °C **core** (n = 11, Stahn 2017); applied to an axillary sensor |
| Systolic | relative | −0.067 | 0.05 | 0.03 | 0.05 | −8 mmHg / 120 (n = 8) |
| Diastolic | relative | −0.1125 | 0.05 | 0.03 | 0.05 | −9 mmHg / 80 (n = 8) |
| MAP | relative | −0.093 | 0.05 | 0.03 | 0.05 | Derived; the catalog gives −10 ± 3 mmHg directly (discrepancy) |

## 2. Indicators in the interface mock-up

Source: [`Sistema/interfaces/eva/motor.js`](../Sistema/interfaces/eva/motor.js). The values come from a fixed-seed scenario and are not physiological.

| Indicator | ID | Unit | Capture in the scenario | Note |
|---|---|---|---|---|
| Sleep | `03:V30` | h | Simulated actigraphy | — |
| PVT-B reflexes | `03:V66` | lapses | 3-min test; a lapse is a response > 355 ms | — |
| Mood/stress | `03:V9` | 0–100 scale | Check-in | The CMO only sees the trend |
| Resting pulse | `01:V3` | bpm | Median of the lowest 30 min of sleep | Different from `04:A4` |
| HRV | `03:V17` | ms | Nocturnal RMSSD | The watch in the crew kit does not send RR intervals |
| Blood pressure | `01:V1` | mmHg | Manual | AHA reference [T] |
| SpO₂ | `04:A3` | % | PPG | ≤ 92% attention, ≤ 88% urgent |
| Respiration | `04:A2` | breaths/min | Estimated series | — |
| Fasting glucose | `02:V86` | mg/dL | Glucometer, every 2 days | ADA cutoffs [T] |
| Skin temperature | `04:A1` | °C | Skin sensor | Not equivalent to core or axillary temperature |

## 3. Predictors in the weight matrix (11 ailments)

| Predictor | Cited ID | Note |
|---|---|---|
| `fc_reposo` | `04:A4` / `01:V3` | Instantaneous and resting are distinct concepts |
| `spo2` | `04:A3` | — |
| `respiracion` | `04:A2` | — |
| `temperatura` | `04:A1` | Measurement site unresolved |
| `presion_arterial` | `01:V1` | No daily orthostatic measurement |
| `sueno` | `03:V30` | — |
| `pvt_lapsos` | `03:V66` | — |
| `co2_cabina` | `04:A23` | Scenario reading, not telemetry |
| `sintomas` | `02:V67a`, `03:V82`, `04:A40–A50` | They do not yet reach the live index |

The 11 ailments are: arrhythmia/AF · orthostatic deconditioning · hypoxia · infection/fever · sleep/circadian · fatigue/cognition · CO₂/headache · acute radiation · stress · decompression after EVA · jugular thrombosis and SANS (these two together).

## 4. Engine conditions and links (P01–P20)

Sources: [`prototipo-salud/datos/modelo/PADECIMIENTOS.csv`](../prototipo-salud/datos/modelo/PADECIMIENTOS.csv) (20 rows) and [`PADECIMIENTO-VARIABLE.csv`](../prototipo-salud/datos/modelo/PADECIMIENTO-VARIABLE.csv) (350 links; A = 9, B = 31, C = 310).

| ID | Condition | Variables | Highest-weighted ones (weight and level) |
|---|---|---:|---|
| P01 | Arrhythmia / atrial fibrillation | 15 | `01:V31` rhythm/AF (3A) · `01:V33` premature ventricular contractions (3C) · `01:V45` palpitations/syncope (2B) |
| P02 | Deconditioning and orthostatic intolerance | 18 | `01:V47` BP drop on standing (3A) · `01:V48` HR increase on standing (2B) |
| P03 | Hypoxia / respiratory problem | 8 | `04:A3` SpO₂ (3A) · `04:A2` RR (3B) · `04:A25` PIO₂ (3C) |
| P04 | Infection, fever or immune dysregulation | 25 | `04:A1` temperature (3B) · `01:V3` resting HR (2A) |
| P05 | Sleep loss and circadian misalignment | 31 | `03:V30` sleep by actigraphy (3B) |
| P06 | Fatigue and cognitive impairment | 31 | `03:V66` PVT-B lapses (3A) · `03:V68` Cognition (3B) |
| P07 | CO₂ exposure / headache | 14 | `04:A23` ppCO₂ (3A) · `03:V82` headache (3A) |
| P08 | Acute radiation from a solar event | 16 | `01:V98` lymphocytes (3B) · `01:V93` dose per event (3C) |
| P09 | Stress / behavioral health | 29 | `03:V1` PHQ-9 (3A) |
| P10 | Decompression sickness after EVA | 10 | `04:A36`/`04:A37` DCS symptoms (3C) |
| P11 | Jugular thrombosis | 16 | `01:V58`, `01:V54`, `01:V55` (3B) |
| P12 | SANS / intracranial pressure | 25 | `01:V86` visual symptoms (3B) |
| P13 | Kidney stones and dehydration | 26 | `02:V37` renal colic (3B) |
| P14 | Bone density loss | 20 | `02:V01` BMD by DXA (3C) |
| P15 | Muscle atrophy / aerobic capacity | 19 | `02:V51` VO₂peak (3C) |
| P16 | Space motion sickness | 5 | `02:V67a` symptoms (3C) |
| P17 | Space anemia | 12 | `01:V108` hemoglobin (3C) |
| P18 | Back pain / spinal elongation | 9 | `02:V58` pain (3C) |
| P19 | Inadequate nutrition / mass loss | 12 | `01:V8` body mass (3C) |
| P20 | Glucose / insulin resistance | 9 | `02:V86` fasting glucose (3C) |

The counts in the table were checked against the CSV and add up to 350. They include LVEF (`01:V18`, weight 1, level C) in P01 and P02.

Link columns: `padecimiento_id, variable_id, variable, peso, direccion, lr_o_or, nivel_evidencia, fuente, prior_media, prior_de, medido_en_vuelo, precision`.

### 4.1 Correlation groups (not summed within the group)

- {`03:V82`, `03:V83`, `04:A6`}: headache.
- {`01:V3`, `04:A4`}: HR.
- {flag `01:V31`, `latidos_irregulares`}.
- {`hrv_rmssd`, `hrv_sdnn`}.

### 4.2 Duplicates resolved with a canonical ID

CO₂ → `04:A23` · HR → `01:V3` · HRV → `03:V17` (alias `01:V43`) · cabin temperature → `04:A27` · serum calcium → `02:V14`.

## 5. Derived and ECG variables

| Metric (`ecg` adapter) | Unit | `variable_id` in the engine | Level |
|---|---|---|---|
| `heart_rate` | bpm | `01:V3` if the recording is at rest/during sleep; otherwise `04:A4` | N1/N2 |
| `hrv_rmssd`, `hrv_sdnn` | ms | `03:V17` (ln RMSSD decides) | — |
| `qtc_bazett` | ms | `01:V34` (Rautaharju criterion ≥ 450 ♂ / ≥ 460 ♀, ≤ 390) | N4 |
| `pr_interval` | ms | `01:V35` | N4 |
| `latidos_irregulares` | beats | proxy for `01:V32`/`01:V33` (counts as 2, C) | N4 |
| `ritmo_irregular_compatible_fa` | 0/1 flag | proxy for `01:V31` | N4 |
| Echo LVEF (`EF`, `feve`, `ejection_fraction`) | % | `01:V18` | N4 |
| `LVSV` | cm³ | `01:V4` | N4 |
| `LVEDV` | cm³ | `01:V17` (partial) | N4 |
| `LAVol` | cm³ | `01:V36` | N4 |

Areas in px², cosine similarities and neighbor fractions **have no team variable**: they are stored, but they do not score.

## 6. Database structure

Schema in [`db.ts`](../Sistema/backend/src/db.ts) and [`salud.ts`](../Sistema/backend/src/salud.ts). SQLite in WAL mode, with `foreign_keys = ON`.

| Table | Key | Main columns |
|---|---|---|
| `variables` | `id` | nombre, descripcion, unidad, tipo_umbral (A/T), procedencia (sensor · derived · estimated · manual · telemetry), actualizada |
| `esquemas` | `id` | nombre, version, campos (JSON), creado |
| `dispositivos` | `id` (u32) | clave (unique), nombre, tipo (suit · wrist · chest · habitat · dosimeter · phone), perfil (eva · json), esquema_id |
| `tripulantes` | `id` | nombre, rol, sexo, edad, peso_kg, altura_m, sangre |
| `asignaciones` | `id` | dispositivo, tripulante, desde, hasta |
| `basales` | (tripulante, variable) | valor |
| `historial` | `id` | tripulante, mision, entorno, variable, delta, escala |
| `priores` | (variable, entorno) | datos (JSON) |
| `fases` | `desde` | entorno |
| `muestras` | `id`; UNIQUE (tripulante, dispositivo, seq, variable, t_scet) | valor, unidad, procedencia, calidad (JSON), metodo, **t_scet** (when it occurred), **t_recibida**, dispositivo, seq, esquema_id, entorno |
| `alertas` | `id` | tripulante, variable, estado, z, valor, esperado, banda, t_scet, creada, enviada_tierra, motivo, umbral (JSON) |
| `referencias` | `variable` | datos (JSON from `medibles.json`) |
| `enlace` | `id = 1` | owlt_s, abierto |
| `bajada` | `id`; UNIQUE (emisor, seq) | tipo, datos, prioridad (0/1/2), t_scet, t_envio, t_ert, emisor, seq, ack, intentos, t_ack |
| `subida` | `id`; UNIQUE (emisor, seq) | de, para, texto, prioridad, tipo (aviso/alerta), datos, t_redactado, t_envio, t_llegada, entregado, … |
| `abordo` | `id` | de, para, texto, nivel, t |
| `emergencias` | `id` | tripulante, modo, causa, disparadores (JSON), t_scet, t_registro, resultado, t_cierre |
| `entrada` | UNIQUE (emisor, seq) | canal, tipo, prioridad, datos, t_evento, t_envio, t_recepcion |
| `enlace_contador`, `enlace_estado` | — | Cursors, ACK and heartbeat of the HTTPS link |
| `padecimientos` | `id` | nombre, riesgo_nasa, descripcion, prevalencia, fuente_prevalencia |
| `padecimiento_variable` | (padecimiento_id, variable_id) | Link columns (§4) |
| `pesos_usuario` | `clave` (`liga|P07|03:V82`, `umbral|T_amarillo`) | tipo, peso, prior_de, valor, modificado_por_usuario, modificado |
| `evaluaciones` | `id` | tripulante, padecimiento_id, color (VERDE/AMARILLO/ROJO/GRIS), hora, canal (`real`/`SIMULADO`), detalle (JSON) |

## 7. Exchange formats of the health prototype

| Format | Columns |
|---|---|
| Common format (`outputs/normalized.csv`) | subject_id, study_id, timestamp, source, model, metric, value, unit, quality, simulated, tipo, run_id, input_file, notes |
| Sensors, long format | subject_id, timestamp, device, variable, value, unit, quality, simulated, metric_detail, notes |
| Native engine CSV | subject_id, timestamp, variable_id, value, unit, device_class, quality, context, method, simulated, notes |

Canonical variables of the sensor importer: heart_rate (bpm) · hrv_rmssd / hrv_sdnn (ms) · spo2 (%) · bp_systolic / bp_diastolic (mmHg) · temp_skin / temp_body (°C) · sleep_duration (h) · sleep_efficiency (%) · steps · active_minutes (min) · symptom (text).

Rule common to all of them: **a missing value is empty (NaN), never 0**. Empty `value` ⇔ `quality` starts with `sin_dato`.

## 8. Real, test and simulated data

| Type | Examples | Labeling |
|---|---|---|
| **Synthetic** | Ana/Luis/Mei/Tomás crew and their baselines; `Simulacion/eva-simulacion.db`; `datos.js`/`demo.js` scenario; `SIM-T01…T05` crew; `SIM-A01`/`SIM-B02` sensors | `simulated=true`, `SIMULADO` channel, “Simulación · datos sintéticos” (“Simulation · synthetic data”) badge |
| **Test** | `PRUEBA-*` rows from the tests; random weights from the loading tests | Never written to `normalized.csv` |
| **Public real** | MIT-BIH / AFDB ECG (hospital patients, ODC-By 1.0); Inspiration4 laboratory results (OSDR); DONKI events | With source and license; **none of them come from our crew** (Inspiration4's do come from spaceflight, but from a civilian crew) |
| **Operational** | `Sistema/backend/eva.db` | No real sensor data to date: the backend does not create them on its own |

## 9. Research catalogs

| File | Rows | Content |
|---|---:|---|
| [`Planeacion/data/variables/VARIABLES-MEDIDAS-ASTRONAUTAS.csv`](../Planeacion/data/variables/VARIABLES-MEDIDAS-ASTRONAUTAS.csv) | 388 | id, variable, sistema, medido_en_astronautas, equipo_o_metodo, experimento_o_requisito_nasa, fuente, fuente_previa, nota |
| [`Planeacion/data/variables/VARIABLES-CARDIOBASCULAR.csv`](../Planeacion/data/variables/VARIABLES-CARDIOBASCULAR.csv) | 77 | Iker's per-variable research sheet (formerly `Planeacion/Iker/iker_variables.csv`): capture method, datasets and licenses, whether in-flight data exist, existing models, threshold source, use in the prototype, limitations and status. See §9.1 |
| [`prototipo-salud/datos/modelo/PADECIMIENTO-VARIABLE.csv`](../prototipo-salud/datos/modelo/PADECIMIENTO-VARIABLE.csv) | **350** | **Source of truth**: used by the engine and the backend |
| [`Planeacion/data/padecimientos/PADECIMIENTO-VARIABLE.csv`](../Planeacion/data/padecimientos/PADECIMIENTO-VARIABLE.csv) | 350 | Identical copy of the source of truth |

> The 350-link matrix includes LVEF (`01:V18`) in P01 and P02. If it is edited, it is edited in `prototipo-salud/datos/modelo/` and copied again.

### 9.1 `VARIABLES-CARDIOBASCULAR.csv`

Per-variable research sheet, prepared by Iker during the research phase. Despite its name, it is not only
cardiovascular: its 77 rows come from three of the team's catalogs.

| Source catalog (`archivo` column) | Rows |
|---|---:|
| 01 · cardiovascular, SANS and radiation | 51 |
| 03 · behavior, sleep and cognition | 22 |
| 04 · immune, environment, equipment and thresholds | 4 |

**Columns.** `archivo`, `id` (identifier within the catalog, e.g. `V31`), `variable`, `unidad`,
`metodo_captura`, `dataset_url`, `licencia`, `formato`, `numero_registros`, `datos_en_vuelo`, `modelo_existente_url`,
`umbral_fuente`, `uso_prototipo`, `limitaciones`, `estado`, `riesgo_hrp`, `recurso_oficial_url`.

**Research status** (`estado` column): 36 with a source found, 26 blocked, 10 pending, 4 with data
downloaded and 1 integrated.

**Relationship with `VARIABLES-MEDIDAS-ASTRONAUTAS.csv`.** All 77 variables also appear in the master catalog (388
rows) with the id prefixed by its catalog (`V31` from catalog 01 is `01:V31`), and there their `fuente_previa` column
says `iker_variables.csv`. The master catalog answers “has it been measured in astronauts, and with what?”; this sheet adds what
is needed to use the variable in software: datasets, licenses, models and limitations.

**Use in the system.** No program reads it directly. It is a cited source: the traceability of the clinical
thresholds ([`medibles.md`](../Sistema/backend/semillas/medibles.en.md)) refers back to its rows.

## Related documentation

- [Computational models and algorithms](README_06_MODELOS_COMPUTACIONALES_ALGORITMOS.en.md)
- [Integration and interoperability](README_05_INTEGRACION_INTEROPERABILIDAD.en.md)
- [Research protocol](README_02_PROTOCOLO_INVESTIGACION.en.md)
- [System architecture](README_04_ARQUITECTURA_SISTEMA.en.md)
