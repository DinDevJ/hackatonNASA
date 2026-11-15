"""Prototipo de investigación (NASA Space Apps). Streamlit con tres vistas (Modelos y sensores, Padecimientos,
Configuración), componentes estándar.

Ejecutar:  streamlit run app.py   (con el venv de la app; no importa torch).
"""
from __future__ import annotations

import contextlib
import glob
import json
import shutil
import subprocess
import sys
import tempfile
import traceback
from datetime import datetime
from pathlib import Path

import numpy as np
import pandas as pd
import streamlit as st

ROOT = Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

st.set_page_config(page_title="Prototipo salud espacial", layout="wide")

MODALIDADES = ["video_2d", "imagen_2d", "volumen_3d", "doppler_color", "doppler_espectral", "ecg_1d", "desconocida"]
VISTAS_BASE = ["desconocida", "A4C", "A2C", "A3C", "A5C", "PLAX", "PSAX", "SUBCOSTAL", "SUPRAESTERNAL"]
TIPOS_NOMBRE = {"medicion": "Mediciones / estimaciones numéricas",
                "probabilidad_clase": "Probabilidades de clase del modelo (no son riesgo clínico)",
                "similitud": "Similitudes imagen-texto (coseno; NO son probabilidades)",
                "hallazgo": "Hallazgos (p. ej. segmentación, en píxeles sin calibración)",
                "regla_alerta": "Banderas experimentales (NO son diagnóstico)"}
EXT_VIDEO = {".mp4", ".mov", ".avi", ".m4v", ".webm", ".mkv"}
EXT_IMG = {".png", ".jpg", ".jpeg", ".bmp"}
EXT_ECG = {".hea", ".dat", ".atr", ".qrs", ".csv", ".txt", ".tsv"}  # registro WFDB o tabla de ECG
EXT_OCULTAS_MUESTRAS = {".dat", ".atr", ".qrs", ".py"}  # compañeros WFDB y scripts: no se listan


@contextlib.contextmanager
def seccion(nombre: str):
    """Captura excepciones de una sección: st.error + traceback, sin tumbar la página."""
    try:
        yield
    except Exception as e:  # noqa: BLE001
        st.error(f"Error en la sección «{nombre}»: {type(e).__name__}: {e}")
        with st.expander("Traceback"):
            st.code(traceback.format_exc())


def importar(modulo: str):
    """Importa un módulo de otro agente; None + aviso claro si no existe o falla."""
    try:
        import importlib
        return importlib.import_module(modulo)
    except Exception as e:  # noqa: BLE001
        st.warning(f"Módulo {modulo} no disponible: {type(e).__name__}: {e}")
        return None


def mostrar_df(df: pd.DataFrame, **kw):
    """Columnas object con números y texto mezclados (p. ej. 'value' con síntomas) se muestran como texto
    para que Arrow no falle; los NaN se ven vacíos, nunca como 0."""
    d = df.copy()
    for c in d.columns:
        if d[c].dtype == object:
            no_nulos = d[c].dropna()
            if len(no_nulos) and no_nulos.map(type).nunique() > 1:
                d[c] = d[c].map(lambda v: "" if v is None or (isinstance(v, float) and v != v) else str(v))
    try:
        st.dataframe(d, **kw)
    except Exception:  # último recurso
        st.dataframe(d.astype(str), **kw)


def visor_frames(p: Path):
    """Muestra un video frame a frame con OpenCV (los .mp4 'mp4v' que escribe OpenCV no se reproducen en
    navegadores), y ofrece descargar el archivo original."""
    try:
        import cv2
        cap = cv2.VideoCapture(str(p))
        n = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
        if n <= 0:
            cap.release()
            st.video(p.read_bytes())
            return
        i = st.slider(f"Frame de {p.name}", 0, max(n - 1, 0), 0, key=f"visor_{p}") if n > 1 else 0
        cap.set(cv2.CAP_PROP_POS_FRAMES, i)
        ok, fr = cap.read()
        cap.release()
        if ok:
            st.image(cv2.cvtColor(fr, cv2.COLOR_BGR2RGB), caption=f"{p.name} - frame {i}/{n - 1}")
        else:
            st.caption(f"No se pudo leer el frame {i} de {p.name}")
    except Exception as e:  # noqa: BLE001
        st.caption(f"Visor por frame no disponible ({type(e).__name__}: {e}); se intenta st.video")
        st.video(p.read_bytes())
    st.download_button(f"Descargar {p.name}", p.read_bytes(), file_name=p.name, key=f"dl_{p}")


def ss(k, default=None):
    return st.session_state.get(k, default)


# ---------------------------------------------------------------- navegación (vistas)
from paginas import estilo  # noqa: E402

estilo.aplicar()
VISTA = st.sidebar.radio("Vista", ["Modelos y sensores", "Padecimientos", "Configuración"], key="vista")
if VISTA != "Modelos y sensores":
    try:
        if VISTA == "Padecimientos":
            from paginas import padecimientos
            padecimientos.render()
        else:
            from paginas import configuracion
            configuracion.render()
    except Exception as e:  # noqa: BLE001
        st.error(f"Error en la vista «{VISTA}»: {type(e).__name__}: {e}")
        st.code(traceback.format_exc())
    st.stop()

# ---------------------------------------------------------------- cabecera
st.title("Monitoreo de salud para astronautas: prototipo de ultrasonido + ECG + sensores")
st.warning("Prototipo de investigación. No es un dispositivo médico ni un diagnóstico. "
           "No validado en astronautas.")

try:
    from core import registry, run_model
    from core.runs import RAW_DIR
    from core.formato import NORMALIZED_CSV
    CORE_OK = True
except Exception as e:  # noqa: BLE001
    CORE_OK = False
    st.error(f"Módulo core no disponible: {type(e).__name__}: {e}")
    st.code(traceback.format_exc())
    st.stop()

