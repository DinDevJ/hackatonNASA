"""Orquestador del motor de padecimientos (ALGORITMOS.md §0; DISENO.md §4-§5).

PROVISIONAL: todos los umbrales, la rampa, la autocalibracion y las vigencias son supuestos (S1-S20). **Nada es un
diagnostico**: ordena que revisar y recomienda consultar al cirujano de vuelo. Sin porcentajes de probabilidad (D17).

Orden de calculo por persona y por dia natural (D2), recalculo determinista sobre todas las observaciones:
  1 separar canales (real/simulado)  2 observaciones ya pasadas por la puerta de calidad  3 por variable: z, CUSUM, estado
  4 por padecimiento: activaciones, T, dL, cobertura, capas fijas  5 semaforo y motivo  6 aprendizaje (solo despues del
  semaforo, con e.2 completo)  7 salida.
La tripulacion (c.4) solo aporta etiquetas de contexto: nunca cambia una base ni apaga una alerta.
"""
from __future__ import annotations

import bisect
import math
import time
from datetime import date, timedelta
from pathlib import Path

import numpy as np
import pandas as pd

from . import calibracion as CAL
from . import normalizacion as N
from . import parametros as P
from . import score as S
from . import semaforo as SEM
from . import tablas as T

FASE_TXT = {"PRE": "prevuelo (PRE)", "VT": "vuelo temprano (VT)", "VTa": "vuelo tardío (VTa)", "POST": "postvuelo (POST)"}
CLASES_EPISODIO_SINTOMA = ("autorreporte",)
FARMACOS = ("01:V42", "03:V87")
BINARIAS = ("presencia_0_1", "bandera_0_1_no_diagnostica")


# ---------------------------------------------------------------------------------------------------
# utilidades
# ---------------------------------------------------------------------------------------------------
def _num(x):
    if x is None:
        return None
    try:
        f = float(x)
    except (TypeError, ValueError):
        return None
    return f if math.isfinite(f) else None


def _seguro(o, clave=None):
    """Convierte a tipos JSON puros (sin NaN, sin numpy). `%` solo se conserva en las claves `unidad`."""
    if o is None or isinstance(o, (bool, str)):
        if isinstance(o, str) and "%" in o and clave != "unidad":
            return o.replace("%", " por ciento")
        return o
    if isinstance(o, (np.bool_,)):
        return bool(o)
    if isinstance(o, (int, np.integer)):
        return int(o)
    if isinstance(o, (float, np.floating)):
        f = float(o)
        return f if math.isfinite(f) else None
    if isinstance(o, dict):
        return {str(k): _seguro(v, k) for k, v in o.items()}
    if isinstance(o, (list, tuple, set, frozenset)):
        seq = sorted(o, key=str) if isinstance(o, (set, frozenset)) else o
        return [_seguro(v, clave) for v in seq]
    if isinstance(o, (date, pd.Timestamp)):
        return o.isoformat()[:10] if not isinstance(o, pd.Timestamp) else o.isoformat()
    if isinstance(o, np.ndarray):
        return [_seguro(v) for v in o.tolist()]
    return str(o)


def _f(x, nd=2):
    return "—" if x is None else f"{x:.{nd}f}"


def _un(u) -> str:
    return str(u or "").replace("%", "por ciento")


def _iso(d) -> str:
    return d.isoformat() if hasattr(d, "isoformat") else str(d)


