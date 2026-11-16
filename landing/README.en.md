> 🌐 [Español](README.md) · **English**

# Lunna landing page

A presentation page with one section per screen (scrolling snaps from one to the next) and an animated galactic
background (`recursos/cosmos.js`: stars, nebulae, a galaxy, planets and a satellite; with “reduce motion” it stays still).
It combines the per-device landing page with the sections of Iker's landing page (branch `landing-iker`):

1. **The three devices at a glance:** central computer, phone and watch, with their real interfaces running live.
2. **Videos:** the official one (plays on its own, muted and looping, with sound and pause buttons) and the product
   video, plus the **Probar la simulación** button (*Try the simulation* in English).
3. **The same reading, two people:** 85 bpm that is an alert for one person and normal for another.
4. **LUNNA, mathematically:** the Bayesian update with an interactive example (real systolic-pressure prior).
5. **Two alert criteria** (personal and clinical threshold) and why calibration freezes.
6. **The traffic light for 20 conditions**, its four colors and the NASA risk behind each one.
7. **Prediction models:** LUNNA, shrunk pre-flight baseline, EWMA, CUSUM, traffic light and ECG/echo models.
8. **What runs today and what is missing** in the ECG and echo models.
9. **Validation:** three levels, Inspiration4, automated tests and what is not verified.
10. **Gallery** of the team during the hackathon.
11. Evidence and team, with each member's GitHub profile.

The formulas are in MathML (no libraries). The drift chart uses illustrative data and is labeled as such.

## Source of every figure

| Figure on the page | Source in the repository |
|---|---|
| 85 bpm; SIM-A 58.1 ± 2.9 → z 9.17; SIM-B 83.6 ± 3.3 → z 0.43; population z 1.32 (SIMULATED) | `prototipo-salud/validacion/ejemplo_aprende.py`; [`documentacion/README_06…`](../documentacion/README_06_MODELOS_COMPUTACIONALES_ALGORITMOS.en.md) §4.3 |
| Systolic-pressure prior in orbit: μ₀ = −6.7%, τ₀ = 5%, σ_mission = 3%, σ_day = 5% | `Sistema/backend/semillas/inicial.json` (`priores_orbita`, variable `01:V1`) |
| LUNNA formulas (per-layer precision, μ, τ², 95% band, z, P(noise)) | `Sistema/backend/src/lunna.ts` |
| 24 h median (personal criterion) and median of 5 readings in 10 min (threshold) | `Sistema/backend/src/ingesta.ts` |
| Pre-flight baseline with at least 5 measurements (Coskun 2021), EWMA α = 0.1, ±1.5 SD cap, 72 h quarantine, CUSUM k = 0.5 and h = 5 | [`documentacion/README_06…`](../documentacion/README_06_MODELOS_COMPUTACIONALES_ALGORITMOS.en.md) §4.3 · `prototipo-salud/motor/calibracion.py` |
| 20 conditions and their NASA risk; GREEN / YELLOW / RED / GRAY rules | `prototipo-salud/datos/modelo/PADECIMIENTOS.csv`; [`documentacion/README_06…`](../documentacion/README_06_MODELOS_COMPUTACIONALES_ALGORITMOS.en.md) §4.4–4.5 |
| 350 links; evidence 9 A · 31 B · 310 C; weights 1 to 3 | `prototipo-salud/datos/modelo/PADECIMIENTO-VARIABLE.csv`; [`documentacion/README_07…`](../documentacion/README_07_DICCIONARIO_DATOS_VARIABLES.en.md) |
| ECG: sensitivity 0.9987 / 1.0000 / 0.9191 and PPV 1.0000 / 0.9718 / 0.9892 (MIT-BIH 100, 201, 203); PanEcho 42.8 s CPU and 17.4 s CUDA; four other models pending; echo weights ≈ 6.3 GB | [`documentacion/README_08…`](../documentacion/README_08_PRUEBAS_VALIDACION.en.md) §4.1–4.2; [`README_06…`](../documentacion/README_06_MODELOS_COMPUTACIONALES_ALGORITMOS.en.md) §6 |
| Three levels of validation | [`documentacion/README_08…`](../documentacion/README_08_PRUEBAS_VALIDACION.en.md) §1 |
| Inspiration4: 4 civilians, 278 rows, 80/80 GRAY; C002 z −3.5 and C003 z −2.4 with 3 measurements | [`documentacion/README_02…`](../documentacion/README_02_PROTOCOLO_INVESTIGACION.en.md) §8; [`README_08…`](../documentacion/README_08_PRUEBAS_VALIDACION.en.md) §4.4 |
| Tests: backend 97 (Linux 97 passed; Windows 85 + 12 skipped); simulation 4/4; browser 25/25; pytest 148 (131 + 11 + 6 environment) | [`documentacion/README_08…`](../documentacion/README_08_PRUEBAS_VALIDACION.en.md) §3.1 (runs of 15 Nov 2026) |
| Screenshots of the traffic light and “Analyze with models” | Interfaces in `Sistema/interfaces/eva/` with the SIMULATED scenario (taken by Iker) |

## View it locally

A single command, the same on Windows (PowerShell), macOS or Linux, from the repo root:

```bash
node landing/servir.mjs
```

Open http://localhost:8787. The script serves the landing page at `/` and itself starts the backend in simulation mode on
port 8788 (or reuses the one already running there), just like nginx on the VPS. If port 8787 is busy (for
example, because an `npm start` from `Simulacion/` was left running), close it or use another port:
PowerShell `$env:PUERTO=8790; node landing/servir.mjs` · bash `PUERTO=8790 node landing/servir.mjs`.

For the interfaces to show live data, open http://localhost:8787/simulador, press **Prepare mission** and leave
that tab open.

The **ES / EN** button switches the landing page and also the language of the three embedded interfaces. The choice is remembered in the
browser and can be forced with `?idioma=en`.

## On the VPS

[`despliegue/`](../despliegue/README.en.md) installs nginx with the landing page at `/` and the backend behind it.
