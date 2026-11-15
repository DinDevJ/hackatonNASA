"""Adaptador ECG (procesamiento de senal con NeuroKit2 0.3.0 + wfdb 4.3.1). NO es un modelo entrenado.

Uso (con el python de envs/ecg):
    python adapters/ecg/infer.py --request <run_dir>/request.json --response <run_dir>/response.json

Especificacion: CONTRATO.md, seccion "Modulo ECG". Las funciones puras (RR, HRV, regla de ventanas, emparejamiento con
anotaciones, filas normalizadas) estan en adapters/ecg/metricas.py (solo numpy). Aqui: lectura WFDB/CSV, llamadas a
NeuroKit2, anotaciones y artefacto ecg_traza.npz.
TODO es experimental: NADA de esto es diagnostico; la bandera de ritmo irregular NO es un diagnostico de FA.

Historia (v1 -> v2): la v1 usaba Kubios para los latidos irregulares y ventanas de 30 s (nRMSSD + puntos de inflexion)
para la bandera; sobre mitdb 100/201/203 y afdb 04015 dio mala especificidad y Kubios detecto <10 % de los ectopicos
anotados en 201/203. La v2 NO ajusta umbrales a esos registros: usa un criterio RR de prematuridad (principal) y los tres
estadisticos y umbrales publicados de Dash et al. 2009. v2 se eligio DESPUES de ver v1 sobre los mismos registros: sus
cifras sobre 100/201/203/04015 NO son una validacion independiente.

Criterio RR (metodo 3): latido i (pico i) prematuro si rr[i-1] (el RR que termina en el pico i) < ect_fraccion_prematuro x
mediana de los ect_n_previos RR validos anteriores (minimo 4). El indice marcado ES el latido prematuro; el emparejamiento
con anotaciones es EXACTO (distancia 0), por el pico detectado que se empareja con la anotacion.

Kubios (solo comparacion; nk.signal_fixpeaks(method="Kubios", iterative=False), neurokit2 0.3.0, leido en site-packages):
  * _find_artifacts: rr = np.ediff1d(peaks, to_begin=0)/fs, es decir rr[i] = (peaks[i] - peaks[i-1])/fs, el intervalo
    que TERMINA en peaks[i]. Se marca `ectopic_idcs.append(i)` cuando |drrs[i]| > 1 y se cumple eq1/eq2.
  * _correct_misaligned mueve peaks[i]: el indice marcado i es el pico peaks[i], pero el latido prematuro real puede ser
    peaks[i] o peaks[i-1]. Por eso con Kubios el emparejamiento es +-1 latido (metricas.CRITERIO_ECTOPICOS_KUBIOS).

Bandera (metodo 6): estadisticos, umbrales y filtro de ectopicos de Dash et al. 2009 (ver FUENTE_FA y DASH_ARTICULO;
metricas.filtrar_ectopicos_dash), con el filtro aplicado antes de C1-C3 (fa_filtro_ectopicos). v2.1 anade el filtro;
sigue sin implementarse la rama de RR omitidos del articulo (no dice que RR se eliminan).
"""
from __future__ import annotations

import sys
import time
from importlib import metadata
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from core import modalidad, runs  # noqa: E402

import numpy as np  # noqa: E402

sys.path.insert(0, str(Path(__file__).resolve().parent))
import metricas as M  # noqa: E402

MODEL = "ecg"
ADMITIDAS = ["ecg_1d"]
EXT_TABLA = {".csv", ".txt", ".tsv"}
REF_QRS = "qrs (detector automático no auditado)"
TOL_PICO_NOTA = "ventana de emparejamiento de picos R de ANSI/AAMI EC57"

OPCIONES_DEFECTO = {
    "fs": 0.0, "canal": 0, "canal_nombre": "", "csv_columna": "", "inicio_s": 0.0, "duracion_s": 0.0,
    "traza_max_s": 1800.0, "rr_min_s": 0.25, "rr_max_s": 3.0, "min_rr_hrv": 20,
    "ect_fraccion_prematuro": 0.80, "ect_n_previos": 8, "fa_latidos_segmento": 128, "fa_paso_latidos": 32,
    "fa_n_atipicos": 8, "fa_umbral_nrmssd": 0.10, "fa_tpr_min": 0.54, "fa_tpr_max": 0.77, "fa_umbral_entropia": 0.70,
    "fa_filtro_ectopicos": True, "fa_min_ventanas_consecutivas": 2, "tolerancia_pico_ms": 150.0,
    "prueba_carga_dummy": False,
}
TIPOS = {"fs": float, "canal": int, "canal_nombre": str, "csv_columna": str, "inicio_s": float, "duracion_s": float,
         "traza_max_s": float, "rr_min_s": float, "rr_max_s": float, "min_rr_hrv": int,
         "ect_fraccion_prematuro": float, "ect_n_previos": int, "fa_latidos_segmento": int, "fa_paso_latidos": int,
         "fa_n_atipicos": int, "fa_umbral_nrmssd": float, "fa_tpr_min": float, "fa_tpr_max": float,
         "fa_umbral_entropia": float, "fa_filtro_ectopicos": bool, "fa_min_ventanas_consecutivas": int,
         "tolerancia_pico_ms": float, "prueba_carga_dummy": bool}

# Delineacion por bloques (el DWT remuestrea a 2000 Hz y calcula 9 escalas: en registros de horas no cabe en memoria).
# NO es una opcion del contrato: se delinea SIEMPRE todo el segmento, en bloques con margen de contexto.
BLOQUE_DELINEACION_S = 600.0
MARGEN_DELINEACION_S = 5.0

