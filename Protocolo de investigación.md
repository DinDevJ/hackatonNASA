# Protocolo de investigación

**LUNNA · software de monitoreo de salud para misiones espaciales**  
Equipo Monarcas · NASA Space Apps Challenge 2026  
Versión documental: 15 de noviembre de 2026

> **Alcance y seguridad.** Este documento describe un prototipo académico, sus datos,
> reglas y fuentes. No es un dispositivo médico, no diagnostica y no sustituye a la
> tripulación médica. Las mediciones de la tripulación y las misiones del simulador
> son sintéticas. Los eventos solares consultados de NASA DONKI son registros reales,
> pero las dosis y respuestas de la tripulación mostradas en pantalla son simuladas.
> Los umbrales terrestres se identifican como tales y no se presentan como límites
> clínicos validados para vuelos espaciales.

## 1. Propósito y pregunta de investigación

### Problema

En una misión larga, un valor de referencia poblacional puede no representar el
estado habitual de una persona. Además, la comunicación con Tierra puede sufrir
retardo o interrupciones. LUNNA explora una vigilancia local que:

1. compare cada variable con el basal y la respuesta esperada de cada tripulante;
2. explique qué evidencia produjo una alerta;
3. conserve la telemetría y comunique con Tierra mediante una cola con prioridad y
   retardo configurable.

### Pregunta

¿Puede una tubería local reproducible integrar telemetría, basales individuales,
referencias explícitas y umbrales diferenciados para señalar desviaciones sin
confundir un cambio esperado por el entorno con una anomalía?

### Objetivos

- Normalizar datos de sensores, lecturas manuales y datos derivados con procedencia,
  unidad y hora del evento.
- Combinar una predicción individual bayesiana con umbrales absolutos de referencia.
- Presentar estados, incertidumbre, procedencia y limitaciones en las interfaces de
  tripulación, CMO y Tierra.
- Simular el retardo de comunicaciones y las interrupciones del enlace.

El éxito actual es de **integración de software y demostración**, no de predicción
clínica: los escenarios son deliberados y sintéticos, y no existe validación
prospectiva en astronautas.

## 2. Alcance y fuentes de verdad

Los catálogos de investigación no equivalen a variables implementadas. Para evitar
mezclarlos, este protocolo separa tres alcances:

| Alcance | Fuente de verdad | Qué significa |
|---|---|---|
| Variables y priores que la central puede evaluar al arrancar | [`Planeacion/Julio/backend/semillas/inicial.json`](Planeacion/Julio/backend/semillas/inicial.json) y [`Planeacion/Julio/backend/semillas/medibles.json`](Planeacion/Julio/backend/semillas/medibles.json) | Siete identificadores registrados: seis valores medidos y una variable calculada. Las personas, basales y la mayoría de los priores son provisionales/sintéticos. |
| Indicadores de la maqueta de tripulación | [`Planeacion/Leo/maqueta-eva/motor.js`](Planeacion/Leo/maqueta-eva/motor.js) y [`datos.js`](Planeacion/Leo/maqueta-eva/datos.js) | Diez indicadores principales del escenario, además de formularios y señales ambientales. No todos se envían a la base del backend. |
| Evidencia y asociaciones de investigación | [`Planeacion/VARIABLES-MEDIDAS-ASTRONAUTAS.csv`](Planeacion/VARIABLES-MEDIDAS-ASTRONAUTAS.csv), [`Planeacion/Iker/iker_variables.csv`](Planeacion/Iker/iker_variables.csv), [`Planeacion/PADECIMIENTOS.csv`](Planeacion/PADECIMIENTOS.csv) y [`Planeacion/PADECIMIENTO-VARIABLE.csv`](Planeacion/PADECIMIENTO-VARIABLE.csv) | Catálogos amplios con fuentes y notas, no una declaración de que todas esas mediciones estén conectadas al sistema. |
| Pesos por malestar | [`Planeacion/Leo/modelo-pesos/generar_pesos.py`](Planeacion/Leo/modelo-pesos/generar_pesos.py), [`pesos.csv`](Planeacion/Leo/modelo-pesos/pesos.csv) y [`pesos.json`](Planeacion/Leo/modelo-pesos/pesos.json) | Nueve predictores candidatos y once malestares en una matriz de 99 celdas. La consola calcula un índice ponderado; el actualizador bayesiano de pesos es una implementación de referencia, no el cálculo de ese índice en producción. |

El catálogo de astronautas contiene 388 filas de variables; el archivo de Iker contiene
77 fichas; la matriz `PADECIMIENTO-VARIABLE.csv` tiene 348 asociaciones para 20
padecimientos. Las fuentes y sus limitaciones se conservan en esas filas. Este
documento no copia las 388 fichas: identifica las variables que usa el programa y
enlaza el catálogo original como referencia completa.

## 3. Variables que evalúa el backend

