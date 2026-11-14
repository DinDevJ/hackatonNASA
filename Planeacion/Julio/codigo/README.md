# Código verificado

## `smart_fusion.py` + `validar_smart_fusion.py`

Estimación de frecuencia respiratoria desde el PPG, **implementada y validada contra
25 registros reales de PhysioNet**. Resultados y decisiones de producto en
[RESULTADOS-smart-fusion.md](RESULTADOS-smart-fusion.md).

Titular: por ventana apenas supera a un número constante (+15 %), pero **agregada en
un valor diario la correlación sube a 0,69 y el error baja a 1,34 rpm**. Eso valida
que el producto compare contra la línea base propia en vez de mostrar lecturas
instantáneas.


## `heart-rate.ts`

Lectura de frecuencia cardiaca por Web Bluetooth, perfil GATT estándar
(`0x180D` / `0x2A37`), tipada y en módulo reutilizable.

### Estado: verificado

- ✅ **Compila** con `tsc` en modo severo: `strict`, `exactOptionalPropertyTypes`,
  `noUncheckedIndexedAccess`, `noUnusedLocals`.
- ✅ **14 pruebas pasan**, incluida la de los bytes reales capturados del
  HUAWEI WATCH 5 (`06 4b` → 75 bpm, contacto detectado, sin RR).

### Dependencias

```bash
npm i -D typescript @types/web-bluetooth
```

Y en `tsconfig.json`: `"types": ["web-bluetooth"]`. Los tipos de Web Bluetooth
**no vienen en `lib.dom`**; sin ellos `navigator.bluetooth` no compila.

### Uso

```ts
import { HeartRateMonitor, isWebBluetoothAvailable } from './heart-rate.js';

if (!isWebBluetoothAvailable()) {
  // Safari en iOS cae aquí. Ofrecer importar archivo en vez del botón.
}

const monitor = new HeartRateMonitor();

monitor.onSample((s) => {
  console.log(s.bpm, 'bpm', s.sensorContact ? '' : '(correa floja)');
  if (s.rrIntervalsMs.length) {
    // Sólo con banda pectoral: aquí se puede calcular RMSSD.
  }
});

// Tiene que nacer de un clic, o el navegador lo bloquea.
boton.addEventListener('click', () => monitor.connect());
```

Tras la primera muestra, `monitor.capabilities` dice si el dispositivo entrega
intervalos RR. **La interfaz debe decidir con eso si muestra HRV o no**, en vez de
suponerlo.

### Correr las pruebas

```bash
npx tsc heart-rate.ts heart-rate.test.ts --target ES2022 --module nodenext \
  --moduleResolution nodenext --types web-bluetooth --strict --outDir out
node out/heart-rate.test.js
```

### Diferencias con el script original de Julio

| Script original | Este módulo |
|---|---|
| `acceptAllDevices: true` | `filters: [{ services: [0x180D] }]` — el selector sólo muestra sensores de FC |
| Sólo detectaba *si había* RR (bit 4) | **Decodifica** los RR, convirtiendo de unidades de 1/1024 s a ms |
| Suponía FC de 8 bits | Soporta también el formato de 16 bits (bit 0 de los flags) |
| Ignoraba el contacto del sensor | Lo expone como `true` / `false` / `null` |
| Sin manejo de desconexión | Escucha `gattserverdisconnected` |
| `console.log` | Suscriptores, para que lo consuma la interfaz |
