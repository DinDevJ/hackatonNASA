# Simulación

Todo lo que produce o muestra **datos sintéticos**. Nada de esta carpeta viene de un astronauta ni de un
sensor real. Usa el código de [`Sistema/`](../Sistema/README.md) sin copiarlo: `Sistema/` no depende de
esta carpeta, pero esta sí depende de `Sistema/`.

```bash
cd Simulacion
npm start          # el backend de Sistema/ en modo simulación → http://localhost:8787
npm run generador  # generador de telemetría sintética por terminal (antes: npm run sim)
npm test           # pruebas del modo simulación
```

Requiere **Node 22.6+**, sin `npm install`. `npm start` usa su propia base, `eva-simulacion.db` (en esta
carpeta, ignorada por git), para que los datos sintéticos nunca caigan en la base operativa
(`Sistema/backend/eva.db`).

| Carpeta | Qué es |
|---|---|
| `simulador/simulador.html` | Simulador visual de la nave en **/simulador**: astronauta, dispositivos, PC central y Tierra. El PC abre la central (`/app/central.html`), el smartphone la app (`/app/`), la Tierra la base (`/app/base.html`) y el reloj el de la tripulación (`/reloj/`) |
| `generador/simulador.ts` | Generador de terminal: tramas binarias del perfil EVA y JSON como las de la pasarela, 4 tripulantes y 112 días |
| `escenarios/interfaces/` | Escenario de las interfaces: `datos.js` (días 106–115 con semilla fija) y `demo.js` (demo automática, `?demo`). El backend los sirve en `/app/escenario/…` sólo en este modo |
| `donki/` | Eventos de partículas solares de **NASA DONKI** (datos reales, usados como modelo del evento del día 115) y `fetch_donki.py`, que los descarga con la `NASA_API_KEY` del `.env` de la raíz |
| `test/` | Las ventanas del simulador, el escenario, el reinicio de la demo y el generador de punta a punta |

En este modo todas las pantallas llevan el distintivo **«Simulación · datos sintéticos»**, la página de
estado del backend dice **MODO SIMULACIÓN** y `GET /api/salud` responde `"modo": "simulacion"`.

URLs: `/simulador`, `/app/`, `/app/central.html`, `/app/base.html`, `/reloj/` y `/tierra`, las mismas de
siempre.
