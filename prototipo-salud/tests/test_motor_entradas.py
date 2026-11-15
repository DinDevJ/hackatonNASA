"""Entradas del motor: runs de ECG de validacion, reposo declarado, N4, bandera sin metodo y outputs/raw vacio."""
from pathlib import Path

import pytest

from motor import entradas

RAIZ = Path(__file__).resolve().parents[1]
RUNS = "validacion/ecg/runs"

pytestmark = pytest.mark.skipif(not (RAIZ / RUNS).exists(), reason="no hay runs de ECG de validacion en esta copia")


def _obs(reposo):
    return entradas.reunir(raw_dir=RUNS, simulado=False, ecg_en_reposo=reposo)["obs"]


def test_fc_va_a_04_a4_sin_reposo_y_a_01_v3_con_reposo():
    sin = _obs(False)
    hr = sin[sin["metric"] == "heart_rate"]
    assert len(hr) and set(hr["variable_id"]) == {"04:A4"}
    con = _obs(True)
    hr = con[con["metric"] == "heart_rate"]
    assert set(hr["variable_id"]) == {"01:V3"} and set(hr["contexto"]) == {"reposo"}


@pytest.mark.parametrize("reposo", [False, True])
def test_qtc_pr_bandera_y_latidos_son_n4_y_sin_metodo(reposo):
    o = _obs(reposo)
    for m in ("qtc_bazett", "pr_interval", "ritmo_irregular_compatible_fa", "latidos_irregulares"):
        x = o[o["metric"] == m]
        assert len(x) and set(x["nivel"]) == {"N4"}, m
        assert set(x["clase_dispositivo"]) == {"ecg_adaptador"}
    bandera = o[o["metric"] == "ritmo_irregular_compatible_fa"]
    assert bandera["metodo"].isna().all()                        # la bandera nunca declara lectura humana
    assert (o["simulated"] == False).all()                       # noqa: E712 (los runs de validacion no son simulados)


def test_latidos_irregulares_nunca_son_01_v33():
    o = _obs(True)
    x = o[o["metric"] == "latidos_irregulares"]
    assert set(x["variable_id"]) == {"01:V32"} and "01:V33" not in set(o["variable_id"].dropna())


def test_outputs_raw_vacio_no_da_error(tmp_path):
    # carpeta vacía y carpeta inexistente (no depende de lo que haya en outputs/raw de la instalación)
    for d in (str(tmp_path), str(tmp_path / "no_existe")):
        r = entradas.reunir(raw_dir=d, simulado=False)
        assert len(r["obs"]) == 0 and r["personas"] == {}
        assert any("vac" in a or "ningun" in a or "no existe" in a for a in r["avisos"])
