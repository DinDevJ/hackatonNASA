# Planeación completa

**Proyecto:** LUNNA · software de monitoreo de salud para misiones espaciales  
**Rama de referencia:** `main`  
**Fecha de planeación:** 15 de noviembre de 2026

## 1. Propósito

Este documento organiza una futura limpieza y reorganización del repositorio sin
perder fuentes, historial, comportamiento ni trazabilidad. Es un plan, no ejecuta
movimientos ni borra material. El estado actual que sirve de línea base es la rama
`main`; el árbol de trabajo estaba limpio al preparar estos documentos.

La reorganización debe facilitar que una persona encuentre:

- las tres interfaces (tripulación, computadora central y Tierra), además del reloj;
- el backend, los esquemas, semillas, simuladores y pruebas;
- el firmware y la pasarela BLE;
- catálogos de investigación, pesos, fuentes externas y datos descargados;
- documentación vigente frente a material histórico o experimental.

## 2. Estado actual verificado

| Área | Ubicación actual | Función / estado |
|---|---|---|
| App de tripulación, central y base | `Planeacion/Leo/maqueta-eva/` | HTML/CSS/JS. Central y base consultan el backend cuando se sirven desde él; la pantalla de tripulación mantiene una parte importante del escenario simulado. |
| Interfaz reloj | `Planeacion/Fani/maqueta-reloj/` | Maqueta servida por el backend, utiliza recursos compartidos con la app de Leo y lee variables en vivo cuando existe el backend. |
| Backend LUNNA | `Planeacion/Julio/backend/` | Node 22.6+, TypeScript ejecutado directamente por Node, SQLite integrada, REST, SSE, ingesta, modelo por variable y enlace con Tierra. Cero dependencias npm indicadas en su README. |
| Simulador visual | `Planeacion/Julio/backend/web/` | Nave interactiva y terminales en `/simulador`; el PC abre `/app/central.html`; Tierra y teléfono tienen sus propias interfaces. |
| Simulador de telemetría | `Planeacion/Julio/backend/src/simulador.ts` | Genera datos sintéticos y los envía por HTTP al backend. |
| Firmware | `Planeacion/Julio/esp32/` | ESP32 BLE, perfil de trama EVA. El firmware completo aún no está verificado en una placa real. |
| Pasarela BLE | `Planeacion/Julio/pasarela/` | Descubre periféricos EVA, suscribe tramas y reenvía al backend. Tiene modo de prueba sin hardware. |
| Investigación y referencias | `Planeacion/*.csv`, `Planeacion/Iker/`, `Planeacion/Julio/backend/semillas/medibles.json` | Catálogo de variables, padecimientos, métodos, umbrales y enlaces. |
| Pesos por padecimiento | `Planeacion/Leo/modelo-pesos/` | CSV/JSON generados desde Python y actualizador bayesiano demostrativo. |
| Datos de clima espacial | `Planeacion/Julio/datos/`, `scripts/` | JSON DONKI descargados y script de adquisición. Los datos solares pueden ser reales; dosis y respuestas mostradas son simuladas. |
| Pruebas | Backend `test/`, motor de maqueta, firmware y pasarela | Pruebas unitarias, integración, lógica de motor y vectores compartidos; cubren código, no validación clínica. |
| Archivos de ejecución | `Planeacion/Julio/backend/eva.db` y posibles `-wal`/`-shm` | Base SQLite mutable creada/empleada al ejecutar el backend; no es fuente de verdad de investigación. Tratar con cuidado y no mover mientras el proceso esté abierto. |

### Línea base de verificación documentada

- `npm test` dentro de `Planeacion/Julio/backend` (el README vigente reporta 37
  pruebas y requiere Node 22.6+).
- `node --test Planeacion/Leo/maqueta-eva/motor.test.mjs` (el README vigente
  reporta 11 pruebas).
- `python test_trama.py` desde `Planeacion/Julio/pasarela/` valida los vectores
  compartidos de trama; no es una suite `unittest`.
- Validar compilación/firmware en hardware sólo cuando haya una placa disponible;
  no se debe registrar como superado hasta compilar y probar de verdad.

No se ejecutaron pruebas para crear estos documentos; son cambios documentales.

## 3. Principios y restricciones de la reorganización

1. **Conservar todo:** no borrar ni sobrescribir originales, datasets, assets,
   prototipos ni bases de datos. Para material obsoleto, moverlo a un archivo
   histórico versionado o conservarlo donde está hasta que el dueño lo revise.
2. **Una fuente por dato:** CSV/JSON de investigación y generadores deben tener
   dueño y flujo de regeneración definidos. No editar a mano archivos generados,
   por ejemplo `pesos.js`.
3. **Separar hecho, simulación y propuesta:** las rutas de fuentes, el modo de
   captura, la etiqueta A/T/C y la bandera simulada deben sobrevivir a cualquier
   movimiento.
