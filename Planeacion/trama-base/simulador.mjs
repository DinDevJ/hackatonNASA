/**
 * Simulador del hardware en JavaScript: produce los mismos bytes que el ESP32
 * (firmware/eva_sim/eva_sim.ino), con los mismos escenarios y los mismos números.
 *
 * Sirve para las pruebas y para ver el monitor sin tener la placa.
 */
import { ESCENARIO, EVENTO, FLAG, codificarEvento, codificarHabitat, codificarLatidos, codificarVitales } from './trama.mjs';

/** Valor objetivo de cada señal por escenario. Lo que no aparece queda en nominal. */
export const OBJETIVO = {
  nominal: { fc: 62, spo2: 97.5, fr: 14, temp_piel: 33.6, actividad: 5, ppco2: 2.0, ppo2: 150, temp_cabina: 22.5, humedad: 45, tasa_dosis: 20, ruido: 58, lux: 300 },
  fiebre: { fc: 84, fr: 20, temp_piel: 35.1 },
  evento_solar: { tasa_dosis: 6000 },
  co2_alto: { ppco2: 5.2 },
  hipoxia: { spo2: 86, fc: 96, fr: 22, ppo2: 118 },
  ortostatico: { fc: 99 },
  arritmia: {},
  sin_contacto: {},
};

function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Simulador {
  constructor({ t0 = 1_805_000_000, semilla = 42, relojSincronizado = true } = {}) {
    this.t = t0;
    this.seq = 0;
    this.rnd = mulberry32(semilla);
    this.sinc = relojSincronizado;
    this.v = { ...OBJETIVO.nominal }; // valores actuales, que se acercan al objetivo
    this.escenario = 'nominal';
    this.pendienteEvento = null;
    this.restoLatido = 0;
  }

  cambiar(escenario) {
    this.escenario = typeof escenario === 'number' ? Object.keys(ESCENARIO).find((k) => ESCENARIO[k] === escenario) : escenario;
    if (this.escenario === 'ortostatico') this.pendienteEvento = EVENTO.me_pongo_de_pie;
    return this;
  }

  #ruido(amplitud) {
    return (this.rnd() * 2 - 1) * amplitud;
  }

  /** Avanza un segundo y devuelve los paquetes de ese segundo (Uint8Array[]). */
  paso() {
    this.t += 1;
    const obj = { ...OBJETIVO.nominal, ...OBJETIVO[this.escenario] };
    const tau = this.escenario === 'ortostatico' ? 4 : 8; // segundos para llegar al objetivo
    for (const k of Object.keys(obj)) this.v[k] += (obj[k] - this.v[k]) / tau;

    const sinContacto = this.escenario === 'sin_contacto';
    const flags = (sinContacto ? 0 : FLAG.contacto) | (this.sinc ? FLAG.relojSincronizado : 0) | FLAG.simulado;
    const cab = () => ({ flags, seq: this.seq++, t: this.t });
    const out = [];

    if (this.pendienteEvento) {
      out.push(codificarEvento({ ...cab(), evento: this.pendienteEvento }));
      this.pendienteEvento = null;
    }

    // latidos: se generan los que caben en este segundo
    const ibi = [];
    if (!sinContacto) {
      let libre = 1000 + this.restoLatido;
      for (;;) {
        const base = 60000 / this.v.fc;
        const ms = this.escenario === 'arritmia'
          ? 450 + this.rnd() * 700
          : base * (1 + 0.04 * Math.sin((2 * Math.PI * this.t * this.v.fr) / 60) + this.#ruido(0.015));
        if (ms > libre || ibi.length === 5) { this.restoLatido = libre; break; }
        ibi.push(Math.round(ms));
        libre -= ms;
      }
    }
    const fcMedida = this.escenario === 'arritmia' && ibi.length ? 60000 / (ibi.reduce((a, b) => a + b, 0) / ibi.length) : this.v.fc + this.#ruido(1.5);

    out.push(codificarVitales({
      ...cab(),
      fc: sinContacto ? null : fcMedida,
      spo2: sinContacto ? null : this.v.spo2 + this.#ruido(0.5),
      fr: sinContacto ? null : this.v.fr + this.#ruido(0.5),
      temp_piel: sinContacto ? null : this.v.temp_piel + this.#ruido(0.05),
      actividad: Math.max(0, this.v.actividad + this.#ruido(3)),
      postura: this.escenario === 'ortostatico' ? 3 : 2,
      pasos: 0,
      calidad: sinContacto ? 0 : 90,
      bateria: 87,
    }));
    if (ibi.length) out.push(codificarLatidos({ ...cab(), ibi_ms: ibi }));

    if (this.t % 5 === 0) {
      out.push(codificarHabitat({
        flags: (this.sinc ? FLAG.relojSincronizado : 0) | FLAG.simulado, seq: this.seq++, t: this.t,
        ppco2: this.v.ppco2 + this.#ruido(0.05), ppo2: this.v.ppo2 + this.#ruido(0.5),
        temp_cabina: this.v.temp_cabina + this.#ruido(0.1), humedad: this.v.humedad + this.#ruido(1),
        tasa_dosis: Math.max(0, this.v.tasa_dosis * (1 + this.#ruido(0.05))), ruido: this.v.ruido + this.#ruido(1),
        lux: this.v.lux + this.#ruido(10),
      }));
    }
    return out;
  }

  /** Corre `segundos` y devuelve todos los paquetes. */
  correr(segundos) {
    const out = [];
    for (let i = 0; i < segundos; i++) out.push(...this.paso());
    return out;
  }
}
