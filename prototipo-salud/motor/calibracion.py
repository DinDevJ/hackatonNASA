"""Autocalibracion e.1-e.7: base prevuelo inmutable, EWMA protegido, CUSUM anclado, cuarentena, persistencia.

PROVISIONAL: α, tope, k, h, cuarentena y periodos sin aprendizaje son supuestos S3/S4 (ver parametros.py).
Nada es un diagnostico. Invariantes normativos (e.1):
  1. La base prevuelo se congela y NINGUN proceso la reescribe; una correccion humana es una VERSION NUEVA
     que conserva la anterior. Un intento de reescritura se rechaza y queda en el registro.
  2. Detectar no es aprender: el CUSUM usa todos los puntos admitidos; el EWMA solo los que pasan e.2.
  3. Solo una persona acepta una «nueva normalidad» (cierre de revision, acuse).
  4. Nada SIMULADO, N4 o N0 entra al aprendizaje (el almacen real rechaza y registra los simulados).
  5. La tripulacion no redefine la normalidad de nadie (este modulo no recibe datos de la tripulacion).
  6. Las bases no se mezclan entre clases de dispositivo: la clave del almacen incluye la clase.
Los almacenes REAL y SIMULADO son archivos distintos (cajon de arena rotulado SIMULADO).
"""
from __future__ import annotations

import copy
import json
import math
from datetime import date, datetime, timedelta
from pathlib import Path

from . import parametros as P

RUTA_ESTADO_REAL = P.RAIZ / "datos" / "estado" / "calibracion_real.json"
RUTA_ESTADO_SIMULADO = P.RAIZ / "datos" / "simulado" / "calibracion_SIMULADO.json"
NOTA_ESTADO = ("PROVISIONAL. Almacén de calibración personal del motor de padecimientos. " + P.AVISO)
CAMPOS_COMPARAR_BASE = ("mu", "s", "n0", "B", "s_w", "s_b", "m_ref")


def ruta_estado_defecto(canal: str) -> Path:
    return RUTA_ESTADO_SIMULADO if canal == "simulado" else RUTA_ESTADO_REAL


def clave(sid: str, vid: str, clase: str) -> str:
    """Clave del almacen: (persona, variable, clase de dispositivo). Nunca se mezclan clases (e.1.6)."""
    return f"{sid}|{vid}|{clase}"


def clave_var(clave_completa: str) -> str:
    return clave_completa.rsplit("|", 1)[0]


def _f(d) -> str:
    return d.isoformat() if hasattr(d, "isoformat") else str(d)


def _d(s) -> date:
    return s if isinstance(s, date) and not isinstance(s, datetime) else (s.date() if isinstance(s, datetime) else date.fromisoformat(str(s)[:10]))


def admite_calibracion(nivel: str, calidad_buena: bool, simulated: bool = False) -> tuple[bool, str | None]:
    """Condicion de calidad de e.2 (y e.1.4): N1; N2 (solo para la base de su propia clase); N3 con calidad buena."""
    if simulated:
        return False, "dato SIMULADO: nunca entra al aprendizaje real (e.1.4)"
    if nivel in ("N0", "N4"):
        return False, f"nivel {nivel}: nunca entra al aprendizaje (e.1.4, e.7)"
    if nivel in ("N3a", "N3b", "N3") and not calidad_buena:
        return False, "N3 sin calidad declarada buena"
    if nivel not in ("N1", "N2", "N3a", "N3b", "N3"):
        return False, f"nivel desconocido {nivel}"
    return True, None


