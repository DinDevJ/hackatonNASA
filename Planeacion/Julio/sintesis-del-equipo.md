# Síntesis de las cinco propuestas del equipo

Análisis de lo que hay en `Planeacion/` al 14 nov 2026. Qué converge, qué choca, y qué
hay que decidir hoy.

✅ verificado · ⚠️ verificar · 🔶 opinión mía

---

## 1. Qué aportó cada quien, y qué tiene que nadie más tiene

| Quién | Propuesta | **Lo único que sólo esta persona trae** |
|---|---|---|
| **Katy** | **LAZO** — sistema visual, cuidado mutuo, salud femenina | **La tabla de alineación con la página oficial del reto.** Leyó las pestañas Details y Resources y mapeó punto por punto lo que NASA pide. Es Relevance directo |
| **Leo** | App de los 17 riesgos, ~8 min activos al día | **Los tres tipos de estimación de riesgo** (§4 de su resumen). Y avisos de integración que nadie tenía |
| **Fani** | Sistema modular de 6 módulos, Edge AI, voz | **DTN / Bundle Protocol**, el estándar real de espacio profundo para almacenar y reenviar. Y dice que su **Módulo 1 ya está creado** |
| **Diana** | **VISOR** — salud visual y SANS, a fondo | **La URL oficial del reto** y fuentes primarias de SANS (Human Research Roadmap, brief OCHMO) |
| **Julio** | Motor de reglas, línea base, SCET/ERT, emergencia | Modelo de tiempos, procedencia de cada número, priors de Crucian, 51 eventos reales de DONKI |

**Falta Iker.** Nadie tiene carpeta suya.

---

## 2. ✅ La convergencia: cinco personas, por separado, al mismo núcleo

Esto es el hallazgo más importante del análisis. Sin coordinarnos, **los cinco llegamos
a lo mismo**:

| Idea | Katy | Leo | Fani | Diana | Julio |
|---|:--:|:--:|:--:|:--:|:--:|
| Funciona sin conexión / autonomía | ✔ | ✔ | ✔ | ✔ | ✔ |
| Línea base **individual**, no umbrales de la Tierra | ✔ | ✔ | ✔ | ✔ | ✔ |
| Semáforo verde / amarillo / rojo | ✔ | ✔ | ✔ | ✔ | ✔ |
| **No diagnostica**, no sustituye al médico | ✔ | ✔ | ✔ | ✔ | ✔ |
| Sincronización diferida con Tierra | ✔ | ✔ | ✔ | ✔ | ✔ |
| Alertas que exigen varias señales a la vez | ✔ | ✔ | ✔ | — | ✔ |

🔶 **Ese núcleo no se discute más. Ya está decidido por consenso involuntario, y es el
producto.** La junta debería dedicarse sólo a lo de abajo.

---

## 3. Los choques que hay que resolver hoy

### 🔴 1. El alcance. Es el problema grave.

Katy propone **13 módulos** en tres prioridades. Leo propone **6**. Fani propone **6**.
Diana propone **1**, muy profundo.

**No se pueden hacer seis módulos en quince horas.** Y el riesgo no es entregar poco:
es entregar seis cosas a medias, que es peor que una completa.

🔶 Mi lectura: **Katy ya resolvió esto y nadie lo notó.** Su esquema P0 / P1 / P2 es
exactamente la herramienta que falta. Sus tres P0 son:

- Panel de salud con semáforo y "Cuerpo LAZO"
- Emergencias: "¿Qué hago?" + buddy system
- Agenda de mediciones y recordatorios

**Propongo adoptar su P0 tal cual, y declarar P1 y P2 como "visión futura" en la
presentación.** Eso convierte una debilidad (no alcanzó el tiempo) en una fortaleza
(hoja de ruta pensada).

### 🔴 2. Edge AI vs. motor de reglas. Sigue sin decidir.

