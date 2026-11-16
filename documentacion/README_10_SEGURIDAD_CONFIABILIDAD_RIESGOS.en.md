> 🌐 [Español](README_10_SEGURIDAD_CONFIABILIDAD_RIESGOS.md) · **English**

# 10 · Security, reliability and risk management

This document distinguishes what is **implemented** (with its file) from what is **recommended** (which does not exist in the code). LUNNA is a hackathon prototype: its threat model assumes a trusted local network and operators who know that the data are synthetic.

## 1. Architecture security

### 1.1 Implemented measures

| Measure | Where | What it protects against |
|---|---|---|
| Custom formula interpreter, **without `eval`**, that rejects anything other than arithmetic, allowed functions and frame keys; the formula is validated on save | [`formula.ts`](../Sistema/backend/src/formula.ts) | Code injection via schemas |
| Confined static file server: resolves the path and requires it to remain inside the root folder; rejects `\0` and badly encoded paths | `servirArchivo` in [`servidor.ts`](../Sistema/backend/src/servidor.ts) | Directory traversal (`../`) |
| Allowlist of served folders (`eva`, `reloj`) | `INTERFACES` in `servidor.ts` | Exposure of the rest of the repository |
| 5 MB request body limit (413) | `cuerpo()` in `servidor.ts` | Memory exhaustion from large requests |
| Parameterized SQL queries (`prepare(...).run(?)`) | Entire backend | SQL injection |
| Input validation: u32 device id, allowed environments, τ₀ and σ > 0, prior with `fuente`, variables registered in schemas | Routes in `servidor.ts` | Invalid configuration data |
| Operational mode that blocks the simulator, scenario and reset (404/403) | `servidor.ts` | Mixing synthetic data with operational data |
| Separate databases per mode | Startup of `servidor.ts` | Contamination of the operational database |
| TLS on the spacecraft → Earth link (server side), verified against the configured CA | [`enlace-https.ts`](../Sistema/backend/src/enlace-https.ts), [`rol.ts`](../Sistema/backend/src/rol.ts) | Eavesdropping on and tampering with the link in transit |
| Batch integrity with `x-eva-sha256`; on mismatch, 422 and nothing is applied | `sincro.ts` / `enlace-https.ts` | Corrupt batches |
| Keys kept out of git (`certs/` ignored) | `.gitignore` | Publication of keys |
| Prototype: the scripts never request or use tokens; only public model weights are downloaded | `scripts/descargar_pesos.ps1` | Credential leakage |
| EchoNet-Dynamic weights loaded with `weights_only=True` and minimal `safe_globals`; `weights_only=False` only with the official name and exact size | `adapters/echonet_dynamic/infer.py` | Code execution via `pickle` files |

### 1.2 What does **not** exist

| Aspect | Status |
|---|---|
| User authentication | **None.** No route requires credentials |
| Role-based authorization (crew member, CMO, Earth) | **None in the backend.** Role-based privacy is enforced only by the interface; anyone with network access can read `/api/app/:tripulante` |
| Authentication of the spacecraft to Earth | **None.** `x-eva-emisor` is informational, not a credential. Server-side TLS only, no mutual TLS |
| CORS | Open (`Access-Control-Allow-Origin: *`) |
| Encryption at rest | **None.** `eva.db` and the role databases are stored in plaintext |
| Encryption of the simulated link and of BLE | None. The EVA BLE profile does not declare secure pairing, and the frame has no CRC, FEC or signature |
| Rate limits | None |
| Certificate rotation | None; the certificate is a self-signed development certificate |
| Access audit log | None (there is an activity log in the terminal) |

## 2. Secure communication

- **Local HTTP** (port 8787) for the interfaces, gateway and API. It does not use TLS.
- **HTTPS** (port 8443) only between spacecraft and Earth, with `npm run certs`, `npm run tierra` and `npm run nave`. It serves to demonstrate the transport, not as a production configuration.
- **SSE** over the same local HTTP.
- **BLE** between smart shirt or cuff and gateway, with no documented security layer of its own.

