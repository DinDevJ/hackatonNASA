# Variables medibles por sensor: qué dice el catálogo

Equipo Monarcas · 2026-11-15 · Datos: [`medibles.json`](medibles.json) (lo carga el backend al arrancar; lo usa la vigilancia como umbral clínico absoluto)

Las siete variables que el sistema recibe de sensores (playera, reloj, brazalete), con lo
que los catálogos de investigación del repo dicen de cada una.

**Cómo leerlo**

- **Nada es de memoria.** Cada número sale de un archivo del repo y la columna "De dónde
  sale" dice cuál y en qué fila. Lo que no está en el catálogo se marca **no encontrado**.
- **[A]** = umbral de NASA o validado en astronautas · **[T]** = clínico terrestre, no
  validado en microgravedad. **Todos los umbrales de signos vitales son [T]**: el catálogo
  no encontró ninguna tabla pública de NASA para ellos.
- **El sistema no diagnostica.** Señala qué vigilar y a qué padecimientos apunta una
  desviación; la interpretación es del médico de vuelo.
- Los umbrales absolutos **complementan** la comparación con la línea base propia (LUNNA),
  no la sustituyen. El catálogo lo pide así: "usar la línea base del propio tripulante".

Abreviaturas de origen: **VMA** = `VARIABLES-MEDIDAS-ASTRONAUTAS.csv` · **PV** =
`PADECIMIENTO-VARIABLE.csv` · **cat. 01 / 03 / 04** = archivos de `variables-diagnostico/`
(con número de línea) · **índice** = `variables-diagnostico/00-indice-priorizado.md`.

> **Dónde están hoy los archivos citados.** `VMA` y `PV` están en [`Planeacion/data/`](../../../Planeacion/data)
> (`variables/VARIABLES-MEDIDAS-ASTRONAUTAS.csv` y `padecimientos/PADECIMIENTO-VARIABLE.csv`), e `iker_variables.csv`
> ahora se llama `variables/VARIABLES-CARDIOBASCULAR.csv`. Los **números de fila** de este documento corresponden a
> la versión del 15 nov previa a la reorganización; `PADECIMIENTO-VARIABLE.csv` se editó después, así que algunas
> filas pueden haberse movido. La carpeta `variables-diagnostico/` está íntegra en la etiqueta `planeacion-archivo`:
> `git checkout planeacion-archivo -- Planeacion/variables-diagnostico`

---

## 1. Quién lo ha medido en vuelo y cómo lo medimos nosotros

Las siete figuran como **"sí en vuelo"** en el catálogo.

| Variable (id) | Equipo real en vuelo | Aquí | De dónde sale |
|---|---|---|---|
| Frecuencia cardiaca (`04:A4`), lpm | ISS: manguito automático ALSP (40–200 lpm, ±5 %), Polar Heart Rate Monitor 2 (continua en ejercicio), BP/ECG, Bio-Monitor de la CSA (camiseta, desde dic 2018). En reposo: Holter/ECG. Orion: ECG en el kit médico | Playera con ECG y reloj con PPG | VMA fila 310 · cat. 04 A4 (l. 27) y tabla B.1 · VMA fila 4 (`01:V3`) |
| SpO2 (`04:A3`), % | Pulsioxímetro del kit de la ISS (ALSP/AMP), Bio-Monitor. Orion: pulsioxímetro en el kit; el dato "puede ingresarse a mano". Rango y exactitud: no encontrado | Reloj con PPG rojo/infrarrojo | VMA fila 309 · cat. 04 A3 (l. 26) y B.1 |
| Frecuencia respiratoria (`04:A2`), resp/min | Bio-Monitor (frecuencia y volumen respiratorio); conteo manual; ECG + sensor respiratorio | Banda torácica de la playera | VMA fila 308 · cat. 04 A2 (l. 25) |
| Temperatura corporal (`04:A1`), °C | Termómetros orales desechables y de piel de los kits (ISS AMP; Shuttle); sensor de flujo de calor en la frente (Thermolab, ESA/DLR, investigación); Bio-Monitor: temperatura de piel | Termómetro axilar de la playera | VMA fila 307 · cat. 04 A1 (l. 24) y B.1 |
| Presión sistólica (`01:V1`) y diastólica (`X:PAD`), mmHg | ISS: registro ambulatorio de 24 h con equipo portátil; manguito oscilométrico ALSP (20–280 mmHg, ±3 mmHg o 2 %); BP/ECG; Bio-Monitor. Orion: puede anotarse a mano | Brazalete oscilométrico | VMA fila 2 · cat. 01 V1 (l. 31) · cat. 04 A5 (l. 28, fusionada) |
| Presión media (`X:PAM`), mmHg | Sin equipo ni fila propia: se obtiene de la sistólica y la diastólica | Calculada: (sis + 2·dia)/3 | cat. 01 V1 (l. 31) · VMA fila 7 (`01:V6` usa la PA media) |

