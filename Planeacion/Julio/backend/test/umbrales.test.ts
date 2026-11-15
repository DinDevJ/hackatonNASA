import { test, beforeEach } from 'node:test';
import { fileURLToPath } from 'node:url';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import assert from 'node:assert/strict';
import { abrir, type BD } from '../src/db.ts';
import { cargarInicial } from '../src/semillas.ts';
import { bus, ingerirBinaria, ingerirJson, reiniciarEstados } from '../src/ingesta.ts';
import { codificar, type Esquema } from '../src/esquema.ts';
import { cargarReferencias, evaluarUmbral, guardarReferencias, referencias, type Umbral } from '../src/referencias.ts';
import { estadoApp } from '../src/app.ts';

const TRAJE: Esquema = { id: 1, nombre: 'traje-v1', version: 1, campos: [
  { clave: 'fc', variable: '04:A4', tipo: 'u8' }, { clave: 'spo2', variable: '04:A3', tipo: 'u8' },
  { clave: 'fr', variable: '04:A2', tipo: 'u8' }, { clave: 'temp', variable: '04:A1', tipo: 'i16', escala: 0.01 },
] };

// ⚠️ Umbrales DE PRUEBA, escritos aquí sólo para ejercitar el código: no son referencia clínica.
const REFS = [
  { id: '04:A3', clave: 'spo2', nombre: 'SpO2', unidad: '%', medido_en_vuelo: 'sí en vuelo',
    equipo_a_bordo: 'pulsioxímetro de prueba', como_se_mide_aqui: 'sensor óptico de prueba',
    umbral: { tipo: 'T', fuente: 'umbral de prueba SpO2', url: null,
              ambar: { min: 94, max: null }, rojo: { min: 90, max: null }, nota: 'sólo para pruebas' },
    cambio_en_vuelo: null,
    padecimientos: [{ id: 'P01', nombre: 'Hipoxia', peso: 1, direccion: '↓', evidencia: 'C', fuente: null }],
    trazas: ['prueba'] },
  { id: '04:A4', clave: 'fc', nombre: 'Frecuencia cardiaca', unidad: 'lpm',
    umbral: { tipo: 'A', fuente: 'umbral de prueba FC', url: 'https://ejemplo.invalid/fc',
              ambar: { min: 50, max: 100 }, rojo: { min: 40, max: 120 }, nota: '' },
    padecimientos: [] },
  { id: '04:A2', clave: 'fr', nombre: 'Frecuencia respiratoria', unidad: 'rpm', umbral: null, padecimientos: [] },
];

const T0 = '2027-01-01T00:00:00.000Z';
const DIA = 864e5, MIN = 6e4;
/** Instante a `d` días, `h` horas y `m` minutos del inicio de la órbita. */
const en = (d: number, h = 0, m = 0) => new Date(Date.parse(T0) + d * DIA + h * 36e5 + m * MIN).toISOString();

let db: BD;
let seq = 0;

beforeEach(() => {
  reiniciarEstados();
  seq = 0;
  db = abrir(':memory:');
  cargarInicial(db, fileURLToPath(new URL('../semillas/inicial.json', import.meta.url)));
  db.prepare(`INSERT INTO fases VALUES (?, 'orbita')`).run(T0);
  db.prepare(`INSERT INTO asignaciones (dispositivo, tripulante, desde) VALUES (102, 'ana', ?)`).run('2026-12-01T00:00:00Z');
  guardarReferencias(db, REFS);
});

const enviar = (t: string, v: { fc?: number; spo2?: number } = {}) =>
  ingerirBinaria(db, codificar({ idDisp: 102, idEsquema: 1, seq: seq++, tScet: new Date(t) }, TRAJE,
    { fc: v.fc ?? 57, spo2: v.spo2 ?? 98, fr: 14, temp: 36.6 }));

/** 14 días de calibración estables: FC 57, SpO2 98. */
const calibrar = () => { for (let d = 0; d < 14; d++) for (let h = 0; h < 6; h++) enviar(en(d, h * 4)); };

interface Fila { estado: string; motivo: string | null; umbral: string | null; z: number | null; valor: number;
                 esperado: number | null; banda: string | null; t_scet: string }
const alertasDe = (variable: string) =>
  db.prepare(`SELECT * FROM alertas WHERE tripulante = 'ana' AND variable = ? ORDER BY id`).all(variable) as unknown as Fila[];

