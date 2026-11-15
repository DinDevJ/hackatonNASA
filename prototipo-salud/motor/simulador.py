"""Generador de la tripulacion SIMULADA (ALGORITMOS.md h.2; DISENO.md §3.1).

Escribe en `datos/simulado/`: `tripulacion_simulada.csv` (CSV nativo del motor), `tripulacion_simulada.json` (mision,
perfiles, escenarios) y `LEEME.md`. **Todo es SIMULADO: valores sinteticos, sin relacion fisiologica real, no son datos de
astronautas ni de ninguna persona.** Variables independientes con ruido alrededor de medias arbitrarias; solo ejercita el
flujo del motor. Ninguna cifra de aqui es una validacion ni un resultado. Todo numero es `provisional`.

Uso:  python -m motor.simulador        (determinista con la semilla)
Solo numpy, pandas y biblioteca estandar.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

RAIZ = Path(__file__).resolve().parents[1]
SIMULADO_DIR = RAIZ / "datos" / "simulado"
PV_CSV = RAIZ / "datos" / "modelo" / "PADECIMIENTO-VARIABLE.csv"
ARCHIVO = "tripulacion_simulada"
SEMILLA_DEFECTO = 20261114

NOTA_SIM = "SIMULADO: valor sintético, no es fisiología real ni de astronautas"
COLUMNAS_CSV = ["subject_id", "timestamp", "variable_id", "value", "unit", "device_class", "quality", "context", "method",
                "simulated", "notes"]
PADECIMIENTOS = ("P03", "P04", "P05", "P06", "P07", "P10", "P16", "P18", "P19")
PERSONAS = ("SIM-T01", "SIM-T02", "SIM-T03", "SIM-T04", "SIM-T05")

# ---------------------------------------------------------------------------------------------- parametros
# Todo es provisional: magnitudes en multiplos de la DE simulada (`de` de cada variable); ajustables sin tocar el codigo.
PARAMETROS: dict[str, Any] = {
    "provisional": True,
    "inicio": "2026-09-01",            # PRE: 2026-09-01 .. 2026-09-12 (12 dias)
    "lanzamiento": "2026-09-13",       # vuelo: 2026-09-13 .. 2026-09-30 (18 dias)
    "fin": "2026-09-30",
    "ruido_max_de": 1.0,               # PRE: cota del ruido (en DE simulada); 12 desviaciones simetricas equiespaciadas
    "ruido_max_de_vuelo": 0.5,         # vuelo: ruido mas acotado, para que el control (T01) quede 'dentro de su base' (provisional)
    "entre_personas_de": 0.8,          # DE entre personas de la media arbitraria, en multiplos de la DE simulada
    "hora_signos": "03:00:00",         # signos 'nocturnos' (FC, SpO2, FR, temperatura, PA)
    "hora_resto": "08:00:00",
    "salto_T02": {"persona": "SIM-T02", "variables": ["04:A1", "01:V3"], "desde": "2026-09-27", "hasta": "2026-09-30",
                  "magnitud_de": 5.0},
    "rampa_T03": {"persona": "SIM-T03", "variable": "03:V30", "desde": "2026-09-13", "hasta": "2026-09-30",
                  "pendiente_de_por_dia": -0.10},
    "faltantes_T04": {
        "persona": "SIM-T04",
        "sin_filas_en_vuelo": ["04:A3", "04:A2", "04:A25"],     # SpO2, FR y PIO2: nucleo de P03
        "sin_dato": [
            {"variable_id": "01:V3", "fecha": "2026-09-16", "motivo": "sensor desconectado"},
            {"variable_id": "01:V3", "fecha": "2026-09-17", "motivo": "sensor desconectado"},
            {"variable_id": "04:A1", "fecha": "2026-09-20", "motivo": "termometro no disponible"},
            {"variable_id": "03:V30", "fecha": "2026-09-22", "motivo": "actigrafo sin sincronizar"},
            {"variable_id": "03:V66", "fecha": "2026-09-24", "motivo": "prueba no realizada"},
            {"variable_id": "04:A23", "fecha": "2026-09-26", "motivo": "analizador en mantenimiento"},
        ],
    },
    "n4_T05": {
        "persona": "SIM-T05",
        "pa_cuffless": {"variable_id": "01:V1", "desde": "2026-09-28", "hasta": "2026-09-30", "magnitud_de": 8.0},
        "adaptador_ecg": {"desde": "2026-09-28", "hasta": "2026-09-30", "V31_bandera": 1, "V34_qtc_ms": 470.0},
    },
    "compartida": {"variable": "04:A23", "desde": "2026-09-18", "hasta": "2026-09-18", "magnitud_de": 1.5,
                   "personas": list(PERSONAS)},
}

# Las 7 variables con rango plausible en c.2 (media y DE simuladas; la DE es el ruido dia a dia). Provisional.
VARIABLES_PLAUSIBLES: dict[str, dict] = {
    "01:V3": dict(media=60.0, de=2.5, unidad="bpm", decimales=2),
    "04:A3": dict(media=97.0, de=0.6, unidad="%", decimales=2, tope_media=98.5),
    "04:A2": dict(media=15.0, de=1.0, unidad="rpm", decimales=2),
    "04:A1": dict(media=36.6, de=0.2, unidad="°C", decimales=3),
    "03:V17": dict(media=40.0, de=5.0, unidad="ms", decimales=2),
    "03:V30": dict(media=7.0, de=0.5, unidad="h", decimales=3),
    "04:A23": dict(media=2.0, de=0.15, unidad="mmHg", decimales=3),
}
ARBITRARIA = dict(media=100.0, de=5.0, unidad="u.a. SIMULADA", decimales=3)
UNIDAD_PRESENCIA = "presencia_0_1"

CLASE_FIJA = {"01:V3": "ecg_prenda_holter", "04:A3": "oximetro_dedo", "04:A2": "bandas_toracicas",
              "04:A1": "termometro_oral", "03:V30": "actigrafia", "04:A23": "analizador_cabina",
              "03:V66": "pvt_laptop", "03:V65": "pvt_laptop", "03:V67": "pvt_laptop"}
LABORATORIO = {"04:A10", "04:A11", "04:A12", "04:A14", "04:A22a", "04:A22b", "04:A22f", "04:A21", "04:A34", "02:V76",
               "02:V78", "02:V80", "03:V46", "03:V48"}
SINTOMAS = {"03:V82", "03:V83", "04:A6", "04:A7", "04:A8", "04:A36", "04:A37", "04:A39", "04:A50", "02:V67a", "02:V74",
            "02:V58", "04:A43", "04:A46", "04:A17", "04:A44", "04:A49", "04:A18", "04:A19", "03:V37", "03:V55", "03:V5",
            "03:V11", "03:V60", "04:A40", "R24", "03:V84"}
COGNITIVAS = {f"03:V{n}" for n in range(68, 77)}
CONTEXTO = {"01:V3": "sueno", "04:A3": "sueno", "04:A2": "reposo", "01:V1": "reposo"}
METODO = {"04:A1": "termometro", "04:A23": "sensor_cabina"}
SIGNOS_NOCTURNOS = {"01:V3", "04:A3", "04:A2", "04:A1", "01:V1"}

PERFILES = {"SIM-T01": {"edad": 38, "sexo": "M"}, "SIM-T02": {"edad": 42, "sexo": "F"},
            "SIM-T03": {"edad": 35, "sexo": "M"}, "SIM-T04": {"edad": 45, "sexo": "F"},
            "SIM-T05": {"edad": 40, "sexo": "M"}}


# ---------------------------------------------------------------------------------------------- variables
def _es_continua(direcciones: list[str]) -> bool:
    """Provisional (S10): continua si alguna direccion empieza por flecha y no es de 'uso'; o es 'cambio'.
    Todo lo demas (presente, positivo, alterada, irregular, fenotipo...) se simula como presencia 0/1."""
    for d in direcciones:
        s = str(d).strip().lower()
        if s == "cambio" or (s[:1] in ("↑", "↓") and "uso" not in s):
            return True
    return False


def variables_a_simular(pv_csv: Path = PV_CSV) -> list[dict]:
    """Variables `sí en vuelo` de los padecimientos P03, P04, P05, P06, P07, P10, P16, P18 y P19 (una por variable_id)."""
    pv = pd.read_csv(pv_csv, dtype=str, keep_default_na=False)
    pv = pv[pv["padecimiento_id"].isin(PADECIMIENTOS) & (pv["medido_en_vuelo"] == "sí en vuelo")]
    out = []
    for vid, g in pv.groupby("variable_id", sort=True):
        continua = _es_continua(g["direccion"].tolist())
        spec = VARIABLES_PLAUSIBLES.get(vid, ARBITRARIA) if continua else {}
        if vid in CLASE_FIJA:
            clase = CLASE_FIJA[vid]
        elif vid in SINTOMAS:
            clase = "autorreporte"
        elif vid in LABORATORIO:
            clase = "laboratorio"
        elif vid in COGNITIVAS:
            clase = "prueba_cognitiva"
        else:
            clase = "captura_manual"
        out.append({
            "variable_id": vid, "variable": g["variable"].iloc[0], "tipo": "continua" if continua else "presencia",
            "direcciones": sorted(set(g["direccion"])), "padecimientos": sorted(set(g["padecimiento_id"])),
            "unidad": spec.get("unidad", UNIDAD_PRESENCIA), "media_base": spec.get("media") if continua else 0.0,
            "de": spec.get("de") if continua else None, "decimales": spec.get("decimales", 0),
            "tope_media": spec.get("tope_media"), "device_class": clase,
            "rango_plausible": vid in VARIABLES_PLAUSIBLES,
            "provisional": True,
        })
    return out


# ---------------------------------------------------------------------------------------------- generacion
def _normal_truncada(rng: np.random.Generator, n: int, tope: float) -> np.ndarray:
    z = rng.standard_normal(n)
    mal = np.abs(z) > tope
    while mal.any():
        z[mal] = rng.standard_normal(int(mal.sum()))
        mal = np.abs(z) > tope
    return z


def _fmt(x: float, dec: int) -> str:
    return f"{round(float(x), dec):.{dec}f}".rstrip("0").rstrip(".") if dec else str(int(round(float(x))))


def _rango(desde: str, hasta: str) -> set[str]:
    return {d.strftime("%Y-%m-%d") for d in pd.date_range(desde, hasta, freq="D")}


def generar(dir_salida: str | Path | None = None, semilla: int = SEMILLA_DEFECTO) -> dict:
    """Genera la tripulacion SIMULADA y escribe CSV, JSON y LEEME.md en `dir_salida` (por defecto `datos/simulado/`)."""
    P = PARAMETROS
    d_out = Path(dir_salida) if dir_salida is not None else SIMULADO_DIR
    if not d_out.is_absolute() and dir_salida is not None:
        d_out = RAIZ / d_out
    d_out.mkdir(parents=True, exist_ok=True)

    variables = variables_a_simular()
    dias = [d.strftime("%Y-%m-%d") for d in pd.date_range(P["inicio"], P["fin"], freq="D")]
    n = len(dias)
    idx = {d: i for i, d in enumerate(dias)}
    lanz_i = idx[P["lanzamiento"]]
    pre = [d for d in dias if d < P["lanzamiento"]]
    assert len(pre) == 12 and n == 30, "el diseno h.2 pide 12 dias PRE y 30 dias en total"
    compart = P["compartida"]
    f_compart = _rango(compart["desde"], compart["hasta"])
    salto, rampa = P["salto_T02"], P["rampa_T03"]
    f_salto = _rango(salto["desde"], salto["hasta"])
    f_rampa = _rango(rampa["desde"], rampa["hasta"])
    t4, t5 = P["faltantes_T04"], P["n4_T05"]
    sin_dato_t4 = {(s["variable_id"], s["fecha"]): s["motivo"] for s in t4["sin_dato"]}
    f_pa = _rango(t5["pa_cuffless"]["desde"], t5["pa_cuffless"]["hasta"])
    f_ecg = _rango(t5["adaptador_ecg"]["desde"], t5["adaptador_ecg"]["hasta"])
    vuelo = [d for d in dias if d >= P["lanzamiento"]]

    filas: list[dict] = []

    def fila(sid, dia, vid, valor, unidad, clase, quality, ctx, metodo, extra=""):
        hora = P["hora_signos"] if vid in SIGNOS_NOCTURNOS else P["hora_resto"]
        filas.append({
            "subject_id": sid, "timestamp": f"{dia}T{hora}", "variable_id": vid,
            "value": "" if valor is None else valor, "unit": unidad, "device_class": clase, "quality": quality,
            "context": ctx or "", "method": metodo or "", "simulated": "true",
            "notes": NOTA_SIM + "; provisional" + (f"; {extra}" if extra else "")})

    for p_i, sid in enumerate(PERSONAS):
        rng = np.random.default_rng([semilla, p_i])
        # 1) media arbitraria por persona y ruido (se sortean primero para que los escenarios no cambien el resto)
        medias: dict[str, float] = {}
        ruido: dict[str, np.ndarray] = {}
        for v in variables:
            if v["tipo"] != "continua":
                continue
            m = v["media_base"] + v["de"] * P["entre_personas_de"] * float(rng.standard_normal())
            if v["tope_media"] is not None:
                m = min(m, v["tope_media"])
            medias[v["variable_id"]] = m
            k_ = lanz_i // 2                                                    # ruido PRE simetrico y equiespaciado
            mitad = P["ruido_max_de"] * (np.arange(k_) + 0.5) / k_               # (+-1/12 ... +-11/12 de la cota), en orden
            z_pre = rng.permutation(np.concatenate([mitad, -mitad]))            # aleatorio: media muestral PRE = media de la persona
            ruido[v["variable_id"]] = np.concatenate([z_pre, rng.uniform(-P["ruido_max_de_vuelo"], P["ruido_max_de_vuelo"],
                                                                        n - lanz_i)])

        for v in variables:
            vid, clase = v["variable_id"], v["device_class"]
            for dia in dias:
                en_vuelo = dia >= P["lanzamiento"]
                if sid == t4["persona"] and en_vuelo and vid in t4["sin_filas_en_vuelo"]:
                    continue
                if sid == t4["persona"] and (vid, dia) in sin_dato_t4:
                    fila(sid, dia, vid, None, v["unidad"], clase, f"sin_dato: {sin_dato_t4[(vid, dia)]}",
                         CONTEXTO.get(vid), METODO.get(vid), "escenario SIM-T04: faltante con motivo (provisional)")
                    continue
                extra = ""
                clase_f, quality = clase, "buena"
                if v["tipo"] == "presencia":
                    valor, dec = 0, 0
                else:
                    i = idx[dia]
                    z = float(ruido[vid][i])
                    if vid == compart["variable"] and dia in f_compart and sid in compart["personas"]:
                        z += compart["magnitud_de"]
                        extra = f"desviacion compartida +{compart['magnitud_de']:g} DE (provisional)"
                    if sid == salto["persona"] and vid in salto["variables"] and dia in f_salto:
                        z += salto["magnitud_de"]
                        extra = f"escenario SIM-T02: salto brusco +{salto['magnitud_de']:g} DE (provisional)"
                    if sid == rampa["persona"] and vid == rampa["variable"] and dia in f_rampa:
                        k = i - lanz_i
                        z += rampa["pendiente_de_por_dia"] * k
                        extra = (f"escenario SIM-T03: rampa {rampa['pendiente_de_por_dia']:g} DE/dia, "
                                 f"dia {k} desde el lanzamiento (provisional)")
                    if sid == t5["persona"] and vid == t5["pa_cuffless"]["variable_id"]:
                        clase_f = "cuffless"
                        extra = "escenario SIM-T05: PA cuffless (N4)"
                        if dia in f_pa:
                            z += t5["pa_cuffless"]["magnitud_de"]
                            extra += f"; muy desviada +{t5['pa_cuffless']['magnitud_de']:g} DE (provisional)"
                    valor = medias[vid] + v["de"] * z
                    if vid == "04:A3":
                        valor = min(valor, 100.0)             # G5: SpO2 <= 100
                    dec = v["decimales"]
                fila(sid, dia, vid, _fmt(valor, dec), v["unidad"], clase_f, quality, CONTEXTO.get(vid), METODO.get(vid),
                     extra)

        if sid == t5["persona"]:                               # filas tipo adaptador ECG (N4): ultimos 3 dias
            ecg = t5["adaptador_ecg"]
            for dia in [d for d in vuelo if d in f_ecg]:
                fila(sid, dia, "01:V31", _fmt(ecg["V31_bandera"], 0), "bandera_0_1_no_diagnostica", "ecg_adaptador",
                     "BANDERA_EXPERIMENTAL_NO_DIAGNOSTICO", None, None,
                     "escenario SIM-T05: fila tipo adaptador ECG (N4, experimental)")
                fila(sid, dia, "01:V34", _fmt(ecg["V34_qtc_ms"], 1), "ms", "ecg_adaptador", "experimental_delineacion_dwt",
                     None, None, "escenario SIM-T05: fila tipo adaptador ECG (N4, experimental)")

    df = pd.DataFrame(filas, columns=COLUMNAS_CSV).sort_values(["subject_id", "timestamp", "variable_id"], kind="stable")
    csv_p, json_p, md_p = d_out / f"{ARCHIVO}.csv", d_out / f"{ARCHIVO}.json", d_out / "LEEME.md"
    df.to_csv(csv_p, index=False, lineterminator="\n", encoding="utf-8")

    extras = [{"variable_id": "01:V31", "variable": "Bandera de ritmo irregular (tipo adaptador ECG)", "tipo": "presencia",
               "unidad": "bandera_0_1_no_diagnostica", "device_class": "ecg_adaptador", "solo_persona": "SIM-T05",
               "provisional": True},
              {"variable_id": "01:V34", "variable": "QTc (tipo adaptador ECG)", "tipo": "continua", "unidad": "ms",
               "device_class": "ecg_adaptador", "solo_persona": "SIM-T05", "provisional": True}]
    meta = {
        "simulated": True, "etiqueta": "SIMULADO", "provisional": True,
        "nota": ("SIMULADO: datos sintéticos, no es fisiología real ni de astronautas; variables independientes con ruido "
                 "alrededor de medias arbitrarias; solo ejercita el flujo del motor (h.2). Ninguna cifra es una validación. "
                 "Todos los números son provisional."),
        "semilla": semilla,
        "mision": {s: {"lanzamiento": P["lanzamiento"], "aterrizaje": None} for s in PERSONAS},
        "perfiles": {s: dict(PERFILES[s]) for s in PERSONAS},
        "perfiles_nota": "edad y sexo INVENTADOS para ejercitar el flujo (SIMULADO, provisional)",
        "dias": {"pre": [pre[0], pre[-1]], "vuelo": [vuelo[0], vuelo[-1]], "n_dias": n},
        "parametros": P,
        "escenarios": [
            {"persona": "SIM-T01", "que": "control: todo dentro de su base, cobertura completa, sin anomalías inyectadas "
                                          "(salvo la desviación compartida de ppCO2)",
             "dias": [dias[0], dias[-1]], "resultado_esperado": "VERDE donde la cobertura lo permita (escenario 1 de h.2)"},
            {"persona": "SIM-T02", "que": f"salto brusco de +{salto['magnitud_de']:g} DE en temperatura corporal (04:A1) y "
                                          "FC en reposo (01:V3)",
             "dias": [salto["desde"], salto["hasta"]],
             "resultado_esperado": "alerta en las dos variables; la media adaptativa no cambia (escenario 4 de h.2)"},
            {"persona": "SIM-T03", "que": f"rampa lenta descendente de sueño (03:V30), {rampa['pendiente_de_por_dia']:g} DE por "
                                          "día desde el lanzamiento, sin puntos extremos",
             "dias": [rampa["desde"], rampa["hasta"]],
             "resultado_esperado": "señal del CUSUM y tope del EWMA; base prevuelo intacta (escenario 5 de h.2)"},
            {"persona": "SIM-T04", "que": "faltantes: en vuelo no hay filas de SpO2 (04:A3), FR (04:A2) ni PIO2 (04:A25) "
                                          "(núcleo de P03) y hay varias filas sin_dato con motivo y value vacío",
             "dias": [P["lanzamiento"], P["fin"]],
             "resultado_esperado": "P03 GRIS, no VERDE; sin_dato nunca es 0 (escenarios 2 y 3 de h.2)"},
            {"persona": "SIM-T05", "que": "datos N4: PA cuffless muy desviada y filas tipo adaptador ECG (01:V31 = 1, "
                                          "01:V34 = 470 ms)",
             "dias": [t5["adaptador_ecg"]["desde"], t5["adaptador_ecg"]["hasta"]],
             "resultado_esperado": "no actualiza la base; no produce ROJO; no respalda VERDE (escenario 6 de h.2)"},
            {"persona": "TODAS", "que": f"ppCO2 de cabina (04:A23) elevada +{compart['magnitud_de']:g} DE en toda la "
                                        "tripulación",
             "dias": [compart["desde"], compart["hasta"]],
             "resultado_esperado": "etiqueta «desviación compartida»; ninguna alerta individual se apaga; ninguna base "
                                   "cambia (escenario 10 de h.2)"},
        ],
        "variables_simuladas": [{k: v[k] for k in ("variable_id", "variable", "tipo", "unidad", "device_class",
                                                    "padecimientos", "media_base", "de", "rango_plausible", "provisional")}
                                for v in variables] + extras,
        "archivos": {"csv": f"{ARCHIVO}.csv", "leeme": "LEEME.md"},
    }
    json_p.write_text(json.dumps(meta, ensure_ascii=False, indent=2, allow_nan=False) + "\n", encoding="utf-8")
    md_p.write_text(_LEEME, encoding="utf-8")
    return {"csv": str(csv_p), "json": str(json_p), "leeme": str(md_p), "n_filas": int(len(df)), "semilla": semilla,
            "personas": list(PERSONAS), "n_variables": len(variables), "n_sin_dato": int(df["quality"].str.startswith("sin_dato").sum())}


_LEEME = """# Tripulación SIMULADA (datos sintéticos)

