/**
 * Computadora central EVA. HTTP + eventos en vivo (SSE). Cero dependencias.
 *
 *   npm start            → http://localhost:8787 (modo operativo)
 *   cd ../../Simulacion && npm start   → mismo servidor en modo simulación (simulador y escenario)
 *
 * Contratos completos en ../README.md
 */
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { abrir, ahora, deJson, json, type BD } from './db.ts';
import { validarEsquema, type Esquema } from './esquema.ts';
import { bus, entornoEn, fijarVentanaPersonal, ingerirBinaria, ingerirJson, prediccionPara, ventanaPersonal, VENTANA_PERSONAL_MISION_MIN, type TramaJson } from './ingesta.ts';
import { ENTORNOS, type Entorno, type Prior } from './lunna.ts';
import { cargarInicial, importarSemillas, type SalidaTipo } from './semillas.ts';
import { encolarAvisoNave, escribirEnlace, iniciarEnlace, leerEnlace, redactarAviso } from './enlace.ts';
import { estadoNave, estadoTierra } from './enlace-https.ts';
import { idEmisor } from './sincro.ts';
import { migrarSalud, sembrarSalud } from './salud.ts';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { reiniciarEstados } from './ingesta.ts';
import { cargarReferencias, referencias, type CargaReferencias } from './referencias.ts';
import { estadoApp } from './app.ts';
import { avisoAbordo, cerrarEmergencia, consultaATierra, leerEmergencias, registrarEmergencia } from './abordo.ts';

const AQUI = dirname(fileURLToPath(import.meta.url));
/**
 * Interfaces de los dispositivos (Sistema/interfaces/), una carpeta por dispositivo y una común. Se
 * sirven en /<carpeta>/ con la misma estructura que en disco, para que sus rutas relativas
 * (../comun/…) valgan igual servidas que abiertas como archivo. Sólo estas carpetas quedan expuestas.
 *   /desktop/          computadora central (desktop/central.html)
 *   /desktop/tierra    base en Tierra (desktop/base.html)
 *   /mobile/           celular (mobile/index.html)
 *   /watch/            reloj (watch/index.html)
 *   /comun/…           estilos, Lunna, motor, modo.js y config.js
 */
const RAIZ_INTERFACES = resolve(join(AQUI, '..', '..', 'interfaces'));
const DISPOSITIVOS: Record<string, string> = { desktop: 'central.html', mobile: 'index.html', watch: 'index.html' };
const CARPETAS = [...Object.keys(DISPOSITIVOS), 'comun'];
/** Pantallas con nombre propio dentro de un dispositivo. */
const PANTALLAS: Record<string, string> = { '/desktop/tierra': 'desktop/base.html' };
/** Rutas anteriores (/app/…, /reloj, /maquetas/…): redirigen a la ruta nueva equivalente. */
const ANTIGUAS: Record<string, string> = {
  '': '/mobile/', 'index.html': '/mobile/', 'central.html': '/desktop/', 'base.html': '/desktop/tierra',
};
const TIPOS: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.wav': 'audio/wav', '.mp3': 'audio/mpeg',
};
const PUERTO = Number(process.env.PUERTO ?? 8787);
/** Referencias clínicas (umbrales absolutos). Puede no existir. Se puede cambiar con MEDIBLES. */
const RUTA_MEDIBLES = resolve(process.env.MEDIBLES ?? join(AQUI, '..', 'semillas', 'medibles.json'));
/** Sube al cambiar algo que la pasarela o el simulador necesiten. */
export const VERSION_BACKEND = '0.7.0';

class ErrorHttp extends Error {
  estado: number;
  constructor(estado: number, msg: string) { super(msg); this.estado = estado; }
}

async function cuerpo(req: IncomingMessage): Promise<Buffer> {
  const trozos: Buffer[] = [];
  let tam = 0;
  for await (const t of req) {
    tam += (t as Buffer).length;
    if (tam > 5_000_000) throw new ErrorHttp(413, 'cuerpo demasiado grande');
    trozos.push(t as Buffer);
  }
  return Buffer.concat(trozos);
}
async function cuerpoJson<T>(req: IncomingMessage): Promise<T> {
  try { return JSON.parse((await cuerpo(req)).toString('utf8')) as T; }
  catch { throw new ErrorHttp(400, 'JSON inválido'); }
}

type Manejador = (req: IncomingMessage, p: Record<string, string>, q: URLSearchParams) => Promise<unknown> | unknown;

const ARRANQUE = Date.now();
const recientes: string[] = [];
export function anotar(linea: string): void {
  const l = `${new Date().toLocaleTimeString('es')}  ${linea}`;
  recientes.unshift(l);
  recientes.length = Math.min(recientes.length, 15);
  console.log(l);
}

