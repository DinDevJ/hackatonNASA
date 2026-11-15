/**
 * LUNNA — Live-telemetry Updating Network for Nominal-deviation & Anomalies
 *
 * Predice cuánto cambiará cada signo vital de UNA persona al pasar de la Tierra a
 * otro entorno, y avisa cuando lo medido se sale de lo esperado PARA ELLA.
 *
 * Matemática: actualización bayesiana normal-normal en tres capas.
 *
 *   ① Prior poblacional   Δ ~ N(μ₀ + β·covariables, τ₀²)       literatura
 *   ② Historial personal  k misiones previas con Δ observado   σ_misión
 *   ③ Calibración         n días propios en la ventana inicial σ_día
 *
 * Con cero datos propios manda la literatura; con una misión previa manda su
 * historial; tras la ventana de calibración mandan sus propios datos. Cada capa
 * pesa según su precisión, y el resultado trae SIEMPRE su banda de incertidumbre.
 *
 * Decisión de diseño: la calibración se CONGELA al cerrar la ventana (14 días por
 * defecto). Si siguiera aprendiendo, una deriva lenta —la fatiga acumulada del día
 * 112— se absorbería como "su nueva normalidad" y nunca saltaría la alerta.
 */

export type Entorno = 'tierra' | 'orbita' | 'transito' | 'luna' | 'marte';
export const ENTORNOS: Entorno[] = ['tierra', 'orbita', 'transito', 'luna', 'marte'];

/** Cómo se expresa el cambio: porcentaje del basal, o unidades absolutas. */
export type Escala = 'relativa' | 'absoluta';

export interface Covariables {
  edad: number;
  sexo: 'F' | 'M';
  peso_kg: number;
  altura_m: number;
  sangre?: string;
}

/** Prior de una variable en un entorno. Viene de las semillas de Leo e Iker. */
export interface Prior {
  variable: string;
  entorno: Entorno;
  escala: Escala;
  /** Cambio medio esperado. Relativa: fracción (−0,067 = −6,7 %). Absoluta: unidades. */
  mu0: number;
  /** Dispersión del cambio entre personas. */
  tau0: number;
  /** Variabilidad de la misma persona entre misiones. */
  sigma_mision: number;
  /** Ruido de un día a otro. */
  sigma_dia: number;
  /** Ajuste por covariables (centradas). Por defecto todo 0: no se inventan efectos. */
  beta?: Partial<Record<'edad' | 'sexo_f' | 'peso' | 'altura', number>>;
  /** Sin datos humanos en este entorno: la predicción es extrapolación. */
  extrapolado: boolean;
  fuente: string;
  notas?: string;
}

export interface Prediccion {
  variable: string;
  entorno: Entorno;
  escala: Escala;
  basal: number;
  /** Cambio esperado y su incertidumbre (misma escala que el prior). */
  mu: number;
  tau: number;
  /** Valor esperado en unidades de la variable. */
  esperado: number;
  /** Intervalo del 95 % para una medición diaria nueva, en unidades. */
  banda: [number, number];
  /** Cuánto pesa cada fuente de evidencia. Suman 1. */
  pesos: { poblacion: number; historial: number; vuelo: number };
  n_historial: number;
  n_vuelo: number;
  extrapolado: boolean;
  fuente: string;
}

export interface Evaluacion {
  z: number;
  estado: 'verde' | 'ambar' | 'rojo';
  fuera_de_banda: boolean;
  /**
   * P(una desviación así de grande | la persona sigue en su estado nominal).
   * Es la P(E|H) del teorema de Bayes: cuanto más baja, menos creíble que sea ruido.
   */
  prob_nominal: number;
}

/** Función de error (Abramowitz y Stegun 7.1.26, error < 1,5·10⁻⁷). */
function erf(x: number): number {
  const s = Math.sign(x), a = Math.abs(x), t = 1 / (1 + 0.3275911 * a);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-a * a);
  return s * y;
}

/** Centrado de covariables. Valores de referencia, no "ideales". */
const REF = { edad: 35, peso: 70, altura: 1.7 };

function muAjustado(p: Prior, c: Covariables | null): number {
  if (!c || !p.beta) return p.mu0;
  const b = p.beta;
  // El tipo de sangre NO entra: no hay evidencia de que prediga la adaptación.
  return (
    p.mu0 +
    (b.edad ?? 0) * (c.edad - REF.edad) +
    (b.sexo_f ?? 0) * (c.sexo === 'F' ? 1 : 0) +
    (b.peso ?? 0) * (c.peso_kg - REF.peso) +
    (b.altura ?? 0) * (c.altura_m - REF.altura)
  );
}

/** Convierte un valor medido al cambio respecto al basal, en la escala del prior. */
export function aDelta(valor: number, basal: number, escala: Escala): number {
  return escala === 'relativa' ? valor / basal - 1 : valor - basal;
}

function deDelta(delta: number, basal: number, escala: Escala): number {
  return escala === 'relativa' ? basal * (1 + delta) : basal + delta;
}

export function predecir(args: {
  prior: Prior;
  basal: number;
  covariables?: Covariables | null;
  /** Δ observado en misiones previas, mismo entorno y escala. */
  historial?: number[];
  /** Δ diarios de la ventana de calibración de ESTA misión. */
  calibracion?: number[];
}): Prediccion {
  const { prior: p, basal } = args;
  const hist = args.historial ?? [];
  const cal = args.calibracion ?? [];

  const precPob = 1 / p.tau0 ** 2;
  const precHist = hist.length / p.sigma_mision ** 2;
  const precVuelo = cal.length / p.sigma_dia ** 2;
  const prec = precPob + precHist + precVuelo;

  const suma = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
  const mu =
    (muAjustado(p, args.covariables ?? null) * precPob +
      (hist.length ? (suma(hist) / p.sigma_mision ** 2) : 0) +
      (cal.length ? (suma(cal) / p.sigma_dia ** 2) : 0)) / prec;
  const tau = Math.sqrt(1 / prec);

  // Intervalo predictivo para UNA medición nueva: incertidumbre del modelo + ruido diario.
  const sdPred = Math.sqrt(tau ** 2 + p.sigma_dia ** 2);
  const a = deDelta(mu - 1.96 * sdPred, basal, p.escala);
  const b = deDelta(mu + 1.96 * sdPred, basal, p.escala);

  return {
    variable: p.variable,
    entorno: p.entorno,
    escala: p.escala,
    basal,
    mu,
    tau,
    esperado: deDelta(mu, basal, p.escala),
    banda: [Math.min(a, b), Math.max(a, b)],
    pesos: { poblacion: precPob / prec, historial: precHist / prec, vuelo: precVuelo / prec },
    n_historial: hist.length,
    n_vuelo: cal.length,
    extrapolado: p.extrapolado,
    fuente: p.fuente,
  };
}

/** Compara una medición con lo predicho para esa persona en ese entorno. */
export function evaluar(valor: number, pred: Prediccion, prior: Prior): Evaluacion {
  const sdPred = Math.sqrt(pred.tau ** 2 + prior.sigma_dia ** 2);
  const z = (aDelta(valor, pred.basal, pred.escala) - pred.mu) / sdPred;
  const az = Math.abs(z);
  return {
    z,
    estado: az >= 3 ? 'rojo' : az >= 2 ? 'ambar' : 'verde',
    fuera_de_banda: valor < pred.banda[0] || valor > pred.banda[1],
    prob_nominal: 1 - erf(az / Math.SQRT2),
  };
}
