import type { Indicador } from '../datos/indicadores';
import { numero, useT } from '../i18n';
import type { Nivel, TuNormal } from '../logica/semaforo';

interface Props {
  ind: Indicador;
  historia: Array<number | null>; // el último es hoy
  normal: TuNormal | null;
  nivelHoy: Nivel;
  grande?: boolean;
  /** Etiquetas de día para el eje (solo en la versión grande). */
  dias?: number[];
}

const COLOR = ['var(--verde)', 'var(--ambar)', 'var(--rojo)'];

/**
 * Serie de 14 días contra la franja de tu normal (RF-01-03). Los puntos fuera de la franja
 * cambian de color. Si el indicador usa umbral absoluto, se dibujan sus líneas.
 */
export function Grafica({ ind, historia, normal, nivelHoy, grande = false, dias }: Props) {
  const { idioma } = useT();
  const W = grande ? 520 : 220;
  const H = grande ? 180 : 56;
  const m = grande ? { i: 34, d: 10, a: 12, b: 24 } : { i: 2, d: 6, a: 6, b: 6 };

  const valores = historia.filter((x): x is number => x != null);
  if (valores.length < 2) return <div className="grafica-vacia" style={{ height: H }} />;

  // Líneas de umbral absoluto, solo si quedan cerca de los datos: si no, aplastan la gráfica.
  const candidatas = ind.id === 'glucosa' ? [100, 126] : ind.id === 'presion' ? [130, 140] : ind.id === 'fc' ? [100] : [];
  const rango = Math.max(...valores) - Math.min(...valores) || 1;
  const lineas = candidatas.filter((l) => l <= Math.max(...valores) + rango * 1.5 && l >= Math.min(...valores) - rango * 1.5);

  const extremos = [...valores, ...(normal ? normal.banda : []), ...(grande ? lineas : [])];
  let lo = Math.min(...extremos);
  let hi = Math.max(...extremos);
  const pad = (hi - lo) * 0.15 || 1;
  lo -= pad;
  hi += pad;

  const x = (i: number) => m.i + (i / Math.max(1, historia.length - 1)) * (W - m.i - m.d);
  const y = (v: number) => m.a + (1 - (v - lo) / (hi - lo)) * (H - m.a - m.b);
  const fuera = (v: number) => {
    if (!normal) return false;
    const [a, b] = normal.banda;
    return ind.direccion === 'alto' ? v > b : ind.direccion === 'bajo' ? v < a : v < a || v > b;
  };

  // Línea solo entre puntos consecutivos con dato.
  const tramos: string[] = [];
  let actual = '';
  historia.forEach((v, i) => {
    if (v == null) { if (actual) tramos.push(actual); actual = ''; return; }
    actual += `${actual ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`;
  });
  if (actual) tramos.push(actual);

  const ultimo = historia.length - 1;
  const hoy = historia[ultimo];

  return (
    <svg className={`grafica ${grande ? 'grande' : ''}`} viewBox={`0 0 ${W} ${H}`} role="img"
      aria-label={`${historia.length} días`} preserveAspectRatio="none">
      {normal && (
        <rect x={m.i} width={W - m.i - m.d} y={y(normal.banda[1])} height={Math.max(1, y(normal.banda[0]) - y(normal.banda[1]))}
          className="banda" rx={grande ? 6 : 4} />
      )}
      {normal && grande && <line x1={m.i} x2={W - m.d} y1={y(normal.mediana)} y2={y(normal.mediana)} className="mediana" />}
      {grande && lineas.map((l) => (
        <g key={l}>
          <line x1={m.i} x2={W - m.d} y1={y(l)} y2={y(l)} className="umbral-linea" />
          <text x={W - m.d} y={y(l) - 4} className="eje" textAnchor="end">{l}</text>
        </g>
      ))}
      {tramos.map((d, i) => <path key={i} d={d} className="trazo" />)}
      {historia.map((v, i) => v == null || i === ultimo ? null : (
        <circle key={i} cx={x(i)} cy={y(v)} r={grande ? 3.5 : 2.2} className={fuera(v) ? 'punto fuera' : 'punto'} />
      ))}
      {hoy != null && <circle cx={x(ultimo)} cy={y(hoy)} r={grande ? 6 : 4} fill={COLOR[nivelHoy]} className="punto-hoy" />}
      {grande && (
        <>
          <text x={m.i - 6} y={y(hi - pad) + 4} className="eje" textAnchor="end">{numero(hi - pad, ind.decimales, idioma)}</text>
          <text x={m.i - 6} y={y(lo + pad) + 4} className="eje" textAnchor="end">{numero(lo + pad, ind.decimales, idioma)}</text>
          {dias && [0, Math.floor(ultimo / 2), ultimo].map((i) => (
            <text key={i} x={x(i)} y={H - 6} className="eje" textAnchor={i === 0 ? 'start' : i === ultimo ? 'end' : 'middle'}>{dias[i]}</text>
          ))}
        </>
      )}
    </svg>
  );
}
