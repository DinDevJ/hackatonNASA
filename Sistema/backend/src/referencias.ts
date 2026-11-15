/**
 * Referencias clínicas: lo que la medicina dice de cada variable, igual para todos.
 *
 * LUNNA compara a cada persona con SU normal. Esto es lo otro: límites absolutos
 * (una SpO2 de 88 % es grave aunque fuera "lo normal para ti"). Los datos llegan de
 * `semillas/medibles.json` y se guardan tal cual en la tabla `referencias`.
 *
 * Aquí NO hay ningún umbral escrito a mano: todos salen de esa tabla.
 */
import { existsSync, readFileSync } from 'node:fs';
import { deJson, json, type BD } from './db.ts';

export type Estado = 'verde' | 'ambar' | 'rojo';

/** `null` en un lado = ese lado no aplica. */
export interface Limites { min: number | null; max: number | null }

export interface Umbral {
  /** 'A' validado en astronautas · 'T' clínico terrestre. */
  tipo: 'A' | 'T';
  fuente: string;
  url: string | null;
  ambar: Limites | null;
  rojo: Limites | null;
  nota?: string;
}

/** Una variable de `medibles.json`. Sólo `id` es obligatorio; lo demás se conserva tal cual. */
export interface Referencia {
  id: string;
  clave?: string;
  nombre?: string;
  unidad?: string;
  medido_en_vuelo?: string;
  equipo_a_bordo?: string | null;
  como_se_mide_aqui?: string | null;
  umbral?: Umbral | null;
  cambio_en_vuelo?: unknown;
  padecimientos?: unknown[];
  trazas?: string[];
  [otro: string]: unknown;
}

/** Clave corta de cada variable cuando la referencia no la trae. */
export const CLAVES: Record<string, string> = {
  '04:A4': 'fc', '04:A3': 'spo2', '04:A2': 'fr', '04:A1': 'temp',
  '01:V1': 'pa_sis', 'X:PAD': 'pa_dia', 'X:PAM': 'pa_media',
};

const ORDEN: Record<Estado, number> = { verde: 0, ambar: 1, rojo: 2 };
/** El peor de dos estados: verde < ambar < rojo. */
export const peor = (a: Estado, b: Estado): Estado => (ORDEN[a] >= ORDEN[b] ? a : b);

export interface ResultadoUmbral {
  estado: Estado;
  /** El límite que se cruzó (`null` si está dentro). */
  limite: number | null;
  lado: 'min' | 'max' | null;
}

const num = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);

/** valor < min o > max del rojo → rojo; del ámbar → ámbar; si no, verde. */
export function evaluarUmbral(valor: number, u: Umbral): ResultadoUmbral {
  for (const estado of ['rojo', 'ambar'] as const) {
    const l = u[estado];
    if (!l) continue;
    if (num(l.min) && valor < l.min) return { estado, limite: l.min, lado: 'min' };
    if (num(l.max) && valor > l.max) return { estado, limite: l.max, lado: 'max' };
  }
  return { estado: 'verde', limite: null, lado: null };
}

/** ¿Tiene al menos un límite utilizable? */
export function umbralUtil(u: Umbral | null | undefined): u is Umbral {
  if (!u || typeof u !== 'object') return false;
  return [u.ambar, u.rojo].some((l) => !!l && (num(l.min) || num(l.max)));
}

// ─── tabla y caché ───────────────────────────────────────────────────────────

/** `vigilar` consulta esto por cada muestra: se lee de la base una vez y se recuerda. */
let cache = new WeakMap<BD, Map<string, Referencia>>();

/** Olvida lo recordado: la próxima consulta vuelve a leer la tabla. */
export function invalidarReferencias(db?: BD): void {
  if (db) cache.delete(db); else cache = new WeakMap();
}

export function referencias(db: BD): Map<string, Referencia> {
  let m = cache.get(db);
  if (!m) {
    m = new Map();
    const filas = db.prepare(`SELECT variable, datos FROM referencias ORDER BY variable`).all() as Array<{ variable: string; datos: string }>;
    for (const f of filas) {
      try { m.set(f.variable, deJson<Referencia>(f.datos)); } catch { /* fila ilegible: se ignora */ }
    }
    cache.set(db, m);
  }
  return m;
}

export const referenciaDe = (db: BD, variable: string): Referencia | null => referencias(db).get(variable) ?? null;

/**
 * Guarda referencias con INSERT OR REPLACE: es dato de referencia, no lo edita el
 * equipo, así que la versión nueva pisa a la vieja. Las entradas sin `id` se omiten.
 */
export function guardarReferencias(db: BD, lista: unknown[]): { cargadas: number; omitidas: number } {
  let cargadas = 0, omitidas = 0;
  const ins = db.prepare(`INSERT OR REPLACE INTO referencias (variable, datos) VALUES (?, ?)`);
  db.exec('BEGIN');
  try {
    for (const r of lista) {
      const id = (r as Referencia | null)?.id;
      if (!r || typeof r !== 'object' || typeof id !== 'string' || !id) { omitidas++; continue; }
      ins.run(id, json(r));
      cargadas++;
    }
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  } finally {
    invalidarReferencias(db);
  }
  return { cargadas, omitidas };
}

export interface CargaReferencias {
  cargadas: number;
  omitidas: number;
  /** Cuántas de las cargadas traen un umbral utilizable. */
  con_umbral: number;
  /** El archivo no existe: no es un error, se sigue con lo que ya hubiera en la base. */
  ausente: boolean;
  /** El archivo existe pero no sirve (JSON inválido o sin `variables`). No se cargó nada. */
  error: string | null;
}

/** Carga `medibles.json`. Nunca lanza: si falta o está mal, lo dice y se sigue. */
export function cargarReferencias(db: BD, ruta: string): CargaReferencias {
  const res: CargaReferencias = { cargadas: 0, omitidas: 0, con_umbral: 0, ausente: false, error: null };
  if (!existsSync(ruta)) { res.ausente = true; return res; }
  try {
    const d = JSON.parse(readFileSync(ruta, 'utf8')) as { variables?: unknown };
    if (!d || !Array.isArray(d.variables)) throw new Error('falta la lista "variables"');
    const r = guardarReferencias(db, d.variables);
    res.cargadas = r.cargadas;
    res.omitidas = r.omitidas;
    res.con_umbral = (d.variables as Referencia[]).filter((x) => typeof x?.id === 'string' && !!x.id && umbralUtil(x.umbral)).length;
  } catch (e) {
    res.error = (e as Error).message;
  }
  return res;
}