class Calibracion:
    """Estado de calibracion de UN canal. No mezcla canales ni personas (la clave lleva la persona)."""

    def __init__(self, canal: str = "real", params: dict | None = None):
        self.canal = canal
        self.p = params if params is not None else P.params_planos()
        self.bases: dict = {}          # PERSISTENTE (inmutable salvo version nueva humana)
        self.acuses: list = []         # PERSISTENTE (acto humano con fecha y autor)
        self.revisiones: list = []     # PERSISTENTE (cierre de revision de deriva, acto humano)
        self.rechazos: list = []       # PERSISTENTE (intentos rechazados)
        self.ewma: dict = {}           # se recalcula
        self.cusum: dict = {}          # se recalcula
        self.alertas: dict = {}        # clave_var -> set de fechas ISO con alerta
        self.registro: list = []       # eventos de esta corrida
        self._revisiones_aplicadas: set = set()

    # ------------------------------------------------------------------ registro
    def _reg(self, tipo: str, detalle: str, **kw):
        e = {"tipo": tipo, "detalle": detalle, "provisional": True}
        e.update(kw)
        self.registro.append(e)
        return e

    # ------------------------------------------------------------------ bases (e.1.1)
    def base_vigente(self, clv: str, fecha=None):
        rec = self.bases.get(clv)
        if not rec:
            return None
        fecha = _f(fecha) if fecha is not None else "9999-12-31"
        vig = None
        for v in rec["versiones"]:
            if v["desde"] <= fecha:
                vig = v
        if vig is None:
            vig = rec["versiones"][0]
        b = copy.deepcopy(vig["base"])
        b["version"] = vig["version"]
        b["congelada"] = True
        return b

    def congelar_base(self, clv: str, base: dict, fecha) -> tuple[bool, str]:
        """Congela la base prevuelo. Si ya existe una congelada y la nueva difiere, la RECHAZA y lo registra."""
        if self.canal == "real" and base.get("simulated"):
            self._reg("punto_simulado_rechazado", "base simulada rechazada por el almacén real (e.1.4)", clave=clv)
            return False, "rechazada: simulada"
        if clv in self.bases:
            actual = self.bases[clv]["versiones"][-1]["base"]
            if all(_casi(actual.get(k), base.get(k)) for k in CAMPOS_COMPARAR_BASE):
                return True, "ya congelada e idéntica"
            e = {"tipo": "reescritura_base_rechazada", "clave": clv, "fecha_intento": _f(fecha),
                 "detalle": "la base prevuelo está congelada (e.1.1): reescritura rechazada; una corrección humana es una versión nueva",
                 "valores_rechazados": {k: base.get(k) for k in CAMPOS_COMPARAR_BASE},
                 "valores_vigentes": {k: actual.get(k) for k in CAMPOS_COMPARAR_BASE}, "provisional": True}
            self.registro.append(e)
            if e not in self.rechazos:
                self.rechazos.append(e)
            return False, "rechazada: base congelada"
        self.bases[clv] = {"congelada": True, "fecha_congelacion": _f(fecha),
                           "versiones": [{"version": 1, "desde": _f(fecha), "autor": "sistema (congelación al lanzamiento)",
                                          "motivo": "congelación", "base": copy.deepcopy(base)}]}
        return True, "congelada"

    def nueva_version(self, clv: str, base: dict, autor: str, fecha, motivo: str) -> int:
        """Correccion humana: version nueva; la anterior se conserva (e.1.1)."""
        if clv not in self.bases:
            raise KeyError("no hay base congelada para esa clave")
        if not autor:
            raise ValueError("una versión nueva necesita autor")
        n = len(self.bases[clv]["versiones"]) + 1
        self.bases[clv]["versiones"].append({"version": n, "desde": _f(fecha), "autor": autor, "motivo": motivo,
                                             "base": copy.deepcopy(base)})
        self._reg("correccion_humana", f"versión {n} de la base (la anterior se conserva)", clave=clv, autor=autor, fecha=_f(fecha))
        return n

    # ------------------------------------------------------------------ EWMA protegido (e.3)
    def iniciar_ewma(self, clv: str, mu: float, s: float, delta: float = 0.0) -> dict:
        e = self.ewma.get(clv)
        if e is None or e["mu"] != mu or e["s"] != s:
            if e is not None:
                self._reg("ewma_reiniciada", "la base de referencia cambió (versión nueva)", clave=clv)
            e = {"m": mu, "mu": mu, "s": s, "delta": delta, "congelada_tope": False, "lado_tope": 0, "aprendidos": 0,
                 "excluidos": {}, "excluidos_hacia_atras": [], "cola": [], "ultimo_aprendizaje": None, "provisional": True}
            self.ewma[clv] = e
        return e

    def media_adaptativa(self, clv: str):
        e = self.ewma.get(clv)
        return None if e is None else e["m"]

    def excluir(self, clv: str, motivo: str):
        e = self.ewma.get(clv)
        if e is not None:
            e["excluidos"][motivo] = e["excluidos"].get(motivo, 0) + 1

    def ofrecer_punto(self, clv: str, fecha, x: float, *, nivel: str, simulated: bool = False, calidad_buena: bool = True,
                      z_act: float | None = None, contexto_estandar: bool = True, variable_alertada: bool = False,
                      padecimiento_alertado: bool = False, episodio: bool = False, en_transicion: bool = False,
                      fase: str = "VT") -> tuple[bool, str | None]:
        """e.2: g(t) = 1 solo si cumple TODO. Si g = 1 el punto entra a la cola de cuarentena; si no, no mueve la media."""
        ok, motivo = admite_calibracion(nivel, calidad_buena, simulated)
        if not ok:
            if simulated and self.canal == "real":
                self._reg("punto_simulado_rechazado", motivo, clave=clv, fecha=_f(fecha))
            self.excluir(clv, motivo)
            return False, motivo
        rampa = self.p["rampa_inicio"]
        e = self.ewma.get(clv)
        pruebas = [
            (fase == "POST", "POST: los datos postvuelo nunca modifican la base ni las estimaciones de vuelo (e.4)"),
            (z_act is None or abs(z_act) >= rampa, f"no estable (|z_act| >= {rampa}) o sin z"),
            (not contexto_estandar, "fuera del contexto estándar de la variable"),
            (variable_alertada, "variable alertada o persistente"),
            (padecimiento_alertado, "padecimiento ligado en AMARILLO o ROJO"),
            (self.cusum_en_senal(clv), "CUSUM en señal (tendencia)"),
            (episodio, "dentro de un episodio (síntoma, bandera de ritmo, fiebre, EVA, ejercicio o fármaco)"),
            (en_transicion, f"periodo sin aprendizaje tras un cambio de fase ({self.p['sin_aprendizaje_h']} h)"),
            (e is None, "sin media adaptativa (no hay base congelada)"),
            (e is not None and e["congelada_tope"], "media congelada por el tope (deriva): decide una persona"),
        ]
        for falla, mot in pruebas:
            if falla:
                self.excluir(clv, mot)
                return False, mot
        e["cola"].append({"fecha": _f(fecha), "x": float(x)})
        return True, None

    def marcar_alerta(self, cvar: str, fecha):
        self.alertas.setdefault(cvar, set()).add(_f(fecha))

    def procesar_cola(self, clv: str, fecha_actual) -> list:
        """Aplica al EWMA los puntos con >= cuarentena sin alerta posterior; descarta (hacia atras) los demas."""
        e = self.ewma.get(clv)
        if e is None or not e["cola"]:
            return []
        dias_q = math.ceil(self.p["cuarentena_h"] / 24)
        hoy = _d(fecha_actual)
        pendientes, hechos = [], []
        for it in sorted(e["cola"], key=lambda i: i["fecha"]):
            d0 = _d(it["fecha"])
            if (hoy - d0).days < dias_q:
                pendientes.append(it)
                continue
            fin = d0 + timedelta(days=dias_q)
            alertas = [a for a in self.alertas.get(clave_var(clv), ()) if d0 < _d(a) <= fin]
            if alertas:
                e["excluidos_hacia_atras"].append(it["fecha"])
                self.excluir(clv, "excluido hacia atrás (cuarentena: alerta posterior)")
                self._reg("excluido_hacia_atras", f"punto del {it['fecha']} excluido: alerta el {min(alertas)} dentro de las "
                          f"{self.p['cuarentena_h']} h siguientes (cuarentena, e.2)", clave=clv, fecha=it["fecha"])
                hechos.append(("excluido", it))
            else:
                self.actualizar_ewma(clv, it["x"], it["fecha"])
                hechos.append(("aprendido", it))
        e["cola"] = pendientes
        return hechos

    def actualizar_ewma(self, clv: str, x: float, fecha=None) -> bool:
        """m(t) = m(t-1) + α g(t) (x - m(t-1)), con tope |m - (μ+δ)| <= 1.5 s (se congela y pasa a «deriva»)."""
        e = self.ewma[clv]
        if e["congelada_tope"]:
            return False
        nuevo = e["m"] + self.p["alpha"] * (x - e["m"])
        centro, tope = e["mu"] + e["delta"], self.p["tope_ewma_de"] * e["s"]
        if abs(nuevo - centro) > tope:
            e["m"] = centro + math.copysign(tope, nuevo - centro)
            e["congelada_tope"] = True
            e["lado_tope"] = 1 if nuevo > centro else -1
            self._reg("ewma_tope", "la media adaptativa tocó el tope de 1.5 DE: se congela y la variable pasa a «deriva»; "
                      "decide una persona", clave=clv, fecha=_f(fecha) if fecha else None)
            return False
        e["m"] = nuevo
        e["aprendidos"] += 1
        e["ultimo_aprendizaje"] = _f(fecha) if fecha else None
        return True

    # ------------------------------------------------------------------ CUSUM anclado (e.5)
    def cusum_estado(self, clv: str) -> dict:
        return self.cusum.setdefault(clv, {"pos": 0.0, "neg": 0.0, "senal_pos": False, "senal_neg": False,
                                           "fecha_senal_pos": None, "fecha_senal_neg": None, "n": 0, "provisional": True})

    def actualizar_cusum(self, clv: str, x: float, mu: float, s: float, fecha=None, delta: float = 0.0) -> dict:
        """C(t) = max(0, C(t-1) + r - k); señal si C >= h. Anclado a la base prevuelo (mu, s). Un CUSUM por sentido.
        La señal queda registrada hasta el cierre de revision humana (e.5, e.6). Sin dato no se llama: C se mantiene."""
        c = self.cusum_estado(clv)
        r = (x - mu - delta) / s
        k, h = self.p["cusum_k"], self.p["cusum_h"]
        c["pos"] = max(0.0, c["pos"] + r - k)
        c["neg"] = max(0.0, c["neg"] - r - k)
        c["n"] += 1
        if c["pos"] >= h and not c["senal_pos"]:
            c["senal_pos"], c["fecha_senal_pos"] = True, _f(fecha) if fecha else None
        if c["neg"] >= h and not c["senal_neg"]:
            c["senal_neg"], c["fecha_senal_neg"] = True, _f(fecha) if fecha else None
        return c

    def cusum_en_senal(self, clv: str, signo: int = 0) -> bool:
        c = self.cusum.get(clv)
        if not c:
            return False
        if signo > 0:
            return c["senal_pos"]
        if signo < 0:
            return c["senal_neg"]
        return c["senal_pos"] or c["senal_neg"]

    def deriva(self, clv: str, signo: int = 0) -> bool:
        """Deriva: CUSUM en señal en el sentido adverso, o tope del EWMA tocado en ese sentido."""
        if self.cusum_en_senal(clv, signo):
            return True
        e = self.ewma.get(clv)
        return bool(e and e["congelada_tope"] and (signo == 0 or e["lado_tope"] == signo))

    # ------------------------------------------------------------------ actos humanos (e.1.3, e.5)
    def cerrar_revision(self, clv: str, fecha, autor: str, nota: str = ""):
        if not autor:
            raise ValueError("el cierre de una revisión necesita autor")
        self.revisiones.append({"clave": clv, "fecha": _f(fecha), "autor": autor, "nota": nota, "provisional": True})

    def aplicar_revisiones(self, fecha):
        """Aplica en su fecha los cierres humanos: reinicia el CUSUM y descongela la media (solo asi se reinicia)."""
        for i, r in enumerate(self.revisiones):
            if i in self._revisiones_aplicadas or r["fecha"] > _f(fecha):
                continue
            self._revisiones_aplicadas.add(i)
            c = self.cusum.get(r["clave"])
            if c:
                c.update({"pos": 0.0, "neg": 0.0, "senal_pos": False, "senal_neg": False})
            e = self.ewma.get(r["clave"])
            if e:
                e["congelada_tope"], e["lado_tope"] = False, 0
            self._reg("revision_cerrada", "cierre humano de la revisión de deriva", clave=r["clave"], autor=r["autor"], fecha=r["fecha"])

    def registrar_acuse(self, sid: str, pid: str, fecha, autor: str, nota: str = ""):
        if not autor:
            raise ValueError("el acuse necesita autor")
        self.acuses.append({"subject_id": sid, "padecimiento_id": pid, "fecha": _f(fecha), "autor": autor, "nota": nota})

    def acuse_entre(self, sid: str, pid: str, desde, hasta) -> bool:
        return any(a["subject_id"] == sid and a["padecimiento_id"] == pid and _f(desde) <= a["fecha"] <= _f(hasta) for a in self.acuses)

    # ------------------------------------------------------------------ persistencia
    def a_dict(self) -> dict:
        sim = self.canal == "simulado"
        d = {"version": 1, "canal": self.canal, "simulated": sim, "etiqueta": "SIMULADO" if sim else None, "provisional": True,
             "nota": NOTA_ESTADO + (" DATOS SIMULADOS: cajón de arena, sin relación fisiológica real." if sim else ""),
             "aviso": P.AVISO, "bases": self.bases, "acuses": self.acuses, "revisiones": self.revisiones,
             "registro_rechazos": self.rechazos,
             "instantanea_no_persistente": {
                 "nota": "EWMA y CUSUM se recalculan de forma determinista sobre todas las observaciones; esto es solo una instantánea",
                 "ewma": self.ewma, "cusum": self.cusum}}
        return d

    def guardar(self, ruta) -> Path:
        r = Path(ruta)
        r.parent.mkdir(parents=True, exist_ok=True)
        with open(r, "w", encoding="utf-8") as f:
            json.dump(self.a_dict(), f, ensure_ascii=False, indent=2, default=_json_default)
            f.write("\n")
        return r

    @classmethod
    def cargar(cls, ruta, canal: str = "real", params: dict | None = None) -> "Calibracion":
        c = cls(canal=canal, params=params)
        r = Path(ruta)
        if not r.exists():
            return c
        with open(r, encoding="utf-8") as f:
            d = json.load(f)
        if bool(d.get("simulated")) != (canal == "simulado"):
            raise ValueError("el almacén de calibración pertenece a otro canal (real/simulado): no se mezclan")
        c.bases = d.get("bases", {})
        c.acuses = d.get("acuses", [])
        c.revisiones = d.get("revisiones", [])
        c.rechazos = d.get("registro_rechazos", [])
        return c


def _casi(a, b) -> bool:
    if a is None or b is None:
        return a is None and b is None
    if isinstance(a, (int, float)) and isinstance(b, (int, float)):
        return math.isclose(a, b, rel_tol=1e-9, abs_tol=1e-9)
    return a == b


def _json_default(o):
    if isinstance(o, set):
        return sorted(o)
    if hasattr(o, "item"):
        return o.item()
    if hasattr(o, "isoformat"):
        return o.isoformat()
    raise TypeError(f"no serializable: {type(o)}")
