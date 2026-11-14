# Voz del sistema: decisión cerrada

Qué se probó, qué se midió y qué se decidió. Todo verificado el 14-11-2026 en una
máquina de **4 núcleos sin GPU**, comparable al portátil del equipo (i5-1340P).

---

## La decisión

> **Las frases fijas se pre-sintetizan. Nada de voz generada en vivo.**

No es una limitación que escondamos: es una **decisión de diseño que se defiende sola**.
Un sistema de vuelo no debe improvisar las instrucciones de emergencia.

---

## 1. Lo que se midió

Misma frase en español, misma máquina, sin GPU:

| Motor | Parámetros | Muestreo | Generar | **Factor** | Veredicto |
|---|---:|---:|---|---:|---|
| **MMS-TTS** (`facebook/mms-tts-spa`) | 36 M | 16 kHz | 16,2 s de audio en 3,96 s | **0,25** | 🔴 Robótica. Suena a teléfono |
| **Chatterbox Multilingual** | 500 M | **24 kHz** | 11,5 s de audio en 59,8 s | **5,21** | ✅ **Calidad buena.** 🔴 Inviable en vivo |

**Factor = segundos de cómputo por segundo de audio.** Por debajo de 1 va más rápido que
tiempo real; por encima, más lento.

### Lo que dicen esos números

- **Chatterbox tarda un minuto en decir una frase de once segundos.** No hay ajuste que
  lo salve en CPU: necesitaría GPU.
- **MMS sí corre en tiempo real, pero a 16 kHz suena mal.** El equipo lo escuchó y lo
  descartó.
- No hay término medio disponible: **o calidad, o latencia.**

### ✅ Resultado real del lote

Las 13 frases de la demo, ya generadas y en `audio/`:

| | |
|---|---|
| Frases | **13** |
| Audio producido | **105,8 s** |
| Cómputo | **7,7 min** |
| **Factor medio** | **4,35** |
| Peso en disco | **4,9 MB** |

🔶 **Siete minutos de cómputo, una sola vez, y la demo habla al instante para siempre.**
Ese es exactamente el intercambio que buscábamos.

⚠️ Son WAV sin comprimir. Si 4,9 MB molestan en la PWA, convertir a OGG o MP3 los deja
en una décima parte sin pérdida audible.

---

## 2. Lo que se descartó antes, y por qué

| Opción | Motivo |
|---|---|
| **Kokoro** (`kokoro-js`) | 🔴 Sus 28 voces **son todas en inglés**. Comprobado leyendo la tabla dentro del paquete |
| **Piper** (`piper-tts-web`) | 🔴 Su `dist/` pesa **154 MB** antes de descargar una voz. Pesa más que el propio LLM |
| **Voces del sistema** (`speechSynthesis`) | 🔴 Las locales son las antiguas SAPI y suenan robóticas. Las buenas son **de red** y romperían el modo avión |
| **Voces naturales de Windows 11** | ⚠️ Según varias fuentes quedan **sólo para el Narrador** y no se ven desde Chrome |

---

## 3. Lo que hay en esta carpeta

```
frases.json          Las 13 frases fijas de la demo, con su estado
pre_sintetizar.py    Las genera todas y las guarda como WAV
audio/               Los WAV resultantes
```

### Generarlas

```bash
pip install chatterbox-tts "setuptools<81"
python3 pre_sintetizar.py
```

⚠️ **El `setuptools<81` no es un capricho.** Las versiones nuevas quitaron
`pkg_resources`, y sin él el marcador de agua de Chatterbox se carga como `None` y el
modelo revienta al construirse. Costó un rato encontrarlo.

⚠️ **Chatterbox trunca los textos largos** (avisa con `forcing EOS token`). Por eso el
script **trocea por frases** y concatena. La primera prueba perdió casi cinco segundos
de audio por esto.

---

## 4. Cómo se usa en la aplicación

```ts
// Las frases fijas NO pasan por ningún modelo.
const audio = new Audio(`/voz/${idFrase}.wav`);
audio.play();        // suena al instante
```

🔶 Se guardan en IndexedDB junto al resto, así funcionan sin red igual que todo lo demás.

### Qué queda en vivo

**Sólo la frase personalizada que redacta el LLM.** Es corta, y para ella hay tres
opciones por orden de preferencia:

1. Que tampoco sea en vivo: **plantillas rellenadas con los números del veredicto**, y
   su audio también pre-sintetizado por partes
2. **MMS-TTS** en servidor local: feo pero instantáneo
3. **Sin voz**: se muestra en pantalla y ya

---

## 5. Cómo contarlo en la presentación

> "Las instrucciones de protocolo vienen pre-sintetizadas. No es una limitación técnica:
> **un sistema de vuelo no debe improvisar las instrucciones de emergencia.** Medimos el
> modelo de calidad en el portátil que lleva la demo y tarda cinco segundos de cómputo
> por cada segundo de voz, así que lo usamos donde sí sirve: por adelantado, y a máxima
> calidad."

**Las dos mitades son verdad, y la primera convierte una restricción en criterio.**

🔴 Y en modo emergencia deja de ser una preferencia: **los pasos tienen que sonar ya**.
Un protocolo que tarda tres segundos en empezar a hablar no es un protocolo de
emergencia.

---

## 6. ⚠️ Antes de que esto salga del hackathon

- **Chatterbox marca el audio con filigrana** (`resemble-perth`). Está activo en los WAV
  generados. Es intencional y no se desactivó.
- Licencia de Chatterbox: **MIT**. Es de las pocas permisivas, por eso se eligió.
- Las voces **no están clonadas**: es la voz por defecto del modelo. Para tener hombre y
  mujer, Chatterbox clona desde unos 5 segundos de audio de referencia, y eso **no se ha
  probado todavía**.
