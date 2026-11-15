/* Lunna · idioma. La app está escrita en español; con el idioma en inglés, esta capa cambia cada texto visible
 * (y aria-label, title, placeholder y alt) por su traducción de idioma-en.js, sin tocar el resto del código.
 *
 * Cómo empata: el texto se normaliza (espacios) y cada número se cambia por {n}, así "Día 112 de 210" y
 * "Día 113 de 210" usan la misma entrada "Día {n} de {n}" → "Day {n} of {n}". Los números se pasan al
 * formato inglés (coma decimal → punto). Lo que no está en el diccionario se queda en español.
 *
 * Uso: Lunna.idioma.poner("en" | "es"). Se guarda en el navegador; ?idioma=en lo fuerza en la URL.
 * ?recolectar guarda en window.__faltan los textos que aún no tienen traducción (para ampliar el diccionario).
 */
(function () {
  "use strict";
  const CLAVE = "lunna-idioma";
  const leer = () => { try { return localStorage.getItem(CLAVE); } catch (e) { return null; } };
  const q = new URLSearchParams(location.search);
  let lang = q.get("idioma") === "en" || q.get("idioma") === "es" ? q.get("idioma") : leer() === "en" ? "en" : "es";
  const recolectar = q.has("recolectar");
  const faltan = (window.__faltan = window.__faltan || new Set());

  const DIC = window.LUNNA_EN || {};
  const LETRA = /[A-Za-zÁÉÍÓÚÜáéíóúüñÑ¿¡]/;
  const NUM = /\d+(?:[.,   ]\d+)*/g;
  const ATRIBUTOS = ["aria-label", "title", "placeholder", "alt"];
  const SALTAR = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "CODE", "PRE"]);

  /** "0,57" → "0.57" · "86 400" → "86,400" · "12.345" (miles) → "12,345". */
  function numEn(m) {
    if (m == null) return "";
    // Con espacio: solo es separador de miles si cada grupo tiene 3 cifras ("86 400"); si no, son dos
    // números seguidos ("D112 07:42") y se dejan como están.
    if (/[   ]/.test(m)) {
      const grupos = m.split(/[   ]/);
      if (!grupos.slice(1).every((g) => /^\d{3}(?:,\d+)?$/.test(g))) return m;
      return grupos.join(",").replace(/,(\d{1,2})$/, ".$1");
    }
    if (/^\d{1,3}(\.\d{3})+$/.test(m) && !m.includes(",")) return m.replace(/\./g, ",");
    return m.replace(",", ".");
  }
  function claveDe(t) {
    const nums = [];
    const k = t.replace(/\s+/g, " ").trim().replace(NUM, (m) => { nums.push(m); return "{n}"; });
    return [k, nums];
  }
  /** La traducción de una clave; si no está entera, prueba por partes separadas con « · » (listas de comida,
   *  etiquetas compuestas). Devuelve null si alguna parte con letras no tiene traducción. */
  function claveEn(k) {
    if (DIC[k] != null) return DIC[k];
    if (!k.includes(" · ")) return null;
    const partes = k.split(" · ");
    const out = [];
    for (const p of partes) {
      if (!LETRA.test(p)) { out.push(p); continue; }
      const v = DIC[p.trim()];
      if (v == null) return null;
      out.push(v);
    }
    return out.join(" · ");
  }
  /** Traducción de un texto, o null si no hay que cambiarlo. */
  function traducir(t) {
    if (!t || !LETRA.test(t)) return null;
    const [k, nums] = claveDe(t);
    const v = claveEn(k);
    if (v == null) { if (recolectar && k.length < 900) faltan.add(k); return null; }
    if (v === k && !nums.some((n) => /[,.\s]/.test(n))) return null;
    let i = 0;
    const out = v.replace(/\{n\}/g, () => numEn(nums[i++]));
    return t.match(/^\s*/)[0] + out + t.match(/\s*$/)[0];
  }

  // Original de cada texto y atributo traducido, para volver al español sin recargar.
  const original = new WeakMap();      // nodo de texto → texto en español
  const puesto = new WeakMap();        // nodo de texto → lo que escribimos nosotros
  const attrOriginal = new WeakMap();  // elemento → { atributo: valor en español }

  function textoNodo(n) {
    if (lang !== "en") return;
    const actual = n.data;
    if (puesto.get(n) === actual) return;          // lo escribimos nosotros
    const tr = traducir(actual);
    if (tr == null || tr === actual) return;
    original.set(n, actual);
    puesto.set(n, tr);
    n.data = tr;
  }
  function atributos(el) {
    if (lang !== "en" || !el.getAttribute) return;
    for (const a of ATRIBUTOS) {
      const v = el.getAttribute(a);
      if (!v) continue;
      const guardado = attrOriginal.get(el) || {};
      if (guardado["en:" + a] === v) continue;
      const tr = traducir(v);
      if (tr == null || tr === v) continue;
      guardado[a] = v; guardado["en:" + a] = tr;
      attrOriginal.set(el, guardado);
      el.setAttribute(a, tr);
    }
  }
  function recorrer(raiz) {
    if (!raiz) return;
    if (raiz.nodeType === 3) { if (!SALTAR.has(raiz.parentNode && raiz.parentNode.nodeName)) textoNodo(raiz); return; }
    if (raiz.nodeType !== 1 && raiz.nodeType !== 9 && raiz.nodeType !== 11) return;
    if (raiz.nodeType === 1) { if (SALTAR.has(raiz.nodeName)) return; atributos(raiz); }
    const w = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
      acceptNode: (n) => (n.nodeType === 1 && SALTAR.has(n.nodeName) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
    });
    let n;
    while ((n = w.nextNode())) n.nodeType === 3 ? textoNodo(n) : atributos(n);
  }
  function titulo() {
    if (lang !== "en") return;
    const tr = traducir(document.title);
    if (tr && tr !== document.title) { document.__tituloEs = document.__tituloEs || document.title; document.title = tr; }
  }

  const obs = new MutationObserver((lista) => {
    if (lang !== "en") return;
    for (const m of lista) {
      if (m.type === "characterData") textoNodo(m.target);
      else if (m.type === "attributes") atributos(m.target);
      else m.addedNodes.forEach(recorrer);
    }
  });
  function observar() {
    obs.observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATRIBUTOS });
  }

  /** Vuelve al español todo lo que traducimos. */
  function restaurar() {
    const w = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    let n;
    while ((n = w.nextNode())) {
      if (n.nodeType === 3) { const o = original.get(n); if (o != null && puesto.get(n) === n.data) { n.data = o; puesto.delete(n); } }
      else { const g = attrOriginal.get(n); if (g) { for (const a of ATRIBUTOS) if (g[a] != null && n.getAttribute(a) === g["en:" + a]) n.setAttribute(a, g[a]); attrOriginal.delete(n); } }
    }
    if (document.__tituloEs) document.title = document.__tituloEs;
  }

  function poner(nuevo) {
    nuevo = nuevo === "en" ? "en" : "es";
    try { localStorage.setItem(CLAVE, nuevo); } catch (e) { /* sin almacenamiento: solo esta visita */ }
    if (nuevo === lang) return;
    lang = nuevo;
    document.documentElement.lang = lang;
    if (lang === "en") { recorrer(document.documentElement); titulo(); } else restaurar();
    document.dispatchEvent(new CustomEvent("lunna:idioma", { detail: lang }));
  }

  window.Lunna = window.Lunna || {};
  window.Lunna.idioma = { actual: () => lang, poner, traducir, alternar: () => poner(lang === "en" ? "es" : "en") };

  document.documentElement.lang = lang;
  observar();
  const arrancar = () => { if (lang === "en") { recorrer(document.documentElement); titulo(); } };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", arrancar); else arrancar();
})();
