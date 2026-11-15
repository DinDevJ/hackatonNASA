/**
 * Transporte REAL del enlace nave↔Tierra: HTTPS (TLS de Tierra, CA propia en la nave).
 * El protocolo (lotes, sha256, ACK, idempotencia) vive en sincro.ts; aquí solo el transporte,
 * el latido (ping) y el estado CONECTADO/DESCONECTADO. Ver ENLACE-HTTPS.md.
 *
 *   Tierra:  atenderEnlace(db, req, res)      rutas /enlace/ping · lote · descarga · ack
 *   nave:    iniciarEnlaceNave(db, opciones)  ciclo único cada syncMs, sin solapes
 */
import { Agent, request as https } from 'node:https';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { ahora, type BD } from './db.ts';
import { leerEnlace } from './enlace.ts';
import { aplicarAck, backoffMs, ErrorLote, escribirEstado, idEmisor, leerEstado, pendientes, prepararLote, recibirLote,
  type Ack } from './sincro.ts';

const MAX_CUERPO = 5_000_000;
const TOPE_LOTES_POR_CICLO = 50;

// ───────────────────────── Tierra (servidor) ─────────────────────────

/** Solo para tests: fallas inyectadas en Tierra. Se consumen solas (UnaVez). */
export interface FallasTierra {
  pingEstado?: number;
  /** Aplica el lote (commit) y destruye el socket sin responder: el ACK se pierde. */
  cortarTrasAplicarUnaVez?: boolean;
  /** /enlace/ack responde 500 sin aplicar. */
  perderAckUnaVez?: boolean;
}

async function leerCrudo(req: IncomingMessage): Promise<Buffer> {
  const trozos: Buffer[] = [];
  let tam = 0;
  for await (const t of req) {
    tam += (t as Buffer).length;
    if (tam > MAX_CUERPO) throw Object.assign(new Error('cuerpo demasiado grande'), { estado: 413 });
    trozos.push(t as Buffer);
  }
  return Buffer.concat(trozos);
}

const responder = (res: ServerResponse, estado: number, obj: unknown) =>
  res.writeHead(estado, { 'content-type': 'application/json; charset=utf-8' }).end(JSON.stringify(obj));

const cabecera = (req: IncomingMessage, k: string): string => String(req.headers[k] ?? '');

/** Anota que la nave hizo contacto (último contacto visible en Tierra). */
function contacto(db: BD, req: IncomingMessage): void {
  escribirEstado(db, 'tierra:ultimo_contacto', ahora());
  const em = cabecera(req, 'x-eva-emisor');
  if (em) escribirEstado(db, 'tierra:emisor_nave', em.slice(0, 64));
}

export async function atenderEnlace(db: BD, req: IncomingMessage, res: ServerResponse, fallas: FallasTierra = {}): Promise<boolean> {
  const { pathname } = new URL(req.url ?? '/', 'http://x');
  if (!pathname.startsWith('/enlace/')) return false;
  try {
    if (req.method === 'GET' && pathname === '/enlace/ping') {
      if (fallas.pingEstado && fallas.pingEstado !== 200) { responder(res, fallas.pingEstado, { error: 'falla simulada' }); return true; }
      contacto(db, req);
      responder(res, 200, { ok: true, rol: 'tierra', emisor: idEmisor(db, 'tierra'), t_tierra: ahora() });
      return true;
    }
    if (req.method === 'POST' && pathname === '/enlace/lote') {
      const cuerpo = (await leerCrudo(req)).toString('utf8');
      let ack: Ack;
      try { ack = recibirLote(db, 'tierra', cuerpo, cabecera(req, 'x-eva-sha256')); }
      catch (e) {
        if (e instanceof ErrorLote) { responder(res, 422, { error: e.message, motivo: e.motivo }); return true; }
        throw e;
      }
      contacto(db, req);
      if (fallas.cortarTrasAplicarUnaVez) { fallas.cortarTrasAplicarUnaVez = false; req.socket.destroy(); return true; }
      responder(res, 200, ack);
      return true;
    }
    if (req.method === 'POST' && pathname === '/enlace/descarga') {
      let max = 20;
      try { const m = Number(JSON.parse((await leerCrudo(req)).toString('utf8') || '{}').max); if (m >= 1) max = Math.min(m, 200); }
      catch { /* sin cuerpo válido: lote por defecto */ }
      contacto(db, req);
      const l = prepararLote(db, 'tierra', max);
      if (!l) { res.writeHead(204).end(); return true; }
      res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'x-eva-sha256': l.sha256 }).end(l.cuerpo);
      return true;
    }
    if (req.method === 'POST' && pathname === '/enlace/ack') {
      const crudo = (await leerCrudo(req)).toString('utf8');
      if (fallas.perderAckUnaVez) { fallas.perderAckUnaVez = false; responder(res, 500, { error: 'falla simulada' }); return true; }
      let ack: Ack;
      try { ack = JSON.parse(crudo) as Ack; } catch { responder(res, 400, { error: 'ACK ilegible' }); return true; }
      contacto(db, req);
      responder(res, 200, { marcados: aplicarAck(db, 'tierra', ack) });
      return true;
    }
    responder(res, 404, { error: 'ruta de enlace no existe' });
  } catch (e) {
    if (!res.headersSent) responder(res, (e as { estado?: number }).estado ?? 500, { error: (e as Error).message });
    else res.destroy();
  }
  return true;
}

