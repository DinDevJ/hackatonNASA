/**
 * Corre el motor de padecimientos (prototipo-salud) sobre la BD y escribe `evaluaciones`.
 *
 *   npm run evaluar -- [--simulado] [--db ruta]
 */
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { correrMotor } from './semaforo.ts';

const AQUI = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const i = args.indexOf('--db');
const ruta = resolve(i >= 0 && args[i + 1] ? args[i + 1]! : process.env.BD ?? join(AQUI, '..', 'eva.db'));
try {
  const r = await correrMotor(ruta, args.includes('--simulado'));
  console.log(r.salida);
  for (const a of r.avisos) console.error(a);
} catch (e) {
  console.error((e as Error).message);
  process.exit(1);
}
