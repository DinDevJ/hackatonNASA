/* LUNA — avatar con forma de luna. Su FASE refleja los signos vitales de la persona:
 *   luna llena  = todo en su normal · menguante = algo se aleja de su normal · luna nueva = emergencia.
 * Encima de la luna se dibuja su carita (emociones) o un icono de estado (radiación, latido, escaneo).
 * Sin manos ni pies. SVG puro, sin dependencias.
 * Uso: const l = LUNA.crear(el, { cara, accesorio, tam, fase }); l.poner("feliz"); LUNA.ponerFase(0.4); */
(function () {
  "use strict";

  const CARAS = {
    feliz: { ojos: '<path d="M40 66 q6 -7 12 0" class="trazo"/><path d="M68 66 q6 -7 12 0" class="trazo"/>', boca: '<path d="M50 80 q10 9 20 0" class="trazo"/>' },
    tranquila: { ojos: '<rect x="42" y="60" width="8" height="10" rx="4" class="ojo"/><rect x="70" y="60" width="8" height="10" rx="4" class="ojo"/>', boca: '<path d="M53 81 q7 5 14 0" class="trazo"/>' },
    dormida: {
      ojos: '<path d="M40 67 q6 4 12 0" class="trazo"/><path d="M68 67 q6 4 12 0" class="trazo"/>',
      boca: '<path d="M56 83 h8" class="trazo"/>',
      extra: '<text x="86" y="34" class="zzz">z</text><text x="94" y="26" class="zzz zzz-2">z</text>',
    },
    preocupada: {
      cejas: '<path d="M40 57 q6 -1 11 -4" class="trazo fino"/><path d="M80 57 q-6 -1 -11 -4" class="trazo fino"/>',
      ojos: '<rect x="42" y="61" width="8" height="9" rx="4" class="ojo"/><rect x="70" y="61" width="8" height="9" rx="4" class="ojo"/>',
      boca: '<path d="M51 84 q4.5 -4 9 0 q4.5 4 9 0" class="trazo"/>',
    },
    empatica: {
      // Cejas que SUBEN hacia el centro: tristeza o cariño (si bajaran, se leería como enojo).
      cejas: '<path d="M40 58 q6 -1 11 -5" class="trazo fino"/><path d="M80 58 q-6 -1 -11 -5" class="trazo fino"/>',
      ojos: '<rect x="42" y="62" width="8" height="9" rx="4" class="ojo"/><rect x="70" y="62" width="8" height="9" rx="4" class="ojo"/>',
      boca: '<path d="M52 86 q8 -6 16 0" class="trazo"/>',
      extra: '<path d="M78 74 q2.2 3.4 0 5.2 q-2.2 -1.8 0 -5.2z" class="lagrima"/>',
    },
    energia: {
      cejas: '<path d="M40 55 q5.5 -2 11 0" class="trazo fino"/><path d="M80 55 q-5.5 -2 -11 0" class="trazo fino"/>',
      ojos: '<rect x="42" y="60" width="8" height="10" rx="4" class="ojo"/><rect x="70" y="60" width="8" height="10" rx="4" class="ojo"/>',
      boca: '<path d="M49 78 h22 q-1 10 -11 10 q-10 0 -11 -10z" class="boca-llena"/>',
    },
    alerta: {
      ojos: '<circle cx="46" cy="65" r="5.6" class="ojo"/><circle cx="74" cy="65" r="5.6" class="ojo"/>',
      boca: '<rect x="55" y="80" width="10" height="8" rx="4" class="boca-llena"/>',
      extra: '<path d="M100 30 v8 M100 42 v.5" class="trazo alerta-color"/>',
    },
    pensando: {
      ojos: '<rect x="44" y="58" width="8" height="10" rx="4" class="ojo"/><rect x="72" y="58" width="8" height="10" rx="4" class="ojo"/>',
      boca: '<path d="M54 83 h12" class="trazo"/>',
      extra: '<g class="cargando"><circle cx="92" cy="30" r="2"/><circle cx="98" cy="25" r="2"/><circle cx="104" cy="20" r="2"/></g>',
    },
    celebra: {
      ojos: '<path d="M46 58 l1.8 4.2 4.4.4 -3.4 3 1 4.4 -3.8 -2.4 -3.8 2.4 1 -4.4 -3.4 -3 4.4 -.4z" class="estrella-ojo"/><path d="M74 58 l1.8 4.2 4.4.4 -3.4 3 1 4.4 -3.8 -2.4 -3.8 2.4 1 -4.4 -3.4 -3 4.4 -.4z" class="estrella-ojo"/>',
      boca: '<path d="M48 78 h24 q-1.5 11 -12 11 q-10.5 0 -12 -11z" class="boca-llena"/>',
      extra: '<path d="M10 30 l1.6 4 4 1.6 -4 1.6 -1.6 4 -1.6 -4 -4 -1.6 4 -1.6z" class="chispa"/><path d="M108 22 l1.2 3 3 1.2 -3 1.2 -1.2 3 -1.2 -3 -3 -1.2 3 -1.2z" class="chispa"/>',
    },
    rica: { ojos: '<path d="M40 66 q6 -7 12 0" class="trazo"/><path d="M68 66 q6 -7 12 0" class="trazo"/>', boca: '<path d="M50 79 q10 9 20 0" class="trazo"/><path d="M63 83 q4 5 7 0" class="lengua-llena"/>' },
    amor: {
      ojos: '<path d="M46 71 l-5.4 -5.4 a3.2 3.2 0 0 1 5.4 -3.6 a3.2 3.2 0 0 1 5.4 3.6z" class="corazon-ojo"/><path d="M74 71 l-5.4 -5.4 a3.2 3.2 0 0 1 5.4 -3.6 a3.2 3.2 0 0 1 5.4 3.6z" class="corazon-ojo"/>',
      boca: '<path d="M52 81 q8 7 16 0" class="trazo"/>',
    },
    // ---- Iconos de estado en lugar de cara ----
    radiacion: {
      ojos: '<g class="sol"><circle cx="60" cy="68" r="9" class="sol-centro"/>' +
        [0, 45, 90, 135, 180, 225, 270, 315].map((a) => `<path d="M60 53 v-5" class="trazo rayo" transform="rotate(${a} 60 68)"/>`).join("") + "</g>",
      boca: "",
      extra: '<path d="M90 92 l6 -10 6 10z" class="aviso-tri"/><path d="M96 86 v2.6 M96 90.4 v.2" class="trazo aviso-signo"/>',
    },
    latido: { ojos: '<path d="M22 70 h18 l4 -9 5 18 5 -24 5 22 4 -7 h33" class="trazo ecg"/>', boca: "" },
    escaneo: {
      ojos: '<rect x="42" y="61" width="8" height="9" rx="4" class="ojo"/><rect x="70" y="61" width="8" height="9" rx="4" class="ojo"/>',
      boca: '<path d="M54 82 h12" class="trazo"/>',
      extra: '<rect x="14" y="26" width="92" height="3" rx="1.5" class="barrido"/>',
    },
  };

  const ACCESORIOS = {
    corazon: '<path d="M12 21s-7-4.4-9.3-8.4C1 9.4 2.6 5.6 6.4 5.1c2.2-.3 3.9 1 5.6 2.9 1.7-1.9 3.4-3.2 5.6-2.9 3.8.5 5.4 4.3 3.7 7.5C19 16.6 12 21 12 21z" fill="#FF6FA8"/>',
    luna: '<path d="M15.5 3.5a8.5 8.5 0 1 0 5 15.4A7 7 0 0 1 15.5 3.5z" fill="#FFD66B"/>',
    manzana: '<path d="M12 7c-1-2.6-3.6-3-3.6-3s.4 2.4 3.6 3z" fill="#5BC48A"/><path d="M12 7.6c-2.2-1.5-6.6-1.2-7.4 3.4-.7 4 2 9.8 5 9.8 1 0 1.5-.5 2.4-.5s1.4.5 2.4.5c3 0 5.7-5.8 5-9.8-.8-4.6-5.2-4.9-7.4-3.4z" fill="#FF6F91"/>',
    gota: '<path d="M12 3s6 6.8 6 11a6 6 0 0 1-12 0c0-4.2 6-11 6-11z" fill="#4FD2E9"/><circle cx="10" cy="14" r="1.6" fill="#fff" opacity=".8"/>',
    curita: '<rect x="3" y="8" width="18" height="8" rx="4" transform="rotate(-30 12 12)" fill="#FFC48A"/><rect x="9" y="9.5" width="6" height="5" rx="1" transform="rotate(-30 12 12)" fill="#FFE2C4"/>',
    pesa: '<rect x="5" y="10.5" width="14" height="3" rx="1.5" fill="#8A8FB0"/><rect x="2" y="7" width="4" height="10" rx="2" fill="#B541FA"/><rect x="18" y="7" width="4" height="10" rx="2" fill="#B541FA"/>',
    estrella: '<path d="M12 2.5l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.3l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8z" fill="#FFD66B"/>',
    sol: '<circle cx="12" cy="12" r="5" fill="#FFB547"/><g stroke="#FFB547" stroke-width="2" stroke-linecap="round"><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/></g>',
    sos: '<circle cx="12" cy="12" r="10" fill="#E5484D"/><path d="M12 7v6M12 16.5v.5" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>',
  };

  const CX = 60, CY = 70, R = 50;

  /** Trazo de la parte iluminada. k = fracción iluminada (0 nueva … 1 llena), creciente desde la derecha. */
  function iluminada(k) {
    const f = Math.max(0, Math.min(1, k));
    if (f >= 0.995) return `M${CX} ${CY - R} a${R} ${R} 0 1 1 0 ${2 * R} a${R} ${R} 0 1 1 0 ${-2 * R}z`;
    if (f <= 0.005) return "";
    const rx = Math.abs(1 - 2 * f) * R;
    const barrido = f > 0.5 ? 1 : 0; // >0.5: el terminador se abomba hacia la izquierda (gibosa)
    return `M${CX} ${CY - R} A${R} ${R} 0 0 1 ${CX} ${CY + R} A${rx.toFixed(2)} ${R} 0 0 ${barrido} ${CX} ${CY - R}z`;
  }

  /** Color del halo según la fase: cian (bien) → ámbar → rojo (emergencia). */
  function tono(k) {
    if (k >= 0.7) return "bien";
    if (k >= 0.35) return "ojo";
    return "critico";
  }

  let n = 0;
  let faseGlobal = 1;
  const vivas = new Set();

  function svg(cara, accesorio, k) {
    const id = "luna" + ++n;
    const c = CARAS[cara] || CARAS.tranquila;
    const acc = accesorio && ACCESORIOS[accesorio]
      ? `<g class="luna-acc"><g transform="translate(92 100) scale(1.1)">${ACCESORIOS[accesorio]}</g></g>` : "";
    return `
<svg class="luna-svg tono-${tono(k)}" viewBox="0 0 120 140" role="img" aria-label="Luna ${cara}, fase ${Math.round(k * 100)} % iluminada">
  <defs>
    <radialGradient id="${id}-halo" cx=".5" cy=".5" r=".5">
      <stop offset=".62" class="halo-a"/><stop offset="1" class="halo-b"/>
    </radialGradient>
    <radialGradient id="${id}-noche" cx=".4" cy=".35" r=".75">
      <stop offset="0" stop-color="#A9A2E6"/><stop offset="1" stop-color="#7A71CC"/>
    </radialGradient>
    <radialGradient id="${id}-dia" cx=".38" cy=".32" r=".8">
      <stop offset="0" stop-color="#FFFFFF"/><stop offset=".6" stop-color="#FBF6FF"/><stop offset="1" stop-color="#E9E0FF"/>
    </radialGradient>
    <clipPath id="${id}-disco"><circle cx="${CX}" cy="${CY}" r="${R}"/></clipPath>
  </defs>
  <circle cx="${CX}" cy="${CY}" r="${R + 12}" fill="url(#${id}-halo)" class="luna-halo"/>
  <g class="luna-cuerpo">
    <circle cx="${CX}" cy="${CY}" r="${R}" fill="url(#${id}-noche)"/>
    <path d="${iluminada(k)}" fill="url(#${id}-dia)" class="luna-luz"/>
    <g clip-path="url(#${id}-disco)" class="crateres">
      <circle cx="34" cy="44" r="7"/><circle cx="84" cy="100" r="9"/><circle cx="92" cy="50" r="4.5"/><circle cx="30" cy="96" r="4"/>
    </g>
    <circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="#C9C0F5" stroke-width="1.4"/>
    <circle cx="36" cy="84" r="4" class="mejilla"/><circle cx="84" cy="84" r="4" class="mejilla"/>
    <g class="luna-cara">${c.cejas || ""}<g class="luna-ojos">${c.ojos}</g>${c.boca}${c.extra || ""}</g>
  </g>
  ${acc}
</svg>`;
  }

  function crear(el, opciones) {
    const o = Object.assign({ cara: "tranquila", accesorio: null, tam: 96, fase: null }, opciones || {});
    el.classList.add("luna");
    el.style.setProperty("--luna-tam", o.tam + "px");
    let actual = o.cara;
    const fase = () => (o.fase === null ? faseGlobal : o.fase);
    const pintar = () => { el.innerHTML = svg(actual, o.accesorio, fase()); };
    pintar();
    const ctl = {
      el,
      get cara() { return actual; },
      poner(cara, accesorio) {
        if (cara === actual && accesorio === undefined) return;
        actual = cara;
        if (accesorio !== undefined) o.accesorio = accesorio;
        el.classList.add("luna-cambiando");
        window.setTimeout(() => { pintar(); el.classList.remove("luna-cambiando"); }, 120);
      },
      fase(k) { o.fase = k; pintar(); },
      repintar: pintar,
    };
    vivas.add(ctl);
    return ctl;
  }

  /** Cambia la fase de todas las Lunas que siguen la fase global (las que no tienen fase propia). */
  function ponerFase(k) {
    faseGlobal = Math.max(0, Math.min(1, k));
    for (const l of vivas) {
      if (!document.body.contains(l.el)) { vivas.delete(l); continue; }
      l.repintar();
    }
  }

  window.LUNA = { crear, ponerFase, get fase() { return faseGlobal; }, CARAS: Object.keys(CARAS), ACCESORIOS: Object.keys(ACCESORIOS) };
})();
