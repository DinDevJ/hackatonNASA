"""Puerta de calidad del motor de padecimientos (ALGORITMOS.md, secciones (a) y (b); DISENO.md §2-§3).

Pasos G0-G6 de b.1 (G7, los duplicados, los resuelve el nucleo en la agregacion diaria: aqui NO se agrega).
Solo numpy, pandas y biblioteca estandar. **Nada es un diagnostico**; los numeros marcados `provisional`
no tienen fuente en las tablas del equipo (supuestos S12, S13, S18, S20 de ALGORITMOS.md (i)).

Salida: DataFrame de observaciones con exactamente `OBS_COLUMNAS` (DISENO.md §3). Las filas N0 se devuelven aparte
(`rechazadas`, con paso y motivo) y no entran a `obs`. Un faltante (`sin_dato`) tiene valor NaN: nunca es 0.
"""
from __future__ import annotations

import math
import re
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

RAIZ = Path(__file__).resolve().parents[1]

# --------------------------------------------------------------------------------------------- vocabulario
OBS_COLUMNAS = [
    "subject_id", "timestamp", "variable_id", "valor", "unidad", "clase_dispositivo", "nivel", "nivel_motivo",
    "simulated", "contexto", "metodo", "decide", "calidad_buena", "vigencia_h", "z_pob_permitido", "sin_dato",
    "origen", "metric", "quality", "run_id", "etiquetas", "notas",
]
CONTRATO_COLUMNAS = [
    "subject_id", "study_id", "timestamp", "source", "model", "metric", "value", "unit", "quality",
    "simulated", "tipo", "run_id", "input_file", "notes",
]
NATIVO_COLUMNAS = [
    "subject_id", "timestamp", "variable_id", "value", "unit", "device_class", "quality", "context", "method",
    "simulated", "notes",
]
RECHAZADAS_COLUMNAS = ["subject_id", "timestamp", "metric", "valor", "quality", "simulated", "run_id", "origen",
                       "paso", "motivo"]

CLASES_DISPOSITIVO = (
    "ecg_adaptador", "ecg_prenda_holter", "lectura_humana_ecg", "palpacion_pulso", "reloj_ppg", "oximetro_dedo",
    "spo2_muneca", "bandas_toracicas", "conteo_manual", "termometro_oral", "temp_piel", "temp_central_estimada",
    "manguito_validado", "manguito_sin_validar", "cuffless", "actigrafia", "sueno_etapas_consumo", "pvt_laptop",
    "pvt_reloj", "prueba_cognitiva", "analizador_cabina", "cuestionario_phq9", "autorreporte", "diario",
    "prueba_ortostatica", "laboratorio", "modelo_eco", "captura_manual", "desconocido",
)
NIVELES = ("N0", "N1", "N2", "N3a", "N3b", "N4")
CONTEXTOS = ("reposo", "sueno", "actividad", "ejercicio", "eva")
METODOS = ("lectura_humana", "cuestionario_completo", "prueba_ortostatica", "termometro", "sensor_cabina")
TIPOS_CONTRATO = ("medicion", "probabilidad_clase", "similitud", "hallazgo", "regla_alerta", "comparacion")
CALIDAD_BUENA = frozenset({"buena", "good", "ok", "alta"})      # a.4 / b.2: calidad declarada buena
PUNTEROS_FUSIONADOS = frozenset({"01:V27", "02:V75", "04:A5"})   # G2: nunca se mapea a un puntero fusionado
MODELOS_ECO = ("panecho", "echonet_dynamic", "echoclip", "echoprime", "medsam2")

AVISOS_SIEMPRE = [
    "Ningun wearable esta validado en microgravedad [PREC]: toda cifra de reloj, anillo o prenda es de referencia terrestre.",
    "La SpO2 de muneca o prenda tiende a sobreestimar en hipoxia: un valor normal N2 NO descarta P03 (hipoxia/hipoxemia).",
]


def _p(valor: Any, *, provisional: bool, supuesto: str | None = None, fuente: str = "", nota: str = "") -> dict:
    """Entrada de configuracion: todo numero lleva `provisional` y, si procede, el supuesto S# de (i)."""
    return {"valor": valor, "provisional": provisional, "supuesto": supuesto, "fuente": fuente, "nota": nota}


# --------------------------------------------------------------------------------------------- parametros
PARAMETROS_CALIDAD: dict[str, dict] = {
    "fc_min_lpm": _p(20.0, provisional=False, fuente="b.1 G5: RR maximo 3.0 s del contrato = 20 lpm"),
    "fc_max_lpm": _p(240.0, provisional=False, fuente="b.1 G5: RR minimo 0.25 s del contrato = 240 lpm"),
    "ventana_hrv_s": _p(300.0, provisional=False, fuente="c.1: ventanas de 5 min en reposo (Nunan 2010)"),
    "ventana_hrv_tolerancia": _p(0.10, provisional=True, supuesto=None, fuente="decision de implementacion",
                                 nota="'~300 s' se interpreta como 300 s +/- 10 %; no esta en las tablas"),
    "temp_c_min": _p(25.0, provisional=True, fuente="decision de implementacion (G5: valor imposible)",
                     nota="limite de plausibilidad fisica, no un criterio clinico"),
    "temp_c_max": _p(45.0, provisional=True, fuente="decision de implementacion (G5: valor imposible)",
                     nota="limite de plausibilidad fisica, no un criterio clinico"),
    "horas_dia": _p(24.0, provisional=False, fuente="c.1: tasa = n x 24 h / duracion analizada"),
}


