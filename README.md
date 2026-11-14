# (nombre pendiente) --- HACKATON SPACE APPS

Software de monitoreo de salud para astronautas en misiones de larga duración.
NASA Space Apps Challenge 2026.

El software **recaba, organiza, monitorea, previene y asiste en emergencias**. Los cinco
son una sola cadena: el monitoreo diario existe para que, cuando ocurra una emergencia,
el sistema ya sepa cómo es esa persona cuando está bien.

## Estructura del repositorio

    Planeacion/
      Julio/        documentos de análisis y diseño
      <nombre>/     una carpeta por integrante

Cada quien trabaja en su propia carpeta dentro de `Planeacion/` para evitar
conflictos al mezclar ramas.

## Documentos actuales

| Documento | Qué contiene |
|---|---|
| [Diccionario de datos](Planeacion/Julio/diccionario-de-datos.md) | De dónde sale y cómo se calcula cada indicador: sensores, fórmulas, instrumentos y fuentes |
| [Comportamiento del software](Planeacion/Julio/comportamiento-del-software.md) | Diagramas de secuencia, escalera de escalamiento, modelo de tiempos SCET/ERT, modo emergencia y guion de demo |
| [Motor diagnóstico](Planeacion/Julio/motor-diagnostico.md) | Diferencial probabilístico, priors publicados, bucle de refutación y reglas de honestidad |
| [Roadmap](Planeacion/Julio/roadmap.md) | Plan por fases, inventario de datos reales y estrategia para Best Use of Data |
| [Stack y dependencias](Planeacion/Julio/stack-y-dependencias.md) | Decisión de lenguaje, librerías a reutilizar y estado de la API DONKI |
| [Síntesis del equipo](Planeacion/Julio/sintesis-del-equipo.md) | Análisis de las cinco propuestas: convergencias, choques y qué decidir |
| [Mis variables agrupadas](Planeacion/Julio/mis-variables-agrupadas.md) | Las 77 variables asignadas, en 9 grupos por ruta de investigación |
| [Checklist G1, G2 y G6](Planeacion/Julio/checklist-G1-G6.md) | Checklist cumplido para wearable, manguito y telemetría, con la escalera de obtención por variable |
| [Hardware y radio](Planeacion/Julio/hardware-y-radio.md) | Qué está verificado sobre BLE y relojes en el espacio, y las restricciones del Huawei Watch 5 |

## Convención de confianza

Los documentos marcan cada afirmación con uno de estos tres símbolos. **Nada
marcado con ⚠️ debe llegar a una diapositiva sin verificarse antes.**

| Marca | Significado |
|---|---|
| ✅ | Verificado en fuente primaria |
| ⚠️ | Pendiente de verificar |
| 🔶 | Decisión de diseño nuestra, no de NASA |
