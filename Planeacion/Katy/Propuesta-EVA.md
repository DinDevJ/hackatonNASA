# EVA — propuesta unificada del Equipo Monarcas

Monitoreo de salud para astronautas en misiones de larga duración. NASA Space Apps 2026,
reto *Create Health Monitoring Software for Astronauts on Space Missions*.

**Equipo:** Monarcas · **Producto:** EVA

Este documento **une las propuestas de todo el equipo** (Diana, Fani, Iker, Julio, Katy,
Leo). No las reemplaza: cada sección dice de quién viene y enlaza al documento original.

✅ verificado · ⚠️ verificar · 🔶 decisión nuestra · **[A]** umbral oficial NASA o
validado en astronautas · **[T]** umbral clínico terrestre (convención del README y de
Iker)

---

## Resumen en un minuto

**Qué es:** una app (reloj + panel + tablet) que conoce la línea base de cada astronauta,
cruza señales para detectar problemas antes de que sean emergencias, guía a la
tripulación paso a paso cuando la Tierra tarda hasta 48 min en responder, y cuida quién
ve qué en una tripulación de 4 personas.

**Qué incluye:** los **22 módulos** que propuso el equipo (§9). Ninguno se quita: la
prioridad solo decide en qué orden se construyen.

**Qué se construye primero (núcleo, 7 módulos):** panel con figura humana y semáforo ·
motor de prevención con reglas auditables · emergencia de evento solar con buddy check ·
radiación con datos reales de DONKI · reloj · privacidad por rol · nota de Tierra que
llega tarde.

**Por qué puede ganar:** usa **datos reales de NASA** (51 eventos solares + umbrales
oficiales de NASA-STD-3001), **cada número dice de dónde sale** ([A] o [T]), y tiene
un ángulo humano que pocos equipos tendrán: buddy system, privacidad y salud femenina.

**Riesgo principal:** el alcance. Son 22 módulos; si no se construyen en orden de
prioridad, el núcleo no termina. La evaluación honesta está en §2.

---

## 0. Decisiones tomadas

