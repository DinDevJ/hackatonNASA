# Diccionario de datos — de dónde sale y cómo se calcula cada indicador

Documento de referencia del equipo. Si un número va a aparecer en la demo o en una
slide, tiene que estar en esta tabla y con su nivel de confianza.

## Cómo leer este documento

| Marca | Significado |
|---|---|
| ✅ | Verificado en fuente primaria (ver enlaces al final) |
| ⚠️ | De memoria o fuente secundaria — **verificar antes de presentar** |
| 🔶 | Decisión de diseño **nuestra**. No es de NASA. Hay que decirlo así. |

**Regla de oro:** todo dato cae en una de tres categorías. Si alguien del equipo no
puede clasificarlo, ese dato no va en la demo.

1. Lo mide un sensor
2. Lo reporta el astronauta
3. Lo calculamos nosotros

---

## 1. Señales del reloj (PPG + acelerómetro + termistor)

### 1.1 Frecuencia cardíaca (FC)

- **Sensor:** fotopletismografía (PPG). Un LED verde (~525 nm) ilumina la piel y un
  fotodiodo mide la luz que regresa. Con cada latido cambia el volumen de sangre en
  el lecho capilar y con ello la absorción de luz.
- **Cálculo:** señal PPG → filtro pasabanda (~0.5–5 Hz) → detección de picos →
  intervalo entre latidos (IBI, ms) → `FC = 60000 / IBI_promedio`
- **Unidad:** lpm
- ✅ El principio físico es estándar. ⚠️ La implementación exacta es propietaria de
  cada fabricante.

### 1.2 FC en reposo (RHR)

- **No existe una definición universal.** Cada marca la calcula distinto. Tenemos que
  definirla nosotros y escribirlo.
- 🔶 **Nuestra definición:** mediana de FC en la ventana de 30 min con menor conteo de
  actividad dentro del periodo de sueño principal.
- **Por qué importa:** una FC en reposo que sube es un marcador temprano y barato de
  estrés, infección o desacondicionamiento.
- **Riesgo NASA:** Cardiovascular Adaptations · Reduced Cardiorespiratory Fitness

### 1.3 HRV — variabilidad de la frecuencia cardíaca

Nuestra señal estrella. Es el eje autonómico: conecta sueño, estrés y cardiovascular
en una sola variable.

- **Fuente:** la serie de intervalos entre latidos (NN), en ms.
- **Preprocesamiento obligatorio** (si no, la métrica es basura):
  🔶 descartar NN fuera de 300–2000 ms, y los que difieran más de 20 % del anterior.
- **RMSSD** — refleja tono parasimpático (vagal). Es la métrica estándar en ventanas cortas.

      RMSSD = sqrt( (1/(N-1)) * Σ (NN[i+1] - NN[i])² )

- **SDNN** — variabilidad global.

      SDNN = sqrt( (1/(N-1)) * Σ (NN[i] - media_NN)² )

- **Ventana:** convención de 5 min, o toda la noche de sueño.
- ⚠️ **Honestidad técnica obligatoria:** un reloj óptico entrega PRV (*pulse rate
  variability*), no HRV de ECG. Correlacionan bien en reposo y peor en movimiento.
  **Dilo en la presentación.** Te hace ver riguroso, no débil.
- **Riesgo NASA:** Cardiovascular · Sleep · Behavioral

### 1.4 SpO2 — saturación de oxígeno

- **Sensor:** PPG de dos longitudes de onda, rojo (~660 nm) e infrarrojo (~940 nm). La
  hemoglobina oxigenada y la desoxigenada absorben distinto en esas dos bandas.
- **Cálculo:** razón de razones

      R = (AC_660 / DC_660) / (AC_940 / DC_940)
      SpO2 ≈ a - b·R     (a y b de una curva de calibración empírica)

- ✅ Principio estándar de pulsioximetría. ⚠️ Los coeficientes son empíricos y
  propietarios. **Un reloj de consumo no es grado médico.**
- **Riesgo NASA:** Hypoxia (está literal en la lista de riesgos)

### 1.5 Temperatura de piel

- **Sensor:** termistor en la carcasa. **No es temperatura central.**
- 🔶 Usarla siempre como *delta* contra la línea base nocturna del propio sujeto, nunca
  como valor absoluto.
- **Riesgo NASA:** inmune (fiebre incipiente) · sueño (la temperatura cae al dormir)

### 1.6 Sueño

