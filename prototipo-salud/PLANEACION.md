# Planeación del proyecto LUNNA

**Fecha de revisión:** 15 de noviembre de 2026

Este documento define el plan operativo para mantener, reorganizar y verificar LUNNA. No contiene decisiones pendientes ni sustituye al protocolo de investigación. La documentación científica, sus límites y sus advertencias están en [PROTOCOLO-INGESTIGACION.md](PROTOCOLO-INGESTIGACION.md).

## Objetivo

Mantener una estructura reproducible donde sea posible localizar las interfaces, el backend, el hardware, los datos, los modelos, las pruebas y la documentación sin confundir material real, sintético, experimental o histórico.

## Estado confirmado

| Área | Ubicación | Función |
|---|---|---|
| Backend LUNNA | `Sistema/backend/` | Node/TypeScript, SQLite, REST, SSE, ingesta, modelo por variable y enlace con Tierra. |
| Interfaces EVA | `Sistema/interfaces/eva/` | Teléfono, computadora central y base en Tierra. |
| Wearable | `Sistema/interfaces/reloj/` | Interfaz compacta del reloj de la tripulación. |
| Simulación | `Simulacion/` | Simulador visual, escenarios sintéticos, generador y pruebas. |
| Prototipo de salud | `prototipo-salud/` | Adaptadores de modelos, ECG, sensores, motor de padecimientos y validación. |
| Datos de planeación | `Planeacion/` | Catálogos, variables y datos de investigación. |

Los datos sintéticos deben permanecer rotulados como **SIMULADOS**. Las bases SQLite, archivos WAL/SHM, credenciales, pesos descargados y temporales no son documentación ni fuente de verdad científica.

## Principios

1. Conservar código, datos, assets e historial.
2. Mantener una fuente de verdad por dato y documentar su regeneración.
3. Separar hechos verificados, simulación, resultados experimentales y propuestas.
4. Hacer cambios pequeños, revisables y comprobables.
5. Mantener rutas públicas y contratos HTTP/SSE durante reorganizaciones.
6. No mover una base SQLite mientras el backend esté escribiendo.
7. No presentar el prototipo como dispositivo médico ni hardware espacial certificado.

## Plan de trabajo

### 1. Línea base

- Registrar rama, commit, estado de Git y versiones de Node/Python.
- Inventariar rutas, tamaños, archivos ocultos y binarios.
- Respaldar `eva.db` con el backend detenido.
- Registrar las pruebas disponibles y sus resultados.

**Resultado:** línea base reproducible y sin archivos movidos.

### 2. Inventario

Para cada archivo registrar función, consumidor, fuente de verdad, pruebas, licencia, privacidad y estado: activo, experimental, histórico, generado o local.

**Resultado:** mapa de propiedad y dependencias.

### 3. Contratos

- Mantener IDs, unidades y definiciones canónicas.
- Diferenciar FC instantánea y pulso en reposo.
- Registrar variables derivadas, calidad, procedencia y canal SIMULADO.
- Conservar el contrato EVA, SCET, secuencia, esquema y asignación de dispositivo.

**Resultado:** contratos versionados y verificables.

### 4. Documentación y datos

- Mantener separados este plan, el manual de usuario y el protocolo.
- Conservar catálogos, referencias y procedencia junto con sus datos.
- Mantener generadores junto a sus artefactos.
- Comprobar que los archivos generados se puedan regenerar.
- Identificar en cada interfaz qué viene del backend y qué sigue siendo escenario.

**Resultado:** documentación navegable y datos trazables.

### 5. Interfaces

Migrar o modificar una interfaz por vez: tripulación, reloj, computadora central y Tierra.

Para cada cambio:

1. conservar temporalmente las rutas anteriores;
2. revisar rutas relativas y recursos;
3. conservar parámetros de navegación y tema;
4. comprobar HTML, CSS, JS, imágenes y fuentes;
5. probar escritorio, móvil, API y SSE;
6. retirar aliases después de verificar el cambio.

**Resultado:** interfaces reproducibles sin romper rutas públicas.

### 6. Backend, hardware y datos

- Mantener juntos código, pruebas, semillas y páginas del backend.
- Mantener alineados TypeScript, Python, C++ y vectores EVA.
- Mantener separado el firmware de la pasarela BLE.
- Guardar DONKI con fecha de consulta, rango y licencia.
- Regenerar pesos CSV/JSON/JS desde su fuente.
- Respaldar y verificar `eva.db` antes de trasladarla.

**Resultado:** backend, hardware, datos y simuladores reproducibles.

### 7. Integración

- Ejecutar pruebas de backend, interfaces, motor, pasarela y firmware.
- Cubrir dispositivos, esquemas, deduplicación, calidad, calibración, umbrales y alertas.
- Probar enlace abierto, enlace cerrado y retardo.
- Confirmar que todo lo sintético esté etiquetado.
- Probar el firmware en placa real por separado del software.

**Resultado:** reporte de pruebas y diferencias frente a la línea base.

### 8. Publicación

- Revisar diff, lista de archivos, enlaces, imports y rutas.
- Ejecutar la suite completa.
- Actualizar README, este plan, el manual y el protocolo.
- Conservar el historial de cambios.

**Resultado:** estructura documentada, reproducible y auditable.

## Criterios de aceptación

La reorganización está completa cuando:

- cada archivo activo tiene ubicación y función identificables;
- las instrucciones funcionan desde un clon limpio;
- el backend sirve las interfaces y el simulador;
- central, teléfono, reloj y Tierra consumen contratos actuales;
- pasan las pruebas existentes y las pruebas de rutas;
- simulación, fuentes reales y propuestas están rotuladas;
- no se publican credenciales, datos sensibles ni bases locales;
- la documentación describe comandos, fuentes de verdad, límites y estructura.

## Riesgos y controles

| Riesgo | Control |
|---|---|
| Rutas relativas rotas | Migrar una interfaz por vez y probar recursos. |
| Cambios de contrato | Versionar IDs, unidades, esquemas y fixtures. |
| Deriva de archivos generados | Regenerar desde la fuente y comparar. |
| Corrupción de SQLite | Detener el backend y copiar de forma consistente. |
| Sobreinterpretación clínica | Mantener etiquetas de simulación, calidad, evidencia y límites. |
| Pérdida de material histórico | Conservar historial y registrar toda eliminación explícita. |

## Alcance

Este documento no fija umbrales clínicos, sensores válidos, correspondencias de padecimientos ni criterios de validación. Esos asuntos pertenecen al protocolo de investigación.
