"""Metricas ECG: funciones PURAS (solo numpy + biblioteca estandar + core.formato).

No importa neurokit2, wfdb, pandas ni scipy: se puede importar desde el venv de la app (Python 3.13) para pruebas.
Convenciones (CONTRATO.md, "Modulo ECG"):
- `picos`: indices de muestra (enteros, relativos al inicio del segmento analizado) de los picos R, ordenados.
- Intervalo RR numero k = picos[k+1] - picos[k] (k = 0..n-2), en segundos. El intervalo k "toca" los picos k y k+1.
- Todas las razones con denominador 0 devuelven None (nunca 0). Un valor ausente es None, nunca 0.
- NADA de esto es diagnostico. La bandera de ritmo irregular es EXPERIMENTAL.
"""
from __future__ import annotations

import math
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from core import formato  # noqa: E402

ETIQUETA_BANDERA = "BANDERA EXPERIMENTAL – NO DIAGNÓSTICO"
QUALITY_BANDERA = "BANDERA_EXPERIMENTAL_NO_DIAGNOSTICO"
AVISO = ("Procesamiento de senal experimental (NeuroKit2 + wfdb), no es un modelo entrenado ni un dispositivo "
         "medico. NO es diagnostico. La bandera de ritmo irregular es una regla experimental simplificada, "
         "no validada, y no distingue fibrilacion auricular de otras arritmias.")

# Simbolos de latido estandar WFDB (wfdb.io.annotation: N L R B A a J S V r F e j n E / f Q ?)
SIMBOLOS_LATIDO = frozenset("NLRBAaJSVrFejnE/fQ?")
ECTOPICOS_V = frozenset("V")
ECTOPICOS_A = frozenset("A")
ECTOPICOS_OTROS = frozenset("aJSFejE")
ECTOPICOS_ANOTADOS = ECTOPICOS_V | ECTOPICOS_A | ECTOPICOS_OTROS

# Aviso (NO altera ningun valor): si >= esta fraccion de los latidos esta marcada como irregular, PR/QTc llevan
# un aviso de que la delineacion no es fiable. Fijada a priori.
FRACCION_IRREGULARES_AVISO = 0.10
FORMULA_BANDERA = ("segmento de l RR consecutivos (paso fa_paso_latidos) marcado = (C1) RMSSD/media(RR) > fa_umbral_nrmssd Y "
                   "(C2) TPR = puntos de inflexion/(n-2) dentro de [fa_tpr_min, fa_tpr_max] Y (C3) entropia de Shannon "
                   "normalizada (16 clases, sin los fa_n_atipicos RR mas largos y mas cortos) > fa_umbral_entropia "
                   "(Dash et al. 2009), tras el filtro de ectopicos de Dash (fa_filtro_ectopicos); registro = 1 si hay >= fa_min_ventanas_consecutivas segmentos marcados consecutivos")
CRITERIO_ECTOPICOS_RR = ("Criterio RR: el indice marcado ES el latido prematuro (pico i con RR previo < fraccion x mediana de "
                         "los RR validos anteriores). Se empareja uno a uno y EXACTO (distancia 0 latidos) con el ectopico "
                         "anotado (V, A, a J S F e j E) cuyo pico anotado se empareja con ese pico detectado dentro de la "
                         "tolerancia de picos R. No distingue supraventricular de ventricular; en FA marca muchos latidos "
                         "que no son extrasistoles.")
CRITERIO_ECTOPICOS_KUBIOS = ("Kubios (signal_fixpeaks, clase 'ectopic'): el indice marcado i puede ser el latido prematuro o el "
                             "siguiente, por eso se empareja uno a uno con tolerancia de +-1 latido (primero distancia 0, "
                             "luego 1; a igualdad el latido previo) con el pico detectado de cada ectopico anotado. "
                             "Solo comparacion; no es el criterio principal.")


def _f(x, nd=None):
    """float nativo (o None)."""
    if x is None:
        return None
    x = float(x)
    if math.isnan(x):
        return None
    return round(x, nd) if nd is not None else x


def razon(num, den):
    """num/den o None si den == 0 (nunca 0 por defecto)."""
    return None if not den else float(num) / float(den)


# ----------------------------------------------------------------------------------------------- RR, FC, HRV
def rr_intervalos(picos, fs: float) -> np.ndarray:
    """RR en segundos (len = n_picos - 1)."""
    p = np.asarray(picos, dtype=np.float64)
    return np.diff(p) / float(fs) if p.size >= 2 else np.zeros(0)


def rr_validos(rr_s, rr_min_s: float, rr_max_s: float) -> np.ndarray:
    """Mascara booleana: rr_min_s <= RR <= rr_max_s (metodo 2)."""
    rr = np.asarray(rr_s, dtype=np.float64)
    return (rr >= rr_min_s) & (rr <= rr_max_s)


def frecuencia_cardiaca(rr_s, ok) -> float | None:
    """FC = 60 / media(RR validos) en bpm; None si no hay RR validos."""
    rr = np.asarray(rr_s, dtype=np.float64)[np.asarray(ok, dtype=bool)]
    return None if rr.size == 0 else 60.0 / float(rr.mean())


