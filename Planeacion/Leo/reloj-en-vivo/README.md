# Reloj en vivo — HUAWEI WATCH 5 por Bluetooth

Página local para ver la **frecuencia cardiaca en vivo** del reloj y grabar una sesión de
ejercicio como variable `02:V53` en el formato del equipo.

Usa el módulo de Julio ([../../Julio/codigo/heart-rate.ts](../../Julio/codigo/heart-rate.ts)) para conectar y
decodificar, y mi adaptador ([../ingesta/src/reloj/huawei-watch5.ts](../ingesta/src/reloj/huawei-watch5.ts)) para
convertir al contrato. No modifica el código de Julio.

## Arrancar

```bash
cd Planeacion/Leo/ingesta
npm install
npm run reloj
```

Abrir **http://localhost:8090** en **Chrome o Edge**. `npm run reloj` compila la página y
levanta un servidor local sin dependencias extra.

## Preparar el reloj

1. Activar el **modo de ahorro de batería** (el WATCH 5 solo transmite así).
2. **Ajustes → Difusión de datos de FC** → activar. Se desconecta de Huawei Health mientras transmite.
3. En la página: **Conectar reloj** y elegirlo en la ventana del navegador.

## ⚠️ Dónde abrir la página

Web Bluetooth solo funciona en `localhost` o con HTTPS.

| Opción | Cómo | Estado |
|---|---|---|
| **En la PC** (Chrome o Edge en Windows, con Bluetooth) | Abrir `http://localhost:8090` | ⚠️ No probado con el WATCH 5; Julio solo lo probó en Android |
| **En el teléfono Android**, reenviando el puerto por USB | Con depuración USB: `adb reverse tcp:8090 tcp:8090` y abrir `http://localhost:8090` en Chrome del teléfono | ⚠️ Técnica estándar de Chrome, no probada aquí |
| Abrir la IP de la PC desde el teléfono (`http://192.168…`) | — | ❌ No funciona: no es `localhost` ni HTTPS |

## Qué hace

- FC en vivo (~1 por segundo), contacto del sensor y gráfica de los últimos 2 minutos.
- Descarta muestras con la **correa floja** y las mayores de **220 lpm**.
- **Sesión** → `02:V53`: FC media, FC pico y % del tiempo por encima del 70 % y 90 % de la FC máxima
  (Tanaka: 208 − 0,7 × edad). Descarga en JSON con el contrato del equipo, más las muestras crudas en CSV.
- **Modo demo** sin reloj: paquetes sintéticos con el mismo formato que el WATCH 5, pasados por el mismo
  decodificador. Sus lecturas salen marcadas `simulado_controlado`.

## Qué no hace

- **HRV:** el WATCH 5 no envía intervalos RR por Bluetooth.
- Sueño, SpO<sub>2</sub>, estrés: solo están en Huawei Health.

## Probado

✅ En el navegador del panel (Chromium), en modo demo: conexión, gráfica, descarte por correa floja,
sesión de 79 muestras → 4 lecturas `02:V53`, sin errores en consola, y vista de teléfono.
❌ **Falta probarlo con el reloj real.**
