# Las 77 variables asignadas: listado completo

Mi asignación de `../ASIGNACION_VARIABLES_MONARCAS.md`, variable por variable, con su
origen de dato. Generado desde los catálogos, no transcrito a mano.

> **Son 77 entradas, pero 75 variables reales.** Dos eran duplicados entre catálogos y
> se fusionaron (ver `DUPLICADOS.md`). Se listan igual, al final, para que el número
> cuadre con la asignación original.

---

## De dónde sale cada dato

Pedisteis tres orígenes: reloj, análisis de IA o input. En la práctica **hacen falta
seis**, y la diferencia importa: la nave y el laboratorio no son "input", porque **no
depende de nadie a bordo** que ese dato exista.

| Origen | Nº | Qué significa |
|---|---:|---|
| ⌚ **Reloj** | 5 | Sensor óptico o acelerómetro del reloj. Automático, sin esfuerzo del astronauta |
| 🧠 **Modelo** | 1 | Estimado por algoritmo desde otra señal. **Se muestra con su margen de error** |
| ✍️ **Input** | 29 | Lo teclea, mide o responde una persona a bordo |
| 🛰️ **Nave** | 11 | Telemetría de la nave. La app **la consume**, no la mide |
| 🧮 **Cálculo** | 3 | Se deriva de otras variables o del calendario. Sin sensor |
| 🩺 **CMO** | 2 | Necesita al oficial médico de a bordo o equipo que opera una persona |
| 🔴 **No a bordo** | 23 | Imagen o laboratorio. **No se obtiene en vuelo** |
| ⚪ **Fuera** | 1 | Requiere equipo ambulatorio de 24 h. Fuera de alcance |
| ⟶ *Fusionada* | 2 | Duplicados que se unieron a su canónica |

### 🔴 Lo que dice este reparto

**Sólo 5 de 75 salen del reloj.** La mayor parte del producto no es
sensor: es lo que la persona responde, lo que la nave informa, y lo que no se puede
saber a bordo.

Y **23 variables no se obtienen en vuelo de ninguna manera** —
necesitan ecografía con operador entrenado o un laboratorio que no vuela. Eso no es un
hueco de nuestra investigación: es una restricción de la misión, documentada.

---

## Listado

Ordenado por origen: primero lo que podemos construir, al final lo que no.

