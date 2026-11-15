"""Puente con la base de la nave (eva.db, la de Julio). PROVISIONAL; nada de lo que sale de aquí es un diagnóstico.

- Ruta: variable de entorno `EVA_DB` (absoluta o relativa al cwd). Sin ella, o con un archivo inexistente: «no hay BD».
- Python NO crea el esquema (dueño: Node, `npm run migrar`). Si faltan tablas se trata como «no hay BD» para
  lo que falte, con un aviso legible. Solo biblioteca estándar (`sqlite3`, `timeout=5`: la nave escribe a la vez).
- Lectura de muestras (`leer_muestras`) -> DataFrame nativo (`calidad.NATIVO_COLUMNAS`) para `entradas.desde_nativo`
  (la puerta de calidad existente; aquí no se duplica). Mapeo CONSERVADOR:
    * device_class = 'desconocido' siempre: la BD guarda dispositivos con `tipo` (wrist, chest, ...) pero no el
      sensor ni su validación, y no hay forma honesta de saber si es ECG, PPG, etc. 'desconocido' es la clase que el
      motor trata con menor confianza (N3b, vigencia 48 h, sin actualizar la base si la calidad no es buena).
    * quality = '' (calidad NO declarada buena): la BD no trae un campo equivalente a «buena». Las muestras con
      `calidad.contacto = false` se omiten (igual que `MUESTRA_VALIDA` de Julio) y se cuentan en los avisos;
      las de valor NULL también se omiten (no hay sin_dato honesto).
    * context = '' (el `entorno` de la BD no es reposo/sueño/actividad; la FC sin contexto de reposo pasa a 04:A4, G6).
    * method = `metodo` solo si está en el vocabulario del motor; si no, vacío.
    * simulated = false: la BD no distingue el simulador de hardware (`npm run sim`). Si los datos vienen de él,
      también son SIMULADOS aunque aquí figuren como reales (el operador puede declararlo con `origen_simulador=True` /
      `--origen-simulador`: se evalúa igual pero se guarda con canal SIMULADO). notes = 'origen=eva.db; ...'.
    * EXCEPCION: una muestra con procedencia 'modelo_eco' cuyo JSON de calidad trae clase == 'modelo_eco' (la escribe
      `guardar_muestra_eco`) se lee con device_class 'modelo_eco', quality = el del JSON, simulated = `simulado` del JSON
      y modelo/checkpoint/archivo en notes. Sigue siendo N4 (modelo de investigación, no diagnóstico).
- Basales (`basales`): se leen y se exponen en el resultado (`basales`), pero NO se pasan al motor: el motor construye la
  base personal desde los puntos prevuelo (autocalibración) y no tiene un punto de entrada para una media impuesta; forzarla
  cambiaría la semántica.
- `detalle.ligas` (en `evaluaciones`) lleva el desglose por variable (campos de `CAMPOS_LIGA`; aporte = peso × activación).
- `detalle.referencias` lleva el valor normal (referencia) por variable: poblacional si existe, si no base personal prevuelo (`motor.referencias`).
- `mision`: fecha de lanzamiento = inicio de la primera fase no-'tierra' de `fases`, solo si antes hay una fase 'tierra'.
"""
from __future__ import annotations

import argparse
import json
import os
import sqlite3
import sys
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

from . import calidad as cal
from . import parametros

ENV = "EVA_DB"
TABLAS_EVALUACION = ("tripulantes", "muestras", "evaluaciones")
COLORES = ("VERDE", "AMARILLO", "ROJO", "GRIS")


def ruta_eva_db() -> Path | None:
    """Ruta de EVA_DB si está definida y el archivo existe; si no, None (no hay BD)."""
    e = os.environ.get(ENV)
    if not e or not e.strip():
        return None
    p = Path(e.strip())
    return p if p.is_file() else None


def conectar(ruta=None) -> sqlite3.Connection | None:
    """Conexión a la BD (`ruta` o EVA_DB) o None si no hay. Autocommit; las escrituras abren su transacción."""
    r = Path(ruta) if ruta is not None else ruta_eva_db()
    if r is None or not r.is_file():
        return None
    con = sqlite3.connect(str(r), timeout=5, isolation_level=None)
    con.row_factory = sqlite3.Row
    return con


@contextmanager
def _transaccion(con):
    con.execute("BEGIN IMMEDIATE")
    try:
        yield con
        con.execute("COMMIT")
    except BaseException:
        con.execute("ROLLBACK")
        raise


