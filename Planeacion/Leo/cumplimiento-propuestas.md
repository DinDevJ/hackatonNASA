# ¿Cumplimos lo que pide el equipo? — revisión contra lo que subió Julio

Revisado tras el `pull` del 14-11-2026 (20 commits nuevos de Julio, Katy, Iker y Diana).

✅ cumple · 🟡 parcial · ❌ no cumple · 🔶 decisión nuestra

## 1. Checklist de la asignación (ahora son 8 puntos)

Julio quitó el punto "seleccioné 5–10 candidatas" (commit `12f948f`).

| # | Punto | Estado | Dónde |
|---|---|---|---|
| 1 | Revisé mis variables y su significado | ✅ | [tabla-investigacion.csv](tabla-investigacion.csv), 78 filas |
| 2 | Unidades y método de medición | ✅ | Columnas `unidad`, `metodo_captura` |
| 3 | Fuentes primarias y criterios de referencia | ✅ | 53 de 54 fuentes verificadas (`ingesta/out/fuentes-verificadas.json`) |
| 4 | Datasets reales y licencias | ✅ | MMASH (ODbL), CGMacros (CC BY-NC-SA), DeepACSA (Apache-2.0), USDA |
| 5 | Directa, cálculo o estimación | ✅ | Campo `naturaleza_dato` en cada lectura |
| 6 | Modelos preentrenados que de verdad corran | ✅ | DeepACSA, ejecutado y reproduciendo sus resultados publicados |
| 7 | Limitaciones en vuelo y validez clínica | ✅ | [clasificacion-medicion.md](clasificacion-medicion.md), [resumen-final.md](resumen-final.md) |
| 8 | Instrucciones reproducibles | ✅ | [ingesta/README.md](ingesta/README.md): `npm run descargar`, `tipoA`, `tipoB`, `tipoC` |

La tabla de investigación ya no tiene ningún campo `PENDIENTE`.

## 2. Convenciones de Julio

| Convención | Estado |
|---|---|
| Marcas ✅ ⚠️ 🔶 | ✅ En todos mis documentos |
| Umbral **[A]** NASA / **[T]** terrestre | ✅ Campo `validacion_umbral` (`NASA_A` / `CLINICO_T` / `SIN_UMBRAL`) |
| **Escalera de obtención** N0–N4 / NT: "cada valor en pantalla lleva su nivel" | 🟡 El nivel está por variable en `out/clasificacion-variables.json` y en [listado-78-variables.md](listado-78-variables.md). **No va dentro de cada lectura** porque el contrato no tiene ese campo; la app lo une por `id` |
| Origen y grupos G1–G9 | ✅ [listado-78-variables.md](listado-78-variables.md) |
| Duplicados entre catálogos ([DUPLICADOS.md](../variables-diagnostico/DUPLICADOS.md)) | ✅ `02:V75` masa corporal **fusionada en `01:V8`** de Julio (aceptado por Leo); su contenido se trasladó allí |

## 3. Módulos de EVA donde aparece Leo (Propuesta-EVA de Katy, §9)

| # | Módulo | Qué aportan mis variables | Estado |
|---|---|---|---|
| 4 | Radiación | Nada: la radiación es de Fani | — |
| 8 | Salud mental y equipo | Sueño (V30–V43), cefalea | ✅ |
| 10 | **Nutrición, hidratación y ejercicio** | 3035 kcal (V81), sodio 1500–2300 (V83), masa −3,3 % (ahora en `01:V8` de Julio), ARED/T2/CEVIS (V44, V54, V55), fuerza ≥ 80 % (V40, V43) | ✅ (hidratación es de Fani) |
| 11 | Salud femenina y diferencias por sexo | **Revisión por sexo de músculo, metabolismo y sueño** | ❌ **No hecha**: es análisis, no ingesta |
| 12 | Juego cooperativo | Ninguna variable; es diseño | — |
| 14 | Cómo se muestra el riesgo | Las variables llevan su tipo de umbral para los 3 tipos de estimación | 🟡 Los datos están listos; la pantalla no es de esta capa |
| 21 | Pruebas de transición de gravedad | V69–V72 (posturografía, tándem, Romberg, funcionales) como formularios de posvuelo | ✅ |
| 22 | Hardware real | Adaptador del HUAWEI WATCH 5 + DeepACSA para ultrasonido | ✅ |

## 4. Lo que pide el reto (síntesis de Julio, §5–§6)

| Pide | Estado |
|---|---|
| **Glucosa** entre los indicadores, "capturarla manual y decir por qué" | ✅ CGM (V92), formularios V86–V91 y glucosa capilar real con glucómetro |
| **Entrada por cámara** (foto, ultrasonido, código de barras) | ✅ Ultrasonido con modelo (V47); foto de manos y uñas (V96); comidas (V81) |
| **No diagnosticar** | ✅ La capa solo recaba y normaliza; no hay análisis clínico |
| Línea base individual | ✅ Preparado: lecturas por sujeto con fecha; la línea base la calcula el motor de Julio |
| HUAWEI WATCH 5 como dispositivo real | ✅ Ver [reloj-huawei-watch5.md](reloj-huawei-watch5.md) |

## 5. Lo que hay que resolver antes de subir

1. ~~Duplicado de masa corporal~~ ✅ Resuelto: fusionada en `01:V8`.
2. **Revisión por sexo (módulo 11)**: queda pendiente; no es parte de la ingesta.
3. **USDA**: hierro, sodio y calcio siguen en `null` hasta que pase el límite de la API.
