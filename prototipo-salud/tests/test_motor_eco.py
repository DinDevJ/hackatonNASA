"""FEVI de eco (01:V18) en el motor: criterio, semaforo de punta a punta, desde_eco y eva.db.
Datos de PRUEBA (no son fisiologia de nadie); `simulado=False` solo para que el canal «real» los evalue. No es diagnostico."""
import json
import shutil
import sqlite3
import subprocess
from pathlib import Path

import pandas as pd
import pytest

from motor import entradas, evadb, evaluar
from motor.score import _criterio
from motor.tablas import CRITERIOS
from motor_testutil import df, dia, fila, liga, pad

MIS = {"R1": {"lanzamiento": "2026-09-13", "aterrizaje": None}}
TS = dia(19) + "T08:00:00"
CRIT = CRITERIOS["01:V18"]


# ------------------------------------------------------------------ a) criterio
@pytest.mark.parametrize("sexo,v,esperado", [("M", 45, True), ("M", 53, False), ("F", 53, True), (None, 53, None),
                                             (None, 50, True), ("M", 60, False), ("F", 60, False)])
def test_criterio_fevi_baja(sexo, v, esperado):
    cumplido, det = _criterio("01:V18", CRIT, {"valor": float(v)}, {}, sexo)
    assert cumplido is esperado
    assert det.startswith("indeterminado: falta sexo") if esperado is None else det == f"FEVI {v:g} %"


# ------------------------------------------------------------------ c) desde_eco
def _eco(feve=40.0, **kw):
    base = dict(subject_id="R1", timestamp=TS, modelo="echonet_dynamic", simulado=False)
    base.update(kw)
    return entradas.desde_eco(feve, **base)


def test_desde_eco_calidad_vacia_y_procedencia():
    obs, rech, _ = _eco(version="v-prueba", checkpoint="ck-prueba", archivo_origen="video_prueba.avi")
    assert len(obs) == 1 and rech.empty
    o = obs.iloc[0]
    assert (o["variable_id"], o["nivel"], o["clase_dispositivo"], o["valor"], o["unidad"]) == ("01:V18", "N4", "modelo_eco", 40.0, "%")
    assert o["quality"] == "sin_calidad_declarada" and not o["calidad_buena"] and o["decide"]
    for t in ("modelo=echonet_dynamic", "version=v-prueba", "checkpoint=ck-prueba", "archivo_origen=video_prueba.avi",
              "simulado=no", "no diagnostico"):
        assert t in o["notas"]


def test_desde_eco_simulado_y_metric_echoclip():
    obs, _, _ = _eco(modelo="echoclip", simulado=True, quality="zero_shot_por_similitud")
    o = obs.iloc[0]
    assert bool(o["simulated"]) is True and o["metric"] == "ejection_fraction_zero_shot"
    assert o["quality"] == "zero_shot_por_similitud" and "simulado=si" in o["notas"]


def test_desde_eco_sin_dato():
    obs, rech, _ = _eco(None)
    assert len(obs) == 1 and obs.iloc[0]["sin_dato"].startswith("sin_dato: el adaptador no dio FEVI")


def test_desde_eco_invalidos_y_prueba_de_carga():
    with pytest.raises(ValueError):
        _eco(modelo="medsam2")
    with pytest.raises(ValueError):
        _eco(modelo="otro")
    with pytest.raises(ValueError):
        entradas.desde_eco(40.0, subject_id="R1", timestamp=TS, modelo="panecho", simulado=None)
    obs, rech, _ = _eco(quality="prueba_de_carga")
    assert obs.empty and len(rech) == 1 and rech.iloc[0]["paso"] == "G0"


