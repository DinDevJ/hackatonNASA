"""Semaforo por padecimiento (ALGORITMOS.md f.1, f.3, g.3; DISENO.md D11, D12).

PROVISIONAL: todos los umbrales (T_amarillo, T_inf_rojo, dL_amarillo, dL_inf_rojo, persistencia, histeresis, cobertura
minima) son supuestos S2/S19 y se leen de `params` (el usuario puede haberlos modificado). La lista de centinelas
de R-3 no tiene fuente. Nada es un diagnostico. Las reglas R1-R5 de demostracion y la FEVE (01:V18) NO intervienen.

Colores y orden fijo (f.3): ROJO < AMARILLO < GRIS < VERDE (primero lo que mas pide revision; GRIS antes que VERDE porque
«no hay con que opinar» no es lo mismo que «sin desviaciones»), luego T_inf descendente, luego l_p (solo si el prior
tiene fuente), luego el id.
"""
from __future__ import annotations

import math

from .tablas import CRITERIOS

COLORES = ("VERDE", "AMARILLO", "ROJO", "GRIS")
ORDEN_COLOR = {"ROJO": 0, "AMARILLO": 1, "GRIS": 2, "VERDE": 3}
AVISO_CONFIRMAR = "confirmar con una medición de mayor calidad (por ejemplo, un ECG leído por una persona)"


def clave_orden(item: dict):
    """Orden f.3: color, luego T_inf (desc), luego l_p si el prior tiene fuente (desc), luego id."""
    pri = item.get("prior")
    ell = pri.get("ell_orden") if isinstance(pri, dict) and pri.get("disponible") else None
    return (ORDEN_COLOR[item["color"]], -(item.get("T_inf") or 0.0), -(ell if ell is not None else -1e9), item["padecimiento_id"])


def ordenar(items: list[dict]) -> list[dict]:
    return sorted(items, key=clave_orden)


# ---------------------------------------------------------------------------------------------------
# Capas fijas (d.6): no cambian T ni dL. Solo PHQ-9 se calcula (D15).
# ---------------------------------------------------------------------------------------------------
def capas_fijas(pid: str, tb, datos: dict) -> list[dict]:
    out = []
    for c in tb.capas_de(pid):
        e = {"nombre": c["nombre"], "ambito": c["ambito"], "estado": c["estado"], "detalle": "", "supera_criterio": False,
             "provisional": True}
        if c["nombre"] == "PHQ-9":
            d = datos.get("03:V1")
            crit = CRITERIOS["03:V1"]
            if d is not None and d.get("metodo") == "cuestionario_completo" and d["nivel"] in ("N1", "N3a", "N3b", "N3"):
                sup = d["valor"] >= crit["umbral"]
                e["estado"] = f"calculado: {d['valor']:g} puntos"
                e["supera_criterio"] = bool(sup)
                e["detalle"] = (f"supera su criterio publicado (>= {crit['umbral']:g}, {crit['fuente']}) {crit['ambito']}" if sup
                                else f"no supera su criterio publicado (>= {crit['umbral']:g}, {crit['fuente']})")
            else:
                e["estado"] = "incompleto: falta PHQ-9 completo (03:V1 con método cuestionario completo); nunca se imputa un ítem"
        elif c["nombre"] == "Lake Louise 2018":
            e["detalle"] = "la definición de AMS exige los 4 ítems 0-3: no se derivan de la escala de cefalea"
        out.append(e)
    return out


# ---------------------------------------------------------------------------------------------------
# Condiciones
# ---------------------------------------------------------------------------------------------------
def _nombre(rec) -> str:
    return f"{rec['L']['variable']} ({rec['L']['variable_id']})"


