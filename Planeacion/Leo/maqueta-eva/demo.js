/* Demo automática: "un día de Ana en la misión". Solo se activa con ?demo en la URL.
 * Un dedo simulado toca, desliza y escribe en la propia maqueta; una leyenda explica cada escena.
 * No guarda nada (app.js ignora el almacenamiento en modo demo). */
(function () {
  "use strict";
  if (!window.APP || !window.APP.DEMO) return;
  const $ = (s) => document.querySelector(s);

  // ---------- Interfaz de la demo: dedo, leyenda y controles ----------
  const dedo = document.createElement("div");
  dedo.className = "demo-dedo";
  dedo.setAttribute("aria-hidden", "true");
  const leyenda = document.createElement("div");
  leyenda.className = "demo-leyenda";
  leyenda.setAttribute("role", "status");
  leyenda.setAttribute("aria-live", "polite");
  const controles = document.createElement("div");
  controles.className = "demo-controles";
  controles.innerHTML = `
    <span class="demo-etq">DEMO</span>
    <span class="demo-progreso"><i></i></span>
    <button data-d="pausa" aria-label="Pausar">❚❚</button>
    <button data-d="reiniciar" aria-label="Reiniciar demo">↺</button>
    <a data-d="salir" href="./" aria-label="Salir de la demo">✕</a>`;
  const tel = $(".telefono");
  tel.append(leyenda, controles);
  document.body.classList.add("modo-demo");
  document.body.append(dedo);

  let pausado = false;
  let paso = 0;
  const TOTAL = 30; // pasos aproximados, para la barra de progreso
  controles.querySelector('[data-d="pausa"]').addEventListener("click", (e) => {
    pausado = !pausado;
    e.currentTarget.textContent = pausado ? "▶" : "❚❚";
    e.currentTarget.setAttribute("aria-label", pausado ? "Continuar" : "Pausar");
  });
  controles.querySelector('[data-d="reiniciar"]').addEventListener("click", () => location.reload());

  // ---------- Primitivas ----------
  const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
  async function espera(ms) {
    let t = 0;
    while (t < ms) {
      await dormir(50);
      if (!pausado) t += 50;
    }
  }
  function avanzar() {
    paso++;
    controles.querySelector(".demo-progreso i").style.width = Math.min(100, (paso / TOTAL) * 100) + "%";
  }
  async function escena(hora, texto) {
    leyenda.innerHTML = `<b>${hora}</b> ${texto}`;
    leyenda.classList.remove("ver");
    void leyenda.offsetWidth;
    leyenda.classList.add("ver");
    await espera(1700);
  }
  async function buscar(selector, ms) {
    const fin = Date.now() + (ms || 3000);
    while (Date.now() < fin) {
      const el = document.querySelector(selector);
      if (el) return el;
      await dormir(60);
    }
    throw new Error("Demo: no encontré " + selector);
  }
  async function mover(el) {
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    await espera(450);
    const r = el.getBoundingClientRect();
    dedo.style.opacity = "1";
    dedo.style.transform = `translate(${r.left + r.width / 2 - 14}px, ${r.top + r.height / 2 - 14}px)`;
    await espera(520);
    return r;
  }
  async function tocar(selector) {
    const el = await buscar(selector);
    await mover(el);
    dedo.classList.add("tocando");
    await espera(140);
    el.click();
    dedo.classList.remove("tocando");
    avanzar();
    await espera(700);
  }
  async function deslizar(selector, valor) {
    const el = await buscar(selector);
    const r = await mover(el);
    const desde = Number(el.value);
    const min = Number(el.min), max = Number(el.max);
    dedo.classList.add("tocando");
    const pasos = 14;
    for (let i = 1; i <= pasos; i++) {
      const v = Math.round(desde + ((valor - desde) * i) / pasos);
      el.value = String(v);
      el.dispatchEvent(new Event("input", { bubbles: true }));
      const x = r.left + ((v - min) / (max - min)) * r.width;
      dedo.style.transform = `translate(${x - 14}px, ${r.top + r.height / 2 - 14}px)`;
      await espera(45);
    }
    dedo.classList.remove("tocando");
    avanzar();
    await espera(900);
  }
  async function escribir(selector, texto) {
    const el = await buscar(selector);
    await mover(el);
    el.focus();
    for (const ch of texto) {
      el.value += ch;
      el.dispatchEvent(new Event("input", { bubbles: true }));
      await espera(260);
    }
    avanzar();
    await espera(900);
  }
  async function ir(destino) {
    window.APP.ir(destino);
    await espera(600);
  }

  // ---------- Guion: un día de Ana (día 112, tránsito a Marte) ----------
  async function guion() {
    await espera(600);
    await escena("07:00", "Ana despierta. Luna le resume su día en la pantalla de inicio.");
    await espera(1200);

    await escena("07:02", "Check-in de 1 minuto: ¿cómo amaneció?");
    await tocar('.menu [data-ir="checkin"]');
    await tocar('[data-animo="feliz"]');
    await deslizar("#ck-dolor-in", 3);
    await tocar('[data-cef="no"]');
    await tocar("#ck-listo");
    await espera(1200);

    await escena("07:15", "Revisa su sueño: el reloj lo midió solo. Ella cuenta cómo despertó.");
    await tocar('.menu [data-ir="hoy"]');
    await tocar('[data-seccion="sueno"]');
    await espera(900);
    await deslizar("#cal", 78);
    await espera(900);

    await escena("08:00", "Desayuno: toca los iconos y Luna hace las cuentas.");
    await tocar("[data-volver]");
    await tocar('[data-seccion="comida"]');
    await tocar('[data-comida="espinaca"]');
    await tocar('[data-comida="nueces"]');
    await espera(1200);

    await escena("10:00", "Sesión en la bicicleta CEVIS: el reloj manda el pulso en vivo.");
    await tocar("[data-volver]");
    await tocar('[data-seccion="corazon"]');
    await espera(1200);
    await tocar("#sesion-btn");
    await escena("10:05", "Sube a zona moderada… y luego intensa. Luna la acompaña.");
    await espera(13000);
    await tocar("#sesion-btn");
    await espera(1800);

    await escena("13:00", "En la comida pide estofado dos veces… y el sodio se pasa de la meta.");
    await tocar("[data-volver]");
    await tocar('[data-seccion="comida"]');
    await tocar('[data-comida="estofado"]');
    await tocar('[data-comida="estofado"]');
    await espera(1800);

    await escena("13:30", "El médico de a bordo le mide la glucosa con glucómetro.");
    await tocar("[data-volver]");
    await tocar('[data-seccion="glucosa"]');
    await escribir("#glu", "62");
    await tocar("#glu-btn");
    await espera(1800);

    await escena("15:00", "Le duele la espalda. Luna no diagnostica: sugiere avisar al médico.");
    await tocar("[data-volver]");
    await tocar('[data-seccion="sintomas"]');
    await deslizar("#dolor", 8);
    await espera(1800);

    await escena("16:00", "¡Aviso de clima espacial! Luna cambia a modo radiación.");
    await tocar("[data-volver]");
    await tocar(".clima");
    await espera(1800);
    await tocar("#tut-sig");
    await espera(1400);
    await tocar("#tut-sig");
    await espera(1400);
    await tocar("#tut-sig");

    await escena("18:00", "Revisa su fuerza estimada en el ARED.");
    await tocar('[data-seccion="fuerza"]');
    await espera(2000);

    await escena("19:30", "¡Los signos de Ana empiezan a caer! Mira cómo la luna mengua.");
    await tocar("#sos");
    await espera(6500);
    await escena("19:31", "Luna activó la emergencia sola: avisó a Mei y guía un paso a la vez.");
    await tocar("#paso-hecho");
    await espera(1300);
    await tocar("#paso-hecho");
    await espera(1300);
    await tocar("#paso-hecho");
    await escena("19:40", "Los signos se recuperan y la luna vuelve a crecer. Todo quedó registrado.");
    await espera(3500);
    await tocar("#cerrar-emergencia");
    await espera(1200);

    await escena("21:00", "Fin del día: logros por registrar, no por tener números perfectos.");
    await tocar('.menu [data-ir="logros"]');
    await espera(2500);

    leyenda.innerHTML = `<b>Fin</b> Así sería un día con Luna. <button class="demo-otra">Ver otra vez ↺</button>`;
    leyenda.querySelector(".demo-otra").addEventListener("click", () => location.reload());
    dedo.style.opacity = "0";
    controles.querySelector(".demo-progreso i").style.width = "100%";
  }

  guion().catch((e) => {
    leyenda.innerHTML = `<b>Demo detenida</b> ${e.message}`;
    console.error(e);
  });
})();
