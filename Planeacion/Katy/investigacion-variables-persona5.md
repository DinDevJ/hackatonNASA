# Investigación de variables — Persona 5 (Katy)

Asignación: [`ASIGNACION_VARIABLES_MONARCAS.md`](../ASIGNACION_VARIABLES_MONARCAS.md), sección 5.
Este archivo cubre **los últimos cuatro temas de Persona 5: 40 variables**.

| Bloque | IDs | Variables | Tema |
|---|---|---:|---|
| 04 | `04:A22a`–`04:A22j` | 10 | Parámetros de tira de orina |
| 04 | `04:A40`–`04:A50` | 11 | Problemas agudos, lesiones, infecciones y síntomas |
| Nuevo | `R01`–`R12` | 12 | Ciclo menstrual, sangrado, dolor y anticoncepción |
| Nuevo | `R18`–`R24` | 7 | Menopausia, sueño, HRV, trombosis, hueso y síntomas ginecológicos |

Los otros temas de Persona 5 (`03:V1–V20`, `03:V51–V52`, `03:V61–V64`, `04:A13–A21`) no
están en este archivo.

Formato: el de la sección 7 de la asignación, **una fila por variable**. Se quitó la
columna `dificultad` a petición del equipo (la asignación la pedía; se puede regresar).

## Cómo leer este archivo

**Cada fila es una variable**, es decir, un dato de salud que EVA podría registrar.

### Las columnas de las tablas de investigación (§1 a §4)

| Columna | Qué responde | Ejemplo |
|---|---|---|
| `id` | El código de la variable y de qué archivo viene. `04:` = catálogo 04 de Iker; `R` = variable nueva de salud reproductiva | `04:A22h`, `R07` |
| `nombre` | Qué es, en palabras | Densidad urinaria |
| `unidad` | En qué se mide o qué valores puede tener | g/mL; escala 0–10; sí/no |
| `metodo_captura` | Cómo se obtiene el dato | Manual (la persona lo escribe), wearable (reloj), imagen (foto), laboratorio, nave (sensor de la nave), calculado (sale de otros datos) |
| `fuente` | De dónde sale la información; el número `[Pn]` lleva a la lista de fuentes del final | `[P2][P7]` |
| `dataset_url` | Dónde hay datos reales para descargar; `NO DISPONIBLE` si no existe | NHANES `RHQ_J` |
| `formato` | En qué tipo de archivo vienen esos datos | CSV, XPT (archivo de SAS), JPG |
| `modelo_existente` | Si ya hay un modelo de inteligencia artificial hecho que se pueda usar; `NO` si no | 3 modelos en Roboflow |
| `umbral` | A partir de qué valor algo se considera anormal | 24–38 días (ciclo normal) |
| `validacion` | Quién validó ese umbral: NASA/astronautas, terrestre (clínicas en la Tierra) o experimental | Terrestre |
| `factibilidad_vuelo` | Si se puede medir en el espacio: **directa** (sí, a bordo), **indirecta** (se estima), **solo tierra** (no se puede en vuelo) o **no verificada** | Directa |
| `utilidad` | Para qué sirve: qué problema ayuda a detectar | Detectar infección urinaria |
| `estado` | En qué va la investigación: pendiente, fuente encontrada, datos descargados o probado | Datos descargados |
| `observaciones` | Advertencias: sesgos, muestras pequeñas, límites | "Puede dar positivo durante la menstruación" |

### Las tablas de hombre y mujer (§1.1 y §2.1)

| Columna | Qué responde |
|---|---|
| `Dato en vuelo (todos)` | Qué se sabe de esa variable en astronautas, sin separar por sexo |
| `Mujeres` / `Hombres` | Qué se sabe de cada sexo. "No encontrado" = no hay estudio publicado por sexo (no quiere decir que no haya diferencia) |

### La tabla del modelo predictivo (§5.2)

| Columna | Qué responde |
|---|---|
| `¿Hay en vuelo?` | Si hay datos de astronautas. "Agregado" = solo promedios o frecuencias, no datos de cada persona |
| `¿Hay en tierra?` | Si hay un dataset confiable de personas en la Tierra |
| `Categoría` | ✅ hay en vuelo · 🌍 solo en tierra (candidata al modelo) · ❌ no hay dataset de tierra |
| `¿Se incluye?` | **Sí, modelo**: hay datos para entrenar. **Sí, regla**: entra como un criterio fijo, sin modelo |
| `Facilidad` | Qué tan fácil es conseguir el dataset: 🟢 descarga pública · 🟡 registro gratuito · 🔴 credencial o permiso que tarda días |
| `Cómo entra al modelo` | Para qué se usaría la variable dentro de EVA |

### Los símbolos

| Símbolo | Significado |
|---|---|
| **[A]** | Umbral de NASA o validado en astronautas |
| **[T]** | Umbral clínico de la Tierra, no validado en el espacio |
| ✅ | Verificado en la fuente original |
| ⚠️ | Falta verificar; usar con cuidado |
| 🔶 | Decisión o propuesta mía, no de NASA ni de un estudio |
| `[P12]` | Número de fuente; la lista completa está en §8 |
| "por misión" / "por año-vuelo" | Cuántas veces ocurre ese problema, en promedio, en una misión de referencia de la ISS o en un año en el espacio |

---

## 0. Hallazgos que le sirven al equipo

1. **El ciclo menstrual mueve la FC en reposo y la HRV de forma normal** (`R21`). En un
   estudio con 45 811 ciclos, la FC en reposo llega a su mínimo hacia el día 5 y a su
   máximo hacia el día 26, y la HRV hace lo contrario; con anticonceptivos hormonales la
   amplitud es menor [P23]. **Para el motor de Julio:** una línea base que ignore el ciclo
   puede marcar como anomalía algo que es normal. Propuesta 🔶: guardar la fase estimada
   (`R06`) junto a cada lectura y no alertar por cambios que caben en la variación del
   ciclo.
2. **La sangre en la tira de orina puede salir positiva durante la menstruación**
   (`04:A22c`) por contaminación de la muestra ⚠️ (dato clínico general, no verificado en
   fuente abierta en esta sesión). Conviene cruzar `A22c` con `R01`/`R03` antes de
   sospechar un cálculo renal.
3. **La tira de orina se puede leer con la cámara** (`04:A22a–i`). Hay métodos publicados
   con teléfono [P11] y un dataset abierto pequeño [P12]. Es la mejor candidata de este
   bloque a **prueba real** en el prototipo.
4. **No hay datos de menstruación en vuelo.** Lo único publicado sobre astronautas es la
   revisión de supresión menstrual [P25]. Todo `R01–R12` se valida con datos terrestres.
5. **Las infecciones urinarias son más frecuentes en mujeres en vuelo** [P30][P34]: `A22a`,
   `A22b` y `R24` deben leerse juntas. En el modelo de riesgo médico de NASA es la
   principal diferencia por sexo [P35].
6. **Por sexo, en los dos primeros temas** (§1.1 y §2.1): más riesgo absoluto de cálculos
   renales en hombres [P36], más despegamiento de uña tras caminata espacial en mujeres
   [P48], y **sin diferencia** demostrada en sueño [P43]. El resto no está publicado por
   sexo.

---

## 1. Tira de orina — `04:A22a` a `04:A22j`

**Comparten fuente, equipo y limitaciones.** Equipo verificado por Iker: tiras Chemstrip
10 SG en el transbordador y "Urine Chemstrips and color chart" en el botiquín de la ISS;
Orion lista "Point-of-care Urinalysis" [P2][P3]. Se lee comparando colores, a mano o con
cámara. El checklist médico tiene exactamente estos campos [P2].