def mascara_nn(ok, irregulares, n_picos: int) -> np.ndarray:
    """RR validos que NO tocan un latido marcado (metodo 4). El intervalo k toca los picos k y k+1, asi que el
    latido marcado i excluye los intervalos i-1 e i."""
    m = np.asarray(ok, dtype=bool).copy()
    for i in np.asarray(irregulares, dtype=np.int64).ravel():
        if 1 <= i <= m.size:
            m[i - 1] = False
        if 0 <= i < m.size:
            m[i] = False
    return m


def hrv_basico(rr_s, ok, min_rr: int) -> dict:
    """RMSSD (diferencias entre RR sucesivos AMBOS aceptados) y SDNN (ddof=1), en ms.
    Requiere >= min_rr intervalos; si no, valores None y `motivo`."""
    rr = np.asarray(rr_s, dtype=np.float64)
    ok = np.asarray(ok, dtype=bool)
    n = int(ok.sum())
    pares = ok[1:] & ok[:-1] if rr.size >= 2 else np.zeros(0, dtype=bool)
    n_pares = int(pares.sum())
    out = {"n_nn": n, "n_pares": n_pares, "rmssd_ms": None, "sdnn_ms": None, "media_rr_ms": None, "motivo": None}
    if n < min_rr:
        out["motivo"] = f"solo {n} intervalos NN; minimo {min_rr} (min_rr_hrv)"
        return out
    nn = rr[ok] * 1000.0
    out["media_rr_ms"] = float(nn.mean())
    out["sdnn_ms"] = float(nn.std(ddof=1))
    if n_pares >= 1:
        d = (rr[1:] - rr[:-1])[pares] * 1000.0
        out["rmssd_ms"] = float(math.sqrt(float(np.mean(d ** 2))))
    else:
        out["motivo"] = "ningun par de RR sucesivos aceptados para RMSSD"
    return out


def ventanas_completas(duracion_s: float, ventana_s: float) -> list[tuple[float, float]]:
    """Ventanas sin traslape de `ventana_s` desde t=0; solo ventanas completas (el resto final se descarta)."""
    if ventana_s <= 0:
        return []
    n = int(math.floor(duracion_s / ventana_s + 1e-9))
    return [(k * ventana_s, (k + 1) * ventana_s) for k in range(n)]


def _rango_intervalos(picos_t, t0: float, t1: float) -> tuple[int, int]:
    """Intervalos k con picos[k] >= t0 y picos[k+1] < t1 -> rango [lo, hi) de k."""
    lo = int(np.searchsorted(picos_t, t0, side="left"))
    hi = int(np.searchsorted(picos_t, t1, side="left"))
    return lo, max(lo, hi - 1)


def hrv_ventanas(picos, fs: float, rr_s, ok_sin_filtrar, ok_nn, duracion_s: float, min_rr: int,
                 ventana_s: float = 300.0) -> list[dict]:
    """HRV por ventanas de 300 s (filtrada = NN sin ectopicos; y sin filtrar)."""
    t = np.asarray(picos, dtype=np.float64) / float(fs)
    out = []
    for i, (t0, t1) in enumerate(ventanas_completas(duracion_s, ventana_s)):
        lo, hi = _rango_intervalos(t, t0, t1)
        h = hrv_basico(rr_s[lo:hi], ok_nn[lo:hi], min_rr)
        hs = hrv_basico(rr_s[lo:hi], ok_sin_filtrar[lo:hi], min_rr)
        out.append({"i": i, "t0_s": t0, "t1_s": t1, "n_nn": h["n_nn"], "rmssd_ms": _f(h["rmssd_ms"], 3),
                    "sdnn_ms": _f(h["sdnn_ms"], 3), "n_rr_sin_filtrar": hs["n_nn"],
                    "rmssd_sin_filtrar_ms": _f(hs["rmssd_ms"], 3), "sdnn_sin_filtrar_ms": _f(hs["sdnn_ms"], 3)})
    return out


# ------------------------------------------------------------------- latidos prematuros (metodo 3, criterio RR)
def latidos_prematuros(rr_s, ok, fraccion: float = 0.80, n_previos: int = 8, min_previos: int = 4) -> dict:
    """Latido i (pico i) prematuro si su RR previo RR_{i-1,i} es valido y < fraccion x mediana de los `n_previos` RR
    VALIDOS anteriores (minimo `min_previos`; los primeros latidos quedan sin evaluar). El RR previo del pico i es
    rr_s[i-1]. Devuelve {indices (picos), n_evaluados}."""
    rr = np.asarray(rr_s, dtype=np.float64)
    ok = np.asarray(ok, dtype=bool)
    prev: list[float] = []
    idx, n_eval = [], 0
    for k in range(rr.size):
        if not ok[k]:
            continue
        if len(prev) >= min_previos:
            n_eval += 1
            if rr[k] < fraccion * float(np.median(prev[-n_previos:])):
                idx.append(k + 1)
        prev.append(float(rr[k]))
    return {"indices": np.asarray(idx, dtype=np.int64), "n_evaluados": n_eval}


# ----------------------------------------------------------------------------------- bandera (metodo 6, Dash 2009)
def puntos_inflexion(x) -> int:
    """Numero de puntos de inflexion (maximos/minimos locales estrictos) de una serie."""
    x = np.asarray(x, dtype=np.float64)
    if x.size < 3:
        return 0
    d = np.diff(x)
    return int(np.sum(d[:-1] * d[1:] < 0))


