# Equipo Monarcas — Asignación de variables

**Proyecto:** NASA Space Apps Challenge 2026 — Health Monitoring Software for Astronauts  
**Fecha:** 14 de noviembre de 2026  
**Estado:** Investigación y búsqueda de datos

## Objetivo

Investigar variables fisiológicas y ambientales que permitan construir un prototipo de monitoreo de salud de astronautas. Cada integrante debe identificar **cómo obtener cada variable**, si existen **datasets o modelos preentrenados**, qué limitaciones tiene su uso en vuelo y qué se puede incorporar de forma realista al software.

Se parte de **364 variables de los cuatro catálogos originales** y se proponen **24 variables nuevas** de salud reproductiva y hormonal: **388 variables de trabajo en total**. Los identificadores deben ir siempre acompañados de su archivo de origen: `01:V1`, `02:V01`, `03:V1`, `04:A1`, `R01`, etc.

> **Importante:** La distribución se basa en el inventario de trabajo. Los rangos de IDs que aparecen en las tablas deben contrastarse con los catálogos originales antes de automatizar una importación. Las variables reproductivas `R01–R24` son propuestas nuevas, no medidas validadas por NASA.

## Equipo y distribución

| Integrante | Variables asignadas | Área de investigación |
|---|---:|---|
| **Julio** | **77** | Cardiovascular, signos vitales, ambiente y carga laboral |
| **Iker** | **77** | Arritmias, trombosis, SANS, cognición y ritmo circadiano |
| **Fani** | **78** | Radiación, huesos, riñón, hematología y hormonas |
| **Leo** | **78** | Músculo, nutrición, metabolismo, sueño y cefalea |
| **Persona 5 (nombre pendiente)** | **78** | Salud mental, sistema inmune, menstruación y síntomas |
| **Total** | **388** | |

---

## 1. Julio — Cardiovascular, signos vitales y ambiente

**Responsabilidad:** Identificar datasets de monitoreo continuo, sensores cardiovasculares, ecocardiografía y condiciones ambientales de la cabina.

| Archivo | IDs | Tema |
|---|---|---|
| `01-cardiovascular-sans-radiacion.md` | `V1–V8` | Presión arterial, FC, volumen sistólico, gasto cardiaco, volumen plasmático y masa corporal |
| 01 | `V9–V18` | Ultrasonido vascular, flujo yugular, vena cava y función ventricular |
| 01 | `V19–V30` | Capacidad aeróbica, rigidez arterial, metabolismo, respiración y fluidos |
| 01 | `V46–V53` | Intolerancia ortostática y presíncope |
| `03-conducta-sueno-cognicion.md` | `V21–V29` | Relaciones, cohesión y desempeño social del equipo |
| 03 | `V53–V60` | Somnolencia, fatiga, carga cognitiva y horas de trabajo |
| `04-inmune-ambiente-equipo-umbrales.md` | `A1–A9` | Signos vitales, cefalea y adaptación espacial |
| 04 | `A23–A35` | CO₂, oxígeno, temperatura, ruido, contaminación y dosimetría ambiental |

**Prioridad de búsqueda:** frecuencia cardiaca, presión arterial, SpO₂, CO₂ de cabina, ecocardiografías y ultrasonido vascular.

**Mayor dificultad:** encontrar imágenes de ultrasonido vascular y mediciones hemodinámicas específicas de astronautas.

## 2. Iker — Arritmias, trombosis, SANS y cognición

**Responsabilidad:** Identificar modelos preentrenados, datasets médicos y algoritmos para procesar señales e imágenes.

| Archivo | IDs | Tema |
|---|---|---|
| 01 | `V31–V45` | Arritmias, ECG, QTc y biomarcadores |
| 01 | `V54–V66` | Trombosis yugular, Doppler y coagulación |
| 01 | `V67–V89` | SANS, OCT, nervio óptico, retina y cambios visuales |
| 03 | `V44–V48` | Ritmo circadiano, melatonina, cortisol y temperatura |
| 03 | `V65–V81` | Cognición, atención, memoria, PVT y desempeño |
| 04 | `A36–A39` | Descompresión y barotrauma |

