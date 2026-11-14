/**
 * Tipo B — variables que necesitan modelo, fórmula, equipo de la nave o API.
 * Requiere: npm run descargar, npm run tipoA, y el entorno de Python de py/ (ver README).
 * Uso: npm run tipoB   →   out/tipoB.json
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { ReadingSchema, type AstronautVariableReading, type SalidaTipo } from "../contrato.js";
import { RAW_DIR } from "../rutas.js";
import { extraerEquipos } from "./equipos.js";
import { extraerNutricion } from "./nutricion.js";
import { extraerUltrasonido } from "./ultrasonido.js";

const OUT = new URL("../../out/", import.meta.url);
const tipoA = fileURLToPath(new URL("tipoA.json", OUT));
if (!existsSync(tipoA)) throw new Error("Falta out/tipoA.json (V51 usa las etapas de V52). Corre primero: npm run tipoA");
const cgm = fileURLToPath(new URL("CGMacros_dateshifted365.zip", RAW_DIR));
if (!existsSync(cgm)) throw new Error("Falta CGMacros. Corre primero: npm run descargar");

const equipos = extraerEquipos(tipoA);
const nutricion = await extraerNutricion(cgm);

// SIM-01 junta equipos y menú USDA en un solo sujeto.
const sim: { sujeto: string; lecturas: AstronautVariableReading[] } = {
  sujeto: "SIM-01",
  lecturas: [...equipos.lecturas, ...nutricion.usda.lecturas],
};

const salida: SalidaTipo = {
  generado: new Date().toISOString(),
  tipo: "B",
  sujetos: [sim, ...nutricion.cgmacros, ...extraerUltrasonido()].filter((s) => s.lecturas.length > 0),
};
for (const s of salida.sujetos) for (const l of s.lecturas) ReadingSchema.parse(l);

mkdirSync(OUT, { recursive: true });
writeFileSync(new URL("tipoB.json", OUT), JSON.stringify(salida, null, 2) + "\n");

const conteo = new Map<string, number>();
for (const s of salida.sujetos) for (const l of s.lecturas) conteo.set(`${l.id} ${l.origen_dato}`, (conteo.get(`${l.id} ${l.origen_dato}`) ?? 0) + 1);
console.log(`✓ out/tipoB.json — ${salida.sujetos.length} sujetos`);
for (const [k, n] of [...conteo].sort()) console.log(`  ${k.padEnd(32)} ${n}`);
