// ═══════════════════════════════════════════════════════════════════════════
//  PLAYERA EVA · firmware para el ESP32 que va DENTRO de la playera
//
//  Los sensores de la playera (electrodos de ECG, banda de respiración,
//  termómetro) no tienen radio: van cableados a este ESP32, que es el que
//  habla por Bluetooth Low Energy DIRECTO con la computadora central.
//
//    sensores ─cable─ ESP32 (en la playera) ── BLE ──► PC central (pasarela → backend → LUNNA)
//
//  El reloj, el brazalete de presión o cualquier otro aparato BLE se conectan
//  por su cuenta a la misma PC: no pasan por aquí.
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
#define DEPURAR 1                       // 1: el monitor serie muestra cada lectura y cada envío

const char*    NOMBRE_BLE  = "EVA-PLAYERA-01";
const uint32_t ID_DISP     = 401;       // registrado en el backend (playera-01)
const uint16_t ID_ESQUEMA  = 5;         // playera-esp32-v1
const uint32_t PERIODO_MS  = 1000;      // una lectura por segundo
const size_t   ENVIOS_POR_CICLO = 10;   // tramas pendientes que se vacían por vuelta

// UUID propios del perfil EVA. La pasarela busca este servicio.
#define UUID_SERVICIO "a3c87500-8ed3-4bdf-8a39-a01bebede295"
#define UUID_DATOS    "a3c87501-8ed3-4bdf-8a39-a01bebede295"   // notificar: tramas
#define UUID_ESQUEMA  "a3c87502-8ed3-4bdf-8a39-a01bebede295"   // leer: qué mando
#define UUID_HORA     "a3c87503-8ed3-4bdf-8a39-a01bebede295"   // escribir: hora UTC

// Disposición de la carga. Debe coincidir con el esquema 5 del backend.
//   fc u8 · fr u8 · temp i16 ×0,01   →  13 B de cabecera + 4 B = 17 B por trama
const eva::Campo CAMPOS[3] = { {eva::U8, 1, 0}, {eva::U8, 1, 0}, {eva::I16, 0.01, 0} };

const char* ESQUEMA_JSON =
  "{\"perfil\":1,\"dispositivos\":["
  "{\"id\":401,\"esquema\":5,\"campos\":[\"fc:u8\",\"fr:u8\",\"temp:i16*0.01\"]}]}";

// ─── Cola de lecturas pendientes ───────────────────────────────────────────
// Si no hay conexión, las lecturas se guardan y se mandan al reconectar.
// Se guarda el instante en millis() y la trama se arma al enviar: así una
// lectura tomada ANTES de recibir la hora sale igualmente con su hora real.
struct Lectura { uint32_t ms; double v[3]; };
const size_t CAPACIDAD = 1800;          // ≈ 30 min a 1 Hz (~50 KB de RAM)
Lectura cola[CAPACIDAD];
size_t inicio = 0, pendientes = 0;
uint32_t descartadas = 0;               // lecturas perdidas por cola llena

void encolar(double a, double b, double c) {
  if (pendientes == CAPACIDAD) {        // llena: se pierde la más antigua
    inicio = (inicio + 1) % CAPACIDAD; pendientes--; descartadas++;
  }
  Lectura& l = cola[(inicio + pendientes) % CAPACIDAD];
  l.ms = millis(); l.v[0] = a; l.v[1] = b; l.v[2] = c;
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
// Los callbacks de BLE sólo levantan banderas; el loop imprime (no se escribe al
// puerto serie desde la tarea de Bluetooth).
volatile bool      avisoConexion = false, avisoDesconexion = false, avisoHora = false;
uint16_t seq = 0;

class CallbacksServidor : public BLEServerCallbacks {
  void onConnect(BLEServer*) override { conectado = true; avisoConexion = true; }
  void onDisconnect(BLEServer*) override {
    conectado = false;
    avisoDesconexion = true;
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
    avisoHora = true;
  }
};

// ─── Sensores de la playera ────────────────────────────────────────────────
void leerPlayera(double& fc, double& fr, double& temp) {
#if SIMULAR
  const double t = millis() / 1000.0;
  fc   = 62 + 3 * sin(t / 60.0) + random(-15, 16) / 10.0;
  fr   = 14 + random(-10, 11) / 10.0;
  temp = 36.6 + 0.1 * sin(t / 300.0);
#else
  // Ejemplo (sin probar): ECG AD8232 en un pin analógico para la FC,
  // banda de respiración por pletismografía o galga en otro, y termómetro
  // MAX30205 por I²C en la axila. Hay que añadir sus librerías y escribir aquí
  // la lectura. Si un sensor falla, devuelve NAN: esa lectura no se envía
  // (el perfil EVA no tiene "valor ausente" y un NAN no cabe en un entero).
  fc = NAN; fr = NAN; temp = NAN;
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

  Serial.printf("Playera EVA lista como \"%s\". Esperando a la PC central…\n", NOMBRE_BLE);
}

void loop() {
  if (avisoConexion)    { avisoConexion = false;    Serial.println("PC central conectada"); }
  if (avisoDesconexion) { avisoDesconexion = false; Serial.println("PC central desconectada; anunciandose de nuevo"); }
  if (avisoHora)        { avisoHora = false;        Serial.printf("hora recibida: %lu (UTC)\n", (unsigned long)epochSync); }

  static uint32_t ultima = 0;
  if (millis() - ultima >= PERIODO_MS) {
    ultima = millis();
    double fc, fr, temp;
    leerPlayera(fc, fr, temp);
    if (!isnan(fc) && !isnan(fr) && !isnan(temp)) {
      encolar(fc, fr, temp);
#if DEPURAR
      Serial.printf("lectura fc=%.1f fr=%.1f temp=%.2f -> cola %u\n", fc, fr, temp, (unsigned)pendientes);
#endif
    } else {
      Serial.println("lectura invalida (sensor sin dato): no se encola");
    }
  }

  // Sólo se envía con conexión, notificaciones activadas y hora recibida.
  if (conectado && sincronizado && cccd->getNotifications()) {
    for (size_t k = 0; k < ENVIOS_POR_CICLO && pendientes > 0; k++) {
      const Lectura& l = cola[inicio];
      uint8_t buf[32];
      const size_t n = eva::codificar(buf, sizeof buf, ID_DISP, ID_ESQUEMA, seq++,
                                      horaDe(l.ms), CAMPOS, l.v, 3);
      chDatos->setValue(buf, n);
      chDatos->notify();
#if DEPURAR
      Serial.printf("enviada trama seq=%u (%u B)\n", (unsigned)(uint16_t)(seq - 1), (unsigned)n);
#endif
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
