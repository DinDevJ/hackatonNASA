/**
 * Nutrición (decisión del usuario: "CGMacros real + USDA").
 *  - Reales (CGMacros, comidas registradas por 45 personas en Tierra): 02:V81 energía, 02:V82 proteína,
 *    02:V93 carbohidratos como % de la energía.
 *  - USDA FoodData Central sobre un menú de ejemplo SIMULADO para SIM-01: 02:V79 hierro, 02:V83 sodio,
 *    02:V84 calcio. Los alimentos se fijan por fdcId (no por "primer resultado" de búsqueda, que falla:
 *    "oatmeal" devuelve pan de avena). Se consulta una sola vez y se guarda en data/raw/usda-cache.json.
 */
import AdmZip from "adm-zip";
import { parse } from "csv-parse/sync";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import type { AstronautVariableReading } from "../contrato.js";
import { RAW_DIR } from "../rutas.js";
import { isoRelativo, num, redondear, type Fila } from "../util.js";
import { lecturaB } from "./catalogo.js";

const FUENTE_CGM = "PhysioNet CGMacros v1.0.0 — https://physionet.org/content/cgmacros/1.0.0/ (CC BY-NC-SA 4.0)";
const ATWATER = "Factor general de Atwater 4,0 kcal/g de carbohidrato — FAO 2003, cap. 3, https://www.fao.org/4/y5022e/y5022e04.htm";
const LB_A_KG = 0.45359237;

// ---------- CGMacros (real) ----------

function pesoKg(zip: AdmZip): Map<number, number> {
  const e = zip.getEntries().find((x) => /bio\.csv$/i.test(x.entryName));
  const m = new Map<number, number>();
  if (!e) return m;
  const filas = parse(e.getData().toString("utf8"), { columns: (h: string[]) => h.map((c) => c.trim()), bom: true }) as Fila[];
  // Peso en libras y talla en pulgadas: comprobado porque 703·lb/in² reproduce la columna BMI.
  for (const f of filas) {
    const id = num(f["subject"]);
    const lb = num(f["Body weight"]);
    if (id !== null && lb !== null) m.set(id, lb * LB_A_KG);
  }
  return m;
}

function comidasPorDia(filas: Fila[]): Map<string, { kcal: number; prot: number; carb: number; comidas: Set<string>; sinPorcentaje: number }> {
  const dias = new Map<string, { kcal: number; prot: number; carb: number; comidas: Set<string>; sinPorcentaje: number }>();
  for (const f of filas) {
    const tipo = (f["Meal Type"] ?? "").trim();
    const kcal = num(f["Calories"]);
    if (!tipo || kcal === null) continue;
    const d = (f["Timestamp"] ?? "").slice(0, 10);
    const pctTxt = f["Amount Consumed"] ?? f["Amount Consumed "];
    const pct = num(pctTxt);
    const factor = pct === null ? 1 : pct / 100;
    const x = dias.get(d) ?? dias.set(d, { kcal: 0, prot: 0, carb: 0, comidas: new Set(), sinPorcentaje: 0 }).get(d)!;
    x.kcal += kcal * factor;
    x.prot += (num(f["Protein"]) ?? 0) * factor;
    x.carb += (num(f["Carbs"]) ?? 0) * factor;
    x.comidas.add(tipo.toLowerCase());
    if (pct === null) x.sinPorcentaje++;
  }
  return dias;
}

