# EVA · Computadora central + LUNNA

Recibe tramas de cualquier dispositivo, las atribuye al tripulante correcto, las guarda,
y avisa cuando un signo vital se sale de **lo esperado para esa persona en ese entorno**.

**LUNNA** — *Live-telemetry Updating Network for Nominal-deviation & Anomalies* — es el
modelo que define "lo esperado".

```bash
npm start      # servidor; http://localhost:8787 = estado · /simulador = simulador visual
npm run sim    # simulador de hardware: 119 días de misión y luego en vivo
npm test       # 19 pruebas
```

Requiere **Node 22.6+** y nada más: SQLite y TypeScript vienen integrados en Node.
**Cero dependencias**, así que no hay `npm install`.

---

## Arquitectura

```
 playera (ESP32) ─┐  binaria, perfil EVA, BLE directo
 brazalete ───────┤
 simulador ───────┘
                 ┌──────────────────── COMPUTADORA CENTRAL ────────────────────┐
 reloj ───┐ JSON │  dispositivo → tripulante → decodificar → fórmula → validar │
 celular ─┘      │       (tabla de asignaciones)   (esquema)                   │
                 │                         │                                   │
 semillas ──────►│                    SQLite ──► LUNNA ──► alerta              │
 (Leo, Iker)     └─────────────────────────┬───────────────────┬───────────────┘
                                           │                   │
                               REST + eventos en vivo     cola para Tierra
                                    (Fany)                (rojo primero)
```

---

## Contratos por equipo

### Fany · interfaz central

| Para | Llamada |
|---|---|
| Ver todo en vivo | `GET /api/stream` — eventos `muestra`, `alerta`, `rechazo` (SSE) |
| Estado actual de la tripulación | `GET /api/estado` |
| Gráfica de una variable | `GET /api/muestras?tripulante=ana&variable=04:A4&desde=…` |
| Predicción y banda esperada | `GET /api/prediccion/ana` |
| Alertas | `GET /api/alertas` |
| Editar variables · esquemas · dispositivos | `GET/POST /api/variables` · `/api/esquemas` · `/api/dispositivos` |
| Tripulantes, basales e historial | `GET/POST /api/tripulantes` · `PUT …/:id/basales` · `POST …/:id/historial` |
| Ponerse un dispositivo | `POST /api/asignaciones` `{ dispositivo, tripulante }` |
| Fases de la misión | `GET/POST /api/fases` `{ desde, entorno }` |
| Enlace con Tierra | `GET/PUT /api/enlace` `{ owlt_s, abierto }` |
| Lo que ha llegado a Tierra | `GET /api/tierra/bandeja` (con la antigüedad de cada cosa) |
| Tierra manda un aviso | `POST /api/tierra/avisos` `{ para, texto, prioridad }` |
| Avisos ya llegados a la nave | `GET /api/avisos` |

Eventos de `/api/stream`: `muestra`, `alerta`, `rechazo`, `tierra` (algo llegó a Tierra),
`aviso` (un aviso de Tierra llegó a la nave) y `enlace`.

```js
const es = new EventSource('http://localhost:8787/api/stream');
es.addEventListener('alerta', (e) => mostrar(JSON.parse(e.data)));
```

Cada predicción trae `pesos: { poblacion, historial, vuelo }`: es el botón
**"¿de dónde sale esto?"** ya calculado.

### Katia y Diana · dispositivos intermedios

Celular o reloj reenvían por `POST /api/tramas` (una trama o una lista):

```json
{
  "frame": "eva.telemetry.v1",
  "source": { "id": "reloj-ana", "kind": "wrist" },
  "subject": "ana",
  "t_scet": "2027-03-18T07:42:09Z",
  "seq": 10452,
  "samples": [
    { "var": "04:A4", "value": 75, "unit": "bpm", "origin": "sensor", "quality": { "contacto": true } }
  ]
}
```

