/**
 * La computadora central de LUNNA (Sistema/interfaces/eva/central.html) servida por el backend
 * desde el mismo origen (/app/central.html); la pantalla sólo usa rutas que el backend ofrece de
 * verdad. Las ventanas del simulador se prueban en Simulacion/test/.
 */
import { test, beforeEach } from 'node:test';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { abrir, type BD } from '../src/db.ts';
import { cargarInicial } from '../src/semillas.ts';
import { reiniciarEstados } from '../src/ingesta.ts';

const ruta = (rel: string) => fileURLToPath(new URL(rel, import.meta.url));
let db: BD;

beforeEach(() => {
  reiniciarEstados();
  db = abrir(':memory:');
  cargarInicial(db, ruta('../semillas/inicial.json'));
});

async function conServidor(f: (base: string) => Promise<void>) {
  const { construir } = await import('../src/servidor.ts');
  const srv = construir(db);
  await new Promise<void>((ok) => srv.listen(0, '127.0.0.1', ok));
  try { await f(`http://127.0.0.1:${(srv.address() as { port: number }).port}`); }
  finally { await new Promise((ok) => srv.close(ok)); }
}

test('central: el backend sirve la pantalla y todos sus archivos', async () => {
  await conServidor(async (base) => {
    const r = await fetch(`${base}/app/central.html`);
    assert.equal(r.status, 200);
    assert.match(r.headers.get('content-type') ?? '', /text\/html/);
    const html = await r.text();
    const recursos = [...html.matchAll(/(?:src|href)="([^"#:]+\.(?:js|css))(?:\?[^"]*)?"/g)].map((m) => m[1]!);
    assert.ok(recursos.includes('central-vivo.js') && recursos.includes('central.js'));
    for (const rec of recursos) {
      const x = await fetch(`${base}/app/${rec}`);
      assert.equal(x.status, 200, `/app/${rec}`);
      await x.arrayBuffer();
    }
    // Lo que no debe romperse: el teléfono y la base en Tierra.
    for (const p of ['/app/', '/app/base.html', '/tierra']) {
      const x = await fetch(`${base}${p}`);
      assert.equal(x.status, 200, p);
      await x.arrayBuffer();
    }
  });
});

test('central: sólo llama a rutas del backend que existen, con la forma que espera', async () => {
  const fuente = readFileSync(ruta('../../interfaces/eva/central-vivo.js'), 'utf8');
  // Todas las rutas /api/… que aparecen en llamadas del código (no en comentarios).
  const usadas = new Set([...fuente.matchAll(/["'`](\/api\/[a-z/]+)/g)].map((m) => m[1]!.replace(/\/$/, '')));
  assert.deepEqual([...usadas].sort(),
    ['/api/alertas', '/api/app', '/api/avisos', '/api/enlace', '/api/salud', '/api/stream', '/api/tierra/pendientes', '/api/tripulantes']);

  await conServidor(async (base) => {
    const pedir = async (p: string) => {
      const r = await fetch(`${base}${p}`);
      assert.equal(r.status, 200, p);
      return r.json() as Promise<any>;
    };
    assert.ok((await pedir('/api/salud')).version);
    const trips = await pedir('/api/tripulantes');
    assert.deepEqual(trips.map((t: { id: string }) => t.id).sort(), ['ana', 'luis', 'mei', 'tomas']);
    for (const t of trips) {
      const e = await pedir(`/api/app/${t.id}`);
      assert.equal(e.tripulante.id, t.id);
      assert.ok(Array.isArray(e.variables) && Array.isArray(e.alertas) && Array.isArray(e.avisos));
      for (const v of e.variables) {
        for (const k of ['id', 'nombre', 'unidad', 'valor', 't_scet', 'esperado', 'banda', 'z', 'estado', 'motivo', 'mediana_24h', 'calibrando', 'extrapolado', 'serie']) {
          assert.ok(k in v, `variable.${k}`);
        }
        assert.ok(['verde', 'ambar', 'rojo', 'sin_dato'].includes(v.estado));
      }
    }
    assert.ok(Array.isArray(await pedir('/api/alertas?limite=30')));
    assert.ok(Array.isArray(await pedir('/api/avisos')));
    const enlace = await pedir('/api/enlace');
    assert.equal(typeof enlace.owlt_s, 'number');
    assert.equal(typeof enlace.abierto, 'boolean');
    assert.deepEqual(Object.keys(await pedir('/api/tierra/pendientes')).sort(),
      ['avisos_en_cola_tierra', 'avisos_en_vuelo_a_nave', 'en_cola_nave', 'en_vuelo_a_tierra']);

    // El flujo de eventos responde como SSE.
    const ctl = new AbortController();
    const s = await fetch(`${base}/api/stream`, { signal: ctl.signal });
    assert.equal(s.status, 200);
    assert.match(s.headers.get('content-type') ?? '', /text\/event-stream/);
    ctl.abort();
  });
});

test('reloj: /reloj sirve el reloj con los estilos, la Lunna y el motor de eva/', async () => {
  await conServidor(async (base) => {
    const r = await fetch(`${base}/reloj/?embebido&persona=MS-2`, { redirect: 'manual' });
    assert.equal(r.status, 302);
    assert.equal(r.headers.get('location'), '/interfaces/reloj/?embebido&persona=MS-2');
    const pagina = `${base}/interfaces/reloj/`;
    const html = await (await fetch(pagina)).text();
    assert.match(html, /<title>Lunna · Reloj<\/title>/);
    const recursos = [...html.matchAll(/(?:src|href)="([^"#:]+\.(?:js|css))(?:\?[^"]*)?"/g)].map((m) => m[1]!);
    assert.ok(recursos.some((x) => x === '../eva/luna.js') && recursos.includes('reloj.js'));
    for (const rec of recursos) {
      const x = await fetch(new URL(rec, pagina));
      assert.equal(x.status, 200, rec);
      await x.arrayBuffer();
    }
    // Sólo las carpetas de las interfaces: nada más del repositorio queda expuesto.
    for (const p of ['/interfaces/backend/package.json', '/interfaces/reloj/..%2F..%2Fbackend%2Fpackage.json',
      '/interfaces/eva/..%2F..%2Fbackend%2Fpackage.json', '/maquetas/Julio/backend/package.json', '/maquetas/Leo/ingesta/package.json']) {
      const x = await fetch(`${base}${p}`);
      assert.equal(x.status, 404, p);
      await x.arrayBuffer();
    }
  });
});

test('compatibilidad: las rutas antiguas /maquetas/… llevan a /interfaces/…', async () => {
  await conServidor(async (base) => {
    for (const [vieja, nueva] of [
      ['/maquetas/Fani/maqueta-reloj/?embebido', '/interfaces/reloj/?embebido'],
      ['/maquetas/Fani/maqueta-reloj', '/interfaces/reloj/'],
      ['/maquetas/Fani/maqueta-reloj/reloj.js', '/interfaces/reloj/reloj.js'],
      ['/maquetas/Leo/maqueta-eva/central.html', '/interfaces/eva/central.html'],
    ]) {
      const r = await fetch(`${base}${vieja}`, { redirect: 'manual' });
      assert.equal(r.status, 301, vieja);
      assert.equal(r.headers.get('location'), nueva, vieja);
      await r.arrayBuffer();
    }
    const x = await fetch(`${base}/interfaces/eva/central.html`);
    assert.equal(x.status, 200);
    await x.arrayBuffer();
  });
});

test('modo operativo (por defecto): sin simulador, sin escenario sintético y sin reinicio de la demo', async () => {
  await conServidor(async (base) => {
    const salud = await (await fetch(`${base}/api/salud`)).json() as { modo: string };
    assert.equal(salud.modo, 'operativo');
    const config = await (await fetch(`${base}/app/config.js`)).text();
    assert.match(config, /"modo":"operativo"/);
    assert.match(config, /"escenario":null/);
    for (const p of ['/simulador', '/app/escenario/datos.js', '/app/escenario/demo.js', '/interfaces/eva/escenario/datos.js',
      '/app/datos.js', '/app/demo.js']) {
      const x = await fetch(`${base}${p}`);
      assert.equal(x.status, 404, p);
      await x.arrayBuffer();
    }
    const r = await fetch(`${base}/api/demo/reiniciar`, { method: 'POST' });
    assert.equal(r.status, 403);
    await r.arrayBuffer();
    // Ninguna página carga el escenario por su cuenta: sólo a través de modo.js.
    for (const p of ['/app/', '/app/central.html', '/app/base.html', '/interfaces/reloj/']) {
      const html = await (await fetch(`${base}${p}`)).text();
      assert.doesNotMatch(html, /src="[^"]*(datos|demo)\.js/, p);
      assert.match(html, /modo\.js/, p);
    }
  });
});

test('modo: un modo desconocido o la simulación sin su carpeta no arrancan', async () => {
  const { construir } = await import('../src/servidor.ts');
  assert.throws(() => construir(db, { modo: 'prueba' as never }), /modo inválido/);
  assert.throws(() => construir(db, { modo: 'simulacion' }), /necesita la carpeta Simulacion/);
});