- **Fuente:** actigrafía (acelerómetro) + FC/HRV.
- **Cálculo:** épocas de 30–60 s. Un algoritmo tipo **Cole-Kripke** o **Sadeh** pondera
  el conteo de actividad de la época y de sus vecinas para clasificar sueño/vigilia.
  ⚠️ Son algoritmos reales y publicados, pero los cito de memoria — verificar la
  fórmula exacta si se implementa.
- ⚠️ **Las etapas (ligero / profundo / REM) tienen concordancia limitada contra
  polisomnografía en wearables.** No prometer precisión clínica.
- **Métricas derivadas** (estas sí son estándar y triviales de calcular):
  - TST — tiempo total de sueño
  - Eficiencia = `TST / tiempo_en_cama × 100`
  - Latencia de inicio
  - WASO — vigilia después del inicio del sueño
  - 🔶 **Regularidad** = desviación estándar de la hora de inicio de sueño en los
    últimos 7 días. Barata y conecta directo con el riesgo de horarios irregulares.
- ✅ **Riesgo NASA:** "Risk of Inadequate Sleep and Irregular Schedules". Además,
  **ARCHeR** en Artemis II monitoreó bienestar, actividad y sueño.

### 1.7 Actividad y carga

- Pasos y minutos por zona de FC, del acelerómetro.
- 🔶 `carga = Σ (minutos_en_zona × peso_de_zona)`. Es una convención de fitness, **no de
  NASA**. Decirlo.
- **Riesgo NASA:** Reduced Cardiorespiratory and Musculoskeletal Fitness

---

## 2. Lo que no se mide: se pregunta

### 2.1 Carga de trabajo — NASA-TLX

- ✅ **Es literalmente de NASA** (NASA Ames). Seis subescalas: demanda mental, demanda
  física, demanda temporal, desempeño, esfuerzo, frustración.
- Cada subescala va de 0 a 100.
- Dos variantes: la original pondera con 15 comparaciones pareadas; la **Raw TLX
  (RTLX)** solo promedia las seis.
- 🔶 **Usar RTLX.** Son 6 sliders en vez de 15 comparaciones, y es la versión habitual
  en campo.
- ⚠️ La estructura la cito de memoria. Está muy establecida, pero verificar las
  etiquetas exactas antes de ponerlas en la UI.

### 2.2 Ánimo y afecto

- Instrumentos conocidos en la literatura: **PANAS** (afecto positivo y negativo) y
  **POMS** (perfil de estados de ánimo). Cálculo: ítems Likert sumados por subescala.
- ⚠️ **No tengo verificado cuál usa NASA operacionalmente hoy.** No decir "usamos el
  instrumento de la NASA". Decir "escala tipo PANAS".
- 🔶 **Alternativa honesta y más rápida:** 3 sliders (ánimo, energía, estrés) de 0 a 10
  más una pregunta abierta. Menos validado, pero no estamos mintiendo y la adherencia
  diaria es mucho mejor.
- **Riesgo NASA:** Behavioral Changes and Psychiatric Disorders

### 2.3 Síntomas

- Checklist + texto libre. Cero cálculo.

---

## 3. Pruebas cognitivas (las corre nuestra app)

> **Regla de honestidad.** WinSCAT y la batería Cognition son herramientas reales de
> NASA, pero **no son nuestras ni son de libre distribución**. Nunca decir
> "implementamos WinSCAT". Decir: **"análogos inspirados en las pruebas que usa la
> NASA"**. Esa frase nos protege y suena mejor.

### 3.1 PVT-B — tiempo de reacción  ← la más valiosa

✅ **Hallazgo importante:** NASA corrió en la ISS una herramienta llamada **Reaction
Self-Test** que usa justamente el **PVT-B de 3 minutos** para medir el estado de
alerta de la tripulación. Resultado primario: velocidad de respuesta. Secundario:
lapsos. Es decir, **existe un precedente operacional directo de lo que vamos a hacer.**

- **Origen:** ✅ Basner, Mollicone & Dinges (2011), versión breve del PVT de 10 min.
- **Cómo funciona:** aparece un estímulo tras un intervalo aleatorio; el sujeto
  responde lo más rápido posible.
- **Parámetros verificados del PVT-B:**
  - Duración: 3 min
  - Intervalo entre estímulos: **2–5 s** (el PVT de 10 min usa 2–10 s)
  - **Umbral de lapso: 355 ms** (el PVT de 10 min usa 500 ms) ← no confundirlos
