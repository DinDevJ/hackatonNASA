/**
 * Perfil EVA: trama binaria que manda cualquier dispositivo propio (traje, ESP32,
 * parche). La disposición de la carga la define un ESQUEMA editable desde la
 * interfaz: qué campos, en qué orden, de qué tipo, con qué escala y fórmula.
 *
 *  ┌ cabecera, 13 bytes, little-endian ───────────────┬ carga ───────────────┐
 *  │ ver u8 │ id_disp u32 │ id_esquema u16 │ seq u16 │ t_scet u32 │ campos… │
 *  └──────────────────────────────────────────────────┴──────────────────────┘
 *
 * El tripulante NO va en la trama: el dispositivo no sabe quién lo lleva. Lo
 * resuelve la tabla de asignaciones de la computadora central.
 */
import { compilar, evaluar, variablesDe } from './formula.ts';

export const VERSION_PERFIL = 1;
export const TAM_CABECERA = 13;

export type TipoCampo = 'u8' | 'i8' | 'u16' | 'i16' | 'u32' | 'i32' | 'f32';
export const BYTES: Record<TipoCampo, number> = { u8: 1, i8: 1, u16: 2, i16: 2, u32: 4, i32: 4, f32: 4 };

export interface CampoEsquema {
  /** Nombre corto dentro de la trama; lo usan las fórmulas. */
  clave: string;
  /** Variable del catálogo a la que alimenta, p. ej. '04:A4'. */
  variable: string;
  /** Tipo binario. Ausente = campo virtual: no ocupa bytes, sale de una fórmula. */
  tipo?: TipoCampo;
  /** valor = crudo × escala + desplazamiento */
  escala?: number;
  desplazamiento?: number;
  /** Fórmula opcional sobre el valor ya escalado (`x`) y otros campos por clave. */
  formula?: string;
}

export interface Esquema {
  id: number;
  nombre: string;
  version: number;
  campos: CampoEsquema[];
}

export interface Cabecera {
  ver: number;
  idDisp: number;
  idEsquema: number;
  seq: number;
  tScet: Date;
}

/** Valida un esquema antes de guardarlo. Mejor fallar al editar que al recibir. */
export function validarEsquema(e: Esquema): string[] {
  const errores: string[] = [];
  const claves = new Set<string>();
  for (const c of e.campos) {
    if (!/^[a-z_][a-z0-9_]*$/i.test(c.clave)) errores.push(`clave inválida: ${c.clave}`);
    if (claves.has(c.clave)) errores.push(`clave repetida: ${c.clave}`);
    claves.add(c.clave);
    if (!c.variable.includes(':')) errores.push(`${c.clave}: la variable debe llevar catálogo (04:A4)`);
    if (c.tipo && !(c.tipo in BYTES)) errores.push(`${c.clave}: tipo desconocido ${c.tipo}`);
    if (!c.tipo && !c.formula) errores.push(`${c.clave}: un campo virtual necesita fórmula`);
  }
  for (const c of e.campos) {
    if (!c.formula) continue;
    try {
      for (const v of variablesDe(compilar(c.formula))) {
        if (v !== 'x' && !claves.has(v)) errores.push(`${c.clave}: la fórmula usa "${v}", que no existe`);
      }
    } catch (err) {
      errores.push(`${c.clave}: ${(err as Error).message}`);
    }
  }
  return errores;
}

export function tamCarga(e: Esquema): number {
  return e.campos.reduce((s, c) => s + (c.tipo ? BYTES[c.tipo] : 0), 0);
}

function leer(dv: DataView, off: number, t: TipoCampo): number {
  switch (t) {
    case 'u8': return dv.getUint8(off);
    case 'i8': return dv.getInt8(off);
    case 'u16': return dv.getUint16(off, true);
    case 'i16': return dv.getInt16(off, true);
    case 'u32': return dv.getUint32(off, true);
    case 'i32': return dv.getInt32(off, true);
    case 'f32': return dv.getFloat32(off, true);
  }
}