# ------------------------------------------------------------------ b) semaforo de punta a punta
def _ev(tmp_path, feve=None, con_v45=True, sexo="M"):
    partes = []
    if con_v45:   # sintoma real de P01 (peso 2, presencia = 1): T = 2, sin llegar a AMARILLO (umbral T >= 3)
        partes.append(df([fila("R1", "01:V45", 1, dia(19), nivel="N3b", clase="captura_manual")]))
    if feve is not None:
        partes.append(_eco(feve)[0])
    obs = pd.concat(partes, ignore_index=True)
    return evaluar(obs, mision=MIS, perfiles={"R1": {"sexo": sexo}}, canal="real", ruta_estado=tmp_path / "e.json", guardar=False)


def test_semaforo_fevi_baja_suma_y_da_amarillo_a1(tmp_path):
    base = pad(_ev(tmp_path), "R1", "P01")
    assert base["T"] == 2.0 and base["color"] not in ("AMARILLO", "ROJO")
    p = pad(_ev(tmp_path, 35), "R1", "P01")
    assert p["T"] == 3.0 and p["color"] == "AMARILLO"
    assert "A1" in json.dumps(p["condiciones"], ensure_ascii=False)
    l = liga(p, "01:V18")
    assert l["criterio"]["cumplido"] is True and l["nivel_calidad"] == "N4" and l["activacion"] == 1.0


def test_semaforo_fevi_normal_no_suma(tmp_path):
    p = pad(_ev(tmp_path, 62), "R1", "P01")
    assert p["T"] == 2.0 and p["color"] not in ("AMARILLO", "ROJO")
    l = liga(p, "01:V18")
    assert l["criterio"]["cumplido"] is False and l["activacion"] == 0.0


def test_semaforo_fevi_sola_no_cambia_color(tmp_path):
    """Limite honesto: una FEVI baja SOLA (peso 1, N4) suma T = 1 y no cambia el color."""
    # referencia: una observacion ajena (decide=False) para que la persona exista sin FEVI
    otra = df([fila("R1", "04:A4", 70, dia(19), nivel="N3b", clase="desconocido", decide=False)])
    sin = evaluar(otra, mision=MIS, perfiles={"R1": {"sexo": "M"}}, canal="real", ruta_estado=tmp_path / "s.json", guardar=False)
    con = _ev(tmp_path, 35, con_v45=False)
    for pid in ("P01", "P02"):
        a, b = pad(sin, "R1", pid), pad(con, "R1", pid)
        assert b["T"] == 1.0 and b["color"] == a["color"] and b["color"] not in ("AMARILLO", "ROJO")
        assert liga(b, "01:V18")["criterio"]["cumplido"] is True


# ------------------------------------------------------------------ d) eva.db
BACKEND = Path(__file__).resolve().parents[1].parent / "Sistema" / "backend"
necesita_node = pytest.mark.skipif(shutil.which("node") is None or not (BACKEND / "src" / "migrar.ts").exists(),
                                   reason="sin node o sin migrar.ts")


@pytest.fixture()
def bd(tmp_path, monkeypatch):
    ruta = tmp_path / "eva.db"
    env = {**__import__("os").environ, "BD": str(ruta)}
    env.pop("MODELO_SALUD", None)
    r = subprocess.run(["node", "--experimental-strip-types", "--disable-warning=ExperimentalWarning",
                        str(BACKEND / "src" / "migrar.ts")], env=env, capture_output=True, text=True, timeout=60)
    assert r.returncode == 0, r.stderr
    monkeypatch.setenv("EVA_DB", str(ruta))
    con = sqlite3.connect(ruta)
    con.execute("INSERT INTO tripulantes (id, nombre, sexo) VALUES ('PRUEBA-1','Dato de prueba','F')")
    con.commit()
    con.close()
    return ruta


