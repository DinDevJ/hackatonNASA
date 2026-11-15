"""Validacion externa del motor de padecimientos con datos ABIERTOS de Inspiration4 (NASA OSDR).

Fuente (acceso publico, sin registro ni acuerdo de uso):
  OSD-569 / LSDS-7  Complete Blood Count (Quest Diagnostics)   https://osdr.nasa.gov/bio/repo/data/studies/OSD-569
  OSD-575 / LSDS-8  Comprehensive Metabolic Panel + panel cardiovascular Eve (CRP)  https://osdr.nasa.gov/bio/repo/data/studies/OSD-575
Datos reales de 4 civiles (C001-C004), 3 dias en orbita. NO son SIMULADO. Etiqueta: "Inspiration4 (OSDR, abierto)".
No hay muestras de sangre en vuelo en estos archivos: solo PRE (L-92, L-44, L-3) y POST (R+1, R+45, R+82, R+194).
Uso: python -m validacion.inspiration4 [--dir /tmp/i4] [--json salida.json]   (desde prototipo-salud/)
PROVISIONAL. No es un diagnostico.
"""
from __future__ import annotations

import argparse
import json
import sys
import tempfile
import urllib.request
from datetime import date, timedelta
from pathlib import Path

import pandas as pd

RAIZ = Path(__file__).resolve().parents[1]
if str(RAIZ) not in sys.path:
    sys.path.insert(0, str(RAIZ))

from motor import entradas, evaluacion  # noqa: E402

ETIQUETA = "Inspiration4 (OSDR, abierto)"
BASE = "https://osdr.nasa.gov/geode-py/ws/studies/{osd}/download?source=datamanager&file={f}"
ARCHIVOS = {
    "cbc": ("OSD-569", "LSDS-7_Complete_Blood_Count_CBC.upload_SUBMITTED.csv"),
    "cmp": ("OSD-575", "LSDS-8_Comprehensive_Metabolic_Panel_CMP.upload_SUBMITTED.csv"),
    "cv": ("OSD-575", "LSDS-8_Multiplex_serum.cardiovascular.EvePanel_SUBMITTED.csv"),
}
# Fechas publicas de la mision: lanzamiento 2021-09-16 (UTC), amerizaje 2021-09-18 (UTC).
LANZAMIENTO = date(2021, 9, 16)
AMERIZAJE = date(2021, 9, 18)
PUNTOS = ["L-92", "L-44", "L-3", "R+1", "R+45", "R+82", "R+194"]

# analito OSDR -> (variable_id del motor, unidad, factor)
MAPA_LAB = {
    "WHITE BLOOD CELL COUNT": ("04:A10", "10^3/uL", 1.0),
    "ABSOLUTE LYMPHOCYTES": ("01:V98", "cel/uL", 1.0),
    "ABSOLUTE NEUTROPHILS": ("01:V99", "cel/uL", 1.0),
    "PLATELET COUNT": ("01:V60", "10^3/uL", 1.0),
    "HEMOGLOBIN": ("01:V108", "g/dL", 1.0),
    "HEMATOCRIT": ("01:V109", "%", 1.0),
    "POTASSIUM": ("01:V39", "mmol/L", 1.0),
    "SODIUM": ("02:V31", "mmol/L", 1.0),
    "CALCIUM": ("02:V14", "mg/dL", 1.0),
}
# CRP del panel Eve viene en pg/mL; 1 mg/L = 1e6 pg/mL
MAPA_CV = {"CRP": ("04:A13", "mg/L", 1e-6)}


def fecha_de(tp: str) -> date:
    tp = tp.strip()
    n = int(tp[2:])
    return LANZAMIENTO - timedelta(days=n) if tp.startswith("L-") else AMERIZAJE + timedelta(days=n)


def descargar(dir_: Path) -> dict[str, Path]:
    dir_.mkdir(parents=True, exist_ok=True)
    out = {}
    for k, (osd, f) in ARCHIVOS.items():
        p = dir_ / f
        if not p.exists():
            urllib.request.urlretrieve(BASE.format(osd=osd, f=f), p)
        out[k] = p
    return out


def _fila(sid, tp, var, val, unidad, analito, archivo):
    return {"subject_id": f"I4-{sid}", "timestamp": fecha_de(tp).isoformat(), "variable_id": var,
            "value": f"{val:g}", "unit": unidad, "device_class": "laboratorio", "quality": "buena", "context": "",
            "method": "", "simulated": "false",
            "notes": f"{ETIQUETA}; {archivo}; {analito} {tp}; hora de extraccion no reportada"}


def a_nativo(rutas: dict[str, Path]) -> pd.DataFrame:
    filas = []
    for k in ("cbc", "cmp"):
        d = pd.read_csv(rutas[k], dtype=str, keep_default_na=False)
        col_tp = "TEST_DATE" if "TEST_DATE" in d.columns else "timepoint"
        for r in d.itertuples(index=False):
            m = MAPA_LAB.get(str(r.ANALYTE).strip().upper())
            v = pd.to_numeric(r.VALUE, errors="coerce")
            if m is None or pd.isna(v):
                continue
            filas.append(_fila(r.SUBJECT_ID, getattr(r, col_tp), m[0], float(v) * m[2], m[1], r.ANALYTE,
                               rutas[k].name))
    d = pd.read_csv(rutas["cv"], dtype=str, keep_default_na=False)
    for r in d.itertuples(index=False):
        m = MAPA_CV.get(str(r.Analyte).strip())
        v = pd.to_numeric(r.Concentration, errors="coerce")
        if m is None or pd.isna(v):
            continue
        filas.append(_fila(r.ID, r.Timepoint, m[0], float(v) * m[2], m[1], r.Analyte, rutas["cv"].name))
    return pd.DataFrame(filas, columns=entradas.cal.NATIVO_COLUMNAS)


