# LLM local, persona configurable y voz

Propuesta concreta: qué modelo, qué tamaño, qué librería de voz, y **una inversión de
arquitectura que creo que es la decisión importante de este documento**.

✅ verificado · ⚠️ aproximado o sin verificar · 🔴 riesgo · 🔶 decisión mía

---

## 1. 🔴 La inversión: el LLM no debe orquestar

Pediste un LLM que **orqueste los modelos** para estimar variables. Entiendo por qué, y
propongo lo contrario, por dos razones concretas:

1. **Un modelo de 0,5 B a 1 B es malo llamando funciones.** Orquestar significa decidir
   qué estimador correr y con qué datos. Un modelo pequeño se equivoca en eso, y se
   equivoca **en el escenario, delante del jurado**.
2. **Ya tenemos un orquestador que funciona:** el motor de reglas. Es determinista,
   auditable y lo podemos abrir en pantalla.

### La arquitectura que propongo

```
   Sensores ─┐
   Input ────┼──►  MOTOR DETERMINISTA  ──►  veredicto JSON  ──►  LLM  ──► voz
   Nave ─────┘     (orquesta, calcula,        (datos ya          (sólo
                    decide, cita fuente)       decididos)        redacta)
```

**El LLM nunca ve una señal cruda, nunca calcula, nunca decide.** Recibe un veredicto ya
tomado y lo convierte en una frase, con la personalidad configurada.

🔶 **Por qué esto te da más de lo que pediste, no menos:**

| | LLM orquestando | Motor orquestando |
|---|---|---|
| ¿Puede inventar un número? | **Sí** | **No**: no tiene ninguno que inventar |
| ¿Auditable? | No | **Sí, el JSON y las reglas** |
| ¿Funciona con 0,5 B? | Dudoso | **Sí: redactar es tarea fácil** |
| Si el LLM falla | Se cae todo | **Se cae la prosa, no la salud** |

Ese último punto es el que me convence: **si WebGPU falla en el teléfono del jurado, el
producto sigue funcionando** y sólo pierde las frases bonitas. Con la otra arquitectura,
pierdes la app.

---

## 2. El modelo concreto

✅ Datos verificados de WebLLM (motor de inferencia en el navegador por WebGPU), que
trae ~163 modelos preempaquetados:

| Modelo | Descarga | Memoria de GPU | Veredicto para nosotros |
|---|---:|---:|---|
| **SmolLM2-135M** | ~360 MB | baja | ✅ El más seguro en teléfono |
| **Qwen2.5-0.5B** | ⚠️ ~1–2 GB según fuente | 1–2 GB | 🔶 **Mi recomendación si el equipo cabe** |
| **Llama-3.2-1B** (4 bits) | **~695 MB** | **~880 MB** | ✅ Mejor prosa, ya pide portátil |
| Llama-3.2-3B | ~2,2 GB | 2,2 GB | 🔴 Fuera de alcance |

### 🔴 El problema que hay que mirar de frente

**El soporte de WebGPU en móviles es "limitado e inconsistente".** Una de las fuentes
recomienda directamente **tratar WebLLM como cosa de escritorio**. En teléfono hay que
contar con inferencia lenta, consumo de batería y estrangulamiento térmico.

Navegadores: Chrome y Edge, Safari 26 en iOS, Samsung Internet. **Firefox es el hueco.**

⚠️ Y una advertencia sobre estas cifras: varias vienen de blogs, no de documentación
oficial, y **las fuentes se contradicen en la versión y la fecha de WebLLM**. Tratarlas
como aproximadas.

### 🔶 Qué haría yo para mañana

1. **Correr la demo desde un portátil con Chrome**, no desde el teléfono. El reloj sigue
   conectándose al teléfono; la app puede correr en el portátil.
2. **Modelo: Llama-3.2-1B en 4 bits** (~695 MB) si es portátil; **SmolLM2-135M** si tiene
   que ser teléfono.
3. **Precargar el modelo antes de salir de casa.** WebLLM cachea en el navegador; una vez
   descargado funciona sin red, que es justo nuestro discurso. **Descargar 700 MB en el
   wifi del venue es como perder la demo a propósito.**
