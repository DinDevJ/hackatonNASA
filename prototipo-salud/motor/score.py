"""Score por padecimiento (ALGORITMOS.md d.1-d.5, g.2, g.3; DISENO.md D7, D13, D14, D16, D17).

PROVISIONAL: la rampa (S1), u1 (S2), el intervalo de ~90 % (S8), los grupos de correlacion (S11), el ancla de CO2 y la
fiebre (S9), la cobertura minima (S19) y las vigencias (S18) son supuestos. Nada es un diagnostico.

Dos canales que NO se suman:
  * canal de pesos: T_p = suma por grupo del maximo de (mu * a); Var(T_p) = suma por grupo de [a^2 sigma^2 + mu^2 Var(a)].
  * canal bayesiano: solo las 6 ligas de `tablas.LR_LIGAS`, solo con kappa = 1.
Una liga sin dato vigente es NA: no suma 0, queda fuera de T_p y baja la cobertura (g.1).
Solo numpy/stdlib: este modulo no usa pandas.
"""
from __future__ import annotations

import math

from . import normalizacion as N
from .tablas import CRITERIOS, DEPENDIENTE_FASE

LETRAS = ("A", "B", "C")
CENTINELAS = ("04:A37", "01:V55")          # R-3: sin fuente [P·S2]; lista por decidir con el equipo
CLASES_NO_PERSONA = ("ecg_adaptador", "modelo_eco", "desconocido")
CLASES_ADAPTADOR = ("ecg_adaptador", "modelo_eco")
FASES_VUELO = ("VT", "VTa")
TXT_NIVEL = {"N1": "alta / referencia", "N2": "media / tendencia", "N3a": "interrogante (baja por evidencia)",
             "N3b": "interrogante (precisión no evaluada)", "N3": "interrogante", "N4": "baja / experimental"}


# ---------------------------------------------------------------------------------------------------
# Ligas (configuracion estatica)
# ---------------------------------------------------------------------------------------------------
def preparar_ligas(tb, p: dict) -> dict:
    """pid -> lista de dicts de ligas (una vez por evaluacion)."""
    out: dict[str, list[dict]] = {}
    r = p["rampa_inicio"]
    for row in tb.ligas.to_dict("records"):
        tipo = row["tipo_direccion"]
        signo = int(row["signo"])
        row["u1"] = p["u1_dos_direcciones"] if signo == 0 else p["u1_una_direccion"]
        row["mu"] = float(row["mu"])
        row["sigma"] = float(row["sigma"])
        row["letra"] = row["nivel_evidencia"] if row["nivel_evidencia"] in LETRAS else "C"
        row["tipo"] = tipo
        row["_rampa"] = r
        out.setdefault(row["padecimiento_id"], []).append(row)
    return out


def medible_en_fase(L: dict, fase: str) -> bool:
    """D13: en VT/VTa solo `sí en vuelo`; en PRE/POST ademas `solo pre-post vuelo`. Analogo/no/no encontrado: nunca."""
    m = L["medido_en_vuelo"]
    if m == "sí en vuelo":
        return True
    return m == "solo pre-post vuelo" and fase in ("PRE", "POST")


def sigma_efectiva(sigma: float, letra: str, nivel: str, p: dict) -> tuple[float, str]:
    """D14: N2 y N3a bajan un escalon; N4 fuerza C; N1 y N3b, el de la tabla. sigma_ef = max(prior_de, sigma del nivel)."""
    if nivel == "N4":
        letra_ef = "C"
    elif nivel in ("N2", "N3a"):
        letra_ef = LETRAS[min(LETRAS.index(letra) + 1, 2)]
    else:
        letra_ef = letra
    if letra_ef == letra and nivel != "N4":
        return sigma, letra
    return max(sigma, float(p["sigma_nivel_" + letra_ef])), letra_ef


