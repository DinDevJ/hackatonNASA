> 🌐 [Español](README.md) · **English**

# Lunna landing page

Exhibition page with one section per screen (scrolling jumps from one to the next):

1. **The three devices at a glance:** central computer, phone and watch, with their real interfaces running live.
2. **Official 30 s video**, which plays on its own, muted and looping (with sound and pause buttons), and the **Probar la simulación** button (*Try the simulation* in English).
3. **LUNNA, mathematically:** Bayesian updating with an interactive example that uses the real systolic blood pressure
   prior from the seeds.
4. **Two alert criteria** (personal and clinical threshold) and why the calibration is frozen.
5. **Prediction models:** LUNNA, shrunk pre-flight baseline, EWMA, CUSUM, 20-condition traffic light and ECG/echo models.
6. **Gallery** of the team during the hackathon (photos open enlarged).
7. Evidence and team.

The formulas are in MathML (no libraries). The drift chart uses illustrative data and is labeled as such.

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
