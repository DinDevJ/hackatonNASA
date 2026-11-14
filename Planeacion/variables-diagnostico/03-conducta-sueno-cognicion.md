# 03 · Variables medibles: salud conductual, sueño, cognición y factores humanos

Bloque: peligros HRP "aislamiento y confinamiento" y "distancia de la Tierra". Fecha de consulta de fuentes: 2026-11-14.

## Cómo leer este archivo

- Cada fila es una variable (V1…V88). Los números entre corchetes remiten a la lista de fuentes del final.
- **Tipo de corte**: `AST` = umbral o dato obtenido en astronautas o fijado por norma NASA; `CLIN` = punto de corte clínico terrestre (no validado en astronautas); `ANÁLOGO` = dato de análogo (HERA, Mars-500, Antártida).
- **"no encontrado"** = lo busqué y no apareció en ninguna página que pudiera abrir. **"no verificado"** = el dato aparece solo en el resumen de un buscador o en una página que no pude abrir (PMC devolvió verificación anti-bot en varios artículos; apa.org y humansystems.arc.nasa.gov no cargaron); se indica para que no se use sin comprobar.
- Ninguna escala clínica de este archivo (PHQ-9, GAD-7, ISI, PSQI, BDI-II, PSS, ESS, WHO-5) tiene punto de corte validado en astronautas. La norma NASA solo exige que el estado conductual y cognitivo esté "dentro de valores clínicamente aceptados a juicio de la evaluación de salud conductual" [V1 4011] [3]. En astronautas la práctica es comparar cada persona con su propia línea base prevuelo.
- No se repite lo que el equipo ya tiene (PVT de 3 min como proxy, d≈1,0 tras una noche sin dormir, detalle de Mars-500 y HERA, Inspiration4, ARCHeR, PERCLOS/EAR), salvo para completar.

---

## 1. Condiciones conductuales y psiquiátricas (depresión, ansiedad, astenia, estrés)

Contexto de incidencia (para calibrar alertas): 34 signos/síntomas conductuales en 208 tripulantes de 89 misiones Shuttle 1981-1989 (≈1 por cada 2,87 persona-años; los más frecuentes, ansiedad e irritación); 9 casos en registros médicos de las Expediciones ISS 1-40 (0,62 por persona-año); 2 de 7 astronautas NASA en Mir (29 %) con síntomas depresivos subclínicos (0,77 por persona-año) [5]. En expediciones polares ≈5 % cumple criterios DSM-IV/CIE de trastorno psiquiátrico [39].

