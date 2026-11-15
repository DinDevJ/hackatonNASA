# Onboarding · Lunna

Guía de entrada en dos rutas: **para jueces y científicos** (qué hace, cómo verlo funcionar y dónde está la evidencia
de cada afirmación) y **para quien desarrolle** (cómo está armado y cómo trabajar en él).

> En una frase: Lunna aprende el normal de cada astronauta, compara cada lectura con lo esperado **para esa persona
> en ese entorno** y avisa a la médica de a bordo antes de que un problema crezca, sin depender de Tierra.

---

## Ruta 1 · Jueces y científicos (10 minutos)

### 1. Verlo funcionar

Requiere **Node.js 22.6+**. Sin `npm install` ni internet.

```bash
cd Simulacion
npm start
```

| Paso | Dónde | Qué deberías ver |
|---|---|---|
| 1 | http://localhost:8787/simulador → **Prepare mission** | Se cargan 112 días de historia de 4 tripulantes; LUNNA aprende el normal de cada uno en sus primeros 14 días |
| 2 | **▶ Live** | Los sensores transmiten. Clic en la playera, el ESP32, el reloj o el brazalete: cada uno abre su terminal con las tramas que envía (el ESP32, su monitor serie) |
| 3 | Terminal de la **PC central**: `scenario hypoxia` | La SpO₂ de Ana baja de forma gradual; en ~1 a 2 min LUNNA alerta e indica si fue por su normal o por el umbral clínico |
| 4 | Clic en la **Tierra** | La base en Tierra recibe la alerta con el retraso de la luz y su antigüedad |
| 5 | Desde la base, una alerta manual a Ana | Llega al celular de Ana como notificación; la nave devuelve el acuse de recibo |
| 6 | Terminal de la PC: `scenario normal` | Los valores vuelven y la alerta regresa a verde |
| 7 | Playera: `ble off`, espera 20 s, `ble on` | Sin Bluetooth el ESP32 guarda las lecturas; al reconectar salen todas con su hora original |

Otros escenarios: `infection`, `fatigue`, `hypertension`. El simulador está en inglés; los comandos también se
aceptan en español (`escenario hipoxia`, `ayuda`). Escribe `help` en cualquier terminal para ver sus comandos.

> **Modo demostración.** En misión, el criterio personal de LUNNA usa la mediana de 24 h. Para que una demo de
> minutos muestre la alerta y la recuperación, el simulador la acorta a 5 min y lo anuncia en la terminal
> (`mode mission` la regresa a 24 h). Los umbrales clínicos no cambian.

### 2. Dónde está la evidencia de cada afirmación

| Afirmación | Código | Prueba que la demuestra (`Sistema/backend/test/`) |
|---|---|---|
| Predicción bayesiana por persona en tres capas (literatura, misiones previas, calibración propia) | [`lunna.ts`](Sistema/backend/src/lunna.ts) | `unidad.test.ts`: «sin datos propios manda la literatura», «una misión previa de −10 % arrastra la predicción», «tras la calibración mandan los datos propios», «el tipo de sangre no cambia nada» |
| La calibración se congela: una deriva lenta no se vuelve «normal» | [`ingesta.ts`](Sistema/backend/src/ingesta.ts) | `integracion.test.ts`: «LUNNA detecta la deriva tras la calibración, no durante» |
| Cada alerta trae la probabilidad de que sea ruido | [`lunna.ts`](Sistema/backend/src/lunna.ts) | `unidad.test.ts`: «probabilidad de que la desviación sea ruido normal» |
| El umbral clínico avisa aunque el normal personal esté en verde; un artefacto suelto no dispara | [`ingesta.ts`](Sistema/backend/src/ingesta.ts) · [`referencias.ts`](Sistema/backend/src/referencias.ts) | `umbrales.test.ts` (12 pruebas) |
| Sincronización con Tierra sin pérdidas ni duplicados | [`sincro.ts`](Sistema/backend/src/sincro.ts) · [`enlace-https.ts`](Sistema/backend/src/enlace-https.ts) | `sincro.test.ts`: «pérdida de ACK», «llegada fuera de orden», «fuzz determinista: 200 mensajes con fallos al azar llegan exactamente una vez»; `enlace-https.test.ts` |
| Retraso de la luz, ventana cerrada y avisos de vuelta | [`enlace.ts`](Sistema/backend/src/enlace.ts) | `integracion.test.ts`: «enlace con Tierra: retraso de la luz, ventana cerrada y avisos de vuelta» |
| Una trama reenviada no se duplica; un dispositivo sin dueño se rechaza | [`ingesta.ts`](Sistema/backend/src/ingesta.ts) | `integracion.test.ts`: «un reenvío no duplica», «un dispositivo sin asignar se rechaza» |
| Firmware, pasarela y backend producen los mismos bytes | [`trama_eva.h`](Sistema/esp32/playera_eva/trama_eva.h) · [`trama_eva.py`](Sistema/pasarela/trama_eva.py) · [`esquema.ts`](Sistema/backend/src/esquema.ts) | `Sistema/esp32/test/test_trama.cpp` y `Sistema/pasarela/test_trama.py` contra `vectores.json` |
| Motor de 20 padecimientos con pesos editables por el cirujano de vuelo | [`prototipo-salud/motor/`](prototipo-salud/motor) · [`semaforo.ts`](Sistema/backend/src/semaforo.ts) | `salud.test.ts`, `semaforo.test.ts`; `prototipo-salud/tests/` |
| Las fórmulas de los esquemas no pueden ejecutar código | [`formula.ts`](Sistema/backend/src/formula.ts) | `unidad.test.ts`: «rechaza todo lo que no sea aritmética» |