4. 🔴 **Respaldo obligatorio, una línea:**

```ts
const usarLLM = 'gpu' in navigator && await navigator.gpu?.requestAdapter() != null;
// si no, redactar con plantillas: el producto no se entera
```

**Redactar con plantillas es indistinguible para el jurado en una frase corta.** Esa
línea es el seguro de la demo.

---

## 3. La voz: una buena y una trampa

### ✅ Salida de voz: `speechSynthesis`, gratis y ya instalada

No hace falta librería: **es una API del navegador**. Usa las voces del sistema
operativo, no requiere descarga, y la personalidad se mapea directo:

```ts
const u = new SpeechSynthesisUtterance(texto);
u.voice = vozElegida;      // persona
u.rate  = 0.95;            // calma en estado ámbar, normal en verde
u.pitch = 1.0;
speechSynthesis.speak(u);
```

⚠️ Verificar que la voz elegida sea **local y no de red**: `voice.localService === true`.
Las voces de red romperían el modo avión.

### 🔴 Entrada de voz: aquí está la trampa

**El `SpeechRecognition` por defecto de Chrome NO corre en el dispositivo.** Verificado:
el navegador graba el micrófono y **envía el audio a un servicio web de Google**. MDN
dice que esa ruta **no funciona sin conexión**.

🔴 **Para un producto que se presenta como "funciona sin Tierra", eso es una
contradicción que un juez puede destapar en una pregunta.** Y peor: estaríamos mandando
a un servidor la voz de alguien hablando de su salud mental.

**Salidas, verificadas:**

| Opción | Estado |
|---|---|
| Opción **en el dispositivo** del propio API | ✅ Existe: *"se puede especificar que el reconocimiento se realice en el dispositivo, lo que garantiza que ni el audio ni la transcripción se envíen a terceros"*. ⚠️ Sólo en navegadores Chromium, y hay que **probarlo** |
| **whisper.cpp en WebAssembly** | ✅ Corre en navegador. Añade descarga de modelo y cómputo |
| **Transformers.js** con Whisper pequeño | ✅ Corre en navegador por WebGPU |

### 🔶 Mi recomendación para mañana

**Voz de salida sí. Voz de entrada no.**

Que el software **hable** es lo que impresiona, es gratis y es offline de verdad. Que
**escuche** añade otra descarga de modelo, otro permiso y una contradicción de privacidad.

**La entrada de voz va en la hoja de ruta**, y se dice así: *"la entrada por voz exige
reconocimiento en el dispositivo; el del navegador manda el audio a un servidor, y eso
no lo aceptamos."* **Eso suena mejor que tenerlo funcionando mal.**

---

## 4. La personalidad configurable

Fácil y segura, **porque sólo toca el tono, nunca el contenido**.

```ts
export interface Persona {
  nombre: string;              // "ARIA"
  formalidad: 0 | 1 | 2;       // tú / neutro / usted
  humor: 0 | 1 | 2 | 3;        // nada → seco → cálido → bromista
  verbosidad: 0 | 1 | 2;       // telegráfico / normal / explicativo
  voz: string | null;          // SpeechSynthesisVoice.name
  ritmo: number;               // 0.8 a 1.2
}
```

### 🔴 Las tres reglas que hacen que esto sea seguro

1. **La personalidad no toca jamás el contenido clínico.** Los números, los umbrales y el
   protocolo vienen del motor. El LLM recibe la instrucción de **no añadir, cambiar ni
   inventar ninguna cifra**, y la frase se valida contra el JSON antes de mostrarse.
2. 🔥 **El humor se apaga solo en ámbar y rojo.** `humorEfectivo = estado === 'verde' ? persona.humor : 0`. Un chiste durante una alerta de fatiga antes de una EVA destruye la confianza en el sistema.
3. **La personalidad se guarda por tripulante**, igual que los datos.

🔶 La regla 2 es la que yo enseñaría en la demo: **cambiar el estado a ámbar y que el
asistente cambie de tono solo.** Se entiende en un segundo y se ve pensado.

### Estructura del prompt

