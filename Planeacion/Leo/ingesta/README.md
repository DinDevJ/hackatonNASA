# Ingesta de variables — Leo (Persona 4)

Capa de **extracción y normalización** de mis 78 variables. Solo recaba, limpia y exporta;
no hace análisis clínico. La división A/B/C está en
[../division-variables-ABC.md](../division-variables-ABC.md).

✅ verificado · ⚠️ verificar · 🔶 decisión nuestra

## Uso

```bash
npm install
npm run descargar     # MMASH (23 MB) y CGMacros (657 MB) → data/raw/, con SHA-256 verificado
npm run tipoA         # → out/tipoA.json
npm run tipoB         # → out/tipoB.json   (requiere tipoA y el entorno de Python, ver abajo)
npm run tipoC         # → out/tipoC-formularios.json + out/tipoC.json
npm run fuentes       # verifica DOI, PMID y URL de las fuentes → out/fuentes-verificadas.json
npm run validar -- out/tipoB.json
```

Node ≥ 20. TypeScript estricto, ejecutado con `tsx`.

### Entorno de Python (solo para 02:V47, DeepACSA)

TypeScript llama a [py/deepacsa_bridge.py](py/deepacsa_bridge.py). DeepACSA fija TensorFlow 2.13,
que no existe para Python 3.12; se usa TensorFlow 2.18 con `tf_keras` (Keras 2) y
`TF_USE_LEGACY_KERAS=1`, sin modificar el código de DeepACSA.

```bash
python -m venv py/.venv
py/.venv/Scripts/python.exe -m pip install tensorflow==2.18.0 tf_keras==2.18.0 opencv-python-headless==4.10.0.84 numpy==2.0.2 tifffile==2024.9.20 scikit-image==0.24.0 keras-unet-collection==0.1.13 scikit-learn==1.5.2 matplotlib==3.9.2 pandas==2.2.3 scipy==1.14.1 openpyxl==3.1.5 pillow==11.0.0 tqdm==4.66.5
```

Archivos de Zenodo (doi:10.5281/zenodo.19130694, MD5 verificado) en `data/raw/deepacsa/`:
`unet3plus_RectFem_v0.3.1.h5` (362 MB), `DeepACSA_v0.3.2_example.zip` (descomprimido en `ejemplo/`) y
el código fuente `PaulRitsche/DeepACSA-v0.3.2.zip` (descomprimido en `src/`).

### API de USDA

`DEMO_KEY` permite pocas peticiones por hora. El script hace **una sola** petición y la guarda en
`data/raw/usda-cache.json`. Con clave propia (gratis): `FDC_API_KEY=... npm run tipoB`.

## Contrato

Cada lectura cumple `AstronautVariableReading` ([src/contrato.ts](src/contrato.ts)), validada con
Zod antes de escribir. Como el contrato no tiene campo de sujeto, el archivo agrupa las lecturas
así: `{ generado, tipo, sujetos: [{ sujeto, lecturas: [...] }] }`.

Las variables con varias medidas (p. ej. V53: FC media, pico, % >70 %, % >90 %) emiten una
lectura por medida con el mismo `id`; la medida va en `nombre`.

## Tipo A — estado

| ID | Variable | Origen | Lecturas |
|---|---|---|---:|
| 03:V30 | Sueño total | ✅ MMASH real | 21 |
| 03:V33 | Tiempo en cama | ✅ MMASH real | 21 |
| 03:V34 | Eficiencia | ✅ MMASH real | 21 |
| 03:V35 | Latencia | ✅ MMASH real | 21 |
| 03:V36 | WASO | ✅ MMASH real | 21 |
| 02:V53 | Intensidad de sesión | ✅ MMASH real (FC + actividades 5/6) | 372 (93 sesiones) |
| 02:V92 | Glucosa continua: media, DE, CV y tiempo en rango | ✅ CGMacros real (Dexcom y Libre) | 3 752 (938 sensor-día) |
| 02:V56 | Minutos de ejercicio vigoroso | ✅ CGMacros real (Fitbit Sense, METs ≥ 6) | 355 días |
| 02:V52 | FC submáxima CEVIS | 🔶 simulada | 6 |
| 03:V31 | % noches < 6 h | 🔶 simulada | 1 |
| 03:V43 | Deuda de sueño | 🔶 simulada (0,32 h, como NASA) | 1 |
| 03:V49 | Lux | 🔶 simulada | 24 |

