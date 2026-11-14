/**
 * Clasificación de mis 78 variables con las tablas de Julio (Planeacion/Julio/listado-77-variables.md,
 * checklist-G1-G6.md, mis-variables-agrupadas.md):
 *   - Origen: ⌚ Reloj · 🧠 Modelo · ✍️ Input · 🛰️ Nave · 🧮 Cálculo · 🩺 CMO · 🔴 No a bordo · ❌ Descartada
 *   - Nivel de la escalera de obtención: N0 reloj · N1 modelo · NT telemetría · N2 astronauta · N3 CMO · N4 Tierra
 *   - Grupo por ruta de investigación: G1…G9 (G2 manguito no aplica a mis variables)
 * Más mi tipo A/B/C (⟶ = fusionada en otra variable) y qué entrega el HUAWEI WATCH 5.
 * Uso: npm run clasificacion  →  out/clasificacion-variables.json + ../listado-78-variables.md
 */
import { readFileSync, writeFileSync } from "node:fs";

type Origen = "⌚ Reloj" | "🧠 Modelo" | "✍️ Input" | "🛰️ Nave" | "🧮 Cálculo" | "🩺 CMO" | "🔴 No a bordo" | "❌ Descartada" | "⟶ Fusionada";
type Watch = "en vivo (BLE)" | "exportación Huawei Health ⚠️" | "cálculo sobre exportación ⚠️" | "no lo da";

const NIVEL: Record<Origen, string> = {
  "⌚ Reloj": "N0", "🧮 Cálculo": "N0", "🧠 Modelo": "N1", "🛰️ Nave": "NT",
  "✍️ Input": "N2", "🩺 CMO": "N3", "🔴 No a bordo": "N4", "❌ Descartada": "—", "⟶ Fusionada": "—",
};

const GRUPO_NOMBRE: Record<string, string> = {
  G1: "Wearable continuo", G3: "Pruebas funcionales y medición puntual", G4: "Escalas individuales",
  G5: "Riesgo de licencia", G6: "Telemetría de la nave", G7: "Ultrasonido e imagen", G8: "Laboratorio",
  G9: "Derivadas", "—": "Sin grupo (descartada o fusionada)",
};