| id | nombre | unidad | metodo_captura | fuente | dataset_url | formato | modelo_existente | umbral | validacion | factibilidad_vuelo | utilidad | estado | observaciones |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 04:A22a | Leucocitos (esterasa leucocitaria) | neg / traza / pos | Imagen (tira) o manual | [P2][P4][P6] | [P12][P60] | PNG/JPG | NO (métodos publicados sin pesos [P11]) | Negativo [T] | Terrestre | Directa | Infección urinaria. ITU en vuelo: 0,1 por año-vuelo [P4]; 1,44 por misión en el modelo IMM [P1] | Fuente encontrada | Más frecuente en mujeres [P30]. Leer con `A22b` y `R24` |
| 04:A22b | Nitritos | neg / pos | Imagen (tira) o manual | [P2][P6] | [P12][P60] | PNG/JPG | NO | Negativo [T] | Terrestre | Directa | Infección urinaria bacteriana | Fuente encontrada | Un negativo no descarta infección ⚠️ |
| 04:A22c | Sangre / hemoglobina | ery/µL | Imagen (tira) o manual | [P2][P6] | [P12][P60] · NHANES `KIQ_U_J` [P58] ✅ descargado | PNG/JPG; XPT (SAS) | NO | Negativo [T] | Terrestre | Directa | Cálculo renal, infección. La pérdida ósea sube el calcio urinario [P1] | Datos descargados | ⚠️ Puede dar positivo durante la menstruación: cruzar con `R01`/`R03` |
| 04:A22d | Proteína | mg/dL | Imagen (tira) o manual | [P2][P6] | [P12][P60] · NHANES `ALB_CR_J` [P58] ✅ descargado | PNG/JPG; XPT (SAS) | NO | No detectable [T] | Terrestre | Directa | Daño renal | Datos descargados | Cambio en vuelo: no encontrado |
| 04:A22e | Glucosa | mg/dL | Imagen (tira) o manual | [P2][P6] | [P12][P60] | PNG/JPG | NO | No detectable [T] | Terrestre | Directa | Hiperglucemia (complementa la glucosa capilar de Leo, `02:V86–V93`) | Fuente encontrada | Cambio en vuelo: no encontrado |
| 04:A22f | Cetonas | neg / + / ++ / +++ | Imagen (tira) o manual | [P2][P6] | [P12][P60] | PNG/JPG | NO | No detectable [T] | Terrestre | Directa | Comer de menos, ayuno | Fuente encontrada | Útil con el módulo de nutrición: en vuelo se suele comer de menos |
| 04:A22g | pH | unidades | Imagen (tira) o manual | [P2][P8] | [P12][P60] | PNG/JPG | NO | 4,6–8,0 [T] | Terrestre | Directa | Riesgo de cálculos, infección | Fuente encontrada | — |
| 04:A22h | Densidad | g/mL | Imagen (tira) o manual | [P2][P7] | [P12][P60] | PNG/JPG | NO | 1,005–1,030 [T] | Terrestre | Directa | Deshidratación, p. ej. tras caminata espacial | Fuente encontrada | En vuelo se pierde ~12–15 % del líquido corporal al inicio [P9] |
| 04:A22i | Bilirrubina / urobilinógeno | neg-pos / mg/dL | Imagen (tira) o manual | [P2][P6] | [P12][P60] | PNG/JPG | NO | Bilirrubina no detectable [T] | Terrestre | Directa | Hígado, hemólisis (la anemia espacial es de Fani, `01:V108–V118`) | Fuente encontrada | Cambio en vuelo: no encontrado |
| 04:A22j | Retención urinaria | h sin orinar; dolor suprapúbico sí/no | Manual | [P1][P5] | NO DISPONIBLE | — | NO | Sin umbral numérico encontrado | NASA/astronautas (caso documentado) | Directa | Retención aguda por adaptación o por fármacos (prometazina, escopolamina) | Fuente encontrada | Caso en dos vuelos con sondaje de 4 días [P5]; 0,11 por misión en IMM [P1] |

**Datasets (verificados en su página):** dos proyectos de Roboflow con licencia **CC BY 4.0**
✅. UrineStripTest [P12] tiene **30 imágenes** y ningún modelo (el buscador decía 214: era
falso). UrineStrip [P60] tiene **77 imágenes**, 6 clases (cuadros de color y código QR) y
**3 modelos entrenados** que se usan por la API de Roboflow con cuenta gratuita ⚠️ (no
probados). Son pocos datos: sirven para un demo, no para un modelo clínico.
**Método de referencia:** [P11] detecta la tira en 85,5 % de las fotos y compara colores
con F1 de 0,70–0,81; no está claro si publicó sus imágenes.

### 1.1 Hombre / mujer: datos en vuelo

**Contexto:** hasta junio de 2013 habían volado 477 hombres y 57 mujeres [P30]. Casi
todos los datos por sexo son de muestras pequeñas; "no encontrado" significa que no hay
dato publicado por sexo, no que no haya diferencia.

| id | Dato en vuelo (todos) | Mujeres | Hombres | Fuente |
|---|---|---|---|---|
| 04:A22a | Infección urinaria: 0,1 por año-vuelo; 1,44 por misión en el modelo IMM | **Más frecuente.** En el modelo de riesgo médico de NASA, 20 de 100 condiciones tienen resultado distinto por sexo y la diferencia principal es la infección urinaria parcialmente tratada | Menos frecuente | [P4][P1][P30][P34][P35] |
| 04:A22b | Igual que `A22a` (marcador de infección bacteriana) | Igual que `A22a` | Igual que `A22a` | [P30][P35] |
| 04:A22c | La pérdida ósea sube el calcio urinario. No hay cálculos renales en vuelo registrados en astronautas de EE. UU.; sí más cálculos en el primer año tras el regreso | Riesgo de sobresaturación **menor** que en hombres, antes y después del vuelo (n = 9). ⚠️ La menstruación puede dar falso positivo | Riesgo de sobresaturación **mayor**, antes y después del vuelo (n = 33). El cambio por el vuelo fue similar en ambos sexos | [P36][P37] |
| 04:A22d | Cambio en vuelo: no encontrado | No encontrado | No encontrado | — |
| 04:A22e | Glucosa en orina en vuelo: no encontrado. Relacionado: la resistencia a la insulina en sangre sube ~60 % (n = 8) | No encontrado en orina | En sangre, la resistencia a la insulina subió **más en hombres** (catálogo 01 de Iker, `V24`) | [P28] |
| 04:A22f | Se come menos de lo requerido en vuelo, lo que favorece cetonas | No encontrado | No encontrado | [P9] |
| 04:A22g | El pH urinario **baja** en vuelo (transbordador y Mir) y sube el riesgo de cálculos | En reposo en cama, el cambio de pH fue **igual** en hombres y mujeres, con valores basales distintos | Igual que en mujeres (reposo en cama) | [P38][P39] |
| 04:A22h | Baja el volumen de orina y la ingesta de líquidos; al inicio se pierde ~12–15 % del líquido corporal | En reposo en cama, el cambio de volumen de orina fue **igual** en ambos sexos | Igual que en mujeres (reposo en cama) | [P9][P38][P39] |
| 04:A22i | Bilirrubina en vuelo: no encontrado. Relacionado: la hemólisis sube ~54 % durante 6 meses (catálogo 01 de Iker, `V112`) | No encontrado | No encontrado | [P28] |
| 04:A22j | 16 casos de Mercury a la ISS; en 12 se había tomado medicamento contra el mareo espacial. Con prometazina, la probabilidad es 3 veces mayor. Tasa casi igual en transbordador y ISS (0,019 vs. 0,021 por persona-vuelo) | Proporción reportada mujeres:hombres de 11:14 ⚠️ (no queda claro cómo se calculó). 🔶 Las mujeres reportan más mareo espacial [P40], lo que podría implicar más uso de esos medicamentos | Riesgo mayor en astronautas mayores por posible crecimiento de próstata o estrechez uretral | [P5][P41][P42] |

---

## 2. Problemas agudos — `04:A40` a `04:A50`

La frecuencia viene del modelo IMM de NASA (Tabla E.2-1, eventos por misión de
referencia de la ISS) [P1]. Sirve para ordenar el cuestionario de síntomas. Los criterios
de "contactar al cirujano" vienen del checklist médico del transbordador [P2].

| id | nombre | unidad | metodo_captura | fuente | dataset_url | formato | modelo_existente | umbral | validacion | factibilidad_vuelo | utilidad | estado | observaciones |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 04:A40 | Insomnio / horas de sueño | h; ISI 0–28 | Wearable (actigrafía) + cuestionario | [P1][P10][P13][P14] | NO DISPONIBLE (astronautas) | CSV (actigrafía) | NO | Sin corte validado en astronautas; ISI con cortes terrestres [T] | NASA/astronautas (frecuencia) + terrestre (escala) | Directa | Insomnio: **13,85 por misión, el evento más frecuente del IMM** [P1]. Sueño medio en vuelo ~6 h [P13] | Fuente encontrada | ISI **no es de uso libre**: se pide permiso a Mapi Research Trust [P14]. Se cruza con Leo (`03:V30–V43`) |
| 04:A41 | Abrasión de piel | sí/no; área; foto | Imagen + manual | [P1] | NO DISPONIBLE para reutilizar: el repositorio de AZH **no tiene licencia** [P15] | — | NO reutilizable | Sin umbral | NASA (frecuencia) | Directa | **9,86 por misión** [P1] | Fuente encontrada | Sin licencia, el código y los datos no se pueden reutilizar legalmente. Los datasets de heridas son sobre todo de heridas crónicas |
| 04:A42 | Abrasión ocular, cuerpo extraño, ojo rojo | sí/no; síntomas; foto | Imagen + manual | [P1][P2][P17] | NO DISPONIBLE | — | NO (estudios con datos cerrados [P17]) | **[A] Contactar al cirujano si hay visión borrosa, dolor, fotofobia o pus, o si el cuerpo extraño no sale** [P2] | NASA (procedimiento) | Directa | Abrasión ocular **7,42 por misión**; quemadura química 0,64; infección 0,53 [P1] | Fuente encontrada | Fotos de ojo con teléfono necesitan calibración de color [P17] |
| 04:A43 | Diarrea / gastroenteritis | episodios/día; fiebre sí/no | Manual | [P1][P2] | NHANES `BHQ_D`, `BHQ_E`, `BHQ_F` [P58] ✅ descargado | XPT (SAS) | NO | **[A] Con fiebre → contactar al cirujano** [P2] | NASA (procedimiento) | Directa | 3,53 / 0,42 por misión [P1] | Datos descargados | Leer con temperatura (`04:A1–A9`, Julio) |
| 04:A44 | Infección respiratoria | síntomas; SpO₂; temperatura | Manual + wearable | [P1][P3][P4] | NO DISPONIBLE | — | NO | SpO₂ ≤ 92 % contactar, ≤ 88 % urgente [T, no oficial, catálogo 04 de Iker] | NASA (frecuencia) + terrestre | Directa | 3,46 por misión [P1]; síntomas respiratorios altos ~0,97 por año-vuelo [P4] | Fuente encontrada | La SpO₂ del reloj no debe ser la única alerta |
| 04:A45 | Dolor de espalda (adaptación) | escala 0–10; zona | Manual | [P1][P9] | NO DISPONIBLE | — | NO | Sin corte; afecta al 52 % [P1][P9] | NASA/astronautas | Directa | 3,15 por misión [P1] | Fuente encontrada | Se traslapa con Leo (`02:V58–V66`): acordar quién lo documenta completo |
| 04:A46 | Reacción alérgica | síntomas; foto; signos vitales | Manual + imagen | [P1][P4] | NHANES `AGQ_D` [P58] ✅ descargado | XPT (SAS) | NO | Sin umbral | NASA (frecuencia) | Directa | 1,18 por misión [P1]; erupciones ~1,12 por año-vuelo [P4] | Datos descargados | No encontré un dataset abierto de erupciones alérgicas ⚠️ |
| 04:A47 | Estreñimiento | días sin evacuar | Manual | [P1] | NHANES `BHQ_D`, `BHQ_E`, `BHQ_F` [P58] ✅ descargado | XPT (SAS) | NO | Criterios Roma IV [T] ⚠️ no abierto en esta sesión | NASA (frecuencia) | Directa | 1,02 por misión [P1] | Datos descargados | Ligado a hidratación (`A22h`) y fibra de la dieta |
| 04:A48 | Dental: caries, absceso, empaste o corona | sí/no; foto intraoral | Imagen + manual | [P1][P16] | [P16]: registro 14827784, **abierto, CC BY 4.0, 6313 imágenes** ✅ · NHANES `OHXDEN_J` [P58] ✅ descargado | JPG; YOLO, COCO, Pascal VOC, LabelMe; XPT (SAS) | Hay modelos YOLO de caries; si usan Ultralytics, su licencia es AGPL-3.0 [P61] | Sin umbral | NASA (frecuencia) + terrestre (imagen) | Directa (kit dental a bordo [P3]) | Caries 0,88; absceso 0,068 por misión [P1] | Datos descargados | El otro registro (14723443) tiene archivos restringidos: usar el 14827784 |
| 04:A49 | Sinusitis | síntomas; temperatura | Manual | [P1] | NO DISPONIBLE | — | NO | Sin umbral | NASA (frecuencia) | Directa | 0,64 por misión [P1] | Fuente encontrada | La congestión en vuelo también sube con el CO₂ (Julio, `04:A23`) |
| 04:A50 | Parestesia y despegamiento de uña tras caminata espacial | sí/no; foto | Imagen + manual | [P1] | NO DISPONIBLE | — | NO | Sin umbral | NASA (frecuencia) | Directa | 0,65 / 0,40 por misión [P1] | Fuente encontrada | Lesiones de traje: se cruza con Leo (`02:V94–V97`) |