Total: **4 616 lecturas**, 0 inválidas. Simulación con semilla fija `20261114`: cada ejecución
produce los mismos valores.

## Decisiones de limpieza aplicadas

- **CGMacros interpola ambos sensores a 1 valor por minuto.** Se conservan solo las lecturas
  medidas (mg/dL enteros, separadas por ≥ intervalo − 1 min). Un día cuenta si tiene ≥ 12 h de
  cobertura.
- **MMASH parte algunas noches en varios tramos de cama:** se suman TST, cama y WASO.
- **MMASH no tiene fechas:** día 1 = 2000-01-01 (ancla convencional).

## Decisiones tomadas por Leo (14 nov 2026)

| Tema | Decisión | Efecto |
|---|---|---|
| FC pico de 224 y 227 lpm (MMASH user_2, user_6) | Descartar muestras > 220 lpm como artefacto | FC pico máxima ahora 203 |
| Lecturas de glucosa en el piso de 40 mg/dL | Medido: son raras de verdad (Dexcom simultáneo 0,05 %); las del Libre (2,4 %) se concentran en 3 sensores. Se **conservan marcadas** como error | 9 días con `ERROR DE SENSOR PROBABLE` en `observaciones` (participantes 007 y 015) |
| Tiempo en rango de glucosa | 70–180 mg/dL, rotulado `CLINICO_T` | Media 85 % (Dexcom) y 83 % (Libre) |
| 02:V56 | Real desde el Fitbit, METs ≥ 6 (vigoroso). Medido: ≥ 3 METs daba 234 min/día por contar caminar | Media 27 min/día; subestima el ejercicio moderado |
| 02:V52 | Se acepta la relación de Swain (FC reposo 60, edad 45) | Sin cambio |
| 03:V43 | Recentrar las series a las medias publicadas | Deuda 0,32 h (NASA ≈0,3 h) |

Participantes de CGMacros con columna `Intensity` en lugar de `METs` (escala no documentada) no
aportan 02:V56.

## Tipo B — estado

| ID | Variable | Origen | Cómo |
|---|---|---|---|
| 02:V47 | Área muscular (recto femoral) | ✅ Real: imágenes de ejemplo de DeepACSA | Modelo preentrenado; **reproduce exactamente** 9,79 / 10,28 / 10,02 cm² publicados |
| 02:V81 | Energía | ✅ Real CGMacros (343 días completos) | Suma de comidas × % consumido |
| 02:V82 | Proteína (g/d y g/kg/d) | ✅ Real CGMacros + peso de bio.csv | Ídem |
| 02:V93 | Carbohidratos % energía | ✅ Real CGMacros | Atwater 4,0 kcal/g (FAO 2003) |
| 02:V79, V83, V84 | Hierro, sodio, calcio | API USDA sobre menú de ejemplo 🔶 simulado | Alimentos fijados por fdcId |
| 02:V43 | 1RM peso muerto | 🔶 Simulado | Epley sobre series de ARED |
| 02:V51 | VO₂máx | 🔶 Simulado | Extrapolación FC–VO₂ **y** razón de Uth, lado a lado |
| 02:V44, V54, V55, V75 | ARED, CEVIS, T2, SLAMMD | 🔶 Simulado (12 semanas) | Parámetros publicados |
| 02:V73 | Destreza fina | `null` | La medirá la app |

Hallazgos:
- V51: la extrapolación da 38,9 → 33,8 mL/kg/min (−13 %; Moore 2014 midió −17 %). La razón de Uth
  da 45,0 en ambos momentos: no detecta el desacondicionamiento porque no usa el esfuerzo.
- Nutrición CGMacros: 3 días físicamente imposibles (carbohidratos > energía total) se conservan
  marcados `ERROR DE DATO`. 65 días < 800 kcal y 14 días > 5000 kcal **no se filtraron** (probable
  registro incompleto; falta decidir un corte).

## Tipo C — estado

- 49 formularios con validación Zod (`capturar(id, valor, timestamp)` en
  [src/tipoC/esquemas.ts](src/tipoC/esquemas.ts)): quién captura, cuándo, rango válido, umbral y fuente.
  Cuestionarios con licencia (PSQI, ISI, MSSQ): solo la puntuación total.
- Datos reales que sí existen: `bio.csv` de CGMacros → 02:V89 HbA1c, 02:V86 glucosa de laboratorio
  y **glucosa capilar con glucómetro Contour** (3 por persona), 02:V90 insulina. 270 lecturas.