- `source.id` tiene que estar registrado como dispositivo (`perfil: "json"`).
- `t_scet` es cuándo **ocurrió**, no cuándo se envía.
- `subject` es respaldo: si el dispositivo está asignado, **manda la asignación**.
- `quality.contacto: false` → se guarda, pero LUNNA no la evalúa.
- `origin: "estimated"` sin `method` ni `quality.ic95` → **se rechaza**.

### Leo e Iker · semillas

- **Datos:** `POST /api/semillas` con su `SalidaTipo` tal cual
  (`Planeacion/Leo/ingesta/src/contrato.ts`). Variables y sujetos que falten se registran solos.
- **Priores para LUNNA:** `PUT /api/priores`, uno por variable y entorno:

```json
{ "variable": "01:V1", "entorno": "orbita", "escala": "relativa",
  "mu0": -0.067, "tau0": 0.05, "sigma_mision": 0.03, "sigma_dia": 0.05,
  "extrapolado": false,
  "fuente": "cat.01 V1: media 24 h sistólica −8 ± 2 mmHg (n = 8)" }
```

`mu0` es el cambio medio (relativa: −0,067 = −6,7 %; absoluta: unidades). **Un prior
sin `fuente` se rechaza.** Lo que necesitamos de ellos: las variables definitivas y, para
cada una, `mu0` y `tau0` con su fuente. Hoy casi todos son provisionales.

### Hardware · perfil EVA binario

Lo que manda el ESP32 de la playera, el brazalete y el simulador, little-endian:

```
┌ cabecera, 13 B ──────────────────────────────────────┬ carga ────────────────┐
│ ver u8 │ id_disp u32 │ id_esquema u16 │ seq u16 │ t_scet u32 │ según esquema │
└──────────────────────────────────────────────────────┴───────────────────────┘
```

`POST /api/tramas/binaria` con el cuerpo crudo, o `{ "b64": "…" }`, o
`{ "b64": ["…", "…"] }` en lote. `src/esquema.ts` trae `codificar()` y `decodificar()`:
el firmware sólo tiene que replicar `codificar()`.

---

## Agregar un sensor nuevo

Lo que pediste: poner un sensor en el traje y declararlo desde la interfaz, sin tocar
código.

```bash
# 1. La variable: nombre, descripción, unidad
POST /api/variables
{ "id": "X:TPIEL", "nombre": "Temperatura de piel", "unidad": "°C",
  "descripcion": "Termistor en el pecho del traje", "procedencia": "sensor" }

# 2. La trama: dónde llega, de qué tipo, y la fórmula
POST /api/esquemas
{ "nombre": "traje-v1", "campos": [
    { "clave": "fc",    "variable": "04:A4",   "tipo": "u8" },
    { "clave": "tpiel", "variable": "X:TPIEL", "tipo": "u16", "formula": "x / 100 - 40" } ] }
# → responde con un id nuevo: el esquema viejo sigue decodificando las tramas viejas

# 3. El dispositivo pasa a usarlo
POST /api/dispositivos  { "id": 102, ..., "esquema_id": <id nuevo> }
```

**Fórmulas.** Aritmética, `sqrt abs log log10 exp round floor ceil min max pow`, y otros
campos de la misma trama por su clave: `(sis + 2 * dia) / 3`. Un campo **sin tipo** es
virtual: no ocupa bytes y sale sólo de su fórmula. **Nunca se usa `eval`**: es un
intérprete propio que rechaza todo lo demás, y la fórmula se valida al guardar, no al
recibir. Las variables que añade el equipo usan el prefijo `X:`.

---

## LUNNA

Actualización bayesiana en tres capas. Cada una pesa según cuánta evidencia aporta:

| Capa | Fuente | Ejemplo |
|---|---|---|
| ① Prior poblacional | Literatura (catálogos de Iker) | PA sistólica −6,7 % en órbita |
| ② Historial personal | Misiones previas importadas | "En Artemis su FC bajó 10 %" |
| ③ Calibración | Sus primeros 14 días en el entorno | Mediana diaria de cada día |

