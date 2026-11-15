# Especificación de algoritmos: de las salidas de los modelos al semáforo por padecimiento

14 nov 2026 (CDMX). **Documento de especificación; no contiene código ejecutable.** Solo investigación: **nada es un diagnóstico**. El sistema ordena qué revisar y recomienda consultar al cirujano de vuelo.

## 0. Convenciones

**Fuentes usadas (únicas).** Cada número de este documento sale de una de ellas o lleva la marca **[P]**.

| Sigla | Archivo |
|---|---|
| [PV] | `PADECIMIENTO-VARIABLE.csv` (348 ligas) |
| [PAD] | `PADECIMIENTOS.csv` y `PADECIMIENTOS.md` |
| [VMA] | `VARIABLES-MEDIDAS-ASTRONAUTAS.csv` / `.md` |
| [PREC] | `PRECISION-VARIABLES.md` |
| [IP§x] | `INVESTIGACION-PESOS.md`, sección x |
| [CON] | `prototipo/CONTRATO.md` |
| [REG] | `prototipo/fusion/reglas.py` y `fusion/tabla.py` |
| [INV] | Inventario de modelos del encargo (leído de los `manifest.json`, 14 nov 2026) |

**Marcas.**

- **[P]** = provisional/supuesto: no hay fuente en las tablas. Todos los [P] están reunidos en la sección (i) con su número (S1, S2…).
- **[terrestre]** / **[espacial]** = igual que en [IP].
- **SIMULADO** = dato sintético; nunca se presenta como real ni entra al aprendizaje.
- **[experimental]** = salida de un adaptador no validada (p. ej. bandera de ritmo irregular, PR, QTc).

**Símbolos.**

| Símbolo | Significado | Unidad |
|---|---|---|
| i | tripulante | — |
| v | variable del equipo (`variable_id` canónico) | — |
| p | padecimiento P01–P20 | — |
| c | clase de dispositivo o método con que se midió v | — |
| t | instante de la observación | tiempo |
| φ(t) | fase de misión: PRE (prevuelo), VT (vuelo temprano), VTa (vuelo tardío), POST (postvuelo) | — |
| x | observación admitida de v, en la unidad canónica de v | la de v |
| μ_pv, σ_pv | `prior_media` (= peso 1–3) y `prior_de` de la liga (p, v) en [PV] | puntos de peso |
| a_pv | activación de la liga, entre 0 y 1, o NA si no hay dato | adimensional |
| T_p | índice de evidencia ponderada del padecimiento | puntos de peso |
| ΔL_p | cambio de log-odds por las ligas con LR/OR publicado | nats (logaritmo natural) |
| Cob_p | cobertura: fracción del peso medible que sí se observó | 0–1 |

**Arquitectura (acordada; este documento solo la detalla).**

1. **Capa 1 – referencia poblacional terrestre** (edad, sexo, IMC) con los rangos de [IP§c].
2. **Capa 2 – autocalibración personal**: base prevuelo congelada + actualización protegida + CUSUM anclado al prevuelo.
3. **Capa 3 – tripulación como contexto**, nunca como nueva normalidad.
4. **Capas fijas**: puntajes publicados, calculados aparte y sin modificar.
5. **Salida**: un semáforo por padecimiento con cuatro estados: VERDE, AMARILLO, ROJO y GRIS («evidencia insuficiente»).

**Orden de cálculo en cada evaluación** (una por día y cada vez que llega un dato nuevo [P·S20]):

```
PARA cada tripulante i:
  1. Leer las filas del contrato; separar las SIMULADAS (b, G1).
  2. Puerta de calidad por fila → variable_id (o «sin variable de equipo»),
     clase de dispositivo c, nivel de calidad N0–N4, contexto.            (a, b)
  3. Por variable con observación vigente: z poblacional, z personal,
     z reciente, delta de tripulación, CUSUM → estado de la variable.     (c, e)
  4. Por padecimiento: activaciones, T_p, ΔL_p, cobertura, capas fijas.   (d, g)
  5. Semáforo y motivo.                                                   (f)
  6. Aprendizaje (solo después del paso 5, con cuarentena).               (e)
  7. Salida: color, variables que aportan, faltantes, capas fijas,
     etiquetas y «se recomienda revisión por el cirujano de vuelo».
```

---

## (a) Mapeo de modelos existentes → variables → padecimientos

### a.1 Estado real de los modelos [INV]

- **ECG** (`ecg`): único adaptador ejecutado de verdad (Linux/CPU, registros mitdb 100/201/203 y afdb 04015). Puede aportar **ya**, con las reservas de a.2.
- **Eco** (`panecho`, `echonet_dynamic`, `echoclip`, `echoprime`, `medsam2`): solo prueba de carga con datos dummy. **No existe ninguna inferencia real.** El algoritmo debe funcionar sin estas filas y aceptarlas cuando existan, siempre con nivel de calidad N4 (ver b) hasta que haya validación.
- No hay adaptador de PPG ni de reloj. Los datos de sensores entran por `sensores/importador.py` (a.4).

### a.2 Salidas con variable del equipo

Las ligas (padecimiento, peso, nivel) se copiaron de [PV] y se verificaron una por una.

| Modelo · métrica | Unidad · tipo · quality del contrato | `variable_id` | Ligas en [PV] (padecimiento: peso, nivel) | Cómo entra |
|---|---|---|---|---|
| `ecg` · `heart_rate` | bpm · medicion · `ok` o `sin_dato` | `01:V3` **solo si el registro se declara en reposo o sueño**; si no, `04:A4` (FC instantánea) | `01:V3`: P03 (2, B); P04 (2, A); P05, P06, P07, P08, P09, P10 (1, C cada una). **No está ligada a P01** (corrección 1 de [PAD]) **ni a P02**. `04:A4`: sin ligas | Medición. Nivel N1 en reposo con ritmo no marcado como irregular; N2 en otro caso (b.3). No se triplica con `03:V18` ni con `04:A4` |
| `ecg` · `hrv_rmssd`, `hrv_sdnn` | ms · medicion | `03:V17` (canónica). El contrato del prototipo las etiqueta «V43» (= `01:V43`, duplicado sin ligas): se trata como alias | P09 (2, C; dirección «↓ HF / ↑ LF») | **Una sola aportación** (no dos). Métrica de decisión: ln RMSSD [P·S14]; SDNN solo informativa. El adaptador no produce LF/HF |
| `ecg` · `qtc_bazett` | ms · medicion · `experimental_delineacion_dwt` (nunca `ok`) | `01:V34` | P01 (2, B; criterio Rautaharju) | N4: la liga se evalúa como nivel C; no actualiza la base; no puede dar ROJO sola. No evaluable si el ritmo está marcado como irregular |
| `ecg` · `pr_interval` | ms · medicion · `experimental_delineacion_dwt` | `01:V35` | P01 (1, C) | N4. Además `01:V35` es **solo pre-post** en astronautas [VMA] |
| `ecg` · `latidos_irregulares` | latidos · hallazgo · `experimental_criterio_rr_prematuridad` | **No unívoca**: proxy de `01:V32` y/o `01:V33` (el criterio RR no distingue supraventricular de ventricular [CON]) | `01:V32`: P01 (2, C). `01:V33`: P01 (3, C) | **Una sola aportación**, con el peso menor de las dos (2, C) [P·S12]. Nunca se cuenta como `01:V33`. N4. Va en el mismo grupo de correlación que la bandera (d.3) |
| `ecg` · `ritmo_irregular_compatible_fa` y `ritmo_irregular_fraccion_ventanas` | bandera 0/1 · regla_alerta · `BANDERA_EXPERIMENTAL_NO_DIAGNOSTICO`; fracción 0–1 · hallazgo | `01:V31` (proxy) | P01 (3, A; Perez 2019 / Taggar 2016) | **La bandera no hereda el nivel A.** Entra como N4 → nivel C (σ = 1.5), sin el LR de Taggar (d.2). Las dos filas son la misma evidencia: se usa la bandera; la fracción es descriptiva. Bandera vacía = `sin_dato`, no 0 |
| `panecho` · `EF`; `echonet_dynamic` · `EF`; `echoclip` · `feve`; `echoprime` · `ejection_fraction` | % · medicion (EchoCLIP: `zero_shot_por_similitud`; EchoPrime: `recuperacion_por_vecinos_no_calibrado`) | `01:V18` (FEVI) | **Ninguna.** `01:V18` no aparece en [PV] | **No alimenta el score de ningún padecimiento.** Se muestra como contexto (a.5) y sigue sujeta a R1/R2 como capa de demostración (a.6). En astronautas: solo análogo [VMA] |
| `panecho` · `LVSV` | cm³ (≡ mL) · medicion | `01:V4` (volumen sistólico) | P02 (1, C; ↓) | N4. La unidad es idéntica; lo que **no** está demostrado es que la estimación del modelo sea comparable con el método de vuelo (reinhalación / ecocardiografía) [P·S15] |
| `panecho` · `LVEDV` | cm³ · medicion | `01:V17` (**parcial**: la variable es «masa y volumen telediastólico»; el modelo no da masa) | P02 (1, C; ↓) | N4. `01:V17` es **solo pre-post** [VMA] |
| `panecho` · `LAVol` | cm³ · medicion | `01:V36` (volumen de aurícula izquierda; ID verificado en [VMA]) | P01 (1, C; ↑) | N4. `01:V36` es **solo pre-post** (resonancia) [VMA] |