# ---------------------------------------------------------------- (0) estado de modelos
st.header("0. Estado de modelos")
modelos: list[dict] = []
with seccion("Estado de modelos"):
    modelos = registry.listar_modelos()
    if not modelos:
        st.warning("No se encontró ningún adapters/*/manifest.json (módulos de modelos no disponibles).")
    else:
        filas = [{"modelo": m["nombre"], "key": m["key"], "estado": m["estado"],
                  "entorno": "instalado" if m.get("entorno_instalado") else "no instalado",
                  "pesos": ("no requiere" if (m.get("manifest") or {}).get("pesos") == []
                            else "presentes" if m.get("pesos_presentes") else "faltan"),
                  "acceso": m.get("acceso"), "licencia": m.get("licencia"),
                  "VRAM estimada (GB)": m.get("vram_gb"),
                  "último run": (m.get("ultimo_run") or {}).get("status")} for m in modelos]
        mostrar_df(pd.DataFrame(filas), hide_index=True)
        for m in modelos:
            if m.get("manifest_error"):
                st.error(f"{m['key']}: {m['manifest_error']}")
    ESPERADOS = {"panecho", "echonet_dynamic", "medsam2", "echoprime", "echoclip", "ecg"}
    st.caption("Esperados: panecho, echonet_dynamic, medsam2, echoprime, echoclip, ecg. "
               + ("Faltan manifests de: " + ", ".join(sorted(ESPERADOS - {m["key"] for m in modelos}))
                  if modelos else ""))
    # GPU / torch sin importar torch
    gpu = "nvidia-smi no disponible (sin GPU NVIDIA o sin driver)"
    try:
        out = subprocess.run(["nvidia-smi", "--query-gpu=name,memory.total,driver_version",
                              "--format=csv,noheader"], capture_output=True, text=True, timeout=10)
        if out.returncode == 0 and out.stdout.strip():
            gpu = out.stdout.strip()
    except Exception:
        pass
    versiones = []
    for m in modelos:
        try:
            py = Path(registry.python_del_venv(m["key"]))
            base = py.parent.parent
            c = glob.glob(str(base / "Lib" / "site-packages" / "torch-*.dist-info")) + \
                glob.glob(str(base / "lib" / "python*" / "site-packages" / "torch-*.dist-info"))
            if c:
                versiones.append(f"{m['key']}: {Path(c[0]).name[len('torch-'):-len('.dist-info')]}")
        except Exception:
            pass
    st.caption(f"GPU: {gpu}")
    st.caption("torch por entorno (leído del disco, sin importarlo): " + ("; ".join(versiones) or "ninguno instalado"))

# ---------------------------------------------------------------- (1) carga
st.header("1. Carga de video o estudio")
subir = []
muestra = None
with seccion("Carga"):
    subir = st.file_uploader("Archivo(s): video, DICOM, imagen, volumen, npz, registro WFDB (.hea + .dat [+ .atr]) "
                             "o CSV de ECG... (varios archivos = un estudio)",
                             accept_multiple_files=True)
    samples = sorted(p.name for p in (ROOT / "samples").glob("*")
                     if p.is_file() and p.name != "FUENTES.md" and p.suffix.lower() not in EXT_OCULTAS_MUESTRAS)
    muestra = st.selectbox("...o una muestra oficial de samples/ (ver samples/FUENTES.md)", ["(ninguna)"] + samples)
    c1, c2, c3 = st.columns(3)
    subject_id = c1.text_input("subject_id", value="S1")
    study_id = c2.text_input("study_id", value="E1")
    ts_txt = c3.text_input("Timestamp de adquisición ISO-8601 (opcional)", value="",
                           help="p. ej. 2026-11-14T09:30:00-06:00")
    c4, c5, c6 = st.columns(3)
    _nom_elegido = Path(subir[0].name).name if subir else (muestra if muestra != "(ninguna)" else "")
    _idx_mod = MODALIDADES.index("ecg_1d") if Path(_nom_elegido).suffix.lower() in EXT_ECG else 0
    modalidad_decl = c4.selectbox("Modalidad declarada", MODALIDADES, index=_idx_mod)
    vistas = list(VISTAS_BASE)
    for m in modelos:
        for v in m.get("vistas_admitidas", []):
            if v.lower() != "cualquiera" and v not in vistas:
                vistas.append(v)
    vista_decl = c5.selectbox("Vista declarada", vistas)
    simulado = c6.checkbox("Es dato simulado (simulated=true)", value=False)
    if ts_txt.strip():
        try:
            datetime.fromisoformat(ts_txt.strip())
        except ValueError:
            st.error("Timestamp no es ISO-8601 válido; se enviará vacío hasta que lo corrijas.")
            ts_txt = ""
    # entrada elegida para vista previa
    entrada_prev: Path | None = None
    if subir:
        entrada_prev = Path(subir[0].name)
        if any(Path(f.name).suffix.lower() in EXT_ECG for f in subir):
            st.caption(f"{len(subir)} archivo(s) ECG: " + ", ".join(f.name for f in subir))
        elif len(subir) == 1 and Path(subir[0].name).suffix.lower() in EXT_VIDEO:
            st.video(subir[0].getvalue())
        elif len(subir) == 1 and Path(subir[0].name).suffix.lower() in EXT_IMG:
            st.image(subir[0].getvalue())
        else:
            st.caption(f"{len(subir)} archivo(s): " + ", ".join(f.name for f in subir))
    elif muestra != "(ninguna)":
        entrada_prev = ROOT / "samples" / muestra
        if entrada_prev.suffix.lower() in EXT_ECG:
            comp_ = sorted(q.name for q in (ROOT / "samples").glob(entrada_prev.stem + ".*"))
            st.caption("Registro ECG (no se previsualiza como video/imagen): " + ", ".join(comp_))
        elif entrada_prev.suffix.lower() in EXT_VIDEO:
            st.video(entrada_prev.read_bytes())
        elif entrada_prev.suffix.lower() in EXT_IMG:
            st.image(str(entrada_prev))
    if modalidad_decl == "ecg_1d" or Path(_nom_elegido).suffix.lower() in EXT_ECG:
        st.caption("Muestras ECG: DATOS REALES PÚBLICOS de pacientes hospitalarios (MIT-BIH/AFDB, PhysioNet, "
                   "ODC-By 1.0). NO son de Iker ni de astronautas.")

