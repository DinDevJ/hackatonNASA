import { test, beforeEach } from 'node:test';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { abrir, type BD } from '../src/db.ts';
import { cargarInicial } from '../src/semillas.ts';
import { encolarBajada, encolarEvaluaciones, redactarAviso } from '../src/enlace.ts';
import { aplicarAck, backoffMs, ErrorLote, idEmisor, pendientes, prepararLote, recibirLote, sha256 } from '../src/sincro.ts';

let nave: BD, tierra: BD;
const nueva = () => {
  const db = abrir(':memory:');
  cargarInicial(db, fileURLToPath(new URL('../semillas/inicial.json', import.meta.url)));
  return db;
};
beforeEach(() => { nave = nueva(); tierra = nueva(); });

const seqsEntrada = (db: BD) => (db.prepare(`SELECT seq FROM entrada ORDER BY id`).all() as Array<{ seq: number }>).map((r) => r.seq);
const cuenta = (db: BD, t: string) => Number((db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get() as { n: number }).n);

test('el lote sale por (prioridad, seq) y Tierra lo aplica en ese orden', () => {
  const prios = [2, 0, 1, 2, 0, 1];
  prios.forEach((p, i) => encolarBajada(nave, 'alerta', { i }, `2027-01-01T00:00:0${i}Z`, p));
  const l = prepararLote(nave, 'nave')!;
  assert.deepEqual(l.lote.mensajes.map((m) => m.seq), [2, 5, 3, 6, 1, 4]);
  recibirLote(tierra, 'tierra', l.cuerpo, l.sha256);
  assert.deepEqual(seqsEntrada(tierra), [2, 5, 3, 6, 1, 4]);
  assert.equal(cuenta(tierra, 'bajada'), 6);
});

test('reenvío duplicado: todo duplicados y nada nuevo', () => {
  encolarBajada(nave, 'resumen', { a: 1 }, '2027-01-01T00:00:00Z', 2);
  encolarBajada(nave, 'alerta', { a: 2 }, '2027-01-01T00:00:01Z', 0);
  const l = prepararLote(nave, 'nave')!;
  const a1 = recibirLote(tierra, 'tierra', l.cuerpo, l.sha256);
  const a2 = recibirLote(tierra, 'tierra', l.cuerpo, l.sha256);
  assert.equal(a1.aplicados, 2);
  assert.equal(a2.aplicados, 0);
  assert.equal(a2.duplicados, 2);
  assert.equal(cuenta(tierra, 'entrada'), 2);
  assert.equal(cuenta(tierra, 'bajada'), 2);
});

test('pérdida de ACK: se reenvía lo mismo y al final cada seq está una vez', () => {
  for (let i = 0; i < 4; i++) encolarBajada(nave, 'alerta', { i }, '2027-01-01T00:00:00Z', 1);
  const l1 = prepararLote(nave, 'nave')!;
  recibirLote(tierra, 'tierra', l1.cuerpo, l1.sha256); // el ACK se pierde
  assert.equal(pendientes(nave, 'nave'), 4);
  const l2 = prepararLote(nave, 'nave')!;
  assert.deepEqual(l2.lote.mensajes.map((m) => m.seq), l1.lote.mensajes.map((m) => m.seq));
  const ack = recibirLote(tierra, 'tierra', l2.cuerpo, l2.sha256);
  assert.equal(ack.duplicados, 4);
  assert.equal(aplicarAck(nave, 'nave', ack), 4);
  assert.equal(pendientes(nave, 'nave'), 0);
  assert.equal(prepararLote(nave, 'nave'), null);
  assert.deepEqual(seqsEntrada(tierra), [1, 2, 3, 4]);
  const fila = nave.prepare(`SELECT intentos, t_ack FROM bajada WHERE seq = 1`).get() as { intentos: number; t_ack: string };
  assert.equal(fila.intentos, 2);
  assert.ok(fila.t_ack);
});

test('lote corrupto: checksum; forma inválida con sha correcto: formato', () => {
  encolarBajada(nave, 'alerta', { x: 1 }, '2027-01-01T00:00:00Z', 0);
  const l = prepararLote(nave, 'nave')!;
  const malo = l.cuerpo.replace('"x":1', '"x":2');
  assert.throws(() => recibirLote(tierra, 'tierra', malo, l.sha256), (e: unknown) => e instanceof ErrorLote && e.motivo === 'checksum');
  assert.equal(cuenta(tierra, 'entrada'), 0);
  assert.equal(cuenta(tierra, 'bajada'), 0);
  for (const raro of ['no json', JSON.stringify({ ...l.lote, v: 2 }), JSON.stringify({ ...l.lote, lado: 'tierra' }),
    JSON.stringify({ ...l.lote, mensajes: [{ ...l.lote.mensajes[0], seq: 0 }] }), JSON.stringify({ ...l.lote, mensajes: 'x' })]) {
    assert.throws(() => recibirLote(tierra, 'tierra', raro, sha256(raro)), (e: unknown) => e instanceof ErrorLote && e.motivo === 'formato');
  }
  assert.equal(cuenta(tierra, 'entrada'), 0);
});

