/**
 * Semillas: configuración inicial e importación de datos de Leo e Iker.
 *
 * ⚠️ PROVISIONAL. Las variables, priores y basales de aquí son un punto de partida
 * para que el sistema arranque. Las definitivas las entregan Leo e Iker con su
 * selección de variables no invasivas y viables.
 */
import { readFileSync } from 'node:fs';
import { ahora, json, type BD } from './db.ts';
import { ENTORNOS, type Prior } from './lunna.ts';
import { validarEsquema, type Esquema } from './esquema.ts';

interface Inicial {
  variables: Array<{ id: string; nombre: string; descripcion?: string; unidad: string;
                     tipo_umbral?: string; procedencia: string }>;
  esquemas: Esquema[];
  dispositivos: Array<{ id: number; clave: string; nombre: string; tipo: string; perfil: string; esquema_id?: number }>;
  tripulantes: Array<{ id: string; nombre: string; rol?: string; sexo: string; edad: number;
                       peso_kg: number; altura_m: number; sangre?: string;
                       basales: Record<string, number>;
                       historial?: Array<{ mision: string; entorno: string; variable: string; delta: number; escala: string }> }>;
  priores_orbita: Array<Omit<Prior, 'entorno' | 'extrapolado'>>;
}

/** Deriva los priores de los demás entornos desde órbita, marcados como extrapolados. */
function expandirPriores(base: Inicial['priores_orbita']): Prior[] {
  const out: Prior[] = [];
  for (const p of base) {
    for (const e of ENTORNOS) {
      if (e === 'tierra') {
        out.push({ ...p, entorno: e, mu0: 0, tau0: p.sigma_dia, extrapolado: false,
                   fuente: 'Tierra: el basal es la referencia', notas: undefined });
      } else if (e === 'orbita') {
        out.push({ ...p, entorno: e, extrapolado: false });
      } else {
        const factor = e === 'transito' ? 1.5 : 2;
        out.push({ ...p, entorno: e, tau0: p.tau0 * factor, extrapolado: true,
                   notas: `Sin datos humanos en ${e}: extrapolado desde órbita con τ₀ ×${factor}. ${p.notas ?? ''}`.trim() });
      }
    }
  }
  return out;
}

export function cargarInicial(db: BD, ruta: string): void {
  const hay = db.prepare(`SELECT COUNT(*) AS n FROM variables`).get() as { n: number };
  if (hay.n > 0) return;
  const d = JSON.parse(readFileSync(ruta, 'utf8')) as Inicial;
  const t = ahora();

  for (const v of d.variables) {
    db.prepare(`INSERT INTO variables VALUES (?,?,?,?,?,?,?)`)
      .run(v.id, v.nombre, v.descripcion ?? null, v.unidad, v.tipo_umbral ?? null, v.procedencia, t);
  }
  for (const e of d.esquemas) {
    const errores = validarEsquema(e);
    if (errores.length) throw new Error(`esquema ${e.nombre}: ${errores.join('; ')}`);
    db.prepare(`INSERT INTO esquemas VALUES (?,?,?,?,?)`).run(e.id, e.nombre, e.version, json(e.campos), t);
  }
  for (const x of d.dispositivos) {
    db.prepare(`INSERT INTO dispositivos VALUES (?,?,?,?,?,?,?)`)
      .run(x.id, x.clave, x.nombre, x.tipo, x.perfil, x.esquema_id ?? null, t);
  }
  for (const c of d.tripulantes) {
    db.prepare(`INSERT INTO tripulantes VALUES (?,?,?,?,?,?,?,?)`)
      .run(c.id, c.nombre, c.rol ?? null, c.sexo, c.edad, c.peso_kg, c.altura_m, c.sangre ?? null);
    for (const [v, val] of Object.entries(c.basales)) {
      db.prepare(`INSERT INTO basales VALUES (?,?,?)`).run(c.id, v, val);
    }
    for (const h of c.historial ?? []) {
      db.prepare(`INSERT INTO historial (tripulante, mision, entorno, variable, delta, escala) VALUES (?,?,?,?,?,?)`)
        .run(c.id, h.mision, h.entorno, h.variable, h.delta, h.escala);
    }
  }
  for (const p of expandirPriores(d.priores_orbita)) {
    db.prepare(`INSERT INTO priores VALUES (?,?,?)`).run(p.variable, p.entorno, json(p));
  }
}

// ─── importación del contrato de Leo (Planeacion/Leo/ingesta/src/contrato.ts) ──

interface Lectura {
  id: string; nombre: string; valor: number | string | boolean | null; unidad: string; timestamp: string;
  naturaleza_dato: 'directa' | 'calculada' | 'inferida' | 'input_manual';
  origen_dato: string; fuente_referencia: string;
  validacion_umbral: 'NASA_A' | 'CLINICO_T' | 'SIN_UMBRAL';
}
export interface SalidaTipo { generado: string; tipo: string; sujetos: Array<{ sujeto: string; lecturas: Lectura[] }> }

const PROCEDENCIA = { directa: 'sensor', calculada: 'derived', inferida: 'estimated', input_manual: 'manual' } as const;
const UMBRAL = { NASA_A: 'A', CLINICO_T: 'T', SIN_UMBRAL: null } as const;

/** Importa una salida de Leo tal cual: registra variables y sujetos que falten. */
export function importarSemillas(db: BD, s: SalidaTipo): { muestras: number; variables_nuevas: number; omitidas: number } {
  let muestras = 0, nuevas = 0, omitidas = 0;
  const t = ahora();
  for (const { sujeto, lecturas } of s.sujetos) {
    db.prepare(`INSERT OR IGNORE INTO tripulantes (id, nombre) VALUES (?, ?)`).run(sujeto, sujeto);
    for (const l of lecturas) {
      if (typeof l.valor !== 'number') { omitidas++; continue; }   // el motor sólo evalúa numéricos
      const proc = PROCEDENCIA[l.naturaleza_dato];
      const r = db.prepare(`INSERT OR IGNORE INTO variables VALUES (?,?,?,?,?,?,?)`)
        .run(l.id, l.nombre, null, l.unidad, UMBRAL[l.validacion_umbral], proc, t);
      nuevas += Number(r.changes);
      const ins = db.prepare(
        `INSERT OR IGNORE INTO muestras (tripulante, variable, valor, unidad, procedencia, metodo,
           t_scet, t_recibida, dispositivo, seq, entorno)
         VALUES (?,?,?,?,?,?,?,?,-1,0,'tierra')`,
      ).run(sujeto, l.id, l.valor, l.unidad, proc, `semilla:${l.origen_dato}:${l.fuente_referencia}`,
            new Date(l.timestamp).toISOString(), t);
      muestras += Number(ins.changes);
    }
  }
  return { muestras, variables_nuevas: nuevas, omitidas };
}