# ---------------------------------------------------------------- (2) modelo
st.header("2. Selección de modelo y opciones")
key_sel = None
opciones: dict = {}
prueba_carga = False
with seccion("Selección de modelo"):
    disp, nodisp = [], []
    for m in modelos:
        adm = m.get("modalidades_admitidas", [])
        if m.get("manifest") is None:
            nodisp.append((m, f"manifest inválido: {m.get('manifest_error')}"))
        elif modalidad_decl != "desconocida" and modalidad_decl not in adm:
            nodisp.append((m, f"no admite '{modalidad_decl}' (admite: {', '.join(adm)}). Análisis no implementado."))
        else:
            disp.append(m)
    for m, motivo in nodisp:
        st.checkbox(f"{m['nombre']} ({m['key']})", value=False, disabled=True, key=f"dis_{m['key']}",
                    help=motivo)
        st.caption(f"deshabilitado: {m['nombre']}: {motivo}")
    if not disp:
        st.info("Ningún modelo disponible para la modalidad declarada (o faltan módulos de modelos).")
    else:
        key_sel = st.radio("Modelo", [m["key"] for m in disp],
                           format_func=lambda k: next(f"{m['nombre']} - {m['estado']}" for m in disp if m["key"] == k))
        msel = next(m for m in disp if m["key"] == key_sel)
        vs = msel.get("vistas_admitidas", [])
        if vs and "cualquiera" not in [v.lower() for v in vs]:
            st.caption(f"Vistas admitidas: {', '.join(vs)}")
        defaults = (msel["manifest"].get("opciones") or {})
        for k, dv in defaults.items():
            if k == "prueba_carga_dummy":
                continue  # se controla con la casilla de prueba de carga
            wk = f"opt_{key_sel}_{k}"
            if key_sel == "ecg" and k == "fs":
                st.caption("fs: 0 = usar la del encabezado WFDB; obligatorio (>0) para CSV")
            if isinstance(dv, bool):
                opciones[k] = st.checkbox(k, value=dv, key=wk)
            elif isinstance(dv, int):
                opciones[k] = int(st.number_input(k, value=dv, step=1, key=wk))
            elif isinstance(dv, float):
                opciones[k] = float(st.number_input(k, value=dv, key=wk))
            elif isinstance(dv, str):
                opciones[k] = st.text_input(k, value=dv, key=wk)
            else:  # listas/dict/None: JSON
                t = st.text_input(f"{k} (JSON)", value=json.dumps(dv), key=wk)
                try:
                    opciones[k] = json.loads(t)
                except ValueError:
                    st.error(f"{k}: JSON inválido")
        if msel["manifest"].get("requiere_prompt"):
            st.info("Este modelo requiere una indicación inicial (caja). No es segmentación automática.")
            claves = list(defaults)
            kbox = next((k for k in claves if "box" in k.lower() or "caja" in k.lower()), "box")
            kfr = next((k for k in claves if "frame" in k.lower()), "frame_idx")
            fr_n = 1
            frame_img = None
            try:
                import cv2
                ruta = (ROOT / "samples" / muestra) if (not subir and muestra != "(ninguna)") else None
                if subir and len(subir) == 1 and Path(subir[0].name).suffix.lower() in EXT_VIDEO | EXT_IMG:
                    tmpd = Path(tempfile.mkdtemp(prefix="prev_"))
                    ruta = tmpd / Path(subir[0].name).name
                    ruta.write_bytes(subir[0].getvalue())
                if ruta is not None and ruta.suffix.lower() in EXT_VIDEO:
                    cap = cv2.VideoCapture(str(ruta))
                    fr_n = max(int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 1), 1)
                    fi = st.slider("Frame para orientar la caja", 0, fr_n - 1, 0, key="prev_frame")
                    cap.set(cv2.CAP_PROP_POS_FRAMES, fi)
                    ok, frame_img = cap.read()
                    cap.release()
                    opciones[kfr] = fi
                elif ruta is not None and ruta.suffix.lower() in EXT_IMG:
                    frame_img = cv2.imread(str(ruta))
                if frame_img is not None:
                    h, w = frame_img.shape[:2]
                    st.caption(f"Tamaño del frame: {w} x {h} px (coordenadas de la caja en píxeles de este frame)")
                    prev = (opciones.get(kbox) if isinstance(opciones.get(kbox), list) else None) or [0, 0, w // 2, h // 2]
                    cols = st.columns(4)
                    x0 = cols[0].number_input("x0", 0, w, int(prev[0]), key="bx0")
                    y0 = cols[1].number_input("y0", 0, h, int(prev[1]), key="by0")
                    x1 = cols[2].number_input("x1", 0, w, int(prev[2]), key="bx1")
                    y1 = cols[3].number_input("y1", 0, h, int(prev[3]), key="by1")
                    opciones[kbox] = [int(x0), int(y0), int(x1), int(y1)]
                    marc = frame_img.copy()
                    cv2.rectangle(marc, (int(x0), int(y0)), (int(x1), int(y1)), (0, 255, 0), 2)
                    st.image(marc[:, :, ::-1], caption="Frame con la caja indicada")
                else:
                    st.caption("Sin vista previa: elige un video/imagen para dibujar la caja.")
            except Exception as e:  # noqa: BLE001
                st.warning(f"No se pudo mostrar el frame: {type(e).__name__}: {e}")
    prueba_carga = st.checkbox("Prueba de carga (dummy, NO es inferencia real)", value=False)

# ---------------------------------------------------------------- (3) ejecutar
st.header("3. Ejecutar")
with seccion("Ejecución"):
    puede = key_sel is not None and (bool(subir) or muestra != "(ninguna)") and bool(subject_id.strip())
    if not puede:
        st.caption("Falta: modelo disponible, archivo o muestra, y subject_id.")
    if st.button("Ejecutar", disabled=not puede):
        if subir:
            tmpd = Path(tempfile.mkdtemp(prefix="upl_"))
            rutas = []
            for f in subir:
                p = tmpd / Path(f.name).name
                p.write_bytes(f.getvalue())
                rutas.append(p)
        else:
            rutas = [ROOT / "samples" / muestra]
        opts = dict(opciones)
        if prueba_carga:
            opts["prueba_carga_dummy"] = True
        with st.spinner(f"Ejecutando {key_sel} (CPU/GPU, puede tardar)..."):
            resp = run_model.ejecutar(key_sel, rutas, subject_id.strip(), study_id.strip() or None,
                                      ts_txt.strip() or None, modalidad_decl, vista_decl, opts, simulado)
        st.session_state["last_resp"] = resp
        st.session_state["last_subject"] = subject_id.strip()
        if subir:
            shutil.rmtree(rutas[0].parent, ignore_errors=True)
    resp = ss("last_resp")
    if resp:
        stt = resp.get("status")
        msg = f"status: {stt} | modelo: {resp.get('model')} | {resp.get('message') or ''}"
        (st.success if stt == "ok" else st.warning if stt in ("rechazado", "prueba_carga") else st.error)(msg)
        st.write({"elapsed_s": resp.get("elapsed_s"), "device": resp.get("device"),
                  "run_dir": resp.get("run_dir"), "inferencia_real": resp.get("inferencia_real"),
                  "random_load_test": resp.get("random_load_test")})
        if resp.get("random_load_test"):
            st.warning("PRUEBA DE CARGA: NO se ha corrido inferencia real; la salida no tiene significado clínico.")
        for w in resp.get("warnings") or []:
            st.warning(w)
        for e in resp.get("errors") or []:
            st.error(str(e)[:2000])
        err_log = ROOT / (resp.get("run_dir") or "") / "stderr.log"
        if resp.get("run_dir") and err_log.is_file():
            with st.expander("stderr.log"):
                st.code(err_log.read_text(encoding="utf-8", errors="replace")[-8000:] or "(vacío)")

# ---------------------------------------------------------------- (4) resultados
st.header("4. Resultados (salidas reales de modelos)")
with seccion("Resultados"):
    resp = ss("last_resp")
    if not resp:
        st.caption("Aún no se ha ejecutado nada.")
    else:
        run_dir = ROOT / (resp.get("run_dir") or "")
        if resp.get("status") == "rechazado":
            st.warning(f"Análisis no implementado: {resp.get('message')}")
        rows = resp.get("normalized") or []
        if rows:
            df = pd.DataFrame(rows)
            for tipo, titulo in TIPOS_NOMBRE.items():
                sub = df[df["tipo"] == tipo]
                if len(sub):
                    st.subheader(titulo)
                    cols_t = [c for c in ["metric", "value", "unit", "quality", "source", "simulated", "notes"] if c in sub.columns]
                    mostrar_df(sub[cols_t], hide_index=True)
            otros = df[~df["tipo"].isin(TIPOS_NOMBRE)]
            if len(otros):
                mostrar_df(otros, hide_index=True)
        elif resp.get("status") == "ok":
            st.info("El run terminó ok pero no devolvió filas normalizadas.")
        if resp.get("raw_output"):
            with st.expander("raw_output (salida original del modelo)"):
                st.json(resp["raw_output"])
        with st.expander("response.json completo"):
            st.json(resp)
        # artefactos
        for a in resp.get("artifacts") or []:
            ap_ = a.get("path") if isinstance(a, dict) else a
            if not ap_:
                continue
            p = Path(ap_) if Path(ap_).is_absolute() else ROOT / ap_
            if not p.is_file():
                p = run_dir / Path(ap_).name
            if not p.is_file():
                st.caption(f"artefacto no encontrado: {ap_}")
                continue
            if p.suffix.lower() in EXT_VIDEO:
                st.caption(f"Artefacto: {p.name}")
                visor_frames(p)
            elif p.suffix.lower() in EXT_IMG:
                st.image(str(p), caption=p.name)
            else:
                st.caption(f"Artefacto guardado: {p.relative_to(ROOT).as_posix() if p.is_relative_to(ROOT) else p}")
        inp = run_dir / "input"
        if inp.is_dir():
            vids = [f for f in sorted(inp.rglob("*")) if f.suffix.lower() in EXT_VIDEO]
            if vids:
                st.caption(f"Video de entrada: {vids[0].name}")
                if vids[0].suffix.lower() in {".mp4", ".webm"}:
                    st.video(vids[0].read_bytes())
                visor_frames(vids[0])

# ---------------------------------------------------------------- (4b) ECG
SIN_DATO = "sin dato"


def _vacio(v) -> bool:
    return v is None or (isinstance(v, float) and v != v)


def _fmt(v, dec: int = 1) -> str:
    if _vacio(v):
        return SIN_DATO
    try:
        return f"{float(v):.{dec}f}"
    except (TypeError, ValueError):
        return str(v)


def _tabla_generica(obj, **kw):
    """dict -> tabla clave/valor; lista de dicts -> DataFrame; todo con .get-safe y None como vacío."""
    if isinstance(obj, dict):
        filas = [{"campo": k, "valor": (json.dumps(v, ensure_ascii=False, default=str)
                                        if isinstance(v, (dict, list)) else v)} for k, v in obj.items()]
        mostrar_df(pd.DataFrame(filas, columns=["campo", "valor"]), hide_index=True, **kw)
    elif isinstance(obj, list) and obj:
        mostrar_df(pd.DataFrame(obj), hide_index=True, **kw)
    else:
        st.caption(SIN_DATO)


def _df_campos(d, campos: list[str], extra: dict | None = None) -> pd.DataFrame:
    d = d if isinstance(d, dict) else {}
    fila = {c: d.get(c) for c in campos}
    fila.update(extra or {})
    return pd.DataFrame([fila])


def _json_resp(run_rel: str) -> dict | None:
    f = ROOT / run_rel / "response.json"
    try:
        return json.loads(f.read_text(encoding="utf-8"))
    except Exception:  # noqa: BLE001
        return None


def grafica_ecg(npz_path: Path, key_run: str):
    import altair as alt
    z = np.load(npz_path, allow_pickle=False)
    fs = float(z["fs"])
    sen = np.asarray(z["senal"], dtype=float)
    unidad = str(z["unidad"]) if "unidad" in z.files else ""
    t0 = float(z["t0_s"]) if "t0_s" in z.files else 0.0
    dur = len(sen) / fs
    c1, c2 = st.columns(2)
    vent = int(c2.select_slider("Ventana (s)", options=[5, 10, 20, 30], value=10, key=f"ecg_vent_{key_run}"))
    vent = int(min(vent, max(dur, 1)))
    max_ini = int(max(dur - vent, 0))
    if max_ini > 0:
        ini = int(c1.slider("Inicio (s)", 0, max_ini, 0, step=1, key=f"ecg_ini_{key_run}"))
    else:
        ini = 0
        c1.caption("Inicio (s): 0 (la traza es más corta que la ventana)")
    i0, i1 = int(ini * fs), min(int((ini + vent) * fs), len(sen))
    idx = np.arange(i0, i1)
    paso = max(1, int(np.ceil(len(idx) / 5000)))
    idx_d = idx[::paso]
    df_s = pd.DataFrame({"t (s)": idx_d / fs, "senal": sen[idx_d]})
    ylab = f"señal ({unidad})" if unidad else "señal"

    def en_vent(m):
        m = np.asarray(m, dtype=np.int64)
        return m[(m >= i0) & (m < i1) & (m < len(sen))]
    picos = en_vent(z["picos_r"])
    irr = en_vent(z["picos_irregulares"]) if "picos_irregulares" in z.files else np.zeros(0, np.int64)
    ann_m = np.asarray(z["ann_muestras"], dtype=np.int64) if "ann_muestras" in z.files else np.zeros(0, np.int64)
    ann_s = np.asarray(z["ann_simbolos"]).astype(str) if "ann_simbolos" in z.files else np.zeros(0, str)
    ok_a = (ann_m >= i0) & (ann_m < i1) & (ann_m < len(sen))
    ann_m, ann_s = ann_m[ok_a], ann_s[ok_a]
    x = alt.X("t (s):Q", title="tiempo (s, desde el inicio del segmento analizado)")
    y = alt.Y("y:Q", title=ylab, scale=alt.Scale(zero=False))
    capas = [alt.Chart(df_s.rename(columns={"senal": "y"})).mark_line().encode(x=x, y=y)]
    df_p = pd.DataFrame({"t (s)": picos / fs, "y": sen[picos], "marca": "pico R detectado"})
    df_i = pd.DataFrame({"t (s)": irr / fs, "y": sen[irr], "marca": "latido irregular (criterio RR)"})
    df_m = pd.concat([df_p, df_i], ignore_index=True)
    if len(df_m):
        dom = ["pico R detectado", "latido irregular (criterio RR)"]
        capas.append(alt.Chart(df_m).mark_point(size=70, filled=True, opacity=1).encode(
            x=x, y=y, color=alt.Color("marca:N", title="marca", scale=alt.Scale(domain=dom, range=["red", "orange"])),
            shape=alt.Shape("marca:N", title="marca", scale=alt.Scale(domain=dom, range=["circle", "diamond"])),
            tooltip=["marca", "t (s)", "y"]))
    if len(ann_m):
        df_a = pd.DataFrame({"t (s)": ann_m / fs, "y": sen[ann_m], "simbolo": ann_s})
        capas.append(alt.Chart(df_a).mark_text(dy=-14, fontSize=13).encode(
            x=x, y=y, text="simbolo:N", tooltip=["simbolo", "t (s)"]))
    st.altair_chart(alt.layer(*capas), use_container_width=True)
    cap = (f"Línea: señal del canal elegido. Círculo: pico R detectado por NeuroKit2 ({len(picos)} en la ventana). "
           f"Otra forma/color: latido marcado irregular por el criterio RR ({len(irr)}). ")
    cap += ("Letras sobre el latido: símbolo anotado en el registro (N normal, V ventricular prematuro, "
            "A supraventricular prematuro, etc.). " if len(ann_m) else
            ("Sin símbolos anotados en esta ventana. " if "ann_muestras" in z.files else ""))
    if paso > 1:
        cap += f"Se dibuja 1 de cada {paso} muestras de la señal (decimado para la gráfica; picos y anotaciones sin decimar). "
    st.caption(cap)
    ri = np.asarray(z["ritmo_inicio_s"], dtype=float) if "ritmo_inicio_s" in z.files else np.zeros(0)
    rf_ = np.asarray(z["ritmo_fin_s"], dtype=float) if "ritmo_fin_s" in z.files else np.zeros(0)
    re_ = np.asarray(z["ritmo_etiqueta"]).astype(str) if "ritmo_etiqueta" in z.files else np.zeros(0, str)
    cubre = [f"{e} ({a:.0f}–{b:.0f} s)" for a, b, e in zip(ri, rf_, re_) if a < ini + vent and b > ini]
    return {"fs": fs, "t0": t0, "dur": dur, "ini": ini, "vent": vent, "ritmos": cubre}


def bloque_comparacion(comp):
    st.subheader("Comparación contra etiquetas reales (anotaciones del registro)")
    if not isinstance(comp, dict):
        st.caption("Este registro no trae anotaciones (.atr): no hay comparación.")
        return
    st.caption("Comparación descriptiva sobre un segmento; no es una validación clínica.")
    cam = ["sensibilidad", "ppv"]
    st.markdown("**(a) Picos R vs latidos anotados**")
    pr = comp.get("picos_r")
    if isinstance(pr, dict):
        mostrar_df(_df_campos(pr, ["referencia", "tolerancia_ms", "n_ref", "n_det", "tp", "fn", "fp"] + cam),
                   hide_index=True)
        if "qrs" in str(pr.get("referencia", "")).lower() and "atr" not in str(pr.get("referencia", "")).lower().split():
            st.caption("Referencia de detector automático NO auditado (.qrs), no es una anotación manual.")
    else:
        st.caption(SIN_DATO)
    st.markdown("**(b) Latidos ectópicos/irregulares: anotados (V, A, otros) vs detectados**")
    for k, tit in (("ectopicos", "Criterio RR (principal)"), ("ectopicos_kubios", "Kubios (comparación)")):
        e = comp.get(k)
        if isinstance(e, dict):
            st.caption(tit)
            mostrar_df(_df_campos(e, ["n_anotados_V", "n_anotados_A", "n_anotados_otros", "n_anotados_total",
                                      "n_detectados", "tp", "fn", "fp"] + cam), hide_index=True)
            if e.get("anotados_por_simbolo"):
                st.caption("Anotados por símbolo: " + json.dumps(e["anotados_por_simbolo"], ensure_ascii=False))
        elif k == "ectopicos":
            st.caption(SIN_DATO + (f" ({comp['ectopicos_motivo']})" if comp.get("ectopicos_motivo") else ""))
    st.markdown("**(c) Bandera FA vs ritmo anotado (AFIB) por segmento**")
    fa = comp.get("fa")
    if isinstance(fa, dict):
        mostrar_df(_df_campos(fa, ["fraccion_tiempo_afib_anotada", "n_ventanas_evaluables", "n_ventanas_afib",
                                   "tp", "fp", "fn", "tn", "sensibilidad", "especificidad", "ppv",
                                   "bandera_segmento"]), hide_index=True)
        if fa.get("criterio_ventana"):
            st.caption(f"Criterio: {fa['criterio_ventana']}")
    else:
        st.caption(SIN_DATO + (f": {comp['fa_motivo']}" if comp.get("fa_motivo") else ""))
    st.markdown("**(d) FC/HRV desde picos detectados vs desde latidos anotados**")
    fh = comp.get("fc_hrv")
    if isinstance(fh, dict):
        det, ann, dif = (fh.get(k) if isinstance(fh.get(k), dict) else {} for k in ("detectados", "anotados", "diferencias"))
        claves = list(dict.fromkeys([*det, *ann, *dif]))
        mostrar_df(pd.DataFrame([{"campo": c, "detectados": det.get(c), "anotados": ann.get(c),
                                  "diferencia": dif.get(c)} for c in claves]), hide_index=True)
        if fh.get("nota"):
            st.caption(str(fh["nota"]))
    else:
        st.caption(SIN_DATO)


with seccion("ECG"):
    st.header("4b. ECG: traza, picos R y métricas (experimental, NO diagnóstico)")
    run_ecg = None  # response.json (dict)
    resp_u = ss("last_resp")
    if resp_u and resp_u.get("model") == "ecg" and resp_u.get("status") == "ok" and not resp_u.get("random_load_test"):
        run_ecg = resp_u
    guardados = [r for r in registry.runs_de_modelo("ecg")
                 if r.get("status") == "ok" and not r.get("random_load_test")]
    if guardados:
        opts_r = ["(último run de esta sesión)" if run_ecg else "(ninguno)"] + [r["run_dir"] for r in guardados]
        sel_r = st.selectbox("Run ECG guardado", opts_r)
        if sel_r != opts_r[0]:
            run_ecg = _json_resp(sel_r)
            if run_ecg is not None and not run_ecg.get("run_dir"):
                run_ecg["run_dir"] = sel_r
    if not run_ecg:
        st.caption("Aún no hay runs de ECG.")
    else:
        st.warning("BANDERA EXPERIMENTAL – NO DIAGNÓSTICO. Estimaciones por procesamiento de señal (NeuroKit2), "
                   "no validadas clínicamente ni en astronautas.")
        rd = ROOT / (run_ecg.get("run_dir") or "")
        raw = run_ecg.get("raw_output") if isinstance(run_ecg.get("raw_output"), dict) else {}
        filas = {f.get("metric"): f for f in (run_ecg.get("normalized") or []) if isinstance(f, dict)}
        st.caption(f"Run: {run_ecg.get('run_id') or rd.name} | simulated={run_ecg.get('simulated', 'sin dato')}")
        spec = [("heart_rate", "Frecuencia cardiaca (bpm)", 1), ("hrv_rmssd", "HRV RMSSD (ms)", 1),
                ("hrv_sdnn", "HRV SDNN (ms)", 1), ("pr_interval", "Intervalo PR (ms)", 0),
                ("qtc_bazett", "QTc Bazett (ms)", 0), ("latidos_irregulares", "Latidos irregulares", 0)]
        cols = st.columns(len(spec))
        for c, (met, tit, dec) in zip(cols, spec):
            f = filas.get(met) or {}
            c.metric(tit, _fmt(f.get("value"), dec))
            c.caption(f"quality: {f.get('quality') or SIN_DATO}")
        with st.expander("Detalle (ventana, n, método)"):
            if filas:
                dd = pd.DataFrame(list(filas.values()))
                mostrar_df(dd[[c for c in ["metric", "value", "unit", "quality", "source", "notes"] if c in dd.columns]],
                           hide_index=True)
            else:
                st.caption(SIN_DATO)
        # bandera
        fb = filas.get("ritmo_irregular_compatible_fa") or {}
        vb = fb.get("value")
        txt = "Bandera de ritmo irregular compatible con FA: "
        if _vacio(vb):
            st.info(txt + f"sin dato: {fb.get('quality') or SIN_DATO} (BANDERA EXPERIMENTAL – NO DIAGNÓSTICO)")
        elif float(vb) >= 1:
            st.warning(txt + "ACTIVADA (BANDERA EXPERIMENTAL – NO DIAGNÓSTICO)")
        else:
            st.info(txt + "no activada (BANDERA EXPERIMENTAL – NO DIAGNÓSTICO)")
        bf = raw.get("bandera_fa") if isinstance(raw.get("bandera_fa"), dict) else {}
        if bf:
            st.write(f"Fórmula: {bf.get('formula') or SIN_DATO}")
            with st.expander("Parámetros y fuente de la regla (qué fija el artículo y qué es decisión propia)"):
                st.write("Parámetros:")
                st.json(bf.get("parametros") if bf.get("parametros") is not None else {})
                st.write(f"Fuente: {bf.get('fuente') or SIN_DATO}")
            ff = bf.get("fraccion_marcadas")
            st.write(f"Fracción de segmentos marcados: {_fmt(ff, 3)} "
                     f"({bf.get('n_marcadas', SIN_DATO)} de {bf.get('n_evaluables', SIN_DATO)} evaluables; "
                     f"máx. consecutivos: {bf.get('max_consecutivas', SIN_DATO)})")
            if bf.get("motivo"):
                st.caption(f"Motivo: {bf['motivo']}")
            with st.expander("Segmentos de la bandera (ventanas)"):
                _tabla_generica(bf.get("ventanas"))
        else:
            st.caption("Sin detalle de la bandera en raw_output.")
        # traza
        st.subheader("Traza ECG")
        npz = rd / "ecg_traza.npz"
        if not npz.is_file():
            st.info(f"No se encontró el artefacto ecg_traza.npz en {rd.name}: no se puede dibujar la traza.")
        else:
            info = grafica_ecg(npz, rd.name)
            ent = raw.get("entrada") if isinstance(raw.get("entrada"), dict) else {}
            seg = ent.get("segmento_s")
            seg_t = f"{seg[0]}–{seg[1]} s" if isinstance(seg, (list, tuple)) and len(seg) == 2 else SIN_DATO
            st.caption(f"Registro: {ent.get('registro', SIN_DATO)} | canal: {ent.get('canal_nombre', SIN_DATO)} "
                       f"(índice {ent.get('canal_indice', SIN_DATO)}) | fs: {ent.get('fs_hz', info['fs'])} Hz | "
                       f"segmento analizado: {seg_t} | ventana visible: {info['ini']}–{info['ini'] + info['vent']} s "
                       f"desde el inicio del segmento | traza guardada: {info['dur']:.0f} s")
            if ent.get("senal_simulada"):
                st.warning("Señal SIMULADA (prueba de carga): sin significado clínico.")
            if info["ritmos"]:
                st.caption("Ritmos anotados que cubren la ventana: " + "; ".join(info["ritmos"]))
        bloque_comparacion(raw.get("comparacion_anotaciones"))

# ---------------------------------------------------------------- (5) sensores
st.header("5. Sensores (reloj y otros dispositivos)")
with seccion("Sensores"):
    imp = importar("sensores.importador")
    c1, c2 = st.columns(2)
    ventana_h = c1.number_input("ventana_h (horas)", min_value=1, value=24, step=1)
    basal_dias = c2.number_input("basal_dias (días)", min_value=1, value=7, step=1)
    if imp is not None:
        f = st.file_uploader("CSV o JSON de sensores", type=["csv", "json"], key="sens_up")
        if f is not None and st.button("Cargar archivo de sensores"):
            tmpd = Path(tempfile.mkdtemp(prefix="sens_"))
            p = tmpd / Path(f.name).name
            p.write_bytes(f.getvalue())
            try:
                df, avisos = imp.cargar(p, f.name)
            except TypeError:
                df, avisos = imp.cargar(f.getvalue(), f.name)
            st.session_state.update(sens_df=df, sens_avisos=avisos, sens_origen=f.name)
            shutil.rmtree(tmpd, ignore_errors=True)
        if st.button("Usar ejemplo sintético (SIMULADO)"):
            ej = None
            for pat in ("sensores/ejemplo_sintetico_sensores.csv", "sensores/ejemplo*.csv", "sensores/ejemplo*.json", "sensores/**/ejemplo*.csv",
                        "samples/*sensor*.csv", "samples/*sintetic*.csv"):
                c = sorted(ROOT.glob(pat))
                if c:
                    ej = c[0]
                    break
            if ej is not None:
                df, avisos = imp.cargar(ej, ej.name)
            else:
                ge = importar("sensores.ejemplo")
                fn = getattr(ge, "generar", None) or getattr(ge, "ejemplo", None) if ge else None
                if fn is None:
                    raise FileNotFoundError("no hay archivo de ejemplo sintético en sensores/ ni sensores.ejemplo.generar()")
                res = fn()
                df, avisos = res if isinstance(res, tuple) else (res, [])
            st.session_state.update(sens_df=df, sens_avisos=avisos, sens_origen="ejemplo sintético")
    sdf = ss("sens_df")
    if sdf is not None:
        st.caption(f"Origen: {ss('sens_origen')} | filas: {len(sdf)}")
        if "simulated" in sdf.columns and sdf["simulated"].astype(str).str.lower().eq("true").any():
            st.warning("DATOS SIMULADOS (simulated=true): no pertenecen a una persona real.")
        for a in ss("sens_avisos") or []:
            st.warning(str(a))
        mostrar_df(sdf.head(500), hide_index=True)

# ---------------------------------------------------------------- (6) fusión
st.header("6. Tabla conjunta, comparación y alertas")
st.caption("Clases de información: [salidas reales de modelos] | [comparaciones descriptivas] | "
           "[alertas experimentales] | [datos simulados] | [predicción futura no implementada]")
with seccion("Fusión"):
    ndf = pd.read_csv(NORMALIZED_CSV) if Path(NORMALIZED_CSV).exists() and Path(NORMALIZED_CSV).stat().st_size else pd.DataFrame()
    sdf = ss("sens_df")
    sujetos = set(ndf["subject_id"].dropna().astype(str)) if len(ndf) else set()
    if sdf is not None and "subject_id" in sdf.columns:
        sujetos |= set(sdf["subject_id"].dropna().astype(str))
    if not sujetos:
        st.info("No hay datos todavía (ni outputs/normalized.csv ni sensores cargados).")
    else:
        sid = st.selectbox("subject_id (nunca se mezclan personas)", sorted(sujetos))
        en_n = len(ndf) and sid in set(ndf["subject_id"].astype(str))
        en_s = sdf is not None and sid in set(sdf["subject_id"].astype(str))
        if not en_n:
            st.warning(f"{sid}: sin salidas de modelos en normalized.csv.")
        if not en_s:
            st.warning(f"{sid}: sin datos de sensores cargados.")
        tabla = comp = None
        alertas = []
        tb = importar("fusion.tabla")
        if tb is not None:
            sens_in = sdf if sdf is not None else pd.DataFrame()
            tabla = tb.construir(ndf, sens_in, sid, ventana_h=int(ventana_h), basal_dias=int(basal_dias))
            st.subheader("Tabla conjunta [salidas reales de modelos + resúmenes de sensores; sensores simulados marcados]")
            mostrar_df(tabla, hide_index=True)
            st.subheader("Comparación entre modelos [comparación descriptiva; acuerdo no implica exactitud]")
            comp = tb.comparar_modelos(ndf, sid)
            if comp is None or len(comp) == 0:
                st.info("No hay una misma métrica de dos modelos para este sujeto.")
            else:
                mostrar_df(comp, hide_index=True)
            st.session_state["tabla_csv"] = tabla.to_csv(index=False)
        rg = importar("fusion.reglas")
        if rg is not None and tabla is not None:
            st.subheader("Alertas experimentales [REGLA EXPERIMENTAL – no diagnóstica]")
            alertas = rg.evaluar(tabla, comp if comp is not None else pd.DataFrame())
            if not alertas:
                st.info("Sin reglas definidas.")
            for a in alertas:
                tit = f"{'ACTIVADA' if a.get('activada') else 'no activada'}: {a.get('nombre')} ({a.get('id')})"
                with st.expander(tit, expanded=bool(a.get("activada"))):
                    st.caption(a.get("etiqueta", ""))
                    st.write(f"Fórmula: {a.get('formula')}")
                    st.write({"parámetros": a.get("parametros")})
                    st.write(a.get("mensaje"))
                    d = a.get("datos")
                    if d is not None and len(d):
                        st.write("Datos que la activaron:")
                        mostrar_df(pd.DataFrame(d) if not isinstance(d, pd.DataFrame) else d, hide_index=True)
            st.session_state["alertas_json"] = json.dumps(alertas, ensure_ascii=False, indent=2, default=str)
        st.subheader("Predicción futura [no implementada]")
        rf = importar("fusion.red_fusion_stub")
        if rf is not None and tabla is not None:
            pr = rf.predecir(tabla)
            st.info(f"Predictor entrenado disponible: {pr.get('disponible')}. {pr.get('motivo')}")
            st.json(pr)
        # gráficas
        st.subheader("Gráficas")
        if en_s:
            s1 = sdf[sdf["subject_id"].astype(str) == sid].copy()
            s1["timestamp"] = pd.to_datetime(s1["timestamp"], utc=True, errors="coerce", format="mixed")
            s1["value"] = pd.to_numeric(s1["value"], errors="coerce")
            s1 = s1.dropna(subset=["timestamp", "value"])
            if len(s1) and s1["simulated"].astype(str).str.lower().eq("true").any():
                st.warning("Gráficas de sensores SIMULADOS.")
            for var, g in s1.groupby("variable"):
                st.caption(f"{var} ({', '.join(sorted(g['unit'].dropna().astype(str).unique()))})")
                st.line_chart(g.pivot_table(index="timestamp", columns="device", values="value", aggfunc="mean"))
        if en_n:
            e1 = ndf[(ndf["subject_id"].astype(str) == sid) & (ndf["tipo"] == "medicion")
                     & (ndf["source"] == "modelo_preentrenado")].copy()
            e1["timestamp"] = pd.to_datetime(e1["timestamp"], utc=True, errors="coerce", format="mixed")
            e1["value"] = pd.to_numeric(e1["value"], errors="coerce")
            sin_ts = e1["timestamp"].isna().sum()
            e1 = e1.dropna(subset=["timestamp", "value"])
            if len(e1):
                st.caption("Valores de modelos de eco (puntos)")
                st.scatter_chart(e1, x="timestamp", y="value", color="metric")
            if sin_ts:
                st.caption(f"{sin_ts} medición(es) de eco sin timestamp no se grafican en el tiempo.")

# ---------------------------------------------------------------- (7) descargas
st.header("7. Descargas")
with seccion("Descargas"):
    c = st.columns(4)
    if Path(NORMALIZED_CSV).exists():
        c[0].download_button("normalized.csv", Path(NORMALIZED_CSV).read_bytes(), "normalized.csv", "text/csv")
    else:
        c[0].caption("normalized.csv aún no existe")
    if ss("tabla_csv"):
        c[1].download_button("tabla_conjunta.csv", ss("tabla_csv").encode("utf-8"), "tabla_conjunta.csv", "text/csv")
    else:
        c[1].caption("sin tabla conjunta")
    if ss("alertas_json"):
        c[2].download_button("alertas.json", ss("alertas_json").encode("utf-8"), "alertas.json", "application/json")
    else:
        c[2].caption("sin alertas")
    if ss("last_resp"):
        c[3].download_button("response.json (último run)",
                             json.dumps(ss("last_resp"), ensure_ascii=False, indent=2, default=str).encode("utf-8"),
                             "response.json", "application/json")
    else:
        c[3].caption("sin run")
