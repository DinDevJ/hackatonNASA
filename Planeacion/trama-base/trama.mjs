/**
 * Trama Bluetooth de EVA (eva.ble.v1): los bytes que manda el hardware.
 *
 * Especificación completa en README.md. Este archivo codifica y decodifica los
 * paquetes y los convierte a la trama lógica `eva.telemetry.v1` de Julio
 * (Planeacion/Julio/codigo/telemetry.ts), que es lo que consume el motor.
 *
 * Sin dependencias: sirve igual en el navegador (Web Bluetooth) y en Node.
 * Todo va en little-endian. Cada paquete cabe en 20 bytes.
 */

export const VERSION = 1;

/** "Monarcas" + "EVA" en ASCII. */
export const UUID = {
  servicio: '4d6f6e61-7263-6173-4556-410000000001',
  trama: '4d6f6e61-7263-6173-4556-410000000002', // notify
  control: '4d6f6e61-7263-6173-4556-410000000003', // write
  capacidades: '4d6f6e61-7263-6173-4556-410000000004', // read
};

export const TIPO = { vitales: 1, latidos: 2, habitat: 3, evento: 4 };
const NOMBRE_TIPO = Object.fromEntries(Object.entries(TIPO).map(([k, v]) => [v, k]));

export const FLAG = { contacto: 1, movimiento: 2, relojSincronizado: 4, bateriaBaja: 8, simulado: 16 };

export const POSTURA = ['desconocida', 'acostado', 'sentado', 'de_pie', 'en_movimiento'];

export const EVENTO = { me_acuesto: 1, me_levanto: 2, me_pongo_de_pie: 3, ayuda: 4, inicio_ejercicio: 5, fin_ejercicio: 6 };
const NOMBRE_EVENTO = Object.fromEntries(Object.entries(EVENTO).map(([k, v]) => [v, k]));

export const ESCENARIO = { nominal: 0, fiebre: 1, evento_solar: 2, co2_alto: 3, hipoxia: 4, ortostatico: 5, arritmia: 6, sin_contacto: 7 };

/** Campos que un dispositivo puede declarar, en el orden de los bits de CAPACIDADES. */
export const CAMPOS = ['fc', 'spo2', 'fr', 'temp_piel', 'actividad', 'postura', 'pasos', 'latidos',
  'ppco2', 'ppo2', 'temp_cabina', 'humedad', 'tasa_dosis', 'ruido', 'lux', 'eventos'];

const KIND = { 1: 'wrist', 2: 'chest', 3: 'suit', 4: 'habitat', 7: 'synthetic' };

/** Catálogo de cada campo: a qué variable del equipo corresponde y cómo se rotula. */
export const CATALOGO = {
  fc: { var: '04:A4', unit: 'lpm', origin: 'sensor', tipo_umbral: 'T' },
  spo2: { var: '04:A3', unit: '%', origin: 'sensor', tipo_umbral: 'T' },
  fr: { var: '04:A2', unit: 'rpm', origin: 'estimated', method: 'ppg/dispositivo', tipo_umbral: 'T' },
  temp_piel: { var: '04:A1', unit: '°C', origin: 'sensor', method: 'piel/muñeca', tipo_umbral: null },
  actividad: { var: '03:V30', unit: 'cuentas/s', origin: 'sensor', method: 'acelerometro/magnitud', tipo_umbral: null },
  postura: { var: '01:V48', unit: 'categoria', origin: 'sensor', method: 'acelerometro/inclinacion', tipo_umbral: 'T' },
  pasos: { var: '02:V56', unit: 'pasos/s', origin: 'sensor', tipo_umbral: 'A' },
  latidos: { var: '03:V17', unit: 'ms', origin: 'sensor', method: 'ibi', tipo_umbral: null },
  ppco2: { var: '04:A23', unit: 'mmHg', origin: 'telemetry', tipo_umbral: 'A' },
  ppo2: { var: '04:A25', unit: 'mmHg', origin: 'telemetry', tipo_umbral: 'A' },
  temp_cabina: { var: '04:A27', unit: '°C', origin: 'telemetry', tipo_umbral: 'A' },
  humedad: { var: '04:A27', unit: '%HR', origin: 'telemetry', tipo_umbral: 'A' },
  tasa_dosis: { var: '01:V95', unit: 'µSv/h', origin: 'telemetry', tipo_umbral: 'A' },
  ruido: { var: '04:A28', unit: 'dBA', origin: 'telemetry', tipo_umbral: 'A' },
  lux: { var: '03:V49', unit: 'lux', origin: 'telemetry', tipo_umbral: 'A' },
};

const SIN_U8 = 0xff;
const SIN_U16 = 0xffff;
const SIN_I16 = 0x7fff;

// ---------------------------------------------------------------- codificar
function cabecera(tipo, largo, { flags = 0, seq = 0, t = 0 }) {
  const b = new Uint8Array(largo);
  const v = new DataView(b.buffer);
  v.setUint8(0, (VERSION << 4) | tipo);
  v.setUint8(1, flags);
  v.setUint16(2, seq & 0xffff, true);
  v.setUint32(4, t >>> 0, true);
  return { b, v };
}

