/**
 * Adaptador HUAWEI WATCH 5 → contrato del equipo, para mis variables que el reloj da EN VIVO.
 *
 * Qué entrega el reloj por Bluetooth (probado por Julio el 14-11-2026, ver
 * Planeacion/Julio/hardware-y-radio.md y Planeacion/Julio/codigo/heart-rate.ts):
 *   - Perfil estándar de FC: servicio 0x180D, característica 0x2A37, ~1 muestra/s.
 *   - Paquete de 2 bytes (p. ej. 06 4b → 75 lpm): FC de 8 bits + contacto del sensor.
 *   - SIN intervalos RR (bit 4 = 0) → no hay HRV en vivo.
 *   - Solo con "Difusión de datos de FC" activa, y el WATCH 5 solo la permite en modo ahorro de batería.
 *
 * Este módulo NO conecta el Bluetooth (eso lo hace HeartRateMonitor de Julio en el navegador): recibe
 * sus muestras y las convierte en lecturas. Acepta cualquier objeto con la forma de HeartRateSample.
 */
import type { AstronautVariableReading } from "../contrato.js";
import { redondear } from "../util.js";
import { lectura } from "../tipoA/catalogo.js";

/** Subconjunto de HeartRateSample (Planeacion/Julio/codigo/heart-rate.ts) que usamos. */
export interface MuestraFC {
  bpm: number;
  sensorContact: boolean | null;
  receivedAt: Date;
}

export const FUENTE_WATCH5 = "HUAWEI WATCH 5 — Bluetooth LE, perfil de FC 0x180D/0x2A37 (Web Bluetooth, módulo heart-rate.ts de Julio)";
const FC_MAX_PLAUSIBLE = 220; // decisión de Leo: > 220 lpm es artefacto

/** Descarta correa floja (contacto = false, regla de Julio) y artefactos (> 220 lpm, regla de Leo). */
export function filtrar(muestras: MuestraFC[]): { validas: MuestraFC[]; sinContacto: number; artefactos: number } {
  let sinContacto = 0;
  let artefactos = 0;
  const validas = muestras.filter((m) => {
    if (m.sensorContact === false) return sinContacto++, false;
    if (m.bpm <= 0 || m.bpm > FC_MAX_PLAUSIBLE) return artefactos++, false;
    return true;
  });
  return { validas, sinContacto, artefactos };
}

/** 02:V53 — intensidad de una sesión de ejercicio registrada en vivo con el reloj. */
export function intensidadSesion(muestras: MuestraFC[], edad: number, etiqueta: string): AstronautVariableReading[] {
  const { validas, sinContacto, artefactos } = filtrar(muestras);
  if (validas.length < 60) return []; // menos de 1 min de FC válida: no hay sesión medible
  const hr = validas.map((m) => m.bpm);
  const fcMax = 208 - 0.7 * edad; // Tanaka (decisión D5-1)
  const pct = (umbral: number) => (hr.filter((v) => v > umbral * fcMax).length / hr.length) * 100;
  const comun = {
    timestamp: validas[0]!.receivedAt.toISOString(),
    origen_dato: "real_dataset",
    fuente_referencia: FUENTE_WATCH5,
    observaciones: `Sesión "${etiqueta}": ${validas.length} muestras válidas; ${sinContacto} descartadas por correa floja y ${artefactos} por > ${FC_MAX_PLAUSIBLE} lpm. FCmáx Tanaka ${redondear(fcMax, 1)} lpm (edad ${edad}).`,
  } as const;
  return [
    lectura("V53", { ...comun, nombre_detalle: "FC media", unidad: "lpm", valor: redondear(hr.reduce((a, b) => a + b, 0) / hr.length, 1), naturaleza_dato: "calculada" }),
    lectura("V53", { ...comun, nombre_detalle: "FC pico", unidad: "lpm", valor: Math.max(...hr), naturaleza_dato: "directa" }),
    lectura("V53", { ...comun, nombre_detalle: "% del tiempo >70 % FCmáx", unidad: "%", valor: redondear(pct(0.7), 1), naturaleza_dato: "calculada" }),
    lectura("V53", { ...comun, nombre_detalle: "% del tiempo >90 % FCmáx", unidad: "%", valor: redondear(pct(0.9), 1), naturaleza_dato: "calculada" }),
  ];
}

/** 02:V52 — FC media de una etapa del protocolo submáximo (las etapas las marca el CEVIS / la app). */
export function etapaSubmaxima(muestras: MuestraFC[], etapa: string): AstronautVariableReading | null {
  const { validas, sinContacto, artefactos } = filtrar(muestras);
  if (validas.length < 30) return null;
  // Se promedia la segunda mitad de la etapa: la FC tarda en estabilizarse al cambiar la carga.
  const mitad = validas.slice(Math.floor(validas.length / 2));
  return lectura("V52", {
    nombre_detalle: etapa,
    valor: Math.round(mitad.reduce((a, m) => a + m.bpm, 0) / mitad.length),
    timestamp: validas[0]!.receivedAt.toISOString(),
    naturaleza_dato: "directa",
    origen_dato: "real_dataset",
    fuente_referencia: FUENTE_WATCH5,
    observaciones: `Media de la 2.ª mitad de la etapa (${mitad.length} muestras); ${sinContacto} descartadas por correa floja y ${artefactos} por artefacto.`,
  });
}