# ---------------------------------------------------------------------------------------------------
# Evaluador de un canal
# ---------------------------------------------------------------------------------------------------
class _Evaluador:
    def __init__(self, df, tb, p, mision, perfiles, canal, cal):
        self.tb, self.p, self.mision, self.perfiles, self.canal, self.cal = tb, p, mision or {}, perfiles or {}, canal, cal
        self.registro: list = []
        self.ligas_pid = S.preparar_ligas(tb, p)
        self.pad_nombre = dict(zip(tb.padecimientos["padecimiento_id"], tb.padecimientos["padecimiento"]))
        self.pids = sorted(self.ligas_pid)
        self.por_vid: dict[str, list] = {}
        for pid, ls in self.ligas_pid.items():
            for L in ls:
                self.por_vid.setdefault(L["variable_id"], []).append((pid, L))
        self.pids_de_vid = {v: sorted({pid for pid, _ in x}) for v, x in self.por_vid.items()}
        tipos = {v: {L["tipo"] for _, L in x} for v, x in self.por_vid.items()}
        self.presencia_vars = {v for v, t in tipos.items() if t <= {"presencia", "no_automatica"}}
        bin_u = df[df["unidad"].isin(BINARIAS) & df["variable_id"].notna()]["variable_id"].unique().tolist()
        self.presencia_vars |= set(bin_u)
        self.vids_media7 = {v for v, c in T.CRITERIOS.items() if c["regla"] == "media7_ge"}
        self.df = df
        self._fase_cache: dict = {}
        self._base_cache: dict = {}
        self._crew_cache: dict = {}
        self.frozen: dict = {}
        self.verificadas: set = set()
        self.dia_x: dict = {}                 # (sid, fecha) -> {vid: (x_t, clase, fase, z)}
        self.resultados: dict = {}

    # ---------------------------------------------------------------- fase
    def fase(self, sid, d):
        k = (sid, d)
        r = self._fase_cache.get(k)
        if r is None:
            r = N.fase_de(d, self.mision.get(sid), self.p)
            self._fase_cache[k] = r
        return r

    # ---------------------------------------------------------------- bases
    def _build_base(self, sid, vid, clase, corte, perfil, z_perm):
        """Base prevuelo (c.3) con los puntos PRE admitidos anteriores a `corte`; (base, motivo)."""
        k = (sid, vid, clase, corte)
        if k in self._base_cache:
            return self._base_cache[k]
        pts = self.pre_pts.get((sid, vid, clase), [])
        xs = [x for f, x, _ in pts if f < corte]
        nivel_t = any(e["nivel"] == "N2" for f, _, e in pts if f < corte)
        ref = N.referencia_poblacional(vid, perfil, z_perm)
        ck = (vid, clase, corte)
        crew = self._crew_cache.get(ck)
        if crew is None:
            por = {s2: [x for f, x, _ in v if f < corte] for (s2, v2, c2), v in self.pre_pts.items()
                   if v2 == vid and c2 == clase}
            crew = N.estadisticos_tripulacion(por)
            self._crew_cache[ck] = crew
        res = N.construir_base(xs, vid, clase, self.p, ref, crew, nivel_tendencia=nivel_t)
        self._base_cache[k] = res
        return res

    def get_base(self, sid, vid, clase, D, fi, perfil, z_perm):
        """(base|None, motivo|None, congelada). Congelada: mision declarada y fase != PRE; se respeta la del archivo."""
        clv = CAL.clave(sid, vid, clase)
        if fi["mision_declarada"] and fi["fase"] != "PRE":
            b = self.frozen.get(clv)
            if b is not None or clv in self.verificadas:
                return b, None if b else "sin base prevuelo", True
            self.verificadas.add(clv)
            nueva, mot = self._build_base(sid, vid, clase, date.max, perfil, z_perm)
            lanz = N._fecha(self.mision[sid]["lanzamiento"])
            if nueva is not None:
                self.cal.congelar_base(clv, nueva, lanz)
            b = self.cal.base_vigente(clv, D)
            self.frozen[clv] = b
            return b, (None if b else mot), True
        base, mot = self._build_base(sid, vid, clase, D, perfil, z_perm)
        return base, mot, False

    # ---------------------------------------------------------------- una persona
    def evaluar_persona(self, sid: str, g: pd.DataFrame, entradas: list[dict], rechazadas):
        p, tb, cal = self.p, self.tb, self.cal
        perfil = self.perfiles.get(sid) or {}
        sexo = perfil.get("sexo")
        ts = g["timestamp"].dt.normalize().dt.date
        d0, d1 = ts.min(), ts.max()
        fechas = [d0 + timedelta(days=i) for i in range((d1 - d0).days + 1)]
        por_vid: dict[str, list] = {}
        for e in entradas:
            por_vid.setdefault(e["variable_id"], []).append(e)
        for v in por_vid.values():
            v.sort(key=lambda e: e["fecha"])
        fechas_vid = {v: [e["fecha"] for e in lst] for v, lst in por_vid.items()}
        vids = [v for v in por_vid if v in self.por_vid]
        ptr = {v: -1 for v in vids}
        hist: dict[str, list] = {pid: [] for pid in self.pids}
        prev: dict[str, dict | None] = {pid: None for pid in self.pids}
        alerta_fechas: dict[str, set] = {}
        last_vs: dict[str, dict] = {}
        final = {}
        rampa = p["rampa_inicio"]

        for D in fechas:
            ultimo = D == d1
            fi = self.fase(sid, D)
            fase = fi["fase"]
            cal.aplicar_revisiones(D)
            datos, info_aus, estados = {}, {}, {}
            for v in vids:
                lst, fl = por_vid[v], fechas_vid[v]
                i = bisect.bisect_right(fl, D) - 1
                if i < 0:
                    continue
                e = lst[i]
                j = i
                while j >= 0 and not (lst[j]["valor"] == lst[j]["valor"] and lst[j]["sin_dato"] is None):
                    j -= 1
                valido = lst[j] if j >= 0 else None
                if valido is not None and N.vigente(valido, D):
                    d = dict(valido)
                    d["antiguedad_dias"] = (D - valido["fecha"]).days
                    d["nueva"] = valido["fecha"] == D
                    if v in self.vids_media7:
                        k0 = bisect.bisect_right(fl, D - timedelta(days=int(p["co2_ventana_dias"])))
                        vv = [x["valor"] for x in lst[k0:i + 1] if x["valor"] == x["valor"] and x["sin_dato"] is None]
                        d["media7"], d["n_media7"] = (float(np.mean(vv)), len(vv)) if vv else (d["valor"], 1)
                    datos[v] = d
                else:
                    sd = e["sin_dato"] if e["valor"] != e["valor"] else None
                    info_aus[v] = {"sin_dato": sd, "vencido": valido if (valido is not None and sd is None) else None}
            # ---- 3. estado de cada variable con dato
            dx = {}
            for v, d in datos.items():
                vs = self._estado_variable(sid, v, d, D, fi, perfil, alerta_fechas)
                estados[v] = vs
                dx[v] = (vs["x_t"], d["clase"], fase, vs["z"])
                last_vs[v] = vs
            self.dia_x[(sid, D)] = dx
            # ---- 4-5. padecimientos y semaforo
            ctx = {"fase": fase, "sexo": sexo}
            colores = {}
            resultado_dia = {}
            for pid in self.pids:
                Sc = S.evaluar_padecimiento(pid, self.ligas_pid[pid], datos, estados, info_aus, ctx, p, tb)
                capas = SEM.capas_fijas(pid, tb, datos)
                dec = SEM.decidir(Sc, capas, hist[pid], prev[pid], D, p,
                                  acuse_entre=lambda a, b, _pid=pid: cal.acuse_entre(sid, _pid, a, b))
                prev[pid] = dec["estado"]
                colores[pid] = dec["color"]
                resultado_dia[pid] = (Sc, dec, capas)
                hist[pid].append({"fecha": D, "color": dec["color"], "T": Sc["T"], "T_inf": Sc["T_inf"], "condiciones": dec["condiciones"]})
            # ---- 6. aprendizaje (solo despues del semaforo)
            self._aprender(sid, D, fi, datos, estados, colores, por_vid, alerta_fechas, g)
            if ultimo:
                final = resultado_dia
                final_datos, final_info, final_estados, final_fi = datos, info_aus, estados, fi
        return {"fechas": fechas, "final": final, "datos": final_datos, "info": final_info, "estados": final_estados, "fi": final_fi,
                "hist": hist, "last_vs": last_vs, "por_vid": por_vid, "perfil": perfil, "ctx": {"fase": final_fi["fase"], "sexo": sexo}}

    # ---------------------------------------------------------------- variable
    def _estado_variable(self, sid, v, d, D, fi, perfil, alerta_fechas) -> dict:
        p, cal = self.p, self.cal
        clase = d["clase"]
        x_t = N.transformar(v, d["valor"])
        clv = CAL.clave(sid, v, clase)
        base, motivo, congelada = self.get_base(sid, v, clase, D, fi, perfil, d["z_pob_permitido"])
        vs = {"x_t": x_t, "clv": clv, "clase": clase, "base": base, "congelada": congelada, "z": None, "z_fase": None, "z_pob": None,
              "z_act": None, "var_z": None, "n0": base["n0"] if base else 0, "motivo_sin_z": None, "deriva_pos": False,
              "deriva_neg": False, "alertada": False, "persistente": False, "estado": "sin_z", "u_max": None, "origen_z": None}
        if x_t != x_t:
            vs["motivo_sin_z"] = "valor no transformable (ln de un valor no positivo)"
            return vs
        zp = N.z_poblacional(v, x_t, perfil, d["z_pob_permitido"])
        vs["z_pob"] = zp
        if base is not None:
            z = N.z_fase(x_t, base)
            vs.update(z=z, z_fase=z, var_z=N.var_z(z, base["n0"]), origen_z="personal")
            if congelada and fi["fase"] != "PRE":
                e = cal.iniciar_ewma(clv, base["mu"], base["s"])
                vs["z_act"] = (x_t - e["m"]) / base["s"]
                if d["nueva"] and d["nivel"] != "N4":
                    cal.actualizar_cusum(clv, x_t, base["mu"], base["s"], D)
                c = cal.cusum.get(clv)
                if c:
                    vs["deriva_pos"] = bool(c["senal_pos"] or (e["congelada_tope"] and e["lado_tope"] > 0))
                    vs["deriva_neg"] = bool(c["senal_neg"] or (e["congelada_tope"] and e["lado_tope"] < 0))
                else:
                    vs["deriva_pos"] = bool(e["congelada_tope"] and e["lado_tope"] > 0)
                    vs["deriva_neg"] = bool(e["congelada_tope"] and e["lado_tope"] < 0)
            else:
                vs["z_act"] = z
        elif zp is not None:
            vs.update(z=zp, var_z=0.0, origen_z="poblacional")
        else:
            vs["motivo_sin_z"] = ("sin base personal: " + motivo) if motivo else \
                "sin base personal ni referencia poblacional (ALGORITMOS c.2)"
            if d["nivel"] == "N4":
                vs["motivo_sin_z"] += "; el nivel N4 nunca construye una base (b.2)"
        # alerta de variable (D8): alguna liga con u >= u1
        z = vs["z"]
        if z is not None:
            amax, alert, u_sel = None, False, None
            for _, L in self.por_vid[v]:
                if L["tipo"] in ("presencia", "no_automatica"):
                    continue
                u = N.desviacion_adversa(z, int(L["signo"]))
                if amax is None or u > amax:
                    amax = u
                if u >= L["u1"]:
                    alert, u_sel = True, (u, L["u1"])
            vs["u_max"], vs["alertada"] = amax, alert
            ant = alerta_fechas.setdefault(v, set())
            vs["persistente"] = alert and (D - timedelta(days=1)) in ant
            if alert and d["nueva"]:
                ant.add(D)
            deriva = any((int(L["signo"]) > 0 and vs["deriva_pos"]) or (int(L["signo"]) < 0 and vs["deriva_neg"]) or
                         (int(L["signo"]) == 0 and (vs["deriva_pos"] or vs["deriva_neg"]))
                         for _, L in self.por_vid[v] if L["tipo"] not in ("presencia", "no_automatica"))
            if alert:
                vs["estado"] = N.estado_variable(u_sel[0], u_sel[1], self.p["rampa_inicio"], vs["persistente"], False)
            else:
                vs["estado"] = N.estado_variable(amax if amax is not None else 0.0, self.p["u1_una_direccion"],
                                                 self.p["rampa_inicio"], False, deriva)
        return vs

    # ---------------------------------------------------------------- 6. aprendizaje
    def _aprender(self, sid, D, fi, datos, estados, colores, por_vid, alerta_fechas, g):
        cal, p = self.cal, self.p
        episodio = self._episodio(datos)
        for v, d in datos.items():
            vs = estados[v]
            pad_alert = any(colores[pid] in ("AMARILLO", "ROJO") for pid in self.pids_de_vid[v])
            if vs["alertada"] or pad_alert:
                cal.marcar_alerta(f"{sid}|{v}", D)
        for v, d in datos.items():
            vs = estados[v]
            if not d["nueva"]:
                continue
            if not (vs["base"] is not None and vs["congelada"] and fi["fase"] != "PRE"):
                continue
            pad_alert = any(colores[pid] in ("AMARILLO", "ROJO") for pid in self.pids_de_vid[v])
            cal.ofrecer_punto(vs["clv"], D, vs["x_t"], nivel=d["nivel"], simulated=False, calidad_buena=d["calidad_buena"],
                              z_act=vs["z_act"], contexto_estandar=N.contexto_estandar(v, d.get("contexto")),
                              variable_alertada=vs["alertada"], padecimiento_alertado=pad_alert, episodio=episodio,
                              en_transicion=fi["en_transicion"], fase=fi["fase"])
        for clv in [k for k in cal.ewma if k.startswith(sid + "|")]:
            cal.procesar_cola(clv, D)

    def _episodio(self, datos) -> bool:
        """D9: bandera de ritmo = 1, fiebre, EVA/ejercicio, sintoma de presencia = 1 o farmaco: no se aprende nada ese dia."""
        for v, d in datos.items():
            if d.get("contexto") in ("eva", "ejercicio"):
                return True
            val = d["valor"]
            if v == "01:V31" and val >= 0.5:
                return True
            if v == "04:A1" and val > self.p["fiebre_c"]:
                return True
            if v in FARMACOS and val >= 0.5:
                return True
            if v in self.presencia_vars and d["clase"] in CLASES_EPISODIO_SINTOMA and val >= 0.5:
                return True
        return False