function cgmacros(rutaZip: string): { sujeto: string; lecturas: AstronautVariableReading[] }[] {
  const zip = new AdmZip(rutaZip);
  const pesos = pesoKg(zip);
  return zip
    .getEntries()
    .filter((e) => /CGMacros-\d+\.csv$/.test(e.entryName))
    .sort((a, b) => a.entryName.localeCompare(b.entryName))
    .map((e) => {
      const sujeto = /(CGMacros-\d+)\.csv$/.exec(e.entryName)![1]!;
      const peso = pesos.get(Number(sujeto.slice(-3)));
      const filas = parse(e.getData().toString("utf8"), { columns: (h: string[]) => h.map((c) => c.trim()), skip_empty_lines: true, bom: true }) as Fila[];
      const lecturas: AstronautVariableReading[] = [];
      for (const [d, x] of [...comidasPorDia(filas)].sort(([a], [b]) => a.localeCompare(b))) {
        // 🔶 Día completo = desayuno, comida y cena registrados; si falta alguna, la ingesta saldría subestimada.
        if (!["breakfast", "lunch", "dinner"].every((c) => x.comidas.has(c))) continue;
        const ts = `${d}T00:00:00.000Z`;
        // Mismo criterio que en glucosa: lo físicamente imposible es raro (3 de 343 días) → se conserva marcado.
        const imposible = x.carb * 4 > x.kcal;
        const error = imposible
          ? "ERROR DE DATO: los carbohidratos registrados aportan más energía que el total de calorías; no usar este día. "
          : "";
        const nota = `${error}Comidas del ${d}: ${[...x.comidas].join(", ")}. Cantidades estimadas por el dataset y ajustadas por % consumido${x.sinPorcentaje ? ` (${x.sinPorcentaje} comida(s) sin % → se asume 100 %)` : ""}. Población terrestre, no astronautas. Fechas desplazadas por el dataset.`;
        const comun = { timestamp: ts, origen_dato: "real_dataset", fuente_referencia: FUENTE_CGM } as const;
        lecturas.push(
          lecturaB("V81", { ...comun, valor: Math.round(x.kcal), naturaleza_dato: "calculada", observaciones: nota }),
          lecturaB("V82", { ...comun, nombre_detalle: "total diario", unidad: "g/d", valor: redondear(x.prot, 1), naturaleza_dato: "calculada", observaciones: nota }),
        );
        if (peso) {
          lecturas.push(
            lecturaB("V82", { ...comun, valor: redondear(x.prot / peso, 2), naturaleza_dato: "calculada", observaciones: `${nota} Peso corporal de bio.csv: ${redondear(peso, 1)} kg (convertido de lb).` }),
          );
        }
        if (x.kcal > 0) {
          lecturas.push(
            lecturaB("V93", { ...comun, valor: redondear(((x.carb * 4) / x.kcal) * 100, 1), naturaleza_dato: "calculada", fuente_referencia: `${FUENTE_CGM}; ${ATWATER}`, observaciones: `${nota} Azúcares añadidos: no disponibles en el dataset.` }),
          );
        }
      }
      return { sujeto, lecturas };
    });
}

// ---------- USDA FoodData Central (menú de ejemplo simulado) ----------

/** Alimentos fijados por fdcId; descripción comprobada en la API (SR Legacy). */
const ALIMENTOS: Record<number, string> = {
  173905: "Cereals, oats, regular and quick, unenriched, cooked with water, without salt",
  172187: "Egg, whole, cooked, scrambled",
  173330: "Beef stew, canned entree",
  168878: "Rice, white, long-grain, regular, enriched, cooked",
  175037: "Tortillas, ready-to-bake or -fry, flour, refrigerated",
  171477: "Chicken, broilers or fryers, breast, meat only, cooked, roasted",
  168463: "Spinach, cooked, boiled, drained, without salt",
  173325: "Macaroni and Cheese, canned entree",
  175180: "Crustaceans, shrimp, cooked",
};

/** 🔶 Menú de ejemplo de 3 días (gramos por porción). No es el menú oficial de la ISS. */
const MENU: [dia: number, fdcId: number, gramos: number][][] = [
  [[1, 173905, 240], [1, 172187, 100], [1, 175037, 50], [1, 173330, 250], [1, 168878, 150], [1, 171477, 120], [1, 168463, 90]],
  [[2, 173905, 240], [2, 175037, 100], [2, 173325, 250], [2, 175180, 100], [2, 168878, 150], [2, 168463, 90]],
  [[3, 172187, 150], [3, 175037, 50], [3, 171477, 150], [3, 168878, 200], [3, 173330, 250], [3, 168463, 90]],
];

const NUTRIENTES = { hierro: "303", calcio: "301", sodio: "307" } as const;
type Por100g = Record<keyof typeof NUTRIENTES, number> & { descripcion: string };

