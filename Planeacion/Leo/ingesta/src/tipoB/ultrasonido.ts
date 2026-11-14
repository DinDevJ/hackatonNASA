/**
 * 02:V47 — Área de sección transversal del recto femoral con DeepACSA (modelo preentrenado, sin reentrenar).
 * Llama a py/deepacsa_bridge.py (decisión: puente a Python). El puente usa las funciones originales
 * de DeepACSA v0.3.2 y reproduce exactamente los resultados publicados en su paquete de ejemplo.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { AstronautVariableReading } from "../contrato.js";
import { RAW_DIR } from "../rutas.js";
import { isoRelativo } from "../util.js";
import { lecturaB } from "./catalogo.js";

const FUENTE = "DeepACSA v0.3.2 (Ritsche et al., Apache-2.0) — https://doi.org/10.5281/zenodo.19130694";
const PROFUNDIDAD_CM = 4.5; // profundidad de la línea de escala EFOV de las imágenes de ejemplo

const raw = (p: string) => fileURLToPath(new URL(p, RAW_DIR));
const PYTHON = fileURLToPath(new URL("../../py/.venv/Scripts/python.exe", import.meta.url));
const PUENTE = fileURLToPath(new URL("../../py/deepacsa_bridge.py", import.meta.url));
const SRC = raw("deepacsa/src/PaulRitsche-DeepACSA-8178913");
const MODELO = raw("deepacsa/unet3plus_RectFem_v0.3.1.h5");
const IMGS = ["rectus_img_55", "rectus_img_56", "rectus_img_57"].map((n) =>
  raw(`deepacsa/ejemplo/DeepACSA_v0.3.2_example/images_test/${n}.tif`),
);
/** Resultados publicados por DeepACSA para las mismas imágenes (Original_Results_v0.3.2.xlsx). */
const REFERENCIA: Record<string, number> = {
  rectus_img_55: 9.793690563179705,
  rectus_img_56: 10.28159436049548,
  rectus_img_57: 10.02202236555262,
};

interface ResultadoPuente {
  archivo: string;
  pixeles_mascara?: number;
  linea_escala_px?: number;
  area_cm2?: number;
  error?: string;
}

export function extraerUltrasonido(): { sujeto: string; lecturas: AstronautVariableReading[] }[] {
  for (const p of [PYTHON, MODELO, SRC, ...IMGS]) {
    if (!existsSync(p)) throw new Error(`Falta ${p}. Ver README: sección Tipo B / DeepACSA.`);
  }
  const r = spawnSync(PYTHON, [PUENTE, SRC, MODELO, "RF", String(PROFUNDIDAD_CM), ...IMGS], {
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  });
  const ultima = r.stdout.trim().split("\n").at(-1) ?? "";
  if (r.status !== 0 || !ultima.startsWith("[")) {
    throw new Error(`DeepACSA falló (código ${r.status}): ${r.stderr.slice(-800)}`);
  }
  const resultados = JSON.parse(ultima) as ResultadoPuente[];
  return resultados.map((x) => {
    const ref = REFERENCIA[x.archivo];
    const coincide = x.area_cm2 !== undefined && ref !== undefined && Math.abs(x.area_cm2 - ref) < 1e-6;
    return {
      sujeto: `DeepACSA-ejemplo-${x.archivo}`,
      lecturas: [
        lecturaB("V47", {
          valor: x.area_cm2 !== undefined ? Math.round(x.area_cm2 * 100) / 100 : null,
          timestamp: isoRelativo(1, "00:00"),
          naturaleza_dato: "inferida",
          origen_dato: "real_dataset",
          fuente_referencia: FUENTE,
          observaciones: x.error
            ? `ERROR: ${x.error}`
            : `Imagen de ejemplo EFOV de DeepACSA (persona sana en Tierra, no astronauta). Segmentación unet3plus_RectFem_v0.3.1, calibración por línea de escala (${x.linea_escala_px} px = ${PROFUNDIDAD_CM} cm), ${x.pixeles_mascara} px de máscara. ${coincide ? "Reproduce exactamente" : "NO reproduce"} el valor publicado por DeepACSA (${ref} cm²). Sin fecha: ancla 2000-01-01.`,
        }),
      ],
    };
  });
}
