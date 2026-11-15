// Comprueba que trama_eva.h (el firmware) produce los mismos bytes que el backend.
//   g++ -std=c++17 -I../playera_eva test_trama.cpp -o test_trama && ./test_trama
#include <cstdio>
#include <cstring>
#include "trama_eva.h"

struct Caso { uint32_t disp; uint16_t esq; uint16_t seq; uint32_t t; double v[3]; const char* hex; };

// Copiados de vectores.json, generados con el codificador del backend.
const Caso CASOS[] = {
  {401, 5, 0,     1794700000u, {75, 14, 36.84},     "019101000005000000e0f2f86a4b0e640e"},
  {401, 5, 65535, 1794700001u, {300, 13.5, -2.5},   "01910100000500ffffe1f2f86aff0e06ff"},
  {201, 2, 42,    1794700002u, {115.5, 74.5},       "01c900000002002a00e2f2f86a744b"},
  {201, 2, 7,     0u,          {-5, 255},           "01c9000000020007000000000000ff"},
};
// Esquema 5 · playera: fc u8 · fr u8 · temp i16 ×0,01     Esquema 2 · brazalete: sis u8 · dia u8
const eva::Campo PLAYERA[3]   = { {eva::U8, 1, 0}, {eva::U8, 1, 0}, {eva::I16, 0.01, 0} };
const eva::Campo BRAZALETE[2] = { {eva::U8, 1, 0}, {eva::U8, 1, 0} };

int main() {
  int fallos = 0;
  for (const Caso& c : CASOS) {
    uint8_t buf[32];
    const bool playera = c.esq == 5;
    size_t n = eva::codificar(buf, sizeof buf, c.disp, c.esq, c.seq, c.t,
                              playera ? PLAYERA : BRAZALETE, c.v, playera ? 3 : 2);
    char hex[65] = {0};
    for (size_t i = 0; i < n; i++) sprintf(hex + 2 * i, "%02x", buf[i]);
    bool ok = strcmp(hex, c.hex) == 0;
    printf("%s  %s%s%s\n", ok ? "OK   " : "FALLA", hex, ok ? "" : "  esperado ", ok ? "" : c.hex);
    fallos += !ok;
  }
  printf(fallos ? "\n%d FALLAN\n" : "\nFIRMWARE Y BACKEND PRODUCEN LOS MISMOS BYTES\n", fallos);
  return fallos;
}
