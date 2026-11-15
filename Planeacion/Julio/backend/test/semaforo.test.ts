/** Semáforo de padecimientos: lectura, pesos del usuario y motor Python. */
import { test, beforeEach } from 'node:test';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { abrir, type BD } from '../src/db.ts';
import { cargarInicial } from '../src/semillas.ts';
import { migrarSalud, sembrarSalud } from '../src/salud.ts';
import { reiniciarEstados } from '../src/ingesta.ts';
import { correrMotor } from '../src/semaforo.ts';

const ruta = (rel: string) => fileURLToPath(new URL(rel, import.meta.url));
let db: BD;

function preparar(d: BD) {
  cargarInicial(d, ruta('../semillas/inicial.json'));
  migrarSalud(d);
  sembrarSalud(d);
}
beforeEach(() => { reiniciarEstados(); db = abrir(':memory:'); preparar(db); });

async function conServidor(f: (base: string) => Promise<void>, bd: BD = db) {
  const { construir } = await import('../src/servidor.ts');
  const srv = construir(bd);
  await new Promise<void>((ok) => srv.listen(0, '127.0.0.1', ok));
  try { await f(`http://127.0.0.1:${(srv.address() as { port: number }).port}`); }
  finally { await new Promise((ok) => srv.close(ok)); }
}
const get = async (base: string, p: string) => { const r = await fetch(base + p); return { estado: r.status, j: await r.json() as any }; };
const enviar = async (base: string, metodo: string, p: string, cuerpo?: string) => {
  const r = await fetch(base + p, { method: metodo, headers: { 'content-type': 'application/json' }, body: cuerpo });
  return { estado: r.status, j: await r.json() as any };
};
const ins = (t: string, p: string, color: string, hora: string, canal: string, d: object) =>
  db.prepare(`INSERT INTO evaluaciones (tripulante, padecimiento_id, color, hora, canal, detalle) VALUES (?,?,?,?,?,?)`).run(t, p, color, hora, canal, JSON.stringify(d));
const fila = (clave: string) => db.prepare(`SELECT * FROM pesos_usuario WHERE clave = ?`).get(clave) as any;
const nPesos = () => (db.prepare(`SELECT COUNT(*) AS n FROM pesos_usuario`).get() as any).n;
const liga = () => db.prepare(`SELECT padecimiento_id AS p, variable_id AS v, peso FROM padecimiento_variable WHERE padecimiento_id = 'P07' ORDER BY variable_id`).all() as any[];

test('semáforo vacío: tripulantes semilla × 20 GRIS, vacio y como_poblar', async () => {
  await conServidor(async (b) => {
    const { estado, j } = await get(b, '/api/padecimientos/semaforo');
    assert.equal(estado, 200);
    assert.equal(j.vacio, true);
    assert.equal(j.provisional, true);
    assert.match(j.aviso, /No es un diagnóstico/);
    assert.equal(j.padecimientos.length, 20);
    assert.ok(j.como_poblar.npm && j.como_poblar.python && j.como_poblar.post);
    assert.equal(j.tripulantes.length, 4);
    for (const t of j.tripulantes) {
      assert.equal(t.semaforo.length, 20);
      assert.equal(t.conteo.GRIS, 20);
      assert.ok(t.semaforo.every((s: any) => s.color === 'GRIS' && s.evaluado === false && s.hora === null && s.simulado === false));
    }
  });
});

