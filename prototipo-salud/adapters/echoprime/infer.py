"""Adaptador EchoPrime (vendor/EchoPrime @ 6d9c1ee, Academic Software License de Cedars-Sinai).

Replica el procedimiento oficial de EchoPrimeDemo.ipynb / echo_prime/model.py para UN ESTUDIO multivista:
  1. cada video del estudio -> mascara del sector (solo DICOM) -> crop_and_scale 224x224 -> normalizacion ->
     16 frames (los 32 primeros, paso 2)                                            (process_dicoms / process_mp4s)
  2. clasificador de vista (ConvNeXt-B, 11 vistas, sobre el 1er frame) y encoder de video (MViT-v2-S, 512-d)
  3. encode_study = [embedding 512 | one-hot de vista 11] por video
  4. generate_report (opcional): informe por RECUPERACION (copia secciones de informes de estudios candidatos)
  5. predict_metrics: 20 variables como promedio de las etiquetas de los k=50 estudios candidatos mas cercanos

Se reutilizan las funciones del repo (utils.crop_and_scale, utils.mask_outside_ultrasound, EchoPrime.generate_report,
EchoPrime.predict_metrics). EchoPrime.__init__ NO se llama porque usa rutas relativas al cwd, fuerza `device` y carga
sin map_location; sus pasos se replican aqui (mismos modelos, mismos pesos) con rutas bajo weights/echoprime/.

Nada de esto es diagnostico. El informe es texto de OTROS estudios (candidatos) recuperado por similitud; las metricas
son medias de etiquetas de los estudios vecinos (no probabilidades calibradas ni mediciones).

options (todas opcionales):
  device          auto|cpu|cuda
  lote_videos     videos por lote en el encoder (oficial: 50; aqui 4 por defecto para caber en 6 GB; no cambia el resultado)
  generar_informe true|false (por defecto true; requiere cargar ~1.23 M informes candidatos: mucha RAM y ~1 min)
  idioma          en|it|bs (README: idiomas soportados; por defecto en)
  k               vecinos de predict_metrics (oficial 50)
  guardar_embeddings true|false (por defecto true)
  permitir_color  (se admite Doppler color como parte del estudio; ver manifest)
  prueba_carga_dummy  arquitectura SIN pesos + tensor aleatorio (NO es inferencia real)
"""
from __future__ import annotations

import contextlib
import math
import os
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from core import formato, modalidad, runs  # noqa: E402

KEY = "echoprime"
VENDOR = runs.ROOT / "vendor" / "EchoPrime"
W_DIR = "weights/echoprime"
ADMITIDAS = ["video_2d", "doppler_color"]  # doppler_color solo como componente de un estudio (ver manifest)
URL_BASE = "https://github.com/echonet/EchoPrime/releases/download/v1.0.0"
SHA_MODEL_DATA_ZIP = "b29362b6b40e8695b138d191f874ad92417b6da9fcdb2f0764ed1440be5272b3"  # digest de la API de releases
FRAMES_TO_TAKE, FRAME_STRIDE, VIDEO_SIZE = 32, 2, 224  # model.py L64-66
MEAN = [29.110628, 28.076836, 29.096405]  # model.py L67
STD = [47.989223, 46.456997, 47.20083]  # model.py L68
EXT_DICOM = {".dcm", ".dicom"}
EXT_VIDEO = {".mp4", ".avi", ".mov", ".mkv", ".m4v", ".webm"}
UNIDAD = {"ejection_fraction": "%", "pulmonary_artery_pressure_continuous": "mmHg"}

