# 03 · Manual de usuario

> Todos los datos de la tripulación que muestran las pantallas son **sintéticos**. Ninguna pantalla debe usarse para diagnosticar, tratar ni autorizar decisiones médicas. Los umbrales son provisionales.

## 1. Introducción

LUNNA tiene cuatro pantallas de misión, que se sirven desde la computadora central. Hay además dos consolas técnicas, un simulador visual y una aplicación independiente de análisis (el prototipo de salud).

| Pantalla | Quién la usa | Dirección |
|---|---|---|
| **Teléfono** de la tripulación | Cada astronauta | `/app/` |
| **Computadora central** | La CMO (oficial médica de a bordo; en la demo, Mei) | `/app/central.html` |
| **Base en Tierra** | El cirujano de vuelo | `/app/base.html` |
| **Reloj** | Cada astronauta | `/reloj/` |
| Consola de control de misión | Tierra (técnica) | `/tierra` |
| Panel del enlace de la nave | Técnico | `/nave` |
| Simulador visual de la nave | Demostración, solo en modo simulación | `/simulador` |
| Prototipo de salud (Streamlit) | Análisis de modelos y padecimientos | `http://localhost:8501` |

## 2. Requisitos para utilizarlo

- Un navegador moderno. Las interfaces no usan librerías ni fuentes externas y funcionan sin internet.
- El backend en marcha. Para la demostración completa: `cd Simulacion` y `npm start` (ver [instalación](README_09_INSTALACION_CONFIGURACION_DESPLIEGUE.md)).
- **No hay inicio de sesión.** El sistema no tiene cuentas ni contraseñas. La persona activa se elige en las propias pantallas (ver §4).

## 3. Modos de funcionamiento

| Cómo se abre | Modo | Qué se ve |
|---|---|---|
| `cd Simulacion` y luego `npm start` | **Simulación** | Todo, con el escenario sintético. Un distintivo amarillo, abajo a la izquierda, dice **«Simulación · datos sintéticos»** |
| `cd Sistema/backend` y luego `npm start` | **Operativo** | No se carga el escenario. Teléfono, base y reloj muestran el aviso **«Modo operativo»**, porque todavía se dibujan con el escenario. La central solo muestra sus bloques en vivo. `/simulador` responde 404 |
| Doble clic en `Sistema/interfaces/eva/index.html`, `central.html`, `base.html` o `Sistema/interfaces/reloj/index.html` | Simulación, sin backend | La maqueta con el escenario local, sin datos en vivo |

## 4. Navegación del teléfono (`/app/`)

En escritorio se ve dentro de un marco de teléfono; en el móvil ocupa toda la pantalla. La barra de navegación flotante está abajo.

| Pestaña | Contenido |
|---|---|
| **Inicio** | Cuerpo LUNNA, avisos (fatiga, nota de Tierra, evento solar), check-in, datos del cuerpo y tu tripulación (con privacidad por rol) |
| **Registrar** | Comida, glucosa, presión, temperatura, agua, masa, síntomas, sueño, ejercicio, fuerza, mente (estrés, PHQ-9, KSS, diario), tira de orina y foto por cámara |
| **Ciclo** | Solo para tripulantes mujeres, privado: anillo del ciclo, semana, registro por categorías |
| **Reportes** | Alertas y protocolos, signos y tendencias, reflejos (PVT-B), radiación, Tierra, evento solar, vista CMO y logros |
| **Ajustes** | Simulación (persona y día), privacidad, Lunna, tema claro/azul marino, notificaciones, ayuda y qué es real o simulado |
| **Lunna** (botón flotante) | Lo que Lunna ve hoy, cómo te monitorea, clima espacial, biblioteca y hablar |

**Parámetros de dirección útiles:**

| Parámetro | Ejemplo | Efecto |
|---|---|---|
| `persona` | `/app/?persona=MS-1` | Abre como otro tripulante |
| `dia` | `/app/?dia=115` | Abre en otro día del escenario (106–115) |
| `pantalla` | `/app/?pantalla=ciclo` | Abre una pestaña directamente |
| `tema` | `/app/?tema=oscuro` | Tema azul marino |
| `demo` | `/app/?demo` | Demo automática de un día completo (~3 min) |

