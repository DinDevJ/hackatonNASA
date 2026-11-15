/* LUNNA · computadora central: «Semáforo de padecimientos (motor de 20)».
 *
 * Lee del backend de Julio la última evaluación guardada del motor Python (prototipo-salud) y la pinta con el
 * mismo semáforo con forma de la consola. Rutas (mismo origen):
 *
 *   GET  /api/padecimientos/semaforo[?tripulante=ID]          lista de 20 por tripulante
 *   GET  /api/padecimientos/semaforo/:tripulante/:padecimiento  detalle y variables que lo movieron
 *   GET  /api/padecimientos/pesos?padecimiento=ID             pesos con fuente y umbrales (solo lectura)
 *   PUT  /api/padecimientos/pesos                             cambia un peso (0 a 3)
 *   POST /api/padecimientos/pesos/restaurar                   vuelve al peso de la fuente
 *   POST /api/padecimientos/evaluar                           corre el motor ({simulado})
 *   GET  /api/modelos/disponibles · POST /api/modelos/analizar (202) · GET /api/modelos/trabajos/:id
 *                                                             tarjeta «Analizar con modelos» (eco / ECG): trabajo en cola, polling
 *
 * No inventa nada: sin backend o sin evaluaciones lo dice, y todo en GRIS. No es un diagnóstico; los umbrales
 * son provisionales. Distinto del «índice por padecimiento» del panel clínico (11 malestares, pesos de Leo).
 * Deep link: #semaforo/<tripulante>~<padecimiento>. Al elegir dentro de la vista se actualiza el hash sin
 * disparar hashchange (el router haría scroll arriba).
 */