# ---------------------------------------------------------------------------------------------------
# Salida
# ---------------------------------------------------------------------------------------------------
def _liga_json(rec: dict, vs: dict | None, tb, canal: str) -> dict:
    L, d = rec["L"], rec["d"]
    vencido = rec.get("vencido")
    etq = []
    if L["es_contexto"]:
        etq.append("contexto o predisposición: no dispara por sí sola")
    if d is not None:
        etq += [t.strip() for t in str(d.get("etiquetas", "")).split(";") if t.strip()]
        if d["nivel"] == "N4":
            etq.append("[experimental] N4: se evalúa como nivel C")
        if d["nivel"] == "N3b":
            etq.append("precisión no evaluada")
    if rec.get("nota_nivel"):
        etq.append(rec["nota_nivel"])
    if rec["nota"]:
        etq.append(rec["nota"])
    if L["tipo"] == "no_automatica" and d is None:
        etq.append("no automática: solo si una persona la codifica")
    if rec["deriva"]:
        etq.append("deriva")
    ult = d or vencido
    a = rec["a"]
    out = {
        "variable_id": L["variable_id"], "variable": L["variable"], "peso": L["mu"], "prior_de": L["sigma"],
        "nivel_evidencia": L["nivel_evidencia"], "nivel_efectivo": rec["nivel_efectivo"], "sigma_efectiva": rec["sigma_ef"],
        "modificado_por_usuario": bool(L["modificado_por_usuario"]), "fuente": L["fuente"] if isinstance(L["fuente"], str) else None,
        "fuente_urls": list(L["fuente_urls"]), "direccion": L["direccion"], "tipo_direccion": L["tipo"],
        "medido_en_vuelo": L["medido_en_vuelo"], "ausencia": rec["ausencia"], "motivo_ausencia": rec["motivo_ausencia"],
        "valor": ult["valor"] if ult else None, "unidad": ult["unidad"] if ult else None,
        "fecha_dato": ult["fecha"] if ult else None, "antiguedad_dias": d["antiguedad_dias"] if d else None,
        "nivel_calidad": d["nivel"] if d else None, "clase_dispositivo": ult["clase"] if ult else None,
        "z_pob": vs["z_pob"] if vs else None, "z_fase": vs["z_fase"] if vs else None, "z_act": vs["z_act"] if vs else None,
        "u": rec["u"], "var_z": vs["var_z"] if vs else None, "activacion": a,
        "aporte": (L["mu"] * a) if a is not None else None,
        "grupo": L["grupo"] if isinstance(L["grupo"], str) else None, "cuenta_en_T": rec["cuenta_en_T"],
        "criterio": rec["criterio"], "bayes": rec["bayes"], "estado_variable": vs["estado"] if vs else None,
        "delta_tripulacion": None, "etiquetas": etq, "contexto": bool(L["es_contexto"]), "deriva": bool(rec["deriva"]),
        "origen_z": vs["origen_z"] if vs else None,
    }
    return out