Consecuencia: con las tablas actuales, los modelos de eco solo pueden aportar tres ligas de peso 1 y nivel C (dos a P02, una a P01). No se fuerza ningún mapeo a SANS, cálculos, hueso ni otros.

### a.3 Salidas **sin variable de equipo** (se guardan y se muestran; no entran a ningún score)

| Modelo | Salidas | Motivo |
|---|---|---|
| `panecho` | GLS; LVESV; LVSize; LVWallThickness (2); LVSystolicFunction; LVWallMotionAbnormalities; IVSd, LVPWd, LVIDs, LVIDd, LVOTDiam; LVDiastolicFunction; E/e'; RVSP; RVSize; RVSystolicFunction; RVIDd; TAPSE; RVSVel; RASize; RADimensionM-L; AVStructure; AVStenosis; AVPkVel; AVRegurg; LVOT20mmHg; MVStenosis; MVRegurgitation; TVRegurgitation; TVPkGrad; RAP-8-or-higher; AORoot; pericardial-effusion | No hay variable equivalente en [VMA]. LVESV y los diámetros del VI están «relacionados» con `01:V17`, pero no son ni la masa ni el volumen telediastólico |
| `panecho` | LASize (multiclase), LAIDs2D (cm) | Relacionadas con `01:V36`, pero no son un volumen. No se convierten |
| `echoprime` | `left_atrium_dilation` | Fracción de vecinos, no un volumen: no se mapea a `01:V36` |
| `echoprime` | `dilated_ivc` | La variable candidata `01:V16` es un **diámetro**; la salida es una fracción de vecinos 0–1. Además `01:V16` no tiene ligas en [PV] y es solo análogo |
| `echoprime` | Los otros 18 fenotipos (impella, pacemaker, valvulopatías, `pericardial_effusion`, `pulmonary_artery_pressure_continuous`, etc.), la vista por video y el informe recuperado | Sin variable de equipo. El informe es texto de otros estudios |
| `echoclip` | `similitud_texto`; binarios zero-shot (p. ej. pacemaker) | Similitud coseno: no es probabilidad ni medición. El umbral 0.298 de los autores se queda en `raw_output` |
| `echonet_dynamic`, `medsam2` | Áreas en px², frames de sístole, máscaras | **Sin calibración física.** No se convierten a mL, mm ni cm. Uso permitido: control de calidad y seguimiento relativo dentro del mismo estudio y recorte (c.6) |
| `ecg` | `heart_rate` fuera de reposo | Va a `04:A4`, que no tiene ligas |

No se derivan variables compuestas (p. ej. gasto cardíaco = LVSV × FC → `01:V5`) en esta etapa; además `01:V5` no tiene ligas.

### a.4 Entradas del importador de sensores (no son modelos)

| Variable del importador | `variable_id` | Nota |
|---|---|---|
| `heart_rate` | `01:V3` solo con contexto de reposo o noche; si no, `04:A4` | Reloj PPG: N2 |
| `hrv_rmssd`, `hrv_sdnn` | `03:V17` | Una sola aportación |
| `spo2` | `04:A3` | Muñeca o prenda: N2 |
| `bp_systolic`, `bp_diastolic` | `01:V1` | Sin manguito validado: N4 |
| `temp_body` | `04:A1` | Oral: precisión no evaluada [PAD] |
| `temp_skin` | Ninguna como valor absoluto | La piel no es la temperatura corporal [PREC]. Solo tendencia personal del mismo sensor; no se usa para «fiebre» |
| `sleep_duration` | `03:V30` | Actigrafía: N2 |
| `sleep_efficiency` | `03:V34` | Precisión no evaluada |
| `steps`, `active_minutes` | Sin liga (`01:V29` no está en [PV]) | Solo contexto (reposo / actividad) |
| `symptom` (texto libre) | Ninguna automática | Requiere que una persona lo codifique a una variable de síntoma |

### a.5 Varios modelos para la misma métrica (FEVE)

1. **No se promedian** (igual que `comparar_modelos` [REG]). Se muestran lado a lado con su `quality`.
2. De PanEcho se usa solo la fila `nivel_estudio_agregado` (no las de `nivel_video`), para no contar dos veces.
3. Si en el futuro una liga necesita un solo valor: **mediana** de los modelos admitidos, con dispersión D = máximo − mínimo (puntos porcentuales), y la etiqueta «modelo único» si solo hay uno [P·S16].
4. **R2 se envuelve como puerta de calidad:** si D supera la tolerancia (10 puntos en [REG], valor de demostración), la métrica queda «discordante», no activa nada y no se aprende de ella.
5. **El acuerdo no sube el nivel de calidad.** Que los modelos coincidan no prueba exactitud; EchoCLIP y EchoPrime tienen la misma procedencia (licencia Cedars-Sinai [INV]), así que sus errores pueden estar correlacionados (no verificado).
6. EchoCLIP solo se admite a la comparación si la vista declarada es apical (advertencia del manifest, no verificada aquí); EchoNet-Dynamic solo con A4C.

### a.6 Relación con las cinco reglas de demostración R1–R5 [REG]

Los parámetros siguen siendo **de demostración, sin validación**, tal como dice el propio código.

| Regla | Qué pasa con ella | Detalle |
|---|---|---|
| R1 (FEVE < 40 %) | **Se conserva como capa aparte** | No entra al semáforo: `01:V18` no tiene ligas y el 40 % no está validado en astronautas. Se muestra como aviso de demostración |
| R2 (discrepancia entre modelos) | **Se envuelve** | Pasa a ser la puerta de a.5 punto 4. La tolerancia sigue siendo de demostración |
| R3 (FC nocturna ≥ basal + 4 bpm, 2 noches; inspirada en Alavi 2022) | **Se envuelve y se corrige su base** | Su base actual es la mediana de los 7 días previos, sin excluir noches alertadas: eso permite aprender una anomalía como normal. En esta especificación la base sale de (e). El detector se conserva como activación de `01:V3` en P04, etiquetado [experimental] |
| R4 (eco más viejo que 72 h) | **Se envuelve** | Se convierte en la regla de vigencia de (g). Las 72 h siguen siendo provisionales |
| R5 (R1 ∧ R3) | **Se conserva como capa aparte** | El cruce de fuentes lo hace el score de (d). R5 no entra al semáforo |

### a.7 `quality` y `simulated`

- `simulated = true`: la fila va a un canal separado (b, G1). No alimenta bases, CUSUM, estadísticos de tripulación ni el semáforo real.
- `quality` determina el nivel N0–N4 (b.2). Un valor vacío con `sin_dato: <motivo>` es un faltante con motivo, **nunca un 0**.

---

## (b) Puerta de calidad por sensor

### b.1 Pasos de admisión

| Paso | Regla | Si falla |
|---|---|---|
| G0 Contrato | Las 14 columnas; `value` vacío ⇔ `quality` empieza por `sin_dato`. Una fila `prueba_de_carga` nunca debería llegar [CON] | Se rechaza (N0). Un 0 acompañado de `sin_dato` es una violación del contrato |
| G1 Simulación | `simulated = true` → canal SIMULADO | El semáforo real la ignora. El modo demostración la muestra con «[DATOS SIMULADOS]» |
| G2 Mapeo | Métrica → `variable_id` según (a). Nunca a un puntero fusionado (`01:V27`, `02:V75`, `04:A5`) | «Sin variable de equipo»: se guarda, no puntúa |
| G3 Tipo | `probabilidad_clase` y `similitud` nunca se tratan como medición ni como probabilidad clínica | Solo descriptivas |
| G4 Nivel | Asignar N1–N4 por variable, clase de dispositivo y `quality` (b.2, b.3) | — |
| G5 Unidad y dominio | Unidad esperada; valores imposibles (SpO2 > 100 %, fracción fuera de 0–1, duración negativa). Para la FC del adaptador ECG, sus propios límites de RR (0.25–3.0 s [CON]) equivalen a 20–240 lpm | N0 |
| G6 Contexto | Reposo / sueño / ejercicio / EVA / medicación. Una variable «en reposo» medida en actividad no se admite como tal | Se reasigna (p. ej. a `04:A4`) o N0 |
| G7 Duplicados | Misma persona, variable y ventana: una sola observación. Gana el mejor nivel; a igualdad, el `run_id` más reciente [P·S20] | — |

### b.2 Niveles de calidad y su efecto

