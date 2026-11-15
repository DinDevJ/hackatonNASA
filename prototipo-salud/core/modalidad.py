"""Detección y validación de modalidad (IMPORTANTE SOBRE LAS MODALIDADES del encargo).

Modalidades: imagen_2d | video_2d | volumen_3d | doppler_color | doppler_espectral | ecg_1d | desconocida

Reglas:
- Si el archivo trae metadatos que fijan la modalidad (DICOM: SOP Class, Ultrasound Regions;
  extensiones de volumen .nii/.nrrd/.mha), mandan sobre lo declarado; si lo contradicen, se rechaza.
- Si no hay metadatos (AVI/MP4/PNG), se usa la modalidad declarada por el usuario.
- Para videos sin metadatos se mide la fracción de píxeles muy saturados (color). Si supera
  el umbral, se rechaza como "posible Doppler color" salvo que el usuario lo anule explícitamente
  (opción registrada en la configuración de la ejecución).
- Nunca se convierte un dato incompatible para forzar una predicción.
- `ecg_1d` (señal ECG 1D) solo se admite como registro WFDB (.hea + .dat, opcional .atr/.qrs; el .hea fija la
  modalidad) o como tabla CSV/TXT/TSV declarada `ecg_1d`. Una señal 1D nunca pasa como imagen/video/volumen/Doppler
  y un video/imagen/DICOM/volumen nunca pasa como `ecg_1d`. No se comprueba que la señal sea realmente un ECG.

Dependencias: biblioteca estándar; numpy + opencv y pydicom son OPCIONALES (si faltan, se
informa y se usa lo declarado). Funciona en el venv de la app y en los de los modelos.
"""
from __future__ import annotations

from pathlib import Path
from typing import Any

MODALIDADES = ("imagen_2d", "video_2d", "volumen_3d", "doppler_color", "doppler_espectral", "ecg_1d", "desconocida")
MODALIDAD_ECG = "ecg_1d"
EXT_VIDEO = {".avi", ".mp4", ".mov", ".mkv", ".webm", ".m4v"}
EXT_IMAGEN = {".png", ".jpg", ".jpeg", ".bmp", ".tif", ".tiff"}
EXT_VOLUMEN = {".nii", ".nrrd", ".mha", ".mhd", ".vtk", ".vol"}  # .nii.gz se trata aparte
EXT_DICOM = {".dcm", ".dicom", ""}
EXT_ARRAY = {".npy", ".npz"}
EXT_WFDB = {".hea", ".dat", ".atr", ".qrs"}       # registro WFDB (PhysioNet): cabecera, señal, anotaciones
EXT_SENAL_TABULAR = {".csv", ".txt", ".tsv"}      # señal 1D en tabla (requiere options.fs)
FORMATOS_SENAL_1D = {"wfdb", "csv_senal"}

# DICOM
SOP_US_IMAGE = "1.2.840.10008.5.1.4.1.1.6.1"          # Ultrasound Image Storage
SOP_US_MULTIFRAME = "1.2.840.10008.5.1.4.1.1.3.1"     # Ultrasound Multi-frame Image Storage
SOP_US_VOLUME = "1.2.840.10008.5.1.4.1.1.6.2"         # Enhanced US Volume Storage
REGION_DATA_TYPE = {  # (0018,6014) RegionDataType
    0x01: "tissue", 0x02: "color_flow", 0x03: "pw_spectral_doppler", 0x04: "cw_spectral_doppler",
    0x05: "doppler_mean_trace", 0x06: "doppler_mode_trace", 0x07: "doppler_max_trace",
    0x08: "volume_trace", 0x0A: "ecg_trace", 0x0B: "pulse_trace", 0x0C: "phonocardiogram",
    0x0D: "gray_bar", 0x0E: "color_bar", 0x0F: "integrated_backscatter",
}
UMBRAL_COLOR = 0.05  # fracción de píxeles con saturación alta para sospechar Doppler color


