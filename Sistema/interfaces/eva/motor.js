/* Motor de la maqueta: tripulación simulada, "tu normal", semáforo, FATIGA-03 y lo que Lunna dice.
 *
 * Es la lógica del módulo 1 de app/ (React) traída al formato de la maqueta: JavaScript sin
 * dependencias. Todo es SIMULADO. Funciona en el navegador (window.MOTOR) y en Node (pruebas).
 *
 * Reglas (ERS de Lunna):
 *  - Tu normal = 14 días anteriores, mínimo 7 con dato. z robusto = 0,6745 · (x − mediana) / MAD.
 *  - MAD nunca menor que la variación mínima creíble del indicador (si no, falsas alarmas).
 *  - Una señal sola contra tu normal pide atención con |z| ≥ 3. FATIGA-03 junta tres señales con
 *    z ≥ 2: "ninguna señal sola dispararía; las tres juntas, sí" (RF-02-04, CU-02).
 *  - El evento se cierra con 2 días seguidos en z < 2 (RF-02-07).
 *  - Tu normal nunca da rojo por sí sola: el rojo lo dan umbrales [A] o [T].
 *  - Si hay referencia del motor de padecimientos (alertas-motor.js), sustituye a tu normal: ver README.
 */
(function (raiz) {
  "use strict";

  const PRIMER_DIA = 98;
  const ULTIMO_DIA = 115;
  const DIAS = Array.from({ length: ULTIMO_DIA - PRIMER_DIA + 1 }, (_, i) => PRIMER_DIA + i);
  const idx = (dia) => dia - PRIMER_DIA;

  function rng(semilla) {
    let a = semilla >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const redondo = (x, d) => Math.round(x * 10 ** d) / 10 ** d;

  // ------------------------------------------------------------------ indicadores
  // region: dónde se pinta en el cuerpo. seccion: pantalla de la maqueta que abre (o la ficha).
  const IND = {
    sueno: {
      nombre: "Sueño", unidad: "h", dec: 1, region: "cabeza", proc: "calculado", dir: "bajo", madMin: 0.25, seccion: "sueno", icono: "luna", varId: "03:V30",
      porQue: "Dormir poco varios días seguidos baja los reflejos y la concentración, justo antes de tareas críticas.",
      como: "Movimiento de la muñeca (Cole-Kripke) más los botones «me acuesto» y «me levanto». 4 % de error en las pruebas del equipo.",
      espacio: "En la ISS se duermen 6,09 h de media y el 43,8 % de las noches son de menos de 6 h (n = 21).",
    },
    lapsos: {
      nombre: "Reflejos (PVT-B)", corto: "Reflejos", unidad: "lapsos", dec: 0, region: "cabeza", proc: "manual", dir: "alto", madMin: 1, icono: "rayo", varId: "03:V66",
      porQue: "Los lapsos de atención (respuestas de más de 355 ms) suben con el cansancio, antes de que una lo note.",
      como: "Prueba de 3 minutos en pantalla: tocar en cuanto aparece el estímulo.",
      espacio: "La ISS usa esta prueba (Reaction Self Test, n = 24): la velocidad cae con 6 h de sueño o menos.",
    },
    animo: {
      nombre: "Ánimo (estrés del check-in)", corto: "Ánimo", unidad: "/100", dec: 0, region: "cabeza", proc: "manual", dir: "alto", madMin: 4, icono: "chispa", varId: "03:V9",
      porQue: "El aislamiento y el encierro pesan. Notar a tiempo que el estrés sube permite hablarlo antes de que crezca.",
      como: "Escala de 0 a 100 en el check-in diario. Es privado: la CMO solo ve la tendencia semanal.",
      espacio: "En la ISS, el estrés autoinformado está entre los mejores predictores de los reflejos (n = 24).",
    },
    fc: {
      nombre: "Pulso en reposo", unidad: "lpm", dec: 0, region: "corazon", proc: "calculado", dir: "alto", madMin: 1.5, seccion: "corazon", icono: "corazon", varId: "01:V3",
      abs: { tipo: "T", nivel: (v) => (v > 100 ? 1 : 0), texto: "> 100 lpm en reposo (taquicardia, clínico terrestre)" },
      porQue: "Si el pulso en reposo sube varios días seguidos, el cuerpo está cargando con algo: poco sueño, estrés, deshidratación o una infección que empieza.",
      como: "Lo calcula Lunna: la mediana de los 30 minutos con el pulso más bajo durante el sueño. 0,8 % de error frente al ECG.",
      espacio: "En reposo no cambia de forma clara en vuelo (n = 8). Por eso se compara contigo misma o mismo.",
    },
    hrv: {
      nombre: "Variabilidad del pulso (HRV)", corto: "HRV", unidad: "ms", dec: 0, region: "corazon", proc: "calculado", dir: "bajo", madMin: 4, icono: "ola", varId: "03:V17",
      porQue: "Mide cuánto descansa el sistema nervioso. Si baja de tu normal, te estás recuperando peor.",
      como: "RMSSD nocturno con filtro de artefactos. Si más del 10 % de los latidos salen mal, esa noche no cuenta.",
      espacio: "Varía mucho entre personas sanas (33 a 113 ms en las pruebas): un número fijo no sirve, solo tu normal.",
    },
    presion: {
      nombre: "Presión arterial", corto: "Presión", unidad: "mmHg", dec: 0, region: "corazon", proc: "manual", dir: "alto", icono: "gota", varId: "01:V1", sinNormal: true,
      abs: { tipo: "T", nivel: (v) => (v >= 140 ? 2 : v >= 130 ? 1 : 0), texto: "Sistólica < 130 normal · 130–139 atención · ≥ 140 alta (AHA, clínico terrestre)", url: "https://www.heart.org/en/health-topics/high-blood-pressure/understanding-blood-pressure-readings" },
      porQue: "Sin gravedad la sangre sube hacia la cabeza y el corazón trabaja distinto. Al volver a la gravedad, la presión puede caer al ponerse de pie.",
      como: "Manguito del botiquín; se anota a mano.",
      espacio: "La sistólica de 24 h baja unos 8 a 14 mmHg en vuelo (n = 8–12).",
    },
    spo2: {
      nombre: "Oxígeno en sangre (SpO₂)", corto: "SpO₂", unidad: "%", dec: 0, region: "pulmones", proc: "sensor", dir: "bajo", icono: "gota", varId: "04:A3", sinNormal: true,
      abs: { tipo: "T", propuesta: true, nivel: (v) => (v <= 88 ? 2 : v <= 92 ? 1 : 0), texto: "≤ 92 % atención · ≤ 88 % urgente (propuesta del equipo, no oficial)" },
      aviso: "La de muñeca puede sobreestimar cuando el oxígeno está bajo: confirma con el pulsioxímetro del botiquín.",
      porQue: "Una caída avisa de un problema para respirar o de poco oxígeno en la cabina.",
      como: "Sensor óptico de la muñeca, cada segundo.",
      espacio: "NASA fija el límite sobre el aire de la cabina, no sobre la SpO₂ de la persona.",
    },
    fr: {
      nombre: "Respiración", unidad: "rpm", dec: 0, region: "pulmones", proc: "estimado", dir: "alto", madMin: 1, icono: "ola", varId: "04:A2", ic: 3,
      porQue: "Respirar más rápido de lo normal en reposo puede acompañar una infección o poco oxígeno.",
      como: "Estimada a partir del pulso (Smart Fusion). Por lectura apenas sirve; como valor diario el error es de 1,3 rpm.",
      espacio: "Rango clínico terrestre de 12 a 18 por minuto; se compara contigo.",
    },
    glucosa: {
      nombre: "Glucosa en ayunas", corto: "Glucosa", unidad: "mg/dL", dec: 0, region: "abdomen", proc: "manual", dir: "alto", seccion: "glucosa", icono: "gota", varId: "02:V86", sinNormal: true,
      abs: { tipo: "T", nivel: (v) => (v >= 126 ? 2 : v >= 100 ? 1 : 0), texto: "< 100 normal · 100–125 atención · ≥ 126 alta (ADA, clínico terrestre)", url: "https://diabetes.org/about-diabetes/diagnosis" },
      porQue: "En vuelo el cuerpo responde peor a la insulina. Vigilar la glucosa ayuda a ajustar comida y ejercicio.",
      como: "Glucómetro de dedo, anotado a mano. No se sabe qué glucómetro hay a bordo.",
      espacio: "La resistencia a la insulina sube hasta un 60 % (n = 8).",
    },
    temperatura: {
      nombre: "Temperatura de piel", corto: "Temperatura", unidad: "°C", dec: 1, region: "piel", proc: "sensor", dir: "alto", madMin: 0.15, icono: "fuego", varId: "04:A1",
      porQue: "Si sube junto con el pulso, puede ser el inicio de una infección: el sistema inmune funciona peor en el espacio.",
      como: "Sensor en la muñeca. Es de piel, no central: solo vale contra tu normal. La fiebre se confirma con termómetro.",
      espacio: "La temperatura central sube cerca de 1 °C en vuelos largos (n = 11).",
    },
  };

  // Regiones del cuerpo con su peligro del HRP (ERS M1).
  const REGIONES = {
    cabeza: { nombre: "Cabeza", peligro: "Aislamiento y confinamiento", ind: ["sueno", "lapsos", "animo"] },
    ojos: { nombre: "Ojos", peligro: "Gravedad alterada", ind: [], nota: "La vista (SANS) se revisa con equipo especializado o en Tierra: no hay dato a bordo." },
    corazon: { nombre: "Corazón", peligro: "Gravedad alterada", ind: ["fc", "hrv", "presion"] },
    pulmones: { nombre: "Pulmones", peligro: "Ambiente cerrado", ind: ["spo2", "fr"], cabina: "co2" },
    abdomen: { nombre: "Abdomen", peligro: "Ambiente cerrado", ind: ["glucosa"], metas: ["agua"] },
    rinones: { nombre: "Riñones y vejiga", peligro: "Gravedad alterada", ind: [], metas: ["agua"], nota: "Tira de orina: sin registro hoy. La densidad se lee junto con la proteína." },
    musculos: { nombre: "Huesos y músculos", peligro: "Gravedad alterada", ind: [], metas: ["ejercicio"] },
    piel: { nombre: "Piel", peligro: "Ambiente cerrado", ind: ["temperatura"] },
    radiacion: { nombre: "Todo el cuerpo · radiación", peligro: "Radiación", ind: [], cabina: "radiacion" },
    femenina: { nombre: "Salud femenina", peligro: "—", ind: [], privada: true, nota: "Privado: solo tú lo ves. Ciclo, anticonceptivos y ajuste de tu normal por fase del ciclo (módulo 11)." },
  };

  // ------------------------------------------------------------------ tripulación
  const BASES = {
    "MS-1": { sueno: 6.6, lapsos: 2, animo: 28, fc: 56, hrv: 58, sis: 118, dia: 76, spo2: 97.5, fr: 14, glucosa: 91, temperatura: 33.4 },
    "MS-2": { sueno: 7.08, lapsos: 2, animo: 30, fc: 58, hrv: 62, sis: 112, dia: 72, spo2: 97.6, fr: 14, glucosa: 88, temperatura: 33.6 },
    "MS-3": { sueno: 6.4, lapsos: 3, animo: 34, fc: 61, hrv: 49, sis: 110, dia: 70, spo2: 97.8, fr: 15, glucosa: 86, temperatura: 33.5 },
    "MS-4": { sueno: 6.2, lapsos: 2, animo: 26, fc: 63, hrv: 41, sis: 134, dia: 84, spo2: 97.2, fr: 15, glucosa: 92, temperatura: 33.3 },
  };
  const RUIDO = { sueno: 0.45, animo: 5, fc: 1.6, hrv: 5, sis: 4, dia: 2, spo2: 0.6, fr: 1, glucosa: 5, temperatura: 0.12 };

  const PERSONAS = [
    { id: "MS-2", nombre: "Ana", sexo: "M", rol: "Especialista de misión", pareja: "Luis", masaKg: 62, color: "#E0457B" },
    { id: "MS-4", nombre: "Luis", sexo: "H", rol: "Ingeniero de vuelo", pareja: "Ana", masaKg: 84, color: "#FF8A3D" },
    { id: "MS-3", nombre: "Mei", sexo: "M", rol: "CMO (médica de a bordo)", pareja: "Tomás", masaKg: 58, color: "#2BA36B" },
    { id: "MS-1", nombre: "Tomás", sexo: "H", rol: "Comandante", pareja: "Mei", masaKg: 78, color: "#4FD2E9" },
  ];

  function mediana(xs) {
    const s = [...xs].sort((a, b) => a - b);
    const m = s.length >> 1;
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  }
  function tuNormal(previos, madMin) {
    const xs = previos.slice(-14).filter((x) => x != null);
    if (xs.length < 7) return null;
    const med = mediana(xs);
    const mad = Math.max(mediana(xs.map((x) => Math.abs(x - med))), madMin || 0);
    if (!mad) return null;
    const ancho = (2 * mad) / 0.6745;
    return { med, mad, banda: [med - ancho, med + ancho] };
  }
  const zDe = (x, n) => (0.6745 * (x - n.med)) / n.mad;
  /** Valor que da un z concreto, redondeado hacia fuera para no quedarse corto. */
  function valorParaZ(n, z, dec) {
    const v = n.med + (z * n.mad) / 0.6745;
    const f = 10 ** dec;
    return z >= 0 ? Math.ceil(v * f) / f : Math.floor(v * f) / f;
  }

  function generar(p, semilla) {
    const r = rng(semilla);
    const ruido = (a) => (r() * 2 - 1) * a;
    const b = BASES[p.id];
    const s = { sueno: [], lapsos: [], animo: [], fc: [], hrv: [], presion: [], diastolica: [], spo2: [], fr: [], glucosa: [], temperatura: [], ejercicio: [], agua: [] };
    for (const d of DIAS) {
      s.sueno.push(redondo(b.sueno + ruido(RUIDO.sueno), 1));
      s.lapsos.push(Math.max(0, b.lapsos + [-1, 0, 0, 1][Math.floor(r() * 4)]));
      s.animo.push(Math.round(b.animo + ruido(RUIDO.animo)));
      s.fc.push(Math.round(b.fc + ruido(RUIDO.fc)));
      s.hrv.push(Math.round(b.hrv + ruido(RUIDO.hrv)));
      s.presion.push(Math.round(b.sis + ruido(RUIDO.sis)));
      s.diastolica.push(Math.round(b.dia + ruido(RUIDO.dia)));
      s.spo2.push(Math.round(b.spo2 + ruido(RUIDO.spo2)));
      s.fr.push(Math.round(b.fr + ruido(RUIDO.fr)));
      s.glucosa.push(d % 2 === 0 ? Math.round(b.glucosa + ruido(RUIDO.glucosa)) : null); // cada dos días
      s.temperatura.push(redondo(b.temperatura + ruido(RUIDO.temperatura), 1));
      s.ejercicio.push(Math.round(82 + ruido(14)));
      s.agua.push(redondo((32 * p.masaKg * (0.85 + r() * 0.25)) / 1000, 1));
    }
    return s;
  }

  /** Arco de Ana (CU-02): noches cortas 110–111; día 112 FATIGA-03; 113 mejora; 114 se cierra. */
  function arcoAna(s) {
    const fijar = (k, dia, v) => { s[k][idx(dia)] = v; };
    fijar("sueno", 110, 6.1);
    fijar("sueno", 111, 6.0);
    const n = (k, dia) => tuNormal(s[k].slice(0, idx(dia)), IND[k].madMin);
    fijar("sueno", 112, valorParaZ(n("sueno", 112), -2.4, 1));
    fijar("lapsos", 112, Math.max(Math.round(n("lapsos", 112).med + (2.2 * n("lapsos", 112).mad) / 0.6745), Math.ceil(n("lapsos", 112).med + (2 * n("lapsos", 112).mad) / 0.6745)));
    fijar("fc", 112, valorParaZ(n("fc", 112), 2.0, 0));
    fijar("hrv", 112, Math.round(n("hrv", 112).med - 14));
    fijar("animo", 112, Math.round(n("animo", 112).med + 8));
    fijar("sueno", 113, redondo(n("sueno", 113).med - 0.4, 1));
    fijar("lapsos", 113, Math.round(n("lapsos", 113).med + 1));
    fijar("fc", 113, Math.round(n("fc", 113).med + 1));
    fijar("sueno", 114, redondo(n("sueno", 114).med + 0.3, 1));
    fijar("lapsos", 114, Math.round(n("lapsos", 114).med));
    fijar("fc", 114, Math.round(n("fc", 114).med));
  }

  const SERIES = {};
  PERSONAS.forEach((p, i) => {
    SERIES[p.id] = generar(p, 101 + i * 37);
    if (p.id === "MS-2") arcoAna(SERIES[p.id]);
  });

  // ------------------------------------------------------------------ cabina
  // ESTADO.solarCerrado: la app lo pone en true cuando la tripulación cierra el evento del día 115 (11:31).
  const ESTADO = { solarCerrado: false };
  function cabina(dia) {
    const r = rng(1000 + dia);
    const solar = dia === 115 && !ESTADO.solarCerrado;
    return {
      co2: redondo(2.1 + (r() - 0.5) * 0.4, 1), // mmHg · [A] ≤ 3 promedio de 1 h
      tasa: solar ? 6000 : Math.round(20 + (r() - 0.5) * 6), // µSv/h · [A] diseño < 54
      dosisMision: Math.round(dia * 0.48 + (solar ? 1.6 : 0)), // mSv · [A] carrera < 600
      solar,
    };
  }
  // ------------------------------------------------------------------ dosis personal (bug 9)
  // SIMULADA. Misma cabina para todos, pero cada quien pasa distinto tiempo en módulos menos
  // blindados (factor) y tarda distinto en llegar al refugio el día 115 (minutos fuera).
  const FACTOR_DOSIS = { "MS-1": 1.02, "MS-2": 1.0, "MS-3": 0.97, "MS-4": 1.06 };
  const MIN_AL_REFUGIO = { "MS-1": 3, "MS-2": 2, "MS-3": 5, "MS-4": 2 }; // Mei llega 11:09 en el escenario
  const DURACION_EVENTO_MIN = 27, TASA_EVENTO = 6000, BLINDAJE_REFUGIO = 0.1; // supuestos del escenario
  /** Dosis del evento solar del día 115 para una persona, en mSv (0 antes del evento). */
  function dosisEvento(pid, dia) {
    if (dia < 115) return 0;
    const fuera = MIN_AL_REFUGIO[pid] ?? 3;
    const uSv = (TASA_EVENTO * fuera) / 60 + (TASA_EVENTO * BLINDAJE_REFUGIO * (DURACION_EVENTO_MIN - fuera)) / 60;
    return redondo(uSv / 1000, 2);
  }
  /** Dosis acumulada de la misión (mSv) y del evento solar (mSv) de una persona. */
  function dosisPersonal(pid, dia) {
    const evento = dosisEvento(pid, dia);
    return { mision: redondo(dia * 0.48 * (FACTOR_DOSIS[pid] ?? 1) + evento, 1), evento, minAlRefugio: MIN_AL_REFUGIO[pid] ?? 3 };
  }

  /** Evento real de DONKI que sirve de modelo al evento solar del día 115 (ERS CU-03). */
  const DONKI = {
    id: "2024-05-11T02:10:00-SEP-001", instrumento: "GOES-P SEISS > 100 MeV", latenciaMin: 20,
    url: "https://ccmc.gsfc.nasa.gov/DONKI/view/SEP/30714/-1",
  };

  // ------------------------------------------------------------------ registros del día
  // Lo que la persona anota (check-in, presión, PVT-B, glucómetro…) reemplaza el valor simulado de
  // ese día. Es una capa encima de SERIES: no la modifica, y se puede limpiar.
  const REG = {}; // "pid|dia|k" -> { valor, hora }
  const clave = (pid, dia, k) => `${pid}|${dia}|${k}`;
  function registrar(pid, dia, k, valor, hora) {
    if (valor == null || Number.isNaN(+valor)) return;
    REG[clave(pid, dia, k)] = { valor: +valor, hora: hora || null };
  }
  const registro = (pid, dia, k) => REG[clave(pid, dia, k)] || null;
  function limpiarRegistros() { for (const c of Object.keys(REG)) delete REG[c]; }
  /** La serie de una variable con los registros de esa persona encima. */
  function serieCon(pid, k) {
    let out = null;
    for (const c of Object.keys(REG)) {
      const [p, d, kk] = c.split("|");
      if (p !== pid || kk !== k) continue;
      const i = idx(+d);
      if (i < 0 || i >= DIAS.length) continue;
      if (!SERIES[pid][k]) continue; // variables sin serie (termómetro, masa) solo se guardan
      out = out || SERIES[pid][k].slice();
      out[i] = REG[c].valor;
    }
    return out || SERIES[pid][k];
  }

  // ------------------------------------------------------------------ ciclo menstrual (RF-02-11)
  // La app dice en qué fase está cada persona (null si no aplica: hombres o supresión menstrual).
  // En fase lútea el pulso en reposo sube y la HRV baja de forma normal; para no dar falsas alarmas,
  // tu normal se ensancha 1,5× en esas dos variables. 🔶 Factor propuesto por el equipo, sin validar.
  let faseCiclo = () => null;
  function configurarCiclo(fn) { faseCiclo = typeof fn === "function" ? fn : () => null; }
  const AJUSTE_LUTEA = { fc: 1.5, hrv: 1.5 };

  // ------------------------------------------------------------------ referencia del motor de padecimientos
  // La conecta alertas-motor.js (GET /api/padecimientos/referencias). fn(pid, k, valor) devuelve
  // { fuera, texto, tipo, simulado, ... } o null. null (sin backend o sin referencia) → tu normal de siempre.
  let refMotor = () => null;
  function configurarReferencia(fn) { refMotor = typeof fn === "function" ? fn : () => null; }

  // ------------------------------------------------------------------ evaluación
  function estadoIndicador(pid, k, dia) {
    const ind = IND[k];
    const serie = serieCon(pid, k);
    const i = idx(dia);
    const valor = serie[i];
    let ultimo = null;
    for (let j = i; j >= 0; j--) if (serie[j] != null) { ultimo = { valor: serie[j], dia: PRIMER_DIA + j }; break; }
    const vigente = valor != null ? valor : ultimo && dia - ultimo.dia <= 1 ? ultimo.valor : null;
    let normal = ind.sinNormal ? null : tuNormal(serie.slice(0, i), ind.madMin);
    let ajusteCiclo = false;
    if (normal && AJUSTE_LUTEA[k] && faseCiclo(pid, dia) === "lutea") {
      const mad = normal.mad * AJUSTE_LUTEA[k], ancho = (2 * mad) / 0.6745;
      normal = { ...normal, mad, banda: [normal.med - ancho, normal.med + ancho] };
      ajusteCiclo = true;
    }
    const historia = serie.slice(Math.max(0, i - 14), i + 1);
    const registrado = registro(pid, dia, k);
    if (vigente == null) return { k, valor, ultimo, normal, z: null, nivel: null, motivo: null, historia, registrado, ajusteCiclo, refMotor: null };
    const z = normal ? zDe(vigente, normal) : null;
    const malo = z == null ? 0 : ind.dir === "alto" ? z : -z;
    let rm = null;
    try { rm = refMotor(pid, k, vigente) || null; } catch (e) { rm = null; }
    const porNormal = rm ? (rm.fuera ? 1 : 0) : malo >= 3 ? 1 : 0;
    const porAbs = ind.abs ? ind.abs.nivel(vigente) : 0;
    const nivel = Math.max(porNormal, porAbs);
    const motivo = nivel === 0 ? null : porAbs >= porNormal ? ind.abs.tipo : rm ? "motor" : "tu_normal";
    return { k, valor, ultimo, normal, z, nivel, motivo, historia, registrado, ajusteCiclo, refMotor: rm };
  }

  const SENALES_FATIGA = ["sueno", "lapsos", "fc"];
  function fatigaDia(pid, dia) {
    const es = SENALES_FATIGA.map((k) => estadoIndicador(pid, k, dia));
    const peores = es.map((e) => (e.z == null ? 0 : IND[e.k].dir === "alto" ? e.z : -e.z));
    return { es, todas: peores.every((m) => m >= 2), ninguna: peores.every((m) => m < 2) };
  }
  /** FATIGA-03 con su ciclo de vida: se abre con las tres señales; se cierra con 2 días en z < 2. */
  function fatiga(pid, dia) {
    let abierto = null;
    let bajos = 0;
    for (let d = PRIMER_DIA + 7; d <= dia; d++) {
      const f = fatigaDia(pid, d);
      if (!abierto && f.todas) { abierto = { desde: d }; bajos = 0; continue; }
      if (abierto) {
        bajos = f.ninguna ? bajos + 1 : 0;
        if (bajos >= 2) { if (d === dia) return { estado: "cerrado", desde: abierto.desde, hoy: f }; abierto = null; }
      }
    }
    if (!abierto) return null;
    return { estado: dia === abierto.desde ? "abierto" : "mejorando", desde: abierto.desde, diasBajos: bajos, hoy: fatigaDia(pid, dia) };
  }

  /** Todo lo que hace falta para pintar a una persona un día. */
  function evaluar(pid, dia) {
    const ind = {};
    for (const k of Object.keys(IND)) ind[k] = estadoIndicador(pid, k, dia);
    const f = fatiga(pid, dia);
    const cab = cabina(dia);
    const alertas = [];
    if (f && f.estado !== "cerrado") alertas.push({ id: "FATIGA-03", nivel: 1, senales: SENALES_FATIGA, fatiga: f });
    if (cab.solar) alertas.push({ id: "RADIACION", nivel: 2, senales: [] });
    // El nivel que se pinta: el propio o el de una alerta abierta en la que participa.
    const nivelDe = (k) => {
      const e = ind[k];
      const deAlerta = alertas.filter((a) => a.senales.includes(k)).map((a) => a.nivel);
      if (e.nivel == null && !deAlerta.length) return null;
      return Math.max(e.nivel || 0, ...deAlerta);
    };
    const regiones = {};
    for (const [r, def] of Object.entries(REGIONES)) {
      let niveles = def.ind.map(nivelDe).filter((n) => n != null);
      if (def.cabina === "co2") niveles.push(cab.co2 > 3 ? 1 : 0);
      if (def.cabina === "radiacion") niveles.push(cab.tasa >= 3000 ? 2 : cab.tasa > 54 ? 1 : 0);
      if (def.metas && !niveles.length) niveles = [0];
      regiones[r] = niveles.length ? Math.max(...niveles) : null;
    }
    const todos = [...Object.keys(IND).map(nivelDe), ...alertas.map((a) => a.nivel)].filter((n) => n != null);
    return { pid, dia, ind, nivelDe, alertas, fatiga: f, cabina: cab, regiones, general: todos.length ? Math.max(...todos) : 0 };
  }

  // ------------------------------------------------------------------ lo que Lunna dice
  const fmt = (v, dec) => (dec ? v.toFixed(dec) : String(Math.round(v))).replace(".", ",");
  const horas = (h) => { const hh = Math.floor(h); const mm = Math.round((h - hh) * 60); return mm ? `${hh} h ${String(mm).padStart(2, "0")}` : `${hh} h`; };
  const texto = (k, v) => (k === "sueno" ? horas(v) : k === "lapsos" ? `${fmt(v, 0)} lapso${Math.round(v) === 1 ? "" : "s"}` : `${fmt(v, IND[k].dec)} ${IND[k].unidad}`);
  const zTxt = (z) => (z >= 0 ? "+" : "−") + Math.abs(z).toFixed(1).replace(".", ",");

  /**
   * Convierte lo que el motor vio en frases. No decide nada: solo cuenta las señales, sus
   * números contra tu normal y la regla que se cumplió (RS-01: avisa, no diagnostica).
   */
  function lunaDice(pid, dia) {
    const ev = evaluar(pid, dia);
    const p = PERSONAS.find((x) => x.id === pid);
    const hallazgos = [];

    if (ev.cabina.solar) {
      hallazgos.push({
        id: "RADIACION", nivel: 2, titulo: "Evento de partículas solares",
        frase: "La radiación subió de golpe. <b>Dirígete al refugio blindado ahora.</b>",
        evidencia: [`Tasa de dosis: ${ev.cabina.tasa.toLocaleString("es-ES")} µSv/h (diseño < 54) [A]`, `Tu dosis de la misión: ${fmt(dosisPersonal(pid, dia).mision, 1)} de 600 mSv · del evento: ${fmt(dosisPersonal(pid, dia).evento, 2)} de 250 mSv [A]`],
        hacer: "Sigue el protocolo de refugio y confirma a tu pareja del buddy check (" + p.pareja + ").",
        umbral: "[A] NASA-STD-3001", referencia: "[A] NASA-STD-3001", simulado: true,
      });
    }

    const f = ev.fatiga;
    if (f) {
      const lineas = f.hoy.es.map((e) => {
        const ind = IND[e.k];
        const nombre = ind.corto || ind.nombre;
        return `${nombre}: ${texto(e.k, e.valor)} · tu normal ${texto(e.k, e.normal.med)} · z ${zTxt(e.z)}`;
      });
      if (f.estado === "abierto") {
        hallazgos.push({
          id: "FATIGA-03", nivel: 1, titulo: "Fatiga acumulada",
          frase: "Ninguna de estas señales sola me preocuparía; <b>las tres juntas, sí</b>. Es el patrón de fatiga acumulada que conviene atender antes de la caminata espacial (en 36 h).",
          evidencia: lineas,
          hacer: "Protege tu ventana de sueño de 8,5 h esta noche, evita cafeína 6 h antes de dormir y repite el PVT-B mañana a las 07:30 antes de decidir la caminata.",
          umbral: "Regla del equipo · tu normal (z ≥ 2 en las tres)", referencia: "respecto a tu base (14 días)",
        });
      } else if (f.estado === "mejorando") {
        hallazgos.push({
          id: "FATIGA-03", nivel: 1, titulo: "Fatiga: vas mejorando",
          frase: `Desde el día ${f.desde} vigilo tu fatiga. Hoy las señales bajaron; si mañana siguen así, cierro el aviso.`,
          evidencia: lineas, hacer: "Sigue con la ventana de 8,5 h. Reevalúo mañana a las 07:30.",
          umbral: "Se cierra con 2 días seguidos en z < 2", referencia: "respecto a tu base (14 días)",
        });
      } else {
        hallazgos.push({
          id: "FATIGA-03", nivel: 0, titulo: "Fatiga: aviso cerrado",
          frase: `Dos días seguidos en tu normal: cierro el aviso de fatiga que abrí el día ${f.desde}. ¡Bien hecho!`,
          evidencia: lineas, hacer: "Nada más que hacer. La caminata espacial puede seguir según lo planeado.",
          umbral: "Cerrado: 2 días en z < 2", referencia: "respecto a tu base (14 días)",
        });
      }
    }

    for (const k of Object.keys(IND)) {
      const e = ev.ind[k];
      if (!e.nivel || (f && f.estado !== "cerrado" && SENALES_FATIGA.includes(k))) continue;
      const ind = IND[k];
      const valor = k === "presion" ? `${e.ultimo.valor}/${serieCon(pid, "diastolica")[idx(e.ultimo.dia)]} mmHg` : texto(k, e.ultimo.valor);
      const rm = e.refMotor;
      const nom = (ind.corto || ind.nombre).toLowerCase();
      const esMotor = e.motivo === "motor", esNormal = e.motivo === "tu_normal";
      hallazgos.push({
        id: k.toUpperCase(), nivel: e.nivel, titulo: ind.nombre,
        frase: esNormal
          ? `Tu ${nom} se alejó bastante de tu normal.`
          : esMotor
            ? `Tu ${nom} está fuera de ${rm.tipo === "poblacional" ? "lo normal según la referencia poblacional" : "tu base prevuelo"} del motor de padecimientos.`
            : `Tu ${nom} está en la zona de ${e.nivel === 2 ? "alerta" : "atención"} de un umbral clínico de Tierra, no validado en el espacio.`,
        evidencia: esMotor ? [`Hoy: ${valor}`, rm.texto]
          : [`Hoy: ${valor}`, ind.abs ? ind.abs.texto : `Tu normal: ${texto(k, e.normal.med)}`, ...(!esNormal && rm && rm.fuera ? [rm.texto] : [])],
        hacer: e.nivel === 2 ? "Coméntalo hoy con la CMO." : "Mídelo otra vez en reposo mañana. Si sigue así, coméntalo con la CMO.",
        umbral: esMotor ? "motor de padecimientos" : esNormal ? "tu normal" : `[${e.motivo}]${ind.abs && ind.abs.propuesta ? " · propuesta" : ""}`,
        referencia: esMotor ? rm.texto : esNormal ? "respecto a tu base (14 días)" : `umbral [${ind.abs.tipo}]: ${ind.abs.texto}`,
      });
    }

    // Lo que va bien, con números: también es información.
    const bien = [];
    const s = ev.ind.sueno, fc = ev.ind.fc, l = ev.ind.lapsos;
    if (s.valor != null && ev.nivelDe("sueno") === 0) bien.push(`dormiste ${horas(s.valor)} (tu normal ${horas(s.normal.med)})`);
    if (fc.valor != null && ev.nivelDe("fc") === 0) bien.push(`tu pulso en reposo está en ${fc.valor} lpm, como siempre`);
    if (l.valor != null && ev.nivelDe("lapsos") === 0) bien.push(`tus reflejos están en tu normal (${texto("lapsos", l.valor)})`);

    const n = hallazgos.filter((h) => h.nivel > 0).length;
    let resumen;
    if (ev.general === 2) resumen = "<b>Hay algo que atender ahora.</b> Te digo qué vi y qué hacer.";
    else if (n) resumen = `Todo va bien, pero hay <b>${n}</b> cosa${n > 1 ? "s" : ""} que vale la pena mirar hoy.`;
    else resumen = "¡Todo en tu normal hoy! Sigue así.";
    const cara = ev.general === 2 ? (ev.cabina.solar ? "radiacion" : "alerta") : n ? "tranquila" : "feliz";

    return { resumen, hallazgos, bien, cara, nivel: ev.general };
  }

  const API = { ESTADO, dosisPersonal, dosisEvento, configurarCiclo, configurarReferencia, AJUSTE_LUTEA, registrar, registro, limpiarRegistros, serieCon, PRIMER_DIA, ULTIMO_DIA, DIAS, IND, REGIONES, PERSONAS, SERIES, DONKI, idx, tuNormal, zDe, mediana, cabina, estadoIndicador, fatiga, evaluar, lunaDice, horas, texto };
  if (typeof module !== "undefined" && module.exports) module.exports = API;
  else raiz.MOTOR = API;
})(typeof window !== "undefined" ? window : globalThis);
