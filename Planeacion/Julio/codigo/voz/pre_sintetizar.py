"""
Pre-sintetiza las frases fijas de la demo con Chatterbox Multilingual.

Por qué pre-sintetizar: en un portátil sin GPU, Chatterbox tarda unos 5 segundos
por cada segundo de audio (medido: 59,8 s para 11,5 s). En vivo es inviable. Pero
casi todo lo que dice el sistema es texto fijo, así que se genera una vez y se
guarda. En la demo suena al instante y con la mejor calidad.

IMPORTANTE: el modelo corta los textos largos (avisa con "forcing EOS token"), así
que aquí se trocea por frases y se concatena.

Uso:
    pip install chatterbox-tts "setuptools<81"
    python3 pre_sintetizar.py            # genera todo en ./audio/
    python3 pre_sintetizar.py ambar_clave  # sólo una
"""
from __future__ import annotations

import json
import os
import re
import sys
import time
from pathlib import Path

os.environ.setdefault("HF_HUB_DISABLE_XET", "1")

import numpy as np
import scipy.io.wavfile as wav

AQUI = Path(__file__).parent
SALIDA = AQUI / "audio"
SILENCIO_S = 0.25        # pausa entre frases concatenadas
MAX_CARACTERES = 140     # por encima de esto el modelo tiende a cortar


def trozos(texto: str) -> list[str]:
    """Parte en frases cortas para que el modelo no trunque."""
    partes = re.split(r"(?<=[.!?:])\s+", texto.strip())
    out: list[str] = []
    for p in partes:
        if not p:
            continue
        while len(p) > MAX_CARACTERES:
            corte = p.rfind(",", 0, MAX_CARACTERES)
            corte = corte if corte > 40 else MAX_CARACTERES
            out.append(p[:corte].strip())
            p = p[corte:].lstrip(", ")
        out.append(p)
    return out


def main() -> None:
    from chatterbox.mtl_tts import ChatterboxMultilingualTTS

    datos = json.loads((AQUI / "frases.json").read_text(encoding="utf-8"))
    frases = datos["frases"]
    if len(sys.argv) > 1:
        frases = [f for f in frases if f["id"] in sys.argv[1:]]
        if not frases:
            sys.exit(f"No encontré: {', '.join(sys.argv[1:])}")

    SALIDA.mkdir(exist_ok=True)
    print(f"Cargando modelo (CPU)…")
    t0 = time.time()
    modelo = ChatterboxMultilingualTTS.from_pretrained(device="cpu")
    print(f"  listo en {time.time() - t0:.1f} s\n")

    total_audio = total_gen = 0.0
    for i, f in enumerate(frases, 1):
        destino = SALIDA / f"{f['id']}.wav"
        print(f"[{i}/{len(frases)}] {f['id']}  ({f['estado']})")
        t1 = time.time()
        piezas = []
        for t in trozos(f["texto"]):
            w = modelo.generate(t, language_id="es").squeeze().cpu().numpy()
            piezas.append(np.asarray(w, dtype=np.float32))
            piezas.append(np.zeros(int(SILENCIO_S * modelo.sr), dtype=np.float32))
        a = np.concatenate(piezas[:-1]) if len(piezas) > 1 else piezas[0]
        a = a / (np.max(np.abs(a)) or 1) * 0.95
        wav.write(destino, modelo.sr, (a * 32767).astype(np.int16))

        gen, dur = time.time() - t1, len(a) / modelo.sr
        total_gen += gen
        total_audio += dur
        print(f"       {dur:5.1f} s de audio en {gen:5.1f} s  (factor {gen/dur:.2f})  -> {destino.name}")

    print(f"\n{len(frases)} frases · {total_audio:.1f} s de audio · "
          f"{total_gen/60:.1f} min de cómputo · factor medio {total_gen/total_audio:.2f}")
    print(f"Guardado en {SALIDA}")


if __name__ == "__main__":
    main()