def _ext(path: Path) -> str:
    n = path.name.lower()
    if n.endswith(".nii.gz"):
        return ".nii.gz"
    return path.suffix.lower()


def _es_dicom(path: Path) -> bool:
    try:
        with open(path, "rb") as f:
            f.seek(128)
            return f.read(4) == b"DICM"
    except OSError:
        return False


def _info_dicom(path: Path) -> dict:
    """Lee cabecera DICOM (sin píxeles). Devuelve modalidad si los metadatos la fijan."""
    out: dict[str, Any] = {"formato": "dicom"}
    try:
        import pydicom  # type: ignore
    except Exception:
        out["aviso"] = "pydicom no instalado: no se pudieron leer metadatos DICOM"
        return out
    ds = pydicom.dcmread(str(path), stop_before_pixels=True, force=True)
    sop = str(getattr(ds, "SOPClassUID", ""))
    out.update({
        "sop_class_uid": sop,
        "modality_tag": str(getattr(ds, "Modality", "")),
        "frames": int(getattr(ds, "NumberOfFrames", 1) or 1),
        "rows": int(getattr(ds, "Rows", 0) or 0),
        "columns": int(getattr(ds, "Columns", 0) or 0),
        "photometric": str(getattr(ds, "PhotometricInterpretation", "")),
        "frame_time_ms": _f(getattr(ds, "FrameTime", None)),
        "cine_rate": _f(getattr(ds, "CineRate", None)),
        "manufacturer": str(getattr(ds, "Manufacturer", "")),
    })
    regiones = []
    for r in getattr(ds, "SequenceOfUltrasoundRegions", []) or []:
        dt = int(getattr(r, "RegionDataType", 0) or 0)
        regiones.append({
            "region_data_type": REGION_DATA_TYPE.get(dt, f"0x{dt:02X}"),
            "region_spatial_format": int(getattr(r, "RegionSpatialFormat", 0) or 0),
            # Calibración tal cual la trae el archivo (no se usa para calcular mm/ml aquí)
            "physical_delta_x": _f(getattr(r, "PhysicalDeltaX", None)),
            "physical_delta_y": _f(getattr(r, "PhysicalDeltaY", None)),
            "physical_units_x": int(getattr(r, "PhysicalUnitsXDirection", 0) or 0),
            "physical_units_y": int(getattr(r, "PhysicalUnitsYDirection", 0) or 0),
        })
    out["ultrasound_regions"] = regiones
    tipos = {r["region_data_type"] for r in regiones}
    if sop == SOP_US_VOLUME:
        out["modality"] = "volumen_3d"
    elif tipos & {"pw_spectral_doppler", "cw_spectral_doppler"}:
        out["modality"] = "doppler_espectral"
    elif "color_flow" in tipos:
        out["modality"] = "doppler_color"
    elif out["frames"] > 1:
        out["modality"] = "video_2d"
    elif sop in (SOP_US_IMAGE, SOP_US_MULTIFRAME) or out["modality_tag"] == "US":
        out["modality"] = "imagen_2d"
    out["fija_modalidad"] = "modality" in out and bool(regiones or sop == SOP_US_VOLUME or out["frames"] > 1)
    return out


def _f(v: Any) -> float | None:
    try:
        return None if v is None else float(v)
    except (TypeError, ValueError):
        return None


def _info_video(path: Path, n_muestras: int = 8) -> dict:
    out: dict[str, Any] = {"formato": "video"}
    try:
        import cv2  # type: ignore
        import numpy as np  # type: ignore
    except Exception:
        out["aviso"] = "opencv/numpy no instalados: no se leyeron frames"
        return out
    cap = cv2.VideoCapture(str(path))
    if not cap.isOpened():
        out["error"] = "OpenCV no pudo abrir el video (códec no soportado o archivo dañado)"
        return out
    n = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    out.update({"frames": n, "fps": float(cap.get(cv2.CAP_PROP_FPS) or 0.0),
                "width": int(cap.get(cv2.CAP_PROP_FRAME_WIDTH) or 0),
                "height": int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT) or 0)})
    idxs = sorted({int(i) for i in np.linspace(0, max(n - 1, 0), num=min(n_muestras, max(n, 1)))})
    fr = []
    for i in idxs:
        cap.set(cv2.CAP_PROP_POS_FRAMES, i)
        ok, frame = cap.read()
        if ok and frame is not None:
            fr.append(_fraccion_color(frame, cv2, np))
    cap.release()
    out["fraccion_color_max"] = round(max(fr), 4) if fr else None
    return out


