/**
 * Modelos de eco/ECG de prototipo-salud lanzados desde la computadora central (cola en memoria, sin bloquear).
 * Flujo de un trabajo: runner `python -m core.run_model` (lanza él mismo el venv del modelo) → puente
 * `python -m motor.puente_modelos` (escribe muestras en eva.db) → `motor.evadb --evaluar` (semáforo, canal real).
 * Nada de esto es un diagnóstico; los datos simulados van siempre marcados SIMULADO.
 *
 * Configuración (variables de entorno; inyectable por OpcionesServidor.modelos en tests):
 *   PROTOTIPO_DIR | PROTOTIPO_SALUD   carpeta de prototipo-salud (def. ../../prototipo-salud desde el backend)
 *   PYTHON                            python de la app/motor (def. python en Windows, python3 en el resto)
 *   ENVS_DIR | PROTOTIPO_ENVS_DIR     venvs de los modelos (def. <PROTOTIPO_DIR>/envs); se pasa al hijo como PROTOTIPO_ENVS_DIR
 *   MUESTRAS_DIR                      muestras (def. <PROTOTIPO_DIR>/samples)
 *   MODELO_TIMEOUT_S                  tiempo máximo del modelo; si falta, manifest.timeout_s; si falta, 1800 s
 *   MODELO_MARGEN_S                   margen (def. 60 s): la nave mata el árbol de procesos a timeout + margen
 */
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, lstatSync, readdirSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { basename, isAbsolute, join, relative, resolve } from 'node:path';
import type { BD } from './db.ts';
import { correrMotor, dirPrototipo, ErrorSemaforo, rutaBd, semaforo } from './semaforo.ts';

export const AVISO_MODELOS = 'No es un diagnóstico. Salida de modelos de investigación; se recomienda revisión por el cirujano de vuelo.';

export class ErrorModelos extends Error {
  estado: number;
  constructor(estado: number, msg: string) { super(msg); this.estado = estado; }
}

type Cmd = { cmd: string; args: string[] };
export interface OpcionesModelos {
  prototipoDir?: string;
  python?: Cmd;
  /** Comando del runner (def. = python). Los tests inyectan un python falso. */
  runner?: Cmd;
  envsDir?: string;
  muestrasDir?: string;
  rawDir?: string;
  normalizedCsv?: string;
  timeoutS?: number;
  margenS?: number;
  /** Pausa entre reintentos de la re-evaluación cuando otro motor corre (def. 2000 ms). */
  reintentoMs?: number;
}
export interface ConfigModelos {
  prototipoDir: string; python: Cmd; runner: Cmd; envsDir: string; muestrasDir: string;
  rawDir?: string; normalizedCsv?: string; timeoutS?: number; margenS: number; reintentoMs: number;
}

const numEnv = (v: string | undefined): number | undefined => { const n = Number(v); return v !== undefined && v !== '' && Number.isFinite(n) && n > 0 ? n : undefined; };

export function configModelos(o: OpcionesModelos = {}): ConfigModelos {
  const e = process.env;
  const prototipoDir = resolve(o.prototipoDir ?? dirPrototipo());
  const python = o.python ?? { cmd: e.PYTHON ?? (process.platform === 'win32' ? 'python' : 'python3'), args: [] };
  return {
    prototipoDir, python, runner: o.runner ?? python,
    envsDir: resolve(o.envsDir ?? e.ENVS_DIR ?? e.PROTOTIPO_ENVS_DIR ?? join(prototipoDir, 'envs')),
    muestrasDir: resolve(o.muestrasDir ?? e.MUESTRAS_DIR ?? join(prototipoDir, 'samples')),
    rawDir: o.rawDir ? resolve(o.rawDir) : undefined, normalizedCsv: o.normalizedCsv ? resolve(o.normalizedCsv) : undefined,
    timeoutS: o.timeoutS ?? numEnv(e.MODELO_TIMEOUT_S),
    margenS: o.margenS ?? numEnv(e.MODELO_MARGEN_S) ?? 60,
    reintentoMs: o.reintentoMs ?? 2000,
  };
}

