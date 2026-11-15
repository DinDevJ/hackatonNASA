/* LUNNA · computadora central: el panel médico de a bordo.
 *
 * Diseño de Fani (Casa / Hoy, panel clínico de cada tripulante, estadísticas por misión, historial de
 * advertencias y emergencias, intervención médica) llevado al lenguaje de la app del teléfono: el mismo
 * Cuerpo LUNNA, los mismos iconos, el mismo semáforo con forma y la misma tripulación y escenario.
 * Le añade lo que estaba en la app y no en el panel: Lunna, ambiente de cabina, clima espacial, dosis
 * personal, metas de agua y ejercicio, privacidad por rol y el enlace con Tierra (cola y avisos).
 * Quien la usa es la CMO (Mei). Todo esto es SIMULADO; lo que sí viene del backend de Julio (tripulación,
 * variables, alertas de LUNNA y enlace) lo pinta central-vivo.js en los huecos [data-vivo].
 */
(function () {
  "use strict";
  const K = window.CONSOLA, M = window.MOTOR, C = window.CUERPO;
  const { $, $$, esc, fmt, ic, pastilla, sem, chip, forma } = K;
  const AUTOR = "CMO (Mei)";

  K.montarBarra({
    app: "central",
    subtitulo: "Computadora central · panel médico",
    pestanas: [
      { id: "hoy", texto: "Hoy", icono: "casa", href: "#hoy" },
      { id: "estadisticas", texto: "Estadísticas", icono: "grafica", href: "#estadisticas" },
      { id: "tierra", texto: "Enlace con Tierra", icono: "antena", href: "#tierra" },
    ],
  });

  const P = (id) => K.persona(id);
  const nombreDe = (pid) => (pid ? (P(pid) || {}).nombre || pid : "toda la tripulación");
  const sel = { region: {}, ind: {} };
  /** Rellena los huecos [data-vivo] con lo que diga el backend de Julio (central-vivo.js). */
  const pintarVivo = () => { if (window.VIVO) window.VIVO.pintar(); };

  // ================================================================ piezas
  /** Lo que Lunna ve en toda la tripulación (las mismas frases que el teléfono, en tercera persona). */
  function hallazgosTripulacion() {
    const out = [];
    let solar = false;
    for (const p of K.PERSONAS) {
      for (const h of M.lunaDice(p.id, K.dia).hallazgos) {
        if (h.id === "RADIACION") { if (!solar) { solar = true; out.push({ pid: null, h }); } continue; }
        out.push({ pid: p.id, h });
      }
    }
    return out.sort((a, b) => b.h.nivel - a.h.nivel);
  }
  function tarjetaLunna() {
    const g = K.general();
    const hs = hallazgosTripulacion().filter((x) => x.h.nivel > 0);
    const frase = g === 2 ? "<b>Hay algo que atender ahora.</b> Esto es lo que veo:" : hs.length ? `Veo <b>${hs.length}</b> cosa${hs.length > 1 ? "s" : ""} que vale la pena mirar hoy:` : "Toda la tripulación está en su normal hoy.";
    return `<section class="tarjeta cn-lunna" aria-label="Lo que Lunna ve en la tripulación">
      <span id="lunna-hoy" aria-hidden="true"></span>
      <div class="globo"><p>${frase}</p>${hs.length ? `<ul>${hs.map(({ pid, h }) => `<li>${forma(h.nivel, 10)} <b>${esc(nombreDe(pid))}</b> · ${esc(h.titulo)}${pid ? ` · <a class="enlace" href="#tripulante/${pid}">abrir</a>` : ""}</li>`).join("")}</ul>` : ""}
        <p class="cn-nota" style="margin-top:6px">Lunna avisa y explica; no diagnostica. La decisión es de la CMO.</p></div>
    </section>`;
  }
  function montarLunna(g) {
    const el = $("#lunna-hoy");
    if (el && window.LUNA) window.LUNA.crear(el, { cara: g === 2 ? (M.cabina(K.dia).solar ? "radiacion" : "alerta") : g === 1 ? "tranquila" : "feliz", tam: 78, fase: g === 2 ? 0.12 : g === 1 ? 0.62 : 1 });
  }

  /** Avisos de hoy con el mismo estilo de tarjeta que el inicio del teléfono. */
  function avisosHoy() {
    const t = [];
    const cab = M.cabina(K.dia);
    if (cab.solar) t.push(`<a class="aviso-card ac-rojo" href="#tierra">${sem(2, false)}<span><b>Evento de partículas solares · 11:04</b><small>Tasa de dosis ${cab.tasa.toLocaleString("es-ES")} µSv/h. Toda la tripulación al refugio blindado; buddy check.</small></span>${ic("chevron", "ac-flecha")}</a>`);
    const f = M.fatiga("MS-2", K.dia);
    if (f) {
      const n = f.estado === "cerrado" ? 0 : 1;
      t.push(`<a class="aviso-card ${n ? "ac-ambar" : "ac-verde"}" href="#tripulante/MS-2">${sem(n, false)}<span><b>${f.estado === "abierto" ? "FATIGA-03 de Ana" : f.estado === "mejorando" ? "Ana va mejorando (FATIGA-03)" : "FATIGA-03 de Ana cerrada"}</b><small>${f.estado === "abierto" ? "Sueño, reflejos y pulso juntos fuera de su normal. Caminata espacial en 36 h." : f.estado === "mejorando" ? "Sigue el protocolo FAT-01; se reevalúa mañana a las 07:30." : "Dos días en su normal: apta para la caminata espacial."}</small></span>${ic("chevron", "ac-flecha")}</a>`);
    }
    for (const p of K.PERSONAS) {
      const e = K.ev(p.id);
      for (const k of Object.keys(K.IND)) {
        const n = e.nivelDe(k);
        if (!n || e.alertas.some((a) => a.senales.includes(k))) continue;
        const v = K.valorDe(p.id, k, e.ind[k]);
        t.push(`<a class="aviso-card ${n === 2 ? "ac-rojo" : "ac-ambar"}" href="#tripulante/${p.id}">${sem(n, false)}<span><b>${esc(p.nombre)} · ${esc(K.IND[k].nombre)}</b><small>${v.v} ${esc(v.u)} · ${esc(K.IND[k].abs ? K.IND[k].abs.texto : "fuera de su normal")}</small></span>${ic("chevron", "ac-flecha")}</a>`);
      }
    }
    for (const n of K.notasTierra()) t.push(`<a class="aviso-card ac-info" href="#tierra">${ic("tierra", "ac-ic")}<span><b>Nota de Tierra sobre ${esc(nombreDe(n.pid))}</b><small>Sobre datos del ${esc(n.sobre)} · ${esc(n.llego)}</small></span>${ic("chevron", "ac-flecha")}</a>`);
    for (const m of K.llegados("subida").slice(-3).reverse()) t.push(`<a class="aviso-card ac-info" href="#tierra">${ic("tierra", "ac-ic")}<span><b>${esc(K.NIVEL_MSJ[m.nivel] ? K.NIVEL_MSJ[m.nivel].txt : "Aviso")} de Tierra · ${esc(nombreDe(m.pid))}</b><small>${esc(m.texto)}</small></span>${ic("chevron", "ac-flecha")}</a>`);
    return `<section class="tarjeta" aria-labelledby="t-avisos"><h2 id="t-avisos">${pastilla("alerta", "#FFC23D", "#E08A00")} Avisos de hoy</h2>
      ${t.length ? t.join("") : K.positivo("check", "Todo en orden", "Ningún aviso hoy: toda la tripulación está en su normal.")}</section>`;
  }

  function tarjetaAmbiente() {
    return `<section class="tarjeta" aria-labelledby="t-amb"><h2 id="t-amb">${pastilla("ondas", "#33C3B3", "#0E8F86")} Ambiente de cabina <span class="cn-empuja tenue">límites [A] NASA-STD-3001</span></h2>
      <div class="cn-amb">${K.ambiente().map(([n, v, u, lim, nivel]) => `<div title="${esc(lim)}"><span>${esc(n)}</span><b>${v}<small>${u}</small></b>${sem(nivel, esc(lim))}</div>`).join("")}</div></section>`;
  }
  function tarjetaClima() {
    const cab = M.cabina(K.dia);
    return `<section class="tarjeta" aria-labelledby="t-clima"><h2 id="t-clima">${pastilla("sol", "#FF8A65", "#E5484D")} Clima espacial</h2>
      ${cab.solar ? `<div class="aviso-card ac-rojo">${sem(2, false)}<span><b>Evento de partículas solares activo</b><small>Tasa ${cab.tasa.toLocaleString("es-ES")} µSv/h · refugio blindado · aviso de DONKI con ${M.DONKI.latenciaMin} min de latencia</small></span></div>`
        : K.positivo("sol", "Clima espacial en calma", `Sin riesgo por radiación: ${cab.tasa} µSv/h, dentro del diseño (&lt; 54) · dosis de la misión ${cab.dosisMision} mSv`)}
      <p class="cn-nota">El evento del día 115 está modelado sobre el evento real <b>${M.DONKI.id}</b> de NASA DONKI (${esc(M.DONKI.instrumento)}). <a class="enlace" href="${M.DONKI.url}" target="_blank" rel="noopener">Ver en DONKI</a></p></section>`;
  }
  function tarjetaEnlaceMini() {
    const cola = K.paquetesEscenario().length + K.leerEnlace().filter((m) => m.sentido === "bajada").length;
    const recibidos = K.notasTierra().length + K.llegados("subida").length;
    return `<section class="tarjeta" aria-labelledby="t-enl"><h2 id="t-enl">${pastilla("antena", "#38D1F0", "#0B8DB8")} Enlace con Tierra <a class="cn-empuja enlace" href="#tierra">Abrir</a></h2>
      <div class="cn-enlace" style="grid-template-columns:repeat(3,minmax(0,1fr))">
        <div><span>Por trayecto</span><b>${K.OWLT_ESCENARIO_MIN} min</b><span>36 min ida y vuelta</span></div>
        <div><span>Hacia Tierra</span><b>${cola}</b><span>paquetes priorizados</span></div>
        <div><span>De Tierra</span><b>${recibidos}</b><span>avisos recibidos</span></div>
      </div></section>`;
  }

  // ---------- historial de advertencias y emergencias (Fani) ----------
  function entradasHistorial(pid) {
    const d = K.dia, out = [];
    const deEl = (x) => !pid || !x || x === pid;
    // Lo que pasa en vivo en esta sesión: avisos de la CMO, consultas a Tierra y avisos que llegaron de Tierra.
    for (const m of K.leerEnlace().slice().reverse()) {
      if (!deEl(m.pid)) continue;
      const nv = K.NIVEL_MSJ[m.nivel] || K.NIVEL_MSJ.aviso;
      if (m.sentido === "abordo") out.push({ n: nv.n, chip: chip(nv.n, `${nv.txt} de la CMO`), meta: `Hoy ${m.hora} · para ${esc(nombreDe(m.pid))}`, texto: esc(m.texto), id: m.id });
      else if (m.sentido === "bajada") out.push({ n: nv.n, chip: chip(nv.n, "Consulta a Tierra", "tierra"), meta: `Hoy ${m.hora} · sobre ${esc(nombreDe(m.pid))}`, texto: esc(m.texto), id: m.id });
      else if (m.sentido === "subida" && m.t_llegada <= Date.now()) out.push({ n: nv.n, chip: chip(nv.n, `${nv.txt} de Tierra`, "tierra"), meta: `Llegó hoy ${K.horaReal(m.t_llegada)} · ${esc(m.de || "Cirujano de vuelo")} · para ${esc(nombreDe(m.pid))}`, texto: esc(m.texto), id: m.id });
    }
    for (const e of emergenciasReales) {
      const pid = K.DESDE_BACKEND[e.tripulante];
      if (!deEl(pid)) continue;
      out[e.resultado ? "push" : "unshift"]({ n: e.resultado ? 1 : 2, chip: chip(e.resultado ? 1 : 2, `Emergencia · ${e.modo}`), meta: `En vivo · ${K.horaReal(e.t_registro)} · ${esc(nombreDe(pid))}`, texto: `<b>Causa:</b> ${esc(e.causa || "sin causa registrada")}`, det: `<b>Resultado:</b> ${esc(e.resultado || "en curso")}`, id: `em-${e.id}` });
    }
    if (d >= 115) out.push({ n: 2, chip: chip(2, "Emergencia · automática"), meta: "Día 115 · 11:04 · toda la tripulación", texto: "<b>Causa:</b> evento de partículas solares; la tasa de dosis superó el umbral de refugio (≥ 3000 µSv/h).", det: "<b>Resultado:</b> tripulación al refugio blindado con buddy check; cronología sellada y enviada a Tierra con prioridad 0." });
    if (deEl("MS-2") && d >= 114) out.push({ n: 0, chip: chip(0, "Nota de Tierra", "tierra"), meta: "Día 114 · llegó con 41 min de antigüedad · para Ana", texto: "«Recomiendo priorizar el sueño de Ana y revalorar antes de la caminata espacial.»", det: "Escrita sobre datos del SCET D112 07:46; es anterior al cierre de FATIGA-03." });
    if (deEl("MS-2") && d >= 112 && M.fatiga("MS-2", 112)) {
      const f = M.fatiga("MS-2", d);
      out.push({ n: 1, chip: chip(1, "Advertencia · FATIGA-03"), meta: "Día 112 · 07:46 · Ana", texto: "<b>Causa:</b> sueño, reflejos (PVT-B) y pulso en reposo con z ≥ 2 a la vez; ninguno solo habría disparado.", det: `<b>Resultado:</b> protocolo FAT-01 (ventana de sueño de 8,5 h, sin cafeína 6 h antes, PVT-B a las 07:30)${f && f.estado === "cerrado" ? "; cerrada el día 114 con dos días en su normal" : f && f.estado === "mejorando" ? "; mejorando" : ""}.` });
    }
    return out;
  }
  function listaHistorial(pid) {
    const es = entradasHistorial(pid);
    return es.length ? `<ol class="cn-hist">${es.map((e) => `<li class="es-${e.n}${e.id && nuevos.has(e.id) ? " nuevo" : ""}"><div class="meta">${e.chip}<span>${e.meta}</span></div><p>${e.texto}</p>${e.det ? `<p class="det">${e.det}</p>` : ""}</li>`).join("")}</ol>`
      : K.positivo("escudo", "Todo en calma", `Ninguna advertencia ni emergencia${pid ? ` para ${esc(nombreDe(pid))}` : ""} en esta misión.`);
  }
  const nuevos = new Set();
  let emergenciasReales = [];   // del backend (teléfono → central), si corre

  // ================================================================ vista: Hoy
  function vistaHoy(p) {
    K.marcarPestana("hoy");
    const g = K.general();
    p.innerHTML = `<p class="cn-etq cn-separa">${ic("planeta", "ic-sm")} Escenario simulado · días ${K.DIA_MIN}–${K.DIA_MAX} · no viene del backend</p>
      ${K.tarjetaMision({ etq: "Misión activa · nave en tránsito" })}
      <div class="cn-rejilla cn-2" style="margin-top:16px">
        <div class="cn-pila">
          ${tarjetaLunna()}
          <section aria-labelledby="t-trip">
            <div class="cn-encabezado" style="margin:4px 0 12px"><h2 id="t-trip" style="font-size:19px">Tripulación</h2><span class="tenue">Selecciona a un tripulante para ver su panel clínico.</span></div>
            <ul class="cn-trip-lista">${K.PERSONAS.map((x) => `<li>${K.tarjetaTripulante(x, `#tripulante/${x.id}`)}</li>`).join("")}</ul>
            <div class="cn-leyenda">${sem(0, "En su normal")}${sem(1, "Atención")}${sem(2, "Actúa ahora")}${sem(null, "Sin dato")}<span>· la forma repite el color para no depender de él</span></div>
          </section>
          <div data-vivo="hoy"></div>
          <section class="tarjeta" aria-labelledby="t-hist"><h2 id="t-hist">${pastilla("hora", "#7C8AB8", "#4A5680")} Historial de advertencias y emergencias</h2>
            <p class="cn-nota" style="margin:-6px 0 10px">Avisos de la CMO, notas y alertas de Tierra y activaciones del modo emergencia, con su causa.</p>
            <div id="historial">${listaHistorial(null)}</div></section>
        </div>
        <div class="cn-pila">${avisosHoy()}${tarjetaAmbiente()}${tarjetaClima()}${tarjetaEnlaceMini()}</div>
      </div>`;
    montarLunna(g);
    pintarVivo();
  }

  // ================================================================ vista: panel clínico de un tripulante
  function tarjetaLunnaPersona(pid, d) {
    const L = M.lunaDice(pid, d), x = P(pid);
    const hs = L.hallazgos;
    return `<section class="tarjeta" aria-labelledby="t-ld"><h2 id="t-ld">${pastilla("luna", "#5B8DFF", "#1F4FD8")} Lo que Lunna le dijo a ${esc(x.nombre)} hoy</h2>
      <div class="globo"><p>${L.resumen}</p></div>
      ${hs.map((h) => `<div class="cn-hallazgo es-${h.nivel}"><h4>${sem(h.nivel, false)}${esc(h.titulo)} <span class="cn-empuja tenue" style="font-weight:500;font-size:11.5px">${esc(h.umbral || "")}</span></h4>
        <p>${h.frase}</p>${h.evidencia && h.evidencia.length ? `<ul>${h.evidencia.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>` : ""}<p class="hacer"><b>Qué hacer:</b> ${esc(h.hacer)}</p></div>`).join("")}
      ${L.bien.length ? `<p class="cn-nota" style="margin-top:10px">${ic("check", "ic-sm")} Va bien: ${L.bien.map(esc).join(" · ")}.</p>` : ""}
      <p class="cn-nota" style="margin-top:6px">Son las mismas frases que vio en su teléfono. Lunna no diagnostica.</p></section>`;
  }
  function tarjetaIndice(pid, d) {
    const top = K.indices(pid, d);
    const s = sel.ind[pid] || top[0].mid;
    return `<section class="tarjeta" aria-labelledby="t-ind"><h2 id="t-ind">${pastilla("tendencia", "#A97BFF", "#6B3FD8")} Índice por padecimiento <span class="cn-empuja tenue">pesos fisiológicos · ilustrativo</span></h2>
      <div id="ind-barras">${K.barrasIndice(pid, d, { sel: s })}</div>
      <div id="ind-detalle" style="margin-top:12px">${K.detalleIndice(pid, s, d)}</div>
      <p class="cn-nota">Ordena qué mirar primero; no es una probabilidad ni un diagnóstico. ▲ = una variable de peso 3 llegó a 3 puntos (regla tipo NEWS).</p></section>`;
  }
  function sugerencias(pid, d) {
    const L = M.lunaDice(pid, d), x = P(pid);
    const out = L.hallazgos.filter((h) => h.nivel > 0).map((h) => ({ nivel: h.nivel === 2 ? "urgente" : "atencion", texto: `${x.nombre}: ${h.hacer}`, de: h.titulo }));
    const top = K.indices(pid, d).find((i) => i.completo && i.valor > 0);
    if (top) {
      const t = K.tendencia(pid, top.mid, d);
      const mas = top.det.filter((v) => v.puntos).sort((a, b) => b.peso * b.puntos - a.peso * a.puntos)[0];
      out.push({ nivel: "aviso", texto: `${x.nombre}, me gustaría revisar contigo ${top.mal.corto.toLowerCase()}${mas ? `, sobre todo tu ${K.NOMBRE_VAR[mas.v].toLowerCase()}` : ""}. Pasa con la CMO al terminar tu turno.`, de: `Índice ${top.mal.corto} ${fmt(top.valor, 2)} ${K.RUMBO[t.rumbo][0]}` });
    }
    if (!out.length) out.push({ nivel: "aviso", texto: `${x.nombre}, todo en tu normal hoy. Mantén tu rutina de sueño, agua y ejercicio.`, de: "Sin hallazgos" });
    return out;
  }
  function formulario(pid, d) {
    const sug = sugerencias(pid, d);
    return `<form class="cn-form" id="f-int" data-pid="${pid}" novalidate>
      <div class="cn-sugerencias"><span class="cn-etq">Sugerencias de Lunna (preliminares)</span>
        ${sug.map((s, i) => `<div class="cn-sug"><span>${chip(K.NIVEL_MSJ[s.nivel].n, esc(s.de))}<br>${esc(s.texto)}</span><button type="button" class="cn-boton" data-usar="${i}">Usar</button></div>`).join("")}</div>
      <fieldset><legend>Nivel</legend><div class="cn-niveles">${Object.entries(K.NIVEL_MSJ).map(([k, v], i) => `<label class="cn-nivel es-${v.n}"><input type="radio" name="nivel" value="${k}" ${i === 0 ? "checked" : ""}><span>${forma(v.n, 11)}${v.txt}</span></label>`).join("")}</div></fieldset>
      <div class="cn-campo"><label for="msj">Mensaje para ${esc(P(pid).nombre)}</label><textarea id="msj" name="mensaje" class="cn-area" maxlength="500" required placeholder="Escribe el aviso o usa una sugerencia"></textarea></div>
      <div class="cn-niveles"><button type="submit" class="btn" data-destino="abordo">${ic("enviar")} Enviar a ${esc(P(pid).nombre)}</button>
        <button type="submit" class="btn btn-suave" data-destino="bajada">${ic("tierra")} Consultar a Tierra</button></div>
      <p class="cn-estado-envio" role="status" id="estado-envio"></p>
      <p class="cn-nota">«Enviar» le llega al instante a su teléfono como notificación. «Consultar a Tierra» encola un paquete con este texto y su estado; tarda ${K.OWLT_ESCENARIO_MIN} min en llegar (${K.owltSeg()} s en la demo) y otros tantos la respuesta.</p>
    </form>`;
  }
  function conectarFormulario(cont, pid, d, alEnviar) {
    const f = $("#f-int", cont);
    if (!f) return;
    const sug = sugerencias(pid, d);
    $$("[data-usar]", f).forEach((b) => b.addEventListener("click", () => {
      const s = sug[+b.dataset.usar];
      f.querySelector(`input[value="${s.nivel}"]`).checked = true;
      const a = $("#msj", f); a.value = s.texto; a.focus();
    }));
    let destino = "abordo";
    $$("button[type=submit]", f).forEach((b) => b.addEventListener("click", () => { destino = b.dataset.destino; }));
    f.addEventListener("submit", (e) => {
      e.preventDefault();
      const est = $("#estado-envio", f), area = $("#msj", f), texto = area.value.trim();
      const nivel = new FormData(f).get("nivel");
      if (!texto) { est.textContent = "Escribe un mensaje antes de enviar."; est.classList.add("error"); area.focus(); return; }
      est.classList.remove("error");
      const resumen = destino === "bajada" ? ` [Estado ${K.ESTADO_TXT[K.ev(pid, d).general]} · ${K.ev(pid, d).alertas.map((a) => a.id).join(", ") || "sin alertas"} · día ${d}]` : "";
      const m = K.enviarEnlace({ sentido: destino, tipo: destino === "bajada" ? "consulta" : "aviso", nivel, pid, de: AUTOR, texto: texto + resumen, backend: !!K.backend });
      if (K.backend) (destino === "bajada" ? K.consultaBk(m) : K.avisoAbordoBk(m));   // por la central real
      nuevos.add(m.id);
      area.value = "";
      est.textContent = destino === "bajada"
        ? `Consulta encolada hacia Tierra: llega en ${K.segTxt(m.t_llegada - m.t_envio)} (${K.OWLT_ESCENARIO_MIN} min del escenario).`
        : `${K.NIVEL_MSJ[nivel].txt} enviado a ${P(pid).nombre}: le aparece como notificación en su teléfono.`;
      if (alEnviar) alEnviar(m);
    });
  }

  function vistaTripulante(p, pid) {
    K.marcarPestana("hoy");
    const x = P(pid);
    if (!x) { location.hash = "#hoy"; return; }
    const d = K.dia, e = K.ev(pid, d);
    const alertas = e.alertas.map((a) => chip(a.nivel, K.NOMBRE_ALERTA[a.id] || a.id)).join("");
    p.innerHTML = `<header class="cn-hud-cab">
        <a class="cn-boton" href="#hoy">${ic("atras", "ic-sm")}Tripulación</a>
        <span class="avatar grande" style="--c:${x.color}">${x.nombre[0]}</span>
        <div><h1>${esc(x.nombre)}</h1><p class="sub">${x.id} · ${esc(x.rol)} · panel clínico · día ${d}</p></div>
        ${sem(e.general)}<span class="cn-chips">${alertas}</span>
        <a class="cn-boton cn-empuja" href="index.html" id="abrir-tel" title="Abre la app del teléfono como ${esc(x.nombre)}, el mismo día">${ic("telefono", "ic-sm")}Ver su app</a>
      </header>
      <p class="cn-etq cn-separa">${ic("planeta", "ic-sm")} Escenario simulado · día ${d} · no viene del backend</p>
      <div class="cn-hud">
        <section class="tarjeta cn-hud-izq" aria-labelledby="t-vit"><h2 id="t-vit">${pastilla("corazon", "#FF6B8B", "#D93A63")} Signos vitales <span class="cn-empuja tenue">14 días contra su normal</span></h2>
          ${["fc", "hrv", "presion", "spo2", "fr", "temperatura", "glucosa"].map((k) => K.filaVital(pid, k, d)).join("")}</section>
        <div class="cn-hud-centro" id="centro">${K.centroCuerpo(pid, d, "cmo", sel.region, true)}</div>
        <div class="cn-hud-der cn-pila">
          <div class="cn-zona" aria-live="polite"><p class="cn-etq cn-zona-etq">${ic("usuario", "ic-sm")} Zona elegida en el cuerpo</p>
            <div id="region-dest">${K.panelRegion(pid, K.regionElegida(pid, d, sel.region), d, "cmo")}</div></div>
          <section class="tarjeta" aria-labelledby="t-met"><h2 id="t-met">${pastilla("rayo", "#FF9F45", "#E8620C")} Metas y radiación</h2>
            ${K.metasYDosis(pid, d)}</section>
          <div class="cn-privado">${ic("candado")}<span><b>Lo que no ves:</b> el diario y el ciclo solo con su permiso o en una emergencia; del ánimo, la tendencia semanal. Igual que en el teléfono (ERS §6.5).</span></div>
        </div>
      </div>
      <div data-vivo="tripulante" data-id="${esc(K.BACKEND_ID[pid] || "")}" class="cn-bloque"></div>
      <div class="cn-rejilla cn-2b cn-bloque">
        <div class="cn-pila">${tarjetaLunnaPersona(pid, d)}
          <section class="tarjeta" aria-labelledby="t-int"><h2 id="t-int">${pastilla("enviar", "#5B8DFF", "#1F4FD8")} Intervención médica</h2>${formulario(pid, d)}</section></div>
        <div class="cn-pila">${tarjetaIndice(pid, d)}
          <section class="tarjeta" aria-labelledby="t-hp"><h2 id="t-hp">${pastilla("hora", "#7C8AB8", "#4A5680")} Historial de ${esc(x.nombre)}</h2><div id="historial">${listaHistorial(pid)}</div></section></div>
      </div>`;
    K.conectarCuerpo(p, pid, d, "cmo", sel.region);
    $$("#ind-barras [data-ind]", p).forEach((b) => b.addEventListener("click", () => elegirIndice(p, pid, d, +b.dataset.ind)));
    conectarFormulario(p, pid, d, () => { $("#historial", p).innerHTML = listaHistorial(pid); });
    $("#abrir-tel", p).addEventListener("click", () => { K.mem.guardar("persona", pid); K.mem.guardar("dia", d); });
    pintarVivo();
  }
  function elegirIndice(p, pid, d, mid) {
    sel.ind[pid] = mid;
    $("#ind-barras", p).innerHTML = K.barrasIndice(pid, d, { sel: mid });
    $("#ind-detalle", p).innerHTML = K.detalleIndice(pid, mid, d);
    $$("#ind-barras [data-ind]", p).forEach((b) => b.addEventListener("click", () => elegirIndice(p, pid, d, +b.dataset.ind)));
  }

  // ================================================================ vista: estadísticas
  // Misiones de referencia del panel de Fani: nombres FICTICIOS a propósito, para no atribuir eventos
  // médicos inventados a misiones reales.
  const MISIONES_REF = [
    { id: "selene-i", nombre: "Selene I", destino: "Órbita lunar", dias: 21, am: 3, ro: 0, eventos: [], tripulantes: ["A. Navarro", "P. Lindqvist", "R. Adeyemi", "M. Tanaka"], variables: [["Sueño", 1, 2], ["Hidratación", 1, 1]], contramedidas: ["Ajuste del horario de luz en el módulo", "Recordatorios de hidratación"], resumen: "Misión corta sin episodios críticos; avisos leves de adaptación en la primera semana." },
    { id: "selene-ii", nombre: "Selene II", destino: "Superficie lunar", dias: 34, am: 6, ro: 1, eventos: [[19, "Deshidratación durante EVA", "Un tripulante terminó la EVA con signos de deshidratación y pulso elevado sostenido."]], tripulantes: ["C. Duarte", "H. Okonkwo", "S. Petrova", "J. Whitfield"], variables: [["Hidratación", 2, 1], ["Pulso en reposo", 1, 3], ["Sueño", 1, 3]], contramedidas: ["Rehidratación oral y reposo de 24 h", "EVA siguientes acortadas 30 min", "Control de densidad urinaria antes de cada EVA"], resumen: "Un episodio crítico ligado a una EVA larga; se resolvió a bordo." },
    { id: "ares-sim-1", nombre: "Ares Sim 1", destino: "Análogo de tránsito a Marte", dias: 120, am: 14, ro: 3, eventos: [[47, "Exposición a evento solar", "Dosis acumulada por encima de lo esperado en dos tripulantes tras un evento de partículas."], [88, "Insomnio sostenido", "Un tripulante con menos de 4 h de sueño durante 5 noches y ánimo bajo."]], tripulantes: ["L. Castellanos", "D. Iyer", "F. Moreau", "N. Abara"], variables: [["Radiación acumulada", 2, 2], ["Sueño", 2, 1], ["Ánimo", 1, 6], ["Carga ARED", 1, 8]], contramedidas: ["Refugio en la zona blindada durante el evento", "Rotación de turnos y siestas programadas", "Sesiones con el equipo de apoyo psicológico", "Reprogramación de cargas ARED"], resumen: "La misión más larga registrada: más avisos acumulados y dos episodios críticos." },
    { id: "kepler-hab", nombre: "Kepler Hab", destino: "Hábitat análogo", dias: 60, am: 5, ro: 0, eventos: [], tripulantes: ["E. Salgado", "T. Brandt", "Y. Nakamura", "O. Mensah"], variables: [["Carga ARED", 1, 3], ["Ánimo", 1, 2]], contramedidas: ["Ajuste del plan de ejercicio", "Tiempo de comunicación familiar ampliado"], resumen: "Sin episodios críticos; avisos concentrados en ejercicio y ánimo a mitad de misión." },
    { id: "selene-iii", nombre: "Selene III", destino: "Superficie lunar", dias: 45, am: 8, ro: 2, eventos: [[31, "Lesión lumbar en ejercicio", "Dolor de espalda intenso tras una sesión de ARED; limitó la movilidad dos días."]], tripulantes: ["G. Villalobos", "K. Sørensen", "B. Achebe", "I. Yamada"], variables: [["Dolor de espalda", 2, 2], ["Carga ARED", 1, 4], ["Sueño", 1, 4]], contramedidas: ["Reposo relativo y analgesia según protocolo de a bordo", "Reducción temporal de la carga ARED", "Revisión de técnica con el equipo en Tierra"], resumen: "Un episodio crítico musculoesquelético; se recuperó la rutina completa en una semana." },
  ];
  /** La misión en curso, contada con el mismo motor del teléfono (días 106 → hoy). */
  function misionActual() {
    let am = 0, ro = 0;
    const veces = {};
    for (let d = K.DIA_MIN; d <= K.dia; d++) {
      for (const x of K.PERSONAS) {
        const e = K.ev(x.id, d);
        if (e.general === 1) am++; else if (e.general === 2) ro++;
        for (const k of Object.keys(K.IND)) { const n = e.nivelDe(k); if (n) { const v = (veces[k] = veces[k] || { n: 0, max: 0 }); v.n++; v.max = Math.max(v.max, n); } }
      }
    }
    const eventos = [];
    if (K.dia >= 112) eventos.push([112, "FATIGA-03 de Ana (atención)", "Sueño, reflejos y pulso juntos fuera de su normal antes de la caminata espacial; cerrada el día 114."]);
    if (K.dia >= 115) eventos.push([115, "Evento de partículas solares", "Toda la tripulación al refugio blindado; dosis del evento por persona registrada."]);
    return {
      id: K.MISION.id, nombre: K.MISION.nombre, destino: "Tránsito Tierra–Marte", dias: K.dia, enCurso: true, am, ro, eventos,
      tripulantes: K.PERSONAS.map((x) => `${x.nombre} (${x.rol})`),
      variables: Object.entries(veces).sort((a, b) => b[1].n - a[1].n).map(([k, v]) => [K.IND[k].nombre, v.max, v.n]),
      contramedidas: ["Protocolo FAT-01: ventana de sueño de 8,5 h y sin cafeína 6 h antes", "PVT-B de control a las 07:30 antes de la caminata espacial", ...(K.dia >= 115 ? ["Refugio blindado con buddy check"] : []), "Presión de Luis: medir en reposo y comentar con la CMO"],
      resumen: `Misión en curso (simulada), contada con el motor de la app desde el día ${K.DIA_MIN}. Cada aviso es un tripulante-día en atención (■) o actúa ahora (▲).`,
    };
  }
  function vistaEstadisticas(p) {
    K.marcarPestana("estadisticas");
    const actual = misionActual();
    const todas = [actual, ...MISIONES_REF];
    const maximo = Math.max(1, ...todas.map((m) => m.am + m.ro));
    const pct = (n) => `${((n / maximo) * 100).toFixed(1)}%`;
    const dias = []; for (let d = K.DIA_MIN; d <= K.DIA_MAX; d++) dias.push(d);
    const veces = actual.variables.slice(0, 6), vmax = Math.max(1, ...veces.map((v) => v[2]));
    p.innerHTML = `<div class="cn-encabezado"><div><h1>Estadísticas</h1><p class="sub">Misión en curso y ${MISIONES_REF.length} misiones de referencia (ficticias) · datos simulados</p></div></div>
      <div class="cn-rejilla cn-2">
        <section class="tarjeta" aria-labelledby="t-tira"><h2 id="t-tira">${pastilla("calendario", "#5B8DFF", "#1F4FD8")} Estado de la tripulación por día <span class="cn-empuja tenue">${K.MISION.nombre}</span></h2>
          <div class="cn-tabla-caja"><table class="cn-tira"><thead><tr><th></th>${dias.map((d) => `<th class="${d === K.dia ? "hoy" : ""}">${d}</th>`).join("")}</tr></thead>
            <tbody>${K.PERSONAS.map((x) => `<tr><th scope="row">${esc(x.nombre)}</th>${dias.map((d) => d > K.dia ? `<td title="Día ${d}: aún no ocurre" style="opacity:.35"></td>` : (() => { const n = K.ev(x.id, d).general; return `<td class="${d === K.dia ? "hoy" : ""}" title="${esc(x.nombre)} · día ${d}: ${K.ESTADO_TXT[n]}"><span class="sem sem-${K.claseN(n)}">${forma(n, 12)}</span></td>`; })()).join("")}</tr>`).join("")}</tbody></table></div>
          <div class="cn-leyenda">${sem(0, "En su normal")}${sem(1, "Atención")}${sem(2, "Actúa ahora")}<span>· Luis sigue en ■ por su presión (130–139, umbral AHA [T])</span></div></section>
        <section class="tarjeta" aria-labelledby="t-veces"><h2 id="t-veces">${pastilla("grafica", "#33C3B3", "#0E8F86")} Lo que más pidió atención</h2>
          ${veces.length ? `<div class="cn-indices">${veces.map(([n, max, v]) => `<div class="cn-ind" style="cursor:default"><span>${forma(max, 11)}<em>${esc(n)}</em></span><span class="cn-pista"><i style="--v:${(v / vmax).toFixed(3)}"></i></span><span class="num">${v}</span></div>`).join("")}</div>
            <p class="cn-nota" style="margin-top:8px">Tripulante-días con el indicador en atención o más, del día ${K.DIA_MIN} al ${K.dia}.</p>` : K.positivo("check", "Todo en su normal", "Ningún indicador pidió atención en estos días.")}</section>
      </div>
      <section class="tarjeta" style="margin-top:16px" aria-labelledby="t-comp"><h2 id="t-comp">${pastilla("grafica", "#FFC23D", "#E08A00")} Avisos por misión</h2>
        <div class="cn-leyenda" style="margin:-4px 0 10px"><span><i style="display:inline-block;width:12px;height:12px;border-radius:3px;background:var(--ambar);vertical-align:-1px"></i> Atención ■</span><span><i style="display:inline-block;width:12px;height:12px;border-radius:3px;background:var(--rojo);vertical-align:-1px"></i> Actúa ahora ▲</span><span>${forma(2, 11)} = misión con al menos un evento crítico</span></div>
        <ul class="cn-comp">${todas.map((m) => `<li><a href="#mision/${m.id}" title="${esc(m.nombre)}: ${m.am} en atención, ${m.ro} actúa ahora">
          <span class="nombre">${esc(m.nombre)}${m.enCurso ? " <small>en curso</small>" : ""}${m.eventos.some((ev) => !/atención/.test(ev[1])) ? forma(2, 11) : ""}</span>
          <span class="cn-barras" aria-hidden="true">${m.am ? `<i class="am" style="width:${pct(m.am)}"></i>` : ""}${m.ro ? `<i class="ro" style="width:${pct(m.ro)}"></i>` : ""}</span>
          <span class="tot"><b>${m.am}</b> ■ · <b>${m.ro}</b> ▲</span></a></li>`).join("")}</ul>
        <details class="cn-detalles"><summary>Ver los datos en tabla</summary><div class="cn-tabla-caja"><table class="cn-tabla"><thead><tr><th>Misión</th><th>Duración</th><th>Atención</th><th>Actúa ahora</th><th>Eventos</th></tr></thead>
          <tbody>${todas.map((m) => `<tr><th scope="row">${esc(m.nombre)}</th><td>${m.dias} días${m.enCurso ? " hasta hoy" : ""}</td><td class="num">${m.am}</td><td class="num">${m.ro}</td><td class="num">${m.eventos.length}</td></tr>`).join("")}</tbody></table></div></details>
        <p class="cn-nota" style="margin-top:8px">La misión en curso se cuenta con el motor de la app (tripulante-días); las de referencia son las del panel de Fani, con nombres ficticios.</p></section>
      <section style="margin-top:16px" aria-labelledby="t-mis"><h2 id="t-mis" style="font-size:19px;margin:0 0 12px">Misiones</h2>
        <ul class="cn-misiones">${todas.map((m) => `<li><a class="${m.eventos.some((ev) => !/atención/.test(ev[1])) ? "critica" : ""}" href="#mision/${m.id}">
          <span style="display:flex;gap:8px;align-items:center"><b>${esc(m.nombre)}</b><span class="cn-chip ${m.enCurso ? "" : "c-nd"}">${m.enCurso ? "En curso" : "Finalizada"}</span></span>
          <span class="tenue">${esc(m.destino)} · ${m.dias} días${m.enCurso ? " hasta hoy" : ""}</span>
          <span class="cn-cifras"><span><b>${m.am}</b><span>en atención</span></span><span><b>${m.ro}</b><span>actúa ahora</span></span><span><b>${m.eventos.length}</b><span>eventos</span></span></span></a></li>`).join("")}</ul></section>`;
  }
  function vistaMision(p, id) {
    K.marcarPestana("estadisticas");
    const m = id === K.MISION.id ? misionActual() : MISIONES_REF.find((x) => x.id === id);
    if (!m) { location.hash = "#estadisticas"; return; }
    p.innerHTML = `<div class="cn-encabezado"><a class="cn-boton" href="#estadisticas">${ic("atras", "ic-sm")}Estadísticas</a>
        <div><h1>${esc(m.nombre)}</h1><p class="sub">Resumen clínico · ${esc(m.destino)} · datos simulados</p></div><span class="cn-chip cn-empuja ${m.enCurso ? "" : "c-nd"}">${m.enCurso ? "En curso" : "Finalizada"}</span></div>
      <section class="tarjeta"><p>${esc(m.resumen)}</p><div class="cn-cifras" style="margin-top:12px"><div><b>${m.dias}</b><span>${m.enCurso ? "días hasta hoy" : "días de duración"}</span></div><div><b>${m.am}</b><span>avisos en atención ■</span></div><div><b>${m.ro}</b><span>avisos actúa ahora ▲</span></div></div></section>
      <div class="cn-rejilla cn-2b" style="margin-top:16px">
        <section class="tarjeta"><h2>${pastilla("alerta", "#FF6B6B", "#D92D2D")} Eventos</h2>${m.eventos.length ? `<ol class="cn-hist">${m.eventos.map(([d, t, x]) => `<li class="es-${/atención/.test(t) ? 1 : 2}"><div class="meta">${chip(/atención/.test(t) ? 1 : 2, `Día ${d}`)}</div><p><b>${esc(t)}</b></p><p class="det">${esc(x)}</p></li>`).join("")}</ol>` : K.positivo("escudo", "Misión sin eventos críticos", "Nada que lamentar: la tripulación terminó sin episodios graves.")}</section>
        <section class="tarjeta"><h2>${pastilla("equipo", "#5B8DFF", "#1F4FD8")} Tripulantes</h2><div class="cn-chips">${m.tripulantes.map((t) => `<span class="cn-chip c-nd">${esc(t)}</span>`).join("")}</div></section>
        <section class="tarjeta"><h2>${pastilla("grafica", "#33C3B3", "#0E8F86")} Variables que dispararon avisos</h2><div class="cn-tabla-caja"><table class="cn-tabla"><thead><tr><th>Variable</th><th>Nivel máximo</th><th>Veces</th></tr></thead>
          <tbody>${m.variables.map(([n, max, v]) => `<tr><th scope="row">${esc(n)}</th><td>${sem(max)}</td><td class="num">${v}</td></tr>`).join("")}</tbody></table></div></section>
        <section class="tarjeta"><h2>${pastilla("escudo", "#3DD68C", "#119B5A")} Contramedidas aplicadas</h2><ul style="margin:0;padding-left:18px">${m.contramedidas.map((c) => `<li>${esc(c)}</li>`).join("")}</ul></section>
      </div>
      ${m.enCurso ? `<section class="tarjeta" style="margin-top:16px"><h2>${pastilla("hora", "#7C8AB8", "#4A5680")} Advertencias y emergencias de la misión</h2>${listaHistorial(null)}</section>` : ""}`;
  }

  // ================================================================ vista: enlace con Tierra
  function recorrido(m) {
    const e = K.etapa(m);
    const pasos = m.sentido === "bajada" ? ["Encolado", "En camino", "En Tierra", "Acuse"] : ["Redactado", "En camino", "A bordo", "Acuse"];
    return `<div class="cn-recorrido" data-msg="${m.id}" style="--p:${e.p.toFixed(3)}">${pasos.map((t, i) => `<span class="${i <= e.i ? "ya" : ""}">${t}</span>`).join("")}</div>`;
  }
  function msjEnlace(m, opc) {
    const nv = K.NIVEL_MSJ[m.nivel] || K.NIVEL_MSJ.aviso;
    const e = K.etapa(m);
    const estado = m.sentido === "bajada"
      ? (e.i < 2 ? `llega a Tierra en ${K.segTxt(e.faltaLlegada)}` : e.i < 3 ? `en Tierra · acuse en ${K.segTxt(e.faltaAcuse)}` : "Tierra confirmó la recepción")
      : `llegó ${K.horaReal(m.t_llegada)} · tardó ${K.segTxt(m.t_llegada - m.t_envio)}`;
    return `<div class="cn-msj es-${nv.n}${nuevos.has(m.id) ? " nuevo" : ""}">
      <div class="meta">${chip(nv.n, m.sentido === "bajada" ? `Consulta · ${nv.txt}` : `${nv.txt} de Tierra`, m.sentido === "bajada" ? "cohete" : "tierra")}<span>${m.sentido === "bajada" ? "sobre" : "para"} ${esc(nombreDe(m.pid))}</span><span>· ${esc(m.de || "")}</span><span class="cn-empuja" data-estado="${m.id}">${estado}</span></div>
      <p>${esc(m.texto)}</p>${m.sentido === "bajada" ? recorrido(m) : ""}
      ${opc && opc.responder ? `<div class="acciones"><button type="button" class="cn-boton" data-responder="${m.id}">${ic("mensaje", "ic-sm")}Responder a Tierra</button></div>` : ""}
    </div>`;
  }
  function vistaTierra(p) {
    K.marcarPestana("tierra");
    const s = K.owltSeg();
    const paquetes = K.paquetesEscenario();
    const bajadas = K.leerEnlace().filter((m) => m.sentido === "bajada").reverse();
    p.innerHTML = `<div class="cn-encabezado"><div><h1>Enlace con Tierra</h1><p class="sub">Lo que la central manda a la base y lo que llega de ella, con el retraso de la luz</p></div></div>
      <p class="cn-etq cn-separa">${ic("planeta", "ic-sm")} Escenario simulado · cola y mensajes de la CMO en este navegador · no pasan por el backend</p>
      <div class="cn-enlace">
        <div><span>Retraso por trayecto</span><b>${K.OWLT_ESCENARIO_MIN} min</b><span>${K.backend ? `backend: ${s} s` : `demo: ${s} s (×60)`}</span></div>
        <div><span>Ida y vuelta</span><b>${K.OWLT_ESCENARIO_MIN * 2} min</b><span>una pregunta tarda esto en tener respuesta</span></div>
        <div><span>Hacia Tierra</span><b>${paquetes.length + bajadas.length}</b><span>rojos → ámbares → resúmenes</span></div>
        <div><span>Ventana</span><b>${K.backend && !K.backend.abierto ? "Cerrada" : "Abierta"}</b><span>${K.backend ? `backend de Julio v${K.backend.version}` : "enlace simulado en este navegador"}</span></div>
      </div>
      ${K.backend ? "" : `<p class="cn-nota" style="margin:10px 2px 0">Retraso de la demostración: <select class="cn-select" id="owlt" style="width:auto;display:inline-block;padding:4px 8px">${[[6, "6 s (rápido)"], [18, "18 s (×60)"], [60, "60 s"]].map(([v, t]) => `<option value="${v}" ${v === s ? "selected" : ""}>${t}</option>`).join("")}</select> · se comparte con la base en este navegador.</p>`}
      <div class="cn-rejilla cn-2b" style="margin-top:16px">
        <section class="tarjeta" aria-labelledby="t-cola"><h2 id="t-cola">${pastilla("cohete", "#5B8DFF", "#1F4FD8")} Cola hacia Tierra <span class="cn-empuja tenue">prioridad 0 → 3</span></h2>
          <div id="bajadas">${bajadas.map((m) => msjEnlace(m)).join("")}</div>
          ${paquetes.map((x) => `<div class="cola-item">${sem(x.nivel, false)}<span>${esc(x.titulo)}${x.pid ? ` · ${esc(nombreDe(x.pid))}` : ""}<small>SCET D${x.dia} ${x.hora} · prioridad ${x.prio}</small></span><b class="ok">recibido</b></div>`).join("") || `<div class="cn-vacio">Nada en cola.</div>`}
          <p class="cn-nota" style="margin-top:8px">Desde Tierra siempre se ve el pasado: cada paquete lleva la hora en que ocurrió (SCET) y llega ${K.OWLT_ESCENARIO_MIN} min después.</p></section>
        <section class="tarjeta" aria-labelledby="t-rec"><h2 id="t-rec">${pastilla("tierra", "#38D1F0", "#0B8DB8")} Recibido de Tierra</h2>
          <div id="recibidos">${recibidosHtml()}</div></section>
      </div>
      <div data-vivo="tierra" style="margin-top:16px"></div>
      <section class="tarjeta" style="margin-top:16px" aria-labelledby="t-env"><h2 id="t-env">${pastilla("enviar", "#5B8DFF", "#1F4FD8")} Mandar a Tierra</h2>
        <form class="cn-form" id="f-tierra" novalidate>
          <div class="cn-rejilla cn-2b" style="gap:12px">
            <div class="cn-campo"><label for="t-pid">Sobre</label><select id="t-pid" class="cn-select"><option value="">Toda la tripulación</option>${K.PERSONAS.map((x) => `<option value="${x.id}">${esc(x.nombre)} · ${esc(x.rol)}</option>`).join("")}</select></div>
            <fieldset><legend>Nivel</legend><div class="cn-niveles">${Object.entries(K.NIVEL_MSJ).map(([k, v], i) => `<label class="cn-nivel es-${v.n}"><input type="radio" name="nivel" value="${k}" ${i === 0 ? "checked" : ""}><span>${forma(v.n, 11)}${v.txt}</span></label>`).join("")}</div></fieldset>
          </div>
          <div class="cn-campo"><label for="t-msj">Mensaje para el cirujano de vuelo</label><textarea id="t-msj" class="cn-area" maxlength="500" placeholder="Pregunta, alerta o confirmación de una decisión de a bordo"></textarea></div>
          <div class="cn-niveles"><button type="submit" class="btn">${ic("cohete")} Encolar hacia Tierra</button></div>
          <p class="cn-estado-envio" role="status" id="t-estado"></p>
        </form></section>`;
    pintarVivo();
    const selOwlt = $("#owlt", p);
    if (selOwlt) selOwlt.addEventListener("change", () => { try { localStorage.setItem("lunna:owlt", selOwlt.value); } catch { /* sin almacenamiento */ } K.toast({ titulo: `Retraso de la demo: ${selOwlt.value} s por trayecto`, icono: "antena", c1: "#38D1F0", c2: "#0B8DB8", ms: 2500 }); });
    conectarRecibidos(p);
    $("#f-tierra", p).addEventListener("submit", (e) => {
      e.preventDefault();
      const area = $("#t-msj", p), est = $("#t-estado", p), texto = area.value.trim();
      if (!texto) { est.textContent = "Escribe un mensaje antes de encolar."; est.classList.add("error"); area.focus(); return; }
      est.classList.remove("error");
      const pid = $("#t-pid", p).value || null, nivel = new FormData(e.target).get("nivel");
      const m = K.enviarEnlace({ sentido: "bajada", tipo: "consulta", nivel, pid, de: AUTOR, texto, backend: !!K.backend });
      if (K.backend) K.consultaBk(m);
      nuevos.add(m.id); area.value = "";
      est.textContent = `Encolado: llega a Tierra en ${K.segTxt(m.t_llegada - m.t_envio)} (${K.OWLT_ESCENARIO_MIN} min del escenario).`;
      $("#bajadas", p).insertAdjacentHTML("afterbegin", msjEnlace(m));
    });
  }
  function recibidosHtml() {
    const vivos = K.llegados("subida").slice().reverse();
    const notas = K.notasTierra();
    return vivos.map((m) => msjEnlace(m, { responder: true })).join("")
      + notas.map((n) => `<div class="cn-msj es-0"><div class="meta">${chip(0, "Nota de Tierra", "tierra")}<span>para ${esc(nombreDe(n.pid))} · ${esc(n.de)}</span><span class="cn-empuja">${esc(n.llego)}</span></div>
          <p class="cita" style="margin:0">«${esc(n.texto)}»</p><p class="cn-nota">Escrita sobre datos del ${esc(n.sobre)}. ${esc(n.nota)}</p></div>`).join("")
      || `<div class="cn-vacio">Todavía no llega nada de Tierra. Lo que mande la base aparece aquí con su retraso.</div>`;
  }
  function conectarRecibidos(p) {
    $$("[data-responder]", p).forEach((b) => b.addEventListener("click", () => {
      const m = K.leerEnlace().find((x) => x.id === b.dataset.responder);
      if (!m) return;
      if (m.pid) $("#t-pid", p).value = m.pid;
      const a = $("#t-msj", p);
      a.value = `Recibido: «${m.texto.slice(0, 80)}${m.texto.length > 80 ? "…" : ""}». `;
      a.focus(); a.setSelectionRange(a.value.length, a.value.length);
      a.scrollIntoView({ block: "center", behavior: "smooth" });
    }));
  }

  // ================================================================ arranque
  const ir = K.enrutar({ hoy: vistaHoy, tripulante: vistaTripulante, estadisticas: vistaEstadisticas, mision: vistaMision, tierra: vistaTierra }, "hoy");

  // Llega algo de Tierra: aviso flotante y se actualiza lo que se ve, sin borrar lo que se está escribiendo.
  K.alLlegar((m) => {
    if (m.sentido !== "subida") {
      if (m.sentido === "bajada") refrescarEstados();
      return;
    }
    nuevos.add(m.id);
    const nv = K.NIVEL_MSJ[m.nivel] || K.NIVEL_MSJ.aviso;
    K.toast({ titulo: `${nv.txt} de Tierra · ${nombreDe(m.pid)}`, texto: m.texto, icono: nv.n ? "alerta" : "tierra", c1: nv.n === 2 ? "#FF6B6B" : nv.n === 1 ? "#FFC23D" : "#38D1F0", c2: nv.n === 2 ? "#D92D2D" : nv.n === 1 ? "#E08A00" : "#0B8DB8", alerta: nv.n === 2, ms: nv.n === 2 ? 15000 : 8000, alClic: () => { location.hash = "#tierra"; } });
    const rec = $("#recibidos");
    if (rec) { rec.innerHTML = recibidosHtml(); conectarRecibidos(document); }
    const hist = $("#historial");
    if (hist) hist.innerHTML = listaHistorial(location.hash.startsWith("#tripulante/") ? location.hash.split("/")[1] : null);
    if (!document.querySelector("textarea:focus") && (location.hash === "" || location.hash === "#hoy")) ir();
    pintarCuenta();
  });
  function refrescarEstados() {
    for (const el of $$("[data-msg]")) {
      const m = K.leerEnlace().find((x) => x.id === el.dataset.msg);
      if (!m) continue;
      const e = K.etapa(m);
      el.style.setProperty("--p", e.p.toFixed(3));
      $$("span", el).forEach((s, i) => s.classList.toggle("ya", i <= e.i));
      const t = $(`[data-estado="${m.id}"]`);
      if (t) t.textContent = e.i < 2 ? `llega a Tierra en ${K.segTxt(e.faltaLlegada)}` : e.i < 3 ? `en Tierra · acuse en ${K.segTxt(e.faltaAcuse)}` : "Tierra confirmó la recepción";
    }
  }
  function pintarCuenta() { K.cuenta("tierra", location.hash === "#tierra" ? 0 : K.llegados("subida").filter((m) => nuevos.has(m.id)).length); }
  K.alTicEnlace(refrescarEstados);
  window.addEventListener("hashchange", () => { if (location.hash === "#tierra") { nuevos.clear(); pintarCuenta(); } });
  K.alEventoBk("emergencia", (e) => {
    emergenciasReales = [e, ...emergenciasReales.filter((x) => x.id !== e.id)];
    const pid = K.DESDE_BACKEND[e.tripulante];
    if (!e.resultado) K.toast({ titulo: `Emergencia de ${nombreDe(pid)} · ${e.modo}`, texto: e.causa || "", icono: "alerta", c1: "#FF6B6B", c2: "#D92D2D", alerta: true, ms: 15000, alClic: () => { location.hash = `#tripulante/${pid}`; } });
    const hist = $("#historial");
    if (hist) hist.innerHTML = listaHistorial(location.hash.startsWith("#tripulante/") ? location.hash.split("/")[1] : null);
  });
  K.detectarBackend().then(async (hay) => {
    if (!hay) return;
    emergenciasReales = (await K.emergenciasBk()) || [];
    if (!document.querySelector("textarea:focus")) ir();
  });
})();