def _fraccion_color(frame, cv2, np) -> float:
    if frame.ndim < 3 or frame.shape[2] < 3:
        return 0.0
    hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
    sat, val = hsv[..., 1], hsv[..., 2]
    activos = val > 40
    if activos.sum() == 0:
        return 0.0
    return float(((sat > 90) & activos).sum() / activos.sum())


def _info_wfdb(hea: Path) -> dict:
    """Lee la cabecera WFDB (.hea, texto) sin dependencias. El .hea fija la modalidad ecg_1d."""
    out: dict[str, Any] = {"formato": "wfdb", "registro": hea.stem}
    try:
        lineas = [x.strip() for x in hea.read_text(encoding="utf-8", errors="replace").splitlines()]
    except OSError as e:
        return {"formato": "wfdb", "error": f"no se pudo leer la cabecera WFDB {hea.name}: {e}"}
    lineas = [x for x in lineas if x and not x.startswith("#")]
    if not lineas:
        return {"formato": "wfdb", "error": f"cabecera WFDB vacía: {hea.name}"}
    cab = lineas[0].split()
    try:
        n_sig = int(cab[1])
        fs = float(cab[2].split("/")[0].split("(")[0]) if len(cab) > 2 else 250.0  # 250 Hz = valor por defecto WFDB
        n_muestras = int(cab[3]) if len(cab) > 3 else None
    except (IndexError, ValueError):
        return {"formato": "wfdb", "error": f"cabecera WFDB no reconocida en {hea.name}: {lineas[0][:80]!r}"}
    senales, archivos_dat = [], []
    for ln in lineas[1:1 + n_sig]:
        c = ln.split()
        if not c:
            continue
        if c[0] not in archivos_dat:
            archivos_dat.append(c[0])
        senales.append(c[-1] if len(c) >= 9 else "")
    faltan = [a for a in archivos_dat if not (hea.parent / a).is_file()]
    if faltan:
        return {"formato": "wfdb", "error": (f"registro WFDB incompleto: {hea.name} referencia {', '.join(faltan)} "
                                             f"y no está(n) junto a la cabecera")}
    out.update({"n_senales": n_sig, "fs": fs, "n_muestras": n_muestras, "senales": senales,
                "archivos_senal": archivos_dat,
                "anotaciones": sorted(x.name for x in hea.parent.glob(hea.stem + ".*")
                                      if x.suffix.lower() in {".atr", ".qrs"}),
                "modality": MODALIDAD_ECG, "fija_modalidad": True})
    return out