/** Escucha el bus mientras corre `f` y devuelve las alertas emitidas. */
function oyendo(f: () => void): Array<Record<string, unknown>> {
  const vistas: Array<Record<string, unknown>> = [];
  const oir = (a: Record<string, unknown>) => vistas.push(a);
  bus.on('alerta', oir);
  try { f(); } finally { bus.off('alerta', oir); }
  return vistas;
}

test('umbral: min y max, ámbar y rojo, null = no aplica', () => {
  const u = REFS[1]!.umbral as Umbral;
  assert.deepEqual(evaluarUmbral(70, u), { estado: 'verde', limite: null, lado: null });
  assert.deepEqual(evaluarUmbral(50, u), { estado: 'verde', limite: null, lado: null }, 'el límite mismo está dentro');
  assert.deepEqual(evaluarUmbral(49, u), { estado: 'ambar', limite: 50, lado: 'min' });
  assert.deepEqual(evaluarUmbral(39, u), { estado: 'rojo', limite: 40, lado: 'min' });
  assert.deepEqual(evaluarUmbral(101, u), { estado: 'ambar', limite: 100, lado: 'max' });
  assert.deepEqual(evaluarUmbral(121, u), { estado: 'rojo', limite: 120, lado: 'max' });
  const soloMin = REFS[0]!.umbral as Umbral;
  assert.equal(evaluarUmbral(150, soloMin).estado, 'verde', 'sin máximo, por arriba nunca dispara');
  assert.equal(evaluarUmbral(1, { ...soloMin, ambar: null, rojo: null }).estado, 'verde');
});

test('el umbral absoluto dispara aunque el estado personal esté en verde', () => {
  calibrar();
  // Día 20: 20 horas de SpO2 normal. La mediana de 24 h seguirá en 98: personal en verde.
  for (let h = 0; h < 20; h++) enviar(en(20, h));
  assert.equal(alertasDe('04:A3').length, 0);

  const emitidas = oyendo(() => {
    enviar(en(20, 20, 1), { spo2: 92 });
    enviar(en(20, 20, 2), { spo2: 92 });
    assert.equal(alertasDe('04:A3').length, 0, 'dos muestras bajas no bastan: mínimo tres');
    enviar(en(20, 20, 3), { spo2: 92 });
  });

  const [a] = alertasDe('04:A3');
  assert.equal(alertasDe('04:A3').length, 1);
  assert.equal(a!.estado, 'ambar');
  assert.equal(a!.motivo, 'umbral');
  assert.deepEqual(JSON.parse(a!.umbral!), { tipo: 'T', fuente: 'umbral de prueba SpO2', limite: 94, valor_evaluado: 92, lado: 'min', estado: 'ambar' });
  // Los campos de siempre siguen ahí: el criterio personal se evaluó y dio verde.
  assert.equal(a!.valor, 98, 'valor sigue siendo la mediana de 24 h');
  assert.ok(Math.abs(a!.z!) < 2);
  assert.ok(a!.esperado! > 90 && JSON.parse(a!.banda!).length === 2);
  assert.equal(a!.t_scet, en(20, 20, 3));

  // El evento del bus (lo que baja a Tierra) dice lo mismo.
  const e = emitidas.find((x) => x.variable === '04:A3')!;
  assert.equal(e.motivo, 'umbral');
  assert.equal(e.estado_personal, 'verde');
  assert.equal(e.estado_umbral, 'ambar');
  assert.equal((e.umbral as { limite: number }).limite, 94);
  for (const k of ['estado', 'z', 'valor', 'esperado', 'banda', 'prob_nominal', 't_scet', 'entorno', 'extrapolado', 'pesos']) {
    assert.ok(k in e, `la alerta conserva ${k}`);
  }

  // Sigue bajando: pasa a rojo cuando la mediana de las últimas 5 cruza el límite rojo.
  enviar(en(20, 20, 4), { spo2: 88 });
  enviar(en(20, 20, 5), { spo2: 88 });
  assert.equal(alertasDe('04:A3').length, 1, 'la mediana de las últimas 5 aún es 92');
  enviar(en(20, 20, 6), { spo2: 88 });
  const r = alertasDe('04:A3')[1]!;
  assert.equal(r.estado, 'rojo');
  assert.equal(JSON.parse(r.umbral!).limite, 90);
});

