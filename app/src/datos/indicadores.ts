/**
 * Los indicadores del panel (módulo 1). Seis los pide el reto; la HRV acompaña a la
 * frecuencia cardiaca en el detalle del corazón.
 *
 * Cada uno dice de dónde sale su umbral:
 *   [A] NASA o validado en astronautas · [T] clínico de Tierra · tu normal (línea base de 14 días)
 */
import type { Texto } from '../i18n';

export type IdIndicador = 'fc' | 'hrv' | 'presion' | 'glucosa' | 'temperatura' | 'sueno' | 'animo';
export type Region = 'cabeza' | 'corazon' | 'brazo' | 'abdomen';
export type Procedencia = 'sensor' | 'calculado' | 'estimado' | 'manual';
export type TipoUmbral = 'A' | 'T' | 'tu_normal';
/** Qué dirección es la mala: `alto` (subir preocupa), `bajo` o `ambos`. */
export type Direccion = 'alto' | 'bajo' | 'ambos';

export interface UmbralAbsoluto {
  tipo: 'A' | 'T';
  /** Devuelve 0 verde, 1 ámbar, 2 rojo según el valor. */
  nivel: (v: number) => 0 | 1 | 2;
  texto: Texto;
  fuente: { nombre: string; url?: string };
}

export interface Indicador {
  id: IdIndicador;
  variable: string; // ID de catálogo del equipo
  nombre: Texto;
  corto: Texto;
  unidad: string;
  decimales: number;
  region: Region;
  procedencia: Procedencia;
  direccion: Direccion;
  /** Si es `true`, también se compara contra tu normal de 14 días. */
  contraTuNormal: boolean;
  /**
   * Variación mínima creíble (MAD mínimo). Si los 14 días salen casi idénticos, la línea base
   * no puede ser más estrecha que esto: si no, cualquier diferencia que el instrumento ni
   * resuelve parecería anormal y daría falsas alarmas.
   */
  madMinimo?: number;
  absoluto?: UmbralAbsoluto;
  porQue: Texto;
  comoSeMide: Texto;
  /** Lo que dice el catálogo sobre cómo cambia en el espacio. */
  enElEspacio: Texto;
}

