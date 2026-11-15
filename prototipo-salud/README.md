# Prototipo de salud · modelos, ECG y padecimientos

Guía única para explorar el prototipo y entender sus datos, modelos, resultados y límites. Toda la información necesaria —incluidos los detalles técnicos de los modelos, instalación, entradas, salidas, licencias, recursos, algoritmos y límites— está consolidada en este mismo README.

> **No es un dispositivo médico ni un diagnóstico.** Los umbrales del motor de padecimientos son provisionales y no están validados en astronautas. La tripulación de demostración es sintética. Las muestras públicas de ECG son de pacientes hospitalarios, no de astronautas.

## Abrir la interfaz

La app permite revisar modelos y sensores, padecimientos y configuración. Para explorar esas vistas no es necesario instalar pesos de modelos ni disponer de una GPU.

En Windows, abre PowerShell desde la raíz del repositorio. Si PowerShell bloquea los scripts, permite su ejecución solo en la sesión actual:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
Set-Location .\prototipo-salud
.\scripts\instalar_app.ps1
.\scripts\lanzar_app.ps1
```

Abre [http://localhost:8501](http://localhost:8501). La primera instalación requiere internet. Los pasos de instalación completa de cada modelo son independientes y descargan varios GB; se describen en [Ejecutar modelos](#ejecutar-modelos).

## Qué hace

- Ejecuta cinco modelos de ecocardiografía mediante adaptadores separados y agrega procesamiento de ECG 1D.
- Rechaza modalidades incompatibles en lugar de convertir o interpretar una entrada que el modelo no admite.
- Importa sensores desde CSV o JSON y permite comparar sus medidas con las de los modelos.
- Conserva cada ejecución, su configuración, origen, errores y artefactos en `outputs/raw/<run_id>/`; normaliza las medidas en `outputs/normalized.csv`.
- Incluye un motor experimental que compara datos de una persona con su propia referencia y presenta un semáforo de padecimientos.
- Mantiene separados los canales **real** y **SIMULADO**. Los faltantes quedan vacíos, nunca se convierten en cero; no se mezclan personas ni se promedian salidas de modelos distintos.

No hay una red de fusión entrenada: la vista de comparación muestra resultados lado a lado y el componente de fusión es un *stub*.

## Cómo se organiza el análisis

1. **Validación de entrada:** se comprueban modalidad, vista y calidad. Una entrada incompatible se rechaza con un motivo.
2. **Ejecución aislada:** cada adaptador se lanza en el entorno de su modelo y registra la configuración y el checkpoint usado.
3. **Salida trazable:** se guardan tanto los resultados originales como las filas del formato común; una prueba con datos aleatorios se identifica como prueba de carga, no como inferencia.
4. **Motor de padecimientos:** aplica una puerta de calidad, compara contra referencias poblacionales y personales disponibles y conserva por separado sus dos canales de evidencia. La base personal prevuelo se congela; una actualización protegida y CUSUM buscan cambios sostenidos sin absorber directamente puntos alertados.
5. **Semáforo:** muestra VERDE, AMARILLO, ROJO o GRIS con el motivo y el cálculo. GRIS significa que no hay evidencia suficiente; no se inventa una normalidad.

El semáforo sirve para ordenar una revisión, no para calcular un diagnóstico ni una probabilidad clínica. Si no hay datos suficientes o un umbral fiable, el resultado puede quedar GRIS.

## Modelos y datos

| Componente | Entrada y salida principal | Pesos / recursos aproximados | Estado y límites |
|---|---|---|---|
| **PanEcho** | Video 2D; tareas de clasificación y estimaciones ecocardiográficas. Las probabilidades del modelo no están calibradas. | 505 MB; ~2 GB de VRAM estimada. | Una ejecución fue reportada en la PC RTX 4050: CUDA, 17,4 s. No es validación clínica. Pesos CC BY-NC-SA 4.0; código AGPLv3. |
| **EchoNet-Dynamic** | Video ecocardiográfico A4C; estima FEVE y área del ventrículo izquierdo en px². | 568 MB; ~3 GB de VRAM estimada. | La vista debe declararse A4C. La licencia del repositorio es contradictoria y los pesos no tienen licencia explícita: uso local, sin redistribución. |
| **MedSAM2** | Imagen o video 2D con una caja o máscara inicial; produce máscaras y áreas en px². | 156 MB; ~1,5 GB de VRAM estimada. | No segmenta automáticamente sin indicación inicial. Código Apache-2.0; pesos CC BY-SA 4.0. |
| **EchoPrime** | Estudio ecocardiográfico multivista; clasificación y recuperación de estudios similares. | ~3,9 GB de pesos; ~1,6–2 GB de VRAM estimada, además de RAM. | Los resultados recuperados no son un informe redactado para el estudio actual. Licencia académica/no comercial. |
| **EchoCLIP / EchoCLIP-R** | Video o imagen 2D; calcula similitud con texto y estimaciones *zero-shot*. | ~1,2 GB; ~1,5 GB de VRAM estimada. | La similitud no es una probabilidad. Se aplica la licencia más restrictiva de las fuentes consultadas (académica). |
| **ECG** | Registro WFDB o CSV/TXT/TSV con frecuencia de muestreo; calcula FC, HRV, PR, QTc y hallazgos de ritmo. | Sin pesos ni GPU; CPU. | Procesamiento de señal, no un modelo entrenado. La bandera compatible con FA es **experimental y no diagnóstica**. |

Las estimaciones de VRAM no son mediciones. Las cinco familias de eco requieren en conjunto unos 6,3 GB de pesos y entornos independientes; la instalación completa puede necesitar al menos 30 GB libres. El entorno de la app usa Python 3.13; los entornos de modelos, Python 3.11. Consulta los detalles de entrada, salida, versiones y licencias en la [tabla completa de modelos](#tabla-completa-de-modelos) y en las secciones técnicas de este mismo README, junto con los `manifest.json` de `adapters/`.

### Ejecutar modelos

La instalación de la interfaz no instala los entornos ni descarga los pesos de ecocardiografía. Para inferencia, sigue el procedimiento de **instalación y comandos detallados en el documento técnico**, que incluye requisitos de Windows, GPU/driver, descarga de pesos y un comando de ejemplo para cada adaptador. Instala y prueba los modelos uno por uno; no descargues todos si solo necesitas mostrar la interfaz.

La salida completa de cada ejecución queda en `outputs/raw/`. Para cargar muestras públicas, revisar sus licencias o confirmar la procedencia, consulta **samples/FUENTES.md**.

## Vista «Padecimientos» y «Configuración»

El motor incluye 20 padecimientos y 350 vínculos padecimiento-variable. Usa las tablas con fuentes guardadas en `datos/modelo/`; la vista Configuración permite ajustar pesos y umbrales sin sobrescribir esas tablas. Los cambios del usuario se guardan en `datos/modelo/overrides.json` y se marcan como modificados por el usuario.

La tripulación sintética contiene cinco personas y 30 días de datos, con `simulated=true`; se usa para recorrer la interfaz, no como fisiología real. La app separa sus evaluaciones de las de datos reales. Los cambios de configuración se guardan en `datos/modelo/overrides.json`; el estado local y la calibración, en `datos/estado/` y `datos/simulado/`. Para detalles de persistencia, instalación de esta actualización y límites de cada regla, consulta **NOTA-INSTALACION-PADECIMIENTOS.md** y **motor/DISENO.md**.

### Conexión opcional con EVA

El prototipo puede leer y guardar evaluaciones en la base de datos de EVA. Esta integración es opcional; la base y su esquema los administra Node:

```powershell
Set-Location .\prototipo-salud
$env:EVA_DB = "..\Sistema\backend\eva.db"
.\envs\app\Scripts\python.exe -m motor.evadb --evaluar
```

Si la base todavía no está creada o migrada, consulta **Sistema/backend/README.md**. La base de simulación está separada y contiene datos sintéticos; no la trates como registros reales.

## Resultados reportados y límites

- **Ecocardiografía:** el avance reporta una inferencia real de PanEcho en la PC de desarrollo. Las otras inferencias de eco quedan pendientes de validación en esa PC; las pruebas de carga con pesos aleatorios no son resultados.
- **ECG:** se ejecutó en CPU sobre registros públicos MIT-BIH. Para detección de picos R, el avance reporta sensibilidad 0,999/1,000/0,919 y PPV 1,000/0,972/0,989 en tres registros. La regla de irregularidad detecta irregularidad del RR, no FA: su especificidad varió ampliamente entre registros. PR y QTc no quedaron validados.
- **Inspiration4:** se analizaron resultados de laboratorio públicos de cuatro participantes. Solo hay tres tomas previas al vuelo y no hay sangre en vuelo en esos archivos; la configuración normal queda GRIS cuando no alcanza los datos para una base personal. Un experimento que completa la base con datos SIMULADOS no es validación y no demuestra eficacia clínica.
- **Pruebas de software:** **AVANCE.md** reporta 98 pruebas aprobadas y 5 omitidas en Linux. No se debe interpretar como certificación, validación clínica ni prueba en Windows.
- **Límites generales:** muestras pequeñas, salidas de modelos dependientes de sus datos de entrenamiento, umbrales provisionales y ninguna validación en astronautas. No usar para diagnóstico, tratamiento ni decisiones de misión.

## Fuentes y referencias

- NASA OSDR: [OSD-569](https://osdr.nasa.gov/bio/repo/data/studies/OSD-569) y [OSD-575](https://osdr.nasa.gov/bio/repo/data/studies/OSD-575), datos abiertos de laboratorio de Inspiration4. No incluyen las señales de FC/HRV/SpO₂ del reloj.
- PhysioNet: procedencia, licencias y citas de las muestras ECG en **samples/FUENTES.md**.
- Dash et al. (2009), método experimental de irregularidad: [doi:10.1007/s10439-009-9740-z](https://doi.org/10.1007/s10439-009-9740-z).
- Jones et al. (2024), [Nature](https://doi.org/10.1038/s41586-024-07648-x); Kim et al. (2024), [Nature Communications](https://doi.org/10.1038/s41467-024-49211-2). Se citan como contexto de los datos Inspiration4, no como validación del motor.
- Los repositorios, licencias y requisitos de cada modelo están en la [tabla completa de modelos](#tabla-completa-de-modelos) y en los `manifest.json` de `adapters/`.

## Índice de la documentación técnica consolidada

Este README contiene el propósito, los comandos, las especificaciones completas y la trazabilidad. Los nombres de la tabla identifican las fuentes históricas del contenido; ya no es necesario abrir ningún documento externo.

| Documento | Contenido que aporta |
|---|---|
| **AVANCE.md** | Hitos implementados, estado de ejecuciones, métricas ECG y verificaciones reportadas. |
| **CONTRATO.md** | Contrato entre adaptadores, runner, sensores, formato común y ejecución. |
| **ENTORNO.md** | Entorno de desarrollo y diferencias entre la máquina Linux y la PC Windows objetivo. |
| **MODELOS.md** | Comandos de instalación/inferencia, parámetros de entrada y detalles de ECG. |
| **MODELOS-TABLA.md** | Tabla detallada de pesos, entradas, salidas, licencias y estimaciones de recursos. |
| **NOTA-INSTALACION-PADECIMIENTOS.md** | Instalación y uso de las vistas Padecimientos y Configuración. |
| **validacion/README.md** | Alcance y resultados de la prueba con datos públicos de Inspiration4. |

---

# Documentación consolidada del repositorio

Este README contiene también el contenido completo de los documentos Markdown que existían en el repositorio. La ruta que aparece en cada encabezado identifica el origen histórico del texto; los documentos originales se retiraron para mantener un único archivo Markdown.

## Documentos principales

- [PLANEACION.md](PLANEACION.md): plan operativo del proyecto, estructura, fases, criterios de aceptación y riesgos.
- [MANUAL-USUARIO-LUNNA.md](MANUAL-USUARIO-LUNNA.md): manual para recorrer la maqueta LUNNA y sus interfaces.
- [PROTOCOLO-INGESTIGACION.md](PROTOCOLO-INGESTIGACION.md): objetivos, variables, modelo, fuentes, límites y trazabilidad de la investigación.


## Documento consolidado: `Planeacion/Julio/backend/ENLACE-HTTPS.md`

> Fuente original: `Planeacion/Julio/backend/ENLACE-HTTPS.md`

# Enlace HTTPS nave ↔ Tierra

Transporte real (TLS) entre dos procesos del mismo backend. Todos los datos de la demo son SIMULADOS.

## Cómo correrlo
```
npm run certs      # certs/tierra.crt + tierra.key (autofirmado, desarrollo; --forzar regenera)
npm run tierra     # HTTPS :8443  (consola /tierra, /enlace/*)
npm run nave       # HTTP  :8787  (UI, app, /nave) + cliente HTTPS hacia Tierra
```
Variables: `BD`, `PUERTO` (0 = efímero; imprime `PUERTO=<n>`), `TIERRA_URL` (def. `https://localhost:8443`), `TIERRA_CA`, `TLS_CERT`, `TLS_KEY`, `PING_S` (def. 60), `TIMEOUT_S` (def. 5), `SIMULAR_OWLT=1`.
Estado: `GET /api/enlace/estado` (nave y Tierra). Código: `src/sincro.ts` (protocolo), `src/enlace-https.ts` (transporte).

## Algoritmo
- Cada lado tiene su cola de salida (outbox): `bajada` (nave→Tierra) y `subida` (Tierra→nave). Cada mensaje lleva `(emisor, seq)`, con seq monótono por emisor.
- Lotes por prioridad y luego seq; el cuerpo JSON va con `x-eva-sha256`. Si no coincide: 422 y no se aplica nada.
- El receptor guarda cada `(emisor, seq)` una sola vez (UNIQUE en `entrada`); inbox + aplicación en una transacción. Reenvíos = duplicados ignorados.
- ACK acumulado (1..n completos) + selectivos; el emisor marca `ack=1`. Lo no confirmado se reincluye solo en el siguiente lote: la reanudación parte de lo pendiente.
- Fallo de cualquier petición (timeout, red, status ≠ 200) → DESCONECTADO inmediato y reintento con backoff exponencial con jitter (base 1 s, tope = `PING_S`).
- Efecto: al-menos-una-vez en el transporte + idempotencia = exactamente-una-vez.

## Tiempos y canales
- `t_evento` (cuándo ocurrió), `t_envio` (salida del lote), `t_recepcion` (aplicado en el receptor); antigüedad = ahora − t_evento.
- Avisos Tierra→nave: `subida`. Avisos nave→Tierra: `bajada` tipo `aviso` (`POST /api/nave/avisos`). Datos: `alerta`, `resumen`, `crudos`, `evaluacion`, `acuse`.

## Latido (heartbeat)
Por defecto 60 s; se recomienda `PING_S=15`. Latencia de detección de caída ≤ `PING_S` + `TIMEOUT_S` (los fallos de lote se ven al instante). Un GET con keep-alive cuesta casi nada. Por debajo de ~10 s con `TIMEOUT_S=5` crece el riesgo de falsos DESCONECTADO por jitter.
Con Marte real (RTT de 8 a 48 min) un latido de segundos solo modela el tramo terrestre: manda la ventana y el retraso (`SIMULAR_OWLT=1` suma owlt antes y después de cada petición). Ventana cerrada = almacenar y reenviar, sin tráfico.

## Límites
- Solo TLS del servidor con certificado autofirmado de desarrollo: no hay autenticación de la nave ante Tierra (`x-eva-emisor` es informativo, no es credencial) ni cifrado de las BD.
- Una nave y una Tierra; sin rotación de certificados ni límites de tasa. Las llaves viven en `certs/` (ignorada por git); no se versionan.
- Reanudación a nivel de lote, no de byte.

<!-- FIN DOCUMENTO CONSOLIDADO: Planeacion/Julio/backend/ENLACE-HTTPS.md -->

## Documento consolidado: `Planeacion/Julio/backend/MODELOS-CENTRAL.md`

> Fuente original: `Planeacion/Julio/backend/MODELOS-CENTRAL.md`

# Modelos de eco y ECG desde la computadora central

La central (pestaña **Semáforo** → tarjeta «Analizar con modelos») lanza un modelo de `prototipo-salud` sobre una muestra,
guarda en `eva.db` lo que el motor sabe usar y re-evalúa el semáforo. **Nada de esto es un diagnóstico.**

## Flujo

1. `POST /api/modelos/analizar {tripulante, modelo, archivo, simulado, vista?, prueba_carga?}` → **202** con el trabajo (`en_cola`).
2. La nave lanza (asíncrono, `child_process.spawn`, un trabajo a la vez por modelo, cola en memoria):
   `PYTHON -m core.run_model --model <m> --input <muestra> --subject <tripulante> --timeout <T> …` con cwd = `PROTOTIPO_DIR`.
   `core.run_model` es el runner (stdlib, python de la app) y él lanza el adaptador con el **python del venv del modelo**
   (`<ENVS_DIR>\<modelo>\Scripts\python.exe` en Windows, `bin/python` en Linux), igual que `core/registry.py`.
3. Si el run es `ok`/`prueba_carga`: `PYTHON -m motor.puente_modelos --db eva.db --run-dir … --tripulante … --modelo … --archivo … [--simulado]`
   - eco (echonet_dynamic, panecho, echoclip, echoprime) → FEVI en `muestras` (01:V18, `modelo_eco`, N4) con `evadb.guardar_muestra_eco`.
   - ECG (`ecg`, NeuroKit2) → métricas mapeadas por la puerta de calidad existente (`calidad.puerta`) a 04:A4, 03:V17, 01:V34,
     01:V35, 01:V32, 01:V31; se guardan solo las que deciden (`modelo_ecg`). Sin liga con fuente en `padecimiento_variable`
     → se guarda y se marca **EXPERIMENTAL** (no se inventan ligas ni pesos). SDNN y la fracción de ventanas son informativas.
   - Prueba de carga (tensor aleatorio / sin pesos) → no se guarda nada; rótulo «PRUEBA DE CARGA — no es resultado».
4. Si se guardó algo: `python -m motor.evadb --evaluar` (la misma vía que «Evaluar» de la central) y el trabajo muestra
   antes → después del semáforo. Con **SIMULADO** el canal real ignora el dato (G1): el semáforo real no cambia.
5. `GET /api/modelos/trabajos/:id` (y `GET /api/modelos/trabajos`): `estado` en_cola/corriendo/ok/error, `fase`, horas,
   salida resumida, resultado del puente, cambios del semáforo y error. Los trabajos viven en memoria (máx. 50); los datos
   quedan en `eva.db` y en `prototipo\outputs\raw\<run_id>\`.
6. `GET /api/modelos/disponibles`: modelos (manifests de `adapters\`) y muestras (videos y `.hea` en `MUESTRAS_DIR`, sin
   subcarpetas). El `archivo` debe ser un nombre de esa lista: `..`, rutas, absolutas y enlaces que salgan → 400.

## Variables

| Variable | Defecto | Uso |
|---|---|---|
| `PROTOTIPO_DIR` | `..\..\..\prototipo-salud` (desde el backend); también lee `PROTOTIPO_SALUD` | raíz de prototipo |
| `PYTHON` | `python` (Windows) / `python3` | python de la app: runner, puente y motor |
| `ENVS_DIR` | `PROTOTIPO_ENVS_DIR` o `<PROTOTIPO_DIR>\envs` | venvs de los modelos (se pasa como `PROTOTIPO_ENVS_DIR`) |
| `MUESTRAS_DIR` | `<PROTOTIPO_DIR>\samples` | muestras que la central ofrece |
| `MODELO_TIMEOUT_S` | `timeout_s` del manifest; si falta, **1800 s** | tiempo máximo del modelo |
| `MODELO_MARGEN_S` | 60 | la nave mata el árbol (`taskkill /T /F`) a timeout + margen → estado `error` |

## PC de Iker (Windows, PowerShell)

Requisitos previos (ya existentes en `prototipo`): `scripts\instalar_app.ps1` (crea `envs\app`), `scripts\instalar_modelo.ps1 -Modelo <m>`,
`scripts\descargar_pesos.ps1 -Modelo <m>` y `scripts\preparar_muestras.ps1` (videos de eco en `samples\`).
Ajusta `$REPO` si el clon de hackatonNASA está en otra carpeta.

```powershell
$REPO = "C:\Users\ikerc\Desktop\nasa-salud-espacial\hackatonNASA"
$env:PROTOTIPO_DIR = "C:\Users\ikerc\Desktop\nasa-salud-espacial\prototipo"
$env:ENVS_DIR      = "$env:PROTOTIPO_DIR\envs"
$env:PYTHON        = "$env:PROTOTIPO_DIR\envs\app\Scripts\python.exe"
# opcional: $env:MUESTRAS_DIR = "$env:PROTOTIPO_DIR\samples"

cd "$REPO\Planeacion\Julio\backend"
npm run certs        # solo la primera vez (la nave exige certs\tierra.crt)
npm run nave         # http://localhost:8787
```

Abrir la central: <http://localhost:8787/app/central.html#semaforo> → tarjeta **Analizar con modelos** (va debajo de la tripulación y los padecimientos; sale plegada y el navegador recuerda si la dejaste abierta).

- **ECG**: «Analizar ECG» → tripulante → modelo ECG (NeuroKit2) → muestra `ecg_fa_afdb04015.hea` → deja **SIMULADO** marcado
  (las muestras MIT-BIH no son del tripulante) → «Analizar». Para ver el semáforo moverse en una demo, desmarca SIMULADO
  sabiendo que se guardará como dato real de ese tripulante.
- **Eco**: «Analizar eco» → modelo EchoNet-Dynamic → `echonet_dynamic_Example1.mp4` → vista **A4C** → «Analizar». Sin pesos,
  marca «Prueba de carga (sin pesos)»: no guarda nada y se rotula PRUEBA DE CARGA.

Por API (otra terminal PowerShell):

```powershell
$b = @{ tripulante = "ana"; modelo = "ecg"; archivo = "ecg_fa_afdb04015.hea"; simulado = $true } | ConvertTo-Json
$t = Invoke-RestMethod -Method Post -Uri http://localhost:8787/api/modelos/analizar -ContentType "application/json" -Body $b
Invoke-RestMethod http://localhost:8787/api/modelos/trabajos/$($t.id)   # repetir hasta estado ok/error
```

## Qué se probó y qué falta

- Linux sin GPU (`npm test`, `pytest`): python falso que emite el formato real de `core.run_model`; puente y motor reales
  con el venv de la app; ECG **real** de punta a punta (NeuroKit2, `/tmp/nasa-linux-envs/ecg`). Prueba de humo con la nave
  levantada: ECG `ecg_fa_afdb04015` → P01 GRIS → AMARILLO en una BD temporal.
- **Falta validar en la PC con GPU**: corrida real de EchoNet-Dynamic/PanEcho/EchoCLIP/EchoPrime con pesos y CUDA (tiempos
  frente al timeout de 1800 s; EchoPrime 3600 s), FEVI real → muestra 01:V18; `taskkill /T /F` matando el árbol al vencer
  el tiempo (escrito, no ejecutado en Windows); rutas con espacios; la UI en el navegador (ES/EN).

<!-- FIN DOCUMENTO CONSOLIDADO: Planeacion/Julio/backend/MODELOS-CENTRAL.md -->

## Documento consolidado: `Planeacion/Julio/backend/README.md`

> Fuente original: `Planeacion/Julio/backend/README.md`

# EVA · Computadora central + LUNNA

Recibe tramas de cualquier dispositivo, las atribuye al tripulante correcto, las guarda,
y avisa cuando un signo vital se sale de **lo esperado para esa persona en ese entorno**.

**LUNNA** — *Live-telemetry Updating Network for Nominal-deviation & Anomalies* — es el
modelo que define "lo esperado".

```bash
npm start      # servidor; http://localhost:8787 = estado · /simulador = simulador visual
npm run sim    # simulador de hardware: 119 días de misión y luego en vivo
npm test       # 37 pruebas
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
| **Todo lo de un tripulante, ya evaluado** (lo usan el celular y la central) | `GET /api/app/:tripulante` — por variable: último valor, mediana, esperado, banda, z, `estado`, `motivo`, umbral clínico, serie de 14 días; más sus alertas y avisos |
| Umbrales clínicos de referencia | `GET /api/referencias` (de `semillas/medibles.json`) |
| Ventana de LUNNA (sólo demostraciones) | `GET/PUT /api/lunna/ventana` `{ minutos }` — 1440 en misión |
| Alertas | `GET /api/alertas` |
| Editar variables · esquemas · dispositivos | `GET/POST /api/variables` · `/api/esquemas` · `/api/dispositivos` |
| Tripulantes, basales e historial | `GET/POST /api/tripulantes` · `PUT …/:id/basales` · `POST …/:id/historial` |
| Ponerse un dispositivo | `POST /api/asignaciones` `{ dispositivo, tripulante }` |
| Fases de la misión | `GET/POST /api/fases` `{ desde, entorno }` |
| Enlace con Tierra | `GET/PUT /api/enlace` `{ owlt_s, abierto }` |
| Lo que ha llegado a Tierra | `GET /api/tierra/bandeja[?tipo=resumen\|alerta\|crudos\|acuse\|consulta\|emergencia]` (con la antigüedad de cada cosa) |
| Tierra manda un aviso | `POST /api/tierra/avisos` `{ para, texto, prioridad }` |
| Tierra manda una alerta manual | `POST /api/tierra/avisos` `{ tipo: "alerta", nivel: "ambar"\|"rojo", para, variable?, texto }` |
| Consola de control de misión | `GET /tierra` |
| Avisos ya llegados a la nave | `GET /api/avisos` |
| La CMO avisa a un tripulante (a bordo, sin retraso) | `POST /api/abordo/avisos` `{ para, texto, nivel?: "ambar"\|"rojo", de? }` · `GET /api/abordo/avisos` |
| La central consulta a Tierra (baja por el enlace) | `POST /api/central/consultas` `{ sobre?, texto, nivel?, de? }` → paquete `consulta` en la bandeja |
| El teléfono registra una emergencia | `POST /api/emergencias` `{ tripulante, modo: "SOS manual"\|"automático", causa?, disparadores? }` · `PUT /api/emergencias/:id` `{ resultado }` · `GET /api/emergencias[?tripulante=]` → paquete `emergencia` (prioridad 0) |

Eventos de `/api/stream`: `muestra`, `alerta`, `rechazo`, `tierra` (algo llegó a Tierra),
`aviso` (un aviso de Tierra llegó a la nave, o uno de la CMO con `origen: "abordo"`), `enlace` y
`emergencia` (se abrió o se cerró una emergencia). Lo de a bordo vive en `src/abordo.ts`.

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

### Dos criterios, el peor manda

| Criterio | Qué compara | Para qué |
|---|---|---|
| **Personal** (LUNNA) | Mediana de 24 h contra lo esperado para **esa** persona en ese entorno | Derivas lentas que un rango genérico no ve (fatiga, desacondicionamiento) |
| **Umbral clínico** | Mediana de las últimas 5 muestras válidas (≤ 10 min) contra el límite de `semillas/medibles.json` | Lo agudo: una SpO₂ de 87 % es grave aunque sea «normal para ti». Vale también en calibración |

Cada alerta dice su `motivo`: `personal`, `umbral` o `ambos`, y si hubo umbral, cuál y de qué fuente.
Los umbrales de signos vitales del catálogo de Iker son **[T] clínicos terrestres**: no se encontró una
tabla pública de NASA para ellos. Trazabilidad dato por dato en **`semillas/medibles.md`**.

⚠️ **Modo demostración.** Con 24 h, una anomalía provocada en una demo de minutos tarda en mover la
mediana y la vuelta a verde no se ve. El simulador, al pasar a «En vivo», acorta la ventana a 5 min y lo
anuncia (`modo mision` en la terminal de la PC la devuelve a 24 h). `/api/salud` y la página de estado
siempre dicen qué ventana está activa.

Relación con la fórmula de Bayes del cuaderno, firmware del ESP32 y pasarela Bluetooth: `INTEGRACION.md`,
en la etiqueta `planeacion-archivo` (`git checkout planeacion-archivo -- Planeacion/Julio/INTEGRACION.md`).

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

## Semáforo de padecimientos (motor de 20)

Lee las evaluaciones que escribe el motor Python de `prototipo-salud/` (20 padecimientos, 350 vínculos) y deja editar sus pesos. Es **distinto** del "índice por padecimiento" de Leo (`pesos.js`, 11 malestares). Provisional: no es un diagnóstico; las filas de la tripulación sintética llevan canal `SIMULADO`.

| Ruta | Qué hace |
|---|---|
| `GET /api/padecimientos/semaforo[?tripulante=ID]` | Los 20 colores por tripulante (GRIS si no hay evaluación), con `vacio` y `como_poblar` |
| `GET /api/padecimientos/semaforo/:tripulante/:padecimiento` | Evaluación y desglose por variable (peso de la fuente, del usuario, efectivo, contribución) |
| `GET /api/padecimientos/referencias?tripulante=ID[&variable=VID]` | Valor normal por variable guardado por el motor en su última evaluación (rango, fuente, base personal; `SIMULADO` si aplica) |
| `GET /api/padecimientos/pesos[?padecimiento=P07]` | Pesos por liga, rango [0, 3] y umbrales cambiados |
| `PUT /api/padecimientos/pesos` | `{padecimiento_id, variable_id, peso?, prior_de?}` o `{umbral, valor}` |
| `POST /api/padecimientos/pesos/restaurar` | `{}` (todo), `{padecimiento_id[, variable_id]}` o `{umbral}` |
| `POST /api/padecimientos/evaluar` | `{simulado?: boolean, origen_simulador?: boolean}`: corre el motor (409 si la BD está en memoria o ya corre; 503 sin Python) |

Los pesos cambiados se aplican en la **próxima evaluación**. Para poblar `evaluaciones` (hace falta `eva.db` en archivo y Python 3 con pandas):

```
npm run evaluar -- --simulado            # o --db ruta; por defecto BD o eva.db
npm run evaluar -- --origen-simulador    # eva.db viene de `npm run sim`: se evalúa igual, se guarda con canal SIMULADO
cd prototipo-salud && EVA_DB=<ruta a eva.db> python3 -m motor.evadb --evaluar [--simulado]
curl -X POST localhost:8787/api/padecimientos/evaluar -d '{"simulado": true}'
curl -X POST localhost:8787/api/padecimientos/evaluar -d '{"origen_simulador": true}'
```

Variables de entorno opcionales: `PYTHON`, `PROTOTIPO_SALUD`.

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
src/semaforo.ts    semáforo de padecimientos, pesos del usuario y ejecución del motor Python
src/evaluar-salud.ts  npm run evaluar
src/simulador.ts   simulador de terminal: 4 tripulantes, 119 días
web/simulador.html simulador visual (astronauta, dispositivos, PC central, Tierra) en /simulador
                   el PC abre la computadora central de LUNNA (/app/central.html, de
                   Leo/maqueta-eva), que lee /api/app, /api/alertas, /api/enlace y /api/stream
                   y el reloj abre el de Fani (/reloj → /maquetas/Fani/maqueta-reloj/),
                   con pulso y SpO₂ en vivo de /api/stream
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

<!-- FIN DOCUMENTO CONSOLIDADO: Planeacion/Julio/backend/README.md -->

## Documento consolidado: `Planeacion/Julio/backend/semillas/medibles.md`

> Fuente original: `Planeacion/Julio/backend/semillas/medibles.md`

# Variables medibles por sensor: qué dice el catálogo

Equipo Monarcas · 2026-11-15 · Datos: [`medibles.json`](medibles.json) (lo carga el backend al arrancar)

Las siete variables que el sistema recibe de sensores (playera, reloj, brazalete), con lo
que los catálogos de investigación del repo dicen de cada una.

**Cómo leerlo**

- **Nada es de memoria.** Cada número sale de un archivo del repo y la columna "De dónde
  sale" dice cuál y en qué fila. Lo que no está en el catálogo se marca **no encontrado**.
- **[A]** = umbral de NASA o validado en astronautas · **[T]** = clínico terrestre, no
  validado en microgravedad. **Todos los umbrales de signos vitales son [T]**: el catálogo
  no encontró ninguna tabla pública de NASA para ellos.
- **El sistema no diagnostica.** Señala qué vigilar y a qué padecimientos apunta una
  desviación; la interpretación es del médico de vuelo.
- Los umbrales absolutos **complementan** la comparación con la línea base propia (LUNNA),
  no la sustituyen. El catálogo lo pide así: "usar la línea base del propio tripulante".

Abreviaturas de origen: **VMA** = `VARIABLES-MEDIDAS-ASTRONAUTAS.csv` · **PV** =
`PADECIMIENTO-VARIABLE.csv` · **cat. 01 / 03 / 04** = archivos de `variables-diagnostico/`
(con número de línea) · **índice** = `variables-diagnostico/00-indice-priorizado.md`.

> Los dos CSV siguen en `Planeacion/`. La carpeta `variables-diagnostico/` se quitó del árbol para dejar
> solo lo que corre; está íntegra en la etiqueta `planeacion-archivo`:
> `git checkout planeacion-archivo -- Planeacion/variables-diagnostico`

---

## 1. Quién lo ha medido en vuelo y cómo lo medimos nosotros

Las siete figuran como **"sí en vuelo"** en el catálogo.

| Variable (id) | Equipo real en vuelo | Aquí | De dónde sale |
|---|---|---|---|
| Frecuencia cardiaca (`04:A4`), lpm | ISS: manguito automático ALSP (40–200 lpm, ±5 %), Polar Heart Rate Monitor 2 (continua en ejercicio), BP/ECG, Bio-Monitor de la CSA (camiseta, desde dic 2018). En reposo: Holter/ECG. Orion: ECG en el kit médico | Playera con ECG y reloj con PPG | VMA fila 310 · cat. 04 A4 (l. 27) y tabla B.1 · VMA fila 4 (`01:V3`) |
| SpO2 (`04:A3`), % | Pulsioxímetro del kit de la ISS (ALSP/AMP), Bio-Monitor. Orion: pulsioxímetro en el kit; el dato "puede ingresarse a mano". Rango y exactitud: no encontrado | Reloj con PPG rojo/infrarrojo | VMA fila 309 · cat. 04 A3 (l. 26) y B.1 |
| Frecuencia respiratoria (`04:A2`), resp/min | Bio-Monitor (frecuencia y volumen respiratorio); conteo manual; ECG + sensor respiratorio | Banda torácica de la playera | VMA fila 308 · cat. 04 A2 (l. 25) |
| Temperatura corporal (`04:A1`), °C | Termómetros orales desechables y de piel de los kits (ISS AMP; Shuttle); sensor de flujo de calor en la frente (Thermolab, ESA/DLR, investigación); Bio-Monitor: temperatura de piel | Termómetro axilar de la playera | VMA fila 307 · cat. 04 A1 (l. 24) y B.1 |
| Presión sistólica (`01:V1`) y diastólica (`X:PAD`), mmHg | ISS: registro ambulatorio de 24 h con equipo portátil; manguito oscilométrico ALSP (20–280 mmHg, ±3 mmHg o 2 %); BP/ECG; Bio-Monitor. Orion: puede anotarse a mano | Brazalete oscilométrico | VMA fila 2 · cat. 01 V1 (l. 31) · cat. 04 A5 (l. 28, fusionada) |
| Presión media (`X:PAM`), mmHg | Sin equipo ni fila propia: se obtiene de la sistólica y la diastólica | Calculada: (sis + 2·dia)/3 | cat. 01 V1 (l. 31) · VMA fila 7 (`01:V6` usa la PA media) |

El inventario del kit de la ISS procede del catálogo de hardware CHeCS de 2011, que el
propio cat. 04 califica de "inventario antiguo, parte ya sustituida".

---

## 2. Umbrales

| Variable | Ámbar | Rojo | Tipo | Fuente citada por el catálogo | De dónde sale |
|---|---|---|---|---|---|
| Frecuencia cardiaca | > 100 lpm en reposo | no encontrado | [T] | Rango 60–100 lpm (MedlinePlus); taquicardia sinusal inapropiada: reposo > 100 lpm y media de 24 h > 90 (consenso HRS 2015) | cat. 04 A4 (l. 27) · cat. 01 V3 (l. 33) |
| SpO2 | ≤ 92 % ("contactar") | ≤ 88 % ("atención inmediata") | [T], propuesta no oficial | MedlinePlus, pulsioximetría | cat. 04 A3 (l. 26) y C.5 · índice §2.2 |
| Frecuencia respiratoria | > 18 resp/min | no encontrado | [T] | Rango 12–18/min (MedlinePlus) | cat. 04 A2 (l. 25) |
| Temperatura | ≥ 39,4 °C sostenida | ≥ 40,6 °C | [T], propuesta no oficial | MedlinePlus, fiebre (valores orales) | cat. 04 A1 (l. 24) y C.5 |
| Presión sistólica | < 90 o ≥ 140 mmHg | < 70 **[A]** o > 180 mmHg | [T] | Categorías ACC/AHA (vía CDC); rango agudo 90/60–120/80 (MedlinePlus); < 70 = presíncope | cat. 01 V1 (l. 31) y V47 (l. 93) |
| Presión diastólica | < 60 o ≥ 90 mmHg | > 120 mmHg | [T] | Igual que la sistólica | cat. 01 V1 (l. 31) |
| Presión media | — | — | — | **Sin umbral en el catálogo** | — |

**Cómo se codificaron** (decisiones nuestras sobre números del catálogo; el detalle está en
el campo `nota` de cada variable):

1. Si el catálogo da un criterio de alerta explícito, se usa ese (SpO2, temperatura, presión).
2. Si solo da un rango de referencia, su borde se usa como ámbar **únicamente en la
   dirección que el catálogo asocia a algún padecimiento** (FC y FR altas).
3. **Bordes del catálogo que no se usan como alerta**, porque saltarían con valores
   normales de un adulto entrenado en reposo:
   - FC < 60 lpm. El mismo catálogo registra 53,3 ± 7,3 lpm en astronautas dormidos (cat. 03 V18).
   - FR < 12 resp/min. El catálogo dice que la FR baja en vuelo.
   - Temperatura < 36,5 °C, y "fiebre probable si oral > 37,2–37,5 °C": la temperatura
     central sube ~1 °C en vuelo, así que ese corte saltaría con valores normales.
   - Presión "elevada" (120–129) y estadio 1 (130–139 u 80–89).
4. **Matices que cambian la lectura:**
   - El < 70 mmHg [A] se definió para la prueba ortostática tras el aterrizaje, no para
     reposo en vuelo; aquí es un suelo de seguridad.
   - Los valores de temperatura son orales y la playera mide en la axila; el catálogo no
     da la equivalencia.
   - NASA fija el límite de oxígeno sobre el aire inspirado (PIO2 objetivo 145–155 mmHg,
     mínimo 127), no sobre la SpO2. El índice advierte que la SpO2 de reloj sobreestima
     en hipoxemia: no debe ser la única alerta.
   - En vuelo la presión baja (§3): el borde de 90/60 queda más cerca de lo normal.
5. **Valor exacto del límite.** Los criterios "≤" y "≥" del catálogo son inclusivos, pero el
   sistema compara con "menor/mayor que": una lectura igual al límite (SpO2 de 92 % u 88 %,
   sistólica de 140) no dispara por umbral.

