"""Aritmetica de DISENO §7 y canal bayesiano (ALGORITMOS d.2, d.4, d.7). PROVISIONAL; nada es un diagnostico."""
import math

import pytest

from motor import evaluar, tablas
from motor_testutil import MISION, df, dia, fila, liga, pad, serie

TOL = 0.01


def _eval(filas, tmp_path, **kw):
    return evaluar(df(filas), canal="real", ruta_estado=tmp_path / "est.json", guardar=False, **kw)


@pytest.mark.parametrize("nivel,esperado", [("N1", 2.18), ("N2", 1.36), ("N4", 0.53)])
def test_liga_de_peso_3_t_inf_por_nivel(tmp_path, nivel, esperado):
    """Una liga de peso 3 (nivel A en la tabla) totalmente activada: T = 3 y T_inf = 2.18 / 1.36 / 0.53 (A / B / C)."""
    r = _eval([fila("R1", "03:V82", 1, "2026-09-05", nivel=nivel, clase="autorreporte", unidad="presencia_0_1")], tmp_path)
    p07 = pad(r, "R1", "P07")
    assert p07["T"] == pytest.approx(3.0, abs=TOL)
    assert p07["T_inf"] == pytest.approx(esperado, abs=TOL)
    assert liga(p07, "03:V82")["peso"] == 3.0


def test_p01_solo_adaptador_ecg(tmp_path):
    """Bandera = 1 (3, A -> C), QTc cumple criterio (2, B -> C), latidos en el grupo de la bandera: T = 5, DE = 2.12, T_inf = 1.51."""
    d = "2026-09-05"
    kw = dict(clase="ecg_adaptador", nivel="N4")
    filas = [fila("R1", "01:V31", 1, d, unidad="bandera_0_1_no_diagnostica", **kw),
             fila("R1", "01:V34", 470, d, unidad="ms", **kw),
             fila("R1", "01:V32", 5000, d, unidad="latidos/24 h", **kw)]
    r = _eval(filas, tmp_path, perfiles={"R1": {"edad": 40, "sexo": "M"}})
    p01 = pad(r, "R1", "P01")
    assert p01["T"] == pytest.approx(5.0, abs=TOL)
    assert p01["T_de"] == pytest.approx(2.12, abs=TOL)
    assert p01["T_inf"] == pytest.approx(1.51, abs=TOL)
    assert p01["color"] == "AMARILLO" and p01["todo_n4"] is True
    assert "A1" in p01["condiciones"] and "A3" in p01["condiciones"]
    assert "onfirmar" in p01["motivo"]
    # el latido irregular no suma: comparte grupo con la bandera
    v32 = liga(p01, "01:V32")
    assert v32["cuenta_en_T"] is False
    assert p01["dL"] is None                          # la bandera del adaptador nunca usa Taggar


def test_p01_nunca_rojo_aunque_persista(tmp_path):
    d0 = 5
    filas = []
    for i in range(d0, d0 + 4):
        filas += [fila("R1", "01:V31", 1, dia(i), unidad="bandera_0_1_no_diagnostica", clase="ecg_adaptador", nivel="N4"),
                  fila("R1", "01:V34", 470, dia(i), unidad="ms", clase="ecg_adaptador", nivel="N4")]
    r = _eval(filas, tmp_path)
    p01 = pad(r, "R1", "P01")
    assert {h["color"] for h in p01["historial"]} <= {"AMARILLO", "GRIS"}
    assert "ROJO" not in {h["color"] for h in p01["historial"]}


def test_todo_n4_nunca_rojo_aunque_t_inf_alto(tmp_path):
    """P12: tres ligas de peso 3 presentes en N4 dan T_inf alto, pero todas las activas son N4: nunca ROJO (b.2, f.1)."""
    filas = []
    for i in range(3):
        for vid in ("01:V86", "01:V71", "01:V72"):
            filas.append(fila("R1", vid, 1, dia(i), nivel="N4", clase="captura_manual", unidad="presencia_0_1"))
    r = _eval(filas, tmp_path)
    p12 = pad(r, "R1", "P12")
    assert p12["T_inf"] >= 2.0 and all(h["T_inf"] >= 2.0 for h in p12["historial"])
    assert p12["todo_n4"] and p12["color"] == "AMARILLO" and "ROJO" not in {h["color"] for h in p12["historial"]}
    assert "onfirmar" in p12["motivo"]


def _p04(tmp_path, dias_vuelo):
    filas = serie("R1", "01:V3", 60, 1.0, 0, 11, nivel="N1", clase="ecg_prenda_holter", contexto="sueno")
    filas += serie("R1", "04:A1", 36.6, 0.1, 0, 11, nivel="N3b", clase="termometro_oral", metodo="termometro")
    for i in dias_vuelo:
        filas.append(fila("R1", "01:V3", 95, dia(i), nivel="N1", clase="ecg_prenda_holter", contexto="sueno"))
        filas.append(fila("R1", "04:A1", 38.5, dia(i), nivel="N3b", clase="termometro_oral", metodo="termometro"))
    return _eval(filas, tmp_path, mision={"R1": {"lanzamiento": "2026-09-13", "aterrizaje": None}})


