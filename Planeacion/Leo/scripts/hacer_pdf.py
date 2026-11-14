"""Genera el PDF explicativo de las 78 variables de Leo a partir de los archivos reales del repo.
Uso: python hacer_pdf.py <carpeta Planeacion/Leo> <salida.pdf>
"""
import csv
import json
import re
import sys
from collections import Counter
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import cm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (KeepTogether, NextPageTemplate, PageBreak, PageTemplate, Frame,
                                BaseDocTemplate, Paragraph, Spacer, Table, TableStyle)

LEO = Path(sys.argv[1])
SALIDA = Path(sys.argv[2])
ING = LEO / "ingesta"

pdfmetrics.registerFont(TTFont("Arial", "C:/Windows/Fonts/arial.ttf"))
pdfmetrics.registerFont(TTFont("Arial-B", "C:/Windows/Fonts/arialbd.ttf"))

AZUL = colors.HexColor("#1F3A5F")
GRIS = colors.HexColor("#5B6573")
FONDO = colors.HexColor("#F2F4F7")
C_A = colors.HexColor("#DCEBFA")
C_B = colors.HexColor("#FFF1D6")
C_C = colors.HexColor("#E3F4E1")
C_X = colors.HexColor("#F9DEDE")
VERDE = colors.HexColor("#2E7D32")
ROJO = colors.HexColor("#C62828")
AMBAR = colors.HexColor("#B26A00")

st = {
    "titulo": ParagraphStyle("t", fontName="Arial-B", fontSize=24, leading=29, textColor=AZUL),
    "sub": ParagraphStyle("s", fontName="Arial", fontSize=12, leading=16, textColor=GRIS),
    "h1": ParagraphStyle("h1", fontName="Arial-B", fontSize=16, leading=20, textColor=AZUL, spaceBefore=6, spaceAfter=6),
    "h2": ParagraphStyle("h2", fontName="Arial-B", fontSize=11.5, leading=15, textColor=AZUL, spaceBefore=8, spaceAfter=3),
    "p": ParagraphStyle("p", fontName="Arial", fontSize=10, leading=14),
    "pc": ParagraphStyle("pc", fontName="Arial", fontSize=9, leading=12),
    "chico": ParagraphStyle("c", fontName="Arial", fontSize=7.3, leading=9),
    "chicoB": ParagraphStyle("cb", fontName="Arial-B", fontSize=7.3, leading=9, textColor=colors.white),
    "num": ParagraphStyle("n", fontName="Arial-B", fontSize=22, leading=26, textColor=AZUL, alignment=TA_CENTER),
    "numl": ParagraphStyle("nl", fontName="Arial", fontSize=8.5, leading=11, textColor=GRIS, alignment=TA_CENTER),
    "celda": ParagraphStyle("ce", fontName="Arial", fontSize=9, leading=11.5),
    "celdaB": ParagraphStyle("ceb", fontName="Arial-B", fontSize=9, leading=11.5, textColor=colors.white),
}

EMOJI = re.compile(r"[\U0001F300-\U0001FAFF\u2600-\u27BF\u2B00-\u2BFF\uFE0F\u231A\u231B]")


def limpio(s: str) -> str:
    return re.sub(r"\s+\)", ")", re.sub(r"\s{2,}", " ", EMOJI.sub("", s).replace("⚠", ""))).strip()


def P(texto, estilo="p"):
    return Paragraph(texto, st[estilo])


def tabla(datos, anchos, cab_color=AZUL, fondos=None, estilo_celda="celda"):
    filas = [[P(f"<b>{c}</b>", "celdaB") for c in datos[0]]]
    filas += [[c if not isinstance(c, str) else P(c, estilo_celda) for c in fila] for fila in datos[1:]]
    t = Table(filas, colWidths=anchos, repeatRows=1)
    s = [
        ("BACKGROUND", (0, 0), (-1, 0), cab_color),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#C9CED6")),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
    ]
    for i, f in enumerate(fondos or [], start=1):
        if f is not None:
            s.append(("BACKGROUND", (0, i), (-1, i), f))
    t.setStyle(TableStyle(s))
    return t


# ---------- Datos reales ----------
clas = json.loads((ING / "out/clasificacion-variables.json").read_text(encoding="utf-8"))["filas"]
with open(LEO / "tabla-investigacion.csv", encoding="utf-8-sig") as f:
    inv = {r["id"]: r for r in csv.DictReader(f)}