/** Lo que se ve al abrir http://localhost:8787: texto plano, se refresca solo. */
function estadoTexto(db: BD, rol: 'nave' | 'tierra' | null = null, modo: Modo = 'operativo'): string {
  const n = (sql: string) => (db.prepare(sql).get() as { n: number }).n;
  const e = leerEnlace(db);
  const seg = Math.floor((Date.now() - ARRANQUE) / 1000);
  return [
    `Lunna · computadora central · backend v${VERSION_BACKEND}`,
    `CORRIENDO desde hace ${Math.floor(seg / 60)} min ${seg % 60} s`,
    modo === 'simulacion' ? 'MODO SIMULACIÓN · los datos de esta base son SINTÉTICOS' : 'modo operativo · sin simulador ni escenario sintético',
    '',
    `entorno actual       ${entornoEn(db, ahora())}`,
    `ventana de LUNNA     ${ventanaPersonal() === VENTANA_PERSONAL_MISION_MIN ? '24 h (misión)' : `${ventanaPersonal()} min · DEMOSTRACIÓN`}`,
    `tripulantes          ${n('SELECT COUNT(*) AS n FROM tripulantes')}`,
    `dispositivos         ${n('SELECT COUNT(*) AS n FROM dispositivos')}`,
    `asignaciones activas ${n('SELECT COUNT(*) AS n FROM asignaciones WHERE hasta IS NULL')}`,
    `muestras guardadas   ${n('SELECT COUNT(*) AS n FROM muestras')}`,
    `alertas de LUNNA     ${n('SELECT COUNT(*) AS n FROM alertas')}`,
    `referencias clínicas ${referencias(db).size}`,
    '',
    ...bloqueEnlace(db, rol),
    `enlace con Tierra    ${e.abierto ? 'ABIERTO' : 'CERRADO'} · retraso ${e.owlt_s} s`,
    `  en cola en la nave ${n('SELECT COUNT(*) AS n FROM bajada WHERE t_envio IS NULL')}`,
    `  avisos de Tierra   ${n('SELECT COUNT(*) AS n FROM subida WHERE entregado = 1')} entregados`,
    '',
    'actividad reciente',
    ...(recientes.length ? recientes.map((r) => '  ' + r) : ['  (nada todavía)']),
    '',
    `${modo === 'simulacion' ? 'simulador visual: /simulador · ' : ''}control de misión (Tierra): /tierra · panel de la nave: /nave`,
    'dispositivos: computadora central /desktop · base en Tierra /desktop/tierra · celular /mobile · reloj /watch',
    'API: /api/salud · /api/estado · /api/app/<tripulante> · /api/alertas · /api/referencias · /api/stream · ver backend/README.md',
  ].join('\n');
}

/** Sirve un archivo estático de `raiz` (ruta relativa codificada en la URL), sin salir de esa carpeta. */
function servirArchivo(res: ServerResponse, raiz: string, relCodificada: string): void {
  let rel = '';
  try { rel = decodeURIComponent(relCodificada); } catch { /* ruta mal formada: 404 */ rel = '\0'; }
  const archivo = resolve(raiz, rel || 'index.html');
  const dentro = archivo.startsWith(raiz + sep) && !rel.includes('\0');
  if (!dentro || !existsSync(archivo) || !statSync(archivo).isFile()) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('no encontrado'); return;
  }
  res.writeHead(200, { 'content-type': TIPOS[extname(archivo).toLowerCase()] ?? 'application/octet-stream', 'cache-control': 'no-cache' })
    .end(readFileSync(archivo));
}

/** Bloque visible del enlace HTTPS (solo en el rol nave) o del último contacto (Tierra). */
function bloqueEnlace(db: BD, rol: 'nave' | 'tierra' | null): string[] {
  if (rol === 'tierra') {
    const t = estadoTierra(db);
    return [`ENLACE HTTPS (Tierra)  último contacto de la nave: ${t.ultimo_contacto_nave ?? 'ninguno'}${t.antiguedad_contacto_s === null ? '' : ` (hace ${t.antiguedad_contacto_s} s)`}`,
      `  mensajes recibidos ${t.recibidos} · pendientes de enviar a la nave ${t.pendientes_salida}`, ''];
  }
  if (rol !== 'nave') return [];
  const s = estadoNave(db);
  const cab = s.estado === 'CONECTADO' ? '██ CONECTADO ██' : `!! DESCONECTADO !! (${s.motivo ?? '—'})`;
  return [
    `ENLACE HTTPS CON TIERRA   ${cab}`,
    `  último ping OK     ${s.ultimo_ping_ok ? `${s.ultimo_ping_ok.slice(11, 19)} UTC (hace ${s.antiguedad_ping_s} s)` : 'ninguno todavía'}`,
    `  retraso estimado   ${s.retraso_estimado_s === null ? '—' : `${s.retraso_estimado_s} s (RTT/2)`} · retraso del modelo Marte ${s.owlt_modelo_s} s${s.simular_owlt ? ' (simulado)' : ''}`,
    `  pendientes de enviar ${s.pendientes_salida}${s.estado === 'DESCONECTADO' && s.proximo_intento ? ` · próximo intento ${s.proximo_intento.slice(11, 19)} UTC` : ''}`,
    '  panel: /nave',
    '',
  ];
}

/** Línea de log de la carga de referencias clínicas. */
function resumenReferencias(r: CargaReferencias): string {
  if (r.ausente) return `Referencias clínicas: no hay ${RUTA_MEDIBLES}; se sigue sin umbrales absolutos nuevos`;
  if (r.error) return `Referencias clínicas: ${RUTA_MEDIBLES} no se pudo cargar (${r.error}); se sigue con lo que hubiera`;
  return `Referencias clínicas: ${r.cargadas} cargadas (${r.con_umbral} con umbral absoluto)`
    + (r.omitidas ? `, ${r.omitidas} omitidas por no traer id` : '');
}

/** Actividad en la terminal y en la página de estado. */
export function registrarActividad(): void {
  let muestras = 0;
  bus.on('muestra', () => { muestras++; });
  setInterval(() => { if (muestras) { anotar(`+${muestras} muestras`); muestras = 0; } }, 10_000).unref();
  bus.on('alerta', (a: Record<string, unknown>) => {
    const u = a.umbral as { limite: number | null; valor_evaluado: number; lado: string | null; tipo: string } | null;
    const porUmbral = u ? ` · umbral ${u.tipo}: ${u.valor_evaluado} ${u.lado === 'min' ? '<' : '>'} ${u.limite}` : '';
    anotar(`LUNNA ${String(a.estado).toUpperCase()} [${a.motivo}] · ${a.tripulante} · ${a.variable} = ${a.valor} (esperado ${a.esperado}, z=${a.z})${porUmbral}`);
  });
  bus.on('rechazo', (r: string[]) => anotar(`rechazo: ${r.slice(0, 2).join(' · ')}`));
  bus.on('tierra', (b: Record<string, unknown>) => anotar(`→ Tierra recibe ${b.tipo}`));
  bus.on('aviso', (a: Record<string, unknown>) => anotar(`← aviso de Tierra para ${a.para}: «${a.texto}»`));
  bus.on('enlace', (e: Record<string, unknown>) => anotar(`enlace ${e.abierto ? 'abierto' : 'cerrado'}, retraso ${e.owlt_s} s`));
}

