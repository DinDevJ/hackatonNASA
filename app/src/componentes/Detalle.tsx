import { useEffect, useRef } from 'react';

import { INDICADORES, unidad, type IdIndicador } from '../datos/indicadores';
import { type Tripulante } from '../datos/tripulacion';
import { UI, numero, useT, type Texto } from '../i18n';
import { estadoIndicador } from '../logica/estado';
import { EtiquetaProcedencia, EtiquetaUmbral } from './Etiquetas';
import { Grafica } from './Grafica';
import { Semaforo } from './Semaforo';
import { valorTexto } from './Tarjeta';

interface Props {
  titulo: Texto;
  ids: IdIndicador[];
  persona: Tripulante;
  dia: number;
  onCerrar: () => void;
}

/** Cajón lateral (laptop) u hoja inferior (celular) con el detalle de uno o varios indicadores. */
export function Detalle({ titulo, ids, persona, dia, onCerrar }: Props) {
  const { t, idioma } = useT();
  const cerrar = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cerrar.current?.focus();
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && onCerrar();
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [onCerrar]);

  return (
    <div className="velo" onClick={onCerrar}>
      <aside className="cajon" role="dialog" aria-modal="true" aria-label={t(titulo)} onClick={(e) => e.stopPropagation()}>
        <header className="cajon-cabeza">
          <h2>{t(titulo)}</h2>
          <button ref={cerrar} className="boton-icono" onClick={onCerrar} aria-label={t(UI.cerrar)}>✕</button>
        </header>
        {ids.map((id) => {
          const ind = INDICADORES[id];
          const e = estadoIndicador(persona, id, dia);
          const dias = Array.from({ length: e.historia.length }, (_, i) => dia - e.historia.length + 1 + i);
          return (
            <section key={id} className="detalle">
              <div className="detalle-cabeza">
                <div>
                  <h3>{t(ind.nombre)}</h3>
                  <span className="variable">{ind.variable}</span>
                </div>
                <Semaforo nivel={e.nivel} />
              </div>
              <div className="detalle-valor">
                <strong>{valorTexto(persona, e, dia, idioma)}</strong> <span className="unidad">{unidad(ind, idioma)}</span>
                {e.normal && (
                  <span className="detalle-normal">
                    {t(UI.tuNormal)}: {numero(e.normal.banda[0], ind.decimales, idioma)}–{numero(e.normal.banda[1], ind.decimales, idioma)}
                  </span>
                )}
              </div>
              <div className="fila-etiquetas"><EtiquetaProcedencia ind={ind} /><EtiquetaUmbral ind={ind} ev={e} /></div>
              <Grafica ind={ind} historia={e.historia} normal={e.normal} nivelHoy={e.nivel} grande dias={dias} />
              <p className="nota-grafica">{t(UI.ultimos14)}</p>
              <dl className="explica">
                <dt>{t(UI.porQue)}</dt><dd>{t(ind.porQue)}</dd>
                <dt>{t(UI.comoSeMide)}</dt><dd>{t(ind.comoSeMide)}</dd>
                <dt>{t(UI.enElEspacio)}</dt><dd>{t(ind.enElEspacio)}</dd>
                {ind.absoluto && (
                  <>
                    <dt>{t(UI.umbral)} [{ind.absoluto.tipo}]</dt>
                    <dd>
                      {t(ind.absoluto.texto)}.{' '}
                      {ind.absoluto.fuente.url
                        ? <a href={ind.absoluto.fuente.url} target="_blank" rel="noreferrer">{ind.absoluto.fuente.nombre}</a>
                        : ind.absoluto.fuente.nombre}
                    </dd>
                  </>
                )}
                {ind.contraTuNormal && (
                  <>
                    <dt>{t(UI.umbral)} · {t(UI.tuNormal)}</dt>
                    <dd>{t({
                      es: 'Tus 14 días anteriores. Ámbar si te alejas 2 veces tu variación habitual en la dirección que preocupa. Alejarte de tu normal pide atención; el rojo solo lo da un umbral clínico o de NASA.',
                      en: 'Your previous 14 days. Amber if you move 2 times your usual variation in the worrying direction. Leaving your normal calls for attention; only a clinical or NASA threshold turns it red.',
                    })}</dd>
                  </>
                )}
              </dl>
            </section>
          );
        })}
        <p className="pie-cajon">{t(UI.noEsDiagnostico)} · {t(UI.simulado)}</p>
      </aside>
    </div>
  );
}
