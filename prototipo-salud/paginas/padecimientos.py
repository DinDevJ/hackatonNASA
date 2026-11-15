"""Vista «Padecimientos»: semáforo por padecimiento (investigación; no es un diagnóstico).

Solo presenta el resultado de `motor.evaluar_todo`. No calcula nada propio y no muestra probabilidades. Los canales
real y SIMULADO y las personas nunca se mezclan. Todos los umbrales son provisionales.

Variable de entorno opcional PROTOTIPO_ESTADO_DIR: carpeta donde se leen/escriben `contexto_personas.json` y los
almacenes de calibración (`calibracion_real.json`, `calibracion_SIMULADO.json`). Sin ella se usan las rutas del
prototipo (`datos/estado/` y `datos/simulado/`). Sirve para que las pruebas no dejen archivos.
"""
from __future__ import annotations

import json
import os
import re
from datetime import date
from html import escape
from pathlib import Path

import pandas as pd
import streamlit as st

from motor import evaluar_todo, parametros
from paginas import estilo

ROOT = Path(__file__).resolve().parents[1]
CLAVE_CACHE = "pad_cache"          # la vista Configuración borra esta clave tras guardar o restaurar
CLAVE_DETALLE = "pad_detalle"
ENV_ESTADO = "PROTOTIPO_ESTADO_DIR"
ENV_RAW = "PROTOTIPO_RAW_DIR"          # solo para pruebas: carpeta de runs en lugar de outputs/raw
NOMBRE_CONTEXTO = "contexto_personas.json"

AVISO_FIJO = "No es un diagnóstico. Se recomienda revisión por el cirujano de vuelo."
DISCLAIMER = ("No es un diagnóstico. El semáforo ordena qué revisar primero y recomienda consultar al cirujano de "
              "vuelo. Todos los umbrales son provisionales y ninguno está validado en astronautas. VERDE no significa "
              "“sano”: significa sin desviaciones en lo que se midió, con cobertura suficiente. GRIS significa "
              "evidencia insuficiente.")
SIN_REALES = ("No hay mediciones reales guardadas (outputs/raw vacío y sin sensores cargados). Se muestra la "
              "tripulación SIMULADA para ejercitar el flujo.")
TEXTO_SIMULADO = ("Datos sintéticos generados para probar el flujo. No son fisiología real ni datos de astronautas "
                  "ni de vuelo.")
FASES = {"PRE": "prevuelo (PRE)", "VT": "vuelo temprano (VT)", "VTa": "vuelo tardío (VTa)", "POST": "postvuelo (POST)"}
COLORES_ORDEN = ("VERDE", "AMARILLO", "ROJO", "GRIS")


# ---------------------------------------------------------------------------------------------------
# Rutas y contexto de personas
# ---------------------------------------------------------------------------------------------------
def dir_estado() -> Path:
    """Carpeta del estado local (contexto y calibración); PROTOTIPO_ESTADO_DIR la redirige."""
    e = os.environ.get(ENV_ESTADO)
    return Path(e) if e else ROOT / "datos" / "estado"


def _ruta_contexto() -> Path:
    return dir_estado() / NOMBRE_CONTEXTO