def _pasos(pid, nombre, Sc, dec, capas, fecha, fase, canal, p, ligas_json) -> list[str]:
    pasos = []
    n = 1

    def add(t):
        nonlocal n
        pasos.append(f"{n}. {t}")
        n += 1
    sim = " DATOS SIMULADOS (SIMULADO): solo ejercitan el flujo." if canal == "simulado" else ""
    add(f"{pid} · {nombre}: evaluación del {_iso(fecha)}, fase {FASE_TXT[fase]}. Todos los umbrales son provisionales.{sim}")
    con = [r for r in Sc["recs"] if r["a"] is not None]
    act = [r for r in con if r["a"] > 0]
    for r in sorted(act, key=lambda r: -r["L"]["mu"] * r["a"]):
        L, d = r["L"], r["d"]
        if r["criterio"] and r["criterio"]["cumplido"] is True:
            como = f"criterio publicado cumplido ({r['criterio']['detalle']}; {r['criterio']['fuente']}) → activación 1"
        elif L["tipo"] in ("presencia", "no_automatica"):
            como = "presente → activación 1"
        else:
            zt = "" if r["u"] is None else f"u = {r['u']:+.2f} DE en sentido adverso; rampa de 1.5 a {r['L']['u1']:g} (provisional) → "
            como = f"{zt}activación {r['a']:.2f}"
        grupo = "" if r["cuenta_en_T"] else " (no suma: en su grupo de correlación cuenta solo el mayor)"
        add(f"Aporta {L['variable']} ({L['variable_id']}): valor {d['valor']:g} {_un(d['unidad'])} el {_iso(d['fecha'])}, nivel {d['nivel']} "
            f"({d['clase']}); {como}; peso {L['mu']:g} × {r['a']:.2f} = {L['mu'] * r['a']:.2f}; nivel de evidencia "
            f"{L['nivel_evidencia']} → efectivo {r['nivel_efectivo']}, σ = {r['sigma_ef']:.2f}{grupo}.")
    cero = [r for r in con if r["a"] == 0]
    if cero:
        nombres = ", ".join(f"{r['L']['variable_id']}" for r in cero[:10]) + (" …" if len(cero) > 10 else "")
        add(f"{len(cero)} liga(s) con dato y activación 0 (dentro de lo esperado o criterio no cumplido): {nombres}.")
    sin_z = [r for r in Sc["recs"] if r["a"] is None and r["d"] is not None]
    if sin_z:
        add(f"{len(sin_z)} liga(s) con dato pero sin forma de interpretarlo (quedan fuera, no suman 0): "
            + ", ".join(f"{r['L']['variable_id']} ({r['motivo_ausencia']})" for r in sin_z[:4]) + (" …" if len(sin_z) > 4 else "") + ".")
    sd = [r for r in Sc["recs"] if r["d"] is None and r["ausencia"] in ("F1", "F2", "F7")]
    if sd:
        add(f"Sin dato vigente (fuera de T, no suman 0, bajan la cobertura): {len(sd)} liga(s), p. ej. "
            + ", ".join(f"{r['L']['variable_id']} [{r['ausencia']}]" for r in sd[:6]) + (" …" if len(sd) > 6 else "") + ".")
    est = [r for r in Sc["recs"] if r["d"] is None and r["ausencia"] in ("F3", "F4", "F5")]
    if est:
        add(f"{len(est)} liga(s) estructuralmente ausentes en esta fase (solo pre/post, solo análogo o no medido): no entran al denominador.")
    add(f"Canal de pesos: T = suma por grupo del mayor (peso × activación) = {Sc['T']:.2f}; DE(T) = {Sc['T_de']:.2f}; "
        f"T_inf = máx(0, T − {p['factor_intervalo']:g}·DE) = {Sc['T_inf']:.2f} (factor del intervalo provisional).")
    if Sc["dL"] is not None:
        bl = [r for r in Sc["recs"] if r["bayes"] and r["bayes"]["kappa"] == 1]
        det = "; ".join(f"{r['L']['variable_id']}: ln LR = {r['bayes']['ln_lr']:+.2f} ({r['bayes']['fuente']})" for r in bl)
        add(f"Canal bayesiano (aparte, NO se suma a T): ΔL = {Sc['dL']:+.2f}, DE = {Sc['dL_de']:.2f}, límite inferior = {Sc['dL_inf']:+.2f}. {det}.")
    nb = [r for r in Sc["recs"] if r["bayes"] and r["bayes"]["kappa"] == 0]
    if nb:
        add("Liga(s) con LR publicado que no lo usan (κ = 0): " + "; ".join(f"{r['L']['variable_id']} ({r['bayes']['motivo']})" for r in nb) + ".")
    if Sc["prior"] is None and Sc["dL"] is not None:
        add("Prior no disponible: se informa solo ΔL (no se inventa un prior).")
    cob = "sin ligas medibles" if Sc["cobertura"] is None else f"{Sc['cobertura']:.2f}"
    add(f"Cobertura = {cob} (mínimo {p['cobertura_min']:g}, provisional); núcleo (peso 3) con dato N1-N3: "
        f"{'sí' if Sc['nucleo_con_dato'] else 'no'}; T máxima si todo lo no medido estuviera activado = {Sc['T_max']:.2f}.")
    for c in capas:
        add(f"Capa fija {c['nombre']} {c['ambito']}: {c['estado']}" + (f" ({c['detalle']})" if c["detalle"] else "") + ".")
    for t in dec["textos"]:
        add(t + ".")
    add(f"Color: {dec['color']}" + (f" (condición del día: {dec['crudo']})" if dec["crudo"] != dec["color"] else "") +
        (f"; {dec['nota_histeresis']}" if dec["nota_histeresis"] else "") + ". " + P.AVISO)
    return pasos


