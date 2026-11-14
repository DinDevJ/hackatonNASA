# Pruebas de viabilidad · Persona 5 (Katy)

Resultado de probar, con **datos reales de Tierra**, si las variables que marcamos como
"modelo" sirven o no. Scripts: [`pruebas_viabilidad.py`](pruebas_viabilidad.py) y
[`ferritina_viabilidad.py`](ferritina_viabilidad.py) (detalle de ferritina en
[RESULTADOS-ferritina.md](RESULTADOS-ferritina.md)).

✅ medido por nosotros · ⚠️ limitación · 🔶 decisión

🔶 **Criterio:** AUC ≥ 0,70 = útil · 0,60–0,70 = débil · < 0,60 = no viable.
AUC 0,5 = adivinar; 1,0 = perfecto. Todas con validación cruzada de 5 partes e intervalo
de confianza del 95 %.

---

## Resumen

| Variable | Pregunta | Mejor AUC | Veredicto | Qué hace EVA |
|---|---|---|---|---|
| `R19` ferritina | ¿Se detecta hierro bajo sin análisis de sangre? | 0,61 | 🔴 No viable sin laboratorio | Dato medido en Tierra antes del vuelo + regla |
| `04:A43` + `04:A47` intestino | ¿La frecuencia de evacuación detecta estreñimiento o diarrea? | 0,66 | 🟡 Débil | Preguntar directamente el tipo de la escala de Bristol (es la medición, no hace falta modelo) |
| `R23` densidad ósea | ¿El perfil predice hueso bajo? | 0,74 | 🟢 Útil en Tierra | No hace falta: las astronautas tienen densitometría antes del vuelo |
| `04:A22d` proteína en orina | ¿Una lectura de concentración, como la de la tira, sirve? | 0,95 | 🟢 Útil, **pero se equivoca con orina concentrada** | Regla: leer la proteína **siempre junto con la densidad** (`A22h`) |
| `04:A45` dolor de espalda | ¿El perfil de salud predice dolor frecuente? | 0,69 | 🟡 Débil | Escala de dolor 0–10 + regla; el modelo de Tierra no aplica al espacio |

**De 5 pruebas: 2 útiles, 2 débiles y 1 no viable.** Ninguna se convierte en un modelo
dentro de la app; todas dejan una **decisión concreta** sobre cómo tratar la variable.

---

## 1. Intestino · `04:A43` diarrea y `04:A47` estreñimiento

**Datos:** NHANES 2005–2010, **9750 adultos de 20 a 59 años**. Estreñimiento = tipo 1–2 de
la escala de Bristol; diarrea = tipo 6–7.

| | Estreñimiento | Diarrea |
|---|---|---|
| Prevalencia | 8,0 % | 6,7 % |
| **Mujeres / hombres** | **10,8 % / 5,1 %** | 7,7 % / 5,6 % |
| Regla de frecuencia | < 3 por semana | > 21 por semana |
| Sensibilidad de la regla | **11,9 %** | **6,6 %** |
| Especificidad de la regla | 96,6 % | 99,0 % |
| AUC solo frecuencia | 0,59 (0,57–0,61) 🔴 | 0,62 (0,60–0,64) 🟡 |
| AUC frecuencia + edad + sexo | 0,64 (0,62–0,66) 🟡 | 0,66 (0,64–0,69) 🟡 |

**Conclusión:** contar cuántas veces se va al baño **casi no detecta** estreñimiento ni
diarrea: la regla se pierde casi 9 de cada 10 casos. 🔶 En EVA, la persona elige
**directamente su tipo en la escala de Bristol** (una pantalla con 7 dibujos, un toque).
Esa es la medición; no hace falta modelo. Dato por sexo: **las mujeres tienen el doble de
estreñimiento** que los hombres.

## 2. Densidad ósea · `R23`

**Datos:** NHANES 2017–2018, **1087 mujeres de 50 a 80 años** (NHANES solo midió el fémur
en ese rango). Hueso bajo = T-score ≤ −1 en cuello femoral, con la referencia de mujeres
jóvenes de NHANES III (media 0,858 g/cm², DE 0,120) ⚠️ valores de referencia tomados del
estándar usual, no verificados en esta sesión.

| | Valor |
|---|---|
| Prevalencia de T ≤ −1 / T ≤ −2,5 | 61,1 % / 11,4 % |
| AUC solo edad | 0,65 (0,62–0,69) |
| AUC solo índice de masa corporal | 0,70 (0,67–0,73) |
| **AUC perfil completo** (edad, años sin menstruar, hormonas, anticonceptivos, IMC, embarazos, menarquia) | **0,74 (0,71–0,77)** 🟢 |