def nivel_minimo_por_liga(nivel: str, medido: str) -> tuple[str, str | None]:
    """g.2: F4 (solo analogo) -> si llega un dato entra como N4; F5 (no / no encontrado) -> entra como N3."""
    if medido == "solo análogo" and nivel != "N4":
        return "N4", "liga «solo análogo»: un dato entra como N4 (g.2, F4)"
    if medido in ("no", "no encontrado") and nivel in ("N1", "N2"):
        return "N3b", "liga «no / no encontrado»: un dato capturado entra como N3 (g.2, F5)"
    return nivel, None


# ---------------------------------------------------------------------------------------------------
# d.1 Activacion
# ---------------------------------------------------------------------------------------------------
def rampa(u, u1: float, r: float):
    if u is None:
        return None
    if u <= r:
        return 0.0
    if u >= u1:
        return 1.0
    return (u - r) / (u1 - r)


def _criterio(vid: str, crit: dict, d: dict, vs: dict, sexo):
    """(cumplido True/False/None, detalle). None = indeterminado (aporta 0)."""
    v = d["valor"]
    reg = crit["regla"]
    if reg == "qtc":
        corto = v <= crit["umbral_corto"]
        if sexo == "M":
            alto = v >= crit["umbral_m"]
        elif sexo == "F":
            alto = v >= crit["umbral_f"]
        else:                                            # D16
            if v >= crit["umbral_f"]:
                alto = True
            elif v >= crit["umbral_m"]:
                return None, "indeterminado: falta sexo (entre 450 y 460 ms)"
            else:
                alto = False
        return bool(alto or corto), f"QTc {v:g} ms"
    if reg == "fevi_baja":
        if sexo == "M":
            bajo = v < crit["umbral_m"]
        elif sexo == "F":
            bajo = v < crit["umbral_f"]
        else:                                            # sin sexo: como D16 del QTc
            if v < crit["umbral_m"]:
                bajo = True
            elif v < crit["umbral_f"]:
                return None, "indeterminado: falta sexo (entre 52 y 54 %)"
            else:
                bajo = False
        return bool(bajo), f"FEVI {v:g} %"
    if reg == "ge":
        return v >= crit["umbral"], f"{v:g} >= {crit['umbral']:g} {crit['unidad']}"
    if reg == "le":
        return v <= crit["umbral"], f"{v:g} <= {crit['umbral']:g} {crit['unidad']}"
    if reg == "fuera":
        return (v < crit["umbral_bajo"] or v > crit["umbral_alto"]), f"{v:g} fuera de {crit['umbral_bajo']:g}-{crit['umbral_alto']:g}"
    if reg == "z_le":
        z = vs.get("z_fase")
        if z is None:
            return False, "sin z personal para evaluar el criterio"
        return z <= crit["umbral"], f"z personal {z:+.2f} <= {crit['umbral']:g}"
    if reg == "media7_ge":
        m = d.get("media7")
        if m is None:
            return False, "sin media de 7 días"
        return m >= crit["umbral"], f"media de {d.get('n_media7', 1)} día(s) = {m:.3g} >= {crit['umbral']:g} {crit['unidad']}"
    return False, "regla de criterio no implementada"


