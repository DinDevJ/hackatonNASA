# Landing de Lunna

Página de exposición con una sección por pantalla (el desplazamiento salta de una a la siguiente):

1. **Los tres dispositivos de un vistazo:** computadora central, celular y reloj, con sus interfaces reales en vivo.
2. **Video de 30 s** y botón **Probar la simulación**.
3. **LUNNA, matemáticamente:** la actualización bayesiana con un ejemplo interactivo que usa el prior real de presión
   sistólica de las semillas.
4. **Dos criterios de alerta** (personal y umbral clínico) y por qué la calibración se congela.
5. **Modelos de predicción:** LUNNA, base prevuelo encogida, EWMA, CUSUM, semáforo de 20 padecimientos y modelos de ECG/eco.
6. Respaldo y equipo.

Las fórmulas están en MathML (sin librerías). La gráfica de deriva usa datos ilustrativos y así se rotula.

## Verla en local

Igual que en el VPS: un mismo origen sirve la landing en `/` y pasa todo lo demás al backend.

```bash
cd Simulacion && PUERTO=8788 npm start
```

```bash
node landing/servir.mjs
```

Abre http://localhost:8787. Para que las interfaces muestren datos en vivo, abre http://localhost:8787/simulador,
pulsa **Prepare mission** y deja esa pestaña abierta.

Alternativa sin el servidor de la landing: `npm start` en `Simulacion/` (puerto 8787), `python3 -m http.server 3000`
desde la raíz del repo y abre http://localhost:3000/landing/. Las interfaces se cargan desde `http://localhost:8787`
(o el que pases en `?backend=…`).

## En el VPS

[`despliegue/`](../despliegue/README.md) instala nginx con la landing en `/` y el backend detrás.
