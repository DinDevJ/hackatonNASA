/**
 * Tipo C — variables sin sensor ni modelo: se capturan a mano (astronauta, médico de a bordo o laboratorio).
 * Cada definición sirve para (1) generar el formulario en la app y (2) validar la entrada con Zod antes
 * de convertirla al contrato AstronautVariableReading.
 *
 * Cuestionarios con licencia (PSQI, ISI, MSSQ): solo se guarda la puntuación total; no se reproducen los ítems.
 * Umbrales y fuentes: catálogos 02 y 03 (referencias verificadas en out/fuentes-verificadas.json).
 */
import { z } from "zod";
import type { AstronautVariableReading } from "../contrato.js";
import type { Meta } from "../lectura.js";
import { crearLectura } from "../lectura.js";

export type Medicion = "NAVE-REPORTE" | "NAVE-CMO" | "MUESTRA→TIERRA" | "TIERRA" | "NAVE-AUTO";
export type Quien = "astronauta" | "médico de a bordo (CMO)" | "laboratorio en Tierra" | "clínica en Tierra" | "sistema de la nave";
export type Momento = "diario" | "al despertar" | "antes de dormir" | "tras sesión con traje" | "cuando ocurra" | "semanal" | "mensual" | "prevuelo" | "posvuelo" | "prevuelo y posvuelo" | "según protocolo";

type Entrada =
  | { tipo: "numero"; min: number; max: number; decimales?: number }
  | { tipo: "escala"; min: number; max: number; etiquetas?: [string, string] }
  | { tipo: "si_no" }
  | { tipo: "opcion"; opciones: string[] }
  | { tipo: "multiple"; opciones: string[] }
  | { tipo: "texto"; max: number };

export interface Formulario extends Meta {
  pregunta: string;
  entrada: Entrada;
  medicion: Medicion;
  quien: Quien;
  momento: Momento;
  fuente: string;
  nota?: string;
}

const C02 = "Catálogo 02";
const C03 = "Catálogo 03";
const ZONAS = ["mano", "hombro", "pie", "brazo", "pierna", "cuello", "tronco"];

