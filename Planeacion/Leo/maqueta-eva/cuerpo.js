/* Cuerpo LUNA: figura humana de frente, de mujer o de hombre, con órganos clicables.
 *
 * El contorno sale de puntos anatómicos (media figura, reflejada) unidos con curvas suaves
 * (Catmull-Rom). Mujer: hombros más estrechos, cintura marcada, cadera más ancha, pecho y
 * pelo largo. Hombre: hombros y cuello más anchos, torso más recto, pectorales, pelo corto.
 *
 * Cada órgano se pinta con el PEOR estado de sus indicadores y lleva la forma del semáforo
 * (● ■ ▲, ○ sin dato) para no depender del color (RI-UI-02).
 *
 * Uso: CUERPO.svg({ sexo: "M" | "H", regiones: { cabeza: 0|1|2|null, ... }, activa })
 */
(function () {
  "use strict";
  const CX = 120;

  /** Curva cerrada y suave que pasa por todos los puntos. */
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
  /** Media figura (x medido desde el centro) → figura completa reflejada. */
  function simetrica(mitad) {
    const der = mitad.map(([x, y]) => [CX + x, y]);
    const izq = mitad.slice().reverse().filter(([x]) => x !== 0).map(([x, y]) => [CX - x, y]);
    return curva(der.concat(izq));
  }
  const brazo = (pts, lado) => curva(pts.map(([x, y]) => [CX + lado * x, y]));

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
      detalles: [
        "M108,100 Q92,101 80,106", "M132,100 Q148,101 160,106", // clavículas
        "M98,142 Q110,156 120,150 Q130,156 142,142", // pectorales
        "M120,168 L120,232", "M106,192 Q120,196 134,192", "M107,212 Q120,216 133,212", // abdomen
      ],
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
      detalles: [
        "M110,99 Q96,100 86,104", "M130,99 Q144,100 154,104", // clavículas
        "M90,150 Q92,174 108,176 Q118,174 120,166", "M150,150 Q148,174 132,176 Q122,174 120,166", // pecho
      ],
      ombligo: [120, 238],
    },
  };

  // ---------------------------------------------------------------- órganos
  const ORGANOS = {
    cabeza: (s) => `<ellipse cx="120" cy="${s === "M" ? 41 : 40}" rx="${s === "M" ? 14 : 15}" ry="11"/>`
      + `<path class="surco" d="M110,38 Q114,32 118,38 Q122,32 126,38 Q130,33 132,40 M110,44 Q115,40 120,45 Q125,40 130,45"/>`,
    ojos: () => `<ellipse cx="111.5" cy="55" rx="4.2" ry="2.6"/><ellipse cx="128.5" cy="55" rx="4.2" ry="2.6"/>`,
    pulmones: () => `<path d="M109,124 C97,127 90,150 90,176 C90,190 98,195 109,190 C113,170 114,140 109,124Z"/>`
      + `<path d="M131,124 C143,127 150,150 150,176 C150,190 142,195 131,190 C127,170 126,140 131,124Z"/>`,
    corazon: () => `<path d="M127,177 C115,169 112,157 119,154.5 C123,153 126,156 127,158.5 C128,156 131,153 135,154.5 C142,157 139,169 127,177Z"/>`,
    abdomen: () => `<path d="M100,206 C100,196 112,194 120,196 C130,194 141,197 140,208 C140,222 130,228 120,228 C109,228 100,220 100,206Z"/>`
      + `<path class="surco" d="M106,210 Q113,204 120,210 Q127,216 134,209 M108,219 Q120,213 132,219"/>`,
    rinones: () => `<path d="M95,228 C89,228 88,244 95,248 C99,250 101,244 99,239 C101,235 100,228 95,228Z"/>`
      + `<path d="M145,228 C151,228 152,244 145,248 C141,250 139,244 141,239 C139,235 140,228 145,228Z"/>`
      + `<ellipse cx="120" cy="263" rx="9" ry="7"/>`,
    musculos: (s) => {
      const b = FORMA[s].brazo;
      const bx = (b[3][0] + b[17][0]) / 2; // centro del bíceps
      return `<ellipse cx="${CX - bx}" cy="168" rx="${s === "M" ? 5.5 : 6.5}" ry="20"/><ellipse cx="${CX + bx}" cy="168" rx="${s === "M" ? 5.5 : 6.5}" ry="20"/>`
        + `<path d="M98,292 C94,312 96,340 104,356 C110,352 114,328 112,298Z"/><path d="M142,292 C146,312 144,340 136,356 C130,352 126,328 128,298Z"/>`;
    },
    piel: (s) => {
      const b = FORMA[s].brazo; // reloj en la muñeca izquierda (a la derecha de quien mira)
      const x1 = CX + b[13][0] - 1, x2 = CX + b[6][0] + 1;
      return `<rect x="${x1}" y="262" width="${x2 - x1}" height="11" rx="4"/>`;
    },
  };
  // Dónde va la marca del semáforo de cada región (fuera del órgano, para que se vea).
  const MARCA = {
    cabeza: [150, 26], ojos: [88, 50], corazon: [158, 156], pulmones: [80, 150], abdomen: [154, 206],
    rinones: [80, 248], musculos: [150, 334], piel: [210, 256], radiacion: [212, 104],
  };
  const NOMBRE = {
    cabeza: "Cabeza: sueño, reflejos y ánimo", ojos: "Ojos: se revisan en Tierra", corazon: "Corazón: pulso, HRV y presión",
    pulmones: "Pulmones: oxígeno y respiración", abdomen: "Abdomen: glucosa y agua", rinones: "Riñones y vejiga",
    musculos: "Huesos y músculos", piel: "Piel: temperatura (sensor de muñeca)", radiacion: "Todo el cuerpo: radiación",
  };

  const CLASE = { 0: "ok", 1: "ojo", 2: "alto" };
  const clase = (n) => (n == null ? "nd" : CLASE[n]);
  function forma(n, x, y, r = 6.5) {
    if (n == null) return `<circle cx="${x}" cy="${y}" r="${r * 0.75}" class="f-nd"/>`;
    if (n === 0) return `<circle cx="${x}" cy="${y}" r="${r * 0.8}" class="f-ok"/>`;
    if (n === 1) return `<rect x="${x - r * 0.75}" y="${y - r * 0.75}" width="${r * 1.5}" height="${r * 1.5}" rx="1.5" class="f-ojo"/>`;
    return `<path d="M${x},${y - r} L${x + r},${y + r * 0.8} L${x - r},${y + r * 0.8}Z" class="f-alto"/>`;
  }

  function svg({ sexo = "M", regiones = {}, activa = null }) {
    const F = FORMA[sexo];
    const silueta = [simetrica(F.torso), brazo(F.brazo, 1), brazo(F.brazo, -1), simetrica(F.cabeza), curva(F.cuello.map(([x, y]) => [CX + x, y]))];
    const zona = (r) => `class="org org-${r} est-${clase(regiones[r])}${activa === r ? " activa" : ""}" data-region="${r}" role="button" tabindex="0" aria-label="${NOMBRE[r]}"`;
    const pelo = simetrica(F.pelo);
    const rad = regiones.radiacion;
    return `<svg class="cuerpo-svg" viewBox="0 0 240 500" role="group" aria-label="Cuerpo LUNA, figura de ${sexo === "M" ? "mujer" : "hombre"}">
      <defs>
        <linearGradient id="cu-piel" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#DCD0F7"/><stop offset=".22" stop-color="#F4EFFE"/><stop offset=".45" stop-color="#FFFFFF"/><stop offset=".7" stop-color="#F1EBFD"/><stop offset="1" stop-color="#D6C9F5"/></linearGradient>
        <radialGradient id="cu-luz" cx=".38" cy=".3" r=".75"><stop offset="0" stop-color="#FFFFFF" stop-opacity=".9"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/></radialGradient>
        <linearGradient id="cu-pelo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3B2A7A"/><stop offset="1" stop-color="#5B3FB0"/></linearGradient>
      </defs>
      <ellipse cx="120" cy="250" rx="112" ry="244" class="halo est-${clase(rad)}${activa === "radiacion" ? " activa" : ""}" data-region="radiacion" role="button" tabindex="0" aria-label="${NOMBRE.radiacion}"/>
      <ellipse cx="120" cy="494" rx="46" ry="5" class="sombra-suelo"/>
      ${sexo === "M" ? `<path d="${pelo}" fill="url(#cu-pelo)"/>` : ""}
      <g class="silueta-borde">${silueta.map((d) => `<path d="${d}"/>`).join("")}</g>
      <g class="silueta-relleno">${silueta.map((d) => `<path d="${d}"/>`).join("")}</g>
      <g class="silueta-luz">${silueta.map((d) => `<path d="${d}"/>`).join("")}</g>
      ${sexo === "H" ? `<path d="${pelo}" fill="url(#cu-pelo)"/>` : `<path d="M100,30 Q120,14 140,30 Q134,24 120,24 Q106,24 100,30Z" fill="url(#cu-pelo)"/>`}
      <g class="anatomia">${F.detalles.map((d) => `<path d="${d}"/>`).join("")}<path d="M120,57 L118,63.5 Q120,65 122,63.5"/><path d="M114.5,70 Q120,72.5 125.5,70"/><path d="M112,80 L116,96 M128,80 L124,96"/><circle cx="${F.ombligo[0]}" cy="${F.ombligo[1]}" r="1.6"/>
        <path d="M${CX - 22},372 Q${CX - 19},378 ${CX - 15},372 M${CX + 15},372 Q${CX + 19},378 ${CX + 22},372"/></g>
      ${["pulmones", "musculos", "rinones", "abdomen", "corazon", "cabeza", "ojos", "piel"].map((r) => `<g ${zona(r)}>${ORGANOS[r](sexo)}</g>`).join("")}
      <g class="marcas" aria-hidden="true">${Object.entries(MARCA).map(([r, [x, y]]) => `<g class="marca${activa === r ? " activa" : ""}"><circle cx="${x}" cy="${y}" r="10" class="marca-fondo"/>${forma(regiones[r], x, y)}</g>`).join("")}</g>
    </svg>`;
  }

  window.CUERPO = { svg, NOMBRE, forma, clase };
})();
