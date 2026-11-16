# 09 · Instalación, configuración y despliegue

Todos los comandos de este documento son los que definen los `package.json`, los scripts `.ps1` y el código del repositorio. Se ejecutan desde la carpeta indicada. Los ejemplos usan PowerShell; en macOS o Linux se usa la misma sintaxis de `npm` y `node`.

## 1. Requisitos

### 1.1 Hardware

| Uso | Mínimo documentado |
|---|---|
| Backend, interfaces, simulación | Cualquier equipo con Node 22.6+ (sin GPU) |
| Motor de padecimientos, ECG | CPU; sin GPU ni pesos |
| Modelos de ecocardiografía | GPU NVIDIA con controlador compatible con CUDA 12.x (referencia: RTX 4050 Laptop 6 GB, controlador 621.14); unos 6,3 GB de pesos; **al menos 30 GB libres** para la instalación completa |
| Playera | ESP32 con BLE (firmware no probado en placa) |
| Pasarela | Equipo con Bluetooth LE |

### 1.2 Software

| Herramienta | Versión | Para |
|---|---|---|
| Node.js | **≥ 22.6** (usa `node:sqlite` y `--experimental-strip-types`) | Backend, simulación, pruebas |
| npm | La incluida con Node | Ejecutar los scripts (no hay `npm install`: cero dependencias) |
| Python | **3.13** para la app del prototipo (`envs\app`); **3.11** para los entornos de modelos (los crea `uv`) | Prototipo de salud |
| uv | Incluido en `requirements-app.txt` | Crear los entornos de modelos |
| PyTorch | 2.5.1 + torchvision 0.20.1, wheels cu124 | Modelos de eco |
| Python + `bleak>=0.22` | — | Pasarela BLE |
| openssl | Cualquiera en el `PATH` | Certificados del enlace HTTPS y sus 8 pruebas |
| Arduino IDE con núcleo ESP32 (BLE) | — | Firmware |
| g++ | — | Prueba `esp32/test/test_trama.cpp` |

Para comprobar Node:

```powershell
node --version
```

## 2. Instalación

```powershell
git clone https://github.com/DinDevJ/lunna.git
Set-Location lunna
```

El backend y la simulación **no requieren instalar dependencias**.

## 3. Ejecución de cada servicio

### 3.1 Demostración completa (modo simulación)

```powershell
Set-Location .\Simulacion
npm start                 # backend de Sistema/ en modo simulación → http://localhost:8787
```

En otra terminal, también dentro de `Simulacion`, se puede lanzar el generador de telemetría por terminal:

```powershell
npm run generador
```

La base es `Simulacion/eva-simulacion.db`, ignorada por git.

### 3.2 Modo operativo

```powershell
Set-Location .\Sistema\backend
npm start                 # http://localhost:8787 · sin simulador ni escenario
```

La base es `Sistema/backend/eva.db`. Los dos modos usan el **puerto 8787**: detén uno antes de arrancar el otro.

Otros scripts del backend:

```powershell
npm run migrar                          # crea o actualiza el esquema de la base (BD o eva.db)
npm run evaluar -- --simulado           # corre el motor de padecimientos sobre la base
npm run evaluar -- --origen-simulador   # base que viene del simulador: se guarda con canal SIMULADO
```

`npm run evaluar` necesita Python 3 con pandas. Usa `PYTHON` y `PROTOTIPO_DIR` si están definidas.

### 3.3 Enlace HTTPS nave ↔ Tierra

```powershell
Set-Location .\Sistema\backend
npm run certs             # certs/tierra.crt + tierra.key (autofirmado; --forzar regenera)
npm run tierra            # HTTPS :8443 (consola /tierra, /enlace/*)
npm run nave              # HTTP :8787 (UI, /nave) + cliente HTTPS hacia Tierra
```

`npm run tierra` y `npm run nave` se ejecutan en terminales separadas. Sin `BD`, cada rol usa su propia base: `eva-tierra.db` y `eva-nave.db`.

### 3.4 Pasarela BLE

