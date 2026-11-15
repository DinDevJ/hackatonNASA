import { test, beforeEach } from 'node:test';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { abrir, type BD } from '../src/db.ts';
import { cargarInicial } from '../src/semillas.ts';
import { ingerirBinaria, ingerirJson, prediccionPara, reiniciarEstados } from '../src/ingesta.ts';
import { codificar, type Esquema } from '../src/esquema.ts';

const TRAJE: Esquema = { id: 1, nombre: 'traje-v1', version: 1, campos: [
  { clave: 'fc', variable: '04:A4', tipo: 'u8' }, { clave: 'spo2', variable: '04:A3', tipo: 'u8' },
  { clave: 'fr', variable: '04:A2', tipo: 'u8' }, { clave: 'temp', variable: '04:A1', tipo: 'i16', escala: 0.01 },
] };
const T0 = '2027-01-01T00:00:00.000Z';
let db: BD;

beforeEach(() => {
  reiniciarEstados();
  db = abrir(':memory:');
  cargarInicial(db, fileURLToPath(new URL('../semillas/inicial.json', import.meta.url)));
  db.prepare(`INSERT INTO fases VALUES (?, 'orbita')`).run(T0);
  db.prepare(`INSERT INTO asignaciones (dispositivo, tripulante, desde) VALUES (102, 'ana', ?)`).run('2026-12-01T00:00:00Z');
});

const trama = (seq: number, t: string, fc = 60, disp = 102) =>
  codificar({ idDisp: disp, idEsquema: 1, seq, tScet: new Date(t) }, TRAJE, { fc, spo2: 98, fr: 14, temp: 36.6 });

test('una trama binaria se decodifica, se asigna a su tripulante y se guarda', () => {
  const r = ingerirBinaria(db, trama(1, '2027-01-02T10:00:00Z'));
  assert.deepEqual(r, { aceptadas: 4, duplicadas: 0, rechazos: [] });
  const m = db.prepare(`SELECT tripulante, valor, entorno FROM muestras WHERE variable = '04:A4'`).get() as Record<string, unknown>;
  assert.deepEqual({ ...m }, { tripulante: 'ana', valor: 60, entorno: 'orbita' });
});

test('un reenvío no duplica', () => {
  ingerirBinaria(db, trama(1, '2027-01-02T10:00:00Z'));
  const r = ingerirBinaria(db, trama(1, '2027-01-02T10:00:00Z'));
  assert.equal(r.duplicadas, 4);
  assert.equal(r.aceptadas, 0);
});

test('un dispositivo sin asignar se rechaza: no se adivina el tripulante', () => {
  const r = ingerirBinaria(db, trama(1, '2027-01-02T10:00:00Z', 60, 101));
  assert.match(r.rechazos[0]!, /sin asignar/);
});

test('JSON: un valor estimado sin método se rechaza', () => {
  const [r] = [ingerirJson(db, {
    frame: 'eva.telemetry.v1', source: { id: 'reloj-ana' }, subject: 'ana', t_scet: '2027-01-02T10:00:00Z', seq: 1,
    samples: [{ var: '04:A2', value: 14, origin: 'estimated' }],
  })];
  assert.match(r!.rechazos[0]!, /estimado necesita/);
});

test('LUNNA detecta la deriva tras la calibración, no durante', () => {
  // 14 días de calibración con FC estable en 57 (−8 % sobre el basal de 62).
  let seq = 0;
  for (let d = 0; d < 14; d++) for (let h = 0; h < 6; h++) {
    ingerirBinaria(db, trama(seq++, new Date(Date.parse(T0) + d * 864e5 + h * 4 * 36e5).toISOString(), 57));
  }
  assert.equal(db.prepare(`SELECT COUNT(*) AS n FROM alertas`).get()!.n, 0, 'sin alertas en calibración');
  const p = prediccionPara(db, 'ana', '04:A4', '2027-01-20T00:00:00Z')!;
  assert.equal(p.n_vuelo, 14);
  assert.ok(Math.abs(p.esperado - 57) < 1);

  // Día 20: la FC sube a 68.
  for (let h = 0; h < 6; h++) ingerirBinaria(db, trama(seq++, `2027-01-21T0${h}:00:00Z`, 68));
  const a = db.prepare(`SELECT estado FROM alertas ORDER BY id DESC`).get() as { estado: string };
  assert.equal(a.estado, 'rojo');
});

test('semillas incrementales: una base vieja recibe los dispositivos nuevos sin borrarse', () => {
  const vieja = abrir(':memory:');
  vieja.exec(`CREATE TABLE IF NOT EXISTS _x (a)`);
  const ruta = fileURLToPath(new URL('../semillas/inicial.json', import.meta.url));
  cargarInicial(vieja, ruta);
  vieja.prepare(`DELETE FROM dispositivos WHERE id IN (401, 302)`).run();   // simula una base anterior
  vieja.prepare(`UPDATE variables SET nombre = 'editado por el equipo' WHERE id = '04:A4'`).run();
  const { nuevos } = cargarInicial(vieja, ruta);
  assert.equal(nuevos.dispositivos, 2);
  assert.ok(vieja.prepare(`SELECT 1 FROM dispositivos WHERE id = 401`).get());
  const v = vieja.prepare(`SELECT nombre FROM variables WHERE id = '04:A4'`).get() as { nombre: string };
  assert.equal(v.nombre, 'editado por el equipo', 'no pisa lo que el equipo editó');
  const h = vieja.prepare(`SELECT COUNT(*) AS n FROM historial`).get() as { n: number };
  assert.equal(h.n, 1, 'el historial no se duplica al recargar');
});

test('enlace con Tierra: retraso de la luz, ventana cerrada y avisos de vuelta', async () => {
  const { escribirEnlace, encolarBajada, pulso, redactarAviso } = await import('../src/enlace.ts');
  escribirEnlace(db, { owlt_s: 20, abierto: false });
  encolarBajada(db, 'alerta', { x: 1 }, '2027-01-01T10:00:00.000Z', 0);
  redactarAviso(db, { para: 'ana', texto: 'Descansa hoy' });

  pulso(db, '2027-01-01T10:00:05.000Z');      // ventana cerrada: nada sale
  const b0 = db.prepare(`SELECT t_envio FROM bajada`).get() as { t_envio: string | null };
  assert.equal(b0.t_envio, null);

  escribirEnlace(db, { abierto: true });
  pulso(db, '2027-01-01T10:01:00.000Z');      // se abre: sale, llega 20 s después
  const b1 = db.prepare(`SELECT t_ert FROM bajada`).get() as { t_ert: string };
  assert.equal(b1.t_ert, '2027-01-01T10:01:20.000Z');

  pulso(db, '2027-01-01T10:01:10.000Z');      // aún en vuelo
  assert.equal((db.prepare(`SELECT entregado FROM subida`).get() as { entregado: number }).entregado, 0);
  pulso(db, '2027-01-01T10:01:21.000Z');      // llegó
  assert.equal((db.prepare(`SELECT entregado FROM subida`).get() as { entregado: number }).entregado, 1);
  assert.equal((db.prepare(`SELECT notificado FROM bajada`).get() as { notificado: number }).notificado, 1);
});
