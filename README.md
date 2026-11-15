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
| [`Sistema/`](Sistema/README.md) | Lo que correría en la nave y en Tierra: [`backend`](Sistema/backend/README.md) (computadora central y LUNNA), [`interfaces/eva`](Sistema/interfaces/eva/README.md) (celular, computadora central y base en Tierra), [`interfaces/reloj`](Sistema/interfaces/reloj/README.md), `pasarela` (Bluetooth) y `esp32` (firmware de la playera) |
| [`Simulacion/`](Simulacion/README.md) | Todo lo sintético: simulador visual de la nave, generador de telemetría, escenario de las interfaces (`datos.js`, `demo.js`) y eventos solares de NASA DONKI |
| `Planeacion/` | Documentos y catálogos: tablas de variables y padecimientos (`*.csv`, `Iker`) que citan las semillas del backend y [`Leo/modelo-pesos`](Planeacion/Leo/modelo-pesos/README.md) (de aquí sale `pesos.js`) |
| [`prototipo-salud/`](prototipo-salud/README.md) | Prototipo del motor de padecimientos (Python) |

## Abrir

Requiere **Node 22.6+**, sin `npm install`. Hay dos modos, con las mismas interfaces:

```bash
cd Simulacion && npm start       # modo simulación: simulador, escenario y demo (datos sintéticos)
cd Sistema/backend && npm start  # modo operativo: sin simulador ni escenario sintético
```

En modo simulación:

- App del celular: http://localhost:8787/app/
- Computadora central: http://localhost:8787/app/central.html
- Base en Tierra: http://localhost:8787/app/base.html
- Reloj: http://localhost:8787/reloj/
- Simulador de la nave: http://localhost:8787/simulador
- **Demo de 30 s en inglés** (para el video de entrega): http://localhost:8787/app/?demo=30&idioma=en ·
  la demo completa en español: http://localhost:8787/app/?demo

En modo operativo `/simulador` no existe y las pantallas que todavía dependen del escenario simulado lo
dicen en lugar de mostrarlo.

Pruebas: `npm test` en `Sistema/backend` y en `Simulacion`, y `node --test Sistema/interfaces/eva/motor.test.mjs`.

## Documentación de planeación

Las propuestas, el ERS, la investigación de variables y los prototipos anteriores se quitaron del repositorio para
dejar solo lo que corre. Siguen en el historial con la etiqueta `planeacion-archivo`:

```bash
git checkout planeacion-archivo -- Planeacion/Katy
```
