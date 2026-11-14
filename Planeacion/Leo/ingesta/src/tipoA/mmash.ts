/**
 * Extractor MMASH (PhysioNet, ODbL 1.0): 22 adultos sanos, 24 h de actigrafía + FC.
 * Variables reales: 03:V30, V33, V34, V35, V36 (sleep.csv, calculadas por el software del
 * actígrafo) y 02:V53 (FC de Actigraph.csv durante sesiones de actividad 5 "media" y 6 "intensa"
 * declaradas en Activity.csv).
 * https://physionet.org/content/mmash/1.0.0/
 */
import AdmZip from "adm-zip";
import type { AstronautVariableReading } from "../contrato.js";
import { isoRelativo, num, redondear, type Fila } from "../util.js";
import { leerCsvZip } from "../util-zip.js";
import { lectura } from "./catalogo.js";

const FUENTE = "PhysioNet MMASH v1.0.0 — https://physionet.org/content/mmash/1.0.0/";
const BASE = "DataPaper/";
const FECHA = "MMASH no publica fechas: día 1 = 2000-01-01 (ancla convencional)";
const FC_MAX_PLAUSIBLE = 220; // lpm; por encima se trata como artefacto del sensor

function segundos(dia: number, hora: string): number {
  const [h = 0, m = 0, s = 0] = hora.split(":").map(Number);
  return (dia - 1) * 86_400 + h * 3600 + m * 60 + s;
}

/** Sueño: suma los tramos de cama de la misma noche (sleep.csv puede partir la noche en varios). */
function sueno(filas: Fila[]): AstronautVariableReading[] {
  if (filas.length === 0) return [];
  const tramos = filas.map((f) => ({
    dia: num(f["In Bed Date"]) ?? 1,
    hora: f["In Bed Time"] ?? "00:00",
    latencia: num(f["Latency"]) ?? 0,
    cama: num(f["Total Minutes in Bed"]) ?? 0,
    tst: num(f["Total Sleep Time (TST)"]) ?? 0,
    waso: num(f["Wake After Sleep Onset (WASO)"]) ?? 0,
    eficiencia: num(f["Efficiency"]),
  }));
  const primero = tramos[0]!;
  const ts = isoRelativo(primero.dia, primero.hora);
  const varios = tramos.length > 1;
  const suma = (k: "cama" | "tst" | "waso") => tramos.reduce((a, t) => a + t[k], 0);
  const cama = suma("cama");
  const tst = suma("tst");
  const notaTramos = varios
    ? `Noche partida en ${tramos.length} tramos de cama; se suman. El tiempo despierto fuera de la cama entre tramos no se cuenta como WASO.`
    : undefined;
  const nat = varios ? "calculada" : "directa";
  const comun = { timestamp: ts, origen_dato: "real_dataset", fuente_referencia: FUENTE } as const;
  const obs = (extra?: string) => [extra, notaTramos, FECHA].filter(Boolean).join(" · ");

  return [
    lectura("V30", { ...comun, valor: redondear(tst / 60), naturaleza_dato: nat, observaciones: obs("Columna 'Total Sleep Time (TST)'") }),
    lectura("V33", { ...comun, valor: redondear(cama / 60), naturaleza_dato: nat, observaciones: obs("Columna 'Total Minutes in Bed'") }),
    lectura("V34", {
      ...comun,
      valor: varios ? redondear((tst / cama) * 100) : primero.eficiencia,
      naturaleza_dato: nat,
      observaciones: obs(varios ? "Eficiencia = TST total / tiempo en cama total × 100" : "Columna 'Efficiency'"),
    }),
    lectura("V35", { ...comun, valor: primero.latencia, naturaleza_dato: "directa", observaciones: obs("Latencia del primer tramo de la noche") }),
    lectura("V36", { ...comun, valor: suma("waso"), naturaleza_dato: nat, observaciones: obs("Columna 'Wake After Sleep Onset (WASO)'") }),
  ];
}

