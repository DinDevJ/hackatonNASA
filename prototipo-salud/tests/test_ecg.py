"""Módulo ECG: modalidades cruzadas, bandera NO diagnóstica, faltantes vacíos e integración real (si hay venv ecg).
Reutiliza los auxiliares de verificar.py. Todo en tmp_path; nada en outputs/."""
import numpy as np
import pytest

import verificar as V
from core import formato, registry, runs

sin_venv = pytest.mark.skipif(
    not registry.python_del_venv("ecg").exists(),
    reason="venv ecg no instalado: instala con scripts\\instalar_modelo.ps1 -Modelo ecg")


# ------------------------------------------------------------------ A. modalidades cruzadas
def test_casos_cruzados_validar(tmp_path):
    casos = V.casos_ecg_cruzados(tmp_path)
    assert len(casos) >= 12
    for desc, res, frag in casos:
        if frag == "__ok__":
            assert res["ok"], (desc, res["motivo"])
        else:
            assert not res["ok"] and frag.lower() in res["motivo"].lower(), (desc, res["motivo"])


def test_hea_rechazado_por_cada_modelo_de_eco():
    otros = V.ecg_manifests_otros()
    assert otros, "no se encontraron manifests de modelos de eco"
    for key, m in otros.items():
        assert "ecg_1d" not in m["modalidades_admitidas"], key
        r = V.modalidad.validar(V.ECG_NORMAL, "ecg_1d", m["modalidades_admitidas"], key)
        assert not r["ok"] and "no admite 'ecg_1d'" in r["motivo"], key
        r = V.modalidad.validar(V.ECG_NORMAL, "video_2d", m["modalidades_admitidas"], key)
        assert not r["ok"] and "según sus metadatos" in r["motivo"], key


def test_video_contra_ecg():
    r = V.modalidad.validar(V.ECG_VIDEO, "video_2d", ["ecg_1d"], "ECG")
    assert not r["ok"] and "no admite 'video_2d'" in r["motivo"]
    r = V.modalidad.validar(V.ECG_VIDEO, "ecg_1d", ["ecg_1d"], "ECG")
    assert not r["ok"] and "solo admite un registro WFDB" in r["motivo"]


def test_csv_solo_como_ecg(tmp_path):
    c = tmp_path / "s.csv"
    c.write_text("v\n" + "\n".join(str(i % 5) for i in range(100)) + "\n", encoding="utf-8")
    assert not V.modalidad.validar(c, "video_2d", ["video_2d"], "ModeloVideo")["ok"]
    assert V.modalidad.validar(c, "ecg_1d", ["ecg_1d"], "ECG")["ok"]


def test_registro_incompleto_y_dos_hea(tmp_path):
    import shutil
    shutil.copy2(V.ECG_NORMAL, tmp_path / "x.hea")
    r = V.modalidad.validar(tmp_path / "x.hea", "ecg_1d", ["ecg_1d"], "ECG")
    assert not r["ok"] and "incompleto" in r["motivo"]
    d = tmp_path / "dos"
    d.mkdir()
    shutil.copy2(V.ECG_NORMAL, d / "a.hea")
    shutil.copy2(V.ECG_NORMAL, d / "b.hea")
    r = V.modalidad.validar(d, "ecg_1d", ["ecg_1d"], "ECG")
    assert not r["ok"] and "uno por ejecución" in r["motivo"]


@pytest.mark.parametrize("declarada", ["ecg_1d", "desconocida"])
def test_control_registro_normal_aceptado(declarada):
    r = V.modalidad.validar(V.ECG_NORMAL, declarada, ["ecg_1d"], "ECG")
    assert r["ok"] and r["modality"] == "ecg_1d", r["motivo"]


def test_runner_rechaza_antes_de_subprocess_y_copia_registro(tmp_path):
    assert V.ecg_runner_rechazos(tmp_path) == []
    runs_ = list((tmp_path / "raw").iterdir())
    assert len(runs_) == 2
    assert not (tmp_path / "n.csv").exists()


