# Variables para orientar un diagnóstico: índice priorizado

Equipo Monarcas. Preparado el 2026-11-14. Este índice resume los cuatro catálogos de la carpeta; el detalle de cada variable (unidad, equipo, cambio en vuelo, URL de la fuente) está en su archivo.

| Archivo | Problemas que cubre | Variables | Fuentes |
|---|---|---|---|
| [01-cardiovascular-sans-radiacion.md](01-cardiovascular-sans-radiacion.md) | Desacondicionamiento cardiovascular, arritmias, ortostatismo, trombosis yugular, SANS, radiación, anemia espacial | 118 | 73 |
| [02-hueso-musculo-rinon-nutricion.md](02-hueso-musculo-rinon-nutricion.md) | Hueso, cálculos renales e hidratación, músculo y capacidad aeróbica, columna, sensoriomotor, nutrición, glucosa, lesiones | 99 | 54 |
| [03-conducta-sueno-cognicion.md](03-conducta-sueno-cognicion.md) | Salud conductual, sueño y ritmo circadiano, cognición, cefalea, medicación | 88 | 67 |
| [04-inmune-ambiente-equipo-umbrales.md](04-inmune-ambiente-equipo-umbrales.md) | Inmune e infecciones, ambiente de cabina, problemas agudos, inventario de equipo a bordo, umbrales oficiales NASA | 59 | 47 |

Convención de los catálogos: **[A]** = umbral de NASA o validado en astronautas; **[T]** = umbral clínico terrestre.

## 1. Lo que condiciona el diseño

- **Casi ningún análisis de sangre u orina está disponible en tiempo real.** En la ISS las muestras se congelan y se analizan al regreso, y NASA declara que ningún sistema mide densidad ósea en vuelo (detalle en el archivo 02). La app debe apoyarse en autoinforme, signos vitales, wearables, ultrasonido, fotos, equipo de ejercicio y datos de la nave.
- **No existe una tabla pública de NASA del tipo "signo vital X > Y → llamar al cirujano".** NASA-STD-3001 remite a "valores clínicamente aceptados" y a documentos de programa no abiertos (archivo 04, sección C). Los umbrales de signos vitales de la app serán clínicos terrestres y hay que rotularlos así.
- **Sí existen umbrales oficiales NASA** de radiación, ambiente de cabina y aptitud física (sección 3), y criterios procedimentales públicos de "Contact Surgeon" en el Medical Checklist del Shuttle (JSC-48031 Rev K, 2006): por ejemplo diarrea con fiebre, falta de mejoría en 24 h u ojo rojo con visión borrosa, dolor o pus (archivo 04, sección C).
- **Casi todos los estudios en vuelo tienen entre 3 y 14 sujetos.** Sirven para justificar qué medir, no para predecir en un individuo.

## 2. Variables de mayor valor, por modo de captura

### 2.1 Entrada manual o cuestionario

| Variable | Problema que señala | Umbral o referencia | Tipo | Archivo |
|---|---|---|---|---|
| Presión arterial y frecuencia cardiaca; prueba de bipedestación | Intolerancia ortostática, desacondicionamiento | Caída ≥ 20/10 mmHg; sistólica < 70 mmHg como criterio de presíncope | [T] / [A] | 01 |
| Temperatura corporal frente a la línea base propia | Infección, desregulación inmune | La central sube ~1 °C en vuelo largo (n=11) | — | 04 |
| Glucosa en ayunas (mg/dL) | Metabolismo de la glucosa | < 100, 100–125, ≥ 126 (ADA) | [T] | 02 |
| Masa corporal | Nutrición inadecuada, deshidratación | Alerta si baja más de 3,3 % de la basal | [A] | 02 |
| Ingesta de líquidos | Cálculos renales, deshidratación | Al menos 32 mL/kg al día | [A] | 02 |
| Volumen de orina de 24 h | Cálculos renales | Riesgo por debajo de 1,5 L/d; objetivo 2,5–3 L/d | [T] | 02 |
| Ingesta de energía y de sodio | Nutrición, hueso | 100 % del requerimiento; sodio 1500–2300 mg/d | [A] | 02, 04 |
| Carga en el equipo de fuerza | Hueso y músculo | Fuerza ≥ 80 % de la basal | [A] | 02 |
| Dolor de espalda (intensidad, zona) | Columna, disco | Incidencia 52 %; sin corte numérico | — | 02 |
| Síntomas de mareo espacial y medicación | Sensoriomotor | Afecta al 60–80 % los primeros 2–3 días | — | 02 |
| Cefalea autoinformada junto con ppCO2 | Exposición a CO2 | Cada +1 mmHg duplica la probabilidad de cefalea (n=49) | [A] | 04 |
| Síntomas de trombosis y fluidos (hinchazón de cuello, edema facial, cefalea) más perfil de riesgo | Trombosis yugular | Sin corte numérico | — | 01 |
| Síntomas prodrómicos de radiación y hora del primer vómito | Síndrome agudo por radiación | < 2 h sugiere ≥ 5 Gy | [T] | 01 |
| Lista de síntomas de descompresión tras EVA | Enfermedad por descompresión | Tipo I y II | — | 04 |
| Agudeza visual cercana, rejilla de Amsler, cambio de graduación | SANS | ≥ +0,75 D en 6 meses | [A] | 01 |
| Presión intraocular (tonómetro) | SANS | Normal 10–20 mmHg | [T] | 01 |
| PHQ-9 y GAD-7 (uso libre) | Depresión, ansiedad | Cortes 5/10/15; ≥ 10 como alerta | [T] | 03 |
| Estrés, fatiga mental y carga en escala visual 0–100 | Fatiga, sobrecarga | Sin corte; están entre los mejores predictores del PVT en la ISS | — | 03 |
| Karolinska Sleepiness Scale (1–9) | Somnolencia | > 6 se asocia a deterioro | [T] | 03 |
| Episodio de cefalea: intensidad 0–10 y síntomas | Cefalea espacial, CO2 | 91,7 % tuvo al menos un episodio en vuelos largos (n=24) | — | 03 |
| Uso de hipnóticos por noche (fármaco, dosis) | Pérdida de sueño | ISS: 11 % de los registros; Shuttle: 52 % de las noches | — | 03 |
| Horas de trabajo por día y por semana | Sobrecarga | Nominal 6,5 h/día; crítico > 60 h/semana | [A] | 03 |
| Cohesión y conflicto de equipo (diario) | Trabajo en equipo | Sin corte numérico | — | 03 |
| Cafeína | Sueño, fatiga | 400 mg/día (FDA) | [T] | 03 |