**Prioridad de búsqueda:** ECG, Doppler, OCT, imágenes oculares y pruebas cognitivas reproducibles.

**Mayor dificultad:** imágenes de Doppler y SANS etiquetadas, sobre todo las obtenidas en misiones espaciales.

## 3. Fani — Radiación, huesos, riñón, sangre y hormonas

**Responsabilidad:** Investigar radiación espacial, laboratorio, salud ósea y renal, y biomarcadores hormonales.

| Archivo | IDs | Tema |
|---|---|---|
| 01 | `V90–V107` | Dosis de radiación, exposición solar y efectos biológicos |
| 01 | `V108–V118` | Anemia espacial, hemoglobina, hematocrito y eritrocitos |
| 02 | `V01–V16` | Densidad ósea, fracturas y metabolismo óseo |
| 02 | `V17–V39` | Riñón, cálculos, hidratación y química urinaria |
| 03 | `V84–V88` | Clasificación de cefalea y medicamentos |
| Nuevo bloque | `R13–R17` | Estradiol, progesterona, LH/FSH, testosterona y prolactina |

**Prioridad de búsqueda:** dosimetría, biometría hemática, densidad mineral ósea, análisis de orina, ultrasonido renal y datos hormonales.

**Mayor dificultad:** muchos análisis sanguíneos y hormonales no están disponibles de forma rutinaria en tiempo real durante el vuelo.

## 4. Leo — Músculos, nutrición, metabolismo y sueño

**Responsabilidad:** Datos de rendimiento físico, actividad, sueño, nutrición y cambios musculares.

| Archivo | IDs | Tema |
|---|---|---|
| 02 | `V40–V57` | Fuerza muscular, masa muscular, VO₂máx y ejercicio |
| 02 | `V58–V66` | Columna, dolor lumbar y discos intervertebrales |
| 02 | `V67a–V74` | Equilibrio, marcha y adaptación sensoriomotora |
| 02 | `V75–V85` | Nutrición, minerales, hierro y alimentación |
| 02 | `V86–V93` | Glucosa, insulina y metabolismo |
| 02 | `V94–V97` | Lesiones relacionadas con ejercicio y trajes EVA |
| 03 | `V30–V43` | Calidad, duración, eficiencia y arquitectura del sueño |
| 03 | `V49–V50` | Iluminación y exposición lumínica |
| 03 | `V82–V83` | Frecuencia e intensidad de cefaleas |

**Prioridad de búsqueda:** datos de sueño y ejercicio de wearables, glucosa, alimentación y ultrasonido muscular.

**Mayor dificultad:** cuantificar atrofia muscular con imagen, posturografía y arquitectura del sueño.

## 5. Persona 5 — Salud mental, sistema inmune y salud menstrual

**Nombre:** pendiente de asignar.  
**Responsabilidad:** Investigar cuestionarios, indicadores psicológicos, inmunología, síntomas, salud reproductiva y ciclo menstrual.

| Archivo | IDs | Tema |
|---|---|---|
| 03 | `V1–V20` | Ansiedad, depresión, estrés, estado de ánimo y HRV |
| 03 | `V51–V52` | Regularidad circadiana y cambios de horarios |
| 03 | `V61–V64` | Fatiga, vigilia, cafeína y estimulantes |
| 04 | `A13–A21` | Inflamación, infecciones, virus, dermatología y microbioma |
| 04 | `A22a–A22j` | Parámetros de tira de orina |
| 04 | `A40–A50` | Problemas agudos, lesiones, infecciones y síntomas |
| Nuevo bloque | `R01–R12` | Ciclo menstrual, sangrado, dolor y anticoncepción |
| Nuevo bloque | `R18–R24` | Menopausia, sueño, HRV, trombosis, hueso y síntomas ginecológicos |

