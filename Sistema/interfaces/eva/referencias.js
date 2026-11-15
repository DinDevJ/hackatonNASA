/* Valor normal de cada variable, según el motor (GET /api/padecimientos/referencias?tripulante=ID).
 * Solo informativo: no cambia colores ni alertas. Sin backend no hace nada (fallback silencioso).
 * Expone window.REFERENCIAS = { cargar, texto, decorarDetalle, decorarPesos, decorarApp }. */
(function () {
  "use strict";
  const CACHE_MS = 10000;
  const cache = new Map(); // trip -> { t, p }
  const DEC0 = new Set(["lpm", "ms", "/100", "lapsos", "mmHg", "rpm", "brpm", "%", "pasos"]);

  Object.assign(window.LUNNA_EN || (window.LUNNA_EN = {}), {
    "Normal": "Normal", "Normal:": "Normal:", "sin referencia": "no reference",
    "base personal prevuelo": "personal preflight baseline", "poblacional": "population",
    "z pob": "z pop", "z pers": "z pers.", "CUSUM señal ↑": "CUSUM signal ↑", "CUSUM señal ↓": "CUSUM signal ↓",
    "CUSUM señal ↑↓": "CUSUM signal ↑↓", "SIMULADO": "SIMULATED"
  });

  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmt = (x, dec) => (typeof x === "number" && isFinite(x)) ? x.toLocaleString("es", { minimumFractionDigits: 0, maximumFractionDigits: dec }) : "";
  const decDe = (u) => DEC0.has(u) ? 0 : 1;
  const fmtZ = (z) => (typeof z === "number" && isFinite(z)) ? z.toLocaleString("es", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : null;

  function texto(r) {
    if (!r || r.tipo === "sin referencia" || !Array.isArray(r.rango)) return "";
    const d = decDe(r.unidad);
    return `${fmt(r.rango[0], d)}–${fmt(r.rango[1], d)}${r.unidad ? " " + r.unidad : ""}`;
  }
  const hayRef = (r) => !!r && r.tipo !== "sin referencia" && !!texto(r);
  const tip = (r) => [r.calculo, r.fuente].filter(Boolean).join(" · ");

  function cargar(trip) {
    if (!trip) return Promise.resolve(null);
    const c = cache.get(trip);
    if (c && Date.now() - c.t < CACHE_MS) return c.p;
    const p = (async () => {
      try {
        const r = await fetch("/api/padecimientos/referencias?tripulante=" + encodeURIComponent(trip), { cache: "no-store" });
        if (!r.ok) return null;
        const j = await r.json();
        const refs = new Map();
        for (const x of (j && j.referencias) || []) if (x && x.variable_id) refs.set(x.variable_id, x);
        return { refs, simulado: !!(j && j.simulado), etiqueta: (j && j.etiqueta) || null };
      } catch { return null; }
    })();
    cache.set(trip, { t: Date.now(), p });
    return p;
  }

  const sim = (r, d) => (r.simulado || (d && d.simulado)) ? ` <span>·</span> <span class="ref-sim">SIMULADO</span>` : "";

  async function decorarDetalle(el, trip) {
    const d = await cargar(trip);
    if (!d || !el || !el.isConnected) return;
    el.querySelectorAll("table").forEach((tabla) => {
      if (tabla.dataset.ref === "1" || !tabla.querySelector("tr[data-var]")) return;
      tabla.dataset.ref = "1";
      const tr0 = tabla.querySelector("thead tr");
      if (tr0) tr0.insertAdjacentHTML("beforeend", "<th>Normal</th><th>z</th>");
      tabla.querySelectorAll("tr[data-var]").forEach((tr) => {
        const r = d.refs.get(tr.dataset.var);
        let n, z;
        if (!r) { n = `<span class="tenue">sin referencia</span>`; z = "–"; }
        else if (!hayRef(r)) { n = `<span class="tenue" title="${esc(r.motivo || "")}">sin referencia</span>`; z = "–"; }
        else {
          n = `<span title="${esc(tip(r))}"><span class="num">${esc(texto(r))}</span><br><small class="tenue">${esc(r.fuente_corta || r.tipo || "")}</small>${r.simulado ? ` <small class="tenue ref-sim">SIMULADO</small>` : ""}</span>`;
        }
        if (r) {
          const zs = [];
          const zp = fmtZ(r.z_pob), zq = fmtZ(r.z_personal);
          if (zp != null) zs.push(`<small><span>z pob</span> <span class="num">${esc(zp)}</span></small>`);
          if (zq != null) zs.push(`<small><span>z pers</span> <span class="num">${esc(zq)}</span></small>`);
          if (zs.length) z = zs.join("<br>");
          if (r.cusum && /^señal/.test(r.cusum.estado || "")) z = (z === "–" || !z ? "" : z + "<br>") + `<span class="cn-chip c-1">CUSUM ${esc(r.cusum.estado)}</span>`;
        }
        tr.insertAdjacentHTML("beforeend", `<td>${n}</td><td>${z || "–"}</td>`);
      });
    });
  }

  async function decorarPesos(el, trip) {
    const d = await cargar(trip);
    if (!d || !el || !el.isConnected) return;
    el.querySelectorAll(".cn-sem-peso[data-var]").forEach((f) => {
      if (f.dataset.ref === "1") return;
      const r = d.refs.get(f.dataset.var), div = f.querySelector("div");
      if (!hayRef(r) || !div) return;
      f.dataset.ref = "1";
      const zp = fmtZ(r.z_pob);
      const s = document.createElement("small");
      s.className = "tenue"; s.style.display = "block"; s.title = tip(r);
      s.innerHTML = `<span>Normal:</span> <span class="num">${esc(texto(r))}</span> (${esc(r.fuente_corta || r.tipo || "")})` +
        (zp != null ? ` <span>·</span> <span>z pob</span> <span class="num">${esc(zp)}</span>` : "") + sim(r, d);
      div.appendChild(s);
    });
  }

  const MAPA = { "MS-1": "tomas", "MS-2": "ana", "MS-3": "mei", "MS-4": "luis" };
  function tripApp() {
    let m = null;
    try { m = new URLSearchParams(location.search).get("motor"); } catch { /* sin URL */ }
    if (m) return { id: m, demo: true };
    try { const p = window.APP && window.APP.persona && window.APP.persona(); return p && MAPA[p.id] ? { id: MAPA[p.id], demo: false } : null; } catch { return null; }
  }

  async function decorarApp(raiz) {
    raiz = raiz || document;
    const huecos = [...raiz.querySelectorAll(".ref-motor[data-var]")].filter((e) => !e.firstChild);
    if (!huecos.length) return;
    const t = tripApp();
    if (!t) return;
    const d = await cargar(t.id);
    if (!d) return;
    huecos.forEach((e) => {
      if (!e.isConnected || e.firstChild) return;
      const r = d.refs.get(e.dataset.var);
      if (!hayRef(r)) return;
      e.title = tip(r);
      e.innerHTML = `<span>Normal:</span> <span class="num">${esc(texto(r))}</span> (${esc(r.fuente_corta || r.tipo || "")})` +
        (t.demo ? `${sim(r, d)} ${esc(t.id)}` : sim(r, d));
    });
  }

  window.REFERENCIAS = { cargar, texto, decorarDetalle, decorarPesos, decorarApp };

  const st = document.createElement("style");
  st.textContent = ".ref-motor:empty{display:none}";
  document.head.appendChild(st);

  const pant = document.getElementById("pantalla");
  if (pant && window.MutationObserver) {
    let h = 0;
    new MutationObserver(() => { clearTimeout(h); h = setTimeout(() => decorarApp(pant), 150); }).observe(pant, { childList: true, subtree: true });
  }
})();
