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
import { evaluarUmbral, peor, referenciaDe, umbralUtil, type Estado } from './referencias.ts';

/** Eventos para la interfaz: 'muestra', 'alerta', 'rechazo'. */
export const bus = new EventEmitter();
bus.setMaxListeners(100);

export const VENTANA_CALIBRACION_DIAS = 14;
const DIA_MS = 86_400_000;
/** Umbral absoluto: mediana de las últimas 5 muestras válidas dentro de 10 minutos. */
export const VENTANA_UMBRAL_MS = 10 * 60_000;

/**
 * Ventana del criterio personal: en misión, 24 h. Sólo para una demostración de minutos se puede
 * acortar (PUT /api/lunna/ventana): con 24 h, una anomalía provocada en vivo tarda tanto en mover la
 * mediana como datos se hayan acumulado en la ventana, y la vuelta a verde no se llega a ver.
 * Lo que se acorte se informa en /api/salud, en la página de estado y en /api/app.
 */
export const VENTANA_PERSONAL_MISION_MIN = 24 * 60;
let ventanaPersonalMin = VENTANA_PERSONAL_MISION_MIN;
export const ventanaPersonal = () => ventanaPersonalMin;
export function fijarVentanaPersonal(minutos: number): number {
  if (!Number.isFinite(minutos) || minutos < 1 || minutos > VENTANA_PERSONAL_MISION_MIN) {
    throw new Error(`la ventana va de 1 a ${VENTANA_PERSONAL_MISION_MIN} minutos`);
  }
  ventanaPersonalMin = Math.round(minutos);
  return ventanaPersonalMin;
}
export const MUESTRAS_UMBRAL = 5;
/** Con menos muestras no se evalúa nada: un artefacto suelto no dispara. */
export const MINIMO_MUESTRAS = 3;
/** Una muestra sin valor o tomada sin contacto del sensor no cuenta para evaluar. */
export const MUESTRA_VALIDA = `valor IS NOT NULL AND (calidad IS NULL OR json_extract(calidad, '$.contacto') IS NOT 0)`;

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
    if (res.aceptadas) bus.emit('trama', {
      perfil: 'eva', dispositivo: cab.idDisp, tripulante, seq: cab.seq, t_scet: t, esquema: esquema.id,
      hex: Buffer.from(buf).toString('hex'),
      valores: Object.fromEntries(esquema.campos.map((c) => [c.clave, Number.isFinite(valores[c.clave]) ? Number(valores[c.clave]!.toFixed(2)) : null])),
    });
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
    if (res.aceptadas) bus.emit('trama', { perfil: 'json', dispositivo: disp.id, tripulante, seq: tr.seq, t_scet: t, json: JSON.stringify(tr) });
  } catch (e) {
    res.rechazos.push((e as Error).message);
  }
  if (res.rechazos.length) bus.emit('rechazo', res.rechazos);
  return res;
}

// ─── LUNNA aplicado ──────────────────────────────────────────────────────────