FUENTE_PREPROC = {
    "descubrimiento_dicom": "vendor/EchoPrime/echo_prime/model.py L101: glob('{INPUT}/**/*.dcm', recursive) (aqui tambien "
                            "archivos sin extension con firma DICM)",
    "filtro_dicom": "model.py L109-111: se omiten pixel_array con ndim<3 o shape[2]==3 (imagenes fijas, p. ej. Doppler espectral)",
    "mascara_sector_dicom": "model.py L119 + utils/utils.py L339-423 mask_outside_ultrasound (solo DICOM; suma de frames, "
                            "erosion, diferencia primer/ultimo frame, dilatacion, casco convexo; asume pixel_array YUV/YBR)",
    "recorte_y_escala": "utils/utils.py L251-268 crop_and_scale(res=(224,224), INTER_CUBIC, zoom=0.1): recorte a "
                        "proporcion cuadrada + 10% por lado + resize; model.py L124-126",
    "normalizacion": "model.py L67-68 y L130: (x - mean)/std por canal con mean=[29.110628,28.076836,29.096405], "
                     "std=[47.989223,46.456997,47.20083] sobre valores 0-255",
    "frames": "model.py L64-65, L133-146: relleno con ceros hasta 32 frames si el video es mas corto; se toman "
              "x[:, 0:32:2] = 16 frames desde el inicio (solo ~1 s del video)",
    "mp4": "model.py L170-202 process_mp4s: SIN mascara de sector (se asume ya procesado); lectura con "
           "torchvision.io.read_video (RGB). Aqui: cv2 (BGR->RGB), y solo se leen los 32 primeros frames (equivalente)",
    "clasificador_de_vista": "model.py L50-60 y L238-278 get_views: convnext_base con cabeza de 11 clases sobre el primer "
                             "frame normalizado (stack[:,:,0]); argmax; clases en utils/utils.py L17-27 COARSE_VIEWS "
                             "(incluye Apical_Doppler, Doppler_Parasternal_Long/Short)",
    "encoder": "model.py L41-48 y L212-236: torchvision mvit_v2_s con head[-1]=Linear(.,512); lotes de 50 (aqui configurable)",
    "estudio": "model.py L280-294 encode_study: concat(embedding 512, one-hot vista 11) = (N,523)",
    "informe": "model.py L352-383 generate_report: pondera embeddings por MIL_weights.csv (vista x seccion), media, "
               "similitud con candidate_embeddings, copia la seccion del informe del candidato mas parecido",
    "metricas": "model.py L385-423 predict_metrics(k=50): media de las etiquetas candidate_labels de los k candidatos "
                "mas similares por seccion (EchoPrimeDemo.ipynb celda 6)",
    "carga_de_modelos": "model.py L28-85 __init__ (rutas model_data/... relativas al cwd); aqui weights/echoprime/model_data/...",
}


# ------------------------------------------------------------------------------------------------ utilidades
def _opts(request: dict) -> dict:
    o = dict(request.get("options") or {})
    o.setdefault("device", "auto")
    o.setdefault("lote_videos", 4)
    o.setdefault("generar_informe", True)
    o.setdefault("idioma", "en")
    o.setdefault("k", 50)
    o.setdefault("guardar_embeddings", True)
    o.setdefault("permitir_color", False)
    o.setdefault("prueba_carga_dummy", False)
    return o


@contextlib.contextmanager
def _en_vendor():
    """utils/utils.py abre 'assets/per_section.json' al importarse y initialize_language() lee 'assets/*.json'."""
    previo = os.getcwd()
    os.chdir(VENDOR)
    try:
        yield
    finally:
        os.chdir(previo)


def _importar_repo():
    os.environ.setdefault("MPLBACKEND", "Agg")  # model.py importa matplotlib.pyplot
    if str(VENDOR) not in sys.path:
        sys.path.insert(0, str(VENDOR))
    with _en_vendor():
        import utils as eutils  # noqa: WPS433
        import echo_prime  # noqa: WPS433
    return eutils, echo_prime


def _arquitecturas():
    """Las dos redes con la misma construccion que model.py L42-55, SIN pesos."""
    import torch
    import torchvision
    enc = torchvision.models.video.mvit_v2_s()
    enc.head[-1] = torch.nn.Linear(enc.head[-1].in_features, 512)
    vc = torchvision.models.convnext_base()
    vc.classifier[-1] = torch.nn.Linear(vc.classifier[-1].in_features, 11)
    return enc, vc


