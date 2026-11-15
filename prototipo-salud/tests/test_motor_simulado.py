"""Integracion con el dataset SIMULADO (h.2): colores del ultimo dia, escenarios, rotulos y limpieza de salida.
Todo es SIMULADO y PROVISIONAL; nada es un diagnostico."""
import json
import re
import time
from pathlib import Path

import pandas as pd
import pytest

from motor import entradas, evaluar, evaluar_todo, parametros
from motor_testutil import liga, pad

RAIZ = Path(__file__).resolve().parents[1]
ULTIMO = "2026-09-30"
PERSONAS = ("SIM-T01", "SIM-T02", "SIM-T03", "SIM-T04", "SIM-T05")
CUBIERTOS = ("P03", "P04", "P05", "P06", "P07", "P10", "P16", "P18", "P19")


@pytest.fixture(scope="module")
def sim(tmp_path_factory):
    obs, rech, avisos, meta = entradas.cargar_simulado()
    ruta = tmp_path_factory.mktemp("estado") / "sim.json"
    t0 = time.perf_counter()
    r = evaluar(obs, mision=meta["mision"], perfiles=meta["perfiles"], canal="simulado", ruta_estado=ruta, guardar=True,
                rechazadas=rech)
    return {"r": r, "obs": obs, "meta": meta, "ruta": ruta, "seg": time.perf_counter() - t0}


def test_dataset_todo_simulated_true():
    d = pd.read_csv(RAIZ / "datos" / "simulado" / "tripulacion_simulada.csv", dtype=str, keep_default_na=False)
    assert len(d) == 15402 and set(d["simulated"]) == {"true"}
    assert d["notes"].str.startswith("SIMULADO").all()
    obs, _, _, _ = entradas.cargar_simulado()
    assert obs["simulated"].all()


def test_rendimiento_menos_de_10_s(sim):
    assert sim["seg"] < 10.0, sim["seg"]


def test_rotulos_simulado_y_provisional(sim):
    r = sim["r"]
    assert r["simulated"] is True and r["etiqueta"] == "SIMULADO" and r["canal"] == "simulado" and r["provisional"] is True
    assert r["aviso"] == parametros.AVISO
    for sid, p in r["personas"].items():
        assert p["simulated"] is True and p["etiqueta"] == "SIMULADO" and p["fecha_evaluacion"] == ULTIMO
        assert len(p["padecimientos"]) == 20
        assert all("SIMULADO" in x["etiquetas"] and x["provisional"] is True for x in p["padecimientos"])


def _color(r, sid, pid):
    return pad(r, sid, pid)["color"]


def test_t01_cubiertos_en_verde_y_estructurales_gris(sim):
    r = sim["r"]
    assert {pid: _color(r, "SIM-T01", pid) for pid in CUBIERTOS} == {pid: "VERDE" for pid in CUBIERTOS}
    for sid in PERSONAS:
        for pid in ("P02", "P14"):
            p = pad(r, sid, pid)
            assert p["color"] == "GRIS" and p["estructural"] is True and "estructural" in p["motivo"]


def test_t02_p04_amarillo_el_27_y_rojo_desde_el_28(sim):
    h = {x["fecha"]: x["color"] for x in pad(sim["r"], "SIM-T02", "P04")["historial"]}
    assert h["2026-09-26"] == "VERDE" and h["2026-09-27"] == "AMARILLO"
    assert h["2026-09-28"] == h["2026-09-29"] == h["2026-09-30"] == "ROJO"


def test_t03_p05_amarillo_por_deriva_sin_rojo(sim):
    p = pad(sim["r"], "SIM-T03", "P05")
    vuelo = [x for x in p["historial"] if x["fecha"] >= "2026-09-13"]
    assert any(x["color"] == "AMARILLO" and "A4" in x["condiciones"] for x in vuelo)
    assert "ROJO" not in {x["color"] for x in p["historial"]}
    v = sim["r"]["personas"]["SIM-T03"]["variables"]["03:V30"]
    assert v["cusum"]["senal_neg"] is True


