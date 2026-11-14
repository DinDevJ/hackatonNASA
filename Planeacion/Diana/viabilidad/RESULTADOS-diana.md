# Pruebas de viabilidad · Variables de Diana

Probamos con **datos reales de Tierra** si EVA puede calcular dentro de la app las variables que
Diana priorizó (§10 de [la investigación](../Variables/investigacion_cientifica_diana_monarcas_eva.md))
y si sus reglas YAML hacen lo que dicen. El formato sigue el de
[las pruebas de Katy](../../Katy/viabilidad/RESULTADOS-viabilidad.md).

✅ medido por nosotros · ⚠️ limitación · 🔶 decisión para el software

| Script | Qué prueba | Datos |
|---|---|---|
| [`senales_reloj.py`](senales_reloj.py) | `03:V17` HRV, `03:V18` FC en reposo, `04:A40` sueño, `03:V52` horarios, `03:V62` vigilia | PhysioNet MMASH: 22 hombres sanos, ~24 h cada uno |
| [`cuestionarios.py`](cuestionarios.py) | `03:V1` PHQ-9 y `03:V2` PHQ-2 como filtro del check-in | NHANES 2015–2018: **7942 adultos de 18 a 65 años** |
| [`test_reglas.py`](test_reglas.py) + [`reglas_diana.yaml`](reglas_diana.yaml) | Las reglas de §11.1 y los umbrales de la tabla | 30 casos de prueba |

---

## ⭐ Lista oficial: qué variables entran al software

De las 56 variables de Diana: **6 definitivas**, **2 casi definitivas**, **4 con lógica lista**.
Las demás de [la tabla](../Variables/Tabla_Variables_Diana_Monarcas_EVA.csv) todavía no se han probado.

### ✅ Definitivas: probadas con datos reales

| ID | Variable | Cómo se mide en el software | Condición para que valga |
|---|---|---|---|
| `03:V17` | HRV nocturna (RMSSD y SDNN) | Reloj o banda, latido a latido, con filtro ligero | Descartar la noche si más del 10 % de latidos salen erróneos |
| `03:V18` | FC en reposo | FC del reloj: la mediana de 30 min más baja **durante el sueño** | Que haya sueño registrado esa noche |
| `04:A40` | Horas de sueño | Actigrafía del reloj (Cole-Kripke) | Con los botones "me acuesto / me levanto" |
| `03:V62` | Horas de vigilia continua | Cálculo: ahora menos la hora de despertar | La hora de despertar sale del botón, no del reloj |
| `03:V2` | PHQ-2 (check-in semanal) | Cuestionario de 2 preguntas | Siempre junto con el ítem 9 |
| `03:V1` | PHQ-9 (total e ítem 9) | Cuestionario; se abre si PHQ-2 ≥ 2 o ítem 9 > 0 | Ítem 9 > 0 → alerta crítica aunque el total sea bajo |

### 🟡 Casi definitivas: falta una parte

| ID | Variable | Qué se probó | Qué falta |
|---|---|---|---|
| `03:V52` | Hora de acostarse y levantarse | La hora de dormirse se detecta sola (±24 min); la de despertar no | La regularidad de 7 días: MMASH solo tiene una noche por persona |
| `04:A22d` + `04:A22h` | Proteína en orina + densidad | Datos reales en [la prueba de Katy](../../Katy/viabilidad/RESULTADOS-viabilidad.md) y regla probada aquí | Una tira física real, no una lectura de laboratorio |

### 🔵 Lógica lista, sin datos reales

Las reglas pasan las pruebas, pero la medición en sí no se probó con datos reales. Entran en el
software marcadas como **"regla basada en criterio NASA/clínico"**, sin decir que la validamos.

| ID | Variable | Regla |
|---|---|---|
| `03:V9` | Estrés 0–100 | z robusto contra tu normal: ≥ 2 ámbar, ≥ 3 rojo |
| `04:A22a` + `04:A22b` | Leucocitos y nitritos | Ambos positivos → sospecha de infección urinaria |
| `04:A43` | Diarrea | Con fiebre ≥ 38 °C o 24 h sin mejora → Contact Surgeon |
| `04:A20` | Otoscopia | Tímpano rojo y abombado, o perforado → Contact Surgeon |

### ❌ No entran todavía

| ID | Por qué |
|---|---|
| `03:V3` GAD-7, `03:V7` PSS-10 | Sin dataset abierto con respuestas pregunta por pregunta |
| `04:A17` erupción con foto | El modelo de imagen no se ha probado |
| `03:V16`, `04:A15` cortisol · `04:A13` PCR · `04:A14` carga viral · `04:A21` microbioma | Necesitan laboratorio: solo como archivo histórico, nunca como medición a bordo |

