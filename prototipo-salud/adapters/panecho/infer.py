"""Adaptador PanEcho (CarDS-Yale/PanEcho, commit 836c46e).

Uso (con el python de envs/panecho):
    python adapters/panecho/infer.py --request <run_dir>/request.json --response <run_dir>/response.json

Replica hubconf.py SIN red: tareas desde vendor/PanEcho/content/tasks.pkl, arquitectura desde vendor/PanEcho/src/models.py,
pesos desde weights/panecho/panecho.pt. Preprocesamiento: vendor/PanEcho/src/dataset.py (clase EchoDataset).
NADA de esto es diagnostico: son estimaciones/probabilidades de un modelo de investigacion.
"""
from __future__ import annotations

import contextlib
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from core import formato, modalidad, runs  # noqa: E402

MODEL = "panecho"
VENDOR = runs.ROOT / "vendor" / "PanEcho"
WEIGHTS_REL = "weights/panecho/panecho.pt"
WEIGHTS_URL = "https://github.com/CarDS-Yale/PanEcho/releases/download/v1.0/panecho.pt"
ADMITIDAS = ["video_2d"]
EXT_VIDEO = modalidad.EXT_VIDEO

CLIP_LEN = 16
NUM_CLIPS = 4          # default de train.py:250 (--num_clips) y de EchoDataset
CROP = 224
IMAGENET_MEAN = [0.485, 0.456, 0.406]   # dataset.py:414-416
IMAGENET_STD = [0.229, 0.224, 0.225]
SEED = 0               # val_worker_init_fn (utils.py:62-64) siembra np.random con worker_id=0

FUENTE_PREPROC = (
    "vendor/PanEcho/src/dataset.py, clase EchoDataset: _load_clip L443-469 (cv2.VideoCapture, frames BGR sin convertir a RGB "
    "L460-462, clip de 16 frames consecutivos con inicio aleatorio L450-455, relleno 'last image carried forward' L463-464); "
    "transform L432-441 (CenterCrop 224 + ToDtype float32 scale + Normalize ImageNet L414-416); __getitem__ L484-495 "
    "(num_clips clips, permute a 3xFxHxW); evaluacion: promedio de salidas de los clips (src/utils.py L326-331) y "
    "promedio de videos del mismo estudio (src/utils.py L211, README L15). Modelo/pesos: vendor/PanEcho/hubconf.py L17-60."
)

PREGUNTA_PESOS = "No se encuentran los pesos de PanEcho ({ruta}). Ejecuta scripts\\descargar_pesos.ps1 -Modelo panecho"


class Task:
    """Igual que hubconf.Task (vendor/PanEcho/hubconf.py L9-16)."""
    def __init__(self, task_name, task_type, class_names, mean=float("nan")):
        import numpy as np
        self.task_name = task_name
        self.task_type = task_type
        self.class_names = class_names
        self.class_indices = np.arange(class_names.size)
        self.mean = mean


def cargar_tasks():
    """tasks.pkl LOCAL (hubconf lo baja de GitHub; aqui no hay red)."""
    import pandas as pd
    d = pd.read_pickle(str(VENDOR / "content" / "tasks.pkl"))
    return [Task(t, d[t]["task_type"], d[t]["class_names"], d[t]["mean"]) for t in d.keys()]


def parsear_tasks_md():
    """Unidades, clases y descripcion de content/tasks.md (fuente de unidades de las regresiones)."""
    meta = {}
    for linea in (VENDOR / "content" / "tasks.md").read_text(encoding="utf-8").splitlines():
        if not linea.startswith("|"):
            continue
        celdas = [c.strip().replace("&#124;", "|") for c in linea.strip().strip("|").split("|")]  # '|' real viene escapado como &#124;
        if len(celdas) < 4 or celdas[0] in ("Name",) or set(celdas[0]) <= {"-"}:
            continue
        nombre, tipo, clases, desc = celdas[0], celdas[1], celdas[2], celdas[3]
        m = re.match(r"Units:\s*([^.]*)\.\s*(.*)", desc)
        meta[nombre] = {
            "tipo": tipo, "clases": re.findall(r"'([^']*)'", clases),
            "unidad": (m.group(1).strip() if m else None),
            "descripcion": (m.group(2).strip() if m else desc),
        }
    return meta


@contextlib.contextmanager
def _sin_descarga_imagenet():
    """src/models.py pide convnext_tiny(weights='IMAGENET1K_V1') (descarga de red). Se fuerza weights=None:
    panecho.pt trae TODOS los pesos del codificador, asi que la inicializacion ImageNet se sobrescribe de todos modos."""
    import torchvision
    orig = torchvision.models.convnext_tiny

    def _sin_pesos(*a, weights=None, **kw):
        return orig(*a, weights=None, **kw)
    torchvision.models.convnext_tiny = _sin_pesos
    try:
        yield
    finally:
        torchvision.models.convnext_tiny = orig


