# Motor de padecimientos: diseño e interfaces

Implementa `ALGORITMOS.md` (especificación normativa del equipo, 14 nov 2026). Este archivo fija las
interfaces entre módulos y las decisiones de implementación donde la especificación deja margen.
**Nada es un diagnóstico.** Todo número marcado [P] en la especificación es **provisional** y debe quedar
rotulado `provisional` en código, JSON, CSV y UI. Solo `numpy`, `pandas` y la biblioteca estándar (no hay scipy).

## 1. Módulos

| Archivo | Contenido |
|---|---|
| `motor/parametros.py` | Constantes provisionales (cada una con `valor`, `provisional`, `supuesto` S1–S20, `descripcion`); umbrales editables; lectura y escritura de `datos/modelo/overrides.json` |
| `motor/tablas.py` | Carga `datos/modelo/PADECIMIENTOS.csv` y `PADECIMIENTO-VARIABLE.csv` (copias de las tablas con fuente, nunca se escriben), aplica overrides, clasifica `direccion` (S10), criterios publicados (d.1), las 6 ligas con LR/OR (d.2), priors (d.5), grupos de correlación (d.3), capas fijas (d.6) |
| `motor/calidad.py` | Puerta de calidad G0–G7, mapeo métrica → `variable_id` (a.2, a.4), clase de dispositivo, nivel N0–N4, vigencia |
| `motor/entradas.py` | Lee `outputs/raw/*/` (runs guardados), sensores (`sensores/importador.py`) y el CSV nativo del motor (dataset SIMULADO); devuelve observaciones (§3) |
| `motor/simulador.py` | Genera la tripulación **SIMULADA** en `datos/simulado/` |
| `motor/normalizacion.py` | Agregación diaria, z poblacional (c.2), base personal y z (c.3), delta de tripulación (c.4), estado de variable (c.5) |
| `motor/calibracion.py` | Base prevuelo inmutable, EWMA protegido, CUSUM, cuarentena, persistencia JSON (e) |
| `motor/score.py` | Activación (d.1), canal de pesos T_p con incertidumbre (d.3, d.4), canal bayesiano (d.2, d.5), cobertura (g.3) |
| `motor/semaforo.py` | Reglas A1–A5, R-1..R-3, VERDE/GRIS, histéresis, orden y texto (f) |
| `motor/evaluacion.py` | Orquesta el orden de cálculo de §0 de la especificación y devuelve el resultado (§5) |

Rutas: siempre relativas a la raíz del prototipo (`Path(__file__).resolve().parents[1]`). Ningún archivo
entregable contiene rutas absolutas del equipo de desarrollo.

## 2. Vocabulario compartido

- **Canal**: `"real"` o `"simulado"`. Una fila con `simulated=true` solo existe en el canal simulado. Los dos
  canales **nunca** comparten bases, CUSUM, estadísticos de tripulación ni semáforo. El canal simulado tiene su
  propio almacén de calibración (un «cajón de arena» rotulado SIMULADO) para poder ejercitar el flujo de (h.2);
  el almacén real rechaza y registra cualquier punto simulado (invariante e.1.4).
- **Nivel de calidad** (`nivel`): `"N0"`, `"N1"`, `"N2"`, `"N3a"` (baja por evidencia: baja un escalón),
  `"N3b"` (precisión no evaluada: nivel de la tabla), `"N4"`.
- **Fase**: `"PRE"`, `"VT"`, `"VTa"`, `"POST"`. Sin lanzamiento declarado todo es `PRE` («sin misión declarada»).
- **Colores**: `"VERDE"`, `"AMARILLO"`, `"ROJO"`, `"GRIS"`.
- **Clase de dispositivo** (`clase_dispositivo`), vocabulario cerrado definido en `calidad.py`:
  `ecg_adaptador`, `ecg_prenda_holter`, `lectura_humana_ecg`, `palpacion_pulso`, `reloj_ppg`, `oximetro_dedo`,
  `spo2_muneca`, `bandas_toracicas`, `conteo_manual`, `termometro_oral`, `temp_piel`, `temp_central_estimada`,
  `manguito_validado`, `manguito_sin_validar`, `cuffless`, `actigrafia`, `sueno_etapas_consumo`, `pvt_laptop`,
  `pvt_reloj`, `prueba_cognitiva`, `analizador_cabina`, `cuestionario_phq9`, `autorreporte`, `diario`,
  `prueba_ortostatica`, `laboratorio`, `modelo_eco`, `captura_manual`, `desconocido`.
- **Método** (`metodo`, decide κ del canal bayesiano): `lectura_humana`, `cuestionario_completo`,
  `prueba_ortostatica`, `termometro`, `sensor_cabina` o vacío.

## 3. Observaciones (salida de la puerta; entrada del resto del motor)