- **Métricas:**
  - **Lapsos** = número de respuestas con RT > 355 ms. La más sensible a privación de sueño.
  - **Velocidad de respuesta** = media de `1/RT`. Se usa el recíproco porque la
    distribución de tiempos de reacción es asimétrica y la media cruda engaña.
  - **Falsos arranques** = respuestas antes del estímulo, o con RT < 100 ms.
- ⚠️ La validación de Basner fue **en tierra, no en órbita**, y los propios autores
  concluyeron que hacía falta más validación aplicada.
- **Riesgo NASA:** Inadequate Sleep · Behavioral

### 3.2 Memoria de trabajo — N-back

- **2-back:** se presenta una secuencia; el sujeto responde si el estímulo actual es
  igual al de dos posiciones atrás.
- **Métricas:** aciertos, falsas alarmas y **d′** (sensibilidad, de teoría de detección
  de señales):

      d' = z(tasa_de_aciertos) - z(tasa_de_falsas_alarmas)

  donde `z` es la inversa de la normal estándar.
- 🔶 **Corrección necesaria:** si una tasa es 0 o 1, `d′` se va a infinito. Aplicar
  corrección log-linear (sumar 0.5 a los conteos) o reemplazar 0 por `1/(2N)`.
- ✅ N-back y d′ son estándar en psicología cognitiva.

### 3.3 Tercera prueba (opcional)

- Sustitución de símbolos y dígitos, para velocidad de procesamiento.
- 🔶 Con dos pruebas ya hay demo. La tercera es lujo; que no bloquee la entrega.

**Contexto ✅ verificado:** la batería **Cognition** de Basner son 10 pruebas de 1–3 min,
~17.8 min en total. **WinSCAT** son 5 pruebas, se corre **mensualmente** en la ISS y se
compara contra la línea base **pre-vuelo** del propio astronauta.

---

## 4. Radiación

Aquí nada sale del reloj. En misión real viene de dosímetros; **en nuestra demo es
simulado, y hay que decirlo en voz alta.**

### 4.1 De dónde vendría en una misión real

- **Pasivos:** TLD (dosímetros termoluminiscentes) y detectores de burbujas. ✅ El
  artículo de CSA muestra al astronauta **David Saint-Jacques** usando detectores de
  burbujas, predecesores del CANS.
- **Activos:** detectores de silicio y espectrómetros de neutrones. ✅ **CANS**
  (Canadian Active Neutron Spectrometer), contrato de **$5.5 M** con Bubble Technology
  Industries; su rasgo distintivo es operar de forma **continua y autónoma**.
- ✅ **Dato citable:** los neutrones son **≈30 % de la radiación total en la ISS**.
- ✅ Linaje canadiense de experimentos: MOSFET, EVARM, Radi-N y Radi-N2.

### 4.2 Cómo se calcula

- **Dosis absorbida `D`**, en gray (Gy) = energía depositada por unidad de masa (J/kg).
- **Dosis equivalente `H`**, en sievert (Sv):

      H = D × w_R

  donde `w_R` es el factor de ponderación según el tipo de radiación. Para fotones y
  electrones `w_R = 1`; para protones, neutrones e iones pesados es mayor — **por eso
  los neutrones preocupan tanto** y por eso existe el CANS.
- ⚠️ Marco ICRP. El concepto es sólido; **los valores exactos de `w_R` por tipo y
  energía hay que verificarlos en fuente primaria** si se ponen en una slide.
- **Para la UI:** mSv acumulados, mSv/día, y proyección a fin de misión.

### 4.3 ⚠️⚠️ Límite de carrera — DATO EN DISPUTA, LEER ANTES DE USAR

Este es justo el número que da ganas de poner grande en una slide. **Las fuentes se
contradicen y no pude resolverlo.**

- El estándar **publicado** de NASA es **3 % de REID** (riesgo de muerte inducida por
  exposición) con 95 % de confianza. Bajo ese estándar, el límite de carrera resulta
  **400 mSv para un hombre de 55 años** y **120 mSv para una mujer de 35 años**.
- En **2021** las National Academies respaldaron la propuesta de NASA de pasar a un
  **límite único de menos de 600 mSv para todos**, calibrado con la mujer de 35 años
  (el grupo más susceptible).
- Un **póster de NASA de 2024** afirma que NASA **ya** aplica 600 mSv para todos.
  Wikipedia todavía describe el 3 % REID como vigente.

**Qué hacer:** mostrar "600 mSv (límite único propuesto/adoptado — verificar estándar
vigente)", o mostrar ambos. **No afirmarlo a secas.** Si hay un juez de HRP en la sala,
ese es exactamente el detalle que cuesta puntos.

