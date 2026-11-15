"""Vista «Configuración»: umbrales del semáforo y pesos / prior_de editables (investigación; no es un diagnóstico).

Lo que se edita aquí va a `datos/modelo/overrides.json` o, con EVA_DB, a la tabla pesos_usuario (motor.parametros), queda marcado «modificado por el usuario»,
no tiene fuente y es provisional. Las tablas con fuente (`datos/modelo/*.csv`) nunca se escriben.
Los botones usan `on_click`: la acción corre antes de re-ejecutar el script, que es el rerun que refresca la vista.
"""
from __future__ import annotations

import math

import pandas as pd
import streamlit as st

from motor import parametros, tablas
from paginas import padecimientos

AVISO = ("Los valores con fuente vienen de las tablas del equipo (`datos/modelo/*.csv`, que nunca se modifican). "
         "Lo que edites aquí se guarda en `datos/modelo/overrides.json`, queda marcado “modificado por el usuario”, "
         "no tiene fuente y es provisional. No es un diagnóstico.")
MSG_RESTAURADO = ("Se volvió a las tablas copiadas (valores con fuente de `datos/modelo/*.csv`) y a los umbrales "
                  "provisionales por defecto. Se eliminó `datos/modelo/overrides.json`.")
CLAVE_MSG = "cfg_msg"
CLAVE_VER = "cfg_ver"
ENTEROS = ("persistencia_h", "histeresis_evaluaciones")


# ---------------------------------------------------------------------------------------------------
# Utilidades
# ---------------------------------------------------------------------------------------------------
def _ver() -> int:
    return st.session_state.setdefault(CLAVE_VER, 0)


def _tras_cambio(tipo: str, texto: str) -> None:
    """Mensaje para la siguiente ejecución, widgets nuevos (clave con versión) y caché de Padecimientos invalidada."""
    st.session_state[CLAVE_MSG] = (tipo, texto)
    st.session_state[CLAVE_VER] = _ver() + 1
    st.session_state.pop(padecimientos.CLAVE_CACHE, None)


def _igual(a: float, b: float, nombre: str = "") -> bool:
    tol = 5e-5 if nombre.startswith("dL_") else 1e-9      # dL_* se muestran con 4 decimales
    return math.isclose(float(a), float(b), rel_tol=0.0, abs_tol=tol)


# ---------------------------------------------------------------------------------------------------
# Acciones (callbacks)
# ---------------------------------------------------------------------------------------------------
def aplicar_umbrales(valores: dict) -> tuple[list, list, list]:
    """Guarda solo los umbrales que difieren del valor por defecto y quita el override de los que vuelven a él.
    Devuelve (guardados, quitados, errores)."""
    actuales = parametros.umbrales()
    guardados, quitados, errores = [], [], []
    for nombre in parametros.UMBRALES_EDITABLES:
        v = valores.get(nombre)
        u = actuales[nombre]
        if v is None:
            errores.append(f"{nombre}: valor vacío")
            continue
        try:
            if _igual(v, u["valor_defecto"], nombre):
                if u["modificado_por_usuario"]:
                    parametros.quitar_override_umbral(nombre)
                    quitados.append(nombre)
            elif not _igual(v, u["valor"], nombre):
                parametros.guardar_override_umbral(nombre, v)
                guardados.append(nombre)
        except ValueError as e:
            errores.append(f"{nombre}: {e}")
    return guardados, quitados, errores


def aplicar_ligas(pid: str, editado: pd.DataFrame) -> tuple[list, list, list]:
    """Guarda las filas (columnas `id`, `peso`, `prior_de`) que difieren de lo vigente; si una fila vuelve al valor con
    fuente se quita su override. Devuelve (guardadas, quitadas, errores)."""
    fuente = tablas.cargar(aplicar_overrides=False).ligas_de(pid).set_index("variable_id")
    actual = tablas.cargar().ligas_de(pid).set_index("variable_id")
    guardadas, quitadas, errores = [], [], []
    for r in editado.itertuples(index=False):
        vid = r.id
        nuevo_peso, nuevo_sd = r.peso, r.prior_de
        if pd.isna(nuevo_peso) or pd.isna(nuevo_sd):
            errores.append(f"{vid}: celda vacía")
            continue
        nuevo_peso, nuevo_sd = float(nuevo_peso), float(nuevo_sd)
        if _igual(nuevo_peso, actual.at[vid, "mu"]) and _igual(nuevo_sd, actual.at[vid, "sigma"]):
            continue
        if not (0 <= nuevo_peso <= 3) or not nuevo_sd > 0:
            errores.append(f"{vid}: peso debe estar en 0 a 3 y prior_de > 0")
            continue
        usa_peso = not _igual(nuevo_peso, fuente.at[vid, "prior_media"])
        usa_sd = not _igual(nuevo_sd, fuente.at[vid, "prior_de"])
        try:
            parametros.quitar_override_liga(pid, vid)
            if usa_peso or usa_sd:
                parametros.guardar_override_liga(pid, vid, peso=nuevo_peso if usa_peso else None,
                                                 prior_de=nuevo_sd if usa_sd else None)
                guardadas.append(vid)
            else:
                quitadas.append(vid)
        except ValueError as e:
            errores.append(f"{vid}: {e}")
    return guardadas, quitadas, errores


