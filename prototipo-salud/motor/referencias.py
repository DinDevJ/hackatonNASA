"""Valor normal (referencia) por variable para `detalle.referencias` de las evaluaciones guardadas.

PROVISIONAL; nada es un diagnostico. Solo se reutilizan las referencias del motor: poblacional donde ALGORITMOS c.2
la da (`normalizacion.referencia_poblacional`) y, si no, la base personal prevuelo (mu +/- k*s con k = rampa_inicio,
el mismo corte con el que `estado_variable` deja de llamar «normal» a la variable; S1, provisional).
Si no hay ninguna de las dos: «sin referencia». Los datos del canal SIMULADO se marcan `simulado`.
"""
from __future__ import annotations

import math
import statistics

from . import normalizacion as N
from . import parametros

_ND = statistics.NormalDist()
_UNIDAD_POB = {"01:V3": "lpm", "04:A1": "°C", "03:V17": "ms"}
_CORTA = {"01:V3": "NHANES (Ostchega 2011)", "04:A1": "Obermeyer 2017", "03:V17": "Nunan 2010"}


def _f(x):
    """float nativo redondeado a 2 decimales; NaN/inf/None -> None."""
    try:
        x = float(x)
    except (TypeError, ValueError):
        return None
    return round(x, 2) if math.isfinite(x) else None


def _par(a, b):
    a, b = _f(a), _f(b)
    return None if a is None or b is None else [a, b]


def _g(x):
    """Numero con coma decimal para los textos."""
    return f"{x:.2f}".rstrip("0").rstrip(".").replace(".", ",")


def _poblacional(vid, perfil, z_pob):
    """(dict poblacional | None). Usa las constantes de normalizacion; no las reescribe."""
    perm = True
    if vid == "03:V17" and z_pob is None:
        perm = False        # sin z poblacional el motor no uso la rama (contexto/registro no admitido o sin valor)
    ref = N.referencia_poblacional(vid, perfil, perm)
    if ref is None:
        return None
    out = {"m": _f(ref["m"]), "fuente": ref["fuente"]}
    if vid == "01:V3":
        sexo, edad = perfil["sexo"], perfil["edad"]
        dec = 20 if edad < 40 else 40
        p5, p50, p95 = N.FC_PERCENTILES[(sexo, dec)]
        grupo = f"{sexo} {dec}–{dec + 19} años"
        quien = ("hombres" if sexo == "M" else "mujeres") + f" de {dec}–{dec + 19} años"
        out.update({"m": _f(p50), "rango": _par(p5, p95), "grupo": grupo,
                    "percentiles": {"p5": _f(p5), "p50": _f(p50), "p95": _f(p95)},
                    "percentil_valor_aprox": None if z_pob is None else _f(100 * _ND.cdf(z_pob)),
                    "calculo": f"P5–P95 de NHANES (Ostchega 2011) para {quien}; centro P50"})
    elif vid == "04:A1":
        out.update({"m": _f(N.TEMP_MEDIA), "rango": _par(*N.TEMP_RANGO),
                    "calculo": "rango de referencia de Obermeyer 2017 (terrestre)"})
    else:  # 03:V17
        m, s = N.HRV_LN_RMSSD
        lo, hi = math.exp(m - 1.96 * s), math.exp(m + 1.96 * s)
        out.update({"m": _f(math.exp(m)), "rango": _par(lo, hi),
                    "calculo": f"μ ± 1,96·DE en ln RMSSD (Nunan 2010: {_g(m)} ± {_g(s)}), destransformado a ms; "
                               "válido para registros de 5 min"})
    return out


def _personal(vid, base, unidad):
    if not base or base.get("mu") is None or base.get("s") is None:
        return None
    k = float(parametros.valor("rampa_inicio"))
    mu, s = float(base["mu"]), float(base["s"])
    if not (math.isfinite(mu) and math.isfinite(s)):
        return None
    lo, hi = N.destransformar(vid, mu - k * s), N.destransformar(vid, mu + k * s)
    centro = N.destransformar(vid, mu)
    n0, B = base.get("n0"), base.get("B")
    ln = " (en ln, destransformado)" if base.get("transformacion") == "ln" else ""
    calculo = (f"μ ± {_g(k)}·s{ln}: μ = B·m_ref + (1−B)·x̄ prevuelo (n0 = {n0}, B = {_g(B) if B is not None else '—'}), "
               f"s = √(s_w² + B·s_b²); {_g(k)} = rampa_inicio (S1, provisional)")
    return {"mu": _f(centro), "s": _f(s), "k": _f(k), "rango": _par(lo, hi), "n0": n0, "B": _f(B),
            "clase": base.get("clase"), "congelada": base.get("congelada"), "s_w_fuente": base.get("s_w_fuente"),
            "ref_fuente": base.get("ref_fuente"), "transformacion": base.get("transformacion"), "calculo": calculo}


def _cusum(c):
    if not c:
        return None
    up, dn = bool(c.get("senal_pos")), bool(c.get("senal_neg"))
    est = "señal ↑↓" if up and dn else "señal ↑" if up else "señal ↓" if dn else "sin señal"
    return {"estado": est, "pos": _f(c.get("pos")), "neg": _f(c.get("neg")), "n": c.get("n")}


def referencias_detalle(item: dict, pers: dict, canal: str) -> dict:
    perfil = (pers or {}).get("perfil") or {}
    variables = (pers or {}).get("variables") or {}
    out = {}
    for lg in item.get("ligas") or []:
        vid = lg.get("variable_id")
        if vid is None:
            continue
        vs = variables.get(vid) or {}
        z_pob = _f(lg.get("z_pob"))
        pob = _poblacional(vid, perfil, z_pob)
        per = _personal(vid, vs.get("base"), lg.get("unidad"))
        e = {"variable_id": vid, "tipo": "sin referencia", "rango": None, "centro": None, "unidad": None, "fuente": None,
             "fuente_corta": "sin referencia", "calculo": "", "poblacional": None, "personal": per,
             "z_pob": z_pob, "z_personal": _f(lg.get("z_fase")), "z_act": _f(lg.get("z_act")),
             "origen_z": lg.get("origen_z"), "cusum": _cusum(vs.get("cusum")), "motivo": None,
             "simulado": canal == "SIMULADO", "provisional": True}
        if pob is not None:
            e["poblacional"] = pob
            e.update(tipo="poblacional", rango=pob["rango"], centro=pob["m"], unidad=_UNIDAD_POB[vid],
                     fuente=pob["fuente"], fuente_corta=_CORTA[vid], calculo=pob["calculo"])
        elif per is not None:
            e.update(tipo="base personal prevuelo", rango=per["rango"], centro=per["mu"], unidad=lg.get("unidad"),
                     fuente="base personal prevuelo", fuente_corta="base personal prevuelo", calculo=per["calculo"])
        else:
            e["motivo"] = "sin referencia poblacional (ALGORITMOS c.2) ni base personal prevuelo"
            e["calculo"] = e["motivo"]
        out[vid] = e
    return out
