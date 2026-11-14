# Las 77 variables asignadas: listado, origen, motivo y fuente

Mi asignación de `../ASIGNACION_VARIABLES_MONARCAS.md`, variable por variable.
**Generado desde los catálogos de Iker**, no transcrito a mano.

> **77 entradas, 75 variables reales.** Dos eran duplicados y se fusionaron
> (`../variables-diagnostico/DUPLICADOS.md`). Se listan al final para que el número
> cuadre con la asignación original.

## De dónde sale cada columna

| Columna | De dónde viene |
|---|---|
| Qué dato es · Para qué sirve · Unidad | **Texto de los catálogos de Iker**, recortado, no reescrito |
| Fuente | **Las referencias del propio catálogo**, cualificadas por archivo (`cat.01 [20][21]` no es lo mismo que `cat.04 [20]`) |
| Por qué está ahí | **La columna "Equipo" del catálogo**, que es la evidencia de cómo se mide. Donde añadí algo verificado por mí, va en una segunda línea con su marca |
| Origen | **Mi clasificación**, derivada de lo anterior |

⚠️ **Las referencias son las de cada catálogo.** Para ver a qué apunta `cat.01 [20]` hay
que abrir la bibliografía de `01-cardiovascular-sans-radiacion.md`. No las renumeré ni
las reescribí.

---

## Resumen de orígenes

| Origen | Nº | Qué significa |
|---|---:|---|
| ⌚ **Reloj** | 5 | Sensor óptico o acelerómetro. Automático |
| 🧠 **Modelo** | 1 | Estimado por algoritmo desde otra señal. **Ver sección siguiente** |
| ✍️ **Input** | 29 | Lo teclea, mide o responde una persona a bordo |
| 🛰️ **Nave** | 11 | Telemetría. La app **la consume**, no la mide |
| 🧮 **Cálculo** | 3 | Derivado de otras variables o del calendario |
| 🩺 **CMO** | 2 | Necesita al oficial médico o equipo operado por una persona |
| 🔴 **No a bordo** | 23 | Imagen o laboratorio. No se obtiene en vuelo |
| ⚪ **Fuera** | 1 | Requiere equipo ambulatorio de 24 h |
| ⟶ **Fusionada** | 2 | Duplicados unidos a su canónica |

---

# El modelo: cuál, y por qué es ligero

Sólo **una** variable se estima: `04:A2`, **frecuencia respiratoria desde el PPG**.

## 🔑 Lo primero: no es un modelo de IA, y eso es una ventaja

La estimación publicada de frecuencia respiratoria desde PPG **no usa redes neuronales**.
Es **procesamiento de señal clásico**. Para nosotros eso significa:

| | Red neuronal | Procesamiento de señal |
|---|---|---|
| Pesos que descargar | Megabytes | **Ninguno** |
| Motor de inferencia | ONNX, TensorFlow.js | **Ninguno** |
| Tiempo por ventana | Decenas de ms | **Milisegundos** |
| ¿Se puede auditar? | No | **Sí, línea por línea** |
| ¿Puede alucinar? | Sí | **No** |

🔶 Encaja exactamente con lo que ya decidimos para el motor de reglas: **auditable y
sin caja negra.** Si un juez pregunta "¿qué IA usan?", la respuesta honesta y fuerte es:
*"ninguna, y a propósito."*

## El algoritmo concreto: Smart Fusion

✅ **Karlen et al., "Multiparameter Respiratory Rate Estimation From the
Photoplethysmogram"**, *IEEE Transactions on Biomedical Engineering*.

Cómo funciona, verificado:

1. Del PPG se extraen **tres variaciones inducidas por la respiración**, con el
   algoritmo **Incremental-Merge Segmentation (IMS)**:
   - **RIFV** — variación de la frecuencia
   - **RIIV** — variación de la intensidad
   - **RIAV** — variación de la amplitud
2. **Cada una da su propia estimación** de frecuencia respiratoria.
3. Las tres se **fusionan promediándolas**.
4. 🔥 **Se calcula continuamente la desviación estándar entre las tres.** Las ventanas
   con alta varianza, o marcadas como artefacto, **se descartan**.

