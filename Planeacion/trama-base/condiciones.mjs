/**
 * Condiciones que EVA vigila en vivo a partir de la trama Bluetooth.
 *
 * Recibe paquetes ya decodificados (trama.mjs) y devuelve avisos. No diagnostica:
 * cada aviso dice qué se observó, contra qué umbral y de dónde sale ese umbral
 * ([A] astronautas/NASA · [T] clínico terrestre · tu_normal · propuesta del equipo).
 *
 * Las condiciones de varios días (fatiga, falta de sueño, estrés sostenido) no
 * están aquí: se evalúan con la línea base de 14 días en
 * Planeacion/Diana/viabilidad/reglas_diana.yaml.
 */

export const UMBRAL = {
  spo2_contactar: 92, // [T] propuesta no oficial, catálogo 04:A3
  spo2_urgente: 88,
  ppo2_minimo: 127, // [A] NASA-STD-3001 V2 6003, promedio de 1 h (04:A25)
  ppco2_1h: 3.0, // [A] NASA-STD-3001 V2 6004 (04:A23)
  dosis_tasa_ambar: 54, // [A] 1,3 mSv/día de diseño en espacio libre = 54 µSv/h (01:V91)
  dosis_tasa_refugio: 3000, // [A] alarma del TEPC de la ISS: 5 mrad/min = 3 mGy/h (04:A35), tomando 1 Gy ≈ 1 Sv
  dosis_evento_mSv: 250, // [A] límite por evento solar (01:V93)
  fc_reposo_alta: 100, // [T] (01:V3)
  fc_reposo_baja: 40, // [T]
  ortostatico_delta: 30, // [T] ≥ 30 lpm sostenido > 30 s (01:V48)
  irregular_fraccion: 0.15, // propuesta del equipo: latidos que cambian > 20 % respecto al anterior
  fiebre_delta_piel: 1.0, // propuesta del equipo, sobre tu normal
  fiebre_delta_fc: 10, // propuesta del equipo, sobre tu normal
  temp_cabina: [18, 27], // [A] NASA-STD-3001 V2 6012 (04:A27)
  actividad_reposo: 50, // cuentas/s por debajo de las cuales se considera quieto
  calidad_minima: 50,
};

const mediana = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? (s[(s.length - 1) >> 1] + s[s.length >> 1]) / 2 : null;
};
const media = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

export class Analizador {
  /** @param {{fc_reposo?: number, temp_piel?: number}} lineaBase tu normal; sin ella la regla de fiebre no corre */
  constructor(lineaBase = {}) {
    this.base = lineaBase;
    this.vitales = []; // últimos 180 s
    this.latidos = []; // últimos 60 s: {t, ms}
    this.habitat = []; // última hora
    this.dosisEvento_uSv = 0;
    this.prueba = null; // prueba ortostática en curso
    this.ahora = 0;
  }

  /** Mete un paquete decodificado. */
  ingerir(p) {
    this.ahora = Math.max(this.ahora, p.t);
    if (p.tipo === 'vitales') {
      this.vitales.push(p);
    } else if (p.tipo === 'latidos') {
      for (const ms of p.ibi_ms) this.latidos.push({ t: p.t, ms, valido: p.flags.contacto && !p.flags.movimiento });
    } else if (p.tipo === 'habitat') {
      const previo = this.habitat.at(-1);
      this.habitat.push(p);
      if (previo && p.tasa_dosis != null && p.tasa_dosis > UMBRAL.dosis_tasa_ambar) {
        this.dosisEvento_uSv += (p.tasa_dosis * Math.min(p.t - previo.t, 60)) / 3600;
      } else if (p.tasa_dosis != null && p.tasa_dosis <= UMBRAL.dosis_tasa_ambar) {
        this.dosisEvento_uSv = 0; // el evento terminó
      }
    } else if (p.evento === 'me_pongo_de_pie') {
      const antes = this.#fcValida(30);
      this.prueba = { t0: p.t, fcAntes: antes.length >= 10 ? mediana(antes) : null };
    }
    this.vitales = this.vitales.filter((x) => x.t > this.ahora - 180);
    this.latidos = this.latidos.filter((x) => x.t > this.ahora - 60);
    this.habitat = this.habitat.filter((x) => x.t > this.ahora - 3600);
    return this;
  }