**Prioridad de búsqueda:** PHQ-9/GAD-7 y otras escalas con licencia adecuada, HRV, síntomas, ciclo menstrual, anticoncepción e imágenes de piel.

**Mayor dificultad:** datos longitudinales sobre menstruación durante vuelos espaciales y mediciones inmunológicas reales.

---

## 6. Nuevas variables de salud menstrual, reproductiva y hormonal

Estas 24 variables complementan los catálogos originales.

| ID | Variable | Responsable | Captura | Dificultad |
|---|---|---|---|---|
| R01 | Fecha de última menstruación | Persona 5 | Manual | Fácil |
| R02 | Duración habitual del ciclo | Persona 5 | Manual | Fácil |
| R03 | Duración del sangrado | Persona 5 | Manual | Fácil |
| R04 | Intensidad del sangrado | Persona 5 | Manual | Fácil |
| R05 | Regularidad menstrual | Persona 5 | Historial/cálculo | Fácil |
| R06 | Fase estimada del ciclo (no confirma ovulación) | Persona 5 | Cálculo | Media |
| R07 | Dolor menstrual, escala 0–10 | Persona 5 | Cuestionario | Fácil |
| R08 | Síntomas premenstruales | Persona 5 | Cuestionario | Fácil |
| R09 | Sangrado intermenstrual o inesperado | Persona 5 | Manual | Fácil |
| R10 | Ausencia de menstruación y contexto | Persona 5 | Manual | Fácil |
| R11 | Anticonceptivos hormonales, tipo y régimen | Persona 5 | Historial | Fácil |
| R12 | Supresión menstrual voluntaria | Persona 5 | Historial | Fácil |
| R13 | Estradiol | Fani | Laboratorio | Difícil |
| R14 | Progesterona | Fani | Laboratorio | Difícil |
| R15 | LH y FSH | Fani | Laboratorio | Difícil |
| R16 | Testosterona total/libre | Fani | Laboratorio | Difícil |
| R17 | Prolactina | Fani | Laboratorio | Difícil |
| R18 | Estado menopáusico y terapia hormonal | Persona 5 | Historial | Fácil |
| R19 | Hemoglobina/ferritina en relación con sangrado | Persona 5, consulta Fani | Laboratorio | Difícil |
| R20 | Sueño según ciclo/tratamiento hormonal | Persona 5, consulta Leo | Wearable e historial | Media |
| R21 | FC y HRV según ciclo | Persona 5 | Wearable | Media |
| R22 | Factores de riesgo trombótico y tratamiento hormonal | Persona 5, consulta Iker | Historial | Difícil |
| R23 | Densidad ósea y estado hormonal | Persona 5, consulta Fani | DXA e historial | Difícil |
| R24 | Síntomas urinarios y ginecológicos | Persona 5 | Cuestionario | Fácil |

**Criterio clínico:** Registrar por separado los datos relevantes para valores de referencia, el estado hormonal y el historial reproductivo. No asumir que todas las mujeres menstrúan ni inferir identidad de género a partir de datos fisiológicos. Los datos sensibles deben tratarse con privacidad y acceso mínimo.

### Revisión transversal de diferencias por sexo

| Responsable | Qué debe revisar |
|---|---|
| Julio | Respuesta cardiovascular e intolerancia ortostática |
| Iker | SANS, trombosis y anticoncepción hormonal |
| Fani | Anemia, densidad ósea, radiación y hormonas sexuales |
| Leo | Masa muscular, metabolismo, sueño y ciclo hormonal |
| Persona 5 | Ciclo menstrual, salud reproductiva, menopausia y síntomas |

---

## 7. Entregables obligatorios

Cada integrante debe documentar **todas** las variables asignadas; no es obligatorio encontrar un dataset independiente para cada una.

### Tabla de investigación

Usar una fila por variable con estas columnas:

