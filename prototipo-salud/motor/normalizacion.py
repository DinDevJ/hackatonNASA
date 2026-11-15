"""Normalizacion y desviacion por variable (c.1-c.5).

PROVISIONAL: las formas de distribucion (S14), las DE dentro/entre personas estimadas con la tripulacion (S5),
los cortes de c.5 (S1, S2) y los tamanos de tripulacion (S6) son supuestos. Rama poblacional solo donde
ALGORITMOS c.2 da un rango; todo lo demas usa z personal. Nada es un diagnostico. Solo numpy/pandas/stdlib.
"""
from __future__ import annotations

import math
import re
import statistics
from datetime import date, timedelta

import numpy as np
import pandas as pd

from . import calibracion as C

FASES = ("PRE", "VT", "VTa", "POST")
# Transformacion de trabajo por variable (c.2): HRV en logaritmo natural [P·S14]
TRANSFORMACION = {"03:V17": "ln"}
# Variables cuyo valor "en reposo" exige contexto reposo/sueno (e.2: contexto estandar de la variable)
CONTEXTO_SENSIBLE = {"01:V3", "03:V17", "04:A2"}
# Bandas ordinales (D7): no se calcula z poblacional; la rampa usa z personal si hay base
ORDINALES = {"04:A3", "04:A2", "01:V1"}
RANGO_NIVEL = {"N1": 0, "N2": 1, "N3a": 2, "N3b": 2, "N3": 2, "N4": 3}
NIVELES_COBERTURA = ("N1", "N2", "N3", "N3a", "N3b")

# c.2 FC en reposo: percentiles 5/50/95 NHANES (Ostchega 2011) por sexo y decada [terrestre]
FC_PERCENTILES = {("M", 20): (52, 69, 89), ("F", 20): (57, 74, 95), ("M", 40): (52, 68, 90), ("F", 40): (56, 71, 92)}
Z90 = 1.645
<<<<<<< HEAD
TEMP_MEDIA, TEMP_DE = 36.6, (37.3 - 35.7) / (2 * 1.96)   # Obermeyer 2017
=======
TEMP_RANGO = (35.7, 37.3)  # Obermeyer 2017
TEMP_MEDIA, TEMP_DE = 36.6, (TEMP_RANGO[1] - TEMP_RANGO[0]) / (2 * 1.96)   # Obermeyer 2017
>>>>>>> 6ec76403a8d197667ae003cc72dccb525361203c
HRV_LN_RMSSD = (3.68, 0.35)                              # Nunan 2010, lognormal [P·S14]


def transformar(vid: str, x: float) -> float:
    if TRANSFORMACION.get(vid) == "ln":
        return math.log(x) if x > 0 else float("nan")
    return float(x)


def destransformar(vid: str, x: float) -> float:
    return math.exp(x) if TRANSFORMACION.get(vid) == "ln" else x


# ---------------------------------------------------------------------------------------------------
# Fase de mision (e.4)
# ---------------------------------------------------------------------------------------------------
def _fecha(s):
    if s is None or s == "":
        return None
    return pd.Timestamp(s).normalize().date() if not isinstance(s, date) else s


def fase_de(fecha, mision_sujeto: dict | None, p: dict) -> dict:
    """Fase en `fecha` y banderas de transicion. Sin lanzamiento declarado todo es PRE («sin misión declarada»)."""
    f = _fecha(fecha)
    lanz = _fecha((mision_sujeto or {}).get("lanzamiento"))
    aterr = _fecha((mision_sujeto or {}).get("aterrizaje"))
    out = {"fase": "PRE", "mision_declarada": lanz is not None, "en_transicion": False, "cambio": None}
    if lanz is None:
        return out
    fin_vt = lanz + timedelta(days=int(p["fase_temprana_dias"]))
    if f < lanz:
        fase = "PRE"
    elif aterr is not None and f >= aterr:
        fase = "POST"
    elif f < fin_vt:
        fase = "VT"
    else:
        fase = "VTa"
    out["fase"] = fase
    dias_sin = math.ceil(p["sin_aprendizaje_h"] / 24)
    cambios = [("lanzamiento", lanz), ("fin de fase temprana", fin_vt)] + ([("aterrizaje", aterr)] if aterr else [])
    for nombre, d0 in cambios:
        if aterr is not None and nombre == "fin de fase temprana" and fin_vt >= aterr:
            continue
        if 0 <= (f - d0).days < dias_sin:
            out["en_transicion"], out["cambio"] = True, nombre
    return out


