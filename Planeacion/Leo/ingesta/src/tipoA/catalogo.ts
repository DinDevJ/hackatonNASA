/**
 * Metadatos de las 12 variables Tipo A (reloj / camiseta / parche CGM).
 * validacion_umbral sigue la regla D6: NASA_A si hay cualquier umbral NASA o de astronautas;
 * si no, CLINICO_T si hay umbral clínico terrestre; si no, SIN_UMBRAL.
 */
import type { AstronautVariableReading } from "../contrato.js";

type Meta = Pick<AstronautVariableReading, "id" | "nombre" | "unidad" | "validacion_umbral"> & {
  nota_umbral: string;
};

const CAT02 = "Planeacion/variables-diagnostico/02-hueso-musculo-rinon-nutricion.md";
const CAT03 = "Planeacion/variables-diagnostico/03-conducta-sueno-cognicion.md";
export const REF = { CAT02, CAT03 };

export const VAR = {
  V52: {
    id: "02:V52",
    nombre: "FC en ejercicio submáximo estandarizado",
    unidad: "lpm",
    validacion_umbral: "NASA_A",
    nota_umbral: "[A] Sin umbral absoluto; se compara con la basal (≥80 % de capacidad aeróbica previa) — cat. 02 [3][8]",
  },
  V53: {
    id: "02:V53",
    nombre: "Intensidad de sesión aeróbica",
    unidad: "lpm | %",
    validacion_umbral: "NASA_A",
    nota_umbral: "[A] ≥3 sesiones/semana, >70 % FCmáx, >20 min — cat. 02 [2]",
  },
  V56: {
    id: "02:V56",
    nombre: "Tiempo total de ejercicio",
    unidad: "min/día | min/semana",
    validacion_umbral: "NASA_A",
    nota_umbral: "[A] ISS: 1,5 h/día, 6–7 días/semana; ≈600 min/semana — cat. 02 [15][22]",
  },
  V92: {
    id: "02:V92",
    nombre: "Glucosa intersticial continua (CGM)",
    unidad: "mg/dL | %",
    validacion_umbral: "CLINICO_T",
    nota_umbral: "[T] Umbrales ADA por extensión; objetivos de tiempo en rango no encontrados — cat. 02 [49]",
  },
  V30: {
    id: "03:V30",
    nombre: "Tiempo total de sueño (actigrafía)",
    unidad: "h",
    validacion_umbral: "NASA_A",
    nota_umbral: "[A] <6 h asociado a peor desempeño; [T] 7–9 h — cat. 03 [2][11]",
  },
  V31: {
    id: "03:V31",
    nombre: "Porcentaje de noches con <6 h de sueño",
    unidad: "%",
    validacion_umbral: "SIN_UMBRAL",
    nota_umbral: "Sin corte formal — cat. 03",
  },
  V33: {
    id: "03:V33",
    nombre: "Tiempo en cama",
    unidad: "h",
    validacion_umbral: "SIN_UMBRAL",
    nota_umbral: "Referencia: oportunidad planificada 8,5 h — cat. 03 [10]",
  },
  V34: {
    id: "03:V34",
    nombre: "Eficiencia del sueño",
    unidad: "%",
    validacion_umbral: "CLINICO_T",
    nota_umbral: "[T] Indicador aceptado por la NSF; corte ≥85 % no verificado — cat. 03 [64]",
  },
  V35: {
    id: "03:V35",
    nombre: "Latencia de sueño",
    unidad: "min",
    validacion_umbral: "CLINICO_T",
    nota_umbral: "[T] Indicador aceptado; corte ≤15–30 min no verificado — cat. 03 [64]",
  },
  V36: {
    id: "03:V36",
    nombre: "Vigilia tras inicio del sueño (WASO)",
    unidad: "min",
    validacion_umbral: "CLINICO_T",
    nota_umbral: "[T] Indicador aceptado; corte ≤20 min no verificado — cat. 03 [64]",
  },
  V43: {
    id: "03:V43",
    nombre: "Deuda de sueño",
    unidad: "h/noche",
    validacion_umbral: "SIN_UMBRAL",
    nota_umbral: "Referencia: déficit medio ≈0,3 h/día en vuelo — cat. 03 [2]",
  },
  V49: {
    id: "03:V49",
    nombre: "Luz ambiental (iluminancia)",
    unidad: "lux",
    validacion_umbral: "NASA_A",
    nota_umbral: "[A] Guía NASA: ≈20 lux nocturno, 100–300 lux actividad, >1000 lux alta precisión — cat. 03 [9]",
  },
} as const satisfies Record<string, Meta>;

export type ClaveVar = keyof typeof VAR;

/** Construye una lectura Tipo A con los metadatos de la variable. */
export function lectura(
  clave: ClaveVar,
  campos: Omit<AstronautVariableReading, "id" | "nombre" | "unidad" | "validacion_umbral" | "fase"> & {
    nombre_detalle?: string;
    unidad?: string;
  },
): AstronautVariableReading {
  const m = VAR[clave];
  const { nombre_detalle, unidad, observaciones, ...resto } = campos;
  const obs = [observaciones, `Umbral: ${m.nota_umbral}`].filter(Boolean).join(" · ");
  return {
    id: m.id,
    nombre: nombre_detalle ? `${m.nombre} — ${nombre_detalle}` : m.nombre,
    fase: 1,
    unidad: unidad ?? m.unidad,
    validacion_umbral: m.validacion_umbral,
    ...resto,
    observaciones: obs,
  };
}
