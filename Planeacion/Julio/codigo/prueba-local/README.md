# Prueba local: ¿aguanta tu equipo?

Página de diagnóstico para decidir **si el modelo local y la voz son viables** en la
máquina que va a correr la demo.

## Cómo abrirla

Los módulos no cargan desde `file://`, así que hay que servir la carpeta:

```bash
cd Planeacion/Julio/codigo/prueba-local
python -m http.server 8000
```

Luego abrir **http://localhost:8000** en **Chrome o Edge**.

## Qué comprueba

1. **Equipo y WebGPU** — identifica la GPU y mira si el búfer admite un modelo de ~1 B.
   Si aquí sale rojo, el modelo local no corre y hay que usar el respaldo por plantillas.
2. **Voz de salida** — lista las voces y marca con ● las **locales**. Las marcadas con ○
   son de red y **romperían el modo avión**. Permite probar ritmo y tono, que es como se
   configura la personalidad.
3. **Modelo local** — lee la lista real de modelos de WebLLM, filtra los de menos de
   2,6 GB, descarga el elegido y genera una frase.

La prueba de generación usa **el veredicto del día 112 como entrada**, igual que la
arquitectura real: el motor ya decidió, el modelo sólo redacta. Al terminar, lo lee en
voz alta.

## 4 · Voz neural: por qué tardaba y qué cambió

**Dos problemas distintos:**

1. **Pocas voces en español.** Kokoro trae muy pocas. Por eso ahora puedes elegir
   **Piper**, con seis voces en español verificadas en `rhasspy/piper-voices`:
   `es_MX-claude-high`, `es_MX-ald-medium`, `es_AR-daniela-high`,
   `es_ES-davefx-medium`, `es_ES-sharvard-medium`, `es_ES-carlfm-x_low`.
   ⚠️ **El género no está en las fichas del repositorio.** Hay que escucharlas.

2. **Tardaba mucho.** Antes se generaba la frase entera y después sonaba. Ahora Kokoro
   va en **streaming**: se oye la primera frase mientras se generan las siguientes. La
   página mide y te dice **el tiempo hasta el primer audio**, que es el número que
   importa, no el total.

### 🔑 El arreglo de verdad no es el modelo: es no generar casi nada en vivo

**Casi todo lo que dice la app es texto fijo**: los pasos de un protocolo, las cabeceras
de alerta, las instrucciones de emergencia. Eso se puede **sintetizar una sola vez y
guardar el audio en IndexedDB**. Después suena al instante, sin modelo y sin espera.

Sólo la frase personalizada que redacta el LLM necesita síntesis en vivo, y esa es
corta. Con eso la latencia percibida se va casi a cero en el 90 % de lo que habla.

🔶 En emergencia esto deja de ser una optimización y pasa a ser un requisito: **los pasos
del protocolo tienen que sonar ya**, no en tres segundos.

## Qué anotar

- Nombre de la GPU y `maxBufferSize`
- Cuántas voces **locales** hay y si alguna es en español
- Qué modelo elegiste, **cuánto tardó en cargar** y los fragmentos por segundo
- En la voz: **tiempo hasta el primer audio** con Kokoro en streaming, y con qué voz de
  Piper suena mejor el español. Si una voz es hombre o mujer, apúntalo: no está documentado
- Si la frase generada **cambió algún número** del veredicto (no debería)

Ese último punto es el que decide si el modelo elegido sirve: **si inventa cifras, se
baja de tamaño o se usan plantillas.**
