/**
 * Tubería de ingesta: de una trama cruda a muestras guardadas y evaluadas.
 *
 *   trama ─► dispositivo ─► tripulante (asignación) ─► decodificar ─► fórmula
 *         ─► validar ─► guardar ─► LUNNA ─► alerta si se sale de lo esperado
 *
 * Dos entradas:
 *   - binaria: perfil EVA, de hardware propio (traje, ESP32, simulador)
 *   - JSON:    eva.telemetry.v1, de dispositivos intermedios (celular, reloj)
 */
import { EventEmitter } from 'node:events';
import { ahora, deJson, json, type BD } from './db.ts';
import { decodificar, leerCabecera, type Esquema } from './esquema.ts';
import { aDelta, evaluar, predecir, type Covariables, type Entorno, type Prediccion, type Prior } from './lunna.ts';

/** Eventos para la interfaz: 'muestra', 'alerta', 'rechazo'. */
export const bus = new EventEmitter();
bus.setMaxListeners(100);

export const VENTANA_CALIBRACION_DIAS = 14;
const DIA_MS = 86_400_000;

export interface MuestraEntrada {
  variable: string;
  valor: number | null;
  unidad?: string;
  procedencia?: string;
  calidad?: Record<string, unknown>;
  metodo?: string;
}

export interface Resultado {
  aceptadas: number;
  duplicadas: number;
  rechazos: string[];
}

// ─── resolución de contexto ──────────────────────────────────────────────────

export function tripulanteDe(db: BD, dispositivo: number, t: string): string | null {
  const r = db.prepare(
    `SELECT tripulante FROM asignaciones
     WHERE dispositivo = ? AND desde <= ? AND (hasta IS NULL OR hasta > ?)
     ORDER BY desde DESC LIMIT 1`,
  ).get(dispositivo, t, t) as { tripulante: string } | undefined;
  return r?.tripulante ?? null;
}

export function entornoEn(db: BD, t: string): Entorno {
  const r = db.prepare(`SELECT entorno FROM fases WHERE desde <= ? ORDER BY desde DESC LIMIT 1`)
    .get(t) as { entorno: Entorno } | undefined;
  return r?.entorno ?? 'tierra';
}

/** Inicio del entorno vigente en t: arranque de su ventana de calibración. */
function inicioEntorno(db: BD, t: string): string | null {
  const r = db.prepare(`SELECT desde FROM fases WHERE desde <= ? ORDER BY desde DESC LIMIT 1`)
    .get(t) as { desde: string } | undefined;
  return r?.desde ?? null;
}

function variableInfo(db: BD, id: string) {
  return db.prepare(`SELECT unidad, procedencia FROM variables WHERE id = ?`).get(id) as
    | { unidad: string; procedencia: string }
    | undefined;
}

// ─── guardar ─────────────────────────────────────────────────────────────────

