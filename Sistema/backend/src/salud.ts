/**
 * Modelo de padecimientos en la base: tablas con fuente (semilla desde los CSV del prototipo),
 * lo que el usuario cambió a mano (pesos_usuario) y el historial de evaluaciones.
 * Nada aquí es un diagnóstico. El motor Python lee y escribe estas mismas tablas.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { BD } from './db.ts';

const AQUI = dirname(fileURLToPath(import.meta.url));

export const RUTA_MODELO_DEFECTO =
  process.env.MODELO_SALUD ?? join(AQUI, '..', '..', '..', 'prototipo-salud', 'datos', 'modelo');

export const ESQUEMA_SALUD = `
CREATE TABLE IF NOT EXISTS padecimientos (
  id TEXT PRIMARY KEY, nombre TEXT NOT NULL, riesgo_nasa TEXT, descripcion TEXT, prevalencia TEXT, fuente_prevalencia TEXT);

CREATE TABLE IF NOT EXISTS padecimiento_variable (
  padecimiento_id TEXT NOT NULL REFERENCES padecimientos(id),
  variable_id TEXT NOT NULL,                 -- '04:A4' (sin FK a variables: puede no estar registrada)
  variable TEXT, peso REAL, direccion TEXT, lr_o_or TEXT, nivel_evidencia TEXT, fuente TEXT,
  prior_media REAL, prior_de REAL, medido_en_vuelo TEXT, "precision" TEXT,
  PRIMARY KEY (padecimiento_id, variable_id));

-- Sustituye overrides.json: lo que el usuario cambió a mano, sin fuente.
CREATE TABLE IF NOT EXISTS pesos_usuario (
  clave TEXT PRIMARY KEY,                    -- 'liga|P07|03:V82' · 'umbral|T_amarillo'
  tipo TEXT NOT NULL CHECK (tipo IN ('liga','umbral')),
  padecimiento_id TEXT, variable_id TEXT, nombre TEXT,
  peso REAL, prior_de REAL, valor REAL,
  modificado_por_usuario INTEGER NOT NULL DEFAULT 1,
  modificado TEXT NOT NULL);                 -- fecha ISO de la edición

CREATE TABLE IF NOT EXISTS evaluaciones (
  id INTEGER PRIMARY KEY,
  tripulante TEXT NOT NULL, padecimiento_id TEXT NOT NULL,
  color TEXT NOT NULL CHECK (color IN ('VERDE','AMARILLO','ROJO','GRIS')),
  hora TEXT NOT NULL,                        -- ISO UTC: cuándo se evaluó
  canal TEXT NOT NULL DEFAULT 'real' CHECK (canal IN ('real','SIMULADO')),
  detalle TEXT NOT NULL);                    -- JSON
CREATE INDEX IF NOT EXISTS ix_evaluaciones ON evaluaciones (tripulante, padecimiento_id, hora);
`;

export function migrarSalud(db: BD): void {
  db.exec(ESQUEMA_SALUD);
}

export interface CargaSalud { dir: string; padecimientos: number; vinculos: number; ausente?: boolean; error?: string }

/** CSV RFC 4180 mínimo: comillas, "" escapada, comas y saltos de línea entre comillas, BOM, CRLF. */
export function parsearCsv(texto: string): string[][] {
  if (texto.charCodeAt(0) === 0xfeff) texto = texto.slice(1);
  const filas: string[][] = [];
  let fila: string[] = [];
  let campo = '';
  let comillas = false;
  let hayCampo = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (comillas) {
      if (c === '"') {
        if (texto[i + 1] === '"') { campo += '"'; i++; } else comillas = false;
      } else campo += c;
    } else if (c === '"' && campo === '') { comillas = true; hayCampo = true; }
    else if (c === ',') { fila.push(campo); campo = ''; hayCampo = true; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && texto[i + 1] === '\n') i++;
      if (hayCampo || campo !== '') { fila.push(campo); filas.push(fila); }
      fila = []; campo = ''; hayCampo = false;
    } else { campo += c; hayCampo = true; }
  }
  if (comillas) throw new Error('CSV con comillas sin cerrar');
  if (hayCampo || campo !== '') { fila.push(campo); filas.push(fila); }
  return filas;
}

