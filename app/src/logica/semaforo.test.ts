import { describe, expect, it } from 'vitest';

import { INDICADORES } from '../datos/indicadores';
import { TRIPULACION } from '../datos/tripulacion';
import { avisos, estadoGeneral } from './estado';
import { evaluar, tuNormal } from './semaforo';

const base = [60, 61, 59, 60, 62, 58, 60, 61, 59, 60, 61, 60, 59, 62];

describe('tu normal', () => {
  it('necesita al menos 7 días', () => {
    expect(tuNormal(base.slice(0, 6))).toBeNull();
    expect(tuNormal(base)).not.toBeNull();
  });
  it('sin variación (MAD = 0) no hay línea base', () => {
    expect(tuNormal(Array(14).fill(60))).toBeNull();
  });
});

describe('semáforo', () => {
  it('pulso dentro de tu normal: verde', () => {
    expect(evaluar(INDICADORES.fc, 61, base).nivel).toBe(0);
  });
  it('pulso muy por encima de tu normal: ámbar, nunca rojo por tu normal sola', () => {
    const e = evaluar(INDICADORES.fc, 90, base);
    expect(e.nivel).toBe(1);
    expect(e.motivo).toBe('tu_normal');
  });
  it('el rojo lo da un umbral absoluto', () => {
    expect(evaluar(INDICADORES.presion, 150, []).nivel).toBe(2);
  });
  it('la dirección importa: una HRV alta no preocupa', () => {
    const hrv = [60, 62, 58, 61, 59, 63, 60, 57, 61, 60, 62, 59, 60, 61];
    expect(evaluar(INDICADORES.hrv, 80, hrv).nivel).toBe(0);
    expect(evaluar(INDICADORES.hrv, 40, hrv).nivel).toBeGreaterThan(0);
  });
  it('la glucosa usa el umbral ADA [T], sin tu normal', () => {
    expect(evaluar(INDICADORES.glucosa, 95, []).nivel).toBe(0);
    expect(evaluar(INDICADORES.glucosa, 110, []).motivo).toBe('T');
    expect(evaluar(INDICADORES.glucosa, 130, []).nivel).toBe(2);
  });
  it('sin dato, no se inventa un estado', () => {
    expect(evaluar(INDICADORES.fc, null, base)).toMatchObject({ nivel: 0, motivo: null });
  });
});

describe('escenario de la demo', () => {
  const ana = TRIPULACION.find((p) => p.nombre === 'Ana')!;
  it('Ana: FATIGA-03 el día 112, no antes, y verde el 114', () => {
    expect(avisos(ana, 111).map((a) => a.id)).toEqual([]);
    expect(avisos(ana, 112).map((a) => a.id)).toEqual(['FATIGA-03']);
    expect(estadoGeneral(ana, 112)).toBe(1);
    expect(estadoGeneral(ana, 114)).toBe(0);
  });
  it('Tomás y Mei en verde todos los días con línea base', () => {
    for (const nombre of ['Tomás', 'Mei']) {
      const p = TRIPULACION.find((x) => x.nombre === nombre)!;
      for (let d = 106; d <= 115; d++) expect(estadoGeneral(p, d), `${nombre} día ${d}`).toBe(0);
    }
  });
  it('Luis en ámbar por presión [T]', () => {
    const luis = TRIPULACION.find((x) => x.nombre === 'Luis')!;
    expect(estadoGeneral(luis, 112)).toBe(1);
  });
});
