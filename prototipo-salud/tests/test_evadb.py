"""Puente con eva.db: BD temporal creada por el migrar de Node. Datos de PRUEBA (no son fisiología ni de nadie)."""
import shutil
import sqlite3
import subprocess
from pathlib import Path

import pytest

from motor import evadb, parametros, tablas

RAIZ = Path(__file__).resolve().parents[1]
BACKEND = RAIZ.parent / "Planeacion" / "Julio" / "backend"

pytestmark = pytest.mark.skipif(shutil.which("node") is None or not (BACKEND / "src" / "migrar.ts").exists(),
                                reason="sin node o sin migrar.ts")


@pytest.fixture()
def bd(tmp_path, monkeypatch):
    ruta = tmp_path / "eva.db"
    env = {**__import__("os").environ, "BD": str(ruta)}
    env.pop("MODELO_SALUD", None)
    r = subprocess.run(["node", "--experimental-strip-types", "--disable-warning=ExperimentalWarning",
                        str(BACKEND / "src" / "migrar.ts")], env=env, capture_output=True, text=True, timeout=60)
    assert r.returncode == 0, r.stderr
    assert "20 padecimientos, 348 vínculos" in r.stdout
    monkeypatch.setenv("EVA_DB", str(ruta))
    return ruta


def _poblar(ruta):
    con = sqlite3.connect(ruta)
    con.execute("INSERT INTO tripulantes (id, nombre, rol, sexo, edad) VALUES ('PRUEBA-1','Dato de prueba','test','F',40)")
    con.execute("INSERT INTO tripulantes (id, nombre) VALUES ('PRUEBA-2','Dato de prueba')")
    con.execute("INSERT INTO basales (tripulante, variable, valor) VALUES ('PRUEBA-1','04:A4',70)")
    con.execute("INSERT INTO fases (desde, entorno) VALUES ('2030-01-01T00:00:00Z','tierra'), ('2030-02-01T00:00:00Z','orbita')")
    for d in range(1, 6):
        con.execute("INSERT INTO muestras (tripulante, variable, valor, unidad, procedencia, t_scet, t_recibida, dispositivo, seq) "
                    "VALUES ('PRUEBA-1','04:A4',?,'bpm','sensor',?,?,NULL,?)",
                    (60 + d, f"2030-01-0{d}T08:00:00Z", f"2030-01-0{d}T08:00:01Z", d))
    con.execute("INSERT INTO muestras (tripulante, variable, valor, unidad, procedencia, calidad, t_scet, t_recibida, seq) "
                "VALUES ('PRUEBA-1','04:A4',99,'bpm','sensor','{\"contacto\":false}','2030-01-06T08:00:00Z','2030-01-06T08:00:01Z',6)")
    con.commit()
    con.close()


def test_semilla_y_lectura(bd):
    con = evadb.conectar()
    assert con.execute("SELECT COUNT(*) FROM padecimientos").fetchone()[0] == 20
    assert con.execute("SELECT COUNT(*) FROM padecimiento_variable").fetchone()[0] == 348
    con.close()
    _poblar(bd)
    info = evadb.reunir()
    assert info["hay"] and list(info["nativo"].columns) == evadb.cal.NATIVO_COLUMNAS
    nat = info["nativo"]
    assert len(nat) == 5                                    # la de sin contacto se omite
    assert set(nat["device_class"]) == {"desconocido"} and set(nat["simulated"]) == {"false"}
    assert nat["notes"].str.startswith("origen=eva.db").all()
    assert len(info["basales"]) == 1 and info["perfiles"] == {"PRUEBA-1": {"edad": 40.0, "sexo": "F"}}
    assert info["mision"]["PRUEBA-1"] == {"lanzamiento": "2030-02-01"}
    assert any("sin contacto" in a for a in info["avisos"])


def test_evaluar_escribe_filas(bd):
    _poblar(bd)
    r = evadb.evaluar_eva_db(guardar=True)
    assert r["hay"] and r["filas_escritas"] == 20 * len(r["resultado"]["personas"]) > 0
    con = sqlite3.connect(bd)
    filas = con.execute("SELECT color, canal, hora, detalle FROM evaluaciones").fetchall()
    assert len(filas) == r["filas_escritas"]
    assert all(f[0] in evadb.COLORES and f[1] == "real" and f[2].endswith("Z") and parametros.AVISO in f[3] for f in filas)
    con.close()
    assert evadb.main(["--evaluar"]) == 0


def test_simulado_se_guarda_como_simulado(bd):
    r = evadb.evaluar_eva_db(guardar=True, simulado=True)
    assert r["filas_escritas"] > 0
    con = sqlite3.connect(bd)
    assert {c for (c,) in con.execute("SELECT DISTINCT canal FROM evaluaciones")} == {"SIMULADO"}
    con.close()


def test_pesos_usuario_en_bd_y_fallback(bd, tmp_path, monkeypatch):
    assert parametros.origen_overrides() == f"eva.db: {bd}"
    parametros.guardar_override_liga("P07", "03:V82", peso=2.0)
    parametros.guardar_override_umbral("T_amarillo", 4.0)
    con = sqlite3.connect(bd)
    fila = con.execute("SELECT tipo, peso, modificado_por_usuario, modificado FROM pesos_usuario WHERE clave='liga|P07|03:V82'").fetchone()
    assert fila[0] == "liga" and fila[1] == 2.0 and fila[2] == 1 and fila[3]
    con.close()
    ov = parametros.leer_overrides()
    assert ov["ligas"]["P07|03:V82"]["peso"] == 2.0 and ov["umbrales"]["T_amarillo"]["valor"] == 4.0
    assert tablas.cargar().liga("P07", "03:V82")["mu"] == 2.0
    assert not parametros.RUTA_OVERRIDES.exists()               # no se escribió el JSON
    assert parametros.quitar_override_umbral("T_amarillo") is True
    assert parametros.restaurar() is True
    assert tablas.cargar().liga("P07", "03:V82")["mu"] == 3.0
    con = sqlite3.connect(bd)
    assert con.execute("SELECT COUNT(*) FROM pesos_usuario").fetchone()[0] == 0
    con.close()
    monkeypatch.delenv("EVA_DB")
    assert parametros.origen_overrides() == "overrides.json"
    parametros.guardar_override_liga("P07", "03:V82", peso=1.0)
    assert parametros.RUTA_OVERRIDES.exists()
    parametros.restaurar()


def test_bd_sin_tablas_es_no_hay_bd(tmp_path, monkeypatch):
    ruta = tmp_path / "vacia.db"
    sqlite3.connect(ruta).close()
    monkeypatch.setenv("EVA_DB", str(ruta))
    assert parametros.origen_overrides() == "overrides.json"
    assert evadb.reunir()["hay"] is False
    monkeypatch.setenv("EVA_DB", str(tmp_path / "no_existe.db"))
    assert evadb.ruta_eva_db() is None
