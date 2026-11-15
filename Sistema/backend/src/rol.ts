/**
 * Dos procesos, mismo backend:
 *   npm run tierra   → servidor HTTPS de Tierra (puerto 8443): enlace + consola /tierra
 *   npm run nave     → backend de la nave (HTTP 8787) + cliente HTTPS hacia Tierra
 * Variables: BD, PUERTO (0 = efímero), TIERRA_URL, TIERRA_CA, TLS_CERT, TLS_KEY, PING_S, TIMEOUT_S, SIMULAR_OWLT=1.
 * Imprime una línea exacta `PUERTO=<n>` al escuchar.
 */
import { createServer as crearHttps } from 'node:https';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { abrir } from './db.ts';
import { cargarInicial } from './semillas.ts';
import { migrarSalud, sembrarSalud } from './salud.ts';
import { atenderEnlace, iniciarEnlaceNave } from './enlace-https.ts';
import { iniciarEnlace } from './enlace.ts';
import { cargarReferencias } from './referencias.ts';
import { construir, manejador, registrarActividad, anotar } from './servidor.ts';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const rol = process.argv[2] ?? process.env.ROL;
if (rol !== 'nave' && rol !== 'tierra') {
  console.error(`✗ rol inválido "${rol ?? ''}": usa \`npm run nave\` o \`npm run tierra\` (o ROL=nave|tierra)`);
  process.exit(1);
}
const env = process.env;
const num = (v: string | undefined, def: number) => { const n = Number(v); return v !== undefined && v !== '' && Number.isFinite(n) ? n : def; };
const ruta = (v: string | undefined, def: string) => resolve(RAIZ, v || def);

const db = abrir(ruta(env.BD, `eva-${rol}.db`));
cargarInicial(db, join(RAIZ, 'semillas', 'inicial.json'));
migrarSalud(db);
const salud = sembrarSalud(db);
console.log(salud.ausente ? `Salud: no hay CSV en ${salud.dir}; tablas vacías`
  : salud.error ? `Salud: no se pudo sembrar (${salud.error})` : `Salud: ${salud.padecimientos} padecimientos, ${salud.vinculos} vínculos`);

const cerrar: Array<() => unknown | Promise<unknown>> = [];
let cerrando = false;
async function salir() {
  if (cerrando) return;
  cerrando = true;
  for (const f of cerrar) { try { await f(); } catch { /* seguir cerrando */ } }
  try { db.close(); } catch { /* ya cerrada */ }
  process.exit(0);
}
process.on('SIGINT', () => { void salir(); });
process.on('SIGTERM', () => { void salir(); });

function escuchar(srv: ReturnType<typeof construir> | ReturnType<typeof crearHttps>, puerto: number, proto: string, alListo: (n: number) => void) {
  srv.on('error', (e: NodeJS.ErrnoException) => {
    console.error(e.code === 'EADDRINUSE' ? `✗ El puerto ${puerto} ya está en uso.` : `✗ ${e.message}`);
    process.exit(1);
  });
  srv.listen(puerto, () => {
    const n = (srv.address() as { port: number }).port;
    console.log(`PUERTO=${n}`);
    console.log(`EVA ${rol} · ${proto}://localhost:${n}`);
    cerrar.push(() => new Promise<void>((ok) => { srv.close(() => ok()); srv.closeAllConnections(); }));
    alListo(n);
  });
}

if (rol === 'tierra') {
  const cert = ruta(env.TLS_CERT, 'certs/tierra.crt');
  const key = ruta(env.TLS_KEY, 'certs/tierra.key');
  if (!existsSync(cert) || !existsSync(key)) { console.error('✗ Falta el certificado TLS de Tierra: ejecuta `npm run certs`'); process.exit(1); }
  const srv = crearHttps({ key: readFileSync(key), cert: readFileSync(cert) }, manejador(db, { rol: 'tierra', enlace: (rq, rs) => atenderEnlace(db, rq, rs) }));
  escuchar(srv, num(env.PUERTO, 8443), 'https', () => {
    console.log('  consola de control de misión: /tierra · estado del enlace: /api/enlace/estado');
  });
} else {
  const ca = ruta(env.TIERRA_CA, 'certs/tierra.crt');
  if (!existsSync(ca)) { console.error(`✗ Falta el certificado de la CA de Tierra (${ca}): ejecuta \`npm run certs\``); process.exit(1); }
  console.log(`Referencias clínicas: ${cargarReferencias(db, resolve(env.MEDIBLES ?? join(RAIZ, 'semillas', 'medibles.json'))).cargadas ?? 0} cargadas`);
  cerrar.push(iniciarEnlace(db, { simularLlegadas: false }));
  registrarActividad();
  const pingMs = num(env.PING_S, 60) * 1000;
  const enlace = iniciarEnlaceNave(db, {
    url: env.TIERRA_URL ?? 'https://localhost:8443', ca: readFileSync(ca),
    pingMs, timeoutMs: num(env.TIMEOUT_S, 5) * 1000, syncMs: Math.min(1000, Math.max(50, pingMs / 2)),
    backoffBaseMs: Math.min(1000, pingMs), backoffTopeMs: pingMs, simularOwlt: env.SIMULAR_OWLT === '1',
  });
  cerrar.unshift(() => enlace.parar());
  escuchar(construir(db, { rol: 'nave' }), num(env.PUERTO, 8787), 'http', () => {
    anotar(`enlace HTTPS hacia ${env.TIERRA_URL ?? 'https://localhost:8443'} (ping cada ${pingMs / 1000} s)`);
    console.log('  panel de la nave: /nave · estado del enlace: /api/enlace/estado');
  });
}
