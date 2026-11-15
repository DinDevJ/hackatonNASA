/**
 * Modelos de eco/ECG desde la central: cola, procesos, validaciones y puente a eva.db.
 * Capa 1 (siempre): python FALSO (test/fixtures/python-falso.mjs). Capa 2 (semi-real) y 3 (real ECG): se saltan si no hay
 * los pythons de /tmp/nasa-linux-envs (o PYTHON_APP_TEST) o falta motor/puente_modelos.py.
 */
import { test, beforeEach, afterEach } from 'node:test';
import { fileURLToPath } from 'node:url';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { abrir, type BD } from '../src/db.ts';
import { cargarInicial } from '../src/semillas.ts';
import { migrarSalud, sembrarSalud } from '../src/salud.ts';
import { reiniciarEstados } from '../src/ingesta.ts';
import type { OpcionesModelos } from '../src/modelos.ts';

const ruta = (rel: string) => fileURLToPath(new URL(rel, import.meta.url));
const FALSO = ruta('./fixtures/python-falso.mjs');
const falso = { cmd: process.execPath, args: [FALSO] };
const PROTO_REAL = ruta('../../../../prototipo-salud');
const PY_APP = process.env.PYTHON_APP_TEST ?? '/tmp/nasa-linux-envs/app/bin/python';
const ENVS = '/tmp/nasa-linux-envs';
const hayPuente = existsSync(join(PROTO_REAL, 'motor', 'puente_modelos.py'));

let tmp: string, db: BD, dbRuta: string;
beforeEach(() => {
  reiniciarEstados();
  tmp = mkdtempSync(join(tmpdir(), 'eva-modelos-'));
  dbRuta = join(tmp, 'eva.db');
  db = abrir(dbRuta);
  cargarInicial(db, ruta('../semillas/inicial.json'));
  migrarSalud(db);
  sembrarSalud(db);
  base.tripulante = primerTripulante();
  delete process.env.FALSO_MODO; delete process.env.FALSO_REGISTRO; delete process.env.FALSO_PIDFILE; delete process.env.FALSO_RETRASO_MS;
});
afterEach(() => { try { db.close(); } catch { /* ya cerrada */ } rmSync(tmp, { recursive: true, force: true }); });

/** PROTOTIPO_DIR falso con manifests mínimos y muestras (más intentos de escape). */
function protoFalso() {
  const p = join(tmp, 'proto');
  const man = (k: string, o: object) => { mkdirSync(join(p, 'adapters', k), { recursive: true }); writeFileSync(join(p, 'adapters', k, 'manifest.json'), JSON.stringify({ key: k, ...o })); };
  man('echonet_dynamic', { nombre: 'EchoNet-Dynamic', timeout_s: 1800, modalidades_admitidas: ['video_2d'], vistas_admitidas: ['A4C'] });
  man('ecg', { nombre: 'ECG (NeuroKit2)', timeout_s: 600, modalidades_admitidas: ['ecg_1d'], vistas_admitidas: ['cualquiera'] });
  man('medsam2', { nombre: 'MedSAM2', modalidades_admitidas: ['video_2d'], vistas_admitidas: ['cualquiera'] });
  mkdirSync(join(p, 'adapters', 'roto')); writeFileSync(join(p, 'adapters', 'roto', 'manifest.json'), '{ no es json');
  const m = join(p, 'samples');
  mkdirSync(join(m, 'sub'), { recursive: true });
  for (const n of ['eco1.avi', 'eco2.mp4', 'ecg1.hea', 'ecg1.dat', 'ecg1.atr', 'notas.txt']) writeFileSync(join(m, n), 'x');
  writeFileSync(join(tmp, 'secreto.hea'), 'fuera');
  try { symlinkSync(join(tmp, 'secreto.hea'), join(m, 'enlace.hea')); } catch { /* sin permisos para enlaces */ }
  return { p, m, raw: join(tmp, 'raw') };
}
const opciones = (o: Partial<OpcionesModelos> = {}): OpcionesModelos => {
  const f = protoFalso();
  return { prototipoDir: f.p, python: falso, muestrasDir: f.m, rawDir: f.raw, envsDir: join(tmp, 'envs'), timeoutS: 30, margenS: 5, reintentoMs: 50, ...o };
};

