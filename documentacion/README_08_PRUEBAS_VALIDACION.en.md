> 🌐 [Español](README_08_PRUEBAS_VALIDACION.md) · **English**

# 08 · Testing and validation

## 1. Three levels that must not be confused

| Level | Question | Status in LUNNA |
|---|---|---|
| **1. Technical validation of the software** | Does the code do what it specifies? | Automated suites in the backend, simulation, interfaces and health prototype. Mostly passing (§3) |
| **2. Experimental evaluation of the algorithms** | With what performance do they detect what they are looking for, on labeled data? | Partial: ECG on 4 public PhysioNet records; engine on Inspiration4 (n = 4); synthetic scenarios written on purpose |
| **3. Clinical validation** | Is it safe and useful in people, and in astronauts in particular? | **Does not exist.** There is no clinical, prospective or in-flight study of any kind |

> **LUNNA is not clinically validated.** No result in this document should be read as evidence of diagnostic efficacy.

## 2. Testing strategy

- **Unit and integration tests** with Node's built-in test runner (`node --test`), with no dependencies. Databases are temporary or in-memory, and servers use an ephemeral port.
- **API tests** that start the real HTTP server and verify the response shapes consumed by the interfaces.
- **Shared vectors** across TypeScript, Python and C++ for the EVA profile.
- **pytest** in the health prototype, with Streamlit's `AppTest` for the views.
- **Simulated scenarios** with injected anomalies, all labeled `simulated=true`.
- **Manual verification** in a browser (headless Edge via CDP) during the reorganization of November 15, 2026.

## 3. Automated tests and results

### 3.1 Run on Nov 15, 2026 on Windows 11, Node 22.6+

| Suite | Command | Tests | Passed | Skipped | Failed |
|---|---|---:|---:|---:|---:|
| Backend | `cd Sistema/backend` and then `npm test` | 97 | 85 | 12 | 0 |
| Simulation mode | `cd Simulacion` and then `npm test` | 4 | 4 | 0 | 0 |
| Browser engine and normal value | `node --test Sistema/interfaces/eva/motor.test.mjs Sistema/interfaces/eva/alertas-motor.test.mjs` | 25 | 25 | 0 | 0 |
| Health prototype | `python -m pytest` in `prototipo-salud/` (without `test_paginas.py`, which requires Streamlit) | 148 | 131 | 11 | 6 |

They were also run on Nov 15, 2026 on Linux (Node 24.22.1), on the current `main`:

| Suite | Command | Tests | Passed | Skipped | Failed |
|---|---|---:|---:|---:|---:|
| Backend | `cd Sistema/backend` and then `npm test` | 97 | 97 | 0 | 0 |
| Browser engine and normal value | `node --test Sistema/interfaces/eva/motor.test.mjs Sistema/interfaces/eva/alertas-motor.test.mjs` | 25 | 25 | 0 | 0 |

In this environment openssl and the prototype's Python were available, so none of the 12 tests that are skipped on Windows was skipped. The backend suite was not rerun on Windows in this revision.

Skipped in the backend (Windows), and why:

- 8 from `enlace-https.test.ts`: they need openssl to generate the test certificate;
- 4 integration tests with the real Python engine and ECG: they look for the Linux test environments in `/tmp/nasa-linux-envs`.

The 6 failures in the prototype come from this machine's environment, not from the code:

- the videos in `samples/` are missing; they are downloaded with `preparar_muestras.ps1`;
- `opencv` (`cv2`) is missing;
- a byte-by-byte comparison of a regenerated example changes because of Windows CRLF line endings.

In `envs\app` (`instalar_app.ps1`) these dependencies are installed.

### 3.2 Contents of the backend suites

