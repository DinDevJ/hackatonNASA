> 🌐 **Español** · [English](README.en.md)

# Simulación

Todo lo que produce o muestra **datos sintéticos**. Usa el código de [`../Sistema/`](../Sistema/README.md) sin
copiarlo y guarda sus datos en su propia base (`eva-simulacion.db`), para que nunca se mezclen con la operativa.

```bash
cd Simulacion
npm start          # backend en modo simulación → http://localhost:8787/simulador
npm run generador  # generador de telemetría por terminal
npm test
```

| Carpeta | Qué es |
|---|---|
| `simulador/` | Maqueta interactiva de la nave (`/simulador`): tripulación transmitiendo, terminal por equipo, monitor serie del ESP32, escenarios clínicos y enlace con Tierra |
| `generador/` | Tramas binarias y JSON como las de la pasarela, 4 tripulantes y 112 días |
| `escenarios/interfaces/` | Escenario de las interfaces (días 106–115) y demo automática (`/app/?demo`) |
| `donki/` | Eventos solares **reales** de NASA DONKI y el script que los descarga (`NASA_API_KEY` en `.env`) |
| `test/` | Pruebas del modo simulación |

Recorrido de la demo paso a paso: [`../ONBOARDING.md`](../ONBOARDING.md).