def parametro(nombre: str) -> float:
    return float(PARAMETROS_CALIDAD[nombre]["valor"])


# Vigencia por clase [P S18] (g.2). Lo que g.2 fija: signos continuos 24 h; diarios y sintomas 48 h; pruebas cognitivas
# hasta la siguiente aplicacion programada (RST cada 4 dias = 96 h [PREC]); eco 72 h; laboratorio hasta la siguiente
# muestra (sin vencimiento = NaN). Las clases que g.2 no nombra llevan la nota 'asignada por implementacion'.
_G2_CONT, _G2_DIA, _G2_COG = "g.2: signos continuos 24 h", "g.2: diarios, autorreportes y sintomas 48 h", \
    "g.2: pruebas cognitivas, RST cada 4 dias = 96 h"
VIGENCIA_H: dict[str, dict] = {
    **{c: _p(24.0, provisional=True, supuesto="S18", fuente=_G2_CONT)
       for c in ("ecg_adaptador", "ecg_prenda_holter", "reloj_ppg", "oximetro_dedo", "spo2_muneca",
                 "bandas_toracicas", "termometro_oral", "temp_piel", "temp_central_estimada", "manguito_validado",
                 "manguito_sin_validar", "cuffless", "analizador_cabina")},
    **{c: _p(24.0, provisional=True, supuesto="S18", fuente="asignada por implementacion (signo puntual)",
             nota="g.2 no la nombra; se trata como signo continuo")
       for c in ("lectura_humana_ecg", "palpacion_pulso", "conteo_manual")},
    **{c: _p(48.0, provisional=True, supuesto="S18", fuente=_G2_DIA)
       for c in ("actigrafia", "sueno_etapas_consumo", "autorreporte", "diario", "cuestionario_phq9")},
    **{c: _p(96.0, provisional=True, supuesto="S18", fuente=_G2_COG)
       for c in ("pvt_laptop", "pvt_reloj", "prueba_cognitiva")},
    "modelo_eco": _p(72.0, provisional=True, supuesto="S18", fuente="g.2 / R4: eco 72 h (valor de demostracion)"),
    "laboratorio": _p(float("nan"), provisional=True, supuesto="S18",
                      fuente="g.2: laboratorio hasta la siguiente muestra (sin vencimiento = NaN)"),
    **{c: _p(48.0, provisional=True, supuesto="S18", fuente="asignada por implementacion (g.2 no la nombra)",
             nota="se trata como dato diario")
       for c in ("prueba_ortostatica", "captura_manual", "desconocido")},
}


def vigencia_h(clase: str | None) -> float:
    """Vigencia provisional [P S18] en horas; NaN = sin vencimiento (laboratorio)."""
    e = VIGENCIA_H.get(clase or "desconocido", VIGENCIA_H["desconocido"])
    return float(e["valor"])


