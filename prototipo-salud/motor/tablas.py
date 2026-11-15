"""Tablas del motor de padecimientos: carga de las tablas con fuente, overrides y configuracion (d.1-d.6).

PROVISIONAL: la clasificacion de `direccion` (S10), los grupos de correlacion fuera de los dos declarados
(S11) y las prevalencias usadas como log-odds previas (S7) son supuestos. Los CSV de `datos/modelo/` con
fuente (PADECIMIENTOS.csv, PADECIMIENTO-VARIABLE.csv) NUNCA se escriben desde aqui. Nada es diagnostico.
"""
from __future__ import annotations

import math
import re
from dataclasses import dataclass, field
from pathlib import Path

import pandas as pd

from . import parametros as P

DIR_MODELO = P.RAIZ / "datos" / "modelo"
RE_URL = re.compile(r"https?://[^\s|,;)\]]+")
TIPOS = ("una_direccion", "dos_direcciones", "presencia", "criterio", "dependiente_fase", "no_automatica")

# Palabras del nombre de la variable que la marcan como contexto o predisposicion (d.1). [P·S10]
PALABRAS_CONTEXTO = ("antecedente", "anticoncep", "susceptibilidad previa", "terapia hormonal")
# Dependiente de fase implementado (signo por fase). Las demas condiciones de fase no estan implementadas.
DEPENDIENTE_FASE = {"↑ en vuelo / ↓ postvuelo": {"VT": 1, "VTa": 1, "POST": -1}}

# ---------------------------------------------------------------------------------------------------
# d.1 Criterios publicados (los demas no se usan como criterio)
# ---------------------------------------------------------------------------------------------------
CRITERIOS = {
    "01:V34": {"nombre": "QTc >=450 ms (M) / >=460 ms (F), o <=390 ms", "fuente": "Rautaharju 2009", "ambito": "[terrestre]",
               "regla": "qtc", "umbral_m": 450.0, "umbral_f": 460.0, "umbral_corto": 390.0, "unidad": "ms"},
    "01:V47": {"nombre": "caída ortostática >=20/10 mmHg en 3 min (se usa la caída sistólica >=20 mmHg)", "fuente": "Freeman 2011",
               "ambito": "[terrestre]", "regla": "ge", "umbral": 20.0, "unidad": "mmHg"},
    "01:V48": {"nombre": "aumento de FC al ponerse de pie >=30 lpm", "fuente": "McGee 1999; Freeman 2011", "ambito": "[terrestre]",
               "regla": "ge", "umbral": 30.0, "unidad": "lpm"},
    "03:V68": {"nombre": "Cognition <= -1.5 DE respecto del prevuelo", "fuente": "NTRS 20240012108", "ambito": "[espacial]",
               "regla": "z_le", "umbral": -1.5, "unidad": "DE"},
    "03:V1": {"nombre": "PHQ-9 >=10", "fuente": "Kroenke 2001", "ambito": "[terrestre]", "regla": "ge", "umbral": 10.0, "unidad": "puntos"},
    "04:A23": {"nombre": "ppCO2 media de 7 días >=2.5 mmHg", "fuente": "Law 2014", "ambito": "[espacial]",
               "regla": "media7_ge", "umbral": 2.5, "unidad": "mmHg"},
    "04:A3": {"nombre": "SpO2 <=91 % (NEWS2: 3 puntos)", "fuente": "RCP NEWS2", "ambito": "[terrestre]", "regla": "le", "umbral": 91.0, "unidad": "%"},
    "04:A2": {"nombre": "FR fuera de 12-20 rpm (NEWS2)", "fuente": "RCP NEWS2", "ambito": "[terrestre]", "regla": "fuera",
              "umbral_bajo": 12.0, "umbral_alto": 20.0, "unidad": "rpm"},
    "01:V18": {"nombre": "FEVI <52 % (M) / <54 % (F)", "fuente": "Lang 2015 (ASE/EACVI)", "ambito": "[terrestre]",
               "regla": "fevi_baja", "umbral_m": 52.0, "umbral_f": 54.0, "unidad": "%"},
}

