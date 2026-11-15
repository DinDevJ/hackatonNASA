// Pruebas del motor de la maqueta. Correr con:  node --test Sistema/interfaces/eva/motor.test.mjs
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { test } from 'node:test';

const M = createRequire(import.meta.url)('./motor.js');
const ana = 'MS-2';

test('tu normal: 14 días, mínimo 7, y nunca más estrecha que la variación mínima creíble', () => {
  assert.equal(M.tuNormal([60, 61, 59], 1.5), null);
  const n = M.tuNormal([60, 60, 60, 60, 60, 60, 60, 60], 1.5);
  assert.equal(n.mad, 1.5);
  assert.equal(M.tuNormal([60, 60, 60, 60, 60, 60, 60]), null, 'MAD 0 sin mínimo: no hay línea base');
});

test('RF-02-01: la mediana de FC en reposo de Ana es 58', () => {
  assert.equal(M.estadoIndicador(ana, 'fc', 112).normal.med, 58);
});

test('CU-02: FATIGA-03 se abre el 112 con las tres señales en z ≥ 2, no antes', () => {
  assert.equal(M.fatiga(ana, 111), null);
  const f = M.fatiga(ana, 112);
  assert.equal(f.estado, 'abierto');
  const z = Object.fromEntries(f.hoy.es.map((e) => [e.k, e.z]));
  assert.ok(z.sueno <= -2 && z.lapsos >= 2 && z.fc >= 2, JSON.stringify(z));
});

test('ninguna señal sola dispararía: cada una está por debajo de |z| 3', () => {
  for (const e of M.fatiga(ana, 112).hoy.es) assert.ok(Math.abs(e.z) < 3, `${e.k} z=${e.z}`);
});

test('RF-02-07: el 113 va mejorando y el 114 se cierra (2 días con z < 2)', () => {
  assert.equal(M.fatiga(ana, 113).estado, 'mejorando');
  assert.equal(M.fatiga(ana, 114).estado, 'cerrado');
  assert.equal(M.evaluar(ana, 114).general, 0);
});

test('M1: el día 112 la cabeza y el corazón de Ana salen en ámbar', () => {
  const r = M.evaluar(ana, 112).regiones;
  assert.equal(r.cabeza, 1);
  assert.equal(r.corazon, 1);
  assert.equal(r.ojos, null, 'los ojos no tienen dato a bordo');
});

test('CU-03: el día 115 todos en rojo por radiación', () => {
  for (const p of M.PERSONAS) {
    const ev = M.evaluar(p.id, 115);
    assert.equal(ev.general, 2, p.nombre);
    assert.equal(ev.regiones.radiacion, 2);
  }
});

test('sin falsas alarmas: Tomás y Mei en verde del 106 al 114', () => {
  for (const id of ['MS-1', 'MS-3']) for (let d = 106; d <= 114; d++) assert.equal(M.evaluar(id, d).general, 0, `${id} día ${d}`);
});

test('Luis en ámbar por presión, con umbral [T] y no por su normal', () => {
  const e = M.estadoIndicador('MS-4', 'presion', 112);
  assert.equal(e.nivel, 1);
  assert.equal(e.motivo, 'T');
});

test('lo que Luna dice: cuenta las señales con números y no diagnostica', () => {
  const L = M.lunaDice(ana, 112);
  assert.match(L.resumen, /1<\/b> cosa/);
  const h = L.hallazgos.find((x) => x.id === 'FATIGA-03');
  assert.equal(h.evidencia.length, 3);
  assert.match(h.evidencia.join(' '), /tu normal/);
  assert.doesNotMatch(JSON.stringify(L), /diagn[oó]stico de|padeces|tienes (una )?enfermedad/i);
  assert.equal(M.lunaDice('MS-1', 112).hallazgos.length, 0);
  assert.ok(M.lunaDice('MS-1', 112).bien.length > 0, 'si todo va bien, también lo dice con números');
});

test('la silueta depende del sexo de cada tripulante', () => {
  assert.deepEqual(M.PERSONAS.map((p) => [p.nombre, p.sexo]), [['Ana', 'M'], ['Luis', 'H'], ['Mei', 'M'], ['Tomás', 'H']]);
});

test("bug 4: lo registrado hoy reemplaza el valor simulado y se recalcula; se puede limpiar", () => {
  const antes = M.estadoIndicador(ana, "animo", 112);
  M.registrar(ana, 112, "animo", 95, "08:10");
  const e = M.estadoIndicador(ana, "animo", 112);
  assert.equal(e.valor, 95);
  assert.deepEqual(e.registrado, { valor: 95, hora: "08:10" });
  assert.equal(e.nivel, 1, "un estrés muy por encima de tu normal pide atención");
  assert.equal(M.SERIES[ana].animo[M.idx(112)], antes.valor, "la serie simulada no se toca");
  M.registrar(ana, 112, "presion", 150, "08:12");
  assert.equal(M.estadoIndicador(ana, "presion", 112).nivel, 2);
  M.limpiarRegistros();
  assert.equal(M.estadoIndicador(ana, "animo", 112).valor, antes.valor);
  assert.equal(M.estadoIndicador(ana, "animo", 112).registrado, null);
});

test("bug 7: en fase lútea tu normal de pulso y HRV se ensancha y no hay falsa alarma", () => {
  const sin = M.estadoIndicador(ana, "fc", 112);
  M.configurarCiclo((pid) => (pid === ana ? "lutea" : null));
  const con = M.estadoIndicador(ana, "fc", 112);
  assert.ok(con.ajusteCiclo);
  assert.ok(Math.abs(con.z) < Math.abs(sin.z), "el z baja con el margen ensanchado");
  assert.equal(M.estadoIndicador("MS-4", "fc", 112).ajusteCiclo, false, "a los hombres no se les ajusta");
  M.configurarCiclo(null);
  assert.equal(M.estadoIndicador(ana, "fc", 112).ajusteCiclo, false);
  assert.equal(M.fatiga(ana, 112).estado, "abierto", "sin fase lútea el escenario no cambia");
});

test("bug 9: la dosis es personal y el evento solar suma según cuánto tardó cada quien en refugiarse", () => {
  const dosis = M.PERSONAS.map((p) => M.dosisPersonal(p.id, 112).mision);
  assert.ok(new Set(dosis).size > 1, "no es la misma cifra para los cuatro");
  assert.equal(M.dosisPersonal("MS-2", 114).evento, 0);
  const mei = M.dosisPersonal("MS-3", 115).evento, ana = M.dosisPersonal("MS-2", 115).evento;
  assert.ok(mei > ana, "Mei tardó más en llegar al refugio");
  assert.ok(mei < 250, "bajo el límite por evento");
});
