# Prueba de viabilidad · Ferritina (`R19`)

Persona 5 (Katy). Script: [`ferritina_viabilidad.py`](ferritina_viabilidad.py).

✅ medido por nosotros · ⚠️ limitación · 🔶 decisión

---

## La pregunta

¿Puede EVA saber si una astronauta tiene **deficiencia de hierro** usando solo datos que
ella puede dar a bordo o que ya están en su perfil, **sin análisis de sangre**?

Importa porque en la ISS **no hay laboratorio en tiempo real** (catálogo de Iker), el
sangrado menstrual hace perder hierro y la hemoglobina cae al volver del espacio
(`01:V108`).

## Qué se hizo

| Paso | Detalle |
|---|---|
| Datos | **NHANES 2017–2018** (CDC, públicos): ferritina, hemoglobina, salud reproductiva, medidas corporales y demografía |
| Población | **1132 mujeres de 20 a 49 años**, sin embarazo, con ferritina medida |
| Qué se predice | Ferritina **< 15 µg/L** (deficiencia de hierro) y, aparte, **< 30 µg/L** (hierro bajo) |
| Datos del perfil (sin laboratorio) | Edad, periodos regulares en el último año, anticonceptivos orales, hormonas femeninas, número de embarazos, edad de la primera menstruación, índice de masa corporal |
| Modelos | Regresión logística y gradient boosting, con validación cruzada de 5 partes |
| Comparaciones | 1) Respuesta trivial: "nadie tiene deficiencia". 2) Regla clínica de anemia: hemoglobina < 12 g/dL (necesita laboratorio) |
| Medida | **AUC**: 0,5 = adivinar; 1,0 = perfecto. Intervalo de confianza del 95 % con 1000 remuestreos |

🔶 **Criterio de viabilidad:** AUC ≥ 0,70 = útil · 0,60–0,70 = débil · < 0,60 = no viable.

## Resultados ✅

**Prevalencia:** 17 % tiene ferritina < 15 µg/L y 37,6 % < 30 µg/L.

### Ferritina < 15 µg/L

| Qué se usa | AUC (IC 95 %) | Veredicto |
|---|---|---|
| Respuesta trivial | 0,50 | — |
| **Solo perfil**, regresión logística | **0,61** (0,57–0,66) | 🟡 Débil |
| Solo perfil, gradient boosting | 0,59 (0,54–0,64) | 🔴 No viable |
| **Hemoglobina** (laboratorio) | **0,88** (0,85–0,90) | 🟢 Útil |
| Perfil + hemoglobina | 0,87 (0,84–0,90) | 🟢 Útil |

Regla de anemia (hemoglobina < 12 g/dL): **sensibilidad 55,4 %**, especificidad 94,1 %.

### Ferritina < 30 µg/L

| Qué se usa | AUC (IC 95 %) | Veredicto |
|---|---|---|
| Solo perfil, regresión logística | 0,60 (0,56–0,63) | 🔴 No viable |
| Solo perfil, gradient boosting | 0,54 (0,51–0,57) | 🔴 No viable |
| Hemoglobina (laboratorio) | 0,74 (0,72–0,78) | 🟢 Útil |
| Perfil + hemoglobina | 0,74 (0,71–0,78) | 🟢 Útil |

### Qué variables del perfil pesan más

En la regresión logística (variables estandarizadas, ferritina < 15):

| Variable | Peso | Lectura |
|---|---:|---|
| Periodos regulares en el último año | +0,39 | Menstruar sube el riesgo |
| Número de embarazos | +0,33 | Más embarazos, más riesgo |
| Anticonceptivos orales | −0,11 | Asociado a menos riesgo |
| Las demás | cerca de 0 | Casi no aportan |

⚠️ Es asociación, no causa. Que los anticonceptivos se asocien a menos riesgo es
coherente con que suelen reducir el sangrado, pero esta prueba no lo demuestra.

## Conclusión

1. 🔴 **Predecir el hierro con un cuestionario a bordo NO es viable.** El mejor modelo
   solo con el perfil llega a AUC 0,61: apenas mejor que adivinar.
2. 🟢 **La hemoglobina sí es útil** (AUC 0,88), pero requiere laboratorio.
3. **Agregar el perfil a la hemoglobina no mejora nada** (0,87 vs. 0,88).
4. ⚠️ **La exactitud engaña:** decir "nadie tiene deficiencia" acierta el 83 % de las
   veces y no detecta a nadie. Por eso se mide con AUC.
5. ⚠️ **La regla de anemia se pierde casi a la mitad de los casos** (sensibilidad 55 %):
   tener hemoglobina normal no garantiza tener hierro suficiente.

## Qué significa para EVA 🔶

- **`R19` no se convierte en módulo de predicción.** Ferritina y hemoglobina entran como
  **dato del perfil medido en Tierra antes del vuelo** (nivel N4 de la escalera de
  Julio).
- **A bordo, EVA solo marca riesgo**, como regla y no como modelo: periodos con sangrado
  abundante (`R04` PBAC ≥ 100) + ferritina baja antes del vuelo → recomendar revisar la
  hemoglobina en la siguiente oportunidad y consultar con la CMO.
- **Para el pitch:** "probamos predecir el hierro sin sangre y no funciona; por eso EVA no
  lo intenta y lo pide como dato antes del vuelo." Es un resultado honesto que demuestra
  método, igual que el de frecuencia respiratoria de Julio.

## Limitaciones ⚠️

- **Población de Tierra:** mujeres de la población general de EE. UU., no astronautas.
  En vuelo cambian el volumen de sangre y la hemoglobina.
- **NHANES 2017–2018 no pregunta por sangrado abundante.** Es el predictor que más
  debería importar y no está; con él, el modelo de perfil podría mejorar. Por eso la
  regla de EVA usa el PBAC (`R04`).
- **No se usaron los pesos de muestreo de NHANES.** Para estimar prevalencias de población
  habría que usarlos; para comparar modelos no cambia la conclusión.
- La ferritina sube con la inflamación, así que puede esconder una deficiencia real.

## Cómo repetirla

```bash
node Planeacion/Katy/scripts/descargar-datos-tierra.mjs --out datos-tierra
python Planeacion/Katy/viabilidad/ferritina_viabilidad.py --datos datos-tierra/nhanes
```

Requisitos: Python 3.10+, `pandas`, `numpy` y `scikit-learn`. Corrida del 14 nov 2026
con Python 3.12.10, pandas 3.1.1, scikit-learn 1.9.1 y semilla 42: los números de
arriba deben salir iguales.
