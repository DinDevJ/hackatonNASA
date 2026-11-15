"""Runner por subprocess (venv de la app). Ver CONTRATO.md.

API:  ejecutar(key, inputs, subject_id, ...) -> dict (response.json)
CLI:  python -m core.run_model --model panecho --input samples/x.avi --subject S1 ...
Códigos de salida: 0 ok/prueba_carga, 2 rechazado, 1 error.
"""
from __future__ import annotations

import argparse
import csv
import json
import os
import shutil
import subprocess
import sys
import time
import traceback
from pathlib import Path

from . import modalidad, registry
from .formato import COLUMNS, append_normalized, validar_fila
from .runs import (RAW_DIR, ROOT, nueva_respuesta, new_run_id, now_iso, rechazar, rel, resolve,
                   sha256_path, write_json)

VISTAS_SIN_DATO = {"", "desconocida"}


def _copiar_entradas(inputs: list[Path], dest: Path) -> Path:
    """Copia entradas a dest (input/). Un archivo -> input/<archivo>; varios -> input/ como carpeta de estudio.
    Un archivo de registro WFDB (.hea/.dat/.atr/.qrs) arrastra a sus compañeros del mismo nombre y la entrada pasa a
    ser la carpeta input/ completa (así el sha256 cubre cabecera, señal y anotaciones)."""
    dest.mkdir(parents=True, exist_ok=True)
    if len(inputs) == 1 and inputs[0].is_file() and inputs[0].suffix.lower() in modalidad.EXT_WFDB:
        src = inputs[0]
        hermanos = sorted(x for x in src.parent.glob(src.stem + ".*")
                          if x.is_file() and x.suffix.lower() in modalidad.EXT_WFDB)
        if src.with_suffix(".hea").is_file():
            for h in hermanos:
                shutil.copy2(h, dest / h.name)
            return dest
    if len(inputs) == 1:
        src = inputs[0]
        if src.is_dir():
            tgt = dest / src.name
            shutil.copytree(src, tgt)
            return tgt
        tgt = dest / src.name
        shutil.copy2(src, tgt)
        return tgt
    usados: set[str] = set()
    for src in inputs:
        nombre = src.name
        n = 1
        while nombre in usados:
            n += 1
            nombre = f"{src.stem}_{n}{src.suffix}"
        usados.add(nombre)
        if src.is_dir():
            shutil.copytree(src, dest / nombre)
        else:
            shutil.copy2(src, dest / nombre)
    return dest


def _escribir_normalized_run(path: Path, rows: list[dict]) -> None:
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=COLUMNS, extrasaction="ignore")
        w.writeheader()
        for r in rows:
            w.writerow({k: ("" if r.get(k) is None else r.get(k)) for k in COLUMNS})


def _cola(path: Path, n: int = 40) -> str:
    try:
        lineas = path.read_text(encoding="utf-8", errors="replace").splitlines()
    except OSError:
        return ""
    return "\n".join(lineas[-n:])


