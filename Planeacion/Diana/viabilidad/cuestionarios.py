"""Prueba de viabilidad de los cuestionarios (Diana): 03:V1 PHQ-9 y 03:V2 PHQ-2 (puerta del PHQ-4).

Pregunta: si EVA solo pregunta el PHQ-2 (2 preguntas, ~10 s) en el check-in semanal y abre el
PHQ-9 completo cuando sale alto, ¿cuántos casos se pierde? ¿Y qué pasa con el ítem 9
(pensamientos de hacerse daño), que en la matriz de privacidad dispara alerta crítica?

Datos: NHANES 2015-2016 (DPQ_I) y 2017-2018 (DPQ_J), CDC. PHQ-9 ítem por ítem.
  Reglas de uso de NCHS: solo análisis estadístico; prohibido intentar identificar personas.

Uso:
  python cuestionarios.py --datos RUTA/nhanes [--salida resultados_cuestionarios.json]
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.metrics import roc_auc_score

SEED = 42
rng = np.random.default_rng(SEED)
ITEMS = [f"DPQ0{i}0" for i in range(1, 10)]  # DPQ010 ... DPQ090


def cargar(datos: Path) -> pd.DataFrame:
    partes = []
    for ciclo in ["I", "J"]:
        dpq = pd.read_sas(datos / f"DPQ_{ciclo}.xpt", format="xport")
        demo = pd.read_sas(datos / f"DEMO_{ciclo}.xpt", format="xport")[["SEQN", "RIAGENDR", "RIDAGEYR"]]
        partes.append(dpq.merge(demo, on="SEQN").assign(ciclo=ciclo))
    df = pd.concat(partes, ignore_index=True)
    df = df[(df.RIDAGEYR >= 18) & (df.RIDAGEYR <= 65)]  # rango de edad de astronautas en activo
    # 7 = se negó, 9 = no sabe -> respuesta no válida. Solo cuestionarios completos.
    df = df.dropna(subset=ITEMS)
    # pandas lee los ceros de SAS XPORT como 5.4e-79: redondear o todo cuenta como "> 0"
    df[ITEMS] = df[ITEMS].round().astype(int)
    df = df[(df[ITEMS] <= 3).all(axis=1)].copy()
    df["phq9"] = df[ITEMS].sum(axis=1)
    df["phq2"] = df["DPQ010"] + df["DPQ020"]
    df["item9"] = df["DPQ090"]
    df["sexo"] = df["RIAGENDR"].map({1: "hombre", 2: "mujer"})
    return df


def ic_prop(x: np.ndarray, n_boot=2000) -> list[float]:
    bs = [rng.choice(x, len(x)).mean() for _ in range(n_boot)]
    return [round(float(v) * 100, 1) for v in np.percentile(bs, [2.5, 97.5])]


def evaluar_puerta(df: pd.DataFrame, corte_phq2: int, corte_phq9: int = 10) -> dict:
    caso = (df.phq9 >= corte_phq9).to_numpy()
    abre = (df.phq2 >= corte_phq2).to_numpy()
    i9 = (df.item9 > 0).to_numpy()
    return {
        "corte_phq2": corte_phq2,
        "sensibilidad_pct": round(float(abre[caso].mean() * 100), 1),
        "sensibilidad_ic95": ic_prop(abre[caso].astype(float)),
        "especificidad_pct": round(float((~abre[~caso]).mean() * 100), 1),
        "abren_phq9_pct": round(float(abre.mean() * 100), 1),
        "casos_perdidos": int((caso & ~abre).sum()),
        "item9_positivos": int(i9.sum()),
        "item9_perdidos_por_la_puerta": int((i9 & ~abre).sum()),
        "item9_perdidos_pct": round(float((i9 & ~abre).sum() / max(i9.sum(), 1) * 100), 1),
    }


def regla_phq9(puntos: int, item9: int) -> str:
    """Regla de Diana (Tabla_Variables, 03:V1): item9 > 0 crítica; >= 15 roja; >= 10 amarilla."""
    if item9 > 0:
        return "critica"
    if puntos >= 15:
        return "roja"
    if puntos >= 10:
        return "amarilla"
    return "verde"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--datos", required=True)
    ap.add_argument("--salida", default="resultados_cuestionarios.json")
    args = ap.parse_args()
    df = cargar(Path(args.datos))

    r = {"n": int(len(df)), "por_sexo": df.sexo.value_counts().to_dict(),
         "prevalencia_phq9_ge10_pct": round(float((df.phq9 >= 10).mean() * 100), 1),
         "prevalencia_item9_pct": round(float((df.item9 > 0).mean() * 100), 2),
         "auc_phq2_para_phq9_ge10": round(float(roc_auc_score(df.phq9 >= 10, df.phq2)), 3)}
    r["puertas"] = [evaluar_puerta(df, c) for c in (1, 2, 3)]
    r["puerta3_por_sexo"] = {s: evaluar_puerta(g, 3) for s, g in df.groupby("sexo")}

    # Alternativa: PHQ-2 + ítem 9 siempre (3 preguntas)
    abre = (df.phq2 >= 3) | (df.item9 > 0)
    caso = df.phq9 >= 10
    r["puerta_phq2_mas_item9"] = {
        "sensibilidad_pct": round(float(abre[caso].mean() * 100), 1),
        "especificidad_pct": round(float((~abre[~caso]).mean() * 100), 1),
        "abren_phq9_pct": round(float(abre.mean() * 100), 1),
        "item9_perdidos": 0,
    }
    abre2 = (df.phq2 >= 2) | (df.item9 > 0)
    r["puerta_phq2ge2_mas_item9"] = {
        "sensibilidad_pct": round(float(abre2[caso].mean() * 100), 1),
        "sensibilidad_ic95": ic_prop(abre2[caso].to_numpy().astype(float)),
        "especificidad_pct": round(float((~abre2[~caso]).mean() * 100), 1),
        "abren_phq9_pct": round(float(abre2.mean() * 100), 1),
        "casos_perdidos": int((caso & ~abre2).sum()),
        "item9_perdidos": 0,
        "por_sexo_sensibilidad_pct": {s: round(float(abre2[caso & (df.sexo == s)].mean() * 100), 1)
                                      for s in ("hombre", "mujer")},
    }
    # Nivel que asignaría la regla de Diana
    niveles = df.apply(lambda f: regla_phq9(int(f.phq9), int(f.item9)), axis=1)
    r["regla_phq9_niveles_pct"] = (niveles.value_counts(normalize=True) * 100).round(2).to_dict()
    r["item9_con_phq9_menor_10_pct"] = round(float(((df.item9 > 0) & (df.phq9 < 10)).sum()
                                                   / max((df.item9 > 0).sum(), 1) * 100), 1)

    Path(args.salida).write_text(json.dumps(r, indent=2, ensure_ascii=False), encoding="utf-8")
    print(json.dumps(r, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