/**
 * Modo de operación. «operativo» (por defecto): no sirve el simulador, ni el escenario sintético de
 * las interfaces, ni el reinicio de la demo. «simulacion»: lo arranca Simulacion/ (cd Simulacion &&
 * npm start) y necesita la carpeta de Simulacion/ para servir esas piezas.
 */
export type Modo = 'operativo' | 'simulacion';

export interface OpcionesServidor {
  modo?: Modo;
  /** Carpeta Simulacion/ (obligatoria en modo simulación). */
  simulacion?: string;
  rol?: 'nave' | 'tierra';
  /** Rutas /enlace/* (solo Tierra). Devuelve true si atendió la petición. */
  enlace?: (req: IncomingMessage, res: ServerResponse) => Promise<boolean>;
}

/** Antigüedad en segundos de un evento (ahora − t_evento); null si la fecha no es válida. */
const antig = (t: unknown): number | null => {
  const ms = Date.parse(String(t));
  return Number.isFinite(ms) ? Math.max(0, Math.round((Date.now() - ms) / 1000)) : null;
};

export function manejador(db: BD, opciones: OpcionesServidor = {}) {
  const rol = opciones.rol ?? null;
  const modo: Modo = opciones.modo ?? 'operativo';
  if (modo !== 'operativo' && modo !== 'simulacion') throw new Error(`modo inválido "${modo}": operativo o simulacion`);
  if (modo === 'simulacion' && !opciones.simulacion) throw new Error('el modo simulación necesita la carpeta Simulacion/ (opción simulacion)');
  const raizSimulacion = opciones.simulacion ? resolve(opciones.simulacion) : null;
  const noEnOperativo = 'sólo disponible en modo simulación (cd Simulacion && npm start)';

  /**
   * Piezas de las interfaces que dependen del modo, en /comun/:
   *   config.js       window.EVA_CONFIG = { modo, escenario } (lo lee modo.js)
   *   escenario/<f>   escenario sintético (Simulacion/escenarios/interfaces/<f>), sólo en simulación
   * Devuelve true si atendió la petición.
   */
  const servirDeModo = (res: ServerResponse, rel: string): boolean => {
    if (rel === 'config.js') {
      res.writeHead(200, { 'content-type': TIPOS['.js']!, 'cache-control': 'no-cache' })
        .end(`window.EVA_CONFIG = ${JSON.stringify({ modo, escenario: modo === 'simulacion' ? 'escenario/' : null })};\n`);
      return true;
    }
    if (!rel.startsWith('escenario/')) return false;
    if (modo !== 'simulacion' || !raizSimulacion) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end(`escenario simulado: ${noEnOperativo}`);
      return true;
    }
    servirArchivo(res, join(raizSimulacion, 'escenarios', 'interfaces'), rel.slice('escenario/'.length));
    return true;
  };
  // Rutas propias de este manejador: varios servidores en un mismo proceso no se pisan.
  const rutas: Array<{ metodo: string; patron: RegExp; claves: string[]; h: Manejador }> = [];
  const ruta = (metodo: string, camino: string, h: Manejador) => {
    const claves: string[] = [];
    const patron = new RegExp('^' + camino.replace(/:(\w+)/g, (_, k) => { claves.push(k); return '([^/]+)'; }) + '$');
    rutas.push({ metodo, patron, claves, h });
  };
  const todos = (sql: string, ...a: Array<string | number | null>) => db.prepare(sql).all(...a);
  const uno = (sql: string, ...a: Array<string | number | null>) => db.prepare(sql).get(...a);

  ruta('GET', '/api/salud', () => ({ ok: true, version: VERSION_BACKEND, modo, hora: ahora(), entorno: entornoEn(db, ahora()),
    ventana_personal_min: ventanaPersonal() }));
  // Ventana del criterio personal de LUNNA: 1440 min en misión; se acorta sólo para demostraciones.
  ruta('GET', '/api/lunna/ventana', () => ({ minutos: ventanaPersonal(), mision: VENTANA_PERSONAL_MISION_MIN }));
  ruta('PUT', '/api/lunna/ventana', async (req) => {
    const { minutos } = await cuerpoJson<{ minutos: number }>(req);
    try {
      const m = fijarVentanaPersonal(Number(minutos ?? VENTANA_PERSONAL_MISION_MIN));
      reiniciarEstados();              // los estados recordados se calcularon con otra ventana
      anotar(m === VENTANA_PERSONAL_MISION_MIN ? 'LUNNA: ventana personal de 24 h (misión)' : `LUNNA: ventana personal de ${m} min (DEMOSTRACIÓN)`);
      return { minutos: m, mision: VENTANA_PERSONAL_MISION_MIN };
    } catch (e) { throw new ErrorHttp(400, (e as Error).message); }
  });

  // ── Registro de variables (edición desde la interfaz) ──
  ruta('GET', '/api/variables', () => todos(`SELECT * FROM variables ORDER BY id`));
  ruta('POST', '/api/variables', async (req) => {
    const v = await cuerpoJson<Record<string, string>>(req);
    if (!v.id?.includes(':')) throw new ErrorHttp(400, 'id con catálogo o prefijo X:, p. ej. 04:A4 o X:PAM');
    if (!v.nombre || !v.unidad) throw new ErrorHttp(400, 'nombre y unidad son obligatorios');
    db.prepare(`INSERT INTO variables VALUES (?,?,?,?,?,?,?)
                ON CONFLICT(id) DO UPDATE SET nombre=excluded.nombre, descripcion=excluded.descripcion,
                  unidad=excluded.unidad, tipo_umbral=excluded.tipo_umbral, procedencia=excluded.procedencia,
                  actualizada=excluded.actualizada`)
      .run(v.id, v.nombre, v.descripcion ?? null, v.unidad, v.tipo_umbral ?? null, v.procedencia ?? 'sensor', ahora());
    return uno(`SELECT * FROM variables WHERE id = ?`, v.id);
  });

  // ── Esquemas de trama: editar = versión nueva con id nuevo ──
  ruta('GET', '/api/esquemas', () =>
    todos(`SELECT * FROM esquemas ORDER BY id`).map((e) => ({ ...(e as object), campos: deJson((e as { campos: string }).campos) })));
  ruta('POST', '/api/esquemas', async (req) => {
    const e = await cuerpoJson<Omit<Esquema, 'id' | 'version'>>(req);
    const sig = (uno(`SELECT COALESCE(MAX(id), 0) + 1 AS id FROM esquemas`) as { id: number }).id;
    const ver = (uno(`SELECT COALESCE(MAX(version), 0) + 1 AS v FROM esquemas WHERE nombre = ?`, e.nombre) as { v: number }).v;
    const nuevo: Esquema = { id: sig, version: ver, nombre: e.nombre, campos: e.campos ?? [] };
    const errores = validarEsquema(nuevo);
    for (const c of nuevo.campos) {
      if (!uno(`SELECT 1 FROM variables WHERE id = ?`, c.variable)) errores.push(`${c.clave}: variable ${c.variable} no registrada`);
    }
    if (errores.length) throw new ErrorHttp(400, errores.join('; '));
    db.prepare(`INSERT INTO esquemas VALUES (?,?,?,?,?)`).run(sig, nuevo.nombre, ver, json(nuevo.campos), ahora());
    return nuevo;
  });

  // ── Dispositivos y asignaciones ──
  ruta('GET', '/api/dispositivos', () => todos(`SELECT * FROM dispositivos ORDER BY id`));
  ruta('POST', '/api/dispositivos', async (req) => {
    const d = await cuerpoJson<{ id: number; clave: string; nombre: string; tipo: string; perfil: string; esquema_id?: number }>(req);
    if (!Number.isInteger(d.id) || d.id < 0 || d.id > 0xffffffff) throw new ErrorHttp(400, 'id debe ser entero u32');
    db.prepare(`INSERT INTO dispositivos VALUES (?,?,?,?,?,?,?)
                ON CONFLICT(id) DO UPDATE SET clave=excluded.clave, nombre=excluded.nombre, tipo=excluded.tipo,
                  perfil=excluded.perfil, esquema_id=excluded.esquema_id`)
      .run(d.id, d.clave, d.nombre, d.tipo, d.perfil, d.esquema_id ?? null, ahora());
    return uno(`SELECT * FROM dispositivos WHERE id = ?`, d.id);
  });
  ruta('GET', '/api/asignaciones', () => todos(`SELECT * FROM asignaciones ORDER BY desde DESC`));
  ruta('POST', '/api/asignaciones', async (req) => {
    const a = await cuerpoJson<{ dispositivo: number; tripulante: string; desde?: string }>(req);
    if (!uno(`SELECT 1 FROM dispositivos WHERE id = ?`, Number(a.dispositivo))) {
      throw new ErrorHttp(400, `el dispositivo ${a.dispositivo} no está registrado (GET /api/dispositivos para ver los que hay)`);
    }
    if (!uno(`SELECT 1 FROM tripulantes WHERE id = ?`, String(a.tripulante))) {
      throw new ErrorHttp(400, `el tripulante "${a.tripulante}" no existe (GET /api/tripulantes para ver los que hay)`);
    }
    // Las tramas tienen resolución de 1 s: si la asignación empezara a mitad de un
    // segundo, una trama tomada en ese mismo segundo parecería anterior y se rechazaría.
    const desde = a.desde ?? new Date(Math.floor(Date.now() / 1000) * 1000).toISOString();
    // Ponerse un dispositivo cierra su asignación anterior.
    db.prepare(`UPDATE asignaciones SET hasta = ? WHERE dispositivo = ? AND hasta IS NULL`).run(desde, a.dispositivo);
    db.prepare(`INSERT INTO asignaciones (dispositivo, tripulante, desde) VALUES (?,?,?)`).run(a.dispositivo, a.tripulante, desde);
    return { ok: true, desde };
  });

  // ── Tripulantes, basales e historial ──
  ruta('GET', '/api/tripulantes', () => todos(`SELECT * FROM tripulantes ORDER BY id`));
  ruta('GET', '/api/tripulantes/:id', (_r, p) => {
    const t = uno(`SELECT * FROM tripulantes WHERE id = ?`, p.id!);
    if (!t) throw new ErrorHttp(404, 'tripulante no existe');
    return {
      ...(t as object),
      basales: todos(`SELECT variable, valor FROM basales WHERE tripulante = ?`, p.id!),
      historial: todos(`SELECT * FROM historial WHERE tripulante = ?`, p.id!),
      dispositivos: todos(`SELECT * FROM asignaciones WHERE tripulante = ? AND hasta IS NULL`, p.id!),
    };
  });
  ruta('POST', '/api/tripulantes', async (req) => {
    const t = await cuerpoJson<Record<string, string | number>>(req);
    db.prepare(`INSERT OR REPLACE INTO tripulantes VALUES (?,?,?,?,?,?,?,?)`)
      .run(String(t.id), String(t.nombre), (t.rol ?? null) as string, (t.sexo ?? null) as string,
           (t.edad ?? null) as number, (t.peso_kg ?? null) as number, (t.altura_m ?? null) as number, (t.sangre ?? null) as string);
    return uno(`SELECT * FROM tripulantes WHERE id = ?`, String(t.id));
  });
  ruta('PUT', '/api/tripulantes/:id/basales', async (req, p) => {
    const b = await cuerpoJson<Record<string, number>>(req);
    for (const [v, val] of Object.entries(b)) {
      db.prepare(`INSERT OR REPLACE INTO basales VALUES (?,?,?)`).run(p.id!, v, val);
    }
    return todos(`SELECT variable, valor FROM basales WHERE tripulante = ?`, p.id!);
  });
  ruta('POST', '/api/tripulantes/:id/historial', async (req, p) => {
    const hs = await cuerpoJson<Array<{ mision: string; entorno: string; variable: string; delta: number; escala: string }>>(req);
    for (const h of hs) {
      db.prepare(`INSERT INTO historial (tripulante, mision, entorno, variable, delta, escala) VALUES (?,?,?,?,?,?)`)
        .run(p.id!, h.mision, h.entorno, h.variable, h.delta, h.escala);
    }
    return todos(`SELECT * FROM historial WHERE tripulante = ?`, p.id!);
  });

  // ── Misión y priores ──
  ruta('GET', '/api/fases', () => todos(`SELECT * FROM fases ORDER BY desde`));
  ruta('POST', '/api/fases', async (req) => {
    const f = await cuerpoJson<{ desde: string; entorno: Entorno }>(req);
    if (!ENTORNOS.includes(f.entorno)) throw new ErrorHttp(400, `entorno: ${ENTORNOS.join(', ')}`);
    db.prepare(`INSERT OR REPLACE INTO fases VALUES (?,?)`).run(new Date(f.desde).toISOString(), f.entorno);
    return todos(`SELECT * FROM fases ORDER BY desde`);
  });
  ruta('GET', '/api/priores', () => todos(`SELECT datos FROM priores`).map((r) => deJson<Prior>((r as { datos: string }).datos)));
  ruta('PUT', '/api/priores', async (req) => {
    const p = await cuerpoJson<Prior>(req);
    if (!(p.tau0 > 0 && p.sigma_dia > 0 && p.sigma_mision > 0)) throw new ErrorHttp(400, 'τ₀ y σ deben ser > 0');
    if (!p.fuente) throw new ErrorHttp(400, 'un prior sin fuente no se acepta');
    db.prepare(`INSERT OR REPLACE INTO priores VALUES (?,?,?)`).run(p.variable, p.entorno, json(p));
    return p;
  });

  // ── Ingesta ──
  ruta('POST', '/api/tramas/binaria', async (req) => {
    const crudo = await cuerpo(req);
    const tipo = req.headers['content-type'] ?? '';
    if (!tipo.includes('json')) return ingerirBinaria(db, new Uint8Array(crudo));
    // JSON: { b64: "..." } o { b64: ["...", "..."] } para lotes.
    const { b64 } = JSON.parse(crudo.toString()) as { b64: string | string[] };
    const lista = Array.isArray(b64) ? b64 : [b64];
    const tot = { aceptadas: 0, duplicadas: 0, rechazos: [] as string[] };
    for (const x of lista) {
      const r = ingerirBinaria(db, new Uint8Array(Buffer.from(x, 'base64')));
      tot.aceptadas += r.aceptadas; tot.duplicadas += r.duplicadas; tot.rechazos.push(...r.rechazos);
    }
    return tot;
  });
  ruta('POST', '/api/tramas', async (req) => {
    const t = await cuerpoJson<TramaJson | TramaJson[]>(req);
    const lista = Array.isArray(t) ? t : [t];
    return lista.map((x) => ingerirJson(db, x));
  });
  ruta('POST', '/api/semillas', async (req) => importarSemillas(db, await cuerpoJson<SalidaTipo>(req)));

  // ── Consulta (para la interfaz de Fany) ──
  ruta('GET', '/api/muestras', (_r, _p, q) => {
    const lim = Math.min(Number(q.get('limite') ?? 500), 5000);
    return todos(
      `SELECT * FROM muestras WHERE tripulante = ? AND variable = ? AND t_scet >= ?
       ORDER BY t_scet DESC LIMIT ?`,
      q.get('tripulante') ?? '', q.get('variable') ?? '', q.get('desde') ?? '0000', lim,
    );
  });
  ruta('GET', '/api/prediccion/:tripulante', (_r, p, q) => {
    const t = q.get('t') ?? ahora();
    return (todos(`SELECT variable FROM basales WHERE tripulante = ?`, p.tripulante!) as Array<{ variable: string }>)
      .map((b) => prediccionPara(db, p.tripulante!, b.variable, t))
      .filter(Boolean);
  });
  ruta('GET', '/api/estado', () => {
    const ultimos = todos(
      `SELECT m.tripulante, m.variable, m.valor, m.unidad, m.t_scet, m.calidad
       FROM muestras m JOIN (SELECT tripulante, variable, MAX(t_scet) AS t FROM muestras GROUP BY tripulante, variable) u
         ON m.tripulante = u.tripulante AND m.variable = u.variable AND m.t_scet = u.t`,
    ) as Array<{ tripulante: string; variable: string }>;
    const alertas = todos(
      `SELECT a.* FROM alertas a JOIN (SELECT tripulante, variable, MAX(id) AS id FROM alertas GROUP BY tripulante, variable) u
         ON a.id = u.id`,
    ) as Array<{ tripulante: string; variable: string; estado: string }>;
    const est = new Map(alertas.map((a) => [`${a.tripulante}|${a.variable}`, a.estado]));
    return ultimos.map((u) => ({ ...u, estado: est.get(`${u.tripulante}|${u.variable}`) ?? 'verde' }));
  });
  ruta('GET', '/api/alertas', (_r, _p, q) =>
    todos(`SELECT * FROM alertas ORDER BY id DESC LIMIT ?`, Math.min(Number(q.get('limite') ?? 100), 1000)));

  // ── Referencias clínicas: umbrales absolutos y ficha de cada variable (semillas/medibles.json) ──
  ruta('GET', '/api/referencias', () => [...referencias(db).values()]);
  ruta('POST', '/api/referencias/recargar', () => {
    const r = cargarReferencias(db, RUTA_MEDIBLES);
    anotar(resumenReferencias(r));
    return { ...r, total: referencias(db).size };
  });

  // ── App móvil: todo lo de un tripulante en una llamada ──
  ruta('GET', '/api/app/:tripulante', (_r, p) => {
    const e = estadoApp(db, p.tripulante!);
    if (!e) throw new ErrorHttp(404, `el tripulante "${p.tripulante}" no existe (GET /api/tripulantes para ver los que hay)`);
    return e;
  });

  // ── Sincronización con Tierra (almacenar y reenviar) ──
  ruta('GET', '/api/tierra/cola', () =>
    todos(`SELECT * FROM alertas WHERE enviada_tierra = 0
           ORDER BY CASE estado WHEN 'rojo' THEN 0 WHEN 'ambar' THEN 1 ELSE 2 END, t_scet`));
  ruta('POST', '/api/tierra/ack', async (req) => {
    const { ids } = await cuerpoJson<{ ids: number[] }>(req);
    for (const id of ids ?? []) db.prepare(`UPDATE alertas SET enviada_tierra = 1 WHERE id = ?`).run(id);
    return { confirmadas: ids?.length ?? 0 };
  });

  // ── Enlace con Tierra ──
  ruta('GET', '/api/enlace', () => leerEnlace(db));
  ruta('PUT', '/api/enlace', async (req) => {
    try { return escribirEnlace(db, await cuerpoJson<{ owlt_s?: number; abierto?: boolean }>(req)); }
    catch (e) { throw new ErrorHttp(400, (e as Error).message); }
  });
  ruta('GET', '/api/tierra/bandeja', (_r, _p, q) => {
    const t = ahora();
    const tipo = q.get('tipo');
    const filas = (tipo
      ? todos(`SELECT * FROM bajada WHERE t_ert IS NOT NULL AND t_ert <= ? AND tipo = ? ORDER BY id DESC LIMIT 100`, t, tipo)
      : todos(`SELECT * FROM bajada WHERE t_ert IS NOT NULL AND t_ert <= ? ORDER BY id DESC LIMIT 100`, t)) as Array<Record<string, unknown>>;
    return filas
      .map((b) => ({ ...b, datos: JSON.parse(String(b.datos)),
        t_evento: b.t_scet, t_recepcion: b.t_ert, antiguedad_s: antig(b.t_scet),
        antiguedad_al_llegar_s: Math.round((Date.parse(String(b.t_ert)) - Date.parse(String(b.t_scet))) / 1000) }));
  });
  ruta('GET', '/api/tierra/pendientes', () => ({
    en_cola_nave: (uno(`SELECT COUNT(*) AS n FROM bajada WHERE t_envio IS NULL`) as { n: number }).n,
    en_vuelo_a_tierra: (uno(`SELECT COUNT(*) AS n FROM bajada WHERE t_envio IS NOT NULL AND t_ert > ?`, ahora()) as { n: number }).n,
    avisos_en_cola_tierra: (uno(`SELECT COUNT(*) AS n FROM subida WHERE t_envio IS NULL`) as { n: number }).n,
    avisos_en_vuelo_a_nave: (uno(`SELECT COUNT(*) AS n FROM subida WHERE t_envio IS NOT NULL AND entregado = 0`) as { n: number }).n,
  }));
  ruta('POST', '/api/tierra/avisos', async (req) => {
    try { return { id: redactarAviso(db, await cuerpoJson(req)), enlace: leerEnlace(db) }; }
    catch (e) { throw new ErrorHttp(400, (e as Error).message); }
  });
  const conEdad = (f: unknown) => { const a = f as Record<string, unknown>; return { ...a, t_evento: a.t_redactado, t_recepcion: a.t_llegada, antiguedad_s: antig(a.t_redactado) }; };
  ruta('GET', '/api/tierra/avisos', () => todos(`SELECT * FROM subida ORDER BY id DESC LIMIT 100`).map(conEdad));
  ruta('GET', '/api/avisos', () => todos(`SELECT * FROM subida WHERE entregado = 1 ORDER BY id DESC LIMIT 100`).map(conEdad));

  // ── Enlace HTTPS nave↔Tierra: estado y avisos nave→Tierra (canal 'aviso' de la bajada) ──
  ruta('GET', '/api/enlace/estado', () => {
    if (rol === 'tierra') return estadoTierra(db);
    if (rol === 'nave') return estadoNave(db);
    const e = leerEnlace(db);
    return { rol: null, estado: 'SIMULADO', owlt_modelo_s: e.owlt_s, ventana_abierta: e.abierto,
      pendientes_salida: (uno(`SELECT COUNT(*) AS n FROM bajada WHERE t_envio IS NULL`) as { n: number }).n };
  });
  ruta('POST', '/api/nave/avisos', async (req) => {
    try { return { seq: encolarAvisoNave(db, await cuerpoJson(req)) }; }
    catch (e) { throw e instanceof ErrorHttp ? e : new ErrorHttp(400, (e as Error).message); }
  });
  ruta('GET', '/api/nave/avisos', () => {
    if (rol === 'tierra') return [];
    return (todos(`SELECT * FROM bajada WHERE tipo = 'aviso' AND emisor = ? ORDER BY seq DESC LIMIT 100`, idEmisor(db, 'nave')) as Array<Record<string, unknown>>)
      .map((b) => { const d = JSON.parse(String(b.datos)) as Record<string, unknown>;
        return { seq: b.seq, de: d.de, texto: d.texto, prioridad: d.prioridad, t_evento: b.t_scet, ack: b.ack, t_ack: b.t_ack,
          intentos: b.intentos, antiguedad_s: antig(b.t_scet) }; });
  });

  // ── A bordo: avisos de la CMO, consultas a Tierra y emergencias (abordo.ts) ──
  const conError = async <T>(f: () => T | Promise<T>) => { try { return await f(); } catch (e) { throw new ErrorHttp(400, (e as Error).message); } };
  ruta('POST', '/api/abordo/avisos', async (req) => conError(async () => avisoAbordo(db, await cuerpoJson(req))));
  ruta('GET', '/api/abordo/avisos', () => todos(`SELECT * FROM abordo ORDER BY id DESC LIMIT 100`));
  ruta('POST', '/api/central/consultas', async (req) => conError(async () => ({ ...consultaATierra(db, await cuerpoJson(req)), enlace: leerEnlace(db) })));
  ruta('GET', '/api/emergencias', (_r, _p, q) => leerEmergencias(db, q.get('tripulante') ?? undefined));
  ruta('POST', '/api/emergencias', async (req) => conError(async () => registrarEmergencia(db, await cuerpoJson(req))));
  ruta('PUT', '/api/emergencias/:id', async (req, p) => conError(async () => cerrarEmergencia(db, Number(p.id), (await cuerpoJson<{ resultado: string }>(req)).resultado)));

  // ── Sólo para la demo (modo simulación): deja la misión en blanco, conserva la configuración ──
  ruta('POST', '/api/demo/reiniciar', () => {
    if (modo !== 'simulacion') throw new ErrorHttp(403, `reiniciar la demo: ${noEnOperativo}`);
    db.exec(`DELETE FROM muestras; DELETE FROM alertas; DELETE FROM asignaciones; DELETE FROM fases;
             DELETE FROM bajada; DELETE FROM subida; DELETE FROM abordo; DELETE FROM emergencias;`);
    fijarVentanaPersonal(VENTANA_PERSONAL_MISION_MIN);
    reiniciarEstados();
    return { ok: true };
  });

  /**
   * /desktop, /desktop/tierra, /mobile, /watch y /comun, y las rutas anteriores que redirigen a ellas.
   * Devuelve true si atendió la petición.
   */
  const atenderInterfaces = (url: URL, res: ServerResponse): boolean => {
    const ruta = url.pathname;
    const a = (destino: string, codigo = 302) => { res.writeHead(codigo, { location: destino + url.search }).end(); return true; };
    const no = () => { res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('no encontrado'); return true; };

    // Pantallas con nombre propio (/desktop/tierra) y su variante con barra final.
    if (PANTALLAS[ruta]) { servirArchivo(res, RAIZ_INTERFACES, PANTALLAS[ruta]); return true; }
    if (ruta.endsWith('/') && PANTALLAS[ruta.slice(0, -1)]) return a(ruta.slice(0, -1), 301);

    // /<carpeta>/<archivo>: la carpeta sola lleva a su pantalla de inicio.
    const [, carpeta = '', ...partes] = ruta.split('/');
    if (CARPETAS.includes(carpeta)) {
      if (!partes.length) return a(`/${carpeta}/`, 301);
      const rel = partes.join('/');
      if (carpeta === 'comun' && servirDeModo(res, rel)) return true;
      servirArchivo(res, join(RAIZ_INTERFACES, carpeta), rel || DISPOSITIVOS[carpeta] || '');
      return true;
    }

    // Rutas anteriores: /app/… y /maquetas/Leo/maqueta-eva/… (celular, central y base juntos).
    const app = /^\/(?:app|maquetas\/Leo\/maqueta-eva)(?:\/(.*))?$/.exec(ruta);
    if (app) {
      const rel = app[1] ?? '';
      if (rel in ANTIGUAS) return a(ANTIGUAS[rel]!);
      if (rel === 'config.js' || rel.startsWith('escenario/')) return a('/comun/' + rel);
      if (!/^[\w.-]+$/.test(rel)) return no();
      const donde = CARPETAS.find((c) => existsSync(join(RAIZ_INTERFACES, c, rel)));
      return donde ? a(`/${donde}/${rel}`) : no();
    }
    // /reloj y /maquetas/Fani/maqueta-reloj/… → /watch/….
    const reloj = /^\/(?:reloj|maquetas\/Fani\/maqueta-reloj)(?:\/(.*))?$/.exec(ruta);
    if (reloj) return a('/watch/' + (reloj[1] ?? ''));
    return false;
  };

  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'content-type');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,OPTIONS');
    if (req.method === 'OPTIONS') { res.writeHead(204).end(); return; }

    const url = new URL(req.url ?? '/', 'http://x');

    // Página de estado: al abrir http://localhost:8787 se ve que el backend corre.
    if (req.method === 'GET' && url.pathname === '/') {
      res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8', refresh: '2' }).end(estadoTexto(db, rol, modo));
      return;
    }
    // Interfaces de los dispositivos: archivos estáticos, sin salir de su carpeta.
    if (req.method === 'GET' && atenderInterfaces(url, res)) return;
    // Panel de la nave (enlace HTTPS): lo escribe otro módulo; si no existe, 404.
    if (req.method === 'GET' && url.pathname === '/nave') {
      const html = join(AQUI, '..', 'web', 'nave.html');
      if (!existsSync(html)) { res.writeHead(404, { 'content-type': 'application/json' }).end(JSON.stringify({ error: 'web/nave.html no existe' })); return; }
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end(readFileSync(html));
      return;
    }
    // Transporte del enlace (solo Tierra): /enlace/ping, lote, descarga, ack.
    if (opciones.enlace && url.pathname.startsWith('/enlace/')) {
      try { if (await opciones.enlace(req, res)) return; }
      catch (e) { if (!res.headersSent) res.writeHead(500, { 'content-type': 'application/json' }).end(JSON.stringify({ error: (e as Error).message })); else res.destroy(); return; }
    }
    // Consola de control de misión (Tierra).
    if (req.method === 'GET' && url.pathname === '/tierra') {
      const html = join(AQUI, '..', 'web', 'tierra.html');
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end(readFileSync(html));
      return;
    }
    // Simulador visual (Simulacion/simulador/simulador.html): sólo en modo simulación.
    if (req.method === 'GET' && url.pathname === '/simulador') {
      const html = raizSimulacion && modo === 'simulacion' ? join(raizSimulacion, 'simulador', 'simulador.html') : null;
      if (!html || !existsSync(html)) {
        res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end(`simulador visual: ${noEnOperativo}`);
        return;
      }
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end(readFileSync(html));
      return;
    }

    // Eventos en vivo: muestras, alertas y rechazos.
    if (req.method === 'GET' && url.pathname === '/api/stream') {
      res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive' });
      res.write(': conectado\n\n');
      const enviar = (tipo: string) => (d: unknown) => res.write(`event: ${tipo}\ndata: ${JSON.stringify(d)}\n\n`);
      const tipos = ['muestra', 'alerta', 'rechazo', 'tierra', 'aviso', 'enlace', 'emergencia'];   // 'trama' no: Tierra recibe las crudas por el enlace
      const oyentes = tipos.map((tp) => [tp, enviar(tp)] as const);
      for (const [tp, f] of oyentes) bus.on(tp, f);
      const latido = setInterval(() => res.write(': latido\n\n'), 15000);
      req.on('close', () => { clearInterval(latido); for (const [tp, f] of oyentes) bus.off(tp, f); });
      return;
    }

    for (const r of rutas) {
      if (r.metodo !== req.method) continue;
      const m = r.patron.exec(url.pathname);
      if (!m) continue;
      try {
        const p = Object.fromEntries(r.claves.map((k, i) => [k, decodeURIComponent(m[i + 1]!)]));
        const out = await r.h(req, p, url.searchParams);
        res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' }).end(JSON.stringify(out));
      } catch (e) {
        const estado = e instanceof ErrorHttp ? e.estado : 500;
        res.writeHead(estado, { 'content-type': 'application/json; charset=utf-8' })
          .end(JSON.stringify({ error: (e as Error).message }));
      }
      return;
    }
    res.writeHead(404, { 'content-type': 'application/json' }).end(JSON.stringify({ error: 'ruta no existe' }));
  };
}

