#!/usr/bin/env python3
"""
Descarga eventos de clima espacial de la API DONKI de la NASA.

La API rechaza rangos de mas de 60 dias, asi que este script parte el rango
automaticamente, junta los resultados y elimina duplicados.

Uso:
    export NASA_API_KEY="tu_llave"
    python3 scripts/fetch_donki.py --desde 2024-01-01 --hasta 2024-12-31

La llave se lee de la variable de entorno NASA_API_KEY o del archivo .env.
Nunca se escribe en disco ni queda en el JSON de salida.
"""
import argparse, datetime as dt, json, os, pathlib, sys, time, urllib.error, urllib.request

BASE = "https://api.nasa.gov/DONKI"
MAX_DIAS = 60                      # limite verificado de la API
ID = {"SEP": "sepID", "RBE": "rbeID"}   # endpoints verificados


def leer_llave():
    llave = os.environ.get("NASA_API_KEY")
    if not llave:
        env = pathlib.Path(__file__).resolve().parents[3] / ".env"
        if env.exists():
            for linea in env.read_text().splitlines():
                linea = linea.strip()
                if linea.startswith("NASA_API_KEY=") and not linea.startswith("#"):
                    llave = linea.split("=", 1)[1].strip().strip('"').strip("'")
                    break
    if not llave:
        sys.exit("ERROR: falta NASA_API_KEY.\n"
                 "  export NASA_API_KEY='tu_llave'   (o copia .env.example a .env)\n"
                 "  Sacala gratis en https://api.nasa.gov")
    if llave == "DEMO_KEY":
        print("AVISO: usando DEMO_KEY. Su cuota es compartida por IP y falla seguido.",
              file=sys.stderr)
    return llave


def ventanas(desde, hasta):
    """Parte el rango en tramos de como maximo MAX_DIAS."""
    actual = desde
    while actual <= hasta:
        fin = min(actual + dt.timedelta(days=MAX_DIAS - 1), hasta)
        yield actual, fin
        actual = fin + dt.timedelta(days=1)


def pedir(endpoint, ini, fin, llave, reintentos=4):
    url = (f"{BASE}/{endpoint}?startDate={ini:%Y-%m-%d}"
           f"&endDate={fin:%Y-%m-%d}&api_key={llave}")
    for intento in range(1, reintentos + 1):
        try:
            with urllib.request.urlopen(url, timeout=30) as r:
                return json.loads(r.read().decode())
        except urllib.error.HTTPError as e:
            cuerpo = e.read().decode()[:120]
            if e.code == 429 and intento < reintentos:
                espera = 20 * intento
                print(f"    429 por cuota; reintento en {espera}s", file=sys.stderr)
                time.sleep(espera)
                continue
            print(f"    HTTP {e.code}: {cuerpo}", file=sys.stderr)
            return []
        except Exception as e:
            print(f"    fallo de red: {e}", file=sys.stderr)
            return []
    return []


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--endpoint", default="SEP", choices=sorted(ID))
    ap.add_argument("--desde", required=True, help="YYYY-MM-DD")
    ap.add_argument("--hasta", required=True, help="YYYY-MM-DD")
    ap.add_argument("--salida", default=None)
    a = ap.parse_args()

    llave = leer_llave()
    d0 = dt.date.fromisoformat(a.desde)
    d1 = dt.date.fromisoformat(a.hasta)
    if d1 < d0:
        sys.exit("ERROR: --hasta es anterior a --desde")

    clave_id = ID[a.endpoint]
    vistos, todos = set(), []
    for ini, fin in ventanas(d0, d1):
        print(f"  {ini} a {fin} ...", end=" ", flush=True)
        lote = pedir(a.endpoint, ini, fin, llave)
        nuevos = 0
        for ev in lote:
            k = ev.get(clave_id)
            if k and k not in vistos:
                vistos.add(k)
                todos.append(ev)
                nuevos += 1
        print(f"{len(lote)} devueltos, {nuevos} nuevos")
        time.sleep(1)

    todos.sort(key=lambda e: e.get("eventTime", ""))
    destino = pathlib.Path(a.salida or
        pathlib.Path(__file__).resolve().parents[1] /
        "datos" / f"donki-{a.endpoint.lower()}-{d0}_{d1}.json")
    destino.parent.mkdir(parents=True, exist_ok=True)
    destino.write_text(json.dumps(todos, indent=2, ensure_ascii=False))
    print(f"\n{len(todos)} eventos unicos -> {destino}")


if __name__ == "__main__":
    main()