# --------------------------------------------------------------------------------------------- niveles (b.3)
# (variable_id | "*", clase) -> (nivel, motivo, fuente, supuesto). "*" aplica a cualquier variable de esa clase.
_B3 = "b.3"
_NIVELES_FILAS: list[tuple[str, str, str, str, str, str | None]] = [
    ("01:V3", "ecg_prenda_holter", "N1", "ECG en prenda u Holter en reposo (LoA -3.2 a +2.9 lpm, Villar 2015)", _B3, None),
    ("01:V3", "ecg_adaptador", "N1", "adaptador ecg admitido como 'alta' por analogia con la prenda ECG (Villar 2015)",
     _B3, "S13"),
    ("01:V3", "reloj_ppg", "N2", "reloj PPG en reposo (MAE 7.2 lpm)", _B3, None),
    ("01:V31", "lectura_humana_ecg", "N1", "ECG u Holter leido por una persona", _B3, "S13"),
    ("01:V31", "ecg_prenda_holter", "N1", "ECG u Holter leido por una persona", _B3, "S13"),
    ("01:V31", "reloj_ppg", "N2", "PPG con confirmacion repetida (la confirmacion no se verifica aqui)", _B3, None),
    ("01:V31", "ecg_adaptador", "N4", "bandera del adaptador ecg (Dash 2009 sin la rama de RR omitidos): no hereda el nivel A",
     _B3, None),
    ("01:V32", "ecg_adaptador", "N4", "criterio RR de prematuridad del adaptador (experimental)", "a.2", "S12"),
    ("01:V33", "ecg_adaptador", "N4", "criterio RR de prematuridad del adaptador (experimental)", "a.2", "S12"),
    ("01:V34", "ecg_adaptador", "N4", "QTc de delineacion DWT del adaptador (experimental, no validado)", "a.2", None),
    ("01:V35", "ecg_adaptador", "N4", "PR de delineacion DWT del adaptador (experimental, no validado)", "a.2", None),
    ("04:A3", "oximetro_dedo", "N1", "oximetro de dedo: referencia segun [PREC]", _B3, "S13"),
    ("04:A3", "spo2_muneca", "N2", "muneca o prenda (sesgo 0.8 %, LoA -2.7 a +4.1; sobreestima en hipoxia)", _B3, None),
    ("04:A3", "reloj_ppg", "N2", "reloj/anillo/banda: SpO2 de muneca o prenda (sobreestima en hipoxia)", _B3, None),
    ("04:A2", "bandas_toracicas", "N1", "bandas toracicas en reposo (1 +/- 3 rpm)", _B3, None),
    ("04:A2", "conteo_manual", "N3b", "conteo manual (b.3: N3; precision no evaluada)", _B3, None),
    ("04:A1", "temp_piel", "N2", "piel de prenda: solo tendencia del mismo sensor", _B3, None),
    ("04:A1", "termometro_oral", "N3b", "oral: precision no evaluada [PAD]", _B3, None),
    ("04:A1", "temp_central_estimada", "N4", "central estimada como valor puntual (+0.34 +/- 0.2 C; Gunga 2009)", _B3, None),
    ("03:V47", "temp_central_estimada", "N4", "valor puntual de temperatura central (solo sirve para el ritmo)", _B3, None),
    ("01:V1", "manguito_validado", "N1", "manguito con validacion ISO 81060-2 declarada", _B3, None),
    ("01:V1", "manguito_sin_validar", "N4",
     "PA sin manguito validado (a.4 dice N4; b.3 dice N3: se aplica el mas conservador hasta decision del equipo)",
     "a.4 / b.3", "provisional"),
    ("01:V1", "cuffless", "N4", "cuffless (-2.13 +/- 11.57 mmHg; la ESH indica no usarlo en clinica)", _B3, None),
    ("03:V30", "actigrafia", "N2", "actigrafia, duracion (sensibilidad 0.965, especificidad 0.329)", _B3, None),
    ("03:V66", "pvt_laptop", "N2", "PVT-B en laptop", _B3, None),
    ("03:V66", "pvt_reloj", "N3b", "PVT en reloj (latencia no cuantificada)", _B3, None),
    ("04:A23", "analizador_cabina", "N3a", "analizador de cabina: baja por evidencia, no por el sensor", _B3, None),
    ("03:V1", "cuestionario_phq9", "N1", "PHQ-9", _B3, None),
    ("*", "autorreporte", "N3a", "autorreporte fuera de PHQ-9: baja por evidencia", _B3, None),
    ("*", "sueno_etapas_consumo", "N4", "etapas de sueno de dispositivos de consumo", _B3, None),
    ("*", "temp_central_estimada", "N4", "temperatura central estimada como valor puntual", _B3, None),
    ("*", "cuffless", "N4", "cuffless", _B3, None),
    ("*", "modelo_eco", "N4", "toda salida de modelo de eco es N4 hasta que haya validacion", "b.2", None),
    ("*", "desconocido", "N4", "clase de dispositivo desconocida: no se puede asignar nivel (decision conservadora)",
     "implementacion", "provisional"),
]
NIVELES_CONFIG: dict[tuple[str, str], dict] = {
    (v, c): {"nivel": n, "motivo": m, "fuente": f, "supuesto": s, "provisional": s is not None}
    for v, c, n, m, f, s in _NIVELES_FILAS
}
NIVEL_POR_DEFECTO = ("N3b", "precision no evaluada (b.2 N3b): nivel de la tabla")


def calidad_declarada_buena(quality: Any) -> bool:
    return str(quality or "").strip().lower() in CALIDAD_BUENA


def nivel_para(variable_id: str | None, clase_dispositivo: str | None, quality: str | None = None, *,
               contexto: str | None = None, ritmo_irregular: bool | None = False) -> tuple[str, str]:
    """Nivel N0-N4 y motivo (G4; b.2, b.3). `ritmo_irregular`: False = ritmo no marcado como irregular; True o None
    (bandera desconocida) = el ECG baja a N2 (b.3: 'ECG con ritmo marcado como irregular')."""
    q = str(quality or "")
    if "prueba_de_carga" in q:
        return "N0", "prueba de carga: no es dato (G0)"
    clase = clase_dispositivo if clase_dispositivo in CLASES_DISPOSITIVO else "desconocido"
    v = variable_id

    def _con_calidad(nivel: str, motivo: str) -> tuple[str, str]:
        if nivel in ("N3a", "N3b") and not calidad_declarada_buena(quality):
            motivo += "; calidad no declarada buena: no actualiza la base (b.2)"
        return nivel, motivo

    # reglas dependientes del contexto o del ritmo (b.3)
    if v == "01:V3":
        if clase in ("reloj_ppg", "spo2_muneca") and contexto in ("actividad", "ejercicio", "eva"):
            return "N4", "PPG en actividad: no se admite como FC en reposo (b.3)"
        if clase in ("ecg_adaptador", "ecg_prenda_holter"):
            base = NIVELES_CONFIG[(v, clase)]
            if ritmo_irregular is not False:
                est = "ritmo marcado como irregular" if ritmo_irregular else "bandera de ritmo no disponible"
                return "N2", f"ECG con {est} (b.3); " + base["motivo"]
            if clase == "ecg_prenda_holter" and contexto in ("actividad", "ejercicio", "eva"):
                return "N2", "prenda en movimiento (-1.77 +/- 7.22 lpm) (b.3)"
            return "N1", base["motivo"]
    if v == "04:A2" and clase == "bandas_toracicas" and contexto in ("ejercicio", "actividad"):
        return "N2", "ejercicio maximo (2 +/- 7 rpm) (b.3)"
    for clave in ((v, clase), ("*", clase)):
        if clave in NIVELES_CONFIG:
            e = NIVELES_CONFIG[clave]
            return _con_calidad(e["nivel"], e["motivo"])
    if v is None:
        return _con_calidad("N3b", "sin variable de equipo: se guarda, no puntua")
    return _con_calidad(*NIVEL_POR_DEFECTO)