La calidad **degrada el nivel de evidencia de la liga, no su peso**. Así se reutiliza la escala del equipo (`prior_de`: A = 0.5, B = 1.0, C = 1.5 [PAD]) y no se inventan multiplicadores.

| Nivel | Cuándo | Nivel de evidencia de la liga | ¿Actualiza la base personal? | ¿Entra a puntajes publicados? | ¿Cuenta para la cobertura que permite VERDE? |
|---|---|---|---|---|---|
| **N1** alta / referencia | Veredicto «alta» en [PREC], o instrumento de referencia declarado | El de la tabla | Sí | Sí | Sí |
| **N2** media / tendencia | Veredicto «media» | Baja un escalón (A→B, B→C) | Solo la base de **su misma clase de dispositivo**, marcada «tendencia» | No | Sí |
| **N3** interrogante | (a) «baja por evidencia» en [PREC] (CO2 de cabina, síntomas fuera de PHQ-9): baja un escalón. (b) Sin evaluación de precisión (295 de las 348 ligas): el de la tabla, con la marca «precisión no evaluada» | Según (a) o (b) | Solo si la calidad declarada por el adaptador o por quien captura es buena | Sí, cuando el puntaje pide justo esa modalidad (ítems de cuestionario, signos tomados a mano) | Sí |
| **N4** baja por error medido, experimental o modelo sin validar | Cuffless; etapas de sueño; temperatura central puntual; PR/QTc del adaptador; bandera de ritmo; criterio RR; **toda salida de modelo de eco**; métrica discordante (R2) | Forzado a C | **Nunca** | **Nunca** | **No** |
| **N0** rechazada | G0, G5 o G6 | — | — | — | — |

Dos reglas adicionales para N4: (1) un padecimiento no puede llegar a ROJO si todas sus ligas activas son N4; (2) un resultado negativo N4 no respalda un VERDE (p. ej. bandera = 0 no descarta nada).

Para N3(b) no se inventa ningún umbral de error: la puerta es «calidad declarada por el adaptador / interrogante».

### b.3 Asignación por variable (solo las 10 variables que cubre [PREC])

| Variable | N1 | N2 | N3 | N4 |
|---|---|---|---|---|
| FC en reposo `01:V3` | ECG en prenda u Holter, en reposo (LoA −3.2 a +2.9 lpm, Villar 2015). La salida del adaptador `ecg` se admite aquí por analogía [P·S13] | Reloj PPG en reposo (MAE 7.2 lpm); prenda en movimiento (−1.77 ± 7.22 lpm); ECG con ritmo marcado como irregular | — | PPG en actividad: no se admite como FC en reposo |
| Irregularidad `01:V31` | ECG u Holter leído por una persona [P·S13] | PPG con confirmación repetida (VPP 0.84 y 98.2 %; sin sensibilidad poblacional) | — | Bandera del adaptador `ecg` (Dash 2009 sin la rama de RR omitidos) |
| SpO2 `04:A3` | Oxímetro de dedo (referencia según [PREC]; sin cifra propia) | Muñeca o prenda (sesgo 0.8 %, LoA −2.7 a +4.1; Astroskin sobreestima ~3 % en hipoxia, n = 2) | — | — |
| Respiración `04:A2` | Bandas torácicas en reposo (1 ± 3 rpm) | Ejercicio máximo (2 ± 7 rpm); derivada de banda abdominal (−0.32 ± 5.27) | Conteo manual | — |
| Temperatura `04:A1` | — | Piel de prenda: solo como tendencia del mismo sensor | Oral (precisión no evaluada [PAD]) | Central estimada como valor puntual (+0.34 ± 0.2 °C; «not accurate enough», Gunga 2009) |
| Temperatura central `03:V47` (fase circadiana) | — | Doble sensor o estimación, **solo para el ritmo** | — | Valor puntual |
| PA `01:V1` | Manguito con validación ISO 81060-2 (ningún modelo concreto verificado [PREC]) | — | Manguito sin validación declarada | Cuffless (−2.13 ± 11.57 mmHg; la ESH indica no usarlo en clínica) |
| Sueño `03:V30` | — | Actigrafía, duración (sensibilidad 0.965, especificidad 0.329) | — | Etapas de dispositivos de consumo |
| PVT `03:V66` | — | PVT-B en laptop | PVT en reloj (latencia no cuantificada) | — |
| CO2 `04:A23` | — | — | Analizador de cabina, CDM, PCO2M («baja por evidencia», no por el sensor) | — |
| Síntomas | PHQ-9 | — | Resto de autorreportes | — |

Advertencias que la puerta debe mostrar siempre: ningún wearable está validado en microgravedad [PREC]; la SpO2 de muñeca tiende a sobreestimar en hipoxia, así que un valor normal N2 no descarta P03.

---

## (c) Normalización y desviación por variable

### c.1 Unidad de observación

- Signos continuos (FC, HRV, FR, SpO2): un valor por día = mediana de los tramos en reposo o sueño [P·S20]. Para comparar la HRV con la norma poblacional se usan ventanas de 5 min en reposo (el adaptador ya informa ventanas de 300 s); el RMSSD o SDNN de un registro largo completo no es comparable con Nunan 2010.
- Conteos (extrasístoles): tasa = n × 24 h / duración analizada (latidos por 24 h). Extrapolar un registro corto es un supuesto y se etiqueta «tasa extrapolada» [P·S12].
- Pruebas y cuestionarios: el resultado de cada aplicación.

### c.2 z poblacional (Capa 1)

`z_pob = (x − m_pob) / s_pob`, con m_pob y s_pob por edad, sexo e IMC **solo donde [IP§c] da el rango**. Todo es [terrestre] y no validado en microgravedad.

| Variable | Referencia de [IP§c] | Cómo se usa | Huecos |
|---|---|---|---|
| FC en reposo `01:V3` | Percentiles 5/50/95 NHANES (Ostchega 2011): 20–39 años ♂ 52/69/89, ♀ 57/74/95; 40–59 años ♂ 52/68/90, ♀ 56/71/92 lpm | z asimétrico: m_pob = P50; s_pob = (P95 − P50)/1.645 si x ≥ P50, y (P50 − P5)/1.645 si x < P50 (supone media normal a cada lado [P·S14]). Ejemplo ♂ 20–39: 12.2 lpm hacia arriba y 10.3 hacia abajo | Sin rango para < 20 ni ≥ 60 años. Sin ajuste por IMC (Quer 2020: edad, sexo, IMC y sueño explican < 10 %; no da coeficientes) |
| PA `01:V1` | Categorías ACC/AHA 2017 (normal < 120/< 80; elevada 120–129/< 80; HTA 1: 130–139 u 80–89; HTA 2: ≥ 140 o ≥ 90) | **Categoría ordinal, no z** | No hay distribución ni rango de PA baja. Sin ajuste por edad, sexo o IMC |
| SpO2 `04:A3` | Escala 1 de NEWS2: ≥ 96 → 0; 94–95 → 1; 92–93 → 2; ≤ 91 → 3 | **Banda ordinal, no z** (efecto techo) | Tendencias por edad, IMC y sexo (Apple 2023) sin coeficientes. De noche es 0.8 % más baja. La atmósfera de cabina cambia lo esperado [PREC] |
| Temperatura `04:A1` | Obermeyer 2017: media 36.6 °C; rango 95 % 35.7–37.3; −0.021 °C por década; +0.002 °C por kg/m² | m_pob = 36.6; s_pob = (37.3 − 35.7)/(2 × 1.96) ≈ 0.41 °C | La edad e IMC de referencia de la cohorte no están en las tablas: el ajuste queda inactivo hasta tenerlos [P·S14] |
| FR `04:A2` | NEWS2: 12–20 rpm = 0 puntos | **Dentro / fuera de rango, no z** | Sin distribución ni ajuste |
| HRV `03:V17` | Nunan 2010 (5 min): RMSSD 42 ± 15 ms; SDNN 50 ± 16 ms | En logaritmo, por la asimetría [P·S14]: ln RMSSD con m = 3.68 y s = 0.35; ln SDNN con m = 3.86 y s = 0.31 (momentos de una lognormal con la media y DE de Nunan) | Valores por sexo y década (Voss 2015, Umetani 1998) no transcritos: sin ajuste por edad |
| QTc `01:V34` | Rautaharju 2009: prolongado ≥ 450 ms (♂) / ≥ 460 ms (♀); corto ≤ 390 ms | **Criterio, no z** | — |
| Todas las demás | **Sin rango en las tablas** | Rama poblacional **inactiva**; se usa solo z personal y, si procede, tripulación | — |

El IMC se calcula con la masa (`01:V8`) y la estatura (`02:V61`); no hay una variable de IMC en [VMA].

### c.3 z personal (Capa 2)

Base por **(tripulante, variable, clase de dispositivo)**: nunca se mezclan clases (una base de SpO2 de muñeca es distinta de una de dedo).

