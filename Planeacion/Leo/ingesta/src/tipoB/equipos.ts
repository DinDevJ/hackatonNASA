/**
 * Equipos de la nave sin dataset abierto (decisión D4-A: simulación controlada, semilla fija) para el
 * astronauta simulado SIM-01, más las variables inferidas que dependen de ellos:
 *   02:V75 SLAMMD · 02:V44 ARED · 02:V54 CEVIS · 02:V55 T2
 *   02:V43 1RM inferido con Epley (decisión del usuario)
 *   02:V51 VO₂máx inferido con dos métodos lado a lado (decisión del usuario)
 *   02:V73 sin dato: requiere implementar la prueba en la app
 * Cada parámetro cita la cifra publicada de la que sale (referencias del catálogo 02, verificadas).
 */
import { readFileSync } from "node:fs";
import type { AstronautVariableReading, SalidaTipo } from "../contrato.js";
import { isoRelativo, normal, redondear, rng } from "../util.js";
import { lecturaB } from "./catalogo.js";

const SEMILLA = 20261115;
const SIM = "Simulación controlada SIM-01, semilla 20261115";
const SEMANAS = 12;

// Supuestos del astronauta simulado (los mismos que en Tipo A donde aplica):
const EDAD = 45;
const MASA_PRE = 77.2; // kg — media de los 14 astronautas de Moore 2014, doi:10.1152/japplphysiol.01251.2013
const VO2PICO_PRE = 40.6; // mL/kg/min — misma fuente
const FC_REPOSO = 60; // lpm — supuesto (igual que V52 en Tipo A)
const FC_MAX = 208 - 0.7 * EDAD; // Tanaka (decisión D5-1); Moore 2014: la FC pico no cambia en vuelo
const PESO_MUERTO_1RM_PRE = 1.6 * MASA_PRE; // 1,6× = mínimo NASA para EVA en superficie, 02[3] Tabla 4.6-1

/** Masa del día d (1…84): −2,8 % en los primeros 30 días y luego estable (SLAMMD, n=25, 02[29]). */
const masaReal = (d: number) => MASA_PRE * (1 - 0.028 * Math.min(d, 30) / 30);

function slammd(r: () => number): AstronautVariableReading[] {
  const out: AstronautVariableReading[] = [];
  for (let s = 0; s <= SEMANAS; s++) {
    const d = s * 7 + 1;
    out.push(
      lecturaB("V75", {
        valor: redondear(normal(r, masaReal(d), 0.3), 1),
        timestamp: isoRelativo(d, "07:30"),
        naturaleza_dato: "directa",
        origen_dato: "simulado_controlado",
        fuente_referencia: `${SIM} — Zwart et al. 2014, doi:10.3357/asem.3979.2014 (02[29])`,
        observaciones: `Masa previa ${MASA_PRE} kg; −2,8 % en 30 días y luego estable (SLAMMD, n=25). Ruido de medición ±0,3 kg (🔶 supuesto; no publicado).`,
      }),
    );
  }
  return out;
}

/** ARED: peso muerto 3 días/semana, 3 series × 8 rep al ~75 % del 1RM vigente (🔶 prescripción supuesta). */
function ared(r: () => number): AstronautVariableReading[] {
  const out: AstronautVariableReading[] = [];
  const reps = 8;
  for (let s = 0; s < SEMANAS; s++) {
    for (const dia of [1, 3, 5]) {
      const d = s * 7 + dia;
      // Fuerza en vuelo: −6,9 % (extensores de rodilla con ARED, 02[7]) repartido en 12 semanas.
      const unoRM = PESO_MUERTO_1RM_PRE * (1 - 0.069 * (d / (SEMANAS * 7)));
      const series = [0, 1, 2].map(() => redondear(normal(r, 0.75 * unoRM, 1.5), 1));
      const maxima = Math.max(...series);
      const volumen = series.reduce((a, w) => a + w * reps, 0);
      const ts = isoRelativo(d, "15:00");
      const fuente = `${SIM} — 02[1][2] (ARED), 02[7] (−6,9 % fuerza con ARED)`;
      out.push(
        lecturaB("V44", { nombre_detalle: "carga máxima de la sesión (peso muerto)", unidad: "kg", valor: maxima, timestamp: ts, naturaleza_dato: "directa", origen_dato: "simulado_controlado", fuente_referencia: fuente, observaciones: `3 series × ${reps} rep: ${series.join(", ")} kg.` }),
        lecturaB("V44", { nombre_detalle: "volumen de la sesión (peso muerto)", unidad: "kg·rep", valor: redondear(volumen, 0), timestamp: ts, naturaleza_dato: "calculada", origen_dato: "simulado_controlado", fuente_referencia: fuente, observaciones: "Σ carga × repeticiones." }),
        lecturaB("V43", {
          valor: redondear((maxima * (1 + reps / 30)) / masaReal(d), 2),
          timestamp: ts,
          naturaleza_dato: "inferida",
          origen_dato: "simulado_controlado",
          fuente_referencia: `${fuente}; Epley: 1RM = carga × (1 + rep/30)`,
          observaciones: `Epley sobre la serie más pesada (${maxima} kg × ${reps} rep) dividido entre la masa del día. Estimación, no medición: no se encontró validación de Epley en ARED ni en microgravedad; la exactitud de estas ecuaciones se estudió en Tierra (LeSuer et al. 1997, doi:10.1519/00124278-199711000-00001).`,
        }),
      );
    }
  }
  return out;
}