El inventario del kit de la ISS procede del catálogo de hardware CHeCS de 2011, que el
propio cat. 04 califica de "inventario antiguo, parte ya sustituida".

---

## 2. Umbrales

| Variable | Ámbar | Rojo | Tipo | Fuente citada por el catálogo | De dónde sale |
|---|---|---|---|---|---|
| Frecuencia cardiaca | > 100 lpm en reposo | no encontrado | [T] | Rango 60–100 lpm (MedlinePlus); taquicardia sinusal inapropiada: reposo > 100 lpm y media de 24 h > 90 (consenso HRS 2015) | cat. 04 A4 (l. 27) · cat. 01 V3 (l. 33) |
| SpO2 | ≤ 92 % ("contactar") | ≤ 88 % ("atención inmediata") | [T], propuesta no oficial | MedlinePlus, pulsioximetría | cat. 04 A3 (l. 26) y C.5 · índice §2.2 |
| Frecuencia respiratoria | > 18 resp/min | no encontrado | [T] | Rango 12–18/min (MedlinePlus) | cat. 04 A2 (l. 25) |
| Temperatura | ≥ 39,4 °C sostenida | ≥ 40,6 °C | [T], propuesta no oficial | MedlinePlus, fiebre (valores orales) | cat. 04 A1 (l. 24) y C.5 |
| Presión sistólica | < 90 o ≥ 140 mmHg | < 70 **[A]** o > 180 mmHg | [T] | Categorías ACC/AHA (vía CDC); rango agudo 90/60–120/80 (MedlinePlus); < 70 = presíncope | cat. 01 V1 (l. 31) y V47 (l. 93) |
| Presión diastólica | < 60 o ≥ 90 mmHg | > 120 mmHg | [T] | Igual que la sistólica | cat. 01 V1 (l. 31) |
| Presión media | — | — | — | **Sin umbral en el catálogo** | — |

**Cómo se codificaron** (decisiones nuestras sobre números del catálogo; el detalle está en
el campo `nota` de cada variable):

1. Si el catálogo da un criterio de alerta explícito, se usa ese (SpO2, temperatura, presión).
2. Si solo da un rango de referencia, su borde se usa como ámbar **únicamente en la
   dirección que el catálogo asocia a algún padecimiento** (FC y FR altas).
3. **Bordes del catálogo que no se usan como alerta**, porque saltarían con valores
   normales de un adulto entrenado en reposo:
   - FC < 60 lpm. El mismo catálogo registra 53,3 ± 7,3 lpm en astronautas dormidos (cat. 03 V18).
   - FR < 12 resp/min. El catálogo dice que la FR baja en vuelo.
   - Temperatura < 36,5 °C, y "fiebre probable si oral > 37,2–37,5 °C": la temperatura
     central sube ~1 °C en vuelo, así que ese corte saltaría con valores normales.
   - Presión "elevada" (120–129) y estadio 1 (130–139 u 80–89).