```powershell
Set-Location .\Sistema\pasarela
python -m pip install -r requirements.txt
python pasarela_ble.py --backend http://localhost:8787            # busca dispositivos EVA
python pasarela_ble.py --prueba                                   # sin hardware: tramas simuladas
python pasarela_ble.py --asignar 401=ana                          # asigna un dispositivo a un tripulante
python test_trama.py                                              # mismos bytes que el backend
```

### 3.5 Firmware de la playera

Abre `Sistema/esp32/playera_eva/playera_eva.ino` en el entorno de Arduino para ESP32. `#define SIMULAR 1` envía lecturas simuladas; ponlo a `0` cuando haya sensores reales.

Para regenerar los vectores de prueba con el codificador del backend:

```powershell
node --experimental-strip-types Sistema/esp32/test/generar_vectores.ts
```

### 3.6 Prototipo de salud (Streamlit)

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass    # solo si PowerShell bloquea scripts
Set-Location .\prototipo-salud
.\scripts\instalar_app.ps1        # crea envs\app (Python 3.13) con requirements-app.txt
.\scripts\lanzar_app.ps1          # http://localhost:8501
.\scripts\verificar.ps1           # verificar.py + pytest
```

La primera instalación requiere internet. Para explorar las vistas no hacen falta pesos ni GPU.

**Instalar y ejecutar un modelo** (uno por uno; cada uno descarga varios GB):

```powershell
.\scripts\instalar_modelo.ps1 -Modelo panecho        # venv Python 3.11 + torch cu124 + lock
.\scripts\descargar_pesos.ps1 -Modelo panecho        # -SoloMostrar para ver sin descargar
.\scripts\preparar_muestras.ps1                      # verifica sha256 de samples\
.\scripts\inferir.ps1 ...                            # ver ayuda del script; ECG CSV requiere -Fs
.\scripts\reparar_torch.ps1 -Modelo <modelo|todos>   # si torch.cuda.is_available() = False
```

Modelos disponibles: `panecho`, `echonet_dynamic`, `medsam2`, `echoprime`, `echoclip` y `ecg`. El de ECG no usa torch ni pesos.

Por línea de comandos, desde `envs\app`:

```powershell
python -m core.run_model --model panecho --input samples\echonet_dynamic_Example1.mp4 --subject S1
```

**Motor de padecimientos sobre la base de EVA** (opcional):

```powershell
Set-Location .\prototipo-salud
$env:EVA_DB = "..\Sistema\backend\eva.db"
.\envs\app\Scripts\python.exe -m motor.evadb --evaluar               # canal real
.\envs\app\Scripts\python.exe -m motor.evadb --evaluar --simulado
.\envs\app\Scripts\python.exe -m motor.evadb --evaluar --origen-simulador
```

**Regenerar datos derivados:**

```powershell
python -m motor.simulador                               # tripulación SIMULADA (datos/simulado/)
python sensores/generar_sintetico.py                    # ejemplos de sensores
python Planeacion/Leo/modelo-pesos/generar_pesos.py     # pesos.csv, pesos.json y Sistema/interfaces/eva/pesos.js
python Simulacion/donki/fetch_donki.py                  # eventos DONKI (requiere NASA_API_KEY en .env de la raíz)
```

## 4. Configuración

### 4.1 Variables de entorno del backend

| Variable | Defecto | Uso |
|---|---|---|
| `PUERTO` | 8787 (8443 en el rol Tierra) | Puerto HTTP. `0` = efímero |
| `BD` | `eva.db` (operativo) · `Simulacion/eva-simulacion.db` · `eva-nave.db` / `eva-tierra.db` (roles) | Ruta de la base SQLite |
| `MEDIBLES` | `Sistema/backend/semillas/medibles.json` | Referencias clínicas |
| `APP_MOVIL` | `Sistema/interfaces/eva` | Carpeta servida en `/app/` |
| `MODELO_SALUD` | `prototipo-salud/datos/modelo` | CSV de padecimientos que se siembran |
| `ROL` | — | `nave` o `tierra`, alternativa al argumento de `rol.ts` |
| `TIERRA_URL` | `https://localhost:8443` | Destino del enlace (rol nave) |
| `TIERRA_CA`, `TLS_CERT`, `TLS_KEY` | `certs/tierra.crt` y `certs/tierra.key` | Certificados |
| `PING_S` | 60 (se recomienda 15) | Latido del enlace |
| `TIMEOUT_S` | 5 | Tiempo máximo por petición |
| `SIMULAR_OWLT` | — | `1` suma el retardo modelado (`owlt_s`) antes y después de cada petición HTTPS. El backend de la demo usa 20 s por defecto; el escenario de la maqueta es de 18 min por trayecto |
| `PROTOTIPO_DIR` (o `PROTOTIPO_SALUD`) | `prototipo-salud/` del repositorio | Carpeta del prototipo para el motor y los modelos |
| `PYTHON` | `python` en Windows, `python3` en el resto | Python de la app y del motor (p. ej. `prototipo-salud\envs\app\Scripts\python.exe`) |
| `ENVS_DIR` (o `PROTOTIPO_ENVS_DIR`) | `<PROTOTIPO_DIR>/envs` | Entornos de los modelos |
| `MUESTRAS_DIR` | `<PROTOTIPO_DIR>/samples` | Muestras que ofrece la central |
| `MODELO_TIMEOUT_S` | `timeout_s` del manifest; si falta, 1800 s | Tiempo máximo de un modelo |
| `MODELO_MARGEN_S` | 60 | Margen tras el cual la nave termina el árbol de procesos (`taskkill /T /F` en Windows) |