test('un artefacto suelto no dispara, y las muestras sin contacto no cuentan', () => {
  // Día 2: en calibración, así que sólo puede hablar el umbral.
  for (let m = 0; m < 4; m++) enviar(en(2, 10, m));
  enviar(en(2, 10, 4), { spo2: 70 });                       // artefacto
  for (let m = 5; m < 8; m++) enviar(en(2, 10, m));
  assert.equal(alertasDe('04:A3').length, 0);

  // Dos muestras buenas, cuatro malas SIN contacto y una buena: si las malas contaran, sería rojo.
  db.prepare(`INSERT INTO asignaciones (dispositivo, tripulante, desde) VALUES (302, 'ana', ?)`).run('2026-12-01T00:00:00Z');
  enviar(en(3, 10, 0)); enviar(en(3, 10, 1));
  for (let m = 2; m < 6; m++) {
    const [r] = [ingerirJson(db, { frame: 'eva.telemetry.v1', source: { id: 'reloj-ana' }, t_scet: en(3, 10, m), seq: m,
      samples: [{ var: '04:A3', value: 80, quality: { contacto: false } }] })];
    assert.equal(r!.aceptadas, 1, 'se guarda igual');
  }
  enviar(en(3, 10, 6));
  assert.equal(alertasDe('04:A3').length, 0);

  // Y fuera de la ventana de 10 minutos tampoco se juntan: tres bajas separadas por una hora.
  for (let h = 0; h < 3; h++) enviar(en(4, h), { spo2: 85 });
  assert.equal(alertasDe('04:A3').length, 0);
});

test('en calibración no hay estado personal, pero el umbral sí avisa', () => {
  const emitidas = oyendo(() => { for (let m = 0; m < 3; m++) enviar(en(2, 10, m), { spo2: 88 }); });
  const [a] = alertasDe('04:A3');
  assert.equal(a!.estado, 'rojo');
  assert.equal(a!.motivo, 'umbral');
  assert.equal(a!.z, null, 'sin criterio personal no hay z');
  assert.equal(a!.valor, 88, 'sin mediana de 24 h, valor es lo que evaluó el umbral');
  assert.equal(emitidas.length, 1, 'el resto de variables sigue callado en calibración');
  assert.equal(emitidas[0]!.calibrando, true);
  assert.equal(emitidas[0]!.prob_nominal, null);
  assert.equal(emitidas[0]!.estado_personal, null);
});

test('una variable sin prior ni basal también se vigila por umbral', () => {
  db.prepare(`INSERT INTO variables VALUES ('X:PRUEBA', 'Variable de prueba', NULL, 'u', NULL, 'sensor', ?)`).run(T0);
  guardarReferencias(db, [{ id: 'X:PRUEBA', umbral: { tipo: 'T', fuente: 'prueba', url: null, ambar: { min: null, max: 10 }, rojo: null } }]);
  db.prepare(`INSERT INTO asignaciones (dispositivo, tripulante, desde) VALUES (302, 'ana', ?)`).run('2026-12-01T00:00:00Z');
  for (let m = 0; m < 3; m++) {
    ingerirJson(db, { frame: 'eva.telemetry.v1', source: { id: 'reloj-ana' }, t_scet: en(30, 10, m), seq: m,
      samples: [{ var: 'X:PRUEBA', value: 12 }] });
  }
  const [a] = alertasDe('X:PRUEBA');
  assert.equal(a!.estado, 'ambar');
  assert.equal(a!.motivo, 'umbral');
  assert.equal(a!.esperado, null);
  assert.equal(a!.banda, null);
  assert.equal(JSON.parse(a!.umbral!).lado, 'max');
});

test("motivo 'ambos' cuando se salen a la vez de lo personal y del umbral; 'personal' si sólo de lo personal", () => {
  calibrar();
  // Día 20: FC 68 cada hora. Fuera de lo esperado para Ana (57), dentro del umbral absoluto.
  for (let h = 0; h < 6; h++) enviar(en(20, h), { fc: 68 });
  const p = alertasDe('04:A4').at(-1)!;
  assert.equal(p.estado, 'rojo');
  assert.equal(p.motivo, 'personal');
  assert.equal(p.umbral, null);
  assert.ok(p.z! >= 3);

  // Día 30: FC 130 sostenida. Lejos de su normal y por encima del límite rojo.
  reiniciarEstados();
  db.exec(`DELETE FROM alertas`);
  for (let m = 0; m < 3; m++) enviar(en(30, 5, m), { fc: 130 });
  const filas = alertasDe('04:A4');
  assert.equal(filas.length, 1);
  assert.equal(filas[0]!.estado, 'rojo');
  assert.equal(filas[0]!.motivo, 'ambos');
  assert.ok(filas[0]!.z! >= 3);
  assert.deepEqual(JSON.parse(filas[0]!.umbral!), { tipo: 'A', fuente: 'umbral de prueba FC', limite: 120, valor_evaluado: 130, lado: 'max', estado: 'rojo' });
});

