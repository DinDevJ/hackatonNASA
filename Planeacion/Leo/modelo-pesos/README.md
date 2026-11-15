# Pesos fisiológicos + actualización bayesiana

Paquete para adaptar los pesos de las variables a cada malestar espacial con **actualización bayesiana**.
Fundamentos y contexto: [../modelo-predictivo-fundamentos.md](../modelo-predictivo-fundamentos.md) (secciones 1 a 8).

✅ DOI verificado en doi.org y Crossref (14-11-2026) · 🔶 decisión o juicio nuestro

## Archivos

| Archivo | Qué es |
|---|---|
| [pesos.csv](pesos.csv) | **99 celdas** (11 malestares × 9 variables): peso 0–3, dirección, mecanismo, nivel de evidencia, referencia con DOI y prior bayesiano. Se abre en Excel |
| [pesos.json](pesos.json) | Lo mismo en JSON, más la lista de referencias |
| [generar_pesos.py](generar_pesos.py) | **Fuente de verdad**: aquí se editan los pesos y se regeneran el CSV y el JSON |
| [actualizacion_bayesiana.py](actualizacion_bayesiana.py) | Implementación de referencia en Python puro (sin dependencias) con una demostración |

```bash
python generar_pesos.py            # regenera pesos.csv y pesos.json
python actualizacion_bayesiana.py  # demostración con datos simulados
```

## Columnas de la tabla

| Columna | Significado |
|---|---|
| `peso_fisiologico` | 0 sin vía fisiológica (se descarta) · 1 marcador asociado · 2 eslabón causal directo · 3 la variable **es** el mecanismo |
| `direccion` | Hacia dónde se mueve la variable en el malestar (↑, ↓, "irregular", "al ponerse de pie") |
| `nivel_evidencia` | **A** relación medida con número · **B** mecanismo documentado en una fuente · **C** juicio fisiológico del equipo, sin fuente directa |
| `referencia`, `doi`, `url` | Fuente verificada (vacía en nivel C) |
| `prior_media`, `prior_de` | Prior Normal del peso. La desviación depende de la evidencia: **A 0,5 · B 1,0 · C 1,5**; peso 0 → 0,5 |

**Recuento:** 54 celdas con peso (11 A · 14 B · 29 C) y 45 descartadas. **Más de la mitad de los pesos son
juicio nuestro (C)**: por eso tienen el prior más ancho, para que los datos los puedan corregir.

## Modelo matemático

Para cada malestar *m* y cada día:

1. **Desviación personal.** Cada variable se convierte en z contra la línea base de la persona (z robusto con
   mediana y MAD móviles, el motor de Julio).
2. **Puntos** (como las escalas de alerta temprana MEWS/NEWS), solo en la dirección fisiológica:
   `x_v = 0 si |z|<1 · 1 si 1–2 · 2 si 2–3 · 3 si >3`
3. **Probabilidad del malestar** (regresión logística):

   `η = β₀ + Σ_v β_v · x_v`  y  `P(malestar) = σ(η) = 1 / (1 + e^(−η))`