async function conServidor(f: (base: string) => Promise<void>, op: OpcionesModelos, bd: BD = db) {
  const { construir } = await import('../src/servidor.ts');
  const srv = construir(bd, { modelos: op });
  await new Promise<void>((ok) => srv.listen(0, '127.0.0.1', ok));
  try { await f(`http://127.0.0.1:${(srv.address() as { port: number }).port}`); }
  finally { await new Promise((ok) => { srv.close(ok); srv.closeAllConnections(); }); }
}
const get = async (base: string, p: string) => { const r = await fetch(base + p); return { estado: r.status, j: await r.json() as any }; };
const post = async (base: string, cuerpo: unknown) => {
  const r = await fetch(base + '/api/modelos/analizar', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(cuerpo) });
  return { estado: r.status, j: await r.json() as any };
};
const n = (tabla: string) => (db.prepare(`SELECT COUNT(*) AS n FROM ${tabla}`).get() as any).n as number;
const pausa = (ms: number) => new Promise((ok) => setTimeout(ok, ms));
async function esperar(base: string, id: string, listo: (t: any) => boolean, ms = 20000) {
  const fin = Date.now() + ms;
  for (;;) {
    const { j } = await get(base, `/api/modelos/trabajos/${id}`);
    if (listo(j)) return j;
    if (Date.now() > fin) throw new Error(`trabajo ${id} no llegó al estado esperado: ${JSON.stringify(j).slice(0, 400)}`);
    await pausa(40);
  }
}
const terminado = (t: any) => t.estado === 'ok' || t.estado === 'error';
const vivo = (pid: number) => { try { process.kill(pid, 0); return true; } catch { return false; } };
const base = { tripulante: '', modelo: 'echonet_dynamic', archivo: 'eco1.avi', vista: 'A4C', simulado: true };
const primerTripulante = () => (db.prepare('SELECT id FROM tripulantes ORDER BY id').get() as any).id as string;

