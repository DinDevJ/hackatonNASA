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

Abrir la central: <http://localhost:8787/app/central.html#semaforo> → tarjeta **Analizar con modelos**.

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