def tablas(con) -> set[str]:
    return {r[0] for r in con.execute("SELECT name FROM sqlite_master WHERE type='table'")}


def faltan(con, necesarias) -> list[str]:
    t = tablas(con)
    return [n for n in necesarias if n not in t]


def aviso_faltan(f: list[str]) -> str:
    return (f"la BD no tiene las tablas {', '.join(f)}: ejecute `npm run migrar` en Planeacion/Julio/backend "
            "(Python no crea el esquema); se trata como «no hay BD» para eso.")


def tabla_pesos_usuario_disponible() -> bool:
    """True si hay BD (EVA_DB) con la tabla pesos_usuario."""
    con = conectar()
    if con is None:
        return False
    try:
        return not faltan(con, ("pesos_usuario",))
    except sqlite3.Error:
        return False
    finally:
        con.close()


def origen_overrides() -> str:
    """Texto para la UI: dónde se guardan los cambios del usuario."""
    r = ruta_eva_db()
    if r is not None and tabla_pesos_usuario_disponible():
        return f"eva.db: {r}"
    return "overrides.json"


def firma_bd() -> tuple | None:
    """Cambia cuando la BD cambia (mtime del archivo y del WAL); para invalidar cachés de la UI."""
    r = ruta_eva_db()
    if r is None:
        return None
    out = []
    for p in (r, Path(str(r) + "-wal")):
        try:
            out.append(p.stat().st_mtime_ns)
        except OSError:
            out.append(None)
    return tuple(out)


# ------------------------------------------------------------------------------------------- lectura
def leer_tripulantes(con) -> pd.DataFrame:
    return pd.read_sql_query("SELECT id, nombre, rol, sexo, edad, peso_kg, altura_m, sangre FROM tripulantes ORDER BY id", con)


def leer_basales(con) -> pd.DataFrame:
    """Basales por tripulante (tripulante, variable, valor). Solo lectura; el motor no las usa (ver docstring del módulo)."""
    return pd.read_sql_query("SELECT tripulante, variable, valor FROM basales ORDER BY tripulante, variable", con)


def leer_muestras(con, avisos: list | None = None) -> pd.DataFrame:
    """Muestras en formato nativo del motor (mapeo conservador en el docstring del módulo)."""
    avisos = avisos if avisos is not None else []
    filas = con.execute(
        "SELECT m.id, m.tripulante, m.variable, m.valor, m.unidad, m.procedencia, m.calidad, m.metodo, m.t_scet, "
        "d.clave AS disp FROM muestras m LEFT JOIN dispositivos d ON d.id = m.dispositivo ORDER BY m.t_scet, m.id"
        if "dispositivos" in tablas(con) else
        "SELECT m.id, m.tripulante, m.variable, m.valor, m.unidad, m.procedencia, m.calidad, m.metodo, m.t_scet, "
        "NULL AS disp FROM muestras m ORDER BY m.t_scet, m.id").fetchall()
    out, sin_contacto, sin_valor, calidad_ilegible = [], 0, 0, 0
    for r in filas:
        if r["valor"] is None:
            sin_valor += 1
            continue
        q = None
        if r["calidad"]:
            try:
                q = json.loads(r["calidad"])
            except ValueError:
                calidad_ilegible += 1
        if isinstance(q, dict) and q.get("contacto") is False:
            sin_contacto += 1
            continue
        metodo = str(r["metodo"] or "").strip().lower()
        notas = f"origen=eva.db; procedencia={r['procedencia']}; muestra_id={r['id']}"
        if r["disp"]:
            notas += f"; dispositivo={r['disp']}"
        clase, calidad, sim = "desconocido", "", "false"
        if isinstance(q, dict) and q.get("clase") == "modelo_eco":
            clase, calidad = "modelo_eco", str(q.get("quality") or "")
            sim = "true" if q.get("simulado") is True else "false"
            notas += (f"; modelo={q.get('modelo')}; checkpoint={q.get('checkpoint')}; archivo={q.get('archivo_origen')}"
                      f"; modelo de investigacion, no diagnostico")
        elif isinstance(q, dict) and q.get("clase") == "ecg_adaptador" and r["procedencia"] == "modelo_ecg":
            clase, calidad = "ecg_adaptador", str(q.get("quality") or "")
            sim = "true" if q.get("simulado") is True else "false"
            if q.get("ventana_s"):                           # primero: ventana_declarada_s lee la primera coincidencia
                notas += f"; ventana={float(q['ventana_s']):g} s"
            notas += (f"; modelo={q.get('modelo')}; run={q.get('run_id')}; archivo={q.get('archivo_origen')}"
                      f"; algoritmo de senal experimental, no diagnostico")
        out.append({
            "subject_id": r["tripulante"], "timestamp": r["t_scet"], "variable_id": r["variable"], "value": r["valor"],
            "unit": r["unidad"] or "", "device_class": clase, "quality": calidad, "context": "",
            "method": metodo if metodo in cal.METODOS else "", "simulated": sim, "notes": notas})
    if sin_contacto:
        avisos.append(f"{sin_contacto} muestras de eva.db sin contacto omitidas.")
    if sin_valor:
        avisos.append(f"{sin_valor} muestras de eva.db sin valor omitidas.")
    if calidad_ilegible:
        avisos.append(f"{calidad_ilegible} muestras con calidad JSON ilegible (se usaron sin ella).")
    return pd.DataFrame(out, columns=cal.NATIVO_COLUMNAS)


