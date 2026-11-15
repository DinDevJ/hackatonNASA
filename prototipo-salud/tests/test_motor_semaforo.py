"""Semaforo: VERDE/GRIS, faltantes, estructurales, N4 y FEVE (ALGORITMOS f.1, g.3). PROVISIONAL; nada es un diagnostico."""
import pytest

from motor import evaluar
from motor_testutil import df, dia, fila, liga, pad, serie

MIS = {"R1": {"lanzamiento": "2026-09-13", "aterrizaje": None}}
# P03: (variable, media, de, clase, nivel, contexto, metodo)
P03 = [("01:V3", 60, 1.0, "ecg_prenda_holter", "N1", "sueno"), ("04:A3", 97, 0.4, "oximetro_dedo", "N1", "sueno"),
       ("04:A2", 15, 0.6, "bandas_toracicas", "N1", "reposo"), ("01:V1", 100, 3.0, "captura_manual", "N3b", "reposo"),
       ("03:V66", 100, 3.0, "pvt_laptop", "N2", None), ("04:A25", 100, 3.0, "captura_manual", "N3b", None),
       ("04:A26", 100, 3.0, "captura_manual", "N3b", None), ("04:A30", 100, 3.0, "captura_manual", "N3b", None)]


def p03_filas(omitir=(), n4=(), ultimo=19, extra_final=None):
    filas = []
    for vid, m, de, clase, nivel, ctx in P03:
        if vid in omitir:
            continue
        if vid in n4:
            nivel, clase = "N4", "cuffless"
        filas += serie("R1", vid, m, de, 0, 11, clase=clase, nivel=nivel, contexto=ctx)
        for i in range(12, ultimo + 1):
            valor = m if not extra_final or i < ultimo else extra_final.get(vid, m)
            filas.append(fila("R1", vid, valor, dia(i), clase=clase, nivel=nivel, contexto=ctx))
    return filas


def _ev(filas, tmp_path, **kw):
    return evaluar(df(filas), mision=MIS, canal="real", ruta_estado=tmp_path / "e.json", guardar=False, **kw)


def test_verde_con_todo_en_base_y_cobertura_completa(tmp_path):
    r = _ev(p03_filas(), tmp_path)
    p = pad(r, "R1", "P03")
    assert p["color"] == "VERDE" and p["cobertura"] == pytest.approx(1.0) and p["nucleo_con_dato"] is True
    assert p["T"] == 0.0 and p["condiciones"] == []
    assert "VERDE" in p["motivo"] and "sano" in p["motivo"]


def test_gris_si_falta_el_nucleo_con_motivo(tmp_path):
    r = _ev(p03_filas(omitir=("04:A3", "04:A2", "04:A25")), tmp_path)
    p = pad(r, "R1", "P03")
    assert p["color"] == "GRIS" and p["nucleo_con_dato"] is False and p["estructural"] is False
    assert "faltan" in p["motivo"] and "SpO2" in p["motivo"]
    assert liga(p, "04:A3")["ausencia"] == "F1" and liga(p, "04:A3")["activacion"] is None


def test_sin_dato_es_faltante_nunca_cero(tmp_path):
    filas = p03_filas(ultimo=18)
    filas.append(fila("R1", "04:A3", None, dia(19), clase="oximetro_dedo", nivel="N1", contexto="sueno",
                      sin_dato="sin_dato: oximetro desconectado"))
    for vid, m, de, clase, nivel, ctx in P03:
        if vid != "04:A3":
            filas.append(fila("R1", vid, m, dia(19), clase=clase, nivel=nivel, contexto=ctx))
    r = _ev(filas, tmp_path)
    p = pad(r, "R1", "P03")
    l = liga(p, "04:A3")
    assert l["ausencia"] == "F2" and "oximetro desconectado" in l["motivo_ausencia"]
    assert l["activacion"] is None and l["aporte"] is None and l["cuenta_en_T"] is False
    assert p["T"] == 0.0 and p["T_max"] > p["T"]                       # lo no medido queda en T_max, no en T
    assert p["color"] in ("GRIS", "VERDE")                              # SpO2 (peso 3) no cuenta como dato


def test_estructurales_en_vuelo_p02_y_p14(tmp_path):
    r = _ev(p03_filas(), tmp_path)
    for pid in ("P02", "P14"):
        p = pad(r, "R1", pid)
        assert p["color"] == "GRIS" and p["estructural"] is True and "estructural" in p["motivo"]
    assert r["personas"]["R1"]["fase"] in ("VT",)


def test_dato_n4_no_respalda_verde_ni_da_rojo(tmp_path):
    """El nucleo de P03 (SpO2, FR, PIO2) llega solo como N4, incluso con valores extremos: ni VERDE ni ROJO."""
    extremos = {"04:A3": 80, "04:A2": 30, "04:A25": 10}
    r = _ev(p03_filas(n4=("04:A3", "04:A2", "04:A25"), extra_final=extremos), tmp_path)
    p = pad(r, "R1", "P03")
    assert p["color"] != "VERDE" and p["color"] != "ROJO"
    assert p["nucleo_con_dato"] is False
    n4 = [liga(p, v) for v in ("04:A3", "04:A2", "04:A25")]
    assert all(l["nivel_calidad"] == "N4" for l in n4)


def test_feve_no_cambia_ningun_color(tmp_path):
    base = p03_filas()
    con = base + [fila("R1", "01:V18", 20, dia(i), nivel="N4", clase="modelo_eco", unidad="%", decide=False) for i in range(10, 20)]
    a = _ev(base, tmp_path)
    b = _ev(con, tmp_path)
    ca = {p["padecimiento_id"]: (p["color"], p["T"], p["T_inf"]) for p in a["personas"]["R1"]["padecimientos"]}
    cb = {p["padecimiento_id"]: (p["color"], p["T"], p["T_inf"]) for p in b["personas"]["R1"]["padecimientos"]}
    assert ca == cb
    # 01:V18 ya tiene ligas (P01 y P02), pero con decide=False no hay dato en ellas
    for pid in ("P01", "P02"):
        l = liga(pad(b, "R1", pid), "01:V18")
        assert l.get("criterio") is None and l.get("valor") is None


def test_rojo_centinela_solo_con_persona_y_no_n4(tmp_path):
    f = lambda nivel, clase: [fila("R1", "04:A37", 1, "2026-09-05", nivel=nivel, clase=clase, unidad="presencia_0_1")]
    persona = pad(_ev(f("N3a", "autorreporte"), tmp_path), "R1", "P10")
    assert persona["color"] == "ROJO" and "R-3" in persona["condiciones"]
    n4 = pad(_ev(f("N4", "modelo_eco"), tmp_path), "R1", "P10")
    assert n4["color"] != "ROJO"


def test_orden_fijo_color_t_inf(tmp_path):
    r = _ev(p03_filas() + [fila("R1", "04:A37", 1, dia(19), nivel="N3a", clase="autorreporte", unidad="presencia_0_1")], tmp_path)
    cols = [p["color"] for p in r["personas"]["R1"]["padecimientos"]]
    orden = {"ROJO": 0, "AMARILLO": 1, "GRIS": 2, "VERDE": 3}
    assert [orden[c] for c in cols] == sorted(orden[c] for c in cols)
    assert len(cols) == 20 and cols[0] == "ROJO"
