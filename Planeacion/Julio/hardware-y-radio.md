# Hardware y radio: qué está verificado y qué NO puede entrar al pitch

Revisión de las afirmaciones técnicas sobre Bluetooth, Wi-Fi y relojes en el espacio, y
lo que significa tener un **HUAWEI WATCH 5** como dispositivo de pruebas.

✅ verificado hoy · ⚠️ no verificado · 🔴 problema · 🔶 decisión mía

---

## 1. 🔴 LO PRIMERO: tu Huawei Watch 5 tiene una restricción con nombre propio

Esto hay que probarlo **hoy**, antes de escribir el código de captura.

### ✅ La buena: el reloj sí puede transmitir a terceros

La página de soporte de Huawei lo confirma: existe **`Ajustes > Difusión de datos de FC`**
(*HR Data Broadcasts*), y con eso *"dispositivos y apps de terceros pueden buscar y
conectarse a tu wearable para recoger los datos"*.

Eso significa que **Web Bluetooth lo puede leer** sin pasar por Huawei Health, que es
justo lo que necesitamos.

### 🔴 Las tres trampas, y la tercera es grave

| # | Restricción | Consecuencia |
|---|---|---|
| 1 | **El WATCH 5 soporta la difusión SOLO en modo de ahorro de batería.** Huawei nombra tu modelo explícitamente | Hay que entrar en ese modo para la demo. **Averiguar qué sensores siguen activos ahí** |
| 2 | Al transmitir, un reloj de conexión única **se desconecta de Huawei Health** | No se puede tener Huawei Health y nuestra app a la vez. Para la demo da igual |
| 3 | 🔴 **Los intervalos RR llegan sólo si el reloj los envía, y "a menudo no es el caso"** | **Sin RR no hay HRV.** Ni RMSSD ni SDNN |

### 🔴 Por qué el punto 3 es grave

Yo recomendé **HRV como la señal estrella** del producto. El perfil estándar BLE de ritmo
cardiaco (servicio `0x180D`, característica `0x2A37`) **puede** llevar intervalos RR,
pero es un campo opcional y muchos relojes no lo rellenan: entregan sólo lpm.

**Si tu Watch 5 no manda RR, el HRV se cae del alcance en vivo.** No es el fin del
producto, pero sí cambia la demo.

### ✅ PRUEBA EJECUTADA — resultado confirmado el 14-11-2026

Julio corrió la prueba sobre su WATCH 5. **Funcionó la conexión, y el veredicto es
definitivo.**

Paquetes recibidos: **2 bytes**, por ejemplo `06 4b`.

```
flags = 0x06 = 0000 0110
  bit 0 = 0  ->  FC en 8 bits
  bit 1 = 1  ->  contacto del sensor DETECTADO
  bit 2 = 1  ->  contacto del sensor SOPORTADO
  bit 3 = 0  ->  sin energía gastada
  bit 4 = 0  ->  SIN INTERVALOS RR
```

| Resultado | Consecuencia |
|---|---|
| 🔴 **No hay intervalos RR** | **No hay HRV en vivo.** Ni RMSSD ni SDNN desde este reloj |
| ✅ FC a ~1 Hz, limpia (71–79 bpm) | FC y FC en reposo funcionan |
| 🔥 **Reporta contacto del sensor** | **Ventaja inesperada**, ver abajo |

### 🔥 El premio de consolación es mejor de lo que parece

El reloj informa si **el sensor está en contacto con la piel**. Eso permite
**marcar como no confiable** cualquier muestra tomada con la correa floja.

🔶 Casi ningún equipo va a tener un indicador de calidad del dato. Encaja exacto con
nuestro panel de "lo que no sé": *"esta lectura no cuenta, el sensor no hacía contacto."*

### 🔶 Qué hacemos sin HRV en vivo

| Opción | Veredicto |
|---|---|
| **Banda pectoral BLE** (Polar H10 y similares) | ✅ **Sí mandan RR.** Es la respuesta de producción. ⚠️ No la conseguimos hoy |
| **HRV desde los datos sintéticos** | ✅ Para el escenario de 180 días. **Declararlo** |
| **En vivo: FC, FC en reposo, SpO2 y respiración** | ✅ **Mi recomendación.** Sigue siendo captura real en el escenario |

