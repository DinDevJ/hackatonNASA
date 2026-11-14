/*
 * EVA · simulador de hardware en ESP32 (trama eva.ble.v1)
 *
 * Hace de reloj/traje y de nodo de cabina: anuncia el servicio EVA por Bluetooth LE
 * y manda cada segundo los paquetes descritos en ../../README.md.
 *
 * Placa: cualquier ESP32 con Bluetooth LE (ESP32-WROOM, DevKit v1, S3, C3).
 * Arduino IDE: instalar "esp32 by Espressif" y elegir la placa. No hacen falta librerías extra.
 *
 * Cambiar de escenario, tres formas:
 *   - botón BOOT de la placa: pasa al siguiente
 *   - monitor serie a 115200: escribir un dígito de 0 a 7
 *   - por Bluetooth: escribir 02 <n> en la característica CONTROL
 *
 *   0 nominal · 1 fiebre · 2 evento solar · 3 CO2 alto · 4 hipoxia
 *   5 prueba ortostática · 6 arritmia · 7 sin contacto
 *
 * Para usar sensores de verdad, sustituir el contenido de leerSensores():
 * el resto del programa (empaquetado y Bluetooth) no cambia.
 */
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

#define UUID_SERVICIO    "4d6f6e61-7263-6173-4556-410000000001"
#define UUID_TRAMA       "4d6f6e61-7263-6173-4556-410000000002"  // notify
#define UUID_CONTROL     "4d6f6e61-7263-6173-4556-410000000003"  // write
#define UUID_CAPACIDADES "4d6f6e61-7263-6173-4556-410000000004"  // read

#define PIN_BOTON 0  // botón BOOT

// ---- trama eva.ble.v1 -------------------------------------------------------
const uint8_t VERSION = 1;
enum { T_VITALES = 1, T_LATIDOS = 2, T_HABITAT = 3, T_EVENTO = 4 };
enum { F_CONTACTO = 1, F_MOVIMIENTO = 2, F_RELOJ = 4, F_BATERIA_BAJA = 8, F_SIMULADO = 16 };
enum { EV_ME_ACUESTO = 1, EV_ME_LEVANTO = 2, EV_DE_PIE = 3, EV_AYUDA = 4, EV_INICIO_EJ = 5, EV_FIN_EJ = 6 };
enum { NOMINAL, FIEBRE, EVENTO_SOLAR, CO2_ALTO, HIPOXIA, ORTOSTATICO, ARRITMIA, SIN_CONTACTO, N_ESCENARIOS };
const char *NOMBRE[N_ESCENARIOS] = { "nominal", "fiebre", "evento solar", "CO2 alto", "hipoxia",
                                     "prueba ortostatica", "arritmia", "sin contacto" };

const uint8_t SIN_U8 = 0xFF;
const uint16_t SIN_U16 = 0xFFFF;
const int16_t SIN_I16 = 0x7FFF;

// Lo que se mide. leerSensores() lo rellena; aquí, simulado.
struct Lectura {
  float fc, spo2, fr, temp_piel, actividad;         // persona
  float ppco2, ppo2, temp_cabina, humedad, tasa_dosis, ruido, lux;  // cabina
  uint8_t postura;                                   // 0 desconocida 1 acostado 2 sentado 3 de pie 4 en movimiento
  bool contacto;
};

// Objetivo de cada escenario; -1 = igual que nominal. Mismos números que simulador.mjs.
//                       fc   spo2  fr  piel  act  co2  o2   tcab hum dosis ruido lux
const float OBJ[N_ESCENARIOS][12] = {
  /* nominal      */ { 62, 97.5, 14, 33.6, 5, 2.0, 150, 22.5, 45, 20,   58, 300 },
  /* fiebre       */ { 84, -1,   20, 35.1, -1, -1, -1,  -1,   -1, -1,   -1, -1 },
  /* evento solar */ { -1, -1,   -1, -1,   -1, -1, -1,  -1,   -1, 6000, -1, -1 },
  /* CO2 alto     */ { -1, -1,   -1, -1,   -1, 5.2, -1, -1,   -1, -1,   -1, -1 },
  /* hipoxia      */ { 96, 86,   22, -1,   -1, -1, 118, -1,   -1, -1,   -1, -1 },
  /* ortostatico  */ { 99, -1,   -1, -1,   -1, -1, -1,  -1,   -1, -1,   -1, -1 },
  /* arritmia     */ { -1, -1,   -1, -1,   -1, -1, -1,  -1,   -1, -1,   -1, -1 },
  /* sin contacto */ { -1, -1,   -1, -1,   -1, -1, -1,  -1,   -1, -1,   -1, -1 },
};