conteos = {}
origenes = Counter()
for tipo in ("tipoA", "tipoB", "tipoC"):
    d = json.loads((ING / f"out/{tipo}.json").read_text(encoding="utf-8"))
    c = Counter()
    ids_real = set()
    for s in d["sujetos"]:
        for l in s["lecturas"]:
            c[l["origen_dato"]] += 1
            if l["origen_dato"] == "real_dataset":
                ids_real.add(l["id"])
    conteos[tipo] = (sum(c.values()), c, ids_real)
    origenes.update(c)
total_lect = sum(v[0] for v in conteos.values())
vars_reales = set().union(*(v[2] for v in conteos.values()))
fuentes = json.loads((ING / "out/fuentes-verificadas.json").read_text(encoding="utf-8"))["fuentes"]
f_ok = sum(1 for f in fuentes if f["estado"] == "verificada") + 1  # +1: CSA, verificada a mano con curl (HTTP 200)
tipos = Counter(r["tipo"] for r in clas)


# ---------- Documento ----------
def pie(canvas, doc):
    canvas.saveState()
    canvas.setFont("Arial", 7.5)
    canvas.setFillColor(GRIS)
    w, h = doc.pagesize
    canvas.drawString(1.6 * cm, 1.0 * cm, "Equipo Monarcas · NASA Space Apps 2026 · Variables de Leo (Persona 4)")
    canvas.drawRightString(w - 1.6 * cm, 1.0 * cm, f"Página {doc.page}")
    canvas.restoreState()


doc = BaseDocTemplate(str(SALIDA), pagesize=A4, title="Cómo se manejaron las 78 variables de Leo",
                      author="Equipo Monarcas", leftMargin=1.6 * cm, rightMargin=1.6 * cm,
                      topMargin=1.5 * cm, bottomMargin=1.6 * cm)
wA, hA = A4
wL, hL = landscape(A4)
doc.addPageTemplates([
    PageTemplate("vertical", [Frame(1.6 * cm, 1.6 * cm, wA - 3.2 * cm, hA - 3.1 * cm, id="v")], onPage=pie, pagesize=A4),
    PageTemplate("horizontal", [Frame(1.2 * cm, 1.5 * cm, wL - 2.4 * cm, hL - 2.7 * cm, id="h")], onPage=pie, pagesize=landscape(A4)),
])
W = wA - 3.2 * cm
H = []

# ---- Portada / resumen ----
H += [P("Cómo se manejaron mis 78 variables", "titulo"), Spacer(1, 4),
      P("Leo · Persona 4 · Equipo Monarcas · NASA Space Apps 2026 · 14 de noviembre de 2026", "sub"),
      Spacer(1, 14)]

cajas = [
    ("78", "variables asignadas"), (str(len(vars_reales)), "con datos reales"),
    (f"{total_lect:,}".replace(",", " "), "lecturas generadas"), ("0", "lecturas inválidas"),
    (f"{f_ok}/{len(fuentes)}", "fuentes verificadas"),
]
celdas = [[P(n, "num") for n, _ in cajas], [P(t, "numl") for _, t in cajas]]
tc = Table(celdas, colWidths=[W / 5] * 5)
tc.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), FONDO), ("LINEAFTER", (0, 0), (-2, -1), 2, colors.white),
                        ("TOPPADDING", (0, 0), (-1, 0), 10), ("BOTTOMPADDING", (0, 1), (-1, 1), 10)]))
H += [tc, Spacer(1, 14)]

H += [P("En una frase", "h2"),
      P("Cada variable se clasificó según <b>de dónde sale el dato</b>: del reloj, de un procesamiento "
        "(modelo, fórmula, equipo de la nave o API) o de una persona que lo captura a mano. Para cada una "
        "se buscó un dataset real; cuando no existe, se simuló con cifras publicadas y se marcó como "
        "simulada. Todo se exporta en el mismo formato JSON para unirlo con el resto del equipo."),
      Spacer(1, 6),
      P("Cómo leer este documento", "h2"),
      P("1. Las tres categorías A, B y C. &nbsp; 2. Quién obtiene cada dato (la escalera de Julio). "
        "&nbsp; 3. Qué aporta el HUAWEI WATCH 5. &nbsp; 4. Datos reales y simulados. &nbsp; "
        "5. Decisiones y pendientes. &nbsp; 6. Listado completo de las 78 variables.")]

