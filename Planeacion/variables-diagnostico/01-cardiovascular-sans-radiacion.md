# Catálogo de variables clínicas medibles — Bloque 01: cardiovascular, fluidos, SANS/neuro-ocular, radiación y hematología

Reto NASA Space Apps 2026 "Create Health Monitoring Software for Astronauts on Space Missions". Fecha de la investigación: 2026-11-14.

## Cómo leer este archivo

- **Una tabla por problema de salud.** Cada fila es una variable (numeradas V1…V118 de forma continua).
- **Columna "Normal / umbral de alerta":** cada umbral lleva una etiqueta de procedencia:
  - **[A]** = umbral o criterio definido por NASA o validado/observado en astronautas.
  - **[T]** = umbral clínico terrestre (guía o referencia clínica general); no validado en microgravedad.
  - **"no encontrado"** = no apareció en ninguna página que se pudo abrir.
- **Columna "Entrada en app":** manual (teclado/cuestionario), wearable, cámara, imagen de ultrasonido, laboratorio a bordo, dosímetro/telemetría, calculado (derivado de otras variables), perfil (dato fijo del tripulante).
- **Fuentes:** los números entre corchetes [n] remiten a la lista numerada del final, con URL. Todas las fuentes se abrieron durante esta investigación; el método de acceso de cada una está anotado en la lista.
- **No se repite** lo que el equipo ya tiene (precisión de relojes, umbrales terrestres de ONSD 5,0–6,4 mm, caso del trombo yugular, CIPHER / Venous Haemostasis / Thigh Cuff, SANS ~70 %, neutrones ~30 %). Donde una variable ya existente aparece, es solo para añadir un dato nuevo.

### Avisos de fiabilidad (leer antes de usar los números)

1. **Casi todos los umbrales de alerta son terrestres.** Los únicos umbrales realmente definidos para astronautas son: límites de dosis de radiación (NASA-STD-3001), ΔTRT por OCT (19,4 µm y 55 µm), cambio refractivo ≥ +0,75 D, presión de apertura de LCR (18 / 25 cmH2O), VO2máx mínimo en misión, clasificación de flujo yugular (grados 1–4), criterio de presíncope (PAS < 70 mmHg) y ppCO2 de cabina.
2. **Los tamaños de muestra son pequeños** (n = 3 a 14 en la mayoría de estudios en vuelo). Las magnitudes son orientativas, no rangos de referencia.
3. **Estudios que se contradicen:** rigidez carotídea y grosor íntima-media aumentan en dos cohortes (n = 8 y n = 10) y no cambian en una tercera (n = 13) [8][24][25][26].
4. **Cifras que difieren entre fuentes NASA:** SANS 70 % / 18 % clínicamente preocupante [2] frente a 71 % / 16 % [5]; edema de disco "clínicamente significativo" ~15 % [9] frente a "casos leves a graves" 66 % [58] (definiciones distintas: fundoscopia frente a OCT).
5. **Prueba de inclinación en el día de aterrizaje:** el resumen del artículo original dice que completaron la prueba 2 de 6 astronautas de ISS y 52 de 65 de Shuttle [30]; el informe de evidencia lo expresa como 4 de 6 (66 %) y 13 de 66 (20 %) que no la completaron [10]. Es el mismo dato con un denominador distinto en Shuttle.
6. **Umbral de dosis del síndrome agudo:** CDC da > 0,7 Gy (síntomas leves desde 0,3 Gy) [47]; el informe de evidencia de NASA cita ICRP con 0,1–0,2 Gy como dosis de 1 % de incidencia [12]. Se dan ambos.

---

## 1. Desacondicionamiento cardiovascular, hipovolemia y desplazamiento cefálico de fluidos

