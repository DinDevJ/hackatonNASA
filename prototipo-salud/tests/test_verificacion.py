"""Las 7 comprobaciones de verificar.py como tests (todo en directorios temporales)."""
import pytest

import verificar as V


def test_c1_estado_valido():
    est, _ = V.c1_inferencia_real()
    assert est in (V.PASA, V.PENDIENTE)  # PENDIENTE es lo esperado sin GPU/pesos


def test_c1_detecta_run_real_y_descarta_prueba_de_carga(tmp_path):
    raw, _ = V._fixture_run(tmp_path)
    assert V.c1_inferencia_real(raw)[0] == V.PASA
    d = next(raw.iterdir())
    r = V.runs.read_json(d / "response.json")
    r["random_load_test"] = True
    V.runs.write_json(d / "response.json", r)
    assert V.c1_inferencia_real(raw)[0] == V.PENDIENTE


def test_c2_manipulaciones_detectadas():
    assert V.deteccion_manipulacion() == []
    assert V.c2_salidas_atadas()[0] in (V.PASA, V.PENDIENTE)


def test_c2_run_de_prueba_integro_y_manipulado(tmp_path):
    raw, csvp = V._fixture_run(tmp_path)
    est, det = V.c2_salidas_atadas(raw, csvp)
    assert est == V.PASA, det
    (next(raw.iterdir()) / "input" / "entrada_de_prueba.bin").write_bytes(b"otra cosa")
    est, det = V.c2_salidas_atadas(raw, csvp)
    assert est == V.FALLA and any("sha256" in d for d in det)


def test_c2_run_id_huerfano_en_csv(tmp_path):
    raw, csvp = V._fixture_run(tmp_path)
    import shutil
    shutil.rmtree(next(raw.iterdir()))
    est, det = V.c2_salidas_atadas(raw, csvp)
    assert est == V.FALLA and any("sin carpeta" in d for d in det)


def test_c3_incompatibles(tmp_path):
    est, det = V.c3_incompatibles()
    assert est == V.PASA, det
    casos = V.casos_modalidad(tmp_path)
    assert len(casos) >= 8
    for desc, res, frag in casos:
        if frag == "__ok__":
            assert res["ok"], desc
        else:
            assert not res["ok"] and frag.lower() in res["motivo"].lower(), (desc, res["motivo"])


def test_c4_no_mezcla():
    est, det = V.c4_no_mezcla()
    assert est == V.PASA, det


def test_c5_faltantes_y_tiempos():
    est, det = V.c5_faltantes_y_tiempos()
    assert est == V.PASA, det


def test_c6_simulados():
    est, det = V.c6_simulados()
    assert est == V.PASA, det


def test_ejemplos_regenerables_con_semilla_fija(tmp_path):
    from sensores import generar_sintetico as g
    g.main(tmp_path)
    for n in ("ejemplo_sintetico_sensores.csv", "ejemplo_sintetico_sensores.json", "ejemplo_sintetico_ancho.csv"):
        assert (tmp_path / n).read_bytes() == (V.ROOT / "sensores" / n).read_bytes(), n


def test_c7_ecg():
    est, det = V.c7_ecg()
    assert est == V.PASA, det
    if not V.ecg_venv_existe():
        assert V.MSG_ECG_PENDIENTE in det
