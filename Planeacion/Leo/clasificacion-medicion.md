# Dónde y cómo se mide cada variable — clasificación de viabilidad

Mis 78 variables, clasificadas por **quién o qué puede medirlas**, con la fuente que lo respalda.
Las fuentes se verificaron con `npm run fuentes` (ingesta/out/fuentes-verificadas.json):
**53 de 54 abren**, y en cada DOI el título real coincide con el trabajo citado (Crossref/PubMed).

✅ fuente verificada · ⚠️ dato no confirmado en fuente abierta (se dice explícitamente) · 🔶 criterio nuestro

## Categorías

| Código | Significado | Cuántas |
|---|---|---:|
| 🛰️ **NAVE-AUTO** | Un equipo o wearable a bordo lo registra solo | 19 |
| 👩‍⚕️ **NAVE-CMO** | A bordo, pero lo hace el oficial médico de la tripulación (CMO) con equipo médico | 7 |
| ✍️ **NAVE-REPORTE** | A bordo; el astronauta lo reporta en la app (cuestionario, diario, foto) | 27 |
| 🧪 **MUESTRA→TIERRA** | La muestra se toma a bordo, se congela y se analiza al regresar | 5 |
| 🌍 **TIERRA** | Solo antes o después del vuelo, con equipo que no hay en la nave | 16 |
| ❌ **DESCARTADA** | Inviable para el prototipo (sin equipo operativo, licencia, o sin fundamento) | 3 |
| ⟶ **FUSIONADA** | `02:V75` masa corporal → `01:V8` de Julio (14-11-2026) | 1 |

Total 78. Referencias: `02[n]` = lista de fuentes del catálogo 02; `03[n]` = del catálogo 03.

---

## ❌ Descartadas (3)

| ID | Variable | Por qué |
|---|---|---|
| 03:V40 | Escala de somnolencia de Epworth | Requiere licencia aunque sea gratuita ✅ 03[32]. La KSS (escala de Julio) cubre la somnolencia sin licencia |
| 03:V41 | Arquitectura del sueño (polisomnografía) | Solo se hizo como investigación en STS-90/95 con n=5 ✅ 03[13]; no hay polisomnógrafo operativo a bordo |
| 03:V42 | Presión de sueño por EEG (theta) | Estudio de investigación con n=5 ✅ 03[23]; no hay EEG operativo a bordo |

## 🛰️ NAVE-AUTO (19)

`02:V75` masa corporal (SLAMMD/BMMD) se **fusionó en `01:V8`** de Julio; su contenido está allí.

| ID | Variable | Equipo | Fuente |
|---|---|---|---|
| 02:V43 | Fuerza máxima (inferida en vuelo) | 1RM medido en Tierra; en vuelo se infiere de las cargas del ARED | ✅ 02[3] |
| 02:V44 | Carga y volumen en ARED | ARED registra y transmite | ✅ 02[1][2] |
| 02:V51 | VO₂máx (estimado) | CEVIS + FC; la medición directa con analizador de gases es solo investigación | ✅ 02[8] |
| 02:V52 | FC submáxima estandarizada | CEVIS + Bio-Monitor | ✅ 02[8][27] |
| 02:V53 | Intensidad de sesión | Monitor de FC en CEVIS y T2 | ✅ 02[2] |
| 02:V54 | Carga en CEVIS | CEVIS | ✅ 02[2][8] |
| 02:V55 | Velocidad y arnés en T2 | T2 (COLBERT) | ✅ 02[1][2] |
| 02:V56 | Minutos de ejercicio | Registro de sesiones de equipo y wearable | ✅ 02[15][22] |
| 02:V92 | Glucosa continua | CGM comercial, primera vez en la ISS en Ax-4 (2025) | ✅ 02[50][52] |
| 03:V30 | Sueño total | Actígrafo de muñeca | ✅ 03[1] |
| 03:V31 | % de noches < 6 h | Cálculo sobre el actígrafo | ✅ 03[1] |
| 03:V33 | Tiempo en cama | Actígrafo / diario | ✅ 03[1] |
| 03:V34 | Eficiencia | Actígrafo | ✅ 03[1] |
| 03:V35 | Latencia | Actígrafo / diario | ✅ 03[1] |
| 03:V36 | WASO | Actígrafo / diario | ✅ 03[1] |
| 03:V43 | Deuda de sueño | Cálculo sobre el actígrafo | ✅ 03[4] |
| 03:V49 | Luz (lux) | Fotómetro del actígrafo | ✅ 03[4][9] |
| 03:V50 | Modo de iluminación | Sistema de iluminación de la cabina | ✅ 03[2][9] |
| 02:V49 | Tono muscular | MyotonPRO, llevado a la ISS como experimento de ESA (no es equipo operativo) | ✅ 02[28] |

