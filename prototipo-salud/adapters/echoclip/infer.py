"""Adaptador EchoCLIP / EchoCLIP-R (vendor/echo_CLIP @ 23cd327, Academic Software License de Cedars-Sinai).

Funciones expuestas (SOLO las que muestran los ejemplos oficiales del repo):
  similitud_texto  embedding_example.py (EchoCLIP-R, tokenizer de plantilla): similitud video <-> texto de informe.
                   tipo=similitud, unit=coseno.
  feve             zero_shot_example.py + utils.py (EchoCLIP, tokenizer BPE de CLIP): FEVE zero-shot derivada de
                   similitudes. tipo=medicion, unit=%, quality=zero_shot_por_similitud. NO es probabilidad.
  binario          zero_shot_example.py + utils.compute_binary_metric (EchoCLIP): puntuacion de similitud con los
                   prompts de utils.zero_shot_prompts (por defecto 'pacemaker'). tipo=similitud (NUNCA probabilidad_clase).

Entrada: un video 2D (AVI/MP4/...) o una imagen 2D (un solo fotograma). Rechaza volumen_3d y Doppler.
Los pesos NO se descargan aqui ni se hace login: se leen de weights/echoclip/<modelo>/ (scripts\\descargar_pesos.ps1).
No se usa la red en inferencia (HF_HUB_OFFLINE=1). Nada de esto es diagnostico.

options (todas opcionales):
  device            auto|cpu|cuda (por defecto auto)
  precision         auto|fp32|fp16|bf16 (auto = bf16 en cuda como en los ejemplos oficiales, fp32 en CPU)
  funciones         lista de {feve, binario, similitud_texto}; por defecto ["feve", "binario"]
  binarios          claves de utils.zero_shot_prompts sin '<#>' (por defecto ["pacemaker"])
  texto | texto_path  texto del informe para similitud_texto (por defecto, vendor/echo_CLIP/example_report.txt)
  lote_frames       frames por lote en el encoder de imagen (por defecto 32; no cambia el resultado)
  guardar_embeddings  guarda los embeddings por frame en .npy (por defecto true)
  permitir_color    anula el rechazo por posible Doppler color (queda registrado)
  prueba_carga_dummy  arquitectura SIN pesos + tensor aleatorio (NO es inferencia real)
"""
from __future__ import annotations

import contextlib
import copy
import json
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from core import formato, modalidad, runs  # noqa: E402

KEY = "echoclip"
VENDOR = runs.ROOT / "vendor" / "echo_CLIP"
W_DIR = "weights/echoclip"
ADMITIDAS = ["video_2d", "imagen_2d"]
HF_BASE = "https://huggingface.co/mkaichristensen"

# Revision HF y sha256 (oid LFS del HEAD sin token, 2026-11-14) de cada modelo.
MODELOS = {
    "echo-clip": {
        "hf": "mkaichristensen/echo-clip", "revision": "2c66a65d0693e2fefda093de7fc8b05b2f8031ee",
        "sha256": "016e26e15da539b3a97dec89d7fa9a30f106e1c38d36ce64789cb99420786fe0",
        "tokenizer": "bpe", "uso": "zero-shot (FEVE, binarios)",
    },
    "echo-clip-r": {
        "hf": "mkaichristensen/echo-clip-r", "revision": "271e00685543ed609f67b2b97c3f81228af1452b",
        "sha256": "5212c42fab82d4b2dd0a3196058d192bb91bc35c33633bf0ca01cae76d09e1cd",
        "tokenizer": "plantilla", "uso": "similitud video-informe",
    },
}
BIN = "open_clip_pytorch_model.bin"
CFG = "open_clip_config.json"

