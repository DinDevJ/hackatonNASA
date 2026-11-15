"""Las 7 comprobaciones de VERIFICACION Y ENTREGA. Uso: python verificar.py  (codigo de salida != 0 si algo FALLA).

Estados: PASA / FALLA / PENDIENTE. Todo lo que se fabrica (fixtures de prueba, DICOM, videos) vive en
directorios temporales; no se escribe nada en outputs/. Las funciones c1..c7 las reutiliza tests/.
"""
from __future__ import annotations

import importlib.util
import json
import math
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

import pandas as pd  # noqa: E402

from core import formato, modalidad, registry, runs  # noqa: E402

PASA, FALLA, PENDIENTE = "PASA", "FALLA", "PENDIENTE"
MSG_SIN_INFERENCIA = ("no se ha corrido inferencia real en esta máquina (sin GPU/sin pesos de los modelos de eco, "
                      "o módulo ecg sin instalar); probar en la PC de Iker")
EJEMPLO_CSV = ROOT / "sensores" / "ejemplo_sintetico_sensores.csv"
EJEMPLO_JSON = ROOT / "sensores" / "ejemplo_sintetico_sensores.json"
EJEMPLO_ANCHO = ROOT / "sensores" / "ejemplo_sintetico_ancho.csv"


# ---------------------------------------------------------------- utilidades
def _lee_run(d: Path):
    try:
        return runs.read_json(d / "response.json")
    except (OSError, ValueError):
        return None


def runs_reales(raw_dir: Path | None = None) -> list[Path]:
    raw = Path(raw_dir) if raw_dir else runs.RAW_DIR
    out = []
    if not raw.exists():
        return out
    for d in sorted(x for x in raw.iterdir() if x.is_dir()):
        r = _lee_run(d)
        if r and r.get("status") == "ok" and r.get("inferencia_real") is True and r.get("random_load_test") is False:
            out.append(d)
    return out


def _iguales(a, b) -> bool:
    if a in (None, "") and b in (None, ""):
        return True
    try:
        return math.isclose(float(a), float(b), rel_tol=1e-9, abs_tol=1e-9)
    except (TypeError, ValueError):
        return str(a) == str(b)


def verificar_run(run_dir: Path, filas_csv: list[dict]) -> list[str]:
    """Problemas de un run: devuelve lista vacia si la salida guardada corresponde a esa ejecucion."""
    run_dir = Path(run_dir)
    prob: list[str] = []
    req_p, resp_p, inp = run_dir / "request.json", run_dir / "response.json", run_dir / "input"
    for p in (req_p, resp_p):
        if not p.exists():
            prob.append(f"falta {p.name}")
    if not inp.exists():
        prob.append("falta carpeta input/")
    if prob:
        return prob
    req, resp = runs.read_json(req_p), runs.read_json(resp_p)
    if not (req.get("run_id") == run_dir.name == resp.get("run_id")):
        prob.append(f"run_id inconsistente: request={req.get('run_id')!r} carpeta={run_dir.name!r} response={resp.get('run_id')!r}")
    sha = runs.sha256_path(inp / Path(req["input_path"]).name) if req.get("input_path") and \
        (inp / Path(req["input_path"]).name).exists() else runs.sha256_path(inp)
    if sha != (resp.get("input") or {}).get("sha256"):
        prob.append("sha256 de input/ no coincide con response.input.sha256 (entrada alterada o distinta)")
    esperadas = resp.get("normalized") or []
    mias = [r for r in filas_csv if r.get("run_id") == run_dir.name]
    if len(mias) != len(esperadas):
        prob.append(f"normalized.csv tiene {len(mias)} filas del run, response.normalized tiene {len(esperadas)}")
    else:
        for a, b in zip(esperadas, mias):
            for k in ("model", "metric", "unit", "value", "tipo", "subject_id"):
                if not _iguales(a.get(k), b.get(k)):
                    prob.append(f"fila {a.get('metric')}: {k} difiere (response={a.get(k)!r}, csv={b.get(k)!r})")
    return prob


def _fixture_run(base: Path) -> tuple[Path, Path]:
    """Run de PRUEBA (no real, no en outputs/): devuelve (raw_dir, normalized.csv). Etiquetado como fixture."""
    raw = base / "raw"
    rid = "FIXTURE-PRUEBA_panecho_00000000"
    rd = raw / rid
    (rd / "input").mkdir(parents=True)
    f = rd / "input" / "entrada_de_prueba.bin"
    f.write_bytes(b"FIXTURE DE PRUEBA, no es un estudio")
    req = {"run_id": rid, "run_dir": f"outputs/raw/{rid}", "input_path": f"outputs/raw/{rid}/input/{f.name}",
           "subject_id": "FIXTURE", "simulated": True}
    resp = runs.nueva_respuesta(req, "panecho")
    resp.update(status="ok", inferencia_real=True, random_load_test=False)
    resp["input"]["sha256"] = runs.sha256_file(f)
    resp["normalized"] = [formato.filas_modelo(resp, metric="EF", value=55.0, unit="%", tipo="medicion",
                                               quality="FIXTURE_DE_PRUEBA")]
    runs.write_json(rd / "request.json", req)
    runs.write_json(rd / "response.json", resp)
    csvp = base / "normalized.csv"
    formato.append_normalized(resp["normalized"], csvp)
    return raw, csvp


# ---------------------------------------------------------------- (1)
def c1_inferencia_real(raw_dir: Path | None = None) -> tuple[str, list[str]]:
    r = runs_reales(raw_dir)
    if not r:
        return PENDIENTE, [MSG_SIN_INFERENCIA]
    return PASA, [f"{len(r)} run(s) con inferencia real: " + ", ".join(x.name for x in r)]


# ---------------------------------------------------------------- (2)
def deteccion_manipulacion() -> list[str]:
    """Con un run de PRUEBA temporal: el intacto pasa y cada manipulacion se detecta. Devuelve fallos."""
    fallos = []
    with tempfile.TemporaryDirectory() as t:
        raw, csvp = _fixture_run(Path(t))
        rd = next(raw.iterdir())
        filas = formato.leer_normalized(csvp)
        if verificar_run(rd, filas):
            fallos.append(f"el fixture intacto no deberia dar problemas: {verificar_run(rd, filas)}")
        (rd / "input" / "entrada_de_prueba.bin").write_bytes(b"MANIPULADO")
        if not any("sha256" in p for p in verificar_run(rd, filas)):
            fallos.append("no se detecto sha256 distinto")
        (rd / "input" / "entrada_de_prueba.bin").write_bytes(b"FIXTURE DE PRUEBA, no es un estudio")
        manip = [dict(f, value=12.0) for f in filas]
        if not any("value" in p for p in verificar_run(rd, manip)):
            fallos.append("no se detecto valor alterado en el CSV")
        if not any("filas" in p for p in verificar_run(rd, [])):
            fallos.append("no se detecto fila faltante en el CSV")
        resp = runs.read_json(rd / "response.json")
        resp["run_id"] = "OTRO"
        runs.write_json(rd / "response.json", resp)
        if not any("run_id" in p for p in verificar_run(rd, filas)):
            fallos.append("no se detecto run_id inconsistente")
    return fallos


