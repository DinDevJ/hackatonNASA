# EVA · Entregable de integración

Firmware del ESP32, pasarela Bluetooth, computadora central y modelo **LUNNA**.
Cómo funciona, cómo se conecta y dónde están los límites.

---

## 1. El sistema

```
  ASTRONAUTA (lo marcado en rojo en el simulador)
  ┌──────────────────────────────────────────┐
  │ playera con sensores ─cable─ ESP32 ──────┼── BLE ──┐
  │ brazalete de presión (opcional) ─────────┼── BLE ──┤     ┌── COMPUTADORA CENTRAL ───────────┐
  │ reloj inteligente (opcional) ────────────┼── BLE ──┼────►│ pasarela ─► backend ─► LUNNA     │
  └──────────────────────────────────────────┘         │     │ pasarela/   backend/     │       │
  smartphone (opcional: avisos al astronauta) ◄────────┘     │                 alertas ─┴► Fany  │
                                                             └──────────────┬───────────────────┘
                                                        alertas y resúmenes │ ▲ avisos de vuelta
                                                                            ▼ │
                                                                TIERRA (retraso de la luz)
```

**Cada dispositivo habla directo con la PC central.** No hay un concentrador en medio.

| Pieza | Carpeta | Qué hace | Lenguaje |
|---|---|---|---|
| **Firmware** | `esp32/playera_eva/` | El ESP32 de la playera: lee los sensores, arma tramas, las manda por BLE y las guarda si no hay conexión | C++ (Arduino) |
| **Pasarela** | `pasarela/` | Encuentra **todos** los dispositivos EVA, se conecta a cada uno, les da la hora y reenvía sus tramas | Python |
| **Backend** | `backend/` | Atribuye cada dato al tripulante, lo guarda y lo evalúa con LUNNA | TypeScript (Node) |
| **Simulador** | `backend/web/` | *Maqueta de aeronave interactiva para simular sistema LUNNA* en `http://localhost:8787/simulador`: la nave con el astronauta, la PC central y el smartphone, y la Tierra afuera. Clic en un equipo abre su terminal arrastrable con cada trama (`22:26:50 enviada trama 01 91 01 …`); clic en el ESP32 abre su monitor serie y clic en la Tierra abre la consola de control de misión (`/tierra`) en una ventana maximizable. Se controla con comandos (`ayuda`; el enlace con Tierra, desde la PC: `ventana cerrar`, `retraso 240`) | HTML |

### ¿Los dispositivos van cableados al ESP32?

**Sólo los sensores de la playera.** Un electrodo de ECG, una banda de respiración o un
termómetro sueltos no tienen radio, así que algo tiene que leerlos y transmitir: ese es el
ESP32, cosido en la playera. Visto desde la PC, **la playera es un dispositivo Bluetooth más**.

Todo lo que ya trae su propio Bluetooth (reloj, brazalete de presión, oxímetro…) se
conecta **directo a la PC central**, sin pasar por el ESP32.

Por eso **la limitante del sistema no es el software sino los dispositivos: qué pueden
medir**. Si un aparato mide algo, se registra su esquema y entra sin tocar el código.

## 2. Cómo funciona el backend, en cinco pasos

Cuando llega una trama:

1. **¿Quién la manda?** La cabecera trae el número del dispositivo (`401`, la playera). Si no está
   registrado, se rechaza.
2. **¿Quién lo lleva puesto?** La tabla de asignaciones dice "la 401 la lleva Ana desde
   las 06:00". **El dispositivo no sabe quién lo lleva**: los trajes se reutilizan, y si
   el nombre fuera grabado en el sensor, los datos de una persona se atribuirían a otra.
3. **¿Qué dice?** El esquema del dispositivo indica qué hay en cada byte: el primero es
   la FC, el segundo la respiración, los dos siguientes la temperatura ×0,01. Si un campo tiene
   fórmula, se aplica aquí.
4. **Se guarda** en la base de datos con la hora en que **ocurrió**, no la hora en que
   llegó. Si la misma trama llega dos veces, la segunda se ignora.
5. **LUNNA la evalúa**: compara la mediana de las últimas 24 h con lo que esperaba para
   Ana en este entorno. Si se sale, crea una alerta y la manda en vivo al frontend.

---

## 3. LUNNA y el teorema de Bayes

**Modelo matemático de adaptación de variables en sensores para la probabilidad de un
suceso.** Es exactamente la fórmula del cuaderno:

```
              P(E | H) · P(H)
  P(H | E) = ─────────────────
                   P(E)
```

