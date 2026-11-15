import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { abrir } from '../src/db.ts';
import { migrarSalud, parsearCsv, RUTA_MODELO_DEFECTO, sembrarSalud } from '../src/salud.ts';

const filasCsv = (f: string) => parsearCsv(readFileSync(join(RUTA_MODELO_DEFECTO, f), 'utf8'));
const cuenta = (db: ReturnType<typeof abrir>, t: string) =>
  (db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get() as { n: number }).n;

test('semilla: 20 padecimientos y 350 vínculos contra los CSV reales', () => {
  const db = abrir(':memory:');
  const r = sembrarSalud(db);
  assert.equal(r.error, undefined);
  assert.equal(r.padecimientos, 20);
  assert.equal(r.vinculos, 350);
  assert.equal(cuenta(db, 'padecimientos'), filasCsv('PADECIMIENTOS.csv').length - 1);
  assert.equal(cuenta(db, 'padecimiento_variable'), filasCsv('PADECIMIENTO-VARIABLE.csv').length - 1);
});

test('idempotente y no toca pesos_usuario ni evaluaciones', () => {
  const db = abrir(':memory:');
  sembrarSalud(db);
  db.prepare(`INSERT INTO pesos_usuario (clave, tipo, padecimiento_id, variable_id, peso, modificado)
    VALUES ('liga|P07|03:V82','liga','P07','03:V82',2,'2026-01-01T00:00:00')`).run();
  db.prepare(`INSERT INTO evaluaciones (tripulante, padecimiento_id, color, hora, canal, detalle)
    VALUES ('T1','P07','GRIS','2026-01-01T00:00:00Z','SIMULADO','{}')`).run();
  const r = sembrarSalud(db);
  assert.deepEqual([r.padecimientos, r.vinculos], [20, 350]);
  assert.equal(cuenta(db, 'pesos_usuario'), 1);
  assert.equal(cuenta(db, 'evaluaciones'), 1);
});

test('dir inexistente: ausente, sin lanzar', () => {
  const db = abrir(':memory:');
  const r = sembrarSalud(db, '/no/existe/modelo');
  assert.equal(r.ausente, true);
});

test('campo con coma entre comillas se lee entero', () => {
  const filas = filasCsv('PADECIMIENTO-VARIABLE.csv');
  const cab = filas[0];
  const iF = cab.indexOf('fuente');
  const conComa = filas.slice(1).find((f) => f[iF].includes(','));
  assert.ok(conComa, 'el CSV real debe tener un campo fuente con coma');
  const db = abrir(':memory:');
  sembrarSalud(db);
  const fila = db.prepare(`SELECT fuente FROM padecimiento_variable WHERE padecimiento_id=? AND variable_id=?`)
    .get(conComa[0], conComa[cab.indexOf('variable_id')]) as { fuente: string };
  assert.equal(fila.fuente, conComa[iF]);
});

test('parser: comillas escapadas, saltos dentro de comillas, BOM y CRLF', () => {
  assert.deepEqual(parsearCsv('﻿a,b\r\n"x, ""y""","l1\nl2"\r\n,\r\n'), [['a', 'b'], ['x, "y"', 'l1\nl2'], ['', '']]);
});

test('migrarSalud es repetible', () => {
  const db = abrir(':memory:');
  migrarSalud(db);
  migrarSalud(db);
  assert.equal(cuenta(db, 'padecimientos'), 0);
});
