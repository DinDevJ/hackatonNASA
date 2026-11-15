"""Genera la tabla de pesos fisiológicos (malestar × variable) con su referencia y su prior bayesiano.
Uso: python generar_pesos.py   →   pesos.csv y pesos.json en esta carpeta.

Niveles de evidencia → incertidumbre del prior (desviación estándar sobre el peso):
  A = relación medida con número (fuente verificada)        → sd 0.5
  B = mecanismo documentado en una fuente verificada         → sd 1.0
  C = juicio fisiológico del equipo, sin fuente directa      → sd 1.5
Peso 0 = sin vía fisiológica conocida: prior centrado en 0 con sd 0.5 (los datos pueden subirlo).
Todas las DOI se verificaron en doi.org y Crossref el 14-11-2026.
"""
import csv, json, pathlib

REF = {
    "MISHRA2020": ("Mishra et al. 2020, Nat Biomed Eng — FC en reposo sube antes de los síntomas de infección", "10.1038/s41551-020-00640-6"),
    "ALAVI2022": ("Alavi et al. 2022, Nat Med — alertas por desviación de FC en reposo contra la línea base", "10.1038/s41591-021-01593-2"),
    "PEREZ2019": ("Perez et al. 2019, NEJM — reloj detecta fibrilación auricular por pulso irregular", "10.1056/NEJMoa1901183"),
    "LEE2015": ("Lee et al. 2015, Aerosp Med Hum Perform — intolerancia ortostática tras la ISS", "10.3357/AMHP.EC08.2015"),
    "GALLO2020": ("Gallo et al. 2020, npj Microgravity — modelo del desacondicionamiento cardiovascular en vuelo largo", "10.1038/s41526-020-00117-5"),
    "BARGER2014": ("Barger et al. 2014, Lancet Neurol — sueño corto en astronautas", "10.1016/S1474-4422(14)70122-X"),
    "BASNER2011": ("Basner y Dinges 2011, Sleep — sensibilidad del PVT a la pérdida de sueño", "10.1093/sleep/34.5.581"),
    "LAW2014": ("Law et al. 2014, J Occup Environ Med — +1 mmHg de CO₂ duplica la probabilidad de cefalea (ISS)", "10.1097/JOM.0000000000000158"),
    "MG2019": ("Marshall-Goebel et al. 2019, JAMA Netw Open — estasis y trombosis yugular en vuelo", "10.1001/jamanetworkopen.2019.15011"),
    "LEE2020": ("Lee et al. 2020, npj Microgravity — SANS y efectos neuro-oftalmológicos", "10.1038/s41526-020-0097-9"),
    "CRUCIAN2016": ("Crucian et al. 2016, Int J Gen Med — incidencia de síntomas clínicos en vuelo largo", "10.2147/IJGM.S114188"),
    "NEWS2013": ("Smith et al. 2013, Resuscitation — NEWS puntúa FC, respiración, SpO₂, temperatura y PA por desviación", "10.1016/j.resuscitation.2012.12.016"),
    "MEWS2001": ("Subbe et al. 2001, QJM — escala de alerta temprana por desviación de signos vitales", "10.1093/qjmed/94.10.521"),
    "BASNER2014": ("Basner et al. 2014, PLoS One — cambios psicológicos y conductuales en Mars-500", "10.1371/journal.pone.0093298"),
    "PNAS2026": ("PNAS 2026 — soledad, conflicto y cohesión en invernada antártica", "10.1073/pnas.2533420123"),
    "PALINKAS2008": ("Palinkas y Suedfeld 2008, Lancet — efectos psicológicos de expediciones polares", "10.1016/S0140-6736(07)61056-3"),
    "BASNER2013": ("Basner et al. 2013, PNAS — sueño e hipocinesia en Mars-500", "10.1073/pnas.1212646110"),
}
SD = {"A": 0.5, "B": 1.0, "C": 1.5}

