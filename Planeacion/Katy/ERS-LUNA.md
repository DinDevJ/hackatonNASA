# ERS · Especificación de Requisitos de Software de Lunna

Equipo Monarcas · NASA Space Apps 2026 · reto *Create Health Monitoring Software for
Astronauts on Space Missions*

| Campo | Valor |
|---|---|
| Producto | **Lunna** (antes EVA y Lunna) |
| Versión del documento | 1.0 · 14 nov 2026 |
| Base | ISO/IEC/IEEE 29148:2018 (sucesora de IEEE 830), adaptada a un hackathon |
| Fuentes internas | [Propuesta unificada](Propuesta-EVA.md) · documentos de Julio, Iker, Leo, Diana, Fani y Katy (enlazados en cada sección) |
| Entrega | **Domingo 15 nov 2026, 11:59 p.m. hora local** |

> **Actualización · 14 nov 2026 (auditoría de Lunna).** El producto se llama **Lunna**: antes
> se llamó EVA y LUNA. Los identificadores técnicos `eva.ble.v1`, `eva.telemetry.v1` y
> `EVA-SIM` se conservan (C-08). Estructura actual de la app móvil
> (`Planeacion/Leo/maqueta-eva/`):
>
> | Pestaña | Qué tiene |
> |---|---|
> | **Inicio** | Cuerpo Lunna primero (escáner con zoom al órgano), clima espacial, tarjetas de alerta y mosaico con los seis indicadores del reto |
> | **Registrar** | Lo que los sensores no miden: check-in, presión, temperatura, agua, masa, comida, síntomas, mente, tira de orina |
> | **Ciclo** | Solo para ellas y privado; en fase lútea, tu normal de pulso y HRV se ensancha 1,5× (propuesta del equipo) |
> | **Reportes** | Alertas, signos, reflejos (PVT-B), radiación con dosis personal, Tierra, vista de la CMO, logros |
> | **Ajustes** | Persona y día (se guardan juntos), tema, privacidad, Lunna, ayuda |
> | **Lunna flotante** | Burbuja tipo AssistiveTouch sobre todas las pantallas: lo que ve hoy, cómo monitorea, clima, qué procesa |
>
> Comportamiento corregido en la auditoría: el SOS atiende a quien lo presiona (o a quien se
> elija) y se puede cancelar; "Volver" usa una pila de navegación; lo que se registra hoy
> reemplaza el valor simulado del día y se recalcula todo.

**Cómo se lee:**

- Cada requisito tiene un **ID** (`RF-` funcional, `RNF-` no funcional, `RD-` de datos,
  `RI-` de interfaz, `RS-` de seguridad clínica).
- **Prioridad:** 🔴 núcleo (tiene que funcionar en la demo) · 🟡 diferenciador (si da el
  tiempo; si no, pantalla de diseño) · 🔵 visión (hoja de ruta).
- **Estado:** ✅ hecho y probado · 🟡 parcial o solo maqueta · ⬜ por hacer · 💡 concepto,
  no se programa.
- **Verbos:** *debe* = obligatorio · *debería* = deseable · *puede* = opcional.
- Marcas de confianza del repo: ✅ verificado · ⚠️ verificar · 🔶 decisión nuestra.
  Umbrales: **[A]** NASA o validado en astronautas · **[T]** clínico de Tierra ·
  **tu normal** (línea base personal).

---

## Índice

