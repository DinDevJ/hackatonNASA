/**
 * Estado de un tripulante en un día: el semáforo de cada indicador y los avisos de varios días.
 */
import { INDICADORES, ORDEN, type IdIndicador } from '../datos/indicadores';
import { indiceDia, type Tripulante } from '../datos/tripulacion';
import { evaluar, peor, tuNormal, type Evaluacion, type Nivel } from './semaforo';

export interface EstadoIndicador extends Evaluacion {
  id: IdIndicador;
  valor: number | null;
  /** Si hoy no se midió, el último valor y de qué día es. */
  ultimo: { valor: number; dia: number } | null;
  historia: Array<number | null>; // los 14 días anteriores + hoy
}

export function estadoIndicador(p: Tripulante, id: IdIndicador, dia: number): EstadoIndicador {
  const i = indiceDia(dia);
  const s = p.serie[id];
  const previos = s.slice(0, i);
  const valor = s[i] ?? null;
  let ultimo: EstadoIndicador['ultimo'] = null;
  for (let k = i; k >= 0; k--) {
    const v = s[k];
    if (v != null) { ultimo = { valor: v, dia: dia - (i - k) }; break; }
  }
  // Un valor manual de ayer todavía cuenta para el semáforo; uno más viejo, no.
  const vigente = valor ?? (ultimo && dia - ultimo.dia <= 1 ? ultimo.valor : null);
  return { id, valor, ultimo, historia: s.slice(Math.max(0, i - 14), i + 1), ...evaluar(INDICADORES[id], vigente, previos) };
}

export interface Aviso {
  id: string;
  nivel: Nivel;
  titulo: { es: string; en: string };
  detalle: { es: string; en: string };
  senales: IdIndicador[];
}

/**
 * FATIGA-03 (regla PREV-FATIGA-MULTIVAR-01 de Diana): tres noches seguidas con 1 h menos
 * que tu normal, pulso en reposo con z ≥ 2 y HRV con z ≤ −2.
 */
export function avisos(p: Tripulante, dia: number): Aviso[] {
  const i = indiceDia(dia);
  const sueno = p.serie.sueno;
  const base = tuNormal(sueno.slice(0, Math.max(0, i - 2)), INDICADORES.sueno.madMinimo);
  const noches = [i - 2, i - 1, i].map((k) => sueno[k]);
  const cortas = base != null && noches.every((h) => h != null && h < base.mediana - 1);
  const fc = estadoIndicador(p, 'fc', dia);
  const hrv = estadoIndicador(p, 'hrv', dia);
  const out: Aviso[] = [];
  if (cortas && (fc.z ?? 0) >= 2 && (hrv.z ?? 0) <= -2) {
    out.push({
      id: 'FATIGA-03',
      nivel: 1,
      titulo: { es: 'Fatiga acumulada', en: 'Accumulated fatigue' },
      detalle: {
        es: '3 noches con más de 1 h menos de sueño que tu normal, pulso en reposo alto y HRV baja. Protege tu ventana de sueño de 8,5 h esta noche y evita cafeína 6 h antes de dormir.',
        en: '3 nights with over 1 h less sleep than your normal, high resting pulse and low HRV. Protect your 8.5 h sleep window tonight and avoid caffeine 6 h before bed.',
      },
      senales: ['sueno', 'fc', 'hrv'],
    });
  }
  return out;
}

export function estadoGeneral(p: Tripulante, dia: number): Nivel {
  return peor([...ORDEN.map((id) => estadoIndicador(p, id, dia).nivel), ...avisos(p, dia).map((a) => a.nivel)]);
}
