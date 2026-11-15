"""Puente run de modelo -> eva.db (CLI; contrato fijo para el lado Node).

    python -m motor.puente_modelos --db <eva.db> --run-dir <carpeta del run> --tripulante <id> --modelo <key>
                                   --archivo <nombre> [--simulado]

Lee `<run-dir>/response.json` (escrito por `core/run_model.py`) y guarda en `muestras` SOLO lo que el motor ya sabe
usar: la FEVI de los modelos de eco (01:V18, 'modelo_eco') y las métricas del adaptador ECG que `calidad.puerta` mapea
a una variable y marca `decide` (procedencia 'modelo_ecg'). No inventa ligas ni pesos y NO reevalúa el semáforo (eso lo
hace la nave con `python -m motor.evadb --evaluar`). Una prueba de carga nunca se guarda. Imprime UN objeto JSON como
última línea de stdout; exit 0 si ok:true, 1 si ok:false (y entonces no escribe nada). No es un diagnóstico.
"""
from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path

import pandas as pd

from . import calidad as cal
from . import evadb
from .entradas import METRICA_FEVI

RAIZ = Path(__file__).resolve().parents[1]
AVISO = ("No es un diagnóstico. Modelo de investigación; la salida de un modelo de eco o de un algoritmo de señal es "
         "experimental y requiere revisión por el cirujano de vuelo.")
MOTIVO_CARGA = "prueba de carga: no es resultado"
MOTIVO_INFORMATIVA = "informativa (decide=False en el motor)"


class _Error(Exception):
    pass


def _num(v):
    try:
        f = float(v)
    except (TypeError, ValueError):
        return None
    return None if math.isnan(f) or math.isinf(f) else f


def _ligas(con, variable_id):
    """(con_liga, [padecimientos]) con liga y fuente no vacía en padecimiento_variable."""
    if not variable_id or "padecimiento_variable" not in evadb.tablas(con):
        return False, []
    ids = [r[0] for r in con.execute(
        "SELECT padecimiento_id FROM padecimiento_variable WHERE variable_id=? AND TRIM(COALESCE(fuente,''))<>'' "
        "ORDER BY padecimiento_id", (variable_id,))]
    return bool(ids), ids


def _valor(metrica, variable_id, valor, unidad, quality, nivel, decide, con, *, etiquetas=None, guardada=False,
           existente=False, muestra_id=None, motivo=None):
    con_liga, pads = _ligas(con, variable_id)
    return {"metrica": metrica, "variable_id": variable_id, "valor": valor, "unidad": unidad, "quality": quality,
            "nivel": nivel, "decide": bool(decide), "con_liga": con_liga, "padecimientos": pads,
            "experimental": (not con_liga) or ("[experimental]" in (etiquetas or "")), "guardada": guardada,
            "existente": existente, "muestra_id": muestra_id, "motivo": motivo, "etiquetas": etiquetas or None}


def _leer_run(run_dir: str, modelo: str, tripulante: str) -> dict:
    d = Path(run_dir)
    d = d if d.is_absolute() else RAIZ / d
    f = d / "response.json"
    try:
        resp = json.loads(f.read_text(encoding="utf-8"))
    except FileNotFoundError:
        raise _Error(f"no existe {f}") from None
    except (OSError, ValueError) as e:
        raise _Error(f"response.json ilegible: {e}") from None
    if not isinstance(resp, dict):
        raise _Error("response.json no es un objeto")
    st = resp.get("status")
    if st in ("error", "rechazado"):
        raise _Error(f"el run terminó con status {st!r}: {resp.get('message') or 'sin mensaje'}")
    if st not in ("ok", "prueba_carga"):
        raise _Error(f"status {st!r} desconocido en response.json")
    if resp.get("model") != modelo:
        raise _Error(f"incoherencia: response.model={resp.get('model')!r} != --modelo {modelo!r}")
    if str(resp.get("subject_id")) != str(tripulante):
        raise _Error(f"incoherencia: response.subject_id={resp.get('subject_id')!r} != --tripulante {tripulante!r}")
    return resp


def _sello(resp: dict):
    ts = resp.get("timestamp") or resp.get("finished_at") or resp.get("started_at")
    if not ts:
        raise _Error("response.json sin timestamp, finished_at ni started_at")
    try:
        pd.Timestamp(ts)
    except (ValueError, TypeError):
        raise _Error(f"timestamp ilegible: {ts!r}") from None
    return ts


