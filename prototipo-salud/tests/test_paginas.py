"""Vistas de app.py con streamlit.testing.v1.AppTest (sin servidor). No dejan overrides.json ni archivos en outputs/."""
import re
from pathlib import Path

import pytest
from streamlit.testing.v1 import AppTest

RAIZ = Path(__file__).resolve().parents[1]
OVERRIDES = RAIZ / "datos" / "modelo" / "overrides.json"
CAL_SIM = RAIZ / "datos" / "simulado" / "calibracion_SIMULADO.json"
CAL_REAL = RAIZ / "datos" / "estado" / "calibracion_real.json"


def _outputs():
    return sorted(str(p.relative_to(RAIZ)) for p in (RAIZ / "outputs").rglob("*"))


@pytest.fixture(autouse=True)
def aislado(tmp_path, monkeypatch):
    """Estado de la página (contexto y calibración) en tmp_path; verifica que no queden archivos del repositorio."""
    monkeypatch.setenv("PROTOTIPO_ESTADO_DIR", str(tmp_path))
    raw = tmp_path / "raw_vacio"                      # no depende de los runs que haya en outputs/raw de la instalación
    raw.mkdir()
    monkeypatch.setenv("PROTOTIPO_RAW_DIR", str(raw))
    antes = (OVERRIDES.exists(), CAL_SIM.exists(), CAL_REAL.exists(), _outputs())
    yield
    assert (OVERRIDES.exists(), CAL_SIM.exists(), CAL_REAL.exists(), _outputs()) == antes


def _app():
    at = AppTest.from_file(str(RAIZ / "app.py"), default_timeout=120)
    at.run()
    return at


def _vista(at, nombre):
    at.sidebar.radio(key="vista").set_value(nombre).run()
    return at


def _textos(at):
    partes = []
    for tipo in ("title", "header", "subheader", "markdown", "caption", "warning", "info", "success", "error", "text"):
        partes += [str(e.value) for e in getattr(at, tipo)]
    partes += [b.label for b in at.button]
    return "\n".join(partes)


def test_vista_por_defecto_conserva_las_secciones_0_a_7():
    at = _app()
    assert not at.exception, [e.value for e in at.exception]
    assert at.sidebar.radio(key="vista").value == "Modelos y sensores"
    assert at.sidebar.radio(key="vista").options == ["Modelos y sensores", "Padecimientos", "Configuración"]
    enc = [h.value for h in at.header]
    for esperado in ("0. Estado de modelos", "1. Carga de video o estudio", "2. Selección de modelo y opciones",
                     "3. Ejecutar", "4. Resultados (salidas reales de modelos)", "5. Sensores (reloj y otros dispositivos)",
                     "6. Tabla conjunta, comparación y alertas", "7. Descargas"):
        assert esperado in enc


def test_vista_padecimientos():
    at = _vista(_app(), "Padecimientos")
    assert not at.exception, [e.value for e in at.exception]
    t = _textos(at)
    assert "SIMULADO" in t and "No es un diagnóstico" in t
    assert "No hay mediciones reales guardadas" in t
    ids = {b.key.removeprefix("ver_") for b in at.button if b.key and b.key.startswith("ver_")}
    assert ids == {f"P{i:02d}" for i in range(1, 21)}
    # el rótulo grande SIMULADO y el selector rotulado
    assert any('class="rotulo-simulado"' in str(m.value) for m in at.markdown)
    assert at.selectbox(key="pad_persona").options[0] == "SIM-T01 · SIMULADO"
    # detalle de un padecimiento
    at.button(key="ver_P04").click().run()
    assert not at.exception, [e.value for e in at.exception]
    assert any(s.value.startswith("Detalle: P04") for s in at.subheader)
    assert len(at.dataframe) >= 2
    t = _textos(at)
    assert "Cálculo paso a paso" in t and "Por qué este color" in t


def test_vista_padecimientos_sin_vocabulario_prohibido():
    at = _vista(_app(), "Padecimientos")
    at.button(key="ver_P04").click().run()
    t = _textos(at)
    sin_frase = t.replace("No es un diagnóstico", "")
    for prohibido in ("ell0", "ell_orden", "π", "diagnóstico", "enfermo", "riesgo de"):
        assert prohibido not in sin_frase, prohibido
    assert not re.search(r"\d\s?%\s*(de )?(probabilidad|riesgo)", t)
    assert sin_frase.count("sano") == 1                       # solo en la frase del aviso


def test_vista_configuracion():
    at = _vista(_app(), "Configuración")
    assert not at.exception, [e.value for e in at.exception]
    assert "Restaurar valores con fuente" in [b.label for b in at.button]
    t = _textos(at)
    assert "No hay valores modificados" in t and "Guardar umbrales" in t
    assert "Guardar cambios de este padecimiento" in t


