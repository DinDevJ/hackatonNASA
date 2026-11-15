# Prompt para desarrollar el front de LUNA

Pégalo completo en un agente de código (Claude Code, Cursor, etc.) abierto en la raíz del repo
`hackatonNASA`. Está dividido en partes: contexto, estructura común, **los 22 módulos uno por
uno**, orden de construcción, reglas y criterios de aceptación.

---

```text
Eres el desarrollador front de LUNA, un software de monitoreo de salud para astronautas
(NASA Space Apps 2026, reto "Create Health Monitoring Software for Astronauts on Space
Missions"). Equipo Monarcas. La entrega es el domingo 15 nov 2026 a las 11:59 p.m.:
prioriza que el núcleo funcione de punta a punta antes que cualquier extra.

══════════════════════════════════════════════════════════════════════════════
PARTE 1 · CONTEXTO
══════════════════════════════════════════════════════════════════════════════

## 1.1 Lee esto antes de escribir código

1. Planeacion/Katy/ERS-LUNA.md → la especificación. Los IDs (RF-, RI-, RNF-, RS-) son la
   fuente de verdad.
2. Planeacion/Leo/maqueta-eva/ → la maqueta actual (index.html, estilos.css, luna.js,
   app.js, datos.js, demo.js) y su README. ES LA REFERENCIA VISUAL. Ábrela con un servidor
   estático y recórrela entera antes de empezar.
3. Planeacion/Katy/Propuesta-EVA.md §0.1, §7 y §8 → tripulación, matriz de privacidad y
   línea de tiempo del evento solar.
4. Planeacion/trama-base/README.md y Planeacion/Julio/codigo/TRAMA-TELEMETRIA.md → cómo
   entran los datos.
5. Planeacion/Julio/comportamiento-del-software.md §2–§8 → ciclo diario, escalamiento,
   tiempos SCET/OWLT y modo emergencia.
6. Planeacion/Julio/llm-local-y-voz.md §4–§5 → reglas del asistente.

Si dos documentos se contradicen, sigue el ERS y anótalo en tu reporte final. No inventes
lo que no esté escrito: pregunta.

## 1.2 Qué es LUNA

Cadena: Recabar → Organizar → Monitorear → Prevenir → Asistir en emergencias.
Tesis: el monitoreo diario existe para que, cuando pase lo malo, LUNA ya sepa cómo es esa
persona cuando está bien. Por eso todo se compara contra "tu normal" (línea base de 14 días).

## 1.3 Contexto de la demo (úsalo en todas las pantallas)

- Misión: tránsito a Marte, días 112 a 115. Retraso con Tierra: 18 min por trayecto.
- Tripulación y parejas del buddy system:
  | ID | Nombre | Rol | Sexo | Pareja |
  | MS-1 | Tomás | Comandante | H | Mei |
  | MS-2 | Ana | Especialista de misión (protagonista) | M | Luis |
  | MS-3 | Mei | CMO (Crew Medical Officer) | M | Tomás |
  | MS-4 | Luis | Ingeniero de vuelo | H | Ana |
- Línea base de Ana: FC en reposo 58 lpm, sueño 7 h 05, 2 lapsos en el PVT-B.

## 1.4 Plataforma

Una sola PWA en TypeScript + React (Vite), en `app/` en la raíz del repo. Funciona SIN RED.
No hay software de reloj: los datos entran por la trama (§1.6). Tres tamaños, misma base:

| Tamaño | Ancho | Papel |
| Celular | < 600 px | Lo que el astronauta trae en el bolsillo. Es lo que hoy hace la maqueta |
| iPad | 600–1024 px | Uso personal: check-in, PVT-B, protocolos, cámara |
| Laptop | > 1024 px | Panel completo, panel de pared público, vista de la CMO, Tierra |

## 1.5 Fidelidad a la maqueta de Leo (obligatorio)

Porta el diseño; no lo rediseñes.
- Paleta: #192584 azul profundo · #B541FA morado · #4FD2E9 cian · #FFFFFF · #74706D gris.
- Semáforo SIEMPRE con forma + color + texto: ● verde "en tu normal" · ■ ámbar "atención"
  · ▲ rojo "actúa ahora". Más dos estados neutros: ○ gris "sin dato" y ◌ "sin conexión".
- Avatar de luna (luna.js) como componente React: cara, accesorio, tamaño y fase. La fase
  sigue el estado global: llena = normal, menguante = alerta, casi nueva = emergencia.
- Tutoriales cortos (2–3 pasos) la primera vez en cada módulo; repetibles desde Ayuda.
- Etiquetas de procedencia en cada umbral: [A] NASA · [T] clínico · "tu normal". Al
  tocarlas se abre la fuente.
- Movimiento: ease-out < 300 ms, botones que se encogen al presionar, sin scale(0),
  respeta prefers-reduced-motion.
- Sin librerías de UI pesadas, sin fuentes ni CDNs externos. Sin logo ni insignias de NASA:
  usa el parche del equipo y el texto "proyecto para NASA Space Apps Challenge 2026".

Cambios obligatorios respecto a la maqueta:
- El producto se llama LUNA (la maqueta dice EVA). NO renombres `eva.ble.v1`,
  `eva.telemetry.v1` ni `EVA-SIM`: rompería código probado.
- Retraso con Tierra: 18 min (la maqueta dice 12).
- Selector de idioma español / inglés; todas las cadenas en archivos de traducción.
- El asistente se llama "Luna" mientras el equipo no decida otra cosa.

## 1.6 Datos: reutiliza, no reescribas

| Qué | Dónde | Cómo |
| Códec Bluetooth y condiciones en vivo | Planeacion/trama-base/trama.mjs, condiciones.mjs, simulador.mjs | Impórtalos tal cual (19/19 pruebas) |
| Trama lógica, validador, adaptadores | Planeacion/Julio/codigo/telemetry.ts, adapters.ts | Todo dato pasa por validarTrama() |
| Eventos solares reales | Planeacion/Julio/datos/donki-sep-2024-*.json | Cópialos a app/ como datos estáticos; nunca llames la API |
| Frases de voz | Planeacion/Julio/codigo/voz/frases.json y audio/ | speechSynthesis como respaldo |
| Reglas de varios días | Planeacion/Diana/viabilidad/reglas_diana.yaml | Pórtalas a TS; reproduce sus 30 casos |
| Datos simulados de la maqueta | Planeacion/Leo/maqueta-eva/datos.js | Punto de partida de la fuente sintética |

FuenteSintetica (RF-TR-03): 180 días para los 4 tripulantes, semilla fija, con los arcos:
- Día 112: FATIGA-03 de Ana (sueño z −2,4 · lapsos z +2,2 · FC en reposo z +2,0).
- Día 114: z < 2 dos días → verde, evento cerrado.
- Día 115, 11:04: evento solar modelado sobre el evento real 2024-05-11T02:10:00-SEP-001
  (GOES-P SEISS > 100 MeV, latencia 20 min).
Todo lo simulado se rotula como simulado en pantalla.

## 1.7 Motor (en app/src/motor/, con pruebas)

- Línea base móvil de 14 días: mediana y MAD por persona y variable.
- z robusto: z = 0,6745 · (x − mediana) / MAD.
- Reglas YAML + condiciones en vivo.
- Cada alerta devuelve: estado, señales causantes con valor y umbral, tipo de umbral,
  protocolo con pasos y fecha de reevaluación.
- Escalamiento: 0 autocuidado → 1 CMO → 2 cirujano de vuelo → 3 junta. Si el CMO es el
  paciente, salta al nivel 2 y avisa al comandante.
La UI nunca decide nada clínico: solo muestra lo que devuelve el motor.

══════════════════════════════════════════════════════════════════════════════
PARTE 2 · ESTRUCTURA COMÚN (el "marco" de todas las pantallas)
══════════════════════════════════════════════════════════════════════════════

## 2.1 Barra superior (siempre visible)

- Izquierda: "Día 112 · Tránsito a Marte" y reloj de nave (SCET).
- Centro: chip "Simulado" si hay datos simulados (siempre en la demo).
- Derecha: botón SOS rojo (abre M7 con un toque, sin confirmar), selector de idioma ES/EN.
- Control de demo (solo en modo demo o en laptop): "Viendo como: Ana ▾" para cambiar de
  rol (Ana, Luis, Mei CMO, Tomás comandante, cirujano de vuelo). Cambiar de rol aplica la
  matriz de privacidad (M13) a TODA la app.

## 2.2 Navegación por tamaño

| Celular | Barra inferior como la maqueta: Hoy · Check-in · Logros · Ayuda, más un botón flotante "+ Registrar" (M6) |
| iPad | Riel lateral: Hoy · Registrar · Check-in · Reflejos · Protocolos · Tripulación · Logros · Ayuda |
| Laptop | Barra lateral con 4 espacios: Mi panel · Panel de pared · CMO · Tierra, y debajo los mismos módulos del iPad |

## 2.3 Componentes compartidos (créalos primero)

- Semaforo (forma + color + texto) · EtiquetaProcedencia ([A]/[T]/tu normal, abre fuente)
- TarjetaIndicador (icono, nombre, valor, unidad, semáforo, "tu normal", procedencia)
- GraficaContraNormal (serie + banda de tu normal de 14 días; puntos fuera en color)
- Luna (avatar) y GloboLuna (globo de texto del asistente)
- Tutorial (2–3 pasos) · Paso (un paso por pantalla, botón grande "Hecho")
- Candado (indica dato privado y quién lo puede ver)
- ChipSimulado · ChipAntiguedad ("hace 41 min")
- Notificacion (sin texto médico en pantalla bloqueada)

══════════════════════════════════════════════════════════════════════════════
PARTE 3 · LOS MÓDULOS, UNO POR UNO
══════════════════════════════════════════════════════════════════════════════

Prioridad: 🔴 núcleo (tiene que funcionar) · 🟡 diferenciador (si da el tiempo; si no,
pantalla de diseño con datos fijos) · 🔵 visión (no se programa).
Cada módulo dice: para qué sirve, quién lo ve, qué muestra en cada tamaño, interacciones,
estados, datos, reglas, IDs del ERS y cuándo está terminado.

──────────────────────────────────────────────────────────────────────────────
M1 · INICIO Y CUERPO LUNA (el dashboard) 🔴
──────────────────────────────────────────────────────────────────────────────
Para qué: en 5 segundos, saber cómo estoy hoy y qué tengo que mirar.
Quién: cada astronauta ve lo suyo. (El estado de los demás está en M10.)

Qué muestra:
- Saludo + Luna con su globo: "Todo va bien, pero hay 2 cosas que vale la pena mirar hoy."
- Tarjeta de clima espacial (último evento de DONKI, abre M9).
- Tarjetas de alerta abiertas (abren M3), arriba de todo si hay ámbar o rojo.
- **Cuerpo LUNA:** figura humana neutra, de frente, con regiones clicables. Cada región se
  pinta con el PEOR estado de sus indicadores y lleva su forma (● ■ ▲) para no depender
  del color:
  | Región | Indicadores | Peligro HRP |
  | Cabeza (cerebro) | Ánimo, sueño, reflejos PVT-B, cefalea, somnolencia | Aislamiento y confinamiento |
  | Ojos | "Se revisa en Tierra (SANS)", sin dato a bordo | Gravedad |
  | Pecho: corazón | FC, FC en reposo, HRV, presión, ritmo | Gravedad |
  | Pecho: pulmones | SpO₂, frecuencia respiratoria, CO₂ que respira | Ambiente cerrado |
  | Abdomen | Glucosa, comida, agua, diarrea | Ambiente cerrado |
  | Riñones y vejiga | Tira de orina, densidad, agua | Gravedad |
  | Huesos y músculos | Fuerza, ejercicio (ARED, CEVIS, T2), dolor de espalda | Gravedad |
  | Piel | Temperatura de piel | Ambiente cerrado |
  | Todo el cuerpo (halo) | Dosis de radiación | Radiación |
  | Salud femenina | Solo aparece a ella y con candado; abre M15 | — |
  Al tocar una región se abre un panel con sus indicadores (TarjetaIndicador), el peligro
  del HRP y "¿por qué se mide esto en el espacio?".
- Mosaico de indicadores (como la maqueta): Corazón, Sueño, Presión, Temperatura, Ánimo,
  Glucosa, Comida, Síntomas, Fuerza. Los SEIS del reto (presión, FC, glucosa, temperatura,
  sueño, ánimo) siempre visibles.
- Botón "Check-in de 1 minuto" y racha de días.

Por tamaño:
- Celular: figura pequeña arriba (toca para ampliar) y mosaico debajo, en una columna.
- iPad: figura a la izquierda, mosaico a la derecha.
- Laptop: figura al centro, mosaico alrededor, gráficas de los 6 indicadores abajo.

Accesibilidad: la figura tiene una lista alternativa por regiones navegable con teclado.
Estados: sin dato (○), sin conexión (◌), simulado (chip).
ERS: RF-01-01 a 07, RI-UI-02, RI-UI-03.
Terminado cuando: tocar el corazón abre FC, HRV, presión y ritmo con semáforo y
procedencia; el día 112 la cabeza de Ana sale ■ ámbar.

──────────────────────────────────────────────────────────────────────────────
M2 · FICHA DE INDICADOR (Corazón, Sueño, Presión, Temperatura, SpO₂, Glucosa) 🔴
──────────────────────────────────────────────────────────────────────────────
Para qué: entender un indicador: dónde estoy contra mi normal y por qué importa.
Base: las pantallas Corazón y Sueño de la maqueta; replica su estilo para las demás.

Qué muestra:
- Valor actual grande, unidad, semáforo, etiqueta de procedencia.
- GraficaContraNormal de 14 días (y selector 7 d / 14 d / misión).
- "Tu normal": mediana y rango. Si el valor es estimado, su intervalo (nunca sin él).
- De dónde sale el dato (sensor, manual, estimado) y su nivel N0–N4.
- "¿Por qué se mide en el espacio?" (una frase) y qué cambia en vuelo.
- Umbral: [A] si existe; si no, [T] rotulado; si no, solo tu normal.
- Corazón: FC en vivo simulada, zonas, sesión de ejercicio (como la maqueta).
- Sueño: horas, semana, deuda de sueño, "¿cómo despertaste?", botones "me acuesto / me
  levanto" (la hora de despertar sale del botón: el sensor se equivoca ±86 min).
- SpO₂: aviso fijo "la de muñeca puede sobreestimar; confirma con el pulsioxímetro".
Por tamaño: celular una columna; iPad y laptop gráfica a la izquierda, explicación a la
derecha.
ERS: RF-01-03, RF-01-04, RI-UI-04, RS-06, RS-07, §5.2–5.4.
Terminado cuando: cada uno de los 6 indicadores del reto tiene su ficha con banda de tu
normal y procedencia.

──────────────────────────────────────────────────────────────────────────────
M3 · ALERTAS Y PROTOCOLOS (prevención) 🔴
──────────────────────────────────────────────────────────────────────────────
Para qué: el diferenciador. Una alerta no termina en un aviso: abre un protocolo con
seguimiento y cierre.

Qué muestra:
- Tarjeta de alerta: título ("Fatiga acumulada"), semáforo, frase del motor "Ninguna señal
  sola dispararía; las tres juntas, sí", aviso de impacto ("Caminata espacial en 36 h").
- Botón "¿Por qué?": las señales que la causaron, cada una con su valor, su z, su normal y
  su umbral (mini gráfica por señal).
- Botón "Ver la regla": muestra la regla tal como está escrita (YAML legible) con sus
  etiquetas [A]/[T]. Esto se enseña al jurado.
- Protocolo: lista de pasos con casillas, fecha de reevaluación, días restantes.
- Historial de la alerta: abierta → seguimiento diario → cerrada (verde) o escalada (rojo).
- Nivel de escalamiento actual (0, 1, 2, 3) y a quién se avisó.
Interacciones: aceptar protocolo, marcar pasos, posponer con motivo.
Estados: abierta, en seguimiento, cerrada, escalada.
Reglas: el criterio de cierre (z < 2 durante 2 días) se rotula 🔶 propuesta del equipo.
ERS: RF-02-04 a 08, RF-TR-05, RF-TR-06, CU-02.
Terminado cuando: el día 112 abre FATIGA-03 para Ana, el 113 muestra mejora y el 114
cierra en verde, y Tomás ve "apta".

──────────────────────────────────────────────────────────────────────────────
M4 · CHECK-IN DIARIO 🔴
──────────────────────────────────────────────────────────────────────────────
Para qué: lo que ningún sensor mide, en ~20 segundos.
Base: el check-in de la maqueta.
Qué muestra: 4 preguntas de un toque: ánimo, energía, estrés (0–100) y síntomas (lista
rápida). Una vez por semana agrega PHQ-2 + ítem 9 (abre M16 si hace falta). Al final, Luna
responde y suma la racha.
Reglas: premia registrar, no tener buenos números. Ítem 9 > 0 → alerta crítica (M16).
Por tamaño: igual en los tres; en laptop centrado en una tarjeta.
ERS: RF-08-01, RF-TR-02.
Terminado cuando: se completa en ≤ 20 s y sus respuestas entran a la línea base.

──────────────────────────────────────────────────────────────────────────────
M5 · PRUEBA DE REFLEJOS PVT-B 🔴
──────────────────────────────────────────────────────────────────────────────
Para qué: medir fatiga de forma objetiva; es una de las 3 señales de FATIGA-03.
Qué muestra: instrucciones de 1 pantalla → 3 minutos de estímulos aleatorios (un círculo
que aparece; tocar lo más rápido posible) → resultado: lapsos (≥ 355 ms), velocidad media
(1/RT) y comparación contra tu normal.
Por tamaño: mejor en iPad; en celular a pantalla completa; en laptop con barra espaciadora.
Reglas: si se interrumpe, no cuenta. Modo demo: versión de 20 s con resultado precargado.
ERS: RF-TR-01, `03:V65`.
Terminado cuando: el resultado del día 112 de Ana sale con lapsos z +2,2.

──────────────────────────────────────────────────────────────────────────────
M6 · REGISTRAR UNA MEDICIÓN (manual y cámara) 🔴
──────────────────────────────────────────────────────────────────────────────
Para qué: el reto pide entrada por teclado, clics y cámara.
Qué muestra: botón "+ Registrar" → lista: Presión · Glucosa (glucómetro de dedo) ·
Temperatura · Agua · Comida · Síntomas (dolor 0–10, cefalea, mareo; como la maqueta) ·
Masa corporal · Tira de orina (cámara) · Foto (manos, uñas, piel).
- Cada formulario: un dato por pantalla, teclado numérico, unidad fija, rango válido.
- Tira de orina: abrir cámara del iPad o celular → foto → resultado (densidad, proteína,
  leucocitos, nitritos) marcado "lectura experimental". Si la cámara no está disponible,
  subir una foto.
Reglas: proteína con orina concentrada no alarma sola (15,2 % de falsos positivos);
leucocitos + nitritos → sugerir CMO. Síntoma fuerte → sugerir CMO.
ERS: RF-TR-07, RF-TR-08, RF-10-10, §6.3.
Terminado cuando: registrar la presión la muestra en M1 con su semáforo.

──────────────────────────────────────────────────────────────────────────────
M7 · MODO EMERGENCIA 🔴
──────────────────────────────────────────────────────────────────────────────
Para qué: "un producto distinto dentro del mismo producto": segundos, no días; lo opera
un rescatista con estrés y manos ocupadas.
Base: el modo emergencia de la maqueta (ya hace hipoxia). Consérvalo y generalízalo.
Activación (3 vías): SOS un toque · automática (caída de SpO₂, FC extrema, caída) · por
un tercero ("¿Quién es el paciente?" con los 4 tripulantes).
Qué muestra:
- Fondo de emergencia, menú oculto, cronómetro T+ que no se detiene.
- Signos del paciente contra su normal ("Pulso 128 · 2,1× su normal").
- UN paso por pantalla, texto grande, sin scroll, botón "Hecho". Rótulo fijo
  "Ilustrativo: no es protocolo médico" en todo paso clínico.
- Registro automático sellado con SCET (nadie escribe).
- Aviso a la CMO, salvo que la CMO sea el paciente: entonces "Mei es la paciente: aviso
  al comandante y a Tierra".
- Paquete prioritario a Tierra (≈ 18 min).
- Clases: Evento solar (completa, ver M8) · Hipoxia (de la maqueta) · Descompresión,
  trauma y evento cardiaco como ilustrativas.
Por tamaño: igual en los tres; en laptop, además, la cronología a la derecha.
ERS: RF-03-01 a 08, RF-03-15 a 17, RS-02 a RS-04.
Terminado cuando: el SOS abre la emergencia en ≤ 1 s y todo paso queda sellado.

──────────────────────────────────────────────────────────────────────────────
M8 · EVENTO SOLAR, REFUGIO Y BUDDY CHECK 🔴 (la emergencia de la demo)
──────────────────────────────────────────────────────────────────────────────
Para qué: la historia principal de la demo. Protocolo logístico, no clínico.
Línea de tiempo (día 115):
- 11:04 · ▲ ROJO a pantalla completa en TODOS los dispositivos: "Dirígete al refugio
  blindado. Ahora." + tarjeta del evento real de DONKI (fecha, instrumento, latencia de
  20 min) rotulada "evento real usado como modelo".
- 11:05 · Protocolo RAD-01 un paso por pantalla (pasos rotulados ilustrativos o con fuente).
- 11:06 · Buddy check: en el celular de cada uno, "¿Tu pareja llegó al refugio?" con su
  nombre y dos botones: "Sí, está conmigo" / "No la veo".
- 11:07 · Luis confirma a Ana y Ana a Luis. Mei no confirma. A Tomás: "Mei no ha
  confirmado. Su iPad tiene conexión. Última ubicación: Módulo C." (ubicación simulada).
  Como Mei es la CMO: "nivel 1 sin cubrir".
- 11:09 · Mei llega. Contador "4 de 4 en el refugio" en todas las pantallas.
- 11:31 · Tasa normal, evento cerrado. Dosis del evento y de carrera actualizadas (M9).
- 11:32 · La caminata espacial de Ana sigue en pie.
Reglas: distinguir "sin conexión con el iPad de Mei" (◌) de "no responde" (▲). Si la
pareja también está afectada, la alerta pasa a todos. La ubicación de Mei se deja de
compartir al cerrar el evento (candado visible).
Por tamaño: celular = buddy check; iPad = protocolo; laptop = panel con los 4 y la
cronología.
ERS: RF-03-09 a 14, RF-04-01 a 05, RF-06-04, CU-03.
Terminado cuando: la secuencia completa corre sola en modo demo y a mano.

──────────────────────────────────────────────────────────────────────────────
M9 · RADIACIÓN Y DOSIS 🔴
──────────────────────────────────────────────────────────────────────────────
Para qué: saber cuánta dosis llevo y cuánto margen me queda.
Base: la tarjeta y el tutorial de clima espacial de la maqueta.
Qué muestra: tasa actual (µSv/h) con semáforo (> 54 ámbar [A]; ≥ 3000 refugio ⚠️), dosis
del evento contra 250 mSv [A], dosis de carrera contra 600 mSv [A] (igual para todos),
lista de eventos reales de DONKI (fecha, instrumento, latencia) y el dato "~95 % de los
eventos no se acercan a los límites".
Reglas: "dosis simulada: DONKI no da dosis" siempre visible. El comandante solo ve el
margen de cada uno, nunca la dosis ajena.
ERS: RF-04-01 a 08.
Terminado cuando: tras el evento, cada uno ve su dosis y Tomás solo los márgenes.

──────────────────────────────────────────────────────────────────────────────
M10 · TRIPULACIÓN Y PANEL DE PARED 🔴
──────────────────────────────────────────────────────────────────────────────
Para qué: ver de un vistazo cómo está la tripulación sin exponer datos médicos.
Qué muestra:
- Panel de pared (laptop, público): 4 tarjetas grandes con nombre, rol, ●■▲ y nada más;
  alertas del ambiente (CO₂, O₂, temperatura, radiación) arriba. Sin números ni
  diagnósticos. Pensado para verse a 2 metros.
- Vista de tripulación (celular e iPad): mi pareja del buddy system y su estado solo si es
  ▲ o no responde; los demás, apto / no apto si soy el comandante.
- Al tocar a alguien: solo lo que la matriz permite al rol actual (M13).
ERS: RF-01-05, RF-05-01, RF-06-01.
Terminado cuando: el panel de pared no muestra ningún dato médico y cambia en vivo con el
evento solar.

──────────────────────────────────────────────────────────────────────────────
M11 · VISTA DE LA CMO 🔴 (laptop e iPad)
──────────────────────────────────────────────────────────────────────────────
Para qué: la CMO atiende a bordo; ve lo clínico de todos.
Qué muestra: tabla de los 4 con sus indicadores y semáforo; alertas abiertas por persona
con su nivel de escalamiento; ánimo como TENDENCIA SEMANAL (diaria solo con permiso);
botón "Registrar evaluación" (hallazgo y conducta); botón "Consultar a Tierra" (encola en
M12); salud femenina con candado (solo con permiso o en emergencia).
Reglas: si la CMO es la paciente, su propia vista dice "nivel 1 sin cubrir".
ERS: RF-08-09, RF-TR-05, RF-TR-06, §6.5.
Terminado cuando: Mei ve la alerta de Ana con su evidencia y no ve el diario de nadie.

──────────────────────────────────────────────────────────────────────────────
M12 · COMUNICACIÓN CON TIERRA 🔴
──────────────────────────────────────────────────────────────────────────────
Para qué: mostrar por qué LUNA decide a bordo: Tierra siempre llega tarde.
Qué muestra:
- Cola de salida priorizada: rojos abiertos → ámbares → resúmenes diarios → series crudas.
  Cada paquete con su SCET y estado (en cola / enviado / recibido).
- Mensajes de Tierra: "Nota del cirujano de vuelo" con ChipAntiguedad ("escrita hace 41
  min, sobre datos del día 112"). Si a bordo ya hay una decisión más nueva, lo dice: "Esta
  nota es anterior al cierre del evento".
- Vista "cirujano de vuelo" (laptop, rol Tierra): nunca "estado actual"; siempre "estado
  al SCET X, recibido Y, antigüedad Z min", ordenado por SCET.
- Retraso actual: 18 min por trayecto, 36 ida y vuelta.
ERS: RF-07-01 a 06, RI-CM-01, RI-CM-02, CU-02.
Terminado cuando: el día 114 llega la nota con 41 min de antigüedad y no pisa el cierre.

──────────────────────────────────────────────────────────────────────────────
M13 · PRIVACIDAD: QUIÉN VE QUÉ 🔴
──────────────────────────────────────────────────────────────────────────────
Para qué: una nave es un lugar compartido; cada rol ve solo lo que necesita.
Qué muestra:
- La matriz del ERS §6.5 aplicada a TODA la app según el rol activo (§2.1).
- "Lo que ven de mí": por cada rol, exactamente lo que ve de mí.
- Registro de accesos: quién vio qué y cuándo.
- Permisos (✋) que el astronauta puede cambiar, con registro; los dos que NO se pueden
  desactivar (riesgo de hacerse daño, emergencia roja) se muestran sin interruptor.
- Candado en cada dato privado; desbloqueo de emergencia temporal con su hora de fin.
- Bloqueo automático del detalle a los 30 s.
Reglas: no prometer anonimato; texto "con 4 personas, quitar el nombre no basta".
ERS: RF-06-01 a 09, RNF-SEG-04.
Terminado cuando: cambiando de Ana a Tomás, el corazón de Ana deja de verse y aparece
"apta"; la ubicación de Mei solo aparece durante el evento solar.

──────────────────────────────────────────────────────────────────────────────
M14 · ASISTENTE LUNA (voz y globo) 🔴
──────────────────────────────────────────────────────────────────────────────
Para qué: decir en lenguaje humano lo que el motor ya decidió.
Qué muestra: el avatar con su fase y su globo en todas las pantallas; botón de voz;
panel de conversación con el aviso fijo "Soy un apoyo para registrar y ordenar lo que
sientes. No soy un psicólogo y no sustituyo al CMO".
Reglas:
- Solo redacta el veredicto del motor; usa las frases pre-sintetizadas; nunca inventa ni
  cambia un número.
- El humor se apaga solo en ámbar y rojo (se enseña en la demo).
- Crisis por regla: se detiene la conversación y aparece "Contacta al CMO ahora".
- Personalidad por tripulante en Ajustes (M21): formalidad, humor, verbosidad, voz, ritmo.
ERS: RF-19-01 a 07, RS-05.
Terminado cuando: al pasar a ámbar el tono cambia solo, y sin voz todo sigue funcionando.

──────────────────────────────────────────────────────────────────────────────
M15 · SALUD FEMENINA 🔴 (privado y sin juego)
──────────────────────────────────────────────────────────────────────────────
Para qué: un tema poco cubierto, tratado en serio.
Quién: solo la astronauta (Ana o Mei); los demás no ven ni que existe.
Qué muestra: registro del ciclo (última menstruación, duración, sangrado, regularidad),
fase estimada, supresión menstrual e inventario de anticonceptivos ("te alcanza para N
días de misión"), factores de riesgo de coágulos (visibles a la CMO solo con permiso o en
emergencia), aviso de mareo al volver a la gravedad, síntomas urinarios y ginecológicos.
Reglas: la fase ajusta la línea base de FC y HRV (evita falsas alarmas); diferencias por
sexo como avisos ("pocos estudios en mujeres"), no diagnósticos; fuera del juego.
ERS: RF-11-01 a 09.
Terminado cuando: con Tomás activo, el módulo no aparece en ningún lado.

──────────────────────────────────────────────────────────────────────────────
M16 · SALUD MENTAL Y DEL EQUIPO 🟡
──────────────────────────────────────────────────────────────────────────────
Qué muestra: tendencia de ánimo y estrés; PHQ-2 semanal + ítem 9; PHQ-9 si PHQ-2 ≥ 2 o
ítem 9 > 0; GAD-7; somnolencia KSS; carga NASA-TLX; horas de trabajo (crítico > 60 h a
la semana [A]); diario privado.
Reglas: puntuación por un sumador determinista, nunca por el asistente; ítem 9 > 0 →
alerta crítica a la CMO y a Tierra; la CMO ve tendencia semanal.
ERS: RF-08-02 a 09, CU-06.

──────────────────────────────────────────────────────────────────────────────
M17 · NUTRICIÓN, AGUA Y EJERCICIO (Comida, Glucosa, Fuerza) 🟡
──────────────────────────────────────────────────────────────────────────────
Base: las pantallas Comida, Glucosa y Fuerza de la maqueta; consérvalas.
Qué muestra: energía contra 3035 kcal [A] (+200 por hora de caminata espacial), agua
contra 32 mL/kg [A], sodio 1500–2300 mg, masa con alerta a −3,3 % [A], curva de glucosa
24 h (70–180 [T]) y glucómetro de dedo, ARED / CEVIS / T2, fuerza estimada (Epley,
rotulada "estimada") contra ≥ 80 % de la basal [A], minutos de ejercicio contra el plan.
ERS: RF-10-01 a 10.

──────────────────────────────────────────────────────────────────────────────
M18 · AMBIENTE DE CABINA 🟡
──────────────────────────────────────────────────────────────────────────────
Qué muestra: CO₂ (≤ 3 mmHg promedio de 1 h [A]), O₂ (mínimo 127 mmHg [A]), temperatura y
humedad (18–27 °C [A]), ruido, luz, tasa de dosis; alerta del ambiente para todos; "varias
personas con síntomas → posible causa del ambiente".
Datos: paquetes HABITAT de la trama; las condiciones ya existen en condiciones.mjs.
ERS: RF-16-01, RF-16-02, RF-03-13.

──────────────────────────────────────────────────────────────────────────────
M19 · BIBLIOTECA DE CUIDADOS 🟡
──────────────────────────────────────────────────────────────────────────────
Qué muestra: fichas sin conexión ordenadas por frecuencia real del modelo IMM de NASA
(insomnio 13,85 por misión, abrasión ocular 7,42, diarrea 3,53, barotrauma 3,28, cefalea
por CO₂ 2,15), cada una con qué es, qué hacer (ilustrativo) y su criterio "Contact
Surgeon"; buscador.
ERS: RF-13-01 a 03.

──────────────────────────────────────────────────────────────────────────────
M20 · LOGROS Y JUEGO COOPERATIVO 🟡 (pantalla de diseño, decisión 7)
──────────────────────────────────────────────────────────────────────────────
Base: Logros de la maqueta (parches de misión, racha).
Reglas: premia registrar, no tener buenos números; sin rankings; metas de equipo; los
demás solo ven "meta lograda / no lograda"; salud mental y femenina fuera del juego.
ERS: RF-12-01 a 04.

──────────────────────────────────────────────────────────────────────────────
M21 · AYUDA Y AJUSTES 🔴
──────────────────────────────────────────────────────────────────────────────
Base: Ayuda de la maqueta.
Qué muestra: repetir tutoriales, glosario simple (SCET, CMO, tu normal, [A]/[T]), idioma
ES/EN, personalidad del asistente, "qué es real y qué es simulado", aviso "LUNA no es un
dispositivo médico", créditos y fuentes.
ERS: RI-UI-06, RI-UI-08, RNF-USA-04.

──────────────────────────────────────────────────────────────────────────────
M22 · MODO DEMO 🔴
──────────────────────────────────────────────────────────────────────────────
Base: demo.js de la maqueta (dedo que toca, recorre solo).
Qué hace: recorre los días 112 → 115 sin intervención: check-in y PVT-B (112) → alerta
FATIGA-03 y "¿por qué?" → ver la regla → cierre en verde y nota de Tierra (114) → evento
solar con buddy check y "4 de 4" (115) → cambio de rol a Tomás ("apta"). Controles:
pausa, siguiente, reiniciar. Muestra "modo avión: sin red" al final.
Duración: versión larga ~2 min y versión de 30 s para el video.
ERS: RF-TR-04, §13.

──────────────────────────────────────────────────────────────────────────────
NO SE PROGRAMAN (🔵 o concepto)
──────────────────────────────────────────────────────────────────────────────
Botiquín, perfiles de entorno, motor diagnóstico probabilístico, DTN, pruebas cognitivas
largas, conexión con hardware real y el reloj LUNA Band. Como mucho, una pantalla de
"visión" en Ayuda con texto e imagen.

══════════════════════════════════════════════════════════════════════════════
PARTE 4 · ORDEN DE CONSTRUCCIÓN
══════════════════════════════════════════════════════════════════════════════

1. Esqueleto: Vite + React + TS estricto, PWA sin red, i18n, tokens, tres layouts, Parte 2.
2. M1 y M2 portando la maqueta (con presión, temperatura y ánimo).
3. Motor + FuenteSintetica + línea base; M1 deja de usar datos fijos.
4. M4, M5 y M3 → CU-02 (fatiga 112 → 114).
5. M12 (nota tardía) para cerrar CU-02.
   ── GATE: si CU-02 no funciona de punta a punta, no avances; termina el núcleo. ──
6. M7 y M8 + M9 → CU-03 (evento solar con buddy check).
7. M13 + M10 + M11 (roles, panel de pared, CMO).
8. M14, M6, M15, M21.
9. M22 (modo demo).
10. Si sobra tiempo: M17, M18, M16, M19, M20.

══════════════════════════════════════════════════════════════════════════════
PARTE 5 · REGLAS QUE NO SE NEGOCIAN (ERS §8)
══════════════════════════════════════════════════════════════════════════════

- LUNA avisa, no diagnostica. Cada aviso dice qué vio y de dónde sale el umbral.
- No inventes contenido clínico. Todo paso clínico va marcado "Ilustrativo" o con fuente.
- La SpO₂ de muñeca nunca es la única alerta.
- Un valor estimado nunca se muestra sin su incertidumbre.
- Los umbrales propios (🔶) se rotulan como propuesta.
- La crisis la dispara una regla, no el asistente.
- Notificaciones de pantalla bloqueada sin texto médico.
- Sin imágenes ni voces de menores de 18 años. Sin datos reales de personas.

══════════════════════════════════════════════════════════════════════════════
PARTE 6 · CALIDAD Y FORMA DE TRABAJAR
══════════════════════════════════════════════════════════════════════════════

- TypeScript estricto (strict, exactOptionalPropertyTypes, noUncheckedIndexedAccess).
- Pruebas: motor, línea base, reglas (los 30 casos de Diana), matriz de privacidad.
- Accesibilidad: botones ≥ 44 × 44 px, contraste, estado sin depender del color, teclado.
- Chrome y Edge completos; Safari del iPad todo menos Web Bluetooth.
- npm run build sin errores; la app abre con la red apagada.
- No subas claves, datasets descargados ni node_modules.
- Antes de programar, devuélveme un plan corto (pantallas, componentes, IDs del ERS) y
  espera mi visto bueno.
- Commits pequeños por paso. NO hagas push sin que te lo pida.
- No modifiques archivos de otros integrantes (Planeacion/Leo, Julio, Diana, trama-base):
  impórtalos o cópialos a app/.
- Al terminar cada paso, prueba en los tres tamaños y dime qué verificaste.

══════════════════════════════════════════════════════════════════════════════
PARTE 7 · CRITERIOS DE ACEPTACIÓN (ERS §13), EN MODO AVIÓN
══════════════════════════════════════════════════════════════════════════════

1. La app abre en celular, iPad y laptop.
2. Los 4 tripulantes tienen 14 días de línea base sintética.
3. El día 112 de Ana dispara FATIGA-03 con sus 3 señales y su porqué (M3).
4. Se puede abrir la regla y ver una etiqueta [A] con su fuente.
5. El día 114 cierra en verde y llega la nota de Tierra con su antigüedad (M12).
6. El evento solar del día 115 corre completo con buddy check y "4 de 4" (M8).
7. La ubicación de Mei se comparte solo durante la emergencia (M13).
8. El asistente cambia de tono al pasar a ámbar (M14).
9. Ningún paso clínico aparece sin "Ilustrativo".
10. Todo lo simulado está rotulado.

Reporte final: por módulo, qué IDs del ERS quedaron ✅, 🟡 o ⬜; cómo correrlo; y qué
contradicciones encontraste entre documentos.
```
