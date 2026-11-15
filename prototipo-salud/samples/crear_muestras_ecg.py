#!/usr/bin/env python
"""Crea 3 muestras ECG de 180 s recortando SIN perdida registros WFDB publicos
(MIT-BIH Arrhythmia Database y MIT-BIH Atrial Fibrillation Database, PhysioNet).

Uso:  python samples/crear_muestras_ecg.py [--datos RUTA]   (por defecto <raiz>/../datos/ecg)
Requiere wfdb (4.3.1 probado). Datos REALES publicos, no son de astronautas; no son diagnostico.
"""
import argparse, collections, hashlib, json
from pathlib import Path
import numpy as np
import wfdb

RAIZ = Path(__file__).resolve().parents[1]
SALIDA = Path(__file__).resolve().parent
DUR = 180  # s


def limpia(s):
    return None if s is None else str(s).rstrip("\x00")


def ritmo_en(ann, muestra):
    """Etiqueta de ritmo vigente en `muestra` (ultima '+' con aux_note '(' en <= muestra)."""
    vig = None
    for s, sym, aux in zip(ann.sample, ann.symbol, ann.aux_note):
        if sym == "+" and limpia(aux).startswith("(") and s <= muestra:
            vig = limpia(aux)
    return vig


def eventos(ann, a, b):
    """Anotaciones con a <= muestra < b, re-referenciadas a 0."""
    m = (ann.sample >= a) & (ann.sample < b)
    return dict(
        sample=ann.sample[m] - a,
        symbol=[ann.symbol[i] for i in np.where(m)[0]],
        subtype=ann.subtype[m],
        chan=ann.chan[m],
        num=ann.num[m],
        aux_note=[limpia(ann.aux_note[i]) or "" for i in np.where(m)[0]],
    )


def escribir_ann(nombre, ext, ev, fs, ritmo0, salida):
    """Escribe anotaciones; si hace falta antepone la anotacion de ritmo vigente en la muestra 0."""
    ya = any(s == 0 and sym == "+" and x.startswith("(")
             for s, sym, x in zip(ev["sample"], ev["symbol"], ev["aux_note"]))
    anadida = False
    if ritmo0 and not ya:
        ev = dict(
            sample=np.concatenate([[0], ev["sample"]]).astype(int),
            symbol=["+"] + ev["symbol"],
            subtype=np.concatenate([[0], ev["subtype"]]).astype(int),
            chan=np.concatenate([[0], ev["chan"]]).astype(int),
            num=np.concatenate([[0], ev["num"]]).astype(int),
            aux_note=[ritmo0] + ev["aux_note"],
        )
        anadida = True
    wfdb.wrann(nombre, ext, sample=np.asarray(ev["sample"], dtype=int), symbol=ev["symbol"],
               subtype=np.asarray(ev["subtype"], dtype=int), chan=np.asarray(ev["chan"], dtype=int),
               num=np.asarray(ev["num"], dtype=int), aux_note=ev["aux_note"], fs=fs,
               write_dir=str(salida))
    return anadida


def ritmos_segmento(ann, a, b):
    """Lista [(inicio_rel, fin_rel, etiqueta)] de ritmos dentro de [a,b)."""
    pts = [(0, ritmo_en(ann, a))]
    for s, sym, x in zip(ann.sample, ann.symbol, ann.aux_note):
        if sym == "+" and limpia(x).startswith("(") and a < s < b:
            pts.append((int(s - a), limpia(x)))
    return [(p[0], pts[i + 1][0] if i + 1 < len(pts) else b - a, p[1]) for i, p in enumerate(pts)]


def cuenta(ann, a, b):
    m = (ann.sample >= a) & (ann.sample < b)
    return dict(collections.Counter(s for s, k in zip(ann.symbol, m) if k and s != "+"))