def activar(L: dict, d: dict, vs: dict, ctx: dict, p: dict) -> dict:
    """Activacion a_pv de una liga con dato vigente `d`. `a = None` = NA (queda fuera de T_p)."""
    tipo, vid, signo = L["tipo"], L["variable_id"], int(L["signo"])
    r = p["rampa_inicio"]
    u1 = L["u1"]
    out = {"a": None, "var_a": 0.0, "u": None, "u1": u1, "criterio": None, "nota": "", "deriva": False, "motivo_na": None}
    z = vs.get("z")
    crit = CRITERIOS.get(vid) if tipo in ("una_direccion", "dos_direcciones", "criterio") else None

    if tipo in ("presencia", "no_automatica"):
        v = d["valor"]
        if abs(v) < 1e-9 or abs(v - 1.0) < 1e-9:
            out["a"] = 1.0 if v >= 0.5 else 0.0
            if tipo == "no_automatica":
                out["nota"] = "codificada por una persona (no automática)"
        else:
            out["motivo_na"] = f"valor no binario ({v:g}) para una liga de presencia: no se interpreta"
        return out

    if tipo == "dependiente_fase":
        sg = DEPENDIENTE_FASE.get(L["direccion"], {}).get(ctx["fase"]) if L["direccion"] in DEPENDIENTE_FASE else None
        if L["direccion"] not in DEPENDIENTE_FASE:
            out["motivo_na"] = "condición dependiente de fase no implementada"
            return out
        if sg is None:
            out["motivo_na"] = "en PRE no aplica (dependiente de fase)"
            return out
        signo = sg
        u1 = p["u1_una_direccion"]
        out["u1"] = u1
        out["nota"] = f"signo {'+' if sg > 0 else '-'} por fase {ctx['fase']}"
        crit = None

    cumplido = None
    if crit is not None:
        cumplido, det = _criterio(vid, crit, d, vs, ctx.get("sexo"))
        out["criterio"] = {"nombre": crit["nombre"], "fuente": crit["fuente"], "ambito": crit["ambito"],
                           "cumplido": cumplido, "detalle": det}
        if cumplido is True:
            out["a"] = 1.0
            if z is not None:
                out["u"] = N.desviacion_adversa(z, signo)
            return out
        if cumplido is None:
            out["a"] = 0.0
            out["nota"] = det
            return out

    if z is None:
        if crit is not None or vid in N.ORDINALES:
            out["a"] = 0.0                                              # D7: dato vigente, cuenta para cobertura
            out["nota"] = "criterio no cumplido; sin base personal para la rampa" if crit is not None else \
                "banda ordinal sin criterio cumplido; sin base personal para la rampa"
        else:
            out["motivo_na"] = vs.get("motivo_sin_z") or "sin z (sin base personal ni referencia poblacional)"
        return out

    u = N.desviacion_adversa(z, signo)
    out["u"] = u
    out["a"] = rampa(u, u1, r)
    if r < u < u1:
        out["var_a"] = (vs.get("var_z") or 0.0) / (u1 - r) ** 2
    if u < u1:
        if signo > 0:
            out["deriva"] = bool(vs.get("deriva_pos"))
        elif signo < 0:
            out["deriva"] = bool(vs.get("deriva_neg"))
        else:
            out["deriva"] = bool(vs.get("deriva_pos") or vs.get("deriva_neg"))
    return out


# ---------------------------------------------------------------------------------------------------
# d.2 Canal bayesiano
# ---------------------------------------------------------------------------------------------------
def bayes_liga(L: dict, lr: dict, d: dict, sigma_ef: float, p: dict) -> dict:
    """{kappa, ln_lr, de, motivo}. kappa = 1 solo con el metodo del estudio de origen; nunca con adaptador ni N4."""
    nivel, clase, metodo = d["nivel"], d["clase"], d.get("metodo")
    razon = None
    if clase in CLASES_ADAPTADOR:
        razon = "salida de adaptador o de modelo: nunca usa el LR publicado (kappa = 0)"
    elif nivel == "N4":
        razon = "medición N4: kappa = 0"
    elif metodo not in lr["metodos_kappa1"]:
        razon = f"método {metodo or 'no declarado'} distinto del de origen ({', '.join(lr['metodos_kappa1'])}): kappa = 0"
    elif lr.get("niveles_kappa1") and nivel not in lr["niveles_kappa1"]:
        razon = f"nivel {nivel} fuera de {', '.join(lr['niveles_kappa1'])}: kappa = 0"
    if razon:
        return {"kappa": 0, "ln_lr": 0.0, "de": 0.0, "motivo": razon, "fuente": lr["fuente"], "ambito": lr["ambito"]}
    v = d["valor"]
    vid = L["variable_id"]
    if lr["tipo"] == "continuo":
        m = d.get("media7", v)
        ln = math.log(2.0) * (m - p["co2_ancla_mmHg"])
        mot = f"ln 2 × (media de {d.get('n_media7', 1)} día(s) {m:.3g} − ancla {p['co2_ancla_mmHg']:g}) [provisional]"
    else:
        if vid == "04:A1":
            pos = v > p["fiebre_c"]
        else:
            pos = v >= (lr.get("corte_positivo") if lr.get("corte_positivo") is not None else 0.5)
        ln = lr["ln_lr_pos"] if pos else lr["ln_lr_neg"]
        mot = ("resultado positivo: ln LR+" if pos else
               ("resultado negativo: ln LR−" if lr["tipo"] == "binario" else "resultado negativo sin LR− publicado: aporta 0"))
    de = abs(ln) * sigma_ef / L["mu"]
    return {"kappa": 1, "ln_lr": float(ln), "de": float(de), "motivo": mot, "fuente": lr["fuente"], "ambito": lr["ambito"]}