def leer_contexto() -> dict:
    r = _ruta_contexto()
    if not r.exists():
        return {"personas": {}}
    try:
        d = json.loads(r.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {"personas": {}}
    d.setdefault("personas", {})
    return d


def guardar_contexto(ctx: dict) -> None:
    r = _ruta_contexto()
    r.parent.mkdir(parents=True, exist_ok=True)
    ctx = dict(ctx)
    ctx["nota"] = "Contexto declarado por quien captura; sin valores por defecto. No es un diagnóstico."
    r.write_text(json.dumps(ctx, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def derivar_contexto(ctx: dict):
    """(mision_real, perfiles_real, ecg_en_reposo) tal como los espera `evaluar_todo`; solo lo declarado."""
    mision, perfiles, reposo = {}, {}, {}
    for sid, c in ctx.get("personas", {}).items():
        if c.get("lanzamiento"):
            mision[sid] = {"lanzamiento": c["lanzamiento"]}
        pf = {k: c[k] for k in ("edad", "sexo") if c.get(k) is not None}
        if pf:
            perfiles[sid] = pf
        if c.get("ecg_en_reposo"):
            reposo[sid] = True
    return (mision or None), (perfiles or None), (reposo or False)


# ---------------------------------------------------------------------------------------------------
# Cálculo con caché en st.session_state
# ---------------------------------------------------------------------------------------------------
def _firma_overrides():
    try:
        return parametros.RUTA_OVERRIDES.stat().st_mtime_ns
    except OSError:
        return None


def dir_raw() -> Path:
    """Carpeta de runs guardados (outputs/raw); PROTOTIPO_RAW_DIR la redirige en las pruebas."""
    e = os.environ.get(ENV_RAW)
    return Path(e) if e else ROOT / "outputs" / "raw"


def _firma_raw():
    base = dir_raw()
    if not base.is_dir():
        return None
    items = []
    for p in sorted(base.rglob("*")):
        try:
            s = p.stat()
        except OSError:
            continue
        items.append((str(p.relative_to(base)), s.st_mtime_ns, s.st_size if p.is_file() else 0))
    return tuple(items)


def _clave_cache(sdf, ctx: dict):
    return (_firma_overrides(), _firma_raw(), None if sdf is None else (id(sdf), len(sdf)),
            json.dumps(ctx, sort_keys=True, ensure_ascii=False))


def _calcular(sdf, ctx: dict) -> dict:
    mision, perfiles, reposo = derivar_contexto(ctx)
    kw = {}
    if os.environ.get(ENV_RAW):
        kw["raw_dir"] = dir_raw()
    if os.environ.get(ENV_ESTADO):
        d = dir_estado()
        kw.update(ruta_estado_real=d / "calibracion_real.json", ruta_estado_simulado=d / "calibracion_SIMULADO.json")
    return evaluar_todo(sens_df=sdf, ecg_en_reposo=reposo, mision_real=mision, perfiles_real=perfiles, **kw)


def obtener_resultado(forzar: bool = False) -> dict:
    ctx = leer_contexto()
    sdf = st.session_state.get("sens_df")
    clave = _clave_cache(sdf, ctx)
    c = st.session_state.get(CLAVE_CACHE)
    if forzar or c is None or c.get("clave") != clave:
        with st.spinner("Evaluando padecimientos…"):
            st.session_state[CLAVE_CACHE] = {"clave": clave, "res": _calcular(sdf, ctx)}
    return st.session_state[CLAVE_CACHE]["res"]


# ---------------------------------------------------------------------------------------------------
# Utilidades de presentación
# ---------------------------------------------------------------------------------------------------
def _f2(x) -> str:
    return "—" if x is None or (isinstance(x, float) and x != x) else f"{float(x):.2f}"


def _motivo(t) -> str:
    """Motivo del motor sin la frase «VERDE no significa «sano»…»: ya está en el aviso fijo de arriba."""
    frases = re.split(r"(?<=[.])\s+", " ".join(str(t or "").split()))
    return " ".join(f for f in frases if "sano" not in f).strip()


def _abreviar(t: str, n: int = 110) -> str:
    t = _motivo(t)
    return t if len(t) <= n else t[: n - 1].rstrip() + "…"


def _sino(b) -> str:
    return "sí" if b else "no"


def _num(x):
    return float(x) if isinstance(x, (int, float)) and not isinstance(x, bool) else float("nan")


def _valor_txt(v, unidad) -> str:
    if v is None:
        return ""
    t = f"{v:g}" if isinstance(v, (int, float)) and not isinstance(v, bool) else str(v)
    return f"{t} {unidad}".strip() if unidad else t


def _md(t: str) -> str:
    """Evita que `$` active fórmulas en el markdown de Streamlit."""
    return str(t).replace("$", "\\$")


def _pasos_de_condicion(p: dict) -> list[str]:
    cods = [str(c) for c in p.get("condiciones") or []]
    out = []
    for s in p.get("pasos") or []:
        cuerpo = re.sub(r"^\s*\d+\.\s*", "", s)
        if any(cuerpo.startswith(c + ":") for c in cods):
            out.append(cuerpo)
    return out


# ---------------------------------------------------------------------------------------------------
# Bloques de la vista
# ---------------------------------------------------------------------------------------------------
def _rotulo_simulado() -> None:
    st.markdown(f'<div class="rotulo-simulado"><div class="palabra">SIMULADO</div>'
                f'<div class="texto">{TEXTO_SIMULADO}</div></div>', unsafe_allow_html=True)


def _contexto_persona(sid: str) -> None:
    ctx = leer_contexto()
    c = ctx["personas"].get(sid, {})
    with st.expander("Contexto de la persona (opcional)"):
        st.caption("Lo que declare aquí se guarda en datos/estado/contexto_personas.json. Sin fecha de lanzamiento "
                   "(sin misión declarada) todo se evalúa como PRE.")
        f0 = None
        if c.get("lanzamiento"):
            try:
                f0 = date.fromisoformat(c["lanzamiento"])
            except ValueError:
                f0 = None
        c1, c2, c3 = st.columns(3)
        lanz = c1.date_input("Fecha de lanzamiento", value=f0, format="YYYY-MM-DD", key=f"ctx_lanz_{sid}")
        edad = c2.number_input("Edad (años)", min_value=0, max_value=120, step=1, value=c.get("edad"),
                               key=f"ctx_edad_{sid}")
        ops = ["sin dato", "M", "F"]
        sexo = c3.selectbox("Sexo", ops, index=ops.index(c["sexo"]) if c.get("sexo") in ops else 0,
                            key=f"ctx_sexo_{sid}")
        rep = st.checkbox("Los registros de ECG guardados se tomaron en reposo (declaración de quien captura)",
                          value=bool(c.get("ecg_en_reposo")), key=f"ctx_rep_{sid}")
        if st.button("Guardar contexto", key=f"ctx_guardar_{sid}"):
            ctx["personas"][sid] = {"lanzamiento": lanz.isoformat() if lanz else None,
                                    "edad": int(edad) if edad is not None else None,
                                    "sexo": None if sexo == "sin dato" else sexo,
                                    "ecg_en_reposo": bool(rep)}
            guardar_contexto(ctx)
            st.session_state.pop(CLAVE_CACHE, None)
            st.rerun()


def _resumen(pers: dict) -> None:
    cuenta = {c: 0 for c in COLORES_ORDEN}
    for p in pers["padecimientos"]:
        cuenta[p["color"]] = cuenta.get(p["color"], 0) + 1
    partes = [f'{estilo.chip(c)} {cuenta[c]}' for c in COLORES_ORDEN]
    fase = FASES.get(pers.get("fase"), str(pers.get("fase")))
    st.markdown(" &nbsp;&nbsp; ".join(partes) + f' &nbsp;&nbsp;|&nbsp;&nbsp; Fase: {fase} &nbsp;|&nbsp; '
                f'Fecha de evaluación: {pers.get("fecha_evaluacion")}', unsafe_allow_html=True)
    st.caption("Conteo por color de los 20 padecimientos. Todos los umbrales son provisionales.")


def _ver(pid: str) -> None:
    st.session_state[CLAVE_DETALLE] = pid


def _lista(pers: dict) -> None:
    st.markdown("[Ir al detalle](#detalle)")
    st.caption("T, T_inf y cobertura son cifras provisionales (pesos de nivel mayoritariamente C y umbrales sin validar).")
    anchos = [1.5, 4.2, 0.8, 0.8, 1.1, 6.0, 1.0]
    cab = st.columns(anchos)
    for col, t in zip(cab, ["Color", "Padecimiento", "T", "T_inf", "Cobertura", "Motivo (resumen)", "Detalle"]):
        col.markdown(f'<div class="pad-cab">{t}</div>', unsafe_allow_html=True)
    sel = st.session_state.get(CLAVE_DETALLE)
    with st.container(key="lista_pad"):
        for p in pers["padecimientos"]:
            pid = p["padecimiento_id"]
            c = st.columns(anchos)
            c[0].markdown(estilo.chip(p["color"]), unsafe_allow_html=True)
            nombre = escape(f'{pid} · {p["padecimiento"]}')
            c[1].markdown(f'<div class="pad-fila">{"<b>" + nombre + "</b>" if pid == sel else nombre}</div>',
                          unsafe_allow_html=True)
            c[2].markdown(f'<div class="pad-fila">{_f2(p.get("T"))}</div>', unsafe_allow_html=True)
            c[3].markdown(f'<div class="pad-fila">{_f2(p.get("T_inf"))}</div>', unsafe_allow_html=True)
            c[4].markdown(f'<div class="pad-fila">{_f2(p.get("cobertura"))}</div>', unsafe_allow_html=True)
            c[5].markdown(f'<div class="pad-fila">{escape(_abreviar(p.get("motivo")))}</div>'.replace("$", "&#36;"),
                          unsafe_allow_html=True)
            c[6].button("Ver", key=f"ver_{pid}", on_click=_ver, args=(pid,))


def _tabla_ligas(p: dict) -> pd.DataFrame:
    filas = []
    for l in p["ligas"]:
        aus = l.get("ausencia")
        mot = l.get("motivo_ausencia")
        filas.append({
            "Variable": l.get("variable"),
            "id": l.get("variable_id"),
            "Peso": _num(l.get("peso")),
            "prior_de": _num(l.get("prior_de")),
            "Evidencia (tabla → efectivo)": f'{l.get("nivel_evidencia")} → {l.get("nivel_efectivo")}',
            "Valor y unidad": _valor_txt(l.get("valor"), l.get("unidad")),
            "Fecha del dato": l.get("fecha_dato") or "",
            "Calidad": l.get("nivel_calidad") or "",
            "Activación": _num(l.get("activacion")),
            "Aporte": _num(l.get("aporte")),
            "Cuenta en T": _sino(l.get("cuenta_en_T")),
            "Ausencia / motivo": (f"{aus}: {mot}" if aus and mot else (aus or mot or "")),
            "Etiquetas": ", ".join(l.get("etiquetas") or []),
            "Modificado por el usuario": _sino(l.get("modificado_por_usuario")),
            "Fuente": (l.get("fuente_urls") or [None])[0],
        })
    return pd.DataFrame(filas)


def _fuentes_md(p: dict) -> str:
    out = []
    for l in p["ligas"]:
        urls = l.get("fuente_urls") or []
        et = f'{l.get("variable")} ({l.get("variable_id")})'
        if urls:
            out.append(f"- {et}: " + ", ".join(f"[{u}]({u})" for u in urls))
        elif l.get("modificado_por_usuario"):
            out.append(f"- {et}: valor modificado por el usuario, sin fuente (provisional)")
        elif l.get("nivel_evidencia") == "C":
            out.append(f"- {et}: sin fuente en las tablas (nivel C)")
        else:
            out.append(f"- {et}: sin enlace en las tablas")
    return _md("\n".join(out))


def _detalle(pers: dict, pid: str) -> None:
    p = next((x for x in pers["padecimientos"] if x["padecimiento_id"] == pid), None)
    if p is None:
        p = pers["padecimientos"][0]
    st.subheader(f'Detalle: {p["padecimiento_id"]} · {p["padecimiento"]}', anchor="detalle")
    st.markdown(estilo.chip(p["color"]), unsafe_allow_html=True)
    st.markdown("**Por qué este color**")
    st.markdown(_md(_motivo(p.get("motivo"))))
    cond = _pasos_de_condicion(p)
    if cond:
        st.markdown(_md("\n".join(f"- {c}" for c in cond)))
    if p.get("etiquetas"):
        st.caption("Etiquetas: " + ", ".join(p["etiquetas"]))
    pr = p.get("prior")
    if pr and pr.get("disponible"):
        st.caption(f'prior con fuente: {pr.get("fuente")} (uso interno para ordenar; no se muestra como probabilidad)')

    m = st.columns(5)
    m[0].metric("T (provisional)", _f2(p.get("T")))
    m[1].metric("DE(T) (provisional)", _f2(p.get("T_de")))
    m[2].metric("T_inf (provisional)", _f2(p.get("T_inf")))
    m[3].metric("T_máx (provisional)", _f2(p.get("T_max")))
    m[4].metric("Cobertura (provisional)", _f2(p.get("cobertura")))

    st.markdown("**Cálculo paso a paso** (umbrales provisionales)")
    st.markdown(_md("\n".join(p.get("pasos") or [])))

    st.markdown("**Variables del padecimiento**")
    df = _tabla_ligas(p)
    st.dataframe(df, hide_index=True, width="stretch", column_config={
        "Peso": st.column_config.NumberColumn("Peso", format="%.2f"),
        "prior_de": st.column_config.NumberColumn("prior_de", format="%.2f"),
        "Activación": st.column_config.NumberColumn("Activación", format="%.2f"),
        "Aporte": st.column_config.NumberColumn("Aporte", format="%.2f"),
        "Fuente": st.column_config.LinkColumn("Fuente", display_text="abrir fuente"),
    })
    st.markdown("**Fuentes**")
    st.markdown(_fuentes_md(p))

    st.markdown("**Capas fijas** (no cambian T ni el color)")
    capas = [{"Nombre": c.get("nombre"), "Ámbito": c.get("ambito"),
              "Estado": c.get("estado") + (f' ({c["detalle"]})' if c.get("detalle") else "")}
             for c in p.get("capas_fijas") or []]
    if capas:
        st.dataframe(pd.DataFrame(capas), hide_index=True, width="stretch")
    else:
        st.caption("Este padecimiento no tiene capas fijas asociadas.")

    st.markdown("**Historial reciente**")
    h = (p.get("historial") or [])[-14:]
    if h:
        st.dataframe(pd.DataFrame([{"Fecha": x.get("fecha"), "Color": x.get("color"), "T": _num(x.get("T")),
                                    "T_inf": _num(x.get("T_inf"))} for x in h]),
                     hide_index=True, width="stretch",
                     column_config={"T": st.column_config.NumberColumn("T", format="%.2f"),
                                    "T_inf": st.column_config.NumberColumn("T_inf", format="%.2f")})
    else:
        st.caption("Sin historial.")
    st.markdown(AVISO_FIJO)


def _avisos_y_registro(res: dict, canal: str, sid: str) -> None:
    with st.expander("Avisos de la puerta de calidad y registro"):
        st.markdown("**Avisos**")
        av = res.get("avisos") or []
        if av:
            st.markdown(_md("\n".join(f"- {a}" for a in av)))
        else:
            st.caption("Sin avisos.")
        reg = [r for r in (res[canal].get("registro") or [])
               if not r.get("clave") or str(r["clave"]).split("|")[0] == sid]
        st.markdown(f"**Registro de {sid}** (intentos rechazados y exclusiones): {len(reg)} entradas; se muestran las primeras 30.")
        if reg:
            tipos = pd.Series([r.get("tipo") for r in reg]).value_counts().rename_axis("Tipo").reset_index(name="Entradas")
            st.dataframe(tipos, hide_index=True, width="stretch")
            st.dataframe(pd.DataFrame([{"Tipo": r.get("tipo"), "Fecha": r.get("fecha"), "Clave": r.get("clave"),
                                        "Detalle": r.get("detalle")} for r in reg[:30]]),
                         hide_index=True, width="stretch")


# ---------------------------------------------------------------------------------------------------
# Vista
# ---------------------------------------------------------------------------------------------------
def render() -> None:
    st.title("Padecimientos")
    st.caption("Semáforo por padecimiento. Prototipo de investigación")
    st.warning(DISCLAIMER)

    if st.button("Recalcular", key="pad_recalcular"):
        st.session_state.pop(CLAVE_CACHE, None)
    res = obtener_resultado()

    reales = sorted((res.get("real") or {}).get("personas", {}))
    simuladas = sorted((res.get("simulado") or {}).get("personas", {}))
    opciones = [f"real|{s}" for s in reales] + [f"simulado|{s}" for s in simuladas]
    if not reales:
        st.info(SIN_REALES)
    if not opciones:
        st.error("El motor no devolvió ninguna persona.")
        return

    def _rotulo(o: str) -> str:
        canal, sid = o.split("|", 1)
        return sid if canal == "real" else f"{sid} · SIMULADO"

    elegido = st.selectbox("Persona", opciones, format_func=_rotulo, key="pad_persona")
    canal, sid = elegido.split("|", 1)
    pers = res[canal]["personas"][sid]

    if canal == "simulado":
        _rotulo_simulado()
    else:
        _contexto_persona(sid)

    _resumen(pers)
    _lista(pers)

    pid = st.session_state.get(CLAVE_DETALLE) or pers["padecimientos"][0]["padecimiento_id"]
    _detalle(pers, pid)
    _avisos_y_registro(res, canal, sid)
