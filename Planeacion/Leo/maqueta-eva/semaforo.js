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
    const vivo = () => p.isConnected && p.querySelector("#sm-raiz") != null;

    p.innerHTML = `<div id="sm-raiz">
      <div class="cn-encabezado"><div><h1>Semáforo de padecimientos</h1><p class="sub">Motor de 20 padecimientos (prototipo-salud) · última evaluación guardada en la computadora central</p></div>
        <span class="cn-empuja cn-sem-acciones"><span id="sm-vivo"></span><button type="button" class="cn-boton" id="sm-act">${ic("tendencia", "ic-sm")}Actualizar</button></span></div>
      <section class="tarjeta cn-sem-aviso" aria-label="Aviso">
        <p><b>No es un diagnóstico. Se recomienda revisión por el cirujano de vuelo.</b> <span class="cn-chip c-1">Umbrales provisionales</span></p>
        <p class="cn-nota">Distinto del índice por padecimiento del panel clínico (11 malestares, pesos de Leo): este semáforo lo calcula el motor Python con 20 padecimientos y sus vínculos con fuente.</p></section>
      <div id="sm-estado" aria-live="polite"></div>
      <div id="sm-sel" class="cn-sem-sel"></div>
      <div class="cn-rejilla cn-2b" style="margin-top:16px">
        <section class="tarjeta" aria-labelledby="sm-t-lista"><h2 id="sm-t-lista">${pastilla("lista", "#5B8DFF", "#1F4FD8")} Padecimientos (20)</h2><div id="sm-lista"></div></section>
        <div style="display:grid;gap:16px;align-content:start"><section class="tarjeta" id="sm-detalle" aria-live="polite"></section><section class="tarjeta" id="sm-pesos" aria-labelledby="sm-t-pesos"></section></div>
      </div></div>`;
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

    cargar();
  }

  window.SEMAFORO = { vista };
})();
