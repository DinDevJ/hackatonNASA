# Mis 75 variables, agrupadas por ruta de investigación

Asignación de Iker (`../ASIGNACION_VARIABLES_MONARCAS.md`): cardiovascular, signos
vitales, ambiente y carga laboral. Identificadores con su archivo de origen, porque
`V21` existe en el catálogo 01 **y** en el 03.

✅ verificado · ⚠️ verificar · 🔶 decisión mía

---

## 0. Por qué agrupo distinto a como se repartió

El checklist tiene 8 puntos. **8 × 77 = 616 casillas. Eso no se llena hoy.**

> ⚠️ **Actualización:** eran 77. Tras fusionar dos duplicados entre catálogos quedan
> **75**. Ver `../variables-diagnostico/DUPLICADOS.md`.

Iker repartió por sistema del cuerpo, que es lo correcto para distribuir carga. Pero
para **ejecutar** el checklist conviene agrupar por **cómo se captura el dato**, porque
dentro de una misma ruta las 8 respuestas son casi idénticas:

- El mismo sensor → **el mismo** dataset, la misma licencia, el mismo modelo preentrenado
- Lo que sólo existe en laboratorio → **una** respuesta cubre todas
- Un cuestionario → el trabajo real es **encontrar su licencia**, y es el mismo trabajo

**9 grupos × 8 puntos = 72 respuestas**, y varias se comparten entre grupos. De 616 a
unas 40 reales.

### Y la consecuencia importante

**23 de mis 77 variables (el 30 %) se responden con dos frases**, porque no son
obtenibles en vuelo. No son trabajo: son un **hueco documentado**, que en la
presentación vale más que un dato inventado.

| Prioridad | Grupos | Variables | Por qué |
|---|---|---|---|
| 🔴 **Primero** | G1, G2, G6 | 21 | Es lo que la demo usa de verdad |
| 🟡 **Después** | G3, G4, G9 | 23 | Entra si da el tiempo |
| 🔵 **Una respuesta y ya** | G7, G8 | 23 | Huecos documentados |
| ⚪ **Riesgo de licencia** | G5 | 8 | Puede que no se pueda usar nada |

---

## G1 · Wearable continuo — 7 variables 🔴

`01:V3` FC en reposo · `01:V23` tiempo de tránsito de onda de pulso · `01:V29` minutos y
tipo de ejercicio · `01:V48` aumento de FC al ponerse de pie · `04:A2` frecuencia
respiratoria · `04:A3` SpO2 · `04:A4` frecuencia cardiaca

⚠️ `01:V27` estaba aquí y **se fusionó en `04:A2`**: eran la misma medición.

**Por qué agrupan:** todas salen de PPG, ECG o acelerómetro. Un solo dataset y un solo
camino de integración las cubre.

**El grupo más valioso de los nueve.** Es lo único que podemos capturar en vivo mañana.
`01:V23` es interesante: tiempo de tránsito de onda de pulso se obtiene de **ECG +
fotopletismografía**, que es exactamente lo que tenemos.

| Checklist | Cómo se resuelve para todo el grupo |
|---|---|
| Unidades y método | Ya están en los catálogos de Iker. Copiar, no reinvestigar |
| Fuentes primarias | NASA-STD-3001 para lo que tenga **[A]**; clínico terrestre para el resto, **rotulado [T]** |
| Datasets reales | Buscar en PhysioNet (PPG, ECG, señales sincronizadas) y verificar licencia |
| Directa / cálculo / estimación | **Directa:** FC, SpO2, frecuencia respiratoria. **Estimación:** `01:V23` desde PPG |
| Modelos preentrenados | Detección de picos y limpieza de artefactos. No hace falta red neuronal |
| Limitaciones | ⚠️ El reloj da **PRV, no HRV de ECG**. SpO2 de consumo no es grado médico |
| Instrucciones reproducibles | Un comando de descarga por dataset + el fragmento de Web Bluetooth |

---

## G2 · Manguito de presión arterial — 3 variables 🔴

`01:V1` PA sistólica/diastólica · `01:V2` descenso nocturno (dip) · `01:V47` caída de PA
al ponerse de pie

⚠️ `04:A5` estaba aquí y **se fusionó en `01:V1`**.