/** Estado de Tierra para GET /api/enlace/estado. */
export function estadoTierra(db: BD) {
  const c = leerEstado(db, 'tierra:ultimo_contacto');
  const recibidos = db.prepare(`SELECT COUNT(*) AS n FROM entrada`).get() as { n: number };
  return {
    rol: 'tierra', emisor: idEmisor(db, 'tierra'), ultimo_contacto_nave: c,
    antiguedad_contacto_s: c ? Math.max(0, Math.round((Date.now() - Date.parse(c)) / 1000)) : null,
    pendientes_salida: pendientes(db, 'tierra'), recibidos: Number(recibidos.n),
  };
}

// ───────────────────────── nave (cliente) ─────────────────────────

export interface OpcionesNave {
  url: string; ca: string | Buffer;
  pingMs?: number; timeoutMs?: number; syncMs?: number; backoffBaseMs?: number; backoffTopeMs?: number; loteMax?: number;
  simularOwlt?: boolean;
  /** Solo tests. */
  fallas?: { corromperUnaVez?: boolean; cortarAMitadUnaVez?: boolean };
}

export interface EstadoEnlace {
  rol: 'nave'; emisor: string; estado: 'CONECTADO' | 'DESCONECTADO'; motivo: string | null; desde: string;
  ultimo_ping_ok: string | null; antiguedad_ping_s: number | null; rtt_ms: number | null; retraso_estimado_s: number | null;
  owlt_modelo_s: number; ventana_abierta: boolean; simular_owlt: boolean; ping_s: number | null; tierra_url: string | null;
  pendientes_salida: number; ultimo_ack: string | null; intentos_fallidos: number; proximo_intento: string | null;
}

/** Lee el estado persistido del enlace HTTPS (sirve a cualquier módulo, también al texto de `/`). */
export function estadoNave(db: BD): EstadoEnlace {
  const g = (k: string) => leerEstado(db, 'nave:' + k);
  const num = (k: string) => { const v = g(k); return v === null || v === '' ? null : Number(v); };
  const ping = g('ultimo_ping_ok');
  const rtt = num('rtt_ms');
  const e = leerEnlace(db);
  return {
    rol: 'nave', emisor: idEmisor(db, 'nave'),
    estado: g('estado') === 'CONECTADO' ? 'CONECTADO' : 'DESCONECTADO', motivo: g('motivo') || null,
    desde: g('desde') ?? ahora(),
    ultimo_ping_ok: ping, antiguedad_ping_s: ping ? Math.max(0, Math.round((Date.now() - Date.parse(ping)) / 1000)) : null,
    rtt_ms: rtt, retraso_estimado_s: rtt === null ? null : Number((rtt / 2000).toFixed(3)),
    owlt_modelo_s: e.owlt_s, ventana_abierta: e.abierto, simular_owlt: g('simular_owlt') === '1',
    ping_s: num('ping_s'), tierra_url: g('tierra_url'),
    pendientes_salida: pendientes(db, 'nave'), ultimo_ack: leerEstado(db, 'ultimo_ack:nave'),
    intentos_fallidos: num('intentos') ?? 0, proximo_intento: g('proximo_intento') || null,
  };
}