4. **Cambios pequeños y verificables:** mover una unidad coherente por commit;
   actualizar referencias en el mismo cambio y ejecutar las pruebas pertinentes.
5. **No cambiar comportamiento por limpiar rutas:** primero preservar las URL públicas
   (`/app/`, `/app/central.html`, `/app/base.html`, `/reloj/`, `/simulador`, `/tierra`)
   y contratos HTTP/SSE; sólo después considerar una modificación funcional.
6. **No reorganizar el SQLite activo como archivo común:** detener el backend,
   realizar copia consistente, acordar su política de versionado y sólo entonces
   migrar su ubicación. Mantener juntos DB/WAL/SHM cuando corresponda.
7. **No presentar la demo como producto médico o hardware espacial certificado.**

## 4. Propuesta de organización destino

Es una propuesta para aprobar antes de mover. La estructura final puede conservar
nombres actuales si los enlaces y pruebas hacen más seguro hacerlo.

```text
/
├── README.md
├── docs/
│   ├── Protocolo de investigación.md
│   ├── Planeación completa.md
│   ├── arquitectura/
│   ├── operación/
│   └── archivo/                 # documentación histórica preservada
├── apps/
│   ├── crew/                    # maqueta-eva: app del astronauta
│   ├── central/                 # pantalla CMO
│   ├── earth/                   # base en Tierra
│   └── watch/                   # maqueta de reloj
├── services/
│   └── backend/                 # Node/SQLite/API/SSE/simuladores/servicio visual
├── hardware/
│   ├── esp32/
│   └── ble-gateway/
├── research/
│   ├── catalogs/                # CSV de variables y padecimientos
│   ├── weights/                 # generador y artefactos generados
│   └── data/                    # DONKI y datasets con licencia/procedencia
└── experiments/                 # prototipos no integrados, sólo después de inventario
```

**No mover directamente a esta estructura sin revisar rutas.** A día de hoy el
backend calcula la raíz de la app de Leo y las maquetas permitidas a partir de
`import.meta.url` en `backend/src/servidor.ts`; tests leen archivos con rutas
relativas; HTML carga JS/CSS mediante rutas relativas; scripts de pesos generan
`pesos.js` en la maqueta. Cualquiera de esos cambios puede romper el servicio aunque
el archivo siga presente.

No incluir en el traslado todos los directorios raíz (`app/`, `luna/`, `maqueta/`,
`BLOQUE-2/`) hasta comprobar con sus README, manifiestos, entradas y propietarios si
son productos activos, experimentos o material de archivo. El inventario debe
resolverlo antes de etiquetar o moverlos.

## 5. Fases de trabajo

### Fase 0 · Congelar el punto de partida

- Confirmar rama `main`, commit inicial, estado de `git status` y versión de Node.
- Crear una rama de trabajo y registrar un tag o commit de referencia; no hacer
  commits sobre `main` durante la migración.
- Generar un inventario legible de rutas y tamaños, incluyendo ocultos y binarios.
- Hacer copia verificable de `eva.db` con backend detenido; conservarla sin incluir
  datos personales o credenciales.
- Registrar comandos de pruebas que realmente funcionen y resultados de referencia.

**Salida:** mapa del repositorio y línea base reproducible, sin archivos movidos.

### Fase 1 · Inventario, propiedad y estado

Para cada carpeta/archivo, registrar: dueño, función, activo/experimental/histórico,
fuente de verdad, consumidor, pruebas, licencia/privacidad, tamaños y enlaces
entrantes/salientes. Clasificar:

- código ejecutable;
- pruebas y fixtures;
- catálogo y datos fuente;
- archivos generados;
- documentación vigente e histórica;
- bases/cachés/artefactos locales;
- prototipos sin integración.

Resolver en especial raíz `app/`, `luna/`, `maqueta/`, `BLOQUE-2/` y cualquier
material recuperable de la rama/historial de planeación. La existencia de una ruta
en Git no basta para decidir que está activa.

**Salida:** matriz aprobada con responsables; no borrar ni renombrar aún.

### Fase 2 · Contratos y convenciones antes de mover

- Adoptar IDs, unidades y definiciones canónicas, incluyendo la distinción entre
  FC instantánea (`04:A4`) y pulso en reposo (`01:V3`).
- Resolver si presión diastólica (`X:PAD`) y media (`X:PAM`) quedan como extensiones
  o reciben IDs de catálogo; documentar la fórmula de PAM.
- Resolver la incompatibilidad entre temperatura central, axilar y de piel.
- Definir correspondencia entre `P01–P20` y los 11 malestares de `pesos.csv`.
- Establecer qué datos son de sensor, calculados, estimados, manuales o sintéticos,
  y qué nivel/evidencia admite cada umbral.
