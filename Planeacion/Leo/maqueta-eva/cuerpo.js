/* Cuerpo LUNNA: figura humana de frente, de mujer o de hombre, en estilo de holograma médico.
 *
 * El contorno sale de puntos anatómicos (media figura, reflejada) unidos con curvas suaves
 * (Catmull-Rom). Lleva esqueleto tenue (clavículas, costillas, esternón, pelvis), arterias
 * principales con flujo, y órganos con forma anatómica que se pueden tocar.
 *
 * Mujer: hombros más estrechos, cintura marcada, cadera más ancha, pecho y pelo largo.
 * Hombre: hombros y cuello más anchos, torso recto, pectorales y pelo corto.
 *
 * Cada órgano lleva el PEOR estado de sus indicadores en el color de su contorno y en la
 * forma de su marca (● ■ ▲, ○ sin dato), para no depender del color (RI-UI-02).
 *
 * Uso: CUERPO.svg({ sexo: "M" | "H", regiones: { cabeza: 0|1|2|null, ... }, activa, vista: [x, y, w, h] })
 *      CUERPO.ZOOM[region] da el encuadre para acercarse a cada órgano.
 */
(function () {
  "use strict";
  const CX = 120;
  const VISTA = [0, 0, 240, 500];

  /** Curva suave que pasa por todos los puntos. */
  function curva(pts, cerrada = true) {
    const n = pts.length;
    const P = (i) => pts[cerrada ? (i + n) % n : Math.max(0, Math.min(n - 1, i))];
    let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
    for (let i = 0; i < (cerrada ? n : n - 1); i++) {
      const [p0, p1, p2, p3] = [P(i - 1), P(i), P(i + 1), P(i + 2)];
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += `C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
    }
    return d + (cerrada ? "Z" : "");
  }
  function simetrica(mitad) {
    const der = mitad.map(([x, y]) => [CX + x, y]);
    const izq = mitad.slice().reverse().filter(([x]) => x !== 0).map(([x, y]) => [CX - x, y]);
    return curva(der.concat(izq));
  }
  const lado = (pts, s) => pts.map(([x, y]) => [CX + s * x, y]);
  const espejo = (d) => d.replace(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g, (_, x, y) => `${(2 * CX - +x).toFixed(1)},${y}`);

  // ---------------------------------------------------------------- proporciones
  const FORMA = {
    H: {
      cabeza: [[0, 20], [14, 23], [21, 34], [22, 50], [19, 64], [13, 75], [6, 81], [0, 83]],
      cuello: [[-10, 72], [10, 72], [14, 97], [-14, 97]],
      torso: [[13, 92], [31, 98], [50, 106], [55, 120], [47, 142], [46, 170], [42, 200], [39, 222], [40, 246], [42, 268], [41, 300],
        [37, 340], [31, 372], [32, 400], [26, 440], [19, 468], [24, 484], [16, 493], [6, 493], [7, 470], [9, 440], [10, 400], [8, 372],
        [7, 340], [4, 302], [0, 284]],
      brazo: [[49, 103], [60, 112], [65, 134], [65, 160], [67, 196], [72, 232], [76, 266], [81, 281], [82, 300], [77, 318], [69, 318],
        [65, 300], [64, 283], [60, 262], [55, 226], [52, 198], [50, 170], [47, 146], [45, 124]],
      pelo: [[0, 18], [17, 22], [24, 36], [23, 46], [19, 37], [9, 31], [0, 32]],
      detalles: ["M98,142 Q110,156 120,150 Q130,156 142,142", "M106,204 Q120,208 134,204", "M107,222 Q120,226 133,222"],
      ombligo: [120, 240],
    },
    M: {
      cabeza: [[0, 22], [13, 25], [19, 36], [20, 51], [17, 64], [12, 74], [6, 80], [0, 82]],
      cuello: [[-8, 72], [8, 72], [11, 95], [-11, 95]],
      torso: [[11, 91], [26, 97], [43, 104], [48, 118], [41, 140], [42, 166], [34, 198], [29, 218], [35, 242], [46, 268], [46, 298],
        [39, 338], [30, 372], [31, 400], [24, 440], [17, 468], [22, 484], [15, 493], [6, 493], [7, 470], [9, 440], [10, 400], [8, 372],
        [8, 340], [4, 302], [0, 286]],
      brazo: [[42, 101], [52, 111], [55, 132], [55, 160], [57, 196], [62, 232], [66, 266], [70, 280], [71, 298], [67, 314], [60, 314],
        [57, 298], [57, 281], [53, 260], [49, 226], [46, 198], [44, 170], [41, 146], [40, 122]],
      pelo: [[0, 17], [17, 21], [25, 36], [27, 58], [29, 84], [27, 104], [18, 100], [17, 80], [20, 60], [19, 42], [12, 30], [0, 29]],
      detalles: ["M90,150 Q92,174 108,176 Q118,174 120,166", "M150,150 Q148,174 132,176 Q122,174 120,166"],
      ombligo: [120, 238],
    },
  };

  /** Línea central del brazo, pegada al lado interno (por donde va la arteria braquial). */
  function ejeBrazo(b) {
    const n = b.length; // 19 puntos: fuera 0..9, dentro 10..18
    const out = [];
    for (let i = 1; i <= 8; i++) {
      const a = b[i], c = b[n - i];
      out.push([a[0] * 0.38 + c[0] * 0.62, (a[1] + c[1]) / 2]);
    }
    return out;
  }

  // ---------------------------------------------------------------- esqueleto y arterias
  function esqueleto() {
    let d = "M120,122 L120,194"; // esternón
    for (let i = 0; i < 7; i++) {
      const y = 126 + i * 10, ancho = 26 + Math.min(i, 3) * 3;
      const costilla = `M120,${y} C${120 - 10},${y - 3} ${120 - ancho},${y + 2} ${120 - ancho - 6},${y + 14 + i}`;
      d += " " + costilla + " " + espejo(costilla);
    }
    d += " M94,250 C96,270 108,280 120,282 C132,280 144,270 146,250"; // pelvis
    d += " M108,100 Q92,101 80,106 M132,100 Q148,101 160,106"; // clavículas
    return d;
  }
  function arterias(sexo) {
    const F = FORMA[sexo];
    const eje = ejeBrazo(F.brazo);
    const brazoIzq = curva([[124, 146], [104, 112], ...lado(eje, -1).map(([x, y]) => [x, y])], false);
    const brazoDer = curva([[128, 146], [136, 112], ...lado(eje, 1)], false);
    const pierna = (s) => curva([[121, 250], [CX + s * 12, 272], [CX + s * 18, 302], [CX + s * 18, 340], [CX + s * 19, 372], [CX + s * 20, 412], [CX + s * 16, 446], [CX + s * 13, 470]], false);
    return [
      "M124,148 C120,140 122,132 130,132 C138,132 140,140 136,150 C132,170 126,190 122,214 L121,250", // arco aórtico y aorta descendente
      "M126,134 L118,108 L114,80 L111,62", // carótida derecha (a la izquierda de quien mira)
      "M131,133 L124,108 L126,80 L129,62", // carótida izquierda
      brazoIzq, brazoDer, pierna(-1), pierna(1),
      "M121,234 L100,236 M121,234 L140,236", // renales
      "M111,62 Q104,50 108,36 M129,62 Q136,50 132,36", // temporales
    ];
  }

  // ---------------------------------------------------------------- órganos
  const CORAZON = `<g transform="translate(111.5 140) scale(0.3)"><g class="late">
      <path class="tej" d="M30,46 C18,56 18,76 30,90 C42,102 60,108 74,114 C82,100 92,84 92,66 C92,50 82,40 68,40 C58,40 50,44 44,48 C40,44 35,44 30,46 Z"/>
      <path class="tej aur" d="M30,46 C20,44 14,52 16,62 C18,70 24,72 30,70 Z"/>
      <path class="tej vena" d="M32,48 L31,12 L41,12 L40,46 Z"/>
      <path class="tej arteria-org" d="M48,46 C46,30 50,14 62,10 C74,6 86,12 88,26 L79,27 C77,19 72,17 64,19 C57,21 56,32 58,46 Z"/>
      <path class="tej pulmonar" d="M57,49 C57,38 63,30 75,30 L77,39 C70,39 66,43 66,51 Z"/>
      <path class="vaso" d="M60,12 L58,0 M68,9 L68,-3 M76,10 L80,-1"/>
      <path class="coronaria" d="M60,52 C62,70 66,90 72,111 M36,58 C30,72 34,86 46,96 M64,70 C72,74 80,72 86,66 M66,90 C74,92 80,88 86,80"/>
    </g></g>`;
  const ORGANOS = {
    cabeza: () => `<path class="tej" d="M104,42 C102,30 110,22 120,22 C131,22 139,29 137,40 C138,48 132,52 120,52 C108,52 103,48 104,42 Z"/>`
      + `<path class="surco" d="M109,30 Q114,26 118,31 Q122,25 127,30 Q132,27 134,34 M106,40 Q111,35 116,40 Q121,34 126,40 Q131,36 136,42 M110,48 Q116,44 120,49 Q125,44 131,48 M120,24 L120,51"/>`,
    ojos: () => `<ellipse class="tej" cx="111.5" cy="55" rx="4.4" ry="2.8"/><ellipse class="tej" cx="128.5" cy="55" rx="4.4" ry="2.8"/>`
      + `<circle class="iris" cx="111.5" cy="55" r="1.6"/><circle class="iris" cx="128.5" cy="55" r="1.6"/>`,
    pulmones: () => `<path class="via" d="M118,96 L118,120 L110,128 M122,96 L122,120 L130,128"/>`
      + `<path class="tej" d="M110,122 C100,121 92,134 89,152 C86,170 87,186 92,192 C98,196 106,194 111,190 C113,176 113,160 112,146 C112,136 112,128 110,122 Z"/>`
      + `<path class="tej" d="M130,122 C140,121 148,134 151,152 C154,170 153,186 148,192 C142,196 134,194 129,190 C130,182 137,178 135,170 C131,166 128,160 129,150 C129,138 128,128 130,122 Z"/>`
      + `<path class="surco" d="M90,160 Q100,156 111,150 M89,176 Q100,174 111,170 M151,166 Q140,160 130,148 M100,140 Q104,150 102,162 M140,138 Q137,150 141,160"/>`,
    corazon: () => CORAZON,
    abdomen: () => `<path class="tej higado" d="M96,196 C108,192 122,194 124,202 C120,210 108,214 98,212 C92,208 92,200 96,196 Z"/>`
      + `<path class="tej" d="M126,200 C140,196 146,206 142,216 C138,226 126,226 120,220 C116,214 118,204 126,200 Z"/>`
      + `<path class="tej" d="M104,226 C100,236 106,246 116,244 C124,250 136,246 138,236 C140,228 132,222 124,226 C118,222 110,222 104,226 Z"/>`
      + `<path class="surco" d="M108,232 Q114,228 120,233 Q126,238 132,232 M110,240 Q120,236 130,241 M104,204 Q110,200 118,203"/>`,
    rinones: () => `<path class="tej" d="M95,228 C89,228 88,244 95,248 C99,250 101,244 99,239 C101,235 100,228 95,228Z"/>`
      + `<path class="tej" d="M145,228 C151,228 152,244 145,248 C141,250 139,244 141,239 C139,235 140,228 145,228Z"/>`
      + `<path class="via" d="M98,246 Q104,258 115,262 M142,246 Q136,258 125,262"/><ellipse class="tej" cx="120" cy="265" rx="8.5" ry="6.5"/>`,
    musculos: (s) => {
      const b = FORMA[s].brazo;
      const bx = (b[3][0] + b[17][0]) / 2;
      const r = s === "M" ? 5.5 : 6.5;
      const biceps = (x) => `<ellipse class="tej" cx="${x}" cy="168" rx="${r}" ry="20"/><path class="surco" d="M${x - 2},152 Q${x - 3},168 ${x - 2},184 M${x + 2},152 Q${x + 3},168 ${x + 2},184"/>`;
      const cuad = "M98,292 C94,312 96,340 104,356 C110,352 114,328 112,298Z";
      const fibra = "M101,300 Q100,322 105,348 M107,298 Q108,322 108,346";
      return biceps(CX - bx) + biceps(CX + bx) + `<path class="tej" d="${cuad}"/><path class="tej" d="${espejo(cuad)}"/><path class="surco" d="${fibra} ${espejo(fibra)}"/>`
        + `<path class="tej" d="M103,392 C100,404 102,420 107,428 C110,420 110,402 108,392Z"/><path class="tej" d="${espejo("M103,392 C100,404 102,420 107,428 C110,420 110,402 108,392Z")}"/>`;
    },
    piel: (s) => {
      const b = FORMA[s].brazo;
      const x1 = CX + b[13][0] - 1, x2 = CX + b[6][0] + 1;
      return `<rect class="tej sensor" x="${x1}" y="262" width="${x2 - x1}" height="11" rx="3"/><circle class="led" cx="${(x1 + x2) / 2}" cy="267.5" r="1.6"/>`;
    },
  };

  /** Encuadre para acercarse a cada órgano: [x, y, ancho, alto]. */
  const ZOOM = {
    cabeza: [78, 6, 84, 112], ojos: [92, 30, 56, 74], corazon: [90, 124, 72, 96], pulmones: [70, 92, 100, 132],
    abdomen: [80, 184, 80, 106], rinones: [74, 206, 92, 122], musculos: [24, 110, 192, 256], piel: [146, 224, 86, 114],
    radiacion: VISTA,
  };
  const MARCA = {
    cabeza: [150, 28], ojos: [88, 50], corazon: [160, 152], pulmones: [78, 146], abdomen: [156, 206],
    rinones: [78, 252], musculos: [152, 334], piel: [212, 256], radiacion: [214, 102],
  };
  const NOMBRE = {
    cabeza: "Cabeza: sueño, reflejos y ánimo", ojos: "Ojos: se revisan en Tierra", corazon: "Corazón: pulso, HRV y presión",
    pulmones: "Pulmones: oxígeno y respiración", abdomen: "Abdomen: glucosa y agua", rinones: "Riñones y vejiga",
    musculos: "Huesos y músculos", piel: "Piel: temperatura (sensor de muñeca)", radiacion: "Todo el cuerpo: radiación",
  };

  const clase = (n) => (n == null ? "nd" : ["ok", "ojo", "alto"][n]);
  function forma(n, x, y, r = 6.5) {
    if (n == null) return `<circle cx="${x}" cy="${y}" r="${r * 0.75}" class="f-nd"/>`;
    if (n === 0) return `<circle cx="${x}" cy="${y}" r="${r * 0.8}" class="f-ok"/>`;
    if (n === 1) return `<rect x="${x - r * 0.75}" y="${y - r * 0.75}" width="${r * 1.5}" height="${r * 1.5}" rx="1.5" class="f-ojo"/>`;
    return `<path d="M${x},${y - r} L${x + r},${y + r * 0.8} L${x - r},${y + r * 0.8}Z" class="f-alto"/>`;
  }

  let uid = 0;
  function svg({ sexo = "M", regiones = {}, activa = null, vista = VISTA, marcas = true }) {
    const F = FORMA[sexo];
    const id = "cu" + ++uid;
    const silueta = [simetrica(F.torso), curva(lado(F.brazo, 1)), curva(lado(F.brazo, -1)), simetrica(F.cabeza), curva(F.cuello.map(([x, y]) => [CX + x, y]))];
    const zona = (r) => `class="org org-${r} est-${clase(regiones[r])}${activa === r ? " activa" : ""}" data-region="${r}" role="button" tabindex="0" aria-label="${NOMBRE[r]}"`;
    const pelo = simetrica(F.pelo);
    return `<svg class="cuerpo-svg${activa ? " con-foco" : ""}" viewBox="${vista.join(" ")}" preserveAspectRatio="xMidYMid meet" role="group" aria-label="Cuerpo LUNNA, figura de ${sexo === "M" ? "mujer" : "hombre"}">
      <defs>
        <linearGradient id="${id}-piel" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#2A4FA8" stop-opacity=".75"/><stop offset=".25" stop-color="#17306F" stop-opacity=".55"/>
          <stop offset=".5" stop-color="#0F2257" stop-opacity=".45"/><stop offset=".75" stop-color="#17306F" stop-opacity=".55"/>
          <stop offset="1" stop-color="#2A4FA8" stop-opacity=".75"/></linearGradient>
        <linearGradient id="${id}-pelo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1B2E6B"/><stop offset="1" stop-color="#0E1A45"/></linearGradient>
        <filter id="${id}-brillo" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <ellipse cx="120" cy="250" rx="112" ry="244" class="halo est-${clase(regiones.radiacion)}${activa === "radiacion" ? " activa" : ""}" data-region="radiacion" role="button" tabindex="0" aria-label="${NOMBRE.radiacion}"/>
      <ellipse cx="120" cy="495" rx="52" ry="4" class="base-escaner"/>
      ${sexo === "M" ? `<path d="${pelo}" fill="url(#${id}-pelo)" class="pelo"/>` : ""}
      <g class="silueta-borde" filter="url(#${id}-brillo)">${silueta.map((d) => `<path d="${d}"/>`).join("")}</g>
      <g class="silueta-relleno">${silueta.map((d) => `<path d="${d}" fill="url(#${id}-piel)"/>`).join("")}</g>
      ${sexo === "H" ? `<path d="${pelo}" fill="url(#${id}-pelo)" class="pelo"/>` : `<path d="M100,30 Q120,14 140,30 Q134,24 120,24 Q106,24 100,30Z" fill="url(#${id}-pelo)" class="pelo"/>`}
      <path class="hueso" d="${esqueleto()}"/>
      <g class="anatomia">${F.detalles.map((d) => `<path d="${d}"/>`).join("")}<circle cx="${F.ombligo[0]}" cy="${F.ombligo[1]}" r="1.4"/>
        <path d="M120,57 L118,63.5 Q120,65 122,63.5 M114.5,70 Q120,72.5 125.5,70 M112,80 L116,96 M128,80 L124,96 M${CX - 22},372 Q${CX - 19},378 ${CX - 15},372 M${CX + 15},372 Q${CX + 19},378 ${CX + 22},372"/></g>
      <g class="arterias">${arterias(sexo).map((d) => `<path d="${d}"/>`).join("")}</g>
      <g class="arterias flujo">${arterias(sexo).map((d) => `<path d="${d}"/>`).join("")}</g>
      ${["pulmones", "musculos", "rinones", "abdomen", "corazon", "cabeza", "ojos", "piel"].map((r) => `<g ${zona(r)}>${ORGANOS[r](sexo)}</g>`).join("")}
      ${marcas ? `<g class="marcas" aria-hidden="true">${Object.entries(MARCA).map(([r, [x, y]]) => `<g class="marca${activa === r ? " activa" : ""}"><circle cx="${x}" cy="${y}" r="9.5" class="marca-fondo"/>${forma(regiones[r], x, y)}</g>`).join("")}</g>` : ""}
    </svg>`;
  }

  window.CUERPO = { svg, NOMBRE, ZOOM, VISTA, MARCA, forma, clase };
})();
