# Mis 78 variables con las tablas de clasificación de Julio

Generado por `ingesta/src/clasificacion.ts` (no transcrito a mano). Usa el **origen** y la
**escalera de obtención** de `../Julio/listado-77-variables.md` y `../Julio/checklist-G1-G6.md`,
y los **grupos G1–G9** de `../Julio/mis-variables-agrupadas.md`. Añade mi tipo A/B/C y qué
entrega el **HUAWEI WATCH 5** (`reloj-huawei-watch5.md`).

✅ verificado · ⚠️ no confirmado · 🔶 decisión nuestra

## Resumen

| Origen | Nivel | Nº |
|---|---|---:|
| ⌚ Reloj | N0 | 10 |
| 🧮 Cálculo | N0 | 2 |
| 🧠 Modelo | N1 | 2 |
| 🛰️ Nave | NT | 4 |
| 🩺 CMO | N3 | 8 |
| ✍️ Input | N2 | 27 |
| ⟶ Fusionada | — | 1 |
| 🔴 No a bordo | N4 | 21 |
| ❌ Descartada | — | 3 |

| Grupo | Ruta | Nº |
|---|---|---:|
| G1 | Wearable continuo | 10 |
| G3 | Pruebas funcionales y medición puntual | 33 |
| G4 | Escalas individuales | 6 |
| G5 | Riesgo de licencia | 4 |
| G6 | Telemetría de la nave | 4 |
| G7 | Ultrasonido e imagen | 7 |
| G8 | Laboratorio | 7 |
| G9 | Derivadas | 4 |
| — | Sin grupo (descartada o fusionada) | 3 |

| HUAWEI WATCH 5 | Nº |
|---|---:|
| en vivo (BLE) | 2 |
| exportación Huawei Health ⚠️ | 6 |
| no lo da | 68 |
| cálculo sobre exportación ⚠️ | 2 |

## Listado