FUENTE_FA = (
    "Dash S, Chon KH, Lu S, Raeder EA. Automatic real time detection of atrial fibrillation. Ann Biomed Eng "
    "2009;37(9):1701-9, doi:10.1007/s10439-009-9740-z; texto completo leido: "
    "https://biosignal.uconn.edu/wp-content/uploads/sites/2503/2018/09/10_Dash_2009_AnnalsBME.pdf. "
    "LO QUE FIJA EL ARTICULO y se implementa: segmentos de 128 intervalos RR (Introduccion p.1702: 'optimal segment length "
    "is 128 RR intervals'; Tabla 1 y Ec. 5, a_opt = [128, 50 %, 0.1, 99.9 %, 0.7]); (C1) RMSSD (Ec. 1) comparada con la "
    "MEDIA de RR, umbral constante 'RMSSD > 0.1 * meanRR' (seccion RMSSD p.1702, Tabla 1); (C2) razon de puntos de "
    "inflexion TPR (seccion TPR p.1702: esperados (2l-4)/3, desviacion sqrt((16l-29)/90) en serie aleatoria) dentro de "
    "0.54 < TPR < 0.77 (Tabla 1; TprThresh = percentil 99.9, Ec. 5); (C3) entropia de Shannon (seccion SE p.1703, "
    "Ec. 2-3): se descartan los 8 RR mas largos y los 8 mas cortos (16 atipicos), los demas se reparten en 16 clases "
    "equiespaciadas entre el minimo y el maximo restantes, p(i)=N_clase/(l-N_atipicos), SE normalizada por log 16, "
    "umbral SE > 0.7 (Tabla 1); clasificacion = AND de las tres (p.1703). Un segmento de verdad es AF si >= 50 % de "
    "el esta anotado como AF (PercThresh, p.1702/1704). "
    "LO QUE EL ARTICULO NO FIJA o no se implementa (decision propia, no del articulo): (a) los atipicos solo se descartan "
    "para la entropia (el texto solo lo dice en esa seccion); RMSSD y TPR se calculan con todos los RR validos del "
    "segmento; (b) TPR = puntos de inflexion/(n-2) (el articulo da el numero esperado, no escribe la division; 0.54-0.77 "
    "es el rango de la Tabla 1 para l=128 y no se reescala si cambia fa_latidos_segmento); (c) 128 RR por segmento "
    "(la Tabla 1 dice 'beats' y el texto 'RR intervals'); (d) paso entre segmentos fa_paso_latidos=32 (el articulo prueba "
    "l en pasos de 32 pero clasifica segmentos); (e) segmento evaluable solo si <= 10 % de sus RR son invalidos; "
    "las estadisticas usan los RR validos en orden; (f) registro = 1 si >= 2 segmentos marcados consecutivos; "
    "(g) los detalles del filtro de ectopicos que el articulo no fija (ver FILTRO); (h) umbrales y bandera NO se "
    "ajustaron a los registros probados. Criterio RR de prematuridad (20 %): convencion habitual del 'filtro del 20 %' "
    "en HRV, experimental. FILTRO DE ECTOPICOS (seccion 'Filtering of Ectopic Beats', p.1703, y pie de la Fig. 1, p.1704), "
    "citas literales: 'we compute the ratio RR[i]/RR[i-1] for each RR in the time series'; 'we identify diverse ectopic "
    "beats ... by searching for RR sequences which satisfy the conditions RR[i]/RR[i-1] < Perc1 and RR[i+1]/RR[i] > Perc99 "
    "and RR[i+1]/RR[i+2] > Perc25 where Perc1, Perc99 and Perc25 denote the first, 99th and 25th percentiles'; 'we label a "
    "beat as ectopic when the preceding RR interval ratio belongs to the shortest 1% and the RR ratio following it "
    "belongs to the longest 1% of all RR interval ratios'; 'When an ectopic beat is encountered, it is excluded from "
    "further analysis along with its compensatory pause'; 'After removal of ectopic beats, the complete RR interval series "
    "is linked together yielding a continuous RR interval sequence free of ectopic beats on which the analysis is carried "
    "out' (p.1703); Fig. 1 (p.1704): '(c) The ratio of each RR interval to the one occurring just after it ... If it "
    "exceeded the Perc25 threshold (dashed line: value of 0.9), the beat was confirmed as an ectopic beat'; '(d) ... all such "
    "ectopic beats and compensatory pauses were deleted'. IMPLEMENTADO (metricas.filtrar_ectopicos_dash): se eliminan RR[i] "
    "y RR[i+1] del latido ectopico y la serie restante se enlaza antes de C1-C3. DECISION PROPIA, no del articulo: "
    "(i) el articulo dice 'all RR interval ratios' sin decir si son los del segmento de 128 RR o los del registro: se usan "
    "los del segmento que se clasifica; (ii) Perc25 se calcula sobre la serie de cocientes RR[j]/RR[j+1] (lo sugiere el pie "
    "de la Fig. 1c, el texto no lo dice); (iii) percentil lineal de numpy; (iv) solo se evaluan i con RR[i-1..i+2] "
    "validos. NO IMPLEMENTADO: la condicion de RR omitidos (RR[i]/RR[i-1] > Perc99 y RR[i+1]/RR[i] < Perc1) porque el "
    "articulo dice 'We use the above approach to eliminate these artifacts' pero no dice que RR se eliminan. Kubios/"
    "Lipponen no forma parte de la bandera; Kubios: Lipponen JA, Tarvainen MP. J Med Eng Technol 2019;43(3):173-181, "
    "doi:10.1080/03091902.2019.1640306.")