# ---------------------------------------------------------------------------------------------------
# Agregacion diaria (D1, c.1, G7)
# ---------------------------------------------------------------------------------------------------
COLUMNAS_DEFECTO = {"nivel_motivo": "", "simulated": False, "contexto": None, "metodo": None, "decide": True, "calidad_buena": True,
                    "vigencia_h": 24.0, "z_pob_permitido": True, "sin_dato": None, "origen": "", "metric": "", "quality": "",
                    "run_id": None, "etiquetas": "", "notas": "", "unidad": "", "clase_dispositivo": "desconocido"}


def preparar_obs(obs: pd.DataFrame) -> pd.DataFrame:
    """Completa columnas ausentes con valores neutros (sin inventar datos) y normaliza tipos."""
    df = obs.copy()
    for c, v in COLUMNAS_DEFECTO.items():
        if c not in df.columns:
            df[c] = v
    df["timestamp"] = pd.to_datetime(df["timestamp"])
    df["valor"] = pd.to_numeric(df["valor"], errors="coerce")
    df["simulated"] = df["simulated"].astype(bool)
    df["decide"] = df["decide"].astype(bool)
    df["calidad_buena"] = df["calidad_buena"].astype(bool)
    df["z_pob_permitido"] = df["z_pob_permitido"].astype(bool)
    return df


def _moda(serie):
    s = [x for x in serie if x is not None and not (isinstance(x, float) and math.isnan(x))]
    return statistics.mode(s) if s else None


def _modelo_de(notas, metric) -> str:
    """Modelo de eco de una obs: `modelo=<x>` en notas (lo escribe la puerta y `desde_eco`); si no, la metrica."""
    m = re.search(r"modelo=([A-Za-z0-9_\-]+)", str(notas))
    return m.group(1) if m else f"desconocido({metric})"


def _tolerancia_feve() -> float:
    from . import parametros          # import tardio: evita ciclos
    return float(parametros.valor("tolerancia_feve_modelos"))


def _puerta_modelos_feve(g: pd.DataFrame):
    """a.5.4 para 01:V18: una mediana por modelo; D = max - min. Devuelve (D, modelos, discordante)."""
    por_modelo = {}
    for (n, mt), v in zip(zip(g["notas"], g["metric"]), g["valor"]):
        por_modelo.setdefault(_modelo_de(n, mt), []).append(float(v))
    med = {k: float(np.median(v)) for k, v in por_modelo.items()}
    d = max(med.values()) - min(med.values())
    return d, med, d > _tolerancia_feve()