def guardar_muestra_eco(feve, *, subject_id, timestamp, modelo, simulado, quality=None, checkpoint=None, version=None,
                        archivo_origen=None, run_id=None, ruta=None) -> dict:
    """Guarda una FEVI (%) de un modelo de eco en `muestras` (variable 01:V18, procedencia 'modelo_eco'). Idempotente:
    misma (tripulante, variable, t_scet, procedencia) no se vuelve a insertar. No crea esquema ni lanza si falta la tabla.
    Es un dato de modelo de investigación (N4), no un diagnóstico; `simulado` queda en el JSON de calidad."""
    if not isinstance(simulado, bool):
        raise ValueError("`simulado` debe ser bool")
    from .entradas import METRICA_FEVI
    if modelo not in METRICA_FEVI:
        raise ValueError(f"modelo {modelo!r} no entrega FEVI; admitidos: {sorted(METRICA_FEVI)}")
    if feve is None or (isinstance(feve, float) and feve != feve):
        return {"guardada": False, "aviso": "sin dato: el adaptador no dio FEVI; no se inserta nada"}
    con = conectar(ruta)
    if con is None:
        return {"guardada": False, "error": "no hay BD (EVA_DB sin definir o archivo inexistente)"}
    try:
        f = faltan(con, ("muestras",))
        if f:
            return {"guardada": False, "error": aviso_faltan(f)}
        ts = pd.Timestamp(timestamp)
        ts = ts.tz_localize("UTC") if ts.tzinfo is None else ts.tz_convert("UTC")
        t_scet = ts.strftime("%Y-%m-%dT%H:%M:%SZ")
        ahora = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        calidad = json.dumps({"clase": "modelo_eco", "quality": (quality or "").strip() or "sin_calidad_declarada",
                              "modelo": modelo, "version": version, "checkpoint": checkpoint,
                              "archivo_origen": archivo_origen, "run_id": run_id, "simulado": simulado, "nivel": "N4",
                              "aviso": "modelo de investigación, no diagnóstico"}, ensure_ascii=False)
        with _transaccion(con):
            ya = con.execute("SELECT id FROM muestras WHERE tripulante=? AND variable='01:V18' AND t_scet=? "
                             "AND procedencia='modelo_eco'", (str(subject_id), t_scet)).fetchone()
            if ya:
                return {"guardada": False, "existente": True, "id": ya["id"]}
            cur = con.execute(
                "INSERT INTO muestras (tripulante, variable, valor, unidad, procedencia, calidad, t_scet, t_recibida, "
                "dispositivo, seq) VALUES (?,?,?,?,?,?,?,?,NULL,NULL)",
                (str(subject_id), "01:V18", float(feve), "%", "modelo_eco", calidad, t_scet, ahora))
            return {"guardada": True, "existente": False, "id": cur.lastrowid, "t_scet": t_scet}
    except sqlite3.Error as e:
        return {"guardada": False, "error": f"{type(e).__name__}: {e}"}
    finally:
        con.close()


