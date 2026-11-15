/**
 * Semáforo de padecimientos (motor de 20, prototipo-salud): lectura de `evaluaciones`, edición de
 * pesos del usuario (`pesos_usuario`) y ejecución del motor Python. Nada aquí es un diagnóstico.
 */
import { execFile } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ahora, type BD } from './db.ts';

const AQUI = dirname(fileURLToPath(import.meta.url));

export const AVISO = 'No es un diagnóstico. Se recomienda revisión por el cirujano de vuelo.';
export const RANGO_PESO: [number, number] = [0, 3];
export const UMBRALES_EDITABLES = ['T_amarillo', 'T_inf_rojo', 'dL_amarillo', 'dL_inf_rojo', 'persistencia_h', 'histeresis_evaluaciones', 'cobertura_min'];
const SIN_EVALUACION = 'Sin evaluación: el motor de padecimientos todavía no ha evaluado a este tripulante.';
const NOTA_PESOS = 'Umbrales provisionales: sus valores por defecto viven en el motor Python (prototipo-salud/motor/parametros.py). '
  + 'Los cambios se aplican en la próxima evaluación (POST /api/padecimientos/evaluar o npm run evaluar).';

export class ErrorSemaforo extends Error {
  estado: number;
  constructor(estado: number, msg: string) { super(msg); this.estado = estado; }
}

type Fila = Record<string, any>;
const todos = (db: BD, sql: string, ...a: Array<string | number | null>): Fila[] => db.prepare(sql).all(...a) as Fila[];
const uno = (db: BD, sql: string, ...a: Array<string | number | null>): Fila | undefined => db.prepare(sql).get(...a) as Fila | undefined;
const detalleDe = (txt: unknown): Fila => { try { const d = JSON.parse(String(txt)); return d && typeof d === 'object' ? d : {}; } catch { return {}; } };

/** Ruta del archivo de la BD ('' = en memoria). */
export function rutaBd(db: BD): string {
  const f = (db.prepare('PRAGMA database_list').all() as Fila[]).find((r) => r.name === 'main');
  return f?.file ? String(f.file) : '';
}

/** Carpeta de prototipo-salud: PROTOTIPO_DIR, luego PROTOTIPO_SALUD, luego la del repo. */
export const dirPrototipo = () => resolve(process.env.PROTOTIPO_DIR ?? process.env.PROTOTIPO_SALUD ?? join(AQUI, '..', '..', '..', 'prototipo-salud'));

export function comoPoblar(db: BD) {
  const bd = rutaBd(db) || 'eva.db';
  return {
    npm: 'npm run evaluar -- --simulado',
    python: `cd prototipo-salud && EVA_DB=${bd} python3 -m motor.evadb --evaluar [--simulado]`,
    post: 'POST /api/padecimientos/evaluar {"simulado": true}',
  };
}

const catalogo = (db: BD) => todos(db, `SELECT p.id, p.nombre, p.riesgo_nasa,
  (SELECT COUNT(*) FROM padecimiento_variable v WHERE v.padecimiento_id = p.id) AS n_variables FROM padecimientos p ORDER BY p.id`);

const ultimas = (db: BD, tripulante?: string) => todos(db,
  `SELECT e.* FROM evaluaciones e WHERE e.id = (SELECT e2.id FROM evaluaciones e2
     WHERE e2.tripulante = e.tripulante AND e2.padecimiento_id = e.padecimiento_id ORDER BY e2.hora DESC, e2.id DESC LIMIT 1)
   ${tripulante ? 'AND e.tripulante = ?' : ''}`, ...(tripulante ? [tripulante] : []));

const existeTripulante = (db: BD, id: string) =>
  !!uno(db, 'SELECT 1 AS x FROM tripulantes WHERE id = ?', id) || !!uno(db, 'SELECT 1 AS x FROM evaluaciones WHERE tripulante = ?', id);