---

## 5. Lo que calculamos nosotros (todo 🔶)

### 5.1 Línea base móvil

El problema: comparar contra la línea base **pre-vuelo** produce falsos positivos
constantes, porque en microgravedad el cuerpo *se adapta* (redistribución de fluidos,
adaptación cardiovascular). Si todo se pone rojo en la semana 1, la tripulación deja de
creerle a la app. Eso es fatiga de alarma y mata el producto.

- **Línea base móvil:** mediana de los últimos N días. 🔶 `N = 14` como arranque.
- **Dispersión robusta — MAD:**

      MAD = mediana( |x[i] - mediana(x)| )

- **z robusto:**

      z = 0.6745 × (x - mediana) / MAD

  ✅ El factor `0.6745` hace que el MAD sea comparable a una desviación estándar bajo
  normalidad. Es estadística estándar.
- **Por qué mediana y MAD, y no media y desviación estándar:** un solo día malo (un EVA,
  una noche terrible) arrastra la media. La mediana no se inmuta.
- 🔶 **Umbrales:** `|z| ≥ 2` → amarillo, `|z| ≥ 3` → rojo. **Decisión nuestra, no de
  NASA.** Decirlo.

> **Matiz importante:** para las pruebas **cognitivas** sí es correcto comparar contra
> la línea base pre-vuelo — es literalmente lo que hace WinSCAT. El problema de la
> adaptación aplica a cardiovascular, fluidos y sueño, no a la cognición.

### 5.2 Periodo de adaptación

🔶 Los primeros ~14 días no generan alertas cardiovasculares: son ventana de adaptación
y sólo sirven para construir la línea base en vuelo. Es diseño nuestro y es defendible.

### 5.3 El cruce multivariable (nuestro diferenciador)

Esto no tiene que venir de NASA. Tiene que ser **transparente y auditable**.

Ejemplo de regla:

    SI   sueño < línea_base - 1h  durante 3 días consecutivos
    Y    lapsos_PVT con z ≥ 2
    Y    FC_reposo con z ≥ 2
    ENTONCES  Amarillo — fatiga acumulada, advertencia pre-EVA

🔶 **Recomendación fuerte:** que las reglas vivan en un archivo de configuración legible
(YAML/JSON), no enterradas en el código. En la demo se abre el archivo y el jurado ve
que es auditable. Ese es nuestro argumento contra el "¿y si alucina?".

---

## 6. Tabla resumen: ¿de dónde sale cada cosa?

| Dato | En una misión real | En nuestra demo |
|---|---|---|
| FC, HRV, SpO2, temp. de piel | Reloj / sensores de vuelo | Reloj real (1 persona) + sintético |
| Sueño, actividad | Actigrafía | Reloj real + sintético |
| Ánimo, carga, síntomas | Auto-reporte | Auto-reporte real, en vivo |
| Cognición | WinSCAT · Reaction Self-Test | Nuestros análogos, corridos en vivo |
| Radiación | Dosímetros (CANS, TLD, burbujas) | **100 % simulado — decirlo** |
| Línea base, z, alertas | — | Calculado por nosotros |

---

## Fuentes

Verificadas el 2026-11-14.

- NASA HRP — Hazards: https://www.nasa.gov/hrp/hazards/
- NASA HRP — Risks: https://www.nasa.gov/hrp/risks/
- NASA HRP — Ongoing Research: https://www.nasa.gov/hrp/ongoing-hrp-research/
- CSA — Monitoring radiation for astronaut health: https://www.asc-csa.gc.ca/eng/news/articles/2026/2026-02-26-monitoring-radiation-astronaut-health.asp
- NASA — Space Communications, 7 Things: https://www.nasa.gov/centers-and-facilities/goddard/space-communications-7-things-you-need-to-know/
- Basner, Mollicone & Dinges (2011), validación del PVT-B: https://www.med.upenn.edu/uep/assets/user-content/documents/Basner2011-ValidityandsensitivityofabriefPVT.pdf
- NASA Spinoff — Reaction Self-Test en la ISS: https://spinoff.nasa.gov/Spinoff2013/hm_1.html
- WinSCAT, validación (PubMed): https://pubmed.ncbi.nlm.nih.gov/15943211
- Cognitive Assessment in Long-Duration Space Flight (NTRS): https://ntrs.nasa.gov/citations/20100036584
- National Academies (2021), estándar de exposición a radiación: https://nap.nationalacademies.org/read/26155/chapter/5
