/**
 * Enlace HTTPS real (Tierra y nave con TLS en puertos efímeros, BDs en archivos temporales).
 * Todos los tiempos son cortos. Cada test afirma 0 pérdidas y 0 duplicados.
 */
import { test, before, after } from 'node:test';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { spawn, execFileSync, type ChildProcess } from 'node:child_process';
import { createServer as crearHttps, request as https, type Server } from 'node:https';
import { createServer as crearNet } from 'node:net';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { abrir, ahora, type BD } from '../src/db.ts';
import { cargarInicial } from '../src/semillas.ts';
import { encolarBajada, escribirEnlace, redactarAviso } from '../src/enlace.ts';
import { generarCert } from '../src/certs.ts';
import { atenderEnlace, estadoNave, iniciarEnlaceNave, type FallasTierra, type OpcionesNave } from '../src/enlace-https.ts';
import { manejador } from '../src/servidor.ts';
import { idEmisor, pendientes, prepararLote, type Ack } from '../src/sincro.ts';

const RAIZ = fileURLToPath(new URL('..', import.meta.url));
const SEMILLA = join(RAIZ, 'semillas', 'inicial.json');
let dir = '';
let cert = '', key = '';
let sinOpenssl: string | false = false;
let n = 0;

before(() => {
  try { execFileSync('openssl', ['version'], { stdio: 'ignore' }); }
  catch { sinOpenssl = 'openssl no está instalado'; return; }
  dir = mkdtempSync(join(tmpdir(), 'eva-https-'));
  ({ cert, key } = generarCert(dir));
});
after(() => { if (dir) rmSync(dir, { recursive: true, force: true }); });
const t = (nombre: string, f: () => Promise<void>) =>
  test(nombre, { timeout: 60_000 }, async (ctx) => { if (sinOpenssl) { ctx.skip(sinOpenssl); return; } await f(); });

const esperar = async (cond: () => boolean, msMax: number, que = 'condición') => {
  const fin = Date.now() + msMax;
  while (!cond()) {
    if (Date.now() > fin) throw new Error(`tiempo agotado esperando: ${que}`);
    await new Promise((r) => setTimeout(r, 10));
  }
};

const nuevaBd = (nombre: string): BD => {
  const db = abrir(join(dir, `${nombre}-${++n}.db`));
  cargarInicial(db, SEMILLA);
  return db;
};
const cuenta = (db: BD, sql: string, ...a: string[]) => Number((db.prepare(sql).get(...a) as { n: number }).n);

interface Tierra { db: BD; srv: Server; puerto: number; url: string; fallas: FallasTierra; acks: Ack[]; estados: string[]; cerrar(): Promise<void> }

/** Servidor HTTPS de Tierra real (mismo manejador que `npm run tierra`), con espía de respuestas. */
async function levantarTierra(db: BD, puerto = 0, fallas: FallasTierra = {}): Promise<Tierra> {
  const acks: Ack[] = [];
  const estados: string[] = [];
  const h = manejador(db, { rol: 'tierra', enlace: async (rq, rs) => {
    const ruta = rq.url ?? '';
    rs.on('finish', () => estados.push(`${ruta} ${rs.statusCode}`));
    const fin = rs.end.bind(rs) as (c?: unknown) => unknown;
    (rs as unknown as { end: (c?: unknown) => unknown }).end = (c?: unknown) => {
      if (ruta === '/enlace/lote' && rs.statusCode === 200 && c) { try { acks.push(JSON.parse(String(c)) as Ack); } catch { /* no es JSON */ } }
      return fin(c);
    };
    return atenderEnlace(db, rq, rs, fallas);
  } });
  const srv = crearHttps({ key: readFileSync(key), cert: readFileSync(cert) }, h);
  await new Promise<void>((ok, mal) => { srv.once('error', mal); srv.listen(puerto, '127.0.0.1', ok); });
  const p = (srv.address() as { port: number }).port;
  return { db, srv, puerto: p, url: `https://127.0.0.1:${p}`, fallas, acks, estados,
    cerrar: () => new Promise<void>((ok) => { srv.close(() => ok()); srv.closeAllConnections(); }) };
}

const OPC = { pingMs: 150, syncMs: 30, backoffBaseMs: 30, backoffTopeMs: 300, timeoutMs: 800 };
const opcionesNave = (url: string, extra: Partial<OpcionesNave> = {}): OpcionesNave => ({ url, ca: readFileSync(cert), ...OPC, ...extra });

