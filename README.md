# Lunna

**Equipo Monarcas · NASA Space Apps Challenge 2026** · reto *Create Health Monitoring Software for Astronauts on Space Missions*

> **EN.** Lunna monitors each astronaut against their own 14-day normal, explains what changed and warns the
> crew medical officer before a problem grows, even with a 20-minute light delay to Earth. The app is in
> Spanish with an English switch (Ajustes → Idioma / the language button on the desktop panels).

Software de monitoreo de salud para astronautas en misiones largas. Compara a cada tripulante con **su propio
normal** (mediana y MAD de 14 días), explica qué cambió y avisa a la CMO a bordo antes de que crezca un problema.
Tierra recibe lo mismo con el retraso de la luz, así que la nave puede decidir sola.

Todos los datos son **simulados**, salvo los eventos solares de **NASA DONKI** y los límites de **NASA-STD-3001**.

## Qué hay

| Carpeta | Qué es |
|---|---|
| [`Planeacion/Leo/maqueta-eva`](Planeacion/Leo/maqueta-eva/README.md) | La app del celular (`index.html`), la computadora central (`central.html`) y la base en Tierra (`base.html`) |
| [`Planeacion/Julio/backend`](Planeacion/Julio/backend/README.md) | Computadora central: recibe las tramas, guarda, evalúa con el modelo LUNNA y simula el enlace con Tierra. Incluye el simulador visual de la nave |
| `Planeacion/Julio/esp32`, `Planeacion/Julio/pasarela` | Firmware de la playera (ESP32) y pasarela Bluetooth hacia la central |
| [`Planeacion/Fani/maqueta-reloj`](Planeacion/Fani/maqueta-reloj/README.md) | Interfaz del reloj, servida por el backend |
| [`Planeacion/Leo/modelo-pesos`](Planeacion/Leo/modelo-pesos/README.md) | Pesos fisiológicos por padecimiento (de aquí sale `pesos.js`) |
| `Planeacion/Julio/datos`, `Planeacion/Julio/scripts` | Eventos solares de NASA DONKI y el script que los descarga |
| `Planeacion/*.csv`, `Planeacion/Iker` | Tablas de variables y padecimientos que citan las semillas del backend |

## Abrir

Requiere **Node 22.6+**, sin `npm install`.

```bash
cd Planeacion/Julio/backend
npm start
```

- App del celular: http://localhost:8787/app/
- Computadora central: http://localhost:8787/app/central.html
- Base en Tierra: http://localhost:8787/app/base.html
- Simulador de la nave: http://localhost:8787/simulador
- **Demo de 30 s en inglés** (para el video de entrega): http://localhost:8787/app/?demo=30&idioma=en ·
  la demo completa en español: http://localhost:8787/app/?demo

Pruebas: `npm test` en el backend y `node --test motor.test.mjs` en `Planeacion/Leo/maqueta-eva`.

## Documentación de planeación

Las propuestas, el ERS, la investigación de variables y los prototipos anteriores se quitaron del repositorio para
dejar solo lo que corre. Siguen en el historial con la etiqueta `planeacion-archivo`:

```bash
git checkout planeacion-archivo -- Planeacion/Katy
```
