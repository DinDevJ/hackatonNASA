"""Adaptador MedSAM2 (segmentacion y seguimiento visual guiados por el usuario).

NO es diagnostico. Es segmentacion visual generica: el modelo recibe una indicacion inicial
(caja o mascara) aportada por el usuario y propaga la mascara por los frames.
Sin indicacion inicial se rechaza (no hay segmentacion automatica).

Uso (python de envs/medsam2):
  python adapters/medsam2/infer.py --request R/request.json --response R/response.json

Opciones (request.options):
  caja: [x0,y0,x1,y1] en pixeles del frame ORIGINAL        (indicacion inicial, opcion A)
  mascara_inicial: ruta a .png/.npy binaria del frame ORIGINAL (indicacion inicial, opcion B)
  frame_prompt: indice del frame donde se da la indicacion (def. 0)
  device: auto|cpu|cuda     score_thresh: umbral de logits (def. 0.0, como el script oficial)
  apply_postprocessing: bool (def. false, como el script oficial)
  max_frames: int|null      prueba_carga_dummy: bool       permitir_color: bool
"""
from __future__ import annotations

import json
import shutil
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from core import runs  # noqa: E402
from core.formato import filas_modelo  # noqa: E402
from core.modalidad import validar  # noqa: E402

MODEL = "medsam2"
ADMITIDAS = ["video_2d", "imagen_2d"]
VENDOR = runs.ROOT / "vendor" / "MedSAM2"
CONFIG = "configs/sam2.1_hiera_t512.yaml"  # medsam2_infer_video.py:423-426
CKPT_REL = "weights/medsam2/MedSAM2_US_Heart.pt"
CKPT_URL = "https://huggingface.co/wanglab/MedSAM2/resolve/main/MedSAM2_US_Heart.pt"
# sha256 = oid LFS (cabecera x-linked-etag del HEAD, 2026-11-14); se verifica tras descargar.
CKPT_SHA256 = "295c0ff8912c99947c364287bbecd1cd36963f0c0ac67a042d292f0dedf8d933"
MSG_SIN_PROMPT = ("MedSAM2 requiere una indicacion inicial (caja o mascara); "
                  "no se ofrece segmentacion automatica")
NOTA_AREA = "segmentacion visual generica; no es diagnostico; sin calibracion no hay mm/ml"
FUENTE_PREPROC = {
    "config_modelo": "vendor/MedSAM2/medsam2_infer_video.py:423-426 (sam2_cfg=configs/sam2.1_hiera_t512.yaml; "
                     "yaml: image_size 512)",
    "construccion": "vendor/MedSAM2/medsam2_infer_video.py:507-516 (build_sam2_video_predictor, "
                    "++model.non_overlap_masks=true, apply_postprocessing=False por defecto)",
    "frames": "vendor/MedSAM2/medsam2_infer_video.py:166-175 (carpeta de JPEG ordenados + "
              "predictor.init_state(video_path, async_loading_frames=False)); aqui los JPEG se extraen del "
              "mp4/png original con OpenCV (calidad 95)",
    "redimension_normalizacion": "vendor/MedSAM2/sam2/utils/misc.py:92-97 (RGB, resize a 512x512, /255) y "
                                 "misc.py:265-275 (media 0.485,0.456,0.406 / desv 0.229,0.224,0.225)",
    "indicacion_mascara": "vendor/MedSAM2/medsam2_infer_video.py:242-247 (predictor.add_new_mask, frame 0)",
    "indicacion_caja": "vendor/MedSAM2/sam2/sam2_video_predictor.py:173-250 (add_new_points_or_box(box=...), "
                       "coordenadas en pixeles del frame original, normalizadas por video_width/height). "
                       "DESVIACION: medsam2_infer_video.py solo usa mascaras; la caja es la API del "
                       "predictor del propio repo (usada en medsam2_infer_3D_CT.py)",
    "propagacion": "vendor/MedSAM2/medsam2_infer_video.py:263-270 (propagate_in_video; mascara = logits > "
                   "score_thresh, defecto 0.0 en :159/:462-466). EXTENSION: si frame_prompt>0 se propaga "
                   "tambien en reversa (reverse=True) desde ese frame",
    "autocast": "vendor/MedSAM2/medsam2_infer_video.py:151-152 (torch.inference_mode + autocast bfloat16 en "
                "cuda; en CPU sin autocast)",
}