def _eco(resp, modelo, tripulante, archivo, simulado, con, ruta, salida):
    metrica = METRICA_FEVI[modelo]
    filas = [r for r in resp.get("normalized") or []
             if str(r.get("metric")) == metrica and str(r.get("tipo")) == "medicion"]
    if not filas:
        salida["valores"].append(_valor(metrica, "01:V18", None, "%", None, "N4", True, con, motivo="sin FEVI"))
        return
    elegida = None
    if len(filas) == 1:
        elegida = filas[0]
    else:
        agreg = [r for r in filas if "nivel_estudio" in f"{r.get('quality')} {r.get('notes')}"]
        if len(agreg) == 1:
            elegida = agreg[0]
            salida["avisos"].append("varias FEVI en el run: se usó la agregada a nivel de estudio.")
    if elegida is None:
        salida["valores"].append(_valor(metrica, "01:V18", None, "%", None, "N4", True, con,
                                        motivo="varias FEVI; no se elige una"))
        return
    q = None if elegida.get("quality") is None else str(elegida.get("quality"))
    v = _num(elegida.get("value"))
    if v is None or (q or "").lower().startswith("sin_dato"):
        salida["valores"].append(_valor(metrica, "01:V18", None, "%", q, "N4", True, con,
                                        motivo=f"sin dato: {q or 'valor vacío'}"))
        return
    ck = resp.get("checkpoint") or {}
    r = evadb.guardar_muestra_eco(v, subject_id=tripulante, timestamp=_sello(resp), modelo=modelo, simulado=simulado,
                                  quality=q, checkpoint=ck.get("path"), archivo_origen=archivo,
                                  run_id=resp.get("run_id"), ruta=ruta)
    if r.get("error"):
        raise _Error(r["error"])
    salida["valores"].append(_valor(
        metrica, "01:V18", v, "%", q, "N4", True, con, guardada=bool(r.get("guardada")),
        existente=bool(r.get("existente")), muestra_id=r.get("id"),
        motivo=None if r.get("guardada") else ("ya existía una muestra igual (idempotente)" if r.get("existente")
                                                else r.get("aviso"))))


def _ecg(resp, tripulante, archivo, simulado, con, ruta, salida):
    cols = cal.CONTRATO_COLUMNAS
    ts = _sello(resp)
    filas = []
    for r in resp.get("normalized") or []:
        r = {c: r.get(c) for c in cols}
        r["timestamp"] = r["timestamp"] or ts
        filas.append(r)
    if not filas:
        salida["avisos"].append("el run no trae filas normalizadas")
        return
    df = pd.DataFrame(filas, columns=cols)
    df["value"] = df["value"].astype(object)
    # `simulated` de la fila manda en la puerta; el puente la fuerza al valor ya resuelto (OR) para no bajar el sello
    df["simulated"] = bool(simulado)
    obs, rech, avisos = cal.puerta(df, ecg_en_reposo=False, origen="outputs_raw")
    salida["avisos"].extend(a for a in avisos if a not in salida["avisos"])
    notas_por_metrica = {str(r["metric"]): r["notes"] for r in filas}
    pend = []                                             # (índice en valores, dict para guardar)
    for _, o in obs.iterrows():
        var = o["variable_id"] if isinstance(o["variable_id"], str) else None
        v = _num(o["valor"])
        met = str(o["metric"])
        unidad = o["unidad"] or None
        etiq = o["etiquetas"] or None
        ent = _valor(met, var, v, unidad, o["quality"] or None, o["nivel"], o["decide"], con, etiquetas=etiq)
        if var is None:
            ent["motivo"] = "sin variable de equipo (no puntúa)"
        elif v is None:
            ent["motivo"] = o["sin_dato"] or "sin dato"
        elif not o["decide"]:
            ent["motivo"] = MOTIVO_INFORMATIVA
        else:
            pend.append((len(salida["valores"]), {
                "variable_id": var, "valor": v, "unidad": unidad, "metrica": met, "quality": o["quality"],
                "nivel": o["nivel"], "experimental": ent["experimental"], "con_liga": ent["con_liga"],
                "ventana_s": cal.duracion_analizada_s(notas_por_metrica.get(met))}))
        salida["valores"].append(ent)
    for _, x in rech.iterrows():
        salida["valores"].append(_valor(str(x["metric"]), None, _num(x["valor"]), None, x["quality"] or None, None,
                                        False, con, motivo=f"rechazada por la puerta ({x['paso']}): {x['motivo']}"))
    if not pend:
        return
    r = evadb.guardar_muestras_ecg([p[1] for p in pend], subject_id=tripulante, timestamp=ts, simulado=simulado,
                                   archivo_origen=archivo, run_id=resp.get("run_id"), ruta=ruta)
    if r.get("error"):
        raise _Error(r["error"])
    for (i, _), res in zip(pend, r["resultados"]):
        e = salida["valores"][i]
        e["guardada"], e["existente"], e["muestra_id"] = bool(res.get("guardada")), bool(res.get("existente")), res.get("id")
        if not res.get("guardada"):
            e["motivo"] = "ya existía una muestra igual (idempotente)" if res.get("existente") else res.get("error")