| # | Variable | Unidad | Cómo se mide en vuelo / equipo | Qué señala | Normal / umbral de alerta | Cambio en vuelo (magnitud, n) | Entrada en app | Fuente |
|---|---|---|---|---|---|---|---|---|
| V1 | Presión arterial sistólica / diastólica en reposo | mmHg | Manguito braquial; registro ambulatorio de 24 h con equipo portátil en ISS; manguito automático oscilométrico (20–280 mmHg, ±3 mmHg o 2 %); BP/ECG; el Bio-Monitor (CSA) también registra presión arterial | Vasodilatación, hipovolemia, riesgo cardiovascular; **agudo:** choque séptico o anafilaxia, intolerancia ortostática | [T] Normal < 120 y < 80; elevada 120–129 y < 80; hipertensión estadio 1: 130–139 u 80–89; estadio 2: ≥ 140 o ≥ 90; grave > 180 y/o > 120 (ACC/AHA). **Rango agudo de referencia:** 90/60–120/80 mmHg | Media de 24 h: sistólica −8 ± 2, diastólica −9 ± 2, media −10 ± 3 mmHg (n = 8, días 85–192). Otro estudio: sistólica de 24 h 120 ± 10 → 106 ± 9 mmHg | Manual o wearable | [20][21][55][61] · cat. 04: [27][36][45a] |
| V2 | Descenso nocturno de la presión arterial (dip) | mmHg | Registro ambulatorio de 24 h | Regulación autonómica | Umbral: no encontrado | Dip nocturno 8 ± 3 mmHg, conservado en vuelo (n = 8) | Wearable / calculado | [20] |
| V3 | Frecuencia cardíaca en reposo | lpm | Reloj, Bio-Monitor, Holter Monitor 2 | Desacondicionamiento, hipovolemia, taquicardia | [T] Taquicardia sinusal inapropiada: FC en reposo > 100 lpm y media de 24 h > 90 lpm. [A] no encontrado | Sin cambio en vuelo (n = 8 astronautas; n = 8 cosmonautas). Bradicardia relativa en vuelos largos frente a cortos | Wearable | [8][20][42][63] |
| V4 | Volumen sistólico | mL | Ecocardiografía con Ultrasound 2 (GE Vivid-q) o reinhalación de gases (Pulmonary Function System) | Volumen central, precarga | Umbral: no encontrado | +35 ± 10 % entre los meses 3–6 respecto a sentado en tierra (n = 8). Similar al valor supino previo al vuelo | Imagen de ultrasonido | [8][20][53] |
| V5 | Gasto cardíaco | L/min | Reinhalación de gases o ecocardiografía | Carga circulatoria | Umbral: no encontrado | +41 ± 9 % (n = 8) | Imagen de ultrasonido / calculado | [20] |
| V6 | Resistencia vascular sistémica | derivada (PAM / gasto) | Calculada | Vasodilatación sistémica | Umbral: no encontrado | −39 ± 4 % (n = 8) | Calculado | [20] |
| V7 | Volumen plasmático | % de cambio o mL | Solo en tierra de forma rutinaria (métodos de dilución); en vuelo solo estudios puntuales | Hipovolemia, riesgo de intolerancia ortostática | Umbral: no encontrado | Reducción de ~15 % del volumen intravascular en < 2 días; disminuye ya a las 21 h del lanzamiento (n = 7); déficit de 5–19 % tras vuelos Shuttle; reposo en cama reproduce 4–17 %. La pérdida no depende de la duración | Laboratorio (tierra) / calculado a partir de hematocrito | [3][8][41] |
| V8 | Masa corporal | kg; % respecto a la previa | SLAMMD (exactitud 0,5 lb, rango 95–240 lb) y **BMMD** (ruso; oscilación de muelle) · cat. 02: [5][29] | Pérdida de fluidos, balance energético, pérdida de tejido magro | [A, citando revisión militar] mantener la pérdida <3,3 % de la basal para evitar caída del rendimiento físico (cat. 02: [5]); pérdidas >10 % se registraron en Mir (cat. 02: [5]) | Apolo: la pérdida de peso reflejó la pérdida de volumen intravascular (magnitud: no encontrado). n=25: −4,4 % (BMMD) y −2,8 % (SLAMMD); pérdida en los primeros 30 días y luego estable; diferencia media entre equipos 1,1 kg (cat. 02: [29]). Resumen NASA: 2–5 % en el primer mes (cat. 02: [6]); media 2,4 % por cada 100 días (cat. 02: [5]) | Manual / DEV | [3][53] · cat. 02: [5][6][29] |
| V9 | Área seccional de la vena yugular interna | mm² | Ultrasonido 2D (GE Vivid-q) | Congestión venosa cefálica | [A] Referencia previa al vuelo: sentado 9,8; supino 80,7; inclinación 15° cabeza abajo 107,7 (n = 11). Umbral de alerta: no encontrado | Día ~50: 70,3; día ~150: 60 (n = 11). Otro estudio: +178 % (día 15) y +225 % (4–5,5 meses) (n = 10). Con LBNP 25 mmHg: 44,7 y 42,7 | Imagen de ultrasonido | [16][27] |
| V10 | Presión venosa yugular no invasiva | mmHg | Ultrasonido con sonografía de compresión (VeinPress) | Presión venosa central/cefálica | [A] Referencia previa: sentado 5,1; supino 17,3; cabeza abajo 20,7. Umbral: no encontrado. El método sobreestima el valor absoluto; sirve para comparación relativa | Día ~50: 21,1; día ~150: 15,8 (n = 11) | Imagen de ultrasonido + manual | [16] |
| V11 | Volumen de la vena yugular | % de cambio | Ultrasonido con captura de volumen | Congestión cuello-cabeza | Umbral: no encontrado | +46 ± 48 % (día 45) y +43 ± 43 % (día 150) frente a supino previo; +646 % y +702 % frente a sentado (n = 14). LBNP −25 mmHg lo devuelve al nivel supino previo | Imagen de ultrasonido | [28] |
| V12 | Área de la vena porta | % de cambio | Ultrasonido abdominal | Desplazamiento de fluido esplácnico | Umbral: no encontrado | +36 % y +45 % (n = 10); +51 ± 56 % y +100 ± 74 % (n = 14) | Imagen de ultrasonido | [27][28] |
| V13 | Área de la vena femoral | % de cambio | Ultrasonido | Acumulación venosa pélvica | Umbral: no encontrado | +124 % (día 15) y +169 % (4–5,5 meses) (n = 10) | Imagen de ultrasonido | [27] |
| V14 | Área de venas de la pantorrilla (tibial, gastrocnemio) | % de cambio | Ultrasonido | Vaciado venoso de piernas | Umbral: no encontrado | Tibial −45 % y −52 %; gastrocnemio −68 % y −55 % (n = 10). Todo vuelve a la basal 4 días tras el regreso | Imagen de ultrasonido | [27] |
| V15 | Velocidad en la vena cerebral media | % de cambio (cm/s) | Doppler con ultrasonido | Congestión venosa intracraneal | Umbral: no encontrado | +44 ± 31 % (día 45) y +115 ± 116 % (día 150) (n = 14) | Imagen de ultrasonido | [28] |
| V16 | Diámetro de la vena cava inferior | cm | Ultrasonido | Estado de volumen | [T] no encontrado (la guía ASE no se pudo abrir). [A] no encontrado | En vuelo parabólico no se detectó diferencia entre 1 G sentado y gravedad parcial (n = 9). Valor en vuelo orbital: no encontrado | Imagen de ultrasonido | [69] |
| V17 | Masa y volumen telediastólico del ventrículo izquierdo | g / mL | Ecocardiografía en vuelo; resonancia solo en tierra | Atrofia cardíaca | Umbral: no encontrado | Reposo en cama: masa −8,0 ± 2,2 % a 6 semanas; volumen telediastólico −14 ± 1,7 % a 2 semanas. ISS (datos preliminares): reducción de masa tras 4–6 meses doble que en vuelos cortos, sin recuperación completa al día 3 | Imagen de ultrasonido | [8][40] |
| V18 | Fracción de eyección del ventrículo izquierdo | % | Ecocardiografía con Ultrasound 2 (incluye speckle tracking) | Función sistólica | [T] no encontrado (guía ASE inaccesible). [A] no encontrado | En vuelo: no encontrado. Inmersión seca de 4 días: disminuye (n = 18) | Imagen de ultrasonido | [53][72] |
| V19 | VO2máx / VO2pico | ml·min⁻¹·kg⁻¹ | Cicloergómetro con análisis de gases (Pulmonary Function System) | Capacidad aeróbica, aptitud para EVA | [A] Mínimo en misión ≥ 32,9 (EVA en microgravedad) y ≥ 36,5 (EVA en superficie) — NASA-STD-3001 | −15 % en estudios previos frente a −6 % con ejercicio vigoroso (según informe de evidencia). Gasto cardíaco máximo −7,8 ± 9,1 % tras ~6 meses (n = 9) | Manual / laboratorio a bordo | [6][8][70] |
| V20 | Rigidez carotídea (índice β, coeficiente de distensibilidad) | adimensional / % | Ultrasonido carotídeo + presión arterial | Envejecimiento arterial | Umbral: no encontrado | +17–30 % de rigidez en las 38 h tras el regreso (n = 8), comparable a 10–20 años de envejecimiento según CSA; sin cambio en otra cohorte (n = 13) | Imagen de ultrasonido + calculado | [24][25][57] |
| V21 | Grosor íntima-media carotídeo | mm | Ultrasonido (captura de volumen guiada desde tierra) | Aterosclerosis subclínica; efecto degenerativo de la radiación | [T] Anormal > 0,9 mm; sugestivo de placa difusa > 1,5 mm (citado en el informe de evidencia de NASA). Ningún astronauta superó 0,9 mm | +12 ± 4 % en todos (n = 10), sigue elevado 4 días después; sin cambio en otra cohorte (n = 13) | Imagen de ultrasonido | [8][25][26] |
| V22 | Grosor íntima-media femoral | mm | Ultrasonido | Remodelado arterial | Umbral: no encontrado | Aumenta en vuelo, vuelve a la basal 4 días después (n = 10); magnitud: no encontrado | Imagen de ultrasonido | [26] |
| V23 | Tiempo de tránsito de la onda de pulso | ms | ECG + fotopletismografía | Rigidez vascular / redistribución del gasto | Umbral: no encontrado | Disminuye en vuelo (n = 8 cosmonautas, 162–196 días); magnitud: no encontrado | Wearable / calculado | [8][42] |
| V24 | Resistencia a la insulina (HOMA-IR) y glucosa tras sobrecarga oral | índice / mmol·L⁻¹ | Sangre; prueba de tolerancia a la glucosa en el estudio Vascular Aging | Riesgo cardiometabólico | Umbral: no encontrado | HOMA-IR casi +60 % en vuelo; mayor en hombres (n = 8) | Laboratorio a bordo / manual | [8][24][57] |
| V25 | Biomarcadores de estrés oxidativo e inflamación | varias | Sangre en ayunas y orina de 24–48 h (análisis en tierra) | Daño vascular | Umbral: no encontrado | Aumentan en vuelo y casi todos vuelven a la basal en 1 semana (n = 13) | Laboratorio (tierra) | [25] |
| V26 | Renina y aldosterona | varias | Sangre (tierra) | Regulación de volumen | Umbral: no encontrado | Aumento mayor en mujeres (n = 8). Vuelo corto: bajan en las primeras horas, renina sube 1 semana después (n = 7) | Laboratorio (tierra) | [24][41] |
| V27 | ⟶ **FUSIONADA en `04:A2`** — misma medición (frecuencia respiratoria). Su método y su cambio en vuelo se trasladaron allí | — | — | — | — | — | — | — |
| V28 | Edema facial y congestión nasal o de cabeza (autorreporte) | escala 0–10 o sí/no | Cuestionario; foto del rostro | Desplazamiento cefálico de fluidos | Umbral: no encontrado. "Más allá de lo nominal" es criterio de sospecha de trombosis (ver V58) | Hinchazón facial y congestión descritas como efectos comunes; frecuencia: no encontrado | Manual / cámara | [4][7] |
| V29 | Minutos y tipo de ejercicio diario | min, carga | Bio-Monitor, actigrafía, registro del equipo de ejercicio | Cumplimiento de la contramedida | Umbral: no encontrado | Contramedida principal contra atrofia e intolerancia ortostática | Wearable / manual | [3][55] |
| V30 | Parámetros de orina (densidad, pH, glucosa, proteína, cetonas, sangre) | varias | Kits de recogida de orina y kit de pH urinario en ISS; analítica de sangre y orina en vuelo en L+180 días | Hidratación, función renal | Umbral: no encontrado | Vuelo corto: baja la ingesta de líquidos, sube la filtración glomerular los 2 primeros días (n = 7) | Manual / laboratorio a bordo | [4][41][53] |

---

## 2. Arritmias (fibrilación auricular, QT)