def _opt(request: dict) -> dict:
    return request.get("options") or {}


def _contar_parametros(modelo) -> dict:
    tot = sum(p.numel() for p in modelo.parameters())
    out = {"total": tot}
    for nombre, mod in modelo.named_children():
        out[nombre] = sum(p.numel() for p in mod.parameters())
    return out


def _preparar_vendor():
    if not VENDOR.is_dir():
        raise RuntimeError("Falta vendor/MedSAM2 (repo clonado en la entrega).")
    sys.path.insert(0, str(VENDOR))  # paquete sam2 sin instalar: no se compila la extension CUDA


def _construir(device: str, ckpt: Path | None, postproc: bool):
    import torch  # noqa: F401
    from sam2.build_sam import build_sam2_video_predictor
    pred = build_sam2_video_predictor(
        config_file=CONFIG, ckpt_path=str(ckpt) if ckpt else None, device=device,
        apply_postprocessing=postproc, hydra_overrides_extra=["++model.non_overlap_masks=true"])
    return pred


# ------------------------------------------------------------------ prueba de carga
def _prueba_dummy(request: dict, resp: dict, device: str) -> None:
    import numpy as np
    import torch
    from PIL import Image
    t0 = time.perf_counter()
    resp["random_load_test"] = True
    resp["config"] = {"config_modelo": CONFIG, "modo": "prueba_carga_dummy: arquitectura SIN pesos, "
                      "frames de ruido aleatorio", "preprocesamiento_fuente": FUENTE_PREPROC}
    run_dir = runs.resolve(request.get("run_dir") or ".")
    tmp = run_dir / "_dummy_frames"
    shutil.rmtree(tmp, ignore_errors=True)
    tmp.mkdir(parents=True, exist_ok=True)
    rng = np.random.default_rng(0)
    n, h, w = 3, 96, 120
    for i in range(n):
        Image.fromarray(rng.integers(0, 256, (h, w, 3), dtype=np.uint8)).save(tmp / f"{i:05d}.jpg", quality=95)
    pred = _construir(device, None, False)
    params = _contar_parametros(pred)
    t_build = time.perf_counter() - t0
    shapes = {}
    with torch.inference_mode():
        st = pred.init_state(video_path=str(tmp), async_loading_frames=False)
        shapes["images"] = list(st["images"].shape)
        _, ids, logits = pred.add_new_points_or_box(st, frame_idx=0, obj_id=1, box=[20, 20, 90, 70])
        shapes["add_new_points_or_box_logits"] = list(logits.shape)
        propag = []
        for fi, oids, lg in pred.propagate_in_video(st):
            propag.append({"frame": int(fi), "obj_ids": [int(o) for o in oids], "logits_shape": list(lg.shape)})
    shutil.rmtree(tmp, ignore_errors=True)
    resp["device"] = device
    resp["raw_output"] = {
        "parametros": params, "parametros_total_M": round(params["total"] / 1e6, 3),
        "shapes": shapes, "propagacion": propag,
        "t_construccion_s": round(t_build, 2), "t_total_prueba_s": round(time.perf_counter() - t0, 2),
        "vram_pico_mb": runs.vram_pico_mb(),
        "nota": "pesos aleatorios, ruido: la salida no significa nada. NO se ha corrido inferencia real.",
    }
    resp["status"] = "prueba_carga"
    resp["message"] = (f"Arquitectura MedSAM2 ({CONFIG}) construida sin pesos y propagada sobre {n} frames "
                       f"dummy: {params['total']/1e6:.1f} M parametros. NO se ha corrido inferencia real.")


# ------------------------------------------------------------------ entrada
def _extraer_frames(path: Path, modalidad: str, out_dir: Path, max_frames):
    """Devuelve (n_frames, alto, ancho, fps, lista_rutas_originales_en_memoria=None)."""
    import cv2
    out_dir.mkdir(parents=True, exist_ok=True)
    if modalidad == "imagen_2d":
        img = cv2.imread(str(path), cv2.IMREAD_COLOR)
        if img is None:
            raise RuntimeError("No se pudo leer la imagen con OpenCV.")
        cv2.imwrite(str(out_dir / "00000.jpg"), img, [cv2.IMWRITE_JPEG_QUALITY, 95])
        return 1, img.shape[0], img.shape[1], None
    cap = cv2.VideoCapture(str(path))
    if not cap.isOpened():
        raise RuntimeError("OpenCV no pudo abrir el video.")
    fps = float(cap.get(cv2.CAP_PROP_FPS) or 0.0)
    n = 0
    h = w = 0
    while True:
        ok, fr = cap.read()
        if not ok or fr is None:
            break
        h, w = fr.shape[:2]
        cv2.imwrite(str(out_dir / f"{n:05d}.jpg"), fr, [cv2.IMWRITE_JPEG_QUALITY, 95])
        n += 1
        if max_frames and n >= int(max_frames):
            break
    cap.release()
    if n == 0:
        raise RuntimeError("El video no tiene frames legibles.")
    return n, h, w, fps


