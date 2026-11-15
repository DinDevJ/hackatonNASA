# 01 · Planeación general del proyecto

**Proyecto:** EVA / LUNNA, monitoreo de salud para misiones espaciales
**Equipo:** Monarcas · NASA Space Apps Challenge 2026
**Fecha de revisión:** 15 de noviembre de 2026

> **Advertencia de alcance.** LUNNA es un prototipo educativo y de investigación desarrollado en un hackatón. No es un dispositivo médico, no diagnostica y no está validado para uso clínico, espacial ni en astronautas. La tripulación de demostración es ficticia y los datos de la demo son sintéticos.

## 1. Descripción general

El proyecto reúne tres bloques de software que comparten contratos de datos:

| Bloque | Ubicación | Qué es |
|---|---|---|
| **Sistema EVA/LUNNA** | [`Sistema/`](../Sistema/) | Computadora central (backend Node/TypeScript + SQLite), interfaces web (teléfono, computadora central, base en Tierra y reloj), pasarela Bluetooth y firmware de la playera ESP32. |
| **Simulación** | [`Simulacion/`](../Simulacion/) | Arranca el mismo backend en *modo simulación*, con simulador visual, escenario sintético de las interfaces, generador de telemetría y datos de clima espacial de NASA DONKI. |
| **Prototipo de salud** | [`prototipo-salud/`](../prototipo-salud/) | Aplicación Streamlit independiente: adaptadores de cinco modelos de ecocardiografía, procesamiento de ECG, importador de sensores y el **motor de padecimientos** (20 padecimientos, semáforo VERDE/AMARILLO/ROJO/GRIS). |

Además, [`Planeacion/`](../Planeacion/) conserva catálogos de investigación (variables, padecimientos), la matriz de pesos por malestar y material de trabajo de los integrantes.

**EVA** designa el sistema (computadora central, perfil de trama, enlace). **LUNNA** (*Live-telemetry Updating Network for Nominal-deviation & Anomalies*) designa tanto el modelo que define «lo esperado» para cada persona como la marca de las interfaces. **Lunna** es la asistente con forma de luna que aparece en las pantallas.

## 2. Justificación y problemática

En una misión de larga duración:

1. **Los rangos poblacionales no describen a cada persona.** Una frecuencia cardiaca de 55 lpm puede ser normal para un tripulante entrenado y anómala para otro. Además, la microgravedad desplaza varias variables de forma esperada (por ejemplo, la presión arterial media de 24 h baja de 8 a 10 mmHg en órbita; ver [diccionario](README_07_DICCIONARIO_DATOS_VARIABLES.md)).
2. **La comunicación con Tierra tiene retardo y ventanas.** Hacia Marte, el retardo de un trayecto va de 4 a 24 minutos (240–1440 s, valores que usa el proyecto) y el enlace puede cerrarse. La vigilancia debe funcionar a bordo.
3. **Las alertas tienen que poder explicarse.** Un cirujano de vuelo necesita saber qué dato, contra qué referencia y con qué evidencia produjo una alerta.

## 3. Objetivos

### 3.1 Objetivo general

Construir un prototipo reproducible que reciba telemetría fisiológica de varios dispositivos, la atribuya al tripulante correcto, la compare con lo esperado para esa persona en ese entorno, genere alertas explicables y comunique lo relevante a Tierra a través de un enlace con retardo e interrupciones.

### 3.2 Objetivos específicos

| # | Objetivo | Estado en el repositorio |
|---|---|---|
| O1 | Definir un contrato de trama binaria (perfil EVA) y uno JSON para dispositivos intermedios | Implementado: [`esquema.ts`](../Sistema/backend/src/esquema.ts), [`ingesta.ts`](../Sistema/backend/src/ingesta.ts) |
| O2 | Atribuir cada muestra al tripulante mediante una tabla de asignaciones con intervalo de tiempo | Implementado (tabla `asignaciones`) |
| O3 | Modelar lo esperado por persona con actualización bayesiana en tres capas | Implementado: [`lunna.ts`](../Sistema/backend/src/lunna.ts) |
| O4 | Combinar el criterio personal con umbrales clínicos absolutos de referencia | Implementado: [`referencias.ts`](../Sistema/backend/src/referencias.ts), [`semillas/medibles.json`](../Sistema/backend/semillas/medibles.json) |
| O5 | Simular el enlace con Tierra (retardo, ventana, prioridad, acuse) | Implementado: [`enlace.ts`](../Sistema/backend/src/enlace.ts) |
| O6 | Transporte HTTPS real nave ↔ Tierra sin pérdidas ni duplicados | Implementado con certificado autofirmado de desarrollo: [`sincro.ts`](../Sistema/backend/src/sincro.ts), [`enlace-https.ts`](../Sistema/backend/src/enlace-https.ts) |
| O7 | Interfaces para tripulación, CMO, Tierra y reloj | Implementadas como maquetas; dibujan en gran parte un escenario sintético (ver [manual](README_03_MANUAL_USUARIO.md)) |
| O8 | Motor de 20 padecimientos con semáforo y trazabilidad de la evidencia | Implementado en Python: [`prototipo-salud/motor/`](../prototipo-salud/motor/) |
| O9 | Integrar modelos de ecocardiografía y ECG | ECG ejecutado en CPU sobre datos públicos; eco solo con pruebas de carga en la máquina de desarrollo (ver [modelos](README_06_MODELOS_COMPUTACIONALES_ALGORITMOS.md)) |
| O10 | Separar modo operativo y modo simulación sin duplicar código | Implementado: `--modo operativo|simulacion`, `config.js`, `modo.js` |

