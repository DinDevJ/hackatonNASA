# Lunna

**Equipo Monarcas · NASA Space Apps Challenge 2026** · reto *Create Health Monitoring Software for Astronauts on Space Missions*

> **EN.** Lunna monitors each astronaut against their own 14-day normal, explains what changed and warns the
> crew medical officer before a problem grows, even with a 20-minute light delay to Earth. The app is in
> Spanish with an English switch (Ajustes → Idioma / the language button on the desktop panels).

Software de monitoreo de salud para astronautas en misiones largas. Compara a cada tripulante con **su propio
normal** (mediana y MAD de 14 días), explica qué cambió y avisa a la CMO a bordo antes de que crezca un problema.
Tierra recibe lo mismo con el retraso de la luz, así que la nave puede decidir sola.

Todos los datos son **simulados**, salvo los eventos solares de **NASA DONKI**, los límites de **NASA-STD-3001** y la
prueba con los laboratorios abiertos de **Inspiration4** (NASA OSDR; ver abajo).

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

## Por qué «aprende» de cada tripulante

No es una red entrenada. Es **autocalibración personal** (`prototipo-salud/motor/`):
- **Base prevuelo por persona** (media y DE propias; con pocos días se encoge hacia la referencia poblacional NHANES).
  Se congela al lanzar y nadie la reescribe; una corrección humana crea una versión nueva.
- **Actualización protegida** en vuelo (EWMA que solo aprende de días estables) y **CUSUM anclado al prevuelo** para cambios lentos.
- La **tripulación** solo da contexto: nunca redefine el normal de nadie.
- El cirujano de vuelo puede **editar pesos y umbrales**; queda marcado «modificado por el usuario».

Ejemplo reproducible (datos SIMULADO, `python -m validacion.ejemplo_aprende` en `prototipo-salud/`): dos hombres de 30 años
marcan la misma FC en sueño, 85 lpm, el día 5 de vuelo. Contra la población (NHANES) ambos dan z = 1.32, normal. Contra su
propia base de 14 noches, SIM-A (58.1 ± 2.9 lpm) da z = 9.17 y se alerta; SIM-B (83.6 ± 3.3 lpm) da z = 0.43 y es normal.
Con 2 noches la base de SIM-A es 54.0 ± 5.1 (DE combinada de la tripulación); desde 5 noches usa su propia DE.

## Prueba con datos reales de Inspiration4 (NASA OSDR, abierto)

`prototipo-salud/validacion/inspiration4.py` descarga el CBC, la química y la PCR abiertos de
[OSD-569](https://osdr.nasa.gov/bio/repo/data/studies/OSD-569) y [OSD-575](https://osdr.nasa.gov/bio/repo/data/studies/OSD-575)
(4 civiles, 3 días en órbita; PRs #9 y #10). Resultados honestos:
- **Solo datos reales:** todo GRIS. Hay 3 tomas prevuelo y el motor pide 5 para una base personal; no inventa colores.
- **Con relleno SIMULADO** de la base hasta 5 (experimento, no validación; 3 semillas): ningún ROJO. Coincide con el laboratorio
  en el potasio bajo de C003 en R+1 (3.0 mmol/L, rango 3.5–5.3), y con Jones 2024 (*Nature*) y Kim 2024 (*Nat Commun*): casi todo
  volvió a la línea base.
- **Límites:** n = 4, sin sangre en vuelo, sin vitales abiertos, z inestables entre semillas, base parcialmente SIMULADA. No prueba
  nada clínico. Detalle: [`prototipo-salud/validacion/README.md`](prototipo-salud/validacion/README.md).

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
