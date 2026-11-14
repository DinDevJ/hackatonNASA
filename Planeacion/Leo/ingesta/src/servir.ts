/**
 * Servidor estático mínimo para la página del reloj (sin dependencias).
 * Web Bluetooth exige un contexto seguro: localhost cuenta como seguro.
 * Uso: npm run reloj   →   http://localhost:8090
 */
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = resolve(fileURLToPath(new URL("../../reloj-en-vivo/", import.meta.url)));
const PUERTO = Number(process.env["PORT"] ?? 8090);
const TIPOS: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
};

createServer((req, res) => {
  const ruta = decodeURIComponent((req.url ?? "/").split("?")[0] ?? "/");
  const archivo = normalize(join(RAIZ, ruta === "/" ? "index.html" : ruta));
  if (!archivo.startsWith(RAIZ) || !existsSync(archivo) || !statSync(archivo).isFile()) {
    res.writeHead(404).end("No encontrado");
    return;
  }
  res.writeHead(200, { "Content-Type": TIPOS[extname(archivo)] ?? "application/octet-stream", "Cache-Control": "no-store" });
  createReadStream(archivo).pipe(res);
}).listen(PUERTO, "127.0.0.1", () => console.log(`Reloj en vivo: http://localhost:${PUERTO}`));
