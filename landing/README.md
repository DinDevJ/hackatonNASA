> 🌐 **Español** · [English](README.en.md)

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

Un solo comando, igual en Windows (PowerShell), macOS o Linux, desde la raíz del repo:

```bash
node landing/servir.mjs
```

Abre http://localhost:8787. El script sirve la landing en `/` y arranca él mismo el backend en modo simulación en el
puerto 8788 (o reutiliza el que ya esté corriendo ahí), igual que nginx en el VPS. Si el 8787 está ocupado (por
ejemplo, por un `npm start` de `Simulacion/` que quedó abierto), ciérralo o usa otro puerto:
PowerShell `$env:PUERTO=8790; node landing/servir.mjs` · bash `PUERTO=8790 node landing/servir.mjs`.

Para que las interfaces muestren datos en vivo, abre http://localhost:8787/simulador, pulsa **Prepare mission** y deja
esa pestaña abierta.

El botón **ES / EN** cambia la landing y también el idioma de las tres interfaces incrustadas. Se recuerda en el
navegador y se puede forzar con `?idioma=en`.

## En el VPS

[`despliegue/`](../despliegue/README.md) instala nginx con la landing en `/` y el backend detrás.