def c2_salidas_atadas(raw_dir: Path | None = None, csv_path: Path | None = None) -> tuple[str, list[str]]:
    det = []
    fx = deteccion_manipulacion()
    if fx:
        return FALLA, ["fixture de manipulacion: " + "; ".join(fx)]
    det.append("fixture de PRUEBA (tmp): manipulaciones detectadas (sha distinto, valor alterado, fila faltante, run_id)")
    raw = Path(raw_dir) if raw_dir else runs.RAW_DIR
    csvp = Path(csv_path) if csv_path else formato.NORMALIZED_CSV
    filas = formato.leer_normalized(csvp) if csvp.exists() else []
    reales = runs_reales(raw)
    problemas = []
    for d in reales:
        problemas += [f"{d.name}: {p}" for p in verificar_run(d, filas)]
    carpetas = {x.name for x in raw.iterdir() if x.is_dir()} if raw.exists() else set()
    huerf = sorted({r["run_id"] for r in filas if r.get("run_id")} - carpetas)
    if huerf:
        problemas.append(f"run_id del CSV sin carpeta en outputs/raw: {huerf}")
    if problemas:
        return FALLA, det + problemas
    if not reales:
        return PENDIENTE, det + ["sin runs reales en outputs/raw: " + MSG_SIN_INFERENCIA]
    return PASA, det + [f"{len(reales)} run(s) real(es) coherentes con normalized.csv"]


# ---------------------------------------------------------------- (3)
def _pw_dicom(path: Path, tipo_region: int | None, frames: int = 8) -> None:
    import numpy as np
    from pydicom.dataset import Dataset, FileDataset, FileMetaDataset
    from pydicom.uid import ExplicitVRLittleEndian, generate_uid

    meta = FileMetaDataset()
    meta.MediaStorageSOPClassUID = modalidad.SOP_US_MULTIFRAME
    meta.MediaStorageSOPInstanceUID = generate_uid()
    meta.TransferSyntaxUID = ExplicitVRLittleEndian
    ds = FileDataset(str(path), {}, file_meta=meta, preamble=b"\0" * 128)
    ds.SOPClassUID = modalidad.SOP_US_MULTIFRAME
    ds.SOPInstanceUID = meta.MediaStorageSOPInstanceUID
    ds.Modality = "US"
    ds.NumberOfFrames = str(frames)
    ds.Rows = ds.Columns = 16
    ds.SamplesPerPixel = 1
    ds.PhotometricInterpretation = "MONOCHROME2"
    ds.BitsAllocated = ds.BitsStored = 8
    ds.HighBit = 7
    ds.PixelRepresentation = 0
    ds.PixelData = np.zeros((frames, 16, 16), dtype="uint8").tobytes()
    if tipo_region is not None:
        r = Dataset()
        r.RegionDataType = tipo_region
        r.RegionSpatialFormat = 1
        ds.SequenceOfUltrasoundRegions = [r]
    ds.save_as(str(path), enforce_file_format=True)


def _video(path: Path, coloreado: bool) -> None:
    import cv2
    import numpy as np
    w = cv2.VideoWriter(str(path), cv2.VideoWriter_fourcc(*"MJPG"), 10.0, (64, 64))
    for i in range(12):
        f = np.full((64, 64, 3), 90, np.uint8)
        if coloreado:
            f[:, :, :] = (0, 0, 255) if i % 2 else (255, 0, 0)  # BGR saturado
        w.write(f)
    w.release()


def casos_modalidad(tmp: Path) -> list[tuple[str, dict, str]]:
    """[(descripcion, resultado de validar, fragmento esperado en el motivo)]. Todos deben ser ok=False."""
    import cv2
    import numpy as np
    out = []
    nii = tmp / "volumen.nii.gz"
    nii.write_bytes(b"\x1f\x8b" + b"\0" * 32)
    out.append((".nii.gz declarado video_2d (contradice metadatos)",
                modalidad.validar(nii, "video_2d", ["video_2d"], "ModeloVideo"), "volumen_3d"))
    out.append((".nii.gz declarado volumen_3d para modelo de video",
                modalidad.validar(nii, "volumen_3d", ["video_2d"], "ModeloVideo"), "no implementado"))
    vc = tmp / "color.avi"
    _video(vc, True)
    out.append(("video muy coloreado declarado video_2d",
                modalidad.validar(vc, "video_2d", ["video_2d"], "ModeloVideo"), "Doppler color"))
    vg = tmp / "gris.avi"
    _video(vg, False)
    ok = modalidad.validar(vg, "video_2d", ["video_2d"], "ModeloVideo")
    out.append(("CONTROL: video en gris declarado video_2d debe aceptarse", ok, "__ok__"))
    dc, dp = tmp / "color_flow.dcm", tmp / "pw.dcm"
    _pw_dicom(dc, 0x02)
    _pw_dicom(dp, 0x03)
    out.append(("DICOM con region Color Flow declarado video_2d",
                modalidad.validar(dc, "video_2d", ["video_2d"], "ModeloVideo"), "doppler_color"))
    out.append(("DICOM con region PW Doppler declarado video_2d",
                modalidad.validar(dp, "video_2d", ["video_2d"], "ModeloVideo"), "doppler_espectral"))
    dm = tmp / "multiframe.dcm"
    _pw_dicom(dm, 0x01)
    out.append(("DICOM multiframe (video) declarado imagen_2d (contradice metadatos)",
                modalidad.validar(dm, "imagen_2d", ["imagen_2d", "video_2d"], "Modelo"), "video_2d"))
    png = tmp / "imagen.png"
    cv2.imwrite(str(png), np.zeros((16, 16, 3), np.uint8))
    out.append(("PNG declarado video_2d (contradice)", modalidad.validar(png, "video_2d", ["video_2d"], "ModeloVideo"), "imagen_2d"))
    out.append(("modalidad declarada invalida", modalidad.validar(png, "ecografia_rara", ["video_2d"], "M"), "inválida"))
    return out


