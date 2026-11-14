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

---

# Apéndice · Lo que llegó después (Iker, y el repo completo)

Añadido tras el `pull` del 14 nov. Cambia bastante.

## A1. 🔥 Iker hizo el trabajo más valioso del repositorio

Cuatro catálogos, **364 variables**, **275 referencias**, con unidad, equipo, cambio en
vuelo y URL por variable. Y una convención que le faltaba a todo el proyecto:

> **[A]** = umbral de NASA o validado en astronautas · **[T]** = umbral clínico terrestre

### Resuelve casi todos mis `⚠️` abiertos

| Lo que yo dejé en duda | Lo que encontró Iker |
|---|---|
| Límite de radiación "en disputa" | ✅ **< 600 mSv de carrera**, todas las edades y sexos. **< 250 mSv por evento solar.** Internacional: ESA/CSA/Roscosmos 1 Sv, JAXA 0,5–1 Sv |
| Priors para el motor diagnóstico | 🔥 **Tabla E.2-1 del Vol. 1 Rev C: 48 condiciones CON probabilidad** del IMM. Mejor que Crucian 2016 |
| "El contenido clínico no se inventa" | 🔥 **JSC-48031 Rev K: 110 instrucciones "Contact Surgeon"** públicas y citables |
| Instrumento de ánimo sin verificar | ✅ **PHQ-9 y GAD-7, de uso libre**, cortes 5/10/15 |
| Si el IMM es de tierra o de vuelo | ✅ Es de planificación: "eventos por **misión de referencia**" |

**Ya actualicé `motor-diagnostico.md` y `diccionario-de-datos.md` con sus fuentes.**

### Y añade tres restricciones que nadie había considerado

1. **Casi ningún análisis de sangre u orina existe en tiempo real.** En la ISS las
   muestras se congelan y se analizan al regreso. **NASA declara que ningún sistema mide
   densidad ósea en vuelo.** Varios módulos propuestos por el equipo son imposibles a
   bordo, y hay que decirlo en lugar de dibujarlos.
2. **No existe tabla pública de NASA del tipo "signo vital X > Y → llama al cirujano".**
   Los estándares remiten a "valores clínicamente aceptados" y a documentos de programa
   no públicos. **Casi todos nuestros umbrales de signos vitales son [T], no [A].**
3. 🔴 **El techo epistémico:** *"casi todos los estudios en vuelo tienen entre 3 y 14
   sujetos. Sirven para justificar qué medir, no para predecir en un individuo."*

   Eso **cierra** la discusión del porcentaje: ningún modelo nuestro va a estar
   calibrado. El número se muestra con su procedencia, o no se muestra.

### Su sección de fiabilidad es ejemplar

Marca escalas no verificadas, que PubMed bloqueó el acceso directo y varios artículos se
leyeron solo por resumen, seis referencias cuyo primer autor puso de memoria, tres tablas
de PDF que quedaron ambiguas, y sus propios umbrales de SpO2 como propuestas no
oficiales. 🔶 **Ese nivel de autocrítica es exactamente lo que el jurado premia en
validez. Que no se pierda al pasar a las diapositivas.**

## A2. Estado del resto del repo

- **Katy** renombró de LAZO a **EVA — Evaluación Vital Autónoma**, y montó
  `decisiones-equipo.html`: una app de votación con **14 decisiones**. Mis
  recomendaciones aparecen como opción recomendada en 12 de ellas (PWA + React,
  emergencia solar, entrega a T−4, gate T−9, evento DONKI cercano a la mediana).
  **Al momento de leerlo: 0 votos de 6 personas.**
- **Alguien corrió `fetch_donki.py` con llave propia** y bajó **119 eventos SEP de todo
  2024** (antes teníamos 51). El script funciona en manos de otros.
- Contexto de demo ya fijado: tránsito a Marte, días 112–115, con Tomás (comandante),
  Ana (protagonista), Mei (CMO) y Luis (ingeniero).

## A3. 🔴 Cuatro problemas que hay que arreglar ya

1. **Dos nombres de equipo en el repo.** Iker escribe "Equipo **Monarcas**"; Katy, "Equipo
   **EVA**". Hay que elegir uno hoy — aparece en el envío y en el video.
2. **La asignación cubre 5 personas, y son 6.** Dice "Persona 5 (nombre pendiente)" y no
   nombra a Katy ni a Diana. **Alguien no tiene variables asignadas.**
3. 🔴 **388 variables es inventario de investigación, NO alcance de construcción.** Si
   alguien intenta implementarlas, no entregamos nada. El alcance de mañana siguen siendo
   los tres P0 de Katy. **Los catálogos son la credibilidad científica y el respaldo del
   Q&A, no la lista de tareas.**
4. **Las 14 decisiones siguen sin votos.** Es el bloqueo real ahora mismo: no es falta de
   investigación, es falta de decisión.

## A4. Mi asignación

**77 variables** — cardiovascular, signos vitales, ambiente y carga laboral:
`01:V1–V8` · `01:V9–V18` · `01:V19–V30` · `01:V46–V53` · `03:V21–V29` · `03:V53–V60` ·
`04:A1–A9` · `04:A23–A35`.

Iker marca como mayor dificultad las imágenes de ultrasonido vascular y las mediciones
hemodinámicas de astronautas. 🔶 Coincido, y no creo que se consigan hoy: están en el
mismo hueco de datos humanos que ya documentamos. Lo accesible de mi bloque es signos
vitales, CO2 de cabina y carga laboral.