def tpr(x) -> float | None:
    """Razon de puntos de inflexion = TP/(n-2) (el esperado en una serie aleatoria es (2n-4)/3 puntos, es decir 2/3).
    El denominador n-2 es decision propia (el articulo da el numero esperado, no escribe la division)."""
    n = np.asarray(x).size
    return None if n < 3 else puntos_inflexion(x) / (n - 2)


def entropia_shannon(x, n_atipicos: int = 8, n_clases: int = 16) -> float | None:
    """Entropia de Shannon normalizada (Dash 2009, Ec. 2-3): se quitan los `n_atipicos` valores mas largos y los
    `n_atipicos` mas cortos; el resto se reparte en `n_clases` clases equiespaciadas entre su minimo y su maximo;
    p(i)=N_clase/(n - 2*n_atipicos); SE = -sum p log p / log(n_clases). Serie constante -> 0."""
    v = np.sort(np.asarray(x, dtype=np.float64))
    if v.size - 2 * n_atipicos < n_clases:
        return None
    v = v[n_atipicos:v.size - n_atipicos]
    if v[-1] == v[0]:
        return 0.0
    h, _ = np.histogram(v, bins=n_clases)
    p = h[h > 0] / v.size
    return float(-np.sum(p * np.log(p)) / math.log(n_clases))


def filtrar_ectopicos_dash(rr_s, ok=None, perc_bajo: float = 1.0, perc_alto: float = 99.0,
                           perc_confirma: float = 25.0) -> dict:
    """Filtro de ectopicos de Dash et al. 2009 (seccion 'Filtering of Ectopic Beats', p. 1703; Fig. 1, p. 1704).
    Cocientes r[j] = RR[j]/RR[j-1] y q[j] = RR[j]/RR[j+1]. Latido ectopico en RR[i] si
      r[i] < Perc1(r)  y  r[i+1] > Perc99(r)  y  q[i+1] = RR[i+1]/RR[i+2] > Perc25(q).
    'it is excluded from further analysis along with its compensatory pause': se eliminan RR[i] y RR[i+1].
    Decisiones propias (el articulo no las fija): los percentiles se calculan sobre los cocientes de la serie recibida
    (el segmento que se clasifica) con numpy.percentile lineal; Perc25 sobre la serie q; solo se evaluan i con
    RR[i-1..i+2] validos (los cocientes entre RR no adyacentes o invalidos son NaN). NO implementa la condicion de RR
    omitidos del articulo (que no dice que RR se eliminan). Devuelve {conservados (bool, True = RR usable y no eliminado),
    eliminados (bool), indices_ectopicos (i), n_eliminados}."""
    rr = np.asarray(rr_s, dtype=np.float64)
    n = rr.size
    ok = np.ones(n, dtype=bool) if ok is None else np.asarray(ok, dtype=bool)
    elim = np.zeros(n, dtype=bool)
    idx: list[int] = []
    if n >= 4:
        r = np.full(n, np.nan)   # r[j] = RR[j]/RR[j-1]
        q = np.full(n, np.nan)   # q[j] = RR[j]/RR[j+1]
        par = ok[1:] & ok[:-1]
        with np.errstate(divide="ignore", invalid="ignore"):
            r[1:][par] = rr[1:][par] / rr[:-1][par]
            q[:-1][par] = rr[:-1][par] / rr[1:][par]
        if np.isfinite(r).sum() >= 4 and np.isfinite(q).sum() >= 4:
            p1 = np.nanpercentile(r, perc_bajo)
            p99 = np.nanpercentile(r, perc_alto)
            p25 = np.nanpercentile(q, perc_confirma)
            for i in range(1, n - 2):
                if (r[i] < p1) and (r[i + 1] > p99) and (q[i + 1] > p25):  # NaN -> False
                    idx.append(i)
                    elim[i] = elim[i + 1] = True
    elim &= ok
    return {"conservados": ok & ~elim, "eliminados": elim, "indices_ectopicos": np.asarray(idx, dtype=np.int64),
            "n_eliminados": int(elim.sum())}


