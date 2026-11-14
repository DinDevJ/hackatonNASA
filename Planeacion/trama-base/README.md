# Trama base de EVA: qué manda el hardware y qué detectamos con eso

**Decisión del equipo (14 nov 2026):** el límite es el hardware. En vez de adaptarnos a lo que
cada reloj quiera publicar, declaramos **la trama que debe entregar cualquier dispositivo con
sensores básicos** (reloj, brazalete o traje) y el software analiza eso de forma continua.
El hardware lo simulamos con un **ESP32 por Bluetooth**.

✅ probado por nosotros · ⚠️ limitación · 🔶 decisión o propuesta nuestra

```
 sensores básicos          Bluetooth LE              navegador / app
┌──────────────────┐   paquetes de 20 bytes   ┌──────────────────────────────┐
│ ESP32            │ ───────────────────────► │ trama.mjs      decodifica     │
│ (reloj / traje   │      eva.ble.v1          │ condiciones.mjs  avisa        │
│  + nodo cabina)  │ ◄─────────────────────── │ → eva.telemetry.v1 (motor)    │
└──────────────────┘   hora y escenario       └──────────────────────────────┘
```

Esta trama es **los bytes que viajan**. La trama lógica que consume el motor sigue siendo la
de Julio ([`eva.telemetry.v1`](../Julio/codigo/TRAMA-TELEMETRIA.md)); `trama.mjs` convierte
una en la otra, y cada paquete convertido pasa su validador.

---

## 1. El hardware que suponemos

Cinco sensores baratos, todos conectables a un ESP32. No es fantasía: son las mismas medidas
que ya toma en la ISS la camiseta **Bio-Monitor** de la agencia canadiense (pulso, respiración,
temperatura de piel, SpO2 y actividad; catálogo 04, inventario de equipo).

| Sensor | Ejemplo | Qué entrega |
|---|---|---|
| Óptico de pulso (PPG) | MAX30102 | Frecuencia cardiaca, SpO2, tiempo entre latidos, respiración estimada |
| Temperatura de piel | MLX90614 o termistor | Temperatura en la muñeca |
| Acelerómetro | MPU6050 | Movimiento, pasos, postura |
| Aire de cabina | SCD41 + sensor de O2 | CO2, oxígeno, temperatura, humedad |
| Dosímetro, micrófono, luz | Geiger, INMP441, BH1750 | Tasa de dosis, ruido, luz |
| Dos botones | — | "Me acuesto / me levanto", "me pongo de pie", "ayuda" |

---

## 2. Las variables que viajan

De las 388 variables del equipo elegimos las que cumplen tres cosas: **las da un sensor básico
sin intervención de nadie**, **alguien del equipo ya probó que funcionan** y **sirven para
detectar algo frecuente en el espacio**. Son 15 campos.

### Persona · cada segundo

| Campo | Variable | Unidad | Investigó | Qué sabemos de su viabilidad |
|---|---|---|---|---|
| `fc` | `04:A4` Frecuencia cardiaca | lpm | Julio | ✅ Llega por Bluetooth del Huawei Watch 5, limpia, a 1 Hz |
| `spo2` | `04:A3` SpO2 | % | Julio | ⚠️ El sensor de muñeca sobreestima cuando el oxígeno está bajo: un aviso se confirma con el pulsioxímetro del kit |
| `fr` | `04:A2` Frecuencia respiratoria | rpm | Julio | ⚠️ Estimada del pulso. ✅ Smart Fusion: por lectura apenas sirve; como **valor diario** el error es 1,3 rpm. Se usa en tendencia, no al instante |
| `temp_piel` | `04:A1` Temperatura | °C | Julio | ⚠️ Es de piel, no central. Solo vale **contra tu normal** |
| `actividad` | `03:V30` Sueño · `02:V56` Ejercicio | cuentas/s | Leo, Diana | ✅ Con Cole-Kripke da el sueño total con 4 % de error (MMASH) |
| `postura` | `01:V48` | categoría | Julio | ⚠️ Solo tiene sentido con gravedad (Luna, Marte, regreso). En microgravedad se usa el botón |
| `pasos` | `02:V56` | pasos/s | Leo | Apoyo para minutos de ejercicio |
| `ibi_ms` | `03:V17` HRV · `01:V31`–`V32` Ritmo | ms | Diana, Iker | ✅ Con filtro ligero el RMSSD queda a 6,6 % de la referencia. 🔥 El Watch 5 **no** lo entrega: es la razón de pedirlo en la trama |

### Cabina · cada 5 segundos

