"""Constantes provisionales del motor de padecimientos y overrides del usuario.

PROVISIONAL: toda constante de este archivo es un supuesto del equipo (S1..S20 de la seccion (i) de
ALGORITMOS.md) salvo las que llevan fuente explicita (`provisional: False` solo para n0_min, Coskun 2021).
Nada es un diagnostico. Los umbrales EDITABLES por el usuario son los de las secciones f y g.3.

Rutas: siempre relativas a la raiz del prototipo; ningun archivo generado contiene rutas absolutas.
"""
from __future__ import annotations

import json
import math
from datetime import datetime
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]
RUTA_OVERRIDES = RAIZ / "datos" / "modelo" / "overrides.json"
AVISO = "No es un diagnóstico. Se recomienda revisión por el cirujano de vuelo."
NOTA_OVERRIDES = "Valores modificados por el usuario. No tienen fuente. Provisional."


def _p(valor, supuesto, descripcion, provisional=True, fuente=None):
    d = {"valor": valor, "provisional": provisional, "supuesto": supuesto, "descripcion": descripcion}
    if fuente:
        d["fuente"] = fuente
    return d


# ---------------------------------------------------------------------------------------------------
# Constantes (cada una: valor, provisional, supuesto, descripcion). PROVISIONAL salvo indicacion.
# ---------------------------------------------------------------------------------------------------
PARAMETROS: dict[str, dict] = {
    # --- rampa y estado de variable (c.5, d.1) ---
    "rampa_inicio": _p(1.5, "S1", "Inicio de la rampa de activación y corte de «estable» y de «desviada» (u en DE); generaliza el -1.5 DE de Cognition"),
    # --- eco (a.5.4) ---
    "tolerancia_feve_modelos": _p(10.0, "S16", "Dispersión máxima D = máx − mín (puntos porcentuales) entre modelos de eco para la FEVI (01:V18); por encima la métrica queda «discordante». Mismo valor que R2 en fusion/reglas.py (valor de demostración)", fuente="[REG] R2, valor de demostración"),
    "u1_una_direccion": _p(2.33, "S2", "u1 para variables de una dirección (p < 0.01 unilateral, supone normalidad)"),
    "u1_dos_direcciones": _p(2.58, "S2", "u1 para variables de dos direcciones (p < 0.01 bilateral, supone normalidad)"),
    # --- semáforo (f); los siete EDITABLES estan en UMBRALES_EDITABLES ---
    "T_amarillo": _p(3.0, "S2", "AMARILLO si T_p >= este valor (puntos de peso) con al menos una liga activa que no sea de contexto"),
    "T_inf_rojo": _p(2.0, "S2", "ROJO si el límite inferior T_p^inf >= este valor y persiste"),
    "dL_amarillo": _p(math.log(3), "S2", "AMARILLO si ΔL_p >= ln 3 (nats)"),
    "dL_inf_rojo": _p(math.log(10), "S2", "ROJO si el límite inferior de ΔL_p >= ln 10 (nats)"),
    "persistencia_h": _p(24, "S2", "Horas que debe persistir T_p^inf >= T_inf_rojo para ROJO (evaluaciones diarias: 24 h = la evaluación del día anterior)"),
    "histeresis_evaluaciones": _p(2, "S2", "Evaluaciones seguidas sin condición para bajar de AMARILLO (y de ROJO con acuse humano)"),
    "cobertura_min": _p(0.5, "S19", "Cobertura mínima Cob_p para poder mostrar VERDE (g.3)"),
    "exigir_nucleo": _p(True, "S19", "VERDE exige al menos una liga del núcleo (peso 3) con dato vigente N1-N3"),
    # --- autocalibracion (e) ---
    "alpha": _p(0.1, "S3", "α del EWMA protegido (memoria efectiva ≈ 19 observaciones)"),
    "tope_ewma_de": _p(1.5, "S3", "Tope de la media adaptativa: |m - (μ+δ)| <= tope · s_i; al tocarlo se congela y la variable pasa a «deriva»"),
    "cusum_k": _p(0.5, "S3", "k del CUSUM tabular (unidades de DE)"),
    "cusum_h": _p(5.0, "S3", "h del CUSUM tabular (unidades de DE)"),
    "fase_temprana_dias": _p(30, "S4", "Duración de la fase temprana de vuelo (VT) en días; no está establecida en la literatura"),
    "sin_aprendizaje_h": _p(72, "S4", "Horas sin aprendizaje tras cada cambio de fase (lanzamiento, fin de VT, aterrizaje)"),
    "cuarentena_h": _p(72, "S4", "Horas de cuarentena: un punto solo se aprende si no hay alerta en las 72 h siguientes"),
    "n0_min": _p(5, None, "Mínimo de observaciones prevuelo para una base personal propia", provisional=False,
                 fuente="Coskun 2021 (vía INVESTIGACION-PESOS §d); en ALGORITMOS c.3"),
    "z_atipico_prevuelo": _p(2.58, "S5", "Corte de z robusto (mediana/MAD) para excluir atípicos al construir la base prevuelo"),
    "s_w_fc_reloj": _p(3.0, "S5", "DE intra-persona de la FC de reloj (lpm): variación semanal mediana (Quer 2020); único s_w con cifra",
                       fuente="Quer 2020 (vía ALGORITMOS c.3)"),
    "piso_s_fr": _p(3.0, "S5", "Piso de dispersión para la FR en reposo (rpm), error del sensor de PREC"),
    # --- tripulacion (c.4) ---
    "tripulacion_n_descriptivo": _p(4, "S6", "Con n >= este valor la capa 3 es solo descriptiva (n <= 3: inactiva); se permite la etiqueta «desviación compartida»"),
    "tripulacion_n_aislada": _p(7, "S6", "Con n >= este valor se permite la etiqueta «desviación aislada» (|z equivalente| > 1.5)"),
    "fraccion_compartida": _p(0.5, "S6", "Fracción de la tripulación que debe desviarse para «desviación compartida»"),
    # --- bayes / intervalos (d) ---
    "fiebre_c": _p(37.3, "S9", "Fiebre provisional: temperatura corporal > este valor (°C) (límite superior del rango de Obermeyer)"),
    "factor_intervalo": _p(1.645, "S8", "Factor del intervalo de ~90 % (aproximación normal, grupos independientes); no es una calibración"),
    "co2_ancla_mmHg": _p(2.5, "S9", "Ancla de Law 2014: ΔL = ln 2 · (media 7 d de ppCO2 - ancla)"),
    "co2_ventana_dias": _p(7, "S9", "Ventana de la media de CO2 (días)"),
    "sigma_nivel_A": _p(0.5, None, "prior_de del nivel de evidencia A (PADECIMIENTOS)", provisional=False, fuente="PADECIMIENTOS.md"),
    "sigma_nivel_B": _p(1.0, None, "prior_de del nivel de evidencia B (PADECIMIENTOS)", provisional=False, fuente="PADECIMIENTOS.md"),
    "sigma_nivel_C": _p(1.5, None, "prior_de del nivel de evidencia C (PADECIMIENTOS)", provisional=False, fuente="PADECIMIENTOS.md"),
    # --- vigencias (g.2) ---
    "vigencia_continuos_h": _p(24, "S18", "Vigencia de signos continuos (la fija calidad.py en la columna vigencia_h)"),
    "evaluaciones_por_dia": _p(1, "S20", "Una evaluación por día natural (agregación diaria por mediana)"),
}

