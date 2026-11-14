/**
 * Trama base de telemetría de salud.
 *
 * El software NO habla con relojes: habla con esta trama. Cualquier origen —reloj,
 * brazalete, traje con sensores, telemetría del hábitat, entrada manual o un
 * generador sintético— produce tramas iguales, y el motor consume siempre lo mismo.
 *
 * Tres cosas van dentro de la trama por diseño, no como añadido:
 *
 *   1. CUÁNDO OCURRIÓ, no cuándo llegó.  `t_scet` es obligatorio; `t_ert` lo rellena
 *      Tierra al recibir. Ordenar por `t_ert` produce una historia clínica falsa.
 *   2. DE DÓNDE SALE CADA VALOR.  `origin` distingue lo medido de lo estimado. Un
 *      número estimado no se pinta igual que uno medido.
 *   3. CUÁNTO VALE.  `quality` viaja con el valor. Una lectura con la correa floja
 *      se guarda marcada, no se descarta en silencio ni se usa como si fuera buena.
 */

/** Versión de la trama. Cambia si se rompe la compatibilidad. */
export const VERSION_TRAMA = 'eva.telemetry.v1';
export const VERSION_CAPACIDADES = 'eva.capabilities.v1';

/** De dónde sale físicamente el dato. */
export type TipoOrigen =
  | 'wrist'     // reloj o pulsera
  | 'chest'     // banda pectoral o parche
  | 'suit'      // traje instrumentado
  | 'habitat'   // sensores de la nave
  | 'dosimeter' // dosímetro personal
  | 'manual'    // lo teclea una persona
  | 'synthetic'; // generador, para pruebas y demo

/** Cómo se obtuvo el valor. Determina cómo se muestra. */
export type Procedencia =
  | 'sensor'     // medido directamente
  | 'derived'    // calculado por nosotros a partir de otras muestras
  | 'estimated'  // inferido por un modelo: SIEMPRE lleva incertidumbre
  | 'manual'     // reportado por una persona
  | 'telemetry'; // informado por la nave

/** Qué tan fiable es esta muestra concreta. */
export interface Calidad {
  /** Contacto del sensor con la piel. `null` si el dispositivo no lo reporta. */
  contacto?: boolean | null;
  /** Intervalo de confianza al 95 %, para valores `estimated`. */
  ic95?: [number, number];
  /** Ventanas descartadas por el estimador, si aplica. */
  descartadas?: number;
  /** Avisos legibles: 'movimiento', 'senal_debil', 'fuera_de_rango'… */
  avisos?: string[];
}

/** Una medición. */
export interface Muestra {
  /**
   * Identificador del catálogo, con su archivo de origen: `04:A4`, `01:V3`.
   * Nunca un nombre libre: ata la muestra a una definición escrita.
   */
  var: string;
  /** `null` significa "se intentó y no hay dato". Distinto de omitir la muestra. */
  value: number | string | null;
  unit: string;
  origin: Procedencia;
  quality?: Calidad;
  /**
   * Cómo se calculó, cuando importa. La HRV no significa lo mismo si es RMSSD o
   * SDNN, y los fabricantes no coinciden. Sin esto los datos no son comparables.
   */
  method?: string;
  /** Umbral aplicado: `[A]` validado en astronautas, `[T]` clínico terrestre. */
  tipo_umbral?: 'A' | 'T' | null;
}

/** Quién produjo la trama. */
export interface Fuente {
  id: string;
  kind: TipoOrigen;
  make?: string;
  model?: string;
  fw?: string;
  /** Reloj crudo del dispositivo. Deriva; se conserva para poder corregirlo. */
  sclk?: string;
}

/** La trama. */
export interface TramaTelemetria {
  frame: typeof VERSION_TRAMA;
  source: Fuente;
  /** Tripulante. Los datos nunca se mezclan entre personas. */
  subject: string;
  /** Cuándo ocurrió a bordo, en UTC. Obligatorio. */
  t_scet: string;
  /** Cuándo lo recibió Tierra. `null` a bordo: la nave no sabe cuándo llegará. */
  t_ert?: string | null;
  /** Retraso aplicado, en segundos. Lo rellena Tierra. */
  owlt_s?: number | null;
  /** Secuencia por fuente. Permite detectar huecos. */
  seq: number;
  samples: Muestra[];
}

/** Lo que un dispositivo declara que sabe entregar. */
export interface Capacidad {
  var: string;
  unit: string;
  origin: Procedencia;
  /** Frecuencia nominal en Hz. `null` si es esporádico. */
  rate_hz?: number | null;
  method?: string;
}