### 2.1b Prueba en pantalla

| Variable | Problema que señala | Umbral o referencia | Tipo | Archivo |
|---|---|---|---|---|
| PVT-B: velocidad de respuesta y lapsos ≥ 355 ms | Fatiga, deterioro cognitivo | Comparar con la línea base propia; más lento con ≤ 6 h de sueño | [A] | 03 |
| DSST y Fractal 2-Back | Deterioro cognitivo | Más del 13 % de puntuaciones bajas en vuelo; z ≤ −1,5 frente a la línea base | [A] | 03 |

### 2.2 Wearable

| Variable | Problema que señala | Umbral o referencia | Tipo | Archivo |
|---|---|---|---|---|
| QTc en ECG de reloj | Arritmias | 450/460 ms; ≥ 500 ms de riesgo. En astronautas > 440 ms desde el primer mes | [T] / [A] | 01 |
| FC en ejercicio submáximo | Pérdida de capacidad aeróbica | Capacidad aeróbica ≥ 80 % de la previa | [A] | 02 |
| SpO2 | Hipoxia | ≤ 92 % contactar, ≤ 88 % urgente (propuesta no oficial) | [T] | 04 |
| Frecuencia respiratoria | Infección, hipoxia | Rango clínico terrestre | [T] | 04 |
| Glucosa continua | Metabolismo de la glucosa | Solo resultados preliminares en vuelo | — | 02 |
| Horas de sueño por noche y % de noches < 6 h | Pérdida de sueño | ISS: 6,09 h de media y 43,8 % de noches < 6 h (n=21) | — | 03 |
| Horario de sueño y luz ambiental (lux) | Desalineación circadiana | ISS: 19 % de episodios desalineados, 5,4 h frente a 6,4 h | — | 03 |

La SpO2 de reloj sobreestima en hipoxemia (ver `RESUMEN-MAESTRO.md`, §1.1), así que no debe usarse como única alerta.

### 2.3 Cámara o imagen

| Variable | Problema que señala | Umbral o referencia | Tipo | Archivo |
|---|---|---|---|---|
| Grado de flujo de la yugular interna izquierda (1–4, Doppler) | Trombosis | Grado 3 (estancado) = indicador pretrombótico | [A] | 01 |
| Cambio del grosor retiniano peripapilar (OCT) | SANS | > 19,4 µm primer signo de edema de disco; ≥ 55 µm indica punción lumbar tras el vuelo | [A] | 01 |
| Ultrasonido muscular y renal | Atrofia, cálculos | Detecta cálculos menores de 3 mm | — | 02 |
| Foto de erupción cutánea | Hipersensibilidad, reactivación viral | Evento más frecuente: 1,1 por año-vuelo | — | 04 |
| Foto de ojo (cuerpo extraño, abrasión, ojo rojo) | Lesión ocular | Contactar si hay visión borrosa, dolor o pus | [A] | 04 |
| Foto de garganta | Infección respiratoria | Sin corte numérico | — | 04 |
| Tira de orina de 10 parámetros | Infección urinaria, hidratación, glucosa | Densidad ≥ 1,020 | [T] | 02, 04 |
| Color de orina | Hidratación | Sin punto de corte encontrado | — | 02 |

