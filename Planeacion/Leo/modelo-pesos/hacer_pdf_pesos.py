"""PDF que explica todas las relaciones de pesos (malestar × variable) a partir de pesos.json.
Uso (requiere reportlab): python hacer_pdf_pesos.py  →  relaciones-pesos.pdf
"""
import json, math, pathlib
from collections import Counter
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import cm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (BaseDocTemplate, Frame, NextPageTemplate, PageBreak, PageTemplate,
                                Paragraph, Spacer, Table, TableStyle, KeepTogether)

AQUI = pathlib.Path(__file__).parent
D = json.loads((AQUI / "pesos.json").read_text(encoding="utf-8"))
F = D["pesos"]
REFS = D["referencias"]

pdfmetrics.registerFont(TTFont("Arial", "C:/Windows/Fonts/arial.ttf"))
pdfmetrics.registerFont(TTFont("Arial-B", "C:/Windows/Fonts/arialbd.ttf"))
AZUL, GRIS, FONDO = colors.HexColor("#1F3A5F"), colors.HexColor("#5B6573"), colors.HexColor("#F2F4F7")
CALOR = {0: colors.HexColor("#F4F5F7"), 1: colors.HexColor("#DCEBFA"), 2: colors.HexColor("#9CC4F0"), 3: colors.HexColor("#3A7BD5")}
EVID = {"A": colors.HexColor("#E3F4E1"), "B": colors.HexColor("#FFF1D6"), "C": colors.HexColor("#F9DEDE")}

S = {
    "t": ParagraphStyle("t", fontName="Arial-B", fontSize=22, leading=27, textColor=AZUL),
    "sub": ParagraphStyle("s", fontName="Arial", fontSize=11, leading=15, textColor=GRIS),
    "h1": ParagraphStyle("h1", fontName="Arial-B", fontSize=15, leading=19, textColor=AZUL, spaceBefore=4, spaceAfter=6),
    "h2": ParagraphStyle("h2", fontName="Arial-B", fontSize=11.5, leading=15, textColor=AZUL, spaceBefore=8, spaceAfter=3),
    "p": ParagraphStyle("p", fontName="Arial", fontSize=9.6, leading=13.4),
    "pc": ParagraphStyle("pc", fontName="Arial", fontSize=8.6, leading=11.5),
    "c": ParagraphStyle("c", fontName="Arial", fontSize=8, leading=10),
    "cb": ParagraphStyle("cb", fontName="Arial-B", fontSize=8, leading=10, textColor=colors.white),
    "big": ParagraphStyle("big", fontName="Arial-B", fontSize=20, leading=24, alignment=1, textColor=AZUL),
    "lab": ParagraphStyle("lab", fontName="Arial", fontSize=8.6, leading=11, alignment=1, textColor=GRIS),
    "cc": ParagraphStyle("cc", fontName="Arial-B", fontSize=9, leading=11, alignment=1),
    "mono": ParagraphStyle("m", fontName="Arial", fontSize=9, leading=13, leftIndent=10, textColor=colors.HexColor("#22304A"), backColor=FONDO),
}
SUB = {"₀": "<sub>0</sub>", "₂": "<sub>2</sub>", "ᵥ": "<sub>v</sub>", "⇒": "→"}  # Arial no trae subíndices unicode


def P(t, e="p"):
    for k, v in SUB.items():
        t = t.replace(k, v)
    return Paragraph(t, S[e])


def tabla(datos, anchos, fondos=None, estilo="c", extra=None):
    filas = [[P(f"<b>{c}</b>", "cb") for c in datos[0]]] + [[c if not isinstance(c, str) else P(c, estilo) for c in f] for f in datos[1:]]
    t = Table(filas, colWidths=anchos, repeatRows=1)
    st = [("BACKGROUND", (0, 0), (-1, 0), AZUL), ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
          ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#C9CED6")),
          ("TOPPADDING", (0, 0), (-1, -1), 3), ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
          ("LEFTPADDING", (0, 0), (-1, -1), 4), ("RIGHTPADDING", (0, 0), (-1, -1), 4)]
    for i, f in enumerate(fondos or [], start=1):
        if f is not None:
            st.append(("BACKGROUND", (0, i), (-1, i), f))
    t.setStyle(TableStyle(st + (extra or [])))
    return t


