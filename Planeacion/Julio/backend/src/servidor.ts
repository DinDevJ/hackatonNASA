/**
 * Computadora central EVA. HTTP + eventos en vivo (SSE). Cero dependencias.
 *
 *   npm start            → http://localhost:8787
 *
 * Contratos completos en ../README.md
 */
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { abrir, ahora, deJson, json, type BD } from './db.ts';
import { validarEsquema, type Esquema } from './esquema.ts';
import { bus, entornoEn, ingerirBinaria, ingerirJson, prediccionPara, type TramaJson } from './ingesta.ts';
import { ENTORNOS, type Entorno, type Prior } from './lunna.ts';
import { cargarInicial, importarSemillas, type SalidaTipo } from './semillas.ts';

const AQUI = dirname(fileURLToPath(import.meta.url));
const PUERTO = Number(process.env.PUERTO ?? 8787);

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
const rutas: Array<{ metodo: string; patron: RegExp; claves: string[]; h: Manejador }> = [];
function ruta(metodo: string, camino: string, h: Manejador) {
  const claves: string[] = [];
  const patron = new RegExp('^' + camino.replace(/:(\w+)/g, (_, k) => { claves.push(k); return '([^/]+)'; }) + '$');
  rutas.push({ metodo, patron, claves, h });
}

export function construir(db: BD) {
  const todos = (sql: string, ...a: Array<string | number | null>) => db.prepare(sql).all(...a);
  const uno = (sql: string, ...a: Array<string | number | null>) => db.prepare(sql).get(...a);
  rutas.length = 0;

  ruta('GET', '/api/salud', () => ({ ok: true, hora: ahora(), entorno: entornoEn(db, ahora()) }));

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

  // ── Sincronización con Tierra (almacenar y reenviar) ──
  ruta('GET', '/api/tierra/cola', () =>
    todos(`SELECT * FROM alertas WHERE enviada_tierra = 0
           ORDER BY CASE estado WHEN 'rojo' THEN 0 WHEN 'ambar' THEN 1 ELSE 2 END, t_scet`));
  ruta('POST', '/api/tierra/ack', async (req) => {
    const { ids } = await cuerpoJson<{ ids: number[] }>(req);
    for (const id of ids ?? []) db.prepare(`UPDATE alertas SET enviada_tierra = 1 WHERE id = ?`).run(id);
    return { confirmadas: ids?.length ?? 0 };
  });

  return createServer(async (req: IncomingMessage, res: ServerResponse) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'content-type');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,OPTIONS');
    if (req.method === 'OPTIONS') { res.writeHead(204).end(); return; }

    const url = new URL(req.url ?? '/', 'http://x');

    // Eventos en vivo: muestras, alertas y rechazos.
    if (req.method === 'GET' && url.pathname === '/api/stream') {
      res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive' });
      res.write(': conectado\n\n');
      const enviar = (tipo: string) => (d: unknown) => res.write(`event: ${tipo}\ndata: ${JSON.stringify(d)}\n\n`);
      const m = enviar('muestra'), a = enviar('alerta'), r = enviar('rechazo');
      bus.on('muestra', m); bus.on('alerta', a); bus.on('rechazo', r);
      const latido = setInterval(() => res.write(': latido\n\n'), 15000);
      req.on('close', () => { clearInterval(latido); bus.off('muestra', m); bus.off('alerta', a); bus.off('rechazo', r); });
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
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const db = abrir(process.env.BD ?? join(AQUI, '..', 'eva.db'));
  const { nuevos } = cargarInicial(db, join(AQUI, '..', 'semillas', 'inicial.json'));
  const añadidos = Object.entries(nuevos).filter(([, n]) => n > 0).map(([k, n]) => `${n} ${k}`);
  if (añadidos.length) console.log(`Semillas: añadidos ${añadidos.join(', ')}`);
  construir(db).listen(PUERTO, () => {
    console.log(`EVA · computadora central en http://localhost:${PUERTO}`);
    console.log(`  eventos en vivo:  http://localhost:${PUERTO}/api/stream`);
  });
}
