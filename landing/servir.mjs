// Dev: landing en «/» y todo lo demás al backend (igual que nginx en el VPS).
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const RAIZ = new URL("..", import.meta.url).pathname, BACK = Number(process.env.BACKEND || 8788), PUERTO = Number(process.env.PUERTO || 8787);
const tipos = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mp4': 'video/mp4', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg' };
const estatico = { '/': 'landing/index.html', '/index.html': 'landing/index.html', '/styles.css': 'landing/styles.css', '/main.js': 'landing/main.js' };
http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x'); let f = estatico[u.pathname];
  if (!f && u.pathname.startsWith('/video/')) f = u.pathname.slice(1);
  if (!f && u.pathname.startsWith('/recursos/')) f = 'landing' + u.pathname;
  if (u.pathname === '/estado') u.pathname = '/';
  if (f) { const p = path.join(RAIZ, f); return fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': tipos[path.extname(p)] || 'application/octet-stream', 'cache-control': 'no-store' }); res.end(d); }); }
  const r = http.request({ host: '127.0.0.1', port: BACK, method: req.method, path: u.pathname + u.search, headers: req.headers }, (b) => { res.writeHead(b.statusCode, b.headers); b.pipe(res); });
  r.on('error', () => { res.writeHead(502); res.end('backend no responde'); }); req.pipe(r);
}).listen(PUERTO, () => console.log('landing en http://localhost:' + PUERTO));