4. **Matices que cambian la lectura:**
   - El < 70 mmHg [A] se definió para la prueba ortostática tras el aterrizaje, no para
     reposo en vuelo; aquí es un suelo de seguridad.
   - Los valores de temperatura son orales y la playera mide en la axila; el catálogo no
     da la equivalencia.
   - NASA fija el límite de oxígeno sobre el aire inspirado (PIO2 objetivo 145–155 mmHg,
     mínimo 127), no sobre la SpO2. El índice advierte que la SpO2 de reloj sobreestima
     en hipoxemia: no debe ser la única alerta.
   - En vuelo la presión baja (§3): el borde de 90/60 queda más cerca de lo normal.
5. **Valor exacto del límite.** Los criterios "≤" y "≥" del catálogo son inclusivos, pero el
   sistema compara con "menor/mayor que": una lectura igual al límite (SpO2 de 92 % u 88 %,
   sistólica de 140) no dispara por umbral.

---

## 3. Cambio esperado en microgravedad

| Variable | Qué dice el catálogo | n | Fuente | De dónde sale |
|---|---|---|---|---|
| Frecuencia cardiaca (reposo) | Sin cambio en vuelo; bradicardia relativa en vuelos largos frente a cortos. Dormidos: 53,3 ± 7,3 lpm antes del vuelo, sin cambio en vuelo | 8 astronautas + 8 cosmonautas; sueño: Xu 2013 | Norsk 2015; Baevsky 2007; Xu 2013 | cat. 01 V3 (l. 33) · cat. 03 V18 (l. 38) |
| SpO2 | **no encontrado** | — | — | cat. 04 A3 |
| Frecuencia respiratoria | Disminuye; **magnitud no encontrada** | 8 | Baevsky 2007; Bio-Monitor | cat. 04 A2 (l. 25) |
| Temperatura | La **central** en reposo sube ~1 °C de forma gradual en 2,5 meses | 11 (ISS) | Stahn 2017 | cat. 04 A1 (l. 24) · cat. 03 V47 (l. 90) |
| Presión sistólica | Media de 24 h: −8 ± 2 mmHg (días 85–192). Otro estudio: 120 ± 10 → 106 ± 9 mmHg | 8 | Norsk 2015 / Fu 2019 | cat. 01 V1 (l. 31) |
| Presión diastólica | Media de 24 h: −9 ± 2 mmHg | 8 | Norsk 2015 | cat. 01 V1 (l. 31) |
| Presión media | Media de 24 h: −10 ± 3 mmHg | 8 | Norsk 2015 | cat. 01 V1 (l. 31) |

- Todo son datos de la ISS (órbita baja) con 8–11 personas: orientan, no predicen a un individuo.
- El +1 °C es de temperatura **central** (sensor en la frente). No es intercambiable con una
  lectura axilar ni oral.
- El catálogo no dice si "±" es desviación o error estándar, ni asigna cada cifra de presión
  a un estudio; la atribución a Norsk 2015 es inferida (mismo n = 8 que la fila V2).

### Frente a los priores actuales de LUNNA (`semillas/inicial.json`, órbita)

| Variable | Prior actual | Catálogo | Resultado |
|---|---|---|---|
| Frecuencia cardiaca | 0 %, "sin cambio poblacional verificado" | "Sin cambio en vuelo" (n = 8 + 8) | Coincide el valor. El texto de la fuente se queda corto: el catálogo sí reporta el dato |
| SpO2 | 0 %, no informativo | no encontrado | Coherente |
| Frecuencia respiratoria | 0 % | Disminuye, sin magnitud | Sin número que usar; el prior centrado en 0 no refleja la dirección conocida |
| Temperatura | +1,0 °C | ~+1 °C central (n = 11) | Coincide, pero se aplica a un termómetro axilar (el propio prior lo anota) |
| Presión sistólica | −6,7 % (= −8/120) | −8 ± 2 mmHg | Mismo origen. El 120 del denominador es un supuesto; el segundo estudio (−14 mmHg) no se usa |
| Presión diastólica | −11,25 % (= −9/80) | −9 ± 2 mmHg | Mismo origen. El 80 es un supuesto |
| Presión media | −9,3 %, derivado de sistólica y diastólica | −10 ± 3 mmHg, dato directo | **Discrepancia:** el prior no usa el dato directo del catálogo |

