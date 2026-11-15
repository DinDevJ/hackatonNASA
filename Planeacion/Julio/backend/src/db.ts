/**
 * Base de datos de la computadora central. SQLite integrado en Node: un archivo,
 * cero dependencias. Las estructuras flexibles (campos de esquema, calidad,
 * priores) se guardan como JSON dentro de columnas.
 */
import { DatabaseSync } from 'node:sqlite';

export type BD = DatabaseSync;

const ESQUEMA_SQL = `
CREATE TABLE IF NOT EXISTS variables (
  id TEXT PRIMARY KEY,              -- con catálogo: '04:A4'
  nombre TEXT NOT NULL,
  descripcion TEXT,
  unidad TEXT NOT NULL,
  tipo_umbral TEXT,                 -- 'A' validado en astronautas · 'T' clínico terrestre
  procedencia TEXT NOT NULL,        -- sensor · derived · estimated · manual · telemetry
  actualizada TEXT NOT NULL
);

-- Editar un esquema crea OTRO id: las tramas viejas siguen decodificándose.
CREATE TABLE IF NOT EXISTS esquemas (
  id INTEGER PRIMARY KEY,
  nombre TEXT NOT NULL,
  version INTEGER NOT NULL,
  campos TEXT NOT NULL,             -- JSON: CampoEsquema[]
  creado TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS dispositivos (
  id INTEGER PRIMARY KEY,           -- id_disp de la trama binaria (u32)
  clave TEXT UNIQUE NOT NULL,       -- id legible: el que mandan los dispositivos intermedios (JSON)
  nombre TEXT NOT NULL,
  tipo TEXT NOT NULL,               -- suit · wrist · chest · habitat · dosimeter · phone
  perfil TEXT NOT NULL,             -- 'eva' (binario propio) · 'json' (vía dispositivo intermedio)
  esquema_id INTEGER REFERENCES esquemas(id),
  creado TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tripulantes (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  rol TEXT,
  sexo TEXT, edad REAL, peso_kg REAL, altura_m REAL, sangre TEXT
);

-- El dispositivo no sabe quién lo lleva: lo dice esta tabla, con intervalo de tiempo.
CREATE TABLE IF NOT EXISTS asignaciones (
  id INTEGER PRIMARY KEY,
  dispositivo INTEGER NOT NULL REFERENCES dispositivos(id),
  tripulante TEXT NOT NULL REFERENCES tripulantes(id),
  desde TEXT NOT NULL,
  hasta TEXT
);

CREATE TABLE IF NOT EXISTS basales (
  tripulante TEXT NOT NULL, variable TEXT NOT NULL, valor REAL NOT NULL,
  PRIMARY KEY (tripulante, variable)
);

-- Misiones anteriores importadas: "en Artemis su FC cambió −10 %".
CREATE TABLE IF NOT EXISTS historial (
  id INTEGER PRIMARY KEY,
  tripulante TEXT NOT NULL, mision TEXT NOT NULL, entorno TEXT NOT NULL,
  variable TEXT NOT NULL, delta REAL NOT NULL, escala TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS priores (
  variable TEXT NOT NULL, entorno TEXT NOT NULL, datos TEXT NOT NULL,   -- JSON: Prior
  PRIMARY KEY (variable, entorno)
);

-- Línea de tiempo de la misión: desde cuándo se está en cada entorno.
CREATE TABLE IF NOT EXISTS fases (
  desde TEXT PRIMARY KEY, entorno TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS muestras (
  id INTEGER PRIMARY KEY,
  tripulante TEXT NOT NULL,
  variable TEXT NOT NULL,
  valor REAL,
  unidad TEXT,
  procedencia TEXT NOT NULL,
  calidad TEXT,                     -- JSON
  metodo TEXT,
  t_scet TEXT NOT NULL,             -- cuándo OCURRIÓ
  t_recibida TEXT NOT NULL,         -- cuándo llegó a la central
  dispositivo INTEGER,
  seq INTEGER,
  esquema_id INTEGER,
  entorno TEXT,
  UNIQUE (tripulante, dispositivo, seq, variable, t_scet)   -- un reenvío no duplica
);
CREATE INDEX IF NOT EXISTS ix_muestras ON muestras (tripulante, variable, t_scet);

CREATE TABLE IF NOT EXISTS alertas (
  id INTEGER PRIMARY KEY,
  tripulante TEXT NOT NULL, variable TEXT NOT NULL,
  estado TEXT NOT NULL, z REAL, valor REAL, esperado REAL, banda TEXT,
  t_scet TEXT NOT NULL, creada TEXT NOT NULL,
  enviada_tierra INTEGER NOT NULL DEFAULT 0
);
`;

export function abrir(ruta = 'eva.db'): BD {
  const db = new DatabaseSync(ruta);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  db.exec(ESQUEMA_SQL);
  return db;
}

export const ahora = () => new Date().toISOString();
export const json = (v: unknown) => JSON.stringify(v);
export const deJson = <T>(s: unknown): T => JSON.parse(String(s)) as T;