def pie(c, doc):
    c.saveState(); c.setFont("Arial", 7.5); c.setFillColor(GRIS)
    w, _ = doc.pagesize
    c.drawString(1.5 * cm, 0.9 * cm, "Equipo Monarcas · Pesos fisiológicos por malestar · Leo (Persona 4)")
    c.drawRightString(w - 1.5 * cm, 0.9 * cm, f"Página {doc.page}")
    c.restoreState()


SALIDA = AQUI / "relaciones-pesos.pdf"
doc = BaseDocTemplate(str(SALIDA), pagesize=A4, title="Relaciones de pesos por malestar", author="Equipo Monarcas")
wA, hA = A4
wL, hL = landscape(A4)
doc.addPageTemplates([
    PageTemplate("v", [Frame(1.5 * cm, 1.5 * cm, wA - 3 * cm, hA - 3 * cm)], onPage=pie, pagesize=A4),
    PageTemplate("h", [Frame(1.2 * cm, 1.4 * cm, wL - 2.4 * cm, hL - 2.6 * cm)], onPage=pie, pagesize=landscape(A4)),
])
W, WL = wA - 3 * cm, wL - 2.4 * cm
H = []

malestares = sorted({(f["malestar_id"], f["malestar"], f["riesgo_nasa"]) for f in F})
variables = D["variables"]
NOMBRE_VAR = {"fc_reposo": "Pulso", "spo2": "SpO₂", "respiracion": "Respiración", "temperatura": "Temperatura",
              "presion_arterial": "Presión", "sueno": "Sueño", "pvt_lapsos": "PVT", "co2_cabina": "CO₂ cabina", "sintomas": "Síntomas"}
con_peso = [f for f in F if f["peso_fisiologico"] > 0]
niv = Counter(f["nivel_evidencia"] for f in con_peso)

# ---------- 1. Portada ----------
H += [P("Cómo relacionamos cada variable con cada malestar", "t"), Spacer(1, 4),
      P("Pesos fisiológicos + actualización bayesiana · Equipo Monarcas · NASA Space Apps 2026", "sub"), Spacer(1, 14)]
cajas = [(str(len(malestares)), "malestares"), (str(len(variables)), "variables"), (str(len(F)), "relaciones revisadas"),
         (str(len(con_peso)), "con peso"), (f"{niv['A']}·{niv['B']}·{niv['C']}", "evidencia A·B·C")]
tc = Table([[P(n, "big") for n, _ in cajas], [P(t, "lab") for _, t in cajas]], colWidths=[W / 5] * 5)
tc.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), FONDO), ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                        ("LINEAFTER", (0, 0), (-1, -1), 2, colors.white), ("TOPPADDING", (0, 0), (-1, 0), 10), ("BOTTOMPADDING", (0, 1), (-1, 1), 10)]))
H += [tc, Spacer(1, 12),
      P("En una frase", "h2"),
      P("Cada variable recibe un <b>peso de 0 a 3</b> para cada malestar según <b>qué tan directamente participa en cómo se "
        "produce</b> ese malestar (fisiología), no según casos reales, porque casi no hay casos de astronautas. Cada peso dice "
        "<b>qué tan fundamentado está</b> (nivel A, B o C) y arranca como un <b>prior bayesiano</b> que se corrige cuando "
        "lleguen datos reales."),
      P("La regla del peso", "h2"),
      tabla([["Peso", "Criterio fisiológico", "Ejemplo"],
             ["<b>3</b>", "La variable <b>es</b> el mecanismo o su medida directa", "SpO₂ en hipoxia"],
             ["<b>2</b>", "Eslabón causal directo (está en el diagrama causal de NASA)", "Pulso en reposo en infección"],
             ["<b>1</b>", "Marcador asociado pero poco específico", "Sueño corto en infección"],
             ["<b>0</b>", "Sin vía fisiológica conocida: <b>se descarta</b> para ese malestar", "Glucosa en descompresión"]],
            [1.4 * cm, W - 6.4 * cm, 5 * cm], fondos=[CALOR[3], CALOR[2], CALOR[1], CALOR[0]]),
      P("Qué tan fundamentado está cada peso", "h2"),
      tabla([["Nivel", "Significa", "Celdas", "Incertidumbre del prior"],
             ["<b>A</b>", "Relación medida con número, en fuente verificada", str(niv["A"]), "Baja (desviación 0,5)"],
             ["<b>B</b>", "Mecanismo documentado en una fuente verificada", str(niv["B"]), "Media (1,0)"],
             ["<b>C</b>", "Juicio fisiológico del equipo, sin fuente directa", str(niv["C"]), "Alta (1,5): los datos lo corrigen fácil"]],
            [1.4 * cm, W - 8.4 * cm, 1.8 * cm, 5.2 * cm], fondos=[EVID["A"], EVID["B"], EVID["C"]]),
      Spacer(1, 6),
      P(f"<b>Importante:</b> {niv['C']} de {len(con_peso)} pesos son juicio nuestro (nivel C). Se presentan así, no como evidencia.", "pc")]