### 4.2 Argumentos del servidor

```text
node --experimental-strip-types src/servidor.ts [--modo operativo|simulacion] [--simulacion <carpeta Simulacion/>]
```

`Simulacion/package.json` lo invoca como `../Sistema/backend/src/servidor.ts --modo simulacion --simulacion .`.

### 4.3 Variables del prototipo de salud

| Variable | Uso |
|---|---|
| `EVA_DB` | Ruta a `eva.db` para el puente del motor. Si no existe, el motor usa `datos/modelo/overrides.json` |
| `PROTOTIPO_ENVS_DIR` | Carpeta alternativa de los entornos de modelos (en Linux, por ejemplo `/tmp/nasa-linux-envs`) |
| `NASA_API_KEY` | Clave de `api.nasa.gov`, en el `.env` de la raíz, para `fetch_donki.py` |

**Ejemplo: análisis con modelos desde la central** (PC con GPU, PowerShell):

```powershell
$env:PROTOTIPO_DIR = "C:\ruta\a\hackatonNASA\prototipo-salud"
$env:PYTHON        = "$env:PROTOTIPO_DIR\envs\app\Scripts\python.exe"
$env:ENVS_DIR      = "$env:PROTOTIPO_DIR\envs"
Set-Location C:\ruta\a\hackatonNASA\Sistema\backend
npm run certs        # solo la primera vez
npm run nave         # http://localhost:8787/app/central.html#semaforo → «Analizar con modelos»
```

Por API:

```powershell
$b = @{ tripulante = "ana"; modelo = "ecg"; archivo = "ecg_fa_afdb04015.hea"; simulado = $true } | ConvertTo-Json
$t = Invoke-RestMethod -Method Post -Uri http://localhost:8787/api/modelos/analizar -ContentType "application/json" -Body $b
Invoke-RestMethod http://localhost:8787/api/modelos/trabajos/$($t.id)   # repetir hasta estado ok o error
```

### 4.4 Archivos de configuración

| Archivo | Contenido |
|---|---|
| `Sistema/backend/semillas/inicial.json` | Tripulación ficticia, variables, esquemas, dispositivos y priores de órbita (se cargan de forma idempotente al arrancar) |
| `Sistema/backend/semillas/medibles.json` | Referencias y umbrales clínicos |
| `prototipo-salud/datos/modelo/*.csv` | Tablas con fuente del motor; **no se editan** |
| `prototipo-salud/datos/modelo/overrides.json` | Cambios del usuario; no existe hasta la primera edición |
| `prototipo-salud/.streamlit/config.toml` | Tema de la app |
| `adapters/<modelo>/manifest.json` | Repositorio, pesos, modalidades, opciones, licencia y `timeout_s` de cada modelo |
| `prototipo-salud/requirements-app.in` y `requirements-app.txt` | Dependencias de la app (streamlit, pandas, numpy, opencv-python-headless, pydicom, pytest, uv) |

