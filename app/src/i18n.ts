import { createContext, useContext } from 'react';

export type Idioma = 'es' | 'en';
export interface Texto {
  es: string;
  en: string;
}

export const IdiomaContexto = createContext<Idioma>('es');

/** Devuelve la función `t` para el idioma activo. */
export function useT() {
  const idioma = useContext(IdiomaContexto);
  return { idioma, t: (x: Texto) => x[idioma] };
}

/** Número con coma o punto según el idioma. */
export function numero(v: number, decimales: number, idioma: Idioma): string {
  return v.toLocaleString(idioma === 'es' ? 'es-MX' : 'en-US', {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  });
}

export const UI = {
  panel: { es: 'Mi panel', en: 'My panel' },
  pared: { es: 'Panel de la tripulación', en: 'Crew board' },
  dia: { es: 'Día', en: 'Day' },
  mision: { es: 'Tránsito a Marte', en: 'Transit to Mars' },
  simulado: { es: 'Datos simulados', en: 'Simulated data' },
  sos: { es: 'SOS', en: 'SOS' },
  sosTitulo: { es: 'Emergencia', en: 'Emergency' },
  sosTexto: {
    es: 'Aquí empieza el modo emergencia (módulo 3). En esta vista solo se muestra el botón: siempre visible, un toque, sin confirmación.',
    en: 'This is where emergency mode starts (module 3). This view only shows the button: always visible, one tap, no confirmation.',
  },
  cerrar: { es: 'Cerrar', en: 'Close' },
  tuNormal: { es: 'tu normal', en: 'your normal' },
  porQue: { es: '¿Por qué se mide?', en: 'Why is it measured?' },
  comoSeMide: { es: 'Cómo se mide', en: 'How it is measured' },
  enElEspacio: { es: 'En el espacio', en: 'In space' },
  umbral: { es: 'Umbral', en: 'Threshold' },
  fuente: { es: 'Fuente', en: 'Source' },
  ultimos14: { es: 'Últimos 14 días · la franja es tu normal', en: 'Last 14 days · the band is your normal' },
  cuerpo: { es: 'Cuerpo LUNA', en: 'LUNA body' },
  cuerpoAyuda: { es: 'Toca una parte del cuerpo', en: 'Tap a part of the body' },
  todos: { es: 'Ver todo', en: 'Show all' },
  metas: { es: 'Metas de hoy', en: "Today's goals" },
  clima: { es: 'Clima espacial', en: 'Space weather' },
  ambiente: { es: 'Ambiente de la cabina', en: 'Cabin environment' },
  loQueVio: { es: 'Lo que LUNA vio', en: 'What LUNA noticed' },
  sinAvisos: { es: 'Todo en tu normal. Nada que hacer por ahora.', en: 'Everything within your normal. Nothing to do for now.' },
  sinDato: { es: 'sin dato hoy', en: 'no data today' },
  noEsDiagnostico: { es: 'LUNA avisa, no diagnostica.', en: 'LUNA warns, it does not diagnose.' },
  estimado: { es: 'estimado', en: 'estimated' },
  medido: { es: 'medido', en: 'measured' },
  calculado: { es: 'calculado', en: 'computed' },
  manual: { es: 'anotado a mano', en: 'entered by hand' },
  publico: {
    es: 'Pantalla pública: solo el estado de cada persona, sin números ni motivos.',
    en: 'Public screen: only each person\'s status, no numbers or reasons.',
  },
  idioma: { es: 'English', en: 'Español' },
} satisfies Record<string, Texto>;

export const ESTADO = [
  { es: 'En tu normal', en: 'Within your normal' },
  { es: 'Atención', en: 'Watch' },
  { es: 'Actúa ahora', en: 'Act now' },
] as const satisfies readonly Texto[];