Dispersión entre personas, entre misiones y de un día a otro (τ₀, σ): **no están en el
catálogo**; en `inicial.json` son supuestos y así están rotulados.

---

## 4. A qué padecimientos aporta cada variable

Cada celda: **peso · dirección · nivel de evidencia**. No es un diagnóstico: indica en qué
padecimientos pesa una desviación de esa variable.

| Padecimiento | FC | SpO2 | FR | Temperatura | Presión arterial |
|---|---|---|---|---|---|
| P01 Arritmia / fibrilación auricular | — | 1 ↓ C | — | — | 1 ↓ C |
| P02 Desacondicionamiento e intolerancia ortostática | — | — | — | — | 1 ↓ C |
| P03 Hipoxia / problema respiratorio | 2 ↑ B | **3 ↓ A** | **3 ↑ B** | — | 1 ↑/↓ C |
| P04 Infección, fiebre o desregulación inmune | 2 ↑ A | 1 ↓ B | 1 ↑ B | **3 ↑ B** | 1 ↓ B |
| P05 Pérdida de sueño y desalineación circadiana | 1 ↑ C | — | — | — | — |
| P06 Fatiga y deterioro cognitivo | 1 ↑ C | — | — | — | — |
| P07 Exposición a CO2 / cefalea | 1 ↑ C | — | 2 ↑ C | — | — |
| P08 Radiación aguda por evento solar | 1 ↑ C | — | — | 1 ↑ C | — |
| P09 Estrés / salud conductual | 1 ↑ C | — | 1 ↑ C | — | 1 ↑ C |
| P10 Enfermedad por descompresión tras EVA | 1 ↑ C | 1 ↓ C | 1 ↑ C | — | 1 ↓ C |
| **De dónde sale (PV, filas)** | 33, 41, 66, 97, 128, 142, 158, 187 | 3, 34, 42, 188 | 35, 43, 129, 159, 189 | 44, 143 | 4, 23, 36, 45, 160, 190 |

- **Peso:** 1 marcador asociado · 2 eslabón causal directo · 3 la variable es el mecanismo.
  **Evidencia:** A relación medida con número · B mecanismo documentado en una fuente ·
  C juicio fisiológico del equipo, sin fuente directa (leyenda en `Leo/modelo-pesos/README.md`).
- **17 de los 25 vínculos son nivel C.** Los A y B citan a Smith 2013 (escala NEWS),
  Mishra 2020 (infección detectada por reloj) y Call 2005 (fiebre en gripe, LR+ 1,8,
  rotulado "terrestre"). Ningún peso de esta tabla está validado en astronautas
  (`Leo/modelo-pesos/README.md`).
- La columna FC usa las filas de `01:V3` (FC en reposo): PV no tiene filas para `04:A4`.
- El catálogo trata sistólica y diastólica como una sola variable (`01:V1`) y no liga la
  presión media a ningún padecimiento.

---

## 5. Lo que el catálogo NO tiene

1. **Ningún umbral [A] de signos vitales en vuelo.** NASA-STD-3001 remite a "valores
   clínicamente aceptados" y a documentos de programa no públicos (cat. 04 C.5; índice §4).
2. Umbral rojo para FC y FR. Umbral de bradicardia, de frecuencia respiratoria baja y de
   hipotermia.
3. Umbral, padecimientos y fila propia para la presión arterial media.
4. Magnitud del descenso de la frecuencia respiratoria en vuelo. Cambio de la SpO2 en vuelo.
5. Equivalencia entre temperatura axilar, oral y central. Cuánto dura "sostenida" en el
   criterio de fiebre.
6. Si el "±" de la presión arterial es desviación o error estándar, y de qué estudio sale
   cada cifra.
7. Dispersión entre personas y variabilidad día a día de cualquiera de las siete.
8. Datos de tránsito, Luna o Marte: todo lo medido es de la ISS.
9. Exactitud del pulsioxímetro de vuelo. El resumen que respalda el aviso sobre la SpO2
   de reloj (`RESUMEN-MAESTRO.md`) no está en el repo.