test('disponibles: modelos, muestras seguras y sin rutas absolutas', async () => {
  const op = opciones();
  await conServidor(async (b) => {
    const { estado, j } = await get(b, '/api/modelos/disponibles');
    assert.equal(estado, 200);
    assert.match(j.aviso, /No es un diagnóstico/);
    assert.deepEqual(j.modelos.map((m: any) => [m.key, m.tipo, m.analizable]), [['ecg', 'ecg', true], ['echonet_dynamic', 'eco', true], ['medsam2', 'otro', false]]);
    const eco = j.modelos.find((m: any) => m.key === 'echonet_dynamic');
    assert.deepEqual(eco.vistas_admitidas, ['A4C']);
    assert.equal(eco.entorno_instalado, false);
    assert.deepEqual(j.muestras.map((x: any) => [x.archivo, x.tipo, x.modalidad]), [['ecg1.hea', 'ecg', 'ecg_1d'], ['eco1.avi', 'eco', 'video_2d'], ['eco2.mp4', 'eco', 'video_2d']]);
    assert.equal(j.muestras_dir, 'samples');
    assert.doesNotMatch(JSON.stringify(j), new RegExp(tmp.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }, op);
});

test('analizar: 202, en_cola→corriendo→ok, puente, re-evaluación y lista', async () => {
  const op = opciones();
  await conServidor(async (b) => {
    process.env.FALSO_RETRASO_MS = '400';
    const nM = n('muestras'), nE = n('evaluaciones');
    const r = await post(b, { ...base });
    assert.equal(r.estado, 202);
    assert.equal(r.j.estado, 'en_cola');
    assert.equal(r.j.simulado, true);
    assert.equal(r.j.timeout_s, 30);
    assert.match(r.j.aviso, /No es un diagnóstico/);
    const corr = await esperar(b, r.j.id, (t) => t.estado === 'corriendo');
    assert.equal(corr.fase, 'modelo');
    const ok = await esperar(b, r.j.id, terminado);
    assert.equal(ok.estado, 'ok', JSON.stringify(ok));
    assert.equal(ok.fase, 'fin');
    assert.equal(ok.salida.status_run, 'ok');
    assert.ok(ok.salida.warnings.length <= 5);
    assert.match(ok.run_dir, /^raw\/2026/);
    assert.equal(ok.resultado.ok, true);
    assert.equal(ok.resultado.valores[0].variable_id, '01:V18');
    assert.equal(ok.semaforo.reevaluado, true);
    assert.equal(ok.semaforo.cambios.length, 1);
    assert.equal(ok.semaforo.cambios[0].antes, 'GRIS');
    assert.equal(ok.semaforo.cambios[0].despues, 'AMARILLO');
    assert.equal(n('muestras'), nM + 1);
    assert.ok(n('evaluaciones') > nE);
    assert.doesNotMatch(JSON.stringify(ok), new RegExp(tmp.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    const lista = await get(b, '/api/modelos/trabajos');
    assert.equal(lista.j[0].id, r.j.id);
    assert.equal((await get(b, '/api/modelos/trabajos/noexiste')).estado, 404);
  }, op);
});

test('cola: dos trabajos del mismo modelo no corren a la vez; modelos distintos sí', async () => {
  const op = opciones();
  await conServidor(async (b) => {
    process.env.FALSO_RETRASO_MS = '700';
    const a = await post(b, { ...base });
    const c = await post(b, { ...base, archivo: 'eco2.mp4' });
    const e = await post(b, { tripulante: base.tripulante, modelo: 'ecg', archivo: 'ecg1.hea', simulado: true });
    assert.equal([a, c, e].every((x) => x.estado === 202), true);
    await esperar(b, a.j.id, (t) => t.estado === 'corriendo');
    assert.equal((await get(b, `/api/modelos/trabajos/${c.j.id}`)).j.estado, 'en_cola');
    await esperar(b, e.j.id, (t) => t.estado === 'corriendo');   // otro modelo, en paralelo con el primero
    assert.equal((await get(b, `/api/modelos/trabajos/${a.j.id}`)).j.estado, 'corriendo');
    for (const x of [a, c, e]) assert.equal((await esperar(b, x.j.id, terminado)).estado, 'ok');
    const ta = (await get(b, `/api/modelos/trabajos/${a.j.id}`)).j, tc = (await get(b, `/api/modelos/trabajos/${c.j.id}`)).j;
    assert.ok(Date.parse(tc.iniciado) >= Date.parse(ta.terminado) - 5, 'el 2º empieza cuando termina el 1º');
  }, op);
});

test('timeout: error «Tiempo agotado» y el árbol de procesos muere', async () => {
  const op = opciones({ timeoutS: 1, margenS: 0.5 });
  const pidfile = join(tmp, 'pids.json');
  process.env.FALSO_MODO = 'dormir'; process.env.FALSO_PIDFILE = pidfile;
  await conServidor(async (b) => {
    const nM = n('muestras');
    const r = await post(b, { ...base });
    const t = await esperar(b, r.j.id, terminado, 15000);
    assert.equal(t.estado, 'error');
    assert.equal(t.error, 'Tiempo agotado (1 s)');
    const { hijo, nieto } = JSON.parse(readFileSync(pidfile, 'utf8'));
    for (let i = 0; i < 50 && (vivo(hijo) || vivo(nieto)); i++) await pausa(100);
    assert.equal(vivo(hijo), false, 'el hijo debe estar muerto');
    assert.equal(vivo(nieto), false, 'el nieto debe estar muerto');
    assert.equal(n('muestras'), nM);
  }, op);
});

test('archivo: traversal, rutas absolutas, symlink y NUL → 400 y no aparecen en disponibles', async () => {
  const op = opciones();
  await conServidor(async (b) => {
    const malos = ['../x', '..\\x', '/etc/passwd', 'C:\\x', 'sub/x', '..', '.', 'a\u0000.avi', 'enlace.hea', 'sub', 'notas.txt', 'nada.avi'];
    for (const archivo of malos) {
      const modelo = archivo.endsWith('.hea') ? 'ecg' : 'echonet_dynamic';
      const r = await post(b, { ...base, modelo, archivo });
      assert.equal(r.estado, 400, `${JSON.stringify(archivo)} → ${r.estado}`);
    }
    const lista = (await get(b, '/api/modelos/disponibles')).j.muestras.map((x: any) => x.archivo);
    assert.ok(!lista.includes('enlace.hea') && !lista.includes('notas.txt') && !lista.includes('ecg1.dat'));
    assert.equal((await get(b, '/api/modelos/trabajos')).j.length, 0);
  }, op);
});

test('validaciones del cuerpo', async () => {
  const op = opciones();
  await conServidor(async (b) => {
    assert.equal((await post(b, { ...base, simulado: 'true' })).estado, 400);
    const sinSim: any = { ...base }; delete sinSim.simulado;
    assert.equal((await post(b, sinSim)).estado, 400);
    const sinVista: any = { ...base }; delete sinVista.vista;
    const v = await post(b, sinVista);
    assert.equal(v.estado, 400); assert.match(v.j.error, /vista/);
    assert.equal((await post(b, { ...base, vista: 'PLAX' })).estado, 400);
    assert.equal((await post(b, { ...base, prueba_carga: 'si' })).estado, 400);
    const tipo = await post(b, { ...base, modelo: 'ecg' });          // video con modelo ECG
    assert.equal(tipo.estado, 400); assert.match(tipo.j.error, /tipo/);
    assert.equal((await post(b, { ...base, modelo: 'echonet_dynamic', archivo: 'ecg1.hea' })).estado, 400);
    assert.equal((await post(b, { ...base, tripulante: 'NOEXISTE' })).estado, 404);
    assert.equal((await post(b, { ...base, modelo: 'nada' })).estado, 404);
    assert.equal((await post(b, { ...base, modelo: 'medsam2' })).estado, 400);
    assert.equal((await post(b, { ...base, modelo: '../ecg' })).estado, 400);
    assert.equal((await post(b, [])).estado, 400);
    assert.equal((await get(b, '/api/modelos/trabajos')).j.length, 0);
  }, op);
});

test('BD en memoria → 409', async () => {
  const mem = abrir(':memory:');
  cargarInicial(mem, ruta('../semillas/inicial.json')); migrarSalud(mem);
  await conServidor(async (b) => { assert.equal((await post(b, { ...base })).estado, 409); }, opciones(), mem);
  mem.close();
});

test('error del run y rechazo: estado error, puente NO llamado, 0 filas nuevas', async () => {
  const op = opciones();
  const reg = join(tmp, 'reg.jsonl');
  process.env.FALSO_REGISTRO = reg;
  await conServidor(async (b) => {
    const nM = n('muestras'), nE = n('evaluaciones');
    process.env.FALSO_MODO = 'error';
    const t1 = await esperar(b, (await post(b, { ...base })).j.id, terminado);
    assert.equal(t1.estado, 'error');
    assert.match(t1.error, /código 1.*sin resultado/);
    process.env.FALSO_MODO = 'rechazado';
    const t2 = await esperar(b, (await post(b, { ...base })).j.id, terminado);
    assert.equal(t2.estado, 'error');
    assert.match(t2.error, /^rechazado: Análisis no implementado/);
    assert.equal(n('muestras'), nM); assert.equal(n('evaluaciones'), nE);
    const llamadas = readFileSync(reg, 'utf8').trim().split('\n').map((l) => JSON.parse(l).modulo);
    assert.deepEqual(llamadas, ['core.run_model', 'core.run_model']);
  }, op);
});

test('python inexistente → error claro', async () => {
  const op = opciones({ python: { cmd: join(tmp, 'no-hay-python'), args: [] } });
  await conServidor(async (b) => {
    const t = await esperar(b, (await post(b, { ...base })).j.id, terminado);
    assert.equal(t.estado, 'error');
    assert.match(t.error, /No se encontró el intérprete de Python/);
  }, op);
});

test('ECG con python falso: valores con experimental y prueba de carga marcada', async () => {
  const op = opciones();
  await conServidor(async (b) => {
    const t = await esperar(b, (await post(b, { tripulante: base.tripulante, modelo: 'ecg', archivo: 'ecg1.hea', simulado: true, prueba_carga: true })).j.id, terminado);
    assert.equal(t.estado, 'ok', JSON.stringify(t));
    assert.equal(t.prueba_carga, true);
    assert.equal(t.salida.random_load_test, true);
    assert.equal(t.salida.status_run, 'prueba_carga');
    assert.equal(t.resultado.tipo, 'ecg');
    assert.ok(t.resultado.valores.some((v: any) => v.experimental === true));
  }, op);
});

// ── Capa 2: runner falso + python REAL de la app + puente real + prototipo-salud real ──
const semiReal = !(existsSync(PY_APP) && hayPuente);
const motivoSemi = !hayPuente ? 'falta prototipo-salud/motor/puente_modelos.py' : `no existe ${PY_APP} (o PYTHON_APP_TEST)`;
const semi = () => opciones({ prototipoDir: PROTO_REAL, python: { cmd: PY_APP, args: [] }, runner: falso, timeoutS: 60 });

test('SEMI-REAL eco: 01:V18 modelo_eco en muestras + evaluaciones escritas + semáforo reevaluado', { skip: semiReal && motivoSemi, timeout: 120000 }, async () => {
  // El runner es FALSO (datos de prueba en una BD temporal); se pide canal «real» solo para ejercitar la escritura de evaluaciones.
  await conServidor(async (b) => {
    const nM = n('muestras'), nE = n('evaluaciones');
    const t = await esperar(b, (await post(b, { ...base, simulado: false })).j.id, terminado, 100000);
    assert.equal(t.estado, 'ok', JSON.stringify(t));
    const m = db.prepare(`SELECT variable, procedencia, valor, unidad, calidad FROM muestras WHERE procedencia = 'modelo_eco'`).all() as any[];
    assert.equal(m.length, 1);
    assert.equal(m[0].variable, '01:V18');
    assert.equal(JSON.parse(m[0].calidad).simulado, false);
    assert.equal(n('muestras'), nM + 1);
    assert.equal(t.semaforo.reevaluado, true, JSON.stringify(t.semaforo));
    assert.ok(n('evaluaciones') > nE, JSON.stringify(t.semaforo.cambios) + ' ' + nE + ' ' + n('evaluaciones'));
  }, semi());
});

test('SEMI-REAL eco SIMULADO: la muestra queda marcada y el canal real la ignora (G1)', { skip: semiReal && motivoSemi, timeout: 120000 }, async () => {
  await conServidor(async (b) => {
    const nE = n('evaluaciones');
    const t = await esperar(b, (await post(b, { ...base, simulado: true })).j.id, terminado, 100000);
    assert.equal(t.estado, 'ok', JSON.stringify(t));
    const m = db.prepare(`SELECT calidad FROM muestras WHERE procedencia = 'modelo_eco'`).all() as any[];
    assert.equal(m.length, 1);
    assert.equal(JSON.parse(m[0].calidad).simulado, true);
    assert.equal(t.simulado, true);
    assert.equal(t.semaforo.reevaluado, true);
    assert.equal(n('evaluaciones'), nE, 'el canal real no escribe evaluaciones a partir de un dato simulado');
    assert.deepEqual(t.semaforo.cambios, []);
  }, semi());
});

test('SEMI-REAL ECG: filas modelo_ecg y valores con experimental donde aplica', { skip: semiReal && motivoSemi, timeout: 120000 }, async () => {
  await conServidor(async (b) => {
    const t = await esperar(b, (await post(b, { tripulante: base.tripulante, modelo: 'ecg', archivo: 'ecg1.hea', simulado: true })).j.id, terminado, 100000);
    assert.equal(t.estado, 'ok', JSON.stringify(t));
    assert.equal(t.resultado.tipo, 'ecg');
    const filas = db.prepare(`SELECT variable FROM muestras WHERE procedencia = 'modelo_ecg'`).all() as any[];
    assert.ok(filas.length > 0 && filas.length === t.resultado.guardadas, `${filas.length} vs ${t.resultado.guardadas}`);
    assert.ok(t.resultado.valores.some((v: any) => v.experimental === true));
  }, semi());
});

// ── Capa 3: todo real (ECG, sin pesos ni GPU) ──
const ecgReal = !(existsSync(join(ENVS, 'ecg', 'bin', 'python')) && existsSync(PY_APP) && hayPuente);
test('REAL ECG: ecg_normal_mitdb100 con NeuroKit2 → ok con valores reales (SIMULADO)', { skip: ecgReal && 'faltan /tmp/nasa-linux-envs/{app,ecg} o el puente', timeout: 600000 }, async () => {
  const op: OpcionesModelos = { prototipoDir: PROTO_REAL, python: { cmd: PY_APP, args: [] }, envsDir: ENVS, muestrasDir: join(PROTO_REAL, 'samples'),
    rawDir: join(tmp, 'raw'), normalizedCsv: join(tmp, 'normalized.csv'), timeoutS: 500, margenS: 60 };
  await conServidor(async (b) => {
    const d = (await get(b, '/api/modelos/disponibles')).j;
    assert.equal(d.modelos.find((m: any) => m.key === 'ecg').entorno_instalado, true);
    const t = await esperar(b, (await post(b, { tripulante: base.tripulante, modelo: 'ecg', archivo: 'ecg_normal_mitdb100.hea', simulado: true })).j.id, terminado, 580000);
    assert.equal(t.estado, 'ok', JSON.stringify(t));
    assert.equal(t.salida.status_run, 'ok');
    assert.equal(t.salida.inferencia_real, true);
    assert.equal(t.simulado, true);
    const fc = t.resultado.valores.find((v: any) => v.metrica === 'heart_rate');
    assert.ok(fc && typeof fc.valor === 'number' && fc.valor > 30 && fc.valor < 200, JSON.stringify(fc));
    assert.ok(existsSync(join(tmp, 'normalized.csv')));
  }, op);
});