def evaluar_segmento_fa(rr_s, ok, umbral_nrmssd: float, tpr_min: float, tpr_max: float, umbral_entropia: float,
                        n_atipicos: int, max_invalidos: float = 0.10, filtro_ectopicos: bool = True) -> dict:
    """Un segmento de RR consecutivos. Evaluable solo si a lo sumo `max_invalidos` (10 %, decision propia) de sus RR son
    invalidos. Con `filtro_ectopicos` se aplica antes de C1-C3 el filtro de Dash (filtrar_ectopicos_dash) y la serie
    restante se 'enlaza' en una secuencia continua (articulo, p. 1703): RMSSD, TPR y entropia se calculan sobre esa
    serie enlazada. Sin filtro: TPR/entropia sobre los RR validos en orden y RMSSD solo con pares adyacentes validos.
    RMSSD/TPR usan todos los RR restantes (el articulo solo descarta atipicos para la entropia). Marcado = C1 y C2 y C3."""
    rr = np.asarray(rr_s, dtype=np.float64)
    ok = np.asarray(ok, dtype=bool)
    v = {"n_rr": int(ok.sum()), "n_rr_filtrados_ectopicos": 0, "nrmssd": None, "tpr": None, "entropia": None,
         "c1": None, "c2": None, "c3": None, "marcada": None}
    if rr.size == 0 or (rr.size - int(ok.sum())) > max_invalidos * rr.size:
        return v
    if filtro_ectopicos:
        f = filtrar_ectopicos_dash(rr, ok)
        usable = f["conservados"]
        v["n_rr_filtrados_ectopicos"] = f["n_eliminados"]
        serie = rr[usable]
        d = np.diff(serie)
        rmssd = math.sqrt(float(np.mean(d ** 2))) if d.size else None
    else:
        usable = ok
        serie = rr[ok]
        pares = ok[1:] & ok[:-1]
        rmssd = math.sqrt(float(np.mean((rr[1:] - rr[:-1])[pares] ** 2))) if pares.sum() else None
    n = int(serie.size)
    v["n_rr"] = n
    media = float(serie.mean()) if n else 0.0
    se = entropia_shannon(serie, n_atipicos)
    if rmssd is None or media <= 0 or se is None:
        return v
    nrm = rmssd / media
    t = tpr(serie)
    c1, c2, c3 = bool(nrm > umbral_nrmssd), bool(tpr_min <= t <= tpr_max), bool(se > umbral_entropia)
    v.update({"nrmssd": nrm, "tpr": t, "entropia": se, "c1": c1, "c2": c2, "c3": c3, "marcada": c1 and c2 and c3})
    return v


def ventanas_bandera(picos, fs: float, rr_s, ok, n_segmento: int, paso: int, umbral_nrmssd: float, tpr_min: float,
                     tpr_max: float, umbral_entropia: float, n_atipicos: int, filtro_ectopicos: bool = True) -> list[dict]:
    """Segmentos de `n_segmento` RR consecutivos cada `paso` RR. t0_s/t1_s = tiempo (relativo al inicio del segmento
    analizado) del primer y del ultimo latido del segmento. Campos: {i,t0_s,t1_s,n_rr,n_rr_filtrados_ectopicos,nrmssd,
    tpr,entropia,c1,c2,c3,marcada}; n_rr = RR usados tras el filtro."""
    picos = np.asarray(picos, dtype=np.float64)
    rr = np.asarray(rr_s, dtype=np.float64)
    ok = np.asarray(ok, dtype=bool)
    out = []
    for i, s0 in enumerate(range(0, rr.size - n_segmento + 1, max(1, paso))):
        e = evaluar_segmento_fa(rr[s0:s0 + n_segmento], ok[s0:s0 + n_segmento], umbral_nrmssd, tpr_min, tpr_max,
                                umbral_entropia, n_atipicos, 0.10, filtro_ectopicos)
        out.append({"i": i, "t0_s": float(picos[s0] / fs), "t1_s": float(picos[s0 + n_segmento] / fs), "n_rr": e["n_rr"],
                    "n_rr_filtrados_ectopicos": e["n_rr_filtrados_ectopicos"],
                    "nrmssd": _f(e["nrmssd"], 5), "tpr": _f(e["tpr"], 5), "entropia": _f(e["entropia"], 5),
                    "c1": e["c1"], "c2": e["c2"], "c3": e["c3"], "marcada": e["marcada"]})
    return out


def bandera_segmento(ventanas: list[dict], min_consecutivas: int) -> dict:
    """Bandera del registro: 1 / 0 / None (None si hay menos segmentos evaluables que `min_consecutivas`).
    Un segmento no evaluable rompe la racha de consecutivos."""
    evals = [w for w in ventanas if w["marcada"] is not None]
    marcadas = [w for w in evals if w["marcada"]]
    racha = mejor = 0
    for w in ventanas:
        if w["marcada"]:
            racha += 1
            mejor = max(mejor, racha)
        else:
            racha = 0
    res = {"n_ventanas": len(ventanas), "n_evaluables": len(evals), "n_marcadas": len(marcadas),
           "fraccion_marcadas": razon(len(marcadas), len(evals)), "max_consecutivas": mejor,
           "valor": None, "motivo": None}
    if not ventanas:
        res["motivo"] = "ningun segmento completo: hacen falta fa_latidos_segmento RR consecutivos"
    elif len(evals) < min_consecutivas:
        res["motivo"] = (f"{len(evals)} segmentos evaluables; se necesitan >= {min_consecutivas} "
                         f"(fa_min_ventanas_consecutivas) de {len(ventanas)} segmentos")
    else:
        res["valor"] = 1 if mejor >= min_consecutivas else 0
    return res


def fraccion_tiempo_marcada(ventanas: list[dict], duracion_s: float) -> float | None:
    """Union de los intervalos [t0,t1] de los segmentos marcados / duracion analizada."""
    iv = sorted((w["t0_s"], w["t1_s"]) for w in ventanas if w["marcada"])
    tot, fin = 0.0, -math.inf
    for a, b in iv:
        a = max(a, fin)
        if b > a:
            tot += b - a
            fin = b
    return _f(razon(tot, duracion_s), 5)


