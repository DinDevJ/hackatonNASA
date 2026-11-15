// LUNNA Landing Page Interactivity
document.addEventListener('DOMContentLoaded', () => {
  // Smooth scroll para anclas de navegación
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;
      
      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        e.preventDefault();
        targetElement.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });

  // Animación interactiva en el sensor display de prueba
  const miniPulse = document.querySelector('.mini-sensor strong');
  if (miniPulse) {
    setInterval(() => {
      const randomBpm = 72 + Math.floor(Math.random() * 5);
      miniPulse.textContent = `${randomBpm} bpm`;
    }, 2500);
  }
});