- Acordar política de archivos generados, `eva.db`, DONKI, archivos temporales y
  licencias de datasets.

**Salida:** contratos versionados; sin cambios de ubicación.

### Fase 3 · Reorganización documental y de investigación

- Añadir/actualizar un índice documental y un mapa de carpetas.
- Ordenar protocolo, planificación, arquitectura y guías operativas en docs, sin
  eliminar los originales.
- Agrupar catálogos y referencias sólo tras definir rutas de compatibilidad; conservar
  historial Git y citas fila por fila.
- Mantener junto al generador cada artefacto generado, con instrucciones para
  regenerarlo y validación de que el resultado no cambió.
- Para documentos históricos, usar carpeta `docs/archivo/` o una rama de archivo
  revisada; no depender exclusivamente de una referencia que pueda desaparecer.

**Salida:** documentación navegable y datos trazables; pruebas de código sin cambios.

### Fase 4 · Migración de interfaces en lotes pequeños

En lotes independientes, trasladar primero una interfaz cada vez: tripulación, luego
reloj, central y Tierra. Para cada lote:

1. copiar/mover manteniendo todas las rutas originales mediante alias temporales o
   redirecciones;
2. actualizar rutas relativas de CSS/JS/SVG/audio, el servidor estático, allowlist
   de maquetas y URL de embebido en el simulador;
3. conservar parámetros/hash de navegación, tema, día simulado y entradas de demo;
4. comprobar cargas 200 de HTML y todos los recursos referenciados;
5. probar móvil/escritorio y las rutas de API/SSE que la pantalla consume;
6. retirar alias sólo en un cambio posterior aprobado, sin borrar copias durante
   este plan.

**Salida:** interfaces sirviéndose desde la estructura aprobada, con URLs públicas
compatibles y revisión visual.

### Fase 5 · Migración del backend, hardware, datos y generadores

- Mover backend como unidad: `package.json`, README, `src`, tests, semillas y
  `web/`; actualizar imports, rutas de estáticos, archivos JSON de referencia,
  scripts de arranque y todas las pruebas de integración.
- Mantener el contrato de trama EVA, IDs de esquema, little-endian, SCET, secuencia
  y fixtures/vectores cruzados entre TypeScript, Python y C++.
- Mover pasarela y firmware sin mezclar responsabilidades ni ocultar la falta de
  prueba física del firmware.
- Mover los datos DONKI junto con fuente, fecha de consulta, rango y licencia;
  mantener la demo offline-first.
- Mover generador de pesos y CSV/JSON/JS juntos; probar regeneración determinista y
  asegurar que `pesos.js` no se edita manualmente.
- Aplicar una política independiente para `eva.db`: sólo con respaldo probado y
  backend detenido. No incluir archivos `-wal` o `-shm` huérfanos en un paquete de
  publicación.

**Salida:** backend, pasarela, firmware, esquemas, referencias y simuladores corriendo
desde sus nuevas ubicaciones; sin cambio del contrato de datos.

### Fase 6 · Integración funcional y evaluación

- Ejecutar la suite de backend y la de la maqueta; agregar cobertura de rutas tras la
  migración, no cambiar reglas clínicas dentro de una tarea de reordenamiento.
- Probar en SQLite temporal y preservar la base local existente.
- Pruebas de API: dispositivo no registrado, esquema/version, deduplicación, calidad,
  calibración, cambio de entorno, umbral, alerta/resolución y permiso de datos.
- Simulación end-to-end: backend, simulador de telemetría, consola y enlace con
  Tierra con ventana abierta/cerrada y demora configurada.
- Confirmar que el navegador muestra en vivo sólo datos del backend y rotula como
  escenario lo que sigue siendo simulado.
- Validar que el ESP32 compila y funciona en placa por separado; no bloquear la
  limpieza del repositorio por una placa inexistente, pero tampoco declarar esa
  integración completada.

**Salida:** reporte de pruebas, diferencias respecto a la línea base y evidencia de
las rutas/URLs preservadas.

### Fase 7 · Publicar y cerrar la limpieza

- Revisar diff y lista de archivos; confirmar que ningún archivo desapareció sin una
  decisión explícita de conservarlo en el archivo/historial.
- Revisar enlaces Markdown, imports, referencias relativas, rutas de servidor,
  manifiestos y scripts.
- Ejecutar pruebas completas y revisar estado limpio después de los commits.
- Actualizar el README raíz, instalación, diagrama de arquitectura, propietarios y
  tabla de fuentes de verdad.
- Fusionar mediante PR revisable; conservar rama/tag de archivo si el equipo lo
  requiere.

**Salida:** estructura documentada, reproducible y aprobada; historial preservado.

## 6. Dependencias y orden