| Nº | ID | Variable | Tipo | Origen | Nivel | Grupo | WATCH 5 | Nota |
|---:|---|---|---|---|---|---|---|---|
| 1 | `02:V52` | Frecuencia cardiaca en ejercicio submáximo estandarizado (etapas de 5 min al 25/50/75 % del VO2pico previo) | A | ⌚ Reloj | N0 | G1 | en vivo (BLE) | FC por etapa; las etapas las marca el CEVIS |
| 2 | `02:V53` | Intensidad de las sesiones aeróbicas (FC media y pico; % del tiempo >70 % y >90 % de FC pico) | A | ⌚ Reloj | N0 | G1 | en vivo (BLE) |  |
| 3 | `02:V56` | Tiempo total de ejercicio | A | ⌚ Reloj | N0 | G1 | exportación Huawei Health ⚠️ | Registro de entrenamientos del reloj |
| 4 | `02:V92` | Glucosa intersticial continua (CGM): media, tiempo en rango, variabilidad | A | ⌚ Reloj | N0 | G1 | no lo da | Parche CGM aparte: ningún reloj de consumo mide glucosa |
| 5 | `03:V30` | Tiempo total de sueño (actigrafía) | A | ⌚ Reloj | N0 | G1 | exportación Huawei Health ⚠️ | TruSleep™ (algoritmo propietario) |
| 6 | `03:V31` | Porcentaje de noches con <6 h | A | 🧮 Cálculo | N0 | G9 | cálculo sobre exportación ⚠️ |  |
| 7 | `03:V33` | Tiempo en cama frente a oportunidad de sueño | A | ⌚ Reloj | N0 | G1 | exportación Huawei Health ⚠️ | TruSleep™ |
| 8 | `03:V34` | Eficiencia del sueño | A | ⌚ Reloj | N0 | G1 | exportación Huawei Health ⚠️ | TruSleep™ |
| 9 | `03:V35` | Latencia de sueño | A | ⌚ Reloj | N0 | G1 | exportación Huawei Health ⚠️ | TruSleep™ |
| 10 | `03:V36` | Vigilia tras inicio del sueño (WASO) y número y causa de despertares | A | ⌚ Reloj | N0 | G1 | exportación Huawei Health ⚠️ | TruSleep™ |
| 11 | `03:V43` | Deuda de sueño (rebote al volver) | A | 🧮 Cálculo | N0 | G9 | cálculo sobre exportación ⚠️ |  |
| 12 | `03:V49` | Luz ambiental (iluminancia) | A | ⌚ Reloj | N0 | G1 | no lo da | El reloj tiene sensor de luz, pero no se encontró cómo exportar lux ⚠️ |
| 13 | `02:V43` | Fuerza máxima en peso muerto y press de banca | B | 🧠 Modelo | N1 | G9 | no lo da | Epley sobre cargas del ARED |
| 14 | `02:V44` | Carga, repeticiones y volumen por ejercicio en ARED | B | 🛰️ Nave | NT | G6 | no lo da | ARED |
| 15 | `02:V47` | Ultrasonido muscular (área de sección panorámica o grosor de cuádriceps y gastrocnemio) | B | 🩺 CMO | N3 | G7 | no lo da | Ultrasonido por el CMO + modelo DeepACSA (N1) |
| 16 | `02:V51` | VO2pico / VO2máx | B | 🧠 Modelo | N1 | G9 | no lo da | Extrapolación FC–VO₂ y Uth; la FC puede venir del reloj |
| 17 | `02:V54` | Carga y duración en cicloergómetro (CEVIS) | B | 🛰️ Nave | NT | G6 | no lo da | CEVIS |
| 18 | `02:V55` | Velocidad, carga del arnés y duración en cinta (T2) | B | 🛰️ Nave | NT | G6 | no lo da | T2 |
| 19 | `02:V73` | Control motor fino (tiempo de tarea de destreza) | B | ✍️ Input | N2 | G3 | no lo da | Prueba cronometrada en la app |
| 20 | `02:V75` | Masa corporal | ⟶ | ⟶ Fusionada | — | — | no lo da | FUSIONADA en 01:V8 (masa corporal, de Julio). Decisión de Leo 14-11-2026 |
| 21 | `02:V79` | Ingesta de hierro | B | ✍️ Input | N2 | G3 | no lo da | Registro de comida + API USDA |
| 22 | `02:V81` | Ingesta energética | B | ✍️ Input | N2 | G3 | no lo da | Registro de comida + API USDA |
| 23 | `02:V82` | Ingesta de proteína | B | ✍️ Input | N2 | G3 | no lo da | Registro de comida + API USDA |
| 24 | `02:V83` | Ingesta de sodio | B | ✍️ Input | N2 | G3 | no lo da | Registro de comida + API USDA |
| 25 | `02:V84` | Ingesta de calcio | B | ✍️ Input | N2 | G3 | no lo da | Registro de comida + API USDA |
| 26 | `02:V93` | Ingesta de carbohidratos y azúcares añadidos | B | ✍️ Input | N2 | G3 | no lo da | Registro de comida + API USDA |
| 27 | `02:V40` | Fuerza isocinética de rodilla (extensión/flexión, 60°/s) | C | 🔴 No a bordo | N4 | G3 | no lo da | Dinamómetro isocinético |
| 28 | `02:V41` | Resistencia muscular isocinética (trabajo total, 20 rep a 180°/s) | C | 🔴 No a bordo | N4 | G3 | no lo da | Dinamómetro isocinético |
| 29 | `02:V42` | Fuerza y potencia de pantorrilla (flexores plantares) | C | 🔴 No a bordo | N4 | G3 | no lo da | Dinamómetro |
| 30 | `02:V45` | Fuerza de agarre (dinamometría manual) | C | 🔴 No a bordo | N4 | G3 | no lo da | Dinamómetro de agarre (en vuelo no verificado ⚠️) |
| 31 | `02:V46` | Volumen o área de sección muscular por RM | C | 🔴 No a bordo | N4 | G7 | no lo da | Resonancia magnética |
| 32 | `02:V50` | Masa magra y masa grasa (DXA de cuerpo entero) | C | 🔴 No a bordo | N4 | G7 | no lo da | DXA |
| 33 | `02:V63` | Área funcional de musculatura paraespinal (multífido, erectores) | C | 🔴 No a bordo | N4 | G7 | no lo da | Resonancia magnética |
| 34 | `02:V66` | Lordosis lumbar y rango de flexo-extensión | C | 🔴 No a bordo | N4 | G7 | no lo da | Imagen de columna |
| 35 | `02:V67b` | Susceptibilidad previa al mareo | C | 🔴 No a bordo | N4 | G5 | no lo da | MSSQ prevuelo; licencia no verificada ⚠️ |
| 36 | `02:V68b` | Síntomas tras el aterrizaje (vértigo, náusea, vómito, inestabilidad) | C | 🔴 No a bordo | N4 | G3 | no lo da | Síntomas tras aterrizar |
| 37 | `02:V69` | Posturografía dinámica computarizada (puntuación de equilibrio continuo, cEQ) | C | 🔴 No a bordo | N4 | G3 | no lo da | Plataforma de posturografía |
| 38 | `02:V70` | Marcha en tándem (talón-punta, ojos abiertos/cerrados) | C | 🔴 No a bordo | N4 | G3 | no lo da | Solo con gravedad |
| 39 | `02:V71` | Romberg y Romberg sensibilizado (tándem estático) | C | 🔴 No a bordo | N4 | G3 | no lo da | Solo con gravedad |
| 40 | `02:V72` | Tiempo en tareas funcionales (salida del asiento y marcha con obstáculos, recuperación de caída, salto, escalera) | C | 🔴 No a bordo | N4 | G3 | no lo da | Functional Task Test |
| 41 | `02:V76` | 25-OH vitamina D sérica | C | 🔴 No a bordo | N4 | G8 | no lo da | Muestra congelada, análisis en Tierra |
| 42 | `02:V78` | Ferritina sérica | C | 🔴 No a bordo | N4 | G8 | no lo da | Muestra congelada, análisis en Tierra |
| 43 | `02:V80` | Folato sérico y eritrocitario | C | 🔴 No a bordo | N4 | G8 | no lo da | Muestra congelada, análisis en Tierra |
| 44 | `02:V87` | Glucosa a las 2 h de sobrecarga oral (OGTT) | C | 🔴 No a bordo | N4 | G8 | no lo da | OGTT |
| 45 | `02:V89` | HbA1c | C | 🔴 No a bordo | N4 | G8 | no lo da | HbA1c |
| 46 | `02:V90` | Insulina en ayunas e índice de resistencia a la insulina | C | 🔴 No a bordo | N4 | G8 | no lo da | Muestra congelada, análisis en Tierra |
| 47 | `02:V91` | Péptido C urinario | C | 🔴 No a bordo | N4 | G8 | no lo da | Orina de 24 h congelada |
| 48 | `02:V49` | Tono, rigidez y elasticidad muscular en reposo | C | 🩺 CMO | N3 | G3 | no lo da | MyotonPRO (experimento ESA) |
| 49 | `02:V64` | Altura y ángulo del disco intervertebral; desecación; osteofitos | C | 🩺 CMO | N3 | G7 | no lo da | Ultrasonido de columna |
| 50 | `02:V65` | Síntomas radiculares (dolor irradiado, parestesias, debilidad) cervicales o lumbares | C | 🩺 CMO | N3 | G3 | no lo da | Exploración neurológica |
| 51 | `02:V86` | Glucosa plasmática en ayunas | C | 🩺 CMO | N3 | G3 | no lo da | Glucómetro capilar (a bordo no confirmado ⚠️) |
| 52 | `02:V88` | Glucosa al azar con síntomas | C | 🩺 CMO | N3 | G3 | no lo da | Glucómetro capilar (a bordo no confirmado ⚠️) |
| 53 | `02:V96` | Delaminación ungueal (onicólisis) y lesiones de la mano por el guante | C | 🩺 CMO | N3 | G7 | no lo da | Inspección + foto |
| 54 | `02:V97` | Dolor de hombro relacionado con el traje (intensidad, limitación de movimiento) | C | 🩺 CMO | N3 | G4 | no lo da | NRS + exploración del hombro |
| 55 | `02:V48` | Perímetros de extremidades (segmentos de 3 cm → volumen) | C | ✍️ Input | N2 | G3 | no lo da | Cinta métrica |
| 56 | `02:V57` | Autoevaluación periódica de forma física | C | ✍️ Input | N2 | G4 | no lo da |  |
| 57 | `02:V58` | Dolor de espalda: presencia e intensidad | C | ✍️ Input | N2 | G4 | no lo da | NRS 0–10 |
| 58 | `02:V59` | Localización, día de inicio y duración del dolor | C | ✍️ Input | N2 | G3 | no lo da |  |
| 59 | `02:V60` | Respuesta al tratamiento | C | ✍️ Input | N2 | G3 | no lo da |  |
| 60 | `02:V61` | Estatura de pie | C | ✍️ Input | N2 | G3 | no lo da | Cinta (equipo en vuelo no encontrado ⚠️) |
| 61 | `02:V62` | Talla sentado | C | ✍️ Input | N2 | G3 | no lo da | Cinta |
| 62 | `02:V67a` | Síntomas de mareo espacial (náusea, vómito, palidez, sudor frío, malestar, pérdida de apetito, fatiga) | C | ✍️ Input | N2 | G3 | no lo da | Lista de síntomas |
| 63 | `02:V68a` | Uso y respuesta a medicación antimareo | C | ✍️ Input | N2 | G3 | no lo da |  |
| 64 | `02:V74` | Ilusiones y desorientación espacial; agudeza visual dinámica | C | ✍️ Input | N2 | G3 | no lo da |  |
| 65 | `02:V77` | Ingesta y adherencia al suplemento de vitamina D | C | ✍️ Input | N2 | G3 | no lo da |  |
| 66 | `02:V85` | Apetito y saciedad | C | ✍️ Input | N2 | G4 | no lo da |  |
| 67 | `02:V94` | Registro de lesión musculoesquelética (localización, tipo, mecanismo, actividad) | C | ✍️ Input | N2 | G3 | no lo da |  |
| 68 | `02:V95` | Síntomas por región tras una sesión con traje (mano, hombro, pie, brazo, pierna, cuello, tronco) | C | ✍️ Input | N2 | G3 | no lo da |  |
| 69 | `03:V32` | Tiempo total de sueño (diario) | C | ✍️ Input | N2 | G3 | no lo da | Diario de sueño |
| 70 | `03:V37` | Calidad subjetiva del sueño | C | ✍️ Input | N2 | G4 | no lo da |  |
| 71 | `03:V38` | PSQI | C | ✍️ Input | N2 | G5 | no lo da | PSQI: solo uso no comercial |
| 72 | `03:V39` | ISI (gravedad del insomnio) | C | ✍️ Input | N2 | G5 | no lo da | ISI: licencia no verificada ⚠️ |
| 73 | `03:V50` | Espectro y ajuste de iluminación | C | 🛰️ Nave | NT | G6 | no lo da | Modo de iluminación de cabina |
| 74 | `03:V82` | Episodio de cefalea (sí/no, fecha, duración) | C | ✍️ Input | N2 | G3 | no lo da |  |
| 75 | `03:V83` | Intensidad de la cefalea | C | ✍️ Input | N2 | G4 | no lo da |  |
| 76 | `03:V40` | Epworth (somnolencia diurna) | ❌ | ❌ Descartada | — | G5 | no lo da | Epworth: requiere licencia; la KSS de Julio la cubre |
| 77 | `03:V41` | Arquitectura del sueño (polisomnografía) | ❌ | ❌ Descartada | — | — | no lo da | Polisomnografía: sin equipo operativo a bordo |
| 78 | `03:V42` | Presión de sueño en vigilia (EEG) | ❌ | ❌ Descartada | — | — | no lo da | EEG: sin equipo operativo a bordo |