### 2.1 Hombre / mujer: datos en vuelo

| id | Dato en vuelo (todos) | Mujeres | Hombres | Fuente |
|---|---|---|---|---|
| 04:A40 | Insomnio: 13,85 por misión (IMM). Sueño medio ~6 h; ~75 % de la tripulación de la ISS usó hipnóticos en algún momento | Un análisis de la ISS **no encontró diferencias por sexo** en sueño ni en desempeño. NASA aclara que las diferencias por sexo en sueño no se han estudiado de forma sistemática en vuelo | Igual que en mujeres. Uso de hipnóticos por sexo: no encontrado | [P1][P13][P43][P44] |
| 04:A41 | Abrasión de piel: 9,86 por misión | No encontrado | No encontrado | [P1] |
| 04:A42 | Abrasión ocular: 7,42 por misión; quemadura química 0,64; infección 0,53 | No encontrado | No encontrado | [P1] |
| 04:A43 | Diarrea: 3,53 por misión; gastroenteritis 0,42 | No encontrado | No encontrado | [P1] |
| 04:A44 | Infección respiratoria: 3,46 por misión; síntomas respiratorios altos ~0,97 por año-vuelo. En vuelo se reactivan virus latentes | En tierra, las mujeres tienen **respuesta inmune más fuerte**; en vuelo, la diferencia por sexo **no está establecida** (muy pocas mujeres estudiadas) | Igual: sin dato por sexo en vuelo | [P1][P4][P45] |
| 04:A45 | Dolor de espalda en hasta 52 % (722 vuelos), leve en más del 80 % de los casos; 77 % reporta algún dolor en vuelo | El sexo se estudió como factor de riesgo en la ISS (9 mujeres), pero no encontré el resultado | Igual (36 hombres en ese estudio). La mayor parte de los datos de dolor vienen de hombres | [P1][P46][P47] |
| 04:A46 | Reacción alérgica: 1,18 por misión; erupciones ~1,12 por año-vuelo (el evento más común en vuelo largo) | En tierra, respuesta más fuerte a alérgenos; en vuelo, no encontrado | No encontrado | [P1][P4][P45] |
| 04:A47 | Estreñimiento: 1,02 por misión | No encontrado | No encontrado | [P1] |
| 04:A48 | Caries 0,88 por misión; absceso 0,068. Se ha descrito una infección dental incapacitante en vuelo | No encontrado | No encontrado | [P1][P45] |
| 04:A49 | Sinusitis: 0,64 por misión | No encontrado | No encontrado | [P1] |
| 04:A50 | Parestesia 0,65 y despegamiento de uña 0,40 por misión. Factores: ajuste del guante, tamaño de la mano, duración en traje | **Ser mujer se asoció al despegamiento de uña** (OR = 2,62) en un análisis de datos de NASA | Menor riesgo relativo. ⚠️ Los estudios no coinciden en si las manos grandes o chicas tienen más riesgo | [P1][P48][P49] |

**Lo que sí está claro por sexo en estos dos temas:** más infecciones urinarias en
mujeres; más riesgo absoluto de cálculos en hombres; más despegamiento de uña tras
caminata espacial en mujeres; y **sin diferencia** demostrada en sueño. Lo demás no está
publicado por sexo.

---

## 3. Ciclo menstrual, sangrado, dolor y anticoncepción — `R01` a `R12`

Variables **nuevas**, propuestas en la asignación; **no son medidas validadas por NASA**.
No hay datos de menstruación en vuelo publicados: solo la revisión de supresión
menstrual [P25]. Rangos de referencia terrestres: sistema 1 de FIGO [P18].

| id | nombre | unidad | metodo_captura | fuente | dataset_url | formato | modelo_existente | umbral | validacion | factibilidad_vuelo | utilidad | estado | observaciones |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| R01 | Fecha de última menstruación | fecha | Manual | [P18] | [P22] (acceso con acuerdo de uso) | CSV | NO (cálculo simple) | — | Terrestre | Directa | Base para `R02`, `R05`, `R06` | Fuente encontrada | Opcional y privado. No asumir que todas las mujeres menstrúan |
| R02 | Duración habitual del ciclo | días | Manual o calculado de `R01` | [P18][P26] | [P55] (CSV abierto) · [P22] | CSV | NO | **24–38 días** [T] (FIGO) | Terrestre | Directa | Ciclo frecuente o infrecuente | Fuente encontrada | El promedio baja con la edad: 30,4 días < 20 años; 28,7 a los 35–39 [P26] |
| R03 | Duración del sangrado | días | Manual | [P18] | [P55] (CSV abierto) · [P22] | CSV | NO | **≤ 8 días** [T] (FIGO) | Terrestre | Directa | Sangrado prolongado | Fuente encontrada | — |
| R04 | Intensidad del sangrado | escala PBAC (puntos) | Cuestionario con pictogramas | [P19] | [P55]: intensidad diaria del sangrado (no es PBAC) | CSV | NO | **PBAC ≥ 100 ≈ pérdida > 80 mL** [T] | Terrestre | Indirecta (requiere productos de higiene contables) | Sangrado abundante → riesgo de anemia (`R19`) | Fuente encontrada | Sensibilidad 58–97 % según estudio; el mejor corte varía por población (p. ej. 76 en Hong Kong) [P19] |
| R05 | Regularidad menstrual | días de diferencia entre el ciclo más corto y el más largo | Calculado de `R01` | [P18] | [P22] | CSV | NO | **≤ 7 días (18–25 y 42–45 años) o ≤ 9 días (26–41)** [T] (FIGO) | Terrestre | Directa | Ciclo irregular | Fuente encontrada | Requiere varios ciclos registrados |
| R06 | Fase estimada del ciclo | menstrual / folicular / lútea | Calculado (calendario; opcionalmente FC y temperatura) | [P23][P32] | [P22] | CSV | Paquete abierto MCAnalysis para modelar efectos del ciclo en datos digitales [P32] ⚠️ | — | Terrestre / experimental | Indirecta | Contexto para interpretar FC, HRV, sueño y ánimo (`R20`, `R21`) | Fuente encontrada | **Es una estimación: no confirma la ovulación.** No aplica con supresión hormonal |
| R07 | Dolor menstrual | escala 0–10 | Cuestionario | [P26] | NO DISPONIBLE | — | NO | Sin corte validado | Terrestre | Directa | Dismenorrea, necesidad de analgésico | Fuente encontrada | Los cólicos fueron el síntoma más registrado (> 60 %) en el estudio de Apple [P26] |
| R08 | Síntomas premenstruales | lista de síntomas o PSST | Cuestionario | [P20][P26] | NO DISPONIBLE | — | NO | PSST con criterios DSM [T] | Terrestre | Directa | Síndrome premenstrual, trastorno disfórico | Fuente encontrada | **PSST no es de uso libre confirmado:** licencia con McMaster/MILO [P20]. Alternativa: lista propia sin puntaje 🔶 |
| R09 | Sangrado intermenstrual o inesperado | sí/no; días | Manual | [P18] | [P55]: campos de sangrado inusual | CSV | NO | Cualquier episodio es descriptor de sangrado uterino anormal [T] (FIGO) | Terrestre | Directa | Sangrado anormal | Fuente encontrada | ⚠️ Con anticonceptivo continuo es frecuente el sangrado intermitente; no alertar sin ese contexto (`R11`) |
| R10 | Ausencia de menstruación y contexto | días sin sangrado; causa (supresión, menopausia, otra) | Manual | [P18][P25] | NHANES `RHQ_J` [P58] ✅ descargado | XPT (SAS) | NO | Sin umbral único: depende del contexto | Terrestre | Directa | Distinguir supresión voluntaria de otras causas | Datos descargados | Sin contexto, la ausencia de sangrado no dice nada |
| R11 | Anticonceptivo hormonal: tipo y régimen | combinado oral, DIU de levonorgestrel, implante, otro | Historial | [P25][P28] | NHANES `RHQ_J` [P58] ✅ descargado | XPT (SAS) | NO | Combinados de 1.ª y 2.ª generación: hasta 3,2× riesgo de trombosis [T] [P28] | NASA/astronautas (práctica descrita) + terrestre (riesgo) | Directa | Riesgo de trombosis (`R22`), efecto en hueso (`R23`) | Datos descargados | En misiones largas se ha usado tradicionalmente el anticonceptivo oral combinado continuo [P25] |
| R12 | Supresión menstrual voluntaria | sí/no; método; inventario | Historial + manual | [P25] | NO DISPONIBLE | — | NO | — | NASA/astronautas (revisión) | Directa | Inventario de medicamento contra la duración de la misión | Fuente encontrada | La revisión pide más investigación sobre el efecto en hueso en microgravedad [P25] |