**Base prevuelo congelada.** Con n0 observaciones prevuelo admitidas y estables (mínimo 5, Coskun 2021 vía [IP§d]):

- media encogida hacia la población o la tripulación (Sottas 2007):
  `μ_i = B · m_ref + (1 − B) · x̄_i`, con `B = (s_w²/n0) / (s_w²/n0 + s_b²)`
  - x̄_i: media (o mediana) prevuelo de la persona; m_ref: media poblacional de c.2 o, si no existe, la media prevuelo de la tripulación;
  - s_w: DE dentro de la persona; s_b: DE entre personas. Con pocos datos, s_w se toma del conjunto de la tripulación y con más datos, de la propia persona (Coskun). La única cifra de s_w en las tablas es la variación semanal mediana de 3 lpm para FC de reloj (Quer 2020); el resto se estima [P·S5].
- varianza predictiva: `s_i² = s_w² + B · s_b²`. Con n0 = 0, B = 1 y la fórmula se reduce al z poblacional; con cada dato la referencia se estrecha.
- piso de dispersión: `s_i ≥` error del sensor cuando [PREC] lo da (p. ej. 3 rpm para FR en reposo). Sin cifra, no se pone piso.

**z anclado y ajustado por fase** (el que decide):

`z_fase = (x − μ_i − δ_vφ) / s_i`

- δ_vφ: desplazamiento esperado de la variable v en la fase φ, en la unidad de v; δ = 0 en PRE. Ver (e.4) para cuándo se permite δ ≠ 0.

**z reciente** (detecta eventos agudos y protege el aprendizaje):

`z_act = (x − m_i(t)) / s_i`, con m_i(t) la media adaptativa protegida de (e.3).

**Error del propio z** (aproximación): `Var(z) ≈ 1/n0 + z²/(2·(n0 − 1))`. Se propaga a la activación en (d.4).

### c.4 Delta frente a la tripulación (Capa 3; contexto)

Para el tripulante i, con los otros n − 1 tripulantes en la misma fase y ventana:

`Δ_trip = (x_i − x̄_−i) / (s_−i · √(1 + 1/(n − 1)))`

- x̄_−i y s_−i: media y DE de los demás (se excluye a i).
- Con n pequeño, Δ_trip sigue una t de Student con n − 2 grados de libertad, no una normal: se convierte a un z equivalente con el mismo percentil antes de compararlo con cualquier corte.

| Tamaño de la tripulación n | Qué se hace [P·S6] |
|---|---|
| n ≤ 3 | Rama **inactiva** (con n = 3 quedan 1 grado de libertad y ningún poder) |
| 4 ≤ n ≤ 6 | Solo descriptivo: se muestra, no activa nada. En Mars-500 las respuestas de los 6 tripulantes variaron mucho [IP§d] |
| 7 ≤ n ≤ 14 | Se permite la etiqueta «desviación aislada» cuando el z equivalente pasa de ±1.5 (generalización **provisional** [P·S1]) |

**Único corte con fuente NASA:** cognición (`03:V68`), z ≤ −1.5 respecto de la media prevuelo de la muestra (NTRS 20240012108 [IP§d]):
`z_cog = (x_i(t) − m_pre) / s_pre`, con m_pre y s_pre la media y DE prevuelo de la tripulación en esa prueba. Si n no permite estimar s_pre, se aplica sobre la base personal y se etiqueta «variante del criterio».

Usos permitidos de la Capa 3: (1) el criterio de cognición; (2) etiqueta «desviación compartida» cuando al menos la mitad de la tripulación se desvía en la misma variable y ventana [P·S6], que orienta a una causa ambiental (P03, P05, P07); (3) etiqueta «desviación aislada». **Nunca** cambia una base, **nunca** apaga una alerta individual porque «todos están igual», y no se copia el −1.5 a PA o SpO2 como si fuera oficial.

### c.5 Estado de cada variable

| Estado | Condición | Fuente del corte |
|---|---|---|
| Normal | desviación adversa u < 1.5 | [P·S1] |
| Desviada | 1.5 ≤ u < u1 | generalización del −1.5 de Cognition [P·S1] |
| Alertada | u ≥ u1, con u1 = 2.33 (variable de una dirección) o 2.58 (dos direcciones): p < 0.01 | «amarilla con p < 0.01» [IP§d]; supone normalidad [P·S2] |
| Persistente | alertada durante ≥ 24 h, o en la siguiente medición programada si la variable no es diaria | «roja si persiste 24 h» [IP§d] |
| Deriva | CUSUM en señal (e.5) sin punto alertado | — |

u es la desviación en el sentido adverso de la liga: `u = z_fase` si la dirección es ↑; `u = −z_fase` si es ↓; `u = |z_fase|` si es «↑/↓», «cambio» o «alterada».

### c.6 Unidades y transformaciones

- **GLS (PanEcho):** el valor almacenado es −1 × la salida cruda. No se vuelve a cambiar el signo y, hasta comprobarlo con una inferencia real, la dirección adversa se define sobre |GLS| [P·S15]. Hoy GLS no tiene variable de equipo.
- **Fracciones 0–1** (fracción de vecinos, softmax o sigmoide sin calibrar, fracción de ventanas): no son z de una medición física ni probabilidades clínicas. No se convierten a cm, mL ni %.
- **Similitud coseno:** solo descriptiva.
- **px²:** sin conversión física. Único uso: razón contra el propio valor del mismo estudio y recorte (p. ej. área mínima / área máxima) como control de calidad.
- **cm³ y mL:** la misma unidad. La reserva es de método, no de unidad (a.2).
- **Bandas ordinales** (SpO2, PA, FR): se usan como categoría; no se les calcula z poblacional.

---

## (d) Score por padecimiento

El score tiene **dos canales que no se suman** y una cobertura. Los puntajes publicados van aparte (d.6).

### d.1 Activación de una liga

Cada liga (p, v) se clasifica por el texto de su columna `direccion`. La clasificación de las 348 filas es una tabla de configuración pendiente [P·S10].

| Tipo | Ejemplos de `direccion` | Activación a_pv |
|---|---|---|
| Una dirección | ↑, ↓ | rampa: 0 si u ≤ 1.5; 1 si u ≥ u1; lineal entre ambos |
| Dos direcciones | ↑/↓, cambio, alterada | igual, con u = \|z\| y u1 = 2.58 |
| Presencia | presente, positivo, uso | 1 si se informa presente; 0 si se informa ausente; NA si no se preguntó |
| Criterio publicado | ver tabla siguiente | 1 si se cumple; si no, la rampa |
| Dependiente de fase | «↑ en vuelo / ↓ postvuelo», «tercer cuarto» | el signo o la condición cambia con φ |
| No automática | «patrón atípico», «fenotipo», «hallazgo clínico» | solo si una persona lo codifica |
| Contexto o predisposición | antecedente, anticoncepción, fármacos que prolongan el QT, susceptibilidad previa | 1 si presente, pero **no puede disparar por sí sola** (f.1) |

**Criterios publicados que están en las tablas** (los demás no se usan como criterio):

| Variable | Criterio | Fuente | Ámbito |
|---|---|---|---|
| `01:V34` QTc | ≥ 450 ms ♂ / ≥ 460 ms ♀, o ≤ 390 ms | Rautaharju 2009 [PV] | [terrestre] |
| `01:V47` caída ortostática | ≥ 20/10 mmHg en 3 min | Freeman 2011 [PV] | [terrestre] |
| `01:V48` FC al ponerse de pie | ≥ 30 lpm | McGee 1999; Freeman 2011 (POTS, en 10 min) | [terrestre] |
| `03:V68` Cognition | ≤ −1.5 DE respecto del prevuelo | NTRS 20240012108 | [espacial] |
| `03:V1` PHQ-9 | ≥ 10 | Kroenke 2001 | [terrestre] |
| `04:A23` CO2 | media de 7 días ≥ 2.5 mmHg (fuera de la zona de riesgo de cefalea < 1 %) | Law 2014 | [espacial] |
| `04:A3` SpO2 | banda de NEWS2 con 3 puntos (≤ 91 %) | RCP NEWS2 [IP§c] | [terrestre] |
| `04:A2` FR | fuera de 12–20 rpm | RCP NEWS2 [IP§c] | [terrestre] |

El lapso de PVT ≥ 355 ms es la definición de un lapso, no un corte del número de lapsos: `03:V66` se evalúa por z.

### d.2 Canal bayesiano (solo ligas con LR u OR publicado)

`ℓ_p = ℓ0_p + ΔL_p`, con `ΔL_p = Σ_v κ_v · ln LR_v(resultado)`

- ℓ0_p = ln(π_p / (1 − π_p)): log-odds previas, con π_p la prevalencia (d.5).
- κ_v = 1 solo si la medición es del mismo tipo que la del estudio de origen; si no, κ_v = 0 y la liga aporta únicamente por el canal de pesos. No se usan descuentos intermedios.
- La suma supone independencia condicional. **Hoy ningún padecimiento tiene más de una liga con cifra**, así que el supuesto aún no se pone a prueba.

