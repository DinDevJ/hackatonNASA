/**
 * Modo simulación: el backend de Sistema/ arrancado con la carpeta Simulacion/ sirve el simulador
 * visual, el escenario sintético de las interfaces y el reinicio de la demo. Todos los datos de
 * estas pruebas son SINTÉTICOS.
 */
import { test, beforeEach } from 'node:test';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import { abrir, type BD } from '../../Sistema/backend/src/db.ts';
import { cargarInicial } from '../../Sistema/backend/src/semillas.ts';
import { reiniciarEstados } from '../../Sistema/backend/src/ingesta.ts';

const ruta = (rel: string) => fileURLToPath(new URL(rel, import.meta.url));
const SIMULACION = ruta('..');
let db: BD;

beforeEach(() => {
  reiniciarEstados();
  db = abrir(':memory:');
  cargarInicial(db, ruta('../../Sistema/backend/semillas/inicial.json'));
});

async function conServidor(f: (base: string) => Promise<void>) {
  const { construir } = await import('../../Sistema/backend/src/servidor.ts');
  const srv = construir(db, { modo: 'simulacion', simulacion: SIMULACION });
  await new Promise<void>((ok) => srv.listen(0, '127.0.0.1', ok));
  try { await f(`http://127.0.0.1:${(srv.address() as { port: number }).port}`); }
  finally { await new Promise((ok) => srv.close(ok)); }
}

test('simulador: el PC abre la computadora central desde el mismo origen, sin quitar las otras interfaces', async () => {
  await conServidor(async (base) => {
    const r = await fetch(`${base}/simulador`);
    assert.equal(r.status, 200);
    const html = await r.text();
    assert.match(html, /pc:\s*\{\s*url:\s*'\/app\/central\.html'/);
    assert.match(html, /cel:\s*\{\s*url:\s*'\/app\/'/);
    assert.match(html, /tierra:\s*\{\s*url:\s*'\/app\/base\.html'/);
    assert.match(html, /class="equipo" data-id="pc"/);
    assert.match(html, /reloj:\s*\{\s*url:\s*'\/reloj\/\?embebido&persona=MS-2'/);
    assert.match(html, /id="b-compartida"/);
    assert.match(html, /src="\/app\/central\.html"[^>]*title="Pantalla de la laptop/);
    assert.match(html, /src="\/app\/base\.html"[^>]*title="Pantalla de Tierra/);
  });
});

test('escenario: las interfaces reciben el escenario sintético sólo por /escenario/, rotulado como simulación', async () => {
  await conServidor(async (base) => {
    const salud = await (await fetch(`${base}/api/salud`)).json() as { modo: string };
    assert.equal(salud.modo, 'simulacion');
    assert.match(await (await fetch(`${base}/app/config.js`)).text(), /"modo":"simulacion","escenario":"escenario\/"/);
    for (const p of ['/app/escenario/datos.js', '/interfaces/eva/escenario/datos.js']) {
      const x = await fetch(`${base}${p}`);
      assert.equal(x.status, 200, p);
      assert.match(await x.text(), /SIMULADOS[\s\S]*window\.DATOS =/, p);
    }
    const demo = await fetch(`${base}/app/escenario/demo.js`);
    assert.equal(demo.status, 200);
    await demo.arrayBuffer();
    // Nada fuera de escenarios/interfaces/.
    for (const p of ['/app/escenario/..%2F..%2Fpackage.json', '/app/escenario/..%2F..%2F..%2FSistema%2Fbackend%2Fpackage.json']) {
      const x = await fetch(`${base}${p}`);
      assert.equal(x.status, 404, p);
      await x.arrayBuffer();
    }
    // El distintivo de simulación lo pone modo.js, que cargan todas las pantallas.
    const modo = await (await fetch(`${base}/app/modo.js`)).text();
    assert.match(modo, /Simulación · datos sintéticos/);
  });
});

test('demo: el reinicio de la misión funciona en simulación', async () => {
  await conServidor(async (base) => {
    const r = await fetch(`${base}/api/demo/reiniciar`, { method: 'POST' });
    assert.equal(r.status, 200);
    assert.deepEqual(await r.json(), { ok: true });
  });
});

test('generador: rellena la central con tramas sintéticas y LUNNA las evalúa', { timeout: 120_000 }, async () => {
  await conServidor(async (base) => {
    const salida = await new Promise<string>((ok, mal) => {
      const p = spawn(process.execPath, ['--experimental-strip-types', '--disable-warning=ExperimentalWarning',
        ruta('../generador/simulador.ts'), '--url', base, '--dias', '20', '--por-dia', '4', '--sin-vivo'], { stdio: ['ignore', 'pipe', 'pipe'] });
      let out = '';
      p.stdout.on('data', (d) => { out += d; });
      p.stderr.on('data', (d) => { out += d; });
      p.on('error', mal);
      p.on('close', (c) => (c === 0 ? ok(out) : mal(new Error(`generador salió con ${c}:\n${out}`))));
    });
    assert.match(salida, /Alertas generadas por LUNNA: \d+/);
    const n = (db.prepare('SELECT COUNT(*) AS n FROM muestras').get() as { n: number }).n;
    assert.ok(n > 0, 'hay muestras');
  });
});
