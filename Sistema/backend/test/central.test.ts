/**
 * Las interfaces de los dispositivos (Sistema/interfaces/) servidas por el backend desde el mismo
 * origen: /desktop (central), /desktop/tierra (base), /mobile y /watch; la central sólo usa rutas que
 * el backend ofrece de verdad. Las ventanas del simulador se prueban en Simulacion/test/.
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

/** Recursos .js y .css que carga una página, resueltos contra su URL. */
const recursosDe = (html: string, pagina: string) =>
  [...html.matchAll(/(?:src|href)="([^"#:]+\.(?:js|css))(?:\?[^"]*)?"/g)].map((m) => ({ rel: m[1]!, url: new URL(m[1]!, pagina).href }));

test('dispositivos: /desktop, /desktop/tierra, /mobile y /watch sirven su pantalla y todos sus archivos', async () => {
  await conServidor(async (base) => {
    for (const [ruta, titulo, propios] of [
      ['/desktop/', /Computadora central/, ['central-vivo.js', 'central.js', 'consola.js']],
      ['/desktop/tierra', /Base en Tierra/i, ['base.js', 'consola.js']],
      ['/mobile/', /Lunna/, ['app.js', 'modulos.js', 'telefono-vivo.js']],
      ['/watch/', /Lunna · Reloj/, ['reloj.js', 'reloj.css']],
    ] as const) {
      const r = await fetch(`${base}${ruta}`);
      assert.equal(r.status, 200, ruta);
      assert.match(r.headers.get('content-type') ?? '', /text\/html/, ruta);
      const html = await r.text();
      assert.match(html, titulo, ruta);
      const recursos = recursosDe(html, `${base}${ruta}`);
      for (const p of propios) assert.ok(recursos.some((x) => x.rel === p), `${ruta} carga ${p}`);
      assert.ok(recursos.some((x) => x.rel === '../comun/modo.js'), `${ruta} carga ../comun/modo.js`);
      for (const rec of recursos) {
        const x = await fetch(rec.url);
        assert.equal(x.status, 200, `${ruta} → ${rec.rel}`);
        await x.arrayBuffer();
      }
    }
    // Sin barra final llevan a la ruta con barra (las rutas relativas dependen de ella).
    for (const [p, destino] of [['/desktop', '/desktop/'], ['/mobile', '/mobile/'], ['/watch', '/watch/'], ['/desktop/tierra/', '/desktop/tierra']]) {
      const x = await fetch(`${base}${p}`, { redirect: 'manual' });
      assert.equal(x.status, 301, p);
      assert.equal(x.headers.get('location'), destino, p);
      await x.arrayBuffer();
    }
    const t = await fetch(`${base}/tierra`);
    assert.equal(t.status, 200);
    await t.arrayBuffer();
  });
});

test('central: sólo llama a rutas del backend que existen, con la forma que espera', async () => {
  const fuente = readFileSync(ruta('../../interfaces/desktop/central-vivo.js'), 'utf8');
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

test('interfaces: sólo sus carpetas quedan expuestas', async () => {
  await conServidor(async (base) => {
    for (const p of ['/desktop/..%2F..%2Fbackend%2Fpackage.json', '/comun/..%2F..%2Fbackend%2Fpackage.json',
      '/watch/..%2Fdesktop%2F..%2F..%2Fbackend%2Fpackage.json', '/interfaces/desktop/central.html', '/backend/package.json',
      '/app/..%2F..%2Fbackend%2Fpackage.json', '/app/no-existe.js', '/maquetas/Julio/backend/package.json']) {
      const x = await fetch(`${base}${p}`);
      assert.equal(x.status, 404, p);
      await x.arrayBuffer();
    }
  });
});

test('compatibilidad: /app/…, /reloj y /maquetas/… llevan a la ruta nueva', async () => {
  await conServidor(async (base) => {
    for (const [vieja, nueva] of [
      ['/app', '/mobile/'], ['/app/', '/mobile/'], ['/app/?demo=30&idioma=en', '/mobile/?demo=30&idioma=en'],
      ['/app/index.html', '/mobile/'], ['/app/central.html', '/desktop/'], ['/app/base.html', '/desktop/tierra'],
      ['/app/central.html#tripulante/MS-2', '/desktop/'],
      ['/app/central-vivo.js', '/desktop/central-vivo.js'], ['/app/app.js', '/mobile/app.js'], ['/app/motor.js', '/comun/motor.js'],
      ['/app/config.js', '/comun/config.js'],
      ['/reloj', '/watch/'], ['/reloj/', '/watch/'], ['/reloj/?embebido&persona=MS-2', '/watch/?embebido&persona=MS-2'],
      ['/maquetas/Fani/maqueta-reloj/reloj.js', '/watch/reloj.js'], ['/maquetas/Leo/maqueta-eva/central.html', '/desktop/'],
    ]) {
      const r = await fetch(`${base}${vieja}`, { redirect: 'manual' });
      assert.equal(r.status, 302, vieja);
      assert.equal(r.headers.get('location'), nueva, vieja);
      await r.arrayBuffer();
      const fin = await fetch(`${base}${vieja}`);
      assert.equal(fin.status, 200, `${vieja} termina en 200`);
      await fin.arrayBuffer();
    }
  });
});

test('vista limpia: los controles de la simulación se quitan en modo.js, salvo en la demo', () => {
  const modo = readFileSync(ruta('../../interfaces/comun/modo.js'), 'utf8');
  assert.match(modo, /classList\.add\("vista-limpia"\)/);
  for (const sel of ['.cn-pildora.sim', '#cn-enlace', '#cn-dia', '.cn-ctrl a.cn-boton', '.cn-separa', '.aj-demo']) {
    assert.ok(modo.includes(`html.vista-limpia ${sel}`), sel);
  }
  assert.match(modo, /if \(sim && !limpia\)/);     // el cintillo de simulación sólo en ?demo
  const reloj = readFileSync(ruta('../../interfaces/watch/reloj.js'), 'utf8');
  assert.match(reloj, /classList\.contains\("vista-limpia"\)/);
});

test('modo operativo (por defecto): sin simulador, sin escenario sintético y sin reinicio de la demo', async () => {
  await conServidor(async (base) => {
    const salud = await (await fetch(`${base}/api/salud`)).json() as { modo: string };
    assert.equal(salud.modo, 'operativo');
    const config = await (await fetch(`${base}/comun/config.js`)).text();
    assert.match(config, /"modo":"operativo"/);
    assert.match(config, /"escenario":null/);
    for (const p of ['/simulador', '/comun/escenario/datos.js', '/comun/escenario/demo.js', '/app/escenario/datos.js',
      '/app/datos.js', '/app/demo.js', '/mobile/datos.js', '/desktop/datos.js']) {
      const x = await fetch(`${base}${p}`);
      assert.equal(x.status, 404, p);
      await x.arrayBuffer();
    }
    const r = await fetch(`${base}/api/demo/reiniciar`, { method: 'POST' });
    assert.equal(r.status, 403);
    await r.arrayBuffer();
    // Ninguna página carga el escenario por su cuenta: sólo a través de modo.js.
    for (const p of ['/mobile/', '/desktop/', '/desktop/tierra', '/watch/']) {
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