def _n_params(m) -> int:
    return sum(p.numel() for p in m.parameters())


def _congelar(m, device):
    m.eval()
    m.to(device)
    for p in m.parameters():
        p.requires_grad = False
    return m


def _localizar_model_data() -> Path | None:
    """weights/echoprime/model_data (el zip oficial se descomprime en 'model_data/'); si no, se busca por el encoder."""
    base = runs.resolve(W_DIR)
    d = base / "model_data"
    if (d / "weights" / "echo_prime_encoder.pt").is_file():
        return d
    if base.is_dir():
        for c in base.rglob("echo_prime_encoder.pt"):
            return c.parent.parent
    return None


def _faltan(md: Path | None) -> list[str]:
    if md is None:
        return [f"{W_DIR}/model_data/weights/echo_prime_encoder.pt (model_data.zip sin descomprimir)"]
    req = ["weights/echo_prime_encoder.pt", "weights/view_classifier.pt", "candidates_data/candidate_studies.csv",
           "candidates_data/candidate_embeddings_p1.pt", "candidates_data/candidate_embeddings_p2.pt",
           "candidates_data/candidate_reports.pkl", "candidates_data/candidate_labels.pkl"]
    return [runs.rel(md / r) for r in req if not (md / r).is_file()]


def _estimar_vram(n_enc: int, n_vc: int, lote: int) -> dict:
    pesos = (n_enc + n_vc) * 4 / 2**20
    act = 280.0 * lote  # ESTIMACION: ~270 MB/video medidos como delta de RSS en CPU (lote 4: 1071 MB), no en GPU
    return {"parametros_encoder": n_enc, "parametros_clasificador_vista": n_vc, "pesos_fp32_mb": round(pesos, 1),
            "activaciones_estimadas_mb": round(act, 1), "lote_videos": lote,
            "total_estimado_mb": round(pesos + act, 1),
            "candidate_embeddings": {"forma": [1230676, 512], "mb_fp32": round(1230676 * 512 * 4 / 2**20, 1),
                                     "ubicacion": "CPU/RAM (como el repo: nunca se envian a GPU); si se movieran a GPU sumarian ~2.4 GB"},
            "base": "ESTIMACION: parametros medidos x 4 B + ~280 MB/video de activaciones (delta de RSS medido en CPU: 336 MB lote 1, 1071 MB lote 4; NO medido en GPU)"}


# ------------------------------------------------------------------------------------------------ prueba de carga
def _prueba_carga(request: dict, resp: dict, o: dict) -> None:
    import torch
    t0 = time.perf_counter()
    device = runs.elegir_device(o["device"])
    resp["random_load_test"] = True
    resp["device"] = device
    if device == "cuda":
        torch.cuda.reset_peak_memory_stats()
    eutils, _ = _importar_repo()
    enc, vc = _arquitecturas()
    n_enc, n_vc = _n_params(enc), _n_params(vc)
    _congelar(enc, device)
    _congelar(vc, device)
    n_videos = 2
    g = torch.Generator().manual_seed(0)
    x = torch.randn(n_videos, 3, 16, VIDEO_SIZE, VIDEO_SIZE, generator=g).to(device)  # tensor ALEATORIO
    with torch.no_grad():
        feats = enc(x)
        logits = vc(x[:, :, 0, :, :])
    views = [eutils.COARSE_VIEWS[int(i)] for i in logits.argmax(dim=1)]
    onehot = torch.nn.functional.one_hot(logits.argmax(dim=1), num_classes=11).float()
    enc_study = torch.cat((feats, onehot), dim=1)
    resp["status"] = "prueba_carga"
    resp["message"] = ("Prueba de carga con arquitectura SIN pesos y tensor aleatorio: NO se ha corrido inferencia real "
                       "(la salida no significa nada). Informe y metricas NO se probaron (requieren candidate_embeddings).")
    resp["config"].update({"funcion": "prueba_carga_dummy", "device": device, "preprocesamiento_fuente": FUENTE_PREPROC,
                           "arquitectura": "torchvision mvit_v2_s (cabeza 512) + convnext_base (cabeza 11), como model.py L42-55"})
    resp["raw_output"] = {
        "entrada_aleatoria_forma": list(x.shape), "encoder_out_forma": list(feats.shape),
        "clasificador_vista_logits_forma": list(logits.shape), "encode_study_forma": list(enc_study.shape),
        "vistas_con_pesos_aleatorios": views, "salida_finita": bool(torch.isfinite(enc_study).all()),
        "n_clases_vista": len(eutils.COARSE_VIEWS), "vram_estimada": _estimar_vram(n_enc, n_vc, int(o["lote_videos"])),
        "vram_pico_mb": runs.vram_pico_mb(), "tiempo_s": round(time.perf_counter() - t0, 2)}


