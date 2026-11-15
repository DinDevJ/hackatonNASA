/**
 * Certificado autofirmado SOLO para desarrollo (Tierra en https://localhost).
 *   npm run certs            → crea certs/tierra.crt y certs/tierra.key (si no existen)
 *   npm run certs -- --forzar → los regenera
 * La llave queda en certs/ (ignorada por git, permisos 0600). Nunca se imprime su contenido.
 */
import { execFileSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export function generarCert(dir: string): { cert: string; key: string } {
  mkdirSync(dir, { recursive: true });
  const cert = join(dir, 'tierra.crt');
  const key = join(dir, 'tierra.key');
  try {
    execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '365', '-subj', '/CN=localhost',
      '-addext', 'subjectAltName=DNS:localhost,IP:127.0.0.1', '-keyout', key, '-out', cert], { stdio: 'ignore' });
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') throw new Error('no se encontró `openssl` en el PATH: instálalo para generar el certificado de desarrollo');
    throw new Error(`openssl falló al generar el certificado: ${(e as Error).message}`);
  }
  chmodSync(key, 0o600);
  return { cert, key };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'certs');
  const cert = join(dir, 'tierra.crt');
  const key = join(dir, 'tierra.key');
  try {
    if (existsSync(cert) && existsSync(key) && !process.argv.includes('--forzar')) {
      console.log(`Ya existen (no se sobrescriben; usa --forzar):\n  cert: ${cert}\n  llave: ${key}`);
    } else {
      generarCert(dir);
      console.log(`Certificado de desarrollo creado (autofirmado, 365 días):\n  cert: ${cert}\n  llave: ${key}`);
    }
  } catch (e) { console.error('✗ ' + (e as Error).message); process.exit(1); }
}
