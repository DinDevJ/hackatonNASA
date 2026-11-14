# LAZO

**Sistema visual de monitoreo de salud y cuidado mutuo para tripulaciones en misiones de larga duración: nutrición, salud mental, salud femenina y emergencias, aun sin contacto con la Tierra.**

> **NASA Space Apps Challenge 2026 · Propuesta de equipo**
> Reto: **Create Health Monitoring Software for Astronauts on Space Missions** (dificultad intermedia · Human Exploration, Software, Space Exploration)
> Basado en los recursos oficiales del reto (NASA Human Research Program y Agencia Espacial Canadiense) y en literatura científica revisada por pares.
> Documento de lluvia de ideas fundamentada · Noviembre 2026

Prioridades usadas en todo el documento:
🔴 **P0** = núcleo indispensable para la demo · 🟡 **P1** = diferenciadores fuertes · 🔵 **P2** = visión y extras si sobra tiempo

---

## Índice

1. [Resumen ejecutivo](#1-resumen-ejecutivo)
2. [Cómo respondemos a lo que pide el reto](#2-cómo-respondemos-a-lo-que-pide-el-reto)
3. [Fundamento: por qué hace falta](#3-fundamento-por-qué-hace-falta)
4. [Ecosistema de hardware supuesto](#4-ecosistema-de-hardware-supuesto)
5. [Módulos por prioridad](#5-módulos-por-prioridad)
6. [Diseño UX/UI: cómo se ve y cómo se usa](#6-diseño-uxui-cómo-se-ve-y-cómo-se-usa)
7. [Indicadores y código de colores](#7-indicadores-y-código-de-colores-ejemplo-inicial)
8. [Puntos fuertes](#8-puntos-fuertes)
9. [Puntos débiles y cómo los resolvemos](#9-puntos-débiles-y-cómo-los-resolvemos)
10. [Beneficio en la Tierra](#10-beneficio-en-la-tierra)
11. [Arquitectura técnica](#11-arquitectura-técnica-propuesta)
12. [Plan para un equipo de 6](#12-plan-para-un-equipo-de-6)
13. [Guion de la demo](#13-guion-de-la-demo-escenario)
14. [Métricas de éxito](#14-métricas-de-éxito)
15. [Hoja de ruta después del hackathon](#15-hoja-de-ruta-después-del-hackathon)
16. [Cómo responde a los criterios de evaluación](#16-cómo-responde-a-los-criterios-de-evaluación)
17. [Referencias](#referencias)

---

## 1. Resumen ejecutivo

**LAZO** es un software visual (reloj + panel de pared) que reúne los indicadores de salud de cada astronauta, los muestra con un código de colores y una figura humana interactiva, y le dice **qué hacer** de forma sencilla, sin asumir conocimientos médicos. Su diferenciador son tres ideas:

- **Autoevaluación guiada + cuidado mutuo ("buddy system"):** cada astronauta evalúa su propia salud, como pide el reto, y además tiene un compañero asignado que recibe sus alertas.
- **Salud diferenciada por sexo:** módulos específicos para la mujer (supresión menstrual, riesgo de coágulos, intolerancia ortostática) y vigilancia visual (SANS, reportado con más frecuencia en hombres aunque sin diferencia estadística confirmada), porque los datos sobre mujeres en el espacio son escasos.
- **Autonomía de la Tierra:** funciona sin conexión, pensado para retrasos de comunicación de hasta ~22 minutos por trayecto hacia Marte.

El juego con metas **cooperativas** (no competitivas) mantiene la adherencia a comida, agua, sueño y ejercicio, que son los hábitos que más fallan aunque existan las herramientas.

---

## 2. Cómo respondemos a lo que pide el reto

*Fuente: página oficial del reto, pestañas Details y Resources [1].*

| Lo que pide o sugiere NASA | Cómo lo cubre LAZO |
|---|---|
| Herramienta **visual** para que el astronauta **evalúe su propia salud** y reciba guía de tratamiento y mejora | Panel principal con el estado de cada indicador + recomendaciones accionables + protocolos paso a paso |
| Indicadores sugeridos: presión arterial, frecuencia cardiaca, glucosa, temperatura, horas de sueño, estado de ánimo | Los seis están en el núcleo (P0) junto con SpO₂ e hidratación. Después se agregan nutrición y ciclo/supresión menstrual (P1) y dosis de radiación y ambiente de la nave (P2) |
| Entrada por teclado, clics o cámara; cualquier dato que represente un indicador (p. ej. mg/dL, imágenes de ultrasonido) | Captura automática desde wearables + captura manual rápida + cámara (código de barras de comida, foto de lesión o piel, ultrasonido guiado) |
| ¿Cuándo un resultado requiere atención de la tripulación o de los cirujanos de vuelo? | Semáforo de 3 niveles, con color **y** forma: verde ● = todo en orden; amarillo ■ = autocuidado guiado (el compañero se entera solo si persiste más de 48 h o si el astronauta lo comparte); rojo ▲ = compañero + tripulación + cirujano de vuelo (se envía cuando haya comunicación) |
| Figura humana clicable con función y estado de cada parte del cuerpo | "Cuerpo LAZO": silueta interactiva (corazón, huesos, ojos, cerebro, riñones, músculos, sistema inmune, aparato reproductor) con su estado, sus riesgos en el espacio y qué hacer |
| Gamificación, gráficas dinámicas, código de colores | Metas cooperativas de la tripulación, tendencias en el tiempo contra la línea base personal, semáforo en todo el sistema |
| Recordatorios de mediciones y acciones dentro de la rutina | Agenda de mediciones integrada al horario de misión, con avisos en el reloj |
| Diferentes entornos: nave, estación, rover, base en la Luna o Marte | Perfiles de entorno: cambian la gravedad, el retraso de comunicación y las metas (p. ej. más calorías tras una caminata espacial) |
| No suponer que el astronauta sabe todo: instrucciones y explicaciones simples | Biblioteca médica visual sin conexión + explicación de "por qué se mide esto" en cada indicador |

---

## 3. Fundamento: por qué hace falta

### 3.1 Los 5 peligros de NASA

El Human Research Program (HRP) de NASA agrupa los retos en cinco peligros: **radiación espacial, aislamiento y confinamiento, distancia de la Tierra, campos de gravedad y ambientes cerrados u hostiles**. NASA aclara que no actúan solos: *se alimentan entre sí* y agravan sus efectos en el cuerpo [2]. De ellos se derivan riesgos específicos que LAZO atiende directamente [3]:

| Riesgo oficial de NASA | Qué hace LAZO |
|---|---|
| Cambios óseos inducidos por el vuelo [4] | Metas de ejercicio de resistencia, calcio y vitamina D; alerta de riesgo de cálculos renales |
| Adaptaciones cardiovasculares [5] | Frecuencia cardiaca, presión, ECG desde la camiseta biométrica; vigilancia de mareo o desmayo |
| Alimentación y nutrición inadecuadas [6] | Registro por código de barras, metas de calorías, agua y micronutrientes |
| Cambios de conducta y trastornos psiquiátricos [7] | Check-in de ánimo, variabilidad cardiaca (HRV), tendencias, ejercicios de regulación |
| Trabajo en equipo inadecuado [8] | Metas cooperativas y buddy system |
| Sueño inadecuado y horarios irregulares [9] | Seguimiento de sueño, higiene de sueño, alerta antes de tareas críticas |
| Síndrome neuro-ocular (SANS) [10] | Recordatorio de pruebas visuales y registro de síntomas |
| Sistema inmune alterado [11] | Registro de síntomas (erupciones, fiebre) y temperatura |
| Cáncer por radiación [12] | Dosis acumulada personal contra el límite de carrera |
| Hipoxia [13] | SpO₂ continua, alerta temprana |
| Ambiente cerrado u hostil: CO₂, temperatura, ruido, microbios [2][42] | Cruza síntomas (dolor de cabeza, congestión) con el CO₂ de la cabina |

Así LAZO toca **los cinco peligros**: radiación, aislamiento, distancia, gravedad y ambiente cerrado.

### 3.2 La distancia cambia la medicina

Un viaje a Marte duraría unos tres años; NASA señala que la planeación y la **autosuficiencia** serán clave [2]. Un análisis de NASA estima retrasos de comunicación de **0 a 22 minutos por trayecto**, además de apagones por interferencia solar de días a meses [14]. NASA llama a esto **Operaciones Médicas Independientes de la Tierra** (EIMO) [15]. La Agencia Espacial Canadiense (CSA) tiene la iniciativa **Health Beyond**: su objetivo de largo plazo es que los astronautas manejen su propia salud con mínima dependencia de la Tierra [16].

> La CSA también enumera los retos de las misiones a la Luna y Marte: más tiempo en ingravidez, más radiación, aislamiento lejos de casa, mayores retrasos de comunicación y menos posibilidad de depender de la Tierra para comida, materiales y **asistencia médica de emergencia** [17]. Ese es exactamente el espacio que ocupa LAZO.

### 3.3 Tener herramientas no garantiza usarlas

- **Sueño:** en el estudio más grande sobre sueño en vuelo, los astronautas durmieron en promedio **~6 h**, aunque tenían 8.5 h programadas. Alrededor del **75 %** de la tripulación de la ISS usó medicamentos para dormir en algún momento [18].
- **Hueso:** los huesos que cargan peso pierden en promedio **1–1.5 % de densidad mineral por mes** en el espacio, aun con ejercicio [4].
- **Nutrición:** NASA la considera un riesgo propio y estudia cómo cambia el apetito y el gusto por la comida en vuelos largos [6][19].

---

## 4. Ecosistema de hardware supuesto

El reto es de software; suponemos hardware que ya existe o tiene precedente en vuelo:

| Dispositivo | Indicadores | Precedente real |
|---|---|---|
| **Camiseta biométrica** | ECG, frecuencia cardiaca, presión arterial, respiración, temperatura de piel, SpO₂, actividad | **Bio-Monitor / Astroskin de la CSA**, usado en la ISS desde 2018 [20] |
| **Reloj / pulsera** | Frecuencia cardiaca, HRV, sueño, movimiento, detección de inmovilidad, vibración para alertas | Monitoreo de sueño y actividad en Artemis II (estudio ARCHeR) [21] |
| **Dosímetro personal** | Dosis de radiación acumulada | Detectores canadienses en la ISS (Radi-N, Radi-N2) y el nuevo espectrómetro autónomo CANS [22] |
| **Glucómetro / analizador portátil** | Glucosa (mg/dL) y otros biomarcadores | NASA analiza sangre, saliva y orina de la tripulación (Standard Measures, CIPHER) [23] |
| **Dispositivo de telemedicina** | Integración de signos vitales | Tempus Pro, probado por NASA [24] |
| **Ultrasonido portátil + cámara** | Imágenes guiadas (venas del cuello, vejiga, ojos), fotos de piel o lesiones | Ultrasonido usado en la ISS; con él se detectó una trombosis yugular [25] |
| **Panel / tablet de pared** | Interfaz principal, figura humana, biblioteca, protocolos | Tablets de uso diario en la ISS (la app del Bio-Monitor corre en tablet) [20] |

---

## 5. Módulos por prioridad

Con un equipo de 6 personas apoyado en IA, el alcance puede ser amplio, pero se construye por capas: 🔴 **P0** núcleo indispensable para la demo, 🟡 **P1** diferenciadores fuertes, 🔵 **P2** visión y extras si sobra tiempo.

### 🔴 P0 · Panel de salud con semáforo y "Cuerpo LAZO"

- Los indicadores que sugiere NASA (presión, frecuencia cardiaca, glucosa, temperatura, sueño, ánimo) + SpO₂ e hidratación, cada uno con color verde, amarillo o rojo.
- Figura humana clicable: cada órgano o sistema muestra su función, su estado, cómo lo afecta el espacio y qué hacer.
- Gráficas dinámicas de tendencia contra la **línea base personal** (los primeros días de misión), no solo contra valores de la Tierra.
- Cada indicador tiene un botón de "¿Por qué se mide esto?" con una explicación simple.

*Fundamento: lo piden explícitamente en Details [1]; los líquidos del cuerpo se redistribuyen en ingravidez y alteran la circulación [5], por eso los umbrales deben ser personales.*

### 🔴 P0 · Emergencias: "¿Qué hago?" + buddy system

- **Detección en capas:** 1) el reloj vibra y pregunta "¿Estás bien?" (15 s para responder); 2) si no hay respuesta, alerta al compañero; 3) si persiste, alerta a toda la tripulación. Se combinan señales (inmovilidad + frecuencia cardiaca + SpO₂) para reducir falsas alarmas. **Excepción:** ante señales críticas (pulso ausente, SpO₂ muy baja o arritmia grave en el ECG), se salta la espera y se alerta de inmediato a toda la tripulación, porque cada segundo cuenta.
- **Protocolos visuales, una acción por pantalla**, con voz y pictogramas: desmayo, hipoxia, quemadura, cuerpo extraño en el ojo, sospecha de coágulo, mareo por movimiento, enfermedad por descompresión.
- **RCP en microgravedad:** la guía prioriza fijar al paciente y usar un **compresor mecánico** cuando lo haya. Un estudio de 2025 en vuelos parabólicos encontró que las técnicas manuales (handstand, abrazo inverso, Evetts-Russomano) no lograban la profundidad suficiente y que el dispositivo mecánico sí [26].
- Registro automático del evento, listo para enviarlo al cirujano de vuelo cuando haya comunicación.
- **Plan B del buddy system:** si el compañero también está afectado o no responde, la alerta pasa a toda la tripulación. Si varios relojes detectan síntomas a la vez (p. ej. CO₂ alto o pérdida de presión), LAZO lo trata como un problema del **ambiente**, no de una persona, y activa la alarma del hábitat. Las parejas rotan para que nadie dependa siempre de la misma persona.

*Fundamento: distancia de la Tierra [2][14], EIMO [15], Health Beyond [16]. El reto pide no suponer conocimientos médicos [1].*

### 🔴 P0 · Agenda de mediciones y recordatorios

- Recordatorios en el reloj para mediciones (glucosa, presión, check-in de ánimo) integrados al horario de misión.
- Modo "no molestar" durante caminatas espaciales y tareas críticas.

*Fundamento: sugerencia explícita del reto [1]; riesgo de horarios irregulares [9].*

### 🟡 P1 · Salud femenina y diferenciada por sexo

- **Seguimiento de supresión menstrual:** en misiones largas, las astronautas han tomado tradicionalmente anticonceptivos orales combinados de forma continua. Existen alternativas de larga duración (como el DIU de levonorgestrel) poco usadas aún, y se pide más investigación sobre su efecto en el hueso en microgravedad [27]. La app registra método, sangrado intermitente e inventario de medicamento.
- **Alerta de coágulos:** se documentó una trombosis en la vena yugular de un astronauta en la ISS, detectada con ultrasonido [25]. NASA estudia hoy las diferencias en coagulación entre astronautas [28]. Los anticonceptivos hormonales son un factor de riesgo conocido de coágulos en la Tierra; la app combina factores y recuerda el ultrasonido guiado.
- **Intolerancia ortostática** (mareo o desmayo al ponerse de pie al volver a la gravedad): más frecuente en mujeres. Un informe de NASA reporta **83 % en mujeres vs. 46 % en hombres** [29]. Plan de rehidratación y aviso de riesgo antes del aterrizaje o la llegada a la Luna o Marte.
- **Vigilancia visual (SANS):** se reporta más en hombres, aunque la diferencia no es estadísticamente significativa por las muestras pequeñas [30].
- **Radiación:** antes, NASA usaba límites por sexo y edad (desde 180 mSv para una mujer de 30 años). Desde 2022 el límite de carrera es **600 mSv para todos** [31]. La app muestra la dosis acumulada de cada persona.

*Fundamento: compendio de NASA sobre sexo y género en el espacio (Journal of Women's Health, 2014) [30][32]. En 2013 habían volado 477 hombres y solo 57 mujeres [32]. Por eso LAZO también **genera datos**, con consentimiento, para cerrar esa brecha.*

#### Necesidades por sexo: lo que sabemos (y lo que no)

| Tema | Mujeres | Hombres | Qué hace LAZO |
|---|---|---|---|
| Mareo o desmayo al volver a la gravedad | Más frecuente [29][52] | Menos frecuente | Plan de agua y sal antes de aterrizar; aviso al ponerse de pie |
| Infecciones urinarias en vuelo | Más frecuentes [52] | Menos frecuentes | Registro de síntomas urinarios y metas de agua |
| Cambios en ojos y cerebro (SANS) | Menos reportado | Más reportado [52] | Recordatorio de pruebas visuales |
| Menstruación y anticonceptivos | Supresión, inventario, efecto en hueso y coagulación [27] | No aplica | Módulo privado de salud femenina |
| Radiación | Ambos: antes había límites por sexo; desde 2022, un solo límite de 600 mSv para todos [31] | | Dosis acumulada personal |
| Glucosa e insulina | Ambos: datos escasos y contradictorios; un estudio reporta mejores valores de resistencia a la insulina en mujeres [53] | | Medición periódica de glucosa con línea base personal |
| Salud mental | Ambos: sin evidencia de diferencias por sexo en las respuestas psicológicas al vuelo [52] | | El mismo módulo de salud mental para todos |
| Hueso, cálculos renales | Ambos: riesgo para todos; la pérdida de hueso sube el calcio en la orina [4][51] | | Ejercicio, agua, menos sodio |

*Todas estas diferencias vienen de muestras pequeñas. LAZO las usa como avisos, no como diagnósticos, y prioriza siempre la línea base de cada persona.*

### 🟡 P1 · Nutrición, hidratación y ejercicio

- **Ejercicio:** la tripulación de la ISS hace en promedio unas 2 horas diarias con la máquina de resistencia (ARED), la caminadora (T2) y la bicicleta (CEVIS) [50]. LAZO registra las sesiones, avisa si faltan días de resistencia (la que más protege el hueso) y conecta el ejercicio con la figura humana: "tus piernas llevan 3 días sin carga".
- Registro por código de barras de cada paquete de comida, con metas de calorías, proteína, calcio, vitamina D y agua.
- Metas dinámicas: suben tras ejercicio intenso o una caminata espacial.
- Registro de "¿Te gustó?" para detectar aburrimiento con la comida, que NASA estudia como factor de baja ingesta [19].

*Fundamento: riesgo de nutrición inadecuada [6] y de cambios óseos [4]; estudio Food Physiology sobre dieta mejorada [33].*

### 🟡 P1 · Salud mental y del equipo

- Check-in de ánimo de 10 segundos (emojis) + HRV del reloj para estimar estrés y tendencias.
- Ejercicios de respiración, contenido de "Tierra" (fotos y audios de la familia), actividades del equipo.
- Vigilancia de baches de ánimo en la segunda mitad de la misión. Nota honesta: el llamado "fenómeno del tercer cuarto" tiene evidencia **mixta** en la Antártida y en Mars-500, así que vigilamos tendencias personales en lugar de suponer una fecha fija [34].
- Jardinería espacial como actividad sugerida: NASA estudió si cultivar vegetales alivia el aislamiento [35].

*Fundamento: riesgos de conducta [7], trabajo en equipo [8] y aislamiento y confinamiento [2].*

### 🟡 P1 · Crisis de ansiedad o ataque de pánico

**Lo difícil:** un ataque de pánico produce corazón acelerado, falta de aire, dolor de pecho y mareo, igual que un problema del corazón [46]. En una nave, esos síntomas también pueden venir de **falta de oxígeno, CO₂ alto o descompresión** [13][42]. Por eso LAZO **nunca asume pánico primero**.

- **Cómo se activa:** 1) la persona toca "Me siento mal / tengo miedo" en el reloj; o 2) el reloj nota un patrón de estrés (frecuencia cardiaca alta sin ejercicio + cambios en la HRV) y pregunta con calma "¿Cómo te sientes?". La detección automática se plantea como **sospecha, no diagnóstico**: el mejor estudio reciente con ECG portátil logró ~71 % de exactitud [45].
- **Paso 1, descartar lo físico (10 segundos):** LAZO revisa SpO₂, ECG y CO₂ de la cabina. Si algo está fuera de rango, pasa directo al protocolo de emergencia médica o del ambiente.
- **Paso 2, si lo físico está bien:**
  - Respiración guiada lenta, marcada con **vibraciones del reloj** (no hay que leer nada). Las revisiones de ensayos clínicos encuentran un efecto pequeño a moderado de los ejercicios de respiración sobre la ansiedad [47].
  - Ejercicio de anclaje en el presente (5 cosas que ves, 4 que tocas…), con voz.
  - Mensajes cortos y tranquilizadores: "Tus signos vitales están estables. Esto va a pasar."
  - Opción de avisar al compañero para que acompañe, solo si la persona quiere.
- **Después:** registro privado del episodio, seguimiento al día siguiente y, si se repite, sugerencia de hablar con el equipo de salud conductual en la Tierra.
- **Línea roja:** si alguien expresa ideas de hacerse daño, LAZO no lo maneja solo: activa nivel rojo con la tripulación y el cirujano de vuelo.

*Fundamento: riesgo de conducta y trastornos psiquiátricos de NASA [7]; síntomas de pánico [46]; evidencia de detección con wearables [45] y de respiración guiada [47].*

### 🟡 P1 · Gamificación cooperativa

- Meta compartida: "la nave sana" (o un jardín de la base) crece si la tripulación cumple sueño, agua, comida y ejercicio.
- Puntos extra por **cuidar al compañero**: hacerle un check-in, recordarle hidratarse.
- Rachas y logros con temática de misión; estética sobria, tipo "estado de misión", no caricatura.
- Nunca exhibe ni castiga a quien no cumple. El juego se puede desactivar sin perder el monitoreo.

*Fundamento: gamificación sugerida por el reto [1]; riesgo de trabajo en equipo inadecuado [8].*

### 🔵 P2 · Biblioteca médica visual sin conexión

- Fichas: qué es, cómo se siente, qué hacer y cuándo es emergencia. Temas: pérdida ósea, SANS, mareo espacial, cálculos renales, radiación, hipoxia, descompresión, infecciones e insomnio.

### 🔵 P2 · Radiación, perfiles de entorno y visión futura

- Tablero de radiación personal y de la nave (inspirado en los detectores canadienses y CANS [22]).
- Perfiles de entorno: ISS, Orion/Artemis, rover, base lunar, Marte (gravedad de 3/8 de la Tierra [2]) con retraso de comunicación simulado.
- Ultrasonido guiado por cámara con superposición de la zona a escanear.
- Asistente de IA **que solo guía con protocolos aprobados** y nunca diagnostica por su cuenta. Debe correr **en el dispositivo**, sin depender de servidores en la Tierra.

### 🔵 P2 · Botiquín y medicamentos

- Inventario de medicamentos con fecha de caducidad, dosis y quién los toma. Un análisis del botiquín de la ISS encontró que 54 de 91 medicamentos duran 36 meses o menos, y estima que cerca del 60 % caducaría antes de terminar una misión al espacio profundo [49].
- Avisos de "caduca antes de que termine la misión" y alternativas sugeridas por el equipo médico.

*Fundamento: distancia de la Tierra [2] y estudio de caducidad del botiquín de la ISS [49].*

### 🔵 P2 · Ambiente de la nave

- Lee los sensores del hábitat (CO₂, temperatura, ruido) y los cruza con síntomas. En la ISS, el CO₂ ha estado típicamente entre 2.3 y 5.3 mmHg, unas diez veces más que en la Tierra. Un informe técnico de NASA relaciona niveles de ~2.8–4.5 mmHg con dolores de cabeza, y alrededor de 39 % de los astronautas estudiados los reportó [42].
- Ejemplo: "3 personas reportaron dolor de cabeza hoy y el CO₂ está alto → revisar el sistema de ventilación", en lugar de dar analgésicos a todos.

*Fundamento: peligro de ambientes cerrados u hostiles [2] y estándar de CO₂ de NASA [42].*

---

## 6. Diseño UX/UI: cómo se ve y cómo se usa

El reto dice que el diseño de la interfaz tiene un papel importante para presentar métricas y diagnósticos con claridad, y sugiere animaciones e interactividad [1]. NASA tiene su propio manual de diseño centrado en humanos (Human Integration Design Handbook), que acompaña al estándar NASA-STD-3001 Vol. 2 [40][41]. Nuestros principios:

### 6.1 Principios de diseño

| Principio | Qué significa en LAZO |
|---|---|
| **Leer de un vistazo (3 segundos)** | La pantalla principal responde una sola pregunta: "¿Estoy bien?". El detalle aparece solo si se toca. |
| **Color + forma + texto** | Nunca solo color: ● verde "Bien", ■ amarillo "Atención", ▲ rojo "Actuar ya". Así lo entiende también una persona con daltonismo. Las tendencias usan flechas ↑↓, como en las pantallas de telemetría de NASA [41]. |
| **Una acción por pantalla en emergencias** | Texto grande, un verbo, un pictograma y un botón enorme de "Hecho". La voz lee cada paso. |
| **Diseño para microgravedad** | Se usa con una mano mientras la otra sujeta algo o a alguien; botones grandes; control por voz cuando las manos están ocupadas; nada depende de "arriba" o "abajo". |
| **Calma, no alarma** | Modo oscuro por defecto (descansa la vista y no rompe el ciclo de sueño). El rojo se reserva para lo urgente. Los mensajes dicen qué hacer, no solo qué está mal. |
| **Lenguaje simple** | "Tu presión está más alta que tu normal", no "hipertensión estadio 1". Cada término médico tiene un "¿Qué es esto?". |
| **Accesible** | Contraste de texto según WCAG 2.2 (mínimo 4.5:1) [44], tipografía de 16 px o más en el panel, soporte de varios idiomas (las tripulaciones son internacionales). |
| **Privacidad visible** | Cada dato muestra un candado con quién lo puede ver (solo yo / mi compañero / médico). |

### 6.2 Mapa de pantallas

| Dispositivo | Pantallas |
|---|---|
| **Reloj** | Estado general · Alerta "¿Estás bien?" · Alerta de compañero · Paso de emergencia · Check-in de ánimo (emojis) · Recordatorio de medición |
| **Panel de pared** | Inicio (Cuerpo LAZO + indicadores) · Detalle de indicador con gráfica · Emergencias · Nutrición · Mente · Salud femenina · Tripulación (juego) · Biblioteca · Radiación y ambiente · Ajustes de privacidad |
| **Vista del cirujano de vuelo** (P2) | Resumen por astronauta y cola de eventos para enviar cuando haya comunicación |

### 6.3 Maquetas de referencia

*Bocetos para guiar al equipo de diseño; no son el diseño final. Las maquetas a color están en la versión PDF.*

**Reloj**

```
   Estado normal            Confirmación antes          Reloj del compañero
                              de alertar
  ╭──────────────╮        ╭──────────────╮           ╭──────────────╮
  │ Ana · 14:32  │        │      ▲       │           │  ▲ Ana       │
  │   ● Bien     │        │ ¿Estás bien? │           │ necesita     │
  │ FC 64 · SpO₂ │        │ Aviso a Luis │           │ ayuda        │
  │    98 %      │        │   en 12 s    │           │ Módulo B·4 m │
  │ Agua 1.4/2.5L│        │ [Estoy bien] │           │   [ Voy ]    │
  ╰──────────────╯        ╰──────────────╯           ╰──────────────╯
```

**Panel: inicio con "Cuerpo LAZO"** (al tocar un órgano se abre su ficha)

```
┌───────────────────────────────────────────────────────────────────────┐
│ LAZO · Ana R.                       Marte · Sol 2 · Retraso Tierra 18 min│
├──────────┬────────────────────────────────────────────────────────────┤
│    ●●    │ ■ Corazón · FC 58, presión 98/62 ↓                          │
│   (  )   │   Riesgo de mareo al ponerte de pie. Toma 500 ml de agua    │
│  /[■ ]\  │   con sal.                                                  │
│   [ ● ]  │ ● SpO₂ 97 % · Temp 36.6 °C                                  │
│   |   |  │ ● Glucosa 88 mg/dL                                          │
│   ●   ●  │ ■ Sueño 5 h 40 m ↓ (tu normal: 6 h 50 m)                     │
│          │ Ánimo hoy: 🙂 · Racha de la tripulación: 12 días             │
└──────────┴────────────────────────────────────────────────────────────┘
```

**Panel: protocolo paso a paso**

```
┌──────────────────────────────────────────┐
│ ▲ EMERGENCIA · Ana              Paso 2/6 │
│                                          │
│  Sujeta a Ana a la camilla con las       │
│  correas.                                │
│  Mantén sus piernas un poco más arriba   │
│  que la cabeza si es posible.            │
│                                          │
│  [            ✓ Hecho             ]      │
│  [        No respira → RCP        ]      │
│  🔊 Voz activa · Evento guardado para    │
│     el cirujano de vuelo                 │
└──────────────────────────────────────────┘
```

**Panel: salud femenina** (privada por defecto)

```
┌──────────────────────────────────────────┐
│ Salud femenina · 🔒 Solo yo       Día 46 │
├──────────────────────────────────────────┤
│ Supresión menstrual                      │
│ Método: anticonceptivo continuo          │
│ Inventario: 412 días ✓                   │
│ Sangrado intermitente esta semana: no    │
├──────────────────────────────────────────┤
│ ■ Coágulos: 2 factores (hormonal +       │
│   ingravidez). Ultrasonido de cuello     │
│   recomendado: próximo jueves.           │
├──────────────────────────────────────────┤
│ Al llegar a la gravedad                  │
│ Riesgo de mareo al ponerte de pie: más   │
│ alto. Plan de agua y sal activado.       │
└──────────────────────────────────────────┘
```

**Panel: juego cooperativo**

```
┌──────────────────────────────────────────┐
│ Tripulación · Jardín de la base  Semana 9│
│            🌱 🌿 🌻 🌿 🌱                 │
│ Sueño del equipo      ███████░░░  72 %   │
│ Agua del equipo       ████████░░  85 %   │
│ Ejercicio del equipo  █████████░  90 %   │
│ 💙 Luis le hizo un check-in a Ana        │
│    (+10 cuidado)                         │
│ Sin rankings individuales ·              │
│ El juego se puede apagar                 │
└──────────────────────────────────────────┘
```

### 6.4 Guía de estilo

| Elemento | Propuesta |
|---|---|
| Colores de estado | Bien `#3CCF7A` ● · Atención `#F2B83B` ■ · Urgente `#F05252` ▲ · Fondo `#0D1530` · Acción `#3A56D4` |
| Tipografía | Sans-serif de alta legibilidad (p. ej. Inter o Atkinson Hyperlegible); cifras grandes y unidades pequeñas |
| Iconografía | Pictogramas sin texto para emergencias; mismo icono en reloj y panel |
| Animación | Solo con propósito: pulso suave en la alerta, crecimiento del jardín, transición al tocar un órgano. Nada que distraiga en emergencias. |
| Sonido y vibración | Un patrón distinto por nivel: amarillo = 1 vibración; rojo = vibración continua + tono |

### 6.5 Pruebas con usuarios durante el hackathon

- **Prueba de 3 segundos:** mostrar el inicio 3 s y preguntar "¿esta persona está bien?".
- **Prueba de emergencia:** alguien sin formación médica sigue el protocolo de desmayo con una mano ocupada. Se mide tiempo y errores.
- **Prueba de daltonismo:** ver las pantallas con un simulador en escala de grises.

---

## 7. Indicadores y código de colores (ejemplo inicial)

*Rangos clínicos generales de la Tierra solo como punto de partida. En misión, LAZO usa la línea base personal y los umbrales que defina el cirujano de vuelo.*

| Indicador | ● Verde | ■ Amarillo (autocuidado guiado) | ▲ Rojo (compañero + tripulación + cirujano) | Fuente del rango |
|---|---|---|---|---|
| Presión arterial | <120/80 | 120–139 / 80–89, o baja con síntomas | ≥140/90 persistente, ≥180/120 o desmayo | AHA [36] |
| Glucosa en ayuno | 70–99 mg/dL | 100–125 mg/dL | <70 mg/dL (hipoglucemia) o ≥126 repetida | ADA [37] |
| SpO₂ | ≥95 % | 91–94 % | ≤90 % | Riesgo de hipoxia de NASA [13] |
| Sueño | ≥7 h | 6–7 h | <6 h varios días + tarea crítica | CDC [38], Barger 2014 [18] |
| Frecuencia cardiaca y temperatura | Desviación de la línea base personal (p. ej. fiebre ≥38 °C = rojo) | | | Línea base + cirujano de vuelo |
| Ánimo | Tendencia de 7 días + HRV; nunca un solo día aislado | | | Riesgo de conducta de NASA [7] |

### Respuestas a las preguntas del reto, indicador por indicador

*La página del reto propone cinco preguntas: ¿qué se puede medir en el espacio?, ¿por qué hace falta?, ¿cómo lo afectan los peligros del vuelo?, ¿cuándo amerita atención? y ¿qué se puede hacer para prevenir? [1]*

| Indicador | ¿Cómo se mide en el espacio? | ¿Por qué medirlo? (efecto del vuelo) | ¿Cuándo actuar? | Prevención |
|---|---|---|---|---|
| Presión arterial | Camiseta biométrica o brazalete [20] | La ingravidez redistribuye los líquidos y cambia la circulación [5] | Baja con mareo, sobre todo al volver a la gravedad | Agua y sal antes del aterrizaje, ejercicio |
| Frecuencia cardiaca / ECG | Camiseta biométrica, reloj [20] | Riesgo de eventos cardiovasculares [5]; también refleja estrés y sueño | Arritmia o desviación grande de la línea base | Ejercicio cardiovascular, sueño |
| SpO₂ | Camiseta biométrica, reloj [20] | Riesgo de hipoxia, sobre todo cerca de las caminatas espaciales [13] | ≤90 % = rojo | Protocolos de preparación para caminatas espaciales |
| Glucosa | Glucómetro portátil | La evidencia sobre resistencia a la insulina en vuelo es contradictoria [53]; refleja si se come lo suficiente | <70 mg/dL o valores altos repetidos | Comer completo, ejercicio |
| Temperatura | Camiseta biométrica, termómetro [20] | El sistema inmune cambia y pueden reactivarse virus latentes [11] | Fiebre ≥38 °C | Higiene, sueño, registro de síntomas |
| Sueño | Reloj (actividad y frecuencia cardiaca) [21] | En promedio ~6 h en vuelo; uso frecuente de pastillas para dormir [18] | <6 h varios días antes de una tarea crítica | Higiene de sueño, luz, horarios |
| Ánimo | Check-in de 10 s + HRV | Aislamiento, confinamiento y distancia afectan la salud mental [7] | Tendencia negativa de 7 días; crisis | Contacto con la Tierra, actividades de equipo |
| Hidratación y orina | Registro de agua + síntomas urinarios | Poca orina y calcio alto aumentan el riesgo de cálculos renales [51] | Menos de 2 L de orina al día de forma sostenida [51] | Agua, menos sodio, ejercicio |
| Dosis de radiación | Dosímetro personal [22] | Riesgo de cáncer a largo plazo [12] | Acercarse al límite de carrera de 600 mSv [31] | Refugio durante tormentas solares |

---

## 8. Puntos fuertes

| Fortaleza | Por qué pesa ante los jueces |
|---|---|
| Cumple punto por punto lo que pide el reto | Figura humana, semáforo, gráficas, gamificación, recordatorios e instrucciones simples (sección 2) |
| Responde a una necesidad que NASA y la CSA ya nombraron | EIMO y Health Beyond: autonomía médica en el espacio profundo [15][16] |
| Enfoque en salud femenina | Pocos equipos lo tocarán, y tiene datos detrás [25][27][29][31][32] |
| Hardware creíble | Bio-Monitor y Astroskin de la CSA, dosímetros canadienses: conecta con los recursos del reto [20][22] |
| Buddy system | Une emergencias, salud mental y trabajo en equipo en una sola idea |
| Funciona sin conexión | Indispensable con retrasos de hasta 22 min y apagones [14] |
| Cubre los 5 peligros y más de 10 riesgos de NASA | Integral sin perder el hilo |
| Diseño UX/UI fundamentado | Principios para microgravedad, accesibilidad y maquetas listas (sección 6) |

---

## 9. Puntos débiles y cómo los resolvemos

| Riesgo | Por qué importa | Solución en LAZO |
|---|---|---|
| **1. Falsas alarmas** | Si suena siempre, la tripulación la ignora | Confirmación en capas (primero el propio astronauta, luego el compañero) y alertas que exigen varias señales a la vez |
| **2. Sensores que leen distinto en microgravedad** | La ingravidez altera la circulación [5]; un umbral de la Tierra no sirve | Línea base personal aprendida en la primera semana; alertas por desviación |
| **3. Responsabilidad médica** | "¿Y si la app indica algo mal?" | LAZO **guía protocolos aprobados**, no diagnostica; el cirujano de vuelo valida el contenido antes de la misión |
| **4. "Eso ya existe"** | La ISS ya tiene monitoreo y checklists | Nuestro valor es integrar, automatizar y hacerlo visual y autónomo; hoy depende del soporte en tiempo real desde la Tierra [16] |
| **5. Pocos datos de mujeres** | No alcanza para entrenar IA confiable [32] | Reglas simples + línea base personal; la app recolecta datos con consentimiento para el futuro |
| **6. Privacidad y síntomas ocultos** | Datos menstruales y de salud mental son sensibles; los astronautas pueden callar síntomas | Tres niveles: privado / compartido con el compañero (solo alertas) / médico; en emergencia se desbloquea lo necesario |
| **7. Carga de trabajo** | Agendas programadas al minuto | Registro casi todo automático; check-ins de 10 s; escaneo de comida |
| **8. Juego infantil o que presione** | Puede generar rechazo o estrés | Estética sobria, metas cooperativas, sin rankings públicos, opción de apagar el juego |
| **9. Interfaz en pánico** | Ruido, manos ocupadas, objetos flotando | Voz + pictogramas grandes, una acción por pantalla, avance por voz o con un toque grande |
| **10. Fallas de hardware** | Batería, radiación que daña la electrónica, poca masa disponible | Modo degradado: si falla el reloj sigue el panel y viceversa; sincronización al reconectar |
| **11. RCP poco efectiva en microgravedad** | Las técnicas manuales no llegan a la profundidad necesaria [26] | Priorizar el compresor mecánico y la fijación del paciente; guía con metrónomo |
| **12. Que solo se entienda con color** | Personas con daltonismo o pantallas con reflejo | Color + forma + texto en todos los estados (sección 6) |
| **13. Confundir pánico con un problema físico** | Los síntomas son casi iguales a los de un problema cardiaco, hipoxia o CO₂ alto [46] | LAZO siempre descarta primero lo físico (SpO₂, ECG, CO₂); la detección de pánico es solo una sospecha [45] |
| **14. Datos simulados poco realistas** | Los jueces notan datos inventados | Simular a partir de rangos publicados por NASA y de datos abiertos de vuelos reales (repositorio OSDR, con datos de Inspiration4) [43] |

---

## 10. Beneficio en la Tierra

La CSA explica que los efectos del espacio en el cuerpo se parecen al envejecimiento acelerado y al sedentarismo, y que esos hallazgos ayudan con osteoporosis, problemas de equilibrio, enfermedades cardiovasculares y diabetes tipo 2 [17]. La versión comercial del Bio-Monitor ya se usa en investigación y podría ayudar a personas en cama o en comunidades rurales [20]. La CSA también plantea la atención remota como una realidad compartida entre el espacio y la Tierra [39].

- **Comunidades rurales o remotas sin médico:** el mismo flujo de "¿Qué hago?" sin conexión.
- **Bases antárticas, plataformas petroleras, submarinos, misiones de rescate.**
- **Salud de la mujer** en zonas con poca atención: seguimiento del ciclo, riesgo de coágulos.
- **Adultos mayores:** pérdida ósea, mareo al ponerse de pie, cuidado entre familiares (buddy system).

---

## 11. Arquitectura técnica (propuesta)

| Capa | Qué hace | Opción para el hackathon |
|---|---|---|
| Sensores (simulados) | Generan frecuencia cardiaca, SpO₂, presión, glucosa, sueño, CO₂ y dosis | Script que emite datos cada segundo, con escenarios (normal, desmayo, CO₂ alto) |
| Motor de reglas | Línea base personal + umbrales + confirmación en capas | Reglas en JavaScript o Python, fáciles de explicar a los jueces |
| Almacenamiento local | Todo funciona sin conexión; cola de envío a la Tierra | Base de datos local en el navegador o archivo JSON |
| Interfaz | Panel y reloj | Web app (p. ej. React) con una vista "reloj" y una vista "panel" |
| Sincronización | Envío diferido al cirujano de vuelo con retraso simulado | Interruptor "Comunicación: activa / retraso / apagón" en la demo |

---

## 12. Plan para un equipo de 6

| Rol | Responsable de | Prioridad |
|---|---|---|
| 1. Líder de producto + pitch | Alcance, guion, video, tabla de alineación con el reto | P0 |
| 2. UX/UI | Panel, figura humana, semáforo, flujo de emergencia en el reloj | P0 |
| 3. Frontend | Panel web interactivo y gráficas dinámicas | P0 |
| 4. Datos y simulación | Generador de datos de sensores simulados, línea base, reglas de alerta | P0 |
| 5. Contenido médico y salud femenina | Protocolos, fichas, módulo de sexo y género, validación de fuentes | P0/P1 |
| 6. Gamificación + nutrición + salud mental | Metas cooperativas, check-in, escaneo de comida | P1 |

**Orden de construcción:** 1) el flujo de emergencia completo de punta a punta; 2) el panel con semáforo y la figura humana; 3) salud femenina; 4) nutrición, salud mental y juego; 5) extras P2. Todo lo P2 que no se programe se muestra como pantallas de diseño.

---

## 13. Guion de la demo (escenario)

> **Marte, sol 2: la tripulación acaba de llegar tras unos 7 meses en ingravidez. Retraso de comunicación con la Tierra: 18 minutos por trayecto.**
>
> Ana se pone de pie por primera vez en 3/8 de la gravedad terrestre. Su reloj detecta caída de presión, inmovilidad y frecuencia cardiaca baja → le vibra "¿Estás bien?" y no responde → vibra el reloj de Luis, su compañero → el panel muestra "Posible desmayo. Paso 1: sujeta a Ana…" con voz y pictogramas → Ana se recupera → la figura humana marca el corazón en amarillo y el módulo femenino explica el mayor riesgo de mareo al ponerse de pie al volver a la gravedad, más la baja hidratación → se ajustan sus metas de agua y sal → el evento queda en cola para el cirujano de vuelo, que responderá en ~36 minutos ida y vuelta → el "jardín" de la tripulación sigue verde y Luis gana puntos de cuidado.

*Por qué este escenario: la intolerancia ortostática aparece al volver a exponerse a la gravedad tras la ingravidez [29], y es más frecuente en mujeres [30]. El retraso de 18 minutos está dentro del rango estimado por NASA [14].*

---

## 14. Métricas de éxito

- Tiempo desde el evento hasta la primera acción correcta del compañero.
- Falsas alarmas por semana (meta: casi cero gracias a la confirmación en capas).
- Porcentaje de cumplimiento de metas de sueño, agua, comida y ejercicio de la tripulación.
- Comprensión: ¿una persona sin formación médica sigue el protocolo sin ayuda? (prueba con usuarios en el hackathon)
- Prueba de 3 segundos: porcentaje de personas que identifican correctamente el estado de salud en la pantalla de inicio.

---

## 15. Hoja de ruta después del hackathon

- **Fase 1, prototipo:** lo presentado en el hackathon, con datos simulados.
- **Fase 2, análogos en Tierra:** probarlo en simulaciones de aislamiento, como el hábitat HERA o una estación antártica.
- **Fase 3, validación médica:** revisar los protocolos con médicos aeroespaciales y la línea base con datos reales.
- **Fase 4, versión terrestre:** comunidades rurales y salud de la mujer.

---

## 16. Cómo responde a los criterios de evaluación

*Space Apps evalúa con cinco criterios: impacto, creatividad, validez, relevancia y presentación [48].*

| Criterio | Evidencia en esta propuesta |
|---|---|
| **Impacto** | Autonomía médica en el espacio profundo (EIMO, Health Beyond) y uso en la Tierra: comunidades rurales, salud de la mujer, adultos mayores (secciones 3 y 10) |
| **Creatividad** | Buddy system, juego cooperativo, salud diferenciada por sexo, detección de problemas del ambiente cuando varias personas tienen síntomas a la vez |
| **Validez** | Cada módulo cita su fuente; los límites y las dudas se dicen abiertamente (muestras pequeñas, evidencia mixta, detección de pánico como sospecha) |
| **Relevancia** | Tabla de alineación con el reto (sección 2) y respuestas a sus cinco preguntas para cada indicador (sección 7) |
| **Presentación** | Maquetas, guía de estilo, demo con un escenario realista y pruebas con usuarios (secciones 6 y 13) |

---

## Referencias

*[1]–[3], [17] y [22] son los recursos oficiales del reto. Las demás son páginas oficiales de NASA o CSA y artículos revisados por pares. Verifiquen las cifras antes de presentar; algunas provienen de resúmenes oficiales y no del texto completo.*

1. NASA Space Apps Challenge 2026. *Create Health Monitoring Software for Astronauts on Space Missions* (Details y Resources). https://www.spaceappschallenge.org/2026/challenges/health-monitoring-software/
2. NASA HRP. *5 Hazards of Human Spaceflight*. https://www.nasa.gov/hrp/hazards/
3. NASA HRP. *Risks of Human Spaceflight*. https://www.nasa.gov/hrp/risks/
4. NASA. *Risk of Spaceflight-Induced Bone Changes*. https://www.nasa.gov/reference/risk-of-spaceflight-induced-bone-changes/
5. NASA. *Risk of Cardiovascular Adaptations*. https://www.nasa.gov/reference/risk-of-cardiovascular-adaptations/
6. NASA. *Risk of Inadequate Food and Nutrition*. https://www.nasa.gov/reference/risk-of-inadequate-food-and-nutrition/
7. NASA. *Risk of Behavioral Conditions and Psychiatric Disorders*. https://www.nasa.gov/reference/risk-of-behavioral-conditions-and-psychiatric-disorders/
8. NASA. *Risk of Inadequate Teamwork*. https://www.nasa.gov/reference/risk-of-inadequate-teamwork/
9. NASA. *Risk from Inadequate Sleep and Irregular Schedules*. https://www.nasa.gov/reference/risk-from-inadequate-sleep-and-irregular-schedules/
10. NASA. *Risk of Spaceflight Associated Neuro-ocular Syndrome (SANS)*. https://www.nasa.gov/reference/risk-of-spaceflight-associated-neuro-ocular-syndrome-sans/
11. NASA. *Risk of Altered Immune System Responses*. https://www.nasa.gov/reference/risk-of-altered-immune-system-responses/
12. NASA. *Risk of Radiation-Induced Cancers*. https://www.nasa.gov/reference/risk-of-radiation-induced-cancers/
13. NASA. *Risk of Hypoxia*. https://www.nasa.gov/reference/risk-of-hypoxia/
14. NASA Langley / NTRS. *Communication Delays, Disruptions, and Blackouts for Crewed Mars Missions* (ASCEND 2022). https://ntrs.nasa.gov/citations/20220013418
15. NASA / NTRS. *Communications for Exploration* (póster sobre EIMO y latencia, 2025). https://ntrs.nasa.gov/citations/20250002660
16. Agencia Espacial Canadiense. *Health Beyond Initiative*. https://www.asc-csa.gc.ca/eng/health/health-beyond-initiative/
17. Agencia Espacial Canadiense. *Why do we conduct science experiments in space?* https://www.asc-csa.gc.ca/eng/iss/science/why-do-we-conduct-science-experiments-in-space.asp
18. Barger LK et al. (2014). Prevalence of sleep deficiency and use of hypnotic drugs in astronauts before, during, and after spaceflight. *The Lancet Neurology*, 13(9). https://doi.org/10.1016/S1474-4422(14)70122-X
19. NASA. *How does spaceflight change food appeal?* (Food Acceptability). https://www.nasa.gov/humans-in-space/how-does-spaceflight-change-food-appeal/
20. Agencia Espacial Canadiense. *Bio-Monitor: Keeping an eye on astronauts' vital signs*. https://www.asc-csa.gc.ca/eng/sciences/astroskin.asp
21. NASA. *ARCHeR* (Artemis II). https://www.nasa.gov/reference/archer/
22. Agencia Espacial Canadiense (2026). *Monitoring radiation for astronaut health*. https://www.asc-csa.gc.ca/eng/news/articles/2026/2026-02-26-monitoring-radiation-astronaut-health.asp
23. NASA. *Standard Measures* y *CIPHER*. https://www.nasa.gov/reference/standard-measures/ · https://www.nasa.gov/reference/cipher/
24. NASA. *Tempus Pro*. https://www.nasa.gov/reference/tempus-pro/
25. Auñón-Chancellor SM, Pattarini JM, Moll S, Sargsyan A (2020). Venous Thrombosis during Spaceflight. *New England Journal of Medicine*, 382:89. https://doi.org/10.1056/NEJMc1905875
26. Estudio de RCP en microgravedad en vuelos parabólicos (Congreso de la Sociedad Europea de Cardiología, 2025), reportado por HealthDay. https://www.healthday.com/health-news/cardiovascular-diseases/cpr-in-space-best-method-identified-researchers-say · Antecedente: Rehnberg L et al. (2014), *Aviation, Space, and Environmental Medicine*.
27. Jain V, Wotring VE (2016). Medically induced amenorrhea in female astronauts. *npj Microgravity*, 2:16008. https://pmc.ncbi.nlm.nih.gov/articles/PMC5516549/
28. NASA. *Venous Haemostasis*. https://www.nasa.gov/reference/venous-haemostasis/
29. NASA / NTRS. *Evidence Report: Risk of Orthostatic Intolerance During Re-exposure to Gravity*. https://humanresearchroadmap.nasa.gov/Evidence/reports/ORTHO.pdf
30. NASA ISS Science Blog. Resumen del compendio *Impact of Sex and Gender on Adaptation to Space*. https://blogs.nasa.gov/ISS_Science_Blog/tag/mission-highlights/
31. NASA OCHMO. *Radiation Protection Technical Brief* (basado en NASA-STD-3001). https://www.nasa.gov/wp-content/uploads/2023/03/radiation-protection-technical-brief-ochmo.pdf
32. Mark S et al. (2014). The Impact of Sex and Gender on Adaptation to Space. *Journal of Women's Health*, 23(11). Salud reproductiva: https://pmc.ncbi.nlm.nih.gov/articles/PMC4235591/ · Salud conductual: https://pmc.ncbi.nlm.nih.gov/articles/PMC4235984/
33. NASA. *Enhanced diet may help astronauts adapt to spaceflight* (Food Physiology). https://www.nasa.gov/missions/station/enhanced-diet-may-help-astronauts-adapt-to-spaceflight/
34. Revisión del "fenómeno del tercer cuarto" en la Antártida y Mars-500, p. ej. *Frontiers in Psychology* (2018). https://www.frontiersin.org/articles/10.3389/fpsyg.2018.02235/full
35. NASA. *Can space gardening help astronauts cope with isolation?* https://www.nasa.gov/humans-in-space/can-space-gardening-help-astronauts-cope-with-isolation/
36. American Heart Association. *Understanding Blood Pressure Readings*. https://www.heart.org/en/health-topics/high-blood-pressure/understanding-blood-pressure-readings
37. American Diabetes Association. *Diagnosis*. https://diabetes.org/about-diabetes/diagnosis
38. CDC. *About Sleep*. https://www.cdc.gov/sleep/about/index.html
39. Agencia Espacial Canadiense. *Remote healthcare in space and on Earth*. https://www.asc-csa.gc.ca/eng/health/remote-healthcare-in-space-and-on-earth.asp
40. NASA. *Human Integration Design Handbook*. https://www.nasa.gov/human-integration-design-handbook/
41. NASA. *NASA-STD-3001 Volume 2: Human Factors, Habitability, and Environmental Health* (Rev. D). https://www.nasa.gov/wp-content/uploads/2023/11/nasa-std-3001-vol-2-rev-d-with-signature.pdf
42. NASA OCHMO. *Carbon Dioxide (CO₂) Technical Brief* (OCHMO-TB-004, basado en NASA-STD-3001). https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-004-carbon-dioxide.pdf
43. NASA. *Open Science Data Repository (OSDR)*. https://osdr.nasa.gov/
44. W3C. *Web Content Accessibility Guidelines (WCAG) 2.2*. https://www.w3.org/TR/WCAG22/
45. Predicción de ataques de pánico con ECG portátil y aprendizaje automático. *Journal of Medical Internet Research* (2025), e69045. https://www.jmir.org/2025/1/e69045
46. MedlinePlus (Biblioteca Nacional de Medicina de EE. UU.). *Panic disorder*. https://medlineplus.gov/ency/article/000924.htm
47. Fincham GW et al. (2023). Effect of breathwork on stress and mental health: a meta-analysis of randomised-controlled trials. *Scientific Reports*, 13, 432. https://www.nature.com/articles/s41598-022-27247-y
48. NASA Space Apps Challenge. *Judging & Awards Guide*. https://www.spaceappschallenge.org/resources/judging-awards-guide
49. Análisis de caducidad del botiquín de la ISS para misiones de exploración (2024). https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11266549/
50. NASA. *Astronaut Exercise*. https://www.nasa.gov/missions/station/iss-research/astronaut-exercise/
51. NASA HRP. *Evidence Report: Risk of Renal Stone Formation*. https://ntrs.nasa.gov/citations/20170004709
52. Mark S et al. (2014). The Impact of Sex and Gender on Adaptation to Space: Executive Summary. *Journal of Women's Health*, 23(11). https://pmc.ncbi.nlm.nih.gov/articles/PMC4236030/
53. Estudio sobre resistencia a la insulina y metabolismo en astronautas. *Communications Biology* (2023). https://www.nature.com/articles/s42003-023-05213-2

*Nota: NASA no respalda entidades no gubernamentales de EE. UU. Las fuentes externas se usan solo como fundamento científico, según las condiciones de uso de datos del reto.*
