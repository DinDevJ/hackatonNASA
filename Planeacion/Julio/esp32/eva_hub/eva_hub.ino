// ═══════════════════════════════════════════════════════════════════════════
//  EVA HUB · firmware para ESP32
//
//  Recoge dos dispositivos —A (x, y, z) y B (a, b, c)— y los manda por Bluetooth
//  Low Energy a la computadora central, en tramas binarias del perfil EVA.
//
//    dispositivo A ─┐
//                   ├─ ESP32 ── BLE ──► PC central (pasarela → backend → LUNNA)
//    dispositivo B ─┘
//
//  Placa: cualquier ESP32 con BLE (ESP32-WROOM, DevKit v1…). Arduino IDE con el
//  núcleo "esp32" de Espressif. Usa la librería BLE que trae el núcleo: no hay
//  que instalar nada más.
//
//  Sin sensores conectados, SIMULAR = 1 genera valores sintéticos.
// ═══════════════════════════════════════════════════════════════════════════

#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLE2902.h>
#include "trama_eva.h"

// ─── Configuración ─────────────────────────────────────────────────────────
#define SIMULAR 1                       // 0 cuando haya sensores reales

const char*    NOMBRE_BLE  = "EVA-HUB-01";
const uint32_t ID_DISP_A   = 2561;      // 0x0A01 · registrado en el backend
const uint32_t ID_DISP_B   = 2817;      // 0x0B01
const uint16_t ESQUEMA_A   = 3;         // esp32-dispositivo-A
const uint16_t ESQUEMA_B   = 4;         // esp32-dispositivo-B
const uint32_t PERIODO_MS  = 1000;      // una lectura de A y una de B por segundo
const size_t   ENVIOS_POR_CICLO = 10;   // tramas pendientes que se vacían por vuelta

// UUID propios del perfil EVA. La pasarela busca este servicio.
#define UUID_SERVICIO "a3c87500-8ed3-4bdf-8a39-a01bebede295"
#define UUID_DATOS    "a3c87501-8ed3-4bdf-8a39-a01bebede295"   // notificar: tramas
#define UUID_ESQUEMA  "a3c87502-8ed3-4bdf-8a39-a01bebede295"   // leer: qué mando
#define UUID_HORA     "a3c87503-8ed3-4bdf-8a39-a01bebede295"   // escribir: hora UTC

// Disposición de la carga. Debe coincidir con los esquemas 3 y 4 del backend.
//   A: fc u8 · spo2 u8 · temp i16 ×0,01      B: fr u8 · sis u8 · dia u8
const eva::Campo CAMPOS_A[3] = { {eva::U8, 1, 0}, {eva::U8, 1, 0}, {eva::I16, 0.01, 0} };
const eva::Campo CAMPOS_B[3] = { {eva::U8, 1, 0}, {eva::U8, 1, 0}, {eva::U8, 1, 0} };

const char* ESQUEMA_JSON =
  "{\"perfil\":1,\"dispositivos\":["
  "{\"id\":2561,\"esquema\":3,\"campos\":[\"fc:u8\",\"spo2:u8\",\"temp:i16*0.01\"]},"
  "{\"id\":2817,\"esquema\":4,\"campos\":[\"fr:u8\",\"sis:u8\",\"dia:u8\"]}]}";

// ─── Cola de lecturas pendientes ───────────────────────────────────────────
// Si no hay conexión, las lecturas se guardan y se mandan al reconectar.
// Se guarda el instante en millis() y la trama se arma al enviar: así una
// lectura tomada ANTES de recibir la hora sale igualmente con su hora real.
struct Lectura { uint32_t ms; uint8_t disp; double v[3]; };
const size_t CAPACIDAD = 1800;          // ≈ 15 min de A + B a 1 Hz (~50 KB de RAM)
Lectura cola[CAPACIDAD];
size_t inicio = 0, pendientes = 0;
uint32_t descartadas = 0;               // lecturas perdidas por cola llena

void encolar(uint8_t disp, double a, double b, double c) {
  if (pendientes == CAPACIDAD) {        // llena: se pierde la más antigua
    inicio = (inicio + 1) % CAPACIDAD; pendientes--; descartadas++;
  }
  Lectura& l = cola[(inicio + pendientes) % CAPACIDAD];
  l.ms = millis(); l.disp = disp; l.v[0] = a; l.v[1] = b; l.v[2] = c;
  pendientes++;
}

// ─── Hora ──────────────────────────────────────────────────────────────────
// El ESP32 no tiene reloj de tiempo real: la PC le escribe la hora UTC al conectar.
volatile bool     sincronizado = false;
volatile uint32_t epochSync = 0, msSync = 0;

uint32_t horaDe(uint32_t ms) {
  // Resta con signo: aguanta el desbordamiento de millis() cada ~49,7 días.
  return epochSync + (int32_t)(ms - msSync) / 1000;
}

