> 🌐 [Español](README.md) · **English**

# Sistema

The Lunna software that would run on the spacecraft and on Earth. It starts in **operational mode**: no simulator and no synthetic
data. The demo with the simulated crew is in [`../Simulacion/`](../Simulacion/README.en.md).

```bash
cd Sistema/backend
npm start          # http://localhost:8787 · requires Node.js 22.6+, no npm install
npm test
```

| Folder | What it is |
|---|---|
| [`backend/`](backend) | Central computer: frame ingestion, LUNNA model, clinical thresholds, condition engine, link with Earth (simulated and HTTPS), REST API and live events. Serves the interfaces |
| [`interfaces/eva/`](interfaces/eva) | Astronaut's phone (`/app/`), central computer (`/app/central.html`) and Earth base (`/app/base.html`) |
| [`interfaces/reloj/`](interfaces/reloj) | Crew watch (`/reloj/`) |
| [`esp32/`](esp32) | Firmware for the smart shirt with sensors, and its test vectors |
| [`pasarela/`](pasarela) | Bluetooth LE gateway to the central computer |

Clinical thresholds and their source: [`backend/semillas/medibles.en.md`](backend/semillas/medibles.en.md). Architecture, API and
algorithms: [`../documentacion/`](../documentacion/INDICE.en.md).