---

## Resumen

| Variable | Pregunta | Resultado | Veredicto | 🔶 Qué hace EVA |
|---|---|---|---|---|
| `03:V17` HRV (RMSSD) | ¿Un filtro ligero da lo mismo que NeuroKit2? | Error típico **6,6 %**; SDNN **2,3 %** | 🟢 Sí, con control de calidad | Filtro ligero + descartar la noche si hay > 10 % de artefactos |
| `03:V17` sin filtro | ¿Se puede usar el RR tal cual? | Error típico **57 %** | 🔴 No | Nunca calcular sobre RR crudo |
| `03:V18` FC en reposo | ¿La FC del reloj coincide con la del RR? | Error típico **0,8 %** | 🟢 Sí | Usar la FC del reloj |
| `03:V18` ventana | ¿Basta con "los 30 min con menos movimiento"? | Falla en 2 de 21 (una da **146 lpm**) | 🟡 No siempre | Medirla **durante el sueño** |
| `04:A40` horas de sueño | ¿Cole-Kripke da el mismo sueño total? | Error típico **4 %** si se sabe cuándo se acostó; **12 %** si no | 🟢 / 🟡 | Botones "me acuesto" y "me levanto" + reloj |
| `03:V52` horarios | ¿Detecta a qué hora se duerme y despierta? | Dormirse: ±24 min. Despertar: **±86 min** | 🟢 / 🔴 | La hora de despertar se toma del botón |
| `03:V62` vigilia | ¿Se calcula sola? | Error **1,4 h** si depende del reloj | 🟡 | Exacta con el botón de despertar |
| `03:V2` → `03:V1` | ¿El PHQ-2 ≥ 3 basta como filtro? | Pierde **32 %** de casos y **40 %** del ítem 9 | 🔴 No | **PHQ-2 ≥ 2 o ítem 9 > 0** abre el PHQ-9: pierde 7,6 % de casos y **0** del ítem 9 |
| Reglas YAML | ¿Disparan cuando deben y solo entonces? | **30 de 30** pruebas pasan | 🟢 | Ya listas para pasarlas a TypeScript |

**Conclusión general:** todo lo del reloj se puede calcular en la app con funciones ligeras,
**siempre que** haya control de calidad de la señal y dos botones manuales (acostarse y
levantarse). El cambio más importante es el del **check-in de salud mental**: el filtro
propuesto dejaba pasar casos graves.

---

## 1. HRV · `03:V17`

**Datos:** MMASH, RR latido a latido durante el sueño de referencia. 21 personas con noche
registrada (`user_11` no tiene registro de sueño).
**Referencia:** NeuroKit2 0.3.0 con corrección de artefactos Kubios (Lipponen y Tarvainen, 2019).
**Lo que haría la app:** quitar IBI fuera de 300–2000 ms y los que se alejan > 20 % de la
mediana local (11 latidos); no unir latidos a través de un hueco.

| Comparación con NeuroKit2 (n = 20, sin el registro ruidoso) | Sesgo | Límites 95 % | Error típico | Spearman |
|---|---|---|---|---|
| RMSSD **crudo** | +92,6 ms | −171 a +357 | 57,4 % | 0,57 |
| RMSSD **filtro ligero** | −8,5 ms | −31,5 a +14,5 | **6,6 %** | **0,91** |
| SDNN **filtro ligero** | −5,9 ms | −23,1 a +11,3 | **2,3 %** | **0,98** |

- ✅ Artefactos por noche: mediana 1,5 %, máximo **16,6 %** (`user_4`). En ese registro
  **también NeuroKit2 falla** (da 443 ms, imposible en reposo), así que no sirve como referencia.
- ⚠️ El filtro ligero da un RMSSD algo más bajo (−8,5 ms). No importa para EVA porque la regla
  compara a la persona **consigo misma** con el mismo filtro (z robusto), no contra un número fijo.
- ✅ El RMSSD varía mucho entre personas sanas (33 a 113 ms sin el ruidoso), lo que confirma la
  decisión de Diana de no usar umbrales absolutos.

🔶 **Decisiones:**
1. La app calcula RMSSD y SDNN con el filtro ligero (cabe en unas 20 líneas de TypeScript).
2. Si una noche tiene **> 10 % de latidos descartados**, se marca "medición no válida" y no
   entra en la línea base ni dispara reglas.
3. Mostrar SDNN junto a RMSSD: es más estable frente a artefactos.

## 2. FC en reposo · `03:V18`

