# Enlace HTTPS nave ↔ Tierra

Transporte real (TLS) entre dos procesos del mismo backend. Todos los datos de la demo son SIMULADOS.

## Cómo correrlo
```
npm run certs      # certs/tierra.crt + tierra.key (autofirmado, desarrollo; --forzar regenera)
npm run tierra     # HTTPS :8443  (consola /tierra, /enlace/*)
npm run nave       # HTTP  :8787  (UI, app, /nave) + cliente HTTPS hacia Tierra
```
Variables: `BD`, `PUERTO` (0 = efímero; imprime `PUERTO=<n>`), `TIERRA_URL` (def. `https://localhost:8443`), `TIERRA_CA`, `TLS_CERT`, `TLS_KEY`, `PING_S` (def. 60), `TIMEOUT_S` (def. 5), `SIMULAR_OWLT=1`.
Estado: `GET /api/enlace/estado` (nave y Tierra). Código: `src/sincro.ts` (protocolo), `src/enlace-https.ts` (transporte).

## Algoritmo
- Cada lado tiene su cola de salida (outbox): `bajada` (nave→Tierra) y `subida` (Tierra→nave). Cada mensaje lleva `(emisor, seq)`, con seq monótono por emisor.
- Lotes por prioridad y luego seq; el cuerpo JSON va con `x-eva-sha256`. Si no coincide: 422 y no se aplica nada.
- El receptor guarda cada `(emisor, seq)` una sola vez (UNIQUE en `entrada`); inbox + aplicación en una transacción. Reenvíos = duplicados ignorados.
- ACK acumulado (1..n completos) + selectivos; el emisor marca `ack=1`. Lo no confirmado se reincluye solo en el siguiente lote: la reanudación parte de lo pendiente.
- Fallo de cualquier petición (timeout, red, status ≠ 200) → DESCONECTADO inmediato y reintento con backoff exponencial con jitter (base 1 s, tope = `PING_S`).
- Efecto: al-menos-una-vez en el transporte + idempotencia = exactamente-una-vez.

## Tiempos y canales
- `t_evento` (cuándo ocurrió), `t_envio` (salida del lote), `t_recepcion` (aplicado en el receptor); antigüedad = ahora − t_evento.
- Avisos Tierra→nave: `subida`. Avisos nave→Tierra: `bajada` tipo `aviso` (`POST /api/nave/avisos`). Datos: `alerta`, `resumen`, `crudos`, `evaluacion`, `acuse`.

## Latido (heartbeat)
Por defecto 60 s; se recomienda `PING_S=15`. Latencia de detección de caída ≤ `PING_S` + `TIMEOUT_S` (los fallos de lote se ven al instante). Un GET con keep-alive cuesta casi nada. Por debajo de ~10 s con `TIMEOUT_S=5` crece el riesgo de falsos DESCONECTADO por jitter.
Con Marte real (RTT de 8 a 48 min) un latido de segundos solo modela el tramo terrestre: manda la ventana y el retraso (`SIMULAR_OWLT=1` suma owlt antes y después de cada petición). Ventana cerrada = almacenar y reenviar, sin tráfico.

## Límites
- Solo TLS del servidor con certificado autofirmado de desarrollo: no hay autenticación de la nave ante Tierra (`x-eva-emisor` es informativo, no es credencial) ni cifrado de las BD.
- Una nave y una Tierra; sin rotación de certificados ni límites de tasa. Las llaves viven en `certs/` (ignorada por git); no se versionan.
- Reanudación a nivel de lote, no de byte.