// ─── BLE ───────────────────────────────────────────────────────────────────
BLECharacteristic* chDatos = nullptr;
BLE2902*           cccd    = nullptr;
volatile bool      conectado = false;
uint16_t seqA = 0, seqB = 0;

class CallbacksServidor : public BLEServerCallbacks {
  void onConnect(BLEServer*) override { conectado = true; }
  void onDisconnect(BLEServer*) override {
    conectado = false;
    BLEDevice::startAdvertising();       // vuelve a anunciarse para que la PC reconecte
  }
};

class CallbacksHora : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic* c) override {
    if (c->getLength() < 4) return;
    const uint8_t* d = c->getData();
    epochSync = d[0] | (d[1] << 8) | (d[2] << 16) | ((uint32_t)d[3] << 24);
    msSync = millis();
    sincronizado = true;
  }
};

// ─── Sensores ──────────────────────────────────────────────────────────────
void leerDispositivoA(double& fc, double& spo2, double& temp) {
#if SIMULAR
  const double t = millis() / 1000.0;
  fc   = 62 + 3 * sin(t / 60.0) + random(-15, 16) / 10.0;
  spo2 = 98 + random(-5, 6) / 10.0;
  temp = 36.6 + 0.1 * sin(t / 300.0);
#else
  // Ejemplo: pulsioxímetro MAX30102 por I²C y termómetro MLX90614.
  // Hay que añadir sus librerías y escribir aquí la lectura.
  fc = NAN; spo2 = NAN; temp = NAN;
#endif
}

void leerDispositivoB(double& fr, double& sis, double& dia) {
#if SIMULAR
  fr  = 14 + random(-10, 11) / 10.0;
  sis = 115 + random(-30, 31) / 10.0;
  dia = 75 + random(-20, 21) / 10.0;
#else
  fr = NAN; sis = NAN; dia = NAN;
#endif
}

// ─── Programa ──────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  randomSeed(esp_random());

  BLEDevice::init(NOMBRE_BLE);
  BLEServer* srv = BLEDevice::createServer();
  srv->setCallbacks(new CallbacksServidor());

  BLEService* svc = srv->createService(UUID_SERVICIO);
  chDatos = svc->createCharacteristic(UUID_DATOS, BLECharacteristic::PROPERTY_NOTIFY);
  cccd = new BLE2902();
  chDatos->addDescriptor(cccd);

  BLECharacteristic* chEsq = svc->createCharacteristic(UUID_ESQUEMA, BLECharacteristic::PROPERTY_READ);
  chEsq->setValue((uint8_t*)ESQUEMA_JSON, strlen(ESQUEMA_JSON));

  BLECharacteristic* chHora = svc->createCharacteristic(UUID_HORA, BLECharacteristic::PROPERTY_WRITE);
  chHora->setCallbacks(new CallbacksHora());

  svc->start();
  BLEAdvertising* adv = BLEDevice::getAdvertising();
  adv->addServiceUUID(UUID_SERVICIO);
  adv->setScanResponse(true);
  BLEDevice::startAdvertising();

  Serial.printf("EVA HUB listo como \"%s\". Esperando a la PC central…\n", NOMBRE_BLE);
}

void loop() {
  static uint32_t ultima = 0;
  if (millis() - ultima >= PERIODO_MS) {
    ultima = millis();
    double a, b, c;
    leerDispositivoA(a, b, c); encolar(0, a, b, c);
    leerDispositivoB(a, b, c); encolar(1, a, b, c);
  }

  // Sólo se envía con conexión, notificaciones activadas y hora recibida.
  if (conectado && sincronizado && cccd->getNotifications()) {
    for (size_t k = 0; k < ENVIOS_POR_CICLO && pendientes > 0; k++) {
      const Lectura& l = cola[inicio];
      uint8_t buf[32];
      const bool esA = (l.disp == 0);
      const size_t n = eva::codificar(buf, sizeof buf,
                                      esA ? ID_DISP_A : ID_DISP_B,
                                      esA ? ESQUEMA_A : ESQUEMA_B,
                                      esA ? seqA++ : seqB++,
                                      horaDe(l.ms),
                                      esA ? CAMPOS_A : CAMPOS_B, l.v, 3);
      chDatos->setValue(buf, n);
      chDatos->notify();
      inicio = (inicio + 1) % CAPACIDAD; pendientes--;
      delay(8);   // las notificaciones no tienen acuse: sin pausa, la pila las tira
    }
  }

  static uint32_t ultimoLog = 0;
  if (millis() - ultimoLog > 10000) {
    ultimoLog = millis();
    Serial.printf("conectado=%d hora=%d pendientes=%u descartadas=%lu\n",
                  conectado, sincronizado, (unsigned)pendientes, (unsigned long)descartadas);
  }
}
