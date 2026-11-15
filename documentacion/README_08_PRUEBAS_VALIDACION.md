# 08 · Pruebas y validación

## 1. Tres niveles que no deben confundirse

| Nivel | Pregunta | Estado en LUNNA |
|---|---|---|
| **1. Validación técnica del software** | ¿El código hace lo que especifica? | Suites automatizadas en backend, simulación, interfaces y prototipo de salud. Mayoritariamente aprobadas (§3) |
| **2. Evaluación experimental de los algoritmos** | ¿Con qué rendimiento detectan lo que buscan, en datos con etiqueta? | Parcial: ECG sobre 4 registros públicos de PhysioNet; motor sobre Inspiration4 (n = 4); escenarios sintéticos escritos a propósito |
| **3. Validación clínica** | ¿Es seguro y útil en personas, y en particular en astronautas? | **No existe.** No hay ningún estudio clínico, prospectivo ni en vuelo |

> **LUNNA no está validado clínicamente.** Ningún resultado de este documento debe leerse como evidencia de eficacia diagnóstica.

## 2. Estrategia de pruebas

- **Pruebas unitarias y de integración** con el ejecutor integrado de Node (`node --test`), sin dependencias. Las bases son temporales o en memoria y los servidores usan puerto efímero.
- **Pruebas de API** que levantan el servidor HTTP real y verifican las formas de respuesta que consumen las interfaces.
- **Vectores compartidos** entre TypeScript, Python y C++ para el perfil EVA.
- **pytest** en el prototipo de salud, con `AppTest` de Streamlit para las vistas.
- **Escenarios simulados** con anomalías inyectadas, todos rotulados `simulated=true`.
- **Verificación manual** en navegador (Edge headless vía CDP) durante la reorganización del 15 de noviembre de 2026.

## 3. Pruebas automatizadas y resultados

### 3.1 Ejecutadas el 15 nov 2026 en Windows 11, Node 22.6+

| Suite | Comando | Pruebas | Aprobadas | Omitidas | Fallidas |
|---|---|---:|---:|---:|---:|
| Backend | `cd Sistema/backend` y luego `npm test` | 97 | 85 | 12 | 0 |
| Modo simulación | `cd Simulacion` y luego `npm test` | 4 | 4 | 0 | 0 |
| Motor del navegador y valor normal | `node --test Sistema/interfaces/eva/motor.test.mjs Sistema/interfaces/eva/alertas-motor.test.mjs` | 25 | 25 | 0 | 0 |
| Prototipo de salud | `python -m pytest` en `prototipo-salud/` (sin `test_paginas.py`, que requiere Streamlit) | 148 | 131 | 11 | 6 |

Omitidas en el backend y por qué:

- 8 de `enlace-https.test.ts`: necesitan openssl para generar el certificado de prueba;
- 4 de integración con el motor Python y el ECG reales: buscan los entornos de prueba Linux en `/tmp/nasa-linux-envs`.

Las 6 fallas del prototipo son del entorno de esta máquina, no del código:

- faltan los videos de `samples/`, que se descargan con `preparar_muestras.ps1`;
- falta `opencv` (`cv2`);
- una comparación byte a byte de un ejemplo regenerado cambia con los finales de línea CRLF de Windows.

En `envs\app` (`instalar_app.ps1`) estas dependencias quedan instaladas.

### 3.2 Contenido de las suites del backend