/** Anota los (estado, motivo) que pasan por la BD de la nave. */
function observar(db: BD, alVer?: (e: string) => void) {
  const vistos = new Set<string>();
  const iv = setInterval(() => {
    try { const s = estadoNave(db); const k = `${s.estado}|${s.motivo ?? ''}`; if (!vistos.has(k)) { vistos.add(k); alVer?.(k); } } catch { /* cerrada */ }
  }, 3);
  return { vistos, parar: () => clearInterval(iv), vio: (re: RegExp) => [...vistos].some((v) => re.test(v)) };
}

function encolar(nave: BD, total: number, prios = [2, 0, 1, 2, 0, 1, 2]): void {
  for (let i = 0; i < total; i++) encolarBajada(nave, 'alerta', { i }, ahora(), prios[i % prios.length]!);
}

/** 0 pérdidas y 0 duplicados: todo lo emitido está en `entrada` de Tierra, una vez, y `bajada` de Tierra sin repetidos. */
function sinPerdidasNiDuplicados(nave: BD, tierra: BD, esperados: number): void {
  const emisor = idEmisor(nave, 'nave');
  const emitidos = (nave.prepare(`SELECT seq FROM bajada WHERE emisor = ? ORDER BY seq`).all(emisor) as Array<{ seq: number }>).map((r) => r.seq);
  assert.equal(emitidos.length, esperados, 'nº encolado');
  const recibidos = (tierra.prepare(`SELECT seq FROM entrada WHERE emisor = ? ORDER BY seq`).all(emisor) as Array<{ seq: number }>).map((r) => r.seq);
  assert.deepEqual(recibidos, emitidos, 'cada seq emitido está en la entrada de Tierra');
  assert.equal(cuenta(tierra, `SELECT COUNT(*) AS n FROM entrada WHERE emisor = ?`, emisor),
    cuenta(tierra, `SELECT COUNT(DISTINCT seq) AS n FROM entrada WHERE emisor = ?`, emisor), 'COUNT = COUNT DISTINCT');
  assert.equal(cuenta(tierra, `SELECT COUNT(*) AS n FROM (SELECT emisor, seq FROM bajada GROUP BY emisor, seq HAVING COUNT(*) > 1)`), 0, 'bajada sin repetidos');
  assert.equal(cuenta(tierra, `SELECT COUNT(*) AS n FROM bajada WHERE emisor = ?`, emisor), esperados, 'bajada de Tierra = encolado');
}

function postear(url: string, camino: string, cuerpo: string, cab: Record<string, string>): Promise<{ estado: number; cuerpo: string }> {
  return new Promise((ok, mal) => {
    const u = new URL(url);
    const rq = https({ hostname: u.hostname, port: u.port, path: camino, method: 'POST', ca: readFileSync(cert), agent: false,
      headers: { 'content-length': Buffer.byteLength(cuerpo), ...cab } }, (rs) => {
      const tr: Buffer[] = []; rs.on('data', (x: Buffer) => tr.push(x));
      rs.on('end', () => ok({ estado: rs.statusCode ?? 0, cuerpo: Buffer.concat(tr).toString('utf8') }));
    });
    rq.on('error', mal); rq.end(cuerpo);
  });
}

/** Ejecuta `f` y siempre cierra nave, Tierra y BDs. */
async function mundo(f: (m: { nave: BD; tierra: BD; cierre: Array<() => unknown> }) => Promise<void>) {
  const nave = nuevaBd('nave'); const tierra = nuevaBd('tierra');
  const cierre: Array<() => unknown> = [];
  try { await f({ nave, tierra, cierre }); }
  finally {
    for (const c of cierre.reverse()) { try { await c(); } catch { /* seguir */ } }
    nave.close(); tierra.close();
  }
}