---

## 3. Cambio esperado en microgravedad

| Variable | Qué dice el catálogo | n | Fuente | De dónde sale |
|---|---|---|---|---|
| Frecuencia cardiaca (reposo) | Sin cambio en vuelo; bradicardia relativa en vuelos largos frente a cortos. Dormidos: 53,3 ± 7,3 lpm antes del vuelo, sin cambio en vuelo | 8 astronautas + 8 cosmonautas; sueño: Xu 2013 | Norsk 2015; Baevsky 2007; Xu 2013 | cat. 01 V3 (l. 33) · cat. 03 V18 (l. 38) |
| SpO2 | **no encontrado** | — | — | cat. 04 A3 |
| Frecuencia respiratoria | Disminuye; **magnitud no encontrada** | 8 | Baevsky 2007; Bio-Monitor | cat. 04 A2 (l. 25) |
| Temperatura | La **central** en reposo sube ~1 °C de forma gradual en 2,5 meses | 11 (ISS) | Stahn 2017 | cat. 04 A1 (l. 24) · cat. 03 V47 (l. 90) |
| Presión sistólica | Media de 24 h: −8 ± 2 mmHg (días 85–192). Otro estudio: 120 ± 10 → 106 ± 9 mmHg | 8 | Norsk 2015 / Fu 2019 | cat. 01 V1 (l. 31) |
| Presión diastólica | Media de 24 h: −9 ± 2 mmHg | 8 | Norsk 2015 | cat. 01 V1 (l. 31) |
| Presión media | Media de 24 h: −10 ± 3 mmHg | 8 | Norsk 2015 | cat. 01 V1 (l. 31) |

- Todo son datos de la ISS (órbita baja) con 8–11 personas: orientan, no predicen a un individuo.
- El +1 °C es de temperatura **central** (sensor en la frente). No es intercambiable con una
  lectura axilar ni oral.
- El catálogo no dice si "±" es desviación o error estándar, ni asigna cada cifra de presión
  a un estudio; la atribución a Norsk 2015 es inferida (mismo n = 8 que la fila V2).

### Frente a los priores actuales de LUNNA (`semillas/inicial.json`, órbita)

| Variable | Prior actual | Catálogo | Resultado |
|---|---|---|---|
| Frecuencia cardiaca | 0 %, "sin cambio poblacional verificado" | "Sin cambio en vuelo" (n = 8 + 8) | Coincide el valor. El texto de la fuente se queda corto: el catálogo sí reporta el dato |
| SpO2 | 0 %, no informativo | no encontrado | Coherente |
| Frecuencia respiratoria | 0 % | Disminuye, sin magnitud | Sin número que usar; el prior centrado en 0 no refleja la dirección conocida |
| Temperatura | +1,0 °C | ~+1 °C central (n = 11) | Coincide, pero se aplica a un termómetro axilar (el propio prior lo anota) |
| Presión sistólica | −6,7 % (= −8/120) | −8 ± 2 mmHg | Mismo origen. El 120 del denominador es un supuesto; el segundo estudio (−14 mmHg) no se usa |
| Presión diastólica | −11,25 % (= −9/80) | −9 ± 2 mmHg | Mismo origen. El 80 es un supuesto |
| Presión media | −9,3 %, derivado de sistólica y diastólica | −10 ± 3 mmHg, dato directo | **Discrepancia:** el prior no usa el dato directo del catálogo |

Dispersión entre personas, entre misiones y de un día a otro (τ₀, σ): **no están en el
catálogo**; en `inicial.json` son supuestos y así están rotulados.

---

## 4. A qué padecimientos aporta cada variable

Cada celda: **peso · dirección · nivel de evidencia**. No es un diagnóstico: indica en qué
padecimientos pesa una desviación de esa variable.

| Padecimiento | FC | SpO2 | FR | Temperatura | Presión arterial |
|---|---|---|---|---|---|
| P01 Arritmia / fibrilación auricular | — | 1 ↓ C | — | — | 1 ↓ C |
| P02 Desacondicionamiento e intolerancia ortostática | — | — | — | — | 1 ↓ C |
| P03 Hipoxia / problema respiratorio | 2 ↑ B | **3 ↓ A** | **3 ↑ B** | — | 1 ↑/↓ C |
| P04 Infección, fiebre o desregulación inmune | 2 ↑ A | 1 ↓ B | 1 ↑ B | **3 ↑ B** | 1 ↓ B |
| P05 Pérdida de sueño y desalineación circadiana | 1 ↑ C | — | — | — | — |
| P06 Fatiga y deterioro cognitivo | 1 ↑ C | — | — | — | — |
| P07 Exposición a CO2 / cefalea | 1 ↑ C | — | 2 ↑ C | — | — |
| P08 Radiación aguda por evento solar | 1 ↑ C | — | — | 1 ↑ C | — |
| P09 Estrés / salud conductual | 1 ↑ C | — | 1 ↑ C | — | 1 ↑ C |
| P10 Enfermedad por descompresión tras EVA | 1 ↑ C | 1 ↓ C | 1 ↑ C | — | 1 ↓ C |
| **De dónde sale (PV, filas)** | 33, 41, 66, 97, 128, 142, 158, 187 | 3, 34, 42, 188 | 35, 43, 129, 159, 189 | 44, 143 | 4, 23, 36, 45, 160, 190 |

- **Peso:** 1 marcador asociado · 2 eslabón causal directo · 3 la variable es el mecanismo.
  **Evidencia:** A relación medida con número · B mecanismo documentado en una fuente ·
  C juicio fisiológico del equipo, sin fuente directa (leyenda en `Leo/modelo-pesos/README.md`).
- **17 de los 25 vínculos son nivel C.** Los A y B citan a Smith 2013 (escala NEWS),
  Mishra 2020 (infección detectada por reloj) y Call 2005 (fiebre en gripe, LR+ 1,8,
  rotulado "terrestre"). Ningún peso de esta tabla está validado en astronautas
  (`Leo/modelo-pesos/README.md`).
- La columna FC usa las filas de `01:V3` (FC en reposo): PV no tiene filas para `04:A4`.
- El catálogo trata sistólica y diastólica como una sola variable (`01:V1`) y no liga la
  presión media a ningún padecimiento.

---

## 5. Lo que el catálogo NO tiene

1. **Ningún umbral [A] de signos vitales en vuelo.** NASA-STD-3001 remite a "valores
   clínicamente aceptados" y a documentos de programa no públicos (cat. 04 C.5; índice §4).
2. Umbral rojo para FC y FR. Umbral de bradicardia, de frecuencia respiratoria baja y de
   hipotermia.
3. Umbral, padecimientos y fila propia para la presión arterial media.
4. Magnitud del descenso de la frecuencia respiratoria en vuelo. Cambio de la SpO2 en vuelo.
5. Equivalencia entre temperatura axilar, oral y central. Cuánto dura "sostenida" en el
   criterio de fiebre.
6. Si el "±" de la presión arterial es desviación o error estándar, y de qué estudio sale
   cada cifra.
7. Dispersión entre personas y variabilidad día a día de cualquiera de las siete.
8. Datos de tránsito, Luna o Marte: todo lo medido es de la ISS.
9. Exactitud del pulsioxímetro de vuelo. El resumen que respalda el aviso sobre la SpO2
   de reloj (`RESUMEN-MAESTRO.md`) no está en el repo.
10. Vínculo padecimiento–variable para la FC instantánea (`04:A4`).

**Avisos de fiabilidad que hereda este documento** (índice §5): muchos artículos se
leyeron solo como resumen por la API de PubMed o Europe PMC; el primer autor de la
referencia [63] del cat. 01 (criterio de FC > 100 lpm) se anotó de memoria, aunque la URL
se abrió; los umbrales de SpO2 son una propuesta clínica terrestre, no oficial.

---

## 6. Candidatas futuras medibles por sensor (no implementadas)

| Candidata (id) | Medida en vuelo | Sensor nuestro | Qué respalda el catálogo | Umbral | De dónde sale |
|---|---|---|---|---|---|
| Variabilidad de la FC: RMSSD, SDNN, LF/HF (`01:V43`, `03:V17`) | Sí: Holter durante el sueño (n = 7), Bio-Monitor | ECG de la playera (intervalos RR) | Reducida en vuelo durante el sueño (n = 7); otra fila dice bandas sin cambio (n = 8): **las dos entradas no coinciden** y el duplicado sigue abierto. Aporta a P09 (peso 2, C) | Sin corte; usar línea base propia. Normas terrestres: RMSSD 42 ± 15 ms, SDNN 50 ± 16 ms | VMA filas 44 y 235 · cat. 01 V43 (l. 80) · cat. 03 V17 (l. 37) · PV fila 178 · `Iker/iker_variables.csv` fila 14 |
| Ritmo irregular / fibrilación auricular (`01:V31`) | Sí: Holter de 48 h (n = 13, ningún caso) | ECG de la playera | Aporta a P01 con peso 3, evidencia A. Solo como bandera de ritmo irregular, no diagnóstico | Sin umbral numérico | VMA fila 32 · cat. 01 V31 (l. 68) · PV fila 2 · `iker_variables.csv` fila 2 |
| Intervalo QTc (`01:V34`) | Sí: Holter (n = 3) | ECG de la playera | QTc > 440 ms aparece en el primer mes de vuelo largo. Aporta a P01 (peso 2, B) | [T] 450/460 ms; riesgo ≥ 500. [A] > 440 ms en el estudio de astronautas | VMA fila 35 · cat. 01 V34 (l. 71) · PV fila 8 |
| Tiempo de tránsito de la onda de pulso (`01:V23`) | Sí: cosmonautas, 162–196 días | ECG de la playera + PPG del reloj | Disminuye en vuelo (n = 8); magnitud no encontrada | no encontrado | VMA fila 24 · cat. 01 V23 (l. 53) |
| Descenso nocturno de la presión (`01:V2`) | Sí: registro de 24 h | Brazalete en tomas programadas | Dip de 8 ± 3 mmHg, conservado en vuelo (n = 8) | no encontrado | VMA fila 3 · cat. 01 V2 (l. 32) |
| Prueba de bipedestación: caída de presión y subida de FC (`01:V47`, `01:V48`) | Solo antes y después del vuelo (necesita gravedad) | Brazalete + playera | Aporta a P02 (peso 3, A y peso 2, B). Aplicable al aterrizar o en superficie | [T] caída ≥ 20/10 mmHg; [T] ≥ 30 lpm; [A] sistólica < 70 = presíncope | VMA filas 48 y 49 · cat. 01 V47–V48 (l. 93–94) · PV filas 16 y 17 |
| Sueño por actigrafía (`03:V30`, `03:V31`) | Sí: Actiwatch | Acelerómetro del reloj | ISS: 6,09 h de media, 43,8 % de noches < 6 h (n = 21) | [T] 7–9 h; < 6 h se asocia a peor desempeño | VMA filas 248 y 249 · cat. 03 V30–V31 (l. 66–67) |

Límite conocido para las tres primeras: según `Leo/modelo-pesos/README.md`, el reloj del
equipo no envía intervalos RR; tendrían que salir del ECG de la playera.

<!-- FIN DOCUMENTO CONSOLIDADO: Planeacion/Julio/backend/semillas/medibles.md -->


## Documento consolidado: `Planeacion/Leo/modelo-pesos/README.md`

> Fuente original: `Planeacion/Leo/modelo-pesos/README.md`

# Pesos fisiológicos + actualización bayesiana

Paquete para adaptar los pesos de las variables a cada malestar espacial con **actualización bayesiana**.
Fundamentos y contexto: **../modelo-predictivo-fundamentos.md** (secciones 1 a 8).

✅ DOI verificado en doi.org y Crossref (14-11-2026) · 🔶 decisión o juicio nuestro

## Archivos

| Archivo | Qué es |
|---|---|
| [pesos.csv](pesos.csv) | **99 celdas** (11 malestares × 9 variables): peso 0–3, dirección, mecanismo, nivel de evidencia, referencia con DOI y prior bayesiano. Se abre en Excel |
| [pesos.json](pesos.json) | Lo mismo en JSON, más la lista de referencias |
| [generar_pesos.py](generar_pesos.py) | **Fuente de verdad**: aquí se editan los pesos y se regeneran el CSV y el JSON |
| [actualizacion_bayesiana.py](actualizacion_bayesiana.py) | Implementación de referencia en Python puro (sin dependencias) con una demostración |
| [Sistema/interfaces/eva/pesos.js](../../../Sistema/interfaces/eva/pesos.js) | Copia ligera (solo celdas con peso) que usan la computadora central y la base en Tierra para el índice por padecimiento. La genera `generar_pesos.py` |

```bash
python generar_pesos.py            # regenera pesos.csv, pesos.json y Sistema/interfaces/eva/pesos.js
python actualizacion_bayesiana.py  # demostración con datos simulados
```

## Columnas de la tabla

| Columna | Significado |
|---|---|
| `peso_fisiologico` | 0 sin vía fisiológica (se descarta) · 1 marcador asociado · 2 eslabón causal directo · 3 la variable **es** el mecanismo |
| `direccion` | Hacia dónde se mueve la variable en el malestar (↑, ↓, "irregular", "al ponerse de pie") |
| `nivel_evidencia` | **A** relación medida con número · **B** mecanismo documentado en una fuente · **C** juicio fisiológico del equipo, sin fuente directa |
| `referencia`, `doi`, `url` | Fuente verificada (vacía en nivel C) |
| `prior_media`, `prior_de` | Prior Normal del peso. La desviación depende de la evidencia: **A 0,5 · B 1,0 · C 1,5**; peso 0 → 0,5 |

**Recuento:** 54 celdas con peso (11 A · 14 B · 29 C) y 45 descartadas. **Más de la mitad de los pesos son
juicio nuestro (C)**: por eso tienen el prior más ancho, para que los datos los puedan corregir.

## Modelo matemático

Para cada malestar *m* y cada día:

1. **Desviación personal.** Cada variable se convierte en z contra la línea base de la persona (z robusto con
   mediana y MAD móviles, el motor de Julio).
2. **Puntos** (como las escalas de alerta temprana MEWS/NEWS), solo en la dirección fisiológica:
   `x_v = 0 si |z|<1 · 1 si 1–2 · 2 si 2–3 · 3 si >3`
3. **Probabilidad del malestar** (regresión logística):

   `η = β₀ + Σ_v β_v · x_v`  y  `P(malestar) = σ(η) = 1 / (1 + e^(−η))`

