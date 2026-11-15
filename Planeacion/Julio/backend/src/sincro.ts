/**
 * Sincronización nave↔Tierra sin pérdidas ni duplicados (núcleo a nivel de BD, sin red).
 *
 * Cada rol tiene su BD. La cola de salida es `bajada` (nave) o `subida` (Tierra); cada
 * mensaje lleva (emisor, seq) y queda pendiente (ack = 0) hasta que el receptor lo confirma.
 * El receptor aplica cada (emisor, seq) UNA sola vez (tabla `entrada`) y responde con un ACK
 * acumulado + selectivos. Si se pierde la petición o el ACK, se reenvía lo que siga con ack = 0.
 * Garantía: al-menos-una-vez en el transporte + idempotencia en el receptor = exactamente-una-vez.
 */
import { createHash, randomBytes } from 'node:crypto';
import { ahora, json, type BD } from './db.ts';
import { bus } from './ingesta.ts';
import { encolarBajada, enSavepoint } from './enlace.ts';

export type Lado = 'nave' | 'tierra';
export interface Mensaje { seq: number; tipo: string; prioridad: number; t_evento: string; datos: unknown }
export interface Lote { v: 1; emisor: string; lado: Lado; t_envio: string; mensajes: Mensaje[] }
export interface Ack { emisor: string; ack_acumulado: number; selectivos: number[]; aplicados: number; duplicados: number; t_recepcion: string }

export class ErrorLote extends Error {
  motivo: 'checksum' | 'formato';
  constructor(motivo: 'checksum' | 'formato', msg?: string) { super(msg ?? `lote inválido: ${motivo}`); this.motivo = motivo; }
}

export const sha256 = (texto: string): string => createHash('sha256').update(texto).digest('hex');

export function leerEstado(db: BD, clave: string): string | null {
  const r = db.prepare(`SELECT valor FROM enlace_estado WHERE clave = ?`).get(clave) as { valor: string | null } | undefined;
  return r?.valor ?? null;
}
export function escribirEstado(db: BD, clave: string, valor: string): void {
  db.prepare(`INSERT INTO enlace_estado (clave, valor) VALUES (?, ?) ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor`).run(clave, valor);
}

/** Identidad del emisor de esta BD: se crea una vez. BD nueva = emisor nuevo (no choca con seq viejos). */
export function idEmisor(db: BD, lado: Lado): string {
  const k = 'yo:' + lado;
  const v = leerEstado(db, k);
  if (v) return v;
  const id = `${lado}-${randomBytes(4).toString('hex')}`;
  db.prepare(`INSERT INTO enlace_estado (clave, valor) VALUES (?, ?) ON CONFLICT(clave) DO NOTHING`).run(k, id);
  return leerEstado(db, k)!;
}

/** seq monótono por emisor; vive aparte para que borrar bajada/subida no lo reinicie. */
export function siguienteSeq(db: BD, emisor: string): number {
  const r = db.prepare(
    `INSERT INTO enlace_contador (emisor, ultimo) VALUES (?, 1) ON CONFLICT(emisor) DO UPDATE SET ultimo = ultimo + 1 RETURNING ultimo`,
  ).get(emisor) as { ultimo: number };
  return Number(r.ultimo);
}

const cola = (lado: Lado) => (lado === 'nave' ? 'bajada' : 'subida');

export function pendientes(db: BD, lado: Lado): number {
  const r = db.prepare(`SELECT COUNT(*) AS n FROM ${cola(lado)} WHERE emisor = ? AND ack = 0`).get(idEmisor(db, lado)) as { n: number };
  return Number(r.n);
}

const prioSubida = (p: string) => (p === 'urgente' ? 0 : p === 'alta' ? 1 : 2);