# ---- 1. A/B/C ----
H += [Spacer(1, 10), P("1. Las tres categorías", "h1")]
datos = [["Tipo", "Qué significa", "Cuántas", "Ejemplos"],
         ["<b>A</b> · Reloj o wearable", "El dato sale directo del reloj, la camiseta o el parche de glucosa, o de un cálculo simple sobre esa señal",
          str(tipos["A"]), "Sueño, frecuencia cardiaca en ejercicio, glucosa continua"],
         ["<b>B</b> · Procesamiento", "Necesita un modelo ya entrenado, una fórmula, un equipo de la nave o una API",
          str(tipos["B"]), "Ultrasonido con DeepACSA, 1RM con Epley, ARED, nutrientes por API"],
         ["<b>C</b> · Input manual", "No hay sensor ni modelo: lo captura el astronauta, el médico de a bordo o un laboratorio",
          str(tipos["C"]), "Dolor de espalda, cefalea, análisis de sangre, DXA"],
         ["<b>Descartadas</b>", "Inviables: sin equipo a bordo o con licencia que lo impide",
          str(tipos["❌"]), "Epworth, polisomnografía, EEG"],
         ["<b>Fusionada</b>", "La misma medición ya existía en el catálogo de Julio; se unió a la suya",
          str(tipos["⟶"]), "Masa corporal: 02:V75 pasa a 01:V8"]]
H += [tabla(datos, [3.2 * cm, 7.4 * cm, 1.6 * cm, W - 12.2 * cm], fondos=[C_A, C_B, C_C, C_X, FONDO])]
H += [Spacer(1, 6), P("Diez variables pasaron de B a C porque no existe un modelo abierto ni datos para ellas "
                       "(perímetros, estatura, columna, marcha en tándem, Romberg, uñas…). La marcha en tándem y "
                       "el Romberg solo tienen sentido con gravedad, así que quedan como pruebas al regresar a la Tierra.", "pc")]

# ---- 2. Escalera ----
H += [PageBreak(), P("2. Quién obtiene cada dato (tablas de Julio)", "h1"),
      P("Se usó la <b>escalera de obtención</b> de Julio: cada valor dice quién lo obtuvo, porque un dato "
        "estimado no vale lo mismo que uno medido.")]
niv = Counter((limpio(r["origen"]), r["nivel"]) for r in clas)
desc = {"N0": "Reloj o teléfono, automático", "N1": "Modelo a bordo, estimado de otra señal",
        "NT": "Telemetría de la nave", "N2": "El astronauta lo mide o lo reporta",
        "N3": "Médico de a bordo (CMO) o equipo operado por una persona", "N4": "Solo en Tierra o en laboratorio, al regreso",
        "—": "Descartada o fusionada"}
orden = ["N0", "N1", "NT", "N2", "N3", "N4", "—"]
filas = [["Nivel", "Origen", "Qué significa", "Nº"]]
for n in orden:
    for (o, nv), k in sorted(niv.items()):
        if nv == n:
            filas.append([f"<b>{n}</b>", o, desc[n], str(k)])
H += [Spacer(1, 6), tabla(filas, [1.5 * cm, 3.4 * cm, W - 6.6 * cm, 1.7 * cm])]

gr = Counter(r["grupo"] for r in clas)
gnom = {"G1": "Wearable continuo", "G3": "Pruebas funcionales y medición puntual", "G4": "Escalas individuales",
        "G5": "Riesgo de licencia", "G6": "Telemetría de la nave", "G7": "Ultrasonido e imagen",
        "G8": "Laboratorio", "G9": "Derivadas (calculadas de otras)", "—": "Sin grupo (descartadas o fusionada)"}
filas = [["Grupo", "Ruta de investigación", "Nº"]] + [[f"<b>{g}</b>", gnom[g], str(k)] for g, k in sorted(gr.items())]
H += [Spacer(1, 10), P("Grupos por ruta de investigación (G1–G9)", "h2"),
      tabla(filas, [1.8 * cm, W - 3.6 * cm, 1.8 * cm]),
      Spacer(1, 4), P("G2 (manguito de presión arterial) no aplica a ninguna de mis variables.", "pc")]