def _resumen_sin_variable(g: pd.DataFrame) -> list[dict]:
    h = g[g["variable_id"].isna()]
    if h.empty:
        return []
    out = []
    for (metric, clase), x in h.groupby(["metric", "clase_dispositivo"], sort=True):
        u = x.sort_values("timestamp").iloc[-1]
        out.append({"metric": metric, "clase_dispositivo": clase, "n": int(len(x)), "ultimo_valor": _num(u["valor"]),
                    "unidad": u["unidad"], "fecha": u["timestamp"], "nivel": u["nivel"], "etiquetas": u["etiquetas"]})
    return out


def evaluar(obs, *, tablas=None, params=None, mision=None, perfiles=None, canal="real", ruta_estado=None, guardar=True,
            ruta_overrides=None, rechazadas=None) -> dict:
    """Evalua las observaciones (salida de la puerta de calidad) por persona y por dia. PROVISIONAL; no es un diagnostico.

    `canal="real"` ignora toda fila `simulated=True`; `canal="simulado"` usa solo las simuladas (resultado rotulado SIMULADO).
    Las bases congeladas del archivo de estado se respetan; el estado se guarda con `Calibracion.guardar` si `guardar`."""
    t0 = time.perf_counter()
    if canal not in ("real", "simulado"):
        raise ValueError("canal debe ser 'real' o 'simulado'")
    tb = tablas if tablas is not None else T.cargar(ruta_overrides=ruta_overrides)
    p = {**P.params_planos(ruta_overrides), **(dict(params) if params else {})}
    um = P.umbrales(ruta_overrides)
    for k, v in um.items():
        if k in p and p[k] != v["valor"]:
            v["valor"], v["modificado_por_usuario"] = p[k], True
    ruta = Path(ruta_estado) if ruta_estado is not None else CAL.ruta_estado_defecto(canal)
    cal = CAL.Calibracion.cargar(ruta, canal=canal, params=p)
    registro: list = []
    sim = canal == "simulado"

    df_all = N.preparar_obs(obs)
    ajenas = df_all[df_all["simulated"] != sim]
    df = df_all[(df_all["simulated"] == sim) & (df_all["nivel"] != "N0")].copy()
    if len(ajenas):
        registro.append({"tipo": "filas_de_otro_canal_ignoradas", "n": int(len(ajenas)), "provisional": True,
                         "detalle": (f"{len(ajenas)} fila(s) con simulated={'false' if sim else 'true'} ignoradas por el canal "
                                     f"{canal} (G1: los canales nunca se mezclan)")})
    ev = _Evaluador(df, tb, p, mision, perfiles, canal, cal)

    # ---- agregacion diaria (D1) y puntos prevuelo admitidos para las bases (D4)
    entradas = N.agregacion_diaria(df, ev.presencia_vars)
    ev.pre_pts = {}
    por_persona: dict[str, list] = {}
    for e in entradas:
        por_persona.setdefault(e["subject_id"], []).append(e)
        if e["sin_dato"] is None and e["variable_id"] in ev.por_vid and N.punto_base_admitido(e["variable_id"], e):
            if ev.fase(e["subject_id"], e["fecha"])["fase"] == "PRE":
                ev.pre_pts.setdefault((e["subject_id"], e["variable_id"], e["clase"]), []).append(
                    (e["fecha"], N.transformar(e["variable_id"], e["valor"]), e))

    personas_res: dict = {}
    pers = {}
    for sid, g in df.groupby("subject_id", sort=True):
        sid = str(sid)
        pers[sid] = ev.evaluar_persona(sid, g, por_persona.get(sid, []), rechazadas)
        pers[sid]["g"] = g

    # ---- c.4 tripulacion: solo contexto y etiquetas (nunca cambia una base ni apaga una alerta)
    crew_info = _tripulacion(ev, pers, p)

    # ---- salida
    for sid, r in pers.items():
        personas_res[sid] = _salida_persona(ev, sid, r, crew_info.get(sid, {}), rechazadas, tb, p, canal)
    registro_cal = list(cal.registro)
    estado_guardado = None
    if guardar:
        estado_guardado = str(cal.guardar(ruta).name)
    res = {
        "canal": canal, "simulated": sim, "etiqueta": "SIMULADO" if sim else None, "provisional": True, "aviso": P.AVISO,
        "umbrales": um, "personas": personas_res, "registro": registro + registro_cal,
        "advertencias_tablas": list(tb.advertencias),
        "estado": {"archivo": estado_guardado, "guardado": bool(guardar), "bases_congeladas": len(cal.bases),
                   "rechazos": len(cal.rechazos)},
        "tiempo_s": round(time.perf_counter() - t0, 3),
    }
    return _seguro(res)


