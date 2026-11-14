# Trama base de telemetría

El software **no habla con relojes: habla con esta trama.**

---

## 1. Por qué existe

Probando el reloj descubrimos que el hardware manda sobre el diseño: el Watch 5 entrega
frecuencia cardiaca, no entrega intervalos entre latidos, y no entrega la señal cruda
del fotopletismógrafo. Cada dispositivo decide qué publica.

🔶 **La salida es invertirlo.** Definimos la trama que *debería* entregar un reloj, un
brazalete, un traje instrumentado o el hábitat, y el software consume siempre eso. El
hardware pasa a ser un detalle del adaptador.

Así es como funciona la aviónica de verdad: **interfaces definidas, no dependencia de un
fabricante.** Y encaja con el estándar de interoperabilidad que Fani encontró.

```
  reloj ──┐
  traje ──┤
  hábitat ┼──►  TRAMA  ──►  motor de reglas  ──►  semáforo · protocolo · voz
  manual ─┤
  sintético ┘
```

---

## 2. Tres cosas van dentro por diseño

| | Por qué |
|---|---|
| **`t_scet` obligatorio** | Es cuándo **ocurrió**, no cuándo llegó. Ordenar por hora de recepción produce una historia clínica falsa |
| **`origin` en cada muestra** | Un valor **estimado** no se pinta igual que uno **medido**. Si no se distingue, se miente sin querer |
| **`quality` junto al valor** | Una lectura con la correa floja **se guarda marcada**, no se descarta en silencio ni se usa como buena |

---

## 3. La trama

```json
{
  "frame": "eva.telemetry.v1",
  "source": { "id": "wrist-01", "kind": "wrist",
              "make": "HUAWEI", "model": "WATCH 5", "sclk": "D112T07:42:11" },
  "subject": "MS-2",
  "t_scet": "2027-03-18T07:42:09Z",
  "t_ert":  null,
  "owlt_s": null,
  "seq": 10452,
  "samples": [
    { "var": "04:A4", "value": 75, "unit": "bpm",
      "origin": "sensor", "quality": { "contacto": true }, "tipo_umbral": "T" },

    { "var": "04:A2", "value": 14.2, "unit": "brpm",
      "origin": "estimated",
      "quality": { "ic95": [8.8, 19.6], "descartadas": 7 },
      "method": "smart-fusion/riav+riiv+rifv", "tipo_umbral": "T" }
  ]
}
```

### Los campos que más cuestan de entender

**`var` lleva su catálogo.** `04:A4`, no `"ritmo cardiaco"`. Ata cada muestra a una
definición escrita en los catálogos de Iker. **La validación rechaza un nombre libre.**

**`method` no es decoración.** La HRV no significa lo mismo si es RMSSD o SDNN, y los
fabricantes no coinciden. Leo lo señaló en su resumen. Sin este campo **los datos no son
comparables entre dispositivos**.

**`tipo_umbral`** distingue `[A]` validado en astronautas de `[T]` clínico terrestre,
siguiendo la convención de Iker. Casi todos los nuestros son `[T]`, y hay que decirlo.

**`value: null` no es lo mismo que omitir la muestra.** `null` es "se intentó y no hay
dato"; omitirla es "este dispositivo no da esto".

### Regla dura de la validación

🔴 **Un valor `estimated` sin `ic95` ni `method` se rechaza.** No se muestra un número
estimado sin su incertidumbre. Es el mismo principio del botón de procedencia del motor
diagnóstico, aplicado a la entrada.

---

## 4. Declaración de capacidades

Antes de recibir nada, el software pregunta **qué sabe dar** este dispositivo:

```json
{
  "frame": "eva.capabilities.v1",
  "source": { "id": "wrist-01", "kind": "wrist" },
  "provides": [
    { "var": "04:A4", "unit": "bpm", "origin": "sensor", "rate_hz": 1 }
  ]
}
```

🔶 **La interfaz se adapta a esto en vez de suponer.** Si el dispositivo no declara HRV,
la pantalla de HRV **no existe** — no sale vacía ni con un cero. Es la generalización de
lo que ya hacía `monitor.capabilities` con el reloj.

---

## 5. Los adaptadores

```
telemetry.ts   La trama, los tipos y el validador
adapters.ts    FuenteReloj (Bluetooth) y FuenteManual
```

Todos cumplen `FuenteTelemetria`, así que **el motor no sabe qué hay detrás**:

```ts
const fuente: FuenteTelemetria = new FuenteReloj('MS-2');

fuente.alRecibir((trama) => {
  const { ok, problemas } = validarTrama(trama);
  if (!ok) return registrarRechazo(problemas);   // nunca se deja pasar "a ver si va"
  motor.ingerir(trama);
});

await fuente.iniciar();
```

**Añadir un traje instrumentado mañana es escribir un adaptador más.** Nada del análisis
cambia.

### Utilidades que resuelven problemas reales

| Función | Qué problema resuelve |
|---|---|
| `ordenarPorSCET()` | Las tramas llegan desordenadas tras un hueco de enlace |
| `deduplicar()` | Hay reenvíos; aplicar dos veces no puede duplicar nada |
| `antiguedadMin()` | Tierra **siempre** muestra cuántos minutos tiene el dato |
| `serie()` | Saca la historia de una variable para la línea base móvil |

---

## 6. Estado

✅ `telemetry.ts` y `adapters.ts` **compilan en modo severo**
(`strict`, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`).
✅ **14 pruebas pasan**: validación, orden por SCET, deduplicación, antigüedad, series y
RMSSD.

### Lo que falta

- `FuenteSintetica`, que generará los 180 días del escenario. **Es el siguiente paso y
  lo que la demo necesita para existir.**
- `FuenteHabitat` para la telemetría de la nave, que en la demo será simulada salvo la
  radiación, que sale de los 119 eventos reales de DONKI.
