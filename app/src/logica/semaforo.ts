/**
 * Semáforo de un indicador: compara el valor de hoy con tu normal (14 días anteriores)
 * y con su umbral absoluto, y se queda con el peor de los dos.
 *
 * Misma convención que las reglas de Diana (reglas_diana.yaml):
 *   z robusto = 0,6745 · (x − mediana) / MAD · mínimo 7 días con dato · MAD = 0 → sin z
 *   MAD nunca menor que la variación mínima creíble del indicador (`madMinimo`)
 *   |z| ≥ 2 en la dirección mala → ámbar (tu normal nunca da rojo por sí sola)
 */
import type { Direccion, Indicador } from '../datos/indicadores';

export type Nivel = 0 | 1 | 2;

export const VENTANA = 14;
export const MIN_DIAS = 7;

export function mediana(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? (s[m] as number) : ((s[m - 1] as number) + (s[m] as number)) / 2;
}

export interface TuNormal {
  mediana: number;
  mad: number;
  /** Franja que se dibuja: donde |z| < 2. */
  banda: [number, number];
}

export function tuNormal(previos: Array<number | null>, madMinimo = 0): TuNormal | null {
  const xs = previos.slice(-VENTANA).filter((x): x is number => x != null);
  if (xs.length < MIN_DIAS) return null;
  const med = mediana(xs);
  const mad = Math.max(mediana(xs.map((x) => Math.abs(x - med))), madMinimo);
  if (mad === 0) return null;
  const ancho = (2 * mad) / 0.6745;
  return { mediana: med, mad, banda: [med - ancho, med + ancho] };
}

export function zRobusto(x: number, n: TuNormal): number {
  return (0.6745 * (x - n.mediana)) / n.mad;
}

/**
 * 🔶 Alejarse de tu normal pide atención, no es una emergencia: por sí solo llega como
 * máximo a ámbar. El rojo ("actúa ahora") lo dan solo los umbrales absolutos [A] o [T].
 * Así el día 112 de Ana queda en ámbar, como pide el ERS (CU-02).
 */
function nivelPorZ(z: number, dir: Direccion): Nivel {
  const malo = dir === 'alto' ? z : dir === 'bajo' ? -z : Math.abs(z);
  return malo >= 2 ? 1 : 0;
}

export interface Evaluacion {
  nivel: Nivel;
  /** Qué decidió el nivel. `null` si está en verde o no hay dato. */
  motivo: 'tu_normal' | 'A' | 'T' | null;
  z: number | null;
  normal: TuNormal | null;
}

export function evaluar(ind: Indicador, hoy: number | null, previos: Array<number | null>): Evaluacion {
  const normal = ind.contraTuNormal ? tuNormal(previos, ind.madMinimo) : null;
  if (hoy == null) return { nivel: 0, motivo: null, z: null, normal };

  const z = normal ? zRobusto(hoy, normal) : null;
  const porNormal: Nivel = z != null ? nivelPorZ(z, ind.direccion) : 0;
  const porUmbral: Nivel = ind.absoluto ? ind.absoluto.nivel(hoy) : 0;

  if (porNormal === 0 && porUmbral === 0) return { nivel: 0, motivo: null, z, normal };
  if (porUmbral >= porNormal) return { nivel: porUmbral, motivo: ind.absoluto!.tipo, z, normal };
  return { nivel: porNormal, motivo: 'tu_normal', z, normal };
}

/** El peor nivel de una lista. */
export const peor = (niveles: Nivel[]): Nivel => niveles.reduce<Nivel>((a, b) => (b > a ? b : a), 0);