## 3. Information protection

- The demo crew is **fictional** and the demo data are **synthetic**. The real data contained in the repository are public (PhysioNet, OSDR, DONKI) and carry their own licenses.
- The interface applies the privacy matrix in ERS §6.5:
  - the CMO sees the mood trend;
  - Earth sees the score and a daily summary;
  - the journal and the menstrual cycle, only with permission.

  **It is a presentation control, not an access control.**
- Because these are health data, a real implementation would require consent, least privilege, encryption and auditing, aspects outside the scope of the prototype (see the training note in the consolidated README).

## 4. Data integrity

| Mechanism | Detail |
|---|---|
| Ingestion idempotency | `UNIQUE (tripulante, dispositivo, seq, variable, t_scet)`: a resend does not create duplicates |
| Attribution by time-bounded assignment | The crew member's identity is not carried in the frame; reused suits do not attribute data to another person |
| Versioned schemas | Editing creates a new id; old frames are still decoded with their own |
| Dual timestamps | `t_scet` (when it happened) versus `t_recibida` / `t_ert` (when it arrived) |
| Exactly-once spacecraft ↔ Earth | Monotonic `(emisor, seq)` and `UNIQUE` in `entrada`; transactional application; cumulative and selective ACK |
| Immutable pre-flight baseline (engine) | An attempt to rewrite it is rejected and logged (invariant e.1.1) |
| Separate real / SIMULATED channels | The real channel rejects and logs any simulated point |
| Missing ≠ 0 | In all formats, a missing value is empty with reason `sin_dato` |
| Traceability of model runs | `outputs/raw/<run_id>/` with request, response, logs, sha256 of the inputs and checkpoint |

## 5. Error and disconnection handling

| Situation | Implemented behavior |
|---|---|
| Backend down (gateway) | Local queue of up to 50,000 frames; retries with increasing backoff, with no data loss |
| Backend down (interfaces) | “No connection to the backend”, retry every 5 s; the watch reverts to the simulated value after 20 s and indicates so |
| Earth window closed | *Store-and-forward*: packets wait; priority is preserved (0 red, 1 amber, 2 everything else) |
| HTTPS link down | Immediate DISCONNECTED status and exponential *backoff* with *jitter*; anything unacknowledged is re-included. Detection latency ≤ `PING_S` + `TIMEOUT_S` |
| Port in use | Clear message and exit (`EADDRINUSE`) |
| Missing or invalid clinical references | A notice is issued and execution continues without new thresholds |
| Missing or malformed health CSVs | A notice is issued; transaction with `ROLLBACK` |
| Old databases | Additive migrations (`ALTER TABLE … ADD COLUMN`) on open |
| Model that exceeds its time limit | The runner applies the manifest's `timeout_s` |

## 6. Continuity, backup and recovery

**Implemented:**
- SQLite in WAL mode with `busy_timeout = 5000`.
- Idempotent seeds: the minimum configuration is restored at startup.
- `POST /api/demo/reiniciar`, only in simulation, empties the mission and keeps the configuration.

**Not implemented** (recommendations):
- scheduled backups;
- replication or high availability;
- a documented recovery procedure.

To back up manually, stop the backend and copy `eva.db` together with `eva.db-wal` and `eva.db-shm` (or let the shutdown consolidate them). **Do not move the database while the backend is writing.**

## 7. Risks

### 7.1 Technological risks

