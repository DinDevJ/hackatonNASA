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
