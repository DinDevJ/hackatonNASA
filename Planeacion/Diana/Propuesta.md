# ORBIT — Plataforma de Monitoreo de Salud y Asistencia en Emergencias Espaciales

**Estado:** Propuesta individual para evaluación del equipo  
**Reto:** Health Monitoring Software for Space Missions  
**Tipo de solución:** Plataforma integral de monitoreo de salud y asistencia médica guiada

---

## 1. Descripción general

ORBIT es una plataforma de monitoreo integral de la salud diseñada para apoyar a los astronautas durante misiones espaciales de larga duración.

Su propósito es ayudar a los integrantes de una tripulación a conocer, evaluar y dar seguimiento a su estado de salud mediante la recopilación de indicadores fisiológicos, cognitivos y conductuales.

La propuesta tiene dos funciones principales:

1. **Monitoreo preventivo:** recopilar indicadores de salud, establecer referencias individuales, identificar cambios y proporcionar recomendaciones para favorecer el bienestar de los astronautas.
2. **Asistencia ante emergencias:** orientar a los integrantes de la tripulación cuando un compañero presenta una posible emergencia médica, facilitando la evaluación inicial, el reconocimiento de señales de alarma y el seguimiento de procedimientos de atención previamente validados.

El principal diferenciador de ORBIT es que no se limita a mostrar estadísticas o generar alertas. Busca convertir los datos de salud en información comprensible y orientación práctica para que los astronautas puedan actuar, incluso cuando no cuentan con un profesional médico físicamente presente o tienen comunicación limitada con la Tierra.

## 2. Problemática

Las misiones espaciales de larga duración exponen a los astronautas a diferentes riesgos: radiación, aislamiento y confinamiento, distancia de la Tierra, campos de gravedad alterados y ambientes cerrados y hostiles.

Estas condiciones pueden contribuir a problemas como:

- Alteraciones cardiovasculares.
- Cambios en el sistema inmunológico.
- Pérdida de densidad ósea.
- Alteraciones del sueño y fatiga.
- Problemas nutricionales y metabólicos.
- Dificultades cognitivas y de atención.
- Problemas de salud mental y conductual.

Durante una misión, los astronautas deben ser capaces de reconocer cambios en su salud y tomar medidas oportunas. Sin embargo, no necesariamente cuentan con formación médica para interpretar indicadores fisiológicos o determinar cuándo una situación requiere atención.

El problema se vuelve todavía más importante cuando un integrante de la tripulación presenta una emergencia. Sus compañeros podrían tener que ayudarlo sin contar con un médico presente y sin recibir instrucciones inmediatas desde la Tierra.

Por ello, se necesita una herramienta que no solamente recopile información, sino que también facilite su interpretación y ayude a orientar las acciones de la tripulación.

## 3. Solución propuesta

ORBIT propone una plataforma con dos modos de funcionamiento interconectados.

### 3.1. Modo de monitoreo preventivo

Permite que cada astronauta registre y consulte sus indicadores de salud durante la misión.

Los indicadores propuestos se organizan en las siguientes categorías:

| Categoría | Indicadores |
|---|---|
| Cardiovascular | Frecuencia cardíaca y presión arterial. |
| Sueño y recuperación | Horas de sueño, calidad del descanso y fatiga. |
| Cognitivo | Atención, tiempo de reacción y memoria de trabajo. |
| Bienestar conductual | Estado de ánimo, estrés percibido y síntomas reportados. |
| Metabólico y general | Temperatura corporal, glucosa e hidratación, cuando existan medios de medición adecuados. |
| Visual | Agudeza visual y pruebas funcionales de seguimiento ocular. |

El sistema podrá recibir información mediante registros manuales, dispositivos compatibles y pruebas digitales.

A partir de estos datos, ORBIT permitirá:

- Construir una línea base individual para cada astronauta.
- Consultar el historial de mediciones.
- Visualizar tendencias mediante gráficas.
- Identificar variaciones respecto a los valores habituales de cada persona.
- Mostrar alertas comprensibles según la relevancia de los cambios.
- Proporcionar recomendaciones preventivas y sugerir cuándo solicitar valoración médica.

### 3.2. Modo de asistencia ante emergencias

Este módulo representa el diferenciador principal de la propuesta.

Cuando un astronauta presente una posible emergencia médica, otro integrante de la tripulación podrá activar un protocolo de asistencia guiada.

La plataforma ayudará a organizar la evaluación inicial mediante preguntas e instrucciones sencillas, por ejemplo:

- ¿La persona responde a estímulos?
- ¿Respira normalmente?
- ¿Presenta dolor, mareos o dificultad para respirar?
- ¿Existen signos visibles de lesión?
- ¿Qué información relevante aparece en su historial médico?

Con base en las respuestas y los datos disponibles, el sistema podrá:

- Identificar señales de alarma que requieren atención inmediata.
- Orientar al usuario hacia el protocolo de emergencia correspondiente.
- Mostrar instrucciones paso a paso previamente validadas por profesionales médicos.
- Facilitar la consulta de información relevante del historial del astronauta, según los permisos establecidos.
- Preparar un reporte estructurado para comunicar la situación al personal médico en Tierra.
- Registrar las observaciones y acciones realizadas durante el incidente.

La plataforma no pretende sustituir a un médico ni emitir diagnósticos definitivos. Su función es apoyar a la tripulación para reconocer situaciones que requieren atención y seguir procedimientos apropiados sin depender de una conexión inmediata.

## 4. Diferenciador e innovación

La principal diferencia de ORBIT frente a un sistema convencional de monitoreo de salud es la integración de tres capacidades:

**1. Monitoreo personalizado**

En lugar de depender exclusivamente de valores generales, el sistema compara los indicadores actuales con la línea base y el historial de cada astronauta. Esto permite identificar cambios individuales y observar si se mantienen a lo largo del tiempo.

**2. Análisis conjunto de indicadores**

ORBIT busca identificar patrones entre diferentes dimensiones de la salud. Por ejemplo, puede mostrar que una variación en la frecuencia cardíaca coincide con menos horas de sueño y un aumento de fatiga.

Esto no significa que el sistema pueda demostrar una relación causal o predecir una enfermedad. Su propósito es ofrecer contexto y señalar patrones que merecen seguimiento.

**3. Asistencia guiada para emergencias**

Además del monitoreo cotidiano, ORBIT ofrece una herramienta para apoyar a los compañeros de tripulación cuando alguien necesita ayuda.

Esto es especialmente relevante porque los astronautas no necesariamente tienen formación médica y pueden enfrentarse a emergencias en entornos donde la asistencia profesional inmediata no está disponible.

En conjunto, ORBIT busca pasar de la simple visualización de indicadores a una herramienta que apoye la prevención, la evaluación y la respuesta ante situaciones médicas.

## 5. Funcionamiento general

El flujo principal de la plataforma sería:

1. El astronauta registra sus indicadores o realiza las pruebas correspondientes.
2. ORBIT almacena la información y actualiza su historial individual.
3. El sistema compara los resultados con la línea base personal.
4. Se identifican variaciones y posibles patrones que requieren seguimiento.
5. El astronauta recibe una explicación de los resultados y orientación sobre los siguientes pasos.
6. Si ocurre una emergencia, otro integrante puede activar el modo de asistencia.
7. La plataforma guía la evaluación inicial y facilita el acceso a protocolos previamente validados.
8. La información relevante se conserva y puede compartirse con el personal médico cuando exista comunicación disponible.

## 6. Funcionamiento sin conexión

Debido a la distancia de la Tierra y las posibles interrupciones o demoras de comunicación durante las misiones espaciales, ORBIT se plantea bajo un enfoque de funcionamiento local (*offline-first*).

Las funciones esenciales permanecerán disponibles sin conexión, incluyendo:

- Consulta del historial de salud autorizado.
- Registro de nuevos indicadores.
- Visualización de tendencias almacenadas.
- Acceso a protocolos de emergencia descargados previamente.
- Registro de incidentes y acciones realizadas.

Cuando la comunicación esté disponible, la plataforma podrá sincronizar los datos y reportes con el personal médico en Tierra.

## 7. Alcance inicial del prototipo (MVP)

Debido al tiempo disponible para el hackatón, se propone desarrollar una primera versión funcional que demuestre los componentes esenciales de ORBIT.

### Funcionalidades principales

- Perfil individual del astronauta.
- Registro de indicadores cardiovasculares.
- Registro de sueño, fatiga y estado de ánimo.
- Prueba digital breve de atención o tiempo de reacción.
- Dashboard con indicadores y gráficas históricas.
- Comparación con una línea base individual.
- Alertas explicables ante variaciones relevantes.
- Módulo de emergencia con evaluación inicial guiada.
- Acceso a un conjunto limitado de protocolos de asistencia previamente documentados.
- Almacenamiento local de información para demostrar el funcionamiento sin conexión.

### Funcionalidades futuras

