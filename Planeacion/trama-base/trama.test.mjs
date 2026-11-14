// Correr con:  node --test Planeacion/trama-base
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { validarTrama } from '../Julio/codigo/telemetry.ts';
import { Analizador } from './condiciones.mjs';
import { Simulador } from './simulador.mjs';
import {
  CAMPOS, FLAG, aTramaTelemetria, codificarCapacidades, codificarEvento, codificarHabitat, codificarLatidos,
  codificarVitales, controlEscenario, controlHora, decodificar, decodificarCapacidades, hex,
} from './trama.mjs';

const cab = { flags: FLAG.contacto | FLAG.relojSincronizado, seq: 10452, t: 1_805_355_729 };

// ------------------------------------------------------------------ códec
test('vitales: ida y vuelta, 20 bytes', () => {
  const b = codificarVitales({ ...cab, fc: 75, spo2: 97, fr: 14.5, temp_piel: 33.62, actividad: 12, postura: 2, pasos: 0, calidad: 90, bateria: 87 });
  assert.equal(b.length, 20);
  const p = decodificar(b);
  assert.deepEqual(
    { ...p, flags: undefined },
    { tipo: 'vitales', flags: undefined, seq: 10452, t: 1_805_355_729, fc: 75, spo2: 97, fr: 14.5, temp_piel: 33.62, actividad: 12, postura: 'sentado', pasos: 0, calidad: 90, bateria: 87 },
  );
  assert.equal(p.flags.contacto, true);
  assert.equal(p.flags.simulado, false);
});

test('vitales: los bytes del ejemplo del README', () => {
  const b = codificarVitales({ ...cab, fc: 75, spo2: 97, fr: 14.5, temp_piel: 33.62, actividad: 12, postura: 2, pasos: 0, calidad: 90, bateria: 87 });
  assert.equal(hex(b), '11 05 d4 28 d1 8a 9b 6b 4b 61 1d 22 0d 0c 00 02 00 5a 57 00');
});

test('un campo sin dato llega como null, no como 255', () => {
  const p = decodificar(codificarVitales({ ...cab, fc: null, spo2: null, fr: null, temp_piel: null, actividad: null }));
  assert.deepEqual([p.fc, p.spo2, p.fr, p.temp_piel, p.actividad], [null, null, null, null, null]);
});

test('latidos, hábitat y evento: ida y vuelta', () => {
  assert.deepEqual(decodificar(codificarLatidos({ ...cab, ibi_ms: [968, 951, 1002] })).ibi_ms, [968, 951, 1002]);
  const h = decodificar(codificarHabitat({ ...cab, ppco2: 2.31, ppo2: 150.4, temp_cabina: 22.5, humedad: 45, tasa_dosis: 20, ruido: 58, lux: 300 }));
  assert.deepEqual([h.ppco2, h.ppo2, h.temp_cabina, h.humedad, h.tasa_dosis, h.ruido, h.lux], [2.31, 150.4, 22.5, 45, 20, 58, 300]);
  const e = codificarEvento({ ...cab, evento: 'me_levanto' });
  assert.equal(e.length, 9);
  assert.equal(decodificar(e).evento, 'me_levanto');
});

test('todos los paquetes caben en 20 bytes', () => {
  for (const b of new Simulador().cambiar('arritmia').correr(30)) assert.ok(b.length <= 20);
});

test('rechaza paquetes rotos en vez de inventar valores', () => {
  const b = codificarVitales({ ...cab, fc: 75 });
  assert.throws(() => decodificar(b.slice(0, 15)), /se esperaban 20 bytes/);
  assert.throws(() => decodificar(new Uint8Array([0x21, 0, 0, 0, 0, 0, 0, 0, 0])), /versión 2/);
  assert.throws(() => decodificar(new Uint8Array([0x19, 0, 0, 0, 0, 0, 0, 0, 0])), /desconocido/);
  assert.throws(() => decodificar(new Uint8Array(3)), /corto/);
});

test('control y capacidades', () => {
  assert.equal(hex(controlHora(1_805_355_729)), '01 d1 8a 9b 6b');
  assert.equal(hex(controlEscenario('evento_solar')), '02 02');
  const c = decodificarCapacidades(codificarCapacidades({ kind: 1, campos: ['fc', 'spo2', 'latidos'] }));
  assert.deepEqual(c.campos, ['fc', 'spo2', 'latidos']);
  assert.equal(c.source.kind, 'wrist');
  assert.deepEqual(c.provides.map((x) => x.var), ['04:A4', '04:A3', '03:V17']);
  assert.equal(decodificarCapacidades(codificarCapacidades({})).campos.length, CAMPOS.length);
});

