/* Datos SIMULADOS de la maqueta. Ninguno viene de un astronauta ni del reloj real.
 * Semilla fija: la maqueta muestra siempre lo mismo. Las cifras de referencia citan su origen
 * (catálogos 02 y 03 del equipo; [A] = NASA, [T] = clínico terrestre). */
(function () {
  "use strict";

  function rng(semilla) {
    let a = semilla >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const r = rng(20261114);
  const entre = (a, b) => a + r() * (b - a);
  const redondo = (x, d) => Math.round(x * 10 ** (d || 0)) / 10 ** (d || 0);

  const PERFIL = { nombre: "Ana", edad: 35, masaKg: 62, dia: 112, mision: "Tránsito a Marte" };
  const FC_MAX = redondo(208 - 0.7 * PERFIL.edad); // Tanaka

  // Sueño: 7 noches (la última es "anoche"). ISS: 6,09 ± 0,67 h; oportunidad planificada 8,5 h.
  const noches = ["L", "M", "X", "J", "V", "S", "D"].map((d, i) => ({
    dia: d,
    horas: redondo(i === 6 ? 6.1 : entre(5.4, 7.3), 1),
  }));
  const sueno = {
    noches,
    anoche: { horas: 6.1, cama: 7.4, eficiencia: 82, latencia: 18, waso: 41, despertares: 4 },
    lineaBase: 6.4,
  };

  // Glucosa continua: cada 15 min durante 24 h, con tres comidas.
  const glucosa = [];
  for (let i = 0; i < 96; i++) {
    const h = i / 4;
    let g = 92 + Math.sin(i / 7) * 4 + entre(-3, 3);
    // Tres comidas; la de mediodía da un pico que sale del rango (como pasa en la vida real).
    for (const [comida, pico] of [[7.5, 55], [13, 100], [19.5, 60]]) {
      const dt = h - comida;
      if (dt > 0 && dt < 3) g += pico * Math.exp(-((dt - 0.8) ** 2) / 0.35);
    }
    glucosa.push({ h, mg: Math.round(g) });
  }

  // Alimentos de ejemplo por porción: valores APROXIMADOS para la maqueta (la app real usará la API de USDA).
  const alimentos = [
    { id: "avena", nombre: "Avena", icono: "tazon", kcal: 166, prot: 6, carb: 28, sodio: 9, calcio: 21, hierro: 2.1 },
    { id: "huevo", nombre: "Huevo", icono: "huevo", kcal: 148, prot: 10, carb: 2, sodio: 145, calcio: 66, hierro: 1.3 },
    { id: "tortilla", nombre: "Tortilla", icono: "tortilla", kcal: 146, prot: 4, carb: 25, sodio: 360, calcio: 60, hierro: 1.6 },
    { id: "pollo", nombre: "Pollo", icono: "pierna", kcal: 198, prot: 37, carb: 0, sodio: 89, calcio: 18, hierro: 1.3 },
    { id: "arroz", nombre: "Arroz", icono: "arroz", kcal: 195, prot: 4, carb: 42, sodio: 2, calcio: 15, hierro: 1.8 },
    { id: "espinaca", nombre: "Espinaca", icono: "hoja", kcal: 21, prot: 3, carb: 3, sodio: 63, calcio: 122, hierro: 3.2 },
    { id: "estofado", nombre: "Estofado", icono: "olla", kcal: 245, prot: 18, carb: 18, sodio: 940, calcio: 30, hierro: 2.4 },
    { id: "nueces", nombre: "Nueces", icono: "nuez", kcal: 185, prot: 4, carb: 4, sodio: 1, calcio: 28, hierro: 0.8 },
  ];
  const comidasHoy = ["avena", "huevo", "tortilla", "pollo", "arroz"];

  // Fuerza: peso muerto en ARED, 6 sesiones. 1RM previo al vuelo = 1,6 × masa (mínimo NASA para EVA en superficie).
  const unoRMPre = redondo(1.6 * PERFIL.masaKg, 1);
  const ared = Array.from({ length: 6 }, (_, i) => {
    const carga = redondo(0.75 * unoRMPre * (1 - 0.01 * i) + entre(-1.5, 1.5), 1);
    return { sesion: i + 1, carga, reps: 8, series: 3 };
  }).reverse();

  // Referencias que muestra la maqueta (con su tipo de umbral).
  const REF = {
    kcal: { meta: 3035, tipo: "A", texto: "100 % del requerimiento; 3035 kcal/día por defecto (NASA-STD-3001)" },
    sodio: { min: 1500, max: 2300, tipo: "A", texto: "1500–2300 mg/día (requisito NASA 2020)" },
    calcio: { min: 1000, max: 1200, tipo: "A", texto: "1000–1200 mg/día (NASA)" },
    proteina: { min: 1.2, max: 1.8, tipo: "A", texto: "1,2–1,8 g/kg/día (NASA)" },
    sueno: { min: 7, max: 9, tipo: "T", texto: "7–9 h en adultos; en astronautas <6 h se asocia a peor desempeño" },
    glucosa: { min: 70, max: 180, tipo: "T", texto: "Rango 70–180 mg/dL: terrestre, no validado en microgravedad" },
    fuerza: { min: 1.6, tipo: "A", texto: "Peso muerto ≥ 1,6 × peso corporal para EVA en superficie (NASA)" },
    fcmax: { valor: FC_MAX, tipo: "T", texto: `FC máxima estimada: 208 − 0,7 × edad = ${FC_MAX} lpm (Tanaka)` },
  };

  // Signos vitales de Ana: su NORMAL (línea base) y el valor al que caen en el escenario de emergencia.
  // Todo simulado. Clase de emergencia: hipoxia (riesgo que NASA rastrea: "Risk of Hypoxia").
  const VITALES = [
    { id: "spo2", nombre: "SpO₂", unidad: "%", base: 97, crisis: 84, icono: "gota", decimales: 0 },
    { id: "fc", nombre: "Pulso", unidad: "lpm", base: 62, crisis: 128, icono: "corazon", decimales: 0 },
    { id: "resp", nombre: "Respiración", unidad: "rpm", base: 14, crisis: 26, icono: "ola", decimales: 0 },
    { id: "pas", nombre: "Presión", unidad: "mmHg", base: 116, crisis: 94, icono: "rayo", decimales: 0, extra: (v) => `/${Math.round(v * 0.64)}` },
    { id: "temp", nombre: "Temperatura", unidad: "°C", base: 36.6, crisis: 36.8, icono: "fuego", decimales: 1 },
  ];
  const TRIPULACION = { paciente: "Ana", cmo: "Mei", comandante: "Tomás", retrasoTierraMin: 12 };

  window.DATOS = { PERFIL, FC_MAX, sueno, glucosa, alimentos, comidasHoy, ared, unoRMPre, REF, VITALES, TRIPULACION, rng };
})();