# --------------------------------------------------------------------------------------------- dominio (G5)
_NO_NEGATIVAS = frozenset({"bpm", "lpm", "ms", "mmHg", "rpm", "h", "min", "count", "mL", "latidos", "latidos/24 h", "ml"})
_FRACCIONES = frozenset({"fraccion_0_1", "probabilidad_modelo_0_1", "fraccion_vecinos_0_1"})
_BINARIAS = frozenset({"bandera_0_1_no_diagnostica", "presencia_0_1"})


def dominio_valido(variable_id: str | None, unidad: str | None, valor: float | None) -> tuple[bool, str]:
    """G5: valores imposibles (SpO2 > 100 %, fraccion fuera de 0-1, duracion negativa, FC fuera de 20-240 lpm)."""
    if valor is None or (isinstance(valor, float) and math.isnan(valor)):
        return True, ""
    x = float(valor)
    if not math.isfinite(x):
        return False, "valor no finito"
    if variable_id in ("01:V3", "04:A4"):
        lo, hi = parametro("fc_min_lpm"), parametro("fc_max_lpm")
        if not lo <= x <= hi:
            return False, f"FC {x:g} lpm fuera de {lo:g}-{hi:g} lpm (G5: limites de RR 0.25-3.0 s del contrato)"
    if variable_id == "04:A3" and not 0 < x <= 100:
        return False, f"SpO2 {x:g} % imposible (debe estar en (0, 100])"
    u = (unidad or "").strip()
    if u == "%" and not 0 <= x <= 100:
        return False, f"porcentaje {x:g} fuera de 0-100"
    if u in _FRACCIONES and not 0 <= x <= 1:
        return False, f"fraccion {x:g} fuera de 0-1"
    if u == "coseno" and not -1 <= x <= 1:
        return False, f"similitud coseno {x:g} fuera de -1..1"
    if u in _BINARIAS and x not in (0.0, 1.0):
        return False, f"valor {x:g} no es 0/1 (presencia o bandera)"
    if u == "°C" and not parametro("temp_c_min") <= x <= parametro("temp_c_max"):
        return False, (f"temperatura {x:g} °C fuera de {parametro('temp_c_min'):g}-{parametro('temp_c_max'):g} "
                       "(provisional: limite de plausibilidad fisica)")
    if u in _NO_NEGATIVAS and x < 0:
        return False, f"valor negativo {x:g} {u} imposible"
    return True, ""


# --------------------------------------------------------------------------------------------- utilidades
_VACIOS = {"", "nan", "none", "null", "na"}


def es_vacio(x: Any) -> bool:
    if x is None:
        return True
    if isinstance(x, float) and math.isnan(x):
        return True
    try:
        if x is pd.NA or x is pd.NaT:
            return True
    except Exception:  # pragma: no cover
        pass
    return isinstance(x, str) and x.strip().lower() in _VACIOS


def a_float(x: Any) -> float | None:
    """float o None (vacio o no numerico). Nunca devuelve 0 por un vacio."""
    if es_vacio(x):
        return None
    try:
        v = float(x)
    except (TypeError, ValueError):
        return None
    return v if math.isfinite(v) else None


def a_bool(x: Any) -> bool | None:
    if isinstance(x, (bool, np.bool_)):
        return bool(x)
    if es_vacio(x):
        return None
    s = str(x).strip().lower()
    if s in ("true", "1", "yes", "si", "sí"):
        return True
    if s in ("false", "0", "no"):
        return False
    return None


def unir_etiquetas(*partes: Any) -> str:
    out: list[str] = []
    for p in partes:
        if es_vacio(p):
            continue
        for t in str(p).split("; "):
            t = t.strip()
            if t and t not in out:
                out.append(t)
    return "; ".join(out)


def recortar(texto: Any, n: int = 400) -> str:
    s = "" if es_vacio(texto) else str(texto)
    return s if len(s) <= n else s[:n] + "…"


