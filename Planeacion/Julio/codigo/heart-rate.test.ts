import { parseHeartRateMeasurement, describeCapabilities } from './heart-rate.js';

const dv = (hex: string): DataView => {
  const b = Uint8Array.from(hex.split(' ').map((h) => parseInt(h, 16)));
  return new DataView(b.buffer);
};

let fallos = 0;
const check = (nombre: string, ok: boolean, got: unknown) => {
  console.log(`${ok ? 'OK  ' : 'FALLA'}  ${nombre}  ->  ${JSON.stringify(got)}`);
  if (!ok) fallos++;
};

// 1) Bytes REALES del HUAWEI WATCH 5 (de la consola de Julio)
const real = parseHeartRateMeasurement(dv('06 4b'));
check('Watch 5 "06 4b": 75 bpm', real.bpm === 75, real.bpm);
check('Watch 5: sin RR', real.rrIntervalsMs.length === 0, real.rrIntervalsMs);
check('Watch 5: contacto detectado', real.sensorContact === true, real.sensorContact);
check('Watch 5: sin energia', real.energyExpendedKj === undefined, real.energyExpendedKj);
const cap = describeCapabilities(real);
check('Watch 5: HRV NO disponible', cap.providesRrIntervals === false, cap);

// 2) Banda pectoral tipica: flags 0x10 = RR presente. RR 1024/1024 s = 1000 ms
const banda = parseHeartRateMeasurement(dv('10 3c 00 04'));
check('Banda: 60 bpm', banda.bpm === 60, banda.bpm);
check('Banda: RR = 1000 ms', banda.rrIntervalsMs.length === 1 && Math.abs(banda.rrIntervalsMs[0]! - 1000) < 0.001, banda.rrIntervalsMs);
check('Banda: HRV SI disponible', describeCapabilities(banda).providesRrIntervals === true, true);

// 3) FC en 16 bits: flags 0x01, valor 300 (0x012C little endian)
const u16 = parseHeartRateMeasurement(dv('01 2c 01'));
check('uint16: 300 bpm', u16.bpm === 300, u16.bpm);

// 4) Energia + varios RR: flags 0x18, FC 70, energia 500, RR 1024 y 512
const full = parseHeartRateMeasurement(dv('18 46 f4 01 00 04 00 02'));
check('Completo: 70 bpm', full.bpm === 70, full.bpm);
check('Completo: energia 500 kJ', full.energyExpendedKj === 500, full.energyExpendedKj);
check('Completo: 2 RR [1000, 500]', full.rrIntervalsMs.length === 2 && full.rrIntervalsMs[1] === 500, full.rrIntervalsMs);

// 5) Contacto NO soportado: flags 0x00 -> sensorContact debe ser null
const sinContacto = parseHeartRateMeasurement(dv('00 50'));
check('Sin soporte de contacto -> null', sinContacto.sensorContact === null, sinContacto.sensorContact);

// 6) Paquete corto debe lanzar
let lanzo = false;
try { parseHeartRateMeasurement(dv('06')); } catch { lanzo = true; }
check('Paquete de 1 byte lanza error', lanzo, lanzo);

console.log(`\n${fallos === 0 ? 'TODAS LAS PRUEBAS PASAN' : fallos + ' PRUEBAS FALLAN'}`);
process.exit(fallos === 0 ? 0 : 1);
