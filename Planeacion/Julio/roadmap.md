# Roadmap de entrega y estrategia de datos

Plan para las últimas ~18 horas, seis personas, y qué nos falta para competir por
**Best Use of Data** y por validez científica.

✅ verificado · ⚠️ verificar · 🔶 decisión nuestra

---

## 1. Qué premian exactamente esos dos premios

✅ Definiciones de las páginas oficiales de premios de Space Apps:

| Premio | Qué premia |
|---|---|
| **Best Use of Science** | Proyectos que hacen un uso **sólido y válido de la ciencia o del método científico** |
| **Best Use of Data** | El proyecto que mejor **hace accesibles los datos espaciales**, o los **aprovecha para una aplicación única** |

⚠️ Los nombres de categorías han cambiado entre años. Verificar la lista de 2026.

### La consecuencia incómoda

**"Best Use of Data" exige datos espaciales reales.** Un generador sintético, por bueno
que sea, no gana ese premio. Puede ganar los otros, pero no ese.

Así que la pregunta operativa es: **¿qué datos reales de la NASA podemos tener corriendo
dentro del producto antes de mañana?**

---

## 2. Inventario de datos — qué tenemos y qué no

| Dato | ¿Esta noche? | Cómo |
|---|---|---|
| Taxonomía de 17 riesgos HRP | ✅ Sí | Ya extraída, `diccionario-de-datos.md` |
| Incidencia real de eventos médicos en vuelo | ✅ Sí | Crucian et al. 2016, abierto en PMC |
| Parámetros del PVT-B | ✅ Sí | Basner 2011, PDF abierto |
| Instrumentación de radiación de CSA | ✅ Sí | Artículo de CSA, ya extraído |
| **Eventos solares reales** | ⚠️ Probable | **API DONKI de NASA** — ver §3 |
| OSDR / GeneLab | ⚠️ Parcial | Abierto por S3, pero ALSDA es **no humano** |
| **Fisiología de astronautas individuales** | ❌ **No** | **LSDA requiere DAR con aprobación** |

### ❌ La mala noticia, y hay que asumirla

Los datos fisiológicos individuales de astronautas **no se pueden descargar esta noche**.
El repositorio humano (LSDA / NASA Life Sciences Portal) opera con un proceso de
**solicitud de acceso a datos (DAR)** que requiere aprobación. El ALSDA que sí está
abierto es, según la propia NASA, el repositorio de datos de ciencias de la vida
**no humanos**.

**Qué hacer con eso — y esto es estrategia, no consuelo:** convertirlo en diapositiva.

> *"Los datos fisiológicos humanos de la NASA requieren un DAR aprobado. No los
> inventamos. Nuestro generador sintético está calibrado contra la incidencia publicada
> de Crucian 2016, y aquí está exactamente la solicitud que presentaríamos para
> sustituirlo por datos reales."*

Un equipo que **sabe por qué no tiene un dato** se ve mejor que uno que finge tenerlo.
Eso es validez científica, literalmente.

---

## 3. ⚠️ La jugada para Best Use of Data: DONKI

NASA publica una base de datos de clima espacial llamada **DONKI**, alojada por el CCMC
en Goddard, con un endpoint de **eventos de partículas solares energéticas (SEP)**:

```bash
curl "https://api.nasa.gov/DONKI/SEP?startDate=2026-01-01&endDate=2026-11-14&api_key=DEMO_KEY"
```

⚠️ **Esto no está verificado contra la documentación oficial de NASA.** Lo encontré en
documentación de terceros: devuelve JSON, acepta rango de fechas en `yyyy-MM-dd`, y
`DEMO_KEY` funciona para pruebas. **Primera tarea de quien tome datos: correr ese curl y
confirmar que responde.** Si responde, es oro; si no, se cae esta jugada y seguimos con
las otras dos.

**Por qué importa tanto:** convierte el módulo de radiación de simulado a **real**. El
escenario del día 115 deja de ser inventado y pasa a ser *un evento solar que de verdad
ocurrió*, con su fecha y su instrumento. Eso es exactamente "aprovechar datos espaciales
para una aplicación única".

### Las tres jugadas de datos reales, por orden de valor

1. **DONKI SEP en vivo** → el módulo de radiación usa eventos solares reales
2. **Crucian 2016 como priors** → el motor diagnóstico razona con incidencia publicada
3. **Taxonomía HRP** → cada regla mapea a un riesgo con nombre oficial de NASA

Las tres son reales y citables. Con eso se compite.

---

## 4. Lo que nos falta y no vamos a conseguir hoy

Decirlo en la presentación, en una diapositiva de "limitaciones":

- **Likelihood ratios validados en microgravedad.** No existen que yo encuentre. Por eso
  los pesos del motor van declarados como supuestos, no como hechos.
- **Validación clínica de los protocolos.** Ninguna.
- **Datos individuales reales** para probar la línea base móvil contra verdad de terreno.
- **Calibración del motor.** Nunca se ha contrastado contra desenlaces reales.

🔶 Una diapositiva de limitaciones honestas **sube** la nota en validez. Es el tipo de
cosa que distingue a alguien que hizo ciencia de alguien que hizo una app bonita.

---

