# 04 · Inmune, infecciones, ambiente de cabina, equipo a bordo y umbrales oficiales

Catálogo de variables clínicas medibles para una app de autoevaluación de salud del astronauta (NASA Space Apps 2026).
Fecha de la investigación: 2026-11-14.

**Cómo leer este archivo**

- Los números entre corchetes `[n]` remiten a la lista de fuentes del final. Todas las URL se abrieron en esta sesión (PDF descargado y leído, o página/API consultada).
- **"Oficial NASA"** = requisito de NASA-STD-3001 o dato de un OCHMO Technical Brief. **"Clínico terrestre"** = rango de referencia médico general (MedlinePlus); NASA no lo publica como umbral de vuelo.
- **"no encontrado"** = se buscó y no apareció en una fuente abierta en esta sesión. No es prueba de que no exista.
- Versiones usadas: NASA-STD-3001 **Volumen 1 Rev C** (aprobado 2023-09-15) [1] y **Volumen 2 Rev F** (aprobado 2026-07-14; el PDF enlazado desde la página de OCHMO ya es la Rev F aunque la URL diga 2025/05) [2]. Varios Technical Briefs citan todavía Rev D/E.
- Modos de entrada en app: **M** = manual/teclado · **W** = wearable · **C** = cámara · **L** = laboratorio a bordo · **N** = dato de la nave (telemetría ambiental).

**Respuesta corta a la pregunta abierta de la investigación anterior** ("umbrales oficiales de escalamiento: no encontrado"): se **confirma en parte y se corrige en parte**. No existe en NASA-STD-3001 una tabla pública de "si el signo vital X pasa de Y, llama al cirujano de vuelo"; los estándares de salud remiten a "valores clínicos aceptados" y a documentos de programa (MORD, flight rules) que no son públicos. Sí existen, y aquí se listan: (a) límites ambientales numéricos con obligación de alertar a la tripulación, (b) límites de dosis de radiación, (c) fitness-for-duty y permissible outcome limits numéricos, (d) criterios procedimentales públicos de "Contact Surgeon" en el Medical Checklist del Shuttle (JSC-48031) y (e) la regla de que la conferencia médica privada (PMC) es rutinaria y con frecuencia fijada por el cirujano de vuelo. Detalle en la sección C.5.

---

## A. Sistema inmune, infecciones y ambiente cerrado/hostil

### A.1 Signos vitales y síntomas generales (infección, hipoxia, tóxicos)

| # | Variable | Unidad | Cómo se mide en vuelo / equipo | Qué problema señala | Rango normal y umbral de alerta (fuente) | Cambio en vuelo espacial | Entrada app | Fuente |
|---|---|---|---|---|---|---|---|---|
| A1 | Temperatura corporal | °C | Termómetros orales desechables y termómetros de piel en los kits (ISS AMP; Shuttle EENT Subpack). Sensor de flujo de calor en frente (estudio de investigación) | Infección, golpe de calor, respuesta inflamatoria | Clínico terrestre: 36,5–37,3 °C; fiebre probable si oral >37,2–37,5 °C; contactar al médico si ≥39,4 °C sostenida o ≥40,6 °C [45a][45d]. Oficial NASA: **no encontrado** un umbral de fiebre en vuelo | La temperatura central en reposo sube ~1 °C de forma gradual en 2,5 meses (n=11 astronautas ISS); sube más y más rápido en ejercicio [25]. Un mismo valor puede no significar lo mismo que en Tierra: usar la línea base del propio tripulante | M, W | [25][27][28][45a][45d] |
| A2 | Frecuencia respiratoria | resp/min | Conteo manual; Bio-Monitor (frecuencia y volumen respiratorio) | Infección respiratoria, hipoxia, tóxicos inhalados, dolor | Clínico terrestre: 12–18/min [45a]. Oficial NASA: no encontrado | No encontrado (magnitud) | M, W | [36][45a] |
| A3 | SpO2 | % | Pulsioxímetro del kit (ISS ALSP/AMP; Orion lo lista como dispositivo, dato "puede ingresarse a mano"); Bio-Monitor | Hipoxia, neumonía, inhalación de humo/tóxicos, despresurización | Clínico terrestre: 95–100 %; contactar si ≤92 %; atención inmediata si ≤88 % [45c]. Oficial NASA: límite se fija sobre el aire (PIO2), no sobre SpO2 (ver A23) | En atmósfera "de exploración" (8,2 psia, 34 % O2; PIO2 127 mmHg) NASA exige plan de monitoreo de salud [2] | M, W | [2][27][36][38][45c] |
| A4 | Frecuencia cardiaca | lpm | Manguito automático (40–200 lpm, ±5 %), monitor Polar HRM2, BP/ECG, Bio-Monitor | Fiebre, deshidratación, hipoxia, dolor, sepsis | Clínico terrestre: 60–100 lpm [45a] | No encontrado en este bloque | W, M | [27][36][45a] |
| A5 | Presión arterial | mmHg | Manguito automático oscilométrico (20–280 mmHg, ±3 mmHg o 2 %); BP/ECG; Bio-Monitor | Choque séptico/anafilaxia, intolerancia ortostática | Clínico terrestre: 90/60–120/80 mmHg [45a] | No encontrado en este bloque | M, W | [27][36][45a] |
| A6 | Cefalea (sí/no, intensidad 0–10, hora) | escala | Autoinforme; cruzar con ppCO2 de cabina | CO2 elevado, adaptación espacial, desplazamiento de fluidos, CO | Sin umbral clínico. NASA: mantener CO2 medio de 7 días <2,5 mmHg deja el riesgo de cefalea <1 %; el límite de 3 mmHg lo deja <1,4 % [4][20] | 19 de 49 astronautas (Exp. 2–31) reportaron cefalea; por cada +1 mmHg de CO2 se duplica la probabilidad [4][20]. IMM: "CO2 headache" 2,15 por misión; "late headache" 5,25 [1] | M | [1][4][20] |
| A7 | Lista de síntomas por CO2 | checklist | Autoinforme: cefalea, fatiga, malestar, mal sueño, náusea, tos crónica, visión borrosa, disestesia facial | Hipercapnia | Asociaciones anecdóticas NASA: cefalea a 2,8–4,5 mmHg; fatiga/mal sueño/náusea >4,5 mmHg; disestesia del V par a 4,5–5,0 mmHg; tos crónica, mal sueño y visión borrosa a 3,5 mmHg [4] | Estudios terrestres recientes no hallan pérdida cognitiva clara a los niveles de nave [4] | M | [4] |
| A8 | Congestión nasal / "cabeza llena" | sí/no, días | Autoinforme | Adaptación espacial, CO2, alergia, infección respiratoria alta | Sin umbral. Si persiste más allá de los primeros 30 días ya no se clasifica como adaptación (criterio del estudio) [21] | Afecta a >50 % de tripulantes; primera causa de uso prolongado de medicación [6]. Congestión/rinitis prolongada: 20 eventos, 1,0 por año-vuelo (46 misiones ISS) [21] | M | [6][21] |
| A9 | Síntomas de mal de adaptación espacial | checklist | Autoinforme: náusea, vómito, cefalea, malestar, vértigo | Space Adaptation Syndrome | Sin umbral | Afecta al 50–70 %; dura en promedio ~3 días [6][7] | M | [6][7] |

### A.2 Laboratorio inmune e infeccioso

