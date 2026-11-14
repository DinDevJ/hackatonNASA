/**
 * Simulación controlada (decisiones D3-A, D4-A y D5-2A) para las variables Tipo A sin dataset
 * real abierto de astronautas. Semilla fija: cada ejecución produce exactamente los mismos datos.
 * Cada parámetro cita la cifra publicada del catálogo de la que sale.
 */
import type { AstronautVariableReading } from "../contrato.js";
import { isoRelativo, normal, redondear, rng } from "../util.js";
import { lectura, REF } from "./catalogo.js";

const SEMILLA = 20261114;
const SUJETO = "SIM-01";
const EDAD = 45; // supuesto del astronauta simulado
const SIM = "Simulación controlada, semilla 20261114";

/** 03:V31 y 03:V43 — 14 noches prevuelo y 14 en vuelo (D3-A). */
function sueno(r: () => number): AstronautVariableReading[] {
  // ISS: 6,41 h (≈3 meses antes del lanzamiento) y 6,09 ± 0,67 h en vuelo, n=21 — cat. 03 V30 [1].
  // La DE prevuelo no está publicada; se asume igual a la de vuelo (0,67 h).
  const media = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  // Se recentra cada serie para que su media sea exactamente la publicada (decisión del usuario:
  // la deuda debe quedar ≈0,3 h como en NASA). Se conserva la dispersión de la serie aleatoria.
  const centrar = (xs: number[], objetivo: number) => {
    const m = media(xs);
    return xs.map((x) => x - m + objetivo);
  };
  const base = centrar(Array.from({ length: 14 }, () => normal(r, 6.41, 0.67)), 6.41);
  const vuelo = centrar(Array.from({ length: 14 }, () => normal(r, 6.09, 0.67)), 6.09);
  const pctBajo6 = (vuelo.filter((h) => h < 6).length / vuelo.length) * 100;
  const deuda = media(base) - media(vuelo);
  const fuente = `${SIM} — ${REF.CAT03} (V30 [1], V31 [1][11], V43 [2])`;
  const serie = `Serie en vuelo (h): ${vuelo.map((h) => redondear(h, 2)).join(", ")}`;
  return [
    lectura("V31", {
      valor: redondear(pctBajo6, 1),
      timestamp: isoRelativo(28, "07:00"),
      naturaleza_dato: "calculada",
      origen_dato: "simulado_controlado",
      fuente_referencia: fuente,
      observaciones: `14 noches en vuelo ~ N(6,09; 0,67) h. Referencia real ISS: 43,8 % de noches <6 h. ${serie}`,
    }),
    lectura("V43", {
      valor: redondear(deuda, 2),
      timestamp: isoRelativo(28, "07:00"),
      naturaleza_dato: "calculada",
      origen_dato: "simulado_controlado",
      fuente_referencia: fuente,
      observaciones: `Deuda = media 14 noches prevuelo (recentrada a 6,41 h) − media 14 noches en vuelo (recentrada a 6,09 h). Positiva = duerme menos que su línea base. Referencia NASA ≈0,3 h/día. ${serie}`,
    }),
  ];
}

/** 03:V49 — lux por hora durante un día (D4-A). */
function luz(r: () => number): AstronautVariableReading[] {
  // Cat. 03 V49 [4][9]: ISS Nodo 1 ≈138 lux (todas las lámparas) o ≈5,5 lux (una);
  // laboratorio de EE. UU. ≈578 lux; guía NASA ≈20 lux nocturno. Ventanas oscurecidas hasta 2,0 lux.
  const horario: [desde: number, hasta: number, media: number, lugar: string][] = [
    [0, 6, 2, "estación de sueño, ventanas oscurecidas"],
    [6, 8, 138, "Nodo 1, todas las lámparas"],
    [8, 12, 578, "laboratorio de EE. UU."],
    [12, 13, 138, "Nodo 1"],
    [13, 18, 578, "laboratorio de EE. UU."],
    [18, 21, 138, "Nodo 1"],
    [21, 22, 20, "pre-sueño, iluminación nocturna"],
    [22, 24, 2, "estación de sueño"],
  ];
  const out: AstronautVariableReading[] = [];
  for (let h = 0; h < 24; h++) {
    const tramo = horario.find(([a, b]) => h >= a && h < b)!;
    const valor = Math.max(0, redondear(normal(r, tramo[2], tramo[2] * 0.1), 1));
    out.push(
      lectura("V49", {
        valor,
        timestamp: isoRelativo(1, `${String(h).padStart(2, "0")}:00`),
        naturaleza_dato: "directa",
        origen_dato: "simulado_controlado",
        fuente_referencia: `${SIM} — ${REF.CAT03} (V49 [4][9][2])`,
        observaciones: `Media horaria del fotómetro. Escenario: ${tramo[3]} (≈${tramo[2]} lux, ±10 %).`,
      }),
    );
  }
  return out;
}

