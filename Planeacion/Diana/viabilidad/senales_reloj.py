"""Pruebas de viabilidad de las señales del reloj (Diana): 03:V17, 03:V18, 03:V52, 03:V62, 04:A40.

Pregunta: ¿puede EVA calcular estas variables a bordo con funciones ligeras (las que irían en
TypeScript dentro de la app) y dar lo mismo que una herramienta de referencia?

Datos: PhysioNet MMASH 1.0.0 (22 hombres sanos, ~24 h cada uno, licencia ODbL).
  https://physionet.org/content/mmash/1.0.0/

Uso:
  python senales_reloj.py --datos RUTA/mmash/DataPaper [--salida resultados_senales.json]
"""
from __future__ import annotations

import argparse
import json
import warnings
from pathlib import Path

import numpy as np
import pandas as pd
from scipy import stats

warnings.filterwarnings("ignore")

SEED = 42
rng = np.random.default_rng(SEED)


# ---------------------------------------------------------------------------
# Utilidades de tiempo: MMASH usa "day" (1 o 2) + "hh:mm:ss"
# ---------------------------------------------------------------------------
def a_segundos(day, hhmm) -> np.ndarray:
    t = pd.to_timedelta(pd.Series(hhmm).astype(str).where(lambda s: s.str.count(":") == 2,
                                                         pd.Series(hhmm).astype(str) + ":00"))
    return (np.asarray(day, dtype=float) - 1) * 86400 + t.dt.total_seconds().to_numpy()


def periodos_sueno(sleep: pd.DataFrame) -> list[tuple[float, float, float]]:
    """Devuelve [(inicio_s, fin_s, TST_min)] usando Onset -> Out Bed. Corrige fechas cruzadas."""
    out = []
    for _, r in sleep.iterrows():
        ini = a_segundos([r["Onset Date"]], [r["Onset Time"]])[0]
        fin = a_segundos([r["Out Bed Date"]], [r["Out Bed Time"]])[0]
        if fin <= ini:  # el registro dice día 1 pero cruzó la medianoche
            fin += 86400
        out.append((ini, fin, float(r["Total Sleep Time (TST)"])))
    return out


# ---------------------------------------------------------------------------
# 03:V17 · HRV. Tres versiones del RMSSD
# ---------------------------------------------------------------------------
def rmssd(ibi_ms: np.ndarray) -> float:
    d = np.diff(ibi_ms)
    return float(np.sqrt(np.mean(d ** 2))) if len(d) > 1 else np.nan


def limpiar_ligero(ibi_ms: np.ndarray) -> np.ndarray:
    """Lo que haría la app en TypeScript: rango fisiológico + regla del 20 % frente a la mediana local.
    Devuelve los IBI con NaN donde hay artefacto (para no unir latidos que no son consecutivos)."""
    x = ibi_ms.astype(float).copy()
    x[(x < 300) | (x > 2000)] = np.nan
    med = pd.Series(x).rolling(11, center=True, min_periods=3).median().to_numpy()
    x[np.abs(x - med) > 0.2 * med] = np.nan
    return x


def rmssd_con_huecos(x: np.ndarray) -> float:
    d = np.diff(x)
    d = d[~np.isnan(d)]
    return float(np.sqrt(np.mean(d ** 2))) if len(d) > 10 else np.nan


def sdnn_con_huecos(x: np.ndarray) -> float:
    x = x[~np.isnan(x)]
    return float(np.std(x, ddof=1)) if len(x) > 10 else np.nan


def rmssd_neurokit(ibi_ms: np.ndarray) -> tuple[float, float]:
    """Referencia: NeuroKit2 con corrección de artefactos de Lipponen & Tarvainen (2019)."""
    import neurokit2 as nk

    x = ibi_ms[(ibi_ms >= 300) & (ibi_ms <= 2000)].astype(float)
    picos = np.concatenate([[0], np.cumsum(x)]).astype(int)  # ms; sampling_rate=1000
    _, picos_ok = nk.signal_fixpeaks(picos, sampling_rate=1000, iterative=True, method="Kubios")
    h = nk.hrv_time(picos_ok, sampling_rate=1000)
    return float(h["HRV_RMSSD"].iloc[0]), float(h["HRV_SDNN"].iloc[0])


