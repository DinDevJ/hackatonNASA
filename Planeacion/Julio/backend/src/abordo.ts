/**
 * Lo que pasa a bordo entre personas, sin pasar por los sensores:
 *
 *   CMO ──aviso a bordo──► teléfono del tripulante     al instante (misma nave, sin retraso)
 *   CMO ──consulta──────► Tierra                       por el enlace: bajada, con OWLT
 *   teléfono ──emergencia─► central y Tierra            SOS manual o automático; a Tierra con prioridad 0
 *
 * Lo usan las pantallas de LUNNA (Planeacion/Leo/maqueta-eva): central.html manda avisos y consultas,
 * index.html (teléfono) registra emergencias y base.html las recibe en su bandeja.
 */
import { ahora, json, type BD } from './db.ts';
import { bus } from './ingesta.ts';
import { encolarBajada } from './enlace.ts';

export type Nivel = 'ambar' | 'rojo';
const NIVELES = new Set(['ambar', 'rojo']);
const prioridadDe = (n: Nivel | null | undefined) => (n === 'rojo' ? 0 : n === 'ambar' ? 1 : 2);

function comprobarTripulante(db: BD, id: string, campo: string) {
  if (id !== 'todos' && !db.prepare(`SELECT 1 FROM tripulantes WHERE id = ?`).get(id)) throw new Error(`${campo}: el tripulante "${id}" no existe`);
}
function comprobarNivel(n: unknown): Nivel | null {
  if (n == null || n === '') return null;
  if (!NIVELES.has(String(n))) throw new Error('nivel debe ser ambar o rojo (o no venir)');
  return n as Nivel;
}
const texto = (t: unknown) => {
  const s = String(t ?? '').trim();
  if (!s) throw new Error('falta el texto');
  return s.slice(0, 500);
};

// ── Aviso de la CMO a un tripulante (o a todos), a bordo ──
export interface AvisoAbordo { de?: string; para?: string; texto: string; nivel?: Nivel | null }

export function avisoAbordo(db: BD, a: AvisoAbordo) {
  const para = a.para || 'todos';
  comprobarTripulante(db, para, 'para');
  const nivel = comprobarNivel(a.nivel);
  const t = ahora(), de = (a.de || 'CMO').slice(0, 80), cuerpo = texto(a.texto);
  const id = Number(db.prepare(`INSERT INTO abordo (de, para, texto, nivel, t) VALUES (?,?,?,?,?)`).run(de, para, cuerpo, nivel, t).lastInsertRowid);
  // Mismo formato que los avisos de Tierra, así el teléfono los muestra igual; origen dice de dónde vienen.
  const evento = { id: `cmo-${id}`, de, para, texto: cuerpo, tipo: nivel ? 'alerta' : 'aviso', datos: nivel ? { nivel } : null, origen: 'abordo', t_redactado: t, t_llegada: t };
  bus.emit('aviso', evento);
  return evento;
}

// ── Consulta de la central a Tierra (baja por el enlace) ──
export interface Consulta { de?: string; sobre?: string | null; texto: string; nivel?: Nivel | null }

export function consultaATierra(db: BD, c: Consulta) {
  const sobre = c.sobre || null;
  if (sobre) comprobarTripulante(db, sobre, 'sobre');
  const nivel = comprobarNivel(c.nivel);
  const t = ahora();
  const datos = { de: (c.de || 'CMO').slice(0, 80), sobre, texto: texto(c.texto), nivel, t_redactado: t };
  const id = encolarBajada(db, 'consulta', datos, t, prioridadDe(nivel));
  return { id, ...datos };
}

// ── Emergencias del teléfono ──
export interface Emergencia {
  tripulante: string; modo?: 'SOS manual' | 'automático' | 'demo'; causa?: string;
  disparadores?: Array<{ variable: string; valor: string }>; t_scet?: string;
}

export function registrarEmergencia(db: BD, e: Emergencia) {
  if (!e.tripulante) throw new Error('falta el tripulante');
  comprobarTripulante(db, e.tripulante, 'tripulante');
  const modo = e.modo ?? 'SOS manual';
  if (!['SOS manual', 'automático', 'demo'].includes(modo)) throw new Error('modo: SOS manual, automático o demo');
  const t = ahora(), tScet = e.t_scet || t;
  const fila = {
    tripulante: e.tripulante, modo, causa: String(e.causa ?? '').slice(0, 300) || null,
    disparadores: Array.isArray(e.disparadores) ? e.disparadores.slice(0, 12) : [], t_scet: tScet, t_registro: t,
  };
  const id = Number(db.prepare(`INSERT INTO emergencias (tripulante, modo, causa, disparadores, t_scet, t_registro) VALUES (?,?,?,?,?,?)`)
    .run(fila.tripulante, fila.modo, fila.causa, json(fila.disparadores), fila.t_scet, fila.t_registro).lastInsertRowid);
  const ev = { id, ...fila, resultado: null };
  bus.emit('emergencia', ev);
  encolarBajada(db, 'emergencia', ev, tScet, 0);   // a Tierra antes que nada
  return ev;
}

export function cerrarEmergencia(db: BD, id: number, resultado: string) {
  const r = db.prepare(`UPDATE emergencias SET resultado = ?, t_cierre = ? WHERE id = ?`).run(texto(resultado), ahora(), id);
  if (!r.changes) throw new Error(`la emergencia ${id} no existe`);
  const ev = leerEmergencias(db).find((x) => x.id === id)!;
  bus.emit('emergencia', ev);
  encolarBajada(db, 'emergencia', ev, String(ev.t_cierre), 1);
  return ev;
}

export function leerEmergencias(db: BD, tripulante?: string) {
  const filas = (tripulante
    ? db.prepare(`SELECT * FROM emergencias WHERE tripulante = ? ORDER BY id DESC LIMIT 100`).all(tripulante)
    : db.prepare(`SELECT * FROM emergencias ORDER BY id DESC LIMIT 100`).all()) as Array<Record<string, unknown>>;
  return filas.map((f) => ({ ...f, id: Number(f.id), disparadores: JSON.parse(String(f.disparadores || '[]')) })) as Array<Record<string, unknown> & { id: number }>;
}