| # | Variable | Unidad / rango | Cómo se mide en vuelo / herramienta (ISS, análogos) | Qué problema señala | Normal y corte de alerta (tipo, fuente) | Cambio en vuelo / análogo | Entrada en app | Licencia | Fuente |
|---|---|---|---|---|---|---|---|---|---|
| V1 | PHQ-9 | 9 ítems 0-3; total 0-27 | No consta uso operativo en ISS (no encontrado). Solo en tierra / investigación | Depresión (gravedad); ítem 9 = ideación | CLIN: 5 leve, 10 moderada, 15 mod.-grave, 20 grave; ≥10 → sensibilidad 88 %, especificidad 88 % para depresión mayor (n=580 con entrevista). Manual: ≥10 "bandera amarilla", ≥15 "bandera roja" | no encontrado en astronautas | Cuestionario | Libre: el sitio PHQ Screeners declara el contenido "free for download and use" | [24][26] |
| V2 | PHQ-2 / GAD-2 (PHQ-4) | 4 ítems; PHQ-2 0-6, GAD-2 0-6 | Solo en tierra | Cribado ultrabreve de depresión y ansiedad (apto para uso diario/semanal) | CLIN: puntuación 3 = percentil 93,4 (PHQ-2) y 95,2 (GAD-2); 5 = percentil 99,0 y 99,2 (población general alemana, n=5030; sin entrevista criterio) | no encontrado | Cuestionario | Libre (misma familia PHQ) | [27][26] |
| V3 | GAD-7 | 7 ítems 0-3; total 0-21 | Solo en tierra (uso en vuelo no encontrado) | Ansiedad generalizada | CLIN: cortes 5/10/15 (leve/moderada/grave) según manual; el corte óptimo del estudio original da sensibilidad 89 % y especificidad 82 % (n=965 con entrevista) | no encontrado | Cuestionario | Libre | [25][26] |
| V4 | BDI-II | 21 ítems; 0-63 | Semanal en la suite HFBP-Exploration Measures (análogos y, según el informe, también ISS); usado en Mars-500 | Depresión | CLIN: el corte de cribado varía según la muestra [36]. Bandas del manual 0-13/14-19/20-28/29-63: **no verificado** (solo resumen de buscador) | Mars-500: 1 de 6 con síntomas depresivos leves-moderados en 8 de 74 semanas [5] | Cuestionario | De pago (editorial); detalle de licencia no verificado | [6][5][36] |
| V5 | POMS / POMS-SF | Subescalas de tensión, depresión, ira, vigor, fatiga, confusión; perturbación total del ánimo | POMS-SF diario en HFBP-EM; ítems POMS semanales en Shuttle/Mir (n=13) e ISS (n=17 tripulantes + 128 de control de misión) | Estado de ánimo, astenia, fatiga | Corte: no encontrado. Estructura de 65 ítems/6 subescalas: no verificado (solo buscador) | ISS: sin descenso de ánimo en la 2.ª mitad ni en ningún cuarto [38]. Mars-500: 3 de 6 con confusión-desconcierto [5] | Cuestionario | De pago (editorial); no verificado | [6][37][38] |
| V6 | PANAS | 2 escalas de 10 ítems (afecto positivo y negativo) | Solo en tierra (uso en vuelo no encontrado) | Afecto positivo bajo / negativo alto | Corte: no encontrado (el original da datos normativos, no cortes). Rango 10-50 por escala: no verificado | no encontrado | Cuestionario | No verificado | [34] |
| V7 | PSS-10 (estrés percibido) | 10 ítems (rango no verificado en página abierta) | Solo en tierra | Estrés percibido (último mes) | **No hay puntos de corte**: el autor indica que "no es un instrumento diagnóstico; no hay cortes", solo comparación dentro de la propia muestra | no encontrado | Cuestionario | Permiso gratuito vía ePROVIDE (MAPI Research Trust); traducciones, propiedad del traductor | [33] |
| V8 | WHO-5 (bienestar) | 5 ítems, escala de 6 puntos, últimas 2 semanas | Solo en tierra | Bienestar bajo; cribado de depresión | CLIN: ≤50 y ≤28 son los cortes usados en la literatura (≤50: sens. 0,81 / espec. 0,82 frente a un síntoma nuclear, en cohorte de embarazadas) | no encontrado | Cuestionario | CC BY-NC-SA 3.0 (OMS) | [35] |
| V9 | Estrés autoinformado (escala visual analógica) | 0 = nada estresado … 100 = muy estresado | Reaction Self Test en ISS: mañana y tarde, cada 4 días en vuelo (n=24, 2856 sesiones) | Estrés agudo | AST: sin corte; comparación con la línea base propia | El estrés aumentó a lo largo de los cuartos de misión (F=4,20; p=0,007); dormir <6 h se asoció a más estrés | Deslizador en pantalla | Ítem libre | [11] |
| V10 | Mental Health Checklist (MHCL) | Subescalas: adaptación positiva, autorregulación pobre, ansiedad | Mensual en estaciones antárticas South Pole y McMurdo (invernada de 8 meses) | Deterioro emocional en aislamiento | Corte: no encontrado | ANÁLOGO: aumento sostenido de ansiedad somática y cognitiva con caída del afecto positivo [5]. Tamaños muestrales (88 y 22) no verificados | Cuestionario | no encontrado | [5] |
| V11 | Ítems de astenia (8 ítems POMS de "astenia fase 1") | Escala de ítem POMS ("nada" … ) | Shuttle/Mir, n=13, semanal | Astenia / neurastenia: cansancio, pérdida rápida de fuerzas, umbral sensorial bajo, ánimo inestable, sueño alterado [5] | Sin criterios diagnósticos formales; corte no encontrado | AST: puntuaciones en rango "nada" a "un poco"; sin diferencias pre/post lanzamiento ni entre cuartos. No se pudo demostrar astenia con POMS (no mide lo fisiológico) | Cuestionario breve | — | [37][5] |
| V12 | Diario personal (análisis de contenido) | Categorías temáticas; positividad/negatividad neta por cuarto | Experimento Journals en ISS (Stuster): diarios escritos y codificados | Adaptación, moral, fatiga, fricción con tierra | Sin corte | AST: 10 categorías (trabajo, comunicaciones externas, adaptación, interacción de grupo, ocio, equipo, eventos, organización, sueño, comida) suman 88 % de las entradas; >2145 frases sobre adaptación psicosocial; la moral tiende a bajar en el tercer cuarto y subir en el último | Texto libre por teclado o dictado | — | [41][5] |
| V13 | Indicadores léxicos de texto y habla | Recuento de palabras, emoción positiva/negativa, foco en uno mismo vs. otros, tiempos verbales, turnos | LIWC y sistema STRESSnet en HERA y NEEMO 18; análisis automático de habla en simulaciones y reposo en cama | Estrés, carga, ánimo, clima social | Sin corte validado | ANÁLOGO: discrimina días de carga alta vs. baja y es coherente con autoinformes; validación limitada por poca variabilidad emocional | Teclado / micrófono | LIWC es software comercial (condiciones no verificadas) | [5][6] |
| V14 | Biomarcadores acústicos de voz | Modulaciones temporales lentas (prosodia) y rasgos espectrales (calidad de voz) | Solo en tierra (laboratorio) | Privación de sueño | Sin corte; gran variabilidad individual (hay que calibrar por persona) | no encontrado en vuelo | Micrófono | — | [43] |
| V15 | Expresión facial (reconocimiento óptico) | Movimiento de cejas, asimetría de boca; cierres de párpado | Algoritmo OCR de Dinges (UPenn), probado en tierra; no validado operativamente | Estrés por exigencia de tarea | Sin corte; NASA señala que fiabilidad, sensibilidad y especificidad aún no están validadas [5] | Tierra, n=60: discrimina alta vs. baja exigencia en 75-88 % de sujetos (preliminar) | Cámara | — | [42][5] |
| V16 | Cortisol salival (perfil diurno, respuesta al despertar) | Concentración; curva en el día. La respuesta al despertar es el aumento en los 30-45 min tras despertar | Saliva en ISS (n=23); muestras de sangre y saliva para hormonas de estrés en Standard Measures | Estrés fisiológico; también marcador circadiano poco específico | Valores de referencia y corte: no encontrado (dependen del laboratorio y del horario exacto de muestreo [58]) | AST: la trayectoria diurna cambió en vuelo frente a prevuelo (p=0,010); cortisol plasmático sin diferencias significativas | Entrada manual de resultado de laboratorio (no capturable por app) | — | [57][58][66] |
| V17 | Variabilidad de frecuencia cardiaca (RMSSD, SDNN, LF/HF) | ms; ms²; cociente | Holter durante el sueño en ISS (n=7); banda pectoral Polar H7 diaria en HFBP-EM | Estrés (menor actividad parasimpática: baja HF, sube LF) | CLIN, normas de corto plazo en adultos sanos (44 estudios, n=21 438): RMSSD 42 ± 15 ms (19-75); SDNN 50 ± 16 ms (32-93); LF/HF 2,8 ± 2,6. Sin corte de alerta; variación entre individuos enorme → usar línea base propia | AST: HRV reducida en vuelo en todas las bandas durante el sueño; recuperación parcial tras aterrizar | Wearable | — | [59][60][61][6] |
| V18 | Frecuencia cardiaca en reposo / sueño | lpm | Holter; pulsómetro | Activación, recuperación | Sin corte | AST durante el sueño: prevuelo 53,3 ± 7,3; sin cambio en vuelo; posvuelo 59,6 ± 8,9 (p<0,01) | Wearable | — | [61] |
| V19 | Actividad electrodérmica (EDA) | Conductancia de la piel | En vuelo: no encontrado. En tierra, sensores de pulsera | Activación simpática / estrés | Corte: no encontrado; existen recomendaciones metodológicas, no umbrales | no encontrado | Wearable | — | [62] |
| V20 | Conferencia psicológica privada | Sesión ≥15 min cada 2 semanas con psicólogo o psiquiatra | ISS (requisito [V1 6010]) | Vigilancia clínica e intervención | Juicio clínico | Sin dato; con retardo de comunicaciones no será posible en tiempo real, de ahí el interés de la autoevaluación | Recordatorio y notas previas en la app | — | [5][3] |

---

## 2. Equipo: cohesión, conflicto y clima

| # | Variable | Unidad / rango | Cómo se mide en vuelo / herramienta | Qué problema señala | Normal y corte de alerta | Cambio en vuelo / análogo | Entrada en app | Licencia | Fuente |
|---|---|---|---|---|---|---|---|---|---|
| V21 | Cohesión percibida de tarea y social | Cuestionario (Kozlowski 2015) | Diario en HFBP-EM (análogos e ISS); cuestionario vespertino de Standard Measures sobre ánimo, cohesión, desempeño y habitabilidad | Deterioro del equipo | Corte: no encontrado | Resultados HFBP-EM "pendientes" según el informe de 2022 | Cuestionario | no encontrado | [6][66] |
| V22 | Clima de grupo y de trabajo (GES, WES) | Subescalas (cohesión, apoyo del líder…) | Semanal en ISS: 17 tripulantes y 128 de control de misión | Cohesión, papel del líder | Corte: no encontrado | AST: sin caída de cohesión en la 2.ª mitad ni en ningún cuarto; la cohesión se relaciona con el papel de apoyo del comandante | Cuestionario | no encontrado | [38] |
| V23 | Desplazamiento de tensión hacia control de misión | Relación entre afecto negativo y apoyo percibido de supervisores externos | ISS y Mir (POMS, GES, WES) | Conflicto tripulación-tierra | Sin corte | AST: confirmado en las 6 subescalas analizadas | Ítem "¿cómo valoras el apoyo de tierra hoy?" | — | [38] |
| V24 | Conflicto diádico | Recuento diario con descripción libre | Diario en HFBP-EM; usado en Mars-500 | Conflicto interpersonal | Sin corte | El equipo ya tiene el detalle de Mars-500 | Cuestionario + texto | — | [6] |
| V25 | Seguridad psicológica | Subescala de 7 ítems (Edmondson 1999) | Semanal en HFBP-EM | Clima de equipo | Corte: no encontrado | no encontrado | Cuestionario | no encontrado | [6] |
| V26 | Eficacia percibida del equipo | Cuestionario (Tannenbaum y Mathieu 2015); versión valorada por control de misión | Diario/semanal en HFBP-EM | Desempeño de equipo | Corte: no encontrado | no encontrado | Cuestionario | no encontrado | [6] |
| V27 | Apoyo social | Cuestionario ENRICHD | HFBP-EM | Aislamiento social | Corte: no encontrado | no encontrado | Cuestionario | no encontrado | [6] |
| V28 | Proximidad e interacción entre tripulantes | Tiempo cerca de otros, movimiento, rasgos vocales | "Sociometric badges" probadas en análogos | Retraimiento, formación de subgrupos | Sin corte | no encontrado | Wearable (Bluetooth) | — | [6] |
| V29 | Fase de misión (cuarto) | Cuarto 1-4 de la misión | Calendario | "Fenómeno del tercer cuarto" | Sin corte | Evidencia contradictoria: diarios ISS muestran bajada de moral en el 3.er cuarto [41]; POMS/GES en ISS no [38]; Mars-500 tampoco (energía emocional, autoeficacia y similitud percibida subieron, n=6) [40]. NASA lo considera "cuestión abierta" [5] | Automático | — | [41][38][40][5] |

