# Sistema

El software de Lunna que correría en la nave y en Tierra. Arranca en **modo operativo**: no carga el
simulador ni el escenario sintético. Para la simulación, ver [`Simulacion/`](../Simulacion/README.md).

```bash
cd Sistema/backend
npm start          # http://localhost:8787 (modo operativo)
npm test
```

| Carpeta | Qué es |
|---|---|
| [`backend/`](backend/README.md) | Computadora central: ingesta de tramas, LUNNA, enlace con Tierra (simulado y HTTPS), salud. Sirve las interfaces |
| [`interfaces/eva/`](interfaces/eva/README.md) | Celular (`/app/`), computadora central (`/app/central.html`) y base en Tierra (`/app/base.html`) |
| [`interfaces/reloj/`](interfaces/reloj/README.md) | Reloj de la tripulación (`/reloj/`) |
| `pasarela/` | Pasarela Bluetooth hacia la central (`python test_trama.py` comprueba que produce los mismos bytes que el backend) |
| `esp32/` | Firmware de la playera y sus vectores de prueba (`test/generar_vectores.ts` los genera con el codificador del backend) |

En modo operativo:

- `/simulador`, `/app/escenario/…` responden 404 y `POST /api/demo/reiniciar`, 403.
- `/app/config.js` dice `"modo":"operativo"`; `interfaces/eva/modo.js` lo lee y no carga el escenario.
- El teléfono, la base y el reloj todavía se dibujan con el escenario simulado, así que dicen
  «Modo operativo» en lugar de mostrarlo. La central muestra sólo sus bloques en vivo del backend.
- `backend/semillas/inicial.json` (tripulación, esquemas, dispositivos y priores provisionales) es
  configuración que el backend necesita para arrancar. **La tripulación (Ana, Luis, Mei, Tomás) es
  ficticia** y los priores, provisionales; una misión real los cambiaría.

Pendiente: `interfaces/eva/motor.js` todavía genera dentro de sí la tripulación y las series del escenario;
separarlo y pintar el teléfono, la base y el reloj con datos en vivo es un cambio aparte.

Esto es un prototipo de hackatón: no está validado para uso médico ni espacial.