export function semaforo(db: BD, tripulante?: string) {
  if (tripulante && !existeTripulante(db, tripulante)) throw new ErrorSemaforo(404, `tripulante ${tripulante} no existe`);
  const pads = catalogo(db);
  const ids = todos(db, `SELECT id FROM tripulantes UNION SELECT DISTINCT tripulante FROM evaluaciones ORDER BY 1`).map((r) => String(r.id));
  const nombres = new Map(todos(db, 'SELECT id, nombre FROM tripulantes').map((r) => [String(r.id), String(r.nombre)]));
  const filas = new Map(ultimas(db, tripulante).map((e) => [`${e.tripulante}|${e.padecimiento_id}`, e]));
  const tripulantes = (tripulante ? [tripulante] : ids).map((id) => {
    const conteo = { VERDE: 0, AMARILLO: 0, ROJO: 0, GRIS: 0 } as Record<string, number>;
    let hora: string | null = null, canal: string | null = null;
    const sem = pads.map((p) => {
      const e = filas.get(`${id}|${p.id}`);
      const base = { padecimiento_id: p.id, nombre: p.nombre, riesgo_nasa: p.riesgo_nasa };
      if (!e) { conteo.GRIS++; return { ...base, color: 'GRIS', por_que: SIN_EVALUACION, hora: null, canal: null, simulado: false, etiquetas: [], cobertura: null, fecha_evaluacion: null, evaluado: false }; }
      const d = detalleDe(e.detalle);
      conteo[e.color] = (conteo[e.color] ?? 0) + 1;
      if (!hora || e.hora > hora) { hora = e.hora; canal = e.canal; }
      return { ...base, color: e.color, por_que: d.motivo ?? null, hora: e.hora, canal: e.canal, simulado: e.canal === 'SIMULADO',
        etiquetas: Array.isArray(d.etiquetas) ? d.etiquetas : [], cobertura: d.cobertura ?? null, fecha_evaluacion: d.fecha_evaluacion ?? null, evaluado: true };
    });
    return { id, nombre: nombres.get(id) ?? null, simulado: canal === 'SIMULADO', hora, conteo, semaforo: sem };
  });
  return {
    aviso: AVISO, provisional: true, umbrales_provisionales: true,
    vacio: !uno(db, 'SELECT 1 AS x FROM evaluaciones LIMIT 1'),
    como_poblar: comoPoblar(db),
    padecimientos: pads, tripulantes,
  };
}

export function detalleSemaforo(db: BD, tripulante: string, padecimiento: string) {
  const pad = uno(db, 'SELECT id, nombre, riesgo_nasa, descripcion, prevalencia, fuente_prevalencia FROM padecimientos WHERE id = ?', padecimiento);
  if (!pad) throw new ErrorSemaforo(404, `padecimiento ${padecimiento} no existe`);
  if (!existeTripulante(db, tripulante)) throw new ErrorSemaforo(404, `tripulante ${tripulante} no existe`);
  const e = uno(db, 'SELECT * FROM evaluaciones WHERE tripulante = ? AND padecimiento_id = ? ORDER BY hora DESC, id DESC LIMIT 1', tripulante, padecimiento);
  const d = e ? detalleDe(e.detalle) : {};
  const ligas = new Map<string, Fila>((Array.isArray(d.ligas) ? d.ligas : []).map((l: Fila) => [String(l.variable_id), l]));
  const variables = ligasPesos(db, padecimiento).map((l) => {
    const ev = ligas.get(l.variable_id);
    return { variable_id: l.variable_id, variable: l.variable, direccion: l.direccion, nivel_evidencia: l.nivel_evidencia, fuente: l.fuente,
      lr_o_or: l.lr_o_or, medido_en_vuelo: l.medido_en_vuelo,
      peso_fuente: l.peso_fuente, peso_usuario: l.peso_usuario, peso_efectivo: l.peso_efectivo,
      modificado_por_usuario: l.modificado_por_usuario, modificado: l.modificado,
      peso_evaluado: ev?.peso ?? null, valor: ev?.valor ?? null, unidad: ev?.unidad ?? null, fecha_dato: ev?.fecha_dato ?? null,
      activacion: ev?.activacion ?? null, contribucion: ev?.aporte ?? null, cuenta_en_T: ev?.cuenta_en_T ?? null,
      ausencia: ev?.ausencia ?? null, motivo_ausencia: ev?.motivo_ausencia ?? null };
  });
  const nz = (x: number | null) => (x === null ? Infinity : -x);
  variables.sort((a, b) => nz(a.contribucion) - nz(b.contribucion) || b.peso_efectivo - a.peso_efectivo || a.variable_id.localeCompare(b.variable_id));
  const por_que = e ? (d.motivo ?? null) : SIN_EVALUACION;
  return {
    aviso: AVISO, provisional: true, padecimiento: pad,
    tripulante: { id: tripulante, nombre: (uno(db, 'SELECT nombre FROM tripulantes WHERE id = ?', tripulante)?.nombre as string) ?? null },
    color: e ? e.color : 'GRIS', por_que,
    evaluacion: e ? { color: e.color, por_que, hora: e.hora, canal: e.canal, simulado: e.canal === 'SIMULADO', T: d.T ?? null, T_de: d.T_de ?? null,
      T_inf: d.T_inf ?? null, T_max: d.T_max ?? null, cobertura: d.cobertura ?? null, condiciones: d.condiciones ?? [],
      etiquetas: d.etiquetas ?? [], fase: d.fase ?? null, fecha_evaluacion: d.fecha_evaluacion ?? null } : null,
    con_desglose: ligas.size > 0,
    variables,
    nota: 'La contribución es la de la última evaluación guardada; un peso cambiado se aplica en la próxima evaluación.',
  };
}