# ---------------------------------------------------------------------------------------------------
# d.2 Las 6 ligas con LR/OR publicado. kappa = 1 solo con los metodos indicados (y nunca con nivel N4)
# ---------------------------------------------------------------------------------------------------
def _ln(x):
    return math.log(x)


def _lr_binario(sens, esp):
    return sens / (1 - esp), (1 - sens) / esp


LR_LIGAS = {}
for _pid, _vid, _s, _e, _met, _txt, _fuente in (
    ("P01", "01:V31", 0.92, 0.82, ("lectura_humana",),
     "pulso irregular palpado o registro leído por una persona; NUNCA con la bandera del adaptador ECG", "Taggar 2016"),
    ("P09", "03:V1", 0.88, 0.88, ("cuestionario_completo",),
     "PHQ-9 completo (>=10); se refiere a depresión mayor, aplicarlo a todo P09 es un supuesto [P·S9]", "Kroenke 2001"),
):
    _lp, _ln_ = _lr_binario(_s, _e)
    LR_LIGAS[(_pid, _vid)] = {"padecimiento_id": _pid, "variable_id": _vid, "tipo": "binario", "sens": _s, "esp": _e,
                              "lr_pos": _lp, "lr_neg": _ln_, "ln_lr_pos": _ln(_lp), "ln_lr_neg": _ln(_ln_),
                              "metodos_kappa1": _met, "cuando_kappa1": _txt, "fuente": _fuente, "ambito": "[terrestre]",
                              "corte_positivo": {"03:V1": 10.0}.get(_vid, 0.5)}
for _pid in ("P02", "P13"):
    LR_LIGAS[(_pid, "01:V48")] = {"padecimiento_id": _pid, "variable_id": "01:V48", "tipo": "solo_positivo", "lr_pos": 1.7, "lr_neg": None,
                                  "ln_lr_pos": _ln(1.7), "ln_lr_neg": 0.0, "metodos_kappa1": ("prueba_ortostatica",),
                                  "cuando_kappa1": "prueba de bipedestación con gravedad (solo pre-post); un negativo aporta 0",
                                  "fuente": "McGee 1999", "ambito": "[terrestre]", "corte_positivo": 30.0}
LR_LIGAS[("P04", "04:A1")] = {"padecimiento_id": "P04", "variable_id": "04:A1", "tipo": "solo_positivo", "lr_pos": 1.8, "lr_neg": None,
                              "ln_lr_pos": _ln(1.8), "ln_lr_neg": 0.0, "metodos_kappa1": ("termometro",),
                              "cuando_kappa1": "temperatura corporal N1 o N3 > 37.3 °C (fiebre provisional [P·S9]); un negativo aporta 0",
                              "fuente": "Call 2005", "ambito": "[terrestre]", "corte_positivo": None, "niveles_kappa1": ("N1", "N3a", "N3b")}
LR_LIGAS[("P07", "04:A23")] = {"padecimiento_id": "P07", "variable_id": "04:A23", "tipo": "continuo", "lr_pos": 2.0, "lr_neg": None,
                               "ln_lr_pos": _ln(2.0), "ln_lr_neg": 0.0, "metodos_kappa1": ("sensor_cabina",),
                               "cuando_kappa1": "sensor de cabina; ΔL = ln 2 · (media 7 d de ppCO2 - 2.5 mmHg); ancla y unidad de tiempo "
                                                "son lectura propia del resumen [P·S9]",
                               "fuente": "Law 2014", "ambito": "[espacial]", "corte_positivo": None}