test('semáforo con filas: gana la última, simulado, filtro y 404', async () => {
  const [t1, t2] = (db.prepare(`SELECT id FROM tripulantes ORDER BY id`).all() as any[]).map((r) => r.id);
  ins(t1, 'P07', 'VERDE', '2026-01-01T00:00:00Z', 'real', { motivo: 'viejo' });
  ins(t1, 'P07', 'ROJO', '2026-01-02T00:00:00Z', 'SIMULADO', { motivo: 'nuevo', etiquetas: ['x'], cobertura: 0.5,
    ligas: [{ variable_id: '03:V82', variable: 'v', valor: 1, unidad: 'u', peso: 2, aporte: 0.7, cuenta_en_T: true }] });
  ins(t2, 'P01', 'AMARILLO', '2026-01-03T00:00:00Z', 'real', { motivo: 'sin ligas' });
  ins('EXT-9', 'P02', 'VERDE', '2026-01-03T00:00:00Z', 'real', { motivo: 'externo' });
  await conServidor(async (b) => {
    const { j } = await get(b, '/api/padecimientos/semaforo');
    assert.equal(j.vacio, false);
    assert.equal(j.tripulantes.length, 5);
    const a = j.tripulantes.find((t: any) => t.id === t1);
    const p7 = a.semaforo.find((s: any) => s.padecimiento_id === 'P07');
    assert.deepEqual([p7.color, p7.por_que, p7.simulado, p7.canal, p7.evaluado], ['ROJO', 'nuevo', true, 'SIMULADO', true]);
    assert.deepEqual(p7.etiquetas, ['x']);
    assert.equal(a.simulado, true);
    assert.equal(a.conteo.ROJO, 1);
    assert.equal(a.conteo.GRIS, 19);
    const c = j.tripulantes.find((t: any) => t.id === t2);
    assert.equal(c.simulado, false);
    assert.equal(c.semaforo.find((s: any) => s.padecimiento_id === 'P01').color, 'AMARILLO');
    assert.equal(j.tripulantes.find((t: any) => t.id === 'EXT-9').nombre, null);
    const f = await get(b, `/api/padecimientos/semaforo?tripulante=${t1}`);
    assert.equal(f.j.tripulantes.length, 1);
    assert.equal((await get(b, '/api/padecimientos/semaforo?tripulante=NOPE')).estado, 404);
    assert.equal((await get(b, `/api/padecimientos/semaforo/NOPE/P07`)).estado, 404);
    assert.equal((await get(b, `/api/padecimientos/semaforo/${t1}/P99`)).estado, 404);
  });
});

test('detalle: contribución, orden, con_desglose y sin evaluación', async () => {
  const t1 = (db.prepare(`SELECT id FROM tripulantes ORDER BY id`).get() as any).id;
  const [a, b2, c] = liga();
  ins(t1, 'P07', 'AMARILLO', '2026-01-02T00:00:00Z', 'SIMULADO', { motivo: 'm', T: 1.5, T_de: 0.2, cobertura: 0.8, condiciones: ['k'], fase: 'f',
    ligas: [{ variable_id: b2.v, valor: 3, unidad: 'u', peso: 1, aporte: 0.2 }, { variable_id: c.v, valor: 4, peso: 1, aporte: 0.9, cuenta_en_T: true }] });
  await conServidor(async (b) => {
    const { estado, j } = await get(b, `/api/padecimientos/semaforo/${t1}/P07`);
    assert.equal(estado, 200);
    assert.equal(j.color, 'AMARILLO');
    assert.equal(j.con_desglose, true);
    assert.equal(j.evaluacion.T, 1.5);
    assert.equal(j.variables.length, liga().length);
    assert.deepEqual(j.variables.slice(0, 2).map((v: any) => v.variable_id), [c.v, b2.v]);
    assert.equal(j.variables[0].contribucion, 0.9);
    assert.equal(j.variables.at(-1).contribucion, null);
    assert.ok(j.variables.some((v: any) => v.variable_id === a.v && v.valor === null));
    const g = (await get(b, `/api/padecimientos/semaforo/${t1}/P01`)).j;
    assert.deepEqual([g.color, g.evaluacion, g.con_desglose], ['GRIS', null, false]);
    assert.match(g.por_que, /Sin evaluación/);
  });
});

