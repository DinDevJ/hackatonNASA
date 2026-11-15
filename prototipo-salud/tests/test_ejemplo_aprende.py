"""El ejemplo SIMULADO de autocalibracion: mismo valor, distinta lectura segun la base personal."""
from validacion import ejemplo_aprende as E


def test_mismo_valor_distinta_lectura():
    r = E.evaluar(E._serie(0))
    a, b = r["SIM-A"], r["SIM-B"]
    assert a["z_poblacional"] == b["z_poblacional"]
    assert a["estado"] == "alertada" and a["z_personal"] > 3
    assert b["estado"] == "normal" and abs(b["z_personal"]) < 1.5
    assert a["base_mu"] < 65 < b["base_mu"]