# ------------------------------------------------------------------------------------------------ entrada
def _es_dicom(p: Path) -> bool:
    if p.suffix.lower() in EXT_DICOM:
        return True
    try:
        with open(p, "rb") as f:
            f.seek(128)
            return f.read(4) == b"DICM"
    except OSError:
        return False


def _descubrir(inp: Path) -> list[Path]:
    if inp.is_file():
        return [inp]
    return sorted(p for p in inp.rglob("*") if p.is_file() and (_es_dicom(p) or p.suffix.lower() in EXT_VIDEO))


def _clasificar_entradas(archivos: list[Path], declarada: str, permitir_color: bool, resp: dict):
    """Valida cada archivo con core.modalidad. Devuelve (validos, omitidos[{archivo, motivo}])."""
    validos, omitidos = [], []
    for f in archivos:
        meta = modalidad.detectar(f)
        decl = meta["modality"] if meta.get("fija_modalidad") and meta.get("modality") else declarada
        v = modalidad.validar(f, decl, ADMITIDAS, "EchoPrime", permitir_color=permitir_color)
        if not v["ok"] and v.get("modality") == "doppler_color?":
            # saturacion alta en un video sin metadatos: EchoPrime tambien procesa clips Doppler color (vistas *_Doppler)
            resp["warnings"].append(f"{f.name}: posible Doppler color (fraccion de pixeles saturados "
                                    f"{v['meta'].get('fraccion_color_max')}). Se admite porque EchoPrime incluye vistas "
                                    "Doppler en su estudio multivista; revisa la vista predicha.")
            validos.append(f)
            continue
        if v["ok"]:
            resp["warnings"].extend(f"{f.name}: {w}" for w in v.get("warnings") or [])
            if v["modality"] == "doppler_color":
                resp["warnings"].append(f"{f.name}: Doppler color admitido solo como componente del estudio multivista "
                                        "(EchoPrime clasifica vistas Doppler y las pondera); no hay analisis Doppler cuantitativo.")
            validos.append(f)
        else:
            omitidos.append({"archivo": f.name, "motivo": v["motivo"], "modalidad_detectada": v.get("modality")})
    return validos, omitidos


def _x_desde_pixeles(pixels, eutils):
    """model.py L124-146: crop_and_scale por frame, normalizacion, relleno y 16 frames. pixels: (F,H,W,3) uint8."""
    import numpy as np
    import torch
    x = np.zeros((len(pixels), VIDEO_SIZE, VIDEO_SIZE, 3))
    for i in range(len(x)):
        x[i] = eutils.crop_and_scale(pixels[i])
    x = torch.as_tensor(x, dtype=torch.float).permute([3, 0, 1, 2])
    mean = torch.tensor(MEAN).reshape(3, 1, 1, 1)
    std = torch.tensor(STD).reshape(3, 1, 1, 1)
    x.sub_(mean).div_(std)
    if x.shape[1] < FRAMES_TO_TAKE:
        pad = torch.zeros((3, FRAMES_TO_TAKE - x.shape[1], VIDEO_SIZE, VIDEO_SIZE), dtype=torch.float)
        x = torch.cat((x, pad), dim=1)
    return x[:, 0:FRAMES_TO_TAKE:FRAME_STRIDE, :, :]