| Nº | ID | Grupo | Qué dato es | Unidad | Para qué sirve | Origen |
|---:|---|---|---|---|---|---|
| 1 | `01:V3` | G1 | Frecuencia cardíaca en reposo | lpm | Desacondicionamiento, hipovolemia, taquicardia | ⌚ **Reloj** |
| 2 | `01:V29` | G1 | Minutos y tipo de ejercicio diario | min, carga | Cumplimiento de la contramedida | ⌚ **Reloj** |
| 3 | `01:V48` | G1 | Aumento de la frecuencia cardíaca al ponerse de pie | lpm | Taquicardia postural, hipovolemia | ⌚ **Reloj** |
| 4 | `04:A3` | G1 | SpO2 | % | Hipoxia, neumonía, inhalación de humo/tóxicos, despresurización | ⌚ **Reloj** |
| 5 | `04:A4` | G1 | Frecuencia cardiaca | lpm | Fiebre, deshidratación, hipoxia, dolor, sepsis | ⌚ **Reloj** |
| 6 | `04:A2` | G1 | Frecuencia respiratoria | resp/min | Infección respiratoria, hipoxia, tóxicos inhalados, dolor; adaptación cardiorrespiratoria | 🧠 **Modelo** |
| 7 | `01:V1` | G2 | Presión arterial sistólica / diastólica en reposo | mmHg | Vasodilatación, hipovolemia, riesgo cardiovascular; **agudo:** choque séptico o anafilaxia,… | ✍️ **Input** |
| 8 | `01:V8` | G3 | Masa corporal | kg | Pérdida de fluidos, balance energético | ✍️ **Input** |
| 9 | `01:V28` | G4 | Edema facial y congestión nasal o de cabeza… | escala 0–10 o sí/no | Desplazamiento cefálico de fluidos | ✍️ **Input** |
| 10 | `01:V46` | G3 | Prueba de bipedestación (5 o 10 min) o de… | sí/no, min | Intolerancia ortostática | ✍️ **Input** |
| 11 | `01:V47` | G2 | Caída de la presión arterial al ponerse de pie | mmHg | Hipotensión ortostática | ✍️ **Input** |
| 12 | `01:V50` | G3 | Síntomas de presíncope: mareo, náusea, visión en… | sí/no, escala | Presíncope | ✍️ **Input** |
| 13 | `01:V52` | G3 | Carga de fluidos y sal antes de la reentrada | mL (oz) | Cumplimiento de la contramedida | ✍️ **Input** |
| 14 | `01:V53` | G3 | Uso de prenda de compresión | sí/no, mmHg | Contramedida | ✍️ **Input** |
| 15 | `03:V21` | G5 | Cohesión percibida de tarea y social | Cuestionario… | Deterioro del equipo | ✍️ **Input** |
| 16 | `03:V22` | G5 | Clima de grupo y de trabajo (GES, WES) | Subescalas… | Cohesión, papel del líder | ✍️ **Input** |
| 17 | `03:V23` | G5 | Desplazamiento de tensión hacia control de misión | Relación entre… | Conflicto tripulación-tierra | ✍️ **Input** |
| 18 | `03:V24` | G5 | Conflicto diádico | Recuento diario con… | Conflicto interpersonal | ✍️ **Input** |
| 19 | `03:V25` | G5 | Seguridad psicológica | Subescala de 7 ítems… | Clima de equipo | ✍️ **Input** |
| 20 | `03:V26` | G5 | Eficacia percibida del equipo | Cuestionario… | Desempeño de equipo | ✍️ **Input** |
| 21 | `03:V27` | G5 | Apoyo social | Cuestionario ENRICHD | Aislamiento social | ✍️ **Input** |
| 22 | `03:V28` | G5 | Proximidad e interacción entre tripulantes | Tiempo cerca de… | Retraimiento, formación de subgrupos | ✍️ **Input** |
| 23 | `03:V53` | G4 | Karolinska Sleepiness Scale (KSS) | 1-9 | Somnolencia momentánea | ✍️ **Input** |
| 24 | `03:V54` | G4 | Samn-Perelli (fatiga) | 1 = totalmente… | Fatiga momentánea | ✍️ **Input** |
| 25 | `03:V55` | G4 | Fatiga mental, agotamiento físico, cansancio,… | Escalas visuales… | Fatiga | ✍️ **Input** |
| 26 | `03:V56` | G4 | NASA-TLX | 6 subescalas… | Carga de trabajo y su origen | ✍️ **Input** |
| 27 | `03:V57` | G4 | Escala Bedford | 1-10 (árbol de… | Sobrecarga cognitiva | ✍️ **Input** |
| 28 | `03:V58` | G4 | Esfuerzo físico percibido (Borg CR10) | 0-10 | Sobrecarga física | ✍️ **Input** |
| 29 | `03:V60` | G4 | Carga de trabajo autoinformada | Escala visual | Sobrecarga | ✍️ **Input** |
| 30 | `04:A1` | G3 | Temperatura corporal | °C | Infección, golpe de calor, respuesta inflamatoria | ✍️ **Input** |
| 31 | `04:A6` | G4 | Cefalea (sí/no, intensidad 0–10, hora) | escala | CO2 elevado, adaptación espacial, desplazamiento de fluidos, CO | ✍️ **Input** |
| 32 | `04:A7` | G4 | Lista de síntomas por CO2 | checklist | Hipercapnia | ✍️ **Input** |
| 33 | `04:A8` | G4 | Congestión nasal / "cabeza llena" | sí/no, días | Adaptación espacial, CO2, alergia, infección respiratoria alta | ✍️ **Input** |
| 34 | `04:A9` | G4 | Síntomas de mal de adaptación espacial | checklist | Space Adaptation Syndrome | ✍️ **Input** |
| 35 | `04:A29` | G3 | Umbral auditivo (audiometría) | dB HL por frecuencia | Pérdida auditiva por ruido o neurosensorial | ✍️ **Input** |
| 36 | `04:A23` | G6 | ppCO2 de cabina | mmHg | Cefalea, fatiga, mal sueño | 🛰️ **Nave** |
| 37 | `04:A24` | G6 | CO2 inspirado en traje (PICO2) | mmHg | Hipercapnia en EVA | 🛰️ **Nave** |
| 38 | `04:A25` | G6 | O2 inspirado (PIO2) | mmHg | Hipoxia / hiperoxia | 🛰️ **Nave** |
| 39 | `04:A26` | G6 | Presión total de cabina | kPa / psia | Barotrauma, enfermedad por descompresión | 🛰️ **Nave** |
| 40 | `04:A27` | G6 | Temperatura y humedad de cabina | °C, % HR | Mucosas secas, erupciones por crecimiento microbiano, estrés térmico | 🛰️ **Nave** |
| 41 | `04:A28` | G6 | Ruido: dosis de 24 h | dBA, % dosis | Pérdida auditiva, mal sueño, irritabilidad | 🛰️ **Nave** |
| 42 | `04:A30` | G6 | Productos de combustión (CO, HCN, HCl, HF) | ppm | Incendio, inhalación de humo | 🛰️ **Nave** |
| 43 | `04:A31` | G6 | Contaminantes traza / tóxicos (amoníaco,… | ppm, mg/m³ | Irritación de ojos y vías aéreas, tos | 🛰️ **Nave** |
| 44 | `04:A32` | G6 | Partículas en aire | mg/m³ | Irritación ocular y respiratoria | 🛰️ **Nave** |
| 45 | `04:A33` | G6 | Polvo lunar (<10 µm) | mg/m³ | Tos, estornudos, irritación ocular y nasal, abrasión | 🛰️ **Nave** |
| 46 | `04:A35` | G6 | Dosis de radiación personal | mSv, mGy | Riesgo de cáncer, síndrome agudo, cataratas | 🛰️ **Nave** |
| 47 | `01:V6` | G9 | Resistencia vascular sistémica | derivada (PAM / gasto) | Vasodilatación sistémica | 🧮 **Cálculo** |
| 48 | `03:V29` | G9 | Fase de misión (cuarto) | Cuarto 1-4 de la… | "Fenómeno del tercer cuarto" | 🧮 **Cálculo** |
| 49 | `03:V59` | G9 | Horas de trabajo | h/día; h/semana | Sobrecarga; "schedule creep" | 🧮 **Cálculo** |
| 50 | `01:V19` | G3 | VO2máx / VO2pico | ml·min⁻¹·kg⁻¹ | Capacidad aeróbica, aptitud para EVA | 🩺 **CMO** |
| 51 | `01:V23` | G1 | Tiempo de tránsito de la onda de pulso | ms | Rigidez vascular / redistribución del gasto | 🩺 **CMO** |
| 52 | `01:V4` | G7 | Volumen sistólico | mL | Volumen central, precarga | 🔴 **No a bordo** |
| 53 | `01:V5` | G7 | Gasto cardíaco | L/min | Carga circulatoria | 🔴 **No a bordo** |
| 54 | `01:V7` | G8 | Volumen plasmático | % de cambio o mL | Hipovolemia, riesgo de intolerancia ortostática | 🔴 **No a bordo** |
| 55 | `01:V9` | G7 | Área seccional de la vena yugular interna | mm² | Congestión venosa cefálica | 🔴 **No a bordo** |
| 56 | `01:V10` | G7 | Presión venosa yugular no invasiva | mmHg | Presión venosa central/cefálica | 🔴 **No a bordo** |
| 57 | `01:V11` | G7 | Volumen de la vena yugular | % de cambio | Congestión cuello-cabeza | 🔴 **No a bordo** |
| 58 | `01:V12` | G7 | Área de la vena porta | % de cambio | Desplazamiento de fluido esplácnico | 🔴 **No a bordo** |
| 59 | `01:V13` | G7 | Área de la vena femoral | % de cambio | Acumulación venosa pélvica | 🔴 **No a bordo** |
| 60 | `01:V14` | G7 | Área de venas de la pantorrilla (tibial,… | % de cambio | Vaciado venoso de piernas | 🔴 **No a bordo** |
| 61 | `01:V15` | G7 | Velocidad en la vena cerebral media | % de cambio (cm/s) | Congestión venosa intracraneal | 🔴 **No a bordo** |
| 62 | `01:V16` | G7 | Diámetro de la vena cava inferior | cm | Estado de volumen | 🔴 **No a bordo** |
| 63 | `01:V17` | G7 | Masa y volumen telediastólico del ventrículo… | g / mL | Atrofia cardíaca | 🔴 **No a bordo** |
| 64 | `01:V18` | G7 | Fracción de eyección del ventrículo izquierdo | % | Función sistólica | 🔴 **No a bordo** |
| 65 | `01:V20` | G7 | Rigidez carotídea (índice β, coeficiente de… | adimensional / % | Envejecimiento arterial | 🔴 **No a bordo** |
| 66 | `01:V21` | G7 | Grosor íntima-media carotídeo | mm | Aterosclerosis subclínica; efecto degenerativo de la radiación | 🔴 **No a bordo** |
| 67 | `01:V22` | G7 | Grosor íntima-media femoral | mm | Remodelado arterial | 🔴 **No a bordo** |
| 68 | `01:V24` | G8 | Resistencia a la insulina (HOMA-IR) y glucosa tras… | índice / mmol·L⁻¹ | Riesgo cardiometabólico | 🔴 **No a bordo** |
| 69 | `01:V25` | G8 | Biomarcadores de estrés oxidativo e inflamación | varias | Daño vascular | 🔴 **No a bordo** |
| 70 | `01:V26` | G8 | Renina y aldosterona | varias | Regulación de volumen | 🔴 **No a bordo** |
| 71 | `01:V30` | G8 | Parámetros de orina (densidad, pH, glucosa,… | varias | Hidratación, función renal | 🔴 **No a bordo** |
| 72 | `01:V49` | G7 | Índice volumen sistólico × presión diastólica de pie | compuesto | Predice si se completará la prueba de inclinación | 🔴 **No a bordo** |
| 73 | `01:V51` | G8 | Noradrenalina plasmática al ponerse de pie | pg/mL | Respuesta simpática insuficiente | 🔴 **No a bordo** |
| 74 | `04:A34` | G8 | Microbiología de aire, superficies y agua | UFC | Riesgo infeccioso y alérgico | 🔴 **No a bordo** |
| 75 | `01:V2` | G2 | Descenso nocturno de la presión arterial (dip) | mmHg | Regulación autonómica | ⚪ **Fuera** |
| 76 | `01:V27` | — | Frecuencia respiratoria | — | ⟶ fusionada en `04:A2` | ⟶ *Fusionada* |
| 77 | `04:A5` | — | Presión arterial | — | ⟶ fusionada en `01:V1` | ⟶ *Fusionada* |

---

## Notas que no caben en la tabla

- **`04:A2` frecuencia respiratoria** es el único **🧠 Modelo**: se estima de la
  modulación respiratoria del PPG con **±5,4 rpm**. Por eso se muestra como banda, no
  como número.
- **`01:V23`** y **`01:V19`** quedan en **🩺 CMO**, pero por motivos distintos: el
  primero porque estimar presión desde el reloj **está desaconsejado por la AHA (2025)**;
  el segundo porque necesita cicloergómetro, aunque **podría bajar a Modelo** si funciona
  la estimación desde FC submáxima.
- **`01:V46`, `01:V47`, `01:V50`** sólo tienen sentido **con gravedad**: van al modo de
  transición, no al panel diario.
- **`03:V22`** y **`03:V23`** figuran como ✍️ Input, pero 🔴 **están bloqueadas por
  licencia comercial** (Mind Garden). No se implementan.
- **`01:V24`** y **`01:V25`** están en 🔴 No a bordo, pero son la excepción útil: los
  datos abiertos de **Inspiration4** traen valores humanos reales, pre y post vuelo.
- **`04:A28` ruido** es 🛰️ Nave en una misión real, pero **el micrófono del teléfono lo
  puede medir** en nuestra demo. Es la única ambiental que sí podemos capturar.

El detalle de cada grupo, con los ocho puntos del checklist, está en
`../Julio/checklist-G1-G6.md` y `../Julio/checklist-G3-G9.md`.