---

## 3. Pérdida de sueño

Referencia terrestre citada por NASA: 7-9 h por noche en adultos [2]. Periodo de sueño planificado recomendado: 8,5 h (más 2 h de pre-sueño y 1,5 h de post-sueño) [10].

| # | Variable | Unidad / rango | Cómo se mide en vuelo / herramienta | Qué problema señala | Normal y corte de alerta | Cambio en vuelo / análogo | Entrada en app | Licencia | Fuente |
|---|---|---|---|---|---|---|---|---|---|
| V30 | Tiempo total de sueño (actigrafía) | h por noche | Actiwatch-L en muñeca no dominante (épocas de 2 min en vuelo); Actiwatch M400 en HFBP-EM; actígrafo en Standard Measures | Privación de sueño | CLIN: 7-9 h [2]. AST: <6 h se asocia a peor velocidad psicomotora, más estrés y más carga percibida [11] | Shuttle (64 astronautas, 80 misiones): 5,96 ± 0,56 h en vuelo vs. 6,29 a 3 meses del lanzamiento y 6,74 la semana posterior. ISS (n=21): 6,09 ± 0,67 vs. 6,41 y 6,95 | Wearable | — | [1][2][11] |
| V31 | Porcentaje de noches con <6 h | % | Actigrafía | Privación crónica | Sin corte formal; ver V30 | Shuttle 47,1 % (480/1020); ISS 43,8 % (1294/2951). Noches de ≥8 h: 0,3 % y 7,7 %. Autoinforme ISS: ≤6 h en 40,0 % de días laborables y 22,5 % de fines de semana | Calculada | — | [1][11] |
| V32 | Tiempo total de sueño (diario) | h por noche | Diario de sueño (papel en Shuttle, informatizado en ISS); Reaction Self Test | Privación de sueño; el diario sobrestima frente a actigrafía [4] | 7-9 h [2] | Shuttle 6,32 ± 0,53; ISS 6,54 ± 0,67 [1]. Reaction Self Test (n=24): 6,5 ± 1,4 h; 6,3 h laborables vs. 6,9 h fin de semana [11] | Cuestionario matutino | — | [1][11][4] |
| V33 | Tiempo en cama frente a oportunidad de sueño | h | Diario | Sueño acortado por horario | Planificado 8,5 h | En vuelo 7,35 ± 0,47 h (Shuttle) y 7,46 ± 1,22 h (ISS). Solo el 5,9 % de las noches se durmió toda la oportunidad de 8,5 h | Cuestionario / wearable | — | [1][11][10] |
| V34 | Eficiencia del sueño | % | Actigrafía / autoinforme | Sueño fragmentado | CLIN: el panel de la National Sleep Foundation la acepta como indicador de calidad [64]; umbral ≥85 %: no verificado | Shuttle: 87,9 % (noches con hipnótico) vs. 86,6 % (sin); ISS 90,6 % vs. 87,0 % (n=9, no significativo). Reaction Self Test: media 91,8 % | Wearable | — | [1][11][64] |
| V35 | Latencia de sueño | min | Diario; actigrafía | Insomnio de conciliación; desalineación circadiana | CLIN: indicador aceptado [64]; umbral ≤15-30 min: no verificado | Shuttle 23,63 ± 14,75 min; ISS 13,74 ± 10,64 min (diario). Los hipnóticos la reducen 8,5 min [2] | Cuestionario / wearable | — | [1][2][64] |
| V36 | Vigilia tras inicio del sueño (WASO) y número y causa de despertares | min; recuento | Diario (número y causa); actigrafía | Insomnio de mantenimiento; ruido, temperatura, incomodidad | CLIN: indicador aceptado [64]; umbral ≤20 min: no verificado | Valor medio en vuelo: no encontrado. Causas citadas en ISS: ruido, temperatura, incomodidad física, condiciones de misión [2] | Cuestionario / wearable | — | [12][2][64] |
| V37 | Calidad subjetiva del sueño | Escala visual analógica 0-100 | Diario de sueño | Sueño no reparador | Sin corte | En vuelo 63,70 ± 13,35 (Shuttle) y 66,51 ± 13,43 (ISS) [1]; 66,8 ± 17,7 con sueño alineado vs. 60,2 ± 21,0 desalineado [12] | Deslizador | — | [1][12] |
| V38 | PSQI | 19 ítems, 7 componentes, puntuación global; referido al último mes | Solo en tierra (pre y posvuelo) | Mala calidad de sueño | CLIN: global >5 → sensibilidad 89,6 %, especificidad 86,5 % para "mal durmiente" | no encontrado | Cuestionario (mensual) | Propiedad de la Univ. de Pittsburgh: gratis solo para investigación y docencia no comerciales, sin modificar; uso comercial de pago | [29] |
| V39 | ISI (gravedad del insomnio) | 7 ítems 0-4; total 0-28 | Solo en tierra | Insomnio | CLIN: 0-7 sin insomnio clínico; 8-14 subumbral; 15-21 moderado; 22-28 grave. Corte 10 en comunidad: sens. 86,1 %, espec. 87,7 % | no encontrado | Cuestionario | Formulario "usado con permiso de C. M. Morin"; condiciones no verificadas | [28] |
| V40 | Epworth (somnolencia diurna) | 8 ítems 0-3; total 0-24 | Solo en tierra | Somnolencia habitual | CLIN: 0-5 normal baja; 6-10 normal alta; 11-12 leve; 13-15 moderada; 16-24 grave | no encontrado | Cuestionario | Requiere licencia aunque no haya pago | [32] |
| V41 | Arquitectura del sueño (polisomnografía) | Fases, vigilia, sueño de ondas lentas, REM | Polisomnografía en STS-90 y STS-95 (n=5), STS-78, Mir | Sueño superficial | Sin corte | Más vigilia y menos ondas lentas en el último tercio; REM muy aumentado al regresar. Melatonina 0,3 mg no mejoró el sueño | No capturable (solo importar resumen de wearable) | — | [13][4] |
| V42 | Presión de sueño en vigilia (EEG) | Potencia theta 5-7 Hz; eventos de "sueño local" | EEG en ISS, n=5, 6 meses | Presión de sueño aunque haya tiempo asignado para dormir | Sin corte | Aumento global de theta en ISS frente a prevuelo; eventos de sueño local más globales (p<0,001) | No capturable | — | [23] |
| V43 | Deuda de sueño (rebote al volver) | Diferencia en h entre posvuelo y vuelo | Actigrafía / diario | Déficit acumulado | Déficit medio ≈0,3 h/día (18 min) en vuelo frente a 3 meses antes [2] | El sueño sube a ≈7 h la semana posterior; ISS: >40 min más por noche que en vuelo | Calculada (media móvil frente a línea base) | — | [2][1] |

