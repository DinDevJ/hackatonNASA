# 07 · Diccionario de datos y especificación de variables

**Convenciones**

- Identificadores `NN:Xn`: catálogo de investigación del equipo.
  - Prefijo `01:` cardiovascular / hematológico.
  - Prefijo `02:` músculo-esquelético, renal y nutrición.
  - Prefijo `03:` sueño, cognición y conducta.
  - Prefijo `04:` signos vitales, ambiente y síntomas.
- `X:`: variable añadida por el equipo.
- **[T]**: umbral clínico terrestre, no validado en microgravedad. **[A]**: validado en astronautas o de NASA.
- Los valores que no están en las fuentes se marcan **no encontrado**. Aquí no se infieren rangos ni unidades.

## 1. Variables que evalúa el backend

Fuentes: [`semillas/inicial.json`](../Sistema/backend/semillas/inicial.json) (variables, esquemas, priores) y [`semillas/medibles.json`](../Sistema/backend/semillas/medibles.json) (referencias y umbrales).

| ID | Nombre | Unidad | Tipo en la trama | Procedencia | Fuente de adquisición |
|---|---|---|---|---|---|
| `04:A4` | Frecuencia cardiaca (instantánea) | lpm | `u8` | sensor | Playera ECG / reloj PPG (en el simulador, `reloj-ana` envía cada 5 s) |
| `04:A3` | SpO₂ | % | `u8` | sensor | Reloj PPG rojo/infrarrojo |
| `04:A2` | Frecuencia respiratoria | resp/min | `u8` | sensor | Banda torácica de la playera |
| `04:A1` | Temperatura corporal | °C | `i16`, factor 0,01 | sensor | Termómetro axilar de la playera |
| `01:V1` | Presión sistólica | mmHg | `u8` | sensor | Brazalete oscilométrico, en cada toma |
| `X:PAD` | Presión diastólica | mmHg | `u8` | sensor | Brazalete, en cada toma |
| `X:PAM` | Presión arterial media | mmHg | virtual | derivada | Calculada con cada toma: `round((sis + 2 * dia) / 3 * 10) / 10` |

### 1.1 Umbrales absolutos configurados

| Variable | Ámbar | Rojo | Tipo | Fuente |
|---|---|---|---|---|
| FC | > 100 lpm | no encontrado | [T] | MedlinePlus; HRS 2015 |
| SpO₂ | < 92 % | < 88 % | [T], propuesta no oficial | MedlinePlus |
| FR | > 18 resp/min | no encontrado | [T] | MedlinePlus (12–18/min) |
| Temperatura | > 39,4 °C | > 40,6 °C | [T], propuesta no oficial | MedlinePlus (valores orales) |
| Sistólica | < 90 o > 140 mmHg | < 70 **[A]** o > 180 mmHg | [T] | ACC/AHA vía CDC; < 70 = presíncope, prueba ortostática |
| Diastólica | < 60 o > 90 mmHg | > 120 mmHg | [T] | Ídem |
| PAM | — | — | — | Sin umbral en el catálogo |

> El catálogo da criterios inclusivos («≤ 92 %», «≥ 140»), pero el sistema compara de forma estricta (`<`, `>`). Un valor igual al límite no dispara. Es una diferencia semántica pendiente de resolver.

Bordes del catálogo que **no** se usan como alerta, porque saltarían con valores normales: FC < 60, FR < 12, temperatura < 36,5 °C y presión «elevada» o en estadio 1.

### 1.2 Basales de arranque (sintéticos)

| Tripulante ficticio | Rol | FC | SpO₂ | FR | Temp. | Sis. | Dia. | PAM |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| `tomas` Tomás | comandante | 58 | 98 | 13 | 36,6 | 122 | 78 | 92,7 |
| `ana` Ana | especialista | 62 | 98 | 14 | 36,6 | 115 | 75 | 88,3 |
| `mei` Mei | CMO | 60 | 98 | 14 | 36,7 | 118 | 76 | 90,0 |
| `luis` Luis | ingeniero | 64 | 97 | 15 | 36,5 | 125 | 80 | 95,0 |

### 1.3 Priores de órbita sembrados

Están todos marcados como provisionales.

