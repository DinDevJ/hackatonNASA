// Lunna · fondo galáctico con microanimaciones (canvas, sin dependencias).
//
// Capas, de atrás hacia adelante: nebulosas que respiran y derivan, una galaxia espiral que gira despacio,
// estrellas en tres profundidades que titilan (con paralaje al desplazarse), planetas, un satélite que cruza
// de vez en cuando y alguna estrella fugaz. Lo pesado (nebulosas, galaxia, planetas) se dibuja una sola vez
// en lienzos aparte; cada cuadro sólo los coloca. Se detiene con la pestaña oculta y, con «reducir movimiento»,
// pinta un único cuadro estático.
(function () {
  'use strict';
  const lienzo = document.getElementById('cosmos');
  if (!lienzo || !lienzo.getContext) return;
  const ctx = lienzo.getContext('2d');
  const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const DPR = Math.min(window.devicePixelRatio || 1, 1.5);
  let W = 0, H = 0, estrellas = [], fugaz = null, proximaFugaz = 4000, satelite = null, proximoSatelite = 6000;

  // Azar con semilla: el cielo es el mismo en cada visita.
  let semilla = 20261115;
  const azar = () => ((semilla = (semilla * 16807) % 2147483647) / 2147483647);
  const hoja = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

  // ── Nebulosas: varias manchas suaves superpuestas ──
  function nebulosa(tam, colores) {
    const c = hoja(tam, tam), g = c.getContext('2d');
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 26; i++) {
      const a = azar() * Math.PI * 2, d = azar() * tam * 0.26, r = tam * (0.12 + azar() * 0.22);
      const x = tam / 2 + Math.cos(a) * d, y = tam / 2 + Math.sin(a) * d * 0.7;
      const col = colores[i % colores.length];
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, `rgba(${col},0.055)`); gr.addColorStop(0.5, `rgba(${col},0.024)`); gr.addColorStop(1, `rgba(${col},0)`);
      g.fillStyle = gr; g.fillRect(0, 0, tam, tam);
    }
    return c;
  }
  const NEBULOSAS = [
    { img: nebulosa(900, ['124,92,255', '167,139,250', '56,189,248']), x: 0.82, y: 0.12, esc: 1.2, vel: 0.00004, fase: 0 },
    { img: nebulosa(800, ['56,189,248', '45,212,191', '99,102,241']), x: 0.08, y: 0.55, esc: 1.1, vel: -0.00003, fase: 2 },
    { img: nebulosa(700, ['236,72,153', '167,139,250', '124,92,255']), x: 0.62, y: 0.92, esc: 0.9, vel: 0.00005, fase: 4 },
  ];

  // ── Galaxia espiral de dos brazos ──
  const GALAXIA = (() => {
    const tam = 420, c = hoja(tam, tam), g = c.getContext('2d'), m = tam / 2;
    const nucleo = g.createRadialGradient(m, m, 0, m, m, tam * 0.16);
    nucleo.addColorStop(0, 'rgba(255,246,230,0.55)'); nucleo.addColorStop(0.4, 'rgba(220,200,255,0.18)'); nucleo.addColorStop(1, 'rgba(160,140,255,0)');
    g.fillStyle = nucleo; g.fillRect(0, 0, tam, tam);
    for (let i = 0; i < 1700; i++) {
      const brazo = i % 2, t = azar() ** 0.75 * 4.2, ang = t * 1.35 + brazo * Math.PI + (azar() - 0.5) * 0.55;
      const r = 8 + t * 44 + (azar() - 0.5) * 14;
      const x = m + Math.cos(ang) * r, y = m + Math.sin(ang) * r * 0.42;
      const azul = t > 1.6;
      g.fillStyle = azul ? `rgba(170,200,255,${0.25 + azar() * 0.45})` : `rgba(255,235,210,${0.3 + azar() * 0.45})`;
      g.fillRect(x, y, azar() < 0.08 ? 1.6 : 0.9, azar() < 0.08 ? 1.6 : 0.9);
    }
    return c;
  })();

  // ── Planetas ──
  function planeta(r, c1, c2, anillo) {
    const tam = Math.ceil(r * (anillo ? 4.2 : 2.6)), c = hoja(tam, tam), g = c.getContext('2d'), m = tam / 2;
    const halo = g.createRadialGradient(m, m, r * 0.9, m, m, r * 1.35);
    halo.addColorStop(0, `rgba(${c1},0.18)`); halo.addColorStop(1, `rgba(${c1},0)`);
    g.fillStyle = halo; g.fillRect(0, 0, tam, tam);
    const anilloDe = (atras) => {
      if (!anillo) return;
      g.save(); g.translate(m, m); g.rotate(-0.38); g.scale(1, 0.28);
      g.beginPath(); g.arc(0, 0, r * 1.95, atras ? Math.PI : 0, atras ? Math.PI * 2 : Math.PI);
      g.lineWidth = r * 0.42; g.strokeStyle = 'rgba(214,200,255,0.30)'; g.stroke();
      g.lineWidth = r * 0.08; g.strokeStyle = 'rgba(255,255,255,0.22)'; g.stroke();
      g.restore();
    };
    anilloDe(true);
    const esfera = g.createRadialGradient(m - r * 0.4, m - r * 0.45, r * 0.1, m, m, r);
    esfera.addColorStop(0, `rgb(${c1})`); esfera.addColorStop(1, `rgb(${c2})`);
    g.beginPath(); g.arc(m, m, r, 0, Math.PI * 2); g.fillStyle = esfera; g.fill();
    g.save(); g.clip();
    for (let i = 0; i < 6; i++) { g.fillStyle = `rgba(255,255,255,${0.03 + azar() * 0.05})`; g.fillRect(m - r, m - r * 0.8 + i * r * 0.32, r * 2, r * 0.1); }
    const sombra = g.createLinearGradient(m - r, m - r, m + r, m + r);
    sombra.addColorStop(0.45, 'rgba(4,6,16,0)'); sombra.addColorStop(1, 'rgba(4,6,16,0.82)');
    g.fillStyle = sombra; g.fillRect(m - r, m - r, r * 2, r * 2);
    g.restore();
    anilloDe(false);
    return c;
  }
  const PLANETAS = [
    { img: planeta(34, '196,181,253', '76,60,140', true), x: 0.975, y: 0.86, prof: 0.05, alfa: 0.75 },
    { img: planeta(12, '248,150,110', '120,40,30', false), x: 0.025, y: 0.24, prof: 0.08, alfa: 0.85 },
    { img: planeta(6, '186,230,253', '40,90,140', false), x: 0.94, y: 0.2, prof: 0.12, alfa: 0.8 },
  ];

  function crearEstrellas() {
    const n = Math.round((W * H) / 2300);
    estrellas = Array.from({ length: n }, () => {
      const capa = azar() < 0.62 ? 0 : azar() < 0.75 ? 1 : 2;
      return { x: azar() * W, y: azar() * H * 1.6, r: [0.5, 0.85, 1.3][capa] * (0.7 + azar() * 0.6), capa,
        fase: azar() * Math.PI * 2, vel: 0.0008 + azar() * 0.0024, tono: azar() < 0.12 ? '190,215,255' : azar() < 0.2 ? '255,226,190' : '255,255,255' };
    });
  }
  function medir() {
    W = innerWidth; H = innerHeight;
    lienzo.width = Math.round(W * DPR); lienzo.height = Math.round(H * DPR);
    lienzo.style.width = W + 'px'; lienzo.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    semilla = 20261115; crearEstrellas();
  }

  function cuadro(t) {
    const sy = scrollY;
    ctx.clearRect(0, 0, W, H);
    // Nebulosas
    for (const n of NEBULOSAS) {
      const tam = Math.max(W, H) * 0.75 * n.esc;
      ctx.save();
      ctx.globalAlpha = 0.6 + 0.2 * Math.sin(t * 0.00025 + n.fase);
      ctx.translate(n.x * W + Math.sin(t * 0.00006 + n.fase) * 30, n.y * H - sy * 0.03 + Math.cos(t * 0.00005 + n.fase) * 22);
      ctx.rotate(t * n.vel);
      ctx.drawImage(n.img, -tam / 2, -tam / 2, tam, tam);
      ctx.restore();
    }
    // Galaxia
    const gt = Math.min(W, H) * 0.42;
    ctx.save(); ctx.globalAlpha = 0.4;
    ctx.translate(W * 0.2, H * 0.84 - sy * 0.02); ctx.rotate(-0.5 + t * 0.000018);
    ctx.drawImage(GALAXIA, -gt / 2, -gt / 2, gt, gt); ctx.restore();
    // Estrellas
    for (const e of estrellas) {
      const par = [0.04, 0.09, 0.16][e.capa];
      let y = (e.y - sy * par) % (H * 1.6); if (y < 0) y += H * 1.6;
      if (y > H + 4) continue;
      const brillo = 0.45 + 0.55 * Math.abs(Math.sin(t * e.vel + e.fase));
      ctx.globalAlpha = brillo * (e.capa === 0 ? 0.55 : 0.85);
      ctx.fillStyle = `rgb(${e.tono})`;
      ctx.beginPath(); ctx.arc(e.x, y, e.r, 0, Math.PI * 2); ctx.fill();
      if (e.capa === 2 && brillo > 0.9) {         // destello en cruz de las más cercanas
        ctx.globalAlpha = (brillo - 0.9) * 4;
        ctx.fillRect(e.x - e.r * 4, y - 0.3, e.r * 8, 0.6); ctx.fillRect(e.x - 0.3, y - e.r * 4, 0.6, e.r * 8);
      }
    }
    ctx.globalAlpha = 1;
    // Planetas
    for (const p of PLANETAS) {
      const x = p.x * W + Math.sin(t * 0.00012 + p.y * 7) * 10;
      const s = p.img.width * Math.min(1, W / 1300 + 0.3);
      ctx.globalAlpha = p.alfa;
      ctx.drawImage(p.img, x - s / 2, p.y * H - sy * p.prof - s / 2 + Math.sin(t * 0.0003 + p.y * 9) * 4, s, s);
      ctx.globalAlpha = 1;
    }
    // Satélite que cruza de vez en cuando
    if (!satelite && t > proximoSatelite) satelite = { t0: t, y: H * (0.18 + azar() * 0.5), dir: azar() < 0.5 ? 1 : -1 };
    if (satelite) {
      const k = (t - satelite.t0) / 26000;
      if (k > 1) { satelite = null; proximoSatelite = t + 18000 + azar() * 22000; }
      else {
        const x = satelite.dir > 0 ? -40 + k * (W + 80) : W + 40 - k * (W + 80), y = satelite.y - k * 60;
        ctx.save(); ctx.translate(x, y); ctx.rotate(-0.25 + Math.sin(t * 0.001) * 0.05); ctx.globalAlpha = 0.8;
        ctx.fillStyle = '#5b7fd6'; ctx.fillRect(-15, -3, 10, 6); ctx.fillRect(5, -3, 10, 6);
        ctx.fillStyle = '#cbd5e1'; ctx.fillRect(-4, -4, 8, 8); ctx.fillRect(-5, -0.4, 10, 0.8);
        ctx.globalAlpha = Math.sin(t * 0.008) > 0.6 ? 1 : 0.15; ctx.fillStyle = '#f87171';
        ctx.beginPath(); ctx.arc(0, -5.5, 1.2, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
    }
    // Estrella fugaz
    if (!fugaz && t > proximaFugaz) fugaz = { t0: t, x: W * (0.3 + azar() * 0.7), y: H * azar() * 0.45, largo: 120 + azar() * 140 };
    if (fugaz) {
      const k = (t - fugaz.t0) / 900;
      if (k > 1) { fugaz = null; proximaFugaz = t + 7000 + azar() * 9000; }
      else {
        const x = fugaz.x - k * 360, y = fugaz.y + k * 160;
        const gr = ctx.createLinearGradient(x, y, x + fugaz.largo, y - fugaz.largo * 0.44);
        gr.addColorStop(0, `rgba(255,255,255,${0.85 * (1 - k)})`); gr.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.strokeStyle = gr; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + fugaz.largo, y - fugaz.largo * 0.44); ctx.stroke();
      }
    }
  }

  let ultimo = 0;
  function bucle(t) {
    if (!document.hidden && t - ultimo > 30) { cuadro(t); ultimo = t; }   // ~30 cuadros por segundo bastan para el fondo
    requestAnimationFrame(bucle);
  }
  addEventListener('resize', () => { medir(); if (quieto) cuadro(0); });
  medir();
  if (quieto) { cuadro(0); addEventListener('scroll', () => cuadro(0), { passive: true }); }
  else requestAnimationFrame(bucle);
})();