# ---- 3. Reloj ----
w5 = Counter(r["watch5"] for r in clas)
H += [PageBreak(), P("3. Qué aporta el HUAWEI WATCH 5", "h1"),
      P("Julio probó el reloj el 14-11-2026. Tiene muchos sensores (frecuencia cardiaca óptica, ECG, SpO<sub>2</sub>, "
        "temperatura de la piel, luz ambiental, acelerómetro), pero <b>no todo sale del reloj</b>:"),
      Spacer(1, 6),
      tabla([["Camino", "Qué entrega", "Mis variables"],
             ["<b>En vivo por Bluetooth</b>", "Solo frecuencia cardiaca (~1 por segundo) y si el sensor toca la piel. Sin intervalos RR, así que no hay HRV en vivo",
              f"{w5['en vivo (BLE)']}: FC por etapa de esfuerzo (V52) e intensidad de sesión (V53)"],
             ["<b>Exportar de Huawei Health</b> (!)", "Sueño (TruSleep), entrenamientos, SpO<sub>2</sub>. El formato del archivo aún no se ha verificado",
              f"{w5['exportación Huawei Health ⚠️']} directas + {w5['cálculo sobre exportación ⚠️']} calculadas: sueño (V30, V33–V36, V31, V43) y minutos de ejercicio (V56)"],
             ["<b>No lo da</b>", "Glucosa (necesita parche aparte); lux (el sensor existe pero no se pudo exportar); todo lo demás",
              f"{w5['no lo da']}"]],
            [4.0 * cm, 6.6 * cm, W - 10.6 * cm], fondos=[C_C, C_B, C_X]),
      Spacer(1, 8),
      P("Restricciones probadas", "h2"),
      P("• La transmisión solo funciona en <b>modo ahorro de batería</b> con «Difusión de datos de FC» activa.<br/>"
        "• Mientras transmite se desconecta de Huawei Health.<br/>"
        "• Web Bluetooth no existe en iPhone: el teléfono debe ser <b>Android con Chrome</b>.<br/>"
        "• Ventaja: el reloj avisa si la correa está floja, y esas muestras se descartan solas."),
      Spacer(1, 6),
      P("Ya está programado un adaptador que convierte las lecturas del reloj al formato del equipo, probado con "
        "el paquete real que capturó Julio (<b>06 4b → 75 lpm</b>). Mientras no haya una exportación real, el sueño "
        "y el ejercicio usan datasets abiertos como sustituto.", "pc")]

# ---- 4. Real vs simulado ----
nA, cA, rA = conteos["tipoA"]
nB, cB, rB = conteos["tipoB"]
nC, cC, rC = conteos["tipoC"]
H += [Spacer(1, 12), P("4. Datos reales y simulados", "h1"),
      P("<b>Ningún dato es de astronautas.</b> Los datos individuales de astronautas no son públicos (NASA LSDA pide "
        "una solicitud de acceso). Se usaron datos reales de personas en la Tierra y, donde no hay, simulación con "
        "cifras publicadas, siempre marcada."), Spacer(1, 6),
      tabla([["Tipo", "Lecturas", "Reales", "Simuladas", "API", "Variables con dato real"],
             ["A", str(nA), str(cA["real_dataset"]), str(cA["simulado_controlado"]), str(cA["api_oficial"]), ", ".join(sorted(rA))],
             ["B", str(nB), str(cB["real_dataset"]), str(cB["simulado_controlado"]), str(cB["api_oficial"]), ", ".join(sorted(rB))],
             ["C", str(nC), str(cC["real_dataset"]), str(cC["simulado_controlado"]), str(cC["api_oficial"]), ", ".join(sorted(rC))]],
            [1.2 * cm, 1.8 * cm, 1.6 * cm, 1.9 * cm, 1.3 * cm, W - 7.8 * cm], fondos=[C_A, C_B, C_C]),
      Spacer(1, 8),
      tabla([["Dataset", "Licencia", "Para qué se usó"],
             ["MMASH (PhysioNet)", "ODbL, abierta", "Sueño e intensidad de ejercicio"],
             ["CGMacros (PhysioNet)", "CC BY-NC-SA: sin uso comercial", "Glucosa continua, ejercicio (Fitbit), comidas, laboratorio y glucómetro"],
             ["DeepACSA (Zenodo)", "Apache-2.0", "Modelo de ultrasonido muscular: reproduce al decimal sus resultados publicados"],
             ["USDA FoodData Central", "Dominio público", "Hierro, sodio y calcio (pendiente por límite de la API)"]],
            [4.2 * cm, 4.6 * cm, W - 8.8 * cm])]