| # | Variable | Unidad | Cómo se mide en vuelo / equipo | Qué problema señala | Rango normal y umbral de alerta (fuente) | Cambio en vuelo espacial | Entrada app | Fuente |
|---|---|---|---|---|---|---|---|---|
| A10 | Leucocitos totales (WBC) | ×10⁹/L | HemoCue WBC DIFF (demo ISS 2020–21, punción de dedo); hoy la rutina es muestra devuelta a Tierra | Infección, estrés, síndrome agudo por radiación (leucopenia) | Clínico terrestre: 4,5–11,0 ×10⁹/L [45b]. Oficial NASA: valores "dentro de rangos normativos de población sana" y fuera de "valores críticos" que no se cuantifican [V1 4015–4017] [1] | WBC elevado y redistribución de subpoblaciones durante vuelos de 6 meses (n=23) [24] | L, M | [1][24][32][45b] |
| A11 | Diferencial de 5 partes (neutrófilos, linfocitos, monocitos, eosinófilos, basófilos) | % y ×10⁹/L | HemoCue WBC DIFF | Bacteriana vs. viral, alergia, radiación | Clínico terrestre: no abierto en esta sesión (no encontrado) | Alteración de la maduración de linfocitos T CD8+ [24] | L | [24][32] |
| A12 | Función de células T / citocinas estimuladas (IFNγ, IL-10, IL-5, TNFα, IL-6) | pg/mL | Solo investigación: sangre devuelta a Tierra en <48 h | Desregulación inmune | No encontrado un umbral | Reducción de la función de células T CD4+ y CD8+ y de la producción estimulada de citocinas durante los 6 meses (n=23) [24] | no factible a bordo hoy | [24] |
| A13 | Proteína C reactiva (PCR) | mg/dL | No hay analizador operativo a bordo verificado; se mide en tierra antes del vuelo como "química especial" [16] | Inflamación/infección | Clínico terrestre: ≤0,8–1,0 mg/dL se considera sano [45g] | No encontrado | L (futuro) | [16][45g] |
| A14 | Carga viral latente en saliva (EBV, VZV, HSV-1) y orina (CMV) | copias/ng ADN | Hoy: saliva (salivette o saliva seca en papel, Artemis II) analizada en Tierra por PCR en tiempo real. No hay PCR clínico a bordo verificado | Reactivación viral = marcador de inmunidad celular baja; riesgo de zóster | En controles sanos: 0/20 con VZV o CMV, 2/20 con EBV [22]. Sin umbral clínico de acción (no encontrado) | ISS (n=23): EBV 96 %, VZV 65 %, CMV 61 %; HSV-1 no detectado. Shuttle (n=89): EBV 82 %, VZV 41 %, CMV 47 %. Carga de EBV ~10× mayor en vuelo. 6 casos con síntomas [22][23] | L (futuro); M para el síntoma | [22][23][29][37] |
| A15 | Cortisol salival / plasmático | µg/dL | Saliva o sangre devueltas a Tierra | Estrés fisiológico, eje HPA | Clínico terrestre: no abierto (no encontrado). Plasma en vuelo: mediana 15,2 µg/dL (final de vuelo) a 24,8 µg/dL (recuperación), sin diferencia significativa [22] | Cambia el patrón diurno salival en vuelo (p=0,010) [22]; DHEA baja y sube la razón cortisol/DHEA [23] | L (futuro) | [22][23] |
| A16 | Lesiones herpéticas (herpes labial, zóster) | sí/no + foto | Inspección y foto con cámara | Reactivación de HSV/VZV | Sin umbral; zóster figura en la lista de condiciones de NASA (0,11 por misión en el IMM) [1] | Herpes labial: 6 eventos, 0,3 por año-vuelo [21] | C, M | [1][21] |
| A17 | Erupción cutánea / hipersensibilidad (localización, extensión, prurito, foto) | sí/no, cm, foto | Autoinspección y foto. En tierra se hace foto-documentación de piel antes del vuelo [6] | Dermatitis de contacto, eccema, infección cutánea, alergia | Sin umbral numérico | Evento más frecuente: 23 eventos, 1,1 por año-vuelo; ~25 veces la incidencia terrestre. 46 % de tripulantes tuvo un evento "notable"; 40 % de ellos fueron erupciones; pico en el primer mes [21]. IMM: skin rash 9,83 por misión [1] | C, M | [1][6][21] |
| A18 | Signos de infección de piel / herida | checklist + foto | Inspección: enrojecimiento, calor, pus, ganglios, fiebre | Celulitis, absceso | Checklist Shuttle: signos de infección = hinchazón, fiebre, ganglios dolorosos [28] | Infecciones de piel y subcutáneas: 8,1 % de los eventos médicos en STS-1 a STS-89 [10]. IMM: skin infection 1,38 por misión [1] | C, M | [1][10][28] |
| A19 | Garganta (foto, dolor) | foto, escala | Linterna, depresor y cámara | Faringitis, úlcera oral | Sin umbral | IMM: faringitis 1,17 por misión; úlcera oral 0,96 [1] | C, M | [1][27] |
| A20 | Otoscopia (tímpano) | imagen / hallazgo | Otoscopio del kit (ISS AMP; Orion lo lista) | Otitis media/externa, barotrauma, cerumen | Checklist: tímpano rojo y abombado o perforado → contactar al cirujano [28] | Síntomas de oído: incluidos en la tabla de [21]; IMM: barotrauma 3,28, otitis externa 0,32, otitis media 0,30 por misión [1] | C, M | [1][27][28][38] |
| A21 | Microbioma (piel, saliva, heces) | taxones | Hisopos y muestras devueltas a Tierra (Standard Measures) | Disbiosis, riesgo infeccioso | No encontrado un umbral clínico | No encontrado (magnitud) en fuentes abiertas | no factible a bordo | [29][30] |

### A.3 Orina (tira reactiva)

Equipo verificado: tiras **Chemstrip 10 SG** (Shuttle) y "Urine Chemstrips and color chart" en el AMP de la ISS; Orion lista "Point-of-care Urinalysis" [27][28][38]. Lectura por comparación de color: entrada manual o por cámara. La tabla de registro del checklist del Shuttle tiene exactamente estos campos [28].

| # | Variable | Unidad | Qué problema señala | Rango normal (clínico terrestre) | Cambio en vuelo | Entrada | Fuente |
|---|---|---|---|---|---|---|---|
| A22a | Leucocitos (esterasa) | neg / traza / pos | Infección urinaria | Negativo (rango no detallado en la fuente abierta) | ITU: 2 eventos, 0,1 por año-vuelo [21]; IMM 1,44 por misión [1] | M, C | [1][21][28] |
| A22b | Nitritos | neg / pos | ITU bacteriana | No se encuentran normalmente [45h] | — | M, C | [28][45h] |
| A22c | Sangre / hemoglobina | ery/µL | Cálculo renal, ITU | No se encuentra normalmente [45h] | La pérdida ósea eleva el calcio urinario y el riesgo de cálculos [1][6] | M, C | [28][45h] |
| A22d | Proteína | mg/dL | Daño renal | No detectable [45h] | No encontrado | M, C | [28][45h] |
| A22e | Glucosa | mg/dL | Hiperglucemia | No detectable [45h] | No encontrado | M, C | [28][45h] |
| A22f | Cetonas | neg / + / ++ / +++ | Ingesta calórica insuficiente, ayuno | No detectable [45h] | No encontrado | M, C | [28][45h] |
| A22g | pH | unidades | Riesgo de litiasis, ITU | 4,6–8,0 [45f] | No encontrado | M, C | [28][45f] |
| A22h | Densidad | g/mL | Deshidratación (p. ej. tras EVA) | 1,005–1,030 [45e] | Diuresis transitoria al inicio; pérdida de ~12–15 % del volumen corporal de líquido [6] | M, C | [6][28][45e] |
| A22i | Bilirrubina / urobilinógeno | neg-pos / mg/dL | Hígado, hemólisis | Bilirrubina no detectable [45h] | No encontrado | M, C | [28][45h] |
| A22j | Retención urinaria (horas sin orinar, dolor suprapúbico) | h, sí/no | Retención aguda (adaptación, fármacos como prometazina/escopolamina) | Sin umbral numérico encontrado | Caso documentado en dos vuelos, con sondaje 4 días [26]; IMM 0,11 por misión [1] | M | [1][26][28] |