def _guardar_umbrales(ver: int) -> None:
    valores = {n: st.session_state.get(f"umb_{n}_{ver}") for n in parametros.UMBRALES_EDITABLES}
    guardados, quitados, errores = aplicar_umbrales(valores)
    if errores:
        st.session_state[CLAVE_MSG] = ("error", "No se guardó: " + "; ".join(errores))
        return
    if not guardados and not quitados:
        st.session_state[CLAVE_MSG] = ("info", "No hay cambios en los umbrales.")
        return
    partes = []
    if guardados:
        partes.append("guardados: " + ", ".join(guardados))
    if quitados:
        partes.append("vueltos al valor por defecto: " + ", ".join(quitados))
    _tras_cambio("success", "Umbrales (" + "; ".join(partes) + "). Siguen siendo provisionales.")


def _guardar_ligas(pid: str, editado: pd.DataFrame) -> None:
    guardadas, quitadas, errores = aplicar_ligas(pid, editado)
    if errores:
        st.session_state[CLAVE_MSG] = ("error", "Algunas filas no se guardaron: " + "; ".join(errores))
        if guardadas or quitadas:
            st.session_state.pop(padecimientos.CLAVE_CACHE, None)
        return
    if not guardadas and not quitadas:
        st.session_state[CLAVE_MSG] = ("info", f"No hay cambios en {pid}.")
        return
    _tras_cambio("success", f"{pid}: {len(guardadas)} variable(s) modificadas por el usuario, "
                            f"{len(quitadas)} vuelta(s) al valor con fuente. Siguen siendo provisionales.")


def _restaurar() -> None:
    parametros.restaurar()
    _tras_cambio("success", MSG_RESTAURADO)


# ---------------------------------------------------------------------------------------------------
# Bloques
# ---------------------------------------------------------------------------------------------------
def _bloque_umbrales() -> None:
    st.subheader("Umbrales del semáforo (provisionales)")
    ver = _ver()
    umb = parametros.umbrales()
    for nombre in parametros.UMBRALES_EDITABLES:
        u = umb[nombre]
        entero = nombre in ENTEROS
        c1, c2 = st.columns([1, 3])
        if entero:
            c1.number_input(nombre, min_value=1, step=1, value=int(u["valor"]), key=f"umb_{nombre}_{ver}")
        else:
            c1.number_input(nombre, min_value=0.0, max_value=1.0 if nombre == "cobertura_min" else None,
                            step=0.05 if nombre == "cobertura_min" else 0.1,
                            format="%.4f" if nombre.startswith("dL_") else "%.2f",
                            value=float(u["valor"]), key=f"umb_{nombre}_{ver}")
        marca = " **Modificado por el usuario** (sin fuente)." if u["modificado_por_usuario"] else ""
        dflt = f'{u["valor_defecto"]:.4f}' if nombre.startswith("dL_") else f'{u["valor_defecto"]:g}'
        c2.markdown(f'{u["descripcion"]}. Supuesto {u["supuesto"]} (provisional). Valor por defecto: {dflt}.{marca}')
    st.button("Guardar umbrales", key="cfg_guardar_umbrales", on_click=_guardar_umbrales, args=(ver,))