def sexos(rutas) -> dict:
    d = pd.read_csv(rutas["cbc"], dtype=str)
    return {f"I4-{s}": {"sexo": x} for s, x in d.groupby("SUBJECT_ID")["SEX"].first().items() if x in ("M", "F")}


def evaluar_por_punto(nat: pd.DataFrame, perfiles: dict, params: dict | None = None) -> tuple[list[dict], list[dict]]:
    """Evalua de forma acumulada hasta cada punto (como lo veria la central ese dia). BD/estado temporales; nada se guarda."""
    mision = {sid: {"lanzamiento": LANZAMIENTO.isoformat(), "aterrizaje": AMERIZAJE.isoformat()}
              for sid in nat["subject_id"].unique()}
    pads, vars_ = [], []
    with tempfile.TemporaryDirectory() as tmp:
        for tp in PUNTOS:
            sub = nat[nat["timestamp"] <= fecha_de(tp).isoformat()]
            obs, rech, _ = entradas.desde_nativo(sub)
            res = evaluacion.evaluar(obs, mision=mision, perfiles=perfiles, canal="real", params=params,
                                     ruta_estado=Path(tmp) / f"estado_{tp}.json", guardar=False, rechazadas=rech)
            for sid, pr in res["personas"].items():
                for it in pr.get("padecimientos", []):
                    pads.append({"punto": tp, "subject_id": sid, "padecimiento": it.get("padecimiento_id"),
                                 "color": it.get("color"), "T": it.get("T"), "T_inf": it.get("T_inf"),
                                 "cobertura": it.get("cobertura")})
                for vid, v in (pr.get("variables") or {}).items():
                    vars_.append({"punto": tp, "subject_id": sid, "variable_id": vid, "z": v.get("z"),
                                  "estado": v.get("estado")})
    return pads, vars_


def banderas_laboratorio(rutas) -> pd.DataFrame:
    """Fuera del intervalo de referencia que el propio laboratorio (Quest) reporta en el archivo OSDR."""
    out = []
    for k in ("cbc", "cmp"):
        d = pd.read_csv(rutas[k], dtype=str, keep_default_na=False)
        col_tp = "TEST_DATE" if "TEST_DATE" in d.columns else "timepoint"
        for r in d.itertuples(index=False):
            m = MAPA_LAB.get(str(r.ANALYTE).strip().upper())
            v, lo, hi = (pd.to_numeric(x, errors="coerce") for x in (r.VALUE, r.RANGE_MIN, r.RANGE_MAX))
            if m is None or pd.isna(v):
                continue
            if (not pd.isna(lo) and v < lo) or (not pd.isna(hi) and v > hi):
                out.append({"punto": getattr(r, col_tp), "subject_id": f"I4-{r.SUBJECT_ID}", "variable_id": m[0],
                            "valor": float(v), "rango_lab": f"{r.RANGE_MIN}-{r.RANGE_MAX}"})
    return pd.DataFrame(out)


def resumen(nat, rutas) -> dict:
    pf = sexos(rutas)
    base_p, base_v = evaluar_por_punto(nat, pf)
    sens_p, sens_v = evaluar_por_punto(nat, pf, params={"n0_min": 3})
    return {"filas_nativas": len(nat), "tripulantes": int(nat["subject_id"].nunique()),
            "defecto": {"padecimientos": base_p, "variables": base_v},
            "sensibilidad_n0_min_3": {"padecimientos": sens_p, "variables": sens_v},
            "banderas_laboratorio": banderas_laboratorio(rutas).to_dict("records")}


def _imprimir(r: dict) -> None:
    print(f"{ETIQUETA}: {r['filas_nativas']} filas, {r['tripulantes']} tripulantes. PROVISIONAL, no es diagnostico.")
    for k in ("defecto", "sensibilidad_n0_min_3"):
        p = pd.DataFrame(r[k]["padecimientos"])
        print(f"\n[{k}] colores por punto (conteo tripulante x padecimiento):")
        print(p.pivot_table(index="color", columns="punto", values="padecimiento", aggfunc="count")
              .reindex(columns=PUNTOS).fillna(0).astype(int).to_string())
        v = pd.DataFrame(r[k]["variables"])
        v["z"] = pd.to_numeric(v["z"], errors="coerce")
        v = v[v["z"].notna() & (v["z"].abs() >= 2)]
        print(f"[{k}] variables con |z| >= 2:" + ("" if len(v) else " ninguna"))
        if len(v):
            print(v.assign(z=v["z"].round(2)).to_string(index=False))
    b = pd.DataFrame(r["banderas_laboratorio"])
    print("\n[laboratorio] fuera de su intervalo de referencia:")
    print(b.to_string(index=False) if len(b) else "ninguna")


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--dir", default=str(Path(tempfile.gettempdir()) / "i4_osdr"))
    ap.add_argument("--json", default=None)
    a = ap.parse_args(argv)
    rutas = descargar(Path(a.dir))
    r = resumen(a_nativo(rutas), rutas)
    _imprimir(r)
    if a.json:
        Path(a.json).write_text(json.dumps(r, ensure_ascii=False, indent=1, default=str), encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