def guardar_muestras_ecg(filas, *, subject_id, timestamp, simulado, archivo_origen=None, run_id=None, ruta=None) -> dict:
    """Guarda en `muestras` (procedencia 'modelo_ecg') las métricas ECG ya pasadas por la puerta de calidad. `filas`: lista
    de dicts {variable_id, valor, unidad, metrica, quality, nivel, experimental, con_liga, ventana_s}. Una transacción;
    idempotente por (tripulante, variable, t_scet, procedencia). No crea esquema ni lanza si falta la tabla.
    Devuelve {"resultados": [{guardada, existente, id}|{guardada:False, error}...]} alineado con `filas`, o {"error"}."""
    if not isinstance(simulado, bool):
        raise ValueError("`simulado` debe ser bool")
    con = conectar(ruta)
    if con is None:
        return {"error": "no hay BD (EVA_DB sin definir o archivo inexistente)"}
    try:
        f = faltan(con, ("muestras",))
        if f:
            return {"error": aviso_faltan(f)}
        ts = pd.Timestamp(timestamp)
        ts = ts.tz_localize("UTC") if ts.tzinfo is None else ts.tz_convert("UTC")
        t_scet = ts.strftime("%Y-%m-%dT%H:%M:%SZ")
        ahora = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        res = []
        with _transaccion(con):
            for fl in filas:
                v = fl.get("valor")
                if not fl.get("variable_id") or v is None or v != v:
                    res.append({"guardada": False, "error": "fila sin variable o sin valor"})
                    continue
                ya = con.execute("SELECT id FROM muestras WHERE tripulante=? AND variable=? AND t_scet=? "
                                 "AND procedencia='modelo_ecg'", (str(subject_id), fl["variable_id"], t_scet)).fetchone()
                if ya:
                    res.append({"guardada": False, "existente": True, "id": ya["id"]})
                    continue
                q = {"clase": "ecg_adaptador", "quality": (fl.get("quality") or "").strip() or "sin_calidad_declarada",
                     "modelo": "ecg", "metrica": fl.get("metrica"), "checkpoint": None, "archivo_origen": archivo_origen,
                     "run_id": run_id, "simulado": simulado, "nivel": fl.get("nivel"),
                     "experimental": bool(fl.get("experimental")), "con_liga": bool(fl.get("con_liga")),
                     "aviso": "algoritmo de señal experimental, no diagnóstico"}
                if fl.get("ventana_s"):
                    q["ventana_s"] = float(fl["ventana_s"])
                cur = con.execute(
                    "INSERT INTO muestras (tripulante, variable, valor, unidad, procedencia, calidad, t_scet, t_recibida, "
                    "dispositivo, seq) VALUES (?,?,?,?,?,?,?,?,NULL,NULL)",
                    (str(subject_id), fl["variable_id"], float(v), fl.get("unidad") or "", "modelo_ecg",
                     json.dumps(q, ensure_ascii=False), t_scet, ahora))
                res.append({"guardada": True, "existente": False, "id": cur.lastrowid, "t_scet": t_scet})
        return {"resultados": res}
    except sqlite3.Error as e:
        return {"error": f"{type(e).__name__}: {e}"}
    finally:
        con.close()


def leer_mision(con) -> dict:
    """{sid: {"lanzamiento": 'YYYY-MM-DD'}} si `fases` tiene una fase 'tierra' y luego una no-'tierra'; si no, {}."""
    if faltan(con, ("fases", "tripulantes")):
        return {}
    fs = con.execute("SELECT desde, entorno FROM fases ORDER BY desde").fetchall()
    primera_vuelo = next((f["desde"] for f in fs if f["entorno"] != "tierra"), None)
    if primera_vuelo is None or not any(f["entorno"] == "tierra" and f["desde"] < primera_vuelo for f in fs):
        return {}
    lanz = str(primera_vuelo)[:10]
    return {r["id"]: {"lanzamiento": lanz} for r in con.execute("SELECT id FROM tripulantes")}


def leer_perfiles(tr: pd.DataFrame) -> dict:
    """{sid: {"edad": .., "sexo": 'M'|'F'}} solo con lo que la BD tiene (sin inventar)."""
    out = {}
    for r in tr.itertuples():
        pf = {}
        if r.edad is not None and r.edad == r.edad:
            pf["edad"] = float(r.edad)
        s = str(r.sexo or "").strip().upper()[:1]
        if s in ("M", "F"):
            pf["sexo"] = s
        if pf:
            out[str(r.id)] = pf
    return out