# ------------------------------------------------------------------ B. bandera no diagnóstica
def test_construir_filas_8_con_tabla_del_contrato():
    M = V.ecg_metricas()
    for rr in (np.full(375, 0.8), np.random.default_rng(0).uniform(0.4, 1.2, 375), np.full(15, 0.8)):
        resp, res = V.ecg_resultados_sinteticos(rr)
        filas = M.construir_filas(resp=resp, resultados=res)
        assert [(f["metric"], f["unit"], f["tipo"], f["source"]) for f in filas] == V.ECG_TABLA
        assert all(f["source"] != "modelo_preentrenado" and f["model"] == "ecg" for f in filas)
        assert all(formato.validar_fila(f) == [] for f in filas)
        b = filas[-1]
        assert b["tipo"] == "regla_alerta" and b["source"] == "regla_experimental"
        assert b["unit"] == "bandera_0_1_no_diagnostica"
        assert b["notes"].startswith("BANDERA EXPERIMENTAL – NO DIAGNÓSTICO")


def test_regular_bandera_cero_y_rmssd_cero():
    M = V.ecg_metricas()
    resp, res = V.ecg_resultados_sinteticos(np.full(375, 0.8))
    f = {x["metric"]: x for x in M.construir_filas(resp=resp, resultados=res)}
    assert f["ritmo_irregular_compatible_fa"]["value"] == 0.0
    assert f["hrv_rmssd"]["value"] == pytest.approx(0.0, abs=1e-6)
    assert f["heart_rate"]["value"] == pytest.approx(75.0, abs=0.5)
    assert all((w["nrmssd"] or 0) < 1e-6 for w in res["bandera_fa"]["ventanas"])


def test_aleatorio_marca_mas_que_regular():
    _, reg = V.ecg_resultados_sinteticos(np.full(375, 0.8))
    _, ale = V.ecg_resultados_sinteticos(np.random.default_rng(0).uniform(0.4, 1.2, 375))
    assert ale["bandera_fa"]["fraccion_marcadas"] > reg["bandera_fa"]["fraccion_marcadas"]


def test_manifest_estatico_y_app():
    assert V.ecg_fallos_estaticos() == []


# ------------------------------------------------------------------ C. faltantes no son cero
def test_razon_y_hrv_corto():
    M = V.ecg_metricas()
    assert M.razon(1, 0) is None
    assert M.razon(0, 5) == 0.0
    h = M.hrv_basico(rr_s=np.full(15, 0.8), ok=np.ones(15, dtype=bool), min_rr=20)
    assert h["rmssd_ms"] is None and h["sdnn_ms"] is None and h["motivo"]


def test_bandera_con_pocos_segmentos_es_none():
    M = V.ecg_metricas()
    for vent in ([], [{"marcada": False}], [{"marcada": None}, {"marcada": None}]):
        b = M.bandera_segmento(ventanas=vent, min_consecutivas=2)
        assert b["valor"] is None and b["motivo"], vent
    assert M.bandera_segmento(ventanas=[{"marcada": False}] * 2, min_consecutivas=2)["valor"] == 0


def test_filas_sin_dato_y_csv_vacio(tmp_path):
    M = V.ecg_metricas()
    resp, res = V.ecg_resultados_sinteticos(np.full(15, 0.8))
    filas = {x["metric"]: x for x in M.construir_filas(resp=resp, resultados=res)}
    for met in ("hrv_rmssd", "hrv_sdnn", "ritmo_irregular_compatible_fa", "ritmo_irregular_fraccion_ventanas"):
        assert filas[met]["value"] is None and filas[met]["quality"].startswith("sin_dato"), met
    p = tmp_path / "n.csv"
    formato.append_normalized(list(filas.values()), p)
    import csv
    with open(p, newline="", encoding="utf-8") as fh:
        crudas = {r["metric"]: r["value"] for r in csv.DictReader(fh)}
    leidas = {r["metric"]: r["value"] for r in formato.leer_normalized(p)}
    for met in ("hrv_rmssd", "hrv_sdnn", "ritmo_irregular_compatible_fa"):
        assert crudas[met] == "" and leidas[met] is None, met
    assert leidas["heart_rate"] == pytest.approx(75.0, abs=0.5)