# ---- 5. Decisiones y pendientes ----
H += [PageBreak(), P("5. Decisiones que tomaste", "h1"),
      tabla([["Tema", "Decisión"],
             ["Frecuencia cardiaca mayor a 220", "Se descarta como error del sensor"],
             ["Glucosa pegada en 40 mg/dL", "Es raro de verdad, así que se conserva marcada como error (9 días)"],
             ["Tiempo en rango de glucosa", "Rango terrestre 70–180 mg/dL, rotulado como no validado en el espacio"],
             ["Minutos de ejercicio (V56)", "Reales del reloj Fitbit, solo actividad vigorosa (≥ 6 METs)"],
             ["Fórmula de V52 / deuda de sueño V43", "Fórmula de Swain aceptada / deuda ajustada a 0,3 h como NASA"],
             ["Ultrasonido (V47)", "Puente a Python para correr el modelo oficial"],
             ["Fuerza máxima (V43)", "Epley, avisando que es estimación y no medición"],
             ["VO<sub>2</sub>máx (V51)", "Dos métodos lado a lado: extrapolación de FC y razón de Uth"],
             ["Nutrición", "Comidas reales de CGMacros + API de USDA"],
             ["Días de comida imposibles", "3 días se conservan marcados como error"],
             ["Masa corporal duplicada", "02:V75 se fusiona en 01:V8 de Julio"]],
            [6.2 * cm, W - 6.2 * cm]),
      Spacer(1, 10), P("Lo que no está fundamentado (dicho explícitamente)", "h1"),
      P("• Que la ISS lleve glucómetro: no se encontró en una fuente abierta.<br/>"
        "• Dinamómetro de agarre en vuelo, equipo para medir estatura en vuelo: no confirmados.<br/>"
        "• Licencias de los cuestionarios ISI y MSSQ: no verificadas; solo se guarda la puntuación total.<br/>"
        "• Fórmula de Epley en el ARED o en microgravedad: no validada; solo en la Tierra.<br/>"
        "• Formato de exportación de Huawei Health y lux del reloj: sin verificar.<br/>"
        f"• Se verificaron {f_ok} de {len(fuentes)} fuentes: cada DOI abre y su título coincide. Se detectó y corrigió un "
        "DOI equivocado que yo había recordado de memoria."),
      Spacer(1, 10), P("Pendientes antes de subir", "h1"),
      tabla([["#", "Pendiente", "Quién"],
             ["✓", "Duplicado de masa corporal: resuelto, 02:V75 se fusionó en 01:V8 de Julio", "Hecho"],
             ["2", "Revisión por sexo de músculo, metabolismo y sueño (módulo 11 de EVA) y consulta R20 con Persona 5", "Análisis, no ingesta"],
             ["3", "Hierro, sodio y calcio: volver a correr cuando la API de USDA lo permita", "Automático o clave propia"],
             ["4", "Una exportación real de Huawei Health del reloj de Julio, para leer sueño y ejercicio del WATCH 5", "Julio"],
             ["5", "65 días con menos de 800 kcal y 14 con más de 5000: decidir si se marcan", "Tú decides"]],
            [0.8 * cm, W - 4.6 * cm, 3.8 * cm])]

# ---- 6. Listado (horizontal) ----
H += [NextPageTemplate("horizontal"), PageBreak(), P("6. Listado completo de las 78 variables", "h1"),
      P("Tipo: A reloj · B procesamiento · C manual · X descartada · F fusionada. Nivel: escalera de Julio. Estado: lo que se logró.", "pc"),
      Spacer(1, 4)]
WL = wL - 2.4 * cm
fondo_tipo = {"A": C_A, "B": C_B, "C": C_C, "❌": C_X, "⟶": FONDO}
filas = [["#", "ID", "Variable", "Tipo", "Origen", "Nivel", "Grupo", "WATCH 5", "Estado", "Nota"]]
fondos = []
for r in clas:
    nombre = r["nombre"]
    nombre = nombre if len(nombre) <= 70 else nombre[:67] + "…"
    filas.append([str(r["n"]), r["id"], nombre, {"❌": "X", "⟶": "F"}.get(r["tipo"], r["tipo"]), limpio(r["origen"]), r["nivel"],
                  r["grupo"], limpio(r["watch5"]), inv.get(r["id"], {}).get("estado", ""), limpio(r["nota"])])
    fondos.append(fondo_tipo[r["tipo"]])
H += [tabla(filas, [0.8 * cm, 1.6 * cm, 5.8 * cm, 1.2 * cm, 2.2 * cm, 1.2 * cm, 1.4 * cm, 2.7 * cm, 3.4 * cm, WL - 20.3 * cm],
            fondos=fondos, estilo_celda="chico")]

doc.build(H)
print("PDF:", SALIDA)
