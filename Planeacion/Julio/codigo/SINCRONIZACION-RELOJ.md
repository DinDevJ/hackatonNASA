# Sincronización con el reloj: cómo llega cada variable

Qué entrega el reloj, por qué camino, y qué hay que hacer con lo que no entrega.

✅ verificado en hardware · ⚠️ por confirmar · 🔶 decisión nuestra

---

## 1. El límite que manda sobre todo lo demás

**Web Bluetooth sólo entrega lo que el reloj publica por GATT estándar.**

Un reloj mide muchas cosas, pero **casi todas se quedan dentro de la app del
fabricante**. Lo que sale por Bluetooth a terceros es un subconjunto pequeño, y cada
modelo decide cuál.

Y hay un segundo límite: **no se pueden descubrir servicios que no se declaren antes**.
Hay que pedir una lista de UUID candidatos y ver cuáles responden. No existe la
exploración libre.

🔶 Por eso `watch.ts` trae `descubrirServicios()` y la página de prueba tiene la
sección 5: **es la única forma honesta de saber qué da un reloj concreto.**

---

## 2. ✅ Lo verificado en el HUAWEI WATCH 5

Capturado el 14-11-2026 con `heart-rate.ts`. Paquetes de **2 bytes**, por ejemplo `06 4b`:

```
flags = 0x06 = 0000 0110
  bit 0 = 0  ->  frecuencia cardiaca en 8 bits
  bit 1 = 1  ->  contacto del sensor DETECTADO
  bit 2 = 1  ->  contacto del sensor SOPORTADO
  bit 3 = 0  ->  sin energía gastada
  bit 4 = 0  ->  SIN intervalos entre latidos
```

| Dato | ¿Llega? | Consecuencia |
|---|---|---|
| Frecuencia cardiaca | ✅ Sí, ~1 Hz, limpia | `04:A4` resuelta |
| **Contacto del sensor** | ✅ **Sí** | 🔥 Indicador de calidad gratis |
| **Intervalos entre latidos** | 🔴 **No** | **Sin HRV.** Ni RMSSD ni SDNN |
| Energía gastada | ❌ No | Irrelevante |

**Condiciones del fabricante:** la difusión funciona en este modelo **sólo en modo de
ahorro de batería**, y mientras transmite **se desconecta de la app Huawei Health**.

---

## 3. Cómo llega cada variable de mi grupo G1

| ID | Variable | Camino | Estado |
|---|---|---|---|
| `04:A4` | Frecuencia cardiaca | **Sensor.** GATT `0x180D` → `0x2A37`, notificaciones | ✅ **Funcionando** |
| `01:V3` | FC en reposo | **Derivada.** Mediana de la ventana de 30 min más quieta, descartando muestras sin contacto | ✅ `fcEnReposo()` en `watch.ts` |
| `01:V48` | ΔFC al ponerse de pie | **Derivada.** FC antes y después del cambio postural | ⚠️ Necesita el acelerómetro, que el reloj no publica. **Marcar el momento a mano** |
| `04:A3` | SpO2 | **Sensor,** GATT `0x1822` → `0x2A5F` | ⚠️ **Casi ningún reloj lo publica.** Correr la sección 5 para saberlo |
| `01:V29` | Minutos y tipo de ejercicio | Acelerómetro | 🔴 **No sale por GATT.** Exportar de la app |
| `04:A2` | Frecuencia respiratoria | **Estimada** del PPG con Smart Fusion | ⚠️ Necesita la señal PPG cruda, que **el reloj no publica**: sólo da el pulso ya calculado |
| `01:V23` | Tiempo de tránsito de onda de pulso | Dos puntos de medición | 🔴 Fuera de alcance |

### 🔴 El hallazgo incómodo

**`04:A2` depende del PPG crudo, y el reloj no lo da.** Smart Fusion necesita la forma de
onda para extraer las tres modulaciones respiratorias; el perfil estándar sólo entrega
los latidos por minuto ya calculados.

Así que la frecuencia respiratoria validada contra BIDMC **funciona sobre el dataset,
pero no sobre este reloj.** Sigue siendo trabajo válido y demostrable —es análisis real
sobre datos reales— pero **no entra en la captura en vivo**. Hay que decirlo así.

---

## 4. Las tres vías de entrada, y cuándo usar cada una

```
  ① BLE en vivo        reloj ─GATT→ app          FC y contacto del sensor
  ② Exportar archivo   app fabricante → archivo  SpO2, sueño, pasos
  ③ Entrada manual     el astronauta lo teclea   PA, glucosa, síntomas
```

🔶 **Las tres son legítimas y las tres van en el producto.** El error sería prometer que
todo entra por la vía ①. Según el listado de variables, de mis 75:

- **5** llegan por el reloj
- **29** las teclea o mide una persona
- **11** las informa la nave

**La entrada manual es el componente más grande, no el Bluetooth.**

---

## 5. El código

```
codigo/heart-rate.ts   Frecuencia cardiaca: conexión, decodificación, suscriptores
codigo/watch.ts        Descubrimiento de servicios, batería, info, SpO2, FC en reposo
```

Ambos compilan en modo severo (`strict`, `exactOptionalPropertyTypes`,
`noUncheckedIndexedAccess`). `heart-rate.ts` tiene **14 pruebas que pasan**, una de ellas
contra los bytes reales del reloj.

### Uso

```ts
import { HeartRateMonitor } from './heart-rate.js';
import { descubrirServicios, fcEnReposo } from './watch.js';

// Qué da este reloj en concreto. Desde un clic.
const { nombre, encontrados, noDisponibles } = await descubrirServicios();

// Captura continua.
const monitor = new HeartRateMonitor();
const muestras: Array<{ bpm: number; contacto: boolean | null; t: Date }> = [];

monitor.onSample((s) => {
  muestras.push({ bpm: s.bpm, contacto: s.sensorContact, t: s.receivedAt });
  if (s.sensorContact === false) {
    // 🔥 Correa floja: la muestra se guarda marcada, no se descarta en silencio.
  }
});

boton.addEventListener('click', () => monitor.connect());

// Al cerrar el día:
const reposo = fcEnReposo(muestras);   // null si no hay datos suficientes
```

🔶 Tras la primera muestra, `monitor.capabilities` dice si **ese** dispositivo entrega
intervalos RR. **La interfaz decide con eso si muestra HRV, en vez de suponerlo**, así
el mismo código sirve para este reloj y para una banda pectoral.

---

## 6. ⚠️ Qué falta confirmar

- **Correr la sección 5 de la página** contra el Watch 5 y apuntar qué servicios salen.
  Define si `04:A3` (SpO2) entra por BLE o hay que exportarla
- Probar la **exportación desde Huawei Health**: qué formato y qué variables trae
- Si alguien consigue una **banda pectoral**, confirmar que sí manda intervalos RR y
  recuperar el HRV con el mismo código