Las seis ligas con cifra en [PV]:

| Liga | Cifra de la tabla | LR derivado | ln LR | Cuándo κ = 1 |
|---|---|---|---|---|
| P01–`01:V31` | Sens 92 %, esp 82 % (palpación de pulso irregular; Taggar 2016) [terrestre] | LR+ = 0.92/0.18 = 5.1; LR− = 0.08/0.82 = 0.10 | +1.63 / −2.33 | Pulso irregular palpado o registro leído por una persona. **Nunca** con la bandera del adaptador |
| P09–`03:V1` | Sens 88 %, esp 88 % (PHQ-9 ≥ 10; Kroenke 2001) [terrestre] | LR+ = 7.3; LR− = 0.14 | +1.99 / −1.99 | PHQ-9 completo. Se refiere a depresión mayor; aplicarlo a todo P09 es un supuesto [P·S9] |
| P02–`01:V48` y P13–`01:V48` | LR+ 1.7 (pulso postural ≥ 30 lpm; McGee 1999) [terrestre] | LR− no publicado en las tablas | +0.53 / 0 | Prueba de bipedestación con gravedad (solo pre-post). Un negativo aporta 0 |
| P04–`04:A1` | LR+ 1.8 (fiebre, gripe; Call 2005) [terrestre] | LR− no publicado | +0.59 / 0 | «Fiebre» necesita definición; no está en las tablas. Provisional: temperatura corporal N1 o N3 > 37.3 °C (límite superior del rango de Obermeyer) [P·S9] |
| P07–`04:A23` | OR × 2 de cefalea por cada +1 mmHg (Law 2014) [espacial] | ΔL = ln 2 × (c̄7 − 2.5), con c̄7 la media de 7 días de ppCO2 en mmHg | 0.69 por mmHg | Sensor de cabina. El ancla (riesgo 1 % en 2.5 mmHg) y la unidad de tiempo de ese riesgo son una lectura propia del resumen [P·S9] |

**Incertidumbre.** Las tablas no traen intervalos de confianza de estos LR. Se usa la incertidumbre relativa que el equipo ya asignó a la liga: `DE(ln LR_v) = |ln LR_v| × σ_pv / μ_pv` [P·S8]. Ejemplo: Taggar (peso 3, nivel A): 1.63 × 0.5/3 = 0.27. `Var(ΔL_p) = Σ DE²`; `Var(ℓ_p) = Var(ℓ0_p) + Var(ΔL_p)`.

Si la medición queda a menos de su error del umbral del criterio, el resultado es «indeterminado» y aporta 0.

### d.3 Canal de pesos (todas las ligas; es el único para las 308 de nivel C)

El peso se trata como **evidencia débil con incertidumbre**, no como un LR: `w_pv ~ Normal(μ_pv, σ_pv²)`, truncada en 0, con σ_pv según el nivel efectivo después de la puerta (b.2).

**Grupos de correlación.** Las variables que miden casi lo mismo no se suman: dentro de un grupo g solo cuenta la mayor aportación.

- Declarados en [PAD]: {`03:V82`, `03:V83`, `04:A6`} (cefalea); {`01:V3`, `04:A4`} (FC).
- De este documento: {bandera de `01:V31`, `latidos_irregulares`} (en FA el criterio RR marca muchos latidos [CON]); {`hrv_rmssd`, `hrv_sdnn`}.
- El resto (p. ej. duración de sueño por actigrafía, diario y `04:A40`; DMO, T-score y Z-score) debe declararlo el equipo [P·S11].

`T_p = Σ_g max_{v∈g} (μ_pv · a_pv)`  (puntos de peso)

Solo entran las ligas con dato vigente; las NA no suman 0, quedan fuera y reducen la cobertura (g).

### d.4 Incertidumbre del canal de pesos

Con el miembro elegido de cada grupo (marcado con *):

`Var(T_p) ≈ Σ_g [ a*² · σ*² + μ*² · Var(a*) ]`

- primer término: incertidumbre del peso (domina en nivel C);
- segundo: incertidumbre de la medición; `Var(a) ≈ Var(z) / (u1 − 1.5)²` dentro de la rampa y 0 fuera de ella.

Se informa `T_p` con un intervalo aproximado del 90 %: `T_p ± 1.645 · DE(T_p)`, y el límite inferior `T_p^inf = max(0, T_p − 1.645 · DE(T_p))`. Es una aproximación normal con grupos independientes; **no es una calibración**.

Efecto buscado: una sola liga de peso 3 da T = 3 en cualquier nivel, pero T^inf = 2.18 si es A, 1.36 si es B y 0.53 si es C. La evidencia de nivel C alerta, pero no convence sola.

### d.5 Prevalencia previa π_p

Solo donde [PAD] da una cifra. Son prevalencias de misión o de fase, no probabilidades por ventana: usarlas como π_p es un supuesto [P·S7]. Para las proporciones x/n se usa `ℓ0 = ln((x + 0.5)/(n − x + 0.5))` y `Var(ℓ0) = 1/(x + 0.5) + 1/(n − x + 0.5)`.

| Padecimiento | Dato de [PAD] | ℓ0 ± DE | Fase en que aplica |
|---|---|---|---|
| P02 | Presíncope 5/6 tras Mir; 1/6 tras Shuttle (Meck 2001) | +1.30 ± 0.92 (larga duración); −1.30 ± 0.92 (corta) | Solo POST |
| P04 | 3.40 eventos por año-vuelo (Crucian 2016) | π(Δ) = 1 − exp(−λ·Δ), λ = 3.40/365.25 por día; con Δ = 7 d, π = 0.063 y ℓ0 = −2.70. Supone tasa constante [P·S7] | Vuelo |
| P07 | Cefalea en hasta 90 % los primeros días (MTB-004); ancla de Law 2014 | Ancla de d.2 | VT (contexto) y vuelo |
| P11 | 1/11 con trombo oclusivo (Marshall-Goebel 2019) | −1.95 ± 0.87 | Vuelo |
| P12 | 18 % con SANS clínicamente relevante; 70 % con ≥ 1 signo (MTB-001) | −1.52; DE no derivable (sin n) | Vuelo |
| P16 | 57/85 en el primer vuelo (Davis 1988); hasta 73 % los primeros 2–3 días | +0.70 ± 0.23 | VT |
| P10, P13 | Conteos sin denominador («0 eventos tipo II»; «8 postvuelo de 43») | **No derivable** | — |
| P05 | Sueño medio 5.96–6.09 h; hipnóticos en 75 % | No es una prevalencia del padecimiento: solo contexto | — |
| P01, P03, P06, P08, P09, P14, P15, P17–P20 | Vacío | **Sin prior** | — |

Sin prior no se inventa un número: se informa solo ΔL_p y se etiqueta «prior no disponible».

### d.6 Capas de puntajes publicados (en paralelo, sin mezclar)

- No se reentrenan ni se modifican sus puntos o gráficos. Se calculan **solo con todas sus entradas presentes** y con nivel N1 o N3; si falta una, el estado es «incompleto: falta X». Nunca se imputa un ítem.
- **No cambian T_p ni ΔL_p.** Se muestran al lado del score con su etiqueta.
- Las bandas o cortes que no están en las tablas no se retranscriben aquí: se toman de la publicación citada en [IP§a].

| Puntaje | Ámbito | Padecimiento junto al que se muestra | Entradas y estado con la lista actual del equipo |
|---|---|---|---|
| NEWS2 | [terrestre] | P03, P04 | FR `04:A2`, SpO2 `04:A3`, PAS `01:V1`, pulso `01:V3`/`04:A4`, temperatura `04:A1`. **Faltan como variable del equipo:** O2 suplementario y nivel de conciencia → hoy «incompleto» salvo captura manual |
| qSOFA | [terrestre] | P04 | PAS ≤ 100, FR ≥ 22, mentación alterada. No hay variable de mentación; sustituirla por el PVT daría un puntaje derivado que **no es qSOFA** y debe llamarse así |
| Lake Louise 2018 | [terrestre] | P03 (comparte síntomas con P16 y P07) | Cuatro ítems 0–3 con su propia redacción; no se derivan de la escala 0–10 de cefalea. AMS = ≥ 3 con cefalea ≥ 1 tras ≥ 6 h |
| Conkin (DCS) | [espacial: cámara] | P10 | **Inactivo.** Faltan TR, prerrespiración, presión del traje, deambulación y tiempo de EVA (hueco de [PAD]). No se calcula ni se reconstruye la fórmula a partir de los coeficientes |
| PHQ-9 | [terrestre] | P09 | 9 ítems. Sin uso documentado en astronautas [VMA] |
| Centor | [terrestre] | P04 | Fiebre `04:A1`, garganta `04:A19`; no hay variable de ganglios ni de tos → «incompleto» |
| STONE | [terrestre] | P13 | Hematuria `04:A22c`, cólico `02:V37`; el ítem de raza no aplica [IP§a] → no se da un total; se muestran los ítems |
| Constans | [terrestre; miembro superior] | P11 | Solo como analogía; no validado en cuello ni en vuelo |