### 2.4 Dato de la nave

| Variable | Problema que señala | Umbral oficial NASA | Archivo |
|---|---|---|---|
| Dosis efectiva acumulada | Radiación | < 600 mSv de carrera; < 250 mSv por evento solar | 01, 04 |
| Tasa de dosis | Radiación | < 1,3 mSv/día en espacio libre; < 0,9 en superficie | 01, 04 |
| ppCO2 de cabina | Cefalea, cognición | ≤ 3 mmHg promedio de 1 h; < 2,5 mmHg en 7 días para riesgo de cefalea < 1 % | 03, 04 |
| O2 inspirado | Hipoxia | Objetivo 145–155 mmHg; mínimo 127 | 04 |
| Ruido | Pérdida auditiva, sueño | 75 dBA/8 h en órbita; NC-40 para dormir | 04 |
| Temperatura y humedad de cabina | Confort térmico | Entre 18 °C/75 % y 27 °C/25 % | 04 |
| Polvo | Respiratorio | Lunar < 0,3 mg/m³; marciano < 0,1 mg/m³ | 04 |

## 3. Umbrales oficiales NASA que sirven de base al semáforo

Todos de NASA-STD-3001 (detalle y sección exacta en el archivo 04, sección C).

- **Radiación por órgano** (30 días / 1 año / carrera, mGy-Eq): cristalino 1000/2000/4000; piel 1500/3000/6000; hematopoyético 250/500; circulatorio 250/500/1000; SNC 500/1000/1500 mGy.
- **Aptitud física:** VO2máx ≥ 32,9 mL/kg/min para EVA en microgravedad y ≥ 36,5 en superficie; capacidad aeróbica y fuerza ≥ 80 % de la línea base.
- **Hueso:** densidad ≥ 95 % de la basal en cadera y columna, ≥ 90 % en cuello femoral (solo medible en tierra).
- **Nutrición:** 100 % del requerimiento, 3035 kcal/día de promedio.
- **Listas de condiciones médicas:** Tabla E.2-1 (48 condiciones con probabilidad) y E.2-2 (~120 condiciones) del Vol. 1 Rev C.

## 4. Huecos que siguen como "no encontrado"

- Umbrales numéricos de signos vitales para escalar al cirujano de vuelo.
- Umbral validado en astronautas para presión arterial, frecuencia cardiaca, glucosa, linfocitos, hemoglobina, marcadores óseos, pruebas de equilibrio y dolor.
- Troponina, péptidos natriuréticos y dímero D en vuelo: sin valores ni equipo confirmado.
- Cartuchos actuales del analizador de sangre de la ISS y qué glucómetro hay a bordo.
- Umbral numérico de la alarma de tasa de dosis en Orion o en la ISS.
- Punto de corte validado en astronautas para cualquier escala clínica (PHQ-9, GAD-7, KSS, etc.), y uso operativo de esas escalas en la ISS. En la práctica se compara con la línea base propia.
- Método práctico para medir la fase circadiana en vuelo: NASA reconoce que no lo hay.
- Valores de referencia de cortisol salival y corte de HRV como marcador de estrés.
- Licencias de la batería Cognition, WinSCAT y los cuestionarios de equipo.

## 5. Avisos de fiabilidad antes de citar

- **Escalas no verificadas:** en el archivo 03, las bandas del BDI-II, las normas de PANAS, la licencia de POMS, los umbrales de sueño de la National Sleep Foundation y el umbral de melatonina salival vienen solo de resúmenes de buscador y están marcados "no verificado".
- **Lectura indirecta:** PubMed y PMC bloquearon el acceso directo. Muchos artículos se leyeron solo como resumen por la API de PubMed o de Europe PMC; cada fuente lo anota.
- **Autores sin verificar:** en el archivo 01, los primeros autores de las fuentes 32, 36, 45, 63, 70 y 71 se pusieron de memoria. Las URL son correctas; el nombre hay que comprobarlo.
- **Datos solo de buscador:** cada archivo señala los pocos datos que salen del resultado de búsqueda y no de la página abierta.
- **Tablas desalineadas:** en el archivo 04, tres tablas extraídas de PDF quedaron ambiguas y están marcadas.
- **Versiones de la norma:** NASA-STD-3001 Vol. 2 ya va en la Rev F (2026-07-14); varios documentos citan revisiones anteriores con los mismos límites.
- **Propuestas propias:** los umbrales de SpO2 del archivo 04 son clínicos terrestres propuestos, no oficiales.