---

## 4. Desincronización circadiana

| # | Variable | Unidad / rango | Cómo se mide en vuelo / herramienta | Qué problema señala | Normal y corte de alerta | Cambio en vuelo / análogo | Entrada en app | Licencia | Fuente |
|---|---|---|---|---|---|---|---|---|---|
| V44 | Alineación circadiana del episodio de sueño | Alineado / desalineado según el mínimo estimado de temperatura central | Estimado con Circadian Performance Simulation Software a partir de actigrafía y fotometría (n=21, 3248 días en ISS) | Dormir fuera de la noche biológica | Desalineado = mínimo de temperatura fuera del episodio de sueño | 19 % de los episodios en vuelo y 13 % en prevuelo. Sueño 6,4 ± 1,2 h alineado vs. 5,4 ± 1,4 h desalineado (p<0,01) | Calculada (horario + luz del wearable) | Software propietario | [12] |
| V45 | Melatonina salival (inicio en luz tenue, DLMO) | pg/mL; hora de inicio | Saliva en serie con luz tenue. Uso en ISS: no encontrado; NASA lo identifica como hueco ("no hay método práctico en vuelo para determinar la fase") | Fase circadiana | Guía de consenso: informar una medida de DLMO de umbral bajo [53]. Umbral de 3-4 pg/mL en saliva (≈10 pg/mL en plasma): no verificado en página abierta | no encontrado | No capturable (resultado de laboratorio) | — | [53][4] |
| V46 | 6-sulfatoximelatonina en orina (aMT6s) | Ritmo de 24-48 h | Orina de 48 h cada 2 semanas en la misión Phoenix (día marciano de 24,65 h, n=19); bases antárticas | Fase y periodo circadianos | Sin corte; se evalúa la hora del pico | Phoenix: 87 % se adaptó al día marciano. Antártida: retraso de fase en invierno; algunos entran en curso libre (>24 h) | No capturable | — | [55][54][4] |
| V47 | Temperatura corporal central | °C; ritmo de 24 h | Termistor rectal, píldora ingerible o sensor de doble flujo en la frente (ISS) | Fase circadiana (menos fiable que melatonina por enmascaramiento); rendimiento | Sin corte de alerta | Amplitud del ritmo reducida en Shuttle (n=5) [13]. Subida sostenida de ≈1 °C en reposo, desarrollada en 2,5 meses [56] | Wearable / entrada manual | — | [13][56][4] |
| V48 | Ritmo de cortisol urinario | Fase respecto al horario | Orina en Shuttle | Desalineación | Sin corte | Ritmo desalineado respecto al ciclo sueño-vigilia impuesto (ciclos 20-35 min más cortos que 24 h) | No capturable | — | [13] |
| V49 | Luz ambiental (iluminancia) | lux | Fotómetro del actígrafo (Actiwatch-L); cálculos de iluminación de cabina | Señal circadiana insuficiente o a destiempo | Guía NASA: ≈20 lux nocturno, 100-300 lux actividad nominal, >1000 lux alta precisión [9]; oscurecimiento de ventanas hasta 2,0 lux [V2 8049] [2]. Laboratorio: 25 lux no bastan para sincronizar a todos; 100 lux sí a más [4] | Shuttle: 5,0-79,4 lux de día en compartimentos (cubierta de vuelo muy variable) [13]. ISS (era fluorescente): Nodo 1 con todas las lámparas ≈138 lux, con una sola ≈5,5 lux; laboratorio de EE. UU. ≈578 lux [4] | Sensor de luz del móvil o wearable | — | [13][4][9][2] |
| V50 | Espectro y ajuste de iluminación | Temperatura de color (2700-6500 K); 3 modos: general, pre-sueño, alerta | Sistema de iluminación de cabina | Supresión de melatonina por luz azul antes de dormir | Misiones >30 días: al menos 3 configuraciones de color e intensidad [2] | Tabla 8.7-2 de la norma (valores fisiológicos exactos): no encontrado | Entrada manual del modo activo | — | [2][9] |
| V51 | Cambio brusco de horario ("slam shift") | Horas de desplazamiento; fecha | Planificación de misión | Desalineación aguda | Evitar tareas críticas en el nadir circadiano, típicamente 1-7 AM respecto al horario habitual [10] | Al menos el 10 % de los usos de medicación en ISS se ligan a actividades extravehiculares, ejercicio o cambios de horario operativos [48] | Calendario / teclado | — | [10][48][4] |
| V52 | Hora de acostarse y de levantarse (regularidad) | Hora; variabilidad entre días | Diario / actigrafía | Desalineación; la sincronización exige horarios constantes [10] | Sin corte | no encontrado | Cuestionario / wearable | — | [10][12] |

---

## 5. Fatiga y sobrecarga de trabajo

| # | Variable | Unidad / rango | Cómo se mide en vuelo / herramienta | Qué problema señala | Normal y corte de alerta | Cambio en vuelo / análogo | Entrada en app | Licencia | Fuente |
|---|---|---|---|---|---|---|---|---|---|
| V53 | Karolinska Sleepiness Scale (KSS) | 1-9 | Usada en estudios de vuelo y aviación; ítem único | Somnolencia momentánea | CLIN: valores >6 se asocian a peor conducción e intrusiones de sueño en EEG; los signos fisiológicos aparecen entre "somnoliento" y "luchando contra el sueño". El contexto la mueve 1-2 puntos | Tamaño de efecto 1,5-3 con privación de sueño (tierra); dato en vuelo no encontrado | Cuestionario de 1 toque | no encontrado | [30][31] |
| V54 | Samn-Perelli (fatiga) | 1 = totalmente alerta … 7 = completamente exhausto, incapaz de funcionar | Aviación; NASA la cita como escala de ítem único. Uso en ISS no encontrado | Fatiga momentánea | Corte oficial: no encontrado | no encontrado | Cuestionario de 1 toque | no encontrado | [31][4] |
| V55 | Fatiga mental, agotamiento físico, cansancio, somnolencia (escalas visuales) | Escalas visuales analógicas | Reaction Self Test en ISS (n=24) | Fatiga | AST: sin corte | Dormir <5 h se asocia a peores puntuaciones en todos los estados somáticos. La fatiga y el estrés autoinformados están entre los mejores predictores del PVT (n=24) [22] | Deslizadores | — | [11][22] |
| V56 | NASA-TLX | 6 subescalas (exigencia mental, física y temporal, rendimiento, esfuerzo, frustración); puntuación global ponderada | Recomendado por NASA en fase de diseño por ser diagnóstico | Carga de trabajo y su origen | Corte: no encontrado | no encontrado | Cuestionario tras la tarea | Página oficial no abrió; "app iOS gratuita y sin permiso de NASA": no verificado | [7] |
| V57 | Escala Bedford | 1-10 (árbol de decisión; capacidad mental sobrante) | Escala elegida por NASA para verificación | Sobrecarga cognitiva | AST (norma [V2 5007]): ≤3 en tareas nominales; ≤6 en condiciones degradadas | no encontrado | Cuestionario tras la tarea | no encontrado | [7][3] |
| V58 | Esfuerzo físico percibido (Borg CR10) | 0-10 | Autoinforme | Sobrecarga física | AST (norma [V2 10200]): ≤4 ("algo fuerte") | no encontrado | Cuestionario | no encontrado | [3][2] |
| V59 | Horas de trabajo | h/día; h/semana | Planificación frente a horas reales | Sobrecarga; "schedule creep" | AST: nominal 6,5 h/día y semana de 48 h. Sobrecarga crítica: jornadas de 10 h más de 3 días por semana, o >60 h/semana | Se ha documentado trabajo por encima de lo programado; NASA pide registrar las horas reales | Teclado / temporizador | — | [4] |
| V60 | Carga de trabajo autoinformada | Escala visual | Reaction Self Test (solo tarde) | Sobrecarga | Sin corte | Dormir <6 h se asocia a más carga percibida | Deslizador | — | [11] |
| V61 | Infracarga y monotonía | Autoinforme | — | Aburrimiento, baja atención, errores | Sin corte | NASA la señala como riesgo en espacio profundo | Cuestionario | — | [4][10] |
| V62 | Horas de vigilia continua | h | Diario / actigrafía | Fatiga aguda | Phoenix: ≥21 h de vigilia se asociaron a peor rendimiento y alerta | Tras 7 días durmiendo 6 h, el rendimiento equivale a 24-36 h sin dormir [2] | Calculada | — | [55][2] |
| V63 | Consumo de cafeína | mg/día; hora de la última toma | Reaction Self Test (tarde); autoinforme diario en HFBP-EM | Contramedida de fatiga; interfiere con el sueño | CLIN: 400 mg/día no se asocian en general a efectos negativos; efectos tóxicos con ≈1200 mg en poco tiempo (FDA) | El consumo aumentó a lo largo de los cuartos en ISS (sin porcentajes en el texto) | Teclado / botones | — | [11][6][63] |
| V64 | Fármacos para la alerta | Sí/no; fármaco | Entrevista posvuelo | Fatiga compensada con fármacos | Sin corte | 75 % de los entrevistados usó medicación de alerta; quienes usaron cafeína en pastillas o modafinilo conciliaban peor | Registro de medicación | — | [4] |

