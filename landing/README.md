> 🌐 **Español** · [English](README.en.md)

# Landing de Lunna

Página de exposición con una sección por pantalla (el desplazamiento salta de una a la siguiente) y un fondo galáctico
animado (`recursos/cosmos.js`: estrellas, nebulosas, una galaxia, planetas y un satélite; con «reducir movimiento» queda fijo).
Combina la landing por dispositivos con las secciones de la landing de Iker (rama `landing-iker`):

1. **Los tres dispositivos de un vistazo:** computadora central, celular y reloj, con sus interfaces reales en vivo.
2. **Videos:** el oficial (se reproduce solo, en silencio y en bucle, con botones de sonido y pausa) y el del producto,
   y el botón **Probar la simulación**.
3. **La misma lectura, dos personas:** 85 lpm que son alerta para una persona y normal para otra.
4. **LUNNA, matemáticamente:** la actualización bayesiana con un ejemplo interactivo (prior real de presión sistólica).
5. **Dos criterios de alerta** (personal y umbral clínico) y por qué la calibración se congela.
6. **El semáforo de 20 padecimientos**, sus cuatro colores y el riesgo NASA de cada uno.
7. **Modelos de predicción:** LUNNA, base prevuelo encogida, EWMA, CUSUM, semáforo y modelos de ECG/eco.
8. **Qué corre hoy y qué falta** en los modelos de ECG y eco.
9. **Validación:** tres niveles, Inspiration4, pruebas automatizadas y lo que no está verificado.
10. **Galería** del equipo durante el hackatón.
11. Respaldo y equipo, con su perfil de GitHub.

Las fórmulas están en MathML (sin librerías). La gráfica de deriva usa datos ilustrativos y así se rotula.

## Fuentes de cada cifra

| Cifra en la página | Fuente en el repositorio |
|---|---|
| 85 lpm; SIM-A 58,1 ± 2,9 → z 9,17; SIM-B 83,6 ± 3,3 → z 0,43; z poblacional 1,32 (SIMULADO) | `prototipo-salud/validacion/ejemplo_aprende.py`; [`documentacion/README_06…`](../documentacion/README_06_MODELOS_COMPUTACIONALES_ALGORITMOS.md) §4.3 |
| Prior de presión sistólica en órbita: μ₀ = −6,7 %, τ₀ = 5 %, σ_misión = 3 %, σ_día = 5 % | `Sistema/backend/semillas/inicial.json` (`priores_orbita`, variable `01:V1`) |
| Fórmulas de LUNNA (precisión por capa, μ, τ², banda del 95 %, z, P(ruido)) | `Sistema/backend/src/lunna.ts` |
| Mediana de 24 h (criterio personal) y de 5 lecturas en 10 min (umbral) | `Sistema/backend/src/ingesta.ts` |
| Base prevuelo con mínimo de 5 tomas (Coskun 2021), EWMA α = 0,1, tope ±1,5 DE, cuarentena 72 h, CUSUM k = 0,5 y h = 5 | [`documentacion/README_06…`](../documentacion/README_06_MODELOS_COMPUTACIONALES_ALGORITMOS.md) §4.3 · `prototipo-salud/motor/calibracion.py` |
| 20 padecimientos y su riesgo NASA; reglas VERDE / AMARILLO / ROJO / GRIS | `prototipo-salud/datos/modelo/PADECIMIENTOS.csv`; [`documentacion/README_06…`](../documentacion/README_06_MODELOS_COMPUTACIONALES_ALGORITMOS.md) §4.4–4.5 |
| 350 ligas; evidencia 9 A · 31 B · 310 C; pesos 1 a 3 | `prototipo-salud/datos/modelo/PADECIMIENTO-VARIABLE.csv`; [`documentacion/README_07…`](../documentacion/README_07_DICCIONARIO_DATOS_VARIABLES.md) |
| ECG: sensibilidad 0,9987 / 1,0000 / 0,9191 y VPP 1,0000 / 0,9718 / 0,9892 (MIT-BIH 100, 201, 203); PanEcho 42,8 s CPU y 17,4 s CUDA; otros cuatro modelos pendientes; pesos de eco ≈ 6,3 GB | [`documentacion/README_08…`](../documentacion/README_08_PRUEBAS_VALIDACION.md) §4.1–4.2; [`README_06…`](../documentacion/README_06_MODELOS_COMPUTACIONALES_ALGORITMOS.md) §6 |
| Tres niveles de validación | [`documentacion/README_08…`](../documentacion/README_08_PRUEBAS_VALIDACION.md) §1 |
| Inspiration4: 4 civiles, 278 filas, 80/80 GRIS; C002 z −3,5 y C003 z −2,4 con 3 tomas | [`documentacion/README_02…`](../documentacion/README_02_PROTOCOLO_INVESTIGACION.md) §8; [`README_08…`](../documentacion/README_08_PRUEBAS_VALIDACION.md) §4.4 |
| Pruebas: backend 97 (Linux 97 aprobadas; Windows 85 + 12 omitidas); simulación 4/4; navegador 25/25; pytest 148 (131 + 11 + 6 de entorno) | [`documentacion/README_08…`](../documentacion/README_08_PRUEBAS_VALIDACION.md) §3.1 (corridas del 15 nov 2026) |
| Capturas del semáforo y de «Analizar con modelos» | Interfaces de `Sistema/interfaces/eva/` con el escenario SIMULADO (tomadas por Iker) |

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