Persona, día y tema se comparten entre teléfono, central, base y reloj abiertos desde el mismo origen (claves `eva:persona`, `eva:dia`, `eva:tema`).

## 5. Visualización de la información fisiológica

### 5.1 Cuerpo LUNNA

Es la figura de escáner que aparece primero en Inicio. Las zonas que se pueden tocar son cabeza, ojos, corazón, pulmones, abdomen, riñones y vejiga, músculos, piel y el halo de radiación. Al tocar una, la figura se acerca y se abre un panel con:

- el visor del órgano;
- el peligro del HRP asociado;
- los indicadores con su semáforo;
- la procedencia del dato;
- una gráfica de 14 días.

### 5.2 Fichas de indicadores

Cada ficha muestra el valor, **tu normal** (los 14 días anteriores), la gráfica, el porqué del estado, cómo se mide y el umbral con su fuente. Las etiquetas indican **NASA** (oficial) o **Tierra** (clínico terrestre, no validado en el espacio).

### 5.3 Interpretación de estados

El estado siempre se indica con forma y color, nunca solo con color.

| Símbolo | Estado | Significado |
|---|---|---|
| ● | En tu normal | Dentro de lo esperado para ti |
| ■ | Atención | Algo se aleja de tu normal o cruza un umbral de atención |
| ▲ | Actúa ahora | Alerta prioritaria |
| ○ | Sin dato | No hay medición vigente |

Reglas de la maqueta: una señal sola pide atención con |z| ≥ 3; varias señales con |z| ≥ 2 a la vez también la piden, como en el episodio FATIGA-03. Tu normal nunca da rojo por sí sola.

### 5.4 Fase de Lunna

| Apariencia | Significa |
|---|---|
| Luna llena, halo cian | Todo en su normal |
| Gibosa o cuarto, halo ámbar | Algo que revisar |
| Casi nueva, rojo pulsante | Alerta prioritaria / emergencia |

La burbuja flotante se puede arrastrar, se pega al borde y recuerda su posición. Al tocarla se abre «Lo que Lunna ve hoy»: qué señales, con qué números contra tu normal, qué regla se cumplió y qué conviene hacer. **Lunna avisa; no diagnostica.**

## 6. Computadora central (`/app/central.html`)

| Sección | Contenido |
|---|---|
| **Hoy** | Misión, Lunna, tripulación con su cuerpo, avisos, ambiente, clima espacial, historial de advertencias y emergencias |
| **Panel clínico** (`#tripulante/MS-2`) | Signos contra su normal, Cuerpo LUNNA, sueño y reflejos, metas, dosis, índice por padecimiento, intervención médica |
| **Estadísticas** | Estado por día, lo que más pidió atención, avisos por misión |
| **Enlace con Tierra** | Cola priorizada, lo recibido y consultas a la base |
| **Semáforo** (`#semaforo`) | Los 20 padecimientos del motor Python: color, detalle de las variables que lo movieron y pesos editables. Es distinto del índice por padecimiento del panel clínico (11 malestares, pesos de Leo) |

Los bloques marcados **«En vivo · backend»** muestran datos reales del backend: tripulantes, último valor contra lo esperado, alertas de LUNNA y estado del enlace. Lo que el backend aún no ofrece aparece bajo el rótulo **«Escenario simulado · no viene del backend»**.

Acciones disponibles:
- **Enviar a …**: aviso de la CMO al teléfono de un tripulante (`POST /api/abordo/avisos`). Llega sin retraso.
- **Consultar a Tierra**: consulta que baja por el enlace (`POST /api/central/consultas`).