const u8 = (x, escala = 1) => (x == null ? SIN_U8 : Math.max(0, Math.min(254, Math.round(x * escala))));
const u16 = (x, escala = 1) => (x == null ? SIN_U16 : Math.max(0, Math.min(65534, Math.round(x * escala))));
const i16 = (x, escala = 1) => (x == null ? SIN_I16 : Math.max(-32768, Math.min(32766, Math.round(x * escala))));

export function codificarVitales(p) {
  const { b, v } = cabecera(TIPO.vitales, 20, p);
  v.setUint8(8, u8(p.fc));
  v.setUint8(9, u8(p.spo2));
  v.setUint8(10, u8(p.fr, 2));
  v.setInt16(11, i16(p.temp_piel, 100), true);
  v.setUint16(13, u16(p.actividad), true);
  v.setUint8(15, p.postura ?? 0);
  v.setUint8(16, u8(p.pasos ?? 0));
  v.setUint8(17, u8(p.calidad));
  v.setUint8(18, u8(p.bateria));
  return b;
}

export function codificarLatidos(p) {
  const ibi = (p.ibi_ms ?? []).slice(0, 5);
  const { b, v } = cabecera(TIPO.latidos, 20, p);
  v.setUint8(8, ibi.length);
  ibi.forEach((ms, i) => v.setUint16(9 + 2 * i, u16(ms), true));
  return b;
}

export function codificarHabitat(p) {
  const { b, v } = cabecera(TIPO.habitat, 20, p);
  v.setUint16(8, u16(p.ppco2, 100), true);
  v.setUint16(10, u16(p.ppo2, 10), true);
  v.setInt16(12, i16(p.temp_cabina, 100), true);
  v.setUint8(14, u8(p.humedad));
  v.setUint16(15, u16(p.tasa_dosis), true);
  v.setUint8(17, u8(p.ruido));
  v.setUint16(18, u16(p.lux), true);
  return b;
}

export function codificarEvento(p) {
  const { b, v } = cabecera(TIPO.evento, 9, p);
  v.setUint8(8, typeof p.evento === 'string' ? EVENTO[p.evento] : p.evento);
  return b;
}

/** CONTROL: pone el reloj del dispositivo (segundos Unix, UTC). */
export function controlHora(unix = Math.floor(Date.now() / 1000)) {
  const b = new Uint8Array(5);
  const v = new DataView(b.buffer);
  v.setUint8(0, 0x01);
  v.setUint32(1, unix >>> 0, true);
  return b;
}

/** CONTROL: cambia el escenario del simulador. */
export function controlEscenario(n) {
  return new Uint8Array([0x02, typeof n === 'string' ? ESCENARIO[n] : n]);
}

export function codificarCapacidades({ kind = 7, campos = CAMPOS }) {
  const b = new Uint8Array(4);
  const v = new DataView(b.buffer);
  v.setUint8(0, VERSION);
  v.setUint8(1, kind);
  v.setUint16(2, campos.reduce((m, c) => m | (1 << CAMPOS.indexOf(c)), 0), true);
  return b;
}

// ---------------------------------------------------------------- decodificar
function vista(bytes) {
  if (bytes instanceof DataView) return bytes;
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  return new DataView(b.buffer, b.byteOffset, b.byteLength);
}

const LARGO = { [TIPO.vitales]: 20, [TIPO.latidos]: 20, [TIPO.habitat]: 20, [TIPO.evento]: 9 };

/**
 * Bytes -> objeto. Lanza un error si el paquete no es válido: nunca devuelve
 * números inventados. Un campo sin dato llega como `null`.
 */
