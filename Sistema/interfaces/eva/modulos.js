/* Lunna · módulos de la app sobre la maqueta de Leo y el motor de Diana (ERS-LUNA.md).
 * Navegación: Inicio · Registrar · Ciclo (solo ellas) · Reportes · Configuración.
 * Lunna (IA) vive en el botón flotante: lo que ve hoy, cómo monitorea, clima espacial, qué procesa,
 * biblioteca y hablar. Todo es SIMULADO salvo los eventos solares de NASA DONKI. */
(function () {
  "use strict";
  const A = window.APP;
  if (!A) return;                       // sin app (modo operativo): no hay módulos que montar
  const { D, M, $, $$, fmt, ic, ref, mem, aviso, cabecera, lunaGlobo, COLOR, sem, ESTADO_TXT, grafNormal, valorDe, etiquetas, ir } = A;
  const E = A.estado;
  const P = () => A.persona();
  const CMO = "MS-3", COM = "MS-1";
  const porNombre = (n) => M.PERSONAS.find((x) => x.nombre === n);
  const quien = (id) => M.PERSONAS.find((x) => x.id === id);
  const parejaDe = (id) => porNombre(quien(id).pareja);
  const hora = (min) => `11:${String(min).padStart(2, "0")}`;
  const ahora = () => { const d = new Date(); return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };
  const ev = (pid) => M.evaluar(pid || P().id, E.dia);
  const solarActivo = () => !!(E.solar && !E.solar.cerrado);

  // ---------- Piezas de interfaz ----------
  const FECHA0 = Date.UTC(2027, 2, 18); // día 112 = 18 mar 2027 (SCET del escenario de Julio)
  const fechaDia = (d) => new Date(FECHA0 + (d - 112) * 864e5);
  /** Fase del ciclo de una persona un día, con el mismo cálculo que la pantalla Ciclo. */
  const faseCicloDe = (pid, dia) => {
    const per = M.PERSONAS.find((x) => x.id === pid);
    if (!per || per.sexo !== "M" || pid === "MS-3") return null; // hombres y supresión menstrual (Mei): sin fases
    const C = E.ciclo, dur = Math.max(21, Math.min(40, +C.duracion || 28)), sang = Math.max(2, Math.min(9, +C.sangrado || 5));
    const diaC = (((Math.floor((fechaDia(dia) - new Date(C.ultima + "T00:00:00Z")) / 864e5)) % dur) + dur) % dur + 1;
    return diaC <= sang ? "menstruacion" : diaC <= dur - 14 ? "folicular" : "lutea";
  };
  M.configurarCiclo(faseCicloDe);
  const fechaLarga = (d) => { const t = fechaDia(d).toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }); return t.charAt(0).toUpperCase() + t.slice(1); };
  const titulo = (t, extra) => `<header class="titulo-grande"><div><p class="sup">${fechaLarga(E.dia)} · día ${E.dia}</p><h1>${t}</h1></div>${extra || ""}</header>`;
  const ICONO_SUB = {
    "Tripulación": ["equipo", "#5B8DFF", "#1F4FD8"], "Evento solar": ["sol", "#FF8A65", "#E5484D"], "Mente": ["cerebro", "#33C3B3", "#0E8F86"],
    "Alertas": ["alerta", "#FFC23D", "#E08A00"], "Signos y tendencias": ["grafica", "#6C7CFF", "#3446D4"], "Reflejos": ["rayo", "#38D1F0", "#0B8DB8"],
    "Radiación y dosis": ["fuego", "#FF9F45", "#E8620C"], "Tierra": ["tierra", "#38D1F0", "#0B8DB8"], "Vista CMO": ["escudo", "#3DD68C", "#119B5A"],
    "Privacidad": ["candado", "#3DD68C", "#119B5A"], "Lunna": ["luna", "#6C7CFF", "#3446D4"], "Qué es real y qué es simulado": ["info", "#8B95B8", "#4E5A80"],
  };
  const sub = (t, s, volver) => { const i = ICONO_SUB[t]; return `<div class="cabecera"><button class="icono-btn" data-volver${volver ? `="${volver}"` : ""} aria-label="Volver">${ic("atras")}</button>${i ? `<div class="pastilla-ic" style="--ic1:${i[1]};--ic2:${i[2]}">${ic(i[0])}</div>` : ""}<div class="cab-txt"><h1>${t}</h1>${s ? `<div class="sub">${s}</div>` : ""}</div></div>`; };
  // Solo es botón si lleva a algún lado (bug 8); si no, es una fila de información sin flecha ni toque.
  const fila = (o) => {
    const tocable = !!(o.ir || o.id || o.data);
    const tag = tocable ? "button" : "div";
    return `<${tag} class="lista-fila${tocable ? "" : " lista-fila-fija"}" ${o.ir ? `data-ir="${o.ir}"` : ""} ${o.id ? `id="${o.id}"` : ""} ${o.data || ""}>
      <span class="lf-ic" style="--c:${o.c || "var(--acento)"}">${ic(o.ic)}</span>
      <span class="lf-txt"><b>${o.t}</b>${o.s ? `<small>${o.s}</small>` : ""}</span>
      ${o.v !== undefined ? `<span class="lf-v">${o.v}</span>` : ""}${o.sinFlecha || !tocable ? "" : ic("chevron", "lf-flecha")}</${tag}>`;
  };
  const grupo = (t, filas, pie) => `<section class="grupo">${t ? `<h3 class="grupo-t">${t}</h3>` : ""}<div class="lista">${filas.join("")}</div>${pie ? `<p class="grupo-pie">${pie}</p>` : ""}</section>`;
  const chipSim = (t) => `<span class="ref ref-sim">${ic("planeta", "ic-sm")}${t || "Simulado"}</span>`;

  // Hoja genérica (formularios de Registrar y detalles)
  function abrirHoja(html, alMontar) {
    $("#hoja-cont").innerHTML = html; $("#hoja").hidden = false;
    if (alMontar) alMontar($("#hoja-cont"));
  }
  const cerrarHoja = () => { $("#hoja").hidden = true; };
  $$("[data-cerrar-hoja]").forEach((b) => b.addEventListener("click", cerrarHoja));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("#hoja").hidden) cerrarHoja(); });

  // ---------- Tema: claro, azul marino o automático ----------
  /** Idioma de la interfaz ("es" | "en"), lo maneja idioma.js. */
  const idiomaActual = () => (window.Lunna && window.Lunna.idioma ? window.Lunna.idioma.actual() : "es");
  function aplicarTema() {
    const t = E.tema === "auto" ? (matchMedia("(prefers-color-scheme: dark)").matches ? "oscuro" : "claro") : E.tema;
    document.documentElement.dataset.tema = t;
    const m = $('meta[name="theme-color"]'); if (m) m.content = t === "oscuro" ? "#070C2E" : "#EEF0FF";
  }
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => { if (E.tema === "auto") aplicarTema(); });
  aplicarTema();

  // ---------- Privacidad: matriz del ERS §6.5 ----------
  // ✔ ve · ◐ resumen · 🚨 solo en emergencia · ✋ con tu permiso · — no lo ve
  const MATRIZ = {
    estado: { yo: "✔", pareja: "◐", cmo: "✔", comandante: "◐", tierra: "✔", otro: "—" },
    vitales: { yo: "✔", pareja: "🚨", cmo: "✔", comandante: "—", tierra: "◐", otro: "—" },
    sueno: { yo: "✔", pareja: "—", cmo: "✔", comandante: "◐", tierra: "✔", otro: "—" },
    animo: { yo: "✔", pareja: "—", cmo: "◐", comandante: "—", tierra: "✔", otro: "—" },
    diario: { yo: "✔", pareja: "—", cmo: "✋", comandante: "—", tierra: "✋", otro: "—" },
    femenina: { yo: "✔", pareja: "—", cmo: "✋", comandante: "—", tierra: "✋", otro: "—" },
    dosis: { yo: "✔", pareja: "—", cmo: "✔", comandante: "◐", tierra: "✔", otro: "—" },
    ambiente: { yo: "✔", pareja: "✔", cmo: "✔", comandante: "✔", tierra: "✔", otro: "✔" },
    ubicacion: { yo: "✔", pareja: "🚨", cmo: "🚨", comandante: "🚨", tierra: "—", otro: "—" },
  };
  const DATO = { estado: "Estado ●■▲", vitales: "Signos vitales", sueno: "Sueño y reflejos", animo: "Ánimo: puntuación", diario: "Diario personal", femenina: "Ciclo y salud femenina", dosis: "Dosis de radiación", ambiente: "Alertas del ambiente", ubicacion: "Ubicación en la nave" };
  function relaciones(visor, pid) {
    if (visor === "tierra") return ["tierra"];
    if (visor === pid) return ["yo"];
    const r = [];
    if (visor === CMO) r.push("cmo");
    if (visor === COM) r.push("comandante");
    if (parejaDe(visor).id === pid) r.push("pareja");
    return r.length ? r : ["otro"];
  }
  const simb = (a) => ({ "✔": `<span class="acc-s acc-si">Sí</span>`, "◐": `<span class="acc-s acc-res">Resum.</span>`, "🚨": `<span class="acc-s acc-em">Emerg.</span>`, "✋": `<span class="acc-s acc-per">Permiso</span>`, "—": `<span class="acc-s acc-no">No</span>` }[a] || a);
  const ORDEN = ["—", "✋", "🚨", "◐", "✔"];
  function acceso(visor, pid, dato) {
    let mejor = "—";
    for (const r of relaciones(visor, pid)) { const a = MATRIZ[dato][r]; if (ORDEN.indexOf(a) > ORDEN.indexOf(mejor)) mejor = a; }
    if (mejor === "🚨" && solarActivo()) return "✔";
    if (mejor === "✋" && E.permisos[pid + ":" + dato]) return "✔";
    return mejor;
  }
  function registrarAcceso(visor, pid, dato) {
    if (visor === pid) return;
    if (!E.accesos.some((a) => a.visor === visor && a.pid === pid && a.dato === dato && a.dia === E.dia)) E.accesos.unshift({ visor, pid, dato, dia: E.dia, hora: ahora() });
  }
  const encolar = (x) => E.colaExtra.unshift(Object.assign({ dia: E.dia, hora: ahora() }, x));
  const ROL_CORTO = { "MS-1": "Comandante", "MS-2": "Especialista", "MS-3": "CMO", "MS-4": "Ingeniero" };
  const apto = (n, p) => { const a = p.sexo === "M" ? "a" : "o"; return n === 2 ? `No apt${a}` : n === 1 ? "En observación" : `Apt${a}`; };

  // ---------- Contenido fijo ----------
  const DONKI = [ // eventos reales SEP 2024 (Simulacion/donki/datos/donki-sep-2024-01-01_2024-12-31.json); latencia = primera alerta − evento
    { id: "2024-05-11T02:10:00-SEP-001", t: "11 may 2024 · 02:10 UTC", inst: "GOES-P: SEISS >100 MeV", lat: 20, modelo: true },
    { id: "2024-05-10T13:35:00-SEP-001", t: "10 may 2024 · 13:35 UTC", inst: "GOES-P: SEISS >10 MeV", lat: 11 },
    { id: "2024-06-08T02:25:00-SEP-001", t: "8 jun 2024 · 02:25 UTC", inst: "GOES-P: SEISS >100 MeV", lat: 11 },
    { id: "2024-03-23T08:15:00-SEP-001", t: "23 mar 2024 · 08:15 UTC", inst: "GOES-P: SEISS >10 MeV", lat: 13 },
    { id: "2024-05-11T04:07:00-SEP-001", t: "11 may 2024 · 04:07 UTC", inst: "STEREO A: IMPACT 13-100 MeV", lat: 6 },
  ];
  const BIBLIOTECA = [ // frecuencia esperada por misión: modelo IMM de NASA (catálogo de Iker)
    { t: "Insomnio", f: 13.85, que: "Dificultad para dormir o mantener el sueño.", hacer: "Rutina fija, luz tenue antes de dormir; avisa a la CMO si pasa de 3 noches.", cs: "Sin mejoría en 24 h y con el trabajo afectado." },
    { t: "Abrasión ocular", f: 7.42, que: "Raspadura en la superficie del ojo por partículas flotando.", hacer: "No frotar; lavar con la solución del botiquín.", cs: "Ojo rojo con visión borrosa, dolor, fotofobia o pus; cuerpo extraño que no sale." },
    { t: "Diarrea", f: 3.53, que: "Evacuaciones líquidas frecuentes.", hacer: "Hidratación y registrar cada episodio.", cs: "Con fiebre ≥ 38 °C o sin mejoría en 24 h." },
    { t: "Barotrauma", f: 3.28, que: "Dolor de oído o de senos por cambio de presión.", hacer: "Compensar con suavidad; no forzar.", cs: "Tímpano rojo y abombado, o perforado." },
    { t: "Cefalea por CO₂", f: 2.15, que: "Dolor de cabeza cuando sube el CO₂ de la cabina.", hacer: "Revisar el CO₂ en el panel; si varios tienen síntomas, es el ambiente.", cs: "Exposición química con sibilancias o falta de aire." },
  ];
  const AMBIENTE = (cab) => [
    ["CO₂ de cabina", fmt(cab.co2), "mmHg", "≤ 3 (promedio 1 h)", cab.co2 <= 3 ? 0 : 1],
    ["O₂ inspirado", "149", "mmHg", "145–155 · mín. 127", 0],
    ["Temperatura", "22,4", "°C", "18–27", 0],
    ["Humedad", "46", "%", "25–75", 0],
    ["Ruido", "61", "dBA", "75 en 8 h", 0],
    ["Tasa de dosis", cab.tasa.toLocaleString("es-ES"), "µSv/h", "< 54 · refugio ≥ 3000", cab.tasa >= 3000 ? 2 : cab.tasa > 54 ? 1 : 0],
  ];
  const REGLA_YAML = `id: FATIGA-03
nombre: Fatiga acumulada
peligro: aislamiento y confinamiento   # HRP
cuando:                                # las tres a la vez
  - sueno.z    <= -2.0    # tu normal, 14 días
  - lapsos.z   >= +2.0    # PVT-B, lapsos ≥ 355 ms
  - fc.z       >= +2.0    # pulso en reposo
estado: atencion
protocolo: FAT-01
reevaluar: cada 24 h
cerrar_si: las tres con z < 2 durante 2 días   # propuesta del equipo
escalar_si: persiste 48 h o síntoma físico -> CMO`;
  const PROTOCOLO = ["Protege tu ventana de sueño de 8,5 h esta noche", "Sin cafeína 6 h antes de dormir", "Pide a la CMO revisar la carga de trabajo", "Repite la prueba de reflejos mañana a las 07:30"];

  // ---------- Evento solar del día 115 con buddy check (Propuesta §8, CU-03) ----------
  let reloj = 0;
  function iniciarSolar() {
    M.ESTADO.solarCerrado = false;
    E.solar = { min: 4, llego: {}, buddy: {}, paso: 0, log: [], cerrado: false };
    logSolar(4, "La tasa de dosis sube muy por encima de lo normal (simulada) → ▲ rojo para toda la tripulación");
    encolar({ prio: 0, t: "Evento solar: cronología sellada con SCET y tasa de dosis", nivel: 2 });
    clearInterval(reloj);
    reloj = setInterval(tickSolar, 3600 / A.VEL);
  }
  function logSolar(min, txt) { E.solar.log.unshift({ h: hora(min), txt }); }
  function tickSolar() {
    const s = E.solar; if (!s || s.cerrado || s.min >= 9) return clearInterval(reloj);
    s.min++;
    const yo = P().id;
    if (s.min === 6) logSolar(6, "Buddy check: cada celular pregunta por su pareja");
    if (s.min === 7) {
      for (const id of ["MS-2", "MS-4", "MS-1"]) if (id !== yo) s.llego[id] = true;
      if (yo !== "MS-2") s.buddy["MS-2"] = "si"; if (yo !== "MS-4") s.buddy["MS-4"] = "si"; if (yo !== COM) s.buddy[COM] = "no";
      logSolar(7, "Ana y Luis se confirman entre sí. Mei no confirma; su iPad sí tiene conexión");
      logSolar(7, "Alerta a Tomás (pareja de Mei y comandante). Mei es la CMO: el nivel 1 queda sin cubrir");
      if (yo !== CMO) registrarAcceso(COM, CMO, "ubicacion");
    }
    if (s.min === 9) {
      M.PERSONAS.forEach((x) => (s.llego[x.id] = true)); s.buddy[COM] = "si";
      logSolar(9, "Mei llega al refugio: tenía audífonos puestos. 4 de 4 en el refugio");
    }
    franja();
    const a = A.actual().split(":")[0];
    if (["solar", "pared", "equipo"].includes(a)) ir(A.actual());
  }
  function cerrarSolar() {
    const s = E.solar; s.min = 31; s.cerrado = true; clearInterval(reloj);
    M.ESTADO.solarCerrado = true;
    logSolar(31, "La tasa vuelve a lo normal. Evento cerrado. Dosis actualizada contra 250 y 600 mSv [A]");
    logSolar(32, "La caminata espacial de Ana sigue en pie: su fatiga cerró el día 114");
    franja(); ir("solar");
  }
  function franja() {
    const f = $("#franja"), act = solarActivo();
    f.hidden = !act;
    if (act) f.innerHTML = `${ic("alerta", "ic-sm")} <b>Evento solar</b> · ${E.solar.min < 9 ? "Dirígete al refugio blindado" : "4 de 4 en el refugio"}`;
    $(".telefono").classList.toggle("alerta-roja", act && E.solar.min < 9);
    $("#dia-barra").textContent = `Día ${E.dia}`;
  }
  $("#franja").addEventListener("click", () => ir("solar"));
  let diaVisto = null;
  A.alIr = () => {
    if (E.dia !== diaVisto) {
      diaVisto = E.dia;
      if (E.dia === 115 && !E.solar) { iniciarSolar(); setTimeout(() => ir(A.actual()), 0); }
      if (E.dia !== 115 && E.solar) { E.solar = null; M.ESTADO.solarCerrado = false; clearInterval(reloj); }
    }
    franja();
  };

  // ---------- Inicio: alertas, tripulación ----------
  A.alertasInicio = (p, e) => {
    const t = [];
    if (solarActivo()) t.push(`<button class="aviso-card ac-rojo" data-ir="solar">${sem(2, false)}<span><b>Evento solar · ${hora(E.solar.min)}</b><small>${E.solar.min < 9 ? "Dirígete al refugio blindado. Confirma a tu pareja." : "4 de 4 en el refugio. Permanezcan dentro."}</small></span>${ic("chevron", "ac-flecha")}</button>`);
    const f = e.fatiga;
    if (f) {
      const n = f.estado === "cerrado" ? 0 : 1;
      t.push(`<button class="aviso-card ${n ? "ac-ambar" : "ac-verde"}" data-ir="alertas">${sem(n, false)}<span><b>${f.estado === "abierto" ? "Fatiga acumulada" : f.estado === "mejorando" ? "Fatiga: vas mejorando" : "Fatiga cerrada"}</b><small>${f.estado === "abierto" ? "Ninguna señal sola dispararía; las tres juntas, sí." : f.estado === "mejorando" ? "Sigue el protocolo FAT-01. Reevalúo mañana." : "Dos días en tu normal: apta para la caminata espacial."}</small></span>${ic("chevron", "ac-flecha")}</button>`);
    }
    if (E.dia >= 114 && (p.id === "MS-2" || p.id === CMO)) t.push(`<button class="aviso-card ac-info" data-ir="tierra">${ic("tierra", "ac-ic")}<span><b>Nota de Tierra</b><small>Sobre datos del día 112 · llegó con 41 min de antigüedad</small></span>${ic("chevron", "ac-flecha")}</button>`);
    return t.length ? `<div class="avisos-inicio">${t.join("")}</div>` : "";
  };
  A.tripulacionInicio = (p) => {
    const tarjetas = M.PERSONAS.map((x) => {
      const n = ev(x.id).general, a = x.id === p.id ? "✔" : acceso(p.id, x.id, "estado"), rel = relaciones(p.id, x.id);
      let est;
      if (a === "✔") est = sem(n);
      else if (rel.includes("comandante")) est = `<span class="apto n${n}">${apto(n, x)}</span>`;
      else if (rel.includes("pareja") && n === 2) est = sem(2, "Necesita ayuda");
      else est = `<span class="mini-t priv">${ic("candado", "ic-sm")} Privado</span>`;
      const refugio = solarActivo() ? `<span class="mini-t">${E.solar.llego[x.id] ? "✔ en el refugio" : "◌ sin confirmar"}</span>` : "";
      return `<button class="trip" data-ir="equipo"><span class="avatar" style="--c:${x.color}">${x.nombre[0]}</span><b>${x.id === p.id ? "Tú" : x.nombre}</b><small>${ROL_CORTO[x.id] || x.rol}</small>${est}${refugio}</button>`;
    }).join("");
    return `<div class="seccion-cab"><h2>Tu tripulación</h2><button class="enlace" data-ir="equipo">Ver todo</button></div>
      <div class="trip-fila">${tarjetas}</div>
      <p class="tenue-12 nota-priv">${ic("candado", "ic-sm")} Cada quien ve solo lo que necesita: el comandante, apto o no apto; la CMO, lo clínico.</p>`;
  };

  // ---------- Pantallas ----------
  const PANT = {
    // ===== Inicio: tripulación y panel de pared =====
    equipo(p) {
      const yo = P();
      p.innerHTML = `${sub("Tripulación", "Estado de la tripulación", "hoy")}
        <div class="trip-grid">${M.PERSONAS.map((x) => {
          const n = ev(x.id).general, a = x.id === yo.id ? "✔" : acceso(yo.id, x.id, "estado"), rel = relaciones(yo.id, x.id);
          const est = x.id === yo.id ? sem(n, "Tú") : a === "✔" ? sem(n) : rel.includes("comandante") ? `<span class="apto n${n}">${apto(n, x)}</span>` : rel.includes("pareja") && n === 2 ? (n === 2 ? sem(2, "Necesita ayuda") : `<span class="mini-t">Te aviso solo si necesita ayuda</span>`) : `<span class="mini-t">${ic("candado", "ic-sm")} Privado</span>`;
          return `<div class="tarjeta trip-card"><div class="trip-cab"><span class="avatar" style="--c:${x.color}">${x.nombre[0]}</span><div><b>${x.nombre}</b><small>${x.id} · ${x.rol}</small></div></div>${est}
            ${solarActivo() ? `<span class="mini-t">${E.solar.llego[x.id] ? "✔ en el refugio" : "◌ sin confirmar"}</span>` : ""}
            </div>`;
        }).join("")}</div>
        <button class="btn btn-ancho btn-suave" data-ir="pared">${ic("grafica")} Ver panel de pared</button>
        <div class="tarjeta"><h3>${ic("candado")} Lo que ves aquí</h3><p class="tenue-12">El comandante ve apto / no apto, nunca el motivo. La CMO ve lo clínico. Toda la tripulación ve las alertas del ambiente.</p></div>`;
    },
    pared(p) {
      const act = solarActivo() && E.solar.min < 9;
      p.innerHTML = `<div class="pared ${act ? "pared-roja" : ""}">
        <div class="pared-cab"><b>Lunna · panel de pared</b><span>Día ${E.dia} · ${solarActivo() ? hora(E.solar.min) : "07:45"}</span><button class="btn btn-sm btn-suave" data-volver="equipo">${ic("atras", "ic-sm")} Salir</button></div>
        ${solarActivo() ? `<div class="banner-rojo"><b>▲ Evento solar</b><span>${act ? "Todos al refugio blindado" : "4 de 4 en el refugio"}</span></div>` : `<div class="pared-amb">${AMBIENTE(ev().cabina).slice(0, 4).map((a) => sem(a[4], a[0])).join("")}</div>`}
        <div class="pared-grid">${M.PERSONAS.map((x) => { const n = ev(x.id).general; return `<div class="pared-p n${n}"><svg viewBox="-8 -8 16 16" class="pared-forma">${A.C.forma(n, 0, 0, 7)}</svg><b>${x.nombre}</b><span>${x.rol}</span>${solarActivo() ? `<span>${E.solar.llego[x.id] ? "✔ refugio" : "◌"}</span>` : ""}</div>`; }).join("")}</div>
        <p class="pared-pie">${ic("candado", "ic-sm")} Panel público: solo estado ●■▲ y alertas del ambiente. Sin números ni diagnósticos.</p></div>`;
    },
    solar(p) {
      if (E.dia !== 115 || !E.solar) {
        p.innerHTML = `${sub("Evento solar", "Escenario del día 115", "hoy")}${lunaGlobo("No hay evento activo. El escenario de la demo ocurre el día 115 a las 11:04.")}
          <button class="btn btn-ancho" id="ir115">${ic("play")} Ir al día 115</button>`;
        LUNA.crear($(".luna-aqui", p), { cara: "radiacion", tam: 64 });
        $("#ir115", p).addEventListener("click", () => { E.dia = 115; ir("solar"); }); return;
      }
      const s = E.solar, yo = P(), par = parejaDe(yo.id), n = M.PERSONAS.filter((x) => s.llego[x.id]).length, ev0 = DONKI[0];
      const RAD = ["Deja lo que estés haciendo y ve al refugio blindado.", "Quédate dentro: NASA pide montarlo en ≤ 1 h y poder permanecer hasta 24 h.", "Confirma a tu pareja en Lunna."];
      const filaP = (x) => {
        const ok = s.llego[x.id], ub = x.id === yo.id ? "✔" : acceso(yo.id, x.id, "ubicacion");
        if (!ok && s.min >= 7 && ub === "✔" && x.id !== yo.id) registrarAcceso(yo.id, x.id, "ubicacion");
        const det = ok ? "En el refugio" : s.min >= 7 ? (ub === "✔" ? "Sin confirmar · su iPad tiene conexión · última ubicación: Módulo C (simulada)" : "Sin confirmar · su pareja ya fue avisada") : "En camino";
        return `<div class="persona-fila">${sem(ok ? 0 : s.min >= 7 ? 2 : null, x.id === yo.id ? "Tú" : x.nombre)}<small>${det}</small>${!ok && s.min >= 7 && ub === "✔" ? ic("pin", "ic-sm") : ""}</div>`;
      };
      p.innerHTML = `${sub("Evento solar", "RAD-01 · protocolo logístico, no clínico", "hoy")}
        <div class="banner-rojo ${s.cerrado ? "banner-ok" : ""}"><b>${s.cerrado ? "Evento cerrado" : "▲ Evento de partículas solares"}</b><span>${s.cerrado ? "La tasa de dosis volvió a lo normal" : s.min < 9 ? "Dirígete al refugio blindado. Ahora." : "4 de 4 en el refugio · permanezcan dentro"}</span><i class="reloj-sol">${hora(s.min)}</i></div>
        ${!s.cerrado && !s.llego[yo.id] ? `<button class="btn btn-ancho btn-emerg" id="llegue">${ic("check")} Llegué al refugio</button>` : ""}
        ${!s.cerrado && s.min >= 6 && !s.buddy[yo.id] ? `<div class="tarjeta tarjeta-roja"><h3>${ic("equipo")} Buddy check</h3><p class="pregunta">¿${par.nombre} llegó al refugio?</p>
          <div class="fila-btn"><button class="btn btn-suave" data-buddy="no">No la/lo veo</button><button class="btn" data-buddy="si">Sí, está conmigo</button></div></div>` : ""}
        ${!s.cerrado ? `<div class="paso"><span class="paso-num">RAD-01 · paso ${Math.min(s.paso + 1, 3)} de 3</span><p class="paso-txt">${RAD[Math.min(s.paso, 2)]}</p>${s.paso < 2 ? `<button class="btn btn-ancho btn-emerg" id="paso-sol">${ic("check")} Hecho</button>` : ""}</div>`
          : `<div class="tarjeta"><h3>${ic("fuego")} Dosis</h3><div class="dato">Tu dosis de la misión <b>${fmt(M.dosisPersonal(P().id, E.dia).mision)} de 600 mSv</b></div><div class="dato">Dosis del evento <b>${fmt(M.dosisPersonal(P().id, E.dia).evento)} de 250 mSv</b></div><div class="tenue-12">${chipSim("Dosis simulada")} DONKI no entrega dosis.</div>
            ${yo.id === COM || yo.id === "MS-2" ? `<p class="nota-ok">${ic("cohete", "ic-sm")} La caminata espacial de Ana sigue en pie: <b>apta</b></p>` : ""}</div>`}
        <div class="tarjeta"><h3>${ic("equipo")} En el refugio <span class="espacio"></span><b class="contador">${n} de 4</b></h3>${M.PERSONAS.map(filaP).join("")}
          ${s.min >= 7 && !s.llego[CMO] ? `<div class="aviso-fijo">${ic("alerta", "ic-sm")}<span>Mei es la CMO: el nivel 1 queda sin cubrir. Si hace falta, se escala directo a Tierra y al comandante.</span></div>` : ""}
          <p class="tenue-12">${ic("candado", "ic-sm")} La ubicación solo se comparte durante la emergencia y solo con quien la necesita.</p></div>
        <div class="tarjeta"><h3>${ic("planeta")} Evento real usado como modelo <span class="espacio"></span><span class="ref ref-A">NASA DONKI</span></h3>
          <div class="dato">ID <b>${ev0.id}</b></div><div class="dato">Instrumento <b>${ev0.inst}</b></div><div class="dato">Alerta emitida <b>${ev0.lat} min después</b></div>
          <p class="tenue-12">Más 18 min de viaje de la señal hasta la nave: cuando el aviso llega, la dosis ya empezó. Por eso Lunna decide a bordo.</p></div>
        <div class="tarjeta registro"><h3>${ic("escudo")} Registro sellado (SCET)</h3><ol>${s.log.map((x) => `<li><b>${x.h}</b> ${x.txt}</li>`).join("")}</ol></div>
        ${!s.cerrado && s.min >= 9 ? `<button class="btn btn-ancho" id="cerrar-sol">${ic("check")} La tasa se normaliza (11:31): cerrar evento</button>` : ""}`;
      const ll = $("#llegue", p); if (ll) ll.addEventListener("click", () => { s.llego[yo.id] = true; logSolar(s.min, `${yo.nombre} confirma que llegó al refugio`); ir("solar"); });
      $$("[data-buddy]", p).forEach((b) => b.addEventListener("click", () => {
        s.buddy[yo.id] = b.dataset.buddy;
        if (b.dataset.buddy === "si") { s.llego[par.id] = true; logSolar(s.min, `${yo.nombre} confirma a ${par.nombre}`); }
        else logSolar(s.min, `${yo.nombre} no ve a ${par.nombre}: se avisa con su última ubicación`);
        ir("solar");
      }));
      const ps = $("#paso-sol", p); if (ps) ps.addEventListener("click", () => { logSolar(s.min, "Hecho: " + RAD[s.paso]); s.paso++; ir("solar"); });
      const cs = $("#cerrar-sol", p); if (cs) cs.addEventListener("click", cerrarSolar);
    },

    // ===== Registrar =====
    registrar(p) {
      const yo = P(), ella = yo.sexo === "M";
      const T = [
        ["comida", "manzana", "Comida", "#2BA36B"], ["glucosa", "gota", "Glucosa", "#11A3C8"], ["form:presion", "corazon", "Presión", "#E0457B"],
        ["form:temp", "fuego", "Temperatura", "#F08A24"], ["form:agua", "gota", "Agua", "#3D8BFF"], ["form:masa", "pesa", "Masa corporal", "#5B6CFF"],
        ["sintomas", "curita", "Síntomas", "#E5A100"], ["sueno", "luna", "Sueño", "#3446D4"], ["corazon", "ondas", "Ejercicio", "#D03C7C"],
        ["fuerza", "pesa", "Fuerza (ARED)", "#1F4FD8"], ["mente", "cerebro", "Mente", "#0E8F86"], ["form:orina", "camara", "Tira de orina", "#0E8F8F"],
        ["form:foto", "camara", "Foto piel o uñas", "#5A6080"], ...(ella ? [["ciclo", "flor", "Ciclo", "#E8457A"]] : []),
      ];
      p.innerHTML = `${titulo("Registrar")}
        <p class="intro">Todo lo que los sensores no miden: escríbelo, tócalo o tómale foto.</p>
        <div class="reg-grid">${T.map(([d, i, t, c]) => `<button ${d.startsWith("form:") ? `data-form="${d.slice(5)}"` : `data-ir="${d}"`}><span class="reg-ic" style="--c:${c}">${ic(i)}</span><span>${t}</span></button>`).join("")}</div>
        ${grupo("Hoy registraste", E.registros.length ? E.registros.map((r) => fila({ ic: r.ic || "check", c: "var(--acento)", t: r.t, s: r.hora, v: r.v, sinFlecha: true })) : [`<div class="lista-vacia">Nada todavía. Empieza con el check-in de Inicio.</div>`])}`;
      $$("[data-form]", p).forEach((b) => b.addEventListener("click", () => FORM[b.dataset.form]()));
    },
    mente(p) {
      const yo = P(), e = M.estadoIndicador(yo.id, "animo", E.dia);
      const items = ["Poco interés o placer", "Decaída/o o sin esperanza", "Problemas para dormir", "Cansancio o poca energía", "Poco apetito o comer de más", "Sentirte mal contigo", "Problemas para concentrarte", "Lentitud o inquietud", "Pensar en hacerte daño"];
      p.innerHTML = `${sub("Mente", "Estrés, ánimo, carga y diario privado", "registrar")}
        ${A.tarjetaNormal("animo")}
        <div class="tarjeta"><h3>${ic("ondas")} Estrés ahora <span class="espacio"></span><b id="estres-v">${E.estres}</b></h3>
          <input class="deslizador" id="estres" type="range" min="0" max="100" value="${E.estres}" aria-label="Estrés de 0 a 100"/>
          <div class="escala-etq"><span>Tranquila/o</span><span>Al límite</span></div></div>
        <div class="tarjeta"><h3>${ic("reloj")} Carga de trabajo</h3>
          <div class="campo-fila"><label>Horas esta semana<input id="horas" type="number" value="47" min="0" max="120"/></label><label>Somnolencia KSS (1–9)<input id="kss" type="number" value="4" min="1" max="9"/></label></div>
          <div id="carga"></div><p class="tenue-12">Nominal 6,5 h/día; crítico > 60 h por semana [A].</p></div>
        <details class="tarjeta"><summary>${ic("libro")} Cuestionario PHQ-9 · semanal</summary>
          <p class="tenue-12">Últimas 2 semanas. 0 nunca · 1 varios días · 2 más de la mitad · 3 casi diario. Cortes 5/10/15 de Tierra [T]. Lo suma un contador, nunca Luna.</p>
          ${items.map((t, i) => `<div class="phq"><span>${i + 1}. ${t}</span><div class="seg">${[0, 1, 2, 3].map((v) => `<button class="chip chip-sm" data-q="${i}" data-v="${v}">${v}</button>`).join("")}</div></div>`).join("")}
          <div id="phq-res"></div></details>
        <div class="tarjeta"><h3>${ic("candado")} Diario privado</h3><textarea class="area" rows="3" id="diario" placeholder="Solo tú lo ves. La CMO, solo con tu permiso.">${E.diario}</textarea></div>`;
      void e;
      $("#estres", p).addEventListener("input", (x) => { E.estres = +x.target.value; $("#estres-v", p).textContent = E.estres; });
      $("#estres", p).addEventListener("change", () => { M.registrar(P().id, E.dia, "animo", E.estres, ahora()); aviso("Estrés registrado: ya cuenta en Inicio"); ir("mente"); });
      const carga = () => { const h = +$("#horas", p).value, k = +$("#kss", p).value; $("#carga", p).innerHTML = `${sem(h > 60 ? 2 : h > 50 ? 1 : 0, h + " h por semana")} ${sem(k > 6 ? 1 : 0, "KSS " + k)}`; };
      carga(); $$("#horas, #kss", p).forEach((i) => i.addEventListener("input", carga));
      $("#diario", p).addEventListener("input", (x) => { E.diario = x.target.value; });
      const r = Array(9).fill(null);
      $$("[data-q]", p).forEach((b) => b.addEventListener("click", () => {
        r[b.dataset.q] = +b.dataset.v; $$(`[data-q="${b.dataset.q}"]`, p).forEach((c) => c.setAttribute("aria-pressed", String(c === b)));
        if (r.some((x) => x === null)) return;
        const t = r.reduce((a, c) => a + c, 0), n = t >= 15 ? 2 : t >= 10 ? 1 : 0;
        $("#phq-res", p).innerHTML = `<div class="dato">Total <b>${t}/27</b> ${sem(n, t >= 15 ? "moderada-grave" : t >= 10 ? "moderada: avisar a la CMO" : t >= 5 ? "leve" : "mínima")}</div>`;
        if (r[8] > 0) { E.crisis = true; encolar({ prio: 0, pid: yo.id, t: "Alerta crítica de salud mental (ítem 9)", nivel: 2 }); $("#phq-res", p).innerHTML += `<div class="tarjeta tarjeta-roja">${sem(2, "Contacta a la CMO ahora")}<p>Gracias por decírmelo. Ya avisé a Mei y encolé un mensaje prioritario a Tierra. No estás sola/o.</p></div>`; }
      }));
      registrarAcceso(yo.id, yo.id, "animo");
    },

    // ===== Ciclo (al estilo Clue) =====
    ciclo(p) {
      const yo = P(), C = E.ciclo, supr = yo.id === CMO;
      const hoy = fechaDia(E.dia), iso = hoy.toISOString().slice(0, 10);
      const dur = Math.max(21, Math.min(40, +C.duracion || 28)), sang = Math.max(2, Math.min(9, +C.sangrado || 5));
      const diaC = (((Math.floor((hoy - new Date(C.ultima + "T00:00:00Z")) / 864e5)) % dur) + dur) % dur + 1;
      const ovu = dur - 14, fertil = [ovu - 4, ovu + 1];
      const fase = (d) => (d <= sang ? "per" : d === ovu ? "ovu" : d >= fertil[0] && d <= fertil[1] ? "fer" : d > dur - 5 ? "pms" : "nor");
      const NOMBRE = { per: "Menstruación", fer: "Ventana fértil", ovu: "Ovulación estimada", pms: "Premenstrual", nor: diaC < ovu ? "Fase folicular" : "Fase lútea" };
      const prox = dur - diaC + 1, aOvu = ovu - diaC;
      const R = 104, cx = 130, cy = 130;
      const puntos = Array.from({ length: dur }, (_, i) => {
        const d = i + 1, ang = (-90 + (i * 360) / dur) * Math.PI / 180, x = cx + R * Math.cos(ang), y = cy + R * Math.sin(ang);
        const f = fase(d), hoyD = d === diaC;
        const fechaD = new Date(hoy.getTime() + (d - diaC) * 864e5).toISOString().slice(0, 10);
        return `<g class="cd cd-${f} ${hoyD ? "cd-hoy" : ""}">${hoyD ? `<circle cx="${x}" cy="${y}" r="15" class="cd-aro"/>` : ""}<circle cx="${x}" cy="${y}" r="${hoyD ? 10 : 7}"/>${C.registro[fechaD] ? `<circle cx="${cx + (R - 19) * Math.cos(ang)}" cy="${cy + (R - 19) * Math.sin(ang)}" r="2.6" class="cd-reg"/>` : ""}</g>`;
      }).join("");
      const semana = Array.from({ length: 7 }, (_, i) => { const d = ((diaC - 4 + i - 1 + dur) % dur) + 1, f = new Date(hoy.getTime() + (i - 3) * 864e5); return `<div class="sem-dia ${i === 3 ? "hoy" : ""}"><small>${f.toLocaleDateString("es-MX", { weekday: "narrow", timeZone: "UTC" })}</small><span class="cd-${fase(d)}">${f.getUTCDate()}</span>${C.registro[f.toISOString().slice(0, 10)] ? "<i></i>" : ""}</div>`; }).join("");
      p.innerHTML = `${titulo("Ciclo", `<span class="priv-chip">${ic("candado", "ic-sm")} Privado</span>`)}
        ${supr ? `<div class="tarjeta ciclo-supr"><h3>${ic("escudo")} Supresión menstrual activa</h3><p>DIU de levonorgestrel. Lunna no calcula fases; sigue registrando sangrado inesperado y síntomas.</p></div>` : `
        <div class="ciclo-anillo">
          <svg viewBox="0 0 260 260" role="img" aria-label="Día ${diaC} de ${dur} del ciclo, ${NOMBRE[fase(diaC)]}">${puntos}</svg>
          <div class="ciclo-centro"><small>Día del ciclo</small><b>${diaC}</b><span class="cd-txt-${fase(diaC)}">${NOMBRE[fase(diaC)]}</span>
            <em>${fase(diaC) === "per" ? `Día ${diaC} de ${sang} de sangrado` : `Menstruación en ${prox} día${prox === 1 ? "" : "s"}`}</em></div>
        </div>
        <div class="ciclo-leyenda"><span><i class="cd-per"></i>Menstruación</span><span><i class="cd-fer"></i>Fértil</span><span><i class="cd-ovu"></i>Ovulación</span><span><i class="cd-pms"></i>Premenstrual</span></div>
        <div class="semana">${semana}</div>`}
        <button class="btn btn-ancho btn-ciclo" id="reg-ciclo">${ic("mas")} Registrar hoy</button>
        ${!supr ? `<div class="pred"><div><small>Próxima menstruación</small><b>en ${prox} días</b></div><div><small>Ovulación</small><b>${aOvu > 0 ? `en ${aOvu} días` : aOvu === 0 ? "hoy" : "pasó"}</b></div><div><small>Ciclo</small><b>${dur} días</b></div></div>` : ""}
        ${grupo("Tu ciclo en el espacio", [
          fila({ ic: "corazon", c: "#E0457B", t: "Tu normal se ajusta por fase", s: supr ? "Con supresión menstrual no hay fases: tu normal no se ajusta" : `En fase lútea el pulso en reposo y la HRV cambian; Lunna ensancha ${fmt(M.AJUSTE_LUTEA.fc)}× tu margen en esas dos para no darte falsas alarmas (propuesta del equipo). Hoy: ${NOMBRE[fase(diaC)].toLowerCase()}`, sinFlecha: true }),
          fila({ ic: "escudo", c: "#5B6CFF", t: supr ? "DIU de levonorgestrel" : "Píldora combinada · te alcanza para 120 días", s: supr ? "Cubre toda la misión" : "Faltan 98 días de tránsito (simulado)", sinFlecha: true }),
          fila({ ic: "candado", c: "#5A6080", t: "Riesgo de coágulos con tratamiento hormonal", s: "La CMO lo ve solo con tu permiso o en emergencia", sinFlecha: true }),
          fila({ ic: "ola", c: "#11A3C8", t: "Al volver a la gravedad", s: "El mareo al ponerse de pie es más frecuente en mujeres: te aviso en la transición", sinFlecha: true }),
        ], "Hay pocos estudios en mujeres astronautas: las diferencias por sexo son avisos, no diagnósticos.")}
        ${!supr ? `<details class="tarjeta"><summary>${ic("calendario")} Ajustar mi ciclo</summary>
          <div class="campo-fila tres"><label>Última menstruación<input id="c-ult" type="date" value="${C.ultima}"/></label><label>Ciclo (días)<input id="c-dur" type="number" value="${dur}" min="21" max="40"/></label><label>Sangrado (días)<input id="c-san" type="number" value="${sang}" min="2" max="9"/></label></div></details>` : ""}`;
      void iso;
      $("#reg-ciclo", p).addEventListener("click", () => registrarCiclo(iso));
      $$("#c-ult, #c-dur, #c-san", p).forEach((i) => i.addEventListener("change", () => { C.ultima = $("#c-ult", p).value || C.ultima; C.duracion = +$("#c-dur", p).value; C.sangrado = +$("#c-san", p).value; mem.guardar("ciclo", C); ir("ciclo"); }));
    },

    // ===== Reportes (resumen; los desglosados están en el panel de escritorio) =====
    reportes(p) {
      const yo = P(), e = ev(), L = M.lunaDice(yo.id, E.dia);
      const fuera = Object.keys(M.IND).filter((k) => e.nivelDe(k) > 0).length;
      const lap = e.ind.lapsos;
      const filas = [
        fila({ ir: "alertas", ic: "alerta", c: "#E5A100", t: "Alertas y protocolos", s: e.alertas.length ? e.alertas.map((a) => a.id).join(" · ") : "Sin alertas abiertas", v: e.alertas.length || "" }),
        fila({ ir: "signos", ic: "grafica", c: "#5B6CFF", t: "Signos y tendencias", s: "14 días contra tu normal", v: fuera ? `${fuera} en atención` : "En tu normal" }),
        fila({ ir: "pvt", ic: "rayo", c: "#3445B8", t: "Reflejos (PVT-B)", s: lap.valor != null ? `${lap.valor} lapsos hoy · tu normal ${lap.normal ? Math.round(lap.normal.med) : "–"}` : "Sin prueba hoy" }),
        fila({ ir: "radiacion", ic: "fuego", c: "#F08A24", t: "Radiación y dosis", s: `Tu misión: ${fmt(M.dosisPersonal(P().id, E.dia).mision)} de 600 mSv`, v: e.cabina.solar ? "▲" : "" }),
        fila({ ir: "tierra", ic: "tierra", c: "#11A3C8", t: "Comunicación con Tierra", s: "18 min por trayecto · cola priorizada" }),
        ...(E.dia === 115 ? [fila({ ir: "solar", ic: "sol", c: "#E5484D", t: "Evento solar del día 115", s: E.solar && E.solar.cerrado ? "Cerrado · 4 de 4 en el refugio" : "Activo · buddy check" })] : []),
        ...(yo.id === CMO ? [fila({ ir: "cmo", ic: "escudo", c: "#2BA36B", t: "Vista CMO", s: "Lo clínico de la tripulación" })] : []),
        fila({ ir: "logros", ic: "trofeo", c: "#E8457A", t: "Hábitos y logros", s: `${E.checkins} días seguidos registrando` }),
      ];
      p.innerHTML = `${titulo("Reportes")}
        <div class="resumen-card"><span class="luna-aqui"></span><div><b>${L.resumen}</b><small>Resumen de hoy · ${yo.nombre}</small></div></div>
        ${grupo("", filas)}
        <div class="aviso-escritorio">${ic("grafica")}<span>Aquí ves el resumen. Los reportes completos, con cada señal desglosada, están en el <b>panel de escritorio</b>.</span></div>`;
      LUNA.crear($(".luna-aqui", p), { cara: L.cara, tam: 48 });
    },
    alertas(p) {
      const yo = P(), e = ev(), f = e.fatiga, otros = M.lunaDice(yo.id, E.dia).hallazgos.filter((h) => h.nivel > 0 && !["FATIGA-03", "RADIACION"].includes(h.id));
      const hist = f ? Array.from({ length: E.dia - f.desde + 1 }, (_, i) => f.desde + i).map((d) => ({ d, f: M.fatiga(yo.id, d) })) : [];
      p.innerHTML = `${sub("Alertas", "Una alerta abre un protocolo, no un consejo suelto", "reportes")}
        ${solarActivo() ? `<button class="aviso-card ac-rojo" data-ir="solar">${sem(2, false)}<span><b>Evento solar</b><small>Protocolo RAD-01 activo</small></span>${ic("chevron", "ac-flecha")}</button>` : ""}
        ${!f && !otros.length && !solarActivo() ? lunaGlobo("No tienes alertas abiertas. Sigo midiendo contra tu normal.") : ""}
        ${f ? `<div class="tarjeta">
          <div class="alerta-cab">${sem(f.estado === "cerrado" ? 0 : 1, f.estado === "abierto" ? "Atención" : f.estado === "mejorando" ? "En seguimiento" : "Cerrada")}<h2>Fatiga acumulada</h2><code>FATIGA-03</code></div>
          <p class="frase-motor">Ninguna señal sola dispararía; <b>las tres juntas, sí</b>.</p>
          <div class="chips"><span class="chip chip-sm chip-fijo">${ic("escudo", "ic-sm")} Nivel 0 · autocuidado</span><span class="chip chip-sm chip-fijo">${ic("cohete", "ic-sm")} Caminata espacial: ${f.estado === "cerrado" ? "apta" : "se revisa antes"}</span></div>
          ${f.hoy.es.map((x) => `<div class="senal"><div class="senal-cab"><b>${M.IND[x.k].corto || M.IND[x.k].nombre}</b><span>${M.texto(x.k, x.valor)} · tu normal ${M.texto(x.k, x.normal.med)} · z ${x.z >= 0 ? "+" : "−"}${fmt(Math.abs(x.z).toFixed(1))}</span></div>${grafNormal(yo.id, x.k, E.dia, true)}</div>`).join("")}
          <details class="regla"><summary>${ic("libro", "ic-sm")} Ver la regla (auditable)</summary><pre>${REGLA_YAML}</pre></details></div>
        <div class="tarjeta"><h3>${ic("check")} Protocolo FAT-01</h3>
          ${f.estado === "cerrado" ? `<p class="tenue-12">Cumplido. Evento cerrado.</p>` : !E.aceptado ? `<button class="btn btn-ancho" id="aceptar">${ic("check")} Aceptar protocolo</button>` : PROTOCOLO.map((t, i) => `<label class="paso-item"><input type="checkbox" data-paso="${i}" ${E.protocolo[i] ? "checked" : ""}/><span>${t}</span></label>`).join("")}</div>
        <div class="tarjeta"><h3>${ic("reloj")} Historial</h3><ol class="linea-tiempo">${hist.map((h) => `<li>${sem(h.f && h.f.estado === "cerrado" ? 0 : 1, "Día " + h.d)}<span>${h.d === f.desde ? "Se abre: las tres señales fuera de tu normal" : h.f && h.f.estado === "cerrado" ? "Se cierra: dos días en tu normal" : "Mejora, sigue en seguimiento"}</span></li>`).join("")}</ol>
          <div class="escalera">${["0 · Autocuidado", "1 · CMO", "2 · Cirujano", "3 · Junta"].map((t, i) => `<span class="${i === 0 ? "on" : ""}">${t}</span>`).join("")}</div>
          <p class="tenue-12">Si persiste 48 h o aparece un síntoma físico, pasa al nivel 1.</p></div>` : ""}
        ${otros.map((h) => `<div class="tarjeta"><div class="alerta-cab">${sem(h.nivel)}<h2>${h.titulo}</h2></div><p>${h.frase}</p><p class="tenue-12">${h.hacer} · Umbral: ${h.umbral}</p></div>`).join("")}`;
      const ac = $("#aceptar", p); if (ac) ac.addEventListener("click", () => { E.aceptado = true; encolar({ prio: 1, pid: yo.id, t: `FATIGA-03 de ${yo.nombre}: protocolo aceptado`, nivel: 1 }); aviso("Protocolo aceptado · reevaluación mañana 07:30"); ir("alertas"); });
      $$("[data-paso]", p).forEach((c) => c.addEventListener("change", () => { E.protocolo[c.dataset.paso] = c.checked; }));
    },
    signos(p) {
      const yo = P(), e = ev();
      p.innerHTML = `${sub("Signos y tendencias", "Últimos 14 días contra tu normal", "reportes")}
        <div class="signos-grid">${Object.keys(M.IND).map((k) => { const x = e.ind[k], v = valorDe(yo.id, k, x); return `<button class="tarjeta signo" data-ir="ficha-${k}"><div class="signo-cab"><b>${M.IND[k].corto || M.IND[k].nombre}</b>${sem(e.nivelDe(k), false)}</div><div class="signo-v">${v.v}<small> ${v.u}</small></div>${grafNormal(yo.id, k, E.dia, true)}</button>`; }).join("")}</div>`;
      registrarAcceso(yo.id, yo.id, "vitales");
    },
    pvt(p) {
      const yo = P();
      p.innerHTML = `${sub("Reflejos", "PVT-B · lapsos ≥ 355 ms", "reportes")}
        ${A.tarjetaNormal("lapsos")}
        <div class="tarjeta"><div id="pvt-zona" class="pvt-zona" role="button" tabindex="0">Toca para empezar la versión corta (20 s)</div>
          <p class="tenue-12">Toca en cuanto la zona se ponga morada. La prueba real dura 3 minutos.</p><div id="pvt-res"></div></div>`;
      const zona = $("#pvt-zona", p), res = $("#pvt-res", p);
      let fase = "inicio", t0 = 0, tims = [], rts = [], pronto = 0, fin = 0;
      const nuevo = () => { fase = "espera"; zona.className = "pvt-zona espera"; zona.textContent = "Espera…"; tims.push(setTimeout(() => { fase = "ya"; t0 = performance.now(); zona.className = "pvt-zona ya"; zona.textContent = "¡Toca!"; }, 900 + Math.random() * 1700)); };
      const terminar = () => {
        fase = "fin"; tims.forEach(clearTimeout); zona.className = "pvt-zona"; zona.textContent = "Toca para repetir";
        const lapsos = rts.filter((r) => r >= 355).length, vel = rts.length ? (rts.reduce((s, r) => s + 1000 / r, 0) / rts.length).toFixed(2) : "–";
        res.innerHTML = `<div class="dato">Estímulos <b>${rts.length}</b></div><div class="dato">Lapsos <b>${lapsos}</b></div><div class="dato">Velocidad media <b>${fmt(vel)} 1/s</b></div><div class="dato">Toques antes de tiempo <b>${pronto}</b></div>`;
        E.pvtHoy = { lapsos, n: rts.length };
        M.registrar(P().id, E.dia, "lapsos", lapsos, ahora());
        E.registros.unshift({ t: "Prueba de reflejos", v: `${lapsos} lapsos`, hora: ahora(), ic: "rayo" });
      };
      const tocar = () => {
        if (fase === "inicio" || fase === "fin") { rts = []; pronto = 0; fin = performance.now() + 20000; tims.push(setTimeout(terminar, 20000)); res.textContent = ""; return nuevo(); }
        if (fase === "espera") { pronto++; return; }
        if (fase === "ya") { rts.push(Math.round(performance.now() - t0)); zona.textContent = rts[rts.length - 1] + " ms"; if (performance.now() < fin) nuevo(); }
      };
      zona.addEventListener("pointerdown", tocar);
      zona.addEventListener("keydown", (x) => { if (x.key === " " || x.key === "Enter") { x.preventDefault(); tocar(); } });
      A.setLimpiar(() => tims.forEach(clearTimeout));
      void yo;
    },
    radiacion(p) {
      const yo = P(), cab = ev().cabina;
      const ver = M.PERSONAS.map((x) => [x, x.id === yo.id ? "✔" : acceso(yo.id, x.id, "dosis")]).filter(([, a]) => a !== "—");
      p.innerHTML = `${sub("Radiación y dosis", "Contra los límites de NASA [A]", "reportes")}
        <div class="tarjeta"><h3>${ic("rayo")} Tasa de dosis ahora <span class="espacio"></span>${chipSim()}</h3>
          <div class="valor-grande"><b>${cab.tasa.toLocaleString("es-ES")}</b><span class="u">µSv/h</span>${sem(cab.tasa >= 3000 ? 2 : cab.tasa > 54 ? 1 : 0)}</div>
          <p class="tenue-12">Atención > 54 µSv/h (1,3 mSv/día de diseño [A]). Refugio ≥ 3000 µSv/h, por verificar (alarma de la ISS; el umbral de la nave no es público).</p></div>
        <div class="tarjeta"><h3>${ic("fuego")} Dosis de la misión <span class="espacio"></span><span class="ref ref-A">${ic("escudo", "ic-sm")}NASA</span></h3>
          ${ver.map(([x, a]) => { const d = M.dosisPersonal(x.id, E.dia); return `<div class="dosis-fila"><span>${x.id === yo.id ? "Tú" : x.nombre}</span>${a === "◐" ? `<b>margen ${fmt((600 - d.mision).toFixed(1))} mSv</b>` : `<div class="barra"><i style="width:${(d.mision / 600) * 100}%"></i></div><b>${fmt(d.mision)}/600</b>`}</div>`; }).join("")}
          <p class="tenue-12">${chipSim("Dosis simulada")} Cada quien acumula distinto según el tiempo que pasa en módulos menos blindados. Límite de carrera < 600 mSv igual para todos [A].</p></div>
        ${E.dia >= 115 ? `<div class="tarjeta"><h3>${ic("rayo")} Dosis del evento solar del día 115 <span class="espacio"></span><span class="ref ref-A">${ic("escudo", "ic-sm")}NASA</span></h3>
          ${ver.map(([x, a]) => { const d = M.dosisPersonal(x.id, E.dia); return `<div class="dosis-fila"><span>${x.id === yo.id ? "Tú" : x.nombre}</span>${a === "◐" ? `<b>${d.evento < 250 ? "bajo el límite" : "sobre el límite"}</b>` : `<div class="barra"><i style="width:${Math.max(1, (d.evento / 250) * 100)}%"></i></div><b>${fmt(d.evento)}/250</b>`}</div>`; }).join("")}
          <p class="tenue-12">${chipSim("Dosis simulada")} Depende de cuánto tardó cada quien en llegar al refugio blindado. Límite < 250 mSv por evento [A]; ~95 % de los eventos solares no se acercan.</p></div>` : ""}
        <div class="tarjeta"><h3>${ic("planeta")} Eventos reales de 2024 <span class="espacio"></span><span class="ref ref-A">NASA DONKI</span></h3>
          <p class="tenue-12">119 eventos SEP en 2024; 71 con alerta emitida, con una mediana de 12 min de retraso. La columna es cuánto tardó la alerta.</p>
          ${DONKI.map((x) => `<div class="donki-fila">${x.modelo ? ic("estrella", "ic-sm ic-relleno") : ic("rayo", "ic-sm")}<span>${x.t}<small>${x.inst}</small></span><b>${x.lat} min</b></div>`).join("")}</div>`;
    },
    tierra(p) {
      const yo = P(), comoTierra = !!E.verTierra;
      const base = [];
      const fat = (d) => M.fatiga("MS-2", d);
      if (E.dia >= 112 && fat(112)) base.push({ prio: 1, pid: "MS-2", t: "FATIGA-03 de Ana · atención · con evidencia", dia: 112, hora: "07:46", nivel: 1 });
      for (let d = Math.max(110, E.dia - 3); d <= E.dia; d++) base.push({ prio: 2, t: "Resumen diario de la tripulación", dia: d, hora: "22:00", nivel: 0 });
      if (E.dia >= 114) base.push({ prio: 2, pid: "MS-2", t: "FATIGA-03 de Ana cerrada", dia: 114, hora: "07:50", nivel: 0 });
      const cola = [...E.colaExtra, ...base].sort((a, b) => a.prio - b.prio || b.dia - a.dia || (b.hora > a.hora ? 1 : -1));
      const ver = (x) => !x.pid || comoTierra || yo.id === CMO || yo.id === x.pid;
      const recibido = (x) => x.dia < E.dia || (x.prio > 0 && x.hora < "08:00");
      const nota = E.dia >= 114 && (yo.id === "MS-2" || yo.id === CMO || comoTierra);
      p.innerHTML = `${sub("Tierra", "18 min por trayecto · 36 ida y vuelta", "reportes")}
        <div class="segmento"><button data-vista="nave" aria-pressed="${!comoTierra}">A bordo</button><button data-vista="tierra" aria-pressed="${comoTierra}">Como el cirujano de vuelo</button></div>
        ${comoTierra ? `<div class="tarjeta"><h3>${ic("tierra")} Lo que ve Tierra</h3>${M.PERSONAS.map((x) => `<div class="persona-fila">${sem(ev(x.id).general, x.nombre)}<small>Estado al SCET D${E.dia} 07:42 · recibido 08:00 · antigüedad 18 min</small></div>`).join("")}
          <p class="tenue-12">Desde Tierra siempre se ve el pasado: nunca dice «estado actual», sino de cuándo es cada dato, ordenado por SCET.</p></div>` : ""}
        ${nota ? `<div class="tarjeta"><h3>${ic("tierra")} Nota del cirujano de vuelo <span class="espacio"></span><span class="ref ref-sim">hace 41 min</span></h3>
          <p class="cita">«Recomiendo priorizar el sueño de Ana y revalorar antes de la caminata espacial.»</p>
          <p class="tenue-12">Escrita sobre datos del SCET D112 07:46.</p>
          <div class="aviso-fijo">${ic("info", "ic-sm")}<span>Esta nota es anterior al cierre de FATIGA-03 (día 114). La decisión de a bordo es más reciente: <b>no se pisa en silencio</b>.</span></div></div>` : ""}
        <div class="tarjeta"><h3>${ic("cohete")} Cola hacia Tierra <span class="espacio"></span><small class="tenue-12">rojos → ámbares → resúmenes</small></h3>
          ${cola.slice(0, 8).map((x) => `<div class="cola-item">${sem(x.nivel, false)}<span>${ver(x) ? x.t : "Paquete médico de otra persona · privado"}<small>SCET D${x.dia} ${x.hora}</small></span><b class="${recibido(x) ? "ok" : ""}">${recibido(x) ? "recibido" : "en cola"}</b></div>`).join("")}</div>`;
      $$("[data-vista]", p).forEach((b) => b.addEventListener("click", () => { E.verTierra = b.dataset.vista === "tierra"; ir("tierra"); }));
    },
    cmo(p) {
      if (P().id !== CMO) { p.innerHTML = `${sub("Vista CMO", "", "reportes")}<p class="tenue-12">Solo la CMO (Mei) ve esta vista.</p>`; return; }
      M.PERSONAS.forEach((x) => registrarAcceso(CMO, x.id, "vitales"));
      const z = (pid, k) => { const x = M.estadoIndicador(pid, k, E.dia); return x.z == null ? "–" : fmt(x.z.toFixed(1)); };
      const tend = (pid) => { const s = M.SERIES[pid].animo, i = M.idx(E.dia), a = s.slice(i - 13, i - 6).reduce((x, y) => x + y, 0) / 7, b = s.slice(i - 6, i + 1).reduce((x, y) => x + y, 0) / 7; return b - a > 3 ? "↑ más estrés" : a - b > 3 ? "↓ menos estrés" : "→ estable"; };
      p.innerHTML = `${sub("Vista CMO", "Lo clínico de la tripulación · Mei", "reportes")}
        ${M.PERSONAS.map((x) => { const e = ev(x.id); return `<div class="tarjeta cmo-card"><div class="trip-cab"><span class="avatar" style="--c:${x.color}">${x.nombre[0]}</span><div><b>${x.nombre}</b><small>${x.rol}</small></div><span class="espacio"></span>${sem(e.general)}</div>
          <div class="cmo-datos"><span>Alertas<b>${e.alertas.map((a) => a.id).join(", ") || "—"}</b></span><span>Sueño z<b>${z(x.id, "sueno")}</b></span><span>Pulso z<b>${z(x.id, "fc")}</b></span><span>Ánimo semana<b>${tend(x.id)}</b></span></div>
          <button class="btn btn-sm btn-suave" data-eval="${x.id}">Registrar evaluación</button></div>`; }).join("")}
        <div class="tarjeta"><h3>${ic("candado")} Lo que no ves</h3><p class="tenue-12">El diario y el ciclo de cada persona solo con su permiso o en una emergencia. El ánimo diario, solo si la persona lo permite: ves la tendencia semanal.</p></div>
        ${E.evaluaciones.length ? grupo("Evaluaciones de hoy", E.evaluaciones.map((x) => fila({ ic: "check", t: x.quien, s: x.conducta, v: x.hora, sinFlecha: true }))) : ""}`;
      $$("[data-eval]", p).forEach((b) => b.addEventListener("click", () => {
        const x = quien(b.dataset.eval);
        abrirHoja(`<h2>Evaluar a ${x.nombre}</h2><textarea id="e-txt" class="area" rows="3" placeholder="Hallazgo"></textarea>
          <select id="e-con" class="area"><option>Autocuidado (nivel 0)</option><option>Seguimiento a bordo (nivel 1)</option><option value="tierra">Consultar a Tierra (nivel 2)</option></select>
          <button class="btn btn-ancho" id="e-ok">Registrar</button>`, (h) => $("#e-ok", h).addEventListener("click", () => {
          const c = $("#e-con", h); E.evaluaciones.unshift({ quien: x.nombre, conducta: c.options[c.selectedIndex].text, hora: ahora() });
          if (c.value === "tierra") encolar({ prio: 1, pid: x.id, t: `Consulta de la CMO sobre ${x.nombre}`, nivel: 1 });
          cerrarHoja(); aviso("Evaluación registrada"); ir("cmo");
        }));
      }));
    },

    // ===== Configuración =====
    ajustes(p) {
      const yo = P();
      const HITOS = [[112, "Fatiga"], [114, "Cierre y nota"], [115, "Evento solar"]];
      const tile = (ir2, icono, c, t, s) => `<button class="aj-tile" data-ir="${ir2}"><span class="aj-ic" style="--c:${c}">${ic(icono)}</span><b>${t}</b><small>${s}</small></button>`;
      p.innerHTML = `${titulo("Ajustes")}
        <section class="tarjeta aj-perfil">
          <div class="aj-quien"><span class="avatar" style="--c:${yo.color}">${yo.nombre[0]}</span><div><b>${yo.nombre}</b><small>${yo.id} · ${yo.rol}</small></div></div>
          <div><p class="aj-etq">Ver la app como</p><div class="aj-chips">${M.PERSONAS.map((x) => `<button data-persona="${x.id}" aria-pressed="${x.id === yo.id}" style="--c:${x.color}"><i></i>${x.nombre}</button>`).join("")}</div></div>
        </section>
        <section class="tarjeta">
          <p class="aj-etq">Día de misión</p>
          <div class="aj-dia"><button id="aj-menos" ${E.dia <= 106 ? "disabled" : ""} aria-label="Día anterior">‹</button>
            <span class="num"><b>${E.dia}</b><small>${fechaLarga(E.dia)}</small></span>
            <button id="aj-mas" ${E.dia >= M.ULTIMO_DIA ? "disabled" : ""} aria-label="Día siguiente">›</button></div>
          <div class="aj-hitos">${HITOS.map(([d, t]) => `<button data-hito="${d}" aria-pressed="${E.dia === d}"><b>${d}</b>${t}</button>`).join("")}</div>
        </section>
        <h3 class="aj-sec">Apariencia</h3>
        <div class="aj-temas">${[["auto", "Automático"], ["claro", "Claro"], ["oscuro", "Azul marino"]].map(([k, t]) => `<button data-tema="${k}" aria-pressed="${E.tema === k}"><span class="sw sw-${k}"></span>${t}</button>`).join("")}</div>
        <h3 class="aj-sec">Idioma · Language</h3>
        <div class="aj-temas aj-idioma" translate="no">${[["es", "ES", "Español"], ["en", "EN", "English"]].map(([k, c, t]) => `<button data-idioma="${k}" aria-pressed="${idiomaActual() === k}"><span class="aj-cod">${c}</span>${t}</button>`).join("")}</div>
        <h3 class="aj-sec">Preferencias</h3>
        <div class="aj-grid">
          ${tile("privacidad", "candado", "#19B074", "Privacidad", "Quién ve qué y quién vio tus datos")}
          ${tile("lunaconf", "luna", "#3D6BE0", "Lunna", "Humor, voz y su botón flotante")}
          ${tile("ayuda", "ayuda", "#0B8DB8", "Ayuda", "Tutoriales cortos")}
          ${tile("acerca", "info", "#6B7699", "Qué es real", "Fuentes y límites")}
        </div>
        <h3 class="aj-sec">Avisos</h3>
        <section class="tarjeta">
          <label class="aj-fila"><span><b>Recordatorios de medición</b><small>Check-in, presión y agua</small></span><input type="checkbox" class="interruptor" checked/></label>
          <label class="aj-fila"><span><b>Sin texto médico en la pantalla bloqueada</b><small>Siempre activo para cuidar tu privacidad</small></span><input type="checkbox" class="interruptor" checked disabled/></label>
        </section>
        <a class="btn btn-ancho btn-suave aj-demo" href="?demo">${ic("play")} Ver demo automática</a>`;
      $$("[data-persona]", p).forEach((b) => b.addEventListener("click", () => { E.persona = b.dataset.persona; mem.guardar("persona", E.persona); ir("ajustes"); }));
      $("#aj-menos", p).addEventListener("click", () => { E.dia--; ir("ajustes"); });
      $("#aj-mas", p).addEventListener("click", () => { E.dia++; ir("ajustes"); });
      $$("[data-hito]", p).forEach((b) => b.addEventListener("click", () => { E.dia = +b.dataset.hito; ir("ajustes"); }));
      $$("[data-tema]", p).forEach((b) => b.addEventListener("click", () => { E.tema = b.dataset.tema; mem.guardar("tema", E.tema); aplicarTema(); ir("ajustes"); }));
      $$("[data-idioma]", p).forEach((b) => b.addEventListener("click", () => { if (window.Lunna && window.Lunna.idioma) window.Lunna.idioma.poner(b.dataset.idioma); ir("ajustes"); }));
    },
    privacidad(p) {
      const yo = P();
      const visores = [[parejaDe(yo.id).id, `Pareja<small>${yo.pareja}</small>`], [CMO, "CMO<small>Mei</small>"], [COM, "Comand.<small>Tomás</small>"], ["tierra", "Cirujano<small>Tierra</small>"]].filter(([v], i, a) => a.findIndex((x) => x[0] === v) === i);
      const datos = Object.keys(MATRIZ).filter((d) => d !== "femenina" || yo.sexo === "M");
      p.innerHTML = `${sub("Privacidad", "Lo que ven de mí", "ajustes")}
        <div class="tarjeta tabla-env"><table class="tabla"><thead><tr><th></th>${visores.map(([v, n]) => `<th>${v === yo.id ? "Tú" : n}</th>`).join("")}</tr></thead>
          <tbody>${datos.map((d) => `<tr><td>${DATO[d]}</td>${visores.map(([v]) => `<td class="acc">${simb(v === yo.id ? "✔" : acceso(v, yo.id, d))}</td>`).join("")}</tr>`).join("")}</tbody></table></div>
        <p class="tenue-12 leyenda-acc">${simb("✔")} ve el dato · ${simb("◐")} resumen o estado · ${simb("🚨")} solo en emergencia · ${simb("✋")} con tu permiso · ${simb("—")} no lo ve</p>
        ${grupo("Tus permisos", [
          ...["diario", ...(yo.sexo === "M" ? ["femenina"] : [])].map((d) => `<label class="lista-fila"><span class="lf-ic" style="--c:#2BA36B">${ic("candado")}</span><span class="lf-txt"><b>${DATO[d]}</b><small>Compartir con la CMO y el cirujano de vuelo</small></span><input type="checkbox" class="interruptor" data-perm="${yo.id}:${d}" ${E.permisos[yo.id + ":" + d] ? "checked" : ""}/></label>`),
          `<label class="lista-fila bloqueada"><span class="lf-ic" style="--c:#E5484D">${ic("alerta")}</span><span class="lf-txt"><b>Riesgo de hacerte daño</b><small>Siempre se avisa a la CMO y al cirujano</small></span><input type="checkbox" class="interruptor" checked disabled/></label>`,
          `<label class="lista-fila bloqueada"><span class="lf-ic" style="--c:#E5484D">${ic("alerta")}</span><span class="lf-txt"><b>Emergencia roja</b><small>Solo lo necesario, por tiempo limitado</small></span><input type="checkbox" class="interruptor" checked disabled/></label>`,
        ], "Con 4 personas, quitar el nombre no basta para ser anónimo. Por eso no lo prometemos: cada rol ve solo lo que necesita.")}
        ${grupo("Quién vio mis datos", E.accesos.filter((a) => a.pid === yo.id).map((a) => fila({ ic: "usuario", c: "#5A6080", t: a.visor === "tierra" ? "Cirujano de vuelo" : quien(a.visor).nombre, s: DATO[a.dato], v: `día ${a.dia} · ${a.hora}`, sinFlecha: true })).concat(E.accesos.some((a) => a.pid === yo.id) ? [] : [`<div class="lista-vacia">Nadie todavía.</div>`]))}`;
      $$("[data-perm]", p).forEach((c) => c.addEventListener("change", () => { E.permisos[c.dataset.perm] = c.checked; aviso("Cambio de permiso registrado"); ir("privacidad"); }));
    },
    lunaconf(p) {
      const voces = ["Nada", "Seco", "Cálido", "Bromista"];
      p.innerHTML = `${sub("Lunna", "Tu asistente: redacta lo que el motor decidió", "ajustes")}
        <div class="tarjeta luna-conf"><div class="luna-aqui"></div><p>Las cifras vienen del motor de reglas; Lunna no las cambia ni agrega ninguna.</p></div>
        <div class="tarjeta"><h3>${ic("chispa")} Humor <span class="espacio"></span><b id="hum">${voces[E.humor]}</b></h3>
          <input class="deslizador" id="humor" type="range" min="0" max="3" value="${E.humor}" aria-label="Humor"/>
          <p class="tenue-12">El humor se apaga solo en ámbar y rojo: un chiste durante una alerta destruye la confianza.</p></div>
        ${grupo("", [
          `<label class="lista-fila"><span class="lf-ic" style="--c:#3D8BFF">${ic("voz")}</span><span class="lf-txt"><b>Voz</b><small>Lee en voz alta lo que Lunna dice</small></span><input type="checkbox" class="interruptor" id="voz" ${E.voz ? "checked" : ""}/></label>`,
          `<button class="lista-fila" id="rest"><span class="lf-ic" style="--c:#1F4FD8">${ic("luna")}</span><span class="lf-txt"><b>Regresar el botón flotante a su lugar</b><small>Se arrastra a cualquier borde</small></span></button>`,
        ])}`;
      LUNA.crear($(".luna-aqui", p), { cara: "feliz", accesorio: "estrella", tam: 72 });
      $("#humor", p).addEventListener("input", (x) => { E.humor = +x.target.value; mem.guardar("humor", E.humor); $("#hum", p).textContent = voces[E.humor]; });
      $("#voz", p).addEventListener("change", (x) => { E.voz = x.target.checked; mem.guardar("voz", E.voz); });
      $("#rest", p).addEventListener("click", () => A.reposicionarLuna());
    },
    acerca(p) {
      p.innerHTML = `${sub("Qué es real y qué es simulado", "", "ajustes")}
        <div class="tarjeta"><h3>${ic("escudo")} Real</h3><p class="tenue-12">Eventos solares de NASA DONKI y su latencia; umbrales de NASA-STD-3001; frecuencias del modelo IMM; criterios «Contact Surgeon» del checklist público JSC-48031.</p></div>
        <div class="tarjeta"><h3>${ic("planeta")} Simulado</h3><p class="tenue-12">Signos vitales, dosis, ubicación, datos de la cabina y de la comida. La tripulación (Tomás, Ana, Mei, Luis) es ficticia.</p></div>
        <div class="tarjeta"><h3>${ic("info")} Etiquetas</h3>
          <div class="chips"><span class="ref ref-A">${ic("escudo", "ic-sm")}NASA</span><span class="tenue-12">umbral oficial [A]</span></div>
          <div class="chips"><span class="ref ref-T">${ic("info", "ic-sm")}Tierra</span><span class="tenue-12">umbral clínico [T], no validado en el espacio</span></div>
          <div class="chips"><span class="etq etq-normal">tu normal</span><span class="tenue-12">tus últimos 14 días</span></div></div>
        <div class="aviso-fijo">${ic("alerta", "ic-sm")}<span>Lunna no es un dispositivo médico, no diagnostica y no sustituye a la CMO ni al cirujano de vuelo.</span></div>
        <p class="tenue-12 creditos">Equipo Monarcas · proyecto para NASA Space Apps Challenge 2026. Sin logos de NASA.</p>`;
    },
  };

  // ---------- Formularios de Registrar (hoja) ----------
  const guardar = (t, v, msj, icono) => { E.registros.unshift({ t, v, hora: ahora(), ic: icono }); cerrarHoja(); aviso(msj || "Guardado"); if (A.actual() === "registrar") ir("registrar"); };
  const FORM = {
    // Como un tensiómetro: sistólica (SYS) sobre diastólica (DIA) en mmHg, y el pulso (PUL) en lpm.
    presion: () => abrirHoja(`<h2>Presión arterial</h2><p class="tenue-12">Con el manguito: sentada/o, 5 min en reposo, brazo a la altura del corazón. Se anota sistólica / diastólica en mmHg. Umbral AHA [T].</p>
      <div class="tensiometro">
        <label class="tm-fila"><span class="tm-etq"><b>SYS</b>sistólica</span><input id="f-s" type="number" inputmode="numeric" placeholder="120" aria-label="Sistólica en mmHg"/><span class="tm-u">mmHg</span></label>
        <label class="tm-fila"><span class="tm-etq"><b>DIA</b>diastólica</span><input id="f-d" type="number" inputmode="numeric" placeholder="80" aria-label="Diastólica en mmHg"/><span class="tm-u">mmHg</span></label>
        <label class="tm-fila tm-pul"><span class="tm-etq"><b>PUL</b>pulso</span><input id="f-p" type="number" inputmode="numeric" placeholder="62" aria-label="Pulso en latidos por minuto (opcional)"/><span class="tm-u">lpm</span></label>
      </div>
      <button class="btn btn-ancho" id="f-ok">Guardar</button>`, (h) => $("#f-ok", h).addEventListener("click", () => { const s = +$("#f-s", h).value, d = +$("#f-d", h).value, pu = +$("#f-p", h).value; if (s < 60 || s > 250 || d < 30 || d > 160 || d >= s) return aviso("Revisa los números: la sistólica va arriba y es mayor"); if (pu && (pu < 30 || pu > 220)) return aviso("Revisa el pulso"); M.registrar(P().id, E.dia, "presion", s, ahora()); M.registrar(P().id, E.dia, "diastolica", d, ahora()); if (pu) M.registrar(P().id, E.dia, "pulso_manguito", pu, ahora()); guardar("Presión", `${s}/${d} mmHg${pu ? ` · pulso ${pu} lpm` : ""}`, s < 70 ? "Sistólica < 70: posible presíncope [A]. Avisa a la CMO." : s >= 140 ? "≥ 140: coméntalo hoy con la CMO [T]" : undefined, "corazon"); })),
    temp: () => abrirHoja(`<h2>Temperatura</h2><div class="campo"><input id="f-t" type="number" step="0.1" inputmode="decimal" placeholder="°C" aria-label="°C"/><button class="btn" id="f-ok">Guardar</button></div>`, (h) => $("#f-ok", h).addEventListener("click", () => { const t = +$("#f-t", h).value; if (t < 34 || t > 43) return aviso("Revisa el número"); M.registrar(P().id, E.dia, "temp_central", t, ahora()); guardar("Temperatura", fmt(t) + " °C", t >= 39.4 ? "≥ 39,4 °C: contacta a la CMO (umbral propuesto)" : undefined, "fuego"); })),
    agua: () => abrirHoja(`<h2>Agua</h2><p class="tenue-12">Meta: al menos 32 mL por kg al día [A].</p><div class="chips">${[150, 250, 500].map((m) => `<button class="chip" data-ml="${m}">+${m} mL</button>`).join("")}</div>`, (h) => $$("[data-ml]", h).forEach((b) => b.addEventListener("click", () => { E.agua += +b.dataset.ml; guardar("Agua", `+${b.dataset.ml} mL`, `Llevas ${E.agua} mL registrados hoy`, "gota"); }))),
    masa: () => abrirHoja(`<h2>Masa corporal</h2><p class="tenue-12">Del equipo de masa de la nave. Basal: ${P().masaKg} kg.</p><div class="campo"><input id="f-m" type="number" step="0.1" inputmode="decimal" placeholder="kg" aria-label="kg"/><button class="btn" id="f-ok">Guardar</button></div>`, (h) => $("#f-ok", h).addEventListener("click", () => { const m = +$("#f-m", h).value; if (m < 30 || m > 150) return aviso("Revisa el número"); guardar("Masa corporal", fmt(m) + " kg", (P().masaKg - m) / P().masaKg > 0.033 ? "Bajó más de 3,3 % de tu basal [A]: revisa tu energía con la CMO" : undefined, "pesa"); })),
    orina: () => abrirHoja(`<h2>Tira de orina</h2><p class="tenue-12">Toma una foto de la tira junto a su tabla de colores.</p>
      <label class="btn btn-ancho btn-suave">${ic("camara")} Abrir cámara o elegir foto<input id="f-foto" type="file" accept="image/*" capture="environment" hidden/></label><div id="f-res"></div>`, (h) => $("#f-foto", h).addEventListener("change", (x) => {
      const f = x.target.files[0]; if (!f) return;
      $("#f-res", h).innerHTML = `<img class="miniatura" src="${URL.createObjectURL(f)}" alt="Foto de la tira"/>${chipSim("Lectura experimental simulada")}
        <div class="dato">Densidad <b>1,025</b></div><div class="dato">Proteína <b>trazas</b></div><div class="dato">Leucocitos / nitritos <b>negativos</b></div>
        <p class="tenue-12">Orina concentrada: la proteína sola no es alarma (15 % de falsos positivos en orina concentrada). Toma agua y repite mañana.</p>
        <button class="btn btn-ancho" id="f-ok">Guardar lectura</button>`;
      $("#f-ok", h).addEventListener("click", () => guardar("Tira de orina", "densidad 1,025", undefined, "camara"));
    })),
    foto: () => abrirHoja(`<h2>Foto de piel o uñas</h2><p class="tenue-12">${ic("candado", "ic-sm")} Se guarda para la CMO solo si das permiso.</p>
      <label class="btn btn-ancho btn-suave">${ic("camara")} Abrir cámara<input id="f-foto" type="file" accept="image/*" capture="environment" hidden/></label>`, (h) => $("#f-foto", h).addEventListener("change", () => guardar("Foto", "guardada", undefined, "camara"))),
  };

  // Registro del día en Ciclo, con categorías como Clue
  function registrarCiclo(iso) {
    const C = E.ciclo, hoy = C.registro[iso] || [];
    const CAT = [
      ["Sangrado", "per", "gota", "#FF5A75", ["Manchado", "Ligero", "Medio", "Abundante"]],
      ["Dolor", "pms", "curita", "#9B6BFF", ["Cólicos", "Cabeza", "Ovulación", "Senos sensibles"]],
      ["Emociones", "emo", "chispa", "#F5A524", ["Feliz", "Sensible", "Triste", "Irritable"]],
      ["Energía", "fer", "rayo", "#1AA6D6", ["Con energía", "Cansada", "Agotada"]],
      ["Sueño", "dor", "luna", "#5B6CFF", ["Dormí bien", "Dormí mal", "Insomnio"]],
      ["Digestión", "dig", "ola", "#2BA36B", ["Náusea", "Hinchazón", "Estreñimiento"]],
    ];
    const cuenta = () => `${hoy.length || "Nada"} ${hoy.length === 1 ? "cosa marcada" : hoy.length ? "cosas marcadas" : "marcado todavía"}`;
    abrirHoja(`<div class="cat-cab"><h2>¿Cómo vas hoy?</h2><p>${fechaLarga(E.dia)} · <span id="c-cuenta">${cuenta()}</span></p></div>
      <p class="cat-priv">${ic("candado", "ic-sm")} Solo tú lo ves. No entra al juego.</p>
      ${CAT.map(([t, c, icono, col, ops]) => `<section class="cat" style="--cat:${col}"><h4>${ic(icono)}${t}</h4><div class="cat-ops">${ops.map((o) => `<button class="op" data-op="${o}" aria-pressed="${hoy.includes(o)}">${ic("check", "op-ok")}<span>${o}</span></button>`).join("")}</div></section>`).join("")}
      <button class="btn btn-ancho btn-ciclo" id="c-ok">${ic("check")} Guardar</button>`, (h) => {
      $$("[data-op]", h).forEach((b) => b.addEventListener("click", () => {
        b.setAttribute("aria-pressed", String(b.getAttribute("aria-pressed") !== "true"));
        const n = $$('[data-op][aria-pressed="true"]', h).length;
        $("#c-cuenta", h).textContent = `${n || "Nada"} ${n === 1 ? "cosa marcada" : n ? "cosas marcadas" : "marcado todavía"}`;
      }));
      $("#c-ok", h).addEventListener("click", () => {
        const sel = $$('[data-op][aria-pressed="true"]', h).map((b) => b.dataset.op);
        if (sel.length) C.registro[iso] = sel; else delete C.registro[iso];
        mem.guardar("ciclo", C); cerrarHoja(); aviso(sel.length ? `Registrado: ${sel.length} cosa${sel.length > 1 ? "s" : ""}` : "Sin registro hoy"); ir("ciclo");
      });
    });
  }

  // ---------- Panel de Lunna (todo lo de IA) ----------
  const lp = (t, cuerpo) => `<section class="lp"><h4>${t}</h4>${cuerpo}</section>`;
  A.panelLuna = {
    monitoreo(c) {
      const yo = P(), fc = M.estadoIndicador(yo.id, "fc", E.dia);
      c.innerHTML = lp("Qué mido sola", `<ul class="lp-lista">
          <li><b>Cada segundo</b> · pulso, SpO₂, respiración estimada, temperatura de piel, movimiento y latidos (HRV)</li>
          <li><b>Cada 5 s</b> · CO₂, oxígeno, temperatura, humedad, ruido y radiación de la cabina</li>
          <li><b>Tú me cuentas</b> · presión, glucosa, ánimo, comida, síntomas y tu ciclo</li></ul>`)
        + lp("Cómo decido qué es raro", `<p>Te comparo contigo, no con otra persona: <b>tu normal</b> es la mediana de tus últimos 14 días.</p>
          ${fc.normal ? `<p class="lp-dato">Tu pulso en reposo normal: <b>${M.texto("fc", fc.normal.med)}</b> · franja ${M.texto("fc", fc.normal.banda[0])} a ${M.texto("fc", fc.normal.banda[1])}</p>` : ""}
          <p>Una señal sola pide atención si se aleja 3 veces tu variación habitual. Tres señales juntas, desde 2 (regla FATIGA-03).</p>`)
        + lp("Lo que no hago", `<p>No diagnostico. No invento cifras: el motor de reglas decide y yo solo lo redacto. La SpO₂ de muñeca nunca es la única alerta.</p>`)
        + `<p class="no-diag">FUENTES: TRAMA eva.ble.v1 · MOTOR DE REGLAS · DATOS SIMULADOS</p>`;
    },
    clima(c) {
      const cab = ev().cabina;
      c.innerHTML = lp("Ahora", `<div class="lp-grande ${cab.solar ? "rojo" : ""}"><b>${cab.tasa.toLocaleString("es-ES")}</b> µSv/h ${sem(cab.tasa >= 3000 ? 2 : cab.tasa > 54 ? 1 : 0)}</div>
          <p>${cab.solar ? "Evento de partículas solares: <b>al refugio blindado</b>." : "Sin evento solar. "}Tu dosis de la misión: <b>${fmt(M.dosisPersonal(P().id, E.dia).mision)} de 600 mSv</b> [A] · simulada.</p>
          ${E.dia === 115 ? `<button class="lp-btn" data-ir="solar">Ver el evento solar y el buddy check</button>` : ""}`)
        + lp("Eventos reales · NASA DONKI 2024", `<p>119 eventos SEP; 71 con alerta emitida (mediana: 12 min de retraso). El del día 115 se modela sobre el primero.</p>${DONKI.map((x) => `<div class="lp-fila">${x.modelo ? "★" : "·"} <span>${x.t}<small>${x.inst}</small></span><b>${x.lat} min</b></div>`).join("")}`)
        + lp("Cabina", AMBIENTE(cab).map((a) => `<div class="lp-fila">${sem(a[4], false)}<span>${a[0]}<small>Límite ${a[3]} [A]</small></span><b>${a[1]} ${a[2]}</b></div>`).join(""));
    },
    procesa(c) {
      const yo = P(), e = ev(), fuera = Object.keys(M.IND).filter((k) => e.nivelDe(k) > 0).length;
      // Bug 10: salen de la frecuencia de la trama eva.ble.v1 (vitales 1/s, cabina 1 cada 5 s, latidos según tu pulso).
      const SEG = 86400, nf = (n) => n.toLocaleString("es-ES").replace(/\./g, " "); // miles con espacio fino: 86 400
      const fcMed = (M.estadoIndicador(P().id, "fc", E.dia).normal || { med: 60 }).med;
      c.innerHTML = lp("Hoy procesé · estimado por día", `<div class="lp-num"><div><b>${nf(SEG)}</b><small>lecturas de signos (1 por s)</small></div><div><b>${nf(SEG / 5)}</b><small>lecturas de cabina (1 cada 5 s)</small></div><div><b>${nf(Math.round(fcMed * 60 * 24))}</b><small>latidos (a tu pulso en reposo)</small></div><div><b>${Object.keys(M.IND).length}</b><small>indicadores contra tu normal</small></div><div><b>${fuera}</b><small>fuera de tu normal</small></div></div>`)
        + lp("El camino de un dato", `<ol class="lp-pasos"><li>Sensor → trama Bluetooth de 20 bytes</li><li>Valido: un dato estimado sin su margen se rechaza</li><li>Comparo contra tu normal de 14 días</li><li>Evalúo las reglas (FATIGA-03 y 10 condiciones en vivo)</li><li>Semáforo ● ■ ▲ y protocolo</li><li>Cola a Tierra por prioridad, con su hora de nave</li></ol>`)
        + lp("Por qué decido a bordo", `<p>NASA tardó 20 min en avisar del evento modelo, y la señal tarda otros 18 min hasta aquí. Cuando llega el aviso, la dosis ya empezó.</p>`)
        + `<p class="no-diag">${yo.nombre.toUpperCase()} · DÍA ${E.dia} · CIFRAS SIMULADAS</p>`;
    },
    biblioteca(c) {
      c.innerHTML = `<p class="lp-intro">Fichas sin conexión, ordenadas por frecuencia real en misión (modelo IMM de NASA).</p>`
        + BIBLIOTECA.map((b) => `<details class="lp-libro"><summary><b>${b.t}</b><small>${fmt(b.f)} por misión</small></summary><p>${b.que}</p><p><b>Qué hacer:</b> ${b.hacer} <span class="lp-etq">ilustrativo</span></p><p class="lp-cs"><b>Contact Surgeon:</b> ${b.cs}</p></details>`).join("")
        + `<p class="no-diag">CRITERIOS DEL CHECKLIST PÚBLICO JSC-48031 (2006): REFERENCIA, NO PROCEDIMIENTO VIGENTE</p>`;
    },
    hablar(c) {
      const yo = P(), n = ev().general, frase = M.lunaDice(yo.id, E.dia).resumen.replace(/<[^>]+>/g, "");
      const humor = n === 0 ? E.humor : 0;
      c.innerHTML = `<div class="lp-aviso">Soy un apoyo para registrar y ordenar lo que sientes. No soy psicóloga y no sustituyo a la CMO.</div>
        <div class="chat-lista" id="chat"><div class="msg msg-luna">${frase}</div></div>
        <div class="chat-campo"><input id="chat-in" placeholder="Escríbeme…" aria-label="Mensaje para Lunna"/><button id="chat-ok" aria-label="Enviar">${ic("atras", "voltear")}</button><button id="chat-voz" aria-label="Escuchar">${ic("voz")}</button></div>
        ${humor === 0 && E.humor > 0 ? `<p class="no-diag">HUMOR APAGADO: HAY UNA ALERTA</p>` : ""}`;
      const chat = $("#chat", c), input = $("#chat-in", c);
      let parado = false;
      const decir = (q, t) => { const d = document.createElement("div"); d.className = "msg msg-" + q; d.innerHTML = t; chat.append(d); chat.scrollTop = chat.scrollHeight; };
      const CRISIS = /(hacerme daño|matarme|no quiero vivir|suicid|quitarme la vida)/i;
      const enviar = () => {
        const t = input.value.trim(); if (!t || parado) return; input.value = ""; decir("yo", t.replace(/</g, "&lt;"));
        // La crisis la detecta una regla, nunca el modelo: la conversación se detiene.
        if (CRISIS.test(t)) { parado = true; input.disabled = true; E.crisis = true; encolar({ prio: 0, pid: yo.id, t: "Alerta crítica de salud mental", nivel: 2 }); return decir("alerta", `${sem(2, "Contacta a la CMO ahora")}<br>Ya avisé a Mei y encolé un mensaje prioritario a Tierra. Aquí me detengo: esto lo atienden personas.`); }
        const r = ["Te escucho. Lo guardo en tu diario privado. ¿Qué crees que lo provocó?", "Gracias por contármelo. ¿Quieres que lo veamos con la CMO o prefieres solo registrarlo?", "Lo anoto. Si se repite varios días, te propongo hablarlo con Mei."];
        setTimeout(() => decir("luna", r[chat.children.length % 3]), 350);
      };
      $("#chat-ok", c).addEventListener("click", enviar); input.addEventListener("keydown", (x) => { if (x.key === "Enter") enviar(); });
      $("#chat-voz", c).addEventListener("click", () => {
        if (!E.voz) return aviso("La voz está apagada en Ajustes → Lunna");
        if (!("speechSynthesis" in window)) return aviso("Este navegador no tiene voz");
        const u = new SpeechSynthesisUtterance(frase); u.lang = "es-MX"; speechSynthesis.cancel(); speechSynthesis.speak(u);
      });
    },
  };

  // Hoja para cambiar de tripulante y de día (se abre desde el avatar de Inicio)
  A.abrirCambio = () => {
    const yo = P(), HITOS = [[112, "Fatiga"], [114, "Cierre y nota"], [115, "Evento solar"]];
    abrirHoja(`<h2>Ver la app como</h2>
      <div class="cambio-lista">${M.PERSONAS.map((x) => `<button class="cambio-p" data-p="${x.id}" aria-pressed="${x.id === yo.id}"><span class="avatar" style="--c:${x.color}">${x.nombre[0]}</span><span><b>${x.nombre}</b><small>${x.rol}</small></span>${x.id === yo.id ? ic("check", "cambio-ok") : ""}</button>`).join("")}</div>
      <h2 class="cambio-t2">Día de misión</h2>
      <div class="aj-dia"><button id="cb-menos" ${E.dia <= 106 ? "disabled" : ""} aria-label="Día anterior">‹</button><span class="num"><b>${E.dia}</b><small>${fechaLarga(E.dia)}</small></span><button id="cb-mas" ${E.dia >= M.ULTIMO_DIA ? "disabled" : ""} aria-label="Día siguiente">›</button></div>
      <div class="aj-hitos">${HITOS.map(([d, t]) => `<button data-hito="${d}" aria-pressed="${E.dia === d}"><b>${d}</b>${t}</button>`).join("")}</div>`, (h) => {
      const listo = () => { cerrarHoja(); ir("hoy"); };
      $$("[data-p]", h).forEach((b) => b.addEventListener("click", () => { E.persona = b.dataset.p; mem.guardar("persona", E.persona); listo(); }));
      $("#cb-menos", h).addEventListener("click", () => { E.dia--; A.abrirCambio(); ir("hoy"); });
      $("#cb-mas", h).addEventListener("click", () => { E.dia++; A.abrirCambio(); ir("hoy"); });
      $$("[data-hito]", h).forEach((b) => b.addEventListener("click", () => { E.dia = +b.dataset.hito; listo(); }));
    });
  };

  Object.assign(A.PANTALLAS, PANT);
  A.iniciarSolar = iniciarSolar;
  A.cerrarSolar = cerrarSolar;
  const q = new URLSearchParams(location.search);
  if (q.get("persona") && quien(q.get("persona"))) E.persona = q.get("persona");
  if (q.get("dia") && +q.get("dia") >= 106 && +q.get("dia") <= M.ULTIMO_DIA) E.dia = +q.get("dia");
  if (q.get("tema")) { E.tema = q.get("tema"); aplicarTema(); }
  A.iniciar(q.get("pantalla") || undefined);
  // Para presentar: ?organo=corazon abre el panel de ese órgano; ?lunna abre el panel de Lunna
  if (q.get("clic")) setTimeout(() => { const b = document.getElementById(q.get("clic")); if (b) b.click(); }, 700); // para capturas: ?clic=reg-ciclo
  if (q.get("scroll")) setTimeout(() => { $("#pantalla").scrollTop = +q.get("scroll"); }, 600); // para capturas: ?scroll=600
  const abrirYa = (sel) => setTimeout(() => $$(sel).forEach((x) => x.classList.add("abierto")), 700);
  if (q.get("organo")) setTimeout(() => { const b = $(`.esc-regiones [data-region="${q.get("organo")}"]`); if (b) { b.click(); abrirYa(".hud"); } }, 400);
  if (q.has("lunna")) setTimeout(() => { const b = $(".luna-boton"); if (b) { b.click(); abrirYa(".luna-panel, .luna-velo"); } }, 400);
})();
