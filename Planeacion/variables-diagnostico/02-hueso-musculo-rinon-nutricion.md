# Catálogo de variables clínicas medibles — Bloque 02: hueso, riñón, músculo/aeróbico, columna, sensoriomotor, nutrición, glucosa y lesiones

Reto: NASA Space Apps 2026 — "Create Health Monitoring Software for Astronauts on Space Missions".
Fecha de la investigación: 2026-11-14.

## Cómo leer este archivo

- Cada variable tiene un identificador (V01…V97; V67 y V68 se dividen en a/b) para poder referenciarla desde el código de la app. **Total: 99 variables.**
- **[A]** = umbral o dato validado/definido en astronautas o por NASA (estándar, informe de evidencia, estudio en vuelo).
- **[T]** = umbral clínico terrestre (guía o laboratorio de referencia en Tierra); no está validado para microgravedad.
- **"no encontrado"** = lo busqué y no lo localicé en una fuente que pudiera abrir. No se rellenó de memoria.
- Los números entre corchetes `[n]` remiten a la lista de fuentes del final. Todas las URL listadas se abrieron durante esta investigación (ver "Notas de método" para las excepciones y la forma de acceso).
- "Entrada en app": M = manual/teclado · W = wearable/sensor · C = cámara/foto · US = imagen de ultrasonido · LAB = laboratorio (a bordo o en tierra) · DEV = importación de datos de un equipo de la nave (ARED, CEVIS, T2, SLAMMD…).
- Regla general sobre laboratorio en vuelo: en la ISS la sangre y la orina se recogen, se procesan y **se congelan para analizarse tras el regreso** [5][6]; la orina de 24 h se recoge micción a micción con bolsas UCD [5]. Es decir, casi ningún biomarcador de este bloque está disponible en tiempo real para el astronauta. NASA declara además que **ningún sistema mide hoy la densidad ósea en vuelo** [1].

---

## 1. Pérdida de densidad ósea y riesgo de fractura

Contexto [A]: pérdida media de DMO areal de **1–1,5 % por mes** en misiones de 4–6 meses, con gran variación entre sitios y personas [11][14]; no ha habido fracturas en vuelo [1]. Estándar NASA-STD-3001: las contramedidas deben mantener la DMO de cadera y columna ≥95 % del valor previo y ≥90 % en cuello femoral [V1 4027] [3].

| ID | Variable | Unidad | Cómo se mide en vuelo / equipo | Qué señala | Rango normal y umbral de alerta (fuente) | Cambio en vuelo (magnitud, n) | Entrada en app | Fuente |
|---|---|---|---|---|---|---|---|---|
| V01 | DMO areal por DXA (cadera total, cuello femoral, trocánter, columna L1–L4) | g/cm²; % del valor previo | **Solo en tierra.** Calendario ejemplo ISS 180 d: L-21/18 meses, L-180/30 d, R+<30 d, R+1 año [1] | Pérdida ósea, riesgo de fractura | [A] ≥95 % del valor previo en cadera/columna y ≥90 % en cuello femoral [3]. Cambio mínimo detectable del laboratorio (LSC 95 %): cadera total 2,1 %, trocánter 3,0 %, cuello femoral 3,9 %, lumbar 2,3 % [22] | 1–1,5 %/mes [11][14]. n=46, 178±48 d: DMO media −2,1 % a −3,7 %; contenido trabecular −5,3 % a −8,5 % [22]. n=45 (56 pares pre/post): pérdidas de 2–9 % según sitio; 50 % de recuperación en ≤9 meses [33] | M (resultado de informe) | [1][3][11][14][22][33] |
| V02 | T-score (DXA) | DE respecto a adulto joven | Solo en tierra | Clasificación densitométrica | [A] NASA: certificación previa a misión larga T ≥ −1,0; eficacia de contramedidas y fin de misión T ≥ −2,0; aspirantes con T < −2,5 no se seleccionan; T entre −1 y −2,5 → estudio de patología subyacente [1]. [T] OMS (1994, citada por NASA): normal ≥ −1,0; osteopenia entre −1,0 y −2,5; osteoporosis ≤ −2,5; grave = ≤ −2,5 + fractura por fragilidad [1] | Derivado de V01 | M | [1] |
| V03 | Z-score (DXA) | DE respecto a pares de edad/sexo/etnia | Solo en tierra | DMO anómala para la edad | [A] Z < −2,0 → evaluación de enfermedad metabólica ósea e intervención de ejercicio/nutrición; el texto también cita Z < −1,5 como "atípico" [1] | no encontrado | M | [1] |
| V04 | FRAX (riesgo de fractura a 10 años) | % | Solo en tierra; se calcula en cada sesión DXA | Probabilidad de fractura | [A] >3 % cadera o >20 % fractura mayor → derivación a especialista [1] | no encontrado | M / cálculo en app | [1] |
| V05 | DMO volumétrica y microarquitectura (QCT de cadera, HR-pQCT de tibia/radio) | mg/cm³; carga de fallo (N) | Solo en tierra; QCT aún no es requisito [1] | Hueso trabecular vs. cortical; resistencia | no encontrado (sin umbral operativo) | n=17 (HR-pQCT): a los 12 meses del regreso la tibia seguía −0,9 % a −2,1 % bajo el valor previo; 9 de 17 no recuperaron la DMO total; peor en misiones >6 meses (carga de fallo −3,9 %) [24] | M | [1][24] |
| V06 | Trabecular Bone Score (TBS) | adimensional | Solo en tierra (software sobre DXA lumbar) | Calidad trabecular vertebral | no encontrado | no encontrado | M | [1] |
| V07 | NTX urinario (N-telopéptido) | nmol/d (orina 24 h) | Orina de 24 h con UCD, congelada; análisis en tierra [5] | Resorción ósea | no encontrado (rango de referencia) | Excreción de crosslinks >100 % sobre el valor previo en vuelo (≈+50 % en reposo en cama) [5]; vuelve al valor previo ≈1 mes tras el regreso [24] | LAB | [5][24] |
| V08 | CTX (C-telopéptido) urinario/sérico | µg/d o ng/mL | Igual que V07 | Resorción ósea | no encontrado | Elevado en vuelo; normaliza ≈1 mes postvuelo; más alto en quienes no recuperan DMO [24] | LAB | [5][24] |
| V09 | Fosfatasa alcalina ósea (BSAP) | U/L o µg/L | Sangre en vuelo, congelada; análisis en tierra [5][6] | Formación ósea | no encontrado | n=13: tiende a subir al final del vuelo (p=0,06) y sube a R+30 (p<0,001) [32]; vuelve al valor previo hacia R+6 meses [24] | LAB | [24][32] |
| V10 | P1NP | µg/L | Sangre; análisis en tierra | Formación ósea | no encontrado | Vuelve al valor previo hacia R+6 meses [24] | LAB | [24] |
| V11 | Osteocalcina | ng/mL | Sangre; análisis en tierra | Recambio óseo | no encontrado | Elevada hasta R+6 meses; normal a R+12 meses [24] | LAB | [24] |
| V12 | Esclerostina | pmol/L | Sangre; análisis en tierra | Inhibición de formación (osteocito) | no encontrado | +10–15 % en los grupos con ARED (p<0,06) [36] | LAB | [36] |
| V13 | PTH | pg/mL | Sangre; análisis en tierra | Regulación del calcio | no encontrado | Típicamente disminuida en vuelo [5]; ARED atenúa la caída vista con iRED [36] | LAB | [5][36] |
| V14 | Calcio sérico | mg/dL | Sangre; NASA lo vigila desde la selección [1] | Hipercalcemia / trastorno paratiroideo | no encontrado | ARED sin efecto significativo sobre calcio sérico total [5] | LAB | [1][5] |
| V15 | Carga de ejercicio resistivo relativa al peso corporal (sentadilla, peso muerto, elevación de talón en ARED) | lbf o kg; × peso corporal | ARED registra los parámetros de cada sesión y los envía a tierra [1] | Estímulo osteogénico insuficiente | [A] Se necesitan 2–3× el peso corporal para mantener masa ósea; ARED da hasta 600 lbf (iRED 300 lbf fue insuficiente) [1]. Frecuencia eficaz en vuelo/reposo: 6–7 sesiones/semana [1] | Cargas medias reales: sentadilla 181 lb (150–223), peso muerto 192 lb (156–215), elevación de talón 239 lb (198–293), press banca 122 lb (98–153); n=46, 178 d [2] | DEV / M | [1][2] |
| V16 | Uso de bifosfonato (sí/no, dosis) | mg/semana | Registro de medicación | Contramedida farmacológica | no aplica | Alendronato 70 mg/semana + ARED: sin cambio significativo pre/post en DXA y QCT (n=7 frente a 18 controles) [1][2] | M | [1][2] |