# Umbrales editables por el usuario (f y g.3) y su regla de validacion.
UMBRALES_EDITABLES = ("T_amarillo", "T_inf_rojo", "dL_amarillo", "dL_inf_rojo",
                      "persistencia_h", "histeresis_evaluaciones", "cobertura_min")


def valor(nombre: str, umbrales_o_none: dict | None = None):
    """Valor de una constante, con los overrides ya resueltos si se pasa el dict de `umbrales()`."""
    if umbrales_o_none and nombre in umbrales_o_none:
        return umbrales_o_none[nombre]["valor"]
    return PARAMETROS[nombre]["valor"]


def params_planos(ruta_overrides=None) -> dict:
    """Dict nombre -> valor con los overrides de umbral aplicados (uso interno del motor)."""
    pl = {k: v["valor"] for k, v in PARAMETROS.items()}
    for k, v in umbrales(ruta_overrides).items():
        pl[k] = v["valor"]
    return pl


def umbrales(ruta_overrides=None) -> dict:
    """Umbrales editables con su valor efectivo y su valor por defecto (provisional)."""
    ov = leer_overrides(ruta_overrides).get("umbrales", {})
    out = {}
    for nombre in UMBRALES_EDITABLES:
        base = PARAMETROS[nombre]
        mod = nombre in ov
        out[nombre] = {
            "valor": ov[nombre]["valor"] if mod else base["valor"],
            "valor_defecto": base["valor"],
            "provisional": True,
            "supuesto": base["supuesto"],
            "descripcion": base["descripcion"],
            "modificado_por_usuario": bool(mod),
        }
        if mod:
            out[nombre]["modificado"] = ov[nombre].get("modificado")
    return out


