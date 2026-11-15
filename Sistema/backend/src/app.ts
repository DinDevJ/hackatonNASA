/**
 * Estado de UN tripulante para la app móvil: `GET /api/app/:tripulante`.
 *
 * Todo lo que la app necesita en una sola llamada: el último valor de cada variable,
 * lo que LUNNA espera de esa persona, el umbral clínico absoluto, el estado combinado
 * (el mismo criterio que genera las alertas), la serie de los últimos días, sus
 * alertas y los avisos de Tierra que ya llegaron a bordo.
 */
import { ahora, type BD } from './db.ts';
import {
  calibrandoEn, entornoEn, estadoRecordado, evaluarVariable, mediana, motivoDe, MUESTRA_VALIDA, type Motivo,
 ventanaPersonal } from './ingesta.ts';
import { CLAVES, peor, referencias, type Estado, type Umbral } from './referencias.ts';
import type { Entorno } from './lunna.ts';

const DIA_MS = 86_400_000;
/** Días de misión que abarca la serie de cada variable. */
export const DIAS_SERIE = 14;

const r2 = (x: number) => Number(x.toFixed(2));
const r3 = (x: number) => Number(x.toFixed(3));
const deTexto = (s: unknown) => { try { return s == null ? null : JSON.parse(String(s)); } catch { return null; } };

export interface VariableApp {
  id: string; clave: string | null; nombre: string; unidad: string | null;
  valor: number | null; t_scet: string | null; dispositivo: string | null; procedencia: string | null;
  mediana_24h: number | null; esperado: number | null; banda: [number, number] | null; z: number | null;
  estado: Estado | 'sin_dato'; motivo: Motivo | null;
  /** Extra: cada criterio por separado; `null` = no evaluado. */
  estado_personal: Estado | null; estado_umbral: Estado | null;
  /** Extra: mediana de las últimas muestras que se comparó con el umbral. */
  valor_umbral: number | null;
  calibrando: boolean; extrapolado: boolean;
  pesos: { poblacion: number; historial: number; vuelo: number } | null;
  basal: number | null;
  umbral: Umbral | null;
  como_se_mide: string | null; equipo_a_bordo: string | null;
  padecimientos: unknown[];
  serie: Array<{ dia: number; mediana: number; n: number }>;
}

export interface EstadoApp {
  tripulante: { id: string; nombre: string; rol: string | null };
  entorno: Entorno;
  dia_mision: number | null;
  /** Ventana de la mediana del criterio personal, en minutos (1440 = 24 h, en misión). */
  ventana_personal_min: number;
  t: string;
  variables: VariableApp[];
  alertas: Array<Record<string, unknown>>;
  avisos: Array<Record<string, unknown>>;
}

/**
 * Mediana por DÍA DE MISIÓN (no por fecha de calendario) de los 14 días que terminan
 * en el de la última muestra. Sólo aparecen los días con datos. Lee con el índice
 * (tripulante, variable, t_scet), así que nunca recorre más de esos 14 días.
 */
function serieDiaria(db: BD, tripulante: string, variable: string, origen: number, tUltima: string) {
  const diaUltimo = Math.floor((Date.parse(tUltima) - origen) / DIA_MS);
  const desde = new Date(origen + (diaUltimo - DIAS_SERIE + 1) * DIA_MS).toISOString();
  const filas = db.prepare(
    `SELECT valor, t_scet FROM muestras WHERE tripulante = ? AND variable = ? AND t_scet >= ? AND t_scet <= ? AND ${MUESTRA_VALIDA}`,
  ).all(tripulante, variable, desde, tUltima) as Array<{ valor: number; t_scet: string }>;
  const porDia = new Map<number, number[]>();
  for (const f of filas) {
    const d = Math.floor((Date.parse(f.t_scet) - origen) / DIA_MS);
    const vs = porDia.get(d);
    if (vs) vs.push(f.valor); else porDia.set(d, [f.valor]);
  }
  return [...porDia.entries()].sort((a, b) => a[0] - b[0])
    .map(([dia, vs]) => ({ dia, mediana: r2(mediana(vs)), n: vs.length }));
}