test('pesos: override cambia peso_efectivo y marca modificado_por_usuario', async () => {
  const [a] = liga();
  db.prepare(`INSERT INTO pesos_usuario (clave, tipo, padecimiento_id, variable_id, peso, modificado) VALUES (?,?,?,?,?,?)`)
    .run(`liga|P07|${a.v}`, 'liga', 'P07', a.v, 2.5, '2026-01-01T00:00:00Z');
  await conServidor(async (b) => {
    const { j } = await get(b, '/api/padecimientos/pesos?padecimiento=P07');
    assert.deepEqual(j.rango_peso, [0, 3]);
    assert.equal(j.umbrales_editables.length, 7);
    const l = j.ligas.find((x: any) => x.variable_id === a.v);
    assert.deepEqual([l.peso_efectivo, l.peso_fuente === a.peso, l.peso_usuario, l.modificado_por_usuario], [2.5, true, 2.5, true]);
    assert.equal(l.prior_de_efectivo, l.prior_de_fuente);
    assert.equal(j.ligas.filter((x: any) => x.modificado_por_usuario).length, 1);
    assert.equal((await get(b, '/api/padecimientos/pesos?padecimiento=P99')).estado, 404);
    assert.equal((await get(b, '/api/padecimientos/pesos')).j.ligas.length, 350);
    const d = (await get(b, `/api/padecimientos/semaforo/${(db.prepare(`SELECT id FROM tripulantes`).get() as any).id}/P07`)).j;
    assert.equal(d.variables.find((v: any) => v.variable_id === a.v).peso_efectivo, 2.5);
  });
});

test('PUT pesos: válido (fila exacta, conserva campo no enviado) e inválidos', async () => {
  const [a] = liga();
  await conServidor(async (b) => {
    const put = (o: unknown) => enviar(b, 'PUT', '/api/padecimientos/pesos', typeof o === 'string' ? o : JSON.stringify(o));
    let r = await put({ padecimiento_id: 'P07', variable_id: a.v, peso: 1.5 });
    assert.equal(r.estado, 200);
    assert.equal(r.j.peso_efectivo, 1.5);
    assert.equal(r.j.modificado_por_usuario, true);
    const f = fila(`liga|P07|${a.v}`);
    assert.deepEqual([f.tipo, f.peso, f.prior_de, f.modificado_por_usuario, f.padecimiento_id, f.variable_id], ['liga', 1.5, null, 1, 'P07', a.v]);
    assert.ok(f.modificado);
    r = await put({ padecimiento_id: 'P07', variable_id: a.v, prior_de: 0.4 });
    assert.equal(r.estado, 200);
    assert.deepEqual([fila(`liga|P07|${a.v}`).peso, fila(`liga|P07|${a.v}`).prior_de], [1.5, 0.4]);
    r = await put({ umbral: 'T_amarillo', valor: 2 });
    assert.equal(r.estado, 200);
    assert.deepEqual([r.j.nombre, r.j.valor], ['T_amarillo', 2]);
    assert.deepEqual([fila('umbral|T_amarillo').tipo, fila('umbral|T_amarillo').valor], ['umbral', 2]);
    assert.equal((await get(b, '/api/padecimientos/pesos')).j.umbrales[0].nombre, 'T_amarillo');
    const malos: Array<[unknown, number]> = [
      [{ padecimiento_id: 'P07', variable_id: a.v, peso: 4 }, 400],
      [{ padecimiento_id: 'P07', variable_id: a.v, peso: '2' }, 400],
      [{ padecimiento_id: 'P07', variable_id: a.v, peso: true }, 400],
      [{ padecimiento_id: 'P07', variable_id: a.v, peso: null }, 400],
      [{ padecimiento_id: 'P07', variable_id: a.v, prior_de: 0 }, 400],
      [{ padecimiento_id: 'P07', variable_id: a.v }, 400],
      [{ padecimiento_id: 'P07', variable_id: 'zz:nada', peso: 1 }, 404],
      [{ umbral: 'otro', valor: 1 }, 400],
      [{ umbral: 'cobertura_min', valor: 1.5 }, 400],
      [{ umbral: 'T_amarillo', valor: '2' }, 400],
      [{ foo: 1 }, 400],
      ['{no json', 400],
    ];
    for (const [o, est] of malos) assert.equal((await put(o)).estado, est, JSON.stringify(o));
    assert.equal(nPesos(), 2);
  });
});