## 👩‍⚕️ NAVE-CMO (7)

| ID | Variable | Qué hace el CMO | Fuente |
|---|---|---|---|
| 02:V47 | Ultrasonido muscular | Ultrasonido guiado desde Tierra | ✅ 02[2]; validez vs. RM ✅ 02[38] |
| 02:V64 | Disco intervertebral | Ultrasonido de columna en vuelo (n=7) | ✅ 02[20] |
| 02:V65 | Síntomas radiculares | Exploración neurológica + autoinforme | ✅ 02[20][31] |
| 02:V97 | Dolor de hombro por el traje | Exploración del rango de movimiento + autoinforme | ✅ 02[10] |
| 02:V86 | Glucosa en ayunas | Glucómetro de punción digital | ⚠️ **No encontré en fuente abierta que la ISS lleve glucómetro.** Ax-4 validó "varios métodos" sin nombrarlos ✅ 02[50]. Viable solo si se incluye uno en el botiquín |
| 02:V88 | Glucosa al azar con síntomas | Igual que V86 | ⚠️ Igual que V86 |
| 02:V96 | Uñas y manos tras EVA | Inspección + foto | ✅ 02[10] |

## ✍️ NAVE-REPORTE (27)

| ID | Variable | Fuente |
|---|---|---|
| 02:V48 | Perímetros de extremidades (cinta, usado en Skylab) | ✅ 02[7] |
| 02:V57 | Autoevaluación de forma física | ✅ 02[15] |
| 02:V58 | Dolor de espalda | ✅ 02[20][30] |
| 02:V59 | Localización y duración del dolor | ✅ 02[30] |
| 02:V60 | Respuesta al tratamiento | ✅ 02[20][30] |
| 02:V61 | Estatura | ✅ 02[14][20][37] · ⚠️ **equipo de medición en vuelo no encontrado** |
| 02:V62 | Talla sentado (medida en vuelo en Shuttle e ISS) | ✅ 02[25] |
| 02:V67a | Síntomas de mareo espacial | ✅ 02[9][16][18][39] |
| 02:V68a | Medicación antimareo | ✅ 02[9] |
| 02:V73 | Destreza fina (prueba en tableta) | ✅ 02[21] |
| 02:V74 | Ilusiones y desorientación (la parte de agudeza visual dinámica es solo en Tierra) | ✅ 02[9] |
| 02:V77 | Suplemento de vitamina D | ✅ 02[1][5] |
| 02:V79 | Hierro ingerido | ✅ 02[5][12] |
| 02:V81 | Energía ingerida (app ISS FIT) | ✅ 02[3][5][12][29] |
| 02:V82 | Proteína | ✅ 02[5][12] |
| 02:V83 | Sodio | ✅ 02[5][12] |
| 02:V84 | Calcio | ✅ 02[5][12] |
| 02:V85 | Apetito | ✅ 02[5] |
| 02:V93 | Carbohidratos y azúcares | ✅ 02[5][12] |
| 02:V94 | Registro de lesiones | ✅ 02[53] |
| 02:V95 | Síntomas tras sesión con traje | ✅ 02[10] |
| 03:V32 | Sueño por diario | ✅ 03[1][11] |
| 03:V37 | Calidad subjetiva del sueño | ✅ 03[1][12] |
| 03:V38 | PSQI (licencia: solo uso no comercial) | ✅ 03[29] · en astronautas solo se ha aplicado en Tierra |
| 03:V39 | ISI | ✅ 03[28] · ⚠️ condiciones de licencia no verificadas |
| 03:V82 | Episodio de cefalea | ✅ 03[44][45] |
| 03:V83 | Intensidad de la cefalea | ✅ 03[44][45] |

