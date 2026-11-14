/**
 * Extractor CGMacros (PhysioNet, CC BY-NC-SA 4.0 — sin uso comercial).
 * 45 participantes con dos sensores CGM a la vez: Dexcom G6 Pro (5 min) y Libre Pro (15 min).
 * Variable: 02:V92 — resumen diario por sensor: media, desviación estándar y coeficiente de variación.
 * El tiempo en rango NO se calcula: el catálogo no encontró objetivos validados (decisión pendiente).
 * https://physionet.org/content/cgmacros/1.0.0/
 */
import AdmZip from "adm-zip";
import { parse } from "csv-parse/sync";
import type { AstronautVariableReading } from "../contrato.js";
import { num, redondear, type Fila } from "../util.js";
import { lectura } from "./catalogo.js";

const FUENTE = "PhysioNet CGMacros v1.0.0 — https://physionet.org/content/cgmacros/1.0.0/ (CC BY-NC-SA 4.0)";
const SENSORES = [
  { columna: "Dexcom GL", nombre: "Dexcom G6 Pro", intervalo: 5 },
  { columna: "Libre GL", nombre: "Libre Pro", intervalo: 15 },
] as const;

/** "M/D/YYYY HH:MM" o "YYYY-MM-DD HH:MM:SS" → { dia: "YYYY-MM-DD" } */
function dia(ts: string): string | null {
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(ts);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const us = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(ts);
  if (us) return `${us[3]}-${us[1]!.padStart(2, "0")}-${us[2]!.padStart(2, "0")}`;
  return null;
}

const PISO = 40; // mg/dL: lectura mínima de ambos sensores
const TIR_MIN = 70; // Tiempo en rango: rango terrestre (decisión del usuario), rotulado CLINICO_T
const TIR_MAX = 180;
// ≥6 METs = actividad vigorosa (decisión del usuario para 02:V56). Con ≥3 METs el Fitbit contaba
// hasta caminar normal: 234 min/día de media; con ≥6 METs la media es 27 min/día.
const METS_MODERADO = 6;

/**
 * 02:V56 — minutos diarios de ejercicio desde el Fitbit Sense: minutos con METs ≥ 6 (vigoroso).
 * La columna METs viene multiplicada por 10 según el diccionario de datos. Algunos participantes
 * traen "Intensity" en lugar de METs: se omiten (escala no documentada).
 */
function ejercicio(filas: Fila[]): AstronautVariableReading[] {
  if (!filas[0] || !("METs" in filas[0])) return [];
  const porDia = new Map<string, { total: number; activos: number }>();
  for (const f of filas) {
    const d = dia(f["Timestamp"] ?? "");
    const mets = num(f["METs"]);
    if (d === null || mets === null) continue;
    const x = porDia.get(d) ?? porDia.set(d, { total: 0, activos: 0 }).get(d)!;
    x.total++;
    if (mets / 10 >= METS_MODERADO) x.activos++;
  }
  return [...porDia]
    .sort(([a], [b]) => a.localeCompare(b))
    .filter(([, x]) => x.total >= 12 * 60) // al menos 12 h de registro del reloj
    .map(([d, x]) =>
      lectura("V56", {
        nombre_detalle: "diario (Fitbit Sense)",
        unidad: "min/día",
        valor: x.activos,
        timestamp: `${d}T00:00:00.000Z`,
        naturaleza_dato: "calculada",
        origen_dato: "real_dataset",
        fuente_referencia: FUENTE,
        observaciones: `Minutos con METs ≥ ${METS_MODERADO} (actividad vigorosa) sobre ${x.total} min con registro del reloj el ${d}. No incluye ejercicio moderado: subestima frente a la ISS (~90 min/día de ejercicio estructurado). Población terrestre, no astronautas. Fechas desplazadas por el dataset.`,
      }),
    );
}

const minutos = (ts: string): number => Date.parse(ts.replace(" ", "T") + "Z") / 60_000;

/**
 * Los CSV publicados rellenan ambos sensores por interpolación lineal a 1 valor por minuto.
 * Se recuperan solo las lecturas medidas: el sensor reporta mg/dL enteros, y entre dos lecturas
 * medidas hay al menos (intervalo − 1) minutos.
 */