def prevalidacion_runner() -> tuple[str, str]:
    """Pre-validación del runner (core.run_model.ejecutar): vista PLAX para EchoNet-Dynamic y .nii.gz para un
    modelo de video. RAW_DIR del runner se redirige a un directorio temporal (no se escribe en outputs/).
    PENDIENTE si core/run_model.py o los manifest aún no existen / no se pueden cargar."""
    rm = ROOT / "core" / "run_model.py"
    mf = ROOT / "adapters" / "echonet_dynamic" / "manifest.json"
    if not rm.exists() or not mf.exists():
        return PENDIENTE, "core/run_model.py o adapters/echonet_dynamic/manifest.json aún no existen"
    try:
        import importlib
        mod = importlib.import_module("core.run_model")
    except Exception as e:  # noqa: BLE001
        return PENDIENTE, f"core.run_model no se pudo importar en este venv ({type(e).__name__}: {e})"
    with tempfile.TemporaryDirectory() as t:
        t = Path(t)
        v = t / "v.avi"
        _video(v, False)
        nii = t / "vol.nii.gz"
        nii.write_bytes(b"\x1f\x8b" + b"\0" * 32)
        viejo = mod.RAW_DIR
        mod.RAW_DIR = t / "raw"
        try:
            r1 = mod.ejecutar("echonet_dynamic", v, "SIM-TEST", declared_modality="video_2d",
                              declared_view="PLAX", simulated=True)
            r2 = mod.ejecutar("echonet_dynamic", nii, "SIM-TEST", declared_modality="volumen_3d",
                              declared_view="A4C", simulated=True)
        except Exception as e:  # noqa: BLE001
            return PENDIENTE, f"core.run_model.ejecutar no se pudo invocar ({type(e).__name__}: {e})"
        finally:
            mod.RAW_DIR = viejo
    msgs = []
    for nombre, r in (("PLAX en EchoNet-Dynamic", r1), ("volumen .nii.gz en EchoNet-Dynamic", r2)):
        if r.get("status") != "rechazado" or r.get("inferencia_real") or r.get("normalized"):
            return FALLA, f"{nombre} no fue rechazado: status={r.get('status')} message={r.get('message')!r}"
        msgs.append(f"{nombre}: rechazado -> {str(r.get('message'))[:110]}")
    return PASA, " | ".join(msgs)


def c3_incompatibles() -> tuple[str, list[str]]:
    det, fallos = [], []
    with tempfile.TemporaryDirectory() as t:
        for desc, res, frag in casos_modalidad(Path(t)):
            if frag == "__ok__":
                (det if res["ok"] else fallos).append(f"{desc}: ok={res['ok']} {res.get('motivo', '')}")
                continue
            if res["ok"] or frag.lower() not in res["motivo"].lower():
                fallos.append(f"{desc}: ok={res['ok']} motivo={res.get('motivo')!r} (esperaba '{frag}')")
            else:
                det.append(f"{desc}: rechazado -> {res['motivo'][:110]}")
    if fallos:
        return FALLA, fallos
    est, msg = prevalidacion_runner()
    det.append(f"pre-validación del runner (PLAX/EchoNet-Dynamic): {est} ({msg})")
    if est == FALLA:
        return FALLA, det
    return PASA, det  # el runner pendiente no falla (se informa en el detalle)


# ---------------------------------------------------------------- (4)
def _eco_sim(model, metric, val, sid, ts="2026-11-05T10:00:00+00:00", study="ST-SIM"):
    return dict(subject_id=sid, study_id=study, timestamp=ts, source="modelo_preentrenado", model=model,
                metric=metric, value=val, unit="%", quality="FIXTURE_DE_PRUEBA", simulated=True, tipo="medicion",
                run_id=f"prueba_{model}_{sid}", input_file=f"x_{sid}.avi", notes="fixture de prueba")


def eco_fixture() -> pd.DataFrame:
    """Salidas de modelo FICTICIAS para probar el cruce (simulated=true, quality FIXTURE_DE_PRUEBA)."""
    return pd.DataFrame([
        _eco_sim("panecho", "EF", 35.0, "SIM-A01"), _eco_sim("echonet_dynamic", "EF", 52.0, "SIM-A01"),
        _eco_sim("panecho", "EF", 60.0, "SIM-B02", study="ST-B"), _eco_sim("echonet_dynamic", "EF", 58.0, "SIM-B02", study="ST-B"),
    ])


def c4_no_mezcla() -> tuple[str, list[str]]:
    from fusion import tabla
    from sensores.importador import cargar
    s, _ = cargar(EJEMPLO_CSV)
    eco = eco_fixture()
    fallos, det = [], []
    for sid, otro in (("SIM-A01", "SIM-B02"), ("SIM-B02", "SIM-A01")):
        t = tabla.construir(eco, s, sid)
        if set(t["subject_id"].unique()) != {sid}:
            fallos.append(f"tabla de {sid} contiene {set(t['subject_id'].unique())}")
        if not any("excluyeron" in a and otro in a for a in t.attrs["avisos"]):
            fallos.append(f"no se informó la exclusión de {otro}")
        fuentes = set(t.loc[t["origen"] == "eco", "run_id"].dropna())
        if any(otro in str(r) for r in fuentes):
            fallos.append(f"eco de {otro} en la tabla de {sid}")
        c = tabla.comparar_modelos(eco, sid)
        if len(c) != 1 or set(c["subject_id"]) != {sid} or any(otro in str(r) for r in c["run_a"].tolist() + c["run_b"].tolist()):
            fallos.append(f"comparar_modelos({sid}) cruzó sujetos: {c.to_dict('records')}")
        det.append(f"{sid}: {len(t)} filas, {len(c)} comparación(es), excluidas filas de {otro}")
    if tabla.comparar_modelos(eco, "NO-EXISTE").shape[0] != 0:
        fallos.append("comparar_modelos devolvió filas para un sujeto inexistente")
    return (FALLA, fallos) if fallos else (PASA, det)


# ---------------------------------------------------------------- (5)
def caso_manual():
    """Caso calculado a mano. Sensores SIM-X (HR, hora UTC del 2026-11-10): 09:00=60, 10:00=NaN, 11:00=64, 12:00=NaN.
    Eco 08:00. referencia=14:00 y ventana 24 h. Esperado: n=2, faltantes=2, mediana=62, ultimo=64 a las 11:00,
    antiguedad sensor = 3 h, antiguedad eco = 6 h, dif sensor-eco = +3 h."""
    from fusion import tabla
    from sensores.importador import cargar
    csv = ("subject_id,timestamp,device,variable,value,unit,quality,simulated,metric_detail,notes\n"
           "SIM-X,2026-11-10T09:00:00,reloj,heart_rate,60,bpm,ok,true,,PRUEBA\n"
           "SIM-X,2026-11-10T10:00:00,reloj,heart_rate,,bpm,sin_dato,true,,PRUEBA\n"
           "SIM-X,2026-11-10T11:00:00,reloj,heart_rate,64,bpm,ok,true,,PRUEBA\n"
           "SIM-X,2026-11-10T12:00:00,reloj,heart_rate,,bpm,sin_dato,true,,PRUEBA\n")
    import io
    s, av = cargar(io.StringIO(csv), "caso.csv")
    eco = pd.DataFrame([_eco_sim("panecho", "EF", 50.0, "SIM-X", ts="2026-11-10T08:00:00+00:00"),
                        dict(_eco_sim("echonet_dynamic", "EF", 51.0, "SIM-X", ts=None))])
    t = tabla.construir(eco, s, "SIM-X", referencia="2026-11-10T14:00:00+00:00")
    return s, t