Notas: la relación hierro–hueso (ferritina, V78) y la vitamina D (V76) están en la sección 6; el calcio urinario (V18) en la sección 2.

---

## 2. Cálculos renales (litiasis) y deshidratación

Contexto [A]: el riesgo principal es la hipercalciuria por resorción ósea más el bajo volumen de orina; el riesgo aumenta rápido al inicio del vuelo, se mantiene y persiste tras el aterrizaje [4]. Recuento OCHMO: 43 eventos de litiasis en 29 tripulantes, ninguno en vuelo en tripulantes del segmento USOS; un caso en vuelo en un cosmonauta [13]. Informe de 2017: 37 eventos entre 357 astronautas (mediados de 2016) [4].

| ID | Variable | Unidad | Cómo se mide en vuelo / equipo | Qué señala | Rango normal y umbral de alerta (fuente) | Cambio en vuelo (magnitud, n) | Entrada en app | Fuente |
|---|---|---|---|---|---|---|---|---|
| V17 | Volumen de orina de 24 h | L/d | Bolsas UCD por micción durante 24 h (investigación) [5]; sin medición rutinaria (el inodoro no permite muestrear) [5] | Deshidratación, riesgo de litiasis | [A] Referencia JSC 2–2,5 L/d; el riesgo aumenta por debajo de 1,5 L/d; objetivo de contramedida 2,5–3 L/d [4]. [T] 800–2000 mL/d [45] | Mir n=11: −47 % antes del día 30 y −39 % después del día 60 [4]; ISS: ≈17 % menor que antes del vuelo [5]; menor en vuelo en todos los grupos y momentos [36] | M (nº y volumen de micciones) | [4][5][36][45] |
| V18 | Calcio urinario de 24 h | mg/d | Orina 24 h congelada; análisis en tierra | Hipercalciuria (resorción ósea) → litiasis | [A] Referencia JSC <300 (hombres) / <250 (mujeres) mg/d [4]. [T] 100–250 mg/d; >300 alto [42] | Shuttle (n=332/329): 183 → 234 mg/d postvuelo (p<0,05); hipercalciuria >250 mg/d: 20,8 % → 38,9 % [4]. Mir n=11: 129–435 mg/d en vuelo, 5/11 >250 mg/d [4]. Solo ejercicio resistivo: +50 % al inicio del vuelo [4]. Concentración de calcio en orina +50 % en vuelo [5] | LAB | [4][5][42] |
| V19 | Citrato urinario | mg/d | Orina 24 h; análisis en tierra | Falta de inhibidor de cristalización | [A] >320 mg/d [4] | 714 → 629 mg/d postvuelo (p<0,05); hipocitraturia 6,9 % → 14,6 % [4] | LAB | [4] |
| V20 | pH urinario | unidades de pH | Orina 24 h; análisis en tierra. Tira reactiva a bordo: no encontrado en fuente primaria | Orina ácida (ácido úrico, oxalato cálcico) o alcalina (>7,2: estruvita; brushita) | [A] Referencia JSC 4,5–8,0; >7,2 favorece estruvita [4]. [T] 4,6–8,0 [44] | 6,05 → 5,79 postvuelo (p<0,05) [4] | LAB / M / C (tira) | [4][44] |
| V21 | Oxalato urinario | mg/d | Orina 24 h; tierra | Hiperoxaluria | [A] JSC: <45 mg/d = menor riesgo; >45 mg/d = considerar mayor riesgo [4] | 38 → 37 mg/d (NS) [4] | LAB | [4] |
| V22 | Magnesio urinario | mg/d | Orina 24 h; tierra | Falta de inhibidor | [A] 75–120 mg/d; hipomagnesuria <60 mg/d [4] | 116 → 99 mg/d (NS); hipomagnesuria 6,0 % → 15,8 % [4] | LAB | [4] |
| V23 | Sobresaturación relativa de oxalato cálcico | cociente adimensional | Calculada tras el regreso a partir de la bioquímica de orina 24 h [4] | Riesgo de cálculo de oxalato cálcico | [A] <2,0 = menor riesgo [4] | 1,53 → 2,26 postvuelo (p<0,05); >2,0 en 25,6 % → 46,2 % [4] | LAB + cálculo | [4] |
| V24 | Sobresaturación relativa de brushita (fosfato cálcico) | cociente | Igual | Riesgo de cálculo de fosfato cálcico | [A] <2,0 [4] | 1,25 → 1,00 postvuelo; **en vuelo aumenta** (riesgo de fosfato cálcico sobre todo al inicio, <30 d) [4] | LAB + cálculo | [4] |
| V25 | Sobresaturación de ácido úrico no disociado | cociente | Igual | Riesgo de cálculo de ácido úrico | [A] <2,0 [4] | 1,69 → 2,27 postvuelo (p<0,05); >2,0 en 32,8 % → 48,6 % [4] | LAB + cálculo | [4] |
| V26 | Sobresaturación de urato sódico | cociente | Igual | Riesgo de urato | [A] <2,0 [4] | 2,41 → 1,42 postvuelo [4] | LAB + cálculo | [4] |
| V27 | Sobresaturación de estruvita | cociente | Igual | Cálculo infeccioso | [A] <75 [4] | 3,05 → 3,69 (NS) [4] | LAB + cálculo | [4] |
| V28 | Perfil/índice de riesgo litiásico (RSRI) | perfil gráfico | Solo en tierra: anual y postvuelo (R+3 y R+30 d) [4] | Riesgo global | no encontrado (umbral numérico único) | 93 % de correlación entre formadores conocidos y RSRI alto; sin falsos negativos [4] | LAB | [4] |
| V29 | Sodio, sulfato, fósforo, potasio y creatinina en orina | mg/d o mEq/d | Orina 24 h; tierra (panel pre/postvuelo) [13] | Carga de sal y de proteína animal; función renal | no encontrado | Sulfato elevado postvuelo en el perfil de ejemplo [4] | LAB | [4][13] |
| V30 | Osmolalidad urinaria | mOsm/kg | Muestras congeladas; tierra | Deshidratación | [A/T] >700 mOsm/kg = deshidratación (criterio de medicina deportiva aplicado por NASA) [5]. [T] muestra aleatoria 50–1200 mOsm/kg [46] | 40 % de los astronautas de la ISS superaron 700 mOsm/kg [5] | LAB | [5][46] |
| V31 | Sodio sérico | mmol/L | Sangre; tierra | Deshidratación clínica | [A/T] >145 mmol/L = deshidratación clínica [5] | 8,7 % de astronautas de la ISS lo superaron [5] | LAB | [5] |
| V32 | Densidad urinaria (USG) | adimensional | No encontrado equipo a bordo; factible con refractómetro o tira | Hipohidratación | [T] normal 1,005–1,030 [41]; hipohidratación ≥1,020; euhidratación 1,010–1,020 [47] | no encontrado (dato en astronautas) | M / C (tira) | [41][47] |
| V33 | Color de orina | escala visual o colorimetría (CIE L\*a\*b\*) | No encontrado procedimiento a bordo; factible por foto | Hipohidratación | [T] colorimetría: b\* ≥22,61 detecta USG ≥1,020 (sens. 84,4 %, espec. 88,6 %; n=474 deportistas, 803 muestras) [47]. Punto de corte en la carta de 8 tonos de Armstrong: no encontrado | no encontrado | C | [47] |
| V34 | Ingesta de líquidos | mL/d; mL/kg | Registro dietético (ISS FIT) [5] | Hipohidratación, riesgo litiásico | [A] ≥32 mL/kg de peso mantiene el calcio urinario bajo el umbral de precipitación; requisito 2020: mujeres >2100 mL, hombres >2500 mL (ISS 1996: >2000 mL; 1–1,5 mL/kcal) [5]. Agua potable mínima de diseño 2,5 L/tripulante/día [13] | Ingesta en vuelo menor que antes y a menudo bajo lo recomendado [5]; ISS: 2012±462 a 2320±581 g/d de agua (n=17–19 por periodo) [12] | M / C (envases) | [5][12][13] |
| V35 | Pérdida aguda de masa corporal por déficit hídrico | % | SLAMMD/BMMD (ver V75) | Deshidratación | [T citado por NASA] déficit >2 % de la masa corporal deteriora atención, función ejecutiva y coordinación [5] | no encontrado | DEV / M | [5] |
| V36 | Ecografía renal (cálculo visible, tamaño, hidronefrosis, jet ureteral) | mm; sí/no | **Ultrasonido de la ISS**, guiado en tiempo real desde tierra [4]; ecografía renal pre y postvuelo estándar [13] | Litiasis, obstrucción | [A] Capacidad demostrada de detectar cálculos <3 mm [4] | no aplica | US | [4][13] |
| V37 | Síntomas de cólico renal (dolor en flanco/abdomen bajo, hematuria) | sí/no; intensidad | Autoinforme + valoración del oficial médico | Evento litiásico agudo | no encontrado (escala específica) | 1 episodio en vuelo descrito (cosmonauta, dolor abdominal bajo intenso) [4] | M | [4] |
| V38 | Antecedente de litiasis | sí/no; nº de episodios | Historia clínica | Riesgo de recurrencia | [T] ≈60 % de recurrencia tras un primer episodio [13] | Incidencia en astronautas 0,0026 eventos/persona-año (14 eventos, 332 astronautas) frente a 0,0042 en el grupo control de JSC [4] | M | [4][13] |
| V39 | Uso de citrato potásico | mEq/d | Registro de medicación; disponible en la ISS a criterio del médico de vuelo [5] | Contramedida | no aplica | 20 mEq/d: menor calcio urinario y sobresaturación de oxalato cálcico mantenida en nivel previo (n=30 Mir+ISS, doble ciego) [35] | M | [4][5][35] |