def _procesar_dicom(path: Path, eutils):
    """Replica process_dicoms (model.py L106-146) para un archivo. Devuelve (tensor o None, motivo_omision)."""
    import numpy as np
    import pydicom
    dcm = pydicom.dcmread(str(path))
    pixels = dcm.pixel_array
    if pixels.ndim < 3 or pixels.shape[2] == 3:
        return None, f"omitido como en el repo (model.py L109-111): imagen fija (pixel_array {tuple(pixels.shape)})"
    if pixels.ndim == 3:
        # El repo repite a 3 canales (L114-116) pero la linea siguiente (L119) vuelve a usar dcm.pixel_array: se replica
        # tal cual. mask_outside_ultrasound falla con 3 dim y el paso por canal de L126 acaba en error ("corrupt file").
        pass
    pix = eutils.mask_outside_ultrasound(dcm.pixel_array)
    # solo los 32 primeros frames contribuyen al resultado (la mascara ya uso todos); equivalente a model.py L124-146
    try:
        x = _x_desde_pixeles(pix[:FRAMES_TO_TAKE], eutils)
    except Exception as e:  # el repo captura y escribe "corrupt file" (L148-150)
        motivo = f"'corrupt file' como en el repo: {type(e).__name__}: {e}"
        if dcm.pixel_array.ndim == 3:
            motivo += (" (DICOM multiframe en escala de grises: el procedimiento oficial espera frames de 3 canales "
                       "YUV/YBR y falla con 3 dimensiones; no se altera el flujo oficial)")
        return None, motivo
    return x, None


def _procesar_video(path: Path, eutils):
    """Replica process_mp4s (model.py L175-202) con cv2 en lugar de torchvision.io.read_video (RGB)."""
    import cv2
    import numpy as np
    cap = cv2.VideoCapture(str(path))
    if not cap.isOpened():
        return None, "OpenCV no pudo abrir el video"
    n_total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    frames = []
    while len(frames) < FRAMES_TO_TAKE:
        ok, fr = cap.read()
        if not ok:
            break
        frames.append(cv2.cvtColor(fr, cv2.COLOR_BGR2RGB))
    cap.release()
    if not frames:
        return None, "video sin frames legibles"
    return _x_desde_pixeles(np.array(frames), eutils), None


# ------------------------------------------------------------------------------------------------ modelos reales
def _cargar_modelos(md: Path, device: str):
    import torch
    enc, vc = _arquitecturas()
    ck = torch.load(md / "weights" / "echo_prime_encoder.pt", map_location=device, weights_only=True)
    enc.load_state_dict(ck)
    vs = torch.load(md / "weights" / "view_classifier.pt", map_location=device, weights_only=True)
    vc.load_state_dict(vs)
    return _congelar(enc, device), _congelar(vc, device)