/** 02:V56 — minutos de ejercicio de una semana (D4-A). */
function ejercicio(r: () => number): AstronautVariableReading[] {
  // Cat. 02 V56 [15][22]: ISS 1,5 h/día, 6–7 días/semana; ≈600 min/semana (n=46).
  const dias = Array.from({ length: 7 }, (_, i) => (i === 6 ? 0 : Math.round(normal(r, 90, 10))));
  const fuente = `${SIM} — ${REF.CAT02} (V56 [15][22])`;
  const out = dias.map((min, i) =>
    lectura("V56", {
      nombre_detalle: "diario",
      unidad: "min/día",
      valor: min,
      timestamp: isoRelativo(i + 1, "23:59"),
      naturaleza_dato: "directa",
      origen_dato: "simulado_controlado",
      fuente_referencia: fuente,
      observaciones: i === 6 ? "Día de descanso (6 de 7 días con ejercicio)." : "Sesión diaria ~ N(90; 10) min.",
    }),
  );
  out.push(
    lectura("V56", {
      nombre_detalle: "semanal",
      unidad: "min/semana",
      valor: dias.reduce((a, b) => a + b, 0),
      timestamp: isoRelativo(7, "23:59"),
      naturaleza_dato: "calculada",
      origen_dato: "simulado_controlado",
      fuente_referencia: fuente,
      observaciones: "Suma de los 7 días. Referencia real: ≈600 min/semana.",
    }),
  );
  return out;
}

/** 02:V52 — FC en etapas CEVIS al 25/50/75 % del VO2pico, prevuelo y día 15 de vuelo (D5-2A). */
function fcSubmaxima(r: () => number): AstronautVariableReading[] {
  // Protocolo cat. 02 V52 [8]: etapas de 5 min al 25/50/75 % del VO2pico previo; L-60, día 15...
  // Supuesto (parámetro de simulación): %FCreserva ≈ %VO2reserva (Swain 1997); FC reposo 60 lpm;
  // FCmáx Tanaka. En vuelo, FC +7 % (cat. 02 V52 [8], n=4, día 8 al 85 % de carga).
  const fcReposo = 60;
  const fcMax = 208 - 0.7 * EDAD;
  const fuente = `${SIM} — ${REF.CAT02} (V52 [8])`;
  const out: AstronautVariableReading[] = [];
  for (const [momento, dia, factor] of [["prevuelo L-60", 1, 1], ["vuelo día 15", 15, 1.07]] as const) {
    for (const pct of [25, 50, 75]) {
      const esperada = (fcReposo + (pct / 100) * (fcMax - fcReposo)) * factor;
      out.push(
        lectura("V52", {
          nombre_detalle: `etapa ${pct} % VO2pico, ${momento}`,
          valor: Math.round(normal(r, esperada, 3)),
          timestamp: isoRelativo(dia, `10:${String(5 * (pct / 25)).padStart(2, "0")}`),
          naturaleza_dato: "directa",
          origen_dato: "simulado_controlado",
          fuente_referencia: fuente,
          observaciones: `FC media de la etapa de 5 min. Supuestos: FC reposo ${fcReposo}, FCmáx Tanaka ${redondear(fcMax, 1)} (edad ${EDAD}), %FCR ≈ %VO2R (Swain 1997)${factor > 1 ? ", +7 % en vuelo" : ""}; ruido ±3 lpm.`,
        }),
      );
    }
  }
  return out;
}

export function extraerSimulado(): { sujeto: string; lecturas: AstronautVariableReading[] } {
  const r = rng(SEMILLA);
  // 02:V56 ya no se simula: sale real del Fitbit de CGMacros (decisión del usuario).
  // La función ejercicio() se conserva solo como respaldo; no se emite.
  void ejercicio;
  return { sujeto: SUJETO, lecturas: [...fcSubmaxima(r), ...sueno(r), ...luz(r)] };
}
