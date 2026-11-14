/**
 * Prueba del adaptador con el paquete REAL capturado del WATCH 5 por Julio (06 4b) y una sesión sintética.
 * Uso: npm run test:reloj
 */
import assert from "node:assert/strict";
import { ReadingSchema } from "../contrato.js";
import { etapaSubmaxima, filtrar, intensidadSesion, type MuestraFC } from "./huawei-watch5.js";

/** Decodificación mínima del paquete 0x2A37 (misma lógica de bits que parseHeartRateMeasurement de Julio). */
function decodificar(bytes: number[], t: Date): MuestraFC {
  const flags = bytes[0]!;
  const bpm = flags & 0x01 ? bytes[1]! | (bytes[2]! << 8) : bytes[1]!;
  return { bpm, sensorContact: flags & 0x04 ? (flags & 0x02) !== 0 : null, receivedAt: t };
}

// 1. Paquete real del WATCH 5: 06 4b → 75 lpm, contacto detectado.
const real = decodificar([0x06, 0x4b], new Date("2026-11-14T10:00:00Z"));
assert.equal(real.bpm, 75);
assert.equal(real.sensorContact, true);

// 2. Correa floja (flags 0x04: contacto soportado pero NO detectado) y artefacto de 227 lpm se descartan.
const t0 = Date.parse("2026-11-14T10:00:00Z");
const sesion: MuestraFC[] = Array.from({ length: 300 }, (_, i) => decodificar([0x06, 120 + (i % 40)], new Date(t0 + i * 1000)));
sesion.push(decodificar([0x04, 130], new Date(t0 + 301_000))); // correa floja
sesion.push({ bpm: 227, sensorContact: true, receivedAt: new Date(t0 + 302_000) }); // artefacto
const f = filtrar(sesion);
assert.equal(f.sinContacto, 1);
assert.equal(f.artefactos, 1);
assert.equal(f.validas.length, 300);

// 3. Las lecturas cumplen el contrato.
const v53 = intensidadSesion(sesion, 30, "prueba");
assert.equal(v53.length, 4);
for (const l of v53) ReadingSchema.parse(l);
assert.equal(v53.find((l) => l.nombre.endsWith("FC pico"))!.valor, 159);

const v52 = etapaSubmaxima(sesion.slice(0, 300), "etapa 50 % VO2pico");
assert.ok(v52);
ReadingSchema.parse(v52);

console.log("✓ adaptador HUAWEI WATCH 5: paquete real 06 4b → 75 lpm; filtros y contrato OK");
