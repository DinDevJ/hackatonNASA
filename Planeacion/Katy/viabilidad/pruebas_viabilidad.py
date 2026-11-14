"""
Pruebas de viabilidad de Persona 5 (Katy) con datos públicos de Tierra.

    A43 + A47  intestino: ¿la frecuencia de evacuación sirve para detectar
               estreñimiento o diarrea (definidos con la escala de Bristol)?
    R23        densidad ósea: ¿el perfil hormonal y corporal predice hueso bajo?
    A22d       proteína en orina: ¿una lectura de concentración, como la de una tira,
               sirve frente al estándar corregido por creatinina?
    A45        dolor de espalda: ¿el perfil de salud predice dolor de espalda frecuente?

La prueba de ferritina (R19) está aparte, en ferritina_viabilidad.py.

Datos: se descargan con
    node Planeacion/Katy/scripts/descargar-datos-tierra.mjs --out datos-tierra

Uso:
    python Planeacion/Katy/viabilidad/pruebas_viabilidad.py --datos datos-tierra

Requisitos: Python 3.10+, pandas, numpy, scikit-learn.

Criterio de viabilidad (decisión del equipo, convención usual para AUC):
    AUC >= 0.70 -> útil · 0.60-0.70 -> débil · < 0.60 -> no viable
"""

from __future__ import annotations

import argparse
import json
import zipfile
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score
from sklearn.model_selection import StratifiedKFold, cross_val_predict
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

SEED = 42
CV = StratifiedKFold(n_splits=5, shuffle=True, random_state=SEED)


# ---------------------------------------------------------------- utilidades


def xpt(carpeta: Path, archivo: str, columnas: list[str] | None = None) -> pd.DataFrame:
    df = pd.read_sas(carpeta / f"{archivo}.xpt", format="xport")
    return df[columnas] if columnas else df


def auc_ic(y: np.ndarray, p: np.ndarray, n: int = 1000) -> list[float]:
    rng = np.random.default_rng(SEED)
    vals = []
    for _ in range(n):
        idx = rng.integers(0, len(y), len(y))
        if y[idx].min() != y[idx].max():
            vals.append(roc_auc_score(y[idx], p[idx]))
    lo, hi = np.percentile(vals, [2.5, 97.5])
    return [round(float(roc_auc_score(y, p)), 3), round(float(lo), 3), round(float(hi), 3)]


def veredicto(auc: float) -> str:
    return "útil" if auc >= 0.70 else "débil" if auc >= 0.60 else "no viable"


def regla(y: np.ndarray, pred: np.ndarray) -> dict:
    return {
        "sensibilidad": round(float(pred[y == 1].mean()), 3),
        "especificidad": round(float(1 - pred[y == 0].mean()), 3),
    }


def modelo_cv(X: np.ndarray, y: np.ndarray) -> dict:
    out = {}
    logit = make_pipeline(SimpleImputer(strategy="median"), StandardScaler(), LogisticRegression(max_iter=2000))
    gb = HistGradientBoostingClassifier(max_depth=3, learning_rate=0.05, random_state=SEED)
    for nombre, m in {"regresion_logistica": logit, "gradient_boosting": gb}.items():
        p = cross_val_predict(m, X, y, cv=CV, method="predict_proba")[:, 1]
        a = auc_ic(y, p)
        out[nombre] = {"auc": a, "veredicto": veredicto(a[0])}
    return out


def limpiar(serie: pd.Series, validos: range | list) -> pd.Series:
    return serie.where(serie.isin(list(validos)))


# ---------------------------------------------------------------- A43 + A47


