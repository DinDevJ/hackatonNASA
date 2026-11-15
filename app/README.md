# LUNA · app (frontend)

La app de LUNA: una sola PWA en TypeScript + React para laptop, iPad y celular (ERS, decisión 10).
Por ahora tiene el **módulo 1 · Panel de salud y Cuerpo LUNA**, solo frontend y con **datos simulados**.

## Abrir

```bash
cd app
npm install
npm run dev
```

Abrir http://localhost:5173. Otros comandos: `npm test` (pruebas), `npm run typecheck`, `npm run build`.

## Qué hay

| Requisito del ERS | Dónde | Estado |
|---|---|---|
| RF-01-01 Figura humana clicable | `Cuerpo.tsx` | Cabeza (sueño, ánimo), corazón (pulso, HRV, presión), abdomen (glucosa), muñeca (temperatura). Tocar una zona abre su detalle |
| RF-01-02 Los seis indicadores del reto | `Tarjeta.tsx` | Valor, unidad, semáforo, procedencia y etiqueta de umbral |
| RF-01-03 Gráfica contra tu normal de 14 días | `Grafica.tsx` | Franja de tu normal; los puntos fuera cambian de color; líneas del umbral [T] |
| RF-01-04 "¿Por qué se mide esto?" | `Detalle.tsx` | Por qué, cómo se mide, qué pasa en el espacio, umbral con su fuente |
| RF-01-05 Panel de pared | `PanelPared.tsx` | Solo ●■▲ por persona y el ambiente; sin números ni motivos |
| RF-01-06 Clima espacial | `Laterales.tsx` | Evento real de DONKI como base; el día 115 llega el evento solar |
| RF-01-07 Metas de la misión | `Laterales.tsx` | Ejercicio, agua y sueño contra su meta |
| RI-UI-01 Tres tamaños | `estilos.css` | < 700 px celular · hasta 1100 px iPad · laptop |
| RI-UI-02 / RNF-USA-01 Semáforo | `Semaforo.tsx` | Forma + color + texto: ● en tu normal · ■ atención · ▲ actúa ahora |
| RI-UI-03 / 04 Procedencia | `Etiquetas.tsx` | [A] NASA · [T] clínico · tu normal; medido, calculado, estimado o anotado a mano |
| RI-UI-05 SOS siempre visible | `App.tsx` | Solo el botón; el modo emergencia es el módulo 3 |
| RI-UI-06 Inglés / español | `i18n.ts` | Se recuerda en el navegador |

La barra **"Datos simulados"** cambia el día (105–115) y la persona, para recorrer el escenario.

## Cómo decide el semáforo

`logica/semaforo.ts`, con la misma convención que las reglas de Diana:

- **Tu normal** = los 14 días anteriores (mínimo 7 con dato). z robusto = 0,6745 · (x − mediana) / MAD.
- |z| ≥ 2 en la dirección que preocupa → **ámbar**. 🔶 Alejarse de tu normal nunca da rojo por sí solo:
  el rojo lo dan los umbrales absolutos [A] o [T].
- 🔶 **Variación mínima creíble** por indicador (`madMinimo`): si los 14 días salen casi iguales, la
  franja no puede ser más estrecha que lo que el instrumento distingue. Sin esto, una noche normal
  parecía anormal (lo encontraron las pruebas).
- **FATIGA-03** (regla de Diana): 3 noches con 1 h menos que tu normal + pulso en reposo z ≥ 2 + HRV z ≤ −2.

## El escenario simulado (`datos/tripulacion.ts`)

| Persona | Qué pasa |
|---|---|
| Ana (MS-2) | Noches cortas del 110 al 112; el 112 salta FATIGA-03 en ámbar; el 114 vuelve a verde (CU-02) |
| Luis (MS-4) | Presión en 130–139: ámbar por umbral [T], no por su normal |
| Tomás (MS-1), Mei (MS-3) | En verde todos los días |
| Toda la cabina | Día 115: evento de partículas solares (CU-03) |

## Pruebas

`npm test`: 11 pruebas del semáforo y del escenario (FATIGA-03 el 112 y no antes, verde el 114, nadie
en ámbar sin motivo). Compila en modo estricto (`strict`, `exactOptionalPropertyTypes`,
`noUncheckedIndexedAccess`).

## Falta

- Conectar datos reales: la trama (`../Planeacion/trama-base`) y la `FuenteSintetica` de 180 días.
- El motor en TypeScript con las reglas YAML (módulo 2); hoy FATIGA-03 está escrita a mano en `logica/estado.ts`.
- Modo emergencia (módulo 3), privacidad por rol (módulo 6), modo sin conexión de la PWA (service worker).
