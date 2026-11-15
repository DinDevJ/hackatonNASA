# 10 · Seguridad, confiabilidad y gestión de riesgos

Este documento distingue lo **implementado** (con su archivo) de lo **recomendado** (que no existe en el código). LUNNA es un prototipo de hackatón: su modelo de amenazas asume una red local de confianza y operadores que conocen que los datos son sintéticos.

## 1. Seguridad de la arquitectura

### 1.1 Medidas implementadas

| Medida | Dónde | Qué protege |
|---|---|---|
| Intérprete de fórmulas propio, **sin `eval`**, que rechaza todo lo que no sea aritmética, funciones permitidas y claves de la trama; la fórmula se valida al guardar | [`formula.ts`](../Sistema/backend/src/formula.ts) | Inyección de código mediante esquemas |
| Servidor de estáticos confinado: resuelve la ruta y exige que quede dentro de la carpeta raíz; rechaza `\0` y rutas mal codificadas | `servirArchivo` en [`servidor.ts`](../Sistema/backend/src/servidor.ts) | Recorrido de directorios (`../`) |
| Lista blanca de carpetas servidas (`eva`, `reloj`) | `INTERFACES` en `servidor.ts` | Exposición del resto del repositorio |
| Límite de cuerpo de 5 MB (413) | `cuerpo()` en `servidor.ts` | Agotamiento de memoria por peticiones grandes |
| Consultas SQL parametrizadas (`prepare(...).run(?)`) | Todo el backend | Inyección SQL |
| Validación de entradas: id u32 de dispositivo, entornos permitidos, τ₀ y σ > 0, prior con `fuente`, variables registradas en esquemas | Rutas de `servidor.ts` | Datos de configuración inválidos |
| Modo operativo que bloquea simulador, escenario y reinicio (404/403) | `servidor.ts` | Mezcla de datos sintéticos con operativos |
| Bases separadas por modo | Arranque de `servidor.ts` | Contaminación de la base operativa |
| TLS en el enlace nave → Tierra (servidor), verificación con la CA configurada | [`enlace-https.ts`](../Sistema/backend/src/enlace-https.ts), [`rol.ts`](../Sistema/backend/src/rol.ts) | Escucha y alteración en tránsito del enlace |
| Integridad de lotes con `x-eva-sha256`; si no coincide, 422 y no se aplica nada | `sincro.ts` / `enlace-https.ts` | Lotes corruptos |
| Llaves fuera de git (`certs/` ignorada) | `.gitignore` | Publicación de llaves |
| Prototipo: los scripts nunca piden ni usan tokens; solo se descargan pesos públicos | `scripts/descargar_pesos.ps1` | Fuga de credenciales |
| Carga de pesos de EchoNet-Dynamic con `weights_only=True` y `safe_globals` mínimos; `weights_only=False` solo con nombre oficial y tamaño exacto | `adapters/echonet_dynamic/infer.py` | Ejecución de código mediante archivos `pickle` |

### 1.2 Lo que **no** existe

| Aspecto | Estado |
|---|---|
| Autenticación de usuarios | **No hay.** Ninguna ruta exige credenciales |
| Autorización por rol (tripulante, CMO, Tierra) | **No hay en el backend.** La privacidad por rol la aplica solo la interfaz; cualquiera con acceso a la red puede leer `/api/app/:tripulante` |
| Autenticación de la nave ante Tierra | **No hay.** `x-eva-emisor` es informativo, no es credencial. TLS solo del lado servidor, sin TLS mutuo |
| CORS | Abierto (`Access-Control-Allow-Origin: *`) |
| Cifrado en reposo | **No hay.** `eva.db` y las bases de los roles están en claro |
| Cifrado del enlace simulado y de BLE | No hay. El perfil BLE EVA no declara emparejamiento seguro, y la trama no tiene CRC, FEC ni firma |
| Límites de tasa | No hay |
| Rotación de certificados | No hay; el certificado es autofirmado de desarrollo |
| Registro de auditoría de accesos | No hay (sí hay registro de actividad en la terminal) |

## 2. Comunicación segura

- **HTTP local** (puerto 8787) para interfaces, pasarela y API. No usa TLS.
- **HTTPS** (puerto 8443) solo entre nave y Tierra, con `npm run certs`, `npm run tierra` y `npm run nave`. Sirve para demostrar el transporte, no como configuración de producción.
- **SSE** sobre el mismo HTTP local.
- **BLE** entre playera o brazalete y pasarela, sin capa de seguridad propia documentada.

## 3. Protección de la información