def detectar(path: str | Path) -> dict:
    """Inspecciona el archivo (o carpeta de estudio) y devuelve lo que se pudo saber."""
    p = Path(path)
    if p.is_dir():
        heas = sorted(x for x in p.iterdir() if x.is_file() and x.suffix.lower() == ".hea")
        if len(heas) == 1:  # carpeta = UN registro WFDB (.hea + .dat [+ .atr/.qrs])
            info = _info_wfdb(heas[0])
            ajenos = sorted(x.name for x in p.rglob("*") if x.is_file()
                            and not (x.parent == p and x.stem == heas[0].stem and x.suffix.lower() in EXT_WFDB)
                            and x.name not in (info.get("archivos_senal") or []))
            if ajenos:
                info["aviso"] = ("archivos que no pertenecen al registro WFDB (no se analizan, se conservan): "
                                 + ", ".join(ajenos[:10]))
            return info
        if len(heas) > 1:
            return {"formato": "wfdb", "error": ("hay varios registros WFDB en la entrada ("
                                                 + ", ".join(h.name for h in heas[:5]) + "); envía uno por ejecución")}
        archivos = sorted(x for x in p.rglob("*") if x.is_file())
        return {"formato": "carpeta_estudio", "n_archivos": len(archivos),
                "archivos": [detectar(a) | {"nombre": a.name} for a in archivos[:200]]}
    if not p.exists():
        return {"formato": "inexistente", "error": f"no existe: {p.name}"}
    ext = _ext(p)
    if ext == ".nii.gz" or ext in EXT_VOLUMEN:
        return {"formato": "volumen", "modality": "volumen_3d", "fija_modalidad": True}
    if _es_dicom(p) or ext in {".dcm", ".dicom"}:
        return _info_dicom(p)
    if ext in EXT_VIDEO:
        return _info_video(p)
    if ext in EXT_IMAGEN:
        return {"formato": "imagen", "modality": "imagen_2d", "fija_modalidad": True}
    if ext in EXT_ARRAY:
        return {"formato": "array_numpy", "aviso": "array sin metadatos: se usa la modalidad declarada"}
    if ext == ".hea":
        return _info_wfdb(p)
    if ext in EXT_WFDB:
        hea = p.with_suffix(".hea")
        if hea.is_file():
            return _info_wfdb(hea)
        return {"formato": "wfdb", "error": (f"registro WFDB incompleto: falta {hea.name} junto a {p.name} "
                                             f"(se necesitan .hea y .dat del mismo registro)")}
    if ext in EXT_SENAL_TABULAR:
        return {"formato": "csv_senal"}  # tabla sin metadatos: solo válida si se declara ecg_1d (ver validar)
    return {"formato": "desconocido", "error": f"extensión no reconocida: {ext or '(sin extensión)'}"}