(function () {
  "use strict";
  const K = window.CONSOLA;
  const { $, $$, esc, ic, pastilla, sem, forma } = K;

  const API = "/api/padecimientos";
  const MOD = "/api/modelos";
  const NIV = { VERDE: 0, AMARILLO: 1, ROJO: 2, GRIS: null };
  const TXT = { VERDE: "Verde", AMARILLO: "Amarillo", ROJO: "Rojo", GRIS: "Gris" };
  const ORDEN = { ROJO: 0, AMARILLO: 1, VERDE: 2, GRIS: 3 };
  const EVID = { A: "Relación medida", B: "Mecanismo documentado", C: "Juicio del equipo" };

  const num = (x, dec) => (x == null || !Number.isFinite(+x) ? "–" : String(+(+x).toFixed(dec == null ? 2 : dec)).replace(".", ","));
  const semC = (c) => sem(NIV[c] === undefined ? null : NIV[c], TXT[c] || TXT.GRIS);
  const chipSim = () => `<span class="cn-chip cn-sem-sim" title="Dato simulado, no de una persona real">SIMULADO</span>`;
  function hora(iso) {
    if (!iso) return "sin hora";
    const d = new Date(iso);
    return Number.isNaN(+d) ? String(iso) : d.toLocaleString("es", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });
  }
  const corto = (t, n) => { t = String(t == null ? "" : t); return t.length > n ? t.slice(0, n - 1).trimEnd() + "…" : t; };

  /** fetch JSON; devuelve { ok, status, j }. Lanza si no hay conexión o no es JSON (no es el backend). */
  async function api(ruta, opc) {
    let r;
    try { r = await fetch(ruta, Object.assign({ cache: "no-store" }, opc)); }
    catch { throw new Error("sin conexión"); }
    let j = null;
    try { j = await r.json(); } catch { /* no es JSON */ }
    if (j == null) throw new Error("respuesta sin JSON");
    return { ok: r.ok, status: r.status, j };
  }
  const enviar = (metodo, ruta, cuerpo) => api(ruta, { method: metodo, headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo) });

  function vista(p, arg) {
    K.marcarPestana("semaforo");
    const [aTrip, aPad] = (arg || "").split("~");
    const E = { datos: null, trip: aTrip || null, pad: aPad || null, gen: 0, genDet: 0, msgEval: "" };
    let raizEl = null;
    const vivo = () => p.isConnected && raizEl != null && raizEl.isConnected;

    p.innerHTML = `<div id="sm-raiz">
      <div class="cn-encabezado"><div><h1>Semáforo de padecimientos</h1><p class="sub">Motor de 20 padecimientos (prototipo-salud) · última evaluación guardada en la computadora central</p></div>
        <span class="cn-empuja cn-sem-acciones"><span id="sm-vivo"></span><button type="button" class="cn-boton" id="sm-act">${ic("tendencia", "ic-sm")}Actualizar</button></span></div>
      <section class="tarjeta cn-sem-aviso" aria-label="Aviso">
        <p><b>No es un diagnóstico. Se recomienda revisión por el cirujano de vuelo.</b> <span class="cn-chip c-1">Umbrales provisionales</span></p>
        <p class="cn-nota">Distinto del índice por padecimiento del panel clínico (11 malestares, pesos de Leo): este semáforo lo calcula el motor Python con 20 padecimientos y sus vínculos con fuente.</p></section>
      <div id="sm-estado" aria-live="polite"></div>
      <div id="sm-sel" class="cn-sem-sel"></div>
      <section class="tarjeta cn-sem-mod" id="sm-mod" aria-labelledby="sm-t-mod" hidden></section>
      <div class="cn-rejilla cn-2b" style="margin-top:16px">
        <section class="tarjeta" aria-labelledby="sm-t-lista"><h2 id="sm-t-lista">${pastilla("lista", "#5B8DFF", "#1F4FD8")} Padecimientos (20)</h2><div id="sm-lista"></div></section>
        <div style="display:grid;gap:16px;align-content:start"><section class="tarjeta" id="sm-detalle" aria-live="polite"></section><section class="tarjeta" id="sm-pesos" aria-labelledby="sm-t-pesos"></section></div>
      </div></div>`;
    raizEl = p.querySelector("#sm-raiz");
    $("#sm-act", p).addEventListener("click", () => cargar());

    const hash = () => {
      if (!E.trip) return;
      history.replaceState(null, "", "#semaforo/" + encodeURIComponent(E.trip + (E.pad ? "~" + E.pad : "")));
    };
    const tripActual = () => (E.datos && E.datos.tripulantes.find((t) => t.id === E.trip)) || null;
    const conEval = (t) => t.conteo && (t.conteo.VERDE + t.conteo.AMARILLO + t.conteo.ROJO) > 0;
    /** Las 20 filas del tripulante elegido, o 20 en gris si no hay nadie. */
    function filas() {
      const t = tripActual();
      if (t) return t.semaforo.slice();
      return ((E.datos && E.datos.padecimientos) || []).map((x) => ({ padecimiento_id: x.id, nombre: x.nombre, riesgo_nasa: x.riesgo_nasa, color: "GRIS", por_que: "Sin evaluación", simulado: false, evaluado: false }));
    }
    const ordenadas = () => filas().sort((a, b) => (ORDEN[a.color] ?? 3) - (ORDEN[b.color] ?? 3) || String(a.padecimiento_id).localeCompare(String(b.padecimiento_id)));

    // ------------------------------------------------------------ carga
    async function cargar() {
      const g = ++E.gen;
      $("#sm-estado", p).innerHTML = `<p class="cn-nota">Leyendo la computadora central…</p>`;
      let r;
      try { r = await api(API + "/semaforo"); }
      catch (e) { if (g === E.gen && vivo()) sinBackend(); return; }
      if (g !== E.gen || !vivo()) return;
      if (!r.ok || !r.j || !Array.isArray(r.j.tripulantes)) { sinBackend(r.j && r.j.error); return; }
      E.datos = r.j;
      $("#sm-vivo", p).innerHTML = `<span class="cn-chip c-vivo" title="Leído del backend de Julio"><i></i>En vivo · backend</span>`;
      const ts = r.j.tripulantes;
      if (!ts.find((t) => t.id === E.trip)) E.trip = ((ts.find(conEval) || ts[0]) || {}).id || null;
      const fs = ordenadas();
      if (!fs.find((f) => f.padecimiento_id === E.pad)) E.pad = fs.length ? fs[0].padecimiento_id : null;
      hash();
      pintarEstado(); pintarSel(); pintarLista();
      cargarDetalle();
      modelos.actualizar();
    }
    function sinBackend(msg) {
      E.datos = null;
      $("#sm-vivo", p).innerHTML = `<span class="cn-chip c-nd">Sin conexión</span>`;
      $("#sm-estado", p).innerHTML = `<section class="tarjeta"><h2>${pastilla("alerta", "#FFC23D", "#E08A00")} Sin conexión con el backend</h2>
        <p>Sin conexión con el backend: el semáforo se lee de la computadora central (<code>npm start</code> en Planeacion/Julio/backend) en /app/central.html</p>
        ${msg ? `<p class="cn-nota">${esc(msg)}</p>` : ""}
        <div style="margin-top:10px"><button type="button" class="cn-boton" id="sm-reint">${ic("tendencia", "ic-sm")}Reintentar</button></div></section>`;
      $("#sm-reint", p).addEventListener("click", () => cargar());
      for (const id of ["#sm-sel", "#sm-lista", "#sm-detalle", "#sm-pesos"]) $(id, p).innerHTML = "";
    }
    function pintarEstado() {
      const d = E.datos, el = $("#sm-estado", p);
      const msg = E.msgEval ? `<p class="cn-nota" aria-live="polite">${esc(E.msgEval)}</p>` : "";
      if (!d.vacio) { el.innerHTML = msg; return; }
      const c = d.como_poblar || {};
      el.innerHTML = `<section class="tarjeta"><h2>${pastilla("info", "#5B8DFF", "#1F4FD8")} Todavía no hay evaluaciones</h2>
        <p>El motor aún no ha guardado ninguna evaluación; los 20 padecimientos aparecen en gris. Para llenarlo:</p>
        <ul class="cn-sem-cmd">${["npm", "python", "post"].filter((k) => c[k]).map((k) => `<li><code>${esc(c[k])}</code></li>`).join("")}</ul>
        <div class="cn-sem-acciones" style="margin-top:10px"><button type="button" class="cn-boton" data-ev="1">${ic("play", "ic-sm")}Evaluar tripulación SIMULADA</button>
          <button type="button" class="cn-boton" data-ev="0">${ic("play", "ic-sm")}Evaluar datos reales</button></div>
        ${msg}</section>`;
      $$("[data-ev]", el).forEach((b) => b.addEventListener("click", () => evaluar(b.dataset.ev === "1", b)));
    }
    /** Corre el motor y muestra lo que devolvió (o su error); luego recarga. */
    async function evaluar(simulado, boton) {
      const caja = boton.parentElement, bs = $$("button", caja);
      let m = $("[data-ev-msg]", caja.parentElement);
      if (!m) { m = document.createElement("p"); m.className = "cn-nota"; m.setAttribute("data-ev-msg", ""); m.setAttribute("aria-live", "polite"); caja.insertAdjacentElement("afterend", m); }
      bs.forEach((x) => (x.disabled = true));
      m.textContent = "Evaluando…";
      let ok = false;
      try {
        const r = await enviar("POST", API + "/evaluar", { simulado: !!simulado });
        if (!vivo()) return;
        if (!r.ok || r.j.error) E.msgEval = `No se pudo evaluar (HTTP ${r.status}): ${r.j.error || "error desconocido"}`;
        else {
          const av = r.j.avisos || [];
          E.msgEval = `Evaluado${simulado ? " (SIMULADO)" : ""}: ${r.j.filas_escritas} filas escritas · canal ${r.j.canal}.${av.length ? " Avisos: " + av.slice(0, 3).join("; ") + (av.length > 3 ? ` (+${av.length - 3} avisos)` : "") : ""}`;
          ok = true;
        }
      } catch (e) { if (vivo()) E.msgEval = "No se pudo evaluar: sin conexión con el backend."; }
      if (!vivo()) return;
      if (ok) { await cargar(); return; }
      m.textContent = E.msgEval;
      bs.forEach((x) => (x.disabled = false));
    }

    // ------------------------------------------------------------ selector y lista
    function pintarSel() {
      const ts = E.datos.tripulantes, el = $("#sm-sel", p);
      if (!ts.length) { el.innerHTML = ""; return; }
      el.innerHTML = `<div class="cn-chips" role="group" aria-label="Tripulante">${ts.map((t) => {
        const c = t.conteo || {};
        return `<button type="button" class="cn-boton cn-sem-trip" data-trip="${esc(t.id)}" aria-pressed="${t.id === E.trip}">
          <b>${esc(t.nombre || t.id)}</b>${t.simulado ? chipSim() : ""}
          <span class="cn-sem-cuenta" title="Rojo / Amarillo / Verde / Gris">${forma(2, 11)}${c.ROJO || 0} ${forma(1, 11)}${c.AMARILLO || 0} ${forma(0, 11)}${c.VERDE || 0} ${forma(null, 11)}${c.GRIS || 0}</span></button>`;
      }).join("")}</div>`;
      $$("[data-trip]", el).forEach((b) => b.addEventListener("click", () => {
        if (b.dataset.trip === E.trip) return;
        E.trip = b.dataset.trip; E.pad = null;
        const fs = ordenadas(); E.pad = fs.length ? fs[0].padecimiento_id : null;
        hash(); pintarSel(); pintarLista(); cargarDetalle();
      }));
    }
    function pintarLista() {
      const fs = ordenadas(), el = $("#sm-lista", p);
      el.innerHTML = `<ul class="cn-sem-lista">${fs.map((f) => `<li><button type="button" class="cn-sem-fila" data-pad="${esc(f.padecimiento_id)}" aria-pressed="${f.padecimiento_id === E.pad}" title="${esc(f.por_que || "")}">
        <span class="cn-sem-cab">${semC(f.color)}${f.simulado ? chipSim() : ""}</span>
        <b>${esc(f.nombre)}</b><span class="cn-sem-porque">${esc(corto(f.por_que, 140))}</span></button></li>`).join("")}</ul>`;
      $$("[data-pad]", el).forEach((b) => b.addEventListener("click", () => {
        if (b.dataset.pad === E.pad) return;
        E.pad = b.dataset.pad; hash();
        $$("[data-pad]", el).forEach((x) => x.setAttribute("aria-pressed", x === b));
        cargarDetalle();
      }));
    }

    // ------------------------------------------------------------ detalle
    async function cargarDetalle() {
      const g = ++E.genDet, el = $("#sm-detalle", p);
      if (!E.pad) { el.innerHTML = ""; $("#sm-pesos", p).innerHTML = ""; return; }
      cargarPesos();
      const f = filas().find((x) => x.padecimiento_id === E.pad);
      if (!E.trip) { el.innerHTML = sinEval(f); return; }
      el.innerHTML = `<p class="cn-nota">Leyendo el detalle…</p>`;
      let r;
      try { r = await api(`${API}/semaforo/${encodeURIComponent(E.trip)}/${encodeURIComponent(E.pad)}`); }
      catch { if (g === E.genDet && vivo()) el.innerHTML = `<p class="cn-nota">No se pudo leer el detalle: sin conexión con el backend.</p>`; return; }
      if (g !== E.genDet || !vivo()) return;
      if (!r.ok) { el.innerHTML = `<p class="cn-nota">${esc(r.j.error || "No se pudo leer el detalle.")}</p>`; return; }
      el.innerHTML = detalle(r.j);
      if (window.REFERENCIAS) window.REFERENCIAS.decorarDetalle(el, E.trip);
    }
    const sinEval = (f) => `<h2>${esc(f ? f.nombre : E.pad)}</h2><p>${sem(null, "Gris")} <span class="tenue">Sin evaluación</span></p>
      <p class="cn-nota">El motor todavía no ha evaluado este padecimiento.</p>`;
    function filaVar(v) {
      const val = v.valor == null ? `<span class="tenue">${esc(v.motivo_ausencia || "sin dato")}</span>` : `<b class="num">${esc(num(v.valor))}</b>${v.unidad ? ` <small class="tenue">${esc(v.unidad)}</small>` : ""}`;
      const peso = v.peso_evaluado != null ? v.peso_evaluado : v.peso_efectivo;
      return `<tr data-var="${esc(v.variable_id)}"><th scope="row">${esc(v.variable || v.variable_id)}<br><small class="tenue">${esc(v.direccion || "")}</small></th><td>${val}</td><td class="num">${esc(num(peso))}</td>
        <td>${v.nivel_evidencia ? `<span class="cn-ev ${esc(v.nivel_evidencia)}" title="${esc(EVID[v.nivel_evidencia] || "")}">${esc(v.nivel_evidencia)}</span>` : "–"}</td>
        <td class="num">${v.contribucion == null ? "–" : esc(num(v.contribucion))}</td></tr>`;
    }
    const tabla = (vs) => `<div class="cn-tabla-caja"><table><thead><tr><th>Variable</th><th>Valor</th><th>Peso</th><th>Ev.</th><th>Contribución</th></tr></thead><tbody>${vs.map(filaVar).join("")}</tbody></table></div>`;
    function detalle(d) {
      const pa = d.padecimiento || {}, ev = d.evaluacion;
      let h = `<h2>${esc(pa.nombre || E.pad)}</h2><p class="cn-nota">${esc(pa.riesgo_nasa || "")}${pa.id ? ` · ${esc(pa.id)}` : ""}</p>`;
      if (!ev) return h + `<p>${sem(null, "Gris")} <span class="tenue">Sin evaluación</span></p><p class="cn-nota">El motor todavía no ha evaluado este padecimiento para este tripulante.</p>`;
      h += `<p>${semC(ev.color || d.color)}</p><p>${esc(ev.por_que || d.por_que || "")}</p>
        <p class="cn-nota"><span>${esc(hora(ev.hora))}</span>${ev.simulado ? " " + chipSim() : ` · canal <span>${esc(ev.canal || "–")}</span>`}</p>
        <p class="cn-nota">T ${esc(num(ev.T))} · T_inf ${esc(num(ev.T_inf))} · cobertura ${ev.cobertura == null ? "–" : esc(num(ev.cobertura * 100, 0)) + " %"}</p>`;
      const chips = [...(ev.condiciones || []), ...(ev.etiquetas || [])];
      if (chips.length) h += `<div class="cn-chips" style="margin:8px 0">${chips.map((c) => `<span class="cn-chip c-nd">${esc(typeof c === "string" ? c : JSON.stringify(c))}</span>`).join("")}</div>`;
      h += `<h3 class="cn-sem-sub">Variables que lo movieron</h3>`;
      if (!d.con_desglose) return h + `<p class="cn-nota">Esta evaluación se guardó sin desglose por variable; vuelve a evaluar para verlo.</p>`;
      const vs = d.variables || [], con = vs.filter((v) => v.contribucion > 0), sin = vs.filter((v) => !(v.contribucion > 0));
      h += `<div class="cn-detalle-ind">${con.length ? tabla(con) : `<p class="cn-nota">Ninguna variable aportó a esta evaluación.</p>`}</div>`;
      if (sin.length) h += `<details class="cn-detalles"><summary>Otras ${sin.length} variables vinculadas (sin aporte o sin dato)</summary><div class="cn-detalle-ind">${tabla(sin)}</div></details>`;
      return h + (d.nota ? `<p class="cn-nota" style="margin-top:8px">${esc(d.nota)}</p>` : "");
    }

    // ------------------------------------------------------------ pesos
    async function cargarPesos(msg) {
      const el = $("#sm-pesos", p), pad = E.pad;
      let r;
      try { r = await api(`${API}/pesos?padecimiento=${encodeURIComponent(pad)}`); }
      catch { if (vivo()) el.innerHTML = `<h2 id="sm-t-pesos">Pesos</h2><p class="cn-nota">No se pudieron leer los pesos: sin conexión con el backend.</p>`; return; }
      if (!vivo() || pad !== E.pad) return;
      if (!r.ok) { el.innerHTML = `<h2 id="sm-t-pesos">Pesos</h2><p class="cn-nota">${esc(r.j.error || "No se pudieron leer los pesos.")}</p>`; return; }
      const d = r.j, nom = ((E.datos.padecimientos || []).find((x) => x.id === pad) || {}).nombre || pad;
      const [lo, hi] = d.rango_peso || [0, 3];
      el.innerHTML = `<h2 id="sm-t-pesos">${pastilla("engrane", "#33C3B3", "#0E8F86")} Pesos de <span>${esc(nom)}</span></h2>
        <div class="cn-form">${(d.ligas || []).map((l, i) => `<div class="cn-sem-peso" data-var="${esc(l.variable_id)}">
          <div><b>${esc(l.variable || l.variable_id)}</b> ${l.nivel_evidencia ? `<span class="cn-ev ${esc(l.nivel_evidencia)}" title="${esc(EVID[l.nivel_evidencia] || "")}">${esc(l.nivel_evidencia)}</span>` : ""}
            ${l.modificado_por_usuario ? `<span class="cn-chip c-1" title="${esc(hora(l.modificado))}">Modificado por usuario</span> <small class="tenue">${esc(hora(l.modificado))}</small>` : ""}
            <br><small class="tenue cn-sem-fuente" title="${esc("Fuente: " + (l.fuente || "–"))}">Fuente: <span>${esc(l.fuente || "–")}</span></small><small class="tenue" style="display:block">peso de la fuente <span>${esc(num(l.peso_fuente))}</span></small></div>
          <div class="cn-sem-ctl"><label for="sm-p-${i}" class="cn-sem-lbl">Peso efectivo</label>
            <input type="range" min="${lo}" max="${hi}" step="0.1" value="${esc(l.peso_efectivo)}" aria-label="Peso (deslizador)" tabindex="-1" />
            <input id="sm-p-${i}" class="cn-select cn-sem-num" type="number" min="${lo}" max="${hi}" step="0.1" value="${esc(l.peso_efectivo)}" inputmode="decimal" />
            <button type="button" class="cn-boton" data-g>Guardar</button><button type="button" class="cn-boton" data-r>Restaurar</button></div></div>`).join("")}</div>
        <div class="cn-sem-acciones" style="margin-top:12px"><button type="button" class="cn-boton" data-rt>Restaurar todos los pesos de este padecimiento</button></div>
        <p class="cn-nota" id="sm-p-msg" aria-live="polite">${esc(msg || "")}</p>
        <p class="cn-nota">Los cambios se aplican en la próxima evaluación del motor.</p>
        <div class="cn-sem-acciones"><button type="button" class="cn-boton" data-re>${ic("play", "ic-sm")}Reevaluar ahora</button></div>
        ${(d.umbrales || []).length ? `<h3 class="cn-sem-sub">Umbrales (solo lectura)</h3><div class="cn-tabla-caja"><table class="cn-detalle-ind"><thead><tr><th>Umbral</th><th>Valor</th></tr></thead><tbody>${d.umbrales.map((u) => `<tr><th scope="row">${esc(u.nombre)}</th><td class="num">${esc(num(u.valor))}${u.modificado ? ` <span class="cn-chip c-1">Modificado por usuario</span>` : ""}</td></tr>`).join("")}</tbody></table></div>` : ""}
        ${d.nota ? `<p class="cn-nota">${esc(d.nota)}</p>` : ""}`;
      if (window.REFERENCIAS && E.trip) window.REFERENCIAS.decorarPesos(el, E.trip);
      const aviso = (t) => { const m = $("#sm-p-msg", el); if (m) m.textContent = t; };
      const accion = async (f, ok) => {
        try {
          const r2 = await f();
          if (!r2.ok) { aviso(`Error ${r2.status}: ${r2.j.error || "no se pudo"}`); return; }
          await cargarPesos(ok);
        } catch { aviso("Sin conexión con el backend."); }
      };
      $$(".cn-sem-peso", el).forEach((fila) => {
        const vid = fila.dataset.var, n = $("input[type=number]", fila), rg = $("input[type=range]", fila);
        rg.addEventListener("input", () => { n.value = rg.value; });
        n.addEventListener("input", () => { if (n.value !== "" && Number.isFinite(+n.value)) rg.value = Math.min(hi, Math.max(lo, +n.value)); });
        $("[data-g]", fila).addEventListener("click", () => {
          const v = n.value.trim() === "" ? NaN : Number(n.value);
          if (!Number.isFinite(v) || v < lo || v > hi) { aviso(`El peso debe ser un número entre ${lo} y ${hi}.`); n.focus(); return; }
          accion(() => enviar("PUT", API + "/pesos", { padecimiento_id: pad, variable_id: vid, peso: v }), "Peso guardado. Se aplicará en la próxima evaluación.");
        });
        $("[data-r]", fila).addEventListener("click", () => accion(() => enviar("POST", API + "/pesos/restaurar", { padecimiento_id: pad, variable_id: vid }), "Peso restaurado al de la fuente."));
      });
      $("[data-rt]", el).addEventListener("click", () => accion(() => enviar("POST", API + "/pesos/restaurar", { padecimiento_id: pad }), "Pesos de este padecimiento restaurados."));
      $("[data-re]", el).addEventListener("click", async () => {
        const t = tripActual();
        await evaluar(t ? !!t.simulado : true, $("[data-re]", el));
      });
    }

    // ------------------------------------------------------------ analizar con modelos (eco / ECG)
    const modelos = (function () {
      const M = { disp: null, tipo: "eco", trabajo: null, gen: 0, timer: null, error: "" };
      const raiz = () => $("#sm-mod", p);
      const parar = () => { if (M.timer) { clearTimeout(M.timer); M.timer = null; } M.gen++; };
      const ETAPA = { en_cola: "En cola", modelo: "Corriendo el modelo", puente: "Guardando en la base", reevaluando: "Reevaluando el semáforo", fin: "Terminado" };
      const mm = (x) => (x == null || x === "" ? "–" : String(x));
      const modelosDe = (tipo) => ((M.disp && M.disp.modelos) || []).filter((m) => m.analizable && m.tipo === tipo);
      const muestrasDe = (tipo) => ((M.disp && M.disp.muestras) || []).filter((m) => m.tipo === tipo);
      const kb = (b) => (b >= 1048576 ? (b / 1048576).toFixed(1).replace(".", ",") + " MB" : Math.max(1, Math.round(b / 1024)) + " KB");
      const segs = (t) => {
        const a = Date.parse(t.iniciado || t.creado), b = t.terminado ? Date.parse(t.terminado) : Date.now();
        return Number.isFinite(a) && Number.isFinite(b) ? Math.max(0, Math.round((b - a) / 1000)) : 0;
      };

      /** Carga la lista de modelos y muestras (una vez) y pinta la tarjeta; después solo actualiza los tripulantes. */
      async function actualizar() {
        const el = raiz();
        if (!el || !E.datos) return;
        if (M.disp) { opcionesTrip(); return; }
        const g = ++M.gen;
        let r;
        try { r = await api(MOD + "/disponibles"); } catch { r = null; }
        if (g !== M.gen || !vivo()) return;
        if (!r || !r.ok || !r.j || !Array.isArray(r.j.modelos)) {
          el.hidden = false;
          el.innerHTML = `<h2 id="sm-t-mod">${pastilla("info", "#5B8DFF", "#1F4FD8")} Analizar con modelos</h2>
            <p class="cn-nota">No se pudo leer la lista de modelos${r && r.j && r.j.error ? ": " + esc(r.j.error) : " (este backend no la ofrece o no hay conexión)"}.</p>`;
          return;
        }
        M.disp = r.j;
        pintar();
      }
      function pintar() {
        const el = raiz(), d = M.disp;
        el.hidden = false;
        el.innerHTML = `<h2 id="sm-t-mod">${pastilla("tendencia", "#33C3B3", "#0E8F86")} Analizar con modelos</h2>
          <p class="cn-nota">Corre un modelo de eco o de ECG sobre una muestra de la carpeta <code>${esc(d.muestras_dir || "samples")}</code> y guarda lo que el motor sabe usar. Son modelos de investigación: <b>No es diagnóstico.</b></p>
          <div class="cn-sem-acciones" role="group" aria-label="Tipo de análisis" style="margin:8px 0">
            <button type="button" class="cn-boton" data-mt="eco" aria-pressed="${M.tipo === "eco"}">${ic("play", "ic-sm")}Analizar eco</button>
            <button type="button" class="cn-boton" data-mt="ecg" aria-pressed="${M.tipo === "ecg"}">${ic("play", "ic-sm")}Analizar ECG</button></div>
          <div class="cn-form cn-sem-mform" id="sm-mf"></div>
          <div id="sm-mprog" aria-live="polite"></div><div id="sm-mres"></div>`;
        $$("[data-mt]", el).forEach((b) => b.addEventListener("click", () => { M.tipo = b.dataset.mt; $$("[data-mt]", el).forEach((x) => x.setAttribute("aria-pressed", x === b)); formulario(); }));
        formulario();
        if (M.trabajo) pintarTrabajo(M.trabajo);
      }
      function opcionesTrip() {
        const s = $("#sm-m-trip", p);
        if (!s) return;
        const previo = s.value, ts = E.datos.tripulantes;
        s.innerHTML = ts.map((t) => `<option value="${esc(t.id)}">${esc(t.nombre || t.id)}</option>`).join("");
        s.value = ts.find((t) => t.id === previo) ? previo : (E.trip || (ts[0] && ts[0].id) || "");
      }
      function formulario() {
        const f = $("#sm-mf", p);
        if (!f) return;
        const ms = modelosDe(M.tipo), us = muestrasDe(M.tipo);
        const previoSim = $("#sm-m-sim", p), sim = previoSim ? previoSim.checked : true;
        f.innerHTML = `<div><label for="sm-m-trip">Tripulante</label><select id="sm-m-trip" class="cn-select"></select></div>
          <div><label for="sm-m-mod">Modelo (${M.tipo === "eco" ? "eco" : "ECG"})</label>
            <select id="sm-m-mod" class="cn-select">${ms.map((m) => `<option value="${esc(m.key)}">${esc(m.nombre)}${m.entorno_instalado ? "" : " (entorno no instalado)"}</option>`).join("")}</select></div>
          <div><label for="sm-m-arch">Muestra disponible</label>
            <select id="sm-m-arch" class="cn-select">${us.map((u) => `<option value="${esc(u.archivo)}">${esc(u.archivo)} · ${esc(kb(u.bytes))}</option>`).join("")}</select></div>
          <div id="sm-m-vistaw"><label for="sm-m-vista">Vista</label><select id="sm-m-vista" class="cn-select"></select></div>
          <label class="cn-nivel"><input type="checkbox" id="sm-m-sim" ${sim ? "checked" : ""} /> <b>SIMULADO</b> — la muestra no es del tripulante</label>
          <p class="cn-nota cn-sem-alerta" id="sm-m-simaviso" hidden><b>Atención:</b> sin la marca SIMULADO, el resultado se guardará como dato real del tripulante y puede mover su semáforo. Úsalo solo si la muestra es de esa persona.</p>
          <label class="cn-nivel"><input type="checkbox" id="sm-m-carga" /> Prueba de carga (sin pesos)</label>
          <div class="cn-sem-acciones"><button type="button" class="cn-boton" id="sm-m-go">${ic("play", "ic-sm")}Analizar</button></div>
          ${!ms.length ? `<p class="cn-nota">No hay modelos de ${M.tipo === "eco" ? "eco" : "ECG"} analizables en el backend.</p>` : ""}
          ${!us.length ? `<p class="cn-nota">No hay muestras de ${M.tipo === "eco" ? "eco (video)" : "ECG (.hea)"} en la carpeta de muestras.</p>` : ""}`;
        opcionesTrip();
        const vistas = () => {
          const m = ms.find((x) => x.key === $("#sm-m-mod", p).value), w = $("#sm-m-vistaw", p), s = $("#sm-m-vista", p);
          const exige = !!m && !(m.vistas_admitidas || []).some((v) => String(v).toLowerCase() === "cualquiera");
          w.hidden = !exige;
          s.innerHTML = exige ? m.vistas_admitidas.map((v) => `<option value="${esc(v)}">${esc(v)}</option>`).join("") : "";
        };
        $("#sm-m-mod", p).addEventListener("change", vistas);
        vistas();
        const aviso = () => { $("#sm-m-simaviso", p).hidden = $("#sm-m-sim", p).checked; };
        $("#sm-m-sim", p).addEventListener("change", aviso);
        aviso();
        $("#sm-m-go", p).addEventListener("click", lanzar);
        $("#sm-m-go", p).disabled = !ms.length || !us.length || !!(M.trabajo && (M.trabajo.estado === "en_cola" || M.trabajo.estado === "corriendo"));
      }
      async function lanzar() {
        const cuerpo = { tripulante: $("#sm-m-trip", p).value, modelo: $("#sm-m-mod", p).value, archivo: $("#sm-m-arch", p).value,
          simulado: $("#sm-m-sim", p).checked, prueba_carga: $("#sm-m-carga", p).checked };
        if (!$("#sm-m-vistaw", p).hidden) cuerpo.vista = $("#sm-m-vista", p).value;
        const prog = $("#sm-mprog", p), go = $("#sm-m-go", p);
        go.disabled = true; $("#sm-mres", p).innerHTML = "";
        prog.innerHTML = `<p class="cn-nota">Enviando…</p>`;
        let r;
        try { r = await enviar("POST", MOD + "/analizar", cuerpo); }
        catch { if (vivo()) { prog.innerHTML = `<p class="cn-nota">No se pudo analizar: sin conexión con el backend.</p>`; go.disabled = false; } return; }
        if (!vivo()) return;
        if (!r.ok) { prog.innerHTML = `<p class="cn-nota">No se pudo analizar (HTTP ${esc(r.status)}): ${esc(r.j.error || "error desconocido")}</p>`; go.disabled = false; return; }
        M.trabajo = r.j;
        sondear(r.j.id);
      }
      /** Polling cada ~1,5 s; se detiene al salir de la vista (p ya no está conectado). */
      function sondear(id) {
        const g = ++M.gen;
        const paso = async () => {
          if (g !== M.gen || !vivo()) return;
          let r;
          try { r = await api(MOD + "/trabajos/" + encodeURIComponent(id)); } catch { r = null; }
          if (g !== M.gen || !vivo()) return;
          if (r && r.ok && r.j && r.j.id) {
            M.trabajo = r.j;
            pintarTrabajo(r.j);
            if (r.j.estado === "ok" || r.j.estado === "error") { if ($("#sm-m-go", p)) $("#sm-m-go", p).disabled = false; if (r.j.estado === "ok") cargar(); return; }
          } else $("#sm-mprog", p).innerHTML = `<p class="cn-nota">Sin respuesta del backend; reintentando…</p>`;
          M.timer = setTimeout(paso, 1500);
        };
        paso();
      }
      function pintarTrabajo(t) {
        const prog = $("#sm-mprog", p), res = $("#sm-mres", p);
        if (!prog) return;
        const etiquetas = `${t.simulado ? chipSim() : ""}${t.prueba_carga ? ` <span class="cn-chip c-2">PRUEBA DE CARGA — no es resultado</span>` : ""}`;
        if (t.estado === "en_cola" || t.estado === "corriendo") {
          prog.innerHTML = `<p><b>${esc(t.modelo)}</b> · ${esc(t.archivo)} ${etiquetas}</p>
            <p class="cn-nota">${esc(ETAPA[t.fase] || t.fase)} · ${esc(t.estado === "en_cola" ? "esperando turno" : segs(t) + " s")}${t.timeout_s ? ` · tiempo máximo ${esc(t.timeout_s)} s` : ""}</p>`;
          res.innerHTML = "";
          return;
        }
        if (t.estado === "error") {
          prog.innerHTML = `<p><b>${esc(t.modelo)}</b> · ${esc(t.archivo)} ${etiquetas}</p>`;
          res.innerHTML = `<p class="cn-sem-err"><b>El análisis no terminó.</b> ${esc(t.error || "error desconocido")}</p>
            ${t.salida && t.salida.stderr_cola ? `<details class="cn-detalles"><summary>Detalle técnico</summary><pre class="cn-nota" style="white-space:pre-wrap">${esc(t.salida.stderr_cola)}</pre></details>` : ""}
            <p class="cn-nota">No es diagnóstico. No se guardó nada en la base.</p>`;
          return;
        }
        prog.innerHTML = `<p><b>${esc(t.modelo)}</b> · ${esc(t.archivo)} ${etiquetas} <span class="cn-nota">terminado en ${segs(t)} s</span></p>`;
        res.innerHTML = resultado(t);
      }
      function resultado(t) {
        const r = t.resultado || {}, s = t.salida || {}, ck = (r.checkpoint || s.checkpoint) || null;
        const vs = r.valores || [];
        const ckPath = ck && ck.path ? String(ck.path) : "";
        const ckTxt = ckPath
          ? `checkpoint <code>${esc(ckPath.split(/[\\/]/).filter(Boolean).pop() || ckPath)}</code>${ck.sha256 ? ` · sha256 <code>${esc(String(ck.sha256).slice(0, 12))}…</code>` : ` · sha256 no registrado`}${t.prueba_carga ? ` (no cargado: prueba de carga)` : ``}`
          : esc(t.tipo === "ecg" ? "sin checkpoint (algoritmo de señal NeuroKit2)" : "checkpoint no declarado");
        const fila = (v) => `<tr><th scope="row">${esc(v.metrica)}${v.experimental ? ` <span class="cn-chip c-1">EXPERIMENTAL</span>` : ""}</th>
          <td>${v.valor == null ? `<span class="tenue">sin dato</span>` : `<b class="num">${esc(num(v.valor))}</b>${v.unidad ? ` <small class="tenue">${esc(v.unidad)}</small>` : ""}`}</td>
          <td>${esc(mm(v.variable_id))}</td><td>${esc(mm(v.nivel))}</td>
          <td>${v.guardada ? "Guardada" : `<span class="tenue">${esc(v.existente ? "ya existía" : v.motivo || "no guardada")}</span>`}</td></tr>`;
        let h = `<div class="cn-chips" style="margin:6px 0"><span class="cn-chip c-nd">No es diagnóstico</span>${t.simulado ? chipSim() : ""}${t.prueba_carga ? `<span class="cn-chip c-2">PRUEBA DE CARGA — no es resultado</span>` : ""}
          ${s.inferencia_real === false && !t.prueba_carga ? `<span class="cn-chip c-1">Sin inferencia real</span>` : ""}</div>
          <p class="cn-nota">Modelo <b>${esc(t.modelo)}</b>${s.device ? ` · ${esc(s.device)}` : ""} · ${ckTxt} · ${esc(r.guardadas == null ? 0 : r.guardadas)} valores guardados</p>
          ${vs.length ? `<div class="cn-tabla-caja"><table><thead><tr><th>Métrica</th><th>Valor</th><th>Variable</th><th>Nivel</th><th>Guardada</th></tr></thead><tbody>${vs.map(fila).join("")}</tbody></table></div>` : `<p class="cn-nota">El puente no devolvió valores.</p>`}`;
        if (t.prueba_carga) h += `<p class="cn-nota"><b>Prueba de carga:</b> datos de relleno y sin pesos; no significa nada clínicamente y no se guarda.</p>`;
        const sm = t.semaforo;
        if (sm) {
          h += `<h3 class="cn-sem-sub">Cambios del semáforo</h3>`;
          if (!sm.reevaluado) h += `<p class="cn-nota">No se reevaluó el semáforo${sm.motivo ? ": " + esc(sm.motivo) : ""}.</p>`;
          else if (!(sm.cambios || []).length) h += `<p class="cn-nota">Sin cambios en el semáforo.</p>`;
          else h += `<ul class="cn-sem-cmd">${sm.cambios.map((c) => `<li>${esc(c.nombre)}: ${semC(c.antes)} → ${semC(c.despues)}</li>`).join("")}</ul>`;
          if (t.simulado) h += `<p class="cn-nota">Dato SIMULADO: el canal real ignora datos simulados (G1), por eso no mueve el semáforo real.</p>`;
        }
        const av = (r.avisos || []).slice(0, 3);
        if (av.length) h += `<p class="cn-nota">Avisos: ${av.map(esc).join("; ")}</p>`;
        return h + `<p class="cn-nota">${esc(t.aviso || "No es un diagnóstico. Se recomienda revisión por el cirujano de vuelo.")}</p>`;
      }
      return { actualizar, parar };
    })();

    cargar();
  }

  window.SEMAFORO = { vista };
})();