const RANGO: Record<Exclude<TipoCampo, 'f32'>, [number, number]> = {
  u8: [0, 255], i8: [-128, 127], u16: [0, 65535], i16: [-32768, 32767],
  u32: [0, 4294967295], i32: [-2147483648, 2147483647],
};
function saturar(x: number, t: TipoCampo): number {
  if (t === 'f32') return x;
  const [lo, hi] = RANGO[t];
  return Math.min(hi, Math.max(lo, x));
}

function escribir(dv: DataView, off: number, t: TipoCampo, v: number): void {
  switch (t) {
    case 'u8': dv.setUint8(off, v); break;
    case 'i8': dv.setInt8(off, v); break;
    case 'u16': dv.setUint16(off, v, true); break;
    case 'i16': dv.setInt16(off, v, true); break;
    case 'u32': dv.setUint32(off, v, true); break;
    case 'i32': dv.setInt32(off, v, true); break;
    case 'f32': dv.setFloat32(off, v, true); break;
  }
}

export function leerCabecera(buf: Uint8Array): Cabecera {
  if (buf.byteLength < TAM_CABECERA) throw new Error(`trama corta: ${buf.byteLength} bytes`);
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  return {
    ver: dv.getUint8(0),
    idDisp: dv.getUint32(1, true),
    idEsquema: dv.getUint16(5, true),
    seq: dv.getUint16(7, true),
    tScet: new Date(dv.getUint32(9, true) * 1000),
  };
}

/** Decodifica la carga según el esquema y aplica escalas y fórmulas. */
export function decodificar(buf: Uint8Array, e: Esquema): { cab: Cabecera; valores: Record<string, number> } {
  const cab = leerCabecera(buf);
  if (cab.ver !== VERSION_PERFIL) throw new Error(`versión de perfil ${cab.ver} no soportada`);
  if (cab.idEsquema !== e.id) throw new Error(`la trama usa el esquema ${cab.idEsquema}, no el ${e.id}`);
  const esperado = TAM_CABECERA + tamCarga(e);
  if (buf.byteLength !== esperado) throw new Error(`tamaño ${buf.byteLength}, el esquema espera ${esperado}`);

  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const valores: Record<string, number> = {};
  let off = TAM_CABECERA;
  for (const c of e.campos) {
    if (!c.tipo) continue;
    valores[c.clave] = leer(dv, off, c.tipo) * (c.escala ?? 1) + (c.desplazamiento ?? 0);
    off += BYTES[c.tipo];
  }
  // Fórmulas en orden de declaración: un campo puede usar los anteriores.
  for (const c of e.campos) {
    if (!c.formula) continue;
    valores[c.clave] = evaluar(compilar(c.formula), { ...valores, x: valores[c.clave] ?? 0 });
  }
  return { cab, valores };
}

/** Lo inverso: arma una trama. Lo usa el simulador y lo usará el firmware del ESP32. */
export function codificar(cab: Omit<Cabecera, 'ver'>, e: Esquema, crudos: Record<string, number>): Uint8Array {
  const buf = new Uint8Array(TAM_CABECERA + tamCarga(e));
  const dv = new DataView(buf.buffer);
  dv.setUint8(0, VERSION_PERFIL);
  dv.setUint32(1, cab.idDisp, true);
  dv.setUint16(5, e.id, true);
  dv.setUint16(7, cab.seq & 0xffff, true);
  dv.setUint32(9, Math.floor(cab.tScet.getTime() / 1000), true);
  let off = TAM_CABECERA;
  for (const c of e.campos) {
    if (!c.tipo) continue;
    const real = crudos[c.clave] ?? 0;
    const crudo = (real - (c.desplazamiento ?? 0)) / (c.escala ?? 1);
    // Redondeo y saturación idénticos al firmware (trama_eva.h) y a la pasarela:
    // un pico de 300 lpm en un u8 llega como 255, no como 44.
    escribir(dv, off, c.tipo, c.tipo === 'f32' ? crudo : saturar(Math.floor(crudo + 0.5), c.tipo));
    off += BYTES[c.tipo];
  }
  return buf;
}