def intestino(nhanes: Path) -> dict:
    partes = []
    for bhq, demo in [("BHQ_D", "DEMO_D"), ("BHQ_E", "DEMO_E"), ("BHQ_F", "DEMO_F")]:
        b = xpt(nhanes, bhq, ["SEQN", "BHD050", "BHQ060"])
        d = xpt(nhanes, demo, ["SEQN", "RIAGENDR", "RIDAGEYR"])
        partes.append(b.merge(d, on="SEQN"))
    df = pd.concat(partes)
    df = df[df.RIDAGEYR.between(20, 59)]
    df = df[df.BHQ060.between(1, 7) & df.BHD050.between(1, 100)].copy()
    df["mujer"] = (df.RIAGENDR == 2).astype(float)

    out = {"n": int(len(df)), "ciclos": "NHANES 2005-2010", "edad": "20-59"}
    freq = df.BHD050.to_numpy(float)
    X = df[["BHD050", "RIDAGEYR", "mujer"]].to_numpy(float)

    for nombre, y, regla_pred, signo in [
        ("estrenimiento", df.BHQ060.isin([1, 2]), freq < 3, -1),  # menos evacuaciones = más riesgo
        ("diarrea", df.BHQ060.isin([6, 7]), freq > 21, 1),  # más de 3 al día
    ]:
        y = y.to_numpy(int)
        a = auc_ic(y, signo * freq)
        out[nombre] = {
            "prevalencia": round(float(y.mean()), 3),
            "prevalencia_mujeres": round(float(y[df.mujer == 1].mean()), 3),
            "prevalencia_hombres": round(float(y[df.mujer == 0].mean()), 3),
            "regla": {"definicion": "< 3 por semana" if signo < 0 else "> 21 por semana", **regla(y, regla_pred)},
            "solo_frecuencia_auc": a,
            "veredicto_frecuencia": veredicto(a[0]),
            "frecuencia_edad_sexo": modelo_cv(X, y),
        }
    return out


# ---------------------------------------------------------------- R23

# Referencia de cuello femoral, mujeres jóvenes (NHANES III; Looker et al. 1998):
# media 0,858 g/cm², DE 0,120. Es la referencia que usa la OMS para el T-score.
FN_MEDIA, FN_DE = 0.858, 0.120


def hueso(nhanes: Path) -> dict:
    fem = xpt(nhanes, "DXXFEM_J", ["SEQN", "DXXNKBMD"])
    demo = xpt(nhanes, "DEMO_J", ["SEQN", "RIAGENDR", "RIDAGEYR"])
    rhq = xpt(nhanes, "RHQ_J", ["SEQN", "RHQ010", "RHQ060", "RHQ160", "RHQ420", "RHQ540"])
    bmx = xpt(nhanes, "BMX_J", ["SEQN", "BMXBMI"])
    df = fem.merge(demo, on="SEQN").merge(rhq, on="SEQN").merge(bmx, on="SEQN", how="left")
    df = df[(df.RIAGENDR == 2) & df.DXXNKBMD.notna()].copy()

    for c in ["RHQ420", "RHQ540"]:
        df[c] = df[c].map({1.0: 1.0, 2.0: 0.0})
    for c in ["RHQ010", "RHQ060", "RHQ160"]:
        df.loc[df[c] > 90, c] = np.nan
    df["anios_sin_menstruar"] = (df.RIDAGEYR - df.RHQ060).clip(lower=0)

    t = (df.DXXNKBMD - FN_MEDIA) / FN_DE
    y = (t <= -1.0).to_numpy(int)  # osteopenia u osteoporosis
    perfil = ["RIDAGEYR", "anios_sin_menstruar", "RHQ540", "RHQ420", "BMXBMI", "RHQ160", "RHQ010"]
    return {
        "n": int(len(df)),
        "edad": "50-80 (NHANES 2017-2018 solo midió fémur en ese rango)",
        "prevalencia_T_menor_igual_-1": round(float(y.mean()), 3),
        "prevalencia_T_menor_igual_-2.5": round(float((t <= -2.5).mean()), 3),
        "solo_edad_auc": auc_ic(y, df.RIDAGEYR.to_numpy(float)),
        "solo_imc_auc": auc_ic(y, -df.BMXBMI.fillna(df.BMXBMI.median()).to_numpy(float)),
        "perfil_completo": modelo_cv(df[perfil].to_numpy(float), y),
    }


# ---------------------------------------------------------------- A22d


