import type { Indicador } from '../datos/indicadores';
import { UI, useT } from '../i18n';
import type { Evaluacion } from '../logica/semaforo';

/**
 * Etiqueta de procedencia del umbral (RI-UI-03): [A] NASA · [T] clínico · tu normal.
 * Si el estado lo decidió un umbral, se muestra ese; si no, la regla principal del indicador.
 */
export function EtiquetaUmbral({ ind, ev }: { ind: Indicador; ev: Evaluacion }) {
  const { t } = useT();
  const tipo = ev.motivo ?? (ind.contraTuNormal ? 'tu_normal' : ind.absoluto?.tipo ?? 'tu_normal');
  const texto = tipo === 'A' ? '[A] NASA' : tipo === 'T' ? { es: '[T] clínico', en: '[T] clinical' } : UI.tuNormal;
  return <span className={`etiqueta umbral-${tipo}`}>{typeof texto === 'string' ? texto : t(texto)}</span>;
}

/** Cómo se obtuvo el valor (RI-UI-04): lo estimado se ve distinto de lo medido. */
export function EtiquetaProcedencia({ ind }: { ind: Indicador }) {
  const { t } = useT();
  const texto = { sensor: UI.medido, calculado: UI.calculado, estimado: UI.estimado, manual: UI.manual }[ind.procedencia];
  return <span className={`procedencia ${ind.procedencia}`}>{t(texto)}</span>;
}
