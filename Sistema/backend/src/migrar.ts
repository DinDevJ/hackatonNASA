/**
 * Migra la base: crea las tablas de salud (si faltan) y las refresca desde los CSV del prototipo.
 * Uso: npm run migrar   (BD=ruta para otra base; MODELO_SALUD=carpeta para otros CSV)
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { abrir } from './db.ts';
import { migrarSalud, sembrarSalud } from './salud.ts';

const AQUI = dirname(fileURLToPath(import.meta.url));
const ruta = process.env.BD ?? join(AQUI, '..', 'eva.db');

const db = abrir(ruta);
migrarSalud(db);
const r = sembrarSalud(db);
db.close();
if (r.ausente) {
  console.error(`Salud: no se encontraron los CSV en ${r.dir}`);
  process.exit(1);
}
if (r.error) {
  console.error(`Salud: error al cargar (${r.error}); la base quedó sin cambios`);
  process.exit(1);
}
console.log(`Salud: ${r.padecimientos} padecimientos, ${r.vinculos} vínculos (${r.dir})`);
console.log(`Base: ${ruta}`);