El backend parte de tres esquemas de transmisión, siete variables registradas y
cuatro tripulantes ficticios. La tabla describe las variables del esquema base y su
procedencia actual, no una especificación de sensores certificados.

| ID | Variable | Unidad | Cómo se representa / se mide en el prototipo | Papel y fuente |
|---|---|---:|---|---|
| `04:A4` | Frecuencia cardiaca | lpm | `u8`; playera con ECG y reloj con PPG según `medibles.json`; el simulador produce valores sintéticos. | Telemetría de signo vital. Umbral terrestre configurado desde MedlinePlus. El catálogo no encuentra un cambio instantáneo en vuelo con dispersión para formar un prior poblacional fiable. |
| `04:A3` | SpO₂ | % | `u8`; referencia: reloj con PPG rojo/infrarrojo; el simulador produce valores sintéticos. | Telemetría de oxigenación. El catálogo advierte que NASA fija límites de exploración sobre oxígeno inspirado (PIO₂), no sobre una lectura de SpO₂ de muñeca. |
| `04:A2` | Frecuencia respiratoria | resp/min | `u8`; banda torácica en el escenario de la playera. | Telemetría. La referencia de vuelo documenta equipos/mediciones, pero no aporta aquí una magnitud y dispersión suficientes para el prior usado. |
| `04:A1` | Temperatura corporal | °C | `i16` con factor `0,01`; referencia de `medibles.json`: termómetro axilar de la playera. | Telemetría. **Incompatibilidad de medición por resolver:** el prior de semillas cita un aumento de temperatura central medido en frente, no una temperatura axilar; no son intercambiables. |
| `01:V1` | Presión sistólica | mmHg | `u8`; brazalete oscilométrico. | Telemetría cada vez que se mide. El prototipo usa el primer campo del brazalete y un prior relativo derivado de un cambio reportado en vuelo. |
| `X:PAD` | Presión diastólica | mmHg | `u8`; segundo campo del brazalete. `X:` identifica una variable añadida por el equipo. | Telemetría. Es parte del esquema aunque el catálogo agrupe ambas presiones bajo `01:V1`. |
| `X:PAM` | Presión arterial media | mmHg | Campo virtual: `round((sis + 2 * dia) / 3 * 10) / 10`. No ocupa bytes de carga. | Derivada en la central. La semilla estima el cambio desde sistólica/diastólica; el catálogo advierte que el término “media” en su fuente no demuestra que se haya usado esta fórmula. |

### 3.1 Basales de arranque

Valores cargados desde `inicial.json`; son datos sintéticos para probar el flujo y no
rangos clínicos ni mediciones de personas reales.

| Tripulante ficticio | FC (`04:A4`) | SpO₂ (`04:A3`) | FR (`04:A2`) | Temperatura (`04:A1`) | Sistólica (`01:V1`) | Diastólica (`X:PAD`) | PAM (`X:PAM`) |
|---|---:|---:|---:|---:|---:|---:|---:|
| Tomás | 58 lpm | 98 % | 13 resp/min | 36,6 °C | 122 mmHg | 78 mmHg | 92,7 mmHg |
| Ana | 62 lpm | 98 % | 14 resp/min | 36,6 °C | 115 mmHg | 75 mmHg | 88,3 mmHg |
| Mei | 60 lpm | 98 % | 14 resp/min | 36,7 °C | 118 mmHg | 76 mmHg | 90,0 mmHg |
| Luis | 64 lpm | 97 % | 15 resp/min | 36,5 °C | 125 mmHg | 80 mmHg | 95,0 mmHg |

El simulador asigna nombres, edad, sexo, altura, peso y grupo sanguíneo sintéticos.
Los coeficientes beta por covariable no están informados en estos priores y por tanto
se toman como cero; el grupo sanguíneo no entra en el modelo.

### 3.2 Priores de adaptación sembrados

`μ₀` representa el cambio esperado respecto del basal; `τ₀`, la dispersión del cambio
entre personas; `σ_misión`, la variación de una persona entre misiones; `σ_día`, el
ruido diario. Los `τ` y `σ` marcados como supuestos no deben interpretarse como
estimaciones clínicas verificadas.

| Variable | Escala | μ₀ | τ₀ | σ_misión | σ_día | Nota de procedencia |
|---|---|---:|---:|---:|---:|---|
| FC | Relativa | 0 | 0,10 | 0,03 | 0,04 | Prior no informativo; parámetros de dispersión supuestos. |
| SpO₂ | Relativa | 0 | 0,02 | 0,01 | 0,01 | Prior no informativo; parámetros supuestos. |
| Frecuencia respiratoria | Relativa | 0 | 0,10 | 0,05 | 0,08 | Catálogo describe descenso en vuelo (`n=8`), sin magnitud encontrada; dispersión supuesta. |
| Temperatura | Absoluta | +1,0 °C | 0,40 °C | 0,20 °C | 0,25 °C | Aumento central aproximado en vuelo largo (`n=11`); magnitudes de dispersión supuestas y sensor distinto al de la playera. |
| Sistólica | Relativa | −0,067 (−6,7 %) | 0,05 | 0,03 | 0,05 | −8 mmHg sobre 120 mmHg, `n=8`; `τ₀` supuesto. |
| Diastólica | Relativa | −0,1125 (−11,25 %) | 0,05 | 0,03 | 0,05 | −9 mmHg sobre 80 mmHg, `n=8`; `τ₀` supuesto. |
| PAM | Relativa | −0,093 (−9,3 %) | 0,05 | 0,03 | 0,05 | Derivada de cambios de presión; la fuente no desambigua cómo calculó “media”; `τ₀` supuesto. |

