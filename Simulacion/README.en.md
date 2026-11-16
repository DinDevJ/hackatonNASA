> 🌐 [Español](README.md) · **English**

# Simulation

Everything that produces or displays **synthetic data**. It uses the code in [`../Sistema/`](../Sistema/README.en.md) without
copying it and stores its data in its own database (`eva-simulacion.db`), so that they never mix with the operational data.

```bash
cd Simulacion
npm start          # backend in simulation mode → http://localhost:8787/simulador
npm run generador  # terminal-based telemetry generator
npm test
```

| Folder | What it is |
|---|---|
| `simulador/` | Interactive mock-up of the spacecraft (`/simulador`): crew transmitting, one terminal per device, ESP32 serial monitor, clinical scenarios and link with Earth |
| `generador/` | Binary and JSON frames like those from the gateway, 4 crew members and 112 days |
| `escenarios/interfaces/` | Interface scenario (days 106–115) and automatic demo (`/app/?demo`) |
| `donki/` | **Real** solar events from NASA DONKI and the script that downloads them (`NASA_API_KEY` in `.env`) |
| `test/` | Tests for the simulation mode |

Step-by-step demo walkthrough: [`../ONBOARDING.en.md`](../ONBOARDING.en.md).
