"""Perfil EVA en Python: el mismo formato que el firmware y el backend."""
from __future__ import annotations

import math
import struct
from dataclasses import dataclass

VERSION = 1
CABECERA = 13
_FMT = {"u8": "B", "i8": "b", "u16": "H", "i16": "h", "u32": "I", "i32": "i", "f32": "f"}
_RANGO = {"u8": (0, 255), "i8": (-128, 127), "u16": (0, 65535), "i16": (-32768, 32767),
          "u32": (0, 4294967295), "i32": (-2147483648, 2147483647)}


@dataclass
class Cabecera:
    ver: int
    id_disp: int
    id_esquema: int
    seq: int
    t_scet: int


def leer_cabecera(b: bytes) -> Cabecera:
    if len(b) < CABECERA:
        raise ValueError(f"trama corta: {len(b)} bytes")
    return Cabecera(*struct.unpack_from("<BIHHI", b, 0))


def codificar(id_disp: int, id_esquema: int, seq: int, t_scet: int,
              campos: list[tuple[str, float]], valores: list[float]) -> bytes:
    """campos: [(tipo, escala), ...]. Redondeo y saturación idénticos al firmware."""
    out = struct.pack("<BIHHI", VERSION, id_disp, id_esquema, seq & 0xFFFF, t_scet)
    for (tipo, escala), v in zip(campos, valores):
        crudo = v / escala
        if tipo != "f32":
            lo, hi = _RANGO[tipo]
            crudo = min(hi, max(lo, math.floor(crudo + 0.5)))
        out += struct.pack("<" + _FMT[tipo], crudo)
    return out
