"""Puente run de modelo -> eva.db. BD temporal creada por el migrar de Node. Datos de PRUEBA (no son fisiología ni de nadie)."""
import copy
import json
import os
import shutil
import sqlite3
import subprocess
import sys
import time
from pathlib import Path

import pytest

from motor import evadb, puente_modelos as pm
from motor.entradas import desde_nativo

RAIZ = Path(__file__).resolve().parents[1]
BACKEND = RAIZ.parent / "Sistema" / "backend"
ENVS = Path("/tmp/nasa-linux-envs")

pytestmark = pytest.mark.skipif(shutil.which("node") is None or not (BACKEND / "src" / "migrar.ts").exists(),
                                reason="sin node o sin migrar.ts")

TS = "2030-03-01T10:00:00Z"
SUJ = "PRUEBA-1"


@pytest.fixture()
def bd(tmp_path, monkeypatch):
    ruta = tmp_path / "eva.db"
    env = {**os.environ, "BD": str(ruta)}
    env.pop("MODELO_SALUD", None)
    r = subprocess.run(["node", "--experimental-strip-types", "--disable-warning=ExperimentalWarning",
                        str(BACKEND / "src" / "migrar.ts")], env=env, capture_output=True, text=True, timeout=60)
    assert r.returncode == 0, r.stderr
    monkeypatch.setenv("EVA_DB", str(ruta))
    con = sqlite3.connect(ruta)
    con.execute("INSERT INTO tripulantes (id, nombre) VALUES (?, 'Dato de prueba')", (SUJ,))
    con.commit()
    con.close()
    return ruta


def _fila(model, metric, value, unit, quality, tipo, notes, source="algoritmo_senal", simulated=False):
    return {"subject_id": SUJ, "study_id": None, "timestamp": TS, "source": source, "model": model, "metric": metric,
            "value": value, "unit": unit, "quality": quality, "simulated": simulated, "tipo": tipo,
            "run_id": "20300301T100000_" + model + "_abcd1234", "input_file": "outputs/raw/x/input/a", "notes": notes}


def _resp(model, filas, status="ok", **kw):
    r = {"status": status, "message": "", "model": model, "run_id": "20300301T100000_" + model + "_abcd1234",
         "run_dir": "outputs/raw/x", "subject_id": SUJ, "study_id": None, "timestamp": TS, "simulated": False,
         "checkpoint": {"path": None, "url": None, "sha256": None}, "device": "cpu", "random_load_test": False,
         "inferencia_real": True, "config": {}, "input": {}, "raw_output": {}, "normalized": filas, "artifacts": [],
         "elapsed_s": 1.0, "warnings": [], "errors": [], "entorno": {}, "started_at": TS, "finished_at": TS}
    r.update(kw)
    return r


def _run_dir(tmp_path, resp, nombre="run"):
    d = tmp_path / nombre
    d.mkdir(exist_ok=True)
    (d / "response.json").write_text(json.dumps(resp), encoding="utf-8")
    return d


def _ecg_filas(simulated=False, fc_nan=False):
    seg = "t 0.0-180.0 s"
    f = [
        _fila("ecg", "heart_rate", None if fc_nan else 70.0, "bpm", "sin_dato: no calculable" if fc_nan else "ok",
              "medicion", seg + "; n_rr_validos=200"),
        _fila("ecg", "hrv_rmssd", 25.0, "ms", "ok", "medicion", seg + "; variable V43"),
        _fila("ecg", "hrv_sdnn", 30.0, "ms", "ok", "medicion", seg + "; variable V43"),
        _fila("ecg", "pr_interval", 150.0, "ms", "experimental_delineacion_dwt", "medicion", seg + "; variable V35"),
        _fila("ecg", "qtc_bazett", 400.0, "ms", "experimental_delineacion_dwt", "medicion", seg + "; variable V34"),
        _fila("ecg", "latidos_irregulares", 3, "latidos", "experimental_criterio_rr_prematuridad", "hallazgo", seg),
        _fila("ecg", "ritmo_irregular_fraccion_ventanas", 0.0, "fraccion_0_1", "ok", "hallazgo", "BANDERA EXPERIMENTAL: " + seg,
              source="regla_experimental"),
        _fila("ecg", "ritmo_irregular_compatible_fa", 0.0, "bandera_0_1_no_diagnostica",
              "BANDERA_EXPERIMENTAL_NO_DIAGNOSTICO", "regla_alerta", "BANDERA EXPERIMENTAL: " + seg,
              source="regla_experimental"),
    ]
    for x in f:
        x["simulated"] = simulated
    return f