Ningún puntaje está validado en microgravedad [IP§e].

### d.7 Ejemplos de comprobación (valores hipotéticos, solo para verificar la aritmética)

**P01 con solo el adaptador ECG:** bandera = 1 (peso 3, N4 → C); QTc cumple el criterio (peso 2, N4 → C); muchos latidos irregulares (mismo grupo que la bandera, no suma).
T = 3 + 2 = 5; DE = √(1.5² + 1.5²) = 2.12; T^inf = 1.51. Resultado: AMARILLO, con el texto «confirmar con ECG leído por una persona». No puede ser ROJO (todo es N4).

**P04 con FC de ECG en reposo y termómetro oral:** FC alertada (peso 2, A, N1); temperatura alertada (peso 3, B, N3b).
T = 5; DE = √(0.5² + 1.0²) = 1.12; T^inf = 3.16. Canal bayesiano: LR+ 1.8, por debajo del corte. Resultado: AMARILLO de inmediato y ROJO si persiste 24 h.

---

## (e) Autocalibración y salvaguardas

### e.1 Invariantes (normativos; cualquier implementación debe cumplirlos)

1. **La base prevuelo es inmutable.** Se congela al lanzamiento. Ningún proceso la reescribe; una corrección humana crea una versión nueva y conserva la anterior.
2. **Detectar no es aprender.** El CUSUM y los z usan todos los puntos admitidos; el aprendizaje usa solo los que pasan e.2.
3. **Solo una persona acepta una «nueva normalidad».** El sistema nunca la adopta solo.
4. **Nada SIMULADO, N4 o N0 entra al aprendizaje.**
5. **La tripulación no redefine la normalidad de nadie.**
6. **Las bases no se mezclan entre clases de dispositivo.**

### e.2 Qué puntos pueden actualizar la referencia adaptativa

Un punto entra solo si cumple **todo**:

| Condición | Detalle |
|---|---|
| Calidad | N1; N2 solo para la base de su propia clase; N3 con calidad declarada buena |
| No simulado | `simulated = false` |
| Estable | \|z_act\| < 1.5 [P·S1] y en el contexto estándar de la variable (reposo, noche) |
| Sin alerta | Ningún padecimiento ligado a la variable está en AMARILLO o ROJO, y la variable no está «alertada» ni «persistente» |
| Sin tendencia | El CUSUM de la variable no está en señal (Coskun: se excluyen atípicos y tendencias) |
| Fuera de episodio | No cae en la ventana de un episodio: síntoma informado, bandera de ritmo, fiebre, EVA, ejercicio, fármaco que altera la variable (p. ej. `01:V42`, `03:V87`) |
| Fuera de transición | No cae en el periodo de adaptación tras el lanzamiento ni tras el aterrizaje (e.4) |
| Cuarentena cumplida | Han pasado 72 h [P·S4] sin que aparezca una alerta posterior; así se excluyen hacia atrás los puntos del pródromo |

### e.3 Regla de actualización

**Versión mínima (EWMA protegido):**

`m_i(t) = m_i(t−1) + α · g(t) · (x(t) − m_i(t−1))`

- m_i: media adaptativa, en la unidad de la variable; arranca en μ_i (base prevuelo).
- g(t) = 1 si el punto cumple e.2; 0 si no (la media no se mueve).
- α = 0.1 [P·S3] (memoria efectiva ≈ 2/α − 1 = 19 observaciones).
- **Tope:** `|m_i(t) − (μ_i + δ_vφ)| ≤ 1.5 · s_i` [P·S3]. Al tocar el tope, la media se congela y la variable pasa a «deriva»: una persona decide.

**Versión objetivo (bayesiano jerárquico, población → tripulación → individuo):**

`x_i(t) ~ Normal(μ_i + δ_vφ(t), s_w²)`;  `μ_i ~ Normal(m_trip, s_b²)`;  `m_trip ~ Normal(m_pob, s_pob²)`

- μ_i se estima **solo con datos prevuelo** (fórmula cerrada de c.3) y queda fija.
- En vuelo solo se actualiza δ_vφ, con puntos que cumplen e.2 y dentro de los límites de e.4.
- Ambas versiones deben producir el mismo comportamiento ante las pruebas de (h.2).

### e.4 Fase de misión como covariable

- Fases: PRE, VT, VTa, POST. La duración de la fase temprana **no está establecida** [IP§e]; valor provisional 30 días [P·S4], solo para que el flujo se pueda ejecutar.
- δ_vφ ≠ 0 **solo para variables con una adaptación esperada documentada**. Candidatas con nota en [VMA]: volumen sistólico `01:V4` (+35 % en los meses 3–6), FR `04:A2` (disminuye, n = 8), HRV durante el sueño `03:V17` (reducida, n = 7). La lista definitiva la decide el equipo [P·S4].
- Para todo lo demás (SpO2, temperatura, sueño, PVT, síntomas, hueso, músculo, masa corporal) δ = 0: un cambio compartido por toda la tripulación sigue siendo una desviación. Así no se «normaliza» una pérdida ósea o una falta de sueño colectiva.
- δ_vφ del tripulante i se estima **sin sus propios datos** (mediana de los demás, encogida hacia el valor previo) y con un límite alrededor de ese valor previo. Con n ≤ 3 se usa solo el valor previo.
- Tras cada cambio de fase hay un periodo sin aprendizaje (provisional: 72 h [P·S4]).
- Los datos POST nunca modifican la base prevuelo ni las estimaciones de vuelo. En POST todo se compara contra el prevuelo (seguimiento de la recuperación).

### e.5 Tendencias lentas: CUSUM anclado al prevuelo

Residuo estandarizado en el sentido adverso: `r(t) = ± (x(t) − μ_i − δ_vφ) / s_i` (signo según la dirección de la liga).

`C(t) = max(0, C(t−1) + r(t) − k)`; señal cuando `C(t) ≥ h`.

- k = 0.5 y h = 5, en unidades de DE [P·S3] (valores habituales del CUSUM tabular; no constan en las tablas).
- Para variables de dos direcciones se llevan dos CUSUM.
- Sin dato, C se mantiene (no decae). El aprendizaje **no** lo reinicia; solo el cierre de una revisión humana.
- Equivalentes documentados: límites individuales de Sottas 2007 o el punto de ajuste de Coskun 2021, siempre anclados al prevuelo.

### e.6 Deriva frente a evento

| | Evento | Deriva |
|---|---|---|
| Señal | Variable «alertada» en uno o pocos puntos, o un episodio informado | CUSUM en señal, o tope del EWMA, sin punto alertado |
| Escala de tiempo | Horas a 1–2 días | Días a semanas |
| Efecto en el aprendizaje | Se excluyen el episodio y su cuarentena | Se congela la media adaptativa |
| Salida | Activación de la liga (d.1) | AMARILLO «por deriva» si la liga pesa ≥ 2 (f.1) |
| Cierre | Vuelve a normal con histéresis (f.3) | Solo por revisión humana, que puede registrar un ajuste individual con fecha y autor |

### e.7 Lo que nunca se aprende como normal

- Un ritmo irregular o una FA (ni la bandera, ni la FC o HRV medidas durante el episodio).
- La caída de PA o la taquicardia tras el aterrizaje, y cualquier prueba ortostática.
- Los periodos con fiebre, con síntomas activos o con un padecimiento ligado en AMARILLO o ROJO.
- La falta de sueño sostenida, la pérdida de masa y el declive cognitivo (δ = 0 para esas variables).
- Los valores bajo un fármaco que altera la variable.
- Las mediciones N4 (cuffless, PR/QTc experimentales, salidas de modelos de eco) y las SIMULADAS.

---

## (f) Umbrales del semáforo

Todos los cortes de esta sección son **provisionales** salvo donde se cita la fuente. Ninguno está validado en astronautas.

### f.1 Regla común

**AMARILLO** si se cumple al menos una:

| # | Condición | Justificación |
|---|---|---|
| A1 | T_p ≥ 3, con al menos una liga activa que no sea de contexto o predisposición | 3 = una variable de peso máximo totalmente activada, o varias menores [P·S2] |
| A2 | ΔL_p ≥ ln 3 ≈ 1.10 | [P·S2]. Con las cifras actuales lo alcanzan solo Taggar (5.1) y PHQ-9 (7.3) |
| A3 | Se cumple un criterio publicado de d.1 en una liga de peso ≥ 2 | Criterio con fuente; si la medición es N4 el texto dice «confirmar» |
| A4 | Deriva (e.5) en una liga de peso ≥ 2 | [P·S2] |
| A5 | Una capa fija supera su propio criterio publicado presente en las tablas (hoy: PHQ-9 ≥ 10; definición de AMS de Lake Louise) | El padecimiento no puede mostrarse VERDE; se etiqueta «por capa fija [terrestre]» |