| Variable | Escala | μ₀ | τ₀ | σ_misión | σ_día | Procedencia |
|---|---|---:|---:|---:|---:|---|
| FC | relativa | 0 | 0,10 | 0,03 | 0,04 | No informativo; dispersión supuesta |
| SpO₂ | relativa | 0 | 0,02 | 0,01 | 0,01 | No informativo |
| FR | relativa | 0 | 0,10 | 0,05 | 0,08 | El catálogo dice que disminuye (n = 8), sin magnitud |
| Temperatura | absoluta | +1,0 °C | 0,40 | 0,20 | 0,25 | +~1 °C **central** (n = 11, Stahn 2017); se aplica a un sensor axilar |
| Sistólica | relativa | −0,067 | 0,05 | 0,03 | 0,05 | −8 mmHg / 120 (n = 8) |
| Diastólica | relativa | −0,1125 | 0,05 | 0,03 | 0,05 | −9 mmHg / 80 (n = 8) |
| PAM | relativa | −0,093 | 0,05 | 0,03 | 0,05 | Derivada; el catálogo da −10 ± 3 mmHg directo (discrepancia) |

## 2. Indicadores de la maqueta de las interfaces

Fuente: [`Sistema/interfaces/eva/motor.js`](../Sistema/interfaces/eva/motor.js). Los valores son de un escenario con semilla fija y no son fisiológicos.

| Indicador | ID | Unidad | Captura en el escenario | Nota |
|---|---|---|---|---|
| Sueño | `03:V30` | h | Actigrafía simulada | — |
| Reflejos PVT-B | `03:V66` | lapsos | Prueba de 3 min; un lapso es una respuesta > 355 ms | — |
| Ánimo/estrés | `03:V9` | escala 0–100 | Check-in | La CMO solo ve la tendencia |
| Pulso en reposo | `01:V3` | lpm | Mediana de los 30 min más bajos del sueño | Distinto de `04:A4` |
| HRV | `03:V17` | ms | RMSSD nocturno | El reloj del equipo no envía intervalos RR |
| Presión arterial | `01:V1` | mmHg | Manual | Referencia AHA [T] |
| SpO₂ | `04:A3` | % | PPG | ≤ 92 % atención, ≤ 88 % urgente |
| Respiración | `04:A2` | rpm | Serie estimada | — |
| Glucosa en ayunas | `02:V86` | mg/dL | Glucómetro, cada 2 días | Cortes ADA [T] |
| Temperatura de piel | `04:A1` | °C | Sensor de piel | No equivale a la central ni a la axilar |

## 3. Predictores de la matriz de pesos (11 malestares)

| Predictor | ID citado | Nota |
|---|---|---|
| `fc_reposo` | `04:A4` / `01:V3` | Instantánea y reposo son conceptos distintos |
| `spo2` | `04:A3` | — |
| `respiracion` | `04:A2` | — |
| `temperatura` | `04:A1` | Sitio de medición sin resolver |
| `presion_arterial` | `01:V1` | Sin medición ortostática diaria |
| `sueno` | `03:V30` | — |
| `pvt_lapsos` | `03:V66` | — |
| `co2_cabina` | `04:A23` | Lectura del escenario, no telemetría |
| `sintomas` | `02:V67a`, `03:V82`, `04:A40–A50` | Aún no llegan al índice vivo |

Los 11 malestares son: arritmia/FA · desacondicionamiento ortostático · hipoxia · infección/fiebre · sueño/circadiano · fatiga/cognición · CO₂/cefalea · radiación aguda · estrés · descompresión tras EVA · trombosis yugular y SANS (estos dos juntos).

## 4. Padecimientos y ligas del motor (P01–P20)

Fuentes: [`prototipo-salud/datos/modelo/PADECIMIENTOS.csv`](../prototipo-salud/datos/modelo/PADECIMIENTOS.csv) (20 filas) y [`PADECIMIENTO-VARIABLE.csv`](../prototipo-salud/datos/modelo/PADECIMIENTO-VARIABLE.csv) (350 ligas; A = 9, B = 31, C = 310).