// Mismas claves que prototipo-salud/motor/entradas.py::METRICA_FEVI (modelos de eco con puente a la FEVI).
const MODELOS_ECO = ['echonet_dynamic', 'panecho', 'echoclip', 'echoprime'];
const MODELOS_ECG = ['ecg'];
const VIDEO = ['.avi', '.mp4', '.mov', '.mkv', '.webm', '.m4v'];
const RE_NOMBRE = /^[A-Za-z0-9._-]+$/;
const RE_KEY = /^[a-z0-9_]+$/;
const RE_VISTA = /^[A-Za-z0-9_ -]{1,32}$/;
const MAX_TRABAJOS = 50;

type Tipo = 'eco' | 'ecg' | 'otro';
const tipoDe = (k: string): Tipo => (MODELOS_ECO.includes(k) ? 'eco' : MODELOS_ECG.includes(k) ? 'ecg' : 'otro');
type Fila = Record<string, any>;

const dentro = (raiz: string, p: string) => { const r = relative(raiz, p); return r === '' || (!r.startsWith('..') && !isAbsolute(r)); };
const pythonDelVenv = (envs: string, key: string) =>
  process.platform === 'win32' ? join(envs, key, 'Scripts', 'python.exe') : join(envs, key, 'bin', 'python');

function manifests(c: ConfigModelos) {
  const dir = join(c.prototipoDir, 'adapters');
  let nombres: string[] = [];
  try { nombres = readdirSync(dir).sort(); } catch { return []; }
  const out: Array<{ key: string; nombre: string; tipo: Tipo; analizable: boolean; modalidades_admitidas: string[]; vistas_admitidas: string[]; timeout_s: number | null; entorno_instalado: boolean }> = [];
  for (const key of nombres) {
    if (!RE_KEY.test(key)) continue;
    try {
      const m = JSON.parse(readFileSync(join(dir, key, 'manifest.json'), 'utf8')) as Fila;
      const lista = (x: unknown, def: string[]) => (Array.isArray(x) ? x.map(String) : def);
      const tipo = tipoDe(key);
      out.push({ key, nombre: String(m.nombre ?? key), tipo, analizable: tipo !== 'otro',
        modalidades_admitidas: lista(m.modalidades_admitidas, []), vistas_admitidas: lista(m.vistas_admitidas, ['cualquiera']),
        timeout_s: typeof m.timeout_s === 'number' && m.timeout_s > 0 ? m.timeout_s : null,
        entorno_instalado: existsSync(pythonDelVenv(c.envsDir, key)) });
    } catch { /* manifest roto o ausente: se omite, no tumba el listado */ }
  }
  return out;
}

function muestras(c: ConfigModelos) {
  let raiz: string;
  let ents: string[];
  try { raiz = realpathSync(c.muestrasDir); ents = readdirSync(raiz).sort(); } catch { return []; }
  const out: Array<{ archivo: string; tipo: 'eco' | 'ecg'; modalidad: string; bytes: number }> = [];
  for (const n of ents) {
    if (!RE_NOMBRE.test(n) || n === '.' || n === '..') continue;
    const ext = n.includes('.') ? n.slice(n.lastIndexOf('.')).toLowerCase() : '';
    const tipo = VIDEO.includes(ext) ? 'eco' : ext === '.hea' ? 'ecg' : null;
    if (!tipo) continue;
    try {
      const p = join(raiz, n);
      const real = realpathSync(p);
      if (!dentro(raiz, real) || !statSync(real).isFile()) continue;
      if (lstatSync(p).isSymbolicLink() && dirnameDe(real) !== raiz) continue;
      out.push({ archivo: n, tipo, modalidad: tipo === 'eco' ? 'video_2d' : 'ecg_1d', bytes: statSync(real).size });
    } catch { /* ilegible */ }
  }
  return out;
}
const dirnameDe = (p: string) => resolve(p, '..');

// ── Procesos ────────────────────────────────────────────────────────────────

interface ResProc { codigo: number | null; stdout: string; stderr: string; agotado: boolean; fallo: string | null }

