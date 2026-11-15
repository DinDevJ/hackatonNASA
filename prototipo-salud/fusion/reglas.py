"""Reglas EXPERIMENTALES, transparentes y configurables (PASO 6). Sin entrenamiento, sin LLM.

Ninguna regla es un diagnostico, ninguna entrega un porcentaje de riesgo y ninguna esta validada en
astronautas. Una alerta solo recomienda revision humana (cirujano de vuelo / clinico). Si alguna fila que
activo la regla es simulada, la alerta lo declara.
"""
from __future__ import annotations

import copy
import math
from typing import Any

import pandas as pd

from core.formato import fila

ETIQUETA = "REGLA EXPERIMENTAL – no diagnóstica, no validada en astronautas"
SIN_VALIDACION = "parámetro de demostración sin validación"
ALAVI = "Alavi et al., Nat Med 2022, https://doi.org/10.1038/s41591-021-01593-2"

REGLAS: dict[str, dict] = {
    "R1": {
        "nombre": "FEVE estimada por un modelo por debajo de un umbral",
        "formula": "ALERTA si existe una salida de modelo preentrenado con metrica FEVE (medicion, %) y valor < umbral_feve",
        "parametros": {"umbral_feve": 40.0},
        "fuente": ("El 40 % corresponde a la convencion clinica habitual de FEVE reducida, usada aqui solo como "
                   "valor de demostracion; " + SIN_VALIDACION + ". La FEVE es una estimacion de un modelo "
                   "preentrenado, no una medicion clinica."),
    },
    "R2": {
        "nombre": "Discrepancia entre modelos en la misma metrica",
        "formula": "ALERTA si |valor_b - valor_a| > tolerancia para dos modelos distintos, misma metrica y misma entrada",
        "parametros": {"tolerancia_feve": 10.0, "exigir_entrada_verificada": False},
        "fuente": SIN_VALIDACION + " (la tolerancia se define en comparar_modelos; aqui solo se reutiliza su resultado). "
                  "El acuerdo entre modelos no implica exactitud; el desacuerdo tampoco indica cual acierta.",
    },
    "R3": {
        "nombre": "FC nocturna sostenida sobre la linea base (tipo NightSignal)",
        "formula": ("ALERTA si la mediana nocturna de FC (22:00-06:00) >= basal + umbral_bpm en `noches_seguidas` "
                    "noches consecutivas, para un mismo dispositivo; basal = mediana de las medianas nocturnas previas"),
        "parametros": {"umbral_bpm": 4.0, "noches_seguidas": 2},
        "fuente": ("Inspirada en NightSignal (" + ALAVI + "), que alerta con FC nocturna >= 4 bpm sobre la linea base "
                   "2 noches seguidas. Es una adaptacion simple (no es el algoritmo original ni esta validada en "
                   "vuelo espacial). Parametros de demostracion tomados de ese trabajo."),
    },
    "R4": {
        "nombre": "Dato ecografico desactualizado respecto a los sensores",
        "formula": "ALERTA si (t_dato_sensor_mas_reciente - t_eco_mas_reciente) > max_horas",
        "parametros": {"max_horas": 72.0},
        "fuente": SIN_VALIDACION + ". Solo senala que el eco puede no reflejar el estado actual; no evalua nada clinico.",
    },
    "R5": {
        "nombre": "Cruce eco + reloj (R1 y R3 a la vez)",
        "formula": "ALERTA si R1 y R3 estan activadas para la misma persona y en la misma tabla/ventana",
        "parametros": {},
        "fuente": SIN_VALIDACION + ". Demuestra el cruce de fuentes; la coincidencia no establece causa ni diagnostico.",
    },
}


def _params(params: dict | None) -> dict[str, dict]:
    p = {k: dict(v["parametros"]) for k, v in REGLAS.items()}
    for k, v in (params or {}).items():
        if k in p and isinstance(v, dict):
            p[k].update(v)
    return p


def _registros(df: pd.DataFrame) -> list[dict]:
    cols = [c for c in ("origen", "fuente", "metric", "metrica_canonica", "estadistico", "periodo", "value", "unit",
                        "timestamp", "run_id", "study_id", "valor_basal", "diferencia_vs_basal", "simulated")
            if c in df.columns]
    out = []
    for r in df[cols].to_dict("records"):
        out.append({k: (None if (not isinstance(v, (str, bool)) and v is not None and pd.isna(v)) else
                        (v.isoformat() if isinstance(v, pd.Timestamp) else v)) for k, v in r.items()})
    return out


