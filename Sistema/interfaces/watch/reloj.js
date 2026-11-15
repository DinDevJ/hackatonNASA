/* LUNNA · reloj: las interfaces del reloj de la tripulación.
 *
 * Usa las piezas comunes de las interfaces (Sistema/interfaces/comun) sin copiarlas:
 *   MOTOR (motor.js)  tripulación, días 106–115, «tu normal», semáforo, FATIGA-03 y evento solar
 *   LUNA  (luna.js)   la carita de Lunna; su cara cambia con el estado de la persona:
 *                       bien → feliz · mal → preocupada · crítico → alerta · dormido → dormida (zzz)
 * y las mismas claves de memoria que el teléfono y las consolas ("eva:persona", "eva:dia"),
 * así el reloj muestra a la misma persona y el mismo día.
 *
 * Todo es SIMULADO: el pulso «en vivo» es el pulso en reposo del día más un vaivén; nada viene de un
 * reloj real. Nada aquí diagnostica.
 */
(function () {
  "use strict";
  // Modo operativo: el reloj todavía se dibuja con el escenario simulado; no se muestra.
  const EM = window.EVA_MODO;
  if (EM && !EM.simulacion) {
    // Vista limpia: sólo la pantalla del reloj, sin cabecera ni galerías de la maqueta.
    if (document.documentElement.classList.contains("vista-limpia")) document.documentElement.classList.add("embebido");
    EM.operativa(document.querySelector(".rj-main"), { que: "El reloj" });
    const pil = document.querySelector(".rj-pildora");
    if (pil) { pil.textContent = "Modo operativo"; pil.title = "Sin escenario simulado"; }
    return;
  }
  const M = window.MOTOR, L = window.LUNA;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (t) => String(t == null ? "" : t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmt = (n, dec) => (n == null ? "–" : (dec ? (+n).toFixed(dec) : String(Math.round(n))).replace(".", ","));

  // ---------------------------------------------------------------- memoria compartida con la app
  const mem = {
    leer(k, d) { try { const v = localStorage.getItem("eva:" + k); return v === null ? d : JSON.parse(v); } catch { return d; } },
    guardar(k, v) { try { localStorage.setItem("eva:" + k, JSON.stringify(v)); } catch { /* sin almacenamiento */ } },
  };
  const DIA_MIN = 106, DIA_MAX = M.ULTIMO_DIA;
  const HITOS = [[112, "Fatiga"], [114, "Cierre"], [115, "Evento solar"]];
  const acotar = (d) => Math.max(DIA_MIN, Math.min(DIA_MAX, Math.round(+d) || 112));
  const FECHA0 = Date.UTC(2027, 2, 18); // día 112 = 18 mar 2027, igual que el teléfono y las consolas
  const fechaDia = (d) => {
    const t = new Date(FECHA0 + (d - 112) * 864e5).toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
    return t.charAt(0).toUpperCase() + t.slice(1).replace(/\./g, "");
  };

  // ?embebido → solo el reloj (así lo abre el simulador) · ?persona=MS-2 → persona fija (el reloj es de Ana)
  const Q = new URLSearchParams(location.search);
  // Vista limpia (modo.js): sólo el reloj, sin el panel de la simulación ni las galerías.
  const EMBEBIDO = Q.has("embebido") || document.documentElement.classList.contains("vista-limpia");
  document.documentElement.classList.toggle("embebido", EMBEBIDO);
  const valida = (pid) => M.PERSONAS.some((p) => p.id === pid);
  const S = {
    pid: valida(Q.get("persona")) ? Q.get("persona") : valida(mem.leer("persona", "MS-2")) ? mem.leer("persona", "MS-2") : "MS-2",
    fijo: valida(Q.get("persona")),
    dia: acotar(mem.leer("dia", 112)),
    desfase: null,        // ms que se suman a la hora real (null = hora real)
    forzado: null,        // null = automático · "bien" | "mal" | "critico" | "dormido"
    pantalla: 0,
    apagado: false,       // el simulador puede apagar el reloj («apagar» en su terminal)
  };

  // ---------------------------------------------------------------- estados de Lunna
  const ESTADOS = {
    bien: { cara: "feliz", fase: 1, n: 0, txt: "Todo en tu normal", corto: "Bien" },
    mal: { cara: "preocupada", fase: 0.55, n: 1, txt: "Algo se aleja de tu normal", corto: "Mal" },
    critico: { cara: "alerta", fase: 0.12, n: 2, txt: "Actúa ahora", corto: "Crítico" },
    dormido: { cara: "dormida", fase: 1, n: null, txt: "Durmiendo", corto: "Dormido" },
  };
  const ahora = () => new Date(Date.now() + (S.desfase || 0));
  const horaDecimal = () => { const d = ahora(); return d.getHours() + d.getMinutes() / 60; };
  const esDeNoche = () => { const h = horaDecimal(); return h >= 23 || h < 7; };
  /**
   * Estado de la persona: el peor entre el escenario del día (motor) y lo que LUNNA ve en la computadora
   * central (backend, si lo hay). Lo crítico despierta a Lunna; de noche duerme; si no, bien o mal.
   */
  function estadoAuto(ev) {
    const g = Math.max(ev.general, nivelBackend() ?? 0);
    if (g === 2) return "critico";
    if (esDeNoche()) return "dormido";
    return g === 1 ? "mal" : "bien";
  }

  // ---------------------------------------------------------------- enlace con el backend de Julio
  // Cuando el reloj lo sirve el backend (/reloj, o el reloj del simulador), toma de ahí:
  //   · pulso (04:A4) y SpO₂ (04:A3) de la persona, de los eventos «muestra» de /api/stream
  //     (en el simulador los manda reloj-ana cada 5 s; la playera también manda pulso);
  //   · el estado que LUNNA le da a cada variable, de GET /api/app/<tripulante>, releído en cada «alerta».
  // Abierto como archivo o sin backend, todo sigue simulado. No se inventan rutas ni datos.
  const BACKEND_ID = { "MS-1": "tomas", "MS-2": "ana", "MS-3": "mei", "MS-4": "luis" };
  const VAR = { fc: "04:A4", spo2: "04:A3" };
  const NIVEL_B = { verde: 0, ambar: 1, rojo: 2 };
  const FRESCO_MS = 20000;   // una lectura vale como «ahora» durante 20 s
  const B = { fase: "sin", version: null, ultimo: {}, nivel: {}, peor: {}, leido: null, error: null };
  const lectura = (pid, k) => { const x = B.ultimo[`${BACKEND_ID[pid]}|${VAR[k]}`]; return x && Date.now() - x.t < FRESCO_MS ? x : null; };
  function nivelBackend(pid) { const id = BACKEND_ID[pid || S.pid]; return B.fase === "sin" || !id || B.nivel[id] === undefined ? null : B.nivel[id]; }
  async function leerTripulante(pid) {
    const id = BACKEND_ID[pid];
    if (!id) return;
    const r = await fetch(`/api/app/${encodeURIComponent(id)}`, { cache: "no-store" });
    if (!r.ok) throw new Error(`/api/app/${id} respondió HTTP ${r.status}`);
    const a = await r.json();
    const con = a.variables.filter((v) => v.estado in NIVEL_B);
    const peor = con.sort((x, y) => NIVEL_B[y.estado] - NIVEL_B[x.estado])[0];
    B.nivel[id] = peor ? NIVEL_B[peor.estado] : null;
    B.peor[id] = peor ? { nombre: peor.nombre, estado: peor.estado } : null;
    B.leido = pid; B.error = null;
  }
  let tRelectura = null;
  function releer() {
    clearTimeout(tRelectura);
    tRelectura = setTimeout(() => leerTripulante(S.pid).catch((e) => { B.error = e.message; }).finally(() => cadaSegundo()), 600);
  }
  async function conectarBackend() {
    try {
      const r = await fetch("/api/salud", { cache: "no-store" });
      const s = r.ok ? await r.json() : null;
      if (!s || !s.version) return;
      B.version = s.version;
    } catch { return; }           // abierto como archivo o sin backend: todo simulado
    B.fase = "vivo";
    try { await leerTripulante(S.pid); } catch (e) { B.error = e.message; }
    const es = new EventSource("/api/stream");
    es.addEventListener("muestra", (e) => {
      let m; try { m = JSON.parse(e.data); } catch { return; }
      if (m && m.valor != null) B.ultimo[`${m.tripulante}|${m.variable}`] = { valor: +m.valor, t: Date.now() };
    });
    es.addEventListener("alerta", releer);
    es.onopen = () => { if (B.fase !== "vivo") { B.fase = "vivo"; releer(); } };
    es.onerror = () => { B.fase = "error"; B.error = "se perdió la conexión con el backend; se reintenta solo"; };
    cadaSegundo();
  }

  // ---------------------------------------------------------------- figuras ● ■ ▲ ○ (no depender del color)
  const CLASE = (n) => (n == null ? "nd" : ["ok", "ojo", "alto"][n]);
  const NIVEL_TXT = { 0: "En tu normal", 1: "Atención", 2: "Actúa ahora", nd: "Sin dato" };
  function forma(n, tam) {
    const t = tam || 10;
    const fig = n == null ? '<circle cx="6" cy="6" r="4.2" fill="none" stroke="currentColor" stroke-width="1.6"/>'
      : n === 0 ? '<circle cx="6" cy="6" r="5" fill="currentColor"/>'
      : n === 1 ? '<rect x="1.5" y="1.5" width="9" height="9" rx="1.6" fill="currentColor"/>'
      : '<path d="M6 .8 11.4 10.6H.6z" fill="currentColor"/>';
    return `<svg class="rj-forma f-${CLASE(n)}" viewBox="0 0 12 12" width="${t}" height="${t}" aria-hidden="true">${fig}</svg>`;
  }
  const sem = (n, txt) => `<span class="rj-sem f-${CLASE(n)}">${forma(n)}${txt === false ? "" : esc(txt || NIVEL_TXT[n == null ? "nd" : n])}</span>`;

  // ---------------------------------------------------------------- iconos (trazo limpio, currentColor)
  const IC = {
    corazon: '<path d="M12 20s-7-4.3-8.6-8.3C2 8.2 4.4 5 7.6 5.3c1.9.2 3.2 1.4 4.4 3 1.2-1.6 2.5-2.8 4.4-3 3.2-.3 5.6 2.9 4.2 6.4C19 15.7 12 20 12 20z"/>',
    gota: '<path d="M12 3.5s6 6.6 6 10.5a6 6 0 0 1-12 0c0-3.9 6-10.5 6-10.5z"/>',
    termo: '<path d="M14 14.8V5a2 2 0 0 0-4 0v9.8a4 4 0 1 0 4 0z"/><path d="M12 9v7"/>',
    luna: '<path d="M15.5 4a8 8 0 1 0 4.5 14.6A6.6 6.6 0 0 1 15.5 4z"/>',
    ondas: '<path d="M3 12h3l2-5 4 10 3-7 2 2h4"/>',
    pulmon: '<path d="M12 4v8M12 12c-1.5 0-3-1-4-3-1.6 1-4 4-4 8 0 2 1 3 2.5 3S10 19 10 17v-3M12 12c1.5 0 3-1 4-3 1.6 1 4 4 4 8 0 2-1 3-2.5 3S14 19 14 17v-3"/>',
    rayo: '<path d="M13 3 5 13.5h6L10 21l8-10.5h-6z"/>',
    pesa: '<path d="M7 12h10M4 8v8M7 6v12M17 6v12M20 8v8"/>',
    radiacion: '<circle cx="12" cy="12" r="2"/><path d="M12 4a8 8 0 0 1 6.9 4l-4.3 2.5M5.1 8A8 8 0 0 1 12 4v5M8.6 19.4l2.4-4.4M15.4 19.4 13 15M5 8l4.4 2.5"/>',
    lunna: '<circle cx="12" cy="12" r="8"/><path d="M9 11h.01M15 11h.01M9.5 14.5c1.4 1.2 3.6 1.2 5 0"/>',
    chevron: '<path d="M9 6l6 6-6 6"/>',
  };
  const ic = (n, c) => `<svg class="rj-ic ${c || ""}" viewBox="0 0 24 24" aria-hidden="true">${IC[n]}</svg>`;

  // ---------------------------------------------------------------- datos del día (motor de la maqueta)
  /** Último valor vigente de un indicador y de qué día es. */
  function dato(pid, k, dia) {
    const e = M.estadoIndicador(pid, k, dia);
    const valor = e.valor != null ? e.valor : e.ultimo ? e.ultimo.valor : null;
    return { e, valor, deDia: e.valor == null && e.ultimo ? e.ultimo.dia : null, normal: e.normal ? e.normal.med : null };
  }
  const ESTRES = [
    { hasta: 25, txt: "Bajo", n: 0 }, { hasta: 50, txt: "Normal", n: 0 },
    { hasta: 75, txt: "Intermedio", n: 1 }, { hasta: 101, txt: "Alto", n: 2 },
  ];
  const nivelEstres = (v) => (v == null ? null : ESTRES.findIndex((b) => v < b.hasta));

  /** Todo lo que pintan las pantallas, para una persona, un día y un estado. */
  function contexto(estadoForzado) {
    const pid = S.pid, dia = S.dia, ev = M.evaluar(pid, dia), p = M.PERSONAS.find((x) => x.id === pid);
    const estado = estadoForzado || S.forzado || estadoAuto(ev);
    const i = M.idx(dia);
    const d = {};
    for (const k of ["fc", "spo2", "temperatura", "sueno", "animo", "fr", "hrv"]) d[k] = dato(pid, k, dia);
    const lunna = M.lunaDice(pid, dia);
    return {
      pid, dia, p, ev, estado, E: ESTADOS[estado], d, lunna,
      niv: (k) => ev.nivelDe(k),
      ejercicio: M.SERIES[pid].ejercicio[i], agua: M.SERIES[pid].agua[i], metaAgua: (32 * p.masaKg) / 1000,
      dosis: M.dosisPersonal(pid, dia), cabina: M.cabina(dia),
      backend: { nivel: nivelBackend(pid), peor: B.peor[BACKEND_ID[pid]] || null },
      // Fase de la luna: la de su estado; dormida conserva la del día (si hay algo que mirar, mengua).
      fase: estado === "dormido" ? (ev.general === 1 ? 0.55 : 1) : ESTADOS[estado].fase,
    };
  }

  // ---------------------------------------------------------------- pulso «en vivo» (backend o simulado)
  const vivo = { fc: null, spo2: null, serie: [], base: null, fuenteFc: "simulado", fuenteSpo2: "simulado" };
  function pulsoBase(c) {
    const r = c.d.fc.valor || 62;
    return c.estado === "dormido" ? r - 2 : c.estado === "critico" ? r + 26 : r + 9;
  }
  function tic(c) {
    const lf = lectura(c.pid, "fc"), ls = lectura(c.pid, "spo2");
    if (lf) {
      // Lo que mide el reloj de la simulación (llega cada pocos segundos; entre lecturas se mantiene).
      if (vivo.fuenteFc !== "backend") vivo.serie = Array.from({ length: 40 }, () => lf.valor);
      vivo.fc = lf.valor; vivo.fuenteFc = "backend"; vivo.base = null;
    } else {
      const base = pulsoBase(c);
      if (vivo.base !== base) { vivo.base = base; vivo.fc = base; vivo.serie = Array.from({ length: 40 }, () => base); }
      vivo.fc += (base - vivo.fc) * 0.25 + (Math.random() - 0.5) * 3.2;
      vivo.fuenteFc = "simulado";
    }
    vivo.serie.push(vivo.fc); vivo.serie.shift();
    if (ls) { vivo.spo2 = ls.valor; vivo.fuenteSpo2 = "backend"; }
    else {
      const s = c.d.spo2.valor;
      vivo.spo2 = s == null ? null : Math.max(70, Math.min(100, Math.round(s + (Math.random() - 0.5) * 0.9)));
      vivo.fuenteSpo2 = "simulado";
    }
  }
  const fuenteTxt = (f) => (f === "backend" ? `En vivo del backend v${B.version}: lo que manda el reloj de la simulación.` : B.fase === "error" ? `Sin conexión con el backend (${B.error}); valor simulado.` : B.fase === "vivo" ? "Aún no llegan lecturas del reloj al backend; valor simulado." : "Valor simulado.");

  // ---------------------------------------------------------------- gráficas pequeñas
  function linea(vals, W, H, opc) {
    const o = opc || {};
    const xs = vals.filter((v) => v != null);
    if (xs.length < 2) return `<p class="rj-nota">Aún no hay suficientes días.</p>`;
    const ext = [...xs, ...(o.banda || [])];
    let lo = Math.min(...ext), hi = Math.max(...ext);
    const pad = (hi - lo) * 0.15 || 1; lo -= pad; hi += pad;
    const x = (i) => 4 + (i / (vals.length - 1)) * (W - 8), y = (v) => 4 + (1 - (v - lo) / (hi - lo)) * (H - 8);
    let dd = "";
    vals.forEach((v, i) => { if (v != null) dd += `${dd ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`; });
    const ult = vals.length - 1;
    return `<svg class="rj-graf" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="${esc(o.etq || "Gráfica")}">
      ${o.banda ? `<rect class="banda" x="4" width="${W - 8}" y="${y(o.banda[1]).toFixed(1)}" height="${Math.max(1, y(o.banda[0]) - y(o.banda[1])).toFixed(1)}" rx="4"/>` : ""}
      <path class="trazo" d="${dd}" vector-effect="non-scaling-stroke"/>
      ${vals[ult] != null ? `<circle class="hoy f-${CLASE(o.nivel)}" cx="${x(ult).toFixed(1)}" cy="${y(vals[ult]).toFixed(1)}" r="3.6"/>` : ""}
    </svg>`;
  }
  function barras(vals, W, H, ref, opc) {
    const o = opc || {};
    const max = Math.max(ref || 0, ...vals.filter((v) => v != null)) * 1.1 || 1;
    const n = vals.length, bw = (W - 8) / n;
    return `<svg class="rj-graf rj-barras" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.etq || "Barras")}">
      ${vals.map((v, i) => (v == null ? "" : `<rect class="${i === n - 1 ? "hoy f-" + CLASE(o.nivel) : ""}" x="${(4 + i * bw + bw * 0.18).toFixed(1)}" width="${(bw * 0.64).toFixed(1)}" y="${(H - 4 - ((v / max) * (H - 8))).toFixed(1)}" height="${((v / max) * (H - 8)).toFixed(1)}" rx="3"/>`)).join("")}
      ${ref ? `<line class="ref" x1="4" x2="${W - 4}" y1="${(H - 4 - (ref / max) * (H - 8)).toFixed(1)}" y2="${(H - 4 - (ref / max) * (H - 8)).toFixed(1)}"/>` : ""}
    </svg>`;
  }

  // ---------------------------------------------------------------- pantallas
  const hora = () => { const d = ahora(); return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };
  const cab = (icono, titulo, clase) => `<header class="rj-pcab ${clase || ""}">${ic(icono)}<span>${esc(titulo)}</span><time data-hora>${hora()}</time></header>`;
  const fila = (etq, valor, n) => `<div class="rj-fila"><span>${esc(etq)}</span><b>${valor}</b>${n === undefined ? "" : forma(n)}</div>`;

  const PANTALLAS = [
    {
      id: "caratula", titulo: "Carátula",
      html(c) {
        return `<div class="rj-caratula">
          <div class="rj-top"><span class="rj-etq">${esc(c.p.nombre)}</span><span class="rj-etq rj-envivo" data-envivo ${vivo.fuenteFc === "backend" ? "" : "hidden"}><i></i>En vivo</span><span class="rj-etq">Día ${c.dia}</span></div>
          <time class="rj-hora" data-hora>${hora()}</time>
          <p class="rj-fecha">${fechaDia(c.dia)} · ${esc(c.E.txt)}</p>
          <button type="button" class="rj-lunna" data-ir="lunna" aria-label="Lunna: ${esc(c.E.txt)}. Abrir lo que Lunna ve"><span class="luna-aqui" data-cara="${c.E.cara}" data-fase="${c.fase}" data-tam="150"></span></button>
          <div class="rj-estado">${c.estado === "dormido" ? `${ic("luna")}<span>Modo sueño · ${c.ev.general ? "■ hay algo que mirar al despertar" : "todo en tu normal"}</span>` : sem(c.E.n, c.E.txt)}</div>
        </div>`;
      },
    },
    {
      id: "pulso", titulo: "Ritmo cardiaco",
      html(c) {
        const n = c.niv("fc");
        return `${cab("corazon", "Ritmo cardiaco", "c-rojo")}
          <div class="rj-grande"><span class="rj-latido" data-latido style="--dur:${(60 / (vivo.fc || 60)).toFixed(2)}s">${ic("corazon")}</span>
            <b data-fc>${fmt(vivo.fc)}</b><small>lpm<br>ahora</small></div>
          <div class="rj-vivo-graf" data-graf-fc>${grafVivo()}</div>
          ${fila("En reposo hoy", `${fmt(c.d.fc.valor)} lpm`, n)}
          ${fila("Tu normal", c.d.fc.normal == null ? "–" : `${fmt(c.d.fc.normal)} lpm`)}
          <p class="rj-nota">${n ? "Tu pulso en reposo se alejó de tu normal. " : ""}<span data-fuente-fc>${esc(fuenteTxt(vivo.fuenteFc))}</span></p>`;
      },
    },
    {
      id: "oxigeno", titulo: "Oxígeno",
      html(c) {
        const n = c.niv("spo2"), v = vivo.spo2;
        const R = 46, Lc = 2 * Math.PI * R * 0.75, f = v == null ? 0 : Math.max(0, Math.min(1, (v - 80) / 20));
        return `${cab("gota", "Oxígeno en sangre", "c-cian")}
          <div class="rj-anillo f-${CLASE(n)}"><svg viewBox="0 0 120 120" aria-hidden="true">
              <circle class="pista" cx="60" cy="60" r="${R}" stroke-dasharray="${Lc.toFixed(1)} 999" transform="rotate(135 60 60)"/>
              <circle class="arco" cx="60" cy="60" r="${R}" stroke-dasharray="${(Lc * f).toFixed(1)} 999" transform="rotate(135 60 60)"/></svg>
            <div><b data-spo2>${fmt(v)}</b><small>% SpO₂</small></div><span class="rj-escala"><i>80</i><i>100</i></span></div>
          ${fila("Hoy", `${fmt(c.d.spo2.valor)} %`, n)}
          <p class="rj-nota">≤ 92 % atención · ≤ 88 % urgente (propuesta del equipo). <span data-fuente-spo2>${esc(fuenteTxt(vivo.fuenteSpo2))}</span></p>`;
      },
    },
    {
      id: "temperatura", titulo: "Temperatura",
      html(c) {
        const t = c.d.temperatura, n = c.niv("temperatura");
        return `${cab("termo", "Temperatura", "c-naranja")}
          <div class="rj-grande"><b>${fmt(t.valor, 1)}</b><small>°C<br>piel</small></div>
          ${linea(t.e.historia.slice(-14), 260, 64, { banda: t.e.normal && t.e.normal.banda, nivel: n, etq: "Temperatura de piel, últimos 14 días contra tu normal" })}
          ${fila("Tu normal", t.normal == null ? "–" : `${fmt(t.normal, 1)} °C`, n)}
          <p class="rj-nota">Es de piel, no central: solo vale contra tu normal. La fiebre se confirma con termómetro.</p>`;
      },
    },
    {
      id: "sueno", titulo: "Sueño",
      html(c) {
        const s = c.d.sueno, n = c.niv("sueno"), hist = s.e.historia.slice(-7);
        const durmiendo = c.estado === "dormido";
        return `${cab("luna", "Sueño", "c-morado")}
          ${durmiendo ? `<p class="rj-chip-noche">${ic("luna")} Durmiendo ahora · zzz</p>` : ""}
          <div class="rj-grande"><b>${s.valor == null ? "–" : M.horas(s.valor).replace(" h ", "<small>h</small>").replace(/ h$/, "<small>h</small>")}</b><small>anoche</small></div>
          ${barras(hist, 260, 70, s.normal, { nivel: n, etq: "Horas de sueño de las últimas 7 noches; la línea es tu normal" })}
          ${fila("Tu normal", s.normal == null ? "–" : M.horas(s.normal), n)}
          <p class="rj-nota">${n ? "Dormiste menos que tu normal: antes de una tarea crítica, prioriza descansar." : "Las barras son las últimas 7 noches; la línea, tu normal."}</p>`;
      },
    },
    {
      id: "estres", titulo: "Estrés",
      html(c) {
        const a = c.d.animo, b = nivelEstres(a.valor), n = c.niv("animo");
        const hist = a.e.historia.slice(-7);
        return `${cab("rayo", "Estado de ánimo", "c-ambar")}
          <div class="rj-grande rj-estres f-${CLASE(b == null ? null : ESTRES[b].n)}"><b>${b == null ? "–" : ESTRES[b].txt}</b><small>estrés<br>${fmt(a.valor)}/100</small></div>
          <div class="rj-niveles" role="img" aria-label="Escala de estrés: bajo, normal, intermedio, alto. Hoy: ${b == null ? "sin dato" : ESTRES[b].txt}">
            ${ESTRES.map((x, i) => `<span class="${i === b ? "act" : ""} f-${CLASE(x.n)}"><i></i>${x.txt}</span>`).join("")}</div>
          ${barras(hist, 260, 46, a.normal, { nivel: n, etq: "Estrés de los últimos 7 días; la línea es tu normal" })}
          ${fila("Contra tu normal", a.normal == null ? "–" : `${fmt(a.normal)}/100`, n)}
          <p class="rj-nota">Del check-in diario (0–100): bajo &lt; 25 · normal 25–49 · intermedio 50–74 · alto ≥ 75.</p>`;
      },
    },
    {
      id: "mas", titulo: "Más",
      html(c) {
        const dp = c.dosis;
        return `${cab("ondas", "Más signos", "c-cian")}
          <div class="rj-lista">
            ${fila("Respiración", c.d.fr.valor == null ? "–" : `≈${fmt(c.d.fr.valor)} rpm`, c.niv("fr"))}
            ${fila("Variabilidad (HRV)", c.d.hrv.valor == null ? "–" : `${fmt(c.d.hrv.valor)} ms`, c.niv("hrv"))}
            ${fila("Ejercicio", `${fmt(c.ejercicio)} / 90 min`, c.ejercicio >= 90 ? 0 : undefined)}
            ${fila("Agua", `${fmt(c.agua, 1)} / ${fmt(c.metaAgua, 1)} L`, c.agua >= c.metaAgua ? 0 : undefined)}
            ${fila("Radiación de la misión", `${fmt(dp.mision, 1)} mSv`, c.cabina.solar ? 2 : 0)}
            ${fila("Tasa en cabina", `${c.cabina.tasa.toLocaleString("es-MX")} µSv/h`, c.cabina.tasa >= 3000 ? 2 : c.cabina.tasa > 54 ? 1 : 0)}
          </div>
          <p class="rj-nota">Respiración estimada a partir del pulso. Límites de radiación [A] NASA-STD-3001.</p>`;
      },
    },
    {
      id: "lunna", titulo: "Lunna",
      html(c) {
        const avisos = mensajesSencillos(c);
        const principal = avisos[0];
        return `${cab("lunna", "Lo que Lunna ve", "c-morado")}
          <div class="rj-lunna-fila"><span class="luna-aqui" data-cara="${c.E.cara}" data-fase="${c.fase}" data-tam="64"></span>
            <p>${esc(RESUMEN[c.estado])}</p></div>
          ${principal ? `<div class="rj-hallazgo es-${principal.n}">${forma(principal.n, 14)}<div><b>${esc(principal.titulo)}</b><span>${esc(principal.texto)}</span></div></div>`
            : c.estado === "dormido" ? "" : `<p class="rj-sencillo">Sigue así.</p>`}
          ${avisos.length > 1 ? `<p class="rj-nota">Y ${avisos.length - 1} aviso más en tu teléfono.</p>` : ""}
          <p class="rj-nota">Lunna avisa; no diagnostica.</p>`;
      },
    },
  ];
  // En el reloj, Lunna habla corto: una frase de estado y, si hace falta, una sola cosa que hacer.
  // El detalle completo (evidencia, umbrales, protocolo) sigue en el teléfono y en la central.
  const RESUMEN = { bien: "Todo bien hoy.", mal: "Hay algo que revisar.", critico: "Atiende esto ahora.", dormido: "Estás durmiendo. Te cuento al despertar." };
  function mensajesSencillos(c) {
    if (c.estado === "dormido") return [];
    const out = c.lunna.hallazgos.filter((h) => h.nivel > 0).map((h) => {
      if (h.id === "RADIACION") return { n: 2, titulo: "Tormenta solar", texto: "Ve al refugio ahora." };
      if (h.id === "FATIGA-03") return /mejorando/.test(h.titulo)
        ? { n: h.nivel, titulo: "Vas mejorando", texto: "Sigue durmiendo bien." }
        : { n: h.nivel, titulo: "Cansancio acumulado", texto: "Duerme temprano hoy y evita el café." };
      const ind = M.IND[h.id.toLowerCase()];
      return { n: h.nivel, titulo: ind ? ind.corto || ind.nombre : h.titulo, texto: h.nivel === 2 ? "Avísale hoy a la CMO." : "Vuelve a medirlo mañana." };
    });
    // Si lo detectó LUNNA en la computadora central (backend) y el escenario no lo trae, también se dice.
    const bp = c.backend.peor, nb = c.backend.nivel;
    if (bp && nb > 0 && !out.some((x) => x.n >= nb)) out.push({ n: nb, titulo: bp.nombre, texto: nb === 2 ? "Avísale hoy a la CMO." : "Vuelve a medirlo mañana." });
    return out.sort((x, y) => y.n - x.n);
  }
  const indice = (id) => PANTALLAS.findIndex((p) => p.id === id);

  function grafVivo() {
    const xs = vivo.serie;
    if (!xs.length) return "";
    const lo = Math.min(...xs) - 4, hi = Math.max(...xs) + 4, W = 260, H = 54;
    const pts = xs.map((v, i) => `${(i / (xs.length - 1)) * W},${(4 + (1 - (v - lo) / (hi - lo)) * (H - 8)).toFixed(1)}`).join(" ");
    return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Pulso de los últimos 40 segundos"><polyline points="${pts}" vector-effect="non-scaling-stroke"/></svg>`;
  }

  // ---------------------------------------------------------------- un reloj (marco + pantallas)
  function relojHtml(pantallas, c, opc) {
    const o = opc || {};
    if (S.apagado && !o.mini) pantallas = [{ id: "apagado", titulo: "Apagado", html: () => `<div class="rj-apagado" role="status">Reloj apagado<small>Se enciende desde su terminal en el simulador: «encender».</small></div>` }];
    return `<div class="rj-reloj${o.mini ? " mini" : ""}${S.apagado && !o.mini ? " apagado" : c.estado === "dormido" ? " noche" : c.estado === "critico" ? " critico" : ""}" ${o.etq ? `aria-label="${esc(o.etq)}"` : ""}>
      <span class="rj-correa arriba" aria-hidden="true"></span><span class="rj-correa abajo" aria-hidden="true"></span>
      <div class="rj-caja">
        <button type="button" class="rj-corona" ${o.mini ? 'tabindex="-1" aria-hidden="true"' : 'aria-label="Corona: volver a la carátula"'}></button>
        <span class="rj-boton" aria-hidden="true"></span>
        <div class="rj-pantalla">
          <div class="rj-pista" ${o.mini ? "" : 'tabindex="0" role="region" aria-roledescription="carrusel" aria-label="Pantallas del reloj"'}>
            ${pantallas.map((p) => `<section class="rj-p" data-p="${p.id}" aria-label="${esc(p.titulo)}">${p.html(c)}</section>`).join("")}
          </div>
        </div>
      </div>
      ${o.mini ? `<p class="rj-pie-mini">${o.pie}</p>` : `<nav class="rj-puntos" aria-label="Pantallas">${pantallas.map((p, i) => `<button type="button" data-punto="${i}" aria-label="${esc(p.titulo)}" aria-current="${i === S.pantalla}"></button>`).join("")}</nav>`}
    </div>`;
  }
  function montarLunas(raiz) {
    for (const el of $$(".luna-aqui", raiz)) {
      el.innerHTML = "";
      L.crear(el, { cara: el.dataset.cara, fase: +el.dataset.fase, tam: +el.dataset.tam });
    }
  }

  // ---------------------------------------------------------------- pintado
  let ctx = null, firma = "";
  function pintarTodo() {
    ctx = contexto();
    tic(ctx);
    // Reloj interactivo
    const r = $("#reloj");
    r.innerHTML = relojHtml(PANTALLAS, ctx);
    montarLunas(r);
    conectarReloj(r);
    irA(S.pantalla, false);
    // Galería: los cuatro estados
    $("#g-estados").innerHTML = Object.keys(ESTADOS).map((k) => relojHtml([PANTALLAS[0]], contexto(k), { mini: true, etq: `Carátula en estado ${ESTADOS[k].corto}`, pie: `<b>${ESTADOS[k].corto}</b> · Lunna ${ESTADOS[k].cara}` })).join("");
    // Galería: cada pantalla
    $("#g-pantallas").innerHTML = PANTALLAS.map((p) => relojHtml([p], ctx, { mini: true, etq: p.titulo, pie: `<b>${esc(p.titulo)}</b>` })).join("");
    montarLunas($("#g-estados")); montarLunas($("#g-pantallas"));
    $$(".rj-galeria [data-ir]").forEach((b) => { b.tabIndex = -1; });
    pintarControles();
    firma = clave();
    if (B.fase !== "sin" && B.leido !== S.pid) releer();
  }
  const clave = () => [S.pid, S.dia, S.forzado, esDeNoche(), S.apagado, nivelBackend(), (B.peor[BACKEND_ID[S.pid]] || {}).nombre].join("|");

  /** Cada segundo: hora, pulso y SpO₂ en vivo, sin repintar (no se pierde el desplazamiento). */
  function cadaSegundo() {
    if (clave() !== firma) { pintarTodo(); return; }
    tic(ctx);
    const h = hora();
    $$("[data-hora]").forEach((el) => { el.textContent = h; });
    $$("[data-fc]").forEach((el) => { el.textContent = fmt(vivo.fc); });
    $$("[data-spo2]").forEach((el) => { el.textContent = fmt(vivo.spo2); });
    $$("[data-latido]").forEach((el) => el.style.setProperty("--dur", (60 / (vivo.fc || 60)).toFixed(2) + "s"));
    $$("[data-graf-fc]").forEach((el) => { el.innerHTML = grafVivo(); });
    $$("[data-fuente-fc]").forEach((el) => { el.textContent = fuenteTxt(vivo.fuenteFc); });
    $$("[data-fuente-spo2]").forEach((el) => { el.textContent = fuenteTxt(vivo.fuenteSpo2); });
    $$("[data-envivo]").forEach((el) => { el.hidden = vivo.fuenteFc !== "backend"; });
    const pil = $(".rj-pildora");
    if (pil) {
      pil.textContent = B.fase === "vivo" ? `Backend v${B.version} · pulso y SpO₂ en vivo` : B.fase === "error" ? "Sin conexión con el backend" : "Datos simulados";
      pil.classList.toggle("error", B.fase === "error");
      pil.title = B.fase === "vivo" ? "Pulso y SpO₂ llegan del backend (eventos de /api/stream); el estado de Lunna suma lo que ve LUNNA en la computadora central. Lo demás es el escenario simulado." : B.fase === "error" ? B.error : "Signos del escenario de la maqueta (días 106–115). No vienen de un reloj real.";
    }
  }

  // ---------------------------------------------------------------- navegación del reloj
  let arrastre = null;   // { pista, x0, s0, desde } mientras se arrastra con el ratón
  window.addEventListener("pointermove", (e) => { if (arrastre) arrastre.pista.scrollLeft = arrastre.s0 - (e.clientX - arrastre.x0); });
  window.addEventListener("pointerup", (e) => {
    if (!arrastre) return;
    const { pista, x0, desde } = arrastre, dx = e.clientX - x0;
    arrastre = null; pista.classList.remove("arrastrando");
    irA(Math.abs(dx) > 40 ? desde + (dx < 0 ? 1 : -1) : desde);
  });
  function irA(i, suave) {
    const pista = $("#reloj .rj-pista");
    if (!pista) return;
    S.pantalla = Math.max(0, Math.min(PANTALLAS.length - 1, i));
    pista.scrollTo({ left: S.pantalla * pista.clientWidth, behavior: suave === false ? "auto" : "smooth" });
    marcarPunto();
  }
  function marcarPunto() { $$("#reloj [data-punto]").forEach((b) => b.setAttribute("aria-current", String(+b.dataset.punto === S.pantalla))); }
  function conectarReloj(r) {
    const pista = $(".rj-pista", r);
    let t = null;
    pista.addEventListener("scroll", () => {
      clearTimeout(t);
      t = setTimeout(() => { S.pantalla = Math.round(pista.scrollLeft / pista.clientWidth); marcarPunto(); }, 80);
    });
    pista.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") { e.preventDefault(); irA(S.pantalla + 1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); irA(S.pantalla - 1); }
      if (e.key === "Home" || e.key === "Escape") { e.preventDefault(); irA(0); }
    });
    // Arrastre con el ratón (en el móvil el desplazamiento táctil ya funciona solo).
    pista.addEventListener("pointerdown", (e) => {
      if (e.pointerType !== "mouse" || e.target.closest("button")) return;
      arrastre = { pista, x0: e.clientX, s0: pista.scrollLeft, desde: S.pantalla };
      pista.classList.add("arrastrando");
    });
    $(".rj-corona", r).addEventListener("click", () => irA(0));
    $$("[data-punto]", r).forEach((b) => b.addEventListener("click", () => irA(+b.dataset.punto)));
    $$("[data-ir]", r).forEach((b) => b.addEventListener("click", () => irA(indice(b.dataset.ir))));
  }

  // ---------------------------------------------------------------- controles de la simulación
  function pintarControles() {
    $("#c-persona").innerHTML = M.PERSONAS.map((p) => `<button type="button" data-pid="${p.id}" aria-pressed="${p.id === S.pid}"><i style="--c:${p.color}"></i>${esc(p.nombre)}</button>`).join("");
    $("#c-dia").innerHTML = `<b>Día ${S.dia}</b><small>${fechaDia(S.dia)}</small>`;
    $$("[data-dia]").forEach((b) => { b.disabled = +b.dataset.dia < 0 ? S.dia <= DIA_MIN : S.dia >= DIA_MAX; });
    $("#c-hitos").innerHTML = HITOS.map(([d, t]) => `<button type="button" data-hito="${d}" aria-pressed="${d === S.dia}"><b>${d}</b> ${t}</button>`).join("");
    $("#c-estado").innerHTML = [["", "Automático"], ...Object.entries(ESTADOS).map(([k, e]) => [k, e.corto])]
      .map(([k, t]) => `<button type="button" data-estado="${k}" aria-pressed="${(S.forzado || "") === k}">${k ? forma(ESTADOS[k].n, 9) : ""}${t}</button>`).join("");
    if (S.desfase == null) $("#c-hora").value = String(horaDecimal());
  }
  document.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b || !b.closest(".rj-panel")) return;
    if (b.dataset.pid) { S.pid = b.dataset.pid; mem.guardar("persona", S.pid); }
    else if (b.dataset.dia) { S.dia = acotar(S.dia + +b.dataset.dia); mem.guardar("dia", S.dia); }
    else if (b.dataset.hito) { S.dia = +b.dataset.hito; mem.guardar("dia", S.dia); }
    else if (b.dataset.estado !== undefined) { S.forzado = b.dataset.estado || null; }
    else return;
    pintarTodo();
  });
  $("#c-real").addEventListener("change", (e) => {
    $("#c-hora").disabled = e.target.checked;
    if (e.target.checked) S.desfase = null; else ponerHora(+$("#c-hora").value);
    cadaSegundo();
  });
  $("#c-hora").addEventListener("input", (e) => { ponerHora(+e.target.value); cadaSegundo(); });
  function ponerHora(h) {
    const real = new Date(), meta = new Date(real);
    meta.setHours(Math.floor(h), Math.round((h % 1) * 60), real.getSeconds(), 0);
    S.desfase = meta - real;
  }
  // Si la app o una consola cambian de persona o de día en este navegador, el reloj los sigue.
  window.addEventListener("storage", (e) => {
    if (e.key === "eva:dia" && e.newValue) { S.dia = acotar(JSON.parse(e.newValue)); pintarTodo(); }
    if (e.key === "eva:persona" && e.newValue && !S.fijo) { const v = JSON.parse(e.newValue); if (valida(v)) { S.pid = v; pintarTodo(); } }
  });
  // El simulador avisa si el reloj está encendido (comandos «apagar» y «encender» de su terminal).
  window.addEventListener("message", (e) => {
    if (e.origin !== location.origin || !e.data || e.data.eva !== "energia") return;
    const apagado = !e.data.encendido;
    if (apagado !== S.apagado) { S.apagado = apagado; pintarTodo(); }
  });

  // ---------------------------------------------------------------- arranque
  L.crear($("#rj-luna-marca"), { cara: "feliz", tam: 40, fase: 1 });
  pintarTodo();
  setInterval(cadaSegundo, 1000);
  conectarBackend();
  window.RELOJ = { estado: S, contexto, pintar: pintarTodo, ESTADOS, backend: B };
})();