---

## 3. Atrofia y pérdida de fuerza muscular; pérdida de capacidad aeróbica

Contexto [A]: estándares NASA-STD-3001 — fuerza en misión ≥80 % de la basal [V1 4024]; capacidad aeróbica en misión ≥80 % de la previa [V1 4003]; VO2máx en misión ≥32,9 mL/kg/min (EVA en microgravedad) y ≥36,5 mL/kg/min (EVA en superficie) [V1 4001/4002] [3]. NASA define "alto riesgo" como una reducción ≥20 % de un indicador [2]. Pérdida media de fuerza y capacidad aeróbica 10–12 %; 12–38 % de los tripulantes de la ISS pierden >20 % según la medida [15].

| ID | Variable | Unidad | Cómo se mide en vuelo / equipo | Qué señala | Rango normal y umbral de alerta (fuente) | Cambio en vuelo (magnitud, n) | Entrada en app | Fuente |
|---|---|---|---|---|---|---|---|---|
| V40 | Fuerza isocinética de rodilla (extensión/flexión, 60°/s) | N·m (pico de torque); % del valor previo | **Solo en tierra** (pre y postvuelo, dinamómetro isocinético) [2][7] | Pérdida de fuerza | [A] ≥80 % de la basal [3] | iRED: −13,7 % extensores, −19,5 % flexores; ARED: −6,9 % y −11,1 % [7]. Otro estudio ISS: extensores −10 %, pantorrilla −24 % [7] | M | [2][3][7] |
| V41 | Resistencia muscular isocinética (trabajo total, 20 rep a 180°/s) | J; % | Solo en tierra | Fatigabilidad | [A] ≥80 % de la basal (criterio general) [3] | iRED −10,7 % (extensores) y −8,9 % (flexores); ARED −7,5 % [7] | M | [7] |
| V42 | Fuerza y potencia de pantorrilla (flexores plantares) | N·m; W | Solo en tierra | Músculo más vulnerable | no encontrado (umbral específico) | n=9, 6 meses ISS: potencia pico −32 %; fuerza-velocidad −20 a −29 % [34]. iRED: −14,2 % [7] | M | [7][34] |
| V43 | Fuerza máxima en peso muerto y press de banca | × peso corporal | Antes del vuelo (1RM); en vuelo se deduce de las cargas en ARED | Aptitud para EVA y egreso | [A] Tabla 4.6-1 (previo a misión). Peso muerto: mínimo 1,0×; EVA microgravedad 1,3×; EVA superficie 1,6×; egreso sin ayuda 1,3×. Press banca: 0,7×; 0,8×; 1,0×; 0,7× [3] | Ver V40–V42 | M / DEV | [3] |
| V44 | Carga, repeticiones y volumen por ejercicio en ARED | lb o kg; rep; lb totales | ARED (hasta 600 lbf) registra y transmite a tierra [1][2] | Adherencia y dosis de entrenamiento | no encontrado (umbral de alerta); referencia de uso real en V15 | Volumen total por misión (178 d): sentadilla 31 659 lb, peso muerto 38 300 lb, elevación de talón 45 855 lb [2] | DEV / M | [1][2] |
| V45 | Fuerza de agarre (dinamometría manual) | kg o N | En vuelo: dinamómetro de agarre de ESA (dato de buscador; fuente primaria no abierta — ver notas). Pre/postvuelo en tierra [7] | Fuerza de miembro superior, fatiga para EVA | no encontrado | Postvuelo: −7,8±2,7 % (iRED, n=10) y −2,9±1,3 % (ARED, n=23) [7] | M / W (dinamómetro BT) | [7] |
| V46 | Volumen o área de sección muscular por RM | cm³; cm²; % | Solo en tierra | Atrofia | no encontrado (umbral) | ISS: pantorrilla −10 a −18 %, muslo −4 a −7 % [7]; n=9: pantorrilla −13±2 %, sóleo −15±2 %, gastrocnemio −10±2 % [34]; Shuttle 5–9 d: sóleo −5,8 %, gastrocnemio −4,0 % [2]. Área y fuerza de miembro inferior −10–30 % según duración [3] | M | [2][3][7][34] |
| V47 | Ultrasonido muscular (área de sección panorámica o grosor de cuádriceps y gastrocnemio) | cm²; mm | **Ultrasonido de la ISS** guiado; NASA indica que el tamaño muscular puede vigilarse en vuelo así [2] | Atrofia en tiempo casi real | no encontrado (umbral). Validez frente a RM: concordancia excelente en cuádriceps (CCC 0,78; 698 pares de medidas, n=27 en reposo en cama de 70 d) [38] | Probabilidad de perder ≥20 % del tamaño de la pantorrilla: 11 % (IC 95 % 3–31 %) [22] | US | [2][22][38] |
| V48 | Perímetros de extremidades (segmentos de 3 cm → volumen) | cm; cm³ | Cinta métrica; método usado en Skylab [7] | Atrofia y desplazamiento de fluidos | no encontrado | Pérdida de volumen de pierna mayor en Skylab 2 y 3 que en Skylab 4 (más ejercicio); cifras no extraídas [7] | M / C | [7] |
| V49 | Tono, rigidez y elasticidad muscular en reposo | N/m; Hz | **MyotonPRO** portátil en la ISS (experimento Myotones, ESA/DLR/UKSA) [28] | Cambios del tono muscular | no encontrado | no encontrado en fuente primaria abierta | W / DEV | [28] |
| V50 | Masa magra y masa grasa (DXA de cuerpo entero) | kg; % | Solo en tierra | Composición corporal | LSC: masa magra 2,5 %, masa grasa 5,9 % [22] | Con ARED: mayor % de masa magra y menor % de grasa al regreso (n=5 frente a 8 con iRED) [32] | M | [22][32] |
| V51 | VO2pico / VO2máx | mL/kg/min; L/min | En vuelo: prueba en cicloergómetro CEVIS con analizador de gases PPFS (investigación); operativamente se estima por FC submáxima (V52) [8]. Pre/postvuelo: prueba máxima en tierra | Capacidad aeróbica | [A] ≥32,9 (EVA microgravedad); ≥36,5 (EVA superficie); ≥80 % del valor previo; recomendación previa a misión 38,7 (si cae 15 %) o 43,8 mL/kg/min (si cae 25 %) [3] | n=14 (91–192 d): −17 % hacia el día 14, sube después sin volver al valor previo; −15 % a R+1; recuperado a R+30 [8]. n=46: −7,4±2,0 % pre→post [22]. Sprint: −6,1 % (n=26) [23]. 12–21 % de tripulantes caen bajo −20 % en vuelo [2] | LAB / W (estimación) | [2][3][8][22][23] |
| V52 | Frecuencia cardiaca en ejercicio submáximo estandarizado (etapas de 5 min al 25/50/75 % del VO2pico previo) | lpm | CEVIS + ECG y monitor de FC; protocolo histórico: L-60, día 15 y cada 30 días en vuelo, R+5 y R+30 [8]. Wearable disponible: Bio-Monitor (CSA) [27] | Desacondicionamiento aeróbico | [A] Sin umbral absoluto; se compara con la basal. Sirve para el grupo, no es exacto para el individuo [8] | VO2pico estimado −19 % en vuelo y −16 % a R+5 [8]. n=4 (16 d): FC +7 % (día 8) y +9 % (día 13) al 85 % de carga [8] | W / DEV | [8][27] |
| V53 | Intensidad de las sesiones aeróbicas (FC media y pico; % del tiempo >70 % y >90 % de FC pico) | lpm; % | Monitor de FC en CEVIS y T2 | Dosis de entrenamiento | [A] Shuttle: ≥3 sesiones/semana, >70 % de FCmáx y >20 min → menor pérdida de VO2 [2]. Quienes mantuvieron el VO2pico entrenaron al 79±6 % de FC pico frente a 68±20 % [8] | CEVIS: media 135 lpm, pico 163; 76 % del tiempo >70 % y 13 % >90 %. T2: media 131 lpm, pico 162; 69 % y 11 % (n=46) [2] | W / DEV | [2][8] |
| V54 | Carga y duración en cicloergómetro (CEVIS) | W; rpm; min | CEVIS | Dosis aeróbica | no encontrado (umbral); prescripción 70–100 % del VO2pico [2] | Media 137 W, pico 191 W; 26 min/sesión; 65 sesiones en 178 d (37 % de los días) [2]. Carga pico en test −24 % hacia el día 14 [8] | DEV | [2][8] |
| V55 | Velocidad, carga del arnés y duración en cinta (T2) | mph; lb; % del peso corporal; min | T2 (COLBERT) registra carga corporal, duración y velocidad [1] | Dosis aeróbica y carga axial ósea | no encontrado (umbral); prescripción 70–100 % de FCmáx [2] | 7±1 mph; carga media 117 lb (107–127), 68 % del peso corporal; 27 min; 84 sesiones en 178 d (47 % de los días) [2] | DEV | [1][2] |
| V56 | Tiempo total de ejercicio | min/semana; min/día | Registro de sesiones | Adherencia a contramedidas | [A] ISS: 1,5 h/día, 6–7 días/semana [15]; ≈600 min/semana (n=46) [22]. Artemis II (Orion): 30 min/día con dispositivo de volante de inercia, capacidad máxima 180 kg [26] | Con ≈600 min/semana aún habría hasta 17 % de astronautas con pérdida ≥20 % en algún sistema [22] | M / DEV | [15][22][26] |
| V57 | Autoevaluación periódica de forma física | escala / cuestionario | NASA indica que la tripulación completa autoevaluaciones periódicas [15] | Seguimiento subjetivo | no encontrado | no encontrado | M | [15] |