export const mediana = (xs: number[]) => {
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

/** ¿Está `t` dentro de la ventana de calibración del entorno vigente? */
export function calibrandoEn(db: BD, t: string): boolean {
  const inicio = inicioEntorno(db, t);
  return !!inicio && entornoEn(db, t) !== 'tierra'
    && Date.parse(t) - Date.parse(inicio) < VENTANA_CALIBRACION_DIAS * DIA_MS;
}

// ─── vigilancia: normal personal + umbral clínico absoluto ───────────────────

export type Motivo = 'personal' | 'umbral' | 'ambos';

/** Resultado del criterio personal (LUNNA): la mediana de 24 h contra lo esperado para esa persona. */
export interface EvalPersonal { estado: Estado; z: number; prob_nominal: number }

/** Resultado del criterio por umbral absoluto. */
export interface EvalUmbral {
  tipo: 'A' | 'T';
  fuente: string;
  /** Límite cruzado; `null` si el valor está dentro. */
  limite: number | null;
  lado: 'min' | 'max' | null;
  /** Mediana de las últimas muestras válidas (hasta 5, en 10 min). */
  valor_evaluado: number;
  estado: Estado;
  n: number;
}

export interface EvaluacionVariable {
  /** `null` si falta el prior o el basal. */
  pred: (Prediccion & { calibrando: boolean; dia: number }) | null;
  mediana_24h: number | null;
  /** Si el criterio existe para esta variable (hay prior y basal · hay umbral de referencia). */
  aplica: { personal: boolean; umbral: boolean };
  /** `null` = no se pudo evaluar ahora (calibrando, sin prior o con menos de 3 muestras). */
  personal: EvalPersonal | null;
  /** `null` = no se pudo evaluar ahora (sin umbral de referencia o con menos de 3 muestras en 10 min). */
  umbral: EvalUmbral | null;
}

/**
 * Los dos criterios para una persona y una variable en el instante `t`.
 *
 *  - personal: mediana de las últimas 24 h (ventanaPersonal) contra lo que LUNNA espera de ESA persona.
 *    No la muestra suelta: la validación de Smart Fusion mostró que el valor
 *    instantáneo apenas supera a una constante, y que el agregado sí tiene señal.
 *  - umbral: mediana de las últimas 5 muestras válidas en 10 min contra el límite
 *    clínico absoluto de `referencias`. Reacciona en minutos, y vale también en
 *    calibración o sin prior.
 *
 * `completo` calcula la mediana de 24 h aunque el criterio personal no se pueda evaluar
 * (lo pide la app; la vigilancia no, para no consultar de más en cada muestra).
 */
export function evaluarVariable(db: BD, tripulante: string, variable: string, t: string, completo = false): EvaluacionVariable {
  const pred = prediccionPara(db, tripulante, variable, t);
  const evaluable = !!pred && !pred.calibrando;
  let mediana_24h: number | null = null;
  let personal: EvalPersonal | null = null;
  if (evaluable || completo) {
    const desde = new Date(Date.parse(t) - ventanaPersonalMin * 60_000).toISOString();
    const vals = (db.prepare(
      `SELECT valor FROM muestras WHERE tripulante = ? AND variable = ? AND t_scet > ? AND t_scet <= ? AND ${MUESTRA_VALIDA}`,
    ).all(tripulante, variable, desde, t) as Array<{ valor: number }>).map((r) => r.valor);
    if (vals.length) mediana_24h = mediana(vals);
    if (evaluable && vals.length >= MINIMO_MUESTRAS) {
      const ev = evaluar(mediana_24h!, pred!, priorDe(db, variable, pred!.entorno)!);
      personal = { estado: ev.estado, z: ev.z, prob_nominal: ev.prob_nominal };
    }
  }

  const u = referenciaDe(db, variable)?.umbral;
  let umbral: EvalUmbral | null = null;
  if (umbralUtil(u)) {
    // Usa el índice (tripulante, variable, t_scet): lee como mucho las muestras de 10 minutos.
    const desde = new Date(Date.parse(t) - VENTANA_UMBRAL_MS).toISOString();
    const vals = (db.prepare(
      `SELECT valor FROM muestras WHERE tripulante = ? AND variable = ? AND t_scet >= ? AND t_scet <= ? AND ${MUESTRA_VALIDA}
       ORDER BY t_scet DESC LIMIT ?`,
    ).all(tripulante, variable, desde, t, MUESTRAS_UMBRAL) as Array<{ valor: number }>).map((r) => r.valor);
    if (vals.length >= MINIMO_MUESTRAS) {
      const v = mediana(vals);
      umbral = { tipo: u.tipo, fuente: u.fuente, ...evaluarUmbral(v, u), valor_evaluado: v, n: vals.length };
    }
  }
  return { pred, mediana_24h, aplica: { personal: !!pred, umbral: umbralUtil(u) }, personal, umbral };
}

/** `'ambos'` si los dos criterios están fuera de verde; `null` si ninguno. */
export function motivoDe(personal: Estado | null, umbral: Estado | null): Motivo | null {
  const p = !!personal && personal !== 'verde', u = !!umbral && umbral !== 'verde';
  return p && u ? 'ambos' : p ? 'personal' : u ? 'umbral' : null;
}

/** Lo que la vigilancia recuerda de cada tripulante y variable. */
interface Recordado {
  /** Último estado conocido de cada criterio; `null` = nunca evaluado o no aplica. */
  personal: Estado | null;
  umbral: Estado | null;
  /** Último resultado del umbral fuera de verde: va dentro de la alerta. */
  detalle: EvalUmbral | null;
  /** Último estado combinado visto: sólo sus cambios generan alerta. */
  combinado: Estado | null;
  /** Ya hubo alguna alerta: la vuelta a verde también se avisa. */
  alertado: boolean;
  /** Motivo de la última alerta: la vuelta a verde dice qué se resolvió. */
  motivo: Motivo | null;
}

let recordados = new WeakMap<BD, Map<string, Recordado>>();

/**
 * Estado recordado. La primera vez que se pregunta por una clave se recupera de la
 * última alerta guardada: tras reiniciar el servidor no se repite la alerta que ya
 * estaba dada, y la vuelta a verde se sigue avisando.
 */
function recordar(db: BD, tripulante: string, variable: string): Recordado {
  let m = recordados.get(db);
  if (!m) { m = new Map(); recordados.set(db, m); }
  const k = `${tripulante}|${variable}`;
  let r = m.get(k);
  if (!r) {
    r = { personal: null, umbral: null, detalle: null, combinado: null, alertado: false, motivo: null };
    const f = db.prepare(
      `SELECT estado, motivo, umbral FROM alertas WHERE tripulante = ? AND variable = ? ORDER BY id DESC LIMIT 1`,
    ).get(tripulante, variable) as { estado: Estado; motivo: Motivo | null; umbral: string | null } | undefined;
    if (f) {
      r.combinado = f.estado;
      r.alertado = true;
      r.motivo = f.motivo ?? 'personal';             // las alertas de antes de los umbrales eran todas personales
      if (f.estado !== 'verde') {
        if (r.motivo !== 'umbral') r.personal = f.estado;
        if (r.motivo !== 'personal') {
          try { r.detalle = f.umbral ? deJson<EvalUmbral>(f.umbral) : null; } catch { r.detalle = null; }
          r.umbral = r.detalle?.estado ?? f.estado;
        }
      }
    }
    m.set(k, r);
  }
  return r;
}

/** Último estado conocido de cada criterio (lo usa la app para ser coherente con las alertas). */
export function estadoRecordado(db: BD, tripulante: string, variable: string): { personal: Estado | null; umbral: Estado | null } {
  const r = recordar(db, tripulante, variable);
  return { personal: r.personal, umbral: r.umbral };
}

/**
 * Se ejecuta por cada muestra válida. El estado de la variable es el PEOR de los dos
 * criterios, y sólo sus cambios generan alerta (también la vuelta a verde).
 *
 * Un criterio que ahora no se puede evaluar (calibrando, o menos de 3 muestras en su
 * ventana) conserva su último estado: tras un hueco de datos, una sola muestra no
 * basta para dar por resuelta una alerta.
 */
function vigilar(db: BD, tripulante: string, variable: string, t: string): void {
  const ev = evaluarVariable(db, tripulante, variable, t);
  const rec = recordar(db, tripulante, variable);
  if (ev.personal) rec.personal = ev.personal.estado;
  if (ev.umbral) {
    rec.umbral = ev.umbral.estado;
    rec.detalle = ev.umbral.estado === 'verde' ? null : ev.umbral;
  } else if (!ev.aplica.umbral) {
    rec.umbral = null;                               // la variable ya no tiene umbral de referencia
    rec.detalle = null;
  }
  if (!ev.personal && !ev.umbral) return;            // nada nuevo que decir

  const estado = peor(rec.personal ?? 'verde', rec.umbral ?? 'verde');
  if (rec.combinado === estado) return;              // sólo los cambios de estado generan alerta
  rec.combinado = estado;
  if (estado === 'verde' && !rec.alertado) return;
  if (estado !== 'verde') rec.alertado = true;

  // En la vuelta a verde, el motivo es el de la alerta que se resuelve.
  const motivo: Motivo = motivoDe(rec.personal, rec.umbral) ?? rec.motivo ?? 'personal';
  rec.motivo = motivo;
  const d = rec.detalle;
  const umbral = d
    ? { tipo: d.tipo, fuente: d.fuente, limite: d.limite, valor_evaluado: d.valor_evaluado, lado: d.lado, estado: d.estado }
    : null;
  const { pred } = ev;
  const alerta = {
    tripulante, variable, estado, motivo,
    z: ev.personal ? Number(ev.personal.z.toFixed(2)) : null,
    prob_nominal: ev.personal ? Number(ev.personal.prob_nominal.toPrecision(3)) : null,
    // Mediana de 24 h cuando hay criterio personal; si no, lo que evaluó el umbral.
    valor: ev.personal ? ev.mediana_24h! : ev.umbral!.valor_evaluado,
    esperado: pred ? Number(pred.esperado.toFixed(2)) : null,
    banda: pred ? pred.banda.map((x) => Number(x.toFixed(2))) : null,
    t_scet: t, entorno: pred?.entorno ?? entornoEn(db, t), extrapolado: pred?.extrapolado ?? false, pesos: pred?.pesos ?? null,
    calibrando: pred ? pred.calibrando : calibrandoEn(db, t),
    umbral, estado_personal: rec.personal, estado_umbral: rec.umbral,
  };
  db.prepare(
    `INSERT INTO alertas (tripulante, variable, estado, z, valor, esperado, banda, t_scet, creada, motivo, umbral)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
  ).run(tripulante, variable, estado, alerta.z, alerta.valor, alerta.esperado, alerta.banda ? json(alerta.banda) : null,
        t, ahora(), motivo, umbral ? json(umbral) : null);
  bus.emit('alerta', alerta);
}

/** Para pruebas y para reiniciar la demo: olvida los estados recordados. */
export function reiniciarEstados(): void { recordados = new WeakMap(); }