## 5. Puertos

| Puerto | Servicio |
|---|---|
| 8787 | Backend (cualquier modo) y nave del enlace HTTPS |
| 8443 | Tierra del enlace HTTPS |
| 8501 | App Streamlit del prototipo de salud |

## 6. Despliegue

El proyecto está pensado para **ejecución local**. No existe configuración de contenedores, de servicio del sistema ni de nube en el repositorio. Tampoco está preparado para exponerse como servicio público: CORS está abierto, no hay autenticación y el certificado es de desarrollo (ver [seguridad](README_10_SEGURIDAD_CONFIABILIDAD_RIESGOS.md)).

Recomendaciones para una instalación de demostración:

- Ejecutar en una red local de confianza.
- Respaldar `eva.db` con el backend **detenido** (WAL: copiar también `-wal` y `-shm`, o detener primero).
- No versionar bases, `certs/`, pesos ni `.env`.

## 7. Verificación de funcionamiento

```powershell
Invoke-RestMethod http://localhost:8787/api/salud    # ok, version 0.7.0, modo, entorno
```

| Comprobación | Esperado |
|---|---|
| `http://localhost:8787/` | Página de estado que se refresca; dice MODO SIMULACIÓN o modo operativo |
| `/api/salud` | `"modo": "simulacion"` u `"operativo"` |
| `/app/config.js` | `window.EVA_CONFIG = {"modo":…}` |
| `/simulador` | 200 en simulación; 404 en operativo |
| `cd Sistema/backend` y `npm test` | 97 pruebas; 85 aprobadas y 12 omitidas si faltan openssl y los entornos Python de prueba |
| `cd Simulacion` y `npm test` | 4 aprobadas |
| `node --test Sistema/interfaces/eva/motor.test.mjs Sistema/interfaces/eva/alertas-motor.test.mjs` | 25 aprobadas |
| `.\scripts\verificar.ps1` en `prototipo-salud` | `verificar.py` + pytest |

## 8. Solución de errores frecuentes

| Síntoma | Causa | Solución |
|---|---|---|
| `npm error enoent … package.json` | `npm start` ejecutado en `Sistema/` o en la raíz | Usar `Simulacion/` o `Sistema/backend/` |
| `✗ El puerto 8787 ya está en uso` | Otro backend corriendo | Cerrarlo (Ctrl+C) |
| `✗ el modo simulación necesita --simulacion <carpeta>` | `--modo simulacion` sin la carpeta | Arrancar con `cd Simulacion` y `npm start` |
| Las interfaces dicen «Modo operativo» | El backend corre desde `Sistema/backend` | Arrancar desde `Simulacion/` |
| La pasarela dice «El backend … es una versión VIEJA» | Hay otro backend antiguo en el puerto | Detenerlo y volver a arrancar |
| `torch.cuda.is_available() = False` tras instalar un modelo | uv resolvió torch CPU | `.\scripts\reparar_torch.ps1 -Modelo <modelo>` |
| EchoNet-Dynamic: `UnpicklingError` | Pesos con escalares numpy | Ya está corregido en `infer.py` |
| pytest: `No module named 'streamlit'` o `'cv2'` | Se usó el Python del sistema | Usar `envs\app` (lo crea `instalar_app.ps1`) |
| `POST /api/padecimientos/evaluar` responde 503 | No se encuentra Python o pandas | Definir `PYTHON` con el Python de `envs\app` |
| `POST /api/padecimientos/evaluar` responde 409 | Base en memoria o evaluación en curso | Usar una base en archivo y esperar a que termine |
| PowerShell bloquea los `.ps1` | Política de ejecución | `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` |
| Las 8 pruebas HTTPS se omiten | Falta openssl | Instalar openssl y agregarlo al `PATH` |

## Documentación relacionada

- [Manual de usuario](README_03_MANUAL_USUARIO.md)
- [Arquitectura del sistema](README_04_ARQUITECTURA_SISTEMA.md)
- [Integración e interoperabilidad](README_05_INTEGRACION_INTEROPERABILIDAD.md)
- [Pruebas y validación](README_08_PRUEBAS_VALIDACION.md)