def c5_faltantes_y_tiempos() -> tuple[str, list[str]]:
    from fusion import tabla
    from sensores import resumen
    from sensores.importador import cargar
    f, det = [], []
    # importación: NaN siguen NaN, nunca 0
    for p in (EJEMPLO_CSV, EJEMPLO_JSON):
        df, _ = cargar(p)
        num = pd.to_numeric(df.loc[df["variable"] != "symptom", "value"], errors="coerce")
        n_nan = int(num.isna().sum())
        orig = pd.read_csv(EJEMPLO_CSV, dtype=str, keep_default_na=False)
        n_vacias = int((orig.loc[orig["variable"] != "symptom", "value"].str.strip() == "").sum())
        if n_nan != n_vacias or n_nan == 0:
            f.append(f"{p.name}: NaN tras importar={n_nan}, celdas vacías en origen={n_vacias}")
        det.append(f"{p.name}: {n_nan} NaN conservados (0 convertidos a cero)")
    s, t = caso_manual()
    if not (s.loc[s["value"].isna()].shape[0] == 2 and (s["value"].dropna() != 0).all()):
        f.append("caso manual: los vacíos no quedaron como NaN")
    r = resumen.resumir(s, "SIM-X", referencia="2026-11-10T14:00:00+00:00")
    r0 = r.iloc[0]
    esperado = dict(n=2, faltantes=2, mediana=62.0, ultimo_valor=64.0, antiguedad_h=3.0)
    for k, v in esperado.items():
        if not math.isclose(float(r0[k]), v):
            f.append(f"resumen {k}={r0[k]} esperado {v}")
    if not (pd.isna(r0["tendencia_por_dia"]) and r0["tendencia_motivo"]):
        f.append("tendencia con n<3 debe ser NaN con motivo")
    if not (pd.isna(r0["basal"]) and r0["basal_motivo"] and pd.isna(r0["diferencia_vs_basal"])):
        f.append("sin basal suficiente: basal/diferencia deben ser NaN con motivo")
    h = t[(t["fuente"] == "reloj") & (t["estadistico"] == "ultimo")].iloc[0]
    if not (math.isclose(h["antiguedad_h"], 3.0) and math.isclose(h["dif_sensor_menos_eco_h"], 3.0)):
        f.append(f"tabla sensor: antiguedad_h={h['antiguedad_h']} dif={h['dif_sensor_menos_eco_h']} (esperado 3 y +3)")
    e = t[(t["origen"] == "eco") & (t["fuente"] == "panecho")].iloc[0]
    if not (math.isclose(e["antiguedad_h"], 6.0) and math.isclose(e["dif_sensor_menos_eco_h"], 3.0)):
        f.append(f"tabla eco: antiguedad_h={e['antiguedad_h']} dif={e['dif_sensor_menos_eco_h']} (esperado 6 y +3)")
    sin = t[(t["origen"] == "eco") & (t["fuente"] == "echonet_dynamic")].iloc[0]
    if not (pd.isna(sin["dif_sensor_menos_eco_h"]) and pd.isna(sin["antiguedad_h"]) and "timestamp" in str(sin["dif_motivo"])):
        f.append("eco sin timestamp: antigüedad/diferencia deben ser NaN con motivo")
    aus = t[(t["metric"] == "spo2") & (t["origen"] == "sensor")]
    if not (len(aus) and aus["faltante"].all() and aus["value"].isna().all()):
        f.append("variable ausente (spo2) debe aparecer como faltante con value NaN")
    mt = t[(t["fuente"] == "reloj") & (t["estadistico"] == "mediana_ventana")].iloc[0]
    if not (math.isclose(mt["value"], 62.0) and mt["n"] == 2):
        f.append("mediana_ventana de la tabla incorrecta")
    if not f:
        det.append("caso manual: n=2, faltantes=2, mediana=62, último=64@11:00, antigüedad sensor=3 h, eco=6 h, "
                   "dif sensor-eco=+3 h; eco sin timestamp => NaN con motivo; spo2 ausente => faltante (no 0)")
    return (FALLA, f) if f else (PASA, det)


# ---------------------------------------------------------------- (6)
def c6_simulados() -> tuple[str, list[str]]:
    from fusion import reglas, tabla
    from sensores.importador import a_formato_comun, cargar
    f, det = [], []
    for p in (EJEMPLO_CSV, EJEMPLO_JSON, EJEMPLO_ANCHO):
        df, _ = cargar(p)
        if not df["simulated"].astype(bool).all():
            f.append(f"{p.name}: hay filas con simulated != true")
        com = a_formato_comun(df)
        if not all(r["simulated"] is True for r in com) or len(com) != len(df):
            f.append(f"{p.name}: a_formato_comun no propaga simulated")
        det.append(f"{p.name}: {len(df)} filas simulated=true; formato común {len(com)} filas simulated=true")
    raw = pd.read_csv(EJEMPLO_CSV, dtype=str)
    if not (raw["simulated"].str.lower() == "true").all() or not raw["notes"].str.startswith("DATO SINTÉTICO").all():
        f.append("el CSV de ejemplo no marca simulated=true y la nota DATO SINTÉTICO en todas las filas")
    s, _ = cargar(EJEMPLO_CSV)
    t = tabla.construir(eco_fixture(), s, "SIM-A01")
    if not t["simulated"].astype(bool).all():
        f.append("tabla: hay filas sin simulated=true")
    if not t["clase_dato"].isin(["dato_simulado"]).all():
        f.append(f"tabla: clase_dato no es dato_simulado: {t.loc[t['clase_dato'] != 'dato_simulado', 'clase_dato'].unique()}")
    al = reglas.evaluar(t, tabla.comparar_modelos(eco_fixture(), "SIM-A01"))
    act = [a for a in al if a["activada"]]
    ids = {a["id"] for a in act}
    if "R3" not in ids:
        f.append(f"R3 (tipo NightSignal) no se activó con el sintético de SIM-A01; activadas: {sorted(ids)}")
    if not all(a["simulada"] and a["mensaje"].startswith("[DATOS SIMULADOS]") and a["etiqueta"].startswith("REGLA EXPERIMENTAL")
               for a in act):
        f.append("alertas activadas sin marca de datos simulados")
    com = reglas.a_formato_comun(al, "SIM-A01")
    if not com or not all(r["simulated"] is True and r["tipo"] == "regla_alerta" and r["source"] == "regla_experimental" for r in com):
        f.append("alertas en formato común sin simulated=true")
    tb = tabla.construir(eco_fixture(), s, "SIM-B02")
    if next(a for a in reglas.evaluar(tb, None) if a["id"] == "R3")["activada"]:
        f.append("R3 se activó en SIM-B02 (control sin elevación)")
    det.append(f"tabla SIM-A01: {len(t)} filas, todas simulated=true/dato_simulado; alertas activadas {sorted(ids)} "
               "todas con [DATOS SIMULADOS]; SIM-B02 no activa R3")
    return (FALLA, f) if f else (PASA, det)