DASH_ARTICULO = {
    "referencia": "Dash et al. 2009, Ann Biomed Eng 37(9):1701-9, doi:10.1007/s10439-009-9740-z",
    "segmento": "128 RR (Introduccion p.1702; Tabla 1; Ec. 5)",
    "atipicos": "8 mas largos + 8 mas cortos, solo para la entropia (seccion SE p.1703)",
    "tpr": "puntos de inflexion; esperados (2l-4)/3, sd sqrt((16l-29)/90) (seccion TPR p.1702); limites 0.54-0.77 (Tabla 1)",
    "entropia": "16 clases equiespaciadas, p=N/(l-16), normalizada por log 16, umbral 0.7 (Ec. 2-3, Tabla 1)",
    "rmssd": "RMSSD (Ec. 1) / media(RR) > 0.1 (seccion RMSSD p.1702, Tabla 1)",
    "filtro_ectopicos": "RR[i]/RR[i-1] < Perc1 y RR[i+1]/RR[i] > Perc99 y RR[i+1]/RR[i+2] > Perc25; se excluyen RR[i] y RR[i+1] "
                        "y la serie se enlaza (seccion Filtering of Ectopic Beats, p.1703; pie Fig. 1, p.1704)",
    "filtro_decisiones_propias": ["percentiles sobre los cocientes del segmento de 128 RR (el articulo dice 'all RR interval "
                                  "ratios')", "Perc25 sobre la serie RR[j]/RR[j+1]", "percentil lineal de numpy",
                                  "solo i con RR[i-1..i+2] validos"],
    "no_implementado": "condicion de RR omitidos (RR[i]/RR[i-1] > Perc99 y RR[i+1]/RR[i] < Perc1): el articulo no dice que RR se eliminan",
    "decisiones_propias": ["TPR = TP/(n-2)", "128 RR por segmento", "paso 32", "evaluable si <=10 % RR invalidos",
                           "registro=1 con >=2 segmentos marcados consecutivos", "RMSSD y TPR con todos los RR restantes tras el filtro"],
}

HISTORIA = ("v1 (Kubios + ventanas 30 s nRMSSD/puntos de inflexion) dio mala especificidad en 100/201/203/04015; v2 usa "
            "criterio RR + estadisticos, umbrales y filtro de ectopicos de Dash 2009 (v2.1) sin ajustarlos a esos registros, pero se eligio despues "
            "de ver v1 sobre los mismos registros: sus cifras NO son una validacion independiente.")

METODOS = {
    "historia": HISTORIA,
    "1_picos_r": "nk.ecg_clean(method='neurokit') + nk.ecg_peaks(method='neurokit', correct_artifacts=False). "
                 "NeuroKit2: Makowski D et al., Behav Res Methods 2021 (el detector 'neurokit' no esta publicado por separado).",
    "2_rr_validos": "RR valido si rr_min_s <= RR <= rr_max_s; FC = 60 / media(RR validos).",
    "3_latidos_irregulares": "PRINCIPAL (criterio RR, experimental): latido i prematuro si RR previo < ect_fraccion_prematuro "
                             "(0.80) x mediana de los ect_n_previos (8) RR validos anteriores (minimo 4; los primeros latidos "
                             "no se evaluan). No distingue supraventricular de ventricular; en FA marca muchos latidos. "
                             "Solo comparacion: clase 'ectopic' de nk.signal_fixpeaks(method='Kubios', iterative=False) "
                             "(Lipponen & Tarvainen 2019) con longshort/missed/extra.",
    "4_hrv": "RMSSD y SDNN (ddof=1) sobre el segmento con NN = RR validos sin el RR previo y el posterior de cada latido "
             "prematuro (criterio RR); tambien sin filtrar y por ventanas de 300 s; minimo min_rr_hrv intervalos.",
    "5_pr_qt_qtc": "nk.ecg_delineate(method='dwt') (Martinez et al. 2004, IEEE Trans Biomed Eng 51(4):570-581, en el que se "
                   "basa el metodo DWT de NeuroKit2) en bloques de %d s con margen de %d s; PR = R_onset - P_onset; "
                   "QT = T_offset - R_onset; QTc Bazett = QT/sqrt(RR previo en s); medianas por latido; minimo 5 latidos; "
                   "NaN ignorados; delineacion no validada aqui." % (BLOQUE_DELINEACION_S, MARGEN_DELINEACION_S),
    "6_bandera_fa": "EXPERIMENTAL: " + M.FORMULA_BANDERA + ". Estadisticos, umbrales y filtro de ectopicos de Dash et al. "
                    "2009 (ver bandera_fa.fuente; sin su rama de RR omitidos); NO validada clinicamente; no es diagnostico.",
}


# ----------------------------------------------------------------------------------------------------- opciones
def opciones_efectivas(opts: dict) -> dict:
    out = {}
    for k, d in OPCIONES_DEFECTO.items():
        v = opts.get(k, d)
        try:
            out[k] = bool(v) if TIPOS[k] is bool else TIPOS[k](v if v is not None else d)
        except (TypeError, ValueError):
            raise ValueError(f"opcion {k!r}={v!r} no es de tipo {TIPOS[k].__name__}")
    desconocidas = sorted(set(opts) - set(OPCIONES_DEFECTO) - {"device"})
    out["_desconocidas"] = desconocidas
    if out["rr_min_s"] >= out["rr_max_s"] or out["rr_min_s"] <= 0:
        raise ValueError("rr_min_s debe ser > 0 y menor que rr_max_s")
    if out["min_rr_hrv"] < 2 or out["fa_min_ventanas_consecutivas"] < 1 or out["fa_paso_latidos"] < 1:
        raise ValueError("min_rr_hrv >= 2, fa_min_ventanas_consecutivas >= 1 y fa_paso_latidos >= 1")
    if not (0 < out["ect_fraccion_prematuro"] < 1) or out["ect_n_previos"] < 4:
        raise ValueError("0 < ect_fraccion_prematuro < 1 y ect_n_previos >= 4")
    if out["fa_n_atipicos"] < 0 or out["fa_latidos_segmento"] < 2 * out["fa_n_atipicos"] + 16 or out["fa_tpr_min"] >= out["fa_tpr_max"]:
        raise ValueError("fa_latidos_segmento >= 2*fa_n_atipicos + 16 (16 clases de entropia) y fa_tpr_min < fa_tpr_max")
    if out["inicio_s"] < 0 or out["duracion_s"] < 0 or out["tolerancia_pico_ms"] <= 0 or out["traza_max_s"] < 0:
        raise ValueError("inicio_s, duracion_s y traza_max_s no pueden ser negativos; tolerancia_pico_ms > 0")
    return out