def albumina(nhanes: Path) -> dict:
    a = xpt(nhanes, "ALB_CR_J", ["SEQN", "URXUMA", "URXUCR", "URDACT"])
    d = xpt(nhanes, "DEMO_J", ["SEQN", "RIAGENDR", "RIDAGEYR"])
    df = a.merge(d, on="SEQN")
    df = df[df.RIDAGEYR.between(20, 59) & df.URDACT.notna() & df.URXUMA.notna()].copy()

    y = (df.URDACT >= 30).to_numpy(int)  # albuminuria: cociente albúmina/creatinina >= 30 mg/g
    conc = df.URXUMA.to_numpy(float)  # mg/L, lo que se parece a una lectura de tira
    pred = conc >= 30
    out = {
        "n": int(len(df)),
        "prevalencia_albuminuria": round(float(y.mean()), 3),
        "solo_concentracion_auc": auc_ic(y, conc),
        "regla_concentracion_30mgL": regla(y, pred),
    }
    # Orina concentrada (cuartil más alto de creatinina) vs. diluida (cuartil más bajo):
    # en vuelo se toma menos agua, así que la orina tiende a estar concentrada.
    q1, q3 = df.URXUCR.quantile([0.25, 0.75])
    for etiqueta, mascara in [("orina_diluida", df.URXUCR <= q1), ("orina_concentrada", df.URXUCR >= q3)]:
        m = mascara.to_numpy()
        neg = y[m] == 0
        out[etiqueta] = {
            "n": int(m.sum()),
            "falsos_positivos_entre_sanos": round(float(pred[m][neg].mean()), 3),
            "sensibilidad": round(float(pred[m][y[m] == 1].mean()), 3) if (y[m] == 1).any() else None,
        }
    return out


# ---------------------------------------------------------------- A45


def espalda(nhis_zip: Path) -> dict:
    with zipfile.ZipFile(nhis_zip) as z:
        nombre = next(n for n in z.namelist() if n.endswith(".csv"))
        cols = ["PAIBACK3M_A", "AGEP_A", "SEX_A", "BMICAT_A", "DEPEV_A", "ANXEV_A", "ARTHEV_A",
                "HYPEV_A", "SMKCIGST_A", "PHSTAT_A", "EMPWRKLSWK_A"]
        df = pd.read_csv(z.open(nombre), usecols=cols)

    df = df[df.PAIBACK3M_A.between(1, 4) & df.AGEP_A.between(18, 64)].copy()
    y = df.PAIBACK3M_A.isin([3, 4]).to_numpy(int)  # la mayoría de los días o todos los días
    df["SEX_A"] = limpiar(df.SEX_A, [1, 2])
    df["BMICAT_A"] = limpiar(df.BMICAT_A, [1, 2, 3, 4])
    for c in ["DEPEV_A", "ANXEV_A", "ARTHEV_A", "HYPEV_A", "EMPWRKLSWK_A"]:
        df[c] = limpiar(df[c], [1, 2]).map({1: 1.0, 2: 0.0})
    df["SMKCIGST_A"] = limpiar(df.SMKCIGST_A, [1, 2, 3, 4])
    df["PHSTAT_A"] = limpiar(df.PHSTAT_A, [1, 2, 3, 4, 5])

    X = df.drop(columns=["PAIBACK3M_A"]).to_numpy(float)
    mujer = (df.SEX_A == 2).to_numpy()
    return {
        "n": int(len(df)),
        "fuente": "NHIS 2019, adultos de 18 a 64",
        "prevalencia": round(float(y.mean()), 3),
        "prevalencia_mujeres": round(float(y[mujer].mean()), 3),
        "prevalencia_hombres": round(float(y[~mujer].mean()), 3),
        "perfil_de_salud": modelo_cv(X, y),
    }


# ---------------------------------------------------------------- main


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--datos", required=True, type=Path, help="Carpeta creada por descargar-datos-tierra.mjs")
    ap.add_argument("--json", type=Path, help="Guardar resultados en JSON")
    args = ap.parse_args()
    nhanes = args.datos / "nhanes"

    resultados = {
        "A43_A47_intestino": intestino(nhanes),
        "R23_densidad_osea": hueso(nhanes),
        "A22d_albumina_orina": albumina(nhanes),
        "A45_dolor_espalda": espalda(args.datos / "nhis" / "adult19csv.zip"),
    }
    print(json.dumps(resultados, indent=2, ensure_ascii=False))
    if args.json:
        args.json.write_text(json.dumps(resultados, indent=2, ensure_ascii=False), encoding="utf-8")


if __name__ == "__main__":
    main()