---

## 6. Deterioro cognitivo y de desempeño operativo (incluye CO2 y radiación)

Batería Cognition: 10 pruebas en 15 versiones; mediana de administración 17,8 min (WinSCAT: 13,5 min); corre en portátil del módulo Columbus y existe versión iPad [14]. Las 10 pruebas: Motor Praxis (MP), Visual Object Learning (VOLT), Fractal 2-Back (F2B), Abstract Matching (AM), Line Orientation (LOT), Emotion Recognition (ERT), Matrix Reasoning (MRT), Digit-Symbol Substitution (DSST), Balloon Analog Risk (BART) y Psychomotor Vigilance (PVT) [14].

| # | Variable | Unidad / rango | Cómo se mide en vuelo / herramienta | Qué problema señala | Normal y corte de alerta | Cambio en vuelo / análogo | Entrada en app | Licencia | Fuente |
|---|---|---|---|---|---|---|---|---|---|
| V65 | PVT-B: velocidad de respuesta | 1/tiempo de reacción (s⁻¹) | Reaction Self Test en ISS cada 4 días, mañana y tarde | Alerta; pérdida de sueño | La velocidad y los lapsos deben ser los resultados primarios; evitar media y mediana del tiempo de reacción [16]. Sin corte absoluto | Más lenta con ≤6 h de sueño (34,9 % de las noches; F=40,76; p<0,0001); más rápida con >9 h que con ≤7 h; más lenta la semana previa al lanzamiento | Prueba en pantalla | Paradigma público; software de NASA no distribuido (no verificado) | [11][15][16] |
| V66 | PVT-B: lapsos | Recuento; umbral ≥355 ms (≥500 ms en la versión de 10 min) | Igual | Lapsos de atención | Umbral de 355 ms para igualar la sensibilidad de la versión larga | Tamaño de efecto 1,49 (privación total) y 0,76 (parcial) con umbral de 355 ms; valores en vuelo no encontrados en el texto | Prueba en pantalla | Igual | [15][11] |
| V67 | PVT: falsos arranques | Respuestas sin estímulo o con tiempo <100 ms (<130 ms en la Reaction Self Test) | Igual | Impulsividad, compensación | Sin corte | La versión breve da más falsos arranques que la de 10 min | Prueba en pantalla | Igual | [15][11] |
| V68 | Batería Cognition (velocidad, precisión y eficiencia por prueba) | Puntuación z frente a la línea base prevuelo, corregida por práctica | ISS (Standard Measures, n=25); ≈3 veces por semana en HFBP-EM; HERA; invernadas antárticas | Deterioro en 10 dominios | AST: "puntuación baja" = z ≤ −1,5 respecto a la media prevuelo de la muestra | 11,8 % de las puntuaciones de vuelo y posvuelo fueron bajas; sin declive sistemático; enlentecimiento al inicio del vuelo en velocidad de procesamiento, memoria de trabajo visual y atención sostenida | Prueba en pantalla | no encontrado (software de UPenn/NASA) | [17][14][6] |
| V69 | DSST (sustitución dígito-símbolo) | Aciertos y velocidad | Parte de Cognition | Velocidad de procesamiento (sensible, poco específica) | >13 % de puntuaciones bajas en vuelo y posvuelo [5] | d = 0,68 tras una noche sin dormir; más lenta al inicio del vuelo | Prueba en pantalla | Paradigma derivado del WAIS; implementación propia posible | [14][65][5] |
| V70 | Fractal 2-Back | Aciertos y velocidad | Parte de Cognition | Memoria de trabajo visual | >13 % de puntuaciones bajas | Más lenta al inicio del vuelo | Prueba en pantalla | — | [17][5] |
| V71 | Razonamiento abstracto (MRT) y memoria visual (VOLT) | Aciertos | Parte de Cognition | Razonamiento, aprendizaje | Sin corte | Estudio de gemelos (n=1, 1 año): memoria visual −1,3 DE y razonamiento inductivo −2,9 DE frente a la línea base; d = 0,65 en razonamiento tras una noche sin dormir | Prueba en pantalla | — | [5][14][20] |
| V72 | Propensión al riesgo (BART) | Inflados por globo | Parte de Cognition | Toma de decisiones de riesgo | Sin corte | Disminuyó al final del vuelo y en posvuelo (n=25) | Prueba en pantalla | — | [17] |
| V73 | Reconocimiento de emociones (ERT) | Aciertos y velocidad | Parte de Cognition | Procesamiento emocional (relevante para el equipo) | Sin corte | HERA: menos preciso durante restricción parcial de sueño (n=32) | Prueba en pantalla | — | [18] |
| V74 | WinSCAT | Batería de cribado de 11-15 min | Requisito médico en ISS: línea base 6 meses antes y una vez al mes en órbita; también tras un evento médico | Estado neurocognitivo | AST: resultado "fuera de lo nominal" frente a la línea base propia (regla exacta no encontrada) | 13,2 % de las sesiones fuera de lo nominal hasta la Expedición 41; 19 % con la versión más reciente y reglas estrictas (Exp. 27-42) | Prueba en pantalla (no replicable tal cual) | Propiedad de NASA | [5][19][3] |
| V75 | ROBoT-r (tarea robótica operativa) | Rendimiento en captura simulada | 3 veces por semana en HFBP-EM; ISS (Behavioral Core Measures) | Desempeño operativo | Corte: no encontrado | no encontrado | No replicable; equivalente: mini-tarea de seguimiento en pantalla | NASA | [6][67] |
| V76 | Tiempo de reacción en simulación de acoplamiento | ms | ISS, n=5, con EEG | Desempeño visomotor | Sin corte | Aumento de tiempos por encima de 244 ms tras 2 meses (p=0,012) | Prueba en pantalla | — | [23] |
| V77 | Presión parcial de CO2 en cabina | mmHg (0,5 % ≈ 3,8 mmHg) | Sensores ambientales de la nave | Cefalea, "pensamiento borroso", fatiga, mal sueño | AST (norma [V2 6004]): media de 1 h ≤3 mmHg (antes 3,8-7,5). Para riesgo de cefalea <1 %: media de 7 días <2,5 mmHg | ISS: rango 1-9 mmHg [8][46]; media 0,3-0,5 % [5]. Síntomas anecdóticos: cefalea a 2,8-4,5 mmHg; fatiga, peor sueño y náusea >4,5 mmHg [8] | Entrada manual o lectura de sensor | — | [8][46][5] |
| V78 | Efecto cognitivo del CO2 (toma de decisiones) | Puntuaciones de simulación estratégica y Cognition | Solo en tierra (cámara) | Deterioro por CO2 | Evidencia contradictoria; sin corte cognitivo | Oficina (n=22): caída moderada a 1000 ppm y grande a 2500 ppm frente a 600 ppm [51]. Sujetos tipo astronauta (n=22): sin dosis-respuesta; peor a 1200 ppm, igual o mejor a 2500-5000 ppm [52] | — | — | [51][52][8] |
| V79 | Dosis de radiación | Dosis registrada por dosímetro | Dosímetros personales y de área ([V2 6161], [V2 6162]) | Posible efecto sobre el sistema nervioso central | Límite o corte cognitivo: no encontrado (la página HRP del riesgo de radiación sobre el SNC dio error 404) | En ISS (n=24), la dosis de radiación y la temperatura figuran entre los predictores importantes del PVT-B, junto al rendimiento previo y a la fatiga y el estrés autoinformados | Entrada manual | — | [22][3] |
| V80 | Temperatura de cabina | °C | Sensores ambientales | Sueño y vigilancia | ISS: 18-27 °C y 30-65 % de humedad [2] | Predictor del PVT-B (n=24) | Entrada manual / sensor | — | [22][2] |
| V81 | Rendimiento cognitivo tras despertar con hipnótico | PVT, memoria de trabajo, recuerdo de palabras | Ensayo en tierra con 34 participantes (9 astronautas, 7 candidatos, 18 controladores) | Riesgo de error en un despertar de emergencia | Sin corte | Zolpidem 10 mg empeoró rendimiento, vigilancia (p<0,001), memoria de trabajo y somnolencia en el despertar cerca del pico; zaleplón 10 mg y zolpidem 5 mg, efectos menores; sin deterioro al despertar final (≈6,7 h) | PVT asociado al registro de la dosis | — | [50] |

