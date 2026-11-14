/** Utilidades puras (sin dependencias de Node): se usan también en la página del reloj. */
/** Ancla convencional para datasets sin fecha absoluta (MMASH) y para simulaciones. */
export const ANCLA = Date.UTC(2000, 0, 1);

/** ISO-8601 a partir de día relativo (1 = ANCLA) y "HH:MM" o "HH:MM:SS". */
export function isoRelativo(dia: number, hora: string): string {
  const [h = 0, m = 0, s = 0] = hora.split(":").map(Number);
  return new Date(ANCLA + (dia - 1) * 86_400_000 + ((h * 60 + m) * 60 + s) * 1000).toISOString();
}

export const redondear = (x: number, d = 2): number => Math.round(x * 10 ** d) / 10 ** d;

/** Generador pseudoaleatorio con semilla (mulberry32): misma semilla → mismos datos. */
export function rng(semilla: number): () => number {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Normal(media, de) con Box-Muller. */
export function normal(r: () => number, media: number, de: number): number {
  const u = Math.max(r(), 1e-12);
  return media + de * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r());
}

export type Fila = Record<string, string>;

export function num(v: string | undefined): number | null {
  if (v === undefined || v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