---

## 4. Menopausia, sueño, HRV, trombosis, hueso y síntomas ginecológicos — `R18` a `R24`

| id | nombre | unidad | metodo_captura | fuente | dataset_url | formato | modelo_existente | umbral | validacion | factibilidad_vuelo | utilidad | estado | observaciones |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| R18 | Estado menopáusico y terapia hormonal | etapa STRAW+10; terapia sí/no | Historial | [P21] | NHANES `RHQ_J` [P58] ✅ descargado | XPT (SAS) | NO | Transición temprana: ciclos con ≥ 7 días de diferencia; tardía: ≥ 60 días sin sangrado [T] ⚠️ (resúmenes secundarios) | Terrestre | Directa | Contexto para hueso, sueño, FC y valores de referencia | Datos descargados | ⚠️ Umbrales tomados de resúmenes; verificar en Harlow 2012 [P21]. No aplica con SOP ni amenorrea hipotalámica |
| R19 | Hemoglobina y ferritina en relación con el sangrado | g/dL; µg/L | Laboratorio | [P27] · consultar a Fani (`01:V108`) | NHANES `FERTIN_J`, `CBC_J` [P58] ✅ descargado | XPT (SAS) | NO | Ferritina < 15 o < 30 µg/L según el estudio [T] | Terrestre | **Solo tierra** (en la ISS la sangre se analiza al regreso) | Anemia por sangrado abundante (`R04`) | Datos descargados | Con sangrado abundante, 42,8 % tenía ferritina < 15 µg/L (n = 454, clínica especializada) [P27] |
| R20 | Sueño según ciclo o tratamiento hormonal | h; eficiencia; fase | Wearable + historial | [P24] · consultar a Leo (`03:V30–V43`) | NO DISPONIBLE (datos de WHOOP no públicos) | — | NO | Sin umbral | Terrestre | Indirecta | Separar sueño malo por el ciclo de sueño malo por la misión | Fuente encontrada | Dormir menos en la semana premenstrual se asocia a FC más alta y HRV más baja [P24] |
| R21 | FC en reposo y HRV según el ciclo | lpm; ms | Wearable | [P23][P24] | [P22] (acuerdo de uso) | CSV | MCAnalysis [P32] ⚠️ | Sin umbral; patrón esperado: FC mínima ~día 5, máxima ~día 26; HRV inversa [P23] | Terrestre | Directa | **Evitar falsas alarmas del motor** (hallazgo 1 de §0) | Fuente encontrada | Estudios con relojes WHOOP; puede no trasladarse a otros dispositivos. Menor amplitud con anticonceptivos [P23] |
| R22 | Factores de riesgo de trombosis y tratamiento hormonal | lista de factores | Historial | [P28][P29] · consultar a Iker (`01:V54–V66`) | NO DISPONIBLE | — | NO | Factor V Leiden 4,9×; anticonceptivo combinado hasta 3,2× [T] [P28] | NASA (vigilancia de yugular) + terrestre (riesgo) | Directa | Priorizar ultrasonido de yugular en quien tenga más factores | Fuente encontrada | Caso de trombosis yugular en la ISS [P29] |
| R23 | Densidad ósea y estado hormonal | % de la basal (DXA) | DXA en tierra + historial | [P25][P31] · consultar a Fani (`02:V01–V16`) | NHANES `DXXFEM_J`, `DXXSPN_J` [P58] ✅ descargado | XPT (SAS) | NO | ≥ 95 % de la basal en cadera y columna [A] (catálogo de Iker) | NASA (estándar) | **Solo tierra** | Riesgo de hueso sumado: microgravedad + estado hormonal | Datos descargados | No hay forma de medir densidad ósea en vuelo |
| R24 | Síntomas urinarios y ginecológicos | lista sí/no | Cuestionario | [P30] | NHANES `KIQ_U_J` [P58] ✅ descargado | XPT (SAS) | NO | Sin umbral | NASA/astronautas (frecuencia por sexo) | Directa | Infección urinaria, vaginitis | Datos descargados | Más infecciones urinarias en mujeres en vuelo [P30]. Leer con `A22a`/`A22b` |

---

## 5. Disponibilidad de datos para el modelo predictivo

Donde no hay datos individuales en vuelo, la idea es **entrenar con datos de tierra**. Esta
sección dice, para cada variable, qué hay y qué tan fácil es incluirla.

### 5.1 Cómo leer la tabla

**Categoría:**

| Símbolo | Significado |
|---|---|
| ✅ **Vuelo** | Hay datos en vuelo publicados. Casi siempre son **agregados** (frecuencias, promedios), no datos por persona: sirven para calibrar, no para entrenar |
| 🌍 **Solo tierra** | No hay datos en vuelo, pero sí un dataset confiable de tierra. **Candidata al modelo predictivo** |
| ❌ **No** | No se encontró nada útil ni en vuelo ni en tierra |

Una variable puede ser ✅ y 🌍 a la vez: dato agregado en vuelo para calibrar + dataset de
tierra para entrenar.

**¿Se incluye?**
- **Sí, modelo:** hay datos para entrenar.
- **Sí, regla:** se incluye como regla fija (criterio de NASA o rango clínico), sin modelo.
- **No:** no hay base.

**Facilidad** (pensada para el tiempo del hackathon):

| Facilidad | Acceso al dataset |
|---|---|
| 🟢 Fácil | Descarga pública inmediata (NHANES, NHIS, Roboflow, Zenodo) |
| 🟡 Media | Requiere registro gratuito (ICPSR, NSRR) o los datos son de imagen y hay que adaptarlos |
| 🔴 Difícil | Requiere credencial o acuerdo de uso que tarda **días o semanas** (MIMIC-IV, mcPHASES) o solicitud con costo |

### 5.2 Tabla de las 40 variables