def _tripulacion(ev, pers, p) -> dict:
    """c.4 / D18 en el ultimo dia de cada persona: delta frente a la tripulacion y etiquetas de contexto."""
    out: dict = {}
    sids = list(pers)
    for sid, r in pers.items():
        D = r["fechas"][-1]
        fase = r["fi"]["fase"]
        mine = ev.dia_x.get((sid, D), {})
        info = {}
        for v, (x, clase, ph, z) in mine.items():
            vals = {sid: x}
            zs = {sid: z}
            for s2 in sids:
                if s2 == sid:
                    continue
                o = ev.dia_x.get((s2, D), {}).get(v)
                if o and o[1] == clase and o[2] == fase and o[0] == o[0]:
                    vals[s2] = o[0]
                    zs[s2] = o[3]
            n = len(vals)
            if n < int(p["tripulacion_n_descriptivo"]):
                info[v] = {"n": n, "modo": "inactiva", "delta": None, "z_equivalente": None, "etiqueta": None, "provisional": True,
                           "nota": f"n = {n} <= 3: capa 3 inactiva [P·S6]"}
                continue
            dt = N.delta_tripulacion(vals, sid, p)
            etiqueta = None
            # desviacion compartida: al menos la mitad de la tripulacion con u >= rampa en alguna direccion de la variable
            des = 0
            for s2, z2 in zs.items():
                if z2 is not None and abs(z2) >= p["rampa_inicio"]:
                    des += 1
            yo_desv = zs[sid] is not None and abs(zs[sid]) >= p["rampa_inicio"]
            if yo_desv and des / n >= p["fraccion_compartida"]:
                etiqueta = "desviación compartida"
            elif dt["modo"] == "etiquetas" and dt["z_equivalente"] is not None and abs(dt["z_equivalente"]) > p["rampa_inicio"]:
                etiqueta = "desviación aislada"
            dt = dict(dt, etiqueta=etiqueta, n_desviados=des)
            info[v] = dt
        out[sid] = info
    return out


