# Resumen personal — síntesis de investigación

Mi resumen corto de [sintesis-investigacion.pdf](sintesis-investigacion.pdf)
(19 páginas, 14 nov 2026). Para el detalle y las fuentes, ir al PDF.

✅ verificado · ⚠️ verificar · 🔶 decisión nuestra

> Las cifras de aquí vienen del PDF, que cita su fuente en cada sección. **No las he
> revisado contra la fuente primaria todavía**, así que todo número va con ⚠️ hasta que
> alguien lo confirme.

---

## 0. La idea en una frase

Una app que cubre los **17 riesgos del HRP** de NASA, mide casi todo de forma pasiva,
decide **a bordo sin internet** y le pide al astronauta solo **~8 min activos al día**.

## 1. Las cinco conclusiones que guían el diseño

| # | Conclusión | Por qué |
|---|---|---|
| 1 | **Autonomía primero** | ⚠️ Hasta 20 min de retraso por sentido a Marte |
| 2 | **Los wearables ya tienen precedente** | Bio-Monitor (CSA) y actígrafos en Artemis II |
| 3 | **Personalizar por individuo, no solo por sexo** | NASA: la variación individual ≥ la variación entre sexos |
| 4 | **Riesgo con rango, no con certeza** | Porcentaje solo donde hay modelo; si no, nivel |
| 5 | **Cuidarse sin que se sienta tarea** | 🔶 Juegos que premian hábitos, no resultados |

## 2. De dónde salen los riesgos

**5 peligros → 17 riesgos** (11 fisiología · 5 conducta · 1 radiación).

Radiación · Aislamiento y confinamiento · Distancia de la Tierra · Gravedad alterada ·
Ambientes cerrados hostiles.

## 3. Módulos de la app

| Módulo | Qué mide | Número clave |
|---|---|---|
| **Radiación** | Dosis acumulada y por evento, clima espacial, pruebas cognitivas | ⚠️ < 600 mSv en la carrera · 250 mSv por evento solar |
| **Ejercicio** | Carga, repeticiones, FC, VO2 máx (ARED, T2, CEVIS, volante) | ⚠️ ~2 h/día en la ISS y aun así ~1 % de hueso perdido al mes |
| **Nutrición** | Calorías, vit. D, calcio, sodio, hidratación, fatiga de menú | ⚠️ 2,500–3,500 kcal/día; el problema principal es comer de menos |
| **Mente y sueño** | Actigrafía, luz, diario, PVT, cohesión del equipo | ⚠️ 16 amaneceres al día en la ISS |
| **Salud menstrual** | Método, sangrados, síntomas — **opcional y privado** | 🔶 Sin gamificación |
| **Riesgo integrado** | Combina todo y estima los 17 riesgos | ⚠️ Radiación: máx. 3 % de muerte por cáncer (95 % confianza) |

## 4. Cómo se muestra el riesgo (lo más importante para la demo)

Tres tipos de estimación, según lo que permite la evidencia:

| Tipo | Riesgos | Qué ve el astronauta |
|---|---|---|
| **Probabilidad con modelo** | Cáncer por radiación, inmune, huésped‑microorganismo | "1.2 % (0.8 a 1.7 %)" contra el límite |
| **Margen contra la norma** | Cardio/músculo, hueso, nutrición, cardiovascular, hipoxia | "Te queda 14 % de margen" |
| **Nivel relativo** | Los otros 9 (SANS, sueño, equipo, etc.) | Bajo / medio / alto + tendencia |

Los ejemplos de la tabla son ilustrativos, no datos reales. Siempre con una **acción
concreta**, nunca solo un número, y con el aviso "estimación, no diagnóstico".

Encaja con lo que Julio escribió en
[motor-diagnostico.md](../Julio/motor-diagnostico.md): número sí, pero con procedencia.

## 5. Experiencia del astronauta (🔶 nuestra propuesta)

| Sesión | Cuándo | Tiempo |
|---|---|---|
| Bitácora automática | Todo el día | 0 min |
| Reporte de estado | Al despertar | 1 min |
| Reto de reflejos (PVT) | Diario | 3 min |
| Explorador de menú | Cada comida | 30 s |
| Bitácora del capitán | Antes de dormir | 2 min |
| Informe de misión | Semanal | 5 min |
| Misión cognitiva | Cada 2–4 semanas | 15–20 min |
| Prueba de transición | Cada cambio de gravedad | 10–15 min |

Reglas: metas **cooperativas** (sin rankings), rachas flexibles, modo silencioso en días
pesados, y se premia **registrar**, nunca tener "buenos" números.

## 6. Integración de relojes — avisos para quien programa

- Solo sirven vías que funcionan **sin internet**: Bio-Monitor/Astroskin, actígrafo,
  Apple HealthKit, Android Health Connect, Garmin solo con su SDK.
- ⚠️ **No usar Google Fit** — sus APIs terminan a finales de 2026.
- ⚠️ **Garmin pausó** las solicitudes nuevas a su Health API (sept. 2026).
- ⚠️ **La VFC no es igual entre marcas** (SDNN vs RMSSD): guardar la definición de cada
  métrica.

## 7. Arquitectura en una línea

`Wearables + Ejercicio + Hábitat + Registros → Hub a bordo (normaliza, alerta, guarda, estima riesgo) → App / Tripulación / Tierra con retraso`

## 8. Mis pendientes

- [ ] Revisar NASA-STD-3001 vol. 1 y 2 para fijar umbrales reales
- [ ] Elegir plataforma de reloj principal (watchOS, Wear OS o Garmin)
- [ ] Definir quién ve cada dato (astronauta, médico, psicólogo, investigación)
- [ ] Elegir cuestionarios validados de ánimo, estrés y cohesión
- [ ] Modelo de datos con **sexo** y **definición de la métrica** como campos
- [ ] Pasar los ⚠️ de este resumen a ✅ antes de que lleguen a una diapositiva

## 9. Lo que el PDF no cubre

Límites de CO2/aire/ruido del hábitat · tasas de pérdida muscular · inventario de
farmacia · datos suficientes de mujeres astronautas · modelos individuales validados.