def _construir_echoprime(md: Path, echo_prime, eutils, enc, vc, device: str, lang: str, informe: bool):
    """Equivalente a EchoPrime.__init__ (model.py L28-85) con rutas absolutas, sin tocar el cwd del proceso."""
    import pandas as pd
    import torch
    from tqdm import tqdm
    ep = echo_prime.EchoPrime.__new__(echo_prime.EchoPrime)
    ep.echo_encoder, ep.view_classifier = enc, vc
    ep.frames_to_take, ep.frame_stride, ep.video_size = FRAMES_TO_TAKE, FRAME_STRIDE, VIDEO_SIZE
    ep.mean = torch.tensor(MEAN).reshape(3, 1, 1, 1)
    ep.std = torch.tensor(STD).reshape(3, 1, 1, 1)
    ep.device, ep.lang = torch.device(device), lang
    mil = pd.read_csv(VENDOR / "assets" / "MIL_weights.csv")
    ep.MIL_weights = mil
    ep.non_empty_sections = mil["Section"]
    ep.section_weights = mil.iloc[:, 1:].to_numpy()
    cd = md / "candidates_data"
    ep.candidate_studies = list(pd.read_csv(cd / "candidate_studies.csv")["Study"])

    def _tl(p):
        try:
            return torch.load(p, map_location="cpu", weights_only=True, mmap=True)
        except Exception:
            return torch.load(p, map_location="cpu", weights_only=True)

    ep.candidate_embeddings = torch.cat((_tl(cd / "candidate_embeddings_p1.pt"), _tl(cd / "candidate_embeddings_p2.pt")), dim=0)
    if informe:
        with _en_vendor():
            eutils.initialize_language(lang)
        rep = pd.read_pickle(cd / "candidate_reports.pkl")  # pickle oficial del release (confianza en la fuente)
        ep.candidate_reports = [eutils.phrase_decode(v) for v in tqdm(rep)]
    ep.candidate_labels = pd.read_pickle(cd / "candidate_labels.pkl")
    ep.section_to_phenotypes = pd.read_pickle(VENDOR / "assets" / "section_to_phenotypes.pkl")
    return ep


def _embeber_estudio(enc, vc, stack, device: str, lote: int):
    """embed_videos + get_views + encode_study (model.py L212-294) con lote configurable y softmax para informar."""
    import torch
    feats, logits = [], []
    with torch.no_grad():
        for i in range(0, stack.shape[0], max(1, lote)):
            b = stack[i:i + lote].to(device)
            feats.append(enc(b).cpu())
            logits.append(vc(b[:, :, 0, :, :]).cpu())
    feats = torch.cat(feats, dim=0)
    logits = torch.cat(logits, dim=0)
    idx = torch.argmax(logits, dim=1)
    onehot = torch.nn.functional.one_hot(idx, num_classes=11).float()
    return torch.cat((feats, onehot), dim=1), logits, idx