def test_emparejamiento_caso_manual():
    M = V.ecg_metricas()
    e = M.emparejar_picos(ref=[100, 500, 900], det=[110, 520, 1300, 1700], tol_muestras=37.5)
    assert (e["tp"], e["fn"], e["fp"]) == (2, 1, 2)
    c = M.comparar_picos(ref=[100, 500, 900], det=[110, 520, 1300, 1700], fs=250.0, tolerancia_ms=150.0,
                         referencia="prueba")
    assert (c["tp"], c["fn"], c["fp"], c["n_ref"], c["n_det"]) == (2, 1, 2, 3, 4)
    assert c["sensibilidad"] == pytest.approx(2 / 3, abs=1e-4) and c["ppv"] == pytest.approx(0.5)


def test_sin_referencias_sensibilidad_none():
    M = V.ecg_metricas()
    c = M.comparar_picos(ref=[], det=[100, 200], fs=250.0, tolerancia_ms=150.0, referencia="prueba")
    assert c["sensibilidad"] is None and c["fp"] == 2 and c["fn"] == 0


# ------------------------------------------------------------------ D. integración real (requiere venv ecg)
@pytest.fixture(scope="module")
def corrida_normal(tmp_path_factory):
    from core import run_model
    t = tmp_path_factory.mktemp("ecg_real")
    r = run_model.ejecutar("ecg", V.ECG_NORMAL, "MUESTRA-TEST", study_id="t", declared_modality="ecg_1d",
                           raw_dir=t / "raw", normalized_csv=t / "n.csv")
    return r, t


@sin_venv
def test_real_muestra_normal(corrida_normal):
    r, t = corrida_normal
    assert r["status"] == "ok", r.get("message")
    assert r["inferencia_real"] is True and len(r["normalized"]) == 8
    f = {x["metric"]: x for x in r["normalized"]}
    assert f["heart_rate"]["unit"] == "bpm" and 40 <= f["heart_rate"]["value"] <= 150
    assert f["ritmo_irregular_compatible_fa"]["notes"].startswith("BANDERA EXPERIMENTAL – NO DIAGNÓSTICO")
    assert r["raw_output"]["comparacion_anotaciones"]["picos_r"]["sensibilidad"] >= 0.95


@sin_venv
def test_real_traza_y_atado_a_la_ejecucion(corrida_normal):
    r, t = corrida_normal
    rd = runs.resolve(r["run_dir"])
    with np.load(rd / "ecg_traza.npz", allow_pickle=False) as z:
        assert z["senal"].size > 0 and float(z["fs"]) > 0
    assert r["input"]["sha256"] == runs.sha256_path(rd / "input")
    assert V.verificar_run(rd, formato.leer_normalized(t / "n.csv")) == []


@sin_venv
def test_real_segmento_corto_deja_vacios(tmp_path):
    from core import run_model
    r = run_model.ejecutar("ecg", V.ECG_NORMAL, "MUESTRA-TEST", declared_modality="ecg_1d",
                           options={"duracion_s": 10}, raw_dir=tmp_path / "raw", normalized_csv=tmp_path / "n.csv")
    assert r["status"] == "ok", r.get("message")
    f = {x["metric"]: x for x in r["normalized"]}
    for met in ("hrv_rmssd", "hrv_sdnn", "ritmo_irregular_compatible_fa"):
        assert f[met]["value"] is None and f[met]["quality"].startswith("sin_dato"), met


@sin_venv
def test_real_csv_sin_fs_rechazado(tmp_path):
    from core import run_model
    c = tmp_path / "senoide.csv"
    t = np.arange(2500) / 250.0
    c.write_text("ecg\n" + "\n".join(f"{v:.5f}" for v in np.sin(2 * np.pi * 1.2 * t)) + "\n", encoding="utf-8")
    r = run_model.ejecutar("ecg", c, "SIM-TEST", declared_modality="ecg_1d", simulated=True,
                           raw_dir=tmp_path / "raw", normalized_csv=tmp_path / "n.csv")
    assert r["status"] == "rechazado" and "fs" in r["message"]
    assert not (tmp_path / "n.csv").exists()


@sin_venv
def test_real_prueba_de_carga_no_escribe_csv(tmp_path):
    from core import run_model
    r = run_model.ejecutar("ecg", V.ECG_NORMAL, "SIM-TEST", declared_modality="ecg_1d", simulated=True,
                           options={"prueba_carga_dummy": True}, raw_dir=tmp_path / "raw",
                           normalized_csv=tmp_path / "n.csv")
    assert r["status"] == "prueba_carga" and r["random_load_test"] is True
    assert not (tmp_path / "n.csv").exists()