| Campo | Variable | Unidad | Investigó | Umbral NASA [A] |
|---|---|---|---|---|
| `ppco2` | `04:A23` CO2 | mmHg | Julio | ≤ 3 mmHg promedio de 1 h |
| `ppo2` | `04:A25` Oxígeno inspirado | mmHg | Julio | Objetivo 145–155; mínimo 127 |
| `temp_cabina`, `humedad` | `04:A27` | °C, % | Julio | Entre 18 °C/75 % y 27 °C/25 % |
| `tasa_dosis` | `01:V95` Tasa de dosis | µSv/h | Fani, Julio | < 1,3 mSv/día de diseño (= 54 µSv/h); < 250 mSv por evento solar |
| `ruido` | `04:A28` | dBA | Julio | Se registra para la dosis de 24 h |
| `lux` | `03:V49` Luz | lux | Leo | ≈ 20 lux de noche (señal circadiana) |

### Lo que el software calcula con eso

| Se calcula | A partir de | Variable |
|---|---|---|
| FC en reposo (la mediana de 30 min más baja **durante el sueño**) | `fc` + `actividad` | `01:V3`, `03:V18` |
| HRV nocturna: RMSSD y SDNN | `ibi_ms` | `03:V17` |
| Horas de sueño, hora de acostarse y levantarse | `actividad` + botones | `03:V30`, `04:A40`, `03:V52` |
| Horas despierto | botón "me levanto" | `03:V62` |
| Minutos de ejercicio | `actividad` + `pasos` + `fc` | `02:V56`, `01:V29` |
| Subida de FC al ponerse de pie | `fc` + botón | `01:V48` |
| Dosis acumulada del evento y de la misión | `tasa_dosis` | `01:V93`, `01:V90` |

### Lo que NO viaja en la trama

| Indicador | Por qué | Cómo entra |
|---|---|---|
| Presión arterial (`01:V1`) | Necesita manguito | A mano |
| Glucosa (`02:V86`) | Ningún sensor básico la mide sin punción | A mano |
| Ánimo (`03:V1`, `03:V2`) | Es una pregunta, no un sensor | Check-in de 3 preguntas |
| Agua, masa corporal, síntomas, tira de orina | Los reporta la persona | A mano o con cámara |
| Vista (SANS), hueso, análisis de sangre | Requieren equipo médico o laboratorio | Fuera de alcance |

Con esto quedan cubiertos los seis indicadores que nombra el reto: frecuencia cardiaca,
temperatura y sueño por la trama; presión, glucosa y ánimo a mano.

---

## 3. Qué detectamos

