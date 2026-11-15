"""Utilidades compartidas por los adaptadores (cualquier venv) y por la app.

Solo usa la biblioteca estándar para que funcione en Python 3.11 (venvs de modelos)
y 3.13 (venv de la app). Todas las rutas que se guardan en JSON son RELATIVAS a la
raíz del proyecto (carpeta `prototipo/`), con separador '/', para que la carpeta se
pueda copiar entre Linux y Windows.
"""
from __future__ import annotations

import argparse
import datetime as _dt
import hashlib
import json
import os
import platform
import secrets
import sys
import time
import traceback
from pathlib import Path
from typing import Any, Callable

ROOT = Path(__file__).resolve().parents[1]
RAW_DIR = ROOT / "outputs" / "raw"

ESTADOS = ("ok", "error", "rechazado", "prueba_carga")
AVISO_PRUEBA_CARGA = (
    "PRUEBA DE CARGA con datos dummy/tensor aleatorio y SIN pesos preentrenados: "
    "NO se ha corrido inferencia real; la salida no significa nada clínicamente."
)


def now_iso() -> str:
    """Hora local con zona horaria, ISO-8601, precisión de segundos."""
    return _dt.datetime.now().astimezone().isoformat(timespec="seconds")


def rel(path: str | os.PathLike | None) -> str | None:
    """Ruta relativa a ROOT con '/' si está dentro del proyecto; si no, la ruta tal cual."""
    if path is None:
        return None
    p = Path(path)
    if not p.is_absolute():
        p = (ROOT / p)
    p = p.resolve()
    try:
        return p.relative_to(ROOT).as_posix()
    except ValueError:
        return str(p)


def resolve(path: str | os.PathLike) -> Path:
    """Inversa de rel(): rutas relativas se resuelven contra ROOT."""
    p = Path(path)
    return p if p.is_absolute() else (ROOT / p)


def sha256_file(path: str | os.PathLike, chunk: int = 1 << 20) -> str:
    h = hashlib.sha256()
    with open(resolve(path), "rb") as f:
        while True:
            b = f.read(chunk)
            if not b:
                break
            h.update(b)
    return h.hexdigest()


def sha256_path(path: str | os.PathLike) -> str:
    """sha256 de un archivo, o de una carpeta (hash de 'nombre:sha256' de sus archivos ordenados)."""
    p = resolve(path)
    if p.is_file():
        return sha256_file(p)
    h = hashlib.sha256()
    for f in sorted(x for x in p.rglob("*") if x.is_file()):
        h.update(f"{f.relative_to(p).as_posix()}:{sha256_file(f)}\n".encode())
    return h.hexdigest()


def new_run_id(model_key: str) -> str:
    ts = _dt.datetime.now().strftime("%Y%m%dT%H%M%S")
    return f"{ts}_{model_key}_{secrets.token_hex(4)}"


def read_json(path: str | os.PathLike) -> Any:
    with open(resolve(path), "r", encoding="utf-8") as f:
        return json.load(f)


def write_json(path: str | os.PathLike, data: Any) -> None:
    """Escritura atómica (tmp + replace) en UTF-8."""
    p = resolve(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    tmp = p.with_suffix(p.suffix + ".tmp")
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2, default=_json_default)
    os.replace(tmp, p)


def _json_default(o: Any) -> Any:
    # numpy / torch escalares y arrays sin depender de importarlos
    for attr in ("tolist", "item"):
        if hasattr(o, attr):
            try:
                return getattr(o, attr)()
            except Exception:  # pragma: no cover
                pass
    if isinstance(o, (Path,)):
        return o.as_posix()
    if isinstance(o, (set, tuple)):
        return list(o)
    return repr(o)


def _ejecutable() -> str:
    """Intérprete tal como se invocó (el python del venv), SIN resolver enlaces simbólicos: en Linux el python de un
    venv es un enlace al intérprete base y resolverlo registraría una ruta ajena al proyecto."""
    p = Path(os.path.abspath(sys.executable))
    try:
        return p.relative_to(ROOT).as_posix()
    except ValueError:
        return str(p)


def entorno_python() -> dict:
    """Información del intérprete y, si está instalado, de torch/CUDA (sin forzar la importación de CUDA)."""
    info = {"python": sys.version.split()[0], "executable": _ejecutable(),
            "platform": platform.platform()}
    try:
        import torch  # noqa: WPS433
        info["torch"] = torch.__version__
        info["torch_cuda_build"] = getattr(torch.version, "cuda", None)
        info["cuda_available"] = bool(torch.cuda.is_available())
        if info["cuda_available"]:
            info["gpu"] = torch.cuda.get_device_name(0)
            props = torch.cuda.get_device_properties(0)
            info["gpu_vram_total_mb"] = round(props.total_memory / 2**20)
    except Exception as e:  # torch no instalado en este venv
        info["torch"] = f"no disponible: {type(e).__name__}"
    return info