def construir_modelo(tasks, clip_len=CLIP_LEN, activations=True):
    """Misma arquitectura que hubconf.PanEcho (L18-37): convnext_tiny, 4 capas, 8 heads, pooling mean, dropout fc 0.25."""
    sys.path.insert(0, str(VENDOR))
    from src.models import FrameTransformer, MultiTaskModel  # noqa: WPS433
    with _sin_descarga_imagenet():
        encoder = FrameTransformer("convnext_tiny", 8, 4, 0.0, "mean", clip_len)
    return MultiTaskModel(encoder, encoder.encoder.n_features, tasks, 0.25, activations)


def cargar_pesos(model, ruta, weights_only=True):
    import torch
    ck = torch.load(str(ruta), map_location="cpu", weights_only=weights_only)
    w = ck["weights"]
    w.pop("encoder.time_encoder.pe", None)  # hubconf L44: permite clip_len variable
    msg = model.load_state_dict(w, strict=False)  # hubconf L45
    return {"missing_keys": list(msg.missing_keys), "unexpected_keys": list(msg.unexpected_keys),
            "claves_checkpoint_nivel_superior": [k for k in ck.keys()]}


# ----------------------------------------------------------------------------------------------- preprocesamiento
def leer_frames(path):
    import cv2
    if Path(path).suffix.lower() not in EXT_VIDEO:
        raise ValueError(f"{Path(path).name}: formato no soportado por este adaptador (solo videos {sorted(EXT_VIDEO)}; "
                         "DICOM aun no se decodifica: convierte a AVI/MP4 sin alterar la escala)")
    cap = cv2.VideoCapture(str(path))
    if not cap.isOpened():
        raise ValueError(f"OpenCV no pudo abrir {Path(path).name}")
    frames = []
    while True:
        ok, fr = cap.read()
        if not ok:
            break
        frames.append(fr)  # BGR, tal como EchoDataset._load_clip (dataset.py L460-462)
    cap.release()
    if not frames:
        raise ValueError(f"{Path(path).name}: 0 frames legibles")
    return frames


def hacer_clips(frames, num_clips, clip_len, rng, adaptar):
    """Equivale a EchoDataset._load_clip x num_clips. Devuelve (tensor [N,3,clip_len,224,224], inicios_reales)."""
    import cv2
    import numpy as np
    import torch
    from torchvision import tv_tensors
    from torchvision.transforms import v2
    n = len(frames)
    transform = v2.Compose([v2.CenterCrop(size=(CROP, CROP)), v2.ToDtype(torch.float32, scale=True),
                            v2.Normalize(mean=IMAGENET_MEAN, std=IMAGENET_STD)])
    clips, inicios = [], []
    for _ in range(num_clips):
        start = 0 if n < clip_len else int(rng.randint(0, n - clip_len + 1, size=1)[0])   # L450-453
        first = max(start - 1, 0)   # L455: set(POS_FRAMES, start_idx-1) => lectura desde start-1 (cv2 ignora -1)
        v = []
        for i in range(clip_len):
            j = first + i
            fr = frames[j] if j < n else frames[-1]           # L463-464 carried forward
            if adaptar:
                fr = cv2.resize(fr, (256, 256), interpolation=cv2.INTER_AREA)   # dataset.py L103/L221 (otros datasets del repo)
            v.append(fr)
        v = np.stack(v, axis=0)                               # F x H x W x 3 (BGR)
        v = tv_tensors.Video(np.transpose(v, (0, 3, 1, 2)))   # F x 3 x H x W (L467)
        x = transform(v)
        clips.append(torch.permute(x, (1, 0, 2, 3)).contiguous())  # 3 x F x H x W (L487)
        inicios.append(first)
    return torch.stack(clips, dim=0), inicios