| # | Variable | Unidad | Cómo se mide en vuelo / equipo | Qué señala | Normal / umbral de alerta | Cambio en vuelo (magnitud, n) | Entrada en app | Fuente |
|---|---|---|---|---|---|---|---|---|
| V31 | Ritmo cardíaco (fibrilación auricular sí/no) | categórica | Holter Monitor 2 (ECG ambulatorio hasta 24 h); ECG de 12 derivaciones solo en selección y anual; ECG de reloj (ya en vuestro catálogo) | Fibrilación auricular | [A] Prevalencia en astronautas activos ≈ 5 %, similar a la población general pero a menor edad | Ningún caso en 13 astronautas con Holter de 48 h durante 6 meses | Wearable | [4][22][53] |
| V32 | Extrasístoles supraventriculares | n/24 h | Holter | Riesgo de fibrilación auricular | Umbral: no encontrado | Sin aumento significativo (n = 13); un astronauta tuvo un gran aumento | Wearable | [8][22] |
| V33 | Extrasístoles ventriculares y taquicardia ventricular | n/24 h, episodios | Holter | Arritmia ventricular | Umbral: no encontrado | Casos aislados en Skylab, Mir y durante EVA; un cosmonauta regresó antes por taquicardia supraventricular persistente; un astronauta de ISS con aumento de arritmias ventriculares (n = 13) | Wearable | [8] |
| V34 | Intervalo QTc (Bazett) | ms | ECG (derivación II preferida; V5, V6 o I como alternativa) | Repolarización ventricular, riesgo de arritmia | [T] Normal 350–450 (hombres), 360–460 (mujeres); riesgo de arritmia ≥ 500; QT corto ~330. [A] El estudio en astronautas usó > 440 ms como "clínicamente significativo" | QTc > 440 ms aparece durante el primer mes de vuelo largo y persiste hasta 3 días tras el aterrizaje (Holter n = 3; ECG pre/post en 4–6 meses). No ocurre tras vuelos cortos. Magnitud en ms: no encontrado | Wearable (ECG de reloj) / manual | [11][23][62] |
| V35 | Intervalo PR | ms | ECG | Conducción auriculoventricular | Umbral: no encontrado | Prolongado tras vuelo largo (p < 0,01); acortado tras vuelo corto | Wearable / manual | [23] |
| V36 | Volumen de la aurícula izquierda | mL | Resonancia (solo en tierra); ecocardiografía en vuelo | Sustrato de fibrilación auricular | Umbral: no encontrado | +12 ± 18 mL transitorio tras 6 meses (n = 13); aurícula derecha sin cambio | Imagen de ultrasonido | [22] |
| V37 | Onda P promediada (duración filtrada, voltaje RMS de los últimos 20 ms, amplitud) | ms / µV | ECG de alta resolución con promediado de señal | Electrofisiología auricular | Umbral: no encontrado | El voltaje RMS de los últimos 20 ms disminuye todos los días de vuelo; la duración no cambia (n = 13) | Wearable de alta resolución | [22] |
| V38 | Alternancia de la onda T (microvoltios) | positivo/negativo | Prueba de esfuerzo con ECG (solo en tierra) | Riesgo de muerte súbita | Umbral: no encontrado | Reposo en cama: positivos de 17 % (4 de 24) a 42 % (10 de 24) | Laboratorio (tierra) | [8][11] |
| V39 | Potasio sérico y urinario | mmol/L | Sangre y orina (análisis en tierra; a bordo no confirmado) | Hipopotasemia, arritmia | Umbral: no encontrado | Apolo: sérico −7 %, urinario −47 %. Día de aterrizaje: más bajo que antes pero dentro del rango clínico (5 Shuttle + 7 Mir) | Laboratorio | [8][11] |
| V40 | Magnesio sérico y urinario | mmol/L | Sangre y orina (tierra) | Arritmia | Umbral: no encontrado | Urinario elevado las 2 primeras semanas; sérico elevado tras 3–4 meses; ambos más bajos el día de aterrizaje | Laboratorio (tierra) | [8] |
| V41 | Calcio sérico | mmol/L | Sangre (tierra) | Trastorno electrolítico | Umbral: no encontrado | Sin cambio antes-después (5 Shuttle + 7 Mir) | Laboratorio (tierra) | [8] |
| V42 | Fármacos a bordo que prolongan el QT | lista sí/no | Registro de medicación | Riesgo de QT largo | Disponibles en ISS: ciprofloxacino, haloperidol, propranolol, verapamilo, azitromicina, sertralina, nortriptilina | El 94 % de los astronautas registra haber tomado alguna medicación en vuelo | Manual | [8] |
| V43 | Variabilidad de la frecuencia cardíaca (ya en vuestro catálogo) | ms | Reloj, Holter | Control autonómico | Umbral: no encontrado | Dato nuevo: bandas de baja y alta frecuencia sin cambio en vuelo (n = 8); con respiración controlada a 6/min disminuye en 6 de 7; el mayor cambio ocurre tras el aterrizaje | Wearable | [42] |
| V44 | Catecolaminas plasmáticas | pg/mL | Sangre (tierra) | Tono simpático | Umbral: no encontrado | Sin cambio en vuelo (n = 8) | Laboratorio (tierra) | [8][20] |
| V45 | Síntomas: palpitaciones, síncope, dolor torácico | sí/no, frecuencia | Cuestionario | Arritmia sintomática | Umbral: no encontrado | Frecuencia en vuelo: no encontrado | Manual | [63] |

---

## 3. Intolerancia ortostática (al volver a un campo gravitatorio)

Nota: las pruebas de bipedestación e inclinación necesitan gravedad; sirven tras el aterrizaje o en superficie lunar/marciana, no en microgravedad.

| # | Variable | Unidad | Cómo se mide en vuelo / equipo | Qué señala | Normal / umbral de alerta | Cambio en vuelo (magnitud, n) | Entrada en app | Fuente |
|---|---|---|---|---|---|---|---|---|
| V46 | Prueba de bipedestación (5 o 10 min) o de inclinación a 80° (10 min): completada sí/no y tiempo tolerado | sí/no, min | Tras aterrizaje: tumbado 5 min, de pie, medir a 1 y 3 min (protocolo CDC). Solo con gravedad | Intolerancia ortostática | [A] Presíncope = mareo, náusea, visión en túnel o sistólica < 70 mmHg. [T] Anormal si aparece mareo | Día de aterrizaje: 4 de 6 astronautas de ISS no completan 10 min; ~20 % en Shuttle; 20–30 % en vuelos cortos y 83 % en largos (Mir). Día +1: 8 de 9 completan; día +3: 13 de 15. Mujeres > 80 % frente a ~20 % de hombres presincopales | Manual + wearable | [8][10][30][60] |
| V47 | Caída de la presión arterial al ponerse de pie | mmHg | Manguito a 1 y 3 min | Hipotensión ortostática | [T] Caída sistólica ≥ 20 o diastólica ≥ 10 mmHg. [A] Sistólica < 70 mmHg = presíncope | Con contramedidas actuales, ningún episodio de hipotensión en actividades diarias en las primeras 24 h (n = 12) | Manual / wearable | [10][21][60] |
| V48 | Aumento de la frecuencia cardíaca al ponerse de pie | lpm | Reloj o ECG | Taquicardia postural, hipovolemia | [T] ≥ 30 lpm sostenido > 30 s sin hipotensión ortostática (criterio de taquicardia postural). [A] no encontrado | Aumenta tras el vuelo en prueba de 5 min; magnitud: no encontrado | Wearable | [10][63] |
| V49 | Índice volumen sistólico × presión diastólica de pie | compuesto | Ecocardiografía o impedancia + manguito | Predice si se completará la prueba de inclinación | Umbral: no encontrado | Alterado de forma similar en ISS y Shuttle; recuperación más lenta en ISS (n = 20 + 65) | Calculado | [30] |
| V50 | Síntomas de presíncope: mareo, náusea, visión en túnel, sudoración | sí/no, escala | Cuestionario | Presíncope | Cualquier síntoma = prueba anormal [T] | Ver V46 | Manual | [10][60] |
| V51 | Noradrenalina plasmática al ponerse de pie | pg/mL | Sangre (tierra) | Respuesta simpática insuficiente | Umbral: no encontrado | Los que no presentan presíncope tienen ~3 veces el valor de los normovolémicos; los presincopales no lo elevan | Laboratorio (tierra) | [3][10] |
| V52 | Carga de fluidos y sal antes de la reentrada | mL (oz) | Registro manual | Cumplimiento de la contramedida | [A] Protocolo: 24–48 oz de solución de agua con NaCl antes de la desorbitación, según peso | — | Manual | [3] |
| V53 | Uso de prenda de compresión | sí/no, mmHg | Registro manual | Contramedida | [A] Prenda graduada: ~55 mmHg en tobillo, ~30 en muslo, ~20 en abdomen; traje anti-G ~75 mmHg máximo | — | Manual | [3][8] |

---

## 4. Trombosis venosa yugular, estasis y flujo retrógrado