- Integración con relojes inteligentes y sensores biométricos compatibles.
- Incorporación de más indicadores fisiológicos.
- Seguimiento visual y otras evaluaciones especializadas.
- Análisis longitudinal más avanzado de patrones.
- Integración con herramientas médicas de comunicación con Tierra.
- Personalización de protocolos según el entorno y las características de la misión.

## 8. Demostración propuesta

Para presentar el funcionamiento de ORBIT ante los jueces, se propone realizar una demostración con dos escenarios.

### Escenario 1: monitoreo preventivo

Se presenta el perfil de un astronauta con datos de referencia y mediciones simuladas durante varios días.

La demostración permitirá observar:

- El registro de indicadores.
- La evolución de las mediciones.
- La comparación con la línea base individual.
- La identificación de variaciones simultáneas.
- La explicación de las alertas y los pasos sugeridos.

### Escenario 2: asistencia ante una emergencia

Se simula una situación en la que un astronauta necesita atención.

Otro integrante de la tripulación activa el módulo de emergencia y responde las preguntas iniciales.

La plataforma muestra señales de alarma, orienta hacia el protocolo correspondiente y permite generar un reporte del incidente.

La demostración utilizará escenarios simulados y procedimientos documentados; no se presentarán los resultados como diagnósticos médicos reales.

## 9. Tecnologías potenciales

La selección definitiva dependerá de las capacidades y el tiempo del equipo. Algunas tecnologías que podrían utilizarse son:

- **Frontend:** React y TypeScript.
- **Interfaz:** dashboard adaptable a tabletas y computadoras.
- **Visualización:** gráficas interactivas de indicadores y tendencias.
- **Almacenamiento local:** IndexedDB u otra solución compatible.
- **Procesamiento:** análisis local de reglas y patrones.
- **Integración futura:** dispositivos biométricos y sensores compatibles.
- **Asistencia guiada:** flujos de evaluación y protocolos estructurados, con contenido médico previamente validado.

## 10. Consideraciones de seguridad y limitaciones

ORBIT es una herramienta de apoyo y no un sustituto de la atención médica profesional.

Para evitar interpretaciones peligrosas:

- Las alertas deberán basarse en criterios documentados y adecuados al contexto.
- Las recomendaciones de emergencia deberán proceder de protocolos médicos validados.
- El sistema no deberá emitir diagnósticos definitivos.
- Las situaciones críticas deberán priorizar la atención inmediata y no retrasarse por completar formularios o esperar conexión.
- Los datos simulados deberán distinguirse claramente de las mediciones reales.
- Se deberá proteger la privacidad de la información médica de cada astronauta.
- La integración con dispositivos deberá considerar la confiabilidad y las limitaciones de sus mediciones.

## 11. Impacto esperado

ORBIT busca contribuir a la seguridad y el bienestar de los astronautas mediante una herramienta que facilite el seguimiento de su salud y la respuesta inicial ante posibles emergencias.

Su propuesta de valor se centra en:

- Favorecer la detección oportuna de cambios en la salud.
- Facilitar la comprensión de indicadores fisiológicos y conductuales.
- Apoyar decisiones preventivas.
- Proporcionar orientación a tripulantes sin formación médica.
- Facilitar la comunicación de información relevante al personal médico.
- Mantener funciones esenciales disponibles durante periodos sin conectividad.

Aunque está diseñado para misiones espaciales, el concepto también podría adaptarse en el futuro a entornos aislados o de difícil acceso en la Tierra.

## 12. Pregunta central de la propuesta

**¿Cómo podemos ayudar a una tripulación sin profesionales médicos presentes a comprender los cambios en su salud, reconocer una posible emergencia y actuar oportunamente para proteger la vida de sus integrantes?**

ORBIT propone responder a esta pregunta integrando monitoreo personalizado, análisis de indicadores y asistencia guiada en una sola plataforma.

---

**Fuentes y documentación por consultar**

- NASA Human Research Program: riesgos y efectos de los vuelos espaciales sobre la salud humana.
- Recursos oficiales incluidos en la pestaña *Resources* del reto Health Monitoring Software for Space Missions.
- Documentación de NASA sobre monitoreo cardiovascular, sueño, cognición y salud conductual durante misiones espaciales.
- Protocolos oficiales de primeros auxilios y atención médica aplicables a entornos espaciales, sujetos a validación.

**Nota:** Antes de considerar la propuesta definitiva, se deberán verificar las fuentes específicas, seleccionar los indicadores que realmente se implementarán y delimitar los protocolos de emergencia que podrán demostrarse de manera segura.