export const FORMULARIOS: Formulario[] = [
  // ---- Músculo y fuerza (pruebas de Tierra) ----
  { id: "02:V40", nombre: "Fuerza isocinética de rodilla (60°/s)", unidad: "N·m", validacion_umbral: "NASA_A", nota_umbral: "[A] ≥80 % de la basal — 02[3]", pregunta: "Pico de torque de extensión de rodilla a 60°/s", entrada: { tipo: "numero", min: 20, max: 500, decimales: 1 }, medicion: "TIERRA", quien: "clínica en Tierra", momento: "prevuelo y posvuelo", fuente: `${C02} 02[2][3][7]` },
  { id: "02:V41", nombre: "Resistencia isocinética (20 rep a 180°/s)", unidad: "J", validacion_umbral: "NASA_A", nota_umbral: "[A] ≥80 % de la basal (criterio general) — 02[3]", pregunta: "Trabajo total en 20 repeticiones a 180°/s", entrada: { tipo: "numero", min: 100, max: 6000 }, medicion: "TIERRA", quien: "clínica en Tierra", momento: "prevuelo y posvuelo", fuente: `${C02} 02[7]` },
  { id: "02:V42", nombre: "Fuerza de flexores plantares (pantorrilla)", unidad: "N·m", validacion_umbral: "SIN_UMBRAL", nota_umbral: "Sin umbral específico — 02[7][34]", pregunta: "Pico de torque de flexión plantar", entrada: { tipo: "numero", min: 10, max: 400, decimales: 1 }, medicion: "TIERRA", quien: "clínica en Tierra", momento: "prevuelo y posvuelo", fuente: `${C02} 02[7][34]` },
  { id: "02:V45", nombre: "Fuerza de agarre", unidad: "kg", validacion_umbral: "SIN_UMBRAL", nota_umbral: "No encontrado — 02[7]", pregunta: "Fuerza de agarre máxima (mano dominante)", entrada: { tipo: "numero", min: 5, max: 100, decimales: 1 }, medicion: "TIERRA", quien: "clínica en Tierra", momento: "prevuelo y posvuelo", fuente: `${C02} 02[7]`, nota: "El dinamómetro en vuelo de ESA no tiene fuente primaria abierta." },
  { id: "02:V46", nombre: "Volumen muscular por RM (pantorrilla)", unidad: "cm³", validacion_umbral: "SIN_UMBRAL", nota_umbral: "No encontrado — 02[7][34]", pregunta: "Volumen del tríceps sural por resonancia", entrada: { tipo: "numero", min: 100, max: 3000 }, medicion: "TIERRA", quien: "clínica en Tierra", momento: "prevuelo y posvuelo", fuente: `${C02} 02[7][34]` },
  { id: "02:V48", nombre: "Perímetro de pantorrilla", unidad: "cm", validacion_umbral: "SIN_UMBRAL", nota_umbral: "No encontrado — 02[7]", pregunta: "Perímetro máximo de pantorrilla con cinta métrica", entrada: { tipo: "numero", min: 20, max: 60, decimales: 1 }, medicion: "NAVE-REPORTE", quien: "astronauta", momento: "semanal", fuente: `${C02} 02[7]`, nota: "Método de Skylab (segmentos de 3 cm); aquí se simplifica a un perímetro." },
  { id: "02:V49", nombre: "Tono muscular (MyotonPRO)", unidad: "Hz", validacion_umbral: "SIN_UMBRAL", nota_umbral: "No encontrado — 02[28]", pregunta: "Frecuencia de oscilación (tono) del gastrocnemio", entrada: { tipo: "numero", min: 5, max: 40, decimales: 1 }, medicion: "NAVE-AUTO", quien: "astronauta", momento: "según protocolo", fuente: `${C02} 02[28]`, nota: "Equipo de experimento ESA, no operativo." },
  { id: "02:V50", nombre: "Masa magra (DXA de cuerpo entero)", unidad: "kg", validacion_umbral: "SIN_UMBRAL", nota_umbral: "Cambio mínimo detectable 2,5 % — 02[22]", pregunta: "Masa magra total por DXA", entrada: { tipo: "numero", min: 20, max: 100, decimales: 1 }, medicion: "TIERRA", quien: "clínica en Tierra", momento: "prevuelo y posvuelo", fuente: `${C02} 02[22][32]` },
  { id: "02:V57", nombre: "Autoevaluación de forma física", unidad: "0–10", validacion_umbral: "SIN_UMBRAL", nota_umbral: "No encontrado — 02[15]", pregunta: "¿Cómo calificas tu forma física hoy?", entrada: { tipo: "escala", min: 0, max: 10, etiquetas: ["muy mala", "excelente"] }, medicion: "NAVE-REPORTE", quien: "astronauta", momento: "semanal", fuente: `${C02} 02[15]` },
  // ---- Columna ----
  { id: "02:V58", nombre: "Dolor de espalda (intensidad)", unidad: "NRS 0–10", validacion_umbral: "NASA_A", nota_umbral: "[A] Moderado/severo que no cede = riesgo funcional; corte NRS no encontrado — 02[30]", pregunta: "¿Cuánto te duele la espalda ahora? (0 = nada)", entrada: { tipo: "escala", min: 0, max: 10, etiquetas: ["sin dolor", "peor dolor imaginable"] }, medicion: "NAVE-REPORTE", quien: "astronauta", momento: "diario", fuente: `${C02} 02[20][30]` },
  { id: "02:V59", nombre: "Localización del dolor de espalda", unidad: "región", validacion_umbral: "SIN_UMBRAL", nota_umbral: "No encontrado — 02[30]", pregunta: "¿Dónde te duele?", entrada: { tipo: "multiple", opciones: ["cervical", "dorsal", "lumbar", "sacra"] }, medicion: "NAVE-REPORTE", quien: "astronauta", momento: "cuando ocurra", fuente: `${C02} 02[30]` },
  { id: "02:V60", nombre: "Alivio con el tratamiento", unidad: "%", validacion_umbral: "SIN_UMBRAL", nota_umbral: "No encontrado — 02[20][30]", pregunta: "¿Cuánto se alivió el dolor con el tratamiento? (%)", entrada: { tipo: "numero", min: 0, max: 100 }, medicion: "NAVE-REPORTE", quien: "astronauta", momento: "cuando ocurra", fuente: `${C02} 02[20][30]` },
  { id: "02:V61", nombre: "Estatura", unidad: "cm", validacion_umbral: "SIN_UMBRAL", nota_umbral: "Elongación de hasta 1–3 % en vuelo — 02[14][20]", pregunta: "Estatura medida con cinta", entrada: { tipo: "numero", min: 140, max: 210, decimales: 1 }, medicion: "NAVE-REPORTE", quien: "astronauta", momento: "semanal", fuente: `${C02} 02[14][20][37]`, nota: "Equipo de medición en vuelo no encontrado en fuente abierta." },
  { id: "02:V62", nombre: "Talla sentado", unidad: "cm", validacion_umbral: "SIN_UMBRAL", nota_umbral: "+2–6 % en vuelo (preliminar) — 02[25]", pregunta: "Talla sentado medida con cinta", entrada: { tipo: "numero", min: 60, max: 110, decimales: 1 }, medicion: "NAVE-REPORTE", quien: "astronauta", momento: "semanal", fuente: `${C02} 02[25]` },
  { id: "02:V63", nombre: "Área magra funcional paraespinal (RM)", unidad: "% del área", validacion_umbral: "SIN_UMBRAL", nota_umbral: "No encontrado — 02[37]", pregunta: "Área magra funcional del multífido/erectores", entrada: { tipo: "numero", min: 30, max: 100, decimales: 1 }, medicion: "TIERRA", quien: "clínica en Tierra", momento: "prevuelo y posvuelo", fuente: `${C02} 02[37]` },
  { id: "02:V64", nombre: "Altura de disco intervertebral (ultrasonido)", unidad: "mm", validacion_umbral: "SIN_UMBRAL", nota_umbral: "No encontrado — 02[20]", pregunta: "Altura del disco L4–L5 medida en el ultrasonido", entrada: { tipo: "numero", min: 3, max: 20, decimales: 1 }, medicion: "NAVE-CMO", quien: "médico de a bordo (CMO)", momento: "según protocolo", fuente: `${C02} 02[20]`, nota: "Sin modelo preentrenado abierto: lo mide el CMO con calibrador del equipo." },
  { id: "02:V65", nombre: "Síntomas radiculares", unidad: "sí/no", validacion_umbral: "SIN_UMBRAL", nota_umbral: "Hernia 4,3× más frecuente tras vuelo — 02[31]", pregunta: "¿Dolor que baja al brazo o pierna, hormigueo o debilidad?", entrada: { tipo: "si_no" }, medicion: "NAVE-CMO", quien: "médico de a bordo (CMO)", momento: "cuando ocurra", fuente: `${C02} 02[20][31]` },
  { id: "02:V66", nombre: "Lordosis lumbar", unidad: "grados", validacion_umbral: "SIN_UMBRAL", nota_umbral: "No encontrado — 02[20]", pregunta: "Ángulo de lordosis lumbar", entrada: { tipo: "numero", min: 0, max: 90, decimales: 1 }, medicion: "TIERRA", quien: "clínica en Tierra", momento: "prevuelo y posvuelo", fuente: `${C02} 02[20]` },
  // ---- Sensoriomotor ----
  { id: "02:V67a", nombre: "Síntomas de mareo espacial", unidad: "lista", validacion_umbral: "SIN_UMBRAL", nota_umbral: "Escala y umbral operativo no encontrados — 02[9][39]", pregunta: "¿Qué síntomas tienes ahora?", entrada: { tipo: "multiple", opciones: ["náusea", "vómito", "palidez", "sudor frío", "malestar", "pérdida de apetito", "fatiga", "ninguno"] }, medicion: "NAVE-REPORTE", quien: "astronauta", momento: "diario", fuente: `${C02} 02[9][16][18][39]`, nota: "Afecta al 60–80 % en los primeros 2–3 días." },
  { id: "02:V67b", nombre: "Susceptibilidad previa al mareo (MSSQ-short)", unidad: "puntuación", validacion_umbral: "SIN_UMBRAL", nota_umbral: "El mareo en Tierra no predice el espacial — 02[16]", pregunta: "Puntuación total del MSSQ-short", entrada: { tipo: "numero", min: 0, max: 54, decimales: 1 }, medicion: "TIERRA", quien: "clínica en Tierra", momento: "prevuelo", fuente: `${C02} 02[40]`, nota: "⚠️ Licencia del cuestionario no verificada: solo se guarda el total." },
  { id: "02:V68a", nombre: "Medicación antimareo", unidad: "texto", validacion_umbral: "SIN_UMBRAL", nota_umbral: "No encontrado — 02[9]", pregunta: "Fármaco y dosis tomados", entrada: { tipo: "texto", max: 120 }, medicion: "NAVE-REPORTE", quien: "astronauta", momento: "cuando ocurra", fuente: `${C02} 02[9]` },
  { id: "02:V68b", nombre: "Síntomas tras el aterrizaje", unidad: "lista", validacion_umbral: "SIN_UMBRAL", nota_umbral: "Vértigo 32 %, náusea 14,7 % (n=241) — 02[9]", pregunta: "Síntomas tras aterrizar", entrada: { tipo: "multiple", opciones: ["vértigo", "náusea", "vómito", "inestabilidad", "ninguno"] }, medicion: "TIERRA", quien: "astronauta", momento: "posvuelo", fuente: `${C02} 02[9]` },
  { id: "02:V69", nombre: "Posturografía (puntuación de equilibrio cEQ)", unidad: "0–100", validacion_umbral: "NASA_A", nota_umbral: "[A] Comparar con basal y banda del 90 % de la tripulación — 02[9]", pregunta: "Puntuación de equilibrio continuo (cEQ)", entrada: { tipo: "numero", min: 0, max: 100, decimales: 1 }, medicion: "TIERRA", quien: "clínica en Tierra", momento: "prevuelo y posvuelo", fuente: `${C02} 02[9][21]` },
  { id: "02:V70", nombre: "Marcha en tándem (% pasos correctos)", unidad: "%", validacion_umbral: "SIN_UMBRAL", nota_umbral: "No encontrado — 02[21]", pregunta: "Porcentaje de pasos correctos en tándem", entrada: { tipo: "numero", min: 0, max: 100 }, medicion: "TIERRA", quien: "clínica en Tierra", momento: "posvuelo", fuente: `${C02} 02[21]`, nota: "🔶 Sin gravedad no hay equilibrio que medir: solo posvuelo o en superficie planetaria." },
  { id: "02:V71", nombre: "Romberg sensibilizado", unidad: "s", validacion_umbral: "SIN_UMBRAL", nota_umbral: "No encontrado — 02[9][21]", pregunta: "Segundos en tándem estático con ojos cerrados", entrada: { tipo: "numero", min: 0, max: 60, decimales: 1 }, medicion: "TIERRA", quien: "clínica en Tierra", momento: "posvuelo", fuente: `${C02} 02[9][21]` },
  { id: "02:V72", nombre: "Pruebas funcionales (salida del asiento y obstáculos)", unidad: "s", validacion_umbral: "SIN_UMBRAL", nota_umbral: "No encontrado — 02[9][21]", pregunta: "Tiempo en la prueba de salida del asiento y marcha con obstáculos", entrada: { tipo: "numero", min: 1, max: 300, decimales: 1 }, medicion: "TIERRA", quien: "clínica en Tierra", momento: "posvuelo", fuente: `${C02} 02[9][18][21]` },
  { id: "02:V74", nombre: "Ilusiones y desorientación espacial", unidad: "sí/no", validacion_umbral: "SIN_UMBRAL", nota_umbral: "No encontrado — 02[9]", pregunta: "¿Has sentido que giras, que estás al revés o desorientación?", entrada: { tipo: "si_no" }, medicion: "NAVE-REPORTE", quien: "astronauta", momento: "diario", fuente: `${C02} 02[9]` },
  // ---- Nutrición manual y laboratorio ----
  { id: "02:V76", nombre: "25-OH vitamina D sérica", unidad: "ng/mL", validacion_umbral: "NASA_A", nota_umbral: "[A] Óptimo 35–90; 20–34 mantenimiento; <20 suplementar — 02[1]", pregunta: "Resultado de 25-OH vitamina D", entrada: { tipo: "numero", min: 3, max: 200, decimales: 1 }, medicion: "MUESTRA→TIERRA", quien: "laboratorio en Tierra", momento: "según protocolo", fuente: `${C02} 02[1][5][32]` },
  { id: "02:V77", nombre: "Suplemento de vitamina D", unidad: "UI/d", validacion_umbral: "NASA_A", nota_umbral: "[A] 1000 UI/d — 02[1][5]", pregunta: "UI de vitamina D tomadas hoy", entrada: { tipo: "numero", min: 0, max: 10000 }, medicion: "NAVE-REPORTE", quien: "astronauta", momento: "diario", fuente: `${C02} 02[1][5]` },
  { id: "02:V78", nombre: "Ferritina sérica", unidad: "ng/mL", validacion_umbral: "CLINICO_T", nota_umbral: "[T] Hombres 30–400; mujeres 13–150 — 02[43]", pregunta: "Resultado de ferritina", entrada: { tipo: "numero", min: 1, max: 3000 }, medicion: "MUESTRA→TIERRA", quien: "laboratorio en Tierra", momento: "según protocolo", fuente: `${C02} 02[5][43][46b]` },
  { id: "02:V80", nombre: "Folato sérico", unidad: "ng/mL", validacion_umbral: "CLINICO_T", nota_umbral: "[T] 2,7–17,0 — 02[48]", pregunta: "Resultado de folato sérico", entrada: { tipo: "numero", min: 0.5, max: 50, decimales: 1 }, medicion: "MUESTRA→TIERRA", quien: "laboratorio en Tierra", momento: "según protocolo", fuente: `${C02} 02[5][48]` },
  { id: "02:V85", nombre: "Apetito", unidad: "0–10", validacion_umbral: "SIN_UMBRAL", nota_umbral: "No encontrado — 02[5]", pregunta: "¿Cuánto apetito tienes hoy?", entrada: { tipo: "escala", min: 0, max: 10, etiquetas: ["nada", "mucho"] }, medicion: "NAVE-REPORTE", quien: "astronauta", momento: "diario", fuente: `${C02} 02[5]` },
  // ---- Glucosa y metabolismo ----
  { id: "02:V86", nombre: "Glucosa en ayunas", unidad: "mg/dL", validacion_umbral: "CLINICO_T", nota_umbral: "[T] ADA: <100 normal; 100–125 prediabetes; ≥126 diabetes — 02[49]", pregunta: "Glucosa en ayunas (glucómetro o laboratorio)", entrada: { tipo: "numero", min: 20, max: 600 }, medicion: "NAVE-CMO", quien: "médico de a bordo (CMO)", momento: "según protocolo", fuente: `${C02} 02[5][49][50]`, nota: "⚠️ No se encontró en fuente abierta que la ISS lleve glucómetro." },
  { id: "02:V87", nombre: "Glucosa a 2 h de sobrecarga oral (OGTT)", unidad: "mg/dL", validacion_umbral: "CLINICO_T", nota_umbral: "[T] ADA: <140; 140–199; ≥200 — 02[49]", pregunta: "Glucosa a las 2 h de la OGTT", entrada: { tipo: "numero", min: 20, max: 600 }, medicion: "TIERRA", quien: "laboratorio en Tierra", momento: "prevuelo y posvuelo", fuente: `${C02} 02[5][49]` },
  { id: "02:V88", nombre: "Glucosa al azar con síntomas", unidad: "mg/dL", validacion_umbral: "CLINICO_T", nota_umbral: "[T] ADA: ≥200 con síntomas — 02[49]", pregunta: "Glucosa capilar en este momento", entrada: { tipo: "numero", min: 20, max: 600 }, medicion: "NAVE-CMO", quien: "médico de a bordo (CMO)", momento: "cuando ocurra", fuente: `${C02} 02[49]`, nota: "⚠️ Igual que V86: glucómetro a bordo no confirmado." },
  { id: "02:V89", nombre: "HbA1c", unidad: "%", validacion_umbral: "CLINICO_T", nota_umbral: "[T] ADA: <5,7; 5,7–6,4; ≥6,5 — 02[49]", pregunta: "Hemoglobina glucosilada", entrada: { tipo: "numero", min: 3, max: 15, decimales: 1 }, medicion: "TIERRA", quien: "laboratorio en Tierra", momento: "prevuelo y posvuelo", fuente: `${C02} 02[49]` },
  { id: "02:V90", nombre: "Insulina en ayunas", unidad: "µU/mL", validacion_umbral: "SIN_UMBRAL", nota_umbral: "No encontrado; la resistencia a la insulina sube en vuelo (n=8) — 02[51]", pregunta: "Insulina en ayunas", entrada: { tipo: "numero", min: 0.5, max: 300, decimales: 1 }, medicion: "MUESTRA→TIERRA", quien: "laboratorio en Tierra", momento: "según protocolo", fuente: `${C02} 02[5][51]` },
  { id: "02:V91", nombre: "Péptido C urinario (24 h)", unidad: "µg/d", validacion_umbral: "SIN_UMBRAL", nota_umbral: "No encontrado — 02[5]", pregunta: "Péptido C en orina de 24 h", entrada: { tipo: "numero", min: 1, max: 500, decimales: 1 }, medicion: "MUESTRA→TIERRA", quien: "laboratorio en Tierra", momento: "según protocolo", fuente: `${C02} 02[5]` },
  // ---- Lesiones ----
  { id: "02:V94", nombre: "Registro de lesión musculoesquelética", unidad: "texto", validacion_umbral: "SIN_UMBRAL", nota_umbral: "0,021 lesiones/día (hombres), 0,015 (mujeres) — 02[53]", pregunta: "Describe la lesión: zona, tipo y actividad", entrada: { tipo: "texto", max: 300 }, medicion: "NAVE-REPORTE", quien: "astronauta", momento: "cuando ocurra", fuente: `${C02} 02[53]` },
  { id: "02:V95", nombre: "Zonas con síntomas tras sesión con traje", unidad: "lista", validacion_umbral: "SIN_UMBRAL", nota_umbral: "Síntomas en 45,7 % de las sesiones de entrenamiento — 02[10]", pregunta: "¿Dónde tienes molestias tras la sesión con traje?", entrada: { tipo: "multiple", opciones: [...ZONAS, "ninguna"] }, medicion: "NAVE-REPORTE", quien: "astronauta", momento: "tras sesión con traje", fuente: `${C02} 02[10]` },
  { id: "02:V96", nombre: "Lesión de uñas o manos por el guante", unidad: "sí/no", validacion_umbral: "NASA_A", nota_umbral: "[A] Mano >22,86 cm: 19,6 % de prob. de lesión vs. 5,6 % — 02[10]", pregunta: "¿Hay desprendimiento de uña o lesión en la mano?", entrada: { tipo: "si_no" }, medicion: "NAVE-CMO", quien: "médico de a bordo (CMO)", momento: "tras sesión con traje", fuente: `${C02} 02[10]`, nota: "Sin modelo de visión abierto: inspección + foto adjunta." },
  { id: "02:V97", nombre: "Dolor de hombro por el traje", unidad: "NRS 0–10", validacion_umbral: "SIN_UMBRAL", nota_umbral: "64 % refirió dolor de hombro por entrenamiento EVA — 02[10]", pregunta: "¿Cuánto te duele el hombro tras el traje?", entrada: { tipo: "escala", min: 0, max: 10, etiquetas: ["sin dolor", "peor dolor imaginable"] }, medicion: "NAVE-CMO", quien: "médico de a bordo (CMO)", momento: "tras sesión con traje", fuente: `${C02} 02[10]` },
  // ---- Sueño, luz y cefalea (catálogo 03) ----
  { id: "03:V32", nombre: "Tiempo total de sueño (diario)", unidad: "h", validacion_umbral: "CLINICO_T", nota_umbral: "[T] 7–9 h — 03[2]; el diario sobrestima frente a actigrafía", pregunta: "¿Cuántas horas dormiste?", entrada: { tipo: "numero", min: 0, max: 16, decimales: 1 }, medicion: "NAVE-REPORTE", quien: "astronauta", momento: "al despertar", fuente: `${C03} 03[1][11]` },
  { id: "03:V37", nombre: "Calidad subjetiva del sueño", unidad: "0–100", validacion_umbral: "SIN_UMBRAL", nota_umbral: "Sin corte; ISS 66,5 ± 13,4 — 03[1]", pregunta: "¿Qué tan bien dormiste?", entrada: { tipo: "escala", min: 0, max: 100, etiquetas: ["muy mal", "muy bien"] }, medicion: "NAVE-REPORTE", quien: "astronauta", momento: "al despertar", fuente: `${C03} 03[1][12]` },
  { id: "03:V38", nombre: "PSQI (puntuación global)", unidad: "0–21", validacion_umbral: "CLINICO_T", nota_umbral: "[T] >5 = mal durmiente — 03[29]", pregunta: "Puntuación global del PSQI", entrada: { tipo: "numero", min: 0, max: 21 }, medicion: "NAVE-REPORTE", quien: "astronauta", momento: "mensual", fuente: `${C03} 03[29]`, nota: "Licencia: gratis solo para uso no comercial y sin modificar; no se reproducen los ítems." },
  { id: "03:V39", nombre: "ISI (gravedad del insomnio)", unidad: "0–28", validacion_umbral: "CLINICO_T", nota_umbral: "[T] 0–7 sin insomnio; 8–14 subumbral; 15–21 moderado; 22–28 grave — 03[28]", pregunta: "Puntuación total del ISI", entrada: { tipo: "numero", min: 0, max: 28 }, medicion: "NAVE-REPORTE", quien: "astronauta", momento: "mensual", fuente: `${C03} 03[28]`, nota: "⚠️ Condiciones de licencia no verificadas; no se reproducen los ítems." },
  { id: "03:V50", nombre: "Modo de iluminación de cabina", unidad: "modo", validacion_umbral: "NASA_A", nota_umbral: "[A] Misiones >30 días: al menos 3 configuraciones — 03[2]", pregunta: "Modo de iluminación activo", entrada: { tipo: "opcion", opciones: ["general", "pre-sueño", "alerta"] }, medicion: "NAVE-AUTO", quien: "sistema de la nave", momento: "cuando ocurra", fuente: `${C03} 03[2][9]` },
  { id: "03:V82", nombre: "Episodio de cefalea", unidad: "sí/no", validacion_umbral: "SIN_UMBRAL", nota_umbral: "Sin corte; 91,7 % tuvo ≥1 episodio (n=24) — 03[45]", pregunta: "¿Tuviste dolor de cabeza hoy?", entrada: { tipo: "si_no" }, medicion: "NAVE-REPORTE", quien: "astronauta", momento: "antes de dormir", fuente: `${C03} 03[44][45]` },
  { id: "03:V83", nombre: "Intensidad de la cefalea", unidad: "0–10", validacion_umbral: "SIN_UMBRAL", nota_umbral: "Sin corte validado en vuelo — 03[44][45]", pregunta: "¿Qué tan fuerte fue el dolor de cabeza?", entrada: { tipo: "escala", min: 0, max: 10, etiquetas: ["nada", "insoportable"] }, medicion: "NAVE-REPORTE", quien: "astronauta", momento: "antes de dormir", fuente: `${C03} 03[44][45]` },
];

