/**
 * Sincronización con el reloj por Web Bluetooth.
 *
 * Amplía `heart-rate.ts` a todos los servicios GATT estándar que puede exponer un
 * reloj. Cada servicio se intenta por separado y **el fallo de uno no tumba al
 * resto**: un reloj que sólo publica ritmo cardiaco sigue siendo útil.
 *
 * LÍMITE IMPORTANTE DE WEB BLUETOOTH
 *   No se pueden descubrir servicios que no se hayan declarado antes en
 *   `optionalServices`. Por eso abajo hay una lista de UUID candidatos: se piden
 *   todos y se informa de cuáles respondieron. No es exploración libre.
 *
 * VERIFICADO el 14-11-2026 contra un HUAWEI WATCH 5:
 *   - Ritmo cardiaco (0x180D) SÍ, en modo de ahorro de batería
 *   - Intervalos entre latidos NO -> sin HRV
 *   - Contacto del sensor SÍ -> sirve como indicador de calidad
 *   Lo demás está por confirmar con `descubrirServicios()`.
 */

export const SERVICIOS = {
  ritmoCardiaco: 0x180d,
  pulsioximetro: 0x1822,
  bateria: 0x180f,
  infoDispositivo: 0x180a,
  velocidadCadencia: 0x1814,
  maquinaFitness: 0x1826,
  temperaturaSalud: 0x1809,
  presionArterial: 0x1810,
} as const;

export const CARACTERISTICAS = {
  medicionRitmoCardiaco: 0x2a37,
  nivelBateria: 0x2a19,
  plxContinuo: 0x2a5f,
  plxPuntual: 0x2a5e,
  fabricante: 0x2a29,
  modelo: 0x2a24,
  firmware: 0x2a26,
  medicionTemperatura: 0x2a1c,
  medicionPresion: 0x2a35,
} as const;

/** Qué servicios respondió el dispositivo, y qué características tiene cada uno. */
export interface ServicioEncontrado {
  nombre: string;
  uuid: string;
  caracteristicas: Array<{
    uuid: string;
    propiedades: string[];
  }>;
}

/** Una lectura cualquiera del reloj, con su procedencia. */
export interface LecturaReloj {
  /** Qué variable es, con el identificador del catálogo. */
  variable: string;
  valor: number | null;
  unidad: string;
  /** Cómo llegó: directa del sensor, derivada por nosotros, o estimada. */
  origen: 'sensor' | 'derivada' | 'estimada';
  /** `false` si el sensor no hacía contacto: la muestra no es fiable. */
  fiable: boolean;
  recibidaEn: Date;
}

/**
 * Pregunta al reloj qué servicios estándar expone.
 *
 * Hay que llamarla desde un gesto del usuario. Devuelve sólo los que respondieron:
 * **es la única forma honesta de saber qué da un reloj concreto.**
 */
export async function descubrirServicios(): Promise<{
  nombre: string | null;
  encontrados: ServicioEncontrado[];
  noDisponibles: string[];
}> {
  if (!('bluetooth' in navigator)) {
    throw new Error('Este navegador no expone Web Bluetooth. Usa Chrome o Edge; Safari en iOS no sirve.');
  }

  const todos = Object.values(SERVICIOS) as number[];
  const device = await navigator.bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: todos,
  });

  const gatt = device.gatt;
  if (!gatt) throw new Error('El dispositivo no expone servidor GATT.');
  const server = await gatt.connect();

  const encontrados: ServicioEncontrado[] = [];
  const noDisponibles: string[] = [];

  for (const [nombre, uuid] of Object.entries(SERVICIOS)) {
    try {
      const servicio = await server.getPrimaryService(uuid);
      const cars = await servicio.getCharacteristics();
      encontrados.push({
        nombre,
        uuid: servicio.uuid,
        caracteristicas: cars.map((c) => ({
          uuid: c.uuid,
          propiedades: Object.entries({
            leer: c.properties.read,
            notificar: c.properties.notify,
            indicar: c.properties.indicate,
            escribir: c.properties.write,
          })
            .filter(([, v]) => v)
            .map(([k]) => k),
        })),
      });
    } catch {
      noDisponibles.push(nombre); // El servicio no existe en este dispositivo.
    }
  }

  return { nombre: device.name ?? null, encontrados, noDisponibles };
}