// [id, tipo, origen, grupo, watch5, nota]
const T: [string, "A" | "B" | "C" | "❌" | "⟶", Origen, string, Watch, string?][] = [
  // Tipo A
  ["02:V52", "A", "⌚ Reloj", "G1", "en vivo (BLE)", "FC por etapa; las etapas las marca el CEVIS"],
  ["02:V53", "A", "⌚ Reloj", "G1", "en vivo (BLE)"],
  ["02:V56", "A", "⌚ Reloj", "G1", "exportación Huawei Health ⚠️", "Registro de entrenamientos del reloj"],
  ["02:V92", "A", "⌚ Reloj", "G1", "no lo da", "Parche CGM aparte: ningún reloj de consumo mide glucosa"],
  ["03:V30", "A", "⌚ Reloj", "G1", "exportación Huawei Health ⚠️", "TruSleep™ (algoritmo propietario)"],
  ["03:V31", "A", "🧮 Cálculo", "G9", "cálculo sobre exportación ⚠️"],
  ["03:V33", "A", "⌚ Reloj", "G1", "exportación Huawei Health ⚠️", "TruSleep™"],
  ["03:V34", "A", "⌚ Reloj", "G1", "exportación Huawei Health ⚠️", "TruSleep™"],
  ["03:V35", "A", "⌚ Reloj", "G1", "exportación Huawei Health ⚠️", "TruSleep™"],
  ["03:V36", "A", "⌚ Reloj", "G1", "exportación Huawei Health ⚠️", "TruSleep™"],
  ["03:V43", "A", "🧮 Cálculo", "G9", "cálculo sobre exportación ⚠️"],
  ["03:V49", "A", "⌚ Reloj", "G1", "no lo da", "El reloj tiene sensor de luz, pero no se encontró cómo exportar lux ⚠️"],
  // Tipo B
  ["02:V43", "B", "🧠 Modelo", "G9", "no lo da", "Epley sobre cargas del ARED"],
  ["02:V44", "B", "🛰️ Nave", "G6", "no lo da", "ARED"],
  ["02:V47", "B", "🩺 CMO", "G7", "no lo da", "Ultrasonido por el CMO + modelo DeepACSA (N1)"],
  ["02:V51", "B", "🧠 Modelo", "G9", "no lo da", "Extrapolación FC–VO₂ y Uth; la FC puede venir del reloj"],
  ["02:V54", "B", "🛰️ Nave", "G6", "no lo da", "CEVIS"],
  ["02:V55", "B", "🛰️ Nave", "G6", "no lo da", "T2"],
  ["02:V73", "B", "✍️ Input", "G3", "no lo da", "Prueba cronometrada en la app"],
  ["02:V75", "⟶", "⟶ Fusionada", "—", "no lo da", "FUSIONADA en 01:V8 (masa corporal, de Julio). Decisión de Leo 14-11-2026"],
  ["02:V79", "B", "✍️ Input", "G3", "no lo da", "Registro de comida + API USDA"],
  ["02:V81", "B", "✍️ Input", "G3", "no lo da", "Registro de comida + API USDA"],
  ["02:V82", "B", "✍️ Input", "G3", "no lo da", "Registro de comida + API USDA"],
  ["02:V83", "B", "✍️ Input", "G3", "no lo da", "Registro de comida + API USDA"],
  ["02:V84", "B", "✍️ Input", "G3", "no lo da", "Registro de comida + API USDA"],
  ["02:V93", "B", "✍️ Input", "G3", "no lo da", "Registro de comida + API USDA"],
  // Tipo C — en Tierra o laboratorio
  ["02:V40", "C", "🔴 No a bordo", "G3", "no lo da", "Dinamómetro isocinético"],
  ["02:V41", "C", "🔴 No a bordo", "G3", "no lo da", "Dinamómetro isocinético"],
  ["02:V42", "C", "🔴 No a bordo", "G3", "no lo da", "Dinamómetro"],
  ["02:V45", "C", "🔴 No a bordo", "G3", "no lo da", "Dinamómetro de agarre (en vuelo no verificado ⚠️)"],
  ["02:V46", "C", "🔴 No a bordo", "G7", "no lo da", "Resonancia magnética"],
  ["02:V50", "C", "🔴 No a bordo", "G7", "no lo da", "DXA"],
  ["02:V63", "C", "🔴 No a bordo", "G7", "no lo da", "Resonancia magnética"],
  ["02:V66", "C", "🔴 No a bordo", "G7", "no lo da", "Imagen de columna"],
  ["02:V67b", "C", "🔴 No a bordo", "G5", "no lo da", "MSSQ prevuelo; licencia no verificada ⚠️"],
  ["02:V68b", "C", "🔴 No a bordo", "G3", "no lo da", "Síntomas tras aterrizar"],
  ["02:V69", "C", "🔴 No a bordo", "G3", "no lo da", "Plataforma de posturografía"],
  ["02:V70", "C", "🔴 No a bordo", "G3", "no lo da", "Solo con gravedad"],
  ["02:V71", "C", "🔴 No a bordo", "G3", "no lo da", "Solo con gravedad"],
  ["02:V72", "C", "🔴 No a bordo", "G3", "no lo da", "Functional Task Test"],
  ["02:V76", "C", "🔴 No a bordo", "G8", "no lo da", "Muestra congelada, análisis en Tierra"],
  ["02:V78", "C", "🔴 No a bordo", "G8", "no lo da", "Muestra congelada, análisis en Tierra"],
  ["02:V80", "C", "🔴 No a bordo", "G8", "no lo da", "Muestra congelada, análisis en Tierra"],
  ["02:V87", "C", "🔴 No a bordo", "G8", "no lo da", "OGTT"],
  ["02:V89", "C", "🔴 No a bordo", "G8", "no lo da", "HbA1c"],
  ["02:V90", "C", "🔴 No a bordo", "G8", "no lo da", "Muestra congelada, análisis en Tierra"],
  ["02:V91", "C", "🔴 No a bordo", "G8", "no lo da", "Orina de 24 h congelada"],
  // Tipo C — médico de a bordo
  ["02:V49", "C", "🩺 CMO", "G3", "no lo da", "MyotonPRO (experimento ESA)"],
  ["02:V64", "C", "🩺 CMO", "G7", "no lo da", "Ultrasonido de columna"],
  ["02:V65", "C", "🩺 CMO", "G3", "no lo da", "Exploración neurológica"],
  ["02:V86", "C", "🩺 CMO", "G3", "no lo da", "Glucómetro capilar (a bordo no confirmado ⚠️)"],
  ["02:V88", "C", "🩺 CMO", "G3", "no lo da", "Glucómetro capilar (a bordo no confirmado ⚠️)"],
  ["02:V96", "C", "🩺 CMO", "G7", "no lo da", "Inspección + foto"],
  ["02:V97", "C", "🩺 CMO", "G4", "no lo da", "NRS + exploración del hombro"],
  // Tipo C — el astronauta lo reporta
  ["02:V48", "C", "✍️ Input", "G3", "no lo da", "Cinta métrica"],
  ["02:V57", "C", "✍️ Input", "G4", "no lo da"],
  ["02:V58", "C", "✍️ Input", "G4", "no lo da", "NRS 0–10"],
  ["02:V59", "C", "✍️ Input", "G3", "no lo da"],
  ["02:V60", "C", "✍️ Input", "G3", "no lo da"],
  ["02:V61", "C", "✍️ Input", "G3", "no lo da", "Cinta (equipo en vuelo no encontrado ⚠️)"],
  ["02:V62", "C", "✍️ Input", "G3", "no lo da", "Cinta"],
  ["02:V67a", "C", "✍️ Input", "G3", "no lo da", "Lista de síntomas"],
  ["02:V68a", "C", "✍️ Input", "G3", "no lo da"],
  ["02:V74", "C", "✍️ Input", "G3", "no lo da"],
  ["02:V77", "C", "✍️ Input", "G3", "no lo da"],
  ["02:V85", "C", "✍️ Input", "G4", "no lo da"],
  ["02:V94", "C", "✍️ Input", "G3", "no lo da"],
  ["02:V95", "C", "✍️ Input", "G3", "no lo da"],
  ["03:V32", "C", "✍️ Input", "G3", "no lo da", "Diario de sueño"],
  ["03:V37", "C", "✍️ Input", "G4", "no lo da"],
  ["03:V38", "C", "✍️ Input", "G5", "no lo da", "PSQI: solo uso no comercial"],
  ["03:V39", "C", "✍️ Input", "G5", "no lo da", "ISI: licencia no verificada ⚠️"],
  ["03:V50", "C", "🛰️ Nave", "G6", "no lo da", "Modo de iluminación de cabina"],
  ["03:V82", "C", "✍️ Input", "G3", "no lo da"],
  ["03:V83", "C", "✍️ Input", "G4", "no lo da"],
  // Descartadas
  ["03:V40", "❌", "❌ Descartada", "G5", "no lo da", "Epworth: requiere licencia; la KSS de Julio la cubre"],
  ["03:V41", "❌", "❌ Descartada", "—", "no lo da", "Polisomnografía: sin equipo operativo a bordo"],
  ["03:V42", "❌", "❌ Descartada", "—", "no lo da", "EEG: sin equipo operativo a bordo"],
];

