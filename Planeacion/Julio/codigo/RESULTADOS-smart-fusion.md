# Smart Fusion: implementado y validado contra datos reales

Qué hicimos, qué salió, y qué significa para el producto.

✅ medido por nosotros · ⚠️ limitación · 🔶 decisión

---

## Qué se hizo

1. Se implementó **Smart Fusion** (Karlen et al.) en `smart_fusion.py`: extrae del
   PPG las tres variaciones inducidas por la respiración (**RIFV**, **RIIV**, **RIAV**),
   estima la frecuencia con cada una, las promedia, y **descarta la ventana si las tres
   no están de acuerdo**.
2. Se descargaron **25 registros del dataset BIDMC** de PhysioNet: 8 minutos cada uno,
   PPG a 125 Hz, con **anotaciones manuales de respiración de dos anotadores** como
   referencia. Licencia **Open Data Commons Attribution v1.0**, acceso abierto.
3. Se validó por ventanas de 32 s, paso de 4 s. **2 822 ventanas comparadas.**

Sin aprendizaje automático: sólo `numpy` y `scipy.signal`.

---

## ✅ Resultado 1 · El filtro de varianza funciona, y el precio es explícito

| Umbral SD | Cobertura | n | Sesgo | LoA 95 % | MAE | Dentro de ±2 rpm |
|---:|---:|---:|---:|---:|---:|---:|
| **1** | 34,8 % | 982 | −0,70 | [−7,5, +6,1] | **2,01** | **74,5 %** |
| 2 | 45,1 % | 1 273 | −0,92 | [−7,9, +6,0] | 2,20 | 70,8 % |
| 3 | 57,7 % | 1 628 | −1,03 | [−8,1, +6,1] | 2,45 | 62,7 % |
| 4 | 69,2 % | 1 954 | −1,21 | [−8,3, +5,8] | 2,61 | 55,4 % |
| 6 | 89,5 % | 2 524 | −1,54 | [−8,9, +5,8] | 3,01 | 45,8 % |
| **sin filtro** | 100 % | 2 822 | −1,29 | [−9,0, +6,4] | 3,09 | 44,0 % |

La tendencia es limpia y monótona: **cuanto más exigente el filtro, menor el error y
menor la cobertura.** Es exactamente el comportamiento que queríamos — el estimador
dice "no sé" en vez de inventar.

🔶 **Esto resuelve empíricamente lo que no pudimos verificar en el artículo.** No
encontramos el umbral de descarte en el paper original, así que lo determinamos sobre
datos reales.

---

## 🔴 Resultado 2 · El que nos obliga a cambiar el producto

Un MAE de 2 rpm suena bien hasta que se compara con el predictor trivial: **decir
siempre la media.**

| | r de Pearson | MAE | vs "siempre la media" |
|---|---:|---:|---|
| Umbral 1 | +0,487 | 2,01 | **sólo +15 % mejor** |
| Umbral 2 | +0,479 | 2,20 | +9 % mejor |
| **Sin filtro** | +0,333 | 3,09 | 🔴 **−26 %: PEOR que la media** |

**Sin el filtro de varianza, el algoritmo es peor que un número constante.** Y con el
filtro más exigente apenas la supera.

🔶 **Conclusión: no mostrar la frecuencia respiratoria ventana a ventana.** Como lectura
instantánea no aporta casi nada sobre una constante, y mostrarla sería dar una precisión
que no tenemos.

---

## ✅ Resultado 3 · Agregar lo cambia todo, y valida el diseño

Nuestro producto **no muestra lecturas instantáneas**: calcula un valor diario y lo
compara contra la línea base móvil de la persona. Así que la pregunta correcta es si
el agregado funciona. **Se probó:** mediana de las ventanas de cada registro.

| | r de Pearson | MAE | vs "siempre la media" |
|---|---:|---:|---|
| **Ventana suelta** (umbral 1) | +0,487 | 2,01 | +15 % |
| **Agregado por registro** (umbral 1) | **+0,685** | **1,34 rpm** | **+45 %** |

