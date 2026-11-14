/**
 * Descarga los datasets reales usados por la capa de ingesta y verifica su SHA-256.
 * Uso: npm run descargar            (todos)
 *      npm run descargar -- mmash   (solo uno)
 */
import { createHash } from "node:crypto";
import { createReadStream, createWriteStream, existsSync, mkdirSync } from "node:fs";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ReadableStream as WebReadableStream } from "node:stream/web";
import { RAW_DIR } from "./rutas.js";

interface Dataset {
  clave: string;
  archivo: string;
  url: string;
  sumas: string; // URL de SHA256SUMS.txt
  licencia: string;
}

export const DATASETS: Dataset[] = [
  {
    clave: "mmash",
    archivo: "MMASH.zip",
    url: "https://physionet.org/files/mmash/1.0.0/MMASH.zip",
    sumas: "https://physionet.org/files/mmash/1.0.0/SHA256SUMS.txt",
    licencia: "ODbL 1.0",
  },
  {
    clave: "cgmacros",
    archivo: "CGMacros_dateshifted365.zip",
    url: "https://physionet.org/files/cgmacros/1.0.0/CGMacros_dateshifted365.zip",
    sumas: "https://physionet.org/files/cgmacros/1.0.0/SHA256SUMS.txt",
    licencia: "CC BY-NC-SA 4.0 (sin uso comercial)",
  },
];

async function sha256(ruta: URL): Promise<string> {
  const h = createHash("sha256");
  await pipeline(createReadStream(ruta), h);
  return h.digest("hex");
}

async function esperado(d: Dataset): Promise<string> {
  const txt = await (await fetch(d.sumas)).text();
  const linea = txt.split("\n").find((l) => l.trim().endsWith(d.archivo));
  if (!linea) throw new Error(`No encontré ${d.archivo} en ${d.sumas}`);
  return linea.split(/\s+/)[0] ?? "";
}

async function descargar(d: Dataset): Promise<void> {
  mkdirSync(RAW_DIR, { recursive: true });
  const destino = new URL(d.archivo, RAW_DIR);
  const hash = await esperado(d);
  if (existsSync(destino) && (await sha256(destino)) === hash) {
    console.log(`✓ ${d.archivo} ya existe y su SHA-256 coincide`);
    return;
  }
  console.log(`↓ ${d.archivo} (${d.licencia})`);
  const res = await fetch(d.url, { redirect: "follow" });
  if (!res.ok || !res.body) throw new Error(`HTTP ${res.status} al bajar ${d.url}`);
  await pipeline(Readable.fromWeb(res.body as WebReadableStream), createWriteStream(destino));
  const real = await sha256(destino);
  if (real !== hash) throw new Error(`SHA-256 no coincide en ${d.archivo}: ${real} ≠ ${hash}`);
  console.log(`✓ ${d.archivo} verificado`);
}

const pedidos = process.argv.slice(2);
for (const d of DATASETS.filter((x) => pedidos.length === 0 || pedidos.includes(x.clave))) {
  await descargar(d);
}