| # | Variable | Unidad | Cómo se mide en vuelo / equipo | Qué señala | Normal / umbral de alerta | Cambio en vuelo (magnitud, n) | Entrada en app | Fuente |
|---|---|---|---|---|---|---|---|---|
| V54 | Grado de flujo de la yugular interna izquierda | grado 1–4 | Doppler dúplex con Ultrasound 2; vigilancia ocupacional en L+30, L+60 y R−42 días | Estasis, flujo retrógrado | [A] Grado 1 = flujo anterógrado continuo; 2 = anterógrado pulsátil; 3 = estancado; 4 = retrógrado. El grado 3 es el indicador pretrombótico más preocupante; el 4 no se considera causa principal de trombo | Día ~50: 6 de 11 con grado 3 o 4 (5 estancado, 1 retrógrado). Vigilancia posterior: ~54 % de 22 tripulantes en grado 3–4. La yugular derecha es grado 2 de forma constante | Imagen de ultrasonido + manual | [4][5][16] |
| V55 | Trombo visible (material ecogénico intraluminal, vena no compresible) | sí/no | Ultrasonido 2D con compresión | Trombosis venosa | [A] Cualquier trombo = iniciar anticoagulación (apixabán 10 mg dos veces al día 7 días, luego 5 mg dos veces al día); sin EVA ni ejercicio resistivo ≥ 30 días | Vigilancia en 11 astronautas: ningún trombo | Imagen de ultrasonido | [4][29] |
| V56 | Ecogenicidad espontánea de la sangre en la yugular | ninguna / leve / moderada | Ultrasonido | Flujo lento, riesgo pretrombótico | Umbral: no encontrado | 6 de 11 con ecogenicidad leve-moderada en la izquierda; ninguno más que leve en la derecha | Imagen de ultrasonido | [29] |
| V57 | Velocidad pico en la yugular interna | cm/s | Doppler pulsado, con maniobras respiratorias | Flujo reducido | Umbral: no encontrado | Reducida en vuelo y mínima en la izquierda (n = 11); valores: no encontrado. 2 de 11 con flujo retrógrado | Imagen de ultrasonido | [29] |
| V58 | Síntomas de trombosis: hinchazón visible de la yugular, edema facial más allá de lo nominal, edema palpebral, midriasis, cefalea | sí/no | Cuestionario + foto de cuello y rostro | Trombosis sintomática | [A] Cualquiera de ellos entra en la evaluación de riesgo de NASA | El trombo puede ser asintomático | Manual / cámara | [4][5] |
| V59 | D-dímero | µg/L (ng/mL) | No disponible en ISS; el grupo de trabajo de NASA recomendó añadir un dispositivo portátil (viabilidad en microgravedad sin demostrar) | Trombosis activa | [T] Corte convencional 500 µg/L; ajustado por edad = edad × 10 en ≥ 50 años. Detectable 2 h después de formarse el trombo; vida media 8 h. Un positivo exige imagen | En vuelo: no encontrado | Laboratorio a bordo (futuro) / manual | [5][64] |
| V60 | Recuento de plaquetas | ×10⁹/L | Hemograma (tierra); a bordo no confirmado | Hipercoagulabilidad; también síndrome agudo por radiación | Umbral: no encontrado | Concentración aumentada junto con hematocrito por la pérdida de plasma | Laboratorio | [8][12] |
| V61 | Tiempo de protrombina y tiempo de tromboplastina parcial | s | Sangre (solo en tierra; selección y anual) | Cribado de coagulación | Umbral: no encontrado | En vuelo: no encontrado | Laboratorio (tierra) | [4] |
| V62 | Panel de trombofilia (factor V Leiden, protrombina G20210A, proteínas C y S, antitrombina, anticardiolipina, anti-β2 glicoproteína 1) | positivo/negativo | Sangre en tierra, una sola vez | Riesgo hereditario | [T] Riesgo relativo: factor V Leiden heterocigoto 4,9×, homocigoto 16×; déficit de proteína C o S 7×; antitrombina 16×; protrombina 3,8× | — | Perfil | [4] |
| V63 | Antecedente familiar de trombosis no provocada | sí/no | Historia clínica | Riesgo | [T] Familiar de primer grado < 50 años: hasta 2×; varios: hasta 4×; con otro factor: hasta 64× | — | Perfil | [4] |
| V64 | Anticoncepción hormonal combinada o terapia hormonal | tipo | Registro de medicación | Riesgo de trombosis | [T] Combinados de 1.ª y 2.ª generación: hasta 3,2× | Uso frecuente para suprimir la menstruación en vuelo | Perfil / manual | [4] |
| V65 | Hidratación (ingesta diaria de líquidos) | mL/día | Registro manual | Factor modificable con estasis | [A] Con estasis sin otros factores: vigilar más a menudo y asegurar hidratación (sin cifra) | Ingesta reducida en microgravedad | Manual | [4][41] |
| V66 | Respuesta del flujo yugular a presión negativa en la parte inferior del cuerpo (25 mmHg) | mejora / igual / empeora | Dispositivo Chibis-M + ultrasonido | Reversibilidad de la estasis | Umbral: no encontrado | Mejora en 10 de 17 sesiones, empeora en 2, igual en 5 | Imagen de ultrasonido + manual | [16] |

---

## 5. SANS (síndrome neuro-ocular) y presión intracraneal

Calendario en ISS: OCT, ultrasonido ocular y tonometría antes del vuelo, en los días 30 y 90 y 30 días antes del regreso, y después; agudeza visual, rejilla de Amsler y cuestionario antes y después (y en vuelo según el documento médico). La retinografía figura como "todavía no en órbita" en una fuente de 2023 [58], mientras que el informe técnico de 2024 lista fundoscopia antes, durante y después [2].

| # | Variable | Unidad | Cómo se mide en vuelo / equipo | Qué señala | Normal / umbral de alerta | Cambio en vuelo (magnitud, n) | Entrada en app | Fuente |
|---|---|---|---|---|---|---|---|---|
| V67 | Cambio del grosor retiniano total peripapilar (ΔTRT) | µm | OCT a bordo, guiada desde tierra | Edema del disco óptico (signo más temprano) | [A] ±19,4 µm = variabilidad normal; > 19,4 µm = primer signo de edema; ≥ 55 µm de aumento medio = indicación de punción lumbar tras el vuelo | 15 de 21 ojos (71 %) superan 19,4 µm. Misión de 1 año: +135 µm (día 90) y +45 µm (día 210) en 2 tripulantes | Imagen (OCT) / manual | [2][9][32] |
| V68 | Edema del disco óptico, grado de Frisén | 0–5 | Fundoscopia / retinografía | Edema clínicamente significativo | [A] Grado ≥ 1 = clínicamente significativo e indicación de punción lumbar tras el vuelo | ~15 % de tripulantes con grado ≥ 1 (90 % de ellos grado 1). Un caso unilateral tardó 20 meses en resolverse | Cámara / manual | [2][9] |
| V69 | Anchura mínima del anillo neurorretiniano | µm | OCT | Edema del nervio óptico | Umbral: no encontrado | +35,7 µm el día 150 (n = 11). Misión de 1 año: +149 y +56 µm el día 270 | Imagen (OCT) | [31][32] |
| V70 | Grosor coroideo (subfoveal o peripapilar) | µm | OCT | Congestión venosa ocular | [A] Referencia sentado antes del vuelo: 339 (IC 95 % 289–388). Umbral: no encontrado | +35 µm (374 en vuelo, n = 14); +43 µm el día 150 (n = 11); ~30 µm al mes (n = 13); hasta +174 µm en un individuo. Recupera en 3–6 meses. No cambia con 15 min de presión negativa | Imagen (OCT) | [9][31][33] |
| V71 | Pliegues coriorretinianos (presencia y si afectan a la fóvea) | sí/no | OCT o fundoscopia | Deformación mecánica; riesgo visual si es foveal | Umbral: no encontrado | ~20–25 % de tripulantes; 16 % casos leves a graves, 5 % en fóvea | Imagen (OCT) / cámara | [2][9][58] |
| V72 | Aplanamiento posterior del globo | sí/no, grado | Ultrasonido ocular en vuelo (menos fiable); resonancia en tierra | Presión sobre el polo posterior | Umbral: no encontrado | ~25 % (23 % en otra fuente); puede persistir > 7 años | Imagen de ultrasonido | [2][58] |
| V73 | Longitud axial del ojo | mm | Biometría óptica (solo en tierra, antes y después) | Acortamiento por aplanamiento | [T] 1 D de cambio refractivo ≈ 0,35 mm | −0,08 mm tras el vuelo (n = 11), −0,05 mm al año. Caso individual: −0,53 y −0,29 mm | Manual (tierra) | [9][31] |
| V74 | Profundidad de la cámara anterior | mm | Biometría óptica (tierra) | Cambio óptico | Umbral: no encontrado | −0,09 mm de media | Manual (tierra) | [9] |
| V75 | Refracción (equivalente esférico) | dioptrías | Refracción ciclopléjica en tierra; en vuelo se estima por qué gafas de potencia creciente necesita el tripulante (todos vuelan con ≥ 3 pares) | Desplazamiento hipermetrópico | [A] ≥ +0,75 D en una misión de 6 meses = desplazamiento excesivo | ~15 % lo alcanza; máximo documentado +2,00 D. Serie inicial: +0,50 a +1,75 D en 5 de 7 | Manual | [2][9][34][58] |
| V76 | Agudeza visual lejana y cercana | Snellen / logMAR | Optotipos en pantalla o cartilla a bordo | Deterioro visual funcional | [A] Todos los tripulantes han sido corregibles a 20/20 o mejor tras el vuelo. Umbral de alerta: no encontrado | Degradación referida por ~29 % (vuelos cortos) y ~60 % (largos) de ~300 astronautas; visión cercana reducida 57 % (autorreporte) | Cámara / manual | [2][34][58] |
| V77 | Rejilla de Amsler | normal / distorsión / escotoma | Rejilla impresa o en pantalla | Afectación macular, pliegues foveales | Umbral numérico: no encontrado (cualquier distorsión es hallazgo) | Frecuencia: no encontrado | Manual / pantalla | [2][58] |
| V78 | Campo visual (perimetría de umbral) | dB, mancha ciega | Equipo en despliegue en ISS desde 2024; antes solo en tierra | Agrandamiento de la mancha ciega | Umbral: no encontrado | Pérdida de campo detectada en 3 % de tripulantes justo tras el vuelo, resuelta | Laboratorio a bordo / manual | [2][58] |
| V79 | Presión intraocular | mmHg | Tonómetro manual a bordo, lo aplica el oficial médico con guía desde tierra | Diferencia de presión translaminar | [T] Normal 10–20 mmHg. [A] Referencia sentado antes del vuelo 14,4 (IC 95 % 13,5–15,2) | +1,3 mmHg en vuelo (n = 14); vuelve a 14,2 con presión negativa de 25 mmHg. Al entrar en microgravedad: +20–25 % a los 44 min y +92 % a los 16 min, luego se normaliza en días | Manual | [9][33][35][59][65] |
| V80 | Diámetro de la vaina del nervio óptico (ya en vuestro catálogo) | mm | Ultrasonido ocular | Presión intracraneal | Umbrales terrestres ya recogidos. [A] no encontrado | Dato nuevo: aumenta en vuelo con reversión parcial después; +0,5 mm con inclinación cabeza abajo aguda | Imagen de ultrasonido | [36] |
| V81 | Velocidad sistólica pico de la arteria central de la retina | cm/s | Doppler ocular | Hemodinámica ocular | Umbral: no encontrado | +5 cm/s (+50 %) en vuelo; +3 cm/s (+33 %) con inclinación cabeza abajo | Imagen de ultrasonido | [36] |
| V82 | Manchas algodonosas | n | Fundoscopia / retinografía | Isquemia focal de la capa de fibras | Umbral: no encontrado | 3 de 7 en la serie inicial; 8 casos documentados (6 en ojo izquierdo) | Cámara | [9][34] |
| V83 | Presión de apertura del líquido cefalorraquídeo | cmH2O | Punción lumbar, solo en tierra tras el vuelo | Hipertensión intracraneal | [A] > 18 = normal-alto; ≥ 25 = requiere valoración de tratamiento y de aptitud de vuelo. [T] Media en adultos de 20–49 años 15,6 ± 3,7 | 22, 21, 28 y 28,5 cmH2O en 4 astronautas con edema de disco, 12–60 días tras el vuelo. Nunca se ha medido en vuelo | Manual (tierra) | [2][9][34] |
| V84 | Fase de las otoemisiones acústicas por producto de distorsión | grados | Otoport Advance (a bordo de ISS) con sonda en el oído | Índice no invasivo de presión intracraneal | Umbral: no encontrado. Limitación: la colocación de la sonda afecta la repetibilidad | Aumento sistemático de la fase en vuelo frente a sentado en tierra (n = 5) | Laboratorio a bordo | [39][53] |
| V85 | Presión intracraneal directa | mmHg | Invasiva, solo en tierra | Referencia fisiológica | [T] Sentado 4 ± 1; supino 15 ± 2 (n = 8 pacientes con reservorio) | En microgravedad aguda (vuelo parabólico) baja 3,8 ± 2,9 mmHg respecto a supino, pero queda por encima del valor sentado | No aplicable | [9][37] |
| V86 | Síntomas visuales: visión cercana borrosa, escotoma, cefalea | sí/no, escala | Cuestionario ocular | SANS sintomático | Umbral: no encontrado | Cefalea más frecuente en vuelo (factor: CO2) | Manual | [2][7] |
| V87 | Presión parcial de CO2 en cabina | mmHg | Sensor ambiental de la nave | Factor contribuyente a cefalea y posible SANS | [A] Media de 1 h ≤ 3 mmHg (NASA-STD-3001 Vol. 2) | SANS también aparece en reposo en cama sin CO2 añadido | Telemetría | [2][9] |
| V88 | Estado de vitaminas B y homocisteína | varias | Sangre (tierra) | Susceptibilidad individual | Umbral: no encontrado | Homocisteína y metabolitos relacionados más altos en los astronautas con hallazgos oculares | Perfil / laboratorio (tierra) | [2][9] |
| V89 | Volumen de los ventrículos cerebrales | mL | Resonancia, solo en tierra | Redistribución de líquido cefalorraquídeo | Umbral: no encontrado | +10–16 % (~1–3 mL) | No aplicable en vuelo | [9] |

