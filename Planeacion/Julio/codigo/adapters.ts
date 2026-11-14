/**
 * Adaptadores: convierten cada origen en la misma trama.
 *
 * El motor sólo conoce `FuenteTelemetria`. Añadir un traje instrumentado mañana es
 * escribir un adaptador más, sin tocar nada del análisis.
 */
import { HeartRateMonitor, type HeartRateSample } from './heart-rate.js';
import {
  VERSION_CAPACIDADES,
  VERSION_TRAMA,
  type Capacidad,
  type FuenteTelemetria,
  type Fuente,
  type Muestra,
  type TramaCapacidades,
  type TramaTelemetria,
} from './telemetry.js';

/** Base con lo común: secuencia, suscriptores y armado de la trama. */
abstract class FuenteBase implements FuenteTelemetria {
  protected seq = 0;
  private readonly subs = new Set<(t: TramaTelemetria) => void>();

  constructor(
    protected readonly sujeto: string,
    protected readonly fuente: Fuente,
  ) {}

  abstract capacidades(): Promise<TramaCapacidades>;
  abstract iniciar(): Promise<void>;
  abstract detener(): void;

  alRecibir(cb: (t: TramaTelemetria) => void): () => void {
    this.subs.add(cb);
    return () => this.subs.delete(cb);
  }

  /** Arma y reparte la trama. `t_ert` y `owlt_s` quedan nulos: los rellena Tierra. */
  protected emitir(samples: Muestra[], cuando: Date = new Date()): void {
    if (!samples.length) return;
    const t: TramaTelemetria = {
      frame: VERSION_TRAMA,
      source: this.fuente,
      subject: this.sujeto,
      t_scet: cuando.toISOString(),
      t_ert: null,
      owlt_s: null,
      seq: this.seq++,
      samples,
    };
    for (const s of this.subs) s(t);
  }
}

/**
 * Reloj por Web Bluetooth.
 *
 * ⚠️ Declara sólo lo que el reloj entrega **de verdad**. Verificado contra un HUAWEI
 * WATCH 5: frecuencia cardiaca sí, intervalos entre latidos no. Por eso la HRV no
 * aparece en `capacidades()` salvo que el dispositivo la ofrezca.
 */
export class FuenteReloj extends FuenteBase {
  private readonly monitor = new HeartRateMonitor();
  private desuscribir: (() => void) | null = null;

  constructor(sujeto: string, id = 'wrist-01') {
    super(sujeto, { id, kind: 'wrist' });
  }

  async capacidades(): Promise<TramaCapacidades> {
    const provides: Capacidad[] = [
      { var: '04:A4', unit: 'bpm', origin: 'sensor', rate_hz: 1 },
    ];
    // Sólo se promete la HRV si este dispositivo concreto manda intervalos RR.
    if (this.monitor.capabilities?.providesRrIntervals) {
      provides.push({ var: '03:V17', unit: 'ms', origin: 'derived', method: 'rmssd' });
    }
    return { frame: VERSION_CAPACIDADES, source: this.fuente, provides };
  }

  async iniciar(): Promise<void> {
    this.desuscribir = this.monitor.onSample((s) => this.emitir(this.aMuestras(s), s.receivedAt));
    await this.monitor.connect();
    const info = this.monitor.deviceName;
    if (info) this.fuente.model = info;
  }

  detener(): void {
    this.desuscribir?.();
    this.desuscribir = null;
    this.monitor.disconnect();
  }

  private aMuestras(s: HeartRateSample): Muestra[] {
    const m: Muestra[] = [
      {
        var: '04:A4',
        value: s.bpm,
        unit: 'bpm',
        origin: 'sensor',
        // El contacto viaja con el valor: una lectura con la correa floja se marca.
        quality: { contacto: s.sensorContact },
        tipo_umbral: 'T',
      },
    ];
    if (s.rrIntervalsMs.length) {
      m.push({
        var: '03:V17',
        value: Number(rmssd(s.rrIntervalsMs).toFixed(1)),
        unit: 'ms',
        origin: 'derived',
        method: 'rmssd',
        quality: { contacto: s.sensorContact, avisos: ['prv_no_ecg'] },
        tipo_umbral: 'T',
      });
    }
    return m;
  }
}

/** RMSSD a partir de intervalos RR. Vacío o de un solo valor devuelve 0. */
export function rmssd(rr: number[]): number {
  if (rr.length < 2) return 0;
  let suma = 0;
  for (let i = 1; i < rr.length; i++) suma += (rr[i]! - rr[i - 1]!) ** 2;
  return Math.sqrt(suma / (rr.length - 1));
}

/**
 * Entrada manual: presión arterial, glucosa, síntomas, escalas.
 *
 * 🔶 Es la fuente **más voluminosa** del producto: 29 de las 75 variables entran por
 * aquí, frente a 5 por el reloj.
 */
export class FuenteManual extends FuenteBase {
  constructor(
    sujeto: string,
    private readonly declaradas: Capacidad[],
    id = 'manual-01',
  ) {
    super(sujeto, { id, kind: 'manual' });
  }

  async capacidades(): Promise<TramaCapacidades> {
    return { frame: VERSION_CAPACIDADES, source: this.fuente, provides: this.declaradas };
  }

  async iniciar(): Promise<void> {
    /* no hay nada que conectar */
  }
  detener(): void {
    /* nada */
  }

  /** La llama la interfaz cuando alguien registra un valor. */
  registrar(variable: string, valor: number | string | null, unidad: string, umbral: 'A' | 'T' | null = 'T'): void {
    this.emitir([{ var: variable, value: valor, unit: unidad, origin: 'manual', tipo_umbral: umbral }]);
  }
}