def test_configuracion_guardar_y_restaurar_con_overrides_temporales(tmp_path, monkeypatch):
    """Guarda un umbral, ve la tabla de modificados y restaura; usa una ruta temporal de overrides."""
    from motor import parametros
    tmp = tmp_path / "overrides.json"
    monkeypatch.setattr(parametros, "RUTA_OVERRIDES", tmp)
    at = _vista(_app(), "Configuración")
    at.number_input(key="umb_T_amarillo_0").set_value(3.5)
    at.button(key="cfg_guardar_umbrales").click().run()
    assert not at.exception, [e.value for e in at.exception]
    assert tmp.exists() and parametros.umbrales(tmp)["T_amarillo"]["valor"] == 3.5
    assert "Valores modificados por el usuario" in _textos(at) and "T_amarillo" in str(at.dataframe[-1].value)
    at.checkbox(key="cfg_conf_1").set_value(True).run()
    at.button(key="cfg_restaurar").click().run()
    assert not at.exception, [e.value for e in at.exception]
    assert not tmp.exists()
    assert "No hay valores modificados" in _textos(at)


def test_aplicar_umbrales_y_ligas_quitan_el_override_al_volver_al_valor_con_fuente(tmp_path, monkeypatch):
    import pandas as pd
    from motor import parametros, tablas
    from paginas import configuracion as cfg
    tmp = tmp_path / "overrides.json"
    monkeypatch.setattr(parametros, "RUTA_OVERRIDES", tmp)
    defecto = {n: u["valor_defecto"] for n, u in parametros.umbrales().items()}
    # umbrales: solo se guarda el que difiere
    assert cfg.aplicar_umbrales({**defecto, "T_amarillo": 4.0}) == (["T_amarillo"], [], [])
    assert list(parametros.leer_overrides()["umbrales"]) == ["T_amarillo"]
    assert cfg.aplicar_umbrales({**defecto, "T_amarillo": 4.0}) == ([], [], [])          # sin cambios
    assert cfg.aplicar_umbrales(defecto) == ([], ["T_amarillo"], [])                      # vuelve al defecto
    assert not tmp.exists()
    assert cfg.aplicar_umbrales({**defecto, "T_amarillo": -1})[2]                         # inválido: error, nada guardado
    # ligas
    tb = tablas.cargar(aplicar_overrides=False).ligas_de("P04")
    ed = pd.DataFrame({"id": tb["variable_id"], "peso": tb["prior_media"].astype(float), "prior_de": tb["prior_de"].astype(float)})
    ed.loc[ed.index[0], "peso"] = 1.0 if ed["peso"].iloc[0] != 1.0 else 2.0
    ed.loc[ed.index[1], "prior_de"] = ed["prior_de"].iloc[1] + 0.25
    g, q, e = cfg.aplicar_ligas("P04", ed)
    assert len(g) == 2 and not q and not e and set(parametros.leer_overrides()["ligas"]) == {f"P04|{v}" for v in g}
    assert cfg.aplicar_ligas("P04", ed) == ([], [], [])
    orig = pd.DataFrame({"id": tb["variable_id"], "peso": tb["prior_media"].astype(float), "prior_de": tb["prior_de"].astype(float)})
    g, q, e = cfg.aplicar_ligas("P04", orig)
    assert not g and len(q) == 2 and not e and not tmp.exists()
    bad = orig.copy()
    bad.loc[bad.index[0], "peso"] = 5.0
    assert cfg.aplicar_ligas("P04", bad)[2] and not tmp.exists()


def test_vista_padecimientos_canal_real_con_contexto(tmp_path):
    """Prueba de interfaz: el ejemplo de sensores se declara simulated=false SOLO en memoria para ejercitar el
    canal real (no son datos de nadie). Las personas reales van primero y no llevan el rótulo SIMULADO."""
    import pandas as pd
    df = pd.read_csv(RAIZ / "sensores" / "ejemplo_sintetico_sensores.csv")
    df["simulated"] = False
    at = AppTest.from_file(str(RAIZ / "app.py"), default_timeout=120)
    at.session_state["sens_df"] = df
    at.run()
    _vista(at, "Padecimientos")
    assert not at.exception, [e.value for e in at.exception]
    ops = at.selectbox(key="pad_persona").options
    assert ops[0] in ("SIM-A01", "SIM-B02") and "SIM-T01 · SIMULADO" in ops and ops.index("SIM-T01 · SIMULADO") >= 2
    assert not any('class="rotulo-simulado"' in str(m.value) for m in at.markdown)
    assert "No hay mediciones reales guardadas" not in _textos(at)
    assert "Contexto de la persona (opcional)" in [x.label for x in at.expander]
    sid = ops[0]
    at.number_input(key=f"ctx_edad_{sid}").set_value(35)
    at.selectbox(key=f"ctx_sexo_{sid}").set_value("F")
    at.checkbox(key=f"ctx_rep_{sid}").set_value(True)
    at.button(key=f"ctx_guardar_{sid}").click().run()
    assert not at.exception, [e.value for e in at.exception]
    import json
    c = json.loads((tmp_path / "contexto_personas.json").read_text(encoding="utf-8"))["personas"][sid]
    assert c == {"lanzamiento": None, "edad": 35, "sexo": "F", "ecg_en_reposo": True}
