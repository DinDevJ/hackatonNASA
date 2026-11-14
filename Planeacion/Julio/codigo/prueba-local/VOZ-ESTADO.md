# Voz en español: estado verificado

Qué se probó, qué falló y por qué. Todo comprobado el 14-11-2026, no supuesto.

---

## Lo que NO funciona, y por qué

| Opción | Veredicto | Evidencia |
|---|---|---|
| **Kokoro** (`kokoro-js`) | 🔴 **No sirve para español** | Leí la tabla de voces dentro del paquete: **28 voces y todas en inglés** (`af_`, `am_`, `bf_`, `bm_`). Ni una `e*_` |
| **Piper** (`piper-tts-web`) | 🔴 **Demasiado pesado** | El paquete existe en npm, pero su `dist/` pesa **154 MB**: el JS principal 46 MB, el worker de WebGPU 45 MB, los WASM 21 y 11 MB, y el fonemizador 18 MB. **Antes de descargar una sola voz** |
| **Voces naturales de Windows 11** | ⚠️ **Probablemente invisibles para Chrome** | Varias fuentes de terceros dicen que quedan **sólo para el Narrador** y no aparecen en Chrome, Firefox ni Word. No hay confirmación oficial |
| **Voces de red** (Google, Microsoft Online) | 🔴 **Rompen el discurso** | Suenan bien pero **necesitan internet**. Contradicen el modo avión |

🔶 **Mi error anterior:** recomendé Kokoro para español sin comprobar su lista de voces.
Era inglés desde el principio.

---

## Lo que queda

### 1. MMS-TTS español — lo que prueba ahora la página

`Xenova/mms-tts-spa`, arquitectura **VITS**, descrito como *ligero y de baja latencia*,
corre con **transformers.js** en el navegador y tiene versión cuantizada.

⚠️ **Dos limitaciones serias:**
- **Un modelo = un hablante.** Para hombre y mujer harían falta **dos modelos**
- **No encontré métricas de calidad publicadas**, ni confirmé la licencia del repositorio
  base. Una variante afinada que vi está bajo **CC-BY-NC**, que sería un problema

### 2. 🔥 Pre-sintetizar las frases fijas — lo que yo haría

**Esta es la respuesta buena, y no es un apaño.**

Casi todo lo que dice el sistema **no se improvisa**: los pasos del protocolo, las
cabeceras de alerta, las instrucciones de emergencia, el saludo del check-in. En la demo
serán **unas diez frases**.

Esas diez se sintetizan **antes**, con la mejor voz que se consiga — incluso con una
herramienta de escritorio o un servicio en línea, porque es **tiempo de construcción, no
de ejecución** — y se guardan como archivos de audio en el repositorio.

| | Síntesis en vivo | Audio pre-sintetizado |
|---|---|---|
| Latencia | segundos | **cero** |
| Calidad | la del modelo ligero | **la mejor que consigas** |
| Descarga | 80–150 MB | **unos pocos MB** |
| ¿Offline? | tras descargar | **sí, siempre** |
| Hombre y mujer | otro modelo | **gratis** |

🔶 Y es **honesto** mientras se diga así: *"las frases de protocolo vienen
pre-sintetizadas; la personalizada la redacta el modelo en vivo."* **Nadie espera que un
sistema de vuelo improvise las instrucciones de emergencia: justamente no debe hacerlo.**

🔴 Además, en **modo emergencia es un requisito, no una optimización**: los pasos tienen
que sonar ya, no en tres segundos.

### 3. Voces del sistema para lo demás

Robóticas, sí, pero **instantáneas, gratuitas, offline y con hombre y mujer en español**.
Para lo que no esté pre-sintetizado, sirven.

---

## 🔶 Recomendación

1. **Pre-sintetizar las ~10 frases de la demo** con la mejor voz disponible. Resuelve
   calidad, latencia, peso y géneros de una vez.
2. **Probar MMS-TTS** para la frase personalizada que redacta el LLM. Si suena bien,
   entra; si no, esa frase también va con la voz del sistema.
3. **No perder más tiempo en motores neuronales de voz.** Es quince segundos de la demo,
   y ya se han ido dos intentos. El motor de reglas, los datos de DONKI y la validación
   de Smart Fusion valen mucho más ante el jurado.