def _roc(preds: dict) -> dict:
    import csv
    p = VENDOR / "assets" / "roc_thresholds.csv"
    out = {}
    with open(p, newline="", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            feat = r["feature"]
            if feat in preds and preds[feat] is not None:
                out[feat] = {"umbral": float(r["threshold"]), "valor": preds[feat],
                             "supera": bool(preds[feat] > float(r["threshold"]))}
    return out


def _secciones(informe: str) -> list[tuple[str, str]]:
    out = []
    for parte in informe.split("[SEP]"):
        parte = parte.strip()
        if not parte:
            continue
        nombre, _, texto = parte.partition(":")
        out.append((nombre.strip(), texto.strip()))
    return out


def _inferir(request: dict, resp: dict, o: dict, validos: list[Path], omitidos: list[dict], md: Path) -> None:
    import numpy as np
    import torch
    t0 = time.perf_counter()
    device = runs.elegir_device(o["device"])
    if device == "cuda":
        torch.cuda.reset_peak_memory_stats()
    eutils, echo_prime = _importar_repo()
    run_dir = runs.resolve(request.get("run_dir") or ".")
    run_dir.mkdir(parents=True, exist_ok=True)

    # 1) preprocesamiento de cada video
    pilas, nombres, tipos = [], [], []
    for f in validos:
        try:
            x, motivo = _procesar_dicom(f, eutils) if _es_dicom(f) else _procesar_video(f, eutils)
        except Exception as e:  # noqa: BLE001
            x, motivo = None, f"{type(e).__name__}: {e}"
        if x is None:
            omitidos.append({"archivo": f.name, "motivo": motivo})
            continue
        pilas.append(x)
        nombres.append(f.name)
        tipos.append("dicom" if _es_dicom(f) else "video")
    if not pilas:
        resp["status"] = "error"
        resp["message"] = ("Ningun video del estudio se pudo preprocesar con el procedimiento oficial: "
                           + "; ".join(f"{d['archivo']}: {d['motivo']}" for d in omitidos))
        resp["errors"].append(resp["message"])
        resp["raw_output"] = {"omitidos": omitidos}
        return
    stack = torch.stack(pilas)  # (N,3,16,224,224)

    # 2) modelos + embeddings
    enc, vc = _cargar_modelos(md, device)
    lote = int(o["lote_videos"])
    encoded, logits, idx = _embeber_estudio(enc, vc, stack, device, lote)
    probs = torch.softmax(logits, dim=1)
    vistas = [eutils.COARSE_VIEWS[int(i)] for i in idx]
    if device == "cuda":
        torch.cuda.synchronize()
    vram_modelos = runs.vram_pico_mb()

    # 3) metricas (y opcionalmente informe) por recuperacion
    ep = _construir_echoprime(md, echo_prime, eutils, enc, vc, device, o["idioma"], bool(o["generar_informe"]))
    preds_raw = ep.predict_metrics(encoded, k=int(o["k"]))
    preds = {k: (None if (v is None or (isinstance(v, float) and math.isnan(v))) else float(v)) for k, v in preds_raw.items()}
    informe = ep.generate_report(encoded) if o["generar_informe"] else None

    # 4) salidas
    filas = []
    for i, nom in enumerate(nombres):
        filas.append(formato.filas_modelo(
            resp, metric=f"vista[{nom}]:{vistas[i]}", value=float(probs[i, idx[i]]), unit="probabilidad_modelo_0_1",
            tipo="probabilidad_clase", quality="softmax_no_calibrado",
            notes="softmax sobre los logits del clasificador de vista (11 clases) del primer frame; el repo solo usa argmax; "
                  "no es probabilidad clinica calibrada"))
    for nombre, v in preds.items():
        es_num = nombre in UNIDAD
        filas.append(formato.filas_modelo(
            resp, metric=nombre, value=v, unit=UNIDAD.get(nombre, "fraccion_vecinos_0_1"), tipo="medicion",
            quality="recuperacion_por_vecinos_no_calibrado",
            notes=("estimación por recuperación de EchoPrime: " +
                   (f"media del valor registrado en los {o['k']} estudios candidatos mas similares (no medido en este estudio)"
                    if es_num else
                    f"fraccion de los {o['k']} estudios candidatos mas similares con el hallazgo; NO es probabilidad calibrada")
                   + "; no diagnostico")))
    if informe is not None:
        for sec, texto in _secciones(informe):
            filas.append(formato.filas_modelo(
                resp, metric=f"informe:{sec}", value=texto, unit=None, tipo="hallazgo", quality="texto_recuperado_de_candidatos",
                notes="texto de la seccion copiado del informe de un estudio candidato parecido (generacion por recuperacion), "
                      "no redactado para este estudio; no diagnostico"))
        p = run_dir / "informe_generado.txt"
        p.write_text(informe, encoding="utf-8")
    artefactos = []
    if informe is not None:
        artefactos.append({"tipo": "informe_txt", "path": runs.rel(run_dir / "informe_generado.txt"),
                           "descripcion": "informe por recuperacion (EchoPrime.generate_report), secciones separadas por [SEP]"})
    if o["guardar_embeddings"]:
        pe = run_dir / "embeddings_estudio.npy"
        np.save(pe, encoded.numpy())
        artefactos.append({"tipo": "embeddings_npy", "path": runs.rel(pe),
                           "descripcion": f"encode_study (N={len(nombres)}, 523): 512 de embedding de video + 11 one-hot de vista; "
                                          f"filas en el orden de config.videos"})

    resp["checkpoint"] = {"path": runs.rel(md), "url": f"{URL_BASE}/model_data.zip", "sha256": SHA_MODEL_DATA_ZIP}
    resp["device"] = device
    resp["inferencia_real"] = True
    resp["config"].update({
        "device": device, "lote_videos": lote, "k": int(o["k"]), "idioma": o["idioma"],
        "generar_informe": bool(o["generar_informe"]), "preprocesamiento_fuente": FUENTE_PREPROC,
        "videos": [{"archivo": n, "origen": t, "vista": v} for n, t, v in zip(nombres, tipos, vistas)],
        "omitidos": omitidos, "model_data": runs.rel(md),
        "candidate_embeddings_forma": list(ep.candidate_embeddings.shape),
        "aviso": "estimaciones por recuperacion de estudios candidatos; no diagnostico"})
    resp["raw_output"] = {
        "vistas": {n: {"vista": v, "probabilidades_softmax": {c: float(probs[i, j]) for j, c in enumerate(eutils.COARSE_VIEWS)},
                       "logits": [float(z) for z in logits[i]]} for i, (n, v) in enumerate(zip(nombres, vistas))},
        "metricas_predict_metrics": preds, "umbrales_roc_cedars_sinai": _roc(preds),
        "umbrales_nota": "assets/roc_thresholds.csv: umbrales de validacion de Cedars-Sinai; no transferibles a otros datos",
        "informe_generado": informe, "encode_study_forma": list(encoded.shape),
        "videos_omitidos": omitidos, "vram_pico_mb": runs.vram_pico_mb(), "vram_pico_tras_encoder_mb": vram_modelos,
        "tiempo_inferencia_s": round(time.perf_counter() - t0, 2)}
    resp["normalized"] = filas
    resp["artifacts"] = artefactos
    resp["status"] = "ok"
    resp["message"] = (f"EchoPrime: estudio de {len(nombres)} video(s), {len(preds)} metricas por recuperacion"
                       + (", informe por recuperacion" if informe is not None else "") + ". No diagnostico.")


def run(request: dict, resp: dict) -> None:
    o = _opts(request)
    resp["config"] = {"opciones": dict(o)}
    inp = runs.resolve(request["input_path"])
    declarada = request.get("declared_modality") or "desconocida"
    archivos = _descubrir(inp)
    if not archivos:
        runs.rechazar(resp, "No se encontraron videos del estudio (.dcm, .mp4, .avi, ...) en la entrada.")
        return
    validos, omitidos = _clasificar_entradas(archivos, declarada, bool(o["permitir_color"]), resp)
    resp["input"]["modality"] = declarada
    if not validos:
        runs.rechazar(resp, "; ".join(f"{d['archivo']}: {d['motivo']}" for d in omitidos))
        resp["raw_output"] = {"omitidos": omitidos}
        return
    if omitidos:
        resp["warnings"].append("Archivos omitidos por modalidad no admitida: "
                                + "; ".join(f"{d['archivo']} ({d['modalidad_detectada']})" for d in omitidos))
    if o["prueba_carga_dummy"]:
        _prueba_carga(request, resp, o)
        resp["raw_output"]["archivos_validos"] = [f.name for f in validos]
        return
    md = _localizar_model_data()
    falta = _faltan(md)
    if falta:
        msg = ("Faltan pesos/datos de EchoPrime: " + "; ".join(falta) + ". Son publicos (GitHub release v1.0.0): "
               "ejecuta scripts\\descargar_pesos.ps1 -Modelo echoprime (model_data.zip 1.34 GB + 2 archivos de ~1.26 GB).")
        resp["status"] = "error"
        resp["message"] = msg
        resp["errors"].append(msg)
        return
    _inferir(request, resp, o, validos, omitidos, md)


if __name__ == "__main__":
    sys.exit(runs.ejecutar_adaptador(KEY, run))