export const INDICADORES: Record<IdIndicador, Indicador> = {
  fc: {
    id: 'fc',
    variable: '01:V3',
    nombre: { es: 'Frecuencia cardiaca en reposo', en: 'Resting heart rate' },
    corto: { es: 'Pulso en reposo', en: 'Resting pulse' },
    unidad: 'lpm',
    decimales: 0,
    region: 'corazon',
    procedencia: 'calculado',
    direccion: 'alto',
    contraTuNormal: true,
    madMinimo: 1.5,
    absoluto: {
      tipo: 'T',
      nivel: (v) => (v > 100 ? 1 : 0),
      texto: { es: '> 100 lpm en reposo', en: '> 100 bpm at rest' },
      fuente: { nombre: 'Catálogo 01:V3 del equipo: taquicardia sinusal (clínico terrestre)' },
    },
    porQue: {
      es: 'Si el pulso en reposo sube varios días seguidos, el cuerpo está cargando con algo: poco sueño, estrés, deshidratación o el inicio de una infección.',
      en: 'When resting pulse climbs for several days, the body is under load: short sleep, stress, dehydration or an infection starting.',
    },
    comoSeMide: {
      es: 'Lo calcula LUNA: la mediana de los 30 minutos con el pulso más bajo durante el sueño. Error de 0,8 % frente al ECG en las pruebas del equipo.',
      en: 'Computed by LUNA: the median of the 30 lowest-pulse minutes during sleep. 0.8 % error against ECG in team tests.',
    },
    enElEspacio: {
      es: 'En reposo no cambia de forma clara en vuelo (n = 8). Por eso se compara contigo mismo.',
      en: 'At rest it does not change clearly in flight (n = 8). That is why it is compared with yourself.',
    },
  },
  hrv: {
    id: 'hrv',
    variable: '03:V17',
    nombre: { es: 'Variabilidad del pulso (HRV)', en: 'Heart rate variability (HRV)' },
    corto: { es: 'HRV', en: 'HRV' },
    unidad: 'ms',
    decimales: 0,
    region: 'corazon',
    procedencia: 'calculado',
    direccion: 'bajo',
    contraTuNormal: true,
    madMinimo: 4,
    porQue: {
      es: 'Mide cuánto descansa el sistema nervioso. Si baja de tu normal, el cuerpo se está recuperando peor.',
      en: 'It shows how well the nervous system rests. If it drops below your normal, recovery is worse.',
    },
    comoSeMide: {
      es: 'RMSSD nocturno a partir del tiempo entre latidos, con filtro de artefactos. Si más del 10 % de los latidos salen mal, esa noche no cuenta.',
      en: 'Night-time RMSSD from beat-to-beat intervals, with artefact filtering. If more than 10 % of beats are bad, that night is discarded.',
    },
    enElEspacio: {
      es: 'Varía mucho entre personas sanas (33 a 113 ms en las pruebas): un número fijo no sirve, solo tu normal.',
      en: 'It varies widely between healthy people (33–113 ms in tests): a fixed number is useless, only your normal.',
    },
  },
  presion: {
    id: 'presion',
    variable: '01:V1',
    nombre: { es: 'Presión arterial', en: 'Blood pressure' },
    corto: { es: 'Presión', en: 'Pressure' },
    unidad: 'mmHg',
    decimales: 0,
    region: 'corazon',
    procedencia: 'manual',
    direccion: 'alto',
    contraTuNormal: false,
    absoluto: {
      tipo: 'T',
      nivel: (v) => (v >= 140 ? 2 : v >= 130 ? 1 : 0),
      texto: { es: 'Sistólica: < 130 normal · 130–139 atención · ≥ 140 alta (AHA)', en: 'Systolic: < 130 normal · 130–139 watch · ≥ 140 high (AHA)' },
      fuente: { nombre: 'American Heart Association', url: 'https://www.heart.org/en/health-topics/high-blood-pressure/understanding-blood-pressure-readings' },
    },
    porQue: {
      es: 'Sin gravedad la sangre se acumula en la cabeza y el corazón trabaja distinto. Al volver a la gravedad, la presión puede caer al ponerse de pie.',
      en: 'Without gravity blood shifts to the head and the heart works differently. Back in gravity, pressure can drop on standing.',
    },
    comoSeMide: {
      es: 'Con el manguito del botiquín; el valor se anota a mano.',
      en: 'With the medical kit cuff; the value is entered by hand.',
    },
    enElEspacio: {
      es: 'La sistólica de 24 h baja unos 8 a 14 mmHg en vuelo (n = 8–12).',
      en: '24-hour systolic drops about 8–14 mmHg in flight (n = 8–12).',
    },
  },
  glucosa: {
    id: 'glucosa',
    variable: '02:V86',
    nombre: { es: 'Glucosa en ayunas', en: 'Fasting glucose' },
    corto: { es: 'Glucosa', en: 'Glucose' },
    unidad: 'mg/dL',
    decimales: 0,
    region: 'abdomen',
    procedencia: 'manual',
    direccion: 'alto',
    contraTuNormal: false,
    absoluto: {
      tipo: 'T',
      nivel: (v) => (v >= 126 ? 2 : v >= 100 ? 1 : 0),
      texto: { es: '< 100 normal · 100–125 atención · ≥ 126 alta (ADA)', en: '< 100 normal · 100–125 watch · ≥ 126 high (ADA)' },
      fuente: { nombre: 'American Diabetes Association', url: 'https://diabetes.org/about-diabetes/diagnosis' },
    },
    porQue: {
      es: 'En vuelo el cuerpo responde peor a la insulina. Vigilar la glucosa ayuda a ajustar comida y ejercicio.',
      en: 'In flight the body responds worse to insulin. Watching glucose helps adjust food and exercise.',
    },
    comoSeMide: {
      es: 'Glucómetro de dedo, anotado a mano. No se sabe qué glucómetro hay a bordo, por eso no llega solo.',
      en: 'Finger-stick meter, entered by hand. Which meter is on board is unknown, so it does not arrive automatically.',
    },
    enElEspacio: {
      es: 'La resistencia a la insulina sube hasta un 60 % (n = 8).',
      en: 'Insulin resistance rises up to 60 % (n = 8).',
    },
  },
  temperatura: {
    id: 'temperatura',
    variable: '04:A1',
    nombre: { es: 'Temperatura de piel', en: 'Skin temperature' },
    corto: { es: 'Temperatura', en: 'Temperature' },
    unidad: '°C',
    decimales: 1,
    region: 'brazo',
    procedencia: 'sensor',
    direccion: 'alto',
    contraTuNormal: true,
    madMinimo: 0.15,
    porQue: {
      es: 'Si sube junto con el pulso, puede ser el inicio de una infección: el sistema inmune funciona peor en el espacio.',
      en: 'If it rises together with pulse, an infection may be starting: the immune system works worse in space.',
    },
    comoSeMide: {
      es: 'Sensor en la muñeca. Es de piel, no central: solo vale contra tu normal. Para confirmar fiebre se usa el termómetro.',
      en: 'Wrist sensor. It is skin, not core: it only means something against your normal. Fever is confirmed with a thermometer.',
    },
    enElEspacio: {
      es: 'La temperatura central sube cerca de 1 °C en vuelos largos (n = 11).',
      en: 'Core temperature rises about 1 °C on long flights (n = 11).',
    },
  },
  sueno: {
    id: 'sueno',
    variable: '03:V30',
    nombre: { es: 'Horas de sueño', en: 'Sleep hours' },
    corto: { es: 'Sueño', en: 'Sleep' },
    unidad: 'h',
    decimales: 1,
    region: 'cabeza',
    procedencia: 'calculado',
    direccion: 'bajo',
    contraTuNormal: true,
    madMinimo: 0.25,
    porQue: {
      es: 'Dormir poco varios días seguidos baja los reflejos y la concentración, justo antes de tareas críticas.',
      en: 'Short sleep for several days in a row lowers reflexes and focus, right before critical tasks.',
    },
    comoSeMide: {
      es: 'Movimiento de la muñeca (Cole-Kripke) más los botones "me acuesto" y "me levanto". Error de 4 % en las pruebas del equipo.',
      en: 'Wrist movement (Cole-Kripke) plus the "going to bed" and "getting up" buttons. 4 % error in team tests.',
    },
    enElEspacio: {
      es: 'En la ISS se duermen 6,09 h de media y el 43,8 % de las noches son de menos de 6 h (n = 21).',
      en: 'On the ISS people sleep 6.09 h on average and 43.8 % of nights are under 6 h (n = 21).',
    },
  },
  animo: {
    id: 'animo',
    variable: '03:V9',
    nombre: { es: 'Estrés del check-in', en: 'Check-in stress' },
    corto: { es: 'Ánimo', en: 'Mood' },
    unidad: '/100',
    decimales: 0,
    region: 'cabeza',
    procedencia: 'manual',
    direccion: 'alto',
    contraTuNormal: true,
    madMinimo: 4,
    porQue: {
      es: 'El aislamiento y el encierro pesan. Notar a tiempo que el estrés sube permite hablarlo antes de que crezca.',
      en: 'Isolation and confinement weigh on people. Noticing stress rising early lets you talk about it before it grows.',
    },
    comoSeMide: {
      es: 'Escala de 0 a 100 en el check-in diario de 20 segundos. Es privado: la CMO solo ve la tendencia semanal.',
      en: '0–100 scale in the 20-second daily check-in. It is private: the CMO only sees the weekly trend.',
    },
    enElEspacio: {
      es: 'En la ISS, el estrés autoinformado está entre los mejores predictores de los reflejos (n = 24).',
      en: 'On the ISS, self-reported stress is among the best predictors of reaction time (n = 24).',
    },
  },
};

/** Unidad en el idioma activo: solo cambia la del pulso. */
export const unidad = (ind: Indicador, idioma: 'es' | 'en') => (idioma === 'en' && ind.unidad === 'lpm' ? 'bpm' : ind.unidad);

/** Orden en que se muestran: los seis del reto primero. */
export const ORDEN: IdIndicador[] = ['fc', 'presion', 'glucosa', 'temperatura', 'sueno', 'animo'];