_RE_VENTANA = re.compile(r"(?<![A-Za-z])t\s+(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\s*s(?![A-Za-z])")
_RE_VENTANA_TXT = re.compile(r"(\d+(?:[.,]\d+)?)\s*(min|minutos|minutes|s|seg|segundos|seconds)\b", re.I)
_RE_RUN_FECHA = re.compile(r"^(\d{8}T\d{6})")


def duracion_analizada_s(notes: Any) -> float | None:
    """Duracion de la ventana analizada, leida de `notes` («t 0.0-180.0 s»). None si no se puede leer."""
    m = _RE_VENTANA.search("" if es_vacio(notes) else str(notes))
    if not m:
        return None
    d = float(m.group(2)) - float(m.group(1))
    return d if d > 0 else None


def ventana_hrv_comparable(duracion_s: float | None) -> bool:
    """c.1: solo ventanas de ~300 s son comparables con Nunan 2010. Duracion desconocida = no comparable."""
    if duracion_s is None:
        return False
    ref = parametro("ventana_hrv_s")
    return abs(duracion_s - ref) <= parametro("ventana_hrv_tolerancia") * ref


def ventana_declarada_s(texto: Any) -> float | None:
    """Ventana declarada en texto libre («5 min», «300 s») para sensores; None si no se declara."""
    if es_vacio(texto):
        return None
    m = _RE_VENTANA_TXT.search(str(texto))
    if not m:
        return None
    n = float(m.group(1).replace(",", "."))
    return n * 60.0 if m.group(2).lower() in ("min", "minutos", "minutes") else n


def fecha_de_run_id(run_id: Any) -> pd.Timestamp | None:
    if es_vacio(run_id):
        return None
    m = _RE_RUN_FECHA.match(str(run_id).strip())
    if not m:
        return None
    try:
        return pd.to_datetime(m.group(1), format="%Y%m%dT%H%M%S")
    except (ValueError, TypeError):
        return None


def a_timestamp_naive(ts: Any) -> tuple[pd.Timestamp | None, str]:
    """Timestamp sin zona. Si trae zona se convierte a UTC y se anota. (None, motivo) si no se puede leer."""
    if es_vacio(ts):
        return None, "vacio"
    try:
        t = pd.Timestamp(ts)
    except (ValueError, TypeError):
        return None, f"no legible: {ts!r}"
    if pd.isna(t):
        return None, "vacio"
    if t.tzinfo is not None:
        return t.tz_convert("UTC").tz_localize(None), "zona convertida a UTC"
    return t, ""


def fila_obs(**kw: Any) -> dict:
    """Fila de observacion con valores por defecto para todas las columnas de OBS_COLUMNAS."""
    base = dict(
        subject_id="", timestamp=pd.NaT, variable_id=None, valor=float("nan"), unidad="", clase_dispositivo="desconocido",
        nivel="N3b", nivel_motivo="", simulated=False, contexto=None, metodo=None, decide=True, calidad_buena=False,
        vigencia_h=float("nan"), z_pob_permitido=True, sin_dato=None, origen="", metric="", quality="", run_id=None,
        etiquetas="", notas="",
    )
    extra = set(kw) - set(base)
    if extra:
        raise KeyError(f"columnas desconocidas: {sorted(extra)}")
    base.update(kw)
    if base["vigencia_h"] is None or (isinstance(base["vigencia_h"], float) and math.isnan(base["vigencia_h"])):
        base["vigencia_h"] = vigencia_h(base["clase_dispositivo"])
    return base


def rechazo(*, subject_id: Any = "", timestamp: Any = None, metric: Any = "", valor: Any = None, quality: Any = "",
            simulated: Any = None, run_id: Any = None, origen: str = "", paso: str, motivo: str) -> dict:
    return {"subject_id": "" if es_vacio(subject_id) else str(subject_id),
            "timestamp": None if es_vacio(timestamp) else str(timestamp),
            "metric": "" if es_vacio(metric) else str(metric), "valor": None if es_vacio(valor) else valor,
            "quality": "" if es_vacio(quality) else str(quality), "simulated": a_bool(simulated),
            "run_id": None if es_vacio(run_id) else str(run_id), "origen": origen, "paso": paso, "motivo": motivo}


_COLS_OBJETO = ("variable_id", "contexto", "metodo", "sin_dato", "run_id")


def obs_a_df(filas: list[dict]) -> pd.DataFrame:
    """DataFrame con exactamente OBS_COLUMNAS y tipos estables (None se conserva en columnas de texto opcionales)."""
    df = pd.DataFrame(filas, columns=OBS_COLUMNAS) if filas else pd.DataFrame({c: [] for c in OBS_COLUMNAS})
    df["timestamp"] = pd.to_datetime(df["timestamp"])
    for c in ("valor", "vigencia_h"):
        df[c] = pd.to_numeric(df[c], errors="coerce").astype("float64")
    for c in ("simulated", "decide", "calidad_buena", "z_pob_permitido"):
        df[c] = df[c].astype(bool)
    for c in _COLS_OBJETO:
        df[c] = pd.Series([None if es_vacio(x) else x for x in df[c]], index=df.index, dtype=object)
    for c in ("subject_id", "unidad", "clase_dispositivo", "nivel", "nivel_motivo", "origen", "metric", "quality",
              "etiquetas", "notas"):
        df[c] = df[c].astype(object).where(df[c].notna(), "")
    return df[OBS_COLUMNAS].reset_index(drop=True)


