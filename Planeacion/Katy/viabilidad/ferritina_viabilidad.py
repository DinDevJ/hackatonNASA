"""
Prueba de viabilidad · R19 (hemoglobina y ferritina vs. sangrado), Persona 5.

Pregunta: con datos que una astronauta puede dar a bordo o que ya están en su perfil
(edad, si tiene periodos regulares, anticonceptivos, hormonas, embarazos, menarquia,
IMC), ¿se puede predecir la deficiencia de hierro (ferritina < 15 µg/L) mejor que
adivinando? ¿Y mejor que la regla clínica de anemia (hemoglobina < 12 g/dL)?

Datos: NHANES 2017-2018 (públicos). Se descargan con:
    node Planeacion/Katy/scripts/descargar-datos-tierra.mjs --out datos-tierra

Uso:
    python Planeacion/Katy/viabilidad/ferritina_viabilidad.py --datos datos-tierra/nhanes

Requisitos: Python 3.10+, pandas, numpy, scikit-learn.

Criterio de viabilidad (decisión del equipo, convención usual para AUC):
    AUC >= 0.70 -> útil · 0.60-0.70 -> débil · < 0.60 -> no viable
"""

from __future__ import annotations

import argparse
import json
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
FERRITINA_CORTE = 15.0  # µg/L, deficiencia de hierro (OMS); se reporta también 30
HB_ANEMIA = 12.0  # g/dL, anemia en mujeres no embarazadas (OMS)


def leer(datos: Path, archivo: str) -> pd.DataFrame:
    return pd.read_sas(datos / f"{archivo}.xpt", format="xport")


def preparar(datos: Path) -> pd.DataFrame:
    demo = leer(datos, "DEMO_J")[["SEQN", "RIAGENDR", "RIDAGEYR", "RIDEXPRG"]]
    rhq = leer(datos, "RHQ_J")[["SEQN", "RHQ010", "RHQ031", "RHQ131", "RHQ160", "RHQ420", "RHQ540"]]
    fer = leer(datos, "FERTIN_J")[["SEQN", "LBXFER"]]
    cbc = leer(datos, "CBC_J")[["SEQN", "LBXHGB"]]
    bmx = leer(datos, "BMX_J")[["SEQN", "BMXBMI"]]

    df = demo.merge(rhq, on="SEQN").merge(fer, on="SEQN").merge(cbc, on="SEQN", how="left")
    df = df.merge(bmx, on="SEQN", how="left")

    # Mujeres de 20 a 49 años (rango de edad parecido al de astronautas en activo),
    # sin embarazo (RIDEXPRG = 1 es embarazo positivo) y con ferritina medida.
    df = df[(df.RIAGENDR == 2) & df.RIDAGEYR.between(20, 49) & (df.RIDEXPRG != 1)]
    df = df[df.LBXFER.notna()].copy()

    # Códigos de NHANES: 1 = sí, 2 = no, 7/9 = no sabe o se negó -> faltante.
    for c in ["RHQ031", "RHQ131", "RHQ420", "RHQ540"]:
        df[c] = df[c].map({1.0: 1.0, 2.0: 0.0})
    df.loc[df.RHQ010 > 90, "RHQ010"] = np.nan  # 777/999 = no sabe
    df.loc[df.RHQ160 > 90, "RHQ160"] = np.nan
    df.loc[df.RHQ131 == 0, "RHQ160"] = 0.0  # nunca embarazada -> 0 embarazos
    return df


PERFIL = {
    "RIDAGEYR": "edad",
    "RHQ031": "periodos regulares en 12 meses",
    "RHQ420": "ha tomado anticonceptivos orales",
    "RHQ540": "ha usado hormonas femeninas",
    "RHQ160": "número de embarazos",
    "RHQ010": "edad de la primera menstruación",
    "BMXBMI": "índice de masa corporal",
}


def auc_ic(y: np.ndarray, p: np.ndarray, n: int = 1000) -> tuple[float, float, float]:
    rng = np.random.default_rng(SEED)
    base = roc_auc_score(y, p)
    vals = []
    for _ in range(n):
        idx = rng.integers(0, len(y), len(y))
        if y[idx].min() == y[idx].max():
            continue
        vals.append(roc_auc_score(y[idx], p[idx]))
    lo, hi = np.percentile(vals, [2.5, 97.5])
    return base, lo, hi


def veredicto(auc: float) -> str:
    if auc >= 0.70:
        return "útil"
    if auc >= 0.60:
        return "débil"
    return "no viable"