# Copia de open_clip_config.json (identico en ambos repos HF, sha256 b49881ff...b8b4, 590 B). Solo se usa para la
# prueba de carga sin pesos o si falta el JSON local; con pesos se lee el JSON de weights/echoclip/<modelo>/.
CONFIG_EMBEBIDA = {
    "model_cfg": {
        "embed_dim": 512,
        "vision_cfg": {"timm_model_name": "convnext_base", "timm_model_pretrained": False, "timm_pool": "",
                       "timm_proj": "linear", "timm_drop": 0.0, "timm_drop_path": 0.1, "image_size": 224},
        "text_cfg": {"context_length": 77, "vocab_size": 49408, "width": 512, "heads": 8, "layers": 12},
    },
    "preprocess_cfg": {"mean": [0.48145466, 0.4578275, 0.40821073], "std": [0.26862954, 0.26130258, 0.27577711]},
}

UMBRAL_MARCAPASOS_F1 = 0.298  # zero_shot_example.py L70 (calibrado por los autores con F1 en SU conjunto de prueba)

FUENTE_PREPROC = {
    "lectura_video": "vendor/echo_CLIP/utils.py L136-147 read_avi (cv2, BGR sin convertir) + L115-133 crop_and_scale "
                     "(res 224x224, recorte de proporcion + zoom 0.1 por lado, resize INTER_CUBIC); "
                     "embedding_example.py L22-25, zero_shot_example.py L25-28",
    "transformacion_por_frame": "embedding_example.py L26-28 / zero_shot_example.py L29-31: "
                                "preprocess_val(T.ToPILImage()(frame)) de open_clip (resize 224 bicubico, center crop, "
                                "ToTensor, Normalize con mean/std de open_clip_config.json; el frame BGR se pasa como "
                                "esta, igual que en los ejemplos)",
    "agregacion_similitud_texto": "embedding_example.py L32-38: todos los frames, F.normalize por frame, media sobre "
                                  "frames (la media NO se renormaliza), producto punto con el embedding normalizado del texto (L55-58)",
    "agregacion_zero_shot": "zero_shot_example.py L32-41: frames[0:min(40,n):2] (maximo 20), F.normalize por frame, "
                            "forma (1,frames,512)",
    "feve": "zero_shot_example.py L77-103 + utils.py L82-112 compute_regression_metric: 2 prompts x valores 0..100 "
            "(202 textos, tokenizer BPE open_clip.tokenize), ranking por frame, media de los valores ordenados entre "
            "frames, mediana del 20% superior",
    "binario": "zero_shot_example.py L47-66 + utils.py L71-79 compute_binary_metric: media de similitudes sobre "
               "prompts y frames (sin calibrar, rango -1..1)",
    "tokenizer_plantilla": "embedding_example.py L45-50 + template_tokenizer.py L71-115 template_tokenize "
                           "(echo-clip-r; 77 tokens)",
    "carga_modelo": "embedding_example.py L17-19 / zero_shot_example.py L19-21 create_model_and_transforms("
                    "'hf-hub:mkaichristensen/echo-clip[-r]'). Aqui se carga el MISMO open_clip_config.json y "
                    "open_clip_pytorch_model.bin desde weights/echoclip/<modelo>/ (sin red ni login)",
}


# ----------------------------------------------------------------------------------------------------------------
def _opts(request: dict) -> dict:
    o = dict(request.get("options") or {})
    o.setdefault("device", "auto")
    o.setdefault("precision", "auto")
    o.setdefault("funciones", ["feve", "binario"])
    o.setdefault("binarios", ["pacemaker"])
    o.setdefault("lote_frames", 32)
    o.setdefault("guardar_embeddings", True)
    o.setdefault("permitir_color", False)
    o.setdefault("prueba_carga_dummy", False)
    return o


@contextlib.contextmanager
def _en_vendor():
    """template_tokenizer.py lee 'blank_wordpiece.tokenizer' y 'template_vocab.txt' relativos al cwd."""
    previo = os.getcwd()
    os.chdir(VENDOR)
    try:
        yield
    finally:
        os.chdir(previo)