def rechazadas_a_df(filas: list[dict]) -> pd.DataFrame:
    if not filas:
        return pd.DataFrame({c: [] for c in RECHAZADAS_COLUMNAS})
    return pd.DataFrame(filas, columns=RECHAZADAS_COLUMNAS)


# --------------------------------------------------------------------------------------------- mapeo ECG / eco
ECG_METRICAS = {"heart_rate", "hrv_rmssd", "hrv_sdnn", "qtc_bazett", "pr_interval", "latidos_irregulares",
                "ritmo_irregular_compatible_fa", "ritmo_irregular_fraccion_ventanas"}
EF_ALIAS = {"ef", "feve", "ejection_fraction", "ejection_fraction_zero_shot"}
PANECHO_VOLUMENES = {"lvsv": "01:V4", "lvedv": "01:V17", "lavol": "01:V36"}   # OJO: 01:V17 (volumen), no 03:V17 (HRV)
_UNIDADES_VOLUMEN = {"cm3", "cm³", "cm^3", "ml", "mL"}
ETIQ_EXPERIMENTAL = "[experimental]"
ETIQ_ECO = "[modelo de investigacion, no diagnostico; N4]"
ETIQ_DESCRIPTIVA = "[descriptiva: no es medicion ni probabilidad clinica (G3)]"


def _reposo_declarado(ecg_en_reposo: bool | dict, subject_id: str, run_id: str | None) -> bool:
    if isinstance(ecg_en_reposo, dict):
        if run_id is not None and run_id in ecg_en_reposo:
            return bool(ecg_en_reposo[run_id])
        return bool(ecg_en_reposo.get(subject_id, False))
    return bool(ecg_en_reposo)