# ---------------------------------------------------------------------------------------------------
# d.3 Grupos de correlacion (dentro de un grupo solo cuenta la mayor aportacion). [P·S11] salvo los de [PAD]
# ---------------------------------------------------------------------------------------------------
GRUPOS = [
    {"id": "cefalea", "miembros": ["03:V82", "03:V83", "04:A6"], "origen": "declarado en PADECIMIENTOS", "provisional": False},
    {"id": "fc", "miembros": ["01:V3", "04:A4"], "origen": "declarado en PADECIMIENTOS", "provisional": False},
    {"id": "ritmo_irregular", "miembros": ["01:V31", "01:V32"],
     "origen": "ALGORITMOS d.3: bandera de 01:V31 y latidos_irregulares (proxy de 01:V32) son la misma evidencia [P·S12]", "provisional": True},
    {"id": "hrv", "miembros": ["03:V17"], "origen": "ALGORITMOS d.3: hrv_rmssd y hrv_sdnn (ambas -> 03:V17) cuentan una sola vez", "provisional": True},
]

# ---------------------------------------------------------------------------------------------------
# d.5 Prevalencia previa (log-odds). Solo donde PADECIMIENTOS da una cifra. [P·S7]
# ---------------------------------------------------------------------------------------------------
def _logit_xn(x, n):
    return math.log((x + 0.5) / (n - x + 0.5)), math.sqrt(1 / (x + 0.5) + 1 / (n - x + 0.5))


def _priors():
    pr = {}
    l11, d11 = _logit_xn(1, 11)
    l16, d16 = _logit_xn(57, 85)
    la, da = _logit_xn(5, 6)
    lb, db = _logit_xn(1, 6)
    lam = 3.40 / 365.25
    pi7 = 1 - math.exp(-lam * 7)
    base = {"provisional": True, "supuesto": "S7"}
    pr["P02"] = dict(base, ell0=None, de=da, fases=["POST"], derivable=True,
                     variantes={"larga_duracion": {"ell0": la, "de": da}, "corta_duracion": {"ell0": lb, "de": db}},
                     fuente="Meck 2001 (presíncope 5/6 tras Mir; 1/6 tras Shuttle)",
                     nota="depende de la duración de la misión (no declarada en el motor): no se elige ninguna variante")
    pr["P04"] = dict(base, ell0=math.log(pi7 / (1 - pi7)), de=None, fases=["VT", "VTa"], derivable=True,
                     fuente="Crucian 2016 (3.40 eventos por año-vuelo)", nota=f"supone tasa constante; π(7 d) = {pi7:.3f}")
    pr["P07"] = dict(base, ell0=math.log(0.01 / 0.99), de=None, fases=["VT", "VTa"], derivable=True,
                     fuente="Law 2014 (riesgo de cefalea <1 % con media de 7 d de CO2 <2.5 mmHg)",
                     nota="ancla propia de d.2 [P·S9]")
    pr["P11"] = dict(base, ell0=l11, de=d11, fases=["VT", "VTa"], derivable=True, fuente="Marshall-Goebel 2019 (1/11 trombo oclusivo)", nota="")
    pr["P12"] = dict(base, ell0=math.log(0.18 / 0.82), de=None, fases=["VT", "VTa"], derivable=True, fuente="MTB-001 (18 % SANS relevante)",
                     nota="DE no derivable (sin n)")
    pr["P16"] = dict(base, ell0=l16, de=d16, fases=["VT"], derivable=True, fuente="Davis 1988 (57/85 en el primer vuelo)", nota="")
    for pid in ("P10", "P13"):
        pr[pid] = dict(base, ell0=None, de=None, fases=[], derivable=False, fuente="conteos sin denominador", nota="prior no derivable")
    pr["P05"] = dict(base, ell0=None, de=None, fases=[], derivable=False, fuente="sueño medio/hipnóticos", nota="solo contexto, no es prevalencia")
    return pr


PRIORS = _priors()