| Término | En LUNNA | Ejemplo con Ana |
|---|---|---|
| **H** — hipótesis | "El cambio real de su FC en órbita es Δ" | Δ = −8 % |
| **P(H)** — a priori | Lo que sabemos **antes** de medirla: literatura + sus misiones previas | "En Artemis bajó 10 %" |
| **E** — evidencia | Sus mediciones diarias en los primeros 14 días | Medianas de cada día |
| **P(E \| H)** — verosimilitud | Qué tan probable es ver esas mediciones si Δ fuera cierto | Ruido diario σ = 4 % |
| **P(H \| E)** — a posteriori | Lo que esperamos de **ella** a partir de ahora | 57,4 bpm, banda [52,4 · 62,5] |

Como las variables son continuas, se usa la versión normal-normal de la fórmula, que da
la media y la incertidumbre en una línea cada una. Cada fuente pesa según su precisión, y
el backend lo reporta: para la FC de Ana, **literatura 1 % · historial 11 % · vuelo 88 %**.

**La probabilidad del suceso.** Cada alerta trae `prob_nominal`: la probabilidad de ver
una desviación así de grande **si Ana siguiera en su estado normal**. En el día 112 de la
simulación salió z = 3,34, es decir **0,0008**: muy poco creíble que sea ruido.

🔶 La calibración se congela a los 14 días. Si siguiera aprendiendo, una deriva lenta
como la fatiga se absorbería como "su nueva normalidad" y nunca saltaría la alerta.

---

## 4. La trama

```
┌ cabecera, 13 bytes, little-endian ───────────────────┬ carga ──────────────────┐
│ ver u8 │ id_disp u32 │ id_esquema u16 │ seq u16 │ t_scet u32 │ según el esquema │
└──────────────────────────────────────────────────────┴─────────────────────────┘

  playera (401), esquema 5:    fc u8 · fr u8 · temp i16 ×0,01    → 17 bytes
  brazalete (201), esquema 2:  sis u8 · dia u8  (+ pam fórmula)  → 15 bytes
```

| Campo | Para qué |
|---|---|
| `id_disp` | Quién manda. **No** dice quién lo lleva: eso lo dice la central |
| `id_esquema` | Cómo leer la carga. Si el esquema cambia, las tramas viejas se siguen leyendo |
| `seq` | Detecta tramas perdidas por el aire |
| `t_scet` | Cuándo **ocurrió** la medición, en segundos UTC |

✅ **Verificado:** el firmware (C++), la pasarela (Python) y el backend (TypeScript)
producen **los mismos bytes**, incluidos saturación, negativos y redondeo de los valores
terminados en ,5. Pruebas en `esp32/test/` y `pasarela/test_trama.py`.

---

## 5. Sincronización Bluetooth

Servicio BLE propio con tres características:

| Característica | UUID (`…-8ed3-4bdf-8a39-a01bebede295`) | Dirección | Qué hace |
|---|---|---|---|
| **Datos** | `a3c87501` | dispositivo → PC (notificación) | Las tramas |
| **Esquema** | `a3c87502` | PC lee | El dispositivo dice qué campos manda |
| **Hora** | `a3c87503` | PC → dispositivo | La PC le escribe la hora UTC |

Cualquier aparato que implemente este servicio entra solo. La pasarela se conecta a
todos los que encuentre a la vez y, con cada uno, hace tres cosas en este orden:

1. **Escribe la hora.** El ESP32 no tiene reloj de tiempo real: sin esto no puede sellar
   sus tramas.
2. **Lee el esquema.** El dispositivo se autodescribe.
3. **Se suscribe a las tramas** y las reenvía al backend en lotes.

**Si se pierde la conexión no se pierden datos:**

- El **ESP32** guarda las lecturas en una cola de 1 800 lecturas (≈ 30 minutos a una por segundo). Al
  reconectar las manda **con su hora real**, aunque se hayan tomado antes de recibir la
  hora: guarda el instante interno y calcula la hora al enviar.
- La **pasarela** guarda hasta 50 000 tramas si el backend no responde, y reintenta.
- El **backend** ignora los duplicados, así que reenviar es seguro.

### Enlace con Tierra

Qué baja de la nave a Tierra, de mayor a menor prioridad:

| Paquete | Cuándo | Prioridad | Qué lleva |
|---|---|---|---|
| `acuse` | al recibir un aviso o alerta de Tierra | 0 | Confirma que llegó a bordo y cuándo |
| `alerta` | al instante | 0 rojo · 1 ámbar | La alerta de LUNNA con su z y P(normal) |
| `resumen` | cada 30 s | 2 | **Procesados:** último valor de cada variable + lo esperado y la banda de LUNNA |
| `crudos` | cada 30 s, en lotes de 200 | 3 | **Crudos:** cada trama tal como llegó (hex o JSON) y su decodificación |

Tierra sube **avisos** y **alertas manuales** (`tipo: "alerta"`, `nivel: "ambar" | "rojo"`,
`variable` opcional) cuando el cirujano de vuelo detecta una anomalía que LUNNA no marcó.
En los dos sentidos:

- Todo llega `owlt_s` segundos después de salir (20 s por defecto para que se vea; en
  Marte serían de 240 a 1 440).
- Con la **ventana cerrada** nada sale: se guarda en cola y sale al abrirse.
- Tierra ve **cuándo ocurrió** cada cosa y **con qué antigüedad llegó**.

### Consola de control de misión (`http://localhost:8787/tierra`)

Lo que usaría el cirujano de vuelo en Tierra. **Sólo muestra lo que llegó por el enlace**,
con su retraso: nunca lee directo la base de datos de la nave.

- **Tripulación:** cada tripulante con el último estado que reportó LUNNA.
- **Procesados:** último valor de cada variable, lo esperado, la banda 95 %, si está
  dentro o fuera, cuándo se midió a bordo y cuándo llegó. Botón *Marcar anomalía*.
- **Crudos:** las tramas tal como las mandó cada dispositivo, filtrables y con pausa.
- **Alertas de LUNNA:** con *Confirmar y alertar*, que prellena el formulario.
- **Alerta manual:** tripulante, nivel, variable y mensaje. Muestra el recorrido:
  redactada → enviada → recibida a bordo (por el acuse, que tarda otro retraso en volver).

⚠️ Las tramas crudas se juntan en memoria hasta el siguiente paquete: si el backend se
reinicia, se pierden las de esos ≤ 30 s (los datos procesados sí quedan en la base).

---

## 6. Cómo integrarlo

### Sin hardware (hoy)

```bash
# terminal 1
cd backend
npm start
```

```bash
# terminal 2
cd pasarela
pip install -r requirements.txt
python pasarela_ble.py --prueba --asignar 401=ana --asignar 201=ana
```

La pasarela genera las tramas de la playera (las mismas que el firmware) y las del
brazalete. También está el simulador de
misión completa: `npm run sim` dentro de `backend/`.

Al abrir **http://localhost:8787** se ve el estado del backend en texto plano, y la
terminal de `npm start` muestra la actividad en vivo. El simulador visual está en
**http://localhost:8787/simulador**.

No hace falta borrar el `eva.db`: al arrancar, el backend añade lo que falte de las
semillas sin tocar lo que ya existe.

⚠️ **Si la pasarela dice que el backend es una versión vieja**, o aparece
`FOREIGN KEY constraint failed`, hay otro `npm start` antiguo abierto en otra terminal
ocupando el puerto. Ciérrenlo y arranquen de nuevo; el backend nuevo avisa si el puerto
está ocupado.

### Con el ESP32

1. Arduino IDE → instalar el núcleo **esp32** de Espressif → abrir
   `esp32/playera_eva/playera_eva.ino` → subir. El monitor serie (115200) debe decir
   `Playera EVA lista`. Con `DEPURAR 1` también muestra cada lectura, cada trama
   enviada, las conexiones y un resumen cada 10 s (lo mismo que el monitor serie del simulador).
2. Arrancar el backend.
3. `python pasarela_ble.py --asignar 401=ana` (sin `--prueba`).
4. La pasarela lo encuentra, se conecta y empieza a reenviar.

### Agregar un sensor a la playera

Ejemplo: SpO₂ con un oxímetro cableado al ESP32.

| Dónde | Qué cambiar |
|---|---|
| **Backend** | `POST /api/variables` con la variable nueva, y `POST /api/esquemas` con el campo añadido. Devuelve un id de esquema nuevo, p. ej. `6` |
| **Firmware** | Añadir el campo a `CAMPOS`, poner `ID_ESQUEMA = 6` y leer el sensor en `leerPlayera()` |
| **Backend** | `POST /api/dispositivos` para que la 401 use el esquema 6 |

Un aparato **nuevo** con Bluetooth (no un sensor de la playera) sólo necesita registrarse
con `POST /api/dispositivos` y su esquema; si no habla el protocolo EVA, manda JSON
(`POST /api/tramas`). Detalle de las llamadas en `backend/README.md`.