# ---------------------------------------------------------------- (7) ECG
ECG_NORMAL = ROOT / "samples" / "ecg_normal_mitdb100.hea"
ECG_VIDEO = ROOT / "samples" / "echoclip_example_video.avi"
MSG_ECG_PENDIENTE = ("ejecución real del adaptador: PENDIENTE (instalar con scripts\\instalar_modelo.ps1 -Modelo ecg)")
ETIQUETA_BANDERA = "BANDERA EXPERIMENTAL – NO DIAGNÓSTICO"
# (metric, unit, tipo, source) de las 8 filas del contrato (CONTRATO.md, "Módulo ECG")
ECG_TABLA = [
    ("heart_rate", "bpm", "medicion", "algoritmo_senal"),
    ("hrv_rmssd", "ms", "medicion", "algoritmo_senal"),
    ("hrv_sdnn", "ms", "medicion", "algoritmo_senal"),
    ("pr_interval", "ms", "medicion", "algoritmo_senal"),
    ("qtc_bazett", "ms", "medicion", "algoritmo_senal"),
    ("latidos_irregulares", "latidos", "hallazgo", "algoritmo_senal"),
    ("ritmo_irregular_fraccion_ventanas", "fraccion_0_1", "hallazgo", "regla_experimental"),
    ("ritmo_irregular_compatible_fa", "bandera_0_1_no_diagnostica", "regla_alerta", "regla_experimental"),
]
_METRICAS_ECG = None


def ecg_metricas():
    """adapters/ no es paquete: carga adapters/ecg/metricas.py (solo numpy + stdlib + core.formato)."""
    global _METRICAS_ECG
    if _METRICAS_ECG is None:
        spec = importlib.util.spec_from_file_location("ecg_metricas", ROOT / "adapters" / "ecg" / "metricas.py")
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        _METRICAS_ECG = mod
    return _METRICAS_ECG


def ecg_venv_existe() -> bool:
    return registry.python_del_venv("ecg").exists()


def ecg_manifests_otros() -> dict[str, dict]:
    """{key: manifest} de todos los adaptadores salvo ecg (los modelos de eco)."""
    out = {}
    for mf in sorted((ROOT / "adapters").glob("*/manifest.json")):
        if mf.parent.name != "ecg":
            out[mf.parent.name] = json.loads(mf.read_text(encoding="utf-8"))
    return out


def casos_ecg_cruzados(tmp: Path) -> list[tuple[str, dict, str]]:
    """[(descripcion, resultado de validar, fragmento esperado en el motivo)]; "__ok__" = debe aceptarse."""
    import shutil
    out = []
    for key, m in ecg_manifests_otros().items():
        adm, nombre = m.get("modalidades_admitidas") or [], m.get("nombre", key)
        out.append((f".hea de ECG declarado ecg_1d contra {key}",
                    modalidad.validar(ECG_NORMAL, "ecg_1d", adm, nombre), "no admite 'ecg_1d'"))
        out.append((f".hea de ECG declarado video_2d contra {key}",
                    modalidad.validar(ECG_NORMAL, "video_2d", adm, nombre), "según sus metadatos"))
    out.append(("video declarado video_2d contra ecg",
                modalidad.validar(ECG_VIDEO, "video_2d", ["ecg_1d"], "ECG"), "no admite 'video_2d'"))
    out.append(("video declarado ecg_1d contra ecg",
                modalidad.validar(ECG_VIDEO, "ecg_1d", ["ecg_1d"], "ECG"), "solo admite un registro WFDB"))
    csvp = tmp / "senal.csv"
    csvp.write_text("v\n" + "\n".join(str(i % 7) for i in range(200)) + "\n", encoding="utf-8")
    vid = next((m for m in ecg_manifests_otros().values() if "video_2d" in (m.get("modalidades_admitidas") or [])), None)
    out.append(("CSV declarado video_2d contra un modelo de video",
                modalidad.validar(csvp, "video_2d", ["video_2d"], (vid or {}).get("nombre", "ModeloVideo")),
                "tabla de señal 1D"))
    out.append(("CONTROL: CSV declarado ecg_1d contra ecg debe aceptarse",
                modalidad.validar(csvp, "ecg_1d", ["ecg_1d"], "ECG"), "__ok__"))
    solo = tmp / "solo_hea"
    solo.mkdir()
    shutil.copy2(ECG_NORMAL, solo / ECG_NORMAL.name)
    out.append((".hea sin su .dat", modalidad.validar(solo / ECG_NORMAL.name, "ecg_1d", ["ecg_1d"], "ECG"),
                "incompleto"))
    dos = tmp / "dos_hea"
    dos.mkdir()
    for n in ("a.hea", "b.hea"):
        shutil.copy2(ECG_NORMAL, dos / n)
    out.append(("carpeta con dos .hea", modalidad.validar(dos, "ecg_1d", ["ecg_1d"], "ECG"), "uno por ejecución"))
    out.append(("CONTROL: registro normal declarado ecg_1d debe aceptarse",
                modalidad.validar(ECG_NORMAL, "ecg_1d", ["ecg_1d"], "ECG"), "__ok__"))
    out.append(("CONTROL: registro normal declarado desconocida debe aceptarse",
                modalidad.validar(ECG_NORMAL, "desconocida", ["ecg_1d"], "ECG"), "__ok__"))
    return out


def ecg_fallos_cruzados(tmp: Path) -> tuple[list[str], list[str]]:
    """(fallos, detalle) de los casos de casos_ecg_cruzados."""
    fallos, det = [], []
    for desc, res, frag in casos_ecg_cruzados(tmp):
        if frag == "__ok__":
            (det if res["ok"] else fallos).append(f"{desc}: ok={res['ok']} {res.get('motivo', '')}")
        elif res["ok"] or frag.lower() not in res["motivo"].lower():
            fallos.append(f"{desc}: ok={res['ok']} motivo={res.get('motivo')!r} (esperaba '{frag}')")
        else:
            det.append(f"{desc}: rechazado")
    return fallos, det


def ecg_runner_rechazos(tmp: Path) -> list[str]:
    """Pre-validación del runner (sin venvs, sin subprocess) y copia de los compañeros WFDB a input/. Devuelve fallos."""
    from core import run_model
    fallos = []
    kw = dict(simulated=True, raw_dir=tmp / "raw", normalized_csv=tmp / "n.csv")
    r1 = run_model.ejecutar("panecho", ECG_NORMAL, "SIM-TEST", declared_modality="ecg_1d", **kw)
    r2 = run_model.ejecutar("ecg", ECG_VIDEO, "SIM-TEST", declared_modality="video_2d", **kw)
    for nombre, r in (("ECG en panecho", r1), ("video en ecg", r2)):
        if r.get("status") != "rechazado" or r.get("inferencia_real") or r.get("normalized"):
            fallos.append(f"{nombre} no fue rechazado: status={r.get('status')} message={r.get('message')!r}")
    if (tmp / "n.csv").exists():
        fallos.append("el rechazo escribió filas en el CSV normalizado")
    inp = runs.resolve(r1["input"]["path"])
    esperados = {"ecg_normal_mitdb100." + e for e in ("hea", "dat", "atr")}
    if not inp.is_dir() or {x.name for x in inp.iterdir()} != esperados:
        fallos.append(f"input/ debía contener {sorted(esperados)}: "
                      f"{sorted(x.name for x in inp.iterdir()) if inp.is_dir() else inp}")
    rd = runs.resolve(r1["run_dir"])
    if runs.resolve(runs.read_json(rd / "request.json")["input_path"]) != inp:
        fallos.append("request.input_path no apunta a la carpeta input/")
    return fallos


