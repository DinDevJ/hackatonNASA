/**
 * Tipo A — variables del reloj, la camiseta y el parche CGM.
 * Uso: npm run tipoA   →   out/tipoA.json
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { ReadingSchema, type SalidaTipo } from "../contrato.js";
import { RAW_DIR } from "../rutas.js";
import { extraerCgmacros } from "./cgmacros.js";
import { extraerMmash } from "./mmash.js";
import { extraerSimulado } from "./simulado.js";

const ruta = (archivo: string) => fileURLToPath(new URL(archivo, RAW_DIR));
const requerir = (archivo: string) => {
  if (!existsSync(ruta(archivo))) throw new Error(`Falta data/raw/${archivo}. Corre primero: npm run descargar`);
  return ruta(archivo);
};

const salida: SalidaTipo = {
  generado: new Date().toISOString(),
  tipo: "A",
  sujetos: [
    ...extraerMmash(requerir("MMASH.zip")),
    ...extraerCgmacros(requerir("CGMacros_dateshifted365.zip")),
    extraerSimulado(),
  ].filter((s) => s.lecturas.length > 0),
};

// Validación estricta contra el contrato antes de escribir.
for (const s of salida.sujetos) for (const l of s.lecturas) ReadingSchema.parse(l);

const OUT = new URL("../../out/", import.meta.url);
mkdirSync(OUT, { recursive: true });
writeFileSync(new URL("tipoA.json", OUT), JSON.stringify(salida, null, 2) + "\n");

const conteo = new Map<string, number>();
for (const s of salida.sujetos) for (const l of s.lecturas) conteo.set(`${l.id} ${l.origen_dato}`, (conteo.get(`${l.id} ${l.origen_dato}`) ?? 0) + 1);
console.log(`✓ out/tipoA.json — ${salida.sujetos.length} sujetos`);
for (const [k, n] of [...conteo].sort()) console.log(`  ${k.padEnd(32)} ${n}`);
