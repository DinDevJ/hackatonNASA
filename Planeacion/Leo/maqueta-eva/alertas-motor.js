/* Alertas de la app con la referencia estadística del motor de padecimientos.
 *
 * Conecta GET /api/padecimientos/referencias?tripulante=ID (la misma que usa referencias.js) con
 * motor.js: si hay referencia utilizable para esa persona y variable, sustituye a «tu normal» en la
 * señal de una sola variable. Los umbrales [A]/[T] y FATIGA-03 no cambian. Sin backend no hace nada.
 * Regla exacta en README.md («Alertas con la referencia del motor»). UMD sin dependencias:
 * module.exports en Node, window.ALERTAS_MOTOR en el navegador. Todo es SIMULADO mientras el
 * backend use el simulador.
 */
(function (raiz) {
  "use strict";

  const MAPA = { "MS-1": "tomas", "MS-2": "ana", "MS-3": "mei", "MS-4": "luis" };
  const NO_COMPARABLE = {
    temperatura: "la app mide temperatura de piel en la muñeca; la del motor para 04:A1 es central/oral (Obermeyer 2017, y el simulador del backend la manda a ~36,6 °C): no son comparables",
  };
  const DEC0 = new Set(["lpm", "ms", "/100", "lapsos", "mmHg", "rpm", "brpm", "%", "pasos"]);

  function normUnidad(u) {
    if (typeof u !== "string") return "";
    const n = u.toLowerCase().replace(/\s+/g, "");
    if (n === "bpm") return "lpm";
    if (n === "brpm") return "rpm";
    if (n === "c" || n === "degc") return "°c";
    return n;
  }

  /** ¿La referencia del motor sirve para decidir sobre el indicador k de la app? */
  function usable(k, ind, r) {
    if (!ind || !r || NO_COMPARABLE[k]) return false;
    if (r.tipo !== "poblacional" && r.tipo !== "base personal prevuelo") return false;
    const g = r.rango;
    if (!Array.isArray(g) || g.length !== 2 || typeof g[0] !== "number" || typeof g[1] !== "number" || !isFinite(g[0]) || !isFinite(g[1]) || g[0] > g[1]) return false;
    const a = normUnidad(r.unidad), b = normUnidad(ind.unidad);
    return a !== "" && a === b;
  }

  function num(x, dec) {
    return x.toFixed(dec).replace(".", ",");
  }
  function textoRango(r) {
    const d = DEC0.has(r.unidad) ? 0 : 1;
    return `${num(r.rango[0], d)}–${num(r.rango[1], d)}${r.unidad ? " " + r.unidad : ""}`;
  }

  /** Devuelve { fuera, texto, tipo, rango, fuente, simulado, variable_id } o null. */
  function decidir(k, ind, r, valor, meta) {
    if (!usable(k, ind, r) || typeof valor !== "number" || !isFinite(valor)) return null;
    meta = meta || {};
    const [lo, hi] = r.rango;
    const fuera = ind.dir === "alto" ? valor > hi : ind.dir === "bajo" ? valor < lo : valor < lo || valor > hi;
    const rango = textoRango(r);
    let texto;
    if (r.tipo === "poblacional") {
      texto = fuera ? `fuera de lo normal: ${rango}, ${r.fuente_corta || r.fuente || ""}` : `dentro de lo normal: ${rango}, ${r.fuente || r.fuente_corta || ""}`;
      texto = texto.replace(/, $/, "");
    } else {
      texto = fuera ? `respecto a tu base prevuelo: ${rango}` : `dentro de tu base prevuelo: ${rango}`;
    }
    const simulado = !!(r.simulado || meta.simulado);
    if (simulado) texto += " · SIMULADO";
    if (meta.demo) texto += ` · ${meta.id}`;
    return { fuera, texto, tipo: r.tipo, rango: [lo, hi], fuente: r.fuente || r.fuente_corta || null, simulado, variable_id: r.variable_id };
  }

  function instalar(M, obtener) {
    M.configurarReferencia((pid, k, valor) => {
      const ind = M.IND[k];
      if (!ind || !ind.varId) return null;
      const d = obtener(pid);
      if (!d || !d.refs) return null;
      const r = d.refs.get ? d.refs.get(ind.varId) : d.refs[ind.varId];
      return decidir(k, ind, r, valor, d);
    });
  }

  const API = { MAPA, NO_COMPARABLE, usable, textoRango, decidir, instalar };
  if (typeof module !== "undefined" && module.exports) { module.exports = API; return; }
  raiz.ALERTAS_MOTOR = API;

  // ------------------------------------------------------------------ arranque (solo navegador)
  try {
    if (!raiz.MOTOR || typeof fetch !== "function" || !raiz.location || !/^https?:$/.test(raiz.location.protocol)) return;
    Object.assign(raiz.LUNNA_EN || (raiz.LUNNA_EN = {}), { "Referencia:": "Reference:" });
    const datos = new Map();
    let firma = null;
    instalar(raiz.MOTOR, (pid) => datos.get(pid) || null);

    const demo = () => { try { return new URLSearchParams(raiz.location.search).get("motor") || null; } catch (e) { return null; } };
    async function traer(id) {
      try {
        if (raiz.REFERENCIAS && raiz.REFERENCIAS.cargar) return await raiz.REFERENCIAS.cargar(id);
        const r = await fetch("/api/padecimientos/referencias?tripulante=" + encodeURIComponent(id), { cache: "no-store" });
        if (!r.ok) return null;
        const j = await r.json();
        const refs = new Map();
        for (const x of (j && j.referencias) || []) if (x && x.variable_id) refs.set(x.variable_id, x);
        return { refs, simulado: !!(j && j.simulado) };
      } catch (e) { return null; }
    }
    async function actualizar() {
      try {
        const enDemo = demo();
        for (const pid of Object.keys(MAPA)) {
          const id = enDemo || MAPA[pid];
          let d = null;
          try { d = await traer(id); } catch (e) { d = null; }
          if (d && d.refs) datos.set(pid, { refs: d.refs, simulado: !!d.simulado, id, demo: !!enDemo });
          else datos.delete(pid);
        }
        const f = JSON.stringify(Object.keys(MAPA).map((pid) => {
          const d = datos.get(pid);
          if (!d) return [pid, null];
          const us = [];
          for (const k of Object.keys(raiz.MOTOR.IND)) {
            const ind = raiz.MOTOR.IND[k];
            const r = ind.varId && d.refs.get ? d.refs.get(ind.varId) : null;
            if (usable(k, ind, r)) us.push([k, r.tipo, r.rango, r.unidad, !!r.simulado]);
          }
          return [pid, d.simulado, d.id, us];
        }));
        if (f === firma) return;
        const primera = firma === null;
        firma = f;
        if (primera && !datos.size) return; // nada cambió respecto a lo ya pintado
        const A = raiz.APP;
        if (A && A.actual && A.ir && ["hoy", "alertas", "reportes", "signos"].includes(A.actual())) A.ir(A.actual(), { reemplazar: true });
      } catch (e) { /* sin backend: tu normal de siempre */ }
    }
    setTimeout(actualizar, 0);
    setInterval(actualizar, 60000);
  } catch (e) { /* silencioso */ }
})(typeof window !== "undefined" ? window : globalThis);
