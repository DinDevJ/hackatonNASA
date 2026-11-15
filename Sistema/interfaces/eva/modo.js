/* LUNNA · modo de las interfaces: operativo o simulación. Va antes que los demás scripts.
 *
 * El modo lo decide el backend en config.js (window.EVA_CONFIG = { modo, escenario }):
 *   - operativo (Sistema/: npm start)       no se carga el escenario sintético; las pantallas que
 *                                           todavía dependen de él lo dicen en lugar de mostrarlo.
 *   - simulación (Simulacion/: npm start)   el escenario (datos.js, demo.js) llega desde
 *                                           Simulacion/escenarios/interfaces/ y la página lleva el
 *                                           distintivo «SIMULACIÓN · datos sintéticos».
 * Abierta como archivo (sin backend) no hay nada real que mostrar: es la maqueta, en modo simulación,
 * con el escenario leído de la carpeta Simulacion/ del repositorio.
 *
 * Uso en el HTML, en el lugar exacto donde iba cada script del escenario:
 *   <script>EVA_MODO.escenario("datos.js?v=52")</script>
 */
(function () {
  "use strict";
  var yo = document.currentScript;
  var aqui = yo && yo.src ? yo.src.replace(/[^/]*$/, "") : "";
  var c = window.EVA_CONFIG;
  var modo, base;
  if (c && (c.modo === "operativo" || c.modo === "simulacion")) {
    modo = c.modo;
    base = c.escenario ? aqui + c.escenario : null;
  } else if (location.protocol === "file:") {
    modo = "simulacion";
    base = aqui + "../../../Simulacion/escenarios/interfaces/";
  } else {
    modo = "operativo";            // servida sin config.js: nunca se asume simulación
    base = null;
  }
  var sim = modo === "simulacion";

  /** Carga un archivo del escenario sintético en este punto de la página, sólo en simulación. */
  function escenario(archivo) {
    if (sim && base) document.write('<script src="' + base + archivo + '"><\/script>');
  }

  var estilos = false;
  function ponerEstilos() {
    if (estilos) return;
    estilos = true;
    var s = document.createElement("style");
    s.textContent =
      ".eva-sim{position:fixed;left:10px;bottom:10px;z-index:2147483000;pointer-events:none;" +
      "font:700 10.5px/1.3 ui-monospace,SFMono-Regular,Consolas,monospace;letter-spacing:.14em;text-transform:uppercase;" +
      "padding:5px 9px;border-radius:8px;background:rgba(251,191,36,.92);color:#1b1300;box-shadow:0 2px 10px rgba(0,0,0,.25)}" +
      ".eva-operativo{max-width:640px;margin:24px auto;padding:20px 22px;border-radius:18px;" +
      "border:1px solid var(--vidrio-borde,rgba(88,200,255,.35));background:var(--tarjeta,rgba(10,18,64,.6));color:inherit}" +
      ".eva-operativo h2{margin:0 0 8px;font:700 11px/1.3 ui-monospace,Consolas,monospace;letter-spacing:.14em;text-transform:uppercase;color:var(--hud-cian,#2F6FD6)}" +
      ".eva-operativo p{margin:6px 0;line-height:1.45}" +
      ".eva-operativo code{font-family:ui-monospace,Consolas,monospace}";
    (document.head || document.documentElement).appendChild(s);
  }

  /**
   * Lo que muestra en modo operativo una pantalla que todavía se dibuja con el escenario simulado.
   * destino: elemento donde va el aviso. o.que: nombre de la pantalla. o.extra: HTML que va debajo
   * (por ejemplo, los huecos de datos en vivo del backend).
   */
  function operativa(destino, o) {
    o = o || {};
    ponerEstilos();
    if (!destino) return;
    destino.innerHTML =
      '<section class="eva-operativo" role="status"><h2>Modo operativo</h2>' +
      "<p><b>" + (o.que || "Esta pantalla") + "</b> todavía se dibuja con el escenario simulado, " +
      "que no se carga en modo operativo para no presentarlo como datos de la tripulación.</p>" +
      "<p>Para verla con el escenario, arranca el modo simulación: <code>cd Simulacion &amp;&amp; npm start</code>.</p>" +
      (o.extra || "") + "</section>";
  }

  if (sim) {
    var marcar = function () {
      ponerEstilos();
      if (document.querySelector(".eva-sim")) return;
      var b = document.createElement("div");
      b.className = "eva-sim";
      b.setAttribute("role", "note");
      b.textContent = "Simulación · datos sintéticos";
      document.body.appendChild(b);
    };
    if (document.body) marcar(); else document.addEventListener("DOMContentLoaded", marcar);
  }
  document.documentElement.dataset.evaModo = modo;

  window.EVA_MODO = { modo: modo, simulacion: sim, escenario: escenario, operativa: operativa };
})();