**Por qué van separadas de G1:** ningún reloj de consumo mide PA de forma confiable.
**Requieren manguito y captura manual.** Es la misma conversación cuatro veces, así que
se resuelve una vez.

🔴 **El reto pide presión arterial explícitamente.** No se puede omitir: va con entrada
manual y diciendo por qué.

⚠️ `01:V2` necesita registro **ambulatorio de 24 h**. Es el más difícil del grupo y
probablemente queda fuera.

✅ Umbral útil ya en el catálogo: caída ≥ 20/10 mmHg; sistólica < 70 mmHg como criterio
de presíncope.

---

## G6 · Telemetría de la nave — 11 variables 🔴

`04:A23` ppCO2 cabina · `04:A24` CO2 en traje · `04:A25` O2 inspirado · `04:A26` presión
de cabina · `04:A27` temperatura y humedad · `04:A28` ruido 24 h · `04:A30` productos de
combustión · `04:A31` contaminantes traza · `04:A32` partículas · `04:A33` polvo lunar ·
`04:A35` dosis de radiación personal

**Por qué agrupan:** no vienen del cuerpo sino de la nave, **ya tienen umbrales [A]
oficiales** en NASA-STD-3001 Vol. 2, y ningún dataset de consumo aplica.

🔥 **Este grupo está casi resuelto antes de empezar:**

- Los umbrales **ya están en el catálogo 04 de Iker**, sección C
- `04:A35` ya tiene **datos reales**: 119 eventos de DONKI en `datos/`
- ✅ `04:A23` trae la mejor regla multivariable del proyecto: **cada +1 mmHg de ppCO2
  duplica la probabilidad de cefalea** (n=49). Eso cruza directo con `04:A6`

🔶 En la demo esto es **telemetría simulada**, salvo la radiación. Decirlo.

---

## G3 · Pruebas funcionales y medición puntual — 8 variables 🟡

`01:V8` masa corporal (SLAMMD) · `01:V19` VO2máx · `01:V46` prueba de bipedestación ·
`01:V50` síntomas de presíncope · `01:V52` carga de fluidos y sal · `01:V53` prenda de
compresión · `04:A1` temperatura corporal · `04:A29` umbral auditivo

**Por qué agrupan:** no son flujo continuo, son **un evento que la app guía y registra**.
El trabajo es el protocolo y su umbral, no el sensor.

🔥 `04:A29` es el hallazgo del grupo: la audiometría se hace con **EarQ**, basada en
app. **Es implementable dentro de una PWA.** Una prueba funcional real, no simulada.

✅ Umbrales [A] ya disponibles: masa corporal, alerta si baja más de 3,3 % de la basal ·
VO2máx mínimo ≥ 32,9 (EVA en microgravedad) y ≥ 36,5 (en superficie).

---

## G4 · Escalas individuales validadas — 12 variables 🟡

`03:V53` KSS · `03:V54` Samn-Perelli · `03:V55` fatiga mental y escalas visuales ·
`03:V56` NASA-TLX · `03:V57` escala Bedford · `03:V58` Borg CR10 · `03:V60` carga de
trabajo · `01:V28` edema facial y congestión · `04:A6` cefalea · `04:A7` síntomas por
CO2 · `04:A8` congestión nasal · `04:A9` mal de adaptación espacial

**Por qué agrupan:** son autoinforme. **El trabajo central no es la medición: es la
licencia.** Iker dejó "licencias de los cuestionarios" como hueco abierto.

🔶 **El punto del checklist que de verdad importa aquí es "verifiqué licencias".** Una
escala que no podemos usar legalmente no va en el producto, por buena que sea.

Estado de lo que ya se sabe:
- ✅ **NASA-TLX** es de NASA Ames. Usar la variante **Raw TLX** (6 sliders)
- ✅ **KSS 1–9**: > 6 se asocia a deterioro
- ⚠️ **Samn-Perelli** y **Bedford**: NASA las cita, licencia sin verificar
- ✅ `03:V55` tiene el mejor respaldo del grupo: las **escalas visuales 0–100** de estrés,
  fatiga y carga están **entre los mejores predictores del PVT en la ISS**. Eso valida
  los tres sliders simples que ya habíamos propuesto