def validar(path: str | Path, declarada: str, aceptadas: list[str] | tuple[str, ...], modelo: str,
            permitir_color: bool = False) -> dict:
    """Devuelve {'ok', 'modality', 'motivo', 'meta', 'warnings'}.

    ok=False => el adaptador/app debe responder "análisis no implementado" sin predecir.
    """
    declarada = declarada or "desconocida"
    if declarada not in MODALIDADES:
        return {"ok": False, "modality": None, "meta": {}, "warnings": [],
                "motivo": f"modalidad declarada inválida {declarada!r}; usa una de {MODALIDADES}"}
    meta = detectar(path)
    warnings: list[str] = []
    if meta.get("error"):
        return {"ok": False, "modality": None, "meta": meta, "warnings": warnings,
                "motivo": f"archivo no legible para {modelo}: {meta['error']}"}
    if meta.get("aviso"):
        warnings.append(meta["aviso"])

    if meta.get("formato") == "carpeta_estudio":
        # Estudio (varios archivos): se valida CADA archivo por separado. Los incompatibles no se convierten:
        # se conservan, se listan en warnings y el adaptador no los analiza. Si ninguno es compatible, se rechaza.
        archivos = sorted(x for x in Path(path).rglob("*") if x.is_file())
        if not archivos:
            return {"ok": False, "modality": None, "meta": meta, "warnings": warnings,
                    "motivo": f"La carpeta del estudio está vacía; nada que analizar con {modelo}."}
        res = [(a, validar(a, declarada, aceptadas, modelo, permitir_color)) for a in archivos]
        detalle = [{"archivo": a.name, "ok": r["ok"], "modality": r["modality"], "motivo": r["motivo"]}
                   for a, r in res]
        meta = {"formato": "carpeta_estudio", "n_archivos": len(archivos), "archivos": detalle}
        oks = [(a, r) for a, r in res if r["ok"]]
        malos = [(a, r) for a, r in res if not r["ok"]]
        for a, r in oks:
            warnings.extend(f"{a.name}: {w}" for w in r["warnings"])
        if not oks:
            return {"ok": False, "modality": "estudio_sin_archivos_compatibles", "meta": meta, "warnings": warnings,
                    "motivo": (f"Ningún archivo del estudio es compatible con {modelo}: "
                               + "; ".join(f"{a.name}: {r['motivo']}" for a, r in malos[:5]))}
        for a, r in malos:
            warnings.append(f"{a.name}: NO se analizará con {modelo} ({r['motivo']}); el archivo se conserva.")
        mods = sorted({str(r["modality"]) for _, r in oks})
        return {"ok": True, "modality": mods[0] if len(mods) == 1 else "estudio_mixto:" + "+".join(mods),
                "meta": meta, "warnings": warnings, "motivo": "",
                "archivos_compatibles": [a.name for a, _ in oks],
                "archivos_no_compatibles": [a.name for a, _ in malos]}
    else:
        detectada = meta.get("modality")
        fija = bool(meta.get("fija_modalidad"))

    if fija and detectada and declarada != "desconocida" and detectada != declarada:
        return {"ok": False, "modality": detectada, "meta": meta, "warnings": warnings,
                "motivo": (f"El archivo es '{detectada}' según sus metadatos, pero se declaró "
                           f"'{declarada}'. No se convierte en silencio. Corrige la modalidad.")}
    final = detectada if (fija and detectada) else (declarada if declarada != "desconocida" else detectada)
    formato = meta.get("formato")
    if formato == "csv_senal" and final != MODALIDAD_ECG:
        return {"ok": False, "modality": MODALIDAD_ECG if final in (None, "desconocida") else final, "meta": meta,
                "warnings": warnings,
                "motivo": (f"Análisis no implementado: el archivo es una tabla de señal 1D (CSV/TXT/TSV) y se declaró "
                           f"'{declarada}'. Una tabla solo se admite como '{MODALIDAD_ECG}' (módulo ECG, con "
                           f"options.fs); no se convierte a imagen/video.")}
    if final == MODALIDAD_ECG and formato not in FORMATOS_SENAL_1D:
        return {"ok": False, "modality": detectada or "desconocida", "meta": meta, "warnings": warnings,
                "motivo": (f"Análisis no implementado: se declaró '{MODALIDAD_ECG}' pero el archivo es de formato "
                           f"'{formato}'. '{MODALIDAD_ECG}' solo admite un registro WFDB (.hea + .dat, opcional "
                           f".atr) o una tabla CSV de señal; no se extrae un ECG de imágenes o videos.")}
    if final is None or final == "desconocida":
        return {"ok": False, "modality": "desconocida", "meta": meta, "warnings": warnings,
                "motivo": (f"No se pudo determinar la modalidad y no se declaró. Declara si es "
                           f"imagen_2d, video_2d, volumen_3d, doppler_color, doppler_espectral o ecg_1d.")}
    if final not in aceptadas:
        return {"ok": False, "modality": final, "meta": meta, "warnings": warnings,
                "motivo": (f"Análisis no implementado: {modelo} no admite '{final}' "
                           f"(admite: {', '.join(aceptadas)}). El archivo se conserva para pruebas futuras.")}
    fc = meta.get("fraccion_color_max")
    if final == "video_2d" and fc is not None and fc > UMBRAL_COLOR:
        msg = (f"El video tiene {fc:.1%} de píxeles muy saturados (umbral {UMBRAL_COLOR:.0%}): "
               f"posible Doppler color o superposiciones de color.")
        if not permitir_color:
            return {"ok": False, "modality": "doppler_color?", "meta": meta, "warnings": warnings,
                    "motivo": msg + " Análisis no implementado para Doppler color. Si es modo B con "
                                    "anotaciones de color, marca 'permitir_color' (quedará registrado)."}
        warnings.append(msg + " El usuario lo anuló explícitamente (permitir_color=true).")
    return {"ok": True, "modality": final, "meta": meta, "warnings": warnings, "motivo": ""}
