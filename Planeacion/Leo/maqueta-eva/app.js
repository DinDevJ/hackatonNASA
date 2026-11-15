/* App LUNNA con su asistente Lunna · maqueta interactiva. Todo es SIMULADO: no recibe datos reales todavía. */
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
    // Katy: estado de los módulos de Registrar, Reportes, Ciclo y Configuración
    tema: mem.leer("tema", "auto"), humor: mem.leer("humor", 2), voz: mem.leer("voz", true),
    registros: [], agua: 0, estres: 35, phq: null, crisis: false, diario: "",
    protocolo: {}, aceptado: false, solar: null, permisos: {}, accesos: [], colaExtra: [], evaluaciones: [], pvtHoy: null,
    ciclo: mem.leer("ciclo", { ultima: "2027-03-04", duracion: 28, sangrado: 5, registro: {} }),
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
      { cara: "feliz", acc: "estrella", t: "¡Hola! Soy Lunna", x: "Te acompaño en la misión para cuidar tu salud. Casi todo lo leo de tus sensores; tú solo me cuentas lo que yo no puedo ver." },
      { cara: "pensando", acc: null, t: "Así leo tus datos", x: "Comparo cada número con <b>tu propio normal</b>, no con el de otra persona. Verde es tu normal; ámbar, que vale la pena mirar." },
      { cara: "tranquila", acc: "corazon", t: "Unos 8 minutos al día", x: "Registrar te da estrellas, no tener números perfectos. Y no diagnostico: si algo preocupa, te sugiero hablar con el médico de a bordo." },
    ],
    corazon: [
      { cara: "amor", acc: "corazon", t: "Tu corazón, en vivo", x: "Tus sensores me mandan la frecuencia cardiaca cada segundo por Bluetooth. Si pierden contacto con la piel, descarto esa lectura." },
      { cara: "energia", acc: "corazon", t: "Sesiones de ejercicio", x: "Pulsa <b>Iniciar sesión</b> al subir al CEVIS o a la cinta. Te digo cuánto tiempo pasaste en zona moderada e intensa." },
    ],
    sueno: [
      { cara: "dormida", acc: "luna", t: "Tu sueño, sin hacer nada", x: "Los sensores registran cuánto dormiste, cuánto tardaste en dormirte y cuántas veces despertaste." },
      { cara: "pensando", acc: "luna", t: "Deuda de sueño", x: "Si duermes menos que tu normal varias noches, se acumula. En la ISS la media fue de unas 6 horas." },
      { cara: "tranquila", acc: "luna", t: "Un toque al despertar", x: "Mueve el deslizador para decirme cómo te sentiste. Eso no lo puede medir ningún sensor." },
    ],
    comida: [
      { cara: "rica", acc: "manzana", t: "Registra tu comida", x: "Toca el icono de lo que comiste. Yo sumo calorías, proteína, sodio y calcio." },
      { cara: "pensando", acc: "manzana", t: "Comer de menos es lo más común", x: "En el espacio el apetito baja. Te muestro cuánto te falta para la meta del día." },
    ],
    glucosa: [
      { cara: "tranquila", acc: "gota", t: "Glucosa continua", x: "Un parche en el brazo mide la glucosa cada pocos minutos. Los sensores de piel no pueden medirla." },
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
    if (DEMO || clave !== "bienvenida") return;
    const vistos = mem.leer("tutoriales", {});
    if (vistos[clave]) return;
    vistos[clave] = true;
    mem.guardar("tutoriales", vistos);
    setTimeout(() => abrirTutorial(clave), 320);
  }

  // ---------- Navegación: barra flotante con 4 módulos (+ Ciclo para ellas) ----------
  // Inicio · Registrar · Ciclo · Reportes · Configuración. Lunna (IA) vive en el botón flotante.
  const TABS = [
    { id: "hoy", t: "Inicio", ic: "casa" },
    { id: "registrar", t: "Registrar", ic: "mas" },
    { id: "ciclo", t: "Ciclo", ic: "flor", soloElla: true },
    { id: "reportes", t: "Reportes", ic: "grafica" },
    { id: "ajustes", t: "Ajustes", ic: "engrane" },
  ];
  // A qué pestaña pertenece cada pantalla (para marcarla y para el botón Volver).
  const RAIZ = {
    hoy: "hoy", equipo: "hoy", pared: "hoy", checkin: "hoy", ficha: "hoy", solar: "hoy",
    registrar: "registrar", comida: "registrar", glucosa: "registrar", sintomas: "registrar", sueno: "registrar", corazon: "registrar",
    fuerza: "registrar", mente: "registrar", form: "registrar",
    ciclo: "ciclo",
    reportes: "reportes", alertas: "reportes", pvt: "reportes", tierra: "reportes", signos: "reportes", radiacion: "reportes", cmo: "reportes", logros: "reportes",
    ajustes: "ajustes", privacidad: "ajustes", lunaconf: "ajustes", ayuda: "ajustes", acerca: "ajustes",
  };
  let limpiar = null, actual = "hoy";
  const raizDe = (d) => RAIZ[d.split(/[:-]/)[0]] || "hoy";
  function pintarMenu() {
    const ella = persona().sexo === "M", raiz = raizDe(actual);
    $("#menu").innerHTML = TABS.filter((t) => !t.soloElla || ella).map((t) => `<button data-tab="${t.id}" class="${t.id === raiz ? "activo" : ""}" aria-current="${t.id === raiz ? "page" : "false"}">${ic(t.ic)}<span>${t.t}</span></button>`).join("");
  }
  function ir(destino) {
    destino = destino || "hoy";
    if (destino === "ciclo" && persona().sexo !== "M") destino = "hoy";
    if (limpiar) { limpiar(); limpiar = null; }
    actual = destino;
    if (destino !== "emergencia") actualizarFase();
    const p = $("#pantalla");
    p.innerHTML = "";
    p.dataset.pantalla = destino.split(/[:-]/)[0];
    const [nombre, arg] = destino.split(":");
    if (destino.startsWith("ficha-")) PANTALLAS.ficha(p, destino.slice(6));
    else (PANTALLAS[nombre] || PANTALLAS.hoy)(p, arg);
    p.scrollTop = 0;
    if (lunaF) lunaF.actualizar(destino);
    pintarMenu();
    if (window.APP && window.APP.alIr) window.APP.alIr(destino);
    p.focus({ preventScroll: true });
  }
  $("#menu").addEventListener("click", (e) => { const b = e.target.closest("[data-tab]"); if (b) ir(b.dataset.tab); });
  $("#sos").addEventListener("click", () => ir("emergencia"));
  document.addEventListener("click", (e) => {
    const r = e.target.closest("[data-ref]");
    if (r) return aviso(D.REF[r.dataset.ref].texto);
    const s = e.target.closest("[data-seccion]");
    if (s) return ir(s.dataset.seccion);
    const a = e.target.closest("[data-ir]");
    if (a) return ir(a.dataset.ir);
    const v = e.target.closest("[data-volver]");
    if (v) return ir(v.dataset.volver || raizDe(actual));
    const t = e.target.closest("[data-tutorial]");
    if (t) abrirTutorial(t.dataset.tutorial);
  });

  function cabecera(titulo, sub, clave, color, icono) {
    return `<div class="cabecera">
      <button class="icono-btn" data-volver aria-label="Volver">${ic("atras")}</button>
      <div class="pastilla-ic" style="--ic1:${color.fondo};--ic2:${color.tinta}">${ic(icono)}</div>
      <div><h1>${titulo}</h1><div class="sub">${sub}</div></div>
      <span class="espacio"></span>
      <button class="icono-btn" data-tutorial="${clave}" aria-label="Ver tutorial">${ic("ayuda")}</button>
    </div>`;
  }
  function lunaGlobo(texto) {
    return `<div class="luna-fila"><div class="luna-aqui"></div><div class="globo" aria-live="polite">${texto}</div></div>`;
  }
  const COLOR = {
    corazon: { fondo: "#FF6B8B", tinta: "#E0245E" },
    sueno: { fondo: "#6C7CFF", tinta: "#3446D4" },
    comida: { fondo: "#3DD68C", tinta: "#119B5A" },
    glucosa: { fondo: "#38D1F0", tinta: "#0B8DB8" },
    sintomas: { fondo: "#FFC23D", tinta: "#E08A00" },
    fuerza: { fondo: "#5B8DFF", tinta: "#1F4FD8" },
  };

  function anillo(frac, centro) {
    const r = 54, c = 2 * Math.PI * r, f = Math.max(0, Math.min(1, frac));
    return `<div class="anillo"><svg viewBox="0 0 132 132" aria-hidden="true">
      <defs><linearGradient id="grad-anillo" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4FD2E9"/><stop offset="1" stop-color="#1E3A8A"/></linearGradient></defs>
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
  /** Fase de Lunna según los signos: llena si todo está en su normal; mengua con cada alerta. */
  function actualizarFase() {
    // El motor decide el estado; Lunna solo lo refleja: llena en verde, menguante en ámbar, casi nueva en rojo.
    const n = M.evaluar(estado.persona, estado.dia).general;
    const alertas = resumen().filter((x) => !x.ok).length;
    LUNA.ponerFase(n === 2 ? 0.12 : n === 1 ? 0.55 : Math.max(0.75, 1 - 0.08 * alertas));
    const d = document.getElementById("dia");
    if (d) d.textContent = estado.dia;
  }


  // ---------- Zoom al órgano y panel tecnológico ----------
  const facil = (t) => 1 - Math.pow(1 - t, 3); // ease-out
  /** Anima el viewBox de la figura hacia `destino` ([x, y, w, h]). */
  function animarVista(svgEl, destino, ms, listo) {
    const desde = svgEl.getAttribute("viewBox").split(/\s+/).map(Number);
    const reducir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducir) { svgEl.setAttribute("viewBox", destino.join(" ")); return listo && listo(); }
    const t0 = performance.now();
    (function paso(t) {
      const k = facil(Math.min(1, (t - t0) / ms));
      svgEl.setAttribute("viewBox", desde.map((a, i) => (a + (destino[i] - a) * k).toFixed(2)).join(" "));
      if (k < 1) requestAnimationFrame(paso); else if (listo) listo();
    })(t0);
  }

  /** Toca un órgano: la figura se acerca a él y la información sale de ahí hasta cubrir la pantalla. */
  function abrirRegion(r) {
    const P = persona(), def = M.REGIONES[r], ev = M.evaluar(P.id, estado.dia);
    const tel = $(".telefono");
    const svgEl = $(".esc-lienzo .cuerpo-svg");
    const previo = document.activeElement;
    const zoom = C.ZOOM[r] || C.VISTA;

    // 1. Foco y acercamiento en la figura de Hoy.
    if (svgEl) {
      svgEl.classList.add("con-foco");
      $$(".org, .halo", svgEl).forEach((el) => el.classList.toggle("activa", el.dataset.region === r));
    }
    const nombre = r === "radiacion" ? "Radiación · todo el cuerpo" : def.nombre;
    const tarjetas = def.ind.map((k) => {
      const e = ev.ind[k], v = valorDe(P.id, k, e), n = ev.nivelDe(k), ind = M.IND[k];
      return `<button class="hud-dato" data-ficha="${ind.seccion && P.id === "MS-2" ? ind.seccion : "ficha-" + k}">
        <span class="fila-sup"><b>${ind.nombre}</b>${sem(n)}</span>
        <span class="v">${v.v}<small>${v.u}</small></span>
        ${etiquetas(k, e)}
        ${grafNormal(P.id, k, estado.dia, true)}
        <span class="ver">Ficha completa · por qué se mide →</span>
      </button>`;
    }).join("");
    let extra = "";
    if (def.cabina === "co2") extra += `<div class="hud-meta">${sem(ev.cabina.co2 > 3 ? 1 : 0, false)} CO₂ que respiras (cabina): <b>${fmt(ev.cabina.co2)} mmHg</b> · [A] ≤ 3 promedio de 1 h</div>`;
    if (def.cabina === "radiacion") extra += `<div class="hud-meta">${sem(ev.regiones.radiacion, false)} Tasa de dosis: <b>${ev.cabina.tasa.toLocaleString("es-ES")} µSv/h</b> · [A] diseño &lt; 54<br>Dosis de la misión: <b>${ev.cabina.dosisMision} de 600 mSv</b> [A] · dato simulado</div>`;
    if (def.metas && def.metas.includes("agua")) { const a = M.SERIES[P.id].agua[M.idx(estado.dia)]; extra += `<div class="hud-meta">Agua de hoy: <b>${fmt(a)} L</b> de ${fmt((32 * P.masaKg / 1000).toFixed(1))} L · meta [A] 32 mL/kg</div>`; }
    if (def.metas && def.metas.includes("ejercicio")) { const m = M.SERIES[P.id].ejercicio[M.idx(estado.dia)]; extra += `<div class="hud-meta">Ejercicio de hoy: <b>${m} min</b> de 90 · meta [A] ISS 1,5 h/día (ARED, CEVIS, T2)</div>`; }
    if (def.nota) extra += `<div class="hud-meta">${def.nota}</div>`;

    const hud = document.createElement("section");
    hud.className = "hud oscuro";
    hud.setAttribute("role", "dialog");
    hud.setAttribute("aria-modal", "true");
    hud.setAttribute("aria-label", nombre);
    hud.innerHTML = `
      <div class="hud-cab"><span class="hud-ruta">Escaneo · ${P.nombre} · día ${estado.dia}</span><span class="espacio"></span>
        <button class="hud-x" data-cerrar aria-label="Cerrar y volver al cuerpo">${ic("cerrar")}</button></div>
      <div class="hud-visor">${C.svg({ sexo: P.sexo, regiones: ev.regiones, activa: r, vista: zoom, marcas: false })}<span class="anillo-hud"></span><span class="esquinas"></span></div>
      <h2>${nombre}</h2>
      <div class="hud-etqs"><span class="hud-peligro">Peligro HRP · ${def.peligro}</span>${def.privada ? `<span class="hud-peligro">Privado · solo tú</span>` : sem(ev.regiones[r])}</div>
      ${tarjetas}${extra}
      <p class="no-diag">LUNNA AVISA, NO DIAGNOSTICA · DATOS SIMULADOS</p>`;

    // 2. El panel nace en el punto del órgano.
    const origen = () => {
      const t = tel.getBoundingClientRect();
      const o = svgEl && $(`[data-region="${r}"]`, svgEl);
      const b = o ? o.getBoundingClientRect() : { left: t.left + t.width / 2, top: t.top + t.height / 2, width: 0, height: 0 };
      hud.style.setProperty("--ox", `${b.left + b.width / 2 - t.left}px`);
      hud.style.setProperty("--oy", `${b.top + b.height / 2 - t.top}px`);
    };
    const abrir = () => {
      origen();
      tel.append(hud);
      requestAnimationFrame(() => requestAnimationFrame(() => hud.classList.add("abierto")));
      $(".hud-x", hud).focus({ preventScroll: true });
    };
    if (svgEl) animarVista(svgEl, zoom, 420, abrir); else abrir();

    const cerrar = (luego) => {
      document.removeEventListener("keydown", tecla);
      origen();
      hud.classList.remove("abierto");
      const fin = () => {
        hud.remove();
        if (svgEl && svgEl.isConnected) {
          animarVista(svgEl, C.VISTA, 360, () => {
            svgEl.classList.remove("con-foco");
            $$(".org, .halo", svgEl).forEach((el) => el.classList.remove("activa"));
          });
        }
        if (luego) luego(); else if (previo && previo.isConnected) previo.focus({ preventScroll: true });
      };
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) fin(); else setTimeout(fin, 420);
    };
    const tecla = (e) => { if (e.key === "Escape") cerrar(); };
    document.addEventListener("keydown", tecla);
    hud.addEventListener("click", (e) => {
      if (e.target.closest("[data-cerrar]")) return cerrar();
      const f = e.target.closest("[data-ficha]");
      if (f) cerrar(() => ir(f.dataset.ficha));
    });
  }

  // ---------- Lunna flotante (como AssistiveTouch) ----------
  /** Burbuja que se arrastra, se pega al borde y, al tocarla, cuenta lo que Lunna ve hoy. */
  function crearLunaFlotante() {
    const tel = $(".telefono");
    const boton = document.createElement("button");
    boton.className = "luna-boton";
    boton.setAttribute("aria-label", "Lunna: lo que ve hoy");
    boton.innerHTML = `<span class="luna-mini"></span><span class="insignia" hidden></span>`;
    tel.append(boton);
    const avatar = LUNA.crear($(".luna-mini", boton), { cara: "tranquila", tam: 46 });

    const MARGEN = 8;
    const limites = () => {
      const t = tel.getBoundingClientRect();
      const arriba = ($(".barra-estado", tel)?.offsetHeight || 40) + 4;
      const abajo = t.height - ($(".menu", tel)?.offsetHeight || 70) - boton.offsetHeight - 26; // la barra flota a 14 px del borde
      return { w: t.width, arriba, abajo };
    };
    let pos = mem.leer("luna-pos3", { lado: "izq", y: 1 });
    const colocar = (animar) => {
      const L = limites();
      const x = pos.lado === "izq" ? MARGEN : L.w - boton.offsetWidth - MARGEN;
      const y = L.arriba + (L.abajo - L.arriba) * Math.min(1, Math.max(0, pos.y));
      boton.style.transition = animar ? "" : "none";
      boton.style.left = `${x}px`;
      boton.style.top = `${y}px`;
      if (!animar) requestAnimationFrame(() => (boton.style.transition = ""));
    };
    requestAnimationFrame(() => colocar(false));
    window.addEventListener("resize", () => colocar(false));

    // Se atenúa cuando nadie la usa, como AssistiveTouch.
    let tQuieta = 0;
    const despertar = () => { boton.classList.remove("quieta"); clearTimeout(tQuieta); tQuieta = setTimeout(() => boton.classList.add("quieta"), 3000); };
    despertar();

    // Arrastrar.
    let arr = null;
    boton.addEventListener("pointerdown", (e) => {
      despertar();
      const b = boton.getBoundingClientRect();
      arr = { id: e.pointerId, dx: e.clientX - b.left, dy: e.clientY - b.top, x0: e.clientX, y0: e.clientY, movio: false };
      boton.setPointerCapture(e.pointerId);
    });
    boton.addEventListener("pointermove", (e) => {
      if (!arr || e.pointerId !== arr.id) return;
      if (!arr.movio && Math.hypot(e.clientX - arr.x0, e.clientY - arr.y0) < 6) return;
      arr.movio = true;
      boton.classList.add("arrastrando");
      const t = tel.getBoundingClientRect();
      boton.style.left = `${e.clientX - t.left - arr.dx}px`;
      boton.style.top = `${e.clientY - t.top - arr.dy}px`;
    });
    const soltar = (e) => {
      if (!arr || e.pointerId !== arr.id) return;
      const movio = arr.movio;
      arr = null;
      boton.classList.remove("arrastrando");
      if (!movio) return;
      const L = limites();
      const b = boton.getBoundingClientRect(), t = tel.getBoundingClientRect();
      const cx = b.left + b.width / 2 - t.left, y = b.top - t.top;
      pos = { lado: cx < L.w / 2 ? "izq" : "der", y: (Math.min(L.abajo, Math.max(L.arriba, y)) - L.arriba) / Math.max(1, L.abajo - L.arriba) };
      mem.guardar("luna-pos3", pos);
      colocar(true);
      boton.dataset.arrastrada = "1";
      setTimeout(() => delete boton.dataset.arrastrada, 50);
    };
    boton.addEventListener("pointerup", soltar);
    boton.addEventListener("pointercancel", soltar);

    // Panel con lo que Lunna ve.
    let panel = null;
    const abrirPanel = () => {
      const P = persona(), L = M.lunaDice(P.id, estado.dia);
      const hall = L.hallazgos.map((h) => `
        <article class="hallazgo n${h.nivel}">
          <div class="hallazgo-cab">${sem(h.nivel, false)}<b>${h.titulo}</b><code>${h.id}</code></div>
          <p>${h.frase}</p>
          <ul>${h.evidencia.map((x) => `<li>${x}</li>`).join("")}</ul>
          <div class="hacer">${ic("check", "ic-sm")}<span>${h.hacer}</span></div>
          <div class="pie">Umbral: ${h.umbral}${h.simulado ? " · dato simulado" : ""}</div>
        </article>`).join("");
      const velo = document.createElement("div");
      velo.className = "luna-velo";
      panel = document.createElement("section");
      panel.className = "luna-panel oscuro";
      panel.setAttribute("role", "dialog");
      panel.setAttribute("aria-modal", "true");
      panel.setAttribute("aria-label", "Lo que Lunna ve hoy");
      // Todo lo de IA vive aquí: lo que ve hoy, cómo monitorea, clima espacial, qué procesa, biblioteca y hablar.
      const SECCIONES = [["hoy", "Hoy"], ["monitoreo", "Cómo te monitorea"], ["clima", "Clima espacial"], ["procesa", "Qué procesa"], ["biblioteca", "Biblioteca"], ["hablar", "Hablar"]];
      const seccionHoy = `${hall}
        ${L.bien.length ? `<p class="bien">${hall ? "Lo demás va bien: " : "Con tus datos de hoy: "}${L.bien.join("; ")}.</p>` : ""}
        <p class="no-diag">LUNNA AVISA, NO DIAGNOSTICA · CUENTA LO QUE MIDEN TUS SENSORES CONTRA TU NORMAL</p>`;
      panel.innerHTML = `
        <div class="luna-panel-cab"><span class="luna-grande"></span><div><div class="t">Lunna · día ${estado.dia}</div><div class="resumen">${L.resumen}</div></div>
          <span class="espacio"></span><button class="hud-x" data-cerrar aria-label="Cerrar">${ic("cerrar")}</button></div>
        <div class="luna-tabs" role="tablist">${SECCIONES.map(([k, t], i) => `<button role="tab" data-sec="${k}" aria-selected="${i === 0}">${t}</button>`).join("")}</div>
        <div class="luna-sec" role="tabpanel">${seccionHoy}</div>`;
      panel.addEventListener("click", (e) => {
        const b = e.target.closest("[data-sec]"); if (!b) return;
        $$("[data-sec]", panel).forEach((x) => x.setAttribute("aria-selected", String(x === b)));
        const cont = $(".luna-sec", panel);
        if (b.dataset.sec === "hoy") cont.innerHTML = seccionHoy;
        else if (window.APP.panelLuna && window.APP.panelLuna[b.dataset.sec]) window.APP.panelLuna[b.dataset.sec](cont);
        cont.scrollTop = 0;
      });
      if (window.APP.alAbrirLuna) setTimeout(() => window.APP.alAbrirLuna(panel), 0);
      const t = tel.getBoundingClientRect(), b = boton.getBoundingClientRect();
      panel.style.setProperty("--ox", `${b.left + b.width / 2 - t.left - 14}px`);
      panel.style.setProperty("--oy", `${b.top + b.height / 2 - t.top - 64}px`);
      tel.append(velo, panel);
      LUNA.crear($(".luna-grande", panel), { cara: L.cara, tam: 54 });
      requestAnimationFrame(() => requestAnimationFrame(() => { velo.classList.add("abierto"); panel.classList.add("abierto"); }));
      boton.hidden = true;
      const cerrar = () => {
        document.removeEventListener("keydown", tecla);
        velo.classList.remove("abierto");
        panel.classList.remove("abierto");
        setTimeout(() => { velo.remove(); panel && panel.remove(); panel = null; boton.hidden = false; boton.focus({ preventScroll: true }); despertar(); }, 260);
      };
      const tecla = (e) => { if (e.key === "Escape") cerrar(); };
      document.addEventListener("keydown", tecla);
      velo.addEventListener("click", cerrar);
      panel.addEventListener("click", (e) => {
        if (e.target.closest("[data-cerrar]")) return cerrar();
        const irA = e.target.closest("[data-ir]"); if (irA) { e.stopPropagation(); cerrar(); ir(irA.dataset.ir); }
      });
      $(".hud-x", panel).focus({ preventScroll: true });
    };
    boton.addEventListener("click", () => { if (!boton.dataset.arrastrada) abrirPanel(); });

    return {
      /** Se llama en cada cambio de pantalla: cara, insignia y visibilidad. */
      actualizar(destino) {
        boton.hidden = destino === "emergencia" || !!panel;
        const L = M.lunaDice(estado.persona, estado.dia);
        const n = L.hallazgos.filter((h) => h.nivel > 0);
        const ins = $(".insignia", boton);
        ins.hidden = !n.length;
        ins.textContent = n.length;
        ins.classList.toggle("n2", n.some((h) => h.nivel === 2));
        avatar.poner(L.cara);
        boton.setAttribute("aria-label", `Lunna: ${n.length ? `${n.length} cosa${n.length > 1 ? "s" : ""} que mirar hoy` : "todo en tu normal"}. Toca para ver lo que ve.`);
        requestAnimationFrame(() => colocar(false));
      },
    };
  }
  let lunaF = null;

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
          <div class="fila" style="gap:8px"><div class="pastilla-ic" style="--ic1:${color.fondo};--ic2:${color.tinta}">${ic(icono)}</div><span class="nombre">${nombre}</span></div>
          <div class="valor">${valor}<small>${u}</small></div>
          <span class="estado estado-${claseN(n)}">${sem(n, txt)}</span>
        </button>`;
      };
      const S = Object.fromEntries(sec.map((x) => [x.id, x]));
      const tiles = [
        tile("corazon", "Corazón", "corazon", COLOR.corazon, "fc"),
        tile("sueno", "Sueño", "luna", COLOR.sueno, "sueno"),
        tile("presion", "Presión", "gota", { fondo: "#FF7A9A", tinta: "#D9365F" }, "presion"),
        tile("temperatura", "Temperatura", "fuego", { fondo: "#FF9F45", tinta: "#E8620C" }, "temperatura"),
        tile("animo", "Ánimo", "chispa", { fondo: "#33C3B3", tinta: "#0E8F86" }, "animo"),
        tile("glucosa", "Glucosa", "gota", COLOR.glucosa, "glucosa"),
        tile("comida", "Comida", "manzana", COLOR.comida, null, S.comida),
        tile("sintomas", "Síntomas", "curita", COLOR.sintomas, null, S.sintomas),
        tile("fuerza", "Fuerza", "pesa", COLOR.fuerza, null, S.fuerza),
      ];
      // Zonas en fila: la misma información que la figura, navegable con teclado.
      const regs = ["cabeza", "corazon", "pulmones", "abdomen", "rinones", "musculos", "piel", "ojos", "radiacion"];
      if (P.sexo === "M") regs.push("femenina"); // solo a ella y con candado
      const chips = regs.map((r) => {
        const def = M.REGIONES[r], n = def.privada ? null : ev.regiones[r];
        const nombre = r === "radiacion" ? "Radiación" : def.nombre;
        return `<li><button data-region="${r}" aria-label="${nombre}: ${def.privada ? "privado" : ESTADO_TXT[n == null ? "nd" : n]}"><svg viewBox="-8 -8 16 16" aria-hidden="true">${C.forma(n, 0, 0, 7)}</svg>${nombre}${def.privada ? ic("escudo", "ic-sm") : ""}</button></li>`;
      }).join("");
      const atencion = Object.values(ev.regiones).filter((n) => n === 1).length;
      const rojas = Object.values(ev.regiones).filter((n) => n === 2).length;
      const cab = ev.cabina;
      const nEstado = rojas ? 2 : atencion ? 1 : 0;
      p.innerHTML = `
        <header class="inicio-cab">
          <div class="inicio-txt"><p>Día ${estado.dia} · Tránsito a Marte</p><h1>Hola, ${P.nombre}</h1></div>
          <button class="yo-btn" id="cambiar-yo" aria-label="Cambiar tripulante o día (ahora: ${P.nombre}, día ${estado.dia})"><span class="avatar" style="--c:${P.color}">${P.nombre[0]}</span></button>
        </header>
        ${window.APP.alertasInicio ? window.APP.alertasInicio(P, ev) : ""}
        <button class="checkin-card" data-ir-checkin><span class="ci-ic">${ic("check")}</span><span class="ci-txt"><b>Check-in de hoy</b><small>20 segundos · ánimo, dolor y cabeza</small></span>${ic("chevron", "ci-flecha")}</button>
        <section class="escaner oscuro" aria-label="Tu cuerpo">
          <div class="esc-cab"><span class="esc-titulo">Tu cuerpo hoy</span><span class="esc-estado">${sem(nEstado, rojas ? `${rojas} actúa ahora` : atencion ? `${atencion} en atención` : "Todo en tu normal")}</span></div>
          <div class="esc-lienzo">${C.svg({ sexo: P.sexo, regiones: ev.regiones })}</div>
          <ul class="esc-regiones" aria-label="Zonas del cuerpo">${chips}</ul>
        </section>
        <div class="seccion-cab"><h2>Datos de tu cuerpo</h2><div class="racha" title="Días seguidos registrando">${ic("estrella", "ic-relleno")}<b>${estado.checkins}</b></div></div>
        <div class="mosaico">${tiles.join("")}</div>
        ${esAna ? "" : `<p class="tenue-12" style="margin:-4px 0 12px">Comida, Síntomas y Fuerza de esta maqueta son datos de ejemplo de Ana.</p>`}
        ${window.APP.tripulacionInicio ? window.APP.tripulacionInicio(P, ev) : ""}
        <div class="parche-fila" style="margin-top:14px">
          <svg class="parche" viewBox="0 0 64 64" role="img" aria-label="Parche de misión LUNNA, Equipo Monarcas">
            <defs><linearGradient id="g-parche" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#192584"/><stop offset="1" stop-color="#2F6FD6"/></linearGradient></defs>
            <circle cx="32" cy="32" r="30" fill="url(#g-parche)" stroke="#4FD2E9" stroke-width="3"/>
            <path d="M37 14a17 17 0 1 0 12 29a14 14 0 0 1-12-29z" fill="#FBF6FF"/>
            <path d="M24 33c-4-6-11-6-11-1 0 4 5 6 11 3m0-2c4-6 11-6 11-1 0 4-5 6-11 3m0-1v8" fill="#FFB547" stroke="#192584" stroke-width="1.2" stroke-linejoin="round"/>
            <path d="M48 18l1 2.4 2.4 1-2.4 1-1 2.4-1-2.4-2.4-1 2.4-1z" fill="#FFD66B"/>
          </svg>
          <div class="parche-txt"><b>LUNNA</b><span>Equipo Monarcas · NASA Space Apps Challenge 2026 · datos simulados, salvo los eventos solares de NASA DONKI</span></div>
        </div>`;
      $("[data-ir-checkin]", p).addEventListener("click", () => ir("checkin"));
      $("#cambiar-yo", p).addEventListener("click", () => window.APP.abrirCambio && window.APP.abrirCambio());
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
      const color = { fondo: "#5B8DFF", tinta: "#1F4FD8" };
      const frase = n == null ? "Hoy no tengo este dato."
        : n === 0 ? (e.normal ? `Estás dentro de tu normal: lo habitual para ti es ${M.texto(k, e.normal.med)}.` : "Estás dentro del rango de referencia.")
        : e.motivo === "T" ? "Estás en la zona de atención de un umbral clínico de Tierra, no validado en el espacio."
        : "Esta señal se alejó de tu normal. En Hoy, «Lo que Lunna ve» te explica con qué otras señales coincide.";
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
      p.innerHTML = `${cabecera("Corazón", "Sensores · en vivo", "corazon", COLOR.corazon, "corazon")}
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
        <div class="tarjeta"><h3>${ic("info")} Pulso en vivo y en reposo</h3><div class="tenue">El número grande es tu pulso de este momento. El de reposo, el que compara con tu normal, sale de la noche: la mediana de los 30 minutos más bajos durante el sueño.</div></div>`;
      const luna = LUNA.crear($(".luna-aqui", p), { cara: "latido", accesorio: "corazon", tam: 88 });
      const globo = $(".globo", p);
      const fcBase = M.estadoIndicador(estado.persona, "fc", estado.dia).valor || 62;
      let bpm = fcBase + 6, sesion = null, t = 0;
      const tick = setInterval(() => {
        t++;
        // Sesión simulada: calentamiento → zona moderada → un tramo intenso (FCmáx Tanaka ≈ 183 a los 35 años).
        const objetivo = sesion ? (sesion.t < 15 ? 140 : sesion.t < 30 ? 152 : 172) : fcBase + 6;
        bpm = Math.round(bpm + (objetivo - bpm) * 0.12 + (Math.random() - 0.5) * 3);
        const suelto = t % 29 === 0;
        $("#bpm", p).textContent = suelto ? "—" : bpm;
        $("#contacto", p).innerHTML = suelto ? `${ic("reloj", "ic-sm")} Sensor sin contacto: descarto esta lectura` : `${ic("reloj", "ic-sm")} Sensor en contacto con la piel`;
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
      const eS = M.estadoIndicador(estado.persona, "sueno", estado.dia), serieS = M.SERIES[estado.persona].sueno, iS = M.idx(estado.dia);
      const s = Object.assign({}, D.sueno.anoche, { horas: eS.valor != null ? eS.valor : D.sueno.anoche.horas });
      const semanaS = serieS.slice(iS - 6, iS + 1);
      const d = eS.normal ? Math.round((eS.normal.med - semanaS.reduce((x, y) => x + y, 0) / semanaS.length) * 10) / 10 : deuda();
      const cara = s.horas < 6 ? "preocupada" : "dormida";
      p.innerHTML = `${cabecera("Sueño", "Sensores · anoche", "sueno", COLOR.sueno, "luna")}
        ${lunaGlobo(s.horas < 6 ? "Dormiste poquito. ¿Pruebo a recordarte la luz tenue más temprano?" : (eS.normal && s.horas < eS.normal.med ? `Dormiste <b>${fmt(s.horas)} h</b>, menos que tu normal (${fmt(eS.normal.med.toFixed(1))} h).` : `Dormiste <b>${fmt(s.horas)} h</b>, dentro de tu normal.`))}
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
          <div class="barras-semana">${semanaS.map((h, k) => `<div><i class="${h < 6 ? "bajo" : ""}" style="height:${(h / 9) * 100}%" title="${fmt(h)} h"></i>${estado.dia - 6 + k}</div>`).join("")}</div>
          <div class="tenue" style="margin-top:8px">Deuda de sueño: <b>${d > 0 ? fmt(d) + " h por noche" : "ninguna"}</b> frente a tu normal (${eS.normal ? fmt(eS.normal.med.toFixed(1)) : fmt(D.sueno.lineaBase)} h).</div></div>
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
            <path d="${ruta}" fill="none" stroke="#2F6FD6" stroke-width="2.4" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
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
      p.innerHTML = `<div class="ck">
        <button class="icono-btn ck-volver" data-volver="hoy" aria-label="Volver">${ic("atras")}</button>
        <header class="ck-cab"><span class="ck-ic">${ic("chispa")}</span><h1>Check-in</h1><p>20 segundos · al despertar</p></header>
        ${lunaGlobo("¡Hola! ¿Cómo amaneciste hoy?")}
        <section class="tarjeta ck-bloque"><h2>¿Cómo amaneciste?</h2>
          <div class="ck-animo">${animos.map(([c, n, i], k) => `<button class="ck-op ck-op${k}" data-animo="${c}" aria-pressed="${estado.animo === c}"><span>${ic(i)}</span><small>${n}</small></button>`).join("")}</div></section>
        <section class="tarjeta ck-bloque"><h2>Dolor de espalda</h2>
          <div class="ck-num"><b id="ck-dolor">${estado.dolor}</b><small>/10</small></div>
          <input class="deslizador" id="ck-dolor-in" type="range" min="0" max="10" value="${estado.dolor}" aria-label="Dolor de espalda de 0 a 10"/>
          <div class="escala-etq"><span>Nada</span><span>El peor</span></div></section>
        <section class="tarjeta ck-bloque"><h2>¿Dolor de cabeza?</h2>
          <div class="ck-sino"><button data-cef="si" aria-pressed="${estado.cefalea}">Sí</button><button data-cef="no" aria-pressed="${!estado.cefalea}">No</button></div></section>
        <button class="btn btn-ancho" id="ck-listo">${ic("check")} Listo</button></div>`;
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

    emergencia(p, pid) {
      // Modo emergencia (diseño de Julio, comportamiento-del-software.md §8): un paso por pantalla,
      // cronómetro T+, valores contra la línea base, registro sellado automático, aviso a la CMO.
      // SIMULACIÓN: caída de signos vitales por hipoxia. Los pasos clínicos son ILUSTRATIVOS.
      // La paciente es quien presiona SOS, salvo que elija a otra persona (ERS RF-03).
      const P = M.PERSONAS.find((x) => x.id === pid) || persona();
      const CMO = M.PERSONAS.find((x) => x.id === "MS-3");
      const COM = M.PERSONAS.find((x) => x.id === "MS-1");
      const esCMO = P.id === CMO.id;
      const ella = P.sexo === "M";
      const la = ella ? "la" : "lo", sola = ella ? "sola" : "solo";
      // Su normal sale del motor (mediana de 14 días); la crisis es la del escenario de hipoxia.
      const med = (k, def) => { const n = M.estadoIndicador(P.id, k, estado.dia).normal; return n ? Math.round(n.med) : def; };
      const serie = (k) => { const s = M.SERIES[P.id][k].slice(0, M.idx(estado.dia)).filter((x) => x != null).slice(-14); return s.length ? Math.round(M.mediana(s)) : null; };
      const fcB = med("fc", 60), spoB = serie("spo2") || 97, frB = med("fr", 14), pasB = serie("presion") || 116;
      const V = [
        { id: "spo2", nombre: "SpO₂", unidad: "%", base: spoB, crisis: 84, icono: "gota", decimales: 0 },
        { id: "fc", nombre: "Pulso", unidad: "lpm", base: fcB, crisis: Math.round(fcB * 2.06), icono: "corazon", decimales: 0 },
        { id: "resp", nombre: "Respiración", unidad: "rpm", base: frB, crisis: 26, icono: "ola", decimales: 0 },
        { id: "pas", nombre: "Presión", unidad: "mmHg", base: pasB, crisis: pasB - 22, icono: "rayo", decimales: 0, extra: (v) => `/${Math.round(v * 0.64)}` },
        { id: "temp", nombre: "Temperatura", unidad: "°C", base: 36.6, crisis: 36.8, icono: "fuego", decimales: 1 },
      ];
      const T = D.TRIPULACION;
      const tel = $(".telefono");
      tel.classList.add("en-emergencia");
      p.innerHTML = `
        <div class="emerg-cab">
          <span class="emerg-etq">${ic("info", "ic-sm")} EMERGENCIA · SIMULACIÓN</span>
          <span class="emerg-reloj" id="reloj">T+00:00</span>
        </div>
        <div class="emerg-quien" id="emerg-quien">
          <span>Paciente: <b>${P.nombre}</b></span>
          <details class="emerg-otra"><summary>¿Es otra persona?</summary>
            <div class="emerg-personas">${M.PERSONAS.map((x) => `<button data-paciente="${x.id}" aria-pressed="${x.id === P.id}">${x.nombre}</button>`).join("")}</div>
          </details>
        </div>
        <div class="emerg-error" id="emerg-error">
          <button class="btn btn-suave btn-ancho" id="fue-error">${ic("cerrar")} Fue un error</button>
          <div class="emerg-confirma" id="emerg-confirma" hidden>
            <span>¿Cancelar la emergencia?</span>
            <button class="btn" id="cancelar-si">Sí, cancelar</button>
            <button class="btn btn-suave" id="cancelar-no">No</button>
          </div>
        </div>
        <div class="emerg-luna"><div class="luna-aqui"></div>
          <div><b id="emerg-titulo">Signos de ${P.nombre}</b><span id="emerg-sub">Lunna vigila los signos en vivo…</span></div></div>
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
      let anim = 0, cancelada = false;
      const animar = (desde, hasta, ms, alPaso) => new Promise((ok) => {
        const ini = performance.now();
        const cuadro = (ahora) => {
          if (cancelada) return;
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

      // Otra paciente: se reinicia la emergencia con esa persona.
      $$("[data-paciente]", p).forEach((b) => b.addEventListener("click", () => {
        if (b.dataset.paciente !== P.id) ir(`emergencia:${b.dataset.paciente}`, { reemplazar: true });
      }));

      // Activación accidental: "Fue un error" los primeros 10 s, con confirmación (bug 2).
      const tError = setTimeout(() => { const e = $("#emerg-error", p); if (e) e.hidden = true; }, 10000);
      $("#fue-error", p).addEventListener("click", () => { $("#fue-error", p).hidden = true; $("#emerg-confirma", p).hidden = false; $("#cancelar-no", p).focus(); });
      $("#cancelar-no", p).addEventListener("click", () => { $("#emerg-confirma", p).hidden = true; $("#fue-error", p).hidden = false; });
      $("#cancelar-si", p).addEventListener("click", () => {
        cancelada = true;
        registrar("Emergencia cancelada: activación accidental");
        estado.registros.unshift({ t: "Emergencia cancelada", v: "activación accidental", hora: new Date().toTimeString().slice(0, 5), ic: "cerrar" });
        aviso("Emergencia cancelada. Quedó en el registro.");
        ir("hoy");
      });

      const PASOS = [
        `Mantén a ${P.nombre} en un lugar seguro y no ${la} dejes ${sola}.`,
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
        registrar(`Monitoreo de ${P.nombre}: signos en su normal`);
        await animar(0, 0.55, 3000, conFase);
        if (cancelada) return;
        luna.poner("alerta");
        $("#emerg-sub", p).textContent = "La saturación de oxígeno está bajando…";
        await animar(0.55, 1, 2600, conFase);
        if (cancelada) return;
        const fc = V.find((v) => v.id === "fc"), sat = V.find((v) => v.id === "spo2");
        $("#emerg-titulo", p).textContent = "Lunna activó el modo emergencia";
        $("#emerg-sub", p).innerHTML = `SpO₂ <b>${sat.crisis} %</b> (su normal ${sat.base} %) · pulso <b>${fmt((fc.crisis / fc.base).toFixed(1))}×</b> su normal`;
        registrar(`<b>Activación automática</b>: SpO₂ ${sat.crisis} % · pulso ${fc.crisis} lpm`);
        // Escalamiento (ERS §4.3): nunca se avisa a la misma persona que es paciente.
        if (esCMO) {
          registrar(`<b>Nivel 1 sin cubrir</b>: la paciente es la CMO (médica de a bordo)`);
          registrar(`Aviso enviado a <b>${COM.nombre}</b>, comandante`);
          registrar(`Escalado a nivel 2: paquete prioritario al cirujano de vuelo en Tierra (≈ ${T.retrasoTierraMin} min de retraso)`);
        } else {
          registrar(`Aviso enviado a <b>${CMO.nombre}</b>, CMO (médica de a bordo)`);
          registrar(`Paquete prioritario a Tierra en cola (≈ ${T.retrasoTierraMin} min de retraso)`);
        }
        luna.poner("empatica");
        mostrarPaso();
      })();

      $("#paso-hecho", p).addEventListener("click", async () => {
        registrar(`Hecho: ${PASOS[paso]}`);
        paso++;
        if (paso < PASOS.length) return mostrarPaso();
        $("#paso", p).hidden = true;
        $("#emerg-titulo", p).textContent = "Los signos se están recuperando";
        $("#emerg-sub", p).textContent = esCMO
          ? `${COM.nombre} ya está con ${P.nombre}; Tierra fue avisada. Lunna sigue registrando.`
          : `${CMO.nombre} ya está con ${P.nombre}. Lunna sigue registrando.`;
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

      limpiar = () => { cancelada = true; clearInterval(relojT); clearTimeout(tError); cancelAnimationFrame(anim); tel.classList.remove("en-emergencia"); };
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
      const temas = [["bienvenida", "Conoce a Lunna", "luna"], ["corazon", "Corazón y ejercicio", "corazon"], ["sueno", "Sueño", "luna"], ["comida", "Comida", "manzana"], ["glucosa", "Glucosa", "gota"], ["sintomas", "Síntomas", "curita"], ["fuerza", "Fuerza", "pesa"], ["radiacion", "Clima espacial", "rayo"]];
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
  // API para modulos.js (Registrar, Ciclo, Reportes, Configuración, panel de Lunna) y demo.js.
  // modulos.js registra sus pantallas y llama a APP.iniciar().
  window.APP = {
    ir, abrirTutorial, cerrarTutorial, tutorialPrimeraVez, DEMO, VEL, D, M, C, $, $$, fmt, ic, ref, mem, estado, persona, aviso,
    cabecera, lunaGlobo, COLOR, anillo, sem, claseN, etiquetas, valorDe, grafNormal, tarjetaNormal, ESTADO_TXT, sumaComida, tiempoEnRango, unoRM,
    PANTALLAS, pintarMenu, actualizarFase, raizDe,
    actual: () => actual,
    setLimpiar(f) { limpiar = f; },
    reposicionarLuna() { mem.guardar("luna-pos3", { lado: "izq", y: 1 }); location.reload(); },
    iniciar(destino) {
      lunaF = crearLunaFlotante();
      ir(destino || "hoy");
      if (!destino) tutorialPrimeraVez("bienvenida");
    },
  };
})();