MALESTARES = [
    (1, "Arritmia / fibrilación auricular", "Risk of Cardiovascular Adaptations Contributing to Adverse Mission Performance and Health Outcomes (HRR)"),
    (2, "Desacondicionamiento e intolerancia ortostática", "Risk of Cardiovascular Adaptations Contributing to Adverse Mission Performance and Health Outcomes (HRR)"),
    (3, "Hipoxia / problema respiratorio", "Risk of Reduced Crew Health and Performance Due to Hypoxia (HRR)"),
    (4, "Infección, fiebre o desregulación inmune", "Risk of In Mission Impacts, Adverse Health Events or Long-Term Health Impacts due to Altered Immune Response (HRR)"),
    (5, "Pérdida de sueño y desalineación circadiana", "Risk of Performance Decrements and Adverse Health Outcomes Resulting from Sleep Loss, Circadian Desynchronization, and Work Overload (HRR)"),
    (6, "Fatiga y deterioro cognitivo", "Risk of Performance Decrements and Adverse Health Outcomes Resulting from Sleep Loss, Circadian Desynchronization, and Work Overload (HRR); Risk of Adverse Cognitive or Behavioral Changes and Psychiatric Disorders Leading to In-mission Health and Performance and Long-term Health Effects (HRR)"),
    (7, "Exposición a CO₂ / dolor de cabeza", "Sin riesgo HRR propio; peligro HRP Hostile/Closed Environments (igual que Iker)"),
    (8, "Radiación aguda por evento solar", "Risk of Acute Radiation Syndromes Due to Solar Particle Events (Evidence Report, NTRS 20160003870)"),
    (9, "Estrés / salud conductual", "Risk of Adverse Cognitive or Behavioral Changes and Psychiatric Disorders Leading to In-mission Health and Performance and Long-term Health Effects (HRR)"),
    (10, "Enfermedad por descompresión tras EVA", "Risk of Mission Impacts and Long-Term Health Issues due to Decompression Sickness (HRR)"),
    (11, "Trombosis yugular y SANS", "Risk of Cardiovascular Adaptations Contributing to Adverse Mission Performance and Health Outcomes (trombosis, HRR); Risk of Spaceflight Associated Neuro-ocular Syndrome (SANS) (HRR)"),
]
VARIABLES = ["fc_reposo", "spo2", "respiracion", "temperatura", "presion_arterial", "sueno", "pvt_lapsos", "co2_cabina", "sintomas"]
# ID de catálogo de cada variable (para unir con LUNNA de Julio y la tabla de Iker). Dueño entre paréntesis.
ID_CATALOGO = {
    "fc_reposo": "04:A4 / 01:V3 (Julio)", "spo2": "04:A3 (Julio)", "respiracion": "04:A2 (Julio)",
    "temperatura": "04:A1 (Julio)", "presion_arterial": "01:V1 (Julio)", "sueno": "03:V30 (Leo)",
    "pvt_lapsos": "03:V66 (Iker)", "co2_cabina": "04:A23 (Julio)",
    "sintomas": "02:V67a, 03:V82, 04:A40–A50 (Leo, Persona 5)",
}