# ------------------------------------------------------------------------------------------------- filas formato comun
def filas_tareas(resp, tasks, meta, valores, quality, nota_extra, input_file=None):
    """valores: {tarea: np.ndarray 1-D}. Clasificacion => probabilidad_clase; regresion => medicion."""
    filas = []
    for t in tasks:
        v = valores[t.task_name]
        m = meta.get(t.task_name, {})
        if t.task_type == "regression":
            val, notas = float(v[0]), "estimación del modelo; no calculada desde píxeles"
            if t.task_name == "GLS":
                val = -val
                notas += ". tasks.md: el valor real es -1 x la salida del modelo; value = -1 x salida cruda (raw_output conserva la cruda)"
            unidad = m.get("unidad") or ""
            unidad = "adimensional" if unidad.upper() == "N/A" else unidad
            filas.append(("medicion", t.task_name, val, unidad or None, notas))
        elif t.task_type == "binary_classification":
            clases = m.get("clases") or [str(c) for c in t.class_names]
            positiva = clases[-1]   # tasks.md lista la clase positiva; models.py L148-151 garantiza salida = clase positiva
            filas.append(("probabilidad_clase", f"{t.task_name}:{positiva}", float(v[0]), "probabilidad_modelo_0_1",
                          "probabilidad del modelo (salida sigmoide de la cabeza binaria); no es probabilidad clínica calibrada"))
        else:
            for c, p in zip(t.class_names, v):
                filas.append(("probabilidad_clase", f"{t.task_name}:{c}", float(p), "probabilidad_modelo_0_1",
                              "probabilidad del modelo (softmax); no es probabilidad clínica calibrada"))
    out = []
    for tipo, metric, val, unidad, notas in filas:
        out.append(formato.filas_modelo(resp, metric=metric, value=val, unit=unidad, tipo=tipo, quality=quality,
                                        notes=f"{notas}. {nota_extra}"))
        if input_file:
            out[-1]["input_file"] = input_file
    return out