def _eco_resp(modelo="echonet_dynamic", **kw):
    m = {"echonet_dynamic": "EF", "echoprime": "ejection_fraction"}[modelo]
    f = [_fila(modelo, m, 58.4, "%", "ok", "medicion", "", source="modelo_preentrenado")]
    return _resp(modelo, f, checkpoint={"path": "weights/x.pt", "url": None, "sha256": "ab" * 32}, **kw)


def _n_muestras(bd):
    con = sqlite3.connect(bd)
    n = con.execute("SELECT COUNT(*) FROM muestras").fetchone()[0]
    con.close()
    return n


def _mu(bd, **w):
    con = sqlite3.connect(bd)
    con.row_factory = sqlite3.Row
    r = con.execute("SELECT * FROM muestras WHERE procedencia=?", (w["proc"],)).fetchall()
    con.close()
    return r


# ----------------------------------------------------------------------------------------------- eco
def test_eco_guarda_y_reevalua(bd, tmp_path):
    d = _run_dir(tmp_path, _eco_resp(simulated=True))
    r = pm.ejecutar(str(bd), str(d), SUJ, "echonet_dynamic", "eco.avi")
    assert r["ok"] and r["tipo"] == "eco" and r["simulado"] is True and r["guardadas"] == 1
    assert r["checkpoint"]["path"] == "weights/x.pt" and "diagnóstico" in r["aviso"]
    v = r["valores"][0]
    assert v["variable_id"] == "01:V18" and v["valor"] == 58.4 and v["nivel"] == "N4" and v["guardada"]
    assert v["con_liga"] and "P01" in v["padecimientos"]
    filas = _mu(bd, proc="modelo_eco")
    assert len(filas) == 1 and filas[0]["variable"] == "01:V18" and filas[0]["tripulante"] == SUJ
    q = json.loads(filas[0]["calidad"])
    assert q["clase"] == "modelo_eco" and q["simulado"] is True and q["archivo_origen"] == "eco.avi"
    # misma vía que la central: reevaluar escribe evaluaciones
    ev = evadb.evaluar_eva_db(str(bd), guardar=True, simulado=True)
    assert ev["filas_escritas"] > 0
    con = sqlite3.connect(bd)
    assert con.execute("SELECT COUNT(*) FROM evaluaciones").fetchone()[0] > 0
    con.close()


def test_eco_sin_fevi_y_varias(bd, tmp_path):
    r0 = _resp("echonet_dynamic", [])
    r = pm.ejecutar(str(bd), str(_run_dir(tmp_path, r0)), SUJ, "echonet_dynamic", "a")
    assert r["ok"] and r["guardadas"] == 0 and r["valores"][0]["motivo"] == "sin FEVI"
    f = [_fila("echonet_dynamic", "EF", 50.0, "%", "ok", "medicion", ""),
         _fila("echonet_dynamic", "EF", 60.0, "%", "ok", "medicion", "")]
    r = pm.ejecutar(str(bd), str(_run_dir(tmp_path, _resp("echonet_dynamic", f), "r2")), SUJ, "echonet_dynamic", "a")
    assert r["ok"] and r["guardadas"] == 0 and "no se elige" in r["valores"][0]["motivo"]
    f[1]["quality"] = "nivel_estudio_agregado"
    r = pm.ejecutar(str(bd), str(_run_dir(tmp_path, _resp("echonet_dynamic", f), "r3")), SUJ, "echonet_dynamic", "a")
    assert r["guardadas"] == 1 and r["valores"][0]["valor"] == 60.0