def _resultado(rid: str, p: dict, activada: bool, datos: pd.DataFrame | list[dict], mensaje: str) -> dict:
    d = _registros(datos) if isinstance(datos, pd.DataFrame) else datos
    sim = any(bool(x.get("simulated")) for x in d) if activada else False
    if activada and sim:
        mensaje = "[DATOS SIMULADOS] " + mensaje
    return {"id": rid, "nombre": REGLAS[rid]["nombre"], "etiqueta": ETIQUETA, "formula": REGLAS[rid]["formula"],
            "parametros": copy.deepcopy(p), "fuente": REGLAS[rid]["fuente"], "activada": bool(activada),
            "datos": d if activada else [], "simulada": bool(sim), "mensaje": mensaje}


def _r1(tabla: pd.DataFrame, p: dict) -> dict:
    t = tabla[(tabla["origen"] == "eco") & (tabla["metrica_canonica"] == "FEVE") & (tabla["tipo"] == "medicion")]
    t = t[pd.to_numeric(t["value"], errors="coerce") < p["umbral_feve"]]
    if len(t):
        modelos = ", ".join(f"{r.fuente}={float(r.value):g} %" for r in t.itertuples())
        return _resultado("R1", p, True, t, f"FEVE estimada por modelo(s) por debajo de {p['umbral_feve']:g} %: {modelos}. "
                          "Es una salida de un modelo preentrenado, no un diagnostico: se recomienda revision humana "
                          "(cirujano de vuelo / cardiologo).")
    return _resultado("R1", p, False, [], "No activada: ninguna FEVE estimada por debajo del umbral (o no hay FEVE).")


def _r2(comparacion: pd.DataFrame | None, p: dict) -> dict:
    if comparacion is None or len(comparacion) == 0:
        return _resultado("R2", p, False, [], "No activada: no hay comparaciones entre modelos.")
    c = comparacion[comparacion["discrepancia"] == True]  # noqa: E712
    if p.get("exigir_entrada_verificada"):
        c = c[c["entrada_verificada"] == True]  # noqa: E712
    if len(c):
        datos = [{k: (None if (not isinstance(v, (str, bool)) and v is not None and pd.isna(v)) else v)
                  for k, v in r.items()} for r in c[["modelo_a", "valor_a", "modelo_b", "valor_b", "metrica",
                  "diferencia_b_menos_a", "tolerancia", "entrada", "entrada_verificada", "simulated"]].to_dict("records")]
        txt = "; ".join(f"{r['metrica']}: {r['modelo_a']}={r['valor_a']:g} vs {r['modelo_b']}={r['valor_b']:g} "
                        f"(dif {r['diferencia_b_menos_a']:+g}, tolerancia {r['tolerancia']:g})" for r in datos)
        return _resultado("R2", p, True, datos, f"Discrepancia entre modelos: {txt}. No se sabe cual acierta; "
                          "se recomienda revision humana de las imagenes y de la calidad del estudio.")
    return _resultado("R2", p, False, [], "No activada: sin discrepancias por encima de la tolerancia.")


def _r3(tabla: pd.DataFrame, p: dict) -> dict:
    t = tabla[(tabla["estadistico"] == "mediana_noche") & (tabla["metric"] == "heart_rate")].copy()
    n_req = int(p["noches_seguidas"])
    for dev, g in t.groupby("fuente"):
        g = g.sort_values("periodo")
        g = g[pd.to_numeric(g["valor_basal"], errors="coerce").notna()]
        if len(g) < n_req:
            continue
        ult = g.tail(n_req)
        fechas = pd.to_datetime(ult["periodo"])
        consecutivas = all((b - a) == pd.Timedelta(days=1) for a, b in zip(fechas, fechas.iloc[1:]))
        if consecutivas and (pd.to_numeric(ult["diferencia_vs_basal"]) >= p["umbral_bpm"]).all():
            det = "; ".join(f"noche {r.periodo}: {r.value:g} bpm (basal {r.valor_basal:g}, +{r.diferencia_vs_basal:.1f})"
                            for r in ult.itertuples())
            return _resultado("R3", p, True, ult, f"[{dev}] FC nocturna >= basal + {p['umbral_bpm']:g} bpm en "
                              f"{n_req} noches seguidas ({det}). Regla tipo NightSignal, no validada en vuelo; "
                              "no es un diagnostico: se recomienda revision humana (cirujano de vuelo).")
    return _resultado("R3", p, False, [], "No activada: sin noches consecutivas suficientes sobre el basal "
                      "(o sin datos nocturnos/basal suficientes).")