| Campo | Qué incluir |
|---|---|
| `id` | ID con origen, por ejemplo `01:V31` o `R07` |
| `nombre` | Nombre técnico |
| `unidad` | Unidad, rango o categoría |
| `metodo_captura` | Manual, wearable, ultrasonido, imagen, laboratorio, nave, calculado |
| `fuente` | URL del artículo, norma o documentación |
| `dataset_url` | URL de descarga; `NO DISPONIBLE` si no se encontró |
| `formato` | CSV, JSON, DICOM, PNG, video, señal ECG, etc. |
| `modelo_existente` | Repositorio/pesos/licencia si hay un modelo listo para ejecutar |
| `umbral` | Referencia clínica, criterio NASA o sin umbral validado |
| `validacion` | NASA/astronautas, terrestre o experimental |
| `factibilidad_vuelo` | Directa, indirecta, solo tierra, no verificada |
| `dificultad` | Fácil, media, difícil, muy difícil |
| `utilidad` | Qué problema ayuda a identificar o seguir |
| `estado` | Pendiente, fuente encontrada, datos descargados, probado |
| `observaciones` | Sesgos, calidad, tamaños muestrales, limitaciones |

### Checklist por integrante

- [ ] Revisé todas mis variables y confirmé su significado.
- [ ] Documenté unidades y método de medición.
- [ ] Enlacé fuentes primarias y criterios de referencia.
- [ ] Busqué datasets reales y verifiqué sus licencias.
- [ ] Distinguí medición directa, cálculo y estimación.
- [ ] Identifiqué modelos preentrenados que realmente puedan ejecutarse.
- [ ] Documenté limitaciones de uso en vuelo y de validez clínica.
- [ ] Añadí instrucciones reproducibles de descarga o prueba.

## 8. Prioridades y reparto de dificultad

| Integrante | Variables candidatas a prueba | Investigación avanzada |
|---|---:|---|
| Julio | 8–12 | Ecocardiografía, Doppler y hemodinámica |
| Iker | 5–8 | OCT, Doppler, SANS y modelos de ECG |
| Fani | 5–8 | Radiación, biomarcadores, análisis de laboratorio |
| Leo | 8–12 | Ultrasonido muscular y posturografía |
| Persona 5 | 8–12 | Inmunología, salud hormonal y análisis de voz |

**Las metas son orientativas:** la exigencia debe equilibrarse por dificultad y calidad de los resultados, no por cantidad de archivos descargados.

### Criterios de evaluación

- **40 %** documentación y cobertura de variables.
- **30 %** datos o modelos reutilizables.
- **20 %** calidad, fuentes y reproducibilidad.
- **10 %** limitaciones y viabilidad para el prototipo.

## 9. Alcance del prototipo

Para avanzar rápidamente en el hackatón:

1. **No** intentar desarrollar 388 módulos de medición.
2. Priorizar variables obtenibles por wearables, cuestionarios, ultrasonido o telemetría.
3. Reutilizar modelos preentrenados, sin comprometer tiempo en entrenamiento desde cero.
4. Crear una interfaz mínima para importar datos, ejecutarlos y mostrar resultados.
5. Distinguir datos reales, simulados, calculados y estimados.
6. **No** mostrar probabilidades médicas como riesgos clínicos calibrados salvo que exista validación adecuada.
7. Comparar con la línea base individual y señalar cuándo se utilizan umbrales terrestres no validados en microgravedad.

## 10. Archivos fuente

- [`00-indice-priorizado.md`](./00-indice-priorizado.md)
- [`01-cardiovascular-sans-radiacion.md`](./01-cardiovascular-sans-radiacion.md)
- [`02-hueso-musculo-rinon-nutricion.md`](./02-hueso-musculo-rinon-nutricion.md)
- [`03-conducta-sueno-cognicion.md`](./03-conducta-sueno-cognicion.md)
- [`04-inmune-ambiente-equipo-umbrales.md`](./04-inmune-ambiente-equipo-umbrales.md)

> Si la organización de carpetas cambia, actualizar los enlaces relativos. Estos documentos siguen siendo la referencia de detalle para unidades, fuentes y descripciones de las variables originales.
