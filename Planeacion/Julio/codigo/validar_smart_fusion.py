"""
Valida smart_fusion.py contra el dataset BIDMC de PhysioNet.

Referencia: las anotaciones manuales de respiración de dos anotadores
(`bidmc_XX_Breaths.csv`). La frecuencia de referencia de una ventana es el
número de respiraciones anotadas dividido por la duración de la ventana,
promediando los dos anotadores.

Uso:  python3 validar_smart_fusion.py <carpeta_bidmc_csv>
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).parent))
from smart_fusion import smart_fusion  # noqa: E402

FS = 125.0          # Hz, frecuencia de muestreo de BIDMC
WINDOW_S = 32.0
STEP_S = 4.0


def ref_rr(breath_samples: np.ndarray, start_s: float, end_s: float) -> float | None:
    """
    Frecuencia de referencia de una ventana, en resp/min.

    Se usa el intervalo MEDIANO entre respiraciones, no el conteo. Contar
    respiraciones en 32 s cuantiza la referencia en pasos de 60/32 = 1,875 rpm,
    y ese ruido es de la referencia, no del algoritmo. La mediana del intervalo
    da resolución continua y resiste una anotación perdida.
    """
    t = breath_samples / FS
    sel = t[(t >= start_s) & (t < end_s)]
    if len(sel) < 3:
        return None
    intervalos = np.diff(sel)
    intervalos = intervalos[intervalos > 0.5]  # descarta anotaciones dobles
    if len(intervalos) < 2:
        return None
    return float(60.0 / np.median(intervalos))


def evaluar(carpeta: Path, sd_threshold: float, verbose: bool = False):
    errores, n_win, n_desc, registros = [], 0, 0, 0
    for sig_path in sorted(carpeta.glob("bidmc_*_Signals.csv")):
        rec = sig_path.name.split("_")[1]
        br_path = carpeta / f"bidmc_{rec}_Breaths.csv"
        if not br_path.exists():
            continue

        df = pd.read_csv(sig_path)
        df.columns = [c.strip() for c in df.columns]
        if "PLETH" not in df.columns:
            continue
        ppg = df["PLETH"].to_numpy(dtype=float)
        if not np.all(np.isfinite(ppg)):
            ppg = np.nan_to_num(ppg, nan=float(np.nanmean(ppg)))

        br = pd.read_csv(br_path)
        anns = [br.iloc[:, i].dropna().to_numpy(dtype=float) for i in range(min(2, br.shape[1]))]

        estimaciones = smart_fusion(ppg, FS, window_s=WINDOW_S, step_s=STEP_S,
                                    sd_threshold=sd_threshold)
        registros += 1
        for e in estimaciones:
            n_win += 1
            if e.discarded or e.rr_fused is None:
                n_desc += 1
                continue
            s = e.t_center_s - WINDOW_S / 2.0
            refs = [r for r in (ref_rr(a, s, s + WINDOW_S) for a in anns) if r is not None]
            if not refs:
                continue
            errores.append(e.rr_fused - float(np.mean(refs)))

    if not errores:
        return None
    err = np.array(errores)
    return {
        "umbral": sd_threshold,
        "registros": registros,
        "ventanas": n_win,
        "cobertura_%": 100.0 * (n_win - n_desc) / n_win if n_win else 0.0,
        "comparadas": len(err),
        "sesgo": float(np.mean(err)),
        "sd": float(np.std(err, ddof=1)),
        "loa_inf": float(np.mean(err) - 1.96 * np.std(err, ddof=1)),
        "loa_sup": float(np.mean(err) + 1.96 * np.std(err, ddof=1)),
        "mae": float(np.mean(np.abs(err))),
        "dentro_2rpm_%": float(100.0 * np.mean(np.abs(err) <= 2.0)),
    }


def main() -> None:
    carpeta = Path(sys.argv[1] if len(sys.argv) > 1 else ".")
    print(f"Dataset: {carpeta}  ·  ventana {WINDOW_S:.0f} s  ·  paso {STEP_S:.0f} s\n")
    print(f"{'umbral':>7} {'cobertura':>10} {'n':>6} {'sesgo':>8} {'SD':>7} "
          f"{'LoA 95%':>18} {'MAE':>7} {'±2 rpm':>8}")
    print("-" * 78)
    mejores = []
    for thr in (1.0, 2.0, 3.0, 4.0, 6.0, 1e9):
        r = evaluar(carpeta, thr)
        if r is None:
            continue
        mejores.append(r)
        etiqueta = "sin filtro" if thr > 1e6 else f"{thr:.0f}"
        print(f"{etiqueta:>7} {r['cobertura_%']:>9.1f}% {r['comparadas']:>6} "
              f"{r['sesgo']:>+8.2f} {r['sd']:>7.2f} "
              f"[{r['loa_inf']:>+6.1f},{r['loa_sup']:>+6.1f}] "
              f"{r['mae']:>7.2f} {r['dentro_2rpm_%']:>7.1f}%")
    if mejores:
        print(f"\nRegistros usados: {mejores[0]['registros']}  ·  "
              f"ventanas evaluadas: {mejores[0]['ventanas']}")
        print("Unidades: respiraciones por minuto. LoA = límites de concordancia de Bland-Altman.")


if __name__ == "__main__":
    main()