4. **Prior** a partir de la tabla, con escala κ = ln(20)/9 ≈ 0,333 (peso 3 con desviación extrema ⇒ momios × 20):

   `β_v ~ Normal(κ · prior_media_v, (κ · prior_de_v)²)`
   `β₀ ~ Normal(logit(p₀), 1)`, con p₀ = probabilidad basal diaria del malestar (por ejemplo, desde la incidencia
   de Crucian et al. 2016, [doi:10.2147/IJGM.S114188](https://doi.org/10.2147/IJGM.S114188))

5. **Actualización con datos etiquetados** (días con y sin malestar), por aproximación de Laplace:

   `β̂ = argmax Σ [y log σ(η) + (1−y) log(1−σ(η))] − ½ (β−μ)ᵀ Σ⁻¹ (β−μ)`
   `Σ_post = (Xᵀ W X + Σ⁻¹)⁻¹`, con `W = diag(p(1−p))`

6. **Aprendizaje secuencial:** el posterior `Normal(β̂, Σ_post)` es el prior de la siguiente actualización.
7. **Selección de variables:** `P(β_v > 0)` del posterior. Si es baja (🔶 por ejemplo < 0,5), la variable se puede
   dejar de lado para ese malestar.

### Resultado de la demostración (datos simulados, malestar 4: infección)

| Variable | Peso inicial | Peso actualizado | "Verdad" simulada | P(efecto) |
|---|---:|---:|---:|---:|
| FC en reposo | 2,00 | 2,36 | 2,6 | 1,000 |
| Temperatura | 3,00 | 2,97 | 3,0 | 1,000 |
| Presión arterial | 1,00 | 0,59 | 0,0 | 0,972 |
| PVT | 0,00 | −0,30 | 0,0 | 0,122 |
| CO₂ de cabina | 0,00 | −0,09 | 0,0 | 0,371 |

Con 600 días simulados el modelo se acerca a la verdad, pero **el prior todavía pesa** (la presión arterial no
llega a 0). Con menos datos, el prior fisiológico domina; con más, mandan los datos.

## Ideas para tu compañero

- **Sin etiquetas** (lo normal hoy) solo se adaptan las líneas base y "lo normal de la tripulación"; los pesos
  quedan en su prior. Con etiquetas (de análogos o de vuelo) se actualizan los pesos.
- **Pesos que cambian con el tiempo:** añadir un paso de olvido entre actualizaciones (`Σ ← Σ + Q`, filtro de
  Kalman) para que el modelo se adapte a cada fase de la misión.
- **Jerárquico por persona:** compartir los pesos entre tripulantes, pero con una variación individual pequeña.
- **Análisis de sensibilidad:** cambiar cada peso C en ±1 y ver si cambian las alarmas.
- Ajustar κ y los niveles de desviación (A 0,5 · B 1,0 · C 1,5) son decisiones 🔶 nuestras: hay que justificarlas
  o variarlas.

## Limitaciones

- La columna `riesgo_nasa` usa los **nombres oficiales del HRR**, los mismos de la tabla de Iker (`Planeacion/Iker/iker_variables.csv`). Hipoxia, inmune y radiación aguda (que Iker no cubre) se tomaron de las páginas de riesgo de NASA y del Evidence Report NTRS 20160003870. El CO₂ no tiene riesgo HRR propio: se marca como peligro *Hostile/Closed Environments*, igual que Iker.
- Ningún peso está validado en astronautas, salvo CO₂ → cefalea (nivel A, Law et al. 2014).
- La HRV no está porque el reloj del equipo no envía intervalos RR.

## Referencias usadas en la tabla (todas ✅)

| Clave | Referencia | DOI |
|---|---|---|
| PEREZ2019 | Perez et al. 2019, NEJM — fibrilación auricular por reloj | [10.1056/NEJMoa1901183](https://doi.org/10.1056/NEJMoa1901183) |
| LEE2015 | Lee et al. 2015 — intolerancia ortostática tras la ISS | [10.3357/AMHP.EC08.2015](https://doi.org/10.3357/AMHP.EC08.2015) |
| GALLO2020 | Gallo et al. 2020 — modelo del desacondicionamiento cardiovascular | [10.1038/s41526-020-00117-5](https://doi.org/10.1038/s41526-020-00117-5) |
| NEWS2013 | Smith et al. 2013 — NEWS | [10.1016/j.resuscitation.2012.12.016](https://doi.org/10.1016/j.resuscitation.2012.12.016) |
| MEWS2001 | Subbe et al. 2001 — MEWS | [10.1093/qjmed/94.10.521](https://doi.org/10.1093/qjmed/94.10.521) |
| MISHRA2020 | Mishra et al. 2020 — infección detectada por reloj | [10.1038/s41551-020-00640-6](https://doi.org/10.1038/s41551-020-00640-6) |
| ALAVI2022 | Alavi et al. 2022 — alertas en tiempo real | [10.1038/s41591-021-01593-2](https://doi.org/10.1038/s41591-021-01593-2) |
| CRUCIAN2016 | Crucian et al. 2016 — incidencia de síntomas en vuelo | [10.2147/IJGM.S114188](https://doi.org/10.2147/IJGM.S114188) |
| BARGER2014 | Barger et al. 2014 — sueño en astronautas | [10.1016/S1474-4422(14)70122-X](https://doi.org/10.1016/S1474-4422(14)70122-X) |
| BASNER2011 | Basner y Dinges 2011 — PVT | [10.1093/sleep/34.5.581](https://doi.org/10.1093/sleep/34.5.581) |
| LAW2014 | Law et al. 2014 — CO₂ y cefalea en la ISS | [10.1097/JOM.0000000000000158](https://doi.org/10.1097/JOM.0000000000000158) |
| BASNER2013 | Basner et al. 2013 — sueño en Mars-500 | [10.1073/pnas.1212646110](https://doi.org/10.1073/pnas.1212646110) |
| BASNER2014 | Basner et al. 2014 — psicología en Mars-500 | [10.1371/journal.pone.0093298](https://doi.org/10.1371/journal.pone.0093298) |
| PNAS2026 | Invernada antártica, PNAS 2026 | [10.1073/pnas.2533420123](https://doi.org/10.1073/pnas.2533420123) |
| PALINKAS2008 | Palinkas y Suedfeld 2008 — expediciones polares | [10.1016/S0140-6736(07)61056-3](https://doi.org/10.1016/S0140-6736(07)61056-3) |
| MG2019 | Marshall-Goebel et al. 2019 — trombosis yugular | [10.1001/jamanetworkopen.2019.15011](https://doi.org/10.1001/jamanetworkopen.2019.15011) |
| LEE2020 | Lee et al. 2020 — SANS | [10.1038/s41526-020-0097-9](https://doi.org/10.1038/s41526-020-0097-9) |

Métodos estadísticos (lasso adaptativo, modelos mixtos, EWMA, CUSUM, Isolation Forest, transferencia) y sus DOI:
ver **../modelo-predictivo-fundamentos.md** §4.

<!-- FIN DOCUMENTO CONSOLIDADO: Planeacion/Leo/modelo-pesos/README.md -->


## Documento consolidado: `prototipo-salud/AVANCE.md`

> Fuente original: `prototipo-salud/AVANCE.md`

# AVANCE (se actualiza con cada hito)

## 2026-11-14 09:41 CDMX — Cambio de plan
- Iker pidió que las pruebas reales se hagan en su PC (Windows, RTX 4050 6 GB). En esta máquina (Linux, 8 CPU, sin GPU)
  **NO se ha corrido inferencia real** y **no se han descargado pesos**.
- Hecho antes del cambio: entorno detectado (ENTORNO.md); 5 repos oficiales clonados en vendor/ (vendor/REVISIONES.md);
  3 muestras oficiales copiadas de los repos a samples/ con procedencia y licencia (samples/FUENTES.md).

## 2026-11-14 ~09:50 CDMX — Construcción de la estructura para la PC
- Núcleo común escrito y probado con datos de prueba: core/runs.py (run_id, JSON, sha256, rutas relativas),
  core/formato.py (formato común), core/modalidad.py (detección/rechazo de modalidades incompatibles).
- En curso (subagentes): adaptadores de los 5 modelos con preprocesamiento oficial, sensores, fusión/reglas/stub,
  runner + app Streamlit, scripts PowerShell.

## 2026-11-14 ~10:15 CDMX — Estructura completa, lista para la PC de Iker
- **Inferencia real: NO se ha corrido** (esta máquina no tiene GPU y no se descargaron pesos). Primera inferencia real:
  pendiente en la PC de Iker con `README.md` → pasos 4 y 5 (PanEcho y luego EchoNet-Dynamic).
- Adaptadores de los 5 modelos con preprocesamiento oficial citado (archivo:líneas) y validación de modalidad/vista:
  PanEcho, EchoNet-Dynamic, MedSAM2, EchoPrime, EchoCLIP (`adapters/`). Pesos de los 5 son públicos (sin login ni
  términos), comprobado por cabeceras HTTP/API HF; tamaños en `MODELOS-TABLA.md`. Ningún modelo "bloqueado".
- Pruebas hechas aquí (Linux CPU, torch 2.5.1 CPU, venvs de prueba fuera de la entrega):
  - prueba de carga dummy de los 5 adaptadores a través del runner (`core.run_model`): status `prueba_carga`,
    `inferencia_real=false`, nada escrito en `outputs/normalized.csv`; runs de prueba borrados después;
  - rechazos con mensaje claro: vista no A4C en EchoNet-Dynamic, Doppler espectral en PanEcho, MedSAM2 sin caja,
    volumen 3D, DICOM Color Flow/PW, PNG declarado como video, video muy coloreado; estudio con un PNG mezclado:
    el PNG se lista como no analizado y se conserva;
  - error limpio por pesos faltantes (indica el comando de descarga);
  - `verificar.py`: (3)-(6) PASA, (1)-(2) PENDIENTE; `pytest -q tests`: 25 passed;
  - app Streamlit con AppTest: sin excepciones, 8 secciones, ejemplo sintético marcado SIMULADO, ejecución desde la UI
    (prueba de carga de EchoNet-Dynamic) con visor de frames;
  - scripts .ps1: 11 archivos, 0 errores de parseo (pwsh 7.7 en Linux), ASCII puro; `preparar_muestras` verifica sha256
    OK; `descargar_pesos -SoloMostrar` no descarga nada. **No probados en Windows PowerShell 5.1 real.**
- Licencias corregidas tras revisión: pesos MedSAM2 en HF = CC BY-SA 4.0; EchoNet-Dynamic tiene LICENSE (MIT) y
  LICENSE.txt restrictivo (uso solo local, sin redistribuir).

## 2026-11-14 ~10:25 CDMX — PRIMERA INFERENCIA REAL (reportada por Iker, en su PC)
- **Modelo:** PanEcho (`envs\panecho`), **CPU** (en ese momento torch quedó sin CUDA, ver bug abajo).
- **Resultado:** 58 filas normalizadas, 42,8 s. Run `outputs\raw\20261114T102516_panecho_4d352df3` (en la PC de Iker; no está en
  esta máquina, donde sigue sin haber inferencia real). Entrada, fuente y licencia: según `samples/FUENTES.md` (muestra oficial
  del repo, no de astronautas). No es diagnóstico.
- Pendiente de confirmar por Iker: qué muestra usó exactamente y que `verificar.py` pase (1) y (2) con ese run.

## 2026-11-14 ~10:40 CDMX — BUG: torch cu124 se reemplazaba por torch 2.15.0+cpu
- **Síntoma (PC de Iker):** `instalar_modelo.ps1 -Modelo panecho` instaló torch 2.5.1+cu124 y luego, al instalar
  `adapters/panecho/requirements-win.lock.txt`, quedó torch 2.15.0 (+cpu) y torchvision 0.29.2 -> `torch.cuda.is_available()=False`.
- **Causa:** los locks excluyen torch (`--no-emit-package`) pero conservan paquetes que lo requieren sin versión (timm, open-clip...).
  `uv pip install -r <lock>` volvía a resolver torch desde PyPI. Reproducido en esta máquina: `uv pip compile` de `timm==0.9.10`
  para Windows/3.11 resuelve `torch==2.15.0` y `torchvision==0.29.2`, con o sin el índice cu124 como extra.
- **Arreglo:** `scripts/torch-cu124-overrides.txt` (torch==2.5.1, torchvision==0.20.1) usado en toda instalación; el lock se
  instala con `--no-deps --override`; nueva función `Repair-TorchCuda` en `scripts/_comun.ps1` (reinstala torch/torchvision cu124 con
  `uv --reinstall-package` y verifica `cu124` + `cuda_disponible`, con error si no); `instalar_modelo.ps1` la ejecuta al final y,
  si el entorno ya estaba instalado pero sin CUDA, lo repara; nuevo `scripts/reparar_torch.ps1 -Modelo <modelo|todos>`.
  Sección "Reparar entorno ya instalado (CUDA False)" en `README.md`.
- **Probado aquí:** 12 .ps1 parsean sin errores (pwsh 7.7), ASCII puro; ningún lock/requirements fija torch/torchvision/nvidia/triton;
  `uv pip compile` para Windows/3.11 con el override y el índice cu124 resuelve `torch==2.5.1+cu124` y `torchvision==0.20.1+cu124`
  en los 5 modelos. **No probado:** la reinstalación real en Windows (no se instaló torch CUDA aquí).

## 2026-11-14 ~11:06 CDMX — PanEcho en CUDA en la PC de Iker (reportado por Iker)
- PanEcho corre en **CUDA** en la PC de Iker: **17,4 s**, run `20261114T105021_panecho_c753f120` (antes, en CPU: 42,8 s).
  Confirma la reparación de torch cu124. La app Streamlit abre en http://localhost:8501.
- Estos runs están en la PC de Iker, no en esta máquina (aquí sigue sin haber inferencia real).

## 2026-11-14 ~11:20 CDMX — BUG EchoNet-Dynamic: UnpicklingError al cargar pesos (numpy.core.multiarray.scalar)
- **Síntoma (PC de Iker):** run `20261114T105607_echonet_dynamic_33220f31` (cuda, torch 2.5.1 cu124, Python 3.11, numpy 1.26.4):
  `Weights only load failed ... Unsupported global numpy.core.multiarray.scalar`. Los checkpoints oficiales traen escalares numpy
  (`best_loss`, `epoch`...) y `torch.load(weights_only=True)` a secas los rechaza.
- **Arreglo** (`adapters/echonet_dynamic/infer.py`, `cargar_pesos`):
  1. Camino por defecto: `weights_only=True` dentro de `torch.serialization.safe_globals([...])` (o `add_safe_globals` si la torch
     no lo trae) con `numpy.core/_core.multiarray.scalar` y `_reconstruct`, `numpy.dtype`, `numpy.ndarray` y las clases dtype
     (`Float64DType`, `Int64DType`, ...). Cualquier otro objeto sigue bloqueado.
  2. Solo si eso da `UnpicklingError`, o si el usuario pone `options.torch_load_weights_only=false`: `weights_only=False` **solo**
     tras verificar nombre de archivo oficial y **tamaño exacto** (250572083 B y 317401511 B, por cabeceras HTTP); si no coincide,
     no se carga y hay error claro. El sha256 oficial no se conoce: se registra el calculado.
  3. El JSON del run registra `checkpoint.carga` (`weights_only_true_safe_globals` | `weights_only_false_verificado_tamano`),
     `checkpoint.globals_permitidos` y, en el segundo caso, una advertencia.
- **Probado en Linux** (numpy 1.26.4, torch 2.5.1 CPU, pesos ALEATORIOS creados en /tmp, **no son inferencia real**; no se
  descargaron pesos reales): se reproduce el error con `torch.load(weights_only=True)` a secas; `cargar_pesos` carga ambos
  checkpoints por el camino 1; con `weights_only=False` y tamaño distinto se rechaza; con tamaño coincidente carga por el camino
  2; un nombre de archivo no oficial se rechaza; un objeto arbitrario sigue bloqueado. Flujo completo del adaptador con pesos
  aleatorios: status ok, `carga = weights_only_true_safe_globals` en ambos checkpoints. **Pendiente:** confirmar en la PC de
  Iker con los pesos reales.
- Otros adaptadores: PanEcho (`weights_only=True`, checkpoint con clave `weights`) y EchoPrime (`weights_only=True`) usan el
  mismo patrón; PanEcho ya corrió bien en la PC de Iker. No se cambiaron.

## 2026-11-14 ~16:45 CDMX — Módulo ECG (`ecg`): NeuroKit2 + wfdb, sin torch ni pesos
- **Qué hay:** `adapters/ecg/` (`infer.py`, `metricas.py`, `manifest.json`, `requirements.in`, lock de Windows/cp311),
  modalidad nueva `ecg_1d` en `core/modalidad.py` (WFDB o CSV + `fs`; rechazo cruzado con los modelos de eco), runner
  que copia el registro WFDB completo a `input/`, fuente `algoritmo_senal` en el formato común, scripts PowerShell que
  toleran un modelo sin torch ni pesos (`instalar_modelo`, `inferir -Fs`, `descargar_pesos`, `instalar_todo`,
  `inferir_muestras`, `reparar_torch`, `preparar_muestras`), sección "4b. ECG" en la app, 3 muestras recortadas de
  PhysioNet en `samples/` (ODC-By 1.0, verificado en las páginas), pruebas y comprobación (7) en `verificar.py`.
- **Salidas:** FC, HRV (RMSSD, SDNN), PR, QTc Bazett, latidos irregulares (criterio RR) y bandera de ritmo irregular
  compatible con FA. La bandera es **BANDERA EXPERIMENTAL – NO DIAGNÓSTICO** en JSON, CSV, app y README.
- **Ejecutado de verdad aquí (Linux, CPU, Python 3.11 con las versiones del lock):** registros completos mitdb 100, 201,
  203 y afdb 04015 y las 3 muestras; runs guardados en `validacion/ecg/runs/` e informe generado desde ellos en
  `validacion/ecg/VALIDACION.md` (+ `validacion_por_registro.csv`). Resumen:
  - Picos R vs latidos anotados (±150 ms): sensibilidad 0,9987 / 1,0000 / 0,9191 y PPV 1,0000 / 0,9718 / 0,9892 en 100 / 201 / 203.
  - Latidos irregulares (criterio RR) vs ectópicos anotados: sensibilidad 0,882 / 0,595 / 0,425, PPV 1,000 / 0,450 / 0,234.
  - Bandera por segmento vs `(AFIB`: sensibilidad 1,000 / 1,000 / 1,000 en 201 / 203 / 04015; especificidad 1,000 / 0,054 / 0,000 / 0,904 en 100 / 201 / 203 / 04015. Detecta irregularidad, no FA.
  - PR y QTc: sin etiquetas con que compararlos; no validados. PTB-XL+ no sirvió (solo hay un CSV de características, sin señales).
- **Historia:** la primera versión de la bandera (ventanas de 30 s) y Kubios para los ectópicos dieron peores resultados
  (`validacion/ecg/v1_resumen.json`). La versión actual usa lo publicado por Dash et al. 2009 sin ajustar umbrales, pero
  se eligió después de ver la v1 sobre los mismos 4 registros: **no es una validación independiente**.
- **Captura:** `validacion/ecg/captura_ecg.png` (Streamlit headless + Playwright, muestra `ecg_fa_afdb04015`; el run de
  la captura se borró de `outputs/`, sus cifras coinciden con el caso `muestra_fa_afdb04015` de la validación).
- **Comprobado:** pytest 48 passed; `verificar.py` (3)–(7) PASA, (1)–(2) PENDIENTE; los 12 `.ps1` parsean con pwsh 7 y
  son ASCII. **No probado:** nada en Windows (ni `instalar_modelo.ps1 -Modelo ecg` ni la app allí).
- **Cambio menor en core:** `entorno.executable` ya no resuelve enlaces simbólicos (registraba el intérprete base de uv).

## 2026-11-15 ~01:10 CDMX — Motor de padecimientos (`motor/`) y vistas «Padecimientos» y «Configuración»
- **Qué:** se implementó `ALGORITMOS.md` (autorizado por Iker el 14 nov). `motor/`: puerta de calidad y mapeo de a.2/a.4
  (`calidad.py`, `entradas.py`), normalización (`normalizacion.py`), autocalibración (`calibracion.py`), score de dos canales
  (`score.py`), semáforo (`semaforo.py`), orquestación (`evaluacion.py`), parámetros provisionales y overrides
  (`parametros.py`, `tablas.py`) y generador de la tripulación SIMULADA (`simulador.py` → `datos/simulado/`). Tablas con
  fuente copiadas en `datos/modelo/`. En la app, selector lateral con tres vistas; las secciones 0–7 no cambiaron.
- **Comprobado en Linux:** pytest 98 passed, 5 skipped (43 previos + 55 nuevos: aritmética de d.7, semáforo, no aprender
  puntos alertados ni en cuarentena, base congelada, simulado nunca como real, overrides, vistas con AppTest). Capturas con
  Streamlit headless + Playwright. Con los 7 runs de `validacion/ecg/runs` (canal real, solo lectura): la muestra con FA da
  P01 AMARILLO «confirmar» y nunca ROJO (todo N4).
- **Límites conocidos:** todos los umbrales son provisionales (S1–S20) y nada está validado en astronautas; δ de fase = 0;
  de las capas fijas solo se calcula PHQ-9 (el resto «incompleto»/«inactivo»); sin interfaz para acuse de ROJO ni cierre de
  revisión de CUSUM; el dataset SIMULADO usa ruido acotado a propósito: con ruido gaussiano libre el CUSUM y la rampa dan
  muchas alertas en el control, así que la tasa de falsas alarmas **no** está medida; el QTc experimental del adaptador ECG
  puede cumplir el criterio de Rautaharju y dar AMARILLO «confirmar» en un registro normal (mitdb 100: 335 ms). **No
  probado:** nada en Windows ni con salidas reales de eco. **No es un diagnóstico.**

<!-- FIN DOCUMENTO CONSOLIDADO: prototipo-salud/AVANCE.md -->

## Documento consolidado: `prototipo-salud/CONTRATO.md`

> Fuente original: `prototipo-salud/CONTRATO.md`

# Contrato interno entre módulos (lo fija el coordinador; no cambiar sin avisar)

Destino: la carpeta `prototipo/` se copia a la PC de Iker (Windows + PowerShell, Python 3.13.5 como `python`,
RTX 4050 Laptop 6 GB VRAM, driver 621.14 → CUDA 12.x). En esta máquina Linux (sin GPU) NO se descargan pesos ni se
corre inferencia real: solo pruebas de carga con datos dummy, marcadas "NO se ha corrido inferencia real".

**Rutas: SIEMPRE relativas a la raíz `prototipo/`** (en código: `core.runs.ROOT`, `Path(__file__)`; en .ps1: `$PSScriptRoot`
+ `Join-Path`). Nada de `/home/box` en archivos entregables. En JSON las rutas van con `/`.

## Decisión de entornos (fijada)
- **Modelos: un venv por repo con Python 3.11**, creado con **uv** (`uv venv --python 3.11 envs\<key>`; uv descarga un
  CPython 3.11 autónomo si no existe; alternativa documentada: `py -3.11 -m venv`). Motivo: Python 3.13 no sirve para los
  pines de los repos (p. ej. echo_CLIP pide numpy 1.24.4/tokenizers 0.13.3, EchoPrime opencv 4.5.5.64/pydicom 2.3.1/
  polars 0.15.14, PanEcho se desarrolló en 3.10): no tienen wheels cp313. 3.11 cumple `python>=3.10` de MedSAM2.
- **PyTorch 2.5.1 + torchvision 0.20.1, wheels cu124** (`--index-url https://download.pytorch.org/whl/cu124`) en todos los
  venvs de modelos. Motivo: MedSAM2 exige torch>=2.5.1; cu124 es compatible con driver ≥551.61 en Windows (621.14 lo
  cumple) y la RTX 4050 (Ada, sm_89) está soportada. Desviaciones respecto a lo que pide cada repo se documentan en su manifest.
- **Instalación en 2 pasos por venv**: (1) torch/torchvision desde el índice cu124; (2) `requirements-win.lock.txt`
  (generado con `uv pip compile --python-platform x86_64-pc-windows-msvc --python-version 3.11 --no-emit-package torch
  --no-emit-package torchvision`, contra PyPI, es decir SIN torch dentro).
- **App** (Streamlit + sensores + fusión + runner + verificar): venv ligero `envs\app` con el Python 3.13 del sistema
  (`python -m venv envs\app`), `requirements-app.txt` con pines; incluye `uv` (de ahí se usa para crear los venvs de modelos).
- En Linux, para pruebas, los venvs de prueba van FUERA de la entrega (p. ej. `/tmp/nasa-linux-envs/<key>`, CPU torch
  2.5.1) y se apuntan con la variable `PROTOTIPO_ENVS_DIR`.

## Carpetas
```
app.py                     Streamlit (una página, 7 elementos)
verificar.py               6 comprobaciones de VERIFICACIÓN (+ tests/ con pytest)
requirements-app.txt       pines del venv de la app
core/runs.py               run_id, JSON, sha256, rutas relativas, ejecutar_adaptador(), rechazar()  [coordinador]
core/formato.py            formato común + append a outputs/normalized.csv                          [coordinador]
core/modalidad.py          detectar()/validar() de modalidad                                         [coordinador]
core/registry.py           lee adapters/*/manifest.json y calcula estado de cada modelo
core/run_model.py          runner por subprocess (app y CLI: python -m core.run_model ...)
adapters/<key>/infer.py    adaptador (se ejecuta con el python de envs/<key>)
adapters/<key>/manifest.json, requirements.in, requirements-win.lock.txt
sensores/                  importador CSV/JSON, ejemplo sintético simulated=true, resúmenes
fusion/                    tabla conjunta, comparación entre modelos, reglas experimentales, stub de red de fusión
scripts/*.ps1              instalación, pesos, inferencia, streamlit, verificación (compatibles con Windows PowerShell 5.1)
envs/  weights/  samples/  outputs/raw/  outputs/normalized.csv
```
`<key>` ∈ `panecho`, `echonet_dynamic`, `medsam2`, `echoprime`, `echoclip`, `ecg` (ECG: sin torch ni pesos; ver "Módulo ECG" al final).

## manifest.json (uno por modelo; lo leen registry.py, app.py y los .ps1)
```json
{
  "key": "panecho", "nombre": "PanEcho",
  "repo": "vendor/PanEcho", "repo_url": "https://github.com/CarDS-Yale/PanEcho", "repo_commit": "836c46e…",
  "entrypoint": "adapters/panecho/infer.py",
  "env": {"dir": "envs/panecho", "python": "3.11", "torch": "2.5.1", "torchvision": "0.20.1",
          "torch_index_url": "https://download.pytorch.org/whl/cu124",
          "requirements_in": "adapters/panecho/requirements.in",
          "lock_windows": "adapters/panecho/requirements-win.lock.txt",
          "install_vars": {}, "editable": [], "notas": "desviaciones respecto al repo y por qué"},
  "pesos": [{"archivo": "weights/panecho/panecho.pt", "url": "https://…", "tamano_bytes": 0,
             "tamano_fuente": "HEAD Content-Length 2026-11-14 (no se descargó)", "sha256": null,
             "acceso": "publico|gated|registro", "licencia": "…", "pasos_manuales": null,
             "descomprimir_en": null}],
  "muestras": [{"archivo": "samples/…", "fuente": "…", "licencia": "…"}],
  "modalidades_admitidas": ["video_2d"], "vistas_admitidas": ["cualquiera"],
  "entrada": "descripción", "salidas": ["lista de salidas reales que expone el repo"],
  "requiere_prompt": false, "opciones": {"clave": "valor por defecto"},
  "vram_estimada": {"gb": 1.0, "base": "parámetros medidos × 4 B + activaciones estimadas / o 'estimación sin medir'", "cabe_en_6gb": "probable|dudoso|no"},
  "licencia": "…", "estado": "pendiente de probar en PC" , "motivo_estado": "…", "timeout_s": 1800
}
```
`acceso` ≠ `publico` ⇒ los scripts NO descargan: imprimen `pasos_manuales` y el modelo queda "bloqueado" hasta que Iker
lo haga por su cuenta.

## Interfaz de un adaptador
```
envs\<key>\Scripts\python.exe adapters\<key>\infer.py --request <run_dir>\request.json --response <run_dir>\response.json
```
El adaptador usa `core.runs.ejecutar_adaptador(model, run)` (añade la raíz a `sys.path` con
`sys.path.insert(0, str(Path(__file__).resolve().parents[2]))`). `run(request, resp)`:
1. `core.modalidad.validar(input, declared_modality, admitidas, modelo)`; si no ok ⇒ `core.runs.rechazar(resp, motivo)` y return.
2. Valida vista si el modelo la exige (p. ej. EchoNet-Dynamic solo A4C); si no ⇒ rechazar.
3. Si `options.prueba_carga_dummy` ⇒ `resp["random_load_test"]=True`, construir la arquitectura SIN pesos, pasar un tensor
   aleatorio, guardar shapes/claves de salida; NO es inferencia real (ejecutar_adaptador añade el aviso).
4. Si no hay pesos en `weights/…` ⇒ status error con mensaje claro ("ejecuta scripts\descargar_pesos.ps1 -Modelo <key>" o
   pasos manuales si es gated).
5. Preprocesamiento OFICIAL del repo (citar archivo y líneas en `resp["config"]["preprocesamiento_fuente"]`), inferencia
   con `torch.no_grad()`, device `auto` (cuda si hay), `resp["raw_output"]` = salida original sin redondear,
   `resp["normalized"]` con `core.formato.filas_modelo(...)`, artefactos (máscaras .npz, overlay .mp4/.png) en run_dir,
   `resp["checkpoint"]` (ruta relativa, url, sha256), `resp["config"]`, `resp["device"]`, `resp["inferencia_real"]=True`,
   `resp["raw_output"]["vram_pico_mb"]=core.runs.vram_pico_mb()`.

request.json:
```json
{"run_id": "...", "run_dir": "outputs/raw/<run_id>", "input_path": "outputs/raw/<run_id>/input/<archivo o carpeta>",
 "subject_id": "...", "study_id": "...", "timestamp": "ISO o null", "simulated": false,
 "declared_modality": "video_2d|imagen_2d|volumen_3d|doppler_color|doppler_espectral|desconocida",
 "declared_view": "A4C|A2C|PLAX|PSAX|...|desconocida", "options": {"device": "auto"}}
```
response.json: ver `core.runs.nueva_respuesta()` (status ok|error|rechazado|prueba_carga, message, model, run_id,
checkpoint, device, random_load_test, inferencia_real, config, input, raw_output, normalized, artifacts, elapsed_s,
warnings, errors, entorno, started_at, finished_at).

## Formato común (outputs/normalized.csv) — ver core/formato.py
`subject_id, study_id, timestamp, source, model, metric, value, unit, quality, simulated, tipo, run_id, input_file, notes`
- `tipo`: medicion | probabilidad_clase | similitud | hallazgo | regla_alerta | comparacion
- Probabilidad de clase: metric `<tarea>:<clase>`, unit `probabilidad_modelo_0_1`. Similitud: unit `coseno`.
  Segmentación: `hallazgo`, áreas en `px2`; NUNCA mm/ml/cm/s sin calibración.
- Ausente = vacío, nunca 0. Prueba de carga nunca se escribe en normalized.csv.

## Runner (core/run_model.py, venv app)
`ejecutar(key, inputs, subject_id, study_id, timestamp, declared_modality, declared_view, options, simulated=False)`:
pre-valida modalidad con el manifest (rechaza sin lanzar subprocess), crea `outputs/raw/<run_id>/`, copia las entradas a
`input/`, escribe request.json, lanza el python de `envs/<key>` (o `$PROTOTIPO_ENVS_DIR/<key>`) con cwd=ROOT y timeout,
guarda stdout.log/stderr.log, lee response.json, escribe `run_dir/normalized_run.csv` y, si status=ok y no es prueba de
carga, añade a outputs/normalized.csv. CLI: `python -m core.run_model --model panecho --input samples\x.avi --subject S1 ...`.

## APIs para la app (sensores/ y fusion/)
- `sensores.importador.cargar(origen, nombre=None) -> (DataFrame largo, avisos)`; columnas
  `subject_id, timestamp, device, variable, value, unit, quality, simulated, metric_detail, notes`. Acepta CSV/JSON largo
  y CSV ancho. Variables canónicas en `sensores.importador.VARIABLES`. Faltante = NaN.
- `sensores.importador.a_formato_comun(df) -> list[dict]` (source=sensor).
- `sensores.resumen.resumir(df, subject_id, ventana_h=24, basal_dias=7, referencia=None) -> DataFrame`.
- `fusion.tabla.construir(normalized_df, sensores_df, subject_id, ventana_h=24, basal_dias=7, referencia=None) -> DataFrame`
- `fusion.tabla.comparar_modelos(normalized_df, subject_id, tolerancias=None) -> DataFrame` (lado a lado, diferencia,
  discrepancia; sin promediar; nota "acuerdo ≠ exactitud").
- `fusion.reglas.REGLAS`; `fusion.reglas.evaluar(tabla, comparacion, params=None) -> list[dict]` con
  `id, nombre, etiqueta="REGLA EXPERIMENTAL – no diagnóstica", formula, parametros, activada, datos (filas que la activaron), mensaje`.
- `fusion.red_fusion_stub.predecir(tabla) -> {"disponible": False, "motivo": "...", "probabilidades": None}`.

## Módulo ECG (`adapters/ecg`, key `ecg`) — añadido 2026-11-14
No es un modelo entrenado: es procesamiento de señal (NeuroKit2 0.3.0 + wfdb 4.3.1), CPU, **sin torch y sin pesos**
(`manifest.env` sin `torch`/`torchvision`/`torch_index_url`; `pesos: []`). Todo es estimación experimental; la bandera
de ritmo irregular es **BANDERA, NO DIAGNÓSTICO**.

- Modalidad nueva `ecg_1d` (`core/modalidad.py`): registro WFDB (`.hea` + `.dat`, opcional `.atr`/`.qrs`; el `.hea` fija
  la modalidad) o tabla CSV/TXT/TSV declarada `ecg_1d` (exige `options.fs`). Los modelos de eco rechazan `ecg_1d`; `ecg`
  rechaza video/imagen/DICOM/volumen. `source` nuevo en el formato común: `algoritmo_senal`.
- Runner: si la entrada es un archivo de un registro WFDB, copia a `input/` todos los compañeros del mismo nombre
  (`.hea/.dat/.atr/.qrs`) y `input_path` es la carpeta `input/` (el sha256 cubre todo). Varios archivos subidos = carpeta.
  El adaptador recibe por tanto una CARPETA con exactamente un `.hea`, o un archivo CSV/TXT/TSV.
  `ejecutar(..., raw_dir=None, normalized_csv=None)` y CLI `--raw-dir/--normalized-csv` redirigen runs y CSV (validación).
- Estructura: `adapters/ecg/infer.py` (E/S, NeuroKit2, artefactos) + `adapters/ecg/metricas.py` (**solo numpy +
  biblioteca estándar + core.formato**: RR, HRV, regla de ventanas, emparejamiento con anotaciones, filas normalizadas;
  importable desde el venv de la app para pruebas).
- Opciones (`manifest.opciones`, todas con valor por defecto escalar para que la app genere el control):
  `fs` (0.0 = usar la del .hea; obligatorio >0 en CSV), `canal` (0), `canal_nombre` (""), `csv_columna` (""),
  `inicio_s` (0.0), `duracion_s` (0.0 = hasta el final), `traza_max_s` (1800.0), `rr_min_s` (0.25), `rr_max_s` (3.0),
  `min_rr_hrv` (20), `ect_fraccion_prematuro` (0.80), `ect_n_previos` (8), `fa_latidos_segmento` (128),
  `fa_paso_latidos` (32), `fa_n_atipicos` (8), `fa_filtro_ectopicos` (true), `fa_umbral_nrmssd` (0.10), `fa_tpr_min` (0.54), `fa_tpr_max` (0.77),
  `fa_umbral_entropia` (0.70), `fa_min_ventanas_consecutivas` (2), `tolerancia_pico_ms` (150.0),
  `prueba_carga_dummy` (false).
- Métodos. Historia honesta: la v1 (2026-11-14) usaba Kubios para los latidos irregulares y, para la bandera, ventanas
  de 30 s con nRMSSD > 0,10 + prueba de puntos de inflexión. Al correrla sobre mitdb 100/201/203 y afdb 04015 dio mala
  especificidad (marcaba ectopia aislada, trigeminismo y ruido) y Kubios detectó <10 % de los ectópicos anotados en
  201/203. La v2 (abajo) NO ajusta umbrales a esos registros: adopta los estadísticos y umbrales publicados por Dash et
  al. 2009 y un criterio RR de prematuridad del 20 %. Aun así, v2 se eligió después de ver v1 sobre los mismos
  registros: sus cifras NO son una validación independiente.
  1. Picos R: `nk.ecg_clean(method="neurokit")` + `nk.ecg_peaks(method="neurokit", correct_artifacts=False)`.
  2. RR válidos: `rr_min_s ≤ RR ≤ rr_max_s`. FC = 60 / media(RR).
  3. Latidos irregulares (criterio RR documentado, principal): el latido i es "prematuro" si su RR previo cumple
     RR_i < `ect_fraccion_prematuro` × mediana(los `ect_n_previos` RR válidos anteriores; mínimo 4). El 20 % de
     prematuridad es la convención habitual del "filtro del 20 %" en HRV; aquí es EXPERIMENTAL. No distingue
     supraventricular de ventricular y en FA marca muchos latidos (no son extrasístoles). Se informa aparte, solo como
     comparación, la clase `ectopic` de `nk.signal_fixpeaks(method="Kubios", iterative=False)` (Lipponen & Tarvainen
     2019) con sus `longshort/missed/extra`.
  4. HRV (RMSSD, SDNN, ddof=1) sobre el segmento analizado completo con intervalos NN = RR válidos excluyendo el RR
     previo y el posterior de cada latido marcado en (3); se informa también el valor sin filtrar y por ventanas de
     300 s. Mínimo `min_rr_hrv`.
  5. PR = inicio QRS (`ECG_R_Onsets`) − inicio P (`ECG_P_Onsets`); QT = fin T (`ECG_T_Offsets`) − inicio QRS;
     QTc Bazett = QT / sqrt(RR previo en s); medianas por latido, de `nk.ecg_delineate(method="dwt")`. Mínimo 5 latidos.
  6. Bandera "ritmo irregular compatible con FA" (EXPERIMENTAL): reimplementación de los tres estadísticos de Dash
     et al. 2009 (Ann Biomed Eng 37(9):1701-9, doi:10.1007/s10439-009-9740-z) con SUS umbrales, sobre segmentos de
     `fa_latidos_segmento` = 128 latidos consecutivos (paso `fa_paso_latidos`): (C1) RMSSD/media(RR) >
     `fa_umbral_nrmssd`, (C2) razón de puntos de inflexión TPR dentro de [`fa_tpr_min`, `fa_tpr_max`], (C3) entropía
     de Shannon (16 intervalos, normalizada) > `fa_umbral_entropia`; tratamiento de atípicos (`fa_n_atipicos` RR más
     largos y más cortos) tal como lo describe el artículo (citar sección/tabla en `bandera_fa.fuente`; cualquier
     detalle que el artículo no fije se documenta como decisión propia). Segmento marcado = C1 y C2 y C3. Un segmento
     solo es evaluable si sus 128 latidos dan RR válidos suficientes (documentar). Bandera del registro = 1 si hay
     ≥ `fa_min_ventanas_consecutivas` segmentos marcados consecutivos; 0 si no; **vacía** (None) si hay menos segmentos
     evaluables que ese mínimo (p. ej. registros de menos de ~160 latidos). No se validó clínicamente; el paso entre
     segmentos y la regla de consecutivos son decisiones propias. `ventanas[]` describe cada segmento (duración variable).
     Antes de C1–C3 se aplica el filtro de ectópicos del artículo (p. 1703: RR[i]/RR[i−1] < Perc1, RR[i+1]/RR[i] > Perc99
     y RR[i+1]/RR[i+2] > Perc25; se eliminan RR[i] y su pausa compensadora y se enlaza la serie), con percentiles
     calculados dentro de cada segmento (decisión propia: el artículo no precisa el conjunto). La rama de "RR omitidos"
     del artículo NO se implementa (el texto no dice qué RR eliminar). `fa_filtro_ectopicos=false` lo desactiva.
- Filas normalizadas (siempre las 8; valor ausente = None con `quality="sin_dato: <motivo>"`, nunca 0), `model="ecg"`:

  | metric | unit | tipo | source | variable |
  |---|---|---|---|---|
  | `heart_rate` | bpm | medicion | algoritmo_senal | — |
  | `hrv_rmssd` | ms | medicion | algoritmo_senal | V43 |
  | `hrv_sdnn` | ms | medicion | algoritmo_senal | V43 |
  | `pr_interval` | ms | medicion | algoritmo_senal | V35 |
  | `qtc_bazett` | ms | medicion | algoritmo_senal | V34 |
  | `latidos_irregulares` | latidos | hallazgo | algoritmo_senal | proxy V32/V33 (criterio RR; quality `experimental_criterio_rr_prematuridad`) |
  | `ritmo_irregular_fraccion_ventanas` | fraccion_0_1 | hallazgo | regla_experimental | proxy V31 |
  | `ritmo_irregular_compatible_fa` | bandera_0_1_no_diagnostica | regla_alerta | regla_experimental | proxy V31 |

  La fila de la bandera lleva `quality="BANDERA_EXPERIMENTAL_NO_DIAGNOSTICO"` y `notes` que empieza por
  `BANDERA EXPERIMENTAL – NO DIAGNÓSTICO:` seguido de fórmula, parámetros y ventana. Las `notes` de HRV/FC indican la
  ventana (t inicio–fin en s) y n. PR y QTc nunca llevan `quality="ok"`: `experimental_delineacion_dwt` (o el aviso de
  ritmo irregular), porque la delineación no está validada aquí.
- `raw_output` (resúmenes; nada de arreglos por latido): `aviso`, `entrada`, `metodos`, `picos_r`, `fc`, `hrv`,
  `intervalos`, `latidos_irregulares`, `bandera_fa` (con `etiqueta`, `formula`, `parametros`, `fuente`, `valor`,
  `motivo`, `n_ventanas`, `n_evaluables`, `n_marcadas`, `fraccion_marcadas`, `max_consecutivas`, `ventanas[]` =
  `{i,t0_s,t1_s,n_rr,n_rr_filtrados_ectopicos,nrmssd,tpr,entropia,c1,c2,c3,marcada}`), `comparacion_anotaciones` (None si no hay
  `.atr`/`.qrs`), `tiempos_s`.
- `comparacion_anotaciones` (cuando hay anotaciones junto al registro; se recortan al segmento analizado):
  `picos_r` {referencia (`atr` o `qrs (detector automático no auditado)`), tolerancia_ms=150 (ventana de emparejamiento
  de ANSI/AAMI EC57), n_ref, n_det, tp, fn, fp, sensibilidad, ppv}; `ectopicos` {anotados_por_simbolo, n_anotados_V,
  n_anotados_A, n_anotados_otros, n_anotados_total, n_detectados, tp, fn, fp, sensibilidad, ppv,
  criterio_emparejamiento} para el criterio RR y `ectopicos_kubios` (mismos campos) para Kubios; `fa` {criterio_ventana (segmento AFIB si ≥50 % de su duración está en `(AFIB`),
  ritmos_anotados_s, fraccion_tiempo_afib_anotada, n_ventanas_evaluables, n_ventanas_afib, tp, fp, fn, tn,
  sensibilidad, especificidad, ppv, ventanas_afl {n, marcadas}, bandera_segmento}; `fc_hrv` {detectados, anotados,
  diferencias} (mismas funciones aplicadas a los latidos anotados). Una razón con denominador 0 es None, no 0.
- Artefacto `ecg_traza.npz` (numpy, sin pickle; lo lee la app, que no tiene wfdb): `fs`, `t0_s`, `senal` (float32,
  canal elegido, unidades físicas, primeros `traza_max_s` del segmento), `unidad`, `picos_r` e `picos_irregulares`
  (muestras relativas al inicio del segmento, todos), `ann_muestras`, `ann_simbolos`, `ritmo_inicio_s`, `ritmo_fin_s`,
  `ritmo_etiqueta`, `vent_t0_s`, `vent_t1_s`, `vent_marcada` (1/0/NaN).
- `options.prueba_carga_dummy`: señal sintética `nk.ecg_simulate` ⇒ `random_load_test=True` (NO es resultado).
- `inferencia_real=True` significa aquí "ejecución real del algoritmo sobre la señal entregada" (no hay red ni pesos).

<!-- FIN DOCUMENTO CONSOLIDADO: prototipo-salud/CONTRATO.md -->

## Documento consolidado: `prototipo-salud/datos/simulado/LEEME.md`

> Fuente original: `prototipo-salud/datos/simulado/LEEME.md`

# Tripulación SIMULADA (datos sintéticos)

**SIMULADO. No es dato de vuelo, no es fisiología real y no son datos de astronautas ni de ninguna persona.**
Son valores sintéticos: variables independientes con ruido acotado alrededor de medias arbitrarias (PRE: 12 desviaciones simétricas y equiespaciadas hasta ±1.0 DE simulada, en orden aleatorio, para que la base prevuelo sea estable; vuelo: uniforme hasta ±0.5 DE; provisional).
Solo sirven para ejercitar el flujo del motor de padecimientos (ALGORITMOS.md, sección h.2). Ninguna cifra de
aquí es una validación ni un resultado; todos los números son provisional. Nada es un diagnóstico.

## Contenido
- `tripulacion_simulada.csv`: CSV nativo del motor (`subject_id,timestamp,variable_id,value,unit,device_class,quality,context,method,simulated,notes`). Todas las filas llevan `simulated=true` y `notes` que empieza por «SIMULADO».
- `tripulacion_simulada.json`: misión (lanzamiento 2026-09-13), perfiles (edad y sexo INVENTADOS), escenarios, variables simuladas y los parámetros (provisional) con los que se generó.
- 5 personas (`SIM-T01`…`SIM-T05`), 30 días: PRE 2026-09-01…2026-09-12, vuelo 2026-09-13…2026-09-30; un valor diario por variable.
- Variables: todas las `sí en vuelo` de los padecimientos P03, P04, P05, P06, P07, P10, P16, P18 y P19 de `datos/modelo/PADECIMIENTO-VARIABLE.csv`. Solo FC, SpO2, FR, temperatura, sueño y ppCO2 tienen valores de aspecto plausible; el resto está en «u.a. SIMULADA» (media 100, DE 5). Las variables de presencia/síntoma valen 0 (ausente) cada día.

## Escenarios (provisional)
SIM-T01 control; SIM-T02 salto brusco en 04:A1 y 01:V3 (+5 DE, 27–30 sep); SIM-T03 rampa lenta de sueño 03:V30 (−0.10 DE/día desde el lanzamiento); SIM-T04 faltantes (sin SpO2, FR ni PIO2 en vuelo, y filas `sin_dato: <motivo>`); SIM-T05 datos N4 (PA cuffless muy desviada, bandera ECG = 1 y QTc 470 ms de tipo adaptador, 28–30 sep); toda la tripulación: ppCO2 (04:A23) +1.5 DE el 18 de septiembre (un solo día: una excursión más larga dejaría una señal de deriva del CUSUM que solo cierra una persona) («desviación compartida»).

## Regenerar (determinista con la semilla)
```
python -m motor.simulador
```
Desde la raíz del prototipo. Para otra semilla o carpeta: `from motor.simulador import generar; generar(dir_salida, semilla)`.

<!-- FIN DOCUMENTO CONSOLIDADO: prototipo-salud/datos/simulado/LEEME.md -->

## Documento consolidado: `prototipo-salud/docs-modelo/ALGORITMOS.md`

> Fuente original: `prototipo-salud/docs-modelo/ALGORITMOS.md`

# Especificación de algoritmos: de las salidas de los modelos al semáforo por padecimiento

14 nov 2026 (CDMX). **Documento de especificación; no contiene código ejecutable.** Solo investigación: **nada es un diagnóstico**. El sistema ordena qué revisar y recomienda consultar al cirujano de vuelo.

## 0. Convenciones

**Fuentes usadas (únicas).** Cada número de este documento sale de una de ellas o lleva la marca **[P]**.

| Sigla | Archivo |
|---|---|
| [PV] | `PADECIMIENTO-VARIABLE.csv` (350 ligas) |
| [PAD] | `PADECIMIENTOS.csv` y `PADECIMIENTOS.md` |
| [VMA] | `VARIABLES-MEDIDAS-ASTRONAUTAS.csv` / `.md` |
| [PREC] | `PRECISION-VARIABLES.md` |
| [IP§x] | `INVESTIGACION-PESOS.md`, sección x |
| [CON] | `prototipo/CONTRATO.md` |
| [REG] | `prototipo/fusion/reglas.py` y `fusion/tabla.py` |
| [INV] | Inventario de modelos del encargo (leído de los `manifest.json`, 14 nov 2026) |

**Marcas.**

- **[P]** = provisional/supuesto: no hay fuente en las tablas. Todos los [P] están reunidos en la sección (i) con su número (S1, S2…).
- **[terrestre]** / **[espacial]** = igual que en [IP].
- **SIMULADO** = dato sintético; nunca se presenta como real ni entra al aprendizaje.
- **[experimental]** = salida de un adaptador no validada (p. ej. bandera de ritmo irregular, PR, QTc).

**Símbolos.**

| Símbolo | Significado | Unidad |
|---|---|---|
| i | tripulante | — |
| v | variable del equipo (`variable_id` canónico) | — |
| p | padecimiento P01–P20 | — |
| c | clase de dispositivo o método con que se midió v | — |
| t | instante de la observación | tiempo |
| φ(t) | fase de misión: PRE (prevuelo), VT (vuelo temprano), VTa (vuelo tardío), POST (postvuelo) | — |
| x | observación admitida de v, en la unidad canónica de v | la de v |
| μ_pv, σ_pv | `prior_media` (= peso 1–3) y `prior_de` de la liga (p, v) en [PV] | puntos de peso |
| a_pv | activación de la liga, entre 0 y 1, o NA si no hay dato | adimensional |
| T_p | índice de evidencia ponderada del padecimiento | puntos de peso |
| ΔL_p | cambio de log-odds por las ligas con LR/OR publicado | nats (logaritmo natural) |
| Cob_p | cobertura: fracción del peso medible que sí se observó | 0–1 |

**Arquitectura (acordada; este documento solo la detalla).**

1. **Capa 1 – referencia poblacional terrestre** (edad, sexo, IMC) con los rangos de [IP§c].
2. **Capa 2 – autocalibración personal**: base prevuelo congelada + actualización protegida + CUSUM anclado al prevuelo.
3. **Capa 3 – tripulación como contexto**, nunca como nueva normalidad.
4. **Capas fijas**: puntajes publicados, calculados aparte y sin modificar.
5. **Salida**: un semáforo por padecimiento con cuatro estados: VERDE, AMARILLO, ROJO y GRIS («evidencia insuficiente»).

**Orden de cálculo en cada evaluación** (una por día y cada vez que llega un dato nuevo [P·S20]):

```
PARA cada tripulante i:
  1. Leer las filas del contrato; separar las SIMULADAS (b, G1).
  2. Puerta de calidad por fila → variable_id (o «sin variable de equipo»),
     clase de dispositivo c, nivel de calidad N0–N4, contexto.            (a, b)
  3. Por variable con observación vigente: z poblacional, z personal,
     z reciente, delta de tripulación, CUSUM → estado de la variable.     (c, e)
  4. Por padecimiento: activaciones, T_p, ΔL_p, cobertura, capas fijas.   (d, g)
  5. Semáforo y motivo.                                                   (f)
  6. Aprendizaje (solo después del paso 5, con cuarentena).               (e)
  7. Salida: color, variables que aportan, faltantes, capas fijas,
     etiquetas y «se recomienda revisión por el cirujano de vuelo».
```

---

## (a) Mapeo de modelos existentes → variables → padecimientos

### a.1 Estado real de los modelos [INV]

- **ECG** (`ecg`): único adaptador ejecutado de verdad (Linux/CPU, registros mitdb 100/201/203 y afdb 04015). Puede aportar **ya**, con las reservas de a.2.
- **Eco** (`panecho`, `echonet_dynamic`, `echoclip`, `echoprime`, `medsam2`): solo prueba de carga con datos dummy. **No existe ninguna inferencia real.** El algoritmo debe funcionar sin estas filas y aceptarlas cuando existan, siempre con nivel de calidad N4 (ver b) hasta que haya validación.
- No hay adaptador de PPG ni de reloj. Los datos de sensores entran por `sensores/importador.py` (a.4).

### a.2 Salidas con variable del equipo

Las ligas (padecimiento, peso, nivel) se copiaron de [PV] y se verificaron una por una.

| Modelo · métrica | Unidad · tipo · quality del contrato | `variable_id` | Ligas en [PV] (padecimiento: peso, nivel) | Cómo entra |
|---|---|---|---|---|
| `ecg` · `heart_rate` | bpm · medicion · `ok` o `sin_dato` | `01:V3` **solo si el registro se declara en reposo o sueño**; si no, `04:A4` (FC instantánea) | `01:V3`: P03 (2, B); P04 (2, A); P05, P06, P07, P08, P09, P10 (1, C cada una). **No está ligada a P01** (corrección 1 de [PAD]) **ni a P02**. `04:A4`: sin ligas | Medición. Nivel N1 en reposo con ritmo no marcado como irregular; N2 en otro caso (b.3). No se triplica con `03:V18` ni con `04:A4` |
| `ecg` · `hrv_rmssd`, `hrv_sdnn` | ms · medicion | `03:V17` (canónica). El contrato del prototipo las etiqueta «V43» (= `01:V43`, duplicado sin ligas): se trata como alias | P09 (2, C; dirección «↓ HF / ↑ LF») | **Una sola aportación** (no dos). Métrica de decisión: ln RMSSD [P·S14]; SDNN solo informativa. El adaptador no produce LF/HF |
| `ecg` · `qtc_bazett` | ms · medicion · `experimental_delineacion_dwt` (nunca `ok`) | `01:V34` | P01 (2, B; criterio Rautaharju) | N4: la liga se evalúa como nivel C; no actualiza la base; no puede dar ROJO sola. No evaluable si el ritmo está marcado como irregular |
| `ecg` · `pr_interval` | ms · medicion · `experimental_delineacion_dwt` | `01:V35` | P01 (1, C) | N4. Además `01:V35` es **solo pre-post** en astronautas [VMA] |
| `ecg` · `latidos_irregulares` | latidos · hallazgo · `experimental_criterio_rr_prematuridad` | **No unívoca**: proxy de `01:V32` y/o `01:V33` (el criterio RR no distingue supraventricular de ventricular [CON]) | `01:V32`: P01 (2, C). `01:V33`: P01 (3, C) | **Una sola aportación**, con el peso menor de las dos (2, C) [P·S12]. Nunca se cuenta como `01:V33`. N4. Va en el mismo grupo de correlación que la bandera (d.3) |
| `ecg` · `ritmo_irregular_compatible_fa` y `ritmo_irregular_fraccion_ventanas` | bandera 0/1 · regla_alerta · `BANDERA_EXPERIMENTAL_NO_DIAGNOSTICO`; fracción 0–1 · hallazgo | `01:V31` (proxy) | P01 (3, A; Perez 2019 / Taggar 2016) | **La bandera no hereda el nivel A.** Entra como N4 → nivel C (σ = 1.5), sin el LR de Taggar (d.2). Las dos filas son la misma evidencia: se usa la bandera; la fracción es descriptiva. Bandera vacía = `sin_dato`, no 0 |
| `panecho` · `EF`; `echonet_dynamic` · `EF`; `echoclip` · `feve`; `echoprime` · `ejection_fraction` | % · medicion (EchoCLIP: `zero_shot_por_similitud`; EchoPrime: `recuperacion_por_vecinos_no_calibrado`) | `01:V18` (FEVI) | `01:V18` entra en [PV] (P01 y P02, peso 1, evidencia C) | **Entra al score como liga N4 de peso 1 en P01 y P02** (criterio terrestre Lang 2015: FEVI <52 % M / <54 % F); no puede dar ROJO sola. Varios modelos el mismo día: mediana por modelo y puerta de discordancia a.5.4 (D > 10 pp = «discordante», no activa). R1 sigue como capa de demostración (a.6). En astronautas: sí en vuelo (Hamilton 2011, ISS, n = 6; [VMA] corregido el 15 nov 2026) |
| `panecho` · `LVSV` | cm³ (≡ mL) · medicion | `01:V4` (volumen sistólico) | P02 (1, C; ↓) | N4. La unidad es idéntica; lo que **no** está demostrado es que la estimación del modelo sea comparable con el método de vuelo (reinhalación / ecocardiografía) [P·S15] |
| `panecho` · `LVEDV` | cm³ · medicion | `01:V17` (**parcial**: la variable es «masa y volumen telediastólico»; el modelo no da masa) | P02 (1, C; ↓) | N4. `01:V17` es **solo pre-post** [VMA] |
| `panecho` · `LAVol` | cm³ · medicion | `01:V36` (volumen de aurícula izquierda; ID verificado en [VMA]) | P01 (1, C; ↑) | N4. `01:V36` es **solo pre-post** (resonancia) [VMA] |

Consecuencia: con las tablas actuales, los modelos de eco solo pueden aportar tres ligas de peso 1 y nivel C (dos a P02, una a P01). No se fuerza ningún mapeo a SANS, cálculos, hueso ni otros.

### a.3 Salidas **sin variable de equipo** (se guardan y se muestran; no entran a ningún score)

| Modelo | Salidas | Motivo |
|---|---|---|
| `panecho` | GLS; LVESV; LVSize; LVWallThickness (2); LVSystolicFunction; LVWallMotionAbnormalities; IVSd, LVPWd, LVIDs, LVIDd, LVOTDiam; LVDiastolicFunction; E/e'; RVSP; RVSize; RVSystolicFunction; RVIDd; TAPSE; RVSVel; RASize; RADimensionM-L; AVStructure; AVStenosis; AVPkVel; AVRegurg; LVOT20mmHg; MVStenosis; MVRegurgitation; TVRegurgitation; TVPkGrad; RAP-8-or-higher; AORoot; pericardial-effusion | No hay variable equivalente en [VMA]. LVESV y los diámetros del VI están «relacionados» con `01:V17`, pero no son ni la masa ni el volumen telediastólico |
| `panecho` | LASize (multiclase), LAIDs2D (cm) | Relacionadas con `01:V36`, pero no son un volumen. No se convierten |
| `echoprime` | `left_atrium_dilation` | Fracción de vecinos, no un volumen: no se mapea a `01:V36` |
| `echoprime` | `dilated_ivc` | La variable candidata `01:V16` es un **diámetro**; la salida es una fracción de vecinos 0–1. Además `01:V16` no tiene ligas en [PV] y es solo análogo |
| `echoprime` | Los otros 18 fenotipos (impella, pacemaker, valvulopatías, `pericardial_effusion`, `pulmonary_artery_pressure_continuous`, etc.), la vista por video y el informe recuperado | Sin variable de equipo. El informe es texto de otros estudios |
| `echoclip` | `similitud_texto`; binarios zero-shot (p. ej. pacemaker) | Similitud coseno: no es probabilidad ni medición. El umbral 0.298 de los autores se queda en `raw_output` |
| `echonet_dynamic`, `medsam2` | Áreas en px², frames de sístole, máscaras | **Sin calibración física.** No se convierten a mL, mm ni cm. Uso permitido: control de calidad y seguimiento relativo dentro del mismo estudio y recorte (c.6) |
| `ecg` | `heart_rate` fuera de reposo | Va a `04:A4`, que no tiene ligas |

No se derivan variables compuestas (p. ej. gasto cardíaco = LVSV × FC → `01:V5`) en esta etapa; además `01:V5` no tiene ligas.

### a.4 Entradas del importador de sensores (no son modelos)

| Variable del importador | `variable_id` | Nota |
|---|---|---|
| `heart_rate` | `01:V3` solo con contexto de reposo o noche; si no, `04:A4` | Reloj PPG: N2 |
| `hrv_rmssd`, `hrv_sdnn` | `03:V17` | Una sola aportación |
| `spo2` | `04:A3` | Muñeca o prenda: N2 |
| `bp_systolic`, `bp_diastolic` | `01:V1` | Sin manguito validado: N4 |
| `temp_body` | `04:A1` | Oral: precisión no evaluada [PAD] |
| `temp_skin` | Ninguna como valor absoluto | La piel no es la temperatura corporal [PREC]. Solo tendencia personal del mismo sensor; no se usa para «fiebre» |
| `sleep_duration` | `03:V30` | Actigrafía: N2 |
| `sleep_efficiency` | `03:V34` | Precisión no evaluada |
| `steps`, `active_minutes` | Sin liga (`01:V29` no está en [PV]) | Solo contexto (reposo / actividad) |
| `symptom` (texto libre) | Ninguna automática | Requiere que una persona lo codifique a una variable de síntoma |

### a.5 Varios modelos para la misma métrica (FEVE)

1. **No se promedian** (igual que `comparar_modelos` [REG]). Se muestran lado a lado con su `quality`.
2. De PanEcho se usa solo la fila `nivel_estudio_agregado` (no las de `nivel_video`), para no contar dos veces.
3. Si en el futuro una liga necesita un solo valor: **mediana** de los modelos admitidos, con dispersión D = máximo − mínimo (puntos porcentuales), y la etiqueta «modelo único» si solo hay uno [P·S16].
4. **R2 se envuelve como puerta de calidad:** si D supera la tolerancia (10 puntos en [REG], valor de demostración), la métrica queda «discordante», no activa nada y no se aprende de ella.
5. **El acuerdo no sube el nivel de calidad.** Que los modelos coincidan no prueba exactitud; EchoCLIP y EchoPrime tienen la misma procedencia (licencia Cedars-Sinai [INV]), así que sus errores pueden estar correlacionados (no verificado).
6. EchoCLIP solo se admite a la comparación si la vista declarada es apical (advertencia del manifest, no verificada aquí); EchoNet-Dynamic solo con A4C.

### a.6 Relación con las cinco reglas de demostración R1–R5 [REG]

Los parámetros siguen siendo **de demostración, sin validación**, tal como dice el propio código.

| Regla | Qué pasa con ella | Detalle |
|---|---|---|
| R1 (FEVE < 40 %) | **Se conserva como capa aparte** | No entra al semáforo: el 40 % no está validado en astronautas. Se muestra como aviso de demostración |
| R2 (discrepancia entre modelos) | **Se envuelve** | Pasa a ser la puerta de a.5 punto 4. La tolerancia sigue siendo de demostración |
| R3 (FC nocturna ≥ basal + 4 bpm, 2 noches; inspirada en Alavi 2022) | **Se envuelve y se corrige su base** | Su base actual es la mediana de los 7 días previos, sin excluir noches alertadas: eso permite aprender una anomalía como normal. En esta especificación la base sale de (e). El detector se conserva como activación de `01:V3` en P04, etiquetado [experimental] |
| R4 (eco más viejo que 72 h) | **Se envuelve** | Se convierte en la regla de vigencia de (g). Las 72 h siguen siendo provisionales |
| R5 (R1 ∧ R3) | **Se conserva como capa aparte** | El cruce de fuentes lo hace el score de (d). R5 no entra al semáforo |

### a.7 `quality` y `simulated`

- `simulated = true`: la fila va a un canal separado (b, G1). No alimenta bases, CUSUM, estadísticos de tripulación ni el semáforo real.
- `quality` determina el nivel N0–N4 (b.2). Un valor vacío con `sin_dato: <motivo>` es un faltante con motivo, **nunca un 0**.

---

## (b) Puerta de calidad por sensor

### b.1 Pasos de admisión

| Paso | Regla | Si falla |
|---|---|---|
| G0 Contrato | Las 14 columnas; `value` vacío ⇔ `quality` empieza por `sin_dato`. Una fila `prueba_de_carga` nunca debería llegar [CON] | Se rechaza (N0). Un 0 acompañado de `sin_dato` es una violación del contrato |
| G1 Simulación | `simulated = true` → canal SIMULADO | El semáforo real la ignora. El modo demostración la muestra con «[DATOS SIMULADOS]» |
| G2 Mapeo | Métrica → `variable_id` según (a). Nunca a un puntero fusionado (`01:V27`, `02:V75`, `04:A5`) | «Sin variable de equipo»: se guarda, no puntúa |
| G3 Tipo | `probabilidad_clase` y `similitud` nunca se tratan como medición ni como probabilidad clínica | Solo descriptivas |
| G4 Nivel | Asignar N1–N4 por variable, clase de dispositivo y `quality` (b.2, b.3) | — |
| G5 Unidad y dominio | Unidad esperada; valores imposibles (SpO2 > 100 %, fracción fuera de 0–1, duración negativa). Para la FC del adaptador ECG, sus propios límites de RR (0.25–3.0 s [CON]) equivalen a 20–240 lpm | N0 |
| G6 Contexto | Reposo / sueño / ejercicio / EVA / medicación. Una variable «en reposo» medida en actividad no se admite como tal | Se reasigna (p. ej. a `04:A4`) o N0 |
| G7 Duplicados | Misma persona, variable y ventana: una sola observación. Gana el mejor nivel; a igualdad, el `run_id` más reciente [P·S20] | — |

### b.2 Niveles de calidad y su efecto

La calidad **degrada el nivel de evidencia de la liga, no su peso**. Así se reutiliza la escala del equipo (`prior_de`: A = 0.5, B = 1.0, C = 1.5 [PAD]) y no se inventan multiplicadores.

| Nivel | Cuándo | Nivel de evidencia de la liga | ¿Actualiza la base personal? | ¿Entra a puntajes publicados? | ¿Cuenta para la cobertura que permite VERDE? |
|---|---|---|---|---|---|
| **N1** alta / referencia | Veredicto «alta» en [PREC], o instrumento de referencia declarado | El de la tabla | Sí | Sí | Sí |
| **N2** media / tendencia | Veredicto «media» | Baja un escalón (A→B, B→C) | Solo la base de **su misma clase de dispositivo**, marcada «tendencia» | No | Sí |
| **N3** interrogante | (a) «baja por evidencia» en [PREC] (CO2 de cabina, síntomas fuera de PHQ-9): baja un escalón. (b) Sin evaluación de precisión (295 de las 350 ligas): el de la tabla, con la marca «precisión no evaluada» | Según (a) o (b) | Solo si la calidad declarada por el adaptador o por quien captura es buena | Sí, cuando el puntaje pide justo esa modalidad (ítems de cuestionario, signos tomados a mano) | Sí |
| **N4** baja por error medido, experimental o modelo sin validar | Cuffless; etapas de sueño; temperatura central puntual; PR/QTc del adaptador; bandera de ritmo; criterio RR; **toda salida de modelo de eco**; métrica discordante (R2) | Forzado a C | **Nunca** | **Nunca** | **No** |
| **N0** rechazada | G0, G5 o G6 | — | — | — | — |

Dos reglas adicionales para N4: (1) un padecimiento no puede llegar a ROJO si todas sus ligas activas son N4; (2) un resultado negativo N4 no respalda un VERDE (p. ej. bandera = 0 no descarta nada).

Para N3(b) no se inventa ningún umbral de error: la puerta es «calidad declarada por el adaptador / interrogante».

### b.3 Asignación por variable (solo las 10 variables que cubre [PREC])

| Variable | N1 | N2 | N3 | N4 |
|---|---|---|---|---|
| FC en reposo `01:V3` | ECG en prenda u Holter, en reposo (LoA −3.2 a +2.9 lpm, Villar 2015). La salida del adaptador `ecg` se admite aquí por analogía [P·S13] | Reloj PPG en reposo (MAE 7.2 lpm); prenda en movimiento (−1.77 ± 7.22 lpm); ECG con ritmo marcado como irregular | — | PPG en actividad: no se admite como FC en reposo |
| Irregularidad `01:V31` | ECG u Holter leído por una persona [P·S13] | PPG con confirmación repetida (VPP 0.84 y 98.2 %; sin sensibilidad poblacional) | — | Bandera del adaptador `ecg` (Dash 2009 sin la rama de RR omitidos) |
| SpO2 `04:A3` | Oxímetro de dedo (referencia según [PREC]; sin cifra propia) | Muñeca o prenda (sesgo 0.8 %, LoA −2.7 a +4.1; Astroskin sobreestima ~3 % en hipoxia, n = 2) | — | — |
| Respiración `04:A2` | Bandas torácicas en reposo (1 ± 3 rpm) | Ejercicio máximo (2 ± 7 rpm); derivada de banda abdominal (−0.32 ± 5.27) | Conteo manual | — |
| Temperatura `04:A1` | — | Piel de prenda: solo como tendencia del mismo sensor | Oral (precisión no evaluada [PAD]) | Central estimada como valor puntual (+0.34 ± 0.2 °C; «not accurate enough», Gunga 2009) |
| Temperatura central `03:V47` (fase circadiana) | — | Doble sensor o estimación, **solo para el ritmo** | — | Valor puntual |
| PA `01:V1` | Manguito con validación ISO 81060-2 (ningún modelo concreto verificado [PREC]) | — | Manguito sin validación declarada | Cuffless (−2.13 ± 11.57 mmHg; la ESH indica no usarlo en clínica) |
| Sueño `03:V30` | — | Actigrafía, duración (sensibilidad 0.965, especificidad 0.329) | — | Etapas de dispositivos de consumo |
| PVT `03:V66` | — | PVT-B en laptop | PVT en reloj (latencia no cuantificada) | — |
| CO2 `04:A23` | — | — | Analizador de cabina, CDM, PCO2M («baja por evidencia», no por el sensor) | — |
| Síntomas | PHQ-9 | — | Resto de autorreportes | — |

Advertencias que la puerta debe mostrar siempre: ningún wearable está validado en microgravedad [PREC]; la SpO2 de muñeca tiende a sobreestimar en hipoxia, así que un valor normal N2 no descarta P03.

---

## (c) Normalización y desviación por variable

### c.1 Unidad de observación

- Signos continuos (FC, HRV, FR, SpO2): un valor por día = mediana de los tramos en reposo o sueño [P·S20]. Para comparar la HRV con la norma poblacional se usan ventanas de 5 min en reposo (el adaptador ya informa ventanas de 300 s); el RMSSD o SDNN de un registro largo completo no es comparable con Nunan 2010.
- Conteos (extrasístoles): tasa = n × 24 h / duración analizada (latidos por 24 h). Extrapolar un registro corto es un supuesto y se etiqueta «tasa extrapolada» [P·S12].
- Pruebas y cuestionarios: el resultado de cada aplicación.

### c.2 z poblacional (Capa 1)

`z_pob = (x − m_pob) / s_pob`, con m_pob y s_pob por edad, sexo e IMC **solo donde [IP§c] da el rango**. Todo es [terrestre] y no validado en microgravedad.

| Variable | Referencia de [IP§c] | Cómo se usa | Huecos |
|---|---|---|---|
| FC en reposo `01:V3` | Percentiles 5/50/95 NHANES (Ostchega 2011): 20–39 años ♂ 52/69/89, ♀ 57/74/95; 40–59 años ♂ 52/68/90, ♀ 56/71/92 lpm | z asimétrico: m_pob = P50; s_pob = (P95 − P50)/1.645 si x ≥ P50, y (P50 − P5)/1.645 si x < P50 (supone media normal a cada lado [P·S14]). Ejemplo ♂ 20–39: 12.2 lpm hacia arriba y 10.3 hacia abajo | Sin rango para < 20 ni ≥ 60 años. Sin ajuste por IMC (Quer 2020: edad, sexo, IMC y sueño explican < 10 %; no da coeficientes) |
| PA `01:V1` | Categorías ACC/AHA 2017 (normal < 120/< 80; elevada 120–129/< 80; HTA 1: 130–139 u 80–89; HTA 2: ≥ 140 o ≥ 90) | **Categoría ordinal, no z** | No hay distribución ni rango de PA baja. Sin ajuste por edad, sexo o IMC |
| SpO2 `04:A3` | Escala 1 de NEWS2: ≥ 96 → 0; 94–95 → 1; 92–93 → 2; ≤ 91 → 3 | **Banda ordinal, no z** (efecto techo) | Tendencias por edad, IMC y sexo (Apple 2023) sin coeficientes. De noche es 0.8 % más baja. La atmósfera de cabina cambia lo esperado [PREC] |
| Temperatura `04:A1` | Obermeyer 2017: media 36.6 °C; rango 95 % 35.7–37.3; −0.021 °C por década; +0.002 °C por kg/m² | m_pob = 36.6; s_pob = (37.3 − 35.7)/(2 × 1.96) ≈ 0.41 °C | La edad e IMC de referencia de la cohorte no están en las tablas: el ajuste queda inactivo hasta tenerlos [P·S14] |
| FR `04:A2` | NEWS2: 12–20 rpm = 0 puntos | **Dentro / fuera de rango, no z** | Sin distribución ni ajuste |
| HRV `03:V17` | Nunan 2010 (5 min): RMSSD 42 ± 15 ms; SDNN 50 ± 16 ms | En logaritmo, por la asimetría [P·S14]: ln RMSSD con m = 3.68 y s = 0.35; ln SDNN con m = 3.86 y s = 0.31 (momentos de una lognormal con la media y DE de Nunan) | Valores por sexo y década (Voss 2015, Umetani 1998) no transcritos: sin ajuste por edad |
| QTc `01:V34` | Rautaharju 2009: prolongado ≥ 450 ms (♂) / ≥ 460 ms (♀); corto ≤ 390 ms | **Criterio, no z** | — |
| Todas las demás | **Sin rango en las tablas** | Rama poblacional **inactiva**; se usa solo z personal y, si procede, tripulación | — |

El IMC se calcula con la masa (`01:V8`) y la estatura (`02:V61`); no hay una variable de IMC en [VMA].

### c.3 z personal (Capa 2)

Base por **(tripulante, variable, clase de dispositivo)**: nunca se mezclan clases (una base de SpO2 de muñeca es distinta de una de dedo).

**Base prevuelo congelada.** Con n0 observaciones prevuelo admitidas y estables (mínimo 5, Coskun 2021 vía [IP§d]):

- media encogida hacia la población o la tripulación (Sottas 2007):
  `μ_i = B · m_ref + (1 − B) · x̄_i`, con `B = (s_w²/n0) / (s_w²/n0 + s_b²)`
  - x̄_i: media (o mediana) prevuelo de la persona; m_ref: media poblacional de c.2 o, si no existe, la media prevuelo de la tripulación;
  - s_w: DE dentro de la persona; s_b: DE entre personas. Con pocos datos, s_w se toma del conjunto de la tripulación y con más datos, de la propia persona (Coskun). La única cifra de s_w en las tablas es la variación semanal mediana de 3 lpm para FC de reloj (Quer 2020); el resto se estima [P·S5].
- varianza predictiva: `s_i² = s_w² + B · s_b²`. Con n0 = 0, B = 1 y la fórmula se reduce al z poblacional; con cada dato la referencia se estrecha.
- piso de dispersión: `s_i ≥` error del sensor cuando [PREC] lo da (p. ej. 3 rpm para FR en reposo). Sin cifra, no se pone piso.

**z anclado y ajustado por fase** (el que decide):

`z_fase = (x − μ_i − δ_vφ) / s_i`

- δ_vφ: desplazamiento esperado de la variable v en la fase φ, en la unidad de v; δ = 0 en PRE. Ver (e.4) para cuándo se permite δ ≠ 0.

**z reciente** (detecta eventos agudos y protege el aprendizaje):

`z_act = (x − m_i(t)) / s_i`, con m_i(t) la media adaptativa protegida de (e.3).

**Error del propio z** (aproximación): `Var(z) ≈ 1/n0 + z²/(2·(n0 − 1))`. Se propaga a la activación en (d.4).

### c.4 Delta frente a la tripulación (Capa 3; contexto)

Para el tripulante i, con los otros n − 1 tripulantes en la misma fase y ventana:

`Δ_trip = (x_i − x̄_−i) / (s_−i · √(1 + 1/(n − 1)))`

- x̄_−i y s_−i: media y DE de los demás (se excluye a i).
- Con n pequeño, Δ_trip sigue una t de Student con n − 2 grados de libertad, no una normal: se convierte a un z equivalente con el mismo percentil antes de compararlo con cualquier corte.

| Tamaño de la tripulación n | Qué se hace [P·S6] |
|---|---|
| n ≤ 3 | Rama **inactiva** (con n = 3 quedan 1 grado de libertad y ningún poder) |
| 4 ≤ n ≤ 6 | Solo descriptivo: se muestra, no activa nada. En Mars-500 las respuestas de los 6 tripulantes variaron mucho [IP§d] |
| 7 ≤ n ≤ 14 | Se permite la etiqueta «desviación aislada» cuando el z equivalente pasa de ±1.5 (generalización **provisional** [P·S1]) |

**Único corte con fuente NASA:** cognición (`03:V68`), z ≤ −1.5 respecto de la media prevuelo de la muestra (NTRS 20240012108 [IP§d]):
`z_cog = (x_i(t) − m_pre) / s_pre`, con m_pre y s_pre la media y DE prevuelo de la tripulación en esa prueba. Si n no permite estimar s_pre, se aplica sobre la base personal y se etiqueta «variante del criterio».

Usos permitidos de la Capa 3: (1) el criterio de cognición; (2) etiqueta «desviación compartida» cuando al menos la mitad de la tripulación se desvía en la misma variable y ventana [P·S6], que orienta a una causa ambiental (P03, P05, P07); (3) etiqueta «desviación aislada». **Nunca** cambia una base, **nunca** apaga una alerta individual porque «todos están igual», y no se copia el −1.5 a PA o SpO2 como si fuera oficial.

### c.5 Estado de cada variable

| Estado | Condición | Fuente del corte |
|---|---|---|
| Normal | desviación adversa u < 1.5 | [P·S1] |
| Desviada | 1.5 ≤ u < u1 | generalización del −1.5 de Cognition [P·S1] |
| Alertada | u ≥ u1, con u1 = 2.33 (variable de una dirección) o 2.58 (dos direcciones): p < 0.01 | «amarilla con p < 0.01» [IP§d]; supone normalidad [P·S2] |
| Persistente | alertada durante ≥ 24 h, o en la siguiente medición programada si la variable no es diaria | «roja si persiste 24 h» [IP§d] |
| Deriva | CUSUM en señal (e.5) sin punto alertado | — |

u es la desviación en el sentido adverso de la liga: `u = z_fase` si la dirección es ↑; `u = −z_fase` si es ↓; `u = |z_fase|` si es «↑/↓», «cambio» o «alterada».

### c.6 Unidades y transformaciones

- **GLS (PanEcho):** el valor almacenado es −1 × la salida cruda. No se vuelve a cambiar el signo y, hasta comprobarlo con una inferencia real, la dirección adversa se define sobre |GLS| [P·S15]. Hoy GLS no tiene variable de equipo.
- **Fracciones 0–1** (fracción de vecinos, softmax o sigmoide sin calibrar, fracción de ventanas): no son z de una medición física ni probabilidades clínicas. No se convierten a cm, mL ni %.
- **Similitud coseno:** solo descriptiva.
- **px²:** sin conversión física. Único uso: razón contra el propio valor del mismo estudio y recorte (p. ej. área mínima / área máxima) como control de calidad.
- **cm³ y mL:** la misma unidad. La reserva es de método, no de unidad (a.2).
- **Bandas ordinales** (SpO2, PA, FR): se usan como categoría; no se les calcula z poblacional.

---

## (d) Score por padecimiento

El score tiene **dos canales que no se suman** y una cobertura. Los puntajes publicados van aparte (d.6).

### d.1 Activación de una liga

Cada liga (p, v) se clasifica por el texto de su columna `direccion`. La clasificación de las 350 filas es una tabla de configuración pendiente [P·S10].

| Tipo | Ejemplos de `direccion` | Activación a_pv |
|---|---|---|
| Una dirección | ↑, ↓ | rampa: 0 si u ≤ 1.5; 1 si u ≥ u1; lineal entre ambos |
| Dos direcciones | ↑/↓, cambio, alterada | igual, con u = \|z\| y u1 = 2.58 |
| Presencia | presente, positivo, uso | 1 si se informa presente; 0 si se informa ausente; NA si no se preguntó |
| Criterio publicado | ver tabla siguiente | 1 si se cumple; si no, la rampa |
| Dependiente de fase | «↑ en vuelo / ↓ postvuelo», «tercer cuarto» | el signo o la condición cambia con φ |
| No automática | «patrón atípico», «fenotipo», «hallazgo clínico» | solo si una persona lo codifica |
| Contexto o predisposición | antecedente, anticoncepción, fármacos que prolongan el QT, susceptibilidad previa | 1 si presente, pero **no puede disparar por sí sola** (f.1) |

**Criterios publicados que están en las tablas** (los demás no se usan como criterio):

| Variable | Criterio | Fuente | Ámbito |
|---|---|---|---|
| `01:V34` QTc | ≥ 450 ms ♂ / ≥ 460 ms ♀, o ≤ 390 ms | Rautaharju 2009 [PV] | [terrestre] |
| `01:V47` caída ortostática | ≥ 20/10 mmHg en 3 min | Freeman 2011 [PV] | [terrestre] |
| `01:V48` FC al ponerse de pie | ≥ 30 lpm | McGee 1999; Freeman 2011 (POTS, en 10 min) | [terrestre] |
| `03:V68` Cognition | ≤ −1.5 DE respecto del prevuelo | NTRS 20240012108 | [espacial] |
| `03:V1` PHQ-9 | ≥ 10 | Kroenke 2001 | [terrestre] |
| `04:A23` CO2 | media de 7 días ≥ 2.5 mmHg (fuera de la zona de riesgo de cefalea < 1 %) | Law 2014 | [espacial] |
| `04:A3` SpO2 | banda de NEWS2 con 3 puntos (≤ 91 %) | RCP NEWS2 [IP§c] | [terrestre] |
| `04:A2` FR | fuera de 12–20 rpm | RCP NEWS2 [IP§c] | [terrestre] |

El lapso de PVT ≥ 355 ms es la definición de un lapso, no un corte del número de lapsos: `03:V66` se evalúa por z.

### d.2 Canal bayesiano (solo ligas con LR u OR publicado)

`ℓ_p = ℓ0_p + ΔL_p`, con `ΔL_p = Σ_v κ_v · ln LR_v(resultado)`

- ℓ0_p = ln(π_p / (1 − π_p)): log-odds previas, con π_p la prevalencia (d.5).
- κ_v = 1 solo si la medición es del mismo tipo que la del estudio de origen; si no, κ_v = 0 y la liga aporta únicamente por el canal de pesos. No se usan descuentos intermedios.
- La suma supone independencia condicional. **Hoy ningún padecimiento tiene más de una liga con cifra**, así que el supuesto aún no se pone a prueba.

Las seis ligas con cifra en [PV]:

| Liga | Cifra de la tabla | LR derivado | ln LR | Cuándo κ = 1 |
|---|---|---|---|---|
| P01–`01:V31` | Sens 92 %, esp 82 % (palpación de pulso irregular; Taggar 2016) [terrestre] | LR+ = 0.92/0.18 = 5.1; LR− = 0.08/0.82 = 0.10 | +1.63 / −2.33 | Pulso irregular palpado o registro leído por una persona. **Nunca** con la bandera del adaptador |
| P09–`03:V1` | Sens 88 %, esp 88 % (PHQ-9 ≥ 10; Kroenke 2001) [terrestre] | LR+ = 7.3; LR− = 0.14 | +1.99 / −1.99 | PHQ-9 completo. Se refiere a depresión mayor; aplicarlo a todo P09 es un supuesto [P·S9] |
| P02–`01:V48` y P13–`01:V48` | LR+ 1.7 (pulso postural ≥ 30 lpm; McGee 1999) [terrestre] | LR− no publicado en las tablas | +0.53 / 0 | Prueba de bipedestación con gravedad (solo pre-post). Un negativo aporta 0 |
| P04–`04:A1` | LR+ 1.8 (fiebre, gripe; Call 2005) [terrestre] | LR− no publicado | +0.59 / 0 | «Fiebre» necesita definición; no está en las tablas. Provisional: temperatura corporal N1 o N3 > 37.3 °C (límite superior del rango de Obermeyer) [P·S9] |
| P07–`04:A23` | OR × 2 de cefalea por cada +1 mmHg (Law 2014) [espacial] | ΔL = ln 2 × (c̄7 − 2.5), con c̄7 la media de 7 días de ppCO2 en mmHg | 0.69 por mmHg | Sensor de cabina. El ancla (riesgo 1 % en 2.5 mmHg) y la unidad de tiempo de ese riesgo son una lectura propia del resumen [P·S9] |

**Incertidumbre.** Las tablas no traen intervalos de confianza de estos LR. Se usa la incertidumbre relativa que el equipo ya asignó a la liga: `DE(ln LR_v) = |ln LR_v| × σ_pv / μ_pv` [P·S8]. Ejemplo: Taggar (peso 3, nivel A): 1.63 × 0.5/3 = 0.27. `Var(ΔL_p) = Σ DE²`; `Var(ℓ_p) = Var(ℓ0_p) + Var(ΔL_p)`.

Si la medición queda a menos de su error del umbral del criterio, el resultado es «indeterminado» y aporta 0.

### d.3 Canal de pesos (todas las ligas; es el único para las 310 de nivel C)

El peso se trata como **evidencia débil con incertidumbre**, no como un LR: `w_pv ~ Normal(μ_pv, σ_pv²)`, truncada en 0, con σ_pv según el nivel efectivo después de la puerta (b.2).

**Grupos de correlación.** Las variables que miden casi lo mismo no se suman: dentro de un grupo g solo cuenta la mayor aportación.

- Declarados en [PAD]: {`03:V82`, `03:V83`, `04:A6`} (cefalea); {`01:V3`, `04:A4`} (FC).
- De este documento: {bandera de `01:V31`, `latidos_irregulares`} (en FA el criterio RR marca muchos latidos [CON]); {`hrv_rmssd`, `hrv_sdnn`}.
- El resto (p. ej. duración de sueño por actigrafía, diario y `04:A40`; DMO, T-score y Z-score) debe declararlo el equipo [P·S11].

`T_p = Σ_g max_{v∈g} (μ_pv · a_pv)`  (puntos de peso)

Solo entran las ligas con dato vigente; las NA no suman 0, quedan fuera y reducen la cobertura (g).

### d.4 Incertidumbre del canal de pesos

Con el miembro elegido de cada grupo (marcado con *):

`Var(T_p) ≈ Σ_g [ a*² · σ*² + μ*² · Var(a*) ]`

- primer término: incertidumbre del peso (domina en nivel C);
- segundo: incertidumbre de la medición; `Var(a) ≈ Var(z) / (u1 − 1.5)²` dentro de la rampa y 0 fuera de ella.

Se informa `T_p` con un intervalo aproximado del 90 %: `T_p ± 1.645 · DE(T_p)`, y el límite inferior `T_p^inf = max(0, T_p − 1.645 · DE(T_p))`. Es una aproximación normal con grupos independientes; **no es una calibración**.

Efecto buscado: una sola liga de peso 3 da T = 3 en cualquier nivel, pero T^inf = 2.18 si es A, 1.36 si es B y 0.53 si es C. La evidencia de nivel C alerta, pero no convence sola.

### d.5 Prevalencia previa π_p

Solo donde [PAD] da una cifra. Son prevalencias de misión o de fase, no probabilidades por ventana: usarlas como π_p es un supuesto [P·S7]. Para las proporciones x/n se usa `ℓ0 = ln((x + 0.5)/(n − x + 0.5))` y `Var(ℓ0) = 1/(x + 0.5) + 1/(n − x + 0.5)`.

| Padecimiento | Dato de [PAD] | ℓ0 ± DE | Fase en que aplica |
|---|---|---|---|
| P02 | Presíncope 5/6 tras Mir; 1/6 tras Shuttle (Meck 2001) | +1.30 ± 0.92 (larga duración); −1.30 ± 0.92 (corta) | Solo POST |
| P04 | 3.40 eventos por año-vuelo (Crucian 2016) | π(Δ) = 1 − exp(−λ·Δ), λ = 3.40/365.25 por día; con Δ = 7 d, π = 0.063 y ℓ0 = −2.70. Supone tasa constante [P·S7] | Vuelo |
| P07 | Cefalea en hasta 90 % los primeros días (MTB-004); ancla de Law 2014 | Ancla de d.2 | VT (contexto) y vuelo |
| P11 | 1/11 con trombo oclusivo (Marshall-Goebel 2019) | −1.95 ± 0.87 | Vuelo |
| P12 | 18 % con SANS clínicamente relevante; 70 % con ≥ 1 signo (MTB-001) | −1.52; DE no derivable (sin n) | Vuelo |
| P16 | 57/85 en el primer vuelo (Davis 1988); hasta 73 % los primeros 2–3 días | +0.70 ± 0.23 | VT |
| P10, P13 | Conteos sin denominador («0 eventos tipo II»; «8 postvuelo de 43») | **No derivable** | — |
| P05 | Sueño medio 5.96–6.09 h; hipnóticos en 75 % | No es una prevalencia del padecimiento: solo contexto | — |
| P01, P03, P06, P08, P09, P14, P15, P17–P20 | Vacío | **Sin prior** | — |

Sin prior no se inventa un número: se informa solo ΔL_p y se etiqueta «prior no disponible».

### d.6 Capas de puntajes publicados (en paralelo, sin mezclar)

- No se reentrenan ni se modifican sus puntos o gráficos. Se calculan **solo con todas sus entradas presentes** y con nivel N1 o N3; si falta una, el estado es «incompleto: falta X». Nunca se imputa un ítem.
- **No cambian T_p ni ΔL_p.** Se muestran al lado del score con su etiqueta.
- Las bandas o cortes que no están en las tablas no se retranscriben aquí: se toman de la publicación citada en [IP§a].

| Puntaje | Ámbito | Padecimiento junto al que se muestra | Entradas y estado con la lista actual del equipo |
|---|---|---|---|
| NEWS2 | [terrestre] | P03, P04 | FR `04:A2`, SpO2 `04:A3`, PAS `01:V1`, pulso `01:V3`/`04:A4`, temperatura `04:A1`. **Faltan como variable del equipo:** O2 suplementario y nivel de conciencia → hoy «incompleto» salvo captura manual |
| qSOFA | [terrestre] | P04 | PAS ≤ 100, FR ≥ 22, mentación alterada. No hay variable de mentación; sustituirla por el PVT daría un puntaje derivado que **no es qSOFA** y debe llamarse así |
| Lake Louise 2018 | [terrestre] | P03 (comparte síntomas con P16 y P07) | Cuatro ítems 0–3 con su propia redacción; no se derivan de la escala 0–10 de cefalea. AMS = ≥ 3 con cefalea ≥ 1 tras ≥ 6 h |
| Conkin (DCS) | [espacial: cámara] | P10 | **Inactivo.** Faltan TR, prerrespiración, presión del traje, deambulación y tiempo de EVA (hueco de [PAD]). No se calcula ni se reconstruye la fórmula a partir de los coeficientes |
| PHQ-9 | [terrestre] | P09 | 9 ítems. Sin uso documentado en astronautas [VMA] |
| Centor | [terrestre] | P04 | Fiebre `04:A1`, garganta `04:A19`; no hay variable de ganglios ni de tos → «incompleto» |
| STONE | [terrestre] | P13 | Hematuria `04:A22c`, cólico `02:V37`; el ítem de raza no aplica [IP§a] → no se da un total; se muestran los ítems |
| Constans | [terrestre; miembro superior] | P11 | Solo como analogía; no validado en cuello ni en vuelo |

Ningún puntaje está validado en microgravedad [IP§e].

### d.7 Ejemplos de comprobación (valores hipotéticos, solo para verificar la aritmética)

**P01 con solo el adaptador ECG:** bandera = 1 (peso 3, N4 → C); QTc cumple el criterio (peso 2, N4 → C); muchos latidos irregulares (mismo grupo que la bandera, no suma).
T = 3 + 2 = 5; DE = √(1.5² + 1.5²) = 2.12; T^inf = 1.51. Resultado: AMARILLO, con el texto «confirmar con ECG leído por una persona». No puede ser ROJO (todo es N4).

**P04 con FC de ECG en reposo y termómetro oral:** FC alertada (peso 2, A, N1); temperatura alertada (peso 3, B, N3b).
T = 5; DE = √(0.5² + 1.0²) = 1.12; T^inf = 3.16. Canal bayesiano: LR+ 1.8, por debajo del corte. Resultado: AMARILLO de inmediato y ROJO si persiste 24 h.

---

## (e) Autocalibración y salvaguardas

### e.1 Invariantes (normativos; cualquier implementación debe cumplirlos)

1. **La base prevuelo es inmutable.** Se congela al lanzamiento. Ningún proceso la reescribe; una corrección humana crea una versión nueva y conserva la anterior.
2. **Detectar no es aprender.** El CUSUM y los z usan todos los puntos admitidos; el aprendizaje usa solo los que pasan e.2.
3. **Solo una persona acepta una «nueva normalidad».** El sistema nunca la adopta solo.
4. **Nada SIMULADO, N4 o N0 entra al aprendizaje.**
5. **La tripulación no redefine la normalidad de nadie.**
6. **Las bases no se mezclan entre clases de dispositivo.**

### e.2 Qué puntos pueden actualizar la referencia adaptativa

Un punto entra solo si cumple **todo**:

| Condición | Detalle |
|---|---|
| Calidad | N1; N2 solo para la base de su propia clase; N3 con calidad declarada buena |
| No simulado | `simulated = false` |
| Estable | \|z_act\| < 1.5 [P·S1] y en el contexto estándar de la variable (reposo, noche) |
| Sin alerta | Ningún padecimiento ligado a la variable está en AMARILLO o ROJO, y la variable no está «alertada» ni «persistente» |
| Sin tendencia | El CUSUM de la variable no está en señal (Coskun: se excluyen atípicos y tendencias) |
| Fuera de episodio | No cae en la ventana de un episodio: síntoma informado, bandera de ritmo, fiebre, EVA, ejercicio, fármaco que altera la variable (p. ej. `01:V42`, `03:V87`) |
| Fuera de transición | No cae en el periodo de adaptación tras el lanzamiento ni tras el aterrizaje (e.4) |
| Cuarentena cumplida | Han pasado 72 h [P·S4] sin que aparezca una alerta posterior; así se excluyen hacia atrás los puntos del pródromo |

### e.3 Regla de actualización

**Versión mínima (EWMA protegido):**

`m_i(t) = m_i(t−1) + α · g(t) · (x(t) − m_i(t−1))`

- m_i: media adaptativa, en la unidad de la variable; arranca en μ_i (base prevuelo).
- g(t) = 1 si el punto cumple e.2; 0 si no (la media no se mueve).
- α = 0.1 [P·S3] (memoria efectiva ≈ 2/α − 1 = 19 observaciones).
- **Tope:** `|m_i(t) − (μ_i + δ_vφ)| ≤ 1.5 · s_i` [P·S3]. Al tocar el tope, la media se congela y la variable pasa a «deriva»: una persona decide.

**Versión objetivo (bayesiano jerárquico, población → tripulación → individuo):**

`x_i(t) ~ Normal(μ_i + δ_vφ(t), s_w²)`;  `μ_i ~ Normal(m_trip, s_b²)`;  `m_trip ~ Normal(m_pob, s_pob²)`

- μ_i se estima **solo con datos prevuelo** (fórmula cerrada de c.3) y queda fija.
- En vuelo solo se actualiza δ_vφ, con puntos que cumplen e.2 y dentro de los límites de e.4.
- Ambas versiones deben producir el mismo comportamiento ante las pruebas de (h.2).

### e.4 Fase de misión como covariable

- Fases: PRE, VT, VTa, POST. La duración de la fase temprana **no está establecida** [IP§e]; valor provisional 30 días [P·S4], solo para que el flujo se pueda ejecutar.
- δ_vφ ≠ 0 **solo para variables con una adaptación esperada documentada**. Candidatas con nota en [VMA]: volumen sistólico `01:V4` (+35 % en los meses 3–6), FR `04:A2` (disminuye, n = 8), HRV durante el sueño `03:V17` (reducida, n = 7). La lista definitiva la decide el equipo [P·S4].
- Para todo lo demás (SpO2, temperatura, sueño, PVT, síntomas, hueso, músculo, masa corporal) δ = 0: un cambio compartido por toda la tripulación sigue siendo una desviación. Así no se «normaliza» una pérdida ósea o una falta de sueño colectiva.
- δ_vφ del tripulante i se estima **sin sus propios datos** (mediana de los demás, encogida hacia el valor previo) y con un límite alrededor de ese valor previo. Con n ≤ 3 se usa solo el valor previo.
- Tras cada cambio de fase hay un periodo sin aprendizaje (provisional: 72 h [P·S4]).
- Los datos POST nunca modifican la base prevuelo ni las estimaciones de vuelo. En POST todo se compara contra el prevuelo (seguimiento de la recuperación).

### e.5 Tendencias lentas: CUSUM anclado al prevuelo

Residuo estandarizado en el sentido adverso: `r(t) = ± (x(t) − μ_i − δ_vφ) / s_i` (signo según la dirección de la liga).

`C(t) = max(0, C(t−1) + r(t) − k)`; señal cuando `C(t) ≥ h`.

- k = 0.5 y h = 5, en unidades de DE [P·S3] (valores habituales del CUSUM tabular; no constan en las tablas).
- Para variables de dos direcciones se llevan dos CUSUM.
- Sin dato, C se mantiene (no decae). El aprendizaje **no** lo reinicia; solo el cierre de una revisión humana.
- Equivalentes documentados: límites individuales de Sottas 2007 o el punto de ajuste de Coskun 2021, siempre anclados al prevuelo.

### e.6 Deriva frente a evento

| | Evento | Deriva |
|---|---|---|
| Señal | Variable «alertada» en uno o pocos puntos, o un episodio informado | CUSUM en señal, o tope del EWMA, sin punto alertado |
| Escala de tiempo | Horas a 1–2 días | Días a semanas |
| Efecto en el aprendizaje | Se excluyen el episodio y su cuarentena | Se congela la media adaptativa |
| Salida | Activación de la liga (d.1) | AMARILLO «por deriva» si la liga pesa ≥ 2 (f.1) |
| Cierre | Vuelve a normal con histéresis (f.3) | Solo por revisión humana, que puede registrar un ajuste individual con fecha y autor |

### e.7 Lo que nunca se aprende como normal

- Un ritmo irregular o una FA (ni la bandera, ni la FC o HRV medidas durante el episodio).
- La caída de PA o la taquicardia tras el aterrizaje, y cualquier prueba ortostática.
- Los periodos con fiebre, con síntomas activos o con un padecimiento ligado en AMARILLO o ROJO.
- La falta de sueño sostenida, la pérdida de masa y el declive cognitivo (δ = 0 para esas variables).
- Los valores bajo un fármaco que altera la variable.
- Las mediciones N4 (cuffless, PR/QTc experimentales, salidas de modelos de eco) y las SIMULADAS.

---

## (f) Umbrales del semáforo

Todos los cortes de esta sección son **provisionales** salvo donde se cita la fuente. Ninguno está validado en astronautas.

### f.1 Regla común

**AMARILLO** si se cumple al menos una:

| # | Condición | Justificación |
|---|---|---|
| A1 | T_p ≥ 3, con al menos una liga activa que no sea de contexto o predisposición | 3 = una variable de peso máximo totalmente activada, o varias menores [P·S2] |
| A2 | ΔL_p ≥ ln 3 ≈ 1.10 | [P·S2]. Con las cifras actuales lo alcanzan solo Taggar (5.1) y PHQ-9 (7.3) |
| A3 | Se cumple un criterio publicado de d.1 en una liga de peso ≥ 2 | Criterio con fuente; si la medición es N4 el texto dice «confirmar» |
| A4 | Deriva (e.5) en una liga de peso ≥ 2 | [P·S2] |
| A5 | Una capa fija supera su propio criterio publicado presente en las tablas (hoy: PHQ-9 ≥ 10; definición de AMS de Lake Louise) | El padecimiento no puede mostrarse VERDE; se etiqueta «por capa fija [terrestre]» |

**ROJO** si se cumple al menos una, **y** al menos una liga activa no es N4:

| # | Condición | Justificación |
|---|---|---|
| R-1 | T_p^inf ≥ 2 **y** persiste ≥ 24 h (o se repite en la siguiente medición programada) | Persistencia de [IP§d]; el corte 2 es [P·S2] |
| R-2 | Límite inferior de ΔL_p ≥ ln 10 ≈ 2.30 | [P·S2]. Ningún LR terrestre aislado de las tablas lo alcanza: hace falta evidencia concordante |
| R-3 | Evento centinela informado por una persona | Lista por decidir con el equipo; candidatas: `04:A37` (síntomas de DCS tipo II), `01:V55` (trombo visible). **Sin fuente** [P·S2] |

**VERDE** solo si no hay condición de AMARILLO ni de ROJO **y** la cobertura es suficiente (g.3). En otro caso, **GRIS** («evidencia insuficiente»).

Las reglas R1–R5 de demostración no intervienen (a.6); la FEVI de eco entra solo como liga N4 de peso 1 en P01 y P02. El 40 % de R1 no se usa como umbral.

### f.2 Particularidades por padecimiento

«Peso en vuelo» = suma de pesos de las ligas con `medido_en_vuelo = sí en vuelo` sobre el total [PV]. «Núcleo» = ligas de peso 3.

| ID | Criterio con fuente utilizable | Canal bayesiano · prior | Capa fija | Peso en vuelo / total · núcleo en vuelo | Nota |
|---|---|---|---|---|---|
| P01 | QTc (Rautaharju) | Taggar, solo con lectura humana · sin prior | — | 16/21 · 2 de 2 | Con solo el adaptador ECG: AMARILLO o GRIS, nunca VERDE ni ROJO |
| P02 | Caída ≥ 20/10 mmHg; FC +≥ 30 lpm | McGee · Meck 2001 (solo POST) | — | 5/24 · 0 de 1 | En vuelo es GRIS estructural: solo vigila desacondicionamiento con indicadores indirectos |
| P03 | Bandas de SpO2 y FR de NEWS2 | — · sin prior | NEWS2, Lake Louise | 16/16 · 3 de 3 | Law 2014 no se usa aquí (corrección 2). SpO2 de muñeca (N2) no da ROJO sin confirmación |
| P04 | — | Call 2005 · Crucian 2016 | NEWS2, qSOFA, Centor | 39/41 · 1 de 1 | R3 envuelta: FC nocturna con la base de (e) |
| P05 | — (el «< 6 h» de `03:V31` es definición de la variable, nivel C) | — · sin prior | — | 42/51 · 3 de 4 | DLMO no medible en vuelo; aMT6s se analiza en tierra |
| P06 | Cognition ≤ −1.5 DE (NASA) | — · sin prior | — | 36/49 · 2 de 2 | Único corte de cognición con fuente NASA |
| P07 | CO2: media de 7 días ≥ 2.5 mmHg (Law) | Law (continuo) · ancla propia | — | 24/24 · 2 de 2 | Las cefaleas a 2.8–4.5 mmHg de TB-004 son anecdóticas. Grupo de cefalea: cuenta una vez |
| P08 | — | — · sin prior (sin casos) | — (REMM no se implementa: el tiempo al vómito se confunde con P16) | 23/28 · 2 de 2 | No ha habido eventos ni hay registro de síntomas [VMA] |
| P09 | PHQ-9 ≥ 10 | Kroenke · sin prior | PHQ-9 | 21/43 · 0 de 1 | PHQ-9 sin uso documentado en astronautas |
| P10 | — | — · no derivable | Conkin (inactivo) | 14/16 · 2 de 2 | Todo es nivel C: ROJO exige dos ligas de peso 3 independientes o un centinela |
| P11 | — | — · 1/11 (Marshall-Goebel) | Constans (analogía) | 17/25 · 2 de 3 | D-dímero no disponible a bordo |
| P12 | — | — · 18 % (MTB-001) | — | 30/44 · 5 de 5 | Sin LR de síntomas |
| P13 | — | McGee (solo pre-post) · no derivable | STONE (sin total) | 41/50 · 5 de 6 | Parte de la química de orina se analiza al regreso [VMA]: ver F6 |
| P14 | — | — · sin prior | — | 14/32 · 0 de 3 | GRIS estructural en vuelo: no hay densitometría a bordo |
| P15 | — | — · sin prior | — | 20/34 · 2 de 4 | — |
| P16 | — | — · 57/85 (Davis 1988), solo VT | — | 6/10 · 1 de 1 | Criterios JSC no publicados |
| P17 | — | — · sin prior | — | 14/19 · 1 de 2 | — |
| P18 | — | — · sin prior | — | 12/17 · 1 de 1 | — |
| P19 | — | — · sin prior | — | 20/20 · 2 de 2 | — |
| P20 | — | — · sin prior | — | 14/19 · 3 de 4 | Criterios clínicos (ADA) sin fuente en las tablas |

### f.3 Histéresis y texto de salida

- Bajar de AMARILLO a VERDE: dos evaluaciones seguidas (o 48 h) sin condición activa [P·S2]. Bajar de ROJO: además, acuse de una persona.
- Toda salida AMARILLA o ROJA lleva: las ligas que aportaron (variable, valor, nivel de calidad, peso y nivel de evidencia), lo que faltó, las etiquetas [terrestre] / [experimental] / SIMULADO, y la frase «No es un diagnóstico. Se recomienda revisión por el cirujano de vuelo».
- **No se muestra ningún porcentaje de probabilidad.** ℓ_p es interno y solo sirve para ordenar: primero por color, luego por T_p^inf y, a igualdad, por ℓ_p cuando el prior tiene fuente.

---

## (g) Datos faltantes y variables solo pre/post o solo análogo

### g.1 Regla general

No se imputa ningún valor clínico. Una liga sin dato vigente es NA: no suma 0, no entra en T_p y reduce la cobertura. El último valor conocido se muestra con su antigüedad, pero no es evidencia fuera de su vigencia.

### g.2 Tipos de ausencia

| Estado | Definición | Efecto |
|---|---|---|
| F1 No medido en esta ventana | La variable es medible en la fase actual, pero no hay dato vigente | NA; baja la cobertura |
| F2 `sin_dato: <motivo>` | El adaptador corrió y no pudo calcular (p. ej. bandera con pocos segmentos) | Como F1; se conserva el motivo |
| F3 Solo pre/post | `medido_en_vuelo = solo pre-post vuelo` (50 ligas). Ejemplos: DXA de P14, pruebas ortostáticas de P02, `01:V35` | En vuelo es **ausencia estructural**: sale del denominador de la cobertura de vuelo y se informa aparte. En PRE y POST se evalúa normal |
| F4 Solo análogo | 12 ligas | No se espera. Si llega un dato (p. ej. de un modelo de eco) entra como N4 |
| F5 No / no encontrado | 33 ligas (p. ej. DLMO `03:V45`, PHQ-9 `03:V1`) | No se espera ni penaliza. Si alguien lo captura, entra como N3 |
| F6 Pendiente de análisis en tierra | Muestra tomada en vuelo y analizada al regreso ([VMA] cuenta esto como «sí en vuelo») | NA en vuelo. Hace falta una columna de latencia que hoy no existe [P·S17] |
| F7 Vencido | Dato más viejo que su vigencia | NA; se muestra como «último conocido» |

Vigencias, todas provisionales [P·S18]: signos continuos, 24 h; diarios y síntomas, 48 h; pruebas cognitivas, hasta la siguiente aplicación programada (el RST se hace cada 4 días [PREC]); eco, 72 h (R4 envuelta, valor de demostración); laboratorio, hasta la siguiente muestra.

### g.3 Cobertura y estado GRIS

`Cob_p = Σ (μ_pv de las ligas con dato vigente N1–N3) / Σ (μ_pv de las ligas medibles en la fase actual)`

VERDE exige las dos condiciones [P·S19]:

1. Cob_p ≥ 0.5;
2. al menos una liga del núcleo (peso 3) con dato vigente N1–N3.

Si no se cumplen y no hay alerta, el estado es **GRIS** con el motivo: «faltan X, Y» o «estructural: el núcleo solo existe pre/post». Un padecimiento en AMARILLO o ROJO con cobertura baja conserva su color y añade «cobertura baja».

Para dar idea de lo que se ignora, se informa también `T_p^máx = T_p + Σ μ_pv de las ligas medibles sin dato`: el valor que tendría T_p si todo lo no medido estuviera activado.

---

## (h) Plan de validación

Ningún resultado de este plan es una validación espacial. En esta etapa **no se entrena ni se ajusta ningún peso de los modelos de eco**.

### h.1 Brazo 1: datos terrestres públicos

Solo datos de acceso abierto, sin registro ni aceptación de términos. Quedan fuera el conjunto EchoNet-Dynamic, LSAH, LSDA y OSDR controlado.

| Objeto | Datos | Métricas | Regla |
|---|---|---|---|
| Picos R | Registros de PhysioNet **no usados** para elegir la v2 (otros de mitdb y afdb) | Sensibilidad y VPP con tolerancia de 150 ms (la del contrato) | Umbrales congelados antes de mirar los registros; separación por registro, no por segmento |
| Bandera de ritmo irregular | Los mismos, más registros de ritmo sinusal y de FA de otras bases abiertas de PhysioNet (condición de acceso por verificar antes de usarlas) | Sensibilidad, especificidad y VPP por segmento y por registro; falsas alarmas por 24 h en ritmo sinusal | Las cifras de 100/201/203/04015 no cuentan: no son independientes [INV] |
| Criterio RR de prematuridad | Registros con anotación de latido | Sensibilidad y VPP; se informa por separado supraventricular y ventricular para documentar que no los distingue | — |
| FC y HRV | Latidos anotados frente a detectados | Sesgo y límites de acuerdo | Comparar con el margen de [PREC] (±5 lpm) |
| PR y QTc | Solo si existe una base abierta con anotación de inicio y fin de ondas (por verificar) | Sesgo y límites de acuerdo | Mientras no se haga, siguen en N4 |
| Semáforo de P01 | Etiqueta por registro (FA presente o no) | Matriz de confusión color × etiqueta y fracción de registros con FA en cada color | Es una comprobación de consistencia del color, no una calibración de probabilidades |
| Demás padecimientos | No hay datos abiertos con etiqueta | Solo verificación por construcción: casos resueltos a mano como los de d.7 | Se declara como hueco |
| Modelos de eco | Solo las muestras ya incluidas en `prototipo/samples`, cuando existan pesos en la PC de Iker | Comprobaciones técnicas: rechazo por modalidad y vista, repetibilidad, estadísticos de discrepancia (R2) | No hay referencia clínica: siguen en N4 |

### h.2 Brazo 2: tripulación SIMULADA

Datos sintéticos **sin relación fisiológica real** (variables independientes con ruido alrededor de medias arbitrarias), siempre con `simulated = true` y la etiqueta **SIMULADO** en toda salida. Solo prueban el flujo.

| # | Escenario SIMULADO | Resultado esperado |
|---|---|---|
| 1 | Todo dentro de la base, cobertura completa | VERDE |
| 2 | Falta el núcleo de un padecimiento | GRIS, no VERDE |
| 3 | Fila con `sin_dato` | Se trata como faltante, nunca como 0 |
| 4 | Salto brusco en una variable | Alerta; la media adaptativa **no cambia** |
| 5 | Rampa lenta | Señal del CUSUM; tope del EWMA; la base prevuelo intacta |
| 6 | Dato N4 (cuffless, bandera, salida de eco) | No actualiza la base; no produce ROJO; no respalda VERDE |
| 7 | Intento de escribir la base prevuelo | Rechazado; queda registro |
| 8 | Puntos previos a una alerta, dentro de la cuarentena | Excluidos hacia atrás |
| 9 | Cambio de fase | Periodo sin aprendizaje; δ solo en las variables permitidas |
| 10 | Toda la tripulación se desvía a la vez | Etiqueta «desviación compartida»; ninguna alerta individual se apaga; ninguna base cambia |
| 11 | Tripulación de 3 | Capa 3 inactiva |
| 12 | Capa fija sin una entrada | «Incompleto: falta X» |
| 13 | Dos modelos con FEVE discordante | Métrica «discordante»; no activa nada |
| 14 | Filas simuladas mezcladas con reales | El semáforo real no cambia |

Métricas: cumplimiento de los invariantes de e.1 (sí/no) y, sobre las anomalías inyectadas, retraso de detección y tasa de alertas sin anomalía. Estas cifras dependen del ruido elegido y **no se pueden trasladar** a personas reales.

---

## (i) Supuestos abiertos

| # | Supuesto | Dónde |
|---|---|---|
| S1 | Generalizar el −1.5 DE de NASA Cognition a otras variables como inicio de la rampa y como corte de «estable» y de «desviación aislada» | c.4, c.5, d.1, e.2 |
| S2 | Umbrales del semáforo: T ≥ 3; T^inf ≥ 2; ln 3 y ln 10; lista de centinelas; histéresis; suponer normalidad para traducir p < 0.01 a 2.33/2.58 | c.5, f |
| S3 | α = 0.1 del EWMA; tope de 1.5 DE; CUSUM con k = 0.5 y h = 5 | e.3, e.5 |
| S4 | Duración de la fase temprana (30 días) y de los periodos sin aprendizaje (72 h); cuarentena de 72 h; lista de variables con adaptación esperada (δ ≠ 0) | e.2, e.4 |
| S5 | DE dentro y entre personas: solo hay cifra para FC de reloj (Quer); el resto se estima con la propia tripulación | c.3 |
| S6 | Tamaños mínimos de tripulación (4 y 7) y la fracción «la mitad» para la desviación compartida | c.4 |
| S7 | Usar prevalencias de misión como log-odds previas; tasa constante para P04. Sin prior utilizable en P01, P03, P05, P06, P08–P10, P13–P15 y P17–P20 | d.5 |
| S8 | Incertidumbre del ln LR tomada de σ/μ de la liga; aproximación normal e independencia entre grupos para el intervalo de T | d.2, d.4 |
| S9 | Aplicar LR terrestres a padecimientos más amplios (PHQ-9 → P09; gripe → P04); definición provisional de fiebre (> 37.3 °C); lectura del ancla de Law 2014 y su unidad de tiempo | d.2 |
| S10 | Clasificación de la columna `direccion` (texto libre) de las 350 ligas, incluidas las de contexto o predisposición | d.1 |
| S11 | Grupos de correlación más allá de los dos declarados en [PAD] | d.3 |
| S12 | `latidos_irregulares` no distingue supraventricular de ventricular: se le da el peso menor (2, C); extrapolar conteos a 24 h | a.2, c.1 |
| S13 | Tratar la FC del adaptador `ecg` como «alta» por analogía con la prenda ECG de Villar 2015; tratar la lectura humana de ECG y el oxímetro de dedo como referencia sin cifra propia | b.3 |
| S14 | Formas de distribución: media normal a cada lado para la FC; lognormal para la HRV; RMSSD como proxy de «↓ HF»; sin ajuste por edad en HRV ni por edad/IMC en temperatura | c.2 |
| S15 | Signo y sentido de GLS sin comprobar con una inferencia real; que LVSV, LVEDV y LAVol de un modelo sean comparables con el método de vuelo o con la resonancia (cm³ y mL sí son la misma unidad) | a.2, c.6 |
| S16 | Mediana entre modelos y tolerancia de 10 puntos para la FEVE; precedencia de vistas | a.5 |
| S17 | Falta una columna de latencia (tiempo real frente a análisis en tierra) en [VMA] | g.2 |
| S18 | Vigencia de cada tipo de dato, incluidas las 72 h del eco | g.2 |
| S19 | Cobertura mínima de 0.5 y exigencia de una liga del núcleo para VERDE | g.3 |
| S20 | Frecuencia de evaluación, agregación diaria por mediana y regla de duplicados | 0, b.1, c.1 |

Hechos que limitan todo lo anterior (no son parámetros, pero deben quedar a la vista):

1. **Los modelos de eco no tienen ninguna inferencia real** y la FEVI (`01:V18`) entra solo como N4 de peso 1 en P01 y P02: sola no cambia ningún color (suma T = 1) y no puede dar ROJO.
2. La bandera de ritmo es una reimplementación **incompleta** de Dash 2009 (sin la rama de RR omitidos) y sus cifras no son una validación independiente. PR y QTc no están validados.
3. **Ningún puntaje publicado está validado en microgravedad**, y ningún wearable tampoco.
4. No existen pesos por síntoma derivados en vuelo; 310 de las 350 ligas son de nivel C.
5. El modelo de Conkin no se puede calcular: faltan sus variables.
6. NEWS2, qSOFA y Centor quedan «incompletos» con la lista actual de variables.
7. Los parámetros de R1–R5 siguen siendo de demostración.
8. No se usó ningún dato individual de astronautas (LSAH, LSDA y OSDR son de acceso controlado).

---

## Límites

Este sistema **no diagnostica**. Ordena qué revisar primero, dice con qué datos lo hace y cuáles faltan, y en toda alerta recomienda consultar al cirujano de vuelo. Un VERDE significa «sin desviaciones en lo que se midió, con cobertura suficiente», no «sano»; un GRIS significa «no hay con qué opinar». Los colores no son probabilidades: salen de pesos de nivel mayoritariamente C, de cifras terrestres y de umbrales provisionales, y ninguno está validado en vuelo espacial. Las salidas de los modelos de eco y las banderas del ECG son resultados de investigación. Todo dato sintético aparece como **SIMULADO** y no interviene en ninguna decisión ni aprendizaje.

<!-- FIN DOCUMENTO CONSOLIDADO: prototipo-salud/docs-modelo/ALGORITMOS.md -->

## Documento consolidado: `prototipo-salud/docs-modelo/PADECIMIENTOS.md`

> Fuente original: `prototipo-salud/docs-modelo/PADECIMIENTOS.md`

# Padecimientos ligados a variables del equipo (pesos para estadística)

14 nov 2026. Solo investigación; **nada es diagnóstico**. Archivos: `PADECIMIENTOS.csv` (20 filas) y `PADECIMIENTO-VARIABLE.csv` (350 ligas, todas con peso 1–3; los pesos 0 no se listan).

## Método

- **Lista controlada:** los 11 padecimientos de Iker (P01–P11) y 9 que forman secciones enteras de los catálogos 01–02 (P12–P20). La trombosis yugular (P11) y el SANS (P12) se separaron porque el CSV de Iker los juntaba y el equipo los trata en bloques distintos (01 §4 y §5). Se fusionaron sinónimos: la cefalea espacial (03 §7) va en P07 y la hipovolemia ortostática en P02.
- **Base:** los 54 pesos no nulos de Iker, con los nombres genéricos pasados a IDs del equipo según `_inventario/mapeo-y-correcciones.md`. De ahí salen 56 filas:
  - se quitaron 2: CO2→hipoxia (corrección 2) y disnea→hipoxia, porque el catálogo no tiene una variable de disnea;
  - se añadieron 4 al repartir "síntomas" en variables concretas: P04 en 04:A17 y 04:A44; P09 en 03:V1 y 03:V24; P10 en 04:A36 y 04:A37; la fila de Iker para P11 se repartió en 01:V58 (P11) y 01:V86 (P12).
- **Ampliación (292 filas):** variables cuyo `que_senala` o sección apunta de forma clara al padecimiento. Si no hay fuente en las entradas, van con nivel C.
- **Duplicados:**
  - no se ligaron los punteros fusionados (01:V27, 02:V75, 04:A5);
  - en los duplicados sin fusionar se ligó solo una entrada: CO2 → 04:A23; FC → 01:V3; HRV → 03:V17; temperatura de cabina → 04:A27; calcio sérico → 02:V14;
  - por la misma razón se dejaron fuera otros pares equivalentes: 01:V19↔02:V51, 01:V24↔02:V90, 04:A9↔02:V67a, 04:A45↔02:V58 y 02:V32↔04:A22h.
- **Priors:** `prior_media` = peso. `prior_de`: A = 0.5, B = 1.0, C = 1.5.
- **Columnas copiadas:** `medido_en_vuelo` viene de `variables-para-pesos.csv`. `precision` viene de `PRECISION-VARIABLES.md` y solo se rellenó para las variables que cubre; 04:A1 (oral) queda vacía porque ese archivo solo evalúa piel y central.

### Las 5 correcciones obligatorias

| # | Corrección | Aplicada | Filas |
|---|---|---|---|
| 1 | FA: el peso alto va a la irregularidad, no a fc_reposo | Sí | P01–01:V31 (3, A, Perez 2019 + Taggar 2016). 01:V3 no está ligada a P01 |
| 2 | No usar Law 2014 para hipoxia | Sí | Se quitó CO2 de P03. Law 2014 solo aparece en P07 (04:A23, 03:V82) |
| 3 | DCS: variables de Conkin si existen | Sí (hueco) | Ninguna variable de Conkin (EVA, prerrespiración, presión del traje) está en la lista. Se ligaron 04:A36, 04:A37, 04:A38, 04:A39, más 04:A26 (presión total de cabina) y 04:A50. 04:A24 no se ligó a P10 porque no se encontró un aporte con fuente |
| 4 | Crucian y Barger de A a B | Sí | Crucian: P04–04:A17 y P04–04:A44. Barger: P05–03:V30 y P06–03:V30. Las demás filas con Crucian/Barger también son B: P01–01:V45 y P05–03:V87 |
| 5 | CO2→respiración puede ser B solo con URL real | Queda C | P07–04:A2. Se revisó OCHMO TB-004 (ya citada): el texto menciona disnea, pero no el aumento de la ventilación (que solo aparece en una figura). No hay otra fuente en las entradas |

## Resumen por padecimiento

| ID | Padecimiento | n variables | n A o B | Las 3 de mayor peso (peso y nivel) |
|---|---|---|---|---|
| P01 | Arritmia / fibrilación auricular | 15 | 3 | `01:V31` Ritmo cardíaco (fibrilación auricular  (3A); `01:V33` Extrasístoles ventriculares y taquicar (3C); `01:V45` Síntomas: palpitaciones, síncope, dolo (2B) |
| P02 | Desacondicionamiento e intolerancia ortostática | 18 | 4 | `01:V47` Caída de la presión arterial al poners (3A); `01:V48` Aumento de la frecuencia cardíaca al p (2B); `01:V50` Síntomas de presíncope: mareo, náusea, (2B) |
| P03 | Hipoxia / problema respiratorio | 8 | 3 | `04:A3` SpO2 (3A); `04:A2` Frecuencia respiratoria (3B); `04:A25` O2 inspirado (PIO2) (3C) |
| P04 | Infección, fiebre o desregulación inmune | 25 | 9 | `04:A1` Temperatura corporal (3B); `01:V3` Frecuencia cardíaca en reposo (2A); `04:A17` Erupción cutánea / hipersensibilidad ( (2B) |
| P05 | Pérdida de sueño y desalineación circadiana | 31 | 3 | `03:V30` Tiempo total de sueño (actigrafía) (3B); `03:V44` Alineación circadiana del episodio de  (3C); `03:V45` Melatonina salival (inicio en luz tenu (3C) |
| P06 | Fatiga y deterioro cognitivo | 31 | 3 | `03:V66` PVT-B: lapsos (3A); `03:V68` Batería Cognition (velocidad, precisió (3B); `03:V30` Tiempo total de sueño (actigrafía) (2B) |
| P07 | Exposición a CO2 / cefalea | 14 | 2 | `04:A23` ppCO2 de cabina (3A); `03:V82` Episodio de cefalea (sí/no, fecha, dur (3A); `04:A2` Frecuencia respiratoria (2C) |
| P08 | Radiación aguda por evento solar | 16 | 3 | `01:V98` Recuento absoluto de linfocitos y su c (3B); `01:V93` Dosis efectiva por evento de partícula (3C); `01:V100` Tiempo hasta el primer vómito tras la  (2B) |
| P09 | Estrés / salud conductual | 29 | 3 | `03:V1` PHQ-9 (3A); `03:V30` Tiempo total de sueño (actigrafía) (2B); `03:V24` Conflicto diádico (2B) |
| P10 | Enfermedad por descompresión tras EVA | 10 | 0 | `04:A36` Síntomas DCS tipo I (3C); `04:A37` Síntomas DCS tipo II (3C); `04:A38` Burbujas venosas (VGE) (2C) |
| P11 | Trombosis yugular | 16 | 3 | `01:V58` Síntomas de trombosis: hinchazón visib (3B); `01:V54` Grado de flujo de la yugular interna i (3B); `01:V55` Trombo visible (material ecogénico int (3B) |
| P12 | SANS / presión intracraneal | 25 | 1 | `01:V86` Síntomas visuales: visión cercana borr (3B); `01:V67` Cambio del grosor retiniano total peri (3C); `01:V68` Edema del disco óptico, grado de Frisé (3C) |
| P13 | Cálculos renales y deshidratación | 26 | 3 | `02:V37` Síntomas de cólico renal (dolor en fla (3B); `02:V17` Volumen de orina de 24 h (3C); `02:V18` Calcio urinario de 24 h (3C) |
| P14 | Pérdida de densidad ósea | 20 | 0 | `02:V01` DMO areal por DXA (cadera total, cuell (3C); `02:V02` T-score (DXA) (3C); `02:V05` DMO volumétrica y microarquitectura (Q (3C) |
| P15 | Atrofia muscular y pérdida de capacidad aeróbica | 19 | 0 | `02:V51` VO2pico / VO2máx (3C); `02:V40` Fuerza isocinética de rodilla (extensi (3C); `02:V46` Volumen o área de sección muscular por (3C) |
| P16 | Mareo espacial (SMS) | 5 | 0 | `02:V67a` Síntomas de mareo espacial (náusea, vó (3C); `02:V67b` Susceptibilidad previa al mareo (2C); `02:V68a` Uso y respuesta a medicación antimareo (2C) |
| P17 | Anemia espacial | 12 | 0 | `01:V108` Hemoglobina (3C); `01:V111` Masa eritrocitaria total (3C); `01:V109` Hematocrito (2C) |
| P18 | Dolor de espalda y elongación de columna | 9 | 0 | `02:V58` Dolor de espalda: presencia e intensid (3C); `02:V59` Localización, día de inicio y duración (2C); `02:V61` Estatura de pie (2C) |
| P19 | Nutrición inadecuada y pérdida de masa corporal | 12 | 0 | `01:V8` Masa corporal (3C); `02:V81` Ingesta energética (3C); `02:V76` 25-OH vitamina D sérica (2C) |
| P20 | Metabolismo de la glucosa / resistencia a la insulina | 9 | 0 | `02:V86` Glucosa plasmática en ayunas (3C); `02:V87` Glucosa a las 2 h de sobrecarga oral ( (3C); `02:V89` HbA1c (3C) |
Totales: 350 ligas; A = 9, B = 31, C = 310.

## Huecos

- **DCS (P10):** faltan en la lista las variables del modelo de Conkin (tiempo de EVA, prerrespiración, presión del traje, deambulación). Sin ellas el prior de riesgo de Conkin no se puede calcular. No hay LR por síntoma.
- **Sin LR ni sens/esp en vuelo** para ningún padecimiento. Las cifras de la columna `lr_o_or` son terrestres, salvo Law 2014 (ISS). Tampoco hay LR con fuente para sueño, fatiga, síntomas de SANS, mareo espacial, DCS ni radiación aguda.
- **Disnea:** el catálogo no tiene una variable de disnea, así que el síntoma de hipoxia de Iker no se pudo ligar.
- **P12–P20:** casi todo es nivel C. Los criterios clínicos conocidos (T-score, ADA, Frisén…) no tienen fuente en las entradas de esta tarea. Las fuentes de cada fila de los catálogos 01–02 no se transfirieron una por una; es el siguiente paso para subir C → B.
- **Prevalencia vacía** en P01, P03, P06, P08, P09 y P14–P20: no hay cifra en las entradas.
- **Precisión:** solo está evaluada para las 10 variables genéricas de `PRECISION-VARIABLES.md`. El resto queda vacío.
- **Atribuciones de Iker sin verificar en esta tarea:** Basner 2014 para conflicto (03:V24) y Crucian 2016 para palpitaciones (01:V45). Se conservan como B.
- **Posible redundancia:** 03:V82, 03:V83 y 04:A6 (cefalea) y 01:V3/04:A4 (FC) miden cosas parecidas. Conviene modelarlas como correlacionadas, no como evidencia independiente.
- **Duplicados pendientes de decisión del equipo:** calcio (01:V41/02:V14) y HRV (01:V43/03:V17). Aquí se eligió una; si el equipo decide otra canónica, hay que cambiar el ID.

<!-- FIN DOCUMENTO CONSOLIDADO: prototipo-salud/docs-modelo/PADECIMIENTOS.md -->

## Documento consolidado: `prototipo-salud/ENTORNO.md`

> Fuente original: `prototipo-salud/ENTORNO.md`

# Entorno de ejecución (detectado 2026-11-14 ~09:41 CDMX)

- SO: Debian GNU/Linux 13 (trixie), kernel 6.12.113+, x86_64
- CPU: 8 núcleos (Intel(R) Xeon(R) Processor)
- RAM: 15 GB, sin swap
- Disco libre: 110G en /
- **GPU: NINGUNA.** `nvidia-smi` no existe, no hay /usr/local/cuda. **Todo corre en CPU-only (sin GPU, sin CUDA, sin VRAM).**
- Python del sistema: Python 3.13.5; gestor de entornos: uv 0.13.7 (/usr/local/bin/uv), un venv por repo en envs/.
- Herramientas: git 2.47.3, ffmpeg 7.1.5-0+deb13u1; git-lfs NO instalado.
- Consecuencia: se usan wheels de PyTorch CPU (índice https://download.pytorch.org/whl/cpu), lotes de 1, clips cortos y pocos frames. Los tiempos reportados son de CPU.

## Cambio de plan (Iker, 14-nov 09:41 CDMX): las pruebas reales se hacen en su PC
- **En esta máquina Linux NO se descargaron pesos ni se corrió inferencia real.** Solo pruebas de carga con datos dummy
  (arquitectura sin pesos + tensor aleatorio), marcadas "NO se ha corrido inferencia real", en venvs de prueba fuera de la
  entrega (`/tmp/nasa-linux-envs/`, torch 2.5.1 CPU).
- **Destino de ejecución (PC de Iker):** Windows + PowerShell, Python 3.13.5 (`python`), GPU NVIDIA RTX 4050 Laptop 6 GB VRAM,
  driver 621.14 (CUDA 12.x).
- Decisión de entornos para la PC: ver README.md y CONTRATO.md (venvs de modelos con Python 3.11 vía uv y torch 2.5.1 cu124;
  venv de la app con el Python 3.13 del sistema).

<!-- FIN DOCUMENTO CONSOLIDADO: prototipo-salud/ENTORNO.md -->

## Documento consolidado: `prototipo-salud/fusion/NOTA-ENTRENAMIENTO.md`

> Fuente original: `prototipo-salud/fusion/NOTA-ENTRENAMIENTO.md`

# Nota: que haria falta para entrenar una red de fusion (no se entrena ahora)

Estado: `fusion/red_fusion_stub.py` solo declara que no hay predictor. No se entrena nada en este prototipo.

Datos y desenlaces necesarios:
- **Datos emparejados del mismo individuo**: ecografia (estudios con metadatos y calibracion) + wearables
  (FC, HRV con metrica, SpO2, temperatura cutanea, sueno, actividad) **sincronizados en el tiempo**
  (ventanas definidas de antemano, relojes con zona horaria conocida).
- **Desenlaces adjudicados por clinicos** (p. ej. FEVE de referencia medida por ecocardiografista, eventos
  clinicos definidos con criterios escritos), no etiquetas automaticas ni salidas de otros modelos.
- **Tamano**: suficiente para el numero de predictores y la prevalencia del desenlace (calcular el tamano de
  muestra antes de recolectar; con pocos eventos solo cabe un modelo simple y regularizado).
- **Consentimiento y acuerdos de uso (DUA)**: consentimiento informado, aprobacion etica, desidentificacion,
  y los DUA/licencias de cada fuente (varios datasets de eco requieren registro y aceptacion de terminos).
- **Validacion externa**: otro centro/otro dispositivo/otra poblacion; separar por persona (nunca por fila).
- **Analogos en tierra vs vuelo**: los datos en tierra (pacientes, voluntarios, aislamiento/analogos) no
  representan microgravedad, radiacion ni cambios de fluidos; hacen falta datos de vuelo o analogos
  validados antes de afirmar nada para astronautas.

Por que no se entrena ahora: no existen datos emparejados con desenlaces adjudicados; el encargo prohibe
entrenar/ajustar modelos en esta etapa; y devolver probabilidades sin ellos seria inventar un resultado.
Los datos sinteticos del prototipo no sirven para entrenar (simulated=true, sin relacion fisiologica real).

<!-- FIN DOCUMENTO CONSOLIDADO: prototipo-salud/fusion/NOTA-ENTRENAMIENTO.md -->

## Documento consolidado: `prototipo-salud/MODELOS.md`

> Fuente original: `prototipo-salud/MODELOS.md`

# Quién hizo qué: prototipo (14 nov 2026, hora CDMX)

CLI: Claude Code 2.1.318 en la box. Sesión del coordinador: `f26aa405-cb72-458a-8d5e-35a536b6b636`. cwd: prototipo/.
Comando: `claude --model claude-opus-5-5 --effort xhigh -p … --agents agents.json --output-format stream-json --verbose --permission-mode bypassPermissions --strict-mcp-config --disallowedTools "mcp__*"`

| Paso | Hora (CDMX) | Modelo | Qué hizo | Verificación |
|---|---|---|---|---|
| Corrida 1 (run1.jsonl) | 9:40–9:43 | Coordinador **claude-opus-5-5**, effort xhigh | Detectó el entorno (ENTORNO.md), clonó los 5 repos en vendor/ (REVISIONES.md), revisó README/licencias/muestras | `modelUsage`: claude-opus-5-5; 30 mensajes Opus |
| Interrupción | 9:43 | Agente ejecutor (Grok Bot) | Detuvo la corrida 1 por el cambio de plan de Iker (9:41): pruebas en su PC, sin inferencia ni pesos en la box | — |
| Corrida 2 (run2.jsonl, `--resume`) | 9:44–10:09 | Coordinador **claude-opus-5-5** xhigh | Escribió core/ (formato, modalidad, runs), integró, revisó, verificó pesos públicos por cabeceras HTTP/API HF, escribió README, MODELOS-TABLA, AVANCE | 134 mensajes Opus; `modelUsage.canonicalModel` = claude-opus-5-5 |
| Subagentes "implementador" (Task) | misma ventana | **claude-sonnet-5-5** | Adaptadores de los 5 modelos, entornos/requirements, sensores, fusión/reglas/stub, runner + app Streamlit, 11 scripts .ps1, tests y pruebas de carga con pesos aleatorios | 286 mensajes de subagente con `message.model = claude-sonnet-5-5`; `modelUsage.canonicalModel` = claude-sonnet-5-5 |
| QA final | 10:10–10:12 | Agente ejecutor (Grok Bot) | Corrió `verificar.py` (sin fallas; 2 PENDIENTE) y `pytest` (25 passed), revisó que no haya rutas /home/box en entregables y que no se descargaran pesos. **No editó código.** Escribió este archivo. | — |

Costo reportado por la CLI (corrida 2): USD 12.76 (Opus 6.89, Sonnet 5.87).
Nota: los venvs de prueba en Linux (CPU, torch 2.5.1 CPU) están en /tmp/nasa-linux-envs, fuera de la entrega. Los archivos de pesos "falsos" (aleatorios) de las pruebas de carga están en /tmp/nasa-test-runs, fuera de la entrega.

## Arreglo CUDA (bug reportado por Iker vía Jarvis, 10:40 CDMX)
| Paso | Hora (CDMX) | Modelo | Qué hizo | Verificación |
|---|---|---|---|---|
| Corrida 3 (run3.jsonl, `--resume` misma sesión, `--model claude-sonnet-5-5 --effort high`) | 10:42–10:48 | **claude-sonnet-5-5** high, sin Opus ni subagentes | Diagnosticó la causa (timm/open-clip piden torch sin versión y uv lo re-resolvía desde PyPI → 2.15.0+cpu); creó scripts/torch-cu124-overrides.txt, Repair-TorchCuda/Test-TorchOk en _comun.ps1, cambió instalar_modelo.ps1 (lock con --no-deps --override, reinstalación cu124 y verificación de CUDA con exit 1), nuevo reparar_torch.ps1, sección del README y AVANCE.md | 17 mensajes con `message.model = claude-sonnet-5-5`. El `modelUsage` del resultado es acumulado de la sesión (incluye el Opus de la corrida 2); en esta corrida no hubo mensajes de Opus |
| Zip y QA | 10:48–10:50 | Agente ejecutor (Grok Bot) | Creó ../prototipo-fix-cuda.zip (solo scripts/ y adapters/*/requirements*) con Python zipfile. No editó código. | — |

## Arreglo carga de pesos EchoNet-Dynamic (Iker vía Jarvis, 11:06 CDMX)
| Paso | Hora (CDMX) | Modelo | Qué hizo | Verificación |
|---|---|---|---|---|
| Corrida 4 (run4.jsonl, `--resume` misma sesión, `--model claude-sonnet-5-5 --effort high`) | 11:07–11:13 | **claude-sonnet-5-5** high, sin Opus ni subagentes | `adapters/echonet_dynamic/infer.py`: carga con weights_only=True + safe_globals de numpy (numpy.core/_core), respaldo weights_only=False solo para archivos oficiales con tamaño exacto, camino registrado en `checkpoint.carga`; pruebas con checkpoints aleatorios en /tmp que reproducen el error; AVANCE.md (PanEcho en CUDA en la PC de Iker, 17,4 s, run 20261114T105021_panecho_c753f120; app en :8501) | 18 mensajes con `message.model = claude-sonnet-5-5` |
| Zip | 11:14 | Agente ejecutor (Grok Bot) | Creó ../prototipo-fix-echonet.zip (infer.py + AVANCE.md). No editó código. | — |

## Módulo ECG (Iker vía Jarvis, 15:46 CDMX)
| Paso | Hora (CDMX) | Modelo | Qué hizo | Verificación |
|---|---|---|---|---|
| Corrida 5 (run5.jsonl, sesión NUEVA `58b8b78a-5de6-407e-a611-3dc200a1a7ed`, `--model claude-fable-5-2 --effort high`) | 15:53–16:46 | Coordinador **claude-fable-5-2** high | Diseño, revisión, core/run_model y modalidad, validación (validar_ecg.py), docs, ECG-ARCHIVOS.txt | 113 mensajes con `message.model = claude-fable-5-2`; `modelUsage.canonicalModel` = claude-fable-5-2 (USD 13.95). La CLI avisó `unrecognized_model` en stderr pero el modelo efectivo fue fable-5-2 |
| Subagentes "implementador" (Task) | misma ventana | **claude-sonnet-5-5** | adapters/ecg (NeuroKit2 + wfdb), muestras recortadas, vista ECG en app.py, scripts .ps1, tests, captura con Playwright | 258 mensajes de subagente con `message.model = claude-sonnet-5-5` (USD 5.18) |
| Uso interno de la CLI | — | claude-haiku-5-5 | No fue un subagente; aparece en `modelUsage` (USD 0.04) | `result.modelUsage` |
| Empaquetado y QA | 16:46–16:50 | Agente ejecutor (Grok Bot) | Revisó la captura, comprobó que existen los 117 archivos de ECG-ARCHIVOS.txt, cotejó la tabla con validacion_por_registro.csv, creó ../prototipo-ecg.zip. No editó código. | — |

Costo total de la corrida 5 según la CLI: USD 19.17.

<!-- FIN DOCUMENTO CONSOLIDADO: prototipo-salud/MODELOS.md -->

## Tabla completa de modelos

> Contenido consolidado de la fuente histórica `prototipo-salud/MODELOS-TABLA.md`.

# Tabla de modelos (estado al 2026-11-14; fila ECG añadida ~16:45 CDMX)

**En la máquina donde se construyó esto (Linux, 8 CPU, SIN GPU) NO se corrió inferencia real y NO se descargaron pesos.**
(Esto vale para los 5 modelos de eco. El módulo ECG de la última fila no tiene pesos y sí se ejecutó aquí, en CPU.)
Solo se hicieron pruebas de carga: la arquitectura se construyó sin pesos y se le pasó un tensor aleatorio, en CPU, con
torch 2.5.1. Esas pruebas muestran que el código importa y que las formas cuadran. **No son resultados.** Todo queda
"pendiente de probar en PC" (Windows, RTX 4050 Laptop 6 GB).

Los tamaños vienen de cabeceras HTTP (`curl -sIL`, sin descargar) consultadas el 2026-11-14. La VRAM es una
**estimación**: parámetros medidos en la prueba de carga × 4 B, más activaciones estimadas. No se midió en GPU; cada
adaptador reporta `raw_output.vram_pico_mb` al correr en la PC. Detalle completo en `adapters/<modelo>/manifest.json`.

| Modelo | Pesos y acceso | Entrada admitida | Salidas reales que expone el repo (y cómo se etiquetan) | Requisitos | Licencia / restricciones | VRAM estimada vs 6 GB | Estado |
|---|---|---|---|---|---|---|---|
| **PanEcho** (CarDS-Yale, commit 836c46e) | `panecho.pt` de GitHub Releases v1.0, **505.054.604 B**. Público, sin login. | **Video 2D** modo B, cualquier vista (view-agnostic). Un archivo o una carpeta del mismo estudio. Rechaza imagen 2D, volumen 3D y Doppler. | 40 tareas (`content/tasks.md`; el README dice 39). Clasificación → `probabilidad_clase` (softmax/sigmoide del modelo, no calibrada). Regresión (EF %, dimensiones en cm, volúmenes, gradientes, velocidades…) → `medicion`, como estimación del modelo y no calculada desde píxeles. Agregación por estudio etiquetada. | Python 3.11, torch 2.5.1 cu124, timm 0.9.10, opencv. Preprocesamiento de `src/dataset.py`: 16 frames, 4 clips, CenterCrop 224, ImageNet. Redimensiona si el video no es 224 (desviación marcada). | Pesos CC BY-NC-SA 4.0 (no comercial); código AGPLv3. | ~2 GB (42,1 M parámetros medidos). **Probable** | Pendiente de probar en PC |
| **EchoNet-Dynamic** (echonet/dynamic, commit e01d029) | `r2plus1d_18_32_2_pretrained.pt` **250.572.083 B** + `deeplabv3_resnet50_random.pt` **317.401.511 B** (GitHub Releases douyang/EchoNetDynamic v1.0.0, URL del `InitializationNotebook.ipynb`). Públicos. El **dataset** exige registro + RUA y **no** se usa. | **Video 2D A4C** (la vista se declara; si no es A4C se rechaza). Convierte a 112×112 según `ConvertDICOMToAVI.ipynb`. Rechaza el resto. | FEVE en % (`medicion`, media de todos los clips de 32 frames con periodo 2). Área del VI por frame en **px²** (`hallazgo`; nunca ml ni mm). Frames candidatos de sístole. Máscaras `.npz` y overlay. El análisis latido a latido (R) **no** se implementa. | Python 3.11, torch 2.5.1 cu124, scipy, opencv. Normalización mean/std calculada sobre el propio video (desviación marcada: el repo usa la del dataset de entrenamiento). | **Dos licencias contradictorias**: LICENSE (MIT) y LICENSE.txt (prohíbe redistribuir y usar sin permiso escrito). Uso solo local, no comercial. Pesos sin licencia explícita. | ~3 GB (70,9 M parámetros medidos). **Probable**; si hay OOM, `block_size=8` | Pendiente de probar en PC (aviso de licencia) |
| **MedSAM2** (bowang-lab, commit 332f30d) | `MedSAM2_US_Heart.pt` (afinado en eco cardiaca), HF `wanglab/MedSAM2`, **156.041.079 B**, sha256 `295c0ff8…d933`. Público (API HF: `gated=false`). | **Video 2D** o **imagen 2D** + **indicación inicial obligatoria** del usuario (caja `[x0,y0,x1,y1]` + frame, o máscara). Sin indicación se rechaza: no hay segmentación automática. Rechaza volumen 3D y Doppler. | Máscaras por frame (`.npz`), overlay y área por frame en **px²** (`hallazgo`). Es segmentación visual genérica, no diagnóstico. Sin probabilidades. | Python 3.11, torch 2.5.1 cu124, hydra-core, iopath. **No** compila la extensión CUDA en Windows (usa `vendor/MedSAM2` vía `sys.path`). Config `sam2.1_hiera_t512`. | Código Apache-2.0; **pesos CC BY-SA 4.0** (tarjeta HF). | ~1,5 GB (39,0 M parámetros medidos). **Probable** | Pendiente de probar en PC |
| **EchoPrime** (echonet/EchoPrime, commit 6d9c1ee) | `model_data.zip` **1.338.009.590 B** + `candidate_embeddings_p1.pt` y `_p2.pt` **1.260.213.315 B c/u** (GitHub Releases v1.0.0). Públicos, sin login. | **Estudio multivista**: carpeta de DICOM multiframe (procedimiento oficial con máscara del sector) y/o mp4/avi. El Doppler color solo entra como vista dentro del estudio, sin cuantificar. Las imágenes fijas y el Doppler espectral se omiten (igual que el repo); el volumen 3D se rechaza. | Vista por video (`probabilidad_clase`, softmax añadido; el repo usa argmax). 21 métricas **por recuperación** (k=50): EF %, PAP mmHg y binarias como `fraccion_vecinos_0_1` (no probabilidad). Informe **recuperado** de otros estudios (`hallazgo`, texto no redactado para este estudio). Embeddings `.npy`. | Python 3.11, torch 2.5.1 cu124, transformers 4.57.1, pydicom 2.3.1, opencv 4.5.5.64. Lote de 4 videos (el repo usa 50, que no cabe). **RAM de CPU alta** (>6 GB estimados con informe). | Academic Software License de Cedars-Sinai: solo uso académico o sin fines de lucro, sin transferir a terceros. | ~1,6–2 GB en GPU (122,2 M parámetros medidos). Los embeddings de candidatos (2,4 GB) quedan en RAM. **Probable** | Pendiente de probar en PC |
| **EchoCLIP / EchoCLIP-R** (echonet/echo_CLIP, commit 23cd327) | HF `mkaichristensen/echo-clip` y `echo-clip-r`: `open_clip_pytorch_model.bin` **606.262.375 B c/u** + config. **No gated** (API HF: `gated=false`; el comentario del repo sobre `huggingface-cli login` no aplica). | **Video 2D** o **imagen 2D** (frames). Rechaza volumen 3D y Doppler. | Similitud video↔texto (`similitud`, coseno). FEVE **zero-shot** (`medicion` %, quality `zero_shot_por_similitud`, derivada de similitudes). Puntuaciones zero-shot binarias, p. ej. marcapasos (`similitud`, **nunca** probabilidad). Embeddings. | Python 3.11, torch 2.5.1 cu124 (el repo pedía 2.0.1), open_clip_torch 2.20.0, huggingface_hub 0.16.4, numpy 1.24.4. | Repo: Academic Software License de Cedars-Sinai. Tarjeta HF: MIT. Se aplica la condición más restrictiva. | ~1,5 GB (151,5 M parámetros medidos; los dos modelos se cargan por separado). **Probable** | Pendiente de probar en PC |
| **ECG** (`ecg`; NeuroKit2 0.3.0 + wfdb 4.3.1; no es un modelo entrenado) | **Sin pesos**: nada que descargar (`descargar_pesos.ps1 -Modelo ecg` responde "no requiere"). | **ECG 1D** (`ecg_1d`): registro WFDB (`.hea` + `.dat`, opcional `.atr`/`.qrs`) o CSV/TXT/TSV con la frecuencia de muestreo (`-Fs`). Un canal por ejecución. Rechaza video, imagen, DICOM y volumen; los modelos de eco rechazan `ecg_1d`. | FC (bpm), HRV RMSSD y SDNN (ms), PR y QTc Bazett (ms, medianas de la delineación DWT) → `medicion`, fuente `algoritmo_senal`. Latidos irregulares por criterio RR → `hallazgo`. Bandera de ritmo irregular compatible con FA → `regla_alerta`, **BANDERA EXPERIMENTAL – NO DIAGNÓSTICO** (estadísticos y umbrales de Dash et al. 2009). Con `.atr`: comparación contra las anotaciones. Traza `ecg_traza.npz`. | Python 3.11, **sin torch, CPU**. numpy 2.2.6, scipy 1.15.3, pandas 2.3.3, scikit-learn 1.7.2, PyWavelets 1.9.0 (lock de Windows compilado con uv). | NeuroKit2: MIT; wfdb: MIT (leído de los metadatos y del `LICENSE` de los paquetes instalados). Muestras: PhysioNet, ODC-By 1.0, con cita obligatoria (`samples/FUENTES.md`). | No usa GPU (0 GB). | **Ejecutado de verdad en Linux/CPU** sobre mitdb 100/201/203 y afdb 04015 (`validacion/ecg/VALIDACION.md`): picos R con sensibilidad 0,999/1,000/0,919 y PPV 1,000/0,972/0,989 en 100/201/203; la bandera tiene especificidad por segmento 1,000/0,054/0,000/0,904 en 100/201/203/04015 (marca irregularidad, no FA). PR/QTc sin validar. **Pendiente de probar en PC** (Windows). |

**Ningún modelo quedó "bloqueado":** los 5 de eco tienen pesos públicos, sin login ni aceptación de términos, comprobado por
cabeceras HTTP y por la API de HF. Los scripts nunca piden ni usan tokens. Las restricciones vienen de las licencias
(académica o no comercial; EchoNet-Dynamic con licencias contradictorias). No se usa ningún dataset con registro
(EchoNet-Dynamic, CAMUS, MIMIC-IV-ECHO, etc.).

Total de pesos si se bajan los 5: **≈6,30 GB**. Además, cada venv descarga torch cu124 (wheel de 2.510.750.521 B para
Windows/cp311, que uv guarda en caché una sola vez).

<!-- FIN DOCUMENTO CONSOLIDADO: prototipo-salud/MODELOS-TABLA.md -->

## Documento consolidado: `prototipo-salud/motor/DISENO.md`

> Fuente original: `prototipo-salud/motor/DISENO.md`

# Motor de padecimientos: diseño e interfaces

Implementa `ALGORITMOS.md` (especificación normativa del equipo, 14 nov 2026). Este archivo fija las
interfaces entre módulos y las decisiones de implementación donde la especificación deja margen.
**Nada es un diagnóstico.** Todo número marcado [P] en la especificación es **provisional** y debe quedar
rotulado `provisional` en código, JSON, CSV y UI. Solo `numpy`, `pandas` y la biblioteca estándar (no hay scipy).

## 1. Módulos

| Archivo | Contenido |
|---|---|
| `motor/parametros.py` | Constantes provisionales (cada una con `valor`, `provisional`, `supuesto` S1–S20, `descripcion`); umbrales editables; lectura y escritura de `datos/modelo/overrides.json` |
| `motor/tablas.py` | Carga `datos/modelo/PADECIMIENTOS.csv` y `PADECIMIENTO-VARIABLE.csv` (copias de las tablas con fuente, nunca se escriben), aplica overrides, clasifica `direccion` (S10), criterios publicados (d.1), las 6 ligas con LR/OR (d.2), priors (d.5), grupos de correlación (d.3), capas fijas (d.6) |
| `motor/calidad.py` | Puerta de calidad G0–G7, mapeo métrica → `variable_id` (a.2, a.4), clase de dispositivo, nivel N0–N4, vigencia |
| `motor/entradas.py` | Lee `outputs/raw/*/` (runs guardados), sensores (`sensores/importador.py`) y el CSV nativo del motor (dataset SIMULADO); devuelve observaciones (§3) |
| `motor/simulador.py` | Genera la tripulación **SIMULADA** en `datos/simulado/` |
| `motor/normalizacion.py` | Agregación diaria, z poblacional (c.2), base personal y z (c.3), delta de tripulación (c.4), estado de variable (c.5) |
| `motor/calibracion.py` | Base prevuelo inmutable, EWMA protegido, CUSUM, cuarentena, persistencia JSON (e) |
| `motor/score.py` | Activación (d.1), canal de pesos T_p con incertidumbre (d.3, d.4), canal bayesiano (d.2, d.5), cobertura (g.3) |
| `motor/semaforo.py` | Reglas A1–A5, R-1..R-3, VERDE/GRIS, histéresis, orden y texto (f) |
| `motor/evaluacion.py` | Orquesta el orden de cálculo de §0 de la especificación y devuelve el resultado (§5) |

Rutas: siempre relativas a la raíz del prototipo (`Path(__file__).resolve().parents[1]`). Ningún archivo
entregable contiene rutas absolutas del equipo de desarrollo.

## 2. Vocabulario compartido

- **Canal**: `"real"` o `"simulado"`. Una fila con `simulated=true` solo existe en el canal simulado. Los dos
  canales **nunca** comparten bases, CUSUM, estadísticos de tripulación ni semáforo. El canal simulado tiene su
  propio almacén de calibración (un «cajón de arena» rotulado SIMULADO) para poder ejercitar el flujo de (h.2);
  el almacén real rechaza y registra cualquier punto simulado (invariante e.1.4).
- **Nivel de calidad** (`nivel`): `"N0"`, `"N1"`, `"N2"`, `"N3a"` (baja por evidencia: baja un escalón),
  `"N3b"` (precisión no evaluada: nivel de la tabla), `"N4"`.
- **Fase**: `"PRE"`, `"VT"`, `"VTa"`, `"POST"`. Sin lanzamiento declarado todo es `PRE` («sin misión declarada»).
- **Colores**: `"VERDE"`, `"AMARILLO"`, `"ROJO"`, `"GRIS"`.
- **Clase de dispositivo** (`clase_dispositivo`), vocabulario cerrado definido en `calidad.py`:
  `ecg_adaptador`, `ecg_prenda_holter`, `lectura_humana_ecg`, `palpacion_pulso`, `reloj_ppg`, `oximetro_dedo`,
  `spo2_muneca`, `bandas_toracicas`, `conteo_manual`, `termometro_oral`, `temp_piel`, `temp_central_estimada`,
  `manguito_validado`, `manguito_sin_validar`, `cuffless`, `actigrafia`, `sueno_etapas_consumo`, `pvt_laptop`,
  `pvt_reloj`, `prueba_cognitiva`, `analizador_cabina`, `cuestionario_phq9`, `autorreporte`, `diario`,
  `prueba_ortostatica`, `laboratorio`, `modelo_eco`, `captura_manual`, `desconocido`.
- **Método** (`metodo`, decide κ del canal bayesiano): `lectura_humana`, `cuestionario_completo`,
  `prueba_ortostatica`, `termometro`, `sensor_cabina` o vacío.

## 3. Observaciones (salida de la puerta; entrada del resto del motor)

`pandas.DataFrame` con exactamente estas columnas (`calidad.OBS_COLUMNAS`):

| Columna | Tipo | Significado |
|---|---|---|
| `subject_id` | str | Persona. Nunca se mezclan personas |
| `timestamp` | `pd.Timestamp` sin zona | Instante de la observación |
| `variable_id` | str o None | ID canónico del equipo (`01:V3`…). None = «sin variable de equipo» (se guarda, no puntúa) |
| `valor` | float | En la unidad canónica. NaN si `sin_dato`. Presencia: 1.0 presente, 0.0 ausente |
| `unidad` | str | |
| `clase_dispositivo` | str | §2 |
| `nivel` | str | §2 |
| `nivel_motivo` | str | Por qué ese nivel (texto corto) |
| `simulated` | bool | |
| `contexto` | str o None | `reposo`, `sueno`, `actividad`, `ejercicio`, `eva` |
| `metodo` | str o None | §2 |
| `decide` | bool | False = fila solo informativa (SDNN, diastólica, fracción de ventanas): se muestra, no puntúa |
| `calidad_buena` | bool | Calidad declarada buena por el adaptador o por quien captura (condición de aprendizaje para N3) |
| `vigencia_h` | float | Vigencia provisional [P·S18] en horas; NaN = sin vencimiento (laboratorio: hasta la siguiente muestra) |
| `z_pob_permitido` | bool | False si la medición no es comparable con la norma poblacional (p. ej. HRV con ventana ≠ 5 min) |
| `sin_dato` | str o None | Motivo del faltante (`sin_dato: …`). Un faltante **nunca** es 0 |
| `origen` | str | `outputs_raw`, `sensores`, `nativo` |
| `metric` | str | Métrica original |
| `quality` | str | `quality` original |
| `run_id` | str o None | |
| `etiquetas` | str | Separadas por `; ` (p. ej. `[experimental]; tasa extrapolada [P·S12]`) |
| `notas` | str | |

Las filas N0 se devuelven aparte (rechazadas, con motivo); no entran a `obs`.

### 3.1 CSV nativo del motor (dataset SIMULADO y captura manual)

Columnas: `subject_id,timestamp,variable_id,value,unit,device_class,quality,context,method,simulated,notes`.
`value` vacío ⇔ `quality` empieza por `sin_dato`. `device_class` del vocabulario de §2.

### 3.2 Misión y perfiles

`mision = {subject_id: {"lanzamiento": "YYYY-MM-DD" | None, "aterrizaje": "YYYY-MM-DD" | None}}`;
`perfiles = {subject_id: {"edad": int | None, "sexo": "M" | "F" | None}}`. Si faltan: fase PRE y rama
poblacional de FC/QTc inactiva (no se inventa edad ni sexo).

## 4. Decisiones de implementación (todas provisionales salvo que citen la especificación)

D1. **Agregación diaria** (c.1, G7): una observación por (persona, variable, día). Gana el mejor nivel
(N1 > N2 > N3a = N3b > N4); a igualdad, la clase con el `run_id`/timestamp más reciente. Valor = mediana de las
filas de esa clase y nivel ese día (variables de presencia: máximo). Solo filas con `decide=True` y sin `sin_dato`.
Si todas las filas del día son `sin_dato`, se conserva el motivo (ausencia F2).

D2. **Evaluaciones**: una por día natural, de la primera a la última fecha con datos de la persona; el estado
(media adaptativa, CUSUM, cuarentena, historial de color) avanza en orden cronológico. El motor es un
**recálculo determinista** sobre todas las observaciones; al final guarda el estado en JSON. Si el archivo ya
contiene una base **congelada**, esa base se usa tal cual y cualquier intento de reescribirla se rechaza y se
registra (invariante e.1.1). Los actos humanos (acuse de ROJO, cierre de revisión de CUSUM, versión nueva de
una base) se guardan en el mismo JSON con fecha y autor y se aplican en su fecha.

D3. **Vigencia en evaluaciones diarias**: un valor del día d es vigente el día D si `(D − d) < ceil(vigencia_h/24)`.

D4. **Base prevuelo** por (persona, variable, clase): puntos PRE admitidos (N1; N2 de su clase; N3 con
`calidad_buena`), en contexto estándar; se excluyen atípicos con z robusto (mediana/MAD) ≥ 2.58 [P·S5].
Se congela el primer día con fase ≠ PRE. Sin lanzamiento declarado la base es «provisional, no congelada».
- `s_w`: DE propia si n0 ≥ 5; si no, DE intra-persona combinada de la tripulación (misma variable y clase);
  para FC de reloj, 3 lpm (Quer 2020) si no hay otra; si no hay ninguna, rama personal inactiva.
- `s_b`: `s_pob` de c.2 si existe; si no, DE de las medias prevuelo de la tripulación (≥ 3 personas); si no hay,
  B = 0 (sin encogimiento) y se etiqueta.
- `m_ref`: media poblacional de c.2 o media prevuelo de la tripulación.
- `B`, `μ_i`, `s_i²` como en c.3. Piso: 3 rpm para `04:A2` (único con cifra). Si n0 < 5 y no hay referencia
  poblacional, la liga queda **NA** con motivo «sin base (n0 < 5) ni referencia poblacional» (no suma 0).
- Variables con transformación: `03:V17` se trabaja en ln(RMSSD) [P·S14].

D5. **δ_vφ = 0** para todas las variables en este prototipo (valor previo; la estimación con la tripulación de
e.4 no está implementada). Es la opción conservadora: una desviación sigue siendo desviación. Límite conocido.

D6. **Var(z)**: `1/n0 + z²/(2·(n0−1))` con n0 ≥ 2; con rama solo poblacional, 0 (se etiqueta).

D7. **Bandas ordinales** (SpO2, FR, PA): no se calcula z poblacional. Si el criterio publicado se cumple,
a = 1; si no, rampa con z personal; si no hay base personal, a = 0 con «criterio no cumplido; sin base personal
para la rampa» (dato vigente: cuenta para cobertura si es N1–N3).

D8. **Estado de variable para el aprendizaje**: «alertada» si alguna de sus ligas tiene u ≥ u1.

D9. **Episodio** (e.2): el día en que la persona tiene bandera de ritmo = 1, fiebre (> 37.3 °C [P·S9]),
contexto `eva`/`ejercicio`, un síntoma de presencia = 1 o un fármaco (`01:V42`, `03:V87`) presente, no se
aprende ninguna variable de esa persona.

D10. **Cuarentena**: un punto que cumple e.2 entra a una cola; se aplica al EWMA cuando han pasado 72 h sin
alerta posterior (variable alertada o padecimiento ligado en AMARILLO/ROJO); si la hay, se descarta y se
registra «excluido hacia atrás».

D11. **Persistencia R-1** con evaluaciones diarias: `T_inf ≥ 2` en la evaluación del día D y en la del día D−1.

D12. **Histéresis**: AMARILLO baja tras 2 evaluaciones seguidas sin condición; ROJO exige además acuse humano
(sin interfaz en este prototipo: queda ROJO «pendiente de acuse»).

D13. **Cobertura**: «medible en la fase»: en VT/VTa solo `sí en vuelo`; en PRE/POST además `solo pre-post
vuelo`. `solo análogo`, `no`, `no encontrado` nunca entran al denominador (F4, F5). Núcleo = ligas de peso 3
(peso efectivo). Sin núcleo medible en la fase → GRIS «estructural: el núcleo solo existe pre/post».

D14. **σ efectiva**: `prior_de` de la liga si el nivel no degrada; si degrada, `max(prior_de, σ del nivel
degradado)` con A = 0.5, B = 1.0, C = 1.5 [PAD]. N2 y N3a bajan un escalón; N4 fuerza C.

D15. **Capas fijas** (d.6): no cambian T_p ni ΔL_p. Solo PHQ-9 se calcula (necesita `03:V1` con
`metodo=cuestionario_completo`); las demás se informan «incompleto: falta X» o «inactivo» según la tabla d.6.

D16. **Sexo desconocido en QTc**: se evalúa ≥ 460 ms y ≤ 390 ms; entre 450 y 460 ms queda «indeterminado: falta sexo».

D17. **No se muestra ninguna probabilidad.** ℓ_p es interno y solo ordena.

D18. **Tripulación** (c.4): n = personas del mismo canal y fase con dato de esa variable ese día. Sin scipy:
la conversión t → z equivalente se hace con la CDF de la t por integración numérica y `statistics.NormalDist`.

## 5. Resultado de `evaluacion.evaluar(...)`

```python
evaluar(obs, *, tablas, params=None, mision=None, perfiles=None, canal="real",
        ruta_estado=None, guardar=True) -> dict
```

Devuelve un `dict` serializable a JSON:

```python
{
  "canal": "real" | "simulado", "simulated": bool, "etiqueta": "SIMULADO" | None,
  "provisional": True,
  "aviso": "No es un diagnóstico. Se recomienda revisión por el cirujano de vuelo.",
  "umbrales": {nombre: {"valor":…, "provisional": True, "supuesto": "S2", "modificado_por_usuario": bool}},
  "personas": {
    subject_id: {
      "simulated": bool, "fase": "PRE"|"VT"|"VTa"|"POST", "fecha_evaluacion": "YYYY-MM-DD",
      "fechas": ["YYYY-MM-DD", …],                       # todas las evaluaciones
      "padecimientos": [                                   # los 20, ordenados según f.3
        {"padecimiento_id", "padecimiento", "color", "motivo",   # motivo: por qué ese color, en texto
         "condiciones": ["A1", …], "estructural": bool, "todo_n4": bool,
         "T", "T_de", "T_inf", "T_max", "dL", "dL_de", "dL_inf", "prior": {…} | None,
         "cobertura", "cobertura_ok", "nucleo_con_dato",
         "ligas": [ {"variable_id", "variable", "peso", "prior_de", "nivel_evidencia",
                     "nivel_efectivo", "sigma_efectiva", "modificado_por_usuario", "fuente",
                     "fuente_urls": [..], "direccion", "tipo_direccion", "medido_en_vuelo",
                     "ausencia": "F1"…"F7" | None, "motivo_ausencia",
                     "valor", "unidad", "fecha_dato", "antiguedad_dias", "nivel_calidad",
                     "clase_dispositivo", "z_pob", "z_fase", "z_act", "u", "var_z",
                     "activacion", "aporte", "grupo", "cuenta_en_T", "criterio": {…} | None,
                     "bayes": {"kappa", "ln_lr", "de"} | None, "estado_variable",
                     "delta_tripulacion": {…} | None, "etiquetas": [..]} ],
         "pasos": ["1. …", "2. …"],                       # cálculo paso a paso, en texto llano
         "capas_fijas": [{"nombre", "estado", "detalle"}],
         "etiquetas": ["[terrestre]", "cobertura baja", …],
         "historial": [{"fecha", "color", "T", "T_inf"}]}
      ],
      "variables": {variable_id: {"clase", "base": {…}, "media_adaptativa", "cusum", "aprendidos",
                                  "excluidos", "estado"}},
      "sin_variable": [ … ], "rechazadas": [ … ]
    }
  },
  "registro": [ … ]                                         # intentos rechazados, exclusiones
}
```

Además: `evaluacion.evaluar_en(resultado_o_estado, fecha)` no es necesario; para ver otro día se usa
`historial` (color, T, T_inf por fecha).

## 6. Overrides del usuario

`datos/modelo/overrides.json` (no existe hasta que el usuario edita algo):

```json
{"version": 1,
 "nota": "Valores modificados por el usuario. No tienen fuente. Provisional.",
 "ligas": {"P01|01:V31": {"peso": 2.0, "prior_de": 1.0, "modificado": "2026-11-14T22:10:00"}},
 "umbrales": {"T_amarillo": {"valor": 3.5, "modificado": "…"}}}
```

`parametros.restaurar()` borra el archivo (vuelve a las tablas con fuente y a los umbrales provisionales por
defecto). Los CSV de `datos/modelo/` nunca se escriben.

## 7. Comprobaciones aritméticas obligatorias (d.4, d.7)

- Una liga de peso 3 totalmente activada: T = 3; T_inf = 2.18 (A), 1.36 (B), 0.53 (C).
- P01 solo con el adaptador ECG (bandera = 1, QTc cumple criterio, latidos en el grupo de la bandera):
  T = 5; DE = 2.12; T_inf = 1.51; AMARILLO; nunca ROJO (todo N4).
- P04 con FC alertada (2, A, N1) y temperatura alertada (3, B, N3b): T = 5; DE = 1.12; T_inf = 3.16;
  AMARILLO de inmediato y ROJO si persiste 24 h.

## 8. Estado de la implementación (15 nov 2026)

Firma real: `evaluar(obs, *, tablas=None, params=None, mision=None, perfiles=None, canal="real", ruta_estado=None,
guardar=True, ruta_overrides=None, rechazadas=None)` y `evaluar_todo(sens_df=None, raw_dir=None, ecg_en_reposo=False,
mision_real=None, perfiles_real=None, guardar=True, *, simulado=True, ruta_estado_real=None, ruta_estado_simulado=None,
ruta_overrides=None)`.

Simplificado o no implementado (todo provisional): δ de fase = 0 (D5); de las capas fijas solo se calcula PHQ-9 (D15);
ausencia F6 (falta la columna de latencia, S17); «dependiente de fase» solo para `↑ en vuelo / ↓ postvuelo`; «indeterminado»
solo para el QTc sin sexo (D16); prior de P02 no usado (depende de la duración de la misión); etiquetas de tripulación solo en
la última evaluación; sin interfaz para acuse de ROJO ni cierre de revisión de CUSUM (quedan como funciones de
`Calibracion`); R-1 y R-2 exigen además una liga activa que no sea de contexto (más estricto que f.1). La tasa de falsas
alarmas no está medida: el dataset SIMULADO usa ruido acotado a propósito. Nada es un diagnóstico.

<!-- FIN DOCUMENTO CONSOLIDADO: prototipo-salud/motor/DISENO.md -->

## Documento consolidado: `prototipo-salud/NOTA-INSTALACION-PADECIMIENTOS.md`

> Fuente original: `prototipo-salud/NOTA-INSTALACION-PADECIMIENTOS.md`

# Nota de instalación: vistas «Padecimientos» y «Configuración»

Paquete de actualización del prototipo (15 nov 2026). Solo trae archivos nuevos o cambiados. **Nada de esto es un
diagnóstico**: el semáforo ordena qué revisar y recomienda consultar al cirujano de vuelo; todos los umbrales son
provisionales y ninguno está validado en astronautas.

## Cómo instalarlo
1. Cierra la app si está abierta.
2. (Recomendado) guarda una copia de tu `app.py`, `README.md`, `AVANCE.md` y `tests/conftest.py` actuales: son los únicos
   archivos existentes que este paquete reemplaza.
3. Descomprime el zip **encima** de la carpeta del prototipo (la que contiene `app.py`), aceptando reemplazar. En PowerShell:
   ```powershell
   Expand-Archive -Path .\prototipo-padecimientos.zip -DestinationPath .\prototipo -Force
   ```
   (cambia `.\prototipo` por la ruta de tu carpeta).
4. Abre la app como siempre: `.\scripts\lanzar_app.ps1`. En la barra lateral aparece el selector «Vista»:
   «Modelos y sensores» (lo de siempre, secciones 0–7 sin cambios) | «Padecimientos» | «Configuración».

No hace falta GPU, ni pesos, ni instalar paquetes: usa el mismo entorno `envs\app` (streamlit, pandas, numpy). No toca
`envs\`, `vendor\`, `weights\` ni `outputs\`.

## Qué trae
- `app.py` (solo se añadió el selector de vistas), `.streamlit/config.toml` (tema claro), `paginas/` (las dos vistas y el CSS).
- `motor/` (el algoritmo de `ALGORITMOS.md`; diseño y límites en `motor/DISENO.md`).
- `datos/modelo/` (copias de `PADECIMIENTOS.csv` y `PADECIMIENTO-VARIABLE.csv`, y la clasificación provisional de `direccion`).
- `datos/simulado/` (tripulación **SIMULADA**: 5 personas, 30 días, `simulated=true`; no es fisiología real ni dato de vuelo).
- `tests/` nuevos (`test_motor_*.py`, `test_paginas.py`, `motor_testutil.py`), `tests/conftest.py` (los tests no leen ni
  tocan tu `overrides.json` ni tus runs de `outputs\raw`), `README.md` y `AVANCE.md` actualizados.

## Cómo se usa
- **Padecimientos:** elige una persona. Las de la tripulación sintética llevan el rótulo grande **SIMULADO** y nunca se
  mezclan con datos reales. Las personas reales aparecen cuando hay runs en `outputs\raw` (hoy: ECG) o sensores cargados en la
  sección 5. «Ver» abre el detalle: variables, peso, nivel de evidencia, enlace a la fuente, cálculo paso a paso y por qué
  ese color. En «Contexto de la persona» puedes declarar fecha de lanzamiento, edad, sexo y si el ECG se tomó en reposo.
- **Configuración:** edita umbrales, peso y `prior_de`. Lo editado se guarda en `datos/modelo/overrides.json`, queda marcado
  «modificado por el usuario» (sin fuente) y no cambia los CSV. «Restaurar valores con fuente» borra ese archivo.
- La app escribe su estado local en `datos/estado/` y `datos/simulado/calibracion_SIMULADO.json`; se pueden borrar sin perder nada.

## Comprobar (opcional)
`.\scripts\verificar.ps1` ejecuta también los tests nuevos (en Linux: 98 passed, 5 skipped). No se ha probado en Windows.

## Límites
Umbrales provisionales; pesos de nivel mayoritariamente C; sin validación en vuelo; las salidas de eco y las banderas del ECG
son experimentales (nivel C forzado, no dan ROJO solas); la FEVE y las reglas R1–R5 no mueven el semáforo. **No es un diagnóstico.**

<!-- FIN DOCUMENTO CONSOLIDADO: prototipo-salud/NOTA-INSTALACION-PADECIMIENTOS.md -->

## Documento consolidado: `prototipo-salud/samples/FUENTES.md`

> Fuente original: `prototipo-salud/samples/FUENTES.md`

# Muestras (procedencia y licencia)

Todas son muestras OFICIALES publicadas dentro de los repositorios clonados en `vendor/` (revisiones en
`vendor/REVISIONES.md`). Se copiaron sin modificar (sha256 abajo). No se descargó ningún dataset con registro.
Uso: pruebas locales, no comerciales, sin redistribución fuera del equipo. Ninguna es de astronautas.

| Archivo | Origen exacto | Licencia / condiciones | Modalidad / vista | Formato | sha256 |
|---|---|---|---|---|---|
| `echoclip_example_video.avi` | `vendor/echo_CLIP/example_video.avi` (https://github.com/echonet/echo_CLIP, commit 23cd327) | Academic Software License de Cedars-Sinai (archivo LICENSE del repo): solo uso educativo/investigación académica o sin fines de lucro, sin transferir a terceros. | Video 2D modo B; vista apical (no verificada por nosotros) | MJPEG 224×224, 113 frames, 30 fps | b50434d04509bcc6dd080095a8f3021e1f6d92c094a598d6a945f0566cc40ce0 |
| `echonet_dynamic_Example1.mp4` | `vendor/dynamic/docs/media/Example1.mp4` (https://github.com/echonet/dynamic, commit e01d029) | El repo trae LICENSE (MIT) y LICENSE.txt (prohíbe redistribución/uso del código y "associated material" sin permiso escrito). El README no indica el origen de este clip; el dataset EchoNet-Dynamic exige Research Use Agreement, así que se usa solo este archivo publicado en el repo, localmente y sin redistribuir. | Video 2D modo B; apical 4 cámaras (A4C) por inspección visual | H.264 582×582, 120 frames, 30 fps | 7a5c13107a2e28b83e6e0b0f68f4682fd869b214a4fecd6206ae5a26b8af5d78 |
| `echonet_dynamic_example_small.mp4` | `vendor/dynamic/docs/media/example_small.mp4` (mismo repo y commit) | Igual que la fila anterior | Video 2D modo B (mismo tipo que Example1, archivo distinto) | H.264 582×582, 120 frames, 30 fps | 34fd7ff392f26a35b623de5108806cc5cac3d6f67112f98df278e4c8f87f6fbd |

Notas:
- `vendor/dynamic/docs/media/0X*.mp4` NO se usan como entrada: son visualizaciones 224×112 con el video original y la
  segmentación superpuesta lado a lado (no son videos crudos).
- La vista se declara manualmente al ejecutar; no hay clasificador de vista verificado en este prototipo.


## Muestras ECG (módulo `ecg`)

**DATOS REALES PÚBLICOS de pacientes hospitalarios (MIT-BIH Arrhythmia Database y MIT-BIH Atrial Fibrillation Database, PhysioNet). NO son de Iker ni de astronautas.**

Son recortes de 180 s, sin pérdida (mismos valores ADC, mismos 2 canales, mismo formato 212), de registros públicos ya descargados en `../datos/ecg`. No son diagnóstico. Acceso abierto sin credenciales ni aceptación de términos previa (según las páginas, consultadas el 2026-11-14).

| Archivo | Origen exacto | Licencia / condiciones | Contenido | Formato | sha256 |
|---|---|---|---|---|---|
| `ecg_normal_mitdb100.hea` | `physionet:mitdb/1.0.0/100` (https://physionet.org/content/mitdb/1.0.0/) | Open Data Commons Attribution License v1.0 (ODC-By 1.0); atribución obligatoria | Cabecera WFDB (2 canales, formato 212) | texto WFDB | b270d5590ce01996b54e4d9fd5e8c94b961e3917bc072d185fcc915007590bf0 |
| `ecg_normal_mitdb100.dat` | `physionet:mitdb/1.0.0/100` (https://physionet.org/content/mitdb/1.0.0/) | Open Data Commons Attribution License v1.0 (ODC-By 1.0); atribución obligatoria | Señal ECG 2 canales, valores ADC idénticos al original | WFDB formato 212 | 81fdaff8a4c839a69fd12f47887ea6d2eb51fa5641ed667eb521179884c4a122 |
| `ecg_normal_mitdb100.atr` | `physionet:mitdb/1.0.0/100` (https://physionet.org/content/mitdb/1.0.0/) | Open Data Commons Attribution License v1.0 (ODC-By 1.0); atribución obligatoria | Anotaciones recortadas (latidos y ritmo) | WFDB annotation | 90159f7e878c0961daa718f96b92ffc34b8c06311e44e917e0407a7b1274248c |
| `ecg_fa_afdb04015.hea` | `physionet:afdb/1.0.0/04015` (https://physionet.org/content/afdb/1.0.0/) | Open Data Commons Attribution License v1.0 (ODC-By 1.0); atribución obligatoria | Cabecera WFDB (2 canales, formato 212) | texto WFDB | a8084e7e5fe609d1254d8f977f246de9c156d82b99b8e25ad48eb0ce4a49222e |
| `ecg_fa_afdb04015.dat` | `physionet:afdb/1.0.0/04015` (https://physionet.org/content/afdb/1.0.0/) | Open Data Commons Attribution License v1.0 (ODC-By 1.0); atribución obligatoria | Señal ECG 2 canales, valores ADC idénticos al original | WFDB formato 212 | 5ca3a2077b94afc6163f9882e88c56e50b4001b51d7c172e9a0e61c7ac043d9a |
| `ecg_fa_afdb04015.atr` | `physionet:afdb/1.0.0/04015` (https://physionet.org/content/afdb/1.0.0/) | Open Data Commons Attribution License v1.0 (ODC-By 1.0); atribución obligatoria | Solo anotaciones de ritmo recortadas (+ ritmo inicial añadido); el original no trae latidos | WFDB annotation | 6eb941ad66de253f256c105a7cb3795b2db10dbfd82c1683b2674862b27417ea |
| `ecg_fa_afdb04015.qrs` | `physionet:afdb/1.0.0/04015` (https://physionet.org/content/afdb/1.0.0/) | Open Data Commons Attribution License v1.0 (ODC-By 1.0); atribución obligatoria | Latidos de detector automático NO auditado | WFDB annotation | 2f016d04797b874c1f3920a3d51ed26407a3d32cf403da174169e385d1e6fdd2 |
| `ecg_extrasistoles_mitdb201.hea` | `physionet:mitdb/1.0.0/201` (https://physionet.org/content/mitdb/1.0.0/) | Open Data Commons Attribution License v1.0 (ODC-By 1.0); atribución obligatoria | Cabecera WFDB (2 canales, formato 212) | texto WFDB | 0954cdb45622cb02bd3277c2e2dac955a06f40188e17aa8b6abd1507670c6dbb |
| `ecg_extrasistoles_mitdb201.dat` | `physionet:mitdb/1.0.0/201` (https://physionet.org/content/mitdb/1.0.0/) | Open Data Commons Attribution License v1.0 (ODC-By 1.0); atribución obligatoria | Señal ECG 2 canales, valores ADC idénticos al original | WFDB formato 212 | 25f0e712c3c8d695e18d7e70e583ccf62f38a968a31b2ebfee1f809c51a3ce3b |
| `ecg_extrasistoles_mitdb201.atr` | `physionet:mitdb/1.0.0/201` (https://physionet.org/content/mitdb/1.0.0/) | Open Data Commons Attribution License v1.0 (ODC-By 1.0); atribución obligatoria | Anotaciones recortadas (latidos y ritmo) | WFDB annotation | 376cfdd23a004b6f0ce3da5b33181c1acd7e12a937f757acef694fdb17a2dced |

### ecg_normal_mitdb100
- Registro 100, MIT-BIH Arrhythmia Database v1.0.0. Canales MLII, V5. 360 Hz.
- Muestras 172800–237600 del original (480–660 s); 64800 muestras = 180 s.
- Ritmo anotado: (N durante todo el segmento (0–180 s).
- Latidos en el segmento: N=230; sin A ni V (ventana elegida por código: la primera alineada a múltiplos de 30 s sin latidos A/V; las anteriores contenían A o V).

### ecg_fa_afdb04015
- Registro 04015, MIT-BIH Atrial Fibrillation Database v1.0.0. Canales ECG1, ECG2. 250 Hz.
- Muestras 130000–175000 del original (520–700 s); 45000 muestras = 180 s.
- Ritmos (tiempos relativos al segmento; verificados con el .atr real): (N 0–13.392 s (13.4 s); (AFIB 13.392–147.428 s (134.0 s); (N 147.428–180 s (32.6 s). En el original: (AFIB en la muestra 133348, (N en 166857.
- El .atr original solo tiene anotaciones de ritmo (sin latidos). `.qrs` recortado: N=359 (detector automático, NO auditado; úsese solo como referencia no verificada).

### ecg_extrasistoles_mitdb201
- Registro 201, MIT-BIH Arrhythmia Database v1.0.0. Canales MLII, V1. 360 Hz.
- Muestras 194400–259200 del original (540–720 s); 64800 muestras = 180 s.
- Ritmos (s relativos): (N 0–14.47; (T 14.47–36.84; (N 36.84–68.09; (T 68.09–79.97; (N 79.97–101.33; (T 101.33–116.31; (N 116.31–121.02; (T 121.02–180 (T = trigeminismo). Sin (AFIB. Ventana elegida por código: la primera alineada a 30 s dentro de 188387–570586 con solo ritmos N/(T y ≥10 V.
- Latidos en el segmento: N=110, V=40, a=2 (aberrado auricular prematuro), x=4 (P no conducida); sin A.

### Cómo se generó
`python samples/crear_muestras_ecg.py` (opcional `--datos RUTA`, por defecto `../datos/ecg`). Usa wfdb 4.3.1 (`rdrecord`/`wrsamp`/`wrann`) y comprueba con `assert` que señal, latidos y ritmos releídos coinciden con el original desplazado.

**Aclaración:** en los tres `.atr` recortados, la anotación de ritmo (símbolo `+`, aux_note con la etiqueta vigente) en la muestra 0 la AÑADIÓ el script para conservar el ritmo vigente al inicio del segmento; no está en esa posición en el original. En las tres es `(N`. El `.qrs` de AFDB es salida de un detector automático no auditada.

### Licencia verificada
Páginas consultadas el 2026-11-14 (WebFetch): https://physionet.org/content/mitdb/1.0.0/ y https://physionet.org/content/afdb/1.0.0/. Ambas muestran la licencia **Open Data Commons Attribution License v1.0** y dicen "Anyone can access the files, as long as they conform to the terms of the specified license" (acceso abierto; el login solo sirve para ver el contacto del autor). Se exige atribución con las citas siguientes.

### Citas requeridas
MIT-BIH Arrhythmia Database (según https://physionet.org/content/mitdb/1.0.0/):
- Moody, G., & Mark, R. (2005). MIT-BIH Arrhythmia Database (version 1.0.0). PhysioNet. RRID:SCR_007345. https://doi.org/10.13026/C2F305
- Moody GB, Mark RG. The impact of the MIT-BIH Arrhythmia Database. IEEE Eng in Med and Biol 20(3):45-50 (2001). PMID: 11446209. https://doi.org/10.1109/51.932724
- Cita estándar de PhysioNet (la página la da ahora así, no como Goldberger et al. 2000): Pollard, T., et al. (2026). PhysioNet as a global platform for biomedical research. Nature Health. https://doi.org/10.1038/s44360-026-00096-z

MIT-BIH Atrial Fibrillation Database (según https://physionet.org/content/afdb/1.0.0/):
- Moody GB, Mark RG. A new method for detecting atrial fibrillation using R-R intervals. Computers in Cardiology 10:227-230 (1983). http://ecg.mit.edu/george/publications/afib-cinc-1983.pdf (sin DOI en la página)
- Dataset DOI v1.0.0: 10.13026/C2MW2D
- Cita estándar de PhysioNet: Pollard, T., Moody, B. E., Lehman, L., Gow, B., Fernandes, C., Xie, C., Johnson, A., Mark, R. G., & Heldt, T. (2026). PhysioNet as a global platform for biomedical research. Nature Health. DOI 10.1038/s44360-026-00096-z

Nota: licencia, política de acceso y citas se contrastaron además contra el HTML de ambas páginas (descargado con `curl` el 2026-11-14, sin iniciar sesión): el texto de la licencia, el DOI de cada base, la cita de Moody & Mark y la cita estándar de PhysioNet (Pollard et al. 2026, Nature Health 1(8):792–795) aparecen literalmente en el bloque "please cite" de cada página.

### Copias de registros completos en la validación
`validacion/ecg/runs/<run_id>/input/` guarda una copia sin modificar de cada registro analizado en la validación del
módulo ECG: 100, 201 y 203 de la MIT-BIH Arrhythmia Database v1.0.0 (`.hea`, `.dat`, `.atr`) y 04015 de la MIT-BIH
Atrial Fibrillation Database v1.0.0 (`.hea`, `.dat`, `.atr`, `.qrs`). Misma licencia (ODC-By 1.0) y mismas citas que
arriba. Son también **datos reales públicos de pacientes hospitalarios, no de Iker ni de astronautas**.

<!-- FIN DOCUMENTO CONSOLIDADO: prototipo-salud/samples/FUENTES.md -->

## Documento consolidado: `prototipo-salud/sensores/ESQUEMA.md`

> Fuente original: `prototipo-salud/sensores/ESQUEMA.md`

# Esquema de sensores (PASO 5)

Todo ejemplo de esta carpeta es **SINTETICO** (`simulated=true`, notes "DATO SINTÉTICO generado por
generar_sintetico.py, no es de ninguna persona"). Nada de esto es diagnostico.

## Formato largo (CSV o JSON: lista de objetos, o `{"rows": [...]}`)
`subject_id, timestamp, device, variable, value, unit, quality, simulated, metric_detail, notes`

- Obligatorias: `subject_id`, `timestamp` (ISO-8601, p. ej. `2026-11-01T08:30:00` o con zona `...+00:00`), `device`.
  Filas sin subject_id/device o con timestamp invalido se DESCARTAN con aviso (cuantas y por que).
- `unit`: obligatoria o se deduce de `VARIABLES` (con aviso). Solo se convierte si es inequivoco
  (°F->°C, K->°C, min->h en sleep_duration, h->min en active_minutes) y se anota en `notes`; otra unidad incompatible => fila descartada con aviso.
- `simulated`: se conserva tal cual; si falta la columna o la celda, se asume `false` y se avisa.
- `metric_detail`: la HRV lleva SIEMPRE su metrica (`hrv_rmssd` o `hrv_sdnn`; un `hrv` generico solo se acepta si metric_detail es rmssd/sdnn).
- `temperature`/`temp` sin especificar se rechaza: usa `temp_skin` (cutanea) o `temp_body` (corporal).

## Formato ancho (CSV)
`subject_id, timestamp, device` + una columna por variable (nombre canonico o alias; sufijo de unidad opcional
`temp_body__F`) + opcionales `quality, simulated, notes`. Las celdas vacias NO generan filas (ausente != 0).

## Variables (unidad canonica)
heart_rate (bpm), hrv_rmssd (ms), hrv_sdnn (ms), spo2 (%), bp_systolic / bp_diastolic (mmHg), temp_skin (°C, cutanea),
temp_body (°C, corporal), sleep_duration (h), sleep_efficiency (%), steps (count), active_minutes (min), symptom (texto en `value`).
No se exigen todas. Notas de evidencia: la SpO2 de reloj tiende a sobreestimar en hipoxemia; la temperatura de reloj/anillo
solo sirve como cambio relativo.

## Faltantes
Valor vacio => `NaN` (nunca 0). En largo la fila se conserva con `value=NaN`; en resumenes: `n` (validos), `faltantes`
(NaN en la ventana) y columnas `*_motivo` cuando algo no se puede calcular (tendencia con n<3, basal con <3 valores).
`timestamp` sin zona se conserva tal cual y, al cruzar con otras fuentes, se asume UTC (la "noche" 22:00-06:00 usa la hora almacenada).

## Ejemplos y datos de prueba de la regla tipo NightSignal
`ejemplo_sintetico_sensores.csv|json` (1285 filas, 2 personas, 2026-11-01 a 2026-11-10 08:00, semilla 20261114; regenerar:
`python sensores/generar_sintetico.py`), `ejemplo_sintetico_ancho.csv` (11 filas, temp_body en °F).
- **SIM-A01**: reloj, anillo, manguito manual, termometro, diario; **las noches del 08 y 09 de noviembre tienen FC nocturna ~+6 bpm
  sobre su basal**, por lo que la regla R3 (tipo NightSignal, Alavi 2022) se activa con datos SIMULADOS.
- **SIM-B02**: control sin elevacion; sin SpO2 ni presion arterial (variables ausentes); sin anillo.
- Hay huecos NaN (~6 % de la FC del reloj, dias sin termometro), calidades variadas y HRV con metrica explicita.

<!-- FIN DOCUMENTO CONSOLIDADO: prototipo-salud/sensores/ESQUEMA.md -->

## Documento consolidado: `prototipo-salud/validacion/README.md`

> Fuente original: `prototipo-salud/validacion/README.md`

# Validación externa: Inspiration4 (OSDR, abierto)

PROVISIONAL. No es un diagnóstico. Datos **reales** (no SIMULADO) de los 4 civiles de Inspiration4 (C001–C004; 3 días en órbita, 2021-09-16 → 2021-09-18 UTC).

## Fuentes (acceso público, sin registro ni acuerdo de uso)
| OSDR | Archivo | Variables del motor |
|---|---|---|
| [OSD-569](https://osdr.nasa.gov/bio/repo/data/studies/OSD-569) (LSDS-7) | `LSDS-7_Complete_Blood_Count_CBC.upload_SUBMITTED.csv` | 04:A10 leucocitos, 01:V98 linfocitos abs., 01:V99 neutrófilos abs., 01:V60 plaquetas, 01:V108 Hb, 01:V109 Hto |
| [OSD-575](https://osdr.nasa.gov/bio/repo/data/studies/OSD-575) (LSDS-8) | `LSDS-8_Comprehensive_Metabolic_Panel_CMP.upload_SUBMITTED.csv` | 01:V39 potasio, 02:V31 sodio, 02:V14 calcio |
| OSD-575 (LSDS-8) | `LSDS-8_Multiplex_serum.cardiovascular.EvePanel_SUBMITTED.csv` | 04:A13 PCR (pg/mL → mg/L) |

El metadato OSDR no declara una licencia explícita; la descarga es pública. **No se suben los crudos al repo**: el script los descarga.
No hay en OSDR datos abiertos de FC, HRV ni SpO2 de Inspiration4 (los del Apple Watch están en Jones et al. 2024, no como archivo abierto en OSDR); no se usó nada controlado (LSDA/LSAH/OSDR restringido).
Puntos: PRE L-92, L-44, L-3 · POST R+1, R+45, R+82, R+194 (no hay sangre en vuelo en estos archivos). Fechas calculadas desde lanzamiento/amerizaje; la hora de extracción no se reporta.

## Uso
```bash
cd prototipo-salud
python -m validacion.inspiration4 --dir /tmp/i4_osdr --json /tmp/i4_resultado.json
```
Evalúa de forma acumulada en cada punto, con estado temporal (no toca `eva.db`). Corre dos configuraciones: la por defecto y una de **sensibilidad** con `n0_min = 3` (el motor exige 5 puntos prevuelo, Coskun 2021).

## Resultados (corrida 2026-11-15)
- 278 filas nativas, 0 rechazadas por la puerta de calidad.
- **Configuración por defecto:** 80/80 celdas GRIS en todos los puntos. Con 3 extracciones prevuelo no hay base personal (n0 < 5) y los laboratorios no tienen referencia poblacional en el motor; el motor se niega a colorear en vez de inventar.
- **Sensibilidad n0_min = 3:** en R+1 marca potasio ↓ (C002 z −3.5, C003 z −2.4; C003 = 3.0 mmol/L, bajo el rango del laboratorio 3.5–5.3) y leucocitos ↓ en C003 (z −8.8 con 7.0 ×10³/µL, dentro de rango: la desviación prevuelo con 3 puntos es muy pequeña, lo que muestra por qué el motor pide ≥ 5). Ningún padecimiento sale ROJO; solo P17 AMARILLO en C004 en R+194.
- **Bandera del laboratorio (Quest, en el mismo archivo):** en R+1 solo el potasio de C003 (3.0) está fuera de rango; el motor lo detecta en la sensibilidad.
- **Dato dudoso en la fuente:** C003 L-92 trae plaquetas 12.9 y neutrófilos 10.1 (incompatibles con los demás puntos; probable error de unidades). La puerta de calidad no lo rechaza (es valor posible).

## Qué reportó el estudio
- Jones et al. 2024, *Nature* 632:1155 ([doi:10.1038/s41586-024-07648-x](https://doi.org/10.1038/s41586-024-07648-x)): casi todos los cambios volvieron a la línea base tras el regreso; misiones cortas sin riesgo significativo.
- Kim et al. 2024, *Nat Commun* 15:4954 ([doi:10.1038/s41467-024-49211-2](https://doi.org/10.1038/s41467-024-49211-2)): proporciones celulares estables en el vuelo, también en el CBC.
- Houerbi et al. 2024, *Nat Commun* 15:4862: cambios agudos en R+1 en coagulación, activación plaquetaria e inflamación medidos con proteómica (no con las variables del motor).

Concordancia: el motor no levanta ningún ROJO en R+1, consistente con lo reportado. Límite: es concordancia por ausencia de alertas, con n = 4, sin datos en vuelo y sin vitales.

## Experimento: base prevuelo completada con relleno SIMULADO (`--rellenar-simulado`)
**No es validación ni prueba nada clínico.** La base prevuelo queda parcialmente SIMULADA.
- Se excluyen las 4 filas de CBC de C003 en L-92 (plaquetas 12.9, neutrófilos 10.1, linfocitos 6826, leucocitos 9.6), sospechosas de error de unidades.
- Por tripulante/variable se agregan puntos PRE hasta 5 (fechas L-75, L-60, L-30, L-20, L-10): N(media de sus tomas PRE reales, DE de esas tomas); si la DE es 0 o hay < 2 tomas, DE intra-sujeto combinada de la tripulación. Semillas 0, 1, 2. 84 puntos rellenos por semilla.
- Como el motor nunca mezcla canales (G1), todo se evalúa en canal **SIMULADO**; las filas reales conservan `Inspiration4 (OSDR, abierto)` en `notes`.
- Configuración normal del motor (n0_min = 5), estado temporal.

Resultado (2026-11-15): ningún ROJO en ninguna semilla ni punto. Lo que se repite en ≥ 2 de 3 semillas: en R+1 potasio ↓ (C002, C003) y leucocitos/neutrófilos ↓ en C003; P17 AMARILLO en C004 en R+82/R+194. P08 AMARILLO en C003 (R+1 a R+194) solo con la semilla 2. Los z cambian mucho entre semillas (p. ej. leucocitos C003 en R+1 de −2 a −12): con 3 tomas reales, la base depende del relleno.
Laboratorio (Quest): en R+1 solo el potasio de C003 (3.0 mmol/L) está fuera de rango. Jones 2024 / Kim 2024: casi todo volvió a la línea base; CBC estable.

<!-- FIN DOCUMENTO CONSOLIDADO: prototipo-salud/validacion/README.md -->

## Documento consolidado: `README.md`

> Fuente original: `README.md`

# LUNNA · Monitoreo de salud para misiones espaciales

Proyecto del equipo Monarcas para NASA Space Apps Challenge 2026. Reúne el sistema EVA/LUNNA, su modo de simulación y un prototipo de investigación independiente para analizar señales y datos de salud.

> Es un prototipo educativo/de investigación: no es un dispositivo médico, no diagnostica y no está validado para uso clínico ni en astronautas. La tripulación inicial es ficticia; los datos de la demo son sintéticos.

## Requisitos

- **Node.js 22.6 o superior** para EVA y la simulación. No requieren `npm install`.
- **Python** solo para el **prototipo de salud**; ahí están los requisitos y el procedimiento detallado.
- PowerShell en Windows, Terminal en macOS/Linux.

Comprueba Node con:

```powershell
node --version
```

## Iniciar la demo

Abre PowerShell en la carpeta raíz del repositorio y ejecuta:

```powershell
Set-Location .\Simulacion
npm start
```

Abre las pantallas en el navegador usando los enlaces de la sección [Interfaces](#interfaces). La simulación utiliza datos sintéticos y una base de datos separada: `Simulacion/eva-simulacion.db`.

Opcionalmente, desde otra terminal en `Simulacion`, inicia el generador de telemetría:

```powershell
npm run generador
```

## Iniciar el sistema sin el escenario de simulación

Detén primero cualquier otro servidor del proyecto; ambos modos usan el puerto **8787**.

```powershell
Set-Location .\Sistema\backend
npm start
```

Este modo no carga el simulador ni el escenario sintético. Su base local es `Sistema/backend/eva.db`. Las semillas de la tripulación son ficticias y los parámetros son provisionales; el backend no crea por sí solo datos de sensores reales.

Para detener cualquiera de los servidores, vuelve a su terminal y presiona **Ctrl+C**.

## Interfaces

Con el servidor iniciado, abre:

| Interfaz | Dirección |
|---|---|
| App de tripulación | [http://localhost:8787/app/](http://localhost:8787/app/) |
| Computadora central | [http://localhost:8787/app/central.html](http://localhost:8787/app/central.html) |
| Base en Tierra | [http://localhost:8787/app/base.html](http://localhost:8787/app/base.html) |
| Reloj | [http://localhost:8787/reloj/](http://localhost:8787/reloj/) |
| Consola de Tierra | [http://localhost:8787/tierra](http://localhost:8787/tierra) |
| Panel de la nave | [http://localhost:8787/nave](http://localhost:8787/nave) |
| Simulador visual de la nave · solo simulación | [http://localhost:8787/simulador](http://localhost:8787/simulador) |
| Estado del backend | [http://localhost:8787/api/salud](http://localhost:8787/api/salud) |

El endpoint de estado informa el modo activo. En modo operativo, el simulador visual no está disponible.

## Comprobaciones

Ejecuta cada comando desde la carpeta indicada:

```powershell
# Sistema operativo
Set-Location .\Sistema\backend
npm test

# Simulación
Set-Location ..\..\Simulacion
npm test
```

## Prototipo de salud (opcional)

La app Streamlit de `prototipo-salud` es un proyecto aparte de las interfaces EVA. Para iniciar su interfaz básica:

```powershell
Set-Location .\prototipo-salud
.\scripts\instalar_app.ps1
.\scripts\lanzar_app.ps1
```

Después abre [http://localhost:8501](http://localhost:8501). La configuración inicial permite explorar la app sin descargar los pesos de los modelos; las inferencias de ecocardiografía requieren pasos y recursos adicionales. Consulta **prototipo-salud/README.md**.

## Guías

- **Sistema EVA/LUNNA** · modo operativo y componentes.
- **Backend** · API, telemetría y contratos.
- **Interfaces EVA** · app, central y base.
- **Interfaz del reloj**.
- **Simulación** · escenario sintético y generador.
- **Prototipo de salud** · instalación, modelos, motor, datos y límites.

## Despliegue

Estas instrucciones están pensadas para ejecutar la demo localmente. El proyecto no está preparado para operación médica ni para exponerse como servicio público; no uses sus datos, semáforos o alertas para tomar decisiones clínicas.

<!-- FIN DOCUMENTO CONSOLIDADO: README.md -->

## Documento consolidado: `Simulacion/README.md`

> Fuente original: `Simulacion/README.md`

# Simulación

Todo lo que produce o muestra **datos sintéticos**. Nada de esta carpeta viene de un astronauta ni de un
sensor real. Usa el código de **`Sistema/`** sin copiarlo: `Sistema/` no depende de
esta carpeta, pero esta sí depende de `Sistema/`.

```bash
cd Simulacion
npm start          # el backend de Sistema/ en modo simulación → http://localhost:8787
npm run generador  # generador de telemetría sintética por terminal (antes: npm run sim)
npm test           # pruebas del modo simulación
```

Requiere **Node 22.6+**, sin `npm install`. `npm start` usa su propia base, `eva-simulacion.db` (en esta
carpeta, ignorada por git), para que los datos sintéticos nunca caigan en la base operativa
(`Sistema/backend/eva.db`).

| Carpeta | Qué es |
|---|---|
| `simulador/simulador.html` | Simulador visual de la nave en **/simulador**: astronauta, dispositivos, PC central y Tierra. El PC abre la central (`/app/central.html`), el smartphone la app (`/app/`), la Tierra la base (`/app/base.html`) y el reloj el de la tripulación (`/reloj/`) |
| `generador/simulador.ts` | Generador de terminal: tramas binarias del perfil EVA y JSON como las de la pasarela, 4 tripulantes y 112 días |
| `escenarios/interfaces/` | Escenario de las interfaces: `datos.js` (días 106–115 con semilla fija) y `demo.js` (demo automática, `?demo`). El backend los sirve en `/app/escenario/…` sólo en este modo |
| `donki/` | Eventos de partículas solares de **NASA DONKI** (datos reales, usados como modelo del evento del día 115) y `fetch_donki.py`, que los descarga con la `NASA_API_KEY` del `.env` de la raíz |
| `test/` | Las ventanas del simulador, el escenario, el reinicio de la demo y el generador de punta a punta |

En este modo todas las pantallas llevan el distintivo **«Simulación · datos sintéticos»**, la página de
estado del backend dice **MODO SIMULACIÓN** y `GET /api/salud` responde `"modo": "simulacion"`.

URLs: `/simulador`, `/app/`, `/app/central.html`, `/app/base.html`, `/reloj/` y `/tierra`, las mismas de
siempre.

<!-- FIN DOCUMENTO CONSOLIDADO: Simulacion/README.md -->

## Documento consolidado: `Sistema/backend/ENLACE-HTTPS.md`

> Fuente original: `Sistema/backend/ENLACE-HTTPS.md`

# Enlace HTTPS nave ↔ Tierra

Transporte real (TLS) entre dos procesos del mismo backend. Todos los datos de la demo son SIMULADOS.

## Cómo correrlo
```
npm run certs      # certs/tierra.crt + tierra.key (autofirmado, desarrollo; --forzar regenera)
npm run tierra     # HTTPS :8443  (consola /tierra, /enlace/*)
npm run nave       # HTTP  :8787  (UI, app, /nave) + cliente HTTPS hacia Tierra
```
Variables: `BD`, `PUERTO` (0 = efímero; imprime `PUERTO=<n>`), `TIERRA_URL` (def. `https://localhost:8443`), `TIERRA_CA`, `TLS_CERT`, `TLS_KEY`, `PING_S` (def. 60), `TIMEOUT_S` (def. 5), `SIMULAR_OWLT=1`.
Estado: `GET /api/enlace/estado` (nave y Tierra). Código: `src/sincro.ts` (protocolo), `src/enlace-https.ts` (transporte).

## Algoritmo
- Cada lado tiene su cola de salida (outbox): `bajada` (nave→Tierra) y `subida` (Tierra→nave). Cada mensaje lleva `(emisor, seq)`, con seq monótono por emisor.
- Lotes por prioridad y luego seq; el cuerpo JSON va con `x-eva-sha256`. Si no coincide: 422 y no se aplica nada.
- El receptor guarda cada `(emisor, seq)` una sola vez (UNIQUE en `entrada`); inbox + aplicación en una transacción. Reenvíos = duplicados ignorados.
- ACK acumulado (1..n completos) + selectivos; el emisor marca `ack=1`. Lo no confirmado se reincluye solo en el siguiente lote: la reanudación parte de lo pendiente.
- Fallo de cualquier petición (timeout, red, status ≠ 200) → DESCONECTADO inmediato y reintento con backoff exponencial con jitter (base 1 s, tope = `PING_S`).
- Efecto: al-menos-una-vez en el transporte + idempotencia = exactamente-una-vez.

## Tiempos y canales
- `t_evento` (cuándo ocurrió), `t_envio` (salida del lote), `t_recepcion` (aplicado en el receptor); antigüedad = ahora − t_evento.
- Avisos Tierra→nave: `subida`. Avisos nave→Tierra: `bajada` tipo `aviso` (`POST /api/nave/avisos`). Datos: `alerta`, `resumen`, `crudos`, `evaluacion`, `acuse`.

## Latido (heartbeat)
Por defecto 60 s; se recomienda `PING_S=15`. Latencia de detección de caída ≤ `PING_S` + `TIMEOUT_S` (los fallos de lote se ven al instante). Un GET con keep-alive cuesta casi nada. Por debajo de ~10 s con `TIMEOUT_S=5` crece el riesgo de falsos DESCONECTADO por jitter.
Con Marte real (RTT de 8 a 48 min) un latido de segundos solo modela el tramo terrestre: manda la ventana y el retraso (`SIMULAR_OWLT=1` suma owlt antes y después de cada petición). Ventana cerrada = almacenar y reenviar, sin tráfico.

## Límites
- Solo TLS del servidor con certificado autofirmado de desarrollo: no hay autenticación de la nave ante Tierra (`x-eva-emisor` es informativo, no es credencial) ni cifrado de las BD.
- Una nave y una Tierra; sin rotación de certificados ni límites de tasa. Las llaves viven en `certs/` (ignorada por git); no se versionan.
- Reanudación a nivel de lote, no de byte.

<!-- FIN DOCUMENTO CONSOLIDADO: Sistema/backend/ENLACE-HTTPS.md -->

## Documento consolidado: `Sistema/backend/README.md`

> Fuente original: `Sistema/backend/README.md`

# EVA · Computadora central + LUNNA

Recibe tramas de cualquier dispositivo, las atribuye al tripulante correcto, las guarda,
y avisa cuando un signo vital se sale de **lo esperado para esa persona en ese entorno**.

**LUNNA** — *Live-telemetry Updating Network for Nominal-deviation & Anomalies* — es el
modelo que define "lo esperado".

```bash
npm start      # servidor en modo operativo; http://localhost:8787 = estado
npm test       # pruebas del backend (las del modo simulación están en Simulacion/test)
```

El simulador visual (`/simulador`), el generador de telemetría sintética y el escenario de las interfaces
viven en **`Simulacion/`**: `cd Simulacion && npm start` arranca **este mismo
servidor** en modo simulación (`--modo simulacion --simulacion <carpeta>`, con su propia base
`Simulacion/eva-simulacion.db`) y `npm run generador` es el antiguo `npm run sim`. En modo operativo
`/simulador` y el escenario responden 404 y `POST /api/demo/reiniciar` responde 403; `GET /api/salud`
dice en qué modo corre.

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
| **Todo lo de un tripulante, ya evaluado** (lo usan el celular y la central) | `GET /api/app/:tripulante` — por variable: último valor, mediana, esperado, banda, z, `estado`, `motivo`, umbral clínico, serie de 14 días; más sus alertas y avisos |
| Umbrales clínicos de referencia | `GET /api/referencias` (de `semillas/medibles.json`) |
| Ventana de LUNNA (sólo demostraciones) | `GET/PUT /api/lunna/ventana` `{ minutos }` — 1440 en misión |
| Alertas | `GET /api/alertas` |
| Editar variables · esquemas · dispositivos | `GET/POST /api/variables` · `/api/esquemas` · `/api/dispositivos` |
| Tripulantes, basales e historial | `GET/POST /api/tripulantes` · `PUT …/:id/basales` · `POST …/:id/historial` |
| Ponerse un dispositivo | `POST /api/asignaciones` `{ dispositivo, tripulante }` |
| Fases de la misión | `GET/POST /api/fases` `{ desde, entorno }` |
| Enlace con Tierra | `GET/PUT /api/enlace` `{ owlt_s, abierto }` |
| Lo que ha llegado a Tierra | `GET /api/tierra/bandeja[?tipo=resumen\|alerta\|crudos\|acuse\|consulta\|emergencia]` (con la antigüedad de cada cosa) |
| Tierra manda un aviso | `POST /api/tierra/avisos` `{ para, texto, prioridad }` |
| Tierra manda una alerta manual | `POST /api/tierra/avisos` `{ tipo: "alerta", nivel: "ambar"\|"rojo", para, variable?, texto }` |
| Consola de control de misión | `GET /tierra` |
| Avisos ya llegados a la nave | `GET /api/avisos` |
| La CMO avisa a un tripulante (a bordo, sin retraso) | `POST /api/abordo/avisos` `{ para, texto, nivel?: "ambar"\|"rojo", de? }` · `GET /api/abordo/avisos` |
| La central consulta a Tierra (baja por el enlace) | `POST /api/central/consultas` `{ sobre?, texto, nivel?, de? }` → paquete `consulta` en la bandeja |
| El teléfono registra una emergencia | `POST /api/emergencias` `{ tripulante, modo: "SOS manual"\|"automático", causa?, disparadores? }` · `PUT /api/emergencias/:id` `{ resultado }` · `GET /api/emergencias[?tripulante=]` → paquete `emergencia` (prioridad 0) |

Eventos de `/api/stream`: `muestra`, `alerta`, `rechazo`, `tierra` (algo llegó a Tierra),
`aviso` (un aviso de Tierra llegó a la nave, o uno de la CMO con `origen: "abordo"`), `enlace` y
`emergencia` (se abrió o se cerró una emergencia). Lo de a bordo vive en `src/abordo.ts`.

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

### Dos criterios, el peor manda

| Criterio | Qué compara | Para qué |
|---|---|---|
| **Personal** (LUNNA) | Mediana de 24 h contra lo esperado para **esa** persona en ese entorno | Derivas lentas que un rango genérico no ve (fatiga, desacondicionamiento) |
| **Umbral clínico** | Mediana de las últimas 5 muestras válidas (≤ 10 min) contra el límite de `semillas/medibles.json` | Lo agudo: una SpO₂ de 87 % es grave aunque sea «normal para ti». Vale también en calibración |

Cada alerta dice su `motivo`: `personal`, `umbral` o `ambos`, y si hubo umbral, cuál y de qué fuente.
Los umbrales de signos vitales del catálogo de Iker son **[T] clínicos terrestres**: no se encontró una
tabla pública de NASA para ellos. Trazabilidad dato por dato en **`semillas/medibles.md`**, dentro del contenido consolidado de este README.

⚠️ **Modo demostración.** Con 24 h, una anomalía provocada en una demo de minutos tarda en mover la
mediana y la vuelta a verde no se ve. El simulador, al pasar a «En vivo», acorta la ventana a 5 min y lo
anuncia (`modo mision` en la terminal de la PC la devuelve a 24 h). `/api/salud` y la página de estado
siempre dicen qué ventana está activa.

Relación con la fórmula de Bayes del cuaderno, firmware del ESP32 y pasarela Bluetooth: `INTEGRACION.md`,
en la etiqueta `planeacion-archivo` (`git checkout planeacion-archivo -- Planeacion/Julio/INTEGRACION.md`).

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
web/tierra.html    consola de control de misión en /tierra
web/nave.html      panel del enlace HTTPS de la nave en /nave
                   /app/ sirve Sistema/interfaces/eva (celular, central, base) y /reloj lleva a
                   /interfaces/reloj/; /app/config.js dice a las interfaces en qué modo corre el
                   servidor. Las rutas antiguas /maquetas/Leo/maqueta-eva/… y
                   /maquetas/Fani/maqueta-reloj/… redirigen (301) a /interfaces/…
(el simulador visual y el de terminal están en Simulacion/simulador y Simulacion/generador)
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
`Simulacion/simulador/simulador.html` para que la maqueta funcione sin internet.

<!-- FIN DOCUMENTO CONSOLIDADO: Sistema/backend/README.md -->

## Documento consolidado: `Sistema/backend/semillas/medibles.md`

> Fuente original: `Sistema/backend/semillas/medibles.md`

# Variables medibles por sensor: qué dice el catálogo

Equipo Monarcas · 2026-11-15 · Datos: [`medibles.json`](medibles.json) (lo carga el backend al arrancar)

Las siete variables que el sistema recibe de sensores (playera, reloj, brazalete), con lo
que los catálogos de investigación del repo dicen de cada una.

**Cómo leerlo**

- **Nada es de memoria.** Cada número sale de un archivo del repo y la columna "De dónde
  sale" dice cuál y en qué fila. Lo que no está en el catálogo se marca **no encontrado**.
- **[A]** = umbral de NASA o validado en astronautas · **[T]** = clínico terrestre, no
  validado en microgravedad. **Todos los umbrales de signos vitales son [T]**: el catálogo
  no encontró ninguna tabla pública de NASA para ellos.
- **El sistema no diagnostica.** Señala qué vigilar y a qué padecimientos apunta una
  desviación; la interpretación es del médico de vuelo.
- Los umbrales absolutos **complementan** la comparación con la línea base propia (LUNNA),
  no la sustituyen. El catálogo lo pide así: "usar la línea base del propio tripulante".

Abreviaturas de origen: **VMA** = `VARIABLES-MEDIDAS-ASTRONAUTAS.csv` · **PV** =
`PADECIMIENTO-VARIABLE.csv` · **cat. 01 / 03 / 04** = archivos de `variables-diagnostico/`
(con número de línea) · **índice** = `variables-diagnostico/00-indice-priorizado.md`.

> Los dos CSV siguen en `Planeacion/`. La carpeta `variables-diagnostico/` se quitó del árbol para dejar
> solo lo que corre; está íntegra en la etiqueta `planeacion-archivo`:
> `git checkout planeacion-archivo -- Planeacion/variables-diagnostico`

---

## 1. Quién lo ha medido en vuelo y cómo lo medimos nosotros

Las siete figuran como **"sí en vuelo"** en el catálogo.

| Variable (id) | Equipo real en vuelo | Aquí | De dónde sale |
|---|---|---|---|
| Frecuencia cardiaca (`04:A4`), lpm | ISS: manguito automático ALSP (40–200 lpm, ±5 %), Polar Heart Rate Monitor 2 (continua en ejercicio), BP/ECG, Bio-Monitor de la CSA (camiseta, desde dic 2018). En reposo: Holter/ECG. Orion: ECG en el kit médico | Playera con ECG y reloj con PPG | VMA fila 310 · cat. 04 A4 (l. 27) y tabla B.1 · VMA fila 4 (`01:V3`) |
| SpO2 (`04:A3`), % | Pulsioxímetro del kit de la ISS (ALSP/AMP), Bio-Monitor. Orion: pulsioxímetro en el kit; el dato "puede ingresarse a mano". Rango y exactitud: no encontrado | Reloj con PPG rojo/infrarrojo | VMA fila 309 · cat. 04 A3 (l. 26) y B.1 |
| Frecuencia respiratoria (`04:A2`), resp/min | Bio-Monitor (frecuencia y volumen respiratorio); conteo manual; ECG + sensor respiratorio | Banda torácica de la playera | VMA fila 308 · cat. 04 A2 (l. 25) |
| Temperatura corporal (`04:A1`), °C | Termómetros orales desechables y de piel de los kits (ISS AMP; Shuttle); sensor de flujo de calor en la frente (Thermolab, ESA/DLR, investigación); Bio-Monitor: temperatura de piel | Termómetro axilar de la playera | VMA fila 307 · cat. 04 A1 (l. 24) y B.1 |
| Presión sistólica (`01:V1`) y diastólica (`X:PAD`), mmHg | ISS: registro ambulatorio de 24 h con equipo portátil; manguito oscilométrico ALSP (20–280 mmHg, ±3 mmHg o 2 %); BP/ECG; Bio-Monitor. Orion: puede anotarse a mano | Brazalete oscilométrico | VMA fila 2 · cat. 01 V1 (l. 31) · cat. 04 A5 (l. 28, fusionada) |
| Presión media (`X:PAM`), mmHg | Sin equipo ni fila propia: se obtiene de la sistólica y la diastólica | Calculada: (sis + 2·dia)/3 | cat. 01 V1 (l. 31) · VMA fila 7 (`01:V6` usa la PA media) |

El inventario del kit de la ISS procede del catálogo de hardware CHeCS de 2011, que el
propio cat. 04 califica de "inventario antiguo, parte ya sustituida".

---

## 2. Umbrales

| Variable | Ámbar | Rojo | Tipo | Fuente citada por el catálogo | De dónde sale |
|---|---|---|---|---|---|
| Frecuencia cardiaca | > 100 lpm en reposo | no encontrado | [T] | Rango 60–100 lpm (MedlinePlus); taquicardia sinusal inapropiada: reposo > 100 lpm y media de 24 h > 90 (consenso HRS 2015) | cat. 04 A4 (l. 27) · cat. 01 V3 (l. 33) |
| SpO2 | ≤ 92 % ("contactar") | ≤ 88 % ("atención inmediata") | [T], propuesta no oficial | MedlinePlus, pulsioximetría | cat. 04 A3 (l. 26) y C.5 · índice §2.2 |
| Frecuencia respiratoria | > 18 resp/min | no encontrado | [T] | Rango 12–18/min (MedlinePlus) | cat. 04 A2 (l. 25) |
| Temperatura | ≥ 39,4 °C sostenida | ≥ 40,6 °C | [T], propuesta no oficial | MedlinePlus, fiebre (valores orales) | cat. 04 A1 (l. 24) y C.5 |
| Presión sistólica | < 90 o ≥ 140 mmHg | < 70 **[A]** o > 180 mmHg | [T] | Categorías ACC/AHA (vía CDC); rango agudo 90/60–120/80 (MedlinePlus); < 70 = presíncope | cat. 01 V1 (l. 31) y V47 (l. 93) |
| Presión diastólica | < 60 o ≥ 90 mmHg | > 120 mmHg | [T] | Igual que la sistólica | cat. 01 V1 (l. 31) |
| Presión media | — | — | — | **Sin umbral en el catálogo** | — |

**Cómo se codificaron** (decisiones nuestras sobre números del catálogo; el detalle está en
el campo `nota` de cada variable):

1. Si el catálogo da un criterio de alerta explícito, se usa ese (SpO2, temperatura, presión).
2. Si solo da un rango de referencia, su borde se usa como ámbar **únicamente en la
   dirección que el catálogo asocia a algún padecimiento** (FC y FR altas).
3. **Bordes del catálogo que no se usan como alerta**, porque saltarían con valores
   normales de un adulto entrenado en reposo:
   - FC < 60 lpm. El mismo catálogo registra 53,3 ± 7,3 lpm en astronautas dormidos (cat. 03 V18).
   - FR < 12 resp/min. El catálogo dice que la FR baja en vuelo.
   - Temperatura < 36,5 °C, y "fiebre probable si oral > 37,2–37,5 °C": la temperatura
     central sube ~1 °C en vuelo, así que ese corte saltaría con valores normales.
   - Presión "elevada" (120–129) y estadio 1 (130–139 u 80–89).
4. **Matices que cambian la lectura:**
   - El < 70 mmHg [A] se definió para la prueba ortostática tras el aterrizaje, no para
     reposo en vuelo; aquí es un suelo de seguridad.
   - Los valores de temperatura son orales y la playera mide en la axila; el catálogo no
     da la equivalencia.
   - NASA fija el límite de oxígeno sobre el aire inspirado (PIO2 objetivo 145–155 mmHg,
     mínimo 127), no sobre la SpO2. El índice advierte que la SpO2 de reloj sobreestima
     en hipoxemia: no debe ser la única alerta.
   - En vuelo la presión baja (§3): el borde de 90/60 queda más cerca de lo normal.
5. **Valor exacto del límite.** Los criterios "≤" y "≥" del catálogo son inclusivos, pero el
   sistema compara con "menor/mayor que": una lectura igual al límite (SpO2 de 92 % u 88 %,
   sistólica de 140) no dispara por umbral.

---

## 3. Cambio esperado en microgravedad

| Variable | Qué dice el catálogo | n | Fuente | De dónde sale |
|---|---|---|---|---|
| Frecuencia cardiaca (reposo) | Sin cambio en vuelo; bradicardia relativa en vuelos largos frente a cortos. Dormidos: 53,3 ± 7,3 lpm antes del vuelo, sin cambio en vuelo | 8 astronautas + 8 cosmonautas; sueño: Xu 2013 | Norsk 2015; Baevsky 2007; Xu 2013 | cat. 01 V3 (l. 33) · cat. 03 V18 (l. 38) |
| SpO2 | **no encontrado** | — | — | cat. 04 A3 |
| Frecuencia respiratoria | Disminuye; **magnitud no encontrada** | 8 | Baevsky 2007; Bio-Monitor | cat. 04 A2 (l. 25) |
| Temperatura | La **central** en reposo sube ~1 °C de forma gradual en 2,5 meses | 11 (ISS) | Stahn 2017 | cat. 04 A1 (l. 24) · cat. 03 V47 (l. 90) |
| Presión sistólica | Media de 24 h: −8 ± 2 mmHg (días 85–192). Otro estudio: 120 ± 10 → 106 ± 9 mmHg | 8 | Norsk 2015 / Fu 2019 | cat. 01 V1 (l. 31) |
| Presión diastólica | Media de 24 h: −9 ± 2 mmHg | 8 | Norsk 2015 | cat. 01 V1 (l. 31) |
| Presión media | Media de 24 h: −10 ± 3 mmHg | 8 | Norsk 2015 | cat. 01 V1 (l. 31) |

- Todo son datos de la ISS (órbita baja) con 8–11 personas: orientan, no predicen a un individuo.
- El +1 °C es de temperatura **central** (sensor en la frente). No es intercambiable con una
  lectura axilar ni oral.
- El catálogo no dice si "±" es desviación o error estándar, ni asigna cada cifra de presión
  a un estudio; la atribución a Norsk 2015 es inferida (mismo n = 8 que la fila V2).

### Frente a los priores actuales de LUNNA (`semillas/inicial.json`, órbita)

| Variable | Prior actual | Catálogo | Resultado |
|---|---|---|---|
| Frecuencia cardiaca | 0 %, "sin cambio poblacional verificado" | "Sin cambio en vuelo" (n = 8 + 8) | Coincide el valor. El texto de la fuente se queda corto: el catálogo sí reporta el dato |
| SpO2 | 0 %, no informativo | no encontrado | Coherente |
| Frecuencia respiratoria | 0 % | Disminuye, sin magnitud | Sin número que usar; el prior centrado en 0 no refleja la dirección conocida |
| Temperatura | +1,0 °C | ~+1 °C central (n = 11) | Coincide, pero se aplica a un termómetro axilar (el propio prior lo anota) |
| Presión sistólica | −6,7 % (= −8/120) | −8 ± 2 mmHg | Mismo origen. El 120 del denominador es un supuesto; el segundo estudio (−14 mmHg) no se usa |
| Presión diastólica | −11,25 % (= −9/80) | −9 ± 2 mmHg | Mismo origen. El 80 es un supuesto |
| Presión media | −9,3 %, derivado de sistólica y diastólica | −10 ± 3 mmHg, dato directo | **Discrepancia:** el prior no usa el dato directo del catálogo |

Dispersión entre personas, entre misiones y de un día a otro (τ₀, σ): **no están en el
catálogo**; en `inicial.json` son supuestos y así están rotulados.

---

## 4. A qué padecimientos aporta cada variable

Cada celda: **peso · dirección · nivel de evidencia**. No es un diagnóstico: indica en qué
padecimientos pesa una desviación de esa variable.

| Padecimiento | FC | SpO2 | FR | Temperatura | Presión arterial |
|---|---|---|---|---|---|
| P01 Arritmia / fibrilación auricular | — | 1 ↓ C | — | — | 1 ↓ C |
| P02 Desacondicionamiento e intolerancia ortostática | — | — | — | — | 1 ↓ C |
| P03 Hipoxia / problema respiratorio | 2 ↑ B | **3 ↓ A** | **3 ↑ B** | — | 1 ↑/↓ C |
| P04 Infección, fiebre o desregulación inmune | 2 ↑ A | 1 ↓ B | 1 ↑ B | **3 ↑ B** | 1 ↓ B |
| P05 Pérdida de sueño y desalineación circadiana | 1 ↑ C | — | — | — | — |
| P06 Fatiga y deterioro cognitivo | 1 ↑ C | — | — | — | — |
| P07 Exposición a CO2 / cefalea | 1 ↑ C | — | 2 ↑ C | — | — |
| P08 Radiación aguda por evento solar | 1 ↑ C | — | — | 1 ↑ C | — |
| P09 Estrés / salud conductual | 1 ↑ C | — | 1 ↑ C | — | 1 ↑ C |
| P10 Enfermedad por descompresión tras EVA | 1 ↑ C | 1 ↓ C | 1 ↑ C | — | 1 ↓ C |
| **De dónde sale (PV, filas)** | 33, 41, 66, 97, 128, 142, 158, 187 | 3, 34, 42, 188 | 35, 43, 129, 159, 189 | 44, 143 | 4, 23, 36, 45, 160, 190 |

- **Peso:** 1 marcador asociado · 2 eslabón causal directo · 3 la variable es el mecanismo.
  **Evidencia:** A relación medida con número · B mecanismo documentado en una fuente ·
  C juicio fisiológico del equipo, sin fuente directa (leyenda en `Leo/modelo-pesos/README.md`).
- **17 de los 25 vínculos son nivel C.** Los A y B citan a Smith 2013 (escala NEWS),
  Mishra 2020 (infección detectada por reloj) y Call 2005 (fiebre en gripe, LR+ 1,8,
  rotulado "terrestre"). Ningún peso de esta tabla está validado en astronautas
  (`Leo/modelo-pesos/README.md`).
- La columna FC usa las filas de `01:V3` (FC en reposo): PV no tiene filas para `04:A4`.
- El catálogo trata sistólica y diastólica como una sola variable (`01:V1`) y no liga la
  presión media a ningún padecimiento.

---

## 5. Lo que el catálogo NO tiene

1. **Ningún umbral [A] de signos vitales en vuelo.** NASA-STD-3001 remite a "valores
   clínicamente aceptados" y a documentos de programa no públicos (cat. 04 C.5; índice §4).
2. Umbral rojo para FC y FR. Umbral de bradicardia, de frecuencia respiratoria baja y de
   hipotermia.
3. Umbral, padecimientos y fila propia para la presión arterial media.
4. Magnitud del descenso de la frecuencia respiratoria en vuelo. Cambio de la SpO2 en vuelo.
5. Equivalencia entre temperatura axilar, oral y central. Cuánto dura "sostenida" en el
   criterio de fiebre.
6. Si el "±" de la presión arterial es desviación o error estándar, y de qué estudio sale
   cada cifra.
7. Dispersión entre personas y variabilidad día a día de cualquiera de las siete.
8. Datos de tránsito, Luna o Marte: todo lo medido es de la ISS.
9. Exactitud del pulsioxímetro de vuelo. El resumen que respalda el aviso sobre la SpO2
   de reloj (`RESUMEN-MAESTRO.md`) no está en el repo.
10. Vínculo padecimiento–variable para la FC instantánea (`04:A4`).

**Avisos de fiabilidad que hereda este documento** (índice §5): muchos artículos se
leyeron solo como resumen por la API de PubMed o Europe PMC; el primer autor de la
referencia [63] del cat. 01 (criterio de FC > 100 lpm) se anotó de memoria, aunque la URL
se abrió; los umbrales de SpO2 son una propuesta clínica terrestre, no oficial.

---

## 6. Candidatas futuras medibles por sensor (no implementadas)

| Candidata (id) | Medida en vuelo | Sensor nuestro | Qué respalda el catálogo | Umbral | De dónde sale |
|---|---|---|---|---|---|
| Variabilidad de la FC: RMSSD, SDNN, LF/HF (`01:V43`, `03:V17`) | Sí: Holter durante el sueño (n = 7), Bio-Monitor | ECG de la playera (intervalos RR) | Reducida en vuelo durante el sueño (n = 7); otra fila dice bandas sin cambio (n = 8): **las dos entradas no coinciden** y el duplicado sigue abierto. Aporta a P09 (peso 2, C) | Sin corte; usar línea base propia. Normas terrestres: RMSSD 42 ± 15 ms, SDNN 50 ± 16 ms | VMA filas 44 y 235 · cat. 01 V43 (l. 80) · cat. 03 V17 (l. 37) · PV fila 178 · `Iker/iker_variables.csv` fila 14 |
| Ritmo irregular / fibrilación auricular (`01:V31`) | Sí: Holter de 48 h (n = 13, ningún caso) | ECG de la playera | Aporta a P01 con peso 3, evidencia A. Solo como bandera de ritmo irregular, no diagnóstico | Sin umbral numérico | VMA fila 32 · cat. 01 V31 (l. 68) · PV fila 2 · `iker_variables.csv` fila 2 |
| Intervalo QTc (`01:V34`) | Sí: Holter (n = 3) | ECG de la playera | QTc > 440 ms aparece en el primer mes de vuelo largo. Aporta a P01 (peso 2, B) | [T] 450/460 ms; riesgo ≥ 500. [A] > 440 ms en el estudio de astronautas | VMA fila 35 · cat. 01 V34 (l. 71) · PV fila 8 |
| Tiempo de tránsito de la onda de pulso (`01:V23`) | Sí: cosmonautas, 162–196 días | ECG de la playera + PPG del reloj | Disminuye en vuelo (n = 8); magnitud no encontrada | no encontrado | VMA fila 24 · cat. 01 V23 (l. 53) |
| Descenso nocturno de la presión (`01:V2`) | Sí: registro de 24 h | Brazalete en tomas programadas | Dip de 8 ± 3 mmHg, conservado en vuelo (n = 8) | no encontrado | VMA fila 3 · cat. 01 V2 (l. 32) |
| Prueba de bipedestación: caída de presión y subida de FC (`01:V47`, `01:V48`) | Solo antes y después del vuelo (necesita gravedad) | Brazalete + playera | Aporta a P02 (peso 3, A y peso 2, B). Aplicable al aterrizar o en superficie | [T] caída ≥ 20/10 mmHg; [T] ≥ 30 lpm; [A] sistólica < 70 = presíncope | VMA filas 48 y 49 · cat. 01 V47–V48 (l. 93–94) · PV filas 16 y 17 |
| Sueño por actigrafía (`03:V30`, `03:V31`) | Sí: Actiwatch | Acelerómetro del reloj | ISS: 6,09 h de media, 43,8 % de noches < 6 h (n = 21) | [T] 7–9 h; < 6 h se asocia a peor desempeño | VMA filas 248 y 249 · cat. 03 V30–V31 (l. 66–67) |

Límite conocido para las tres primeras: según `Leo/modelo-pesos/README.md`, el reloj del
equipo no envía intervalos RR; tendrían que salir del ECG de la playera.

<!-- FIN DOCUMENTO CONSOLIDADO: Sistema/backend/semillas/medibles.md -->

## Documento consolidado: `Sistema/interfaces/eva/README.md`

> Fuente original: `Sistema/interfaces/eva/README.md`

# Maqueta LUNNA con Lunna — experiencia de las métricas

## Modo operativo y modo simulación

Esta carpeta (`Sistema/interfaces/eva`) es la misma para los dos modos; lo que cambia es lo que dice el
backend en `config.js`, que `modo.js` lee antes que todo lo demás:

| Cómo se abre | Modo | Qué se ve |
|---|---|---|
| `cd Sistema/backend && npm start` → http://localhost:8787/app/ | **Operativo** | No se carga el escenario sintético (`datos.js`, `demo.js`). El teléfono, la base y el reloj todavía se dibujan con ese escenario, así que dicen «Modo operativo» en lugar de mostrarlo; la central muestra sólo sus bloques en vivo del backend |
| `cd Simulacion && npm start` → http://localhost:8787/app/ | **Simulación** | Todo, con el escenario que llega de `Simulacion/escenarios/interfaces/` por `/app/escenario/…` y el distintivo **«Simulación · datos sintéticos»** |
| Abrir `index.html`, `central.html` o `base.html` como archivo | Simulación | La maqueta, con el escenario leído de `../../../Simulacion/escenarios/interfaces/` |

Servida sin backend (por ejemplo con `python -m http.server`) no hay `config.js` y se queda en modo
operativo: nunca se asume simulación. Pendiente: `motor.js` todavía genera la tripulación y las series
del escenario por dentro; separarlo y pintar estas pantallas con datos en vivo es un cambio aparte.

## Estructura de la app (Katy, 14 nov 2026)

Sobre el Cuerpo LUNNA, el motor y la Lunna flotante de Diana. Solo celular. Diseño unificado de
**glassmorfismo** en versión **clara** y **azul marino** (Ajustes → Apariencia), con **barra de
navegación flotante** abajo.

| Pestaña | Qué tiene |
|---|---|
| **Inicio** | Cuerpo LUNNA, avisos (fatiga, nota de Tierra, evento solar), check-in, datos del cuerpo y tu tripulación (con privacidad por rol) |
| **Registrar** | Comida, glucosa, presión, temperatura, agua, masa, síntomas, sueño, ejercicio, fuerza, mente (estrés, PHQ-9, KSS, diario), tira de orina y foto por cámara |
| **Ciclo** | Solo para ellas, privado y al estilo Clue: anillo del ciclo, semana, registro por categorías y lo que cambia en el espacio |
| **Reportes** | Resumen de alertas y protocolos, signos y tendencias, reflejos (PVT-B), radiación, Tierra, evento solar, vista CMO y logros. Lo desglosado va en el panel de escritorio |
| **Ajustes** | Simulación (persona y día), privacidad, Lunna, tema, notificaciones, ayuda y qué es real o simulado |
| **Lunna (botón flotante)** | Todo lo de IA: lo que ve hoy, cómo te monitorea, clima espacial, qué procesa, biblioteca y hablar |

Archivos nuevos: `modulos.js` (pantallas y panel de Lunna) y `tema.css` (diseño). Abrir una vista
directo: `?pantalla=ciclo`, `?persona=MS-1`, `?dia=115`, `?tema=oscuro`. Demo: `?demo`.

Maqueta interactiva de cómo el astronauta vive sus métricas de salud en la app **LUNNA** (antes EVA),
acompañado de su asistente **Lunna**. **Todos los datos son simulados**: todavía no recibe datos reales
ni del reloj.

## Consolas de escritorio: computadora central y base en Tierra (Leo, 15 nov 2026)

Las tres pantallas de LUNNA son de la misma serie: usan los mismos estilos (`estilos.css`, `cuerpo.css`,
`tema.css`), los mismos iconos, el mismo **Cuerpo LUNNA**, el mismo motor (`motor.js`), la misma
tripulación (Ana, Luis, Mei, Tomás) y el mismo escenario (días 106–115). El tema y el día se comparten
entre las tres (claves `eva:tema` y `eva:dia`).

| Pantalla | Quién la usa | Qué tiene |
|---|---|---|
| `index.html` · **teléfono** | Cada astronauta | La app de siempre. Ahora también recibe, como notificación, lo que mandan la central y la base |
| `central.html` · **computadora central** | La CMO (Mei), a bordo | El diseño del panel médico de Fani en el estilo de LUNNA: **Hoy** (misión, Lunna, tripulación con su cuerpo, avisos, ambiente, clima espacial, historial de advertencias y emergencias), **panel clínico** de cada tripulante (signos contra su normal, Cuerpo LUNNA con sus zonas, sueño y reflejos, metas, dosis, lo que Lunna le dijo, índice por padecimiento, intervención médica), **Estadísticas** (estado por día, lo que más pidió atención, avisos por misión) y **Enlace con Tierra** (cola priorizada, lo recibido y consultas a la base) |
| `base.html` · **base en Tierra** | El cirujano de vuelo | Casi igual a la central, pero solo con lo que llegó (siempre el pasado, con su SCET y su antigüedad). **Pronósticos**: mapa tripulación × 11 padecimientos con el índice de los pesos de Leo, qué suma cada variable y su tendencia a 3 días. **Mensajes**: avisos y advertencias a la nave con su recorrido (redactado → en camino → a bordo → acuse) |

Abrir en modo simulación (`cd Simulacion && npm start`):

- Central: **http://localhost:8787/app/central.html** · panel de Ana: `central.html#tripulante/MS-2`
- Base: **http://localhost:8787/app/base.html** · pronósticos: `base.html#pronosticos`

**Enlace con Tierra.** Sin backend, la central y la base se hablan por este mismo navegador
(`localStorage`, clave `lunna:enlace`) con el retraso de la luz: el escenario usa 18 min por trayecto y
la demo los recorre en 18 s (se cambia en *Enlace con Tierra*). Lo que manda la base llega a la central
y, como notificación, al teléfono de quien lo recibe; los avisos de la CMO llegan al teléfono al
instante. Con el backend, la base además manda el aviso por `POST /api/tierra/avisos` y el teléfono lo
recibe por `/api/stream`, como en la consola `/tierra` de Julio.

**Privacidad**, la misma matriz del teléfono (ERS §6.5): la CMO ve la tendencia semanal del ánimo; Tierra,
su puntuación y los signos como resumen diario; el diario y el ciclo solo con permiso.

**Índice por padecimiento** (`../modelo-pesos`): índice = Σ peso × puntos / máximo, con puntos 0–3 por
|z| contra su normal en la dirección fisiológica. 🔶 Decisiones nuestras: presión, SpO₂ y CO₂ usan los
umbrales del teléfono (atención → 2, alerta → 3); lo que no se mide a diario (síntomas, pulso irregular,
ortostatismo, fase circadiana) queda fuera y se muestra la cobertura; si falta la variable de mayor peso,
el índice sale **incompleto**; la tendencia a 3 días es una extrapolación lineal **ilustrativa**. No es
una probabilidad ni un diagnóstico.

### La central conectada al backend de Julio (y al PC del simulador)

Con el backend corriendo, **el PC de `/simulador` abre esta pantalla** (`/app/central.html`, mismo
origen) en una ventana como la del smartphone y la de Tierra: *Frontend* es la central y *Backend*, la
terminal del PC de siempre. `central-vivo.js` lee lo que la computadora central sabe de verdad y lo pinta
en bloques marcados **«En vivo · backend»**:

| Dónde | Qué muestra | De dónde sale |
|---|---|---|
| **Hoy** | Tripulación registrada, último valor de cada variable contra lo esperado, estado y alertas de LUNNA | `GET /api/tripulantes`, `/api/app/:tripulante`, `/api/alertas` |
| **Panel clínico** | Las variables de esa persona (último, mediana 24 h, esperado y banda, z, estado y motivo, días de misión, dispositivo), sus alertas y los avisos de Tierra que le llegaron | `GET /api/app/:tripulante` |
| **Enlace con Tierra** | Ventana, retraso, lo que hay en cola o en vuelo y los avisos entregados a bordo | `GET /api/enlace`, `/api/tierra/pendientes`, `/api/avisos` |

Se actualiza sola con los eventos `muestra`, `alerta`, `aviso`, `enlace` y `rechazo` de `/api/stream`
(como mucho una recarga cada 2 s) y con un sondeo cada 10 s. Si el backend no responde, la barra dice
**«Sin conexión con el backend»**, cada bloque explica el error y la hora del último dato, y se reintenta
cada 5 s. No inventa rutas ni datos: lo que el backend aún no ofrece (Cuerpo LUNNA, 14 días contra su
normal, índices, ambiente, clima espacial, estadísticas y los mensajes de la CMO, que siguen viajando
por `localStorage`) queda bajo el rótulo **«Escenario simulado · no viene del backend»**.
Prueba: `cd Sistema/backend && npm test` (`test/central.test.ts`) y, para el PC del simulador,
`cd Simulacion && npm test`.

Archivos: `central-vivo.js` (datos en vivo del backend), `consola.css` y `consola.js` (piezas comunes), `central.js`, `base.js`, `iconos.js` (los
iconos del teléfono más los de las consolas) y `pesos.js` (lo genera `../modelo-pesos/generar_pesos.py`;
no se edita a mano). Las misiones de referencia de Estadísticas son las de Fani, con nombres ficticios.

## Nuevo en la pantalla Hoy: Cuerpo LUNNA y lo que Lunna ve

Integra en esta maqueta el panel de salud (módulo 1) que se hizo en `app/`.

| Qué | Dónde | Cómo funciona |
|---|---|---|
| **Cuerpo LUNNA**, lo primero de Hoy | `cuerpo.js`, `cuerpo.css` | Escáner azul marino estilo holograma médico: esqueleto tenue, **arterias con flujo**, **corazón anatómico** (aorta, vena cava, tronco pulmonar, coronarias) que late, pulmones con lóbulos, hígado, estómago, intestinos, riñones y vejiga. **Cambia según el sexo:** mujer (hombros más estrechos, cintura, cadera, pecho, pelo largo) u hombre (hombros y cuello más anchos, torso recto, pectorales, pelo corto) |
| Zonas que se tocan | `cuerpo.js` | Cabeza, ojos, corazón, pulmones, abdomen, riñones y vejiga, músculos, piel (sensor de muñeca) y halo de radiación. Cada zona lleva el peor estado de sus indicadores en su contorno y su marca: ● en tu normal · ■ atención · ▲ actúa ahora · ○ sin dato |
| **Zoom y panel tecnológico** | `app.js` → `abrirRegion` | Al tocar un órgano, la figura se acerca a él y la información sale de ese punto hasta cubrir la pantalla: visor del órgano, peligro del HRP, indicadores con semáforo, procedencia y gráfica de 14 días. Al cerrar, vuelve al cuerpo completo |
| Fila de zonas | `app.js` | La misma información sin la figura, navegable con teclado. "Salud femenina" solo aparece a ellas y con candado |
| **Lunna flotante** | `app.js` → `crearLunaFlotante` | Burbuja como AssistiveTouch: se arrastra, se pega al borde, se atenúa si no se usa y recuerda su lugar. Su cara y una insignia dicen cuántas cosas hay que mirar. Al tocarla abre **"Lo que Lunna ve hoy"**: qué señales, con qué números contra tu normal, qué regla se cumplió y qué hacer. No diagnostica |
| Letra | `estilos.css` | Sans técnica del sistema (Segoe UI Variable, SF Pro, Inter) y monoespaciada para los datos |
| Fichas | `app.js` → `ficha` | Presión, temperatura, ánimo, SpO₂ y respiración: valor, tu normal, gráfica, por qué, cómo se mide y umbral con su fuente. Corazón, Sueño y Glucosa ganan la tarjeta "contra tu normal" |
| Simulación | Hoy, arriba | Cambia de tripulante (Ana, Luis, Mei, Tomás) y de día (106–115) para recorrer el escenario |

### El escenario (ERS-LUNNA)

| Día | Qué pasa |
|---|---|
| 112 | **FATIGA-03 de Ana**: sueño z −2,4, lapsos del PVT-B z +2,0 y pulso en reposo z +2,2. Ninguna sola dispararía (todas bajo \|z\| 3); las tres juntas sí. Cabeza y corazón en ■ |
| 113 | "Vas mejorando": las señales bajan; el aviso sigue abierto |
| 114 | Dos días con z < 2: el aviso se cierra en ● verde |
| 115 | Evento de partículas solares, modelado sobre el evento real de DONKI 2024-05-11T02:10:00-SEP-001 (aviso 20 min después). ▲ rojo para todos |
| Siempre | Luis en ■ por presión 130–139 (umbral AHA [T]) |

Reglas del motor (`motor.js`): tu normal = 14 días anteriores (mínimo 7), z robusto, variación mínima
creíble por indicador; una señal sola pide atención con |z| ≥ 3; tu normal nunca da rojo por sí sola.

Pruebas: `node --test Sistema/interfaces/eva/motor.test.mjs`.

## Abrir

```bash
cd Simulacion
npm start
```

- App: **http://localhost:8787/app/**
- Demo automática (un día completo, ~3 min): **http://localhost:8787/app/?demo** (o *Ayuda → Ver demo automática*)
- Emergencia: botón rojo **SOS** arriba a la derecha, siempre visible.

Funciona sin internet: no usa librerías ni fuentes externas. En escritorio se ve dentro de un marco de
teléfono; en el móvil, a pantalla completa.

## Lunna

Asistente con **forma de luna**, sin manos ni pies. **Su fase refleja los signos vitales de la persona:**

| Fase | Halo | Significa |
|---|---|---|
| Lunna llena | Cian | Todo en su normal |
| Gibosa / cuarto | Ámbar | Algo se aleja de su normal (cada alerta la hace menguar) |
| Casi nueva | Rojo pulsante | Emergencia |

Encima se dibuja su carita (11 emociones) o un icono de estado (`radiacion`, `latido`, `escaneo`).

```js
const luna = LUNA.crear(elemento, { cara: "tranquila", accesorio: "corazon", tam: 88 }); // sigue la fase global
luna.poner("radiacion");
LUNA.ponerFase(0.4);               // todas las Lunas cambian de fase
LUNA.crear(otro, { fase: 0.05 });  // o una fase propia
```

## Modo emergencia (simulación)

Sigue el diseño de Julio (`../../Julio/comportamiento-del-software.md` §8):

- **Activación:** botón **SOS** siempre visible (un toque, sin confirmación) y **automática** cuando cae la SpO₂.
- **Escenario simulado:** hipoxia (riesgo que NASA rastrea). SpO₂ 97 → 84 %, pulso 62 → 128 lpm,
  respiración 14 → 26, presión 116/74 → 94/60. **La luna mengua hasta casi nueva** mientras caen los signos.
- Cada valor se muestra **contra su normal** ("pulso 2,1× su normal").
- Cronómetro **T+**, **aviso al médico de a bordo (Mei)**, paquete prioritario a Tierra y **registro automático sellado**.
- **Un paso por pantalla**, texto grande, sin menú. Los pasos están marcados **"Ilustrativo: no es
  protocolo médico"**: el contenido clínico real no se inventa.
- Al completar los pasos, los signos se recuperan y la luna vuelve a crecer.

## Secciones (variables de Leo)

| Sección | Variables | Qué se puede hacer |
|---|---|---|
| Hoy | resumen | Parche del equipo, mosaico con semáforo, aviso de **clima espacial** |
| Corazón | 02:V52, V53 | FC en vivo simulada, zonas, sesión de ejercicio |
| Sueño | 03:V30–V37, V43 | Horas, semana, deuda de sueño, "¿cómo despertaste?" |
| Comida | 02:V79–V85, V93 | Agregar comida con iconos, meta de 3035 kcal, sodio con zona meta |
| Glucosa | 02:V92, V86 | Curva de 24 h con rango 70–180, glucómetro de dedo |
| Síntomas | 02:V58, V67a · 03:V82–V83 | Dolor 0–10, cefalea, mareo; sugiere al médico si es fuerte |
| Fuerza | 02:V44, V43 | Fuerza estimada (Epley) contra la meta de NASA 1,6× el peso |
| Check-in · Logros · Ayuda | — | Check-in de 1 minuto, parches de misión, tutoriales |

## Sobre el logo de NASA

**No se usa.** NASA indica que su insignia, logotipo e identificadores *"are not in the public domain"*
y que su uso *"is protected by law"* ([nasa.gov/nasa-brand-center](https://www.nasa.gov/nasa-brand-center/images-and-media/)).
Ponerlo en la pantalla de una app sugiere que NASA la respalda. En su lugar hay un **parche original del
equipo** (luna + mariposa monarca) y el texto factual *"proyecto para NASA Space Apps Challenge 2026"*.

## Principios

- Tutoriales cortos (2–3 pasos) la primera vez que se abre cada sección; se repiten desde Ayuda.
- Etiquetas de umbral: **NASA** (oficial) o **Tierra** (clínico terrestre, no validado en el espacio).
- No diagnostica: si algo es fuerte, sugiere al médico de a bordo.
- Premia el hábito, no el resultado.
- Movimiento según las guías de Emil Kowalski (*ease-out* < 300 ms, botones que se encogen al presionar,
  sin `scale(0)`) y respeta *reduced motion*.

Paleta: `#B541FA` morado · `#4FD2E9` cian · blanco · `#192584` azul profundo · `#74706D` gris.

## Archivos

`index.html` · `estilos.css` · `luna.js` (avatar y fases) · `app.js` (pantallas, tutoriales, emergencia) ·
`modo.js` (operativo o simulación). El escenario está en `Simulacion/escenarios/interfaces/`: `datos.js`
(datos simulados con semilla fija) y `demo.js` (demo automática).

## Conectada al backend de EVA (notificaciones de Tierra)

Con el backend corriendo en modo simulación (`cd Simulacion && npm start`), la app se sirve en
**http://localhost:8787/app/** y también se abre al tocar el smartphone en el simulador
(`/simulador`, pestaña *Frontend*; *Backend* muestra la terminal del teléfono).

`notificaciones.js` escucha los avisos y las alertas que el cirujano de vuelo manda desde la
consola de Tierra (`/tierra`) y, cuando llegan a bordo, los muestra como notificación del
teléfono: arriba, sobre la app, con vibración si el equipo la tiene. Las alertas rojas se quedan
hasta descartarlas; las demás se van solas. Un toque abre el texto completo; el segundo, la
pantalla de Tierra.

- La ve la persona activa si el mensaje es para ella o para toda la tripulación; la CMO ve todos.
- Abierta como archivo, no hay backend y este archivo no hace nada.

### Con el backend de Julio (15 nov 2026)

Abiertas desde `http://localhost:8787/app/…`, las tres pantallas usan la central real además del escenario:

| Pantalla | Qué manda o recibe del backend |
|---|---|
| Teléfono (`telefono-vivo.js`) | Tarjeta **En vivo** en Hoy con sus signos reales (`GET /api/app/:tripulante`, se actualiza con `muestra` y `alerta`). El SOS o la emergencia automática se registran (`POST /api/emergencias`) y se cierran al salir (`PUT`). Los avisos de Tierra y de la CMO le llegan por `/api/stream` |
| Central | «Enviar a …» va por `POST /api/abordo/avisos` y «Consultar a Tierra» por `POST /api/central/consultas`. Las emergencias del teléfono salen en el historial con aviso flotante (evento `emergencia`) |
| Base en Tierra | La bandeja muestra lo que de verdad bajó por el enlace (`GET /api/tierra/bandeja` y evento `tierra`): alertas de LUNNA, consultas de la CMO, emergencias, el último resumen y las tramas crudas. Sus mensajes van por `POST /api/tierra/avisos` y marcan el **acuse** real cuando vuelve |

<!-- FIN DOCUMENTO CONSOLIDADO: Sistema/interfaces/eva/README.md -->

## Documento consolidado: `Sistema/interfaces/reloj/README.md`

> Fuente original: `Sistema/interfaces/reloj/README.md`

# Lunna en el reloj — interfaces

Maqueta de las pantallas del reloj de la tripulación, con el **diseño global de la maqueta de Leo**
(`Sistema/interfaces/eva`): mismas variables de color y vidrio (`estilos.css`, `tema.css`),
la misma **Lunna** (`luna.js`) y el mismo **motor** con la tripulación y el escenario (`motor.js`).
No copia esos archivos: los carga desde su carpeta, así que cualquier cambio de Leo se ve aquí.

**Los datos son simulados.** Abierto como archivo, todo sale del escenario de la maqueta; con el
backend, el pulso y la SpO₂ vienen del reloj del simulador (que también es sintético). Nada viene de
un reloj real.

## Abrir

Doble clic en `index.html` (no necesita servidor ni internet): se abre como maqueta, en modo
simulación. Debe seguir existiendo `../eva` (`Sistema/interfaces/eva`) en su lugar, porque de ahí toma
estilos, Lunna, motor y `modo.js`.

Con el backend en modo simulación (`cd Simulacion && npm start`):

- **http://localhost:8787/reloj** — la maqueta completa (lleva a `/interfaces/reloj/`).
- **En el simulador** (`/simulador`): al hacer clic en el **reloj** de la astronauta se abre esta
  pantalla en su ventana, igual que el smartphone, el PC y la Tierra. *Frontend* es el reloj (solo el
  reloj, `?embebido&persona=MS-2`, porque es el reloj de Ana) y *Backend*, la terminal del reloj.

En modo operativo (`cd Sistema/backend && npm start`), `/reloj` dice «Modo operativo» en lugar de
mostrar el escenario simulado, del que todavía depende.

### Enlazado al reloj de la simulación

Cuando lo sirve el backend, el reloj usa lo que de verdad llega a la computadora central:

| En el reloj | De dónde sale |
|---|---|
| Pulso y SpO₂ «ahora» (marca **EN VIVO** en la carátula) | Eventos `muestra` de `/api/stream` para esa persona (04:A4 y 04:A3). En el simulador los manda `reloj-ana` cada 5 s; la playera también manda pulso |
| Estado de Lunna | El peor entre el escenario del día y el estado que LUNNA da a sus variables en `GET /api/app/<tripulante>`, releído con cada evento `alerta`. Si lo pone la computadora central, la carátula dice qué variable fue |
| Apagado | Los comandos `apagar` y `encender` de la terminal del reloj en el simulador |

Si en 20 s no llega una lectura, o se pierde la conexión, vuelve al valor simulado y lo dice en la
pantalla de cada dato. Lo demás (temperatura, sueño, estrés, días 106–115) sigue siendo el escenario
simulado: el reloj del simulador no lo mide. Prueba: con *▶ En vivo*, escribe `hipoxia 12` en la
terminal del reloj y la SpO₂ baja en la carátula.

## La carita de Lunna según el estado de la persona

| Estado | Cara de Lunna | Cuándo (modo «Automático») |
|---|---|---|
| **Bien** | `feliz`, luna llena, halo cian | Todo en su normal |
| **Mal** | `preocupada`, luna a medias, halo ámbar | Algo se aleja de su normal (■ atención) |
| **Crítico** | `alerta`, casi luna nueva, halo rojo que late; la pantalla parpadea en rojo | ▲ actúa ahora (p. ej. el evento solar del día 115). Despierta a Lunna aunque sea de noche |
| **Dormido** | `dormida`: ojitos cerrados y «zzz»; la pantalla se atenúa | De 23:00 a 07:00, si no hay nada crítico |

En el panel de simulación se puede forzar cualquiera de los cuatro estados para mostrarlo.

## Pantallas (se deslizan; la corona vuelve a la carátula)

1. **Carátula**: hora, día de misión y Lunna grande con el estado de la persona (tocarla abre lo que Lunna ve).
2. **Ritmo cardiaco**: pulso en vivo (simulado) con latido y gráfica de 40 s; pulso en reposo del día
   contra su normal.
3. **Oxígeno (SpO₂)**: anillo de 80 a 100 %, umbrales del equipo y aviso de que la de muñeca puede
   sobreestimar.
4. **Temperatura**: de piel, 14 días contra la franja de su normal.
5. **Sueño**: horas de anoche, últimas 7 noches y su normal; marca si está durmiendo ahora.
6. **Estado de ánimo (estrés)**: **bajo, normal, intermedio o alto** en la escala del check-in
   (0–100: < 25 · 25–49 · 50–74 · ≥ 75; 🔶 decisión de esta maqueta) y, aparte, contra su normal.
7. **Más signos**: respiración, HRV, ejercicio (meta 90 min), agua (32 mL/kg), dosis de radiación de
   la misión y tasa en cabina.
8. **Lo que Lunna ve**: su resumen y lo que conviene hacer. Lunna avisa; no diagnostica.

Cada dato lleva la forma además del color: ● en su normal · ■ atención · ▲ actúa ahora · ○ sin dato.

## Simulación

Persona (Ana, Luis, Mei, Tomás), día 106–115 (112 fatiga de Ana · 114 cierre · 115 evento solar),
hora real o simulada y estado de Lunna. Persona y día se comparten con el teléfono y las consolas
(claves `eva:persona` y `eva:dia`) cuando se abren desde el mismo origen.

Debajo del reloj interactivo están **los cuatro estados** de la carátula y **todas las pantallas**
lado a lado, para revisarlas sin deslizar.

## Archivos

`index.html` · `reloj.css` (marco del reloj y pantallas) · `reloj.js` (estado, pantallas y navegación).

<!-- FIN DOCUMENTO CONSOLIDADO: Sistema/interfaces/reloj/README.md -->

## Documento consolidado: `Sistema/README.md`

> Fuente original: `Sistema/README.md`

# Sistema

El software de Lunna que correría en la nave y en Tierra. Arranca en **modo operativo**: no carga el
simulador ni el escenario sintético. Para la simulación, ver **`Simulacion/`**.

```bash
cd Sistema/backend
npm start          # http://localhost:8787 (modo operativo)
npm test
```

| Carpeta | Qué es |
|---|---|
| **`backend/`** | Computadora central: ingesta de tramas, LUNNA, enlace con Tierra (simulado y HTTPS), salud. Sirve las interfaces |
| **`interfaces/eva/`** | Celular (`/app/`), computadora central (`/app/central.html`) y base en Tierra (`/app/base.html`) |
| **`interfaces/reloj/`** | Reloj de la tripulación (`/reloj/`) |
| `pasarela/` | Pasarela Bluetooth hacia la central (`python test_trama.py` comprueba que produce los mismos bytes que el backend) |
| `esp32/` | Firmware de la playera y sus vectores de prueba (`test/generar_vectores.ts` los genera con el codificador del backend) |

En modo operativo:

- `/simulador`, `/app/escenario/…` responden 404 y `POST /api/demo/reiniciar`, 403.
- `/app/config.js` dice `"modo":"operativo"`; `interfaces/eva/modo.js` lo lee y no carga el escenario.
- El teléfono, la base y el reloj todavía se dibujan con el escenario simulado, así que dicen
  «Modo operativo» en lugar de mostrarlo. La central muestra sólo sus bloques en vivo del backend.
- `backend/semillas/inicial.json` (tripulación, esquemas, dispositivos y priores provisionales) es
  configuración que el backend necesita para arrancar. **La tripulación (Ana, Luis, Mei, Tomás) es
  ficticia** y los priores, provisionales; una misión real los cambiaría.

Pendiente: `interfaces/eva/motor.js` todavía genera dentro de sí la tripulación y las series del escenario;
separarlo y pintar el teléfono, la base y el reloj con datos en vivo es un cambio aparte.

Esto es un prototipo de hackatón: no está validado para uso médico ni espacial.

<!-- FIN DOCUMENTO CONSOLIDADO: Sistema/README.md -->