# ---------------------------------------------------------------------------------------------------
# Overrides (DISENO §6)
# ---------------------------------------------------------------------------------------------------
def _ruta(ruta):
    return Path(ruta) if ruta is not None else RUTA_OVERRIDES


def _vacio() -> dict:
    return {"version": 1, "nota": NOTA_OVERRIDES, "ligas": {}, "umbrales": {}}


def _con_bd(ruta):
    """Conexión a eva.db (EVA_DB) con la tabla pesos_usuario si `ruta` es None; si no, None (se usa overrides.json)."""
    if ruta is not None:
        return None
    from . import evadb
    con = evadb.conectar()
    if con is None:
        return None
    if evadb.faltan(con, ("pesos_usuario",)):
        con.close()
        return None
    return con


def origen_overrides() -> str:
    """Texto para la UI: dónde se guardan los cambios del usuario («eva.db: <ruta>» o «overrides.json»)."""
    from . import evadb
    return evadb.origen_overrides()


def firma_overrides():
    """Valor que cambia cuando cambian los overrides (para invalidar cachés de la UI)."""
    from . import evadb
    if _con_bd(None) is not None or evadb.ruta_eva_db() is not None:
        return ("bd", evadb.firma_bd())
    try:
        return ("json", RUTA_OVERRIDES.stat().st_mtime_ns)
    except OSError:
        return None


def leer_overrides(ruta=None) -> dict:
    """Lee los overrides: de eva.db (tabla pesos_usuario) si `ruta` es None y hay BD; si no, de overrides.json.
    Si no existen devuelve la estructura vacía (sin crear nada)."""
    con = _con_bd(ruta)
    if con is not None:
        from . import evadb
        try:
            base = _vacio()
            base.update(evadb.leer_pesos_usuario(con))
            return base
        finally:
            con.close()
    r = _ruta(ruta)
    if not r.exists():
        return _vacio()
    with open(r, encoding="utf-8") as f:
        d = json.load(f)
    base = _vacio()
    base.update({k: v for k, v in d.items() if k in ("version", "nota")})
    base["ligas"] = dict(d.get("ligas", {}))
    base["umbrales"] = dict(d.get("umbrales", {}))
    return base


def _escribir(d: dict, ruta) -> None:
    d["version"] = 1
    d["nota"] = NOTA_OVERRIDES
    con = _con_bd(ruta)
    if con is not None:
        from . import evadb
        try:
            evadb.escribir_pesos_usuario(con, d)
        finally:
            con.close()
        return
    r = _ruta(ruta)
    r.parent.mkdir(parents=True, exist_ok=True)
    with open(r, "w", encoding="utf-8") as f:
        json.dump(d, f, ensure_ascii=False, indent=2)
        f.write("\n")