| id | Variable | ¿Hay en vuelo? | ¿Hay en tierra? | Categoría | Dataset de tierra | ¿Se incluye? | Facilidad | Cómo entra al modelo |
|---|---|---|---|---|---|---|---|---|
| 04:A22a | Leucocitos en orina | Agregado: infección urinaria 0,1 por año-vuelo | Sí | ✅ 🌍 | MIMIC-IV (urinálisis) [P50]; método validado: XGBoost con AUC 0,83–0,90 para predecir infección urinaria [P51] | Sí, modelo | 🔴 | Predicción de infección urinaria con `A22a+A22b+A22c` + síntomas (`R24`) + sexo |
| 04:A22b | Nitritos | Igual que `A22a` | Sí | ✅ 🌍 | MIMIC-IV [P50] | Sí, modelo | 🔴 | Igual que `A22a` |
| 04:A22c | Sangre en orina | Agregado: riesgo de cálculos por sexo (n = 42) | Sí | ✅ 🌍 | MIMIC-IV [P50] | Sí, modelo | 🔴 | Infección o cálculo; excluir días de menstruación (`R01`/`R03`) |
| 04:A22d | Proteína en orina | No | Sí | 🌍 | MIMIC-IV [P50]; NHANES tiene albúmina urinaria ⚠️ [P58] | Sí, modelo | 🟢 (NHANES) | Daño renal; contexto metabólico |
| 04:A22e | Glucosa en orina | No (solo glucosa en sangre) | Sí | 🌍 | MIMIC-IV [P50] | Sí, regla | 🔴 | Regla: positivo → revisar glucosa capilar (Leo) |
| 04:A22f | Cetonas | No | Sí | 🌍 | MIMIC-IV [P50] | Sí, regla | 🔴 | Regla: positivo + baja ingesta → alerta de nutrición |
| 04:A22g | pH urinario | Agregado: baja en vuelo | Sí | ✅ 🌍 | MIMIC-IV [P50] | Sí, modelo | 🔴 | Riesgo de cálculos con `A22h` y agua tomada |
| 04:A22h | Densidad urinaria | Agregado: baja el volumen de orina | Sí | ✅ 🌍 | MIMIC-IV [P50] | Sí, modelo | 🔴 | Deshidratación con agua tomada y masa corporal |
| 04:A22i | Bilirrubina / urobilinógeno | No | Sí | 🌍 | MIMIC-IV [P50] | Sí, regla | 🔴 | Regla: positivo → revisar con la CMO |
| 04:A22j | Retención urinaria | Agregado: 16 casos (Mercury a ISS), ligados a medicamentos contra el mareo | Sí | ✅ 🌍 | MIMIC-IV (diagnósticos) [P50] | Sí, regla | 🔴 | Regla: medicamento contra el mareo + horas sin orinar → alerta |
| 04:A40 | Insomnio / sueño | Agregado: ~6 h por noche; ~75 % usó hipnóticos | Sí | ✅ 🌍 | NSRR, cohortes con actigrafía [P54] | Sí, modelo | 🟡 | Predicción de mala noche con actigrafía (coordinar con Leo) |
| 04:A41 | Abrasión de piel | Agregado: 9,86 por misión | Hay imágenes, pero **sin licencia de reuso** (AZH) | ✅ ❌ | — | Sí, regla | 🟢 | Regla: foto + tamaño + signos de infección → seguimiento |
| 04:A42 | Ojo: abrasión, cuerpo extraño, ojo rojo | Agregado: 7,42 por misión | **No** encontré dataset abierto | ✅ ❌ | — | Sí, regla | 🟢 | Regla oficial de "contactar al cirujano" [P2] |
| 04:A43 | Diarrea | Agregado: 3,53 por misión | Sí | ✅ 🌍 | NHANES, salud intestinal (escala de Bristol, 2005–2010) [P52] | Sí, modelo | 🟢 | Patrón intestinal; regla de NASA: con fiebre → contactar al cirujano |
| 04:A44 | Infección respiratoria | Agregado: 3,46 por misión | Sí | ✅ 🌍 | MIMIC-IV [P50] | Sí, modelo | 🔴 | Signos vitales + síntomas → probabilidad de infección |
| 04:A45 | Dolor de espalda | Agregado: hasta 52 % | Sí | ✅ 🌍 | NHIS, módulo de dolor [P57] | Sí, modelo | 🟢 | Prevalencia y factores de riesgo (coordinar con Leo) |
| 04:A46 | Reacción alérgica | Agregado: 1,18 por misión | Sí ⚠️ | ✅ 🌍 | NHANES, cuestionario de alergias ⚠️ [P58] | Sí, regla | 🟢 | Regla: síntomas + signos vitales; el modelo aporta poco |
| 04:A47 | Estreñimiento | Agregado: 1,02 por misión | Sí | ✅ 🌍 | NHANES, salud intestinal [P52] | Sí, modelo | 🟢 | Frecuencia de evacuación + agua tomada |
| 04:A48 | Dental | Agregado: caries 0,88 por misión | Sí ✅ | ✅ 🌍 | 6313 fotos intraorales, CC BY 4.0 [P16]; examen oral de NHANES (`OHXDEN_J`) [P58] | Sí, modelo de imagen | 🟡 | Detectar caries en foto intraoral |
| 04:A49 | Sinusitis | Agregado: 0,64 por misión | Sí | ✅ 🌍 | NHIS, "sinusitis en los últimos 12 meses" [P57] | Sí, regla | 🟢 | Regla con síntomas y CO₂ de cabina |
| 04:A50 | Parestesia y uña tras caminata espacial | Agregado: análisis de NASA (mujeres OR 2,62) | **No** (no tiene equivalente en tierra) | ✅ ❌ | — | Sí, regla | 🟢 | Regla de riesgo con sexo, ajuste del guante y horas en traje [P48] |
| R01 | Fecha de última menstruación | No | Sí | 🌍 | mcPHASES [P22]; datos de ciclo de Marquette [P55] | Sí, regla | 🟢 | Entrada de usuario; base de `R02`, `R05`, `R06` |
| R02 | Duración del ciclo | No | Sí ✅ | 🌍 | **Marquette, CSV abierto (290 kB)** [P55]; mcPHASES [P22]; app Clue ⚠️ [P56] | Sí, modelo | 🟢 | Predicción del próximo ciclo |
| R03 | Duración del sangrado | No | Sí ✅ | 🌍 | Marquette [P55]; mcPHASES [P22] | Sí, regla | 🟢 | Regla FIGO (≤ 8 días) |
| R04 | Intensidad del sangrado (PBAC) | No | Parcial: Marquette tiene intensidad diaria, no PBAC [P55] | 🌍 | Marquette [P55] | Sí, regla | 🟢 | Regla: PBAC ≥ 100 → riesgo de anemia; Marquette sirve para ver patrones de intensidad |
| R05 | Regularidad | No | Sí | 🌍 | mcPHASES [P22]; Clue ⚠️ [P56] | Sí, regla | 🟢 | Regla FIGO (7–9 días según edad) |
| R06 | Fase estimada del ciclo | No | Sí | 🌍 | **mcPHASES**: hormonas diarias + wearable [P22] | Sí, modelo | 🔴 | Estimar la fase con FC y temperatura; corrige la línea base del motor |
| R07 | Dolor menstrual | No | Sí ⚠️ | 🌍 | mcPHASES (síntomas) ⚠️ [P22] | Sí, regla | 🔴 | Escala 0–10 con tendencia por ciclo |
| R08 | Síntomas premenstruales | No | Sí ⚠️ | 🌍 | mcPHASES (síntomas) ⚠️ [P22] | Sí, regla | 🔴 | Lista de síntomas; PSST requiere licencia |
| R09 | Sangrado intermenstrual | No | Sí ✅ | 🌍 | Marquette, campos de sangrado inusual [P55] | Sí, regla | 🟢 | Regla con contexto de anticonceptivo (`R11`) |
| R10 | Ausencia de menstruación | No | Sí | 🌍 | NHANES, salud reproductiva (motivo de no menstruar) [P53] | Sí, regla | 🟢 | Regla según contexto |
| R11 | Anticonceptivo hormonal | Descriptivo (revisión de NASA), sin datos por persona | Sí | ✅ 🌍 | NHANES, salud reproductiva ⚠️ [P53] | Sí, regla | 🟢 | Factor de riesgo para `R22` y `R23` |
| R12 | Supresión menstrual voluntaria | Descriptivo (revisión de NASA) | **No** encontré dataset | ✅ ❌ | — | Sí, regla | 🟢 | Historial + inventario de medicamento |
| R18 | Estado menopáusico | No | Sí | 🌍 | **SWAN** (3302 mujeres, transición a la menopausia) [P59]; NHANES [P53] | Sí, modelo | 🟡 | Etapa STRAW+10 estimada con historial |
| R19 | Hemoglobina y ferritina vs. sangrado | Agregado: hemoglobina cae tras el vuelo (Iker, `01:V108`) | Sí ⚠️ | ✅ 🌍 | NHANES: ferritina, hemoglobina y salud reproductiva ⚠️ [P58][P53] | Sí, modelo | 🟢 | Riesgo de deficiencia de hierro con `R04` + `R03` |
| R20 | Sueño según ciclo o tratamiento | No | Sí ⚠️ | 🌍 | mcPHASES ⚠️ [P22]; SWAN ⚠️ [P59] | Sí, modelo | 🔴 | Ajustar la línea base de sueño por fase |
| R21 | FC y HRV según ciclo | No | Sí | 🌍 | **mcPHASES** [P22] | Sí, modelo | 🔴 | Patrón esperado por fase → evitar falsas alarmas |
| R22 | Riesgo de trombosis y tratamiento hormonal | Agregado: vigilancia de la yugular en la ISS | Sí | ✅ 🌍 | MIMIC-IV [P50] | Sí, regla | 🔴 | Suma de factores de riesgo publicados (Iker, `01:V62–V64`) |
| R23 | Densidad ósea y estado hormonal | No (no se mide en vuelo) | Sí | 🌍 | NHANES, densitometría ⚠️ [P58]; SWAN, hueso [P59] | Sí, modelo | 🟡 | Riesgo óseo sumado: estado hormonal + microgravedad |
| R24 | Síntomas urinarios y ginecológicos | Agregado: más infecciones urinarias en mujeres | Sí ⚠️ | ✅ 🌍 | NHANES, cuestionario de riñón y urología ⚠️ [P58] | Sí, regla | 🟢 | Junto con `A22a`/`A22b` |

### 5.3 Resumen

| | Variables |
|---|---:|
| Con algún dato en vuelo (✅) | 22 |
| Solo tierra, candidatas al modelo (🌍 sin ✅) | 18 |
| Sin dataset de tierra utilizable (❌) | 4: `A41` (hay imágenes, sin licencia), `A42`, `A50`, `R12`. Las cuatro tienen dato agregado en vuelo |
| Sin nada ni en vuelo ni en tierra | **0** (`R04` ya tiene intensidad diaria en Marquette) |
| Se incluyen como **modelo** | 19 |
| Se incluyen como **regla** | 21 |
| **No se incluyen** | 0: todas entran, al menos como regla |
| Facilidad 🟢 / 🟡 / 🔴 | 20 / 4 / 16 |

### 5.4 Recomendación para el hackathon 🔶

1. **Empezar con NHANES** ✅ **probado**: 13 archivos descargados y validados con el
   script de §5.6. Cubre `A22c`, `A22d`, `A43`, `A46`, `A47`, `A48`, `R10`, `R11`,
   `R18`, `R19`, `R23`, `R24`.
2. **Marquette** (CSV abierto de ciclos) para `R02`, `R03`, `R04`, `R09`. Se descarga a
   mano desde el navegador: el servidor bloquea la descarga por script.