---

## 6. Radiación espacial (síndrome agudo, cáncer, SNC, cardiovascular degenerativo, cataratas)

| # | Variable | Unidad | Cómo se mide en vuelo / equipo | Qué señala | Normal / umbral de alerta | Cambio en vuelo (magnitud, n) | Entrada en app | Fuente |
|---|---|---|---|---|---|---|---|---|
| V90 | Dosis efectiva acumulada (misión y carrera) | mSv | Dosímetro activo personal (Crew Active Dosimeter) en un bolsillo, en ISS y Artemis II | Riesgo de cáncer a largo plazo | [A] Carrera < 600 mSv (NASA, todas las edades y sexos; equivale a 3 % de riesgo medio de muerte por cáncer). ESA, CSA y Roscosmos 1 Sv; JAXA 0,5–1 Sv | ISS: ~0,2–0,5 mSv/día. Artemis I (25 días, sin tripulación): 26,7–35,4 mSv totales. NASA sitúa las dosis de astronautas entre 50 y 2 000 mSv | Dosímetro / telemetría | [1][6][45][46][50][52] |
| V91 | Tasa de dosis equivalente | mSv/día | Hybrid Electronic Radiation Assessor (6 unidades fijas en Orion); monitores de área en ISS | Exposición crónica a rayos cósmicos | [A] Requisito de diseño: < 1,3 mSv/día en espacio libre y < 0,9 en superficie planetaria (misiones > 60 días) | Artemis I interplanetario 0,96–1,24; ISS medido 0,68; tránsito a Marte 1,58; superficie lunar 0,81; superficie de Marte 0,65; Tierra 0,001–0,006 | Dosímetro / telemetría | [1][45][52] |
| V92 | Dosis absorbida y su tasa | mGy, mGy/día | Dosímetros personales pasivos y activos | Dosis física | [A] no hay límite en mGy para carrera total; ver V94 | ISS: normalmente < 0,3 mGy/día, a veces > 0,4; < 100 mGy por misión. Artemis I: hasta 13,47 mGy en la misión | Dosímetro | [45][46] |
| V93 | Dosis efectiva por evento de partículas solares | mSv | Dosímetros activos con alerta en tiempo real | Síndrome agudo por radiación | [A] < 250 mSv por evento (evento de diseño: suma de octubre de 1989). Refugio de Orion diseñado para 150 mSv | Simulación con evento de referencia en cápsula: 210–259 mSv sin refugio frente a 65–68 mSv con estiba optimizada | Dosímetro / telemetría | [1][6][45] |
| V94 | Dosis a órganos (cristalino, piel, médula ósea, sistema circulatorio, SNC) | mGy-Eq | Calculada a partir de dosimetría y modelo corporal | Efectos no cancerosos | [A] Límites a 30 días / 1 año / carrera: cristalino 1 000 / 2 000 / 4 000; piel 1 500 / 3 000 / 6 000; órganos hematopoyéticos 250 / 500 / no aplica; circulatorio 250 / 500 / 1 000; SNC 500 / 1 000 / 1 500 mGy; SNC con iones pesados (Z ≥ 10) — / 100 / 250 mGy | Artemis I, por localización en maniquí: 9,4–10,2 mGy de rayos cósmicos más 0,6–2,0 mGy del cinturón interior | Calculado | [6][45] |
| V95 | Tasa de dosis instantánea (pico) | µGy/min o mGy/h | Hybrid Electronic Radiation Assessor con alarma | Decisión de ir al refugio | [A] La nave debe alertar al superar umbrales predefinidos (valor: no encontrado). [T] Menos de unas decenas de mGy/h probablemente no causa síndrome agudo; ~100 mGy/h continuos causan vómitos en ~1 día | Artemis I, paso por el cinturón de protones: 69–287 µGy/min según blindaje (diferencia de 4 veces) | Telemetría | [1][12][45] |
| V96 | Alerta de clima espacial y tiempo en refugio | sí/no, h | Aviso desde control de misión y sensores de la nave | Reducción de dosis | [A] Refugio construido en ≤ 1 h; permanencia hasta 24 h; terminar una EVA en ≤ 2 h con acceso a blindaje | ~95 % de los eventos solares no se acercan a los límites | Telemetría / manual | [1][51] |
| V97 | Factor de calidad medio de la radiación | adimensional | Detectores de espectro (Timepix) | Eficacia biológica | Umbral: no encontrado | Artemis I: 2,30–3,06 (menor con más blindaje) | Telemetría | [45] |
| V98 | Recuento absoluto de linfocitos y su cinética | ×10⁹/L | HemoCue WBC DIFF (demostración en ISS, 2020–2021: leucocitos totales y diferencial de 5 partes con punción digital); Bio-Analyzer de CSA (recuentos celulares con unas gotas) | Dosis recibida en síndrome agudo (la prueba de laboratorio más práctica) | [T] Normal ~1,35–3,5. Descenso en 4–6 días sugiere 2–4 Gy; en 2–4 días, 4–6 Gy. Pauta: hemograma cada 2–3 h las primeras 8–12 h y luego cada 4–6 h durante 2–3 días | En vuelo sin evento: no encontrado. Limitación: el recuento también varía por fármacos, infección y ritmo diurno | Laboratorio a bordo | [12][47][48][54][56] |
| V99 | Neutrófilos / granulocitos | ×10⁹/L | Diferencial de leucocitos (mismos equipos) | Depresión medular | Umbral: no encontrado | Tras dosis letal desaparecen de la sangre entre los días 5 y 6; aumento inicial transitorio | Laboratorio a bordo | [12][54] |
| V100 | Tiempo hasta el primer vómito tras la exposición | h | Hora anotada por el tripulante | Estimación rápida de dosis | [T] < 2 h sugiere ≥ 5 Gy; > 2 h sugiere < 5 Gy. Inicio en síndrome hematopoyético: 1 h a 2 días. No es específico (también cinetosis espacial) | — | Manual | [47][48][49] |
| V101 | Síntomas prodrómicos: náusea, vómitos, anorexia, fatiga, diarrea | sí/no, n episodios | Cuestionario | Síndrome agudo por radiación | [T] CDC: síndrome completo > 0,7 Gy, síntomas leves desde 0,3 Gy. NASA/ICRP: umbral de 0,1–0,2 Gy a tasas > 1 Gy/h; 0,5–1 Gy da pródromos leves en pocos; 1–2 Gy los aumenta de forma clara | Son los efectos más probables en misión, en las primeras 48 h | Manual | [1][12][47] |
| V102 | Eritema y lesiones cutáneas | sí/no, área | Foto de la piel | Síndrome cutáneo | [T] Dosis para 10 % de afectados: 4 Gy (eritema) y 14 Gy (descamación húmeda) | En un evento solar la piel puede recibir hasta 10 veces la dosis de órganos internos | Cámara | [12] |
| V103 | Opacidad del cristalino (cortical, subcapsular posterior, nuclear) | área / grado | Solo en tierra (imagen digital Nidek EAS 1000); en vuelo: no encontrado | Catarata por radiación | [A] Mayor riesgo con dosis al cristalino > 8 mSv frente a < 8 mSv (295 astronautas) | Opacidad cortical mayor en astronautas expuestos (171 con vuelo frente a 247 controles) | Manual (tierra) | [13][43][44] |
| V104 | Rendimiento cognitivo (tiempo de reacción, vigilancia, memoria) | ms, lapsos | Pruebas cognitivas en tableta; Artemis II lo evalúa antes y después y registra sueño y actividad con pulsera | Efectos en SNC | [A] "Dentro de valores clínicamente aceptados" (sin cifra). Umbral numérico: no encontrado | Evidencia sobre todo en roedores; magnitud en humanos: no encontrado | Manual / tableta | [6][14][52] |
| V105 | Riesgo de muerte inducida por exposición | % | Calculado con el modelo de cáncer de NASA | Riesgo de cáncer | [A] ≤ 3 % de riesgo medio | Cerca de 1 % en muchos astronautas de ISS | Calculado | [1][15] |
| V106 | Aberraciones cromosómicas y longitud de telómeros en linfocitos | n por célula / kb | Solo en tierra | Biodosimetría, daño en ADN | Umbral: no encontrado | Telómeros más largos en vuelo y acortamiento rápido al regresar (n = 3); la incertidumbre limita su uso individual | Laboratorio (tierra) | [46][71] |
| V107 | Biomarcadores inmunes y reactivación viral en saliva | varias | Saliva seca en papel (Artemis II), saliva líquida y sangre antes y después | Respuesta inmune a radiación y aislamiento | Umbral: no encontrado | Resultados: no encontrado | Laboratorio (tierra) | [52] |

