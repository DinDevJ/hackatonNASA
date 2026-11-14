/**
 * Variables Tipo B: necesitan procesamiento (modelo, fórmula, equipo de la nave o API).
 * Referencias `02[n]` = lista de fuentes del catálogo 02 (verificadas en out/fuentes-verificadas.json).
 */
import { crearLectura, type Campos, type Meta } from "../lectura.js";

export const VAR_B = {
  V43: {
    id: "02:V43",
    nombre: "Fuerza máxima estimada (1RM) en peso muerto",
    unidad: "× peso corporal",
    validacion_umbral: "NASA_A",
    nota_umbral: "[A] Peso muerto: mínimo 1,0×; EVA microgravedad 1,3×; EVA superficie 1,6× — NASA-STD-3001 Tabla 4.6-1, 02[3]",
  },
  V44: {
    id: "02:V44",
    nombre: "Carga, repeticiones y volumen en ARED",
    unidad: "kg | rep | kg·rep",
    validacion_umbral: "SIN_UMBRAL",
    nota_umbral: "Sin umbral de alerta encontrado — 02[1][2]",
  },
  V47: {
    id: "02:V47",
    nombre: "Área de sección transversal muscular por ultrasonido (recto femoral)",
    unidad: "cm²",
    validacion_umbral: "SIN_UMBRAL",
    nota_umbral: "Sin umbral; validez frente a RM CCC 0,78 — 02[38]",
  },
  V51: {
    id: "02:V51",
    nombre: "VO₂máx estimado",
    unidad: "mL/kg/min",
    validacion_umbral: "NASA_A",
    nota_umbral: "[A] ≥32,9 (EVA microgravedad); ≥36,5 (EVA superficie); ≥80 % del valor previo — 02[3]",
  },
  V54: {
    id: "02:V54",
    nombre: "Carga y duración en cicloergómetro CEVIS",
    unidad: "W | min",
    validacion_umbral: "SIN_UMBRAL",
    nota_umbral: "Sin umbral; prescripción 70–100 % del VO₂pico — 02[2]",
  },
  V55: {
    id: "02:V55",
    nombre: "Velocidad, carga del arnés y duración en cinta T2",
    unidad: "mph | kg | % peso corporal | min",
    validacion_umbral: "SIN_UMBRAL",
    nota_umbral: "Sin umbral; prescripción 70–100 % de FCmáx — 02[2]",
  },
  V73: {
    id: "02:V73",
    nombre: "Control motor fino (tiempo de tarea de destreza)",
    unidad: "s",
    validacion_umbral: "SIN_UMBRAL",
    nota_umbral: "Sin umbral; +10 % de tiempo tras ISS — 02[21]",
  },
  V75: {
    id: "02:V75",
    nombre: "Masa corporal (SLAMMD)",
    unidad: "kg",
    validacion_umbral: "NASA_A",
    nota_umbral: "[A] Pérdida < 3,3 % de la basal — 02[5]",
  },
  V79: {
    id: "02:V79",
    nombre: "Ingesta de hierro",
    unidad: "mg/d",
    validacion_umbral: "NASA_A",
    nota_umbral: "[A] 8 mg/d (18 mg/d mujeres < 50 años sin supresión menstrual); máximo tolerable 45 mg/d — 02[5]",
  },
  V81: {
    id: "02:V81",
    nombre: "Ingesta energética",
    unidad: "kcal/d",
    validacion_umbral: "NASA_A",
    nota_umbral: "[A] 100 % del requerimiento calculado (ecuación EER) — 02[3][12]",
  },
  V82: {
    id: "02:V82",
    nombre: "Ingesta de proteína",
    unidad: "g/kg/d",
    validacion_umbral: "NASA_A",
    nota_umbral: "[A] 1,2–1,8 g/kg/d — 02[5]",
  },
  V83: {
    id: "02:V83",
    nombre: "Ingesta de sodio",
    unidad: "mg/d",
    validacion_umbral: "NASA_A",
    nota_umbral: "[A] 1500–2300 mg/d; recomendación ISS < 3500 mg/d — 02[5]",
  },
  V84: {
    id: "02:V84",
    nombre: "Ingesta de calcio",
    unidad: "mg/d",
    validacion_umbral: "NASA_A",
    nota_umbral: "[A] 1000–1200 mg/d — 02[5]",
  },
  V93: {
    id: "02:V93",
    nombre: "Carbohidratos como % de la energía",
    unidad: "% de la energía",
    validacion_umbral: "NASA_A",
    nota_umbral: "[A] 45–65 % de la energía; azúcares añadidos < 10 % — 02[5]",
  },
} as const satisfies Record<string, Meta>;

export type ClaveB = keyof typeof VAR_B;
export const lecturaB = (clave: ClaveB, campos: Campos) => crearLectura(VAR_B[clave], 2, campos);