def evaluar(df: pd.DataFrame, corte: float) -> dict:
    y = (df.LBXFER < corte).astype(int).to_numpy()
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=SEED)
    out: dict = {"corte_ferritina": corte, "n": int(len(y)), "prevalencia": float(y.mean())}

    # 1) Respuesta trivial: decir siempre "no hay deficiencia".
    out["trivial"] = {"exactitud": float(1 - y.mean()), "auc": 0.5}

    # 2) Regla clínica de anemia (requiere laboratorio; en vuelo no hay).
    con_hb = df.LBXHGB.notna().to_numpy()
    hb = df.LBXHGB.to_numpy()
    regla = (hb < HB_ANEMIA).astype(int)
    yy, rr = y[con_hb], regla[con_hb]
    sens = float(rr[yy == 1].mean())
    espec = float(1 - rr[yy == 0].mean())
    a, lo, hi = auc_ic(yy, -hb[con_hb])  # hemoglobina más baja = más riesgo
    out["regla_anemia"] = {
        "sensibilidad": sens,
        "especificidad": espec,
        "auc_hemoglobina_continua": [a, lo, hi],
        "veredicto": veredicto(a),
        "n": int(con_hb.sum()),
    }

    # 3) Modelos con datos del perfil (sin laboratorio): lo que sí se tendría a bordo.
    X = df[list(PERFIL)].to_numpy(dtype=float)
    modelos = {
        "regresion_logistica": make_pipeline(
            SimpleImputer(strategy="median"), StandardScaler(), LogisticRegression(max_iter=1000)
        ),
        "gradient_boosting": HistGradientBoostingClassifier(max_depth=3, learning_rate=0.05, random_state=SEED),
    }
    for nombre, m in modelos.items():
        p = cross_val_predict(m, X, y, cv=cv, method="predict_proba")[:, 1]
        a, lo, hi = auc_ic(y, p)
        out[f"perfil_{nombre}"] = {"auc": [a, lo, hi], "veredicto": veredicto(a)}

    # 4) Perfil + hemoglobina (laboratorio antes del vuelo).
    Xh = df.loc[con_hb, list(PERFIL) + ["LBXHGB"]].to_numpy(dtype=float)
    p = cross_val_predict(modelos["regresion_logistica"], Xh, y[con_hb], cv=cv, method="predict_proba")[:, 1]
    a, lo, hi = auc_ic(y[con_hb], p)
    out["perfil_mas_hemoglobina"] = {"auc": [a, lo, hi], "veredicto": veredicto(a)}

    # Pesos de la regresión logística (perfil), para explicar qué variable empuja más.
    m = modelos["regresion_logistica"].fit(X, y)
    coefs = m.named_steps["logisticregression"].coef_[0]
    out["pesos_perfil"] = {PERFIL[k]: round(float(c), 3) for k, c in zip(PERFIL, coefs)}
    return out


def imprimir(r: dict) -> None:
    f = lambda t: f"{t[0]:.2f} (IC 95 % {t[1]:.2f}–{t[2]:.2f})"
    print(f"\n=== Ferritina < {r['corte_ferritina']:.0f} µg/L · n = {r['n']} · prevalencia {r['prevalencia']:.1%}")
    print(f"Trivial ('nadie tiene deficiencia'): exactitud {r['trivial']['exactitud']:.1%}, AUC 0.50")
    ra = r["regla_anemia"]
    print(
        f"Regla anemia Hb < {HB_ANEMIA} g/dL (laboratorio): sensibilidad {ra['sensibilidad']:.1%}, "
        f"especificidad {ra['especificidad']:.1%}; AUC Hb continua {f(ra['auc_hemoglobina_continua'])} -> {ra['veredicto']}"
    )
    for k in ["perfil_regresion_logistica", "perfil_gradient_boosting", "perfil_mas_hemoglobina"]:
        print(f"{k}: AUC {f(r[k]['auc'])} -> {r[k]['veredicto']}")
    print("Pesos (regresión logística, perfil, variables estandarizadas):", r["pesos_perfil"])


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--datos", required=True, type=Path, help="Carpeta con los .xpt de NHANES")
    ap.add_argument("--json", type=Path, help="Guardar resultados en JSON")
    args = ap.parse_args()

    df = preparar(args.datos)
    resultados = [evaluar(df, FERRITINA_CORTE), evaluar(df, 30.0)]
    for r in resultados:
        imprimir(r)
    if args.json:
        args.json.write_text(json.dumps(resultados, indent=2, ensure_ascii=False), encoding="utf-8")


if __name__ == "__main__":
    main()