def _r4(tabla: pd.DataFrame, p: dict) -> dict:
    eco = tabla[(tabla["origen"] == "eco") & tabla["timestamp"].notna()]
    sen = tabla[(tabla["origen"] == "sensor") & tabla["timestamp"].notna() & (tabla["estadistico"] == "ultimo")
                & (tabla["faltante"] == False)]  # noqa: E712
    if eco.empty or sen.empty:
        motivo = "el eco no tiene timestamp o no hay eco" if eco.empty else "no hay datos de sensores"
        return _resultado("R4", p, False, [], f"No evaluable: {motivo} (no se inventa la diferencia temporal).")
    te = pd.to_datetime(eco["timestamp"], utc=True).max()
    ts = pd.to_datetime(sen["timestamp"], utc=True).max()
    dif = (ts - te).total_seconds() / 3600
    if dif > p["max_horas"]:
        datos = _registros(eco[pd.to_datetime(eco["timestamp"], utc=True) == te]) + \
            _registros(sen[pd.to_datetime(sen["timestamp"], utc=True) == ts].head(3))
        return _resultado("R4", p, True, datos, f"El eco mas reciente es {dif:.1f} h anterior a los datos de sensores "
                          f"(> {p['max_horas']:g} h): puede no reflejar el estado actual. Se recomienda revision humana.")
    return _resultado("R4", p, False, [], f"No activada: diferencia sensor-eco {dif:.1f} h <= {p['max_horas']:g} h.")


def evaluar(tabla: pd.DataFrame, comparacion: pd.DataFrame | None = None, params: dict | None = None) -> list[dict]:
    """Evalua R1..R5 sobre la tabla de UN sujeto. `params` = {"R1": {"umbral_feve": 35}, ...}.
    Devuelve una entrada por regla (activada o no) con los datos exactos que la activaron."""
    p = _params(params)
    if tabla is not None and len(tabla):
        sujetos = set(tabla["subject_id"].dropna().astype(str))
        if len(sujetos) > 1:
            raise ValueError(f"La tabla mezcla personas {sorted(sujetos)}: las reglas solo evaluan un sujeto")
    if comparacion is not None and len(comparacion) and "metrica" in comparacion.columns:
        comparacion = comparacion.copy()
        tol = p["R2"].get("tolerancia_feve")
        if params and "R2" in params and "tolerancia_feve" in params["R2"] and tol is not None:
            m = comparacion["metrica"] == "FEVE"
            comparacion.loc[m, "tolerancia"] = tol
            comparacion.loc[m, "discrepancia"] = comparacion.loc[m, "abs_diferencia"] > tol
    r1, r3 = _r1(tabla, p["R1"]), _r3(tabla, p["R3"])
    r5p = p["R5"]
    if r1["activada"] and r3["activada"]:
        r5 = _resultado("R5", r5p, True, r1["datos"] + r3["datos"],
                        "Coinciden R1 (FEVE estimada baja) y R3 (FC nocturna sostenida sobre el basal) en la misma "
                        "persona y ventana. No es un diagnostico ni establece relacion causal: se recomienda "
                        "revision humana prioritaria (cirujano de vuelo).")
    else:
        r5 = _resultado("R5", r5p, False, [], "No activada: requiere R1 y R3 a la vez.")
    return [r1, _r2(comparacion, p["R2"]), r3, _r4(tabla, p["R4"]), r5]


def a_formato_comun(alertas: list[dict], subject_id: str, solo_activadas: bool = True) -> list[dict]:
    """Alertas -> filas del formato comun (tipo regla_alerta, source regla_experimental). value=1.0 si activada."""
    out = []
    for a in alertas:
        if solo_activadas and not a["activada"]:
            continue
        ts = [x.get("timestamp") for x in a["datos"] if x.get("timestamp")]
        out.append(fila(subject_id=subject_id, study_id=None, timestamp=max(ts) if ts else None,
                        source="regla_experimental", model=a["id"], metric=a["nombre"],
                        value=1.0 if a["activada"] else 0.0, unit="activada(1/0)", quality="experimental",
                        simulated=bool(a["simulada"]), tipo="regla_alerta",
                        notes=f"{ETIQUETA}. {a['mensaje']}"))
    return out