**SIMULADO. No es dato de vuelo, no es fisiología real y no son datos de astronautas ni de ninguna persona.**
Son valores sintéticos: variables independientes con ruido acotado alrededor de medias arbitrarias (PRE: 12 desviaciones simétricas y equiespaciadas hasta ±1.0 DE simulada, en orden aleatorio, para que la base prevuelo sea estable; vuelo: uniforme hasta ±0.5 DE; provisional).
Solo sirven para ejercitar el flujo del motor de padecimientos (ALGORITMOS.md, sección h.2). Ninguna cifra de
aquí es una validación ni un resultado; todos los números son provisional. Nada es un diagnóstico.

## Contenido
- `tripulacion_simulada.csv`: CSV nativo del motor (`subject_id,timestamp,variable_id,value,unit,device_class,quality,context,method,simulated,notes`). Todas las filas llevan `simulated=true` y `notes` que empieza por «SIMULADO».
- `tripulacion_simulada.json`: misión (lanzamiento 2026-09-13), perfiles (edad y sexo INVENTADOS), escenarios, variables simuladas y los parámetros (provisional) con los que se generó.
- 5 personas (`SIM-T01`…`SIM-T05`), 30 días: PRE 2026-09-01…2026-09-12, vuelo 2026-09-13…2026-09-30; un valor diario por variable.
- Variables: todas las `sí en vuelo` de los padecimientos P03, P04, P05, P06, P07, P10, P16, P18 y P19 de `datos/modelo/PADECIMIENTO-VARIABLE.csv`. Solo FC, SpO2, FR, temperatura, sueño y ppCO2 tienen valores de aspecto plausible; el resto está en «u.a. SIMULADA» (media 100, DE 5). Las variables de presencia/síntoma valen 0 (ausente) cada día.

## Escenarios (provisional)
SIM-T01 control; SIM-T02 salto brusco en 04:A1 y 01:V3 (+5 DE, 27–30 sep); SIM-T03 rampa lenta de sueño 03:V30 (−0.10 DE/día desde el lanzamiento); SIM-T04 faltantes (sin SpO2, FR ni PIO2 en vuelo, y filas `sin_dato: <motivo>`); SIM-T05 datos N4 (PA cuffless muy desviada, bandera ECG = 1 y QTc 470 ms de tipo adaptador, 28–30 sep); toda la tripulación: ppCO2 (04:A23) +1.5 DE el 18 de septiembre (un solo día: una excursión más larga dejaría una señal de deriva del CUSUM que solo cierra una persona) («desviación compartida»).

## Regenerar (determinista con la semilla)
```
python -m motor.simulador
```
Desde la raíz del prototipo. Para otra semilla o carpeta: `from motor.simulador import generar; generar(dir_salida, semilla)`.
"""


if __name__ == "__main__":
    r = generar()
    print(json.dumps({k: (Path(v).name if k in ("csv", "json", "leeme") else v) for k, v in r.items()}, ensure_ascii=False))
