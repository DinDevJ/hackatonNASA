# Plan de acción — mis 78 variables (Persona 4: Leo)

> **Superado.** Este fue el primer plan. El estado actual está en [resumen-final.md](resumen-final.md), [cumplimiento-propuestas.md](cumplimiento-propuestas.md) y [manejo-variables-leo.pdf](manejo-variables-leo.pdf).

Músculo, nutrición, metabolismo, sueño y cefalea. Sale de
[ASIGNACION_VARIABLES_MONARCAS.md](../ASIGNACION_VARIABLES_MONARCAS.md) y de los catálogos
[02](../variables-diagnostico/02-hueso-musculo-rinon-nutricion.md) y
[03](../variables-diagnostico/03-conducta-sueno-cognicion.md).

✅ verificado · ⚠️ verificar · 🔶 decisión nuestra

Tabla de trabajo: [tabla-investigacion.csv](tabla-investigacion.csv). Ya tiene las 78 filas
con las 15 columnas que pide la asignación. Las columnas que salen del catálogo vienen
prellenadas; `dataset_url`, `formato`, `modelo_existente` y `dificultad` quedan por llenar.

---

## 1. Qué tengo que cumplir

### Entregables

| # | Requisito | Cómo lo cubro |
|---|---|---|
| 1 | Documentar **las 78 variables**; no hace falta un dataset para cada una | `tabla-investigacion.csv`, una fila por variable |
| 2 | Tabla con 15 columnas: `id … observaciones` | Ya está la estructura; los IDs llevan su origen (`02:V40`, `03:V30`) |
| 3 | Elegir **8–12 variables candidatas** para el prototipo | §4: propongo 12 |
| 4 | Investigación avanzada: **ultrasonido muscular y posturografía** | §3.1 y §3.3 |
| 5 | Revisión transversal por sexo: **masa muscular, metabolismo, sueño y ciclo hormonal** | §5 |
| 6 | Consulta de Persona 5 en **R20** (sueño según ciclo o tratamiento hormonal) | §5 |
| 7 | Instrucciones reproducibles de descarga o prueba | §6 |

### Checklist (copiado de la asignación)

- [ ] Revisé todas mis variables y confirmé su significado
- [ ] Documenté unidades y método de medición *(prellenado desde los catálogos; falta revisar)*
- [ ] Enlacé fuentes primarias y criterios de referencia *(hoy apuntan a la numeración `[n]` del catálogo; hay que poner la URL)*
- [ ] Busqué datasets reales y verifiqué sus licencias
- [ ] Distinguí medición directa, cálculo y estimación
- [ ] Identifiqué modelos preentrenados que realmente puedan ejecutarse
- [ ] Documenté limitaciones de uso en vuelo y de validez clínica
- [ ] Seleccioné entre 5 y 10 variables candidatas *(nota: la §8 de la asignación dice 8–12 para mí)*
- [ ] Añadí instrucciones reproducibles de descarga o prueba

### Cómo me califican y qué implica

| Peso | Criterio | Implicación |
|---:|---|---|
| 40 % | Documentación y cobertura | Las 78 filas completas valen más que tres datasets perfectos |
| 30 % | Datos o modelos reutilizables | Priorizar datasets abiertos con licencia clara (§3) |
| 20 % | Calidad, fuentes, reproducibilidad | URL real en cada fila y comando de descarga |
| 10 % | Limitaciones y viabilidad | Llenar `factibilidad_vuelo` y `observaciones` con honestidad |

### Reglas de alcance que me aplican

- No construir un módulo por variable. Priorizar lo que se capta con wearable, cuestionario, ultrasonido o telemetría.
- Reutilizar modelos existentes; nada de entrenar desde cero.
- Marcar cada dato como real, simulado, calculado o estimado.
- Usar la línea base personal y avisar cuando un umbral es terrestre ([T]) y no está validado en microgravedad.

---

## 2. Cómo voy a tratar cada variable: tres niveles

