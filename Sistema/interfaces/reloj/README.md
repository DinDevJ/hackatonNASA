# Lunna en el reloj — interfaces

Maqueta de las pantallas del reloj de la tripulación, con el **diseño global de la maqueta de Leo**
(`Sistema/interfaces/eva`): mismas variables de color y vidrio (`estilos.css`, `tema.css`),
la misma **Lunna** (`luna.js`) y el mismo **motor** con la tripulación y el escenario (`motor.js`).
No copia esos archivos: los carga desde su carpeta, así que cualquier cambio de Leo se ve aquí.

**Los datos son simulados.** Abierto como archivo, todo sale del escenario de la maqueta; con el
backend, el pulso y la SpO₂ vienen del reloj del simulador (que también es sintético). Nada viene de
un reloj real.

## Abrir

Doble clic en `index.html` (no necesita servidor ni internet): se abre como maqueta, en modo
simulación. Debe seguir existiendo `../eva` (`Sistema/interfaces/eva`) en su lugar, porque de ahí toma
estilos, Lunna, motor y `modo.js`.

Con el backend en modo simulación (`cd Simulacion && npm start`):

- **http://localhost:8787/reloj** — la maqueta completa (lleva a `/interfaces/reloj/`).
- **En el simulador** (`/simulador`): al hacer clic en el **reloj** de la astronauta se abre esta
  pantalla en su ventana, igual que el smartphone, el PC y la Tierra. *Frontend* es el reloj (solo el
  reloj, `?embebido&persona=MS-2`, porque es el reloj de Ana) y *Backend*, la terminal del reloj.

En modo operativo (`cd Sistema/backend && npm start`), `/reloj` dice «Modo operativo» en lugar de
mostrar el escenario simulado, del que todavía depende.

### Enlazado al reloj de la simulación

Cuando lo sirve el backend, el reloj usa lo que de verdad llega a la computadora central:

| En el reloj | De dónde sale |
|---|---|
| Pulso y SpO₂ «ahora» (marca **EN VIVO** en la carátula) | Eventos `muestra` de `/api/stream` para esa persona (04:A4 y 04:A3). En el simulador los manda `reloj-ana` cada 5 s; la playera también manda pulso |
| Estado de Lunna | El peor entre el escenario del día y el estado que LUNNA da a sus variables en `GET /api/app/<tripulante>`, releído con cada evento `alerta`. Si lo pone la computadora central, la carátula dice qué variable fue |
| Apagado | Los comandos `apagar` y `encender` de la terminal del reloj en el simulador |

Si en 20 s no llega una lectura, o se pierde la conexión, vuelve al valor simulado y lo dice en la
pantalla de cada dato. Lo demás (temperatura, sueño, estrés, días 106–115) sigue siendo el escenario
simulado: el reloj del simulador no lo mide. Prueba: con *▶ En vivo*, escribe `hipoxia 12` en la
terminal del reloj y la SpO₂ baja en la carátula.

## La carita de Lunna según el estado de la persona

| Estado | Cara de Lunna | Cuándo (modo «Automático») |
|---|---|---|
| **Bien** | `feliz`, luna llena, halo cian | Todo en su normal |
| **Mal** | `preocupada`, luna a medias, halo ámbar | Algo se aleja de su normal (■ atención) |
| **Crítico** | `alerta`, casi luna nueva, halo rojo que late; la pantalla parpadea en rojo | ▲ actúa ahora (p. ej. el evento solar del día 115). Despierta a Lunna aunque sea de noche |
| **Dormido** | `dormida`: ojitos cerrados y «zzz»; la pantalla se atenúa | De 23:00 a 07:00, si no hay nada crítico |

En el panel de simulación se puede forzar cualquiera de los cuatro estados para mostrarlo.

## Pantallas (se deslizan; la corona vuelve a la carátula)

1. **Carátula**: hora, día de misión y Lunna grande con el estado de la persona (tocarla abre lo que Lunna ve).
2. **Ritmo cardiaco**: pulso en vivo (simulado) con latido y gráfica de 40 s; pulso en reposo del día
   contra su normal.
3. **Oxígeno (SpO₂)**: anillo de 80 a 100 %, umbrales del equipo y aviso de que la de muñeca puede
   sobreestimar.
4. **Temperatura**: de piel, 14 días contra la franja de su normal.
5. **Sueño**: horas de anoche, últimas 7 noches y su normal; marca si está durmiendo ahora.
6. **Estado de ánimo (estrés)**: **bajo, normal, intermedio o alto** en la escala del check-in
   (0–100: < 25 · 25–49 · 50–74 · ≥ 75; 🔶 decisión de esta maqueta) y, aparte, contra su normal.
7. **Más signos**: respiración, HRV, ejercicio (meta 90 min), agua (32 mL/kg), dosis de radiación de
   la misión y tasa en cabina.
8. **Lo que Lunna ve**: su resumen y lo que conviene hacer. Lunna avisa; no diagnostica.

Cada dato lleva la forma además del color: ● en su normal · ■ atención · ▲ actúa ahora · ○ sin dato.

## Simulación

Persona (Ana, Luis, Mei, Tomás), día 106–115 (112 fatiga de Ana · 114 cierre · 115 evento solar),
hora real o simulada y estado de Lunna. Persona y día se comparten con el teléfono y las consolas
(claves `eva:persona` y `eva:dia`) cuando se abren desde el mismo origen.

Debajo del reloj interactivo están **los cuatro estados** de la carátula y **todas las pantallas**
lado a lado, para revisarlas sin deslizar.

## Archivos

`index.html` · `reloj.css` (marco del reloj y pantallas) · `reloj.js` (estado, pantallas y navegación).