def _leer_mascara(ruta: str, h: int, w: int):
    import numpy as np
    p = runs.resolve(ruta)
    if not p.exists():
        raise ValueError(f"mascara_inicial no existe: {ruta}")
    if p.suffix.lower() == ".npy":
        m = np.load(p, allow_pickle=False)
    elif p.suffix.lower() in (".png", ".bmp", ".tif", ".tiff"):
        from PIL import Image
        m = np.array(Image.open(p))
        if m.ndim == 3:
            m = m[..., 0]
    else:
        raise ValueError("mascara_inicial debe ser .png o .npy")
    m = np.squeeze(m)
    if m.ndim != 2:
        raise ValueError(f"mascara_inicial debe ser 2D (alto x ancho); recibida {m.shape}")
    if m.shape != (h, w):
        raise ValueError(f"mascara_inicial {m.shape} no coincide con el frame original {(h, w)}")
    m = m > 0
    if not m.any():
        raise ValueError("mascara_inicial esta vacia")
    return m


def _validar_caja(caja, h: int, w: int):
    try:
        x0, y0, x1, y1 = [float(v) for v in caja]
    except Exception:
        raise ValueError("caja debe ser [x0,y0,x1,y1] numerico (pixeles del frame original)")
    if not (x1 > x0 and y1 > y0):
        raise ValueError(f"caja invalida: se requiere x1>x0 e y1>y0, recibida {caja}")
    if x1 <= 0 or y1 <= 0 or x0 >= w or y0 >= h:
        raise ValueError(f"caja fuera del frame ({w}x{h} px): {caja}")
    return [max(x0, 0.0), max(y0, 0.0), min(x1, float(w)), min(y1, float(h))]