Organizado por los [cinco peligros del vuelo espacial](https://www.nasa.gov/hrp/hazards/) de
NASA. El software **avisa, no diagnostica**: cada aviso dice qué vio y de dónde sale el umbral.

`[A]` NASA o astronautas · `[T]` clínico de Tierra · `tu normal` contra la propia línea base ·
🔶 propuesta nuestra, sin validar

### En vivo · [`condiciones.mjs`](condiciones.mjs)

| Peligro | Aviso | Señales | Regla | Umbral |
|---|---|---|---|---|
| Radiación | **Evento de radiación** | `tasa_dosis` | ≥ 3000 µSv/h → refugio. Dosis del evento ≥ 250 mSv → rojo. > 54 µSv/h → ámbar | [A] ⚠️ 3000 sale de la alarma del medidor de la ISS (5 mrad/min), tomando 1 Gy ≈ 1 Sv |
| Ambiente cerrado | **CO2 alto** | `ppco2` | Promedio de la última hora > 3 mmHg | [A] |
| Ambiente cerrado | **Oxígeno de cabina bajo** | `ppo2` | < 127 mmHg | [A] |
| Ambiente cerrado | **Oxígeno en sangre bajo** | `spo2` + `ppo2` | ≤ 92 % ámbar, ≤ 88 % rojo, sostenido 30 s. Si la cabina también está baja, lo dice: afecta a todos | [T] 🔶 |
| Ambiente cerrado | **Temperatura de cabina** | `temp_cabina` | Fuera de 18–27 °C | [A] |
| Ambiente cerrado (inmune) | **Posible fiebre o infección** | `temp_piel` + `fc` | Piel +1 °C **y** FC +10 lpm sobre tu normal, en reposo → "tómate la temperatura" | tu normal 🔶 |
| Gravedad | **Intolerancia ortostática** | `fc` + botón | Tras "me pongo de pie", FC +30 lpm durante más de 30 s | [T] |
| Gravedad | **Ritmo irregular** | `ibi_ms` | ≥ 15 % de latidos con salto > 20 %, en reposo → "registra un ECG" | 🔶 |
| Gravedad | **FC alta o baja en reposo** | `fc` | > 100 o < 40 lpm durante 1 min quieto | [T] |
| — | **Sensor sin contacto** | bandera | 10 s sin tocar la piel → no se evalúa nada clínico | calidad |

### En varios días · reglas de [Diana](../Diana/viabilidad/reglas_diana.yaml)

Necesitan la línea base de 14 días, así que no se ven en una demo de minutos.

| Peligro | Aviso | Señales de la trama | Regla |
|---|---|---|---|
| Aislamiento y confinamiento | **Fatiga acumulada** | Sueño, FC en reposo, HRV | 3 noches con 1 h menos de sueño **y** FC en reposo alta **y** HRV baja |
| Aislamiento y confinamiento | **Falta de sueño** | `actividad` + botones | Horas de sueño contra tu normal; ≥ 16 h despierto ámbar, ≥ 21 h rojo |
| Aislamiento y confinamiento | **Desajuste de horario** | Botones + `lux` | Variación de la hora de acostarse; luz alta de noche |
| Gravedad | **Pérdida de condición física** | `actividad` + `fc` | Minutos de ejercicio por debajo del plan (ISS: 1,5 h/día [A]) |
| Radiación | **Dosis de misión** | `tasa_dosis` | Acumulado contra 600 mSv de carrera [A] |

El quinto peligro, la **distancia a la Tierra**, no es una condición: es la razón de que todo
esto se evalúe a bordo, sin esperar los 4 a 24 minutos de cada mensaje.

---

## 4. La trama `eva.ble.v1`

### Servicio Bluetooth

UUID base `4d6f6e61-7263-6173-4556-4100000000xx` ("Monarcas" + "EVA" en ASCII).

| Característica | UUID termina en | Tipo | Para qué |
|---|---|---|---|
| Servicio | `…01` | — | Lo que anuncia el dispositivo |
| `TRAMA` | `…02` | notify | Todos los paquetes de datos |
| `CONTROL` | `…03` | write | `01` + hora Unix (4 bytes): pone el reloj · `02` + n: cambia el escenario del simulador |
| `CAPACIDADES` | `…04` | read | 4 bytes: versión, tipo de fuente y una máscara con los campos que este dispositivo sí da |

🔶 **Cada paquete cabe en 20 bytes**, el mínimo que garantiza cualquier Bluetooth LE.
Todo en *little-endian*. Un campo sin dato lleva el valor reservado (`0xFF`, `0xFFFF` o
`0x7FFF`) y llega al software como `null`, nunca como un cero.

### Cabecera · 8 bytes, igual en todos los paquetes

| Byte | Campo | Contenido |
|---|---|---|
| 0 | `version` y `tipo` | Mitad alta: versión (1). Mitad baja: 1 vitales · 2 latidos · 3 hábitat · 4 evento |
| 1 | `banderas` | bit 0 contacto con la piel · bit 1 movimiento · bit 2 reloj puesto · bit 3 batería baja · bit 4 dato simulado |
| 2–3 | `seq` | Contador de paquetes: detecta pérdidas y reenvíos |
| 4–7 | `t` | Cuándo **ocurrió**, en segundos Unix (UTC). Si el reloj no está puesto, segundos desde el arranque |

Si el reloj no está puesto, el software usa la hora de recepción **y lo marca** en la muestra.

### `VITALES` · tipo 1 · 20 bytes · cada segundo

| Byte | Campo | Tipo | Escala | Rango |
|---|---|---|---|---|
| 8 | `fc` | u8 | 1 lpm | 0–254 |
| 9 | `spo2` | u8 | 1 % | 0–100 |
| 10 | `fr` | u8 | 0,5 rpm | 0–127 |
| 11–12 | `temp_piel` | i16 | 0,01 °C | ±327 |
| 13–14 | `actividad` | u16 | 1 cuenta/s | 0–65534 |
| 15 | `postura` | u8 | — | 0 desconocida · 1 acostado · 2 sentado · 3 de pie · 4 en movimiento |
| 16 | `pasos` | u8 | pasos en el último segundo | 0–254 |
| 17 | `calidad` | u8 | 1 % | 0–100 |
| 18 | `bateria` | u8 | 1 % | 0–100 |
| 19 | reservado | — | — | 0 |

### `LATIDOS` · tipo 2 · 20 bytes · cada segundo, si hubo latidos

| Byte | Campo | Tipo | Contenido |
|---|---|---|---|
| 8 | `n` | u8 | Cuántos intervalos vienen (0–5) |
| 9–18 | `ibi_ms` | 5 × u16 | Tiempo entre latidos, en ms |
| 19 | reservado | — | 0 |

### `HABITAT` · tipo 3 · 20 bytes · cada 5 segundos

| Byte | Campo | Tipo | Escala |
|---|---|---|---|
| 8–9 | `ppco2` | u16 | 0,01 mmHg |
| 10–11 | `ppo2` | u16 | 0,1 mmHg |
| 12–13 | `temp_cabina` | i16 | 0,01 °C |
| 14 | `humedad` | u8 | 1 % |
| 15–16 | `tasa_dosis` | u16 | 1 µSv/h |
| 17 | `ruido` | u8 | 1 dBA |
| 18–19 | `lux` | u16 | 1 lux |

### `EVENTO` · tipo 4 · 9 bytes · cuando se pulsa un botón

Byte 8: 1 me acuesto · 2 me levanto · 3 me pongo de pie · 4 ayuda · 5 inicio de ejercicio ·
6 fin de ejercicio.

🔶 Los botones existen porque las pruebas de Diana mostraron que el reloj solo falla la hora
de despertar por 86 minutos.

### Un paquete real, leído byte a byte

```
11 05 d4 28 d1 8a 9b 6b 4b 61 1d 22 0d 0c 00 02 00 5a 57 00
│  │  └─┬─┘ └────┬────┘ │  │  │  └─┬─┘ └─┬─┘ │  │  │  │
│  │   seq       t      fc │  fr  temp  activ │  │  │  batería 87 %
│  │  10452  2027-03-18  75 │ 14,5 33,62  12   │  │  calidad 90 %
│  │         07:42:09 UTC   spo2 97           │  pasos 0
│  banderas: contacto + reloj puesto          postura 2 = sentado
versión 1, tipo 1 = vitales
```

Consumo: unos **44 bytes por segundo**.

---

## 5. Simular el hardware

### Con el ESP32

1. Abrir [`firmware/eva_sim/eva_sim.ino`](firmware/eva_sim/eva_sim.ino) en Arduino IDE.
2. Instalar la placa "esp32 by Espressif" y elegir el modelo. No hacen falta librerías extra.
3. Subir. El ESP32 se anuncia como **`EVA-SIM`**.

El escenario se cambia con el **botón BOOT** de la placa, con un dígito por el monitor serie
(115200) o desde la página.

| N.º | Escenario | Qué cambia | Aviso esperado |
|---|---|---|---|
| 0 | Nominal | FC 62, SpO2 97, CO2 2,0 mmHg, 20 µSv/h | Ninguno |
| 1 | Fiebre | Piel 33,6 → 35,1 °C, FC → 84 | Posible fiebre |
| 2 | Evento solar | Tasa de dosis → 6000 µSv/h | Evento de radiación: refugio |
| 3 | CO2 alto | CO2 → 5,2 mmHg | CO2 alto (cuando el promedio pasa de 3) |
| 4 | Hipoxia | Oxígeno de cabina → 118, SpO2 → 86 | Oxígeno en sangre bajo + oxígeno de cabina bajo |
| 5 | Prueba ortostática | Botón "de pie", FC → 99 | Intolerancia ortostática (tras 30 s) |
| 6 | Arritmia | Latidos irregulares | Ritmo irregular |
| 7 | Sin contacto | El sensor deja de tocar la piel | Sensor sin contacto, y nada más |

Para pasar a **sensores de verdad** solo se cambia la función `leerSensores()`: el
empaquetado y el Bluetooth quedan igual.

### Verlo en pantalla

```bash
python -m http.server 8765 --directory Planeacion/trama-base
```

Abrir `http://localhost:8765/monitor.html` en Chrome o Edge.

- **Conectar ESP32** usa Web Bluetooth, pone el reloj de la placa y empieza a recibir.
- **Simular sin placa** corre el mismo simulador en JavaScript ([`simulador.mjs`](simulador.mjs)),
  con los mismos números que el firmware.

### Pruebas

```bash
node --test Planeacion/trama-base/trama.test.mjs
```

---

## 6. Estado

| Pieza | Estado |
|---|---|
| Códec ([`trama.mjs`](trama.mjs)) | ✅ Ida y vuelta de los 4 paquetes; rechaza paquetes rotos |
| Puente a `eva.telemetry.v1` | ✅ Todos los paquetes pasan el validador de Julio |
| Condiciones en vivo | ✅ Cada escenario dispara su aviso y el nominal ninguno en 10 min |
| Total de pruebas | ✅ **19 de 19** |
| Monitor | ✅ Probado con el simulador en JavaScript |
| Firmware del ESP32 | ⚠️ **Escrito pero no compilado ni subido a una placa**: en este equipo no hay Arduino instalado. Hay que probarlo |
| Conexión real por Web Bluetooth | ⚠️ Sin probar hasta tener el ESP32 corriendo |

### Lo que falta decidir o hacer

- 🔶 Los umbrales marcados como propuesta (fiebre, ritmo irregular, SpO2) son nuestros: hay que
  rotularlos así en pantalla.
- La línea base de la demo está fija (FC 62, piel 33,6 °C). Con datos reales sale de 14 días.
- Las reglas de varios días están probadas en Python (Diana) pero aún no leen esta trama.
- Un solo ESP32 hace de reloj y de cabina. En el producto serían dos dispositivos con la
  misma trama.
