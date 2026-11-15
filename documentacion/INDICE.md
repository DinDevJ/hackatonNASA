# Documentación técnica de EVA / LUNNA

Documentación modular del proyecto **EVA / LUNNA**, el monitoreo de salud para misiones espaciales del equipo Monarcas (NASA Space Apps Challenge 2026). Cada documento trata un área y puede leerse por separado. Todos describen el mismo sistema y se enlazan entre sí.

> LUNNA es un prototipo educativo y de investigación. No es un dispositivo médico, no diagnostica y no está validado para uso clínico ni en astronautas. La tripulación de demostración es ficticia y los datos de la demo son sintéticos.

## Documentos

| # | Documento | Contenido | Para quién |
|---|---|---|---|
| 01 | [Planeación general](README_01_PLANEACION.md) | Descripción, problemática, objetivos, alcance, requerimientos, etapas, entregables, recursos, riesgos y **estado del repositorio** | Todo lector |
| 02 | [Protocolo de investigación](README_02_PROTOCOLO_INVESTIGACION.md) | Problema, preguntas, marco, metodología, variables, fuentes, procedimientos, criterios y limitaciones; separa fundamento, método y resultados | Investigación, evaluadores |
| 03 | [Manual de usuario](README_03_MANUAL_USUARIO.md) | Pantallas, navegación, interpretación de estados y alertas, procedimientos, errores | Usuarios de la demo |
| 04 | [Arquitectura del sistema](README_04_ARQUITECTURA_SISTEMA.md) | Componentes, capas, modos y roles, base de datos, APIs, flujo y dependencias (diagramas Mermaid) | Desarrolladores |
| 05 | [Integración e interoperabilidad](README_05_INTEGRACION_INTEROPERABILIDAD.md) | Perfil EVA binario, BLE, contrato JSON, catálogo de endpoints, SSE, enlace con Tierra, puente con el motor Python | Desarrolladores, hardware |
| 06 | [Modelos computacionales y algoritmos](README_06_MODELOS_COMPUTACIONALES_ALGORITMOS.md) | LUNNA bayesiano, motor del navegador, índice por padecimiento, motor de 20 padecimientos, ECG, modelos de eco y su estado real | Investigación, desarrolladores |
| 07 | [Diccionario de datos y variables](README_07_DICCIONARIO_DATOS_VARIABLES.md) | Variables, unidades, umbrales, priores, padecimientos y ligas, tablas SQLite, formatos, datos reales/simulados | Todo lector técnico |
| 08 | [Pruebas y validación](README_08_PRUEBAS_VALIDACION.md) | Suites y resultados, evaluación de ECG y eco, motor con simulados, Inspiration4, pendientes; validación técnica, experimental y clínica | Calidad, evaluadores |
| 09 | [Instalación, configuración y despliegue](README_09_INSTALACION_CONFIGURACION_DESPLIEGUE.md) | Requisitos, comandos reales, variables de entorno, puertos, verificación y solución de errores | Desarrolladores |
| 10 | [Seguridad, confiabilidad y riesgos](README_10_SEGURIDAD_CONFIABILIDAD_RIESGOS.md) | Medidas implementadas y ausentes, integridad, desconexiones, respaldo, riesgos y recomendaciones | Desarrolladores, evaluadores |

## Orden recomendado de consulta

1. **Para entender el proyecto:** 01 → 02 → 04.
2. **Para usar la demo:** 09 (§3.1) → 03.
3. **Para desarrollar o integrar:** 04 → 05 → 07 → 09.
4. **Para evaluar el rigor científico:** 02 → 06 → 07 → 08 → 10.

## Fuentes de esta documentación

Esta carpeta se construyó a partir de:

- [`prototipo-salud/README.md`](../prototipo-salud/README.md), que es el README consolidado y el principal;
- [`prototipo-salud/PLANEACION.md`](../prototipo-salud/PLANEACION.md);
- [`prototipo-salud/PROTOCOLO-INGESTIGACION.md`](../prototipo-salud/PROTOCOLO-INGESTIGACION.md);
- [`prototipo-salud/MANUAL-USUARIO-LUNNA.md`](../prototipo-salud/MANUAL-USUARIO-LUNNA.md);
- el código de `Sistema/`, `Simulacion/` y `prototipo-salud/`, contrastado archivo por archivo.

Donde la documentación anterior y el código no coinciden, **manda el código que se ejecuta** (`Sistema/`), y la diferencia se señala en el documento correspondiente.

## Tareas finales

- [ ] Documentar el catálogo [`Planeacion/data/variables/VARIABLES-CARDIOBASCULAR.csv`](../Planeacion/data/variables/VARIABLES-CARDIOBASCULAR.csv): origen, columnas, relación con `VARIABLES-MEDIDAS-ASTRONAUTAS.csv` y uso en el sistema. Después, agregarlo al [diccionario de datos](README_07_DICCIONARIO_DATOS_VARIABLES.md#9-catálogos-de-investigación).

Revisión: 15 de noviembre de 2026.
