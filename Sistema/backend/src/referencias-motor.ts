/** Valor normal por variable tal como lo guardó el motor Python en su última evaluación (no se calcula aquí). */
import type { BD } from './db.ts';
import { AVISO, ErrorSemaforo } from './semaforo.ts';

type Obj = Record<string, any>;
const TIPOS = ['poblacional', 'base personal prevuelo', 'sin referencia'];
const NOTA = 'Rango normal del motor (prototipo-salud): poblacional con fuente si existe; si no, base personal prevuelo. Provisional; no es un diagnóstico.';
const M_SIN_EVAL = 'sin evaluación guardada del motor para este tripulante';
const M_ANTIGUO = 'la última evaluación se guardó sin referencias (motor anterior); vuelve a evaluar';
const M_NO_VAR = 'el motor no evaluó esta variable en su última evaluación';

const detalleDe = (t: unknown): Obj => { try { const d = JSON.parse(String(t)); return d && typeof d === 'object' && !Array.isArray(d) ? d : {}; } catch { return {}; } };
const esObj = (x: unknown): x is Obj => !!x && typeof x === 'object' && !Array.isArray(x);

function vacia(variable_id: string, motivo: string, simulado: boolean, variable: string | null = null): Obj {
  return { variable_id, variable, tipo: 'sin referencia', rango: null, centro: null, unidad: null, fuente: null, fuente_corta: 'sin referencia',
    calculo: null, poblacional: null, personal: null, z_pob: null, z_personal: null, z_act: null, origen_z: null, cusum: null,
    motivo, simulado, provisional: true };
}

export function referenciasMotor(db: BD, tripulante: string | null | undefined, variable?: string | null) {
  if (!tripulante) throw new ErrorSemaforo(400, 'falta el parámetro tripulante');
  const existe = db.prepare('SELECT 1 AS x FROM tripulantes WHERE id = ?').get(tripulante)
    ?? db.prepare('SELECT 1 AS x FROM evaluaciones WHERE tripulante = ? LIMIT 1').get(tripulante);
  if (!existe) throw new ErrorSemaforo(404, `tripulante ${tripulante} no existe`);

  const filas = db.prepare(`SELECT * FROM evaluaciones WHERE tripulante = ?
    AND hora = (SELECT MAX(hora) FROM evaluaciones WHERE tripulante = ?) ORDER BY id`).all(tripulante, tripulante) as Obj[];
  const simulado = filas.length > 0 && filas[0].canal === 'SIMULADO';
  const base = { aviso: AVISO, provisional: true, tripulante, simulado, etiqueta: simulado ? 'SIMULADO' : null, nota: NOTA };

  let evaluacion: Obj | null = null;
  const vistas = new Map<string, Obj>();
  if (filas.length) {
    const d0 = detalleDe(filas[0].detalle);
    evaluacion = { hora: filas[0].hora, canal: filas[0].canal, simulado, fase: d0.fase ?? null, fecha_evaluacion: d0.fecha_evaluacion ?? null };
    for (const f of filas) {
      const d = detalleDe(f.detalle);
      if (!esObj(d.referencias)) continue;
      const sim = f.canal === 'SIMULADO';
      const nombres = new Map<string, string>();
      if (Array.isArray(d.ligas)) for (const l of d.ligas) if (esObj(l) && l.variable_id != null && typeof l.variable === 'string') nombres.set(String(l.variable_id), l.variable);
      for (const [vid, r] of Object.entries(d.referencias)) {
        const id = esObj(r) && r.variable_id != null ? String(r.variable_id) : vid;
        if (!esObj(r) || vistas.has(id)) continue;
        const tipo = TIPOS.includes(r.tipo) ? r.tipo : 'sin referencia';
        vistas.set(id, { ...r, variable_id: id, tipo, variable: nombres.get(id) ?? null, simulado: sim });
      }
    }
  }
  let motivo: string | null = !filas.length ? M_SIN_EVAL : vistas.size === 0 ? M_ANTIGUO : null;
  let referencias = [...vistas.values()].sort((a, b) => (a.variable_id < b.variable_id ? -1 : a.variable_id > b.variable_id ? 1 : 0));
  if (variable) {
    const r = vistas.get(variable);
    referencias = [r ?? vacia(variable, filas.length ? (vistas.size ? M_NO_VAR : M_ANTIGUO) : M_SIN_EVAL, simulado)];
  }
  return { ...base, evaluacion, referencias, motivo };
}
