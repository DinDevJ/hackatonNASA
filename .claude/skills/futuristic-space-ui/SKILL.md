---
name: futuristic-space-ui
description: Sistema de diseño futurista aeroespacial (Sci-Fi Glassmorphism, HUD Biométrico, SpaceX Crew Dragon / NASA Orion) para EVA y LUNNA, optimizado tanto para componentes Astro (.astro, islas interactivas) como HTML/CSS/JS. Úsalo siempre que crees, migres, edites o estilices componentes de interfaz, pantallas, gráficas, animaciones SVG o paneles en Astro, maqueta-eva, panel-salud o cualquier frontend del proyecto.
---

# Futuristic Space UI — Sistema de Diseño EVA / LUNNA (Astro & Web)

Este skill define las reglas visuales, de arquitectura CSS y de componentes (incluyendo **Astro**) para lograr una estética **futurista aeroespacial de grado misión (NASA Orion / SpaceX Dragon HUD + Sci-Fi Bioluminescent Glassmorphism)** en el ecosistema EVA / LUNNA.

## Cuándo activar este skill
Actívalo automáticamente cada vez que el usuario pida:
- Migrar o construir el frontend en **Astro** (`src/pages/`, `src/layouts/`, `src/components/*.astro`) o editar `Planeacion/Leo/maqueta-eva/`, `Planeacion/Elena/panel-salud/` y `app/`.
- Dar un toque "futurista", "espacial", "HUD", "escáner médico", "sci-fi", "moderno" o "aeroespacial".
- Construir visualizaciones de telemetría, signos vitales, alertas solares, Cuerpo LUNNA o paneles de diagnóstico.

---

## 1. Principios Estéticos Centrales

1. **Cristal Orbital y Profundidad Abisal (Sci-Fi Glassmorphism):**
   - Nunca uses fondos planos opacos. Combina gradientes radiales orbitales de espacio profundo (`#040920` -> `#070C2E` -> `#0A1240`) con capas de vidrio translúcido (`backdrop-filter: blur(22px) saturate(180%)`).
   - En modo claro ("Luz de cabina diurna"), el vidrio debe ser perlado-iridiscente con bordes especulares (`rgba(255, 255, 255, 0.85)`) y sombras suaves azul-violeta; en modo oscuro ("Modo Orbital / Nocturno"), usa vidrio zafiro profundo con bordes cian/violeta luminiscentes (`rgba(88, 200, 255, 0.22)`).

2. **Precisión de Telemetría (HUD Typography):**
   - Todo dato numérico en vivo (frecuencia cardíaca, `SpO2`, `HRV`, `CO2`, radiación, reloj de misión `T+`, porcentajes de probabilidad bayesiana) **DEBE** usar `font-variant-numeric: tabular-nums` y fuente monoespaciada (`var(--mono)`) para que los dígitos jamás bailen al actualizarse.
   - Etiquetas de telemetría y cabeceras técnicas en mayúsculas compactas: `font: 700 10.5px/1.3 var(--mono); letter-spacing: 0.14em; text-transform: uppercase; color: var(--hud-cian);`.

3. **Semántica Bioluminiscente y Accesibilidad (Doble Codificación):**
   - Nunca dependas solo del color; acompaña siempre con geometría (`●` Estable, `■` Atención/Ojo, `▲` Alerta Alta/Crítica, `○` Sin datos):
     - **Estable / Nominal (`--hud-ok`):** `#34D399` (Verde bioluminiscente) con `drop-shadow(0 0 6px rgba(52, 211, 153, 0.45))`.
     - **Atención / Deriva (`--hud-ojo`):** `#FBBF24` (Ámbar solar) con pulso suave.
     - **Crítico / Emergencia (`--hud-alto`):** `#F87171` / `#FF2E54` (Rojo alerta) con pulso rápido (`1.2s`) y borde activo.
     - **Escáner / IA LUNNA (`--hud-cian` / `--acento`):** `#58C8FF` (Cian HUD) y `#C38BFF` (Violeta nebular).

---

## 2. Patrones Visuales Obligatorios (Recetas CSS)

### A. Retículas y Esquinas Tácticas HUD (Corner Brackets)
Para paneles de escáner, tarjetas de diagnóstico de LUNNA o vistas de órganos, agrega esquinas tácticas y cuadrícula milimétrica de fondo:

