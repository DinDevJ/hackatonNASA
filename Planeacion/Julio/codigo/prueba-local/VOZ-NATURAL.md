# Voz natural de verdad: qué existe y qué cuesta

Para conseguir la calidad de ChatGPT o Gemini. Verificado el 14-11-2026.

---

## 1. 🔴 Lo primero, sin rodeos

**Esa calidad no existe dentro de un navegador.** ChatGPT y Gemini corren modelos
grandes en servidores con GPU de centro de datos. Lo que cabe en una pestaña —Kokoro,
MMS, Piper— es otra liga.

**Pero no hace falta renunciar.** Hace falta *salir del navegador*:

```
   PWA  ──►  http://localhost:8080/tts  ──►  servidor Python en TU portátil
                                              (Chatterbox / MeloTTS / XTTS)
```

**Sigue siendo 100 % local y sin conexión:** nada sale de la máquina. Sólo deja de
correr *dentro* del navegador para correr *al lado*.

🔶 Y para el relato encaja mejor, no peor: **una nave tiene computadoras, no pestañas.**
Un servicio de voz local en el hábitat es más creíble que un navegador haciendo todo.

---

## 2. Las opciones reales, con su licencia

| Modelo | Licencia | Español | Clonación | Nota |
|---|---|---|---|---|
| **Chatterbox Multilingual V3** (Resemble AI) | ✅ **MIT** | ✅ 23+ idiomas | ✅ desde ~5 s | 500 M. La mejor opción permisiva. Marca el audio con una filigrana |
| **MeloTTS** (MyShell) | ✅ **MIT** | ✅ castellano y latino | ❌ no | **Tiempo real en CPU**: factor 0,41 en un i7-12700 |
| **Zonos v0.1** (Zyphra) | ✅ Apache 2.0 | ⚠️ sólo 5 idiomas | ✅ | La de menor consumo de VRAM |
| **Qwen3-TTS** | ✅ Apache 2.0 | ⚠️ 10 idiomas | ✅ desde 3 s | Verificar si incluye español |
| **XTTS-v2** (Coqui) | 🔴 **No comercial** (CPML) | ✅ bueno | ✅ | Proyecto descrito como abandonado |
| **F5-TTS** | 🔴 Pesos **CC-BY-NC** | ✅ | ✅ | De las mejores en calidad, pero no comercial |

⚠️ Las comparativas vienen de blogs y páginas de proveedores, **no de pruebas
independientes**, y **ninguna evalúa el español en concreto**. Hay que escucharlo.

---

## 3. 🔴 El problema de tu portátil

Tu Yoga tiene **i5-1340P con gráfica integrada**. Sin CUDA. Eso significa:

| | En tu portátil |
|---|---|
| **MeloTTS** | ✅ Tiempo real o casi. Es el único pensado para CPU |
| **Chatterbox 500 M** | ⚠️ Varios segundos por frase en CPU |
| **XTTS-v2 / F5-TTS** | 🔴 Lento. Están pensados para GPU |

### La elección honesta

**No puedes tener calidad máxima Y latencia baja en esa máquina.** Hay que elegir:

| Quiero… | Entonces |
|---|---|
| **La mejor calidad posible** | **Pre-sintetizar** con Chatterbox o XTTS. Tarda lo que tarde: es tiempo de construcción, no de demo |
| **Hablar en vivo sin esperas** | **MeloTTS** por servidor local |
| **Las dos cosas** | 🔥 **Mezclarlas**, y es lo que recomiendo |

---

## 4. 🔥 La receta que yo seguiría

1. **Las ~10 frases fijas de la demo** (protocolo, alertas, emergencia) se generan
   **antes**, con **Chatterbox Multilingual** en la mejor calidad que aguante. Se guardan
   como audio en el repositorio. **Suenan al instante, perfectas, sin modelo cargado.**
2. **La frase personalizada que redacta el LLM** va por **MeloTTS** en servidor local.
   Es una frase corta y MeloTTS la hace casi en tiempo real.
3. **Hombre y mujer**: Chatterbox clona desde ~5 s de audio, así que las dos personas
   salen del mismo modelo sin coste extra.

🔶 **Resultado:** el 90 % de lo que dice el sistema suena perfecto e instantáneo, y el
10 % restante suena bien y llega rápido. **Es exactamente lo que hace un asistente de
verdad.**

### Cómo contarlo sin exagerar

> "Las instrucciones de protocolo vienen pre-sintetizadas, porque un sistema de vuelo no
> debe improvisar instrucciones de emergencia. La respuesta personalizada se genera en el
> momento, en un servicio local: nada de esto sale de la nave."

**Las dos mitades de esa frase son verdad, y la primera es una virtud de diseño, no una
limitación.**

---

## 5. ⚠️ Antes de que entre al producto

- **Chatterbox marca el audio con filigrana.** Averiguar si eso afecta a algo.
- **XTTS-v2 y F5-TTS no son comerciales.** Para un hackathon sirven si se declara; para
  un producto, no.
- **Ninguna fuente evalúa el español.** Hay que escuchar las muestras y decidir.