export function decodificar(bytes) {
  const v = vista(bytes);
  if (v.byteLength < 9) throw new Error(`paquete demasiado corto (${v.byteLength} bytes)`);
  const version = v.getUint8(0) >> 4;
  const tipo = v.getUint8(0) & 0x0f;
  if (version !== VERSION) throw new Error(`versión ${version} no soportada`);
  if (!LARGO[tipo]) throw new Error(`tipo de paquete desconocido: ${tipo}`);
  if (v.byteLength !== LARGO[tipo]) throw new Error(`${NOMBRE_TIPO[tipo]}: se esperaban ${LARGO[tipo]} bytes y llegaron ${v.byteLength}`);

  const f = v.getUint8(1);
  const p = {
    tipo: NOMBRE_TIPO[tipo],
    flags: {
      contacto: !!(f & FLAG.contacto),
      movimiento: !!(f & FLAG.movimiento),
      relojSincronizado: !!(f & FLAG.relojSincronizado),
      bateriaBaja: !!(f & FLAG.bateriaBaja),
      simulado: !!(f & FLAG.simulado),
    },
    seq: v.getUint16(2, true),
    t: v.getUint32(4, true),
  };
  const g8 = (o, div = 1) => (v.getUint8(o) === SIN_U8 ? null : v.getUint8(o) / div);
  const g16 = (o, div = 1) => (v.getUint16(o, true) === SIN_U16 ? null : v.getUint16(o, true) / div);
  const gi16 = (o, div = 1) => (v.getInt16(o, true) === SIN_I16 ? null : v.getInt16(o, true) / div);

  if (tipo === TIPO.vitales) {
    Object.assign(p, {
      fc: g8(8), spo2: g8(9), fr: g8(10, 2), temp_piel: gi16(11, 100), actividad: g16(13),
      postura: POSTURA[v.getUint8(15)] ?? 'desconocida', pasos: g8(16), calidad: g8(17), bateria: g8(18),
    });
  } else if (tipo === TIPO.latidos) {
    const n = v.getUint8(8);
    if (n > 5) throw new Error(`latidos: n = ${n} (máximo 5)`);
    p.ibi_ms = Array.from({ length: n }, (_, i) => v.getUint16(9 + 2 * i, true));
  } else if (tipo === TIPO.habitat) {
    Object.assign(p, {
      ppco2: g16(8, 100), ppo2: g16(10, 10), temp_cabina: gi16(12, 100), humedad: g8(14),
      tasa_dosis: g16(15), ruido: g8(17), lux: g16(18),
    });
  } else {
    p.evento = NOMBRE_EVENTO[v.getUint8(8)];
    if (!p.evento) throw new Error(`evento desconocido: ${v.getUint8(8)}`);
  }
  return p;
}

export function decodificarCapacidades(bytes, fuente = { id: 'eva-01' }) {
  const v = vista(bytes);
  if (v.byteLength !== 4 || v.getUint8(0) !== VERSION) throw new Error('capacidades no válidas');
  const mask = v.getUint16(2, true);
  const kind = KIND[v.getUint8(1)] ?? 'synthetic';
  const campos = CAMPOS.filter((_, i) => mask & (1 << i));
  return {
    frame: 'eva.capabilities.v1',
    source: { ...fuente, kind },
    campos,
    provides: campos.filter((c) => CATALOGO[c]).map((c) => {
      const { var: id, unit, origin, method } = CATALOGO[c];
      const habitat = ['ppco2', 'ppo2', 'temp_cabina', 'humedad', 'tasa_dosis', 'ruido', 'lux'].includes(c);
      return { var: id, unit, origin, rate_hz: c === 'latidos' ? null : habitat ? 0.2 : 1, ...(method ? { method } : {}) };
    }),
  };
}

// ---------------------------------------------------------------- a la trama lógica de Julio
/**
 * Paquete decodificado -> `eva.telemetry.v1`.
 *
 * Si el dispositivo no tiene el reloj puesto, `t` son segundos desde que arrancó:
 * se usa la hora de recepción y se avisa, en vez de inventar una fecha de 1970.
 */
export function aTramaTelemetria(p, { sujeto, fuente = { id: 'eva-01', kind: 'wrist' }, recibido = new Date() }) {
  const avisos = [];
  if (!p.flags.relojSincronizado) avisos.push('reloj_no_sincronizado');
  if (p.flags.movimiento) avisos.push('movimiento');
  if (p.flags.bateriaBaja) avisos.push('bateria_baja');
  if (p.flags.simulado) avisos.push('simulado');
  const kind = p.flags.simulado ? 'synthetic' : p.tipo === 'habitat' ? 'habitat' : fuente.kind;
  const cuando = p.flags.relojSincronizado ? new Date(p.t * 1000) : recibido;

  const muestra = (campo, value, extra = {}) => {
    const { var: id, unit, origin, method, tipo_umbral } = CATALOGO[campo];
    const quality = { ...(p.tipo === 'habitat' ? {} : { contacto: p.flags.contacto }), ...(avisos.length ? { avisos } : {}), ...extra };
    return { var: id, value, unit, origin, quality, ...(method ? { method } : {}), tipo_umbral };
  };

  let samples = [];
  if (p.tipo === 'vitales') {
    samples = ['fc', 'spo2', 'fr', 'temp_piel', 'actividad', 'postura', 'pasos'].map((c) => muestra(c, p[c]));
  } else if (p.tipo === 'latidos') {
    samples = p.ibi_ms.map((ms) => muestra('latidos', ms));
  } else if (p.tipo === 'habitat') {
    samples = ['ppco2', 'ppo2', 'temp_cabina', 'humedad', 'tasa_dosis', 'ruido', 'lux'].map((c) => muestra(c, p[c]));
  } else {
    samples = [{ var: 'evento:' + p.evento, value: p.evento, unit: 'evento', origin: 'manual', tipo_umbral: null }];
  }
  return {
    frame: 'eva.telemetry.v1',
    source: { ...fuente, kind },
    subject: sujeto,
    t_scet: cuando.toISOString(),
    t_ert: null,
    owlt_s: null,
    seq: p.seq,
    samples,
  };
}

/** Bytes en hexadecimal, para depurar. */
export const hex = (b) => Array.from(b instanceof Uint8Array ? b : new Uint8Array(b.buffer ?? b)).map((x) => x.toString(16).padStart(2, '0')).join(' ');