### A.4 Ambiente de cabina (datos de la nave)

NASA exige que la nave **registre, muestre y alerte** presión, humedad, temperatura, ppO2 y ppCO2 en cada compartimento [V2 6020, 6021, 6022] [2]. Para la app son variables de entrada "dato de la nave".

| # | Variable | Unidad | Cómo se mide / equipo | Qué problema señala | Límite (oficial NASA salvo que se indique) | Dato de vuelo | Entrada | Fuente |
|---|---|---|---|---|---|---|---|---|
| A23 | ppCO2 de cabina | mmHg | Sensores fijos; monitor portátil CDM (0,01–6,0 % vol.); monitor personal de CO2 | Cefalea, fatiga, mal sueño | **≤3 mmHg promedio de 1 hora** [V2 6004]. Los valores fuera de nominal no están en el estándar: los define cada programa [2] | ISS histórico 1–9 mmHg; desde la flight rule de 2016, promedio de 24 h ≤3,00 mmHg con excursiones breves. Aire interior terrestre: 0,6–0,76 mmHg [4] | N | [2][4][27] |
| A24 | CO2 inspirado en traje (PICO2) | mmHg | Sensor del traje | Hipercapnia en EVA | No exceder **20 mmHg** en contingencias de hasta 1 hora [V2 11040]; niveles nominales de traje 3–15 mmHg [2] | — | N | [2] |
| A25 | O2 inspirado (PIO2) | mmHg | Sensor ppO2; analizador portátil CSA-O2 | Hipoxia / hiperoxia | Normoxia objetivo **145–155**; hipoxia leve, límite inferior **127** (promedio 1 h; mínimo absoluto 122) "indefinido con monitoreo"; hiperoxia indefinida hasta **356**; corto plazo hasta **791** por 6–9 h [V2 6003, Tabla 6.2-1] [2]. Referencia OSHA citada: <19,5 % O2 = deficiente | — | N | [2][27] |
| A26 | Presión total de cabina | kPa / psia | Sensor de presión | Barotrauma, enfermedad por descompresión | **34,5 < P ≤ 103 kPa (5 < P ≤ 15,0 psia)** indefinido [V2 6006]; cambio de presión ≤13,5 psi/min [V2 6007] [2] | ISS 14,7 psia; EMU 4,3 psia; "campout" 10,2 psia y 26,5 % O2 [8] | N | [2][8] |
| A27 | Temperatura y humedad de cabina | °C, % HR | Sensores de cabina | Mucosas secas, erupciones por crecimiento microbiano, estrés térmico | Límites de salud anclados en **18 °C/75 % HR y 27 °C/25 % HR** [V2 6012]; zona de desempeño 20–25 °C y 30–60 % HR (racional de V2 6013) [2] | — | N | [2] |
| A28 | Ruido: dosis de 24 h | dBA, % dosis | Dosímetro acústico personal (Quest NoisePro, se lleva 24 h); sonómetro B&K 2260 | Pérdida auditiva, mal sueño, irritabilidad | Dosis D ≤100, equivalente a **85 dBA/8 h** en lanzamiento/entrada [V2 6073] y a **75 dBA/8 h (70 dBA/24 h)** en órbita [V2 6115]; trabajo NC-50, sueño NC-40 en misiones >30 días; impulso <140 dB pico; alarmas <95 dBA [2] | Spacelab/Shuttle: 68–75,5 dBA de promedio diario [9] | N, W | [2][9][27] |
| A29 | Umbral auditivo (audiometría) | dB HL por frecuencia | On-Orbit Hearing Assessment: EarQ (2000–2021), KUDUwave desde 2021; el cirujano revisa en tierra | Pérdida auditiva por ruido o neurosensorial | Oficial NASA: no encontrado el criterio numérico de "cambio significativo". Clínico terrestre (OSHA STS): no abierto en esta sesión | Shuttle: 17 % de 608 astronautas volvió con desplazamiento significativo, 6 % permanente en agudas. ISS: desplazamiento en graves (250–500 Hz) en 40 % de las pruebas y 60 % de tripulantes [40]. IMM: hearing loss 0,57 por misión [1] | L (prueba en tablet), M | [1][27][40] |
| A30 | Productos de combustión (CO, HCN, HCl, HF) | ppm | CSA-CP | Incendio, inhalación de humo | Rangos de monitoreo exigidos: CO 5–1000 ppm; HCN, HCl, HF 2–50 ppm [V2 6024, Tabla 6.2-3]. Límites de exposición = SMAC de JSC-20584 (valores no abiertos: no encontrado) [2] | Síntomas de CO: cefalea, mareo, debilidad, náusea, dolor torácico, confusión [11] | N + M (síntomas) | [2][11][27] |
| A31 | Contaminantes traza / tóxicos (amoníaco, formaldehído, VOC) | ppm, mg/m³ | Air Quality Monitor, kit de formaldehído, grab samples | Irritación de ojos y vías aéreas, tos | SMAC por duración (1 h a 1000 días) y niveles de peligro tóxico 0–4: en cabina solo nivel ≤3 [11][2] | Amoníaco: tos e irritación a baja concentración; quemadura de vía aérea a alta [11] | N + M | [2][11][27] |
| A32 | Partículas en aire | mg/m³ | Monitor de partículas | Irritación ocular y respiratoria | Polvo total **<3 mg/m³**; fracción respirable (<2,5 µm) **<1 mg/m³** [V2 6052] [2] | — | N | [2] |
| A33 | Polvo lunar (<10 µm) | mg/m³ | Monitor de polvo celeste [V2 6153] | Tos, estornudos, irritación ocular y nasal, abrasión | **<0,3 mg/m³** promedio ponderado, exposición intermitente diaria hasta 6 meses [V2 6053]. Polvo marciano **<0,1 mg/m³** hasta 30 días; pico ≤10 mg/m³ [V2 6253] [2] | Apolo: irritación de ojos, nariz y pulmones al reingresar al módulo [12]. Simulación IMPACT lunar: "lunar dust exposure" fue el evento más frecuente [44] | N + M | [2][12][44] |
| A34 | Microbiología de aire, superficies y agua | UFC | Microbial Air Sampler, hisopos de superficie, kit de agua con bolsa de coliformes; MinION/miniPCR en investigación | Riesgo infeccioso y alérgico | En vuelo (ISS MORD, citado por OCHMO): aire **bacterias 1000 UFC/m³, hongos 100 UFC/m³**; superficies **10 000 y 100 UFC/100 cm²**; agua **50 UFC/mL y sin coliformes detectables** [10]. El Vol. 2 Rev F ya no da números: remite al JSC Microbiology Laboratory [2] | — | N | [2][10][27] |
| A35 | Dosis de radiación personal | mSv, mGy | Crew Active Dosimeter (bolsillo), HERA, M-42 EXT en Orion; en ISS: dosímetros pasivos (RAM/CPD, 0,05–10 rad), TEPC (alarma >5 mrad/min) | Riesgo de cáncer, síndrome agudo, cataratas | Ver C.1 | Entorno de superficie ~0,5 mSv/día; GCR en espacio libre sin blindaje 1,5 mSv/día (valores de diseño del estándar) [1] | N, W | [1][27][37] |