function guardar(
  db: BD,
  ctx: { tripulante: string; t: string; dispositivo: number | null; seq: number | null; esquema: number | null },
  m: MuestraEntrada,
  res: Resultado,
): void {
  const info = variableInfo(db, m.variable);
  if (!info) {
    res.rechazos.push(`variable no registrada: ${m.variable}`);
    return;
  }
  if (m.procedencia === 'estimated' && !m.metodo && !(m.calidad && 'ic95' in m.calidad)) {
    res.rechazos.push(`${m.variable}: un valor estimado necesita método o ic95`);
    return;
  }
  const entorno = entornoEn(db, ctx.t);
  const r = db.prepare(
    `INSERT OR IGNORE INTO muestras
       (tripulante, variable, valor, unidad, procedencia, calidad, metodo, t_scet, t_recibida,
        dispositivo, seq, esquema_id, entorno)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
  ).run(
    ctx.tripulante, m.variable, m.valor, m.unidad ?? info.unidad, m.procedencia ?? info.procedencia,
    m.calidad ? json(m.calidad) : null, m.metodo ?? null, ctx.t, ahora(),
    ctx.dispositivo, ctx.seq, ctx.esquema, entorno,
  );
  if (r.changes === 0) { res.duplicadas++; return; }
  res.aceptadas++;
  bus.emit('muestra', { tripulante: ctx.tripulante, variable: m.variable, valor: m.valor, t_scet: ctx.t, entorno });

  // Una muestra tomada sin contacto del sensor se guarda, pero no se evalúa.
  if (m.valor !== null && m.calidad?.['contacto'] !== false) {
    vigilar(db, ctx.tripulante, m.variable, ctx.t);
  }
}

// ─── entradas ────────────────────────────────────────────────────────────────

export function ingerirBinaria(db: BD, buf: Uint8Array): Resultado {
  const res: Resultado = { aceptadas: 0, duplicadas: 0, rechazos: [] };
  try {
    const cab = leerCabecera(buf);
    const disp = db.prepare(`SELECT id FROM dispositivos WHERE id = ?`).get(cab.idDisp);
    if (!disp) throw new Error(`dispositivo ${cab.idDisp} no registrado`);
    const fila = db.prepare(`SELECT * FROM esquemas WHERE id = ?`).get(cab.idEsquema) as
      | { id: number; nombre: string; version: number; campos: string } | undefined;
    if (!fila) throw new Error(`esquema ${cab.idEsquema} desconocido`);
    const esquema: Esquema = { id: fila.id, nombre: fila.nombre, version: fila.version, campos: deJson(fila.campos) };

    const { valores } = decodificar(buf, esquema);
    const t = cab.tScet.toISOString();
    const tripulante = tripulanteDe(db, cab.idDisp, t);
    if (!tripulante) throw new Error(`dispositivo ${cab.idDisp} sin asignar a ningún tripulante en ${t}`);

    const ctx = { tripulante, t, dispositivo: cab.idDisp, seq: cab.seq, esquema: esquema.id };
    for (const c of esquema.campos) {
      guardar(db, ctx, {
        variable: c.variable,
        valor: Number.isFinite(valores[c.clave]) ? Number(valores[c.clave]!.toFixed(4)) : null,
        procedencia: c.tipo ? undefined : 'derived',
        metodo: c.formula,
      }, res);
    }
  } catch (e) {
    res.rechazos.push((e as Error).message);
  }
  if (res.rechazos.length) bus.emit('rechazo', res.rechazos);
  return res;
}

export interface TramaJson {
  frame: string;
  source: { id: string; kind?: string };
  subject?: string;
  t_scet: string;
  seq: number;
  samples: Array<{ var: string; value: number | null; unit?: string; origin?: string;
                   quality?: Record<string, unknown>; method?: string }>;
}

export function ingerirJson(db: BD, tr: TramaJson): Resultado {
  const res: Resultado = { aceptadas: 0, duplicadas: 0, rechazos: [] };
  try {
    if (tr.frame !== 'eva.telemetry.v1') throw new Error(`frame debe ser eva.telemetry.v1`);
    if (!tr.t_scet || Number.isNaN(Date.parse(tr.t_scet))) throw new Error('t_scet obligatorio y válido');
    if (!Array.isArray(tr.samples)) throw new Error('samples debe ser una lista');
    const disp = db.prepare(`SELECT id FROM dispositivos WHERE clave = ?`).get(tr.source?.id) as
      | { id: number } | undefined;
    if (!disp) throw new Error(`dispositivo "${tr.source?.id}" no registrado`);
    const t = new Date(tr.t_scet).toISOString();

    // La asignación manda; el sujeto que declare el celular es sólo respaldo.
    const tripulante = tripulanteDe(db, disp.id, t) ?? tr.subject ?? null;
    if (!tripulante) throw new Error(`dispositivo "${tr.source.id}" sin asignar y sin subject`);

    const ctx = { tripulante, t, dispositivo: disp.id, seq: tr.seq, esquema: null };
    for (const s of tr.samples) {
      guardar(db, ctx, {
        variable: s.var, valor: s.value, unidad: s.unit, procedencia: s.origin,
        calidad: s.quality, metodo: s.method,
      }, res);
    }
  } catch (e) {
    res.rechazos.push((e as Error).message);
  }
  if (res.rechazos.length) bus.emit('rechazo', res.rechazos);
  return res;
}

// ─── LUNNA aplicado ──────────────────────────────────────────────────────────

const mediana = (xs: number[]) => {
  const o = [...xs].sort((a, b) => a - b);
  const m = Math.floor(o.length / 2);
  return o.length % 2 ? o[m]! : (o[m - 1]! + o[m]!) / 2;
};

export function priorDe(db: BD, variable: string, entorno: Entorno): Prior | null {
  const r = db.prepare(`SELECT datos FROM priores WHERE variable = ? AND entorno = ?`).get(variable, entorno) as
    | { datos: string } | undefined;
  return r ? deJson<Prior>(r.datos) : null;
}

/**
 * Predicción para una persona, una variable y el entorno vigente en `t`.
 * `null` si falta el prior o el basal: sin eso no se predice nada.
 */
export function prediccionPara(db: BD, tripulante: string, variable: string, t: string):
  (Prediccion & { calibrando: boolean; dia: number }) | null {
  const entorno = entornoEn(db, t);
  const prior = priorDe(db, variable, entorno);
  const basal = db.prepare(`SELECT valor FROM basales WHERE tripulante = ? AND variable = ?`)
    .get(tripulante, variable) as { valor: number } | undefined;
  if (!prior || !basal) return null;

  const tp = db.prepare(`SELECT * FROM tripulantes WHERE id = ?`).get(tripulante) as
    | (Covariables & { id: string }) | undefined;
  const historial = (db.prepare(
    `SELECT delta FROM historial WHERE tripulante = ? AND variable = ? AND entorno = ? AND escala = ?`,
  ).all(tripulante, variable, entorno, prior.escala) as Array<{ delta: number }>).map((r) => r.delta);

  // Ventana de calibración: los primeros días del entorno, por mediana diaria.
  const inicio = inicioEntorno(db, t);
  let calibracion: number[] = [];
  let dia = 0;
  if (inicio && entorno !== 'tierra') {
    const finVentana = new Date(Date.parse(inicio) + VENTANA_CALIBRACION_DIAS * DIA_MS).toISOString();
    dia = Math.floor((Date.parse(t) - Date.parse(inicio)) / DIA_MS);
    const filas = db.prepare(
      `SELECT valor, t_scet FROM muestras
       WHERE tripulante = ? AND variable = ? AND t_scet >= ? AND t_scet < ? AND valor IS NOT NULL
         AND (calidad IS NULL OR json_extract(calidad, '$.contacto') IS NOT 0)`,
    ).all(tripulante, variable, inicio, finVentana < t ? finVentana : t) as Array<{ valor: number; t_scet: string }>;
    // Agrupa por DÍA DE MISIÓN, no por fecha de calendario.
    const porDia = new Map<number, number[]>();
    for (const f of filas) {
      const d = Math.floor((Date.parse(f.t_scet) - Date.parse(inicio)) / DIA_MS);
      porDia.set(d, [...(porDia.get(d) ?? []), f.valor]);
    }
    calibracion = [...porDia.values()].map((vs) => aDelta(mediana(vs), basal.valor, prior.escala));
  }

  const pred = predecir({ prior, basal: basal.valor, covariables: tp ?? null, historial, calibracion });
  return { ...pred, calibrando: entorno !== 'tierra' && dia < VENTANA_CALIBRACION_DIAS, dia };
}

const ultimoEstado = new Map<string, string>();

/**
 * Evalúa la mediana de las últimas 24 h, no la muestra suelta: la validación de
 * Smart Fusion mostró que el valor instantáneo apenas supera a una constante, y
 * que el agregado sí tiene señal.
 */
function vigilar(db: BD, tripulante: string, variable: string, t: string): void {
  const pred = prediccionPara(db, tripulante, variable, t);
  if (!pred || pred.calibrando) return;
  const prior = priorDe(db, variable, pred.entorno)!;

  const desde = new Date(Date.parse(t) - DIA_MS).toISOString();
  const vals = (db.prepare(
    `SELECT valor FROM muestras WHERE tripulante = ? AND variable = ? AND t_scet > ? AND t_scet <= ?
       AND valor IS NOT NULL AND (calidad IS NULL OR json_extract(calidad, '$.contacto') IS NOT 0)`,
  ).all(tripulante, variable, desde, t) as Array<{ valor: number }>).map((r) => r.valor);
  if (vals.length < 3) return;

  const valor = mediana(vals);
  const ev = evaluar(valor, pred, prior);
  const k = `${tripulante}|${variable}`;
  if (ultimoEstado.get(k) === ev.estado) return; // sólo los cambios de estado generan alerta
  ultimoEstado.set(k, ev.estado);
  if (ev.estado === 'verde' && !ultimoEstado.has(`${k}|alertado`)) return;
  if (ev.estado !== 'verde') ultimoEstado.set(`${k}|alertado`, '1');

  const alerta = {
    tripulante, variable, estado: ev.estado, z: Number(ev.z.toFixed(2)), valor,
    esperado: Number(pred.esperado.toFixed(2)), banda: pred.banda.map((x) => Number(x.toFixed(2))),
    t_scet: t, entorno: pred.entorno, extrapolado: pred.extrapolado, pesos: pred.pesos,
  };
  db.prepare(
    `INSERT INTO alertas (tripulante, variable, estado, z, valor, esperado, banda, t_scet, creada)
     VALUES (?,?,?,?,?,?,?,?,?)`,
  ).run(tripulante, variable, ev.estado, alerta.z, valor, alerta.esperado, json(alerta.banda), t, ahora());
  bus.emit('alerta', alerta);
}

/** Para pruebas: olvida los estados recordados. */
export function reiniciarEstados(): void { ultimoEstado.clear(); }