def ejecutar(key: str, inputs, subject_id: str, study_id: str | None = None,
             timestamp: str | None = None, declared_modality: str = "video_2d",
             declared_view: str = "desconocida", options: dict | None = None,
             simulated: bool = False, timeout_s: int | None = None,
             raw_dir: str | os.PathLike | None = None,
             normalized_csv: str | os.PathLike | None = None) -> dict:
    """Ejecuta un modelo sobre una o varias entradas y devuelve el response (también guardado en
    outputs/raw/<run_id>/response.json). Rechaza SIN lanzar subprocess si modalidad/vista no encajan.

    `raw_dir` y `normalized_csv` (opcionales, dentro del proyecto) redirigen la carpeta de runs y el CSV común;
    se usan para validaciones y pruebas que no deben mezclarse con outputs/."""
    if isinstance(inputs, (str, os.PathLike)):
        inputs = [inputs]
    inputs = [Path(i) for i in inputs]
    options = dict(options or {})
    options.setdefault("device", "auto")
    run_id = new_run_id(key)
    run_dir = (resolve(raw_dir) if raw_dir else RAW_DIR) / run_id
    run_dir.mkdir(parents=True, exist_ok=True)
    t0 = time.perf_counter()

    request = {"run_id": run_id, "run_dir": rel(run_dir), "input_path": None, "subject_id": subject_id,
               "study_id": study_id, "timestamp": timestamp, "simulated": bool(simulated),
               "declared_modality": declared_modality, "declared_view": declared_view,
               "options": options, "inputs_originales": [i.name for i in inputs]}
    resp = nueva_respuesta(request, key)
    resp["config"] = {"declared_modality": declared_modality, "declared_view": declared_view,
                      "options": options}

    def terminar(status_msg: str | None = None, status: str | None = None) -> dict:
        if status:
            resp["status"] = status
        if status_msg:
            resp["message"] = status_msg
        resp["elapsed_s"] = resp.get("elapsed_s") or round(time.perf_counter() - t0, 3)
        resp["finished_at"] = resp.get("finished_at") or now_iso()
        write_json(run_dir / "response.json", resp)
        _escribir_normalized_run(run_dir / "normalized_run.csv", resp.get("normalized") or [])
        return resp

    # --- manifest
    try:
        manifest = registry.cargar_manifest(key)
        write_json(run_dir / "manifest_snapshot.json", manifest)
    except Exception as e:  # noqa: BLE001
        write_json(run_dir / "request.json", request)
        resp["errors"].append(f"{type(e).__name__}: {e}")
        return terminar(str(e)[0].upper() + str(e)[1:], "error")

    # --- entradas
    try:
        faltan = [str(i) for i in inputs if not i.exists()]
        if not inputs or faltan:
            raise FileNotFoundError(f"entrada(s) inexistente(s): {faltan or 'ninguna entrada'}")
        input_path = _copiar_entradas(inputs, run_dir / "input")
        request["input_path"] = rel(input_path)
        resp["input"]["path"] = request["input_path"]
        resp["input"]["sha256"] = sha256_path(input_path)
    except Exception as e:  # noqa: BLE001
        write_json(run_dir / "request.json", request)
        resp["errors"].append(f"{type(e).__name__}: {e}")
        return terminar(f"No se pudo preparar la entrada: {e}", "error")
    write_json(run_dir / "request.json", request)

    # --- pre-validación (modalidad y vista) SIN lanzar nada
    admitidas = manifest.get("modalidades_admitidas") or []
    nombre = manifest.get("nombre", key)
    try:
        val = modalidad.validar(input_path, declared_modality, admitidas, nombre,
                                permitir_color=bool(options.get("permitir_color")))
    except Exception as e:  # noqa: BLE001
        resp["errors"].append(traceback.format_exc())
        return terminar(f"No se pudo validar la modalidad: {type(e).__name__}: {e}", "error")
    resp["input"]["modality"] = val.get("modality")
    resp["warnings"].extend(val.get("warnings") or [])
    resp["input"]["meta"] = val.get("meta")
    if not val["ok"]:
        rechazar(resp, val["motivo"])
        return terminar()
    vistas = [str(v) for v in (manifest.get("vistas_admitidas") or ["cualquiera"])]
    if not any(v.lower() == "cualquiera" for v in vistas):
        dv = (declared_view or "").strip()
        if dv.lower() in VISTAS_SIN_DATO:
            rechazar(resp, f"Análisis no implementado: {nombre} solo admite las vistas {', '.join(vistas)} y no se "
                           f"declaró ninguna. No se adivina la vista; decláralo explícitamente.")
            return terminar()
        if dv.lower() not in {v.lower() for v in vistas}:
            rechazar(resp, f"Análisis no implementado: {nombre} no admite la vista '{dv}' "
                           f"(admite: {', '.join(vistas)}).")
            return terminar()

    # --- entorno
    py = registry.python_del_venv(key)
    entry = resolve(manifest.get("entrypoint") or f"adapters/{key}/infer.py")
    if not py.exists():
        resp["errors"].append(f"no existe {py}")
        return terminar(f"El entorno de {key} no está instalado: ejecuta scripts\\instalar_modelo.ps1 "
                        f"-Modelo {key}", "error")
    if not entry.exists():
        return terminar(f"Módulo {key} no disponible: falta {rel(entry)}", "error")

    # --- subprocess
    timeout = timeout_s or manifest.get("timeout_s") or 1800
    cmd = [str(py), rel(entry), "--request", rel(run_dir / "request.json"),
           "--response", rel(run_dir / "response.json")]
    env = dict(os.environ, PYTHONUTF8="1", PYTHONIOENCODING="utf-8")
    ts0 = time.perf_counter()
    rc: int | None = None
    timed_out = False
    with open(run_dir / "stdout.log", "w", encoding="utf-8") as so, \
            open(run_dir / "stderr.log", "w", encoding="utf-8") as se:
        try:
            p = subprocess.run(cmd, cwd=str(ROOT), env=env, stdout=so, stderr=se, timeout=timeout)
            rc = p.returncode
        except subprocess.TimeoutExpired:
            timed_out = True
        except OSError as e:
            se.write(f"No se pudo lanzar el subproceso: {e}\n")
    wall = round(time.perf_counter() - ts0, 3)

    rf = run_dir / "response.json"
    adapt = None
    if rf.exists():
        try:
            adapt = json.loads(rf.read_text(encoding="utf-8"))
        except Exception as e:  # noqa: BLE001
            resp["errors"].append(f"response.json ilegible: {e}")
    if adapt is None or timed_out:
        cola = _cola(run_dir / "stderr.log")
        resp["errors"].append(cola or "(stderr vacío)")
        msg = (f"Tiempo agotado ({timeout} s) ejecutando {key}." if timed_out else
               f"El adaptador terminó (código {rc}) sin escribir response.json válido. Últimas líneas de stderr:\n{cola}")
        resp["elapsed_s"] = wall
        resp["runner"] = {"cmd": cmd, "returncode": rc, "timeout": timed_out, "wall_s": wall}
        return terminar(msg, "error")
    resp = adapt
    resp.setdefault("normalized", [])
    resp["runner"] = {"cmd": cmd, "returncode": rc, "timeout": False, "wall_s": wall}
    if resp.get("status") == "error" and not resp.get("message"):
        resp["message"] = _cola(run_dir / "stderr.log", 10)

    rows = resp.get("normalized") or []
    ok_rows = resp.get("status") == "ok" and not resp.get("random_load_test")
    if ok_rows:
        malas = [(r.get("metric"), validar_fila(r)) for r in rows if validar_fila(r)
                 or r.get("run_id") != run_id]
        if malas:
            resp["status"] = "error"
            resp["errors"].append(f"filas normalizadas inválidas o de otro run, no se añadieron a normalized.csv: {malas}")
            resp["message"] = "Filas normalizadas inválidas (ver errors)."
    write_json(rf, resp)
    _escribir_normalized_run(run_dir / "normalized_run.csv", resp.get("normalized") or [])
    if resp.get("status") == "ok" and not resp.get("random_load_test"):
        try:
            if normalized_csv:
                append_normalized(resp.get("normalized") or [], resolve(normalized_csv))
            else:
                append_normalized(resp.get("normalized") or [])
        except Exception as e:  # noqa: BLE001
            resp["status"] = "error"
            resp["errors"].append(f"no se pudo añadir a normalized.csv: {e}")
            resp["message"] = f"Error al guardar normalized.csv: {e}"
            write_json(rf, resp)
    return resp