# ------------------------------------------------------------------------------------------------------- run
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
        val = modalidad.validar(runs.resolve(inp), declarada, ADMITIDAS, "PanEcho",
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
    # PanEcho es view-agnostic (README L15): no se valida la vista.
    resp["config"]["vista_declarada"] = request.get("declared_view")
    resp["config"]["vista_nota"] = "PanEcho es independiente de la vista (view-agnostic); se registra la vista declarada sin usarla."

    num_clips = int(opts.get("num_clips", NUM_CLIPS))
    clip_len = int(opts.get("clip_len", CLIP_LEN))
    device = runs.elegir_device(opts.get("device", "auto"))
    resp["device"] = device
    ruta_pesos = runs.resolve(WEIGHTS_REL)
    resp["checkpoint"] = {"path": WEIGHTS_REL, "url": WEIGHTS_URL, "sha256": None}
    resp["config"].update({
        "repo": "vendor/PanEcho", "repo_commit": "836c46e", "arquitectura": "frame_transformer/convnext_tiny, 4 capas, 8 heads, pooling mean",
        "clip_len": clip_len, "num_clips": num_clips, "normalizacion": "imagenet", "orden_canales": "BGR (como EchoDataset; sin cvtColor)",
        "preprocesamiento_fuente": FUENTE_PREPROC, "inicio_clips": f"aleatorio con semilla {SEED} (np.random.RandomState)",
        "licencia_pesos": "CC BY-NC-SA 4.0", "licencia_codigo": "AGPLv3",
        "desviaciones": [
            "convnext_tiny se construye con weights=None (el repo pide IMAGENET1K_V1 y lo descargaria); panecho.pt trae todos los pesos.",
            "tasks.pkl se lee del repo local en vez de la URL de GitHub (hubconf L22).",
            "torch 2.5.1 / torchvision 0.20.1 / Python 3.11 en vez de torch 2.1.0 / tv 0.16 / Python 3.10 del panecho.yml.",
            "inferencia en fp32 (el repo usa autocast fp16 opcional en entrenamiento/evaluacion).",
        ],
    })

    torch.manual_seed(SEED)
    tasks = cargar_tasks()
    meta = parsear_tasks_md()
    resp["config"]["n_tareas"] = len(tasks)
    resp["config"]["tareas"] = [t.task_name for t in tasks]

    # ---------------- prueba de carga dummy: arquitectura SIN pesos + tensor aleatorio
    if dummy:
        resp["random_load_test"] = True
        model = construir_modelo(tasks, clip_len).to(device).eval()
        nparams = sum(p.numel() for p in model.parameters())
        x = torch.rand(1, 3, clip_len, CROP, CROP, device=device)
        with torch.no_grad():
            out = model(x)
            emb = model.forward_features(x)
        shapes = {k: list(v.shape) for k, v in out.items()}
        resp["raw_output"] = {
            "nota": "PRUEBA DE CARGA: arquitectura sin pesos + torch.rand; NO se ha corrido inferencia real.",
            "entrada_shape": list(x.shape), "embedding_shape": list(emb.shape), "claves_salida": list(out.keys()),
            "shapes_salida": shapes, "n_parametros": int(nparams),
            "n_parametros_mb_fp32": round(nparams * 4 / 2**20, 1),
            "salida_aleatoria_sin_significado": {k: v.detach().cpu().numpy().round(6).tolist() for k, v in out.items()},
        }
        valores = {k: v.detach().cpu().numpy()[0] for k, v in out.items()}
        resp["normalized"] = filas_tareas(resp, tasks, meta, valores, "prueba_de_carga", "prueba de carga con tensor aleatorio")
        resp["raw_output"]["vram_pico_mb"] = runs.vram_pico_mb()
        resp["status"] = "ok"
        resp["message"] = "Prueba de carga dummy completada (sin pesos, tensor aleatorio). NO es inferencia real."
        return

    # ---------------- inferencia real
    if not ruta_pesos.exists():
        resp["status"] = "error"
        resp["message"] = PREGUNTA_PESOS.format(ruta=WEIGHTS_REL)
        return
    resp["checkpoint"]["sha256"] = runs.sha256_file(ruta_pesos)

    videos = listar_videos(runs.resolve(inp))
    if not videos:
        resp["status"] = "error"
        resp["message"] = "La carpeta de entrada no contiene videos."
        return

    model = construir_modelo(tasks, clip_len)
    carga = cargar_pesos(model, ruta_pesos, weights_only=bool(opts.get("torch_load_weights_only", True)))
    model.to(device).eval()
    if device == "cuda":
        torch.cuda.reset_peak_memory_stats()
    nparams = sum(p.numel() for p in model.parameters())

    rng = np.random.RandomState(SEED)
    por_video, medias, adaptado_alguno = {}, [], False
    for vp in videos:
        frames = leer_frames(vp)
        h, w = frames[0].shape[:2]
        adaptar = (h, w) != (CROP, CROP)
        adaptado_alguno |= adaptar
        x, inicios = hacer_clips(frames, num_clips, clip_len, rng, adaptar)
        outs = []
        with torch.no_grad():
            for c in range(x.shape[0]):   # un clip por pasada, como utils.py L326
                o = model(x[c:c + 1].to(device))
                outs.append({k: v.float().cpu().numpy()[0] for k, v in o.items()})
        media = {t.task_name: np.mean([o[t.task_name] for o in outs], axis=0) for t in tasks}  # utils.py L331
        medias.append(media)
        por_video[vp.name] = {
            "frames_leidos": len(frames), "tamano_original_hxw": [h, w], "preprocesamiento_adaptado": bool(adaptar),
            "frame_inicial_de_cada_clip": inicios,
            "salida_por_clip": {t.task_name: [o[t.task_name].tolist() for o in outs] for t in tasks},
            "media_de_clips": {k: v.tolist() for k, v in media.items()},
        }
    quality = "preprocesamiento_adaptado" if adaptado_alguno else "preprocesamiento_oficial"
    if adaptado_alguno:
        resp["warnings"].append(
            "preprocesamiento_adaptado: el video no es 224x224; EchoDataset (dataset.py L389-505) no redimensiona y solo hace "
            "CenterCrop 224. Se aplico cv2.resize 256x256 INTER_AREA + CenterCrop 224 como en EchoNetDynamicDataset/"
            "EchoNetPediatricDataset (dataset.py L103, L221). Es una desviacion explicita.")
        resp["config"]["desviaciones"].append("Redimensionado 256x256 (INTER_AREA) antes del CenterCrop 224 en videos que no son 224x224 (preprocesamiento_adaptado).")

    filas = []
    for vp, media in zip(videos, medias):
        filas += filas_tareas(resp, tasks, meta, media, quality + "|nivel_video",
                              f"video={vp.name}; media de {num_clips} clips de {clip_len} frames", input_file=runs.rel(vp))
    raw = {"checkpoint_carga": carga, "n_parametros": int(nparams), "videos": por_video,
           "semilla_clips": SEED, "num_clips": num_clips, "clip_len": clip_len}
    if len(videos) > 1:
        estudio = {t.task_name: np.mean([m[t.task_name] for m in medias], axis=0) for t in tasks}  # utils.py L211
        raw["agregacion_estudio"] = {"metodo": "media de las salidas por video (src/utils.py L211; README L15)",
                                     "n_videos": len(videos), "valores": {k: v.tolist() for k, v in estudio.items()}}
        filas += filas_tareas(resp, tasks, meta, estudio, quality + "|nivel_estudio_agregado",
                              f"AGREGACION A NIVEL ESTUDIO: media de {len(videos)} videos (utils.py L211)")
    raw["vram_pico_mb"] = runs.vram_pico_mb()
    resp["raw_output"] = raw
    resp["normalized"] = filas
    resp["inferencia_real"] = True
    resp["status"] = "ok"
    resp["message"] = f"Inferencia real PanEcho sobre {len(videos)} video(s); {len(filas)} filas. Salidas de modelo de investigación; no diagnóstico."


if __name__ == "__main__":
    sys.exit(runs.ejecutar_adaptador(MODEL, run))
