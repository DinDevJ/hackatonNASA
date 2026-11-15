# Maqueta LUNNA con Lunna — experiencia de las métricas

## Estructura de la app (Katy, 14 nov 2026)

Sobre el Cuerpo LUNNA, el motor y la Lunna flotante de Diana. Solo celular. Diseño unificado de
**glassmorfismo** en versión **clara** y **azul marino** (Ajustes → Apariencia), con **barra de
navegación flotante** abajo.

| Pestaña | Qué tiene |
|---|---|
| **Inicio** | Cuerpo LUNNA, avisos (fatiga, nota de Tierra, evento solar), check-in, datos del cuerpo y tu tripulación (con privacidad por rol) |
| **Registrar** | Comida, glucosa, presión, temperatura, agua, masa, síntomas, sueño, ejercicio, fuerza, mente (estrés, PHQ-9, KSS, diario), tira de orina y foto por cámara |
| **Ciclo** | Solo para ellas, privado y al estilo Clue: anillo del ciclo, semana, registro por categorías y lo que cambia en el espacio |
| **Reportes** | Resumen de alertas y protocolos, signos y tendencias, reflejos (PVT-B), radiación, Tierra, evento solar, vista CMO y logros. Lo desglosado va en el panel de escritorio |
| **Ajustes** | Simulación (persona y día), privacidad, Lunna, tema, notificaciones, ayuda y qué es real o simulado |
| **Lunna (botón flotante)** | Todo lo de IA: lo que ve hoy, cómo te monitorea, clima espacial, qué procesa, biblioteca y hablar |

Archivos nuevos: `modulos.js` (pantallas y panel de Lunna) y `tema.css` (diseño). Abrir una vista
directo: `?pantalla=ciclo`, `?persona=MS-1`, `?dia=115`, `?tema=oscuro`. Demo: `?demo`.

Maqueta interactiva de cómo el astronauta vive sus métricas de salud en la app **LUNNA** (antes EVA),
acompañado de su asistente **Lunna**. **Todos los datos son simulados**: todavía no recibe datos reales
ni del reloj.

## Consolas de escritorio: computadora central y base en Tierra (Leo, 15 nov 2026)

Las tres pantallas de LUNNA son de la misma serie: usan los mismos estilos (`estilos.css`, `cuerpo.css`,
`tema.css`), los mismos iconos, el mismo **Cuerpo LUNNA**, el mismo motor (`motor.js`), la misma
tripulación (Ana, Luis, Mei, Tomás) y el mismo escenario (días 106–115). El tema y el día se comparten
entre las tres (claves `eva:tema` y `eva:dia`).

| Pantalla | Quién la usa | Qué tiene |
|---|---|---|
| `index.html` · **teléfono** | Cada astronauta | La app de siempre. Ahora también recibe, como notificación, lo que mandan la central y la base |
| `central.html` · **computadora central** | La CMO (Mei), a bordo | El diseño del panel médico de Fani en el estilo de LUNNA: **Hoy** (misión, Lunna, tripulación con su cuerpo, avisos, ambiente, clima espacial, historial de advertencias y emergencias), **panel clínico** de cada tripulante (signos contra su normal, Cuerpo LUNNA con sus zonas, sueño y reflejos, metas, dosis, lo que Lunna le dijo, índice por padecimiento, intervención médica), **Estadísticas** (estado por día, lo que más pidió atención, avisos por misión) y **Enlace con Tierra** (cola priorizada, lo recibido y consultas a la base) |
| `base.html` · **base en Tierra** | El cirujano de vuelo | Casi igual a la central, pero solo con lo que llegó (siempre el pasado, con su SCET y su antigüedad). **Pronósticos**: mapa tripulación × 11 padecimientos con el índice de los pesos de Leo, qué suma cada variable y su tendencia a 3 días. **Mensajes**: avisos y advertencias a la nave con su recorrido (redactado → en camino → a bordo → acuse) |

Abrir (desde esta carpeta, `python -m http.server 8091`):

- Central: **http://localhost:8091/central.html** · panel de Ana: `central.html#tripulante/MS-2`
- Base: **http://localhost:8091/base.html** · pronósticos: `base.html#pronosticos`
- Con el backend de Julio corriendo: `http://localhost:8787/app/central.html` y `/app/base.html`

