"""
Puente mínimo a DeepACSA (Ritsche et al., Apache-2.0, doi:10.5281/zenodo.19130694).
Ejecuta el modelo oficial sin reentrenar, usando las funciones originales de DeepACSA v0.3.2:
import_image_efov → calibrate_distance_efov → ApoModel.predict_e → calc_area_efov.

Único cambio: DeepACSA importa `keras` (Keras 2); con TensorFlow 2.18 se redirige a `tf_keras`.

Uso:  python deepacsa_bridge.py <src_deepacsa> <modelo.h5> <musculo> <profundidad_cm> <img1> [img2 ...]
Salida: JSON por stdout.
"""
import json
import os
import sys

os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "3")
os.environ.setdefault("TF_ENABLE_ONEDNN_OPTS", "0")
os.environ["TF_USE_LEGACY_KERAS"] = "1"  # tensorflow.keras → tf_keras (Keras 2), como espera DeepACSA

import tf_keras  # noqa: E402
import tf_keras.backend  # noqa: E402,F401
import tf_keras.callbacks  # noqa: E402,F401
import tf_keras.layers  # noqa: E402,F401
import tf_keras.models  # noqa: E402,F401
import tf_keras.optimizers  # noqa: E402,F401

for nombre, modulo in list(sys.modules.items()):
    if nombre == "tf_keras" or nombre.startswith("tf_keras."):
        sys.modules["keras" + nombre[len("tf_keras"):]] = modulo


def main() -> None:
    src, modelo, musculo, profundidad = sys.argv[1], sys.argv[2], sys.argv[3], float(sys.argv[4])
    imagenes = sys.argv[5:]
    sys.path.insert(0, src)
    # Los __init__ de DeepACSA cargan la interfaz gráfica (customtkinter). Se registran los
    # paquetes vacíos para importar solo los módulos de análisis, sin modificar su código.
    import types  # noqa: E402

    for paquete, carpeta in (("DeepACSA", ""), ("DeepACSA.gui_helpers", "gui_helpers")):
        m = types.ModuleType(paquete)
        m.__path__ = [os.path.join(src, "DeepACSA", carpeta)]
        sys.modules[paquete] = m

    import cv2  # noqa: E402
    from DeepACSA.gui_helpers.apo_model import ApoModel  # noqa: E402
    from DeepACSA.gui_helpers.calibrate import calibrate_distance_efov  # noqa: E402
    from DeepACSA.gui_helpers.predict_muscle_area import calc_area_efov, import_image_efov  # noqa: E402

    modelo_apo = ApoModel(None, modelo)
    salida = []
    for ruta in imagenes:
        filename, _img_copy, img, height, width = import_image_efov(ruta)
        longitud, img_lines = calibrate_distance_efov(ruta, musculo)
        if longitud is None:
            salida.append({"archivo": filename, "error": "No se encontró la línea de escala (EFOV)"})
            continue
        _circ, mascara, _fig = modelo_apo.predict_e(None, img, img_lines, filename, width, height)
        pixeles = int(cv2.countNonZero(mascara.astype("uint8")))
        salida.append(
            {
                "archivo": filename,
                "pixeles_mascara": pixeles,
                "linea_escala_px": float(longitud),
                "profundidad_cm": profundidad,
                "area_cm2": float(calc_area_efov(profundidad, longitud, mascara.astype("uint8"))),
            }
        )
    print(json.dumps(salida))


if __name__ == "__main__":
    main()