`pandas.DataFrame` con exactamente estas columnas (`calidad.OBS_COLUMNAS`):

| Columna | Tipo | Significado |
|---|---|---|
| `subject_id` | str | Persona. Nunca se mezclan personas |
| `timestamp` | `pd.Timestamp` sin zona | Instante de la observación |
| `variable_id` | str o None | ID canónico del equipo (`01:V3`…). None = «sin variable de equipo» (se guarda, no puntúa) |
| `valor` | float | En la unidad canónica. NaN si `sin_dato`. Presencia: 1.0 presente, 0.0 ausente |
| `unidad` | str | |
| `clase_dispositivo` | str | §2 |
| `nivel` | str | §2 |
| `nivel_motivo` | str | Por qué ese nivel (texto corto) |
| `simulated` | bool | |
| `contexto` | str o None | `reposo`, `sueno`, `actividad`, `ejercicio`, `eva` |
| `metodo` | str o None | §2 |
| `decide` | bool | False = fila solo informativa (SDNN, diastólica, fracción de ventanas): se muestra, no puntúa |
| `calidad_buena` | bool | Calidad declarada buena por el adaptador o por quien captura (condición de aprendizaje para N3) |
| `vigencia_h` | float | Vigencia provisional [P·S18] en horas; NaN = sin vencimiento (laboratorio: hasta la siguiente muestra) |
| `z_pob_permitido` | bool | False si la medición no es comparable con la norma poblacional (p. ej. HRV con ventana ≠ 5 min) |
| `sin_dato` | str o None | Motivo del faltante (`sin_dato: …`). Un faltante **nunca** es 0 |
| `origen` | str | `outputs_raw`, `sensores`, `nativo` |
| `metric` | str | Métrica original |
| `quality` | str | `quality` original |
| `run_id` | str o None | |
| `etiquetas` | str | Separadas por `; ` (p. ej. `[experimental]; tasa extrapolada [P·S12]`) |
| `notas` | str | |

Las filas N0 se devuelven aparte (rechazadas, con motivo); no entran a `obs`.

### 3.1 CSV nativo del motor (dataset SIMULADO y captura manual)

Columnas: `subject_id,timestamp,variable_id,value,unit,device_class,quality,context,method,simulated,notes`.
`value` vacío ⇔ `quality` empieza por `sin_dato`. `device_class` del vocabulario de §2.

### 3.2 Misión y perfiles

`mision = {subject_id: {"lanzamiento": "YYYY-MM-DD" | None, "aterrizaje": "YYYY-MM-DD" | None}}`;
`perfiles = {subject_id: {"edad": int | None, "sexo": "M" | "F" | None}}`. Si faltan: fase PRE y rama
poblacional de FC/QTc inactiva (no se inventa edad ni sexo).

## 4. Decisiones de implementación (todas provisionales salvo que citen la especificación)

D1. **Agregación diaria** (c.1, G7): una observación por (persona, variable, día). Gana el mejor nivel
(N1 > N2 > N3a = N3b > N4); a igualdad, la clase con el `run_id`/timestamp más reciente. Valor = mediana de las
filas de esa clase y nivel ese día (variables de presencia: máximo). Solo filas con `decide=True` y sin `sin_dato`.
Si todas las filas del día son `sin_dato`, se conserva el motivo (ausencia F2).

D2. **Evaluaciones**: una por día natural, de la primera a la última fecha con datos de la persona; el estado
(media adaptativa, CUSUM, cuarentena, historial de color) avanza en orden cronológico. El motor es un
**recálculo determinista** sobre todas las observaciones; al final guarda el estado en JSON. Si el archivo ya
contiene una base **congelada**, esa base se usa tal cual y cualquier intento de reescribirla se rechaza y se
registra (invariante e.1.1). Los actos humanos (acuse de ROJO, cierre de revisión de CUSUM, versión nueva de
una base) se guardan en el mismo JSON con fecha y autor y se aplican en su fecha.

D3. **Vigencia en evaluaciones diarias**: un valor del día d es vigente el día D si `(D − d) < ceil(vigencia_h/24)`.

D4. **Base prevuelo** por (persona, variable, clase): puntos PRE admitidos (N1; N2 de su clase; N3 con
`calidad_buena`), en contexto estándar; se excluyen atípicos con z robusto (mediana/MAD) ≥ 2.58 [P·S5].
Se congela el primer día con fase ≠ PRE. Sin lanzamiento declarado la base es «provisional, no congelada».
- `s_w`: DE propia si n0 ≥ 5; si no, DE intra-persona combinada de la tripulación (misma variable y clase);
  para FC de reloj, 3 lpm (Quer 2020) si no hay otra; si no hay ninguna, rama personal inactiva.
