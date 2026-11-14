/**
 * Tipo C — input manual.
 *  1. out/tipoC-formularios.json: definición de los 49 formularios (para el equipo de la app).
 *  2. out/tipoC.json: lecturas REALES que sí existen como dato manual/laboratorio, pasadas por el mismo
 *     validador que usará la app: bio.csv de CGMacros (HbA1c, glucosa de laboratorio, insulina y
 *     glucosa capilar con glucómetro Contour).
 * Uso: npm run tipoC
 */
import AdmZip from "adm-zip";
import { parse } from "csv-parse/sync";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { ReadingSchema, type AstronautVariableReading, type SalidaTipo } from "../contrato.js";
import { RAW_DIR } from "../rutas.js";
import { ANCLA, num, type Fila } from "../util.js";
import { capturar, FORMULARIOS } from "./esquemas.js";

const OUT = new URL("../../out/", import.meta.url);
const FUENTE = "PhysioNet CGMacros v1.0.0, bio.csv — https://physionet.org/content/cgmacros/1.0.0/ (CC BY-NC-SA 4.0)";

function laboratorioCgmacros(rutaZip: string): { sujeto: string; lecturas: AstronautVariableReading[] }[] {
  const zip = new AdmZip(rutaZip);
  const e = zip.getEntries().find((x) => /bio\.csv$/i.test(x.entryName));
  if (!e) return [];
  // Hay columnas repetidas ("Time (t)"): se leen por posición para no perder ninguna.
  const filas = parse(e.getData().toString("utf8"), { bom: true, skip_empty_lines: true }) as string[][];
  const cab = (filas[0] ?? []).map((c) => c.trim());
  const col = (nombre: string) => cab.findIndex((c) => c === nombre);
  const iA1c = col("A1c PDL (Lab)");
  const iGlu = col("Fasting GLU - PDL (Lab)");
  const iIns = col("Insulin");
  const iCap = cab.map((c, i) => (/Contour Fingerstick GLU/.test(c) ? i : -1)).filter((i) => i >= 0);
  const ts = new Date(ANCLA).toISOString();
  const nota = "Participante de CGMacros (Tierra, no astronauta). Laboratorio basal del estudio; sin fecha publicada (ancla 2000-01-01).";

  return filas.slice(1).flatMap((f): { sujeto: string; lecturas: AstronautVariableReading[] }[] => {
    const id = num(f[0]);
    if (id === null) return [];
    const sujeto = `CGMacros-${String(id).padStart(3, "0")}`;
    const lecturas: AstronautVariableReading[] = [];
    const a1c = num(f[iA1c]);
    const glu = num(f[iGlu]);
    const ins = num(f[iIns]);
    if (a1c !== null) lecturas.push(capturar("02:V89", a1c, ts, "real_dataset", FUENTE, `${nota} Columna 'A1c PDL (Lab)'.`));
    if (glu !== null) lecturas.push(capturar("02:V86", glu, ts, "real_dataset", FUENTE, `${nota} Glucosa en ayunas de laboratorio ('Fasting GLU - PDL (Lab)').`));
    if (ins !== null) lecturas.push(capturar("02:V90", ins, ts, "real_dataset", FUENTE, `${nota} Columna 'Insulin'.`));
    iCap.forEach((i, k) => {
      const v = num(f[i]);
      if (v === null) return;
      const hora = (f[i + 1] ?? "").trim();
      lecturas.push(
        capturar("02:V86", v, ts, "real_dataset", FUENTE, `${nota} Glucosa capilar #${k + 1} con glucómetro Contour (punción digital)${hora ? `, hora ${hora}` : ""}: es el tipo de medición que haría el médico de a bordo.`),
      );
    });
    return lecturas.length ? [{ sujeto, lecturas }] : [];
  });
}

mkdirSync(OUT, { recursive: true });
writeFileSync(
  new URL("tipoC-formularios.json", OUT),
  JSON.stringify({ generado: new Date().toISOString(), tipo: "C", formularios: FORMULARIOS }, null, 2) + "\n",
);

const cgm = fileURLToPath(new URL("CGMacros_dateshifted365.zip", RAW_DIR));
if (!existsSync(cgm)) throw new Error("Falta CGMacros. Corre primero: npm run descargar");
const salida: SalidaTipo = { generado: new Date().toISOString(), tipo: "C", sujetos: laboratorioCgmacros(cgm) };
for (const s of salida.sujetos) for (const l of s.lecturas) ReadingSchema.parse(l);
writeFileSync(new URL("tipoC.json", OUT), JSON.stringify(salida, null, 2) + "\n");

const porMedicion = new Map<string, number>();
for (const f of FORMULARIOS) porMedicion.set(f.medicion, (porMedicion.get(f.medicion) ?? 0) + 1);
console.log(`✓ out/tipoC-formularios.json — ${FORMULARIOS.length} formularios:`, Object.fromEntries(porMedicion));
const conteo = new Map<string, number>();
for (const s of salida.sujetos) for (const l of s.lecturas) conteo.set(l.id, (conteo.get(l.id) ?? 0) + 1);
console.log(`✓ out/tipoC.json — ${salida.sujetos.length} sujetos con laboratorio real:`, Object.fromEntries(conteo));
