"""Capa 3 (c.4): solo contexto y etiquetas; nunca cambia una base ni apaga una alerta. PROVISIONAL."""
import pytest

from motor import evaluar
from motor_testutil import OFFSETS, df, dia, fila, liga, pad


def _crew(n, desviadas, ruta=None):
    filas = []
    for k in range(n):
        sid = f"C{k}"
        for i in range(12):
            filas.append(fila(sid, "04:A23", 2.0 + 0.05 * k + 0.1 * OFFSETS[i], dia(i), nivel="N3a", clase="analizador_cabina",
                              metodo="sensor_cabina"))
        v = 2.0 + 0.05 * k + (1.0 if k in desviadas else 0.0)
        filas.append(fila(sid, "04:A23", v, dia(12), nivel="N3a", clase="analizador_cabina", metodo="sensor_cabina"))
    mis = {f"C{k}": {"lanzamiento": "2026-09-13", "aterrizaje": None} for k in range(n)}
    return evaluar(df(filas), mision=mis, canal="real", ruta_estado=ruta or "sin_estado.json", guardar=False)


def _l(r, k):
    return liga(pad(r, f"C{k}", "P07"), "04:A23")


def test_desviacion_compartida_y_alerta_individual_intacta():
    r = _crew(5, desviadas={0, 1, 2, 3, 4})
    for k in range(5):
        l = _l(r, k)
        assert "desviación compartida" in l["etiquetas"]
        assert l["estado_variable"] in ("alertada", "persistente") and l["activacion"] == pytest.approx(1.0)   # nada se apaga
        assert l["delta_tripulacion"]["modo"] == "descriptiva"


def test_desviacion_aislada_no_aplica_con_n_menor_a_7_y_tres_es_inactiva():
    r = _crew(5, desviadas={0})
    assert "desviación compartida" not in _l(r, 0)["etiquetas"] and "desviación aislada" not in _l(r, 0)["etiquetas"]
    r3 = _crew(3, desviadas={0, 1, 2})
    assert _l(r3, 0)["delta_tripulacion"]["modo"] == "inactiva" and "desviación compartida" not in _l(r3, 0)["etiquetas"]
    r8 = _crew(8, desviadas={0})
    assert _l(r8, 0)["delta_tripulacion"]["modo"] == "etiquetas" and "desviación aislada" in _l(r8, 0)["etiquetas"]