# ---------------------------------------------------------------------------------------------------
# d.6 Capas fijas (puntajes publicados): no cambian T ni ΔL. estado base con la lista actual de variables.
# ---------------------------------------------------------------------------------------------------
CAPAS_FIJAS = [
    {"nombre": "NEWS2", "ambito": "[terrestre]", "padecimientos": ["P03", "P04"],
     "entradas": ["04:A2", "04:A3", "01:V1", "01:V3", "04:A1"], "faltan": ["O2 suplementario", "nivel de conciencia"],
     "estado": "incompleto: faltan O2 suplementario, nivel de conciencia (salvo captura manual)"},
    {"nombre": "qSOFA", "ambito": "[terrestre]", "padecimientos": ["P04"], "entradas": ["01:V1", "04:A2"], "faltan": ["mentación alterada"],
     "estado": "incompleto: falta mentación alterada (sustituirla por PVT daría un puntaje derivado que NO es qSOFA)"},
    {"nombre": "Lake Louise 2018", "ambito": "[terrestre]", "padecimientos": ["P03"], "entradas": [],
     "faltan": ["4 ítems 0-3 con su propia redacción"], "estado": "incompleto: faltan los 4 ítems 0-3 (no se derivan de la escala 0-10 de cefalea)"},
    {"nombre": "Conkin (DCS)", "ambito": "[espacial: cámara]", "padecimientos": ["P10"], "entradas": [],
     "faltan": ["TR", "prerrespiración", "presión del traje", "deambulación", "tiempo de EVA"],
     "estado": "inactivo: faltan TR, prerrespiración, presión del traje, deambulación y tiempo de EVA; no se reconstruye la fórmula"},
    {"nombre": "PHQ-9", "ambito": "[terrestre]", "padecimientos": ["P09"], "entradas": ["03:V1"], "faltan": ["9 ítems"],
     "estado": "calculable con 03:V1 (metodo=cuestionario_completo); sin uso documentado en astronautas"},
    {"nombre": "Centor", "ambito": "[terrestre]", "padecimientos": ["P04"], "entradas": ["04:A1", "04:A19"],
     "faltan": ["ganglios", "tos"], "estado": "incompleto: faltan ganglios y tos"},
    {"nombre": "STONE", "ambito": "[terrestre]", "padecimientos": ["P13"], "entradas": ["04:A22c", "02:V37"], "faltan": ["raza (no aplica)"],
     "estado": "sin total: se muestran los ítems; el ítem de raza no aplica"},
    {"nombre": "Constans", "ambito": "[terrestre; miembro superior]", "padecimientos": ["P11"], "entradas": [],
     "faltan": [], "estado": "solo analogía: no validado en cuello ni en vuelo"},
]


@dataclass
class Tablas:
    padecimientos: pd.DataFrame
    ligas: pd.DataFrame
    clasificacion: pd.DataFrame
    criterios: dict = field(default_factory=lambda: CRITERIOS)
    lr_ligas: dict = field(default_factory=lambda: LR_LIGAS)
    priors: dict = field(default_factory=lambda: PRIORS)
    grupos: list = field(default_factory=lambda: GRUPOS)
    capas_fijas: list = field(default_factory=lambda: CAPAS_FIJAS)
    overrides: dict = field(default_factory=dict)
    advertencias: list = field(default_factory=list)
    dir_modelo: str = "datos/modelo"

    def ligas_de(self, pid: str) -> pd.DataFrame:
        return self.ligas[self.ligas["padecimiento_id"] == pid]

    def liga(self, pid: str, vid: str):
        f = self.ligas[(self.ligas["padecimiento_id"] == pid) & (self.ligas["variable_id"] == vid)]
        return None if f.empty else f.iloc[0]

    def lr(self, pid: str, vid: str):
        return self.lr_ligas.get((pid, vid))

    def criterio(self, vid: str):
        return self.criterios.get(vid)

    def capas_de(self, pid: str) -> list:
        return [c for c in self.capas_fijas if pid in c["padecimientos"]]


def _urls(texto) -> list:
    if not isinstance(texto, str):
        return []
    return [u.rstrip(".") for u in RE_URL.findall(texto)]


