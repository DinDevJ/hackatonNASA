"""Genera Planeacion/Leo/tabla-investigacion.csv con las 78 variables de Leo.

Uso (desde la raiz del repo):  python Planeacion/Leo/scripts/gen_tabla.py Planeacion
OJO: sobrescribe el CSV. Solo correrlo para regenerar desde cero.
"""
import csv, re, sys

base = sys.argv[1]  # ruta a Planeacion/
cat = base + "/variables-diagnostico/"

def rows(fname, ids, layout):
    out = []
    for l in open(cat + fname, encoding="utf-8"):
        if not l.startswith("| V"):
            continue
        c = [x.strip() for x in l.strip().strip("|").split("|")]
        n = int(re.match(r"V(\d+)", c[0]).group(1))
        if any(a <= n <= b for a, b in ids):
            out.append(layout(c))
    return out

clean = lambda s: re.sub(r"\*\*", "", s)

def l02(c):  # ID|Variable|Unidad|Cómo|Qué señala|Umbral|Cambio|Entrada|Fuente
    return dict(id="02:" + c[0], nombre=c[1], unidad=c[2], como=c[3], umbral=c[5],
                entrada=c[7], fuente="Cat. 02 " + c[8], senala=c[4])

def l03(c):  # #|Variable|Unidad|Cómo|Qué señala|Corte|Cambio|Entrada|Licencia|Fuente
    lic = c[8] if c[8] not in ("—", "") else ""
    return dict(id="03:" + c[0], nombre=c[1], unidad=c[2], como=c[3], umbral=c[5],
                entrada=c[7], fuente="Cat. 03 " + c[9], senala=c[4], lic=lic)

vs = rows("02-hueso-musculo-rinon-nutricion.md", [(40, 97)], l02) + \
     rows("03-conducta-sueno-cognicion.md", [(30, 43), (49, 50), (82, 83)], l03)
assert len(vs) == 78, len(vs)

MAP = {"M": "manual", "W": "wearable", "C": "cámara/foto", "US": "ultrasonido",
       "LAB": "laboratorio", "DEV": "equipo de la nave"}

def metodo(v):
    e = v["entrada"]
    toks = re.findall(r"\b(US|LAB|DEV|M|W|C)\b", e)
    if toks:
        return " / ".join(dict.fromkeys(MAP[t] for t in toks))
    el = e.lower()
    if "wearable" in el: return "wearable"
    if "calculada" in el: return "calculado"
    if "no capturable" in el: return "no capturable en app"
    return "manual"

# Tratamiento (decisión nuestra, ver plan-de-accion-variables.md)
IMPORTA = {"V40","V41","V42","V43","V46","V49","V50","V63","V64","V66","V69","V72",
           "V76","V78","V80","V87","V89","V90","V91"}
DOCUMENTA03 = {"V40","V41","V42"}  # Epworth (licencia), PSG, EEG
CANDIDATAS = {"02:V75","02:V81","02:V83","02:V44","02:V53","02:V56","02:V52",
              "02:V58","02:V67a","03:V30","03:V43","03:V49"}

def tratamiento(v):
    blk, vid = v["id"].split(":")
    if blk == "03" and vid in DOCUMENTA03: return "C · Solo documentar"
    if blk == "02" and re.sub(r"[ab]$", "", vid) in IMPORTA: return "B · Importar resultado"
    return "A · Capturar en app"

def validacion(u):
    a = "[A" in u or "AST" in u or "NASA" in u
    t = "[T" in u or "CLIN" in u or "ADA" in u
    if a and t: return "NASA/astronautas + terrestre"
    if a: return "NASA/astronautas"
    if t: return "terrestre"
    if "ANÁLOGO" in u: return "análogo"
    return "sin umbral validado"

def factibilidad(v):
    c = v["como"].lower()
    if "solo en tierra" in c: return "solo tierra"
    if "congelad" in c: return "indirecta"
    if "no capturable" in v["entrada"].lower(): return "no verificada"
    return "directa" if tratamiento(v).startswith("A") else "indirecta"

cols = ["id","nombre","unidad","metodo_captura","fuente","dataset_url","formato",
        "modelo_existente","umbral","validacion","factibilidad_vuelo","dificultad",
        "utilidad","estado","observaciones"]

with open(base + "/Leo/tabla-investigacion.csv", "w", encoding="utf-8-sig", newline="") as f:
    w = csv.DictWriter(f, fieldnames=cols)
    w.writeheader()
    for v in vs:
        obs = tratamiento(v)
        if v["id"] in CANDIDATAS: obs += " · CANDIDATA PROTOTIPO"
        if v.get("lic"): obs += " · Licencia: " + v["lic"]
        w.writerow(dict(
            id=v["id"], nombre=clean(v["nombre"]), unidad=v["unidad"],
            metodo_captura=metodo(v), fuente=v["fuente"],
            dataset_url="PENDIENTE", formato="", modelo_existente="",
            umbral=clean(v["umbral"]), validacion=validacion(v["umbral"]),
            factibilidad_vuelo=factibilidad(v), dificultad="",
            utilidad=clean(v["senala"]), estado="Pendiente", observaciones=obs))
print("ok", len(vs))