```
SISTEMA:
  Eres {nombre}, asistente de a bordo. Reformula el veredicto que recibes.
  REGLAS DURAS:
   - No inventes ni modifiques ningún número, umbral ni recomendación.
   - No des consejo médico que no esté en el veredicto.
   - Si falta un dato, dilo; no lo rellenes.
   - Máximo {verbosidad} frases.
  TONO: formalidad {0-2}, humor {0-3}.

USUARIO:
  {veredicto JSON del motor}
```

---

## 5. El acompañamiento psicológico, hecho de forma defendible

Lo pediste, y se puede hacer bien. La clave es **qué parte hace el LLM y qué parte no**.

| Tarea | Quién |
|---|---|
| Escuchar, reformular, hacer una pregunta abierta | **LLM** |
| Llevar el diario y detectar la tendencia | **Motor** |
| Pasar **PHQ-9 / GAD-7** y puntuarlos | **Motor**, nunca el LLM |
| Decidir si hay que escalar | **Motor, por regla** |
| Dar consejo clínico | **Nadie.** No está en el alcance |

✅ PHQ-9 y GAD-7 son de uso libre y tienen cortes publicados (5/10/15), según el catálogo
de Iker. **Los puntúa un sumador determinista**, no el modelo.

### 🔴 La regla de crisis, que no es negociable

**La detección de crisis no puede ser un juicio del LLM.** Se dispara por regla —
palabras y patrones en una lista revisable — y cuando se dispara:

1. La conversación **se detiene**
2. Aparece una tarjeta fija: **contactar al CMO ahora**, y encolar a Tierra con prioridad
3. **El modelo no genera ni una palabra más** en ese hilo

🔶 Y el aviso visible permanente: *"soy un apoyo para registrar y ordenar lo que sientes.
No soy un psicólogo y no sustituyo al CMO."*

**Nunca dejar que un modelo de 0,5 B gestione una crisis.** Es la línea que no se cruza,
y decirlo en la presentación es una fortaleza.

---

## 6. Resumen de la propuesta

| Pieza | Elección | Por qué |
|---|---|---|
| **Orquestación** | 🔶 Motor determinista, **no el LLM** | Los modelos pequeños fallan llamando funciones |
| **Modelo** | **Llama-3.2-1B q4** (~695 MB) en portátil · **SmolLM2-135M** (~360 MB) en teléfono | Único tamaño que cabe y basta para redactar |
| **Motor de inferencia** | **WebLLM** sobre WebGPU | Cachea en el navegador: offline tras la primera carga |
| **Respaldo** | Plantillas si no hay WebGPU | 🔴 Obligatorio. Es el seguro de la demo |
| **Voz de salida** | **`speechSynthesis`**, API del navegador | Gratis, sin descarga, offline con voces locales |
| **Voz de entrada** | 🔴 **Fuera por ahora** | El reconocimiento por defecto manda el audio a Google |
| **Personalidad** | Objeto de tono, nunca de contenido | Separa lo bonito de lo clínico |
| **Humor** | **Se apaga solo fuera de verde** | Protege la confianza cuando importa |
| **Psicología** | Escucha y diario sí; diagnóstico y crisis no | Lo que se puede defender ante un jurado |

---

## Fuentes

- WebLLM, motor de inferencia en el navegador (artículo): https://arxiv.org/html/2412.15803v2
- Ejecutar LLM en el navegador con WebGPU, tamaños y soporte móvil: https://pinggy.io/blog/run_llm_in_browser_webgpu/
- Modelos locales en el navegador, WebGPU y WASM: https://maddevs.io/writeups/running-ai-models-locally-in-the-browser/
- MDN, uso del Web Speech API: https://developer.mozilla.org/docs/Web/API/Web_Speech_API/Using_the_Web_Speech_API
- Chrome, introducción al Web Speech API: https://developer.chrome.com/blog/voice-driven-web-apps-introduction-to-the-web-speech-api?hl=en
- Privacidad del Web Speech API del lado del servidor (Chromium): https://groups.google.com/a/chromium.org/g/chromium-html5/c/EJl8kE52MyI
- Reconocimiento de voz en el cliente con Whisper en WASM: https://www.forasoft.com/learn/ai-for-video-engineering/articles-ai/client-side-asr-faster-whisper-wasm-browser
