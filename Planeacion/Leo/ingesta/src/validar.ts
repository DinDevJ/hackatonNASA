/**
 * Valida cualquier archivo de salida contra el contrato del equipo.
 * Uso: npm run validar -- out/tipoA.json
 */
import { readFileSync } from "node:fs";
import { ReadingSchema } from "./contrato.js";

const archivo = process.argv[2] ?? "out/tipoA.json";
const datos = JSON.parse(readFileSync(archivo, "utf8")) as { sujetos: { sujeto: string; lecturas: unknown[] }[] };
let ok = 0;
const errores: string[] = [];
for (const s of datos.sujetos) {
  s.lecturas.forEach((l, i) => {
    const r = ReadingSchema.safeParse(l);
    if (r.success) ok++;
    else errores.push(`${s.sujeto}[${i}]: ${r.error.issues.map((x) => `${x.path.join(".")} ${x.message}`).join("; ")}`);
  });
}
console.log(`${archivo}: ${ok} lecturas válidas, ${errores.length} inválidas`);
if (errores.length) {
  console.error(errores.slice(0, 20).join("\n"));
  process.exit(1);
}