| ID | Padecimiento | Variables | Las de mayor peso (peso y nivel) |
|---|---|---:|---|
| P01 | Arritmia / fibrilación auricular | 15 | `01:V31` ritmo/FA (3A) · `01:V33` extrasístoles ventriculares (3C) · `01:V45` palpitaciones/síncope (2B) |
| P02 | Desacondicionamiento e intolerancia ortostática | 18 | `01:V47` caída de PA al ponerse de pie (3A) · `01:V48` aumento de FC al ponerse de pie (2B) |
| P03 | Hipoxia / problema respiratorio | 8 | `04:A3` SpO₂ (3A) · `04:A2` FR (3B) · `04:A25` PIO₂ (3C) |
| P04 | Infección, fiebre o desregulación inmune | 25 | `04:A1` temperatura (3B) · `01:V3` FC en reposo (2A) |
| P05 | Pérdida de sueño y desalineación circadiana | 31 | `03:V30` sueño por actigrafía (3B) |
| P06 | Fatiga y deterioro cognitivo | 31 | `03:V66` lapsos PVT-B (3A) · `03:V68` Cognition (3B) |
| P07 | Exposición a CO₂ / cefalea | 14 | `04:A23` ppCO₂ (3A) · `03:V82` cefalea (3A) |
| P08 | Radiación aguda por evento solar | 16 | `01:V98` linfocitos (3B) · `01:V93` dosis por evento (3C) |
| P09 | Estrés / salud conductual | 29 | `03:V1` PHQ-9 (3A) |
| P10 | Enfermedad por descompresión tras EVA | 10 | `04:A36`/`04:A37` síntomas DCS (3C) |
| P11 | Trombosis yugular | 16 | `01:V58`, `01:V54`, `01:V55` (3B) |
| P12 | SANS / presión intracraneal | 25 | `01:V86` síntomas visuales (3B) |
| P13 | Cálculos renales y deshidratación | 26 | `02:V37` cólico renal (3B) |
| P14 | Pérdida de densidad ósea | 20 | `02:V01` DMO por DXA (3C) |
| P15 | Atrofia muscular / capacidad aeróbica | 19 | `02:V51` VO₂pico (3C) |
| P16 | Mareo espacial | 5 | `02:V67a` síntomas (3C) |
| P17 | Anemia espacial | 12 | `01:V108` hemoglobina (3C) |
| P18 | Dolor de espalda / elongación de columna | 9 | `02:V58` dolor (3C) |
| P19 | Nutrición inadecuada / pérdida de masa | 12 | `01:V8` masa corporal (3C) |
| P20 | Glucosa / resistencia a la insulina | 9 | `02:V86` glucosa en ayunas (3C) |

Los recuentos de la tabla se comprobaron contra el CSV y suman 350. Incluyen la FEVI (`01:V18`, peso 1, nivel C) en P01 y P02.

Columnas de la liga: `padecimiento_id, variable_id, variable, peso, direccion, lr_o_or, nivel_evidencia, fuente, prior_media, prior_de, medido_en_vuelo, precision`.

### 4.1 Grupos de correlación (no se suman dentro del grupo)

- {`03:V82`, `03:V83`, `04:A6`}: cefalea.
- {`01:V3`, `04:A4`}: FC.
- {bandera `01:V31`, `latidos_irregulares`}.
- {`hrv_rmssd`, `hrv_sdnn`}.

### 4.2 Duplicados resueltos con una ID canónica

CO₂ → `04:A23` · FC → `01:V3` · HRV → `03:V17` (alias `01:V43`) · temperatura de cabina → `04:A27` · calcio sérico → `02:V14`.

## 5. Variables derivadas y del ECG

| Métrica (adaptador `ecg`) | Unidad | `variable_id` en el motor | Nivel |
|---|---|---|---|
| `heart_rate` | bpm | `01:V3` si el registro es en reposo/sueño; si no, `04:A4` | N1/N2 |
| `hrv_rmssd`, `hrv_sdnn` | ms | `03:V17` (decide ln RMSSD) | — |
| `qtc_bazett` | ms | `01:V34` (criterio Rautaharju ≥ 450 ♂ / ≥ 460 ♀, ≤ 390) | N4 |
| `pr_interval` | ms | `01:V35` | N4 |
| `latidos_irregulares` | latidos | proxy de `01:V32`/`01:V33` (cuenta como 2, C) | N4 |
| `ritmo_irregular_compatible_fa` | bandera 0/1 | proxy de `01:V31` | N4 |
| FEVI de eco (`EF`, `feve`, `ejection_fraction`) | % | `01:V18` | N4 |
| `LVSV` | cm³ | `01:V4` | N4 |
| `LVEDV` | cm³ | `01:V17` (parcial) | N4 |
| `LAVol` | cm³ | `01:V36` | N4 |

Las áreas en px², las similitudes coseno y las fracciones de vecinos **no tienen variable de equipo**: se guardan, pero no puntúan.

## 6. Estructura de la base de datos

Esquema en [`db.ts`](../Sistema/backend/src/db.ts) y [`salud.ts`](../Sistema/backend/src/salud.ts). SQLite en modo WAL, con `foreign_keys = ON`.