test('vuelta a verde: se avisa una vez, y un hueco de datos no la adelanta', () => {
  for (let m = 0; m < 3; m++) enviar(en(2, 10, m), { spo2: 88 });
  assert.deepEqual(alertasDe('04:A3').map((a) => a.estado), ['rojo']);
  for (let m = 3; m < 6; m++) enviar(en(2, 10, m), { spo2: 88 });
  assert.equal(alertasDe('04:A3').length, 1, 'mientras no cambie el estado no hay alerta nueva');

  // Media hora sin datos y llega UNA muestra buena: no basta para darla por resuelta.
  enviar(en(2, 10, 40));
  assert.equal(alertasDe('04:A3').length, 1);
  enviar(en(2, 10, 41));
  enviar(en(2, 10, 42));
  const filas = alertasDe('04:A3');
  assert.deepEqual(filas.map((a) => a.estado), ['rojo', 'verde']);
  assert.equal(filas[1]!.motivo, 'umbral', 'la vuelta a verde dice qué se resolvió');
  assert.equal(filas[1]!.umbral, null);
  assert.equal(filas[1]!.valor, 98);

  for (let m = 43; m < 50; m++) enviar(en(2, 10, m));
  assert.equal(alertasDe('04:A3').length, 2, 'verde sostenido no repite');
});

test('tras reiniciar el servidor no se repite la alerta dada y la vuelta a verde se sigue avisando', () => {
  for (let m = 0; m < 3; m++) enviar(en(2, 10, m), { spo2: 88 });
  reiniciarEstados();                                       // como si el proceso arrancara de nuevo
  for (let m = 3; m < 6; m++) enviar(en(2, 10, m), { spo2: 88 });
  assert.deepEqual(alertasDe('04:A3').map((a) => a.estado), ['rojo']);
  for (let m = 6; m < 9; m++) enviar(en(2, 10, m));
  assert.deepEqual(alertasDe('04:A3').map((a) => a.estado), ['rojo', 'verde']);
});

test('cargador de referencias: archivo ausente, JSON inválido y recarga que pisa', () => {
  const limpia = abrir(':memory:');
  const dir = mkdtempSync(join(tmpdir(), 'eva-ref-'));

  const ausente = cargarReferencias(limpia, join(dir, 'no-existe.json'));
  assert.deepEqual(ausente, { cargadas: 0, omitidas: 0, con_umbral: 0, ausente: true, error: null });
  assert.equal(referencias(limpia).size, 0);

  const malo = join(dir, 'malo.json');
  writeFileSync(malo, '{ "variables": [ esto no es JSON');
  const r1 = cargarReferencias(limpia, malo);
  assert.ok(r1.error, 'avisa');
  assert.equal(r1.cargadas, 0);
  writeFileSync(malo, '{ "otra_cosa": 1 }');
  assert.match(cargarReferencias(limpia, malo).error!, /variables/);

  const bueno = join(dir, 'medibles.json');
  writeFileSync(bueno, JSON.stringify({ variables: [...REFS, { nombre: 'sin id' }] }));
  assert.deepEqual(cargarReferencias(limpia, bueno), { cargadas: 3, omitidas: 1, con_umbral: 2, ausente: false, error: null });
  assert.equal(referencias(limpia).get('04:A3')!.umbral!.ambar!.min, 94);
  assert.equal((limpia.prepare(`SELECT COUNT(*) AS n FROM referencias`).get() as { n: number }).n, 3);

  // Recargar pisa lo anterior y la caché en memoria se entera.
  const otra = structuredClone(REFS[0]!);
  otra.umbral.ambar.min = 95;
  writeFileSync(bueno, JSON.stringify({ variables: [otra] }));
  assert.equal(cargarReferencias(limpia, bueno).cargadas, 1);
  assert.equal(referencias(limpia).get('04:A3')!.umbral!.ambar!.min, 95);
  assert.equal(referencias(limpia).size, 3, 'las que no venían en el archivo se quedan');

  // Y un archivo roto después no borra lo que ya había.
  assert.ok(cargarReferencias(limpia, malo).error);
  assert.equal(referencias(limpia).size, 3);
});