// ── Pesos del usuario ────────────────────────────────────────────────────────

function ligasPesos(db: BD, padecimiento?: string) {
  const rows = todos(db, `SELECT v.*, u.peso AS u_peso, u.prior_de AS u_prior, u.modificado AS u_mod, u.modificado_por_usuario AS u_flag
    FROM padecimiento_variable v LEFT JOIN pesos_usuario u ON u.clave = 'liga|' || v.padecimiento_id || '|' || v.variable_id
    ${padecimiento ? 'WHERE v.padecimiento_id = ?' : ''} ORDER BY v.padecimiento_id, v.variable_id`, ...(padecimiento ? [padecimiento] : []));
  return rows.map((r) => {
    const mod = r.u_mod !== null && r.u_mod !== undefined && (r.u_peso !== null || r.u_prior !== null);
    return { padecimiento_id: r.padecimiento_id as string, variable_id: r.variable_id as string, variable: r.variable, direccion: r.direccion,
      nivel_evidencia: r.nivel_evidencia, fuente: r.fuente, lr_o_or: r.lr_o_or, medido_en_vuelo: r.medido_en_vuelo,
      peso_fuente: r.peso as number, prior_de_fuente: r.prior_de as number,
      peso_usuario: (r.u_peso ?? null) as number | null, prior_de_usuario: (r.u_prior ?? null) as number | null,
      peso_efectivo: (r.u_peso ?? r.peso) as number, prior_de_efectivo: (r.u_prior ?? r.prior_de) as number,
      modificado_por_usuario: mod, modificado: mod ? (r.u_mod as string) : null };
  });
}

const SOLO_LIGA = ['padecimiento_id', 'variable_id', 'variable', 'nivel_evidencia', 'fuente', 'peso_fuente', 'prior_de_fuente', 'peso_usuario',
  'prior_de_usuario', 'peso_efectivo', 'prior_de_efectivo', 'modificado_por_usuario', 'modificado'] as const;
function ligaPublica(db: BD, pid: string, vid: string) {
  const l = ligasPesos(db, pid).find((x) => x.variable_id === vid);
  if (!l) throw new ErrorSemaforo(404, `la liga ${pid}/${vid} no existe`);
  return Object.fromEntries(SOLO_LIGA.map((k) => [k, (l as Fila)[k]]));
}

const existePad = (db: BD, id: string) => !!uno(db, 'SELECT 1 AS x FROM padecimientos WHERE id = ?', id);

export function leerPesos(db: BD, padecimiento?: string) {
  if (padecimiento && !existePad(db, padecimiento)) throw new ErrorSemaforo(404, `padecimiento ${padecimiento} no existe`);
  return {
    aviso: AVISO, provisional: true, rango_peso: RANGO_PESO,
    ligas: ligasPesos(db, padecimiento).map((l) => Object.fromEntries(SOLO_LIGA.map((k) => [k, (l as Fila)[k]]))),
    umbrales: todos(db, `SELECT nombre, valor, modificado FROM pesos_usuario WHERE tipo = 'umbral' AND valor IS NOT NULL ORDER BY nombre`),
    umbrales_editables: UMBRALES_EDITABLES, nota: NOTA_PESOS,
  };
}

