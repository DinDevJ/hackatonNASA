/* App LUNA con su asistente Luna · maqueta interactiva. Todo es SIMULADO: no recibe datos reales todavía. */
(function () {
  "use strict";
  const D = window.DATOS;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
  const fmt = (n) => String(n).replace(".", ","); // decimales con coma, como los documentos del equipo
  const ic = (n, c) => `<svg class="ic ${c || ""}" aria-hidden="true"><use href="#i-${n}"/></svg>`;
  const ref = (k) => `<button class="ref ref-${D.REF[k].tipo}" data-ref="${k}" aria-label="Referencia ${D.REF[k].tipo === "A" ? "NASA" : "terrestre"}">${ic(D.REF[k].tipo === "A" ? "escudo" : "info", "ic-sm")}${D.REF[k].tipo === "A" ? "NASA" : "Tierra"}</button>`;

  // ---------- Memoria por persona (solo comodidad; la maqueta funciona sin ella) ----------
  // Modo demo (?demo): no lee ni guarda nada del usuario, no abre tutoriales solo, y el tiempo corre más rápido.
  const DEMO = new URLSearchParams(location.search).has("demo");
  const VEL = DEMO ? 3 : 1;
  const mem = {
    leer(k, d) { if (DEMO) return d; try { const v = localStorage.getItem("eva:" + k); return v === null ? d : JSON.parse(v); } catch { return d; } },
    guardar(k, v) { if (DEMO) return; try { localStorage.setItem("eva:" + k, JSON.stringify(v)); } catch { /* sin almacenamiento */ } },
  };

  // ---------- Estado simulado de la sesión ----------
  const estado = {
    comidas: D.comidasHoy.slice(),
    apetito: 6,
    calidadSueno: 62,
    dolor: 2, zonaDolor: [], cefalea: false, intensidadCefalea: 0, mareo: [],
    animo: null,
    glucometro: [],
    checkins: mem.leer("checkins", 3),
    persona: mem.leer("persona", "MS-2"), // quién se ve en Hoy (simulación)
    dia: 112,
  };
  const M = window.MOTOR, C = window.CUERPO;
  const persona = () => M.PERSONAS.find((x) => x.id === estado.persona) || M.PERSONAS[0];

  // ---------- Avisos ----------
  let avisoT = 0;
  function aviso(texto) {
    const a = $("#aviso");
    a.textContent = texto;
    a.classList.add("ver");
    clearTimeout(avisoT);
    avisoT = setTimeout(() => a.classList.remove("ver"), 2200);
  }

  // ---------- Tutoriales ----------
  const TUTORIALES = {
    bienvenida: [
      { cara: "feliz", acc: "estrella", t: "¡Hola! Soy Luna", x: "Te acompaño en la misión para cuidar tu salud. Casi todo lo mido sola con tu reloj; tú solo me cuentas lo que yo no puedo ver." },
      { cara: "pensando", acc: null, t: "Así leo tus datos", x: "Comparo cada número con <b>tu propio normal</b>, no con el de otra persona. Verde es tu normal; ámbar, que vale la pena mirar." },
      { cara: "tranquila", acc: "corazon", t: "Unos 8 minutos al día", x: "Registrar te da estrellas, no tener números perfectos. Y no diagnostico: si algo preocupa, te sugiero hablar con el médico de a bordo." },
    ],
    corazon: [
      { cara: "amor", acc: "corazon", t: "Tu corazón, en vivo", x: "Tu reloj me manda la frecuencia cardiaca cada segundo por Bluetooth. Si la correa queda floja, descarto esa lectura." },
      { cara: "energia", acc: "corazon", t: "Sesiones de ejercicio", x: "Pulsa <b>Iniciar sesión</b> al subir al CEVIS o a la cinta. Te digo cuánto tiempo pasaste en zona moderada e intensa." },
    ],
    sueno: [
      { cara: "dormida", acc: "luna", t: "Tu sueño, sin hacer nada", x: "El reloj registra cuánto dormiste, cuánto tardaste en dormirte y cuántas veces despertaste." },
      { cara: "pensando", acc: "luna", t: "Deuda de sueño", x: "Si duermes menos que tu normal varias noches, se acumula. En la ISS la media fue de unas 6 horas." },
      { cara: "tranquila", acc: "luna", t: "Un toque al despertar", x: "Mueve el deslizador para decirme cómo te sentiste. Eso no lo puede medir el reloj." },
    ],
    comida: [
      { cara: "rica", acc: "manzana", t: "Registra tu comida", x: "Toca el icono de lo que comiste. Yo sumo calorías, proteína, sodio y calcio." },
      { cara: "pensando", acc: "manzana", t: "Comer de menos es lo más común", x: "En el espacio el apetito baja. Te muestro cuánto te falta para la meta del día." },
    ],
    glucosa: [
      { cara: "tranquila", acc: "gota", t: "Glucosa continua", x: "Un parche en el brazo mide la glucosa cada pocos minutos. El reloj no puede medirla." },
      { cara: "pensando", acc: "gota", t: "Glucómetro de dedo", x: "Si el médico de a bordo te mide con glucómetro, escribe aquí el número. El rango que uso es de la Tierra y lo marco así." },
    ],
    sintomas: [
      { cara: "empatica", acc: "curita", t: "Cuéntame cómo te sientes", x: "Dolor de espalda, dolor de cabeza y mareo son muy comunes en el espacio. Toca y desliza: es rápido." },
      { cara: "tranquila", acc: "curita", t: "No diagnostico", x: "Si algo es fuerte o no mejora, te sugiero avisar al médico de a bordo. Esa decisión es de él." },
    ],
    radiacion: [
      { cara: "radiacion", acc: "sol", t: "Clima espacial", x: "Mi pantalla cambia a un <b>sol</b> cuando hay una tormenta solar. Las partículas del Sol pueden subir tu dosis de radiación." },
      { cara: "alerta", acc: "sol", t: "Si suena el aviso", x: "Sigue el <b>protocolo de refugio</b> de la tripulación. Yo te muestro la dosis estimada y los pasos, uno por pantalla." },
      { cara: "tranquila", acc: "sol", t: "Límites de NASA", x: "NASA limita la dosis a <b>250 mSv por evento</b> solar y a menos de 600 mSv en toda la carrera. Este módulo lo construye el equipo de radiación." },
    ],
    fuerza: [
      { cara: "energia", acc: "pesa", t: "Tu fuerza en el ARED", x: "El equipo de ejercicio me pasa la carga y las repeticiones. Con eso <b>estimo</b> tu fuerza máxima." },
      { cara: "pensando", acc: "pesa", t: "Es una estimación", x: "Uso la fórmula de Epley. Sirve para ver tu tendencia, no reemplaza la prueba real en Tierra." },
    ],
  };

  let tut = { pasos: [], i: 0, luna: null, alCerrar: null };
  function abrirTutorial(clave, alCerrar) {
    const pasos = TUTORIALES[clave];
    if (!pasos) return;
    tut = { pasos, i: 0, luna: null, alCerrar: alCerrar || null };
    const h = $("#tutorial");
    h.hidden = false;
    tut.luna = LUNA.crear($("#tut-luna"), { cara: pasos[0].cara, accesorio: pasos[0].acc, tam: 110 });
    pintarTutorial();
    $("#tut-sig").focus();
  }
  function pintarTutorial() {
    const p = tut.pasos[tut.i];
    tut.luna.poner(p.cara, p.acc);
    $("#tut-titulo").textContent = p.t;
    $("#tut-texto").innerHTML = p.x;
    $("#tut-puntos").innerHTML = tut.pasos.map((_, k) => `<i class="${k === tut.i ? "on" : ""}"></i>`).join("");
    $("#tut-atras").disabled = tut.i === 0;
    $("#tut-sig").textContent = tut.i === tut.pasos.length - 1 ? "¡Entendido!" : "Siguiente";
  }
  function cerrarTutorial() {
    $("#tutorial").hidden = true;
    if (tut.alCerrar) tut.alCerrar();
  }
  $("#tut-sig").addEventListener("click", () => {
    if (tut.i < tut.pasos.length - 1) { tut.i++; pintarTutorial(); } else cerrarTutorial();
  });
  $("#tut-atras").addEventListener("click", () => { if (tut.i > 0) { tut.i--; pintarTutorial(); } });
  $$("[data-cerrar-tut]").forEach((b) => b.addEventListener("click", cerrarTutorial));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("#tutorial").hidden) cerrarTutorial(); });

  function tutorialPrimeraVez(clave) {
    if (DEMO) return;
    const vistos = mem.leer("tutoriales", {});
    if (vistos[clave]) return;
    vistos[clave] = true;
    mem.guardar("tutoriales", vistos);
    setTimeout(() => abrirTutorial(clave), 320);
  }

  // ---------- Navegación ----------
  let limpiar = null;
  function ir(destino) {
    if (limpiar) { limpiar(); limpiar = null; }
    if (destino !== "emergencia") actualizarFase();
    const p = $("#pantalla");
    p.innerHTML = "";
    if (destino.startsWith("ficha-")) PANTALLAS.ficha(p, destino.slice(6));
    else (PANTALLAS[destino] || PANTALLAS.hoy)(p);
    p.scrollTop = 0;
    const raiz = ["hoy", "checkin", "logros", "ayuda"].includes(destino) ? destino : "hoy";
    $$(".menu button").forEach((b) => b.classList.toggle("activo", b.dataset.ir === raiz));
    p.focus({ preventScroll: true });
  }
  $$(".menu button").forEach((b) => b.addEventListener("click", () => ir(b.dataset.ir)));
  $("#sos").addEventListener("click", () => ir("emergencia"));
  document.addEventListener("click", (e) => {
    const r = e.target.closest("[data-ref]");
    if (r) aviso(D.REF[r.dataset.ref].texto);
    const s = e.target.closest("[data-seccion]");
    if (s) ir(s.dataset.seccion);
    const v = e.target.closest("[data-volver]");
    if (v) ir("hoy");
    const t = e.target.closest("[data-tutorial]");
    if (t) abrirTutorial(t.dataset.tutorial);
  });

  function cabecera(titulo, sub, clave, color, icono) {
    return `<div class="cabecera">
      <button class="icono-btn" data-volver aria-label="Volver a Hoy">${ic("atras")}</button>
      <div class="pastilla-ic" style="background:${color.fondo};color:${color.tinta}">${ic(icono)}</div>
      <div><h1>${titulo}</h1><div class="sub">${sub}</div></div>
      <span class="espacio"></span>
      <button class="icono-btn" data-tutorial="${clave}" aria-label="Ver tutorial">${ic("ayuda")}</button>
    </div>`;
  }
  function lunaGlobo(texto) {
    return `<div class="luna-fila"><div class="luna-aqui"></div><div class="globo" aria-live="polite">${texto}</div></div>`;
  }
  const COLOR = {
    corazon: { fondo: "#FFE6F0", tinta: "#D03C7C" },
    sueno: { fondo: "#EEE6FF", tinta: "#6B3FD0" },
    comida: { fondo: "#E3F6EC", tinta: "#17704A" },
    glucosa: { fondo: "#E2F8FC", tinta: "#11638A" },
    sintomas: { fondo: "#FFF3DA", tinta: "#8A5600" },
    fuerza: { fondo: "#F3E6FE", tinta: "#8A2BD0" },
  };

  function anillo(frac, centro) {
    const r = 54, c = 2 * Math.PI * r, f = Math.max(0, Math.min(1, frac));
    return `<div class="anillo"><svg viewBox="0 0 132 132" aria-hidden="true">
      <defs><linearGradient id="grad-anillo" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4FD2E9"/><stop offset="1" stop-color="#B541FA"/></linearGradient></defs>
      <circle class="pista" cx="66" cy="66" r="${r}"/>
      <circle class="progreso" cx="66" cy="66" r="${r}" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - f)}"/>
    </svg><div class="centro">${centro}</div></div>`;
  }

  // ---------- Cálculos simulados ----------
  const sumaComida = () => estado.comidas.reduce((s, id) => {
    const a = D.alimentos.find((x) => x.id === id);
    for (const k of ["kcal", "prot", "carb", "sodio", "calcio", "hierro"]) s[k] += a[k];
    return s;
  }, { kcal: 0, prot: 0, carb: 0, sodio: 0, calcio: 0, hierro: 0 });
  const tiempoEnRango = () => Math.round((D.glucosa.filter((g) => g.mg >= 70 && g.mg <= 180).length / D.glucosa.length) * 100);
  const deuda = () => Math.round((D.sueno.lineaBase - D.sueno.noches.reduce((s, n) => s + n.horas, 0) / 7) * 10) / 10;
  const unoRM = () => Math.round(D.ared[0].carga * (1 + D.ared[0].reps / 30) * 10) / 10;

  // Resumen de las secciones de Hoy: de aquí sale cuántas cosas se alejan de su normal.
  function resumen() {
    const c = sumaComida();
    const s = D.sueno.anoche;
    const tir = tiempoEnRango();
    const xRM = Math.round((unoRM() / D.PERFIL.masaKg) * 100) / 100;
    const sec = [
      { id: "corazon", nombre: "Corazón", icono: "corazon", valor: "68", u: "lpm", ok: true, txt: "En tu normal" },
      { id: "sueno", nombre: "Sueño", icono: "luna", valor: fmt(s.horas), u: "h", ok: s.horas >= 6, txt: s.horas >= 6 ? "Bien" : "Poco" },
      { id: "comida", nombre: "Comida", icono: "manzana", valor: Math.round((c.kcal / D.REF.kcal.meta) * 100), u: "%", ok: c.kcal >= 0.8 * D.REF.kcal.meta, txt: "de la meta" },
      { id: "glucosa", nombre: "Glucosa", icono: "gota", valor: tir, u: "% rango", ok: tir >= 70, txt: "En rango" },
      { id: "sintomas", nombre: "Síntomas", icono: "curita", valor: estado.dolor, u: "/10", ok: estado.dolor < 4, txt: "Dolor de espalda" },
      { id: "fuerza", nombre: "Fuerza", icono: "pesa", valor: fmt(xRM), u: "× peso", ok: xRM >= D.REF.fuerza.min * 0.9, txt: "Estimada" },
    ];
    return sec;
  }
  /** Fase de Luna según los signos: llena si todo está en su normal; mengua con cada alerta. */
  function actualizarFase() {
    // El motor decide el estado; Luna solo lo refleja: llena en verde, menguante en ámbar, casi nueva en rojo.
    const n = M.evaluar(estado.persona, estado.dia).general;
    const alertas = resumen().filter((x) => !x.ok).length;
    LUNA.ponerFase(n === 2 ? 0.12 : n === 1 ? 0.55 : Math.max(0.75, 1 - 0.08 * alertas));
    const d = document.getElementById("dia");
    if (d) d.textContent = estado.dia;
  }


  /** Hoja con una región del cuerpo: sus indicadores, su peligro del HRP y por qué se mide. */
  function abrirRegion(r) {
    const P = persona(), def = M.REGIONES[r], ev = M.evaluar(P.id, estado.dia);
    const previo = document.activeElement;
    const tarjetas = def.ind.map((k) => {
      const e = ev.ind[k], v = valorDe(P.id, k, e), n = ev.nivelDe(k), ind = M.IND[k];
      return `<button class="reg-ind" data-ficha="${ind.seccion && P.id === "MS-2" ? ind.seccion : "ficha-" + k}">
        <span class="fila-sup"><b>${ind.nombre}</b>${sem(n)}</span>
        <span class="v">${v.v}<small>${v.u}</small></span>
        ${etiquetas(k, e)}
        ${grafNormal(P.id, k, estado.dia, true)}
        <span class="ver">¿Por qué se mide esto? →</span>
      </button>`;
    }).join("");
    let extra = "";
    if (def.cabina === "co2") extra += `<div class="reg-meta">${sem(ev.cabina.co2 > 3 ? 1 : 0, false)} CO₂ que respiras (cabina): <b>${fmt(ev.cabina.co2)} mmHg</b> · [A] ≤ 3 promedio de 1 h</div>`;
    if (def.cabina === "radiacion") extra += `<div class="reg-meta">${sem(ev.regiones.radiacion, false)} Tasa de dosis: <b>${ev.cabina.tasa.toLocaleString("es-ES")} µSv/h</b> · [A] diseño &lt; 54<br>Dosis de la misión: <b>${ev.cabina.dosisMision} de 600 mSv</b> [A] · dato simulado</div>`;
    if (def.metas && def.metas.includes("agua")) { const a = M.SERIES[P.id].agua[M.idx(estado.dia)]; extra += `<div class="reg-meta">Agua de hoy: <b>${fmt(a)} L</b> de ${fmt((32 * P.masaKg / 1000).toFixed(1))} L · meta [A] 32 mL/kg</div>`; }
    if (def.metas && def.metas.includes("ejercicio")) { const m = M.SERIES[P.id].ejercicio[M.idx(estado.dia)]; extra += `<div class="reg-meta">Ejercicio de hoy: <b>${m} min</b> de 90 · meta [A] ISS 1,5 h/día (ARED, CEVIS, T2)</div>`; }
    if (def.nota) extra += `<p class="reg-meta">${def.nota}</p>`;
    const nombre = r === "radiacion" ? "Radiación (todo el cuerpo)" : def.nombre;
    const hoja = document.createElement("div");
    hoja.className = "hoja reg-hoja";
    hoja.setAttribute("role", "dialog");
    hoja.setAttribute("aria-modal", "true");
    hoja.setAttribute("aria-label", nombre);
    hoja.innerHTML = `<div class="hoja-fondo" data-cerrar></div>
      <div class="hoja-panel">
        <button class="icono-btn hoja-x" data-cerrar aria-label="Cerrar">${ic("cerrar")}</button>
        <h2>${nombre}</h2>
        <span class="peligro">Peligro del HRP: ${def.peligro}</span>
        ${def.privada ? "" : sem(ev.regiones[r])}
        ${tarjetas}${extra}
        <p class="no-diag">Luna avisa, no diagnostica. Datos simulados.</p>
      </div>`;
    document.body.append(hoja);
    const cerrar = () => { hoja.remove(); document.removeEventListener("keydown", tecla); if (previo && previo.isConnected) previo.focus(); };
    const tecla = (e) => { if (e.key === "Escape") cerrar(); };
    document.addEventListener("keydown", tecla);
    hoja.addEventListener("click", (e) => {
      if (e.target.closest("[data-cerrar]")) return cerrar();
      const f = e.target.closest("[data-ficha]");
      if (f) { cerrar(); ir(f.dataset.ficha); }
    });
    $(".hoja-x", hoja).focus();
  }

  // ---------- Integración del módulo 1: semáforo con forma, tu normal y fichas ----------
  const ESTADO_TXT = { 0: "En tu normal", 1: "Atención", 2: "Actúa ahora", nd: "Sin dato" };
  const claseN = (n) => (n == null ? "nd" : ["ok", "ojo", "alto"][n]);
  /** Semáforo: forma + color + texto (RI-UI-02). */
  function sem(n, txt) {
    const k = claseN(n);
    return `<span class="sem sem-${k}"><svg viewBox="-8 -8 16 16" aria-hidden="true">${C.forma(n, 0, 0, 7)}</svg>${txt === false ? "" : txt || ESTADO_TXT[n == null ? "nd" : n]}</span>`;
  }
  const PROC = { sensor: "medido", calculado: "calculado", estimado: "estimado", manual: "anotado a mano" };
  function etiquetas(k, e) {
    const ind = M.IND[k];
    const t = [];
    if (!ind.sinNormal) t.push(`<span class="etq etq-normal">tu normal</span>`);
    if (ind.abs) t.push(`<span class="ref ref-${ind.abs.tipo}" title="${ind.abs.texto}">${ic(ind.abs.tipo === "A" ? "escudo" : "info", "ic-sm")}${ind.abs.tipo === "A" ? "NASA" : "Tierra"}</span>`);
    if (ind.abs && ind.abs.propuesta) t.push(`<span class="etq etq-prop">propuesta</span>`);
    t.push(`<span class="etq etq-proc ${ind.proc}">${PROC[ind.proc]}</span>`);
    if (e && e.valor == null && e.ultimo) t.push(`<span class="etq etq-proc">del día ${e.ultimo.dia}</span>`);
    return `<div class="etiquetas">${t.join("")}</div>`;
  }
  /** Valor con su unidad; la presión lleva la diastólica y lo estimado su intervalo (RS-07). */
  function valorDe(pid, k, e) {
    const ind = M.IND[k];
    const u = e.valor != null ? e.valor : e.ultimo ? e.ultimo.valor : null;
    if (u == null) return { v: "–", u: ind.unidad };
    if (k === "presion") return { v: `${u}/${M.SERIES[pid].diastolica[M.idx(e.ultimo.dia)]}`, u: "mmHg" };
    if (k === "sueno") return { v: fmt(u.toFixed(1)), u: "h" };
    if (ind.ic) return { v: `≈${u}`, u: `${ind.unidad} (${u - ind.ic}–${u + ind.ic})` };
    return { v: fmt(ind.dec ? u.toFixed(ind.dec) : u), u: ind.unidad };
  }
  /** Serie de 14 días contra la franja de tu normal (RF-01-03). */
  function grafNormal(pid, k, dia, mini) {
    const e = M.estadoIndicador(pid, k, dia);
    const ind = M.IND[k];
    const h = e.historia;
    const vals = h.filter((v) => v != null);
    if (vals.length < 2) return `<div class="tenue-12">Aún no hay suficientes días.</div>`;
    const W = 320, H = mini ? 38 : 120, mi = mini ? 2 : 30, md = 8, ma = 8, mb = mini ? 4 : 18;
    const cand = k === "glucosa" ? [100, 126] : k === "presion" ? [130, 140] : k === "spo2" ? [92] : [];
    const rango = Math.max(...vals) - Math.min(...vals) || 1;
    const lineas = mini ? [] : cand.filter((l) => l <= Math.max(...vals) + rango * 1.5 && l >= Math.min(...vals) - rango * 1.5);
    const ext = [...vals, ...(e.normal ? e.normal.banda : []), ...lineas];
    let lo = Math.min(...ext), hi = Math.max(...ext);
    const pad = (hi - lo) * 0.12 || 1; lo -= pad; hi += pad;
    const x = (i) => mi + (i / Math.max(1, h.length - 1)) * (W - mi - md);
    const y = (v) => ma + (1 - (v - lo) / (hi - lo)) * (H - ma - mb);
    const fuera = (v) => e.normal && (ind.dir === "alto" ? v > e.normal.banda[1] : v < e.normal.banda[0]);
    let d = "";
    const partes = [];
    h.forEach((v, i) => { if (v == null) { if (d) partes.push(d); d = ""; } else d += `${d ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`; });
    if (d) partes.push(d);
    const ult = h.length - 1, hoy = h[ult];
    const nivel = M.evaluar(pid, dia).nivelDe(k);
    const color = ["var(--verde)", "var(--ambar)", "var(--rojo)"][nivel || 0];
    return `<svg class="normal-graf ${mini ? "mini" : ""}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="${ind.nombre}, últimos ${h.length} días contra tu normal">
      ${e.normal ? `<rect class="banda" x="${mi}" width="${W - mi - md}" y="${y(e.normal.banda[1])}" height="${Math.max(1, y(e.normal.banda[0]) - y(e.normal.banda[1]))}" rx="5"/>` : ""}
      ${e.normal && !mini ? `<line class="mediana" x1="${mi}" x2="${W - md}" y1="${y(e.normal.med)}" y2="${y(e.normal.med)}"/>` : ""}
      ${lineas.map((l) => `<line class="umbral" x1="${mi}" x2="${W - md}" y1="${y(l)}" y2="${y(l)}"/><text x="${W - md}" y="${y(l) - 3}" text-anchor="end">${l}</text>`).join("")}
      ${partes.map((pp) => `<path class="trazo" d="${pp}" vector-effect="non-scaling-stroke"/>`).join("")}
      ${h.map((v, i) => (v == null || i === ult ? "" : `<circle class="punto ${fuera(v) ? "fuera" : ""}" cx="${x(i)}" cy="${y(v)}" r="${mini ? 1.8 : 3}"/>`)).join("")}
      ${hoy != null ? `<circle class="hoy" cx="${x(ult)}" cy="${y(hoy)}" r="${mini ? 3.4 : 5.5}" fill="${color}"/>` : ""}
      ${mini ? "" : `<text x="${mi - 4}" y="${y(hi - pad) + 3}" text-anchor="end">${fmt(+(hi - pad).toFixed(ind.dec))}</text><text x="${mi - 4}" y="${y(lo + pad) + 3}" text-anchor="end">${fmt(+(lo + pad).toFixed(ind.dec))}</text>
        <text x="${x(0)}" y="${H - 4}">Día ${dia - ult}</text><text x="${x(ult)}" y="${H - 4}" text-anchor="end">Hoy</text>`}
    </svg>`;
  }
  /** Tarjeta "contra tu normal" que se añade a las pantallas de Leo y a las fichas. */
  function tarjetaNormal(k) {
    const pid = estado.persona, e = M.estadoIndicador(pid, k, estado.dia), ind = M.IND[k];
    const v = valorDe(pid, k, e);
    const nivel = M.evaluar(pid, estado.dia).nivelDe(k);
    return `<div class="tarjeta">
      <h3>${ic(ind.icono || "info")} ${ind.nombre} · ${persona().nombre}</h3>
      <div class="valor-grande"><b>${v.v}</b><span class="u">${v.u}</span>${sem(nivel)}</div>
      ${etiquetas(k, e)}
      ${grafNormal(pid, k, estado.dia)}
      <div class="tenue-12">${e.normal ? `Últimos 14 días · la franja es tu normal (${M.texto(k, e.normal.banda[0])} a ${M.texto(k, e.normal.banda[1])})` : ind.abs ? `Sin tu normal: se compara con el umbral (${ind.abs.texto})` : ""}</div>
    </div>`;
  }

  // ---------- Pantallas ----------
  const PANTALLAS = {
    hoy(p) {
      const sec = resumen();
      const P = persona();
      const ev = M.evaluar(P.id, estado.dia);
      const L = M.lunaDice(P.id, estado.dia);
      const esAna = P.id === "MS-2"; // las secciones detalladas de la maqueta (comida, síntomas, fuerza) son de Ana
      // Mosaico (RF-01-02): los seis del reto siempre visibles, más las secciones de Leo.
      const tile = (id, nombre, icono, color, k, leo) => {
        let valor, u, n, txt;
        if (k) {
          const e = ev.ind[k], vv = valorDe(P.id, k, e);
          valor = vv.v; u = vv.u; n = ev.nivelDe(k);
          txt = ESTADO_TXT[n == null ? "nd" : n];
        } else {
          valor = leo.valor; u = leo.u; n = esAna ? (leo.ok ? 0 : 1) : null; txt = esAna ? leo.txt : "Ver detalle";
        }
        const destino = k && !(M.IND[k].seccion && esAna) ? `ficha-${k}` : id;
        return `<button data-seccion="${destino}" aria-label="${nombre}: ${valor} ${u}, ${ESTADO_TXT[n == null ? "nd" : n]}">
          <div class="fila" style="gap:8px"><div class="pastilla-ic" style="width:32px;height:32px;border-radius:11px;background:${color.fondo};color:${color.tinta}">${ic(icono)}</div><span class="nombre">${nombre}</span></div>
          <div class="valor">${valor}<small>${u}</small></div>
          <span class="estado estado-${claseN(n)}">${sem(n, txt)}</span>
        </button>`;
      };
      const S = Object.fromEntries(sec.map((x) => [x.id, x]));
      const tiles = [
        tile("corazon", "Corazón", "corazon", COLOR.corazon, "fc"),
        tile("sueno", "Sueño", "luna", COLOR.sueno, "sueno"),
        tile("presion", "Presión", "gota", { fondo: "#FFE6F0", tinta: "#B0306A" }, "presion"),
        tile("temperatura", "Temperatura", "fuego", { fondo: "#FFF3DA", tinta: "#8A5600" }, "temperatura"),
        tile("animo", "Ánimo", "chispa", { fondo: "#EEE6FF", tinta: "#6B3FD0" }, "animo"),
        tile("glucosa", "Glucosa", "gota", COLOR.glucosa, "glucosa"),
        tile("comida", "Comida", "manzana", COLOR.comida, null, S.comida),
        tile("sintomas", "Síntomas", "curita", COLOR.sintomas, null, S.sintomas),
        tile("fuerza", "Fuerza", "pesa", COLOR.fuerza, null, S.fuerza),
      ];
      // Lista de regiones: alternativa a la figura, navegable con teclado y lector de pantalla.
      const regs = ["cabeza", "ojos", "corazon", "pulmones", "abdomen", "rinones", "musculos", "piel", "radiacion"];
      if (P.sexo === "M") regs.push("femenina"); // solo a ella y con candado
      const lista = regs.map((r) => {
        const def = M.REGIONES[r], n = def.privada ? null : ev.regiones[r];
        const nombre = r === "radiacion" ? "Radiación" : def.nombre;
        const extra = def.privada ? `<span class="candado" title="Privado: solo tú lo ves">${ic("escudo", "ic-sm")}</span>` : "";
        return `<li><button data-region="${r}" aria-label="${nombre}: ${def.privada ? "privado" : ESTADO_TXT[n == null ? "nd" : n]}"><svg viewBox="-8 -8 16 16" aria-hidden="true">${C.forma(n, 0, 0, 7)}</svg><span class="reg-nombre">${nombre}</span>${extra}</button></li>`;
      }).join("");
      const hall = L.hallazgos.map((h) => `
        <article class="hallazgo n${h.nivel}">
          <div class="hallazgo-cab">${sem(h.nivel, false)}<b>${h.titulo}</b><code>${h.id}</code></div>
          <p>${h.frase}</p>
          <ul>${h.evidencia.map((x) => `<li>${x}</li>`).join("")}</ul>
          <div class="hacer">${ic("check", "ic-sm")}<span>${h.hacer}</span></div>
          <div class="pie">Umbral: ${h.umbral}${h.simulado ? " · dato simulado" : ""}</div>
        </article>`).join("");
      const cab = ev.cabina;
      p.innerHTML = `
        <div class="parche-fila">
          <svg class="parche" viewBox="0 0 64 64" role="img" aria-label="Parche de misión LUNA, Equipo Monarcas">
            <defs><linearGradient id="g-parche" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#192584"/><stop offset="1" stop-color="#8A2BD0"/></linearGradient></defs>
            <circle cx="32" cy="32" r="30" fill="url(#g-parche)" stroke="#4FD2E9" stroke-width="3"/>
            <path d="M37 14a17 17 0 1 0 12 29a14 14 0 0 1-12-29z" fill="#FBF6FF"/>
            <path d="M24 33c-4-6-11-6-11-1 0 4 5 6 11 3m0-2c4-6 11-6 11-1 0 4-5 6-11 3m0-1v8" fill="#FFB547" stroke="#192584" stroke-width="1.2" stroke-linejoin="round"/>
            <path d="M48 18l1 2.4 2.4 1-2.4 1-1 2.4-1-2.4-2.4-1 2.4-1z" fill="#FFD66B"/>
          </svg>
          <div class="parche-txt"><b>LUNA</b><span>Equipo Monarcas · proyecto para NASA Space Apps Challenge 2026</span></div>
        </div>
        <div class="simula" aria-label="Simulación">
          <span class="ref ref-sim">${ic("planeta", "ic-sm")} Simulación</span>
          <select id="sim-persona" aria-label="Ver como">${M.PERSONAS.map((x) => `<option value="${x.id}" ${x.id === P.id ? "selected" : ""}>${x.nombre} · ${x.sexo === "M" ? "mujer" : "hombre"}</option>`).join("")}</select>
          <span class="paso-dia"><button id="dia-menos" aria-label="Día anterior" ${estado.dia <= 106 ? "disabled" : ""}>‹</button><b>Día ${estado.dia}</b><button id="dia-mas" aria-label="Día siguiente" ${estado.dia >= M.ULTIMO_DIA ? "disabled" : ""}>›</button></span>
        </div>
        <div class="cabecera"><div><div class="sub">Buenos días,</div><h1>${P.nombre} ${ic("chispa", "ic-sm")}</h1><div class="sub">${P.rol} · ${P.id}</div></div><span class="espacio"></span>
          <div class="racha" title="Días seguidos registrando">${ic("estrella", "ic-relleno")}<b>${estado.checkins}</b></div></div>
        ${lunaGlobo(L.resumen)}
        <section class="tarjeta luna-ve" aria-label="Lo que Luna ve hoy">
          <h3>${ic("chispa")} Lo que Luna ve hoy</h3>
          ${hall}
          ${L.bien.length ? `<p class="bien">${hall ? "Lo demás va bien: " : "Con tus datos de hoy: "}${L.bien.join("; ")}.</p>` : ""}
          <p class="no-diag">Luna avisa, no diagnostica: cuenta lo que miden tus sensores contra tu normal y qué regla se cumplió.</p>
        </section>
        <button class="clima" data-tutorial="radiacion" aria-label="Clima espacial. Ver qué hacer">
          <div class="luna-clima"></div>
          <div><b>${ic("rayo", "ic-sm")} Clima espacial</b>
            <span>${cab.solar ? `Evento de partículas solares <em>simulado</em>: ${cab.tasa.toLocaleString("es-ES")} µSv/h. Ve al refugio.` : `Sin evento activo · ${cab.tasa} µSv/h · misión ${cab.dosisMision} de 600 mSv.`}
            Modelo: evento real de DONKI del ${M.DONKI.id.slice(0, 10)} (aviso ${M.DONKI.latenciaMin} min después).</span></div>
          ${ic("atras", "ic-sm voltear")}
        </button>
        <section class="tarjeta cuerpo-tarjeta" aria-label="Cuerpo LUNA">
          <h3>${ic("usuario")} Cuerpo LUNA <span class="espacio"></span><span class="tenue-12">Toca una zona</span></h3>
          <div class="cuerpo-lienzo">${C.svg({ sexo: P.sexo, regiones: ev.regiones })}</div>
          <ul class="regiones">${lista}</ul>
        </section>
        <div class="mosaico">${tiles.join("")}</div>
        ${esAna ? "" : `<p class="tenue-12" style="margin:-4px 0 12px">Comida, Síntomas y Fuerza de esta maqueta son datos de ejemplo de Ana.</p>`}
        <button class="btn btn-ancho" data-ir-checkin>${ic("chispa")} Check-in de 1 minuto</button>`;
      LUNA.crear($(".luna-aqui", p), { cara: L.cara, accesorio: L.nivel ? null : "estrella", tam: 88 });
      LUNA.crear($(".luna-clima", p), { cara: "radiacion", tam: 46 });
      $("[data-ir-checkin]", p).addEventListener("click", () => ir("checkin"));
      $("#sim-persona", p).addEventListener("change", (e) => { estado.persona = e.target.value; mem.guardar("persona", estado.persona); ir("hoy"); });
      $("#dia-menos", p).addEventListener("click", () => { estado.dia--; ir("hoy"); });
      $("#dia-mas", p).addEventListener("click", () => { estado.dia++; ir("hoy"); });
      $$("[data-region]", p).forEach((el) => {
        el.addEventListener("click", () => abrirRegion(el.dataset.region));
        if (el.tagName !== "BUTTON") el.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); abrirRegion(el.dataset.region); } });
      });
    },

    /** Ficha de un indicador (M2): valor, tu normal, gráfica, por qué y umbral con fuente. */
    ficha(p, k) {
      const ind = M.IND[k];
      if (!ind) return PANTALLAS.hoy(p);
      const P = persona(), e = M.estadoIndicador(P.id, k, estado.dia);
      const n = M.evaluar(P.id, estado.dia).nivelDe(k);
      const color = { fondo: "#EEE6FF", tinta: "#6B3FD0" };
      const frase = n == null ? "Hoy no tengo este dato."
        : n === 0 ? (e.normal ? `Estás dentro de tu normal: lo habitual para ti es ${M.texto(k, e.normal.med)}.` : "Estás dentro del rango de referencia.")
        : e.motivo === "T" ? "Estás en la zona de atención de un umbral clínico de Tierra, no validado en el espacio."
        : "Esta señal se alejó de tu normal. En Hoy, «Lo que Luna ve» te explica con qué otras señales coincide.";
      p.innerHTML = `${cabecera(ind.corto || ind.nombre, `${PROC[ind.proc][0].toUpperCase() + PROC[ind.proc].slice(1)} · ${ind.varId}`, "bienvenida", color, ind.icono || "info")}
        ${lunaGlobo(frase)}
        ${ind.aviso ? `<div class="aviso-fijo">${ic("info", "ic-sm")}<span>${ind.aviso}</span></div>` : ""}
        ${tarjetaNormal(k)}
        <div class="tarjeta"><dl class="explica">
          <dt>¿Por qué se mide en el espacio?</dt><dd>${ind.porQue}</dd>
          <dt>Cómo se mide</dt><dd>${ind.como}</dd>
          <dt>Qué cambia en vuelo</dt><dd>${ind.espacio}</dd>
          ${ind.abs ? `<dt>Umbral [${ind.abs.tipo}]${ind.abs.propuesta ? " · propuesta del equipo" : ""}</dt><dd>${ind.abs.texto}${ind.abs.url ? ` · <a href="${ind.abs.url}" target="_blank" rel="noreferrer">fuente</a>` : ""}</dd>` : ""}
          ${!ind.sinNormal ? `<dt>Tu normal</dt><dd>Tus 14 días anteriores. Una señal sola pide atención si se aleja 3 veces tu variación habitual; tres señales juntas, desde 2 (regla FATIGA-03).</dd>` : ""}
        </dl></div>`;
      LUNA.crear($(".luna-aqui", p), { cara: n ? "tranquila" : "feliz", tam: 80 });
    },

    corazon(p) {
      p.innerHTML = `${cabecera("Corazón", "Reloj · en vivo", "corazon", COLOR.corazon, "corazon")}
        ${lunaGlobo("Tu corazón late tranquilo. ¿Vamos a entrenar?")}
        ${tarjetaNormal("fc")}
        <div class="tarjeta" style="text-align:center">
          <div class="fila" style="justify-content:center;gap:10px"><span class="latido" id="latido">${ic("corazon", "ic-lg ic-relleno")}</span><span class="bpm" id="bpm">68</span><span class="tenue">lpm</span></div>
          <div class="tenue" id="contacto" style="margin-top:4px">${ic("reloj", "ic-sm")} Sensor en contacto con la piel</div>
          <div class="zonas"><div id="z0" class="on">Ligera</div><div id="z1">Moderada</div><div id="z2">Intensa</div></div>
        </div>
        <div class="tarjeta">
          <h3>${ic("fuego")} Sesión de ejercicio <span class="espacio"></span>${ref("fcmax")}</h3>
          <div class="tenue" id="sesion-txt">Pulsa iniciar cuando subas al CEVIS o a la cinta.</div>
          <div class="barra" style="margin:10px 0"><i id="sesion-barra" style="width:0%"></i></div>
          <button class="btn btn-ancho" id="sesion-btn">${ic("play")} Iniciar sesión</button>
        </div>
        <div class="tarjeta"><h3>${ic("info")} Lo que no veo</h3><div class="tenue">Tu reloj no me manda la variabilidad del corazón (HRV), solo el pulso. No es un error: así funciona este modelo.</div></div>`;
      const luna = LUNA.crear($(".luna-aqui", p), { cara: "latido", accesorio: "corazon", tam: 88 });
      const globo = $(".globo", p);
      let bpm = 68, sesion = null, t = 0;
      const tick = setInterval(() => {
        t++;
        // Sesión simulada: calentamiento → zona moderada → un tramo intenso (FCmáx Tanaka ≈ 183 a los 35 años).
        const objetivo = sesion ? (sesion.t < 15 ? 140 : sesion.t < 30 ? 152 : 172) : 68;
        bpm = Math.round(bpm + (objetivo - bpm) * 0.12 + (Math.random() - 0.5) * 3);
        const suelto = t % 29 === 0;
        $("#bpm", p).textContent = suelto ? "—" : bpm;
        $("#contacto", p).innerHTML = suelto ? `${ic("reloj", "ic-sm")} Correa floja: descarto esta lectura` : `${ic("reloj", "ic-sm")} Sensor en contacto con la piel`;
        $("#latido", p).style.setProperty("--ritmo", (60 / bpm).toFixed(2) + "s");
        const z = bpm > 0.9 * D.FC_MAX ? 2 : bpm > 0.7 * D.FC_MAX ? 1 : 0;
        [0, 1, 2].forEach((k) => $("#z" + k, p).classList.toggle("on", k === z));
        if (sesion && !suelto) {
          sesion.t++; sesion.muestras.push(bpm);
          if (z >= 1) sesion.mod++; if (z === 2) sesion.int++;
          $("#sesion-barra", p).style.width = Math.min(100, (sesion.t / 40) * 100) + "%";
          $("#sesion-txt", p).textContent = `Grabando ${sesion.t} s · ${sesion.mod} s en zona moderada o más`;
          luna.poner(z === 2 ? "alerta" : z === 1 ? "energia" : "feliz");
          globo.innerHTML = z === 2 ? "¡Uf, zona <b>intensa</b>! Respira." : z === 1 ? "¡Así se hace! Zona <b>moderada</b>." : "Calentando…";
        }
      }, 1000 / VEL);
      $("#sesion-btn", p).addEventListener("click", (e) => {
        if (!sesion) {
          sesion = { t: 0, mod: 0, int: 0, muestras: [] };
          e.currentTarget.innerHTML = `${ic("stop")} Terminar sesión`;
          e.currentTarget.classList.add("btn-suave");
        } else {
          const m = sesion.muestras;
          const media = m.length ? Math.round(m.reduce((a, b) => a + b, 0) / m.length) : 0;
          const pct = m.length ? Math.round((sesion.mod / m.length) * 100) : 0;
          $("#sesion-txt", p).innerHTML = `Media <b>${media} lpm</b> · pico <b>${m.length ? Math.max(...m) : 0}</b> · <b>${pct}%</b> en zona moderada o más`;
          sesion = null;
          e.currentTarget.innerHTML = `${ic("play")} Iniciar sesión`;
          e.currentTarget.classList.remove("btn-suave");
          luna.poner("celebra");
          globo.innerHTML = "¡Sesión guardada! Ganaste una <b>estrella</b>.";
          aviso("Sesión guardada (simulada)");
        }
      });
      limpiar = () => clearInterval(tick);
      tutorialPrimeraVez("corazon");
    },

    sueno(p) {
      const s = D.sueno.anoche;
      const d = deuda();
      const cara = s.horas < 6 ? "preocupada" : "dormida";
      p.innerHTML = `${cabecera("Sueño", "Reloj · anoche", "sueno", COLOR.sueno, "luna")}
        ${lunaGlobo(s.horas < 6 ? "Dormiste poquito. ¿Pruebo a recordarte la luz tenue más temprano?" : `Dormiste <b>${fmt(s.horas)} h</b>. Un poco menos que tu normal.`)}
        ${tarjetaNormal("sueno")}
        <div class="tarjeta"><div class="fila">
          ${anillo(s.horas / 8.5, `<div class="grande">${fmt(s.horas)}<small style="font-size:14px"> h</small></div><div class="tenue">de 8,5 h</div>`)}
          <div class="datos-lista">
            <div class="dato">${ic("check")} Eficiencia <b>${s.eficiencia}%</b></div>
            <div class="dato">${ic("reloj")} Tardaste en dormir <b>${s.latencia} min</b></div>
            <div class="dato">${ic("ola")} Despierta <b>${s.waso} min</b></div>
            <div class="dato">${ic("luna")} Despertares <b>${s.despertares}</b></div>
          </div></div></div>
        <div class="tarjeta"><h3>${ic("estrella")} Tu semana <span class="espacio"></span>${ref("sueno")}</h3>
          <div class="barras-semana">${D.sueno.noches.map((n) => `<div><i class="${n.horas < 6 ? "bajo" : ""}" style="height:${(n.horas / 9) * 100}%" title="${fmt(n.horas)} h"></i>${n.dia}</div>`).join("")}</div>
          <div class="tenue" style="margin-top:8px">Deuda de sueño: <b>${d > 0 ? fmt(d) + " h por noche" : "ninguna"}</b> frente a tu normal (${fmt(D.sueno.lineaBase)} h).</div></div>
        <div class="tarjeta"><h3>${ic("chispa")} ¿Cómo te sentiste al despertar?</h3>
          <div class="valor-grande" id="cal-txt">${estado.calidadSueno}</div>
          <input class="deslizador" id="cal" type="range" min="0" max="100" value="${estado.calidadSueno}" aria-label="Calidad del sueño de 0 a 100"/>
          <div class="escala-etq"><span>Muy mal</span><span>Muy bien</span></div></div>`;
      const luna = LUNA.crear($(".luna-aqui", p), { cara, accesorio: "luna", tam: 88 });
      const globo = $(".globo", p);
      $("#cal", p).addEventListener("input", (e) => {
        const v = Number(e.target.value);
        estado.calidadSueno = v;
        $("#cal-txt", p).textContent = v;
        luna.poner(v >= 70 ? "feliz" : v >= 40 ? "tranquila" : "empatica");
        globo.innerHTML = v >= 70 ? "¡Qué bien! Despertaste con <b>energía</b>." : v >= 40 ? "Un descanso regular. Lo anoto." : "Lo siento. Si sigue así, lo hablamos con el médico de a bordo.";
      });
      tutorialPrimeraVez("sueno");
    },

    comida(p) {
      const pintar = () => {
        const c = sumaComida();
        const proteinaKg = Math.round((c.prot / D.PERFIL.masaKg) * 10) / 10;
        const pctSodio = Math.min(100, (c.sodio / 3000) * 100);
        $("#kcal-anillo", p).innerHTML = anillo(c.kcal / D.REF.kcal.meta, `<div class="grande">${c.kcal}</div><div class="tenue">de ${D.REF.kcal.meta} kcal</div>`);
        $("#prot", p).textContent = fmt(proteinaKg) + " g/kg";
        $("#calcio", p).textContent = c.calcio + " mg";
        $("#hierro", p).textContent = fmt(c.hierro.toFixed(1)) + " mg";
        $("#sodio-txt", p).textContent = c.sodio + " mg";
        $("#sodio-barra", p).style.width = pctSodio + "%";
        $("#lista-hoy", p).textContent = estado.comidas.map((id) => D.alimentos.find((a) => a.id === id).nombre).join(" · ") || "Nada todavía";
        return c;
      };
      p.innerHTML = `${cabecera("Comida", "Registro rápido", "comida", COLOR.comida, "manzana")}
        ${lunaGlobo("Toca lo que comiste y yo hago las cuentas.")}
        <div class="tarjeta"><div class="fila"><div id="kcal-anillo"></div>
          <div class="datos-lista">
            <div class="dato">${ic("rayo")} Proteína <b id="prot"></b></div>
            <div class="dato">${ic("hoja")} Calcio <b id="calcio"></b></div>
            <div class="dato">${ic("gota")} Hierro <b id="hierro"></b></div>
            <div>${ref("kcal")}</div>
          </div></div></div>
        <div class="tarjeta"><h3>${ic("sal")} Sodio de hoy <span class="espacio"></span>${ref("sodio")}</h3>
          <div class="barra"><span class="zona" style="left:${(1500 / 3000) * 100}%;width:${(800 / 3000) * 100}%"></span><i id="sodio-barra"></i></div>
          <div class="escala-etq" style="margin-top:4px"><span>0</span><b id="sodio-txt"></b><span>3000 mg</span></div>
          <div class="barra-meta">▮ Zona meta: 1500–2300 mg</div></div>
        <div class="tarjeta"><h3>${ic("mas")} Agregar comida</h3>
          <div class="comida-grid">${D.alimentos.map((a) => `<button data-comida="${a.id}" aria-label="Agregar ${a.nombre}">${ic(a.icono)}${a.nombre}</button>`).join("")}</div>
          <div class="tenue" style="margin-top:10px">Hoy: <span id="lista-hoy"></span></div>
          <div class="tenue" style="margin-top:4px;font-size:11.5px">Valores por porción aproximados para la maqueta.</div></div>
        <div class="tarjeta"><h3>${ic("manzana")} ¿Cuánta hambre tienes?</h3>
          <input class="deslizador" id="apetito" type="range" min="0" max="10" value="${estado.apetito}" aria-label="Apetito de 0 a 10"/>
          <div class="escala-etq"><span>Nada</span><span>Mucha</span></div></div>`;
      const luna = LUNA.crear($(".luna-aqui", p), { cara: "rica", accesorio: "manzana", tam: 88 });
      const globo = $(".globo", p);
      pintar();
      $$("[data-comida]", p).forEach((b) => b.addEventListener("click", () => {
        estado.comidas.push(b.dataset.comida);
        const c = pintar();
        if (c.sodio > D.REF.sodio.max) { luna.poner("preocupada"); globo.innerHTML = "¡Ups! El <b>sodio</b> ya pasó la meta de hoy."; }
        else if (c.kcal >= D.REF.kcal.meta) { luna.poner("celebra"); globo.innerHTML = "¡Meta de energía <b>cumplida</b>!"; }
        else { luna.poner("rica"); globo.innerHTML = `¡Rico! Te faltan <b>${D.REF.kcal.meta - c.kcal} kcal</b>.`; }
        aviso("Agregado: " + D.alimentos.find((a) => a.id === b.dataset.comida).nombre);
      }));
      $("#apetito", p).addEventListener("input", (e) => {
        estado.apetito = Number(e.target.value);
        luna.poner(estado.apetito <= 3 ? "empatica" : "rica");
        globo.innerHTML = estado.apetito <= 3 ? "Poco apetito es muy común aquí arriba. Probemos algo que te guste." : "¡Buen apetito!";
      });
      tutorialPrimeraVez("comida");
    },

    glucosa(p) {
      const g = D.glucosa;
      const w = 320, h = 120, max = 220, min = 50;
      const x = (i) => (i / (g.length - 1)) * w;
      const y = (v) => h - ((v - min) / (max - min)) * h;
      const ruta = g.map((pt, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(pt.mg).toFixed(1)}`).join(" ");
      const tir = tiempoEnRango();
      const media = Math.round(g.reduce((s, v) => s + v.mg, 0) / g.length);
      p.innerHTML = `${cabecera("Glucosa", "Parche CGM · 24 h", "glucosa", COLOR.glucosa, "gota")}
        ${lunaGlobo(`Estuviste en rango el <b>${tir}%</b> del día. ¡Muy estable!`)}
        ${tarjetaNormal("glucosa")}
        <div class="tarjeta"><h3>${ic("gota")} Últimas 24 h <span class="espacio"></span>${ref("glucosa")}</h3>
          <svg class="grafica-glucosa" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-label="Glucosa de las últimas 24 horas, media ${media} mg/dL">
            <rect x="0" y="${y(180)}" width="${w}" height="${y(70) - y(180)}" fill="#E3F6EC"/>
            <path d="${ruta}" fill="none" stroke="#8A2BD0" stroke-width="2.4" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
          </svg>
          <div class="escala-etq"><span>0 h</span><span>Media <b>${media} mg/dL</b></span><span>24 h</span></div></div>
        <div class="tarjeta"><h3>${ic("mas")} Glucómetro de dedo</h3>
          <div class="tenue" style="margin-bottom:8px">Lo mide el médico de a bordo. Escribe el número.</div>
          <div class="campo"><input id="glu" type="number" inputmode="numeric" min="20" max="600" placeholder="mg/dL" aria-label="Glucosa en mg/dL"/><button class="btn" id="glu-btn">Guardar</button></div>
          <div class="tenue" id="glu-lista" style="margin-top:8px"></div></div>`;
      const luna = LUNA.crear($(".luna-aqui", p), { cara: tir >= 70 ? "feliz" : "pensando", accesorio: "gota", tam: 88 });
      const globo = $(".globo", p);
      const input = $("#glu", p);
      input.addEventListener("input", () => {
        const v = Number(input.value);
        void v;
        luna.poner(input.value ? "escaneo" : "tranquila");
      });
      $("#glu-btn", p).addEventListener("click", () => {
        const v = Number(input.value);
        if (!v || v < 20 || v > 600) { luna.poner("pensando"); globo.innerHTML = "Ese número no parece una glucosa. Revísalo, por fa."; return; }
        estado.glucometro.push(v);
        $("#glu-lista", p).innerHTML = "Registradas: " + estado.glucometro.map((n) => `<b>${n}</b>`).join(" · ") + " mg/dL";
        if (v < 70) { luna.poner("alerta"); globo.innerHTML = "Está <b>baja</b>. Avisa al médico de a bordo."; }
        else if (v > 180) { luna.poner("preocupada"); globo.innerHTML = "Está <b>alta</b> para el rango de la Tierra. Lo anoto."; }
        else { luna.poner("feliz"); globo.innerHTML = "¡En rango! Guardado."; }
        input.value = "";
      });
      tutorialPrimeraVez("glucosa");
    },

    sintomas(p) {
      const zonas = [["cuello", "Cuello"], ["dorsal", "Media"], ["lumbar", "Baja"]];
      const mareos = [["nausea", "Náusea"], ["vomito", "Vómito"], ["apetito", "Sin apetito"], ["ninguno", "Nada"]];
      p.innerHTML = `${cabecera("Síntomas", "Tú me cuentas", "sintomas", COLOR.sintomas, "curita")}
        ${lunaGlobo("¿Cómo te sientes hoy? Toca y desliza, es rapidito.")}
        <div class="tarjeta"><h3>${ic("espalda")} Dolor de espalda</h3>
          <div class="valor-grande" id="dolor-txt">${estado.dolor}<small style="font-size:14px">/10</small></div>
          <input class="deslizador" id="dolor" type="range" min="0" max="10" value="${estado.dolor}" aria-label="Dolor de espalda de 0 a 10"/>
          <div class="escala-etq"><span>Nada</span><span>El peor</span></div>
          <div class="chips" style="margin-top:10px">${zonas.map(([k, n]) => `<button class="chip" data-zona="${k}" aria-pressed="${estado.zonaDolor.includes(k)}">${ic("espalda")}${n}</button>`).join("")}</div></div>
        <div class="tarjeta"><h3>${ic("cabeza")} Dolor de cabeza</h3>
          <div class="chips"><button class="chip" id="cef-si" aria-pressed="${estado.cefalea}">${ic("cabeza")}Sí, hoy</button><button class="chip" id="cef-no" aria-pressed="${!estado.cefalea}">${ic("check")}No</button></div>
          <div id="cef-int" ${estado.cefalea ? "" : "hidden"} style="margin-top:10px">
            <input class="deslizador" id="cef" type="range" min="0" max="10" value="${estado.intensidadCefalea}" aria-label="Intensidad del dolor de cabeza"/>
            <div class="escala-etq"><span>Leve</span><span>Insoportable</span></div></div></div>
        <div class="tarjeta"><h3>${ic("ola")} Mareo espacial</h3>
          <div class="chips">${mareos.map(([k, n]) => `<button class="chip" data-mareo="${k}" aria-pressed="${estado.mareo.includes(k)}">${n}</button>`).join("")}</div></div>
        <div id="nota" class="nota-medico" hidden>${ic("info")}<span>Esto parece fuerte. <b>Te sugiero avisar al médico de a bordo.</b> Yo no diagnostico.</span></div>`;
      const luna = LUNA.crear($(".luna-aqui", p), { cara: "tranquila", accesorio: "curita", tam: 88 });
      const globo = $(".globo", p);
      const reaccionar = () => {
        const fuerte = estado.dolor >= 7 || (estado.cefalea && estado.intensidadCefalea >= 7) || estado.mareo.includes("vomito");
        $("#nota", p).hidden = !fuerte;
        const nivel = Math.max(estado.dolor, estado.cefalea ? estado.intensidadCefalea : 0);
        if (fuerte) { luna.poner("empatica"); globo.innerHTML = "Lo siento mucho. Avisemos al <b>médico de a bordo</b>."; }
        else if (nivel >= 4) { luna.poner("preocupada"); globo.innerHTML = "Te duele un poco. Lo anoto para ver si mejora."; }
        else if (estado.mareo.length && !estado.mareo.includes("ninguno")) { luna.poner("empatica"); globo.innerHTML = "El mareo es muy común los primeros días. Aquí estoy."; }
        else { luna.poner("feliz"); globo.innerHTML = "¡Qué bueno! Te sientes bien."; }
      };
      $("#dolor", p).addEventListener("input", (e) => { estado.dolor = Number(e.target.value); $("#dolor-txt", p).innerHTML = `${estado.dolor}<small style="font-size:14px">/10</small>`; reaccionar(); });
      $$("[data-zona]", p).forEach((b) => b.addEventListener("click", () => {
        const k = b.dataset.zona; const i = estado.zonaDolor.indexOf(k);
        i < 0 ? estado.zonaDolor.push(k) : estado.zonaDolor.splice(i, 1);
        b.setAttribute("aria-pressed", String(i < 0));
      }));
      const cef = (si) => {
        estado.cefalea = si;
        $("#cef-si", p).setAttribute("aria-pressed", String(si));
        $("#cef-no", p).setAttribute("aria-pressed", String(!si));
        $("#cef-int", p).hidden = !si;
        reaccionar();
      };
      $("#cef-si", p).addEventListener("click", () => cef(true));
      $("#cef-no", p).addEventListener("click", () => cef(false));
      $("#cef", p).addEventListener("input", (e) => { estado.intensidadCefalea = Number(e.target.value); reaccionar(); });
      $$("[data-mareo]", p).forEach((b) => b.addEventListener("click", () => {
        const k = b.dataset.mareo;
        if (k === "ninguno") estado.mareo = ["ninguno"];
        else { estado.mareo = estado.mareo.filter((x) => x !== "ninguno"); const i = estado.mareo.indexOf(k); i < 0 ? estado.mareo.push(k) : estado.mareo.splice(i, 1); }
        $$("[data-mareo]", p).forEach((c) => c.setAttribute("aria-pressed", String(estado.mareo.includes(c.dataset.mareo))));
        reaccionar();
      }));
      reaccionar();
      tutorialPrimeraVez("sintomas");
    },

    fuerza(p) {
      const rm = unoRM();
      const x = Math.round((rm / D.PERFIL.masaKg) * 100) / 100;
      const ok = x >= D.REF.fuerza.min;
      p.innerHTML = `${cabecera("Fuerza", "ARED · peso muerto", "fuerza", COLOR.fuerza, "pesa")}
        ${lunaGlobo(ok ? "¡Fuerte como siempre! Sigues sobre la meta para caminar en Marte." : `Estás en <b>${fmt(x)}×</b> tu peso; la meta para caminar en Marte es 1,6×. ¡Vamos!`)}
        <div class="tarjeta"><div class="fila">
          ${anillo(x / 2, `<div class="grande">${fmt(x)}×</div><div class="tenue">tu peso</div>`)}
          <div class="datos-lista">
            <div class="dato">${ic("pesa")} Fuerza máx. estimada <b>${fmt(rm)} kg</b></div>
            <div class="dato">${ic("estrella")} Antes del vuelo <b>${fmt(D.unoRMPre)} kg</b></div>
            <div class="dato">${ic("escudo")} Meta <b>1,6×</b></div>
            <div>${ref("fuerza")} <span class="ref ref-sim">${ic("info", "ic-sm")}Estimada</span></div>
          </div></div></div>
        <div class="tarjeta"><h3>${ic("reloj")} Últimas sesiones</h3>
          <div class="lista-sesiones">${D.ared.map((s, i) => `<div>${ic("pesa")} Sesión ${D.ared.length - i}<span class="tenue">${s.series}×${s.reps}</span><b>${fmt(s.carga)} kg</b></div>`).join("")}</div></div>`;
      LUNA.crear($(".luna-aqui", p), { cara: ok ? "celebra" : "energia", accesorio: "pesa", tam: 88 });
      tutorialPrimeraVez("fuerza");
    },

    checkin(p) {
      const animos = [["feliz", "Genial", "estrella"], ["tranquila", "Bien", "check"], ["preocupada", "Regular", "ola"], ["empatica", "Mal", "curita"]];
      p.innerHTML = `<div class="cabecera"><div><h1>Check-in</h1><div class="sub">1 minuto · al despertar</div></div><span class="espacio"></span><span class="ref ref-sim">${ic("reloj", "ic-sm")} 1 min</span></div>
        ${lunaGlobo("¡Hola! ¿Cómo amaneciste hoy?")}
        <div class="tarjeta"><h3>${ic("chispa")} Ánimo</h3>
          <div class="chips">${animos.map(([c, n, i]) => `<button class="chip" data-animo="${c}" aria-pressed="${estado.animo === c}">${ic(i)}${n}</button>`).join("")}</div></div>
        <div class="tarjeta"><h3>${ic("espalda")} Dolor de espalda <span class="espacio"></span><b id="ck-dolor">${estado.dolor}</b></h3>
          <input class="deslizador" id="ck-dolor-in" type="range" min="0" max="10" value="${estado.dolor}" aria-label="Dolor de espalda"/></div>
        <div class="tarjeta"><h3>${ic("cabeza")} ¿Dolor de cabeza?</h3>
          <div class="chips"><button class="chip" data-cef="si" aria-pressed="${estado.cefalea}">Sí</button><button class="chip" data-cef="no" aria-pressed="${!estado.cefalea}">No</button></div></div>
        <button class="btn btn-ancho" id="ck-listo">${ic("check")} Listo</button>`;
      const luna = LUNA.crear($(".luna-aqui", p), { cara: "feliz", accesorio: "estrella", tam: 88 });
      const globo = $(".globo", p);
      $$("[data-animo]", p).forEach((b) => b.addEventListener("click", () => {
        estado.animo = b.dataset.animo;
        $$("[data-animo]", p).forEach((c) => c.setAttribute("aria-pressed", String(c === b)));
        luna.poner(estado.animo);
        globo.innerHTML = { feliz: "¡Me encanta! A darle con todo.", tranquila: "Bien. Un día tranquilo también cuenta.", preocupada: "Te entiendo. Vamos paso a paso.", empatica: "Lo siento. ¿Quieres que lo veamos con el médico de a bordo?" }[estado.animo];
      }));
      $("#ck-dolor-in", p).addEventListener("input", (e) => {
        estado.dolor = Number(e.target.value);
        $("#ck-dolor", p).textContent = estado.dolor;
        luna.poner(estado.dolor >= 7 ? "empatica" : estado.dolor >= 4 ? "preocupada" : "tranquila");
      });
      $$("[data-cef]", p).forEach((b) => b.addEventListener("click", () => {
        estado.cefalea = b.dataset.cef === "si";
        $$("[data-cef]", p).forEach((c) => c.setAttribute("aria-pressed", String(c === b)));
        if (estado.cefalea) { luna.poner("empatica"); globo.innerHTML = "Ay. ¿Cuánto? Puedes detallarlo en <b>Síntomas</b>."; }
      }));
      $("#ck-listo", p).addEventListener("click", () => {
        estado.checkins++;
        mem.guardar("checkins", estado.checkins);
        luna.poner("celebra", "estrella");
        globo.innerHTML = `¡Check-in hecho! Llevas <b>${estado.checkins}</b> días seguidos.`;
        aviso("+1 estrella por registrar");
      });
    },

    emergencia(p) {
      // Modo emergencia (diseño de Julio, comportamiento-del-software.md §8): un paso por pantalla,
      // cronómetro T+, valores contra la línea base, registro sellado automático, aviso al CMO.
      // SIMULACIÓN: caída de signos vitales por hipoxia. Los pasos clínicos son ILUSTRATIVOS.
      const V = D.VITALES, T = D.TRIPULACION;
      const tel = $(".telefono");
      tel.classList.add("en-emergencia");
      p.innerHTML = `
        <div class="emerg-cab">
          <span class="emerg-etq">${ic("info", "ic-sm")} EMERGENCIA · SIMULACIÓN</span>
          <span class="emerg-reloj" id="reloj">T+00:00</span>
        </div>
        <div class="emerg-luna"><div class="luna-aqui"></div>
          <div><b id="emerg-titulo">Signos de ${T.paciente}</b><span id="emerg-sub">Luna vigila los signos en vivo…</span></div></div>
        <div class="vitales" id="vitales">${V.map((v) => `
          <div class="vital" id="v-${v.id}">
            <span class="vital-nom">${ic(v.icono, "ic-sm")} ${v.nombre}</span>
            <b class="vital-val">—</b>
            <span class="vital-base">Su normal: ${fmt(v.base)}${v.extra ? v.extra(v.base) : ""} ${v.unidad}</span>
          </div>`).join("")}</div>
        <div class="paso" id="paso" hidden>
          <span class="paso-num" id="paso-num"></span>
          <p class="paso-txt" id="paso-txt"></p>
          <span class="ref ref-T" id="paso-ilus">${ic("info", "ic-sm")} Ilustrativo: no es protocolo médico</span>
          <button class="btn btn-ancho btn-emerg" id="paso-hecho">${ic("check")} Hecho</button>
        </div>
        <div class="tarjeta registro"><h3>${ic("escudo")} Registro automático</h3><ol id="registro"></ol></div>`;
      const luna = LUNA.crear($(".luna-aqui", p), { cara: "latido", tam: 96, fase: 1 });
      const t0 = Date.now();
      const tiempo = () => {
        const s = Math.floor((Date.now() - t0) / 1000);
        return `T+${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
      };
      const registrar = (txt) => {
        const li = document.createElement("li");
        li.innerHTML = `<b>${tiempo()}</b> ${txt}`;
        $("#registro", p).prepend(li);
      };
      const pintarVitales = (x) => { // x: 0 = su normal · 1 = crisis
        for (const v of V) {
          const val = v.base + (v.crisis - v.base) * x;
          const el = $("#v-" + v.id, p);
          $(".vital-val", el).innerHTML = `${fmt(val.toFixed(v.decimales))}<small>${v.extra ? v.extra(val) : ""} ${v.unidad}</small>`;
          const desvio = Math.abs(v.crisis - v.base) > 0.5 ? x : 0;
          el.classList.toggle("vital-ojo", desvio > 0.35 && desvio <= 0.7);
          el.classList.toggle("vital-mal", desvio > 0.7);
        }
      };
      const relojT = setInterval(() => { $("#reloj", p).textContent = tiempo(); }, 250);
      let anim = 0;
      const animar = (desde, hasta, ms, alPaso) => new Promise((ok) => {
        const ini = performance.now();
        const cuadro = (ahora) => {
          const f = Math.min(1, (ahora - ini) / ms);
          alPaso(desde + (hasta - desde) * f);
          if (f < 1) anim = requestAnimationFrame(cuadro); else ok();
        };
        anim = requestAnimationFrame(cuadro);
      });
      const faseDe = (x) => Math.max(0.03, 1 - x * 0.97); // la luna mengua hasta casi nueva
      let ultimaFase = -1;
      const conFase = (x) => {
        pintarVitales(x);
        const k = Math.round(faseDe(x) * 20) / 20;
        if (k !== ultimaFase) { ultimaFase = k; luna.fase(k); }
      };

      const PASOS = [
        `Mantén a ${T.paciente} en un lugar seguro y no la dejes sola.`,
        "Revisa el oxígeno y el CO₂ de la cabina en el panel de la nave.",
        "Sigue el procedimiento de oxígeno de la tripulación.",
      ];
      let paso = 0;
      const mostrarPaso = () => {
        $("#paso", p).hidden = false;
        $("#paso-num", p).textContent = `Paso ${paso + 1} de ${PASOS.length}`;
        $("#paso-txt", p).textContent = PASOS[paso];
      };

      (async () => {
        conFase(0);
        registrar(`Monitoreo de ${T.paciente}: signos en su normal`);
        await animar(0, 0.55, 3000, conFase);
        luna.poner("alerta");
        $("#emerg-sub", p).textContent = "La saturación de oxígeno está bajando…";
        await animar(0.55, 1, 2600, conFase);
        const fc = V.find((v) => v.id === "fc"), sat = V.find((v) => v.id === "spo2");
        $("#emerg-titulo", p).textContent = "Luna activó el modo emergencia";
        $("#emerg-sub", p).innerHTML = `SpO₂ <b>${sat.crisis} %</b> (su normal ${sat.base} %) · pulso <b>${fmt((fc.crisis / fc.base).toFixed(1))}×</b> su normal`;
        registrar(`<b>Activación automática</b>: SpO₂ ${sat.crisis} % · pulso ${fc.crisis} lpm`);
        registrar(`Aviso enviado a <b>${T.cmo}</b>, médico de a bordo`);
        registrar(`Paquete prioritario a Tierra en cola (≈ ${T.retrasoTierraMin} min de retraso)`);
        luna.poner("empatica");
        mostrarPaso();
      })();

      $("#paso-hecho", p).addEventListener("click", async () => {
        registrar(`Hecho: ${PASOS[paso]}`);
        paso++;
        if (paso < PASOS.length) return mostrarPaso();
        $("#paso", p).hidden = true;
        $("#emerg-titulo", p).textContent = "Los signos se están recuperando";
        $("#emerg-sub", p).textContent = `${T.cmo} ya está con ${T.paciente}. Luna sigue registrando.`;
        luna.poner("tranquila");
        await animar(1, 0.12, 4200, conFase);
        luna.poner("feliz");
        registrar("Signos de vuelta cerca de su normal");
        const cerrar = document.createElement("button");
        cerrar.className = "btn btn-ancho"; cerrar.id = "cerrar-emergencia";
        cerrar.innerHTML = `${ic("check")} Cerrar emergencia`;
        cerrar.addEventListener("click", () => { registrar("Emergencia cerrada"); aviso("Registro sellado y enviado a Tierra (simulado)"); ir("hoy"); });
        $(".registro", p).before(cerrar);
      });

      limpiar = () => { clearInterval(relojT); cancelAnimationFrame(anim); tel.classList.remove("en-emergencia"); };
    },

    logros(p) {
      const insignias = [
        ["Primer check-in", "chispa", true], ["3 días seguidos", "estrella", estado.checkins >= 3], ["Explorador de menú", "manzana", estado.comidas.length >= 6],
        ["Piloto del sueño", "luna", false], ["Maestro de fuerza", "pesa", false], ["Racha de 7 días", "cohete", estado.checkins >= 7],
      ];
      p.innerHTML = `<div class="cabecera"><div><h1>Logros</h1><div class="sub">Premio el hábito, no el resultado</div></div></div>
        ${lunaGlobo(`Llevas <b>${estado.checkins}</b> días registrando. ¡La tripulación suma estrellas contigo!`)}
        <div class="tarjeta"><h3>${ic("trofeo")} Parches de misión</h3>
          <div class="insignias">${insignias.map(([n, i, ok]) => `<div class="insignia ${ok ? "" : "bloqueada"}"><div class="medalla">${ic(i)}</div>${n}</div>`).join("")}</div></div>
        <div class="tarjeta"><h3>${ic("usuario")} Meta de la tripulación</h3>
          <div class="tenue">Entre los cuatro: 20 check-ins esta semana. Nadie ve los números de salud de otro.</div>
          <div class="barra" style="margin-top:10px"><i style="width:65%"></i></div>
          <div class="escala-etq" style="margin-top:4px"><span>13 de 20</span><span>${ic("estrella", "ic-sm ic-relleno")}</span></div></div>`;
      LUNA.crear($(".luna-aqui", p), { cara: "celebra", accesorio: "estrella", tam: 88 });
    },

    ayuda(p) {
      const temas = [["bienvenida", "Conoce a Luna", "luna"], ["corazon", "Corazón y ejercicio", "corazon"], ["sueno", "Sueño", "luna"], ["comida", "Comida", "manzana"], ["glucosa", "Glucosa", "gota"], ["sintomas", "Síntomas", "curita"], ["fuerza", "Fuerza", "pesa"], ["radiacion", "Clima espacial", "rayo"]];
      p.innerHTML = `<div class="cabecera"><div><h1>Ayuda</h1><div class="sub">Tutoriales cortitos</div></div></div>
        ${lunaGlobo("¿Qué quieres aprender? Cada tutorial dura menos de un minuto.")}
        <div class="tarjeta"><div class="lista-sesiones">${temas.map(([k, n, i]) => `<div role="button" tabindex="0" data-tutorial="${k}" style="cursor:pointer">${ic(i)} ${n}<b>${ic("play", "ic-sm")}</b></div>`).join("")}</div></div>
        <div class="tarjeta"><h3>${ic("info")} Qué significan las etiquetas</h3>
          <div class="chips"><span class="ref ref-A">${ic("escudo", "ic-sm")}NASA</span><span class="tenue">umbral oficial de NASA</span></div>
          <div class="chips" style="margin-top:6px"><span class="ref ref-T">${ic("info", "ic-sm")}Tierra</span><span class="tenue">umbral clínico de la Tierra, no validado en el espacio</span></div>
          <div class="chips" style="margin-top:6px"><span class="ref ref-sim">${ic("planeta", "ic-sm")}Simulado</span><span class="tenue">esta maqueta aún no recibe datos reales</span></div></div>
        <a class="btn btn-ancho" href="?demo" style="text-decoration:none;margin-bottom:10px">${ic("play")} Ver demo automática</a>
        <button class="btn btn-suave btn-ancho" id="reiniciar">${ic("chispa")} Volver a ver todos los tutoriales</button>`;
      LUNA.crear($(".luna-aqui", p), { cara: "pensando", accesorio: "estrella", tam: 88 });
      $$("[data-tutorial]", p).forEach((el) => el.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); abrirTutorial(el.dataset.tutorial); } }));
      $("#reiniciar", p).addEventListener("click", () => { mem.guardar("tutoriales", {}); aviso("Los tutoriales volverán a aparecer"); });
    },
  };

  // ---------- Arranque ----------
  // API mínima para el modo demo (demo.js).
  window.APP = { ir, abrirTutorial, cerrarTutorial, DEMO };
  ir("hoy");
  tutorialPrimeraVez("bienvenida");
})();