| File | Covers |
|---|---|
| [`unidad.test.ts`](../Sistema/backend/test/unidad.test.ts) | Safe formulas, encode/decode, LUNNA model |
| [`integracion.test.ts`](../Sistema/backend/test/integracion.test.ts) | End-to-end ingestion, assignments, deduplication, alerts |
| [`umbrales.test.ts`](../Sistema/backend/test/umbrales.test.ts) | Absolute thresholds, `personal`/`umbral`/`ambos` reason |
| [`abordo.test.ts`](../Sistema/backend/test/abordo.test.ts) | CMO notices, queries, emergencies |
| [`sincro.test.ts`](../Sistema/backend/test/sincro.test.ts) | Exactly-once: duplicates, lost ACKs, ordering |
| [`enlace-https.test.ts`](../Sistema/backend/test/enlace-https.test.ts) | Disconnection mid-batch, duplicate resend, ACK loss, sha256 (requires openssl) |
| [`salud.test.ts`](../Sistema/backend/test/salud.test.ts) | Condition tables seeded from CSV |
| [`central.test.ts`](../Sistema/backend/test/central.test.ts) | Central computer resources, API shapes, watch at `/interfaces/reloj/`, `/maquetas` compatibility, operational mode (404/403, no scenario), invalid mode |
| [`semaforo.test.ts`](../Sistema/backend/test/semaforo.test.ts) | Traffic light API, user weights and restore, engine execution (with a fake Python and, if available, with the real one) |
| [`referencias-motor.test.ts`](../Sistema/backend/test/referencias-motor.test.ts) | Normal value per variable from the latest evaluation |
| [`modelos.test.ts`](../Sistema/backend/test/modelos.test.ts) | Job queue, file validation (no paths or `..`), timeout, bridge and re-evaluation with [`fixtures/python-falso.mjs`](../Sistema/backend/test/fixtures/python-falso.mjs) |

[`Simulacion/test/simulador.test.ts`](../Simulacion/test/simulador.test.ts) suite: simulator URLs (including the shared panel), scenario at `/app/escenario/`, demo reset and end-to-end generator.

### 3.3 Hardware communication

| Test | Command | Status |
|---|---|---|
| Gateway produces the same bytes as the backend | `python Sistema/pasarela/test_trama.py` | Passed in the Nov 15 reorganization |
| C++ firmware against vectors | `Sistema/esp32/test/test_trama.cpp` | **Not run here** (g++ missing). The vectors are generated with `test/generar_vectores.ts` |
| Firmware on a real board | — | **Not tested** |
| End-to-end BLE | — | **Not tested** |

### 3.4 Health prototype (pytest)

| Source | Result |
|---|---|
| Team progress log (Linux, Nov 15, ~01:10) | **98 passed, 5 skipped** (43 earlier + 55 from the engine) |
| This machine (Windows, Nov 15, after the integration) | **131 passed, 11 skipped, 6 environment failures** (§3.1) |