**Enlace con Tierra.** Sin backend, la central y la base se hablan por este mismo navegador
(`localStorage`, clave `lunna:enlace`) con el retraso de la luz: el escenario usa 18 min por trayecto y
la demo los recorre en 18 s (se cambia en *Enlace con Tierra*). Lo que manda la base llega a la central
y, como notificación, al teléfono de quien lo recibe; los avisos de la CMO llegan al teléfono al
instante. Con el backend, la base además manda el aviso por `POST /api/tierra/avisos` y el teléfono lo
recibe por `/api/stream`, como en la consola `/tierra` de Julio.

**Privacidad**, la misma matriz del teléfono (ERS §6.5): la CMO ve la tendencia semanal del ánimo; Tierra,
su puntuación y los signos como resumen diario; el diario y el ciclo solo con permiso.

**Índice por padecimiento** (`../modelo-pesos`): índice = Σ peso × puntos / máximo, con puntos 0–3 por
|z| contra su normal en la dirección fisiológica. 🔶 Decisiones nuestras: presión, SpO₂ y CO₂ usan los
umbrales del teléfono (atención → 2, alerta → 3); lo que no se mide a diario (síntomas, pulso irregular,
ortostatismo, fase circadiana) queda fuera y se muestra la cobertura; si falta la variable de mayor peso,
el índice sale **incompleto**; la tendencia a 3 días es una extrapolación lineal **ilustrativa**. No es
una probabilidad ni un diagnóstico.

### La central conectada al backend de Julio (y al PC del simulador)

Con el backend corriendo, **el PC de `/simulador` abre esta pantalla** (`/app/central.html`, mismo
origen) en una ventana como la del smartphone y la de Tierra: *Frontend* es la central y *Backend*, la
terminal del PC de siempre. `central-vivo.js` lee lo que la computadora central sabe de verdad y lo pinta
en bloques marcados **«En vivo · backend»**:

| Dónde | Qué muestra | De dónde sale |
|---|---|---|
| **Hoy** | Tripulación registrada, último valor de cada variable contra lo esperado, estado y alertas de LUNNA | `GET /api/tripulantes`, `/api/app/:tripulante`, `/api/alertas` |
| **Panel clínico** | Las variables de esa persona (último, mediana 24 h, esperado y banda, z, estado y motivo, días de misión, dispositivo), sus alertas y los avisos de Tierra que le llegaron | `GET /api/app/:tripulante` |
| **Enlace con Tierra** | Ventana, retraso, lo que hay en cola o en vuelo y los avisos entregados a bordo | `GET /api/enlace`, `/api/tierra/pendientes`, `/api/avisos` |

Se actualiza sola con los eventos `muestra`, `alerta`, `aviso`, `enlace` y `rechazo` de `/api/stream`
(como mucho una recarga cada 2 s) y con un sondeo cada 10 s. Si el backend no responde, la barra dice
**«Sin conexión con el backend»**, cada bloque explica el error y la hora del último dato, y se reintenta
cada 5 s. No inventa rutas ni datos: lo que el backend aún no ofrece (Cuerpo LUNNA, 14 días contra su
normal, índices, ambiente, clima espacial, estadísticas y los mensajes de la CMO, que siguen viajando
por `localStorage`) queda bajo el rótulo **«Escenario simulado · no viene del backend»**.
Prueba: `cd Planeacion/Julio/backend && npm test` (`test/central.test.ts`).

Archivos: `central-vivo.js` (datos en vivo del backend), `consola.css` y `consola.js` (piezas comunes), `central.js`, `base.js`, `iconos.js` (los
iconos del teléfono más los de las consolas) y `pesos.js` (lo genera `../modelo-pesos/generar_pesos.py`;
no se edita a mano). Las misiones de referencia de Estadísticas son las de Fani, con nombres ficticios.

## Nuevo en la pantalla Hoy: Cuerpo LUNNA y lo que Lunna ve

Integra en esta maqueta el panel de salud (módulo 1) que se hizo en `app/`.

