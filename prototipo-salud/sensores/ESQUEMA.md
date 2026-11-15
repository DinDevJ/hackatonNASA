# Esquema de sensores (PASO 5)

Todo ejemplo de esta carpeta es **SINTETICO** (`simulated=true`, notes "DATO SINTÉTICO generado por
generar_sintetico.py, no es de ninguna persona"). Nada de esto es diagnostico.

## Formato largo (CSV o JSON: lista de objetos, o `{"rows": [...]}`)
`subject_id, timestamp, device, variable, value, unit, quality, simulated, metric_detail, notes`

- Obligatorias: `subject_id`, `timestamp` (ISO-8601, p. ej. `2026-11-01T08:30:00` o con zona `...+00:00`), `device`.
  Filas sin subject_id/device o con timestamp invalido se DESCARTAN con aviso (cuantas y por que).
- `unit`: obligatoria o se deduce de `VARIABLES` (con aviso). Solo se convierte si es inequivoco
  (°F->°C, K->°C, min->h en sleep_duration, h->min en active_minutes) y se anota en `notes`; otra unidad incompatible => fila descartada con aviso.
- `simulated`: se conserva tal cual; si falta la columna o la celda, se asume `false` y se avisa.
- `metric_detail`: la HRV lleva SIEMPRE su metrica (`hrv_rmssd` o `hrv_sdnn`; un `hrv` generico solo se acepta si metric_detail es rmssd/sdnn).
- `temperature`/`temp` sin especificar se rechaza: usa `temp_skin` (cutanea) o `temp_body` (corporal).

## Formato ancho (CSV)
`subject_id, timestamp, device` + una columna por variable (nombre canonico o alias; sufijo de unidad opcional
`temp_body__F`) + opcionales `quality, simulated, notes`. Las celdas vacias NO generan filas (ausente != 0).

## Variables (unidad canonica)
heart_rate (bpm), hrv_rmssd (ms), hrv_sdnn (ms), spo2 (%), bp_systolic / bp_diastolic (mmHg), temp_skin (°C, cutanea),
temp_body (°C, corporal), sleep_duration (h), sleep_efficiency (%), steps (count), active_minutes (min), symptom (texto en `value`).
No se exigen todas. Notas de evidencia: la SpO2 de reloj tiende a sobreestimar en hipoxemia; la temperatura de reloj/anillo
solo sirve como cambio relativo.

## Faltantes
Valor vacio => `NaN` (nunca 0). En largo la fila se conserva con `value=NaN`; en resumenes: `n` (validos), `faltantes`
(NaN en la ventana) y columnas `*_motivo` cuando algo no se puede calcular (tendencia con n<3, basal con <3 valores).
`timestamp` sin zona se conserva tal cual y, al cruzar con otras fuentes, se asume UTC (la "noche" 22:00-06:00 usa la hora almacenada).

## Ejemplos y datos de prueba de la regla tipo NightSignal
`ejemplo_sintetico_sensores.csv|json` (1285 filas, 2 personas, 2026-11-01 a 2026-11-10 08:00, semilla 20261114; regenerar:
`python sensores/generar_sintetico.py`), `ejemplo_sintetico_ancho.csv` (11 filas, temp_body en °F).
- **SIM-A01**: reloj, anillo, manguito manual, termometro, diario; **las noches del 08 y 09 de noviembre tienen FC nocturna ~+6 bpm
  sobre su basal**, por lo que la regla R3 (tipo NightSignal, Alavi 2022) se activa con datos SIMULADOS.
- **SIM-B02**: control sin elevacion; sin SpO2 ni presion arterial (variables ausentes); sin anillo.
- Hay huecos NaN (~6 % de la FC del reloj, dias sin termometro), calidades variadas y HRV con metrica explicita.