def puerta(filas_contrato: pd.DataFrame, *, ecg_en_reposo: bool | dict = False,
           origen: str = "outputs_raw") -> tuple[pd.DataFrame, pd.DataFrame, list[str]]:
    """Puerta de calidad para filas del contrato de 14 columnas (`core/formato.py`). Pasos G0-G6 de b.1.

    `ecg_en_reposo`: bool o dict subject_id (o run_id) -> bool. Por defecto False: la FC del adaptador va a `04:A4`.
    Devuelve (obs, rechazadas, avisos). `avisos` siempre incluye las advertencias de b.3."""
    avisos = list(AVISOS_SIEMPRE)
    if filas_contrato is None or len(filas_contrato) == 0:
        return obs_a_df([]), rechazadas_a_df([]), avisos
    faltan = [c for c in CONTRATO_COLUMNAS if c not in filas_contrato.columns]
    if faltan:
        raise ValueError(f"G0: faltan columnas del contrato {faltan}")
    regs = filas_contrato.to_dict("records")

    # contexto por run: bandera de ritmo, agregado de estudio (PanEcho)
    ctx: dict[Any, dict] = {}

    def clave_run(r: dict) -> Any:
        rid = None if es_vacio(r.get("run_id")) else str(r["run_id"])
        return rid if rid else (str(r.get("subject_id")), str(r.get("model")), str(r.get("timestamp")))

    for r in regs:
        k = clave_run(r)
        c = ctx.setdefault(k, {"flag": None, "agregado": False})
        if str(r.get("model")) == "ecg" and str(r.get("metric")) == "ritmo_irregular_compatible_fa":
            v = a_float(r.get("value"))
            if v in (0.0, 1.0):
                c["flag"] = int(v)
        if str(r.get("model")) == "panecho" and "nivel_estudio_agregado" in str(r.get("quality") or ""):
            c["agregado"] = True

    obs: list[dict] = []
    rech: list[dict] = []
    n_a4 = n_v3 = n_hrv_no_comp = n_sin_ts = 0

    for r in regs:
        sid, metric, model = r.get("subject_id"), str(r.get("metric") or ""), str(r.get("model") or "")
        quality = "" if es_vacio(r.get("quality")) else str(r["quality"]).strip()
        run_id = None if es_vacio(r.get("run_id")) else str(r["run_id"])
        tipo = "" if es_vacio(r.get("tipo")) else str(r["tipo"])
        rc = dict(subject_id=sid, timestamp=r.get("timestamp"), metric=metric, valor=r.get("value"), quality=quality,
                  simulated=r.get("simulated"), run_id=run_id, origen=origen)

        # ---- G0 contrato
        if "prueba_de_carga" in quality or "prueba_de_carga" in str(r.get("notes") or "")[:200]:
            rech.append(rechazo(**rc, paso="G0", motivo="fila de prueba_de_carga: nunca es dato (N0)"))
            continue
        if es_vacio(sid):
            rech.append(rechazo(**rc, paso="G0", motivo="subject_id vacio"))
            continue
        sid = str(sid).strip()
        sim = a_bool(r.get("simulated"))
        if sim is None:
            rech.append(rechazo(**rc, paso="G0", motivo="`simulated` vacio o invalido (G1 exige true/false)"))
            continue
        if tipo not in TIPOS_CONTRATO:
            rech.append(rechazo(**rc, paso="G0", motivo=f"tipo {tipo!r} fuera del contrato"))
            continue
        es_sin_dato = quality.lower().startswith("sin_dato")
        val_vacio = es_vacio(r.get("value"))
        if es_sin_dato != val_vacio:
            rech.append(rechazo(**rc, paso="G0", motivo=(
                "violacion del contrato: `sin_dato` con un valor presente (un 0 con sin_dato no es valido)"
                if es_sin_dato else "violacion del contrato: `value` vacio sin quality `sin_dato: <motivo>`")))
            continue
        ts, aviso_ts = a_timestamp_naive(r.get("timestamp"))
        etiq_ts = ""
        if ts is None:
            if aviso_ts != "vacio":
                rech.append(rechazo(**rc, paso="G0", motivo=f"timestamp {aviso_ts}"))
                continue
            ts = fecha_de_run_id(run_id)
            if ts is None:
                rech.append(rechazo(**rc, paso="G0", motivo="timestamp vacio y run_id sin fecha (YYYYMMDDTHHMMSS_...)"))
                continue
            etiq_ts = "fecha del run, no de la adquisicion"
            n_sin_ts += 1
        elif aviso_ts:
            etiq_ts = "timestamp con zona convertido a UTC"

        valor_f = None if val_vacio else a_float(r.get("value"))
        texto = None
        if not val_vacio and valor_f is None:
            texto = str(r.get("value"))                      # hallazgo textual (p. ej. informe de EchoPrime)
        unidad = "" if es_vacio(r.get("unit")) else str(r["unit"]).strip()
        notes = r.get("notes")
        dur = duracion_analizada_s(notes)
        c = ctx.get(clave_run(r), {"flag": None, "agregado": False})
        flag = c["flag"]

        # ---- G2/G3: mapeo y tipo
        var: str | None = None
        clase = "modelo_eco" if model in MODELOS_ECO else ("ecg_adaptador" if model == "ecg" else "desconocido")
        decide, z_pob, contexto = True, True, None
        etq: list[str] = [etiq_ts]
        sin_dato_txt = quality if es_sin_dato else None
        ritmo_irr: bool | None = False
        nota_extra = ""

        if tipo in ("probabilidad_clase", "similitud"):
            decide = False
            etq.append(ETIQ_DESCRIPTIVA)
            if model in MODELOS_ECO:
                etq.append(ETIQ_ECO)
        elif texto is not None:
            decide = False
            etq += ["[descriptiva: texto]", ETIQ_ECO if model in MODELOS_ECO else ""]
        elif model == "ecg" and metric in ECG_METRICAS:
            if metric == "heart_rate":
                if _reposo_declarado(ecg_en_reposo, sid, run_id):
                    var, contexto = "01:V3", "reposo"
                    ritmo_irr = None if flag is None else bool(flag)
                    n_v3 += 1
                    if flag is None:
                        etq.append("bandera de ritmo no disponible: N2")
                else:
                    var = "04:A4"
                    n_a4 += 1
                    etq.append("FC instantanea: registro no declarado en reposo; sin ligas (a.2)")
            elif metric in ("hrv_rmssd", "hrv_sdnn"):
                var = "03:V17"                                   # alias de 01:V43 del contrato ('V43')
                decide = metric == "hrv_rmssd"
                etq.append("una sola aportacion a 03:V17" + ("" if decide else " (SDNN: solo informativa)"))
                if not ventana_hrv_comparable(dur):
                    z_pob = False
                    n_hrv_no_comp += 1
                    etq.append("ventana analizada no es de ~300 s: no comparable con Nunan 2010 (c.1)"
                               + ("" if dur is None else f" [{dur:g} s]"))
            elif metric == "qtc_bazett":
                var = "01:V34"
                etq.append(ETIQ_EXPERIMENTAL)
                if flag == 1 and not es_sin_dato:
                    sin_dato_txt = "sin_dato: QTc no evaluable: ritmo marcado como irregular (bandera = 1) en el mismo run (a.2)"
                    nota_extra = f"valor del adaptador NO usado: {valor_f:g} {unidad}" if valor_f is not None else ""
                    valor_f = None
            elif metric == "pr_interval":
                var = "01:V35"
                etq += [ETIQ_EXPERIMENTAL, "01:V35 es solo pre-post en astronautas [VMA]"]
            elif metric == "latidos_irregulares":
                var = "01:V32"                                   # peso menor de las dos (nunca 01:V33) [P S12]
                etq += [ETIQ_EXPERIMENTAL, "tasa extrapolada [P·S12]",
                        "no distingue supraventricular de ventricular (proxy V32 con el peso menor; nunca V33)"]
                if not es_sin_dato:
                    if valor_f is not None and dur:
                        nota_extra = f"n={valor_f:g} latidos en {dur:g} s"
                        valor_f = valor_f * parametro("horas_dia") * 3600.0 / dur
                        unidad = "latidos/24 h"
                    else:
                        sin_dato_txt = "sin_dato: duracion analizada ilegible en notes; no se extrapola a 24 h (c.1)"
                        valor_f = None
            elif metric == "ritmo_irregular_compatible_fa":
                var = "01:V31"
                etq += [ETIQ_EXPERIMENTAL, "bandera del adaptador: no hereda el nivel A ni el LR de Taggar (d.2)"]
            elif metric == "ritmo_irregular_fraccion_ventanas":
                var, decide = "01:V31", False
                etq += [ETIQ_EXPERIMENTAL, "descriptiva: la bandera es la evidencia (a.2)"]
            if "aviso_delineacion" in quality:
                etq.append("aviso del adaptador: delineacion no fiable (ritmo irregular)")
        elif model in MODELOS_ECO:
            etq.append(ETIQ_ECO)
            ml = metric.strip().lower()
            if ml in EF_ALIAS and tipo == "medicion":
                var = "01:V18"
                etq.append("FEVI de eco: entra como N4 en P01 y P02 (peso 1, evidencia C); no puede dar ROJO sola; no es diagnostico")
            elif model == "panecho" and ml in PANECHO_VOLUMENES and tipo == "medicion":
                var = PANECHO_VOLUMENES[ml]
                if "nivel_video" in quality and c["agregado"]:
                    rech.append(rechazo(**rc, paso="a.5",
                                        motivo="fila nivel_video: se usa solo nivel_estudio_agregado (no contar dos veces)"))
                    continue
                if unidad not in _UNIDADES_VOLUMEN and not val_vacio:
                    rech.append(rechazo(**rc, paso="G5", motivo=f"unidad {unidad!r} no es cm3/mL para {metric}"))
                    continue
                unidad = "mL"
                etq.append("cm3 = mL; comparabilidad con el metodo de vuelo no demostrada [P·S15]")
                if var == "01:V17":
                    etq.append("parcial: 01:V17 es masa y volumen telediastolico; el modelo no da masa")
                if var in ("01:V17", "01:V36"):
                    etq.append("solo pre-post [VMA]")
            else:
                decide = False
                etq.append("sin variable de equipo (a.3): se guarda, no puntua")
        else:
            decide = False
            etq.append("sin variable de equipo: metrica no mapeada (a.3)")

        # ---- G5 dominio
        if var is not None and var in PUNTEROS_FUSIONADOS:  # pragma: no cover (defensa G2)
            var = None
        ok, why = dominio_valido(var, unidad, valor_f)
        if not ok:
            rech.append(rechazo(**rc, paso="G5", motivo=why))
            continue

        nivel, motivo = nivel_para(var, clase, quality, contexto=contexto, ritmo_irregular=ritmo_irr)
        if var is None and clase in ("ecg_adaptador", "modelo_eco"):
            nivel, motivo = "N4", "sin variable de equipo; salida experimental o de modelo (b.2)"
        if nivel == "N0":
            rech.append(rechazo(**rc, paso="G0", motivo=motivo))
            continue
        obs.append(fila_obs(
            subject_id=sid, timestamp=ts, variable_id=var, valor=float("nan") if valor_f is None else float(valor_f),
            unidad=unidad, clase_dispositivo=clase, nivel=nivel, nivel_motivo=motivo, simulated=sim, contexto=contexto,
            metodo=None, decide=decide, calidad_buena=calidad_declarada_buena(quality) and sin_dato_txt is None,
            z_pob_permitido=z_pob, sin_dato=sin_dato_txt, origen=origen, metric=metric, quality=quality, run_id=run_id,
            etiquetas=unir_etiquetas(*etq),
            notas=" | ".join(x for x in (f"modelo={model}" if model in MODELOS_ECO else "", nota_extra, recortar(texto, 200) if texto is not None else "",
                                         recortar(notes, 300)) if x)))

    df_obs, df_rech = obs_a_df(obs), rechazadas_a_df(rech)
    if len(df_obs) and df_obs["simulated"].any():
        avisos.append(f"{int(df_obs['simulated'].sum())} filas con simulated=true: canal SIMULADO (G1); el semaforo real las ignora.")
    if n_v3:
        avisos.append(f"{n_v3} FC de ECG declaradas en reposo -> 01:V3.")
    if n_a4:
        avisos.append(f"{n_a4} FC de ECG sin reposo declarado -> 04:A4 (FC instantanea, sin ligas). Declara reposo con ecg_en_reposo=True.")
    if n_hrv_no_comp:
        avisos.append(f"{n_hrv_no_comp} filas de HRV con ventana distinta de ~300 s: z_pob_permitido=False (c.1).")
    if n_sin_ts:
        avisos.append(f"{n_sin_ts} filas sin timestamp: se uso la fecha del run_id (no es la fecha de adquisicion).")
    if len(df_rech):
        avisos.append(f"{len(df_rech)} filas rechazadas (N0): " + "; ".join(
            f"{p}={n}" for p, n in df_rech["paso"].value_counts().items()) + ".")
    return df_obs, df_rech, avisos