---

## 4. Dolor de espalda, elongación de columna y hernia de disco

| ID | Variable | Unidad | Cómo se mide en vuelo / equipo | Qué señala | Rango normal y umbral de alerta (fuente) | Cambio en vuelo (magnitud, n) | Entrada en app | Fuente |
|---|---|---|---|---|---|---|---|---|
| V58 | Dolor de espalda: presencia e intensidad | sí/no; leve/moderado/severo (o NRS 0–10) | Autoinforme | Dolor de espalda por adaptación al espacio | [A] Moderado o severo que no responde al tratamiento = riesgo de deterioro funcional e impacto en la misión [30]. Puntos de corte numéricos NRS: no encontrado | Incidencia 52 % (382/728); de los afectados: leve 86 %, moderado 11 %, severo 3 % [30]. Rango entre estudios 52–68 % [20] | M | [20][30] |
| V59 | Localización, día de inicio y duración del dolor | región; día de misión; días | Autoinforme | Patrón típico (fase inicial de adaptación) frente a atípico | no encontrado (criterio numérico de la definición de caso) | Aparece en la fase temprana del vuelo; habitualmente autolimitado [30] | M | [30] |
| V60 | Respuesta al tratamiento | % de alivio; sí/no | Autoinforme + registro de medicación | Dolor refractario | no encontrado | Eficacia: posición fetal 91 %; analgésicos 85 %; ejercicio (cinta, cicloergómetro) 85 % [30]. Aviso: la posición fetal podría conllevar riesgo de daño espinal [20] | M | [20][30] |
| V61 | Estatura de pie | cm; % | Medición antropométrica en vuelo (equipo concreto: no encontrado) | Elongación de columna | [T] En Tierra la estatura sube ≈1 % (1–1,5 cm) tras 8 h de sueño [20] | Hasta 7 cm o 1–3 % [20]; "hasta 3 %" [14]; ≈5 cm en misiones largas [37] | M / C | [14][20][37] |
| V62 | Talla sentado | cm; % | Medición antes, durante y después del vuelo (estudio Spinal Elongation, Shuttle e ISS) [25] | Elongación del tronco; ajuste de asiento y traje | [A] El requisito de diseño previo asumía ≈3 % (dato de buscador); umbral clínico: no encontrado | +2–6 % en vuelo respecto al valor previo (resultado preliminar) [25] | M / C | [25] |
| V63 | Área funcional de musculatura paraespinal (multífido, erectores) | % de área magra; cm² | RM pre/postvuelo (tierra). Ultrasonido de multífido y transverso abdominal usado en astronautas de ESA [20] | Atrofia paraespinal → inestabilidad | no encontrado | n=6, 6 meses ISS: área magra funcional 86 % → 72 % del área paraespinal; recupera el 68 % de la pérdida en 6 semanas [37] | US / M | [20][37] |
| V64 | Altura y ángulo del disco intervertebral; desecación; osteofitos | mm; grados; sí/no | **Ultrasonido en vuelo** (procedimiento ISS) y RM en tierra [20] | Cambios discales | no encontrado | n=7 (ultrasonido en vuelo): 14 cambios (desecación, osteofitos) pero sin cambio significativo de altura ni ángulo discal [20]. RM n=6: alturas discales lumbares sin cambio [37] | US | [20][37] |
| V65 | Síntomas radiculares (dolor irradiado, parestesias, debilidad) cervicales o lumbares | sí/no; dermatoma | Autoinforme + exploración; seguimiento sobre todo postvuelo | Hernia del núcleo pulposo | no encontrado (criterio numérico) | Incidencia de hernia 4,3 veces mayor en astronautas (N=321) que en controles (N=983); 18 de 44 hernias fueron cervicales (controles 3 de 35); riesgo máximo justo después del vuelo [31], en el primer año [37]. Se recomienda seguimiento ≥2 años postvuelo [20] | M | [20][31][37] |
| V66 | Lordosis lumbar y rango de flexo-extensión | grados | Pre/postvuelo (tierra); en vuelo: no encontrado | Pérdida de curvatura y rigidez | no encontrado | Los cambios de área de multífido y erectores se correlacionan con lordosis y rango activo [20] | M / C | [20] |

