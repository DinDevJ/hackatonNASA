// Genera los vectores de referencia con el codificador del BACKEND.
// El firmware (C++) y la pasarela (Python) deben producir exactamente estos bytes.
import { writeFileSync } from 'node:fs';
import { codificar, type Esquema } from '../../backend/src/esquema.ts';

const A: Esquema = { id: 3, nombre: 'A', version: 1, campos: [
  { clave: 'fc', variable: '04:A4', tipo: 'u8' }, { clave: 'spo2', variable: '04:A3', tipo: 'u8' },
  { clave: 'temp', variable: '04:A1', tipo: 'i16', escala: 0.01 }] };
const B: Esquema = { id: 4, nombre: 'B', version: 1, campos: [
  { clave: 'fr', variable: '04:A2', tipo: 'u8' }, { clave: 'sis', variable: '01:V1', tipo: 'u8' },
  { clave: 'dia', variable: 'X:PAD', tipo: 'u8' }] };

const casos = [
  { disp: 2561, esq: A, seq: 0,     t: 1794700000, v: [75, 98, 36.84] },
  { disp: 2561, esq: A, seq: 65535, t: 1794700001, v: [300, 97.5, -2.5] },   // satura y negativos
  { disp: 2817, esq: B, seq: 42,    t: 1794700002, v: [14.4, 115.5, 74.5] }, // medios: redondeo
  { disp: 2817, esq: B, seq: 7,     t: 0,          v: [0, -5, 255] },
];
const vectores = casos.map((c) => {
  const claves = c.esq.campos.map((x) => x.clave);
  const valores = Object.fromEntries(claves.map((k, i) => [k, c.v[i]!]));
  const buf = codificar({ idDisp: c.disp, idEsquema: c.esq.id, seq: c.seq, tScet: new Date(c.t * 1000) }, c.esq, valores);
  return { ...c, esq: c.esq.id, hex: Buffer.from(buf).toString('hex') };
});
writeFileSync(new URL('./vectores.json', import.meta.url), JSON.stringify(vectores, null, 2));
for (const v of vectores) console.log(v.hex);
