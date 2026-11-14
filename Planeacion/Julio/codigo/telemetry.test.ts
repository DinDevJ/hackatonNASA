import {
  antiguedadMin, deduplicar, ordenarPorSCET, serie, validarTrama,
  VERSION_TRAMA, type TramaTelemetria,
} from './telemetry.js';
import { rmssd } from './adapters.js';

let fallos = 0;
const ok = (n: string, c: boolean, v?: unknown) => {
  console.log(`${c ? 'OK  ' : 'FALLA'}  ${n}${v !== undefined ? '  -> ' + JSON.stringify(v) : ''}`);
  if (!c) fallos++;
};
const trama = (seq: number, scet: string, extra: Partial<TramaTelemetria> = {}): TramaTelemetria => ({
  frame: VERSION_TRAMA, source: { id: 'wrist-01', kind: 'wrist' }, subject: 'MS-2',
  t_scet: scet, t_ert: null, owlt_s: null, seq,
  samples: [{ var: '04:A4', value: 75, unit: 'bpm', origin: 'sensor', quality: { contacto: true } }],
  ...extra,
});

// Validación
ok('trama correcta pasa', validarTrama(trama(1, '2027-03-18T07:42:09Z')).ok);
ok('sin t_scet falla', !validarTrama({ ...trama(1, ''), t_scet: '' }).ok);
ok('variable sin catálogo falla',
  !validarTrama(trama(1, '2027-03-18T07:42:09Z', {
    samples: [{ var: 'ritmo', value: 70, unit: 'bpm', origin: 'sensor' }] })).ok);
ok('estimado sin incertidumbre falla',
  !validarTrama(trama(1, '2027-03-18T07:42:09Z', {
    samples: [{ var: '04:A2', value: 14, unit: 'brpm', origin: 'estimated' }] })).ok);
ok('estimado con ic95 pasa',
  validarTrama(trama(1, '2027-03-18T07:42:09Z', {
    samples: [{ var: '04:A2', value: 14, unit: 'brpm', origin: 'estimated',
                quality: { ic95: [8.8, 19.6] }, method: 'smart-fusion' }] })).ok);
ok('no es objeto falla', !validarTrama(null).ok);

// Orden por SCET, no por llegada
const desordenadas = [
  trama(3, '2027-03-18T09:00:00Z'), trama(1, '2027-03-18T07:00:00Z'), trama(2, '2027-03-18T08:00:00Z'),
];
ok('ordena por cuándo ocurrió',
  ordenarPorSCET(desordenadas).map((t) => t.seq).join() === '1,2,3',
  ordenarPorSCET(desordenadas).map((t) => t.seq));

// Idempotencia ante reenvíos
ok('deduplica reenvíos',
  deduplicar([trama(1, '2027-03-18T07:00:00Z'), trama(1, '2027-03-18T07:00:00Z'), trama(2, '2027-03-18T08:00:00Z')]).length === 2);

// Antigüedad
ok('antigüedad ≈ 41 min',
  Math.abs(antiguedadMin(trama(1, '2027-03-18T07:42:00Z'), new Date('2027-03-18T08:23:00Z')) - 41) < 0.01);

// Series
ok('extrae la serie de una variable', serie(desordenadas, '04:A4').length === 3);
ok('variable inexistente da vacío', serie(desordenadas, '99:Z9').length === 0);

// RMSSD
ok('rmssd de intervalos iguales es 0', rmssd([800, 800, 800]) === 0);
ok('rmssd conocido', Math.abs(rmssd([800, 850, 800]) - 50) < 0.001, rmssd([800, 850, 800]));
ok('rmssd con menos de 2 valores es 0', rmssd([800]) === 0);

console.log(`\n${fallos === 0 ? 'TODAS LAS PRUEBAS PASAN' : fallos + ' FALLAN'}`);
if (fallos) throw new Error(`${fallos} pruebas fallaron`);