Fani propone Edge AI con asistente de voz y modelos bayesianos. Yo argumenté motor
determinista y auditable.

🔶 **Ya no creo que sea una disyuntiva.** Fani escribió algo que la cierra:

> *"las recomendaciones y los umbrales de alerta deberán basarse en criterios médicos y
> operativos validados... El sistema no debe inventar parámetros médicos"*

Eso **es** el motor de reglas. El asistente de voz puede ser la capa de presentación
encima, con texto de plantilla. Las dos propuestas dicen lo mismo con palabras
distintas. **Y así nadie pierde la discusión.**

### 🟡 3. El nombre

**LAZO** (Katy) · **VISOR** (Diana) · sin nombre (el resto). 🔶 LAZO: describe el
producto completo y tiene el buddy system en el nombre. VISOR sólo describe el módulo
de visión.

### 🟡 4. El retraso de comunicación: tres cifras distintas en el repo

| Documento | Cifra |
|---|---|
| Fani, Leo | 20 min |
| Katy | ~22 min |
| Julio | 4 a 24 min |

✅ **La correcta es 4 a 24 minutos por trayecto**, de NASA Goddard. Es un rango, no un
número fijo, porque depende de la posición orbital. **Hay que unificarlo en los cinco
documentos antes de la presentación** — si un juez ve tres cifras distintas, se nota.

### 🟡 5. Glucosa

✅ El reto la pide **explícitamente**. ⚠️ Ningún reloj de consumo la mide de forma no
invasiva y confiable. **Hay que capturarla manual y decir por qué.**

---

## 4. ✅ Hallazgo de Katy que cambia la estrategia de datos

Katy citó datos abiertos de **Inspiration4** en OSDR. **Lo verifiqué y es correcto.**

### 🚩 Esto corrige algo que yo afirmé de más

En `roadmap.md` escribí que los datos fisiológicos humanos requieren un DAR aprobado.
**Eso era demasiado amplio.** Hay datos biomédicos **humanos** de vuelo espacial
**abiertos y descargables hoy**:

| Estudio | Contenido |
|---|---|
| **OSD-569** | Sangre completa: RNA-seq, WGS y **hemograma (CBC)**. Descarga masiva por el registro abierto de AWS |
| **OSD-575** | Panel metabólico de suero y **arreglos de citoquinas** |
| **OSD-574** | Piel del deltoides y microbioma; cita el atlas SOMA |
| **OSD-630** | Metagenoma de heces; licencia pública en data.gov |

Guía de acceso: paper en *npj Microgravity*, DOI `10.1038/s41526-024-00393-5`. Acceso
programático por **GLOpenAPI**.

### ⚠️ El matiz que hay que respetar

Son datos **moleculares y de laboratorio clínico**, no series de tiempo de wearables.
**No dan frecuencia cardíaca ni sueño minuto a minuto.** Así que:

- ✅ Sirven de verdad para el **módulo inmune** — que es el riesgo nº 1 de la lista de
  NASA — con hemograma y citoquinas de humanos que de verdad volaron
- ❌ No sustituyen el generador sintético para HR, HRV y sueño

🔶 **Estrategia de datos corregida, por valor:**

1. **Inspiration4 (OSDR)** → datos humanos reales de vuelo para el módulo inmune
2. **DONKI** → 51 eventos solares reales, ya descargados
3. **Crucian 2016** → priors reales de incidencia para el motor
4. **Sintético** → sólo para la serie de wearables, declarado como tal

**Con tres fuentes reales de NASA, Best Use of Data deja de ser aspiracional.**

---

## 5. ⚠️ Sobre la nota de Diana: el requisito de la pestaña Resources

Diana anotó que usar un recurso de la pestaña Resources es *"requisito importante para
optar a los Global Awards"*.

**No pude confirmarlo.** No encontré ninguna fuente oficial que exija usar datos de
NASA para ser elegible. Lo que sí aparece como requisito mínimo: responder a un reto
oficial y aceptar los términos.

