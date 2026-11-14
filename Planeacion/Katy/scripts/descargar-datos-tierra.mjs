#!/usr/bin/env node
// Descarga los datasets públicos de tierra para las variables de Persona 5 (Katy).
// Ver Planeacion/Katy/investigacion-variables-persona5.md, sección 5.
//
// Uso:
//   node Planeacion/Katy/scripts/descargar-datos-tierra.mjs            -> ./datos-tierra
//   node Planeacion/Katy/scripts/descargar-datos-tierra.mjs --out DIR  -> DIR
//
// Requisitos: Node 18 o superior (usa fetch nativo). Sin dependencias.
//
// Los archivos de NHANES son SAS XPORT (.xpt). Para leerlos en Python:
//   import pandas as pd; df = pd.read_sas("datos-tierra/nhanes/RHQ_J.xpt", format="xport")
//
// Reglas de uso de NHANES (NCHS): solo análisis estadístico; prohibido intentar
// identificar a cualquier persona o enlazar con otras fuentes identificables.
// https://www.cdc.gov/nchs/policy/data-user-agreement.html
//
// No subir los datos descargados al repositorio: se regeneran con este script.

import { mkdir, writeFile, stat } from "node:fs/promises";
import { join } from "node:path";

const args = process.argv.slice(2);
const outIdx = args.indexOf("--out");
const OUT = outIdx >= 0 ? args[outIdx + 1] : "datos-tierra";

const NHANES = "https://wwwn.cdc.gov/Nchs/Data/Nhanes/Public";

// [ciclo, archivo, variables de Persona 5 que cubre, qué es]
const NHANES_FILES = [
  ["2017", "DEMO_J", "todas", "Demografía: sexo, edad (para unir por SEQN)"],
  ["2017", "BMX_J", "R19 (prueba de viabilidad)", "Medidas corporales: peso, talla, índice de masa corporal"],
  ["2005", "DEMO_D", "04:A43, 04:A47", "Demografía 2005-2006 (para la prueba de intestino)"],
  ["2007", "DEMO_E", "04:A43, 04:A47", "Demografía 2007-2008"],
  ["2009", "DEMO_F", "04:A43, 04:A47", "Demografía 2009-2010"],
  ["2005", "BHQ_D", "04:A43, 04:A47", "Salud intestinal: frecuencia y escala de Bristol (BHD050, BHQ060)"],
  ["2007", "BHQ_E", "04:A43, 04:A47", "Salud intestinal 2007-2008"],
  ["2009", "BHQ_F", "04:A43, 04:A47", "Salud intestinal 2009-2010"],
  ["2017", "RHQ_J", "R10, R11, R18", "Salud reproductiva: periodos regulares (RHQ031), motivo (RHD043), anticonceptivos (RHQ420), hormonas (RHQ540+)"],
  ["2017", "FERTIN_J", "R19", "Ferritina (LBXFER)"],
  ["2017", "CBC_J", "R19", "Biometría hemática: hemoglobina"],
  ["2017", "DXXFEM_J", "R23", "Densitometría de fémur (DXXOFBMD)"],
  ["2017", "DXXSPN_J", "R23", "Densitometría de columna"],
  ["2005", "AGQ_D", "04:A46", "Alergias (AGQ040, AGQ060)"],
  ["2017", "OHXDEN_J", "04:A48", "Examen oral: dentición y caries"],
  ["2017", "ALB_CR_J", "04:A22d", "Albúmina y creatinina en orina"],
  ["2017", "KIQ_U_J", "R24, 04:A22c", "Riñón y urología: cálculos (KIQ026), incontinencia (KIQ005)"],
];

// Descargas MANUALES (el servidor bloquea la descarga por script con HTTP 403; desde el
// navegador funciona). Se listan al final con sus instrucciones.
const MANUAL_FILES = [
  {
    // Fehring RJ, Menstrual Cycle Data (Marquette, 2012). Datos anonimizados; reutilización
    // aceptada por las participantes en el consentimiento. Sin licencia explícita: citar.
    name: "FedCycleData071012.csv",
    saveAs: "marquette/FedCycleData071012.csv",
    page: "https://epublications.marquette.edu/data_nfp/7",
    how: "Abrir la página y descargar 'FedCycleData071012 (2).csv' en Additional Files (290 kB)",
    covers: "R02, R03, R04, R09",
  },
];
// NHIS (National Health Interview Survey), archivo de adultos 2019: dolor de espalda (04:A45).
const OTHER_FILES = [
  {
    dir: "nhis",
    name: "adult19csv.zip",
    url: "https://ftp.cdc.gov/pub/Health_Statistics/NCHS/Datasets/NHIS/2019/adult19csv.zip",
    covers: "04:A45",
    zip: true,
  },
];

const XPT_MAGIC = "HEADER RECORD*******LIBRARY HEADER RECORD";

async function download(url, path) {
  const res = await fetch(url, { headers: { "User-Agent": "monarcas-hackathon-data-script" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(path, buf);
  return buf;
}

const results = [];

await mkdir(join(OUT, "nhanes"), { recursive: true });
for (const [cycle, file, covers, what] of NHANES_FILES) {
  const url = `${NHANES}/${cycle}/DataFiles/${file}.xpt`;
  const path = join(OUT, "nhanes", `${file}.xpt`);
  try {
    const buf = await download(url, path);
    const ok = buf.subarray(0, XPT_MAGIC.length).toString("latin1") === XPT_MAGIC;
    results.push({ file: `${file}.xpt`, kb: Math.round(buf.length / 1024), valid: ok ? "SAS XPORT ✓" : "NO es XPORT ✗", covers, what });
  } catch (e) {
    results.push({ file: `${file}.xpt`, kb: 0, valid: `ERROR ${e.message}`, covers, what });
  }
}

for (const f of OTHER_FILES) {
  await mkdir(join(OUT, f.dir), { recursive: true });
  const path = join(OUT, f.dir, f.name);
  try {
    const buf = await download(f.url, path);
    const ok = f.zip ? buf[0] === 0x50 && buf[1] === 0x4b : buf.subarray(0, 200).toString("utf8").includes(",");
    const kind = f.zip ? "ZIP" : "CSV";
    results.push({ file: f.name, kb: Math.round(buf.length / 1024), valid: ok ? `${kind} ✓` : `Revisar: no parece ${kind}`, covers: f.covers, what: f.note });
  } catch (e) {
    results.push({ file: f.name, kb: 0, valid: `ERROR ${e.message}`, covers: f.covers, what: f.note });
  }
}

console.table(results.map(({ file, kb, valid, covers }) => ({ archivo: file, KB: kb, validación: valid, variables: covers })));
console.log("\nDescargas manuales (bloquean scripts):");
for (const m of MANUAL_FILES) {
  console.log(`- ${m.name} [${m.covers}]: ${m.how}\n  ${m.page}\n  Guardar como: ${join(OUT, m.saveAs)}`);
}
const failed = results.filter((r) => !r.valid.includes("✓"));
console.log(failed.length ? `\n${failed.length} archivo(s) con problema.` : `\nTodo descargado en ${OUT}`);
process.exit(failed.length ? 1 : 0);
