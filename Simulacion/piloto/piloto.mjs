// Lunna · piloto automático de la simulación (sin navegador).
//
// Mantiene viva la demo en el VPS: ejecuta EL MISMO código del simulador (simulador.html) dentro de Node, con un DOM
// falso que ignora todo lo visual, y hace lo que haría alguien en el navegador: «Prepare mission» (112 días de
// historia), «▶ Live» (los sensores transmiten cada segundo) y la evaluación del semáforo de padecimientos. Cada
// REPREPARAR_H horas vuelve a preparar la misión desde cero (la base no crece sin límite).
//
//   node piloto/piloto.mjs                        (desde Simulacion/, con el backend en http://127.0.0.1:8787)
//   BACKEND=http://127.0.0.1:8788 node piloto/piloto.mjs
import fs from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const BACKEND = (process.env.BACKEND || 'http://127.0.0.1:8787').replace(/\/$/, '');
const REPREPARAR_H = Number(process.env.REPREPARAR_H || 24);
const html = fs.readFileSync(fileURLToPath(new URL('../simulador/simulador.html', import.meta.url)), 'utf8');
const ini = html.lastIndexOf('<script>'), fin = html.lastIndexOf('</script>');
const codigo = html.slice(ini + '<script>'.length, fin);
const hora = () => new Date().toISOString().slice(11, 19);
const log = (...a) => console.log(hora(), ...a);

// ── DOM falso: cualquier propiedad o llamada devuelve otro objeto falso; se puede asignar todo ──
function falso() {
  const f = function () { return falso(); };
  return new Proxy(f, {
    get(_t, p) {
      if (p === Symbol.toPrimitive) return (pista) => (pista === 'number' ? 0 : '');
      if (p === 'then') return undefined;                       // que no parezca una promesa
      if (p === 'length' || p === 'offsetWidth' || p === 'offsetHeight' || p === 'clientWidth' || p === 'clientHeight'
        || p === 'scrollHeight' || p === 'scrollTop' || p === 'value') return p === 'value' ? '' : 0;
      if (p === 'contains' || p === 'matches' || p === 'hasAttribute' || p === 'checked' || p === 'hidden') return () => false;
      if (p === 'querySelectorAll' || p === 'getElementsByClassName' || p === 'getElementsByTagName') return () => [];
      if (p === 'getBoundingClientRect') return () => ({ left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0 });
      if (p === 'dataset' || p === 'style') return new Proxy({}, { get: () => '', set: () => true });
      return falso();
    },
    set: () => true,
    apply: () => falso(),
    construct: () => falso(),
  });
}

const almacen = new Map();
const contexto = {
  console, setTimeout, clearTimeout, setInterval, clearInterval, URL, URLSearchParams, TextEncoder, TextDecoder,
  Uint8Array, DataView, ArrayBuffer, Date, Math, JSON, performance, structuredClone, btoa, atob,
  document: falso(), navigator: { language: 'en' }, location: { search: '', hash: '', href: BACKEND + '/simulador', origin: BACKEND },
  localStorage: { getItem: (k) => (almacen.has(k) ? almacen.get(k) : null), setItem: (k, v) => almacen.set(k, String(v)), removeItem: (k) => almacen.delete(k) },
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
  getComputedStyle: () => new Proxy({}, { get: () => '' }),
  requestAnimationFrame: () => 0, cancelAnimationFrame() {}, alert() {}, confirm: () => true,
  innerWidth: 1440, innerHeight: 900, devicePixelRatio: 1, scrollTo() {}, Blob, AbortController,
  ResizeObserver: class { observe() {} unobserve() {} disconnect() {} },
  IntersectionObserver: class { observe() {} unobserve() {} disconnect() {} },
  MutationObserver: class { observe() {} disconnect() {} },
  EventSource: class { constructor() {} addEventListener() {} close() {} },   // el piloto no necesita escuchar
  fetch: (ruta, opciones) => fetch(String(ruta).startsWith('/') ? BACKEND + ruta : ruta, opciones),
};
contexto.window = contexto; contexto.self = contexto; contexto.globalThis = contexto;
contexto.addEventListener = () => {}; contexto.removeEventListener = () => {};
vm.createContext(contexto);
vm.runInContext(codigo, contexto, { filename: 'simulador.html' });

// Lo que el simulador escribe en la consola de la PC central va al registro (sin HTML ni las tramas de cada segundo)
const trOriginal = contexto.tr;
contexto.tr = function (nodo, texto) {
  if (nodo === 'pc' && typeof texto === 'string' && !/received frame|recibid/.test(texto)) log('pc:', texto.replace(/<[^>]+>/g, '').slice(0, 200));
  return trOriginal?.apply(this, arguments);
};
vm.runInContext('tr = globalThis.tr;', contexto);

async function esperarBackend() {
  for (;;) {
    try { const r = await fetch(BACKEND + '/api/salud'); if (r.ok) return; } catch { /* aún no arranca */ }
    log('esperando al backend en', BACKEND); await new Promise((r) => setTimeout(r, 3000));
  }
}

async function preparar() {
  await esperarBackend();
  log('preparando la misión (112 días de historia)…');
  const t0 = Date.now();
  await vm.runInContext('preparar()', contexto);
  // preparar() lanza iniciar() sin esperarlo: se da hasta 30 s para que quede en vivo
  let vivo = false;
  for (let i = 0; i < 60 && !(vivo = vm.runInContext('S.vivo', contexto)); i++) await new Promise((r) => setTimeout(r, 500));
  log(`misión ${vivo ? 'en vivo' : 'NO quedó en vivo'} en ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  if (!vivo) throw new Error('la simulación no quedó en vivo');
}

let preparando = false, siguiente = null;
async function ciclo() {
  clearTimeout(siguiente); preparando = true;
  try { await preparar(); siguiente = setTimeout(ciclo, REPREPARAR_H * 3600_000); }
  catch (e) { log('falló la preparación:', e.message, '· reintento en 60 s'); siguiente = setTimeout(ciclo, 60_000); }
  finally { preparando = false; }
}

// Vigilancia cada minuto:
//  · si alguien pulsó «Reset» en el simulador público y nadie volvió a preparar la misión en 3 min, se prepara de nuevo;
//  · si la transmisión se detuvo (p. ej. pausa), se reanuda.
let vaciaDesde = null;
setInterval(async () => {
  if (preparando) return;
  try {
    const asign = await (await fetch(BACKEND + '/api/asignaciones')).json();
    if (!asign.length) {
      vaciaDesde ??= Date.now();
      if (Date.now() - vaciaDesde > 3 * 60_000) { log('la misión quedó vacía (reset sin preparar): se prepara de nuevo'); vaciaDesde = null; ciclo(); }
      return;
    }
    vaciaDesde = null;
    if (!vm.runInContext('S.vivo', contexto)) { log('reanudando la transmisión'); await vm.runInContext('iniciar()', contexto); }
  } catch (e) { log('vigilancia:', e.message); }
}, 60_000);
process.on('unhandledRejection', (e) => log('error:', e?.message || e));
ciclo();