## 4. Alcance

### 4.1 Dentro del alcance

- Ingesta, almacenamiento, modelo por variable, alertas y enlace en el backend.
- Interfaces web servidas por el backend.
- Firmware de la playera y pasarela BLE, en código. El firmware **no se ha probado en una placa real**.
- Motor de padecimientos y adaptadores de modelos en `prototipo-salud/`.
- Simulación completa con datos sintéticos rotulados.

### 4.2 Fuera del alcance

- Uso clínico, diagnóstico, tratamiento o decisiones de misión.
- Certificación médica o espacial, tolerancia a radiación y tiempo real determinista.
- Autenticación de usuarios, cifrado de las bases de datos y gestión de identidades (ver [seguridad](README_10_SEGURIDAD_CONFIABILIDAD_RIESGOS.md)).
- Entrenamiento o ajuste de pesos de los modelos de ecocardiografía.
- Uso de datos de acceso controlado (LSAH, LSDA, OSDR restringido).

## 5. Requerimientos generales

| Tipo | Requerimiento | Fuente |
|---|---|---|
| Funcional | Recibir tramas binarias (`POST /api/tramas/binaria`) y JSON (`POST /api/tramas`) | `servidor.ts` |
| Funcional | Rechazar dispositivos no registrados, esquemas desconocidos, dispositivos sin asignar y valores estimados sin método ni `ic95` | `ingesta.ts` |
| Funcional | Un reenvío no duplica muestras (`UNIQUE (tripulante, dispositivo, seq, variable, t_scet)`) | `db.ts` |
| Funcional | Toda predicción trae banda del 95 % y pesos de cada fuente | `lunna.ts` |
| Funcional | Un prior sin `fuente` se rechaza | `PUT /api/priores` |
| Funcional | Los datos sintéticos nunca caen en la base operativa | `servidor.ts` (base separada por modo) |
| No funcional | Node.js 22.6 o superior, sin dependencias npm | `package.json` |
| No funcional | Funcionar sin internet (interfaces sin librerías externas) | README de interfaces |
| No funcional | Todo número provisional del motor de padecimientos se rotula *provisional* | `motor/parametros.py` |

## 6. Etapas de desarrollo

Las etapas y sus fechas son las registradas en la historia de Git y en los registros de avance del equipo.

| Etapa | Fecha (CDMX) | Resultado | Evidencia |
|---|---|---|---|
| Catálogos de investigación | antes del 14 nov 2026 | Variables medidas en astronautas (388 filas), padecimientos y matriz padecimiento-variable | [`Planeacion/data/`](../Planeacion/data/) |
| Estructura del prototipo de salud | 14 nov, 09:40–10:15 | Núcleo común, adaptadores de 5 modelos, runner, app Streamlit, scripts PowerShell | Sección AVANCE del README consolidado |
| Primera inferencia real (PanEcho) | 14 nov, ~10:25 y ~11:06 | Reportada por Iker en su PC: CPU 42,8 s; CUDA 17,4 s | Ídem |
| Módulo ECG | 14 nov, ~16:45 | NeuroKit2 + wfdb ejecutado en Linux/CPU sobre MIT-BIH | Ídem |
| Motor de padecimientos | 15 nov, ~01:10 | 20 padecimientos, vistas «Padecimientos» y «Configuración» | Ídem |
| Backend, interfaces, enlace HTTPS, simulador | 14–15 nov | Computadora central v0.7.0 | `Sistema/backend/src/servidor.ts` |
| Separación `Sistema/` · `Simulacion/` | 15 nov | Modos operativo y simulación | commit `3a69503` y posteriores |
| Integración en `Sistema/` del trabajo más reciente | 15 nov | Semáforo de padecimientos por API, análisis con modelos desde la central, valor normal del motor, simulador en inglés | Fusión de tres vías desde `Planeacion/` |
| Documentación modular | 15 nov | Esta carpeta `documentacion/` y el README consolidado | — |

## 7. Actividades y entregables