### A.5 Enfermedad por descompresión (EVA)

| # | Variable | Unidad | Cómo se mide | Qué señala | Umbral | Dato de vuelo | Entrada | Fuente |
|---|---|---|---|---|---|---|---|---|
| A36 | Síntomas DCS tipo I | checklist | Autoinforme tras EVA: dolor articular o muscular, prurito, erupción leve, parestesia localizada | DCS "solo dolor" | Cualquier síntoma se reporta (política de reporte obligatorio); puede terminar la EVA [8][42] | Sesgo conocido a no reportar [42] | M | [8][42] |
| A37 | Síntomas DCS tipo II | checklist | Neurológicos, entumecimiento, debilidad, cognición, oído interno, cardiopulmonares, cutis marmorata | DCS grave | Aborto inmediato de EVA [42]; tratamiento: volver a la presión de saturación inicial; ≥16,4 psia puede aliviar [8][2] | NASA nunca ha tenido un evento tipo II en vuelo [8] | M | [2][8][42] |
| A38 | Burbujas venosas (VGE) | grado 0–7 (escala Eftedal-Brubakk modificada) | Doppler / ecocardiografía | Estrés de descompresión | Estándar de validación en tierra, **no de uso en vuelo**: probabilidad de DCS <4 % con 95 % de confianza y sin DCS grave [V2 6008]. Histórico (Rev A): DCS ≤15 %, VGE grado IV ≤20 %, sin tipo II [2][3] | — | L (ultrasonido) | [2][3][8] |
| A39 | Barotrauma de oído/senos (dolor, imposibilidad de igualar) | sí/no | Autoinforme + otoscopia | Barotrauma | La nave debe permitir pausar el cambio de presión dentro de 1 psi [V2 6150] [2] | IMM 3,28 por misión [1] | M | [1][2] |

### A.6 Problemas agudos frecuentes (lista de síntomas para la app)

Frecuencias del modelo IMM publicado por NASA (Tabla E.2-1, eventos por misión de referencia ISS) [1]. Sirven para ordenar el cuestionario de la app.

| # | Variable (autoinforme o foto) | Frecuencia IMM (por misión) | Equipo / examen disponible | Entrada | Fuente |
|---|---|---|---|---|---|
| A40 | Insomnio / horas de sueño | 13,85 (insomnio tardío) | Actígrafo, diario de sueño. Sueño medio en vuelo 6–6,5 h; ~71 % usa hipnóticos [6][13] | W, M | [1][6][13] |
| A41 | Abrasión de piel | 9,86 | Foto | C, M | [1] |
| A42 | Abrasión ocular / cuerpo extraño / ojo rojo | 7,42 (abrasión); quemadura química 0,64; infección 0,53 | Tinción con fluoresceína y foto. Checklist: ojo rojo con visión borrosa, dolor, fotofobia o pus → contactar al cirujano [28] | C, M | [1][28] |
| A43 | Diarrea / gastroenteritis | 3,53 / 0,42 | Checklist: si hay fiebre → contactar al cirujano [28] | M | [1][28] |
| A44 | Infección respiratoria | 3,46 | Estetoscopio, pulsioxímetro, flujo pico | M | [1][27] |
| A45 | Dolor de espalda (adaptación) | 3,15; afecta al 52 % | Escala de dolor | M | [1][6] |
| A46 | Reacción alérgica | 1,18 | Signos vitales, foto | M, C | [1] |
| A47 | Estreñimiento (días sin evacuar) | 1,02 | Autoinforme | M | [1] |
| A48 | Dental: caries, absceso, pérdida de empaste/corona | caries 0,88; absceso 0,068 | Foto intraoral, kit dental | C, M | [1] |
| A49 | Sinusitis | 0,64 | Autoinforme, temperatura | M | [1] |
| A50 | Parestesia y delaminación de uña tras EVA | 0,65 / 0,40 | Foto, autoinforme | C, M | [1] |

---

## B. Inventario de lo que sí se puede medir a bordo

### B.1 Equipo → variables