/** Mata el ÁRBOL de procesos: POSIX = grupo propio (detached) con SIGKILL; Windows = `taskkill /PID <pid> /T /F`. */
function matarArbol(pid: number | undefined): void {
  if (!pid) return;
  if (process.platform === 'win32') {
    try { spawn('taskkill', ['/PID', String(pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' }).on('error', () => {}); } catch { /* ya muerto */ }
    return;
  }
  try { process.kill(-pid, 'SIGKILL'); } catch { try { process.kill(pid, 'SIGKILL'); } catch { /* ya muerto */ } }
}

function lanzar(c: Cmd, args: string[], o: { cwd: string; env: NodeJS.ProcessEnv; limiteMs: number; alPid?: (pid: number) => void }): Promise<ResProc> {
  return new Promise((ok) => {
    const r: ResProc = { codigo: null, stdout: '', stderr: '', agotado: false, fallo: null };
    let listo = false;
    const fin = () => { if (!listo) { listo = true; clearTimeout(timer); ok(r); } };
    let hijo;
    try {
      hijo = spawn(c.cmd, [...c.args, ...args], { cwd: o.cwd, env: o.env, shell: false, windowsHide: true, detached: process.platform !== 'win32', stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (e) { r.fallo = (e as Error).message; return ok(r); }
    if (hijo.pid) o.alPid?.(hijo.pid);
    const cola = (k: 'stdout' | 'stderr') => (b: Buffer) => { r[k] = (r[k] + b.toString('utf8')).slice(-65536); };
    hijo.stdout!.on('data', cola('stdout'));
    hijo.stderr!.on('data', cola('stderr'));
    const timer = setTimeout(() => { r.agotado = true; matarArbol(hijo.pid); setTimeout(fin, 3000).unref(); }, o.limiteMs);
    hijo.on('error', (e: NodeJS.ErrnoException) => { r.fallo = e.code === 'ENOENT' ? `ENOENT: no se encontró «${c.cmd}»` : e.message; fin(); });
    hijo.on('close', (codigo) => { r.codigo = codigo; fin(); });
  });
}

const cola = (t: string, n = 2048) => (t.length > n ? t.slice(-n) : t).trim();
const ultimaLinea = (t: string) => t.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).at(-1) ?? '';

// ── Trabajos ────────────────────────────────────────────────────────────────

type Instantanea = { conteo: Record<string, number>; colores: Record<string, string>; nombres: Record<string, string> };
function instantanea(db: BD, trip: string): Instantanea {
  try {
    const t = semaforo(db, trip).tripulantes[0]!;
    return { conteo: { ...t.conteo }, colores: Object.fromEntries(t.semaforo.map((s) => [s.padecimiento_id, s.color])),
      nombres: Object.fromEntries(t.semaforo.map((s) => [s.padecimiento_id, s.nombre])) };
  } catch { return { conteo: {}, colores: {}, nombres: {} }; }
}

export function crearModelos(db: BD, opciones: OpcionesModelos | undefined, anotar: (l: string) => void) {
  const c = configModelos(opciones);
  const trabajosLista: Fila[] = [];   // más recientes primero
  const pendientes: Fila[] = [];
  const activos = new Set<string>();

  const disponibles = () => ({
    aviso: AVISO_MODELOS, modelos: manifests(c), muestras: muestras(c), muestras_dir: basename(c.muestrasDir),
  });

  function validar(cuerpo: unknown) {
    if (!cuerpo || typeof cuerpo !== 'object' || Array.isArray(cuerpo)) throw new ErrorModelos(400, 'el cuerpo debe ser un objeto JSON');
    const b = cuerpo as Fila;
    const txt = (k: string) => { if (typeof b[k] !== 'string' || !b[k]) throw new ErrorModelos(400, `${k} debe ser texto no vacío`); return b[k] as string; };
    const tripulante = txt('tripulante'), modelo = txt('modelo'), archivo = txt('archivo');
    if (typeof b.simulado !== 'boolean') throw new ErrorModelos(400, 'simulado es obligatorio y debe ser booleano');
    if (b.prueba_carga !== undefined && typeof b.prueba_carga !== 'boolean') throw new ErrorModelos(400, 'prueba_carga debe ser booleano');
    if (b.vista !== undefined && (typeof b.vista !== 'string' || !RE_VISTA.test(b.vista))) throw new ErrorModelos(400, 'vista inválida');
    if (!db.prepare('SELECT 1 AS x FROM tripulantes WHERE id = ?').get(tripulante)) throw new ErrorModelos(404, `tripulante ${tripulante} no existe`);
    if (!RE_KEY.test(modelo)) throw new ErrorModelos(400, 'modelo inválido');
    const m = manifests(c).find((x) => x.key === modelo);
    if (!m) throw new ErrorModelos(404, `modelo ${modelo} no existe`);
    if (!m.analizable) throw new ErrorModelos(400, `el modelo ${modelo} no es analizable desde la central (tipo «otro»)`);
    if (!RE_NOMBRE.test(archivo) || archivo === '.' || archivo === '..') throw new ErrorModelos(400, 'archivo inválido: solo se admite un nombre de la lista de muestras disponibles');
    const muestra = muestras(c).find((x) => x.archivo === archivo);
    if (!muestra) throw new ErrorModelos(400, 'archivo no está entre las muestras disponibles');
    if (muestra.tipo !== m.tipo) throw new ErrorModelos(400, `la muestra es de tipo ${muestra.tipo} y el modelo ${modelo} es de tipo ${m.tipo}`);
    if (m.modalidades_admitidas.length && !m.modalidades_admitidas.includes(muestra.modalidad)) throw new ErrorModelos(400, `${modelo} no admite la modalidad ${muestra.modalidad}`);
    let vista = 'desconocida';
    if (!m.vistas_admitidas.some((v) => v.toLowerCase() === 'cualquiera')) {
      if (b.vista === undefined) throw new ErrorModelos(400, `${modelo} exige declarar la vista (${m.vistas_admitidas.join(', ')})`);
      const ok = m.vistas_admitidas.find((v) => v.toLowerCase() === String(b.vista).toLowerCase());
      if (!ok) throw new ErrorModelos(400, `${modelo} no admite la vista ${b.vista} (admite ${m.vistas_admitidas.join(', ')})`);
      vista = ok;
    } else if (b.vista !== undefined) vista = b.vista as string;
    if (!rutaBd(db)) throw new ErrorModelos(409, 'La BD está en memoria: hace falta eva.db en archivo para que el puente y el motor la usen.');
    return { tripulante, modelo, archivo, tipo: m.tipo as 'eco' | 'ecg', modalidad: muestra.modalidad, vista, simulado: b.simulado as boolean,
      prueba_carga: b.prueba_carga === true, timeout_s: c.timeoutS ?? m.timeout_s ?? 1800 };
  }

  function analizar(cuerpo: unknown) {
    const v = validar(cuerpo);
    const t: Fila = {
      id: randomBytes(6).toString('hex'), tripulante: v.tripulante, modelo: v.modelo, tipo: v.tipo, archivo: v.archivo, vista: v.vista,
      simulado: v.simulado, prueba_carga: v.prueba_carga, estado: 'en_cola', fase: 'en_cola', creado: new Date().toISOString(),
      iniciado: null, terminado: null, timeout_s: v.timeout_s, run_id: null, run_dir: null, comando: null,
      salida: null, resultado: null, semaforo: null, error: null, aviso: AVISO_MODELOS,
    };
    t._modalidad = v.modalidad;
    trabajosLista.unshift(t);
    pendientes.push(t);
    while (trabajosLista.length > MAX_TRABAJOS) {
      const i = trabajosLista.findLastIndex((x) => x.estado === 'ok' || x.estado === 'error');
      if (i < 0) break;
      trabajosLista.splice(i, 1);
    }
    anotar(`Modelo ${t.modelo}: trabajo ${t.id} en cola (${t.archivo}${t.simulado ? ', SIMULADO' : ''})`);
    const vista = publico(t);
    setImmediate(bombear);   // el 202 se responde con estado en_cola
    return vista;
  }

  /** Quita rutas absolutas (salidas de procesos, errores) antes de mostrar un trabajo. */
  const ocultar = (txt: string) => {
    const rutas: Array<[string, string]> = [[rutaBd(db), '<eva.db>'], [c.normalizedCsv ?? '', '<normalized.csv>'], [c.rawDir ?? '', '<raw>'],
      [c.muestrasDir, '<muestras>'], [c.envsDir, '<envs>'], [c.prototipoDir, '<prototipo>']];
    for (const [r, marca] of rutas) {
      if (!r) continue;
      const variantes = new Set([r, (() => { try { return realpathSync(r); } catch { return r; } })()]);
      for (const v of variantes) for (const f of [v, JSON.stringify(v).slice(1, -1)]) txt = txt.split(f).join(marca);
    }
    return txt;
  };
  const publico = (t: Fila) => JSON.parse(ocultar(JSON.stringify(Object.fromEntries(Object.entries(t).filter(([k]) => !k.startsWith('_'))))));
  const trabajo = (id: string) => {
    const t = trabajosLista.find((x) => x.id === id);
    if (!t) throw new ErrorModelos(404, `trabajo ${id} no existe`);
    return publico(t);
  };
  const trabajos = () => trabajosLista.map(publico);

  /** Un trabajo activo por modelo; modelos distintos corren en paralelo. */
  function bombear() {
    for (const t of [...pendientes]) {
      if (activos.has(t.modelo)) continue;
      pendientes.splice(pendientes.indexOf(t), 1);
      activos.add(t.modelo);
      void correr(t).catch((e) => fallar(t, `Error interno: ${(e as Error).message}`)).finally(() => {
        if (t.estado === 'corriendo') fallar(t, 'terminó sin resultado');
        activos.delete(t.modelo);
        bombear();
      });
    }
  }

  const rutaVisible = (abs: string) => {
    if (dentro(c.prototipoDir, abs)) return relative(c.prototipoDir, abs).split('\\').join('/');
    return `${basename(c.rawDir ?? resolve(abs, '..'))}/${basename(abs)}`;
  };
  function fallar(t: Fila, msg: string) {
    t.estado = 'error'; t.fase = 'fin'; t.error = msg; t.terminado = new Date().toISOString();
    anotar(`Modelo ${t.modelo}: trabajo ${t.id} con error: ${msg.split('\n')[0]}`);
  }

  async function correr(t: Fila) {
    t.estado = 'corriendo'; t.fase = 'modelo'; t.iniciado = new Date().toISOString();
    const T = t.timeout_s as number;
    const env = { ...process.env, PROTOTIPO_ENVS_DIR: c.envsDir, PYTHONUTF8: '1', PYTHONIOENCODING: 'utf-8' };
    const abs = join(realpathSync(c.muestrasDir), t.archivo);
    const args = ['-m', 'core.run_model', '--model', t.modelo, '--input', abs, '--subject', t.tripulante, '--timestamp', new Date().toISOString(),
      '--modality', t._modalidad, '--view', t.vista || 'desconocida', '--timeout', String(T),
      ...(t.simulado ? ['--simulated'] : []), ...(t.prueba_carga ? ['--prueba-carga'] : []),
      ...(c.rawDir ? ['--raw-dir', c.rawDir] : []), ...(c.normalizedCsv ? ['--normalized-csv', c.normalizedCsv] : [])];
    t.comando = `python -m core.run_model --model ${t.modelo} --input ${basename(c.muestrasDir)}/${t.archivo} --subject ${t.tripulante} `
      + `--modality ${t._modalidad} --view ${t.vista} --timeout ${T}${t.simulado ? ' --simulated' : ''}${t.prueba_carga ? ' --prueba-carga' : ''}`;
    anotar(`Modelo ${t.modelo}: trabajo ${t.id} corriendo (tiempo máximo ${T} s)`);
    const r = await lanzar(c.runner, args, { cwd: c.prototipoDir, env, limiteMs: (T + c.margenS) * 1000 });
    if (r.agotado) return fallar(t, `Tiempo agotado (${T} s)`);
    if (r.fallo) return fallar(t, r.fallo.startsWith('ENOENT') ? `No se encontró el intérprete de Python (${basename(c.runner.cmd)}); defina PYTHON o instale Python 3. ${r.fallo}` : `No se pudo lanzar el runner: ${r.fallo}`);
    const linea = (k: string) => new RegExp(`^${k}:[ \\t]*(.*)$`, 'm').exec(r.stdout)?.[1]?.trim() ?? '';
    const msgStdout = linea('message');
    const runDirTxt = linea('run_dir');
    let resp: Fila | null = null;
    let runAbs: string | null = null;
    if (runDirTxt && runDirTxt !== 'None') {
      const cand = isAbsolute(runDirTxt) ? resolve(runDirTxt) : resolve(c.prototipoDir, runDirTxt);
      if (dentro(c.prototipoDir, cand) || (c.rawDir && dentro(c.rawDir, cand))) {
        runAbs = cand;
        try { resp = JSON.parse(readFileSync(join(cand, 'response.json'), 'utf8')) as Fila; } catch { resp = null; }
      }
    }
    if (runAbs) { t.run_dir = rutaVisible(runAbs); t.run_id = resp?.run_id ?? basename(runAbs); }
    t.salida = {
      status_run: resp?.status ?? linea('status') ?? null, message: resp?.message ?? msgStdout,
      inferencia_real: resp?.inferencia_real ?? null, random_load_test: resp?.random_load_test ?? null, device: resp?.device ?? null,
      checkpoint: resp?.checkpoint ? { path: resp.checkpoint.path ?? null, sha256: resp.checkpoint.sha256 ?? null } : null,
      warnings: Array.isArray(resp?.warnings) ? resp!.warnings.slice(0, 5).map(String) : [],
      stdout_cola: cola(r.stdout), stderr_cola: cola(r.stderr),
    };
    const status = t.salida.status_run;
    if (r.codigo === 2 || status === 'rechazado') return fallar(t, `rechazado: ${t.salida.message || '(sin motivo)'}`);
    if (r.codigo !== 0 || (status !== 'ok' && status !== 'prueba_carga')) {
      return fallar(t, `El modelo terminó con error (código ${r.codigo}): ${t.salida.message || ultimaLinea(r.stderr) || '(sin detalle)'}`);
    }
    if (!resp || !runAbs) return fallar(t, 'El modelo terminó pero no se encontró response.json en una carpeta permitida.');

    // ── puente ──
    t.fase = 'puente';
    const antes = instantanea(db, t.tripulante);
    const pArgs = ['-m', 'motor.puente_modelos', '--db', rutaBd(db), '--run-dir', runAbs, '--tripulante', t.tripulante, '--modelo', t.modelo,
      '--archivo', t.archivo, ...(t.simulado ? ['--simulado'] : [])];
    const p = await lanzar(c.python, pArgs, { cwd: c.prototipoDir, env, limiteMs: 120_000 });
    if (p.agotado) return fallar(t, 'El puente superó el tiempo límite (120 s).');
    if (p.fallo) return fallar(t, `No se pudo lanzar el puente: ${p.fallo}`);
    let pj: Fila | null = null;
    try { pj = JSON.parse(ultimaLinea(p.stdout)) as Fila; } catch { pj = null; }
    if (!pj) return fallar(t, `El puente no devolvió JSON (código ${p.codigo}): ${cola(p.stderr, 300).split(/\r?\n/).find((l) => l.trim() && !/^\s*at /.test(l)) ?? ultimaLinea(p.stdout)}`);
    if (pj.ok !== true || p.codigo !== 0) return fallar(t, `puente: ${pj.error ?? 'error sin detalle'}`);
    t.resultado = pj;

    // ── re-evaluación del semáforo (canal real; lo simulado lo ignora el motor, G1) ──
    const sem: Fila = { reevaluado: false, antes: { conteo: antes.conteo, colores: antes.colores }, despues: { conteo: antes.conteo, colores: antes.colores }, cambios: [] };
    t.semaforo = sem;
    if (Number(pj.guardadas) > 0) {
      t.fase = 'reevaluando';
      let motivo = '';
      for (let i = 0; i < 4; i++) {
        try { await correrMotor(rutaBd(db), false, { python: c.python, cwd: c.prototipoDir }); sem.reevaluado = true; motivo = ''; break; }
        catch (e) {
          motivo = (e as Error).message;
          if (!(e instanceof ErrorSemaforo && e.estado === 409 && /en curso/.test(e.message)) || i === 3) break;
          await new Promise((ok) => setTimeout(ok, c.reintentoMs));
        }
      }
      if (!sem.reevaluado) sem.motivo = motivo;
      const despues = instantanea(db, t.tripulante);
      sem.despues = { conteo: despues.conteo, colores: despues.colores };
      sem.cambios = Object.keys(despues.colores).filter((k) => antes.colores[k] !== despues.colores[k])
        .map((k) => ({ padecimiento_id: k, nombre: despues.nombres[k] ?? k, antes: antes.colores[k] ?? 'GRIS', despues: despues.colores[k] }));
    } else sem.motivo = 'el puente no guardó muestras nuevas; no se re-evaluó';
    t.estado = 'ok'; t.fase = 'fin'; t.terminado = new Date().toISOString();
    anotar(`Modelo ${t.modelo}: trabajo ${t.id} ok · ${pj.guardadas} muestras guardadas${t.simulado ? ' (SIMULADO)' : ''}${t.prueba_carga ? ' (PRUEBA DE CARGA)' : ''}`);
  }

  return { disponibles, analizar, trabajo, trabajos, config: c };
}
