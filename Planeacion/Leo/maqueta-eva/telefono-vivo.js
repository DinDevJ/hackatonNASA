/* LUNNA · teléfono conectado a la computadora central (backend de Julio).
 *
 * Solo hace algo cuando la app la sirve el backend (http://localhost:8787/app/). Abierta sola
 * (python -m http.server) no hay backend y la app sigue con su escenario simulado.
 *
 *   1. En «Hoy» añade la tarjeta «En vivo»: los signos reales de la persona activa que la central ya
 *      evaluó con LUNNA (GET /api/app/:tripulante), con su semáforo, lo esperado y su banda. Se
 *      actualiza con los eventos «muestra» y «alerta» de /api/stream.
 *   2. Cuando el teléfono entra en modo emergencia, la registra en la central (POST /api/emergencias):
 *      la ven la CMO y, con prioridad 0, Tierra. Al terminar o si «Fue un error», la cierra (PUT).
 */
(function () {
  "use strict";
  const A = window.APP;
  if (!A) return;
  const ID = { "MS-1": "tomas", "MS-2": "ana", "MS-3": "mei", "MS-4": "luis" };
  const N = { verde: 0, ambar: 1, rojo: 2 };
  const esc = (t) => String(t == null ? "" : t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const num = (x, d) => (x == null ? "–" : (d ? Number(x).toFixed(d) : String(Math.round(x))).replace(".", ","));
  const hora = (iso) => (iso ? new Date(iso).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit", hour12: false }) : "");
  const quien = () => ID[A.persona().id];

  let datos = null, error = null, freno = 0;

  async function cargar() {
    try {
      const r = await fetch(`/api/app/${quien()}`, { cache: "no-store" });
      if (!r.ok) throw new Error(`la central respondió ${r.status}`);
      datos = await r.json(); error = null;
    } catch (e) { error = e.message; }
    pintar();
  }
  function tarjeta() {
    if (error) return `<div class="tarjeta tv-vivo"><h3>${A.ic("ondas")} En vivo · computadora central</h3><p class="tenue-12">No pude leer la central: ${esc(error)}. Reintento solo.</p></div>`;
    if (!datos) return `<div class="tarjeta tv-vivo"><h3>${A.ic("ondas")} En vivo · computadora central</h3><p class="tenue-12">Conectando…</p></div>`;
    const vars = (datos.variables || []).filter((v) => v.id !== "X:PAM");
    const conDato = vars.filter((v) => v.valor != null);
    const peor = Math.max(-1, ...conDato.map((v) => N[v.estado] ?? -1));
    const filas = conDato.length ? conDato.map((v) => {
      const n = N[v.estado];
      const dec = /temp/i.test(v.nombre) ? 1 : 0;
      return `<div class="tv-fila"><span class="tv-nom">${esc(v.nombre)}</span>
        <b>${num(v.valor, dec)}<small> ${esc(v.unidad || "")}</small></b>
        ${A.sem(n == null ? null : n)}
        <small class="tv-esp">${v.esperado != null ? `esperado ${num(v.esperado, dec)}${v.banda ? ` (${num(v.banda[0], dec)}–${num(v.banda[1], dec)})` : ""}` : v.calibrando ? "LUNNA aún calibra" : ""}${v.t_scet ? ` · ${hora(v.t_scet)}` : ""}</small></div>`;
    }).join("") : `<p class="tenue-12">Todavía no llegan datos de tus sensores. Asigna tu playera o reloj en la central.</p>`;
    const alertas = (datos.alertas || []).filter((a) => a.estado !== "verde").length;
    return `<div class="tarjeta tv-vivo"><h3>${A.ic("ondas")} En vivo · computadora central <span class="espacio"></span>${peor >= 0 ? A.sem(peor, false) : ""}</h3>
      <p class="tenue-12">${esc(datos.tripulante && datos.tripulante.nombre)} · lo que miden tus sensores ahora, comparado con lo que LUNNA espera de ti${alertas ? ` · ${alertas} alerta${alertas > 1 ? "s" : ""} de LUNNA` : ""}.</p>
      <div class="tv-filas">${filas}</div></div>`;
  }
  function pintar() {
    const p = document.querySelector("#pantalla");
    const ancla = p && (p.querySelector(".checkin-card") || p.querySelector(".escaner"));
    if (!ancla) return;
    const viejo = p.querySelector(".tv-vivo");
    const html = tarjeta();
    if (viejo) { viejo.outerHTML = html; return; }
    ancla.insertAdjacentHTML(ancla.classList.contains("checkin-card") ? "afterend" : "beforebegin", html);
  }

  // ---------- Emergencias ----------
  let emergencia = null, porSOS = false, porError = false;
  async function abrirEmergencia() {
    const p = A.persona();
    const cuerpo = porSOS
      ? { tripulante: ID[p.id], modo: "SOS manual", causa: "La persona pulsó SOS en su teléfono." }
      : { tripulante: ID[p.id], modo: "automático", causa: "El teléfono detectó caída de signos vitales (simulación de hipoxia)." };
    porSOS = false; porError = false;
    try { const r = await fetch("/api/emergencias", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(cuerpo) }); if (r.ok) emergencia = await r.json(); } catch { /* sin central */ }
  }
  async function cerrarEmergencia(resultado) {
    const e = emergencia; emergencia = null;
    if (!e) return;
    try { await fetch(`/api/emergencias/${e.id}`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ resultado }) }); } catch { /* sin central */ }
  }

  function arrancar() {
    const css = document.createElement("style");
    css.textContent = `.tv-filas{display:grid;gap:2px;margin-top:6px}.tv-fila{display:grid;grid-template-columns:1fr auto auto;gap:2px 10px;align-items:center;padding:7px 0;border-top:1px solid var(--separador)}
      .tv-fila:first-child{border-top:0}.tv-nom{font-size:13px;font-weight:600}.tv-fila b{font:650 16px var(--mono,ui-monospace);font-variant-numeric:tabular-nums}.tv-fila b small{font:500 11px var(--letra);color:var(--texto-2)}
      .tv-esp{grid-column:1/-1;font-size:11.5px;color:var(--texto-2)}`;
    document.head.appendChild(css);
    new MutationObserver(() => { if (!document.querySelector("#pantalla .tv-vivo")) pintar(); }).observe(document.querySelector("#pantalla"), { childList: true });
    cargar();
    setInterval(cargar, 15000);
    const es = new EventSource("/api/stream");
    const refresca = (d) => { if (d && d.tripulante && d.tripulante !== quien()) return; const t = Date.now(); if (t - freno < 2000) return; freno = t; cargar(); };
    es.addEventListener("muestra", (e) => { try { refresca(JSON.parse(e.data)); } catch { /* evento mal formado */ } });
    es.addEventListener("alerta", (e) => { try { refresca(JSON.parse(e.data)); } catch { /* evento mal formado */ } });
    window.addEventListener("storage", (e) => { if (e.key === "eva:persona") cargar(); });

    const sos = document.querySelector("#sos");
    if (sos) sos.addEventListener("click", () => { porSOS = true; }, true);
    document.addEventListener("click", (e) => { if (e.target.closest && e.target.closest("#fue-error")) porError = true; }, true);
    const tel = document.querySelector(".telefono");
    let antes = tel.classList.contains("en-emergencia");
    new MutationObserver(() => {
      const ahora = tel.classList.contains("en-emergencia");
      if (ahora && !antes) abrirEmergencia();
      if (!ahora && antes) cerrarEmergencia(porError ? "Activación por error: la persona la canceló." : "La persona salió del modo emergencia en su teléfono.");
      antes = ahora;
    }).observe(tel, { attributes: true, attributeFilter: ["class"] });
  }

  fetch("/api/salud").then((r) => (r.ok ? r.json() : null)).then((s) => { if (s && s.version) arrancar(); }).catch(() => { /* sin backend */ });
})();