/** Arma el siguiente lote (rojo primero, luego seq). Lo no confirmado se vuelve a incluir solo. */
export function prepararLote(db: BD, lado: Lado, max = 20, t_envio = ahora()): { lote: Lote; cuerpo: string; sha256: string } | null {
  const emisor = idEmisor(db, lado);
  const tabla = cola(lado);
  const orden = lado === 'nave' ? 'prioridad, seq' : `CASE prioridad WHEN 'urgente' THEN 0 WHEN 'alta' THEN 1 ELSE 2 END, seq`;
  const filas = db.prepare(`SELECT * FROM ${tabla} WHERE emisor = ? AND ack = 0 ORDER BY ${orden} LIMIT ?`)
    .all(emisor, max) as Array<Record<string, unknown>>;
  if (!filas.length) return null;
  const mensajes: Mensaje[] = filas.map((f) => lado === 'nave'
    ? { seq: Number(f.seq), tipo: String(f.tipo), prioridad: Number(f.prioridad), t_evento: String(f.t_scet), datos: JSON.parse(String(f.datos)) }
    : { seq: Number(f.seq), tipo: String(f.tipo), prioridad: prioSubida(String(f.prioridad)), t_evento: String(f.t_redactado),
        datos: { de: f.de, para: f.para, texto: f.texto, prioridad: f.prioridad, datos: f.datos ? JSON.parse(String(f.datos)) : null } });
  const marca = db.prepare(`UPDATE ${tabla} SET intentos = intentos + 1, t_envio = ? WHERE id = ?`);
  for (const f of filas) marca.run(t_envio, f.id as number);
  const lote: Lote = { v: 1, emisor, lado, t_envio, mensajes };
  const cuerpo = JSON.stringify(lote);
  return { lote, cuerpo, sha256: sha256(cuerpo) };
}

function validar(yo: Lado, x: unknown): Lote {
  const f = (m: string): never => { throw new ErrorLote('formato', m); };
  if (!x || typeof x !== 'object') return f('no es objeto');
  const l = x as Record<string, unknown>;
  if (l.v !== 1) f('versión');
  if (typeof l.emisor !== 'string' || !l.emisor) f('emisor');
  if (l.lado !== (yo === 'nave' ? 'tierra' : 'nave')) f('lado');
  if (typeof l.t_envio !== 'string') f('t_envio');
  if (!Array.isArray(l.mensajes)) return f('mensajes');
  for (const m of l.mensajes as Array<Record<string, unknown>>) {
    if (!m || typeof m !== 'object') f('mensaje');
    if (!Number.isInteger(m.seq) || (m.seq as number) <= 0) f('seq');
    if (typeof m.tipo !== 'string' || !m.tipo) f('tipo');
    if (!Number.isInteger(m.prioridad)) f('prioridad');
    if (typeof m.t_evento !== 'string') f('t_evento');
    if (!('datos' in m)) f('datos');
  }
  return l as unknown as Lote;
}