/** CEVIS 37 % de los días y T2 47 % de los días (n=46, 178 d — 02[2]). */
function aerobico(r: () => number): AstronautVariableReading[] {
  const out: AstronautVariableReading[] = [];
  for (let d = 1; d <= SEMANAS * 7; d++) {
    if (r() < 0.37) {
      const w = Math.round(normal(r, 137, 15));
      const min = Math.round(normal(r, 26, 3));
      const ts = isoRelativo(d, "09:00");
      const f = `${SIM} — 02[2] (CEVIS: media 137 W, pico 191 W, 26 min/sesión, 37 % de los días)`;
      out.push(
        lecturaB("V54", { nombre_detalle: "potencia media", unidad: "W", valor: Math.min(w, 191), timestamp: ts, naturaleza_dato: "directa", origen_dato: "simulado_controlado", fuente_referencia: f, observaciones: "Ruido ±15 W (🔶 supuesto), tope en el pico publicado." }),
        lecturaB("V54", { nombre_detalle: "duración", unidad: "min", valor: min, timestamp: ts, naturaleza_dato: "directa", origen_dato: "simulado_controlado", fuente_referencia: f }),
      );
    }
    if (r() < 0.47) {
      const ts = isoRelativo(d, "17:00");
      const arnesLb = Math.min(127, Math.max(107, normal(r, 117, 5)));
      const arnesKg = arnesLb * 0.45359237;
      const f = `${SIM} — 02[1][2] (T2: 7±1 mph, arnés 117 lb [107–127], 27 min, 47 % de los días)`;
      out.push(
        lecturaB("V55", { nombre_detalle: "velocidad", unidad: "mph", valor: redondear(normal(r, 7, 1), 1), timestamp: ts, naturaleza_dato: "directa", origen_dato: "simulado_controlado", fuente_referencia: f }),
        lecturaB("V55", { nombre_detalle: "carga del arnés", unidad: "kg", valor: redondear(arnesKg, 1), timestamp: ts, naturaleza_dato: "directa", origen_dato: "simulado_controlado", fuente_referencia: f }),
        lecturaB("V55", { nombre_detalle: "carga del arnés como % del peso corporal", unidad: "% peso corporal", valor: redondear((arnesKg / masaReal(d)) * 100, 1), timestamp: ts, naturaleza_dato: "calculada", origen_dato: "simulado_controlado", fuente_referencia: f, observaciones: "Referencia publicada: 68 % del peso corporal." }),
        lecturaB("V55", { nombre_detalle: "duración", unidad: "min", valor: Math.round(normal(r, 27, 3)), timestamp: ts, naturaleza_dato: "directa", origen_dato: "simulado_controlado", fuente_referencia: f }),
      );
    }
  }
  return out;
}

/** Regresión lineal simple y = a + b·x. */
function recta(xs: number[], ys: number[]): { a: number; b: number } {
  const mx = xs.reduce((s, x) => s + x, 0) / xs.length;
  const my = ys.reduce((s, y) => s + y, 0) / ys.length;
  const b = xs.reduce((s, x, i) => s + (x - mx) * (ys[i]! - my), 0) / xs.reduce((s, x) => s + (x - mx) ** 2, 0);
  return { a: my - b * mx, b };
}

