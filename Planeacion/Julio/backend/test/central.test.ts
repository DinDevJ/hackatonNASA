/**
 * La computadora central de LUNNA (Planeacion/Leo/maqueta-eva/central.html) integrada en el
 * simulador: el PC la abre desde el mismo origen (/app/central.html) y la pantalla sólo usa
 * rutas que el backend ofrece de verdad.
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

test('simulador: el PC abre la computadora central desde el mismo origen, sin quitar las otras interfaces', async () => {
  await conServidor(async (base) => {
    const html = await (await fetch(`${base}/simulador`)).text();
    assert.match(html, /pc:\s*\{\s*url:\s*'\/app\/central\.html'/);
    assert.match(html, /cel:\s*\{\s*url:\s*'\/app\/'/);
    assert.match(html, /tierra:\s*\{\s*url:\s*'\/app\/base\.html'/);
    assert.match(html, /class="equipo" data-id="pc"/);
  });
});

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
  const fuente = readFileSync(ruta('../../../Leo/maqueta-eva/central-vivo.js'), 'utf8');
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