# --------------------------------------------------------------------------- emparejamiento con anotaciones
def emparejar_picos(ref, det, tol_muestras: float) -> dict:
    """Emparejamiento UNO A UNO por distancia creciente (voraz) entre referencia y deteccion, tolerancia `tol`.
    Cada referencia puede emparejar con a lo sumo un pico detectado y viceversa (considera los 4 vecinos mas
    cercanos de cada referencia). TP = pares; FN = ref sin par; FP = det sin par."""
    ref = np.sort(np.asarray(ref, dtype=np.int64))
    det = np.sort(np.asarray(det, dtype=np.int64))
    nr, nd = ref.size, det.size
    par_det = -np.ones(nr, dtype=np.int64)  # para cada ref, indice en det (o -1)
    if nr and nd:
        j = np.searchsorted(det, ref)
        d_all, r_all, c_all = [], [], []
        for off in (-2, -1, 0, 1):
            c = j + off
            v = (c >= 0) & (c < nd)
            cc = np.clip(c, 0, nd - 1)
            dist = np.abs(det[cc] - ref)
            v &= dist <= tol_muestras
            d_all.append(dist[v]); r_all.append(np.nonzero(v)[0]); c_all.append(cc[v])
        d = np.concatenate(d_all); r = np.concatenate(r_all); c = np.concatenate(c_all)
        orden = np.lexsort((r, d))
        usado_det = np.zeros(nd, dtype=bool)
        for k in orden:
            ri, ci = r[k], c[k]
            if par_det[ri] < 0 and not usado_det[ci]:
                par_det[ri] = ci
                usado_det[ci] = True
    tp = int((par_det >= 0).sum())
    fn, fp = nr - tp, nd - tp
    return {"referencia": ref, "deteccion": det, "par_det": par_det, "n_ref": nr, "n_det": nd, "tp": tp, "fn": fn,
            "fp": fp, "sensibilidad": razon(tp, tp + fn), "ppv": razon(tp, tp + fp)}


def comparar_picos(ref, det, fs: float, tolerancia_ms: float, referencia: str) -> dict:
    m = emparejar_picos(ref, det, tolerancia_ms / 1000.0 * fs)
    return {"referencia": referencia, "tolerancia_ms": tolerancia_ms, "n_ref": m["n_ref"], "n_det": m["n_det"],
            "tp": m["tp"], "fn": m["fn"], "fp": m["fp"], "sensibilidad": _f(m["sensibilidad"], 5),
            "ppv": _f(m["ppv"], 5)}


def recortar_latidos(muestras, simbolos, i0: int, i1: int):
    """Latidos (simbolos estandar WFDB) dentro de [i0, i1), relativos a i0. Devuelve (muestras, simbolos)."""
    s = np.asarray(muestras, dtype=np.int64)
    y = np.asarray([str(c) for c in simbolos], dtype="<U2")
    if s.size == 0:
        return s, y
    keep = np.array([c in SIMBOLOS_LATIDO for c in y], dtype=bool) & (s >= i0) & (s < i1)
    return s[keep] - i0, y[keep]


def comparar_ectopicos(picos, irregulares, ann_muestras, ann_simbolos, fs: float, tolerancia_ms: float,
                       tolerancia_latidos: int = 0, criterio: str = CRITERIO_ECTOPICOS_RR) -> dict:
    """Latidos marcados (indices i sobre `picos`) frente a ectopicos anotados; emparejamiento uno a uno con distancia
    <= `tolerancia_latidos` (0 = exacto, criterio RR; 1 = Kubios). `criterio` es el texto que se informa."""
    picos = np.asarray(picos, dtype=np.int64)
    simb = np.asarray([str(c) for c in ann_simbolos], dtype="<U2")
    s = np.asarray(ann_muestras, dtype=np.int64)
    es_ect = np.array([c in ECTOPICOS_ANOTADOS for c in simb], dtype=bool)
    por_simbolo = {}
    for c in simb[es_ect]:
        por_simbolo[str(c)] = por_simbolo.get(str(c), 0) + 1
    n_v = int(sum(v for k, v in por_simbolo.items() if k in ECTOPICOS_V))
    n_a = int(sum(v for k, v in por_simbolo.items() if k in ECTOPICOS_A))
    n_o = int(sum(v for k, v in por_simbolo.items() if k in ECTOPICOS_OTROS))
    n_tot = n_v + n_a + n_o
    irr = np.unique(np.asarray(irregulares, dtype=np.int64))
    # indice del pico detectado al que corresponde cada ectopico anotado (emparejando TODOS los latidos anotados)
    m = emparejar_picos(s, picos, tolerancia_ms / 1000.0 * fs)
    orden_ref = np.argsort(s, kind="stable")
    k_por_ann = np.full(s.size, -1, dtype=np.int64)
    k_por_ann[orden_ref] = m["par_det"]  # `par_det` esta en el orden de `s` ordenado
    ect_idx = np.nonzero(es_ect)[0]
    libres = set(int(i) for i in irr)
    pares = []  # (ann, i)
    sin_pico = 0
    ks = []
    for a in ect_idx:
        k = int(k_por_ann[a])
        if k < 0:
            sin_pico += 1
        else:
            ks.append((int(a), k))
    pendientes = ks
    for d in range(0, int(tolerancia_latidos) + 1):
        nuevos = []
        for a, k in pendientes:
            for cand in ((k,) if d == 0 else (k - 1, k + 1)):
                if cand in libres:
                    libres.discard(cand)
                    pares.append((a, cand))
                    break
            else:
                nuevos.append((a, k))
        pendientes = nuevos
    tp = len(pares)
    tp_clase = {"V": 0, "A": 0, "otros": 0}
    for a, _ in pares:
        c = str(simb[a])
        tp_clase["V" if c in ECTOPICOS_V else "A" if c in ECTOPICOS_A else "otros"] += 1
    n_det = int(irr.size)
    return {"anotados_por_simbolo": por_simbolo, "n_anotados_V": n_v, "n_anotados_A": n_a, "n_anotados_otros": n_o,
            "n_anotados_total": n_tot, "n_detectados": n_det, "tp": tp, "fn": n_tot - tp, "fp": n_det - tp,
            "sensibilidad": _f(razon(tp, n_tot), 5), "ppv": _f(razon(tp, n_det), 5),
            "tp_por_clase": tp_clase, "n_anotados_sin_pico_detectado": sin_pico,
            "criterio_emparejamiento": criterio}