# (malestar, variable): (peso 0–3, dirección, nivel A/B/C, referencia o None, mecanismo)
P = {
    # 1 Arritmia
    (1, "fc_reposo"): (3, "irregular", "A", "PEREZ2019", "El pulso irregular es la medida directa de la fibrilación auricular."),
    (1, "spo2"): (1, "↓", "C", None, "Una arritmia rápida puede bajar el gasto cardiaco y la oxigenación."),
    (1, "presion_arterial"): (1, "↓", "C", None, "Frecuencias muy rápidas reducen el llenado y bajan la PA."),
    (1, "sintomas"): (2, "palpitaciones, mareo", "B", "CRUCIAN2016", "Síntomas cardiovasculares reportados en vuelo largo."),
    # 2 Ortostática
    (2, "fc_reposo"): (2, "↑ al ponerse de pie", "B", "LEE2015", "Taquicardia compensatoria por menor volumen plasmático tras el vuelo."),
    (2, "presion_arterial"): (3, "↓ al ponerse de pie", "A", "LEE2015", "La caída de PA al ponerse de pie define la intolerancia ortostática."),
    (2, "sintomas"): (2, "mareo, presíncope", "B", "LEE2015", "Presíncope como manifestación clínica."),
    (2, "sueno"): (0, "—", "C", None, "Sin vía fisiológica directa conocida."),
    # 3 Hipoxia
    (3, "fc_reposo"): (2, "↑", "B", "NEWS2013", "La hipoxia activa la respuesta simpática (FC puntuada en NEWS)."),
    (3, "spo2"): (3, "↓", "A", "NEWS2013", "La SpO₂ es la medida directa de la oxigenación (puntuada en NEWS)."),
    (3, "respiracion"): (3, "↑", "B", "NEWS2013", "Taquipnea compensatoria (frecuencia respiratoria puntuada en NEWS)."),
    (3, "presion_arterial"): (1, "↑/↓", "C", None, "Respuesta hemodinámica variable."),
    (3, "pvt_lapsos"): (1, "↑", "C", None, "La hipoxia afecta la función cognitiva."),
    (3, "co2_cabina"): (2, "↑", "B", "LAW2014", "El ambiente de cabina altera la ventilación; CO₂ alto documentado en la ISS."),
    (3, "sintomas"): (2, "disnea", "C", None, "Falta de aire como síntoma."),
    # 4 Infección
    (4, "fc_reposo"): (2, "↑", "A", "MISHRA2020", "La FC en reposo sube antes de los síntomas de infección (medido con relojes)."),
    (4, "spo2"): (1, "↓", "B", "NEWS2013", "Infección respiratoria puede bajar la SpO₂ (puntuada en NEWS)."),
    (4, "respiracion"): (1, "↑", "B", "NEWS2013", "Taquipnea en infección sistémica (puntuada en NEWS)."),
    (4, "temperatura"): (3, "↑", "B", "NEWS2013", "La fiebre es el marcador directo (temperatura puntuada en NEWS)."),
    (4, "presion_arterial"): (1, "↓", "B", "NEWS2013", "Hipotensión en infección grave (PA sistólica puntuada en NEWS)."),
    (4, "sueno"): (1, "↓", "B", "ALAVI2022", "El sistema de alertas de Alavi usa sueño junto con FC."),
    (4, "sintomas"): (2, "fiebre, erupción, tos", "A", "CRUCIAN2016", "Erupciones e infecciones respiratorias: ≈3,4 eventos por año-vuelo."),
    # 5 Sueño
    (5, "fc_reposo"): (1, "↑", "C", None, "La privación de sueño eleva el tono simpático."),
    (5, "temperatura"): (1, "fase", "C", None, "La temperatura corporal marca la fase circadiana."),
    (5, "sueno"): (3, "↓", "A", "BARGER2014", "Medida directa: horas de sueño por actigrafía en astronautas."),
    (5, "pvt_lapsos"): (2, "↑", "A", "BASNER2011", "El PVT es sensible a la pérdida de sueño."),
    (5, "co2_cabina"): (1, "↑", "C", None, "CO₂ alto podría empeorar el sueño (no verificado)."),
    (5, "sintomas"): (1, "somnolencia", "C", None, "Somnolencia reportada."),
    # 6 Fatiga / cognición
    (6, "fc_reposo"): (1, "↑", "C", None, "La fatiga acumulada se asocia a tono simpático alto."),
    (6, "sueno"): (2, "↓", "A", "BARGER2014", "El sueño corto precede a la fatiga."),
    (6, "pvt_lapsos"): (3, "↑", "A", "BASNER2011", "Medida objetiva directa de la vigilancia."),
    (6, "co2_cabina"): (1, "↑", "C", None, "CO₂ alto asociado a peor desempeño cognitivo (ver catálogo 03)."),
    (6, "sintomas"): (1, "cansancio", "C", None, "Fatiga reportada."),
    # 7 CO₂ / cefalea
    (7, "fc_reposo"): (1, "↑", "C", None, "La hipercapnia estimula la respuesta simpática."),
    (7, "respiracion"): (2, "↑", "C", None, "El CO₂ alto estimula la ventilación."),
    (7, "pvt_lapsos"): (1, "↑", "C", None, "Posible efecto cognitivo del CO₂."),
    (7, "co2_cabina"): (3, "↑", "A", "LAW2014", "+1 mmHg de CO₂ duplica la probabilidad de reportar cefalea (ISS)."),
    (7, "sintomas"): (3, "cefalea", "A", "LAW2014", "La cefalea reportada es el desenlace medido."),
    # 8 Radiación aguda
    (8, "fc_reposo"): (1, "↑", "C", None, "Respuesta inespecífica al estrés agudo."),
    (8, "temperatura"): (1, "↑", "C", None, "Respuesta inflamatoria posible."),
    (8, "pvt_lapsos"): (1, "↑", "C", None, "Posible efecto sobre el sistema nervioso central."),
    (8, "sintomas"): (2, "náusea, vómito", "C", None, "Síntomas prodrómicos del síndrome agudo (ver catálogo 01). La dosis de DONKI/dosímetro es la variable principal."),
    # 9 Estrés
    (9, "fc_reposo"): (1, "↑", "C", None, "Activación simpática por estrés."),
    (9, "respiracion"): (1, "↑", "C", None, "Respiración acelerada con ansiedad."),
    (9, "presion_arterial"): (1, "↑", "C", None, "Activación simpática."),
    (9, "sueno"): (2, "↓", "B", "BASNER2013", "Cambios de sueño en confinamiento largo (Mars-500)."),
    (9, "pvt_lapsos"): (1, "↑", "C", None, "El estrés afecta la atención."),
    (9, "sintomas"): (3, "ánimo, conflicto", "B", "BASNER2014", "Cambios psicológicos medidos por cuestionario en Mars-500; ver también PNAS2026 y PALINKAS2008."),
    # 10 Descompresión
    (10, "fc_reposo"): (1, "↑", "C", None, "Respuesta inespecífica."),
    (10, "spo2"): (1, "↓", "C", None, "Burbujas pulmonares podrían bajar la oxigenación."),
    (10, "respiracion"): (1, "↑", "C", None, "Síntomas respiratorios posibles."),
    (10, "presion_arterial"): (1, "↓", "C", None, "Casos graves con compromiso hemodinámico."),
    (10, "sintomas"): (3, "dolor articular tras EVA", "C", None, "Dolor articular como síntoma clásico (sin fuente verificada en este paquete). Variable clave: perfil de presión del traje."),
    # 11 Trombosis / SANS
    (11, "co2_cabina"): (1, "↑", "C", None, "Posible contribución a la presión intracraneal (hipótesis)."),
    (11, "sintomas"): (3, "visión borrosa, dolor de cuello", "B", "MG2019", "Síntomas guía; el diagnóstico es por ultrasonido (MG2019) y examen ocular (LEE2020)."),
}

