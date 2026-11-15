// Genera los vectores de referencia con el codificador del BACKEND.
// El firmware (C++) y la pasarela (Python) deben producir exactamente estos bytes.
import { writeFileSync } from 'node:fs';
import { codificar, type Esquema } from '../../backend/src/esquema.ts';

// Esquema 5 (playera) y 2 (brazalete de presión, sin el campo virtual pam).
const PLAYERA: Esquema = { id: 5, nombre: 'playera', version: 1, campos: [
  { clave: 'fc', variable: '04:A4', tipo: 'u8' }, { clave: 'fr', variable: '04:A2', tipo: 'u8' },
  { clave: 'temp', variable: '04:A1', tipo: 'i16', escala: 0.01 }] };
const BRAZALETE: Esquema = { id: 2, nombre: 'brazalete', version: 1, campos: [
  { clave: 'sis', variable: '01:V1', tipo: 'u8' }, { clave: 'dia', variable: 'X:PAD', tipo: 'u8' }] };

const casos = [
  { disp: 401, esq: PLAYERA,   seq: 0,     t: 1794700000, v: [75, 14, 36.84] },
  { disp: 401, esq: PLAYERA,   seq: 65535, t: 1794700001, v: [300, 13.5, -2.5] },  // satura y negativos
  { disp: 201, esq: BRAZALETE, seq: 42,    t: 1794700002, v: [115.5, 74.5] },      // medios: redondeo
  { disp: 201, esq: BRAZALETE, seq: 7,     t: 0,          v: [-5, 255] },
];
const vectores = casos.map((c) => {
  const claves = c.esq.campos.map((x) => x.clave);
  const valores = Object.fromEntries(claves.map((k, i) => [k, c.v[i]!]));
  const buf = codificar({ idDisp: c.disp, idEsquema: c.esq.id, seq: c.seq, tScet: new Date(c.t * 1000) }, c.esq, valores);
  return { ...c, esq: c.esq.id, hex: Buffer.from(buf).toString('hex') };
});
writeFileSync(new URL('./vectores.json', import.meta.url), JSON.stringify(vectores, null, 2));
for (const v of vectores) console.log(v.hex);