# ---------- 2. Mapa de calor (horizontal) ----------
H += [NextPageTemplate("h"), PageBreak(), P("Mapa de todas las relaciones", "h1"),
      P("Número = peso (0–3) · letra = nivel de evidencia · color más intenso = más peso. Las celdas vacías (0) son variables descartadas para ese malestar.", "pc"),
      Spacer(1, 4)]
idx = {(f["malestar_id"], f["variable"]): f for f in F}
cab = ["Malestar"] + [NOMBRE_VAR[v] for v in variables]
filas = [cab]
estilos = []
for r, (mid, mal, _) in enumerate(malestares, start=1):
    fila = [P(f"<b>{mid}</b> {mal}", "c")]
    for c, v in enumerate(variables, start=1):
        f = idx[(mid, v)]
        w = f["peso_fisiologico"]
        fila.append(P(f"<b>{w}</b> <font size=6>{f['nivel_evidencia']}</font>" if w else "", "cc"))
        estilos.append(("BACKGROUND", (c, r), (c, r), CALOR[w]))
        if w == 3:
            estilos.append(("TEXTCOLOR", (c, r), (c, r), colors.white))
    filas.append(fila)
anchos = [6.2 * cm] + [(WL - 6.2 * cm) / len(variables)] * len(variables)
t = Table([[P(f"<b>{x}</b>", "cb") for x in filas[0]]] + filas[1:], colWidths=anchos, rowHeights=[None] + [0.95 * cm] * len(malestares))
t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, 0), AZUL), ("GRID", (0, 0), (-1, -1), 0.5, colors.white),
                       ("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("ALIGN", (1, 0), (-1, -1), "CENTER")] + estilos))
H += [t, Spacer(1, 6),
      P("Lectura rápida: el <b>pulso</b> aparece en casi todos los malestares, pero solo manda en la arritmia. Los signos del "
        "reloj son fuertes en arritmia, hipoxia, infección y sueño/fatiga; en radiación, descompresión y trombosis/SANS mandan "
        "los síntomas y variables que no son del reloj (dosis, presión del traje, ultrasonido).", "pc")]

# ---------- 3. Detalle por malestar ----------
H += [NextPageTemplate("v"), PageBreak(), P("Cada malestar, variable por variable", "h1"),
      P("Solo se listan las variables con peso. El mecanismo explica por qué; la referencia, de dónde sale.", "pc")]
for mid, mal, riesgo in malestares:
    fs = sorted([f for f in F if f["malestar_id"] == mid and f["peso_fisiologico"] > 0], key=lambda f: (-f["peso_fisiologico"], f["nivel_evidencia"]))
    datos = [["Variable", "Peso", "Ev.", "Dirección", "Mecanismo y referencia"]]
    fondos = []
    for f in fs:
        ref = f["referencia"] if not f["doi"] else f"{f['referencia']} · doi:{f['doi']}"
        datos.append([f"{NOMBRE_VAR[f['variable']]}<br/><font size=6.5 color='#5B6573'>{f['id_catalogo']}</font>",
                      f"<b>{f['peso_fisiologico']}</b>", f["nivel_evidencia"], f["direccion"], f"{f['mecanismo']}<br/><font color='#5B6573'>{ref}</font>"])
        fondos.append(EVID[f["nivel_evidencia"]])
    descartadas = [NOMBRE_VAR[f["variable"]] for f in F if f["malestar_id"] == mid and f["peso_fisiologico"] == 0]
    H.append(KeepTogether([P(f"{mid}. {mal}", "h2"), P(f"<font color='#5B6573'>{riesgo}</font>", "pc"), Spacer(1, 2),
                           tabla(datos, [2.6 * cm, 1.1 * cm, 0.9 * cm, 2.4 * cm, W - 7 * cm], fondos=fondos),
                           P(f"<font color='#5B6573'>Descartadas (peso 0): {', '.join(descartadas) or '—'}</font>", "pc")]))

# ---------- 4. Cómo se calcula y se actualiza ----------
H += [PageBreak(), P("Cómo se usan los pesos", "h1"),
      P("1. Índice de cada malestar (como las escalas de alerta temprana de hospital, pero contra el normal de cada persona)", "h2"),
      P("Cada variable se compara con la línea base de la persona (z). Gana puntos según su desviación, solo en la dirección "
        "fisiológica del malestar: |z| &lt; 1 → 0 · 1–2 → 1 · 2–3 → 2 · &gt; 3 → 3."),
      P("Índice = Σ (peso × puntos) / máximo posible   →   de 0 a 1", "mono"),
      P("Alarma si el índice pasa un umbral, o si una sola variable de peso 3 llega a 3 puntos (como la NEWS)."),
      P("2. Probabilidad y actualización bayesiana", "h2"),
      P("η = β₀ + Σ βᵥ · xᵥ        P(malestar) = 1 / (1 + e^(−η))", "mono"),
      P("βᵥ ~ Normal(κ · peso, (κ · desviación)²),   κ = ln(20)/9 ≈ 0,333   (peso 3 con desviación extrema ⇒ momios × 20)", "mono"),
      P("Con datos etiquetados (días con y sin malestar) se calcula el posterior con la aproximación de Laplace; ese posterior "
        "es el prior de la siguiente actualización. Una variable con probabilidad baja de tener efecto real se puede descartar."),
      P("3. Demostración con datos simulados (malestar 4, infección; 600 días)", "h2"),
      tabla([["Variable", "Peso inicial", "Peso actualizado", "\"Verdad\" simulada", "P(efecto)"],
             ["Pulso en reposo", "2,00", "2,36", "2,6", "1,000"], ["Temperatura", "3,00", "2,97", "3,0", "1,000"],
             ["Presión arterial", "1,00", "0,59", "0,0", "0,972"], ["PVT", "0,00", "−0,30", "0,0", "0,122"], ["CO₂ de cabina", "0,00", "−0,09", "0,0", "0,371"]],
            [4 * cm, 2.8 * cm, 3.2 * cm, 3.4 * cm, W - 13.4 * cm]),
      P("Los pesos se mueven hacia la verdad simulada; con pocos datos el prior fisiológico todavía pesa.", "pc"),

      P("4. Cómo encaja con el resto del equipo", "h2"),
      tabla([["Pieza", "De quién", "Qué hace", "Relación con estos pesos"],
             ["<b>LUNNA</b> (backend)", "Julio", "Predice cuánto cambia cada signo vital al cambiar de entorno y da el z de cada persona (bayesiano por variable)",
              "<b>Entrada directa</b>: su z alimenta los puntos de esta tabla. Comparte 5 variables (pulso, SpO₂, respiración, temperatura, presión) y espera priors de Leo e Iker"],
             ["Tabla de variables", "Iker", "Liga cada variable a un riesgo oficial del HRP (sin pesos)",
              "<b>Coherente</b>: PVT → pérdida de sueño/desempeño, ECG → cardiovascular, 4 variables → descompresión. Ya usamos sus mismos nombres oficiales de riesgo"],
             ["Matriz clínica", "Fani", "Reglas fijas WARNING/CRITICAL para 11 padecimientos (6 distintos a estos)",
              "<b>Complementaria</b>: sus reglas = alarma dura; estos pesos = índice gradual que aprende. Coinciden en radiación, infección, trombosis y fatiga"]],
            [3 * cm, 1.6 * cm, 5.5 * cm, W - 10.1 * cm]),
      P("Limitaciones", "h2"),
      P("• Ningún peso está validado en astronautas, salvo CO₂ → cefalea (nivel A).<br/>"
        "• Más de la mitad de los pesos son juicio fisiológico (C): conviene revisarlos con un médico.<br/>"
        "• Los nombres de riesgo usan los títulos oficiales del HRR, alineados con la tabla de Iker; el CO₂ no tiene riesgo HRR propio.<br/>"
        "• La HRV no está porque el reloj del equipo no envía intervalos RR.", "pc")]

# ---------- 5. Referencias ----------
H += [PageBreak(), P("Referencias (todas con DOI verificado en doi.org y Crossref)", "h1"),
      tabla([["Clave", "Referencia", "DOI"]] + [[k, v["cita"], v["doi"]] for k, v in REFS.items()],
            [2.6 * cm, W - 8.6 * cm, 6 * cm])]

doc.build(H)
print("PDF:", SALIDA)
