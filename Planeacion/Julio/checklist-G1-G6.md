# Checklist cumplido · G1 (wearable) y G6 (telemetría de la nave)

Los ocho puntos del checklist del equipo, respondidos por grupo, más la **escalera de
obtención** por variable: qué lo da el reloj, qué lo estima un modelo, qué lo mide el
astronauta, qué necesita al CMO y qué sólo se sabe en Tierra.

✅ verificado · ⚠️ verificar · 🔶 decisión mía

---

## 0. La escalera de obtención

Pedido del equipo: *"las variables que no se puedan saber por el reloj, checa si hay algún
modelo; si de plano no, sería algo que evaluaría el médico en campo, o si no hay médico,
la NASA."* Queda así, y encaja con los niveles de escalamiento de
`comportamiento-del-software.md` §4:

| Nivel | Quién o qué lo obtiene | Latencia | Confianza |
|---|---|---|---|
| **N0** | Reloj o teléfono, automático | 0 | Depende del sensor |
| **N1** | **Modelo a bordo**, estimado de otra señal | 0 | **Con su error declarado** |
| **NT** | **Telemetría de la nave** | segundos | Alta, es instrumentación de vuelo |
| **N2** | El astronauta lo mide o lo reporta | minutos | Depende de la adherencia |
| **N3** | **CMO a bordo**: necesita operador entrenado o equipo | minutos a horas | Alta |
| **N4** | **Tierra / NASA**: sólo al regreso o por análisis en tierra | semanas | Máxima |

🔶 **Regla de interfaz:** cada valor en pantalla lleva su nivel. Un número **N1** no se
pinta igual que uno **N0**, porque no vale lo mismo. Eso es lo mismo que el botón de
procedencia del motor diagnóstico, aplicado a la captura.

---

## 1. 🔴 Veredicto sobre el modelo más tentador: presión arterial sin manguito

Es el caso que todo el mundo quiere resolver con el reloj, y es la razón por la que
`01:V23` (tiempo de tránsito de onda de pulso) existe en la literatura.

**La respuesta es no, y está respaldada por las autoridades clínicas:**

- ✅ Una **declaración científica de la AHA de 2025** y una **declaración de posición
  internacional de 2025** concluyen que **ninguna tecnología sin manguito ha demostrado
  exactitud adecuada para uso clínico**.
- ✅ La **guía de hipertensión AHA/ACC de 2025 recomienda NO usar** dispositivos sin
  manguito para diagnosticar o manejar hipertensión.
- ✅ No hay protocolos de validación generalmente aceptados. La AHA define seis pruebas
  necesarias: exactitud estática, posición, tratamiento, vigilia/sueño, ejercicio y
  recalibración.
- ✅ Una revisión de *Hypertension* de 2025: **no hay evidencia convincente** de que el
  análisis de onda de pulso y el tiempo de llegada de pulso aporten valor más allá del
  manguito o de los datos demográficos de calibración.
- ✅ Un estudio ambulatorio de 2025: la validez fue **insuficiente para uso clínico o de
  investigación de estrés, incluso con calibración individual**.

### 🔶 Qué hacemos con eso

**Presión arterial = N2 (el astronauta con manguito) o N3 (el CMO).** No la estimamos.

Y lo convertimos en argumento: *"revisamos si se podía estimar la presión arterial desde
el reloj. La AHA en 2025 dice que no, y su guía recomienda no hacerlo. Así que la pedimos
con manguito y lo decimos en pantalla."* **Un equipo que descarta una función citando la
evidencia se ve mejor que uno que la implementa sin saberlo.**

---

## 2. ✅ El modelo que SÍ funciona: frecuencia respiratoria desde PPG

`01:V27` y `04:A2`. **Se puede estimar, y hay método publicado.**

- ✅ El PPG tiene **tres modulaciones inducidas por la respiración**: intensidad,
  amplitud y frecuencia.
- ✅ Método: transformada wavelet *synchrosqueezed* sobre PPG de reflectancia
  (*Sensors* 2018, DOI `10.3390/s18113705`).