def recortar(datos_dir, base, reg, a, b, nombre, ext_latidos):
    ruta = str(Path(datos_dir) / base / reg)
    rec = wfdb.rdrecord(ruta, sampfrom=a, sampto=b, physical=False)
    wfdb.wrsamp(nombre, fs=rec.fs, units=rec.units, sig_name=rec.sig_name, d_signal=rec.d_signal,
                fmt=rec.fmt, adc_gain=rec.adc_gain, baseline=rec.baseline, write_dir=str(SALIDA))
    info = {"nombre": nombre, "registro": reg, "base": base, "fs": rec.fs, "canales": rec.sig_name,
            "desde": a, "hasta": b, "anotaciones": {}}
    ritmo_ref = None
    for ext in ext_latidos:
        orig = wfdb.rdann(ruta, ext)
        ev = eventos(orig, a, b)
        r0 = ritmo_en(orig, a)  # solo la anotacion de ritmo existe en .atr
        if ext == "atr":
            ritmo_ref = orig
            info["ritmos"] = [(s / rec.fs, e / rec.fs, l) for s, e, l in ritmos_segmento(orig, a, b)]
            anadida = escribir_ann(nombre, ext, ev, rec.fs, r0, SALIDA)
            info["ritmo_anadido_en_muestra_0"] = (anadida, r0)
        else:
            escribir_ann(nombre, ext, ev, rec.fs, None, SALIDA)
        info["anotaciones"][ext] = cuenta(orig, a, b)
    # ---- verificaciones (relectura) ----
    nuevo = wfdb.rdrecord(str(SALIDA / nombre), physical=False)
    orig_full = wfdb.rdrecord(ruta, sampfrom=a, sampto=b, physical=False)
    assert np.array_equal(nuevo.d_signal, orig_full.d_signal), "senal distinta"
    assert nuevo.sig_name == rec.sig_name and nuevo.fmt == rec.fmt and nuevo.fs == rec.fs
    assert nuevo.sig_len == b - a
    for ext in ext_latidos:
        orig = wfdb.rdann(ruta, ext)
        ev = eventos(orig, a, b)
        rel = wfdb.rdann(str(SALIDA / nombre), ext)
        # latidos (no '+'): identicos y desplazados
        lat_o = [(int(s), sy) for s, sy in zip(ev["sample"], ev["symbol"]) if sy != "+"]
        lat_n = [(int(s), sy) for s, sy in zip(rel.sample, rel.symbol) if sy != "+"]
        assert lat_o == lat_n, f"latidos distintos en {ext}"
        if ext == "atr":
            rit_o = [(int(s), limpia(x)) for s, sy, x in zip(ev["sample"], ev["symbol"], ev["aux_note"]) if sy == "+"]
            rit_n = [(int(s), limpia(x)) for s, sy, x in zip(rel.sample, rel.symbol, rel.aux_note) if sy == "+"]
            if info["ritmo_anadido_en_muestra_0"][0]:
                assert rit_n[0] == (0, info["ritmo_anadido_en_muestra_0"][1]), "ritmo inicial"
                rit_n = rit_n[1:]
            assert rit_o == rit_n, "ritmos distintos"
            # ritmo vigente al inicio coincide con el original
            assert limpia(rel.aux_note[0]) == ritmo_en(ritmo_ref, a) or (rit_o and rit_o[0][0] == 0)
    hea = (SALIDA / f"{nombre}.hea").read_text()
    assert not any(t.startswith("/") for t in hea.split()), "ruta absoluta en .hea"
    assert "\\" not in hea and "/home" not in hea, "ruta en .hea"
    return info


def buscar(ann, ini, fin, fs, paso_s, ok):
    ventana = DUR * fs
    paso = paso_s * fs
    a = ((ini + paso - 1) // paso) * paso
    while a + ventana <= fin:
        if ok(a, a + ventana):
            return a
        a += paso
    return None


def sha(p):
    return hashlib.sha256(Path(p).read_bytes()).hexdigest()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--datos", default=str(RAIZ.parent / "datos" / "ecg"))
    args = ap.parse_args()
    d = Path(args.datos)
    res = []

    # 1) MITDB 100: primera ventana (multiplos de 30 s) sin A ni V
    a100 = wfdb.rdann(str(d / "mitdb" / "100"), "atr")
    n = wfdb.rdheader(str(d / "mitdb" / "100")).sig_len
    ini = buscar(a100, 0, n, 360, 30,
                 lambda a, b: not any(k in ("A", "V") for k in cuenta(a100, a, b)))
    assert ini is not None
    res.append(recortar(d, "mitdb", "100", ini, ini + DUR * 360, "ecg_normal_mitdb100", ["atr"]))

    # 2) AFDB 04015: muestras 130000-175000 (fijas) + .qrs
    res.append(recortar(d, "afdb", "04015", 130000, 175000, "ecg_fa_afdb04015", ["atr", "qrs"]))

    # 3) MITDB 201: primera ventana en [188387, 570586] con ritmo N/(T y >=10 V
    a201 = wfdb.rdann(str(d / "mitdb" / "201"), "atr")

    def ok201(a, b):
        r = ritmos_segmento(a201, a, b)
        return all(x[2] in ("(N", "(T") for x in r) and cuenta(a201, a, b).get("V", 0) >= 10
    ini = buscar(a201, 188387, 570586, 360, 30, ok201)
    assert ini is not None
    res.append(recortar(d, "mitdb", "201", ini, ini + DUR * 360, "ecg_extrasistoles_mitdb201", ["atr"]))

    for r in res:
        r["sha256"] = {p.name: sha(p) for p in sorted(SALIDA.glob(r["nombre"] + ".*"))}
        print(json.dumps(r, indent=1, default=str, ensure_ascii=False))
    print("OK: verificaciones assert superadas")


if __name__ == "__main__":
    main()