La frase para la demo: *"el HRV necesita intervalos entre latidos. Este reloj no los
expone, así que en vivo verán frecuencia cardiaca y saturación reales; el HRV del
escenario es sintético. Con una banda pectoral saldría del mismo código — ya está
escrito."*

<details><summary>La prueba original, por si alguien la repite con otro reloj</summary>

### Procedimiento (15 minutos)

1. En el reloj: activar **modo de ahorro de batería** → `Ajustes` → **`Difusión de datos de FC`**
2. En Chrome **sobre Android** (no iOS), abrir una página con Web Bluetooth
3. Pedir el servicio `heart_rate` (`0x180D`) y suscribirse a `0x2A37`
4. **Mirar el primer byte de cada paquete:** el bit 4 (*RR-Interval Present*) dice si
   vienen intervalos RR

**Resultado y qué hacer:**

| Si… | Entonces |
|---|---|
| ✅ Llegan RR | HRV en vivo. El plan sigue completo |
| 🔴 Sólo llega lpm | HRV **sale de los datos sintéticos** y se dice en la demo |

</details>

🔶 **Plan B si la difusión falla por completo:** exportar desde Huawei Health e importar
el archivo. Menos vistoso, y el discurso de "sin red" se sostiene igual.

⚠️ **Y la advertencia de siempre:** Web Bluetooth **no existe en Safari sobre iOS**. El
teléfono de la demo tiene que ser **Android con Chrome**.

---

## 2. Revisión de las afirmaciones sobre radio en el espacio

Las revisé una por una. **Dos se sostienen, dos hay que reformular y una no debe citarse.**

### ✅ Sostiene: ICSIS existe y es relevante

Verificado hoy:

- **ICSIS = International Communication System Interoperability Standards**, uno de los
  *international deep space standards*, para comunicaciones interoperables entre
  vehículos, infraestructura de tierra y activos lunares.
- Su alcance publicado: **espectro, modulación, codificación, sincronización, ranging,
  audio, video, protocolos de red y transporte, *bundle protocol* para Delay Tolerant
  Networking, y seguridad.**
- Consistente con IOAG, SFCG y CCSDS. **ICSIS Rev B** aparece como vigente en una
  presentación de NASA de 2024.

🔥 **Y aquí hay un regalo para Fani:** ICSIS incluye explícitamente **bundle protocol para
DTN**. Su propuesta de usar DTN deja de ser una buena idea nuestra y pasa a estar
**respaldada por un estándar oficial de interoperabilidad de espacio profundo.** Eso es
una cita mucho más fuerte de la que teníamos.

### 🔴 NO citar: que ICSIS estandarice BLE para wearables médicos

**No pude confirmarlo, y el alcance publicado de ICSIS que encontré no menciona
Bluetooth, BLE ni wearables.** Menciona espectro y protocolos de red, no el perfil de un
sensor de muñeca.

🔶 **Regla:** no se cita ICSIS como respaldo de BLE a menos que alguien **abra el
documento Rev B y lea la sección**. Si un juez lo conoce y nos lo rebate, perdemos
credibilidad en todo lo demás que sí verificamos.

### ⚠️ Reformular: qué relojes han volado

No pude verificar que se hayan usado **Garmin fēnix 7, Samsung Galaxy Watch 5 ni Apple
Watch** en la ISS, Polaris Dawn o Inspiration4. No digo que sea falso: **digo que no lo
confirmé**, y los modelos concretos son lo más fácil de inventar.

**Lo que sí tenemos verificado por nuestra cuenta, y alcanza de sobra:**

- ✅ **Bio-Monitor y Astroskin** (CSA): hardware real de monitoreo, y conecta con la
  agencia socia del reto
- ✅ **Holter Monitor 2** y **Crew Active Dosimeter**: equipo real de vuelo, en los
  catálogos de Iker
- ✅ **ARCHeR** en Artemis II monitoreó **actividad y sueño** por actigrafía
- ✅ Los datos biomédicos de **Inspiration4** están abiertos en OSDR

🔶 Decir *"la CSA vuela el Bio-Monitor y Artemis II usó actigrafía"* es más fuerte y
verificable que nombrar modelos de reloj de consumo.