# ------------------------------------------------------------------ salidas
def _overlay(path: Path, modalidad: str, masks, caja, frame_prompt: int, out_dir: Path, fps):
    import cv2
    import numpy as np
    texto = "MedSAM2 - segmentacion visual generica - NO diagnostico"

    def pintar(fr, m, idx):
        fr = fr.copy()
        if m.any():
            col = np.zeros_like(fr)
            col[m] = (0, 200, 255)
            fr = cv2.addWeighted(fr, 1.0, col, 0.35, 0)
            cs, _ = cv2.findContours(m.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            cv2.drawContours(fr, cs, -1, (0, 255, 255), 2)
        if caja is not None and idx == frame_prompt:
            cv2.rectangle(fr, (int(caja[0]), int(caja[1])), (int(caja[2]), int(caja[3])), (0, 255, 0), 2)
        cv2.putText(fr, texto, (6, 16), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 1, cv2.LINE_AA)
        cv2.putText(fr, f"frame {idx}", (6, fr.shape[0] - 8), cv2.FONT_HERSHEY_SIMPLEX, 0.45,
                    (255, 255, 255), 1, cv2.LINE_AA)
        return fr

    if modalidad == "imagen_2d":
        fr = cv2.imread(str(path), cv2.IMREAD_COLOR)
        dst = out_dir / "overlay.png"
        cv2.imwrite(str(dst), pintar(fr, masks[0], 0))
        return dst
    cap = cv2.VideoCapture(str(path))
    h, w = masks.shape[1:]
    dst = out_dir / "overlay.mp4"
    vw = cv2.VideoWriter(str(dst), cv2.VideoWriter_fourcc(*"mp4v"), fps or 30.0, (w, h))
    for i in range(masks.shape[0]):
        ok, fr = cap.read()
        if not ok:
            break
        vw.write(pintar(fr, masks[i], i))
    vw.release()
    cap.release()
    return dst


# ------------------------------------------------------------------ run
def run(request: dict, resp: dict) -> None:
    opt = _opt(request)
    declarada = request.get("declared_modality") or "desconocida"
    inp = request.get("input_path")
    inp_p = runs.resolve(inp) if inp else None
    resp["config"]["opciones"] = {k: v for k, v in opt.items()}

    # 1) modalidad
    modalidad = declarada
    if inp_p is not None and inp_p.exists():
        v = validar(inp_p, declarada, ADMITIDAS, MODEL, permitir_color=bool(opt.get("permitir_color", False)))
        resp["warnings"].extend(v.get("warnings", []))
        resp["input"]["modality"] = v.get("modality")
        if not v["ok"]:
            runs.rechazar(resp, v["motivo"])
            return
        modalidad = v["modality"]
        if v.get("meta", {}).get("formato") not in ("video", "imagen"):
            runs.rechazar(resp, f"MedSAM2 (este adaptador) solo lee video (mp4/avi...) o imagen (png/jpg); "
                                f"formato recibido: {v.get('meta', {}).get('formato')}. Convierte tu archivo "
                                "tu mismo (no se convierte en silencio).")
            return
    elif not opt.get("prueba_carga_dummy"):
        raise FileNotFoundError(f"No existe la entrada: {inp}")

    # 2) prueba de carga dummy
    if opt.get("prueba_carga_dummy"):
        _preparar_vendor()
        device = runs.elegir_device(opt.get("device", "auto"))
        resp["checkpoint"] = {"path": None, "url": None, "sha256": None}
        _prueba_dummy(request, resp, device)
        return

    # 3) indicacion inicial obligatoria
    caja = opt.get("caja")
    masc = opt.get("mascara_inicial")
    if caja is None and not masc:
        runs.rechazar(resp, MSG_SIN_PROMPT)
        return
    if caja is not None and masc:
        runs.rechazar(resp, "Aporta SOLO una indicacion inicial: caja o mascara_inicial, no ambas.")
        return
    frame_prompt = int(opt.get("frame_prompt", 0))
    if modalidad == "imagen_2d":
        frame_prompt = 0

    # 4) pesos
    ckpt = runs.resolve(CKPT_REL)
    resp["checkpoint"] = {"path": CKPT_REL, "url": CKPT_URL, "sha256": None}
    if not ckpt.exists():
        resp["status"] = "error"
        resp["message"] = (f"Faltan los pesos {CKPT_REL}. Ejecuta scripts\\descargar_pesos.ps1 -Modelo medsam2")
        resp["errors"].append("checkpoint ausente: " + CKPT_REL)
        return
    sha = runs.sha256_file(ckpt)
    resp["checkpoint"]["sha256"] = sha
    if sha != CKPT_SHA256:
        resp["status"] = "error"
        resp["message"] = (f"sha256 del checkpoint no coincide (esperado {CKPT_SHA256}, obtenido {sha}). "
                           "Vuelve a descargarlo con scripts\\descargar_pesos.ps1 -Modelo medsam2")
        return

    # 5) frames + validacion de la indicacion
    import numpy as np
    import torch
    run_dir = runs.resolve(request.get("run_dir") or ".")
    run_dir.mkdir(parents=True, exist_ok=True)
    tmp = run_dir / "_frames_jpg"
    shutil.rmtree(tmp, ignore_errors=True)
    try:
        res = _extraer_frames(inp_p, modalidad, tmp, opt.get("max_frames"))
        n, h, w = res[0], res[1], res[2]
        fps = res[3] if len(res) > 3 else None
        if not (0 <= frame_prompt < n):
            runs.rechazar(resp, f"frame_prompt={frame_prompt} fuera de rango (0..{n - 1})")
            return
        mask0 = None
        try:
            if caja is not None:
                caja = _validar_caja(caja, h, w)
            else:
                mask0 = _leer_mascara(masc, h, w)
        except ValueError as e:
            runs.rechazar(resp, f"Indicacion inicial invalida: {e}")
            return
        resp["config"]["indicacion_inicial"] = {
            "tipo": "caja" if caja is not None else "mascara",
            "caja_xyxy_px_frame_original": caja, "mascara_inicial": masc if caja is None else None,
            "frame_prompt": frame_prompt, "origen": "aportada por el usuario"}

        # 6) modelo + propagacion
        _preparar_vendor()
        device = runs.elegir_device(opt.get("device", "auto"))
        thr = float(opt.get("score_thresh", 0.0))
        postproc = bool(opt.get("apply_postprocessing", False))
        offload = n > 300
        pred = _construir(device, ckpt, postproc)
        if device == "cuda":
            torch.cuda.reset_peak_memory_stats()
        ctx = (torch.autocast(device_type="cuda", dtype=torch.bfloat16) if device == "cuda"
               else torch.autocast(device_type="cpu", enabled=False))
        masks = np.zeros((n, h, w), dtype=bool)
        tracked = np.zeros(n, dtype=bool)
        with torch.inference_mode(), ctx:
            st = pred.init_state(video_path=str(tmp), offload_video_to_cpu=offload, async_loading_frames=False)
            if caja is not None:
                pred.add_new_points_or_box(st, frame_idx=frame_prompt, obj_id=1, box=caja)
            else:
                pred.add_new_mask(st, frame_idx=frame_prompt, obj_id=1, mask=mask0)
            for rev in ([False, True] if frame_prompt > 0 else [False]):
                for fi, oids, lg in pred.propagate_in_video(st, start_frame_idx=frame_prompt, reverse=rev):
                    masks[fi] = (lg[0] > thr).cpu().numpy().reshape(h, w)
                    tracked[fi] = True
    finally:
        shutil.rmtree(tmp, ignore_errors=True)

    # 7) salidas
    areas = masks.reshape(n, -1).sum(axis=1).astype(np.int64)
    npz = run_dir / "masks.npz"
    np.savez_compressed(npz, masks=masks, areas_px2=areas, tracked=tracked,
                        frame_prompt=frame_prompt, score_thresh=thr)
    ov = _overlay(inp_p, modalidad, masks, caja, frame_prompt, run_dir, fps)
    resp["artifacts"] = [
        {"tipo": "mascaras_npz", "path": runs.rel(npz), "descripcion": "masks[T,H,W] bool, areas_px2, tracked"},
        {"tipo": "overlay", "path": runs.rel(ov), "descripcion": "contorno + relleno de la mascara sobre el original"},
    ]
    resp["device"] = device
    resp["inferencia_real"] = True
    resp["config"].update({
        "config_modelo": CONFIG, "checkpoint_archivo": CKPT_REL, "score_thresh": thr,
        "apply_postprocessing": postproc, "image_size_modelo": 512, "offload_video_to_cpu": offload,
        "n_frames": n, "alto_px": h, "ancho_px": w, "fps": fps, "modalidad": modalidad,
        "preprocesamiento_fuente": FUENTE_PREPROC,
        "aviso": "segmentacion visual generica guiada por el usuario; no es diagnostico"})
    resp["raw_output"] = {
        "areas_px2": areas.tolist(), "frames_con_mascara_no_vacia": int((areas > 0).sum()),
        "frames_propagados": int(tracked.sum()), "vram_pico_mb": runs.vram_pico_mb()}
    q = "segmentacion_guiada_por_usuario;sin_calibracion"
    rows = []
    for i in range(n):
        if not tracked[i]:
            continue
        rows.append(filas_modelo(resp, metric=f"area_mascara_px2:frame_{i:05d}", value=int(areas[i]),
                                 unit="px2", tipo="hallazgo", quality=q, notes=NOTA_AREA))
    vivos = areas[tracked]
    if vivos.size:
        for nom, val in (("area_mascara_px2:min", vivos.min()), ("area_mascara_px2:max", vivos.max()),
                         ("area_mascara_px2:media", float(vivos.mean()))):
            rows.append(filas_modelo(resp, metric=nom, value=val, unit="px2", tipo="hallazgo",
                                     quality=q, notes=NOTA_AREA))
    resp["normalized"] = rows
    resp["status"] = "ok"
    vacios = int(tracked.sum() - (areas[tracked] > 0).sum())
    if vacios:
        resp["warnings"].append(f"{vacios} frame(s) con mascara vacia (el objeto se perdio o no es visible).")
    resp["message"] = (f"Segmentadas {int(tracked.sum())}/{n} frames desde la indicacion del usuario "
                       f"(frame {frame_prompt}); areas en px2 sin calibracion; no es diagnostico.")
    resp["raw_output"]["vram_pico_mb"] = runs.vram_pico_mb()


if __name__ == "__main__":
    sys.exit(runs.ejecutar_adaptador(MODEL, run))