- La tripulación de la demo es **ficticia** y los datos de la demo son **sintéticos**. Los datos reales que contiene el repositorio son públicos (PhysioNet, OSDR, DONKI) y llevan su licencia.
- La interfaz aplica la matriz de privacidad del ERS §6.5:
  - la CMO ve la tendencia del ánimo;
  - Tierra, la puntuación y un resumen diario;
  - el diario y el ciclo, solo con permiso.

  **Es un control de presentación, no de acceso.**
- Por ser datos de salud, una implementación real requeriría consentimiento, mínimo privilegio, cifrado y auditoría, aspectos fuera del alcance del prototipo (ver la nota de entrenamiento en el README consolidado).

## 4. Integridad de los datos

| Mecanismo | Detalle |
|---|---|
| Idempotencia de la ingesta | `UNIQUE (tripulante, dispositivo, seq, variable, t_scet)`: un reenvío no duplica |
| Atribución por asignación con intervalo | El tripulante no viaja en la trama; los trajes reutilizados no atribuyen datos a otra persona |
| Esquemas versionados | Editar crea otro id; las tramas viejas se siguen decodificando con el suyo |
| Doble tiempo | `t_scet` (cuándo ocurrió) frente a `t_recibida` / `t_ert` (cuándo llegó) |
| Exactamente-una-vez nave ↔ Tierra | `(emisor, seq)` monótono y `UNIQUE` en `entrada`; aplicación transaccional; ACK acumulado y selectivo |
| Base prevuelo inmutable (motor) | Un intento de reescribirla se rechaza y se registra (invariante e.1.1) |
| Canales separados real / SIMULADO | El canal real rechaza y registra cualquier punto simulado |
| Faltante ≠ 0 | En todos los formatos, un faltante es vacío con motivo `sin_dato` |
| Trazabilidad de ejecuciones de modelos | `outputs/raw/<run_id>/` con request, response, logs, sha256 de las entradas y checkpoint |

## 5. Gestión de errores y desconexiones

| Situación | Comportamiento implementado |
|---|---|
| Backend caído (pasarela) | Cola local de hasta 50 000 tramas; reintento con espera creciente, sin perder datos |
| Backend caído (interfaces) | «Sin conexión con el backend», reintento cada 5 s; el reloj vuelve al valor simulado tras 20 s y lo indica |
| Ventana con Tierra cerrada | *Store-and-forward*: los paquetes esperan; la prioridad se mantiene (0 rojo, 1 ámbar, 2 resto) |
| Enlace HTTPS caído | DESCONECTADO inmediato y *backoff* exponencial con *jitter*; lo no confirmado se reincluye. Latencia de detección ≤ `PING_S` + `TIMEOUT_S` |
| Puerto ocupado | Mensaje claro y salida (`EADDRINUSE`) |
| Referencias clínicas ausentes o inválidas | Se avisa y se sigue sin umbrales nuevos |
| CSV de salud ausentes o mal formados | Se avisa; transacción con `ROLLBACK` |
| Bases antiguas | Migraciones aditivas (`ALTER TABLE … ADD COLUMN`) al abrir |
| Modelo que se pasa del tiempo | El runner aplica `timeout_s` del manifest |

## 6. Continuidad, respaldo y recuperación

**Implementado:**
- SQLite en modo WAL con `busy_timeout = 5000`.
- Semillas idempotentes: al arrancar se restaura la configuración mínima.
- `POST /api/demo/reiniciar`, solo en simulación, vacía la misión y conserva la configuración.

**No implementado** (recomendaciones):
- respaldos programados;
- réplica o alta disponibilidad;
- procedimiento documentado de recuperación.

Para respaldar a mano, detén el backend y copia `eva.db` junto con `eva.db-wal` y `eva.db-shm` (o deja que el cierre los consolide). **No muevas la base con el backend escribiendo.**

## 7. Riesgos

### 7.1 Riesgos tecnológicos

