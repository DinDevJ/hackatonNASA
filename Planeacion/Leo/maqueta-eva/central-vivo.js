/* LUNNA · computadora central: datos EN VIVO del backend de Julio.
 *
 * Cuando la central se sirve desde el backend (http://localhost:8787/app/central.html, o el PC del
 * simulador en /simulador) este archivo lee lo que la computadora central de verdad sabe y lo pinta en
 * los huecos `[data-vivo]` que deja central.js. Solo usa rutas y eventos que ya existen:
 *
 *   GET /api/salud               versión y entorno
 *   GET /api/tripulantes         la tripulación registrada
 *   GET /api/app/:tripulante     variables (último valor, esperado, banda, z, estado), alertas y avisos
 *   GET /api/alertas             alertas de LUNNA de toda la tripulación
 *   GET /api/enlace              retraso y ventana con Tierra
 *   GET /api/tierra/pendientes   lo que está en cola o en vuelo
 *   GET /api/avisos              avisos de Tierra ya entregados a bordo
 *   GET /api/stream (SSE)        muestra · alerta · rechazo · aviso · enlace
 *
 * No inventa nada: lo que el backend no ofrece (Cuerpo LUNNA, 14 días contra su normal, índice por
 * padecimiento, ambiente, clima espacial, mensajes de la CMO) sigue saliendo del escenario simulado y
 * queda rotulado como tal. Si el backend no responde, se dice claro y se reintenta.
 */
