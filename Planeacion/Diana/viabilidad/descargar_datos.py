"""Descarga los datos públicos de las pruebas de Diana. Solo biblioteca estándar.

  python descargar_datos.py --out ../../../../datos-diana

- MMASH 1.0.0 (PhysioNet, ODbL): https://physionet.org/content/mmash/1.0.0/  (~24 MB)
- NHANES 2015-2018, PHQ-9 + demografía (CDC/NCHS): solo análisis estadístico; prohibido
  intentar identificar personas. https://www.cdc.gov/nchs/policy/data-user-agreement.html

No subir los datos al repositorio: se regeneran con este script.
"""
import argparse
import hashlib
import urllib.request
import zipfile
from pathlib import Path

MMASH_ZIP = "https://physionet.org/files/mmash/1.0.0/MMASH.zip?download"
MMASH_SHA256 = "ef91ee1b36b5849a6366b1918de82686ab278915d33c7f62133f07f741f70726"
NHANES = "https://wwwn.cdc.gov/Nchs/Data/Nhanes/Public/{ciclo}/DataFiles/{f}.xpt"
NHANES_FILES = [("2015", "DPQ_I"), ("2015", "DEMO_I"), ("2017", "DPQ_J"), ("2017", "DEMO_J")]


def bajar(url: str, destino: Path):
    if destino.exists() and destino.stat().st_size > 0:
        print("ya existe", destino)
        return
    destino.parent.mkdir(parents=True, exist_ok=True)
    print("bajando", url)
    req = urllib.request.Request(url, headers={"User-Agent": "monarcas-eva-viabilidad"})
    with urllib.request.urlopen(req) as r, open(destino, "wb") as f:
        f.write(r.read())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="datos-diana")
    out = Path(ap.parse_args().out)

    z = out / "mmash" / "MMASH.zip"
    bajar(MMASH_ZIP, z)
    sha = hashlib.sha256(z.read_bytes()).hexdigest()
    if sha != MMASH_SHA256:
        raise SystemExit(f"Checksum de MMASH no coincide: {sha}")
    with zipfile.ZipFile(z) as zf:
        zf.extractall(out / "mmash")
    for ciclo, f in NHANES_FILES:
        bajar(NHANES.format(ciclo=ciclo, f=f), out / "nhanes" / f"{f}.xpt")
    print("Listo:", out.resolve())


if __name__ == "__main__":
    main()
