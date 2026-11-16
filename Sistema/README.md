> 🌐 **Español** · [English](README.en.md)

# Sistema

El software de Lunna que correría en la nave y en Tierra. Arranca en **modo operativo**: sin simulador ni datos
sintéticos. La demo con la tripulación simulada está en [`../Simulacion/`](../Simulacion/README.md).

```bash
cd Sistema/backend
npm start          # http://localhost:8787 · requiere Node.js 22.6+, sin npm install
npm test
```

| Carpeta | Qué es |
|---|---|
| [`backend/`](backend) | Computadora central: ingesta de tramas, modelo LUNNA, umbrales clínicos, motor de padecimientos, enlace con Tierra (simulado y HTTPS), API REST y eventos en vivo. Sirve las interfaces |
| [`interfaces/eva/`](interfaces/eva) | Celular del astronauta (`/app/`), computadora central (`/app/central.html`) y base en Tierra (`/app/base.html`) |
| [`interfaces/reloj/`](interfaces/reloj) | Reloj de la tripulación (`/reloj/`) |
| [`esp32/`](esp32) | Firmware de la playera con sensores y sus vectores de prueba |
| [`pasarela/`](pasarela) | Pasarela Bluetooth LE hacia la central |

Umbrales clínicos y su fuente: [`backend/semillas/medibles.md`](backend/semillas/medibles.md). Arquitectura, API y
algoritmos: [`../documentacion/`](../documentacion/INDICE.md).