# ------------------------------------------------------------------------------------------- ritmos anotados
def intervalos_ritmo(muestras, notas, i0: int, i1: int, fs: float) -> list[tuple[float, float, str]]:
    """Intervalos de ritmo (t0_s, t1_s, etiqueta) recortados a [i0, i1) y relativos a i0.
    Ritmo = anotaciones cuya aux_note empieza por '('; cada una dura hasta la siguiente anotacion de ritmo o hasta i1.
    El ritmo vigente al inicio del segmento es el de la ultima anotacion de ritmo anterior (si existe)."""
    pares = []
    for s, n in zip(muestras, notas):
        n = str(n).replace("\x00", "").strip()
        if n.startswith("("):
            pares.append((int(s), n))
    pares.sort(key=lambda x: x[0])
    out = []
    for k, (s, n) in enumerate(pares):
        fin = pares[k + 1][0] if k + 1 < len(pares) else i1
        a, b = max(s, i0), min(fin, i1)
        if b > a:
            out.append(((a - i0) / fs, (b - i0) / fs, n))
    return out


def segundos_por_ritmo(ritmos) -> dict:
    d: dict[str, float] = {}
    for a, b, n in ritmos:
        d[n] = d.get(n, 0.0) + (b - a)
    return {k: round(v, 3) for k, v in d.items()}


def _solape(ritmos, etiqueta: str, t0: float, t1: float) -> float:
    return float(sum(max(0.0, min(b, t1) - max(a, t0)) for a, b, n in ritmos if n == etiqueta))


def comparar_fa(ventanas: list[dict], ritmos, duracion_s: float, bandera: dict) -> dict:
    """Bandera por segmento (solo segmentos evaluables) frente a ritmos anotados. Segmento AFIB si >= 50 % de su duracion
    (t0_s..t1_s) esta en '(AFIB'. Los segmentos '(AFL' (>= 50 %) cuentan como no-AFIB en la matriz y se listan aparte."""
    tp = fp = fn = tn = 0
    afl_n = afl_m = 0
    n_eval = n_afib = 0
    for w in ventanas:
        if w["marcada"] is None:
            continue
        n_eval += 1
        dur = w["t1_s"] - w["t0_s"]
        afib = _solape(ritmos, "(AFIB", w["t0_s"], w["t1_s"]) >= 0.5 * dur
        afl = _solape(ritmos, "(AFL", w["t0_s"], w["t1_s"]) >= 0.5 * dur
        n_afib += afib
        if afl:
            afl_n += 1
            afl_m += bool(w["marcada"])
        if w["marcada"] and afib:
            tp += 1
        elif w["marcada"]:
            fp += 1
        elif afib:
            fn += 1
        else:
            tn += 1
    t_afib = sum(max(0.0, b - a) for a, b, n in ritmos if n == "(AFIB")
    return {"criterio_ventana": "segmento AFIB si >= 50 % de su duracion (primer a ultimo latido) esta en '(AFIB' (ritmo anotado)",
            "ritmos_anotados_s": segundos_por_ritmo(ritmos),
            "fraccion_tiempo_afib_anotada": _f(razon(t_afib, duracion_s), 5),
            "fraccion_tiempo_marcada": fraccion_tiempo_marcada(ventanas, duracion_s),
            "n_ventanas_evaluables": n_eval, "n_ventanas_afib": int(n_afib), "tp": tp, "fp": fp, "fn": fn, "tn": tn,
            "sensibilidad": _f(razon(tp, tp + fn), 5), "especificidad": _f(razon(tn, tn + fp), 5),
            "ppv": _f(razon(tp, tp + fp), 5), "ventanas_afl": {"n": afl_n, "marcadas": afl_m},
            "bandera_segmento": bandera.get("valor")}