t('1. desconexión a mitad de lote: no se aplica nada de ese lote y termina todo', () => mundo(async ({ nave, tierra, cierre }) => {
  const T = await levantarTierra(tierra); cierre.push(() => T.cerrar());
  encolar(nave, 60);
  let entradaAlCorte = -1;
  const ob = observar(nave, (e) => { if (/CORTE_SIMULADO/.test(e) && entradaAlCorte < 0) entradaAlCorte = cuenta(tierra, `SELECT COUNT(*) AS n FROM entrada`); });
  cierre.push(ob.parar);
  const en = iniciarEnlaceNave(nave, opcionesNave(T.url, { loteMax: 10, fallas: { cortarAMitadUnaVez: true } })); cierre.push(() => en.parar());
  await esperar(() => pendientes(nave, 'nave') === 0 && cuenta(tierra, `SELECT COUNT(*) AS n FROM entrada`) === 60, 15_000, 'vaciar 60 mensajes');
  assert.ok(ob.vio(/^DESCONECTADO\|.*CORTE_SIMULADO/), `vio DESCONECTADO por el corte: ${[...ob.vistos]}`);
  assert.equal(entradaAlCorte, 0, 'Tierra no aplicó nada del lote cortado');
  sinPerdidasNiDuplicados(nave, tierra, 60);
}));

t('2. reenvío duplicado: la segunda vez todo son duplicados', () => mundo(async ({ nave, tierra, cierre }) => {
  const T = await levantarTierra(tierra); cierre.push(() => T.cerrar());
  encolar(nave, 8);
  const l = prepararLote(nave, 'nave', 20)!;
  const cab = { 'x-eva-sha256': l.sha256, 'x-eva-emisor': l.lote.emisor };
  const a1 = JSON.parse((await postear(T.url, '/enlace/lote', l.cuerpo, cab)).cuerpo) as Ack;
  const r2 = await postear(T.url, '/enlace/lote', l.cuerpo, cab);
  const a2 = JSON.parse(r2.cuerpo) as Ack;
  assert.equal(r2.estado, 200);
  assert.equal(a1.aplicados, 8);
  assert.equal(a2.aplicados, 0);
  assert.equal(a2.duplicados, 8);
  assert.equal(cuenta(tierra, `SELECT COUNT(*) AS n FROM entrada`), 8);
}));

t('3. pérdida de ACK: la nave reenvía y Tierra lo cuenta como duplicado', () => mundo(async ({ nave, tierra, cierre }) => {
  const T = await levantarTierra(tierra, 0, { cortarTrasAplicarUnaVez: true }); cierre.push(() => T.cerrar());
  encolar(nave, 12);
  const en = iniciarEnlaceNave(nave, opcionesNave(T.url, { loteMax: 20 })); cierre.push(() => en.parar());
  await esperar(() => pendientes(nave, 'nave') === 0, 10_000, 'nave sin pendientes');
  assert.equal(T.fallas.cortarTrasAplicarUnaVez, false, 'la falla se disparó');
  assert.ok(T.acks.some((a) => a.aplicados === 0 && a.duplicados === 12), `Tierra vio el reenvío como duplicados: ${JSON.stringify(T.acks)}`);
  sinPerdidasNiDuplicados(nave, tierra, 12);
}));

t('4. lote corrupto: 422, no se aplica nada y luego llega bien', () => mundo(async ({ nave, tierra, cierre }) => {
  const T = await levantarTierra(tierra); cierre.push(() => T.cerrar());
  encolar(nave, 15);
  const ob = observar(nave); cierre.push(ob.parar);
  const en = iniciarEnlaceNave(nave, opcionesNave(T.url, { loteMax: 20, fallas: { corromperUnaVez: true } })); cierre.push(() => en.parar());
  await esperar(() => T.estados.includes('/enlace/lote 422'), 10_000, 'respuesta 422');
  assert.equal(cuenta(tierra, `SELECT COUNT(*) AS n FROM entrada`), 0, 'nada aplicado con el lote corrupto');
  await esperar(() => pendientes(nave, 'nave') === 0, 10_000, 'nave sin pendientes');
  assert.ok(ob.vio(/DESCONECTADO\|HTTP 422/));
  sinPerdidasNiDuplicados(nave, tierra, 15);
}));