| Equipo | Plataforma / estado | Variables que entrega (unidades, rangos del fabricante cuando se encontraron) | Entrada app | Fuente |
|---|---|---|---|---|
| **CHeCS** (Crew Health Care System) = CMS (contramedidas) + EHS (salud ambiental) + HMS (mantenimiento de la salud) | ISS (catálogo de hardware v10.0, marzo 2011: inventario antiguo, parte ya sustituida) | Ver filas siguientes | — | [27] |
| Manguito automático de PA (ALSP) | ISS | PA 20–280 mmHg (±3 mmHg o 2 %); FC 40–200 lpm (±5 %); resultado en 1 min | M | [27] |
| BP/ECG (CMS) | ISS | PA y ECG; las derivaciones restantes se calculan en tierra para obtener 12 derivaciones | L | [27] |
| Heart Rate Monitor 2 (Polar) | ISS | FC continua durante ejercicio | W | [27] |
| Pulsioxímetro | ISS (ALSP/AMP), Orion | SpO2 %, pulso. Rango y exactitud: no encontrado | M, W | [27][38] |
| Termómetros orales desechables y de piel | ISS, Shuttle | Temperatura | M | [27][28] |
| Estetoscopio, otoscopio, oftalmoscopio, linterna, depresores | ISS, Orion (estetoscopio y otoscopio) | Hallazgos de auscultación; imagen de tímpano y fondo de ojo | C, M | [27][38] |
| Kit PanOptic (oftalmoscopio Welch-Allyn + webcam) | ISS | Imagen de fondo de ojo (fundoscopia) | C | [27] |
| Tonómetro Tonopen | ISS | Presión intraocular 5–80 mmHg (±10 %). Normal en 1 g ≤22 mmHg; el catálogo indica ajustar a ≤18 mmHg en microgravedad | M | [27] |
| OCT (tomografía de coherencia óptica) | ISS | Grosor retiniano peripapilar (TRT, µm), coroides, cabeza del nervio óptico. Criterio SANS: aumento ≥55 µm de TRT o edema de papila Frisén ≥1; signo más temprano >19,4 µm | L | [16][17] |
| Agudeza visual, rejilla de Amsler, cuestionario ocular | ISS | Agudeza cerca/lejos, distorsión. "Eye weeks" en FD30, FD90 y R-30; vigilancia en L+30, 90, 180, 270 y R-30 | M (prueba en pantalla) | [16][17] |
| Ultrasonido (unidad de la ISS; Butterfly iQ en demostración) | ISS; Gateway lista "ultrasonografía" | Imagen de ojo, cuello (vena yugular), piernas, columna, abdomen, corazón; grosor íntima-media carotídeo; burbujas VGE. "Ultrasound 2" como nombre: no confirmado en fuente abierta | L | [29][31][38][46] |
| PCBA (analizador clínico portátil, tipo i-STAT) con cartuchos **EC8+** y **CREA** | ISS (2011). Cartuchos i-STAT actuales: **no encontrado**. Tras el aterrizaje se miden "parámetros i-Stat" [16] | Muestra de 65 µL, 120 s. Analitos: Na, K, Cl, glucosa, pH, hematocrito, pCO2, BUN, TCO2, HCO3, exceso de base, anion gap, hemoglobina, creatinina. Rangos del analizador (emparejados por inferencia, la tabla del PDF sale desalineada): Na 100–180 mmol/L; K 2,0–9,0; Cl 65–140; glucosa 20–450 mg/dL; pH 6,8–8,0; Hct 10–75 %; pCO2 10–100 mmHg; BUN 3–140 mg/dL; creatinina 0,2–20 mg/dL. Sin refrigeración los cartuchos pierden fiabilidad en ~2 semanas | L | [16][27][41] |
| Tiras de orina Chemstrip (10 SG) | ISS, Shuttle; Orion: "urinálisis point-of-care" | Densidad, pH, leucocitos, nitritos, proteína, glucosa, cetonas, urobilinógeno, bilirrubina, hemoglobina. Vida útil hasta 2 años | M, C | [27][28][38][41] |
| Flujómetro de pico (Peak Flow Meter) | ISS (AMP) | Flujo espiratorio máximo. Espirometría completa a bordo: **no encontrado** | M | [27] |
| **HemoCue WBC DIFF** | Demo tecnológica ISS, dic 2020–ene 2021 | Leucocitos totales y diferencial de 5 partes en sangre capilar. 1.ª sesión: 3 de 13 intentos válidos; 2.ª: 14 de 20; 3.ª: diferencial en punción de dedo real. Primera hematología en tiempo real en microgravedad | L | [32][34] |
| **rHEALTH ONE** | Demo tecnológica ISS, mayo 2022 | Citómetro de flujo miniatura: gota de 10 µL, ~2 min, 5 canales. Se probó con microesferas, no con sangre de tripulantes; resultados en vuelo iguales a tierra. Potencial: conteos celulares, hormonas, química, proteínas | L (futuro) | [33][34] |
| **Bio-Analyzer** (CSA) | ISS desde 2019 | Sangre de punción de dedo, saliva u orina ("unas gotas"); conteos celulares específicos y biomarcadores; objetivo: resultados en 2–3 h. Lista de analitos: no encontrado | L | [35] |
| **Bio-Monitor** (CSA; versión comercial Hexoskin/Astroskin) | ISS desde dic 2018 | Pulso y actividad eléctrica del corazón, presión arterial, frecuencia y volumen respiratorio, temperatura de piel, SpO2, nivel de actividad. Camiseta + cinta de cabeza + app en tablet; sirve durante sueño y ejercicio | W | [36] |
| **Tempus Pro** | Uso verificado: aterrizajes de astronautas ESA (desde 2017). Uso dentro de la ISS: **no encontrado**. Candidato en estudio para Gateway (dato de búsqueda, no abierto) | SpO2, presión arterial, actividad cardiaca; transmite ultrasonido, video y voz | W / L | [47] |
| Actígrafo (Actiwatch Spectrum) | ISS (Standard Measures); pulseras en Artemis II (ARCHeR) | Actividad por minuto, exposición a luz; con diario de sueño: duración y calidad | W | [29][37] |
| Batería Cognition (10 pruebas) | ISS | Tiempo de reacción, memoria de trabajo, abstracción, orientación espacial, reconocimiento de emociones, decisión bajo riesgo, atención | M (prueba en pantalla) | [29][30] |
| On-Orbit Hearing Assessment (EarQ → KUDUwave) | ISS | Umbrales tonales por frecuencia | L | [27][40] |
| Dosímetro acústico y sonómetro | ISS | dBA instantáneo, promedio y máximo; bandas de octava | N | [27] |
| Monitor de CO2 (CDM), CSA-CP, CSA-O2, kit de formaldehído, AQM | ISS | CO2 0,01–6,0 %; CO, HCN, HCl; O2; formaldehído; VOC | N | [11][27] |
| Radiación: RAM/CPD pasivos, TEPC; Crew Active Dosimeter, HERA, M-42 EXT | ISS; Orion/Artemis II | Dosis absorbida (rad, mrad/min) y dosis equivalente (rem, mrem/min) en el TEPC; hoy se reporta en mGy y mSv | N, W | [27][37] |
| Microbiología: muestreador de aire, hisopos, kit de agua, TOCA | ISS | UFC en aire, superficie y agua; coliformes (1 organismo/100 mL); carbono orgánico total | N | [10][27] |
| SLAMMD (masa corporal) | ISS (Human Research Facility) | Masa corporal en kg. Especificación de exactitud en fuente NASA: **no encontrado** (solo fuentes secundarias no abiertas) | M | — |
| Kit médico de Orion (OPMK, OSMK, OMAK, SAMI) | Artemis | Diagnóstico: imagen con luz, ECG, signos vitales, auscultación, evaluación corneal, urinálisis; en Gateway: ultrasonografía y co-oximetría. ECG debe mostrar/guardar/transmitir datos; PA y pulsioxímetro pueden anotarse a mano. Masa total asignada ~30 lb | M | [38][39] |
| Marte / exploración | Planeado | Monitoreo en tiempo real, imagen médica y análisis de biomarcadores (sangre, orina) con operación independiente de la Tierra; guía autónoma de ultrasonido (AMOS). Lista de equipo definida: **no encontrado** | — | [34] |

### B.2 Spaceflight Standard Measures (lista oficial)

| Medida | Qué se obtiene | Muestra / método | Calendario (misión de 6 meses) | Fuente |
|---|---|---|---|---|
| Actigrafía + diario de sueño | Actividad por minuto, luz, sueño | Actiwatch Spectrum | Continuo en vuelo; 2 semanas en L-180, L-90 y R+0 | [29][30] |
| Cuestionario de calidad de sueño y equipo | Sueño, ánimo, afecto, cohesión, habitabilidad | Cuestionario | Mensual en vuelo | [29][30] |
| Encuesta de personalidad | Cinco rasgos (IPIP-NEO) | Papel | Antes del vuelo | [29][30] |
| Cognition | 10 pruebas neurocognitivas | Software | L-120, L-90, FD30, R-30, R+10, R+30 | [29][30] |
| Perfil celular | Hormonas de estrés, excreción viral, proteínas, tipos de células sanguíneas | Sangre (10 mL) y saliva | L-180, L-90, ~FD30, R-30/R-0, R+30; encuesta posvuelo de alergias, erupciones, infecciones y cicatrización | [29][30] |
| Marcadores bioquímicos | Hemograma, panel metabólico y químico completos | Sangre; orina de 24 h solo en tierra | L-180, FD30, R-30, R+30 | [29][30] |
| Microbioma | Tipos y concentración de microorganismos | Hisopos (antebrazo, frente, fosa nasal), saliva 4 días, heces | L-90, FD30, R-30, R+30 | [29][30] |
| Grosor íntima-media carotídeo | Grosor de pared arterial | Ultrasonido | L-180, R+5, R+30 | [29][30] |
| Sensorimotor | Movimiento, equilibrio, FC y PA | Pruebas funcionales | Antes y después del vuelo | [29][30] |

