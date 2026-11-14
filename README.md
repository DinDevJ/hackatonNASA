# hackatonNASA

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

## Convención de confianza

Los documentos marcan cada afirmación con uno de estos tres símbolos. **Nada
marcado con ⚠️ debe llegar a una diapositiva sin verificarse antes.**

| Marca | Significado |
|---|---|
| ✅ | Verificado en fuente primaria |
| ⚠️ | Pendiente de verificar |
| 🔶 | Decisión de diseño nuestra, no de NASA |
