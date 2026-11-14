# Resumen final — mis 78 variables (Leo, Persona 4)

Equipo Monarcas · NASA Space Apps 2026 · 14 nov 2026

✅ verificado · ⚠️ no confirmado en fuente abierta (dicho explícitamente) · 🔶 decisión nuestra

## 1. En una tabla

| | A · reloj/camiseta | B · procesamiento | C · input manual | Descartadas + fusionada | Total |
|---|---:|---:|---:|---:|---:|
| Variables | 12 | 13 | 49 | 3 + 1 | **78** |
| Con dato **real** | 8 | 4 | 3 | — | **15** |
| Lecturas generadas | 4 616 | 1 705 | 270 + 49 formularios | — | **6 591** |
| Lecturas inválidas | 0 | 0 | 0 | — | **0** |

Todas las lecturas cumplen el contrato común `AstronautVariableReading` (validado con Zod).

## 2. Dónde se puede medir cada variable

| Dónde | Cuántas | Ejemplos |
|---|---:|---|
| 🛰️ A bordo, automático (wearable o equipo) | 19 | Sueño por actigrafía, FC, CGM, ARED, CEVIS, T2, lux |
| 👩‍⚕️ A bordo, por el médico de a bordo (CMO) | 7 | Ultrasonido muscular y de disco, glucosa capilar ⚠️, exploración de hombro y uñas |
| ✍️ A bordo, reportado por el astronauta | 27 | Dolor, mareo, cefalea, dieta, diario de sueño |
| 🧪 Muestra a bordo, análisis en Tierra | 5 | Vitamina D, ferritina, folato, insulina, péptido C |
| 🌍 Solo en Tierra | 16 | DXA, RM, dinamómetro isocinético, posturografía, pruebas funcionales |
| ❌ Descartadas | 3 | Epworth (licencia), polisomnografía y EEG (sin equipo operativo) |

Detalle con fuente por variable: [clasificacion-medicion.md](clasificacion-medicion.md).

## 3. Datos reales usados

| Dataset | Licencia | Variables | Verificación |
|---|---|---|---|
| MMASH (PhysioNet) | ODbL 1.0 | Sueño (V30, V33–V36), intensidad de ejercicio (V53) | SHA-256 ✅ |
| CGMacros (PhysioNet) | CC BY-NC-SA 4.0 (**sin uso comercial**) | Glucosa continua (V92), minutos vigorosos (V56), energía/proteína/carbohidratos (V81, V82, V93), HbA1c, glucosa de laboratorio y capilar, insulina (V89, V86, V90) | SHA-256 ✅ |
| DeepACSA (Zenodo) | Apache-2.0 | Área muscular por ultrasonido (V47) | MD5 ✅ · reproduce los resultados publicados al decimal |
| USDA FoodData Central | Dominio público (API) | Hierro, sodio, calcio (V79, V83, V84) | ⚠️ pendiente: límite de peticiones de `DEMO_KEY` |

**Ninguno es de astronautas.** Son personas en Tierra. Los datos individuales de astronautas
requieren solicitud de acceso (DAR) a NASA LSDA.

## 4. Fuentes y verificación

- **53 de 54** fuentes de mis variables abren (DOI resuelto en doi.org o URL con HTTP 200).
  En cada DOI, el título real (Crossref/PubMed) coincide con el trabajo citado.
- La que no: NASA-STD-3001 Vol. 1 (copia local sin URL); el mismo estándar sí está verificado con
  otra entrada.
- **Un error mío detectado y corregido:** el DOI que recordé para Moore 2014 apuntaba a otro
  artículo. El correcto, verificado, es 10.1152/japplphysiol.01251.2013.

### Lo que NO está fundamentado (dicho explícitamente)

| Afirmación | Situación |
|---|---|
| La ISS lleva glucómetro | ⚠️ No encontrado en fuente abierta. Ax-4 validó "varios métodos" sin nombrarlos |
| Dinamómetro de agarre de ESA en vuelo | ⚠️ Solo aparece en resumen de buscador; sin fuente primaria |
| Equipo para medir estatura en vuelo | ⚠️ No encontrado |
| Licencias de ISI y MSSQ | ⚠️ No verificadas; solo se guarda la puntuación total |
| Validez de Epley en ARED o microgravedad | ⚠️ No encontrada; validado solo en Tierra |
| Umbrales de sueño (eficiencia ≥85 %, latencia ≤30 min, WASO ≤20 min) | ⚠️ "No verificado" en el catálogo; rotulados `CLINICO_T` |
| Tiempo en rango de glucosa 70–180 | Rango terrestre, no validado en microgravedad (`CLINICO_T`) |

## 5. Decisiones que tomaste

| Tema | Decisión |
|---|---|
| Estructura, datasets, umbrales | D1–D6 aprobadas |
| FC pico > 220 lpm | Descartadas como artefacto |
| Glucosa en el piso de 40 mg/dL | Es raro → se conservan marcadas como error (9 días) |
| Tiempo en rango de glucosa | 70–180 mg/dL |
| V56 minutos de ejercicio | Real (Fitbit), ≥ 6 METs |
| V52 / V43 | Fórmula de Swain aceptada / deuda recentrada a 0,3 h |
| V47 ultrasonido | Puente a Python |
| V43 1RM | Epley, con aviso de que es estimación |
| V51 VO₂máx | Ambos métodos comparados |
| Nutrición | CGMacros real + USDA |
| Masa corporal duplicada | `02:V75` se fusiona en `01:V8` de Julio |

## 6. Pendiente

1. **USDA:** volver a correr `npm run tipoB` cuando pase el límite de `DEMO_KEY`, o registrar una clave
   gratuita (la registras tú) y usar `FDC_API_KEY`.
2. **Días de comida extremos** (65 < 800 kcal, 14 > 5000 kcal): decidir si se marcan como registro
   incompleto y con qué corte.
3. **Nada está commiteado.** Los datos crudos y el entorno de Python están en `.gitignore`.
4. Revisión por sexo y consulta R20 con Persona 5: no se hizo en esta capa (es análisis, no ingesta).

## 7. Actualización tras el pull del 14-11 (Julio)

- [manejo-variables-leo.pdf](manejo-variables-leo.pdf): versión sencilla de todo esto, en 8 páginas.
- [listado-78-variables.md](listado-78-variables.md): mis 78 con las tablas de Julio (origen, escalera N0–N4/NT, grupos G1–G9).
- [reloj-huawei-watch5.md](reloj-huawei-watch5.md): qué da el HUAWEI WATCH 5 (2 variables en vivo, 8 por exportación).
- [cumplimiento-propuestas.md](cumplimiento-propuestas.md): checklist de 8 puntos ✅, módulos de EVA y lo pendiente.
- La tabla de investigación ya no tiene campos `PENDIENTE`.
