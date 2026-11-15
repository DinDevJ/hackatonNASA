// Python FALSO para test/modelos.test.ts (se ejecuta con process.execPath). Emula, según `-m <módulo>`:
//   core.run_model       escribe <raw>/<run_id>/response.json (formato de core/runs.py::nueva_respuesta + filas de core/formato.py)
//   motor.puente_modelos imprime el JSON del contrato (última línea) y guarda una muestra en eva.db
//   motor.evadb          inserta una evaluación por tripulante y escribe «Filas escritas en evaluaciones: N (canal real)»
// Modo (variable de entorno, leída en el hijo): FALSO_MODO = ok | error | rechazado | dormir. FALSO_REGISTRO = archivo donde se anota cada llamada.
// Todo lo que produce es SIMULADO/de prueba: no hay inferencia real.
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';

const a = process.argv.slice(2);
const modulo = a[a.indexOf('-m') + 1];
const arg = (k) => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : undefined; };
const tiene = (k) => a.includes(k);
const modo = process.env.FALSO_MODO ?? 'ok';
if (process.env.FALSO_REGISTRO) appendFileSync(process.env.FALSO_REGISTRO, JSON.stringify({ modulo, modo, modelo: arg('--model') ?? arg('--modelo'), env_envs: process.env.PROTOTIPO_ENVS_DIR }) + '\n');

const COLS = ['subject_id', 'study_id', 'timestamp', 'source', 'model', 'metric', 'value', 'unit', 'quality', 'simulated', 'tipo', 'run_id', 'input_file', 'notes'];

function filas(modelo, ctx, carga) {
  const base = { subject_id: ctx.sujeto, study_id: '', timestamp: ctx.ts, model: modelo, simulated: ctx.simulado, run_id: ctx.runId, input_file: ctx.archivo };
  if (carga) return [{ ...base, source: 'modelo_preentrenado', metric: 'EF', value: 51.2, unit: '%', quality: 'prueba_de_carga', tipo: 'medicion', notes: 'prueba de carga con tensor aleatorio' }];
  if (modelo === 'ecg') {
    const s = 'algoritmo_senal', r = 'regla_experimental';
    return [
      ['heart_rate', 72.4, 'bpm', 'medicion', 'ok', s], ['hrv_rmssd', 31.5, 'ms', 'medicion', 'ok', s], ['hrv_sdnn', 48.2, 'ms', 'medicion', 'ok', s],
      ['pr_interval', 160, 'ms', 'medicion', 'experimental_delineacion_dwt', s], ['qtc_bazett', 415, 'ms', 'medicion', 'experimental_delineacion_dwt', s],
      ['latidos_irregulares', 1, 'latidos', 'hallazgo', 'experimental_criterio_rr_prematuridad', s],
      ['ritmo_irregular_fraccion_ventanas', 0, 'fraccion_0_1', 'hallazgo', 'ok', r],
      ['ritmo_irregular_compatible_fa', 0, 'bandera_0_1_no_diagnostica', 'regla_alerta', 'experimental_bandera_no_diagnostica', r],
    ].map(([metric, value, unit, tipo, quality, source]) => ({ ...base, source, metric, value, unit, quality, tipo, notes: 'FALSO: no es inferencia real' }));
  }
  return [{ ...base, source: 'modelo_preentrenado', metric: 'EF', value: 55.0, unit: '%', quality: 'ok', tipo: 'medicion', notes: 'FALSO: no es inferencia real' }];
}