def versiones() -> dict:
    v = {"python": sys.version.split()[0]}
    for pk, nombre in (("neurokit2", "neurokit2"), ("wfdb", "wfdb"), ("numpy", "numpy"), ("scipy", "scipy"),
                       ("PyWavelets", "pywt"), ("pandas", "pandas")):
        try:
            v[nombre] = metadata.version(pk)
        except metadata.PackageNotFoundError:
            v[nombre] = None
    return v


# ------------------------------------------------------------------------------------------------------ lectura
def _localizar(inp: Path) -> tuple[str, Path]:
    """('wfdb', ruta_base_sin_extension) o ('tabla', archivo)."""
    if inp.is_dir():
        heas = sorted(inp.rglob("*.hea"))
        if len(heas) == 1:
            return "wfdb", heas[0].with_suffix("")
        if len(heas) > 1:
            raise ValueError(f"la carpeta tiene {len(heas)} cabeceras .hea; se espera un solo registro")
        tablas = sorted(x for x in inp.rglob("*") if x.is_file() and x.suffix.lower() in EXT_TABLA)
        if len(tablas) == 1:
            return "tabla", tablas[0]
        raise ValueError("la carpeta no contiene un registro WFDB (.hea) ni una unica tabla CSV/TXT/TSV")
    if inp.suffix.lower() == ".hea":
        return "wfdb", inp.with_suffix("")
    if inp.suffix.lower() in EXT_TABLA:
        return "tabla", inp
    raise ValueError(f"formato de entrada no admitido para ECG: {inp.name}")


def _rellenar_nan(x: np.ndarray, warnings: list, donde: str) -> np.ndarray:
    nan = ~np.isfinite(x)
    if nan.any():
        warnings.append(f"{donde}: {int(nan.sum())} muestras no finitas rellenadas por interpolacion lineal")
        idx = np.arange(x.size)
        if nan.all():
            raise ValueError("la senal no tiene ninguna muestra finita")
        x = x.copy()
        x[nan] = np.interp(idx[nan], idx[~nan], x[~nan])
    return x


def leer_wfdb(base: Path, o: dict, warnings: list) -> dict:
    import wfdb
    h = wfdb.rdheader(str(base))
    fs = float(h.fs)
    if o["fs"] > 0 and abs(o["fs"] - fs) > 1e-9:
        warnings.append(f"options.fs={o['fs']} se ignora para WFDB: el .hea declara fs={fs} Hz (las anotaciones usan esa "
                        "base de tiempo)")
    nombres = list(h.sig_name)
    if o["canal_nombre"]:
        if o["canal_nombre"] not in nombres:
            raise ValueError(f"canal_nombre={o['canal_nombre']!r} no esta en el registro (canales: {nombres})")
        ch = nombres.index(o["canal_nombre"])
    else:
        ch = o["canal"]
        if not (0 <= ch < len(nombres)):
            raise ValueError(f"canal={ch} fuera de rango (el registro tiene {len(nombres)} canales: {nombres})")
    i0 = int(round(o["inicio_s"] * fs))
    if i0 >= h.sig_len:
        raise ValueError(f"inicio_s={o['inicio_s']} esta fuera del registro (dura {h.sig_len / fs:.1f} s)")
    i1 = h.sig_len if o["duracion_s"] <= 0 else min(h.sig_len, i0 + int(round(o["duracion_s"] * fs)))
    r = wfdb.rdrecord(str(base), sampfrom=i0, sampto=i1, channels=[ch], physical=True)
    x = np.asarray(r.p_signal[:, 0], dtype=np.float64)
    x = _rellenar_nan(x, warnings, "senal WFDB")
    return {"formato": "wfdb", "senal": x, "fs": fs, "unidad": (h.units[ch] if h.units else None) or "unidad_no_declarada",
            "canal_indice": ch, "canal_nombre": nombres[ch], "canales": nombres, "i0": i0, "i1": i1,
            "n_total": int(h.sig_len), "base": base, "registro": base.name}


def _es_tiempo(nombre: str) -> bool:
    n = str(nombre).strip().lower()
    return n in {"time", "t", "tiempo", "seconds", "sec", "s", "timestamp", "sample", "samples", "index", "muestra",
                 "idx", "ms", "time_s", "time_ms", "tiempo_s", "tiempo_ms", "unnamed: 0"} or n.startswith(("time", "tiempo"))


def _separador(archivo: Path) -> str:
    """Separador autodetectado (csv.Sniffer sobre las primeras lineas; sin separador claro -> una sola columna)."""
    import csv
    with open(archivo, "r", encoding="utf-8-sig", errors="replace") as f:
        muestra = "".join(f.readline() for _ in range(20))
    try:
        sep = csv.Sniffer().sniff(muestra, delimiters=",;\t |").delimiter
    except csv.Error:
        return ","
    return r"\s+" if sep == " " else sep