# ----------------------------------------------------------------------------------------------- ecg
def test_ecg_guarda_solo_decide(bd, tmp_path):
    d = _run_dir(tmp_path, _ecg_filas_resp())
    r = pm.ejecutar(str(bd), str(d), SUJ, "ecg", "ecg.hea")
    assert r["ok"] and r["tipo"] == "ecg" and r["simulado"] is False and not r["prueba_carga"]
    por = {v["metrica"]: v for v in r["valores"]}
    assert set(por) == {f["metric"] for f in _ecg_filas()}
    assert por["heart_rate"]["variable_id"] == "04:A4" and por["heart_rate"]["guardada"]
    assert por["hrv_rmssd"]["variable_id"] == "03:V17" and por["hrv_rmssd"]["guardada"]
    assert por["qtc_bazett"]["variable_id"] == "01:V34" and por["pr_interval"]["variable_id"] == "01:V35"
    assert por["latidos_irregulares"]["variable_id"] == "01:V32" and por["latidos_irregulares"]["unidad"] == "latidos/24 h"
    assert por["latidos_irregulares"]["valor"] == pytest.approx(3 * 86400 / 180)
    assert por["ritmo_irregular_compatible_fa"]["variable_id"] == "01:V31" and por["ritmo_irregular_compatible_fa"]["guardada"]
    for m in ("hrv_sdnn", "ritmo_irregular_fraccion_ventanas"):
        assert not por[m]["guardada"] and por[m]["motivo"] == "informativa (decide=False en el motor)"
    assert r["guardadas"] == sum(v["guardada"] for v in r["valores"]) == 6
    assert por["heart_rate"]["experimental"] and not por["heart_rate"]["con_liga"]       # 04:A4 sin ligas
    for v in r["valores"]:
        assert v["experimental"] == ((not v["con_liga"]) or "[experimental]" in (v["etiquetas"] or ""))
    assert len(_mu(bd, proc="modelo_ecg")) == 6
    # leer_muestras -> ecg_adaptador; desde_nativo no las rechaza
    con = evadb.conectar(bd)
    nat = evadb.leer_muestras(con)
    con.close()
    assert set(nat["device_class"]) == {"ecg_adaptador"} and set(nat["simulated"]) == {"false"}
    assert nat["notes"].str.contains("modelo=ecg; run=").all() and nat["notes"].str.contains("ventana=180 s").all()
    obs, rech, _ = desde_nativo(nat)
    assert len(rech) == 0 and len(obs) == 6
    assert set(obs["variable_id"]) == {"04:A4", "03:V17", "01:V34", "01:V35", "01:V32", "01:V31"}
    assert (obs["clase_dispositivo"] == "ecg_adaptador").all()


def _ecg_filas_resp(**kw):
    return _resp("ecg", _ecg_filas(), **kw)


def test_ecg_sin_dato_y_simulado(bd, tmp_path):
    resp = _resp("ecg", _ecg_filas(simulated=True, fc_nan=True), simulated=True)
    r = pm.ejecutar(str(bd), str(_run_dir(tmp_path, resp)), SUJ, "ecg", "ecg.hea")
    por = {v["metrica"]: v for v in r["valores"]}
    assert r["simulado"] and not por["heart_rate"]["guardada"] and por["heart_rate"]["valor"] is None
    assert "sin_dato" in por["heart_rate"]["motivo"] and r["guardadas"] == 5
    q = json.loads(_mu(bd, proc="modelo_ecg")[0]["calidad"])
    assert q["simulado"] is True and q["clase"] == "ecg_adaptador" and q["modelo"] == "ecg" and q["checkpoint"] is None
    con = evadb.conectar(bd)
    assert set(evadb.leer_muestras(con)["simulated"]) == {"true"}
    con.close()
    # --simulado fuerza el sello aunque el run no lo traiga
    r2 = pm.ejecutar(str(bd), str(_run_dir(tmp_path, _ecg_filas_resp(), "r2")), SUJ, "ecg", "x", simulado_flag=True)
    assert r2["simulado"] is True