BLECharacteristic *cTrama;
bool conectado = false;
uint8_t escenario = NOMINAL;
uint8_t eventoPendiente = 0;
float v[12];                 // valores actuales, se acercan al objetivo
uint16_t seq = 0;
uint32_t horaBase = 0;       // segundos Unix cuando millis() era baseMs; 0 = reloj sin poner
uint32_t baseMs = 0;
float restoLatido = 0;

float ruido(float amp) { return ((float)random(-1000, 1001) / 1000.0f) * amp; }

uint32_t ahora() { return horaBase ? horaBase + (millis() - baseMs) / 1000 : millis() / 1000; }

void cambiarEscenario(uint8_t n) {
  if (n >= N_ESCENARIOS) return;
  escenario = n;
  if (n == ORTOSTATICO) eventoPendiente = EV_DE_PIE;
  Serial.printf("Escenario %u: %s\n", n, NOMBRE[n]);
}

// ---- AQUÍ van los sensores reales ------------------------------------------
// MAX30102 -> fc, spo2, intervalos entre latidos · termistor/MLX90614 -> temp_piel
// MPU6050 -> actividad y postura · SCD41 -> ppco2, temp_cabina, humedad · dosímetro -> tasa_dosis
void leerSensores(Lectura &l) {
  float tau = escenario == ORTOSTATICO ? 4 : 8;
  for (int i = 0; i < 12; i++) {
    float obj = OBJ[escenario][i] < 0 ? OBJ[NOMINAL][i] : OBJ[escenario][i];
    v[i] += (obj - v[i]) / tau;
  }
  l.contacto = escenario != SIN_CONTACTO;
  l.fc = v[0] + ruido(1.5);
  l.spo2 = v[1] + ruido(0.5);
  l.fr = v[2] + ruido(0.5);
  l.temp_piel = v[3] + ruido(0.05);
  l.actividad = max(0.0f, v[4] + ruido(3));
  l.ppco2 = v[5] + ruido(0.05);
  l.ppo2 = v[6] + ruido(0.5);
  l.temp_cabina = v[7] + ruido(0.1);
  l.humedad = v[8] + ruido(1);
  l.tasa_dosis = max(0.0f, v[9] * (1 + ruido(0.05)));
  l.ruido = v[10] + ruido(1);
  l.lux = v[11] + ruido(10);
  l.postura = escenario == ORTOSTATICO ? 3 : 2;
}

// Intervalos entre latidos de este segundo (máximo 5). Devuelve cuántos.
uint8_t leerLatidos(uint16_t *ibi, float fc, float fr) {
  uint8_t n = 0;
  float libre = 1000 + restoLatido;
  while (n < 5) {
    float ms = escenario == ARRITMIA
                 ? 450 + random(0, 700)
                 : (60000.0f / fc) * (1 + 0.04f * sin(2 * PI * ahora() * fr / 60.0f) + ruido(0.015));
    if (ms > libre) break;
    ibi[n++] = (uint16_t)ms;
    libre -= ms;
  }
  restoLatido = libre;
  return n;
}

// ---- empaquetado (little-endian) --------------------------------------------
void p16(uint8_t *b, uint16_t x) { b[0] = x & 0xFF; b[1] = x >> 8; }
void p32(uint8_t *b, uint32_t x) { p16(b, x & 0xFFFF); p16(b + 2, x >> 16); }
uint8_t u8(float x, float escala = 1) { return (uint8_t)constrain(lroundf(x * escala), 0, 254); }
uint16_t u16(float x, float escala = 1) { return (uint16_t)constrain(lroundf(x * escala), 0, 65534); }

void cabecera(uint8_t *b, uint8_t tipo, uint8_t flags) {
  b[0] = (VERSION << 4) | tipo;
  b[1] = flags | (horaBase ? F_RELOJ : 0) | F_SIMULADO;  // quitar F_SIMULADO con sensores reales
  p16(b + 2, seq++);
  p32(b + 4, ahora());
}

void enviar(uint8_t *b, size_t n) {
  cTrama->setValue(b, n);
  cTrama->notify();
  delay(15);  // deja respirar a la pila Bluetooth entre notificaciones
}

void enviarVitales(const Lectura &l) {
  uint8_t b[20] = { 0 };
  cabecera(b, T_VITALES, l.contacto ? F_CONTACTO : 0);
  b[8] = l.contacto ? u8(l.fc) : SIN_U8;
  b[9] = l.contacto ? u8(l.spo2) : SIN_U8;
  b[10] = l.contacto ? u8(l.fr, 2) : SIN_U8;
  p16(b + 11, l.contacto ? (uint16_t)(int16_t)lroundf(l.temp_piel * 100) : (uint16_t)SIN_I16);
  p16(b + 13, u16(l.actividad));
  b[15] = l.postura;
  b[16] = 0;                    // pasos en el último segundo
  b[17] = l.contacto ? 90 : 0;  // calidad de la señal, 0-100
  b[18] = 87;                   // batería, %
  enviar(b, 20);
}

