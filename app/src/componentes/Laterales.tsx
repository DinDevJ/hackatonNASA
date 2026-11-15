import { EVENTO_DONKI, ambiente, indiceDia, type Tripulante } from '../datos/tripulacion';
import { UI, numero, useT } from '../i18n';
import type { Aviso } from '../logica/estado';
import type { Nivel } from '../logica/semaforo';
import { Semaforo } from './Semaforo';

/** Lo que LUNA vio: avisos de varias señales a la vez (salida del módulo 2). */
export function Avisos({ avisos }: { avisos: Aviso[] }) {
  const { t } = useT();
  return (
    <section className="caja">
      <h2 className="caja-titulo">{t(UI.loQueVio)}</h2>
      {avisos.length === 0 ? <p className="tranquilo"><Semaforo nivel={0} conTexto={false} /> {t(UI.sinAvisos)}</p> : avisos.map((a) => (
        <article key={a.id} className={`aviso nivel-${a.nivel}`}>
          <div className="aviso-cabeza"><Semaforo nivel={a.nivel} conTexto={false} /><strong>{t(a.titulo)}</strong><code>{a.id}</code></div>
          <p>{t(a.detalle)}</p>
        </article>
      ))}
    </section>
  );
}

/** Aviso de clima espacial del día (RF-01-06), con un evento real de DONKI como referencia. */
export function ClimaEspacial({ dia }: { dia: number }) {
  const { t, idioma } = useT();
  const amb = ambiente(dia);
  const activo = amb.tasaDosis > 54;
  return (
    <section className={`caja clima ${activo ? 'activo' : ''}`}>
      <h2 className="caja-titulo">{t(UI.clima)}</h2>
      {activo ? (
        <>
          <Semaforo nivel={2} />
          <p className="clima-grande">{t({ es: 'Evento de partículas solares: ir al refugio', en: 'Solar particle event: go to the shelter' })}</p>
          <p>{numero(amb.tasaDosis, 0, idioma)} µSv/h · {t({ es: 'límite por evento 250 mSv [A]', en: 'per-event limit 250 mSv [A]' })}</p>
        </>
      ) : (
        <>
          <Semaforo nivel={0} />
          <p>{t({ es: 'Sin evento activo.', en: 'No active event.' })} {numero(amb.tasaDosis, 0, idioma)} µSv/h</p>
        </>
      )}
      <p className="pequeno">
        {t({ es: 'Escenario basado en un evento real de DONKI (NASA): ', en: 'Scenario based on a real DONKI (NASA) event: ' })}
        <a href={EVENTO_DONKI.url} target="_blank" rel="noreferrer">{EVENTO_DONKI.hora.slice(0, 10)}</a>
        {t({ es: `, aviso ${EVENTO_DONKI.latenciaMin} min después del evento.`, en: `, alert issued ${EVENTO_DONKI.latenciaMin} min after the event.` })}
      </p>
      <p className="pequeno">{t({ es: 'Dosis de la misión', en: 'Mission dose' })}: {amb.dosisMision} / 600 mSv [A]</p>
    </section>
  );
}

/** Estado contra la meta de la misión (RF-01-07). */
export function Metas({ persona, dia }: { persona: Tripulante; dia: number }) {
  const { t, idioma } = useT();
  const i = indiceDia(dia);
  const filas = [
    { nombre: { es: 'Ejercicio', en: 'Exercise' }, v: persona.metas.ejercicioMin[i] ?? 0, meta: 90, u: 'min', fuente: { es: '[A] ISS 1,5 h/día', en: '[A] ISS 1.5 h/day' } },
    { nombre: { es: 'Agua', en: 'Water' }, v: (persona.metas.aguaMl[i] ?? 0) / 1000, meta: (32 * persona.masaKg) / 1000, u: 'L', fuente: '[A] 32 mL/kg' },
    { nombre: { es: 'Sueño', en: 'Sleep' }, v: persona.serie.sueno[i] ?? 0, meta: 8.5, u: 'h', fuente: { es: 'ventana de 8,5 h', en: '8.5 h window' } },
  ];
  return (
    <section className="caja">
      <h2 className="caja-titulo">{t(UI.metas)}</h2>
      {filas.map((f) => {
        const pct = Math.min(1, f.v / f.meta);
        return (
          <div key={f.u} className="meta">
            <div className="meta-texto">
              <span>{t(f.nombre)}</span>
              <span>{numero(f.v, f.u === 'min' ? 0 : 1, idioma)} / {numero(f.meta, f.u === 'min' ? 0 : 1, idioma)} {f.u}</span>
            </div>
            <div className="barra" role="progressbar" aria-valuenow={Math.round(pct * 100)} aria-valuemin={0} aria-valuemax={100}>
              <span style={{ width: `${pct * 100}%` }} />
            </div>
            <span className="pequeno">{typeof f.fuente === 'string' ? f.fuente : t(f.fuente)}</span>
          </div>
        );
      })}
    </section>
  );
}

/** Ambiente de la cabina contra los límites de NASA-STD-3001 [A]. */
export function Ambiente({ dia }: { dia: number }) {
  const { t, idioma } = useT();
  const a = ambiente(dia);
  const filas: Array<{ n: { es: string; en: string }; v: string; nivel: Nivel; lim: string }> = [
    { n: { es: 'CO₂', en: 'CO₂' }, v: `${numero(a.ppco2, 1, idioma)} mmHg`, nivel: a.ppco2 > 3 ? 1 : 0, lim: '≤ 3' },
    { n: { es: 'Oxígeno', en: 'Oxygen' }, v: `${a.ppo2} mmHg`, nivel: a.ppo2 < 127 ? 2 : 0, lim: '≥ 127' },
    { n: { es: 'Temperatura', en: 'Temperature' }, v: `${numero(a.temp, 1, idioma)} °C`, nivel: a.temp < 18 || a.temp > 27 ? 1 : 0, lim: '18–27' },
    { n: { es: 'Humedad', en: 'Humidity' }, v: `${a.humedad} %`, nivel: 0, lim: '25–75' },
    { n: { es: 'Radiación', en: 'Radiation' }, v: `${numero(a.tasaDosis, 0, idioma)} µSv/h`, nivel: a.tasaDosis >= 3000 ? 2 : a.tasaDosis > 54 ? 1 : 0, lim: '< 54' },
  ];
  return (
    <section className="caja">
      <h2 className="caja-titulo">{t(UI.ambiente)}</h2>
      <ul className="ambiente">
        {filas.map((f) => (
          <li key={f.lim}><Semaforo nivel={f.nivel} conTexto={false} /><span>{t(f.n)}</span><strong>{f.v}</strong><span className="pequeno">[A] {f.lim}</span></li>
        ))}
      </ul>
    </section>
  );
}
