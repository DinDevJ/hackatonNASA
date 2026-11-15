# Padecimientos ligados a variables del equipo (pesos para estadística)

14 nov 2026. Solo investigación; **nada es diagnóstico**. Archivos: `PADECIMIENTOS.csv` (20 filas) y `PADECIMIENTO-VARIABLE.csv` (348 ligas, todas con peso 1–3; los pesos 0 no se listan).

## Método

- **Lista controlada:** los 11 padecimientos de Iker (P01–P11) y 9 que forman secciones enteras de los catálogos 01–02 (P12–P20). La trombosis yugular (P11) y el SANS (P12) se separaron porque el CSV de Iker los juntaba y el equipo los trata en bloques distintos (01 §4 y §5). Se fusionaron sinónimos: la cefalea espacial (03 §7) va en P07 y la hipovolemia ortostática en P02.
- **Base:** los 54 pesos no nulos de Iker, con los nombres genéricos pasados a IDs del equipo según `_inventario/mapeo-y-correcciones.md`. De ahí salen 56 filas:
  - se quitaron 2: CO2→hipoxia (corrección 2) y disnea→hipoxia, porque el catálogo no tiene una variable de disnea;
  - se añadieron 4 al repartir "síntomas" en variables concretas: P04 en 04:A17 y 04:A44; P09 en 03:V1 y 03:V24; P10 en 04:A36 y 04:A37; la fila de Iker para P11 se repartió en 01:V58 (P11) y 01:V86 (P12).
- **Ampliación (292 filas):** variables cuyo `que_senala` o sección apunta de forma clara al padecimiento. Si no hay fuente en las entradas, van con nivel C.
- **Duplicados:**
  - no se ligaron los punteros fusionados (01:V27, 02:V75, 04:A5);
  - en los duplicados sin fusionar se ligó solo una entrada: CO2 → 04:A23; FC → 01:V3; HRV → 03:V17; temperatura de cabina → 04:A27; calcio sérico → 02:V14;
  - por la misma razón se dejaron fuera otros pares equivalentes: 01:V19↔02:V51, 01:V24↔02:V90, 04:A9↔02:V67a, 04:A45↔02:V58 y 02:V32↔04:A22h.
- **Priors:** `prior_media` = peso. `prior_de`: A = 0.5, B = 1.0, C = 1.5.
- **Columnas copiadas:** `medido_en_vuelo` viene de `variables-para-pesos.csv`. `precision` viene de `PRECISION-VARIABLES.md` y solo se rellenó para las variables que cubre; 04:A1 (oral) queda vacía porque ese archivo solo evalúa piel y central.

### Las 5 correcciones obligatorias

| # | Corrección | Aplicada | Filas |
|---|---|---|---|
| 1 | FA: el peso alto va a la irregularidad, no a fc_reposo | Sí | P01–01:V31 (3, A, Perez 2019 + Taggar 2016). 01:V3 no está ligada a P01 |
| 2 | No usar Law 2014 para hipoxia | Sí | Se quitó CO2 de P03. Law 2014 solo aparece en P07 (04:A23, 03:V82) |
| 3 | DCS: variables de Conkin si existen | Sí (hueco) | Ninguna variable de Conkin (EVA, prerrespiración, presión del traje) está en la lista. Se ligaron 04:A36, 04:A37, 04:A38, 04:A39, más 04:A26 (presión total de cabina) y 04:A50. 04:A24 no se ligó a P10 porque no se encontró un aporte con fuente |
| 4 | Crucian y Barger de A a B | Sí | Crucian: P04–04:A17 y P04–04:A44. Barger: P05–03:V30 y P06–03:V30. Las demás filas con Crucian/Barger también son B: P01–01:V45 y P05–03:V87 |
| 5 | CO2→respiración puede ser B solo con URL real | Queda C | P07–04:A2. Se revisó OCHMO TB-004 (ya citada): el texto menciona disnea, pero no el aumento de la ventilación (que solo aparece en una figura). No hay otra fuente en las entradas |

## Resumen por padecimiento