## 🧪 MUESTRA→TIERRA (5)

En la ISS la sangre y la orina se recogen, se congelan y se analizan al regresar ✅ 02[5][6].
No sirven para alertas en tiempo real.

| ID | Variable | Fuente |
|---|---|---|
| 02:V76 | Vitamina D sérica | ✅ 02[1][5][32] |
| 02:V78 | Ferritina | ✅ 02[5][46b] |
| 02:V80 | Folato | ✅ 02[5][48] |
| 02:V90 | Insulina y resistencia a la insulina | ✅ 02[5][51] |
| 02:V91 | Péptido C urinario | ✅ 02[5] |

## 🌍 TIERRA (16)

| ID | Variable | Por qué solo en Tierra | Fuente |
|---|---|---|---|
| 02:V40 | Fuerza isocinética de rodilla | Dinamómetro isocinético | ✅ 02[7] |
| 02:V41 | Resistencia isocinética | Dinamómetro isocinético | ✅ 02[7] |
| 02:V42 | Fuerza de pantorrilla | Dinamómetro | ✅ 02[7][34] |
| 02:V45 | Fuerza de agarre | Medida pre/posvuelo ✅ 02[7]. ⚠️ **El dinamómetro en vuelo de ESA viene de un buscador; no hay fuente primaria abierta** | 02[7] |
| 02:V46 | Volumen muscular por RM | Resonancia magnética | ✅ 02[7][34] |
| 02:V50 | Masa magra y grasa | DXA de cuerpo entero | ✅ 02[22][32] |
| 02:V63 | Músculo paraespinal | RM pre/posvuelo | ✅ 02[37] |
| 02:V66 | Lordosis lumbar | En vuelo: no encontrado | ✅ 02[20] |
| 02:V67b | Susceptibilidad al mareo (MSSQ) | Cuestionario prevuelo | ✅ 02[40] |
| 02:V68b | Síntomas tras el aterrizaje | Posvuelo | ✅ 02[9] |
| 02:V69 | Posturografía | Plataforma de fuerza | ✅ 02[21] |
| 02:V70 | Marcha en tándem | 🔶 Sin gravedad no hay equilibrio que medir: solo tiene sentido posvuelo o en superficie planetaria | ✅ 02[21] |
| 02:V71 | Romberg | 🔶 Igual que V70 | ✅ 02[9][21] |
| 02:V72 | Pruebas funcionales (egreso, caída, escaleras) | Functional Task Test, posvuelo | ✅ 02[9][18][21] |
| 02:V87 | Sobrecarga oral de glucosa (OGTT) | Solo investigación | ✅ 02[5] |
| 02:V89 | HbA1c | No se encontró método en vuelo | ✅ 02[49] |

---

## Fuentes que no se pudieron verificar

| Ref | Qué es | Situación |
|---|---|---|
| 03[10] | NASA-STD-3001 Vol. 1 Rev C (copia local de otro agente) | Sin URL. El mismo estándar sí está verificado como 02[3] |

Nota: Europe PMC rechaza las peticiones de scripts (HTTP 403), pero en esas referencias el DOI
resuelve y su título coincide; se cuentan como verificadas.