def test_ecg_idempotente(bd, tmp_path):
    d = _run_dir(tmp_path, _ecg_filas_resp())
    r1 = pm.ejecutar(str(bd), str(d), SUJ, "ecg", "e")
    n = _n_muestras(bd)
    r2 = pm.ejecutar(str(bd), str(d), SUJ, "ecg", "e")
    assert r1["guardadas"] == 6 and r2["guardadas"] == 0 and _n_muestras(bd) == n == 6
    assert sum(v["existente"] for v in r2["valores"]) == 6
    ra = pm.ejecutar(str(bd), str(_run_dir(tmp_path, _eco_resp(), "e")), SUJ, "echonet_dynamic", "e")
    rb = pm.ejecutar(str(bd), str(tmp_path / "e"), SUJ, "echonet_dynamic", "e")
    assert ra["guardadas"] == 1 and rb["guardadas"] == 0 and rb["valores"][0]["existente"]


# ----------------------------------------------------------------------------------------------- rechazos
def test_prueba_de_carga_no_guarda(bd, tmp_path):
    f = [_fila("echonet_dynamic", "EF", 51.0, "%", "prueba_de_carga_tensor_aleatorio_NO_ES_RESULTADO", "medicion", "")]
    for resp in (_resp("echonet_dynamic", f, status="prueba_carga", random_load_test=True, inferencia_real=False),
                 _resp("echonet_dynamic", f, random_load_test=True)):
        r = pm.ejecutar(str(bd), str(_run_dir(tmp_path, resp)), SUJ, "echonet_dynamic", "a")
        assert r["ok"] and r["prueba_carga"] and r["status_run"] == "prueba_carga" and r["guardadas"] == 0
        assert r["valores"] and all(not v["guardada"] and v["motivo"] == "prueba de carga: no es resultado" for v in r["valores"])
    g = _ecg_filas()
    for x in g:
        x["quality"] = "prueba_de_carga_tensor_aleatorio_NO_ES_RESULTADO"
    r = pm.ejecutar(str(bd), str(_run_dir(tmp_path, _resp("ecg", g, status="prueba_carga", random_load_test=True), "c")),
                    SUJ, "ecg", "a")
    assert r["ok"] and r["guardadas"] == 0 and _n_muestras(bd) == 0


def test_errores_sin_escrituras(bd, tmp_path):
    for i, st in enumerate(("error", "rechazado")):
        d = _run_dir(tmp_path, _resp("ecg", _ecg_filas(), status=st, message="entrada no válida XYZ"), f"s{i}")
        r = pm.ejecutar(str(bd), str(d), SUJ, "ecg", "a")
        assert r["ok"] is False and "XYZ" in r["error"]
    d = _run_dir(tmp_path, _ecg_filas_resp(), "ok")
    assert not pm.ejecutar(str(bd), str(d), SUJ, "echonet_dynamic", "a")["ok"]          # model incoherente
    assert not pm.ejecutar(str(bd), str(d), "OTRO", "ecg", "a")["ok"]                   # sujeto incoherente
    assert "sin puente" in pm.ejecutar(str(bd), str(_run_dir(tmp_path, _resp("yolo", []), "y")), SUJ, "yolo", "a")["error"]
    assert not pm.ejecutar(str(bd), str(tmp_path / "noexiste"), SUJ, "ecg", "a")["ok"]  # sin response.json
    (tmp_path / "mal").mkdir()
    (tmp_path / "mal" / "response.json").write_text("{no es json")
    assert not pm.ejecutar(str(bd), str(tmp_path / "mal"), SUJ, "ecg", "a")["ok"]
    assert not pm.ejecutar(str(tmp_path / "no.db"), str(d), SUJ, "ecg", "a")["ok"]      # sin BD
    assert _n_muestras(bd) == 0 and not (tmp_path / "no.db").exists()