/** Lee el nivel de batería, si el reloj lo publica. Útil para avisar antes de una EVA. */
export async function leerBateria(server: BluetoothRemoteGATTServer): Promise<number | null> {
  try {
    const s = await server.getPrimaryService(SERVICIOS.bateria);
    const c = await s.getCharacteristic(CARACTERISTICAS.nivelBateria);
    return (await c.readValue()).getUint8(0);
  } catch {
    return null;
  }
}

/** Fabricante, modelo y firmware. Va al registro del evento para poder reproducirlo. */
export async function leerInfoDispositivo(
  server: BluetoothRemoteGATTServer,
): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  const campos: Array<[string, number]> = [
    ['fabricante', CARACTERISTICAS.fabricante],
    ['modelo', CARACTERISTICAS.modelo],
    ['firmware', CARACTERISTICAS.firmware],
  ];
  try {
    const s = await server.getPrimaryService(SERVICIOS.infoDispositivo);
    for (const [clave, uuid] of campos) {
      try {
        const v = await (await s.getCharacteristic(uuid)).readValue();
        out[clave] = new TextDecoder().decode(v).replace(/\0+$/, '');
      } catch {
        /* ese campo no existe */
      }
    }
  } catch {
    /* el servicio entero no existe */
  }
  return out;
}

/**
 * Decodifica la característica de pulsioximetría continua (0x2A5F), si existe.
 *
 * ⚠️ Casi ningún reloj de consumo publica este servicio: la SpO2 suele quedarse
 * dentro de la app del fabricante. Por eso devuelve `null` sin protestar.
 */
export function decodificarSpO2(view: DataView): { spo2: number; pulso: number } | null {
  if (view.byteLength < 5) return null;
  // Los valores vienen en coma flotante de 16 bits del perfil SFLOAT.
  const sfloat = (offset: number): number => {
    const raw = view.getUint16(offset, true);
    let mantisa = raw & 0x0fff;
    let exponente = raw >> 12;
    if (mantisa >= 0x0800) mantisa = -((0x1000 - mantisa) & 0x0fff);
    if (exponente >= 0x08) exponente = -((0x10 - exponente) & 0x0f);
    return mantisa * Math.pow(10, exponente);
  };
  return { spo2: sfloat(1), pulso: sfloat(3) };
}

/**
 * Frecuencia cardiaca en reposo, derivada.
 *
 * 🔶 Definición nuestra, porque **no existe una estándar**: cada fabricante la
 * calcula distinto. Mediana de la ventana de `ventanaMin` minutos más quieta.
 * Se descartan las muestras sin contacto del sensor.
 */
export function fcEnReposo(
  muestras: Array<{ bpm: number; contacto: boolean | null; t: Date }>,
  ventanaMin = 30,
): number | null {
  const validas = muestras.filter((m) => m.contacto !== false);
  if (validas.length < 10) return null;

  const ventanaMs = ventanaMin * 60_000;
  let mejor: number[] | null = null;
  let menorVar = Infinity;

  for (let i = 0; i < validas.length; i++) {
    const fin = validas[i]!.t.getTime() + ventanaMs;
    const grupo = validas.filter((m) => m.t.getTime() >= validas[i]!.t.getTime() && m.t.getTime() < fin);
    if (grupo.length < 10) continue;
    const bpms = grupo.map((g) => g.bpm);
    const media = bpms.reduce((a, b) => a + b, 0) / bpms.length;
    const varianza = bpms.reduce((a, b) => a + (b - media) ** 2, 0) / bpms.length;
    if (varianza < menorVar) {
      menorVar = varianza;
      mejor = bpms;
    }
  }
  if (!mejor) return null;
  const ord = [...mejor].sort((a, b) => a - b);
  const m = Math.floor(ord.length / 2);
  return ord.length % 2 ? ord[m]! : (ord[m - 1]! + ord[m]!) / 2;
}