def reunir(ruta=None) -> dict:
    """Todo lo de la BD listo para el motor: {hay, ruta, avisos, nativo, tripulantes, basales, perfiles, mision}."""
    avisos: list[str] = []
    con = conectar(ruta)
    if con is None:
        return {"hay": False, "ruta": None, "avisos": ["no hay eva.db (defina EVA_DB)."], "nativo": pd.DataFrame(columns=cal.NATIVO_COLUMNAS),
                "tripulantes": pd.DataFrame(), "basales": pd.DataFrame(), "perfiles": {}, "mision": {}}
    try:
        f = faltan(con, ("tripulantes", "muestras"))
        if f:
            return {"hay": False, "ruta": None, "avisos": [aviso_faltan(f)], "nativo": pd.DataFrame(columns=cal.NATIVO_COLUMNAS),
                    "tripulantes": pd.DataFrame(), "basales": pd.DataFrame(), "perfiles": {}, "mision": {}}
        tr = leer_tripulantes(con)
        bas = leer_basales(con) if not faltan(con, ("basales",)) else pd.DataFrame(columns=["tripulante", "variable", "valor"])
        nat = leer_muestras(con, avisos)
        if len(bas):
            avisos.append(f"{len(bas)} basales leídas de eva.db; el motor no las usa (construye la base personal desde prevuelo).")
        return {"hay": True, "ruta": str(con.execute("PRAGMA database_list").fetchone()["file"]), "avisos": avisos,
                "nativo": nat, "tripulantes": tr, "basales": bas, "perfiles": leer_perfiles(tr), "mision": leer_mision(con)}
    finally:
        con.close()


# ------------------------------------------------------------------------------------------- pesos_usuario
def leer_pesos_usuario(con) -> dict:
    """Misma estructura que overrides.json: {"ligas": {"P07|03:V82": {...}}, "umbrales": {...}}."""
    d = {"ligas": {}, "umbrales": {}}
    for r in con.execute("SELECT * FROM pesos_usuario ORDER BY clave"):
        if r["tipo"] == "liga":
            e = {k: r[k] for k in ("peso", "prior_de") if r[k] is not None}
            d["ligas"][f"{r['padecimiento_id']}|{r['variable_id']}"] = {**e, "modificado": r["modificado"]}
        else:
            d["umbrales"][r["nombre"]] = {"valor": r["valor"], "modificado": r["modificado"]}
    return d


def escribir_pesos_usuario(con, d: dict) -> None:
    """Reemplaza el contenido de pesos_usuario por `d` en una sola transacción."""
    with _transaccion(con):
        con.execute("DELETE FROM pesos_usuario")
        for k, e in d.get("ligas", {}).items():
            pid, vid = k.split("|", 1)
            con.execute("INSERT INTO pesos_usuario (clave, tipo, padecimiento_id, variable_id, peso, prior_de, modificado_por_usuario, "
                        "modificado) VALUES (?,?,?,?,?,?,1,?)",
                        (f"liga|{k}", "liga", pid, vid, e.get("peso"), e.get("prior_de"), e.get("modificado") or ""))
        for n, e in d.get("umbrales", {}).items():
            con.execute("INSERT INTO pesos_usuario (clave, tipo, nombre, valor, modificado_por_usuario, modificado) "
                        "VALUES (?,?,?,?,1,?)", (f"umbral|{n}", "umbral", n, e.get("valor"), e.get("modificado") or ""))


def vaciar_pesos_usuario(con) -> bool:
    with _transaccion(con):
        return con.execute("DELETE FROM pesos_usuario").rowcount > 0


# ------------------------------------------------------------------------------------------- evaluación
CAMPOS_LIGA = ("variable_id", "variable", "valor", "unidad", "fecha_dato", "peso", "modificado_por_usuario",
               "nivel_evidencia", "fuente", "activacion", "aporte", "cuenta_en_T", "ausencia", "motivo_ausencia")


def _detalle(item: dict, pers: dict, canal: str) -> dict:
    d = {k: item.get(k) for k in ("padecimiento", "motivo", "T", "T_de", "T_inf", "T_max", "cobertura", "etiquetas", "condiciones")}
    d["ligas"] = [{k: lg.get(k) for k in CAMPOS_LIGA} for lg in (item.get("ligas") or [])]
    d.update({"fase": pers.get("fase"), "fecha_evaluacion": pers.get("fecha_evaluacion"), "provisional": True,
              "simulated": canal == "SIMULADO", "aviso": parametros.AVISO})
    from . import referencias
    d["referencias"] = referencias.referencias_detalle(item, pers, canal)
    return d