/** Intensidad por sesión: FC del Actigraph dentro de las ventanas de actividad 5 o 6. */
function intensidad(actividad: Fila[], actigrafo: Fila[], edad: number): AstronautVariableReading[] {
  const fcMax = 208 - 0.7 * edad; // Tanaka 2001 (decisión D5-1)
  const fc = actigrafo
    .map((f) => ({ t: segundos(num(f["day"]) ?? 1, f["time"] ?? "00:00:00"), hr: num(f["HR"]) }))
    // Artefactos: se descartan muestras de FC > 220 lpm (decisión del usuario sobre los picos de 224 y 227).
    .filter((x): x is { t: number; hr: number } => x.hr !== null && x.hr > 0 && x.hr <= FC_MAX_PLAUSIBLE);

  const out: AstronautVariableReading[] = [];
  for (const a of actividad) {
    const tipo = num(a["Activity"]);
    if (tipo !== 5 && tipo !== 6) continue;
    const dia = num(a["Day"]) ?? 1;
    const ini = segundos(dia, a["Start"] ?? "00:00");
    let fin = segundos(dia, a["End"] ?? "00:00");
    if (fin <= ini) fin += 86_400; // cruza medianoche
    const hr = fc.filter((x) => x.t >= ini && x.t < fin).map((x) => x.hr);
    if (hr.length < 60) continue; // menos de 1 min de FC: no hay sesión medible
    const media = hr.reduce((s, v) => s + v, 0) / hr.length;
    const pico = Math.max(...hr);
    const p70 = (hr.filter((v) => v > 0.7 * fcMax).length / hr.length) * 100;
    const p90 = (hr.filter((v) => v > 0.9 * fcMax).length / hr.length) * 100;
    const ts = isoRelativo(dia, a["Start"] ?? "00:00");
    const etiqueta = tipo === 6 ? "intensa (gym, correr)" : "media (caminata rápida, bici)";
    const obs = `Sesión autodeclarada ${etiqueta}, ${a["Start"]}–${a["End"]}, ${Math.round(hr.length / 60)} min con FC (muestras >${FC_MAX_PLAUSIBLE} lpm descartadas como artefacto). FCmáx estimada Tanaka 208−0,7×edad = ${redondear(fcMax, 1)} lpm (edad ${edad}). ${FECHA}`;
    const comun = { timestamp: ts, origen_dato: "real_dataset", fuente_referencia: FUENTE, observaciones: obs } as const;
    out.push(
      lectura("V53", { ...comun, nombre_detalle: "FC media", unidad: "lpm", valor: redondear(media, 1), naturaleza_dato: "calculada" }),
      lectura("V53", { ...comun, nombre_detalle: "FC pico", unidad: "lpm", valor: pico, naturaleza_dato: "directa" }),
      lectura("V53", { ...comun, nombre_detalle: "% del tiempo >70 % FCmáx", unidad: "%", valor: redondear(p70, 1), naturaleza_dato: "calculada" }),
      lectura("V53", { ...comun, nombre_detalle: "% del tiempo >90 % FCmáx", unidad: "%", valor: redondear(p90, 1), naturaleza_dato: "calculada" }),
    );
  }
  return out;
}

export function extraerMmash(rutaZip: string): { sujeto: string; lecturas: AstronautVariableReading[] }[] {
  const zip = new AdmZip(rutaZip);
  const usuarios = [
    ...new Set(
      zip
        .getEntries()
        .map((e) => /^DataPaper\/(user_\d+)\//.exec(e.entryName)?.[1])
        .filter((u): u is string => Boolean(u)),
    ),
  ].sort((a, b) => Number(a.slice(5)) - Number(b.slice(5)));

  return usuarios.map((u) => {
    const info = leerCsvZip(zip, `${BASE}${u}/user_info.csv`)[0];
    const edad = num(info?.["Age"]);
    const lecturas = [...sueno(leerCsvZip(zip, `${BASE}${u}/sleep.csv`))];
    if (edad !== null && edad > 0) {
      lecturas.push(
        ...intensidad(leerCsvZip(zip, `${BASE}${u}/Activity.csv`), leerCsvZip(zip, `${BASE}${u}/Actigraph.csv`), edad),
      );
    }
    return { sujeto: `MMASH-${u}`, lecturas };
  });
}
