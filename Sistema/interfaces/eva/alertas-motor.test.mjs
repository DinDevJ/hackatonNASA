// Pruebas de las alertas con la referencia del motor. Correr con:
//   node --test Sistema/interfaces/eva/motor.test.mjs Sistema/interfaces/eva/alertas-motor.test.mjs
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { afterEach, test } from 'node:test';

const req = createRequire(import.meta.url);
const M = req('./motor.js');
const A = req('./alertas-motor.js');
const ana = 'MS-2', DIA = 110;
const REF_FC = { variable_id: '01:V3', tipo: 'poblacional', rango: [57, 95], unidad: 'lpm', fuente_corta: 'NHANES (Ostchega 2011)', simulado: true };

const con = (refs, meta = {}) => A.instalar(M, () => ({ refs: new Map(refs.map((r) => [r.variable_id, r])), ...meta }));
const fc = (e) => e.ind.fc;
const hall = (id) => M.lunaDice(ana, DIA).hallazgos.find((h) => h.id === id);

afterEach(() => { M.configurarReferencia(null); M.limpiarRegistros(); });

test('1. sin hook: FC 75 sube por tu normal (lógica actual)', () => {
  M.registrar(ana, DIA, 'fc', 75, '08:00');
  const e = M.estadoIndicador(ana, 'fc', DIA);
  assert.equal(e.nivel, 1); assert.equal(e.motivo, 'tu_normal');
  assert.equal(hall('FC').referencia, 'respecto a tu base (14 días)');
});

test('2. con referencia, FC 75 dentro del rango: nivel 0 y sin hallazgo', () => {
  con([REF_FC]); M.registrar(ana, DIA, 'fc', 75, '08:00');
  const e = M.estadoIndicador(ana, 'fc', DIA);
  assert.equal(e.nivel, 0); assert.equal(e.refMotor.fuera, false);
  assert.equal(hall('FC'), undefined);
});

test('3. con referencia, FC 98 fuera: nivel 1 motivo motor, con texto SIMULADO', () => {
  con([REF_FC]); M.registrar(ana, DIA, 'fc', 98, '08:00');
  const e = M.estadoIndicador(ana, 'fc', DIA);
  assert.equal(e.nivel, 1); assert.equal(e.motivo, 'motor');
  const h = hall('FC');
  assert.ok(h.referencia.startsWith('fuera de lo normal: 57–95 lpm, NHANES (Ostchega 2011)'), h.referencia);
  assert.ok(h.referencia.includes('SIMULADO'));
  assert.ok(h.evidencia.includes(h.referencia));
  assert.equal(h.umbral, 'motor de padecimientos');
});

test('4. sin referencia utilizable: lógica actual', () => {
  M.registrar(ana, DIA, 'fc', 75, '08:00');
  const casos = [
    () => null,
    () => ({ refs: new Map() }),
    () => ({ refs: new Map([['01:V3', { ...REF_FC, tipo: 'sin referencia' }]]) }),
    () => ({ refs: new Map([['01:V3', { ...REF_FC, unidad: '°C' }]]) }),
    () => ({ refs: new Map([['01:V3', { ...REF_FC, unidad: null }]]) }),
    () => ({ refs: new Map([['01:V3', { ...REF_FC, rango: [95, 57] }]]) }),
  ];
  for (const o of casos) {
    A.instalar(M, o);
    const e = M.estadoIndicador(ana, 'fc', DIA);
    assert.equal(e.motivo, 'tu_normal'); assert.equal(e.refMotor, null);
  }
});

test('5. [A]/[T] se respeta dentro o fuera del rango', () => {
  con([{ variable_id: '01:V1', tipo: 'base personal prevuelo', rango: [100, 150], unidad: 'mmHg' }]);
  M.registrar(ana, DIA, 'presion', 145);
  let e = M.estadoIndicador(ana, 'presion', DIA);
  assert.equal(e.nivel, 2); assert.equal(e.motivo, 'T');
  M.limpiarRegistros();
  con([{ ...REF_FC, rango: [57, 110] }]);
  M.registrar(ana, DIA, 'fc', 105);
  e = M.estadoIndicador(ana, 'fc', DIA);
  assert.equal(e.nivel, 1); assert.equal(e.motivo, 'T');
  M.limpiarRegistros();
  con([{ variable_id: '04:A3', tipo: 'base personal prevuelo', rango: [80, 100], unidad: '%' }]);
  M.registrar(ana, DIA, 'spo2', 87);
  assert.equal(M.estadoIndicador(ana, 'spo2', DIA).nivel, 2);
});

test('6. dirección: FC 50 bajo el rango no avisa', () => {
  con([REF_FC]); M.registrar(ana, DIA, 'fc', 50);
  assert.equal(M.estadoIndicador(ana, 'fc', DIA).nivel, 0);
});

test('7. temperatura no es comparable', () => {
  assert.equal(A.usable('temperatura', M.IND.temperatura, { variable_id: '04:A1', tipo: 'poblacional', rango: [35.7, 37.3], unidad: '°C' }), false);
});

test('8. texto de base personal', () => {
  const r = { variable_id: '01:V1', tipo: 'base personal prevuelo', rango: [100, 150], unidad: 'mmHg' };
  assert.equal(A.decidir('presion', M.IND.presion, r, 160, {}).texto, 'respecto a tu base prevuelo: 100–150 mmHg');
  assert.equal(A.decidir('presion', M.IND.presion, r, 120, {}).texto, 'dentro de tu base prevuelo: 100–150 mmHg');
});

test('9. FATIGA-03 no cambia con la referencia instalada', () => {
  con([REF_FC]);
  assert.equal(M.fatiga(ana, 112).estado, 'abierto');
});

test('10. hook que devuelve null: idéntico a sin hook', () => {
  const foto = () => {
    const o = {};
    for (const p of ['MS-1', 'MS-2', 'MS-3', 'MS-4']) for (let d = 106; d <= 115; d++) {
      const e = M.evaluar(p, d);
      o[`${p}|${d}`] = [e.general, ...Object.keys(M.IND).map((k) => e.ind[k].nivel)];
    }
    return o;
  };
  const antes = foto();
  A.instalar(M, () => null);
  assert.deepEqual(foto(), antes);
});

test('textoRango y decimales', () => {
  assert.equal(A.textoRango({ rango: [35.7, 37.3], unidad: '°C' }), '35,7–37,3 °C');
  assert.equal(A.textoRango({ rango: [57, 95], unidad: 'lpm' }), '57–95 lpm');
});
