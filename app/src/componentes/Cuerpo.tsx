import type { Region } from '../datos/indicadores';
import { UI, useT, type Texto } from '../i18n';
import { peor, type Nivel } from '../logica/semaforo';
import { Forma, claseNivel } from './Semaforo';

export const REGIONES: Record<Region, { nombre: Texto; marca: [number, number] }> = {
  cabeza: { nombre: { es: 'Cabeza: sueño y ánimo', en: 'Head: sleep and mood' }, marca: [128, 38] },
  corazon: { nombre: { es: 'Corazón: pulso, HRV y presión', en: 'Heart: pulse, HRV and pressure' }, marca: [128, 106] },
  brazo: { nombre: { es: 'Muñeca: temperatura', en: 'Wrist: temperature' }, marca: [176, 174] },
  abdomen: { nombre: { es: 'Abdomen: glucosa', en: 'Abdomen: glucose' }, marca: [128, 158] },
};

interface Props {
  niveles: Record<Region, Nivel[]>;
  activa: Region | null;
  onElegir: (r: Region | null) => void;
}

/**
 * Cuerpo LUNA (RF-01-01): figura humana clicable. Cada zona toma el color de su peor
 * indicador y lleva la forma del semáforo, para que se lea sin color.
 */
export function Cuerpo({ niveles, activa, onElegir }: Props) {
  const { t } = useT();
  const nivel = (r: Region) => peor(niveles[r]);
  const zona = (r: Region) => ({
    className: `zona ${claseNivel(nivel(r))} ${activa === r ? 'activa' : ''}`,
    onClick: () => onElegir(activa === r ? null : r),
    onKeyDown: (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onElegir(activa === r ? null : r); } },
    role: 'button',
    tabIndex: 0,
    'aria-label': t(REGIONES[r].nombre),
    'aria-pressed': activa === r,
  });

  return (
    <div className="cuerpo">
      <svg viewBox="0 0 256 330" className="cuerpo-svg">
        {/* silueta */}
        <g className="silueta">
          <rect x="62" y="84" width="20" height="96" rx="10" transform="rotate(12 72 84)" />
          <rect x="174" y="84" width="20" height="96" rx="10" transform="rotate(-12 184 84)" />
          <rect x="96" y="208" width="26" height="104" rx="13" />
          <rect x="134" y="208" width="26" height="104" rx="13" />
          <circle cx="128" cy="76" r="0" />
        </g>
        {/* zonas clicables */}
        <circle cx="128" cy="40" r="30" {...zona('cabeza')} />
        <rect x="86" y="76" width="84" height="62" rx="26" {...zona('corazon')} />
        <rect x="90" y="136" width="76" height="80" rx="24" {...zona('abdomen')} />
        <circle cx="194" cy="182" r="14" {...zona('brazo')} />
        {/* corazón dibujado dentro del pecho */}
        <path className="icono-corazon" d="M128 120 C 112 108, 112 94, 122 94 C 126 94, 128 98, 128 100 C 128 98, 130 94, 134 94 C 144 94, 144 108, 128 120 Z" />
        {/* marcas de estado */}
        {(Object.keys(REGIONES) as Region[]).map((r) => {
          const [mx, my] = REGIONES[r].marca;
          return (
            <g key={r} transform={`translate(${mx + (r === 'brazo' ? 18 : 30)} ${my - 18})`} className="marca" aria-hidden="true">
              <circle r="11" cx="7" cy="7" className="marca-fondo" />
              <Forma nivel={nivel(r)} tam={14} />
            </g>
          );
        })}
      </svg>
      <p className="cuerpo-ayuda">{activa ? t(REGIONES[activa].nombre) : t(UI.cuerpoAyuda)}</p>
      {activa && <button className="enlace" onClick={() => onElegir(null)}>{t(UI.todos)}</button>}
    </div>
  );
}