def evaluar_eva_db(ruta=None, guardar=True, simulado=False, ruta_estado=None, origen_simulador=False) -> dict:
    """Evalúa y, si `guardar`, escribe una fila por (tripulante, padecimiento) en `evaluaciones`.

    Canal real: datos de eva.db (filas simulated=false). `simulado=True`: tripulación sintética del prototipo
    (`entradas.cargar_simulado`), guardada con canal='SIMULADO'. El estado de calibración solo se escribe a disco si
    se pasa `ruta_estado` (por defecto no se toca `datos/estado/`).
    `origen_simulador=True` (sin `simulado`): los datos de eva.db vienen del simulador de hardware; se evalúan exactamente
    como el canal real pero se guardan con canal SIMULADO.
    Devuelve {"hay", "avisos", "resultado", "filas_escritas", "basales", "ruta"}."""
    from . import entradas, evaluacion
    info = reunir(ruta)
    out = {"hay": info["hay"], "ruta": info["ruta"], "avisos": list(info["avisos"]), "resultado": None, "filas_escritas": 0,
           "basales": info["basales"]}
    if simulado:
        obs, rech, av, meta = entradas.cargar_simulado()
        out["avisos"] += av
        mision, perfiles, canal = meta.get("mision"), meta.get("perfiles"), "simulado"
    else:
        if not info["hay"]:
            return out
        if not len(info["nativo"]):
            out["avisos"].append("eva.db no tiene muestras utilizables: no hay nada que evaluar.")
            return out
        obs, rech, av = entradas.desde_nativo(info["nativo"])
        out["avisos"] += av
        mision, perfiles, canal = info["mision"], info["perfiles"], "real"
        if origen_simulador:
            out["avisos"].append("datos de eva.db declarados del simulador: se guardan con canal SIMULADO")
    if not len(obs):
        return out
    res = evaluacion.evaluar(obs, mision=mision or None, perfiles=perfiles or None, canal=canal, rechazadas=rech,
                             ruta_estado=ruta_estado, guardar=ruta_estado is not None)
    out["resultado"] = res
    canal_guardado = "SIMULADO" if (simulado or origen_simulador) else "real"
    out["canal_guardado"] = canal_guardado
    if guardar:
        if not info["hay"]:
            out["avisos"].append("no hay eva.db con tablas de salud: la evaluación no se guardó.")
            return out
        out["filas_escritas"] = guardar_evaluaciones(res, ruta, canal_guardado)
    return out


def guardar_evaluaciones(res: dict, ruta=None, canal="real") -> int:
    """Escribe el resultado de `evaluar` en `evaluaciones` (una transacción). Devuelve las filas escritas."""
    if canal not in ("real", "SIMULADO"):
        raise ValueError("canal debe ser 'real' o 'SIMULADO'")
    con = conectar(ruta)
    if con is None:
        return 0
    try:
        if faltan(con, ("evaluaciones",)):
            return 0
        hora = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
        filas = []
        for sid, pers in res.get("personas", {}).items():
            for it in pers["padecimientos"]:
                if it["color"] not in COLORES:
                    continue
                filas.append((sid, it["padecimiento_id"], it["color"], hora, canal,
                              json.dumps(_detalle(it, pers, canal), ensure_ascii=False, default=str)))
        with _transaccion(con):
            con.executemany("INSERT INTO evaluaciones (tripulante, padecimiento_id, color, hora, canal, detalle) "
                            "VALUES (?,?,?,?,?,?)", filas)
        return len(filas)
    finally:
        con.close()


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(prog="python -m motor.evadb", description="Puente con eva.db (no es un diagnóstico).")
    ap.add_argument("--evaluar", action="store_true", help="evalúa el canal real de eva.db y guarda en `evaluaciones`")
    ap.add_argument("--simulado", action="store_true", help="evalúa la tripulación SIMULADA y la guarda con canal SIMULADO")
    ap.add_argument("--origen-simulador", action="store_true",
                    help="los datos de eva.db vienen del simulador (npm run sim): se evalúan como eva.db pero se guardan con canal SIMULADO")
    ap.add_argument("--db", help="ruta de la BD (si no, EVA_DB)")
    a = ap.parse_args(argv)
    if not a.evaluar:
        ap.print_help()
        return 0
    r = evaluar_eva_db(ruta=a.db, guardar=True, simulado=a.simulado, origen_simulador=a.origen_simulador)
    for av in r["avisos"]:
        print(f"aviso: {av}", file=sys.stderr)
    if not r["hay"]:
        print("No hay eva.db utilizable; no se escribió nada.")
        return 1
    print(f"Filas escritas en evaluaciones: {r['filas_escritas']} (canal {r.get('canal_guardado', 'real')}). "
          f"{parametros.AVISO}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