def elegir_device(preferencia: str = "auto") -> str:
    """'auto' -> 'cuda' si hay GPU, si no 'cpu'. 'cuda' sin GPU lanza error claro."""
    import torch
    if preferencia == "cpu":
        return "cpu"
    if torch.cuda.is_available():
        return "cuda"
    if preferencia == "cuda":
        raise RuntimeError("Se pidió device='cuda' pero torch.cuda.is_available() es False "
                           f"(torch {torch.__version__}, build CUDA {torch.version.cuda}). "
                           "Revisa que instalaste el wheel cu124 y el driver NVIDIA.")
    return "cpu"


def vram_pico_mb() -> float | None:
    try:
        import torch
        if torch.cuda.is_available():
            return round(torch.cuda.max_memory_allocated() / 2**20, 1)
    except Exception:
        pass
    return None


def nueva_respuesta(request: dict, model: str) -> dict:
    """Esqueleto de response.json según CONTRATO.md."""
    return {
        "status": "error",
        "message": "",
        "model": model,
        "run_id": request.get("run_id"),
        "run_dir": request.get("run_dir"),
        "subject_id": request.get("subject_id"),
        "study_id": request.get("study_id"),
        "timestamp": request.get("timestamp"),
        "simulated": bool(request.get("simulated", False)),
        "checkpoint": {"path": None, "url": None, "sha256": None},
        "device": None,
        "random_load_test": False,
        "inferencia_real": False,
        "config": {},
        "input": {"path": request.get("input_path"), "sha256": None, "modality": None},
        "raw_output": {},
        "normalized": [],
        "artifacts": [],
        "elapsed_s": None,
        "warnings": [],
        "errors": [],
        "entorno": {},
        "started_at": now_iso(),
        "finished_at": None,
    }


def ejecutar_adaptador(model: str, run: Callable[[dict, dict], None]) -> int:
    """Punto de entrada común de cada adapters/<modelo>/infer.py.

    Uso: python adapters/<modelo>/infer.py --request R.json --response S.json
    `run(request, response)` rellena `response` (status, raw_output, normalized, ...).
    Siempre se escribe response.json, también si hay excepción. Código de salida:
    0 ok/prueba_carga, 2 rechazado, 1 error.
    """
    ap = argparse.ArgumentParser(description=f"Adaptador {model} (entrada/salida JSON)")
    ap.add_argument("--request", required=True)
    ap.add_argument("--response", required=True)
    args = ap.parse_args()

    request = read_json(args.request)
    resp = nueva_respuesta(request, model)
    t0 = time.perf_counter()
    try:
        resp["entorno"] = entorno_python()
        inp = request.get("input_path")
        if inp and resolve(inp).exists():
            resp["input"]["sha256"] = sha256_path(inp)
        run(request, resp)
    except Exception as e:  # noqa: BLE001 - se registra todo
        resp["status"] = "error"
        resp["message"] = resp.get("message") or f"{type(e).__name__}: {e}"
        resp["errors"].append(traceback.format_exc())
    finally:
        resp["elapsed_s"] = round(time.perf_counter() - t0, 3)
        resp["finished_at"] = now_iso()
        if resp.get("random_load_test"):
            resp["inferencia_real"] = False
            resp["status"] = "prueba_carga" if resp["status"] in ("ok", "prueba_carga") else resp["status"]
            if AVISO_PRUEBA_CARGA not in resp["warnings"]:
                resp["warnings"].insert(0, AVISO_PRUEBA_CARGA)
            for row in resp.get("normalized", []):
                row["quality"] = "prueba_de_carga_tensor_aleatorio_NO_ES_RESULTADO"
        if resp["status"] not in ESTADOS:
            resp["errors"].append(f"estado desconocido {resp['status']!r}")
            resp["status"] = "error"
        write_json(args.response, resp)
    return {"ok": 0, "prueba_carga": 0, "rechazado": 2}.get(resp["status"], 1)


def rechazar(resp: dict, motivo: str) -> None:
    """Marca la respuesta como rechazada (modalidad/vista/entrada incompatible)."""
    resp["status"] = "rechazado"
    resp["message"] = motivo
    resp["normalized"] = []
    resp["inferencia_real"] = False