| Entregable | Ubicación |
|---|---|
| Backend de la computadora central | `Sistema/backend/` |
| Interfaces web (teléfono, central, base, reloj) | `Sistema/interfaces/eva/`, `Sistema/interfaces/reloj/` |
| Consolas `/tierra` y `/nave` | `Sistema/backend/web/` |
| Firmware ESP32 y vectores de prueba | `Sistema/esp32/` |
| Pasarela BLE | `Sistema/pasarela/` |
| Simulador visual y generador | `Simulacion/simulador/`, `Simulacion/generador/` |
| Prototipo de salud (app, motor, adaptadores, validación) | `prototipo-salud/` |
| Matriz de pesos por malestar | `Planeacion/Leo/modelo-pesos/` |
| Video de presentación | `video/lunna-video.mp4` |
| Documentación | `documentacion/` y `prototipo-salud/README.md` (consolidado) |

## 8. Recursos tecnológicos

| Recurso | Uso |
|---|---|
| Node.js ≥ 22.6 (`node:sqlite`, `--experimental-strip-types`) | Backend y pruebas, sin dependencias npm |
| SQLite (modo WAL) | `Sistema/backend/eva.db` y `Simulacion/eva-simulacion.db` |
| HTML, CSS y JavaScript sin framework | Interfaces |
| Python 3.13 (app) y 3.11 (entornos de modelos), gestor `uv` | Prototipo de salud |
| PyTorch 2.5.1 + cu124 | Modelos de ecocardiografía (PC con GPU) |
| NeuroKit2 0.3.0 + wfdb 4.3.1 | ECG |
| Streamlit | App del prototipo |
| Python + `bleak` | Pasarela BLE |
| Arduino/ESP32 BLE | Firmware de la playera |
| GPU de referencia | NVIDIA RTX 4050 Laptop 6 GB (PC de Iker, Windows) |

## 9. Riesgos generales y consideraciones

| Riesgo | Impacto | Control actual |
|---|---|---|
| Sobreinterpretación clínica | Alto | Rótulos SIMULADO / provisional / [T] terrestre; avisos «no es un diagnóstico» |
| Priores y umbrales sin validación en vuelo | Alto | Se declaran supuestos; un prior sin fuente se rechaza |
| Divergencia entre copias del código | Medio | Una sola fuente de código activo: `Sistema/` (ver [§10](#10-estado-del-repositorio-a-la-fecha-de-revisión)) |
| Corrupción de SQLite al moverla | Medio | Detener el backend antes de copiar `eva.db` |
| Rutas relativas rotas en reorganizaciones | Medio | Redirecciones de compatibilidad `/maquetas/…` → `/interfaces/…` |
| Hardware no probado | Medio | Vectores de prueba compartidos entre TypeScript, Python y C++ |
| Licencias restrictivas de pesos de eco | Medio | Uso local, no comercial; ver tabla de modelos |

## 10. Estado del repositorio a la fecha de revisión

Estado al 15 de noviembre de 2026:

1. **Documentación.** Los documentos técnicos están consolidados, por decisión del equipo, en [`prototipo-salud/README.md`](../prototipo-salud/README.md) y en esta carpeta.
2. **Código activo único en `Sistema/`.** El trabajo más reciente que vivía en `Planeacion/Julio/backend/` y `Planeacion/Leo/maqueta-eva/` se integró en `Sistema/` mediante una fusión de tres vías. Se conservaron, a la vez, los modos operativo y simulación. Lo integrado:
   - semáforo de padecimientos por API (`semaforo.ts`);
   - análisis con modelos desde la central (`modelos.ts`);
   - valor normal del motor (`referencias-motor.ts`, `referencias.js`, `alertas-motor.js`);
   - comando `npm run evaluar` (`evaluar-salud.ts`);
   - vista del semáforo en la central (`semaforo.js`);
   - simulador visual en inglés.
   Las carpetas viejas se retiraron del árbol; su historia completa está en git.
3. **Una sola matriz de padecimientos.** La fuente de verdad es [`prototipo-salud/datos/modelo/PADECIMIENTO-VARIABLE.csv`](../prototipo-salud/datos/modelo/PADECIMIENTO-VARIABLE.csv), que usan el motor y el backend: 350 ligas. La copia de `Planeacion/data/padecimientos/` se igualó a ella.

## Documentación relacionada

- [Índice general](INDICE.md)
- [Protocolo de investigación](README_02_PROTOCOLO_INVESTIGACION.md)
- [Arquitectura del sistema](README_04_ARQUITECTURA_SISTEMA.md)
- [Pruebas y validación](README_08_PRUEBAS_VALIDACION.md)
- [Seguridad, confiabilidad y riesgos](README_10_SEGURIDAD_CONFIABILIDAD_RIESGOS.md)