# ----------------------------------------------------------------------------------------------- CLI
def _cli(bd, d, *extra, modelo="ecg"):
    p = subprocess.run([sys.executable, "-m", "motor.puente_modelos", "--db", str(bd), "--run-dir", str(d),
                        "--tripulante", SUJ, "--modelo", modelo, "--archivo", "a.hea", *extra],
                       cwd=RAIZ, capture_output=True, text=True, timeout=120)
    return p, json.loads(p.stdout.strip().splitlines()[-1])


def test_cli(bd, tmp_path):
    d = _run_dir(tmp_path, _ecg_filas_resp())
    p, j = _cli(bd, d, "--simulado")
    assert p.returncode == 0 and j["ok"] and j["simulado"] and j["guardadas"] == 6
    p, j = _cli(bd, d, modelo="echonet_dynamic")
    assert p.returncode == 1 and j["ok"] is False and "error" in j
    assert _n_muestras(bd) == 6


def test_sanear_nan_inf_numpy():
    import numpy as np
    o = {"a": float("nan"), "b": [float("inf"), -float("inf"), (np.float64("nan"), np.int64(3))],
         "c": {"d": np.float32(1.5), "e": np.bool_(True)}}
    r = pm.sanear(o)
    assert r == {"a": None, "b": [None, None, [None, 3]], "c": {"d": 1.5, "e": True}}
    json.dumps(r, allow_nan=False)
    # con escrituras previas, el fallback no miente: ok sigue true y guardadas se conserva
    class Raro:
        pass
    out = json.loads(pm._serializar({"ok": True, "guardadas": 2, "x": Raro(), "y": float("nan")}))
    assert out["ok"] is True and out["guardadas"] == 2


def test_cli_salida_json_con_nan(bd, tmp_path, monkeypatch, capsys):
    monkeypatch.setattr(pm, "ejecutar", lambda *a, **k: {"ok": True, "guardadas": 1, "v": float("nan")})
    assert pm.main(["--db", "x", "--run-dir", "y", "--tripulante", SUJ, "--modelo", "ecg", "--archivo", "a"]) == 0
    j = json.loads(capsys.readouterr().out.strip().splitlines()[-1])
    assert j["ok"] is True and j["v"] is None


# ----------------------------------------------------------------------------------------------- ECG real
@pytest.mark.skipif(not (ENVS / "ecg" / "bin" / "python").exists(), reason="sin venv ECG real")
def test_ecg_real_mitdb(bd, tmp_path, monkeypatch):
    monkeypatch.setenv("PROTOTIPO_ENVS_DIR", str(ENVS))
    from core import run_model
    t0 = time.perf_counter()
    resp = run_model.ejecutar("ecg", [RAIZ / "samples" / "ecg_normal_mitdb100.hea"], SUJ, declared_modality="ecg_1d",
                              raw_dir=tmp_path / "raw", normalized_csv=tmp_path / "n.csv")
    assert resp["status"] == "ok", resp["message"]
    r = pm.ejecutar(str(bd), resp["run_dir"] if Path(resp["run_dir"]).is_absolute() else str(RAIZ / resp["run_dir"]),
                    SUJ, "ecg", "ecg_normal_mitdb100.hea", simulado_flag=True)    # datos públicos MIT-BIH, no del tripulante
    dt = time.perf_counter() - t0
    assert r["ok"] and r["simulado"] and r["inferencia_real"] and r["guardadas"] == 6, r
    assert len(_mu(bd, proc="modelo_ecg")) == 6 and dt < 120
    q = json.loads(_mu(bd, proc="modelo_ecg")[0]["calidad"])
    assert q["simulado"] is True