---

## 7. Anemia espacial, hemólisis y cambios hematológicos

| # | Variable | Unidad | Cómo se mide en vuelo / equipo | Qué señala | Normal / umbral de alerta | Cambio en vuelo (magnitud, n) | Entrada en app | Fuente |
|---|---|---|---|---|---|---|---|---|
| V108 | Hemoglobina | g/dL | Sangre extraída en vuelo y devuelta en ≤ 48 h; a bordo no confirmado | Anemia | [T] Anemia en mujeres no embarazadas < 12,0 g/dL (OMS); hombres: no encontrado. [A] NASA exige valores dentro del rango normal de la población general | En vuelo: elevada (hemoconcentración). Tras aterrizar: −8,8 % al día 4; 5 de 13 con anemia clínica; 48 % anémicos tras misiones largas. Caída de −0,61, −0,82 y −1,66 g/dL para 5,4, 11,5 y 145 días de vuelo; recuperación en 24–49 días | Laboratorio | [6][17][18][19][66] |
| V109 | Hematocrito | % | Sangre | Hemoconcentración o anemia | Umbral: no encontrado | Elevado en vuelo, ~3 veces más de lo atribuible al retraso de análisis | Laboratorio | [8][19] |
| V110 | Recuento de eritrocitos | ×10¹²/L | Sangre | Anemia | Umbral: no encontrado | Elevado en vuelo | Laboratorio | [19] |
| V111 | Masa eritrocitaria total | mL | Solo en tierra | Anemia real (independiente del plasma) | Umbral: no encontrado | Disminuye y se mantiene baja todo el vuelo; magnitud: no encontrado | Laboratorio (tierra) | [8] |
| V112 | Eliminación de monóxido de carbono endógeno en aire alveolar | ppb | Muestra de aliento recogida a bordo; análisis por cromatografía en tierra | Hemólisis | [A] Referencia antes del vuelo 1 662 ppb (IC 95 % 1 433–1 891). Umbral: no encontrado | 2 627 ppb el día 5 (+56 %); +54 % durante los 6 meses (n = 14); +30 % un año después | Laboratorio (tierra) | [17] |
| V113 | Reticulocitos | % o ×10⁹/L | Sangre | Respuesta de la médula | Umbral: no encontrado | Aumentan al día 4 tras el aterrizaje; +16 % un año después | Laboratorio | [4][17] |
| V114 | Hierro sérico, saturación de transferrina, ferritina | varias | Sangre (tierra) | Hierro liberado por hemólisis | Umbral: no encontrado | Aumentan en vuelo; valores: no encontrado | Laboratorio (tierra) | [17] |
| V115 | Haptoglobina | g/L | Sangre (tierra) | Tipo de hemólisis | Umbral: no encontrado | No se agota (va contra hemólisis intravascular) | Laboratorio (tierra) | [17] |
| V116 | Eritropoyetina | mUI/mL | Sangre (tierra) | Compensación | Umbral: no encontrado | Respuesta "robusta" los días 64 y 157; valores: no encontrado | Laboratorio (tierra) | [17] |
| V117 | Leucocitos totales y diferencial de 5 partes | ×10⁹/L | HemoCue WBC DIFF con punción digital (demostrado en ISS en enero de 2021) | Estado inmune y hematológico | Umbral: no encontrado | Primera hematología en tiempo real en el espacio; 14 de 20 ensayos válidos en la segunda sesión | Laboratorio a bordo | [54] |
| V118 | Síntomas de anemia: cansancio, disnea de esfuerzo, mareo al levantarse, palidez | sí/no, escala | Cuestionario; foto de conjuntiva o lecho ungueal | Anemia sintomática | [T] Lista de síntomas de la OMS (sin umbral) | Contribuye al desacondicionamiento al regresar | Manual / cámara | [18][67] |

---

## Equipos verificados y dónde vuelan

| Equipo | Dónde | Qué aporta | Fuente |
|---|---|---|---|
| Ultrasound 2 (GE Vivid-q), sondas curva, sectorial y lineal | ISS | Corazón, vasos, flujo, ojo | [53] |
| Holter Monitor 2 | ISS | ECG ambulatorio hasta 24 h | [53] |
| Pulmonary Function System | ISS | Gases respirados, gasto cardíaco | [53] |
| SLAMMD | ISS | Masa corporal | [53] |
| Otoport Advance | ISS | Otoemisiones acústicas | [53] |
| Actiwatch Spectrum | ISS | Actividad y sueño | [53] |
| Kits de sangre y orina, centrífuga refrigerada, kit de pH urinario | ISS | Muestras | [53] |
| OCT, tonómetro, ultrasonido ocular | ISS | Vigilancia de SANS | [2][58][59] |
| Bio-Monitor (camiseta, banda, tableta) | ISS desde 2018 | Pulso, actividad eléctrica cardíaca, presión arterial, respiración, temperatura cutánea, saturación de oxígeno, actividad | [55] |
| Bio-Analyzer | ISS desde 2019 | Recuentos celulares y biomarcadores con unas gotas de sangre, saliva u orina; objetivo de 2–3 h | [56] |
| HemoCue WBC DIFF | ISS (demostración 2020–2021) | Leucocitos y diferencial | [54] |
| Chibis-M | ISS (segmento ruso) | Presión negativa en la parte inferior del cuerpo | [16] |
| Crew Active Dosimeter | ISS y Artemis II | Dosis personal | [46][52] |
| Hybrid Electronic Radiation Assessor (6 unidades) y 4 monitores M-42 EXT | Orion, Artemis II | Dosis de área, alerta, iones pesados | [52] |
| Pulsera de actividad y sueño, saliva seca, chips de médula ósea | Artemis II | Sueño, inmunidad, respuesta medular | [52] |

