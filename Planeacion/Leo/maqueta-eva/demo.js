/* Demo automática de Lunna (días 112 → 115). Solo se activa con ?demo en la URL.
 * Un dedo simulado toca la propia app; una leyenda explica cada escena. No guarda nada.
 * Primitivas (dedo, leyenda, controles) de la demo original de Leo. */
(function () {
  "use strict";
  if (!window.APP || !window.APP.DEMO) return;
  const $ = (s) => document.querySelector(s);

  const dedo = document.createElement("div");
  dedo.className = "demo-dedo"; dedo.setAttribute("aria-hidden", "true");
  const leyenda = document.createElement("div");
  leyenda.className = "demo-leyenda"; leyenda.setAttribute("role", "status"); leyenda.setAttribute("aria-live", "polite");
  const controles = document.createElement("div");
  controles.className = "demo-controles";
  controles.innerHTML = `<span class="demo-etq">DEMO</span><span class="demo-progreso"><i></i></span>
    <button data-d="pausa" aria-label="Pausar">❚❚</button><button data-d="reiniciar" aria-label="Reiniciar">↺</button><a data-d="salir" href="./" aria-label="Salir">✕</a>`;
  $(".telefono").append(leyenda, controles);
  document.body.classList.add("modo-demo");
  document.body.append(dedo);

  let pausado = false, paso = 0;
  const TOTAL = 34;
  controles.querySelector('[data-d="pausa"]').addEventListener("click", (e) => { pausado = !pausado; e.currentTarget.textContent = pausado ? "▶" : "❚❚"; });
  controles.querySelector('[data-d="reiniciar"]').addEventListener("click", () => location.reload());

  const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
  async function espera(ms) { let t = 0; while (t < ms) { await dormir(50); if (!pausado) t += 50; } }
  const avanzar = () => { paso++; controles.querySelector(".demo-progreso i").style.width = Math.min(100, (paso / TOTAL) * 100) + "%"; };
  async function escena(hora, texto) {
    leyenda.innerHTML = `<b>${hora}</b> ${texto}`;
    leyenda.classList.remove("ver"); void leyenda.offsetWidth; leyenda.classList.add("ver");
    await espera(2000);
  }
  async function buscar(sel, ms) {
    const fin = Date.now() + (ms || 5000);
    while (Date.now() < fin) { const el = document.querySelector(sel); if (el && el.getClientRects().length) return el; await dormir(60); }
    throw new Error("Demo: no encontré " + sel);
  }
  async function mover(el) {
    el.scrollIntoView({ block: "center", behavior: "smooth" }); await espera(450);
    const r = el.getBoundingClientRect();
    dedo.style.opacity = "1"; dedo.style.transform = `translate(${r.left + r.width / 2 - 14}px, ${r.top + r.height / 2 - 14}px)`;
    await espera(520);
  }
  async function tocar(sel, ms) {
    const el = await buscar(sel, ms); await mover(el);
    dedo.classList.add("tocando"); await espera(140);
    el.click();
    dedo.classList.remove("tocando"); avanzar(); await espera(850);
  }
  async function elegir(sel, valor) {
    const el = await buscar(sel); await mover(el);
    el.value = String(valor); el.dispatchEvent(new Event("change", { bubbles: true }));
    avanzar(); await espera(1000);
  }
  const tab = (t) => tocar(`#menu [data-tab="${t}"]`);

  async function guion() {
    await espera(800);
    await escena("D112 · 07:30", "Ana abre Lunna. Su Cuerpo marca la cabeza y el corazón en atención.");
    await tocar('.esc-regiones [data-region="cabeza"]');
    await espera(2400);
    try { await tocar(".hud .hud-x", 2500); } catch { /* sin animación (pestaña oculta): sigue sin el panel */ }

    await escena("D112 · 07:32", "Una alerta nueva: ninguna señal sola dispararía; las tres juntas, sí.");
    await tocar('.aviso-card[data-ir="alertas"]');
    await espera(1500);
    await tocar(".regla summary");
    await escena("D112 · 07:33", "La regla es auditable: se puede abrir frente al jurado.");
    await tocar("#aceptar");
    await tocar('[data-paso="0"]');
    await tocar('[data-paso="1"]');

    await escena("D112 · 07:35", "Lunna flota sobre todo. Al tocarla se ve lo que ve, cómo monitorea y el clima espacial.");
    await tocar(".luna-boton");
    await espera(1800);
    await tocar('[data-sec="monitoreo"]');
    await espera(1800);
    await tocar('[data-sec="clima"]');
    await espera(1800);
    await tocar(".luna-panel .hud-x");

    await escena("D112 · 08:00", "Registrar: todo lo que los sensores no miden.");
    await tab("registrar");
    await tocar('[data-ir="comida"]');
    await tocar('[data-comida="espinaca"]');

    await escena("D112 · 08:05", "Ciclo, privado y al estilo Clue.");
    await tab("ciclo");
    await espera(1200);
    await tocar("#reg-ciclo");
    await tocar('[data-op="Ligero"]');
    await tocar('[data-op="Cólicos"]');
    await tocar("#c-ok");

    await escena("D114 · 07:40", "Dos días después, la fatiga cierra en verde.");
    await tab("ajustes");
    await tocar("#aj-mas");
    await tocar("#aj-mas");
    await tab("hoy");
    await espera(1200);
    await escena("D114 · 07:41", "Llega la nota de Tierra… con 41 minutos de antigüedad.");
    await tocar('.aviso-card[data-ir="tierra"]');
    await espera(3000);

    await escena("D115 · 11:04", "Día 115. ▲ Rojo para todos: evento solar modelado sobre uno real de NASA DONKI.");
    await tab("ajustes");
    await tocar("#aj-mas");
    await tab("hoy");
    await tocar('.aviso-card[data-ir="solar"]');
    await tocar("#llegue");
    await tocar("#paso-sol");
    await escena("D115 · 11:06", "Buddy check: Ana confirma a Luis.");
    await tocar('[data-buddy="si"]', 12000);
    await escena("D115 · 11:07", "Mei no confirma. Su ubicación solo la ve quien la necesita.");
    await buscar("#cerrar-sol", 15000);
    await escena("D115 · 11:09", "Mei llega: tenía audífonos. 4 de 4 en el refugio.");
    await tocar("#cerrar-sol");

    await escena("D115 · 11:32", "Como Tomás, el comandante: ve «apta», nunca el diagnóstico.");
    await tab("ajustes");
    await tocar('[data-persona="MS-1"]');
    await tab("hoy");
    await tocar(".trip-fila .trip:nth-child(1)");
    await espera(2200);

    await escena("Reportes", "El resumen de todo; lo desglosado está en el panel de escritorio.");
    await tab("reportes");
    await espera(2500);

    leyenda.innerHTML = `<b>Fin</b> Todo corrió sin red, a bordo. <button class="demo-otra">Ver otra vez ↺</button>`;
    leyenda.querySelector(".demo-otra").addEventListener("click", () => location.reload());
    dedo.style.opacity = "0";
    controles.querySelector(".demo-progreso i").style.width = "100%";
  }
  guion().catch((e) => { leyenda.innerHTML = `<b>Demo detenida</b> ${e.message}`; console.error(e); });
})();
