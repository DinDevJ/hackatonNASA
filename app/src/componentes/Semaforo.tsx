import { ESTADO, useT } from '../i18n';
import type { Nivel } from '../logica/semaforo';

const CLASE = ['verde', 'ambar', 'rojo'] as const;

/** Forma + color + texto a la vez (RI-UI-02, RNF-USA-01): se entiende en escala de grises. */
export function Forma({ nivel, tam = 14 }: { nivel: Nivel; tam?: number }) {
  const s = tam;
  return (
    <svg className={`forma ${CLASE[nivel]}`} width={s} height={s} viewBox="0 0 14 14" aria-hidden="true">
      {nivel === 0 && <circle cx="7" cy="7" r="6" />}
      {nivel === 1 && <rect x="1.5" y="1.5" width="11" height="11" rx="1.5" />}
      {nivel === 2 && <path d="M7 1 L13 12.5 H1 Z" />}
    </svg>
  );
}

export function Semaforo({ nivel, conTexto = true, tam }: { nivel: Nivel; conTexto?: boolean; tam?: number }) {
  const { t } = useT();
  return (
    <span className={`semaforo ${CLASE[nivel]}`} role="status" aria-label={t(ESTADO[nivel])}>
      <Forma nivel={nivel} {...(tam ? { tam } : {})} />
      {conTexto && <span>{t(ESTADO[nivel])}</span>}
    </span>
  );
}

export const claseNivel = (n: Nivel) => CLASE[n];
