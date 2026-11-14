# División de mis 78 variables por forma de obtención

El criterio es **de dónde sale el dato**. Versión final tras revisar viabilidad (14 nov 2026).

| Tipo | Qué es | Cuántas | Salida |
|---|---|---:|---|
| **A** | Sale **directo del reloj, la camiseta o el parche CGM**, o de un cálculo determinista sobre su señal | **12** | `ingesta/out/tipoA.json` |
| **B** | Necesita **procesamiento**: modelo preentrenado, fórmula, equipo de la nave o API | **13** | `ingesta/out/tipoB.json` |
| **C** | Sin sensor ni modelo: **input manual** (astronauta, médico de a bordo o laboratorio) | **49** | `ingesta/out/tipoC-formularios.json` + `tipoC.json` |
| **Descartadas** | Inviables para el prototipo | **3** | — |
| **Fusionada** | `02:V75` masa corporal → `01:V8` de Julio (decisión de Leo, 14-11) | **1** | — |

Total: 12 + 13 + 49 + 3 + 1 = **78** ✅. Dónde se mide cada una (nave, médico, Tierra) está en
[clasificacion-medicion.md](clasificacion-medicion.md).

✅ verificado · ⚠️ verificar · 🔶 decisión nuestra

---

## Tipo A — reloj, camiseta o parche (12)

02:V52 · 02:V53 · 02:V56 · 02:V92 · 03:V30 · 03:V31 · 03:V33 · 03:V34 · 03:V35 · 03:V36 · 03:V43 · 03:V49

## Tipo B — procesamiento (13)

| Subgrupo | Variables | Cómo |
|---|---|---|
| Modelo preentrenado | 02:V47 | DeepACSA (Apache-2.0) mediante un puente a Python. Reproduce exactamente los resultados que DeepACSA publica |
| Fórmulas | 02:V43 (Epley), 02:V51 (extrapolación FC–VO₂ y razón de Uth, comparadas) | Decisiones de Leo |
| Equipos de la nave | 02:V44 ARED, V54 CEVIS, V55 T2 | Simulación controlada (no hay datos abiertos). La masa (SLAMMD) ahora es `01:V8` de Julio |
| API y datos de comidas | 02:V79, V81, V82, V83, V84, V93 | CGMacros real (energía, proteína, carbohidratos) y USDA FoodData Central (hierro, sodio, calcio) |
| Prueba en la app | 02:V73 | Sin dataset; la medirá la propia app |

## Tipo C — input manual (49)

Incluye **10 variables que pasaron de B a C**: no hay modelo preentrenado abierto ni datos para
ellas, así que el valor lo captura una persona.

| Pasó de B a C | Por qué |
|---|---|
| 02:V48 perímetros | Cinta métrica; no hay modelo validado de perímetro desde una foto |
| 02:V61 estatura, 02:V62 talla sentado | Cinta métrica; no hay modelo validado desde una foto en microgravedad |
| 02:V63 paraespinal, 02:V66 lordosis | Resonancia/radiología en Tierra; se importa el informe |
| 02:V64 disco intervertebral | Sin modelo abierto para el ultrasonido de disco; lo mide el médico de a bordo |
| 02:V70 tándem, 02:V71 Romberg, 02:V72 pruebas funcionales | Solo tienen sentido con gravedad (posvuelo); el examinador captura el resultado |
| 02:V96 uñas y manos | Sin modelo de visión abierto; inspección y foto |

## Descartadas (3)

| ID | Por qué |
|---|---|
| 03:V40 Epworth | Requiere licencia; la KSS de Julio cubre la somnolencia |
| 03:V41 Polisomnografía | No hay equipo operativo a bordo; solo investigación con n=5 |
| 03:V42 EEG theta | No hay equipo operativo a bordo; solo investigación con n=5 |