def _agregar_grupo(sid, vid, fecha, g: pd.DataFrame, presencia_vars) -> dict:
    """Agrega las filas de un (persona, variable, dia) con varias filas (semantica de D1)."""
    validas = g[g["valor"].notna() & g["sin_dato"].isna()]
    extra_etq, val_modelos = "", None
    if vid == "01:V18" and not validas.empty:                       # a.5.4: puerta de discordancia entre modelos [P·S16]
        d, med, disc = _puerta_modelos_feve(validas)
        lista = ", ".join(f"{k} {v:g} %" for k, v in sorted(med.items()))
        if len(med) > 1 and disc:
            motivo = (f"sin_dato: discordante entre modelos (D = {d:g} pp > {_tolerancia_feve():g}, a.5.4, provisional) [{lista}]")
            return {"subject_id": sid, "variable_id": vid, "fecha": fecha, "valor": float("nan"), "sin_dato": motivo,
                    "nivel": None, "clase": None, "unidad": g["unidad"].iloc[0], "n_filas": len(g)}
        val_modelos = float(np.median(list(med.values())))
        extra_etq = (f"{len(med)} modelos (D = {d:g} pp): {lista}; mediana entre modelos [P·S16]" if len(med) > 1
                     else f"modelo único ({lista})")
    if validas.empty:
        motivo = next((m for m in g["sin_dato"] if isinstance(m, str) and m), "sin_dato: valor ausente")
        return {"subject_id": sid, "variable_id": vid, "fecha": fecha, "valor": float("nan"), "sin_dato": motivo,
                "nivel": None, "clase": None, "unidad": g["unidad"].iloc[0], "n_filas": len(g)}
    rk = validas["nivel"].map(lambda n: RANGO_NIVEL.get(n, 9))
    mejor = validas[rk == rk.min()]
    ult = mejor.sort_values(["timestamp", "run_id"], na_position="first").iloc[-1]
    sub = mejor[mejor["clase_dispositivo"] == ult["clase_dispositivo"]]
    niveles = list(sub["nivel"])
    nivel = "N3a" if "N3a" in niveles else niveles[0]
    val = float(sub["valor"].max()) if vid in presencia_vars else float(sub["valor"].median())
    if val_modelos is not None:
        val = val_modelos                                           # mediana de las medianas por modelo (a.5.3)
    etiq = "; ".join(dict.fromkeys(t.strip() for e in sub["etiquetas"] for t in str(e).split(";") if t.strip()))
    if extra_etq:
        etiq = "; ".join(x for x in (etiq, extra_etq) if x)
    return {"subject_id": sid, "variable_id": vid, "fecha": fecha, "valor": val, "sin_dato": None, "nivel": nivel,
            "clase": ult["clase_dispositivo"], "unidad": ult["unidad"], "contexto": _moda(sub["contexto"]),
            "metodo": _moda(sub["metodo"]), "calidad_buena": bool(sub["calidad_buena"].all()),
            "vigencia_h": float(sub["vigencia_h"].max()) if sub["vigencia_h"].notna().any() else float("nan"),
            "z_pob_permitido": bool(sub["z_pob_permitido"].all()), "run_id": ult["run_id"], "etiquetas": etiq,
            "notas": str(ult["notas"]), "nivel_motivo": str(ult["nivel_motivo"]), "n_filas": len(sub)}


def _fila_unica(r: dict, sid, vid, fecha) -> dict:
    """Camino rapido para un (persona, variable, dia) con UNA sola fila; mismo resultado que `_agregar_grupo`."""
    v = r["valor"]
    if v != v or not (r["sin_dato"] is None or r["sin_dato"] != r["sin_dato"]):
        sd = r["sin_dato"]
        motivo = sd if isinstance(sd, str) and sd else "sin_dato: valor ausente"
        return {"subject_id": sid, "variable_id": vid, "fecha": fecha, "valor": float("nan"), "sin_dato": motivo,
                "nivel": None, "clase": None, "unidad": r["unidad"], "n_filas": 1}
    etiq = "; ".join(dict.fromkeys(t.strip() for t in str(r["etiquetas"]).split(";") if t.strip()))
    if vid == "01:V18":
        etiq = "; ".join(x for x in (etiq, f"modelo único ({_modelo_de(r['notas'], '')})") if x)
    vig = r["vigencia_h"]
    cx, mt = r["contexto"], r["metodo"]
    return {"subject_id": sid, "variable_id": vid, "fecha": fecha, "valor": float(v), "sin_dato": None, "nivel": r["nivel"],
            "clase": r["clase_dispositivo"], "unidad": r["unidad"],
            "contexto": None if cx is None or cx != cx else cx, "metodo": None if mt is None or mt != mt else mt,
            "calidad_buena": bool(r["calidad_buena"]), "vigencia_h": float("nan") if vig != vig else float(vig),
            "z_pob_permitido": bool(r["z_pob_permitido"]), "run_id": r["run_id"], "etiquetas": etiq,
            "notas": str(r["notas"]), "nivel_motivo": str(r["nivel_motivo"]), "n_filas": 1}