| Risk | Probability / impact | Current control | Recommendation |
|---|---|---|---|
| Unauthorized access to health data on the network | High if exposed / high | None (local only) | Authentication, role-based authorization, TLS on 8787, restricted CORS |
| Spoofing of the spacecraft toward Earth | Medium / high | None | Mutual TLS or batch signing |
| Forged or tampered BLE frames | Medium / high | None | Secure pairing, MAC or signature in the frame |
| Loss of BLE notifications | Medium / medium | `seq` detects gaps | Gap recovery mechanism |
| Divergence between copies of the code | Medium / medium | Single active codebase in `Sistema/` (Nov 15 integration) | Make changes only in `Sistema/`; search for conflict markers before each commit (`git grep -n '^<<<<<<< '`) |
| Execution of child processes from the API (engine and models) | Medium / high if exposed | The file must be a name from the sample list (no paths, no `..`, no links that lead outside); timeout plus a margin that terminates the process tree; one job at a time per model | Restrict these routes to the CMO once authentication exists |
| Dependency on a specific Python version (3.13) | Medium / medium | Installation scripts | Pin the version and check it in `verificar.py` |
| Licenses of the echocardiography model weights | — / medium | Local, non-commercial use | Do not redistribute the weights |
| SQLite corruption when copying it | Low / high | WAL | Copy with the backend stopped or with `VACUUM INTO` |

### 7.2 Risks of physiological information processing

| Risk | Current control |
|---|---|
| Taking an alert or a color as a diagnosis | Texts “not a diagnosis”, “review by the flight surgeon is recommended”, no percentages |
| False reassurance (GREEN with poor data) | GRAY if coverage is < 0.5 or the core is missing; an N4 negative does not support GREEN |
| Learning an anomaly as normal | Frozen calibration (LUNNA, 14 days); immutable pre-flight baseline, 72-h quarantine and capped EWMA (engine) |
| Unreliable sensors (wrist SpO₂, cuffless) | Levels N2/N4; notice that wrist SpO₂ overestimates in hypoxemia |
| Terrestrial thresholds in space | [T] label; expected in-flight changes are modeled in the priors |
| A value equal to the threshold does not trigger | Documented; pending resolution |
| Mixing simulated and real data | Separate channels and databases; visual badges |
| Unvalidated model outputs | N4: they never produce RED on their own nor update baselines |
| DONKI event mistaken for personal dose | Labeled as simulation |

## 8. System limitations

- It is not a medical device, it has no certification and it has no clinical validation.
- It has no radiation tolerance, deterministic real-time operation or hardware redundancy.
- There is only one spacecraft and one Earth. Resumption is per batch, not per byte.
- The firmware has not been tested on a board. BLE has not been verified end to end.
- The interfaces still largely render a synthetic scenario.
- See also the limitations of the [models](README_06_MODELOS_COMPUTACIONALES_ALGORITMOS.en.md#7-limitations) and of the [validation](README_08_PRUEBAS_VALIDACION.en.md#6-limitations).

## 9. Considerations for EVA environments

In this document, “EVA” is the name of the system. For an **extravehicular activity**, the engine accounts for the following, without a sensor implementation:

- **P10** (decompression sickness after EVA): it remains at level C and the Conkin model is **inactive**, because EVA time, prebreathe, suit pressure and ambulation are missing;
- the **`eva` context**, which is treated as an episode and blocks learning for that day.

The backend has no integration with real suits or life support systems. Any use in an EVA would require certified hardware, validation of the link under flight conditions and official medical protocols.

## 10. Improvement recommendations (not implemented)

1. Authentication and role-based authorization in the backend, with the privacy matrix enforced on the server side.
2. TLS on port 8787 as well, and CORS limited to the interfaces' origin.
3. Mutual TLS or batch signing between spacecraft and Earth; certificate rotation.
4. CRC or MAC in the EVA frame and secure BLE pairing.
5. Encryption at rest of the databases, and scheduled, verified backups.
6. Rate limits and an audit log.
7. Resolve whether threshold comparison is inclusive or strict.
8. Measure the false alarm rate with realistic noise and validate with analog or flight data.

## Related documentation

- [System architecture](README_04_ARQUITECTURA_SISTEMA.en.md)
- [Integration and interoperability](README_05_INTEGRACION_INTEROPERABILIDAD.en.md)
- [Testing and validation](README_08_PRUEBAS_VALIDACION.en.md)
- [General planning](README_01_PLANEACION.en.md)