def leer_tabla(archivo: Path, o: dict, warnings: list) -> dict:
    import pandas as pd
    if o["fs"] <= 0:
        runs_msg = "no se adivina la frecuencia de muestreo: usa options.fs / -Fs"
        raise _Rechazo(runs_msg + " (en una tabla CSV/TXT/TSV la frecuencia de muestreo es obligatoria y > 0)")
    kw = dict(sep=_separador(archivo), engine="python")
    primera = pd.read_csv(archivo, header=None, nrows=1, **kw)
    sin_cabecera = all(pd.to_numeric(primera.iloc[0], errors="coerce").notna())
    df = pd.read_csv(archivo, header=None if sin_cabecera else 0, **kw)
    if sin_cabecera:
        df.columns = [f"col{i}" for i in range(df.shape[1])]
        warnings.append("la tabla no tiene cabecera: columnas nombradas col0, col1, ...")
    num = [c for c in df.columns if pd.to_numeric(df[c], errors="coerce").notna().mean() > 0.9]
    sel = o["csv_columna"].strip()
    if sel:
        if sel in df.columns:
            col = sel
        elif sel.lstrip("-").isdigit() and -df.shape[1] <= int(sel) < df.shape[1]:
            col = df.columns[int(sel)]
        else:
            raise ValueError(f"csv_columna={sel!r} no existe (columnas: {list(df.columns)})")
    else:
        cand = [c for c in num if not _es_tiempo(c)]
        if not cand:
            raise ValueError(f"no hay columna numerica que no sea de tiempo (columnas: {list(df.columns)})")
        col = cand[0]
    x = pd.to_numeric(df[col], errors="coerce").to_numpy(dtype=np.float64)
    fs = float(o["fs"])
    i0 = int(round(o["inicio_s"] * fs))
    if i0 >= x.size:
        raise ValueError(f"inicio_s={o['inicio_s']} esta fuera de la tabla (dura {x.size / fs:.1f} s a fs={fs})")
    i1 = x.size if o["duracion_s"] <= 0 else min(x.size, i0 + int(round(o["duracion_s"] * fs)))
    seg = _rellenar_nan(x[i0:i1], warnings, f"columna {col!r}")
    return {"formato": "tabla", "senal": seg, "fs": fs, "unidad": "unidad_no_declarada", "canal_indice": list(df.columns).index(col),
            "canal_nombre": str(col), "canales": [str(c) for c in df.columns], "i0": i0, "i1": i1, "n_total": int(x.size),
            "base": None, "registro": archivo.stem}


class _Rechazo(Exception):
    pass


# --------------------------------------------------------------------------------------------- anotaciones
def leer_anotaciones(base: Path | None, d: dict, warnings: list) -> dict | None:
    """Anotaciones junto al registro (.atr y, si no trae latidos, .qrs). Devuelve None si no hay ninguna."""
    if base is None:
        return None
    import wfdb
    atr = base.with_suffix(".atr").is_file()
    qrs = base.with_suffix(".qrs").is_file()
    if not atr and not qrs:
        return None
    s_all = np.zeros(0, dtype=np.int64)
    notas_all: list = []
    simb_atr: list = []
    if atr:
        a = wfdb.rdann(str(base), "atr")
        s_all = np.asarray(a.sample, dtype=np.int64)
        simb_atr = list(a.symbol)
        notas_all = list(a.aux_note)
    i0, i1 = d["i0"], d["i1"]
    lat_s, lat_y = M.recortar_latidos(s_all, simb_atr, i0, i1) if atr else (np.zeros(0, np.int64), np.zeros(0, "<U2"))
    ref = "atr"
    if lat_s.size == 0 and qrs:
        q = wfdb.rdann(str(base), "qrs")
        lat_s, lat_y = M.recortar_latidos(np.asarray(q.sample, dtype=np.int64), list(q.symbol), i0, i1)
        ref = REF_QRS
        warnings.append("el .atr no trae latidos en el segmento: los latidos de referencia vienen del .qrs, un detector "
                        "automatico no auditado (no es una anotacion manual)")
    ritmos = M.intervalos_ritmo(s_all, notas_all, i0, i1, d["fs"]) if atr else []
    return {"ref": ref, "lat_s": lat_s, "lat_y": lat_y, "ritmos": ritmos, "atr": atr, "qrs": qrs}


# ---------------------------------------------------------------------------------------------- NeuroKit2
def _delinear(clean: np.ndarray, picos: np.ndarray, fs: float, warnings: list) -> dict:
    """nk.ecg_delineate(method='dwt') por bloques. Devuelve arrays (len = n picos, NaN si no hay punto)."""
    import neurokit2 as nk
    n = picos.size
    claves = ("ECG_P_Onsets", "ECG_R_Onsets", "ECG_T_Offsets")
    res = {k: np.full(n, np.nan) for k in claves}
    blq = int(BLOQUE_DELINEACION_S * fs)
    mar = int(MARGEN_DELINEACION_S * fs)
    borde = int(1.0 * fs)
    n_bloques = fallos = 0
    for b0 in range(0, clean.size, blq):
        b1 = min(clean.size, b0 + blq)
        e0, e1 = max(0, b0 - mar), min(clean.size, b1 + mar)
        # nk.ecg_delineate descarta de cada lista los valores <= 0 (ecg_delineate.py: `x > 0 or np.isnan(x)`), lo que desalinea
        # los latidos cuyo inicio de P cae antes del primer indice del bloque. Por eso solo se pasan los picos a >= 1 s de
        # los bordes del bloque; en los bloques interiores el margen de 5 s lo compensa, y solo los latidos a < 1 s del
        # inicio/fin del segmento quedan sin delinear (NaN).
        sel = np.nonzero((picos >= e0 + borde) & (picos < e1 - borde))[0]
        nucleo = (picos[sel] >= b0) & (picos[sel] < b1)
        if sel.size < 3 or not nucleo.any():
            continue
        n_bloques += 1
        try:
            _, w = nk.ecg_delineate(clean[e0:e1], (picos[sel] - e0).astype(int), sampling_rate=int(round(fs)),
                                    method="dwt", show=False)
            for k in claves:
                v = np.asarray(w[k], dtype=np.float64)
                if v.size != sel.size:
                    raise ValueError(f"{k}: {v.size} valores para {sel.size} picos")
                res[k][sel[nucleo]] = (v + e0)[nucleo]
        except Exception as e:  # noqa: BLE001
            fallos += 1
            warnings.append(f"delineacion: bloque {b0 / fs:.0f}-{b1 / fs:.0f} s fallo ({type(e).__name__}: {e}); "
                            "sus latidos quedan como NaN (sin dato)")
    res["bloques"] = n_bloques
    res["bloques_fallidos"] = fallos
    return res