class ErrorTransporte extends Error {}
class Parado extends Error {}

interface Respuesta { estado: number; cuerpo: string; sha: string }

export function iniciarEnlaceNave(db: BD, op: OpcionesNave): { ciclo(): Promise<void>; estado(): EstadoEnlace; parar(): Promise<void> } {
  const pingMs = op.pingMs ?? 60_000;
  const timeoutMs = op.timeoutMs ?? 5000;
  const syncMs = op.syncMs ?? 1000;
  const base = op.backoffBaseMs ?? 1000;
  const tope = op.backoffTopeMs ?? pingMs;
  const loteMax = op.loteMax ?? 20;
  const simular = op.simularOwlt ?? false;
  const fallas = op.fallas ?? {};
  const url = new URL(op.url);
  const emisor = idEmisor(db, 'nave');
  // CA propia; sin desactivar la verificación del certificado en ningún caso.
  const agente = new Agent({ ca: op.ca, keepAlive: true });

  let parado = false;
  let ocupado: Promise<void> | null = null;
  const despertadores = new Set<() => void>();
  const peticiones = new Set<{ destroy(e?: Error): void }>();

  const set = (k: string, v: string | number | null) => escribirEstado(db, 'nave:' + k, v === null ? '' : String(v));
  const g = (k: string) => leerEstado(db, 'nave:' + k);
  const cambiar = (estado: 'CONECTADO' | 'DESCONECTADO', motivo: string | null) => {
    if (g('estado') !== estado) set('desde', ahora());
    set('estado', estado); set('motivo', motivo);
  };
  set('ping_s', pingMs / 1000); set('tierra_url', op.url); set('simular_owlt', simular ? 1 : 0);
  set('ultimo_ping_ok', null); set('rtt_ms', null); set('intentos', 0); set('proximo_intento', null);
  set('estado', ''); cambiar('DESCONECTADO', 'sin contacto aún');

  const dormir = (ms: number) => new Promise<void>((ok) => {
    const f = () => { clearTimeout(t); despertadores.delete(f); ok(); };
    const t = setTimeout(f, ms);
    despertadores.add(f);
  });
  const vivo = () => { if (parado) throw new Parado(); };

  /** Una petición HTTPS con timeout total; con simularOwlt suma 1 OWLT antes y 1 después. */
  async function pedir(metodo: string, camino: string, cuerpo?: string, cab: Record<string, string> = {}, cortar = false): Promise<Respuesta> {
    const owlt = simular ? leerEnlace(db).owlt_s : 0;
    const limite = timeoutMs + 2 * owlt * 1000;
    let vencido = false;
    let reqRef: { destroy(e?: Error): void } | null = null;
    const temporizador = setTimeout(() => { vencido = true; reqRef?.destroy(); }, limite);
    try {
      if (owlt) { await dormir(owlt * 1000); vivo(); }
      const r = await new Promise<Respuesta>((ok, mal) => {
        const buf = cuerpo === undefined ? undefined : Buffer.from(cuerpo, 'utf8');
        const rq = https({ agent: agente, hostname: url.hostname, port: url.port || 443, path: camino, method: metodo,
          headers: { 'x-eva-emisor': emisor, ...(buf ? { 'content-type': 'application/json', 'content-length': buf.length } : {}), ...cab } },
        (rs) => {
          const trozos: Buffer[] = [];
          rs.on('data', (t: Buffer) => trozos.push(t));
          rs.on('end', () => ok({ estado: rs.statusCode ?? 0, cuerpo: Buffer.concat(trozos).toString('utf8'), sha: String(rs.headers['x-eva-sha256'] ?? '') }));
          rs.on('error', mal);
          rs.on('aborted', () => mal(new Error('respuesta cortada')));
        });
        reqRef = rq; peticiones.add(rq);
        rq.on('error', mal);
        rq.on('close', () => peticiones.delete(rq));
        if (buf && cortar) {
          // Falla simulada: se escribe la mitad del cuerpo y se corta la conexión.
          rq.write(buf.subarray(0, Math.floor(buf.length / 2)));
          setTimeout(() => rq.destroy(Object.assign(new Error('corte simulado'), { code: 'CORTE_SIMULADO' })), 15);
        } else rq.end(buf);
      });
      if (owlt) { await dormir(owlt * 1000); vivo(); }
      return r;
    } catch (e) {
      if (vencido) throw new ErrorTransporte('timeout');
      throw e;
    } finally { clearTimeout(temporizador); }
  }

  const motivoDe = (e: unknown): string => e instanceof ErrorTransporte ? e.message
    : String((e as NodeJS.ErrnoException).code ?? (e as Error).message ?? e).slice(0, 120);

  function fallo(motivo: string): void {
    const n = (Number(g('intentos')) || 0) + 1;
    cambiar('DESCONECTADO', motivo);
    set('intentos', n);
    set('proximo_intento', new Date(Date.now() + backoffMs(n, base, tope)).toISOString());
  }

  async function ping(): Promise<void> {
    const t0 = performance.now();
    const r = await pedir('GET', '/enlace/ping');
    if (r.estado !== 200) throw new ErrorTransporte(`HTTP ${r.estado}`);
    set('rtt_ms', Math.round(performance.now() - t0));
    set('ultimo_ping_ok', ahora()); set('intentos', 0); set('proximo_intento', null);
    cambiar('CONECTADO', null);
  }

  async function intercambiar(): Promise<void> {
    for (let i = 0; i < TOPE_LOTES_POR_CICLO; i++) {
      let hizo = false;
      const l = prepararLote(db, 'nave', loteMax);
      if (l) {
        let cuerpo = l.cuerpo;
        const cortar = !!fallas.cortarAMitadUnaVez;
        if (cortar) fallas.cortarAMitadUnaVez = false;
        if (fallas.corromperUnaVez) { fallas.corromperUnaVez = false; cuerpo = cuerpo.replace('"v":1', '"v":2'); }
        const r = await pedir('POST', '/enlace/lote', cuerpo, { 'x-eva-sha256': l.sha256 }, cortar);
        if (r.estado !== 200) throw new ErrorTransporte(`HTTP ${r.estado}`);
        vivo();
        aplicarAck(db, 'nave', JSON.parse(r.cuerpo) as Ack);
        hizo = true;
      }
      const d = await pedir('POST', '/enlace/descarga', JSON.stringify({ max: loteMax }));
      if (d.estado !== 200 && d.estado !== 204) throw new ErrorTransporte(`HTTP ${d.estado}`);
      vivo();
      if (d.estado === 200) {
        let ack: Ack;
        try { ack = recibirLote(db, 'nave', d.cuerpo, d.sha); }
        catch (e) { if (e instanceof ErrorLote) return; throw e; }   // corrupto: no se confirma, Tierra lo reenvía
        const a = await pedir('POST', '/enlace/ack', JSON.stringify(ack));
        if (a.estado !== 200) throw new ErrorTransporte(`HTTP ${a.estado}`);
        hizo = true;
      }
      if (!hizo) return;
    }
  }

  async function cicloInterno(): Promise<void> {
    if (!leerEnlace(db).abierto) {
      cambiar('DESCONECTADO', 'ventana cerrada (modelo Marte)');
      set('proximo_intento', null);
      return;
    }
    const conectado = g('estado') === 'CONECTADO';
    const ultimo = Date.parse(g('ultimo_ping_ok') || '') || 0;
    const prox = Date.parse(g('proximo_intento') || '') || 0;
    if (conectado ? Date.now() - ultimo >= pingMs : Date.now() >= prox) await ping();
    if (g('estado') === 'CONECTADO') await intercambiar();
  }

  function ciclo(): Promise<void> {
    if (parado || ocupado) return ocupado ?? Promise.resolve();
    ocupado = (async () => {
      try { await cicloInterno(); }
      catch (e) {
        if (parado || e instanceof Parado) return;
        try { fallo(motivoDe(e)); } catch { /* BD cerrada */ }
      } finally { ocupado = null; }
    })();
    return ocupado;
  }

  const reloj = setInterval(() => { void ciclo(); }, syncMs);
  void ciclo();

  return {
    ciclo,
    estado: () => estadoNave(db),
    async parar() {
      parado = true;
      clearInterval(reloj);
      for (const f of [...despertadores]) f();
      for (const r of [...peticiones]) r.destroy();
      agente.destroy();
      await ocupado?.catch(() => {});
    },
  };
}
