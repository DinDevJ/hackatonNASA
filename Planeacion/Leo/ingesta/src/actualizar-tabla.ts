/**
 * Completa las columnas pendientes de Planeacion/Leo/tabla-investigacion.csv (entregable obligatorio
 * de la asignación) con lo que la ingesta ya obtuvo y verificó.
 * Uso: npm run tabla   (requiere out/clasificacion-variables.json)
 */
import { parse } from "csv-parse/sync";
import { readFileSync, writeFileSync } from "node:fs";

const RUTA = new URL("../../tabla-investigacion.csv", import.meta.url);
const clas = JSON.parse(readFileSync(new URL("../out/clasificacion-variables.json", import.meta.url), "utf8")) as {
  filas: { id: string; tipo: string; origen: string; nivel: string; grupo: string; watch5: string; nota: string }[];
};
const porId = new Map(clas.filas.map((f) => [f.id, f]));

const MMASH = "https://physionet.org/content/mmash/1.0.0/";
const CGM = "https://physionet.org/content/cgmacros/1.0.0/";
const DEEP = "https://doi.org/10.5281/zenodo.19130694";
const USDA = "https://fdc.nal.usda.gov/api-guide";

/** [dataset_url, formato, modelo_existente, estado] por variable con trabajo hecho. */
const HECHO: Record<string, [string, string, string, string]> = {
  "03:V30": [MMASH, "CSV (sleep.csv)", "Algoritmo del actígrafo (en el dataset)", "Probado"],
  "03:V33": [MMASH, "CSV (sleep.csv)", "Algoritmo del actígrafo (en el dataset)", "Probado"],
  "03:V34": [MMASH, "CSV (sleep.csv)", "Algoritmo del actígrafo (en el dataset)", "Probado"],
  "03:V35": [MMASH, "CSV (sleep.csv)", "Algoritmo del actígrafo (en el dataset)", "Probado"],
  "03:V36": [MMASH, "CSV (sleep.csv)", "Algoritmo del actígrafo (en el dataset)", "Probado"],
  "02:V53": [MMASH, "CSV (Actigraph.csv, FC 1 Hz)", "No requiere (cálculo); adaptador HUAWEI WATCH 5", "Probado"],
  "02:V56": [CGM, "CSV (METs del Fitbit por minuto)", "No requiere (umbral ≥ 6 METs)", "Probado"],
  "02:V92": [CGM, "CSV (Dexcom G6 Pro y Libre Pro)", "No requiere (estadística diaria)", "Probado"],
  "02:V47": [DEEP, "TIFF (ultrasonido EFOV) + modelo .h5", "DeepACSA unet3plus_RectFem v0.3.1 (Apache-2.0)", "Probado"],
  "02:V81": [CGM, "CSV (comidas)", "No requiere (suma)", "Probado"],
  "02:V82": [CGM, "CSV (comidas + bio.csv)", "No requiere (suma)", "Probado"],
  "02:V93": [CGM, "CSV (comidas)", "No requiere (Atwater 4 kcal/g)", "Probado"],
  "02:V79": [USDA, "JSON (API)", "No requiere", "Fuente encontrada (API limitada por DEMO_KEY)"],
  "02:V83": [USDA, "JSON (API)", "No requiere", "Fuente encontrada (API limitada por DEMO_KEY)"],
  "02:V84": [USDA, "JSON (API)", "No requiere", "Fuente encontrada (API limitada por DEMO_KEY)"],
  "02:V86": [CGM, "CSV (bio.csv: laboratorio y glucómetro Contour)", "No requiere", "Datos descargados"],
  "02:V89": [CGM, "CSV (bio.csv)", "No requiere", "Datos descargados"],
  "02:V90": [CGM, "CSV (bio.csv)", "No requiere", "Datos descargados"],
  "02:V43": ["NO DISPONIBLE (simulado)", "JSON", "Fórmula de Epley (no es modelo entrenado)", "Probado (simulado)"],
  "02:V51": ["NO DISPONIBLE (simulado)", "JSON", "Extrapolación FC–VO₂ y razón de Uth", "Probado (simulado)"],
};
const SIMULADAS = new Set(["02:V44", "02:V52", "02:V54", "02:V55", "03:V31", "03:V43", "03:V49"]);

function dificultad(f: { tipo: string; origen: string }): string {
  if (f.tipo === "⟶") return "—";
  if (f.tipo === "❌") return "Muy difícil";
  if (f.origen.includes("No a bordo")) return "Difícil";
  if (f.origen.includes("CMO") || f.origen.includes("Modelo")) return "Media";
  return "Fácil";
}

const filas = parse(readFileSync(RUTA, "utf8"), { columns: true, bom: true }) as Record<string, string>[];
const cols = Object.keys(filas[0]!);
for (const r of filas) {
  const c = porId.get(r["id"]!);
  if (!c) continue;
  const h = HECHO[r["id"]!];
  if (h) [r["dataset_url"], r["formato"], r["modelo_existente"], r["estado"]] = h;
  else if (SIMULADAS.has(r["id"]!)) [r["dataset_url"], r["formato"], r["modelo_existente"], r["estado"]] = ["NO DISPONIBLE (simulado con cifras publicadas)", "JSON", "No requiere", "Probado (simulado)"];
  else if (c.tipo === "⟶") [r["dataset_url"], r["formato"], r["modelo_existente"], r["estado"]] = ["Ver 01:V8", "—", "—", "Fusionada en 01:V8"];
  else if (c.tipo === "❌") [r["dataset_url"], r["formato"], r["modelo_existente"], r["estado"]] = ["NO DISPONIBLE", "—", "—", "Descartada"];
  else [r["dataset_url"], r["formato"], r["modelo_existente"], r["estado"]] = ["NO DISPONIBLE", "Formulario (Zod)", "No requiere (input manual)", "Fuente encontrada"];
  r["dificultad"] = dificultad(c);
  // De la clasificación vieja (primer plan) solo se conserva la nota de licencia.
  const licencia = (r["observaciones"] ?? "").split(" · ").find((p) => p.startsWith("Licencia:"));
  const tipoTxt = c.tipo === "❌" ? "Descartada" : c.tipo === "⟶" ? "Fusionada en 01:V8" : `Tipo ${c.tipo}`;
  r["observaciones"] = [tipoTxt, `Julio: ${c.origen} ${c.nivel} ${c.grupo}`, `WATCH 5: ${c.watch5}`, c.nota, licencia].filter(Boolean).join(" · ");
}

const q = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
writeFileSync(RUTA, "﻿" + [cols.join(","), ...filas.map((r) => cols.map((k) => q(r[k] ?? "")).join(","))].join("\r\n") + "\r\n");
const pend = filas.filter((r) => r["dataset_url"] === "PENDIENTE").length;
console.log(`✓ tabla-investigacion.csv actualizada: ${filas.length} filas, ${pend} con dataset PENDIENTE`);