# ---------------------------------------------------------------------------
# 04:A40 / 03:V52 / 03:V62 · Sueño con Cole-Kripke sobre acelerometría de muñeca
# ---------------------------------------------------------------------------
def cole_kripke(cuentas_min: np.ndarray) -> np.ndarray:
    """Cole et al. 1992 (versión ActiLife para épocas de 60 s): True = dormido."""
    a = np.minimum(np.nan_to_num(cuentas_min) / 100.0, 300.0)
    p = np.pad(a, (4, 2))
    w = [106, 54, 58, 76, 230, 74, 67]  # A-4 ... A+2
    D = 0.001 * sum(w[i] * p[i:i + len(a)] for i in range(7))
    return D < 1.0


def mayor_bloque_sueno(dormido: np.ndarray, t_min: np.ndarray, ventana=(18 * 60, 36 * 60),
                       tolerancia_min=30) -> tuple[float, float] | None:
    """Encuentra el periodo principal de sueño: une bloques dormidos separados por < tolerancia
    y se queda con el más largo que empiece entre las 18:00 del día 1 y las 12:00 del día 2."""
    idx = np.where(dormido)[0]
    if len(idx) == 0:
        return None
    bloques, ini, prev = [], idx[0], idx[0]
    for i in idx[1:]:
        if t_min[i] - t_min[prev] > tolerancia_min:
            bloques.append((ini, prev))
            ini = i
        prev = i
    bloques.append((ini, prev))
    bloques = [(t_min[a], t_min[b] + 1) for a, b in bloques
               if ventana[0] <= t_min[a] <= ventana[1] and (t_min[b] - t_min[a]) >= 60]
    return max(bloques, key=lambda b: b[1] - b[0]) if bloques else None


# ---------------------------------------------------------------------------
# Estadística
# ---------------------------------------------------------------------------
def bland_altman(a, b) -> dict:
    a, b = np.asarray(a, float), np.asarray(b, float)
    m = ~(np.isnan(a) | np.isnan(b))
    a, b = a[m], b[m]
    d = a - b
    sesgo, de = float(np.mean(d)), float(np.std(d, ddof=1))
    rho = stats.spearmanr(a, b)[0] if len(a) > 2 else np.nan
    return {"n": int(len(a)), "sesgo": round(sesgo, 2), "limites95": [round(sesgo - 1.96 * de, 2),
            round(sesgo + 1.96 * de, 2)], "error_abs_medio": round(float(np.mean(np.abs(d))), 2),
            "error_rel_medio_pct": round(float(np.mean(np.abs(d) / np.abs(b)) * 100), 1),
            "error_rel_mediana_pct": round(float(np.median(np.abs(d) / np.abs(b)) * 100), 1),
            "dentro_10pct": round(float(np.mean(np.abs(d) / np.abs(b) <= 0.10) * 100), 1),
            "spearman": round(float(rho), 3)}


def spearman_ic(x, y, n_boot=2000) -> dict:
    x, y = np.asarray(x, float), np.asarray(y, float)
    m = ~(np.isnan(x) | np.isnan(y))
    x, y = x[m], y[m]
    rho = stats.spearmanr(x, y)[0]
    bs = []
    for _ in range(n_boot):
        i = rng.integers(0, len(x), len(x))
        if len(np.unique(x[i])) > 2:
            bs.append(stats.spearmanr(x[i], y[i])[0])
    lo, hi = np.nanpercentile(bs, [2.5, 97.5])
    return {"n": int(len(x)), "rho": round(float(rho), 2), "ic95": [round(float(lo), 2), round(float(hi), 2)]}