def agregacion_diaria(obs: pd.DataFrame, presencia_vars=frozenset()) -> list[dict]:
    """Una observacion por (persona, variable, dia). Gana el mejor nivel; a igualdad la clase mas reciente.
    Valor = mediana (presencia: maximo). Solo filas decide=True; un dia solo con sin_dato se conserva como ausencia (F2).
    Rendimiento: los grupos de una sola fila (lo habitual con un valor diario) van por un camino rapido sin pandas por grupo."""
    df = obs[obs["variable_id"].notna() & obs["decide"] & (obs["nivel"] != "N0")].copy()
    if df.empty:
        return []
    df["fecha"] = df["timestamp"].dt.normalize().dt.date
    claves = ["subject_id", "variable_id", "fecha"]
    dup = df.duplicated(subset=claves, keep=False)
    out = []
    unicas = df[~dup]
    if len(unicas):
        cols = ["valor", "sin_dato", "unidad", "etiquetas", "vigencia_h", "contexto", "metodo", "nivel", "clase_dispositivo",
                "calidad_buena", "z_pob_permitido", "run_id", "notas", "nivel_motivo"]
        recs = unicas[cols].to_dict("records")
        for r, sid, vid, fecha in zip(recs, unicas["subject_id"], unicas["variable_id"], unicas["fecha"]):
            out.append(_fila_unica(r, sid, vid, fecha))
    if dup.any():
        for (sid, vid, fecha), g in df[dup].groupby(claves, sort=True):
            out.append(_agregar_grupo(sid, vid, fecha, g, presencia_vars))
    out.sort(key=lambda d: (d["subject_id"], d["variable_id"], d["fecha"]))
    return out


def vigente(entrada: dict, hoy: date) -> bool:
    """D3: un valor del dia d es vigente el dia D si (D - d) < ceil(vigencia_h / 24); NaN = sin vencimiento."""
    v = entrada.get("vigencia_h")
    edad = (hoy - entrada["fecha"]).days
    if edad < 0:
        return False
    if v is None or (isinstance(v, float) and math.isnan(v)):
        return True
    return edad < max(1, math.ceil(v / 24))


# ---------------------------------------------------------------------------------------------------
# Referencia poblacional (c.2) y z poblacional
# ---------------------------------------------------------------------------------------------------
def referencia_poblacional(vid: str, perfil: dict | None = None, z_pob_permitido: bool = True) -> dict | None:
    """m_pob y s_pob en la escala de trabajo, solo donde ALGORITMOS c.2 da el rango. None = rama inactiva."""
    perfil = perfil or {}
    if vid == "01:V3":
        edad, sexo = perfil.get("edad"), perfil.get("sexo")
        if edad is None or sexo not in ("M", "F") or not (20 <= edad < 60):
            return None
        p5, p50, p95 = FC_PERCENTILES[(sexo, 20 if edad < 40 else 40)]
        up, dn = (p95 - p50) / Z90, (p50 - p5) / Z90
        return {"m": float(p50), "s_arriba": up, "s_abajo": dn, "s": (up + dn) / 2, "fuente": "NHANES, Ostchega 2011 [terrestre]"}
    if vid == "04:A1":
        return {"m": TEMP_MEDIA, "s_arriba": TEMP_DE, "s_abajo": TEMP_DE, "s": TEMP_DE,
                "fuente": "Obermeyer 2017 [terrestre]; ajuste por edad/IMC inactivo [P·S14]"}
    if vid == "03:V17" and z_pob_permitido:
        m, s = HRV_LN_RMSSD
        return {"m": m, "s_arriba": s, "s_abajo": s, "s": s, "fuente": "Nunan 2010 (5 min, ln RMSSD) [terrestre] [P·S14]"}
    return None


def z_poblacional(vid: str, x_t: float, perfil: dict | None, z_pob_permitido: bool = True):
    ref = referencia_poblacional(vid, perfil, z_pob_permitido)
    if ref is None or vid in ORDINALES:
        return None
    s = ref["s_arriba"] if x_t >= ref["m"] else ref["s_abajo"]
    return (x_t - ref["m"]) / s if s > 0 else None


# ---------------------------------------------------------------------------------------------------
# Base personal (c.3, D4)
# ---------------------------------------------------------------------------------------------------
def contexto_estandar(vid: str, contexto) -> bool:
    if contexto in ("ejercicio", "eva"):
        return False
    if vid in CONTEXTO_SENSIBLE:
        return contexto in (None, "reposo", "sueno")
    return True


def punto_base_admitido(vid: str, entrada: dict) -> bool:
    """Condiciones de e.2 que aplican a la construccion de la base (calidad, no simulado, contexto estandar)."""
    ok, _ = C.admite_calibracion(entrada["nivel"], entrada.get("calidad_buena", True), False)
    return ok and contexto_estandar(vid, entrada.get("contexto"))