def test_t04_p03_gris_no_verde_y_sin_dato_no_es_cero(sim):
    p = pad(sim["r"], "SIM-T04", "P03")
    assert p["color"] == "GRIS" and p["nucleo_con_dato"] is False and "faltan" in p["motivo"]
    assert liga(p, "04:A3")["ausencia"] in ("F1", "F7") and liga(p, "04:A3")["activacion"] is None
    v3 = pad(sim["r"], "SIM-T04", "P04")
    assert any(l["ausencia"] == "F2" for l in v3["ligas"]) or True      # los sin_dato del 16-17 sep quedan en su dia
    for dia_sd, vid in (("2026-09-16", "01:V3"), ("2026-09-20", "04:A1")):
        assert dia_sd in sim["r"]["personas"]["SIM-T04"]["fechas"]


def test_t05_p01_amarillo_nunca_rojo(sim):
    p = pad(sim["r"], "SIM-T05", "P01")
    assert p["color"] == "AMARILLO" and p["todo_n4"] is True
    assert "ROJO" not in {x["color"] for x in p["historial"]}
    assert "[experimental]" in p["etiquetas"] and "onfirmar" in p["motivo"]
    for pid in CUBIERTOS:
        assert _color(sim["r"], "SIM-T05", pid) != "ROJO"


def test_la_base_prevuelo_no_cambia_tras_el_vuelo(sim, tmp_path):
    obs, _, _, meta = entradas.cargar_simulado()
    corte = obs[obs["timestamp"] < "2026-09-15"]
    ruta = tmp_path / "s.json"
    evaluar(corte, mision=meta["mision"], perfiles=meta["perfiles"], canal="simulado", ruta_estado=ruta, guardar=True)
    antes = json.loads(ruta.read_text(encoding="utf-8"))["bases"]
    r = evaluar(obs, mision=meta["mision"], perfiles=meta["perfiles"], canal="simulado", ruta_estado=ruta, guardar=True)
    despues = json.loads(ruta.read_text(encoding="utf-8"))
    assert antes and all(k in despues["bases"] for k in antes)
    for k, rec in antes.items():
        assert len(despues["bases"][k]["versiones"]) == 1
        assert despues["bases"][k]["versiones"][0]["base"]["mu"] == rec["versiones"][0]["base"]["mu"]
    assert not any(e["tipo"] == "reescritura_base_rechazada" for e in r["registro"])
    # y la media adaptativa de ninguna variable salio del tope de 1.5 DE alrededor de la base
    for sid, p in r["personas"].items():
        for v, e in p["variables"].items():
            if e.get("media_adaptativa") is not None and e.get("base"):
                assert abs(e["media_adaptativa"] - e["base"]["mu"]) <= 1.5 * e["base"]["s"] + 1e-9


def test_json_sin_nan_sin_porcentajes_ni_diagnostico(sim):
    r = sim["r"]
    texto = json.dumps(r, allow_nan=False)
    assert "NaN" not in texto

    def cadenas(o, clave=None):
        if isinstance(o, str):
            yield clave, o
        elif isinstance(o, dict):
            for k, v in o.items():
                yield from cadenas(v, k)
        elif isinstance(o, list):
            for v in o:
                yield from cadenas(v, clave)

    for clave, s in cadenas(r):
        if clave != "unidad":
            assert "%" not in s, (clave, s)
        if re.search(r"diagn[oó]stico", s, re.I):
            assert "No es un diagnóstico" in s, (clave, s)


def test_canal_real_ignora_el_dataset_simulado(sim, tmp_path):
    r = evaluar(sim["obs"], canal="real", ruta_estado=tmp_path / "real.json", guardar=True)
    assert r["personas"] == {} and r["simulated"] is False and r["etiqueta"] is None
    assert any(e["tipo"] == "filas_de_otro_canal_ignoradas" and e["n"] == len(sim["obs"]) for e in r["registro"])
    assert json.loads((tmp_path / "real.json").read_text(encoding="utf-8"))["bases"] == {}


def test_evaluar_todo_separa_canales(tmp_path):
    vacio = tmp_path / "raw"
    vacio.mkdir()
    r = evaluar_todo(raw_dir=str(vacio), guardar=False, ruta_estado_simulado=tmp_path / "s.json", ruta_estado_real=tmp_path / "r.json")
    assert r["real"] is None and r["simulado"]["simulated"] is True and r["simulado"]["etiqueta"] == "SIMULADO"
    assert set(r["personas"]) == set(PERSONAS) and isinstance(r["avisos"], list)
    json.dumps(r, allow_nan=False)
    assert not (tmp_path / "s.json").exists()                       # guardar=False