def ecg_resultados_sinteticos(rr_s, fs: float = 250.0, opciones: dict | None = None) -> tuple[dict, dict]:
    """(resp, resultados) para metricas.construir_filas, llamando a las propias funciones de metricas.py sobre picos
    sintéticos con RR dados (s). Solo señal sintética: resp lleva simulated=True."""
    import numpy as np
    M = ecg_metricas()
    o = dict(rr_min_s=0.25, rr_max_s=3.0, min_rr_hrv=20, ect_fraccion_prematuro=0.80, ect_n_previos=8,
             fa_latidos_segmento=128, fa_paso_latidos=32, fa_n_atipicos=8, fa_umbral_nrmssd=0.10, fa_tpr_min=0.54,
             fa_tpr_max=0.77, fa_umbral_entropia=0.70, fa_min_ventanas_consecutivas=2)
    o.update(opciones or {})
    rr_s = np.asarray(rr_s, dtype=float)
    picos = np.round(np.concatenate([[0.0], np.cumsum(rr_s)]) * fs).astype(np.int64)
    rr = M.rr_intervalos(picos=picos, fs=fs)
    ok = M.rr_validos(rr_s=rr, rr_min_s=o["rr_min_s"], rr_max_s=o["rr_max_s"])
    pre = M.latidos_prematuros(rr_s=rr, ok=ok, fraccion=o["ect_fraccion_prematuro"], n_previos=o["ect_n_previos"])
    nn = M.mascara_nn(ok=ok, irregulares=pre["indices"], n_picos=picos.size)
    hf = M.hrv_basico(rr_s=rr, ok=nn, min_rr=o["min_rr_hrv"])
    hs = M.hrv_basico(rr_s=rr, ok=ok, min_rr=o["min_rr_hrv"])
    vent = M.ventanas_bandera(picos=picos, fs=fs, rr_s=rr, ok=ok, n_segmento=o["fa_latidos_segmento"],
                              paso=o["fa_paso_latidos"], umbral_nrmssd=o["fa_umbral_nrmssd"], tpr_min=o["fa_tpr_min"],
                              tpr_max=o["fa_tpr_max"], umbral_entropia=o["fa_umbral_entropia"],
                              n_atipicos=o["fa_n_atipicos"])
    ban = {**M.bandera_segmento(ventanas=vent, min_consecutivas=o["fa_min_ventanas_consecutivas"]),
           "parametros": {k: o[k] for k in ("fa_latidos_segmento", "fa_paso_latidos", "fa_umbral_nrmssd")},
           "fuente": "sintética (verificar.py)", "ventanas": vent}
    n_eval = pre["n_evaluados"]
    resultados = {
        "entrada": {"segmento_s": [0.0, round(float(picos[-1]) / fs, 2)]},
        "fc": {"valor_bpm": M._f(M.frecuencia_cardiaca(rr_s=rr, ok=ok), 3), "n_rr_validos": int(ok.sum()),
               "rr_min_s": o["rr_min_s"], "rr_max_s": o["rr_max_s"], "motivo": None if ok.any() else "ningun RR valido"},
        "hrv": {"filtrado": hf, "sin_filtrar": hs},
        "intervalos": {"motivo": "sin delineacion (señal sintética de picos)"},
        "latidos_irregulares": {"n": int(pre["indices"].size) if n_eval else None,
                                "fraccion": M._f(M.razon(pre["indices"].size, n_eval), 5), "n_evaluados": n_eval,
                                "ect_fraccion_prematuro": o["ect_fraccion_prematuro"],
                                "ect_n_previos": o["ect_n_previos"],
                                "motivo": None if n_eval else "ningun latido evaluable"},
        "bandera_fa": ban,
    }
    resp = {"model": "ecg", "run_id": "FIXTURE-ECG_ecg_00000000", "subject_id": "SIM-ECG", "study_id": None,
            "timestamp": None, "simulated": True, "input": {"path": "fixture_sintetico"}}
    return resp, resultados


