# VISOR — Visual Monitoring System for Space Missions

> **Propuesta de solución | NASA Space Apps Challenge 2026**
>
> Desafío: [Create Health Monitoring Software for Astronauts on Space Missions](https://www.spaceappschallenge.org/2026/challenges/health-monitoring-software/)
>
> Estado: Propuesta para evaluación del equipo.
>
> Nombre provisional: VISOR.

---

## 1. Resumen ejecutivo

VISOR es una propuesta de software para el monitoreo funcional de la salud visual de astronautas durante misiones espaciales prolongadas.

Su objetivo es facilitar evaluaciones visuales periódicas, registrar los resultados y detectar variaciones respecto a la línea base individual de cada astronauta.

La aplicación integraría pruebas visuales autoadministradas, seguimiento histórico, análisis de tendencias y alertas explicables. Su diseño estaría orientado al funcionamiento local, sin depender de una conexión permanente con la Tierra.

La propuesta toma como referencia los desafíos asociados al Spaceflight-Associated Neuro-ocular Syndrome (SANS), una condición relacionada con cambios neuro-oculares observados durante los vuelos espaciales.

VISOR no pretende diagnosticar SANS ni sustituir evaluaciones oftalmológicas. Busca proporcionar una herramienta complementaria para identificar cambios funcionales que puedan requerir seguimiento médico.

## 2. Problema identificado

Las misiones espaciales prolongadas exponen a los astronautas a condiciones que pueden producir cambios fisiológicos y afectar diferentes sistemas del organismo.

Entre estos riesgos se encuentra el Spaceflight-Associated Neuro-ocular Syndrome (SANS), asociado con alteraciones en estructuras oculares y visuales durante los vuelos espaciales.

La NASA cuenta con procedimientos de evaluación ocular antes, durante y después de las misiones. Sin embargo, algunas pruebas especializadas requieren equipos específicos, asistencia médica o interpretación profesional.

Además, existe una oportunidad de ampliar el seguimiento funcional de la visión y facilitar la identificación de cambios respecto al estado habitual de cada astronauta.

**Pregunta central:**

¿Cómo podemos facilitar el seguimiento de la función visual de los astronautas durante misiones espaciales prolongadas, identificando cambios relevantes sin depender de evaluaciones médicas presenciales constantes?

## 3. Usuarios objetivo

**Usuario principal:**
- Astronautas que participan en misiones espaciales de larga duración.

**Usuario secundario:**
- Crew Medical Officer (CMO).
- Personal médico y especialistas en salud espacial en Tierra.

## 4. Solución propuesta

Desarrollar una aplicación multiplataforma que permita al astronauta realizar evaluaciones visuales periódicas mediante una tableta o dispositivo compatible.

La aplicación recopilará los resultados, los comparará con una línea base individual y mostrará su evolución a lo largo de la misión.

### Funcionalidades principales

**4.1. Evaluación visual autoadministrada**

Batería de pruebas digitales que podría incluir:

- Agudeza visual cercana.
- Rejilla de Amsler digital para identificar distorsiones visuales.
- Sensibilidad al contraste, si se consigue una implementación con condiciones de visualización suficientemente controladas.

**4.2. Línea base individual**

Registro de las primeras evaluaciones para establecer una referencia personal.

Las evaluaciones posteriores se compararán con esa referencia y con las mediciones anteriores.

**4.3. Seguimiento histórico**

Visualización de tendencias mediante gráficas que permitan observar cambios en los resultados de las pruebas durante la misión.

**4.4. Alertas explicables**

Sistema de indicadores visuales:

- Verde: resultados sin variaciones relevantes detectadas.
- Amarillo: cambios respecto a la línea base que ameritan seguimiento.
- Rojo: variaciones importantes que requieren revisión médica.

Los indicadores no representan diagnósticos ni determinan la aptitud médica del astronauta.

**4.5. Funcionamiento Offline-First**

La aplicación podrá almacenar las evaluaciones localmente, consultar el historial y realizar el análisis sin conexión a internet.

Cuando exista comunicación disponible, podrá sincronizar un resumen de los resultados con el personal médico en Tierra.

## 5. Diferenciador e innovación

VISOR busca pasar de evaluaciones visuales aisladas a un seguimiento funcional longitudinal y personalizado.

Sus principales diferenciadores serían:

1. **Personalización:** comparación de los resultados con la línea base individual del astronauta.
2. **Accesibilidad:** pruebas autoadministradas desde un dispositivo portátil.
3. **Seguimiento continuo:** registro de evaluaciones y visualización de tendencias.
4. **Análisis explicable:** identificación de qué prueba presentó una variación y cómo evolucionó.
5. **Autonomía operativa:** funcionamiento local sin conexión permanente con la Tierra.

La innovación no consiste en inventar nuevas pruebas oftalmológicas, sino en integrar evaluaciones funcionales, seguimiento individual y gestión de información en una herramienta adaptada a las condiciones operativas de misiones espaciales.

## 6. Alcance del MVP

Para el prototipo del hackathon se propone desarrollar:

| Módulo | Funcionalidad |
|---|---|
| Perfil | Identificación del astronauta y su línea base |
| Pruebas visuales | Agudeza cercana y Amsler digital |
| Registro | Almacenamiento local de resultados |
| Análisis | Comparación con evaluaciones anteriores |
| Dashboard | Gráficas de evolución visual |
| Alertas | Indicadores de cambios y recomendaciones de seguimiento |
| Offline | Consulta y registro sin internet |

La sensibilidad al contraste y el posicionamiento asistido por cámara se considerarán funcionalidades adicionales, sujetas a la viabilidad técnica y a la calibración del dispositivo.

## 7. Experiencia de demostración

La demostración permitirá que un evaluador conozca el funcionamiento de la aplicación.

1. Se crea un perfil de astronauta con resultados de referencia.
2. Se realiza una evaluación visual.
3. Se registra un escenario de cambio visual controlado mediante datos simulados o una transformación gráfica de prueba.
4. El sistema compara los resultados.
5. Se genera una alerta explicando qué cambió.
6. El usuario consulta el historial y las recomendaciones de seguimiento.
7. Se demuestra el almacenamiento local sin conexión.

Las variaciones inducidas durante la demostración serán escenarios de prueba, no evidencia de detección clínica de SANS.

## 8. Tecnologías potenciales

- Aplicación web progresiva (PWA).
- React o tecnología equivalente para la interfaz.
- IndexedDB para almacenamiento local.
- Gráficas para visualización histórica.
- Procesamiento local para comparación de resultados.
- Cámara del dispositivo para asistencia de posicionamiento, si resulta viable.

La arquitectura definitiva dependerá de las capacidades del equipo y del tiempo disponible.

## 9. Fundamento científico y recursos

Fuentes iniciales para fundamentar la propuesta:

1. [NASA Human Research Roadmap — Risk of Spaceflight Associated Neuro-ocular Syndrome](https://humanresearchroadmap.nasa.gov/Evidence/reports/SANS.pdf)

2. [NASA — Spaceflight Associated Neuro-ocular Syndrome, Technical Brief](https://www.nasa.gov/wp-content/uploads/2024/02/ochmo-mtb-001-sans.pdf)

3. [The Case for Expanding Visual Assessments During Spaceflight](https://pubmed.ncbi.nlm.nih.gov/37365808/)

4. [NIH — Investigación sobre evaluaciones visuales durante vuelos espaciales](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10445111/)

**Pendiente:** identificar e integrar al menos un recurso específico de la pestaña Resources del desafío oficial de Space Apps 2026, requisito importante para optar a los Global Awards.

## 10. Riesgos y limitaciones

- Las pantallas de consumo no necesariamente están calibradas para evaluaciones visuales clínicas.
- La distancia, iluminación, resolución y brillo pueden afectar los resultados.
- La familiarización con las pruebas puede producir efectos de aprendizaje.
- Las evaluaciones funcionales no sustituyen estudios estructurales como OCT.
- Las alertas no deben interpretarse como diagnósticos.
- Los resultados deben ser revisados por profesionales médicos cuando corresponda.

## 11. Impacto esperado

VISOR busca contribuir a la autonomía de los astronautas mediante una herramienta accesible para registrar y comprender cambios en su función visual durante misiones prolongadas.

Su enfoque podría facilitar el seguimiento individual, mejorar la disponibilidad de información para el personal médico y apoyar la identificación temprana de variaciones que requieran atención.

---

## 12. Pregunta para el equipo

¿Podemos convertir el monitoreo visual personalizado en una herramienta práctica, científicamente fundamentada y técnicamente viable para apoyar la salud de los astronautas durante misiones espaciales de larga duración?

**La propuesta está abierta a discusión, ajustes y comparación con otras soluciones del equipo.**