En la vista del Semáforo, debajo de la lista de padecimientos, está la tarjeta **Analizar con modelos** (PR [#13](https://github.com/DinDevJ/lunna/pull/13)). Sale plegada y recuerda si se dejó abierta (almacenamiento local `eva:sm-mod-abierto`). Desde ahí se lanza un análisis de eco o de ECG (`POST /api/modelos/analizar`) sobre una muestra de la carpeta de muestras, con la marca SIMULADO cuando corresponde. **No es un diagnóstico.**

## 7. Base en Tierra (`/app/base.html`)

Muestra solo lo que ya llegó, siempre con su SCET (hora del evento a bordo) y su antigüedad.

- **Pronósticos** (`#pronosticos`): mapa tripulación × 11 padecimientos con el índice ponderado de la matriz de pesos, qué suma cada variable y una tendencia a 3 días. La tendencia es **ilustrativa**; el índice **no es una probabilidad**.
- **Mensajes**: avisos y advertencias a la nave con su recorrido (redactado → en camino → a bordo → acuse).

Es **intencional** que Tierra vea el pasado: los mensajes viajan con el retardo del enlace (18 min por trayecto en el escenario de la maqueta; 20 s por defecto en el backend de la demo).

## 8. Reloj (`/reloj/`)

| Pantalla | Contenido |
|---|---|
| Carátula | Hora, día de misión y Lunna con el estado de la persona |
| Ritmo cardiaco | Pulso en vivo y gráfica de 40 s; pulso en reposo contra su normal |
| Oxígeno (SpO₂) | Anillo de 80 a 100 %, con aviso de que la SpO₂ de muñeca puede sobreestimar |
| Temperatura | De piel, 14 días contra su normal |
| Sueño | Horas de anoche y últimas 7 noches |
| Estado de ánimo | Bajo / normal / intermedio / alto (0–100: < 25 · 25–49 · 50–74 · ≥ 75) |
| Más signos | Respiración, HRV, ejercicio, agua, dosis de radiación |
| Lo que Lunna ve | Resumen y qué conviene hacer |

La carita de Lunna cambia según el estado: **bien** (feliz), **mal** (preocupada), **crítico** (alerta; la pantalla parpadea en rojo) y **dormido** (de 23:00 a 07:00, si no hay nada crítico).

Con el backend, el pulso y la SpO₂ «ahora» llevan la marca **EN VIVO**. Si no llega una lectura en 20 s, el reloj vuelve al valor simulado y lo indica. `/reloj/?embebido` muestra solo el reloj, sin el panel de simulación.

## 9. Simulador visual (`/simulador`)

Solo existe en modo simulación. Muestra la astronauta, sus dispositivos, el PC central y la Tierra. Al hacer clic en un objeto se abre su ventana:

| Objeto | Pestaña *Frontend* | Pestaña *Backend* |
|---|---|---|
| Smartphone | El teléfono (`/app/`) | La terminal del teléfono |
| PC | La central (`/app/central.html`) | La terminal del PC |
| Tierra | La base (`/app/base.html`) | La terminal de Tierra |
| Reloj | El reloj (`/reloj/?embebido&persona=MS-2`) | La terminal del reloj |

Al pasar a «En vivo», el simulador acorta la ventana de LUNNA a 5 min y lo anuncia, para que una anomalía se vea en minutos. El comando `modo mision` en la terminal del PC la devuelve a 24 h.

Ejemplo práctico: con «▶ En vivo», escribe `hipoxia 12` en la terminal del reloj y la SpO₂ baja en la carátula.

## 10. Procedimientos habituales

**Recorrer el escenario de la demostración**

1. Arranca en modo simulación y abre `/app/`.
2. En Ajustes → Simulación elige a **Ana** y el **día 112**: aparece el episodio sintético FATIGA-03 (sueño z −2,4, lapsos del PVT-B z +2,0, pulso en reposo z +2,2).
3. Pasa a los **días 113–114**: mejoría y cierre del aviso.
4. Abre el **día 115**: evento solar modelado sobre DONKI `2024-05-11T02:10:00-SEP-001` y ▲ para toda la tripulación.
5. Revisa a **Luis**: siempre aparece con ■ por presión 130–139 mmHg (umbral AHA [T]).

**Emergencia ilustrativa**

El botón rojo **SOS** (arriba a la derecha) inicia, sin confirmación, la secuencia de demostración:

1. caen los signos (hipoxia simulada: SpO₂ 97 → 84 %);
2. arranca el cronómetro T+;
3. se avisa a la CMO;
4. sale un paquete prioritario a Tierra;
5. queda un registro sellado.

Con el backend, se registra en `POST /api/emergencias`. Los pasos están marcados **«Ilustrativo: no es protocolo médico»**.

**Mandar un aviso de Tierra**

En `/tierra` o en la base, redacta un aviso. Llega al teléfono del destinatario como notificación después del retardo del enlace. Las alertas rojas se quedan hasta descartarlas; las demás se van solas.

## 11. Prototipo de salud (Streamlit)

Barra lateral → **Vista**:

- **Modelos y sensores** (secciones 0–7): ejecutar adaptadores de eco y ECG, importar sensores CSV/JSON, comparar modelos.
- **Padecimientos**: elige una persona. Las de la tripulación sintética llevan el rótulo **SIMULADO**. «Ver» abre el detalle: ligas, peso, nivel de evidencia, fuente, cálculo paso a paso y por qué ese color.
- **Configuración**: edita umbrales, pesos y `prior_de`. Los cambios quedan marcados «modificado por el usuario» y no tienen fuente. «Restaurar valores con fuente» los deshace.

Lectura del semáforo: **VERDE** significa «sin desviaciones en lo medido, con cobertura suficiente», no «sano». **GRIS** significa «no hay con qué opinar». No se muestra ningún porcentaje de probabilidad.

## 12. Mensajes de error y soluciones

| Mensaje o síntoma | Causa | Solución |
|---|---|---|
| `npm error enoent Could not read package.json` | `npm start` ejecutado en una carpeta sin `package.json` (por ejemplo, `Sistema/`) | Usar `Simulacion/` o `Sistema/backend/` |
| `✗ El puerto 8787 ya está en uso` | Otro backend sigue corriendo | Ctrl+C en su terminal y volver a arrancar |
| «Modo operativo» en teléfono, base o reloj | Backend arrancado desde `Sistema/backend` | Para ver el escenario: `cd Simulacion` y `npm start` |
| `/simulador` → «sólo disponible en modo simulación» | Modo operativo | Ídem |
| «Sin conexión con el backend» en la central | El backend no responde | La central reintenta cada 5 s; comprobar que el backend esté en marcha |
| El reloj muestra el valor simulado en lugar de EN VIVO | No llegó lectura en 20 s | Comprobar que el simulador esté «En vivo» |
| Pantallas sin datos al abrir con `python -m http.server` | No hay `config.js` y no se asume simulación | Abrir desde el backend o con doble clic |

## 13. Privacidad

- La persona ve sus datos personales y su diario.
- La CMO ve la tendencia semanal del ánimo y lo necesario para la misión.
- Tierra recibe la puntuación del ánimo y los signos como resumen diario.
- El diario y el ciclo solo se comparten con permiso.

La privacidad la aplica la interfaz; **el backend no implementa control de acceso** (ver [seguridad](README_10_SEGURIDAD_CONFIABILIDAD_RIESGOS.md)).

## 14. Recomendaciones de uso

- Lee siempre los rótulos «Simulación», «En vivo · backend» y «Escenario simulado».
- Recuerda que las consolas pueden mostrar información anterior a la situación actual de la nave.
- No interpretes el índice por padecimiento ni el semáforo como diagnóstico ni como probabilidad.
- La SpO₂ de muñeca no debe ser la única señal de hipoxia.

## Documentación relacionada

- [Instalación, configuración y despliegue](README_09_INSTALACION_CONFIGURACION_DESPLIEGUE.md)
- [Arquitectura del sistema](README_04_ARQUITECTURA_SISTEMA.md)
- [Modelos computacionales y algoritmos](README_06_MODELOS_COMPUTACIONALES_ALGORITMOS.md)
- [Diccionario de datos y variables](README_07_DICCIONARIO_DATOS_VARIABLES.md)