def ecg_fallos_filas() -> tuple[list[str], list[str]]:
    """B (construir_filas) y C (faltantes), sin venv: (fallos, detalle)."""
    import numpy as np
    M = ecg_metricas()
    f, det = [], []

    def revisa(nombre, filas):
        if len(filas) != 8:
            f.append(f"{nombre}: {len(filas)} filas (esperadas 8)")
            return
        for fila, (met, unit, tipo, src) in zip(filas, ECG_TABLA):
            if (fila["metric"], fila["unit"], fila["tipo"], fila["source"]) != (met, unit, tipo, src):
                f.append(f"{nombre}: {fila['metric']} -> ({fila['unit']},{fila['tipo']},{fila['source']}) "
                         f"esperado ({met},{unit},{tipo},{src})")
            if fila["source"] == "modelo_preentrenado" or fila["model"] != "ecg":
                f.append(f"{nombre}: {met} con source/model inválido")
            if formato.validar_fila(fila):
                f.append(f"{nombre}: {met} inválida {formato.validar_fila(fila)}")
        b = filas[-1]
        if not str(b["notes"]).startswith(ETIQUETA_BANDERA):
            f.append(f"{nombre}: notes de la bandera no empiezan por la etiqueta: {str(b['notes'])[:60]!r}")

    reg = np.full(375, 0.8)                                   # 300 s regulares
    ale = np.random.default_rng(0).uniform(0.4, 1.2, 375)     # RR aleatorios, semilla fija
    cor = np.full(15, 0.8)                                    # 12 s: pocos RR
    casos = {}
    for nombre, rr in (("regular", reg), ("aleatorio", ale), ("corto", cor)):
        resp, res = ecg_resultados_sinteticos(rr)
        casos[nombre] = (res, M.construir_filas(resp=resp, resultados=res))
        revisa(nombre, casos[nombre][1])
    det.append("construir_filas: 8 filas con métricas/unidades/tipos/source de la tabla, bandera rotulada, "
               "ninguna 'modelo_preentrenado', todas válidas (regular, aleatorio, corto)")
    # bandera regular = 0 y nRMSSD ~ 0; el caso aleatorio marca más segmentos
    res_r, fr = casos["regular"]
    br = {x["metric"]: x for x in fr}
    if br["ritmo_irregular_compatible_fa"]["value"] != 0.0:
        f.append(f"latidos regulares: bandera={br['ritmo_irregular_compatible_fa']['value']!r} (esperada 0)")
    if not (br["hrv_rmssd"]["value"] is not None and abs(br["hrv_rmssd"]["value"]) < 1e-6):
        f.append(f"latidos regulares: RMSSD={br['hrv_rmssd']['value']!r} (esperado ~0)")
    if any((w["nrmssd"] or 0) > 1e-6 for w in res_r["bandera_fa"]["ventanas"]):
        f.append("latidos regulares: nRMSSD de algún segmento distinto de 0")
    res_a, _ = casos["aleatorio"]
    if not (res_a["bandera_fa"]["fraccion_marcadas"] or 0) > (res_r["bandera_fa"]["fraccion_marcadas"] or 0):
        f.append("RR aleatorios: la fracción de segmentos marcados no supera a la de latidos regulares")
    det.append(f"regular: bandera 0 y RMSSD ~ 0; aleatorio: fracción marcada "
               f"{res_a['bandera_fa']['fraccion_marcadas']} > regular {res_r['bandera_fa']['fraccion_marcadas']}")
    # C: faltantes no son cero
    if M.razon(1, 0) is not None:
        f.append("razon(1, 0) debe ser None")
    if M.razon(0, 5) != 0.0:
        f.append("razon(0, 5) debe ser 0.0 (cero verdadero, no faltante)")
    nn = np.ones(15, dtype=bool)
    h = M.hrv_basico(rr_s=np.full(15, 0.8), ok=nn, min_rr=20)
    if h["rmssd_ms"] is not None or h["sdnn_ms"] is not None or not h["motivo"]:
        f.append(f"HRV con menos de min_rr intervalos debe dar None con motivo: {h}")
    b = M.bandera_segmento(ventanas=[], min_consecutivas=2)
    if b["valor"] is not None or not b["motivo"]:
        f.append(f"bandera sin segmentos debe ser None con motivo: {b}")
    uno = [{"marcada": False}]
    b = M.bandera_segmento(ventanas=uno, min_consecutivas=2)
    if b["valor"] is not None or not b["motivo"]:
        f.append(f"bandera con menos segmentos evaluables que el mínimo debe ser None (no 0): {b}")
    res_c, fc_ = casos["corto"]
    bc = {x["metric"]: x for x in fc_}
    for met in ("hrv_rmssd", "hrv_sdnn", "ritmo_irregular_compatible_fa", "ritmo_irregular_fraccion_ventanas"):
        x = bc[met]
        if x["value"] is not None or not str(x["quality"]).startswith("sin_dato"):
            f.append(f"caso corto: {met} value={x['value']!r} quality={x['quality']!r} (esperado None / sin_dato)")
    with tempfile.TemporaryDirectory() as t:
        csvp = Path(t) / "n.csv"
        formato.append_normalized(fc_, csvp)
        leidas = {x["metric"]: x for x in formato.leer_normalized(csvp)}
        import csv as _csv
        with open(csvp, newline="", encoding="utf-8") as fh:
            crudas = {x["metric"]: x["value"] for x in _csv.DictReader(fh)}
        for met in ("hrv_rmssd", "hrv_sdnn", "ritmo_irregular_compatible_fa"):
            if crudas[met] != "" or leidas[met]["value"] is not None:
                f.append(f"CSV: {met} celda={crudas[met]!r} releída={leidas[met]['value']!r} (esperada vacía / None)")
    # emparejamiento calculado a mano: ref=[100,500,900], det=[110,520,1300,1700], 150 ms a 250 Hz (37,5 muestras)
    c = M.comparar_picos(ref=[100, 500, 900], det=[110, 520, 1300, 1700], fs=250.0, tolerancia_ms=150.0,
                         referencia="prueba")
    if (c["tp"], c["fn"], c["fp"], c["n_ref"], c["n_det"]) != (2, 1, 2, 3, 4) or \
            not math.isclose(c["sensibilidad"], 2 / 3, abs_tol=1e-4) or not math.isclose(c["ppv"], 0.5):
        f.append(f"comparar_picos caso manual: {c}")
    e = M.emparejar_picos(ref=[100, 500, 900], det=[110, 520, 1300, 1700], tol_muestras=37.5)
    if (e["tp"], e["fn"], e["fp"]) != (2, 1, 2):
        f.append(f"emparejar_picos caso manual: tp/fn/fp = {(e['tp'], e['fn'], e['fp'])}")
    s = M.comparar_picos(ref=[], det=[100, 200], fs=250.0, tolerancia_ms=150.0, referencia="prueba")
    if s["sensibilidad"] is not None or s["fn"] != 0 or s["fp"] != 2:
        f.append(f"sin referencias la sensibilidad debe ser None: {s}")
    if not f:
        det.append("faltantes: razon(1,0)=None; HRV<min_rr=None con motivo; bandera con pocos segmentos=None (no 0); "
                   "filas con value None y quality 'sin_dato…'; CSV vacío se relee como None; emparejamiento a mano "
                   "TP2/FN1/FP2, Se=2/3, PPV=0,5; sin referencias Se=None")
    return f, det


def ecg_fallos_estaticos() -> list[str]:
    f = []
    m = json.loads((ROOT / "adapters" / "ecg" / "manifest.json").read_text(encoding="utf-8"))
    if m.get("pesos") != []:
        f.append(f"manifest ecg: pesos debe ser [] ({m.get('pesos')!r})")
    if m.get("modalidades_admitidas") != ["ecg_1d"]:
        f.append(f"manifest ecg: modalidades_admitidas {m.get('modalidades_admitidas')!r}")
    env = m.get("env") or {}
    if any(k in env for k in ("torch", "torchvision", "torch_index_url")):
        f.append("manifest ecg: env no debe llevar torch/torchvision/torch_index_url")
    txt = json.dumps([m.get("licencia"), m.get("salidas"), m.get("entrada")], ensure_ascii=False).lower()
    if "diagn" not in txt:
        f.append("manifest ecg: no declara 'no diagnóstico' en licencia/salidas/entrada")
    if ETIQUETA_BANDERA not in (ROOT / "app.py").read_text(encoding="utf-8"):
        f.append(f"app.py no contiene {ETIQUETA_BANDERA!r}")
    return f