4. **Prior** a partir de la tabla, con escala κ = ln(20)/9 ≈ 0,333 (peso 3 con desviación extrema ⇒ momios × 20):

   `β_v ~ Normal(κ · prior_media_v, (κ · prior_de_v)²)`
   `β₀ ~ Normal(logit(p₀), 1)`, con p₀ = probabilidad basal diaria del malestar (por ejemplo, desde la incidencia
   de Crucian et al. 2016, [doi:10.2147/IJGM.S114188](https://doi.org/10.2147/IJGM.S114188))

5. **Actualización con datos etiquetados** (días con y sin malestar), por aproximación de Laplace:

   `β̂ = argmax Σ [y log σ(η) + (1−y) log(1−σ(η))] − ½ (β−μ)ᵀ Σ⁻¹ (β−μ)`
   `Σ_post = (Xᵀ W X + Σ⁻¹)⁻¹`, con `W = diag(p(1−p))`

6. **Aprendizaje secuencial:** el posterior `Normal(β̂, Σ_post)` es el prior de la siguiente actualización.
7. **Selección de variables:** `P(β_v > 0)` del posterior. Si es baja (🔶 por ejemplo < 0,5), la variable se puede
   dejar de lado para ese malestar.

### Resultado de la demostración (datos simulados, malestar 4: infección)

| Variable | Peso inicial | Peso actualizado | "Verdad" simulada | P(efecto) |
|---|---:|---:|---:|---:|
| FC en reposo | 2,00 | 2,36 | 2,6 | 1,000 |
| Temperatura | 3,00 | 2,97 | 3,0 | 1,000 |
| Presión arterial | 1,00 | 0,59 | 0,0 | 0,972 |
| PVT | 0,00 | −0,30 | 0,0 | 0,122 |
| CO₂ de cabina | 0,00 | −0,09 | 0,0 | 0,371 |

Con 600 días simulados el modelo se acerca a la verdad, pero **el prior todavía pesa** (la presión arterial no
llega a 0). Con menos datos, el prior fisiológico domina; con más, mandan los datos.

## Ideas para tu compañero

- **Sin etiquetas** (lo normal hoy) solo se adaptan las líneas base y "lo normal de la tripulación"; los pesos
  quedan en su prior. Con etiquetas (de análogos o de vuelo) se actualizan los pesos.
- **Pesos que cambian con el tiempo:** añadir un paso de olvido entre actualizaciones (`Σ ← Σ + Q`, filtro de
  Kalman) para que el modelo se adapte a cada fase de la misión.
- **Jerárquico por persona:** compartir los pesos entre tripulantes, pero con una variación individual pequeña.
- **Análisis de sensibilidad:** cambiar cada peso C en ±1 y ver si cambian las alarmas.
- Ajustar κ y los niveles de desviación (A 0,5 · B 1,0 · C 1,5) son decisiones 🔶 nuestras: hay que justificarlas
  o variarlas.

## Limitaciones

- Los nombres de la columna `riesgo_nasa` son **aproximados**; hay que cotejarlos con la lista oficial de riesgos del HRP.
- Ningún peso está validado en astronautas, salvo CO₂ → cefalea (nivel A, Law et al. 2014).
- La HRV no está porque el reloj del equipo no envía intervalos RR.

## Referencias usadas en la tabla (todas ✅)

| Clave | Referencia | DOI |
|---|---|---|
| PEREZ2019 | Perez et al. 2019, NEJM — fibrilación auricular por reloj | [10.1056/NEJMoa1901183](https://doi.org/10.1056/NEJMoa1901183) |
| LEE2015 | Lee et al. 2015 — intolerancia ortostática tras la ISS | [10.3357/AMHP.EC08.2015](https://doi.org/10.3357/AMHP.EC08.2015) |
| GALLO2020 | Gallo et al. 2020 — modelo del desacondicionamiento cardiovascular | [10.1038/s41526-020-00117-5](https://doi.org/10.1038/s41526-020-00117-5) |
| NEWS2013 | Smith et al. 2013 — NEWS | [10.1016/j.resuscitation.2012.12.016](https://doi.org/10.1016/j.resuscitation.2012.12.016) |
| MEWS2001 | Subbe et al. 2001 — MEWS | [10.1093/qjmed/94.10.521](https://doi.org/10.1093/qjmed/94.10.521) |
| MISHRA2020 | Mishra et al. 2020 — infección detectada por reloj | [10.1038/s41551-020-00640-6](https://doi.org/10.1038/s41551-020-00640-6) |
| ALAVI2022 | Alavi et al. 2022 — alertas en tiempo real | [10.1038/s41591-021-01593-2](https://doi.org/10.1038/s41591-021-01593-2) |
| CRUCIAN2016 | Crucian et al. 2016 — incidencia de síntomas en vuelo | [10.2147/IJGM.S114188](https://doi.org/10.2147/IJGM.S114188) |
| BARGER2014 | Barger et al. 2014 — sueño en astronautas | [10.1016/S1474-4422(14)70122-X](https://doi.org/10.1016/S1474-4422(14)70122-X) |
| BASNER2011 | Basner y Dinges 2011 — PVT | [10.1093/sleep/34.5.581](https://doi.org/10.1093/sleep/34.5.581) |
| LAW2014 | Law et al. 2014 — CO₂ y cefalea en la ISS | [10.1097/JOM.0000000000000158](https://doi.org/10.1097/JOM.0000000000000158) |
| BASNER2013 | Basner et al. 2013 — sueño en Mars-500 | [10.1073/pnas.1212646110](https://doi.org/10.1073/pnas.1212646110) |
| BASNER2014 | Basner et al. 2014 — psicología en Mars-500 | [10.1371/journal.pone.0093298](https://doi.org/10.1371/journal.pone.0093298) |
| PNAS2026 | Invernada antártica, PNAS 2026 | [10.1073/pnas.2533420123](https://doi.org/10.1073/pnas.2533420123) |
| PALINKAS2008 | Palinkas y Suedfeld 2008 — expediciones polares | [10.1016/S0140-6736(07)61056-3](https://doi.org/10.1016/S0140-6736(07)61056-3) |
| MG2019 | Marshall-Goebel et al. 2019 — trombosis yugular | [10.1001/jamanetworkopen.2019.15011](https://doi.org/10.1001/jamanetworkopen.2019.15011) |
| LEE2020 | Lee et al. 2020 — SANS | [10.1038/s41526-020-0097-9](https://doi.org/10.1038/s41526-020-0097-9) |

Métodos estadísticos (lasso adaptativo, modelos mixtos, EWMA, CUSUM, Isolation Forest, transferencia) y sus DOI:
ver [../modelo-predictivo-fundamentos.md](../modelo-predictivo-fundamentos.md) §4.