Artemis II Standard Measures: sangre, orina y saliva desde ~6 meses antes; en vuelo se evalúa mareo por movimiento; la sangre solo antes y después [37].

### B.3 CIPHER (14 estudios)

Salud ósea (isótopos de calcio en sangre y orina) · Soporte óseo (imagen 3D de alta resolución) · Respuestas coronarias (RM, TC, ultrasonido) · Integración de datos · Aptitud de egreso · Calcio vascular · ISAFE (ojo: visión, flujo venoso, imagen cerebral) · Adaptaciones musculoesqueléticas · Ultrasonido de rutina (cuello, piernas, columna) · Standard Measures · Fisiología espacial (fuerza, capacidad cardiorrespiratoria, ejercicio, dieta, sueño) · Cognición espacial (RM, marcadores en sangre) · Telómeros · Salud vestibular. Tres categorías de duración (<~3,5 meses, ~3,5–8 meses, >~8 meses); objetivo de hasta 30 astronautas (dato del resultado de búsqueda de la página de NASA) [31].

---

## C. Umbrales y listas oficiales

### C.1 Radiación (NASA-STD-3001 Vol. 1 Rev C, sección 4.8) [1]

| Estándar | Valor | Requisito |
|---|---|---|
| Dosis efectiva de carrera | **<600 mSv**, igual para toda edad y sexo (≈3 % de riesgo medio de muerte por cáncer, REID) | [V1 4030] |
| Evento de partículas solares de diseño | **<250 mSv** de dosis efectiva | [V1 4031] |
| Fuentes nucleares a bordo | **<20 mSv por año de misión** | [V1 4032] |
| Rayos cósmicos galácticos (hábitats >60 días) | **<1,3 mSv/día** en espacio libre; **<0,9 mSv/día** en superficie | [V1 4033] |
| Principio | ALARA (tan bajo como sea razonable) | [V1 4029] |

Límites por órgano (Tabla 4.8-1, mGy-Eq salvo SNC en mGy):

| Órgano | 30 días | 1 año | Carrera |
|---|---|---|---|
| Cristalino | 1000 | 2000 | 4000 |
| Piel | 1500 | 3000 | 6000 |
| Órganos hematopoyéticos | 250 | 500 | no aplica |
| Sistema circulatorio | 250 | 500 | 1000 |
| Sistema nervioso central | 500 mGy | 1000 mGy | 1500 mGy |
| SNC (iones Z≥10) | — | 100 mGy | 250 mGy |

### C.2 Atmósfera, ruido, agua y contaminantes (Vol. 2 Rev F) [2]

| Estándar | Valor numérico | Documento y sección |
|---|---|---|
| CO2 de cabina | ≤3 mmHg, promedio de 1 h | [V2 6004] 6.2.1.3 |
| CO2 en traje, contingencia | PICO2 ≤20 mmHg hasta 1 h | [V2 11040] |
| O2 inspirado | 145–155 mmHg objetivo; mínimo 127 (absoluto 122); máximo indefinido 356; corto plazo 791 | [V2 6003] Tabla 6.2-1 |
| Gas diluyente | ≥30 % | [V2 6002] |
| Presión total | >34,5 y ≤103 kPa (5–15 psia) | [V2 6006] |
| Velocidad de cambio de presión | ≤13,5 psi/min | [V2 6007] |
| Temperatura / humedad | Entre 18 °C/75 % y 27 °C/25 % | [V2 6012] Figura 6.2-2 |
| Humedad tras aterrizaje | 25–75 % indefinido; 75–85 % 24 h; 85–95 % 12 h; >95 % 8 h | [V2 6011] Tabla 6.2-2 |
| Calor almacenado por tripulante | −4,1 a +4,7 kJ/kg | [V2 6014] |
| Ruido, lanzamiento/entrada | Dosis ≤100 (85 dBA/8 h); techo 105 dBA; aborto 115 dBA; impulso <140 dB | [V2 6073–6076] |
| Ruido en órbita, 24 h | Dosis ≤100 (75 dBA/8 h = 70 dBA/24 h) | [V2 6115] |
| Ruido continuo | NC-50 trabajo; NC-40 sueño (misiones >30 días) | [V2 6078, 6079] |
| Ruido durante el sueño | Intermitente ≤10 dB sobre el fondo | [V2 6082] |
| Alarmas / infrasonido / audio personal | <95 dBA / <150 dB / ≤115 dBA | [V2 6081, 6085, 6106] |
| Partículas | <3 mg/m³ total; <1 mg/m³ respirable | [V2 6052] |
| Polvo lunar / marciano | <0,3 mg/m³ (6 meses) / <0,1 mg/m³ (30 días) | [V2 6053, 6253] |
| Productos de combustión (rango de monitor) | CO 5–1000 ppm; HCN, HCl, HF 2–50 ppm | [V2 6024] Tabla 6.2-3 |
| Energía de la dieta | 12 698 kJ (3035 kcal)/día de promedio; +837 kJ (200 kcal) por hora de EVA | [V2 7003] |
| Agua | 2,5 L/día para beber y rehidratar; +0,24 L/h en EVA (valor citado por el brief) | OCHMO-TB-027 [15] |
| DCS (validación en tierra) | <4 % de probabilidad con 95 % de confianza | [V2 6008] |
| Microbiología en vuelo | Aire 1000/100 UFC/m³ (bacterias/hongos); superficie 10 000/100 UFC/100 cm²; agua 50 UFC/mL sin coliformes | ISS MORD vía OCHMO-TB-046 [10] |

### C.3 Fitness-for-duty y permissible outcome limits (Vol. 1 Rev C, sección 4) [1]

| Sistema | Valor | Requisito |
|---|---|---|
| Capacidad aeróbica, EVA en microgravedad | VO2máx en misión **≥32,9 mL/kg/min** (recomendación previa 38,7–43,8) | [V1 4001] |
| Capacidad aeróbica, EVA en superficie | VO2máx **≥36,5 mL/kg/min** | [V1 4002] |
| Capacidad aeróbica en misión | **≥80 %** del valor previo | [V1 4003] |
| Fuerza previa a la misión | Peso muerto 1,0× peso corporal (EVA microgravedad), 1,3× (superficie); press de banca 0,7× y 0,8×. Columna de "egreso sin ayuda": 1,6×/1,0× o 1,3×/0,7× (tabla desalineada en el PDF) | [V1 4023] Tabla 4.6-1 |
| Fuerza en misión | **≥80 %** de la línea base | [V1 4024] |
| Densidad mineral ósea | **≥95 %** en cadera y columna; **≥90 %** en cuello femoral | [V1 4027] |
| Nutrición | 100 % de los requerimientos calculados | [V1 4020] |
| Hematología e inmunología | "Rango normal" y fuera de "valores críticos". **Sin números** | [V1 4015–4018] |
| Sensorimotor | Límites "definidos operacionalmente". Sin números | [V1 4005–4010] |
| Conducta y cognición | "Valores clínicamente aceptados". Sin números | [V1 4011] |
| Sueño y carga de trabajo | "Límites establecidos" por programa. Sin números en el estándar. Referencia del brief: adulto 7–9 h; en vuelo ~6–6,5 h | [V1 4014]; [13] |
| Ortostatismo | En Rev C solo "medidas preventivas" [V1 3003 l]. Rev A: usar carga de líquidos y prendas de compresión. Sin umbral numérico | [1][3] |