Nota: la evidencia global sobre déficits cognitivos en vuelos largos "no apoya ni refuta con fuerza" su existencia (11 estudios, 42 sujetos); lo consistente es la variabilidad entre individuos [21]. Eso refuerza comparar con la línea base propia.

---

## 7. Cefalea espacial

Clasificación: ICHD-3, apéndice A10.8.1 "Headache attributed to travel in space" [47].

| # | Variable | Unidad / rango | Cómo se mide en vuelo / herramienta | Qué problema señala | Normal y corte de alerta | Cambio en vuelo / análogo | Entrada en app | Licencia | Fuente |
|---|---|---|---|---|---|---|---|---|---|
| V82 | Episodio de cefalea (sí/no, fecha, duración) | Recuento; episodios separados por ≥4 h sin dolor | Cuestionario a bordo en ISS (prospectivo, n=24, 3596 días) | Cefalea espacial | Sin corte; cualquier episodio en alguien sin historial es relevante | 22 de 24 (91,7 %) tuvieron ≥1 episodio; 378 episodios (mediana 9, rango 1-128). Retrospectivo: 23 de 42 (54,8 %). Estudio previo: 12 de 17 (71 %) | Cuestionario | — | [45][44] |
| V83 | Intensidad de la cefalea | Escala numérica 0-10 | Igual | Gravedad | Sin corte validado en vuelo | Intensidad moderada a grave en el 71 % de los episodios (n=21 episodios) [44] | Deslizador | — | [45][44] |
| V84 | Fenotipo y síntomas acompañantes | Tipo tensional o migraña; náusea, vómito, congestión nasal, edema facial | Cuestionario basado en criterios ICHD | Distinguir adaptación temprana de cefalea tardía | Criterios ICHD-3 | 89,9 % tipo tensional y 10,1 % migraña. Primera semana vs. después: migraña 23,5 % vs. 5,1 %; congestión nasal 52,9 % vs. 29,7 %; edema facial 41,2 % vs. 1,4 %; vómito 9,8 % vs. 0,7 %. El 76 % no se asocia a mareo espacial [44] | Lista de verificación | — | [45][44] |
| V85 | Relación cefalea-CO2 | Probabilidad de cefalea por mmHg | Informes de cefalea cruzados con CO2 de cabina | Cefalea por hipercapnia | Ver V77 | Cada +1 mmHg duplica la probabilidad de informar cefalea [46]; 19 de 49 astronautas la refirieron [8]. El estudio prospectivo no halló asociación con CO2, O2, presión ni temperatura (p>0,05) [45]: evidencia contradictoria | Calculada (V82 con V77) | — | [46][8][45] |
| V86 | Tratamiento de la cefalea | Fármaco; alivio | Cuestionario | Carga de la cefalea | Sin corte | Medicación aguda en el 55,6 % de los episodios; otra medicación 22,4 %; medidas alternativas 41,1 % | Registro de medicación | — | [45] |

---

## 8. Uso de medicación como indicador

| # | Variable | Unidad / rango | Cómo se mide en vuelo / herramienta | Qué problema señala | Normal y corte de alerta | Cambio en vuelo / análogo | Entrada en app | Licencia | Fuente |
|---|---|---|---|---|---|---|---|---|---|
| V87 | Uso de hipnóticos | % de noches; sí/no por noche; fármaco, dosis y hora; segunda dosis | Diario de sueño y medicación (Shuttle en papel, ISS informatizado); registros médicos | Insomnio, desalineación circadiana, noches previas a actividades críticas | Sin corte. Referencia: en tierra, 5 % de las noches a 3 meses del lanzamiento. Señales de alerta razonables: aumento frente a la línea base propia o redosificación | Shuttle: 78 % de los tripulantes (61/78) y 52 % de las noches (500/963); 60 % de las noches previas a una actividad extravehicular. ISS: 75 % (12/16; 8 de 21 no contestaron) y 11 % de los registros (96/852). Zolpidem en el 73 % de las noches de dosis única, zolpidem de liberación prolongada 12 %, zaleplón 11 %. Dos dosis en el 17 % (Shuttle) y 19 % (ISS) de las noches con medicación. 24 % de uso en sueño desalineado vs. 11 % alineado [12]. Uso de ayudas para dormir ≈10 veces mayor que en adultos ambulatorios [48]. Encuesta posvuelo: 71 % las usó [4] | Botones / teclado | — | [1][12][48][4] |
| V88 | Uso de cualquier medicación (analgésicos, descongestivos, antieméticos) | Sí/no por día; indicación; eficacia; efectos adversos | Registros médicos (24 tripulantes, 20 misiones ISS de >30 días); informes posvuelo de 79 misiones Shuttle | Dolor, cefalea, congestión, mareo; indicador indirecto de malestar | Sin corte | ISS: lo más usado fue para sueño, dolor, congestión o alergia [48]; uso de alguna medicación en el 63 % de los días con sueño desalineado vs. 49 % alineado [12]. Shuttle: 94 % de los registros con alguna medicación; de ellos, 47 % por mareo espacial y 45 % por alteraciones del sueño; ≈80 % de las dosis percibidas como eficaces [49] | Registro de medicación | — | [48][12][49] |