test('restaurar: una liga, un padecimiento, un umbral y todo', async () => {
  const [a, b2] = liga();
  const [x] = db.prepare(`SELECT variable_id AS v FROM padecimiento_variable WHERE padecimiento_id = 'P01' LIMIT 1`).all() as any[];
  await conServidor(async (b) => {
    const put = (o: unknown) => enviar(b, 'PUT', '/api/padecimientos/pesos', JSON.stringify(o));
    const poblar = async () => {
      await put({ padecimiento_id: 'P07', variable_id: a.v, peso: 1 });
      await put({ padecimiento_id: 'P07', variable_id: b2.v, peso: 2 });
      await put({ padecimiento_id: 'P01', variable_id: x.v, peso: 2 });
      await put({ umbral: 'T_inf_rojo', valor: 3 });
    };
    const rest = (o?: unknown) => enviar(b, 'POST', '/api/padecimientos/pesos/restaurar', o === undefined ? undefined : JSON.stringify(o));
    await poblar();
    let r = await rest({ padecimiento_id: 'P07', variable_id: a.v });
    assert.equal(r.j.restaurados, 1);
    assert.equal(r.j.liga.modificado_por_usuario, false);
    assert.equal(nPesos(), 3);
    r = await rest({ padecimiento_id: 'P07' });
    assert.equal(r.j.restaurados, 1);
    assert.equal(nPesos(), 2);
    r = await rest({ umbral: 'T_inf_rojo' });
    assert.equal(r.j.restaurados, 1);
    assert.equal(nPesos(), 1);
    await poblar();
    r = await rest();
    assert.equal(r.estado, 200);
    assert.equal(r.j.restaurados, 4);
    assert.equal(nPesos(), 0);
    assert.equal((await rest({ padecimiento_id: 'P99' })).estado, 404);
  });
});

test('evaluar: BD en memoria → 409; cuerpo no booleano → 400', async () => {
  await conServidor(async (b) => {
    const r = await enviar(b, 'POST', '/api/padecimientos/evaluar', '{"simulado": true}');
    assert.equal(r.estado, 409);
    assert.match(r.j.error, /memoria/);
    assert.equal((await enviar(b, 'POST', '/api/padecimientos/evaluar', '{"simulado": "si"}')).estado, 400);
    assert.equal((await enviar(b, 'POST', '/api/padecimientos/evaluar')).estado, 409);
  });
});

const hayPandas = (() => { try { execFileSync('python3', ['-c', 'import pandas'], { stdio: 'ignore' }); return true; } catch { return false; } })();

test('integración: el motor Python real escribe evaluaciones SIMULADO', { skip: hayPandas ? false : 'python3 con pandas no disponible' }, async () => {
  const dir = mkdtempSync(join(tmpdir(), 'eva-sem-'));
  const archivo = join(dir, 'eva.db');
  const bd = abrir(archivo);
  try {
    preparar(bd);
    const r = await correrMotor(archivo, true);
    assert.equal(r.canal, 'SIMULADO');
    assert.ok(r.filas_escritas > 0);
    await conServidor(async (b) => {
      const { j } = await get(b, '/api/padecimientos/semaforo');
      const sims = j.tripulantes.filter((t: any) => /^SIM-T0\d$/.test(t.id));
      assert.ok(sims.length >= 1);
      assert.ok(sims.every((t: any) => t.simulado === true && t.semaforo.length === 20));
      assert.equal(j.vacio, false);
    }, bd);
  } finally {
    bd.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