/** Recibe un lote: verifica, aplica cada mensaje nuevo una vez (transacción) y devuelve el ACK. */
export function recibirLote(db: BD, yo: Lado, cuerpo: string, sha: string, t_recepcion = ahora()): Ack {
  if (sha256(cuerpo) !== sha) throw new ErrorLote('checksum');
  let lote: Lote;
  try { lote = validar(yo, JSON.parse(cuerpo)); }
  catch (e) { throw e instanceof ErrorLote ? e : new ErrorLote('formato', 'JSON ilegible'); }

  const canal = yo === 'tierra' ? 'bajada' : 'subida';
  const aplicados: Array<Record<string, unknown>> = [];
  let nuevos = 0, duplicados = 0, ackAcum = 0;
  db.exec('BEGIN IMMEDIATE');
  try {
    const ins = db.prepare(
      `INSERT INTO entrada (emisor, seq, canal, tipo, prioridad, datos, t_evento, t_envio, t_recepcion)
       VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(emisor, seq) DO NOTHING`);
    for (const m of lote.mensajes) {
      const r = ins.run(lote.emisor, m.seq, canal, m.tipo, m.prioridad, json(m.datos), m.t_evento, lote.t_envio, t_recepcion);
      if (!Number(r.changes)) { duplicados++; continue; }
      nuevos++;
      if (yo === 'tierra') {
        const b = db.prepare(
          `INSERT INTO bajada (tipo, datos, prioridad, t_scet, t_envio, t_ert, notificado, emisor, seq, ack)
           VALUES (?,?,?,?,?,?,1,?,?,1) RETURNING *`).get(m.tipo, json(m.datos), m.prioridad, m.t_evento, lote.t_envio, t_recepcion, lote.emisor, m.seq) as Record<string, unknown>;
        aplicados.push({ ...b, datos: m.datos });
      } else {
        const d = (m.datos ?? {}) as Record<string, unknown>;
        const a = db.prepare(
          `INSERT INTO subida (de, para, texto, prioridad, tipo, datos, t_redactado, t_envio, t_llegada, entregado, emisor, seq, ack)
           VALUES (?,?,?,?,?,?,?,?,?,1,?,?,1) RETURNING *`).get(
          String(d.de ?? ''), String(d.para ?? 'todos'), String(d.texto ?? ''), String(d.prioridad ?? 'normal'), m.tipo,
          d.datos ? json(d.datos) : null, m.t_evento, lote.t_envio, t_recepcion, lote.emisor, m.seq) as Record<string, unknown>;
        // La nave confirma la recepción al humano de Tierra, como en el enlace simulado.
        encolarBajada(db, 'acuse', { id: a.id, tipo: a.tipo, para: a.para, t_llegada: a.t_llegada }, t_recepcion, 0);
        aplicados.push({ ...a, datos: a.datos ? JSON.parse(String(a.datos)) : null });
      }
    }
    // ACK acumulado: mayor n tal que 1..n están todos en la bandeja.
    const k = 'ack:' + lote.emisor;
    ackAcum = Number(leerEstado(db, k) ?? 0);
    const existe = db.prepare(`SELECT 1 FROM entrada WHERE emisor = ? AND seq = ?`);
    while (existe.get(lote.emisor, ackAcum + 1)) ackAcum++;
    escribirEstado(db, k, String(ackAcum));
    db.exec('COMMIT');
  } catch (e) {
    try { db.exec('ROLLBACK'); } catch { /* ya deshecha */ }
    throw e;
  }
  for (const a of aplicados) bus.emit(yo === 'tierra' ? 'tierra' : 'aviso', a);
  const selectivos = [...new Set(lote.mensajes.map((m) => m.seq).filter((s) => s > ackAcum))].sort((a, b) => a - b);
  return { emisor: lote.emisor, ack_acumulado: ackAcum, selectivos, aplicados: nuevos, duplicados, t_recepcion };
}

/** Procesa el ACK del receptor: marca confirmado lo cubierto. Devuelve filas marcadas. */
export function aplicarAck(db: BD, lado: Lado, ack: Ack, t = ahora()): number {
  if (!ack || ack.emisor !== idEmisor(db, lado)) return 0;
  const sel = (ack.selectivos ?? []).filter((n) => Number.isInteger(n));
  const r = db.prepare(
    `UPDATE ${cola(lado)} SET ack = 1, t_ack = ? WHERE emisor = ? AND ack = 0 AND (seq <= ? OR seq IN (SELECT value FROM json_each(?)))`,
  ).run(t, ack.emisor, Number(ack.ack_acumulado) || 0, json(sel));
  escribirEstado(db, 'ultimo_ack:' + lado, t);
  return Number(r.changes);
}

/** Espera exponencial con jitter "igual": d = min(tope, base·2^intento); devuelve d/2 + rnd·d/2. */
export function backoffMs(intento: number, baseMs: number, topeMs: number, rnd: () => number = Math.random): number {
  const d = Math.min(topeMs, baseMs * 2 ** Math.max(0, intento));
  return d / 2 + rnd() * d / 2;
}
