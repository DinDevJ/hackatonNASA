"""Estilo sobrio y ayudas de presentación de las vistas nuevas (investigación; no es un diagnóstico).

Solo CSS básico: fondo blanco, texto oscuro, fuentes del sistema, tablas con borde fino. El color nunca es el único
indicador: la pastilla escribe siempre la palabra del color.
"""
from __future__ import annotations

from html import escape

import streamlit as st

COLORES = {"VERDE": "#2e7d32", "AMARILLO": "#c99700", "ROJO": "#c62828", "GRIS": "#7a7a7a"}
# Texto de la pastilla: oscuro sobre amarillo (contraste), blanco sobre los demás.
_TEXTO_CHIP = {"VERDE": "#ffffff", "AMARILLO": "#1c1c1c", "ROJO": "#ffffff", "GRIS": "#ffffff"}

CSS = """
<style>
html, body, .stApp, .stMarkdown, button, input, textarea, select {
  font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}
.stApp { background: #ffffff; color: #1c1c1c; }
h1, h2, h3, h4 { font-weight: 600; letter-spacing: 0; color: #1c1c1c; }
h1 { font-size: 1.9rem; }
h2 { font-size: 1.45rem; }
h3 { font-size: 1.15rem; }
table { border-collapse: collapse; }
table th, table td { border: 1px solid #c9ccd0; padding: 0.25rem 0.5rem; }
[data-testid="stDataFrame"] { border: 1px solid #c9ccd0; }
.chip { display: inline-block; min-width: 4.6rem; white-space: nowrap; text-align: center; padding: 0.05rem 0.55rem;
        border-radius: 3px; font-size: 0.78rem; font-weight: 700; line-height: 1.5; letter-spacing: 0.02em; }
.pad-cab { font-size: 0.8rem; font-weight: 600; color: #1c1c1c; border-bottom: 1px solid #1c1c1c; padding-bottom: 0.15rem; }
.pad-fila { font-size: 0.88rem; line-height: 1.35; }
.rotulo-simulado { border: 4px solid #1c1c1c; padding: 0.6rem 1rem; margin: 0.4rem 0 0.8rem 0; background: #ffffff; }
.rotulo-simulado .palabra { font-size: 2rem; font-weight: 800; line-height: 1.2; }
.rotulo-simulado .texto { font-size: 0.95rem; }
.st-key-lista_pad [data-testid="stVerticalBlock"] { gap: 0.1rem; }
.st-key-lista_pad [data-testid="stHorizontalBlock"] { align-items: center; border-bottom: 1px solid #e3e5e8; }
.st-key-lista_pad button { min-height: 1.6rem; padding: 0 0.5rem; white-space: nowrap; }
.st-key-lista_pad button p { white-space: nowrap; }
</style>
"""


def aplicar() -> None:
    """Inyecta el CSS ligero (idempotente: se puede llamar en cada ejecución)."""
    st.markdown(CSS, unsafe_allow_html=True)


def chip(color: str) -> str:
    """HTML de una pastilla pequeña: fondo del color y la PALABRA del color dentro (texto legible)."""
    c = str(color).upper()
    fondo = COLORES.get(c, COLORES["GRIS"])
    texto = _TEXTO_CHIP.get(c, "#ffffff")
    return f'<span class="chip" style="background:{fondo};color:{texto}">{escape(c)}</span>'