@necesita_node
def test_ida_y_vuelta_eva_db(bd):
    kw = dict(subject_id="PRUEBA-1", timestamp="2030-01-05T08:00:00", modelo="echonet_dynamic", simulado=True,
              checkpoint="ck-prueba", version="v-prueba", archivo_origen="video_prueba.avi", run_id="run-prueba")
    r1 = evadb.guardar_muestra_eco(41.5, **kw)
    r2 = evadb.guardar_muestra_eco(41.5, **kw)
    assert r1["guardada"] and not r2["guardada"] and r2["existente"] and r2["id"] == r1["id"]
    con = evadb.conectar()
    assert con.execute("SELECT COUNT(*) FROM muestras").fetchone()[0] == 1
    fila_bd = con.execute("SELECT * FROM muestras").fetchone()
    assert fila_bd["dispositivo"] is None and fila_bd["seq"] is None and fila_bd["t_scet"] == "2030-01-05T08:00:00Z"
    assert json.loads(fila_bd["calidad"])["nivel"] == "N4"
    nat = evadb.leer_muestras(con)
    con.close()
    assert len(nat) == 1
    n = nat.iloc[0]
    assert (n["variable_id"], n["device_class"], n["value"], n["simulated"], n["unit"]) == ("01:V18", "modelo_eco", 41.5, "true", "%")
    assert "modelo=echonet_dynamic" in n["notes"] and "ck-prueba" in n["notes"]
    obs, rech, _ = entradas.desde_nativo(nat)
    assert len(obs) == 1 and rech.empty
    o = obs.iloc[0]
    assert o["nivel"] == "N4" and bool(o["decide"]) and o["variable_id"] == "01:V18" and bool(o["simulated"])


@necesita_node
def test_guardar_eco_sin_dato_y_sin_tabla(bd, tmp_path):
    assert evadb.guardar_muestra_eco(None, subject_id="PRUEBA-1", timestamp=TS, modelo="panecho", simulado=True)["guardada"] is False
    vacia = tmp_path / "vacia.db"
    sqlite3.connect(vacia).close()
    r = evadb.guardar_muestra_eco(40.0, subject_id="PRUEBA-1", timestamp=TS, modelo="panecho", simulado=True, ruta=vacia)
    assert r["guardada"] is False and "error" in r


# ------------------------------------------------------------------ a.5.4 discordancia entre modelos
def _dos_modelos(tmp_path, a, b, sexo="F", segundo="echoclip"):
    obs = [_eco(a, modelo="echonet_dynamic")[0]]
    if b is not None:
        obs.append(_eco(b, modelo=segundo, quality="zero_shot_por_similitud")[0])
    return evaluar(pd.concat(obs, ignore_index=True), mision=MIS, perfiles={"R1": {"sexo": sexo}}, canal="real",
                   ruta_estado=tmp_path / "e.json", guardar=False)


def test_discordante_no_activa(tmp_path):
    l = liga(pad(_dos_modelos(tmp_path, 65, 35), "R1", "P01"), "01:V18")
    assert l["activacion"] is None and l["criterio"] is None and l["valor"] is None
    assert "discordante entre modelos (D = 30 pp > 10, a.5.4, provisional)" in str(l["motivo_ausencia"])
    assert pad(_dos_modelos(tmp_path, 65, 35), "R1", "P01")["T"] == 0.0


def test_dos_modelos_concordantes_mediana(tmp_path):
    p = pad(_dos_modelos(tmp_path, 40, 45), "R1", "P01")
    l = liga(p, "01:V18")
    assert l["valor"] == 42.5 and l["criterio"]["cumplido"] is True
    txt = " ".join(l["etiquetas"])
    assert "2 modelos (D = 5 pp)" in txt and "echoclip" in txt and "echonet_dynamic" in txt


def test_un_modelo_es_modelo_unico(tmp_path):
    l = liga(pad(_dos_modelos(tmp_path, 40, None), "R1", "P01"), "01:V18")
    assert l["valor"] == 40.0 and any("modelo único" in t for t in l["etiquetas"])


def test_guardar_eco_modelo_invalido(bd):
    with pytest.raises(ValueError):
        evadb.guardar_muestra_eco(40.0, subject_id="PRUEBA-1", timestamp=TS, modelo="medsam2", simulado=True)