> **Error fixed on Nov 15.** An earlier merge (PR #7, “valor-normal”) had left committed conflict markers in `motor/normalizacion.py`, `motor/evadb.py` and `Planeacion/Leo/modelo-pesos/generar_pesos.py`. Because of this, the Python engine could not be imported and the whole suite failed. They were resolved by keeping the new paths (`Sistema/backend`) and the PR's functions (ECG in `eva.db`, breakdown of links and references in `evaluaciones`). In addition, three tests (`test_evadb`, `test_motor_eco`, `test_puente_modelos`) were pointed back to `Sistema/backend`; previously they were silently skipped because they looked for a folder that no longer exists.

Areas covered by the suite, by file:

- quality and import (`test_motor_entradas`, `test_sensores`);
- arithmetic of d.7 and of the score (`test_motor_score`);
- traffic light and hysteresis (`test_motor_semaforo`);
- frozen baseline, quarantine and not learning from alerted points (`test_motor_calibracion`);
- simulated never treated as real (`test_motor_simulado`);
- overrides (`test_motor_overrides*`);
- crew (`test_motor_tripulacion`);
- echo LVEF and discordance (`test_motor_eco`);
- bridge with `eva.db` (`test_evadb`), which runs `Sistema/backend/src/migrar.ts`;
- model bridge (`test_puente_modelos`);
- ECG (`test_ecg`);
- views with `AppTest` (`test_paginas`);
- Inspiration4 (`test_validacion_i4`);
- `verificar.py` (`test_verificacion`).

## 4. Experimental evaluation of algorithms

### 4.1 ECG processing

**Data:** complete records MIT-BIH Arrhythmia 100, 201, 203 and MIT-BIH AF 04015 (PhysioNet, ODC-By 1.0, hospital patients). **Environment:** Linux, CPU, Python 3.11 with the lock versions.

The figures in the table were already in this document and in [`prototipo-salud/README.md`](../prototipo-salud/README.en.md). A report at `validacion/ecg/VALIDACION.md` used to be cited. That file was searched for across the entire git history (`git log --all --full-history -- '**/VALIDACION.md' 'validacion/ecg/VALIDACION.md'` and `git rev-list --all --objects`) and **it is not, and never was, in the repository**. Pending: the report is not in the repository. No content that is not already in the repo is reproduced here. Nor are `validacion/ecg/runs/`, `validacion_por_registro.csv`, `validacion/ecg/v1_resumen.json` or `validacion/ecg/captura_ecg.png` in the repo.

| Metric | 100 | 201 | 203 | 04015 |
|---|---:|---:|---:|---:|
| R peaks, sensitivity (±150 ms) | 0.9987 | 1.0000 | 0.9191 | — |
| R peaks, PPV | 1.0000 | 0.9718 | 0.9892 | — |
| Irregular beats (RR criterion), sensitivity | 0.882 | 0.595 | 0.425 | — |
| Irregular beats, PPV | 1.000 | 0.450 | 0.234 | — |
| Per-segment flag vs `(AFIB`, sensitivity | — | 1.000 | 1.000 | 1.000 |
| Per-segment flag, specificity | 1.000 | 0.054 | 0.000 | 0.904 |

**Interpretation.** The flag detects **RR irregularity, not AF**: in 201 and 203 it flags premature beats and trigeminy. PR and QTc **are not validated**, because there are no labels to compare them against. Version v2 was chosen after looking at v1 on these same records, so **it is not an independent validation**.

#### Functional test on Iker's PC (Windows, Nov 15, 2026)

This is a **functional test** of the bridge and of the central computer's queue, not a validation of the algorithm: there are no labels or detection metrics in this run.

It was launched from the central computer with `POST /api/modelos/analizar` and the `motor.puente_modelos` bridge, with the SIMULATED label, on Windows and CPU:

| Record | Result |
|---|---|
| `ecg_fa_afdb04015.hea` | `run_id` `20261115T151349_ecg_8257012a`, status `ok`, `inferencia_real` true, device `cpu`, heart rate 117.5 bpm (04:A4), saved for crew member `ana` |
| `ecg_normal_mitdb100.hea` (earlier test) | `run_model` finished successfully in 12.4 s on CPU; the bridge failed with `No module named 'motor'` because `PROTOTIPO_DIR` pointed to an old copy without `motor/`. It was fixed by pointing it to the repository's `prototipo-salud` |

### 4.2 Echocardiography

| Test | Result |
|---|---|
| Loading test of the 5 adapters (architecture without weights and random tensor) | Passed on Linux/CPU; **it is not inference** |
| Rejections by modality and view (non-A4C, Doppler, no box in MedSAM2, 3D volume, PNG as video) | Passed |
| Real PanEcho inference (Iker's PC, Windows, RTX 4050) | CPU 42.8 s → CUDA 17.4 s (run `20261114T105021_panecho_c753f120`). Reported by Iker; the run is not in this repository |
| EchoNet-Dynamic, MedSAM2, EchoPrime, EchoCLIP | **Real inference pending** |

There is no clinical reference to compare any echo output against.

### 4.3 Condition engine with simulated data (arm 2 of the specification)

Scenarios with an expected outcome (specification h.2):

| # | Scenario | Expected |
|---|---|---|
| 1 | Everything within the baseline, full coverage | GREEN |
| 2 | The core is missing | GRAY, not GREEN |
| 3 | `sin_dato` | Missing, never 0 |
| 4 | Abrupt jump | Alert; the adaptive mean does not change |
| 5 | Slow ramp | CUSUM; baseline intact |
| 6 | N4 data point | Does not update, does not give RED, does not support GREEN |
| 7 | Attempt to rewrite the pre-flight baseline | Rejected and logged |
| 8 | Points within the quarantine | Excluded retroactively |
| 10 | The whole crew deviates at the same time | “Shared deviation”; no individual alert is switched off |
| 13 | LVEF discordant between models | Does not activate |
| 14 | Simulated data mixed with real data | The real traffic light does not change |

Scenarios 9, 11 and 12 (phase change, crew of 3, incomplete fixed layer) are also specified.

Simulated crew `SIM-T01…T05`, 30 days, with one scenario per person:

| Person | Scenario |
|---|---|
| SIM-T01 | Control |
| SIM-T02 | Abrupt jump |
| SIM-T03 | Sleep ramp |
| SIM-T04 | Missing data |
| SIM-T05 | N4 data |
| All | Shared CO₂ excursion |

With the 7 runs in `validacion/ecg/runs` (real channel, read-only), the AF sample gives P01 **YELLOW “confirm” and never RED**, because everything is N4. Those runs are cited in [`prototipo-salud/README.md`](../prototipo-salud/README.en.md); **they are not in the repository** (same pending item as the report in §4.1).

#### Reproducible example of personal self-calibration (“learns”)

Run on Nov 15, 2026: `cd prototipo-salud && python3 -m validacion.ejemplo_aprende`. **SIMULATED** data (not real astronauts). This is not training a network: it is per-person statistics. PROVISIONAL. It is not a diagnosis. The same value, a sleeping HR of 85 bpm on flight day 5, is read differently depending on each person's pre-flight baseline (14 nights, 30-year-old men, seed 0):

| Crew member | Pre-flight baseline | Population z (NHANES) | Personal z | Status |
|---|---|---:|---:|---|
| SIM-A | 58.1 ± 2.9 bpm | 1.32 | 9.17 | alerted |
| SIM-B | 83.6 ± 3.3 bpm | 1.32 | 0.43 | normal |

As pre-flight nights accumulate (output of the same command):

| n | SIM-A (baseline, z, status) | SIM-B (baseline, z, status) | Origin of s_w |
|---:|---|---|---|
| 2 | 54.0 ± 5.1 · z 6.08 · alerted | 79.9 ± 5.1 · z 1.00 · normal | pooled across the crew [P·S5]; B = 0.07 |
| 3 | 55.2 ± 4.6 · z 6.49 · alerted | 81.4 ± 4.6 · z 0.79 · normal | pooled across the crew [P·S5]; B = 0.04 |
| 5 | 54.8 ± 4.2 · z 7.27 · alerted | 83.5 ± 3.3 · z 0.44 · normal | own (n0 ≥ 5); B = 0.02 / 0.01 |
| 7 | 55.9 ± 4.4 · z 6.60 · alerted | 84.0 ± 3.8 · z 0.26 · normal | own (n0 ≥ 5); B = 0.02 / 0.01 |
| 14 | 58.1 ± 2.9 · z 9.17 · alerted | 83.6 ± 3.3 · z 0.43 · normal | own (n0 ≥ 5); B = 0.00 / 0.01 |

The specification of this self-calibration is in [models §4.3](README_06_MODELOS_COMPUTACIONALES_ALGORITMOS.en.md).

### 4.4 Inspiration4 (NASA OSDR, open real data)

| Configuration | Result |
|---|---|
| Default (n0_min = 5) | **80/80 cells GRAY**: 3 pre-flight draws are not enough for a personal baseline; the engine refuses to assign a color |
| Sensitivity n0_min = 3 | At R+1: potassium ↓ (C002 z −3.5; C003 z −2.4, with 3.0 mmol/L below the laboratory range) and leukocytes ↓ in C003. No RED; P17 YELLOW in C004 at R+194 |
| Baseline completed with SIMULATED filler | No RED with any seed; the z values change a lot between seeds. **It is not validation** |

Agreement with Jones et al. 2024 and Kim et al. 2024 (almost everything returns to baseline): only through the **absence of alerts**, with n = 4, no in-flight data and no vital signs.

Questionable value in the source: C003 L-92 (platelets 12.9, neutrophils 10.1). A unit error is likely, and the quality gate does not reject it.

### 4.5 Synthetic backend scenario

4 crew members, 7 variables, 119 days and 6,188 binary frames. Result: 2 alerts, both true (Ana's fatigue, amber on day 111 and red on day 112, z = 3.34) and no false ones in the rest. **The scenario was written on purpose**: it demonstrates the pipeline, not the accuracy of the model.

## 5. Errors identified and fixed

| Error | Fix | Verification |
|---|---|---|
| torch cu124 replaced by torch 2.15.0+cpu when installing the locks | `scripts/torch-cu124-overrides.txt`, `--no-deps --override`, `Repair-TorchCuda`, `reparar_torch.ps1` | `uv pip compile` resolves cu124; PanEcho on CUDA on Iker's PC |
| EchoNet-Dynamic: `UnpicklingError` (`numpy.core.multiarray.scalar`) | `weights_only=True` with `safe_globals`; fallback verified by exact size | With random weights on Linux; **pending with real weights** |
| v1 of the AF flag with poor specificity | v2 based on Dash 2009 | Not independent (§4.1) |
| Experimental QTc can give YELLOW on a normal record (mitdb 100: 335 ms) | Documented as a known limitation | — |

## 6. Limitations

- The false-alarm rate has not been measured: the noise in the simulated set is bounded on purpose.
- The PowerShell tests only check that the `.ps1` files can be parsed (pwsh 7 on Linux); **they were not tested on Windows PowerShell 5.1**.
- There are no load, performance or concurrency tests of the backend.
- There are no security tests (see [security](README_10_SEGURIDAD_CONFIABILIDAD_RIESGOS.en.md)).
- The interfaces have no automated UI tests, except `central.test.ts` (resources and API shapes), `motor.test.mjs` and `alertas-motor.test.mjs`.

## 7. Pending validation

1. Rerun on Windows the 8 HTTPS link tests (openssl) and the 4 integration tests with the real Python environments. On Nov 15, 2026, on Linux, all 12 were among the 97 that passed.
2. The full pytest suite on Windows with `envs\app` (including `test_paginas.py`).
3. Real inference of EchoNet-Dynamic, MedSAM2, EchoPrime and EchoCLIP with weights and CUDA, and run times against the timeout (1,800 s; EchoPrime 3,600 s).
4. The firmware on an ESP32 board, and end-to-end BLE.
5. The rhythm flag on PhysioNet records **not used** to choose v2.
6. PR and QTc against a database with wave annotations.
7. Any evaluation with flight or analog data.
8. Add to the repository the ECG report cited as `validacion/ecg/VALIDACION.md`, if it exists outside git.

## Related documentation

- [Computational models and algorithms](README_06_MODELOS_COMPUTACIONALES_ALGORITMOS.en.md)
- [Research protocol](README_02_PROTOCOLO_INVESTIGACION.en.md)
- [Installation, configuration and deployment](README_09_INSTALACION_CONFIGURACION_DESPLIEGUE.en.md)
- [Security, reliability and risks](README_10_SEGURIDAD_CONFIABILIDAD_RIESGOS.en.md)
