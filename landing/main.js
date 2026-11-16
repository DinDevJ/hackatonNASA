// Lunna · landing de exposición
//
// Los dispositivos de la portada muestran la interfaz REAL (un iframe) a su tamaño nativo, escalada para caber en
// su marco. Las rutas (/app/, /reloj/, /simulador…) las sirve el backend de Lunna. En el VPS la landing y el backend
// comparten dominio; para verla en local con `python -m http.server 3000` se usa http://localhost:8787,
// o el que se pase en ?backend=https://…
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const q = new URLSearchParams(location.search);
  const local = location.protocol === 'file:' || (location.port && location.port !== '80' && location.port !== '443' && location.port !== '8787');
  const BASE = (q.get('backend') || (local ? 'http://localhost:8787' : '')).replace(/\/$/, '');

  // Mismo origen: el celular abre directo en su pantalla principal, sin el tutorial de bienvenida.
  if (!BASE) {
    try {
      const vistos = JSON.parse(localStorage.getItem('eva:tutoriales') || '{}');
      if (!vistos.bienvenida) localStorage.setItem('eva:tutoriales', JSON.stringify({ ...vistos, bienvenida: true }));
    } catch { /* sin almacenamiento: el tutorial aparece, no pasa nada */ }
  }
  $$('[data-ruta]').forEach((a) => { a.href = BASE + a.dataset.ruta; });

  // ── Interfaces reales escaladas ──
  const pantallas = $$('.pantalla');
  function escalar(p) {
    const f = p.querySelector('iframe'), w = Number(p.dataset.ancho), h = Number(p.dataset.alto);
    f.style.width = `${w}px`; f.style.height = `${h}px`; f.style.transform = `scale(${p.clientWidth / w})`;
  }
  const ro = new ResizeObserver((es) => es.forEach((e) => escalar(e.target)));
  // ── Idioma (ES/EN). Las interfaces leen ?idioma= y localStorage «lunna-idioma». ──
  const CLAVE_IDIOMA = 'lunna-idioma';
  let idioma = (() => {
    const pedido = q.get('idioma');
    if (pedido === 'en' || pedido === 'es') return pedido;
    try { return localStorage.getItem(CLAVE_IDIOMA) === 'en' ? 'en' : 'es'; } catch { return 'es'; }
  })();
  const conIdioma = (ruta) => `${BASE}${ruta}${ruta.includes('?') ? '&' : '?'}idioma=${idioma}`;
  const cargar = (p) => { const f = p.querySelector('iframe'); f.src = conIdioma(f.dataset.src); };
  pantallas.forEach((p) => { escalar(p); ro.observe(p); });

  // Cada interfaz mantiene abiertas sus conexiones de eventos en vivo (/api/stream) y el navegador sólo permite
  // 6 por servidor en HTTP/1.1: con la landing abierta, otra pestaña (el simulador) se quedaba «Cargando…».
  // Por eso se cargan sólo con la portada a la vista y la pestaña visible, y se descargan al salir.
  let enVista = true, descarga = null;
  const cargadas = () => pantallas.some((p) => p.querySelector('iframe').getAttribute('src'));
  function sincronizar() {
    const activa = enVista && !document.hidden;
    clearTimeout(descarga);
    if (activa) { if (!cargadas()) pantallas.forEach(cargar); return; }
    // Al ocultar la pestaña se libera de inmediato; al bajar por la página, tras un respiro (por si se regresa)
    descarga = setTimeout(() => pantallas.forEach((p) => { p.classList.remove('vivo'); p.querySelector('iframe').removeAttribute('src'); }),
      document.hidden ? 0 : 1500);
  }
  new IntersectionObserver((es) => { enVista = es[0].isIntersecting; sincronizar(); }).observe($('#inicio .escenario'));
  document.addEventListener('visibilitychange', sincronizar);

  // «Toca para usar»: hasta entonces la rueda del ratón pasa de sección, no mueve la interfaz.
  pantallas.forEach((p) => {
    const activar = () => { p.classList.add('vivo'); const f = p.querySelector('iframe'); f.tabIndex = 0; f.focus(); };
    p.addEventListener('click', (e) => { if (!p.classList.contains('vivo')) { e.preventDefault(); activar(); } });
    p.querySelector('.activar').addEventListener('click', (e) => { e.stopPropagation(); activar(); });
  });
  document.addEventListener('click', (e) => {
    pantallas.forEach((p) => { if (p.classList.contains('vivo') && !p.contains(e.target)) p.classList.remove('vivo'); });
  });

  // ── Secciones: aparecen al llegar y marcan su punto ──
  const paginas = $$('.pagina');
  const enlaces = $$('.puntos a, .nav nav a');
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return;
    e.target.classList.add('visible');
    enlaces.forEach((a) => a.classList.toggle('actual', a.getAttribute('href') === `#${e.target.id}`));
  }), { rootMargin: '0px 0px -40% 0px', threshold: 0 });
  paginas.forEach((p) => io.observe(p));

  // Teclado: flechas, AvPág/RePág y espacio pasan de sección completa.
  document.addEventListener('keydown', (e) => {
    if (e.target.closest('input, textarea, iframe') || e.altKey || e.ctrlKey || e.metaKey) return;
    const dir = { ArrowDown: 1, PageDown: 1, ' ': 1, ArrowUp: -1, PageUp: -1 }[e.key];
    if (!dir) return;
    const y = scrollY + innerHeight * 0.4;
    const i = paginas.findIndex((p) => p.offsetTop <= y && y < p.offsetTop + p.offsetHeight);
    const sig = paginas[Math.min(paginas.length - 1, Math.max(0, i + dir))];
    if (sig) { e.preventDefault(); sig.scrollIntoView({ behavior: 'smooth' }); }
  });

  function ponerIdioma(l, recargar) {
    idioma = l;
    document.documentElement.lang = l;
    try { localStorage.setItem(CLAVE_IDIOMA, l); } catch { /* sin almacenamiento */ }
    $$('[data-en]').forEach((el) => {
      if (el.dataset.es === undefined) el.dataset.es = el.innerHTML;
      el.innerHTML = l === 'en' ? el.dataset.en : el.dataset.es;
    });
    [['aria', 'aria-label'], ['title', 'title'], ['alt', 'alt']].forEach(([k, at]) => {
      $$(`[data-en-${k}]`).forEach((el) => {
        const clave = `es${k[0].toUpperCase()}${k.slice(1)}`;
        if (el.dataset[clave] === undefined) el.dataset[clave] = el.getAttribute(at) || '';
        el.setAttribute(at, l === 'en' ? el.getAttribute(`data-en-${k}`) : el.dataset[clave]);
      });
    });
    $$('[data-ruta]').forEach((a) => { a.href = BASE + a.dataset.ruta; });
    if (recargar && cargadas()) pantallas.forEach(cargar);
    dibujar();
  }
  $('#b-idioma').addEventListener('click', () => ponerIdioma(idioma === 'en' ? 'es' : 'en', true));

  // ── Video oficial: fijo, se reproduce solo al estar a la vista y se pausa al salir ──
  const video = $('#video-oficial'), bSonido = $('#b-sonido'), bPausa = $('#b-pausa');
  let pausadoAMano = false;
  const intentar = () => { const p = video.play(); if (p && p.catch) p.catch(() => {}); };
  new IntersectionObserver((es) => es.forEach((e) => {
    if (e.isIntersecting && !pausadoAMano) intentar(); else if (!e.isIntersecting) video.pause();
  }), { threshold: 0.4 }).observe(video);
  bSonido.addEventListener('click', () => {
    video.muted = !video.muted;
    if (!video.muted) { pausadoAMano = false; intentar(); }
    bSonido.setAttribute('aria-pressed', String(!video.muted));
    bSonido.querySelector('.ico').textContent = video.muted ? '🔇' : '🔊';
    const t = bSonido.querySelector('[data-en]');
    const es = video.muted ? 'Activar sonido' : 'Silenciar', en = video.muted ? 'Turn sound on' : 'Mute';
    t.dataset.es = es; t.dataset.en = en; t.textContent = idioma === 'en' ? en : es;
  });
  bPausa.addEventListener('click', () => {
    if (video.paused) { pausadoAMano = false; intentar(); } else { pausadoAMano = true; video.pause(); }
  });
  video.addEventListener('play', () => { bPausa.querySelector('.ico').textContent = '❚❚'; });
  video.addEventListener('pause', () => { bPausa.querySelector('.ico').textContent = '▶'; });

  // ── Galería: la foto se abre en grande; Esc, clic fuera o ✕ la cierran ──
  const visor = $('#visor');
  $$('.foto-abrir').forEach((b) => b.addEventListener('click', () => {
    const img = b.querySelector('img');
    visor.querySelector('img').src = b.dataset.grande;
    visor.querySelector('img').alt = img.alt;
    visor.querySelector('.visor-pie').textContent = b.parentElement.querySelector('figcaption').textContent;
    visor.showModal();
  }));
  visor.querySelector('.visor-cerrar').addEventListener('click', () => visor.close());
  visor.addEventListener('click', (e) => { if (e.target === visor) visor.close(); });

  // ── Pestañas de video: oficial (por defecto) y del producto ──
  $$('.vp').forEach((b) => b.addEventListener('click', () => {
    if (b.classList.contains('activa')) return;
    $$('.vp').forEach((x) => { x.classList.toggle('activa', x === b); x.setAttribute('aria-selected', String(x === b)); });
    video.poster = b.dataset.poster;
    video.querySelector('source').src = b.dataset.src;
    video.load(); pausadoAMano = false; intentar();
  }));

  // ── LUNNA interactivo: misma fórmula que Sistema/backend/src/lunna.ts ──
  // Prior real de la semilla (presión sistólica en órbita): μ₀ = −6,7 %, τ₀ = 5 %, σ_misión = 3 %, σ_día = 5 %.
  const PRIOR = { mu0: -0.067, tau0: 0.05, sm: 0.03, sd: 0.05 }, BASAL = 120, PROPIO = -0.03;
  const rk = $('#r-k'), rn = $('#r-n');
  const pct = (x) => `${Math.round(x * 100)} %`;
  function lunna() {
    const k = Number(rk.value), n = Number(rn.value);
    const pPob = 1 / PRIOR.tau0 ** 2, pHis = k / PRIOR.sm ** 2, pVue = n / PRIOR.sd ** 2, prec = pPob + pHis + pVue;
    const mu = (PRIOR.mu0 * pPob + (k * PROPIO) / PRIOR.sm ** 2 + (n * PROPIO) / PRIOR.sd ** 2) / prec;
    const sdPred = Math.sqrt(1 / prec + PRIOR.sd ** 2);
    const a = BASAL * (1 + mu - 1.96 * sdPred), b = BASAL * (1 + mu + 1.96 * sdPred);
    $('#o-k').textContent = k; $('#o-n').textContent = n;
    [['pob', pPob], ['his', pHis], ['vue', pVue]].forEach(([id, v]) => {
      $(`#p-${id}`).style.width = `${(100 * v) / prec}%`; $(`#t-${id}`).textContent = pct(v / prec);
    });
    $('#r-esp').textContent = `${(BASAL * (1 + mu)).toFixed(1)} mmHg`;
    $('#r-banda').textContent = `${a.toFixed(0)}–${b.toFixed(0)}`;
  }
  rk.addEventListener('input', lunna); rn.addEventListener('input', lunna); lunna();

  // ── Gráfica de deriva (datos ilustrativos, generador con semilla fija) ──
  const TXT = {
    es: { calibra: 'calibra', congela: 'día 14: se congela', alerta: 'deriva lenta → alerta', sigue: 'el que sigue aprendiendo no avisa', dia: 'día' },
    en: { calibra: 'learns', congela: 'day 14: frozen', alerta: 'slow drift → alert', sigue: 'the one that keeps learning stays silent', dia: 'day' },
  };
  function dibujar() {
    const svg = $('#g-deriva'), NS = 'http://www.w3.org/2000/svg', T = TXT[idioma];
    [...svg.children].forEach((n) => { if (n.tagName !== 'title') n.remove(); });
    const el = (tag, at, txt) => { const n = document.createElementNS(NS, tag); Object.entries(at).forEach(([k, v]) => n.setAttribute(k, v)); if (txt) n.textContent = txt; svg.appendChild(n); return n; };
    const X0 = 46, X1 = 626, Y0 = 150, S = 26, DIAS = 120;
    const x = (d) => X0 + ((X1 - X0) * d) / DIAS, y = (z) => Y0 - z * S;
    let s = 7; const azar = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    const normal = () => Math.sqrt(-2 * Math.log(azar() + 1e-9)) * Math.cos(2 * Math.PI * azar());
    const ancho = (d) => (d < 14 ? 3 - d / 14 : 2);               // la banda se angosta mientras calibra
    const deriva = (d) => (d > 78 ? 0.085 * (d - 78) : 0);         // fatiga acumulada: lenta
    const lect = Array.from({ length: DIAS + 1 }, (_, d) => ({ d, z: deriva(d) + 0.62 * normal() }));
    // Calibración
    el('rect', { x: x(0), y: 18, width: x(14) - x(0), height: 252, fill: 'rgba(167,139,250,.08)' });
    el('text', { x: x(7), y: 34, 'text-anchor': 'middle', fill: '#a78bfa', 'font-size': 11, 'font-family': 'JetBrains Mono, monospace' }, T.calibra);
    el('line', { x1: x(14), x2: x(14), y1: 18, y2: 270, stroke: '#a78bfa', 'stroke-dasharray': '3 4' });
    el('text', { x: x(14) + 6, y: 34, fill: '#c4b5fd', 'font-size': 11, 'font-family': 'JetBrains Mono, monospace' }, T.congela);
    // Banda de LUNNA
    const arriba = lect.map(({ d }) => `${x(d)},${y(ancho(d))}`), abajo = lect.map(({ d }) => `${x(d)},${y(-ancho(d))}`).reverse();
    el('polygon', { points: [...arriba, ...abajo].join(' '), fill: 'rgba(124,196,255,.18)' });
    el('line', { x1: x(0), x2: x(DIAS), y1: Y0, y2: Y0, stroke: '#7cc4ff', 'stroke-width': 1.5 });
    // Un modelo que sigue aprendiendo (EWMA sin congelar): absorbe la deriva
    let m = 0; const sigue = lect.map(({ d, z }) => { if (d >= 14) m += 0.1 * (z - m); return `${x(d)},${y(m)}`; });
    el('polyline', { points: sigue.join(' '), fill: 'none', stroke: '#6f7aa3', 'stroke-width': 1.6, 'stroke-dasharray': '5 4' });
    // Lecturas
    let primera = null;
    lect.forEach(({ d, z }) => {
      const fuera = d >= 14 && Math.abs(z) >= ancho(d), rojo = d >= 14 && Math.abs(z) >= 3;
      if (fuera && d > 78 && primera === null) primera = { d, z };
      el('circle', { cx: x(d), cy: y(z), r: fuera ? 3.6 : 2.4, fill: rojo ? '#f87171' : fuera ? '#fbbf24' : 'rgba(238,242,255,.6)' });
    });
    if (primera) {
      el('line', { x1: x(primera.d), x2: x(primera.d) - 40, y1: y(primera.z) - 6, y2: y(primera.z) - 40, stroke: '#fbbf24' });
      el('text', { x: x(primera.d) - 44, y: y(primera.z) - 46, 'text-anchor': 'end', fill: '#fde68a', 'font-size': 12 }, T.alerta);
    }
    el('text', { x: x(96), y: y(-1.3), 'text-anchor': 'middle', fill: '#a3adcf', 'font-size': 11 }, T.sigue);
    // Ejes
    el('line', { x1: X0, x2: X1, y1: 270, y2: 270, stroke: 'rgba(148,163,255,.25)' });
    [0, 14, 40, 80, 112].forEach((d) => el('text', { x: x(d), y: 288, 'text-anchor': 'middle', fill: '#6f7aa3', 'font-size': 11, 'font-family': 'JetBrains Mono, monospace' }, `${d}`));
    el('text', { x: X1, y: 288, 'text-anchor': 'end', fill: '#6f7aa3', 'font-size': 11 }, T.dia);
    el('text', { x: 12, y: Y0 + 4, fill: '#7cc4ff', 'font-size': 11 }, 'μ');
  }
  ponerIdioma(idioma, false);
})();
