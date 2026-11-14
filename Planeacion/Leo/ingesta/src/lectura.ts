/** Constructor genérico de lecturas para cualquier tipo (fase 1, 2 o 3). */
import type { AstronautVariableReading } from "./contrato.js";

export type Meta = Pick<AstronautVariableReading, "id" | "nombre" | "unidad" | "validacion_umbral"> & {
  nota_umbral: string;
};

export type Campos = Omit<AstronautVariableReading, "id" | "nombre" | "unidad" | "validacion_umbral" | "fase"> & {
  nombre_detalle?: string;
  unidad?: string;
};

export function crearLectura(m: Meta, fase: 1 | 2 | 3, campos: Campos): AstronautVariableReading {
  const { nombre_detalle, unidad, observaciones, ...resto } = campos;
  return {
    id: m.id,
    nombre: nombre_detalle ? `${m.nombre} — ${nombre_detalle}` : m.nombre,
    fase,
    unidad: unidad ?? m.unidad,
    validacion_umbral: m.validacion_umbral,
    ...resto,
    observaciones: [observaciones, `Umbral: ${m.nota_umbral}`].filter(Boolean).join(" · "),
  };
}
