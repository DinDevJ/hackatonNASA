// Lunna · ver la landing en local igual que en el VPS: un solo comando, en Windows, macOS o Linux.
//
//   node landing/servir.mjs          → http://localhost:8787
//
// Sirve la landing en «/» y pasa todo lo demás (interfaces, simulador, API) al backend en modo simulación,
// que este mismo script arranca en el puerto 8788 (o reutiliza si ya está corriendo ahí).
// Variables opcionales: PUERTO (por defecto 8787) y BACKEND (por defecto 8788).
//   PowerShell:  $env:PUERTO=8790; node landing/servir.mjs
//   bash:        PUERTO=8790 node landing/servir.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const RAIZ = fileURLToPath(new URL('..', import.meta.url));
const PUERTO = Number(process.env.PUERTO || 8787);
const BACK = Number(process.env.BACKEND || 8788);
const TIPOS = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mp4': 'video/mp4',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon' };
const ESTATICO = { '/': 'landing/index.html', '/index.html': 'landing/index.html', '/styles.css': 'landing/styles.css', '/main.js': 'landing/main.js' };

const responde = (puerto) => new Promise((ok) => {
  const r = http.get({ host: '127.0.0.1', port: puerto, path: '/api/salud', timeout: 1500 }, (res) => { res.resume(); ok(res.statusCode === 200); });
  r.on('error', () => ok(false)); r.on('timeout', () => { r.destroy(); ok(false); });
});

// ── Backend en modo simulación ──
let hijo = null;
if (await responde(BACK)) {
  console.log(`backend: ya está corriendo en el puerto ${BACK}, lo reutilizo`);
} else {
  hijo = spawn(process.execPath, ['--experimental-strip-types', '--disable-warning=ExperimentalWarning',
    path.join('..', 'Sistema', 'backend', 'src', 'servidor.ts'), '--modo', 'simulacion', '--simulacion', '.'],
  { cwd: path.join(RAIZ, 'Simulacion'), env: { ...process.env, PUERTO: String(BACK) }, stdio: ['ignore', 'pipe', 'pipe'] });
  const prefijo = (b) => b.toString().split(/\r?\n/).filter(Boolean).forEach((l) => console.log(`  [backend] ${l}`));
  hijo.stdout.on('data', prefijo); hijo.stderr.on('data', prefijo);
  hijo.on('exit', (c) => { console.error(`backend: terminó (código ${c}). Revisa los mensajes de arriba.`); process.exit(1); });
  for (let i = 0; i < 40 && !(await responde(BACK)); i++) await new Promise((r) => setTimeout(r, 500));
  if (!(await responde(BACK))) { console.error(`backend: no respondió en el puerto ${BACK}`); hijo.kill(); process.exit(1); }
  console.log(`backend: listo en el puerto ${BACK}`);
}
const salir = () => { if (hijo) hijo.kill(); process.exit(0); };
process.on('SIGINT', salir); process.on('SIGTERM', salir);

// ── Landing + proxy ──
const servidor = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  let f = ESTATICO[u.pathname];
  if (!f && u.pathname.startsWith('/video/')) f = u.pathname.slice(1);
  if (!f && u.pathname.startsWith('/recursos/')) f = 'landing' + u.pathname;
  if (u.pathname === '/estado') u.pathname = '/';
  if (f) {
    const p = path.join(RAIZ, ...f.split('/'));
    if (!p.startsWith(RAIZ)) { res.writeHead(403); return res.end(); }
    return fs.readFile(p, (e, d) => {
      if (e) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { 'content-type': TIPOS[path.extname(p)] || 'application/octet-stream', 'cache-control': 'no-store' });
      res.end(d);
    });
  }
  const r = http.request({ host: '127.0.0.1', port: BACK, method: req.method, path: u.pathname + u.search, headers: req.headers },
    (b) => { res.writeHead(b.statusCode, b.headers); b.pipe(res); });
  r.on('error', () => { res.writeHead(502); res.end('el backend no responde'); });
  req.pipe(r);
});
servidor.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.error(`\nEl puerto ${PUERTO} ya está ocupado. Quizá quedó abierto un «npm start» de Simulacion: ciérralo (Ctrl+C en esa terminal)`);
    console.error(`o usa otro puerto.  PowerShell: $env:PUERTO=8790; node landing/servir.mjs   ·   bash: PUERTO=8790 node landing/servir.mjs\n`);
  } else console.error(e);
  if (hijo) hijo.kill();
  process.exit(1);
});
servidor.listen(PUERTO, () => {
  console.log(`\nLanding: http://localhost:${PUERTO}`);
  console.log(`Para datos en vivo abre http://localhost:${PUERTO}/simulador, pulsa «Prepare mission» y deja esa pestaña abierta.\n`);
});