/** Número JSON finito (rechaza strings y booleanos aunque parezcan números). */
const esNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
const cadena = (x: unknown, campo: string): string => {
  if (typeof x !== 'string' || !x) throw new ErrorSemaforo(400, `${campo} debe ser texto no vacío`);
  return x;
};

export function guardarPeso(db: BD, c: unknown) {
  if (!c || typeof c !== 'object' || Array.isArray(c)) throw new ErrorSemaforo(400, 'el cuerpo debe ser un objeto JSON');
  const b = c as Fila;
  if ('umbral' in b) {
    const nombre = cadena(b.umbral, 'umbral');
    if (!UMBRALES_EDITABLES.includes(nombre)) throw new ErrorSemaforo(400, `umbral no editable: ${nombre} (editables: ${UMBRALES_EDITABLES.join(', ')})`);
    if (!esNum(b.valor) || b.valor <= 0) throw new ErrorSemaforo(400, 'valor debe ser un número finito mayor que 0');
    if (nombre === 'cobertura_min' && b.valor > 1) throw new ErrorSemaforo(400, 'cobertura_min debe ser ≤ 1');
    const mod = ahora();
    db.prepare(`INSERT INTO pesos_usuario (clave, tipo, nombre, valor, modificado_por_usuario, modificado) VALUES (?, 'umbral', ?, ?, 1, ?)
      ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor, nombre = excluded.nombre, modificado_por_usuario = 1, modificado = excluded.modificado`)
      .run(`umbral|${nombre}`, nombre, b.valor, mod);
    return { nombre, valor: b.valor, modificado: mod };
  }
  if (!('padecimiento_id' in b)) throw new ErrorSemaforo(400, 'cuerpo esperado: {padecimiento_id, variable_id, peso?, prior_de?} o {umbral, valor}');
  const pid = cadena(b.padecimiento_id, 'padecimiento_id'), vid = cadena(b.variable_id, 'variable_id');
  const hayPeso = b.peso !== undefined, hayPrior = b.prior_de !== undefined;
  if (!hayPeso && !hayPrior) throw new ErrorSemaforo(400, 'falta peso o prior_de');
  if (hayPeso && (!esNum(b.peso) || b.peso < RANGO_PESO[0] || b.peso > RANGO_PESO[1])) throw new ErrorSemaforo(400, `peso debe ser un número finito en [${RANGO_PESO[0]}, ${RANGO_PESO[1]}]`);
  if (hayPrior && (!esNum(b.prior_de) || b.prior_de <= 0)) throw new ErrorSemaforo(400, 'prior_de debe ser un número finito mayor que 0');
  if (!uno(db, 'SELECT 1 AS x FROM padecimiento_variable WHERE padecimiento_id = ? AND variable_id = ?', pid, vid)) throw new ErrorSemaforo(404, `la liga ${pid}/${vid} no existe`);
  db.prepare(`INSERT INTO pesos_usuario (clave, tipo, padecimiento_id, variable_id, peso, prior_de, modificado_por_usuario, modificado) VALUES (?, 'liga', ?, ?, ?, ?, 1, ?)
    ON CONFLICT(clave) DO UPDATE SET peso = COALESCE(?, peso), prior_de = COALESCE(?, prior_de), modificado_por_usuario = 1, modificado = excluded.modificado`)
    .run(`liga|${pid}|${vid}`, pid, vid, hayPeso ? b.peso : null, hayPrior ? b.prior_de : null, ahora(), hayPeso ? b.peso : null, hayPrior ? b.prior_de : null);
  return ligaPublica(db, pid, vid);
}