# ---------------------------------------------------------------------------------------------------
# g.2 Ausencia
# ---------------------------------------------------------------------------------------------------
def ausencia(L: dict, fase: str, info: dict | None) -> tuple[str, str]:
    """Codigo F1-F7 y motivo para una liga sin dato vigente. `info` = {"sin_dato": motivo|None, "vencido": entrada|None}."""
    m = L["medido_en_vuelo"]
    info = info or {}
    if m == "solo pre-post vuelo" and fase in FASES_VUELO:
        return "F3", "solo pre/post: ausencia estructural en vuelo (no entra al denominador de la cobertura)"
    if m == "solo análogo":
        return "F4", "solo análogo: no se espera dato"
    if m in ("no", "no encontrado"):
        return "F5", "no medido / no encontrado: no se espera ni penaliza"
    if info.get("sin_dato"):
        return "F2", str(info["sin_dato"])
    if info.get("vencido") is not None:
        v = info["vencido"]
        return "F7", f"vencido: último valor {v['valor']:g} del {v['fecha'].isoformat()} fuera de su vigencia"
    return "F1", "no medido en esta ventana"


# ---------------------------------------------------------------------------------------------------
# Un padecimiento
# ---------------------------------------------------------------------------------------------------
def evaluar_padecimiento(pid: str, ligas: list[dict], datos: dict, estados: dict, info_aus: dict, ctx: dict, p: dict, tb) -> dict:
    """Devuelve el score de `pid` ese dia. `datos[vid]` = dato vigente o ausente; `estados[vid]` = estado de la variable."""
    fase = ctx["fase"]
    recs = []
    for L in ligas:
        vid = L["variable_id"]
        d = datos.get(vid)
        rec = {"L": L, "d": None, "a": None, "var_a": 0.0, "u": None, "criterio": None, "nota": "", "deriva": False,
               "bayes": None, "ausencia": None, "motivo_ausencia": None, "nivel_efectivo": None, "sigma_ef": None,
               "letra_ef": None, "cuenta_en_T": False, "nota_nivel": None}
        if d is None:
            rec["ausencia"], rec["motivo_ausencia"] = ausencia(L, fase, info_aus.get(vid))
            recs.append(rec)
            continue
        nivel, nota_n = nivel_minimo_por_liga(d["nivel"], L["medido_en_vuelo"])
        d2 = d if nivel == d["nivel"] else dict(d, nivel=nivel)
        rec["d"], rec["nota_nivel"] = d2, nota_n
        rec["sigma_ef"], rec["letra_ef"] = sigma_efectiva(L["sigma"], L["letra"], nivel, p)
        rec["nivel_efectivo"] = rec["letra_ef"]
        act = activar(L, d2, estados.get(vid, {}), ctx, p)
        rec.update({k: act[k] for k in ("a", "var_a", "u", "criterio", "nota", "deriva")})
        if act["a"] is None:                              # dato presente pero sin z / no interpretable: NA con motivo
            rec["motivo_ausencia"] = act["motivo_na"]
        lr = tb.lr_ligas.get((pid, vid))
        if lr is not None and act["a"] is not None:
            rec["bayes"] = bayes_liga(L, lr, d2, rec["sigma_ef"], p)
        recs.append(rec)

    # --- canal de pesos (d.3, d.4) ---
    mejores: dict = {}
    for rec in recs:
        if rec["a"] is None:
            continue
        L = rec["L"]
        g = L["grupo"] if isinstance(L["grupo"], str) else ("_", L["variable_id"])
        aporte = L["mu"] * rec["a"]
        cur = mejores.get(g)
        if cur is None or (aporte, -rec["sigma_ef"]) > (cur[0], -cur[1]["sigma_ef"]):
            mejores[g] = (aporte, rec)
    T = var = 0.0
    for aporte, rec in mejores.values():
        L = rec["L"]
        T += aporte
        var += (rec["a"] ** 2) * rec["sigma_ef"] ** 2 + L["mu"] ** 2 * rec["var_a"]
        rec["cuenta_en_T"] = True
    de = math.sqrt(var)
    T_inf = max(0.0, T - p["factor_intervalo"] * de)

    # --- cobertura (g.3) y nucleo (D13) ---
    den = num = sin_dato_mu = 0.0
    nucleo_medible = nucleo_dato = False
    faltan = []
    for rec in recs:
        L = rec["L"]
        med = medible_en_fase(L, fase)
        cubre = rec["a"] is not None and rec["d"]["nivel"] in N.NIVELES_COBERTURA
        if med:
            den += L["mu"]
            if cubre:
                num += L["mu"]
            if rec["a"] is None:
                sin_dato_mu += L["mu"]
                faltan.append((L["mu"], L["variable"], L["variable_id"], bool(L["nucleo"])))
        if L["nucleo"]:
            nucleo_medible = nucleo_medible or med
            nucleo_dato = nucleo_dato or cubre
    cob = (num / den) if den > 0 else None
    tiene_nucleo = any(r["L"]["nucleo"] for r in recs)
    exigir = bool(p.get("exigir_nucleo", True)) and tiene_nucleo
    estructural = bool(exigir and not nucleo_medible and not nucleo_dato) or den <= 0
    cob_ok = (cob is not None and cob >= p["cobertura_min"]) and (nucleo_dato or not exigir)
    faltan.sort(key=lambda t: (not t[3], -t[0], t[2]))

    # --- canal bayesiano (d.2, d.5) ---
    bay = [r for r in recs if r["bayes"] is not None and r["bayes"]["kappa"] == 1]
    dL = dL_de = dL_inf = None
    if bay:
        dL = sum(r["bayes"]["ln_lr"] for r in bay)
        dL_de = math.sqrt(sum(r["bayes"]["de"] ** 2 for r in bay))
        dL_inf = dL - p["factor_intervalo"] * dL_de
    pri = tb.priors.get(pid)
    prior = None
    if pri and pri.get("ell0") is not None and fase in pri.get("fases", []):
        prior = {"disponible": True, "ell0": pri["ell0"], "de": pri.get("de"), "fuente": pri["fuente"], "nota": pri.get("nota", ""),
                 "fase_aplica": list(pri["fases"]), "provisional": True, "supuesto": "S7",
                 "ell_orden": pri["ell0"] + (dL or 0.0),
                 "aviso": "log-odds internas (nats): solo ordenan; no son una probabilidad (D17)"}

    activas = [r for r in recs if r["a"] is not None and r["a"] > 0]
    return {
        "pid": pid, "recs": recs, "T": T, "T_de": de, "T_inf": T_inf, "T_max": T + sin_dato_mu,
        "dL": dL, "dL_de": dL_de, "dL_inf": dL_inf, "prior": prior,
        "cobertura": cob, "cobertura_ok": bool(cob_ok), "nucleo_con_dato": bool(nucleo_dato), "nucleo_medible": bool(nucleo_medible),
        "estructural": bool(estructural), "faltan": faltan, "activas": activas,
        "hay_activa_no_contexto": any(not r["L"]["es_contexto"] for r in activas),
        "hay_activa_no_n4": any(r["d"]["nivel"] != "N4" for r in activas),
        "hay_activa_valida": any((not r["L"]["es_contexto"]) and r["d"]["nivel"] != "N4" for r in activas),
        "todo_n4": bool(activas) and all(r["d"]["nivel"] == "N4" for r in activas),
        "centinelas": [r for r in activas if r["L"]["variable_id"] in CENTINELAS and r["a"] >= 1.0 and r["d"]["nivel"] != "N4"
                       and r["d"]["clase"] not in CLASES_NO_PERSONA],
    }