def _main(argv=None) -> int:
    ap = argparse.ArgumentParser(prog="python -m core.run_model", description="Ejecuta un modelo (subprocess).")
    ap.add_argument("--model", required=True)
    ap.add_argument("--input", action="append", required=True, help="archivo/carpeta; repetible (estudio)")
    ap.add_argument("--subject", required=True)
    ap.add_argument("--study", default=None)
    ap.add_argument("--timestamp", default=None)
    ap.add_argument("--modality", default="video_2d")
    ap.add_argument("--view", default="desconocida")
    ap.add_argument("--options", default=None, help="JSON, p. ej. '{\"device\":\"auto\"}'")
    ap.add_argument("--simulated", action="store_true")
    ap.add_argument("--timeout", type=int, default=None)
    ap.add_argument("--prueba-carga", action="store_true", help="dummy: NO es inferencia real")
    ap.add_argument("--raw-dir", default=None, help="carpeta de runs alternativa (validaciones/pruebas)")
    ap.add_argument("--normalized-csv", default=None, help="CSV común alternativo (validaciones/pruebas)")
    a = ap.parse_args(argv)
    try:
        opts = json.loads(a.options) if a.options else {}
        if not isinstance(opts, dict):
            raise ValueError("--options debe ser un objeto JSON")
    except ValueError as e:
        print(f"--options inválido: {e}", file=sys.stderr)
        return 1
    if a.prueba_carga:
        opts["prueba_carga_dummy"] = True
    r = ejecutar(a.model, [resolve(i) for i in a.input], a.subject, a.study, a.timestamp, a.modality,
                 a.view, opts, a.simulated, a.timeout, a.raw_dir, a.normalized_csv)
    print(f"status:   {r.get('status')}")
    print(f"message:  {r.get('message')}")
    print(f"run_dir:  {r.get('run_dir')}")
    print(f"filas normalizadas: {len(r.get('normalized') or [])}")
    print(f"inferencia_real: {r.get('inferencia_real')}  random_load_test: {r.get('random_load_test')}")
    if r.get("elapsed_s") is not None:
        print(f"elapsed_s: {r.get('elapsed_s')}  device: {r.get('device')}")
    return {"ok": 0, "prueba_carga": 0, "rechazado": 2}.get(r.get("status"), 1)


if __name__ == "__main__":
    sys.exit(_main())