export function restaurarPesos(db: BD, c: unknown) {
  if (c === null || c === undefined) c = {};
  if (typeof c !== 'object' || Array.isArray(c)) throw new ErrorSemaforo(400, 'el cuerpo debe ser un objeto JSON');
  const b = c as Fila;
  const borrar = (sql: string, ...a: string[]) => Number(db.prepare(sql).run(...a).changes);
  if (b.umbral !== undefined) {
    const nombre = cadena(b.umbral, 'umbral');
    return { restaurados: borrar(`DELETE FROM pesos_usuario WHERE clave = ?`, `umbral|${nombre}`), umbral: nombre };
  }
  if (b.padecimiento_id !== undefined) {
    const pid = cadena(b.padecimiento_id, 'padecimiento_id');
    if (!existePad(db, pid)) throw new ErrorSemaforo(404, `padecimiento ${pid} no existe`);
    if (b.variable_id !== undefined) {
      const vid = cadena(b.variable_id, 'variable_id');
      if (!uno(db, 'SELECT 1 AS x FROM padecimiento_variable WHERE padecimiento_id = ? AND variable_id = ?', pid, vid)) throw new ErrorSemaforo(404, `la liga ${pid}/${vid} no existe`);
      const n = borrar(`DELETE FROM pesos_usuario WHERE clave = ?`, `liga|${pid}|${vid}`);
      return { restaurados: n, padecimiento_id: pid, variable_id: vid, liga: ligaPublica(db, pid, vid) };
    }
    return { restaurados: borrar(`DELETE FROM pesos_usuario WHERE tipo = 'liga' AND padecimiento_id = ?`, pid), padecimiento_id: pid };
  }
  if (Object.keys(b).length) throw new ErrorSemaforo(400, 'cuerpo esperado: {}, {padecimiento_id[, variable_id]} o {umbral}');
  return { restaurados: borrar('DELETE FROM pesos_usuario'), todo: true };
}

// ── Motor Python ─────────────────────────────────────────────────────────────

let corriendo = false;

export interface SalidaMotor { canal: 'real' | 'SIMULADO'; filas_escritas: number; salida: string; avisos: string[]; comando: string }

/** Corre `python3 -m motor.evadb --evaluar` sobre la BD en archivo. No bloquea el servidor. */
export function correrMotor(ruta: string, simulado: boolean, opc: { python?: { cmd: string; args: string[] }; cwd?: string; origenSimulador?: boolean } = {}): Promise<SalidaMotor> {
  if (!ruta) return Promise.reject(new ErrorSemaforo(409, 'La BD está en memoria: hace falta eva.db en archivo para que el motor Python la lea.'));
  if (corriendo) return Promise.reject(new ErrorSemaforo(409, 'Ya hay una evaluación en curso.'));
  const py = opc.python?.cmd ?? process.env.PYTHON ?? (process.platform === 'win32' ? 'python' : 'python3');
  const origenSim = opc.origenSimulador === true && !simulado;
  const args = [...(opc.python?.args ?? []), '-m', 'motor.evadb', '--evaluar', ...(simulado ? ['--simulado'] : []), ...(origenSim ? ['--origen-simulador'] : []), '--db', ruta];
  const comando = `cd prototipo-salud && EVA_DB=${ruta} ${py} ${args.join(' ')}`;
  corriendo = true;
  return new Promise((ok, mal) => {
    execFile(py, args, { cwd: opc.cwd ?? dirPrototipo(), env: { ...process.env, EVA_DB: ruta }, timeout: 120_000, maxBuffer: 10_000_000 }, (err, stdout, stderr) => {
      corriendo = false;
      const lineas = (t: string) => t.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      const e = err as (NodeJS.ErrnoException & { killed?: boolean }) | null;
      if (e?.code === 'ENOENT') return mal(new ErrorSemaforo(503, `${py} no encontrado: instale Python 3 o ejecute a mano: ${comando}`));
      if (e) {
        const util = lineas(stderr).at(-1) ?? lineas(stdout).at(-1) ?? e.message;
        return mal(new ErrorSemaforo(502, e.killed ? 'El motor superó el tiempo límite (120 s).' : `El motor terminó con error: ${util}`));
      }
      const salida = stdout.trim();
      const m = /Filas escritas en evaluaciones:\s*(\d+)\s*\(canal\s*(real|SIMULADO)\)/.exec(salida);
      ok({ canal: m ? (m[2] as 'real' | 'SIMULADO') : simulado || origenSim ? 'SIMULADO' : 'real', filas_escritas: m ? Number(m[1]) : 0, salida, avisos: lineas(stderr).slice(0, 40), comando });
    });
  });
}
