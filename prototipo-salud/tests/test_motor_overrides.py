"""Overrides del usuario (DISENO §6): no tocan las tablas con fuente; restaurar() vuelve a los valores con fuente."""
import hashlib
from pathlib import Path

import pytest

from motor import evaluar, parametros as P, tablas
from motor_testutil import df, fila, liga, pad

RAIZ = Path(__file__).resolve().parents[1]
CSV = [RAIZ / "datos" / "modelo" / "PADECIMIENTOS.csv", RAIZ / "datos" / "modelo" / "PADECIMIENTO-VARIABLE.csv"]


def _sha():
    return [hashlib.sha256(p.read_bytes()).hexdigest() for p in CSV]


def _cefalea():
    return df([fila("R1", "03:V82", 1, "2026-09-05", nivel="N1", clase="autorreporte", unidad="presencia_0_1")])


def test_override_de_liga_marca_modificado_no_toca_csv_y_restaurar(tmp_path):
    ruta = tmp_path / "overrides.json"
    antes = _sha()
    real = RAIZ / "datos" / "modelo" / "overrides.json"            # el de la instalación (puede existir): no se toca
    real_antes = real.read_bytes() if real.exists() else None
    P.guardar_override_liga("P07", "03:V82", peso=2.0, ruta=ruta)
    tb = tablas.cargar(ruta_overrides=ruta)
    l = tb.liga("P07", "03:V82")
    assert l["mu"] == 2.0 and bool(l["modificado_por_usuario"]) is True and "sin fuente" in l["mu_fuente"]
    # el motor usa el peso del usuario y lo rotula
    r = evaluar(_cefalea(), canal="real", ruta_estado=tmp_path / "e.json", guardar=False, ruta_overrides=ruta)
    p07 = pad(r, "R1", "P07")
    lj = liga(p07, "03:V82")
    assert p07["T"] == pytest.approx(2.0) and lj["peso"] == 2.0 and lj["modificado_por_usuario"] is True
    assert _sha() == antes                                            # los CSV con fuente no se escriben
    assert (real.read_bytes() if real.exists() else None) == real_antes
    assert P.restaurar(ruta) is True and not ruta.exists()
    tb2 = tablas.cargar(ruta_overrides=ruta)
    l2 = tb2.liga("P07", "03:V82")
    assert l2["mu"] == 3.0 and bool(l2["modificado_por_usuario"]) is False and "con fuente" in l2["mu_fuente"]
    assert _sha() == antes


def test_umbral_modificado_cambia_el_color_y_se_rotula(tmp_path):
    ruta = tmp_path / "overrides.json"
    base = evaluar(_cefalea(), canal="real", ruta_estado=tmp_path / "a.json", guardar=False, ruta_overrides=ruta)
    assert pad(base, "R1", "P07")["color"] == "AMARILLO"              # T = 3 >= 3 (umbral provisional por defecto)
    assert base["umbrales"]["T_amarillo"]["modificado_por_usuario"] is False
    P.guardar_override_umbral("T_amarillo", 4.0, ruta=ruta)
    antes = _sha()
    mod = evaluar(_cefalea(), canal="real", ruta_estado=tmp_path / "b.json", guardar=False, ruta_overrides=ruta)
    assert pad(mod, "R1", "P07")["color"] != "AMARILLO"
    u = mod["umbrales"]["T_amarillo"]
    assert u["valor"] == 4.0 and u["modificado_por_usuario"] is True and u["provisional"] is True
    assert _sha() == antes
    P.restaurar(ruta)
    assert pad(evaluar(_cefalea(), canal="real", ruta_estado=tmp_path / "c.json", guardar=False, ruta_overrides=ruta),
               "R1", "P07")["color"] == "AMARILLO"


def test_overrides_rechazan_valores_invalidos(tmp_path):
    ruta = tmp_path / "o.json"
    with pytest.raises(ValueError):
        P.guardar_override_liga("P07", "03:V82", peso=7, ruta=ruta)
    with pytest.raises(ValueError):
        P.guardar_override_umbral("alpha", 0.2, ruta=ruta)
    with pytest.raises(ValueError):
        P.guardar_override_umbral("cobertura_min", float("nan"), ruta=ruta)
    assert not ruta.exists()