No verificado en una fuente abierta durante esta investigación: modelo exacto del OCT y del tonómetro; presencia de un analizador portátil de química sanguínea (electrolitos, troponina, hemoglobina) en ISS o en Orion.

---

## Huecos "no encontrado" importantes

- **Troponina, péptidos natriuréticos, dímero D en vuelo:** ningún valor medido en astronautas ni equipo a bordo confirmado. El dímero D solo aparece como recomendación de NASA [5].
- **Magnitud del QTc en vuelo en milisegundos:** solo se encontró el criterio > 440 ms y el momento de aparición [23]; el artículo original no tiene resumen en PubMed.
- **Rango normal de fracción de eyección y criterios de vena cava inferior:** la guía de la Sociedad Americana de Ecocardiografía no se pudo abrir (el servidor devolvió una página de bloqueo).
- **Umbral de hemoglobina para anemia en hombres:** la página de la OMS abierta solo da el de mujeres [66].
- **Umbrales de alerta específicos para astronautas** de presión arterial, frecuencia cardíaca, presión intraocular, grosor coroideo, área y presión yugular, rigidez carotídea, linfocitos, hemoglobina: no existen en las fuentes abiertas; solo hay valores de referencia previos al vuelo.
- **Umbral numérico de la alarma de tasa de dosis** en Orion o ISS: el estándar solo dice "umbrales predefinidos" [1].
- **Tabla de tiempo hasta el vómito frente a dosis y nomograma de linfocitos:** están solo como imagen en las páginas abiertas [47][49].
- **Velocidad pico yugular en cm/s** y **área yugular en la vigilancia ocupacional:** el resumen no da valores [29]; el informe los muestra solo en una figura [5].
- **Dosis medidas en Artemis II (tripulada, abril de 2026):** no encontradas en una fuente primaria.
- **Páginas de riesgo de nasa.gov/hrp:** las páginas de peligros abiertas no contienen cifras [73].

---

## Fuentes

Método de acceso: "PDF" = descargado y convertido a texto; "web" = página abierta directamente; "PubMed (API)" = resumen leído a través de la interfaz E-utilities de NCBI porque la página web de PubMed exigía cookies (el registro es el mismo; se da la URL pública).