El código genera priores para Tierra, órbita, tránsito, Luna y Marte. Tierra usa
cambio esperado cero respecto del basal. Órbita usa el prior de la semilla. Tránsito
duplica `τ₀` por 1,5 y Luna/Marte por 2; estos entornos se etiquetan como
extrapolados por falta de datos humanos. No representan mediciones de esos entornos.

### 3.3 Umbrales absolutos configurados

El backend carga referencias desde `medibles.json`; el tipo `T` significa umbral
clínico terrestre y `A` significaría validado en astronautas. Los umbrales que siguen
son referencias terrestres o propuestas, no límites NASA validados en vuelo.

| Variable | Umbral ámbar configurado | Umbral rojo configurado | Referencia / precaución |
|---|---|---|---|
| FC (`04:A4`) | >100 lpm | No configurado | [MedlinePlus · signos vitales](https://medlineplus.gov/ency/article/002341.htm). El catálogo condiciona la taquicardia en reposo a una media de 24 h >90 lpm; el prototipo no implementa esa condición adicional. |
| SpO₂ (`04:A3`) | <92 % | <88 % | [MedlinePlus · pulsioximetría](https://medlineplus.gov/lab-tests/pulse-oximetry/). Propuesta terrestre; la oximetría de muñeca no debe ser la única señal de hipoxia. |
| Frecuencia respiratoria (`04:A2`) | >18 resp/min | No configurado | [MedlinePlus · signos vitales](https://medlineplus.gov/ency/article/002341.htm). El catálogo da 12–18/min como referencia terrestre; no se codifica límite inferior. |
| Temperatura (`04:A1`) | >39,4 °C | >40,6 °C | [MedlinePlus · fiebre](https://medlineplus.gov/ency/article/003090.htm). Confirmar con termómetro; temperatura axilar y central no equivalen. |
| Sistólica (`01:V1`) | <90 o >140 mmHg | <70 o >180 mmHg | [CDC · presión alta](https://www.cdc.gov/high-blood-pressure/about/index.html). Límites terrestres de la referencia del proyecto. |
| Diastólica (`X:PAD`) | <60 o >90 mmHg | >120 mmHg | [CDC · presión alta](https://www.cdc.gov/high-blood-pressure/about/index.html). No hay límite rojo bajo configurado en la semilla. |
| PAM (`X:PAM`) | Sin umbral | Sin umbral | Calculada; no se cargó un umbral de referencia. |

**Detalle importante de implementación:** `evaluarUmbral` comprueba estrictamente
`valor < mínimo` o `valor > máximo`. Por ello un valor exactamente igual a un límite
no dispara el umbral, aunque el texto de la fuente use “≤” o “≥”. Debe resolverse
esa diferencia semántica antes de tratar la interfaz como un monitor clínico.

## 4. Indicadores de la maqueta de tripulación

El motor del navegador define estos diez indicadores. El escenario asigna perfiles y
valores reproducibles con una semilla de pseudorandom; no son muestras fisiológicas
reales. La columna de “ID” es la vinculación escrita en el motor, no garantía de que
cada señal llegue hoy desde un dispositivo físico.

| Indicador | ID del motor | Unidad | Captura / cálculo del escenario | Reglas relevantes |
|---|---|---:|---|---|
| Sueño | `03:V30` | h | Actigrafía simulada; el texto de producto menciona movimiento de muñeca y horarios. | Normal personal robusta. |
| Reflejos PVT-B | `03:V66` | lapsos | Prueba de reacción de 3 min simulada/manual; lapsos definidos como respuestas >355 ms. | Señal del episodio FATIGA-03. |
| Ánimo/estrés | `03:V9` | escala 0–100 | Check-in simulado/autoinformado. | Privacidad: sólo tendencia agregada para CMO según el README de la maqueta. |
| Pulso en reposo | `01:V3` | lpm | Mediana de los 30 min más bajos durante sueño, simulada. | Umbral terrestre >100 lpm; variable distinta de FC instantánea `04:A4`. |
| HRV | `03:V17` | ms | RMSSD nocturno simulado. | El README de pesos indica que el reloj disponible no entrega intervalos RR; por ello HRV no está en la matriz de pesos activa. |
| Presión arterial | `01:V1` | mmHg | Manguito/manual en la maqueta. | Sin normal personal en esa pantalla; usa referencia terrestre AHA/CDC configurada por el motor. |
| SpO₂ | `04:A3` | % | Sensor PPG simulado. | Umbrales propuestos: ≤92 % atención y ≤88 % urgente en el texto; mostrar la advertencia de sensor de muñeca. |
| Respiración | `04:A2` | rpm | Estimación/serie simulada. | La pantalla cita Smart Fusion; no confundir valor estimado con medición directa. |
| Glucosa en ayunas | `02:V86` | mg/dL | Glucómetro/manual simulado, cada dos días en el escenario. | La maqueta muestra cortes terrestres de ADA, no validación espacial. |
| Temperatura de piel | `04:A1` | °C | Sensor/serie de piel simulada. | Sólo comparable con la línea base de piel; no equivale a temperatura central ni a la temperatura axilar descrita en otra referencia. |

La maqueta también muestra agua, ejercicio/fuerza, síntomas, alimentos, masa corporal,
diario, orina y salud menstrual; algunos son formularios, metas o datos simulados y
no son entradas activas del clasificador del backend. La pantalla describe, por
ejemplo, una meta de 3035 kcal y fuerza objetivo de 1,6× el peso como elementos del
escenario/producto, no como valores generados o validados por el modelo backend.

### Valores importantes del escenario

- La normal del motor visual utiliza los 14 días anteriores y exige al menos 7 días
  con datos. Se usa una desviación robusta; los pisos de MAD dependen de la señal.
- El episodio sintético FATIGA-03 de Ana ocurre en el día 112: sueño `z=−2,4`,
  lapsos PVT-B `z≈+2,0` y pulso en reposo `z≈+2,2`. Ninguna señal individual llega
  a `|z|=3`; la combinación de tres señales `|z|≥2` activa atención. El evento se
  cierra después de dos días seguidos por debajo de `z=2`.
- La presión sistólica de Luis entre 130 y 139 mmHg produce atención por umbral
  terrestre en la maqueta.
- Los días 113–114 modelan mejoría/cierre de fatiga.
- Día 115: se modela un evento de partículas solares usando como referencia el
  evento DONKI `2024-05-11T02:10:00-SEP-001`. La tasa, la dosis, el refugio, los
  tiempos de respuesta y la dosis acumulada son supuestos de escenario.

## 5. Variables de la matriz de padecimientos

### 5.1 Nueve predictores candidatos en `pesos.csv`

La matriz de Leo tiene once malestares × nueve predictores (99 celdas). Peso 0–3,
dirección fisiológica y nivel de evidencia A/B/C se conservan por celda.

Los once malestares contenidos en esa matriz son: arritmia/fibrilación auricular;
desacondicionamiento e intolerancia ortostática; hipoxia/problema respiratorio;
infección/fiebre/desregulación inmune; pérdida de sueño y desalineación circadiana;
fatiga/deterioro cognitivo; exposición a CO₂/cefalea; radiación aguda por evento
solar; estrés/salud conductual; enfermedad por descompresión tras EVA; y trombosis
yugular/SANS (combinados en una sola entrada de la matriz).

| Predictor | ID/catálogo citado | Significado y estado en el prototipo |
|---|---|---|
| `fc_reposo` | `04:A4 / 01:V3` | FC/FC en reposo; la instantánea `04:A4` y la basal `01:V3` son conceptos distintos. |
| `spo2` | `04:A3` | Saturación periférica de oxígeno. |
| `respiracion` | `04:A2` | Frecuencia respiratoria. |
| `temperatura` | `04:A1` | La matriz no elimina la distinción entre temperatura central, de piel y axilar; hay que documentar la medición usada. |
| `presion_arterial` | `01:V1` | Presión en reposo; algunos fenómenos requieren medición ortostática que no existe en la serie diaria. |
| `sueno` | `03:V30` | Duración del sueño. |
| `pvt_lapsos` | `03:V66` | Lapsos del test PVT-B. |
| `co2_cabina` | `04:A23` | Presión parcial de CO₂ en cabina; en el motor actual del índice aparece como lectura del escenario, no como telemetría backend. |
| `sintomas` | `02:V67a`, `03:V82`, `04:A40–A50` | Familia de síntomas; la consola anota que aún no llegan al índice vivo y los trata como faltantes. |

En la interfaz de la consola, el índice disponible no es una probabilidad:

1. Convierte la desviación personal a puntos `x∈{0,1,2,3}` por bandas de `|z|`:
   `<1 → 0`, `[1,2) → 1`, `[2,3) → 2`, `≥3 → 3`, sólo en la dirección configurada.
2. Para indicadores absolutos como presión y SpO₂ usa el nivel de umbral convertido
   a `0`, `2` o `3`; el CO₂ del escenario obtiene 2 puntos cuando supera 3 mmHg.
3. Calcula `índice = Σ(peso × puntos) / Σ(peso × 3)` sobre las señales disponibles.
   Informa la cobertura; si falta el predictor de peso máximo, marca el resultado
   incompleto. Una proyección lineal a tres días está rotulada como ilustrativa.

Los pesos tienen 54 celdas con peso positivo y 45 descartadas; niveles: 11 A, 14 B y
29 C entre las celdas positivas. A = relación medida, B = mecanismo documentado,
C = juicio del equipo. La mayoría de los pesos no procede de una relación
cuantificada directa.

### 5.2 Modelo bayesiano de pesos: referencia experimental, no puntuación activa

`actualizacion_bayesiana.py` implementa un actualizador logístico bayesiano en Python
puro y su ejemplo usa 600 observaciones **generadas artificialmente**. La consola
web ejecuta el índice normalizado de arriba; no se debe describir el ejemplo como un
entrenamiento con datos de vuelo ni como la probabilidad que se muestra en vivo.

Para una etiqueta binaria `y` de malestar y vector de puntos `x`:

```text
η = β₀ + Σᵥ βᵥ xᵥ
P(y=1 | x) = σ(η) = 1 / (1 + exp(−η))
κ = ln(20) / 9 ≈ 0,333
βᵥ ~ Normal(κ · prior_mediaᵥ, (κ · prior_deᵥ)²)
β₀ ~ Normal(logit(p₀), 1)
```

Con datos etiquetados, se maximiza la log-verosimilitud logística penalizada por el
prior (MAP); la covarianza posterior se aproxima mediante Laplace:

```text
β̂ = argmax { Σ[y log σ(η) + (1−y) log(1−σ(η))]
              − ½(β−μ)ᵀΣ⁻¹(β−μ) }
Σ_post = (Xᵀ W X + Σ⁻¹)⁻¹,  W = diag(p(1−p))
```

La escala `κ` hace corresponder un incremento extremo de nueve puntos de predictor
con momios ×20, como decisión del equipo. La ejecución de demostración genera datos
simulados para infección y sirve para ilustrar regularización/actualización; no hay
un flujo de etiquetas reales ni aprendizaje de pesos desplegado en la central.

### 5.3 Veinte padecimientos del catálogo de investigación

`PADECIMIENTOS.csv` tiene 20 entradas. La lista no afirma que el prototipo diagnostique
o estime esos padecimientos.

| ID | Padecimiento | Nota de alcance |
|---|---|---|
| P01 | Arritmia / fibrilación auricular | Detección investigada; no diagnóstico. |
| P02 | Desacondicionamiento e intolerancia ortostática | La prueba ortostática no está en telemetría diaria. |
| P03 | Hipoxia / problema respiratorio | El proyecto distingue SpO₂ de presión parcial de oxígeno ambiental. |
| P04 | Infección, fiebre o desregulación inmune | Temperatura y síntomas no son confirmación etiológica. |
| P05 | Pérdida de sueño y desalineación circadiana | Sueño medido/simulado; fase circadiana no es variable activa. |
| P06 | Fatiga y deterioro cognitivo | Escenario de señales combinadas; no modelo clínico validado. |
| P07 | Exposición a CO₂ / cefalea | Señal ambiental y síntoma; CO₂ requiere sensor de cabina. |
| P08 | Radiación aguda por evento solar | DONKI describe eventos del Sol, no dosis personal. |
| P09 | Estrés / salud conductual | Check-in con privacidad, simulado en el prototipo. |
| P10 | Enfermedad por descompresión tras EVA | Sin sensor/algoritmo diagnóstico implementado. |
| P11 | Trombosis yugular | Vigilancia investigada; no inferible con las variables presentes. |
| P12 | SANS / presión intracraneal | Equipo especializado; no es una variable de monitorización del prototipo. |
| P13 | Cálculos renales y deshidratación | Orina/hidratación son áreas de interfaz, no predicción validada. |
| P14 | Pérdida de densidad ósea | Requiere seguimiento especializado; no se infiere de la telemetría básica. |
| P15 | Atrofia muscular y pérdida de capacidad aeróbica | El ejercicio mostrado no equivale a medición de masa/VO₂. |
| P16 | Mareo espacial (SMS) | Registro de síntomas; no diagnóstico automatizado. |
| P17 | Anemia espacial | Sin variable de laboratorio activa. |
| P18 | Dolor de espalda y elongación de columna | Síntoma/área de investigación, no diagnóstico. |
| P19 | Nutrición inadecuada y pérdida de masa corporal | Formularios/metas de interfaz no son un modelo validado. |
| P20 | Metabolismo de la glucosa / resistencia a la insulina | La maqueta admite glucosa; no hay predictor backend sembrado. |

**Diferencia entre catálogos:** el archivo `pesos.csv` agrega trombosis yugular y SANS
como un único malestar número 11 (“Trombosis yugular y SANS”), mientras
`PADECIMIENTOS.csv` los separa en P11 y P12. La matriz usa sus propios IDs 1–11;
no deben mapearse por número a P01–P20 sin una tabla de correspondencia acordada.

## 6. Modelo matemático implementado en la central

### 6.1 Cambio esperado individual

Para un valor `x`, basal `b` y escala del prior:

```text
Δ = x/b − 1          (escala relativa)
Δ = x − b            (escala absoluta)
```

El prior de población puede ajustarse por covariables centradas (edad 35 años,
peso 70 kg, altura 1,70 m; sexo femenino mediante indicador). Si el prior no declara
coeficientes beta, éstos son cero. El grupo sanguíneo se excluye por falta de
evidencia de que prediga la adaptación.

Las tres fuentes se combinan por precisión:

```text
q₀ = 1/τ₀²
qₕ = n_historial/σ_misión²
qᶠ = n_calibración/σ_día²
μ = (q₀ μ₀ + ΣΔ_hist/σ_misión² + ΣΔ_cal/σ_día²) / (q₀+qₕ+qᶠ)
τ = sqrt(1/(q₀+qₕ+qᶠ))
```

Las tres fuentes son prior poblacional, cambios en misiones previas de esa persona y
calibración individual. La calibración usa la mediana de cada día durante los
primeros 14 días del entorno y luego se congela. Se congela para evitar que una
deriva lenta (por ejemplo, fatiga progresiva) sea absorbida indefinidamente como
nueva normalidad.

El valor esperado se devuelve a unidades originales: `b(1+μ)` en escala relativa o
`b+μ` en escala absoluta. Para una medición diaria nueva, el intervalo predictivo es:

```text
SD_pred = sqrt(τ² + σ_día²)
banda_95 = valor(μ ± 1,96 · SD_pred)
```

`banda_95` describe incertidumbre predictiva del modelo y ruido diario; no es un
intervalo de referencia clínica.

### 6.2 Vigilancia, estados y alertas

- El criterio personal compara la **mediana válida de 24 h** con el valor esperado,
  una vez terminada la calibración y con al menos tres muestras válidas:

  ```text
  z = (Δ_observada − μ) / sqrt(τ² + σ_día²)
  ```

- Estados personales: `verde` si `|z|<2`, `ámbar` si `2≤|z|<3` y `rojo` si
  `|z|≥3`.
- `prob_nominal = 1 − erf(|z|/√2)` es una cola bilateral normal aproximada: indica
  cuán compatible es esa desviación con la hipótesis nominal. **No es una
  probabilidad posterior de padecimiento ni un diagnóstico.**
- El criterio absoluto usa la mediana de hasta cinco muestras válidas dentro de
  diez minutos; exige al menos tres. Puede actuar durante calibración o cuando no
  hay prior individual.
- “Válida” significa valor no nulo y, si viene el campo de calidad `contacto`, que
  éste no sea falso. Una señal estimada se rechaza si no trae método o `ic95`.
- El estado final es el peor de los criterios personal y absoluto. Se genera una
  nueva alerta cuando cambia el estado combinado; la vuelta a verde también se
  registra si había una alerta previa.
- El programa conserva `t_scet` (hora en que ocurrió) y `t_recibida` (hora de
  recepción) para no confundir evento y llegada.

Este diseño combina contexto individual y un umbral externo: una variación esperada
para una persona puede no alertar por sí sola, mientras que un límite absoluto
configurado todavía puede actuar. La calidad del resultado depende de la validez de
basales, priores, unidades, sensores y fuentes.

## 7. Flujo de datos y arquitectura

```text
Sensor / interfaz de registro
  → trama EVA binaria por BLE o trama JSON
  → pasarela BLE (si aplica) y POST HTTP al backend
  → validar dispositivo, esquema, asignación, tiempo, calidad y unidad
  → decodificar / calcular campos derivados
  → insertar muestra en SQLite (idempotencia por dispositivo, secuencia y SCET)
  → calcular predicción y criterios personal/absoluto
  → emitir muestra/alerta por SSE a las interfaces
  → encolar alertas, resúmenes y datos crudos hacia Tierra
  → entregar al cumplirse ventana y retardo configurado; acuse de regreso
```
   
La trama EVA tiene una cabecera little-endian de 13 bytes: versión `u8`,
`id_disp u32`, `id_esquema u16`, secuencia `u16`, `t_scet u32`; el esquema define
carga, tipos, escalas y fórmulas. El tripulante **no** va codificado en la trama:
la central resuelve la asignación del dispositivo en el instante del evento. Editar
un esquema crea una versión/ID nueva para mantener legibles las tramas anteriores.
No se debe afirmar que hay CRC/FEC en este formato: la especificación actual
documentada no incorpora esos campos.

La pasarela usa el perfil BLE EVA: escribe hora UTC, lee el esquema, se suscribe a
notificaciones y reenvía en lotes. Mantiene una cola local acotada y reintenta ante
fallos del backend; la secuencia detecta huecos, pero una notificación perdida no se
recupera por sí sola en el enlace actual.

La central, el teléfono, el reloj y Tierra son interfaces servidas por el backend.
`/api/stream` (SSE) lleva cambios en vivo; REST carga estado y envía acciones. El
simulador genera telemetría sintética y puede alimentar el mismo backend que la
pasarela.

### Enlace con Tierra

La bajada almacena y reenvía: alertas de mayor prioridad, resúmenes procesados cada
30 s y tramas crudas en lotes de hasta 200. La subida lleva avisos/alertas manuales;
al llegar a bordo se crea un acuse que vuelve a Tierra. Con ventana cerrada, los
paquetes esperan. `owlt_s` significa retardo de un trayecto: el valor predeterminado
de 20 s es sólo para la demostración; Marte se ilustra con 240–1440 s. SCET identifica
cuándo ocurrió el dato y ERT cuándo llegó.

## 8. Clima espacial y datos externos

La interfaz contiene registros descargados de DONKI en
[`Planeacion/Julio/datos/`](Planeacion/Julio/datos/) y un script de descarga en
[`Planeacion/Julio/scripts/fetch_donki.py`](Planeacion/Julio/scripts/fetch_donki.py).
Se ha elegido como referencia visual el SEP `2024-05-11T02:10:00-SEP-001`, con
instrumento de referencia GOES-P SEISS >100 MeV y enlace de evento
[NASA DONKI](https://ccmc.gsfc.nasa.gov/DONKI/view/SEP/30714/-1).

DONKI informa eventos/avisos solares, no dosis personales de radiación. En el
escenario de la maqueta, `6000 µSv/h`, duración de 27 min, 10 % de tasa tras blindaje,
minutos individuales hasta refugio y la dosis estimada son variables artificiales.
La propia interfaz lo debe seguir rotulando como simulación.

## 9. Justificación de decisiones

| Decisión | Justificación | Límite |
|---|---|---|
| Basal individual y actualización por precisión | La respuesta puede diferir entre personas y misiones; el peso de cada fuente depende de su incertidumbre declarada. | La mayoría de los priores/dispersión son supuestos y no tienen validación individual. |
| Calibración inicial de 14 días congelada | Evita que una desviación lenta se convierta sin límite en una normalidad nueva. | Catorce días es una decisión del prototipo y requiere validación experimental. |
| Mediana de 24 h para cambio personal | Reduce la influencia de lecturas puntuales y coincide con el racional documentado en el backend. | Puede retrasar la detección de eventos agudos; por eso existe otro criterio de umbral de minutos. |
| Umbrales absolutos separados | Conserva límites de referencia aun cuando el basal personal sea atípico o la calibración esté activa. | Son en su mayoría terrestres, las inclusividades deben revisarse y no sustituyen protocolos médicos. |
| Identidad por asignación, no dentro de la trama | Los equipos pueden reutilizarse; la central atribuye los datos según la asignación vigente al SCET. | Requiere que las asignaciones se actualicen correctamente. |
| Índice por padecimiento con cobertura visible | Hace trazable qué señal aporta y evita presentar faltantes como normales. | Es una puntuación ponderada determinista, no probabilidad ni diagnóstico. |
| Retardo y cola store-and-forward | Permite demostrar decisiones locales ante pérdida temporal de enlace. | La simulación no certifica una red espacial ni la tolerancia a fallos de hardware. |

## 10. Referencias y trazabilidad

Las fichas completas, observaciones sobre calidad de fuente, método, cobertura en
vuelo y enlaces por variable están en los catálogos vinculados en §2 y en
`medibles.json`. Referencias relevantes que esos archivos citan:

| Referencia | Uso en el proyecto | Enlace |
|---|---|---|
| NASA-STD-3001, Vol. 2 | Requisitos/entorno humano; no convierte los cortes terrestres de `medibles.json` en umbrales NASA. | [NASA-STD-3001 Vol. 2](https://www.nasa.gov/wp-content/uploads/2025/05/nasa-std-3001-vol-2.pdf) |
| Norsk et al. 2015; Fu et al. 2019 | Investigación de cambios cardiovasculares y presión arterial en vuelo. | [PMID 25774397](https://pubmed.ncbi.nlm.nih.gov/25774397/) · [PMID 31319685](https://pubmed.ncbi.nlm.nih.gov/31319685/) |
| Bio-Monitor de la Agencia Espacial Canadiense | Equipo fisiológico y mediciones a bordo. | [CSA Bio-Monitor](https://www.asc-csa.gc.ca/eng/sciences/bio-monitor.asp) |
| MedlinePlus, signos vitales, SpO₂ y fiebre | Referencias clínicas terrestres para FC/FR, SpO₂ y temperatura. | [Signos vitales](https://medlineplus.gov/ency/article/002341.htm) · [Oximetría](https://medlineplus.gov/lab-tests/pulse-oximetry/) · [Fiebre](https://medlineplus.gov/ency/article/003090.htm) |
| CDC · presión arterial | Umbrales terrestres incorporados como referencias en la semilla. | [CDC](https://www.cdc.gov/high-blood-pressure/about/index.html) |
| Barger et al. 2014 | Sueño y uso de hipnóticos en astronautas. | [DOI 10.1016/S1474-4422(14)70122-X](https://doi.org/10.1016/S1474-4422(14)70122-X) |
| Basner & Dinges 2011 | Sensibilidad del PVT a la pérdida de sueño. | [DOI 10.1093/sleep/34.5.581](https://doi.org/10.1093/sleep/34.5.581) |
| Law et al. 2014 | CO₂ de cabina y cefalea en la ISS; no es la fuente de una dosis de radiación. | [DOI 10.1097/JOM.0000000000000158](https://doi.org/10.1097/JOM.0000000000000158) |
| NASA OCHMO · SANS y adaptación espacial | Riesgos, notas técnicas y contexto de síntomas espaciales. | [MTB-001 SANS](https://www.nasa.gov/wp-content/uploads/2024/02/ochmo-mtb-001-sans.pdf) · [MTB-004 Space Adaptation Sickness](https://www.nasa.gov/wp-content/uploads/2025/09/ochmo-mtb-004-space-adaptation-sickness-sas.pdf) |
| Crucian et al. 2016 | Incidencia de síntomas/enfermedades en vuelos largos citada por el catálogo. | [DOI 10.2147/IJGM.S114188](https://doi.org/10.2147/IJGM.S114188) |
| NASA DONKI | Fuente de los eventos solares reales locales. | [API DONKI](https://api.nasa.gov/) · [SEP de referencia](https://ccmc.gsfc.nasa.gov/DONKI/view/SEP/30714/-1) |
| NASA OSDR | Recurso de datos humanos espaciales; el proyecto no afirma haber descargado datos restringidos de OSDR. | [OSDR](https://visualization.osdr.nasa.gov/biodata/api/) · [Acceso controlado](https://www.nasa.gov/reference/osdr-tutorials-requesting-controlled-access-datasets/) |

## 11. Limitaciones y asuntos que requieren resolución

1. Separar FC instantánea `04:A4` de pulso en reposo `01:V3`, y acordar presión
   sistólica/diastólica y PAM como IDs y fuentes canónicas.
2. Resolver la discrepancia de sitio/tecnología de temperatura (central, axilar o
   piel) antes de usar el prior `+1 °C`.
3. Verificar artículo original, población, estadística `±` y dispersión antes de
   usar cifras de vuelo como `τ₀`/`σ`; hoy varios parámetros se suponen.
4. Acordar operador inclusivo/estricto de umbrales y reconciliar umbrales terrestres
   con evidencia oficial/operativa antes de cualquier uso no demostrativo.
5. Acordar correspondencia entre 20 IDs de padecimiento (`P01–P20`) y 11
   malestares de la matriz (`1–11`).
6. No presentar umbrales de SpO₂ de reloj como sustituto de presión parcial de
   oxígeno, ni los eventos DONKI como dosis personal.
7. El firmware no se ha probado en una placa real; no hay validación de BLE
   extremo a extremo con hardware real ni validación clínica.
8. No se declaran cifrado, certificación médica, tolerancia a radiación ni
   determinismo de tiempo real.

## 12. Ubicación del código que implementa el protocolo

- Modelo bayesiano por variable y estados: [`backend/src/lunna.ts`](Planeacion/Julio/backend/src/lunna.ts) y [`backend/src/ingesta.ts`](Planeacion/Julio/backend/src/ingesta.ts).
- Ingesta, tablas y persistencia SQLite: [`backend/src/servidor.ts`](Planeacion/Julio/backend/src/servidor.ts), [`db.ts`](Planeacion/Julio/backend/src/db.ts), [`app.ts`](Planeacion/Julio/backend/src/app.ts).
- Umbrales: [`backend/src/referencias.ts`](Planeacion/Julio/backend/src/referencias.ts) y `semillas/medibles.json`.
- Esquema binario seguro: [`backend/src/esquema.ts`](Planeacion/Julio/backend/src/esquema.ts), firmware ESP32 y [`pasarela/trama_eva.py`](Planeacion/Julio/pasarela/trama_eva.py).
- Simulación de telemetría: [`backend/src/simulador.ts`](Planeacion/Julio/backend/src/simulador.ts).
- Enlace con Tierra: [`backend/src/enlace.ts`](Planeacion/Julio/backend/src/enlace.ts).
- Motor e índices de la maqueta: [`maqueta-eva/motor.js`](Planeacion/Leo/maqueta-eva/motor.js), [`consola.js`](Planeacion/Leo/maqueta-eva/consola.js) y [`modelo-pesos/actualizacion_bayesiana.py`](Planeacion/Leo/modelo-pesos/actualizacion_bayesiana.py).


--- borra esto