## 5. Roadmap por fases

Horas contadas hacia atrás desde la entrega (T = mañana 11:59). **Anclen T−18 a la hora
real en que empiecen.**

### F1 · Cimientos — T−18 a T−14

Todo en paralelo, sin dependencias entre personas.

| Rol | Tarea | Entregable |
|---|---|---|
| Datos | **Probar el curl de DONKI.** Si responde, parsear SEP | JSON real en disco |
| Sintéticos | Generador con las tablas del día 109–115 | CSV de 180 días con SCET |
| Motor | Esquema de señales, línea base móvil, z robusto | `z()` con pruebas |
| UI | Esqueleto de navegación: hoy · tendencias · emergencia | Pantallas vacías navegables |
| Ciencia | Verificar los ⚠️: radiación, protocolos, IMM | Lista resuelta |
| Demo | Guion escrito y slides en esqueleto | Guion v1 |

**🚩 Gate T−14:** el generador produce datos y el motor calcula z sobre ellos. Si no, se
recorta el modo emergencia completo.

### F2 · Núcleo — T−14 a T−9

| Rol | Tarea |
|---|---|
| Motor | Reglas en YAML, evaluación, semáforo, el cruce de 3 variables |
| UI | Tarjeta de alerta con evidencia, vista de tendencias |
| Datos | Módulo de radiación con dosis acumulada + el SPE real |
| Sintéticos | Afinar el escenario para que el evento se **vea venir** en las gráficas |
| Ciencia | Mapear cada regla a su riesgo HRP, redactar la slide de limitaciones |
| Demo | Grabar un primer ensayo, aunque esté feo |

**🚩 Gate T−9 — el más importante de todos:** *el camino de la demo funciona de extremo
a extremo.* Día 112 dispara ámbar, se ve la evidencia, día 114 cierra en verde.

**Si a T−9 esto no corre, se recorta sin discutir:** primero el modo emergencia, luego
el motor diagnóstico probabilístico, luego la sincronización con Tierra. El arco de
prevención es lo último que se toca.

### F3 · Integración — T−9 a T−6

| Rol | Tarea |
|---|---|
| Todos | Integrar en una sola rama. **Nadie empieza nada nuevo.** |
| Motor | Motor diagnóstico: diferencial ordenado + botón de procedencia |
| UI | Modo emergencia: **una sola clase**, la de radiación |
| Demo | Grabación buena, slides completas |

### F4 · Demo y entrega preliminar — T−6 a T−4

- Video final
- Slides terminadas
- **🚩 ENTREGAR AQUÍ UNA VERSIÓN QUE FUNCIONE.** No a T−0.

### F5 · Congelación — T−4 a T−1

**🚩 FEATURE FREEZE ABSOLUTO a T−4.** Sólo se arreglan cosas rotas.

- Ensayar la presentación en voz alta, tres veces, con cronómetro
- Preparar respuestas de Q&A (§6)
- Dormir por turnos si alcanza

### F6 · Margen — T−1 a T

Nada. Ese es el punto. **El margen es la entrega.**

---

## 6. Q&A — las cinco preguntas que les van a hacer

Que cada quien sepa responder estas. Son las que yo haría:

1. **"¿De dónde sale ese porcentaje?"** → Prior de Crucian 2016, pesos declarados en el
   YAML, y lo abrimos aquí mismo.
2. **"¿Y si se equivoca?"** → Por eso los primeros pasos no dependen del diagnóstico, y
   por eso mostramos la evidencia en contra y lo que no sabemos.
3. **"¿Esto no lo hace ya el IMM de la NASA?"** → El IMM modela riesgo de misión en
   tierra. Esto es personalizado y en vuelo. *(⚠️ verificar antes de decirlo)*
4. **"¿Qué datos reales usaron?"** → Eventos solares de DONKI, incidencia de Crucian
   2016, taxonomía HRP. Y aquí está el DAR que presentaríamos para la fisiología humana.
5. **"¿Por qué no usaron IA?"** → Porque un motor auditable se puede abrir frente a
   ustedes y una caja negra no. Y lo abrimos.

---

## 7. Las tres reglas que deciden si entregan

1. **Gate T−9 o se recorta.** Sin discusión, sin "ya casi".
2. **Freeze a T−4.** Lo que no esté, no va.
3. **Entregar a T−4, no a T−0.** La mayoría de los equipos buenos que no ganan, no
   pierden por el código: pierden por entregar tarde.

---

## Fuentes

- Space Apps, guía de jurado y premios: https://www.spaceappschallenge.org/resources/judging-awards-guide
- Space Apps 2023, definiciones de categorías: https://www.spaceappschallenge.org/2023/awards
- Crucian et al. 2016, incidencia de síntomas en vuelo: https://pmc.ncbi.nlm.nih.gov/articles/PMC5098747
- NASA OSDR, repositorio de ciencia abierta: https://science.nasa.gov/biological-physical/data/osdr
- OSDR en Registry of Open Data on AWS: https://registry.opendata.aws/nasa-osdr/
- NASA Open APIs: https://api.nasa.gov/
- CCMC / NASA Goddard, DONKI: https://ccmc.gsfc.nasa.gov/tools/DONKI