/** Filas como objetos por nombre de columna; valida que estén las columnas y el ancho. */
function leerTabla(ruta: string, columnas: string[]): Array<Record<string, string>> {
  const filas = parsearCsv(readFileSync(ruta, 'utf8'));
  const cab = filas.shift();
  if (!cab) throw new Error(`${ruta}: vacío`);
  for (const c of columnas) if (!cab.includes(c)) throw new Error(`${ruta}: falta la columna ${c}`);
  return filas.map((f, n) => {
    if (f.length !== cab.length) throw new Error(`${ruta}: fila ${n + 2} con ${f.length} campos (se esperaban ${cab.length})`);
    return Object.fromEntries(cab.map((c, i) => [c, f[i]]));
  });
}

const txt = (s: string | undefined): string | null => (s === undefined || s.trim() === '' ? null : s);
function num(s: string | undefined): number | null {
  if (s === undefined || s.trim() === '') return null;
  const n = Number(s);
  if (!Number.isFinite(n)) throw new Error(`número inválido: ${s}`);
  return n;
}

/** Refresca padecimientos y vínculos desde los CSV. Idempotente. No toca pesos_usuario ni evaluaciones. */
export function sembrarSalud(db: BD, dir = RUTA_MODELO_DEFECTO): CargaSalud {
  const fPad = join(dir, 'PADECIMIENTOS.csv');
  const fVin = join(dir, 'PADECIMIENTO-VARIABLE.csv');
  const res: CargaSalud = { dir, padecimientos: 0, vinculos: 0 };
  if (!existsSync(fPad) || !existsSync(fVin)) return { ...res, ausente: true };
  migrarSalud(db);
  try {
    const pads = leerTabla(fPad, ['padecimiento_id', 'padecimiento', 'riesgo_nasa', 'descripcion', 'prevalencia', 'fuente_prevalencia']);
    const vins = leerTabla(fVin, ['padecimiento_id', 'variable_id', 'variable', 'peso', 'direccion', 'lr_o_or', 'nivel_evidencia',
      'fuente', 'prior_media', 'prior_de', 'medido_en_vuelo', 'precision']);
    const insP = db.prepare(`INSERT INTO padecimientos (id, nombre, riesgo_nasa, descripcion, prevalencia, fuente_prevalencia)
      VALUES (?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET nombre=excluded.nombre, riesgo_nasa=excluded.riesgo_nasa,
      descripcion=excluded.descripcion, prevalencia=excluded.prevalencia, fuente_prevalencia=excluded.fuente_prevalencia`);
    const insV = db.prepare(`INSERT INTO padecimiento_variable (padecimiento_id, variable_id, variable, peso, direccion, lr_o_or,
      nivel_evidencia, fuente, prior_media, prior_de, medido_en_vuelo, "precision") VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
      ON CONFLICT(padecimiento_id, variable_id) DO UPDATE SET variable=excluded.variable, peso=excluded.peso,
      direccion=excluded.direccion, lr_o_or=excluded.lr_o_or, nivel_evidencia=excluded.nivel_evidencia, fuente=excluded.fuente,
      prior_media=excluded.prior_media, prior_de=excluded.prior_de, medido_en_vuelo=excluded.medido_en_vuelo,
      "precision"=excluded."precision"`);
    db.exec('BEGIN');
    try {
      for (const r of pads) {
        insP.run(r.padecimiento_id, r.padecimiento, txt(r.riesgo_nasa), txt(r.descripcion), txt(r.prevalencia), txt(r.fuente_prevalencia));
      }
      for (const r of vins) {
        insV.run(r.padecimiento_id, r.variable_id, txt(r.variable), num(r.peso), txt(r.direccion), txt(r.lr_o_or),
          txt(r.nivel_evidencia), txt(r.fuente), num(r.prior_media), num(r.prior_de), txt(r.medido_en_vuelo), txt(r.precision));
      }
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
  } catch (e) {
    return { ...res, error: e instanceof Error ? e.message : String(e) };
  }
  const n = (t: string) => (db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get() as { n: number }).n;
  return { dir, padecimientos: n('padecimientos'), vinculos: n('padecimiento_variable') };
}
