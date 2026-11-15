/** Valor normal del motor por variable: GET /api/padecimientos/referencias. */
import { test, beforeEach } from 'node:test';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { abrir, type BD } from '../src/db.ts';
import { cargarInicial } from '../src/semillas.ts';
import { migrarSalud, sembrarSalud } from '../src/salud.ts';
import { reiniciarEstados } from '../src/ingesta.ts';
import { referenciasMotor } from '../src/referencias-motor.ts';

const ruta = (rel: string) => fileURLToPath(new URL(rel, import.meta.url));
let db: BD;
let T: string;
beforeEach(() => {
  reiniciarEstados(); db = abrir(':memory:');
  cargarInicial(db, ruta('../semillas/inicial.json')); migrarSalud(db); sembrarSalud(db);
  T = (db.prepare('SELECT id FROM tripulantes ORDER BY id').get() as any).id;
});
const ins = (t: string, p: string, hora: string, canal: string, d: object) =>
  db.prepare(`INSERT INTO evaluaciones (tripulante, padecimiento_id, color, hora, canal, detalle) VALUES (?,?,?,?,?,?)`).run(t, p, 'VERDE', hora, canal, JSON.stringify(d));
const ref = (id: string, extra: object = {}) => ({ variable_id: id, tipo: 'poblacional', rango: [1, 2], centro: 1.5, unidad: 'u', fuente: 'F', fuente_corta: 'f', provisional: true, ...extra });
const err = (f: () => unknown) => { try { f(); } catch (e: any) { return e.estado; } };

test('400 sin tripulante y 404 desconocido', () => {
  assert.equal(err(() => referenciasMotor(db, null)), 400);
  assert.equal(err(() => referenciasMotor(db, 'NOEXISTE')), 404);
});

test('sin evaluación: referencias [] y motivo; variable pedida devuelve sin referencia', () => {
  const r = referenciasMotor(db, T);
  assert.deepEqual(r.referencias, []);
  assert.equal(r.evaluacion, null);
  assert.equal(r.simulado, false);
  assert.equal(r.etiqueta, null);
  assert.match(r.motivo!, /sin evaluación guardada/);
  const v = referenciasMotor(db, T, 'V1').referencias[0];
  assert.equal(v.tipo, 'sin referencia');
  assert.match(v.motivo, /sin evaluación guardada/);
});

test('usa la última ejecución, deduplica, toma nombres de ligas y marca SIMULADO', () => {
  ins(T, 'P01', '2026-01-01T00:00:00Z', 'real', { referencias: { V9: ref('V9') } });
  ins(T, 'P01', '2026-01-02T00:00:00Z', 'SIMULADO', { fase: 'prevuelo', fecha_evaluacion: '2026-01-02',
    referencias: { V2: ref('V2', { centro: 10 }), V1: ref('V1', { tipo: 'raro' }) }, ligas: [{ variable_id: 'V1', variable: 'Uno' }] });
  ins(T, 'P02', '2026-01-02T00:00:00Z', 'SIMULADO', { referencias: { V2: ref('V2', { centro: 99 }), V3: ref('V3') }, ligas: [{ variable_id: 'V2', variable: 'Dos' }] });
  const r = referenciasMotor(db, T);
  assert.deepEqual(r.referencias.map((x: any) => x.variable_id), ['V1', 'V2', 'V3']);
  assert.equal(r.referencias[0].tipo, 'sin referencia');
  assert.equal(r.referencias[0].variable, 'Uno');
  assert.equal(r.referencias[1].centro, 10);
  assert.equal(r.referencias[2].variable, null);
  assert.ok(r.referencias.every((x: any) => x.simulado === true));
  assert.equal(r.etiqueta, 'SIMULADO');
  assert.equal(r.motivo, null);
  assert.deepEqual(r.evaluacion, { hora: '2026-01-02T00:00:00Z', canal: 'SIMULADO', simulado: true, fase: 'prevuelo', fecha_evaluacion: '2026-01-02' });
});

test('filtro por variable: encontrada y no encontrada; canal real no es simulado', () => {
  ins(T, 'P01', '2026-01-02T00:00:00Z', 'real', { referencias: { V1: ref('V1') } });
  const a = referenciasMotor(db, T, 'V1');
  assert.equal(a.referencias.length, 1);
  assert.equal(a.referencias[0].simulado, false);
  assert.equal(a.etiqueta, null);
  const b = referenciasMotor(db, T, 'VX').referencias;
  assert.equal(b.length, 1);
  assert.equal(b[0].variable_id, 'VX');
  assert.equal(b[0].rango, null);
  assert.match(b[0].motivo, /no evaluó esta variable/);
});

test('detalle sin referencias o roto: motivo de motor anterior', () => {
  ins(T, 'P01', '2026-01-02T00:00:00Z', 'real', {});
  db.prepare(`INSERT INTO evaluaciones (tripulante, padecimiento_id, color, hora, canal, detalle) VALUES (?,?,?,?,?,?)`).run(T, 'P02', 'VERDE', '2026-01-02T00:00:00Z', 'real', '{roto');
  const r = referenciasMotor(db, T);
  assert.deepEqual(r.referencias, []);
  assert.match(r.motivo!, /motor anterior/);
});

test('HTTP: 400, 404 y 200', async () => {
  ins(T, 'P01', '2026-01-02T00:00:00Z', 'SIMULADO', { referencias: { V1: ref('V1') } });
  const { construir } = await import('../src/servidor.ts');
  const srv = construir(db);
  await new Promise<void>((ok) => srv.listen(0, '127.0.0.1', ok));
  const base = `http://127.0.0.1:${(srv.address() as { port: number }).port}`;
  try {
    assert.equal((await fetch(`${base}/api/padecimientos/referencias`)).status, 400);
    assert.equal((await fetch(`${base}/api/padecimientos/referencias?tripulante=NOEXISTE`)).status, 404);
    const r = await fetch(`${base}/api/padecimientos/referencias?tripulante=${T}&variable=V1`);
    assert.equal(r.status, 200);
    const j = await r.json() as any;
    assert.equal(j.etiqueta, 'SIMULADO');
    assert.equal(j.referencias[0].variable_id, 'V1');
  } finally { await new Promise((ok) => srv.close(ok)); }
});
