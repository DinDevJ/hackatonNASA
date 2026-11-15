# Tripulación SIMULADA (datos sintéticos)

**SIMULADO. No es dato de vuelo, no es fisiología real y no son datos de astronautas ni de ninguna persona.**
Son valores sintéticos: variables independientes con ruido acotado alrededor de medias arbitrarias (PRE: 12 desviaciones simétricas y equiespaciadas hasta ±1.0 DE simulada, en orden aleatorio, para que la base prevuelo sea estable; vuelo: uniforme hasta ±0.5 DE; provisional).
Solo sirven para ejercitar el flujo del motor de padecimientos (ALGORITMOS.md, sección h.2). Ninguna cifra de
aquí es una validación ni un resultado; todos los números son provisional. Nada es un diagnóstico.

## Contenido
- `tripulacion_simulada.csv`: CSV nativo del motor (`subject_id,timestamp,variable_id,value,unit,device_class,quality,context,method,simulated,notes`). Todas las filas llevan `simulated=true` y `notes` que empieza por «SIMULADO».
- `tripulacion_simulada.json`: misión (lanzamiento 2026-09-13), perfiles (edad y sexo INVENTADOS), escenarios, variables simuladas y los parámetros (provisional) con los que se generó.
- 5 personas (`SIM-T01`…`SIM-T05`), 30 días: PRE 2026-09-01…2026-09-12, vuelo 2026-09-13…2026-09-30; un valor diario por variable.
- Variables: todas las `sí en vuelo` de los padecimientos P03, P04, P05, P06, P07, P10, P16, P18 y P19 de `datos/modelo/PADECIMIENTO-VARIABLE.csv`. Solo FC, SpO2, FR, temperatura, sueño y ppCO2 tienen valores de aspecto plausible; el resto está en «u.a. SIMULADA» (media 100, DE 5). Las variables de presencia/síntoma valen 0 (ausente) cada día.

## Escenarios (provisional)
SIM-T01 control; SIM-T02 salto brusco en 04:A1 y 01:V3 (+5 DE, 27–30 sep); SIM-T03 rampa lenta de sueño 03:V30 (−0.10 DE/día desde el lanzamiento); SIM-T04 faltantes (sin SpO2, FR ni PIO2 en vuelo, y filas `sin_dato: <motivo>`); SIM-T05 datos N4 (PA cuffless muy desviada, bandera ECG = 1 y QTc 470 ms de tipo adaptador, 28–30 sep); toda la tripulación: ppCO2 (04:A23) +1.5 DE el 18 de septiembre (un solo día: una excursión más larga dejaría una señal de deriva del CUSUM que solo cierra una persona) («desviación compartida»).

## Regenerar (determinista con la semilla)
```
python -m motor.simulador
```
Desde la raíz del prototipo. Para otra semilla o carpeta: `from motor.simulador import generar; generar(dir_salida, semilla)`.
