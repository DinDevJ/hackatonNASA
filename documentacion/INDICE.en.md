> 🌐 [Español](INDICE.md) · **English**

# EVA / LUNNA technical documentation

Modular documentation for the **EVA / LUNNA** project, health monitoring for space missions by team Monarcas (NASA Space Apps Challenge 2026). Each document covers one area and can be read on its own. All of them describe the same system and link to one another.

> LUNNA is an educational and research prototype. It is not a medical device, it does not diagnose, and it is not validated for clinical use or for use in astronauts. The demonstration crew is fictional and the demo data are synthetic.

## Documents

| # | Document | Contents | Audience |
|---|---|---|---|
| 01 | [General planning](README_01_PLANEACION.en.md) | Description, problem statement, objectives, scope, requirements, stages, deliverables, resources, risks and **repository status** | All readers |
| 02 | [Research protocol](README_02_PROTOCOLO_INVESTIGACION.en.md) | Problem, questions, framework, methodology, variables, sources, procedures, criteria and limitations; separates rationale, method and results | Research, evaluators |
| 03 | [User manual](README_03_MANUAL_USUARIO.en.md) | Screens, navigation, interpreting states and alerts, procedures, errors | Demo users |
| 04 | [System architecture](README_04_ARQUITECTURA_SISTEMA.en.md) | Components, layers, modes and roles, database, APIs, flow and dependencies (Mermaid diagrams) | Developers |
| 05 | [Integration and interoperability](README_05_INTEGRACION_INTEROPERABILIDAD.en.md) | Binary EVA profile, BLE, JSON contract, endpoint catalog, SSE, link with Earth, bridge to the Python engine | Developers, hardware |
| 06 | [Computational models and algorithms](README_06_MODELOS_COMPUTACIONALES_ALGORITMOS.en.md) | Bayesian LUNNA, browser engine, per-condition index, 20-condition engine, ECG, echo models and their actual status | Research, developers |
| 07 | [Data and variable dictionary](README_07_DICCIONARIO_DATOS_VARIABLES.en.md) | Variables, units, thresholds, priors, conditions and links, SQLite tables, formats, real/simulated data | All technical readers |
| 08 | [Testing and validation](README_08_PRUEBAS_VALIDACION.en.md) | Suites and results, ECG and echo evaluation, engine with simulated data, Inspiration4, pending items; technical, experimental and clinical validation | Quality, evaluators |
| 09 | [Installation, configuration and deployment](README_09_INSTALACION_CONFIGURACION_DESPLIEGUE.en.md) | Requirements, actual commands, environment variables, ports, verification and troubleshooting | Developers |
| 10 | [Security, reliability and risks](README_10_SEGURIDAD_CONFIABILIDAD_RIESGOS.en.md) | Implemented and missing measures, integrity, disconnections, backup, risks and recommendations | Developers, evaluators |

## Recommended reading order

1. **To understand the project:** 01 → 02 → 04.
2. **To use the demo:** 09 (§3.1) → 03.
3. **To develop or integrate:** 04 → 05 → 07 → 09.
4. **To assess the scientific rigor:** 02 → 06 → 07 → 08 → 10.

## Sources of this documentation

This folder was built from the consolidated README of the health prototype
([`prototipo-salud/README.md`](../prototipo-salud/README.en.md)), from the planning, protocol and manual drafts
(now integrated here and preserved in the git history) and from the code in `Sistema/`, `Simulacion/` and
`prototipo-salud/`, checked file by file.

Where the earlier documentation and the code disagree, **the code that actually runs prevails** (`Sistema/`), and the
discrepancy is noted in the corresponding document.

To get started: [README](../README.en.md) and [ONBOARDING](../ONBOARDING.en.md) at the root of the repository. Traceability of
each clinical threshold: [`Sistema/backend/semillas/medibles.md`](../Sistema/backend/semillas/medibles.en.md).

Revised: November 15, 2026.
