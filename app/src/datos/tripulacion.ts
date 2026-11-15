/**
 * Datos SIMULADOS de la tripulación de la demo (ERS §2.4), días 98 a 115.
 * Semilla fija: siempre se ve lo mismo. Nada de esto viene de un astronauta.
 *
 * Escenario de Ana (CU-02): noches cortas los días 110–112, el pulso en reposo sube y la
 * HRV baja; el día 112 se cumplen las tres señales. Tras el protocolo, el 114 vuelve a verde.
 * Luis tiene la presión en zona de atención para mostrar un ámbar por umbral [T].
 */
import type { IdIndicador } from './indicadores';

export const PRIMER_DIA = 98;
export const ULTIMO_DIA = 115;
export const DIAS = Array.from({ length: ULTIMO_DIA - PRIMER_DIA + 1 }, (_, i) => PRIMER_DIA + i);

export interface Tripulante {
  id: string;
  nombre: string;
  rol: { es: string; en: string };
  masaKg: number;
  color: string;
  /** Valores por día: `serie[indicador][i]` es el día `PRIMER_DIA + i`. `null` = no se midió. */
  serie: Record<IdIndicador, Array<number | null>>;
  diastolica: Array<number | null>;
  metas: { ejercicioMin: number[]; aguaMl: number[] };
}

function rng(semilla: number) {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Base {
  fc: number; hrv: number; sis: number; dia: number; glu: number; temp: number; sueno: number; animo: number;
}

/** Ajustes por día sobre la base: `{ 112: { sueno: -1.5 } }`. */
type Ajustes = Partial<Record<number, Partial<Base>>>;

function generar(semilla: number, base: Base, ajustes: Ajustes, masaKg: number) {
  const r = rng(semilla);
  const ruido = (a: number) => (r() * 2 - 1) * a;
  const serie: Tripulante['serie'] = { fc: [], hrv: [], presion: [], glucosa: [], temperatura: [], sueno: [], animo: [] };
  const diastolica: Array<number | null> = [];
  const ejercicioMin: number[] = [];
  const aguaMl: number[] = [];

  for (const d of DIAS) {
    const a = ajustes[d] ?? {};
    const v = (k: keyof Base) => base[k] + (a[k] ?? 0);
    serie.fc.push(Math.round(v('fc') + ruido(1.6)));
    serie.hrv.push(Math.round(v('hrv') + ruido(4)));
    serie.presion.push(Math.round(v('sis') + ruido(3)));
    diastolica.push(Math.round(v('dia') + ruido(2)));
    serie.glucosa.push(d % 2 === 0 ? Math.round(v('glu') + ruido(4)) : null); // cada dos días
    serie.temperatura.push(Math.round((v('temp') + ruido(0.12)) * 10) / 10);
    serie.sueno.push(Math.round((v('sueno') + ruido(0.45)) * 10) / 10);
    serie.animo.push(Math.round(Math.max(0, Math.min(100, v('animo') + ruido(4)))));
    ejercicioMin.push(Math.round(80 + ruido(15)));
    aguaMl.push(Math.round((32 * masaKg) * (0.85 + r() * 0.25)));
  }
  // El día de hoy (el último) va a medias: son las 14:00 a bordo.
  return { serie, diastolica, metas: { ejercicioMin, aguaMl } };
}

const ANA: Ajustes = {
  110: { sueno: -1.6 },
  111: { sueno: -1.5, fc: 4, hrv: -12, animo: 6 },
  112: { sueno: -1.6, fc: 8, hrv: -24, animo: 14 },
  113: { sueno: -0.6, fc: 5, hrv: -14, animo: 8 },
  114: { sueno: 0.3, fc: 1, hrv: -3 },
  115: { sueno: 0.2 },
};

export const TRIPULACION: Tripulante[] = [
  {
    id: 'MS-1', nombre: 'Tomás', rol: { es: 'Comandante', en: 'Commander' }, masaKg: 78, color: '#4FD2E9',
    ...generar(11, { fc: 56, hrv: 58, sis: 118, dia: 76, glu: 91, temp: 33.4, sueno: 6.6, animo: 28 }, {}, 78),
  },
  {
    id: 'MS-2', nombre: 'Ana', rol: { es: 'Especialista de misión', en: 'Mission specialist' }, masaKg: 62, color: '#B541FA',
    ...generar(22, { fc: 58, hrv: 62, sis: 112, dia: 72, glu: 88, temp: 33.6, sueno: 7.1, animo: 30 }, ANA, 62),
  },
  {
    id: 'MS-3', nombre: 'Mei', rol: { es: 'Oficial médica (CMO)', en: 'Crew medical officer' }, masaKg: 58, color: '#2BA36B',
    ...generar(33, { fc: 61, hrv: 49, sis: 110, dia: 70, glu: 86, temp: 33.5, sueno: 6.4, animo: 34 }, {}, 58),
  },
  {
    id: 'MS-4', nombre: 'Luis', rol: { es: 'Ingeniero de vuelo', en: 'Flight engineer' }, masaKg: 84, color: '#FF8A3D',
    ...generar(44, { fc: 63, hrv: 41, sis: 134, dia: 84, glu: 97, temp: 33.3, sueno: 6.2, animo: 26 }, {}, 84),
  },
];

export const indiceDia = (dia: number) => dia - PRIMER_DIA;

/** Ambiente de la cabina por día (simulado). El día 115 llega el evento solar (CU-03). */
export function ambiente(dia: number) {
  const r = rng(1000 + dia);
  const solar = dia === 115;
  return {
    ppco2: Math.round((2.1 + (r() - 0.5) * 0.4) * 10) / 10, // mmHg · [A] ≤ 3 promedio de 1 h
    ppo2: Math.round(149 + (r() - 0.5) * 4), // mmHg · [A] 145–155, mínimo 127
    temp: Math.round((22.4 + (r() - 0.5)) * 10) / 10, // °C · [A] 18–27
    humedad: Math.round(44 + (r() - 0.5) * 8), // %
    tasaDosis: solar ? 6000 : Math.round(20 + (r() - 0.5) * 6), // µSv/h · [A] diseño < 54
    dosisMision: Math.round(dia * 0.48 + (solar ? 1.6 : 0)), // mSv acumulados · [A] carrera < 600
  };
}

/**
 * Evento REAL de DONKI (NASA) usado como base del escenario solar: el aviso salió 18 minutos
 * después del evento, cerca de la mediana de 17 min que calculó Julio sobre 51 eventos.
 */
export const EVENTO_DONKI = {
  id: '2024-01-29T05:50:00-SEP-001',
  hora: '2024-01-29T05:50Z',
  latenciaMin: 18,
  instrumento: 'ACE/EPAM 15.8–39.8 MeV',
  url: 'https://ccmc.gsfc.nasa.gov/DONKI/view/SEP/28840/-1',
};
