"""quitar_override_liga / quitar_override_umbral: vuelven al valor con fuente o por defecto, sin tocar los CSV."""
from motor import parametros as P, tablas


def test_quitar_override_liga_y_umbral(tmp_path):
    ruta = tmp_path / "overrides.json"
    assert P.quitar_override_liga("P07", "03:V82", ruta) is False and not ruta.exists()
    P.guardar_override_liga("P07", "03:V82", peso=2.0, prior_de=0.8, ruta=ruta)
    P.guardar_override_liga("P04", "04:A1", peso=1.0, ruta=ruta)
    P.guardar_override_umbral("T_amarillo", 3.5, ruta=ruta)
    P.guardar_override_umbral("cobertura_min", 0.4, ruta=ruta)

    assert P.quitar_override_liga("P07", "03:V82", ruta) is True
    d = P.leer_overrides(ruta)
    assert list(d["ligas"]) == ["P04|04:A1"] and set(d["umbrales"]) == {"T_amarillo", "cobertura_min"}
    assert tablas.cargar(ruta_overrides=ruta).liga("P07", "03:V82")["mu"] == 3.0   # valor con fuente
    assert P.quitar_override_liga("P07", "03:V82", ruta) is False                   # ya no existe

    assert P.quitar_override_umbral("T_amarillo", ruta) is True
    u = P.umbrales(ruta)
    assert u["T_amarillo"]["valor"] == u["T_amarillo"]["valor_defecto"] and not u["T_amarillo"]["modificado_por_usuario"]
    assert u["cobertura_min"]["modificado_por_usuario"] is True
    assert P.quitar_override_umbral("T_amarillo", ruta) is False


def test_al_quitar_el_ultimo_override_se_borra_el_archivo(tmp_path):
    ruta = tmp_path / "overrides.json"
    P.guardar_override_liga("P07", "03:V82", peso=2.0, ruta=ruta)
    P.guardar_override_umbral("T_amarillo", 3.5, ruta=ruta)
    assert P.quitar_override_umbral("T_amarillo", ruta) is True and ruta.exists()
    assert P.quitar_override_liga("P07", "03:V82", ruta) is True and not ruta.exists()