/** VO₂máx con los dos métodos, a partir de la FC de las etapas de V52 (out/tipoA.json, SIM-01). */
function vo2max(rutaTipoA: string): AstronautVariableReading[] {
  const a = JSON.parse(readFileSync(rutaTipoA, "utf8")) as SalidaTipo;
  const v52 = a.sujetos.find((s) => s.sujeto === "SIM-01")?.lecturas.filter((l) => l.id === "02:V52") ?? [];
  const out: AstronautVariableReading[] = [];
  for (const momento of ["prevuelo L-60", "vuelo día 15"]) {
    const etapas = v52
      .filter((l) => l.nombre.includes(momento))
      .map((l) => ({ pct: Number(/etapa (\d+) %/.exec(l.nombre)?.[1]), fc: l.valor as number, ts: l.timestamp }));
    if (etapas.length < 3) continue;
    // VO₂ de cada etapa: % del VO₂pico previo (el protocolo fija la carga por % del VO₂pico previo, 02[8]).
    const vo2 = etapas.map((e) => (e.pct / 100) * VO2PICO_PRE);
    const { a: a0, b } = recta(etapas.map((e) => e.fc), vo2);
    const extrapolado = a0 + b * FC_MAX;
    const uth = 15.3 * (FC_MAX / FC_REPOSO);
    const ts = etapas.at(-1)!.ts;
    out.push(
      lecturaB("V51", {
        nombre_detalle: `extrapolación FC–VO₂ (${momento})`,
        valor: redondear(extrapolado, 1),
        timestamp: ts,
        naturaleza_dato: "inferida",
        origen_dato: "simulado_controlado",
        fuente_referencia: "Etapas de 02:V52 (SIM-01) — Åstrand y Ryhming 1954, doi:10.1152/jappl.1954.7.2.218; NASA 02[8]",
        observaciones: `Recta FC vs. VO₂ de 3 etapas (VO₂ por etapa = % × ${VO2PICO_PRE}, VO₂pico previo de Moore 2014) extendida hasta FCmáx ${redondear(FC_MAX, 1)} lpm (Tanaka). NASA: útil para el grupo, no exacto para el individuo (02[8]). Moore 2014 midió −17 % de VO₂pico al inicio del vuelo.`,
      }),
      lecturaB("V51", {
        nombre_detalle: `razón de Uth (${momento})`,
        valor: redondear(uth, 1),
        timestamp: ts,
        naturaleza_dato: "inferida",
        origen_dato: "simulado_controlado",
        fuente_referencia: "Uth et al. 2004, doi:10.1007/s00421-003-0988-y",
        observaciones: `15,3 × FCmáx/FCreposo = 15,3 × ${redondear(FC_MAX, 1)}/${FC_REPOSO}. Validada en 46 hombres entrenados en Tierra (error ≈4,5 %). La FC de reposo en vuelo no se simuló (se usa ${FC_REPOSO} en ambos momentos), por eso este método no detecta el desacondicionamiento: limitación del método con estos datos.`,
      }),
    );
  }
  return out;
}

function destreza(): AstronautVariableReading[] {
  return [
    lecturaB("V73", {
      valor: null,
      timestamp: isoRelativo(1, "00:00"),
      naturaleza_dato: "calculada",
      origen_dato: "simulado_controlado",
      fuente_referencia: "Mulavara et al. 2018, doi:10.1249/MSS.0000000000001615 (02[21])",
      observaciones: "NO DISPONIBLE: no hay dataset abierto. Requiere implementar la prueba de destreza en la tableta de la app; el valor saldrá del cronómetro de la propia app.",
    }),
  ];
}

export function extraerEquipos(rutaTipoA: string): { sujeto: string; lecturas: AstronautVariableReading[] } {
  const r = rng(SEMILLA);
  return {
    sujeto: "SIM-01",
    // 02:V75 se FUSIONÓ en 01:V8 (masa corporal de Julio, decisión de Leo 14-11-2026, ver
    // variables-diagnostico/DUPLICADOS.md). Ya no se exporta; se sigue generando para no cambiar la
    // secuencia aleatoria del resto, y la masa del día se usa por dentro en V43 y V55.
    lecturas: [(void slammd(r), []), ared(r), aerobico(r), vo2max(rutaTipoA), destreza()].flat(),
  };
}
