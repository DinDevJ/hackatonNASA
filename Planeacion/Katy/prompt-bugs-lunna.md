# Prompt: corregir bugs e incoherencias de Lunna

Auditoría del 14 nov 2026 sobre la rama `feature/frontend-eva-diana` (commit `4fd83dc`).
Se probaron todas las pantallas con los 4 tripulantes, los días 112–115 y los dos temas
(tocando cada botón): **no hay errores de JavaScript ni textos desbordados**. Lo que sigue son
fallas de lógica, navegación y coherencia.

Copia el bloque completo y pégalo en tu agente de código (Claude Code, Cursor, etc.) abierto en la
raíz del repo.

---

```text
Eres desarrolladora front de Lunna, app de salud para astronautas (NASA Space Apps 2026, Equipo
Monarcas). Vas a corregir bugs e incoherencias de la app móvil.

## Contexto
- Rama: feature/frontend-eva-diana. Carpeta: Planeacion/Leo/maqueta-eva/
- Abrir: desde esa carpeta, `python -m http.server 8091` y entrar a http://localhost:8091
- Archivos:
  - motor.js    → datos simulados, "tu normal" (14 días), semáforo, FATIGA-03, lo que Lunna dice (Diana)
  - cuerpo.js   → figura del Cuerpo LUNNA (Diana)
  - app.js      → núcleo: navegación, Inicio, fichas, pantallas de Leo (corazón, sueño, comida,
                  glucosa, síntomas, fuerza), check-in, emergencia, panel flotante de Lunna
  - modulos.js  → Registrar, Ciclo, Reportes, Ajustes, evento solar, privacidad, panel de Lunna
  - tema.css    → diseño (vidrio claro y azul marino); estilos.css y cuerpo.css son la base
  - demo.js     → demo automática (?demo)
- Atajos de URL para probar: ?pantalla=ciclo · ?persona=MS-1 · ?dia=115 · ?tema=oscuro ·
  ?scroll=760 · ?clic=reg-ciclo · ?organo=corazon · ?lunna
- Personas: MS-1 Tomás (comandante), MS-2 Ana, MS-3 Mei (CMO), MS-4 Luis.

## Reglas
- No rompas el motor: `node --test Planeacion/Leo/maqueta-eva/motor.test.mjs` debe seguir en 11/11.
- Respeta el diseño: tokens de tema.css, vidrio, azul marino (sin morado), íconos de trazo sin
  fondo, etiquetas en letra normal (no mayúsculas monoespaciadas), solo celular.
- Todo en español. No inventes contenido clínico: los pasos clínicos van como "Ilustrativo".
- Todo lo simulado sigue rotulado como simulado.
- Antes de programar, dame un plan corto por bug. Commits pequeños. NO hagas push sin que te lo pida.

## Bugs, en orden de prioridad

### ALTA

1. SOS: la paciente siempre es Ana.
   - Dónde: app.js, emergencia() (~línea 1001), usa D.TRIPULACION fijo (datos.js:89).
   - Reproducir: Ajustes → Ver la app como Mei → SOS. Sale "Signos de Ana" y "Aviso enviado a Mei,
     médico de a bordo" (se avisa a sí misma).
   - Esperado: la paciente es quien presiona SOS, con un selector "¿Es otra persona?" para elegir a
     cualquiera de los 4. Si la paciente es la CMO (MS-3): registrar "nivel 1 sin cubrir" y avisar
     al comandante y a Tierra. Nunca avisar a la misma persona que es paciente.

2. SOS sin salida.
   - Al activarlo se ocultan el menú y Lunna, y no hay forma de cancelar una activación accidental
     hasta terminar todos los pasos.
   - Esperado: botón "Fue un error" visible los primeros segundos, con confirmación, que registre
     "emergencia cancelada" y vuelva a Inicio.

3. "Volver" y la pestaña marcada no respetan de dónde vienes.
   - Ficha abierta desde Reportes → Signos: "Volver" lleva a Inicio y se marca Inicio.
   - Corazón, Sueño, Comida, Glucosa, Síntomas y Fuerza abiertos desde Inicio: se marca la pestaña
     Registrar y "Volver" lleva a Registrar.
   - Alertas y Tierra abiertos desde una tarjeta de Inicio: "Volver" lleva a Reportes.
   - Ayuda y Logros no tienen botón Volver.
   - Dónde: app.js, RAIZ (~línea 139) y raizDe(); data-volver en cabecera().
   - Esperado: una pila de navegación. "Volver" regresa a la pantalla anterior y la pestaña marcada
     es la de origen. Todas las pantallas internas tienen botón Volver.

4. Lo que registras no cambia nada.
   - Check-in (ánimo, dolor, cabeza), presión, temperatura y masa se guardan en una lista pero no
     actualizan Inicio, las fichas ni el motor.
   - Dónde: app.js, check-in (~línea 992, botón "Listo"); modulos.js, guardar() (~línea 592).
   - Reproducir: anota ánimo "Mal" en el check-in → Inicio sigue mostrando el mismo ánimo.
   - Esperado: un valor registrado hoy reemplaza el simulado de ese día (capa de "registros del día"
     sobre M.SERIES) y se recalculan semáforo, fichas y Lunna. La tarjeta dice "registrado 08:10".

### MEDIA

5. Glucosa con dos números distintos bajo el mismo nombre.
   - Inicio muestra 83 mg/dL (glucosa en ayunas, del motor); la pantalla Glucosa dice "en rango el
     98 % del día" (parche continuo, datos fijos de la maqueta).
   - Esperado: nombres distintos ("Glucosa en ayunas" y "Tiempo en rango") y la pantalla muestra los
     dos, cada uno con su etiqueta.

6. Datos de Ana para todos.
   - Comida, Síntomas y Fuerza vienen de datos.js (fijos de Ana) y se muestran igual a Luis, Mei y
     Tomás, con la nota "datos de ejemplo de Ana… maqueta" (app.js:645).
   - Esperado: datos por persona desde el motor, o "Sin registro hoy" para quien no tenga.

7. Ciclo promete algo que no hace.
   - La fila "Tu normal se ajusta por fase" (modulos.js ~362) dice que la fase lútea se toma en
     cuenta, pero motor.js no usa la fase del ciclo.
   - Esperado: implementarlo (por ejemplo, en fase lútea ampliar el margen de pulso en reposo y HRV
     en tuNormal) o quitar la promesa.

8. Filas que parecen botones pero no hacen nada.
   - En Ciclo ("Tu ciclo en el espacio") las filas se ven tocables y no responden.
   - Dónde: modulos.js, fila() (~línea 32) siempre crea <button>.
   - Esperado: si no hay destino, renderizar un <div> sin flecha ni efecto de toque.

9. La dosis de radiación es la misma para todos.
   - Reportes → Radiación usa cabina().dosisMision (una sola cifra para los 4), pero se presenta
     como dosis personal. Tampoco hay dosis del evento solar contra 250 mSv por evento.
   - Esperado: dosis por persona y dosis del evento del día 115 al cerrarlo.

10. "Qué procesa" (panel de Lunna) muestra cifras fijas.
    - 86 400 y 17 280 lecturas (modulos.js ~667) no salen de ningún dato.
    - Esperado: calcularlas o rotularlas como "estimado por día".

11. Estado mezclado al recargar.
    - La persona se guarda en el navegador, pero el día vuelve a 112 (app.js:29-30).
    - Esperado: guardar los dos o ninguno.

12. El botón flotante de Lunna tapa contenido.
    - Abajo a la izquierda tapa la nota de privacidad de Tripulación y partes de las tarjetas.
    - Esperado: que se repliegue medio oculto al borde mientras haces scroll y vuelva al soltar.

### BAJA (textos y consistencia)

13. Términos mezclados: "médico de a bordo" (app.js:55, 72, 76, 783), "Oficial médica (CMO)"
    (motor.js) y "CMO". Usa "la CMO (médica de a bordo)" la primera vez y después "CMO".
14. Nombre mezclado: "Lunna", "LUNNA" y "Cuerpo LUNNA". Además queda "Confirma a tu pareja en LUNA."
    (modulos.js ~250). Unifica en "Lunna".
15. "EVA en superficie" en datos.js (líneas 61 y 76): el equipo decidió decir "caminata espacial".
16. La palabra "maqueta" se ve en la app (app.js:645, app.js:818) y "Sesión guardada (simulada)".
    Cámbialo por "datos simulados".
17. Fechas que empiezan en minúscula en los títulos ("jueves, 18 de marzo · día 112"): capitaliza.
18. Idioma: la decisión 12 era español / inglés seleccionable; hoy solo hay español.
19. Tipografía mezclada: los números van en monoespaciada (var(--mono)) y el resto en sans. Unifica
    (sugerencia: la misma sans con font-variant-numeric: tabular-nums).
20. Documentos desactualizados: Planeacion/Katy/ERS-LUNA.md, prompt-front-LUNA.md y Propuesta-EVA.md
    dicen LUNA/EVA y describen la estructura anterior. Actualiza nombre y estructura (Inicio,
    Registrar, Ciclo, Reportes, Ajustes y Lunna flotante).
21. Latencia de DONKI: la propuesta dice "mediana de 17 min" (51 eventos). Con los 71 eventos de 2024
    que tienen alerta sale 12 min. Cita siempre la cifra con su conjunto de eventos.

## Cómo verificar
- motor: `node --test Planeacion/Leo/maqueta-eva/motor.test.mjs` → 11/11.
- Demo: abre `?demo` y debe llegar a "Fin" sin detenerse.
- Barrido sin errores ni desbordes (pégalo en la consola del navegador con la app abierta):

    const A = APP, err = [], des = {};
    for (const per of ["MS-1","MS-2","MS-3","MS-4"]) for (const dia of [112,114,115]) for (const t of ["claro","oscuro"]) {
      A.estado.persona = per; A.estado.dia = dia; document.documentElement.dataset.tema = t;
      for (const p of Object.keys(A.PANTALLAS).filter(x => x !== "emergencia")) {
        try { A.ir(p); } catch (e) { err.push(p + ": " + e.message); continue; }
        for (const el of document.querySelectorAll("#pantalla *")) {
          if (el.closest("svg, pre, .tabla-env") || !el.getClientRects().length) continue;
          const cs = getComputedStyle(el);
          if (cs.display === "inline" || ["auto","scroll","hidden"].includes(cs.overflowX)) continue;
          if (el.scrollWidth > el.clientWidth + 2) des[p + " › " + el.className] = el.textContent.trim().slice(0, 40);
        }
      }
    }
    console.log({ err, des });   // los dos deben quedar vacíos

- Revisa en los dos temas: Inicio, Registrar, Ciclo (con la hoja abierta: ?clic=reg-ciclo),
  Reportes y Ajustes.

## Entrega
Por cada bug: qué cambiaste, en qué archivo y cómo lo probaste. Sin push hasta que lo revisemos.
```
