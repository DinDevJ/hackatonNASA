// Comprueba que trama_eva.h (el firmware) produce los mismos bytes que el backend.
//   g++ -std=c++17 -I../eva_hub test_trama.cpp -o test_trama && ./test_trama
#include <cstdio>
#include <cstring>
#include "trama_eva.h"

struct Caso { uint32_t disp; uint16_t esq; uint16_t seq; uint32_t t; double v[3]; const char* hex; };

// Copiados de vectores.json, generados con el codificador del backend.
const Caso CASOS[] = {
  {2561, 3, 0,     1794700000u, {75, 98, 36.84},     "01010a000003000000e0f2f86a4b62640e"},
  {2561, 3, 65535, 1794700001u, {300, 97.5, -2.5},   "01010a00000300ffffe1f2f86aff6206ff"},
  {2817, 4, 42,    1794700002u, {14.4, 115.5, 74.5}, "01010b000004002a00e2f2f86a0e744b"},
  {2817, 4, 7,     0u,          {0, -5, 255},        "01010b000004000700000000000000ff"},
};
const eva::Campo A[3] = { {eva::U8, 1, 0}, {eva::U8, 1, 0}, {eva::I16, 0.01, 0} };
const eva::Campo B[3] = { {eva::U8, 1, 0}, {eva::U8, 1, 0}, {eva::U8, 1, 0} };

int main() {
  int fallos = 0;
  for (const Caso& c : CASOS) {
    uint8_t buf[32];
    size_t n = eva::codificar(buf, sizeof buf, c.disp, c.esq, c.seq, c.t, c.esq == 3 ? A : B, c.v, 3);
    char hex[65] = {0};
    for (size_t i = 0; i < n; i++) sprintf(hex + 2 * i, "%02x", buf[i]);
    bool ok = strcmp(hex, c.hex) == 0;
    printf("%s  %s%s%s\n", ok ? "OK   " : "FALLA", hex, ok ? "" : "  esperado ", ok ? "" : c.hex);
    fallos += !ok;
  }
  printf(fallos ? "\n%d FALLAN\n" : "\nFIRMWARE Y BACKEND PRODUCEN LOS MISMOS BYTES\n", fallos);
  return fallos;
}