def test_p04_fc_y_temperatura_alertadas(tmp_path):
    """FC alertada (2, A, N1) + temperatura alertada (3, B, N3b): T = 5, DE = 1.12, T_inf = 3.16; AMARILLO el primer dia, ROJO al persistir 24 h."""
    r = _p04(tmp_path, [19, 20])
    p04 = pad(r, "R1", "P04")
    h = {x["fecha"]: x for x in p04["historial"]}
    primero, segundo = h["2026-09-20"], h["2026-09-21"]
    assert primero["T"] == pytest.approx(5.0, abs=TOL)
    assert primero["T_inf"] == pytest.approx(3.16, abs=TOL)
    assert primero["color"] == "AMARILLO"
    assert segundo["color"] == "ROJO" and "R-1" in segundo["condiciones"]
    assert p04["T_de"] == pytest.approx(1.12, abs=TOL)
    assert p04["color"] == "ROJO"
    # canal bayesiano: LR+ 1.8 por debajo del corte de AMARILLO
    assert p04["dL"] == pytest.approx(math.log(1.8), abs=TOL) and p04["dL"] < math.log(3)


# ------------------------------------------------------------------------------------------ canal bayesiano
def test_bayes_solo_seis_ligas_y_bandera_n4_sin_taggar(tmp_path):
    d = "2026-09-05"
    filas = [fila("R1", "01:V31", 1, d, unidad="bandera_0_1_no_diagnostica", clase="ecg_adaptador", nivel="N4"),
             fila("R1", "03:V1", 12, d, nivel="N1", clase="cuestionario_phq9", metodo="cuestionario_completo", unidad="puntos"),
             fila("R1", "04:A23", 3.5, d, nivel="N3a", clase="analizador_cabina", metodo="sensor_cabina", unidad="mmHg"),
             fila("R1", "03:V82", 1, d, nivel="N3a", clase="autorreporte", unidad="presencia_0_1")]
    r = _eval(filas, tmp_path)
    permitidas = set(tablas.LR_LIGAS)
    for p in r["personas"]["R1"]["padecimientos"]:
        for l in p["ligas"]:
            if l["bayes"] is not None:
                assert (p["padecimiento_id"], l["variable_id"]) in permitidas
    p01 = pad(r, "R1", "P01")
    assert liga(p01, "01:V31")["bayes"]["kappa"] == 0 and p01["dL"] is None
    p09 = pad(r, "R1", "P09")
    assert p09["dL"] == pytest.approx(math.log(0.88 / 0.12), abs=TOL)       # ln LR+ = 1.99
    p07 = pad(r, "R1", "P07")
    assert p07["dL"] == pytest.approx(math.log(2) * (3.5 - 2.5), abs=TOL)   # ln 2 x (media - 2.5)


def test_bayes_lectura_humana_usa_taggar_y_canales_no_se_suman(tmp_path):
    d = "2026-09-05"
    r = _eval([fila("R1", "01:V31", 1, d, unidad="bandera_0_1_no_diagnostica", clase="lectura_humana_ecg", nivel="N1",
                    metodo="lectura_humana")], tmp_path)
    p01 = pad(r, "R1", "P01")
    assert p01["dL"] == pytest.approx(1.63, abs=TOL)
    assert p01["dL_de"] == pytest.approx(1.63 * 0.5 / 3, abs=TOL)
    assert "A2" in p01["condiciones"] and p01["color"] == "AMARILLO"
    assert p01["T"] == pytest.approx(3.0, abs=TOL)                          # T no incluye dL (no se suman)
    assert p01["prior"] is None and "prior no disponible" in p01["etiquetas"]


def test_bayes_negativo_sin_lr_menos_aporta_cero_y_phq9_capa_fija(tmp_path):
    d = "2026-09-05"
    r = _eval([fila("R1", "04:A1", 36.7, d, nivel="N3b", clase="termometro_oral", metodo="termometro"),
               fila("R1", "03:V1", 14, d, nivel="N1", clase="cuestionario_phq9", metodo="cuestionario_completo", unidad="puntos")],
              tmp_path)
    p04 = pad(r, "R1", "P04")
    assert liga(p04, "04:A1")["bayes"]["ln_lr"] == 0.0 and p04["dL"] == 0.0
    p09 = pad(r, "R1", "P09")
    assert "A5" in p09["condiciones"] and p09["color"] == "AMARILLO"
    phq = next(c for c in p09["capas_fijas"] if c["nombre"] == "PHQ-9")
    assert phq["supera_criterio"] is True and "14" in phq["estado"]
    assert "por capa fija [terrestre]" in p09["etiquetas"]