| Riesgo | Probabilidad / impacto | Control actual | Recomendación |
|---|---|---|---|
| Acceso no autorizado a datos de salud en la red | Alta si se expone / alto | Ninguno (solo local) | Autenticación, autorización por rol, TLS en 8787, CORS restringido |
| Suplantación de la nave ante Tierra | Media / alto | Ninguno | TLS mutuo o firma de lotes |
| Tramas BLE falsificadas o alteradas | Media / alto | Ninguno | Emparejamiento seguro, MAC o firma en la trama |
| Pérdida de notificaciones BLE | Media / medio | `seq` detecta huecos | Mecanismo de recuperación de huecos |
| Divergencia entre copias del código | Media / medio | Código activo único en `Sistema/` (integración del 15 nov) | Hacer los cambios solo en `Sistema/`; buscar marcadores de conflicto antes de cada commit (`git grep -n '^<<<<<<< '`) |
| Ejecución de procesos hijos desde la API (motor y modelos) | Media / alto si se expone | El archivo debe ser un nombre de la lista de muestras (sin rutas, sin `..`, sin enlaces que salgan); timeout más margen que termina el árbol de procesos; un trabajo a la vez por modelo | Restringir estas rutas a la CMO cuando exista autenticación |
| Dependencia de un Python concreto (3.13) | Media / medio | Scripts de instalación | Fijar la versión y comprobarla en `verificar.py` |
| Licencias de pesos de eco | — / medio | Uso local, no comercial | No redistribuir pesos |
| Corrupción de SQLite al copiarla | Baja / alto | WAL | Copias con el backend detenido o con `VACUUM INTO` |

### 7.2 Riesgos del procesamiento de información fisiológica

| Riesgo | Control actual |
|---|---|
| Tomar una alerta o un color como diagnóstico | Textos «no es un diagnóstico», «se recomienda revisión por el cirujano de vuelo», sin porcentajes |
| Falsa tranquilidad (VERDE con datos pobres) | GRIS si la cobertura es < 0,5 o falta el núcleo; un negativo N4 no respalda VERDE |
| Aprender una anomalía como normal | Calibración congelada (LUNNA, 14 días); base prevuelo inmutable, cuarentena de 72 h y EWMA con tope (motor) |
| Sensores poco fiables (SpO₂ de muñeca, cuffless) | Niveles N2/N4; aviso de que la SpO₂ de muñeca sobreestima en hipoxemia |
| Umbrales terrestres en el espacio | Rótulo [T]; los cambios esperados en vuelo se modelan en los priores |
| Valor igual al umbral que no dispara | Documentado; pendiente de resolver |
| Mezcla de datos simulados y reales | Canales y bases separados; distintivos visuales |
| Salidas de modelos sin validar | N4: nunca dan ROJO solas ni actualizan bases |
| Evento DONKI confundido con dosis personal | Se rotula como simulación |

## 8. Limitaciones del sistema

- No es un dispositivo médico, no tiene certificación y no tiene validación clínica.
- No tiene tolerancia a radiación, tiempo real determinista ni redundancia de hardware.
- Hay una sola nave y una sola Tierra. La reanudación es por lote, no por byte.
- El firmware no se ha probado en placa. BLE no está verificado de extremo a extremo.
- Las interfaces todavía dibujan en gran parte un escenario sintético.
- Ver también las limitaciones de [modelos](README_06_MODELOS_COMPUTACIONALES_ALGORITMOS.md#7-limitaciones) y de [validación](README_08_PRUEBAS_VALIDACION.md#6-limitaciones).

## 9. Consideraciones para entornos de EVA

En este documento, «EVA» es el nombre del sistema. Para una **actividad extravehicular**, el motor contempla, sin implementación de sensores:

- **P10** (enfermedad por descompresión tras EVA): queda en nivel C y el modelo de Conkin está **inactivo**, porque faltan tiempo de EVA, prerrespiración, presión del traje y deambulación;
- el **contexto `eva`**, que se trata como episodio y bloquea el aprendizaje de ese día.

El backend no tiene integración con trajes ni sistemas de soporte vital reales. Cualquier uso en una EVA requeriría hardware certificado, validación del enlace en condiciones de vuelo y protocolos médicos oficiales.

## 10. Recomendaciones de mejora (no implementadas)

1. Autenticación y autorización por rol en el backend, con la matriz de privacidad aplicada del lado servidor.
2. TLS también en el puerto 8787 y CORS limitado al origen de las interfaces.
3. TLS mutuo o firma de lotes entre nave y Tierra; rotación de certificados.
4. CRC o MAC en la trama EVA y emparejamiento BLE seguro.
5. Cifrado en reposo de las bases y respaldos programados y verificados.
6. Límites de tasa y registro de auditoría.
7. Resolver la comparación inclusiva o estricta de umbrales.
8. Medir la tasa de falsas alarmas con ruido realista y validar con datos de análogos o de vuelo.

## Documentación relacionada

- [Arquitectura del sistema](README_04_ARQUITECTURA_SISTEMA.md)
- [Integración e interoperabilidad](README_05_INTEGRACION_INTEROPERABILIDAD.md)
- [Pruebas y validación](README_08_PRUEBAS_VALIDACION.md)
- [Planeación general](README_01_PLANEACION.md)
