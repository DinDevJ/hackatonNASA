// Lunna · landing de exposición
//
// Cada dispositivo muestra la interfaz REAL (un iframe) a su tamaño nativo, escalada para caber en su marco.
// Las rutas (/app/, /reloj/, /simulador…) las sirve el backend de Lunna. En el VPS la landing y el backend
// comparten dominio; para verla en local con `python -m http.server 3000` se usa http://localhost:8787,
// o el que se pase en ?backend=https://…
(function () {
  'use strict';
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

  // Enlaces «abrir a pantalla completa».
  document.querySelectorAll('[data-ruta]').forEach((a) => { a.href = BASE + a.dataset.ruta; });

  // Escala cada iframe para que su tamaño nativo quepa en el marco.
  const pantallas = [...document.querySelectorAll('.pantalla')];
  function escalar(p) {
    const f = p.querySelector('iframe'), w = Number(p.dataset.ancho), h = Number(p.dataset.alto);
    const s = p.clientWidth / w;
    f.style.width = `${w}px`; f.style.height = `${h}px`; f.style.transform = `scale(${s})`;
  }
  const ro = new ResizeObserver((es) => es.forEach((e) => escalar(e.target)));
  pantallas.forEach((p) => { escalar(p); ro.observe(p); });

  // Carga cada interfaz cuando se acerca a la vista (son aplicaciones completas).
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return;
    const f = e.target.querySelector('iframe');
    if (!f.src) f.src = BASE + f.dataset.src;
    io.unobserve(e.target);
  }), { rootMargin: '400px 0px' });
  pantallas.forEach((p) => io.observe(p));

  // «Toca para usar»: hasta entonces la rueda del ratón desplaza la página, no la interfaz.
  pantallas.forEach((p) => {
    const activar = () => {
      p.classList.add('vivo');
      const f = p.querySelector('iframe'); f.tabIndex = 0; f.focus();
    };
    p.addEventListener('click', (e) => { if (!p.classList.contains('vivo')) { e.preventDefault(); activar(); } });
    p.querySelector('.activar').addEventListener('click', (e) => { e.stopPropagation(); activar(); });
  });
  // Al salir de una pantalla activa, vuelve a dejar pasar la rueda.
  document.addEventListener('click', (e) => {
    pantallas.forEach((p) => { if (p.classList.contains('vivo') && !p.contains(e.target)) p.classList.remove('vivo'); });
  });
})();