1. NASA OCHMO-TB-020 Rev G, "Design for Ionizing Radiation Protection" (06/06/2025). PDF. https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-020-radiation-protection.pdf
2. NASA OCHMO-MTB-001, "Spaceflight Associated Neuro-ocular Syndrome (SANS)" (21/02/2024). PDF. https://www.nasa.gov/wp-content/uploads/2024/02/ochmo-mtb-001-sans.pdf
3. NASA OCHMO-TB-019 Rev B, "Orthostatic Intolerance" (01/12/2023). PDF. https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-019-orthostatic-intolerance.pdf
4. NASA OCHMO-MTB-007, "Venous Thrombosis in Spaceflight" (08/01/2026). PDF. https://www.nasa.gov/wp-content/uploads/2026/01/ochmo-mtb-007-venous-thrombosis-in-spaceflight.pdf
5. NASA/SP-20250001074/REV1, "Assessment of Risk of Venous Thromboembolism during Spaceflight", informe del grupo de trabajo (abril de 2025). PDF. https://ntrs.nasa.gov/api/citations/20250001074/downloads/Venous%20Thromboembolism%20VTE%20Report%20REV1%20April%202025.pdf
6. NASA-STD-3001 Volumen 1, Revisión B (2022). PDF. Nota: los informes técnicos citan ya la Revisión C; los límites usados aquí coinciden con los que esos informes reproducen. https://www.nasa.gov/wp-content/uploads/2020/10/2022-01-05_nasa-std-3001_vol.1_rev._b_final_draft_with_signature_010522.pdf
7. NASA OCHMO-TB-033 Rev D, "Spaceflight Experience and Medical Care". PDF. https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-033-spaceflight-experience-medical-care.pdf
8. NASA HRP, Evidence Report: "Risk of Cardiovascular Adaptations Contributing to Adverse Mission Performance and Health Outcomes" (2022). PDF. https://humanresearchroadmap.nasa.gov/evidence/reports/Cardio%20Risk%20EB%202022%20FINAL_4-3-2023.pdf
9. NASA HRP, Evidence Report: "Risk of Spaceflight Associated Neuro-ocular Syndrome (SANS)" (2022). PDF. https://humanresearchroadmap.nasa.gov/evidence/reports/SANS%20EB%202022%20FINAL_8-15-22.pdf
10. NASA HRP, Evidence Report: "Risk of Orthostatic Intolerance During Re-exposure to Gravity". PDF. https://humanresearchroadmap.nasa.gov/Evidence/other/ORTHO.pdf
11. NASA HRP, Evidence Report: "Risk of Cardiac Rhythm Problems during Spaceflight". PDF. https://humanresearchroadmap.nasa.gov/evidence/reports/Arrhythmia.pdf
12. NASA HRP, Evidence Report: "Risk of Acute Radiation Syndromes due to Solar Particle Events". PDF. https://humanresearchroadmap.nasa.gov/evidence/reports/Acute.pdf
13. NASA HRP, Evidence Report: "Risk of Cardiovascular Disease and Other Degenerative Tissue Effects from Radiation Exposure". PDF. https://humanresearchroadmap.nasa.gov/evidence/reports/Degen.pdf
14. NASA HRP, Evidence Report: "Risk of Acute and Late Central Nervous System Effects from Radiation Exposure". PDF. https://humanresearchroadmap.nasa.gov/evidence/reports/CNS.pdf
15. NASA HRP, Evidence Report: "Risk of Radiation Carcinogenesis". PDF. https://humanresearchroadmap.nasa.gov/evidence/reports/Cancer.pdf
16. Marshall-Goebel K et al., JAMA Netw Open 2019;2(11):e1915011. Web (PMC). https://pmc.ncbi.nlm.nih.gov/articles/PMC6902784/
17. Trudel G et al., "Hemolysis contributes to anemia during long-duration space flight", Nat Med 2022. Web (PMC). https://pmc.ncbi.nlm.nih.gov/articles/PMC8799460/
18. Trudel G et al., Am J Hematol 2020;95:267-273. PubMed (API). https://pubmed.ncbi.nlm.nih.gov/31816115/
19. Kunz H et al., BMC Hematol 2017;17:12. PubMed (API). https://pubmed.ncbi.nlm.nih.gov/28904800/
20. Norsk P et al., J Physiol 2015;593:573-84. PubMed (API). https://pubmed.ncbi.nlm.nih.gov/25774397/
21. Fu Q et al., Circulation 2019;140:729-738. PubMed (API). https://pubmed.ncbi.nlm.nih.gov/31319685/
22. Khine HW et al., Circ Arrhythm Electrophysiol 2018;11:e005959. PubMed (API). https://pubmed.ncbi.nlm.nih.gov/29752376/
23. D'Aunno DS et al., "Long-Duration Space Flight Provokes Pathologic Q-Tc Interval Prolongation" (borrador previo a la publicación, 2002), NTRS 20100030585. Web. https://ntrs.nasa.gov/citations/20100030585
24. Hughson RL et al., Am J Physiol Heart Circ Physiol 2016;310:H628-38. PubMed (API). https://pubmed.ncbi.nlm.nih.gov/26747504/
25. Lee SMC et al., J Appl Physiol 2020;129:108-123. PubMed (API). https://pubmed.ncbi.nlm.nih.gov/32525433/
26. Arbeille P et al., Aerosp Med Hum Perform 2016;87:449-53. PubMed (API). https://pubmed.ncbi.nlm.nih.gov/27099083/
27. Arbeille P et al., Eur J Appl Physiol 2015;115:2099-106. PubMed (API). https://pubmed.ncbi.nlm.nih.gov/25991027/
28. Arbeille P et al., J Appl Physiol 2021;131:1080-1087. PubMed (API). https://pubmed.ncbi.nlm.nih.gov/34323592/
29. Pavela J et al., Vasc Med 2022;27:365-372. PubMed (API). https://pubmed.ncbi.nlm.nih.gov/35502899/
30. Lee SMC et al., Aerosp Med Hum Perform 2015;86(12 Suppl):A54-A67. PubMed (API). https://pubmed.ncbi.nlm.nih.gov/26630196/
31. Macias BR et al., JAMA Ophthalmol 2020;138:553-559. PubMed (API). https://pubmed.ncbi.nlm.nih.gov/32239198/
32. Macias BR et al., "Changes in the Optic Nerve Head and Choroid Over 1 Year of Spaceflight", JAMA Ophthalmol 2021;139:663-667. PubMed (API). https://pubmed.ncbi.nlm.nih.gov/33914020/
33. Greenwald SH et al., J Appl Physiol 2021;131:613-620. PubMed (API). https://pubmed.ncbi.nlm.nih.gov/34166098/
34. Mader TH et al., Ophthalmology 2011;118:2058-69. PubMed (API). https://pubmed.ncbi.nlm.nih.gov/21849212/
35. Draeger J et al., Aviat Space Environ Med 1995;66:568-70. PubMed (API). https://pubmed.ncbi.nlm.nih.gov/7646408/
36. Sirek AS et al., "Doppler ultrasound of the central retinal artery in microgravity", Aviat Space Environ Med 2014;85:3-8. PubMed (API). https://pubmed.ncbi.nlm.nih.gov/24479252/
37. Lawley JS et al., J Physiol 2017;595:2115-2127. PubMed (API). https://pubmed.ncbi.nlm.nih.gov/28092926/
38. Marshall-Goebel K et al., "Mechanical countermeasures to headward fluid shifts", J Appl Physiol 2021;130:1766-1777. PubMed (API); consultado como contexto, sin datos en las tablas. https://pubmed.ncbi.nlm.nih.gov/33856253/
39. "Otoacoustic Estimate of Astronauts' Intracranial Pressure Changes During Spaceflight", J Assoc Res Otolaryngol 2024;25:563-573. PubMed (API). https://pubmed.ncbi.nlm.nih.gov/39271581/
40. Perhonen MA et al., J Appl Physiol 2001;91:645-53. PubMed (API). https://pubmed.ncbi.nlm.nih.gov/11457776/
41. Leach CS et al., J Appl Physiol 1996;81:105-16. PubMed (API). https://pubmed.ncbi.nlm.nih.gov/8828652/
42. Baevsky RM et al., J Appl Physiol 2007;103:156-61. PubMed (API). https://pubmed.ncbi.nlm.nih.gov/17446414/
43. Cucinotta FA et al., Radiat Res 2001;156:460-6. PubMed (API). https://pubmed.ncbi.nlm.nih.gov/11604058/
44. Chylack LT et al., Radiat Res 2009;172:10-20. PubMed (API). https://pubmed.ncbi.nlm.nih.gov/19580503/
45. George SP et al., "Space radiation measurements during the Artemis I lunar mission", Nature 2024;634:48-52. Web (PMC). https://pmc.ncbi.nlm.nih.gov/articles/PMC11446838/
46. Shavers M et al., "Space agency-specific standards for crew dose and risk assessment of ionising radiation exposures for the ISS", Z Med Phys 2024;34:14-30. Web (PMC). https://pmc.ncbi.nlm.nih.gov/articles/PMC10919966
47. CDC, "Acute Radiation Syndrome: Information for Clinicians". Web. https://www.cdc.gov/radiation-emergencies/hcp/clinical-guidance/ars.html
48. REMM (HHS), "About Lymphocyte Depletion Kinetics". Web. https://remm.hhs.gov/aboutlymphocytedepletion.htm
49. REMM (HHS), "About Time to Onset of Vomiting" (los valores están solo en gráficos). Web. https://remm.hhs.gov/aboutvomiting.htm
50. NASA, "Why Space Radiation Matters". Web. https://www.nasa.gov/humans-in-space/why-space-radiation-matters/
51. NASA, "Scientists and Engineers Evaluate Orion Radiation Protection Plan" (2016). Web. https://www.nasa.gov/missions/artemis/orion/scientists-and-engineers-evaluate-orion-radiation-protection-plan/
52. NASA, "Artemis II Crew Both Subjects and Scientists in NASA Deep Space Research". Web. https://www.nasa.gov/missions/artemis/artemis-2/artemis-ii-crew-both-subjects-and-scientists-in-nasa-deep-space-research/
53. NASA, "ISS Medical Project On-Orbit Hardware" (2016). PDF. https://www.nasa.gov/sites/default/files/atoms/files/issmp_on-orbit_hardware.pdf
54. Perusek G et al., "HemoCue ISS Tech Demo: Results and Lessons Learned", NASA HRP IWS 2022, NTRS 20210026808. PDF. https://ntrs.nasa.gov/api/citations/20210026808/downloads/IWS%202022%20HemoCue%20in%20IWS%20Format_January%202022.pdf
55. Agencia Espacial Canadiense, "Bio-Monitor". Web. https://www.asc-csa.gc.ca/eng/sciences/bio-monitor.asp
56. Agencia Espacial Canadiense, "Bio-Analyzer". Web. https://asc-csa.gc.ca/eng/iss/bio-analyzer.asp
57. Agencia Espacial Canadiense, "Vascular series". Web. https://asc-csa.gc.ca/eng/sciences/vascular.asp
58. Brunstetter T, "Crewmember SANS Overview" (mayo de 2023), NTRS 20230006218. PDF. https://ntrs.nasa.gov/api/citations/20230006218/downloads/Brunstetter%20-%20Crewmember%20SANS%20Overview%20-%20Export%20Control%20-FINAL%20-%2001May23.pdf
59. ESA, "Eye exam in orbit – Cosmic Kiss" (2022). Web. https://www.esa.int/ESA_Multimedia/Videos/2022/02/Eye_exam_in_orbit_Cosmic_Kiss
60. CDC STEADI, "Measuring Orthostatic Blood Pressure". PDF. https://www.cdc.gov/steadi/media/pdfs/STEADI-Assessment-MeasuringBP-508.pdf
61. CDC, "About High Blood Pressure" (categorías ACC/AHA; la página de heart.org devolvió 403). Web. https://www.cdc.gov/high-blood-pressure/about/index.html
62. Postema PG, Wilde AAM, "The Measurement of the QT Interval", Curr Cardiol Rev 2014;10:287-294. Web (PMC). https://pmc.ncbi.nlm.nih.gov/articles/PMC4040880/
63. Sheldon RS et al., "2015 Heart Rhythm Society Expert Consensus Statement on the Diagnosis and Treatment of Postural Tachycardia Syndrome, Inappropriate Sinus Tachycardia, and Vasovagal Syncope". Web (PMC). https://pmc.ncbi.nlm.nih.gov/articles/PMC5267948/
64. Righini M et al., "Age-adjusted D-dimer cutoff levels to rule out pulmonary embolism: the ADJUST-PE study", JAMA 2014;311:1117-24. PubMed (API). https://pubmed.ncbi.nlm.nih.gov/24643601/
65. American Academy of Ophthalmology, "Eye Pressure". Web. https://www.aao.org/eye-health/anatomy/eye-pressure
66. OMS, Nutrition Landscape Information System, "Anaemia". Web. https://www.who.int/data/nutrition/nlis/info/anaemia
67. OMS, nota descriptiva "Anaemia". Web. https://www.who.int/news-room/fact-sheets/detail/anaemia
68. NASA OCHMO, índice "Technical and Medical Brief Collections" (para localizar los informes). Web. https://www.nasa.gov/ochmo/hsa-standards/ochmo-technical-briefs/
69. "Venous and Arterial Responses to Partial Gravity", Front Physiol 2020;11:863. PubMed (API). https://pubmed.ncbi.nlm.nih.gov/32848835/
70. Ade CJ et al., "Decreases in maximal oxygen uptake following long-duration spaceflight", J Appl Physiol 2017;122:968-975. PubMed (API). Solo se usa la cifra de gasto cardíaco máximo; la cifra de VO2máx del resumen parece una errata y no se usa. https://pubmed.ncbi.nlm.nih.gov/28153941/
71. Luxton JJ et al., "Temporal Telomere and DNA Damage Responses in the Space Radiation Environment", Cell Rep 2020;33:108435. PubMed (API). https://pubmed.ncbi.nlm.nih.gov/33242411/
72. Arbeille P et al., "4 Day in dry immersion reproduces partially the aging effect on the arteries…", NPJ Microgravity 2021;7:43. PubMed (API). https://pubmed.ncbi.nlm.nih.gov/34728651/
73. NASA HRP, "Space Radiation" (página de peligro; sin cifras). Web. https://www.nasa.gov/hrp/hazard-space-radiation/

### Accesos fallidos (para no reintentar)

- pubmed.ncbi.nlm.nih.gov (exige cookies) → se usó la interfaz E-utilities.
- pmc.ncbi.nlm.nih.gov empezó a mostrar verificación de navegador al final de la sesión.
- heart.org (403), ninds.nih.gov (403), mirion.com (403), ncbi.nlm.nih.gov/books (verificación de navegador), asecho.org (página de bloqueo en lugar del PDF), iris.who.int (HTML en lugar del PDF).
- URL que devolvieron 404: asc-csa.gc.ca/eng/sciences/vascular-aging.asp, asc-csa.gc.ca/eng/sciences/bio-analyzer.asp, nasa.gov/missions/station/iss-research/ocular-health/.
- El primer PDF de radiación listado por el buscador (versión Rev E/F) fue sustituido por la Rev G de la fuente [1].