void enviarLatidos(const uint16_t *ibi, uint8_t n) {
  uint8_t b[20] = { 0 };
  cabecera(b, T_LATIDOS, F_CONTACTO);
  b[8] = n;
  for (uint8_t i = 0; i < n; i++) p16(b + 9 + 2 * i, ibi[i]);
  enviar(b, 20);
}

void enviarHabitat(const Lectura &l) {
  uint8_t b[20] = { 0 };
  cabecera(b, T_HABITAT, 0);
  p16(b + 8, u16(l.ppco2, 100));
  p16(b + 10, u16(l.ppo2, 10));
  p16(b + 12, (uint16_t)(int16_t)lroundf(l.temp_cabina * 100));
  b[14] = u8(l.humedad);
  p16(b + 15, u16(l.tasa_dosis));
  b[17] = u8(l.ruido);
  p16(b + 18, u16(l.lux));
  enviar(b, 20);
}

void enviarEvento(uint8_t codigo) {
  uint8_t b[9] = { 0 };
  cabecera(b, T_EVENTO, F_CONTACTO);
  b[8] = codigo;
  enviar(b, 9);
}

// ---- Bluetooth ---------------------------------------------------------------
class Conexion : public BLEServerCallbacks {
  void onConnect(BLEServer *) override { conectado = true; Serial.println("Conectado"); }
  void onDisconnect(BLEServer *s) override {
    conectado = false;
    Serial.println("Desconectado");
    s->getAdvertising()->start();
  }
};

class Control : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *c) override {
    uint8_t *d = c->getData();
    size_t n = c->getLength();
    if (n == 5 && d[0] == 0x01) {  // poner el reloj: 01 + segundos Unix (u32)
      horaBase = d[1] | (d[2] << 8) | ((uint32_t)d[3] << 16) | ((uint32_t)d[4] << 24);
      baseMs = millis();
      Serial.printf("Reloj puesto: %lu\n", (unsigned long)horaBase);
    } else if (n == 2 && d[0] == 0x02) {  // cambiar escenario: 02 + n
      cambiarEscenario(d[1]);
    }
  }
};

void setup() {
  Serial.begin(115200);
  pinMode(PIN_BOTON, INPUT_PULLUP);
  randomSeed(esp_random());
  for (int i = 0; i < 12; i++) v[i] = OBJ[NOMINAL][i];

  BLEDevice::init("EVA-SIM");
  BLEServer *servidor = BLEDevice::createServer();
  servidor->setCallbacks(new Conexion());
  BLEService *servicio = servidor->createService(UUID_SERVICIO);

  cTrama = servicio->createCharacteristic(UUID_TRAMA, BLECharacteristic::PROPERTY_NOTIFY);
  cTrama->addDescriptor(new BLE2902());

  BLECharacteristic *cControl = servicio->createCharacteristic(
    UUID_CONTROL, BLECharacteristic::PROPERTY_WRITE | BLECharacteristic::PROPERTY_WRITE_NR);
  cControl->setCallbacks(new Control());

  // versión, tipo de fuente (7 = sintético), máscara con los 16 campos
  uint8_t caps[4] = { VERSION, 7, 0xFF, 0xFF };
  BLECharacteristic *cCaps = servicio->createCharacteristic(UUID_CAPACIDADES, BLECharacteristic::PROPERTY_READ);
  cCaps->setValue(caps, 4);

  servicio->start();
  BLEAdvertising *anuncio = BLEDevice::getAdvertising();
  anuncio->addServiceUUID(UUID_SERVICIO);
  anuncio->setScanResponse(true);
  BLEDevice::startAdvertising();
  Serial.println("EVA-SIM anunciando. Escenario 0: nominal");
}

void loop() {
  static uint32_t proximo = 0;
  static uint32_t segundos = 0;
  static bool botonAntes = HIGH;

  bool boton = digitalRead(PIN_BOTON);
  if (botonAntes == HIGH && boton == LOW) cambiarEscenario((escenario + 1) % N_ESCENARIOS);
  botonAntes = boton;
  if (Serial.available()) {
    char c = Serial.read();
    if (c >= '0' && c <= '7') cambiarEscenario(c - '0');
  }

  if (millis() < proximo) { delay(5); return; }
  proximo = millis() + 1000;
  segundos++;

  Lectura l;
  leerSensores(l);  // el simulador sigue avanzando aunque no haya nadie conectado
  if (!conectado) return;

  if (eventoPendiente) { enviarEvento(eventoPendiente); eventoPendiente = 0; }
  enviarVitales(l);
  if (l.contacto) {
    uint16_t ibi[5];
    uint8_t n = leerLatidos(ibi, l.fc, l.fr);
    if (n) enviarLatidos(ibi, n);
  }
  if (segundos % 5 == 0) enviarHabitat(l);
}