---

## 7. Limitantes

| Limitante | Consecuencia | Qué hacer |
|---|---|---|
| 🔴 **Lo que miden los dispositivos** | Es **la** limitante del sistema: LUNNA sólo vigila las variables que algún aparato mide. Sin brazalete no hay presión; un reloj comercial no suele exponer la SpO₂ por Bluetooth estándar (sólo en la app del fabricante) | Elegir los aparatos según las variables que se quieran vigilar. El software no cambia |
| 🔴 **El firmware no se ha probado en una placa** | La parte que arma la trama sí está verificada. El `.ino` completo sólo pasó una revisión de sintaxis con la API de Arduino/BLE simulada, no el compilador real del ESP32 | Compilarlo y subirlo en cuanto haya un ESP32. Revisar los avisos del compilador según la versión del núcleo |
| 🔴 **Carga máxima de 7 bytes por trama** | El tamaño por defecto de un paquete BLE deja 20 bytes útiles, y la cabecera ocupa 13. La playera usa 4 y el brazalete 2 | Para más sensores en un dispositivo: negociar un MTU mayor, o repartir en varios esquemas |
| 🔴 **Sin cifrado ni emparejamiento** | Un aparato que anuncie el mismo servicio sería aceptado por la pasarela. El backend rechaza los `id_disp` no registrados, pero un `id_disp` se puede copiar | Emparejamiento BLE con vinculación y lista blanca de direcciones antes de cualquier uso real |
| 🟡 **Las notificaciones BLE no tienen acuse** | Si la pila se satura, se pierden tramas | El firmware espera 8 ms entre envíos, y la pasarela detecta huecos por `seq` y los informa |
| 🟡 **El ESP32 no tiene reloj de tiempo real** | Sin conexión no sabe la hora. Si se reinicia desconectado, pierde la cola (está en RAM) | La pasarela le da la hora en cada conexión. Para no perder datos al reiniciar haría falta guardarlos en flash |
| 🟡 **Deriva del reloj** | El cristal del ESP32 se desvía con el tiempo | Se corrige en cada reconexión |
| 🟡 **Cola de ≈ 30 minutos** | Si pasa más tiempo desconectado, se pierden las lecturas más antiguas (el firmware las cuenta) | Ampliar con memoria flash si hace falta |
| 🟡 **Conexiones simultáneas por adaptador** | Hay un límite de dispositivos BLE conectados a la vez. No tengo una cifra verificada: depende del adaptador y del sistema operativo | Como cada aparato se conecta por separado, esto importa más: probar cuántos aguanta el adaptador de la PC, o poner un adaptador BLE por módulo |
| 🟡 **Sensores reales sin escribir** | `SIMULAR = 1` genera valores sintéticos | Escribir la lectura en `leerPlayera()` según los sensores elegidos |
| 🟡 **Aparatos comerciales no hablan el protocolo EVA** | Un reloj o brazalete de tienda no trae nuestro servicio BLE | La pasarela tendría que traducir sus perfiles Bluetooth estándar (ritmo cardiaco, presión arterial…) a JSON. **No está escrito todavía** |
| ⚪ **Datos y priores provisionales** | LUNNA funciona, pero casi todos sus priores son no informativos y la tripulación es sintética | Leo e Iker entregan variables y priores con fuente |

---

## 8. Qué está verificado y qué no

| | Estado |
|---|---|
| Firmware, pasarela y backend producen los mismos bytes | ✅ 4 vectores (playera y brazalete), incluidos casos límite |
| Pasarela → backend → base de datos → estado | ✅ de punta a punta en modo prueba |
| Fórmula en un campo virtual (presión media) | ✅ calculada y con la fórmula registrada |
| LUNNA detecta la fatiga simulada sin falsos positivos | ✅ 119 días, 4 tripulantes, 2 alertas verdaderas |
| Backend: 19 pruebas | ✅ |
| Enlace con Tierra: retraso, ventana cerrada y avisos de vuelta | ✅ |
| Simulador: preparar misión, provocar fatiga, ver la alerta | ✅ en un navegador real (Playwright), sin errores; ámbar y luego rojo |
| `.ino` de la playera: sintaxis | 🟡 con la API de Arduino/BLE simulada, no con el compilador del ESP32 |
| Firmware compilado y subido a un ESP32 | ❌ no hay placa |
| Conexión BLE real entre ESP32 y PC | ❌ no hay placa; la pasarela usa `bleak`, que funciona en Windows |
| LUNNA con datos humanos reales | ❌ los datos son sintéticos |