- `s_b`: `s_pob` de c.2 si existe; si no, DE de las medias prevuelo de la tripulación (≥ 3 personas); si no hay,
  B = 0 (sin encogimiento) y se etiqueta.
- `m_ref`: media poblacional de c.2 o media prevuelo de la tripulación.
- `B`, `μ_i`, `s_i²` como en c.3. Piso: 3 rpm para `04:A2` (único con cifra). Si n0 < 5 y no hay referencia
  poblacional, la liga queda **NA** con motivo «sin base (n0 < 5) ni referencia poblacional» (no suma 0).
- Variables con transformación: `03:V17` se trabaja en ln(RMSSD) [P·S14].

D5. **δ_vφ = 0** para todas las variables en este prototipo (valor previo; la estimación con la tripulación de
e.4 no está implementada). Es la opción conservadora: una desviación sigue siendo desviación. Límite conocido.

D6. **Var(z)**: `1/n0 + z²/(2·(n0−1))` con n0 ≥ 2; con rama solo poblacional, 0 (se etiqueta).

D7. **Bandas ordinales** (SpO2, FR, PA): no se calcula z poblacional. Si el criterio publicado se cumple,
a = 1; si no, rampa con z personal; si no hay base personal, a = 0 con «criterio no cumplido; sin base personal
para la rampa» (dato vigente: cuenta para cobertura si es N1–N3).

D8. **Estado de variable para el aprendizaje**: «alertada» si alguna de sus ligas tiene u ≥ u1.

D9. **Episodio** (e.2): el día en que la persona tiene bandera de ritmo = 1, fiebre (> 37.3 °C [P·S9]),
contexto `eva`/`ejercicio`, un síntoma de presencia = 1 o un fármaco (`01:V42`, `03:V87`) presente, no se
aprende ninguna variable de esa persona.

D10. **Cuarentena**: un punto que cumple e.2 entra a una cola; se aplica al EWMA cuando han pasado 72 h sin
alerta posterior (variable alertada o padecimiento ligado en AMARILLO/ROJO); si la hay, se descarta y se
registra «excluido hacia atrás».

D11. **Persistencia R-1** con evaluaciones diarias: `T_inf ≥ 2` en la evaluación del día D y en la del día D−1.

D12. **Histéresis**: AMARILLO baja tras 2 evaluaciones seguidas sin condición; ROJO exige además acuse humano
(sin interfaz en este prototipo: queda ROJO «pendiente de acuse»).

D13. **Cobertura**: «medible en la fase»: en VT/VTa solo `sí en vuelo`; en PRE/POST además `solo pre-post
vuelo`. `solo análogo`, `no`, `no encontrado` nunca entran al denominador (F4, F5). Núcleo = ligas de peso 3
(peso efectivo). Sin núcleo medible en la fase → GRIS «estructural: el núcleo solo existe pre/post».

D14. **σ efectiva**: `prior_de` de la liga si el nivel no degrada; si degrada, `max(prior_de, σ del nivel
degradado)` con A = 0.5, B = 1.0, C = 1.5 [PAD]. N2 y N3a bajan un escalón; N4 fuerza C.

D15. **Capas fijas** (d.6): no cambian T_p ni ΔL_p. Solo PHQ-9 se calcula (necesita `03:V1` con
`metodo=cuestionario_completo`); las demás se informan «incompleto: falta X» o «inactivo» según la tabla d.6.

D16. **Sexo desconocido en QTc**: se evalúa ≥ 460 ms y ≤ 390 ms; entre 450 y 460 ms queda «indeterminado: falta sexo».

D17. **No se muestra ninguna probabilidad.** ℓ_p es interno y solo ordena.

D18. **Tripulación** (c.4): n = personas del mismo canal y fase con dato de esa variable ese día. Sin scipy:
la conversión t → z equivalente se hace con la CDF de la t por integración numérica y `statistics.NormalDist`.

## 5. Resultado de `evaluacion.evaluar(...)`

```python
evaluar(obs, *, tablas, params=None, mision=None, perfiles=None, canal="real",
        ruta_estado=None, guardar=True) -> dict
```

Devuelve un `dict` serializable a JSON:

```python
{
  "canal": "real" | "simulado", "simulated": bool, "etiqueta": "SIMULADO" | None,
  "provisional": True,
  "aviso": "No es un diagnóstico. Se recomienda revisión por el cirujano de vuelo.",
  "umbrales": {nombre: {"valor":…, "provisional": True, "supuesto": "S2", "modificado_por_usuario": bool}},
  "personas": {
    subject_id: {
      "simulated": bool, "fase": "PRE"|"VT"|"VTa"|"POST", "fecha_evaluacion": "YYYY-MM-DD",
      "fechas": ["YYYY-MM-DD", …],                       # todas las evaluaciones
      "padecimientos": [                                   # los 20, ordenados según f.3
        {"padecimiento_id", "padecimiento", "color", "motivo",   # motivo: por qué ese color, en texto
         "condiciones": ["A1", …], "estructural": bool, "todo_n4": bool,
         "T", "T_de", "T_inf", "T_max", "dL", "dL_de", "dL_inf", "prior": {…} | None,
         "cobertura", "cobertura_ok", "nucleo_con_dato",
         "ligas": [ {"variable_id", "variable", "peso", "prior_de", "nivel_evidencia",
                     "nivel_efectivo", "sigma_efectiva", "modificado_por_usuario", "fuente",
                     "fuente_urls": [..], "direccion", "tipo_direccion", "medido_en_vuelo",
                     "ausencia": "F1"…"F7" | None, "motivo_ausencia",
                     "valor", "unidad", "fecha_dato", "antiguedad_dias", "nivel_calidad",
                     "clase_dispositivo", "z_pob", "z_fase", "z_act", "u", "var_z",
                     "activacion", "aporte", "grupo", "cuenta_en_T", "criterio": {…} | None,
                     "bayes": {"kappa", "ln_lr", "de"} | None, "estado_variable",
                     "delta_tripulacion": {…} | None, "etiquetas": [..]} ],
         "pasos": ["1. …", "2. …"],                       # cálculo paso a paso, en texto llano
         "capas_fijas": [{"nombre", "estado", "detalle"}],
         "etiquetas": ["[terrestre]", "cobertura baja", …],
         "historial": [{"fecha", "color", "T", "T_inf"}]}
      ],
      "variables": {variable_id: {"clase", "base": {…}, "media_adaptativa", "cusum", "aprendidos",
                                  "excluidos", "estado"}},
      "sin_variable": [ … ], "rechazadas": [ … ]
    }
  },
  "registro": [ … ]                                         # intentos rechazados, exclusiones
}
```

Además: `evaluacion.evaluar_en(resultado_o_estado, fecha)` no es necesario; para ver otro día se usa
`historial` (color, T, T_inf por fecha).

## 6. Overrides del usuario

`datos/modelo/overrides.json` (no existe hasta que el usuario edita algo):

```json
{"version": 1,
 "nota": "Valores modificados por el usuario. No tienen fuente. Provisional.",
 "ligas": {"P01|01:V31": {"peso": 2.0, "prior_de": 1.0, "modificado": "2026-11-14T22:10:00"}},
 "umbrales": {"T_amarillo": {"valor": 3.5, "modificado": "…"}}}
```

`parametros.restaurar()` borra el archivo (vuelve a las tablas con fuente y a los umbrales provisionales por
defecto). Los CSV de `datos/modelo/` nunca se escriben.

## 7. Comprobaciones aritméticas obligatorias (d.4, d.7)

- Una liga de peso 3 totalmente activada: T = 3; T_inf = 2.18 (A), 1.36 (B), 0.53 (C).
- P01 solo con el adaptador ECG (bandera = 1, QTc cumple criterio, latidos en el grupo de la bandera):
  T = 5; DE = 2.12; T_inf = 1.51; AMARILLO; nunca ROJO (todo N4).
- P04 con FC alertada (2, A, N1) y temperatura alertada (3, B, N3b): T = 5; DE = 1.12; T_inf = 3.16;
  AMARILLO de inmediato y ROJO si persiste 24 h.

## 8. Estado de la implementación (15 nov 2026)

Firma real: `evaluar(obs, *, tablas=None, params=None, mision=None, perfiles=None, canal="real", ruta_estado=None,
guardar=True, ruta_overrides=None, rechazadas=None)` y `evaluar_todo(sens_df=None, raw_dir=None, ecg_en_reposo=False,
mision_real=None, perfiles_real=None, guardar=True, *, simulado=True, ruta_estado_real=None, ruta_estado_simulado=None,
ruta_overrides=None)`.

Simplificado o no implementado (todo provisional): δ de fase = 0 (D5); de las capas fijas solo se calcula PHQ-9 (D15);
ausencia F6 (falta la columna de latencia, S17); «dependiente de fase» solo para `↑ en vuelo / ↓ postvuelo`; «indeterminado»
solo para el QTc sin sexo (D16); prior de P02 no usado (depende de la duración de la misión); etiquetas de tripulación solo en
la última evaluación; sin interfaz para acuse de ROJO ni cierre de revisión de CUSUM (quedan como funciones de
`Calibracion`); R-1 y R-2 exigen además una liga activa que no sea de contexto (más estricto que f.1). La tasa de falsas
alarmas no está medida: el dataset SIMULADO usa ruido acotado a propósito. Nada es un diagnóstico.