async function datosUsda(): Promise<Record<string, Por100g>> {
  const cache = new URL("usda-cache.json", RAW_DIR);
  if (existsSync(cache)) return JSON.parse(readFileSync(cache, "utf8")) as Record<string, Por100g>;
  const clave = process.env["FDC_API_KEY"] ?? "DEMO_KEY";
  const url = `https://api.nal.usda.gov/fdc/v1/foods?format=abridged&fdcIds=${Object.keys(ALIMENTOS).join(",")}&api_key=${clave}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`USDA FoodData Central respondió HTTP ${r.status}. Si es 429, espera 1 h o define FDC_API_KEY (gratis en https://fdc.nal.usda.gov/api-key-signup).`);
  const lista = (await r.json()) as { fdcId: number; description: string; foodNutrients: { number?: string; nutrientNumber?: string; amount?: number; value?: number }[] }[];
  const out: Record<string, Por100g> = {};
  for (const f of lista) {
    const val = (n: string) => {
      const x = f.foodNutrients.find((k) => (k.number ?? k.nutrientNumber) === n);
      return x?.amount ?? x?.value ?? 0;
    };
    out[f.fdcId] = { descripcion: f.description, hierro: val(NUTRIENTES.hierro), calcio: val(NUTRIENTES.calcio), sodio: val(NUTRIENTES.sodio) };
  }
  for (const id of Object.keys(ALIMENTOS)) if (!out[id]) throw new Error(`USDA no devolvió el fdcId ${id}`);
  writeFileSync(cache, JSON.stringify(out, null, 2));
  return out;
}

async function usda(): Promise<{ sujeto: string; lecturas: AstronautVariableReading[] }> {
  let datos: Record<string, Por100g>;
  try {
    datos = await datosUsda();
  } catch (e) {
    console.warn(`⚠ ${String(e)}`);
    const comun = {
      valor: null,
      timestamp: isoRelativo(1, "23:59"),
      naturaleza_dato: "calculada",
      origen_dato: "api_oficial",
      fuente_referencia: "USDA FoodData Central API (SR Legacy) — https://fdc.nal.usda.gov/api-guide",
      observaciones: `PENDIENTE: la API no respondió (${String(e).slice(0, 120)}). Volver a correr npm run tipoB.`,
    } as const;
    return { sujeto: "SIM-01", lecturas: [lecturaB("V79", comun), lecturaB("V83", comun), lecturaB("V84", comun)] };
  }
  const lecturas: AstronautVariableReading[] = [];
  for (const comidas of MENU) {
    const dia = comidas[0]![0];
    const suma = { hierro: 0, calcio: 0, sodio: 0 };
    for (const [, id, g] of comidas) {
      const n = datos[id]!;
      suma.hierro += (n.hierro * g) / 100;
      suma.calcio += (n.calcio * g) / 100;
      suma.sodio += (n.sodio * g) / 100;
    }
    const detalle = comidas.map(([, id, g]) => `${datos[id]!.descripcion} (fdcId ${id}) ${g} g`).join("; ");
    const comun = {
      timestamp: isoRelativo(dia, "23:59"),
      naturaleza_dato: "calculada",
      origen_dato: "api_oficial",
      fuente_referencia: "USDA FoodData Central API (SR Legacy) — https://fdc.nal.usda.gov/api-guide",
      observaciones: `Menú de ejemplo SIMULADO (no es el menú de la ISS), día ${dia}: ${detalle}. Valores por 100 g de la API × gramos.`,
    } as const;
    lecturas.push(
      lecturaB("V79", { ...comun, valor: redondear(suma.hierro, 1) }),
      lecturaB("V83", { ...comun, valor: Math.round(suma.sodio) }),
      lecturaB("V84", { ...comun, valor: Math.round(suma.calcio) }),
    );
  }
  return { sujeto: "SIM-01", lecturas };
}

export async function extraerNutricion(rutaCgmacros: string) {
  return { cgmacros: cgmacros(rutaCgmacros), usda: await usda() };
}
