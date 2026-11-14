#!/usr/bin/env node
// Prueba el modelo preentrenado de tiras de orina de Roboflow Universe.
// Variables 04:A22a–A22i (Persona 5). Ver investigacion-variables-persona5.md, §7.
//
// Modelo: urinestrip-j7uvp/3 (proyecto "UrineStrip", CC BY 4.0, 77 imágenes).
// https://universe.roboflow.com/daongochuy-r93ia/urinestrip-j7uvp
//
// QUÉ HACE EL MODELO: localiza en la foto los cuadros de color de la tira (color1..color4)
// y el código QR. NO lee el valor clínico (p. ej. "nitritos positivos"): para eso hay que
// comparar el color de cada cuadro con la tabla del fabricante, en un paso posterior.
//
// Requisitos: Node 18 o superior. Sin dependencias.
//
// Uso (la clave NUNCA va en el código ni en el chat; va en una variable de entorno):
//   1. Crear una cuenta gratuita en https://app.roboflow.com
//   2. Copiar la clave de API en Settings → API Keys
//   3. Git Bash / macOS / Linux:
//        ROBOFLOW_API_KEY=xxxx node Planeacion/Katy/scripts/probar-modelo-tira.mjs --image foto.jpg
//      PowerShell:
//        $env:ROBOFLOW_API_KEY="xxxx"; node Planeacion/Katy/scripts/probar-modelo-tira.mjs --image foto.jpg
//
// Opcional: --conf 40 (confianza mínima en %, por defecto 40)

import { readFile } from "node:fs/promises";

const MODEL_ID = "urinestrip-j7uvp/3";
const ENDPOINTS = ["https://serverless.roboflow.com", "https://detect.roboflow.com"];

const args = process.argv.slice(2);
const get = (flag, def) => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : def;
};
const imagePath = get("--image");
const conf = Number(get("--conf", "40"));
const key = process.env.ROBOFLOW_API_KEY;

if (!key) {
  process.exitCode = 2;
  console.error(
    "Falta la clave: define la variable de entorno ROBOFLOW_API_KEY (ver instrucciones al inicio del archivo).",
  );
} else if (!imagePath) {
  process.exitCode = 2;
  console.error("Falta la foto: usa --image ruta/a/foto.jpg");
}

async function main() {
const image = (await readFile(imagePath)).toString("base64");

let lastError = "";
for (const base of ENDPOINTS) {
  const url = `${base}/${MODEL_ID}?api_key=${encodeURIComponent(key)}&confidence=${conf}`;
  const t0 = Date.now();
  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: image,
    });
  } catch (e) {
    lastError = `${base}: sin conexión (${e.message})`;
    continue;
  }
  const ms = Date.now() - t0;
  const text = await res.text();
  if (!res.ok) {
    // La clave nunca se imprime: solo el código y el inicio del mensaje del servidor.
    lastError = `${base}: HTTP ${res.status} ${text.slice(0, 160)}`;
    if (res.status === 401 || res.status === 403) break; // clave inválida: no tiene caso probar el otro
    continue;
  }
  const data = JSON.parse(text);
  const preds = data.predictions ?? [];
  console.log(`Modelo ${MODEL_ID} vía ${base} · ${ms} ms · ${preds.length} detecciones (confianza ≥ ${conf} %)\n`);
  console.table(
    preds.map((p) => ({
      clase: p.class,
      confianza: `${Math.round(p.confidence * 100)} %`,
      x: Math.round(p.x),
      y: Math.round(p.y),
      ancho: Math.round(p.width),
      alto: Math.round(p.height),
    })),
  );
  const pads = preds.filter((p) => p.class?.startsWith("color")).length;
  const qr = preds.some((p) => p.class === "qr");
  console.log(`\nCuadros de color encontrados: ${pads} · Código QR: ${qr ? "sí" : "no"}`);
  console.log("Siguiente paso (no incluido): comparar el color de cada cuadro con la tabla del fabricante.");
  return 0;
}

console.error(`No se pudo ejecutar el modelo. ${lastError}`);
return 1;
}

if (key && imagePath) process.exitCode = await main();