3. **NHIS** para `A45` y `A49` (descarga pública; archivos exactos sin ubicar todavía).
4. **Pedir hoy mismo el acceso a mcPHASES** (PhysioNet): es el mejor dataset para el ciclo
   (`R06`, `R20`, `R21`), pero el acuerdo de uso puede tardar. Si no llega a tiempo,
   esas variables entran como regla. Pasos en §5.7.
5. **MIMIC-IV** exige credencial de PhysioNet con curso de ética previo: **casi seguro no
   llega a tiempo**. Pasos en §5.7. Las variables de orina entran como regla (rangos de MedlinePlus) y el
   modelo de infección urinaria queda como hoja de ruta, citando el método publicado
   [P51].

### 5.5 Límites del modelo de tierra

- **Nada de esto está validado en microgravedad.** En pantalla debe decir "estimación con
  datos de tierra".
- **MIMIC-IV es de pacientes de hospital y terapia intensiva:** su población no se parece
  a astronautas sanos. Sesgo fuerte.
- **NHANES y NHIS son encuestas de población general:** varias respuestas son
  autoinforme, y el cuestionario intestinal de NHANES no está validado formalmente [P52].
- **Los datos de ciclo de apps** (Clue, Apple) tienen sesgo de quien decide registrar.
- Siguiendo la asignación, **no se muestran probabilidades como riesgo clínico
  calibrado** sin validación.

### 5.6 Descarga reproducible ✅ probada

Script: [`scripts/descargar-datos-tierra.mjs`](scripts/descargar-datos-tierra.mjs).
Necesita Node 18 o superior y no instala nada.

```bash
node Planeacion/Katy/scripts/descargar-datos-tierra.mjs --out datos-tierra
```

Qué hace: descarga los 13 archivos de NHANES, comprueba que cada uno sea un archivo SAS
válido e imprime una tabla con tamaño, validación y variables que cubre. Al final lista
las descargas manuales.

**Prueba (14 nov 2026, en una carpeta aparte):** 13 de 13 archivos descargados y
validados (~20 MB). Además se comprobó que dentro de cada archivo están las variables
clave:

| Archivo NHANES | Ciclo | Variable comprobada | Para |
|---|---|---|---|
| `BHQ_D`, `BHQ_E`, `BHQ_F` | 2005–2010 | `BHQ060` escala de Bristol; `BHD050` frecuencia | `A43`, `A47` |
| `RHQ_J` | 2017–2018 | `RHQ031` periodos regulares; `RHD043` motivo; `RHQ420` anticonceptivos; `RHQ540` hormonas | `R10`, `R11`, `R18` |
| `FERTIN_J` | 2017–2018 | `LBXFER` ferritina | `R19` |
| `CBC_J` | 2017–2018 | `LBXHGB` hemoglobina | `R19` |
| `DXXFEM_J`, `DXXSPN_J` | 2017–2018 | `DXXOFBMD` densidad de fémur | `R23` |
| `AGQ_D` | 2005–2006 | `AGQ060` síntomas de alergia | `A46` |
| `OHXDEN_J` | 2017–2018 | Dentición y caries | `A48` |
| `ALB_CR_J` | 2017–2018 | `URXUMA` albúmina urinaria | `A22d` |
| `KIQ_U_J` | 2017–2018 | `KIQ026` cálculos renales; `KIQ005` incontinencia | `R24`, `A22c` |
| `DEMO_J` | 2017–2018 | `RIAGENDR` sexo | Todas (se une por `SEQN`) |

**Leer los archivos en Python** (no probado aquí: esta computadora no tiene Python):

```python
import pandas as pd
rhq = pd.read_sas("datos-tierra/nhanes/RHQ_J.xpt", format="xport")
demo = pd.read_sas("datos-tierra/nhanes/DEMO_J.xpt", format="xport")
df = rhq.merge(demo[["SEQN", "RIAGENDR", "RIDAGEYR"]], on="SEQN")
```

⚠️ **No subir los datos al repositorio:** se regeneran con el script.
⚠️ NHANES usa pesos de muestreo: para estimar prevalencias de población hay que usarlos.

### 5.7 Cómo pedir acceso a los datasets restringidos

Lo tiene que pedir **una persona del equipo con su propia cuenta**: es un registro
personal. ⚠️ Tiempos aproximados, no garantizados.

**mcPHASES (acceso restringido):**
1. Crear una cuenta en PhysioNet.
2. Entrar a https://www.physionet.org/content/mcphases/ y firmar el acuerdo de uso
   (PhysioNet Restricted Health Data Use Agreement).
3. Esperar la aprobación y descargar.