### 🚩 Pero encontré algo que sí es crítico y nadie mencionó

Hay que **marcar la casilla "I want my project to be considered for Global Judging"** en
la página de envío. **Si no se marca, no hay Global Awards, por bueno que sea el
proyecto.**

⚠️ Verificar en la guía de envío de 2026. **Que alguien se haga responsable de esa
casilla.**

---

## 6. 🔴 Mi propio hueco, y es de Relevance

Katy leyó la página oficial del reto. Yo no pude abrirla. Y el reto pide cosas
explícitas que **mi diseño no tiene**:

| Lo que pide el reto | ¿Está en mi diseño? |
|---|---|
| **Figura humana clicable** por parte del cuerpo | ❌ No |
| **Gamificación** | ❌ No |
| **Glucosa** entre los indicadores | ❌ No |
| **Entrada por cámara** (código de barras, foto, ultrasonido) | ❌ No |
| Recordatorios dentro de la rutina de misión | ❌ No |
| Perfiles por entorno (nave, rover, base lunar) | ❌ No |

🔶 **Mis documentos son profundos en motor y tiempos, pero flojos en Relevance.** Los de
Katy son lo contrario: cubren lo que pide el reto punto por punto, con menos profundidad
técnica. **Ninguno de los dos gana solo. Juntos sí.**

---

## 7. 🔶 Lo que yo llevaría a la junta

**Un solo proyecto: LAZO**, con el P0 de Katy como alcance, el motor y el modelo de
tiempos míos por debajo, los tres tipos de riesgo de Leo en la presentación, el DTN de
Fani como nombre oficial de la sincronización, y el módulo de visión de Diana como P1
documentado.

| Pieza | De quién | Por qué |
|---|---|---|
| Nombre, UX, alineación con el reto | Katy | Es lo que da Relevance |
| Alcance P0 / P1 / P2 | Katy | Es la única herramienta de recorte que existe en el repo |
| Figura humana clicable | Katy + Fani | **El reto la pide explícitamente** |
| Motor de reglas, línea base, z robusto | Julio | Es el núcleo técnico |
| Modelo SCET/ERT y procedencia de números | Julio | Casi ningún equipo lo tendrá |
| Tres tipos de estimación de riesgo | Leo | Resuelve dónde hay modelo y dónde no |
| DTN / Bundle Protocol | Fani | Convierte nuestra cola casera en el estándar real |
| Datos de Inspiration4 (inmune) | Katy, verificado por Julio | Datos **humanos** reales de vuelo |
| Módulo de visión / SANS | Diana | P1, documentado como visión |

### Las tres preguntas que la junta debe responder, y nada más

1. **¿Se adopta el P0 de Katy como el alcance total de mañana?** (mi voto: sí)
2. **¿Quién se encarga de la casilla de Global Judging y de la entrega a T−4?**
3. **¿Qué existe realmente del "Módulo 1 ya creado" de Fani?** Si hay código
   funcionando, cambia el roadmap entero. **Averiguarlo es lo primero.**

---

## Fuentes de esta síntesis

- Inspiration4 en OSDR, guía de acceso: https://www.nature.com/articles/s41526-024-00393-5
- OSD-569, sangre completa: https://osdr.nasa.gov/bio/repo/data/studies/OSD-569
- OSD-574, piel y microbioma: https://osdr.nasa.gov/bio/repo/data/studies/OSD-574
- OSD-630 en data.gov: https://catalog.data.gov/dataset/spacex-inspiration4-stool-metagenome-profiling
- Space Apps, guía de envío: https://www.spaceappschallenge.org/resources/project-submission-guide/
- Space Apps, guía de jurado y premios: https://www.spaceappschallenge.org/resources/judging-awards-guide
- NASA, retraso de comunicación 4 a 24 min: https://www.nasa.gov/centers-and-facilities/goddard/space-communications-7-things-you-need-to-know/