/** `null` si el tripulante no existe. `t` es "ahora": sólo se pasa en las pruebas. */
export function estadoApp(db: BD, idTripulante: string, t: string = ahora()): EstadoApp | null {
  const trip = db.prepare(`SELECT id, nombre, rol FROM tripulantes WHERE id = ?`).get(idTripulante) as
    | { id: string; nombre: string; rol: string | null } | undefined;
  if (!trip) return null;

  // Día de misión: desde que empezó la fase más antigua que no es 'tierra'.
  const inicio = (db.prepare(`SELECT MIN(desde) AS d FROM fases WHERE entorno <> 'tierra'`).get() as { d: string | null }).d;
  const dia_mision = inicio && inicio <= t ? Math.floor((Date.parse(t) - Date.parse(inicio)) / DIA_MS) : null;
  // Sin misión todavía, los días de la serie se cuentan desde la primera fase (o desde 1970).
  const primera = (db.prepare(`SELECT MIN(desde) AS d FROM fases`).get() as { d: string | null }).d;
  const origen = Date.parse(inicio ?? primera ?? '1970-01-01T00:00:00.000Z');

  const registradas = new Map((db.prepare(`SELECT id, nombre, unidad FROM variables`).all() as
    Array<{ id: string; nombre: string; unidad: string }>).map((v) => [v.id, v]));
  const basales = new Map((db.prepare(`SELECT variable, valor FROM basales WHERE tripulante = ?`).all(trip.id) as
    Array<{ variable: string; valor: number }>).map((b) => [b.variable, b.valor]));
  const refs = referencias(db);
  const ultima = db.prepare(
    `SELECT m.valor, m.t_scet, m.procedencia, m.unidad, d.clave AS dispositivo
     FROM muestras m LEFT JOIN dispositivos d ON d.id = m.dispositivo
     WHERE m.tripulante = ? AND m.variable = ? AND ${MUESTRA_VALIDA}
     ORDER BY m.t_scet DESC, m.id DESC LIMIT 1`,
  );

  const variables: VariableApp[] = [];
  for (const id of [...new Set([...registradas.keys(), ...basales.keys()])].sort()) {
    // "Última muestra" = la última VÁLIDA (con valor y con contacto): es la que se evalúa.
    const u = ultima.get(trip.id, id) as
      | { valor: number; t_scet: string; procedencia: string; unidad: string | null; dispositivo: string | null } | undefined;
    const basal = basales.get(id) ?? null;
    if (!u && basal === null) continue;             // ni datos ni basal: no hay nada que enseñar

    // Se evalúa en el instante de la última muestra, igual que hizo la vigilancia al recibirla.
    const tEval = u?.t_scet ?? t;
    const ev = evaluarVariable(db, trip.id, id, tEval, true);
    const rec = u ? estadoRecordado(db, trip.id, id) : { personal: null, umbral: null };
    // Manda lo que recuerda la vigilancia (coherente con las alertas); si no recuerda nada, lo calculado ahora.
    const ePersonal = rec.personal ?? ev.personal?.estado ?? null;
    const eUmbral = rec.umbral ?? ev.umbral?.estado ?? null;
    const ref = refs.get(id);
    const reg = registradas.get(id);
    const { pred } = ev;

    variables.push({
      id,
      clave: (typeof ref?.clave === 'string' && ref.clave) || CLAVES[id] || null,
      nombre: ref?.nombre ?? reg?.nombre ?? id,
      unidad: ref?.unidad ?? reg?.unidad ?? u?.unidad ?? null,
      valor: u?.valor ?? null, t_scet: u?.t_scet ?? null,
      dispositivo: u?.dispositivo ?? null, procedencia: u?.procedencia ?? null,
      mediana_24h: ev.mediana_24h === null ? null : r2(ev.mediana_24h),
      esperado: pred ? r2(pred.esperado) : null,
      banda: pred ? [r2(pred.banda[0]), r2(pred.banda[1])] : null,
      z: ev.personal ? r2(ev.personal.z) : null,
      estado: u ? peor(ePersonal ?? 'verde', eUmbral ?? 'verde') : 'sin_dato',
      motivo: u ? motivoDe(ePersonal, eUmbral) : null,
      estado_personal: u ? ePersonal : null,
      estado_umbral: u ? eUmbral : null,
      valor_umbral: ev.umbral ? r2(ev.umbral.valor_evaluado) : null,
      calibrando: pred ? pred.calibrando : calibrandoEn(db, tEval),
      extrapolado: pred?.extrapolado ?? false,
      pesos: pred ? { poblacion: r3(pred.pesos.poblacion), historial: r3(pred.pesos.historial), vuelo: r3(pred.pesos.vuelo) } : null,
      basal,
      umbral: ref?.umbral ?? null,
      como_se_mide: ref?.como_se_mide_aqui ?? null,
      equipo_a_bordo: ref?.equipo_a_bordo ?? null,
      padecimientos: Array.isArray(ref?.padecimientos) ? ref.padecimientos : [],
      serie: u ? serieDiaria(db, trip.id, id, origen, u.t_scet) : [],
    });
  }

  const alertas = (db.prepare(`SELECT * FROM alertas WHERE tripulante = ? ORDER BY id DESC LIMIT 20`).all(trip.id) as
    Array<Record<string, unknown>>).map((a) => ({ ...a, banda: deTexto(a.banda), umbral: deTexto(a.umbral) }));
  const avisos = (db.prepare(
    `SELECT * FROM subida WHERE entregado = 1 AND para IN (?, 'todos') ORDER BY id DESC LIMIT 20`,
  ).all(trip.id) as Array<Record<string, unknown>>).map((a) => ({ ...a, datos: deTexto(a.datos) }));

  return { tripulante: { id: trip.id, nombre: trip.nombre, rol: trip.rol ?? null }, entorno: entornoEn(db, t), dia_mision, ventana_personal_min: ventanaPersonal(), t, variables, alertas, avisos };
}
