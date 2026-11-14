/**
 * Lectura de frecuencia cardiaca por Web Bluetooth, perfil GATT estándar.
 *
 *   Servicio        Heart Rate              0x180D
 *   Característica  Heart Rate Measurement  0x2A37
 *
 * Verificado contra un HUAWEI WATCH 5 el 14-11-2026: entrega 2 bytes por paquete
 * (`06 4b`), es decir flags + FC de 8 bits, **sin intervalos RR**. El parser cubre
 * igualmente los campos opcionales porque una banda pectoral BLE sí los envía.
 *
 * Requiere los tipos de Web Bluetooth, que no vienen en lib.dom:
 *   npm i -D @types/web-bluetooth
 *   // y en tsconfig.json:  "types": ["web-bluetooth"]
 */

/** Servicio GATT de ritmo cardiaco. */
export const HEART_RATE_SERVICE = 0x180d;
/** Característica de medición de ritmo cardiaco. */
export const HEART_RATE_MEASUREMENT = 0x2a37;

/** Una lectura decodificada de la característica 0x2A37. */
export interface HeartRateSample {
  /** Latidos por minuto. */
  bpm: number;
  /**
   * Intervalos RR en milisegundos, convertidos desde las unidades de 1/1024 s
   * que define la especificación. Vacío si el dispositivo no los envía:
   * **sin estos valores no se puede calcular HRV (RMSSD, SDNN).**
   */
  rrIntervalsMs: number[];
  /** Energía gastada acumulada en kJ, sólo si el dispositivo la reporta. */
  energyExpendedKj?: number | undefined;
  /**
   * Contacto del sensor con la piel.
   * `true` / `false` si el dispositivo lo soporta; `null` si no lo reporta.
   * Útil para descartar muestras tomadas con la correa floja.
   */
  sensorContact: boolean | null;
  /** Hora local de recepción. */
  receivedAt: Date;
  /** Bytes crudos, para depuración y para el registro sellado del evento. */
  raw: Uint8Array;
}

/** Qué sabe entregar el dispositivo conectado, deducido de la primera muestra. */
export interface DeviceCapabilities {
  /** El dispositivo envía intervalos RR, así que se puede calcular HRV. */
  providesRrIntervals: boolean;
  /** El dispositivo informa si el sensor está en contacto con la piel. */
  reportsSensorContact: boolean;
  /** El dispositivo envía energía gastada. */
  reportsEnergyExpended: boolean;
}

export type SampleListener = (sample: HeartRateSample) => void;
export type DisconnectListener = () => void;

/**
 * Decodifica la característica 0x2A37.
 *
 * Disposición de los flags (byte 0):
 *   bit 0  formato de la FC: 0 = uint8, 1 = uint16
 *   bit 1  contacto del sensor detectado
 *   bit 2  contacto del sensor soportado
 *   bit 3  energía gastada presente
 *   bit 4  intervalos RR presentes
 */
export function parseHeartRateMeasurement(
  view: DataView,
  receivedAt: Date = new Date(),
): HeartRateSample {
  if (view.byteLength < 2) {
    throw new RangeError(`Paquete demasiado corto: ${view.byteLength} bytes`);
  }

  const flags = view.getUint8(0);
  const is16Bit = (flags & 0x01) !== 0;
  const contactDetected = (flags & 0x02) !== 0;
  const contactSupported = (flags & 0x04) !== 0;
  const hasEnergy = (flags & 0x08) !== 0;
  const hasRr = (flags & 0x10) !== 0;

  let offset = 1;

  const bpm = is16Bit ? view.getUint16(offset, true) : view.getUint8(offset);
  offset += is16Bit ? 2 : 1;

  let energyExpendedKj: number | undefined;
  if (hasEnergy && offset + 2 <= view.byteLength) {
    energyExpendedKj = view.getUint16(offset, true);
    offset += 2;
  }

  const rrIntervalsMs: number[] = [];
  if (hasRr) {
    // Cada RR ocupa 2 bytes y viene en unidades de 1/1024 s.
    while (offset + 2 <= view.byteLength) {
      rrIntervalsMs.push((view.getUint16(offset, true) * 1000) / 1024);
      offset += 2;
    }
  }

  return {
    bpm,
    rrIntervalsMs,
    energyExpendedKj,
    sensorContact: contactSupported ? contactDetected : null,
    receivedAt,
    raw: new Uint8Array(view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength)),
  };
}