def _importar_vendor():
    """Importa utils.py (vendor/echo_CLIP). El venv de este modelo no tiene otro modulo 'utils'."""
    if str(VENDOR) not in sys.path:
        sys.path.insert(0, str(VENDOR))
    with _en_vendor():
        import utils as eutils  # noqa: WPS433
    return eutils


def _template_tokenize():
    if str(VENDOR) not in sys.path:
        sys.path.insert(0, str(VENDOR))
    with _en_vendor():
        from template_tokenizer import template_tokenize  # noqa: WPS433
    return template_tokenize


def _precision(opt: str, device: str) -> str:
    if opt in ("fp32", "fp16", "bf16"):
        return opt
    if opt != "auto":
        raise ValueError(f"options.precision={opt!r} no valido (auto|fp32|fp16|bf16)")
    return "bf16" if device == "cuda" else "fp32"


def _dtype(precision: str):
    import torch
    return {"fp32": torch.float32, "fp16": torch.float16, "bf16": torch.bfloat16}[precision]


def _rutas_modelo(nombre: str) -> tuple[Path, Path]:
    d = runs.resolve(f"{W_DIR}/{nombre}")
    return d / BIN, d / CFG


def _cargar_config(nombre: str) -> dict:
    _, cfg_p = _rutas_modelo(nombre)
    if cfg_p.is_file():
        return json.loads(cfg_p.read_text(encoding="utf-8"))
    return copy.deepcopy(CONFIG_EMBEBIDA)


def _crear_modelo(nombre: str, device: str, precision: str, con_pesos: bool):
    """Crea el modelo con open_clip 2.20.0. con_pesos=False => arquitectura sin pesos (prueba de carga)."""
    import open_clip
    import open_clip.factory as of
    cfg = _cargar_config(nombre)
    local = f"{nombre}-local"
    of._MODEL_CONFIGS[local] = copy.deepcopy(cfg["model_cfg"])  # registro de la config de HF, sin red
    mean = tuple(cfg["preprocess_cfg"]["mean"])
    std = tuple(cfg["preprocess_cfg"]["std"])
    pesos = str(_rutas_modelo(nombre)[0]) if con_pesos else None
    model, _, preprocess_val = open_clip.create_model_and_transforms(
        local, pretrained=pesos, precision=precision, device=device, image_mean=mean, image_std=std)
    model.eval()
    for p in model.parameters():
        p.requires_grad = False
    return model, preprocess_val


def _n_params(model) -> dict:
    tot = sum(p.numel() for p in model.parameters())
    vis = sum(p.numel() for p in model.visual.parameters())
    return {"total": tot, "imagen": vis, "texto_y_proyecciones": tot - vis}


def _estimar_vram(n_params: int, precision: str, lote: int) -> dict:
    bytes_p = 4 if precision == "fp32" else 2
    pesos_mb = n_params * bytes_p / 2**20
    act_mb = 30.0 * lote  # ESTIMACION conservadora (delta de RSS medido en CPU: ~14 MB/frame con lote 32; no medido en GPU)
    return {"parametros": n_params, "bytes_por_parametro": bytes_p, "pesos_mb": round(pesos_mb, 1),
            "activaciones_estimadas_mb": round(act_mb, 1), "lote_frames": lote,
            "total_estimado_mb": round(pesos_mb + act_mb, 1),
            "base": "ESTIMACION: parametros medidos x bytes + ~30 MB/frame (conservador; delta de RSS medido en CPU ~14 MB/frame con lote 32; NO medido en GPU)"}


# ------------------------------------------------------------------------------------------------ entrada
def _archivo_unico(input_path: Path) -> Path:
    if input_path.is_file():
        return input_path
    cands = sorted(p for p in input_path.rglob("*") if p.is_file())
    if len(cands) != 1:
        raise ValueError(f"EchoCLIP procesa UN archivo por ejecucion; la carpeta de entrada tiene {len(cands)}. "
                         "Ejecuta cada video por separado.")
    return cands[0]


