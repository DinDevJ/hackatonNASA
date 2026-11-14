# Stack, dependencias y estado de DONKI

Decisión de lenguaje, qué reutilizar en vez de escribir, y qué pasó al probar la API.

✅ verificado · ⚠️ verificar · 🔶 decisión nuestra

---

## 1. ✅ DONKI: verificado, con datos reales ya descargados

Probado en vivo desde esta sesión. **Funciona.** Y los datos ya están en el repo.

```bash
curl "https://api.nasa.gov/DONKI/SEP?startDate=2024-04-15&endDate=2024-06-13&api_key=DEMO_KEY"
```

### Lo que aprendimos probándola, que ninguna documentación decía

| Hallazgo | Detalle |
|---|---|
| ✅ Funciona | HTTP 200, devuelve un arreglo JSON |
| ⚠️ **Máximo 60 días por consulta** | `API Error: Date range cannot exceed 60 days` |
| ⚠️ `DEMO_KEY` se agota | **5 de 8 intentos fallaron con 429 en 6 minutos.** La cuota es por IP y compartida |
| ✅ Los SEP son raros | **0 eventos** en los últimos 60 días; hay que ir a 2024 |

### 🚩 Acción inmediata

**Saquen su propia API key en https://api.nasa.gov** — gratis e instantánea. Y partan
las consultas en ventanas de ≤60 días.

### ✅ Datos reales ya guardados en el repo

    Planeacion/Julio/datos/donki-sep-2024-04-15_2024-06-13.json   27 eventos
    Planeacion/Julio/datos/donki-sep-2024-09-15_2024-11-13.json   24 eventos

**51 eventos solares reales.** No hay que volver a llamar a la API para la demo.

### Esquema real de un evento

```json
{
  "sepID": "2024-05-09T13:59:00-SEP-001",
  "eventTime": "2024-05-09T13:59Z",
  "instruments": [{"displayName": "MODEL: REleASE:ACE/EPAM 15.8-39.8 MeV"}],
  "link": "https://ccmc.gsfc.nasa.gov/DONKI/view/SEP/30609/-1",
  "linkedEvents": [{"activityID": "2024-05-09T08:45:00-FLR-001"}],
  "sentNotifications": [{"messageID": "20240509-AL-004",
                         "messageIssueTime": "2024-05-09T14:00Z",
                         "messageURL": "..."}],
  "submissionTime": "2024-05-09T13:54Z",
  "versionId": 1
}
```

### ✅ Estadísticas que calculamos sobre esos 51 eventos reales

Esto es **análisis propio sobre datos espaciales reales** — exactamente lo que premia
*Best Use of Data*:

| Métrica | Valor |
|---|---|
| Eventos SEP | **51** |
| Con alerta emitida por NASA | **41** |
| **Latencia evento → alerta** | **mediana 17 min** (rango −26 a 656) |
| Ligados a una fulguración solar | **43 de 51** |

Instrumentos reales que aparecen: `GOES-P: SEISS >10 MeV`, `SOHO: COSTEP`,
`STEREO A: IMPACT 13-100 MeV`, `ACE/EPAM`.

⚠️ **Honestidad sobre la mediana:** la distribución es muy ancha y **hay latencias
negativas** (hasta −26 min), porque algunas alertas se emiten antes del inicio modelado
del evento: son predictivas, no reactivas. **No digan "NASA siempre tarda 17 minutos".**
Digan: *"la mediana fue de 17 minutos, con casos predictivos y casos de horas."*

### ¿Para qué sirve DONKI, y para qué NO?

DONKI es la base de datos de **eventos de clima espacial** de la NASA, alojada por el
CCMC en Goddard. No mide a un astronauta: **cataloga lo que hizo el Sol**, con su hora,
los instrumentos que lo detectaron, los eventos ligados entre sí, y las alertas que la
NASA emitió.

#### ⚠️ Lo que NO da, y es importante no prometerlo

**DONKI no entrega dosis de radiación en mSv.** No sabe cuánta radiación recibió nadie.
Entrega **eventos y avisos**, no lecturas de dosímetro.

Es decir: los **mSv acumulados de nuestra interfaz siguen siendo simulados**, y hay que
decirlo. Lo que deja de ser simulado es **cuándo ocurrió el evento, qué instrumento lo
vio, y cuánto tardó el aviso.**

#### Lo que sí nos da, y es mucho

| Uso | Cómo lo aprovechamos |
|---|---|
| **Línea de tiempo real** | El SPE del día 115 deja de ser inventado: es un evento con fecha, hora e instrumento |
| **Latencia de aviso medida** | Mediana de 17 min entre evento y alerta. Es *nuestro* argumento, con *sus* datos |
| **Cadena causal** | 43 de 51 eventos están ligados a una fulguración → justifica una lógica de precursor |
| **Credibilidad instrumental** | Nombres reales en pantalla: `GOES-P: SEISS >10 MeV`, `SOHO: COSTEP` |

#### Endpoints

✅ Verificados respondiendo: **`/DONKI/SEP`** (partículas solares energéticas) y
**`/DONKI/RBE`** (realce del cinturón de radiación). Mismo esquema de campos.

⚠️ Probé también FLR, CME, GST, IPS, HSS y notifications, pero **todos devolvieron 429
por cuota, no una respuesta**. Un 429 lo emite la puerta de enlace *antes* de llegar al
endpoint, así que **eso no confirma que existan**. Son nombres plausibles sin verificar:
compruébenlos con la llave propia.

### 🎯 El argumento que sale de estos datos

> NASA tardó una **mediana de 17 minutos** en emitir la alerta tras el evento.
> Súmale **4 a 24 minutos** de viaje hasta Marte.
> Para cuando el aviso llega, el astronauta ya recibió la dosis.
> **Por eso la decisión tiene que ser local.**

Ese párrafo está construido con datos reales de NASA, medidos por ustedes. No es
retórica: es el resultado de un análisis.

🔶 **Regla de demo:** la demo **nunca** llama a la red en vivo. Lee el JSON del repo.
Una demo que depende del wifi del venue es una demo que falla — y además leer de disco
es coherente con el discurso offline-first.

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
