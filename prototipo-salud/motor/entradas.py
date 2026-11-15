"""Entradas del motor de padecimientos: runs guardados, sensores y CSV nativo (DISENO.md §1, §3, §3.1).

Todas devuelven observaciones con las columnas de `calidad.OBS_COLUMNAS`. Nunca se mezclan personas; una fila vacia
nunca se convierte en 0; lo simulado conserva `simulated=True`. **Nada es un diagnostico.**
Rutas relativas a la raiz del prototipo (`Path(__file__).resolve().parents[1]`). Solo numpy, pandas y stdlib.
"""
from __future__ import annotations

import json
import math
import re
import unicodedata
from pathlib import Path
from typing import Any

import pandas as pd

from . import calidad as cal
from .calidad import (CALIDAD_BUENA, CLASES_DISPOSITIVO, CONTEXTOS, CONTRATO_COLUMNAS, METODOS, NATIVO_COLUMNAS,
                      OBS_COLUMNAS, PUNTEROS_FUSIONADOS, RAIZ)

RAW_DIR_DEFECTO = RAIZ / "outputs" / "raw"
SIMULADO_DIR_DEFECTO = RAIZ / "datos" / "simulado"
ARCHIVO_SIMULADO = "tripulacion_simulada"

# Noche = 22-6 h, la misma definicion de `sensores/resumen.py` (`noches`: hora_inicio=22, hora_fin=6, sobre UTC).
NOCHE_INICIO_H, NOCHE_FIN_H = 22, 6


def _resolver(ruta: str | Path | None, defecto: Path) -> Path:
    if ruta is None:
        return defecto
    p = Path(ruta)
    return p if p.is_absolute() else RAIZ / p


def _contrato_vacio() -> pd.DataFrame:
    return pd.DataFrame({c: [] for c in CONTRATO_COLUMNAS})


def _unico(avisos: list[str]) -> list[str]:
    out: list[str] = []
    for a in avisos:
        if a not in out:
            out.append(a)
    return out


# ------------------------------------------------------------------------------------- outputs/raw
def leer_outputs_raw(raw_dir: str | Path | None = None) -> tuple[pd.DataFrame, list[str]]:
    """Lee `<raw_dir>/*/normalized_run.csv` solo de runs con `response.json` status == "ok" y que no sean prueba de carga
    (`random_load_test` falso). Devuelve (filas del contrato de 14 columnas, avisos). Carpeta vacia o inexistente: vacio."""
    base = _resolver(raw_dir, RAW_DIR_DEFECTO)
    avisos: list[str] = []
    if not base.is_dir():
        return _contrato_vacio(), [f"{_rel(base)}: no existe; sin runs."]
    partes: list[pd.DataFrame] = []
    n_dirs = 0
    for d in sorted(p for p in base.iterdir() if p.is_dir()):
        n_dirs += 1
        rp, cp = d / "response.json", d / "normalized_run.csv"
        if not rp.exists() or not cp.exists():
            avisos.append(f"run {d.name}: omitido (falta response.json o normalized_run.csv).")
            continue
        try:
            resp = json.loads(rp.read_text(encoding="utf-8"))
        except (OSError, ValueError) as e:
            avisos.append(f"run {d.name}: omitido (response.json ilegible: {type(e).__name__}).")
            continue
        if resp.get("status") != "ok":
            avisos.append(f"run {d.name}: omitido (status={resp.get('status')!r}, no es 'ok').")
            continue
        if resp.get("random_load_test"):
            avisos.append(f"run {d.name}: omitido (prueba de carga con tensor aleatorio: NO es inferencia real).")
            continue
        df = pd.read_csv(cp, dtype=str, keep_default_na=False)
        faltan = [c for c in CONTRATO_COLUMNAS if c not in df.columns]
        if faltan:
            avisos.append(f"run {d.name}: omitido (faltan columnas del contrato {faltan}).")
            continue
        df = df[CONTRATO_COLUMNAS].copy()
        df["run_id"] = df["run_id"].where(df["run_id"].str.strip() != "", d.name)
        df["value"] = [cal.a_float(v) if cal.a_float(v) is not None else (None if cal.es_vacio(v) else v)
                       for v in df["value"]]
        df["value"] = df["value"].astype(object)
        df["simulated"] = [cal.a_bool(v) if cal.a_bool(v) is not None else v for v in df["simulated"]]
        partes.append(df)
    if not partes:
        avisos.append(f"{_rel(base)}: {n_dirs} carpetas, ningun run admisible (vacio).")
        return _contrato_vacio(), avisos
    out = pd.concat(partes, ignore_index=True)
    avisos.append(f"{_rel(base)}: {len(partes)} runs ok leidos, {len(out)} filas del contrato.")
    return out, avisos