def resumen_fc_hrv(picos, fs: float, rr_min_s: float, rr_max_s: float, min_rr: int, irregulares=()) -> dict:
    """FC y HRV (sin filtrar y filtrada por `irregulares`) para una serie de picos: mismas funciones para los picos
    detectados y para los latidos anotados."""
    picos = np.asarray(picos)
    rr = rr_intervalos(picos, fs)
    ok = rr_validos(rr, rr_min_s, rr_max_s)
    hs = hrv_basico(rr, ok, min_rr)
    hf = hrv_basico(rr, mascara_nn(ok, irregulares, picos.size), min_rr)
    return {"n_latidos": int(picos.size), "fc_bpm": _f(frecuencia_cardiaca(rr, ok), 3),
            "rmssd_sin_filtrar_ms": _f(hs["rmssd_ms"], 3), "sdnn_sin_filtrar_ms": _f(hs["sdnn_ms"], 3),
            "rmssd_filtrado_ms": _f(hf["rmssd_ms"], 3), "sdnn_filtrado_ms": _f(hf["sdnn_ms"], 3)}


def indices_anotados_ectopicos(picos_ann, simbolos) -> np.ndarray:
    """Indices (sobre los latidos anotados) de los ectopicos anotados, para filtrar la HRV de referencia."""
    return np.array([i for i, c in enumerate(simbolos) if str(c) in ECTOPICOS_ANOTADOS], dtype=np.int64)


def comparar_fc_hrv(res_det: dict, res_ann: dict) -> dict:
    dif = {}
    for k, v in res_det.items():
        a = res_ann.get(k)
        dif[k] = None if (v is None or a is None) else _f(v - a, 3)
    return {"detectados": res_det, "anotados": res_ann, "diferencias": dif}


# ---------------------------------------------------------------------------------------- PR / QT / QTc
def estadistico(valores) -> dict:
    v = np.asarray(valores, dtype=np.float64)
    v = v[~np.isnan(v)]
    if v.size == 0:
        return {"mediana": None, "p25": None, "p75": None, "n": 0}
    return {"mediana": _f(np.median(v), 2), "p25": _f(np.percentile(v, 25), 2),
            "p75": _f(np.percentile(v, 75), 2), "n": int(v.size)}


def intervalos_pr_qt(picos, p_onsets, r_onsets, t_offsets, fs: float, rr_min_s: float, rr_max_s: float,
                     min_latidos: int = 5) -> dict:
    """PR = R_onset - P_onset; QT = T_offset - R_onset; QTc Bazett = QT / sqrt(RR previo en s); medianas por latido.
    Entradas por latido (mismo orden que `picos`, NaN si la delineacion no encontro el punto: se ignoran, NO se
    convierten en 0). Valores <= 0 (delineacion fallida) se descartan y se cuentan. Minimo `min_latidos`."""
    picos = np.asarray(picos, dtype=np.float64)
    po = np.asarray(p_onsets, dtype=np.float64)
    ro = np.asarray(r_onsets, dtype=np.float64)
    to = np.asarray(t_offsets, dtype=np.float64)
    pr = (ro - po) / fs * 1000.0
    qt = (to - ro) / fs * 1000.0
    rr_prev = np.full(picos.size, np.nan)
    if picos.size >= 2:
        rr_prev[1:] = np.diff(picos) / fs
    rr_prev[(rr_prev < rr_min_s) | (rr_prev > rr_max_s)] = np.nan
    qtc = qt / np.sqrt(rr_prev)
    out = {}
    for nombre, v in (("pr_ms", pr), ("qt_ms", qt), ("qtc_bazett_ms", qtc)):
        valido = ~np.isnan(v)
        n_desc = int((v[valido] <= 0).sum())
        v = np.where(v > 0, v, np.nan)
        e = estadistico(v)
        e["n_descartados_no_positivos"] = n_desc
        e["n_sin_punto_delineado"] = int((~valido).sum())
        if e["n"] < min_latidos:
            e = {**e, "mediana": None, "p25": None, "p75": None,
                 "motivo": f"solo {e['n']} latidos con delineacion valida; minimo {min_latidos}"}
        else:
            e["motivo"] = None
        out[nombre] = e
    return out


# ---------------------------------------------------------------------------------------- filas normalizadas
def _sin_dato(motivo) -> str:
    return f"sin_dato: {motivo or 'no calculable'}"


def _ventana_txt(raw: dict) -> str:
    v = (raw.get("entrada") or {}).get("segmento_s") or [None, None]
    return f"t {v[0]}-{v[1]} s"


