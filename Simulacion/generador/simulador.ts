/**
 * Simulador de hardware: sustituye al ESP32 mientras no lo tengamos.
 *
 * Genera tramas BINARIAS del perfil EVA, idénticas a las que mandaría el traje, y
 * tramas JSON como las que reenviaría un celular. Las manda a la computadora
 * central por HTTP, como lo haría la pasarela Bluetooth.
 *
 *   npm run generador                         (en Simulacion/) rellena 112 días y sigue en vivo
 *   npm run generador -- --dias 20 --sin-vivo sólo historia, para pruebas rápidas
 * Mándalo a un backend en modo simulación (cd Simulacion && npm start), nunca a la base operativa.
 *
 * ⚠️ TODOS los datos son SINTÉTICOS. El escenario está escrito a propósito:
 *   - días 0–3: redistribución de fluidos (FC un poco más alta)
 *   - Ana: su FC baja ~8 % en órbita (en su misión anterior bajó 10 %)
 *   - Ana, día 109 en adelante: fatiga acumulada, la FC sube cada día
 */
import { codificar, type Esquema } from '../../Sistema/backend/src/esquema.ts';

const arg = (k: string, def: string) => {
  const i = process.argv.indexOf(`--${k}`);
  return i >= 0 ? process.argv[i + 1]! : def;
};
const URL_BASE = arg('url', 'http://localhost:8787');
const DIAS = Number(arg('dias', '112'));
const POR_DIA = Number(arg('por-dia', '12'));
const DIAS_TIERRA = 7;
const VIVO = !process.argv.includes('--sin-vivo');
const DIA = 86_400_000;

const lanzamiento = new Date(Date.now() - DIAS * DIA);

// Respuesta "real" de cada persona en órbita (Δ relativo; temperatura en °C).
const TRIPULACION: Record<string, { traje: number; basal: Record<string, number>; delta: Record<string, number> }> = {
  tomas: { traje: 101, basal: { fc: 58, spo2: 98, fr: 13, temp: 36.6, sis: 122, dia: 78 },
           delta: { fc: -0.05, spo2: -0.005, fr: -0.05, temp: 0.9, sis: -0.07, dia: -0.11 } },
  ana:   { traje: 102, basal: { fc: 62, spo2: 98, fr: 14, temp: 36.6, sis: 115, dia: 75 },
           delta: { fc: -0.08, spo2: -0.005, fr: -0.04, temp: 1.0, sis: -0.06, dia: -0.10 } },
  mei:   { traje: 103, basal: { fc: 60, spo2: 98, fr: 14, temp: 36.7, sis: 118, dia: 76 },
           delta: { fc: -0.03, spo2: -0.004, fr: -0.06, temp: 0.8, sis: -0.08, dia: -0.12 } },
  luis:  { traje: 104, basal: { fc: 64, spo2: 97, fr: 15, temp: 36.5, sis: 125, dia: 80 },
           delta: { fc: -0.06, spo2: -0.006, fr: -0.05, temp: 1.1, sis: -0.07, dia: -0.11 } },
};

// Esquemas tal como están en semillas/inicial.json (la central los tiene registrados).
const TRAJE: Esquema = { id: 1, nombre: 'traje-v1', version: 1, campos: [
  { clave: 'fc', variable: '04:A4', tipo: 'u8' }, { clave: 'spo2', variable: '04:A3', tipo: 'u8' },
  { clave: 'fr', variable: '04:A2', tipo: 'u8' }, { clave: 'temp', variable: '04:A1', tipo: 'i16', escala: 0.01 },
] };
const BRAZALETE: Esquema = { id: 2, nombre: 'brazalete-pa-v1', version: 1, campos: [
  { clave: 'sis', variable: '01:V1', tipo: 'u8' }, { clave: 'dia', variable: 'X:PAD', tipo: 'u8' },
  { clave: 'pam', variable: 'X:PAM', formula: 'round((sis + 2 * dia) / 3 * 10) / 10' },
] };

const gauss = () => Math.sqrt(-2 * Math.log(1 - Math.random())) * Math.cos(2 * Math.PI * Math.random());

/** Valor fisiológico simulado de una variable en un instante. */
function valor(quien: string, v: string, t: Date): number {
  const p = TRIPULACION[quien]!;
  const dia = (t.getTime() - lanzamiento.getTime()) / DIA;
  const base = p.basal[v]!;
  const ruido = v === 'spo2' ? 0.006 : 0.035;
  if (dia < 0) return v === 'temp' ? base + 0.15 * gauss() : base * (1 + ruido * gauss());

  if (v === 'temp') return base + p.delta.temp! + 0.2 * gauss();
  let d = p.delta[v]!;
  if (v === 'fc' && dia < 3) d += 0.05 * (1 - dia / 3);                 // redistribución de fluidos
  if (v === 'fc' && quien === 'ana' && dia >= 109) d += 0.045 * (dia - 108); // fatiga acumulada
  return base * (1 + d + ruido * gauss());
}