test('una base anterior a los umbrales se abre y recibe las columnas nuevas', () => {
  const ruta = join(mkdtempSync(join(tmpdir(), 'eva-bd-')), 'vieja.db');
  const vieja = new DatabaseSync(ruta);
  vieja.exec(`CREATE TABLE alertas (
    id INTEGER PRIMARY KEY, tripulante TEXT NOT NULL, variable TEXT NOT NULL,
    estado TEXT NOT NULL, z REAL, valor REAL, esperado REAL, banda TEXT,
    t_scet TEXT NOT NULL, creada TEXT NOT NULL, enviada_tierra INTEGER NOT NULL DEFAULT 0);
    INSERT INTO alertas (tripulante, variable, estado, z, valor, esperado, banda, t_scet, creada)
      VALUES ('ana', '04:A4', 'rojo', 3.3, 68, 57, '[52,62]', '2027-01-21T05:00:00.000Z', '2027-01-21T05:00:00.000Z');`);
  vieja.close();

  const abierta = abrir(ruta);
  const cols = (abierta.prepare(`PRAGMA table_info(alertas)`).all() as Array<{ name: string }>).map((c) => c.name);
  assert.ok(cols.includes('motivo') && cols.includes('umbral'));
  const a = abierta.prepare(`SELECT estado, motivo, umbral FROM alertas`).get() as Record<string, unknown>;
  assert.deepEqual({ ...a }, { estado: 'rojo', motivo: null, umbral: null });
  assert.equal(referencias(abierta).size, 0);
  abierta.close();
  abrir(ruta).close();                                      // abrir dos veces no falla
});