**Conclusión:** el perfil **sí predice** hueso bajo, sobre todo por el peso y la edad.
Pero 🔶 **no hace falta en EVA**: las astronautas tienen densitometría antes del vuelo,
que es mejor que cualquier estimación. ⚠️ Además, la población (50–80 años) es mayor que
la mayoría de las astronautas.

## 3. Proteína en orina · `04:A22d` ⭐ el resultado más útil

**Datos:** NHANES 2017–2018, **3185 adultos de 20 a 59 años**. Estándar: cociente
albúmina/creatinina ≥ 30 mg/g. Lo que se parece a una tira: la **concentración** de
albúmina sin corregir (≥ 30 mg/L).

| | Valor |
|---|---|
| Prevalencia de albuminuria | 9,1 % |
| AUC de la concentración | **0,95 (0,94–0,96)** 🟢 |
| Regla ≥ 30 mg/L: sensibilidad / especificidad | 80,3 % / 94,9 % |

**Pero depende de qué tan concentrada esté la orina:**

| | Orina diluida (cuartil bajo de creatinina) | Orina concentrada (cuartil alto) |
|---|---|---|
| Falsos positivos en personas sanas | **0 %** | **15,2 %** |
| Sensibilidad | **46 %** | 100 % |

**Conclusión:** la lectura tipo tira **sirve**, pero **con orina concentrada da falsas
alarmas** (1 de cada 7 personas sanas) **y con orina diluida se pierde la mitad de los
casos**. 🔶 Esto importa mucho en el espacio: **se toma menos agua y la orina se
concentra** (catálogo de Iker). Regla para EVA:

- Proteína positiva **+ densidad alta** (`A22h`) → "probablemente por deshidratación:
  toma agua y repite la tira mañana", no alarma.
- Proteína positiva **+ densidad normal o baja** → avisar a la CMO.
- Proteína negativa **+ densidad muy baja** → no descarta: repetir con orina de la mañana.

## 4. Dolor de espalda · `04:A45`

**Datos:** NHIS 2019, **12 755 adultos de 18 a 64 años**. Dolor frecuente = la mayoría de
los días o todos los días en los últimos 3 meses.

| | Valor |
|---|---|
| Prevalencia | 33,8 % |
| **Mujeres / hombres** | **36,0 % / 31,2 %** |
| AUC perfil de salud (edad, sexo, IMC, depresión, ansiedad, artritis, hipertensión, tabaco, salud general, trabajo) | 0,69 (0,68–0,70) 🟡 |

**Conclusión:** casi llega a útil, pero 🔶 **no aplica al espacio**. En vuelo, el dolor de
espalda viene de que la columna se estira sin gravedad (afecta a hasta el 52 % de los
astronautas, catálogo de Iker), un mecanismo distinto al de la Tierra. EVA usa la escala
de dolor 0–10 y una regla.

## 5. Ferritina · `R19`

Ver [RESULTADOS-ferritina.md](RESULTADOS-ferritina.md). Sin laboratorio, AUC 0,61
(no viable); con hemoglobina, 0,88.

---

## Las que no se pudieron probar todavía

| Variables | Por qué |
|---|---|
| `04:A22a`, `A22b`, `A22c`, `A22g`, `A22h`, `04:A44` | Requieren MIMIC-IV (credencial de PhysioNet) |
| `R06`, `R20`, `R21` | Requieren mcPHASES (acuerdo de uso de PhysioNet) |
| `04:A40` sueño | Requiere registro en NSRR |
| `R18` menopausia | Requiere registro en SWAN (ICPSR) |
| `R02` duración del ciclo | Requiere descargar a mano el CSV de Marquette |
| `04:A48` caries con foto | Entrenar un modelo de imagen lleva horas |

## Limitaciones generales ⚠️

- **Todo es población de Tierra**, no astronautas. Las conclusiones dicen qué tan bien
  funciona una medición o regla, no cómo se comporta en microgravedad.
- No se usaron los pesos de muestreo de NHANES ni NHIS: sirven para estimar prevalencias
  nacionales, no cambian la comparación entre modelos.
- La albúmina de NHANES es medida de laboratorio, no una tira real; la tira es menos
  precisa, así que los números reales serían algo peores.

## Cómo repetirlas

```bash
node Planeacion/Katy/scripts/descargar-datos-tierra.mjs --out datos-tierra
python Planeacion/Katy/viabilidad/pruebas_viabilidad.py --datos datos-tierra
python Planeacion/Katy/viabilidad/ferritina_viabilidad.py --datos datos-tierra/nhanes
```

Corridas el 14 nov 2026 con Python 3.12.10, pandas 3.1.1, scikit-learn 1.9.1 y semilla 42.