---

## Huecos importantes ("no encontrado" / "no verificado")

1. Ninguna escala clínica tiene punto de corte validado en astronautas; solo hay cortes clínicos terrestres.
2. Uso operativo en ISS de PHQ-9, GAD-7, PSS, PANAS, ISI, PSQI, ESS, KSS y Samn-Perelli: no encontrado.
3. Rangos y normas de PANAS, POMS (y su licencia), bandas del BDI-II y rango del PSS-10: no verificados en página abierta.
4. Umbrales numéricos de la National Sleep Foundation (latencia, WASO, eficiencia): no verificados; solo se confirmó que son indicadores aceptados.
5. Umbral de DLMO (3-4 pg/mL en saliva) y cualquier método práctico de fase circadiana en vuelo: no verificado / no existe según NASA.
6. Valores de referencia y corte de cortisol salival; corte de HRV; todo lo relativo a EDA en vuelo: no encontrado.
7. WASO medio en vuelo y valores absolutos de PVT (tiempos, lapsos) en ISS: no encontrados en el texto accesible (están en material suplementario).
8. Corte oficial de Samn-Perelli, KSS operativo y NASA-TLX: no encontrado. La página oficial de NASA-TLX no cargó.
9. Tabla 8.7-2 de NASA-STD-3001 Vol. 2 (iluminación fisiológica) y lux actuales de la ISS con iluminación LED: no encontrado.
10. Radiación y sistema nervioso central: sin umbral cognitivo en humanos; la página HRP de ese riesgo dio 404.
11. Datos de sueño en invernadas antárticas (duración, n) y detalle de Alfano 2021: no verificados.
12. Condiciones de licencia de Cognition, WinSCAT, GES/WES y cuestionarios de equipo de HFBP-EM: no encontrado.

---

## Fuentes

Nota de acceso: PubMed y PMC devolvieron páginas de verificación anti-bot en la mayoría de los intentos. Los resúmenes marcados "(vía E-utilities)" se leyeron del mismo registro a través de la API oficial de NCBI (eutils.ncbi.nlm.nih.gov); los marcados "(vía Europe PMC)" se leyeron en texto completo desde la API de Europe PMC. Los PDF de NASA se descargaron y se leyeron como texto.