### 🔥 Por qué este algoritmo y no otro

El paso 4 es la razón. **El algoritmo dice "no sé" por sí solo**: cuando las tres
estimaciones no coinciden, descarta la ventana en vez de inventar un número.

Eso es **literalmente nuestro panel de "lo que no sé"**, implementado dentro del
estimador. No hay que añadirle nada: ya viene con su propia medida de confianza.

⚠️ **Lo que no pude confirmar:** he visto citado un umbral de descarte de **4
respiraciones/min** de desviación estándar, pero **no lo verifiqué en el paper
original**. Si se implementa, hay que abrir el artículo de Karlen y leer la sección de
Smart Fusion. **No poner esa cifra en una diapositiva sin comprobarla.**

### Su error, que hay que mostrar

✅ Un método de correlación cruzada con puntuación de calidad por varianza reporta
**sesgo cercano a cero y límites de concordancia de ±5,4 respiraciones/min**. Las
ventanas más largas reducen el error.

🔶 **±5,4 rpm es ancho** para un rango normal de 12–20. Por eso `04:A2` se muestra
**como banda y como tendencia contra la línea base propia, nunca como número absoluto.**

⚠️ Y el límite honesto: la mayoría de las validaciones son **sujetos sanos en
condiciones ideales**, y **el torso superior da mejor señal que la muñeca**.

### Dataset para validarlo

✅ **BIDMC PPG and Respiration Dataset** (PhysioNet): PPG con respiración de referencia,
licencia **Open Data Commons Attribution v1.0**, acceso abierto, DOI `10.13026/C2208R`.

---

## El segundo modelo candidato: VO2máx — ⚠️ recomendado NO usarlo como número

`01:V19` está en 🩺 CMO porque necesita cicloergómetro con análisis de gases. **Podría
bajar a Modelo** con la estimación clásica desde frecuencia cardiaca submáxima
(**nomograma de Åstrand-Ryhming**), que es una fórmula, no una red: ligerísima.

🔴 **Pero el error individual es demasiado grande.** Verificado:

- En adolescentes, el nomograma **sobreestimó considerablemente** el consumo pico.
- Un estudio de 40 hombres en cicloergómetro reportó un error estándar de estimación de
  **0,42 L/min**.
- Akalan y colegas atribuyen buena parte del error a las **diferencias individuales en
  la respuesta de la FC al ejercicio submáximo** — y su ecuación nueva no lo redujo tanto
  como esperaban.
- Las medias de grupo sí concuerdan razonablemente. **Los individuos, no.**

🔶 **Mi recomendación, y creo que es la salida elegante:** no mostrar un VO2máx estimado
en mL/kg/min. **Mostrar el cambio de la respuesta de FC al mismo esfuerzo submáximo
contra su propia línea base.**

Es decir, no decir *"tu VO2máx es 38"*, sino *"tu frecuencia cardiaca a la misma carga
subió 12 % respecto a tu basal"*. Un sesgo sistemático **se cancela** cuando comparas a
la persona consigo misma — que es justo lo que hace todo nuestro diseño. **Y así no
publicamos un número que sabemos que está mal.**

⚠️ Esto depende de `02:V52` (FC en ejercicio submáximo estandarizado), que es **de Leo**.
Hay que acordarlo con él.

---

# Listado completo

Ordenado por origen: primero lo que se puede construir, al final lo que no.