🔶 Clasifiqué las 78 según lo que la app puede hacer con ellas. La clasificación ya está en la
columna `observaciones` de la tabla.

| Nivel | Qué significa | Cuántas | Ejemplos |
|---|---|---:|---|
| **A · Capturar en app** | Se mide a bordo con entrada manual, wearable, cámara o equipo de la nave | **56** | Masa corporal, kcal, carga del ARED, sueño por actigrafía, dolor de espalda, cefalea |
| **B · Importar resultado** | Se mide en tierra o en laboratorio (pre y posvuelo, o sangre congelada). La app solo guarda el valor como línea base o referencia | **19** | Fuerza isocinética, DXA, RM, posturografía, vitamina D, ferritina, HbA1c |
| **C · Solo documentar** | No se puede capturar en la app o tiene una licencia que lo impide | **3** | Epworth (requiere licencia), polisomnografía, EEG |

**Profundidad de investigación según el nivel:**
- **A:** fuente, umbral, dataset para probar el algoritmo y la forma de captura en la app.
- **B:** fuente, umbral y en qué momento de la misión se mide. No necesitan dataset propio.
- **C:** fuente y por qué no entra. Con eso basta.

---

## 3. Plan por bloque

### 3.1 Músculo y capacidad aeróbica · `02:V40–V57` (18)

| Tratamiento | Variables |
|---|---|
| A · Capturar | V44 carga en ARED · V45 agarre · V47 ultrasonido muscular · V48 perímetros · V51 VO₂máx estimado · V52 FC submáxima · V53 intensidad · V54 CEVIS · V55 T2 · V56 minutos de ejercicio · V57 autoevaluación |
| B · Importar | V40–V43 fuerza isocinética y 1RM · V46 RM · V49 MyotonPRO · V50 DXA de cuerpo entero |

