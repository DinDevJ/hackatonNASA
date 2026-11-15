/* LUNNA · lógica común de las consolas de escritorio: computadora central (panel médico, a bordo)
 * y base en Tierra (control de misión).
 *
 * Usa las mismas piezas que el teléfono para que todo sea de la misma serie:
 *   MOTOR (motor.js)   tripulación, días 106–115, tu normal, semáforo, FATIGA-03 y evento solar
 *   CUERPO (cuerpo.js) el Cuerpo LUNNA con sus órganos y marcas ● ■ ▲ ○
 *   LUNA (luna.js)     la avatar de Lunna
 *   PESOS (pesos.js)   los pesos fisiológicos de Leo (generados desde modelo-pesos/pesos.json)
 * y las mismas claves de memoria del teléfono ("eva:tema", "eva:dia"), así el tema y el día se comparten.
 *
 * Todo es SIMULADO salvo el evento solar real de DONKI que sirve de modelo al día 115.
 * Nada aquí diagnostica: el índice por padecimiento ordena qué mirar primero.
 */
(function () {
  "use strict";
  const M = window.MOTOR, C = window.CUERPO, PESOS = window.PESOS;

  // ---------------------------------------------------------------- utilidades
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (t) => String(t == null ? "" : t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  /** Número con coma decimal, como en los documentos del equipo. */
  const fmt = (n, dec) => (typeof n === "number" ? (dec ? n.toFixed(dec) : String(Math.round(n))) : String(n)).replace(".", ",");
  const ic = (n, c) => `<svg class="ic ${c || ""}" aria-hidden="true"><use href="#i-${n}"/></svg>`;
  const pastilla = (n, c1, c2) => `<span class="pastilla-ic" style="--ic1:${c1};--ic2:${c2}">${ic(n)}</span>`;
  const zTxt = (z) => (z >= 0 ? "+" : "−") + Math.abs(z).toFixed(1).replace(".", ",");
  const horaReal = (t) => { const d = t ? new Date(t) : new Date(); return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };

  // Memoria compartida con el teléfono (mismas claves "eva:").
  const mem = {
    leer(k, d) { try { const v = localStorage.getItem("eva:" + k); return v === null ? d : JSON.parse(v); } catch { return d; } },
    guardar(k, v) { try { localStorage.setItem("eva:" + k, JSON.stringify(v)); } catch { /* sin almacenamiento */ } },
  };

  // ---------------------------------------------------------------- tema (el mismo del teléfono)
  const TEMAS = { auto: "Automático", claro: "Claro", oscuro: "Azul marino" };
  function aplicarTema() {
    const t = mem.leer("tema", "auto");
    const real = t === "auto" ? (matchMedia("(prefers-color-scheme: dark)").matches ? "oscuro" : "claro") : t;
    document.documentElement.dataset.tema = real;
    const m = $('meta[name="theme-color"]');
    if (m) m.content = real === "oscuro" ? "#070C2E" : "#EEF0FF";
    const b = $("#cn-tema");
    if (b) { b.title = `Tema: ${TEMAS[t]} (cambiar)`; b.innerHTML = ic(real === "oscuro" ? "luna" : "sol"); }
  }
  function siguienteTema() {
    const orden = ["auto", "claro", "oscuro"];
    const t = mem.leer("tema", "auto");
    mem.guardar("tema", orden[(orden.indexOf(t) + 1) % orden.length]);
    aplicarTema();
    toast({ titulo: `Tema: ${TEMAS[mem.leer("tema", "auto")]}`, icono: "engrane", c1: "#5B8DFF", c2: "#1F4FD8", ms: 1800 });
  }
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", aplicarTema);
  window.addEventListener("storage", (e) => { if (e.key === "eva:tema") aplicarTema(); });

  // ---------------------------------------------------------------- día de la simulación
  const DIA_MIN = 106, DIA_MAX = M.ULTIMO_DIA;
  const HITOS = [[112, "Fatiga"], [114, "Cierre y nota"], [115, "Evento solar"]];
  const FECHA0 = Date.UTC(2027, 2, 18); // día 112 = 18 mar 2027, igual que el teléfono
  const fechaDia = (d) => {
    const t = new Date(FECHA0 + (d - 112) * 864e5).toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
    return t.charAt(0).toUpperCase() + t.slice(1);
  };
  const acotar = (d) => Math.max(DIA_MIN, Math.min(DIA_MAX, Math.round(+d) || 112));
  const q = new URLSearchParams(location.search);
  let dia = acotar(q.get("dia") || mem.leer("dia", 112));
  const oyentesDia = [];
  const cache = new Map();
  function ponerDia(d) {
    const nuevo = acotar(d);
    if (nuevo === dia) return;
    dia = nuevo;
    mem.guardar("dia", dia);
    cache.clear();
    pintarDia();
    oyentesDia.forEach((f) => f(dia));
  }
  window.addEventListener("storage", (e) => { if (e.key === "eva:dia" && e.newValue) ponerDia(JSON.parse(e.newValue)); });

  // ---------------------------------------------------------------- tripulación
  const PERSONAS = M.PERSONAS;
  const persona = (id) => PERSONAS.find((p) => p.id === id);
  const CMO = "MS-3";
  // Ids del backend de Julio (computadora central real) ↔ personas de la app.
  const BACKEND_ID = { "MS-1": "tomas", "MS-2": "ana", "MS-3": "mei", "MS-4": "luis" };
  function ev(pid, d) {
    const dd = d == null ? dia : d, k = pid + "|" + dd;
    if (!cache.has(k)) cache.set(k, M.evaluar(pid, dd));
    return cache.get(k);
  }
  const general = (d) => Math.max(...PERSONAS.map((p) => ev(p.id, d).general));

  // ---------------------------------------------------------------- semáforo con forma (● ■ ▲ ○)
  const ESTADO_TXT = { 0: "En su normal", 1: "Atención", 2: "Actúa ahora", nd: "Sin dato" };
  const claseN = (n) => (n == null ? "nd" : ["ok", "ojo", "alto"][n]);
  function sem(n, txt) {
    const k = claseN(n);
    return `<span class="sem sem-${k}"><svg viewBox="-8 -8 16 16" aria-hidden="true">${C.forma(n, 0, 0, 7)}</svg>${txt === false ? "" : txt || ESTADO_TXT[n == null ? "nd" : n]}</span>`;
  }
  const forma = (n, tam) => `<svg viewBox="-8 -8 16 16" aria-hidden="true" style="width:${tam || 12}px;height:${tam || 12}px">${C.forma(n, 0, 0, 7)}</svg>`;
  const chip = (n, txt, icono) => `<span class="cn-chip c-${claseN(n)}">${icono ? ic(icono, "ic-sm") : forma(n, 10)}${txt}</span>`;
  const NOMBRE_ALERTA = { "FATIGA-03": "FATIGA-03", RADIACION: "Radiación" };

  // ---------------------------------------------------------------- valores y gráficas (mismo dibujo que el teléfono)
  const IND = M.IND;
  function valorDe(pid, k, e) {
    const ind = IND[k];
    const u = e.valor != null ? e.valor : e.ultimo ? e.ultimo.valor : null;
    if (u == null) return { v: "–", u: ind.unidad };
    if (k === "presion") return { v: `${u}/${M.serieCon(pid, "diastolica")[M.idx(e.ultimo.dia)]}`, u: "mmHg" };
    if (k === "sueno") return { v: fmt(u, 1), u: "h" };
    if (ind.ic) return { v: `≈${u}`, u: `${ind.unidad} (${u - ind.ic}–${u + ind.ic})` };
    return { v: fmt(u, ind.dec), u: ind.unidad };
  }
  function grafPresion(pid, d, mini) {
    const e = M.estadoIndicador(pid, "presion", d);
    const i0 = M.idx(d) - (e.historia.length - 1);
    const dias = M.serieCon(pid, "diastolica").slice(i0, i0 + e.historia.length);
    const pares = e.historia.map((s, i) => (s != null && dias[i] != null ? [s, dias[i]] : null));
    const v = pares.filter(Boolean);
    if (v.length < 2) return `<div class="cn-nota">Aún no hay suficientes días.</div>`;
    const W = 320, H = mini ? 44 : 140, mi = mini ? 2 : 30, md = 8, ma = 8, mb = mini ? 4 : 18;
    const ext = [...v.flat(), ...(mini ? [] : [130, 80])];
    const lo = Math.min(...ext) - 4, hi = Math.max(...ext) + 4;
    const x = (i) => mi + 6 + (i / Math.max(1, pares.length - 1)) * (W - mi - md - 12);
    const y = (n) => ma + (1 - (n - lo) / (hi - lo)) * (H - ma - mb);
    const ult = pares.length - 1, nivel = ev(pid, d).nivelDe("presion");
    const colorHoy = ["var(--verde)", "var(--ambar)", "var(--rojo)"][nivel || 0];
    const ancho = mini ? 4 : 7;
    return `<svg class="normal-graf graf-presion ${mini ? "mini" : ""}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Presión arterial, sistólica y diastólica de los últimos ${pares.length} días">
      ${mini ? "" : `<line class="umbral" x1="${mi}" x2="${W - md}" y1="${y(130)}" y2="${y(130)}"/><text x="${W - md}" y="${y(130) - 3}" text-anchor="end">130</text>
        <line class="umbral" x1="${mi}" x2="${W - md}" y1="${y(80)}" y2="${y(80)}"/><text x="${W - md}" y="${y(80) - 3}" text-anchor="end">80</text>`}
      ${pares.map((pp, i) => (pp ? `<g class="pa-dia${i === ult ? " pa-hoy" : ""}"${i === ult ? ` style="--c:${colorHoy}"` : ""}>
        <line x1="${x(i)}" x2="${x(i)}" y1="${y(pp[0])}" y2="${y(pp[1])}" vector-effect="non-scaling-stroke"/>
        <line x1="${x(i) - ancho / 2}" x2="${x(i) + ancho / 2}" y1="${y(pp[0])}" y2="${y(pp[0])}" vector-effect="non-scaling-stroke"/>
        <line x1="${x(i) - ancho / 2}" x2="${x(i) + ancho / 2}" y1="${y(pp[1])}" y2="${y(pp[1])}" vector-effect="non-scaling-stroke"/></g>` : "")).join("")}
      ${mini ? "" : `<text x="${mi - 4}" y="${y(hi - 4) + 3}" text-anchor="end">${Math.round(hi - 4)}</text><text x="${mi - 4}" y="${y(lo + 4) + 3}" text-anchor="end">${Math.round(lo + 4)}</text>
        <text x="${x(0)}" y="${H - 4}">Día ${d - ult}</text><text x="${x(ult)}" y="${H - 4}" text-anchor="end">Hoy</text>`}
    </svg>`;
  }
  /** Serie de 14 días contra la franja de su normal (igual que el teléfono). */
  function grafNormal(pid, k, d, mini) {
    if (k === "presion") return grafPresion(pid, d, mini);
    const e = M.estadoIndicador(pid, k, d);
    const ind = IND[k];
    const h = e.historia;
    const vals = h.filter((v) => v != null);
    if (vals.length < 2) return `<div class="cn-nota">Aún no hay suficientes días.</div>`;
    const W = 320, H = mini ? 38 : 120, mi = mini ? 2 : 30, md = 8, ma = 8, mb = mini ? 4 : 18;
    const cand = k === "glucosa" ? [100, 126] : k === "spo2" ? [92] : [];
    const rango = Math.max(...vals) - Math.min(...vals) || 1;
    const lineas = mini ? [] : cand.filter((l) => l <= Math.max(...vals) + rango * 1.5 && l >= Math.min(...vals) - rango * 1.5);
    const ext = [...vals, ...(e.normal ? e.normal.banda : []), ...lineas];
    let lo = Math.min(...ext), hi = Math.max(...ext);
    const pad = (hi - lo) * 0.12 || 1; lo -= pad; hi += pad;
    const x = (i) => mi + (i / Math.max(1, h.length - 1)) * (W - mi - md);
    const y = (v) => ma + (1 - (v - lo) / (hi - lo)) * (H - ma - mb);
    const fuera = (v) => e.normal && (ind.dir === "alto" ? v > e.normal.banda[1] : v < e.normal.banda[0]);
    let dd = "";
    const partes = [];
    h.forEach((v, i) => { if (v == null) { if (dd) partes.push(dd); dd = ""; } else dd += `${dd ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`; });
    if (dd) partes.push(dd);
    const ult = h.length - 1, hoy = h[ult];
    const nivel = ev(pid, d).nivelDe(k);
    const color = ["var(--verde)", "var(--ambar)", "var(--rojo)"][nivel || 0];
    return `<svg class="normal-graf ${mini ? "mini" : ""}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="${esc(ind.nombre)}, últimos ${h.length} días contra su normal">
      ${e.normal ? `<rect class="banda" x="${mi}" width="${W - mi - md}" y="${y(e.normal.banda[1])}" height="${Math.max(1, y(e.normal.banda[0]) - y(e.normal.banda[1]))}" rx="5"/>` : ""}
      ${e.normal && !mini ? `<line class="mediana" x1="${mi}" x2="${W - md}" y1="${y(e.normal.med)}" y2="${y(e.normal.med)}"/>` : ""}
      ${lineas.map((l) => `<line class="umbral" x1="${mi}" x2="${W - md}" y1="${y(l)}" y2="${y(l)}"/><text x="${W - md}" y="${y(l) - 3}" text-anchor="end">${l}</text>`).join("")}
      ${partes.map((pp) => `<path class="trazo" d="${pp}" vector-effect="non-scaling-stroke"/>`).join("")}
      ${h.map((v, i) => (v == null || i === ult ? "" : `<circle class="punto ${fuera(v) ? "fuera" : ""}" cx="${x(i)}" cy="${y(v)}" r="${mini ? 1.8 : 3}"/>`)).join("")}
      ${hoy != null ? `<circle class="hoy" cx="${x(ult)}" cy="${y(hoy)}" r="${mini ? 3.4 : 5.5}" fill="${color}"/>` : ""}
      ${mini ? "" : `<text x="${mi - 4}" y="${y(hi - pad) + 3}" text-anchor="end">${fmt(+(hi - pad).toFixed(ind.dec), ind.dec)}</text><text x="${mi - 4}" y="${y(lo + pad) + 3}" text-anchor="end">${fmt(+(lo + pad).toFixed(ind.dec), ind.dec)}</text>
        <text x="${x(0)}" y="${H - 4}">Día ${d - ult}</text><text x="${x(ult)}" y="${H - 4}" text-anchor="end">Hoy</text>`}
    </svg>`;
  }

  // ---------------------------------------------------------------- misión
  const MISION = { id: "transito-marte", nombre: "Tránsito a Marte", dias: 210 };
  /** Progreso de la misión, con el mismo dibujo del teléfono. */
  function barraMision(d) {
    const dd = d == null ? dia : d;
    const pct = Math.max(0, Math.min(100, (dd / MISION.dias) * 100));
    return `<div class="mision" role="progressbar" aria-valuemin="0" aria-valuemax="${MISION.dias}" aria-valuenow="${dd}" aria-label="${MISION.nombre}: día ${dd} de ${MISION.dias}">
      <div class="mision-txt"><span>${MISION.nombre}</span><span><b>Día ${dd}</b> de ${MISION.dias}</span></div>
      <div class="mision-barra"><i style="width:${pct.toFixed(1)}%"></i><span class="mision-nave" style="left:${pct.toFixed(1)}%">${ic("cohete", "ic-sm")}</span></div>
      <div class="mision-pie"><span>Tierra</span><span>${Math.round(pct)} % · faltan ${MISION.dias - dd} días</span><span>Marte</span></div>
    </div>`;
  }

  /** Tarjeta de la misión (la usan la central y la base). */
  function tarjetaMision(o) {
    const g = general();
    const n = [0, 1, 2].map((x) => PERSONAS.filter((p) => ev(p.id).general === x).length);
    const conteo = [[0, "en su normal"], [1, "en atención"], [2, "actúa ahora"]].filter(([x]) => n[x]).map(([x, t]) => sem(x, `${n[x]} ${t}`)).join("");
    return `<section class="tarjeta cn-mision es-${g}" aria-labelledby="t-mision">
      <div>
        <p class="cn-etq">${o.etq}</p>
        <h1 id="t-mision">${MISION.nombre}</h1>
        <div class="cn-estado-fila"><span>Estado general:</span>${sem(g)}<span class="cn-conteo">${conteo}<span>de ${PERSONAS.length} tripulantes</span></span></div>
        ${o.extra || ""}
        ${barraMision()}
      </div>
      <p class="cn-dia-grande"><b class="num">${dia}</b><span>día de ${MISION.dias} · ${fechaDia(dia)}</span></p>
    </section>`;
  }

  // ---------------------------------------------------------------- Cuerpo LUNNA
  /** Cuerpo LUNNA pequeño para las tarjetas de la tripulación: órganos con el color de su estado. */
  const cuerpoMini = (p, e) => `<div class="escaner oscuro" aria-hidden="true"><div class="cn-mini">${C.svg({ sexo: p.sexo, regiones: e.regiones, marcas: false })
    .replace(/ role="button" tabindex="0"/g, "").replace(/ role="group"/, "")}</div></div>`;
  /** Tarjeta de un tripulante (se usa en la central y en la base). */
  function tarjetaTripulante(p, href, pie) {
    const e = ev(p.id);
    const alertas = e.alertas.map((a) => chip(a.nivel, NOMBRE_ALERTA[a.id] || a.id)).join("");
    const extras = Object.keys(IND).filter((k) => (e.nivelDe(k) || 0) > 0 && !e.alertas.some((a) => a.senales.includes(k)))
      .map((k) => chip(e.nivelDe(k), IND[k].corto || IND[k].nombre)).join("");
    return `<a class="cn-trip es-${e.general}" href="${href}" aria-label="${esc(p.nombre)}, ${esc(p.rol)}: ${ESTADO_TXT[e.general]}. Abrir panel">
      ${cuerpoMini(p, e)}
      <div class="cn-trip-cab"><span class="avatar" style="--c:${p.color}">${p.nombre[0]}</span><div><b>${esc(p.nombre)}</b><small>${p.id} · ${esc(p.rol)}</small></div></div>
      <div>${sem(e.general)}</div>
      <div class="cn-chips">${alertas}${extras}${!alertas && !extras ? chip(0, "Sin avisos") : ""}</div>
      <div class="cn-trip-pie"><span>${pie || "Ver panel clínico"}</span>${ic("chevron", "ic-sm")}</div>
    </a>`;
  }

  // ---------------------------------------------------------------- panel clínico (central y base)
  // visor: "cmo" (computadora central) o "tierra" (base). Cada quien ve lo que le permite la matriz de
  // privacidad del teléfono (ERS §6.5): la CMO ve la tendencia semanal del ánimo; Tierra, su puntuación.
  const REGIONES_VISTA = ["cabeza", "ojos", "corazon", "pulmones", "abdomen", "rinones", "musculos", "piel", "radiacion"];
  const PROC = { sensor: "medido", calculado: "calculado", estimado: "estimado", manual: "anotado a mano" };
  function filaVital(pid, k, d, opc) {
    const o = opc || {};
    const e = M.estadoIndicador(pid, k, d), ind = IND[k], v = valorDe(pid, k, e), n = ev(pid, d).nivelDe(k);
    const normal = e.normal ? `su normal ${M.texto(k, e.normal.med)}` : ind.abs ? ind.abs.texto : "";
    return `<div class="cn-vital" data-k="${k}">
      <span class="cn-vital-nombre">${ic(ind.icono || "info")}${esc(ind.nombre)}</span>
      <span class="cn-vital-valor">${v.v}<small>${esc(v.u)}</small></span>
      ${o.grande ? `<div style="grid-column:1/-1">${grafNormal(pid, k, d, false)}</div>` : grafNormal(pid, k, d, true)}
      <span class="cn-vital-pie">${sem(n)}<span>${esc(o.grande ? ind.porQue : normal)}</span>${!o.grande && e.z != null ? `<span class="num">z ${zTxt(e.z)}</span>` : ""}${o.grande ? "" : `<span>${PROC[ind.proc]}${e.valor == null && e.ultimo ? ` · del día ${e.ultimo.dia}` : ""}</span>`}</span>
    </div>`;
  }
  function filaAnimo(pid, d, visor, grande) {
    if (visor === "tierra") return filaVital(pid, "animo", d, { grande });
    const s = M.SERIES[pid].animo, i = M.idx(d);
    const prom = (a, b) => { const xs = s.slice(Math.max(0, a), b).filter((x) => x != null); return xs.length ? xs.reduce((x, y) => x + y, 0) / xs.length : null; };
    const antes = prom(i - 13, i - 6), ahora = prom(i - 6, i + 1);
    const t = antes == null || ahora == null ? "→ sin datos" : ahora - antes > 3 ? "↑ más estrés" : antes - ahora > 3 ? "↓ menos estrés" : "→ estable";
    return `<div class="cn-vital"><span class="cn-vital-nombre">${ic("chispa")}Ánimo (estrés del check-in)</span><span class="cn-vital-valor" style="font-size:15px">${t}</span>
      <span class="cn-vital-pie">${ic("candado", "ic-sm")}<span>La CMO ve la tendencia semanal; el valor diario, solo con su permiso.</span></span></div>`;
  }
  function anillo(frac, centro, etiqueta, color) {
    const R = 30, L = 2 * Math.PI * R, f = Math.max(0, Math.min(1, frac));
    return `<div class="cn-anillo" style="--c:${color}"><span class="cn-anillo-c"><svg viewBox="0 0 76 76" aria-hidden="true"><circle class="pista" cx="38" cy="38" r="${R}"/><circle class="arco" cx="38" cy="38" r="${R}" stroke-dasharray="${L.toFixed(1)}" stroke-dashoffset="${(L * (1 - f)).toFixed(1)}"/></svg><b>${centro}</b></span><span>${etiqueta}</span></div>`;
  }
  /** Anillos de metas (sueño, agua, ejercicio) y dosis personal. */
  function metasYDosis(pid, d) {
    const x = persona(pid), e = ev(pid, d), i = M.idx(d), s = M.estadoIndicador(pid, "sueno", d), sv = s.valor != null ? s.valor : s.ultimo && s.ultimo.valor, dp = M.dosisPersonal(pid, d);
    const agua = M.SERIES[pid].agua[i], meta = 32 * x.masaKg / 1000, ej = M.SERIES[pid].ejercicio[i];
    return `<div class="cn-anillos">
        ${anillo(s.normal && sv ? sv / s.normal.med : 0, s.normal && sv ? `${Math.round((sv / s.normal.med) * 100)}%` : "–", "Sueño vs su normal", "var(--serie-1)")}
        ${anillo(agua / meta, fmt(agua, 1), `Agua (L de ${fmt(meta, 1)})`, "var(--serie-2)")}
        ${anillo(ej / 90, String(ej), "Ejercicio (min de 90)", "var(--serie-3)")}</div>
      <div class="cn-fila" style="margin-top:8px">${sem(e.regiones.radiacion, false)}<span><b>Dosis de la misión: <span class="num">${fmt(dp.mision, 1)}</span> mSv de 600</b><small>Del evento solar: ${fmt(dp.evento, 2)} mSv de 250 · límites [A] NASA-STD-3001</small></span><span></span></div>`;
  }
  function panelRegion(pid, r, d, visor) {
    const def = M.REGIONES[r], e = ev(pid, d), n = e.regiones[r], x = persona(pid), i = M.idx(d);
    const partes = def.ind.map((k) => (k === "animo" ? filaAnimo(pid, d, visor, true) : filaVital(pid, k, d, { grande: true })));
    if (def.cabina === "co2") { const cab = M.cabina(d); partes.push(`<div class="cn-fila">${sem(cab.co2 > 3 ? 1 : 0, false)}<span><b>CO₂ de cabina: ${fmt(cab.co2, 1)} mmHg</b><small>Límite [A] ≤ 3 mmHg (promedio de 1 h)</small></span><span></span></div>`); }
    if (def.cabina === "radiacion") { const dp = M.dosisPersonal(pid, d), cab = M.cabina(d); partes.push(`<div class="cn-fila">${sem(e.regiones.radiacion, false)}<span><b>Dosis de la misión: ${fmt(dp.mision, 1)} mSv de 600</b><small>Del evento solar: ${fmt(dp.evento, 2)} mSv de 250 · tasa en cabina ${cab.tasa.toLocaleString("es-ES")} µSv/h [A]</small></span><span></span></div>`); }
    if (def.metas && def.metas.includes("agua")) { const a = M.SERIES[pid].agua[i]; partes.push(`<div class="cn-fila">${pastilla("gota", "#38D1F0", "#0B8DB8")}<span><b>Agua de hoy: ${fmt(a, 1)} L de ${fmt(32 * x.masaKg / 1000, 1)} L</b><small>Meta [A] 32 mL/kg</small></span><span></span></div>`); }
    if (def.metas && def.metas.includes("ejercicio")) { const m = M.SERIES[pid].ejercicio[i]; partes.push(`<div class="cn-fila">${pastilla("pesa", "#FF8A3D", "#E0571F")}<span><b>Ejercicio de hoy: ${m} min de 90</b><small>Meta [A] ISS 1,5 h/día (ARED, CEVIS, T2)</small></span><span></span></div>`); }
    if (def.nota) partes.push(`<p class="cn-nota">${esc(def.nota)}</p>`);
    return `<div class="cn-region" id="region-panel"><h3>${forma(n, 14)} ${esc(def.nombre)}</h3><p class="cn-nota">Peligro del HRP: <b>${esc(def.peligro)}</b> · ${esc(ESTADO_TXT[n == null ? "nd" : n])}</p>${partes.join("") || `<div class="cn-vacio">Sin indicadores a bordo para esta zona.</div>`}</div>`;
  }
  /** Cuerpo LUNNA grande con sus zonas y, debajo, el detalle de la zona elegida. */
  function centroCuerpo(pid, d, visor, seleccion) {
    const x = persona(pid), e = ev(pid, d);
    const peor = REGIONES_VISTA.reduce((a, r) => ((e.regiones[r] ?? -1) > (e.regiones[a] ?? -1) ? r : a), "cabeza");
    const r = (seleccion && seleccion[pid]) || peor;
    const quien = visor === "tierra" ? "Tierra" : "la CMO";
    const chips = REGIONES_VISTA.map((z) => `<li><button type="button" data-region="${z}" aria-pressed="${z === r}">${forma(e.regiones[z], 11)}${esc(z === "radiacion" ? "Radiación" : M.REGIONES[z].nombre)}</button></li>`).join("")
      + (x.sexo === "M" ? `<li><button type="button" disabled title="Privado: solo ella lo ve; ${quien}, con su permiso">${ic("candado", "ic-sm")}Salud femenina</button></li>` : "");
    return `<section class="escaner oscuro" aria-label="Cuerpo LUNNA de ${esc(x.nombre)}">
        <div class="esc-cab"><div><span class="esc-titulo">${visor === "tierra" ? "Cuerpo LUNNA · lo que llegó" : "Cuerpo LUNNA · escaneo"}</span><p class="esc-nombre">${esc(x.nombre)}</p><p class="esc-sub">${x.id} · día ${d} · ${fechaDia(d)}</p></div><span class="esc-estado">${sem(e.general)}</span></div>
        <div class="esc-lienzo">${C.svg({ sexo: x.sexo, regiones: e.regiones })}<div class="esc-barrido" aria-hidden="true"></div></div>
        <ul class="esc-regiones" aria-label="Zonas del cuerpo">${chips}</ul>
        <div class="esc-pie"><span class="vivo">${visor === "tierra" ? `SCET D${d} 07:42 · hace ${OWLT_ESCENARIO_MIN} min` : "Escaneo del día"}</span><span>● ■ ▲ ○</span></div>
      </section>
      ${panelRegion(pid, r, d, visor)}`;
  }
  /** Conecta los clics del cuerpo y de las zonas (contenedor #centro). */
  function conectarCuerpo(cont, pid, d, visor, seleccion) {
    const centro = $("#centro", cont);
    if (!centro) return;
    const abrir = (r) => {
      seleccion[pid] = r;
      centro.innerHTML = centroCuerpo(pid, d, visor, seleccion);
      conectarCuerpo(cont, pid, d, visor, seleccion);
      const panel = $("#region-panel", cont);
      if (panel) panel.scrollIntoView({ block: "nearest", behavior: "smooth" });
    };
    $$("[data-region]", centro).forEach((el) => {
      if (el.disabled) return;
      el.addEventListener("click", () => abrir(el.dataset.region));
      if (el.tagName !== "BUTTON") el.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); abrir(el.dataset.region); } });
    });
  }

  // ---------------------------------------------------------------- índice por padecimiento (pesos de Leo)
  // Índice = Σ peso × puntos / máximo posible (modelo-pesos/README.md). Puntos 0–3 por |z| contra su normal,
  // solo en la dirección fisiológica del malestar. Lo que no se puede medir con los datos diarios queda fuera
  // del numerador y del máximo, y se informa la cobertura.
  const MALESTARES = PESOS.malestares;
  const CELDAS = PESOS.celdas;
  const VAR_MOTOR = { fc_reposo: "fc", spo2: "spo2", respiracion: "fr", temperatura: "temperatura", presion_arterial: "presion", sueno: "sueno", pvt_lapsos: "lapsos" };
  const NOMBRE_VAR = { fc_reposo: "Pulso en reposo", spo2: "SpO₂", respiracion: "Respiración", temperatura: "Temperatura", presion_arterial: "Presión arterial", sueno: "Sueño", pvt_lapsos: "Reflejos (PVT-B)", co2_cabina: "CO₂ de cabina", sintomas: "Síntomas" };
  const NO_MEDIBLE = /irregular|al ponerse de pie|fase/;
  function puntosZ(z, dir) {
    const ambas = dir.startsWith("↑/↓");
    if (!ambas && dir.startsWith("↑") && z < 0) return 0;
    if (!ambas && dir.startsWith("↓") && z > 0) return 0;
    const a = Math.abs(z);
    return a < 1 ? 0 : a < 2 ? 1 : a < 3 ? 2 : 3;
  }
  /** Puntos de una variable para un malestar; puntos = null si no se puede medir hoy. */
  function senal(pid, v, dir, d) {
    if (v === "sintomas") return { puntos: null, motivo: "Los síntomas del check-in aún no llegan a esta consola" };
    if (NO_MEDIBLE.test(dir)) return { puntos: null, motivo: `«${dir}» pide una medición específica que no está en los datos diarios` };
    if (v === "co2_cabina") {
      const co2 = M.cabina(d).co2;
      return { puntos: co2 > 3 ? 2 : 0, valor: `${fmt(co2, 1)} mmHg`, fuente: "umbral", detalle: "umbral ≤ 3 mmHg [A]" };
    }
    const k = VAR_MOTOR[v], e = M.estadoIndicador(pid, k, d), ind = IND[k];
    const vigente = e.valor != null || (e.ultimo && d - e.ultimo.dia <= 1);
    if (!vigente) return { puntos: null, motivo: "Sin dato hoy" };
    const vv = valorDe(pid, k, e), valor = `${vv.v} ${vv.u}`;
    if (ind.sinNormal) {
      // Presión y SpO₂ no tienen "su normal" en el motor: se usan los umbrales del teléfono (atención → 2, alerta → 3).
      const ambas = dir.startsWith("↑/↓"), sube = k === "presion";
      const enDireccion = ambas || (sube ? dir.startsWith("↑") : dir.startsWith("↓"));
      return { puntos: enDireccion ? [0, 2, 3][e.nivel || 0] : 0, valor, fuente: "umbral", detalle: ind.abs ? ind.abs.texto : "" };
    }
    if (e.z == null) return { puntos: null, motivo: "Aún sin su normal (menos de 7 días con dato)" };
    return { puntos: puntosZ(e.z, dir), z: e.z, valor, fuente: "z", detalle: `z ${zTxt(e.z)} contra su normal` };
  }
  function indice(pid, mid, d) {
    const dd = d == null ? dia : d;
    const k = `ind|${pid}|${mid}|${dd}`;
    if (cache.has(k)) return cache.get(k);
    let num = 0, max = 0, total = 0;
    const det = CELDAS.filter((c) => c.m === mid).map((c) => {
      total += c.peso * 3;
      const s = senal(pid, c.v, c.dir, dd);
      if (s.puntos != null) { num += c.peso * s.puntos; max += c.peso * 3; }
      return Object.assign({}, c, s);
    }).sort((a, b) => b.peso - a.peso);
    const pesoMax = Math.max(...det.map((x) => x.peso));
    const faltan = det.filter((x) => x.peso === pesoMax && x.puntos == null);
    const r = {
      mid, mal: MALESTARES.find((x) => x.id === mid), num, max, det,
      valor: max ? num / max : null,
      // Incompleto: falta su variable de mayor peso, así que el número lo arman marcadores poco específicos.
      completo: faltan.length === 0, faltan: faltan.map((x) => NOMBRE_VAR[x.v] === "Síntomas" ? x.dir : NOMBRE_VAR[x.v] || x.v),
      cobertura: total ? max / total : 0,
      regla: det.some((x) => x.peso === 3 && x.puntos === 3), // una variable de peso 3 en 3 puntos (como la NEWS)
    };
    cache.set(k, r);
    return r;
  }
  const indices = (pid, d) => MALESTARES.map((m) => indice(pid, m.id, d))
    .sort((a, b) => (b.regla - a.regla) || (b.completo - a.completo) || ((b.valor ?? -1) - (a.valor ?? -1)) || a.mid - b.mid);
  /** Índice de los últimos días y su extrapolación lineal a 3 días (ILUSTRATIVA, no es un modelo validado). */
  function tendencia(pid, mid, d, atras, adelante) {
    const dd = d == null ? dia : d, n = atras || 6, k = adelante || 3;
    const serie = [];
    for (let x = Math.max(M.PRIMER_DIA + 7, dd - n); x <= dd; x++) serie.push({ d: x, v: indice(pid, mid, x).valor });
    const pts = serie.filter((s) => s.v != null).slice(-5);
    let pendiente = 0, base = pts.length ? pts[pts.length - 1].v : null;
    if (pts.length >= 3) {
      const mx = pts.reduce((s, p) => s + p.d, 0) / pts.length, my = pts.reduce((s, p) => s + p.v, 0) / pts.length;
      const sxx = pts.reduce((s, p) => s + (p.d - mx) ** 2, 0);
      pendiente = sxx ? pts.reduce((s, p) => s + (p.d - mx) * (p.v - my), 0) / sxx : 0;
      base = my + pendiente * (dd - mx);
    }
    const proy = base == null ? [] : Array.from({ length: k }, (_, i) => ({ d: dd + i + 1, v: Math.max(0, Math.min(1, base + pendiente * (i + 1))) }));
    const rumbo = Math.abs(pendiente) < 0.02 ? "estable" : pendiente > 0 ? "sube" : "baja";
    return { serie, proy, pendiente, rumbo };
  }
  const RUMBO = { sube: ["↗", "va al alza"], baja: ["↘", "va a la baja"], estable: ["→", "estable"] };

  /** Barras del índice de los 11 padecimientos para una persona. */
  function barrasIndice(pid, d, opciones) {
    const o = opciones || {};
    const lista = indices(pid, d).slice(0, o.max || 11);
    return `<div class="cn-indices" role="list">${lista.map((r) => {
      const v = r.valor;
      const t = tendencia(pid, r.mid, d);
      return `<button type="button" class="cn-ind${r.completo ? "" : " incompleto"}" role="listitem" data-ind="${r.mid}" data-pid="${pid}" aria-pressed="${o.sel === r.mid}"
        title="${esc(r.mal.nombre)} · índice ${v == null ? "sin datos" : fmt(v, 2)} · cobertura ${Math.round(r.cobertura * 100)} % del peso${r.completo ? "" : ` · incompleto: falta ${r.faltan.join(", ")}`}${r.regla ? " · regla de peso 3" : ""}">
        <span>${r.regla ? `<span class="cn-regla" aria-label="Regla de peso 3">${forma(2, 11)}</span>` : ""}<em>${esc(r.mal.corto)}</em>${r.completo ? "" : `<small class="cn-falta">incompleto</small>`}</span>
        <span class="cn-pista${v == null ? " sin" : ""}"><i style="--v:${v == null ? 0 : v.toFixed(3)}"></i></span>
        <span class="num">${v == null ? "–" : fmt(v, 2)} <small class="tenue" aria-label="${RUMBO[t.rumbo][1]}">${RUMBO[t.rumbo][0]}</small></span>
      </button>`;
    }).join("")}</div>`;
  }
  /** Tabla de lo que suma cada variable al índice de un padecimiento. */
  function detalleIndice(pid, mid, d) {
    const r = indice(pid, mid, d);
    const fila = (x) => `<tr>
      <th scope="row">${esc(NOMBRE_VAR[x.v] || x.v)}<br><small class="tenue">${esc(x.dir)}</small></th>
      <td class="num">${x.peso}</td>
      <td><span class="cn-ev ${x.ev}" title="${{ A: "Relación medida", B: "Mecanismo documentado", C: "Juicio del equipo" }[x.ev]}">${x.ev}</span></td>
      <td>${x.puntos == null ? `<span class="tenue">${esc(x.motivo)}</span>` : `<span class="cn-puntos" aria-label="${x.puntos} de 3 puntos">${[1, 2, 3].map((n) => `<i class="${n <= x.puntos ? "on" : ""}"></i>`).join("")}</span> <b class="num">${x.puntos}</b><br><small class="tenue">${esc(x.valor || "")} · ${esc(x.detalle || "")}</small>`}</td>
      <td class="num">${x.puntos == null ? "–" : x.peso * x.puntos}</td>
    </tr>`;
    return `<div class="cn-detalle-ind">
      <p class="cn-nota"><b>${esc(r.mal.nombre)}</b> · ${esc(r.mal.riesgo)}</p>
      <div class="cn-tabla-caja"><table>
        <thead><tr><th>Variable</th><th>Peso</th><th>Ev.</th><th>Puntos de hoy</th><th>Suma</th></tr></thead>
        <tbody>${r.det.map(fila).join("")}</tbody>
      </table></div>
      ${r.completo ? "" : `<p class="cn-privado">${ic("info")}<span><b>Incompleto:</b> falta su variable de mayor peso (${esc(r.faltan.join(", "))}). El número lo arman marcadores poco específicos; léelo con cuidado.</span></p>`}
      <p class="cn-nota">Índice = Σ peso × puntos / máximo = <b class="num">${r.num}</b> / <b class="num">${r.max || 0}</b> = <b class="num">${r.valor == null ? "sin datos" : fmt(r.valor, 2)}</b> ·
        cobertura <b>${Math.round(r.cobertura * 100)} %</b> del peso total${r.regla ? ` · ${sem(2, "una variable de peso 3 llegó a 3 puntos")}` : ""}.</p>
    </div>`;
  }
  /** Gráfica del índice: últimos días (línea) y extrapolación a 3 días (discontinua). */
  function grafIndice(pid, mids, d) {
    const dd = d == null ? dia : d;
    const series = mids.map((mid, i) => Object.assign({ mid, c: `var(--serie-${i + 1})` }, tendencia(pid, mid, dd)));
    const dias = [];
    for (let x = Math.max(M.PRIMER_DIA + 7, dd - 6); x <= dd + 3; x++) dias.push(x);
    const W = 360, H = 150, mi = 30, md = 10, ma = 10, mb = 20;
    const x = (v) => mi + ((v - dias[0]) / Math.max(1, dias[dias.length - 1] - dias[0])) * (W - mi - md);
    const y = (v) => ma + (1 - v) * (H - ma - mb);
    const linea = (pts) => pts.filter((p) => p.v != null).map((p, i) => `${i ? "L" : "M"}${x(p.d).toFixed(1)},${y(p.v).toFixed(1)}`).join("");
    return `<svg class="cn-graf" viewBox="0 0 ${W} ${H}" role="img" aria-label="Índice de los últimos días y su tendencia ilustrativa a 3 días">
      ${[0, 0.5, 1].map((t) => `<line class="eje" x1="${mi}" x2="${W - md}" y1="${y(t)}" y2="${y(t)}"/><text x="${mi - 5}" y="${y(t) + 3}" text-anchor="end">${fmt(t, 1)}</text>`).join("")}
      <line class="hoy-linea" x1="${x(dd)}" x2="${x(dd)}" y1="${ma}" y2="${H - mb}"/>
      <text x="${x(dd)}" y="${H - 6}" text-anchor="middle">Hoy</text>
      <text x="${x(dias[0])}" y="${H - 6}">D${dias[0]}</text><text x="${x(dd + 3)}" y="${H - 6}" text-anchor="end">D${dd + 3}</text>
      ${series.map((s) => {
        const ult = s.serie.filter((p) => p.v != null).slice(-1)[0];
        return `<path class="serie" d="${linea(s.serie)}" stroke="${s.c}"/>
          ${ult && s.proy.length ? `<path class="proy" d="M${x(ult.d).toFixed(1)},${y(ult.v).toFixed(1)}${s.proy.map((p) => `L${x(p.d).toFixed(1)},${y(p.v).toFixed(1)}`).join("")}" stroke="${s.c}"/>` : ""}
          ${s.serie.filter((p) => p.v != null).map((p) => `<circle cx="${x(p.d).toFixed(1)}" cy="${y(p.v).toFixed(1)}" r="${p.d === dd ? 4.2 : 2.6}" fill="${s.c}"/>`).join("")}`;
      }).join("")}
    </svg>
    <div class="cn-leyenda-graf">${series.map((s) => `<span><i style="--c:${s.c}"></i>${esc(MALESTARES.find((m) => m.id === s.mid).corto)} ${RUMBO[s.rumbo][0]}</span>`).join("")}
      <span><i class="discontinua" style="--c:var(--texto-2)"></i>Tendencia a 3 días (ilustrativa)</span></div>`;
  }

  // ---------------------------------------------------------------- enlace con Tierra
  // Sin backend, la central y la base se hablan por este navegador (localStorage) con el retraso de la luz.
  // El escenario usa 18 min por trayecto; en la demo pasan 18 s (×60) para que se vea. Con el backend de
  // Julio, la base además manda el aviso por /api/tierra/avisos y el teléfono lo recibe como notificación.
  const CLAVE_ENLACE = "lunna:enlace", CLAVE_OWLT = "lunna:owlt";
  const OWLT_ESCENARIO_MIN = (window.DATOS && window.DATOS.TRIPULACION && window.DATOS.TRIPULACION.retrasoTierraMin) || 18;
  let backend = null;
  const owltSeg = () => {
    if (backend && backend.owlt_s > 0) return backend.owlt_s;
    try { const v = +localStorage.getItem(CLAVE_OWLT); return v > 0 ? v : 18; } catch { return 18; }
  };
  function leerEnlace() {
    try { const x = JSON.parse(localStorage.getItem(CLAVE_ENLACE) || "[]"); return Array.isArray(x) ? x : []; } catch { return []; }
  }
  function guardarEnlace(l) { try { localStorage.setItem(CLAVE_ENLACE, JSON.stringify(l.slice(-200))); } catch { /* sin almacenamiento */ } }
  /** sentido: "subida" (Tierra → nave) · "bajada" (nave → Tierra) · "abordo" (central → teléfono, sin retraso). */
  function enviarEnlace(m) {
    const ahora = Date.now(), retardo = m.sentido === "abordo" ? 0 : owltSeg() * 1000;
    const msg = Object.assign({ id: m.sentido[0] + ahora.toString(36) + Math.random().toString(36).slice(2, 6), dia, hora: horaReal(ahora), t_envio: ahora, t_llegada: ahora + retardo }, m);
    const l = leerEnlace(); l.push(msg); guardarEnlace(l);
    revisarLlegadas();
    return msg;
  }
  /** En qué parte del recorrido va un mensaje: 0 redactado · 1 en camino · 2 llegó · 3 acuse de vuelta. */
  function etapa(m, ahora) {
    const t = ahora || Date.now();
    if (m.sentido === "abordo") return { i: 3, p: 1, faltaLlegada: 0, faltaAcuse: 0 };
    const viaje = Math.max(1, m.t_llegada - m.t_envio), t2 = m.t_llegada + viaje;
    return { i: t < m.t_llegada ? 1 : t < t2 ? 2 : 3, p: Math.max(0, Math.min(1, (t - m.t_envio) / (t2 - m.t_envio))), faltaLlegada: Math.max(0, m.t_llegada - t), faltaAcuse: Math.max(0, t2 - t) };
  }
  const llegados = (sentido) => leerEnlace().filter((m) => m.sentido === sentido && m.t_llegada <= Date.now());
  const enCamino = (sentido) => leerEnlace().filter((m) => m.sentido === sentido && m.t_llegada > Date.now());
  const segTxt = (ms) => { const s = Math.ceil(ms / 1000); return s >= 60 ? `${Math.floor(s / 60)} min ${s % 60} s` : `${s} s`; };
  const NIVEL_MSJ = {
    aviso: { n: 0, txt: "Aviso", backend: null },
    atencion: { n: 1, txt: "Atención", backend: "ambar" },
    urgente: { n: 2, txt: "Urgente", backend: "rojo" },
  };
  const vistos = new Set();
  const oyentesLlegada = [];
  let primeraRevision = true;
  function revisarLlegadas() {
    const ahora = Date.now();
    for (const m of leerEnlace()) {
      if (m.t_llegada > ahora || vistos.has(m.id)) continue;
      vistos.add(m.id);
      if (!primeraRevision) oyentesLlegada.forEach((f) => f(m));
    }
    primeraRevision = false;
  }
  const oyentesEnlace = [];
  setInterval(() => { revisarLlegadas(); oyentesEnlace.forEach((f) => f()); }, 1000);
  window.addEventListener("storage", (e) => { if (e.key === CLAVE_ENLACE || e.key === CLAVE_OWLT) { revisarLlegadas(); oyentesEnlace.forEach((f) => f()); } });

  async function detectarBackend() {
    try {
      const r = await fetch("/api/salud", { cache: "no-store" });
      if (!r.ok) return null;
      const s = await r.json();
      if (!s || !s.version) return null;
      const e = await (await fetch("/api/enlace", { cache: "no-store" })).json();
      backend = { version: s.version, owlt_s: +e.owlt_s || 20, abierto: e.abierto !== false };
    } catch { backend = null; }
    pintarEnlacePildora();
    return backend;
  }
  /** Manda un aviso de Tierra por el backend de Julio (si está corriendo). */
  async function avisoBackend(m) {
    if (!backend) return false;
    const nivel = NIVEL_MSJ[m.nivel] || NIVEL_MSJ.aviso;
    const cuerpo = { tipo: nivel.backend ? "alerta" : "aviso", para: BACKEND_ID[m.pid] || "todos", texto: m.texto, de: m.de || "Cirujano de vuelo" };
    // Variable con el id del catálogo que usa el backend (signos de la playera y el brazalete).
    const VAR_BACKEND = { fc: "04:A4", spo2: "04:A3", fr: "04:A2", temperatura: "04:A1", presion: "01:V1" };
    if (nivel.backend) { cuerpo.nivel = nivel.backend; if (m.variable) cuerpo.variable = VAR_BACKEND[m.variable] || (IND[m.variable] && IND[m.variable].varId) || m.variable; }
    try {
      const r = await fetch("/api/tierra/avisos", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(cuerpo) });
      return r.ok;
    } catch { return false; }
  }

  // ---------------------------------------------------------------- escenario (lo mismo que cuenta el teléfono)
  /** Paquetes que la nave baja a Tierra según el día (cola priorizada: rojos → ámbares → resúmenes). */
  function paquetesEscenario(d) {
    const dd = d == null ? dia : d, out = [];
    const fat = M.fatiga("MS-2", 112);
    if (dd >= 112 && fat) {
      const lineas = fat.hoy.es.map((e) => `${IND[e.k].corto || IND[e.k].nombre}: ${M.texto(e.k, e.valor)} · su normal ${M.texto(e.k, e.normal.med)} · z ${zTxt(e.z)}`);
      out.push({ id: "esc-fat-112", prio: 1, nivel: 1, pid: "MS-2", tipo: "alerta", titulo: "FATIGA-03 de Ana · atención", texto: "Sueño, reflejos y pulso en reposo se alejaron juntos de su normal (ninguna sola dispararía).", evidencia: lineas, dia: 112, hora: "07:46" });
    }
    if (dd >= 114) out.push({ id: "esc-fat-114", prio: 2, nivel: 0, pid: "MS-2", tipo: "resumen", titulo: "FATIGA-03 de Ana cerrada", texto: "Dos días seguidos con las tres señales en su normal (z < 2).", dia: 114, hora: "07:50" });
    if (dd >= 115) {
      const cab = M.cabina(115);
      out.push({ id: "esc-solar-115", prio: 0, nivel: 2, tipo: "alerta", titulo: "Evento de partículas solares · refugio", texto: `Tasa de dosis ${cab.tasa.toLocaleString("es-ES")} µSv/h (diseño < 54). Tripulación al refugio blindado; buddy check en curso.`, evidencia: [`Modelado sobre el evento real de DONKI ${M.DONKI.id} (${M.DONKI.instrumento})`], dia: 115, hora: "11:04" });
    }
    for (let x = Math.max(110, dd - 3); x < dd; x++) out.push({ id: `esc-res-${x}`, prio: 2, nivel: 0, tipo: "resumen", titulo: "Resumen diario de la tripulación", texto: "Último valor de cada variable, su normal y la banda de LUNNA.", dia: x, hora: "22:00" });
    return out.sort((a, b) => a.prio - b.prio || b.dia - a.dia || (b.hora > a.hora ? 1 : -1));
  }
  /** Lo que Tierra subió a la nave en el escenario. */
  function notasTierra(d) {
    const dd = d == null ? dia : d;
    return dd >= 114 ? [{ id: "esc-nota-114", de: "Cirujano de vuelo", pid: "MS-2", nivel: "aviso", texto: "Recomiendo priorizar el sueño de Ana y revalorar antes de la caminata espacial.", sobre: "SCET D112 07:46", llego: "llegó con 41 min de antigüedad", nota: "Es anterior al cierre de FATIGA-03 (día 114): la decisión de a bordo es más reciente y no se pisa en silencio." }] : [];
  }
  /** Ambiente de cabina con sus límites (los mismos del teléfono). */
  function ambiente(d) {
    const cab = M.cabina(d == null ? dia : d);
    return [
      ["CO₂ de cabina", fmt(cab.co2, 1), "mmHg", "≤ 3 (promedio 1 h)", cab.co2 <= 3 ? 0 : 1, "ola"],
      ["O₂ inspirado", "149", "mmHg", "145–155 · mín. 127", 0, "gota"],
      ["Temperatura", "22,4", "°C", "18–27", 0, "fuego"],
      ["Humedad", "46", "%", "25–75", 0, "gota"],
      ["Ruido", "61", "dBA", "75 en 8 h", 0, "voz"],
      ["Tasa de dosis", cab.tasa.toLocaleString("es-ES"), "µSv/h", "< 54 · refugio ≥ 3000", cab.tasa >= 3000 ? 2 : cab.tasa > 54 ? 1 : 0, "rayo"],
    ];
  }

  // ---------------------------------------------------------------- avisos flotantes
  function toast(o) {
    let pila = $(".cn-toast-pila");
    if (!pila) { pila = document.createElement("div"); pila.className = "cn-toast-pila"; pila.setAttribute("aria-live", "polite"); document.body.appendChild(pila); }
    const t = document.createElement("div");
    t.className = "cn-toast";
    t.setAttribute("role", o.alerta ? "alert" : "status");
    t.innerHTML = `${pastilla(o.icono || "info", o.c1 || "#38D1F0", o.c2 || "#0B8DB8")}<div><b>${esc(o.titulo)}</b>${o.texto ? `<p>${esc(o.texto)}</p>` : ""}</div><button type="button" aria-label="Cerrar">×</button>`;
    const cerrar = () => { t.classList.add("sale"); setTimeout(() => t.remove(), 260); };
    t.querySelector("button").addEventListener("click", (e) => { e.stopPropagation(); cerrar(); });
    t.addEventListener("click", () => { if (o.alClic) o.alClic(); cerrar(); });
    pila.prepend(t);
    while (pila.children.length > 3) pila.lastChild.remove();
    setTimeout(() => t.isConnected && cerrar(), o.ms || 7000);
  }

  // ---------------------------------------------------------------- barra superior y navegación
  let lunaMarca = null;
  function pintarDia() {
    const c = $("#cn-dia");
    if (!c) return;
    $("b", c).textContent = `Día ${dia}`;
    $("small", c).textContent = fechaDia(dia);
    $("[data-dia='-1']", c).disabled = dia <= DIA_MIN;
    $("[data-dia='1']", c).disabled = dia >= DIA_MAX;
    $$("#cn-hitos button").forEach((b) => b.setAttribute("aria-pressed", String(+b.dataset.hito === dia)));
    if (lunaMarca) {
      const g = general();
      lunaMarca.poner(g === 2 ? (M.cabina(dia).solar ? "radiacion" : "alerta") : g === 1 ? "tranquila" : "feliz");
      lunaMarca.fase(g === 2 ? 0.12 : g === 1 ? 0.62 : 1);
    }
  }
  function pintarEnlacePildora() {
    const p = $("#cn-enlace");
    if (!p) return;
    const s = owltSeg();
    p.classList.toggle("cerrado", !!backend && !backend.abierto);
    p.title = backend
      ? `Enlace real con el backend de Julio (v${backend.version}): ${s} s por trayecto${backend.abierto ? "" : " · ventana cerrada"}`
      : `Enlace simulado en este navegador: ${s} s de demostración = ${OWLT_ESCENARIO_MIN} min del escenario por trayecto`;
    p.innerHTML = `<span class="vivo" aria-hidden="true"></span>${ic("antena", "ic-sm")}<span>Tierra <b>${backend ? `${s} s` : `${OWLT_ESCENARIO_MIN} min`}</b>${backend ? " · backend" : ""}</span>`;
  }
  /**
   * Monta la barra superior. app: "central" | "base". pestanas: [{ id, texto, icono, href }].
   */
  function montarBarra(o) {
    const otros = [
      ["index.html", "telefono", "Teléfono", "Abrir la app del teléfono (Lunna)"],
      ["central.html", "monitor", "Central", "Computadora central · panel médico"],
      ["base.html", "tierra", "Base", "Base en Tierra · control de misión"],
    ].filter(([h]) => !h.startsWith(o.app));
    $("#barra").innerHTML = `<div class="cn-barra-int">
      <a class="cn-marca" href="#hoy" aria-label="Lunna ${esc(o.subtitulo)}, ir a Hoy"><span id="cn-luna" aria-hidden="true"></span>
        <span class="cn-marca-txt"><b>Lunna</b><span>${esc(o.subtitulo)}</span></span></a>
      <div class="cn-ctrl">
        <span class="cn-pildora sim" title="Todo es simulado, salvo los eventos solares de NASA DONKI">${ic("planeta", "ic-sm")} Simulado</span>
        <span class="cn-pildora" id="cn-enlace"></span>
        <div class="cn-dia" id="cn-dia" role="group" aria-label="Día de la misión (simulación)">
          <button type="button" data-dia="-1" aria-label="Día anterior">‹</button><span><b></b><small></small></span><button type="button" data-dia="1" aria-label="Día siguiente">›</button>
        </div>
        <div class="cn-hitos" id="cn-hitos" aria-label="Momentos del escenario">${HITOS.map(([d, t]) => `<button type="button" data-hito="${d}"><b>${d}</b>${t}</button>`).join("")}</div>
        ${otros.map(([h, i, t, tt]) => `<a class="cn-boton" href="${h}" title="${tt}">${ic(i, "ic-sm")}${t}</a>`).join("")}
        <button type="button" class="cn-boton solo-ic" id="cn-tema" aria-label="Cambiar tema"></button>
      </div>
      <nav class="cn-pestanas" aria-label="Vistas">${o.pestanas.map((p) => `<a href="${p.href}" data-pestana="${p.id}">${ic(p.icono)}${p.texto}<span class="cuenta" data-cuenta="${p.id}" hidden></span></a>`).join("")}</nav>
    </div>`;
    $$("#cn-dia [data-dia]").forEach((b) => b.addEventListener("click", () => ponerDia(dia + +b.dataset.dia)));
    $$("#cn-hitos [data-hito]").forEach((b) => b.addEventListener("click", () => ponerDia(+b.dataset.hito)));
    $("#cn-tema").addEventListener("click", siguienteTema);
    if (window.LUNA) lunaMarca = window.LUNA.crear($("#cn-luna"), { cara: "tranquila", tam: 40, fase: 1 });
    aplicarTema();
    pintarDia();
    pintarEnlacePildora();
  }
  function marcarPestana(id) { $$(".cn-pestanas a").forEach((a) => a.setAttribute("aria-current", a.dataset.pestana === id ? "page" : "false")); }
  function cuenta(id, n) { const c = $(`[data-cuenta="${id}"]`); if (!c) return; c.hidden = !n; c.textContent = n; }
  /** Router por hash: tabla { hoy: fn(arg), tripulante: fn(id) ... }. */
  function enrutar(tabla, porDefecto) {
    const ir = () => {
      const [nombre, arg] = (location.hash.slice(1) || porDefecto).split("/");
      const f = tabla[nombre] || tabla[porDefecto];
      const pag = $("#pagina");
      f(pag, arg ? decodeURIComponent(arg) : null);
      pag.focus({ preventScroll: true });
    };
    window.addEventListener("hashchange", () => { ir(); window.scrollTo({ top: 0 }); });
    oyentesDia.push(ir);
    ir();
    return ir;
  }

  aplicarTema();
  revisarLlegadas();

  window.CONSOLA = {
    $, $$, esc, fmt, ic, pastilla, zTxt, horaReal, mem,
    get dia() { return dia; }, ponerDia, alCambiarDia: (f) => oyentesDia.push(f), fechaDia, DIA_MIN, DIA_MAX,
    PERSONAS, persona, CMO, BACKEND_ID, ev, general,
    ESTADO_TXT, claseN, sem, forma, chip, NOMBRE_ALERTA,
    IND, valorDe, grafNormal, MISION, barraMision, tarjetaMision, cuerpoMini, tarjetaTripulante,
    filaVital, filaAnimo, anillo, metasYDosis, panelRegion, centroCuerpo, conectarCuerpo,
    MALESTARES, NOMBRE_VAR, indice, indices, tendencia, RUMBO, barrasIndice, detalleIndice, grafIndice,
    OWLT_ESCENARIO_MIN, owltSeg, get backend() { return backend; }, detectarBackend, avisoBackend,
    leerEnlace, enviarEnlace, etapa, llegados, enCamino, segTxt, NIVEL_MSJ,
    alLlegar: (f) => oyentesLlegada.push(f), alTicEnlace: (f) => oyentesEnlace.push(f),
    paquetesEscenario, notasTierra, ambiente, toast,
    montarBarra, marcarPestana, cuenta, enrutar,
  };
})();
