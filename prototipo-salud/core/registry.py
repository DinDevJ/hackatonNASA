"""Registro de modelos: lee adapters/*/manifest.json y calcula el estado de cada uno.

Solo biblioteca estándar (se usa desde la app y la CLI). No importa torch.
"""
from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

from .runs import RAW_DIR, ROOT, read_json

ADAPTERS_DIR = ROOT / "adapters"
ESTADO_PENDIENTE = "pendiente de probar en PC"


def envs_dir() -> Path:
    """Carpeta de venvs: $PROTOTIPO_ENVS_DIR si existe la variable; si no, <ROOT>/envs."""
    v = os.environ.get("PROTOTIPO_ENVS_DIR")
    return Path(v) if v else ROOT / "envs"


def python_del_venv(key: str) -> Path:
    """Intérprete del venv del modelo: Scripts/python.exe (Windows) o bin/python (Linux/macOS)."""
    base = envs_dir() / key
    return base / "Scripts" / "python.exe" if os.name == "nt" else base / "bin" / "python"


def cargar_manifest(key: str) -> dict:
    """Lee adapters/<key>/manifest.json. Lanza FileNotFoundError/ValueError con mensaje claro."""
    p = ADAPTERS_DIR / key / "manifest.json"
    if not p.exists():
        raise FileNotFoundError(f"módulo {key} no disponible: falta adapters/{key}/manifest.json")
    try:
        m = read_json(p)
    except json.JSONDecodeError as e:
        raise ValueError(f"manifest de {key} inválido (JSON): {e}") from e
    if not isinstance(m, dict):
        raise ValueError(f"manifest de {key} inválido: se esperaba un objeto JSON")
    return m


def _peso_presente(p: dict) -> bool:
    dest = p.get("descomprimir_en")
    if dest:
        d = ROOT / dest
        return d.is_dir() and any(d.iterdir())
    a = p.get("archivo")
    return bool(a) and (ROOT / a).exists()


def runs_de_modelo(key: str) -> list[dict]:
    """Resúmenes de runs reales guardados para el modelo, del más reciente al más antiguo."""
    out = []
    if not RAW_DIR.is_dir():
        return out
    for d in sorted(RAW_DIR.glob(f"*_{key}_*"), reverse=True):
        f = d / "response.json"
        if not f.is_file():
            continue
        try:
            r = read_json(f)
        except Exception:
            continue
        out.append({"run_id": r.get("run_id") or d.name, "run_dir": d.relative_to(ROOT).as_posix(),
                    "status": r.get("status"), "inferencia_real": bool(r.get("inferencia_real")),
                    "random_load_test": bool(r.get("random_load_test")),
                    "finished_at": r.get("finished_at"), "elapsed_s": r.get("elapsed_s"),
                    "message": r.get("message")})
    return out


def _estado(key: str, m: dict) -> dict:
    py = python_del_venv(key)
    env_ok = py.exists()
    pesos = m.get("pesos") or []
    faltan = [p for p in pesos if not _peso_presente(p)]
    pesos_ok = not faltan
    no_publico = [p for p in pesos if (p.get("acceso") or "publico") != "publico"]
    acceso = ", ".join(sorted({p.get("acceso") or "publico" for p in pesos})) or "sin pesos externos"
    runs = runs_de_modelo(key)
    real_ok = next((r for r in runs if r["status"] == "ok" and r["inferencia_real"]
                    and not r["random_load_test"]), None)
    bloqueado_por = [p for p in faltan if (p.get("acceso") or "publico") != "publico"]
    if bloqueado_por:
        motivo = (bloqueado_por[0].get("pasos_manuales") or m.get("motivo_estado")
                  or f"acceso {bloqueado_por[0].get('acceso')}")
        estado = f"bloqueado: {motivo}"
    elif not env_ok:
        estado = f"falta entorno: ejecuta scripts\\instalar_modelo.ps1 -Modelo {key}"
    elif not pesos_ok:
        estado = f"faltan pesos: ejecuta scripts\\descargar_pesos.ps1 -Modelo {key}"
    elif real_ok is None:
        estado = ESTADO_PENDIENTE
    else:
        estado = "listo"
    return {"estado": estado, "entorno_instalado": env_ok, "python": str(py),
            "pesos_presentes": pesos_ok, "pesos_faltantes": [p.get("archivo") for p in faltan],
            "acceso": acceso, "acceso_no_publico": bool(no_publico),
            "ultimo_run": runs[0] if runs else None, "ultimo_run_real_ok": real_ok}


def listar_modelos() -> list[dict]:
    """Lista los modelos (uno por adapters/*/manifest.json) con su estado calculado.

    Cada elemento: {key, nombre, manifest (dict o None), manifest_error (str o None), estado,
    entorno_instalado, pesos_presentes, acceso, licencia, vram_gb, modalidades_admitidas,
    vistas_admitidas, ultimo_run, ...}. Un manifest roto no impide listar los demás.
    """
    res: list[dict] = []
    if not ADAPTERS_DIR.is_dir():
        return res
    for d in sorted(p for p in ADAPTERS_DIR.iterdir() if p.is_dir()):
        key = d.name
        if not (d / "manifest.json").exists():
            continue
        item: dict[str, Any] = {"key": key, "nombre": key, "manifest": None, "manifest_error": None}
        try:
            m = cargar_manifest(key)
            item["manifest"] = m
            item["nombre"] = m.get("nombre", key)
            item.update(_estado(key, m))
            item["licencia"] = m.get("licencia")
            vr = m.get("vram_estimada") or {}
            item["vram_gb"] = vr.get("gb") if isinstance(vr, dict) else vr
            item["cabe_en_6gb"] = vr.get("cabe_en_6gb") if isinstance(vr, dict) else None
            item["modalidades_admitidas"] = list(m.get("modalidades_admitidas") or [])
            item["vistas_admitidas"] = list(m.get("vistas_admitidas") or ["cualquiera"])
            item["adaptador_presente"] = (ROOT / (m.get("entrypoint") or f"adapters/{key}/infer.py")).exists()
            if not item["adaptador_presente"]:
                item["estado"] = "adaptador no disponible (falta infer.py); " + item["estado"]
            faltan = [k for k in ("modalidades_admitidas", "vistas_admitidas", "pesos", "licencia")
                      if k not in m]
            if faltan:
                item["manifest_error"] = f"manifest incompleto, faltan campos: {faltan}"
        except Exception as e:  # noqa: BLE001
            item["manifest_error"] = f"{type(e).__name__}: {e}"
            item["estado"] = f"error de manifest: {item['manifest_error']}"
            item.update({"entorno_instalado": python_del_venv(key).exists(), "pesos_presentes": False,
                         "acceso": "?", "licencia": None, "vram_gb": None, "modalidades_admitidas": [],
                         "vistas_admitidas": [], "ultimo_run": (runs_de_modelo(key) or [None])[0]})
        res.append(item)
    return res


def obtener(key: str) -> dict | None:
    return next((m for m in listar_modelos() if m["key"] == key), None)
