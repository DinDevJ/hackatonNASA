"""Autocalibracion (ALGORITMOS e, h.2 escenarios 4-8): salto, rampa, base inmutable, N4 y SIMULADO. PROVISIONAL."""
import json

import pytest

from motor import calibracion, evaluar
from motor_testutil import OFFSETS, df, dia, fila, pad, serie

MIS = {"R1": {"lanzamiento": "2026-09-13", "aterrizaje": None}}
KW = dict(clase="ecg_prenda_holter", nivel="N1", contexto="sueno")


def _fc(valores_vuelo, nivel="N1", sim=False):
    filas = serie("R1", "01:V3", 60, 1.0, 0, 11, **KW)
    for i, v in valores_vuelo.items():
        filas.append(fila("R1", "01:V3", v, dia(i), **{**KW, "nivel": nivel}, sim=sim))
    return filas


def _ev(filas, ruta, canal="real", guardar=False, **kw):
    return evaluar(df(filas), mision=MIS, canal=canal, ruta_estado=ruta, guardar=guardar, **kw)


def test_salto_brusco_alerta_y_la_media_no_cambia(tmp_path):
    estable = {i: 60 + 0.2 * ((i % 3) - 1) for i in range(12, 26)}
    salto = {i: 65.0 for i in range(26, 30)}                     # 27-30 sep: +5 DE
    r = _ev(_fc({**estable, **salto}), tmp_path / "e.json")
    v = r["personas"]["R1"]["variables"]["01:V3"]
    assert v["estado"] in ("alertada", "persistente")
    # solo los puntos del 16 al 23 sep (estables, fuera de transicion y de la cuarentena) se aprenden
    m = v["base"]["mu"]
    for i in range(15, 23):
        m += 0.1 * (estable[i] - m)
    assert v["aprendidos"] == 8
    assert v["media_adaptativa"] == pytest.approx(m, abs=1e-9)
    assert abs(v["media_adaptativa"] - 65.0) > 4                 # el salto NO movio la media
    # los puntos de las 72 h previas a la alerta quedan excluidos hacia atras
    assert v["excluidos_hacia_atras"] == ["2026-09-24", "2026-09-25", "2026-09-26"]
    assert sum(1 for e in r["registro"] if e["tipo"] == "excluido_hacia_atras") == 3
    assert any(("no estable" in k) or ("alertada" in k) for k in v["excluidos"])      # los puntos del salto no se aprenden
    assert any("periodo sin aprendizaje" in k for k in v["excluidos"])      # periodo sin aprendizaje tras el lanzamiento


def test_rampa_lenta_senal_cusum_y_base_prevuelo_intacta(tmp_path):
    ruta = tmp_path / "e.json"
    primero = _ev(_fc({12: 60.0, 13: 60.0}), ruta, guardar=True)
    mu0 = primero["personas"]["R1"]["variables"]["01:V3"]["base"]["mu"]
    rampa = {i: 60 + 0.12 * (i - 11) for i in range(12, 30)}
    r = _ev(_fc(rampa), ruta, guardar=True)
    v = r["personas"]["R1"]["variables"]["01:V3"]
    assert v["cusum"]["senal_pos"] is True and v["cusum"]["fecha_senal_pos"] is not None
    assert v["base"]["mu"] == pytest.approx(mu0) == pytest.approx(60.0)
    guardada = json.loads(ruta.read_text(encoding="utf-8"))
    clv = "R1|01:V3|ecg_prenda_holter"
    assert guardada["bases"][clv]["versiones"][-1]["base"]["mu"] == pytest.approx(60.0)
    # la deriva da AMARILLO (A4) algun dia de vuelo en un padecimiento con la liga de peso >= 2, y nunca ROJO por puntos sueltos
    p04 = pad(r, "R1", "P04")
    assert any("A4" in h["condiciones"] for h in p04["historial"] if h["fecha"] >= "2026-09-13")
    assert "ROJO" not in {h["color"] for h in p04["historial"]}


def test_reescribir_la_base_congelada_se_rechaza_y_se_registra(tmp_path):
    ruta = tmp_path / "e.json"
    _ev(_fc({12: 60.0, 13: 60.0}), ruta, guardar=True)
    desplazada = serie("R1", "01:V3", 63, 1.0, 0, 11, **KW) + [fila("R1", "01:V3", 63.0, dia(12), **KW)]
    r = _ev(desplazada, ruta, guardar=True)
    assert any(e["tipo"] == "reescritura_base_rechazada" for e in r["registro"])
    assert r["personas"]["R1"]["variables"]["01:V3"]["base"]["mu"] == pytest.approx(60.0)       # se respeta la congelada
    guardada = json.loads(ruta.read_text(encoding="utf-8"))
    assert guardada["registro_rechazos"] and guardada["bases"]["R1|01:V3|ecg_prenda_holter"]["versiones"][0]["base"]["mu"] == pytest.approx(60.0)


def test_n4_no_entra_al_aprendizaje(tmp_path):
    r = _ev(_fc({i: 60.0 for i in range(15, 25)}, nivel="N4"), tmp_path / "e.json")
    v = r["personas"]["R1"]["variables"]["01:V3"]
    assert v["aprendidos"] == 0 and v["media_adaptativa"] == pytest.approx(v["base"]["mu"])
    assert any("N4" in k for k in v["excluidos"])


def test_simulado_no_entra_al_almacen_real(tmp_path):
    ruta = tmp_path / "real.json"
    r = _ev(_fc({i: 60.0 for i in range(12, 20)}, sim=True) + serie("R1", "01:V3", 60, 1.0, 0, 11, **{**KW}), ruta, guardar=True)
    guardada = json.loads(ruta.read_text(encoding="utf-8"))
    assert guardada["simulated"] is False
    # las filas simuladas del vuelo se ignoraron: el canal real solo ve el prevuelo (sin base congelada)
    assert any(e["tipo"] == "filas_de_otro_canal_ignoradas" and e["n"] == 8 for e in r["registro"])
    assert guardada["bases"] == {}
    todo_sim = serie("R1", "01:V3", 60, 1.0, 0, 11, sim=True, **KW) + _fc({i: 60.0 for i in range(12, 20)}, sim=True)[12:]
    solo_sim = _ev(todo_sim, tmp_path / "real2.json", guardar=True)
    assert solo_sim["personas"] == {}


def test_calibracion_unidad_simulado_y_n4_rechazados_y_canales_separados(tmp_path):
    c = calibracion.Calibracion(canal="real")
    c.iniciar_ewma("a|b|c", 60.0, 1.0)
    ok, motivo = c.ofrecer_punto("a|b|c", "2026-09-20", 60.1, nivel="N1", simulated=True, z_act=0.1, fase="VT")
    assert ok is False and "SIMULADO" in motivo
    assert any(e["tipo"] == "punto_simulado_rechazado" for e in c.registro)
    ok, motivo = c.ofrecer_punto("a|b|c", "2026-09-20", 60.1, nivel="N4", z_act=0.1, fase="VT")
    assert ok is False and "N4" in motivo
    ok, motivo = c.congelar_base("a|b|c", {"mu": 1, "s": 1, "simulated": True}, "2026-09-12")
    assert ok is False and c.bases == {}
    sim = calibracion.Calibracion(canal="simulado")
    ruta = tmp_path / "sim.json"
    sim.guardar(ruta)
    with pytest.raises(ValueError):
        calibracion.Calibracion.cargar(ruta, canal="real")
    d = json.loads(ruta.read_text(encoding="utf-8"))
    assert d["simulated"] is True and d["etiqueta"] == "SIMULADO"