  #ventana(seg) {
    return this.vitales.filter((x) => x.t > this.ahora - seg);
  }

  #buena(x) {
    return x.flags.contacto && !x.flags.movimiento && (x.calidad ?? 0) >= UMBRAL.calidad_minima;
  }

  #fcValida(seg) {
    return this.#ventana(seg).filter((x) => this.#buena(x) && x.fc != null).map((x) => x.fc);
  }

  #enReposo(seg) {
    const a = this.#ventana(seg).map((x) => x.actividad).filter((x) => x != null);
    return a.length > 0 && media(a) < UMBRAL.actividad_reposo;
  }

  /** Devuelve los avisos activos ahora, los más graves primero. */
  evaluar() {
    const avisos = [];
    const aviso = (id, condicion, nivel, mensaje, origen, valor, variables) =>
      avisos.push({ id, condicion, nivel, mensaje, origen, valor, variables });
    const U = UMBRAL;
    const h = this.habitat.at(-1);

    // ---- calidad de la señal: no es clínico, pero sin esto lo demás no vale
    const ult10 = this.#ventana(10);
    if (ult10.length >= 8 && ult10.every((x) => !x.flags.contacto)) {
      aviso('SENSOR-SIN-CONTACTO', 'Sensor sin contacto', 'info', 'El sensor no toca la piel: ajusta la correa. No se evalúan los signos vitales.', 'calidad', null, []);
    }

    // ---- hipoxia: SpO2 baja sostenida 30 s con buena señal
    const spo2 = this.#ventana(30).filter((x) => this.#buena(x) && x.spo2 != null).map((x) => x.spo2);
    if (spo2.length >= 20) {
      const m = mediana(spo2);
      const cabina = h?.ppo2 != null && h.ppo2 < U.ppo2_minimo ? ` El oxígeno de cabina también está bajo (${h.ppo2} mmHg): revisa la cabina, afecta a todos.` : '';
      if (m <= U.spo2_urgente) aviso('HIPOXIA', 'Oxígeno en sangre bajo', 'rojo', `SpO2 ${m} % sostenida 30 s. Urgente.${cabina}`, '[T] propuesta', m, ['04:A3', '04:A25']);
      else if (m <= U.spo2_contactar) aviso('HIPOXIA', 'Oxígeno en sangre bajo', 'ambar', `SpO2 ${m} % sostenida 30 s. Repite con el pulsioxímetro del kit.${cabina}`, '[T] propuesta', m, ['04:A3', '04:A25']);
    }
    if (h?.ppo2 != null && h.ppo2 < U.ppo2_minimo) {
      aviso('CABINA-O2', 'Oxígeno de cabina bajo', 'rojo', `ppO2 ${h.ppo2} mmHg, por debajo de ${U.ppo2_minimo}.`, '[A]', h.ppo2, ['04:A25']);
    }

    // ---- CO2: promedio de la última hora (o de lo que haya, mínimo 1 min)
    const co2 = this.habitat.map((x) => x.ppco2).filter((x) => x != null);
    if (co2.length >= 12) {
      const m = Math.round(media(co2) * 100) / 100;
      if (m > U.ppco2_1h) aviso('CO2-ALTO', 'CO2 de cabina alto', 'ambar', `ppCO2 promedio ${m} mmHg (límite ${U.ppco2_1h} en 1 h). Riesgo de cefalea y peor concentración.`, '[A]', m, ['04:A23', '04:A6']);
    }

    // ---- radiación
    const tasas = this.habitat.slice(-3).map((x) => x.tasa_dosis).filter((x) => x != null);
    const dosis_mSv = Math.round(this.dosisEvento_uSv / 10) / 100;
    if (tasas.length === 3 && tasas.every((x) => x >= U.dosis_tasa_refugio)) {
      aviso('RADIACION', 'Evento de radiación', 'rojo', `Tasa de dosis ${tasas.at(-1)} µSv/h: ir al refugio. Dosis del evento: ${dosis_mSv} mSv de ${U.dosis_evento_mSv}.`, '[A]', tasas.at(-1), ['01:V95', '01:V93']);
    } else if (dosis_mSv >= U.dosis_evento_mSv) {
      aviso('RADIACION', 'Evento de radiación', 'rojo', `Dosis del evento ${dosis_mSv} mSv: supera el límite de ${U.dosis_evento_mSv}.`, '[A]', dosis_mSv, ['01:V93']);
    } else if (tasas.length === 3 && tasas.every((x) => x > U.dosis_tasa_ambar)) {
      aviso('RADIACION', 'Radiación elevada', 'ambar', `Tasa de dosis ${tasas.at(-1)} µSv/h, sobre los ${U.dosis_tasa_ambar} de diseño.`, '[A]', tasas.at(-1), ['01:V95', '01:V91']);
    }

    // ---- ambiente térmico
    if (h?.temp_cabina != null && (h.temp_cabina < U.temp_cabina[0] || h.temp_cabina > U.temp_cabina[1])) {
      aviso('CABINA-TEMP', 'Temperatura de cabina fuera de rango', 'ambar', `${h.temp_cabina} °C (rango ${U.temp_cabina[0]}–${U.temp_cabina[1]}).`, '[A]', h.temp_cabina, ['04:A27']);
    }

    // ---- prueba ortostática: se abre con el botón "me pongo de pie"
    let enPrueba = false;
    if (this.prueba && this.ahora - this.prueba.t0 <= 180) {
      enPrueba = true;
      const { t0, fcAntes } = this.prueba;
      const despues = this.vitales.filter((x) => x.t > t0 && x.fc != null && x.flags.contacto);
      const altos = despues.filter((x) => fcAntes != null && x.fc - fcAntes >= U.ortostatico_delta);
      if (altos.length > 30) {
        const delta = Math.round(mediana(altos.map((x) => x.fc)) - fcAntes);
        aviso('ORTOSTATICO', 'Intolerancia ortostática', 'ambar', `La FC subió ${delta} lpm al ponerte de pie y sigue alta tras 30 s. Siéntate y mide la presión arterial.`, '[T]', delta, ['01:V48', '01:V47']);
      }
    }

    // ---- las tres siguientes solo valen en reposo y con buena señal
    const fc60 = this.#fcValida(60);
    if (fc60.length >= 40 && this.#enReposo(60) && !enPrueba) {
      const fc = mediana(fc60);

      const validos = this.latidos.filter((x) => x.valido).map((x) => x.ms);
      if (validos.length >= 30) {
        let saltos = 0;
        for (let i = 1; i < validos.length; i++) if (Math.abs(validos[i] - validos[i - 1]) > 0.2 * validos[i - 1]) saltos++;
        const frac = saltos / (validos.length - 1);
        if (frac >= U.irregular_fraccion) {
          aviso('RITMO-IRREGULAR', 'Ritmo cardiaco irregular', 'ambar', `${Math.round(frac * 100)} % de los latidos del último minuto son irregulares, en reposo. Registra un ECG; esto no es un diagnóstico.`, 'propuesta', Math.round(frac * 100), ['01:V31', '01:V32']);
        }
      }

      if (fc > U.fc_reposo_alta) aviso('FC-REPOSO-ALTA', 'Frecuencia cardiaca alta en reposo', 'ambar', `${fc} lpm en reposo durante 1 min.`, '[T]', fc, ['04:A4', '01:V3']);
      else if (fc < U.fc_reposo_baja) aviso('FC-REPOSO-BAJA', 'Frecuencia cardiaca baja', 'ambar', `${fc} lpm durante 1 min.`, '[T]', fc, ['04:A4']);

      const piel = this.#ventana(60).filter((x) => x.flags.contacto && x.temp_piel != null).map((x) => x.temp_piel);
      if (this.base.temp_piel != null && this.base.fc_reposo != null && piel.length >= 40) {
        const dT = mediana(piel) - this.base.temp_piel;
        const dFC = fc - this.base.fc_reposo;
        if (dT >= U.fiebre_delta_piel && dFC >= U.fiebre_delta_fc) {
          aviso('POSIBLE-FIEBRE', 'Posible fiebre o infección', 'ambar', `Piel +${dT.toFixed(1)} °C y FC +${Math.round(dFC)} lpm sobre tu normal, en reposo. Tómate la temperatura con el termómetro.`, 'tu_normal · propuesta', Math.round(dT * 10) / 10, ['04:A1', '04:A4', '04:A2']);
        }
      }
    }

    const orden = { rojo: 0, ambar: 1, info: 2 };
    return avisos.sort((a, b) => orden[a.nivel] - orden[b.nivel]);
  }

  /** Dosis acumulada del evento de radiación en curso, en mSv. */
  get dosisEvento_mSv() {
    return this.dosisEvento_uSv / 1000;
  }
}
