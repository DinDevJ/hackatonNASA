/**
 * Enlace con Tierra, en los dos sentidos, con el retraso de la luz.
 *
 *   nave ──bajada──►  Tierra      alertas al instante · resumen cada 30 s
 *   nave ◄──subida──  Tierra      avisos del cirujano de vuelo
 *
 * Almacenar y reenviar (DTN): lo que se genera sin ventana espera en cola y sale
 * al abrirse. Todo llega OWLT segundos después de salir. Tierra ve siempre CUÁNDO
 * OCURRIÓ (SCET) y con qué antigüedad llegó (ERT − SCET).
 */
import { ahora, json, type BD } from './db.ts';
import { bus } from './ingesta.ts';

export interface Enlace { owlt_s: number; abierto: boolean }

/** Por defecto 20 s para que la demo se vea; en Marte serían de 4 a 24 minutos. */
const OWLT_DEMO = 20;
const RESUMEN_CADA_MS = 30_000;

export function leerEnlace(db: BD): Enlace {
  const r = db.prepare(`SELECT owlt_s, abierto FROM enlace WHERE id = 1`).get() as
    | { owlt_s: number; abierto: number } | undefined;
  return r ? { owlt_s: r.owlt_s, abierto: !!r.abierto } : { owlt_s: OWLT_DEMO, abierto: true };
}

export function escribirEnlace(db: BD, e: Partial<Enlace>): Enlace {
  const a = { ...leerEnlace(db), ...e };
  if (!(a.owlt_s >= 0 && a.owlt_s <= 3600)) throw new Error('owlt_s entre 0 y 3600');
  db.prepare(`INSERT OR REPLACE INTO enlace VALUES (1, ?, ?)`).run(a.owlt_s, a.abierto ? 1 : 0);
  bus.emit('enlace', a);
  return a;
}

const mas = (iso: string, s: number) => new Date(Date.parse(iso) + s * 1000).toISOString();

export function encolarBajada(db: BD, tipo: string, datos: unknown, tScet: string, prioridad: number): void {
  db.prepare(`INSERT INTO bajada (tipo, datos, prioridad, t_scet) VALUES (?,?,?,?)`)
    .run(tipo, json(datos), prioridad, tScet);
}

export function redactarAviso(db: BD, a: { de?: string; para: string; texto: string; prioridad?: string }) {
  if (!a.texto?.trim()) throw new Error('el aviso necesita texto');
  const r = db.prepare(`INSERT INTO subida (de, para, texto, prioridad, t_redactado) VALUES (?,?,?,?,?)`)
    .run(a.de ?? 'Cirujano de vuelo', a.para || 'todos', a.texto.trim().slice(0, 500), a.prioridad ?? 'normal', ahora());
  return Number(r.lastInsertRowid);
}

function resumen(db: BD) {
  return db.prepare(
    `SELECT m.tripulante, m.variable, m.valor, m.unidad FROM muestras m
     JOIN (SELECT tripulante, variable, MAX(t_scet) AS t FROM muestras GROUP BY tripulante, variable) u
       ON m.tripulante = u.tripulante AND m.variable = u.variable AND m.t_scet = u.t`,
  ).all();
}

/** Un paso del reloj del enlace: sale lo pendiente si hay ventana, llega lo que toca. */
export function pulso(db: BD, t: string = ahora()): void {
  const e = leerEnlace(db);
  if (e.abierto) {
    db.prepare(`UPDATE bajada SET t_envio = ?, t_ert = ? WHERE t_envio IS NULL`).run(t, mas(t, e.owlt_s));
    db.prepare(`UPDATE subida SET t_envio = ?, t_llegada = ? WHERE t_envio IS NULL`).run(t, mas(t, e.owlt_s));
  }
  const llegadas = db.prepare(`SELECT * FROM bajada WHERE t_ert IS NOT NULL AND t_ert <= ? AND notificado = 0 ORDER BY prioridad, t_scet`)
    .all(t) as Array<Record<string, unknown>>;
  for (const b of llegadas) {
    db.prepare(`UPDATE bajada SET notificado = 1 WHERE id = ?`).run(b.id as number);
    bus.emit('tierra', { ...b, datos: JSON.parse(String(b.datos)) });
  }
  const avisos = db.prepare(`SELECT * FROM subida WHERE t_llegada IS NOT NULL AND t_llegada <= ? AND entregado = 0`)
    .all(t) as Array<Record<string, unknown>>;
  for (const a of avisos) {
    db.prepare(`UPDATE subida SET entregado = 1 WHERE id = ?`).run(a.id as number);
    bus.emit('aviso', a);
  }
}

/** Conecta el enlace al resto del sistema. Devuelve la función para pararlo. */
export function iniciarEnlace(db: BD): () => void {
  const alAlertar = (a: Record<string, unknown>) =>
    encolarBajada(db, 'alerta', a, String(a.t_scet), a.estado === 'rojo' ? 0 : a.estado === 'ambar' ? 1 : 2);
  bus.on('alerta', alAlertar);
  const reloj = setInterval(() => pulso(db), 1000);
  const res = setInterval(() => {
    const r = resumen(db);
    if (r.length) encolarBajada(db, 'resumen', r, ahora(), 2);
  }, RESUMEN_CADA_MS);
  return () => { bus.off('alerta', alAlertar); clearInterval(reloj); clearInterval(res); };
}