| Decisión | Elegido | Origen |
|---|---|---|
| Nombre | **EVA** (propuesto: Evaluación Vital Autónoma; en votación) | Equipo |
| Base técnica | Motor de línea base + reglas YAML + escalera de escalamiento | [Julio](../Julio/comportamiento-del-software.md) |
| Datos y umbrales | Catálogo de variables con procedencia [A]/[T] | [Iker](../variables-diagnostico/00-indice-priorizado.md) |
| Emergencia de la demo | **Evento de partículas solares (SPE)** con datos reales de DONKI | [Julio](../Julio/comportamiento-del-software.md#7-segundo-escenario-corto--día-115-evento-de-partículas-solares) |
| Quién ve qué | Privacidad por capas con buddy system (§7) | Katy |
| Capa visual | Figura humana, semáforo con formas, reloj + panel | [Katy](Propuesta-LAZO-NASA-SpaceApps-2026.md#6-diseño-uxui-cómo-se-ve-y-cómo-se-usa) |
| Módulos | 22 módulos de todas las propuestas, por prioridad (§9) | Todos |

### ⚠️ Ojo con el nombre

En NASA, **EVA = Extravehicular Activity**, una **caminata espacial**. 🔶 Propuesta:

- **EVA — Evaluación Vital Autónoma.**
- En el texto, la UI y la demo, a la otra EVA le decimos siempre **"caminata espacial"**.
- Remate posible en el pitch: *"Antes de cada EVA, EVA te dice si estás listo."*

## 0.1 Contexto único de la demo y tripulación 🔶

Todos los escenarios, maquetas, datos sintéticos y diapositivas usan **este contexto**.

**Misión:** tránsito a Marte, días 112 a 115 de vuelo. Retraso de comunicación ese día:
**18 min por trayecto** (36 min ida y vuelta), dentro del rango de 4–24 min ✅.

| ID | Nombre | Rol | Sexo | Pareja del buddy system | Papel en la demo |
|---|---|---|---|---|---|
| MS-1 | Tomás | **Comandante** | H | Mei | Recibe "apto / no apto" y la alerta cuando la CMO no aparece |
| MS-2 | Ana | Especialista de misión | M | Luis | **Protagonista:** fatiga del día 112 → cierre del día 114; tiene programada una caminata espacial |
| MS-3 | Mei | **CMO** | M | Tomás | En el evento solar no confirma que llegó al refugio |
| MS-4 | Luis | Ingeniero de vuelo | H | Ana | Hace los check-ins de cuidado a Ana en el juego |

- Dos mujeres y dos hombres, para que el módulo de salud femenina y la tabla por sexo
  tengan a quién aplicarse.
- Si la CMO es quien falta, el caso "el CMO no está disponible" se ve sin otro escenario.
- La línea base de Ana es la del escenario de Julio: FC en reposo 58, sueño 7 h 05,
  2 lapsos en la prueba de reflejos.

---

## 1. La pregunta y la tesis

**Pregunta central** ([Diana](../Diana/Propuesta.md)):
> ¿Cómo ayudamos a una tripulación sin médico presente a entender los cambios en su salud,
> reconocer una emergencia y actuar a tiempo?

**Tesis** ([Julio](../Julio/comportamiento-del-software.md)):
> El monitoreo diario no es para hacer gráficas. Es para que, cuando pase lo malo, EVA
> ya sepa cómo es esta persona cuando está bien.

**Cadena del producto:** Recabar → Organizar → Monitorear → Prevenir → Asistir.

**Por qué tiene que decidir a bordo** (análisis de Julio con datos reales de DONKI ✅):
NASA tardó una **mediana de 17 min** en emitir la alerta de un evento solar, con mucha
variación. Súmale **4 a 24 min** de viaje de la señal hasta Marte. Cuando el aviso llega,
la dosis ya se recibió.

**Por qué la línea base personal no es un capricho** ([Iker](../variables-diagnostico/00-indice-priorizado.md) ✅):
**no existe una tabla pública de NASA** del tipo "signo vital X > Y → llamar al cirujano".
NASA-STD-3001 remite a "valores clínicamente aceptados" y a documentos que no son
públicos. Comparar a cada persona consigo misma es la forma honesta de alertar.

---

## 2. ¿Cumple con lo que pide NASA? Evaluación realista

### 2.1 Requisitos del reto, punto por punto

Fuente: pestañas *Details* y *Resources* del reto ✅.

| El reto pide o sugiere | Dónde está en EVA | Veredicto |
|---|---|---|
| Herramienta **visual** para que el astronauta **evalúe su propia salud** | Panel, Cuerpo EVA, semáforo (módulos 1, 2, 5) | ✅ Cumple |
| **Guía de tratamientos y mejoras** | Protocolos con seguimiento y cierre (Julio); criterios "Contact Surgeon" del checklist médico de NASA (Iker) | 🟡 Cumple con reservas: los protocolos clínicos no están validados; la demo usa uno logístico |
| Indicadores sugeridos: presión, FC, glucosa, temperatura, sueño, ánimo | Los seis, con su umbral y procedencia (§5) | ✅ Cumple. ⚠️ No se sabe qué glucómetro hay a bordo: la glucosa entra a mano |
| Entrada por teclado, clics, cámara; cualquier indicador | Manual, wearable, cámara, prueba en pantalla, dato de la nave (catálogo de Iker) | ✅ Cumple |
| Usar recursos del HRP y de otras agencias | 17 riesgos del HRP, CSA (Bio-Monitor, radiación), NASA-STD-3001, DONKI | ✅ Cumple, de sobra |
| ¿Qué se puede medir en el espacio? ¿Por qué? | §5 y catálogo de Iker (364 variables, inventario de equipo a bordo) | ✅ Cumple, es la parte más sólida |
| ¿Cómo afectan los peligros a cada indicador? | Columna "cambio en vuelo" del catálogo de Iker | ✅ Cumple |
| ¿Cuándo amerita atención de la tripulación o de Tierra? | Escalera de escalamiento + semáforo + criterios "Contact Surgeon" | ✅ Cumple |
| ¿Qué hacer para prevenir? | Motor de prevención (fatiga 112 → 114), metas de agua, ejercicio y CO₂ | ✅ Cumple |
| Interfaz clara, animación e interactividad | Maquetas, guía de estilo, figura humana | 🟡 Diseñado; falta construirlo |
| Figura humana clicable | Cuerpo EVA | 🟡 Diseñado; falta construirlo |
| Distintos entornos (nave, estación, rover, Luna, Marte) | Perfiles de entorno (módulo 17, prioridad 🔵) | 🟠 Se construye al final; si no llega, la demo usa un único entorno (tránsito a Marte) |
| Recordatorios dentro de la rutina | Reloj + recordatorios (módulo 5) | ✅ En el núcleo |
| Gamificación | Juego cooperativo (módulo 12) | 🟡 Como pantalla de diseño |
| Gráficas dinámicas | Tendencias contra línea base (módulo 1) | ✅ En el núcleo |
| Código de colores | Semáforo ●■▲ con forma, color y texto | ✅ Cumple, y además es accesible |
| No suponer conocimiento médico | Biblioteca, "¿por qué se mide esto?", un paso por pantalla | ✅ Cumple |

**Veredicto honesto:** en **papel** cubre todo lo obligatorio y casi todo lo opcional.
Lo que puede fallar es la **ejecución**: hoy hay mucho diseño y poco código. Si el
núcleo de §9 no está corriendo, el veredicto baja a "buena idea, sin producto".

### 2.2 Criterios de evaluación de Space Apps

Space Apps evalúa impacto, creatividad, validez, relevancia y presentación.

| Criterio | Nota realista | Por qué | Qué la sube |
|---|---|---|---|
| **Relevancia** | 🟢 Alta | Responde una por una las preguntas del reto (§2.1) | Mostrar la tabla de §2.1 en una diapositiva |
| **Validez** | 🟢 Alta | [A]/[T] en cada umbral, fuentes de NASA, limitaciones dichas en voz alta | Abrir el YAML y la etiqueta [A]/[T] durante la demo |
| **Impacto** | 🟡 Media-alta | Autonomía médica real (EIMO, Health Beyond) + uso en la Tierra | Una cifra concreta: latencia de 17 min + 18 min de viaje |
| **Creatividad** | 🟡 Media-alta | Buddy check, privacidad por rol, nota tardía. Pero "app de monitoreo de salud" es el tema obvio del reto | Que el buddy check y la nota tardía sean los momentos memorables de la demo |
| **Presentación** | 🟠 Depende de la ejecución | Hay guion y maquetas; no hay producto todavía | Demo en modo avión que funcione de punta a punta |

⚠️ Julio encontró **otros equipos construyendo algo parecido**
([stack §4](../Julio/stack-y-dependencias.md)). Lo que nos separa no es la idea general,
es lo que aparece en §3.

---

## 3. Distinguidores

Ordenados por qué tan difícil es que otro equipo los tenga.

| # | Distinguidor | Por qué es difícil de copiar | De quién |
|---|---|---|---|
| 1 | **Datos reales de NASA dentro del producto:** 51 eventos solares de DONKI y su latencia medida | Requiere haber descargado y analizado la API (ya está en el repo) | Julio |
| 2 | **Cada umbral dice si es oficial de NASA [A] o terrestre [T]**, con 364 variables catalogadas | Es trabajo de investigación de días, no de una noche | Iker |
| 3 | **Motor auditable:** reglas en YAML que se abren frente al jurado | Responde a "¿y si la IA alucina?" | Julio |
| 4 | **Línea base personal + cruce de 3 señales** ("ninguna sola dispararía; las tres juntas, sí") | Exige datos longitudinales y un modelo explicable | Julio |
| 5 | **Buddy check en el evento solar:** nadie se queda atrás sin compartir datos médicos | Une seguridad, equipo y privacidad en un solo momento | Katy · Julio |
| 6 | **Privacidad por rol visible:** candados, "lo que ven de mí", panel público | Casi nadie piensa en que una nave es un lugar compartido | Katy |
| 7 | **La nota de Tierra que llega tarde**, con su antigüedad | Muestra en una imagen por qué el sistema decide solo | Julio |
| 8 | **Salud femenina tratada en serio**, privada y sin juego | Tema poco cubierto y con datos escasos | Katy · Leo |
| 9 | **Criterios públicos de "Contact Surgeon"** del checklist médico de NASA | Fuente oficial poco conocida | Iker |
| 10 | **Demo completa en modo avión** | Coherente con todo el discurso | Julio |

---

## 4. Arquitectura en capas

| Capa | Qué hace | De quién |
|---|---|---|
| **Datos** | Reloj, camiseta biométrica, check-in de 20 s, prueba de reflejos PVT-B, dosímetro, sensores de la nave, eventos DONKI | Julio · Iker |
| **Umbrales** | Oficiales NASA [A] donde existen; terrestres [T] rotulados; si no hay, línea base personal | Iker |
| **Motor** | Línea base móvil de 14 días (mediana + MAD), z robusto, reglas multivariables en YAML | Julio |
| **Riesgo** | Probabilidad con modelo, margen contra la norma o nivel relativo | [Leo](../Leo/resumen.md) |
| **Escalamiento** | Nivel 0 autocuidado → 1 CMO a bordo → 2 cirujano de vuelo → 3 junta médica | Julio |
| **Privacidad** | Quién ve qué, buddy system, registro de accesos | Katy |
| **Experiencia** | Reloj + panel, figura humana, semáforo ●■▲, juego cooperativo | Katy |
| **Tiempos** | Cada registro con `t_sclk`, `t_scet`, `t_ert`; Tierra ordena por SCET y muestra la antigüedad | Julio |
| **Enlace con Tierra** | Cola priorizada, envío diferido, red tolerante a interrupciones (DTN) a futuro | Julio · [Fani](../Fani/Propuesta.docx) |

---

## 5. Datos y umbrales

Basado en el [catálogo de Iker](../variables-diagnostico/00-indice-priorizado.md).

### 5.1 Lo que condiciona el diseño ✅

- **Casi ningún análisis de sangre u orina está disponible en tiempo real.** En la ISS las
  muestras se congelan y se analizan al regreso, y ningún sistema mide densidad ósea en
  vuelo. EVA se apoya en autoinforme, signos vitales, wearables, ultrasonido, fotos,
  equipo de ejercicio y datos de la nave.
- **No hay umbrales públicos de NASA para signos vitales.** Los de EVA son terrestres [T]
  y se rotulan así en pantalla.
- **Sí hay umbrales oficiales NASA [A]** de radiación, ambiente de cabina, aptitud física y
  nutrición (§5.3), y criterios públicos de "Contact Surgeon" (§5.4).
- **Casi todos los estudios en vuelo tienen entre 3 y 14 personas.** Sirven para decidir
  qué medir, no para predecir en un individuo.
- **La SpO₂ de reloj puede sobreestimar cuando el oxígeno está bajo** (Iker cita un
  resumen que no está en el repo). Por prudencia, nunca es la única alerta.

### 5.2 Los indicadores del reto, con umbral y procedencia

| Indicador | Cómo se mide a bordo | Qué cambia en vuelo | ● / ■ / ▲ y procedencia |
|---|---|---|---|
| **Presión arterial** | Manguito; Bio-Monitor | Sistólica de 24 h baja ~8–14 mmHg (n = 8–12) | Rangos AHA [T]. Al volver a la gravedad: caída ≥ 20/10 mmHg [T]; sistólica < 70 = presíncope [A] |
| **Frecuencia cardiaca** | Reloj, Bio-Monitor, Holter | En reposo sin cambio claro (n = 8) | Desviación de la línea base; > 100 lpm en reposo [T]; QTc ≥ 500 ms de riesgo [T], > 440 ms observado en astronautas [A] |
| **SpO₂** | Pulsioxímetro del kit, Bio-Monitor | NASA fija el límite sobre el aire de cabina, no sobre la SpO₂ | ≤ 92 % contactar, ≤ 88 % urgente [T, propuesta no oficial] |
| **Glucosa** | Glucómetro (⚠️ modelo a bordo desconocido) → entrada manual | Resistencia a la insulina hasta +60 % (n = 8) | Ayuno < 100 / 100–125 / ≥ 126 mg/dL, ADA [T] |
| **Temperatura** | Bio-Monitor, termómetro | La central sube ~1 °C en vuelo largo (n = 11) | Contra línea base propia; fiebre ≥ 39,4 °C sostenida para contactar [T, propuesta no oficial] |
| **Sueño** | Reloj (actigrafía) | ISS: 6,09 h de media, 43,8 % de noches < 6 h (n = 21) | Contra línea base; somnolencia KSS > 6 [T] |
| **Ánimo** | Check-in de 20 s; PHQ-9 y GAD-7 semanales (uso libre) | Sin corte validado en astronautas | Tendencia de 7 días; PHQ-9 o GAD-7 ≥ 10 como alerta [T] |
| **Hidratación** | Registro de agua; masa corporal | Se bebe menos en microgravedad | Al menos **32 mL/kg al día [A]**; orina < 1,5 L/día = riesgo de cálculos [T] |
| **Masa corporal** | Equipo de masa en microgravedad (SLAMMD) | Refleja líquidos y balance de energía | Alerta si baja **más de 3,3 % de la basal [A]** |
| **Dosis de radiación** | Dosímetro personal (Crew Active Dosimeter) | ISS ~0,2–0,5 mSv/día | Ver §5.3 [A] |

### 5.3 Umbrales oficiales NASA [A] que alimentan el semáforo

Todos de NASA-STD-3001 (Vol. 1 Rev C y Vol. 2 Rev F, 2026), según el
[archivo 04 de Iker](../variables-diagnostico/04-inmune-ambiente-equipo-umbrales.md).

| Tema | Umbral |
|---|---|
| Dosis efectiva de carrera | **< 600 mSv, igual para toda edad y sexo** (≈ 3 % de riesgo medio de muerte por cáncer) ✅ |
| Dosis por evento solar | **< 250 mSv por evento**; refugio de Orion diseñado para 150 mSv |
| Tasa de dosis de diseño | < 1,3 mSv/día en espacio libre; < 0,9 en superficie |
| Dosis por órgano (30 días / 1 año / carrera, mGy-Eq) | Cristalino 1000/2000/4000 · piel 1500/3000/6000 · hematopoyético 250/500 · circulatorio 250/500/1000 · SNC 500/1000/1500 |
| CO₂ de cabina | **≤ 3 mmHg promedio de 1 h**; < 2,5 mmHg en 7 días deja el riesgo de cefalea < 1 % |
| O₂ inspirado | Objetivo 145–155 mmHg; mínimo 127 |
| Ruido | 75 dBA en 8 h en órbita; NC-40 para dormir |
| Temperatura y humedad | Entre 18 °C / 75 % y 27 °C / 25 % |
| Aptitud física | VO₂máx ≥ 32,9 mL/kg/min para caminata espacial en microgravedad (≥ 36,5 en superficie); fuerza y capacidad aeróbica ≥ 80 % de la basal |
| Nutrición | 3035 kcal/día de promedio, +200 kcal por hora de caminata espacial |
| Hueso | ≥ 95 % de la basal en cadera y columna (solo medible en tierra) |

### 5.4 Cuándo contactar a Tierra: criterios públicos

El checklist médico del transbordador (JSC-48031 Rev K, 2006) tiene **110 instrucciones
"Contact Surgeon"** ✅. Ejemplos que EVA usa tal cual:

- Diarrea **con fiebre**.
- **Sin mejoría en 24 h.**
- Ojo rojo con visión borrosa, dolor, fotofobia o pus; cuerpo extraño que no sale.
- Tímpano rojo y abombado o perforado.
- Exposición química con sibilancias o falta de aire.
- Síntomas de descompresión que no ceden con oxígeno e hidratación.

Los hallazgos no urgentes van a "informar en la próxima conferencia médica".
⚠️ Es un documento del transbordador, de 2006: se cita como **referencia pública**, no
como procedimiento vigente de la ISS.

### 5.5 Lo que se enseña en pantalla

Cada valor muestra su procedencia en una etiqueta pequeña: **[A] NASA**, **[T] clínico**
o **"tu normal"** (línea base). Tocarla abre la fuente. Así el jurado ve en un toque que
ningún número es inventado.

---

## 6. Roles

| Rol | Quién es |
|---|---|
| **Astronauta** | La persona monitoreada. Dueña de sus datos. |
| **Compañero (buddy)** 🔶 | Otro tripulante asignado, en parejas que rotan. Se entera de que su pareja **necesita ayuda**, no de sus datos. |
| **CMO** | Crew Medical Officer: tripulante con entrenamiento médico, no necesariamente médico ✅ |
| **Comandante** | Responsable de la misión. Necesita saber quién está **apto**, no por qué. |
| **Cirujano de vuelo** | Médico en Tierra. Recibe datos con retraso. |
| **Investigación (NASA/HRP)** | Archivo longitudinal, con consentimiento y bajo las reglas de acceso de NASA. |

---

## 7. 🔶 Quién ve qué

### Principios

1. **El astronauta siempre ve todo lo suyo**, completo.
2. **El compañero recibe alertas, no datos.** Solo durante una emergencia activa ve los
   signos vitales en vivo que necesita para ayudar.
3. **El CMO ve lo clínico** de toda la tripulación, porque es quien atiende a bordo.
4. **Lo más sensible es privado por defecto:** salud menstrual y el detalle del diario
   emocional.
5. **El comandante ve aptitud, no diagnóstico:** "apto / no apto para caminata espacial".
6. **La emergencia desbloquea solo lo necesario, y por tiempo limitado.**
7. **Cada acceso queda registrado** y el astronauta puede ver "quién vio mis datos y
   cuándo".

### Matriz

Leyenda: ✔ ve el dato · ◐ ve solo un resumen o el estado · 🚨 solo durante una emergencia activa · ✋ solo con consentimiento · — no lo ve

| Dato | Astronauta | Compañero | CMO | Comandante | Cirujano de vuelo | Investigación |
|---|---|---|---|---|---|---|
| Estado general (● ■ ▲) | ✔ | ◐ solo si es ▲ o no responde | ✔ | ◐ apto / no apto | ✔ | — |
| Signos vitales (FC, PA, SpO₂, temperatura) | ✔ | 🚨 en vivo | ✔ | — | ✔ resúmenes | ✋ reglas NASA |
| Sueño y prueba de reflejos (PVT-B) | ✔ | — | ✔ | ◐ apto / no apto | ✔ | ✋ reglas NASA |
| Ánimo: puntuación del check-in | ✔ | — | ◐ tendencia semanal (✔ diaria si la persona lo permite) | — | ✔ | ✋ reglas NASA |
| Ánimo: diario y texto libre | ✔ | — | ✋ | — | ✋ | — |
| Salud menstrual y anticonceptivos | ✔ | — | ✋ o 🚨 si es factor de riesgo | — | ✋ o 🚨 | ✋ reglas NASA |
| Dosis de radiación personal | ✔ | — | ✔ | ◐ margen hasta el límite | ✔ | ✋ reglas NASA |
| **Alerta de evento solar o del ambiente** | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| Ubicación en la nave | ✔ | 🚨 | 🚨 | 🚨 | — | — |
| Registro de una emergencia | ✔ | ◐ lo que hizo | ✔ | ✔ | ✔ completo, sellado con SCET | ✋ reglas NASA |
| Juego cooperativo | ✔ | ◐ meta lograda / no lograda | ◐ meta lograda / no lograda | ◐ meta lograda / no lograda | — | — |

**Por qué "reglas NASA" y no "anónimo":** con 4 a 6 personas, quitar el nombre no basta
para que nadie sea reconocible. Por eso NASA entrega los datos fisiológicos humanos solo
con una solicitud de acceso aprobada (DAR) ✅
([roadmap de Julio](../Julio/roadmap.md#2-inventario-de-datos--qué-tenemos-y-qué-no)).

**Por qué el CMO ve la tendencia del ánimo y no el día a día:** si alguien sabe que un
compañero lee su check-in diario, puede responder "bien" aunque no lo esté.

### Casos borde

| Caso | Qué hace EVA |
|---|---|
| **El CMO es el paciente** | Salta el nivel 1, escala al cirujano de vuelo y avisa al comandante. Su compañero hace de rescatista. |
| **El compañero también está afectado** | La alerta pasa a toda la tripulación. |
| **Varias personas con síntomas a la vez** | Lo trata como un problema del ambiente y alerta a todos. Ejemplo real: con CO₂ alto, cada +1 mmHg duplica la probabilidad de cefalea (n = 49) [A]. |
| **Riesgo de hacerse daño** | Nivel rojo: CMO y cirujano de vuelo, aunque el diario sea privado. Única excepción al ✋ del diario. |
| **El astronauta revoca un consentimiento** | Deja de compartirse desde ese momento; lo ya enviado queda registrado. |
| **El reloj se apaga o pierde señal** | Se dice **"sin señal del reloj de Mei"** con la hora de la última lectura, nunca "no responde". |

### Privacidad en un espacio compartido

1. **El panel de pared es público:** en reposo solo muestra el estado ●■▲ de cada
   persona y las alertas del ambiente.
2. **El detalle se abre identificándose** (reloj o tablet personal) y **se bloquea solo a
   los 30 s**.
3. **Notificaciones discretas:** sin texto médico en la pantalla bloqueada del reloj.

### Transparencia y consentimiento

- **"Lo que ven de mí":** cada astronauta ve exactamente lo que ve cada rol de él o ella.
- **Consentimiento antes del vuelo:** los permisos ✋ se fijan en Tierra con el cirujano de
  vuelo. Lo único que no se puede desactivar es el riesgo de hacerse daño y una
  emergencia roja. Se pueden cambiar en vuelo; cada cambio queda registrado.

---

## 8. 🚨 Emergencia de la demo: evento de partículas solares

Base: [escenario del día 115 de Julio](../Julio/comportamiento-del-software.md#7-segundo-escenario-corto--día-115-evento-de-partículas-solares).
Se agregan el buddy system, la privacidad y los umbrales oficiales de Iker.

**Por qué esta emergencia:**
- Su protocolo es **logístico** ("ve al refugio"), no clínico. **No inventamos medicina.**
- Usa **datos reales**: 51 eventos SEP de DONKI en `Planeacion/Julio/datos/` ✅.
- Tiene **umbrales oficiales** ✅: < 250 mSv por evento; NASA pide poder montar el refugio
  en **≤ 1 h**, permanecer **hasta 24 h** y terminar una caminata espacial en **≤ 2 h**.
- Conecta con el material de radiación de la CSA de *Resources*.
- Dato que da contexto: **~95 % de los eventos solares no se acercan a los límites**. EVA
  no asusta: avisa cuando hace falta.

### Línea de tiempo

Fecha, instrumento y latencia salen de un evento real de DONKI. Las dosis en mSv son
**simuladas** ⚠️: DONKI no entrega dosis y el umbral de la alarma de tasa de dosis de
Orion o la ISS **no es público**.

| Hora | Qué pasa | Quién lo ve |
|---|---|---|
| 11:04 | La tasa de dosis sube muy por encima de lo normal ⚠️ | — |
| 11:04 | **▲ ROJO · Evento de partículas solares.** *"Dirígete al refugio blindado. Ahora."* | **Todos** (alerta del ambiente) |
| 11:04 | En pantalla: el evento real de DONKI que sirve de modelo, con su instrumento | Todos |
| 11:05 | Protocolo RAD-01, un paso por pantalla | Cada astronauta |
| 11:06 | **Buddy check:** el reloj de cada uno pregunta *"¿Tu pareja llegó al refugio?"* | Cada compañero |
| 11:07 | Luis confirma a Ana y Ana a Luis. Mei no confirma, pero su reloj sí tiene señal | Tomás (pareja de Mei) |
| 11:07 | Alerta a Tomás: *"Mei no ha confirmado. Su reloj tiene señal. Última ubicación: Módulo C."* Como Mei es la **CMO**, EVA avisa que el nivel 1 está sin cubrir | Tomás, que además es comandante (ubicación 🚨) |
| 11:09 | Mei llega: tenía audífonos puestos | Todos ven "4 de 4 en el refugio" |
| 11:31 | La tasa se normaliza. Evento cerrado. Dosis personal actualizada contra 250 mSv por evento y 600 mSv de carrera [A] | Cada uno ve la suya; la CMO todas; el comandante el margen |
| 11:32 | La caminata espacial de Ana sigue en pie: su fatiga cerró el día 114 y la dosis queda dentro del margen | Ana ve el detalle; Tomás ve "apta" |
| Primera ventana | Paquete prioritario a Tierra con la cronología sellada con SCET | Cirujano de vuelo |

### Fuera de la demo

- El **desmayo** y la **crisis de pánico** de la [propuesta LAZO](Propuesta-LAZO-NASA-SpaceApps-2026.md)
  quedan como escenarios secundarios, **marcados como ilustrativos**.
- El **motor diagnóstico probabilístico** ([Julio](../Julio/motor-diagnostico.md)) va
  después, si queda tiempo.

---

## 9. Módulos de EVA

**Los 22 módulos son parte de EVA. Ninguno se quita.** La prioridad solo decide el
**orden de construcción**: se termina un nivel antes de empezar el siguiente.

| Prioridad | Qué significa | Si no da el tiempo |
|---|---|---|
| 🔴 **Núcleo** | Se construye primero y tiene que funcionar de punta a punta | No hay plan B: es lo mínimo para la demo |
| 🟡 **Diferenciador** | Se construye en cuanto el núcleo funciona | Se presenta como pantalla de diseño |
| 🔵 **Visión** | Se construye al final | Se presenta como pantalla de diseño o en la diapositiva de visión |

### 🔴 Núcleo

| # | Módulo | Qué incluye | De quién |
|---|---|---|---|
| 1 | **Panel de salud + Cuerpo EVA** | Figura humana clicable, semáforo ●■▲, los indicadores de §5.2 con etiqueta [A]/[T]/"tu normal", gráficas contra la línea base | Katy · Fani · Diana · Iker |
| 2 | **Motor de prevención** | Línea base de 14 días, z robusto, reglas YAML, cruce de 3 señales, protocolo con seguimiento y cierre (fatiga 112 → 114) | Julio |
| 3 | **Emergencias + buddy system** | Activación manual, automática o por un tercero; un paso por pantalla; registro sellado con SCET; buddy check | Julio · Katy · Diana |
| 4 | **Radiación** | Eventos reales de DONKI; dosis personal (simulada ⚠️) contra los límites oficiales de §5.3 | Julio · Iker · Leo |
| 5 | **Reloj + recordatorios** | Estado de un vistazo, "¿Estás bien?", alerta del compañero, recordatorios de medición | Katy · Fani |
| 6 | **Privacidad: quién ve qué** | Matriz por rol, panel público, candados, "lo que ven de mí" | Katy |
| 7 | **Comunicación con Tierra** | Cola priorizada, nota que llega tarde con su antigüedad, criterios "Contact Surgeon" de §5.4 | Julio · Fani · Iker |

### 🟡 Diferenciadores

| # | Módulo | Qué incluye | De quién |
|---|---|---|---|
| 8 | **Salud mental y del equipo** | Check-in de 20 s, HRV, PVT-B, PHQ-9 y GAD-7 semanales, somnolencia KSS, carga de trabajo (NASA-TLX), horas trabajadas (crítico > 60 h/semana [A]), cohesión del equipo | Julio · Leo · Katy · Fani · Iker |
| 9 | **Crisis de ansiedad o pánico** | Primero descarta lo físico (SpO₂, ECG, CO₂); después respiración guiada con vibración y compañero opcional. **Ilustrativo** | Katy |
| 10 | **Nutrición, hidratación y ejercicio** | Metas oficiales: 3035 kcal, 32 mL/kg de agua, sodio 1500–2300 mg; alerta por masa −3,3 % [A]; ARED, T2, CEVIS; fuerza ≥ 80 % de la basal [A] | Katy · Leo · Iker |
| 11 | **Salud femenina y diferencias por sexo** | Supresión menstrual, inventario de anticonceptivos, riesgo de coágulos (anticonceptivos combinados hasta 3,2× [T]), mareo al volver a la gravedad. **Privado y sin juego** | Katy · Leo · Iker |
| 12 | **Juego cooperativo** | Jardín de la base, metas del equipo; premia **registrar**, no tener "buenos números"; sin rankings | Katy · Leo |
| 13 | **Biblioteca de enfermedades y cuidados** | Fichas sin conexión ordenadas por frecuencia real (modelo IMM de NASA: insomnio 13,85 por misión, abrasión ocular 7,42, diarrea 3,53, barotrauma 3,28, cefalea por CO₂ 2,15), con su criterio "Contact Surgeon" | Katy · Diana · Iker |
| 14 | **Cómo se muestra el riesgo** | Probabilidad con modelo (radiación) · margen contra la norma (hueso, nutrición) · nivel relativo (sueño, SANS) | Leo |

### 🔵 Visión (hoja de ruta)

| # | Módulo | Qué incluye | De quién |
|---|---|---|---|
| 15 | **Botiquín y medicamentos** | Inventario, caducidad, y aviso de fármacos a bordo que alargan el QT (ciprofloxacino, haloperidol, azitromicina, etc.) | Katy · Iker |
| 16 | **Ambiente de la nave** | CO₂, O₂, ruido, temperatura y humedad contra los límites oficiales de §5.3; síntomas de varias personas → problema del ambiente | Katy · Fani · Iker |
| 17 | **Perfiles de entorno** | Nave, ISS, rover, base lunar, Marte (polvo: lunar < 0,3 mg/m³, marciano < 0,1 [A]) | Fani · Katy · Iker |
| 18 | **Motor diagnóstico probabilístico** | Diferencial con priors de Crucian 2016, "¿de dónde sale este %?" | Julio |
| 19 | **Asistente de voz conversacional** | Local, solo con contenido aprobado | Fani |
| 20 | **Red tolerante a interrupciones (DTN)** | Bundle Protocol | Fani |
| 21 | **Pruebas cognitivas largas y de transición** | DSST, Fractal 2-Back (alerta con z ≤ −1,5 [A]); prueba en cada cambio de gravedad | Leo · Iker |
| 22 | **Conexión con hardware real** | Adaptadores para Bio-Monitor/Astroskin, relojes Bluetooth, ultrasonido (yugular grado 3 = pretrombótico [A]; OCT > 19,4 µm = primer signo de SANS [A]) | Katy · Leo · Iker |

### Reglas que aplican a todos los módulos

- **~8 minutos activos al día como máximo** (Leo). Lo demás se mide solo.
- **En el pitch se presentan los 22 módulos**, cada uno en el estado en que llegue: los
  que funcionen, en vivo; los demás, como pantalla de diseño o en la diapositiva de
  visión. El tiempo de la demo en vivo se dedica al núcleo.

### Quién programa qué

| Rol | Núcleo | Si sobra tiempo (🟡) |
|---|---|---|
| **Datos y sintéticos** | 4 Radiación (DONKI) · generador de datos de la tripulación de §0.1 | 10 Nutrición y ejercicio (datos) |
| **Motor** | 2 Motor de prevención · reglas YAML con los umbrales de §5 | 14 Cómo se muestra el riesgo |
| **UI** | 1 Panel + Cuerpo EVA · 5 Reloj | 12 Juego cooperativo |
| **Emergencia y privacidad** | 3 Emergencias + buddy check · 6 Privacidad | 9 Pánico (ilustrativo) |
| **Ciencia y contenido** | Umbrales [A]/[T] en el YAML · criterios "Contact Surgeon" · protocolo RAD-01 | 11 Salud femenina · 13 Biblioteca |
| **Demo y pitch** | 7 Comunicación con Tierra · guion · video · diapositivas | 8 Salud mental (pantallas) |

🔶 Propuesta de asignación por lo que cada quien ya investigó: **Iker → Ciencia y
contenido**, **Julio → Motor**, **Leo → Datos**, **Katy → UI o Emergencia y privacidad**.
Diana y Fani: por definir. ⚠️ Confirmar con el equipo.

**Puntos de corte (de Julio):**
- **Gate T−9:** el arco de prevención (día 112 → 114) funciona de punta a punta. Si no,
  se **pausa** todo lo 🟡 y 🔵 y el equipo completo termina el núcleo. Lo pausado no se
  quita: pasa a pantalla de diseño.
- **Freeze T−4:** no entra nada nuevo. **Se entrega a T−4, no a T−0.**

---

## 10. Guion de demo (~110 s)

1. **0:00–0:15** · "Un astronauta no puede preguntarle a Houston. La respuesta tarda
   hasta 48 minutos ida y vuelta."
2. **0:15–0:35** · Check-in del día 112 + PVT-B en vivo. La figura de Ana marca el sueño
   en ■ ámbar, con la etiqueta "tu normal".
3. **0:35–0:55** · Ámbar: *"Ninguna señal sola dispararía; las tres juntas, sí."*
4. **0:55–1:05** · Abrir el YAML y tocar una etiqueta [A]: "Esto es auditable, y este
   número es de NASA."
5. **1:05–1:15** · Día 114: cierra en verde. Llega la nota de Tierra con 41 min de
   antigüedad.
6. **1:15–1:40** · **Evento solar real:** ▲ rojo para todos → refugio → buddy check → "Mei
   no ha confirmado" → 4 de 4 a salvo. Mostrar el candado: la ubicación de Mei solo se
   compartió durante la emergencia.
7. **1:40–1:50** · Modo avión encendido toda la demo. Decirlo al final.

---

## 11. Limitaciones (diapositiva obligatoria)

| Limitación | Qué hacemos al respecto |
|---|---|
| **Los signos vitales son simulados.** Lo real son los eventos solares y los umbrales oficiales | El generador sigue los cambios en vuelo publicados (catálogo de Iker) y la incidencia de Crucian 2016 |
| **No hay umbrales públicos de NASA para signos vitales** | Usamos [T] rotulados + línea base personal |
| **Casi no hay laboratorio en tiempo real a bordo** | EVA no depende de sangre ni orina; usa lo que sí se mide en vuelo |
| **DONKI no da dosis** y el umbral de alarma de dosis no es público | Dosis simuladas; lo real es el evento, su instrumento y la latencia |
| **Los protocolos clínicos no están validados** | La demo usa un protocolo logístico; los clínicos van marcados como ilustrativos |
| **Estudios de 3 a 14 personas; pocos datos de mujeres** | Las diferencias por sexo son avisos, no diagnósticos |
| **La línea base nunca se probó contra datos reales** | Umbrales 🔶 en un YAML que el cirujano de vuelo puede ajustar |
| **La privacidad en tripulaciones de 4 es frágil** | No prometemos anonimato; consentimiento + reglas de NASA |
| **Sin hardware real** | Capa de adaptadores lista (módulo 22) |

---

## 12. Beneficio en la Tierra

La CSA explica que los efectos del espacio se parecen al envejecimiento acelerado y al
sedentarismo, y que esos hallazgos ayudan con osteoporosis, equilibrio, problemas
cardiovasculares y diabetes tipo 2 ✅ (recurso oficial del reto).

- **Comunidades rurales o remotas sin médico:** el mismo motor que decide sin conexión.
- **Bases antárticas, plataformas petroleras, submarinos, rescate:** tripulaciones
  pequeñas y con comunicación intermitente.
- **Salud de la mujer** con poco acceso a atención.
- **Adultos mayores que viven solos:** el buddy system aplicado a familia o vecinos, con la
  misma regla de "alertas sí, datos no".

---

## 13. Preguntas probables del jurado

Las cinco de [Julio](../Julio/roadmap.md#6-qa--las-cinco-preguntas-que-les-van-a-hacer),
más estas:

| Pregunta | Respuesta corta |
|---|---|
| **"¿De dónde salen sus umbrales?"** | "Cada uno dice si es oficial de NASA [A] o clínico terrestre [T]. Para signos vitales NASA no publica umbrales, por eso comparamos contra la normalidad de cada persona." |
| **"¿Por qué se llama como la caminata espacial?"** | "EVA es Evaluación Vital Autónoma. Antes de cada EVA, EVA te dice si estás listo." |
| **"En una tripulación de 4, ¿qué privacidad puede haber?"** | "No prometemos anonimato. Cada rol ve solo lo que necesita, el panel de pared solo muestra el estado y cada persona ve qué ven los demás de ella." |
| **"¿Y si el reloj se apaga en el buddy check?"** | "EVA distingue 'sin señal del reloj' de 'no responde'." |
| **"¿Qué pasa si la persona miente en el check-in?"** | "El CMO ve tendencias, no el día a día, y el resto del monitoreo es pasivo." |
| **"¿Qué es real y qué es simulado?"** | "Reales: 51 eventos solares de NASA, su latencia, los umbrales de NASA-STD-3001 y la incidencia de Crucian 2016. Simulados: los signos vitales, y lo decimos en pantalla." |
| **"¿Por qué no usan análisis de sangre?"** | "Porque a bordo casi no hay laboratorio en tiempo real: las muestras se congelan y se analizan en Tierra." |
| **"¿Por qué 22 módulos?"** | "Porque eso es EVA completo. Los construimos por prioridad: primero los 7 que hacen funcionar la demo, después el resto." |

---

## 14. Decisiones del equipo (votación)

🗳️ **Formulario en línea con resultados en vivo:**
https://claude.ai/artifact/K5ZmVMpxAsD33TXarVKTY9
(Katy tiene que compartirlo con cada quien por correo, como **Editor**).

📄 **Copia en el repo:** [decisiones-equipo.html](decisiones-equipo.html). Funciona sin
conexión: cada quien vota, presiona **"Copiar mis respuestas"** y lo pega en el chat.

**Regla:** **GO** cuando una opción tiene **más de la mitad de los votos y al menos 3**.
⭐ = opción recomendada. Si no pueden usar el formulario, marquen aquí su opción con su
nombre, por ejemplo `- [x] Opción (Iker)`.

### Producto

**1. Nombre del producto** · En NASA, EVA significa caminata espacial (§0).
- [ ] ⭐ EVA — Evaluación Vital Autónoma
- [ ] EVA, sin significado
- [ ] Otro nombre: ______

**2. Tripulación y contexto de la demo** · Tránsito a Marte, días 112–115 (§0.1).
- [ ] ⭐ Aprobar como está
- [ ] Cambiar nombres o roles
- [ ] Cambiar el contexto de misión

**3. Prioridad de la salud femenina** · Hoy es diferenciador 🟡 (§9).
- [ ] ⭐ Dejarla como diferenciador
- [ ] Subirla al núcleo

### Demo

**4. Emergencia principal** (§8)
- [ ] ⭐ Evento de partículas solares
- [ ] Desmayo
- [ ] Las dos

**5. Evento real de DONKI** · 51 eventos SEP de 2024; mediana de 17 min.
- [ ] ⭐ Uno con latencia cercana a la mediana (17 min)
- [ ] El del 9 de mayo de 2024 (alerta 1 min después)
- [ ] Que lo elija quien lleva datos

**6. Motor diagnóstico con porcentajes**
- [ ] ⭐ Solo si pasamos el gate T−9
- [ ] Sí, en la demo pase lo que pase
- [ ] Fuera; solo diapositiva de visión

**7. Juego cooperativo**
- [ ] ⭐ Pantalla de diseño
- [ ] Programarlo
- [ ] Fuera de la demo

### Privacidad

**8. Qué ve el comandante** (§7)
- [ ] ⭐ Apto / no apto, sin motivo
- [ ] Nada médico
- [ ] Lo mismo que la CMO

**9. Qué ve la CMO del ánimo** (§7)
- [ ] ⭐ Tendencia semanal (diaria con permiso)
- [ ] Check-in diario
- [ ] Nada sin permiso

### Técnico

**10. Plataforma**
- [ ] ⭐ PWA en TypeScript + React
- [ ] Otra: ______

**11. Límite de radiación en la interfaz** · 🔶 **Propongo cerrarla:** Iker encontró que
600 mSv para todos está en NASA-STD-3001 Vol. 1 Rev C (§5.3).
- [ ] ⭐ 600 mSv como límite oficial [A], con su fuente
- [ ] Mostrar 600 mSv y el 3 % REID
- [ ] No mostrar el límite

### Entrega

**12. Idioma de la interfaz y del video** · ⚠️ Verificar las reglas del evento local.
- [ ] ⭐ Inglés
- [ ] Español
- [ ] Interfaz en inglés, pitch local en español

**13. ¿Quién presenta el pitch?**
- [ ] Diana
- [ ] Fani
- [ ] Iker
- [ ] Julio
- [ ] Katy
- [ ] Leo

**14. Hora de entrega interna**
- [ ] ⭐ Entregar a T−4
- [ ] Entregar a T−2
- [ ] Otra hora: ______

### Resultado

| # | Decisión | Resultado | Votos |
|---|---|---|---|
| 1 | Nombre | | |
| 2 | Tripulación y contexto | | |
| 3 | Salud femenina | | |
| 4 | Emergencia principal | | |
| 5 | Evento de DONKI | | |
| 6 | Motor diagnóstico | | |
| 7 | Juego cooperativo | | |
| 8 | Qué ve el comandante | | |
| 9 | Ánimo para la CMO | | |
| 10 | Plataforma | | |
| 11 | Límite de radiación | | |
| 12 | Idioma | | |
| 13 | Quién presenta | | |
| 14 | Entrega interna | | |

---

## 15. Dudas abiertas

Cosas que no pude resolver con lo que hay en el repo. Cada una necesita a alguien del
equipo.

| # | Duda | Por qué importa | A quién |
|---|---|---|---|
| 1 | ~~¿"Monarcas" es el nombre del equipo?~~ | ✅ **Sí.** Equipo Monarcas, producto EVA | Resuelta |
| 2 | ~~¿Dónde está `RESUMEN-MAESTRO.md`?~~ | ✅ No está en el repo; seguimos sin él. La regla "la SpO₂ de reloj nunca es la única alerta" se mantiene por prudencia, sin cifra | Resuelta |
| 3 | ~~¿Cuántas horas quedan?~~ | ✅ No cambia el alcance: entran los 22 módulos y se construyen por prioridad (§9) | Resuelta |
| 4 | **¿Qué glucómetro hay a bordo?** Iker no lo encontró | La glucosa es indicador del reto; hoy entra a mano | Iker |
| 5 | **¿Qué umbral de tasa de dosis dispara la alarma?** No es público | Los números de la demo del evento solar son simulados | Datos |
| 6 | **¿Usamos PHQ-9 y GAD-7 en la app?** Son de uso libre, pero sus cortes son terrestres | Más validez vs. más tiempo del astronauta | Ciencia |
| 7 | **¿Citamos el checklist del transbordador (2006)?** Es público pero viejo | Es la mejor fuente pública de "Contact Surgeon" | Ciencia |
| 8 | **Umbrales de SpO₂ y fiebre:** Iker propone ≤ 92 / ≤ 88 % y ≥ 39,4 °C, no oficiales | Hay que aprobarlos antes de ponerlos en el YAML | Ciencia + Motor |
| 9 | **Reglas del evento local:** idioma, formato de entrega, categorías de premio de 2026 | Afecta el video y el pitch | Demo y pitch |
| 10 | **Qué rol toma cada persona** (§9) | Sin roles claros, el núcleo no se construye | Todos |
| 11 | **Fani:** su propuesta menciona "patrones hormonales (bef/iac)" | No queda claro qué significa | Fani |

---

## 16. Pendientes antes de presentar

- [ ] ⚠️ Elegir **qué evento real de DONKI** usar (decisión 5).
- [ ] ⚠️ Pasos del protocolo RAD-01: verificar o marcarlos como ilustrativos.
- [ ] 🔶 Votar las 14 decisiones de §14.
- [ ] 🔶 Pasar todo al contexto de §0.1: las maquetas de LAZO dicen "Marte · Sol 2" y los
      escenarios de Julio dicen "MS-2".
- [ ] 🔶 Llevar los umbrales [A]/[T] de §5 al YAML del motor.
- [ ] ⚠️ Resolver las dudas de §15.
- [x] ~~Resolver el límite de 600 mSv~~: está en NASA-STD-3001 Vol. 1 Rev C ✅ (Iker).

---

## Documentos de origen

- Diana: [Propuesta.md](../Diana/Propuesta.md)
- Fani: [Propuesta.docx](../Fani/Propuesta.docx)
- Iker: [índice priorizado](../variables-diagnostico/00-indice-priorizado.md) ·
  [cardiovascular, SANS y radiación](../variables-diagnostico/01-cardiovascular-sans-radiacion.md) ·
  [hueso, músculo, riñón y nutrición](../variables-diagnostico/02-hueso-musculo-rinon-nutricion.md) ·
  [conducta, sueño y cognición](../variables-diagnostico/03-conducta-sueno-cognicion.md) ·
  [inmune, ambiente, equipo y umbrales](../variables-diagnostico/04-inmune-ambiente-equipo-umbrales.md)
- Julio: [comportamiento](../Julio/comportamiento-del-software.md) ·
  [motor diagnóstico](../Julio/motor-diagnostico.md) ·
  [diccionario](../Julio/diccionario-de-datos.md) ·
  [roadmap](../Julio/roadmap.md) ·
  [stack y DONKI](../Julio/stack-y-dependencias.md)
- Leo: [resumen.md](../Leo/resumen.md) · [síntesis (PDF)](../Leo/sintesis-investigacion.pdf)
- Katy: [Propuesta LAZO](Propuesta-LAZO-NASA-SpaceApps-2026.md) (53 referencias) ·
  [formulario de decisiones](decisiones-equipo.html)