// Nombres desde la tabla de investigación (generada de los catálogos de Iker).
const csv = readFileSync(new URL("../../tabla-investigacion.csv", import.meta.url), "utf8").replace(/^﻿/, "");
const nombres = new Map<string, string>();
for (const linea of csv.split(/\r?\n/).slice(1)) {
  const m = /^([^,]+),("(?:[^"]|"")*"|[^,]*)/.exec(linea);
  if (m) nombres.set(m[1]!, m[2]!.replace(/^"|"$/g, "").replace(/""/g, '"'));
}

const ids = T.map((t) => t[0]);
const faltan = [...nombres.keys()].filter((k) => !ids.includes(k));
const repetidos = ids.filter((x, i) => ids.indexOf(x) !== i);
if (T.length !== 78 || faltan.length || repetidos.length) {
  throw new Error(`Clasificación incompleta: ${T.length} filas, faltan ${faltan.join(" ")}, repetidos ${repetidos.join(" ")}`);
}

const filas = T.map(([id, tipo, origen, grupo, watch5, nota], i) => ({
  n: i + 1, id, nombre: nombres.get(id) ?? "", tipo, origen, nivel: NIVEL[origen], grupo, watch5, nota: nota ?? "",
}));

writeFileSync(new URL("../out/clasificacion-variables.json", import.meta.url), JSON.stringify({ generado: new Date().toISOString(), filas }, null, 2) + "\n");

const contar = <K extends string>(f: (x: (typeof filas)[number]) => K) =>
  [...filas.reduce((m, x) => m.set(f(x), (m.get(f(x)) ?? 0) + 1), new Map<K, number>())];

const md = `# Mis 78 variables con las tablas de clasificación de Julio

Generado por \`ingesta/src/clasificacion.ts\` (no transcrito a mano). Usa el **origen** y la
**escalera de obtención** de \`../Julio/listado-77-variables.md\` y \`../Julio/checklist-G1-G6.md\`,
y los **grupos G1–G9** de \`../Julio/mis-variables-agrupadas.md\`. Añade mi tipo A/B/C y qué
entrega el **HUAWEI WATCH 5** (\`reloj-huawei-watch5.md\`).

✅ verificado · ⚠️ no confirmado · 🔶 decisión nuestra

## Resumen

| Origen | Nivel | Nº |
|---|---|---:|
${contar((x) => x.origen).map(([o, n]) => `| ${o} | ${NIVEL[o as Origen]} | ${n} |`).join("\n")}

| Grupo | Ruta | Nº |
|---|---|---:|
${contar((x) => x.grupo).sort().map(([g, n]) => `| ${g} | ${GRUPO_NOMBRE[g]} | ${n} |`).join("\n")}

| HUAWEI WATCH 5 | Nº |
|---|---:|
${contar((x) => x.watch5).map(([w, n]) => `| ${w} | ${n} |`).join("\n")}

## Listado

| Nº | ID | Variable | Tipo | Origen | Nivel | Grupo | WATCH 5 | Nota |
|---:|---|---|---|---|---|---|---|---|
${filas.map((x) => `| ${x.n} | \`${x.id}\` | ${x.nombre.replace(/\|/g, "/")} | ${x.tipo} | ${x.origen} | ${x.nivel} | ${x.grupo} | ${x.watch5} | ${x.nota} |`).join("\n")}
`;
writeFileSync(new URL("../../listado-78-variables.md", import.meta.url), md);
console.log("✓ 78 variables clasificadas →", Object.fromEntries(contar((x) => x.origen)));