| Tabla | Clave | Columnas principales |
|---|---|---|
| `variables` | `id` | nombre, descripcion, unidad, tipo_umbral (A/T), procedencia (sensor · derived · estimated · manual · telemetry), actualizada |
| `esquemas` | `id` | nombre, version, campos (JSON), creado |
| `dispositivos` | `id` (u32) | clave (única), nombre, tipo (suit · wrist · chest · habitat · dosimeter · phone), perfil (eva · json), esquema_id |
| `tripulantes` | `id` | nombre, rol, sexo, edad, peso_kg, altura_m, sangre |
| `asignaciones` | `id` | dispositivo, tripulante, desde, hasta |
| `basales` | (tripulante, variable) | valor |
| `historial` | `id` | tripulante, mision, entorno, variable, delta, escala |
| `priores` | (variable, entorno) | datos (JSON) |
| `fases` | `desde` | entorno |
| `muestras` | `id`; UNIQUE (tripulante, dispositivo, seq, variable, t_scet) | valor, unidad, procedencia, calidad (JSON), metodo, **t_scet** (cuándo ocurrió), **t_recibida**, dispositivo, seq, esquema_id, entorno |
| `alertas` | `id` | tripulante, variable, estado, z, valor, esperado, banda, t_scet, creada, enviada_tierra, motivo, umbral (JSON) |
| `referencias` | `variable` | datos (JSON de `medibles.json`) |
| `enlace` | `id = 1` | owlt_s, abierto |
| `bajada` | `id`; UNIQUE (emisor, seq) | tipo, datos, prioridad (0/1/2), t_scet, t_envio, t_ert, emisor, seq, ack, intentos, t_ack |
| `subida` | `id`; UNIQUE (emisor, seq) | de, para, texto, prioridad, tipo (aviso/alerta), datos, t_redactado, t_envio, t_llegada, entregado, … |
| `abordo` | `id` | de, para, texto, nivel, t |
| `emergencias` | `id` | tripulante, modo, causa, disparadores (JSON), t_scet, t_registro, resultado, t_cierre |
| `entrada` | UNIQUE (emisor, seq) | canal, tipo, prioridad, datos, t_evento, t_envio, t_recepcion |
| `enlace_contador`, `enlace_estado` | — | Cursores, ACK y latido del enlace HTTPS |
| `padecimientos` | `id` | nombre, riesgo_nasa, descripcion, prevalencia, fuente_prevalencia |
| `padecimiento_variable` | (padecimiento_id, variable_id) | Columnas de la liga (§4) |
| `pesos_usuario` | `clave` (`liga|P07|03:V82`, `umbral|T_amarillo`) | tipo, peso, prior_de, valor, modificado_por_usuario, modificado |
| `evaluaciones` | `id` | tripulante, padecimiento_id, color (VERDE/AMARILLO/ROJO/GRIS), hora, canal (`real`/`SIMULADO`), detalle (JSON) |

## 7. Formatos de intercambio del prototipo de salud

| Formato | Columnas |
|---|---|
| Formato común (`outputs/normalized.csv`) | subject_id, study_id, timestamp, source, model, metric, value, unit, quality, simulated, tipo, run_id, input_file, notes |
| Sensores, formato largo | subject_id, timestamp, device, variable, value, unit, quality, simulated, metric_detail, notes |
| CSV nativo del motor | subject_id, timestamp, variable_id, value, unit, device_class, quality, context, method, simulated, notes |

Variables canónicas del importador de sensores: heart_rate (bpm) · hrv_rmssd / hrv_sdnn (ms) · spo2 (%) · bp_systolic / bp_diastolic (mmHg) · temp_skin / temp_body (°C) · sleep_duration (h) · sleep_efficiency (%) · steps · active_minutes (min) · symptom (texto).

Regla común a todos: **un faltante es vacío (NaN), nunca 0**. `value` vacío ⇔ `quality` empieza por `sin_dato`.

## 8. Datos reales, de prueba y simulados