# ---------------------------------------------------------------------------
def procesar_usuario(d: Path) -> dict:
    u = {"usuario": d.name}
    rr = pd.read_csv(d / "RR.csv", index_col=0)
    act = pd.read_csv(d / "Actigraph.csv", index_col=0)
    sleep = pd.read_csv(d / "sleep.csv", index_col=0)
    q = pd.read_csv(d / "questionnaire.csv", index_col=0).iloc[0]
    u.update({k: float(q[k]) for k in ["STAI1", "STAI2", "Pittsburgh", "Daily_stress", "MEQ"] if k in q})
    u["panas_neg_media"] = float(q[[c for c in q.index if c.startswith("panas_neg")]].mean())

    # En user_8 y user_9 el día 2 viene como -29 (error de cambio de mes del dataset)
    for x in (rr, act):
        x["day"] = np.where(x["day"] < 1, 2, x["day"])
    rr["t"] = a_segundos(rr["day"], rr["time"])
    rr["ms"] = rr["ibi_s"] * 1000
    act["t"] = a_segundos(act["day"], act["time"])
    act = act[act["t"] >= 0].sort_values("t")

    periodos = periodos_sueno(sleep)
    u["tiene_sueno"] = len(periodos) > 0

    # ---- V17 HRV nocturna (durante los periodos de sueño de referencia)
    if periodos:
        noche = pd.concat([rr[(rr.t >= a) & (rr.t <= b)] for a, b, _ in periodos])
        ibi = noche["ms"].to_numpy()
        limpio = limpiar_ligero(ibi)
        u["latidos_noche"] = int(len(ibi))
        u["artefactos_pct"] = round(float(np.isnan(limpio).mean() * 100), 1)
        u["rmssd_crudo"] = rmssd(ibi)
        u["rmssd_ligero"] = rmssd_con_huecos(limpio)
        u["sdnn_ligero"] = sdnn_con_huecos(limpio)
        try:
            u["rmssd_nk"], u["sdnn_nk"] = rmssd_neurokit(ibi)
        except Exception as e:  # noqa: BLE001
            u["rmssd_nk"] = u["sdnn_nk"] = np.nan
            u["error_nk"] = str(e)[:120]

    # ---- V18 FC en reposo: mediana de FC en la ventana de 30 min con menos movimiento
    act["min"] = (act["t"] // 60).astype(int)
    por_min = act.groupby("min").agg(cuentas=("Axis1", "sum"), vm=("Vector Magnitude", "sum"),
                                     hr=("HR", "median"), n=("Axis1", "size"))
    por_min = por_min.reindex(range(por_min.index.min(), por_min.index.max() + 1))
    mov30 = por_min["vm"].rolling(30, min_periods=25).sum()
    if mov30.notna().any():
        fin = int(mov30.idxmin())
        ventana = por_min.loc[fin - 29:fin]
        u["rhr_reloj"] = float(ventana["hr"].median())
        w = rr[(rr.t >= (fin - 29) * 60) & (rr.t < (fin + 1) * 60)]["ms"].to_numpy()
        w = limpiar_ligero(w)
        u["rhr_rr"] = float(60000 / np.nanmedian(w)) if np.isfinite(w).sum() > 100 else np.nan
        u["rhr_minuto_reloj"] = int(fin)
        u["rhr_en_sueno"] = any(a <= fin * 60 <= b for a, b, _ in periodos)
    # FC en reposo medida DURANTE el sueño: mediana de 30 min más baja dentro de la noche
    if periodos:
        en_noche = np.zeros(len(por_min), bool)
        for a, b, _ in periodos:
            en_noche |= (por_min.index.to_numpy() * 60 >= a) & (por_min.index.to_numpy() * 60 < b)
        hr30 = por_min["hr"].where(en_noche).rolling(30, min_periods=25).median()
        u["rhr_sueno"] = float(hr30.min()) if hr30.notna().any() else np.nan
    if periodos:
        hr_noche = pd.concat([act[(act.t >= a) & (act.t <= b)]["HR"] for a, b, _ in periodos])
        u["fc_noche_p5"] = float(np.nanpercentile(hr_noche, 5)) if len(hr_noche) else np.nan

    # ---- A40 / V52 / V62 sueño por Cole-Kripke
    dormido = cole_kripke(por_min["cuentas"].to_numpy())
    con_dato = por_min["n"].notna().to_numpy()
    dormido &= con_dato
    t_min = por_min.index.to_numpy()
    if periodos:
        ref = np.zeros(len(t_min), bool)
        for a, b, _ in periodos:
            ref |= (t_min * 60 >= a) & (t_min * 60 < b)
        cama = np.zeros(len(t_min), bool)
        for _, r in sleep.iterrows():
            a = a_segundos([r["In Bed Date"]], [r["In Bed Time"]])[0]
            b = a_segundos([r["Out Bed Date"]], [r["Out Bed Time"]])[0]
            b = b + 86400 if b <= a else b
            cama |= (t_min * 60 >= a) & (t_min * 60 < b)
        u["tst_ref"] = float(sum(p[2] for p in periodos))
        u["tst_ck_en_cama"] = float((dormido & cama).sum())  # misma ventana que el software de referencia
        bloque = mayor_bloque_sueno(dormido, t_min)
        if bloque:
            u["inicio_ck"], u["fin_ck"] = bloque
            u["tst_ck_auto"] = float(dormido[(t_min >= bloque[0]) & (t_min < bloque[1])].sum())
        u["inicio_ref"] = min(p[0] for p in periodos) / 60
        u["fin_ref"] = max(p[1] for p in periodos) / 60
        # V62: horas de vigilia continua al final del registro, desde el despertar
        u["vigilia_ref_h"] = (t_min.max() - u["fin_ref"]) / 60
        if bloque:
            u["vigilia_ck_h"] = (t_min.max() - u["fin_ck"]) / 60
        # concordancia minuto a minuto alrededor de la noche (18:00 d1 a 12:00 d2)
        m = (t_min >= 18 * 60) & (t_min <= 36 * 60) & con_dato
        u["ck_sens"] = float((dormido & ref & m).sum() / max((ref & m).sum(), 1))
        u["ck_espec"] = float((~dormido & ~ref & m).sum() / max((~ref & m).sum(), 1))
    return u


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--datos", required=True)
    ap.add_argument("--salida", default="resultados_senales.json")
    args = ap.parse_args()

    filas = [procesar_usuario(d) for d in sorted(Path(args.datos).glob("user_*"),
                                                  key=lambda p: int(p.name.split("_")[1]))]
    df = pd.DataFrame(filas)
    df.to_csv(Path(args.salida).with_suffix(".csv"), index=False)

    r = {"n_usuarios": len(df), "sin_registro_sueno": df.loc[~df.tiene_sueno, "usuario"].tolist()}
    s = df[df.tiene_sueno]
    r["V17_artefactos_pct_mediana"] = float(s["artefactos_pct"].median())
    r["V17_artefactos_pct_max"] = float(s["artefactos_pct"].max())
    r["V17_rmssd_crudo_vs_nk"] = bland_altman(s["rmssd_crudo"], s["rmssd_nk"])
    r["V17_rmssd_ligero_vs_nk"] = bland_altman(s["rmssd_ligero"], s["rmssd_nk"])
    limpio = s[s["artefactos_pct"] <= 10]
    r["V17_excluidos_artefactos_gt10pct"] = s.loc[s["artefactos_pct"] > 10, "usuario"].tolist()
    r["V17_rmssd_ligero_vs_nk_sin_ruidosos"] = bland_altman(limpio["rmssd_ligero"], limpio["rmssd_nk"])
    r["V17_rmssd_crudo_vs_nk_sin_ruidosos"] = bland_altman(limpio["rmssd_crudo"], limpio["rmssd_nk"])
    r["V17_sdnn_ligero_vs_nk_sin_ruidosos"] = bland_altman(limpio["sdnn_ligero"], limpio["sdnn_nk"])
    r["V17_sdnn_ligero_vs_nk"] = bland_altman(s["sdnn_ligero"], s["sdnn_nk"])
    r["V17_rmssd_nk_rango"] = [round(float(s["rmssd_nk"].min()), 1), round(float(s["rmssd_nk"].median()), 1),
                              round(float(s["rmssd_nk"].max()), 1)]
    r["V18_reloj_vs_rr"] = bland_altman(df["rhr_reloj"], df["rhr_rr"])
    r["V18_ventana_en_sueno_pct"] = round(float(df["rhr_en_sueno"].mean() * 100), 1)
    r["V18_reloj_vs_p5_noche"] = bland_altman(s["rhr_reloj"], s["fc_noche_p5"])
    r["V18_menor_movimiento_vs_sueno"] = bland_altman(s["rhr_reloj"], s["rhr_sueno"])
    r["V18_casos_menor_movimiento_mal"] = s.loc[(s["rhr_reloj"] - s["rhr_sueno"]).abs() > 10, "usuario"].tolist()
    r["A40_tst_ck_en_cama_vs_ref"] = bland_altman(s["tst_ck_en_cama"], s["tst_ref"])
    r["A40_tst_ck_auto_vs_ref"] = bland_altman(s["tst_ck_auto"], s["tst_ref"])
    r["A40_epocas_sens_mediana"] = round(float(s["ck_sens"].median()), 3)
    r["A40_epocas_espec_mediana"] = round(float(s["ck_espec"].median()), 3)
    r["V52_inicio_ck_vs_ref_min"] = bland_altman(s["inicio_ck"], s["inicio_ref"])
    r["V52_fin_ck_vs_ref_min"] = bland_altman(s["fin_ck"], s["fin_ref"])
    r["V62_vigilia_ck_vs_ref_h"] = bland_altman(s["vigilia_ck_h"], s["vigilia_ref_h"])
    # Exploratorio: ¿la HRV nocturna se relaciona con estrés/ansiedad en 1 sola noche?
    r["explora_rmssd_vs"] = {k: spearman_ic(s["rmssd_nk"], s[k])
                             for k in ["STAI1", "Daily_stress", "Pittsburgh", "panas_neg_media"]}
    r["explora_rhr_vs"] = {k: spearman_ic(df["rhr_reloj"], df[k]) for k in ["STAI1", "Daily_stress"]}

    Path(args.salida).write_text(json.dumps(r, indent=2, ensure_ascii=False), encoding="utf-8")
    print(json.dumps(r, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