```css
.panel-hud-futurista {
  position: relative;
  overflow: hidden;
  border-radius: 22px;
  background:
    linear-gradient(rgba(88, 200, 255, 0.045) 1px, transparent 1px) 0 0 / 100% 22px,
    linear-gradient(90deg, rgba(88, 200, 255, 0.045) 1px, transparent 1px) 0 0 / 22px 100%,
    radial-gradient(circle at 50% 30%, rgba(21, 41, 106, 0.85) 0%, #071131 60%, #040920 100%);
  box-shadow:
    0 14px 34px rgba(4, 9, 32, 0.45),
    inset 0 0 0 1px rgba(88, 200, 255, 0.28),
    inset 0 1px 0 rgba(255, 255, 255, 0.12);
}

.panel-hud-futurista::before,
.panel-hud-futurista::after {
  content: "";
  position: absolute;
  width: 16px;
  height: 16px;
  border: 2px solid var(--hud-cian, #58C8FF);
  opacity: 0.75;
  pointer-events: none;
}
.panel-hud-futurista::before {
  top: 8px; left: 8px;
  border-right: 0; border-bottom: 0;
  border-radius: 6px 0 0 0;
}
.panel-hud-futurista::after {
  bottom: 8px; right: 8px;
  border-left: 0; border-top: 0;
  border-radius: 0 0 6px 0;
}
```

### B. Tarjetas de Cristal con Borde Especular (Glass Cards)
Cada tarjeta (`.tarjeta`, `.vital`, `.resumen-card`) debe sentirse como una lente óptica suspendida:
- `backdrop-filter: blur(22px) saturate(175%)`
- `border: 1px solid var(--vidrio-borde)`
- `box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.25), 0 12px 32px rgba(4, 9, 32, 0.22)`
- Transiciones elásticas suaves: `transition: transform 200ms cubic-bezier(0.22, 1, 0.36, 1), border-color 180ms ease, box-shadow 200ms ease;`

### C. Micro-animaciones Biométricas y Espaciales
1. **Barrido de Escáner (Laser Scanline):** Línea horizontal con gradiente cian (`rgba(88, 200, 255, 0.55)`) que recorre verticalmente el Cuerpo LUNNA o gráficas activas.
2. **Flujo Arterial / Telemetría en Vivo:** Trazos SVG con `stroke-dasharray` animado mediante `stroke-dashoffset` continuo para simular flujo sanguíneo o transmisión de paquetes BLE del ESP32.
3. **Indicador "EN VIVO" (`vivo`):** Punto luminiscente de `6px` con `box-shadow: 0 0 8px var(--hud-cian)` y animación de respiración (`1.6s ease-in-out infinite`).
4. **Apertura Radial desde Órgano:** Al inspeccionar un órgano o métrica, usa `clip-path: circle(... at var(--ox) var(--oy))` para que el panel emerja directamente desde la coordenada tocada.

---

## 3. Reglas de Arquitectura en Astro y Proyecto

- **Arquitectura en Astro (`src/`):**
  - **Layouts (`LayoutEspacial.astro`):** Define las variables globales CSS (`:root` y `:root[data-tema="oscuro"]`), el fondo orbital y el contenedor `.telefono` / cabina.
  - **Componentes modulares (`.astro`):** Divide la interfaz en componentes limpios (`BarraEstado.astro`, `EscanerCuerpoLunna.astro`, `TarjetaVital.astro`, `BurbujaLunna.astro`, `MenuFlotante.astro`, `ModoEmergencia.astro`).
  - **Estilos e Islas:** Conserva la cascada de variables CSS (`estilos.css` -> `cuerpo.css` -> `tema.css`) en un stylesheet global importado por el Layout, o mediante bloques `<style is:global>` / `<style>` en componentes `.astro`. Para la interactividad en vivo (simulador, motor bayesiano, clic en órganos del SVG, emergencia), usa scripts modulares o Astro Islands (`client:load`).
- **Íconos vectoriales puros:** Todos los íconos deben ser **SVG inline de trazo limpio (`stroke="currentColor"`, `fill="none"`, `stroke-width="1.8"`)** sin fondos cuadrados ni emojis genéricos.
- **No desbordar el marco del dispositivo:** El contenedor `.telefono` tiene dimensiones fijas en escritorio; usa grillas compactas (3 columnas para métricas rápidas, 2 columnas con Cuerpo LUNNA + zonas laterales) y evita textos largos que rompan la tarjeta.
- **Idioma y Tono:** Todo el texto visible y comentarios en español claro, empático pero con precisión de misión espacial (asistente **Lunna**, sistema **EVA**).