| Qué | Dónde | Cómo funciona |
|---|---|---|
| **Cuerpo LUNNA**, lo primero de Hoy | `cuerpo.js`, `cuerpo.css` | Escáner azul marino estilo holograma médico: esqueleto tenue, **arterias con flujo**, **corazón anatómico** (aorta, vena cava, tronco pulmonar, coronarias) que late, pulmones con lóbulos, hígado, estómago, intestinos, riñones y vejiga. **Cambia según el sexo:** mujer (hombros más estrechos, cintura, cadera, pecho, pelo largo) u hombre (hombros y cuello más anchos, torso recto, pectorales, pelo corto) |
| Zonas que se tocan | `cuerpo.js` | Cabeza, ojos, corazón, pulmones, abdomen, riñones y vejiga, músculos, piel (sensor de muñeca) y halo de radiación. Cada zona lleva el peor estado de sus indicadores en su contorno y su marca: ● en tu normal · ■ atención · ▲ actúa ahora · ○ sin dato |
| **Zoom y panel tecnológico** | `app.js` → `abrirRegion` | Al tocar un órgano, la figura se acerca a él y la información sale de ese punto hasta cubrir la pantalla: visor del órgano, peligro del HRP, indicadores con semáforo, procedencia y gráfica de 14 días. Al cerrar, vuelve al cuerpo completo |
| Fila de zonas | `app.js` | La misma información sin la figura, navegable con teclado. "Salud femenina" solo aparece a ellas y con candado |
| **Lunna flotante** | `app.js` → `crearLunaFlotante` | Burbuja como AssistiveTouch: se arrastra, se pega al borde, se atenúa si no se usa y recuerda su lugar. Su cara y una insignia dicen cuántas cosas hay que mirar. Al tocarla abre **"Lo que Lunna ve hoy"**: qué señales, con qué números contra tu normal, qué regla se cumplió y qué hacer. No diagnostica |
| Letra | `estilos.css` | Sans técnica del sistema (Segoe UI Variable, SF Pro, Inter) y monoespaciada para los datos |
| Fichas | `app.js` → `ficha` | Presión, temperatura, ánimo, SpO₂ y respiración: valor, tu normal, gráfica, por qué, cómo se mide y umbral con su fuente. Corazón, Sueño y Glucosa ganan la tarjeta "contra tu normal" |
| Simulación | Hoy, arriba | Cambia de tripulante (Ana, Luis, Mei, Tomás) y de día (106–115) para recorrer el escenario |

### El escenario (ERS-LUNNA)

| Día | Qué pasa |
|---|---|
| 112 | **FATIGA-03 de Ana**: sueño z −2,4, lapsos del PVT-B z +2,0 y pulso en reposo z +2,2. Ninguna sola dispararía (todas bajo \|z\| 3); las tres juntas sí. Cabeza y corazón en ■ |
| 113 | "Vas mejorando": las señales bajan; el aviso sigue abierto |
| 114 | Dos días con z < 2: el aviso se cierra en ● verde |
| 115 | Evento de partículas solares, modelado sobre el evento real de DONKI 2024-05-11T02:10:00-SEP-001 (aviso 20 min después). ▲ rojo para todos |
| Siempre | Luis en ■ por presión 130–139 (umbral AHA [T]) |

Reglas del motor (`motor.js`): tu normal = 14 días anteriores (mínimo 7), z robusto, variación mínima
creíble por indicador; una señal sola pide atención con |z| ≥ 3; tu normal nunca da rojo por sí sola.

Pruebas: `node --test Planeacion/Leo/maqueta-eva/motor.test.mjs` (11 pruebas).

## Abrir

```bash
cd Planeacion/Leo/maqueta-eva
python -m http.server 8091
```

- App: **http://localhost:8091**
- Demo automática (un día completo, ~3 min): **http://localhost:8091/?demo** (o *Ayuda → Ver demo automática*)
- Emergencia: botón rojo **SOS** arriba a la derecha, siempre visible.

Funciona sin internet: no usa librerías ni fuentes externas. En escritorio se ve dentro de un marco de
teléfono; en el móvil, a pantalla completa.

## Lunna

Asistente con **forma de luna**, sin manos ni pies. **Su fase refleja los signos vitales de la persona:**

| Fase | Halo | Significa |
|---|---|---|
| Lunna llena | Cian | Todo en su normal |
| Gibosa / cuarto | Ámbar | Algo se aleja de su normal (cada alerta la hace menguar) |
| Casi nueva | Rojo pulsante | Emergencia |

Encima se dibuja su carita (11 emociones) o un icono de estado (`radiacion`, `latido`, `escaneo`).

```js
const luna = LUNA.crear(elemento, { cara: "tranquila", accesorio: "corazon", tam: 88 }); // sigue la fase global
luna.poner("radiacion");
LUNA.ponerFase(0.4);               // todas las Lunas cambian de fase
LUNA.crear(otro, { fase: 0.05 });  // o una fase propia
```