test('ACK acumulado + selectivos con llegada fuera de orden', () => {
  // seq 1 y 2 de prioridad baja, 3 y 4 rojas: con max=2 llegan primero 3 y 4.
  encolarBajada(nave, 'resumen', {}, '2027-01-01T00:00:00Z', 2);
  encolarBajada(nave, 'resumen', {}, '2027-01-01T00:00:00Z', 2);
  encolarBajada(nave, 'alerta', {}, '2027-01-01T00:00:00Z', 0);
  encolarBajada(nave, 'alerta', {}, '2027-01-01T00:00:00Z', 0);
  const l1 = prepararLote(nave, 'nave', 2)!;
  const a1 = recibirLote(tierra, 'tierra', l1.cuerpo, l1.sha256);
  assert.equal(a1.ack_acumulado, 0);
  assert.deepEqual(a1.selectivos, [3, 4]);
  assert.equal(aplicarAck(nave, 'nave', a1), 2);
  const l2 = prepararLote(nave, 'nave', 2)!;
  assert.deepEqual(l2.lote.mensajes.map((m) => m.seq), [1, 2]);
  const a2 = recibirLote(tierra, 'tierra', l2.cuerpo, l2.sha256);
  assert.equal(a2.ack_acumulado, 4);
  assert.deepEqual(a2.selectivos, []);
  aplicarAck(nave, 'nave', a2);
  assert.equal(pendientes(nave, 'nave'), 0);
  // Un ACK de otro emisor no toca nada.
  assert.equal(aplicarAck(nave, 'nave', { ...a2, emisor: 'nave-ffffffff' }), 0);
});

test('seq no se reutiliza tras borrar la bajada', () => {
  encolarBajada(nave, 'alerta', {}, '2027-01-01T00:00:00Z', 0);
  encolarBajada(nave, 'alerta', {}, '2027-01-01T00:00:00Z', 0);
  nave.exec(`DELETE FROM bajada`);
  encolarBajada(nave, 'alerta', {}, '2027-01-01T00:00:00Z', 0);
  assert.equal((nave.prepare(`SELECT seq FROM bajada`).get() as { seq: number }).seq, 3);
});

test('Tierra → nave: la subida llega entregada y la nave devuelve un acuse', () => {
  redactarAviso(tierra, { para: 'ana', texto: 'Hidratarse', prioridad: 'normal' });
  redactarAviso(tierra, { para: 'ana', texto: 'Anomalía', tipo: 'alerta', nivel: 'rojo', variable: '04:A4' });
  const l = prepararLote(tierra, 'tierra')!;
  assert.deepEqual(l.lote.mensajes.map((m) => [m.seq, m.prioridad]), [[2, 0], [1, 2]]);
  const ack = recibirLote(nave, 'nave', l.cuerpo, l.sha256, '2027-01-01T00:00:30.000Z');
  assert.equal(ack.aplicados, 2);
  const filas = nave.prepare(`SELECT texto, entregado, t_llegada, tipo, datos FROM subida ORDER BY id`).all() as Array<Record<string, unknown>>;
  assert.equal(filas.length, 2);
  assert.ok(filas.every((f) => f.entregado === 1 && f.t_llegada === '2027-01-01T00:00:30.000Z'));
  assert.deepEqual(JSON.parse(String(filas[0]!.datos)), { nivel: 'rojo', variable: '04:A4' });
  const acuses = nave.prepare(`SELECT prioridad FROM bajada WHERE tipo = 'acuse'`).all();
  assert.equal(acuses.length, 2);
  assert.equal(aplicarAck(tierra, 'tierra', ack), 2);
  assert.equal(pendientes(tierra, 'tierra'), 0);
  // Y el acuse viaja de vuelta a Tierra por el mismo protocolo.
  const b = prepararLote(nave, 'nave')!;
  assert.equal(recibirLote(tierra, 'tierra', b.cuerpo, b.sha256).aplicados, 2);
});

