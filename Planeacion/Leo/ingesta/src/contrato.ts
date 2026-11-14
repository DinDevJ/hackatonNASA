/**
 * Contrato de salida común del Equipo Monarcas.
 * Cada lectura de variable que produzcan los scripts debe cumplir AstronautVariableReading.
 */
import { z } from "zod";

export interface AstronautVariableReading {
  id: string; // Ej. "03:V30" o "02:V92"
  nombre: string;
  fase: 1 | 2 | 3;
  valor: number | string | boolean | null;
  unidad: string;
  timestamp: string; // ISO-8601
  naturaleza_dato: "directa" | "calculada" | "inferida" | "input_manual";
  origen_dato: "real_dataset" | "api_oficial" | "simulado_controlado";
  fuente_referencia: string; // URL o identificador de dataset/API
  validacion_umbral: "NASA_A" | "CLINICO_T" | "SIN_UMBRAL";
  observaciones?: string;
}

export const ReadingSchema = z
  .object({
    id: z.string().regex(/^0[1-4]:V\d+[ab]?$|^R\d{2}$/),
    nombre: z.string().min(1),
    fase: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    valor: z.union([z.number().finite(), z.string(), z.boolean(), z.null()]),
    unidad: z.string(),
    timestamp: z.string().datetime({ offset: true }),
    naturaleza_dato: z.enum(["directa", "calculada", "inferida", "input_manual"]),
    origen_dato: z.enum(["real_dataset", "api_oficial", "simulado_controlado"]),
    fuente_referencia: z.string().min(1),
    validacion_umbral: z.enum(["NASA_A", "CLINICO_T", "SIN_UMBRAL"]),
    observaciones: z.string().optional(),
  })
  .strict();

/**
 * Envoltorio del archivo de salida. El contrato no incluye sujeto, así que las
 * lecturas se agrupan por sujeto aquí en lugar de modificar la interfaz común.
 */
export interface SalidaTipo {
  generado: string; // ISO-8601
  tipo: "A" | "B" | "C";
  sujetos: { sujeto: string; lecturas: AstronautVariableReading[] }[];
}