/** Deduce de una muestra qué sabe entregar el dispositivo. */
export function describeCapabilities(sample: HeartRateSample): DeviceCapabilities {
  return {
    providesRrIntervals: sample.rrIntervalsMs.length > 0,
    reportsSensorContact: sample.sensorContact !== null,
    reportsEnergyExpended: sample.energyExpendedKj !== undefined,
  };
}

/** Se lanza cuando el navegador no expone Web Bluetooth (p. ej. Safari en iOS). */
export class WebBluetoothUnavailableError extends Error {
  constructor() {
    super(
      'Este navegador no expone Web Bluetooth. Usa Chrome o Edge sobre Android, ' +
        'Windows, macOS o Linux. Safari en iOS no lo soporta.',
    );
    this.name = 'WebBluetoothUnavailableError';
  }
}

/** ¿Puede este navegador usar Web Bluetooth? Comprobar antes de ofrecer el botón. */
export function isWebBluetoothAvailable(): boolean {
  return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
}

/**
 * Conexión a un sensor de ritmo cardiaco BLE.
 *
 *   const monitor = new HeartRateMonitor();
 *   monitor.onSample((s) => console.log(s.bpm, s.rrIntervalsMs));
 *   await monitor.connect();   // debe nacer de un gesto del usuario
 */
export class HeartRateMonitor {
  private device: BluetoothDevice | null = null;
  private characteristic: BluetoothRemoteGATTCharacteristic | null = null;
  private readonly sampleListeners = new Set<SampleListener>();
  private readonly disconnectListeners = new Set<DisconnectListener>();

  /** Capacidades del dispositivo, disponibles tras la primera muestra. */
  public capabilities: DeviceCapabilities | null = null;

  /** Suscribe un receptor de muestras. Devuelve la función para desuscribir. */
  public onSample(listener: SampleListener): () => void {
    this.sampleListeners.add(listener);
    return () => this.sampleListeners.delete(listener);
  }

  /** Suscribe un receptor del evento de desconexión. */
  public onDisconnect(listener: DisconnectListener): () => void {
    this.disconnectListeners.add(listener);
    return () => this.disconnectListeners.delete(listener);
  }

  public get isConnected(): boolean {
    return this.device?.gatt?.connected ?? false;
  }

  public get deviceName(): string | null {
    return this.device?.name ?? null;
  }

  /**
   * Abre el selector del navegador y se suscribe a las notificaciones.
   * **Tiene que llamarse desde un gesto del usuario** (un clic), o el navegador
   * lo bloquea.
   */
  public async connect(): Promise<void> {
    if (!isWebBluetoothAvailable()) throw new WebBluetoothUnavailableError();

    this.device = await navigator.bluetooth.requestDevice({
      filters: [{ services: [HEART_RATE_SERVICE] }],
      optionalServices: [HEART_RATE_SERVICE],
    });

    this.device.addEventListener('gattserverdisconnected', this.handleDisconnect);

    const gatt = this.device.gatt;
    if (!gatt) throw new Error('El dispositivo no expone un servidor GATT.');

    const server = await gatt.connect();
    const service = await server.getPrimaryService(HEART_RATE_SERVICE);
    this.characteristic = await service.getCharacteristic(HEART_RATE_MEASUREMENT);

    this.characteristic.addEventListener('characteristicvaluechanged', this.handleValue);
    await this.characteristic.startNotifications();
  }

  /** Cierra la conexión y deja de notificar. */
  public disconnect(): void {
    this.characteristic?.removeEventListener('characteristicvaluechanged', this.handleValue);
    this.characteristic = null;
    if (this.device?.gatt?.connected) this.device.gatt.disconnect();
  }

  private readonly handleValue = (event: Event): void => {
    const target = event.target as BluetoothRemoteGATTCharacteristic;
    const value = target.value;
    if (!value) return;

    let sample: HeartRateSample;
    try {
      sample = parseHeartRateMeasurement(value);
    } catch {
      return; // Paquete malformado: se descarta sin romper el flujo.
    }

    this.capabilities ??= describeCapabilities(sample);
    for (const listener of this.sampleListeners) listener(sample);
  };

  private readonly handleDisconnect = (): void => {
    this.characteristic = null;
    for (const listener of this.disconnectListeners) listener();
  };
}