def _sin_atipicos(x: list[float], z_corte: float) -> list[float]:
    if len(x) < 5:
        return list(x)
    med = float(np.median(x))
    mad = float(np.median(np.abs(np.array(x) - med))) * 1.4826
    if mad <= 0:
        return list(x)
    return [v for v in x if abs(v - med) / mad < z_corte]


def estadisticos_tripulacion(x_por_persona: dict[str, list[float]]) -> dict:
    """s_w combinada intra-persona y medias prevuelo de la tripulacion (misma variable y clase)."""
    num = den = 0.0
    medias = []
    for xs in x_por_persona.values():
        if len(xs) >= 1:
            medias.append(float(np.mean(xs)))
        if len(xs) >= 2:
            num += (len(xs) - 1) * float(np.var(xs, ddof=1))
            den += len(xs) - 1
    return {"s_w": math.sqrt(num / den) if den > 0 and num > 0 else None, "medias": medias, "n_personas": len(medias)}


def construir_base(xs: list[float], vid: str, clase: str, p: dict, ref_pob: dict | None, crew: dict | None, nivel_tendencia: bool = False) -> tuple[dict | None, str | None]:
    """Base prevuelo (c.3): μ_i = B·m_ref + (1-B)·x̄, s_i² = s_w² + B·s_b². Devuelve (base, None) o (None, motivo)."""
    crew = crew or {"s_w": None, "medias": [], "n_personas": 0}
    brutos = len(xs)
    xs = _sin_atipicos([x for x in xs if x == x], p["z_atipico_prevuelo"])
    n0 = len(xs)
    n_min = int(p["n0_min"])
    etiquetas = []
    if n0 < n_min and ref_pob is None:
        return None, f"sin base (n0 = {n0} < {n_min}) ni referencia poblacional"
    xbar = float(np.mean(xs)) if n0 else None
    sd_prop = float(np.std(xs, ddof=1)) if n0 >= 2 else 0.0
    if n0 >= n_min and sd_prop > 0:
        s_w, s_w_f = sd_prop, "propia (n0 >= 5)"
    elif crew.get("s_w"):
        s_w, s_w_f = crew["s_w"], "combinada de la tripulación [P·S5]"
    elif vid == "01:V3" and clase == "reloj_ppg":
        s_w, s_w_f = p["s_w_fc_reloj"], "variación semanal mediana de la FC de reloj, Quer 2020"
    else:
        return None, "sin s_w (ni propia con n0 >= 5, ni de la tripulación): rama personal inactiva"
    if ref_pob is not None:
        m_ref, s_b, ref_f = ref_pob["m"], ref_pob["s"], ref_pob["fuente"]
    elif len(crew.get("medias", [])) >= 3 and np.std(crew["medias"], ddof=1) > 0:
        m_ref, s_b = float(np.mean(crew["medias"])), float(np.std(crew["medias"], ddof=1))
        ref_f = "media prevuelo de la tripulación [P·S5]"
    else:
        m_ref = s_b = None
        ref_f = None
        etiquetas.append("sin referencia de tripulación: B = 0 (sin encogimiento)")
    if m_ref is None or not s_b or s_b <= 0:
        B = 0.0
    elif n0 == 0:
        B = 1.0
    else:
        B = (s_w ** 2 / n0) / (s_w ** 2 / n0 + s_b ** 2)
    mu = m_ref if n0 == 0 else (B * m_ref + (1 - B) * xbar if B > 0 else xbar)
    s = math.sqrt(s_w ** 2 + B * (s_b ** 2 if s_b else 0.0))
    piso = False
    if vid == "04:A2" and s < p["piso_s_fr"]:
        s, piso = p["piso_s_fr"], True
    if nivel_tendencia:
        etiquetas.append("tendencia (N2): solo para la base de su misma clase")
    if brutos != n0:
        etiquetas.append(f"{brutos - n0} atípico(s) excluido(s) (z robusto >= {p['z_atipico_prevuelo']}) [P·S5]")
    if n0 == 0:
        etiquetas.append("sin datos propios: equivale al z poblacional (B = 1)")
    return {"mu": float(mu), "s": float(s), "n0": n0, "B": float(B), "s_w": float(s_w), "s_w_fuente": s_w_f,
            "s_b": None if s_b is None else float(s_b), "m_ref": None if m_ref is None else float(m_ref), "ref_fuente": ref_f,
            "x_media": None if xbar is None else float(xbar), "transformacion": TRANSFORMACION.get(vid), "clase": clase,
            "piso_aplicado": piso, "etiquetas": etiquetas, "provisional": True}, None