---

## 5. Alteraciones sensoriomotoras/vestibulares y mareo por movimiento espacial (SMS)

Contexto [A]: NASA-STD-3001 exige función sensoriomotora previa "dentro de valores clínicos normales" y que los límites de rendimiento en misión se "definan operativamente" por métrica [V1 4005–4010]; **el estándar no fija umbrales numéricos** [3].

| ID | Variable | Unidad | Cómo se mide en vuelo / equipo | Qué señala | Rango normal y umbral de alerta (fuente) | Cambio en vuelo (magnitud, n) | Entrada en app | Fuente |
|---|---|---|---|---|---|---|---|---|
| V67a | Síntomas de mareo espacial (náusea, vómito, palidez, sudor frío, malestar, pérdida de apetito, fatiga) | lista de síntomas; nº de vómitos; gravedad | Autoinforme; Artemis II Standard Measures incluye encuestas de síntomas de mareo [18] | SMS | no encontrado (escala y umbral validados de uso operativo) | 60–80 % de los viajeros en los primeros 2–3 días, y proporción similar al volver [39]. Apollo 35 %, Skylab 60 %, 67 % de debutantes en los primeros 24 vuelos Shuttle; estimaciones posteriores 80–90 % [9]. NASA: "la mayoría" [16] | M | [9][16][18][39] |
| V67b | Susceptibilidad previa al mareo | puntuación MSSQ-short (percentil) | Cuestionario antes del vuelo (usado en el análogo AGBRESA) [40] | Predisposición | [A] El mareo en Tierra (coche, barco, avión) **no** predice la gravedad en el espacio [16]; el SMS del primer vuelo predijo el del segundo en el 77 % de los casos [9] | no aplica | M | [9][16][40] |
| V68a | Uso y respuesta a medicación antimareo | fármaco; dosis; sí/no | Registro de medicación | SMS que requiere tratamiento | no encontrado | Prometazina IM 25–50 mg en el día 1 (n=20): 25 % seguía "enfermo" el día 2, frente a 50 % de 74 tripulantes sin prometazina [9] | M | [9] |
| V68b | Síntomas tras el aterrizaje (vértigo, náusea, vómito, inestabilidad) | sí/no; duración | Autoinforme postvuelo | Mareo de readaptación | no encontrado | n=241 (Shuttle 1981–1999): vértigo 32 %, náusea 14,7 %, vómito 8 % [9] | M | [9] |
| V69 | Posturografía dinámica computarizada (puntuación de equilibrio continuo, cEQ) | 0–100 (normalizada a 12,5° de oscilación) | **Solo en tierra** (plataforma), pre y postvuelo | Control postural | [A] Se compara con la basal y con la banda de confianza del 90 % de la tripulación [9]; umbral único: no encontrado | Mediana de cEQ −59 % un día tras el vuelo (ISS); reposo en cama sin ejercicio −63 %, con ejercicio −17 % [21] | M | [9][21] |
| V70 | Marcha en tándem (talón-punta, ojos abiertos/cerrados) | % de pasos correctos | En tierra (pre/postvuelo; medida de Standard Measures según buscador). Sin instrumental: factible con cámara | Equilibrio dinámico | no encontrado (umbral) | Mediana de pasos correctos −40 % tras ISS; reposo en cama −51 % (control) y −33 % (ejercicio) [21] | C / M | [21] |
| V71 | Romberg y Romberg sensibilizado (tándem estático) | s; sí/no | Sin instrumental; usado históricamente postvuelo [9] | Ataxia postural | no encontrado | Control postural en tándem sobre rieles reducido al 40–90 % tras vuelos cortos [21] | C / M | [9][21] |
| V72 | Tiempo en tareas funcionales (salida del asiento y marcha con obstáculos, recuperación de caída, salto, escalera) | s | Solo en tierra (Functional Task Test / Field Test); Artemis II añade egreso de cápsula y paseo lunar simulado con traje [18] | Capacidad funcional al aterrizar | no encontrado | Mayores déficits en tareas con más demanda de equilibrio dinámico [9]; el déficit en el día del aterrizaje fue "más severo de lo esperado" (n=15, piloto) [9] | M / C | [9][18][21] |
| V73 | Control motor fino (tiempo de tarea de destreza) | s | Tableta o tarea manual | Coordinación ojo-mano | no encontrado | Tiempo de finalización +10 % tras ISS [21] | M (test en tableta) | [21] |
| V74 | Ilusiones y desorientación espacial; agudeza visual dinámica | sí/no; descripción; líneas de optotipo | Autoinforme; agudeza visual dinámica solo en tierra | Desorientación, riesgo en control de vehículo | no encontrado | Casi todos los tripulantes describen ilusiones transitorias (volteo, inversión) al llegar a microgravedad [9] | M | [9] |

(Las variables V67a/V67b y V68a/V68b cuentan como cuatro variables distintas.)

---

## 6. Nutrición inadecuada, pérdida de masa corporal y déficits

Contexto [A]: estándar — evaluar el estado nutricional antes de la misión y corregir déficits [V1 4019]; aportar el 100 % de los requerimientos calculados por edad, sexo, masa, talla y factor de actividad [V1 4020] [3]. Ingesta histórica: ≈70 % del requerimiento (Apollo–Shuttle) y ≈80 % en la ISS [5].