let seq = 0;
const b64 = (u: Uint8Array) => Buffer.from(u).toString('base64');

function tramaTraje(quien: string, t: Date): string {
  const r = (v: string) => valor(quien, v, t);
  return b64(codificar({ idDisp: TRIPULACION[quien]!.traje, idEsquema: 1, seq: seq++, tScet: t }, TRAJE,
    { fc: r('fc'), spo2: Math.min(100, r('spo2')), fr: r('fr'), temp: r('temp') }));
}
function tramaBrazalete(quien: string, t: Date): string {
  return b64(codificar({ idDisp: 201, idEsquema: 2, seq: seq++, tScet: t }, BRAZALETE,
    { sis: valor(quien, 'sis', t), dia: valor(quien, 'dia', t) }));
}

async function post(ruta: string, cuerpo: unknown) {
  const r = await fetch(URL_BASE + ruta, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(cuerpo) });
  const j = await r.json() as Record<string, unknown>;
  if (!r.ok) throw new Error(`${ruta}: ${j.error as string}`);
  return j;
}

async function preparar() {
  const iso = (d: Date) => d.toISOString();
  const inicioTierra = new Date(lanzamiento.getTime() - DIAS_TIERRA * DIA);
  await post('/api/fases', { desde: iso(inicioTierra), entorno: 'tierra' });
  await post('/api/fases', { desde: iso(lanzamiento), entorno: 'orbita' });
  for (const [quien, p] of Object.entries(TRIPULACION)) {
    await post('/api/asignaciones', { dispositivo: p.traje, tripulante: quien, desde: iso(inicioTierra) });
  }
  await post('/api/asignaciones', { dispositivo: 302, tripulante: 'ana', desde: iso(inicioTierra) });
}

async function historia() {
  const nombres = Object.keys(TRIPULACION);
  let lote: string[] = [];
  let enviadas = 0;
  const vaciar = async () => {
    if (!lote.length) return;
    const r = await post('/api/tramas/binaria', { b64: lote }) as { rechazos: string[] };
    if (r.rechazos.length) console.warn('  rechazos:', r.rechazos.slice(0, 3));
    enviadas += lote.length; lote = [];
  };

  for (let d = -DIAS_TIERRA; d < DIAS; d++) {
    for (let k = 0; k < POR_DIA; k++) {
      const t = new Date(lanzamiento.getTime() + d * DIA + (k + 0.5) * (DIA / POR_DIA));
      for (const q of nombres) lote.push(tramaTraje(q, t));
    }
    // El brazalete es compartido: cada día pasa de mano en mano.
    for (const [i, q] of nombres.entries()) {
      const t = new Date(lanzamiento.getTime() + d * DIA + (8 + i) * 3600_000);
      await vaciar();
      await post('/api/asignaciones', { dispositivo: 201, tripulante: q, desde: new Date(t.getTime() - 60_000).toISOString() });
      lote.push(tramaBrazalete(q, t));
      await vaciar();
    }
    if (lote.length > 400) await vaciar();
    if (d % 20 === 0) process.stdout.write(`  día ${d}…\n`);
  }
  await vaciar();
  console.log(`Historia: ${enviadas} tramas binarias de ${DIAS_TIERRA + DIAS} días.`);
}

async function vivo() {
  console.log('En vivo: una trama por tripulante cada segundo (Ctrl+C para parar).');
  let n = 0;
  setInterval(async () => {
    const t = new Date();
    try {
      await post('/api/tramas/binaria', { b64: Object.keys(TRIPULACION).map((q) => tramaTraje(q, t)) });
      // Reloj de Ana vía celular: trama JSON, como la reenviaría la app de Katia y Diana.
      if (n++ % 5 === 0) {
        await post('/api/tramas', {
          frame: 'eva.telemetry.v1', source: { id: 'reloj-ana', kind: 'wrist' }, subject: 'ana',
          t_scet: t.toISOString(), seq: n,
          samples: [{ var: '04:A4', value: Math.round(valor('ana', 'fc', t)), unit: 'bpm', origin: 'sensor',
                      quality: { contacto: Math.random() > 0.03 } }],
        });
      }
    } catch (e) { console.error((e as Error).message); }
  }, 1000);
}

console.log(`Simulador EVA → ${URL_BASE}  ·  lanzamiento simulado: ${lanzamiento.toISOString().slice(0, 10)} (hoy = día ${DIAS})`);
await preparar();
await historia();
const alertas = await (await fetch(`${URL_BASE}/api/alertas`)).json() as Array<Record<string, unknown>>;
console.log(`Alertas generadas por LUNNA: ${alertas.length}`);
for (const a of alertas.slice(0, 6)) console.log(`  ${a.estado}  ${a.tripulante}  ${a.variable}  valor ${a.valor}  esperado ${a.esperado}  z=${a.z}  ${String(a.t_scet).slice(0, 10)}`);
if (VIVO) await vivo();
