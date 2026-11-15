# Nota: que haria falta para entrenar una red de fusion (no se entrena ahora)

Estado: `fusion/red_fusion_stub.py` solo declara que no hay predictor. No se entrena nada en este prototipo.

Datos y desenlaces necesarios:
- **Datos emparejados del mismo individuo**: ecografia (estudios con metadatos y calibracion) + wearables
  (FC, HRV con metrica, SpO2, temperatura cutanea, sueno, actividad) **sincronizados en el tiempo**
  (ventanas definidas de antemano, relojes con zona horaria conocida).
- **Desenlaces adjudicados por clinicos** (p. ej. FEVE de referencia medida por ecocardiografista, eventos
  clinicos definidos con criterios escritos), no etiquetas automaticas ni salidas de otros modelos.
- **Tamano**: suficiente para el numero de predictores y la prevalencia del desenlace (calcular el tamano de
  muestra antes de recolectar; con pocos eventos solo cabe un modelo simple y regularizado).
- **Consentimiento y acuerdos de uso (DUA)**: consentimiento informado, aprobacion etica, desidentificacion,
  y los DUA/licencias de cada fuente (varios datasets de eco requieren registro y aceptacion de terminos).
- **Validacion externa**: otro centro/otro dispositivo/otra poblacion; separar por persona (nunca por fila).
- **Analogos en tierra vs vuelo**: los datos en tierra (pacientes, voluntarios, aislamiento/analogos) no
  representan microgravedad, radiacion ni cambios de fluidos; hacen falta datos de vuelo o analogos
  validados antes de afirmar nada para astronautas.

Por que no se entrena ahora: no existen datos emparejados con desenlaces adjudicados; el encargo prohibe
entrenar/ajustar modelos en esta etapa; y devolver probabilidades sin ellos seria inventar un resultado.
Los datos sinteticos del prototipo no sirven para entrenar (simulated=true, sin relacion fisiologica real).