def _bloque_ligas() -> None:
    st.subheader("Peso y prior_de por variable y padecimiento")
    tb_fuente = tablas.cargar(aplicar_overrides=False)
    tb = tablas.cargar()
    nombres = dict(zip(tb.padecimientos["padecimiento_id"], tb.padecimientos["padecimiento"]))
    pid = st.selectbox("Padecimiento", list(nombres), format_func=lambda p: f"{p} · {nombres[p]}", key="cfg_pad")
    f = tb_fuente.ligas_de(pid).set_index("variable_id")
    a = tb.ligas_de(pid)
    df = pd.DataFrame({
        "id": a["variable_id"].to_numpy(),
        "Variable": a["variable"].to_numpy(),
        "Evidencia": a["nivel_evidencia"].to_numpy(),
        "Peso con fuente": f.loc[a["variable_id"], "prior_media"].astype(float).to_numpy(),
        "prior_de con fuente": f.loc[a["variable_id"], "prior_de"].astype(float).to_numpy(),
        "Estado": ["modificado por el usuario" if m else "con fuente" for m in a["modificado_por_usuario"]],
        "peso": a["mu"].astype(float).to_numpy(),
        "prior_de": a["sigma"].astype(float).to_numpy(),
    })
    st.caption("Editables: peso (0 a 3) y prior_de (> 0). Si una fila vuelve al valor con fuente, se quita su override.")
    editado = st.data_editor(
        df, hide_index=True, width="stretch", num_rows="fixed", key=f"edit_liga_{pid}_{_ver()}",
        disabled=["id", "Variable", "Evidencia", "Peso con fuente", "prior_de con fuente", "Estado"],
        column_order=["id", "Variable", "peso", "prior_de", "Estado", "Peso con fuente", "prior_de con fuente", "Evidencia"],
        column_config={
            "id": st.column_config.TextColumn(width="small"),
            "Variable": st.column_config.TextColumn(width="medium"),
            "Estado": st.column_config.TextColumn(width="medium"),
            "Evidencia": st.column_config.TextColumn(width="small"),
            "Peso con fuente": st.column_config.NumberColumn(format="%.2f"),
            "prior_de con fuente": st.column_config.NumberColumn(format="%.2f"),
            "peso": st.column_config.NumberColumn("peso (editable)", min_value=0.0, max_value=3.0, step=0.5,
                                                  format="%.2f"),
            "prior_de": st.column_config.NumberColumn("prior_de (editable)", min_value=0.01, step=0.1, format="%.2f"),
        })
    st.button("Guardar cambios de este padecimiento", key="cfg_guardar_ligas", on_click=_guardar_ligas,
              args=(pid, editado))


def _bloque_restaurar() -> None:
    st.subheader("Restaurar")
    ver = _ver()
    ok = st.checkbox("Confirmo que quiero borrar todos mis valores modificados", key=f"cfg_conf_{ver}")
    st.button("Restaurar valores con fuente", key="cfg_restaurar", disabled=not ok, on_click=_restaurar)


def _bloque_modificados() -> None:
    st.subheader("Valores modificados por el usuario")
    ov = parametros.leer_overrides()
    filas = []
    if ov["ligas"]:
        f = tablas.cargar(aplicar_overrides=False).ligas.set_index(["padecimiento_id", "variable_id"])
        for clave, e in sorted(ov["ligas"].items()):
            pid, vid = clave.split("|", 1)
            for campo, col in (("peso", "prior_media"), ("prior_de", "prior_de")):
                if campo in e:
                    existe = (pid, vid) in f.index
                    filas.append({"Tipo": "Liga",
                                  "Elemento": f'{pid} · {f.at[(pid, vid), "variable"]} ({vid})' if existe else clave,
                                  "Campo": campo,
                                  "Valor con fuente o por defecto": float(f.at[(pid, vid), col]) if existe else float("nan"),
                                  "Valor actual": float(e[campo]), "Fecha": e.get("modificado") or ""})
    umb = parametros.umbrales()
    for nombre, u in umb.items():
        if u["modificado_por_usuario"]:
            filas.append({"Tipo": "Umbral", "Elemento": nombre, "Campo": "valor",
                          "Valor con fuente o por defecto": float(u["valor_defecto"]),
                          "Valor actual": float(u["valor"]), "Fecha": u.get("modificado") or ""})
    if not filas:
        st.caption("No hay valores modificados.")
        return
    st.dataframe(pd.DataFrame(filas), hide_index=True, width="stretch", column_config={
        "Valor con fuente o por defecto": st.column_config.NumberColumn(format="%.4f"),
        "Valor actual": st.column_config.NumberColumn(format="%.4f")})


# ---------------------------------------------------------------------------------------------------
# Vista
# ---------------------------------------------------------------------------------------------------
def render() -> None:
    st.title("Configuración")
    st.warning(AVISO)
    st.caption(f"Los cambios se guardan en: {parametros.origen_overrides()}")
    msg = st.session_state.pop(CLAVE_MSG, None)
    if msg:
        {"success": st.success, "error": st.error, "info": st.info}.get(msg[0], st.info)(msg[1])
    _bloque_umbrales()
    _bloque_ligas()
    _bloque_restaurar()
    _bloque_modificados()