def analizar(x: np.ndarray, fs: float, o: dict, warnings: list) -> dict:
    import neurokit2 as nk
    t = {}
    t0 = time.perf_counter()
    clean = nk.ecg_clean(x, sampling_rate=fs, method="neurokit")
    t["limpieza"] = time.perf_counter() - t0
    t0 = time.perf_counter()
    _, info = nk.ecg_peaks(clean, sampling_rate=fs, method="neurokit", correct_artifacts=False)
    picos = np.unique(np.asarray(info["ECG_R_Peaks"], dtype=np.int64))
    t["picos_r"] = time.perf_counter() - t0
    dur = x.size / fs
    rr = M.rr_intervalos(picos, fs)
    ok = M.rr_validos(rr, o["rr_min_s"], o["rr_max_s"])

    # 3. latidos irregulares: criterio RR (principal) + Kubios (solo comparacion)
    t0 = time.perf_counter()
    pr_ = M.latidos_prematuros(rr, ok, o["ect_fraccion_prematuro"], o["ect_n_previos"], 4)
    prem = pr_["indices"]
    irr = {"n": int(prem.size) if pr_["n_evaluados"] > 0 else None,
           "fraccion": M._f(M.razon(prem.size, pr_["n_evaluados"]), 5),
           "n_evaluados": pr_["n_evaluados"], "ect_fraccion_prematuro": o["ect_fraccion_prematuro"],
           "ect_n_previos": o["ect_n_previos"], "criterio": M.CRITERIO_ECTOPICOS_RR,
           "motivo": None if pr_["n_evaluados"] else "ningun latido evaluable (se necesitan >= 4 RR validos previos)",
           "n_ectopic_kubios": None, "longshort": None, "missed": None, "extra": None, "kubios_motivo": None}
    ect_k = np.zeros(0, dtype=np.int64)
    if picos.size >= 6:
        info_fx, _ = nk.signal_fixpeaks(picos, sampling_rate=fs, method="Kubios", iterative=False)
        ect_k = np.asarray(info_fx["ectopic"], dtype=np.int64)
        irr.update({"n_ectopic_kubios": int(ect_k.size), "longshort": len(info_fx["longshort"]),
                    "missed": len(info_fx["missed"]), "extra": len(info_fx["extra"])})
    else:
        irr["kubios_motivo"] = f"solo {picos.size} picos R detectados; se necesitan >= 6"
    irr["kubios_criterio_indice"] = M.CRITERIO_ECTOPICOS_KUBIOS
    t["fixpeaks"] = time.perf_counter() - t0

    # 2/4. FC y HRV
    fc = {"valor_bpm": M._f(M.frecuencia_cardiaca(rr, ok), 3), "n_picos": int(picos.size), "n_rr": int(rr.size),
          "n_rr_validos": int(ok.sum()), "rr_min_s": o["rr_min_s"], "rr_max_s": o["rr_max_s"],
          "motivo": None if ok.any() else "ningun RR valido"}
    nn = M.mascara_nn(ok, prem, picos.size)
    hf = M.hrv_basico(rr, nn, o["min_rr_hrv"])
    hs = M.hrv_basico(rr, ok, o["min_rr_hrv"])
    hrv = {"min_rr_hrv": o["min_rr_hrv"], "filtrado": {k: M._f(v, 3) if isinstance(v, float) else v for k, v in hf.items()},
           "sin_filtrar": {k: M._f(v, 3) if isinstance(v, float) else v for k, v in hs.items()},
           "ventanas_300s": M.hrv_ventanas(picos, fs, rr, ok, nn, dur, o["min_rr_hrv"], 300.0),
           "nota_ventanas": "solo ventanas completas de 300 s desde el inicio del segmento; tiempos relativos al inicio"}

    # 6. bandera (Dash 2009)
    vent = M.ventanas_bandera(picos, fs, rr, ok, o["fa_latidos_segmento"], o["fa_paso_latidos"], o["fa_umbral_nrmssd"],
                              o["fa_tpr_min"], o["fa_tpr_max"], o["fa_umbral_entropia"], o["fa_n_atipicos"],
                              o["fa_filtro_ectopicos"])
    seg = M.bandera_segmento(vent, o["fa_min_ventanas_consecutivas"])
    bandera = {"etiqueta": M.ETIQUETA_BANDERA, "formula": M.FORMULA_BANDERA,
               "parametros": {k: o[k] for k in ("fa_latidos_segmento", "fa_paso_latidos", "fa_n_atipicos",
                                                "fa_umbral_nrmssd", "fa_tpr_min", "fa_tpr_max", "fa_umbral_entropia",
                                                "fa_filtro_ectopicos", "fa_min_ventanas_consecutivas", "rr_min_s", "rr_max_s")},
               "fuente": FUENTE_FA, **seg, "ventanas": vent,
               "nota_ventanas": "segmentos de fa_latidos_segmento RR consecutivos con paso fa_paso_latidos; t0_s/t1_s = "
                                "tiempo (relativo al inicio del segmento analizado) del primer y del ultimo latido; "
                                "marcada=None si no evaluable (>10 % de RR invalidos); n_rr = RR usados tras el filtro de ectopicos"}

    # 5. delineacion
    t0 = time.perf_counter()
    inter = {"delineacion": {"metodo": "nk.ecg_delineate(method='dwt')", "bloque_s": BLOQUE_DELINEACION_S,
                             "margen_s": MARGEN_DELINEACION_S, "cobertura": "segmento completo, por bloques"}}
    if picos.size >= 5:
        dl = _delinear(clean, picos, fs, warnings)
        inter["delineacion"].update({"bloques": dl["bloques"], "bloques_fallidos": dl["bloques_fallidos"]})
        inter.update(M.intervalos_pr_qt(picos, dl["ECG_P_Onsets"], dl["ECG_R_Onsets"], dl["ECG_T_Offsets"], fs,
                                        o["rr_min_s"], o["rr_max_s"], 5))
    else:
        inter["motivo"] = f"solo {picos.size} picos R; no se delinea"
    t["delineacion"] = time.perf_counter() - t0
    if (bandera["valor"] == 1) or ((irr.get("fraccion") or 0) >= M.FRACCION_IRREGULARES_AVISO):
        inter["aviso"] = ("ritmo irregular (bandera=1 o >= %.0f%% de latidos prematuros por criterio RR): la delineacion no es fiable "
                          "(en fibrilacion auricular no hay onda P); PR/QTc con quality de aviso" %
                          (100 * M.FRACCION_IRREGULARES_AVISO))
    return {"clean": clean, "picos": picos, "ect": prem, "ect_kubios": ect_k, "rr": rr, "ok": ok, "nn": nn, "irr": irr, "fc": fc, "hrv": hrv,
            "bandera": bandera, "inter": inter, "vent": vent, "tiempos": t, "dur": dur}


