# Modelo predictivo de malestares espaciales — ¿hay pesos ya investigados?

Pregunta del equipo: ¿existe un peso ya investigado entre nuestras variables y los malestares espaciales,
o es una relación nueva? Y cómo construir un modelo con **estadística adaptativa** que asigne pesos, descarte
variables, distinga **lo normal para toda la tripulación** de **quién se sale de su normal**, entrenado con
datos de la Tierra y transferible a otros entornos (Marte, submarinos, la Antártida).

✅ fuente verificada (DOI resuelve en doi.org y el título coincide en Crossref, 14-11-2026) · ⚠️ no verificado · 🔶 propuesta nuestra

---

## 1. Respuesta corta

**No existe una matriz publicada de pesos "variable → malestar espacial" para tripulaciones.** Lo que el
equipo quiere hacer es **una relación nueva en su forma integrada**. Pero no parte de cero: hay cinco piezas
publicadas que la sostienen.

| Pieza que ya existe | Qué da | Qué NO da | Fuente |
|---|---|---|---|
| **Modelo Médico Integrado (IMM) de NASA** | Probabilidad de ~100 condiciones médicas por misión (priors) | Pesos por variable fisiológica de cada persona | ✅ Walton y Kerstman 2020, [doi:10.3357/AMHP.5432.2020](https://doi.org/10.3357/AMHP.5432.2020) · ✅ Antonsen et al. 2022, [doi:10.1038/s41526-022-00193-9](https://doi.org/10.1038/s41526-022-00193-9) |
| **Grafos causales (DAG) de los riesgos de NASA** | Qué causa qué entre los ~30 riesgos del Human System Risk Board | Pesos numéricos: son diagramas cualitativos | ✅ Antonsen et al. 2024, [doi:10.1038/s41526-024-00375-7](https://doi.org/10.1038/s41526-024-00375-7) · ✅ Antonsen et al. 2023, [doi:10.1038/s41526-023-00305-z](https://doi.org/10.1038/s41526-023-00305-z) |
| **Validación de un DAG con datos** | Un ejemplo de cómo probar un diagrama causal con datos reales (hueso, en roedores) | Validación en humanos | ✅ Reynolds et al. 2022, [doi:10.3390/biomedicines10092187](https://doi.org/10.3390/biomedicines10092187) |
| **Relaciones puntuales con tamaño de efecto** | Pares concretos medidos en astronautas (CO₂ → cefalea, sueño → desempeño) | Un modelo conjunto de todas las variables | Ver §2 |
| **Detección de anomalías contra la línea base personal (en Tierra)** | Que un reloj detecta enfermedad antes de los síntomas comparando a cada persona con su propio normal | Validación en el espacio | ✅ Mishra et al. 2020, [doi:10.1038/s41551-020-00640-6](https://doi.org/10.1038/s41551-020-00640-6) · ✅ Alavi et al. 2022, [doi:10.1038/s41591-021-01593-2](https://doi.org/10.1038/s41591-021-01593-2) · ✅ Li et al. 2017, [doi:10.1371/journal.pbio.2001402](https://doi.org/10.1371/journal.pbio.2001402) |

**Y la dirección exacta que proponen ya la recomienda un taller de NASA como investigación abierta:**
biomonitoreo con IA, modelos personales y aprendizaje desde datos de la Tierra para llevarlos al espacio
profundo. ✅ Scott et al. 2023, *Nature Machine Intelligence*, [doi:10.1038/s42256-023-00617-5](https://doi.org/10.1038/s42256-023-00617-5)
(y su compañero ✅ Sanders et al. 2023, [doi:10.1038/s42256-023-00618-4](https://doi.org/10.1038/s42256-023-00618-4)).
Es decir: **es un problema reconocido y no resuelto**, buen terreno para el reto.

---

## 2. Los 11 padecimientos: qué relación ya está publicada

Columna "Estado": **cuantificada** = hay un número publicado entre variable y malestar · **cualitativa** = se sabe
que se relacionan, sin peso · **sin fuente verificada** = no encontré una fuente que pudiera verificar.

| # | Padecimiento | Variables que lo sugieren | Relación publicada | Estado |
|---|---|---|---|---|
| 1 | Arritmia / fibrilación auricular | FC, ritmo de pulso, ECG | Un reloj detecta fibrilación auricular a gran escala (en Tierra): ✅ Perez et al. 2019, [doi:10.1056/NEJMoa1901183](https://doi.org/10.1056/NEJMoa1901183) | Cualitativa en el espacio |
| 2 | Desacondicionamiento e intolerancia ortostática | PA y FC al ponerse de pie, volumen plasmático | Incidencia tras la ISS y el transbordador: ✅ Lee et al. 2015, [doi:10.3357/AMHP.EC08.2015](https://doi.org/10.3357/AMHP.EC08.2015) | Cualitativa |
| 3 | Hipoxia / problema respiratorio | SpO₂, respiración | Riesgo oficial de NASA; sin pesos individuales publicados | Sin fuente verificada de pesos |
| 4 | Infección / fiebre / desregulación inmune | FC en reposo, temperatura, sueño | La FC en reposo sube **antes** de los síntomas (en Tierra): ✅ Mishra 2020, ✅ Alavi 2022. Incidencia en vuelo ≈3,4 eventos por año-vuelo: ✅ Crucian et al. 2016, [doi:10.2147/IJGM.S114188](https://doi.org/10.2147/IJGM.S114188) | Cuantificada en Tierra; incidencia en vuelo |
| 5 | Pérdida de sueño y desalineación circadiana | Actigrafía, luz, horario | Sueño corto en astronautas y uso de hipnóticos: ✅ Barger et al. 2014, [doi:10.1016/S1474-4422(14)70122-X](https://doi.org/10.1016/S1474-4422(14)70122-X) | Cuantificada (prevalencia) |
| 6 | Fatiga y deterioro cognitivo | PVT, sueño, carga de trabajo | El PVT es sensible a la pérdida de sueño: ✅ Basner y Dinges 2011, [doi:10.1093/sleep/34.5.581](https://doi.org/10.1093/sleep/34.5.581) | Cuantificada (Tierra) |
| 7 | CO₂ / dolor de cabeza | ppCO₂ de cabina, cefalea | **Cada +1 mmHg de CO₂ duplica la probabilidad de reportar cefalea** (ISS): ✅ Law et al. 2014, [doi:10.1097/JOM.0000000000000158](https://doi.org/10.1097/JOM.0000000000000158) | **Cuantificada en astronautas** |
| 8 | Radiación aguda por evento solar | Dosis, eventos DONKI | Límites de NASA por evento y de carrera (catálogo 01); sin predictor fisiológico individual | Cualitativa |
| 9 | Estrés / salud conductual | Ánimo, cohesión, sueño | Mars-500: ✅ Basner et al. 2014, [doi:10.1371/journal.pone.0093298](https://doi.org/10.1371/journal.pone.0093298) · Antártida: ✅ PNAS 2026, [doi:10.1073/pnas.2533420123](https://doi.org/10.1073/pnas.2533420123) · Polar: ✅ Palinkas y Suedfeld 2008, [doi:10.1016/S0140-6736(07)61056-3](https://doi.org/10.1016/S0140-6736(07)61056-3) | Cualitativa (análogos) |
| 10 | Descompresión tras una EVA | Transiciones de presión, síntomas | NASA tiene modelos de riesgo de descompresión, pero **no los verifiqué** | ⚠️ Sin fuente verificada |
| 11 | Trombosis yugular y SANS | Síntomas visuales, ultrasonido | Estasis y trombosis yugular en vuelo: ✅ Marshall-Goebel et al. 2019, [doi:10.1001/jamanetworkopen.2019.15011](https://doi.org/10.1001/jamanetworkopen.2019.15011) · SANS: ✅ Lee et al. 2020, [doi:10.1038/s41526-020-0097-9](https://doi.org/10.1038/s41526-020-0097-9) | Cualitativa |

**Conclusión de la tabla:** solo **una** relación (CO₂ → cefalea) tiene un peso cuantificado **en astronautas**.
El resto tiene incidencias, prevalencias o relaciones medidas en la Tierra. Por eso los pesos del modelo
**tendrán que estimarse** y presentarse como hipótesis.

---

## 3. Lo que dicen los entornos análogos (para transferir a Marte, submarinos, la Antártida)

| Entorno | Hallazgo útil para el modelo | Fuente |
|---|---|---|
| **Mars-500** (520 días encerrados) | Hipocinesia y cambios de sueño **distintos en cada tripulante**: hay un cambio común y desviaciones individuales | ✅ Basner et al. 2013, *PNAS*, [doi:10.1073/pnas.1212646110](https://doi.org/10.1073/pnas.1212646110) |
| **Antártida (Concordia)** | Con condiciones idénticas, **cada tripulación evoluciona distinto**: pesa la dinámica del grupo | ✅ PNAS 2026, [doi:10.1073/pnas.2533420123](https://doi.org/10.1073/pnas.2533420123) · ✅ *Antarctic Science* 2022, [doi:10.1017/s0954102022000104](https://doi.org/10.1017/s0954102022000104) |
| **Submarino** (67 días, guardias de 6 h) | Sueño y hormonas circadianas en campo | ✅ Van Puyvelde et al. 2022, [doi:10.1152/japplphysiol.00130.2021](https://doi.org/10.1152/japplphysiol.00130.2021) · ✅ *Sleep Medicine* 2024, [doi:10.1016/j.sleep.2023.11.718](https://doi.org/10.1016/j.sleep.2023.11.718) |
| **HERA** (NASA) | Liderazgo y funcionamiento de tripulaciones en misiones análogas | ✅ *Acta Astronautica* 2025, [doi:10.1016/j.actaastro.2025.08.030](https://doi.org/10.1016/j.actaastro.2025.08.030) |
| **Vuelo real con datos abiertos** | Gemelos de NASA y SOMA/Inspiration4 (datos ómicos y clínicos abiertos en OSDR) | ✅ Garrett-Bakelman et al. 2019, [doi:10.1126/science.aau8650](https://doi.org/10.1126/science.aau8650) · ✅ Mason et al. 2024, [doi:10.1038/s41586-024-07586-8](https://doi.org/10.1038/s41586-024-07586-8) |

**Lo que esto implica para el modelo:** en todos los análogos aparece el mismo patrón que ustedes quieren
modelar: **un cambio esperado para todo el grupo + desviaciones individuales grandes**. Eso es exactamente
lo que resuelve un **modelo jerárquico** (§4, capa 2).

---

## 4. 🔶 Diseño propuesto: estadística adaptativa en cinco capas

Ninguna capa entrena desde cero con datos de astronautas (no hay suficientes). Todas son métodos establecidos.

| Capa | Pregunta que responde | Método | Fuente del método |
|---|---|---|---|
| **1. Línea base personal adaptativa** | ¿Esta persona se aleja de **su** normal? | z robusto con mediana y MAD móviles (el motor de Julio) + **EWMA** y **CUSUM** para detectar derivas lentas | ✅ Roberts 1959, [doi:10.1080/00401706.1959.10489860](https://doi.org/10.1080/00401706.1959.10489860) · ✅ Page 1954, [doi:10.1093/biomet/41.1-2.100](https://doi.org/10.1093/biomet/41.1-2.100) |
| **2. Lo normal de la tripulación** | ¿Este cambio le pasa a **todos** (adaptación esperada) o solo a **uno**? | **Modelo mixto jerárquico**: efecto común de la fase de misión + efecto aleatorio por persona. La alarma es el residuo individual después de quitar el cambio común | ✅ Bates et al. 2015 (lme4), [doi:10.18637/jss.v067.i01](https://doi.org/10.18637/jss.v067.i01) |
| **3. Pesos y selección de variables** | ¿Qué variables pesan para cada malestar y cuáles se pueden dejar de lado? | **Lasso adaptativo / red elástica** por malestar: da pesos interpretables y pone en cero las variables irrelevantes. Solo se permiten las conexiones que el **DAG de NASA** considera plausibles | ✅ Tibshirani 1996, [doi:10.1111/j.2517-6161.1996.tb02080.x](https://doi.org/10.1111/j.2517-6161.1996.tb02080.x) · ✅ Zou y Hastie 2005, [doi:10.1111/j.1467-9868.2005.00503.x](https://doi.org/10.1111/j.1467-9868.2005.00503.x) · ✅ Zou 2006, [doi:10.1198/016214506000000735](https://doi.org/10.1198/016214506000000735) · DAG: ✅ Antonsen 2024 |
| **4. Combinaciones raras** | ¿Hay una mezcla de señales que nunca se había visto, aunque cada una sea normal? | **Isolation Forest** sobre las desviaciones de la capa 2 | ✅ Liu et al. 2008, [doi:10.1109/ICDM.2008.17](https://doi.org/10.1109/ICDM.2008.17) |
| **5. Transferencia entre entornos** | ¿Lo aprendido en la Tierra sirve en Marte, en un submarino o en la Antártida? | **Aprendizaje por transferencia / adaptación de dominio**, validado dejando un entorno fuera (entrenar en dos, probar en el tercero) | ✅ Pan y Yang 2010, [doi:10.1109/TKDE.2009.191](https://doi.org/10.1109/TKDE.2009.191) |

**Cómo se ve una alarma** (capas 1 + 2): *"La FC en reposo de Luis subió 2,4 z sobre su normal; el resto
de la tripulación subió 0,3 z en la misma fase. El cambio es suyo, no de la misión."*

---

## 5. Qué es nuevo y qué no (para decirlo así en el pitch)

| | Estado |
|---|---|
| Incidencia de malestares en vuelo | ✅ Ya existe (IMM, Crucian 2016) |
| Qué riesgo causa cuál | ✅ Ya existe, cualitativo (DAG del HSRB) |
| Detectar enfermedad comparando a cada persona con su normal | ✅ Ya existe en la Tierra (relojes, 2017–2022) |
| **Pesos por variable para los 11 malestares espaciales, en un solo modelo** | 🔶 **Nuevo** |
| **Separar "cambio normal de la tripulación" de "desviación individual" en tiempo real** | 🔶 **Nuevo** en vuelo (los análogos lo muestran, nadie lo opera) |
| **Transferir de la Tierra a otros entornos aislados** | 🔶 **Investigación abierta** (recomendada por Scott et al. 2023) |

---

## 6. Limitaciones que hay que decir

1. **Casi no hay etiquetas.** Para aprender pesos "variable → malestar" se necesita saber quién se enfermó y
   cuándo. Los datos abiertos de la Tierra (MMASH, CGMacros) no traen esos diagnósticos. Los pesos que estimemos
   serán **hipótesis**, no verdades.
2. **Muestras muy pequeñas.** Los análogos tienen de 6 a 25 personas; los estudios en vuelo, de 3 a 14
   (catálogos del equipo). Cualquier peso tendrá un intervalo de confianza amplio.
3. **Los datos de astronautas no son abiertos.** NASA LSDA requiere solicitud (DAR). Mars-500, HERA y Concordia
   tampoco publican datos crudos individuales.
4. **La transferencia no está demostrada.** Que un modelo funcione en la Antártida no garantiza que funcione en
   Marte (gravedad, radiación y retraso de comunicación cambian).

---

## 7. 🔶 Qué se puede construir en el hackatón

| Paso | Con qué datos | Resultado demostrable |
|---|---|---|
| Capas 1 y 2 | Tripulación simulada de la maqueta (Ana, Luis, Mei, Tomás) + FC real de MMASH | "Cambio de toda la tripulación vs. desviación de uno", en pantalla |
| Capa 3 (ejemplo pequeño) | CGMacros: glucosa, comidas, actividad y laboratorio de 45 personas | Pesos y variables descartadas con red elástica, para un desenlace terrestre (p. ej. variabilidad de glucosa) |
| Capa 4 | Las desviaciones de la capa 2 | Detección de combinaciones raras |
| Capa 5 | Sin datos abiertos de dos entornos | Solo como **diseño** en la diapositiva, con la limitación dicha |

### Investigación no terminada que conviene citar como "en curso"

- **CHAPEA** (NASA): misiones análogas de un año simulando Marte; ya está en el PDF de síntesis del equipo.
- **Spaceflight Standard Measures** (NASA): recolección continua de medidas comparables entre misiones.
- **Taller de IA para biomonitoreo** (Scott et al. 2023): plantea este mismo problema como reto abierto.

---

## 8. 🔶 Pesos basados en fisiología (no en casos reales)

Como casi no hay casos etiquetados, el peso de cada variable se puede fijar por **mecanismo fisiológico**: qué tan
directamente esa señal forma parte de cómo se produce el malestar. No es un invento: así funcionan las **escalas de
alerta temprana** de los hospitales, que dan puntos a cada signo vital según cuánto se aleja de lo fisiológico, y se
validaron después.

| Precedente | Qué hace | Fuente |
|---|---|---|
| Escala de alerta temprana modificada (MEWS) | Puntos por signo vital según su desviación fisiológica | ✅ Subbe et al. 2001, [doi:10.1093/qjmed/94.10.521](https://doi.org/10.1093/qjmed/94.10.521) |
| Escala nacional de alerta temprana (NEWS) | Lo mismo, validado contra desenlaces reales después de definirlo | ✅ Smith et al. 2013, [doi:10.1016/j.resuscitation.2012.12.016](https://doi.org/10.1016/j.resuscitation.2012.12.016) |
| Elicitación formal de expertos | Método para convertir el juicio de especialistas en pesos con su incertidumbre | ✅ O'Hagan et al. 2006, [doi:10.1002/0470033312](https://doi.org/10.1002/0470033312) |
| Modelos fisiológicos integrados | Simulan la fisiología completa con ecuaciones, sin pacientes | ✅ Guyton et al. 1972, [doi:10.1146/annurev.ph.34.030172.000305](https://doi.org/10.1146/annurev.ph.34.030172.000305) · ✅ HumMod, Hester et al. 2011, [doi:10.3389/fphys.2011.00012](https://doi.org/10.3389/fphys.2011.00012) |
| Modelo fisiológico **del espacio** | Desacondicionamiento cardiovascular en vuelo largo, modelado multiescala | ✅ Gallo et al. 2020, [doi:10.1038/s41526-020-00117-5](https://doi.org/10.1038/s41526-020-00117-5) |

### Regla para asignar el peso (escala 0–3)

| Peso | Criterio fisiológico | Ejemplo |
|---|---|---|
| **3** | La variable **es** el mecanismo o su medida directa | SpO₂ en hipoxia |
| **2** | Eslabón causal directo en la fisiopatología (está en el DAG de NASA) | Pulso en reposo en infección (la fiebre sube el pulso) |
| **1** | Marcador asociado pero inespecífico | Sueño corto en infección |
| **0** | Sin vía fisiológica conocida → **la variable se descarta para ese malestar** | Glucosa en descompresión |

### Cómo se calcula el índice de cada malestar (como la NEWS, pero contra **su** normal)

1. Cada variable se compara con la línea base de la persona (z robusto, capa 1).
2. Puntos por desviación: |z| < 1 → 0 · 1–2 → 1 · 2–3 → 2 · > 3 → 3, y solo cuentan en la **dirección**
   fisiológica del malestar (p. ej. SpO₂ que **baja**, no que sube).
3. **Índice = Σ (peso × puntos) / máximo posible** → de 0 a 1.
4. **Alarma** si el índice pasa un umbral, **o** si una sola variable de peso 3 llega a 3 puntos (igual que la NEWS
   dispara con un solo parámetro extremo).

### Matriz inicial de pesos (borrador para revisar con el equipo)

🔶 **Juicio fisiológico nuestro, no validado.** Cada número debe justificarse y revisarse, idealmente con un médico.
↑ = sube en el malestar · ↓ = baja.

| Malestar | FC reposo | SpO₂ | Resp. | Temp. | PA | Sueño | PVT | CO₂ cabina | Síntomas |
|---|---|---|---|---|---|---|---|---|---|
| 1 Arritmia | 3 (ritmo irregular) | 1 ↓ | 0 | 0 | 1 | 0 | 0 | 0 | 2 (palpitaciones) |
| 2 Intolerancia ortostática | 2 ↑ de pie | 0 | 0 | 0 | 3 ↓ de pie | 0 | 0 | 0 | 2 (mareo) |
| 3 Hipoxia | 2 ↑ | 3 ↓ | 3 ↑ | 0 | 1 | 0 | 1 ↑ lapsos | 2 ↑ | 2 (disnea) |
| 4 Infección | 2 ↑ | 1 ↓ | 1 ↑ | 3 ↑ | 1 ↓ | 1 ↓ | 0 | 0 | 2 |
| 5 Sueño / circadiano | 1 | 0 | 0 | 1 | 0 | 3 ↓ | 2 ↑ lapsos | 1 ↑ | 1 |
| 6 Fatiga / cognición | 1 ↑ | 0 | 0 | 0 | 0 | 2 ↓ | 3 ↑ lapsos | 1 ↑ | 1 |
| 7 CO₂ / cefalea | 1 | 0 | 2 ↑ | 0 | 0 | 0 | 1 | 3 ↑ | 3 (cefalea) |
| 8 Radiación aguda | 1 | 0 | 0 | 1 | 0 | 0 | 1 | 0 | 2 (náusea) · + dosis DONKI |
| 9 Estrés / conductual | 1 ↑ | 0 | 1 ↑ | 0 | 1 ↑ | 2 ↓ | 1 | 0 | 3 (ánimo) |
| 10 Descompresión | 1 | 1 ↓ | 1 | 0 | 1 | 0 | 0 | 0 | 3 (dolor articular) · + presión del traje |
| 11 Trombosis / SANS | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 3 (visión, cuello) · + ultrasonido |

Ejemplo de variable descartada: en la fila 11 casi todo es 0, porque los signos del reloj no tienen vía fisiológica
hacia la trombosis yugular; ahí manda el ultrasonido.

### Por qué sigue siendo "estadística adaptativa"

Los pesos fisiológicos son el **punto de partida (prior)**. Cuando lleguen datos reales (de análogos o de vuelo),
se actualizan con estadística bayesiana: los pesos que los datos confirmen se mantienen, los que no, bajan. Así el
modelo empieza con conocimiento y aprende con evidencia, sin necesitar casos para arrancar.

### Lo que hay que decir de este enfoque

- Los pesos son **juicio experto documentado**, no evidencia estadística. Se presentan así.
- Hay que hacer **análisis de sensibilidad**: si un peso cambia de 2 a 1, ¿cambia la alarma? Si no cambia, el modelo es robusto.
- El reloj del equipo **no da HRV** (sin intervalos RR), por eso no aparece en la matriz.