def _salida_persona(ev, sid, r, crew, rechazadas, tb, p, canal) -> dict:
    cal = ev.cal
    fechas = r["fechas"]
    D = fechas[-1]
    fase = r["fi"]["fase"]
    ctx = r["ctx"]
    sim = canal == "simulado"
    items = []
    for pid in ev.pids:
        Sc, dec, capas = r["final"][pid]
        ligas = []
        for rec in Sc["recs"]:
            L = rec["L"]
            v = L["variable_id"]
            if rec["d"] is None:
                info = r["info"].get(v) or {}
                rec["vencido"] = info.get("vencido")
            vs = r["estados"].get(v)
            lj = _liga_json(rec, vs, tb, canal)
            ci = crew.get(v)
            if ci is not None and rec["d"] is not None:
                lj["delta_tripulacion"] = ci
                if ci.get("etiqueta"):
                    lj["etiquetas"].append(ci["etiqueta"])
            ligas.append(lj)
        etq = ["SIMULADO"] if sim else []
        amb = sorted({lj["criterio"]["ambito"] for lj in ligas if lj["criterio"] and lj["activacion"]} |
                     {rec["bayes"]["ambito"] for rec in Sc["recs"] if rec["bayes"] and rec["bayes"]["kappa"] == 1})
        etq += amb
        if any(rec["d"]["nivel"] == "N4" for rec in Sc["activas"]):
            etq.append("[experimental]")
        etq += dec["etiquetas"]
        if any(lj["deriva"] for lj in ligas):
            etq.append("por deriva")
        if any(c.get("supera_criterio") for c in capas):
            etq.append("por capa fija [terrestre]")
        if Sc["prior"] is None and Sc["dL"] is not None:
            etq.append("prior no disponible")
        if any(lj["etiquetas"] and "desviación compartida" in lj["etiquetas"] for lj in ligas):
            etq.append("desviación compartida")
        if any(lj["etiquetas"] and "desviación aislada" in lj["etiquetas"] for lj in ligas):
            etq.append("desviación aislada")
        if dec["color"] in ("AMARILLO", "ROJO") and dec["confirmar"]:
            etq.append("confirmar")
        nombre = ev.pad_nombre.get(pid, pid)
        item = {
            "padecimiento_id": pid, "padecimiento": nombre, "color": dec["color"], "motivo": SEM.motivo(Sc, dec, p),
            "condiciones": dec["condiciones"], "estructural": Sc["estructural"], "todo_n4": Sc["todo_n4"],
            "T": Sc["T"], "T_de": Sc["T_de"], "T_inf": Sc["T_inf"], "T_max": Sc["T_max"], "dL": Sc["dL"], "dL_de": Sc["dL_de"],
            "dL_inf": Sc["dL_inf"], "prior": Sc["prior"], "cobertura": Sc["cobertura"], "cobertura_ok": Sc["cobertura_ok"],
            "nucleo_con_dato": Sc["nucleo_con_dato"], "ligas": ligas, "capas_fijas": capas,
            "etiquetas": list(dict.fromkeys(etq)), "aviso": P.AVISO,
            "historial": [{"fecha": h["fecha"], "color": h["color"], "T": h["T"], "T_inf": h["T_inf"], "condiciones": h["condiciones"]}
                          for h in r["hist"][pid]],
            "provisional": True,
        }
        item["pasos"] = _pasos(pid, nombre, Sc, dec, capas, D, fase, canal, p, ligas)
        items.append(item)
    items = SEM.ordenar(items)

    variables = {}
    for v, lst in r["por_vid"].items():
        if v not in ev.por_vid:
            continue
        vs = r["last_vs"].get(v)
        clases = sorted({e["clase"] for e in lst if e["clase"]})
        if vs is None:
            variables[v] = {"clase": clases[-1] if clases else None, "clases": clases, "base": None, "media_adaptativa": None,
                            "cusum": None, "aprendidos": 0, "excluidos": {}, "estado": "sin_dato_vigente"}
            continue
        clv = vs["clv"]
        e = cal.ewma.get(clv)
        base = vs["base"]
        if base is not None:
            base = {k: base.get(k) for k in ("mu", "s", "n0", "B", "s_w", "s_w_fuente", "s_b", "m_ref", "ref_fuente", "transformacion",
                                              "etiquetas", "clase", "version", "congelada", "provisional")}
            base["congelada"] = bool(vs["congelada"])
        variables[v] = {
            "clase": vs["clase"], "clases": clases, "base": base, "media_adaptativa": e["m"] if e else None,
            "cusum": ({k: cal.cusum[clv][k] for k in ("pos", "neg", "senal_pos", "senal_neg", "fecha_senal_pos", "fecha_senal_neg", "n")}
                      if clv in cal.cusum else None),
            "aprendidos": e["aprendidos"] if e else 0, "excluidos": dict(e["excluidos"]) if e else {},
            "excluidos_hacia_atras": list(e["excluidos_hacia_atras"]) if e else [],
            "tope_ewma": bool(e and e["congelada_tope"]), "estado": vs["estado"], "z": vs["z"],
            "delta_tripulacion": crew.get(v),
        }
    rech = []
    if rechazadas is not None and len(rechazadas):
        rr = rechazadas[rechazadas["subject_id"] == sid]
        rech = rr.head(50).to_dict("records")
    return {
        "simulated": sim, "etiqueta": "SIMULADO" if sim else None, "fase": fase, "fecha_evaluacion": D,
        "fechas": fechas, "perfil": r["perfil"], "padecimientos": items, "variables": variables,
        "sin_variable": _resumen_sin_variable(r["g"]), "rechazadas": rech,
        "tripulacion": {"n_personas_canal": len({k[0] for k in ev.dia_x}), "provisional": True,
                        "nota": "capa 3: solo contexto y etiquetas; nunca cambia una base ni apaga una alerta"},
    }