def comparar(d: dict, a: dict | None, an: dict, o: dict) -> dict | None:
    """comparacion_anotaciones (CONTRATO.md)."""
    if a is None:
        return None
    fs = d["fs"]
    picos, ect = an["picos"], an["ect"]
    comp = {"archivos": {"atr": a["atr"], "qrs": a["qrs"]}, "latidos_referencia": a["ref"], "n_latidos_referencia": int(a["lat_s"].size)}
    comp["picos_r"] = M.comparar_picos(a["lat_s"], picos, fs, o["tolerancia_pico_ms"], a["ref"])
    comp["picos_r"]["nota_tolerancia"] = TOL_PICO_NOTA
    if a["ref"] == "atr":
        comp["ectopicos"] = M.comparar_ectopicos(picos, ect, a["lat_s"], a["lat_y"], fs, o["tolerancia_pico_ms"], 0,
                                                 M.CRITERIO_ECTOPICOS_RR)
        comp["ectopicos_kubios"] = M.comparar_ectopicos(picos, an["ect_kubios"], a["lat_s"], a["lat_y"], fs,
                                                        o["tolerancia_pico_ms"], 1, M.CRITERIO_ECTOPICOS_KUBIOS)
    else:
        comp["ectopicos"] = None
        comp["ectopicos_kubios"] = None
        comp["ectopicos_motivo"] = ("la referencia de latidos es un detector automatico (.qrs) sin clasificacion de "
                                    "ectopicos: no hay ectopicos anotados con que comparar")
    if a["ritmos"]:
        comp["fa"] = M.comparar_fa(an["vent"], a["ritmos"], an["dur"], an["bandera"])
    else:
        comp["fa"] = None
        comp["fa_motivo"] = "no hay anotaciones de ritmo (aux_note que empieza por '(') en el segmento"
    ann_ect = M.indices_anotados_ectopicos(a["lat_s"], a["lat_y"]) if a["ref"] == "atr" else np.zeros(0, dtype=np.int64)
    o_args = (fs, o["rr_min_s"], o["rr_max_s"], o["min_rr_hrv"])
    det = M.resumen_fc_hrv(picos, *o_args, irregulares=ect)
    ann = M.resumen_fc_hrv(a["lat_s"], *o_args, irregulares=ann_ect)
    comp["fc_hrv"] = M.comparar_fc_hrv(det, ann)
    comp["fc_hrv"]["nota"] = ("filtrado: detectados = sin el RR previo y posterior de los latidos prematuros (criterio RR); anotados = sin ectopicos anotados "
                              + ("(V, A, a J S F e j E)" if a["ref"] == "atr" else "(no aplica: referencia .qrs sin clases)"))
    return comp


def guardar_traza(run_dir: Path, d: dict, a: dict | None, an: dict, o: dict) -> Path:
    fs = d["fs"]
    n_traza = int(o["traza_max_s"] * fs)
    x = d["senal"][:n_traza].astype(np.float32)
    vent = an["vent"]
    ritmos = a["ritmos"] if a else []
    ruta = run_dir / "ecg_traza.npz"
    np.savez_compressed(
        ruta, fs=np.float64(fs), t0_s=np.float64(d["i0"] / fs), senal=x, unidad=np.array(str(d["unidad"])),
        picos_r=an["picos"].astype(np.int64), picos_irregulares=an["picos"][an["ect"]].astype(np.int64) if an["ect"].size else np.zeros(0, np.int64),
        ann_muestras=(a["lat_s"].astype(np.int64) if a else np.zeros(0, np.int64)),
        ann_simbolos=(a["lat_y"].astype("<U2") if a else np.zeros(0, "<U2")),
        ritmo_inicio_s=np.array([r[0] for r in ritmos], dtype=np.float64),
        ritmo_fin_s=np.array([r[1] for r in ritmos], dtype=np.float64),
        ritmo_etiqueta=np.array([r[2] for r in ritmos], dtype="<U32") if ritmos else np.zeros(0, "<U32"),
        vent_t0_s=np.array([w["t0_s"] for w in vent], dtype=np.float64),
        vent_t1_s=np.array([w["t1_s"] for w in vent], dtype=np.float64),
        vent_marcada=np.array([np.nan if w["marcada"] is None else float(w["marcada"]) for w in vent], dtype=np.float64))
    return ruta


