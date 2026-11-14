# Stack, dependencias y estado de DONKI

Decisión de lenguaje, qué reutilizar en vez de escribir, y qué pasó al probar la API.

✅ verificado · ⚠️ verificar · 🔶 decisión nuestra

---

## 1. ✅ DONKI: la API existe y responde

Probado en vivo desde esta sesión:

```bash
curl "https://api.nasa.gov/DONKI/SEP?startDate=2026-09-01&endDate=2026-11-14&api_key=DEMO_KEY"
```

**El endpoint existe y contesta.** Pero con `DEMO_KEY` devolvió `429 OVER_RATE_LIMIT`:

```json
{ "error": { "code": "OVER_RATE_LIMIT",
             "message": "You have exceeded your rate limit..." } }
```

**Causa:** `DEMO_KEY` es compartido por dirección IP y tiene cuota muy baja. No es un
fallo del endpoint ni de la URL.

### 🚩 Acción inmediata, antes de escribir una línea de código de radiación

**Saquen su propia API key en https://api.nasa.gov** — es gratis, instantánea, y llega
por correo. Con llave propia la cuota sube de forma drástica.

🔶 Y una regla de demo que no es negociable: **la demo nunca llama a la red en vivo.**
Se descarga el JSON de DONKI antes, se guarda en el repo, y la app lo lee de disco. Una
demo que depende del wifi del venue es una demo que falla. Además encaja con el
discurso: el software es offline-first, así que **leer de un archivo local es lo
correcto, no un atajo.**

⚠️ Pendiente: confirmar el esquema exacto de la respuesta (nombres de campos del SEP).
No lo pude ver porque nunca pasé del 429.

---

## 2. La pregunta del lenguaje

Preguntaste si Rust es el mejor, porque Python exige muchas librerías y entornos.

**Respuesta corta: no, y el motivo no es Rust. La pregunta está en el eje equivocado.**

El cuello de botella no es qué lenguaje es más limpio. Es:

> ¿Qué corre **en un teléfono**, **sin red**, **con interfaz**, que **seis personas**
> puedan construir en **18 horas**, y que un **juez pueda abrir en su propio celular**?

Contra ese criterio:

| | Rust | Python | **Web · TypeScript** |
|---|---|---|---|
| Corre en el teléfono | UI móvil inmadura | No, de forma práctica | ✅ Es un navegador |
| Habla con el reloj por BLE | Doloroso en móvil | No en móvil | ✅ Web Bluetooth |
| Setup de entorno | Toolchain + cross-compile | **Tu queja, válida** | ✅ **Ninguno** |
| Iteración a las 3am | Compilación + borrow checker | Rápida | ✅ Recargar |
| Lo pueden tocar los 6 | Sólo quien sepa Rust | Varios | ✅ Casi cualquiera |
| El juez lo abre | Instalar un APK | No | ✅ **Un enlace** |

### Por qué Rust no aporta aquí

Las fortalezas reales de Rust — rendimiento, seguridad de memoria, sin recolector de
basura — **son irrelevantes en este problema.** Están evaluando ~20 reglas sobre 180
muestras diarias. Eso son microsegundos en cualquier lenguaje, incluido JavaScript. Se
pagaría todo el costo de Rust sin cobrar ninguno de sus beneficios.

Y tu queja de Python es legítima, pero Python falla por una razón distinta y peor:
**tampoco corre en un teléfono** de forma razonable.

### 🔶 Recomendación: PWA en TypeScript, con Python sólo como herramienta de taller

**Lo que se entrega:** una aplicación web instalable (PWA).
- Service worker → funciona sin red de verdad. **Eso no es un detalle técnico: es tu
  diferenciador, demostrable en vivo con el modo avión.**
- Web Bluetooth → lee el reloj
- Se despliega como URL → el jurado la abre en su propio teléfono

**Lo que NO se entrega:** un par de scripts de Python que corren en la laptop de alguien
para generar el dataset sintético y verificar la matemática del z-score. Producen un
JSON que la app lee. **Nunca viajan con el producto, así que su entorno no es problema
de nadie.**

### ⚠️ El riesgo real de este plan, y hay que verificarlo YA

**Web Bluetooth funciona en Chrome sobre Android. NO funciona en Safari sobre iOS.**