(function () {
  "use strict";
  const K = window.CONSOLA;
  const { $, $$, esc, ic, pastilla, sem, forma } = K;

  const REINTENTO_MS = 5000;    // sin conexión: cada cuánto se vuelve a intentar
  const SONDEO_MS = 10000;      // con conexión: red de seguridad (p. ej. «Reiniciar» no emite evento)
  const FRENO_MS = 2000;        // como mucho una recarga cada 2 s aunque lleguen muestras cada segundo

  const N = { verde: 0, ambar: 1, rojo: 2 };
  const nivel = (estado) => (estado in N ? N[estado] : null);
  const ESTADO_TXT = { verde: "En su normal", ambar: "Atención", rojo: "Actúa ahora", sin_dato: "Sin dato" };
  const MOTIVO = { personal: "se alejó de lo esperado para esta persona", umbral: "cruzó el umbral clínico", ambos: "se alejó de lo esperado y cruzó el umbral clínico" };
  const PROCEDENCIA = { sensor: "sensor", derived: "calculado", estimated: "estimado", manual: "a mano", telemetry: "telemetría" };
  const ENTORNO = { tierra: "Tierra (antes del lanzamiento)", orbita: "órbita", luna: "superficie lunar", marte: "Marte", transito: "tránsito" };
  // Personas de la app ↔ tripulantes del backend (el mismo mapa que usan las consolas y el teléfono).
  const PID = Object.fromEntries(Object.entries(K.BACKEND_ID).map(([pid, id]) => [id, pid]));

  const S = {
    fase: "conectando",         // conectando · vivo · error
    error: null,                // texto del último error de conexión
    hubo: false,                // alguna vez llegaron datos
    version: null, entorno: null,
    trips: [], app: {}, alertas: [], enlace: null, pendientes: null, avisos: [],
    ultima: null,               // Date de la última carga completa
    rechazo: null,              // { texto, t } última trama rechazada
  };

  // ---------------------------------------------------------------- utilidades
  const num = (x, dec) => (x == null || !Number.isFinite(+x) ? "–" : String(+(+x).toFixed(dec == null ? 2 : dec)).replace(".", ","));
  const hms = (t) => { const d = t instanceof Date ? t : new Date(t); return Number.isNaN(+d) ? "–" : d.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }); };
  function hace(iso) {
    const s = Math.round((Date.now() - Date.parse(iso)) / 1000);
    if (!Number.isFinite(s)) return "";
    if (s < 5) return "ahora";
    if (s < 90) return `hace ${s} s`;
    if (s < 5400) return `hace ${Math.round(s / 60)} min`;
    if (s < 172800) return `hace ${Math.round(s / 3600)} h`;
    return `hace ${Math.round(s / 86400)} días`;
  }
  const deTexto = (x) => { if (x == null || typeof x === "object") return x; try { return JSON.parse(x); } catch { return null; } };
  const nombreTrip = (id) => { if (id === "todos") return "toda la tripulación"; const t = S.trips.find((x) => x.id === id); return t ? t.nombre : id; };
  function nombreVar(id) {
    for (const a of Object.values(S.app)) { const v = a.variables.find((x) => x.id === id); if (v) return v.nombre; }
    return id;
  }
  const chipVivo = () => `<span class="cn-chip c-vivo" title="Leído del backend de Julio (computadora central) por /api y /api/stream"><i></i>En vivo · backend${S.version ? ` v${esc(S.version)}` : ""}</span>`;

  async function pedir(ruta) {
    let r;
    try { r = await fetch(ruta, { cache: "no-store" }); }
    catch { throw new Error(`no se pudo conectar con ${ruta} (¿está corriendo el backend?)`); }
    let j = null;
    try { j = await r.json(); } catch { /* no es JSON */ }
    if (!r.ok) throw new Error(`${ruta} respondió HTTP ${r.status}${j && j.error ? `: ${j.error}` : ""}`);
    if (j == null) throw new Error(`${ruta} no devolvió JSON (esta página no la está sirviendo el backend)`);
    return j;
  }

  // ---------------------------------------------------------------- carga
  let cargando = false, otra = false, freno = null, flujo = null;
  async function cargar() {
    if (cargando) { otra = true; return; }
    cargando = true;
    try {
      const salud = await pedir("/api/salud");
      if (!salud || !salud.version) throw new Error("/api/salud no es el backend de EVA");
      const [trips, alertas, enlace, pendientes, avisos] = await Promise.all([
        pedir("/api/tripulantes"), pedir("/api/alertas?limite=30"), pedir("/api/enlace"), pedir("/api/tierra/pendientes"), pedir("/api/avisos"),
      ]);
      const apps = await Promise.all(trips.map((t) => pedir(`/api/app/${encodeURIComponent(t.id)}`)));
      S.version = salud.version; S.entorno = salud.entorno;
      S.trips = trips; S.app = Object.fromEntries(apps.map((a) => [a.tripulante.id, a]));
      S.alertas = alertas.map((a) => Object.assign({}, a, { banda: deTexto(a.banda), umbral: deTexto(a.umbral) }));
      S.enlace = enlace; S.pendientes = pendientes;
      S.avisos = avisos.map((a) => Object.assign({}, a, { datos: deTexto(a.datos) }));
      S.ultima = new Date(); S.hubo = true; S.fase = "vivo"; S.error = null;
      if (!flujo) abrirFlujo();
    } catch (e) {
      S.fase = "error"; S.error = e.message || String(e);
    }
    cargando = false;
    pintar();
    if (otra) { otra = false; pronto(); }
  }
  /** Recarga pronto, pero sin encimar peticiones: las muestras llegan cada segundo. */
  function pronto() { if (!freno) freno = setTimeout(() => { freno = null; cargar(); }, FRENO_MS); }

  function abrirFlujo() {
    flujo = new EventSource("/api/stream");
    const con = (tipo, f) => flujo.addEventListener(tipo, (e) => { let d; try { d = JSON.parse(e.data); } catch { return; } f(d); });
    con("muestra", pronto);
    con("alerta", (a) => {
      pronto();
      if (a.estado !== "ambar" && a.estado !== "rojo") return;
      const rojo = a.estado === "rojo";
      K.toast({ titulo: `LUNNA · ${nombreTrip(a.tripulante)}: ${nombreVar(a.variable)} en ${rojo ? "rojo" : "ámbar"}`,
        texto: `${num(a.valor)}${a.esperado != null ? ` (esperado ${num(a.esperado)})` : ""} · ${MOTIVO[a.motivo] || ""}`,
        icono: "alerta", c1: rojo ? "#FF6B6B" : "#FFC23D", c2: rojo ? "#D92D2D" : "#E08A00", alerta: rojo, ms: rojo ? 15000 : 8000,
        alClic: () => { location.hash = PID[a.tripulante] ? `#tripulante/${PID[a.tripulante]}` : "#hoy"; } });
    });
    con("aviso", (a) => {
      pronto();
      // Si lo mandó la base de LUNNA (base.html), central.js ya lo avisa por el enlace de este navegador.
      if (K.leerEnlace().some((m) => m.sentido === "subida" && m.backend && m.texto === a.texto)) return;
      const nv = a.tipo === "alerta" ? (a.datos && a.datos.nivel) : null;
      K.toast({ titulo: `${a.tipo === "alerta" ? `Alerta ${nv === "rojo" ? "roja" : "ámbar"}` : "Aviso"} de Tierra · ${nombreTrip(a.para)}`, texto: a.texto,
        icono: nv ? "alerta" : "tierra", c1: nv === "rojo" ? "#FF6B6B" : nv ? "#FFC23D" : "#38D1F0", c2: nv === "rojo" ? "#D92D2D" : nv ? "#E08A00" : "#0B8DB8",
        alerta: nv === "rojo", ms: nv === "rojo" ? 15000 : 8000, alClic: () => { location.hash = "#tierra"; } });
    });
    con("enlace", (e) => { S.enlace = e; pintar(); pronto(); });
    con("rechazo", (r) => { S.rechazo = { texto: (Array.isArray(r) ? r : [r]).slice(0, 2).join(" · "), t: new Date() }; pintar(); });
    flujo.onopen = () => { if (S.fase === "error") cargar(); };
    flujo.onerror = () => {
      S.fase = "error";
      S.error = "se cortó el flujo de eventos /api/stream (el backend se detuvo o se perdió la red)";
      pintar();
    };
  }
  // Sin conexión se reintenta cada 5 s; con conexión basta un sondeo cada 10 s como red de seguridad.
  let vuelta = 0;
  setInterval(() => {
    vuelta++;
    if (document.hidden || (S.fase === "vivo" && vuelta % (SONDEO_MS / REINTENTO_MS))) return;
    cargar();
  }, REINTENTO_MS);

  // ---------------------------------------------------------------- piezas
  function avisoConexion() {
    if (S.fase === "conectando") return `<div class="cn-vacio">Conectando con el backend…</div>`;
    if (S.fase !== "error") return "";
    return `<div class="cn-vivo-error" role="alert">${ic("alerta")}<div><b>Sin conexión con el backend</b>
      <p>${esc(S.error || "error desconocido")}.</p>
      <p>${S.hubo ? `Lo que se ve aquí es lo último que llegó a las <b>${hms(S.ultima)}</b> y puede estar desactualizado.` : "No hay datos en vivo que mostrar: el resto de la pantalla es el escenario simulado."}
        Se reintenta cada ${REINTENTO_MS / 1000} s.</p></div>
      <button type="button" class="cn-boton" data-vivo-reintentar>Reintentar ahora</button></div>`;
  }
  /** Estado general de un tripulante: el peor de sus variables con dato; null si no hay ninguno. */
  function estadoDe(a) {
    const ns = a.variables.filter((v) => v.estado !== "sin_dato").map((v) => nivel(v.estado)).filter((n) => n != null);
    return ns.length ? Math.max(...ns) : null;
  }
  function chispa(serie) {
    if (!serie || serie.length < 2) return `<span class="tenue">–</span>`;
    const ys = serie.map((p) => p.mediana), lo = Math.min(...ys), hi = Math.max(...ys), W = 84, H = 22;
    const x = (i) => 2 + (i / (serie.length - 1)) * (W - 4), y = (v) => (hi === lo ? H / 2 : 3 + (1 - (v - lo) / (hi - lo)) * (H - 6));
    return `<svg class="cn-vivo-chispa" viewBox="0 0 ${W} ${H}" role="img" aria-label="Mediana diaria de los últimos ${serie.length} días de misión con dato: de ${num(ys[0])} a ${num(ys[ys.length - 1])}">
      <polyline points="${serie.map((p, i) => `${x(i).toFixed(1)},${y(p.mediana).toFixed(1)}`).join(" ")}"/><circle cx="${x(serie.length - 1).toFixed(1)}" cy="${y(ys[ys.length - 1]).toFixed(1)}" r="2.4"/></svg>`;
  }
  const esperadoTxt = (v) => (v.esperado == null ? "–" : `${num(v.esperado)}${v.banda ? ` <small class="tenue">(${num(v.banda[0])}–${num(v.banda[1])})</small>` : ""}`);
  const marcas = (v) => `${v.calibrando ? `<span class="cn-chip c-nd" title="LUNNA todavía está aprendiendo lo normal de esta persona en este entorno">calibrando</span>` : ""}${v.extrapolado ? `<span class="cn-chip c-nd" title="Sin datos de vuelo para este entorno: lo esperado es una extrapolación">extrapolado</span>` : ""}`;

  /** Tarjeta de un tripulante del backend, para la vista Hoy. */
  function tarjetaTrip(t) {
    const a = S.app[t.id];
    if (!a) return "";
    const con = a.variables.filter((v) => v.valor != null), sin = a.variables.length - con.length;
    const g = estadoDe(a), pid = PID[t.id], x = pid && K.persona(pid);
    const ultima = con.map((v) => v.t_scet).sort().pop();
    const cuerpo = con.length
      ? `<table class="cn-tabla cn-vivo-tabla compacta"><thead><tr><th>Variable</th><th>Último</th><th>Esperado</th><th><span class="oculto">Estado</span></th></tr></thead><tbody>${con.map((v) => `<tr title="${esc(v.nombre)} · ${esc(v.dispositivo || "sin dispositivo")} · ${hace(v.t_scet)}${v.z == null ? "" : ` · z ${K.zTxt(v.z)}`} · ${ESTADO_TXT[v.estado] || ""}">
          <th scope="row">${esc(v.nombre)}</th>
          <td class="num"><b>${num(v.valor)}</b> <small class="tenue">${esc(v.unidad || "")}</small></td>
          <td class="num">${v.esperado == null ? "–" : num(v.esperado, 1)}${v.banda ? ` <small class="tenue">${num(v.banda[0], 1)}–${num(v.banda[1], 1)}</small>` : ""}</td>
          <td>${sem(nivel(v.estado), false)}<span class="oculto">${ESTADO_TXT[v.estado] || ""}</span></td></tr>`).join("")}</tbody></table>
        <p class="cn-nota">${sin ? `${sin} variable${sin > 1 ? "s" : ""} sin dato · ` : ""}${pid ? `<a class="enlace" href="#tripulante/${pid}">Ver todo en su panel clínico</a>` : ""}</p>`
      : `<div class="cn-vacio">Sin muestras: ningún dispositivo le ha mandado datos${a.variables.length ? ` (tiene ${a.variables.length} basales registradas)` : ""}.</div>`;
    const abierto = abiertos.has(t.id) || (!cerrados.has(t.id) && g != null && g > 0);
    return `<li class="cn-vivo-trip es-${g == null ? "nd" : g}"><details data-trip="${esc(t.id)}"${abierto ? " open" : ""}>
      <summary class="cn-vivo-cab"><span class="avatar"${x ? ` style="--c:${x.color}"` : ""}>${esc(t.nombre[0] || "?")}</span>
        <div><b>${esc(t.nombre)}</b><small>${esc(t.id)}${t.rol ? ` · ${esc(t.rol)}` : ""}</small></div>
        ${sem(g)}${a.alertas.length ? `<span class="cn-chip c-nd">${a.alertas.length} alerta${a.alertas.length > 1 ? "s" : ""}</span>` : ""}
        <span class="cn-empuja tenue">${con.length ? `${con.length} variables · ${hace(ultima)}` : "sin muestras"}</span>${ic("chevron", "ic-sm cn-vivo-flecha")}</summary>
      ${cuerpo}</details></li>`;
  }
  // Qué tripulantes dejó abiertos o cerrados quien mira (se conserva entre repintados).
  const abiertos = new Set(), cerrados = new Set();
  document.addEventListener("toggle", (e) => {
    const d = e.target;
    if (!d.dataset || !d.dataset.trip) return;
    (d.open ? abiertos : cerrados).add(d.dataset.trip); (d.open ? cerrados : abiertos).delete(d.dataset.trip);
  }, true);
  function filaAlerta(a, conNombre) {
    const n = nivel(a.estado), u = a.umbral;
    const porUmbral = u && u.limite != null ? ` · umbral [${esc(u.tipo || "")}]: ${num(u.valor_evaluado)} ${u.lado === "min" ? "<" : ">"} ${num(u.limite)}` : "";
    return `<li class="es-${n == null ? "nd" : n}"><div class="meta">${K.chip(n, n === 0 ? "Volvió a su normal" : ESTADO_TXT[a.estado] || esc(a.estado))}
        <span>${conNombre ? `${esc(nombreTrip(a.tripulante))} · ` : ""}${esc(nombreVar(a.variable))} · SCET ${hms(a.t_scet)} (${hace(a.t_scet)})</span></div>
      <p><b class="num">${num(a.valor)}</b>${a.esperado != null ? ` · esperado ${num(a.esperado)}${a.banda ? ` (${num(a.banda[0])}–${num(a.banda[1])})` : ""}` : ""}${a.z != null ? ` · z ${K.zTxt(a.z)}` : ""}</p>
      <p class="det">${a.motivo ? `Por qué: ${esc(MOTIVO[a.motivo] || a.motivo)}` : ""}${porUmbral}${a.enviada_tierra ? " · enviada a Tierra" : ""}</p></li>`;
  }
  const pieFuente = (rutas) => `<p class="cn-nota cn-vivo-pie">${ic("info", "ic-sm")}<span>Fuente: ${rutas} del backend${S.ultima ? ` · leído a las ${hms(S.ultima)}` : ""}. En el simulador, los sensores que mandan estas lecturas son sintéticos.</span></p>`;

  // ---------------------------------------------------------------- bloques
  function bloqueHoy() {
    const cab = `<h2 id="t-vivo">${pastilla("monitor", "#3DD68C", "#119B5A")} Tripulación · computadora central ${chipVivo()}
      ${S.hubo ? `<span class="cn-empuja tenue">entorno: ${esc(ENTORNO[S.entorno] || S.entorno || "–")}${diaMision() != null ? ` · día de misión ${diaMision()}` : ""}</span>` : ""}</h2>`;
    if (!S.hubo) return `<section class="tarjeta cn-vivo" aria-labelledby="t-vivo">${cab}${avisoConexion()}</section>`;
    const hayMuestras = Object.values(S.app).some((a) => a.variables.some((v) => v.valor != null));
    return `<section class="tarjeta cn-vivo" aria-labelledby="t-vivo">${cab}${avisoConexion()}
      ${hayMuestras ? "" : `<div class="cn-vacio" style="margin-bottom:12px">El backend todavía no tiene muestras. En el simulador, pulsa <b>Preparar misión</b>: carga 119 días de historia de Ana y empieza a mandar tramas en vivo.</div>`}
      ${S.rechazo ? `<p class="cn-nota cn-vivo-rechazo">${ic("alerta", "ic-sm")}<span>Última trama rechazada (${hms(S.rechazo.t)}): ${esc(S.rechazo.texto)}</span></p>` : ""}
      <ul class="cn-vivo-lista">${S.trips.map(tarjetaTrip).join("")}</ul>
      <h3 class="cn-vivo-sub">Alertas de LUNNA <span class="tenue">las ${Math.min(4, S.alertas.length)} más recientes de ${S.alertas.length}</span></h3>
      ${S.alertas.length ? `<ol class="cn-hist">${S.alertas.slice(0, 4).map((a) => filaAlerta(a, true)).join("")}</ol>` : `<div class="cn-vacio">LUNNA no ha generado alertas.</div>`}
      ${pieFuente("<code>/api/tripulantes</code>, <code>/api/app/:tripulante</code>, <code>/api/alertas</code> y eventos de <code>/api/stream</code>")}</section>`;
  }
  function diaMision() { const a = Object.values(S.app)[0]; return a ? a.dia_mision : null; }

  function bloqueTripulante(id) {
    const cab = `<h2 id="t-vivo">${pastilla("monitor", "#3DD68C", "#119B5A")} Lo que mide la computadora central ${chipVivo()}</h2>`;
    if (!S.hubo) return `<section class="tarjeta cn-vivo" aria-labelledby="t-vivo">${cab}${avisoConexion()}</section>`;
    const a = S.app[id];
    if (!a) return `<section class="tarjeta cn-vivo" aria-labelledby="t-vivo">${cab}${avisoConexion()}<div class="cn-vacio">El backend no tiene registrado a este tripulante${id ? ` («${esc(id)}»)` : ""}.</div></section>`;
    const g = estadoDe(a);
    const filas = a.variables.map((v) => `<tr>
      <th scope="row">${esc(v.nombre)}<br><small class="tenue">${esc(v.id)}${v.umbral ? ` · umbral [${esc(v.umbral.tipo)}]` : ""}</small></th>
      <td class="num">${v.valor == null ? `<span class="tenue">sin dato</span>` : `<b>${num(v.valor)}</b> <small class="tenue">${esc(v.unidad || "")}</small>`}</td>
      <td class="num">${num(v.mediana_24h)}</td><td class="num">${esperadoTxt(v)}</td>
      <td class="num">${v.z == null ? "–" : K.zTxt(v.z)}</td>
      <td>${sem(nivel(v.estado), ESTADO_TXT[v.estado])}${v.motivo && v.estado !== "verde" ? `<br><small class="tenue">${esc(MOTIVO[v.motivo] || v.motivo)}</small>` : ""}<span class="cn-chips">${marcas(v)}</span></td>
      <td>${chispa(v.serie)}</td>
      <td><small class="tenue">${v.valor == null ? (v.basal != null ? `basal ${num(v.basal)}` : "") : `${esc(v.dispositivo || "–")} · ${esc(PROCEDENCIA[v.procedencia] || v.procedencia || "")}<br>${hms(v.t_scet)} · ${hace(v.t_scet)}`}</small></td></tr>`).join("");
    return `<section class="tarjeta cn-vivo" aria-labelledby="t-vivo">${cab}${avisoConexion()}
      <div class="cn-vivo-cab"><div><b>${esc(a.tripulante.nombre)}</b><small>${esc(a.tripulante.id)}${a.tripulante.rol ? ` · ${esc(a.tripulante.rol)}` : ""} · entorno: ${esc(ENTORNO[a.entorno] || a.entorno)}${a.dia_mision != null ? ` · día de misión ${a.dia_mision}` : " · misión sin empezar"}</small></div>${sem(g)}</div>
      ${a.variables.length ? `<div class="cn-tabla-caja"><table class="cn-tabla cn-vivo-tabla"><thead><tr><th>Variable</th><th>Último</th><th>Mediana 24 h</th><th>Esperado (banda)</th><th>z</th><th>Estado</th><th>Días de misión</th><th>Origen</th></tr></thead><tbody>${filas}</tbody></table></div>` : `<div class="cn-vacio">Sin variables ni basales registradas.</div>`}
      <div class="cn-rejilla cn-2b" style="margin-top:14px">
        <div><h3 class="cn-vivo-sub">Sus alertas de LUNNA</h3>${a.alertas.length ? `<ol class="cn-hist">${a.alertas.slice(0, 6).map((x) => filaAlerta(x, false)).join("")}</ol>` : `<div class="cn-vacio">Sin alertas.</div>`}</div>
        <div><h3 class="cn-vivo-sub">Avisos de Tierra que ya le llegaron</h3>${a.avisos.length ? a.avisos.slice(0, 6).map(aviso).join("") : `<div class="cn-vacio">Ninguno.</div>`}</div>
      </div>
      ${pieFuente(`<code>/api/app/${esc(a.tripulante.id)}</code> y eventos de <code>/api/stream</code>`)}
      <p class="cn-nota">Lo de abajo (14 días contra su normal, Cuerpo LUNNA, índice por padecimiento, metas y dosis) es el <b>escenario simulado</b> de la maqueta: el backend aún no ofrece esos datos.</p></section>`;
  }
  function aviso(a) {
    const nv = a.tipo === "alerta" ? (a.datos && a.datos.nivel) : null, n = nv === "rojo" ? 2 : nv === "ambar" ? 1 : 0;
    return `<div class="cn-msj es-${n}"><div class="meta">${K.chip(n, a.tipo === "alerta" ? `Alerta ${nv === "rojo" ? "roja" : "ámbar"} de Tierra` : "Aviso de Tierra", "tierra")}
        <span>para ${esc(nombreTrip(a.para))} · ${esc(a.de || "")}</span><span class="cn-empuja">llegó ${hms(a.t_llegada)}</span></div>
      <p>${esc(a.texto)}</p><p class="cn-nota">Redactado a las ${hms(a.t_redactado)}${a.t_llegada ? ` · tardó ${Math.round((Date.parse(a.t_llegada) - Date.parse(a.t_redactado)) / 1000)} s en llegar` : ""}${a.datos && a.datos.variable ? ` · sobre ${esc(nombreVar(a.datos.variable))}` : ""}</p></div>`;
  }
  function bloqueTierra() {
    const cab = `<h2 id="t-vivo">${pastilla("antena", "#3DD68C", "#119B5A")} Enlace real de la computadora central ${chipVivo()}</h2>`;
    if (!S.hubo) return `<section class="tarjeta cn-vivo" aria-labelledby="t-vivo">${cab}${avisoConexion()}</section>`;
    const e = S.enlace || {}, p = S.pendientes || {};
    return `<section class="tarjeta cn-vivo" aria-labelledby="t-vivo">${cab}${avisoConexion()}
      <div class="cn-enlace">
        <div><span>Ventana</span><b>${e.abierto ? "Abierta" : "Cerrada"}</b><span>${e.abierto ? "lo encolado sale ya" : "todo espera en cola"}</span></div>
        <div><span>Retraso por trayecto</span><b>${num(e.owlt_s)} s</b><span>${num(e.owlt_s * 2)} s ida y vuelta</span></div>
        <div><span>En cola en la nave</span><b>${num(p.en_cola_nave)}</b><span>${num(p.en_vuelo_a_tierra)} en vuelo a Tierra</span></div>
        <div><span>Avisos hacia la nave</span><b>${num(p.avisos_en_vuelo_a_nave)}</b><span>en vuelo · ${num(p.avisos_en_cola_tierra)} en cola en Tierra</span></div>
      </div>
      <h3 class="cn-vivo-sub">Avisos de Tierra entregados a bordo <span class="tenue">${S.avisos.length}</span></h3>
      ${S.avisos.length ? S.avisos.slice(0, 8).map(aviso).join("") : `<div class="cn-vacio">Todavía no llega ningún aviso de Tierra por el backend. Se mandan desde la consola de Tierra (<code>/tierra</code>) o la base (<code>/app/base.html</code>).</div>`}
      ${pieFuente("<code>/api/enlace</code>, <code>/api/tierra/pendientes</code>, <code>/api/avisos</code> y eventos de <code>/api/stream</code>")}</section>`;
  }

  // ---------------------------------------------------------------- pintado
  function pintarPildora() {
    const ctrl = $(".cn-ctrl");
    if (!ctrl) return;
    let p = $("#cn-vivo");
    if (!p) { p = document.createElement("span"); p.id = "cn-vivo"; p.setAttribute("role", "status"); ctrl.insertBefore(p, ctrl.firstChild); }
    p.className = "cn-pildora cn-vivo-pildora " + S.fase;
    p.title = S.fase === "vivo" ? `Conectada al backend de Julio v${S.version}: los bloques «En vivo» se actualizan solos (última lectura ${hms(S.ultima)})`
      : S.fase === "error" ? `Sin conexión con el backend: ${S.error}` : "Conectando con el backend…";
    p.innerHTML = `<span class="vivo" aria-hidden="true"></span>${S.fase === "vivo" ? "Backend en vivo" : S.fase === "error" ? "Sin conexión con el backend" : "Conectando…"}`;
    // La píldora «Simulado» decía que todo lo era; con datos en vivo ya no es cierto.
    const sim = $(".cn-pildora.sim");
    if (sim && S.hubo && !sim.dataset.escenario) {
      sim.dataset.escenario = "1";
      sim.innerHTML = `${ic("planeta", "ic-sm")} Escenario simulado`;
      sim.title = "Los bloques marcados «En vivo · backend» vienen de la computadora central. Todo lo demás (días 106–115, Cuerpo LUNNA, índices, ambiente, misiones) es el escenario simulado, salvo los eventos solares de NASA DONKI.";
    }
  }
  /** Rellena los huecos [data-vivo] que haya en la página. No toca nada más (ni formularios ni foco). */
  function pintar() {
    pintarPildora();
    for (const el of $$("[data-vivo]")) {
      const que = el.dataset.vivo;
      const html = que === "hoy" ? bloqueHoy() : que === "tripulante" ? bloqueTripulante(el.dataset.id) : que === "tierra" ? bloqueTierra() : "";
      if (el.__html === html) continue;      // nada cambió: no se repinta (no parpadea ni se pierde el scroll)
      el.__html = html; el.innerHTML = html;
    }
  }
  document.addEventListener("click", (e) => { if (e.target.closest("[data-vivo-reintentar]")) cargar(); });

  window.VIVO = { pintar, recargar: cargar, get estado() { return S; } };
  cargar();
})();
