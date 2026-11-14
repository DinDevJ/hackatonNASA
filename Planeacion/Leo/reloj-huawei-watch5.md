# HUAWEI WATCH 5 — cómo funciona y qué da para mis variables

El reloj del equipo para la captura real. Resumen de lo que probó Julio
([../Julio/hardware-y-radio.md](../Julio/hardware-y-radio.md), [../Julio/codigo/](../Julio/codigo/))
más la hoja oficial de Huawei.

✅ verificado · ⚠️ no confirmado · 🔴 problema · 🔶 decisión nuestra

## 1. Qué tiene el reloj

✅ Hoja oficial de especificaciones (consumer.huawei.com, WATCH 5, abierta el 14-11-2026):

| Sensores | Funciones de salud que anuncia Huawei |
|---|---|
| Acelerómetro, giroscopio, brújula, barómetro, profundidad | FC continua, **TruSleep™** (sueño) |
| **Sensor óptico de FC 6.0** | **SpO₂** con el dedo en el sensor X-TAP (10 s) |
| **Sensor de luz ambiental** | ECG a demanda, estrés, métrica de **HRV** dentro de la app |
| Temperatura de la piel, **ECG**, **X-TAP** | "Health Glance": 11 indicadores en ~1 min |
| Bluetooth 5.2 (BR + BLE), Wi-Fi 6 | Batería: 4,5 días estándar; 7 días típico en ahorro |

## 2. Cómo salen los datos: dos caminos

| Camino | Qué da | Estado |
|---|---|---|
| **En vivo por Bluetooth** (Web Bluetooth, servicio estándar de FC `0x180D` / `0x2A37`) | **Solo FC** (~1 por segundo) + **contacto del sensor con la piel** | ✅ Probado por Julio: paquete `06 4b` → 75 lpm, contacto detectado |
| **Exportar desde Huawei Health** e importar el archivo | Sueño (TruSleep), entrenamientos, SpO₂, etc. | ⚠️ Plan B de Julio; **formato del archivo no verificado**: hace falta una exportación real de su reloj |

### 🔴 Las restricciones del camino en vivo (probadas por Julio)

1. Solo funciona con **"Difusión de datos de FC"** activa, y el WATCH 5 solo la permite en
   **modo de ahorro de batería**.
2. Mientras transmite, se **desconecta de Huawei Health**.
3. **No envía intervalos RR → no hay HRV en vivo** (el HRV que muestra la app de Huawei no sale por Bluetooth).
4. Web Bluetooth **no existe en Safari/iOS**: el teléfono tiene que ser **Android con Chrome**.

### 🔥 Ventaja: indicador de calidad

El reloj dice si el sensor **toca la piel**. Las muestras con la correa floja se descartan
solas. Mi adaptador lo aplica junto con tu regla de FC > 220 lpm = artefacto.

## 3. Qué da para mis 78 variables

| Cómo | Variables | Nº |
|---|---|---:|
| ✅ **En vivo** por Bluetooth | `02:V52` FC por etapa de esfuerzo · `02:V53` intensidad de sesión | 2 |
| ⚠️ **Exportación** de Huawei Health | `03:V30` sueño total · `V33` tiempo en cama · `V34` eficiencia · `V35` latencia · `V36` WASO (TruSleep) · `02:V56` minutos de ejercicio | 6 |
| ⚠️ Cálculo sobre la exportación | `03:V31` % noches < 6 h · `03:V43` deuda de sueño | 2 |
| ❌ **No lo da** | `02:V92` glucosa (necesita parche CGM aparte) · `03:V49` lux (el sensor existe, pero no se encontró cómo exportar el valor ⚠️) · las otras 66 | 68 |

🔶 Hasta tener una exportación real, el Tipo A sigue usando los datos abiertos de MMASH y
CGMacros (actígrafo y Fitbit) como sustituto, ya marcados como tales.

⚠️ **TruSleep es un algoritmo propietario.** Sus fases y su "eficiencia" no tienen por qué
coincidir con las del actígrafo de NASA: hay que guardar la definición de cada métrica y
comparar solo contra la línea base de la misma persona.

## 4. Código

| Archivo | Qué hace |
|---|---|
| [../Julio/codigo/heart-rate.ts](../Julio/codigo/heart-rate.ts) | Conecta el reloj por Web Bluetooth y decodifica cada paquete (de Julio) |
| [ingesta/src/reloj/huawei-watch5.ts](ingesta/src/reloj/huawei-watch5.ts) | Convierte esas muestras en lecturas V52 y V53 del contrato del equipo |
| [ingesta/src/reloj/huawei-watch5.test.ts](ingesta/src/reloj/huawei-watch5.test.ts) | Prueba con el paquete real `06 4b`: ✅ pasa (`npm run test:reloj`) |

## 5. Lo que falta para usarlo de verdad

1. **Una exportación real de Huawei Health** del reloj de Julio, para escribir el lector de sueño y entrenamientos.
2. Confirmar qué sensores siguen activos en **modo ahorro de batería** (pendiente desde el documento de Julio).

## Fuentes

- ✅ Huawei, especificaciones del WATCH 5: https://consumer.huawei.com/mx/wearables/watch-5/specs/ y https://consumer.huawei.com/en/wearables/watch-5/specs/
- ✅ Huawei, página del producto (SpO₂ X-TAP, Health Glance, HRV): https://consumer.huawei.com/en/wearables/watch-5/
- ✅ Huawei, difusión de datos de FC (cita el WATCH 5 y el modo ahorro): https://consumer.huawei.com/kh/support/content/en-us15827504/
- ✅ Prueba de Julio con su reloj, 14-11-2026: [../Julio/hardware-y-radio.md](../Julio/hardware-y-radio.md)
