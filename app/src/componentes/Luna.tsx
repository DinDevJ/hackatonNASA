import type { Nivel } from '../logica/semaforo';

/**
 * El asistente con forma de luna de la maqueta de Leo: llena en verde, gibosa en ámbar,
 * casi nueva en rojo.
 */
export function Luna({ nivel, tam = 40 }: { nivel: Nivel; tam?: number }) {
  const sombra = [0, 10, 18][nivel] as number; // cuánto tapa la sombra
  const halo = ['var(--cian)', 'var(--ambar)', 'var(--rojo)'][nivel];
  return (
    <svg width={tam} height={tam} viewBox="0 0 40 40" className={`luna nivel-${nivel}`} aria-hidden="true">
      <circle cx="20" cy="20" r="18" fill="none" stroke={halo} strokeWidth="2" opacity=".55" />
      <circle cx="20" cy="20" r="14" fill="#FFF6D6" />
      {sombra > 0 && <circle cx={20 + 28 - sombra} cy="20" r="14" fill="var(--azul)" opacity=".85" />}
      <circle cx="16" cy="18" r="1.4" fill="#192584" />
      <circle cx="23" cy="18" r="1.4" fill="#192584" />
      <path d={nivel === 0 ? 'M16 23 Q19.5 26 23 23' : 'M16 24.5 Q19.5 23 23 24.5'} stroke="#192584" strokeWidth="1.4" fill="none" strokeLinecap="round" />
    </svg>
  );
}