def construir_filas(resp: dict, resultados: dict) -> list[dict]:
    """SIEMPRE las 8 filas del contrato. `resultados` = raw_output (claves: entrada, fc, hrv, intervalos,
    latidos_irregulares (criterio RR), bandera_fa). Faltante -> value None y quality 'sin_dato: <motivo>' (nunca 0)."""
    src_sig, src_regla = "algoritmo_senal", "regla_experimental"
    seg = _ventana_txt(resultados)
    filas = []

    def add(metric, value, unit, tipo, quality, notes, source):
        filas.append(formato.filas_modelo(resp, metric=metric, value=value, unit=unit, tipo=tipo,
                                          quality=quality,
                                          notes=notes, source=source))

    # 1. FC
    fc = resultados.get("fc") or {}
    v = fc.get("valor_bpm")
    add("heart_rate", v, "bpm", "medicion", "ok" if v is not None else _sin_dato(fc.get("motivo")),
        f"{seg}; n_rr_validos={fc.get('n_rr_validos')}; FC = 60/media(RR validos {fc.get('rr_min_s')}-{fc.get('rr_max_s')} s)"
        "; estimacion por procesamiento de senal, no es medicion clinica", src_sig)

    # 2-3. HRV
    hrv = resultados.get("hrv") or {}
    hf = hrv.get("filtrado") or {}
    hs = hrv.get("sin_filtrar") or {}
    for metric, k in (("hrv_rmssd", "rmssd_ms"), ("hrv_sdnn", "sdnn_ms")):
        v = hf.get(k)
        motivo = hf.get("motivo") or "no calculada"
        add(metric, v, "ms", "medicion", "ok" if v is not None else _sin_dato(motivo),
            f"{seg}; variable V43; n_nn={hf.get('n_nn')} (NN = RR validos sin el RR previo y el posterior de cada latido "
            f"prematuro, criterio RR); sin filtrar: {k}={hs.get(k)} (n={hs.get('n_nn')}); SDNN con ddof=1; "
            f"ventanas de 300 s en raw_output.hrv", src_sig)

    # 4-5. PR y QTc
    inter = resultados.get("intervalos") or {}
    ban = resultados.get("bandera_fa") or {}
    irr = resultados.get("latidos_irregulares") or {}
    aviso = None
    if ban.get("valor") == 1:
        aviso = "bandera de ritmo irregular = 1"
    elif (irr.get("fraccion") or 0) >= FRACCION_IRREGULARES_AVISO:
        aviso = f"{irr.get('fraccion'):.1%} de los latidos prematuros por criterio RR (aviso a partir de {FRACCION_IRREGULARES_AVISO:.0%})"
    nota_del = ("delineacion NeuroKit2 dwt; mediana por latido; NaN ignorados")
    for metric, k, var in (("pr_interval", "pr_ms", "V35"), ("qtc_bazett", "qtc_bazett_ms", "V34")):
        e = inter.get(k) or {}
        v = e.get("mediana")
        if v is None:
            q = _sin_dato(e.get("motivo") or inter.get("motivo"))
        elif aviso:
            q = "aviso_delineacion_no_fiable_ritmo_irregular"
        else:
            q = "experimental_delineacion_dwt"
        extra = ""
        if aviso:
            extra = (f"; AVISO: {aviso}; la delineacion no es fiable con ritmo irregular (en fibrilacion auricular no hay "
                     "onda P)")
        add(metric, v, "ms", "medicion", q,
            f"{seg}; variable {var}; {nota_del}; n_latidos={e.get('n')}; IQR={e.get('p25')}-{e.get('p75')} ms"
            + ("; QTc = QT/sqrt(RR previo en s) (Bazett)" if k.startswith("qtc") else "; PR = R_onset - P_onset")
            + extra, src_sig)

    # 6. latidos irregulares (criterio RR)
    v = irr.get("n")
    add("latidos_irregulares", v, "latidos", "hallazgo",
        "experimental_criterio_rr_prematuridad" if v is not None else _sin_dato(irr.get("motivo")),
        f"{seg}; proxy V32/V33; criterio RR: latido prematuro si RR previo < {irr.get('ect_fraccion_prematuro')} x mediana de "
        f"los {irr.get('ect_n_previos')} RR validos anteriores (minimo 4); n_evaluados={irr.get('n_evaluados')}; "
        f"fraccion={irr.get('fraccion')}; no distingue supraventricular de ventricular; en FA marca muchos latidos que no "
        f"son extrasistoles; Kubios (solo comparacion): n_ectopic={irr.get('n_ectopic_kubios')}, "
        f"longshort={irr.get('longshort')}, missed={irr.get('missed')}, extra={irr.get('extra')}; "
        "estimacion experimental, no diagnostico", src_sig)

    # 7. fraccion de ventanas
    v = ban.get("fraccion_marcadas")
    add("ritmo_irregular_fraccion_ventanas", v, "fraccion_0_1", "hallazgo",
        "ok" if v is not None else _sin_dato(ban.get("motivo")),
        f"{ETIQUETA_BANDERA}: proxy V31; ventanas marcadas / evaluables = {ban.get('n_marcadas')}/{ban.get('n_evaluables')} "
        f"(de {ban.get('n_ventanas')} segmentos de {(ban.get('parametros') or {}).get('fa_latidos_segmento')} RR, paso {(ban.get('parametros') or {}).get('fa_paso_latidos')})", src_regla)

    # 8. bandera
    v = ban.get("valor")
    par = ban.get("parametros") or {}
    notas = (f"{ETIQUETA_BANDERA}: {FORMULA_BANDERA}. Parametros: {par}. {seg}; segmentos de "
             f"{par.get('fa_latidos_segmento')} RR con paso {par.get('fa_paso_latidos')}; evaluables={ban.get('n_evaluables')}, marcadas={ban.get('n_marcadas')}, "
             f"max_consecutivas={ban.get('max_consecutivas')}. Fuente: {ban.get('fuente')}. Proxy V31; "
             "no es diagnostico de fibrilacion auricular.")
    filas.append(formato.filas_modelo(
        resp, metric="ritmo_irregular_compatible_fa", value=v, unit="bandera_0_1_no_diagnostica", tipo="regla_alerta",
        quality=QUALITY_BANDERA if v is not None else _sin_dato(ban.get("motivo")), notes=notas, source=src_regla))
    assert len(filas) == 8
    return filas