Si el teléfono de pruebas es un iPhone, este plan se rompe en la parte del reloj.
Plan B en ese caso: exportar los datos del reloj a archivo e importarlos. Menos
vistoso, pero el resto del producto sigue intacto.

**Primera verificación del rol de datos: ¿qué teléfono y qué reloj van a usar?**

### Lo que cambiaría mi recomendación

No sé qué sabe cada uno de ustedes seis. Si hay dos personas fluidas en Rust o Flutter
y nadie toca JavaScript, **la respuesta se invierte**: el lenguaje que el equipo ya
domina gana a cualquier argumento técnico cuando quedan 18 horas.

---

## 3. Qué reutilizar en vez de escribir

Buscado en GitHub hoy. Las estrellas son del momento de la búsqueda.

### Motor de reglas — resuelto, no lo escriban

| Repo | ⭐ | Nota |
|---|---|---|
| **CacheControl/json-rules-engine** | 3 148 | *"A rules engine expressed in JSON"*. **Es exactamente lo que diseñamos**: reglas declarativas en JSON, auditables, abribles frente al jurado |
| ali-master/rule-engine | 364 | TypeScript, alternativa moderna |
| mithunsatheesh/node-rules | 685 | Encadenamiento hacia adelante |

🔶 Usar `json-rules-engine`. El diseño del YAML se traduce casi uno a uno, y **ahorra
unas 3 horas de la ruta crítica.** Que la lógica viva en JSON en vez de YAML no cambia
nada del argumento de auditabilidad.

### Lectura del reloj por BLE

| Repo | ⭐ | Nota |
|---|---|---|
| arii/hrm | 35 | TypeScript, panel en vivo con Web Bluetooth |
| yossi-eynav/ble-heart-rate-demo | 31 | Mínimo, buen punto de partida |

Pocas estrellas, pero el perfil de ritmo cardíaco de BLE es un estándar: sirven como
referencia de ~50 líneas, no como dependencia.

### HRV y procesamiento de señal — todo esto es Python

| Repo | ⭐ | Nota |
|---|---|---|
| **neuropsychology/NeuroKit2** | 2 430 | El toolbox serio de señales neurofisiológicas (ECG, HRV, EDA) |
| Aura-healthcare/hrv-analysis | 467 | Enfocado sólo en HRV |
| PGomes92/pyhrv | 343 | Toolbox de HRV |

**Esto confirma la recomendación híbrida:** la ciencia de HRV vive en Python. Úsenlo
**en el taller** para generar y validar el dataset. RMSSD en la app son cinco líneas de
TypeScript; no hace falta la librería en producción.

### 📌 Dato empírico sobre el lenguaje

En todas estas búsquedas **no apareció un solo repositorio relevante en Rust.** No es
opinión mía: es dónde está el ecosistema de este problema.

---

## 4. ⚠️ Hay competencia construyendo lo mismo, ahora mismo

Al buscar "space health astronaut monitoring" aparecieron repositorios públicos creados
para este mismo reto. Uno se describe así:

> *"Offline astronaut health monitor: personal-baseline vitals, triage tiers and
> comm-delay…"*

**Offline. Línea base personal. Niveles de triaje. Retraso de comunicación.** Es
nuestro planteamiento, casi palabra por palabra.

### Qué significa y qué no

**No es un desastre.** Significa que el reto empuja a todos hacia la misma conclusión
correcta. Nuestro análisis no estaba equivocado: estaba convergiendo.

**Sí significa que el concepto ya no diferencia.** Lo que va a diferenciar es lo
específico, y ahí tenemos ventaja real:

| Lo que casi nadie va a tener | Dónde está |
|---|---|
| **Modelo de tiempos SCET/ERT** con antigüedad visible | `comportamiento-del-software.md` §5 |
| **Botón de procedencia** sobre cada número | `motor-diagnostico.md` §4 |
| **Panel de "lo que no sé"** | `motor-diagnostico.md` §3 |
| **Priors publicados reales** (Crucian 2016) | `motor-diagnostico.md` §1 |
| **Eventos solares reales** de DONKI | §1 de este documento |
| **Diapositiva de limitaciones honestas** | `roadmap.md` §4 |

🔶 **Conclusión estratégica:** no corran a agregar funciones. **Profundicen las que ya
tienen.** Un equipo con el mismo concepto y sin procedencia de datos pierde contra uno
que puede abrir el archivo de reglas y citar una fuente. Ahí es donde se gana.