### 3. En qué se respalda médicamente

- **Cada umbral dice de dónde viene:** **[A]** si es de NASA o se validó en astronautas, **[T]** si es clínico de
  Tierra. Los umbrales de signos vitales del catálogo son **[T]**: no se encontró una tabla pública de NASA para
  ellos. Trazabilidad dato por dato, con archivo y fila: [`medibles.md`](Sistema/backend/semillas/medibles.md).
- **Los cambios esperados en microgravedad** (por ejemplo, la presión arterial en órbita) vienen de la literatura
  catalogada por el equipo; ver [diccionario de datos](documentacion/README_07_DICCIONARIO_DATOS_VARIABLES.md).
- **El ambiente de cabina** (CO₂, O₂, ruido) usa los límites de NASA-STD-3001.
- **Los pesos por padecimiento** traen su nivel de evidencia (A medido, B mecanismo, C juicio del equipo) y su DOI.
- **No diagnostica:** señala qué vigilar y por qué; la decisión clínica es de la CMO y del cirujano de vuelo.

Rigor completo: [protocolo de investigación](documentacion/README_02_PROTOCOLO_INVESTIGACION.md) →
[algoritmos](documentacion/README_06_MODELOS_COMPUTACIONALES_ALGORITMOS.md) →
[pruebas y validación](documentacion/README_08_PRUEBAS_VALIDACION.md) →
[riesgos](documentacion/README_10_SEGURIDAD_CONFIABILIDAD_RIESGOS.md).

### 4. Lo que todavía no es

- Del firmware del ESP32 se verificó en escritorio el codificador de tramas (mismos bytes que el backend) y la
  sintaxis del programa, pero **no se ha compilado ni probado en una placa física**.
- **No hay datos de astronautas en vuelo.** La validación externa con Inspiration4 es limitada (n = 4, sin vitales
  abiertos y con base parcialmente simulada) y así se reporta.
- **Sin autenticación ni cifrado** en la API: es una demo, no un sistema listo para una misión.

---

## Ruta 2 · Desarrollo

### Mapa del repositorio

| Carpeta | Qué es | Lenguaje |
|---|---|---|
| [`Sistema/backend/`](Sistema/backend) | Computadora central: ingesta, LUNNA, padecimientos, enlace con Tierra, API REST + SSE. Sirve las interfaces | TypeScript (Node 22, sin dependencias, SQLite integrado) |
| [`Sistema/interfaces/eva/`](Sistema/interfaces/eva) | Celular (`/app/`), central (`/app/central.html`) y base en Tierra (`/app/base.html`) | HTML, CSS, JS |
| [`Sistema/interfaces/reloj/`](Sistema/interfaces/reloj) | Reloj (`/reloj/`) | HTML, CSS, JS |
| [`Sistema/esp32/`](Sistema/esp32) | Firmware de la playera (Arduino) y vectores de prueba | C++ |
| [`Sistema/pasarela/`](Sistema/pasarela) | Pasarela Bluetooth LE (bleak) | Python |
| [`Simulacion/`](Simulacion) | Simulador visual, generador por terminal, escenario de las interfaces y eventos DONKI | HTML, TS, Python |
| [`prototipo-salud/`](prototipo-salud) | Motor de padecimientos, modelos de ECG y eco, app Streamlit, validación Inspiration4 | Python |
| [`documentacion/`](documentacion/INDICE.md) | Diez documentos técnicos | Markdown |
| [`landing/`](landing) · [`despliegue/`](despliegue) | Página de presentación e instalación en un VPS | HTML · Bash |