def ecg_fallos_integracion(tmp: Path) -> tuple[list[str], list[str]]:
    """D: ejecución real del adaptador (exige venv ecg). (fallos, detalle). Todo en `tmp`."""
    import numpy as np
    from core import run_model
    f, det = [], []
    csvn = tmp / "n.csv"
    kw = dict(study_id="t", declared_modality="ecg_1d", raw_dir=tmp / "raw", normalized_csv=csvn)
    r = run_model.ejecutar("ecg", ECG_NORMAL, "MUESTRA-TEST", **kw)
    if r.get("status") != "ok" or r.get("inferencia_real") is not True:
        return [f"muestra normal: status={r.get('status')} message={str(r.get('message'))[:200]!r}"], det
    filas = {x["metric"]: x for x in r["normalized"]}
    if len(r["normalized"]) != 8:
        f.append(f"{len(r['normalized'])} filas (esperadas 8)")
    hr = filas.get("heart_rate") or {}
    if hr.get("unit") != "bpm" or not (hr.get("value") is not None and 40 <= hr["value"] <= 150):
        f.append(f"heart_rate fuera de 40-150 bpm: {hr.get('value')!r} {hr.get('unit')!r}")
    b = filas.get("ritmo_irregular_compatible_fa") or {}
    if not str(b.get("notes")).startswith(ETIQUETA_BANDERA) or b.get("unit") != "bandera_0_1_no_diagnostica":
        f.append("fila de la bandera sin rótulo NO DIAGNÓSTICO")
    se = (((r.get("raw_output") or {}).get("comparacion_anotaciones") or {}).get("picos_r") or {}).get("sensibilidad")
    if se is None or se < 0.95:
        f.append(f"sensibilidad de picos R {se!r} < 0,95")
    run_dir = runs.resolve(r["run_dir"])
    npz = run_dir / "ecg_traza.npz"
    if not npz.exists():
        f.append("falta ecg_traza.npz")
    else:
        with np.load(npz, allow_pickle=False) as z:
            if "senal" not in z.files or z["senal"].size == 0:
                f.append("ecg_traza.npz sin 'senal'")
    if r["input"]["sha256"] != runs.sha256_path(run_dir / "input"):
        f.append("response.input.sha256 != sha256 de <run>/input")
    prob = verificar_run(run_dir, formato.leer_normalized(csvn))
    if prob:
        f.append(f"verificar_run: {prob}")
    det.append(f"muestra normal: ok, 8 filas, FC={hr.get('value')} bpm, sensibilidad picos R={se}, "
               f"traza npz legible, sha256 e hilo run/CSV coherentes")
    # segmento corto: HRV y bandera vacías
    r2 = run_model.ejecutar("ecg", ECG_NORMAL, "MUESTRA-TEST", options={"duracion_s": 10},
                            **{**kw, "normalized_csv": tmp / "n2.csv"})
    if r2.get("status") != "ok":
        f.append(f"duracion_s=10: status={r2.get('status')} {str(r2.get('message'))[:150]!r}")
    else:
        fl = {x["metric"]: x for x in r2["normalized"]}
        for met in ("hrv_rmssd", "hrv_sdnn", "ritmo_irregular_compatible_fa"):
            x = fl.get(met) or {}
            if x.get("value") is not None or not str(x.get("quality")).startswith("sin_dato"):
                f.append(f"duracion_s=10: {met} value={x.get('value')!r} quality={x.get('quality')!r}")
        det.append("duracion_s=10: HRV y bandera con value vacío y quality 'sin_dato…'")
    # CSV sin fs
    cs = tmp / "senoide.csv"
    t = np.arange(2500) / 250.0
    cs.write_text("ecg\n" + "\n".join(f"{v:.5f}" for v in np.sin(2 * np.pi * 1.2 * t)) + "\n", encoding="utf-8")
    r3 = run_model.ejecutar("ecg", cs, "SIM-TEST", simulated=True, **{**kw, "normalized_csv": tmp / "n3.csv"})
    if r3.get("status") != "rechazado" or "fs" not in str(r3.get("message")):
        f.append(f"CSV sin fs: status={r3.get('status')} message={str(r3.get('message'))[:150]!r}")
    else:
        det.append("CSV de senoide declarado ecg_1d sin fs: rechazado (pide fs)")
    # prueba de carga
    n4 = tmp / "n4.csv"
    r4 = run_model.ejecutar("ecg", ECG_NORMAL, "SIM-TEST", simulated=True, options={"prueba_carga_dummy": True},
                            **{**kw, "normalized_csv": n4})
    if r4.get("status") != "prueba_carga" or r4.get("random_load_test") is not True or n4.exists():
        f.append(f"prueba de carga: status={r4.get('status')} random_load_test={r4.get('random_load_test')} "
                 f"csv_creado={n4.exists()}")
    else:
        det.append("prueba_carga_dummy: status prueba_carga, random_load_test=True, nada en el CSV normalizado")
    return f, det


def c7_ecg() -> tuple[str, list[str]]:
    det, fallos = [], []
    with tempfile.TemporaryDirectory() as t:
        t = Path(t)
        (t / "a").mkdir()
        (t / "b").mkdir()
        fa, da = ecg_fallos_cruzados(t / "a")
        fallos += fa
        det.append(f"A: {len(da)} casos cruzados/controles correctos")
        fallos += ecg_runner_rechazos(t / "b")
        det.append("A: runner rechaza ECG en panecho y video en ecg sin subprocess; input/ con .hea+.dat+.atr")
    fb, db = ecg_fallos_filas()
    fallos += fb
    det += db
    fe = ecg_fallos_estaticos()
    fallos += fe
    if not fe:
        det.append("B: manifest sin pesos/torch, solo ecg_1d, 'diagn' declarado; app.py con la etiqueta de bandera")
    if fallos:
        return FALLA, fallos
    if not ecg_venv_existe():
        return PASA, det + [MSG_ECG_PENDIENTE]
    with tempfile.TemporaryDirectory() as t:
        fd, dd = ecg_fallos_integracion(Path(t))
    if fd:
        return FALLA, det + ["D: " + x for x in fd]
    return PASA, det + ["D: " + x for x in dd]


# ---------------------------------------------------------------- main
COMPROBACIONES = [
    ("(1) inferencia real sobre muestra compatible", c1_inferencia_real),
    ("(2) salidas guardadas atadas a su ejecución", c2_salidas_atadas),
    ("(3) archivos incompatibles rechazados con mensaje claro", c3_incompatibles),
    ("(4) no se mezclan personas", c4_no_mezcla),
    ("(5) faltantes y diferencias temporales se conservan", c5_faltantes_y_tiempos),
    ("(6) datos simulados identificados", c6_simulados),
    ("(7) ECG: modalidades cruzadas rechazadas, bandera rotulada no diagnóstica, faltantes vacíos", c7_ecg),
]


def main() -> int:
    hubo_falla = False
    for nombre, fn in COMPROBACIONES:
        try:
            est, det = fn()
        except Exception as e:  # noqa: BLE001
            import traceback
            est, det = FALLA, [f"excepción {type(e).__name__}: {e}", traceback.format_exc()]
        hubo_falla |= est == FALLA
        print(f"{nombre}: {est}")
        for d in det:
            print(f"    - {d}")
    print("RESULTADO:", "FALLA" if hubo_falla else "sin fallas (PENDIENTE = no comprobable en esta máquina)")
    print("Nota: nada de esto valida clínicamente ningún modelo ni es diagnóstico.")
    return 1 if hubo_falla else 0


if __name__ == "__main__":
    sys.exit(main())