### C.4 Listas de condiciones y niveles de atención

- **Tabla E.2-1 del Vol. 1 Rev C**: 48 condiciones con probabilidad del IMM (insomnio 13,85 por misión … absceso dental 0,068) [1].
- **Tabla E.2-2**: ~120 condiciones "de alta probabilidad o alta consecuencia" por categoría. Las marcadas con asterisco deben cubrirse en toda misión: reacción alérgica, anafilaxia, dolor de espalda, estreñimiento, cefalea (CO2 y adaptación), congestión nasal, mareo espacial, incontinencia y retención urinaria, lesión química ocular, abrasión corneal, cuerpo extraño ocular, intolerancia ortostática, diarrea, indigestión, ITU, candidiasis vaginal, celulitis, abrasión, laceración y erupción de piel, alteración neurovestibular, estrés agudo, ansiedad, alteración cognitiva, insomnio, conflicto interpersonal, alteración del ánimo [1].
- **Exploration Medical Condition List (EMCL, JSC-65722, 2009)**: 100 condiciones; base del IMM. La lista completa no se abrió (no encontrado) [41].
- **IMPACT 1.0 Condition List**: 119–120 condiciones. Simulación lunar de 203 días: 298 eventos médicos por misión; más frecuentes: polvo lunar, lesión por contacto con el traje, parestesia, alteración del sueño, barotrauma, lesión de mano, cefalea, erupción, abrasión corneal y de piel [44]. Lista completa: no encontrado en lo abierto.
- **Niveles de atención (Levels of Care)**: ya **no están en la norma vigente**; la Rev B (2022) los sustituyó por requisitos de atención médica [1]. Definición histórica (Rev A) [3]: 0 = sin riesgo percibido (entrenamiento); I = primeros auxilios (suborbital, traslado a LEO); II = diagnóstico clínico y atención ambulatoria (LEO <30 días); III = soporte vital avanzado limitado, trauma, dental limitado (más allá de LEO ≤30 días); IV = más medicación, equipo y entrenamiento (lunar/planetario 30–210 días y LEO >30 días, p. ej. ISS); V = atención autónoma con médico a bordo (>210 días). Siguen en uso: "las misiones Artemis caen en nivel III o IV" [38][39].

### C.5 Cuándo consultar al cirujano de vuelo

| Criterio público | Contenido | Fuente |
|---|---|---|
| Conferencia médica privada (PMC) | Rutinaria; frecuencia "determinada por el cirujano de vuelo" según misión corta o larga. **Sin número de días en el estándar** | [V1 6002] [1] |
| Autorización para EVA | Autorización médica de tierra antes de **cada** EVA | [V1 6006] [1] |
| Evaluaciones en vuelo | PMC, conferencia psicológica, estado de salud periódico, examen de aptitud física, exámenes pre y pos-EVA, audición, evaluación previa al aterrizaje. El cirujano informa al comandante si una condición puede afectar la misión | OCHMO-TB-044 [7] |
| Alertas de la nave | Alertar cuando presión, humedad, temperatura, ppO2 o ppCO2 salen de límites seguros | [V2 6022] [2] |
| CO2 sostenido | Si el promedio se excede varios días, el equipo de control actúa sobre los depuradores | OCHMO-TB-004 [4] |
| Checklist médico del Shuttle (JSC-48031 Rev K, 2006), 110 instrucciones "Contact Surgeon" | Ejemplos: exposición química con sibilancias o disnea; diarrea con fiebre; "sin mejoría en 24 h"; tímpano rojo abombado o perforado; ojo rojo con visión borrosa, dolor, fotofobia o pus; cuerpo extraño ocular que no sale; síntomas de DCS que no ceden con oxígeno e hidratación; dolor abdominal con rebote. Hallazgos no urgentes: "informar en la próxima PMC" | [28] |
| Umbrales numéricos de signos vitales para escalar | **No encontrado** en fuente pública NASA. Los documentos que los contendrían (MORD de ISS, flight rules médicas, ISS Medical Checklist JSC-48522) no se localizaron en abierto | — |

Recomendación para la app: usar umbrales clínicos terrestres (SpO2 ≤92 % contactar, ≤88 % urgente; fiebre ≥39,4 °C sostenida) **rotulados como no oficiales**, combinados con los límites ambientales oficiales y con la desviación respecto de la línea base del tripulante.

---

## Huecos importantes ("no encontrado")

1. Umbrales numéricos oficiales de signos vitales para llamar al cirujano de vuelo.
2. Valores críticos de hematología/inmunología que menciona [V1 4017].
3. Cartuchos i-STAT actualmente en la ISS y su lista de analitos (solo se verificó PCBA con EC8+ y CREA, 2011).
4. Valores SMAC por compuesto (JSC-20584) y límites de CO2 fuera de nominal.
5. Informes de evidencia HRP de CO2 e hipoxia: la descarga devolvió una página HTML, no el PDF.
6. Criterio numérico de "cambio significativo de umbral auditivo" de NASA.
7. Espirometría a bordo, exactitud de SLAMMD, uso de Tempus Pro dentro de la ISS, nombre "Ultrasound 2".
8. Listas completas EMCL e IMPACT; MORD de la ISS; equipo médico definido para Marte.
9. Rangos de referencia clínicos de cortisol, diferencial leucocitario y esterasa leucocitaria (no se abrió fuente).
10. Límites microbianos previos al vuelo: el brief imprime "300 UFC/100 cm³" y "50 UFC/100 cm³" para aire, unidad dudosa; no se usaron.

---

## Fuentes (todas abiertas en esta sesión)