def _num(x, nombre):
    if isinstance(x, bool) or not isinstance(x, (int, float)):
        raise ValueError(f"{nombre} debe ser numérico (recibido {x!r})")
    x = float(x)
    if not math.isfinite(x):
        raise ValueError(f"{nombre} debe ser finito (recibido {x!r})")
    return x


def _ahora() -> str:
    return datetime.now().replace(microsecond=0).isoformat()


def guardar_override_liga(pid: str, vid: str, peso=None, prior_de=None, ruta=None) -> dict:
    """Guarda un peso y/o prior_de propios para la liga (pid, vid). Sin fuente: se marca modificado."""
    if peso is None and prior_de is None:
        raise ValueError("indique peso y/o prior_de")
    entrada = {}
    if peso is not None:
        p = _num(peso, "peso")
        if not (0 <= p <= 3):
            raise ValueError("peso fuera de 0..3")
        entrada["peso"] = p
    if prior_de is not None:
        s = _num(prior_de, "prior_de")
        if not s > 0:
            raise ValueError("prior_de debe ser > 0")
        entrada["prior_de"] = s
    d = leer_overrides(ruta)
    clave = f"{pid}|{vid}"
    previo = dict(d["ligas"].get(clave, {}))
    previo.update(entrada)
    previo["modificado"] = _ahora()
    d["ligas"][clave] = previo
    _escribir(d, ruta)
    return previo


def guardar_override_umbral(nombre: str, valor, ruta=None) -> dict:
    """Guarda un valor propio para un umbral editable (numérico, finito, > 0)."""
    if nombre not in UMBRALES_EDITABLES:
        raise ValueError(f"umbral no editable: {nombre}; editables: {', '.join(UMBRALES_EDITABLES)}")
    v = _num(valor, nombre)
    if not v > 0:
        raise ValueError(f"{nombre} debe ser > 0")
    if nombre == "cobertura_min" and v > 1:
        raise ValueError("cobertura_min debe estar en (0, 1]")
    d = leer_overrides(ruta)
    d["umbrales"][nombre] = {"valor": v, "modificado": _ahora()}
    _escribir(d, ruta)
    return d["umbrales"][nombre]


def restaurar(ruta=None) -> bool:
    """Borra los overrides (filas de pesos_usuario o overrides.json): vuelven los valores de las tablas con fuente
    y los umbrales por defecto."""
    con = _con_bd(ruta)
    if con is not None:
        from . import evadb
        try:
            return evadb.vaciar_pesos_usuario(con)
        finally:
            con.close()
    r = _ruta(ruta)
    if r.exists():
        r.unlink()
        return True
    return False


def _limpiar_si_vacio(d: dict, ruta) -> None:
    """Si ya no queda ningún override, borra el archivo (equivale a `restaurar`); si no, lo reescribe."""
    if not d["ligas"] and not d["umbrales"]:
        restaurar(ruta)
    else:
        _escribir(d, ruta)


def quitar_override_liga(pid: str, vid: str, ruta=None) -> bool:
    """Quita el override (peso y prior_de) de la liga (pid, vid): vuelve al valor con fuente. True si existía."""
    d = leer_overrides(ruta)
    clave = f"{pid}|{vid}"
    if clave not in d["ligas"]:
        return False
    del d["ligas"][clave]
    _limpiar_si_vacio(d, ruta)
    return True


def quitar_override_umbral(nombre: str, ruta=None) -> bool:
    """Quita el override de un umbral: vuelve al valor provisional por defecto. True si existía."""
    d = leer_overrides(ruta)
    if nombre not in d["umbrales"]:
        return False
    del d["umbrales"][nombre]
    _limpiar_si_vacio(d, ruta)
    return True