/** Esquema Zod del valor según el tipo de entrada. */
export function esquemaValor(e: Entrada): z.ZodType<number | string | boolean> {
  switch (e.tipo) {
    case "numero":
    case "escala":
      return z.number().min(e.min).max(e.max);
    case "si_no":
      return z.boolean();
    case "opcion":
      return z.enum(e.opciones as [string, ...string[]]);
    case "multiple":
      return z
        .array(z.enum(e.opciones as [string, ...string[]]))
        .min(1)
        .transform((xs) => xs.join(", ")) as unknown as z.ZodType<string>;
    case "texto":
      return z.string().min(1).max(e.max);
  }
}

/** Valida una entrada de formulario y la convierte al contrato común. */
export function capturar(
  id: string,
  valor: unknown,
  timestamp: string,
  origen: AstronautVariableReading["origen_dato"] = "real_dataset",
  fuente_referencia?: string,
  observaciones?: string,
): AstronautVariableReading {
  const f = FORMULARIOS.find((x) => x.id === id);
  if (!f) throw new Error(`${id} no es una variable Tipo C`);
  const v = esquemaValor(f.entrada).parse(valor);
  const obs = [observaciones, `Captura: ${f.quien}, ${f.momento} (${f.medicion})`, f.nota].filter(Boolean).join(" · ");
  return crearLectura(f, 3, {
    valor: v,
    timestamp,
    naturaleza_dato: "input_manual",
    origen_dato: origen,
    fuente_referencia: fuente_referencia ?? f.fuente,
    observaciones: obs,
  });
}