**ROJO** si se cumple al menos una, **y** al menos una liga activa no es N4:

| # | Condición | Justificación |
|---|---|---|
| R-1 | T_p^inf ≥ 2 **y** persiste ≥ 24 h (o se repite en la siguiente medición programada) | Persistencia de [IP§d]; el corte 2 es [P·S2] |
| R-2 | Límite inferior de ΔL_p ≥ ln 10 ≈ 2.30 | [P·S2]. Ningún LR terrestre aislado de las tablas lo alcanza: hace falta evidencia concordante |
| R-3 | Evento centinela informado por una persona | Lista por decidir con el equipo; candidatas: `04:A37` (síntomas de DCS tipo II), `01:V55` (trombo visible). **Sin fuente** [P·S2] |

**VERDE** solo si no hay condición de AMARILLO ni de ROJO **y** la cobertura es suficiente (g.3). En otro caso, **GRIS** («evidencia insuficiente»).

Las reglas R1–R5 de demostración y la FEVE no intervienen (a.6). El 40 % de R1 no se usa como umbral.

### f.2 Particularidades por padecimiento

«Peso en vuelo» = suma de pesos de las ligas con `medido_en_vuelo = sí en vuelo` sobre el total [PV]. «Núcleo» = ligas de peso 3.

| ID | Criterio con fuente utilizable | Canal bayesiano · prior | Capa fija | Peso en vuelo / total · núcleo en vuelo | Nota |
|---|---|---|---|---|---|
| P01 | QTc (Rautaharju) | Taggar, solo con lectura humana · sin prior | — | 16/21 · 2 de 2 | Con solo el adaptador ECG: AMARILLO o GRIS, nunca VERDE ni ROJO |
| P02 | Caída ≥ 20/10 mmHg; FC +≥ 30 lpm | McGee · Meck 2001 (solo POST) | — | 5/24 · 0 de 1 | En vuelo es GRIS estructural: solo vigila desacondicionamiento con indicadores indirectos |
| P03 | Bandas de SpO2 y FR de NEWS2 | — · sin prior | NEWS2, Lake Louise | 16/16 · 3 de 3 | Law 2014 no se usa aquí (corrección 2). SpO2 de muñeca (N2) no da ROJO sin confirmación |
| P04 | — | Call 2005 · Crucian 2016 | NEWS2, qSOFA, Centor | 39/41 · 1 de 1 | R3 envuelta: FC nocturna con la base de (e) |
| P05 | — (el «< 6 h» de `03:V31` es definición de la variable, nivel C) | — · sin prior | — | 42/51 · 3 de 4 | DLMO no medible en vuelo; aMT6s se analiza en tierra |
| P06 | Cognition ≤ −1.5 DE (NASA) | — · sin prior | — | 36/49 · 2 de 2 | Único corte de cognición con fuente NASA |
| P07 | CO2: media de 7 días ≥ 2.5 mmHg (Law) | Law (continuo) · ancla propia | — | 24/24 · 2 de 2 | Las cefaleas a 2.8–4.5 mmHg de TB-004 son anecdóticas. Grupo de cefalea: cuenta una vez |
| P08 | — | — · sin prior (sin casos) | — (REMM no se implementa: el tiempo al vómito se confunde con P16) | 23/28 · 2 de 2 | No ha habido eventos ni hay registro de síntomas [VMA] |
| P09 | PHQ-9 ≥ 10 | Kroenke · sin prior | PHQ-9 | 21/43 · 0 de 1 | PHQ-9 sin uso documentado en astronautas |
| P10 | — | — · no derivable | Conkin (inactivo) | 14/16 · 2 de 2 | Todo es nivel C: ROJO exige dos ligas de peso 3 independientes o un centinela |
| P11 | — | — · 1/11 (Marshall-Goebel) | Constans (analogía) | 17/25 · 2 de 3 | D-dímero no disponible a bordo |
| P12 | — | — · 18 % (MTB-001) | — | 30/44 · 5 de 5 | Sin LR de síntomas |
| P13 | — | McGee (solo pre-post) · no derivable | STONE (sin total) | 41/50 · 5 de 6 | Parte de la química de orina se analiza al regreso [VMA]: ver F6 |
| P14 | — | — · sin prior | — | 14/32 · 0 de 3 | GRIS estructural en vuelo: no hay densitometría a bordo |
| P15 | — | — · sin prior | — | 20/34 · 2 de 4 | — |
| P16 | — | — · 57/85 (Davis 1988), solo VT | — | 6/10 · 1 de 1 | Criterios JSC no publicados |
| P17 | — | — · sin prior | — | 14/19 · 1 de 2 | — |
| P18 | — | — · sin prior | — | 12/17 · 1 de 1 | — |
| P19 | — | — · sin prior | — | 20/20 · 2 de 2 | — |
| P20 | — | — · sin prior | — | 14/19 · 3 de 4 | Criterios clínicos (ADA) sin fuente en las tablas |

### f.3 Histéresis y texto de salida

- Bajar de AMARILLO a VERDE: dos evaluaciones seguidas (o 48 h) sin condición activa [P·S2]. Bajar de ROJO: además, acuse de una persona.
- Toda salida AMARILLA o ROJA lleva: las ligas que aportaron (variable, valor, nivel de calidad, peso y nivel de evidencia), lo que faltó, las etiquetas [terrestre] / [experimental] / SIMULADO, y la frase «No es un diagnóstico. Se recomienda revisión por el cirujano de vuelo».
- **No se muestra ningún porcentaje de probabilidad.** ℓ_p es interno y solo sirve para ordenar: primero por color, luego por T_p^inf y, a igualdad, por ℓ_p cuando el prior tiene fuente.

---

## (g) Datos faltantes y variables solo pre/post o solo análogo

### g.1 Regla general

No se imputa ningún valor clínico. Una liga sin dato vigente es NA: no suma 0, no entra en T_p y reduce la cobertura. El último valor conocido se muestra con su antigüedad, pero no es evidencia fuera de su vigencia.

### g.2 Tipos de ausencia

| Estado | Definición | Efecto |
|---|---|---|
| F1 No medido en esta ventana | La variable es medible en la fase actual, pero no hay dato vigente | NA; baja la cobertura |
| F2 `sin_dato: <motivo>` | El adaptador corrió y no pudo calcular (p. ej. bandera con pocos segmentos) | Como F1; se conserva el motivo |
| F3 Solo pre/post | `medido_en_vuelo = solo pre-post vuelo` (50 ligas). Ejemplos: DXA de P14, pruebas ortostáticas de P02, `01:V35` | En vuelo es **ausencia estructural**: sale del denominador de la cobertura de vuelo y se informa aparte. En PRE y POST se evalúa normal |
| F4 Solo análogo | 12 ligas; también `01:V18` (FEVI) | No se espera. Si llega un dato (p. ej. de un modelo de eco) entra como N4 |
| F5 No / no encontrado | 33 ligas (p. ej. DLMO `03:V45`, PHQ-9 `03:V1`) | No se espera ni penaliza. Si alguien lo captura, entra como N3 |
| F6 Pendiente de análisis en tierra | Muestra tomada en vuelo y analizada al regreso ([VMA] cuenta esto como «sí en vuelo») | NA en vuelo. Hace falta una columna de latencia que hoy no existe [P·S17] |
| F7 Vencido | Dato más viejo que su vigencia | NA; se muestra como «último conocido» |

Vigencias, todas provisionales [P·S18]: signos continuos, 24 h; diarios y síntomas, 48 h; pruebas cognitivas, hasta la siguiente aplicación programada (el RST se hace cada 4 días [PREC]); eco, 72 h (R4 envuelta, valor de demostración); laboratorio, hasta la siguiente muestra.

### g.3 Cobertura y estado GRIS

`Cob_p = Σ (μ_pv de las ligas con dato vigente N1–N3) / Σ (μ_pv de las ligas medibles en la fase actual)`

VERDE exige las dos condiciones [P·S19]:

1. Cob_p ≥ 0.5;
2. al menos una liga del núcleo (peso 3) con dato vigente N1–N3.

Si no se cumplen y no hay alerta, el estado es **GRIS** con el motivo: «faltan X, Y» o «estructural: el núcleo solo existe pre/post». Un padecimiento en AMARILLO o ROJO con cobertura baja conserva su color y añade «cobertura baja».

Para dar idea de lo que se ignora, se informa también `T_p^máx = T_p + Σ μ_pv de las ligas medibles sin dato`: el valor que tendría T_p si todo lo no medido estuviera activado.

---

## (h) Plan de validación

Ningún resultado de este plan es una validación espacial. En esta etapa **no se entrena ni se ajusta ningún peso de los modelos de eco**.

### h.1 Brazo 1: datos terrestres públicos

Solo datos de acceso abierto, sin registro ni aceptación de términos. Quedan fuera el conjunto EchoNet-Dynamic, LSAH, LSDA y OSDR controlado.

