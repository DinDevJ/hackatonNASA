# EVA — propuesta unificada del equipo

Monitoreo de salud para astronautas en misiones de larga duración. NASA Space Apps 2026,
reto *Create Health Monitoring Software for Astronauts on Space Missions*.

Este documento **une las cinco propuestas** de `Planeacion/`. No las reemplaza: cada
sección dice de quién viene y enlaza al documento original para el detalle.

✅ verificado · ⚠️ verificar · 🔶 decisión nuestra (misma convención del README)

---

## 0. Decisiones tomadas

| Decisión | Elegido | Origen |
|---|---|---|
| Nombre | **EVA** | Equipo |
| Base técnica | Motor de línea base + reglas YAML + escalera de escalamiento | [Julio](../Julio/comportamiento-del-software.md) |
| Emergencia de la demo | **Evento de partículas solares (SPE)** con datos reales de DONKI | [Julio](../Julio/comportamiento-del-software.md#7-segundo-escenario-corto--día-115-evento-de-partículas-solares) |
| Quién ve qué | Modelo de privacidad por capas con buddy system (§4) | Katy |
| Capa visual | Figura humana, semáforo con formas, reloj + panel | [Katy](Propuesta-LAZO-NASA-SpaceApps-2026.md#6-diseño-uxui-cómo-se-ve-y-cómo-se-usa) |
| Módulos | Los 22 módulos de las cinco propuestas, ordenados por prioridad (§6) | Todos |

### ⚠️ Ojo con el nombre

En NASA, **EVA = Extravehicular Activity**, es decir, una **caminata espacial**. Y los
escenarios de Julio hablan de "EVA programada en 36 h". Un juez de NASA va a leer "EVA"
como caminata espacial.

🔶 Propuesta para que el choque juegue a favor y no en contra:

- Darle significado al nombre: **EVA — Evaluación Vital Autónoma**.
- En todo el texto, la UI y la demo, a la caminata espacial le decimos **"caminata
  espacial"**, nunca "EVA". Así "EVA" siempre es el producto.
- Remate posible en el pitch: *"Antes de cada EVA, EVA te dice si estás listo."*

---

## 0.1 Contexto único de la demo y tripulación 🔶

Todos los escenarios, maquetas, datos sintéticos y diapositivas usan **este mismo
contexto**. Si algo dice "Marte, sol 2" u otra fecha, se corrige a esto.

**Misión:** tránsito a Marte. Días 112 a 115 de vuelo. Retraso de comunicación ese
día: **18 min por trayecto** (36 min ida y vuelta), dentro del rango de 4–24 min ✅.

| ID | Nombre | Rol | Sexo | Pareja del buddy system | Papel en la demo |
|---|---|---|---|---|---|
| MS-1 | Tomás | **Comandante** | H | Mei | Recibe el estado "apto / no apto" y la alerta cuando la CMO no aparece |
| MS-2 | Ana | Especialista de misión | M | Luis | **Protagonista:** fatiga del día 112 → cierre del día 114; tiene programada una caminata espacial |
| MS-3 | Mei | **CMO** | M | Tomás | En el evento solar no confirma que llegó al refugio |
| MS-4 | Luis | Ingeniero de vuelo | H | Ana | Hace los check-ins de cuidado a Ana en el juego |

Por qué así:
- Dos mujeres y dos hombres, para que la tabla hombre/mujer y el módulo de salud
  femenina tengan a quién aplicarse.
- La CMO tiene pareja propia: si ella es quien falta, el caso borde "el CMO no está
  disponible" se ve en la demo sin agregar otro escenario.
- La línea base de Ana es la del escenario de Julio (FC en reposo 58, sueño 7 h 05,
  2 lapsos en la prueba de reflejos).

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
variación (desde alertas predictivas hasta horas). Súmale **4 a 24 min** de viaje de la
señal hasta Marte. Cuando el aviso llega, la dosis ya se recibió.

---

## 2. Arquitectura en capas

| Capa | Qué hace | De quién |
|---|---|---|
| **Datos** | Reloj, camiseta biométrica, check-in de 20 s, prueba de reflejos PVT-B, dosímetro, eventos DONKI | Julio · [diccionario](../Julio/diccionario-de-datos.md) |
| **Motor** | Línea base móvil de 14 días (mediana + MAD), z robusto, reglas multivariables en YAML auditables | Julio |
| **Riesgo** | Tres formas de mostrarlo: probabilidad con modelo, margen contra la norma o nivel relativo | [Leo](../Leo/resumen.md) |
| **Escalamiento** | Nivel 0 autocuidado → 1 CMO a bordo → 2 cirujano de vuelo → 3 junta médica | Julio |
| **Privacidad** | Quién ve qué, buddy system, registro de accesos | Katy · §4 |
| **Experiencia** | Reloj + panel, figura humana, semáforo ●■▲, juego cooperativo | Katy |
| **Tiempos** | Cada registro con `t_sclk`, `t_scet`, `t_ert`; Tierra ordena por SCET y muestra la antigüedad | Julio |
| **Enlace con Tierra** | Cola priorizada, envío diferido, red tolerante a interrupciones (DTN) como visión futura | Julio · [Fani](../Fani/Propuesta.docx) |

---

## 3. Roles

| Rol | Quién es |
|---|---|
| **Astronauta** | La persona monitoreada. Dueña de sus datos. |
| **Compañero (buddy)** 🔶 | Otro tripulante asignado, en parejas que rotan. Es el primero en enterarse si su pareja **necesita ayuda**, no de sus datos. |
| **CMO** | Crew Medical Officer: tripulante con entrenamiento médico, no necesariamente médico ✅ |
| **Comandante** | Responsable de la misión. Necesita saber quién está **apto**, no por qué. |
| **Cirujano de vuelo** | Médico en Tierra. Recibe datos con retraso. |
| **Investigación (NASA/HRP)** | Archivo longitudinal. Solo datos anonimizados y con consentimiento. |

---

## 4. 🔶 Quién ve qué

### Principios

1. **El astronauta siempre ve todo lo suyo**, completo.
2. **El compañero recibe alertas, no datos.** Sabe *que* su pareja necesita ayuda, no
   *por qué*. Solo durante una emergencia activa ve los signos vitales en vivo que
   necesita para ayudar.
3. **El CMO ve lo clínico** de toda la tripulación, porque es quien atiende a bordo
   (coincide con el modelo de 3 niveles de Julio).
4. **Lo más sensible es privado por defecto:** salud menstrual y el detalle del diario
   emocional. Solo se comparten si la persona quiere o si son relevantes para una
   emergencia roja.
5. **El comandante ve aptitud, no diagnóstico:** "apto / no apto para caminata
   espacial", sin el motivo médico.
6. **La emergencia desbloquea solo lo necesario, y por tiempo limitado.** Al cerrar el
   evento, los permisos vuelven a la normalidad.
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
| **Alerta de evento solar** | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| Ubicación en la nave | ✔ | 🚨 | 🚨 | 🚨 | — | — |
| Registro de una emergencia | ✔ | ◐ lo que hizo | ✔ | ✔ | ✔ completo, sellado con SCET | ✋ reglas NASA |
| Juego cooperativo | ✔ | ◐ meta lograda / no lograda | ◐ meta lograda / no lograda | ◐ meta lograda / no lograda | — | — |

**Por qué "reglas NASA" y no "anónimo":** con 4 a 6 personas, quitar el nombre no
basta para que nadie sea reconocible. Por eso NASA entrega los datos fisiológicos
humanos solo con una solicitud de acceso aprobada (DAR) ✅ (ver
[roadmap de Julio](../Julio/roadmap.md#2-inventario-de-datos--qué-tenemos-y-qué-no)).
EVA no promete anonimato: promete **consentimiento + las reglas de acceso de NASA**.

**Por qué el CMO ve la tendencia y no el día a día del ánimo:** si alguien sabe que su
check-in diario lo lee un compañero de tripulación, puede responder "bien" aunque no lo
esté, igual que pasa con los síntomas que se callan. La tendencia semanal basta para
que el CMO detecte un cambio sostenido.

**Regla de equipo:** las alertas del ambiente (evento solar, CO₂, presión) **no son
privadas**: llegan a todos, porque afectan a todos.

### Casos borde

| Caso | Qué hace EVA |
|---|---|
| **El CMO es el paciente** | Salta el nivel 1, escala directo al cirujano de vuelo y avisa al comandante (Julio). Su compañero hace de rescatista. |
| **El compañero también está afectado** | La alerta pasa a toda la tripulación. |
| **Varias personas con síntomas a la vez** | Lo trata como un problema del ambiente, no de personas, y alerta a todos. |
| **Riesgo de hacerse daño** | Nivel rojo: CMO y cirujano de vuelo, aunque el diario sea privado. Es la única excepción al ✋ del diario emocional. |
| **El astronauta revoca un consentimiento** | Deja de compartirse desde ese momento; lo ya enviado a Tierra queda registrado como "compartido con permiso en su momento". |
| **El reloj de alguien se apaga o pierde señal** | Nunca se dice "no responde": se dice **"sin señal del reloj de Mei"**, con la hora de la última lectura. Son dos situaciones distintas y el compañero debe saber cuál es. |

### Privacidad en un espacio compartido

Una nave es un lugar chico donde todos ven las pantallas de todos. Tres reglas:

1. **El panel de pared es público.** En reposo solo muestra el estado ●■▲ de cada
   persona y las alertas del ambiente. **Nunca** valores ni la figura humana de alguien.
2. **El detalle se abre identificándose.** Se acerca el reloj al panel (o se usa la
   tablet personal). La vista personal **se bloquea sola a los 30 s** sin uso o cuando la
   persona se aleja.
3. **Las notificaciones del reloj son discretas.** Sin texto médico en la pantalla
   bloqueada: solo "EVA tiene algo para ti". El detalle aparece al girar la muñeca y
   tocar.

### Transparencia: "lo que ven de mí"

Cada astronauta puede abrir **exactamente lo que ve cada rol de él o ella** (por
ejemplo, "el comandante ve: no apto para caminata espacial, sin motivo"). Saber qué
ven los demás reduce la tentación de ocultar síntomas.

### Consentimiento antes del vuelo

Los permisos ✋ se configuran **en Tierra, antes del lanzamiento**, con el cirujano de
vuelo, y no en medio de una crisis:

- Cada astronauta elige qué comparte con el CMO y con Tierra, módulo por módulo.
- Se le explica el único caso que **no** puede desactivar: el riesgo de hacerse daño
  y una emergencia roja.
- Puede cambiar sus permisos en vuelo cuando quiera; cada cambio queda registrado.
- 🔶 En la demo se muestra esta pantalla en 5 segundos, solo para que se vea que existe.

### En la interfaz

- Cada tarjeta de dato muestra un **candado con quién la ve**: 🔒 Solo yo · 🤝 Compañero ·
  ⚕️ CMO · 🌍 Tierra.
- Pantalla de **"Quién vio mis datos"**: lista con rol, dato, hora (SCET) y motivo.
- Durante una emergencia, un aviso visible: *"Tus signos vitales se están compartiendo con
  Luis (compañero) mientras dure la emergencia."*

---

## 5. 🚨 Emergencia de la demo: evento de partículas solares

Base: [escenario del día 115 de Julio](../Julio/comportamiento-del-software.md#7-segundo-escenario-corto--día-115-evento-de-partículas-solares).
Lo que se agrega: el **buddy system** y el **modelo de privacidad**.

**Por qué esta emergencia** (argumento de Julio, que adoptamos):
- Su protocolo es **logístico** ("ve al refugio"), no clínico. **No inventamos medicina.**
- Usa **datos reales de NASA**: 51 eventos SEP de DONKI ya guardados en
  `Planeacion/Julio/datos/` ✅.
- Conecta con el material de radiación de la CSA que viene en *Resources* del reto.

### Línea de tiempo

La fecha, el instrumento y la latencia del aviso salen de un evento real de DONKI.
Las dosis en mSv son **simuladas** ⚠️: DONKI no entrega dosis.

| Hora | Qué pasa | Quién lo ve |
|---|---|---|
| 11:04 | La tasa de dosis sube de 0.3 a 14 mSv/día ⚠️ | — |
| 11:04 | **▲ ROJO · Evento de partículas solares.** *"Dirígete al refugio blindado. Ahora."* | **Todos** (alerta del ambiente) |
| 11:04 | En pantalla: el evento real de DONKI que sirve de modelo, con su instrumento (p. ej. `GOES-P: SEISS >10 MeV`) | Todos |
| 11:05 | Protocolo RAD-01, un paso por pantalla | Cada astronauta |
| 11:06 | **Buddy check:** el reloj de cada uno pregunta *"¿Tu pareja llegó al refugio?"* | Cada compañero |
| 11:07 | Luis confirma que Ana llegó; Ana confirma a Luis. Mei no confirma, pero su reloj sí tiene señal | Tomás (pareja de Mei) |
| 11:07 | Alerta a Tomás: *"Mei no ha confirmado. Su reloj tiene señal. Última ubicación: Módulo C."* Como Mei es la **CMO**, EVA avisa además que el nivel 1 está sin cubrir mientras no aparezca | Tomás, que además es comandante (ubicación 🚨) |
| 11:09 | Mei llega: estaba con los audífonos puestos | Todos ven "4 de 4 en el refugio" |
| 11:31 | La tasa se normaliza. Evento cerrado. Dosis acumulada personal actualizada | Cada uno ve la suya; la CMO ve todas; el comandante ve el margen |
| 11:32 | La caminata espacial de Ana sigue en pie: su fatiga cerró el día 114 y la dosis del evento queda dentro del margen | Ana ve el detalle; Tomás ve "apta" |
| Primera ventana | Paquete prioritario a Tierra con la cronología sellada con SCET | Cirujano de vuelo |

### Qué demuestra este escenario

- **Decisión local:** el aviso de Tierra habría llegado tarde (17 min de mediana + viaje).
- **Buddy system con sentido:** nadie se queda atrás, sin necesidad de compartir datos
  médicos.
- **Privacidad funcionando:** la ubicación solo se comparte durante la emergencia.
- **Datos reales:** el evento existió, con fecha e instrumento.

### Fuera de la demo

- El **desmayo** y la **crisis de pánico** de la [propuesta LAZO](Propuesta-LAZO-NASA-SpaceApps-2026.md)
  quedan como escenarios secundarios, **marcados como ilustrativos**, porque sus pasos
  son clínicos y no están validados (regla de honestidad de Julio).
- El **motor diagnóstico probabilístico** ([Julio](../Julio/motor-diagnostico.md)) va
  después, si queda tiempo.

---

## 6. Módulos de EVA

**Ninguna idea se descarta: todas entran, ordenadas por prioridad.**
🔴 Núcleo = se programa y sale en la demo · 🟡 Diferenciador = se programa si da el
tiempo; si no, se muestra como pantalla de diseño · 🔵 Visión = hoja de ruta y
diapositiva.

### 🔴 Núcleo

| # | Módulo | Qué incluye | De quién | Detalle |
|---|---|---|---|---|
| 1 | **Panel de salud + Cuerpo EVA** | Figura humana clicable, semáforo ●■▲, los 6 indicadores del reto (presión, FC, glucosa, temperatura, sueño, ánimo) + SpO₂ e hidratación, gráficas contra la línea base personal | Katy · Fani · Diana | [LAZO §5 y §6](Propuesta-LAZO-NASA-SpaceApps-2026.md#5-módulos-por-prioridad) |
| 2 | **Motor de prevención** | Línea base de 14 días, z robusto, reglas YAML, cruce de 3 señales, protocolo con seguimiento y cierre (fatiga del día 112 → día 114) | Julio | [comportamiento §6](../Julio/comportamiento-del-software.md#6-escenario-corrido--día-112-fatiga-antes-de-una-eva) |
| 3 | **Emergencias + buddy system** | Activación manual, automática o por un tercero; una acción por pantalla; registro sellado con SCET; buddy check. Demo: evento solar (§5) | Julio · Katy · Diana | §5 de este documento |
| 4 | **Radiación** | Eventos solares reales de DONKI, dosis acumulada personal (simulada ⚠️), margen hasta el límite de carrera | Julio · Leo | [stack §1](../Julio/stack-y-dependencias.md#1--donki-verificado-con-datos-reales-ya-descargados) |
| 5 | **Reloj + recordatorios** | Estado de un vistazo, "¿Estás bien?", alerta del compañero, recordatorios de medición dentro de la rutina | Katy · Fani | [LAZO §6.3](Propuesta-LAZO-NASA-SpaceApps-2026.md#63-maquetas-de-referencia) |
| 6 | **Privacidad: quién ve qué** | Matriz por rol, candados en cada dato, "quién vio mis datos" | Katy | §4 de este documento |
| 7 | **Comunicación con Tierra** | Cola priorizada, envío diferido, nota de Tierra que llega tarde con su antigüedad, vista del cirujano de vuelo | Julio · Fani | [comportamiento §5](../Julio/comportamiento-del-software.md#5-modelo-de-tiempos--scet-ert-y-owlt) |

### 🟡 Diferenciadores

| # | Módulo | Qué incluye | De quién |
|---|---|---|---|
| 8 | **Salud mental y del equipo** | Check-in de ánimo de 20 s, HRV, prueba de reflejos PVT-B, tendencias de 7 días, contenido de "Tierra", actividades de equipo, cuestionario de carga de trabajo (NASA-TLX) | Julio · Leo · Katy · Fani |
| 9 | **Crisis de ansiedad o pánico** | Primero descarta lo físico (SpO₂, ECG, CO₂); después respiración guiada con vibración, anclaje en el presente, compañero opcional. Detección = sospecha, no diagnóstico. **Ilustrativo** | Katy |
| 10 | **Nutrición, hidratación y ejercicio** | Escaneo de comida, metas de calorías, calcio, vitamina D, sodio y agua; fatiga de menú; sesiones de ARED, T2 y CEVIS; aviso de "días sin carga" | Katy · Leo |
| 11 | **Salud femenina y diferencias por sexo** | Supresión menstrual, inventario de anticonceptivos, riesgo de coágulos, mareo al volver a la gravedad; tabla hombre/mujer. **Privado y sin juego** | Katy · Leo |
| 12 | **Juego cooperativo** | Jardín de la base, metas del equipo, puntos por cuidar al compañero; premia **registrar**, no tener "buenos números"; sin rankings; modo silencioso en días pesados | Katy · Leo |
| 13 | **Biblioteca de enfermedades y cuidados** | Fichas sin conexión: qué es, cómo se siente, qué hacer, cuándo es emergencia. Pérdida ósea, SANS, mareo espacial, cálculos renales, radiación, hipoxia, descompresión, infecciones, insomnio, ansiedad | Katy · Diana |
| 14 | **Cómo se muestra el riesgo** | Probabilidad con modelo (radiación) · margen contra la norma (hueso, nutrición) · nivel relativo (sueño, SANS, equipo). Siempre con una acción y el aviso "estimación, no diagnóstico" | Leo |

### 🔵 Visión (hoja de ruta)

| # | Módulo | Qué incluye | De quién |
|---|---|---|---|
| 15 | **Botiquín y medicamentos** | Inventario, caducidad contra la duración de la misión, quién toma qué | Katy |
| 16 | **Ambiente de la nave** | CO₂, temperatura y ruido cruzados con síntomas; si varias personas tienen síntomas a la vez → problema del ambiente | Katy · Fani |
| 17 | **Perfiles de entorno** | Nave, ISS, rover, base lunar, Marte: cambian gravedad, retraso y prioridades (p. ej. caminata espacial vs. estancia larga) | Fani · Katy |
| 18 | **Motor diagnóstico probabilístico** | Diferencial ordenado con priors de Crucian 2016, "¿de dónde sale este %?", "lo que no sé" | Julio |
| 19 | **Asistente de voz conversacional** | Local, sin internet, solo con contenido aprobado; no sustituye a un psicólogo | Fani |
| 20 | **Red tolerante a interrupciones (DTN)** | Bundle Protocol para guardar y reenviar cuando vuelva el enlace | Fani |
| 21 | **Pruebas cognitivas largas y de transición** | Misión cognitiva cada 2–4 semanas; prueba en cada cambio de gravedad | Leo |
| 22 | **Conexión con hardware real** | Capa de adaptadores: simulador, Hexoskin/Astroskin, reloj Bluetooth, sensores de la nave | Katy · Leo |

### Regla de tiempo del astronauta (Leo)

Todo junto no debe pedir más de **~8 minutos activos al día**. Lo demás se mide solo.
Si un módulo nuevo rompe ese presupuesto, se rediseña o se corta.

### 🔶 Cómo se presentan los 22 módulos

En el pitch **solo se muestran los 7 del núcleo**. Los 🟡 aparecen como pantallas de
diseño y los 🔵 en **una sola diapositiva de "visión"**. Mostrar los 22 al mismo nivel
haría parecer que el equipo no supo priorizar.

### Quién programa qué

Mismos 6 roles del [roadmap de Julio](../Julio/roadmap.md#5-roadmap-por-fases), con sus
puntos de corte.

| Rol | Módulos del núcleo | Si sobra tiempo (🟡) |
|---|---|---|
| **Datos y sintéticos** | 4 Radiación (DONKI) · generador de datos de la tripulación del §0.1 | 10 Nutrición y ejercicio (datos) |
| **Motor** | 2 Motor de prevención · reglas YAML · escalamiento | 14 Cómo se muestra el riesgo |
| **UI** | 1 Panel + Cuerpo EVA · 5 Reloj | 12 Juego cooperativo |
| **Emergencia y privacidad** | 3 Emergencias + buddy check · 6 Privacidad (panel público, candados) | 9 Pánico (ilustrativo) |
| **Ciencia y contenido** | Verificar los ⚠️ · protocolo RAD-01 · mapear reglas a riesgos de NASA | 11 Salud femenina · 13 Biblioteca |
| **Demo y pitch** | 7 Comunicación con Tierra (nota tardía) · guion · video · diapositivas | 8 Salud mental (pantallas) |

**Puntos de corte (de Julio):**
- **Gate T−9:** el arco de prevención (día 112 → 114) funciona de punta a punta. Si no,
  se recorta en este orden: 🟡 completos → buddy check → nota tardía. El arco de
  prevención y el evento solar son lo último que se toca.
- **Freeze T−4:** no entra nada nuevo. **Se entrega a T−4, no a T−0.**

---

## 7. Guion de demo (ajuste al de Julio, ~110 s)

1. **0:00–0:15** · "Un astronauta no puede preguntarle a Houston. La respuesta tarda hasta
   48 minutos ida y vuelta."
2. **0:15–0:35** · Check-in del día 112 + PVT-B en vivo. La figura humana marca el sueño
   en ■ ámbar.
3. **0:35–0:55** · Ámbar: *"Ninguna señal sola dispararía; las tres juntas, sí."*
4. **0:55–1:05** · Abrir el YAML: "Esto es auditable."
5. **1:05–1:15** · Día 114: cierra en verde. Llega la nota de Tierra con 41 min de
   antigüedad.
6. **1:15–1:40** · **Evento solar real:** ▲ rojo para todos → refugio → buddy check →
   "Mei no ha confirmado" → 4 de 4 a salvo. Mostrar el candado: la ubicación de Mei solo se
   compartió durante la emergencia.
7. **1:40–1:50** · Modo avión encendido toda la demo. Decirlo al final.

---

## 8. Cómo responde al reto

### Lo que pide la página del reto

| El reto pide o sugiere | Dónde está en EVA |
|---|---|
| Herramienta visual para que el astronauta **evalúe su propia salud** y reciba guía | Módulos 1, 2 y 5 |
| Indicadores: presión, FC, glucosa, temperatura, sueño, ánimo | Módulo 1 (los seis) |
| ¿Cuándo amerita atención de la tripulación o de Tierra? | Escalera de escalamiento (§2) y matriz (§4) |
| Figura humana clicable | Cuerpo EVA (módulo 1) |
| Gamificación, gráficas dinámicas, código de colores | Módulos 12 y 1; semáforo ●■▲ |
| Recordatorios dentro de la rutina | Módulo 5 |
| Distintos entornos (nave, estación, rover, Luna, Marte) | Módulo 17 |
| No suponer que el astronauta sabe todo | Biblioteca (módulo 13) y "¿por qué se mide esto?" |

Las **cinco preguntas del reto** (qué se mide, por qué, cómo lo afecta el vuelo, cuándo
actuar, cómo prevenir) están respondidas indicador por indicador en
[LAZO §7](Propuesta-LAZO-NASA-SpaceApps-2026.md#respuestas-a-las-preguntas-del-reto-indicador-por-indicador)
y en el [diccionario de datos de Julio](../Julio/diccionario-de-datos.md).

### Criterios de evaluación de Space Apps

| Criterio | Evidencia en EVA |
|---|---|
| **Impacto** | Autonomía médica donde la Tierra llega tarde + beneficio en la Tierra (§10) |
| **Creatividad** | Buddy check en el evento solar, privacidad por rol visible, nota de Tierra que llega tarde |
| **Validez** | Reglas auditables, ✅/⚠️ en cada dato, diapositiva de limitaciones (§9) |
| **Relevancia** | Tabla de arriba |
| **Presentación** | Demo de ~110 s en modo avión, maquetas de LAZO |

Premios que podemos buscar además: **Best Use of Data** (DONKI) y **Best Use of
Science** (validez y honestidad) ⚠️ verificar los nombres de categorías de 2026.

---

## 9. Limitaciones (diapositiva obligatoria)

Decirlas antes de que las pregunten sube la nota de validez.

| Limitación | Qué hacemos al respecto |
|---|---|
| **Los signos vitales son simulados.** Lo único real son los eventos solares de DONKI | El generador sigue la incidencia publicada (Crucian 2016) y los parámetros del escenario de Julio. Mostramos la solicitud (DAR) que haríamos para datos reales |
| **DONKI no da dosis en mSv** | Las dosis se presentan como simuladas; lo real es el evento, su instrumento y la latencia del aviso |
| **Los protocolos clínicos no están validados** | La demo usa un protocolo logístico (refugio). Desmayo y pánico van marcados como ilustrativos |
| **Hay pocos datos de mujeres astronautas** | Las diferencias por sexo son avisos, no diagnósticos; manda la línea base personal |
| **La línea base nunca se probó contra datos reales** | Los umbrales (z, días de cierre) son decisiones nuestras 🔶 y están en un YAML que el cirujano de vuelo puede ajustar |
| **La privacidad en tripulaciones de 4 es frágil** | No prometemos anonimato; usamos consentimiento y las reglas de acceso de NASA |
| **Sin hardware real** | Capa de adaptadores lista para Hexoskin/Astroskin y relojes Bluetooth (módulo 22) |

---

## 10. Beneficio en la Tierra

La CSA explica que los efectos del espacio en el cuerpo se parecen al envejecimiento
acelerado y al sedentarismo, y que esos hallazgos ayudan con osteoporosis, equilibrio,
problemas cardiovasculares y diabetes tipo 2 ✅ (recurso oficial del reto).

- **Comunidades rurales o remotas sin médico:** el mismo motor que decide sin conexión.
- **Bases antárticas, plataformas petroleras, submarinos, rescate:** tripulaciones
  pequeñas, aisladas y con comunicación intermitente.
- **Salud de la mujer** con poco acceso a atención.
- **Adultos mayores que viven solos:** el buddy system aplicado a familiares o vecinos,
  con la misma regla de "alertas sí, datos no".

---

## 11. Preguntas probables del jurado

Las cinco de [Julio](../Julio/roadmap.md#6-qa--las-cinco-preguntas-que-les-van-a-hacer),
más estas:

| Pregunta | Respuesta corta |
|---|---|
| **"¿Por qué se llama como la caminata espacial?"** | "EVA es Evaluación Vital Autónoma. Y antes de cada EVA, EVA te dice si estás listo." |
| **"En una tripulación de 4, ¿qué privacidad puede haber?"** | "Por eso no prometemos anonimato. Cada rol ve solo lo que necesita, el panel de pared solo muestra el estado y cada persona ve exactamente qué ven los demás de ella." |
| **"¿Y si el reloj se apaga en el buddy check?"** | "EVA distingue 'sin señal del reloj' de 'no responde' y avisa a la pareja con la hora de la última lectura." |
| **"¿Qué pasa si la persona miente en el check-in?"** | "Por eso el CMO ve tendencias, no el día a día, y el resto del monitoreo es pasivo." |
| **"¿Qué es real y qué es simulado?"** | "Reales: 51 eventos solares de NASA, su latencia y la incidencia de Crucian 2016. Simulados: los signos vitales, y lo decimos en pantalla." |
| **"¿Por qué 22 módulos?"** | "Construimos 7. El resto es la hoja de ruta, ordenada por prioridad." |

---

## 12. Decisiones del equipo (votación)

🗳️ **Formulario para votar en línea, con resultados en vivo:**
https://claude.ai/artifact/K5ZmVMpxAsD33TXarVKTY9
(Katy tiene que compartirlo con cada quien por correo, con permiso de **Editor**,
para que pueda votar).

📄 **Copia del formulario en el repo:** [decisiones-equipo.html](decisiones-equipo.html).
Se abre en cualquier navegador, pero sin conexión con los demás: cada quien vota,
presiona **"Copiar mis respuestas"** y pega el texto en el chat del equipo.

**Regla:** una decisión queda en **GO** cuando una opción tiene **más de la mitad de
los votos y al menos 3**. ⭐ = opción recomendada por esta propuesta.

Si alguien no puede usar el formulario, vota aquí: marca tu opción con tu nombre, por
ejemplo `- [x] Opción (Julio)`. Cuando una decisión quede en GO, se anota en la columna
**Resultado** de la tabla final.

### Producto

**1. Nombre del producto** · En NASA, EVA significa caminata espacial (§0).
- [ ] ⭐ EVA — Evaluación Vital Autónoma
- [ ] EVA, sin significado
- [ ] Otro nombre: ______

**2. Tripulación y contexto de la demo** · Tránsito a Marte, días 112–115 (§0.1).
- [ ] ⭐ Aprobar como está
- [ ] Cambiar nombres o roles
- [ ] Cambiar el contexto de misión

**3. Prioridad de la salud femenina** · Hoy es diferenciador 🟡 (§6).
- [ ] ⭐ Dejarla como diferenciador (pantalla de diseño si no da el tiempo)
- [ ] Subirla al núcleo (se programa sí o sí)

### Demo

**4. Emergencia principal** · El evento solar es logístico y usa datos reales; el desmayo
exige pasos clínicos sin validar (§5).
- [ ] ⭐ Evento de partículas solares
- [ ] Desmayo
- [ ] Las dos

**5. Evento real de DONKI** · 51 eventos SEP de 2024 en `Planeacion/Julio/datos`;
mediana de 17 min entre evento y alerta.
- [ ] ⭐ Uno con latencia cercana a la mediana (17 min)
- [ ] El del 9 de mayo de 2024 (alerta 1 min después)
- [ ] Que lo elija quien lleva datos

**6. Motor diagnóstico con porcentajes** · Priors de Crucian 2016 y "¿de dónde sale este %?".
- [ ] ⭐ Solo si pasamos el gate T−9
- [ ] Sí, en la demo pase lo que pase
- [ ] Fuera; solo diapositiva de visión

**7. Juego cooperativo** · Jardín de la base, sin rankings (módulo 12).
- [ ] ⭐ Pantalla de diseño
- [ ] Programarlo
- [ ] Fuera de la demo

### Privacidad

**8. Qué ve el comandante** (§4)
- [ ] ⭐ Apto / no apto, sin motivo
- [ ] Nada médico
- [ ] Lo mismo que la CMO

**9. Qué ve la CMO del ánimo** (§4)
- [ ] ⭐ Tendencia semanal (diaria con permiso)
- [ ] Check-in diario
- [ ] Nada sin permiso

### Técnico

**10. Plataforma**
- [ ] ⭐ PWA en TypeScript + React
- [ ] Otra: ______

**11. Límite de radiación en la interfaz** · Fuentes en conflicto (§13, pendientes).
- [ ] ⭐ 600 mSv con nota "verificar estándar vigente"
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
- [ ] Julio
- [ ] Katy
- [ ] Leo
- [ ] Otra persona: ______

**14. Hora de entrega interna** · Regla de Julio: freeze y entrega a T−4.
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

## 13. Pendientes antes de presentar

- [ ] ⚠️ Elegir **qué evento real de DONKI** usar en la demo (con fecha e instrumento).
- [ ] ⚠️ Límite de radiación de 600 mSv: hay un technical brief de NASA (OCHMO, basado en
      NASA-STD-3001) que lo da como límite único desde 2022 (ref. 31 de LAZO), pero
      Julio encontró fuentes en conflicto. Leer el documento completo y resolverlo.
- [ ] ⚠️ Pasos del protocolo RAD-01: verificar o marcarlos como ilustrativos.
- [ ] 🔶 Confirmar con el equipo la matriz de §4, sobre todo qué ve el comandante.
- [ ] 🔶 Decidir si "EVA — Evaluación Vital Autónoma" se queda.
- [ ] 🔶 Aprobar la tripulación y el contexto del §0.1, y pasar todo a ese contexto: las
      maquetas de LAZO dicen "Marte · Sol 2" y los escenarios de Julio dicen "MS-2".
- [ ] ⚠️ Verificar los nombres de las categorías de premios de 2026.

---

## Documentos de origen

- Diana: [Propuesta.md](../Diana/Propuesta.md)
- Fani: [Propuesta.docx](../Fani/Propuesta.docx)
- Julio: [comportamiento](../Julio/comportamiento-del-software.md) ·
  [motor diagnóstico](../Julio/motor-diagnostico.md) ·
  [diccionario](../Julio/diccionario-de-datos.md) ·
  [roadmap](../Julio/roadmap.md) ·
  [stack y DONKI](../Julio/stack-y-dependencias.md)
- Leo: [resumen.md](../Leo/resumen.md) · [síntesis (PDF)](../Leo/sintesis-investigacion.pdf)
- Katy: [Propuesta LAZO](Propuesta-LAZO-NASA-SpaceApps-2026.md) (53 referencias)
