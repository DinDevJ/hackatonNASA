import { INDICADORES, unidad } from '../datos/indicadores';
import { indiceDia, type Tripulante } from '../datos/tripulacion';
import { UI, numero, useT } from '../i18n';
import type { EstadoIndicador } from '../logica/estado';
import { EtiquetaProcedencia, EtiquetaUmbral } from './Etiquetas';
import { Grafica } from './Grafica';
import { Semaforo, claseNivel } from './Semaforo';

interface Props {
  persona: Tripulante;
  estado: EstadoIndicador;
  dia: number;
  resaltada: boolean;
  atenuada: boolean;
  onAbrir: () => void;
}

/** Valor formateado. La presión lleva la diastólica. */
export function valorTexto(persona: Tripulante, e: EstadoIndicador, dia: number, idioma: 'es' | 'en') {
  const ind = INDICADORES[e.id];
  const v = e.valor ?? e.ultimo?.valor ?? null;
  if (v == null) return '–';
  if (e.id === 'presion') {
    const d = persona.diastolica[indiceDia(e.valor != null ? dia : e.ultimo!.dia)];
    return `${v}/${d ?? '–'}`;
  }
  return numero(v, ind.decimales, idioma);
}

export function Tarjeta({ persona, estado, dia, resaltada, atenuada, onAbrir }: Props) {
  const { t, idioma } = useT();
  const ind = INDICADORES[estado.id];
  const viejo = estado.valor == null && estado.ultimo;
  return (
    <button className={`tarjeta ${claseNivel(estado.nivel)} ${resaltada ? 'resaltada' : ''} ${atenuada ? 'atenuada' : ''}`}
      onClick={onAbrir} aria-label={`${t(ind.nombre)}: ${valorTexto(persona, estado, dia, idioma)} ${unidad(ind, idioma)}`}>
      <div className="tarjeta-cabeza">
        <span className="tarjeta-nombre">{t(ind.corto)}</span>
        <Semaforo nivel={estado.nivel} conTexto={false} />
      </div>
      <div className="tarjeta-valor">
        <strong>{valorTexto(persona, estado, dia, idioma)}</strong>
        <span className="unidad">{unidad(ind, idioma)}</span>
      </div>
      <div className="tarjeta-sub">
        {viejo ? <span className="viejo">{t(UI.dia)} {estado.ultimo!.dia}</span> : <EtiquetaProcedencia ind={ind} />}
        <EtiquetaUmbral ind={ind} ev={estado} />
      </div>
      <Grafica ind={ind} historia={estado.historia} normal={estado.normal} nivelHoy={estado.nivel} />
      <span className="tarjeta-porque">{t(UI.porQue)} →</span>
    </button>
  );
}
