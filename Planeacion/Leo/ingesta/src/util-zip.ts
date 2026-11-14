/** Lectura de CSV dentro de un zip (solo Node). */
import AdmZip from "adm-zip";
import { parse } from "csv-parse/sync";
import type { Fila } from "./util.js";

export function leerCsvZip(zip: AdmZip, ruta: string): Fila[] {
  const entrada = zip.getEntry(ruta);
  if (!entrada) return [];
  return parse(entrada.getData().toString("utf8"), {
    columns: true,
    skip_empty_lines: true,
    bom: true,
  }) as Fila[];
}
