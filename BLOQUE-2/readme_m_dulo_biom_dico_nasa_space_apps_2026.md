# Módulo Biomédico de Monitoreo de Astronautas — NASA Space Apps Challenge 2026

Motor determinista y estadístico en **Python 3** (sin dependencias externas) para la evaluación en tiempo real de salud espacial, diseñado como núcleo lógico y suite de validación independiente.

---

## 1. Arquitectura de Archivos (Listo para Probar)

Coloca estos archivos en una misma carpeta en tu computadora:

1. `astronaut_health_engine.py` *(generado en el paso anterior)*: Contiene la clase `AstronautHealthEngine` con todos los modelos matemáticos y clínicos.
2. `test_suite_validacion.py`: Script de pruebas automatizadas que ejecuta **6 escenarios clínicos críticos** de misión y verifica mediante `assert` que cada regla responda con exactitud.
3. `detector_orina_camara.html` *(opcional, ya generado)*: Aplicación web móvil para probar en vivo la colorimetría de orina (`02:V33`) con la cámara del teléfono.

---

## 2. Cobertura de Variables y Modelos Implementados

| Subsistema | Variables Cubiertas | Lógica / Criterio Científico Implementado |
| :--- | :--- | :--- |
| **Radiación Espacial** | `01:V90`, `01:V91`, `01:V95`, `01:V96`, `01:V101`, `01:V100` | Presupuesto de carrera (`< 600 mSv`), tasa diaria (`< 1.3 mSv/d`), picos de tormenta solar (`>= 100 mGy/h`), protocolo de refugio (`<= 60 min`) y **filtro de especificidad** que descarta mareo espacial (SMS) en los días 1–3. |
| **Hidratación y Riñón** | `02:V34`, `02:V35`, `02:V32`, `02:V33`, `02:V20`, `01:V30`, `02:V37` | Meta hídrica dinámica (`>= 32 mL/kg`; `2100–2500 mL/d`), pérdida aguda de peso (`>= 2 %`), densidad urinaria (`USG >= 1.020`), colorimetría cámara (`CIE b* >= 22.61`), pH ácido (`< 5.5`), tira Chemstrip y cólico renal. |
| **Salud Ósea y Cruce Hueso–Riñón** | `02:V15`, `02:V16`, `02:V01`, `02:V07`, `02:V08`, `02:V14` | Proyección matemática de **DMO residual (%)** partiendo del DXA prevuelo (`02:V01`) modulada por ARED (`>= 6 ses/sem`, `2–3x` peso) y alendronato (`70 mg/sem`). Activa **cruce hueso–riñón** si cae ARED y sube resorción (`NTX`, `CTX`, `Ca`). |
| **Cognición y Clínica de Anemia** | `01:V104`, `01:V118` | Puntaje $Z$ en prueba psicomotora PVT (`Z >= +2.0`) y correlación sintomática de anemia espacial. |
| **Contexto Clínico** | `02:V16`, `02:V39`, `01:V64`, `02:V38` | Modula alertas según uso de bifosfonato, citrato potásico (`20 mEq/d`), terapia hormonal y antecedente previo de litiasis (`~60 %` recurrencia). |
| **Laboratorio (Línea Base Individual)** | `01:V108`, `01:V109`, `01:V98`, `01:V99`, `01:V117`, `02:V31`, `02:V14`, `02:V07`, `02:V08` | Calcula puntaje $Z$ y `%` de cambio frente al promedio prevuelo del tripulante. Diferencia **hemoconcentración esperada en vuelo** (`Z >= +1.5`) de **anemia espacial postvuelo** (`<= -7 %` en retorno) y detecta biodosimetría por linfopenia (`01:V98`). |

---

## 3. Cómo Ejecutar las Pruebas en tu Computadora (Paso a Paso)

No necesitas instalar librerías externas (`pip` no es necesario); solo requiere **Python 3.8 o superior**.

1. Abre una terminal (CMD, PowerShell o Terminal en Mac/Linux) dentro de la carpeta donde guardaste `astronaut_health_engine.py` y `test_suite_validacion.py`.
2. Ejecuta la suite de validación:

```bash
python test_suite_validacion.py
```
*(En Mac/Linux usa `python3 test_suite_validacion.py`)*

3. Verás en pantalla el reporte detallado de cada uno de los **6 escenarios de prueba** con el estado `PASS ✅`, el diagnóstico generado y la salida JSON estructurada lista para conectar a cualquier interfaz o API.

---

## 4. Escenarios Incluidos en `test_suite_validacion.py`

1. **Escenario 1 — Operación Nominal en Órbita (Día 45):** Todos los parámetros en meta; verifica que el motor no genere falsas alarmas (`0 alertas`).
2. **Escenario 2 — Tormenta Solar (SPE) + Síntomas Cruzados (Día 45):** Pico de `118 mGy/h` + náuseas fuera de ventana de mareo espacial + caída de linfocitos (`01:V98`). Verifica alertas `CRITICAL` de radiación y biodosimetría.
3. **Escenario 3 — Filtro de Falso Positivo por Mareo Espacial (Día 2):** Vómito en día 2 con radiación nominal (`0.03 mGy/h`). Verifica que el motor suprima la alerta radiológica y lo clasifique como probable SMS (`INFO`).
4. **Escenario 4 — Cruce Fisiológico Hueso–Riñón y Riesgo Litiásico:** Baja carga en ARED (`3 ses/sem`, `1.4x`), alza de NTX (`+122 %`) y calcio sérico (`Z = +2.67`), baja ingesta de agua y antecedente de litiasis. Verifica activación de `bone_renal_cross_active = True` y elevación de meta hídrica a `2500 mL/d`.
5. **Escenario 5 — Hemoconcentración en Vuelo vs. Anemia Espacial al Retorno:** Demuestra con el mismo astronauta cómo `Hb = 14.5 g/dL` en vuelo se interpreta como hemoconcentración fisiológica (`INFO`) y `Hb = 11.9 g/dL` al aterrizar (`post_flight`) dispara alerta de anemia espacial (`WARNING`).
6. **Escenario 6 — Fatiga Cognitiva (PVT) y Deuda de Sueño/Radiación:** Tiempo de reacción de `295 ms` (`Z = +2.78` sobre prevuelo). Verifica alerta de enlentecimiento psicomotor (`01:V104`).