- ✅ Un método de correlación cruzada con puntuación de calidad por varianza reporta
  **sesgo cercano a cero y límites de concordancia de ~±5,4 respiraciones/min**.
  Segmentos más largos → menos error.
- ⚠️ La mayoría de los estudios son **sujetos sanos en condiciones ideales**. El
  movimiento sigue siendo problema. Y las **posiciones del torso superior dan mejor
  señal respiratoria que otras ubicaciones** — la muñeca no es torso superior.

### 🔶 Qué hacemos con eso

**N1, con su error en pantalla.** ±5,4 rpm es ancho para un rango normal de 12–20, así
que **sirve como tendencia contra su propia línea base, no como valor absoluto.**

Eso encaja con todo nuestro diseño: ya comparamos contra la línea base propia, no contra
umbrales terrestres. **Pero el número no se muestra solo: se muestra como banda.**

---

## 3. G1 · Wearable continuo — 7 variables

### Escalera por variable

| ID | Variable | Nivel | Cómo, y qué lo limita |
|---|---|---|---|
| `04:A4` | Frecuencia cardiaca | **N0** | PPG, detección de picos. Degrada con movimiento |
| `01:V3` | FC en reposo | **N0** | 🔶 Nuestra definición: mediana de los 30 min más quietos del sueño |
| `04:A3` | SpO2 | **N0** | PPG de dos longitudes de onda. ⚠️ **No es grado médico** |
| `01:V29` | Minutos y tipo de ejercicio | **N0** | Acelerómetro + zonas de FC |
| `01:V48` | Aumento de FC al ponerse de pie | **N0** | FC + acelerómetro detecta el cambio postural. **Es el que mejor sustituye a la prueba de bipedestación sin manguito** |
| `04:A2` | Frecuencia respiratoria | **N1** | Modulación respiratoria del PPG. **±5,4 rpm**. ✅ Aquí se fusionó `01:V27` |
| `01:V23` | Tiempo de tránsito de onda de pulso | **N3** | Necesita dos puntos de medición o ECG de referencia. **Un reloj solo no lo da de forma útil**, y su uso principal (estimar PA) está desaconsejado (§1) |

### Los ocho puntos

| # | Punto del checklist | Respuesta para G1 |
|---|---|---|
| 1 | Revisé mis variables y confirmé su significado | ✅ Hecho. **Y encontré 9 duplicados entre catálogos.** Los 2 que eran enteramente míos ya están fusionados; los otros 7 están reportados en `../variables-diagnostico/DUPLICADOS.md` |
| 2 | Unidades y método de medición | ✅ lpm · % · rpm · min · ms. Métodos en los catálogos de Iker; no reinvestigados |
| 3 | Fuentes primarias y criterios de referencia | ⚠️ **Todos son [T], terrestres.** Iker confirmó que no existe tabla pública de NASA de umbrales de signos vitales. Rotularlos así |
| 4 | Datasets reales y licencias | ✅ **BIDMC PPG and Respiration Dataset** (PhysioNet): PPG + respiración, licencia **Open Data Commons Attribution v1.0**, acceso abierto, DOI `10.13026/C2208R`. ⚠️ **CapnoBase** (42 registros de 8 min, PPG+ECG a 300 Hz) y **PPG-DaLiA** (15 sujetos, PPG de muñeca a 64 Hz): **licencia no confirmada**, hay que abrir su página |
| 5 | Directa, cálculo o estimación | ✅ **Directa:** A4, V3, A3, V29, V48. **Estimación:** V27/A2. **No obtenible:** V23 |
| 6 | Modelos preentrenados ejecutables | ✅ No hace falta red neuronal. Detección de picos, limpieza de artefactos y la transformada para respiración corren en el teléfono. 🔶 Es una ventaja: **nada que descargar, nada que explicar** |
| 7 | Limitaciones de vuelo y validez clínica | ✅ El reloj da **PRV, no HRV de ECG** · SpO2 no es grado médico · respiración ±5,4 rpm · todo degrada con movimiento · ⚠️ los umbrales son terrestres |
| 8 | Instrucciones reproducibles | 🔶 Pendiente: un comando de descarga de BIDMC y el fragmento de Web Bluetooth del perfil de ritmo cardiaco. **Va cuando exista el repo de código** |