def z_fase(x_t: float, base: dict, delta: float = 0.0) -> float:
    """z anclado y ajustado por fase: (x - μ_i - δ) / s_i. δ = 0 en este prototipo (D5)."""
    return (x_t - base["mu"] - delta) / base["s"]


def var_z(z: float | None, n0: int) -> float | None:
    """D6: Var(z) ≈ 1/n0 + z²/(2(n0-1)); con n0 < 2 (rama solo poblacional) se informa 0."""
    if z is None:
        return None
    if n0 is None or n0 < 2:
        return 0.0
    return 1.0 / n0 + z * z / (2.0 * (n0 - 1))


def desviacion_adversa(z: float | None, signo: int):
    """u: z si ↑; -z si ↓; |z| si dos direcciones (c.5)."""
    if z is None:
        return None
    return z * signo if signo != 0 else abs(z)


def estado_variable(u: float | None, u1: float, rampa: float, persistente: bool = False, deriva: bool = False) -> str:
    if u is None:
        return "sin_z"
    if u >= u1:
        return "persistente" if persistente else "alertada"
    if deriva:
        return "deriva"
    return "desviada" if u >= rampa else "normal"


# ---------------------------------------------------------------------------------------------------
# Delta frente a la tripulacion (c.4, D18)
# ---------------------------------------------------------------------------------------------------
def t_cdf(t: float, df: int) -> float:
    """CDF de la t de Student por integracion numerica (Simpson); sin scipy."""
    if df <= 0:
        raise ValueError("df debe ser > 0")
    c = math.exp(math.lgamma((df + 1) / 2) - math.lgamma(df / 2)) / math.sqrt(df * math.pi)
    a = abs(t)
    n = 2000
    h = a / n
    f = lambda x: c * (1 + x * x / df) ** (-(df + 1) / 2)
    s = f(0) + f(a) + 4 * sum(f((2 * i - 1) * h) for i in range(1, n // 2 + 1)) + 2 * sum(f(2 * i * h) for i in range(1, n // 2))
    integral = s * h / 3
    return 0.5 + math.copysign(min(integral, 0.5), t)


def delta_tripulacion(valores: dict[str, float], sid: str, p: dict) -> dict:
    """Capa 3 (contexto): Δ = (x_i - x̄_-i)/(s_-i·√(1+1/(n-1))); t con n-2 gl convertida a z equivalente.
    n <= 3: inactiva; 4-6: descriptiva; >= 7: se permite la etiqueta «desviación aislada». Nunca cambia una base."""
    n = len(valores)
    out = {"n": n, "modo": "inactiva", "delta": None, "z_equivalente": None, "etiqueta": None, "provisional": True,
           "nota": f"n = {n} <= 3: capa 3 inactiva [P·S6]"}
    if n < int(p["tripulacion_n_descriptivo"]):
        return out
    otros = [v for k, v in valores.items() if k != sid]
    s = statistics.stdev(otros) if len(otros) >= 2 else 0.0
    if s <= 0 or sid not in valores:
        out["nota"] = "dispersión de la tripulación nula: no se calcula Δ"
        return out
    d = (valores[sid] - statistics.fmean(otros)) / (s * math.sqrt(1 + 1 / (n - 1)))
    pz = min(max(t_cdf(d, n - 2), 1e-12), 1 - 1e-12)
    z = statistics.NormalDist().inv_cdf(pz)
    out.update({"modo": "descriptiva", "delta": d, "z_equivalente": z,
                "nota": f"n = {n}: solo descriptivo, no activa nada [P·S6]"})
    if n >= int(p["tripulacion_n_aislada"]):
        out["modo"] = "etiquetas"
        out["nota"] = f"n = {n} >= {int(p['tripulacion_n_aislada'])}: se permite «desviación aislada» (|z equivalente| > 1.5) [P·S6]"
    return out