1. Barger LK et al. 2014, Lancet Neurol. Sueño e hipnóticos en Shuttle e ISS. https://pmc.ncbi.nlm.nih.gov/articles/PMC4188436/
2. NASA OCHMO-TB-041 Rev B, Sleep Accommodations (2023). https://www.nasa.gov/sites/default/files/atoms/files/sleep_accomodations_technical_brief_ochmo.pdf
3. NASA OCHMO-TB-016 Rev B, Behavioral Health and Performance (2023). https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-016-behavioral-health.pdf
4. NASA HRP Evidence Report: Sleep Loss, Circadian Desynchronization, and Work Overload (2016). https://humanresearchroadmap.nasa.gov/Evidence/reports/Sleep.pdf
5. NASA HRP Evidence Report: Adverse Cognitive or Behavioral Changes and Psychiatric Disorders (BMed, 2025). https://ntrs.nasa.gov/api/citations/20250001454/downloads/BMed%20Evidence%20Report%20final%202-10-25.docx
6. NASA HRP Evidence Report: Team Risk (2022), incluye la tabla HFBP-Exploration Measures. https://ntrs.nasa.gov/api/citations/20220007465/downloads/Evidence%20Report%20-%20Team%202022%20FINAL4PUB%20rev%201.docx.pdf
7. NASA OCHMO-TB-032 Rev C, Cognitive Workload Assessment Methods (2023). https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-032-cognitive-workload.pdf
8. NASA OCHMO-TB-004 Rev D, Carbon Dioxide. https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-004-carbon-dioxide.pdf
9. NASA OCHMO-TB-026, Lighting Design. https://www.nasa.gov/sites/default/files/atoms/files/lighting_design_technical_brief_ochmo.pdf
10. NASA-STD-3001 Vol. 1 Rev C (2023), justificación de [V1 6001]. Leído en una copia local en texto descargada por otro agente del equipo; URL del PDF no verificada por mí. Los enunciados de los requisitos están reproducidos en [2] y [3].
11. Jones CW et al. 2022, Sleep. Reaction Self Test en ISS, n=24. https://pmc.ncbi.nlm.nih.gov/articles/PMC8919197/
12. Flynn-Evans EE et al. 2016, npj Microgravity. https://pubmed.ncbi.nlm.nih.gov/28725719/ (vía E-utilities y Europe PMC, PMC5515517)
13. Dijk DJ et al. 2001, Am J Physiol. https://pubmed.ncbi.nlm.nih.gov/11641138/ (vía E-utilities)
14. Basner M et al. 2015, Aerosp Med Hum Perform. Batería Cognition. https://pubmed.ncbi.nlm.nih.gov/26564759/ (resumen y texto de PMC4691281 vía E-utilities)
15. Basner M, Mollicone D, Dinges DF 2011, Acta Astronaut. PVT-B. https://pubmed.ncbi.nlm.nih.gov/22025811/ (resumen y texto de PMC3197786 vía E-utilities)
16. Basner M, Dinges DF 2011, Sleep. https://pubmed.ncbi.nlm.nih.gov/21532951/ (vía E-utilities)
17. Dev SI et al. 2024, Front Physiol. https://doi.org/10.3389/fphys.2024.1451269 (resumen vía E-utilities)
18. Nasrini J et al. 2020, Front Physiol. HERA. https://doi.org/10.3389/fphys.2020.00394 (resumen vía E-utilities)
19. Kane RL et al. 2005. WinSCAT. https://pubmed.ncbi.nlm.nih.gov/15943211/ (vía E-utilities)
20. Garrett-Bakelman FE et al. 2019, Science. Estudio de gemelos. https://pubmed.ncbi.nlm.nih.gov/30975860/ (vía E-utilities; cifras en DE tomadas de [5])
21. Strangman GE et al. 2014. https://pubmed.ncbi.nlm.nih.gov/25245904/ (vía E-utilities)
22. Tu D et al. 2022, Sci Rep. https://pubmed.ncbi.nlm.nih.gov/35773291/ (vía E-utilities)
23. Petit G et al. 2019, npj Microgravity. https://pubmed.ncbi.nlm.nih.gov/31069253/ (vía E-utilities)
24. Kroenke K et al. 2001. PHQ-9. https://pubmed.ncbi.nlm.nih.gov/11556941/ (vía E-utilities)
25. Spitzer RL et al. 2006. GAD-7. https://pubmed.ncbi.nlm.nih.gov/16717171/ (vía E-utilities)
26. PHQ Screeners: manual de instrucciones https://www.phqscreeners.com/images/sites/g/files/g10016261/f/201412/instructions.pdf y condiciones de uso https://www.phqscreeners.com/terms
27. Löwe B et al. 2010. PHQ-4. https://pubmed.ncbi.nlm.nih.gov/19616305/ (vía E-utilities)
28. Morin CM et al. 2011. ISI. https://pubmed.ncbi.nlm.nih.gov/21532953/ (vía E-utilities); formulario con bandas: https://www.med.upenn.edu/snaplab/assets/user-content/documents/insomnia-severity-index.pdf
29. Buysse DJ et al. 1989. PSQI. https://pubmed.ncbi.nlm.nih.gov/2748771/ (vía E-utilities); licencia: https://www.sleep.pitt.edu/psqi
30. Åkerstedt T, Gillberg M 1990 https://pubmed.ncbi.nlm.nih.gov/2265922/ ; Åkerstedt T et al. 2014 https://doi.org/10.1111/jsr.12158 ; Kaida K et al. 2006 https://pubmed.ncbi.nlm.nih.gov/16679057/ (todos vía E-utilities)
31. IATA/ICAO/IFALPA, Common Protocol for Minimum Data Collection Variables in Aviation Operations (anexos KSS y Samn-Perelli). https://www.iata.org/contentassets/5f976bb3ca2446f3a40e88b18dd61fbb/common-protocol-for-minimum-data-collection-variables-in-aviation-ops.pdf
32. Johns MW 1991 https://pubmed.ncbi.nlm.nih.gov/1798888/ (vía E-utilities); sitio oficial: https://epworthsleepinessscale.com/about-the-ess/
33. Cohen S et al. 1983 https://pubmed.ncbi.nlm.nih.gov/6668417/ (solo cita); página del laboratorio del autor: https://www.cmu.edu/dietrich/psychology/stress-immunity-disease-lab/scales/index.html
34. Watson D et al. 1988. PANAS. https://pubmed.ncbi.nlm.nih.gov/3397865/ (vía E-utilities)
35. Topp CW et al. 2015 https://pubmed.ncbi.nlm.nih.gov/25831962/ ; Christiansen CH et al. 2025 https://doi.org/10.1186/s40359-025-02343-6 (vía E-utilities); OMS: https://www.who.int/publications/m/item/WHO-UCN-MSD-MHE-2024.01
36. Wang YP, Gorenstein C 2013. BDI-II. https://pubmed.ncbi.nlm.nih.gov/24402217/ (vía E-utilities)
37. Kanas N et al. 2001. Astenia. https://pubmed.ncbi.nlm.nih.gov/11719624/ (vía E-utilities)
38. Kanas NA et al. 2007. ISS, POMS/GES/WES. https://pubmed.ncbi.nlm.nih.gov/17571662/ (vía E-utilities)
39. Palinkas LA, Suedfeld P 2008, Lancet. https://pubmed.ncbi.nlm.nih.gov/17655924/ (vía E-utilities)
40. Šolcová I et al. 2013. Mars-500. https://pubmed.ncbi.nlm.nih.gov/24279233/ (vía E-utilities)
41. Stuster J 2010, NASA/TM-2010-216130, Astronaut Journals. https://ntrs.nasa.gov/api/citations/20100026549/downloads/20100026549.pdf
42. Dinges DF et al. 2005. Reconocimiento óptico de expresión facial. https://pubmed.ncbi.nlm.nih.gov/15943210/ (vía E-utilities)
43. Thoret E et al. 2024, PLoS Comput Biol. Voz y privación de sueño. https://pubmed.ncbi.nlm.nih.gov/38315733/ (vía E-utilities)
44. Vein AA et al. 2009, Cephalalgia. https://pubmed.ncbi.nlm.nih.gov/19175610/ (vía E-utilities)
45. van Oosterhout WPJ et al. 2024, Neurology. https://pubmed.ncbi.nlm.nih.gov/38478846/ (vía E-utilities y Europe PMC, PMC11033988)
46. Law J et al. 2014, J Occup Environ Med. https://pubmed.ncbi.nlm.nih.gov/24806559/ (vía E-utilities)
47. ICHD-3, resultado de búsqueda interna con la entrada A10.8.1. https://ichd-3.org/?s=space
48. Wotring VE 2015, FASEB J. https://pubmed.ncbi.nlm.nih.gov/26187345/ (vía E-utilities)
49. Putcha L et al. 1999. https://pubmed.ncbi.nlm.nih.gov/10417009/ (vía E-utilities)
50. Dinges DF et al. 2019, Sleep. Zolpidem y zaleplón. https://pubmed.ncbi.nlm.nih.gov/30576525/ (vía E-utilities)
51. Satish U et al. 2012, Environ Health Perspect. https://pubmed.ncbi.nlm.nih.gov/23008272/ (vía E-utilities)
52. Scully RR et al. 2019, npj Microgravity. https://pubmed.ncbi.nlm.nih.gov/31240239/ (vía E-utilities y Europe PMC, PMC6584569)
53. Benloucif S et al. 2008, J Clin Sleep Med. https://pubmed.ncbi.nlm.nih.gov/18350967/ (solo resumen, vía E-utilities)
54. Arendt J 2012, Chronobiol Int. https://doi.org/10.3109/07420528.2012.668997 (resumen vía E-utilities)
55. Barger LK et al. 2012, Sleep. Misión Phoenix. https://pubmed.ncbi.nlm.nih.gov/23024441/ (vía E-utilities)
56. Stahn AC et al. 2017, Sci Rep. https://pubmed.ncbi.nlm.nih.gov/29170507/ (vía E-utilities)
57. Mehta SK et al. 2017, npj Microgravity. https://pubmed.ncbi.nlm.nih.gov/28649633/ (vía E-utilities)
58. Stalder T et al. 2016. https://pubmed.ncbi.nlm.nih.gov/26563991/ (vía E-utilities)
59. Shaffer F, Ginsberg JP 2017, Front Public Health (reproduce las normas de Nunan 2010). https://europepmc.org/article/PMC/PMC5624990 (texto vía API de Europe PMC); Nunan D et al. 2010 https://pubmed.ncbi.nlm.nih.gov/20663071/
60. Kim HG et al. 2018. https://pubmed.ncbi.nlm.nih.gov/29486547/ (vía E-utilities)
61. Xu D et al. 2013. https://pubmed.ncbi.nlm.nih.gov/23637139/ (vía E-utilities)
62. Boucsein W et al. 2012 https://pubmed.ncbi.nlm.nih.gov/22680988/ ; Vos G et al. 2023 https://doi.org/10.1016/j.ijmedinf.2023.105026 (vía E-utilities)
63. FDA, "Spilling the Beans: How Much Caffeine is Too Much?". https://www.fda.gov/consumers/consumer-updates/spilling-beans-how-much-caffeine-too-much
64. Ohayon M et al. 2017 https://pubmed.ncbi.nlm.nih.gov/28346153/ ; Watson NF et al. 2015 https://pubmed.ncbi.nlm.nih.gov/26039963/ (solo resúmenes, vía E-utilities)
65. Jaeger J 2018. DSST. https://pubmed.ncbi.nlm.nih.gov/30124583/ (vía E-utilities)
66. NASA, Spaceflight Standard Measures. https://www.nasa.gov/humans-in-space/spaceflight-standard-measures-characterizing-how-humans-adapt-in-space
67. NASA HHP, páginas de riesgo: conductual https://www.nasa.gov/directorates/esdmd/hhp/risk-of-adverse-cognitive-or-behavioral-conditions-and-psychiatric-disorders y sueño https://www.nasa.gov/directorates/esdmd/hhp/risk-of-performance-decrements-and-adverse-health-outcomes-resulting-from-sleep-loss-circadian-desynchronization-and-work-overload