def evaluar_condiciones(S: dict, capas: list[dict], hist: list[dict], p: dict) -> dict:
    """Condiciones A1-A5 y R-1..R-3 del dia, sin histeresis. `hist` = evaluaciones anteriores (T_inf por dia)."""
    cond, textos = [], []
    blocked = False
    T, Tinf, dL, dLinf = S["T"], S["T_inf"], S["dL"], S["dL_inf"]
    # AMARILLO
    if T >= p["T_amarillo"] - 1e-12 and S["hay_activa_no_contexto"]:
        cond.append("A1")
        textos.append(f"A1: T = {T:.2f} >= {p['T_amarillo']:g} (umbral provisional) con al menos una liga activa que no es de contexto")
    if dL is not None and dL >= p["dL_amarillo"] - 1e-12:
        cond.append("A2")
        textos.append(f"A2: ΔL = {dL:.2f} >= {p['dL_amarillo']:.2f} (ln 3, umbral provisional)")
    crit_rec = [r for r in S["activas"] if r["criterio"] and r["criterio"]["cumplido"] is True and r["L"]["mu"] >= 2.0 - 1e-9]
    if crit_rec:
        cond.append("A3")
        for r in crit_rec:
            conf = f"; {AVISO_CONFIRMAR}" if r["d"]["nivel"] == "N4" else ""
            textos.append(f"A3: criterio publicado cumplido en {_nombre(r)} (peso {r['L']['mu']:g}): {r['criterio']['nombre']} "
                          f"[{r['criterio']['fuente']}]{conf}")
    der = [r for r in S["recs"] if r["deriva"] and r["a"] is not None and r["L"]["mu"] >= 2.0 - 1e-9]
    if der:
        cond.append("A4")
        for r in der:
            textos.append(f"A4: deriva (CUSUM o tope de la media adaptativa) en {_nombre(r)}, peso {r['L']['mu']:g}")
    sup = [c for c in capas if c.get("supera_criterio")]
    if sup:
        cond.append("A5")
        for c in sup:
            textos.append(f"A5: capa fija {c['nombre']} supera su criterio publicado (por capa fija {c['ambito']})")
    # ROJO (candidatas)
    rojas = []
    n_prev = max(1, math.ceil(p["persistencia_h"] / 24))
    persiste = len(hist) >= n_prev and all(h["T_inf"] is not None and h["T_inf"] >= p["T_inf_rojo"] - 1e-12 for h in hist[-n_prev:])
    if Tinf >= p["T_inf_rojo"] - 1e-12 and S["hay_activa_valida"]:
        if persiste:
            rojas.append("R-1")
            textos.append(f"R-1: T_inf = {Tinf:.2f} >= {p['T_inf_rojo']:g} (umbral provisional) y persiste >= {p['persistencia_h']:g} h "
                          f"(también en la evaluación del día anterior)")
        else:
            textos.append(f"T_inf = {Tinf:.2f} >= {p['T_inf_rojo']:g} (umbral provisional) pero aún no persiste {p['persistencia_h']:g} h: "
                          "no es ROJO todavía")
    if dLinf is not None and dLinf >= p["dL_inf_rojo"] - 1e-12 and S["hay_activa_valida"]:
        rojas.append("R-2")
        textos.append(f"R-2: límite inferior de ΔL = {dLinf:.2f} >= {p['dL_inf_rojo']:.2f} (ln 10, umbral provisional)")
    if S["centinelas"]:
        rojas.append("R-3")
        for r in S["centinelas"]:
            textos.append(f"R-3: evento centinela informado por una persona: {_nombre(r)} (lista sin fuente, provisional)")
    permitido = bool(rojas) and S["hay_activa_no_n4"]
    if rojas and not permitido:
        blocked = True
        textos.append("ROJO bloqueado: todas las ligas activas son N4 (experimentales); " + AVISO_CONFIRMAR)
    cond += rojas
    return {"condiciones": cond, "rojas": rojas, "amarillas": [c for c in cond if c.startswith("A")], "textos": textos,
            "rojo": permitido, "rojo_bloqueado": blocked,
            "amarillo": bool([c for c in cond if c.startswith("A")]) or blocked,
            "confirmar": any(r["d"]["nivel"] == "N4" for r in S["activas"]) and S["todo_n4"]}


def _faltan_txt(S: dict, n: int = 5) -> str:
    return ", ".join(f"{v} ({vid})" for _, v, vid, _ in S["faltan"][:n]) or "sin detalle"


def gris_motivo(S: dict, p: dict) -> str:
    if S["estructural"]:
        return "estructural: el núcleo solo existe pre/post (no hay medición del núcleo a bordo en esta fase)"
    partes = []
    if S["cobertura"] is None or S["cobertura"] < p["cobertura_min"]:
        c = "sin ligas medibles" if S["cobertura"] is None else f"{S['cobertura']:.2f}"
        partes.append(f"cobertura {c} < {p['cobertura_min']:g} (mínimo provisional)")
    if not S["nucleo_con_dato"] and p.get("exigir_nucleo", True):
        partes.append("ninguna liga del núcleo (peso 3) con dato N1-N3")
    return "faltan " + _faltan_txt(S) + (" (" + "; ".join(partes) + ")" if partes else "")