| ID | Padecimiento | n variables | n A o B | Las 3 de mayor peso (peso y nivel) |
|---|---|---|---|---|
| P01 | Arritmia / fibrilación auricular | 14 | 3 | `01:V31` Ritmo cardíaco (fibrilación auricular  (3A); `01:V33` Extrasístoles ventriculares y taquicar (3C); `01:V45` Síntomas: palpitaciones, síncope, dolo (2B) |
| P02 | Desacondicionamiento e intolerancia ortostática | 17 | 4 | `01:V47` Caída de la presión arterial al poners (3A); `01:V48` Aumento de la frecuencia cardíaca al p (2B); `01:V50` Síntomas de presíncope: mareo, náusea, (2B) |
| P03 | Hipoxia / problema respiratorio | 8 | 3 | `04:A3` SpO2 (3A); `04:A2` Frecuencia respiratoria (3B); `04:A25` O2 inspirado (PIO2) (3C) |
| P04 | Infección, fiebre o desregulación inmune | 25 | 9 | `04:A1` Temperatura corporal (3B); `01:V3` Frecuencia cardíaca en reposo (2A); `04:A17` Erupción cutánea / hipersensibilidad ( (2B) |
| P05 | Pérdida de sueño y desalineación circadiana | 31 | 3 | `03:V30` Tiempo total de sueño (actigrafía) (3B); `03:V44` Alineación circadiana del episodio de  (3C); `03:V45` Melatonina salival (inicio en luz tenu (3C) |
| P06 | Fatiga y deterioro cognitivo | 31 | 3 | `03:V66` PVT-B: lapsos (3A); `03:V68` Batería Cognition (velocidad, precisió (3B); `03:V30` Tiempo total de sueño (actigrafía) (2B) |
| P07 | Exposición a CO2 / cefalea | 14 | 2 | `04:A23` ppCO2 de cabina (3A); `03:V82` Episodio de cefalea (sí/no, fecha, dur (3A); `04:A2` Frecuencia respiratoria (2C) |
| P08 | Radiación aguda por evento solar | 16 | 3 | `01:V98` Recuento absoluto de linfocitos y su c (3B); `01:V93` Dosis efectiva por evento de partícula (3C); `01:V100` Tiempo hasta el primer vómito tras la  (2B) |
| P09 | Estrés / salud conductual | 29 | 3 | `03:V1` PHQ-9 (3A); `03:V30` Tiempo total de sueño (actigrafía) (2B); `03:V24` Conflicto diádico (2B) |
| P10 | Enfermedad por descompresión tras EVA | 10 | 0 | `04:A36` Síntomas DCS tipo I (3C); `04:A37` Síntomas DCS tipo II (3C); `04:A38` Burbujas venosas (VGE) (2C) |
| P11 | Trombosis yugular | 16 | 3 | `01:V58` Síntomas de trombosis: hinchazón visib (3B); `01:V54` Grado de flujo de la yugular interna i (3B); `01:V55` Trombo visible (material ecogénico int (3B) |
| P12 | SANS / presión intracraneal | 25 | 1 | `01:V86` Síntomas visuales: visión cercana borr (3B); `01:V67` Cambio del grosor retiniano total peri (3C); `01:V68` Edema del disco óptico, grado de Frisé (3C) |
| P13 | Cálculos renales y deshidratación | 26 | 3 | `02:V37` Síntomas de cólico renal (dolor en fla (3B); `02:V17` Volumen de orina de 24 h (3C); `02:V18` Calcio urinario de 24 h (3C) |
| P14 | Pérdida de densidad ósea | 20 | 0 | `02:V01` DMO areal por DXA (cadera total, cuell (3C); `02:V02` T-score (DXA) (3C); `02:V05` DMO volumétrica y microarquitectura (Q (3C) |
| P15 | Atrofia muscular y pérdida de capacidad aeróbica | 19 | 0 | `02:V51` VO2pico / VO2máx (3C); `02:V40` Fuerza isocinética de rodilla (extensi (3C); `02:V46` Volumen o área de sección muscular por (3C) |
| P16 | Mareo espacial (SMS) | 5 | 0 | `02:V67a` Síntomas de mareo espacial (náusea, vó (3C); `02:V67b` Susceptibilidad previa al mareo (2C); `02:V68a` Uso y respuesta a medicación antimareo (2C) |
| P17 | Anemia espacial | 12 | 0 | `01:V108` Hemoglobina (3C); `01:V111` Masa eritrocitaria total (3C); `01:V109` Hematocrito (2C) |
| P18 | Dolor de espalda y elongación de columna | 9 | 0 | `02:V58` Dolor de espalda: presencia e intensid (3C); `02:V59` Localización, día de inicio y duración (2C); `02:V61` Estatura de pie (2C) |
| P19 | Nutrición inadecuada y pérdida de masa corporal | 12 | 0 | `01:V8` Masa corporal (3C); `02:V81` Ingesta energética (3C); `02:V76` 25-OH vitamina D sérica (2C) |
| P20 | Metabolismo de la glucosa / resistencia a la insulina | 9 | 0 | `02:V86` Glucosa plasmática en ayunas (3C); `02:V87` Glucosa a las 2 h de sobrecarga oral ( (3C); `02:V89` HbA1c (3C) |
Totales: 348 ligas; A = 9, B = 31, C = 308.

## Huecos

- **DCS (P10):** faltan en la lista las variables del modelo de Conkin (tiempo de EVA, prerrespiración, presión del traje, deambulación). Sin ellas el prior de riesgo de Conkin no se puede calcular. No hay LR por síntoma.
- **Sin LR ni sens/esp en vuelo** para ningún padecimiento. Las cifras de la columna `lr_o_or` son terrestres, salvo Law 2014 (ISS). Tampoco hay LR con fuente para sueño, fatiga, síntomas de SANS, mareo espacial, DCS ni radiación aguda.
- **Disnea:** el catálogo no tiene una variable de disnea, así que el síntoma de hipoxia de Iker no se pudo ligar.
- **P12–P20:** casi todo es nivel C. Los criterios clínicos conocidos (T-score, ADA, Frisén…) no tienen fuente en las entradas de esta tarea. Las fuentes de cada fila de los catálogos 01–02 no se transfirieron una por una; es el siguiente paso para subir C → B.
- **Prevalencia vacía** en P01, P03, P06, P08, P09 y P14–P20: no hay cifra en las entradas.
- **Precisión:** solo está evaluada para las 10 variables genéricas de `PRECISION-VARIABLES.md`. El resto queda vacío.
- **Atribuciones de Iker sin verificar en esta tarea:** Basner 2014 para conflicto (03:V24) y Crucian 2016 para palpitaciones (01:V45). Se conservan como B.
- **Posible redundancia:** 03:V82, 03:V83 y 04:A6 (cefalea) y 01:V3/04:A4 (FC) miden cosas parecidas. Conviene modelarlas como correlacionadas, no como evidencia independiente.
- **Duplicados pendientes de decisión del equipo:** calcio (01:V41/02:V14) y HRV (01:V43/03:V17). Aquí se eligió una; si el equipo decide otra canónica, hay que cambiar el ID.