def _rel(p: Path) -> str:
    try:
        return p.resolve().relative_to(RAIZ).as_posix()
    except ValueError:
        return p.name


# ------------------------------------------------------------------------------------- sensores
def _sin_acentos(s: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", s.lower()) if unicodedata.category(c) != "Mn")


# Tabla PROVISIONAL de palabras del nombre de `device` -> tipo de dispositivo (orden = prioridad). No sale de ALGORITMOS.md:
# es una decision de implementacion que el equipo debe revisar (a.4 solo fija el mapeo variable -> variable_id).
PALABRAS_DISPOSITIVO: list[tuple[str, tuple[str, ...]]] = [
    ("cuffless", ("cuffless", "sin_manguito", "sin manguito")),
    ("manguito", ("manguito", "cuff", "tensiometro", "baumanometro")),
    ("termometro", ("termometro", "thermometer", "thermo")),
    ("oximetro", ("oximetro", "oximeter", "dedo", "finger", "pulse_ox")),
    ("holter", ("holter", "ecg", "electrocardio")),
    ("actigrafo", ("actigraf", "actigraph")),
    ("wearable", ("reloj", "watch", "anillo", "ring", "band", "pulsera", "wrist", "muneca", "fitbit", "oura")),
    ("diario", ("diario", "diary")),
    ("manual", ("manual", "captura")),
]
_RE_ISO = re.compile(r"(^|[^a-z])iso([^a-z]|$)")
_RE_NO_VALIDADO = re.compile(r"(sin|no|not|unvalidated|no_)[ _-]*(validad|validar|validated)")

_VAR_HRV = ("hrv_rmssd", "hrv_sdnn")
_VAR_SUEÑO = ("sleep_duration", "sleep_efficiency")
_VAR_PA = ("bp_systolic", "bp_diastolic")


def tipo_dispositivo(device: str) -> str:
    d = _sin_acentos(str(device))
    for tipo, palabras in PALABRAS_DISPOSITIVO:
        if any(p in d for p in palabras):
            return tipo
    return "desconocido"


def clase_dispositivo_sensor(device: str, variable: str, mapa_clase: dict | None = None) -> str:
    """Clase de dispositivo (vocabulario de `calidad.CLASES_DISPOSITIVO`) a partir del nombre de `device` y la variable."""
    if mapa_clase:
        for k in (device, str(device).lower()):
            if k in mapa_clase and mapa_clase[k] in CLASES_DISPOSITIVO:
                return mapa_clase[k]
    if variable == "symptom":
        return "autorreporte"
    t = tipo_dispositivo(device)
    d = _sin_acentos(str(device))
    if t == "wearable":
        if variable in ("heart_rate",) + _VAR_HRV + ("steps", "active_minutes"):
            return "reloj_ppg"
        if variable == "spo2":
            return "spo2_muneca"
        if variable in _VAR_SUEÑO:
            return "actigrafia"
        if variable in _VAR_PA:
            return "cuffless"
        if variable in ("temp_body", "temp_skin"):
            return "temp_piel"
    elif t == "cuffless" and variable in _VAR_PA:
        return "cuffless"
    elif t == "manguito" and variable in _VAR_PA:
        validado = (("validad" in d or _RE_ISO.search(d)) and not _RE_NO_VALIDADO.search(d))
        return "manguito_validado" if validado else "manguito_sin_validar"
    elif t == "termometro":
        if variable == "temp_body":
            return "termometro_oral"
        if variable == "temp_skin":
            return "temp_piel"
    elif t == "oximetro" and variable == "spo2":
        return "oximetro_dedo"
    elif t == "holter" and variable == "heart_rate":
        return "ecg_prenda_holter"
    elif t == "actigrafo" and variable in _VAR_SUEÑO:
        return "actigrafia"
    elif t == "diario" and variable in _VAR_SUEÑO:
        return "diario"
    elif t == "manual":
        return "captura_manual"
    return "desconocido"


_RE_REPOSO = re.compile(r"\b(reposo|resting|rest|sleep|sleeping|sue[nñ]o|dormid[oa]|asleep)\b", re.I)
_RE_SUENO = re.compile(r"\b(sleep|sleeping|sue[nñ]o|dormid[oa]|asleep)\b", re.I)
_RE_ACTIVIDAD = re.compile(r"\b(ejercicio|exercise|workout|running|correr|actividad|activity|walking|caminata)\b", re.I)


def es_noche(ts: pd.Timestamp) -> bool:
    """22-6 h (misma definicion que `sensores/resumen.py`: los naive se tratan como UTC)."""
    t = pd.Timestamp(ts)
    h = (t.tz_convert("UTC") if t.tzinfo is not None else t).hour
    return h >= NOCHE_INICIO_H or h < NOCHE_FIN_H


def _contexto_hr(ts: pd.Timestamp, texto: str) -> tuple[str | None, str]:
    """(contexto, motivo) de una FC de sensor: 'sueno'/'reposo' si es de noche o se declara; None si no es reposo."""
    if _RE_ACTIVIDAD.search(texto):
        return "actividad", "declarada en actividad"
    if _RE_SUENO.search(texto):
        return "sueno", "declarada en sueno"
    if _RE_REPOSO.search(texto):
        return "reposo", "declarada en reposo"
    if es_noche(ts):
        return "sueno", "noche (22-6 h)"
    return None, ""


_MAPA_SENSOR: dict[str, dict] = {
    "heart_rate": dict(var="01:V3"), "hrv_rmssd": dict(var="03:V17", decide=True),
    "hrv_sdnn": dict(var="03:V17", decide=False), "spo2": dict(var="04:A3"),
    "bp_systolic": dict(var="01:V1", decide=True), "bp_diastolic": dict(var="01:V1", decide=False),
    "temp_body": dict(var="04:A1"), "temp_skin": dict(var=None), "sleep_duration": dict(var="03:V30"),
    "sleep_efficiency": dict(var="03:V34"), "steps": dict(var=None), "active_minutes": dict(var=None),
    "symptom": dict(var=None),
}
_ETIQ_VARIABLE_NONE = {
    "temp_skin": "temperatura cutanea: solo tendencia personal del mismo sensor; no es temperatura corporal ni 'fiebre' (a.4)",
    "steps": "contexto (reposo/actividad): sin liga (01:V29 no esta en las tablas)",
    "active_minutes": "contexto (reposo/actividad): sin liga (01:V29 no esta en las tablas)",
    "symptom": "texto libre: requiere que una persona lo codifique a una variable de sintoma (a.4)",
}


def desde_sensores(sens_df: pd.DataFrame, *, mapa_clase: dict | None = None
                   ) -> tuple[pd.DataFrame, pd.DataFrame, list[str]]:
    """Observaciones desde `sensores.importador.cargar` (formato largo). Mapeo de a.4. Devuelve (obs, rechazadas, avisos)."""
    avisos = list(cal.AVISOS_SIEMPRE)
    if sens_df is None or len(sens_df) == 0:
        return cal.obs_a_df([]), cal.rechazadas_a_df([]), avisos
    cols = ["subject_id", "timestamp", "device", "variable", "value", "unit", "quality", "simulated", "metric_detail", "notes"]
    faltan = [c for c in cols if c not in sens_df.columns]
    if faltan:
        raise ValueError(f"desde_sensores: faltan columnas {faltan}")
    obs: list[dict] = []
    rech: list[dict] = []
    n_a4 = n_v3 = 0
    for r in sens_df[cols].to_dict("records"):
        var_orig = str(r["variable"])
        quality = "" if cal.es_vacio(r["quality"]) else str(r["quality"]).strip()
        rc = dict(subject_id=r["subject_id"], timestamp=r["timestamp"], metric=var_orig, valor=r["value"], quality=quality,
                  simulated=r["simulated"], origen="sensores")
        if cal.es_vacio(r["subject_id"]):
            rech.append(cal.rechazo(**rc, paso="G0", motivo="subject_id vacio"))
            continue
        sim = cal.a_bool(r["simulated"])
        if sim is None:
            rech.append(cal.rechazo(**rc, paso="G0", motivo="`simulated` vacio o invalido (G1)"))
            continue
        ts, why = cal.a_timestamp_naive(r["timestamp"])
        if ts is None:
            rech.append(cal.rechazo(**rc, paso="G0", motivo=f"timestamp {why}"))
            continue
        if var_orig not in _MAPA_SENSOR:
            rech.append(cal.rechazo(**rc, paso="G2", motivo=f"variable {var_orig!r} desconocida para el motor"))
            continue
        m = _MAPA_SENSOR[var_orig]
        var, decide = m["var"], m.get("decide", True)
        clase = clase_dispositivo_sensor(r["device"], var_orig, mapa_clase)
        texto_ctx = " ".join(str(x) for x in (r["notes"], r["metric_detail"]) if not cal.es_vacio(x))
        etq: list[str] = ["zona convertida a UTC" if why else ""]
        contexto: str | None = None
        z_pob = True
        valor_f: float | None = None
        texto: str | None = None
        unidad = "" if cal.es_vacio(r["unit"]) else str(r["unit"]).strip()
        metodo: str | None = None
        sin_dato: str | None = None

        if var_orig == "symptom":
            decide = False
            texto = None if cal.es_vacio(r["value"]) else str(r["value"])
            if texto is None:
                sin_dato = "sin_dato: sintoma sin texto"
        else:
            valor_f = cal.a_float(r["value"])
            if quality.lower().startswith("sin_dato"):
                if valor_f is not None:
                    rech.append(cal.rechazo(**rc, paso="G0", motivo="quality `sin_dato` con valor presente (violacion del contrato)"))
                    continue
                sin_dato = quality if ":" in quality else "sin_dato: " + (quality or "valor ausente")
            elif valor_f is None:
                sin_dato = "sin_dato: valor ausente o no numerico en la fuente" + (f" (quality={quality})" if quality else "")
        # ---- mapeo y contexto
        if var_orig == "heart_rate":
            ctxh, motivo_ctx = _contexto_hr(ts, texto_ctx)
            if ctxh in ("sueno", "reposo"):
                var, contexto = "01:V3", ctxh
                n_v3 += 1
                etq.append(f"01:V3: {motivo_ctx}")
            else:
                var, contexto = "04:A4", ctxh
                n_a4 += 1
                etq.append("FC fuera de reposo/noche: 04:A4 (FC instantanea, sin ligas)")
        elif var_orig in _VAR_HRV:
            d_s = cal.ventana_declarada_s(texto_ctx)
            if not cal.ventana_hrv_comparable(d_s):
                z_pob = False
                etq.append("ventana de HRV no declarada de ~300 s: no comparable con Nunan 2010 (c.1)")
            etq.append("una sola aportacion a 03:V17" + ("" if decide else " (SDNN: solo informativa)"))
        elif var_orig == "bp_diastolic":
            etq.append("diastolica: informativa (la liga 01:V1 usa la sistolica)")
        elif var_orig == "temp_body":
            metodo = "termometro" if clase == "termometro_oral" else None
            if clase == "temp_piel":
                etq.append("temp_body de un dispositivo de piel: se trata como temperatura cutanea (tendencia)")
        elif var_orig == "spo2" and clase in ("spo2_muneca", "reloj_ppg"):
            etq.append("SpO2 de muneca: tiende a sobreestimar en hipoxia; un valor normal N2 no descarta P03")
        if var_orig in _ETIQ_VARIABLE_NONE:
            decide = False
            etq.append(_ETIQ_VARIABLE_NONE[var_orig])
        if var_orig in _VAR_PA and clase in ("cuffless", "manguito_sin_validar"):
            etq.append("PA sin manguito validado: N4 (a.4)")
        if clase == "desconocido":
            etq.append("clase de dispositivo desconocida (pasa `mapa_clase` para declararla)")

        ok, motivo_dom = cal.dominio_valido(var, unidad, valor_f)
        if not ok:
            rech.append(cal.rechazo(**rc, paso="G5", motivo=motivo_dom))
            continue
        if var_orig == "temp_skin":
            nivel, nmot = "N2", "piel de prenda: solo tendencia del mismo sensor (b.3); sin variable de equipo"
        elif var is None:
            nivel, nmot = cal.nivel_para(None, clase, quality)
        else:
            nivel, nmot = cal.nivel_para(var, clase, quality, contexto=contexto)
        obs.append(cal.fila_obs(
            subject_id=str(r["subject_id"]).strip(), timestamp=ts, variable_id=var,
            valor=float("nan") if valor_f is None else float(valor_f), unidad=unidad, clase_dispositivo=clase, nivel=nivel,
            nivel_motivo=nmot, simulated=sim, contexto=contexto, metodo=metodo, decide=decide,
            calidad_buena=cal.calidad_declarada_buena(quality) and sin_dato is None, z_pob_permitido=z_pob,
            sin_dato=sin_dato, origen="sensores", metric=var_orig, quality=quality, run_id=None,
            etiquetas=cal.unir_etiquetas(*etq),
            notas=" | ".join(x for x in (f"dispositivo={r['device']}", cal.recortar(texto, 300) if texto else "",
                                         cal.recortar(r["metric_detail"], 100), cal.recortar(r["notes"], 300)) if x)))
    df_obs, df_rech = cal.obs_a_df(obs), cal.rechazadas_a_df(rech)
    if n_v3:
        avisos.append(f"{n_v3} FC de sensor en noche/reposo declarado -> 01:V3.")
    if n_a4:
        avisos.append(f"{n_a4} FC de sensor fuera de reposo -> 04:A4 (sin ligas).")
    if len(df_obs) and df_obs["simulated"].any():
        avisos.append(f"{int(df_obs['simulated'].sum())} filas con simulated=true: canal SIMULADO (G1).")
    if (df_obs["clase_dispositivo"] == "desconocido").any():
        avisos.append("Hay filas con clase de dispositivo desconocida (N4).")
    if len(df_rech):
        avisos.append(f"{len(df_rech)} filas rechazadas (N0): " + "; ".join(
            f"{p}={n}" for p, n in df_rech["paso"].value_counts().items()) + ".")
    return df_obs, df_rech, _unico(avisos)


# ------------------------------------------------------------------------------------- CSV nativo
def desde_nativo(ruta_o_df: str | Path | pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame, list[str]]:
    """CSV nativo del motor (DISENO.md §3.1): subject_id,timestamp,variable_id,value,unit,device_class,quality,context,
    method,simulated,notes (opcional: `decide`). Aplica G0, G2, G5, G6 y el nivel con `calidad.nivel_para`."""
    avisos = list(cal.AVISOS_SIEMPRE)
    if isinstance(ruta_o_df, pd.DataFrame):
        df = ruta_o_df.copy()
    else:
        p = _resolver(ruta_o_df, RAIZ)
        df = pd.read_csv(p, dtype=str, keep_default_na=False)
    faltan = [c for c in NATIVO_COLUMNAS if c not in df.columns]
    if faltan:
        raise ValueError(f"CSV nativo: faltan columnas {faltan}")
    if len(df) == 0:
        return cal.obs_a_df([]), cal.rechazadas_a_df([]), avisos
    regs = df.to_dict("records")
    # dias con bandera de ritmo = 1 (para N2 de la FC de ECG en el mismo dia)
    dias_irregular: set[tuple[str, str]] = set()
    for r in regs:
        if str(r.get("variable_id")) == "01:V31" and cal.a_float(r.get("value")) == 1.0:
            ts, _ = cal.a_timestamp_naive(r.get("timestamp"))
            if ts is not None:
                dias_irregular.add((str(r["subject_id"]).strip(), ts.strftime("%Y-%m-%d")))

    obs: list[dict] = []
    rech: list[dict] = []
    contadores = {"clase_desconocida": 0, "contexto_invalido": 0, "metodo_invalido": 0, "reasignadas_a4": 0,
                  "metodo_quitado": 0}
    for r in regs:
        quality = "" if cal.es_vacio(r["quality"]) else str(r["quality"]).strip()
        var = None if cal.es_vacio(r["variable_id"]) else str(r["variable_id"]).strip()
        rc = dict(subject_id=r["subject_id"], timestamp=r["timestamp"], metric=var or "", valor=r["value"], quality=quality,
                  simulated=r["simulated"], origen="nativo")
        if "prueba_de_carga" in quality:
            rech.append(cal.rechazo(**rc, paso="G0", motivo="prueba_de_carga: nunca es dato"))
            continue
        if cal.es_vacio(r["subject_id"]):
            rech.append(cal.rechazo(**rc, paso="G0", motivo="subject_id vacio"))
            continue
        sid = str(r["subject_id"]).strip()
        sim = cal.a_bool(r["simulated"])
        if sim is None:
            rech.append(cal.rechazo(**rc, paso="G0", motivo="`simulated` vacio o invalido (G1 exige true/false)"))
            continue
        ts, why = cal.a_timestamp_naive(r["timestamp"])
        if ts is None:
            rech.append(cal.rechazo(**rc, paso="G0", motivo=f"timestamp {why}"))
            continue
        es_sd = quality.lower().startswith("sin_dato")
        vacio = cal.es_vacio(r["value"])
        if es_sd != vacio:
            rech.append(cal.rechazo(**rc, paso="G0", motivo=(
                "violacion del contrato: `sin_dato` con valor presente (un 0 con sin_dato no es valido)" if es_sd
                else "violacion del contrato: `value` vacio sin quality `sin_dato: <motivo>`")))
            continue
        valor_f = None if vacio else cal.a_float(r["value"])
        if not vacio and valor_f is None:
            rech.append(cal.rechazo(**rc, paso="G5", motivo="valor no numerico"))
            continue
        etq: list[str] = ["zona convertida a UTC" if why else ""]
        if var in PUNTEROS_FUSIONADOS:
            etq.append(f"puntero fusionado {var}: sin variable de equipo (G2)")
            var = None
        clase = "desconocido" if cal.es_vacio(r["device_class"]) else str(r["device_class"]).strip()
        if clase not in CLASES_DISPOSITIVO:
            contadores["clase_desconocida"] += 1
            etq.append(f"device_class {clase!r} fuera del vocabulario: desconocido")
            clase = "desconocido"
        contexto = None if cal.es_vacio(r["context"]) else str(r["context"]).strip().lower()
        if contexto is not None and contexto not in CONTEXTOS:
            contadores["contexto_invalido"] += 1
            etq.append(f"context {contexto!r} fuera del vocabulario: ignorado")
            contexto = None
        metodo = None if cal.es_vacio(r["method"]) else str(r["method"]).strip().lower()
        if metodo is not None and metodo not in METODOS:
            contadores["metodo_invalido"] += 1
            etq.append(f"method {metodo!r} fuera del vocabulario: ignorado")
            metodo = None
        if metodo == "lectura_humana" and clase in ("ecg_adaptador", "modelo_eco"):
            contadores["metodo_quitado"] += 1
            etq.append("method lectura_humana no aplica a la salida de un adaptador/modelo: se quita (no hereda el LR)")
            metodo = None
        # ---- G6 contexto: 01:V3 solo en reposo o sueno
        if var == "01:V3" and contexto not in ("reposo", "sueno"):
            contadores["reasignadas_a4"] += 1
            var = "04:A4"
            etq.append("reasignada a 04:A4: la FC no esta declarada en reposo/sueno (G6)")
        unidad = "" if cal.es_vacio(r["unit"]) else str(r["unit"]).strip()
        ok, motivo_dom = cal.dominio_valido(var, unidad, valor_f)
        if not ok:
            rech.append(cal.rechazo(**rc, paso="G5", motivo=motivo_dom))
            continue
        irregular = (sid, ts.strftime("%Y-%m-%d")) in dias_irregular
        nivel, nmot = cal.nivel_para(var, clase, quality, contexto=contexto, ritmo_irregular=irregular)
        if nivel == "N0":
            rech.append(cal.rechazo(**rc, paso="G0", motivo=nmot))
            continue
        decide = True
        if "decide" in df.columns and cal.a_bool(r.get("decide")) is not None:
            decide = bool(cal.a_bool(r.get("decide")))
        z_pob = True
        if var == "03:V17":
            z_pob = cal.ventana_hrv_comparable(cal.ventana_declarada_s(r["notes"]))
            if not z_pob:
                etq.append("ventana de HRV no declarada de ~300 s: no comparable con Nunan 2010 (c.1)")
        if var is None:
            decide = False
        obs.append(cal.fila_obs(
            subject_id=sid, timestamp=ts, variable_id=var, valor=float("nan") if valor_f is None else float(valor_f),
            unidad=unidad, clase_dispositivo=clase, nivel=nivel, nivel_motivo=nmot, simulated=sim, contexto=contexto,
            metodo=metodo, decide=decide, calidad_buena=cal.calidad_declarada_buena(quality) and not es_sd,
            z_pob_permitido=z_pob, sin_dato=quality if es_sd else None, origen="nativo", metric=var or "", quality=quality,
            run_id=None, etiquetas=cal.unir_etiquetas(*etq), notas=cal.recortar(r["notes"], 300)))
    df_obs, df_rech = cal.obs_a_df(obs), cal.rechazadas_a_df(rech)
    for k, txt in (("clase_desconocida", "device_class fuera del vocabulario -> desconocido"),
                   ("contexto_invalido", "context fuera del vocabulario -> ignorado"),
                   ("metodo_invalido", "method fuera del vocabulario -> ignorado"),
                   ("metodo_quitado", "method lectura_humana quitado a salidas de adaptador/modelo"),
                   ("reasignadas_a4", "FC (01:V3) sin contexto reposo/sueno -> 04:A4 (G6)")):
        if contadores[k]:
            avisos.append(f"{contadores[k]} filas: {txt}.")
    if len(df_obs) and df_obs["simulated"].any():
        avisos.append(f"{int(df_obs['simulated'].sum())} filas con simulated=true: canal SIMULADO (G1).")
    if len(df_rech):
        avisos.append(f"{len(df_rech)} filas rechazadas (N0): " + "; ".join(
            f"{p}={n}" for p, n in df_rech["paso"].value_counts().items()) + ".")
    return df_obs, df_rech, avisos


# ------------------------------------------------------------------------------------- simulado
def cargar_simulado(dir_simulado: str | Path | None = None
                    ) -> tuple[pd.DataFrame, pd.DataFrame, list[str], dict]:
    """Lee `datos/simulado/tripulacion_simulada.csv` + `.json`. No los genera: si faltan, devuelve vacio con aviso.
    `meta` = {"mision", "perfiles", "escenarios", ...}."""
    d = _resolver(dir_simulado, SIMULADO_DIR_DEFECTO)
    csv_p, json_p = d / f"{ARCHIVO_SIMULADO}.csv", d / f"{ARCHIVO_SIMULADO}.json"
    meta_vacia = {"mision": {}, "perfiles": {}, "escenarios": []}
    if not csv_p.exists():
        return (cal.obs_a_df([]), cal.rechazadas_a_df([]),
                [f"dataset simulado ausente ({_rel(csv_p)}): no se genera solo; ejecuta `python -m motor.simulador`."],
                meta_vacia)
    obs, rech, avisos = desde_nativo(csv_p)
    avisos = list(avisos)
    meta = dict(meta_vacia)
    if json_p.exists():
        try:
            meta.update(json.loads(json_p.read_text(encoding="utf-8")))
        except (OSError, ValueError) as e:
            avisos.append(f"{_rel(json_p)} ilegible ({type(e).__name__}): sin mision ni perfiles.")
    else:
        avisos.append(f"falta {_rel(json_p)}: sin mision, perfiles ni escenarios.")
    if len(obs) and not obs["simulated"].all():
        avisos.append("ATENCION: el dataset simulado contiene filas con simulated=false (no deberia).")
    return obs, rech, _unico(avisos), meta


# ------------------------------------------------------------------------------------- reunir
def reunir(raw_dir: str | Path | None = None, sens_df: pd.DataFrame | None = None, simulado: bool | str | Path = True,
           ecg_en_reposo: bool | dict = False) -> dict:
    """Reune las entradas en este orden: outputs/raw, sensores, simulado. Devuelve
    {obs, rechazadas, avisos, meta_simulado, personas}. Nunca mezcla personas."""
    avisos: list[str] = []
    obs_l: list[pd.DataFrame] = []
    rech_l: list[pd.DataFrame] = []

    filas, av = leer_outputs_raw(raw_dir)
    avisos += av
    if len(filas):
        o, r, av = cal.puerta(filas, ecg_en_reposo=ecg_en_reposo, origen="outputs_raw")
        obs_l.append(o), rech_l.append(r)
        avisos += av
    if sens_df is not None and len(sens_df):
        o, r, av = desde_sensores(sens_df)
        obs_l.append(o), rech_l.append(r)
        avisos += av
    meta: dict = {"mision": {}, "perfiles": {}, "escenarios": []}
    if simulado:
        o, r, av, meta = cargar_simulado(None if simulado is True else simulado)
        obs_l.append(o), rech_l.append(r)
        avisos += av

    obs_l = [o for o in obs_l if len(o)]
    rech_l = [r for r in rech_l if len(r)]
    obs = cal.obs_a_df([]) if not obs_l else cal.obs_a_df(pd.concat(obs_l, ignore_index=True).to_dict("records"))
    rech = cal.rechazadas_a_df([]) if not rech_l else pd.concat(rech_l, ignore_index=True)[cal.RECHAZADAS_COLUMNAS]

    personas: dict[str, dict] = {}
    for sid, g in obs.groupby("subject_id", sort=True):
        n_sim = int(g["simulated"].sum())
        mixta = 0 < n_sim < len(g)
        personas[str(sid)] = {"simulated": n_sim == len(g), "origenes": sorted(g["origen"].unique().tolist()),
                              "n_obs": int(len(g)), "mixta": bool(mixta)}
        if mixta:
            avisos.append(f"ATENCION: {sid} tiene filas simuladas y reales mezcladas ({n_sim} de {len(g)} simuladas); "
                          "marcada mixta=True. El canal real no debe usar sus filas simuladas (G1).")
    return {"obs": obs, "rechazadas": rech, "avisos": _unico(avisos), "meta_simulado": meta, "personas": personas}


# ------------------------------------------------------------------------------------- eco (FEVI)
METRICA_FEVI = {"echonet_dynamic": "EF", "panecho": "EF", "echoclip": "ejection_fraction_zero_shot",
                "echoprime": "ejection_fraction"}


def desde_eco(feve: float | None, *, subject_id: str, timestamp: Any, modelo: str, simulado: bool,
              quality: str | None = None, checkpoint: str | None = None, version: str | None = None,
              archivo_origen: str | None = None, run_id: str | None = None,
              study_id: str | None = None) -> tuple[pd.DataFrame, pd.DataFrame, list[str]]:
    """Una FEVI (%) de un modelo de eco -> una fila del contrato de 14 columnas -> `calidad.puerta` (la misma de outputs/raw).

    Es N4 (modelo de investigacion, no diagnostico). `simulado` es obligatorio. Calidad vacia = `sin_calidad_declarada`
    (no cuenta como buena). `feve=None` -> `sin_dato`. Devuelve (obs, rechazadas, avisos)."""
    if not isinstance(simulado, bool):
        raise ValueError("`simulado` debe ser bool (G1): lo simulado se marca SIMULADO")
    if modelo not in cal.MODELOS_ECO or modelo not in METRICA_FEVI:
        raise ValueError(f"modelo {modelo!r} no entrega FEVI; admitidos: {sorted(METRICA_FEVI)}")
    q = (quality or "").strip()
    if feve is None or (isinstance(feve, float) and math.isnan(feve)):
        valor, q = "", "sin_dato: el adaptador no dio FEVI"
    else:
        valor = float(feve)
        q = q or "sin_calidad_declarada"
    notes = "; ".join([
        f"modelo={modelo}", f"version={version or 'no declarada'}", f"checkpoint={checkpoint or 'no declarado'}",
        f"archivo_origen={archivo_origen or 'no declarado'}", f"simulado={'si' if simulado else 'no'}",
        "modelo de investigacion, no diagnostico"])
    fila = {"subject_id": subject_id, "study_id": study_id or "", "timestamp": timestamp,
            "source": "modelo_preentrenado", "model": modelo, "metric": METRICA_FEVI[modelo], "value": valor,
            "unit": "%", "quality": q, "simulated": simulado, "tipo": "medicion", "run_id": run_id or "",
            "input_file": archivo_origen or "", "notes": notes}
    df = pd.DataFrame([fila], columns=CONTRATO_COLUMNAS)
    df["value"] = df["value"].astype(object)
    return cal.puerta(df, origen="eco")