# ------------------------------------------------------------------------------------------------------- run
def run(request, resp):
    opts = request.get("options") or {}
    o = opciones_efectivas(opts)
    desconocidas = o.pop("_desconocidas")
    dummy = o["prueba_carga_dummy"]
    inp = request.get("input_path")
    declarada = request.get("declared_modality") or "desconocida"
    t_ini = time.perf_counter()
    tiempos = {}

    if inp and runs.resolve(inp).exists():
        val = modalidad.validar(runs.resolve(inp), declarada, ADMITIDAS, "ECG (NeuroKit2)")
        resp["input"]["modality"] = val["modality"]
        resp["warnings"].extend(val["warnings"])
        if not val["ok"]:
            runs.rechazar(resp, val["motivo"])
            return
    elif not dummy:
        resp["status"] = "error"
        resp["message"] = f"No existe la entrada: {inp!r}"
        return
    if desconocidas:
        resp["warnings"].append(f"opciones desconocidas ignoradas: {desconocidas}")

    resp["device"] = "cpu"
    resp["config"].update({
        "opciones_efectivas": o, "versiones": versiones(), "metodos": METODOS, "historia": HISTORIA, "bandera_fa_articulo": DASH_ARTICULO, "aviso": M.AVISO,
        "algoritmo": "procesamiento de senal (sin pesos, sin torch)",
        "delineacion": {"bloque_s": BLOQUE_DELINEACION_S, "margen_s": MARGEN_DELINEACION_S}})

    # ---- lectura
    t0 = time.perf_counter()
    if dummy:
        import neurokit2 as nk
        x = nk.ecg_simulate(duration=60, sampling_rate=250, random_state=42)
        d = {"formato": "simulado", "senal": np.asarray(x, dtype=np.float64), "fs": 250.0, "unidad": "unidad_arbitraria_simulada",
             "canal_indice": 0, "canal_nombre": "nk.ecg_simulate", "canales": ["nk.ecg_simulate"], "i0": 0, "i1": 15000,
             "n_total": 15000, "base": None, "registro": "ecg_simulate_60s_250Hz_seed42"}
        resp["random_load_test"] = True
        resp["warnings"].append("senal sintetica nk.ecg_simulate(duration=60, sampling_rate=250, random_state=42): solo "
                                "prueba de carga; no es un resultado")
    else:
        try:
            tipo, ruta = _localizar(runs.resolve(inp))
            d = leer_wfdb(ruta, o, resp["warnings"]) if tipo == "wfdb" else leer_tabla(ruta, o, resp["warnings"])
        except _Rechazo as e:
            runs.rechazar(resp, str(e))
            return
    tiempos["lectura"] = time.perf_counter() - t0
    fs = d["fs"]
    if fs <= 0:
        runs.rechazar(resp, "no se adivina la frecuencia de muestreo: usa options.fs / -Fs")
        return
    x = d["senal"]
    dur = x.size / fs
    if dur < 5:
        resp["status"] = "error"
        resp["message"] = f"segmento de {dur:.2f} s demasiado corto para detectar picos R (minimo 5 s)"
        return
    d["senal"] = x

    # ---- analisis
    an = analizar(x, fs, o, resp["warnings"])
    tiempos.update({k: round(v, 3) for k, v in an["tiempos"].items()})

    t0 = time.perf_counter()
    a = None if dummy else leer_anotaciones(d["base"], d, resp["warnings"])
    comp = comparar(d, a, an, o)
    tiempos["anotaciones"] = time.perf_counter() - t0

    t0 = time.perf_counter()
    run_dir = runs.resolve(request.get("run_dir") or ".")
    run_dir.mkdir(parents=True, exist_ok=True)
    npz = guardar_traza(run_dir, d, a, an, o)
    tiempos["traza_npz"] = time.perf_counter() - t0
    resp["artifacts"] = [{"tipo": "traza_ecg_npz", "path": runs.rel(npz),
                          "descripcion": "ecg_traza.npz: senal (primeros traza_max_s), picos R, latidos irregulares, "
                                         "anotaciones, ritmos y ventanas de la bandera (numpy, sin pickle)"}]

    inicio = d["i0"] / fs
    raw = {
        "aviso": M.AVISO + " " + M.ETIQUETA_BANDERA + ".",
        "entrada": {"formato": d["formato"], "registro": d["registro"], "canal_indice": d["canal_indice"],
                    "canal_nombre": d["canal_nombre"], "canales": d["canales"], "fs_hz": fs, "unidad": d["unidad"],
                    "n_muestras_segmento": int(x.size), "duracion_registro_s": round(d["n_total"] / fs, 3),
                    "segmento_s": [round(inicio, 3), round(inicio + dur, 3)], "duracion_segmento_s": round(dur, 3),
                    "senal_simulada": bool(dummy)},
        "metodos": METODOS,
        "picos_r": {"n": int(an["picos"].size), "detector": "nk.ecg_peaks(method='neurokit')",
                    "correct_artifacts": False},
        "fc": an["fc"], "hrv": an["hrv"], "intervalos": an["inter"], "latidos_irregulares": an["irr"],
        "bandera_fa": an["bandera"], "comparacion_anotaciones": comp, "tiempos_s": {},
    }
    dl = raw["intervalos"]["delineacion"]
    dl["picos_sin_delinear_por_borde"] = "latidos a < 1 s del inicio o del fin del segmento (NaN, sin dato)"
    if dur > BLOQUE_DELINEACION_S:
        dl["nota"] = (
            f"segmento de {dur:.0f} s delineado en bloques de {BLOQUE_DELINEACION_S:.0f} s con margen de "
            f"{MARGEN_DELINEACION_S:.0f} s (el DWT a 2000 Hz de todo el segmento no cabe en memoria); "
            + ("cobertura completa" if not dl.get("bloques_fallidos") else
               f"{dl.get('bloques_fallidos')} bloques fallaron y sus latidos quedan sin dato (ver warnings)"))
    tiempos["total"] = time.perf_counter() - t_ini
    raw["tiempos_s"] = {k: round(v, 3) for k, v in tiempos.items()}

    resp["raw_output"] = raw
    resp["normalized"] = M.construir_filas(resp, raw)
    resp["inferencia_real"] = True
    resp["status"] = "ok"
    resp["message"] = (f"Ejecucion real del algoritmo de senal sobre {dur:.1f} s de ECG ({an['picos'].size} picos R); "
                       f"{len(resp['normalized'])} filas. Estimaciones experimentales; NO es diagnostico. "
                       f"Bandera: {an['bandera']['valor']} ({M.ETIQUETA_BANDERA}).")
    if dummy:
        resp["message"] = "Prueba de carga con senal sintetica nk.ecg_simulate. NO es un resultado."


if __name__ == "__main__":
    sys.exit(runs.ejecutar_adaptador(MODEL, run))
