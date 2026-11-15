/* Notificaciones de Tierra para la app Lunna.
 *
 * Cuando la app la sirve el backend de EVA (http://localhost:8787/app/), escucha los avisos y
 * las alertas que el cirujano de vuelo manda desde Tierra y que ya llegaron a bordo
 * (evento "aviso" de /api/stream), y los muestra como notificación del teléfono.
 *
 * Abierta sola (python -m http.server) no hay backend: escucha el enlace simulado que comparten la
 * computadora central (central.html) y la base en Tierra (base.html) en este mismo navegador.
 *
 * Quién la ve: la persona activa en la app si el aviso es para ella o para toda la tripulación;
 * la CMO (Mei) ve también los de los demás. Tocarla abre la pantalla de Tierra.
 */
(function () {
  "use strict";

  // Tripulantes del backend → personas de la app.
  const PERSONA = { tomas: "MS-1", ana: "MS-2", mei: "MS-3", luis: "MS-4" };
  const NOMBRE = { tomas: "Tomás", ana: "Ana", mei: "Mei", luis: "Luis" };
  const CMO = "MS-3";
  let encendido = true;   // el simulador puede "apagar" el teléfono

  const personaActiva = () => {
    try { const v = localStorage.getItem("eva:persona"); return v ? JSON.parse(v) : "MS-2"; } catch { return "MS-2"; }
  };
  const paraMi = (para) => {
    const yo = personaActiva();
    return para === "todos" || PERSONA[para] === yo || yo === CMO;
  };
  const esc = (t) => String(t == null ? "" : t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const hora = (iso) => new Date(iso).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit", hour12: false });

  // ---------- Estilos propios (no tocan los de la app) ----------
  const css = document.createElement("style");
  css.textContent = `
  .noti-pila{position:fixed;top:calc(env(safe-area-inset-top,0px) + 8px);left:50%;transform:translateX(-50%);width:min(420px,calc(100vw - 16px));z-index:9999;display:grid;gap:8px;pointer-events:none}
  .noti{pointer-events:auto;display:grid;grid-template-columns:38px 1fr auto;gap:10px;align-items:start;padding:12px 12px 12px 12px;border-radius:20px;
    background:rgba(255,255,255,.86);color:#0f1b3d;backdrop-filter:blur(18px) saturate(1.4);-webkit-backdrop-filter:blur(18px) saturate(1.4);
    box-shadow:0 10px 30px rgba(15,27,61,.22),0 0 0 1px rgba(15,27,61,.06);font:14px/1.35 "Segoe UI Variable","SF Pro Text",Inter,system-ui,sans-serif;
    cursor:pointer;animation:noti-entra .38s cubic-bezier(.2,.9,.3,1.2) both}
  :root[data-tema="oscuro"] .noti{background:rgba(22,30,70,.86);color:#eef2ff;box-shadow:0 10px 30px rgba(0,0,0,.45),0 0 0 1px rgba(255,255,255,.08)}
  .noti.sale{animation:noti-sale .28s ease-in both}
  @keyframes noti-entra{from{transform:translateY(-120%);opacity:0}to{transform:none;opacity:1}}
  @keyframes noti-sale{to{transform:translateY(-120%);opacity:0}}
  .noti-ic{width:38px;height:38px;border-radius:10px;display:grid;place-items:center;background:linear-gradient(160deg,#38D1F0,#0B8DB8);color:#fff}
  .noti.rojo .noti-ic{background:linear-gradient(160deg,#ff6b6b,#d92d2d)}
  .noti.ambar .noti-ic{background:linear-gradient(160deg,#ffc24d,#e08a00)}
  .noti-ic svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
  .noti-app{font-size:11.5px;letter-spacing:.04em;text-transform:uppercase;opacity:.65}
  .noti-tit{font-weight:700;margin-top:1px}
  .noti.rojo .noti-tit{color:#d92d2d} :root[data-tema="oscuro"] .noti.rojo .noti-tit{color:#ff8a8a}
  .noti.ambar .noti-tit{color:#b86e00} :root[data-tema="oscuro"] .noti.ambar .noti-tit{color:#ffc24d}
  .noti-txt{margin-top:2px;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
  .noti.abierta .noti-txt{-webkit-line-clamp:unset}
  .noti-pie{margin-top:4px;font-size:12px;opacity:.6}
  .noti-x{border:0;background:none;color:inherit;opacity:.5;font-size:18px;line-height:1;padding:2px 4px;cursor:pointer}
  .noti-x:hover{opacity:1}
  @media (prefers-reduced-motion:reduce){.noti,.noti.sale{animation:none}}`;
  document.head.appendChild(css);

  let pila = null;
  const ICONO_TIERRA = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3.5 9h17M3.5 15h17M12 3c2.6 2.6 2.6 15.4 0 18M12 3c-2.6 2.6-2.6 15.4 0 18"/></svg>';
  const ICONO_ALERTA = '<svg viewBox="0 0 24 24"><path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17h.01"/></svg>';
  const ICONO_CMO = '<svg viewBox="0 0 24 24"><path d="M12 3l7 3v5.5c0 4.4-3 8-7 9.5-4-1.5-7-5.1-7-9.5V6z"/><path d="M9 12l2 2 4-4"/></svg>';

  function cerrar(n) { n.classList.add("sale"); setTimeout(() => n.remove(), 300); }

  function mostrar(a) {
    if (!encendido || !paraMi(a.para)) return;
    if (!pila) { pila = document.createElement("div"); pila.className = "noti-pila"; pila.setAttribute("aria-live", "assertive"); document.body.appendChild(pila); }
    const alerta = a.tipo === "alerta", nivel = (a.datos && a.datos.nivel) || "";
    const para = a.para === "todos" ? "para toda la tripulación" : PERSONA[a.para] !== personaActiva() ? `para ${NOMBRE[a.para] || a.para}` : "";
    const n = document.createElement("div");
    n.className = "noti" + (alerta ? " " + nivel : "");
    n.setAttribute("role", alerta ? "alert" : "status");
    const abordo = a.origen === "abordo";   // aviso de la CMO desde la computadora central (sin retraso)
    n.innerHTML = `<div class="noti-ic">${alerta ? ICONO_ALERTA : abordo ? ICONO_CMO : ICONO_TIERRA}</div>
      <div><div class="noti-app">Lunna · ${abordo ? "a bordo" : "Tierra"} · ahora</div>
        <div class="noti-tit">${alerta ? `Alerta ${nivel === "rojo" ? "ROJA" : "ámbar"} ${abordo ? "de la CMO" : "de Tierra"}` : esc(a.de || "Mensaje de Tierra")}${para ? ` <span style="font-weight:400;opacity:.7">· ${esc(para)}</span>` : ""}</div>
        <div class="noti-txt">${esc(a.texto)}</div>
        <div class="noti-pie">${esc(a.de || "Cirujano de vuelo")} · redactado ${hora(a.t_redactado)} · llegó ${hora(a.t_llegada || new Date().toISOString())}</div></div>
      <button class="noti-x" type="button" aria-label="Descartar notificación">×</button>`;
    pila.prepend(n);
    while (pila.children.length > 3) pila.lastChild.remove();
    n.querySelector(".noti-x").addEventListener("click", (e) => { e.stopPropagation(); cerrar(n); });
    n.addEventListener("click", () => {
      if (!n.classList.contains("abierta")) { n.classList.add("abierta"); return; }   // 1.er toque: lee completo
      cerrar(n);
      if (abordo) return;
      try { if (window.APP && window.APP.ir) window.APP.ir("tierra"); } catch { /* sin pantalla de Tierra */ }
    });
    // Las rojas se quedan hasta que alguien las descarte; el resto se va solo.
    if (!(alerta && nivel === "rojo")) setTimeout(() => n.isConnected && cerrar(n), alerta ? 15000 : 9000);
    try { if (navigator.vibrate) navigator.vibrate(alerta ? [200, 100, 200] : 120); } catch { /* sin vibración */ }
  }

  // El simulador avisa si el teléfono está apagado.
  window.addEventListener("message", (e) => {
    if (e.origin === location.origin && e.data && e.data.eva === "energia") encendido = !!e.data.encendido;
  });

  // ---------- Sin backend: el enlace simulado de las consolas, en este mismo navegador ----------
  // La base en Tierra (base.html) y la computadora central (central.html) dejan sus mensajes en
  // localStorage ("lunna:enlace") con la hora en que llegan a bordo: los de Tierra con el retraso de la
  // luz y los de la CMO al instante. Aquí se muestran cuando llegan, con la misma notificación.
  const ID_BACKEND = { "MS-1": "tomas", "MS-2": "ana", "MS-3": "mei", "MS-4": "luis" };
  const NIVEL_LOCAL = { atencion: "ambar", urgente: "rojo" };
  function escucharEnlaceLocal() {
    const CLAVE = "lunna:enlace";
    const leer = () => { try { const x = JSON.parse(localStorage.getItem(CLAVE) || "[]"); return Array.isArray(x) ? x : []; } catch { return []; } };
    const vistos = new Set(leer().filter((m) => m.t_llegada <= Date.now()).map((m) => m.id)); // lo anterior no se repite
    const revisar = () => {
      const ahora = Date.now();
      for (const m of leer()) {
        if (vistos.has(m.id) || m.t_llegada > ahora || (m.sentido !== "subida" && m.sentido !== "abordo")) continue;
        vistos.add(m.id);
        const nivel = NIVEL_LOCAL[m.nivel];
        mostrar({ tipo: nivel ? "alerta" : "aviso", datos: nivel ? { nivel } : null, para: m.pid ? ID_BACKEND[m.pid] : "todos",
          de: m.de, texto: m.texto, t_redactado: new Date(m.t_envio).toISOString(), t_llegada: new Date(m.t_llegada).toISOString(),
          origen: m.sentido === "abordo" ? "abordo" : "tierra" });
      }
    };
    setInterval(revisar, 1000);
    window.addEventListener("storage", (e) => { if (e.key === CLAVE) revisar(); });
    window.NOTIFICACIONES = { mostrar, conectado: false, enlaceLocal: true };
  }

  // ---------- Conexión con el backend ----------
  fetch("/api/salud").then((r) => (r.ok ? r.json() : null)).then((s) => {
    if (!s || !s.version) { escucharEnlaceLocal(); return; }   // abierta sin backend: enlace simulado
    const es = new EventSource("/api/stream");
    es.addEventListener("aviso", (e) => { try { mostrar(JSON.parse(e.data)); } catch { /* evento mal formado */ } });
    window.NOTIFICACIONES = { mostrar, conectado: true };
  }).catch(() => escucharEnlaceLocal());
})();
