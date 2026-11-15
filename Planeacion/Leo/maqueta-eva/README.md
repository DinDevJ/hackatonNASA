# Maqueta LUNA con Luna — experiencia de las métricas

Maqueta interactiva de cómo el astronauta vive sus métricas de salud en la app **LUNA** (antes EVA),
acompañado de su asistente **Luna**. **Todos los datos son simulados**: todavía no recibe datos reales
ni del reloj.

## Nuevo en la pantalla Hoy: Cuerpo LUNA y lo que Luna ve

Integra en esta maqueta, con su mismo estilo, el panel de salud (módulo 1) que se hizo en `app/`.

| Qué | Dónde | Cómo funciona |
|---|---|---|
| **Cuerpo LUNA** realista | `cuerpo.js`, `cuerpo.css` | Figura de frente con volumen. **Cambia según el sexo de cada tripulante:** mujer (hombros más estrechos, cintura, cadera, pecho, pelo largo) u hombre (hombros y cuello más anchos, torso recto, pectorales, pelo corto) |
| Zonas que se tocan | `cuerpo.js` | Cabeza, ojos, corazón, pulmones, abdomen, riñones y vejiga, huesos y músculos, piel (sensor de muñeca) y un halo de radiación alrededor del cuerpo. Cada zona toma el peor estado de sus indicadores y lleva su forma: ● en tu normal · ■ atención · ▲ actúa ahora · ○ sin dato |
| Hoja de cada zona | `app.js` → `abrirRegion` | Sus indicadores con semáforo, procedencia y gráfica de 14 días, el peligro del HRP y "¿por qué se mide esto?" |
| Lista de zonas | `app.js` | La misma información sin la figura, navegable con teclado. "Salud femenina" solo aparece a ellas y con candado |
| **Lo que Luna ve hoy** | `motor.js` → `lunaDice` | Luna cuenta lo que miden los sensores contra tu normal: qué señales, con qué números, qué regla se cumplió y qué hacer. No diagnostica |
| Fichas | `app.js` → `ficha` | Presión, temperatura, ánimo, SpO₂ y respiración: valor, tu normal, gráfica, por qué, cómo se mide y umbral con su fuente. Corazón, Sueño y Glucosa ganan la tarjeta "contra tu normal" |
| Simulación | Hoy, arriba | Cambia de tripulante (Ana, Luis, Mei, Tomás) y de día (106–115) para recorrer el escenario |

### El escenario (ERS-LUNA)

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

## Luna

Asistente con **forma de luna**, sin manos ni pies. **Su fase refleja los signos vitales de la persona:**

| Fase | Halo | Significa |
|---|---|---|
| Luna llena | Cian | Todo en su normal |
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