| Nº | ID | Qué dato es *(unidad)* | Para qué sirve | Origen | Por qué está ahí | Fuente |
|---:|---|---|---|---|---|---|
| 1 | `01:V3` | Frecuencia cardíaca en reposo *(lpm)* | Desacondicionamiento, hipovolemia, taquicardia | ⌚ Reloj | Reloj, Bio-Monitor, Holter Monitor 2<br>🔶 Definición nuestra: mediana de los 30 min más quietos del sueño | cat.01 [8][20][42][63] |
| 2 | `01:V29` | Minutos y tipo de ejercicio diario *(min, carga)* | Cumplimiento de la contramedida | ⌚ Reloj | Bio-Monitor, actigrafía, registro del equipo de ejercicio | cat.01 [3][55] |
| 3 | `01:V48` | Aumento de la frecuencia cardíaca al ponerse… *(lpm)* | Taquicardia postural, hipovolemia | ⌚ Reloj | Reloj o ECG | cat.01 [10][63] |
| 4 | `04:A3` | SpO2 *(%)* | Hipoxia, neumonía, inhalación de humo/tóxicos, despresurización | ⌚ Reloj | Pulsioxímetro del kit (ISS ALSP/AMP; Orion lo lista como…<br>✅ PPG de 2 longitudes de onda; ⚠️ no es grado médico | cat.04 [2][27][36][38][45c] |
| 5 | `04:A4` | Frecuencia cardiaca *(lpm)* | Fiebre, deshidratación, hipoxia, dolor, sepsis | ⌚ Reloj | Manguito automático (40–200 lpm, ±5 %), monitor Polar…<br>✅ Capturada en vivo del Huawei Watch 5 (`codigo/heart-rate.ts`) | cat.04 [27][36][45a] |
| 6 | `04:A2` | Frecuencia respiratoria *(resp/min)* | Infección respiratoria, hipoxia, tóxicos inhalados, dolor; adaptación… | 🧠 Modelo | Conteo manual; Bio-Monitor (frecuencia y volumen…<br>🧠 Estimada: el Watch 5 no la mide. Ver §Modelo | cat.04 [36][45a] · cat. 01: [42][55] |
| 7 | `01:V1` | Presión arterial sistólica / diastólica en… *(mmHg)* | Vasodilatación, hipovolemia, riesgo cardiovascular; **agudo:** choque… | ✍️ Input | Manguito braquial; registro ambulatorio de 24 h con equipo…<br>🔴 Sin manguito NO se estima: AHA 2025 lo desaconseja | cat.01 [20][21][55][61] · cat. 04:… |
| 8 | `01:V8` | Masa corporal *(kg)* | Pérdida de fluidos, balance energético | ✍️ Input | SLAMMD (exactitud 0,5 lb, rango 95–240 lb)<br>✅ SLAMMD: en microgravedad se mide masa inercial, no peso | cat.01 [3][53] |
| 9 | `01:V28` | Edema facial y congestión nasal o de cabeza… *(escala 0–10 o…)* | Desplazamiento cefálico de fluidos | ✍️ Input | Cuestionario; foto del rostro | cat.01 [4][7] |
| 10 | `01:V46` | Prueba de bipedestación (5 o 10 min) o de… *(sí/no, min)* | Intolerancia ortostática | ✍️ Input | Tras aterrizaje: tumbado 5 min, de pie, medir a 1 y 3 min…<br>⚠️ Sólo con gravedad: es prueba post-aterrizaje | cat.01 [8][10][30][60] |
| 11 | `01:V47` | Caída de la presión arterial al ponerse de pie *(mmHg)* | Hipotensión ortostática | ✍️ Input | Manguito a 1 y 3 min<br>⚠️ Sólo con gravedad | cat.01 [10][21][60] |
| 12 | `01:V50` | Síntomas de presíncope: mareo, náusea,… *(sí/no, escala)* | Presíncope | ✍️ Input | Cuestionario<br>⚠️ Sólo con gravedad | cat.01 [10][60] |
| 13 | `01:V52` | Carga de fluidos y sal antes de la reentrada *(mL (oz))* | Cumplimiento de la contramedida | ✍️ Input | Registro manual | cat.01 [3] |
| 14 | `01:V53` | Uso de prenda de compresión *(sí/no, mmHg)* | Contramedida | ✍️ Input | Registro manual | cat.01 [3][8] |
| 15 | `03:V21` | Cohesión percibida de tarea y social *(Cuestionario…)* | Deterioro del equipo | ✍️ Input | Diario en HFBP-EM (análogos e ISS); cuestionario… | cat.03 no encontrado |
| 16 | `03:V22` | Clima de grupo y de trabajo (GES, WES) *(Subescalas…)* | Cohesión, papel del líder | ✍️ Input | Semanal en ISS: 17 tripulantes y 128 de control de misión<br>🔴 BLOQUEADA: GES y WES son de pago (Mind Garden) | cat.03 no encontrado |
| 17 | `03:V23` | Desplazamiento de tensión hacia control de… *(Relación entre…)* | Conflicto tripulación-tierra | ✍️ Input | ISS y Mir (POMS, GES, WES)<br>🔴 BLOQUEADA: se apoya en POMS, GES y WES | cat.03 |
| 18 | `03:V24` | Conflicto diádico *(Recuento…)* | Conflicto interpersonal | ✍️ Input | Diario en HFBP-EM; usado en Mars-500 | cat.03 |
| 19 | `03:V25` | Seguridad psicológica *(Subescala de 7…)* | Clima de equipo | ✍️ Input | Semanal en HFBP-EM | cat.03 no encontrado |
| 20 | `03:V26` | Eficacia percibida del equipo *(Cuestionario…)* | Desempeño de equipo | ✍️ Input | Diario/semanal en HFBP-EM | cat.03 no encontrado |
| 21 | `03:V27` | Apoyo social *(Cuestionario…)* | Aislamiento social | ✍️ Input | HFBP-EM | cat.03 no encontrado |
| 22 | `03:V28` | Proximidad e interacción entre tripulantes *(Tiempo cerca…)* | Retraimiento, formación de subgrupos | ✍️ Input | "Sociometric badges" probadas en análogos<br>⚠️ No es cuestionario: requiere *sociometric badges* que no tenemos | cat.03 |
| 23 | `03:V53` | Karolinska Sleepiness Scale (KSS) *(1-9)* | Somnolencia momentánea | ✍️ Input | Usada en estudios de vuelo y aviación; ítem único<br>⚠️ Licencia no verificada | cat.03 no encontrado |
| 24 | `03:V54` | Samn-Perelli (fatiga) *(1 = totalmente…)* | Fatiga momentánea | ✍️ Input | Aviación; NASA la cita como escala de ítem único. Uso en…<br>⚠️ Licencia no verificada | cat.03 no encontrado |
| 25 | `03:V55` | Fatiga mental, agotamiento físico,… *(Escalas…)* | Fatiga | ✍️ Input | Reaction Self Test en ISS (n=24)<br>✅ Entre los mejores predictores del PVT en la ISS | cat.03 |
| 26 | `03:V56` | NASA-TLX *(6 subescalas…)* | Carga de trabajo y su origen | ✍️ Input | Recomendado por NASA en fase de diseño por ser diagnóstico<br>✅ NASA-TLX, de NASA Ames: licencia limpia | cat.03 Página oficial no abrió;… |
| 27 | `03:V57` | Escala Bedford *(1-10 (árbol de…)* | Sobrecarga cognitiva | ✍️ Input | Escala elegida por NASA para verificación<br>⚠️ Licencia no verificada | cat.03 no encontrado |
| 28 | `03:V58` | Esfuerzo físico percibido (Borg CR10) *(0-10)* | Sobrecarga física | ✍️ Input | Autoinforme<br>🔴 Licencia no verificada (Borg Perception): no incluir | cat.03 no encontrado |
| 29 | `03:V60` | Carga de trabajo autoinformada *(Escala visual)* | Sobrecarga | ✍️ Input | Reaction Self Test (solo tarde) | cat.03 |
| 30 | `04:A1` | Temperatura corporal *(°C)* | Infección, golpe de calor, respuesta inflamatoria | ✍️ Input | Termómetros orales desechables y termómetros de piel en… | cat.04 [25][27][28][45a][45d] |
| 31 | `04:A6` | Cefalea (sí/no, intensidad 0–10, hora) *(escala)* | CO2 elevado, adaptación espacial, desplazamiento de fluidos, CO | ✍️ Input | Autoinforme; cruzar con ppCO2 de cabina | cat.04 [1][4][20] |
| 32 | `04:A7` | Lista de síntomas por CO2 *(checklist)* | Hipercapnia | ✍️ Input | Autoinforme: cefalea, fatiga, malestar, mal sueño, náusea,… | cat.04 [4] |
| 33 | `04:A8` | Congestión nasal / "cabeza llena" *(sí/no, días)* | Adaptación espacial, CO2, alergia, infección respiratoria alta | ✍️ Input | Autoinforme | cat.04 [6][21] |
| 34 | `04:A9` | Síntomas de mal de adaptación espacial *(checklist)* | Space Adaptation Syndrome | ✍️ Input | Autoinforme: náusea, vómito, cefalea, malestar, vértigo | cat.04 [6][7] |
| 35 | `04:A29` | Umbral auditivo (audiometría) *(dB HL por…)* | Pérdida auditiva por ruido o neurosensorial | ✍️ Input | On-Orbit Hearing Assessment: EarQ (2000–2021), KUDUwave…<br>🔥 Audiometría por app (EarQ): implementable en la PWA | cat.04 [1][27][40] |
| 36 | `04:A23` | ppCO2 de cabina *(mmHg)* | Cefalea, fatiga, mal sueño | 🛰️ Nave | Sensores fijos; monitor portátil CDM (0,01–6,0 % vol.);… | cat.04 [2][4][27] |
| 37 | `04:A24` | CO2 inspirado en traje (PICO2) *(mmHg)* | Hipercapnia en EVA | 🛰️ Nave | Sensor del traje | cat.04 [2] |
| 38 | `04:A25` | O2 inspirado (PIO2) *(mmHg)* | Hipoxia / hiperoxia | 🛰️ Nave | Sensor ppO2; analizador portátil CSA-O2 | cat.04 [2][27] |
| 39 | `04:A26` | Presión total de cabina *(kPa / psia)* | Barotrauma, enfermedad por descompresión | 🛰️ Nave | Sensor de presión | cat.04 [2][8] |
| 40 | `04:A27` | Temperatura y humedad de cabina *(°C, % HR)* | Mucosas secas, erupciones por crecimiento microbiano, estrés térmico | 🛰️ Nave | Sensores de cabina | cat.04 [2] |
| 41 | `04:A28` | Ruido: dosis de 24 h *(dBA, % dosis)* | Pérdida auditiva, mal sueño, irritabilidad | 🛰️ Nave | Dosímetro acústico personal (Quest NoisePro, se lleva 24…<br>🔥 En la demo lo mide el micrófono del teléfono (Web Audio) | cat.04 [2][9][27] |
| 42 | `04:A30` | Productos de combustión (CO, HCN, HCl, HF) *(ppm)* | Incendio, inhalación de humo | 🛰️ Nave | CSA-CP | cat.04 [2][11][27] |
| 43 | `04:A31` | Contaminantes traza / tóxicos (amoníaco,… *(ppm, mg/m³)* | Irritación de ojos y vías aéreas, tos | 🛰️ Nave | Air Quality Monitor, kit de formaldehído, grab samples | cat.04 [2][11][27] |
| 44 | `04:A32` | Partículas en aire *(mg/m³)* | Irritación ocular y respiratoria | 🛰️ Nave | Monitor de partículas | cat.04 [2] |
| 45 | `04:A33` | Polvo lunar (<10 µm) *(mg/m³)* | Tos, estornudos, irritación ocular y nasal, abrasión | 🛰️ Nave | Monitor de polvo celeste [V2 6153] | cat.04 [2][12][44] |
| 46 | `04:A35` | Dosis de radiación personal *(mSv, mGy)* | Riesgo de cáncer, síndrome agudo, cataratas | 🛰️ Nave | Crew Active Dosimeter (bolsillo), HERA, M-42 EXT en Orion;…<br>✅ Evento real disponible: 119 SEP de DONKI en `datos/` | cat.04 [1][27][37] |
| 47 | `01:V6` | Resistencia vascular sistémica *(derivada (PAM…)* | Vasodilatación sistémica | 🧮 Cálculo | Calculada | cat.01 [20] |
| 48 | `03:V29` | Fase de misión (cuarto) *(Cuarto 1-4 de…)* | "Fenómeno del tercer cuarto" | 🧮 Cálculo | Calendario | cat.03 |
| 49 | `03:V59` | Horas de trabajo *(h/día; h/semana)* | Sobrecarga; "schedule creep" | 🧮 Cálculo | Planificación frente a horas reales | cat.03 |
| 50 | `01:V19` | VO2máx / VO2pico *(ml·min⁻¹·kg⁻¹)* | Capacidad aeróbica, aptitud para EVA | 🩺 CMO | Cicloergómetro con análisis de gases (Pulmonary Function…<br>🔶 Podría bajar a Modelo con estimación submáxima. Ver §Modelo | cat.01 [6][8][70] |
| 51 | `01:V23` | Tiempo de tránsito de la onda de pulso *(ms)* | Rigidez vascular / redistribución del gasto | 🩺 CMO | ECG + fotopletismografía<br>🔴 Su uso principal (estimar PA) desaconsejado por AHA 2025 | cat.01 [8][42] |
| 52 | `01:V4` | Volumen sistólico *(mL)* | Volumen central, precarga | 🔴 No a bordo | Ecocardiografía con Ultrasound 2 (GE Vivid-q) o… | cat.01 [8][20][53] |
| 53 | `01:V5` | Gasto cardíaco *(L/min)* | Carga circulatoria | 🔴 No a bordo | Reinhalación de gases o ecocardiografía | cat.01 [20] |
| 54 | `01:V7` | Volumen plasmático *(% de cambio o mL)* | Hipovolemia, riesgo de intolerancia ortostática | 🔴 No a bordo | Solo en tierra de forma rutinaria (métodos de dilución);… | cat.01 [3][8][41] |
| 55 | `01:V9` | Área seccional de la vena yugular interna *(mm²)* | Congestión venosa cefálica | 🔴 No a bordo | Ultrasonido 2D (GE Vivid-q) | cat.01 [16][27] |
| 56 | `01:V10` | Presión venosa yugular no invasiva *(mmHg)* | Presión venosa central/cefálica | 🔴 No a bordo | Ultrasonido con sonografía de compresión (VeinPress) | cat.01 [16] |
| 57 | `01:V11` | Volumen de la vena yugular *(% de cambio)* | Congestión cuello-cabeza | 🔴 No a bordo | Ultrasonido con captura de volumen | cat.01 [28] |
| 58 | `01:V12` | Área de la vena porta *(% de cambio)* | Desplazamiento de fluido esplácnico | 🔴 No a bordo | Ultrasonido abdominal | cat.01 [27][28] |
| 59 | `01:V13` | Área de la vena femoral *(% de cambio)* | Acumulación venosa pélvica | 🔴 No a bordo | Ultrasonido | cat.01 [27] |
| 60 | `01:V14` | Área de venas de la pantorrilla (tibial,… *(% de cambio)* | Vaciado venoso de piernas | 🔴 No a bordo | Ultrasonido | cat.01 [27] |
| 61 | `01:V15` | Velocidad en la vena cerebral media *(% de cambio…)* | Congestión venosa intracraneal | 🔴 No a bordo | Doppler con ultrasonido | cat.01 [28] |
| 62 | `01:V16` | Diámetro de la vena cava inferior *(cm)* | Estado de volumen | 🔴 No a bordo | Ultrasonido | cat.01 [69] |
| 63 | `01:V17` | Masa y volumen telediastólico del ventrículo… *(g / mL)* | Atrofia cardíaca | 🔴 No a bordo | Ecocardiografía en vuelo; resonancia solo en tierra | cat.01 [8][40] |
| 64 | `01:V18` | Fracción de eyección del ventrículo izquierdo *(%)* | Función sistólica | 🔴 No a bordo | Ecocardiografía con Ultrasound 2 (incluye speckle tracking) | cat.01 [53][72] |
| 65 | `01:V20` | Rigidez carotídea (índice β, coeficiente de… *(adimensional / %)* | Envejecimiento arterial | 🔴 No a bordo | Ultrasonido carotídeo + presión arterial | cat.01 [24][25][57] |
| 66 | `01:V21` | Grosor íntima-media carotídeo *(mm)* | Aterosclerosis subclínica; efecto degenerativo de la radiación | 🔴 No a bordo | Ultrasonido (captura de volumen guiada desde tierra) | cat.01 [8][25][26] |
| 67 | `01:V22` | Grosor íntima-media femoral *(mm)* | Remodelado arterial | 🔴 No a bordo | Ultrasonido | cat.01 [26] |
| 68 | `01:V24` | Resistencia a la insulina (HOMA-IR) y… *(índice /…)* | Riesgo cardiometabólico | 🔴 No a bordo | Sangre; prueba de tolerancia a la glucosa en el estudio…<br>🔥 Glucosa en Inspiration4 OSD-575 (pre/post vuelo, n=4) | cat.01 [8][24][57] |
| 69 | `01:V25` | Biomarcadores de estrés oxidativo e… *(varias)* | Daño vascular | 🔴 No a bordo | Sangre en ayunas y orina de 24–48 h (análisis en tierra)<br>🔥 Citoquinas en Inspiration4 OSD-575 (pre/post vuelo, n=4) | cat.01 [25] |
| 70 | `01:V26` | Renina y aldosterona *(varias)* | Regulación de volumen | 🔴 No a bordo | Sangre (tierra) | cat.01 [24][41] |
| 71 | `01:V30` | Parámetros de orina (densidad, pH, glucosa,… *(varias)* | Hidratación, función renal | 🔴 No a bordo | Kits de recogida de orina y kit de pH urinario en ISS;… | cat.01 [4][41][53] |
| 72 | `01:V49` | Índice volumen sistólico × presión… *(compuesto)* | Predice si se completará la prueba de inclinación | 🔴 No a bordo | Ecocardiografía o impedancia + manguito | cat.01 [30] |
| 73 | `01:V51` | Noradrenalina plasmática al ponerse de pie *(pg/mL)* | Respuesta simpática insuficiente | 🔴 No a bordo | Sangre (tierra) | cat.01 [3][10] |
| 74 | `04:A34` | Microbiología de aire, superficies y agua *(UFC)* | Riesgo infeccioso y alérgico | 🔴 No a bordo | Microbial Air Sampler, hisopos de superficie, kit de agua… | cat.04 [2][10][27] |
| 75 | `01:V2` | Descenso nocturno de la presión arterial (dip) *(mmHg)* | Regulación autonómica | ⚪ Fuera | Registro ambulatorio de 24 h<br>⚪ Requiere registro ambulatorio de 24 h | cat.01 [20] |
| 76 | `01:V27` | Frecuencia respiratoria | ⟶ fusionada en `04:A2` | ⟶ Fusionada | — | `DUPLICADOS.md` |
| 77 | `04:A5` | Presión arterial | ⟶ fusionada en `01:V1` | ⟶ Fusionada | — | `DUPLICADOS.md` |

---

## Fuentes de esta página (las mías, fuera del catálogo)

- Karlen et al., *Multiparameter Respiratory Rate Estimation From the Photoplethysmogram* (Smart Fusion, RIAV/RIIV/RIFV, IMS): https://www.researchgate.net/publication/235521997_Multiparameter_Respiratory_Rate_Estimation_From_the_Photoplethysmogram
- Estimación robusta de frecuencia respiratoria desde pulsioximetría: https://pmc.ncbi.nlm.nih.gov/articles/PMC6051482/
- Frecuencia respiratoria instantánea desde PPG de reflectancia (*Sensors* 2018): https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6264115/
- BIDMC PPG and Respiration Dataset (PhysioNet, ODC-By v1.0): https://physionet.org/content/bidmc/1.0.0/
- AHA 2025, dispositivos de presión sin manguito: https://www.ahajournals.org/doi/10.1161/HYPERTENSIONAHA.125.24822
- Validez del nomograma de Åstrand-Ryhming: https://pmc.ncbi.nlm.nih.gov/articles/PMC1858756
- Åstrand-Ryhming revisado (1986): https://www.sciencegate.app/document/10.1152/jappl.1986.61.3.1203
- Mind Garden, licencia de la Group Environment Scale: https://www.mindgarden.com/746-ges-license-to-administer.html
- NASA OSDR, misión SpaceX Inspiration4: https://osdr.nasa.gov/bio/repo/data/missions/SpaceX%20Inspiration4
- Huawei, difusión de datos de frecuencia cardiaca: https://consumer.huawei.com/kh/support/content/en-us15827504/