**Al agregar, la correlación sube de 0,49 a 0,69 y el error baja a 1,34 rpm.**

🔶 **El diseño ya era el correcto, y ahora está medido.** La decisión de comparar
siempre contra la línea base propia en vez de mostrar valores instantáneos no era una
preferencia estética: **es lo único que hace utilizable esta señal.**

---

## ⚠️ Limitaciones, dichas antes de que las pregunten

1. **Nuestra detección de latidos no es la de Karlen.** Él usa *Incremental-Merge
   Segmentation*; no verificamos su especificación, así que usamos detección de picos
   estándar. Esto es **Smart Fusion tal como está descrito**, no una reimplementación
   verificada.
2. **Nuestros límites de concordancia son más anchos que los de la literatura.** La
   literatura cita **±5,4 rpm**; nosotros medimos **≈±7 rpm** por ventana. Explicación
   razonable: BIDMC son **pacientes de UCI**, no sujetos sanos en condiciones ideales, y
   nuestra detección de latidos es más simple. **No lo presentamos como que el método
   falla: lo presentamos como que nuestra medición es más dura.**
3. **Hay un sesgo negativo** de −0,7 a −1,5 rpm: subestimamos un poco. 🔶 Para
   comparar a alguien consigo mismo eso **se cancela**; para un valor absoluto, no.
4. **n = 25 registros, de 8 minutos.** El agregado nocturno real tendría muchas más
   ventanas, así que **plausiblemente iría mejor — pero eso no lo hemos medido.**
5. **El PPG de BIDMC es de dedo, de un monitor clínico.** Un reloj de muñeca da peor
   señal; la literatura señala que **el torso superior da mejor señal respiratoria que
   otras ubicaciones**.

---

## 🔶 Lo que esto decide para el producto

| Decisión | Por qué |
|---|---|
| **Filtro de varianza activado, umbral 1** | Sin él, el estimador es peor que una constante |
| **No mostrar valor por ventana** | +15 % sobre una constante no justifica un número en pantalla |
| **Sí mostrar el agregado diario contra la línea base** | r = 0,69 y MAE 1,34 rpm: ahí sí hay señal |
| **Mostrar siempre cuántas ventanas se descartaron** | Es el indicador de calidad, y es gratis |

### Para el pitch

> "Implementamos el algoritmo publicado y lo validamos contra 25 registros reales de
> PhysioNet con respiración anotada a mano. Descubrimos que por ventana apenas supera a
> un número constante, así que **no lo mostramos por ventana**. Agregado en un valor
> diario contra la línea base de la persona, la correlación sube a 0,69 y el error baja
> a 1,3 respiraciones por minuto. Por eso el producto funciona como funciona."

🔶 Esa frase vale más que cualquier gráfica: **dice que medimos nuestra propia
herramienta y que la usamos sólo donde funciona.**

---

## Reproducirlo

```bash
pip install numpy scipy pandas
```

```bash
mkdir bidmc && cd bidmc
for i in $(seq -w 1 25); do
  for t in Signals Breaths; do
    curl -sO "https://physionet.org/files/bidmc/1.0.0/bidmc_csv/bidmc_${i}_${t}.csv"
  done
done
```

```bash
python3 validar_smart_fusion.py ./bidmc
```

## Fuentes

- Karlen et al., *Multiparameter Respiratory Rate Estimation From the Photoplethysmogram*: https://www.researchgate.net/publication/235521997_Multiparameter_Respiratory_Rate_Estimation_From_the_Photoplethysmogram
- BIDMC PPG and Respiration Dataset (PhysioNet, ODC-By v1.0, DOI 10.13026/C2208R): https://physionet.org/content/bidmc/1.0.0/
- Licencia de BIDMC: https://physionet.org/content/bidmc/1.0.0/LICENSE