1. [Introducción](#1-introducción)
2. [Descripción general](#2-descripción-general)
3. [Interfaces externas](#3-interfaces-externas)
4. [Requisitos funcionales por módulo](#4-requisitos-funcionales-por-módulo)
5. [Requisitos de datos y variables](#5-requisitos-de-datos-y-variables)
6. [Reglas del motor](#6-reglas-del-motor)
7. [Requisitos no funcionales](#7-requisitos-no-funcionales)
8. [Seguridad clínica y honestidad](#8-seguridad-clínica-y-honestidad)
9. [Casos de uso y escenarios](#9-casos-de-uso-y-escenarios)
10. [Trazabilidad con el reto y el jurado](#10-trazabilidad-con-el-reto-y-el-jurado)
11. [Estado actual del código](#11-estado-actual-del-código)
12. [Fuera de alcance y concepto Lunna Band](#12-fuera-de-alcance-y-concepto-lunna-band)
13. [Criterios de aceptación de la demo](#13-criterios-de-aceptación-de-la-demo)
14. [Inconsistencias y decisiones pendientes](#14-inconsistencias-y-decisiones-pendientes)
15. [Glosario](#15-glosario)
16. [Referencias](#16-referencias)

---

## 1. Introducción

### 1.1 Propósito

Este documento dice **qué tiene que hacer Lunna**, con qué datos y con qué reglas, para que el
equipo sepa qué construir y el jurado pueda comprobar que cada función tiene un fundamento.
Junta en un solo lugar lo que está repartido en las propuestas y el código del equipo.

### 1.2 Alcance

Lunna es un software de monitoreo de salud para tripulaciones de misiones largas. Su cadena es:

    Recabar → Organizar → Monitorear → Prevenir → Asistir en emergencias

- **Recabar:** datos de cualquier dispositivo que hable la trama del equipo, captura manual,
  fotos de cámara, pruebas en pantalla y datos de la nave.
- **Organizar:** almacén local con tiempos de nave (SCET) y cola priorizada hacia Tierra.
- **Monitorear:** línea base personal de 14 días y semáforo ●■▲.
- **Prevenir:** reglas multivariables auditables con protocolo, seguimiento y cierre.
- **Asistir:** modo emergencia, buddy check, guía paso a paso y paquete prioritario a Tierra.

**Lo que Lunna no es:** no es un dispositivo médico, no diagnostica, no sustituye al CMO ni al
cirujano de vuelo, y no inventa protocolos clínicos (§8).

**Tesis** ([Julio](../Julio/comportamiento-del-software.md)): el monitoreo diario existe para
que, cuando pase lo malo, Lunna ya sepa cómo es esa persona cuando está bien.

### 1.3 Por qué tiene que decidir a bordo

- NASA tardó una **mediana de 17 min** (sobre 51 eventos de dos ventanas de 2024; con los 71 eventos de 2024 que tienen alerta sale **12 min**) en emitir la alerta de un evento solar (análisis de
  Julio con DONKI) ✅.
- Hasta Marte, cada mensaje tarda **4 a 24 min** en llegar; ida y vuelta, hasta ~48 min ✅.
- La propia literatura de NASA dice que el paradigma médico actual será insuficiente para la
  Luna y Marte por los retrasos de comunicación ✅
  ([comportamiento §1](../Julio/comportamiento-del-software.md#1-actores-del-sistema)).
- **No hay una tabla pública de NASA** de "signo vital X > Y → llamar al cirujano"; por eso
  Lunna compara a cada persona consigo misma (Iker) ✅.

### 1.4 Documentos relacionados

| Documento | Qué aporta a este ERS |
|---|---|
| [Propuesta unificada](Propuesta-EVA.md) | Módulos, privacidad, emergencia, decisiones |
| [Comportamiento del software](../Julio/comportamiento-del-software.md) | Ciclo diario, escalamiento, tiempos, modo emergencia |
| [Diccionario de datos](../Julio/diccionario-de-datos.md) | Cómo se calcula cada indicador |
| [Trama de telemetría](../Julio/codigo/TRAMA-TELEMETRIA.md) | `eva.telemetry.v1`, capacidades, adaptadores |
| [Trama base Bluetooth](../trama-base/README.md) | `eva.ble.v1`, 15 campos, condiciones en vivo, simulador ESP32 |
| [LLM local y voz](../Julio/llm-local-y-voz.md) | Asistente: el motor decide, el LLM solo redacta |
| [Motor diagnóstico](../Julio/motor-diagnostico.md) | Diferencial probabilístico (visión) |
| [Catálogos de Iker](../variables-diagnostico/00-indice-priorizado.md) | 364 variables con umbral [A]/[T] |
| [Ingesta de Leo](../Leo/ingesta/README.md) · [maqueta](../Leo/maqueta-eva/README.md) | Contrato de lectura, 78 variables, maqueta con el asistente |
| [Viabilidad de Diana](../Diana/viabilidad/RESULTADOS-diana.md) | Reglas YAML probadas (30/30) |
| [Viabilidad de Katy](viabilidad/RESULTADOS-viabilidad.md) · [variables Persona 5](investigacion-variables-persona5.md) | Orina, intestino, hueso, salud femenina |
| [Módulo biomédico (Bloque 2)](../../BLOQUE-2/readme_m_dulo_biom_dico_nasa_space_apps_2026.md) | Motor Python de radiación, riñón, hueso, laboratorio |
| [Concepto de reloj](Propuesta-reloj-LUNA.md) | Lunna Band (no se programa) |

---

## 2. Descripción general

### 2.1 Perspectiva del producto

Lunna es **software independiente del hardware**. No habla con relojes: habla con una trama.
Cualquier fuente que la cumpla (reloj, camiseta, hábitat, captura manual o datos sintéticos)
entra por un adaptador, y el motor no sabe qué hay detrás.

```
 FUENTES                         Lunna (a bordo, sin red)                    SALIDAS
┌───────────────────┐   ┌──────────────────────────────────────────┐   ┌─────────────────┐
│ Dispositivo BLE   │──►│ Adaptador → validador → almacén cifrado  │──►│ Laptop: panel   │
│ (eva.ble.v1)      │   │        │                                 │   │ iPad: personal  │
│ Captura manual    │──►│        ▼                                 │   │ Celular: avisos │
│ Cámara (tira)     │──►│ Línea base 14 d → motor de reglas YAML   │──►│ Voz             │
│ Pruebas (PVT-B)   │──►│        │                                 │   │                 │
│ Nave / DONKI      │──►│        ▼                                 │   │ Cola a Tierra   │
│ Sintético 180 d   │──►│ Semáforo · protocolo · escalamiento      │──►│ (SCET, OWLT)    │
└───────────────────┘   └──────────────────────────────────────────┘   └─────────────────┘
```

### 2.2 Funciones principales

| # | Función | Módulo |
|---|---|---|
| F1 | Mostrar el estado de salud de cada tripulante con figura humana y semáforo | 1 |
| F2 | Calcular la línea base personal y detectar desviaciones que se refuerzan entre sí | 2 |
| F3 | Activar y guiar emergencias, con buddy check | 3 |
| F4 | Avisar eventos solares con datos reales de DONKI y llevar la dosis personal | 4 |
| F5 | Adaptarse a laptop, iPad y celular, con recordatorios | 5 |
| F6 | Controlar quién ve qué dato | 6 |
| F7 | Comunicar con Tierra con retraso, antigüedad visible y cola priorizada | 7 |
| F8 | Salud femenina y diferencias por sexo | 11 |
| F9 | Asistente de voz que redacta lo que el motor decidió | 19 |
| F10–F22 | Salud mental, pánico, nutrición, juego, biblioteca, riesgo, botiquín, ambiente, entornos, diagnóstico, DTN, cognición, hardware | 8–10, 12–18, 20–22 |

### 2.3 Usuarios

| Usuario | Dónde | Qué necesita | Conocimiento médico |
|---|---|---|---|
| **Astronauta** | A bordo | Saber cómo está y qué hacer, en menos de 4 min al día | Bajo: no se supone |
| **Compañero (buddy)** | A bordo | Saber si su pareja necesita ayuda, sin ver sus datos | Bajo |
| **CMO** (Crew Medical Officer) | A bordo | Ver lo clínico de la tripulación y atender | Medio: no siempre es médico ✅ |
| **Comandante** | A bordo | Saber quién está apto, no por qué | Bajo |
| **Rescatista** (cualquier tripulante en una emergencia) | A bordo | Un paso a la vez, sin decisiones, manos ocupadas | Bajo |
| **Cirujano de vuelo** | Tierra | Cronología fiable con antigüedad del dato | Alto |
| **Investigación (NASA/HRP)** | Tierra | Archivo longitudinal con consentimiento | Alto |

### 2.4 Entorno de operación

| Aspecto | Requisito |
|---|---|
| Dispositivos | **Laptop, iPad y celular.** A bordo de la ISS ya vuelan laptops e iPads certificados ✅; NASA aprobó celulares en Crew-12 y Artemis II (feb 2026) ✅ |
| Plataforma | Una sola **PWA** en TypeScript + React (decisión 10) |
| Navegador | Chrome o Edge para Bluetooth; Safari del iPad sin Web Bluetooth ⚠️ |
| Red | **Ninguna.** Todo corre a bordo; el enlace con Tierra es por ventanas |
| Misión de la demo | Tránsito a Marte, días 112 a 115, retraso de 18 min por trayecto |
| Tripulación de la demo | Tomás (comandante, MS-1) · Ana (MS-2) · Mei (CMO, MS-3) · Luis (MS-4) |

### 2.5 Restricciones

| ID | Restricción | Origen |
|---|---|---|
| C-01 | Entrega el 15 nov 2026 a las 11:59 p.m.; demo de 7 diapositivas o video de 30 s | Space Apps ✅ |
| C-02 | Página de envío y todo lo enlazado en **inglés** (video en español con subtítulos en inglés) | Space Apps ✅ |
| C-03 | Sin logos ni identificadores de NASA en la app ni en contenido generado | Space Apps y NASA Brand Center ✅ |
| C-04 | Imágenes con IA llevan marca de agua; código y datos con IA se declaran | Space Apps ✅ |
| C-05 | Sin imágenes ni voces de menores de 18 años | Space Apps ✅ |
| C-06 | Licencias de datos respetadas (CGMacros sin uso comercial, etc.) | Leo ✅ |
| C-07 | No se suben datasets descargados ni claves al repo | Equipo 🔶 |
| C-08 | Los identificadores técnicos `eva.ble.v1`, `eva.telemetry.v1` y `EVA-SIM` **se conservan** aunque el producto se llame Lunna: cambiarlos rompería el código probado | 🔶 propuesta de este ERS |

### 2.6 Suposiciones y dependencias

| ID | Suposición | Si falla |
|---|---|---|
| S-01 | Los signos vitales de la demo son **simulados**; lo real son los eventos de DONKI, los umbrales de NASA-STD-3001 y la incidencia de Crucian 2016 | Se dice en pantalla y en la diapositiva de limitaciones |
| S-02 | El umbral de alarma de tasa de dosis de la nave no es público | Se usa el de la ISS (5 mrad/min ≈ 3000 µSv/h) marcado ⚠️ |
| S-03 | No se sabe qué glucómetro hay a bordo | La glucosa entra a mano |
| S-04 | El CMO puede no ser médico | Lenguaje simple y protocolo un paso por pantalla |
| S-05 | El LLM local cabe en la laptop de la demo | Sin LLM, las 13 frases pre-sintetizadas siguen funcionando |

---

## 3. Interfaces externas

### 3.1 Interfaz de usuario

| ID | Requisito | Prior. | Estado |
|---|---|---|---|
| RI-UI-01 | La interfaz **debe** adaptarse a tres tamaños: celular (< 600 px), iPad (600–1024 px) y laptop (> 1024 px), con la misma app | 🔴 | ⬜ |
| RI-UI-02 | El semáforo **debe** usar forma, color y texto a la vez: ● verde "en tu normal", ■ ámbar "atención", ▲ rojo "actúa ahora" | 🔴 | 🟡 maqueta |
| RI-UI-03 | Cada valor **debe** mostrar su etiqueta de procedencia: **[A] NASA**, **[T] clínico** o **tu normal**; tocarla abre la fuente | 🔴 | ⬜ |
| RI-UI-04 | Un valor estimado **debe** verse distinto de uno medido (por ejemplo, con su intervalo) | 🔴 | ⬜ |
| RI-UI-05 | El botón de emergencia **debe** estar visible en todas las pantallas | 🔴 | 🟡 maqueta de Leo |
| RI-UI-06 | Selector de idioma inglés / español | 🔴 | ⬜ |
| RI-UI-07 | La paleta **debe** ser la del equipo: `#192584`, `#B541FA`, `#4FD2E9`, blanco, `#74706D` | 🔴 | ✅ maquetas |
| RI-UI-08 | Las pantallas **deberían** tener tutoriales cortos (2–3 pasos) la primera vez | 🟡 | 🟡 maqueta de Leo |

### 3.2 Interfaz con dispositivos (Bluetooth)

Lunna no programa ningún reloj. Define lo que **cualquier** dispositivo tiene que entregar.

| ID | Requisito | Prior. | Estado |
|---|---|---|---|
| RI-HW-01 | Lunna **debe** leer la trama `eva.ble.v1`: paquetes de 20 bytes, servicio `4d6f6e61-7263-6173-4556-41000000000x` | 🔴 | ✅ códec, 19/19 pruebas |
| RI-HW-02 | **Debe** entender los 4 tipos de paquete: `VITALES` (1 s), `LATIDOS` (1 s), `HABITAT` (5 s), `EVENTO` (botón) | 🔴 | ✅ |
| RI-HW-03 | **Debe** leer la característica `CAPACIDADES` y **no mostrar** la pantalla de una variable que el dispositivo no da (ni vacía ni en cero) | 🔴 | ✅ en la trama · ⬜ en la UI |
| RI-HW-04 | Un campo con valor reservado (`0xFF`, `0xFFFF`, `0x7FFF`) **debe** llegar como `null`, nunca como cero | 🔴 | ✅ |
| RI-HW-05 | **Debe** detectar paquetes perdidos o repetidos por `seq` | 🔴 | ✅ |
| RI-HW-06 | **Debe** poner la hora del dispositivo al conectarse (`CONTROL` `01` + hora Unix) | 🟡 | ✅ en el códec |
| RI-HW-07 | Si el dispositivo no tiene la hora puesta, **debe** usar la de recepción y marcarlo | 🔴 | ✅ |
| RI-HW-08 | **Debe** existir un simulador sin placa con los mismos números que el firmware | 🔴 | ✅ `simulador.mjs` |
| RI-HW-09 | El firmware del ESP32 **debería** compilarse y probarse en una placa | 🟡 | ⚠️ escrito, sin compilar |

### 3.3 Interfaz lógica de telemetría

| ID | Requisito | Prior. | Estado |
|---|---|---|---|
| RI-TL-01 | Todo dato que entra al motor **debe** cumplir `eva.telemetry.v1` | 🔴 | ✅ `telemetry.ts` |
| RI-TL-02 | Cada muestra **debe** llevar `var` con su ID de catálogo (`04:A4`); un nombre libre se rechaza | 🔴 | ✅ |
| RI-TL-03 | Cada muestra **debe** llevar `origin` (`sensor`, `estimated`, `manual`…) y `quality` | 🔴 | ✅ |
| RI-TL-04 | Un valor `estimated` sin `ic95` ni `method` **debe** rechazarse | 🔴 | ✅ |
| RI-TL-05 | Cada trama **debe** llevar `t_scet` (cuándo ocurrió); `t_ert` y `owlt_s` van `null` a bordo | 🔴 | ✅ |
| RI-TL-06 | Las fuentes **deben** implementar `FuenteTelemetria`: reloj, manual, sintética y hábitat | 🔴 | ✅ reloj y manual · ⬜ sintética y hábitat |
| RI-TL-07 | Las lecturas de Leo (`AstronautVariableReading`, validado con Zod) **deben** convertirse a `eva.telemetry.v1` | 🟡 | ⬜ |

### 3.4 Interfaces de software externas

| ID | Requisito | Prior. | Estado |
|---|---|---|---|
| RI-SW-01 | **Debe** usar eventos SEP reales de **DONKI** (NASA) guardados localmente, no consultados en vivo | 🔴 | ✅ datos en `Julio/datos/` |
| RI-SW-02 | **Debería** poder leer fotos de la cámara para la tira de orina (modelo de Roboflow o colorimetría) | 🟡 | 🟡 script de Katy y página de Bloque 2 |
| RI-SW-03 | El modelo DeepACSA (ultrasonido muscular) **puede** usarse por un puente a Python | 🔵 | ✅ Leo |
| RI-SW-04 | USDA FoodData Central **puede** dar hierro, sodio y calcio de las comidas | 🔵 | ⚠️ límite de `DEMO_KEY` |
| RI-SW-05 | La voz **debe** usar `speechSynthesis` del navegador o frases pre-sintetizadas; el LLM es local | 🔴 | ✅ 13 frases |

### 3.5 Interfaz de comunicación con Tierra

| ID | Requisito | Prior. | Estado |
|---|---|---|---|
| RI-CM-01 | La cola hacia Tierra **debe** ordenarse: rojos abiertos → ámbares abiertos → resúmenes diarios → series crudas si cabe | 🔴 | ⬜ |
| RI-CM-02 | Cada paquete **debe** tener `id` único; aplicarlo dos veces no duplica nada | 🔴 | ✅ `deduplicar()` |
| RI-CM-03 | **Debería** ser compatible a futuro con redes tolerantes a interrupciones (DTN, Bundle Protocol) | 🔵 | 💡 Fani |

---

## 4. Requisitos funcionales por módulo

Los **22 módulos** de la propuesta. Ninguno se quita: la prioridad decide el orden.

### 4.1 🔴 Módulo 1 · Panel de salud y Cuerpo Lunna

**De quién:** Katy · Fani · Diana · Iker

| ID | Requisito | Criterio de aceptación | Estado |
|---|---|---|---|
| RF-01-01 | **Debe** mostrar una figura humana clicable; cada parte abre su función y su estado | Tocar el corazón abre FC, HRV y ritmo con su semáforo | ⬜ |
| RF-01-02 | **Debe** mostrar los seis indicadores del reto: presión, FC, glucosa, temperatura, sueño y ánimo | Los seis visibles con valor, unidad, semáforo y procedencia | 🟡 maqueta |
| RF-01-03 | **Debe** graficar cada indicador contra la banda de "tu normal" de 14 días | La banda se ve; los puntos fuera de ella cambian de color | ⬜ |
| RF-01-04 | **Debe** explicar en una frase qué es cada indicador y por qué se mide en el espacio | Botón "¿por qué se mide esto?" en cada tarjeta | 🟡 |
| RF-01-05 | En la laptop, el **panel de pared** público **debe** mostrar solo ●■▲ de cada persona y alertas del ambiente | Sin números ni diagnósticos en el panel público | ⬜ |
| RF-01-06 | **Debe** mostrar el aviso de clima espacial del día | Tarjeta con el último evento de DONKI | 🟡 maqueta de Leo |
| RF-01-07 | **Debe** mostrar el estado contra la meta de la misión (ejercicio, agua, sueño) | Barras de progreso diarias | 🟡 |

### 4.2 🔴 Módulo 2 · Motor de prevención

**De quién:** Julio · Diana

| ID | Requisito | Criterio de aceptación | Estado |
|---|---|---|---|
| RF-02-01 | **Debe** calcular la línea base móvil de 14 días por persona y variable: mediana y MAD | Con 14 días sintéticos de Ana, la mediana de FC en reposo es 58 | ⬜ |
| RF-02-02 | **Debe** calcular el z robusto: `z = 0,6745 · (x − mediana) / MAD` | Pruebas unitarias con valores conocidos | ⬜ |
| RF-02-03 | **Debe** evaluar reglas multivariables escritas en YAML, legibles por una persona | El YAML se abre en la demo y se entiende | ✅ Python (Diana) · ⬜ TypeScript |
| RF-02-04 | **Debe** detectar la combinación aunque ninguna señal sola dispare (fatiga: sueño, lapsos del PVT-B y FC en reposo) | `FATIGA-03` dispara con z −2,4 / +2,2 / +2,0 | 🟡 diseñada |
| RF-02-05 | Cada alerta **debe** decir qué señales la causaron, su valor y su umbral | La tarjeta muestra las 3 señales con su evidencia | ⬜ |
| RF-02-06 | Cada alerta **debe** abrir un **protocolo con pasos, seguimiento y fecha de reevaluación**, no un consejo suelto | El protocolo de fatiga se agenda y se reevalúa cada día | ⬜ |
| RF-02-07 | **Debe** cerrar el evento cuando `z < 2` durante 2 días 🔶, o escalar si empeora | Día 114: el evento de Ana cierra en verde | ⬜ |
| RF-02-08 | **Debe** avisar si una alerta afecta una actividad programada (caminata espacial en 36 h) | Aviso "caminata espacial en 36 h" en la tarjeta | ⬜ |
| RF-02-09 | **Debe** descartar señales de mala calidad: noche con > 10 % de latidos erróneos; 10 s sin contacto | Sin contacto no se evalúa nada clínico | ✅ trama · ✅ Diana |
| RF-02-10 | **Debe** usar los botones "me acuesto / me levanto" para la hora de despertar (el reloj se equivoca ±86 min) | Horas de sueño con error ≤ 4 % | ✅ probado por Diana |
| RF-02-11 | **Debe** ajustar la línea base por fase del ciclo menstrual cuando aplique (ver RF-11-04) | Sin falsas alarmas de FC en fase lútea | ⬜ |
| RF-02-12 | Las condiciones en vivo (§6.1) **deben** evaluarse cada segundo sobre la trama | Cada escenario del simulador dispara su aviso; el nominal, ninguno en 10 min | ✅ `condiciones.mjs` |

### 4.3 🔴 Módulo 3 · Emergencias y buddy system

**De quién:** Julio · Katy · Diana

| ID | Requisito | Criterio de aceptación | Estado |
|---|---|---|---|
| RF-03-01 | **Debe** activarse de 3 formas: manual (un toque, sin confirmar), automática (caída de SpO₂, FC extrema, caída detectada) y por un tercero | Las tres vías abren el modo emergencia | 🟡 manual y automática en la maqueta |
| RF-03-02 | Al activarse **debe** arrancar un cronómetro T+ que no se detiene | T+ visible en toda la emergencia | 🟡 maqueta |
| RF-03-03 | **Debe** preguntar "¿quién es el paciente?" cuando la activa un tercero | Selector con los 4 tripulantes | ⬜ |
| RF-03-04 | **Debe** traer la línea base del paciente y mostrar cada valor contra ella ("FC 130 · 2,2× su normal") | El dato contra su normal aparece en ≤ 1 s | 🟡 maqueta |
| RF-03-05 | **Debe** mostrar **un paso por pantalla**, texto grande, sin menú ni scroll | Cada paso cabe en el celular | 🟡 maqueta |
| RF-03-06 | **Debe** sellar cada paso con su SCET, sin que nadie escriba | El registro tiene la hora de cada paso | ⬜ |
| RF-03-07 | **Debe** avisar al CMO, **salvo que el CMO sea el paciente**: entonces salta al nivel 2 y avisa al comandante | Caso Mei: avisa al comandante y a Tierra | ⬜ |
| RF-03-08 | **Debe** encolar un paquete prioritario para Tierra con los últimos minutos de telemetría | El paquete queda primero en la cola | ⬜ |
| RF-03-09 | **Buddy check:** **debe** preguntar a cada compañero "¿tu pareja llegó al refugio?" | Cada celular recibe su pregunta | ⬜ |
| RF-03-10 | Si alguien no confirma, **debe** avisar a su pareja con la última ubicación conocida (simulada ⚠️) | "Mei no ha confirmado. Su iPad tiene conexión. Última ubicación: Módulo C." | ⬜ |
| RF-03-11 | **Debe** distinguir "sin conexión" de "no responde" | Si el iPad se apaga, dice "sin conexión con el iPad de Mei" | ⬜ |
| RF-03-12 | Si la pareja también está afectada, la alerta **debe** pasar a toda la tripulación | Alerta a todos | ⬜ |
| RF-03-13 | Si varias personas tienen síntomas a la vez, **debe** tratarlo como problema del ambiente | Alerta del ambiente para todos | ⬜ |
| RF-03-14 | **Debe** mostrar "4 de 4 en el refugio" al confirmar todos | Contador en todas las pantallas | ⬜ |
| RF-03-15 | Los pasos clínicos **deben** decir "Ilustrativo: no es protocolo médico" salvo que tengan fuente citada | Rótulo visible en cada paso clínico | ✅ maqueta |
| RF-03-16 | **Debe** existir al menos una clase de emergencia completa de punta a punta: **evento solar** | Demo del día 115 completa | ⬜ |
| RF-03-17 | Las demás clases (hipoxia, descompresión, trauma, evento cardiaco) **deberían** existir como escenarios ilustrativos | Hipoxia simulada en la maqueta de Leo | 🟡 |

### 4.4 🔴 Módulo 4 · Radiación

**De quién:** Julio · Iker · Leo · Fani

| ID | Requisito | Criterio de aceptación | Estado |
|---|---|---|---|
| RF-04-01 | **Debe** usar un evento SEP real de DONKI como modelo, con su fecha, instrumento y latencia | En pantalla: 2024-05-11T02:10:00-SEP-001, GOES-P SEISS > 100 MeV, latencia 20 min | ✅ datos · ⬜ pantalla |
| RF-04-02 | **Debe** disparar ▲ rojo "Dirígete al refugio" con tasa ≥ 3000 µSv/h ⚠️ | Escenario 2 del simulador dispara el refugio | ✅ `condiciones.mjs` |
| RF-04-03 | **Debe** dar ámbar con tasa > 54 µSv/h (= 1,3 mSv/día de diseño [A]) | Prueba con 60 µSv/h | ✅ |
| RF-04-04 | **Debe** acumular la dosis del evento y alertar en rojo al llegar a 250 mSv [A] | Dosis del evento visible | ✅ regla · ⬜ pantalla |
| RF-04-05 | **Debe** llevar la dosis de carrera contra **600 mSv [A]**, igual para todos | Barra de margen por persona | ⬜ |
| RF-04-06 | **Debe** mostrar al comandante solo el margen hasta el límite (§6.5) | El comandante no ve dosis ajenas | ⬜ |
| RF-04-07 | **Debería** no confundir mareo espacial (días 1–3) con síntomas de radiación | Bloque 2: vómito en día 2 con radiación nominal → INFO | ✅ Python (Bloque 2) |
| RF-04-08 | **Debe** decir que las dosis son simuladas (DONKI no da dosis) | Rótulo "dosis simulada" | ⬜ |

### 4.5 🔴 Módulo 5 · Diseño adaptable y recordatorios

**De quién:** Katy · Fani

| ID | Requisito | Criterio de aceptación | Estado |
|---|---|---|---|
| RF-05-01 | **Laptop:** panel completo, panel de pared, vista de la CMO y cola hacia Tierra | Las 4 vistas en > 1024 px | ⬜ |
| RF-05-02 | **iPad:** check-in, PVT-B, protocolos paso a paso, cámara para la tira | Las 4 funciones en 600–1024 px | ⬜ |
| RF-05-03 | **Celular:** estado de un vistazo, avisos, "¿Estás bien?", alerta del compañero, botón de ayuda | Una acción por pantalla en < 600 px | 🟡 maqueta de Leo |
| RF-05-04 | **Debe** recordar mediciones dentro de la rutina (check-in matutino, PVT-B, presión, agua) | Notificación a la hora programada | ⬜ |
| RF-05-05 | **Debe** preguntar "¿Estás bien?" ante una lectura crítica y escalar si no hay respuesta | 15 s sin respuesta → alerta al compañero | ⬜ |
| RF-05-06 | La emergencia **debe** verse igual en los tres: ▲ rojo a pantalla completa con la instrucción | Mismo texto en los tres tamaños | ⬜ |
| RF-05-07 | Las notificaciones de la pantalla bloqueada **no deben** tener texto médico | "Lunna tiene un aviso para ti" | ⬜ |

### 4.6 🔴 Módulo 6 · Privacidad: quién ve qué

**De quién:** Katy

| ID | Requisito | Criterio de aceptación | Estado |
|---|---|---|---|
| RF-06-01 | **Debe** aplicar la matriz de §6.5 por rol | Cada rol ve solo lo que la matriz permite | ⬜ |
| RF-06-02 | El astronauta **debe** ver todo lo suyo, completo | Sin datos ocultos para el propio astronauta | ⬜ |
| RF-06-03 | **Debe** existir la vista "lo que ven de mí" por rol | El astronauta ve exactamente lo que ve cada rol | ⬜ |
| RF-06-04 | La emergencia **debe** desbloquear solo lo necesario y por tiempo limitado | La ubicación de Mei deja de compartirse al cerrar | ⬜ |
| RF-06-05 | **Debe** registrar cada acceso: quién vio qué y cuándo | Registro visible para el dueño del dato | ⬜ |
| RF-06-06 | El detalle **debe** bloquearse solo a los 30 s | Bloqueo automático | ⬜ |
| RF-06-07 | Los permisos ✋ **deben** fijarse antes del vuelo y poder cambiarse en vuelo, con registro | Cambio registrado | ⬜ |
| RF-06-08 | **No se pueden desactivar** el riesgo de hacerse daño ni una emergencia roja | Las dos excepciones no tienen interruptor | ⬜ |
| RF-06-09 | Revocar un consentimiento **debe** detener el envío desde ese momento | Lo ya enviado queda registrado | ⬜ |

### 4.7 🔴 Módulo 7 · Comunicación con Tierra

**De quién:** Julio · Fani · Iker

| ID | Requisito | Criterio de aceptación | Estado |
|---|---|---|---|
| RF-07-01 | **Debe** ordenar todo por SCET, nunca por hora de recepción | `ordenarPorSCET()` | ✅ |
| RF-07-02 | **Ninguna** pantalla de Tierra **debe** decir "estado actual"; **debe** decir "estado al SCET X, recibido Y, antigüedad Z min" | Antigüedad siempre visible | ✅ `antiguedadMin()` · ⬜ pantalla |
| RF-07-03 | **Debe** mostrar la **nota de Tierra que llega tarde** con su antigüedad ("41 min") | Demo del día 114 | ⬜ |
| RF-07-04 | Si Tierra manda un umbral basado en datos viejos y a bordo hay una decisión más nueva, **no debe** pisarla en silencio: avisa | Config versionada con su SCET | ⬜ |
| RF-07-05 | **Debe** usar los criterios públicos "Contact Surgeon" (JSC-48031) para decidir cuándo contactar | Diarrea con fiebre, 24 h sin mejoría, etc. | ⬜ |
| RF-07-06 | **Debe** guardar `t_sclk` crudo y `t_scet` corregido (el reloj de la nave deriva) | Los dos campos en cada registro | ✅ |

### 4.8 🔴 Módulo 11 · Salud femenina y diferencias por sexo

**De quién:** Katy · Leo · Iker. **Privado por defecto y sin juego.**

| ID | Requisito | Criterio de aceptación | Estado |
|---|---|---|---|
| RF-11-01 | **Debe** registrar el ciclo: última menstruación (`R01`), duración (`R02`), sangrado (`R03`, `R04`), regularidad (`R05`) | Formulario privado | ⬜ |
| RF-11-02 | **Debe** estimar la fase del ciclo (`R06`) por calendario | Fase visible solo para ella | ⬜ |
| RF-11-03 | **Debe** llevar la supresión menstrual y el inventario de anticonceptivos (`R11`, `R12`) | Aviso si el inventario no alcanza para la misión | ⬜ |
| RF-11-04 | **Debe** ajustar la línea base de FC y HRV por fase (`R21`) para evitar falsas alarmas | El motor usa la fase como contexto | ⬜ |
| RF-11-05 | **Debe** considerar el riesgo de coágulos con tratamiento hormonal (`R22`) | Factor de riesgo visible para la CMO solo con permiso o en emergencia | ⬜ |
| RF-11-06 | **Debe** avisar del mareo al volver a la gravedad, más frecuente en mujeres | Aviso de transición | ⬜ |
| RF-11-07 | **Debería** registrar síntomas urinarios y ginecológicos (`R24`) | Lista sí/no | ⬜ |
| RF-11-08 | Los datos de este módulo **deben** ser privados (✋) salvo emergencia o factor de riesgo | Matriz §6.5 | ⬜ |
| RF-11-09 | **Debe** mostrar diferencias por sexo como avisos, no como diagnósticos | Rótulo "dato con pocos estudios en mujeres" | ⬜ |

### 4.9 🔴 Módulo 19 · Asistente de voz

**De quién:** Julio · Fani · Leo (avatar)

| ID | Requisito | Criterio de aceptación | Estado |
|---|---|---|---|
| RF-19-01 | El LLM **solo debe redactar** el veredicto del motor; nunca ve señales crudas ni decide | El prompt recibe el JSON del motor, no la telemetría | ⬜ |
| RF-19-02 | La frase generada **debe** validarse contra el JSON: ningún número nuevo o cambiado | Una frase con un número distinto se rechaza | ⬜ |
| RF-19-03 | El humor **debe** apagarse solo en ámbar y rojo | Cambiar a ámbar cambia el tono | ⬜ |
| RF-19-04 | La personalidad (formalidad, humor, verbosidad, voz, ritmo) **debe** guardarse por tripulante | Cada persona tiene su perfil | ⬜ |
| RF-19-05 | Si el LLM falla, **debe** perderse la voz, no la salud: el semáforo y el texto siguen | Prueba con el LLM apagado | ✅ 13 frases pre-sintetizadas |
| RF-19-06 | **Debe** existir un avatar con forma de luna cuya fase refleja el estado: llena = normal, menguante = alerta, casi nueva = emergencia | Fase sincronizada con el semáforo | ✅ maqueta de Leo |
| RF-19-07 | **Debe** mostrar siempre: "soy un apoyo para registrar y ordenar lo que sientes. No soy un psicólogo y no sustituyo al CMO" | Aviso fijo en el chat | ⬜ |

### 4.10 🟡 Módulo 8 · Salud mental y del equipo

**De quién:** Julio · Leo · Katy · Fani · Iker · Diana

| ID | Requisito | Criterio de aceptación | Estado |
|---|---|---|---|
| RF-08-01 | **Debe** tener un check-in diario de ~20 s: ánimo, energía, estrés, síntomas | Se completa en ≤ 20 s | 🟡 maqueta |
| RF-08-02 | **Debe** pasar el PHQ-2 (`03:V2`) cada semana, junto con el ítem 9 | Siempre las 3 preguntas | ⬜ |
| RF-08-03 | **Debe** abrir el PHQ-9 (`03:V1`) si **PHQ-2 ≥ 2 o ítem 9 > 0** (con ≥ 3 se perdía el 40 % del ítem 9) | Filtro probado: 0 casos del ítem 9 perdidos | ✅ Diana |
| RF-08-04 | Ítem 9 > 0 **debe** dar alerta crítica aunque el total sea bajo | Alerta a la CMO y a Tierra | ✅ regla |
| RF-08-05 | PHQ-9 y GAD-7 (`03:V3`) **deben** puntuarse con un sumador determinista, nunca con el LLM | Cortes 5/10/15 [T] | ⬜ |
| RF-08-06 | **Debe** medir estrés 0–100 (`03:V9`): z ≥ 2 ámbar, ≥ 3 rojo | Regla probada | ✅ Diana |
| RF-08-07 | **Debería** registrar somnolencia KSS (`03:V53`, > 6 [T]), carga NASA-TLX (`03:V56`) y horas de trabajo (`03:V59`, crítico > 60 h/semana [A]) | Formularios de 1 toque | ⬜ |
| RF-08-08 | **Debería** medir la cohesión del equipo sin exponer a nadie | Resultado agregado | ⬜ |
| RF-08-09 | La CMO **debe** ver la tendencia semanal del ánimo, no el día a día (salvo permiso) | Decisión 9 | ⬜ |

### 4.11 🟡 Módulo 9 · Crisis de ansiedad o pánico (ilustrativo)

**De quién:** Katy

| ID | Requisito | Criterio de aceptación | Estado |
|---|---|---|---|
| RF-09-01 | **Debe** descartar primero lo físico: SpO₂, ritmo y CO₂ de cabina | Si hay causa física, va a emergencia, no a respiración | ⬜ |
| RF-09-02 | **Debe** ofrecer respiración guiada con vibración y compañero opcional | Pantalla de respiración | 🟡 maqueta v1 |
| RF-09-03 | **Debe** estar marcado como ilustrativo | Rótulo visible | ⬜ |

### 4.12 🟡 Módulo 10 · Nutrición, hidratación y ejercicio

**De quién:** Katy · Leo · Iker · Fani

| ID | Requisito | Criterio de aceptación | Estado |
|---|---|---|---|
| RF-10-01 | **Debe** llevar la energía contra 3035 kcal/día [A] (+200 kcal por hora de caminata espacial) | Meta diaria con barra | 🟡 maqueta de Leo |
| RF-10-02 | **Debe** llevar el agua contra ≥ 32 mL/kg/día [A] | Meta según la masa | ⬜ |
| RF-10-03 | **Debe** llevar el sodio contra 1500–2300 mg/día | Zona meta | 🟡 maqueta |
| RF-10-04 | **Debe** alertar si la masa (`01:V8`) baja > 3,3 % de la basal [A] | Alerta ámbar | ⬜ |
| RF-10-05 | **Debe** registrar ARED (`02:V44`), CEVIS (`02:V54`) y T2 (`02:V55`) | Minutos y cargas por día | ✅ datos simulados (Leo) |
| RF-10-06 | **Debe** comparar fuerza y capacidad aeróbica contra ≥ 80 % de la basal [A] | Alerta si baja | ⬜ |
| RF-10-07 | **Debe** registrar minutos de ejercicio (`02:V56`) contra el plan (ISS: 1,5 h/día [A]) | Regla de varios días | ✅ regla |
| RF-10-08 | **Debería** llevar la glucosa: capilar a mano (`02:V86`) y curva continua (`02:V92`, rango 70–180 [T]) | Curva de 24 h | 🟡 maqueta |
| RF-10-09 | **Debería** activar el cruce hueso-riñón (poco ARED + resorción alta + poca agua) y subir la meta de agua a 2500 mL | Bloque 2, escenario 4 | ✅ Python (Bloque 2) |
| RF-10-10 | **Debería** leer la tira de orina por foto (densidad, proteína, leucocitos, nitritos) | Ver §6.3 | 🟡 |

### 4.13 🟡 Módulo 12 · Juego cooperativo

**De quién:** Katy · Leo. Decisión 7: **pantalla de diseño**.

| ID | Requisito | Criterio de aceptación | Estado |
|---|---|---|---|
| RF-12-01 | **Debe** premiar **registrar**, no tener buenos números | Puntos por check-in, no por FC | 🟡 maqueta |
| RF-12-02 | **No debe** tener rankings entre tripulantes | Solo metas de equipo | 🟡 |
| RF-12-03 | Los compañeros **deben** ver solo "meta lograda / no lograda" | Matriz §6.5 | ⬜ |
| RF-12-04 | La salud femenina y la mental **no deben** entrar al juego | Excluidas | ⬜ |

### 4.14 🟡 Módulo 13 · Biblioteca de enfermedades y cuidados

**De quién:** Katy · Diana · Iker

| ID | Requisito | Criterio de aceptación | Estado |
|---|---|---|---|
| RF-13-01 | **Debe** tener fichas sin conexión ordenadas por frecuencia real (modelo IMM de NASA): insomnio 13,85 por misión, abrasión ocular 7,42, diarrea 3,53, barotrauma 3,28, cefalea por CO₂ 2,15 | Las 5 primeras fichas | ⬜ |
| RF-13-02 | Cada ficha **debe** tener su criterio "Contact Surgeon" | Criterio visible | ⬜ |
| RF-13-03 | **Debe** explicar en lenguaje simple, sin suponer conocimiento médico | Lectura de 1 min | ⬜ |

### 4.15 🟡 Módulo 14 · Cómo se muestra el riesgo

**De quién:** Leo

| ID | Requisito | Criterio de aceptación | Estado |
|---|---|---|---|
| RF-14-01 | **Debe** usar 3 formas según la variable: probabilidad con modelo (radiación), margen contra la norma (hueso, nutrición) y nivel relativo (sueño, SANS) | Cada variable con su forma | ⬜ |
| RF-14-02 | **Debe** mostrar la incertidumbre de lo estimado | Intervalo visible | ⬜ |

### 4.16 🔵 Módulos de visión (15–18, 20–22)

| ID | Módulo | Requisito | Estado |
|---|---|---|---|
| RF-15-01 | 15 Botiquín y medicamentos | **Debería** llevar inventario y caducidad, y avisar de fármacos a bordo que alargan el QT (ciprofloxacino, haloperidol, azitromicina) | ⬜ |
| RF-16-01 | 16 Ambiente de la nave | **Debe** comparar CO₂, O₂, ruido, temperatura y humedad contra los límites de §6.4 | ✅ condiciones en vivo · ⬜ pantalla |
| RF-16-02 | 16 Ambiente de la nave | **Debería** relacionar síntomas de varias personas con el ambiente (cada +1 mmHg de CO₂ duplica la cefalea, n = 49 [A]) | ⬜ |
| RF-17-01 | 17 Perfiles de entorno | **Debería** cambiar reglas según el entorno: nave, ISS, rover, Luna, Marte (polvo lunar < 0,3 mg/m³, marciano < 0,1 [A]) | ⬜ |
| RF-17-02 | 17 Perfiles de entorno | La postura y la intolerancia ortostática **solo deben** evaluarse con gravedad | ✅ regla |
| RF-18-01 | 18 Motor diagnóstico | **Puede** dar un diferencial probabilístico con priors de Crucian 2016 y "¿de dónde sale este %?"; solo si se pasa el gate T−9 (decisión 6) | ⬜ |
| RF-20-01 | 20 DTN | **Puede** usar Bundle Protocol para el enlace | 💡 |
| RF-21-01 | 21 Cognición | **Debería** comparar DSST y Fractal 2-Back contra la basal (alerta con z ≤ −1,5 [A]) | ⬜ |
| RF-21-02 | 21 Cognición | **Debería** repetir pruebas en cada cambio de gravedad (tándem, Romberg, funcionales como formularios de posvuelo) | ✅ formularios (Leo) |
| RF-22-01 | 22 Hardware real | **Debe** tener adaptadores para cualquier fuente: reloj BLE, Bio-Monitor, ultrasonido, hábitat | ✅ reloj y manual · ⬜ resto |
| RF-22-02 | 22 Hardware real | El reloj Lunna Band **se presenta como concepto** (§12) | 💡 |

### 4.17 Funciones transversales

| ID | Requisito | Prior. | Estado |
|---|---|---|---|
| RF-TR-01 | **Prueba de reflejos PVT-B** de 3 min: lapsos ≥ 355 ms y media de 1/RT (`03:V65`) | 🔴 | ⬜ |
| RF-TR-02 | **Ciclo diario de ≤ 4 min** para el astronauta: sincroniza la noche, check-in, PVT-B, semáforo | 🔴 | ⬜ |
| RF-TR-03 | **Generador sintético** de 180 días para los 4 tripulantes, con los cambios en vuelo publicados | 🔴 | ⬜ `FuenteSintetica` |
| RF-TR-04 | **Modo demo automático**: recorre los días 112 → 115 sin intervención | 🔴 | 🟡 demo de Leo (un día) |
| RF-TR-05 | **Escalamiento**: nivel 0 autocuidado → 1 CMO → 2 cirujano de vuelo → 3 junta médica | 🔴 | ⬜ |
| RF-TR-06 | Ámbar persistente 48 h o síntoma físico **debe** pasar al nivel 1 | 🔴 | ⬜ |
| RF-TR-07 | **Captura manual** de presión, glucosa, temperatura, síntomas, agua, comidas | 🔴 | ✅ formularios (Leo, 49 variables) |
| RF-TR-08 | **Captura por cámara**: tira de orina, color de orina, uñas y manos, comidas | 🟡 | 🟡 |

---

## 5. Requisitos de datos y variables

### 5.1 Reglas de datos

| ID | Requisito | Estado |
|---|---|---|
| RD-01 | Cada variable **debe** identificarse con su ID de catálogo y archivo de origen (`01:V1`, `04:A4`, `R01`) | ✅ |
| RD-02 | Cada valor **debe** llevar su nivel de obtención: N0 reloj · N1 modelo · NT nave · N2 autoinforme · N3 CMO · N4 solo en Tierra | 🟡 por variable, no por lectura (Leo) |
| RD-03 | Cada umbral **debe** llevar su tipo: `[A]`, `[T]` o `tu normal`, y su fuente | ✅ catálogos |
| RD-04 | `null` = "se intentó y no hay dato"; omitir = "esta fuente no da esto" | ✅ |
| RD-05 | Una lectura de mala calidad **debe** guardarse marcada, no descartarse ni usarse como buena | ✅ |
| RD-06 | Los datos **deben** guardarse cifrados a bordo | ⬜ |
| RD-07 | Los datos de Tierra usados para pruebas **deben** respetar su licencia y no subirse al repo | ✅ |

### 5.2 Variables del núcleo: lo que llega solo por la trama

15 campos de la trama `eva.ble.v1` ([trama base](../trama-base/README.md)).

| Campo | Variable | Unidad | Frecuencia | Viabilidad | Módulo |
|---|---|---|---|---|---|
| `fc` | `04:A4` Frecuencia cardiaca | lpm | 1 s | ✅ | 1, 2, 3 |
| `spo2` | `04:A3` SpO₂ | % | 1 s | ⚠️ sobreestima con oxígeno bajo: se confirma con pulsioxímetro | 3 |
| `fr` | `04:A2` Frecuencia respiratoria | rpm | 1 s | ⚠️ estimada; solo como valor diario (error 1,3 rpm) | 2 |
| `temp_piel` | `04:A1` Temperatura | °C | 1 s | ⚠️ de piel; solo contra tu normal | 2 |
| `actividad` | `03:V30` Sueño · `02:V56` Ejercicio | cuentas/s | 1 s | ✅ Cole-Kripke, 4 % de error | 2, 10 |
| `postura` | `01:V48` | categoría | 1 s | ⚠️ solo con gravedad | 17 |
| `pasos` | `02:V56` | pasos/s | 1 s | apoyo | 10 |
| `ibi_ms` | `03:V17` HRV · `01:V31`–`V32` Ritmo | ms | 1 s | ✅ RMSSD a 6,6 % con filtro | 2, 8 |
| `ppco2` | `04:A23` CO₂ | mmHg | 5 s | ✅ | 16 |
| `ppo2` | `04:A25` O₂ inspirado | mmHg | 5 s | ✅ | 16 |
| `temp_cabina`, `humedad` | `04:A27` | °C, % | 5 s | ✅ | 16 |
| `tasa_dosis` | `01:V95` Tasa de dosis | µSv/h | 5 s | ✅ | 4 |
| `ruido` | `04:A28` | dBA | 5 s | ✅ | 16 |
| `lux` | `03:V49` Luz | lux | 5 s | ✅ | 2 |

### 5.3 Variables que Lunna calcula

| Se calcula | A partir de | Variable | Estado |
|---|---|---|---|
| FC en reposo: mediana de 30 min más baja **durante el sueño** | `fc` + `actividad` | `01:V3`, `03:V18` | ✅ error 0,8 % |
| HRV nocturna: RMSSD y SDNN | `ibi_ms` | `03:V17` | ✅ |
| Horas de sueño, hora de acostarse y levantarse | `actividad` + botones | `03:V30`, `04:A40`, `03:V52` | ✅ / 🟡 |
| Horas despierto | botón "me levanto" | `03:V62` | ✅ |
| Minutos de ejercicio | `actividad` + `pasos` + `fc` | `02:V56`, `01:V29` | ✅ |
| Subida de FC al ponerse de pie | `fc` + botón | `01:V48` | ✅ |
| Dosis del evento y de la misión | `tasa_dosis` | `01:V93`, `01:V90` | ✅ |
| QTc (Bazett) | ECG puntual | `01:V34` | ⬜ requiere ECG |

### 5.4 Variables que entran a mano, por cámara o por prueba

| Indicador | Variable | Cómo entra | Umbral | Módulo |
|---|---|---|---|---|
| Presión arterial | `01:V1` | Manguito → a mano | AHA [T]; al volver a la gravedad, caída ≥ 20/10 [T]; sistólica < 70 presíncope [A] | 1 |
| Glucosa | `02:V86` capilar · `02:V92` continua | A mano / parche | Ayuno < 100 / 100–125 / ≥ 126 mg/dL [T]; rango 70–180 [T] | 10 |
| Ánimo | `03:V1` PHQ-9 · `03:V2` PHQ-2 · `03:V3` GAD-7 | Check-in | ≥ 10 [T]; ítem 9 > 0 crítico | 8 |
| Estrés | `03:V9` | Escala 0–100 | z ≥ 2 / ≥ 3 | 8 |
| Somnolencia | `03:V53` KSS | 1 toque | > 6 [T] | 8 |
| Reflejos | `03:V65` PVT-B | Prueba en pantalla | Lapsos ≥ 355 ms contra tu normal | 2 |
| Masa corporal | `01:V8` | Equipo de la nave | −3,3 % de la basal [A] | 10 |
| Agua | Registro de agua | A mano | ≥ 32 mL/kg/día [A] | 10 |
| Comidas | `02:V81` energía · `02:V83` sodio | A mano con iconos | 3035 kcal [A] · 1500–2300 mg | 10 |
| Tira de orina | `04:A22a` leucocitos · `04:A22b` nitritos · `04:A22d` proteína · `04:A22h` densidad | Foto | Ver §6.3 | 10 |
| Diarrea | `04:A43` | A mano | Con fiebre ≥ 38 °C o 24 h sin mejora → Contact Surgeon | 7 |
| Otoscopia | `04:A20` | CMO | Tímpano rojo y abombado o perforado → Contact Surgeon | 7 |
| Ciclo menstrual | `R01`–`R12`, `R18`–`R24` | Privado, a mano | Ver [Persona 5](investigacion-variables-persona5.md) | 11 |
| Síntomas | Dolor 0–10, cefalea, mareo | A mano | Fuerte → sugerir CMO | 1, 13 |

### 5.5 Inventario total

| Fuente | Variables |
|---|---|
| Catálogos de Iker | 364 |
| Salud reproductiva y hormonal nueva (`R01`–`R24`) | 24 |
| **Total de trabajo** | **388**, repartidas entre 5 personas ([asignación](../ASIGNACION_VARIABLES_MONARCAS.md)) |

Lunna no usa las 388 en la demo. Usa las de §5.2–§5.4; el resto queda documentado con su
fuente, su nivel de obtención y si se puede medir en vuelo.

---

## 6. Reglas del motor

### 6.1 Condiciones en vivo (cada segundo)

Fuente: [`condiciones.mjs`](../trama-base/condiciones.mjs) ✅ probado.

| Peligro (HRP) | Aviso | Regla | Umbral |
|---|---|---|---|
| Radiación | Evento de radiación | ≥ 3000 µSv/h → refugio · evento ≥ 250 mSv → rojo · > 54 µSv/h → ámbar | [A] ⚠️ |
| Ambiente cerrado | CO₂ alto | Promedio de 1 h > 3 mmHg | [A] |
| Ambiente cerrado | O₂ de cabina bajo | < 127 mmHg | [A] |
| Ambiente cerrado | O₂ en sangre bajo | ≤ 92 % ámbar, ≤ 88 % rojo, sostenido 30 s; si la cabina también está baja, lo dice | [T] 🔶 |
| Ambiente cerrado | Temperatura de cabina | Fuera de 18–27 °C | [A] |
| Ambiente cerrado (inmune) | Posible fiebre | Piel +1 °C **y** FC +10 lpm sobre tu normal, en reposo | tu normal 🔶 |
| Gravedad | Intolerancia ortostática | Tras "me pongo de pie", FC +30 lpm > 30 s | [T] |
| Gravedad | Ritmo irregular | ≥ 15 % de latidos con salto > 20 %, en reposo → "registra un ECG" | 🔶 |
| Gravedad | FC alta o baja en reposo | > 100 o < 40 lpm durante 1 min quieto | [T] |
| — | Sensor sin contacto | 10 s sin piel → no se evalúa nada clínico | calidad |

### 6.2 Reglas de varios días

Fuente: [`reglas_diana.yaml`](../Diana/viabilidad/reglas_diana.yaml) ✅ 30/30 pruebas y diseño de
Julio.

| Peligro | Aviso | Regla |
|---|---|---|
| Aislamiento | **Fatiga acumulada (`FATIGA-03`)** | 3 noches con 1 h menos de sueño **y** FC en reposo alta **y** HRV baja; o sueño, lapsos del PVT-B y FC en reposo con z ≥ 2 |
| Aislamiento | Falta de sueño | Contra tu normal; ≥ 16 h despierto ámbar, ≥ 21 h rojo |
| Aislamiento | Desajuste de horario | Variación de la hora de acostarse; luz alta de noche |
| Gravedad | Pérdida de condición | Ejercicio bajo el plan (1,5 h/día [A]) |
| Radiación | Dosis de misión | Acumulado contra 600 mSv [A] |
| Conducta | Ánimo | PHQ-2 ≥ 2 o ítem 9 > 0 abre PHQ-9; ítem 9 > 0 crítico |
| Conducta | Estrés | z ≥ 2 ámbar, ≥ 3 rojo |

### 6.3 Reglas de orina y riñón

Fuentes: [viabilidad de Katy](viabilidad/RESULTADOS-viabilidad.md), Diana y Bloque 2.

| Regla | Umbral | Validación |
|---|---|---|
| Leucocitos **y** nitritos positivos | Sospecha de infección urinaria → CMO | 🔵 lógica lista, sin datos reales |
| Proteína en tira **junto con** densidad | La proteína en orina concentrada da 15,2 % de falsos positivos; en orina diluida, sensibilidad 46 % | ✅ AUC 0,95 (NHANES, n = 3185) |
| Densidad urinaria | ≥ 1,020 = concentrada | [T] |
| Orina de 24 h | < 1,5 L/día = riesgo de cálculos [T] | [T] |
| Color por cámara | CIE b* ≥ 22,61 | Bloque 2 ⚠️ verificar fuente |

### 6.4 Umbrales oficiales NASA [A]

Todos de NASA-STD-3001 (Vol. 1 Rev C y Vol. 2 Rev F), según el
[catálogo 04 de Iker](../variables-diagnostico/04-inmune-ambiente-equipo-umbrales.md).

| Tema | Umbral |
|---|---|
| Dosis de carrera | < 600 mSv, igual para toda edad y sexo |
| Dosis por evento solar | < 250 mSv; refugio de Orion diseñado para 150 mSv |
| Tasa de dosis de diseño | < 1,3 mSv/día en espacio libre; < 0,9 en superficie |
| Refugio | Montarlo en ≤ 1 h, permanecer hasta 24 h, terminar una caminata espacial en ≤ 2 h |
| CO₂ de cabina | ≤ 3 mmHg promedio de 1 h |
| O₂ inspirado | 145–155 mmHg; mínimo 127 |
| Ruido | 75 dBA en 8 h; alarmas bajo 95 dBA |
| Temperatura y humedad | Entre 18 °C / 75 % y 27 °C / 25 % |
| Aptitud | VO₂máx ≥ 32,9 mL/kg/min para caminata espacial; fuerza ≥ 80 % de la basal |
| Nutrición | 3035 kcal/día; +200 kcal por hora de caminata espacial |
| Agua | ≥ 32 mL/kg/día |
| Masa | No bajar más de 3,3 % de la basal |

### 6.5 Matriz de privacidad

✔ ve el dato · ◐ resumen o estado · 🚨 solo en emergencia activa · ✋ con consentimiento ·
— no lo ve

| Dato | Astronauta | Compañero | CMO | Comandante | Cirujano | Investigación |
|---|---|---|---|---|---|---|
| Estado ●■▲ | ✔ | ◐ si es ▲ o no responde | ✔ | ◐ apto / no apto | ✔ | — |
| Signos vitales | ✔ | 🚨 en vivo | ✔ | — | ✔ resúmenes | ✋ |
| Sueño y PVT-B | ✔ | — | ✔ | ◐ apto / no apto | ✔ | ✋ |
| Ánimo: puntuación | ✔ | — | ◐ semanal (✔ diaria con permiso) | — | ✔ | ✋ |
| Ánimo: diario | ✔ | — | ✋ | — | ✋ | — |
| Salud menstrual | ✔ | — | ✋ o 🚨 | — | ✋ o 🚨 | ✋ |
| Dosis personal | ✔ | — | ✔ | ◐ margen | ✔ | ✋ |
| Alerta solar o del ambiente | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| Ubicación | ✔ | 🚨 | 🚨 | 🚨 | — | — |
| Registro de emergencia | ✔ | ◐ lo que hizo | ✔ | ✔ | ✔ sellado | ✋ |
| Juego | ✔ | ◐ meta | ◐ meta | ◐ meta | — | — |

Excepción única al ✋ del diario: **riesgo de hacerse daño** → CMO y cirujano de vuelo.

---

## 7. Requisitos no funcionales

### 7.1 Disponibilidad y fiabilidad

| ID | Requisito | Medida |
|---|---|---|
| RNF-DIS-01 | Lunna **debe** funcionar sin ninguna red | Demo completa en modo avión |
| RNF-DIS-02 | La app **debe** instalarse como PWA y abrir sin conexión (service worker) | Abre con la red apagada |
| RNF-DIS-03 | Si el LLM o la voz fallan, el semáforo y las alertas **deben** seguir | Prueba con el LLM apagado |
| RNF-DIS-04 | Si se pierde la conexión con una fuente, **debe** decirlo y mostrar la hora del último dato | "sin conexión" en ≤ 10 s |
| RNF-DIS-05 | Tras un reinicio, **no debe** perder datos guardados ni duplicar eventos | Idempotencia por `id` |

### 7.2 Rendimiento

| ID | Requisito | Medida |
|---|---|---|
| RNF-REN-01 | Una condición en vivo **debe** avisar en ≤ 1 s después de cumplirse su regla | Medido con el simulador |
| RNF-REN-02 | El modo emergencia **debe** abrir en ≤ 1 s desde el toque | |
| RNF-REN-03 | El ciclo diario del astronauta **debe** durar ≤ 4 min | Cronometrado |
| RNF-REN-04 | El astronauta **no debería** dedicar más de ~8 min activos al día (Leo) | |
| RNF-REN-05 | La trama **debe** caber en ~44 bytes por segundo | ✅ |

### 7.3 Usabilidad y accesibilidad

| ID | Requisito | Medida |
|---|---|---|
| RNF-USA-01 | El estado **no debe** depender solo del color: forma + color + texto | Prueba en escala de grises |
| RNF-USA-02 | Botones de ≥ 44 × 44 px en iPad y celular (se usa flotando o con prisa) | |
| RNF-USA-03 | En emergencia: un paso por pantalla, texto grande, sin scroll ni decisiones | |
| RNF-USA-04 | Lenguaje simple: no suponer conocimiento médico | Cada término con su explicación |
| RNF-USA-05 | Respetar *reduced motion*; animaciones < 300 ms | ✅ maqueta de Leo |
| RNF-USA-06 | Contraste suficiente para leer en la iluminación de la nave | |

### 7.4 Portabilidad

| ID | Requisito | Medida |
|---|---|---|
| RNF-POR-01 | Una sola base de código para laptop, iPad y celular | PWA |
| RNF-POR-02 | Ningún módulo **debe** depender de una marca de dispositivo | Todo entra por la trama |
| RNF-POR-03 | Agregar una fuente nueva **debe** ser escribir un adaptador, sin tocar el motor | `FuenteTelemetria` |

### 7.5 Mantenibilidad y auditoría

| ID | Requisito | Medida |
|---|---|---|
| RNF-MAN-01 | Las reglas **deben** vivir en YAML legible, no en código | Se abre en la demo |
| RNF-MAN-02 | Cada umbral **debe** poder ajustarlo el cirujano de vuelo, con versión | Config versionada |
| RNF-MAN-03 | TypeScript en modo estricto (`strict`, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`) | ✅ |
| RNF-MAN-04 | Pruebas automáticas de códec, validador y reglas | ✅ 19 + 14 + 30 |

### 7.6 Seguridad de la información

| ID | Requisito | Medida |
|---|---|---|
| RNF-SEG-01 | Datos cifrados en reposo | ⬜ |
| RNF-SEG-02 | Registro de accesos que no se puede borrar desde la app | ⬜ |
| RNF-SEG-03 | Sin claves en el repo ni en el chat (Roboflow por variable de entorno) | ✅ |
| RNF-SEG-04 | No se promete anonimato: con 4 personas, quitar el nombre no basta | Dicho en pantalla y en el pitch |

### 7.7 Idioma

| ID | Requisito | Medida |
|---|---|---|
| RNF-IDI-01 | Interfaz seleccionable inglés / español | ⬜ |
| RNF-IDI-02 | Todo lo enviado a Space Apps en inglés | ⬜ |

---

## 8. Seguridad clínica y honestidad

Reglas que **no se negocian**. Un jurado técnico las lee como criterio.

| ID | Regla |
|---|---|
| RS-01 | Lunna **avisa, no diagnostica.** Cada aviso dice qué vio y de dónde sale el umbral |
| RS-02 | **El contenido clínico no se inventa.** Todo paso clínico va marcado "ilustrativo" o con fuente citada (la RCP en microgravedad es distinta y no la conocemos) |
| RS-03 | Lunna **nunca** se presenta como sustituto del CMO ni del entrenamiento médico |
| RS-04 | El modo emergencia lleva un aviso visible de lo anterior |
| RS-05 | **La detección de crisis no la decide el LLM.** Se dispara por regla; la conversación se detiene, aparece "contacta al CMO ahora" y el modelo no genera más |
| RS-06 | La SpO₂ de muñeca **nunca** es la única alerta; se confirma con el pulsioxímetro |
| RS-07 | Un número estimado **nunca** se muestra sin su incertidumbre |
| RS-08 | Los umbrales propios (🔶) **deben** rotularse como propuesta en pantalla |
| RS-09 | Lo simulado se dice en pantalla: signos vitales, dosis y ubicación |
| RS-10 | Las diferencias por sexo son avisos, no diagnósticos: hay pocos datos de mujeres astronautas |

---

## 9. Casos de uso y escenarios

### CU-01 · Ciclo diario nominal

| | |
|---|---|
| Actor | Astronauta |
| Disparo | 07:30, abre Lunna en el iPad |
| Flujo | 1. Lunna ya sincronizó la noche (sueño, HRV, FC en reposo). 2. Check-in de 20 s. 3. PVT-B de 3 min. 4. El motor calcula z contra 14 días y evalúa el YAML. 5. Semáforo, el porqué y qué hacer |
| Resultado | Estado del día en ≤ 4 min |
| Requisitos | RF-TR-01, RF-TR-02, RF-02-01 a 05, RF-08-01 |

### CU-02 · Fatiga antes de una caminata espacial (días 112 → 114)

| | |
|---|---|
| Actor | Ana (MS-2) |
| Disparo | Día 112: `FATIGA-03` dispara (sueño z −2,4, lapsos z +2,2, FC en reposo z +2,0) |
| Flujo | 1. ■ ámbar: "ninguna señal sola dispararía; las tres juntas, sí". 2. Aviso: caminata espacial en 36 h. 3. Ana pregunta "¿por qué?" y ve las 3 señales. 4. Acepta el protocolo; se agenda la reevaluación. 5. Se encola un paquete a Tierra. 6. Día 113: mejora. 7. Día 114: z < 2 dos días → ● verde, evento cerrado. 8. Llega la nota de Tierra con 41 min de antigüedad |
| Resultado | Tomás ve "apta"; Ana ve el detalle |
| Requisitos | RF-02-04 a 08, RF-07-02, RF-07-03, RF-06-01 |

### CU-03 · Evento de partículas solares con buddy check (día 115)

| Hora | Qué pasa | Requisitos |
|---|---|---|
| 11:04 | La tasa de dosis sube; ▲ ROJO para todos: "Dirígete al refugio blindado. Ahora." | RF-04-02, RF-05-06 |
| 11:04 | En pantalla, el evento real de DONKI que sirve de modelo | RF-04-01 |
| 11:05 | Protocolo RAD-01, un paso por pantalla | RF-03-05 |
| 11:06 | Buddy check en el celular o iPad de cada uno | RF-03-09 |
| 11:07 | Luis y Ana se confirman. Mei no; su iPad tiene conexión | RF-03-11 |
| 11:07 | Alerta a Tomás con la última ubicación de Mei; como Mei es la CMO, el nivel 1 queda sin cubrir | RF-03-07, RF-03-10 |
| 11:09 | Mei llega (tenía audífonos). "4 de 4 en el refugio" | RF-03-14 |
| 11:31 | Tasa normal. Dosis personal contra 250 y 600 mSv [A] | RF-04-04, RF-04-05 |
| 11:32 | La caminata espacial de Ana sigue en pie | RF-02-08 |
| Ventana | Paquete prioritario a Tierra con la cronología sellada | RF-03-08, RF-07-01 |

### CU-04 · Emergencia activada por un tercero

| | |
|---|---|
| Actor | Rescatista (cualquier tripulante) |
| Flujo | 1. Un toque en el botón de emergencia. 2. "¿Quién es el paciente?" 3. Lunna trae su línea base. 4. Abre el registro con SCET en T+0. 5. Avisa al CMO salvo que sea el paciente. 6. Pasos uno por pantalla, sellados. 7. Paquete prioritario |
| Requisitos | RF-03-01 a 08 |

### CU-05 · Hipoxia (ilustrativo, maqueta de Leo)

SpO₂ 97 → 84 %, pulso 62 → 128, respiración 14 → 26, presión 116/74 → 94/60. Se activa
sola por SpO₂; el avatar mengua; los pasos dicen "ilustrativo". Si el O₂ de cabina también
está bajo, Lunna dice que afecta a todos. Requisitos: RF-03-01, RF-03-15, RF-19-06, §6.1.

### CU-06 · Check-in de salud mental con ítem 9

PHQ-2 = 1 con ítem 9 = 1 → se abre el PHQ-9 → alerta crítica a la CMO y a Tierra aunque el
total sea bajo; el asistente se detiene. Requisitos: RF-08-02 a 05, RS-05.

### CU-07 · Tira de orina por foto

Foto con el iPad → modelo o colorimetría → densidad y proteína. Si la orina está
concentrada, Lunna no alarma por proteína sola. Requisitos: RF-10-10, §6.3.

### CU-08 · Dispositivo nuevo

Se conecta una fuente que no da HRV. Lunna lee `CAPACIDADES` y la pantalla de HRV **no
aparece**. Requisitos: RI-HW-03, RNF-POR-03.

---

## 10. Trazabilidad con el reto y el jurado

### 10.1 El reto, punto por punto

Fuente: [página del reto](https://www.spaceappschallenge.org/2026/challenges/health-monitoring-software/) ✅.

| El reto pide o sugiere | Requisitos de Lunna |
|---|---|
| Herramienta visual para que el astronauta evalúe su propia salud | RF-01-01 a 07 |
| Guía de tratamientos y mejoras | RF-02-06, RF-07-05, RF-13-01 |
| Presión, FC, glucosa, temperatura, sueño, ánimo | RF-01-02, §5.2–§5.4 |
| Entrada por teclado, clics o cámara | RF-TR-07, RF-TR-08 |
| Usar HRP y otras agencias | §6.4, RF-04-01, Bio-Monitor (CSA) |
| ¿Qué se puede medir en el espacio y por qué? | RD-02, §5 |
| ¿Cuándo amerita atención de la tripulación o de Tierra? | RF-TR-05, RF-07-05 |
| ¿Qué hacer para prevenir? | Módulo 2 |
| Animación e interactividad; figura humana clicable | RF-01-01, RF-19-06 |
| Distintos entornos (nave, estación, rover, Luna, Marte) | RF-17-01 |
| Pedir mediciones dentro de la rutina | RF-05-04 |
| Gamificación | Módulo 12 |
| Gráficas dinámicas | RF-01-03 |
| Código de colores | RI-UI-02 |
| No suponer conocimiento médico | RNF-USA-04, RF-13-03 |

### 10.2 Criterios del jurado

| Criterio | Qué lo respalda |
|---|---|
| **Impacto** | Autonomía médica con 18 min de retraso; beneficio en la Tierra (comunidades remotas, bases antárticas, adultos mayores) |
| **Creatividad** | Línea base personal, buddy check, privacidad por rol, nota de Tierra tardía, trama independiente del hardware |
| **Validez** | [A]/[T] en cada umbral, pruebas con datos reales (§11), reglas auditables, honestidad clínica (§8) |
| **Relevancia** | DONKI real, NASA-STD-3001, HRP, JSC-48031, modelo IMM, Bio-Monitor (CSA) |
| **Presentación** | Demo en modo avión, escenarios CU-02 y CU-03 |

---

## 11. Estado actual del código

| Pieza | Dónde | Estado |
|---|---|---|
| Trama `eva.ble.v1`: códec, condiciones en vivo, simulador, monitor | [trama-base](../trama-base/README.md) | ✅ 19/19 pruebas · ⚠️ firmware sin compilar |
| Trama `eva.telemetry.v1`, validador, adaptadores reloj y manual | [Julio/codigo](../Julio/codigo/TRAMA-TELEMETRIA.md) | ✅ 14 pruebas |
| Lectura de FC por Web Bluetooth | [heart-rate.ts](../Julio/codigo/heart-rate.ts) | ✅ |
| Respiración estimada (Smart Fusion) | [RESULTADOS-smart-fusion](../Julio/codigo/RESULTADOS-smart-fusion.md) | ✅ validada en PhysioNet BIDMC |
| Voz: 13 frases pre-sintetizadas | [Julio/codigo/voz](../Julio/codigo/voz/README.md) | ✅ |
| Ingesta de 78 variables (6591 lecturas, 0 inválidas) | [Leo/ingesta](../Leo/ingesta/README.md) | ✅ |
| Maqueta con el avatar, SOS, hipoxia y demo automática | [Leo/maqueta-eva](../Leo/maqueta-eva/README.md) | ✅ maqueta, datos simulados |
| Reglas YAML de varios días | [Diana/viabilidad](../Diana/viabilidad/RESULTADOS-diana.md) | ✅ 30/30 en Python · ⬜ TypeScript |
| Motor biomédico de radiación, riñón, hueso y laboratorio | [Bloque 2](../../BLOQUE-2/readme_m_dulo_biom_dico_nasa_space_apps_2026.md) | ✅ 6 escenarios en Python |
| Pruebas de viabilidad (ferritina, intestino, hueso, albúmina, espalda) | [Katy/viabilidad](viabilidad/RESULTADOS-viabilidad.md) | ✅ |
| Lectura de tira de orina (Roboflow) | [probar-modelo-tira.mjs](scripts/probar-modelo-tira.mjs) | 🟡 falta una foto real |
| **Falta para la demo** | — | ⬜ `FuenteSintetica` (180 días) · motor en TypeScript con línea base · panel adaptable · buddy check · privacidad · cola a Tierra |

---

## 12. Fuera de alcance y concepto Lunna Band

| Fuera de alcance | Por qué |
|---|---|
| **Software de reloj** | El reto pide software; Lunna recibe datos de cualquier dispositivo por la trama |
| Diagnóstico médico | RS-01 |
| Protocolos clínicos reales | RS-02 |
| Laboratorio en tiempo real (sangre, orina de laboratorio) | A bordo las muestras se congelan y se analizan en Tierra |
| Densidad ósea, SANS, resonancia | Solo en Tierra o con equipo especializado |
| Polisomnografía, EEG, Epworth | Sin equipo operativo o con licencia (Leo) |
| Certificación de vuelo | Fuera del hackathon |

**Lunna Band (💡 concepto, una diapositiva):** un celular o un iPad no se lleva siempre
puesto, y a bordo no hay ningún equipo que se lleve siempre, mida signos vitales sin parar y
avise a la tripulación. Lunna Band sería la siguiente fuente de datos de Lunna y hablaría la
misma trama `eva.ble.v1`. Qué mediría que la camiseta Bio-Monitor no mide, cómo ayudaría en
emergencias y qué haría falta para que vuele:
[Propuesta-reloj-LUNA.md](Propuesta-reloj-LUNA.md).

---

## 13. Criterios de aceptación de la demo

La demo se acepta si **todo** esto pasa en modo avión:

| # | Criterio | Requisitos |
|---|---|---|
| 1 | Se abre la app en laptop, iPad y celular (o en los tres tamaños de pantalla) | RI-UI-01 |
| 2 | Los 4 tripulantes tienen 14 días de línea base sintética | RF-TR-03 |
| 3 | El día 112 de Ana dispara `FATIGA-03` con sus 3 señales y su porqué | CU-02 |
| 4 | Se abre el YAML y se ve una etiqueta [A] con su fuente | RF-02-03, RI-UI-03 |
| 5 | El día 114 cierra en verde y llega la nota de Tierra con su antigüedad | RF-02-07, RF-07-03 |
| 6 | El evento solar del día 115 corre completo con el buddy check y "4 de 4" | CU-03 |
| 7 | La ubicación de Mei se comparte solo durante la emergencia | RF-06-04 |
| 8 | El asistente cambia de tono al pasar a ámbar | RF-19-03 |
| 9 | Ningún paso clínico aparece sin "ilustrativo" | RS-02 |
| 10 | Lo simulado está rotulado | RS-09 |

**Gate T−9 (Julio):** si el arco de prevención (112 → 114) no funciona de punta a punta, se
pausa todo lo 🟡 y 🔵 y el equipo completo termina el núcleo.

---

## 14. Inconsistencias y decisiones pendientes

| # | Tema | Qué pasa | Qué hacer |
|---|---|---|---|
| 1 | **Número de eventos de DONKI** | Son conjuntos distintos, no un error: **51** eventos de dos ventanas de 2024 (la mediana de 17 min se calculó sobre ellos), **119** de todo 2024 (bajados después) y **71** de esos 119 con alerta emitida (análisis de Katy) | Citar siempre la cifra con su conjunto: **17 min sobre 51 eventos**; **12 min sobre los 71 de 2024 con alerta** (recalculado el 14 nov con `donki-sep-2024-01-01_2024-12-31.json`; un evento tiene la alerta 39 min antes de la hora registrada) |
| 2 | **Nombre del asistente** | La maqueta de Leo llama "Luna" al asistente y "EVA" a la app; ahora el producto es Lunna | Decidir si el asistente también se llama Luna o tiene otro nombre |
| 3 | **Huawei Watch 5** | El código de Leo y de Julio tiene adaptadores para el Watch 5; la decisión nueva es no programar reloj | Dejarlos como **un adaptador más** (RF-22-01), sin presentarlo como el producto |
| 4 | **Identificadores `eva.*`** | El código usa `eva.ble.v1`, `eva.telemetry.v1`, `EVA-SIM` | Conservarlos (C-08) o renombrar todo junto antes de la demo |
| 5 | **"¿Por qué Lunna si la demo va a Marte?"** | Pregunta probable del jurado | Definir la respuesta de una frase |
| 6 | Umbral de alarma de dosis | 3000 µSv/h sale de la ISS, con 1 Gy ≈ 1 Sv | Mantener ⚠️ en pantalla |
| 7 | Umbrales de SpO₂ y fiebre | ≤ 92 / ≤ 88 % y ≥ 39,4 °C son propuesta, no oficiales | Rotularlos 🔶 |
| 8 | Glucómetro a bordo | No encontrado | Entrada manual |
| 9 | Revisión por sexo de músculo, metabolismo y sueño | Pendiente (Leo) | Para el módulo 11 |
| 10 | Quién presenta | Decisión 13 sin definir | Equipo |
| 11 | Idioma del repo | Todo lo enlazado debe estar en inglés | README en inglés como mínimo |

---

## 15. Glosario

| Término | Significado |
|---|---|
| **CMO** | Crew Medical Officer: tripulante con entrenamiento médico, no siempre médico |
| **Cirujano de vuelo** | Médico en Tierra que supervisa la salud de la tripulación |
| **SCET** | Spacecraft Event Time: cuándo ocurrió algo a bordo, en UTC |
| **ERT** | Earth Received Time: cuándo lo recibió Tierra |
| **OWLT** | One-Way Light Time: retraso de un trayecto (Marte: 4–24 min) |
| **SCLK** | Reloj de la nave; deriva y se corrige |
| **DONKI** | Base de datos de NASA de clima espacial (eventos solares) |
| **SEP / SPE** | Partículas energéticas solares / evento de partículas solares |
| **HRP** | Human Research Program de NASA: 5 peligros y sus riesgos |
| **NASA-STD-3001** | Estándar de NASA de salud y rendimiento humano |
| **IMM** | Integrated Medical Model de NASA: frecuencia esperada de problemas médicos |
| **Línea base / tu normal** | Mediana y MAD de los últimos 14 días de una persona |
| **z robusto** | Qué tan lejos está un valor de tu normal, usando mediana y MAD |
| **MAD** | Desviación absoluta mediana |
| **PVT-B** | Prueba de reflejos de 3 minutos |
| **PHQ-2 / PHQ-9 / GAD-7** | Cuestionarios de ánimo y ansiedad de uso libre |
| **KSS** | Escala de somnolencia de Karolinska (1–9) |
| **HRV / RMSSD / SDNN** | Variabilidad de la frecuencia cardiaca y sus dos medidas |
| **PPG** | Sensor óptico de pulso |
| **BLE** | Bluetooth de baja energía |
| **PWA** | App web que se instala y funciona sin conexión |
| **Buddy check** | Revisión por parejas: cada quien confirma que su pareja está bien |
| **Caminata espacial** | Actividad fuera de la nave (en inglés, EVA o *spacewalk*) |
| **Contact Surgeon** | Instrucción del checklist médico de NASA: contactar al cirujano de vuelo |
| **DTN** | Red tolerante a interrupciones |

---

## 16. Referencias

**Del reto y de Space Apps**

1. Reto de Space Apps 2026. https://www.spaceappschallenge.org/2026/challenges/health-monitoring-software/
2. Guía del jurado y premios. https://www.spaceappschallenge.org/resources/judging-awards-guide
3. Guía de envío del proyecto. https://www.spaceappschallenge.org/resources/project-submission-guide/

**De NASA y otras agencias**

4. NASA, cinco peligros del vuelo espacial (HRP). https://www.nasa.gov/hrp/hazards/
5. NASA-STD-3001 Vol. 1 Rev C y Vol. 2 Rev F, según el [catálogo 04 de Iker](../variables-diagnostico/04-inmune-ambiente-equipo-umbrales.md)
6. DONKI, eventos SEP, en [stack y dependencias](../Julio/stack-y-dependencias.md)
7. JSC-48031 Rev K, checklist médico del transbordador (2006), en el catálogo de Iker
8. iPads certificados en la ISS. https://ntrs.nasa.gov/citations/20130000791
9. Celulares en Crew-12 y Artemis II (feb 2026). https://appleinsider.com/articles/26/02/05/iphone-in-space-nasa-gives-approval-for-personal-iphones-to-artemis-astronauts
10. Agencia Espacial Canadiense, Bio-Monitor. https://www.asc-csa.gc.ca/eng/sciences/astroskin.asp

**Del equipo**

11. Todas las fuentes de [Propuesta LAZO](Propuesta-LAZO-NASA-SpaceApps-2026.md) (53), de
    [Persona 5](investigacion-variables-persona5.md) (P1–P61), de los catálogos de Iker y de
    la [ingesta de Leo](../Leo/ingesta/README.md) (53 de 54 verificadas).