filas = []
for mid, mal, riesgo in MALESTARES:
    for v in VARIABLES:
        peso, dirc, nivel, ref, mec = P.get((mid, v), (0, "—", "C", None, "Sin vía fisiológica conocida: se descarta para este malestar."))
        sd = 0.5 if peso == 0 else SD[nivel]
        texto, doi = REF[ref] if ref else ("Juicio fisiológico del equipo (sin fuente directa)", "")
        filas.append({
            "malestar_id": mid, "malestar": mal, "riesgo_nasa": riesgo, "variable": v, "id_catalogo": ID_CATALOGO[v],
            "peso_fisiologico": peso, "direccion": dirc, "nivel_evidencia": nivel,
            "mecanismo": mec, "referencia": texto, "doi": doi, "url": f"https://doi.org/{doi}" if doi else "",
            "prior_media": float(peso), "prior_de": sd,
        })

aqui = pathlib.Path(__file__).parent
with open(aqui / "pesos.csv", "w", encoding="utf-8-sig", newline="") as f:
    w = csv.DictWriter(f, fieldnames=list(filas[0].keys()))
    w.writeheader(); w.writerows(filas)
(aqui / "pesos.json").write_text(json.dumps({
    "descripcion": "Pesos fisiológicos (0–3) por malestar × variable, con prior Normal(prior_media, prior_de) para actualización bayesiana.",
    "variables": VARIABLES, "id_catalogo": ID_CATALOGO, "niveles": {"A": "relación medida", "B": "mecanismo documentado", "C": "juicio fisiológico"},
    "referencias": {k: {"cita": t, "doi": d, "url": f"https://doi.org/{d}"} for k, (t, d) in REF.items()},
    "pesos": filas}, ensure_ascii=False, indent=1), encoding="utf-8")

from collections import Counter
c = Counter((r["nivel_evidencia"], r["peso_fisiologico"] > 0) for r in filas)
print(f"{len(filas)} celdas · con peso > 0: {sum(1 for r in filas if r['peso_fisiologico'] > 0)}")
print("con peso>0 por nivel:", {k: c[(k, True)] for k in 'ABC'}, "· descartadas (peso 0):", sum(1 for r in filas if r['peso_fisiologico'] == 0))
