"""Adaptador EchoNet-Dynamic (echonet/dynamic, commit e01d029).

Uso (con el python de envs/echonet_dynamic):
    python adapters/echonet_dynamic/infer.py --request <run_dir>/request.json --response <run_dir>/response.json

Dos componentes oficiales del repo:
  (a) FEVE con r2plus1d_18 (32 frames, periodo 2)         -> echonet/utils/video.py
  (b) segmentacion del VI con deeplabv3_resnet50 por frame -> echonet/utils/segmentation.py
SOLO vista apical 4 camaras (A4C). No es diagnostico. Areas en px^2 del frame 112x112 (sin calibracion).
NO se implementa el analisis latido a latido (scripts/beat_by_beat_analysis.R).
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from core import formato, modalidad, runs  # noqa: E402

MODEL = "echonet_dynamic"
ADMITIDAS = ["video_2d"]
EXT_VIDEO = modalidad.EXT_VIDEO
W_EF_REL = "weights/echonet_dynamic/r2plus1d_18_32_2_pretrained.pt"
W_EF_URL = "https://github.com/douyang/EchoNetDynamic/releases/download/v1.0.0/r2plus1d_18_32_2_pretrained.pt"
W_SEG_REL = "weights/echonet_dynamic/deeplabv3_resnet50_random.pt"
W_SEG_URL = "https://github.com/douyang/EchoNetDynamic/releases/download/v1.0.0/deeplabv3_resnet50_random.pt"

FRAMES, PERIOD = 32, 2        # video.py L33-34 y nombre del checkpoint r2plus1d_18_32_2
SIZE = 112                    # ConvertDICOMToAVI.ipynb: cropSize=(112,112)
BLOCK_EF = 20                 # video.py L37 (batch_size=20) usado como block_size en L238
BLOCK_SEG = 20                # segmentation.py: batch_size=20 (L258)

FUENTE_PREPROC = (
    "vendor/dynamic/echonet/utils/__init__.py L16-51 (loadvideo: cv2.VideoCapture, BGR->RGB, array 3xFxHxW uint8) y L78-121 "
    "(get_mean_and_std); vendor/dynamic/echonet/datasets/echo.py L155 (loadvideo), L169-178 (video -= mean; video /= std por canal), "
    "L181-197 (length=32, period=2, relleno con ceros si f < length*period), L199-201 (clips='all': start=np.arange(f-(length-1)*period)), "
    "L248 (video[:, s+period*arange(length)]); vendor/dynamic/echonet/utils/video.py L235-241 y L285-361 (run_epoch con "
    "block_size=20; media de las salidas de todos los clips L338-339); vendor/dynamic/echonet/utils/segmentation.py L113-116 "
    "(deeplabv3_resnet50, aux_loss=False, ultima capa del clasificador -> 1 canal), L235-238 (todos los frames: length=None, "
    "max_length=None, period=1), L258 (bloques de 20 frames), L265/L286 (mascara = logit>0; area = suma de pixeles), L289-292 "
    "(sistole por scipy.signal.find_peaks(-size, distance=20, prominence=0.5*trim_range)); conversion a 112x112: "
    "vendor/dynamic/scripts/ConvertDICOMToAVI.ipynb (celda 2 mask(), celda 3 makeVideo: recorte cuadrado centrado, margen 10 %, "
    "cv2.resize INTER_CUBIC a 112x112, canal 0 replicado en 3 canales, mascara del sector); pesos y arquitectura: "
    "vendor/dynamic/scripts/InitializationNotebook.ipynb (URLs, r2plus1d_18 + fc->1, quitar prefijo 'module.')."
)
DESVIACIONES = [
    "mean/std: el repo los calcula sobre el conjunto de entrenamiento (video.py L141, segmentation.py L132) o, para videos externos, "
    "sobre el propio conjunto externo con get_mean_and_std (InitializationNotebook). Aqui se calculan sobre TODOS los pixeles del "
    "propio video ya convertido a 112x112 (la funcion oficial toma un clip aleatorio de 16 frames por video). Desviacion explicita: preprocesamiento_adaptado.",
    "conversion a 112x112 de videos que no lo son: se replican los pasos de ConvertDICOMToAVI.ipynb, salvo el recorte del encabezado DICOM "
    "(yCrop por filas negras en frame 0, especifico de DICOM) que se omite en MP4/AVI ya sin encabezado; el canal usado es el 0 (R tras BGR->RGB), como el notebook.",
    "torchvision 0.20: weights=None / weights_backbone=None en lugar de pretrained=False (torch 1.8 / torchvision 0.9 del requirements.txt); "
    "sin torch.nn.DataParallel (se quita el prefijo 'module.' del state_dict); torch 2.5.1, Python 3.11, numpy 1.26 en lugar de numpy 1.20/opencv 4.5.1.",
    "inferencia en fp32 con batch por bloques de 20 clips/frames como el repo; los pesos se leen con torch.load(weights_only=True) + torch.serialization.safe_globals de numpy (escalares/dtypes); solo si eso da UnpicklingError, o si options.torch_load_weights_only=false, se usa weights_only=False tras verificar nombre oficial y tamano exacto en bytes (el sha256 oficial no se conoce; se registra el calculado). La clave checkpoint.carga del JSON dice el camino usado.",
    "systole: el repo calcula trim_min/trim_max con sorted(size)[round(len(size) ** 0.05)] / ** 0.95 (potencia, no fraccion); se replica literalmente. "
    "El repo NO detecta diastole por area (solo usa los indices humanos LargeIndex/SmallIndex del dataset): no se inventa.",
    "clips='all' del repo usa np.arange(f-(length-1)*period) (excluye el ultimo inicio posible); se replica tal cual.",
]


def msg_pesos(rel):
    return f"No se encuentran los pesos de EchoNet-Dynamic ({rel}). Ejecuta scripts\\descargar_pesos.ps1 -Modelo echonet_dynamic"


# --------------------------------------------------------------------------------------------- video / preprocesamiento
def loadvideo(path):
    """echonet/utils/__init__.py L16-51: devuelve uint8 (3, F, H, W) RGB."""
    import cv2
    import numpy as np
    p = Path(path)
    if p.suffix.lower() not in EXT_VIDEO:
        raise ValueError(f"{p.name}: formato no soportado (solo videos {sorted(EXT_VIDEO)}; DICOM aun no se decodifica: convierte a AVI/MP4)")
    cap = cv2.VideoCapture(str(p))
    if not cap.isOpened():
        raise ValueError(f"OpenCV no pudo abrir {p.name}")
    fr = []
    while True:
        ok, f = cap.read()
        if not ok:
            break
        fr.append(cv2.cvtColor(f, cv2.COLOR_BGR2RGB))
    cap.release()
    if not fr:
        raise ValueError(f"{p.name}: 0 frames legibles")
    return np.stack(fr).transpose((3, 0, 1, 2))


def _mascara_sector(img):
    """ConvertDICOMToAVI.ipynb celda 2: mask(output)."""
    import cv2
    import numpy as np
    dim = img.shape[0]
    m1, m2 = np.meshgrid(np.arange(dim), np.arange(dim))
    mask = ((m1 + m2) > int(dim / 2) + int(dim / 10))
    mask *= ((m1 - m2) < int(dim / 2) + int(dim / 10))
    mask = np.reshape(mask, (dim, dim)).astype(np.int8)
    return cv2.bitwise_and(img, img, mask=mask)


def convertir_112(v, aplicar_mascara=True):
    """v uint8 (3,F,H,W) -> uint8 (3,F,112,112). Pasos de ConvertDICOMToAVI.ipynb celda 3 (sin yCrop DICOM)."""
    import cv2
    import numpy as np
    c, f, h, w = v.shape
    if (h, w) == (SIZE, SIZE):
        return v, {"conversion_aplicada": False, "motivo": "ya es 112x112 (se asume video ya procesado como los del dataset)"}
    arr = v[0]                       # canal 0, (F, H, W)
    bias = int(abs(w - h) / 2)
    if bias > 0:
        arr = arr[:, :, bias:-bias] if h < w else arr[:, bias:-bias, :]
    f_, hh, ww = arr.shape
    m = int(hh / 10)
    out = np.zeros((f_, SIZE, SIZE), np.uint8)
    for i in range(f_):
        small = arr[i, m:(hh - m), m:(hh - m)]
        o = cv2.resize(small, (SIZE, SIZE), interpolation=cv2.INTER_CUBIC)
        out[i] = _mascara_sector(o) if aplicar_mascara else o
    out3 = np.stack([out, out, out])  # cv2.merge([x,x,x])
    return out3, {"conversion_aplicada": True, "tamano_original_hxw": [h, w], "recorte_cuadrado_bias": bias,
                  "margen_10pct_px": m, "interpolacion": "INTER_CUBIC", "mascara_sector": bool(aplicar_mascara),
                  "yCrop_dicom_omitido": True}


def mean_std(v):
    """Equivale a echonet.utils.get_mean_and_std (L107-121) sobre todos los pixeles de este video."""
    import numpy as np
    x = v.astype(np.float64).reshape(3, -1)
    n = x.shape[1]
    mean = x.sum(1) / n
    std = np.sqrt((x ** 2).sum(1) / n - mean ** 2)
    return mean.astype(np.float32), std.astype(np.float32)


def normalizar(v, mean, std):
    """echo.py L169-178 (float32, (x-mean)/std por canal)."""
    import numpy as np
    x = v.astype(np.float32)
    x -= mean.reshape(3, 1, 1, 1)
    x /= std.reshape(3, 1, 1, 1)
    return x


# ------------------------------------------------------------------------------------------------------------ modelos
def construir_ef():
    import torch
    import torchvision
    m = torchvision.models.video.r2plus1d_18(weights=None)   # repo: pretrained=False
    m.fc = torch.nn.Linear(m.fc.in_features, 1)
    return m


def construir_seg():
    import torch
    import torchvision
    # weights_backbone=None: en torchvision 0.20 el backbone por defecto seria ImageNet (descarga). aux_loss=False como segmentation.py L114.
    m = torchvision.models.segmentation.deeplabv3_resnet50(weights=None, weights_backbone=None, aux_loss=False)
    m.classifier[-1] = torch.nn.Conv2d(m.classifier[-1].in_channels, 1, kernel_size=m.classifier[-1].kernel_size)
    return m


# Tamanos EXACTOS (bytes) de los archivos oficiales de la release v1.0.0, por cabeceras HTTP (curl -sIL, 2026-11-14; ver
# MODELOS-TABLA.md). El sha256 oficial no se conoce: se calcula y se registra en el JSON del run.
TAMANOS_OFICIALES = {
    "r2plus1d_18_32_2_pretrained.pt": 250572083,
    "deeplabv3_resnet50_random.pt": 317401511,
}


def globals_numpy_permitidos():
    """Clases de numpy que pueden aparecer en el checkpoint (escalares y dtypes de 'best_loss', 'epoch', ...).
    numpy<2: numpy.core.multiarray; numpy>=2: numpy._core.multiarray (via getattr). Devuelve lista de objetos."""
    import numpy as np
    out = []
    # Se prueban numpy._core (numpy>=2) y numpy.core (numpy<2; en 1.26 _core puede existir sin multiarray): se permiten
    # las que existan, porque el pickle registra el modulo con el que se guardo el checkpoint.
    for nombre_core in ("_core", "core"):
        ma = getattr(getattr(np, nombre_core, None), "multiarray", None)
        for nombre in ("scalar", "_reconstruct"):
            o = getattr(ma, nombre, None)
            if o is not None and all(o is not x for x in out):
                out.append(o)
    out += [np.dtype, np.ndarray]
    vistos = {id(o) for o in out}
    for t in ("float16", "float32", "float64", "int8", "int16", "int32", "int64", "uint8", "uint16", "uint32", "uint64",
              "bool_", "complex64", "complex128"):
        try:
            c = type(np.dtype(t))      # p. ej. numpy.dtypes.Float64DType (numpy>=1.25); en numpy<1.25 es np.dtype
        except Exception:
            continue
        if id(c) not in vistos:
            out.append(c)
            vistos.add(id(c))
    return out


def _nombre_global(o):
    return f"{getattr(o, '__module__', '?')}.{getattr(o, '__qualname__', getattr(o, '__name__', repr(o)))}"


def _torch_load_safe_globals(torch, ruta):
    """torch.load(weights_only=True) con los globals de numpy permitidos. safe_globals (torch>=2.5) o, si no existe,
    add_safe_globals (torch>=2.4). Devuelve (checkpoint, nombres_de_globals)."""
    glob = globals_numpy_permitidos()
    nombres = [_nombre_global(o) for o in glob]
    ser = torch.serialization
    if hasattr(ser, "safe_globals"):
        with ser.safe_globals(glob):
            return torch.load(str(ruta), map_location="cpu", weights_only=True), nombres
    if hasattr(ser, "add_safe_globals"):
        ser.add_safe_globals(glob)
        return torch.load(str(ruta), map_location="cpu", weights_only=True), nombres
    return torch.load(str(ruta), map_location="cpu", weights_only=True), []


def verificar_tamano_oficial(ruta):
    """Verificacion previa a weights_only=False: nombre de archivo oficial y tamano exacto. Lanza RuntimeError si no."""
    ruta = Path(ruta)
    esperado = TAMANOS_OFICIALES.get(ruta.name)
    if esperado is None:
        raise RuntimeError(f"{ruta.name!r} no es un archivo oficial conocido de la release v1.0.0 "
                           f"({', '.join(TAMANOS_OFICIALES)}); no se carga con weights_only=False.")
    real = ruta.stat().st_size
    if real != esperado:
        raise RuntimeError(f"Tamano de {ruta.name} = {real} B, esperado {esperado} B (cabeceras HTTP de la release oficial). "
                           "El archivo esta incompleto o no es el oficial: NO se carga con weights_only=False. "
                           "Vuelve a descargarlo con scripts\\descargar_pesos.ps1 -Modelo echonet_dynamic")
    return {"tamano_bytes": real, "tamano_esperado_bytes": esperado, "sha256_calculado": runs.sha256_file(ruta)}


def cargar_pesos(model, ruta, weights_only=True):
    """Camino 1 (por defecto): torch.load(weights_only=True) + safe_globals de numpy.
    Camino 2: weights_only=False SOLO si el 1 da UnpicklingError, o si el usuario pone options.torch_load_weights_only=false,
    y SOLO tras verificar nombre oficial y tamano exacto. En el JSON queda cual se uso (clave 'carga')."""
    import pickle
    import torch
    info = {}
    ck = None
    if weights_only:
        try:
            ck, nombres = _torch_load_safe_globals(torch, ruta)
            info.update({"carga": "weights_only_true_safe_globals", "globals_permitidos": nombres})
        except pickle.UnpicklingError as e:
            info["error_weights_only_true"] = str(e)[:600]
    if ck is None:
        info.update(verificar_tamano_oficial(ruta))
        ck = torch.load(str(ruta), map_location="cpu", weights_only=False)
        info["carga"] = "weights_only_false_verificado_tamano"
        info["aviso_carga"] = ("weights_only=False ejecuta pickle: se uso solo tras verificar nombre de archivo oficial y tamano "
                               "exacto; el sha256 oficial NO se conoce (se registra el calculado).")
    sd = ck["state_dict"]
    sd = {(k[7:] if k.startswith("module.") else k): v for k, v in sd.items()}
    msg = model.load_state_dict(sd)   # estricto como el repo
    meta = {k: ck[k] for k in ("epoch", "frames", "period", "best_loss", "loss", "r2") if k in ck}
    info.update({"missing_keys": list(msg.missing_keys), "unexpected_keys": list(msg.unexpected_keys),
                 "metadatos_checkpoint": meta, "claves_checkpoint": list(ck.keys())})
    return info


def predecir_ef(model, vnorm, device, block=BLOCK_EF):
    """video.py run_epoch con clips='all' y block_size (L199-201, L248, L322-339). Devuelve lista de EF por clip."""
    import numpy as np
    import torch
    c, f, h, w = vnorm.shape
    length, period = FRAMES, PERIOD
    if f < length * period:   # echo.py L193-197
        vnorm = np.concatenate((vnorm, np.zeros((c, length * period - f, h, w), vnorm.dtype)), axis=1)
        f = vnorm.shape[1]
    starts = np.arange(f - (length - 1) * period)   # echo.py L201
    idx = period * np.arange(length)
    out = []
    with torch.no_grad():
        for j in range(0, len(starts), block):
            lote = np.stack([vnorm[:, s + idx, :, :] for s in starts[j:j + block]])
            y = model(torch.from_numpy(lote).to(device))
            out.append(y.view(-1).float().cpu().numpy())
    return np.concatenate(out), starts


def predecir_seg(model, vnorm, device, block=BLOCK_SEG):
    """segmentation.py L258: logits (F,112,112) por bloques de frames."""
    import numpy as np
    import torch
    x = np.ascontiguousarray(vnorm.transpose(1, 0, 2, 3))   # F,3,H,W
    out = []
    with torch.no_grad():
        for i in range(0, x.shape[0], block):
            y = model(torch.from_numpy(x[i:i + block]).to(device))["out"]
            out.append(y[:, 0].float().cpu().numpy())
    return np.concatenate(out)


def sistoles(size):
    """segmentation.py L289-292, literal (incluye ** 0.05 / ** 0.95 del repo)."""
    import numpy as np
    import scipy.signal
    s = np.asarray(size)
    srt = sorted(s)
    trim_min = srt[round(len(s) ** 0.05)]
    trim_max = srt[min(round(len(s) ** 0.95), len(s) - 1)]
    rango = trim_max - trim_min
    pk = scipy.signal.find_peaks(-s, distance=20, prominence=(0.50 * rango))[0]
    return sorted(int(p) for p in pk), {"trim_min": int(trim_min), "trim_max": int(trim_max)}


def guardar_overlay(ruta_base: Path, rgb_f_c_h_w, masks):
    """Izquierda: frame 112x112 convertido; derecha: igual con la mascara saturada en el canal 0 (como segmentation.py L276-280)."""
    import cv2
    import numpy as np
    esc = 3
    f, h, w = masks.shape
    x = rgb_f_c_h_w.astype(np.float32)               # F,3,H,W (0-255, sin normalizar)
    der = x.copy()
    der[:, 0] = np.maximum(255.0 * masks, der[:, 0])
    par = np.concatenate((x, der), axis=3).clip(0, 255).astype(np.uint8)
    for ext, fourcc in ((".mp4", "mp4v"), (".avi", "MJPG")):
        ruta = ruta_base.with_suffix(ext)
        wr = cv2.VideoWriter(str(ruta), cv2.VideoWriter_fourcc(*fourcc), 30, (2 * w * esc, h * esc))
        if wr.isOpened():
            for fr in par.transpose(0, 2, 3, 1):
                fr = cv2.resize(fr, (2 * w * esc, h * esc), interpolation=cv2.INTER_NEAREST)
                wr.write(cv2.cvtColor(fr, cv2.COLOR_RGB2BGR))
            wr.release()
            return ruta
        wr.release()
    return None


# ------------------------------------------------------------------------------------------------------------- run
def listar_videos(p: Path):
    if p.is_dir():
        return sorted(x for x in p.rglob("*") if x.is_file() and x.suffix.lower() in EXT_VIDEO)
    return [p]


def run(request, resp):
    import numpy as np
    import torch
    opts = request.get("options") or {}
    dummy = bool(opts.get("prueba_carga_dummy"))
    inp = request.get("input_path")
    declarada = request.get("declared_modality") or "desconocida"

    if inp and runs.resolve(inp).exists():
        val = modalidad.validar(runs.resolve(inp), declarada, ADMITIDAS, "EchoNet-Dynamic",
                                permitir_color=bool(opts.get("permitir_color", False)))
        resp["input"]["modality"] = val["modality"]
        resp["warnings"].extend(val["warnings"])
        if not val["ok"]:
            runs.rechazar(resp, val["motivo"])
            return
    elif not dummy:
        resp["status"] = "error"
        resp["message"] = f"No existe la entrada: {inp!r}"
        return

    vista = (request.get("declared_view") or "desconocida").strip()
    resp["config"]["vista_declarada"] = vista
    if not (dummy and not inp) and vista.upper() != "A4C":
        runs.rechazar(resp, "EchoNet-Dynamic solo admite apical 4 cámaras; declara la vista "
                            f"(vista declarada: {vista!r}; se requiere 'A4C'). No se infiere la vista automáticamente.")
        return

    device = runs.elegir_device(opts.get("device", "auto"))
    resp["device"] = device
    resp["checkpoint"] = {"path": W_EF_REL, "url": W_EF_URL, "sha256": None,
                          "adicional": [{"path": W_SEG_REL, "url": W_SEG_URL, "sha256": None, "componente": "segmentacion"}],
                          "componente_principal": "FEVE r2plus1d_18_32_2_pretrained"}
    resp["config"].update({
        "repo": "vendor/dynamic", "repo_commit": "e01d029", "vista_requerida": "A4C",
        "ef": {"modelo": "r2plus1d_18", "frames": FRAMES, "periodo": PERIOD, "clips": "all", "block_size": BLOCK_EF},
        "segmentacion": {"modelo": "deeplabv3_resnet50 (aux_loss=False, salida 1 canal)", "umbral": "logit > 0", "block_frames": BLOCK_SEG},
        "tamano_entrada": SIZE, "preprocesamiento_fuente": FUENTE_PREPROC, "desviaciones": DESVIACIONES,
        "no_implementado": ["analisis latido a latido (scripts/beat_by_beat_analysis.R)", "diastole por area (el repo no la calcula)"],
        "licencia_codigo": "MIT (vendor/dynamic/LICENSE); LICENSE.txt adicional: 'Redistribution... not permitted without explicit written permission'",
    })
    torch.manual_seed(0)

    # ---------------- prueba de carga dummy
    if dummy:
        resp["random_load_test"] = True
        ef = construir_ef().to(device).eval()
        seg = construir_seg().to(device).eval()
        n_ef = sum(p.numel() for p in ef.parameters())
        n_seg = sum(p.numel() for p in seg.parameters())
        x1 = torch.rand(1, 3, FRAMES, SIZE, SIZE, device=device)
        x2 = torch.rand(2, 3, SIZE, SIZE, device=device)
        with torch.no_grad():
            y1 = ef(x1)
            y2 = seg(x2)
        resp["raw_output"] = {
            "nota": "PRUEBA DE CARGA: arquitecturas sin pesos + torch.rand; NO se ha corrido inferencia real.",
            "ef": {"entrada_shape": list(x1.shape), "salida_shape": list(y1.shape), "n_parametros": int(n_ef),
                   "salida_aleatoria_sin_significado": y1.cpu().numpy().tolist()},
            "segmentacion": {"entrada_shape": list(x2.shape), "claves_salida": list(y2.keys()),
                             "shapes_salida": {k: list(v.shape) for k, v in y2.items()}, "n_parametros": int(n_seg)},
            "n_parametros_total": int(n_ef + n_seg),
            "n_parametros_mb_fp32": round((n_ef + n_seg) * 4 / 2**20, 1),
            "vram_pico_mb": runs.vram_pico_mb(),
        }
        resp["normalized"] = [formato.filas_modelo(resp, metric="EF", value=float(y1.view(-1)[0]), unit="%", tipo="medicion",
                                                   quality="prueba_de_carga", notes="prueba de carga con tensor aleatorio"),
                              formato.filas_modelo(resp, metric="area_VI_frame:0", value=float((y2["out"][0, 0] > 0).sum()), unit="px2",
                                                   tipo="hallazgo", quality="prueba_de_carga", notes="prueba de carga con tensor aleatorio")]
        resp["status"] = "ok"
        resp["message"] = "Prueba de carga dummy completada (sin pesos, tensor aleatorio). NO es inferencia real."
        return

    # ---------------- inferencia real
    w_ef, w_seg = runs.resolve(W_EF_REL), runs.resolve(W_SEG_REL)
    faltan = [rel for rel, p in ((W_EF_REL, w_ef), (W_SEG_REL, w_seg)) if not p.exists()]
    if faltan:
        resp["status"] = "error"
        resp["message"] = msg_pesos(", ".join(faltan))
        return
    resp["checkpoint"]["sha256"] = runs.sha256_file(w_ef)
    resp["checkpoint"]["adicional"][0]["sha256"] = runs.sha256_file(w_seg)

    videos = listar_videos(runs.resolve(inp))
    if not videos:
        resp["status"] = "error"
        resp["message"] = "La carpeta de entrada no contiene videos."
        return
    wo = bool(opts.get("torch_load_weights_only", True))
    ef = construir_ef()
    carga_ef = cargar_pesos(ef, w_ef, wo)
    ef.to(device).eval()
    seg = construir_seg()
    carga_seg = cargar_pesos(seg, w_seg, wo)
    seg.to(device).eval()
    resp["checkpoint"]["carga"] = carga_ef["carga"]
    resp["checkpoint"]["globals_permitidos"] = carga_ef.get("globals_permitidos")
    resp["checkpoint"]["adicional"][0]["carga"] = carga_seg["carga"]
    resp["checkpoint"]["adicional"][0]["globals_permitidos"] = carga_seg.get("globals_permitidos")
    for c in (carga_ef, carga_seg):
        if c["carga"] != "weights_only_true_safe_globals":
            resp["warnings"].append("Checkpoint cargado con weights_only=False (pickle) tras verificar nombre y tamano oficiales: "
                                    + str(c.get("aviso_carga")))
    if device == "cuda":
        torch.cuda.reset_peak_memory_stats()

    run_dir = runs.resolve(request.get("run_dir") or ".")
    run_dir.mkdir(parents=True, exist_ok=True)
    aplicar_mascara = bool(opts.get("aplicar_mascara_sector", True))
    filas_frame = bool(opts.get("filas_area_por_frame", True))
    raw = {"checkpoint_carga_ef": carga_ef, "checkpoint_carga_segmentacion": carga_seg, "videos": {}}
    filas = []
    for vp in videos:
        v0 = loadvideo(vp)
        v112, info_conv = convertir_112(v0, aplicar_mascara)
        mean, std = mean_std(v112)
        vn = normalizar(v112, mean, std)
        ef_clips, starts = predecir_ef(ef, vn, device, int(opts.get("block_size", BLOCK_EF)))
        feve = float(np.mean(ef_clips))           # video.py L338-339 / L239
        logits = predecir_seg(seg, vn, device, int(opts.get("block_frames", BLOCK_SEG)))
        masks = (logits > 0)
        area = masks.sum((1, 2)).astype(np.int64)
        sist, trim = sistoles(area)
        stem = vp.stem
        npz = run_dir / f"mascaras_{stem}.npz"
        np.savez_compressed(npz, mascaras=masks.astype(np.uint8), area_px2=area, sistole_candidatos=np.array(sist),
                            logits_float16=logits.astype(np.float16), media_rgb=mean, std_rgb=std)
        ov = guardar_overlay(run_dir / f"overlay_{stem}", v112.transpose(1, 0, 2, 3), masks)
        arts = [{"path": runs.rel(npz), "tipo": "mascaras_npz", "descripcion": "mascaras binarias 112x112 por frame, area px2, candidatos de sistole, logits float16"}]
        if ov:
            arts.append({"path": runs.rel(ov), "tipo": "overlay_video", "descripcion": "frame 112x112 (izq.) y con mascara del VI en canal rojo (der.), x3"})
        resp["artifacts"].extend(arts)
        raw["videos"][vp.name] = {
            "frames": int(v0.shape[1]), "tamano_original_hxw": [int(v0.shape[2]), int(v0.shape[3])], "conversion": info_conv,
            "mean_rgb": mean.tolist(), "std_rgb": std.tolist(),
            "ef": {"feve_media_de_clips_pct": feve, "n_clips": int(len(ef_clips)), "ef_por_clip": ef_clips.tolist(),
                   "inicios_de_clip": starts.tolist()},
            "segmentacion": {"area_px2_por_frame": area.tolist(), "sistole_candidatos_frames": sist, **trim,
                             "unidad": "px2 del frame 112x112, sin calibracion"},
        }
        calidad = "preprocesamiento_adaptado"
        base = f"video={vp.name}"
        filas.append(formato.filas_modelo(
            resp, metric="EF", value=feve, unit="%", tipo="medicion", quality=calidad,
            notes=f"{base}; estimación del modelo (r2plus1d_18, media de {len(ef_clips)} clips de 32 frames, periodo 2); no calculada desde píxeles"))
        filas[-1]["input_file"] = runs.rel(vp)
        if filas_frame:
            for i, a in enumerate(area):
                filas.append(formato.filas_modelo(
                    resp, metric=f"area_VI_frame:{i}", value=int(a), unit="px2", tipo="hallazgo", quality=calidad,
                    notes=f"{base}; área de la máscara del VI (logit>0) en el frame {i} del video convertido a 112x112; sin calibración, no es ml ni mm"))
                filas[-1]["input_file"] = runs.rel(vp)
        for k, fr in enumerate(sist):
            filas.append(formato.filas_modelo(
                resp, metric=f"sistole_candidata_frame:{k}", value=int(fr), unit="indice_de_frame", tipo="hallazgo", quality=calidad,
                notes=f"{base}; mínimo local del área del VI (find_peaks de segmentation.py L292), área={int(area[fr])} px2; candidato, no verificado"))
            filas[-1]["input_file"] = runs.rel(vp)
        filas.append(formato.filas_modelo(
            resp, metric="area_VI_max_px2", value=int(area.max()), unit="px2", tipo="hallazgo", quality=calidad,
            notes=f"{base}; máximo de la serie de áreas en el frame {int(area.argmax())} (candidato de diástole por área; el repo no lo calcula); sin calibración"))
        filas[-1]["input_file"] = runs.rel(vp)
        filas.append(formato.filas_modelo(
            resp, metric="area_VI_min_px2", value=int(area.min()), unit="px2", tipo="hallazgo", quality=calidad,
            notes=f"{base}; mínimo de la serie de áreas en el frame {int(area.argmin())}; sin calibración"))
        filas[-1]["input_file"] = runs.rel(vp)
    raw["vram_pico_mb"] = runs.vram_pico_mb()
    resp["raw_output"] = raw
    resp["normalized"] = filas
    resp["warnings"].append("preprocesamiento_adaptado: mean/std calculados sobre el propio video (el repo usa los del conjunto de entrenamiento); ver config.desviaciones.")
    resp["inferencia_real"] = True
    resp["status"] = "ok"
    resp["message"] = f"Inferencia real EchoNet-Dynamic sobre {len(videos)} video(s); {len(filas)} filas. Estimación de modelo de investigación; no diagnóstico."


if __name__ == "__main__":
    sys.exit(runs.ejecutar_adaptador(MODEL, run))