if (modulo === 'core.run_model') {
  const modelo = arg('--model'), carga = tiene('--prueba-carga');
  const runId = `20260101T000000_${modelo}_${randomBytes(4).toString('hex')}`;
  const runDir = join(arg('--raw-dir') ?? 'outputs/raw', runId);
  mkdirSync(runDir, { recursive: true });
  if (modo === 'dormir') {
    const nieto = spawn(process.execPath, ['-e', 'setInterval(()=>{},1000)'], { stdio: 'ignore' });
    if (process.env.FALSO_PIDFILE) writeFileSync(process.env.FALSO_PIDFILE, JSON.stringify({ hijo: process.pid, nieto: nieto.pid }));
    setInterval(() => {}, 1000);
  } else {
    await new Promise((ok) => setTimeout(ok, Number(process.env.FALSO_RETRASO_MS ?? 0)));
    const ctx = { sujeto: arg('--subject'), ts: arg('--timestamp'), simulado: tiene('--simulated'), runId, archivo: arg('--input').split(/[\\/]/).pop() };
    const status = modo === 'rechazado' ? 'rechazado' : modo === 'error' ? 'error' : carga ? 'prueba_carga' : 'ok';
    const message = modo === 'rechazado' ? 'Análisis no implementado: vista no admitida (FALSO)' : modo === 'error' ? 'El adaptador terminó sin resultado (FALSO)' : '';
    const resp = {
      status, message, model: modelo, run_id: runId, run_dir: runDir, subject_id: ctx.sujeto, study_id: null, timestamp: ctx.ts, simulated: ctx.simulado,
      checkpoint: { path: modelo === 'ecg' ? null : 'checkpoints/falso.pt', url: null, sha256: modelo === 'ecg' ? null : 'f'.repeat(64) }, device: 'cpu',
      random_load_test: carga, inferencia_real: false, config: { declared_modality: arg('--modality'), declared_view: arg('--view') },
      input: { path: `input/${ctx.archivo}`, sha256: null, modality: arg('--modality') }, raw_output: {},
      normalized: status === 'ok' || status === 'prueba_carga' ? filas(modelo, ctx, carga) : [], artifacts: [], elapsed_s: 0.1,
      warnings: ['FALSO: respuesta de prueba'], errors: [], entorno: {}, started_at: ctx.ts, finished_at: ctx.ts,
    };
    writeFileSync(join(runDir, 'response.json'), JSON.stringify(resp, null, 2));
    console.log(`status:   ${status}\nmessage:  ${message}\nrun_dir:  ${runDir}\nfilas normalizadas: ${resp.normalized.length}\ninferencia_real: false  random_load_test: ${carga}`);
    process.exit(modo === 'rechazado' ? 2 : modo === 'error' ? 1 : 0);
  }
} else if (modulo === 'motor.puente_modelos') {
  const modelo = arg('--modelo'), trip = arg('--tripulante'), simulado = tiene('--simulado');
  const tipo = modelo === 'ecg' ? 'ecg' : 'eco';
  const db = new DatabaseSync(arg('--db'));
  db.exec('PRAGMA busy_timeout = 5000');
  const ts = new Date().toISOString();
  const ins = db.prepare(`INSERT INTO muestras (tripulante, variable, valor, unidad, procedencia, calidad, t_scet, t_recibida) VALUES (?,?,?,?,?,?,?,?)`);
  const valores = tipo === 'eco'
    ? [{ metrica: 'EF', variable_id: '01:V18', valor: 55, unidad: '%', quality: 'ok', nivel: 'N4', decide: true, con_liga: true, padecimientos: ['P01'], experimental: false }]
    : [{ metrica: 'heart_rate', variable_id: '01:V1', valor: 72.4, unidad: 'bpm', quality: 'ok', nivel: 'N3', decide: true, con_liga: true, padecimientos: [], experimental: false },
       { metrica: 'pr_interval', variable_id: '01:V35', valor: 160, unidad: 'ms', quality: 'experimental_delineacion_dwt', nivel: 'N3', decide: false, con_liga: false, padecimientos: [], experimental: true }];
  let guardadas = 0;
  for (const v of valores) {
    ins.run(trip, v.variable_id, v.valor, v.unidad, tipo === 'eco' ? 'modelo_eco' : 'modelo_ecg', JSON.stringify({ simulado, falso: true }), ts, ts);
    v.guardada = true; v.existente = false; v.muestra_id = null; v.motivo = null; v.etiquetas = null; guardadas++;
  }
  db.close();
  console.log('traza del puente falso (no es JSON)');
  console.log(JSON.stringify({ ok: true, tipo, modelo, run_id: 'falso', status_run: 'ok', simulado, prueba_carga: false, inferencia_real: false, checkpoint: null, device: 'cpu', valores, guardadas, avisos: [], aviso: 'No es un diagnóstico. (FALSO)' }));
} else if (modulo === 'motor.evadb') {
  const db = new DatabaseSync(arg('--db'));
  db.exec('PRAGMA busy_timeout = 5000');
  const hay = db.prepare(`SELECT COUNT(*) AS n FROM muestras WHERE procedencia IN ('modelo_eco','modelo_ecg')`).get().n;
  const pad = db.prepare('SELECT id FROM padecimientos ORDER BY id LIMIT 1').get().id;
  let n = 0;
  for (const t of db.prepare('SELECT id FROM tripulantes').all()) {
    db.prepare(`INSERT INTO evaluaciones (tripulante, padecimiento_id, color, hora, canal, detalle) VALUES (?,?,?,?,?,?)`)
      .run(t.id, pad, hay ? 'AMARILLO' : 'VERDE', new Date().toISOString(), 'real', JSON.stringify({ motivo: 'FALSO: evaluación de prueba' }));
    n++;
  }
  db.close();
  console.log(`Filas escritas en evaluaciones: ${n} (canal real)`);
} else { console.error('módulo no emulado: ' + modulo); process.exit(3); }