def ejecutar(db, run_dir, tripulante, modelo, archivo, simulado_flag=False) -> dict:
    try:
        con = evadb.conectar(db)
        if con is None:
            raise _Error(f"no hay BD en {db!r}")
        try:
            if evadb.faltan(con, ("muestras",)):
                raise _Error("la BD no tiene la tabla muestras (¿falta migrar?)")
            resp = _leer_run(run_dir, modelo, tripulante)
            simulado = bool(simulado_flag) or resp.get("simulated") is True
            carga = resp.get("status") == "prueba_carga" or bool(resp.get("random_load_test"))
            ck = resp.get("checkpoint")
            salida = {"ok": True, "tipo": "eco" if modelo in METRICA_FEVI else "ecg", "modelo": modelo,
                      "run_id": resp.get("run_id"), "status_run": "prueba_carga" if carga else "ok",
                      "simulado": simulado, "prueba_carga": carga, "inferencia_real": bool(resp.get("inferencia_real")),
                      "checkpoint": ({"path": ck.get("path"), "sha256": ck.get("sha256")} if isinstance(ck, dict) else None),
                      "device": resp.get("device"), "valores": [], "guardadas": 0, "avisos": [], "aviso": AVISO}
            if modelo not in METRICA_FEVI and modelo != "ecg":
                raise _Error(f"modelo sin puente: {modelo!r} (admitidos: ecg, {', '.join(sorted(METRICA_FEVI))})")
            if carga:
                for r in resp.get("normalized") or []:
                    e = _valor(str(r.get("metric")), None, None, None, None, None, False, con, motivo=MOTIVO_CARGA)
                    salida["valores"].append(e)
                salida["avisos"].append("Prueba de carga con tensor aleatorio: no se guarda nada y nunca es dato clínico.")
            elif modelo == "ecg":
                _ecg(resp, tripulante, archivo, simulado, con, db, salida)
            else:
                _eco(resp, modelo, tripulante, archivo, simulado, con, db, salida)
            salida["guardadas"] = sum(1 for v in salida["valores"] if v["guardada"])
            if simulado:
                salida["avisos"].append("SIMULADO: las muestras quedan marcadas como simuladas.")
            return salida
        finally:
            con.close()
    except _Error as e:
        return {"ok": False, "error": str(e)}
    except Exception as e:  # noqa: BLE001  (el contrato exige siempre un JSON)
        return {"ok": False, "error": f"{type(e).__name__}: {e}"}


def sanear(o):
    """Hace serializable el resultado: NaN/inf -> None, escalares numpy/pandas -> nativos (recursivo)."""
    if isinstance(o, dict):
        return {str(k): sanear(v) for k, v in o.items()}
    if isinstance(o, (list, tuple)):
        return [sanear(v) for v in o]
    if isinstance(o, float):
        return o if math.isfinite(o) else None
    if isinstance(o, (str, int, bool)) or o is None:
        return o
    item = getattr(o, "item", None)
    if callable(item):
        try:
            return sanear(item())
        except Exception:  # noqa: BLE001
            pass
    return o


def _a_str(o):
    if isinstance(o, dict):
        return {str(k): _a_str(v) for k, v in o.items()}
    if isinstance(o, (list, tuple)):
        return [_a_str(v) for v in o]
    if isinstance(o, float) and not math.isfinite(o):
        return str(o)
    return o


def _serializar(res):
    try:
        return json.dumps(sanear(res), ensure_ascii=False, allow_nan=False, default=str)
    except (ValueError, TypeError, OverflowError) as e:
        if (res.get("guardadas") or 0) > 0:     # ya se escribió en la BD: no mentir sobre lo guardado
            return json.dumps(_a_str(res), ensure_ascii=False, allow_nan=False, default=str)
        return json.dumps({"ok": False, "error": f"resultado no serializable: {e}"}, ensure_ascii=False)


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description="Guarda en eva.db el resultado de un run de modelo (no es diagnóstico).")
    ap.add_argument("--db", required=True)
    ap.add_argument("--run-dir", required=True)
    ap.add_argument("--tripulante", required=True)
    ap.add_argument("--modelo", required=True)
    ap.add_argument("--archivo", required=True)
    ap.add_argument("--simulado", action="store_true")
    a = ap.parse_args(argv)
    res = ejecutar(a.db, a.run_dir, a.tripulante, a.modelo, a.archivo, a.simulado)
    print(_serializar(res))
    return 0 if res.get("ok") else 1


if __name__ == "__main__":
    sys.exit(main())