| Archivo | Cubre |
|---|---|
| [`unidad.test.ts`](../Sistema/backend/test/unidad.test.ts) | Fórmulas seguras, codificar/decodificar, modelo LUNNA |
| [`integracion.test.ts`](../Sistema/backend/test/integracion.test.ts) | Ingesta de punta a punta, asignaciones, deduplicación, alertas |
| [`umbrales.test.ts`](../Sistema/backend/test/umbrales.test.ts) | Umbrales absolutos, motivo `personal`/`umbral`/`ambos` |
| [`abordo.test.ts`](../Sistema/backend/test/abordo.test.ts) | Avisos de la CMO, consultas, emergencias |
| [`sincro.test.ts`](../Sistema/backend/test/sincro.test.ts) | Exactamente-una-vez: duplicados, ACK perdidos, orden |
| [`enlace-https.test.ts`](../Sistema/backend/test/enlace-https.test.ts) | Desconexión a mitad de lote, reenvío duplicado, pérdida de ACK, sha256 (requiere openssl) |
| [`salud.test.ts`](../Sistema/backend/test/salud.test.ts) | Tablas de padecimientos sembradas desde CSV |
| [`central.test.ts`](../Sistema/backend/test/central.test.ts) | Recursos de la central, formas de API, reloj en `/interfaces/reloj/`, compatibilidad `/maquetas`, modo operativo (404/403, sin escenario), modo inválido |
| [`semaforo.test.ts`](../Sistema/backend/test/semaforo.test.ts) | API del semáforo, pesos del usuario y restauración, ejecución del motor (con un Python falso y, si existe, con el real) |
| [`referencias-motor.test.ts`](../Sistema/backend/test/referencias-motor.test.ts) | Valor normal por variable de la última evaluación |
| [`modelos.test.ts`](../Sistema/backend/test/modelos.test.ts) | Cola de trabajos, validación del archivo (sin rutas ni `..`), timeout, puente y reevaluación con [`fixtures/python-falso.mjs`](../Sistema/backend/test/fixtures/python-falso.mjs) |

Suite de [`Simulacion/test/simulador.test.ts`](../Simulacion/test/simulador.test.ts): URLs del simulador (incluido el panel compartido), escenario en `/app/escenario/`, reinicio de la demo y generador de punta a punta.

### 3.3 Comunicación con hardware

| Prueba | Comando | Estado |
|---|---|---|
| Pasarela produce los mismos bytes que el backend | `python Sistema/pasarela/test_trama.py` | Aprobada en la reorganización del 15 nov |
| Firmware C++ contra vectores | `Sistema/esp32/test/test_trama.cpp` | **No ejecutada aquí** (falta g++). Los vectores se generan con `test/generar_vectores.ts` |
| Firmware en placa real | — | **No probado** |
| BLE de extremo a extremo | — | **No probado** |

### 3.4 Prototipo de salud (pytest)

| Fuente | Resultado |
|---|---|
| Registro de avance del equipo (Linux, 15 nov, ~01:10) | **98 aprobadas, 5 omitidas** (43 previas + 55 del motor) |
| Esta máquina (Windows, 15 nov, tras la integración) | **131 aprobadas, 11 omitidas, 6 fallas de entorno** (§3.1) |