t('5. Tierra apagada al inicio: reconecta y vacía la cola en orden (prioridad, seq)', () => mundo(async ({ nave, tierra, cierre }) => {
  const reserva = crearNet();
  await new Promise<void>((ok) => reserva.listen(0, '127.0.0.1', ok));
  const puerto = (reserva.address() as { port: number }).port;
  await new Promise<void>((ok) => reserva.close(() => ok()));
  encolar(nave, 30);
  const ob = observar(nave); cierre.push(ob.parar);
  const en = iniciarEnlaceNave(nave, opcionesNave(`https://127.0.0.1:${puerto}`, { loteMax: 10 })); cierre.push(() => en.parar());
  await esperar(() => ob.vio(/^DESCONECTADO\|ECONNREFUSED/), 5000, 'DESCONECTADO por ECONNREFUSED');
  const T = await levantarTierra(tierra, puerto); cierre.push(() => T.cerrar());
  await esperar(() => estadoNave(nave).estado === 'CONECTADO', 5000, 'CONECTADO');
  await esperar(() => pendientes(nave, 'nave') === 0 && cuenta(tierra, `SELECT COUNT(*) AS n FROM entrada`) === 30, 10_000, 'cola vacía');
  const emisor = idEmisor(nave, 'nave');
  const esperado = (nave.prepare(`SELECT seq FROM bajada WHERE emisor = ? ORDER BY prioridad, seq`).all(emisor) as Array<{ seq: number }>).map((r) => r.seq);
  const real = (tierra.prepare(`SELECT seq FROM entrada ORDER BY id`).all() as Array<{ seq: number }>).map((r) => r.seq);
  assert.deepEqual(real, esperado, 'orden de entrada = (prioridad, seq)');
  sinPerdidasNiDuplicados(nave, tierra, 30);
}));

t('6. Tierra→nave con ACK perdido: aviso exactamente una vez y el acuse vuelve', () => mundo(async ({ nave, tierra, cierre }) => {
  const T = await levantarTierra(tierra, 0, { perderAckUnaVez: true }); cierre.push(() => T.cerrar());
  redactarAviso(tierra, { para: 'todos', texto: 'aviso de prueba SIMULADO' });
  const en = iniciarEnlaceNave(nave, opcionesNave(T.url)); cierre.push(() => en.parar());
  await esperar(() => cuenta(tierra, `SELECT COUNT(*) AS n FROM subida WHERE ack = 1`) === 1
    && cuenta(tierra, `SELECT COUNT(*) AS n FROM bajada WHERE tipo = 'acuse'`) === 1, 10_000, 'aviso confirmado y acuse en Tierra');
  assert.equal(T.fallas.perderAckUnaVez, false, 'la falla se disparó');
  assert.equal(cuenta(nave, `SELECT COUNT(*) AS n FROM subida`), 1);
  assert.equal(cuenta(nave, `SELECT COUNT(*) AS n FROM subida WHERE entregado = 1`), 1);
  assert.equal(cuenta(nave, `SELECT COUNT(*) AS n FROM entrada WHERE canal = 'subida'`), 1);
  assert.equal(cuenta(tierra, `SELECT COUNT(*) AS n FROM bajada WHERE tipo = 'acuse'`), 1, 'un solo acuse');
}));

t('7. latido: 503, caída de Tierra, vuelta y ventana cerrada', () => mundo(async ({ nave, tierra, cierre }) => {
  const T = await levantarTierra(tierra); cierre.push(() => T.cerrar());
  const en = iniciarEnlaceNave(nave, opcionesNave(T.url)); cierre.push(() => en.parar());
  const est = () => en.estado();
  await esperar(() => est().estado === 'CONECTADO', 5000, 'CONECTADO inicial');
  assert.ok(est().ultimo_ping_ok && est().rtt_ms !== null);
  T.fallas.pingEstado = 503;
  await esperar(() => est().estado === 'DESCONECTADO' && /503/.test(est().motivo ?? ''), 5000, 'DESCONECTADO por 503');
  assert.ok(est().intentos_fallidos >= 1 && est().proximo_intento);
  T.fallas.pingEstado = undefined;
  await esperar(() => est().estado === 'CONECTADO', 5000, 'CONECTADO tras quitar 503');
  assert.equal(est().intentos_fallidos, 0);
  await T.cerrar();
  await esperar(() => est().estado === 'DESCONECTADO', 5000, 'DESCONECTADO por Tierra cerrada');
  const T2 = await levantarTierra(tierra, T.puerto); cierre.push(() => T2.cerrar());
  await esperar(() => est().estado === 'CONECTADO', 5000, 'CONECTADO al volver Tierra');
  escribirEnlace(nave, { abierto: false });
  await esperar(() => est().estado === 'DESCONECTADO' && /^ventana cerrada/.test(est().motivo ?? ''), 5000, 'ventana cerrada');
  assert.equal(est().ventana_abierta, false);
}));

