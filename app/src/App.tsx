import { useCallback, useMemo, useState } from 'react';

import { Cuerpo, REGIONES } from './componentes/Cuerpo';
import { Detalle } from './componentes/Detalle';
import { Avisos, ClimaEspacial, Metas } from './componentes/Laterales';
import { Luna } from './componentes/Luna';
import { PanelPared } from './componentes/PanelPared';
import { Semaforo } from './componentes/Semaforo';
import { Tarjeta } from './componentes/Tarjeta';
import { INDICADORES, ORDEN, type IdIndicador, type Region } from './datos/indicadores';
import { DIAS, TRIPULACION } from './datos/tripulacion';
import { IdiomaContexto, UI, type Idioma, type Texto } from './i18n';
import { avisos as calcularAvisos, estadoGeneral, estadoIndicador } from './logica/estado';
import type { Nivel } from './logica/semaforo';

type Vista = 'panel' | 'pared';

function leer<T extends string>(clave: string, valido: readonly T[], porDefecto: T): T {
  try {
    const v = localStorage.getItem(clave) as T | null;
    return v && valido.includes(v) ? v : porDefecto;
  } catch {
    return porDefecto;
  }
}
function guardar(clave: string, v: string) {
  try { localStorage.setItem(clave, v); } catch { /* sin almacenamiento: no pasa nada */ }
}

export function App() {
  const [idioma, setIdioma] = useState<Idioma>(() => leer('luna.idioma', ['es', 'en'] as const, 'es'));
  const [vista, setVista] = useState<Vista>('panel');
  const [personaId, setPersonaId] = useState('MS-2');
  const [dia, setDia] = useState(112);
  const [region, setRegion] = useState<Region | null>(null);
  const [detalle, setDetalle] = useState<{ titulo: Texto; ids: IdIndicador[] } | null>(null);
  const [sos, setSos] = useState(false);

  const t = (x: Texto) => x[idioma];
  const persona = TRIPULACION.find((p) => p.id === personaId) ?? TRIPULACION[1]!;
  const estados = useMemo(() => ORDEN.map((id) => estadoIndicador(persona, id, dia)), [persona, dia]);
  const hrv = useMemo(() => estadoIndicador(persona, 'hrv', dia), [persona, dia]);
  const avisos = useMemo(() => calcularAvisos(persona, dia), [persona, dia]);
  const general: Nivel = estadoGeneral(persona, dia);

  const niveles = useMemo(() => {
    const r: Record<Region, Nivel[]> = { cabeza: [], corazon: [], brazo: [], abdomen: [] };
    for (const e of [...estados, hrv]) r[INDICADORES[e.id].region].push(e.nivel);
    for (const a of avisos) for (const s of a.senales) r[INDICADORES[s].region].push(a.nivel);
    return r;
  }, [estados, hrv, avisos]);

  const elegirRegion = (r: Region | null) => {
    setRegion(r);
    if (r) {
      const ids = (Object.keys(INDICADORES) as IdIndicador[]).filter((id) => INDICADORES[id].region === r);
      setDetalle({ titulo: REGIONES[r].nombre, ids });
    }
  };
  const cerrarDetalle = useCallback(() => setDetalle(null), []);
  const cambiarIdioma = () => {
    const nuevo = idioma === 'es' ? 'en' : 'es';
    setIdioma(nuevo);
    guardar('luna.idioma', nuevo);
    document.documentElement.lang = nuevo;
  };

  return (
    <IdiomaContexto.Provider value={idioma}>
      <div className="app">
        <header className="cabecera">
          <div className="marca">
            <Luna nivel={vista === 'panel' ? general : 0} />
            <div>
              <strong>LUNA</strong>
              <span>{t(UI.mision)} · {t(UI.dia)} {dia}</span>
            </div>
          </div>
          <nav className="pestanas" aria-label="Vista">
            <button className={vista === 'panel' ? 'activa' : ''} onClick={() => setVista('panel')}>{t(UI.panel)}</button>
            <button className={vista === 'pared' ? 'activa' : ''} onClick={() => setVista('pared')}>{t(UI.pared)}</button>
          </nav>
          <div className="acciones">
            <button className="boton-idioma" onClick={cambiarIdioma}>{t(UI.idioma)}</button>
            <button className="sos" onClick={() => setSos(true)} aria-label={t(UI.sosTitulo)}>{t(UI.sos)}</button>
          </div>
        </header>

        <div className="demo-barra">
          <span className="sello">{t(UI.simulado)}</span>
          <label>
            {t(UI.dia)} <strong>{dia}</strong>
            <input type="range" min={DIAS[7]} max={DIAS[DIAS.length - 1]} value={dia} onChange={(e) => setDia(Number(e.target.value))} />
          </label>
          {vista === 'panel' && (
            <div className="selector-persona" role="radiogroup" aria-label="Tripulante">
              {TRIPULACION.map((p) => (
                <button key={p.id} role="radio" aria-checked={p.id === personaId} className={p.id === personaId ? 'activa' : ''}
                  onClick={() => { setPersonaId(p.id); setRegion(null); }}>
                  <span className="punto-color" style={{ background: p.color }} />{p.nombre}
                </button>
              ))}
            </div>
          )}
        </div>

        {vista === 'pared' ? (
          <PanelPared dia={dia} onAbrir={(id) => { setPersonaId(id); setVista('panel'); }} />
        ) : (
          <main className="panel">
            <section className="saludo">
              <div>
                <h1>{t({ es: `Hola, ${persona.nombre}`, en: `Hi, ${persona.nombre}` })}</h1>
                <p>{t(persona.rol)} · {persona.id}</p>
              </div>
              <Semaforo nivel={general} />
            </section>

            <aside className="col-cuerpo">
              <section className="caja">
                <h2 className="caja-titulo">{t(UI.cuerpo)}</h2>
                <Cuerpo niveles={niveles} activa={region} onElegir={elegirRegion} />
              </section>
              <Avisos avisos={avisos} />
            </aside>

            <section className="col-tarjetas" aria-label="Indicadores">
              {estados.map((e) => (
                <Tarjeta key={e.id} persona={persona} estado={e} dia={dia}
                  resaltada={region != null && INDICADORES[e.id].region === region}
                  atenuada={region != null && INDICADORES[e.id].region !== region}
                  onAbrir={() => setDetalle({ titulo: INDICADORES[e.id].nombre, ids: e.id === 'fc' ? ['fc', 'hrv'] : [e.id] })} />
              ))}
            </section>

            <aside className="col-lateral">
              <ClimaEspacial dia={dia} />
              <Metas persona={persona} dia={dia} />
            </aside>
          </main>
        )}

        <footer className="pie">
          {t({ es: 'Proyecto para NASA Space Apps Challenge 2026 · Equipo Monarcas', en: 'Project for NASA Space Apps Challenge 2026 · Team Monarcas' })}
          {' · '}{t(UI.noEsDiagnostico)}
        </footer>

        {detalle && vista === 'panel' && (
          <Detalle titulo={detalle.titulo} ids={detalle.ids} persona={persona} dia={dia} onCerrar={() => { cerrarDetalle(); setRegion(null); }} />
        )}
        {sos && (
          <div className="velo" onClick={() => setSos(false)}>
            <div className="dialogo-sos" role="alertdialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
              <h2>{t(UI.sosTitulo)}</h2>
              <p>{t(UI.sosTexto)}</p>
              <button className="boton-primario" onClick={() => setSos(false)} autoFocus>{t(UI.cerrar)}</button>
            </div>
          </div>
        )}
      </div>
    </IdiomaContexto.Provider>
  );
}