| Tipo | Ejemplos | Rotulado |
|---|---|---|
| **Sintéticos** | Tripulación Ana/Luis/Mei/Tomás y sus basales; `Simulacion/eva-simulacion.db`; escenario `datos.js`/`demo.js`; tripulación `SIM-T01…T05`; sensores `SIM-A01`/`SIM-B02` | `simulated=true`, canal `SIMULADO`, distintivo «Simulación · datos sintéticos» |
| **De prueba** | Filas `PRUEBA-*` de los tests; pesos aleatorios de las pruebas de carga | Nunca se escriben en `normalized.csv` |
| **Reales públicos** | ECG MIT-BIH / AFDB (pacientes hospitalarios, ODC-By 1.0); laboratorios de Inspiration4 (OSDR); eventos DONKI | Con fuente y licencia; **no son de astronautas del equipo** (salvo los de Inspiration4, que son civiles) |
| **Operativos** | `Sistema/backend/eva.db` | Sin datos de sensores reales a la fecha: el backend no los crea por sí solo |

## 9. Catálogos de investigación

| Archivo | Filas | Contenido |
|---|---:|---|
| [`Planeacion/data/variables/VARIABLES-MEDIDAS-ASTRONAUTAS.csv`](../Planeacion/data/variables/VARIABLES-MEDIDAS-ASTRONAUTAS.csv) | 388 | id, variable, sistema, medido_en_astronautas, equipo_o_metodo, experimento_o_requisito_nasa, fuente, fuente_previa, nota |
| [`Planeacion/data/variables/VARIABLES-CARDIOBASCULAR.csv`](../Planeacion/data/variables/VARIABLES-CARDIOBASCULAR.csv) | 77 | Ficha de investigación por variable de Iker (antes `Planeacion/Iker/iker_variables.csv`): método de captura, datasets y licencias, si hay dato en vuelo, modelos existentes, fuente del umbral, uso en el prototipo, limitaciones y estado. Ver §9.1 |
| [`prototipo-salud/datos/modelo/PADECIMIENTO-VARIABLE.csv`](../prototipo-salud/datos/modelo/PADECIMIENTO-VARIABLE.csv) | **350** | **Fuente de verdad**: la usan el motor y el backend |
| [`Planeacion/data/padecimientos/PADECIMIENTO-VARIABLE.csv`](../Planeacion/data/padecimientos/PADECIMIENTO-VARIABLE.csv) | 350 | Copia idéntica a la fuente de verdad |

> La matriz de 350 ligas incluye la FEVI (`01:V18`) en P01 y P02. Si se edita, se edita en `prototipo-salud/datos/modelo/` y se vuelve a copiar.

### 9.1 `VARIABLES-CARDIOBASCULAR.csv`

Ficha de investigación por variable, elaborada por Iker durante la fase de investigación. Pese al nombre, no es sólo
cardiovascular: sus 77 filas vienen de tres catálogos del equipo.

| Catálogo de origen (columna `archivo`) | Filas |
|---|---:|
| 01 · cardiovascular, SANS y radiación | 51 |
| 03 · conducta, sueño y cognición | 22 |
| 04 · inmune, ambiente, equipo y umbrales | 4 |

**Columnas.** `archivo`, `id` (identificador dentro del catálogo, p. ej. `V31`), `variable`, `unidad`,
`metodo_captura`, `dataset_url`, `licencia`, `formato`, `numero_registros`, `datos_en_vuelo`, `modelo_existente_url`,
`umbral_fuente`, `uso_prototipo`, `limitaciones`, `estado`, `riesgo_hrp`, `recurso_oficial_url`.

**Estado de la investigación** (columna `estado`): 36 con fuente encontrada, 26 bloqueadas, 10 pendientes, 4 con datos
descargados y 1 integrada.

**Relación con `VARIABLES-MEDIDAS-ASTRONAUTAS.csv`.** Las 77 variables aparecen también en el catálogo maestro (388
filas) con el id prefijado por su catálogo (`V31` del catálogo 01 es `01:V31`), y allí su columna `fuente_previa`
dice `iker_variables.csv`. El maestro responde «¿se ha medido en astronautas y con qué?»; esta ficha añade lo que
hace falta para usar la variable en software: datasets, licencias, modelos y limitaciones.

**Uso en el sistema.** Ningún programa la lee directamente. Es fuente citada: la trazabilidad de los umbrales
clínicos ([`medibles.md`](../Sistema/backend/semillas/medibles.md)) remite a sus filas.

## Documentación relacionada

- [Modelos computacionales y algoritmos](README_06_MODELOS_COMPUTACIONALES_ALGORITMOS.md)
- [Integración e interoperabilidad](README_05_INTEGRACION_INTEROPERABILIDAD.md)
- [Protocolo de investigación](README_02_PROTOCOLO_INVESTIGACION.md)
- [Arquitectura del sistema](README_04_ARQUITECTURA_SISTEMA.md)