t('8. procesos reales: nave y Tierra con rol.ts', async () => {
  const hijos: ChildProcess[] = [];
  const bdT = join(dir, `proc-tierra-${++n}.db`); const bdN = join(dir, `proc-nave-${++n}.db`);
  const lanzar = (rol: 'tierra' | 'nave', env: Record<string, string>): Promise<{ p: ChildProcess; puerto: number }> => new Promise((ok, mal) => {
    const p = spawn(process.execPath, ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', 'src/rol.ts', rol],
      { cwd: RAIZ, env: { ...process.env, PUERTO: '0', TLS_CERT: cert, TLS_KEY: key, TIERRA_CA: cert, PING_S: '0.2', ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
    hijos.push(p);
    let buf = '', err = '';
    p.stderr!.on('data', (d: Buffer) => { err += d; });
    p.stdout!.on('data', (d: Buffer) => { buf += d; const m = /^PUERTO=(\d+)$/m.exec(buf); if (m) ok({ p, puerto: Number(m[1]) }); });
    p.on('exit', (c) => mal(new Error(`${rol} terminó (${c}) antes de escuchar: ${err.slice(0, 300)}`)));
    setTimeout(() => mal(new Error(`${rol} no escuchó a tiempo`)), 15_000).unref();
  });
  const get = (url: string, https_: boolean): Promise<{ estado: number; json: any }> => new Promise((ok, mal) => {
    const u = new URL(url);
    const rq = https({ hostname: u.hostname, port: u.port, path: u.pathname + u.search, ca: readFileSync(cert), agent: false }, (rs) => {
      const tr: Buffer[] = []; rs.on('data', (x: Buffer) => tr.push(x));
      rs.on('end', () => { try { ok({ estado: rs.statusCode ?? 0, json: JSON.parse(Buffer.concat(tr).toString()) }); } catch (e) { mal(e); } });
    });
    rq.on('error', mal); rq.end(); void https_;
  });
  const getNave = async (puerto: number, ruta: string) => (await (await fetch(`http://127.0.0.1:${puerto}${ruta}`)).json()) as any;
  try {
    const T = await lanzar('tierra', { BD: bdT });
    const N = await lanzar('nave', { BD: bdN, TIERRA_URL: `https://127.0.0.1:${T.puerto}` });
    const sondear = async (f: () => Promise<boolean>, ms: number, que: string) => {
      const fin = Date.now() + ms;
      while (Date.now() < fin) { try { if (await f()) return; } catch { /* aún no */ } await new Promise((r) => setTimeout(r, 50)); }
      throw new Error('tiempo agotado: ' + que);
    };
    const estadoN = async () => (await getNave(N.puerto, '/api/enlace/estado')).estado as string;
    await sondear(async () => (await estadoN()) === 'CONECTADO', 10_000, 'nave CONECTADA');
    const r = await fetch(`http://127.0.0.1:${N.puerto}/api/nave/avisos`, { method: 'POST', body: JSON.stringify({ texto: 'prueba de proceso SIMULADO', prioridad: 'urgente' }) });
    const { seq } = (await r.json()) as { seq: number };
    assert.ok(seq >= 1);
    await sondear(async () => (await get(`https://127.0.0.1:${T.puerto}/api/tierra/bandeja?tipo=aviso`, true)).json
      .some((b: any) => b.tipo === 'aviso' && b.datos.texto === 'prueba de proceso SIMULADO'), 10_000, 'aviso en la bandeja de Tierra');
    await sondear(async () => (await getNave(N.puerto, '/api/nave/avisos')).some((a: any) => a.seq === seq && a.ack === 1), 10_000, 'aviso confirmado');
    T.p.kill('SIGTERM');
    await sondear(async () => (await estadoN()) === 'DESCONECTADO', 10_000, 'nave DESCONECTADA');
    await lanzar('tierra', { BD: bdT, PUERTO: String(T.puerto) });
    await sondear(async () => (await estadoN()) === 'CONECTADO', 10_000, 'nave CONECTADA de nuevo');
  } finally {
    for (const h of hijos) h.removeAllListeners('exit');
    for (const h of hijos) h.kill('SIGKILL');
  }
});