// ------------------------------------------------------------------ puente a la trama de Julio
test('cada paquete del simulador pasa el validador de eva.telemetry.v1', () => {
  for (const b of new Simulador().correr(20)) {
    const trama = aTramaTelemetria(decodificar(b), { sujeto: 'MS-2' });
    const { ok, problemas } = validarTrama(trama);
    assert.ok(ok, JSON.stringify(problemas));
  }
});

test('la hora es la del dispositivo si está sincronizado; si no, la de recepción con aviso', () => {
  const p = decodificar(codificarVitales({ ...cab, fc: 75 }));
  assert.equal(aTramaTelemetria(p, { sujeto: 'MS-2' }).t_scet, '2027-03-18T07:42:09.000Z');

  const sinReloj = decodificar(codificarVitales({ ...cab, flags: FLAG.contacto, t: 37, fc: 75 }));
  const recibido = new Date('2027-03-18T08:00:00Z');
  const t = aTramaTelemetria(sinReloj, { sujeto: 'MS-2', recibido });
  assert.equal(t.t_scet, recibido.toISOString());
  assert.ok(t.samples[0].quality.avisos.includes('reloj_no_sincronizado'));
});

test('la frecuencia respiratoria viaja como estimada y con su método', () => {
  const t = aTramaTelemetria(decodificar(codificarVitales({ ...cab, fr: 14 })), { sujeto: 'MS-2' });
  const fr = t.samples.find((m) => m.var === '04:A2');
  assert.equal(fr.origin, 'estimated');
  assert.ok(fr.method);
});

// ------------------------------------------------------------------ condiciones
const BASE = { fc_reposo: 62, temp_piel: 33.6 };

/** 2 min nominales, luego `seg` segundos del escenario. Devuelve los ids de los avisos. */
function correr(escenario, seg = 180) {
  const sim = new Simulador();
  const an = new Analizador(BASE);
  for (const b of sim.correr(120)) an.ingerir(decodificar(b));
  assert.deepEqual(an.evaluar(), [], 'el arranque nominal no debe avisar');
  for (const b of sim.cambiar(escenario).correr(seg)) an.ingerir(decodificar(b));
  return { ids: an.evaluar().map((a) => a.id), avisos: an.evaluar(), an };
}

test('nominal: 10 minutos sin ningún aviso', () => {
  assert.deepEqual(correr('nominal', 600).ids, []);
});

test('fiebre: piel y FC sobre tu normal', () => {
  assert.deepEqual(correr('fiebre').ids, ['POSIBLE-FIEBRE']);
});

test('fiebre: sin línea base no se avisa', () => {
  const sim = new Simulador().cambiar('fiebre');
  const an = new Analizador();
  for (const b of sim.correr(300)) an.ingerir(decodificar(b));
  assert.deepEqual(an.evaluar(), []);
});

test('evento solar: refugio, y la dosis del evento se acumula', () => {
  const { avisos, an } = correr('evento_solar', 300);
  assert.equal(avisos[0].id, 'RADIACION');
  assert.equal(avisos[0].nivel, 'rojo');
  assert.ok(an.dosisEvento_mSv > 0.3 && an.dosisEvento_mSv < 0.6, String(an.dosisEvento_mSv)); // ~6 mSv/h durante 5 min
});

test('CO2 alto: avisa por el promedio, no por un pico', () => {
  assert.deepEqual(correr('co2_alto', 30).ids, [], 'a los 30 s el promedio aún no pasa de 3');
  assert.deepEqual(correr('co2_alto', 300).ids, ['CO2-ALTO']);
});

test('hipoxia con oxígeno de cabina bajo: avisa de la persona y de la cabina', () => {
  const { avisos } = correr('hipoxia');
  assert.deepEqual(avisos.map((a) => [a.id, a.nivel]), [['HIPOXIA', 'rojo'], ['CABINA-O2', 'rojo']]);
  assert.match(avisos[0].mensaje, /cabina/);
});

test('prueba ortostática: la FC sube más de 30 lpm y se mantiene', () => {
  assert.deepEqual(correr('ortostatico', 20).ids, [], 'necesita más de 30 s sostenido');
  assert.deepEqual(correr('ortostatico', 60).ids, ['ORTOSTATICO']);
});

test('ritmo irregular', () => {
  assert.deepEqual(correr('arritmia', 90).ids, ['RITMO-IRREGULAR']);
});

test('sin contacto: se avisa del sensor y NO se inventa ninguna alerta clínica', () => {
  assert.deepEqual(correr('sin_contacto', 60).ids, ['SENSOR-SIN-CONTACTO']);
});