test('app: el estado de un tripulante en una sola respuesta', async () => {
  const { escribirEnlace, pulso, redactarAviso } = await import('../src/enlace.ts');
  assert.equal(estadoApp(db, 'nadie'), null);

  calibrar();
  for (let h = 0; h < 20; h++) enviar(en(20, h));
  for (let m = 1; m <= 3; m++) enviar(en(20, 20, m), { spo2: 92, fc: 130 });
  escribirEnlace(db, { owlt_s: 20, abierto: true });
  redactarAviso(db, { para: 'ana', texto: 'Descansa hoy' });
  redactarAviso(db, { para: 'todos', texto: 'Simulacro a las 15:00' });
  redactarAviso(db, { para: 'tomas', texto: 'Sólo para Tomás' });
  pulso(db, en(20, 20, 4));
  redactarAviso(db, { para: 'ana', texto: 'Este aún no ha llegado' });
  pulso(db, en(20, 20, 5));                                 // llegan los tres primeros; el cuarto va en camino

  const e = estadoApp(db, 'ana', en(20, 21))!;
  assert.deepEqual(e.tripulante, { id: 'ana', nombre: 'Ana', rol: 'especialista' });
  assert.equal(e.entorno, 'orbita');
  assert.equal(e.dia_mision, 20);
  assert.equal(e.t, en(20, 21));

  const v = Object.fromEntries(e.variables.map((x) => [x.id, x]));
  const spo2 = v['04:A3']!;
  assert.equal(spo2.clave, 'spo2');
  assert.equal(spo2.nombre, 'SpO2');
  assert.equal(spo2.unidad, '%');
  assert.equal(spo2.valor, 92);
  assert.equal(spo2.t_scet, en(20, 20, 3));
  assert.equal(spo2.dispositivo, 'traje-ana');
  assert.equal(spo2.procedencia, 'sensor');
  assert.equal(spo2.mediana_24h, 98);
  assert.equal(spo2.estado, 'ambar');
  assert.equal(spo2.motivo, 'umbral');
  assert.equal(spo2.estado_personal, 'verde');
  assert.equal(spo2.valor_umbral, 92);
  assert.equal(spo2.calibrando, false);
  assert.equal(spo2.basal, 98);
  assert.deepEqual(spo2.umbral, REFS[0]!.umbral);
  assert.equal(spo2.como_se_mide, 'sensor óptico de prueba');
  assert.equal(spo2.equipo_a_bordo, 'pulsioxímetro de prueba');
  assert.equal(spo2.padecimientos.length, 1);
  assert.ok(spo2.banda!.length === 2 && spo2.esperado! > 90 && Math.abs(spo2.z!) < 2);
  assert.ok(Math.abs(spo2.pesos!.poblacion + spo2.pesos!.historial + spo2.pesos!.vuelo - 1) < 0.01);
  // Serie: 14 días de misión hasta el de la última muestra; sólo los que tienen datos (del 7 al 13 y el 20).
  assert.deepEqual(spo2.serie.map((s) => s.dia), [7, 8, 9, 10, 11, 12, 13, 20]);
  assert.deepEqual(spo2.serie.at(-1), { dia: 20, mediana: 98, n: 23 });
  assert.deepEqual(spo2.serie[0], { dia: 7, mediana: 98, n: 6 });

  const fc = v['04:A4']!;
  assert.equal(fc.estado, 'rojo');
  assert.equal(fc.motivo, 'umbral', 'la mediana de 24 h sigue en 57: sólo habla el umbral');
  assert.equal(fc.unidad, 'lpm', 'nombre y unidad salen de la referencia cuando existe');

  assert.equal(v['04:A2']!.clave, 'fr');
  assert.equal(v['04:A2']!.umbral, null);
  assert.equal(v['04:A1']!.clave, 'temp', 'sin referencia, la clave sale del mapa por defecto');
  assert.equal(v['04:A1']!.como_se_mide, null);
  assert.equal(v['04:A1']!.estado, 'verde');
  assert.equal(v['04:A1']!.motivo, null);

  // Con basal pero sin ninguna muestra: aparece como sin_dato.
  const pa = v['01:V1']!;
  assert.equal(pa.estado, 'sin_dato');
  assert.equal(pa.clave, 'pa_sis');
  assert.equal(pa.valor, null);
  assert.equal(pa.basal, 115);
  assert.deepEqual(pa.serie, []);
  assert.ok(pa.esperado !== null, 'la predicción no necesita muestras');

  // Alertas: las de Ana, la más reciente primero, con banda y umbral ya como objetos. Coherentes con el estado.
  assert.ok(e.alertas.length >= 2);
  assert.ok((e.alertas[0]!.id as number) > (e.alertas[1]!.id as number));
  const aSpo2 = e.alertas.find((a) => a.variable === '04:A3')!;
  assert.equal(aSpo2.estado, spo2.estado);
  assert.equal(aSpo2.motivo, spo2.motivo);
  assert.equal((aSpo2.umbral as { limite: number }).limite, 94);
  assert.ok(Array.isArray(aSpo2.banda));

  // Avisos: sólo los ya entregados, para ella o para todos.
  assert.deepEqual(e.avisos.map((a) => a.texto), ['Simulacro a las 15:00', 'Descansa hoy']);
});

test('app por HTTP: 404 claro si el tripulante no existe, y /api/referencias', async () => {
  const { construir } = await import('../src/servidor.ts');
  const srv = construir(db);
  await new Promise<void>((ok) => srv.listen(0, '127.0.0.1', ok));
  const base = `http://127.0.0.1:${(srv.address() as { port: number }).port}`;
  try {
    const no = await fetch(`${base}/api/app/nadie`);
    assert.equal(no.status, 404);
    assert.match(((await no.json()) as { error: string }).error, /"nadie" no existe/);

    const si = await fetch(`${base}/api/app/ana`);
    assert.equal(si.status, 200);
    const e = (await si.json()) as { tripulante: { id: string }; variables: Array<{ id: string; estado: string }>; alertas: unknown[]; avisos: unknown[] };
    assert.equal(e.tripulante.id, 'ana');
    assert.equal(e.variables.length, 7);
    assert.ok(e.variables.every((x) => x.estado === 'sin_dato'));
    assert.deepEqual([e.alertas, e.avisos], [[], []]);

    const refs = (await (await fetch(`${base}/api/referencias`)).json()) as Array<{ id: string }>;
    assert.deepEqual(refs.map((r) => r.id), ['04:A2', '04:A3', '04:A4']);
  } finally {
    await new Promise((ok) => srv.close(ok));
  }
});
