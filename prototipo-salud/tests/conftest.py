import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import pytest


@pytest.fixture(autouse=True, scope="session")
def _overrides_aislados(tmp_path_factory):
    """Los tests no leen ni escriben `datos/modelo/overrides.json` de la instalación (valores del usuario)."""
    try:
        from motor import parametros
    except Exception:  # noqa: BLE001  (instalación sin el motor: nada que aislar)
        yield None
        return
    mp = pytest.MonkeyPatch()
    ruta = tmp_path_factory.mktemp("overrides") / "overrides_de_prueba.json"
    mp.setattr(parametros, "RUTA_OVERRIDES", ruta)
    yield ruta
    mp.undo()


@pytest.fixture(autouse=True)
def _overrides_limpios(_overrides_aislados):
    """Cada test empieza y termina sin overrides en la ruta de prueba."""
    yield
    if _overrides_aislados is not None and _overrides_aislados.exists():
        _overrides_aislados.unlink()
