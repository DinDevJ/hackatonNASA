import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compilar, evaluar as evalF, ErrorFormula } from '../src/formula.ts';
import { codificar, decodificar, validarEsquema, type Esquema } from '../src/esquema.ts';
import { evaluar, predecir, type Prior } from '../src/lunna.ts';

test('fórmulas: precedencia, funciones y referencias a campos', () => {
  assert.equal(evalF(compilar('2 + 3 * 4'), {}), 14);
  assert.equal(evalF(compilar('2 ^ 3 ^ 2'), {}), 512);
  assert.equal(evalF(compilar('-x + 1'), { x: 5 }), -4);
  assert.equal(evalF(compilar('(sis + 2 * dia) / 3'), { sis: 120, dia: 75 }), 90);
  assert.equal(evalF(compilar('round(sqrt(x) * 10) / 10'), { x: 2 }), 1.4);
});

test('fórmulas: rechaza todo lo que no sea aritmética', () => {
  assert.throws(() => compilar('process.exit()'), ErrorFormula);
  assert.throws(() => compilar('require("fs")'), ErrorFormula);
  assert.throws(() => compilar('constructor(1)'), ErrorFormula);
  assert.throws(() => compilar('1 +'), ErrorFormula);
  assert.throws(() => evalF(compilar('y * 2'), { x: 1 }), /campo desconocido/);
});

const ESQ: Esquema = { id: 7, nombre: 'prueba', version: 1, campos: [
  { clave: 'fc', variable: '04:A4', tipo: 'u8' },
  { clave: 'temp', variable: '04:A1', tipo: 'i16', escala: 0.01 },
  { clave: 'sis', variable: '01:V1', tipo: 'u8' },
  { clave: 'dia', variable: 'X:PAD', tipo: 'u8' },
  { clave: 'pam', variable: 'X:PAM', formula: '(sis + 2 * dia) / 3' },
] };

test('esquema: codificar y decodificar es ida y vuelta', () => {
  const t = new Date('2027-03-18T07:42:09Z');
  const buf = codificar({ idDisp: 102, idEsquema: 7, seq: 5, tScet: t }, ESQ, { fc: 75, temp: 36.84, sis: 120, dia: 75 });
  assert.equal(buf.byteLength, 13 + 1 + 2 + 1 + 1);
  const { cab, valores } = decodificar(buf, ESQ);
  assert.equal(cab.idDisp, 102);
  assert.equal(cab.seq, 5);
  assert.equal(cab.tScet.toISOString(), t.toISOString());
  assert.equal(valores.fc, 75);
  assert.ok(Math.abs(valores.temp! - 36.84) < 1e-9);
  assert.equal(valores.pam, 90);
});

test('esquema: la validación atrapa errores al editar, no al recibir', () => {
  const malo: Esquema = { id: 1, nombre: 'x', version: 1, campos: [
    { clave: 'a', variable: '04:A4', tipo: 'u8' },
    { clave: 'a', variable: 'sinCatalogo', tipo: 'u8' },
    { clave: 'b', variable: '04:A1', formula: 'zz * 2' },
    { clave: 'c', variable: '04:A2' },
  ] };
  const e = validarEsquema(malo).join(' | ');
  assert.match(e, /clave repetida/);
  assert.match(e, /catálogo/);
  assert.match(e, /"zz", que no existe/);
  assert.match(e, /virtual necesita fórmula/);
  assert.deepEqual(validarEsquema(ESQ), []);
});

const P: Prior = { variable: '04:A4', entorno: 'orbita', escala: 'relativa', mu0: 0, tau0: 0.10,
  sigma_mision: 0.03, sigma_dia: 0.04, extrapolado: false, fuente: 'prueba' };

test('LUNNA: sin datos propios manda la literatura', () => {
  const p = predecir({ prior: P, basal: 62 });
  assert.equal(p.pesos.poblacion, 1);
  assert.equal(p.esperado, 62);
});

test('LUNNA: una misión previa de −10 % arrastra la predicción hacia ella', () => {
  const p = predecir({ prior: P, basal: 62, historial: [-0.10] });
  assert.ok(p.mu < -0.08 && p.mu > -0.10, `mu = ${p.mu}`);
  assert.ok(p.pesos.historial > 0.9);
  assert.ok(p.tau < P.tau0, 'la incertidumbre baja con evidencia');
});

test('LUNNA: tras la calibración mandan los datos propios', () => {
  const cal = Array.from({ length: 14 }, () => -0.05);
  const p = predecir({ prior: P, basal: 62, historial: [-0.10], calibracion: cal });
  assert.ok(p.pesos.vuelo > 0.8);
  assert.ok(Math.abs(p.mu - -0.05) < 0.01);
});

test('LUNNA: el tipo de sangre no cambia nada', () => {
  const base = { edad: 33, sexo: 'F' as const, peso_kg: 58, altura_m: 1.65 };
  const a = predecir({ prior: { ...P, beta: { edad: 0.001 } }, basal: 62, covariables: { ...base, sangre: 'A+' } });
  const b = predecir({ prior: { ...P, beta: { edad: 0.001 } }, basal: 62, covariables: { ...base, sangre: 'O-' } });
  assert.equal(a.mu, b.mu);
});

test('LUNNA: una desviación grande da rojo', () => {
  const p = predecir({ prior: P, basal: 62, calibracion: Array(14).fill(-0.08) });
  assert.equal(evaluar(p.esperado, p, P).estado, 'verde');
  assert.equal(evaluar(p.esperado * 1.15, p, P).estado, 'rojo');
});

test('fórmulas: nombres heredados del prototipo no son funciones ni campos', () => {
  for (const f of ['constructor(1)', 'toString(1)', 'valueOf(1)', 'hasOwnProperty(1)']) {
    assert.throws(() => compilar(f), ErrorFormula, f);
  }
  assert.throws(() => evalF(compilar('toString + 1'), {}), /campo desconocido/);
});
