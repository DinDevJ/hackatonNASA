// Perfil EVA: construcción de la trama binaria.
//
// C++ puro, sin Arduino: se compila igual en el ESP32 y en una PC para probar que
// produce EXACTAMENTE los mismos bytes que `codificar()` del backend.
//
//  ┌ cabecera, 13 bytes, little-endian ───────────────────┬ carga ─────────────┐
//  │ ver u8 │ id_disp u32 │ id_esquema u16 │ seq u16 │ t_scet u32 │ campos…   │
//  └──────────────────────────────────────────────────────┴────────────────────┘
#pragma once
#include <stdint.h>
#include <stddef.h>
#include <string.h>
#include <math.h>

namespace eva {

enum Tipo : uint8_t { U8, I8, U16, I16, U32, I32, F32 };

struct Campo {
  Tipo tipo;
  double escala;        // valor real = crudo × escala + desplazamiento
  double desplazamiento;
};

constexpr uint8_t VERSION = 1;
constexpr size_t CABECERA = 13;

inline size_t bytesDe(Tipo t) {
  switch (t) { case U8: case I8: return 1; case U16: case I16: return 2; default: return 4; }
}

inline size_t tamTrama(const Campo* c, size_t n) {
  size_t s = CABECERA;
  for (size_t i = 0; i < n; i++) s += bytesDe(c[i].tipo);
  return s;
}

inline void put16(uint8_t* p, uint16_t v) { p[0] = v & 0xFF; p[1] = v >> 8; }
inline void put32(uint8_t* p, uint32_t v) { for (int i = 0; i < 4; i++) p[i] = (v >> (8 * i)) & 0xFF; }

// Redondeo idéntico en las tres implementaciones (C++, TypeScript, Python).
inline double redondear(double x) { return floor(x + 0.5); }

// Satura en vez de desbordar: un pico de 300 lpm en un u8 debe llegar como 255,
// no como 44.
inline double saturar(double x, double lo, double hi) { return x < lo ? lo : (x > hi ? hi : x); }

// Escribe la trama en `out`. Devuelve los bytes escritos, o 0 si no cabe.
inline size_t codificar(uint8_t* out, size_t cap, uint32_t idDisp, uint16_t idEsquema,
                        uint16_t seq, uint32_t tScet, const Campo* c, const double* v, size_t n) {
  const size_t total = tamTrama(c, n);
  if (total > cap) return 0;
  out[0] = VERSION;
  put32(out + 1, idDisp);
  put16(out + 5, idEsquema);
  put16(out + 7, seq);
  put32(out + 9, tScet);

  size_t off = CABECERA;
  for (size_t i = 0; i < n; i++) {
    const double crudo = (v[i] - c[i].desplazamiento) / c[i].escala;
    switch (c[i].tipo) {
      case U8:  out[off] = (uint8_t)saturar(redondear(crudo), 0, 255); break;
      case I8:  out[off] = (uint8_t)(int8_t)saturar(redondear(crudo), -128, 127); break;
      case U16: put16(out + off, (uint16_t)saturar(redondear(crudo), 0, 65535)); break;
      case I16: put16(out + off, (uint16_t)(int16_t)saturar(redondear(crudo), -32768, 32767)); break;
      case U32: put32(out + off, (uint32_t)saturar(redondear(crudo), 0, 4294967295.0)); break;
      case I32: put32(out + off, (uint32_t)(int32_t)saturar(redondear(crudo), -2147483648.0, 2147483647.0)); break;
      case F32: { float f = (float)crudo; uint32_t u; memcpy(&u, &f, 4); put32(out + off, u); break; }
    }
    off += bytesDe(c[i].tipo);
  }
  return total;
}

}  // namespace eva