> **Error corregido el 15 nov.** Una fusión anterior (PR #7, «valor-normal») había dejado marcadores de conflicto confirmados en `motor/normalizacion.py`, `motor/evadb.py` y `Planeacion/Leo/modelo-pesos/generar_pesos.py`. Por eso el motor Python no se podía importar y toda la suite fallaba. Se resolvieron así: las rutas nuevas (`Sistema/backend`) y las funciones del PR (ECG en `eva.db`, desglose de ligas y referencias en `evaluaciones`). Además, tres pruebas (`test_evadb`, `test_motor_eco`, `test_puente_modelos`) volvieron a apuntar a `Sistema/backend`; antes se omitían en silencio porque buscaban una carpeta que ya no existe.

Áreas que cubre la suite, por archivo:

- calidad e importación (`test_motor_entradas`, `test_sensores`);
- aritmética de d.7 y del score (`test_motor_score`);
- semáforo e histéresis (`test_motor_semaforo`);
- base congelada, cuarentena y no aprender puntos alertados (`test_motor_calibracion`);
- simulado nunca como real (`test_motor_simulado`);
- overrides (`test_motor_overrides*`);
- tripulación (`test_motor_tripulacion`);
- FEVI de eco y discordancia (`test_motor_eco`);
- puente con `eva.db` (`test_evadb`), que ejecuta `Sistema/backend/src/migrar.ts`;
- puente de modelos (`test_puente_modelos`);
- ECG (`test_ecg`);
- vistas con `AppTest` (`test_paginas`);
- Inspiration4 (`test_validacion_i4`);
- `verificar.py` (`test_verificacion`).

## 4. Evaluación experimental de algoritmos

### 4.1 Procesamiento de ECG

**Datos:** registros completos MIT-BIH Arrhythmia 100, 201, 203 y MIT-BIH AF 04015 (PhysioNet, ODC-By 1.0, pacientes hospitalarios). **Entorno:** Linux, CPU, Python 3.11 con las versiones del lock. Informe en `validacion/ecg/VALIDACION.md` (citado en el avance del equipo).

| Métrica | 100 | 201 | 203 | 04015 |
|---|---:|---:|---:|---:|
| Picos R, sensibilidad (±150 ms) | 0,9987 | 1,0000 | 0,9191 | — |
| Picos R, PPV | 1,0000 | 0,9718 | 0,9892 | — |
| Latidos irregulares (criterio RR), sensibilidad | 0,882 | 0,595 | 0,425 | — |
| Latidos irregulares, PPV | 1,000 | 0,450 | 0,234 | — |
| Bandera por segmento vs `(AFIB`, sensibilidad | — | 1,000 | 1,000 | 1,000 |
| Bandera por segmento, especificidad | 1,000 | 0,054 | 0,000 | 0,904 |

**Interpretación.** La bandera detecta **irregularidad del RR, no FA**: en 201 y 203 marca extrasístoles y trigeminismo. PR y QTc **no están validados**, porque no hay etiquetas para compararlos. La versión v2 se eligió después de ver la v1 sobre estos mismos registros, así que **no es una validación independiente**.

### 4.2 Ecocardiografía

| Prueba | Resultado |
|---|---|
| Prueba de carga de los 5 adaptadores (arquitectura sin pesos y tensor aleatorio) | Aprobada en Linux/CPU; **no es inferencia** |
| Rechazos por modalidad y vista (no A4C, Doppler, sin caja en MedSAM2, volumen 3D, PNG como video) | Aprobados |
| Inferencia real de PanEcho (PC de Iker, Windows, RTX 4050) | CPU 42,8 s → CUDA 17,4 s (run `20261114T105021_panecho_c753f120`). Reportado por Iker; el run no está en este repositorio |
| EchoNet-Dynamic, MedSAM2, EchoPrime, EchoCLIP | **Pendientes de inferencia real** |

No hay referencia clínica para comparar ninguna salida de eco.

### 4.3 Motor de padecimientos con datos simulados (brazo 2 de la especificación)

Escenarios con resultado esperado (especificación h.2):

| # | Escenario | Esperado |
|---|---|---|
| 1 | Todo dentro de la base, cobertura completa | VERDE |
| 2 | Falta el núcleo | GRIS, no VERDE |
| 3 | `sin_dato` | Faltante, nunca 0 |
| 4 | Salto brusco | Alerta; la media adaptativa no cambia |
| 5 | Rampa lenta | CUSUM; base intacta |
| 6 | Dato N4 | No actualiza, no da ROJO, no respalda VERDE |
| 7 | Intento de reescribir la base prevuelo | Rechazado y registrado |
| 8 | Puntos dentro de la cuarentena | Excluidos hacia atrás |
| 10 | Toda la tripulación se desvía a la vez | «Desviación compartida»; ninguna alerta individual se apaga |
| 13 | FEVE discordante entre modelos | No activa |
| 14 | Simulados mezclados con reales | El semáforo real no cambia |

Los escenarios 9, 11 y 12 (cambio de fase, tripulación de 3, capa fija incompleta) también están especificados.

Tripulación simulada `SIM-T01…T05`, 30 días, con un escenario por persona:

| Persona | Escenario |
|---|---|
| SIM-T01 | Control |
| SIM-T02 | Salto brusco |
| SIM-T03 | Rampa de sueño |
| SIM-T04 | Faltantes |
| SIM-T05 | Datos N4 |
| Todas | Excursión de CO₂ compartida |

Con los 7 runs de `validacion/ecg/runs` (canal real, solo lectura), la muestra con FA da P01 **AMARILLO «confirmar» y nunca ROJO**, porque todo es N4.

### 4.4 Inspiration4 (NASA OSDR, datos reales abiertos)

| Configuración | Resultado |
|---|---|
| Por defecto (n0_min = 5) | **80/80 celdas GRIS**: 3 tomas prevuelo no alcanzan para una base personal; el motor se niega a colorear |
| Sensibilidad n0_min = 3 | En R+1: potasio ↓ (C002 z −3,5; C003 z −2,4, con 3,0 mmol/L bajo el rango de laboratorio) y leucocitos ↓ en C003. Ningún ROJO; P17 AMARILLO en C004 en R+194 |
| Base completada con relleno SIMULADO | Ningún ROJO con ninguna semilla; los z cambian mucho entre semillas. **No es validación** |

Concordancia con Jones et al. 2024 y Kim et al. 2024 (casi todo vuelve a la línea base): solo por **ausencia de alertas**, con n = 4, sin datos en vuelo y sin signos vitales.

Dato dudoso en la fuente: C003 L-92 (plaquetas 12,9, neutrófilos 10,1). Es probable un error de unidades que la puerta de calidad no rechaza.

### 4.5 Escenario sintético del backend

4 tripulantes, 7 variables, 119 días y 6188 tramas binarias. Resultado: 2 alertas, ambas verdaderas (fatiga de Ana, ámbar el día 111 y rojo el 112, z = 3,34) y ninguna falsa en el resto. **El escenario se escribió a propósito**: demuestra la tubería, no la exactitud del modelo.

## 5. Errores identificados y corregidos

| Error | Corrección | Verificación |
|---|---|---|
| torch cu124 reemplazado por torch 2.15.0+cpu al instalar los locks | `scripts/torch-cu124-overrides.txt`, `--no-deps --override`, `Repair-TorchCuda`, `reparar_torch.ps1` | `uv pip compile` resuelve cu124; PanEcho en CUDA en la PC de Iker |
| EchoNet-Dynamic: `UnpicklingError` (`numpy.core.multiarray.scalar`) | `weights_only=True` con `safe_globals`; respaldo verificado por tamaño exacto | Con pesos aleatorios en Linux; **pendiente con pesos reales** |
| v1 de la bandera de FA con mala especificidad | v2 basada en Dash 2009 | No independiente (§4.1) |
| QTc experimental puede dar AMARILLO en un registro normal (mitdb 100: 335 ms) | Documentado como límite conocido | — |

## 6. Limitaciones

- No se ha medido la tasa de falsas alarmas: el ruido del conjunto simulado es acotado a propósito.
- Las pruebas de PowerShell solo comprueban que los `.ps1` se pueden leer (pwsh 7 en Linux); **no se probaron en Windows PowerShell 5.1**.
- No hay pruebas de carga, rendimiento ni concurrencia del backend.
- No hay pruebas de seguridad (ver [seguridad](README_10_SEGURIDAD_CONFIABILIDAD_RIESGOS.md)).
- Las interfaces no tienen pruebas automatizadas de interfaz, salvo `central.test.ts` (recursos y formas de API), `motor.test.mjs` y `alertas-motor.test.mjs`.

## 7. Pendiente de validación

1. Las 8 pruebas del enlace HTTPS con openssl disponible, y las 4 de integración con los entornos Python reales.
2. La suite pytest completa en Windows con `envs\app` (incluida `test_paginas.py`).
3. La inferencia real de EchoNet-Dynamic, MedSAM2, EchoPrime y EchoCLIP con pesos y CUDA, y los tiempos frente al timeout (1800 s; EchoPrime 3600 s).
4. El firmware en placa ESP32 y BLE de extremo a extremo.
5. La bandera de ritmo sobre registros de PhysioNet **no usados** para elegir la v2.
6. PR y QTc frente a una base con anotación de ondas.
7. Cualquier evaluación con datos de vuelo o de análogos.

## Documentación relacionada

- [Modelos computacionales y algoritmos](README_06_MODELOS_COMPUTACIONALES_ALGORITMOS.md)
- [Protocolo de investigación](README_02_PROTOCOLO_INVESTIGACION.md)
- [Instalación, configuración y despliegue](README_09_INSTALACION_CONFIGURACION_DESPLIEGUE.md)
- [Seguridad, confiabilidad y riesgos](README_10_SEGURIDAD_CONFIABILIDAD_RIESGOS.md)