Sin datos propios manda la literatura; con una misión previa, su historial; tras la
calibración, sus datos. **La predicción siempre trae su banda del 95 %**, y cada alerta su
`prob_nominal`: la probabilidad de ver esa desviación si la persona siguiera normal.

Relación con la fórmula de Bayes del cuaderno, firmware del ESP32 y pasarela Bluetooth:
**[../INTEGRACION.md](../INTEGRACION.md)**.

### Resultado con el simulador

4 tripulantes · 7 variables · 119 días · 6 188 tramas binarias:

- Predicción de la FC de Ana: **57,4 bpm** (respuesta real simulada: −8 %, predicha −7,6 %)
- Pesos: literatura **1 %** · historial **11 %** · vuelo **88 %**
- **2 alertas, ambas verdaderas**: su fatiga, ámbar el día 111 y rojo el 112 (z = 3,34)
- **Cero falsos positivos** en el resto de la tripulación

⚠️ Datos **sintéticos**, con el escenario escrito a propósito. Demuestra que la tubería
funciona; no valida el modelo contra personas reales.

---

## Decisiones de diseño

| Decisión | Por qué |
|---|---|
| **El tripulante no va en la trama** | El dispositivo no sabe quién lo lleva. Los trajes se reutilizan: si el ID va grabado, los signos vitales se atribuyen a otro. Lo resuelve la tabla de asignaciones, con intervalo de tiempo |
| **La calibración se congela a los 14 días** | Si siguiera aprendiendo, una deriva lenta como la fatiga se absorbería como "su nueva normalidad" y nunca saltaría |
| **Se evalúa la mediana de 24 h** | La validación de Smart Fusion mostró que el valor instantáneo apenas supera a una constante; el agregado sí tiene señal |
| **Sólo los cambios de estado generan alerta** | Sin esto, cada muestra fuera de banda sería una alerta nueva |
| **El tipo de sangre no entra en el modelo** | No hay evidencia de que prediga la adaptación. Se guarda en el perfil, pesa cero |
| **Luna, tránsito y Marte van marcados como extrapolados** | No hay datos humanos. Se derivan de órbita con la incertidumbre duplicada |
| **Editar un esquema crea una versión nueva** | Las tramas antiguas deben seguir leyéndose con el esquema con que se enviaron |

---

## Archivos

```
src/formula.ts     intérprete de fórmulas seguro
src/esquema.ts     perfil EVA: cabecera, esquemas, codificar y decodificar
src/lunna.ts       el modelo
src/db.ts          esquema de la base de datos
src/ingesta.ts     tubería: asignación, decodificación, guardado y vigilancia
src/semillas.ts    configuración inicial e importación del contrato de Leo
src/enlace.ts      enlace con Tierra: retraso de la luz, ventanas y avisos de vuelta
src/servidor.ts    API REST y eventos en vivo
src/simulador.ts   simulador de terminal: 4 tripulantes, 119 días
web/simulador.html simulador visual (astronauta, dispositivos, PC central, Tierra) en /simulador
semillas/inicial.json   tripulación, esquemas y priores PROVISIONALES
```

## Pendiente

- **Priores reales** de Leo e Iker: hoy la mayoría son no informativos y lo dicen
- **Fusión** cuando dos dispositivos miden lo mismo (traje y reloj): hoy se guardan ambos
- **Verificación cruzada de asignación**: si traje y reloj del mismo tripulante discrepan mucho, avisar de una posible asignación equivocada
- **Traducir perfiles Bluetooth estándar** (ritmo cardiaco, presión arterial) en la pasarela, para aceptar relojes y brazaletes comerciales
- **Histéresis** en las alertas para que no oscilen ámbar–verde cerca del umbral

## Créditos

Foto de la Tierra en el simulador: *Blue Marble*, tomada por la tripulación del Apolo 17
el 7 de diciembre de 1972 (NASA, dominio público). Descargada de la página de la NASA
"Blue Marble - Image of the Earth from Apollo 17" (www.nasa.gov) e incrustada en
`web/simulador.html` para que la maqueta funcione sin internet.
