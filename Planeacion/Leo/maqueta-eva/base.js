/* LUNNA · base en Tierra: la consola del cirujano de vuelo.
 *
 * Casi igual a la computadora central, pero desde Tierra: solo ve lo que ya llegó por el enlace (siempre
 * el pasado, con su SCET y su antigüedad), ve los pronósticos de la tripulación con el índice por
 * padecimiento (pesos fisiológicos de Leo) y manda mensajes y advertencias a la nave, que tardan lo que
 * tarda la luz en llegar y otro tanto en volver como acuse.
 * Mismas piezas que el teléfono y la central (Cuerpo LUNNA, iconos, semáforo). Todo es SIMULADO.
 */
(function () {
  "use strict";
  const K = window.CONSOLA, M = window.MOTOR;
  const { $, $$, esc, fmt, ic, pastilla, sem, chip, forma } = K;
  const AUTOR = "Cirujano de vuelo";

  K.montarBarra({
    app: "base",
    subtitulo: "Base en Tierra · control de misión",
    pestanas: [
      { id: "hoy", texto: "Hoy", icono: "casa", href: "#hoy" },
      { id: "pronosticos", texto: "Pronósticos", icono: "tendencia", href: "#pronosticos" },
      { id: "mensajes", texto: "Mensajes", icono: "mensaje", href: "#mensajes" },
    ],
  });

  const P = (id) => K.persona(id);
  const nombreDe = (pid) => (pid ? (P(pid) || {}).nombre || pid : "toda la tripulación");
  const sel = { region: {}, ind: {}, mapa: null };
  const nuevos = new Set();
  const borrador = { pid: "", nivel: "aviso", variable: "", texto: "" };
  const SCET = () => `SCET D${K.dia} 07:42`;
  const ANTIG = () => `recibido 08:00 · antigüedad ${K.OWLT_ESCENARIO_MIN} min`;

  // ================================================================ piezas
  function tarjetaEnlace() {
    const s = K.owltSeg();
    const enVuelo = K.enCamino("subida").length;
    return `<section class="tarjeta" aria-labelledby="t-enl"><h2 id="t-enl">${pastilla("antena", "#38D1F0", "#0B8DB8")} Enlace con la nave <span class="cn-empuja tenue">${K.backend ? `backend de Julio v${K.backend.version}` : "simulado en este navegador"}</span></h2>
      <div class="cn-enlace">
        <div><span>Por trayecto</span><b>${K.OWLT_ESCENARIO_MIN} min</b><span>${K.backend ? `backend: ${s} s` : `demo: ${s} s (×60)`}</span></div>
        <div><span>Último paquete</span><b>07:42</b><span>${SCET()} · llegó 08:00</span></div>
        <div><span>Hacia la nave</span><b>${enVuelo}</b><span>mensajes en camino</span></div>
        <div><span>Ventana</span><b>${K.backend && !K.backend.abierto ? "Cerrada" : "Abierta"}</b><span>${K.backend && !K.backend.abierto ? "lo que mandes espera en cola" : "lo que mandes sale ya"}</span></div>
      </div>
      <p class="cn-nota" style="margin-top:8px">Desde Tierra siempre se ve el pasado: nada dice «estado actual», sino de cuándo es cada dato.</p></section>`;
  }
  /** Lo más alto del índice de cada tripulante (pronóstico rápido). */
  function tarjetaPronosticoRapido() {
    const filas = K.PERSONAS.map((x) => {
      const r = K.indices(x.id).find((i) => i.completo && i.valor > 0);
      if (!r) return `<a class="cn-fila" href="#tripulante/${x.id}" style="text-decoration:none;color:inherit"><span class="avatar" style="--c:${x.color}">${x.nombre[0]}</span><span><b>${esc(x.nombre)} · sin riesgos</b><small>${ic("check", "ic-sm")} Todos sus índices en 0: nada que vigilar hoy</small></span><span class="num">0</span></a>`;
      const t = K.tendencia(x.id, r.mid);
      return `<a class="cn-fila" href="#tripulante/${x.id}" style="text-decoration:none;color:inherit"><span class="avatar" style="--c:${x.color}">${x.nombre[0]}</span>
        <span><b>${esc(x.nombre)} · ${esc(r.mal.corto)}</b><span class="cn-pista" style="margin-top:4px"><i style="--v:${r.valor.toFixed(3)}"></i></span><small>${esc(r.mal.riesgo)}</small></span>
        <span class="num" title="${K.RUMBO[t.rumbo][1]}">${fmt(r.valor, 2)} ${K.RUMBO[t.rumbo][0]}</span></a>`;
    }).join("");
    return `<section class="tarjeta" aria-labelledby="t-pr"><h2 id="t-pr">${pastilla("tendencia", "#A97BFF", "#6B3FD8")} Pronóstico rápido <a class="cn-empuja enlace" href="#pronosticos">Ver todo</a></h2>
      <div class="cn-filas">${filas}</div>
      <p class="cn-nota" style="margin-top:8px">El padecimiento con el índice más alto de cada quien. ↗ ↘ → es la tendencia de los últimos días, ilustrativa.</p></section>`;
  }
  function tarjetaAmbiente() {
    return `<section class="tarjeta" aria-labelledby="t-amb"><h2 id="t-amb">${pastilla("ondas", "#33C3B3", "#0E8F86")} Ambiente de cabina <span class="cn-empuja tenue">${SCET()}</span></h2>
      <div class="cn-amb">${K.ambiente().map(([n, v, u, lim, nivel]) => `<div title="${esc(lim)}"><span>${esc(n)}</span><b>${v}<small>${u}</small></b>${sem(nivel, esc(lim))}</div>`).join("")}</div></section>`;
  }
  function tarjetaClima() {
    const cab = M.cabina(K.dia);
    return `<section class="tarjeta" aria-labelledby="t-clima"><h2 id="t-clima">${pastilla("sol", "#FF8A65", "#E5484D")} Clima espacial</h2>
      ${cab.solar ? `<div class="aviso-card ac-rojo">${sem(2, false)}<span><b>Evento de partículas solares</b><small>La nave reporta ${cab.tasa.toLocaleString("es-ES")} µSv/h y tripulación en el refugio. Tierra lo vio en DONKI ${M.DONKI.latenciaMin} min después del inicio.</small></span></div>`
        : K.positivo("sol", "Clima espacial en calma", `Sin riesgo por radiación: la nave reporta ${cab.tasa} µSv/h, dentro del diseño (&lt; 54)`)}
      <p class="cn-nota">Modelo del día 115: evento real <b>${M.DONKI.id}</b> de NASA DONKI. <a class="enlace" href="${M.DONKI.url}" target="_blank" rel="noopener">Ver en DONKI</a></p></section>`;
  }

  // ---------- bandeja: lo que llegó de la nave ----------
  function itemsBandeja(pid) {
    const vivos = K.llegados("bajada").filter((m) => !pid || !m.pid || m.pid === pid).reverse();
    const esc0 = K.paquetesEscenario().filter((x) => !pid || !x.pid || x.pid === pid);
    return { vivos, esc0 };
  }
  function bandejaHtml(pid, max) {
    const { vivos, esc0 } = itemsBandeja(pid);
    const html = [];
    for (const m of vivos) {
      const nv = K.NIVEL_MSJ[m.nivel] || K.NIVEL_MSJ.aviso;
      html.push(`<div class="cn-msj es-${nv.n}${nuevos.has(m.id) ? " nuevo" : ""}"><div class="meta">${chip(nv.n, `Consulta de a bordo · ${nv.txt}`, "cohete")}<span>sobre ${esc(nombreDe(m.pid))}</span><span>· ${esc(m.de || "CMO")}</span><span class="cn-empuja">llegó ${K.horaReal(m.t_llegada)} · tardó ${K.segTxt(m.t_llegada - m.t_envio)}</span></div>
        <p>${esc(m.texto)}</p><div class="acciones"><button type="button" class="cn-boton" data-responder="${m.id}">${ic("mensaje", "ic-sm")}Responder</button>${m.pid ? `<a class="cn-boton" href="#tripulante/${m.pid}">${ic("usuario", "ic-sm")}Ver a ${esc(nombreDe(m.pid))}</a>` : ""}</div></div>`);
    }
    for (const x of esc0) {
      html.push(`<div class="cn-msj es-${x.nivel}"><div class="meta">${chip(x.nivel, x.tipo === "resumen" ? "Resumen" : x.nivel === 2 ? "Alerta roja" : "Alerta ámbar")}<span>${x.pid ? `sobre ${esc(nombreDe(x.pid))}` : "toda la tripulación"}</span><span class="cn-empuja">SCET D${x.dia} ${x.hora} · antigüedad ${K.OWLT_ESCENARIO_MIN} min · prioridad ${x.prio}</span></div>
        <p><b>${esc(x.titulo)}.</b> ${esc(x.texto)}</p>${x.evidencia ? `<ul style="margin:0;padding-left:18px;font:12px var(--mono);color:var(--texto-2)">${x.evidencia.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>` : ""}
        ${x.tipo !== "resumen" ? `<div class="acciones"><button type="button" class="cn-boton" data-responder-esc="${x.id}">${ic("mensaje", "ic-sm")}Responder</button>${x.pid ? `<a class="cn-boton" href="#tripulante/${x.pid}">${ic("usuario", "ic-sm")}Ver a ${esc(nombreDe(x.pid))}</a>` : ""}</div>` : ""}</div>`);
    }
    return (max ? html.slice(0, max) : html).join("") || K.positivo("check", "Todo tranquilo en la nave", "No llegó nada que pida respuesta.");
  }
  function conectarBandeja(cont) {
    $$("[data-responder]", cont).forEach((b) => b.addEventListener("click", () => {
      const m = K.leerEnlace().find((x) => x.id === b.dataset.responder);
      if (!m) return;
      redactar({ pid: m.pid || "", nivel: m.nivel === "urgente" ? "urgente" : "aviso", texto: `Sobre su consulta del día ${m.dia}: ` });
    }));
    $$("[data-responder-esc]", cont).forEach((b) => b.addEventListener("click", () => {
      const x = K.paquetesEscenario().find((y) => y.id === b.dataset.responderEsc);
      if (!x) return;
      const plantilla = x.id === "esc-fat-112" ? "Recomiendo priorizar el sueño de Ana y revalorar antes de la caminata espacial." : x.id === "esc-solar-115" ? "Recibido el evento solar. Permanezcan en el refugio hasta que la tasa baje de 54 µSv/h y confirmen el buddy check." : "";
      redactar({ pid: x.pid || "", nivel: x.nivel === 2 ? "urgente" : x.nivel === 1 ? "atencion" : "aviso", texto: plantilla });
    }));
  }
  /** Abre Mensajes con el borrador prellenado. */
  function redactar(b) {
    Object.assign(borrador, { pid: "", nivel: "aviso", variable: "", texto: "" }, b);
    if (location.hash === "#mensajes") ir(); else location.hash = "#mensajes";
    setTimeout(() => { const a = $("#m-msj"); if (a) { a.focus(); a.setSelectionRange(a.value.length, a.value.length); } }, 50);
  }

  // ---------- mensajes enviados con su recorrido ----------
  function recorrido(m) {
    const e = K.etapa(m);
    return `<div class="cn-recorrido" data-msg="${m.id}" style="--p:${e.p.toFixed(3)}">${["Redactado", "En camino", "A bordo", "Acuse en Tierra"].map((t, i) => `<span class="${i <= e.i ? "ya" : ""}">${t}</span>`).join("")}</div>`;
  }
  const estadoEnvio = (m) => { const e = K.etapa(m); return e.i < 2 ? `llega a bordo en ${K.segTxt(e.faltaLlegada)}` : e.i < 3 ? `llegó a bordo · acuse en ${K.segTxt(e.faltaAcuse)}` : "la nave confirmó la recepción"; };
  function enviadosHtml(pid) {
    const vivos = K.leerEnlace().filter((m) => m.sentido === "subida" && (!pid || !m.pid || m.pid === pid)).reverse();
    const notas = K.notasTierra().filter((n) => !pid || n.pid === pid);
    return vivos.map((m) => {
      const nv = K.NIVEL_MSJ[m.nivel] || K.NIVEL_MSJ.aviso;
      return `<div class="cn-msj es-${nv.n}${nuevos.has(m.id) ? " nuevo" : ""}"><div class="meta">${chip(nv.n, nv.txt, "tierra")}<span>para ${esc(nombreDe(m.pid))}</span>${m.variable ? `<span>· ${esc(K.IND[m.variable] ? K.IND[m.variable].nombre : m.variable)}</span>` : ""}${m.backend ? `<span>· también por el backend</span>` : ""}<span class="cn-empuja" data-estado="${m.id}">${estadoEnvio(m)}</span></div>
        <p>${esc(m.texto)}</p>${recorrido(m)}</div>`;
    }).join("") + notas.map((n) => `<div class="cn-msj es-0"><div class="meta">${chip(0, "Nota", "tierra")}<span>para ${esc(nombreDe(n.pid))}</span><span class="cn-empuja">escenario · la nave la recibió el día 114</span></div>
        <p class="cita" style="margin:0">«${esc(n.texto)}»</p><p class="cn-nota">Escrita sobre datos del ${esc(n.sobre)}; ${esc(n.llego)}.</p></div>`).join("")
      || `<div class="cn-vacio">Todavía no se ha mandado nada${pid ? ` a ${esc(nombreDe(pid))}` : ""}.</div>`;
  }
  function refrescarEstados() {
    for (const el of $$("[data-msg]")) {
      const m = K.leerEnlace().find((x) => x.id === el.dataset.msg);
      if (!m) continue;
      const e = K.etapa(m);
      el.style.setProperty("--p", e.p.toFixed(3));
      $$("span", el).forEach((s, i) => s.classList.toggle("ya", i <= e.i));
      const t = $(`[data-estado="${m.id}"]`);
      if (t) t.textContent = estadoEnvio(m);
    }
    const t = $("#t-enl");
    if (t) { const enVuelo = K.enCamino("subida").length; const b = t.closest(".tarjeta").querySelector(".cn-enlace > div:nth-child(3) b"); if (b) b.textContent = enVuelo; }
  }

  // ---------- formulario de mensaje ----------
  function plantillas(pid) {
    const out = [];
    const d = K.dia;
    const quien = pid ? [P(pid)] : K.PERSONAS;
    for (const x of quien) {
      const r = K.indices(x.id, d).find((i) => i.completo && i.valor > 0);
      if (r) {
        const mas = r.det.filter((v) => v.puntos).sort((a, b) => b.peso * b.puntos - a.peso * a.puntos)[0];
        out.push({ pid: x.id, nivel: "atencion", variable: mas && { fc_reposo: "fc", sueno: "sueno", pvt_lapsos: "lapsos", temperatura: "temperatura", respiracion: "fr", spo2: "spo2", presion_arterial: "presion" }[mas.v] || "", de: `Pronóstico · ${x.nombre} · ${r.mal.corto} ${fmt(r.valor, 2)}`, texto: `En Tierra vemos el índice de ${r.mal.corto.toLowerCase()} de ${x.nombre} en ${fmt(r.valor, 2)}${mas ? `, sobre todo por ${K.NOMBRE_VAR[mas.v].toLowerCase()} (${mas.detalle})` : ""}. Sugerimos revisarlo con la CMO hoy.` });
      }
    }
    if (d >= 112 && d < 114 && (!pid || pid === "MS-2")) out.push({ pid: "MS-2", nivel: "atencion", variable: "sueno", de: "FATIGA-03 de Ana", texto: "Recomiendo priorizar el sueño de Ana y revalorar antes de la caminata espacial." });
    if (M.cabina(d).solar) out.push({ pid: "", nivel: "urgente", variable: "", de: "Evento solar", texto: "Permanezcan en el refugio blindado hasta que la tasa baje de 54 µSv/h. Confirmen el buddy check y la dosis de cada quien." });
    if (!out.length) out.push({ pid: pid || "", nivel: "aviso", variable: "", de: "Sin hallazgos", texto: "Todo en orden desde Tierra. Sigan con la rutina de sueño, agua y ejercicio." });
    return out;
  }
  function formulario(pidFijo) {
    const b = pidFijo ? Object.assign({}, borrador, { pid: pidFijo }) : borrador;
    const pls = plantillas(pidFijo || b.pid || null);
    return `<form class="cn-form" id="f-msj" novalidate>
      <div class="cn-sugerencias"><span class="cn-etq">Plantillas desde la información y los pronósticos</span>
        ${pls.map((s, i) => `<div class="cn-sug"><span>${chip(K.NIVEL_MSJ[s.nivel].n, esc(s.de))}<br>${esc(s.texto)}</span><button type="button" class="cn-boton" data-plantilla="${i}">Usar</button></div>`).join("")}</div>
      <div class="cn-rejilla cn-2b" style="gap:12px">
        <div class="cn-campo"><label for="m-pid">Para</label><select id="m-pid" class="cn-select" ${pidFijo ? "disabled" : ""}><option value="">Toda la tripulación</option>${K.PERSONAS.map((x) => `<option value="${x.id}" ${b.pid === x.id ? "selected" : ""}>${esc(x.nombre)} · ${esc(x.rol)}</option>`).join("")}</select></div>
        <div class="cn-campo"><label for="m-var">Variable (opcional)</label><select id="m-var" class="cn-select"><option value="">Ninguna</option>${Object.entries(K.IND).map(([k, v]) => `<option value="${k}" ${b.variable === k ? "selected" : ""}>${esc(v.nombre)}</option>`).join("")}</select></div>
      </div>
      <fieldset><legend>Nivel</legend><div class="cn-niveles">${Object.entries(K.NIVEL_MSJ).map(([k, v]) => `<label class="cn-nivel es-${v.n}"><input type="radio" name="nivel" value="${k}" ${b.nivel === k ? "checked" : ""}><span>${forma(v.n, 11)}${v.txt}${v.backend ? ` · alerta ${v.backend === "rojo" ? "roja" : "ámbar"}` : ""}</span></label>`).join("")}</div></fieldset>
      <div class="cn-campo"><label for="m-msj">Mensaje</label><textarea id="m-msj" class="cn-area" maxlength="500" placeholder="Mensaje o advertencia para la nave">${esc(b.texto)}</textarea></div>
      <div class="cn-niveles"><button type="submit" class="btn">${ic("enviar")} Enviar a la nave</button></div>
      <p class="cn-estado-envio" role="status" id="m-estado"></p>
      <p class="cn-nota">Llega a bordo en ${K.OWLT_ESCENARIO_MIN} min (${K.owltSeg()} s en la demo): a la computadora central y, como notificación, al teléfono de quien lo recibe. El acuse tarda otro tanto en volver.</p>
    </form>`;
  }
  function conectarFormulario(cont, pidFijo, alEnviar) {
    const f = $("#f-msj", cont);
    if (!f) return;
    const pls = plantillas(pidFijo || borrador.pid || null);
    const guardar = () => {
      borrador.pid = pidFijo ? borrador.pid : $("#m-pid", f).value;
      borrador.variable = $("#m-var", f).value;
      borrador.nivel = new FormData(f).get("nivel") || "aviso";
      borrador.texto = $("#m-msj", f).value;
    };
    f.addEventListener("input", guardar);
    f.addEventListener("change", guardar);
    $$("[data-plantilla]", f).forEach((bt) => bt.addEventListener("click", () => {
      const s = pls[+bt.dataset.plantilla];
      if (!pidFijo) $("#m-pid", f).value = s.pid;
      $("#m-var", f).value = s.variable || "";
      f.querySelector(`input[value="${s.nivel}"]`).checked = true;
      const a = $("#m-msj", f); a.value = s.texto; a.focus();
      guardar();
    }));
    f.addEventListener("submit", async (e) => {
      e.preventDefault();
      const est = $("#m-estado", f), area = $("#m-msj", f), texto = area.value.trim();
      if (!texto) { est.textContent = "Escribe un mensaje antes de enviar."; est.classList.add("error"); area.focus(); return; }
      est.classList.remove("error");
      const pid = pidFijo || $("#m-pid", f).value || null;
      const nivel = new FormData(f).get("nivel"), variable = $("#m-var", f).value || null;
      const porBackend = K.backend ? await K.avisoBackend({ pid, nivel, variable, texto, de: AUTOR }) : false;
      const m = K.enviarEnlace({ sentido: "subida", tipo: K.NIVEL_MSJ[nivel].backend ? "alerta" : "aviso", nivel, pid, variable, de: AUTOR, texto, backend: porBackend });
      nuevos.add(m.id);
      area.value = ""; borrador.texto = "";
      est.textContent = `Enviado a ${nombreDe(pid)}: llega a bordo en ${K.segTxt(m.t_llegada - m.t_envio)} (${K.OWLT_ESCENARIO_MIN} min del escenario)${porBackend ? " · también por el backend de Julio" : ""}.`;
      if (alEnviar) alEnviar(m);
    });
  }

  // ================================================================ vista: Hoy
  function vistaHoy(p) {
    K.marcarPestana("hoy");
    p.innerHTML = `${K.tarjetaMision({ etq: `Lo que llegó de la nave · ${SCET()}`, extra: `<p class="cn-nota" style="margin-top:4px">${ic("hora", "ic-sm")} ${ANTIG()}: es el pasado de la nave, no su estado de ahora.</p>` })}
      <div class="cn-rejilla cn-2" style="margin-top:16px">
        <div class="cn-pila">
          ${tarjetaEnlace()}
          <section aria-labelledby="t-trip">
            <div class="cn-encabezado" style="margin:4px 0 12px"><h2 id="t-trip" style="font-size:19px">Tripulación</h2><span class="tenue">Estado al ${SCET()} · ${ANTIG()}</span></div>
            <ul class="cn-trip-lista">${K.PERSONAS.map((x) => {
              const r = K.indices(x.id).find((i) => i.completo && i.valor > 0);
              return `<li>${K.tarjetaTripulante(x, `#tripulante/${x.id}`, r ? `Pronóstico: ${esc(r.mal.corto)} ${fmt(r.valor, 2)}` : "Sin riesgos · ver lo que llegó")}</li>`;
            }).join("")}</ul>
            <div class="cn-leyenda">${sem(0, "En su normal")}${sem(1, "Atención")}${sem(2, "Actúa ahora")}${sem(null, "Sin dato")}</div>
          </section>
          <section class="tarjeta" aria-labelledby="t-band"><h2 id="t-band">${pastilla("bandeja", "#5B8DFF", "#1F4FD8")} Bandeja de la nave <a class="cn-empuja enlace" href="#mensajes">Mensajes</a></h2>
            <div id="bandeja">${bandejaHtml(null, 6)}</div></section>
        </div>
        <div class="cn-pila">${tarjetaPronosticoRapido()}${tarjetaAmbiente()}${tarjetaClima()}</div>
      </div>`;
    conectarBandeja(p);
  }

  // ================================================================ vista: un tripulante desde Tierra
  function vistaTripulante(p, pid) {
    K.marcarPestana("hoy");
    const x = P(pid);
    if (!x) { location.hash = "#hoy"; return; }
    const d = K.dia, e = K.ev(pid, d);
    const top = K.indices(pid, d), s = sel.ind[pid] || (top.find((i) => i.completo) || top[0]).mid;
    const tres = top.filter((i) => i.completo && i.valor != null).slice(0, 3).map((i) => i.mid);
    const L = M.lunaDice(pid, d);
    p.innerHTML = `<header class="cn-hud-cab">
        <a class="cn-boton" href="#hoy">${ic("atras", "ic-sm")}Tripulación</a>
        <span class="avatar grande" style="--c:${x.color}">${x.nombre[0]}</span>
        <div><h1>${esc(x.nombre)}</h1><p class="sub">${x.id} · ${esc(x.rol)} · lo que llegó de la nave · ${SCET()} · ${ANTIG()}</p></div>
        ${sem(e.general)}<span class="cn-chips">${e.alertas.map((a) => chip(a.nivel, K.NOMBRE_ALERTA[a.id] || a.id)).join("")}</span>
        <button type="button" class="cn-boton cn-empuja" id="ir-msj">${ic("enviar", "ic-sm")}Mandar mensaje a ${esc(x.nombre)}</button>
      </header>
      <div class="cn-hud">
        <section class="tarjeta cn-hud-izq" aria-labelledby="t-vit"><h2 id="t-vit">${pastilla("corazon", "#FF6B8B", "#D93A63")} Signos vitales <span class="cn-empuja tenue">resumen diario (◐)</span></h2>
          ${["fc", "hrv", "presion", "spo2", "fr", "temperatura", "glucosa"].map((k) => K.filaVital(pid, k, d)).join("")}</section>
        <div class="cn-hud-centro" id="centro">${K.centroCuerpo(pid, d, "tierra", sel.region)}</div>
        <div class="cn-hud-der cn-pila">
          <section class="tarjeta" aria-labelledby="t-pro"><h2 id="t-pro">${pastilla("tendencia", "#A97BFF", "#6B3FD8")} Pronóstico de ${esc(x.nombre)} </h2>
            ${tres.length ? K.grafIndice(pid, tres, d) : K.positivo("check", "Sin riesgos que vigilar", "Ningún padecimiento tiene datos fuera de su normal.")}
            <div id="ind-barras" style="margin-top:12px">${K.barrasIndice(pid, d, { sel: s })}</div></section>
          <section class="tarjeta" aria-labelledby="t-cab"><h2 id="t-cab">${pastilla("cerebro", "#A97BFF", "#6B3FD8")} Cabeza y desempeño</h2>
            ${K.filaVital(pid, "sueno", d)}${K.filaVital(pid, "lapsos", d)}${K.filaAnimo(pid, d, "tierra")}</section>
          <section class="tarjeta" aria-labelledby="t-met"><h2 id="t-met">${pastilla("rayo", "#FF9F45", "#E8620C")} Metas y radiación</h2>${K.metasYDosis(pid, d)}</section>
          <div class="cn-privado">${ic("candado")}<span><b>Lo que Tierra no ve:</b> el diario y el ciclo solo con su permiso; la ubicación en la nave, nunca. Los signos llegan como resumen diario. Igual que en el teléfono (ERS §6.5).</span></div>
        </div>
      </div>
      <div class="cn-rejilla cn-2b" style="margin-top:16px">
        <section class="tarjeta" aria-labelledby="t-det"><h2 id="t-det">${pastilla("lista", "#33C3B3", "#0E8F86")} Qué suma al índice</h2><div id="ind-detalle">${K.detalleIndice(pid, s, d)}</div></section>
        <section class="tarjeta" aria-labelledby="t-ld"><h2 id="t-ld">${pastilla("luna", "#5B8DFF", "#1F4FD8")} Lo que Lunna le dijo a ${esc(x.nombre)}</h2>
          <div class="globo"><p>${L.resumen}</p></div>
          ${L.hallazgos.map((h) => `<div class="cn-hallazgo es-${h.nivel}"><h4>${sem(h.nivel, false)}${esc(h.titulo)}</h4><p>${h.frase}</p>${h.evidencia && h.evidencia.length ? `<ul>${h.evidencia.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>` : ""}<p class="hacer"><b>Qué hacer:</b> ${esc(h.hacer)}</p></div>`).join("")}</section>
      </div>
      <div class="cn-rejilla cn-2b" style="margin-top:16px">
        <section class="tarjeta" aria-labelledby="t-env"><h2 id="t-env">${pastilla("enviar", "#5B8DFF", "#1F4FD8")} Mensaje para ${esc(x.nombre)}</h2><div id="form">${formulario(pid)}</div></section>
        <section class="tarjeta" aria-labelledby="t-con"><h2 id="t-con">${pastilla("mensaje", "#7C8AB8", "#4A5680")} Conversación con la nave sobre ${esc(x.nombre)}</h2>
          <p class="cn-etq" style="margin-bottom:8px">Enviados</p><div id="enviados">${enviadosHtml(pid)}</div>
          <p class="cn-etq" style="margin:14px 0 8px">Recibidos</p><div id="bandeja">${bandejaHtml(pid)}</div></section>
      </div>`;
    K.conectarCuerpo(p, pid, d, "tierra", sel.region);
    conectarIndices(p, pid, d);
    conectarBandeja(p);
    conectarFormulario(p, pid, () => { $("#enviados", p).innerHTML = enviadosHtml(pid); });
    $("#ir-msj", p).addEventListener("click", () => { const f = $("#m-msj", p); f.scrollIntoView({ block: "center", behavior: "smooth" }); setTimeout(() => f.focus(), 300); });
  }
  function conectarIndices(p, pid, d) {
    $$("#ind-barras [data-ind]", p).forEach((b) => b.addEventListener("click", () => {
      sel.ind[pid] = +b.dataset.ind;
      $("#ind-barras", p).innerHTML = K.barrasIndice(pid, d, { sel: sel.ind[pid] });
      $("#ind-detalle", p).innerHTML = K.detalleIndice(pid, sel.ind[pid], d);
      conectarIndices(p, pid, d);
    }));
  }

  // ================================================================ vista: pronósticos
  function vistaPronosticos(p) {
    K.marcarPestana("pronosticos");
    const d = K.dia;
    const mal = K.MALESTARES;
    if (!sel.mapa) {
      let mejor = null;
      for (const x of K.PERSONAS) for (const r of K.indices(x.id, d)) if (r.completo && r.valor != null && (!mejor || r.valor > mejor.v)) mejor = { pid: x.id, mid: r.mid, v: r.valor };
      sel.mapa = mejor ? { pid: mejor.pid, mid: mejor.mid } : { pid: K.PERSONAS[0].id, mid: 1 };
    }
    const celda = (x, m) => {
      const r = K.indice(x.id, m.id, d), v = r.valor;
      const activo = sel.mapa.pid === x.id && sel.mapa.mid === m.id;
      return `<td><button type="button" class="cn-celda cn-calor${v == null ? " sin" : ""}${v != null && v >= 0.55 ? " alto-v" : ""}" style="--v:${v == null ? 0 : v.toFixed(3)};${r.completo ? "" : "border-style:dashed;opacity:.72"}" data-celda="${x.id}|${m.id}" aria-pressed="${activo}"
        title="${esc(x.nombre)} · ${esc(m.nombre)}: ${v == null ? "sin datos" : fmt(v, 2)}${r.completo ? "" : " · incompleto"}${r.regla ? " · regla de peso 3" : ""}">
        ${v == null ? "–" : fmt(v, 2)}${r.regla ? `<small>${forma(2, 9)}</small>` : r.completo ? "" : "<small>incompleto</small>"}</button></td>`;
    };
    const s = sel.mapa;
    p.innerHTML = `<div class="cn-encabezado"><div><h1>Pronósticos</h1><p class="sub">Índice por padecimiento de cada tripulante · ${SCET()} · ilustrativo, no diagnóstico</p></div></div>
      <section class="tarjeta" aria-labelledby="t-mapa"><h2 id="t-mapa">${pastilla("grafica", "#A97BFF", "#6B3FD8")} Mapa de la tripulación <span class="cn-empuja tenue">toca una celda</span></h2>
        <div class="cn-tabla-caja"><table class="cn-mapa"><thead><tr><th></th>${mal.map((m) => `<th scope="col" title="${esc(m.nombre)}">${esc(m.corto)}</th>`).join("")}</tr></thead>
          <tbody>${K.PERSONAS.map((x) => `<tr><th scope="row"><span style="display:inline-flex;align-items:center;gap:8px"><span class="avatar" style="--c:${x.color};width:26px;height:26px;font-size:12px">${x.nombre[0]}</span>${esc(x.nombre)}</span></th>${mal.map((m) => celda(x, m)).join("")}</tr>`).join("")}</tbody></table></div>
        <div class="cn-escala"><span>0</span><i></i><span>1</span><span>· índice = Σ peso × puntos / máximo</span><span>· ${forma(2, 10)} una variable de peso 3 llegó a 3 puntos</span><span>· línea discontinua = incompleto (falta su variable de mayor peso)</span></div></section>
      <div class="cn-rejilla cn-2b" style="margin-top:16px">
        <section class="tarjeta" aria-labelledby="t-sel"><h2 id="t-sel">${pastilla("lista", "#33C3B3", "#0E8F86")} ${esc(P(s.pid).nombre)} · ${esc(mal.find((m) => m.id === s.mid).corto)}</h2>
          ${K.grafIndice(s.pid, [s.mid], d)}${K.detalleIndice(s.pid, s.mid, d)}
          <div class="cn-niveles" style="margin-top:8px"><a class="cn-boton" href="#tripulante/${s.pid}">${ic("usuario", "ic-sm")}Ver a ${esc(P(s.pid).nombre)}</a><button type="button" class="cn-boton" id="msj-sel">${ic("enviar", "ic-sm")}Escribir a la nave sobre esto</button></div></section>
        <section class="tarjeta" aria-labelledby="t-como"><h2 id="t-como">${pastilla("info", "#5B8DFF", "#1F4FD8")} Cómo se calcula</h2>
          <ol style="margin:0;padding-left:18px;display:grid;gap:6px;font-size:13px">
            <li>Cada variable se compara con <b>su normal</b> de 14 días (z robusto, el mismo motor del teléfono).</li>
            <li>Gana <b>puntos</b> solo en la dirección fisiológica del padecimiento: |z| &lt; 1 → 0 · 1–2 → 1 · 2–3 → 2 · &gt; 3 → 3. Presión, SpO₂ y CO₂ usan los umbrales del teléfono: atención → 2, alerta → 3.</li>
            <li><b>Índice</b> = Σ peso × puntos / máximo posible, con los pesos fisiológicos 0–3 (11 padecimientos × 9 variables).</li>
            <li>Lo que no se mide a diario (síntomas, pulso irregular, ortostatismo, fase circadiana) queda fuera y se muestra la <b>cobertura</b>.</li>
            <li>La tendencia a 3 días es una <b>extrapolación lineal</b> de los últimos 5 días: ilustrativa, no un modelo validado.</li>
          </ol>
          <p class="cn-nota" style="margin-top:8px">🔶 Decisiones del equipo: la conversión de umbrales a puntos y la extrapolación. Los pesos y su evidencia (A, B, C) vienen de <code>modelo-pesos/pesos.json</code>; ningún peso está validado en astronautas salvo CO₂ → cefalea.</p></section>
      </div>
      <section style="margin-top:16px" aria-labelledby="t-tend"><h2 id="t-tend" style="font-size:19px;margin:0 0 12px">Hacia dónde va cada quien</h2>
        <div class="cn-rejilla cn-2b">${K.PERSONAS.map((x) => {
          const tres = K.indices(x.id, d).filter((i) => i.completo && i.valor != null).slice(0, 3).map((i) => i.mid);
          return `<section class="tarjeta"><h2><span class="avatar" style="--c:${x.color};width:28px;height:28px;font-size:13px">${x.nombre[0]}</span>${esc(x.nombre)} <span class="cn-empuja">${sem(K.ev(x.id, d).general)}</span></h2>${tres.length ? K.grafIndice(x.id, tres, d) : K.positivo("check", "Sin riesgos que vigilar", "Ningún padecimiento tiene datos fuera de su normal.")}</section>`;
        }).join("")}</div></section>`;
    $$("[data-celda]", p).forEach((b) => b.addEventListener("click", () => { const [pid, mid] = b.dataset.celda.split("|"); sel.mapa = { pid, mid: +mid }; ir(); }));
    $("#msj-sel", p).addEventListener("click", () => {
      const r = K.indice(s.pid, s.mid, d), x = P(s.pid);
      redactar({ pid: s.pid, nivel: "atencion", texto: `Desde Tierra vemos el índice de ${r.mal.corto.toLowerCase()} de ${x.nombre} en ${r.valor == null ? "–" : fmt(r.valor, 2)}. ` });
    });
  }

  // ================================================================ vista: mensajes
  function vistaMensajes(p) {
    K.marcarPestana("mensajes");
    p.innerHTML = `<div class="cn-encabezado"><div><h1>Mensajes</h1><p class="sub">Mensajes y advertencias a la nave, con su recorrido de ida y su acuse de vuelta</p></div></div>
      ${tarjetaEnlace()}
      <div class="cn-rejilla cn-2" style="margin-top:16px">
        <section class="tarjeta" aria-labelledby="t-env"><h2 id="t-env">${pastilla("enviar", "#5B8DFF", "#1F4FD8")} Nuevo mensaje</h2><div id="form">${formulario(null)}</div></section>
        <section class="tarjeta" aria-labelledby="t-band"><h2 id="t-band">${pastilla("bandeja", "#5B8DFF", "#1F4FD8")} Bandeja de la nave</h2><div id="bandeja">${bandejaHtml(null)}</div></section>
      </div>
      <section class="tarjeta" style="margin-top:16px" aria-labelledby="t-envs"><h2 id="t-envs">${pastilla("tierra", "#38D1F0", "#0B8DB8")} Enviados</h2><div id="enviados">${enviadosHtml(null)}</div></section>`;
    conectarFormulario(p, null, () => { $("#enviados", p).innerHTML = enviadosHtml(null); });
    conectarBandeja(p);
  }

  // ================================================================ arranque
  const ir = K.enrutar({ hoy: vistaHoy, tripulante: vistaTripulante, pronosticos: vistaPronosticos, mensajes: vistaMensajes }, "hoy");

  K.alLlegar((m) => {
    if (m.sentido === "subida") {
      K.toast({ titulo: `Llegó a bordo · ${nombreDe(m.pid)}`, texto: m.texto, icono: "check", c1: "#3DD68C", c2: "#119B5A", ms: 4000 });
      return;
    }
    if (m.sentido !== "bajada") return;
    nuevos.add(m.id);
    const nv = K.NIVEL_MSJ[m.nivel] || K.NIVEL_MSJ.aviso;
    K.toast({ titulo: `Consulta de a bordo · ${nombreDe(m.pid)}`, texto: m.texto, icono: "cohete", c1: nv.n === 2 ? "#FF6B6B" : nv.n === 1 ? "#FFC23D" : "#5B8DFF", c2: nv.n === 2 ? "#D92D2D" : nv.n === 1 ? "#E08A00" : "#1F4FD8", alerta: nv.n === 2, ms: 9000, alClic: () => { location.hash = "#mensajes"; } });
    const b = $("#bandeja");
    if (b) {
      const pid = location.hash.startsWith("#tripulante/") ? location.hash.split("/")[1] : null;
      b.innerHTML = bandejaHtml(pid, location.hash === "" || location.hash === "#hoy" ? 6 : 0);
      conectarBandeja(document);
    }
    K.cuenta("mensajes", location.hash === "#mensajes" ? 0 : K.llegados("bajada").filter((x) => nuevos.has(x.id)).length);
  });
  K.alTicEnlace(refrescarEstados);
  window.addEventListener("hashchange", () => { if (location.hash === "#mensajes") { nuevos.clear(); K.cuenta("mensajes", 0); } });
  K.detectarBackend().then((hay) => { if (hay && !document.querySelector("textarea:focus")) ir(); });
})();