| Objeto | Datos | Métricas | Regla |
|---|---|---|---|
| Picos R | Registros de PhysioNet **no usados** para elegir la v2 (otros de mitdb y afdb) | Sensibilidad y VPP con tolerancia de 150 ms (la del contrato) | Umbrales congelados antes de mirar los registros; separación por registro, no por segmento |
| Bandera de ritmo irregular | Los mismos, más registros de ritmo sinusal y de FA de otras bases abiertas de PhysioNet (condición de acceso por verificar antes de usarlas) | Sensibilidad, especificidad y VPP por segmento y por registro; falsas alarmas por 24 h en ritmo sinusal | Las cifras de 100/201/203/04015 no cuentan: no son independientes [INV] |
| Criterio RR de prematuridad | Registros con anotación de latido | Sensibilidad y VPP; se informa por separado supraventricular y ventricular para documentar que no los distingue | — |
| FC y HRV | Latidos anotados frente a detectados | Sesgo y límites de acuerdo | Comparar con el margen de [PREC] (±5 lpm) |
| PR y QTc | Solo si existe una base abierta con anotación de inicio y fin de ondas (por verificar) | Sesgo y límites de acuerdo | Mientras no se haga, siguen en N4 |
| Semáforo de P01 | Etiqueta por registro (FA presente o no) | Matriz de confusión color × etiqueta y fracción de registros con FA en cada color | Es una comprobación de consistencia del color, no una calibración de probabilidades |
| Demás padecimientos | No hay datos abiertos con etiqueta | Solo verificación por construcción: casos resueltos a mano como los de d.7 | Se declara como hueco |
| Modelos de eco | Solo las muestras ya incluidas en `prototipo/samples`, cuando existan pesos en la PC de Iker | Comprobaciones técnicas: rechazo por modalidad y vista, repetibilidad, estadísticos de discrepancia (R2) | No hay referencia clínica: siguen en N4 |

### h.2 Brazo 2: tripulación SIMULADA

Datos sintéticos **sin relación fisiológica real** (variables independientes con ruido alrededor de medias arbitrarias), siempre con `simulated = true` y la etiqueta **SIMULADO** en toda salida. Solo prueban el flujo.

| # | Escenario SIMULADO | Resultado esperado |
|---|---|---|
| 1 | Todo dentro de la base, cobertura completa | VERDE |
| 2 | Falta el núcleo de un padecimiento | GRIS, no VERDE |
| 3 | Fila con `sin_dato` | Se trata como faltante, nunca como 0 |
| 4 | Salto brusco en una variable | Alerta; la media adaptativa **no cambia** |
| 5 | Rampa lenta | Señal del CUSUM; tope del EWMA; la base prevuelo intacta |
| 6 | Dato N4 (cuffless, bandera, salida de eco) | No actualiza la base; no produce ROJO; no respalda VERDE |
| 7 | Intento de escribir la base prevuelo | Rechazado; queda registro |
| 8 | Puntos previos a una alerta, dentro de la cuarentena | Excluidos hacia atrás |
| 9 | Cambio de fase | Periodo sin aprendizaje; δ solo en las variables permitidas |
| 10 | Toda la tripulación se desvía a la vez | Etiqueta «desviación compartida»; ninguna alerta individual se apaga; ninguna base cambia |
| 11 | Tripulación de 3 | Capa 3 inactiva |
| 12 | Capa fija sin una entrada | «Incompleto: falta X» |
| 13 | Dos modelos con FEVE discordante | Métrica «discordante»; no activa nada |
| 14 | Filas simuladas mezcladas con reales | El semáforo real no cambia |

Métricas: cumplimiento de los invariantes de e.1 (sí/no) y, sobre las anomalías inyectadas, retraso de detección y tasa de alertas sin anomalía. Estas cifras dependen del ruido elegido y **no se pueden trasladar** a personas reales.

---

## (i) Supuestos abiertos

| # | Supuesto | Dónde |
|---|---|---|
| S1 | Generalizar el −1.5 DE de NASA Cognition a otras variables como inicio de la rampa y como corte de «estable» y de «desviación aislada» | c.4, c.5, d.1, e.2 |
| S2 | Umbrales del semáforo: T ≥ 3; T^inf ≥ 2; ln 3 y ln 10; lista de centinelas; histéresis; suponer normalidad para traducir p < 0.01 a 2.33/2.58 | c.5, f |
| S3 | α = 0.1 del EWMA; tope de 1.5 DE; CUSUM con k = 0.5 y h = 5 | e.3, e.5 |
| S4 | Duración de la fase temprana (30 días) y de los periodos sin aprendizaje (72 h); cuarentena de 72 h; lista de variables con adaptación esperada (δ ≠ 0) | e.2, e.4 |
| S5 | DE dentro y entre personas: solo hay cifra para FC de reloj (Quer); el resto se estima con la propia tripulación | c.3 |
| S6 | Tamaños mínimos de tripulación (4 y 7) y la fracción «la mitad» para la desviación compartida | c.4 |
| S7 | Usar prevalencias de misión como log-odds previas; tasa constante para P04. Sin prior utilizable en P01, P03, P05, P06, P08–P10, P13–P15 y P17–P20 | d.5 |
| S8 | Incertidumbre del ln LR tomada de σ/μ de la liga; aproximación normal e independencia entre grupos para el intervalo de T | d.2, d.4 |
| S9 | Aplicar LR terrestres a padecimientos más amplios (PHQ-9 → P09; gripe → P04); definición provisional de fiebre (> 37.3 °C); lectura del ancla de Law 2014 y su unidad de tiempo | d.2 |
| S10 | Clasificación de la columna `direccion` (texto libre) de las 348 ligas, incluidas las de contexto o predisposición | d.1 |
| S11 | Grupos de correlación más allá de los dos declarados en [PAD] | d.3 |
| S12 | `latidos_irregulares` no distingue supraventricular de ventricular: se le da el peso menor (2, C); extrapolar conteos a 24 h | a.2, c.1 |
| S13 | Tratar la FC del adaptador `ecg` como «alta» por analogía con la prenda ECG de Villar 2015; tratar la lectura humana de ECG y el oxímetro de dedo como referencia sin cifra propia | b.3 |
| S14 | Formas de distribución: media normal a cada lado para la FC; lognormal para la HRV; RMSSD como proxy de «↓ HF»; sin ajuste por edad en HRV ni por edad/IMC en temperatura | c.2 |
| S15 | Signo y sentido de GLS sin comprobar con una inferencia real; que LVSV, LVEDV y LAVol de un modelo sean comparables con el método de vuelo o con la resonancia (cm³ y mL sí son la misma unidad) | a.2, c.6 |
| S16 | Mediana entre modelos y tolerancia de 10 puntos para la FEVE; precedencia de vistas | a.5 |
| S17 | Falta una columna de latencia (tiempo real frente a análisis en tierra) en [VMA] | g.2 |
| S18 | Vigencia de cada tipo de dato, incluidas las 72 h del eco | g.2 |
| S19 | Cobertura mínima de 0.5 y exigencia de una liga del núcleo para VERDE | g.3 |
| S20 | Frecuencia de evaluación, agregación diaria por mediana y regla de duplicados | 0, b.1, c.1 |

Hechos que limitan todo lo anterior (no son parámetros, pero deben quedar a la vista):

1. **Los modelos de eco no tienen ninguna inferencia real** y `01:V18` (FEVE) no tiene ligas: hoy la FEVE no influye en ningún semáforo.
2. La bandera de ritmo es una reimplementación **incompleta** de Dash 2009 (sin la rama de RR omitidos) y sus cifras no son una validación independiente. PR y QTc no están validados.
3. **Ningún puntaje publicado está validado en microgravedad**, y ningún wearable tampoco.
4. No existen pesos por síntoma derivados en vuelo; 308 de las 348 ligas son de nivel C.
5. El modelo de Conkin no se puede calcular: faltan sus variables.
6. NEWS2, qSOFA y Centor quedan «incompletos» con la lista actual de variables.
7. Los parámetros de R1–R5 siguen siendo de demostración.
8. No se usó ningún dato individual de astronautas (LSAH, LSDA y OSDR son de acceso controlado).

---

## Límites

Este sistema **no diagnostica**. Ordena qué revisar primero, dice con qué datos lo hace y cuáles faltan, y en toda alerta recomienda consultar al cirujano de vuelo. Un VERDE significa «sin desviaciones en lo que se midió, con cobertura suficiente», no «sano»; un GRIS significa «no hay con qué opinar». Los colores no son probabilidades: salen de pesos de nivel mayoritariamente C, de cifras terrestres y de umbrales provisionales, y ninguno está validado en vuelo espacial. Las salidas de los modelos de eco y las banderas del ECG son resultados de investigación. Todo dato sintético aparece como **SIMULADO** y no interviene en ninguna decisión ni aprendizaje.