def _es_contexto(nombre: str) -> bool:
    n = str(nombre).lower()
    if any(p in n for p in PALABRAS_CONTEXTO):
        return True
    return "fármacos" in n and "qt" in n


def _grupo_de(vid: str):
    for g in GRUPOS:
        if vid in g["miembros"]:
            return g["id"]
    return None


def cargar(dir_modelo=None, ruta_overrides=None, aplicar_overrides=True) -> Tablas:
    """Carga las tablas con fuente (solo lectura), aplica overrides y la clasificacion de `direccion`."""
    dm = Path(dir_modelo) if dir_modelo is not None else DIR_MODELO
    pads = pd.read_csv(dm / "PADECIMIENTOS.csv", dtype=str, keep_default_na=False)
    lig = pd.read_csv(dm / "PADECIMIENTO-VARIABLE.csv", keep_default_na=True)
    adv = []
    ruta_clas = dm / "clasificacion_direccion.csv"
    if ruta_clas.exists():
        clas = pd.read_csv(ruta_clas, keep_default_na=False)
    else:
        clas = pd.DataFrame(columns=["direccion", "tipo_direccion", "signo", "provisional", "nota"])
        adv.append("falta clasificacion_direccion.csv: todas las direcciones caen en no_automatica [P·S10]")
    mapa = {r.direccion: (r.tipo_direccion, int(r.signo)) for r in clas.itertuples()}
    tipos, signos, nuevas = [], [], []
    for d in lig["direccion"]:
        t, s = mapa.get(d, ("no_automatica", 0))
        if d not in mapa:
            nuevas.append(d)
        if t not in TIPOS:
            t, s = "no_automatica", 0
        tipos.append(t)
        signos.append(s)
    if nuevas:
        adv.append(f"{len(set(nuevas))} textos de direccion sin clasificar -> no_automatica: {sorted(set(nuevas))[:5]}")
    lig["tipo_direccion"] = tipos
    lig["signo"] = signos
    lig["es_contexto"] = [_es_contexto(v) for v in lig["variable"]]
    lig["grupo"] = [_grupo_de(v) for v in lig["variable_id"]]
    lig["fuente_urls"] = [_urls(f) for f in lig["fuente"]]

    ov = {"ligas": {}, "umbrales": {}}
    if aplicar_overrides:
        r = ruta_overrides if ruta_overrides is not None else (dm / "overrides.json" if dir_modelo is not None else None)
        ov = P.leer_overrides(r)
    mu, sg, mf, sf, mod = [], [], [], [], []
    claves = set()
    for row in lig.itertuples():
        k = f"{row.padecimiento_id}|{row.variable_id}"
        o = ov["ligas"].get(k)
        m, s = float(row.prior_media), float(row.prior_de)
        mfuente = sfuente = "tabla con fuente (PADECIMIENTO-VARIABLE.csv)"
        cambio = False
        if o:
            claves.add(k)
            if "peso" in o:
                m, mfuente, cambio = float(o["peso"]), "override del usuario (sin fuente) [provisional]", True
            if "prior_de" in o:
                s, sfuente, cambio = float(o["prior_de"]), "override del usuario (sin fuente) [provisional]", True
        mu.append(m); sg.append(s); mf.append(mfuente); sf.append(sfuente); mod.append(cambio)
    lig["mu"], lig["sigma"], lig["mu_fuente"], lig["sigma_fuente"], lig["modificado_por_usuario"] = mu, sg, mf, sf, mod
    lig["nucleo"] = lig["mu"] >= 3.0 - 1e-9
    huerfanos = sorted(set(ov["ligas"]) - claves)
    if huerfanos:
        adv.append(f"overrides de ligas inexistentes ignorados: {huerfanos}")
    return Tablas(padecimientos=pads, ligas=lig, clasificacion=clas, overrides=ov, advertencias=adv,
                  dir_modelo="datos/modelo" if dir_modelo is None else dm.name)