export interface TramaCapacidades {
  frame: typeof VERSION_CAPACIDADES;
  source: Fuente;
  provides: Capacidad[];
}

/**
 * Cualquier origen implementa esto. El motor no sabe si detrás hay un reloj, un
 * traje o un generador.
 */
export interface FuenteTelemetria {
  /** Qué sabe entregar. La interfaz se adapta a esto en vez de suponer. */
  capacidades(): Promise<TramaCapacidades>;
  /** Se suscribe a las tramas. Devuelve la función para desuscribir. */
  alRecibir(cb: (t: TramaTelemetria) => void): () => void;
  iniciar(): Promise<void>;
  detener(): void;
}

/** Problema encontrado al validar. */
export interface Problema {
  campo: string;
  motivo: string;
}

/**
 * Valida una trama antes de aceptarla.
 *
 * Se aplica a TODO lo que entra, venga de donde venga. Una trama inválida se
 * registra y se descarta: nunca se deja pasar "a ver si funciona".
 */
export function validarTrama(t: unknown): { ok: boolean; problemas: Problema[] } {
  const p: Problema[] = [];
  const o = t as Partial<TramaTelemetria> | null;

  if (!o || typeof o !== 'object') return { ok: false, problemas: [{ campo: '(raíz)', motivo: 'no es un objeto' }] };
  if (o.frame !== VERSION_TRAMA) p.push({ campo: 'frame', motivo: `se esperaba ${VERSION_TRAMA}` });
  if (!o.subject) p.push({ campo: 'subject', motivo: 'falta el tripulante' });
  if (!o.source?.id || !o.source?.kind) p.push({ campo: 'source', motivo: 'falta id o kind' });
  if (typeof o.seq !== 'number') p.push({ campo: 'seq', motivo: 'falta la secuencia' });

  if (!o.t_scet) {
    p.push({ campo: 't_scet', motivo: 'obligatorio: es cuándo OCURRIÓ' });
  } else if (Number.isNaN(Date.parse(o.t_scet))) {
    p.push({ campo: 't_scet', motivo: 'no es una fecha válida' });
  }

  if (!Array.isArray(o.samples)) {
    p.push({ campo: 'samples', motivo: 'debe ser una lista' });
  } else {
    o.samples.forEach((m, i) => {
      if (!m.var?.includes(':')) {
        p.push({ campo: `samples[${i}].var`, motivo: 'debe llevar su catálogo, p. ej. 04:A4' });
      }
      if (!m.unit) p.push({ campo: `samples[${i}].unit`, motivo: 'falta la unidad' });
      if (!m.origin) p.push({ campo: `samples[${i}].origin`, motivo: 'falta la procedencia' });
      if (m.origin === 'estimated' && !m.quality?.ic95 && !m.method) {
        p.push({
          campo: `samples[${i}]`,
          motivo: 'un valor estimado necesita ic95 o method: no se muestra sin su incertidumbre',
        });
      }
    });
  }
  return { ok: p.length === 0, problemas: p };
}

/** Ordena por cuándo ocurrió, nunca por cuándo llegó. */
export function ordenarPorSCET(tramas: TramaTelemetria[]): TramaTelemetria[] {
  return [...tramas].sort((a, b) => Date.parse(a.t_scet) - Date.parse(b.t_scet));
}

/** Antigüedad de una trama en minutos. Va siempre visible en las pantallas de Tierra. */
export function antiguedadMin(t: TramaTelemetria, ahora: Date = new Date()): number {
  return (ahora.getTime() - Date.parse(t.t_scet)) / 60000;
}

/** Quita tramas repetidas por reenvío. Conserva la primera de cada (fuente, seq). */
export function deduplicar(tramas: TramaTelemetria[]): TramaTelemetria[] {
  const vistas = new Set<string>();
  const out: TramaTelemetria[] = [];
  for (const t of tramas) {
    const k = `${t.source.id}#${t.seq}`;
    if (!vistas.has(k)) {
      vistas.add(k);
      out.push(t);
    }
  }
  return out;
}

/** Saca todas las muestras de una variable, ordenadas por cuándo ocurrieron. */
export function serie(tramas: TramaTelemetria[], variable: string): Array<{ t: Date; m: Muestra }> {
  const out: Array<{ t: Date; m: Muestra }> = [];
  for (const t of ordenarPorSCET(tramas)) {
    for (const m of t.samples) {
      if (m.var === variable) out.push({ t: new Date(t.t_scet), m });
    }
  }
  return out;
}