**MIMIC-IV (acceso con credencial):**
1. Crear una cuenta en PhysioNet.
2. Hacer el curso de ética en investigación con humanos que pide PhysioNet (CITI, "Data or
   Specimens Only Research").
3. Pedir la credencial en PhysioNet (piden una referencia y la constancia del curso).
4. Una vez aprobada, firmar el acuerdo de uso de MIMIC-IV en
   https://physionet.org/content/mimiciv/3.1 y descargar.
5. Regla de PhysioNet: cualquier modelo o subconjunto derivado se trata como dato
   sensible y solo se comparte por PhysioNet con el mismo acuerdo [P50].

### 5.8 Cuáles conviene meter en la app EVA 🔶

**Nivel** = la escalera de obtención que definió Julio
([checklist-G1-G6.md §0](../Julio/checklist-G1-G6.md)), para que todo el equipo use la
misma escala:

| Nivel | Quién obtiene el dato |
|---|---|
| **N0** | Reloj o teléfono, automático |
| **N1** | Modelo a bordo, estimado desde otra señal (con su error declarado) |
| **NT** | Telemetría de la nave |
| **N2** | El astronauta lo mide o lo reporta |
| **N3** | La CMO a bordo, con equipo o entrenamiento |
| **N4** | Solo en Tierra o al regreso |

**Criterio:** entra primero lo que se puede obtener **a bordo** (N0–N2), tiene un umbral
claro o una regla oficial de NASA, y ayuda a una decisión real.

#### 🔴 Entran desde el principio

| Variables | Nivel | Por qué |
|---|---|---|
| `R21` + `R06` FC/HRV según el ciclo y fase estimada | N0 + N1 | **Evitan falsas alarmas del motor** en las astronautas. Sin esto, la línea base de Julio marca como anomalía un cambio normal del ciclo |
| `04:A42` ojo y `04:A43` diarrea con fiebre | N2 | Tienen **regla oficial de NASA** para contactar al cirujano [A]. Cuestan poco y valen mucho ante el jurado |
| `04:A44` infección respiratoria | N0 + N2 | Usa signos vitales que ya mide el reloj + síntomas |
| `04:A22a–i` tira de orina (entrada manual) + `04:A22j` retención | N2 | Equipo que ya está a bordo; regla simple. La lectura con cámara queda para después |
| `04:A40` sueño e insomnio | N0 + N2 | El evento más frecuente del modelo IMM (13,85 por misión). Se comparte con Leo |
| `R01`, `R02`, `R03`, `R05`, `R11`, `R12` ciclo, anticonceptivo y supresión | N2 | Módulo de salud femenina, **privado**. Rangos FIGO claros e inventario de medicamento |

#### 🟡 Entran después

| Variables | Nivel | Por qué esperan |
|---|---|---|
| `04:A45` espalda, `04:A47` estreñimiento, `04:A49` sinusitis, `04:A46` alergia | N2 | Útiles, pero sin regla de NASA ni urgencia |
| `04:A41` piel, `04:A48` dental (foto) | N2 | El modelo de imagen requiere trabajo; al inicio, solo registro con foto |
| `04:A50` uñas y parestesia tras caminata espacial | N2 | Solo aplica después de cada caminata espacial |
| `R04` PBAC, `R07` dolor, `R08` síntomas, `R09`, `R10`, `R24` | N2 | Completan el módulo de salud femenina |
| `R22` riesgo de trombosis | N2 + N3 | Historial previo al vuelo + ultrasonido de la CMO |
| `R20` sueño según el ciclo | N0 | Requiere los datos de mcPHASES para tener sentido |

#### ⚪ No van como medición en la app

| Variables | Nivel | Qué se hace con ellas |
|---|---|---|
| `R18` estado menopáusico | N4 / perfil | Dato del perfil, capturado **antes del vuelo** |
| `R19` hemoglobina y ferritina | N4 | Solo laboratorio en Tierra; entra como dato del perfil previo al vuelo |
| `R23` densidad ósea | N4 | Solo densitometría en Tierra; entra como dato del perfil |

**Resultado:** 22 variables desde el principio (9 de ellas son la tira de orina, que en
la app es una sola pantalla), 15 después y 3 solo como dato del perfil. Total: 40.

---

## 6. Variables candidatas a prueba (meta de la asignación: 8–12)

🔶 Las que se pueden probar de verdad en el prototipo, sin laboratorio:

| # | Variable(s) | Qué se probaría |
|---|---|---|
| 1 | `04:A22a–A22i` | Leer una foto de tira de orina con el dataset abierto [P12] |
| 2 | `R01`, `R02`, `R03`, `R05` | Calcular duración y regularidad del ciclo con datos de ejemplo y marcar fuera de rango FIGO |
| 3 | `R06` + `R21` | Estimar la fase y comprobar que el motor no alerta por la variación normal de FC/HRV |
| 4 | `R04` | Pantalla de PBAC con pictogramas y su puntaje |
| 5 | `04:A42` | Árbol de síntomas del ojo con el criterio oficial de "contactar al cirujano" |
| 6 | `04:A43` | Diarrea + fiebre → contactar al cirujano |
| 7 | `04:A40` | Sueño desde actigrafía de ejemplo (coordinar con Leo) |
| 8 | `04:A48` | Detección de caries en foto con un dataset abierto [P16] (si la licencia lo permite) |

---

## 7. Checklist de Persona 5 (sección 7 de la asignación)

- [x] Revisé todas mis variables y confirmé su significado.
- [x] Documenté unidades y método de medición.
- [x] Enlacé fuentes primarias y criterios de referencia. ⚠️ Algunas vienen de resúmenes
      (STRAW+10, Roma IV, FIGO por página del NHS); están marcadas.
- [x] Busqué datasets reales y verifiqué sus licencias. Verificado en la página original:
      NHANES (acuerdo de uso de NCHS), Roboflow (CC BY 4.0), caries en Zenodo (CC BY 4.0),
      Marquette (anonimizado, reuso aceptado en el consentimiento; sin licencia
      explícita), SWAN (ODbL 1.0, registro), AZH (**sin licencia: no reutilizable**).
      Pendientes: NHIS (archivos exactos), Clue (acceso no confirmado).
- [x] Distinguí medición directa, cálculo y estimación (`R05`, `R06` son calculadas;
      `R06` es estimación).
- [ ] Identifiqué modelos preentrenados que realmente puedan ejecutarse. **Parcial:**
      identifiqué 3 modelos entrenados para tira de orina en Roboflow [P60], que se usan
      por API con cuenta gratuita, pero **no los probé**. Para caries hay modelos YOLO,
      con licencia AGPL-3.0 si usan Ultralytics [P61]. No encontré ningún modelo con pesos
      descargables que haya podido ejecutar.
- [x] Documenté limitaciones de uso en vuelo y de validez clínica.
- [x] Añadí instrucciones reproducibles de descarga o prueba: script probado con 13 de 13
      archivos de NHANES (§5.6) y pasos para pedir mcPHASES y MIMIC-IV (§5.7).

---

## 8. Fuentes

Las que vienen del catálogo de Iker ([04-inmune-ambiente-equipo-umbrales.md](../variables-diagnostico/04-inmune-ambiente-equipo-umbrales.md))
las abrió él; las demás salen de búsquedas de esta sesión y **no se abrieron completas**
salvo que se indique.

- **[P1]** NASA-STD-3001 Vol. 1 Rev C (2023), incluye la Tabla E.2-1 del modelo IMM. https://standards.nasa.gov/sites/default/files/standards/NASA/C//nasa-std-3001-vol-1-rev-c-signature.pdf (vía Iker)
- **[P2]** Medical Checklist JSC-48031 Rev K (transbordador, 2006). http://web.archive.org/web/20170212012224/https://www.nasa.gov/centers/johnson/pdf/177788main_MedicalCklist.pdf (vía Iker)
- **[P3]** ISS CHeCS Medical Hardware Catalog v10.0 (2011). https://ntrs.nasa.gov/api/citations/20110022379/downloads/20110022379.pdf (vía Iker)
- **[P4]** Crucian B et al. 2016, Incidence of clinical symptoms during long-duration orbital spaceflight. https://pmc.ncbi.nlm.nih.gov/articles/PMC5098747 (vía Iker)
- **[P5]** Stepaniak PC et al. 2007, Acute urinary retention among astronauts. https://pubmed.ncbi.nlm.nih.gov/17511293/ (vía Iker)
- **[P6]** MedlinePlus, urinálisis. https://medlineplus.gov/ency/article/003579.htm (vía Iker)
- **[P7]** MedlinePlus, densidad urinaria. https://medlineplus.gov/ency/article/003587.htm (vía Iker)
- **[P8]** MedlinePlus, pH urinario. https://medlineplus.gov/ency/article/003583.htm (vía Iker)
- **[P9]** OCHMO-TB-033 Spaceflight Experience and Medical Care. https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-033-spaceflight-experience-medical-care.pdf (vía Iker)
- **[P10]** OCHMO-TB-041 Sleep Accommodations. https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-041-sleep-accommodations.pdf (vía Iker)
- **[P11]** Flaucher M et al. 2022, Smartphone-Based Colorimetric Analysis of Urine Test Strips for At-Home Prenatal Care, IEEE JTEHM. https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9292338/
- **[P12]** Roboflow Universe, UrineStripTest: CC BY 4.0, 30 imágenes, sin modelos ✅ (página revisada). https://universe.roboflow.com/huy-twqeh/urinestriptest
- **[P13]** Barger LK et al. 2014, sueño e hipnóticos en astronautas, Lancet Neurology. https://doi.org/10.1016/S1474-4422(14)70122-X
- **[P14]** Insomnia Severity Index, licencia en Mapi Research Trust. https://eprovide.mapi-trust.org/isi-insomnia-severity-index
- **[P15]** Clasificación de heridas con aprendizaje profundo (AZH, Medetec). https://arxiv.org/pdf/2408.11064 · Repositorio de AZH: **sin licencia** según la API de GitHub ✅ (no reutilizable). https://github.com/uwm-bigdata/wound-classification-using-images-and-locations
- **[P16]** Ahmed SMF et al. 2025, Annotated intraoral image dataset for dental caries detection, Scientific Data 12:1297. Zenodo 14827784: **abierto, CC BY 4.0, 6313 imágenes** ✅. El registro 14723443 tiene archivos restringidos. https://zenodo.org/records/14827784 · https://zenodo.org/records/14723443
- **[P17]** Evaluación de enrojecimiento ocular con fotos de teléfono (calibración de cámara). https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6362079/
- **[P18]** Parámetros normales del ciclo según FIGO (sistema 1), resumen del NHS Scotland. https://www.rightdecisions.scot.nhs.uk/advice-for-cardiology-healthcare-professionals-management-of-abnormal-uterine-bleeding-in-women-with-heart-disease/discussing-menstruation-and-normal-parameters ⚠️ fuente primaria: Munro et al. 2018 (no abierta)
- **[P19]** Revisión de validación del PBAC. https://pmc.ncbi.nlm.nih.gov/articles/PMC5779559 · corte de 76 en Hong Kong: https://hkmj.org/node/10715
- **[P20]** Steiner M et al. 2003, Premenstrual Symptoms Screening Tool, Arch Womens Ment Health. https://link.springer.com/article/10.1007/s00737-003-0018-4 · licencia: https://research.mcmaster.ca/industry-investors/tech/quality-of-life-questionnaires-tools/copyright-04-069/
- **[P21]** Harlow SD et al. 2012, STRAW+10, Menopause ⚠️ no abierta; umbrales tomados de resúmenes. https://doi.org/10.1097/gme.0b013e31824d8f40
- **[P22]** mcPHASES (PhysioNet, 2025): 42 personas, datos fisiológicos, hormonales y autoinforme; **acceso restringido con acuerdo de uso**. https://www.physionet.org/content/mcphases/
- **[P23]** Jasinski et al. 2024, cambios cardiovasculares a lo largo del ciclo con wearable, npj Digital Medicine 7:373 (45 811 ciclos). https://doaj.org/article/6e2ddca177cc46a3ac35032ef65987d8
- **[P24]** Gonzalez, O'Day et al. 2026, sueño y biometría del ciclo, npj Digital Medicine. https://doi.org/10.1038/s41746-026-02799-9
- **[P25]** Jain V, Wotring VE 2016, Medically induced amenorrhea in female astronauts, npj Microgravity. https://pmc.ncbi.nlm.nih.gov/articles/PMC5516549/
- **[P26]** Apple Women's Health Study (Harvard), ciclos por edad y síntomas registrados. https://hsph.harvard.edu/research/apple-womens-health-study/study-updates/menstrual-cycles-today-how-menstrual-cycles-vary-by-age-weight-race-and-ethnicity-data
- **[P27]** Sangrado abundante y deficiencia de hierro (n = 454), Int J Gynaecol Obstet. https://pubmed.ncbi.nlm.nih.gov/40613642/
- **[P28]** Catálogo 01 de Iker, variables `V62–V64` (trombofilia, antecedentes, anticoncepción). [01-cardiovascular-sans-radiacion.md](../variables-diagnostico/01-cardiovascular-sans-radiacion.md)
- **[P29]** Auñón-Chancellor SM et al. 2020, Venous Thrombosis during Spaceflight, NEJM. https://doi.org/10.1056/NEJMc1905875
- **[P30]** Mark S et al. 2014, The Impact of Sex and Gender on Adaptation to Space: Executive Summary, J Womens Health. https://pmc.ncbi.nlm.nih.gov/articles/PMC4236030/
- **[P31]** NASA, Risk of Spaceflight-Induced Bone Changes. https://www.nasa.gov/reference/risk-of-spaceflight-induced-bone-changes/
- **[P32]** MCAnalysis: paquete abierto para preprocesar y modelar efectos del ciclo en datos digitales de salud (arXiv). https://arxiv.org/pdf/2604.12536
- **[P34]** Kennedy AR et al. 2014, Effects of Sex and Gender on Adaptation to Space: Immune System, J Womens Health (infección urinaria más común en mujeres). https://pmc.ncbi.nlm.nih.gov/articles/PMC4236064
- **[P35]** Reyes DP et al. 2022, Assessment of Sex-Dependent Medical Outcomes During Spaceflight, J Womens Health (20 de 100 condiciones con resultado distinto por sexo) ⚠️ registro NTRS no abierto. https://ntrs.nasa.gov/api/citations/20200001661/downloads/20200001661.pdf
- **[P36]** Smith SM et al. 2014, Men and women in space: bone loss and kidney stone risk after long-duration spaceflight (n = 42: 33 hombres, 9 mujeres). https://pubmed.ncbi.nlm.nih.gov/24470067/
- **[P37]** NASA, modelo de riesgo de cálculos renales (sin casos en vuelo; más cálculos el primer año tras el regreso). https://ntrs.nasa.gov/api/citations/20180004680/downloads/20180004680.pdf
- **[P38]** Química urinaria en vuelo: pH y volumen bajan, calcio sube (1997). https://pubmed.ncbi.nlm.nih.gov/9366381/
- **[P39]** Química urinaria en reposo en cama por sexo. https://pmc.ncbi.nlm.nih.gov/articles/PMC4246590
- **[P40]** Reschke MF et al. 2014, Effects of Sex and Gender on Adaptation to Space: Neurosensory Systems, J Womens Health (más mareo espacial en mujeres) ⚠️ verificar que el enlace corresponda. https://pmc.ncbi.nlm.nih.gov/articles/PMC4236059
- **[P41]** Revisión de retención urinaria en vuelo (Mercury a ISS), Aerospace Medicine and Human Performance 94(2):90 (2023). https://meridian-asma-published.prime-prod-local.pubfactory.com/downloadpdf/view/journals/amhp/94/2/article-p90.pdf
- **[P42]** Jones JA et al. 2007, Genitourinary issues during spaceflight: a review, Can J Urol. https://mail.canjurol.com/html/subscriber/Spdf/V14I02/V14I02-4-DrJeff_Jones.pdf
- **[P43]** Goel N et al. 2014, Effects of Sex and Gender on Adaptation to Space: Behavioral Health, J Womens Health. https://pmc.ncbi.nlm.nih.gov/articles/PMC4235984
- **[P44]** NASA, reporte de evidencia sobre sueño (diferencias por sexo no estudiadas en vuelo). https://ntrs.nasa.gov/api/citations/20160003864/downloads/20160003864.pdf
- **[P45]** Ver [P34] (respuesta inmune por sexo e infecciones en vuelo).
- **[P46]** Dolor lumbar durante y después del vuelo: revisión sistemática con metaanálisis, Journal of Pain Research. https://www.dovepress.com/low-back-pain-during-and-after-spaceflight-a-systematic-review-with-me-peer-reviewed-fulltext-article-JPR
- **[P47]** NASA, dolor de espalda en astronautas de la ISS (45 astronautas: 36 hombres, 9 mujeres). https://ntrs.nasa.gov/api/citations/20160001546/downloads/20160001546.pdf
- **[P48]** NASA, lesiones de mano y uñas por el guante de traje (factores de riesgo, incluido el sexo). https://ntrs.nasa.gov/citations/20140014058
- **[P49]** Reid C. 2010, lesiones de mano en caminatas espaciales (232 lesiones), tesis MIT. https://dspace.mit.edu/handle/1721.1/62498

**Datasets de tierra para el modelo predictivo (§5):**

- **[P50]** MIMIC-IV, PhysioNet: incluye urinálisis (densidad, pH, glucosa, proteína, cetonas, bilirrubina, nitritos), signos vitales y diagnósticos. **Acceso con credencial.** https://physionet.org/content/mimiciv/3.1
- **[P51]** Taylor RA et al. 2018, Predicting urinary tract infections in the emergency department with machine learning, PLOS ONE (80 387 visitas; XGBoost, AUC 0,826–0,904). https://pmc.ncbi.nlm.nih.gov/articles/PMC5841824
- **[P52]** NHANES 2005–2010, cuestionario de salud intestinal (escala de Bristol; ejemplo de uso). https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12351127/
- **[P53]** NHANES, cuestionario de salud reproductiva (historia menstrual, menopausia, terapia hormonal). https://wwwn.cdc.gov/Nchs/Data/Nhanes/Public/2017/DataFiles/RHQ_J_R.htm
- **[P54]** National Sleep Research Resource (NSRR): polisomnografía, actigrafía y cuestionarios de varias cohortes; registro gratuito, algunos datasets restringidos. https://sleepdata.org/about
- **[P55]** Fehring RJ, Menstrual Cycle Data (Marquette University, 2012) ✅ página revisada: CSV de 290 kB con duración del ciclo (`MEANCYCLE`), duración del sangrado (`LMEN`), intensidad diaria (`M1–M15`, `MEANINTESITY`) y sangrado inusual (`UNUSBLED`). Anonimizado; reuso aceptado en el consentimiento; sin licencia explícita, así que se cita. Descarga manual (bloquea scripts). https://epublications.marquette.edu/data_nfp/7
- **[P56]** Variación del ciclo con datos de la app Clue (arXiv) ⚠️ acceso a los datos no confirmado. https://arxiv.org/abs/1909.11211
- **[P57]** National Health Interview Survey (NHIS): archivos públicos; módulo de dolor y pregunta de sinusitis. https://www.cdc.gov/nchs/nhis/about/index.html · https://nhis.ipums.org/nhis-action/variables/285687
- **[P58]** NHANES ✅ archivos verificados y descargados (§5.6): `FERTIN_J`, `CBC_J`, `DXXFEM_J`, `DXXSPN_J`, `AGQ_D`, `OHXDEN_J`, `ALB_CR_J`, `KIQ_U_J`, `DEMO_J`. Patrón de URL: `https://wwwn.cdc.gov/Nchs/Data/Nhanes/Public/<año>/DataFiles/<ARCHIVO>.xpt`. Portal: https://wwwn.cdc.gov/nchs/nhanes/ · Acuerdo de uso de NCHS (solo análisis estadístico; prohibido intentar identificar personas): https://www.cdc.gov/nchs/policy/data-user-agreement.html
- **[P59]** SWAN, Study of Women's Health Across the Nation, datos públicos (3302 mujeres, transición a la menopausia; incluye pérdida ósea) ✅ ficha revisada: licencia **ODbL 1.0**, acceso "restricted public" (registro en ICPSR). https://catalog.data.gov/dataset/study-of-womens-health-across-the-nation-swan-public-use-data · https://www.icpsr.umich.edu/web/ICPSR/series/253
- **[P60]** Roboflow Universe, UrineStrip: CC BY 4.0, 77 imágenes, 6 clases, 3 modelos entrenados (uso por API) ✅ (página revisada; modelos no probados). https://universe.roboflow.com/daongochuy-r93ia/urinestrip-j7uvp
- **[P61]** Ultralytics (YOLO), licencia AGPL-3.0; los modelos derivados heredan esa licencia. https://github.com/ultralytics/ultralytics

---

## 9. Resumen final: con cuáles vale la pena trabajar y con cuáles no 🔶

**Qué existe de verdad "oficial en vuelo"** para estas 40 variables:
- **Umbrales y reglas oficiales de NASA [A]:** criterios de "contactar al cirujano" (ojo,
  diarrea con fiebre) y la frecuencia de cada problema en el modelo IMM.
- **Datos agregados de astronautas:** promedios y frecuencias (sueño, infecciones
  urinarias, cálculos por sexo, retención urinaria). Sirven para **calibrar y justificar**.
- **No existen datos públicos de cada astronauta en vuelo** para ninguna de estas 40. Por
  eso el modelo se entrena con datos de tierra y se rotula "estimación con datos de
  tierra".

### ✅ Vale la pena: alto valor y poco costo

| Variables | Por qué |
|---|---|
| `R21` + `R06` ciclo, FC y HRV | Evitan falsas alarmas en las astronautas. Si mcPHASES no llega a tiempo, se usa el patrón publicado como regla [P23] |
| `04:A42` ojo · `04:A43` diarrea con fiebre | **Regla oficial de NASA [A]**: casi gratis de construir y fuerte ante el jurado |
| `04:A44` infección respiratoria | Usa signos vitales que el reloj ya mide |
| `04:A22a–j` tira de orina, **entrada manual** | El equipo ya está a bordo; rangos claros; una sola pantalla |
| `04:A40` sueño | El problema más frecuente en vuelo; se comparte con Leo |
| `R01–R03`, `R05`, `R11`, `R12` | Módulo de salud femenina con rangos FIGO claros e inventario de medicamento |
| `04:A43`, `04:A47` con NHANES · `R02–R04`, `R09` con Marquette | **Datos de tierra ya descargados o descargables hoy**: permiten mostrar un modelo real |

### 🟡 Vale la pena solo si sobra tiempo

| Variables | Por qué esperan |
|---|---|
| `04:A48` caries con foto | Dataset abierto y bueno (6313 imágenes), pero entrenar un modelo de imagen lleva tiempo |
| `04:A45`, `04:A46`, `04:A49`, `04:A50`, `R04`, `R07`–`R10`, `R24` | Útiles, pero basta con una regla o un registro; el modelo aporta poco |
| `R22` riesgo de trombosis | Valioso, pero el dataset (MIMIC-IV) requiere credencial; mientras, suma de factores publicados |

### ❌ No vale la pena ahora

| Variables o tarea | Por qué no |
|---|---|
| Leer la tira de orina con la **cámara** | Solo hay 30–77 imágenes abiertas; no alcanza para un modelo confiable |
| `04:A41` modelo de foto de heridas | El dataset (AZH) no tiene licencia |
| Modelos que dependen de **MIMIC-IV** (infección urinaria, respiratoria) | La credencial casi seguro no llega a tiempo |
| Cuestionarios **ISI** (insomnio) y **PSST** (premenstrual) | Requieren licencia; se usa una lista propia sin puntaje |
| `R20` sueño según el ciclo | Sin mcPHASES no hay con qué hacerlo |
| `R18`, `R19`, `R23` como medición en vuelo | Solo se miden en Tierra: entran como **dato del perfil antes del vuelo**, no como módulo |