```text
Fase 0 (respaldo y línea base)
  → Fase 1 (inventario y propietarios)
  → Fase 2 (IDs, contratos y estado de datos)
  → Fase 3 (documentación y datos)
  → Fase 4 (interfaces) ──┐
  → Fase 5 (backend/hardware) ─┼→ Fase 6 (integración y pruebas) → Fase 7 (publicación)
                               ┘
```

Las fases 4 y 5 pueden avanzar en paralelo sólo si cada equipo acuerda los destinos
y no edita a la vez rutas o contratos compartidos. Las fases 0–2 son prerequisitos:
sin inventario y copia no se debe iniciar un movimiento.

## 7. Criterios de aceptación

La reestructuración se considera terminada únicamente cuando:

- cada archivo de la línea base tiene ubicación/decisión trazable; no hay pérdida de
  contenido ni datos;
- las instrucciones de inicio funcionan desde un clon limpio con Node 22.6+;
- el backend sirve las interfaces, simulador y maquetas con las rutas públicas
  acordadas;
- central, teléfono, reloj y Tierra consumen contratos actuales; eventos SSE y
  acciones REST funcionan;
- las pruebas existentes pasan, y las nuevas pruebas de rutas cubren los destinos
  cambiados;
- simulación, fuentes reales y propuestas permanecen rotuladas correctamente;
- bases locales, credenciales y datos sensibles no se incorporaron inadvertidamente;
- documentación e índice describen la estructura final, comandos, fuentes de verdad
  y limitaciones.

## 8. Riesgos y mitigaciones

| Riesgo | Consecuencia | Mitigación |
|---|---|---|
| Rutas relativas rotas al mover pantallas | HTML abre, pero faltan estilos, iconos o scripts. | Servir una interfaz por lote; test de todos los recursos extraídos del HTML; alias durante transición. |
| Ruta base del servidor cambia | `/app`, `/reloj` o ventanas del simulador dan 404. | Corregir `RAIZ_APP`, allowlist y rutas en los tests de integración; conservar URLs hasta aprobar cambio. |
| Dos catálogos tratan distinto un ID/unidad | Umbrales o resultados se asignan a variable equivocada. | Fase 2 define un registro canónico y chequeos de consistencia. |
| Copia de archivo generado se vuelve fuente editable | Deriva entre CSV, JSON y JS. | Mantener generador y outputs juntos; prueba de regeneración y diff determinista. |
| Base SQLite se copia mientras escribe | Corrupción o pérdida de WAL. | Detener backend, usar copia consistente, verificar apertura y conservar original. |
| Variables “medidas en vuelo” se confunden con hardware conectado | Sobrepromesa clínica/técnica. | Etiquetas por variable para fuente, evidencia, captura y estado de integración. |
| Umbral terrestre se interpreta como estándar NASA | Riesgo de decisiones erróneas. | Mantener tipo `T/A`, enlace, nota y revisión de operador/inclusividad. |
| Dosis simulada se confunde con DONKI | Presentar exposición individual inventada como dato real. | Separar evento solar real de dosis y respuesta sintéticas en UI y protocolo. |
| Prototipos activos se archivan por error | Pérdida de funcionalidad o trabajo útil. | Auditoría de carpetas raíz, responsables y referencias antes de mover. |
| CSV con datos restringidos o licencia incompatible | Problemas de privacidad/reutilización. | Revisar procedencia, licencia, necesidad de conservar y política antes de publicar. |

## 9. Decisiones pendientes del equipo

1. Aprobar o modificar la estructura destino propuesta.
2. Nombrar responsables de interfaz de tripulación, reloj, backend, hardware, datos y
   referencias.
3. Determinar el destino y nivel de soporte de las carpetas raíz aún no clasificadas.
4. Acordar si los documentos históricos vuelven desde historial/ramas y dónde se
   conservan; no recuperar ni descartar en bloque.
5. Definir política para `eva.db` (local/ignorada, demostración empaquetada o datos
   semilla reproducibles) y para sus copias de seguridad.
6. Cerrar IDs/unidades de temperatura, FC en reposo, presión diastólica/PAM y mapeo
   de los 20 padecimientos frente a los 11 malestares ponderados.
7. Decidir qué evidencia adicional es necesaria antes de llamar “validado” a un
   umbral o modelo.

## 10. Documentos relacionados

- [Protocolo de investigación](Protocolo%20de%20investigaci%C3%B3n.md): variables,
  ecuaciones, umbrales, trazabilidad y límites de la evidencia.
- [README del repositorio](README.md): descripción actual y comandos de ejecución.
- [README del backend](Planeacion/Julio/backend/README.md): APIs, integración y
  pruebas.
- [README de la maqueta LUNNA](Planeacion/Leo/maqueta-eva/README.md): pantallas,
  escenarios, conexión al backend y datos simulados.
- [README del modelo de pesos](Planeacion/Leo/modelo-pesos/README.md): matriz,
  referencias, actualización bayesiana y límites.