test('encolarEvaluaciones: prioridad por color y sin duplicar', () => {
  assert.equal(encolarEvaluaciones(nave), 0); // sin tabla
  nave.exec(`CREATE TABLE evaluaciones (id INTEGER PRIMARY KEY, tripulante TEXT, padecimiento_id TEXT,
    color TEXT CHECK (color IN ('VERDE','AMARILLO','ROJO','GRIS')), hora TEXT, canal TEXT, detalle TEXT)`);
  const ins = nave.prepare(`INSERT INTO evaluaciones (tripulante, padecimiento_id, color, hora, canal, detalle) VALUES ('ana', ?, ?, '2027-01-01T00:00:00Z', 'SIMULADO', '{"k":1}')`);
  ins.run('p1', 'ROJO'); ins.run('p2', 'AMARILLO'); ins.run('p3', 'VERDE'); ins.run('p4', 'GRIS');
  assert.equal(encolarEvaluaciones(nave), 4);
  assert.equal(encolarEvaluaciones(nave), 0);
  const f = nave.prepare(`SELECT prioridad, datos FROM bajada WHERE tipo = 'evaluacion' ORDER BY seq`).all() as Array<{ prioridad: number; datos: string }>;
  assert.deepEqual(f.map((x) => x.prioridad), [0, 1, 2, 2]);
  assert.deepEqual(JSON.parse(f[0]!.datos).detalle, { k: 1 });
  ins.run('p5', 'ROJO');
  assert.equal(encolarEvaluaciones(nave), 1);
  assert.equal(cuenta(nave, 'bajada'), 5);
});

test('backoffMs: entre d/2 y d, con tope', () => {
  assert.equal(backoffMs(0, 1000, 30000, () => 0), 500);
  assert.equal(backoffMs(0, 1000, 30000, () => 1), 1000);
  assert.equal(backoffMs(3, 1000, 30000, () => 0), 4000);
  assert.equal(backoffMs(10, 1000, 30000, () => 1), 30000);
  assert.equal(backoffMs(10, 1000, 30000, () => 0), 15000);
  for (let i = 0; i < 20; i++) { const v = backoffMs(i, 100, 5000); assert.ok(v >= Math.min(5000, 100 * 2 ** i) / 2 && v <= 5000); }
});

test('fuzz determinista: 200 mensajes con fallos al azar llegan exactamente una vez', () => {
  let x = 123456789;
  const rnd = () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 2 ** 32; };
  for (let i = 0; i < 200; i++) encolarBajada(nave, 'alerta', { i }, '2027-01-01T00:00:00Z', Math.floor(rnd() * 3));
  const prioDe = new Map<number, number>();
  for (const r of nave.prepare(`SELECT seq, prioridad FROM bajada`).all() as Array<{ seq: number; prioridad: number }>) prioDe.set(r.seq, r.prioridad);
  let rondas = 0;
  while (pendientes(nave, 'nave') > 0) {
    assert.ok(++rondas < 2000, 'no converge');
    const l = prepararLote(nave, 'nave', 1 + Math.floor(rnd() * 20))!;
    const ordenado = l.lote.mensajes.every((m, i, a) => i === 0 ||
      prioDe.get(a[i - 1]!.seq)! < prioDe.get(m.seq)! || (prioDe.get(a[i - 1]!.seq)! === prioDe.get(m.seq)! && a[i - 1]!.seq < m.seq));
    assert.ok(ordenado, 'lote ordenado por (prioridad, seq)');
    const r = rnd();
    if (r < 0.2) continue;                                   // se pierde la petición
    if (r < 0.3) {                                           // cuerpo corrupto
      const i = Math.floor(rnd() * l.cuerpo.length);
      const c = l.cuerpo.slice(0, i) + (l.cuerpo[i] === 'x' ? 'y' : 'x') + l.cuerpo.slice(i + 1);
      assert.throws(() => recibirLote(tierra, 'tierra', c, l.sha256), ErrorLote);
      continue;
    }
    const antes = seqsEntrada(tierra).length;
    const ack = recibirLote(tierra, 'tierra', l.cuerpo, l.sha256);
    const nuevos = seqsEntrada(tierra).slice(antes);
    assert.deepEqual(nuevos, l.lote.mensajes.map((m) => m.seq).filter((s) => nuevos.includes(s)), 'aplicado en orden del lote');
    if (rnd() < 0.15) recibirLote(tierra, 'tierra', l.cuerpo, l.sha256); // duplicado inmediato
    if (rnd() < 0.2) continue;                               // se pierde el ACK
    aplicarAck(nave, 'nave', ack);
  }
  const seqs = seqsEntrada(tierra);
  assert.equal(seqs.length, 200);
  assert.deepEqual([...seqs].sort((a, b) => a - b), Array.from({ length: 200 }, (_, i) => i + 1));
  assert.equal(cuenta(tierra, 'bajada'), 200);
  assert.equal(idEmisor(nave, 'nave').startsWith('nave-'), true);
});