| ID | Variable | Unidad | Cómo se mide en vuelo / equipo | Qué señala | Rango normal y umbral de alerta (fuente) | Cambio en vuelo (magnitud, n) | Entrada en app | Fuente |
|---|---|---|---|---|---|---|---|---|
| V75 | Masa corporal | kg; % respecto a la previa | **ISS: SLAMMD** (NASA; F = m·a con fuerza de muelles) y **BMMD** (ruso; oscilación de muelle) [5][29]. Artemis/Orion: no encontrado | Balance energético, deshidratación, pérdida de tejido magro | [A, citando revisión militar] mantener la pérdida <3,3 % de la basal para evitar caída del rendimiento físico [5]. Pérdidas >10 % se registraron en Mir [5] | n=25: −4,4 % (BMMD) y −2,8 % (SLAMMD); pérdida en los primeros 30 días y luego estable; diferencia media entre equipos 1,1 kg [29]. Resumen NASA: 2–5 % en el primer mes [6]; histórico 1–5 %; media 2,4 % por cada 100 días [5] | DEV / M | [5][6][29] |
| V76 | 25-OH vitamina D sérica | ng/mL (nmol/L) | Sangre en vuelo congelada; análisis en tierra [5][6] | Déficit de vitamina D (sin luz UV) | [A] NASA: óptimo 35–90 ng/mL; 20–34 → dosis de mantenimiento; <20 → 50 000 UI/semana o 5000 UI/día durante 4–9 semanas y repetir a los 3 meses [1]. [T, IOM citado por NASA] límite superior 125 nmol/L; toxicidad >200 nmol/L; 80 nmol/L como "óptimo" percibido [5] | ISS inicial con 400 UI/día: ≈25 % menos al aterrizar (n=16); con 800 UI/día se mantiene (n=26) [5]; 75±17 nmol/L antes y durante el vuelo (n=13) [32] | LAB | [1][5][32] |
| V77 | Ingesta y adherencia al suplemento de vitamina D | UI/día; tomas/semana | Registro | Prevención del déficit | [A] Requisito 2020: 1000 UI/día (25 µg); mantenimiento NASA 1000 UI/día o 5000 UI/semana [1][5] | Uso real temprano en ISS: 3,0±2,8 tomas/semana de 400 UI [5] | M | [1][5] |
| V78 | Ferritina sérica | ng/mL | Sangre congelada; tierra | Sobrecarga de hierro (en vuelo) o ferropenia (postvuelo) | [T] hombres 30–400; mujeres 13–150 ng/mL [43]. [A] Aumentos **dentro del rango clínico normal** ya se asociaron a daño oxidativo y resorción ósea [5] | n=23 (50–247 d): +220 % en mujeres y +70 % en hombres hacia el día 15; vuelve al valor previo al final de 6 meses; a mayor área bajo la curva de ferritina, mayor pérdida de DMO en cadera, trocánter, cuello femoral y pelvis [5][46b]. Suele bajar en las semanas postvuelo (posible anemia) [5] | LAB | [5][43][46b] |
| V79 | Ingesta de hierro | mg/d | Registro dietético (ISS FIT) [5] | Exceso de hierro | [A] Requisito 8 mg/d (18 mg/d en mujeres <50 años sin supresión menstrual); límite superior tolerable 45 mg/d [5] | Menú estándar ISS 20±6 mg/d; algunos tripulantes >47 mg/d en algunas semanas [5]; ISS 18–20 mg/d de media [12] | M / C | [5][12] |
| V80 | Folato sérico y eritrocitario | ng/mL | Suero en vuelo (congelado); folato eritrocitario no disponible en vuelo por requisitos de procesado [5] | Déficit de folato; metabolismo de un carbono | [T] folato sérico 2,7–17,0 ng/mL [48]. Umbral en astronautas: no encontrado | Folato eritrocitario reducido tras misiones largas (datos tempranos); el sérico en general no cambia; más bajo en tripulantes con SANS [5] | LAB | [5][48] |
| V81 | Ingesta energética | kcal/d; % del requerimiento | **ISS FIT** (app de registro de ingesta en tableta) o diario de alimentos [5] | Déficit calórico | [A] 100 % del requerimiento calculado [3]; por defecto 3035 kcal/d [V2 7003]; +200 kcal por hora de EVA [12]. Ecuaciones EER — hombres: 662 − 9,53·edad + AF·(15,9·masa[kg] + 539,6·talla[m]); mujeres: 354 − 6,91·edad + AF·(9,36·masa + 726·talla) [12] | ≈80 % del requerimiento OMS en la ISS [5][29]; ISS Exp. 26–34: 2444±536 kcal/d, 84±15 % (n=17) [12]. Apollo: 1880±415 kcal/d, 64 % [12] | M / C (foto o código del envase) | [3][5][12][29] |
| V82 | Ingesta de proteína | g/kg/d | Registro dietético | Mantenimiento muscular; carga ácida | [A] 1,2–1,8 g/kg (requisito 2020); relación animal:vegetal ≤60:40 [5] | ISS: 96–109 g/d de media [12] | M | [5][12] |
| V83 | Ingesta de sodio | mg/d | Registro dietético (ISS FIT lo muestra en tiempo real) [5] | Exceso de sal → calciuria, riesgo litiásico | [A] 1500–2300 mg/d (requisito 2020); recomendación ISS <3500 mg/d [5] | ISS Exp. 1–25: ≈4600±1239–1593 mg/d; tras reformular el menú (−40 % de sodio): 3823±785 mg/d [5][12] | M | [5][12] |
| V84 | Ingesta de calcio | mg/d | Registro dietético | Balance de calcio | [A] 1000–1200 mg/d (2020); antes 1200–2000 mg/d [5] | ISS: 878±274 → 1074±205 mg/d [12] | M | [5][12] |
| V85 | Apetito y saciedad | escala | Autoinforme | Causa de baja ingesta | no encontrado | En Mir: 40 % refirió menos apetito, 40 % sin cambio, 20 % más [5] | M | [5] |

---

## 7. Metabolismo de la glucosa / resistencia a la insulina

Contexto: los datos en vuelo son escasos. Los umbrales disponibles son terrestres (ADA) [49]; no encontré umbrales validados en astronautas.

| ID | Variable | Unidad | Cómo se mide en vuelo / equipo | Qué señala | Rango normal y umbral de alerta (fuente) | Cambio en vuelo (magnitud, n) | Entrada en app | Fuente |
|---|---|---|---|---|---|---|---|---|
| V86 | Glucosa plasmática en ayunas | mg/dL | Equipo concreto a bordo: no encontrado en fuente primaria abierta. En Ax-4 (2025) se validó la monitorización de glucosa "con varios métodos" en la estación, sin detallar cuáles [50] | Disglucemia | [T] ADA: normal <100; prediabetes 100–125; diabetes ≥126 mg/dL [49] | Estudio ruso (Salyut, 60 y 88 d): glucosa en ayunas reducida y menor pico en la sobrecarga [5] | M / LAB / W | [5][49][50] |
| V87 | Glucosa a las 2 h de sobrecarga oral (OGTT) | mg/dL | Investigación | Tolerancia a la glucosa | [T] ADA: normal <140; prediabetes 140–199; diabetes ≥200 mg/dL [49] | Shuttle, 7 días: sin efecto en la tolerancia a la glucosa [5]. Tras 3 semanas de reposo en cama, la tolerancia sigue alterada >4 días [5] | LAB | [5][49] |
| V88 | Glucosa al azar con síntomas | mg/dL | Igual que V86 | Hiperglucemia franca | [T] ADA: ≥200 mg/dL con síntomas graves = diabetes [49] | no encontrado | M / W | [49] |
| V89 | HbA1c | % | Solo en tierra (no encontrado método en vuelo) | Glucemia media de ≈3 meses | [T] ADA: normal <5,7 %; prediabetes 5,7–6,4 %; diabetes ≥6,5 % [49] | no encontrado | M | [49] |
| V90 | Insulina en ayunas e índice de resistencia a la insulina | µU/mL; índice | Sangre en vuelo congelada; tierra | Resistencia a la insulina | no encontrado (umbral) | n=8 (4 H, 4 M; 6 meses ISS): el índice de resistencia a la insulina aumentó en vuelo (p<0,001), más en hombres (p=0,034) [51]; aumento tras ≈3–5 meses en microgravedad [5] | LAB | [5][51] |
| V91 | Péptido C urinario | µg/d | Orina 24 h; tierra | Secreción de insulina | no encontrado | Evidencia de resistencia a la insulina con este marcador en vuelo (Stein et al.), citada por NASA [5] | LAB | [5] |
| V92 | Glucosa intersticial continua (CGM): media, tiempo en rango, variabilidad | mg/dL; % | **CGM comercial** llevado en Ax-4 (estudio Suite Ride, Axiom/Burjeel, 2025): primera monitorización continua de glucosa de tripulantes en la ISS [50][52] | Excursiones glucémicas, tendencia | [T] umbrales ADA de V86–V88 por extensión; objetivos de tiempo en rango: no encontrado | Resultado preliminar: precisión "comparable a las lecturas en Tierra"; sin cifras publicadas; marca y nº de sujetos no indicados [50][52] | W | [50][52] |
| V93 | Ingesta de carbohidratos y azúcares añadidos | % de la energía | Registro dietético | Dieta | [A] 45–65 % de la energía; <10 % de azúcares añadidos (requisito 2020) [5] | Históricamente 57–58 % de la energía (Apollo–Shuttle) [12] | M | [5][12] |

---

## 8. Lesiones por EVA y por ejercicio

