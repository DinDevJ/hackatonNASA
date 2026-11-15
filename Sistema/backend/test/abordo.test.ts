/**
 * A bordo: avisos de la CMO al teléfono, consultas de la central a Tierra y emergencias del teléfono
 * (src/abordo.ts). Las usan central.html, base.html y el teléfono de LUNNA.
 */
import { test, beforeEach } from 'node:test';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { abrir, type BD } from '../src/db.ts';
import { cargarInicial } from '../src/semillas.ts';
import { bus, reiniciarEstados } from '../src/ingesta.ts';
import { escribirEnlace, pulso } from '../src/enlace.ts';

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
const enviar = (base: string, metodo: string, r: string, cuerpo?: unknown) =>
  fetch(base + r, { method: metodo, headers: { 'content-type': 'application/json' }, body: cuerpo ? JSON.stringify(cuerpo) : undefined });

test('aviso de la CMO: llega al instante como evento "aviso" con origen a bordo', async () => {
  const vistos: Array<Record<string, unknown>> = [];
  const oye = (a: Record<string, unknown>) => vistos.push(a);
  bus.on('aviso', oye);
  try {
    await conServidor(async (base) => {
      const r = await enviar(base, 'POST', '/api/abordo/avisos', { para: 'ana', nivel: 'ambar', texto: 'Toma agua y descansa 20 min.', de: 'CMO (Mei)' });
      assert.equal(r.status, 200);
      const a = await r.json();
      assert.equal(a.origen, 'abordo');
      assert.equal(a.tipo, 'alerta');
      assert.deepEqual(a.datos, { nivel: 'ambar' });
      assert.equal(a.t_redactado, a.t_llegada, 'a bordo no hay retraso');
      const lista = await (await fetch(`${base}/api/abordo/avisos`)).json();
      assert.equal(lista.length, 1);
      assert.equal(lista[0].para, 'ana');
    });
    assert.equal(vistos.length, 1);
    assert.equal(vistos[0]!.para, 'ana');
  } finally { bus.off('aviso', oye); }
});

test('aviso de la CMO: rechaza tripulante inexistente, nivel inválido o texto vacío', async () => {
  await conServidor(async (base) => {
    assert.equal((await enviar(base, 'POST', '/api/abordo/avisos', { para: 'pepe', texto: 'hola' })).status, 400);
    assert.equal((await enviar(base, 'POST', '/api/abordo/avisos', { para: 'ana', nivel: 'verde', texto: 'hola' })).status, 400);
    assert.equal((await enviar(base, 'POST', '/api/abordo/avisos', { para: 'ana', texto: '  ' })).status, 400);
  });
});

test('consulta a Tierra: baja por el enlace con su prioridad y llega tras el OWLT', async () => {
  escribirEnlace(db, { owlt_s: 10, abierto: true });
  await conServidor(async (base) => {
    const r = await enviar(base, 'POST', '/api/central/consultas', { sobre: 'luis', nivel: 'ambar', texto: 'Presión 134/84 tres días seguidos. ¿Ajustamos?' });
    assert.equal(r.status, 200);
    const c = await r.json();
    assert.equal(c.sobre, 'luis');
    const fila = db.prepare(`SELECT * FROM bajada WHERE id = ?`).get(c.id) as { tipo: string; prioridad: number };
    assert.equal(fila.tipo, 'consulta');
    assert.equal(fila.prioridad, 1);
  });
  const t0 = new Date().toISOString();
  pulso(db, t0);                                            // sale de la nave
  assert.equal((db.prepare(`SELECT COUNT(*) AS n FROM bajada WHERE tipo = 'consulta' AND notificado = 1`).get() as { n: number }).n, 0);
  pulso(db, new Date(Date.parse(t0) + 11_000).toISOString()); // llega a Tierra
  assert.equal((db.prepare(`SELECT COUNT(*) AS n FROM bajada WHERE tipo = 'consulta' AND notificado = 1`).get() as { n: number }).n, 1);
});

test('emergencia: se registra, se avisa en vivo y baja a Tierra con prioridad 0; luego se cierra', async () => {
  const vistas: unknown[] = [];
  const oye = (e: unknown) => vistas.push(e);
  bus.on('emergencia', oye);
  try {
    await conServidor(async (base) => {
      const r = await enviar(base, 'POST', '/api/emergencias', {
        tripulante: 'ana', modo: 'automático', causa: 'SpO₂ cayó a 88 %',
        disparadores: [{ variable: 'SpO₂', valor: '88 %' }, { variable: 'Pulso', valor: '128 lpm' }],
      });
      assert.equal(r.status, 200);
      const e = await r.json();
      assert.equal(e.modo, 'automático');
      assert.equal(e.disparadores.length, 2);
      const baj = db.prepare(`SELECT * FROM bajada WHERE tipo = 'emergencia'`).get() as { prioridad: number };
      assert.equal(baj.prioridad, 0);
      const c = await (await enviar(base, 'PUT', `/api/emergencias/${e.id}`, { resultado: 'Signos recuperados; resuelto a bordo.' })).json();
      assert.equal(c.resultado, 'Signos recuperados; resuelto a bordo.');
      const lista = await (await fetch(`${base}/api/emergencias?tripulante=ana`)).json();
      assert.equal(lista.length, 1);
      assert.ok(lista[0].t_cierre);
      assert.equal((await enviar(base, 'POST', '/api/emergencias', { tripulante: 'ana', modo: 'pánico' })).status, 400);
    });
    assert.equal(vistas.length, 2, 'una al abrirla y otra al cerrarla');
  } finally { bus.off('emergencia', oye); }
});