### ⚠️ Reformular: "el acelerómetro pierde sentido en microgravedad"

**El conteo de pasos sí pierde sentido.** El acelerómetro, no: ✅ la **actigrafía** es
justamente acelerometría, y **NASA la usa en vuelo** para sueño y actividad (ARCHeR,
`Standard Measures`).

🔶 La frase correcta: *"el conteo de pasos no aplica, pero la actigrafía sí: es lo que
NASA usó en Artemis II para sueño y actividad."* Más preciso y además nos sirve, porque
nuestro `01:V29` y `01:V3` dependen del acelerómetro.

### ⚠️ Matizar: el casco como jaula de Faraday y la separación de bandas

La física es razonable: la radiofrecuencia no necesita aire, las bandas ISM (2,4 y 5 GHz)
están separadas de las de telemetría crítica (S, Ku, Ka, UHF), y BLE emite del orden de
1–2,5 mW.

Pero **"el fuselaje evita que las ondas se fuguen al exterior" está exagerado**: un
módulo con ventanas, escotillas y pasamuros no es una jaula de Faraday perfecta.
⚠️ Y **no verifiqué SSP 30237** ni el detalle del *Joint Station LAN* de la ISS sobre
mover el tráfico pesado a 5 GHz. Son plausibles; no están confirmados.

### 🔴 Error técnico que conviene no repetir

La afirmación dice que **BLE usa *Adaptive Frequency Hopping* (AFH)**. **AFH es de
Bluetooth Classic**, con sus 79 canales. **BLE** usa 40 canales y selecciona con los
algoritmos **CSA #1 / CSA #2** más un mapa de canales que excluye los malos.

El concepto (esquivar canales ocupados) es correcto; **el nombre del mecanismo, no**. Es
exactamente el tipo de detalle que delata a quien no abrió la especificación.

---

## 3. 🔶 Cómo yo diría esto en el pitch

Versión con todo verificado, sin nada que nos puedan rebatir:

> "La captura biométrica va por Bluetooth Low Energy, que funciona en vacío porque es
> radiofrecuencia y no necesita aire, en la banda ISM de 2,4 GHz, separada de las bandas
> de telemetría crítica. La CSA ya vuela monitoreo biométrico con Bio-Monitor y Astroskin,
> y Artemis II recogió actividad y sueño por actigrafía. Todo el análisis corre local, así
> que el enlace sólo se usa entre el reloj y el teléfono: un metro de distancia, uno a dos
> milivatios."

Y si preguntan por el estándar de red:

> "Para la sincronización con Tierra seguimos **Delay Tolerant Networking con bundle
> protocol**, que está en el alcance publicado de **ICSIS Rev B**, el estándar de
> interoperabilidad de comunicaciones para espacio profundo."

**Nada de eso se puede rebatir, y todo lo verificamos nosotros.**

---

## Fuentes

- Huawei, difusión de datos de frecuencia cardiaca (menciona el WATCH 5 y el modo de ahorro): https://consumer.huawei.com/kh/support/content/en-us15827504/
- NASA, *International Deep Space Standards* (ICSIS): https://www.nasa.gov/international-deep-space-standards/
- NASA NTRS, comunicaciones de Gateway (alcance de ICSIS, incluido bundle protocol para DTN): https://ntrs.nasa.gov/api/citations/20210018935/downloads/GW_Comm_ICSSC_Paper.pdf
- NASA NTRS, presentación de interoperabilidad 2024 (ICSIS Rev B): https://ntrs.nasa.gov/api/citations/20240010829/downloads/Interoperability%20Lecture%208%2029%2024.pdf
- Validación de FC en reposo y HRV nocturnos en wearables de consumo contra ECG (*Physiological Reports* 2025, DOI 10.14814/phy2.70527): https://www.citedrive.com/en/discovery/validation-of-nocturnal-resting-heart-rate-and-heart-rate-variability-in-consumer-wearables/
- Perfil estándar BLE de ritmo cardiaco en una implementación abierta (referencia de GATT `0x180D` / `0x2A37`): https://github.com/xinxiangjueming/wear-os-heart-rate-broadcast