| ID | Variable | Unidad | Cómo se mide en vuelo / equipo | Qué señala | Rango normal y umbral de alerta (fuente) | Cambio en vuelo (magnitud, n) | Entrada en app | Fuente |
|---|---|---|---|---|---|---|---|---|
| V94 | Registro de lesión musculoesquelética (localización, tipo, mecanismo, actividad) | evento | Autoinforme / oficial médico | Trauma menor, sobreuso | no encontrado (umbral) | 219 lesiones en vuelo (198 en hombres, 21 en mujeres): 0,021 por día de vuelo (hombres) y 0,015 (mujeres); mano = localización más frecuente (abrasiones, laceraciones pequeñas); ejercicio 0,003 lesiones/día y primera causa en la ISS; componentes del traje 0,26 lesiones por EVA [53] | M / C | [53] |
| V95 | Síntomas por región tras una sesión con traje (mano, hombro, pie, brazo, pierna, cuello, tronco) | sí/no por región; NRS | Autoinforme tras EVA o entrenamiento | Lesión por traje | no encontrado | Entrenamiento en piscina (NBL): síntomas en 352 de 770 sesiones (45,7 %; 86 sujetos); manos 47 %, hombros 21 %, pies 11 %, brazos/piernas/cuello 6 % cada uno, tronco 3 % [10] | M | [10] |
| V96 | Delaminación ungueal (onicólisis) y lesiones de la mano por el guante | sí/no; dedo; foto | Inspección visual | Trauma por guante de EVA | [A] Circunferencia de mano >22,86 cm (9 in): 19,6 % de probabilidad de lesión de dedo, frente a 5,6 % si ≤22,86 cm (n=232; un análisis posterior dio resultados contradictorios) [10] | Ver V95 | C / M | [10] |
| V97 | Dolor de hombro relacionado con el traje (intensidad, limitación de movimiento) | NRS; grados | Autoinforme + exploración | Lesión de manguito rotador por el torso rígido | no encontrado | 14 de 22 astronautas (64 %) con dolor de hombro atribuido al entrenamiento de EVA; en otra serie 2 de 22 necesitaron cirugía [10] | M | [10] |

Variables de contexto de EVA ya contadas en otras secciones o sin umbral propio (no numeradas): duración de la EVA (media 6,67 h, máximo 8 h) y gasto metabólico (VO2 medio ≈0,77 L/min ≈10 mL/kg/min; máximo medio 19,4 mL/kg/min) [2][3]; agua en traje mínimo 240 mL por hora de EVA [13]; CO2 del traje y parámetros fisiológicos vigilados desde control de misión, sin cifras en la fuente [10].

---

## Resumen de equipos citados (qué existe y dónde)

| Equipo | Dónde | Mide | Fuente |
|---|---|---|---|
| SLAMMD y BMMD | ISS | Masa corporal | [5][29] |
| ARED (hasta 600 lbf) | ISS | Carga, repeticiones (registro enviado a tierra) | [1][2] |
| CEVIS | ISS | Potencia (W), rpm, duración; base del test submáximo con FC | [2][8] |
| T2 / COLBERT | ISS | Velocidad, carga del arnés, duración | [1][2] |
| PPFS (analizador de gases) | ISS | VO2 en ejercicio (investigación) | [8] |
| Ultrasonido | ISS | Riñón, músculo, columna | [2][4][20] |
| MyotonPRO | ISS (ESA) | Tono y rigidez muscular | [28] |
| Bio-Monitor (camiseta, cinta, app) | ISS (CSA) | Pulso y actividad eléctrica cardiaca, presión arterial, frecuencia y volumen respiratorio, temperatura cutánea, SpO2, actividad | [27] |
| ISS FIT | ISS (tableta) | Ingesta de alimentos, sodio en tiempo real | [5] |
| UCD (bolsas de orina) y congelación de muestras | ISS | Orina de 24 h y sangre para análisis en tierra | [5] |
| Dispositivo de volante de inercia (máx. 180 kg) | Orion / Artemis II | Ejercicio resistivo y aeróbico (remo), 30 min/día | [1][26] |
| Artemis II Standard Measures | Orion / Artemis II | Sangre, saliva, orina; encuestas de mareo; equilibrio, función vestibular, rendimiento muscular; egreso y paseo lunar simulado al volver | [18] |
| DXA, QCT, HR-pQCT, RM, dinamómetro isocinético, posturografía | Solo en tierra | Hueso, músculo, equilibrio | [1][7][21][24] |

---

## Notas de método y límites

1. **PDF de NASA**: los PDF (estándar, briefs OCHMO, informes de evidencia, libro de nutrición) se descargaron de la URL indicada y se leyeron tras extraer el texto localmente. Las cifras salen de ese texto.
2. **PMC/PubMed** devolvían una página de verificación de navegador. Los artículos [20]–[24] se leyeron a texto completo y los [29]–[40], [46b], [51], [53] como resumen, ambos a través de la API REST de Europe PMC (`https://www.ebi.ac.uk/europepmc/webservices/rest/...`). La URL listada es la página pública equivalente de Europe PMC para ese mismo registro; se anota el DOI.
3. La URL de [1] (nombre de archivo "ochmo-tb-030-bone-loss.pdf") sirve hoy el documento **OCHMO-MTB-013 Bone Loss, Rev D, fechado 11-Feb-26**.
4. La tabla 4.6-1 del estándar [3] se verificó con una segunda extracción de texto porque la primera salía desordenada.
5. **Datos que solo aparecieron en resultados de buscador y no pude abrir en fuente primaria** (tratar como no verificados): dinamómetro de agarre/pinza de ESA en la ISS (V45; la ficha DOAJ dio 403); que en Artemis II la sangre se tome solo antes y después del vuelo; que la marcha en tándem y el sit-to-stand formen parte de Standard Measures; rango de medida de SLAMMD; el 3 % del requisito de diseño de talla sentado (V62).
6. NIH ODS (vitamina D, folato) devolvió 403; por eso los umbrales de vitamina D proceden de NASA [1][5] y el de folato de MedlinePlus [48].
7. El recuento de eventos litiásicos difiere entre fuentes y fechas: 37 eventos/357 astronautas (2016) [4]; 29 astronautas con eventos (2020) [5]; 43 eventos en 29 tripulantes [13].

---

## Fuentes