export function construir(db: BD, opciones: OpcionesServidor = {}) {
  return createServer(manejador(db, opciones));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  // Modo: operativo por defecto. Simulacion/ arranca con --modo simulacion --simulacion <carpeta>.
  const argumento = (k: string) => { const i = process.argv.indexOf(`--${k}`); return i >= 0 ? process.argv[i + 1] : undefined; };
  const modo = (argumento('modo') ?? 'operativo') as Modo;
  const simulacion = argumento('simulacion');
  if (modo !== 'operativo' && modo !== 'simulacion') { console.error(`✗ --modo "${modo}": operativo o simulacion`); process.exit(1); }
  if (modo === 'simulacion' && !simulacion) { console.error('✗ el modo simulación necesita --simulacion <carpeta Simulacion/>; usa `cd Simulacion && npm start`'); process.exit(1); }
  // Cada modo tiene su base: los datos sintéticos nunca caen en la base operativa.
  const db = abrir(process.env.BD ?? (modo === 'simulacion' ? join(resolve(simulacion!), 'eva-simulacion.db') : join(AQUI, '..', 'eva.db')));
  const { nuevos } = cargarInicial(db, join(AQUI, '..', 'semillas', 'inicial.json'));
  const añadidos = Object.entries(nuevos).filter(([, n]) => n > 0).map(([k, n]) => `${n} ${k}`);
  if (añadidos.length) console.log(`Semillas: añadidos ${añadidos.join(', ')}`);
  console.log(resumenReferencias(cargarReferencias(db, RUTA_MEDIBLES)));
  migrarSalud(db);
  const sal = sembrarSalud(db);
  console.log(`Salud: ${sal.ausente ? 'sin CSV del modelo' : sal.error ? `error (${sal.error})` : `${sal.padecimientos} padecimientos, ${sal.vinculos} vínculos`}`);
  const srv = construir(db, { modo, simulacion });
  iniciarEnlace(db);
  registrarActividad();
  srv.on('error', (e: NodeJS.ErrnoException) => {
    if (e.code === 'EADDRINUSE') {
      console.error(`\n✗ El puerto ${PUERTO} ya está en uso: hay OTRO backend corriendo (quizá una versión vieja).`);
      console.error('  Ciérralo (Ctrl+C en su terminal, o cierra esa terminal) y vuelve a ejecutar npm start.\n');
      process.exit(1);
    }
    throw e;
  });
  srv.listen(PUERTO, () => {
    console.log(`Lunna · backend v${VERSION_BACKEND} · ${modo === 'simulacion' ? 'MODO SIMULACIÓN (datos sintéticos)' : 'modo operativo'}`);
    if (modo === 'simulacion') console.log(`  simulador visual: http://localhost:${PUERTO}/simulador`);
    console.log(`  estado:           http://localhost:${PUERTO}   (se refresca solo)`);
    console.log(`  eventos en vivo:  http://localhost:${PUERTO}/api/stream`);
  });
}