---

## 4. G6 · Telemetría de la nave — 11 variables

### 🔴 El hallazgo que cambia el encuadre

**Nueve de las once no las mide la app: las consume.** No son medición nuestra, son
telemetría de la nave. Eso tiene tres consecuencias de diseño que nadie había escrito:

1. La app necesita un estado **"sensor no disponible"**, no un cero ni un hueco.
2. Los umbrales **sí son [A] oficiales**, y ya están en el catálogo 04 de Iker. **Es el
   único grupo donde no inventamos nada.**
3. 🔥 **Se puede cruzar síntoma contra sensor.** Si varios tripulantes reportan cefalea
   (`04:A6`) y el ppCO2 lee normal, **lo sospechoso es el sensor.** ✅ Con base real:
   cada +1 mmHg de ppCO2 **duplica** la probabilidad de cefalea (n=49). Katy propuso algo
   parecido; esto le pone el dato detrás.

### Escalera por variable

| ID | Variable | Nivel | Cómo, y si hay sustituto |
|---|---|---|---|
| `04:A28` | Ruido, dosis de 24 h | **N0 (teléfono)** | 🔥 **Micrófono + Web Audio API → dBA.** Implementable en la PWA hoy. El único de G6 que podemos medir de verdad |
| `04:A35` | Dosis de radiación personal | **NT + N0** | Crew Active Dosimeter (ISS y Artemis II). ✅ **El evento ya lo tenemos real**: 119 SEP de DONKI en `datos/` |
| `04:A23` | ppCO2 de cabina | **NT → N3** | Sensores fijos; portátil si fallan. **Sustituto parcial: sospecha por síntomas** (arriba). No es medición |
| `04:A25` | O2 inspirado | **NT → N3** | Sensor ppO2; analizador portátil CSA-CP |
| `04:A26` | Presión total de cabina | **NT** | ⚠️ El teléfono **tiene** barómetro, pero la web **no lo expone**. Requeriría app nativa. **Sin sustituto en PWA** |
| `04:A27` | Temperatura y humedad | **NT** | Sensores de cabina. Sin sustituto |
| `04:A24` | CO2 inspirado en el traje | **NT (traje)** | Sensor del traje. **Sin sustituto posible** |
| `04:A30` | Productos de combustión | **N3** | CSA-CP, instrumento portátil que opera una persona |
| `04:A31` | Contaminantes traza | **N3** | Air Quality Monitor, kit de formaldehído |
| `04:A32` | Partículas en aire | **NT / N3** | Monitor de partículas |
| `04:A33` | Polvo lunar (<10 µm) | **NT / N3** | Monitor de polvo celeste |

**Ninguna de las nueve NT/N3 se puede estimar desde el reloj.** No es falta de modelo: es
que la información no está en el cuerpo. Un astronauta no "siente" el formaldehído.

### Los ocho puntos

| # | Punto del checklist | Respuesta para G6 |
|---|---|---|
| 1 | Significado confirmado | ✅ Hecho, con los catálogos de Iker |
| 2 | Unidades y método | ✅ mmHg · kPa/psia · °C y %HR · dBA y % dosis · ppm · mg/m³ · UFC · mSv y mGy |
| 3 | Fuentes primarias y criterios | ✅ **El único grupo con umbrales [A] oficiales.** NASA-STD-3001 Vol. 2 (ya en Rev F, 2026-07-14). ppCO2 media de 1 h ≤ 3 mmHg; media de 7 días < 2,5 mmHg deja la cefalea < 1 % · temp/humedad entre 18 °C/75 % y 27 °C/25 % · polvo lunar < 0,3 mg/m³, marciano < 0,1 · radiación < 600 mSv de carrera y < 250 por evento solar |
| 4 | Datasets reales y licencias | ✅ **DONKI SEP**, 119 eventos de 2024 descargados, API pública de NASA con llave gratuita. ⚠️ **No encontré telemetría ambiental de cabina publicada como dataset abierto.** El resto del grupo es **simulado contra los umbrales [A]**, y hay que decirlo |
| 5 | Directa, cálculo o estimación | ✅ **Directa (teléfono):** A28. **Telemetría:** A23–A27, A32, A33. **Operada por persona:** A30, A31. **Dosímetro:** A35 |
| 6 | Modelos preentrenados | ✅ **Ninguno aplica, y es la respuesta correcta.** Para A28 basta el cálculo de dBA desde el micrófono. Para el resto, ningún modelo sustituye un sensor químico |
| 7 | Limitaciones | ✅ La app no mide 9 de 11: **las consume y puede quedarse sin ellas.** Necesita estado de "sensor no disponible". A26 imposible en PWA. ⚠️ Iker marcó tres tablas de PDF de este catálogo como ambiguas: **verificar antes de citar un número de A30–A33** |
| 8 | Instrucciones reproducibles | ✅ **Listo para DONKI:** `export NASA_API_KEY=...` y `python3 Planeacion/Julio/scripts/fetch_donki.py --desde 2024-01-01 --hasta 2024-12-31`. 🔶 Pendiente el fragmento de medición de dBA |