1. NASA OCHMO. *Bone Loss* — NASA-STD-3001 Medical Technical Brief OCHMO-MTB-013 Rev D (11-Feb-2026). https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-030-bone-loss.pdf
2. NASA OCHMO. *Exercise Overview* — Technical Brief OCHMO-TB-031. https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-031-exercise-overview.pdf
3. NASA. *NASA-STD-3001, Volume 1, Revision C: Crew Health*. https://standards.nasa.gov/sites/default/files/standards/NASA/C//nasa-std-3001-vol-1-rev-c-signature.pdf
4. Sibonga JD, Pietrzyk R. *Evidence Report: Risk of Renal Stone Formation*. NASA HRP, 2017. https://ntrs.nasa.gov/api/citations/20170004709/downloads/20170004709.pdf
5. Smith SM, Zwart SR, Douglas GL, Heer M. *Human Adaptation to Spaceflight: The Role of Food and Nutrition*, 2.ª ed. NASA, 2021. https://www.nasa.gov/wp-content/uploads/2015/02/human_adaptation_2021_final.pdf
6. Smith SM, Heer MA, Zwart SR. *Nutritional Status Assessment (SMO 016E)* — resumen HRP 2014. https://ntrs.nasa.gov/api/citations/20140013313/downloads/20140013313.pdf
7. NASA HRP. *Evidence Report: Risk of Impaired Performance Due to Reduced Muscle Mass, Strength, and Endurance* (HRP-47072), 2015. https://humanresearchroadmap.nasa.gov/evidence/reports/Muscle.pdf
8. NASA HRP. *Evidence Report: Risk of Reduced Physical Performance Capabilities Due to Reduced Aerobic Capacity*, 2015. https://humanresearchroadmap.nasa.gov/evidence/reports/Aerobic.pdf
9. NASA HRP. *Evidence Report: Risk of Impaired Control of Spacecraft/Associated Systems and Decreased Mobility Due to Vestibular/Sensorimotor Alterations*, 2016. https://humanresearchroadmap.nasa.gov/evidence/reports/SM.pdf
10. NASA HRP. *Evidence Report: Risk of Injury and Compromised Performance Due to EVA Operations*, 2017. https://humanresearchroadmap.nasa.gov/evidence/reports/EVA.pdf
11. NASA HRP. *Evidence Book: Risk of Bone Fracture*, 2008. https://humanresearchroadmap.nasa.gov/evidence/reports/Bone%20Fracture.pdf
12. NASA OCHMO. *Food and Nutrition* — Technical Brief OCHMO-TB-013. https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-013-food-and-nutrition.pdf
13. NASA OCHMO. *Urinary Health* — Medical Technical Brief OCHMO-MTB-003 (página). https://www.nasa.gov/ochmo-mtb-003-urinary-health-2/
14. NASA HRP. *Risk of Spaceflight-Induced Bone Changes*. https://www.nasa.gov/reference/risk-of-spaceflight-induced-bone-changes/
15. NASA HRP. *Risk of Reduced Cardiorespiratory and Musculoskeletal Fitness*. https://www.nasa.gov/reference/risk-of-reduced-cardiorespiratory-and-musculoskeletal-fitness/
16. NASA HRP. *Risk of Altered Sensorimotor and Vestibular Function*. https://www.nasa.gov/reference/risk-of-altered-sensorimotor-and-vestibular-function/
17. NASA Human Research Roadmap. *Risk of Bone Fracture due to Spaceflight-induced Changes to Bone*. https://humanresearchroadmap.nasa.gov/Risks/risk.aspx?i=77
18. NASA. *Artemis II Standard Measures*. https://www.nasa.gov/reference/artemis-ii-standard-measures
19. NASA. *Standard Measures*. https://www.nasa.gov/reference/standard-measures/ (índice de riesgos HRP: https://www.nasa.gov/hrp/risks/)
20. Green DA, Scott JPR. Spinal Health during Unloading and Reloading Associated with Spaceflight. *Front Physiol* 2018. DOI 10.3389/fphys.2017.01126. https://europepmc.org/article/PMC/PMC5778142
21. Mulavara AP et al. Physiological and Functional Alterations after Spaceflight and Bed Rest. *Med Sci Sports Exerc* 2018. DOI 10.1249/MSS.0000000000001615. https://europepmc.org/article/PMC/PMC6133205
22. Scott JM et al. Effects of exercise countermeasures on multisystem function in long duration spaceflight astronauts. *NPJ Microgravity* 2023. DOI 10.1038/s41526-023-00256-5. https://europepmc.org/article/PMC/PMC9898566
23. English KL et al. High intensity training during spaceflight: results from the NASA Sprint Study. *NPJ Microgravity* 2020. DOI 10.1038/s41526-020-00111-x. https://europepmc.org/article/PMC/PMC7434884
24. Gabel L et al. Incomplete recovery of bone strength and trabecular microarchitecture at the distal tibia 1 year after return from long duration spaceflight. *Sci Rep* 2022. DOI 10.1038/s41598-022-13461-1. https://europepmc.org/article/PMC/PMC9247070
25. Young K, Mesloh M, Rajulu S. *Preliminary Results of the Effect of Microgravity on Seated Height* (NTRS 20100039646). https://ntrs.nasa.gov/api/citations/20100039646/downloads/20100039646.pdf
26. Agencia Espacial Canadiense (CSA). *Exercising with a fly wheel aboard Orion*. https://asc-csa.gc.ca/eng/multimedia/search/image/18771
27. Agencia Espacial Canadiense (CSA). *Bio-Monitor*. https://www.asc-csa.gc.ca/eng/sciences/bio-monitor.asp
28. ESA. *Tricorder* (MyotonPRO, experimento Myotones). https://esa.int/ESA_Multimedia/Images/2018/07/Tricorder
29. Zwart SR et al. Body mass changes during long-duration spaceflight. *Aviat Space Environ Med* 2014. DOI 10.3357/asem.3979.2014. https://europepmc.org/article/MED/25197887
30. Kerstman EL et al. Space adaptation back pain: a retrospective study. *Aviat Space Environ Med* 2012. DOI 10.3357/asem.2876.2012. https://europepmc.org/article/MED/22272509
31. Johnston SL et al. Risk of herniated nucleus pulposus among U.S. astronauts. *Aviat Space Environ Med* 2010. DOI 10.3357/asem.2427.2010. https://europepmc.org/article/MED/20540448
32. Smith SM et al. Benefits for bone from resistance exercise and nutrition in long-duration spaceflight. *J Bone Miner Res* 2012. DOI 10.1002/jbmr.1647. https://europepmc.org/article/MED/22549960
33. Sibonga JD et al. Recovery of spaceflight-induced bone loss: bone mineral density after long-duration missions as fitted with an exponential function. *Bone* 2007. DOI 10.1016/j.bone.2007.08.022. https://europepmc.org/article/MED/17931994
34. Trappe S et al. Exercise in space: human skeletal muscle after 6 months aboard the International Space Station. *J Appl Physiol* 2009. DOI 10.1152/japplphysiol.91578.2008. https://europepmc.org/article/MED/19150852
35. Whitson PA et al. Effect of potassium citrate therapy on the risk of renal stone formation during spaceflight. *J Urol* 2009. DOI 10.1016/j.juro.2009.07.010. https://europepmc.org/article/MED/19765769
36. Smith SM et al. Bone metabolism and renal stone risk during International Space Station missions. *Bone* 2015. DOI 10.1016/j.bone.2015.10.002. https://europepmc.org/article/MED/26456109
37. Chang DG et al. Lumbar Spine Paraspinal Muscle and Intervertebral Disc Height Changes in Astronauts After Long-Duration Spaceflight on the ISS. *Spine* 2016. DOI 10.1097/brs.0000000000001873. https://europepmc.org/article/MED/27779600
38. Scott JM et al. Panoramic ultrasound: a novel and valid tool for monitoring change in muscle mass. *J Cachexia Sarcopenia Muscle* 2017. DOI 10.1002/jcsm.12172. https://europepmc.org/article/MED/28052593
39. Heer M, Paloski WH. Space motion sickness: incidence, etiology, and countermeasures. *Auton Neurosci* 2006. DOI 10.1016/j.autneu.2006.07.014. https://europepmc.org/article/MED/16935570
40. Clément G et al. Assessing the effects of artificial gravity in an analog of long-duration spaceflight: the AGBRESA bed rest study. *Front Physiol* 2022. DOI 10.3389/fphys.2022.976926. https://europepmc.org/article/PMC/PMC9492851
41. MedlinePlus. *Urine specific gravity test*. https://medlineplus.gov/ency/article/003587.htm
42. MedlinePlus. *Calcium - urine*. https://medlineplus.gov/ency/article/003603.htm
43. MedlinePlus. *Ferritin blood test*. https://medlineplus.gov/ency/article/003490.htm
44. MedlinePlus. *Urine pH test*. https://medlineplus.gov/ency/article/003583.htm
45. MedlinePlus. *Urine 24-hour volume*. https://medlineplus.gov/ency/article/003425.htm
46. MedlinePlus. *Osmolality urine test*. https://medlineplus.gov/ency/article/003609.htm
46b. Zwart SR, Morgan JL, Smith SM. Iron status and its relations with oxidative damage and bone loss during long-duration space flight on the ISS. *Am J Clin Nutr* 2013. DOI 10.3945/ajcn.112.056465. https://europepmc.org/article/MED/23719548
47. Artículo de *Frontiers in Nutrition* 2022 sobre colorimetría de orina y estado de hidratación en deportistas. DOI 10.3389/fnut.2022.997189. https://www.frontiersin.org/articles/10.3389/fnut.2022.997189
48. MedlinePlus. *Folic acid - test*. https://medlineplus.gov/ency/article/003686.htm
49. American Diabetes Association. *Diabetes Diagnosis & Tests*. https://diabetes.org/about-diabetes/diagnosis
50. Axiom Space. *Suite Ride Research Unlocks Potential for First Astronaut with Diabetes* (26-sep-2025). https://axiomspace.com/release/suite-ride-research-unlocks-potential-for-first-astronaut-with-diabetes
51. Hughson RL et al. Increased postflight carotid artery stiffness and inflight insulin resistance resulting from 6-mo spaceflight in male and female astronauts. *Am J Physiol Heart Circ Physiol* 2016. DOI 10.1152/ajpheart.00802.2015. https://europepmc.org/article/MED/26747504
52. ISS National Laboratory. *New Space-Based Research May Pave the Way for First Astronaut with Diabetes* (3-jun-2025). https://issnationallab.org/?p=48871
53. Scheuring RA et al. Musculoskeletal injuries and minor trauma in space: incidence and injury mechanisms in U.S. astronauts. *Aviat Space Environ Med* 2009. DOI 10.3357/asem.2270.2009. https://europepmc.org/article/MED/19198198