---

## G9 · Derivadas — 3 variables 🟡

`01:V6` resistencia vascular sistémica · `03:V29` fase de misión · `03:V59` horas de
trabajo

**No necesitan dataset ni sensor.** Salen de una fórmula o del calendario. Son las más
rápidas de cerrar: el checklist se reduce a documentar la fórmula y su entrada.

---

## G7 · Ultrasonido e imagen — 16 variables 🔵 HUECO

`01:V4` volumen sistólico · `01:V5` gasto cardíaco · `01:V9`–`01:V18` venas yugular,
porta, femoral, pantorrilla, cerebral media, cava, ventrículo izquierdo ·
`01:V20` rigidez carotídea · `01:V21`,`01:V22` grosor íntima-media · `01:V49` índice
compuesto

**Dieciséis variables, una sola respuesta.**

Todas exigen un operador entrenado y equipo de vuelo (**GE Vivid-q**, Ultrasound 2).
Iker ya marcó esto como la mayor dificultad de mi bloque, y coincido: **no se consigue
hoy.** Están en el mismo hueco de datos humanos de vuelo que ya documentamos.

🔶 **No gastar 16 veces el esfuerzo.** Una sola investigación: ¿existe un dataset público
y etiquetado de ultrasonido de vuelo espacial? Casi seguro que no. Se documenta el hueco
con su motivo y se cierra el grupo.

**Y hay algo que sí aporta:** el reto menciona explícitamente *"imágenes de ultrasonido"*
como entrada válida. 🔶 Propongo una **pantalla de diseño** de captura asistida de
ultrasonido, marcada como visión futura. Cubre la relevancia sin prometer lo que no hay.

---

## G8 · Laboratorio — 7 variables 🔵 HUECO

`01:V7` volumen plasmático · `01:V24` HOMA-IR y glucosa · `01:V25` biomarcadores de
estrés oxidativo · `01:V26` renina y aldosterona · `01:V30` parámetros de orina ·
`01:V51` noradrenalina plasmática · `04:A34` microbiología de aire, superficies y agua

**Siete variables, una sola respuesta.** ✅ Iker lo documentó: en la ISS las muestras se
**congelan y se analizan al regreso**. No hay laboratorio en tiempo real.

🔥 **Pero aquí hay una excepción que vale la pena perseguir:** los datos abiertos de
**Inspiration4** en OSDR incluyen **OSD-575 (panel metabólico de suero y citoquinas)** y
**OSD-569 (hemograma)**. Puede que cubran `01:V24` y `01:V25` con **datos humanos reales
de vuelo espacial**.

🔶 Es el único punto de mi asignación donde quizá consigamos datos humanos reales. Vale
una hora de búsqueda; el resto del grupo, no.

⚠️ `01:V24` incluye **glucosa**, que el reto pide explícitamente. Va con entrada manual
y rotulada **[T]** (cortes de la ADA: < 100, 100–125, ≥ 126).

---

## Orden en que lo voy a atacar

1. **G6** — casi hecho: umbrales en el catálogo de Iker, radiación con datos reales
2. **G1** — el único grupo capturable en vivo; es el que sostiene la demo
3. **G2** — corto, y el reto lo pide
4. **G8 (solo la excepción)** — una hora para ver si Inspiration4 cubre `01:V24` y `01:V25`
5. **G7 + resto de G8** — cerrar como huecos documentados. Media hora para 23 variables
6. **G9** — fórmulas, rápido
7. **G3** y **G4** — si queda tiempo. Prioridad a licencias en G4
8. **G5** — último, y **puede que la respuesta honesta sea "no podemos usarlas"**

---

## ⚠️ Lo que quiero advertir al equipo

**Llenar el checklist para 388 variables no es el trabajo de hoy.** El alcance de mañana
siguen siendo los tres P0. Los catálogos son la **credibilidad científica y el respaldo
del Q&A**, no la lista de tareas de implementación.

🔶 Mi recomendación: que cada quien **agrupe sus variables por ruta de captura igual que
esto**, marque sus huecos y no los investigue uno por uno. Un hueco bien documentado
suma en validez; una casilla rellenada a medias resta.