def _leer_frames(path: Path, eutils):
    """Frames BGR 224x224 (N,224,224,3 uint8) con el pipeline oficial (utils.read_avi / crop_and_scale)."""
    import cv2
    import numpy as np
    ext = path.suffix.lower()
    if ext in modalidad.EXT_IMAGEN:
        img = cv2.imread(str(path), cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError(f"OpenCV no pudo leer la imagen {path.name}")
        frames = np.array([eutils.crop_and_scale(img, (224, 224))])
    elif ext in modalidad.EXT_VIDEO:
        frames = eutils.read_avi(path, (224, 224))
    else:
        raise ValueError(f"formato no soportado por el flujo oficial de EchoCLIP: {ext!r} (read_avi usa cv2: "
                         "convierte DICOM a AVI/MP4 fuera de este prototipo; no se convierte en silencio)")
    if len(frames) == 0:
        raise ValueError(f"no se leyo ningun fotograma de {path.name}")
    return frames


def _preprocesar(frames, preprocess_val, device: str, dtype):
    import torch
    import torchvision.transforms as T
    x = torch.stack([preprocess_val(T.ToPILImage()(f)) for f in frames], dim=0)
    return x.to(device=device, dtype=dtype)


def _embeber_frames(model, x, lote: int):
    import torch
    import torch.nn.functional as F
    outs = []
    with torch.no_grad():
        for i in range(0, x.shape[0], max(1, int(lote))):
            outs.append(F.normalize(model.encode_image(x[i:i + lote]), dim=-1))
    return torch.cat(outs, dim=0)


def _embeber_texto(model, tokens, dim=-1):
    import torch
    import torch.nn.functional as F
    with torch.no_grad():
        return F.normalize(model.encode_text(tokens), dim=dim)


# ------------------------------------------------------------------------------------------------ prueba de carga
def _prueba_carga(request: dict, resp: dict, o: dict) -> None:
    import time
    import torch
    t0 = time.perf_counter()
    device = runs.elegir_device(o["device"])
    prec = _precision(o["precision"], device)
    dtype = _dtype(prec)
    resp["random_load_test"] = True
    resp["device"] = device
    if device == "cuda":
        torch.cuda.reset_peak_memory_stats()
    eutils = _importar_vendor()
    from open_clip import tokenize
    template_tokenize = _template_tokenize()
    modelos = {}
    for nombre in MODELOS:
        model, _ = _crear_modelo(nombre, device, prec, con_pesos=False)
        n = _n_params(model)
        g = torch.Generator().manual_seed(0)
        x = torch.randn(4, 3, 224, 224, generator=g).to(device=device, dtype=dtype)  # tensor ALEATORIO
        if MODELOS[nombre]["tokenizer"] == "bpe":
            tok = tokenize(eutils.zero_shot_prompts["pacemaker"] + ["LV EJECTION FRACTION IS 55%. "])
        else:
            with _en_vendor():
                txt = (VENDOR / "example_report.txt").read_text(encoding="utf-8")
            import torch as _t
            tok = _t.tensor([template_tokenize(txt)], dtype=_t.long)
        tok = tok.to(device)
        with torch.no_grad():
            ei = model.encode_image(x)
            et = model.encode_text(tok)
        modelos[nombre] = {
            "tokenizer": MODELOS[nombre]["tokenizer"], "parametros": n,
            "tokens_shape": list(tok.shape), "tokens_max_id": int(tok.max()),
            "vocab_size_texto": CONFIG_EMBEBIDA["model_cfg"]["text_cfg"]["vocab_size"],
            "encode_image_in": list(x.shape), "encode_image_out": list(ei.shape),
            "encode_text_out": list(et.shape),
            "salida_finita": bool(torch.isfinite(ei.float()).all() and torch.isfinite(et.float()).all()),
            "vram_estimada": _estimar_vram(n["total"], prec, int(o["lote_frames"])),
        }
        del model, x, ei, et
    resp["status"] = "prueba_carga"
    resp["message"] = ("Prueba de carga con arquitectura SIN pesos y tensor aleatorio: NO se ha corrido inferencia real "
                       "(la salida no significa nada).")
    resp["config"].update({"funcion": "prueba_carga_dummy", "device": device, "precision": prec,
                           "open_clip_config": "embebida (identica a open_clip_config.json de HF, sha256 b49881ff...)",
                           "preprocesamiento_fuente": FUENTE_PREPROC})
    resp["raw_output"] = {"modelos": modelos, "vram_pico_mb": runs.vram_pico_mb(),
                          "tiempo_s": round(time.perf_counter() - t0, 2)}


# ------------------------------------------------------------------------------------------------ inferencia real
def _verificar_pesos(nombres: list[str]) -> tuple[list[str], list[str]]:
    """Devuelve (modelos_disponibles, mensajes_de_falta). Verifica sha256 del .bin contra el oid LFS de HF."""
    ok, faltan = [], []
    for n in nombres:
        b, _ = _rutas_modelo(n)
        if not b.is_file():
            faltan.append(f"falta {runs.rel(b)}")
            continue
        sha = runs.sha256_file(b)
        if sha != MODELOS[n]["sha256"]:
            raise RuntimeError(f"sha256 de {runs.rel(b)} = {sha} no coincide con el esperado "
                               f"{MODELOS[n]['sha256']} (revision HF {MODELOS[n]['revision']}): archivo corrupto "
                               "o de otra revision; vuelve a descargarlo con scripts\\descargar_pesos.ps1 -Modelo echoclip")
        ok.append(n)
    return ok, faltan


def _fila(resp, **kw):
    return formato.filas_modelo(resp, **kw)


def _inferir(request: dict, resp: dict, o: dict, archivo: Path, modalidad_final: str) -> None:
    import time
    import numpy as np
    import torch
    t0 = time.perf_counter()
    funciones = list(o["funciones"])
    bad = [f for f in funciones if f not in ("feve", "binario", "similitud_texto")]
    if bad:
        raise ValueError(f"options.funciones desconocidas: {bad} (validas: feve, binario, similitud_texto)")
    necesarios = []
    if "feve" in funciones or "binario" in funciones:
        necesarios.append("echo-clip")
    if "similitud_texto" in funciones:
        necesarios.append("echo-clip-r")
    disponibles, faltan = _verificar_pesos(necesarios)
    if faltan:
        msg = ("Faltan pesos de EchoCLIP (" + "; ".join(faltan) + "). Son publicos (sin login ni terminos): "
               "ejecuta scripts\\descargar_pesos.ps1 -Modelo echoclip")
        if not disponibles:
            resp["status"] = "error"
            resp["message"] = msg
            resp["errors"].append(msg)
            return
        resp["warnings"].append(msg + ". Se ejecutan solo las funciones cuyo modelo esta disponible.")

    device = runs.elegir_device(o["device"])
    prec = _precision(o["precision"], device)
    dtype = _dtype(prec)
    if device == "cuda":
        torch.cuda.reset_peak_memory_stats()
    eutils = _importar_vendor()
    from open_clip import tokenize
    run_dir = runs.resolve(request.get("run_dir") or ".")
    run_dir.mkdir(parents=True, exist_ok=True)
    lote = int(o["lote_frames"])
    frames = _leer_frames(archivo, eutils)
    n_frames = int(len(frames))
    filas, raw, artefactos, ckpts = [], {}, [], []
    cfg_run = {"device": device, "precision": prec, "funciones": funciones, "lote_frames": lote,
               "frames_leidos": n_frames, "modalidad": modalidad_final, "preprocesamiento_fuente": FUENTE_PREPROC,
               "open_clip": "2.20.0", "carga": "open_clip.create_model_and_transforms con config y .bin locales"}

    def _emb(nombre, idx=None):
        model, pre = _crear_modelo(nombre, device, prec, con_pesos=True)
        sel = frames if idx is None else frames[idx]
        x = _preprocesar(sel, pre, device, dtype)
        e = _embeber_frames(model, x, lote)
        b, _ = _rutas_modelo(nombre)
        ckpts.append({"modelo": nombre, "path": runs.rel(b), "url": f"{HF_BASE}/{nombre}/resolve/main/{BIN}",
                      "sha256": MODELOS[nombre]["sha256"], "revision_hf": MODELOS[nombre]["revision"]})
        return model, e

    def _guardar(nombre, e, etiqueta):
        if not o["guardar_embeddings"]:
            return
        p = run_dir / f"embeddings_{nombre}_{etiqueta}.npy"
        np.save(p, e.float().cpu().numpy())
        artefactos.append({"tipo": "embeddings_npy", "path": runs.rel(p),
                           "descripcion": f"embeddings normalizados por frame de {nombre} ({etiqueta}), forma {list(e.shape)}"})

    # -- EchoCLIP: FEVE y binarios (comparten los embeddings de los frames 0:min(40,n):2)
    if "echo-clip" in disponibles:
        idx = list(range(0, min(40, n_frames), 2))
        model, e = _emb("echo-clip", idx)
        _guardar("echo-clip", e, "zero_shot_frames")
        ev = e.unsqueeze(0)  # (1, frames, 512) como zero_shot_example.py L41
        raw["zero_shot"] = {"frames_usados_indices": idx, "n_frames_usados": len(idx)}
        if "feve" in funciones:
            vals, prompts = [], []
            for p in eutils.zero_shot_prompts["ejection_fraction"]:
                for i in range(101):
                    prompts.append(p.replace("<#>", str(i)))
                    vals.append(i)
            emb_p = _embeber_texto(model, tokenize(prompts).to(device))
            pred = eutils.compute_regression_metric(ev, emb_p, vals)
            v = float(pred.item())
            raw["zero_shot"]["feve_pct_sin_redondear"] = v
            raw["zero_shot"]["feve_n_prompts"] = len(prompts)
            filas.append(_fila(
                resp, metric="ejection_fraction_zero_shot", value=v, unit="%", tipo="medicion",
                quality="zero_shot_por_similitud",
                notes="derivada de similitudes, no es probabilidad; estimacion zero-shot de EchoCLIP (mediana del 20% "
                      "superior de valores 0-100 ordenados por similitud con 2 prompts), no medida; vista y calidad "
                      "no verificadas; no diagnostica"))
        if "binario" in funciones:
            raw["zero_shot"]["binarios"] = {}
            for clave in o["binarios"]:
                ps = eutils.zero_shot_prompts.get(clave)
                if ps is None or any("<#>" in p for p in ps):
                    raise ValueError(f"options.binarios: {clave!r} no es un prompt binario de utils.zero_shot_prompts "
                                     f"(validos: {[k for k, v in eutils.zero_shot_prompts.items() if not any('<#>' in p for p in v)]})")
                emb_p = _embeber_texto(model, tokenize(ps).to(device))
                s = float(eutils.compute_binary_metric(ev, emb_p).item())
                info = {"puntuacion_sin_redondear": s, "n_prompts": len(ps)}
                nota = ("puntuacion de similitud imagen-texto zero-shot, sin calibrar (rango -1..1); NO es "
                        "probabilidad ni deteccion confirmada")
                if clave == "pacemaker":
                    info["umbral_oficial_f1"] = UMBRAL_MARCAPASOS_F1
                    info["supera_umbral_oficial"] = bool(s > UMBRAL_MARCAPASOS_F1)
                    info["umbral_nota"] = ("zero_shot_example.py L68-71: umbral calibrado por los autores con F1 en su "
                                           "conjunto de prueba; no transferible a otros datos/equipos")
                    nota += "; umbral oficial 0.298 (F1 del conjunto de los autores) solo en raw_output"
                raw["zero_shot"]["binarios"][clave] = info
                filas.append(_fila(resp, metric=f"zero_shot_similitud:{clave}", value=s, unit="coseno", tipo="similitud",
                                   quality="zero_shot_no_calibrado", notes=nota))
        del model

    # -- EchoCLIP-R: similitud video <-> texto
    if "echo-clip-r" in disponibles:
        texto = o.get("texto")
        origen = "options.texto"
        if not texto and o.get("texto_path"):
            texto = runs.resolve(o["texto_path"]).read_text(encoding="utf-8")
            origen = f"options.texto_path={o['texto_path']}"
        if not texto:
            texto = (VENDOR / "example_report.txt").read_text(encoding="utf-8")
            origen = "vendor/echo_CLIP/example_report.txt (texto de ejemplo del repo)"
            resp["warnings"].append("similitud_texto sin options.texto/texto_path: se usa el informe de EJEMPLO del repo, "
                                    "que no pertenece a este video.")
        template_tokenize = _template_tokenize()
        model, e = _emb("echo-clip-r", None)
        _guardar("echo-clip-r", e, "todos_los_frames")
        ve = e.mean(dim=0, keepdim=True)  # embedding_example.py L38 (sin renormalizar)
        toks = torch.tensor(template_tokenize(texto), dtype=torch.long).unsqueeze(0).to(device)
        te = _embeber_texto(model, toks)
        s = float((te @ ve.T).squeeze(0).item())
        raw["similitud_texto"] = {"valor_sin_redondear": s, "n_frames_usados": n_frames, "origen_texto": origen,
                                  "tokens_no_cero": int((toks != 0).sum()), "texto_chars": len(texto),
                                  "norma_embedding_video_medio": float(ve.norm().item())}
        filas.append(_fila(
            resp, metric="similitud_video_texto", value=s, unit="coseno", tipo="similitud", quality="similitud_oficial_echoclip_r",
            notes=("producto punto entre el embedding normalizado del texto y la media de embeddings normalizados por "
                   "frame (embedding_example.py); es una similitud, NO una probabilidad ni evidencia clinica; "
                   f"texto: {origen}")))
        del model

    resp["checkpoint"] = {k: ckpts[0][k] for k in ("path", "url", "sha256")}
    resp["config"].update(cfg_run)
    resp["config"]["checkpoints"] = ckpts
    resp["device"] = device
    resp["inferencia_real"] = True
    raw["vram_pico_mb"] = runs.vram_pico_mb()
    raw["tiempo_inferencia_s"] = round(time.perf_counter() - t0, 2)
    resp["raw_output"] = raw
    resp["normalized"] = filas
    resp["artifacts"] = artefactos
    resp["status"] = "ok"
    resp["message"] = (f"EchoCLIP: {len(filas)} salida(s) ({', '.join(f['metric'] for f in filas)}). "
                       "Similitudes y zero-shot, no probabilidades clinicas; no diagnostico.")


def run(request: dict, resp: dict) -> None:
    os.environ.setdefault("HF_HUB_OFFLINE", "1")  # nunca red ni credenciales durante la inferencia
    o = _opts(request)
    resp["config"] = {"opciones": {k: v for k, v in o.items()}}
    inp = runs.resolve(request["input_path"])
    val = modalidad.validar(inp, request.get("declared_modality") or "desconocida", ADMITIDAS, "EchoCLIP",
                            permitir_color=bool(o["permitir_color"]))
    resp["input"]["modality"] = val.get("modality")
    resp["warnings"].extend(val.get("warnings") or [])
    if not val["ok"]:
        runs.rechazar(resp, val["motivo"])
        return
    archivo = _archivo_unico(inp)
    if o["prueba_carga_dummy"]:
        _prueba_carga(request, resp, o)
        return
    _inferir(request, resp, o, archivo, val["modality"])


if __name__ == "__main__":
    sys.exit(runs.ejecutar_adaptador(KEY, run))