function medidas(filas: Fila[], columna: string, intervalo: number): { ts: string; v: number }[] {
  const out: { ts: string; v: number }[] = [];
  let ultimo = -Infinity;
  for (const f of filas) {
    const ts = f["Timestamp"] ?? "";
    const v = num(f[columna]);
    const m = minutos(ts);
    if (v === null || !Number.isFinite(m) || !Number.isInteger(v)) continue;
    if (m - ultimo < intervalo - 1) continue;
    out.push({ ts, v });
    ultimo = m;
  }
  return out;
}

function resumen(filas: Fila[]): AstronautVariableReading[] {
  const out: AstronautVariableReading[] = [];
  for (const s of SENSORES) {
    const porDia = new Map<string, number[]>();
    for (const { ts, v } of medidas(filas, s.columna, s.intervalo)) {
      const d = dia(ts);
      if (d === null) continue;
      (porDia.get(d) ?? porDia.set(d, []).get(d)!).push(v);
    }
    for (const [d, vs] of [...porDia].sort(([a], [b]) => a.localeCompare(b))) {
      const minimo = (24 * 60) / s.intervalo / 2; // al menos 12 h de cobertura
      if (vs.length < minimo) continue;
      const media = vs.reduce((a, b) => a + b, 0) / vs.length;
      const de = Math.sqrt(vs.reduce((a, b) => a + (b - media) ** 2, 0) / (vs.length - 1));
      const tir = (vs.filter((v) => v >= TIR_MIN && v <= TIR_MAX).length / vs.length) * 100;
      const pctPiso = (vs.filter((v) => v <= PISO).length / vs.length) * 100;
      // Decisión del usuario: lecturas reales <40 mg/dL son raras (Dexcom simultáneo: 0,05 %); los días
      // con mayoría de lecturas en el piso del sensor se conservan, marcados como error de sensor.
      const error =
        pctPiso > 50
          ? `ERROR DE SENSOR PROBABLE: ${redondear(pctPiso, 0)} % de las lecturas en el piso de ${PISO} mg/dL; no usar este día. `
          : pctPiso > 0
            ? `${redondear(pctPiso, 1)} % de lecturas en el piso de ${PISO} mg/dL (posible falla puntual). `
            : "";
      const obs = `${error}${vs.length} lecturas medidas del ${s.nombre} (cada ${s.intervalo} min) el ${d}; se descartan los valores que el dataset interpola minuto a minuto. Fechas desplazadas aleatoriamente por el dataset; hora local, no UTC.`;
      const comun = {
        timestamp: `${d}T00:00:00.000Z`,
        naturaleza_dato: "calculada",
        origen_dato: "real_dataset",
        fuente_referencia: FUENTE,
        observaciones: obs,
      } as const;
      out.push(
        lectura("V92", { ...comun, nombre_detalle: `media diaria (${s.nombre})`, unidad: "mg/dL", valor: redondear(media, 1) }),
        lectura("V92", { ...comun, nombre_detalle: `desviación estándar diaria (${s.nombre})`, unidad: "mg/dL", valor: redondear(de, 1) }),
        lectura("V92", { ...comun, nombre_detalle: `coeficiente de variación diario (${s.nombre})`, unidad: "%", valor: redondear((de / media) * 100, 1) }),
        lectura("V92", {
          ...comun,
          nombre_detalle: `tiempo en rango ${TIR_MIN}–${TIR_MAX} mg/dL (${s.nombre})`,
          unidad: "%",
          valor: redondear(tir, 1),
          observaciones: `${obs} Rango terrestre ${TIR_MIN}–${TIR_MAX} mg/dL, no validado en microgravedad.`,
        }),
      );
    }
  }
  return out;
}

export function extraerCgmacros(rutaZip: string): { sujeto: string; lecturas: AstronautVariableReading[] }[] {
  const zip = new AdmZip(rutaZip);
  return zip
    .getEntries()
    .filter((e) => /CGMacros-\d+\.csv$/.test(e.entryName))
    .sort((a, b) => a.entryName.localeCompare(b.entryName))
    .map((e) => {
      const filas = parse(e.getData().toString("utf8"), { columns: true, skip_empty_lines: true, bom: true }) as Fila[];
      const id = /(CGMacros-\d+)\.csv$/.exec(e.entryName)![1]!;
      return { sujeto: id, lecturas: [...resumen(filas), ...ejercicio(filas)] };
    });
}