# ---------------------------------------------------------------------------------------------------
# Conveniencia
# ---------------------------------------------------------------------------------------------------
def evaluar_todo(sens_df=None, raw_dir=None, ecg_en_reposo=False, mision_real=None, perfiles_real=None, guardar=True, *,
                 simulado=True, ruta_estado_real=None, ruta_estado_simulado=None, ruta_overrides=None) -> dict:
    """Reune las entradas (`entradas.reunir`) y evalua cada canal por separado. PROVISIONAL; no es un diagnostico.
    Devuelve {"real": resultado|None, "simulado": resultado|None, "avisos": [...], "personas": {...}}."""
    from . import entradas
    r = entradas.reunir(raw_dir=raw_dir, sens_df=sens_df, simulado=simulado, ecg_en_reposo=ecg_en_reposo)
    obs, rech, meta = r["obs"], r["rechazadas"], r["meta_simulado"]
    res_real = res_sim = None
    if len(obs) and (~obs["simulated"]).any():
        res_real = evaluar(obs, mision=mision_real, perfiles=perfiles_real, canal="real", ruta_estado=ruta_estado_real,
                           guardar=guardar, ruta_overrides=ruta_overrides, rechazadas=rech)
    if len(obs) and obs["simulated"].any():
        res_sim = evaluar(obs, mision=meta.get("mision"), perfiles=meta.get("perfiles"), canal="simulado",
                          ruta_estado=ruta_estado_simulado, guardar=guardar, ruta_overrides=ruta_overrides, rechazadas=rech)
    return _seguro({"real": res_real, "simulado": res_sim, "avisos": list(r["avisos"]), "personas": r["personas"],
                    "aviso": P.AVISO, "provisional": True})