10. Vínculo padecimiento–variable para la FC instantánea (`04:A4`).

**Avisos de fiabilidad que hereda este documento** (índice §5): muchos artículos se
leyeron solo como resumen por la API de PubMed o Europe PMC; el primer autor de la
referencia [63] del cat. 01 (criterio de FC > 100 lpm) se anotó de memoria, aunque la URL
se abrió; los umbrales de SpO2 son una propuesta clínica terrestre, no oficial.

---

## 6. Candidatas futuras medibles por sensor (no implementadas)

| Candidata (id) | Medida en vuelo | Sensor nuestro | Qué respalda el catálogo | Umbral | De dónde sale |
|---|---|---|---|---|---|
| Variabilidad de la FC: RMSSD, SDNN, LF/HF (`01:V43`, `03:V17`) | Sí: Holter durante el sueño (n = 7), Bio-Monitor | ECG de la playera (intervalos RR) | Reducida en vuelo durante el sueño (n = 7); otra fila dice bandas sin cambio (n = 8): **las dos entradas no coinciden** y el duplicado sigue abierto. Aporta a P09 (peso 2, C) | Sin corte; usar línea base propia. Normas terrestres: RMSSD 42 ± 15 ms, SDNN 50 ± 16 ms | VMA filas 44 y 235 · cat. 01 V43 (l. 80) · cat. 03 V17 (l. 37) · PV fila 178 · `Iker/iker_variables.csv` fila 14 |
| Ritmo irregular / fibrilación auricular (`01:V31`) | Sí: Holter de 48 h (n = 13, ningún caso) | ECG de la playera | Aporta a P01 con peso 3, evidencia A. Solo como bandera de ritmo irregular, no diagnóstico | Sin umbral numérico | VMA fila 32 · cat. 01 V31 (l. 68) · PV fila 2 · `iker_variables.csv` fila 2 |
| Intervalo QTc (`01:V34`) | Sí: Holter (n = 3) | ECG de la playera | QTc > 440 ms aparece en el primer mes de vuelo largo. Aporta a P01 (peso 2, B) | [T] 450/460 ms; riesgo ≥ 500. [A] > 440 ms en el estudio de astronautas | VMA fila 35 · cat. 01 V34 (l. 71) · PV fila 8 |
| Tiempo de tránsito de la onda de pulso (`01:V23`) | Sí: cosmonautas, 162–196 días | ECG de la playera + PPG del reloj | Disminuye en vuelo (n = 8); magnitud no encontrada | no encontrado | VMA fila 24 · cat. 01 V23 (l. 53) |
| Descenso nocturno de la presión (`01:V2`) | Sí: registro de 24 h | Brazalete en tomas programadas | Dip de 8 ± 3 mmHg, conservado en vuelo (n = 8) | no encontrado | VMA fila 3 · cat. 01 V2 (l. 32) |
| Prueba de bipedestación: caída de presión y subida de FC (`01:V47`, `01:V48`) | Solo antes y después del vuelo (necesita gravedad) | Brazalete + playera | Aporta a P02 (peso 3, A y peso 2, B). Aplicable al aterrizar o en superficie | [T] caída ≥ 20/10 mmHg; [T] ≥ 30 lpm; [A] sistólica < 70 = presíncope | VMA filas 48 y 49 · cat. 01 V47–V48 (l. 93–94) · PV filas 16 y 17 |
| Sueño por actigrafía (`03:V30`, `03:V31`) | Sí: Actiwatch | Acelerómetro del reloj | ISS: 6,09 h de media, 43,8 % de noches < 6 h (n = 21) | [T] 7–9 h; < 6 h se asocia a peor desempeño | VMA filas 248 y 249 · cat. 03 V30–V31 (l. 66–67) |

Límite conocido para las tres primeras: según `Leo/modelo-pesos/README.md`, el reloj del
equipo no envía intervalos RR; tendrían que salir del ECG de la playera.