| Comparación | n | Sesgo | Límites 95 % | Error típico |
|---|---|---|---|---|
| FC del reloj vs. FC calculada del RR (misma ventana) | 22 | −0,6 lpm | −3,4 a +2,1 | **0,8 %** |
| Ventana de "menos movimiento" vs. ventana durante el sueño | 21 | +8,2 lpm | −28,7 a +45,1 | 7,7 % |

- ✅ El pulso del reloj es fiable: **100 %** de las personas a menos del 10 %.
- ⚠️ La ventana de "30 min con menos movimiento" que propone la tabla cae en el sueño en el
  86 % de los casos, pero **en 2 de 21 cae en otro momento**: en `user_15` da 146 lpm (quieto pero
  activado). Eso dispararía una falsa alarma de FC alta.

🔶 **Decisión:** la FC en reposo es la **mediana de 30 min más baja dentro del periodo de sueño**.
Si no hay sueño registrado, no se calcula ese día.

## 3. Sueño, horarios y vigilia · `04:A40`, `03:V52`, `03:V62`

**Lo que haría la app:** Cole-Kripke (1992) sobre la cuenta de movimiento por minuto del reloj.
**Referencia:** el sueño calculado por el software del actígrafo en MMASH.

| Medida | n | Sesgo | Límites 95 % | Error típico |
|---|---|---|---|---|
| Sueño total, **sabiendo cuándo se acostó** | 21 | −17 min | −87 a +52 | **4,1 %** |
| Sueño total, **detectado solo** | 21 | −17 min | −194 a +159 | 12,4 % |
| Hora de dormirse | 21 | −12 min | −102 a +77 | 24 min de error medio |
| Hora de despertar | 21 | −36 min | −257 a +186 | **86 min** de error medio |
| Horas de vigilia (`V62`) | 21 | +0,6 h | −3,1 a +4,3 | 1,4 h de error medio |

- ✅ Minuto a minuto: sensibilidad **88 %** (detecta el sueño) y especificidad **92 %**.
- ⚠️ El reloj solo **confunde estar quieto despierto con dormir**, y al revés. Por eso la hora de
  despertar sale mal: quien se mueve en la madrugada parece despierto.

🔶 **Decisiones:**
1. El reloj tiene dos botones: **"me acuesto"** y **"me levanto"**. Con ellos el sueño total queda
   entre −1,5 h y +1 h del de referencia en el 95 % de las noches y la vigilia (`V62`) es un cálculo exacto.
2. Si la persona no los toca, la app estima los horarios con el reloj y lo **marca como
   estimado**, como pide la regla 5 de §9 de la asignación.
3. La alerta de vigilia ≥ 16 h / ≥ 21 h solo se dispara con hora de despertar confirmada.

## 4. Check-in de salud mental · `03:V2` → `03:V1`

**Pregunta:** si cada semana solo se hacen las 2 preguntas del PHQ-2 y el PHQ-9 se abre cuando
sale alto, ¿cuántos casos con PHQ-9 ≥ 10 se pierden? ¿Y cuántas personas que marcarían el
**ítem 9** (pensamientos de hacerse daño)?

**Datos:** NHANES 2015–2016 y 2017–2018, cuestionarios completos, 18–65 años. **n = 7942**
(4097 mujeres, 3845 hombres). PHQ-9 ≥ 10: **8,8 %**. Ítem 9 > 0: **3,7 %** (295 personas).

| Filtro | Detecta PHQ-9 ≥ 10 | Abren el PHQ-9 | Casos perdidos | **Ítem 9 perdidos** |
|---|---|---|---|---|
| PHQ-2 ≥ 3 (el corte habitual) | 68,3 % (65,1–71,5) | 9,7 % | 221 | **117 de 295 (40 %)** |
| PHQ-2 ≥ 2 | 90,8 % (88,7–93,0) | 21,1 % | 64 | 47 (16 %) |
| PHQ-2 ≥ 1 | 96,6 % (95,1–97,8) | 34,4 % | 24 | 15 (5 %) |
| ⭐ **PHQ-2 ≥ 2 o ítem 9 > 0** (3 preguntas) | **92,4 %** (90,4–94,1) | 21,7 % | 53 | **0** |

- ✅ El PHQ-2 ordena bien (AUC 0,94), pero **el corte ≥ 3 se pierde 1 de cada 3 casos**.
- ✅ Sin diferencia relevante por sexo con el filtro recomendado (hombres 91,9 %, mujeres 92,7 %).
- ✅ **El 31 % de quienes marcan el ítem 9 tienen un PHQ-9 total < 10.** La regla de Diana ya lo
  trata bien: el ítem 9 dispara la alerta crítica sin importar el total.

