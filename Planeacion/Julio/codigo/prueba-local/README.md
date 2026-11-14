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

## Qué anotar

- Nombre de la GPU y `maxBufferSize`
- Cuántas voces **locales** hay y si alguna es en español
- Qué modelo elegiste, **cuánto tardó en cargar** y los fragmentos por segundo
- Si la frase generada **cambió algún número** del veredicto (no debería)

Ese último punto es el que decide si el modelo elegido sirve: **si inventa cifras, se
baja de tamaño o se usan plantillas.**