# ---------------------------------------------------------------------------------------------------
# Color con histeresis (D11, D12)
# ---------------------------------------------------------------------------------------------------
def decidir(S: dict, capas: list[dict], hist: list[dict], prev: dict | None, fecha, p: dict, acuse_entre=None) -> dict:
    """Color del dia. `prev` = {"color","limpias","rojo_desde"} del dia anterior (o None). Devuelve el color, las
    condiciones, el motivo y el nuevo estado de histeresis."""
    c = evaluar_condiciones(S, capas, hist, p)
    if c["rojo"]:
        crudo = "ROJO"
    elif c["amarillo"]:
        crudo = "AMARILLO"
    elif S["estructural"] or not S["cobertura_ok"]:
        crudo = "GRIS"
    else:
        crudo = "VERDE"
    H = max(1, int(p["histeresis_evaluaciones"]))
    prev = prev or {"color": None, "limpias": 0, "rojo_desde": None}
    color, limpias, nota_h, pendiente = crudo, 0, None, False
    limpio = crudo in ("VERDE", "GRIS")
    if prev["color"] == "ROJO" and crudo != "ROJO":
        limpias = prev["limpias"] + 1 if limpio else 0
        ac = bool(acuse_entre and prev.get("rojo_desde") and acuse_entre(prev["rojo_desde"], fecha))
        if not ac:
            color, pendiente = "ROJO", True
            nota_h = "ROJO pendiente de acuse: solo una persona puede bajarlo (D12)"
        elif limpio and limpias >= H:
            color = crudo
        else:
            color = "AMARILLO"
            nota_h = f"acuse registrado; en descenso ({min(limpias, H)} de {H} evaluaciones sin condición, provisional)"
    elif prev["color"] == "AMARILLO" and limpio:
        limpias = prev["limpias"] + 1
        if limpias < H:
            color = "AMARILLO"
            nota_h = f"en descenso: {limpias} de {H} evaluaciones seguidas sin condición (histéresis provisional)"
    rojo_desde = None
    if color == "ROJO":
        rojo_desde = prev["rojo_desde"] if prev["color"] == "ROJO" and prev.get("rojo_desde") else fecha
    et = []
    if color in ("AMARILLO", "ROJO") and not S["cobertura_ok"]:
        et.append("cobertura baja")
    if nota_h:
        et.append("pendiente de acuse" if pendiente else "histéresis")
    return {"color": color, "crudo": crudo, "condiciones": c["condiciones"], "textos": c["textos"], "nota_histeresis": nota_h,
            "pendiente_acuse": pendiente, "etiquetas": et, "confirmar": c["confirmar"], "rojo_bloqueado": c["rojo_bloqueado"],
            "estado": {"color": color, "limpias": limpias if color != "ROJO" or pendiente else 0, "rojo_desde": rojo_desde}}


def motivo(S: dict, d: dict, p: dict) -> str:
    """Una o dos frases del porque de ese color (sin porcentajes de probabilidad)."""
    col = d["color"]
    cond = ", ".join(d["condiciones"])
    if col == "ROJO":
        if d["pendiente_acuse"]:
            return (f"ROJO se mantiene pendiente de acuse humano; la condición del día fue {d['crudo']} "
                    f"({cond or 'sin condición'}). " + d["nota_histeresis"] + ".")
        return f"ROJO por {cond}: T = {S['T']:.2f}, T_inf = {S['T_inf']:.2f} (umbrales provisionales); se recomienda revisión del cirujano de vuelo."
    if col == "AMARILLO":
        if d["nota_histeresis"]:
            return f"AMARILLO por histéresis: {d['nota_histeresis']}."
        base = f"AMARILLO por {cond or 'ROJO bloqueado por N4'}: T = {S['T']:.2f}, T_inf = {S['T_inf']:.2f} (umbrales provisionales)."
        if d["rojo_bloqueado"] or d["confirmar"]:
            base += " " + AVISO_CONFIRMAR[0].upper() + AVISO_CONFIRMAR[1:] + "."
        return base
    if col == "GRIS":
        return "GRIS, evidencia insuficiente: " + gris_motivo(S, p) + "."
    return (f"VERDE: sin condición de AMARILLO ni de ROJO y cobertura {S['cobertura']:.2f} >= {p['cobertura_min']:g} (mínimo provisional) "
            "con núcleo medido. VERDE no significa «sano»: solo sin desviaciones en lo que se midió.")
