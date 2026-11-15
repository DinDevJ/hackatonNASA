import { TRIPULACION } from '../datos/tripulacion';
import { ESTADO, UI, useT } from '../i18n';
import { estadoGeneral } from '../logica/estado';
import { Ambiente, ClimaEspacial } from './Laterales';
import { Forma, claseNivel } from './Semaforo';

/**
 * Panel de pared (RF-01-05): pantalla pública de la laptop. Solo ●■▲ de cada persona y el
 * ambiente. Sin números ni motivos de salud (matriz de privacidad, módulo 6).
 */
export function PanelPared({ dia, onAbrir }: { dia: number; onAbrir: (id: string) => void }) {
  const { t } = useT();
  return (
    <div className="pared">
      <p className="aviso-publico">{t(UI.publico)}</p>
      <div className="pared-tripulacion">
        {TRIPULACION.map((p) => {
          const n = estadoGeneral(p, dia);
          return (
            <button key={p.id} className={`persona-pared ${claseNivel(n)}`} onClick={() => onAbrir(p.id)}>
              <span className="avatar" style={{ background: p.color }}>{p.nombre[0]}</span>
              <span className="persona-nombre">{p.nombre}</span>
              <span className="persona-rol">{t(p.rol)} · {p.id}</span>
              <span className="persona-estado"><Forma nivel={n} tam={34} /><span>{t(ESTADO[n])}</span></span>
            </button>
          );
        })}
      </div>
      <div className="pared-ambiente">
        <ClimaEspacial dia={dia} />
        <Ambiente dia={dia} />
      </div>
    </div>
  );
}