### Recorrido de una lectura

```
ESP32 lee el sensor ──► encola (millis) ──► con Bluetooth y hora: arma la trama de 17 B y la notifica
   └► pasarela_ble.py: valida, detecta huecos por seq ──► POST /api/tramas/binaria (lotes)
        └► ingesta.ts: ¿dispositivo registrado? ¿quién lo lleva a esa hora? ──► decodifica con su esquema
             └► guarda en SQLite con la hora a bordo (SCET), sin duplicados
                  └► vigilar(): criterio personal (LUNNA) + umbral clínico ──► alerta si cambia el estado
                       ├► SSE /api/stream ──► central, celular, reloj
                       └► enlace.ts / sincro.ts: cola a Tierra por prioridad, con seq y ACK
```

### Modos

| Modo | Comando | Qué carga |
|---|---|---|
| **Simulación** (demo) | `cd Simulacion && npm start` | Backend de `Sistema/` + simulador, escenario sintético y base aparte (`Simulacion/eva-simulacion.db`) |
| **Operativo** | `cd Sistema/backend && npm start` | Sólo el sistema real; `/simulador` responde 404 |
| **Roles con enlace HTTPS** | `npm run certs` · `npm run tierra` · `npm run nave` (en `Sistema/backend`) | Dos procesos con su propia base, sincronizados por HTTPS |

### Pruebas

```bash
cd Sistema/backend && npm test                                     # backend
cd Simulacion && npm test                                          # modo simulación
cd Sistema/interfaces/eva && node --test *.test.mjs                # motor de las interfaces
cd Sistema/pasarela && python3 test_trama.py                       # pasarela = backend
cd Sistema/esp32/test && g++ -std=c++17 -I../playera_eva test_trama.cpp -o t && ./t   # firmware = backend
cd prototipo-salud && python -m pytest                             # motor de padecimientos
```

### Tareas frecuentes

- **Agregar un sensor:** registra la variable y su esquema (`POST /api/variables`, `POST /api/esquemas`) y el
  dispositivo (`POST /api/dispositivos`); el firmware sólo replica `codificar()`. Ver
  [integración](documentacion/README_05_INTEGRACION_INTEROPERABILIDAD.md).
- **Cambiar un umbral clínico:** edita `Sistema/backend/semillas/medibles.json` con su fuente y su tipo [A]/[T], y
  actualiza `medibles.md`.
- **Desplegar:** [`despliegue/README.md`](despliegue/README.md).

### Convenciones

- **Todo dato sintético se rotula** («SIMULADO», «Simulación · datos sintéticos»). Nada simulado entra al canal real.
- **Cada umbral lleva su procedencia** [A]/[T] y su fuente; sin fuente no se publica.
- **El sistema avisa y explica, no diagnostica.**
- Código y documentación en español; las interfaces tienen traducción al inglés.

---

## Glosario

| Término | Significado |
|---|---|
| **CMO** | *Crew Medical Officer*: la médica de a bordo |
| **LUNNA** | *Live-telemetry Updating Network for Nominal-deviation & Anomalies*: el modelo bayesiano por persona |
| **Normal personal** | Lo esperado para esa persona en ese entorno, con su banda del 95 % |
| **[A] / [T]** | Umbral de NASA o validado en astronautas / clínico de Tierra, no validado en microgravedad |
| **OWLT** | Retraso de la luz en un sentido (Marte: de minutos a más de 20 min) |
| **SCET / ERT** | Hora en que ocurrió a bordo / hora en que llegó a Tierra |
| **DTN** | Almacenar y reenviar: nada se pierde si el enlace se corta |
| **Perfil EVA** | Formato binario de tramas: cabecera de 13 bytes + carga definida por un esquema |