---

## 5. Lo que queda abierto, y a quién le toca

| Pendiente | Quién | Por qué importa |
|---|---|---|
| ⚠️ Licencia de **CapnoBase** y **PPG-DaLiA** | yo | Si no son abiertas, no se usan. BIDMC ya sirve de respaldo |
| ⚠️ Verificar las **3 tablas ambiguas** del catálogo 04 (A30–A33) | Iker o yo | Un número mal extraído de un PDF en una diapositiva es un error detectable |
| ✅ **Duplicados** | hecho | Barrido completo en `../variables-diagnostico/DUPLICADOS.md`: 2 fusionados, 7 reportados. 🔴 **El ppCO2 está TRIPLICADO** (`01:V87`, `03:V77`, `04:A23`) |
| 🔶 Fragmento de dBA desde micrófono | quien haga la UI | Es la única medición ambiental real que podemos demostrar |
| ⚠️ Telemetría de cabina como dataset abierto | yo, baja prioridad | No la encontré. Si no existe, se declara simulada y ya |

## 6. 🔶 Lo que yo sacaría de esto para la presentación

Tres frases que salen del trabajo de estos dos grupos:

1. **"Revisamos si el reloj podía estimar la presión arterial. La AHA dice en 2025 que
   no, y su guía recomienda no hacerlo. Así que la pedimos con manguito."**
2. **"La frecuencia respiratoria sí se estima del PPG, con ±5,4 respiraciones por
   minuto. Por eso se muestra como banda y como tendencia, no como número."**
3. **"Nueve de las once variables ambientales no las medimos: las consume la app. Por eso
   tiene un estado de sensor no disponible, y por eso cruza los síntomas contra el
   sensor: si tres personas tienen cefalea y el CO2 lee normal, lo sospechoso es el
   sensor."**

Las tres dicen lo mismo: **sabemos de dónde viene cada número y cuánto vale.**

---

## Fuentes

- AHA, dispositivos sin manguito (declaración científica): https://www.ahajournals.org/doi/10.1161/HYPERTENSIONAHA.125.24822
- *Hypertension* 2025, "Cuffless Blood Pressure Measurement: Where Do We Actually Stand?": https://www.ahajournals.org/doi/10.1161/HYPERTENSIONAHA.125.24822
- Validación ambulatoria sin manguito (bio-impedancia, ICG, ECG): https://link.springer.com/article/10.1007/s00421-026-06404-5
- Frecuencia respiratoria instantánea desde PPG de reflectancia (*Sensors* 2018): https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6264115/
- PPG de muñeca, validación de FC y FR en cirugía abdominal (JMIR): https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9989911/
- **BIDMC PPG and Respiration Dataset** (PhysioNet, ODC-By v1.0): https://physionet.org/content/bidmc/1.0.0/
- Licencia de BIDMC: https://physionet.org/content/bidmc/1.0.0/LICENSE
- CCMC / NASA Goddard, DONKI: https://ccmc.gsfc.nasa.gov/tools/DONKI