- **Umbral principal:** ✅ NASA-STD-3001: fuerza y VO₂ en misión ≥ 80 % de la línea base; VO₂máx ≥ 32,9 o ≥ 36,5 mL/kg/min [catálogo 02, fuente 3].
- **Datos:** los registros de ARED, CEVIS y T2 de astronautas **no son abiertos** (se piden con DAR en LSDA). Para probar el algoritmo de "FC submáxima → VO₂ estimado" uso FC de ejercicio de wearables terrestres:
  - ✅ [MMASH (PhysioNet)](https://physionet.org/content/mmash/1.0.0/): 22 personas sanas, latido a latido, actigrafía y sueño durante 24 h. Licencia ODbL.
- **Investigación avanzada: ultrasonido muscular (V47)**
  - ✅ Modelo listo: [DeepACSA](https://github.com/PaulRitsche/DeepACSA) (Apache-2.0). Segmenta el área de sección transversal del cuádriceps en ultrasonido panorámico.
  - ⚠️ Falta encontrar sus imágenes de entrenamiento o de prueba y comprobar si los pesos se descargan.
  - Encaja con el catálogo: el ultrasonido de la ISS ya se usa para vigilar el tamaño muscular, y frente a RM concuerda bien (CCC 0,78).

### 3.2 Columna · `02:V58–V66` (9)

| Tratamiento | Variables |
|---|---|
| A · Capturar | V58 dolor de espalda · V59 localización y día · V60 respuesta al tratamiento · V61 estatura · V62 talla sentado · V65 síntomas radiculares |
| B · Importar | V63 área paraespinal · V64 disco intervertebral · V66 lordosis |

- Casi todo es autoinforme. No hace falta dataset: los cuestionarios se diseñan.
- Lo que hay que conseguir: la escala de dolor (NRS 0–10, de uso libre ⚠️) y la incidencia de referencia (52 % según el catálogo).
- **Riesgo que no hay que perder de vista:** hernia discal **4,3 veces** más frecuente después del vuelo. La app debe seguir los síntomas al menos 2 años después del regreso.

### 3.3 Sensoriomotor y mareo · `02:V67a–V74` (10)

| Tratamiento | Variables |
|---|---|
| A · Capturar | V67a síntomas de mareo · V67b MSSQ-short · V68a medicación antimareo · V68b síntomas tras aterrizar · V70 marcha en tándem · V71 Romberg · V73 destreza fina · V74 ilusiones |
| B · Importar | V69 posturografía · V72 Functional Task Test |

- **Investigación avanzada: posturografía (V69)**
  - ✅ [Human Balance Evaluation Database (PhysioNet)](https://physionet.org/content/hbedb/1.0.0/): datos reales de plataforma de fuerza, con ojos abiertos y cerrados y superficie firme o de espuma. Licencia ODC-By.
  - Sirve para calcular métricas de oscilación como sustituto de la puntuación cEQ.
  - ✅ [Gait in Aging and Disease (PhysioNet)](https://physionet.org/content/gaitdb/1.0.0/) para marcha.
- **V70 y V71 con cámara:** ✅ [MediaPipe Pose](https://github.com/google-ai-edge/mediapipe) estima la postura con un modelo ya entrenado; contar pasos correctos en tándem sería un cálculo nuestro 🔶.
- ⚠️ El MSSQ-short (V67b) tiene licencia por verificar.

### 3.4 Nutrición · `02:V75–V85` (11)

| Tratamiento | Variables |
|---|---|
| A · Capturar | V75 masa corporal · V77 suplemento de vitamina D · V79 hierro · V81 energía · V82 proteína · V83 sodio · V84 calcio · V85 apetito |
| B · Importar | V76 vitamina D sérica · V78 ferritina · V80 folato |

- **Umbrales NASA claros** (catálogo 02): pérdida de masa < 3,3 %, 100 % del requerimiento energético (ecuación EER incluida), sodio 1500–2300 mg/d, proteína 1,2–1,8 g/kg, calcio 1000–1200 mg/d, hierro ≤ 45 mg/d.
- **Datos:**
  - ✅ [USDA FoodData Central API](https://fdc.nal.usda.gov/api-guide): nutrientes reales por alimento. Con ella el "Explorador de menú" calcula kcal, sodio, calcio y hierro.
  - ⚠️ Buscar si NASA publicó la composición del menú estándar de la ISS.
  - ✅ [NHANES (CDC)](https://wwwn.cdc.gov/nchs/nhanes/): ingesta dietética de población terrestre, de dominio público.
- La ecuación EER es la pieza más reutilizable: la puede implementar cualquiera en 10 líneas.

### 3.5 Glucosa y metabolismo · `02:V86–V93` (8)

| Tratamiento | Variables |
|---|---|
| A · Capturar | V86 glucosa en ayunas · V88 glucosa al azar · V92 CGM · V93 carbohidratos y azúcares |
| B · Importar | V87 OGTT · V89 HbA1c · V90 insulina y resistencia a la insulina · V91 péptido C |

- Todos los umbrales son **terrestres (ADA)**. Hay que rotularlos así.
- **Datos:**
  - ✅ [CGMacros (PhysioNet)](https://physionet.org/content/cgmacros/1.0.0/): monitoreo continuo de glucosa junto con comidas y macronutrientes. Une nutrición y glucosa. ⚠️ Licencia **CC BY-NC-SA**: sirve para el hackatón, no para uso comercial.
  - ✅ NHANES: glucosa, HbA1c e insulina de población terrestre.
- Precedente en vuelo: CGM comercial en Ax-4 (2025). Es el argumento para que V92 sea factible.

### 3.6 Lesiones por EVA y ejercicio · `02:V94–V97` (4)

Las cuatro son de nivel A: autoinforme y foto. No hay dataset; son formularios.

- Datos de referencia: 0,26 lesiones por EVA; síntomas en 45,7 % de las sesiones de entrenamiento con traje; manos 47 %, hombros 21 %.
- V96 (uña de la mano): la foto alimentaría un registro. 🔶 No propongo un modelo de visión: no encontré uno entrenado para esto.

### 3.7 Sueño · `03:V30–V43` (14)

| Tratamiento | Variables |
|---|---|
| A · Capturar | V30 sueño total por actigrafía · V31 % de noches < 6 h · V32 sueño por diario · V33 tiempo en cama · V34 eficiencia · V35 latencia · V36 WASO · V37 calidad 0–100 · V38 PSQI · V39 ISI · V43 deuda de sueño |
| C · Documentar | V40 Epworth (requiere licencia) · V41 polisomnografía · V42 EEG |

- **Es el bloque con más datos y modelos abiertos:**
  - ✅ [pyActigraphy](https://github.com/ghammad/pyActigraphy) (GPL-3.0): algoritmos de sueño y vigilia a partir de actigrafía (Cole-Kripke, Sadeh, etc.).
  - ✅ [GGIR](https://github.com/wadpac/GGIR) (Apache-2.0, R): acelerómetro de muñeca → sueño y actividad.
  - ✅ [YASA](https://github.com/raphaelvallat/yasa) (BSD-3): clasifica fases de sueño desde EEG. Solo documenta V41; no entra en la app.
  - ✅ [Sleep-EDF (PhysioNet)](https://physionet.org/content/sleep-edfx/1.0.0/): polisomnografía real. Licencia ODC-By.
  - ✅ MMASH: actigrafía con sueño.
  - ⚠️ [MESA en NSRR](https://sleepdata.org/datasets/mesa): grande, pero requiere solicitar acceso.
- **Licencias:**
  - PSQI: gratis solo para investigación no comercial y sin modificar.
  - ISI: condiciones sin verificar.
  - Epworth: requiere licencia → se queda en C. Para somnolencia, la KSS (de Julio) cubre el hueco.
- Referencia de vuelo: 5,96 h en Shuttle y 6,09 h en la ISS frente a 7–9 h en Tierra; 44–47 % de las noches con menos de 6 h.

### 3.8 Iluminación · `03:V49–V50` (2)

- V49 lux: sensor de luz del teléfono o del actígrafo. Umbrales de NASA: unos 20 lux de noche y 100–300 lux en actividad.
- V50 modo de iluminación: entrada manual del modo activo.
- Encaja con la "exposición a la luz por hora" del PDF de síntesis.

### 3.9 Cefalea · `03:V82–V83` (2)

- Episodio sí/no e intensidad 0–10: cuestionario de 30 s.
- Referencia: 91,7 % de los astronautas tuvo al menos un episodio en vuelos largos.
- Se cruza con el CO₂ de cabina de Julio (`04:A23–A35`). Avisar que la evidencia es contradictoria.

---

## 4. Candidatas para el prototipo (12)

🔶 Elegidas porque se capturan a bordo, tienen un umbral claro y tienen un dataset para probarlas.

| # | ID | Variable | Captura | Umbral | Dato para probar |
|---|---|---|---|---|---|
| 1 | 02:V75 | Masa corporal | Manual / SLAMMD | ✅ [A] pérdida < 3,3 % | Sintético |
| 2 | 02:V81 | Ingesta energética | Manual / foto | ✅ [A] 100 % del EER | FoodData Central |
| 3 | 02:V83 | Sodio | Manual | ✅ [A] 1500–2300 mg/d | FoodData Central |
| 4 | 02:V44 | Carga y volumen en ARED | Equipo | Sin umbral; tendencia frente a la línea base | Sintético |
| 5 | 02:V52 | FC submáxima → VO₂ estimado | Wearable | ✅ [A] ≥ 80 % de la línea base | MMASH |
| 6 | 02:V53 | Intensidad aeróbica | Wearable | ✅ [A] > 70 % de FCmáx | MMASH |
| 7 | 02:V56 | Minutos de ejercicio | Registro | ✅ [A] ~600 min/semana | Sintético |
| 8 | 02:V58 | Dolor de espalda | Cuestionario | Sin corte; incidencia 52 % | — |
| 9 | 02:V67a | Mareo espacial | Cuestionario | Sin corte; 60–80 % en los primeros días | — |
| 10 | 03:V30 | Sueño total (actigrafía) | Wearable | [T] 7–9 h; [A] < 6 h es riesgo | MMASH + pyActigraphy |
| 11 | 03:V43 | Deuda de sueño | Calculada | Media móvil frente a la línea base | MMASH |
| 12 | 03:V49 | Luz ambiental | Sensor | ✅ [A] guía NASA de lux | Sintético |

Si hay que recortar a 8, quedan 1, 2, 4, 5, 7, 8, 10 y 11. Así se cubre cada área.

---

## 5. Revisión transversal por sexo y consulta R20

| Tema | Qué buscar | Fuente inicial |
|---|---|---|
| Masa muscular | Diferencias de pérdida de masa y fuerza entre hombres y mujeres en vuelo | Catálogo 02 [7][34]; ⚠️ compendio NASA-NSBRI 2014 |
| Metabolismo | El índice de resistencia a la insulina subió más en hombres (p = 0,034, n = 8) | Catálogo 02 [51] |
| Nutrición | Requerimientos distintos de hierro (18 mg/d en mujeres < 50 años sin supresión menstrual), fibra, vitaminas K y C | Catálogo 02 [5]; PDF de síntesis |
| Sueño y ciclo (R20, con Persona 5) | En la fase lútea suben el pulso en reposo y la temperatura: la línea base de sueño y FC tiene que ajustarse a la fase | PDF de síntesis (JMIR 2019) ⚠️ |

---

## 6. Orden de trabajo

🔶 Primero lo que más pesa en la calificación: cobertura (40 %) y datos reutilizables (30 %).

| Paso | Qué hago | Resultado |
|---|---|---|
| 1 | Revisar las 78 filas de la tabla y corregir lo que el script prellenó mal | Cobertura completa |
| 2 | Llenar `dataset_url`, `formato`, `modelo_existente` de las 12 candidatas | Lo que más puntos da |
| 3 | Descargar MMASH y probar pyActigraphy → sueño total y deuda de sueño | Primer dato real "probado" |
| 4 | Probar FoodData Central con 5 alimentos del menú → kcal y sodio | Segundo dato real "probado" |
| 5 | Investigación avanzada: DeepACSA y Human Balance DB | Cumple §8 de la asignación |
| 6 | Llenar las filas B y C (fuente, umbral y por qué no se captura) | Cierra la cobertura |
| 7 | Revisión por sexo y R20 con Persona 5 | Cumple la revisión transversal |
| 8 | Escribir `observaciones` (muestras pequeñas, sesgo masculino, umbrales [T]) | El 10 % de limitaciones |

### Descargas reproducibles (por probar)

```bash
# MMASH: actividad, sueño y FC (PhysioNet, ODbL)
wget -r -N -c -np https://physionet.org/files/mmash/1.0.0/

# Human Balance Evaluation Database (PhysioNet, ODC-By)
wget -r -N -c -np https://physionet.org/files/hbedb/1.0.0/

# FoodData Central (requiere API key gratuita de api.data.gov)
curl "https://api.nal.usda.gov/fdc/v1/foods/search?query=oatmeal&api_key=DEMO_KEY"
```

⚠️ Los comandos siguen el patrón estándar de PhysioNet y de la API de USDA, pero **no los
he ejecutado**. Antes de copiarlos a la tabla, correrlos y anotar el tamaño de la descarga.

---

## 7. Lo que ya sé que no voy a conseguir

- Los datos individuales de ARED, CEVIS, T2, SLAMMD y actigrafía de astronautas requieren DAR en LSDA.
- Arquitectura del sueño en vuelo: solo hay estudios de 5 personas.
- Umbrales validados en microgravedad para glucosa, cefalea o mareo: no existen; se usan los terrestres rotulados.
- Imágenes de ultrasonido muscular **tomadas en vuelo**.