🔶 **Decisión:** el check-in semanal tiene **3 preguntas**: las 2 del PHQ-2 y el ítem 9. Si el PHQ-2
es ≥ 2 o el ítem 9 es > 0, se abre el PHQ-9 completo. En una persona de cada 5 se abre el PHQ-9.
Regla `CHECKIN-ABRIR-PHQ9-01` en el YAML.

⚠️ El **GAD-2 → GAD-7** no se pudo probar: NHANES no tiene GAD-7 y el dataset de Dryad que
cita la tabla (1,86 GB, 39 personas) tampoco lo incluye.

## 5. Reglas YAML

Pasamos a [`reglas_diana.yaml`](reglas_diana.yaml) las 4 reglas de §11.1 sin cambiar su lógica y
añadimos las de los umbrales de la tabla (`V9`, `V62`, `A22`). Las prueba un motor mínimo en
Python ([`motor_reglas.py`](motor_reglas.py)): **30 de 30 pruebas pasan.**

Qué comprueban las pruebas:

- **Fatiga (escenario de Ana):** dispara con las 3 señales; **no** dispara con solo 2 noches
  cortas, ni si solo falla el sueño, ni sin al menos 7 días de línea base.
- **Ítem 9:** rompe el candado de privacidad (CMO y cirujano de vuelo) aunque el PHQ-9 sea 5;
  con ítem 9 = 0 no lo rompe.
- **Orina:** proteína positiva con densidad ≥ 1,025 → "toma agua y repite", **no** avisa a la CMO;
  con densidad normal sí avisa. La sospecha de infección urinaria pide leucocitos **y** nitritos.
- **Diarrea:** dispara con fiebre ≥ 38 °C o 24 h sin mejora; no con fiebre sin diarrea.
- **Auditoría:** cada condición declara su origen (`[A]`, `[T]` o `tu_normal`) y no hay IDs repetidos.

🔶 **Convenciones que fijamos** (hay que acordarlas con el equipo):
- La línea base son los **14 días anteriores**, con **mínimo 7** con dato. Antes de eso, las reglas
  "contra tu normal" no disparan.
- Si la variabilidad de la línea base es 0 (MAD = 0), no hay z y la regla no dispara.
- ⚠️ La regla de diarrea usa `04:A1` (temperatura), que es variable de Julio.

## Lo que no se pudo probar todavía

| Variables | Por qué |
|---|---|
| `03:V52` regularidad de 7 días, línea base de 14 días con datos reales | MMASH solo tiene una noche por persona. Hace falta un dataset de varias semanas (ej. el de Dryad de 28 días, 1,86 GB) |
| Relación HRV ↔ estrés | Con una sola noche no hay relación: RMSSD vs. ansiedad (STAI) ρ = −0,06 (−0,50 a 0,39), n = 21. **No prueba que no exista**: sirve para no prometerla en la demo |
| `03:V3` GAD-7, `03:V7` PSS-10 | Falta un dataset abierto con las respuestas pregunta por pregunta |
| `04:A17` erupción con foto (HAM10000) | Entrenar o evaluar un modelo de imagen lleva horas |
| `04:A22` lectura de la tira con cámara | Requiere fotos reales de tiras |

## Limitaciones ⚠️

- **Todo es población de Tierra.** MMASH son 22 hombres jóvenes sanos: no hay mujeres, así que no
  dice nada sobre diferencias por sexo en HRV o sueño.
- La referencia de sueño de MMASH es otro algoritmo de actigrafía, no polisomnografía.
- No se usaron los pesos de muestreo de NHANES; no cambian la sensibilidad del filtro.
- El PHQ-9 de NHANES es una entrevista asistida; en la app lo contestaría la persona sola.

## Cómo repetirlas

```bash
python -m venv .venv && .venv/Scripts/pip install -r Planeacion/Diana/viabilidad/requirements.txt
python Planeacion/Diana/viabilidad/descargar_datos.py --out datos-diana
python Planeacion/Diana/viabilidad/senales_reloj.py --datos datos-diana/mmash/DataPaper
python Planeacion/Diana/viabilidad/cuestionarios.py --datos datos-diana/nhanes
python -m pytest Planeacion/Diana/viabilidad -q
```

Corridas el 14 nov 2026 con Python 3.13.14, numpy 2.5.4, pandas 3.1.1, scipy 1.18.1,
scikit-learn 1.9.1, NeuroKit2 0.3.0 y semilla 42. Los números exactos están en
[`resultados_senales.json`](resultados_senales.json) y [`resultados_cuestionarios.json`](resultados_cuestionarios.json).
