"""La pasarela codifica igual que el backend y el firmware.   python test_trama.py"""
import json
from pathlib import Path

from trama_eva import codificar, leer_cabecera

A = [("u8", 1), ("u8", 1), ("i16", 0.01)]
B = [("u8", 1), ("u8", 1), ("u8", 1)]
vectores = json.loads((Path(__file__).parent.parent / "esp32" / "test" / "vectores.json").read_text())
fallos = 0
for v in vectores:
    b = codificar(v["disp"], v["esq"], v["seq"], v["t"], A if v["esq"] == 3 else B, v["v"])
    ok = b.hex() == v["hex"] and leer_cabecera(b).id_disp == v["disp"]
    print("OK   " if ok else "FALLA", b.hex())
    fallos += not ok
print("\nPASARELA Y BACKEND PRODUCEN LOS MISMOS BYTES" if not fallos else f"\n{fallos} FALLAN")
raise SystemExit(fallos)