1. NASA-STD-3001 Volumen 1, Rev C (2023). https://standards.nasa.gov/sites/default/files/standards/NASA/C//nasa-std-3001-vol-1-rev-c-signature.pdf
2. NASA-STD-3001 Volumen 2, Rev F (aprobado 2026-07-14). https://www.nasa.gov/wp-content/uploads/2025/05/nasa-std-3001-vol-2.pdf
3. NASA-STD-3001 Volumen 1, Rev A con Cambio 1 (histórico; Levels of Care, DCS, ortostatismo). https://standards.nasa.gov/sites/default/files/standards/NASA/B/Historical/NASA-STD-3001-VOL-1A-Chg1-1.pdf
4. OCHMO-TB-004 Carbon Dioxide, Rev D. https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-004-carbon-dioxide.pdf
5. Índice de OCHMO Technical Briefs. https://www.nasa.gov/ochmo/hsa-standards/ochmo-technical-briefs/
6. OCHMO-TB-033 Spaceflight Experience and Medical Care. https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-033-spaceflight-experience-medical-care.pdf
7. OCHMO-TB-044 Medical Operations. https://www.nasa.gov/wp-content/uploads/2025/08/ochmo-tb-044-medical-operations.pdf
8. OCHMO-TB-037 Decompression Sickness. https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-037-decompression-sickness.pdf
9. OCHMO-TB-035 Acoustics. https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-035-acoustics.pdf
10. OCHMO-TB-046 Microbiology, Rev A. https://www.nasa.gov/wp-content/uploads/2025/05/ochmo-tb-046-microbiology-rev-a.pdf
11. OCHMO-TB-015 Spaceflight Toxicology. https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-015-spaceflight-toxicology.pdf
12. OCHMO-TB-011 Lunar Dust. https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-011-lunar-dust-technical-brief.pdf
13. OCHMO-TB-041 Sleep Accommodations. https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-041-sleep-accommodations.pdf
14. OCHMO-TB-019 Orthostatic Intolerance. https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-019-orthostatic-intolerance.pdf
15. OCHMO-TB-027 Water. https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-027-water.pdf
16. OCHMO-TB-043 Longitudinal Health Surveillance. https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-043-longitudinal-health-surveillance.pdf
17. OCHMO-MTB-001 SANS. https://www.nasa.gov/wp-content/uploads/2024/02/ochmo-mtb-001-sans.pdf
18. OCHMO-TB-006 Health Stabilization Program. https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-006-health-stabilization-program.pdf
19. OCHMO-TB-020 Radiation Protection. https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-020-radiation-protection.pdf
20. Law J et al. 2014, CO2 y cefalea en la ISS, J Occup Environ Med 56(5):477-83 (resumen por la API de PubMed; la página web de PubMed pidió cookies). https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=24806559&rettype=abstract&retmode=text · https://pubmed.ncbi.nlm.nih.gov/24806559/
21. Crucian B et al. 2016, Incidence of clinical symptoms during long-duration orbital spaceflight, Int J Gen Med (texto completo por Europe PMC; PMC devolvió verificación de navegador). https://www.ebi.ac.uk/europepmc/webservices/rest/PMC5098747/fullTextXML · https://pmc.ncbi.nlm.nih.gov/articles/PMC5098747
22. Mehta SK et al. 2017, Latent virus reactivation in astronauts on the ISS, npj Microgravity. https://pmc.ncbi.nlm.nih.gov/articles/PMC5445581
23. Rooney BV et al. 2019, Herpes virus reactivation in astronauts during spaceflight, Front Microbiol. https://pmc.ncbi.nlm.nih.gov/articles/PMC6374706
24. Crucian B et al. 2015, Alterations in adaptive immunity persist during long-duration spaceflight, npj Microgravity. https://www.ebi.ac.uk/europepmc/webservices/rest/PMC5515498/fullTextXML
25. Stahn AC et al. 2017, Increased core body temperature in astronauts, Sci Rep. https://www.ebi.ac.uk/europepmc/webservices/rest/PMC5701078/fullTextXML
26. Stepaniak PC et al. 2007, Acute urinary retention among astronauts (resumen). https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=17511293&rettype=abstract&retmode=text
27. ISS CHeCS Medical Hardware Catalog v10.0 (2011). https://ntrs.nasa.gov/api/citations/20110022379/downloads/20110022379.pdf
28. Medical Checklist JSC-48031 Rev K (Shuttle, 2006), copia en Wayback Machine. http://web.archive.org/web/20170212012224/https://www.nasa.gov/centers/johnson/pdf/177788main_MedicalCklist.pdf
29. Spaceflight Standard Measures (Clément et al., 2020). https://ntrs.nasa.gov/api/citations/20200001281/downloads/20200001281.pdf
30. NASA, Spaceflight Standard Measures. https://www.nasa.gov/humans-in-space/spaceflight-standard-measures-characterizing-how-humans-adapt-in-space
31. NASA, CIPHER. https://www.nasa.gov/reference/cipher/
32. HemoCue WBC DIFF, resultados (HRP IWS 2022). https://ntrs.nasa.gov/api/citations/20210026808/downloads/IWS%202022%20HemoCue%20in%20IWS%20Format_January%202022.pdf · https://www.nasa.gov/feature/glenn/2021/protecting-astronaut-health-with-the-prick-of-a-finger
33. Rea DJ et al., Single Drop Cytometry Onboard the ISS (rHEALTH ONE). https://ntrs.nasa.gov/api/citations/20230012750/downloads/ISS%20rHEALTH%20Demo%20Publication%20e11.pdf
34. Gilkey KM et al. 2024, ISS Technology Demonstrations for Future Spaceflight Medical Systems. https://ntrs.nasa.gov/api/citations/20240004905/downloads/ISSRDC%20Abstract%20submission%20submit.pdf
35. CSA, Bio-Analyzer. https://asc-csa.gc.ca/eng/iss/bio-analyzer.asp
36. CSA, Bio-Monitor. https://www.asc-csa.gc.ca/eng/sciences/bio-monitor.asp
37. NASA, Artemis II crew both subjects and scientists. https://www.nasa.gov/general/artemis-ii-crew-both-subjects-and-scientists-in-nasa-deep-space-research
38. Haas C. 2024, Orion Medical System Overview. https://ntrs.nasa.gov/api/citations/20240004890/downloads/Orion%20Medical%20System%20Development.pdf
39. Haas C. 2023, Artemis Medical System Overview. https://ntrs.nasa.gov/api/citations/20230015294/downloads/ASCEND_Artemis_Med_System_Dvlpnt_Ovrvw_Final.pdf
40. Coste A, Robinette M., Effects of Long Duration Space Flight on Low Frequency Hearing (registro NTRS). https://ntrs.nasa.gov/api/citations/20240009887 · https://ntrs.nasa.gov/citations/20240009887
41. HRP Evidence Report: In-Flight Medical Conditions (2017). https://humanresearchroadmap.nasa.gov/evidence/reports/Medical.pdf
42. HRP Evidence Report: Decompression Sickness. https://humanresearchroadmap.nasa.gov/evidence/reports/DCS.pdf
43. HRP Evidence Report: Immune (consultado; no se citan cifras). https://humanresearchroadmap.nasa.gov/evidence/reports/Immune.pdf
44. Quantifying Risk on a Long Duration Lunar Mission (IMPACT). https://ntrs.nasa.gov/api/citations/20240011063/downloads/Quantifying%20Risk%20on%20a%20Long%20Duration%20Lunar%20Mission.pdf
45. MedlinePlus (rangos clínicos terrestres): (a) signos vitales https://medlineplus.gov/ency/article/002341.htm · (b) leucocitos https://medlineplus.gov/ency/article/003643.htm · (c) pulsioximetría https://medlineplus.gov/lab-tests/pulse-oximetry/ · (d) fiebre https://medlineplus.gov/ency/article/003090.htm · (e) densidad urinaria https://medlineplus.gov/ency/article/003587.htm · (f) pH urinario https://medlineplus.gov/ency/article/003583.htm · (g) PCR https://medlineplus.gov/lab-tests/c-reactive-protein-crp-test/ · (h) urinálisis https://medlineplus.gov/ency/article/003579.htm
46. NASA, Ultrasound scans in space. https://www.nasa.gov/missions/station/ultrasound-scans-in-space-transform-medicine-on-earth/
47. ESA, Telemedicine via satellite improves care at astronaut landings (Tempus Pro). https://www.esa.int/Applications/Connectivity_and_Secure_Communications/Telemedicine_via_satellite_improves_care_at_astronaut_landings

Fuentes que fallaron: `humanresearchroadmap.nasa.gov/evidence/reports/CO2.pdf` y `.../Hypoxia.pdf` (devolvieron HTML); la página antigua de Tempus Pro en esa.int (404); la copia UNT del checklist (HTML, se usó Wayback).