## Modo emergencia (simulación)

Sigue el diseño de Julio (`../../Julio/comportamiento-del-software.md` §8):

- **Activación:** botón **SOS** siempre visible (un toque, sin confirmación) y **automática** cuando cae la SpO₂.
- **Escenario simulado:** hipoxia (riesgo que NASA rastrea). SpO₂ 97 → 84 %, pulso 62 → 128 lpm,
  respiración 14 → 26, presión 116/74 → 94/60. **La luna mengua hasta casi nueva** mientras caen los signos.
- Cada valor se muestra **contra su normal** ("pulso 2,1× su normal").
- Cronómetro **T+**, **aviso al médico de a bordo (Mei)**, paquete prioritario a Tierra y **registro automático sellado**.
- **Un paso por pantalla**, texto grande, sin menú. Los pasos están marcados **"Ilustrativo: no es
  protocolo médico"**: el contenido clínico real no se inventa.
- Al completar los pasos, los signos se recuperan y la luna vuelve a crecer.

## Secciones (variables de Leo)

| Sección | Variables | Qué se puede hacer |
|---|---|---|
| Hoy | resumen | Parche del equipo, mosaico con semáforo, aviso de **clima espacial** |
| Corazón | 02:V52, V53 | FC en vivo simulada, zonas, sesión de ejercicio |
| Sueño | 03:V30–V37, V43 | Horas, semana, deuda de sueño, "¿cómo despertaste?" |
| Comida | 02:V79–V85, V93 | Agregar comida con iconos, meta de 3035 kcal, sodio con zona meta |
| Glucosa | 02:V92, V86 | Curva de 24 h con rango 70–180, glucómetro de dedo |
| Síntomas | 02:V58, V67a · 03:V82–V83 | Dolor 0–10, cefalea, mareo; sugiere al médico si es fuerte |
| Fuerza | 02:V44, V43 | Fuerza estimada (Epley) contra la meta de NASA 1,6× el peso |
| Check-in · Logros · Ayuda | — | Check-in de 1 minuto, parches de misión, tutoriales |

## Sobre el logo de NASA

**No se usa.** NASA indica que su insignia, logotipo e identificadores *"are not in the public domain"*
y que su uso *"is protected by law"* ([nasa.gov/nasa-brand-center](https://www.nasa.gov/nasa-brand-center/images-and-media/)).
Ponerlo en la pantalla de una app sugiere que NASA la respalda. En su lugar hay un **parche original del
equipo** (luna + mariposa monarca) y el texto factual *"proyecto para NASA Space Apps Challenge 2026"*.

## Principios

- Tutoriales cortos (2–3 pasos) la primera vez que se abre cada sección; se repiten desde Ayuda.
- Etiquetas de umbral: **NASA** (oficial) o **Tierra** (clínico terrestre, no validado en el espacio).
- No diagnostica: si algo es fuerte, sugiere al médico de a bordo.
- Premia el hábito, no el resultado.
- Movimiento según las guías de Emil Kowalski (*ease-out* < 300 ms, botones que se encogen al presionar,
  sin `scale(0)`) y respeta *reduced motion*.

Paleta: `#B541FA` morado · `#4FD2E9` cian · blanco · `#192584` azul profundo · `#74706D` gris.

## Archivos

`index.html` · `estilos.css` · `luna.js` (avatar y fases) · `datos.js` (datos simulados con semilla fija) ·
`app.js` (pantallas, tutoriales, emergencia) · `demo.js` (demo automática).

## Conectada al backend de EVA (notificaciones de Tierra)

Con el backend corriendo (`cd Planeacion/Julio/backend && npm start`), la app se sirve en
**http://localhost:8787/app/** y también se abre al tocar el smartphone en el simulador
(`/simulador`, pestaña *Frontend*; *Backend* muestra la terminal del teléfono).

`notificaciones.js` escucha los avisos y las alertas que el cirujano de vuelo manda desde la
consola de Tierra (`/tierra`) y, cuando llegan a bordo, los muestra como notificación del
teléfono: arriba, sobre la app, con vibración si el equipo la tiene. Las alertas rojas se quedan
hasta descartarlas; las demás se van solas. Un toque abre el texto completo; el segundo, la
pantalla de Tierra.

- La ve la persona activa si el mensaje es para ella o para toda la tripulación; la CMO ve todos.
- Abierta sola con `python -m http.server`, no hay backend y este archivo no hace nada.
