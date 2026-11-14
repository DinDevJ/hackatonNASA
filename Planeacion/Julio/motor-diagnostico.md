# Motor diagnóstico probabilístico — diseño y reglas de honestidad

Cómo el software ordena hipótesis ante un evento agudo sin mentirle a nadie.

✅ verificado · ⚠️ verificar · 🔶 decisión nuestra

---

## 0. El problema del 70 %

La idea es correcta. El número es el riesgo.

Una probabilidad posterior honesta necesita tres cosas:

    P(enfermedad | hallazgos)  ∝  P(enfermedad) × P(hallazgos | enfermedad)
                                   └── prior ──┘   └──── verosimilitud ────┘

- **El prior sí lo tenemos.** Hay epidemiología publicada de eventos médicos en vuelo
  (ver §1). Es un dato real y citable.
- **La verosimilitud no la tenemos.** No existe, que yo encuentre, un cuerpo de
  *likelihood ratios* validados para hallazgos clínicos en microgravedad.

**Conclusión:** si inventamos la verosimilitud, el 70 % es teatro. Y un sistema que
produce confianza falsa es exactamente lo contrario de lo que pediste.

**Pero el pecado no es el número: es el número sin procedencia.** Sí se puede mostrar
un porcentaje, con una condición innegociable — que cada parte de ese número sea
rastreable en pantalla.

---

## 1. ✅ Los priors que sí existen — úsenlos

Esto es lo mejor que encontré hoy. **Hay epidemiología real de eventos médicos en vuelo:**

| Fuente | Población | Hallazgo |
|---|---|---|
| **Crucian et al. (2016)**, *Int J Gen Med* | 46 tripulantes ISS de larga duración, 20.57 años-vuelo | **≈3.40 eventos por año-vuelo.** Erupciones cutáneas ≈1.12/año-vuelo · síntomas respiratorios altos ≈0.97/año-vuelo. 46 % tuvo al menos un evento notable |
| **Revisión NASA basada en IMM**, Expediciones 1–28/29 | 37 astronautas EE.UU., 16.75 años-persona | Reacciones alérgicas ≈0.1/año-vuelo · congestión, rinitis o estornudos ≈0.7/año-vuelo |
| **Era del transbordador**, STS-1 a STS-89 | 508 personas | 1 867 eventos médicos registrados |

⚠️ **Caveats que los autores mismos señalan, y que hay que repetir:** en órbita los
diagnósticos rara vez se confirman por falta de laboratorio, así que trabajaron con
**síntomas reportados**, no con diagnósticos. Los totales son un **mínimo**: hay eventos
que nunca se registraron. El trabajo de Crucian es una tabulación, no una encuesta
epidemiológica formal.

Decir eso en voz alta durante la presentación vale más que el dato mismo.

### ⚠️ Y una que cambia el encuadre: NASA ya tiene un modelo así

Se llama **IMM — Integrated Medical Model**, y usa justamente datos históricos para
simular el riesgo médico de misiones futuras.

Eso **no nos quita el proyecto, nos lo valida.** Pero obliga a ser precisos sobre el
hueco que llenamos:

> 🔶 El IMM, hasta donde entiendo, es un modelo de **planificación en tierra**: estima
> riesgo agregado de misión. Lo nuestro es **en vuelo, en tiempo real y personalizado**
> con la línea base del individuo. **⚠️ Verificar esta afirmación antes de decirla en el
> escenario.** Si resulta que el IMM también corre a bordo, hay que reformular — pero
> aun así la personalización con 112 días de datos propios sigue siendo nuestra.

---

## 2. La arquitectura en tres capas

### Capa 1 — Acciones que no dependen del diagnóstico

**Van siempre primero, antes de cualquier hipótesis.** Ante un colapso, los primeros
pasos no cambian según la causa: responde / vía aérea / pulso. Esta capa es segura
bajo cualquier hipótesis, y es la que permite enviar el producto sin inventar medicina.

🔶 Regla de diseño: **ninguna rama diagnóstica se muestra antes de completar la capa 1.**

### Capa 2 — Diferencial ordenado por evidencia

Cada hipótesis declara qué la apoya, qué la contradice, y cómo refutarla.

```yaml
- id: HIPO-ORTO
  nombre: "Intolerancia ortostática"
  prior:
    valor: 0.21
    fuente: "Crucian et al. 2016 — tabla de incidencia"
    nota: "⚠️ adaptado; la fuente reporta por año-vuelo, no por evento de colapso"
  evidencia_a_favor:
    - { senal: pa_sistolica,     dir: baja,  peso: alto }
    - { senal: fc,               dir: alta,  peso: medio, nota: "taquicardia compensatoria" }
    - { contexto: eva_ultimas_8h,            peso: alto }
    - { senal: ingesta_fluidos_7d, dir: baja, peso: medio }
  evidencia_en_contra:
    - { senal: spo2, dir: baja }
  accion: ELEVAR-01
  respuesta_esperada: "recupera conciencia en 60 s"
  si_no_responde: "registrar en contra y re-ranquear"
  prueba_discriminante: "PA en decúbito vs. sentado"
```

🔶 **Los pesos son nuestros y están declarados en texto plano.** Esa es la diferencia
entre un modelo auditable y una caja negra. En la demo se abre el archivo.

### Capa 3 — La rama se bifurca según quién atiende

Esto que planteaste es, para mí, la mejor parte de tu idea:

| | **Tripulante sin formación médica** | **CMO** |
|---|---|---|
| Objetivo | **Actuar con seguridad ya** | **Reducir la incertidumbre** |
| Qué muestra | Un paso a la vez, sin alternativas | El diferencial completo con su evidencia |
| Qué pide | Observaciones simples: ¿responde? ¿respira? | Mediciones: PA en dos posiciones, glucometría, ecografía |
| Criterio de avance | ¿Respondió a la acción? | ¿Qué prueba discrimina más? |

### El bucle de refutación — lo que pediste

> *"y si no reacciona pasa al siguiente diagnóstico más probable"*

Exacto, pero con un encuadre que importa: **no es que el diagnóstico falló. Es que
apareció evidencia nueva.**

    ① Hipótesis 1 encabeza el orden
    ② Se ejecuta su acción inmediata
    ③ ¿Ocurrió la respuesta esperada en el tiempo esperado?
         SÍ  → se confirma. Continúa ese protocolo.
         NO  → se registra como evidencia EN CONTRA de la hipótesis 1
    ④ Re-ranquea con la evidencia nueva
    ⑤ Vuelve a ②

Cada iteración queda **sellada con su SCET**. Tierra recibe no sólo el desenlace, sino
**el razonamiento completo con sus tiempos**. Eso, para un cirujano de vuelo que
reconstruye un incidente a 20 minutos de distancia, no tiene precio.

### Para el CMO: elegir la prueba que más discrimina

No se trata de pedir todos los análisis. Se trata de pedir **el que más separa a las
hipótesis que van arriba**. Es el principio de *valor de la información*:

🔶 Implementación simple y suficiente: para cada prueba disponible, calcular cuánto
cambiaría el orden si saliera positiva y cuánto si saliera negativa. Proponer la de
mayor cambio esperado. No hace falta teoría de la información formal para que esto
funcione y se vea bien.

---

## 3. ⚠️ Reglas de honestidad — innegociables

Pediste que fuera seguro y confiable. Esto es lo que eso significa en concreto:

1. **Nunca se llega al 100 %.** Se llega a *"suficiente para actuar"*. Decirlo en la
   presentación es una fortaleza, no una debilidad.
2. **Ningún número sin procedencia visible.** Si se muestra 65 %, un toque debe revelar:
   el prior, su fuente, los hallazgos que lo movieron y los pesos declarados.
3. **La palabra "diagnóstico" no aparece en la UI** para el tripulante sin formación
   médica. Aparece *"orden de revisión según los datos"*.
4. **La evidencia en contra se muestra igual de grande que la evidencia a favor.** Un
   sistema que sólo enseña lo que apoya su hipótesis es un sistema que engaña.
5. **El contenido clínico no se inventa.** Marcado como ilustrativo, o con fuente.
6. **Se muestra lo que el sistema NO sabe.** Un panel de "datos faltantes" que diga
   *"sin PA en las últimas 6 h — esto limita la confianza del orden"*.

La regla 6 es la que más va a impresionar. **Casi ningún equipo muestra su propia
ignorancia, y es justo lo que un evaluador científico busca.**

---

## 4. La pantalla

```
┌──────────────────────────────────────────────┐
│  COLAPSO · MS-2 · T+0:14        [CMO: NO]    │
├──────────────────────────────────────────────┤
│  PRIMERO, sin importar la causa:             │
│   ① ¿Responde?   ② Vía aérea   ③ Pulso       │
│   Estos pasos no dependen del diagnóstico.   │
├──────────────────────────────────────────────┤
│  ORDEN DE REVISIÓN SEGÚN LOS DATOS           │
│                                              │
│  1 · Intolerancia ortostática          65 %  │
│      ✓ PA sistólica   z −2.8                 │
│      ✓ EVA hace 6 h                          │
│      ✓ Fluidos 40 % bajo su media de 7 d     │
│      ✗ (nada en contra)                      │
│      [ ¿de dónde sale este 65 %? ]           │
│                                              │
│  2 · Evento cardíaco                   18 %  │
│      ✓ FC irregular                          │
│      ✗ sin dolor torácico reportado          │
├──────────────────────────────────────────────┤
│  ⚠ LO QUE NO SÉ                              │
│    Sin presión arterial de las últimas 6 h.  │
│    Esto limita la confianza de este orden.   │
├──────────────────────────────────────────────┤
│  Esto NO es un diagnóstico. Es un orden de   │
│  revisión basado en 112 días de datos.       │
└──────────────────────────────────────────────┘
```

El botón **"¿de dónde sale este 65 %?"** es, en mi opinión, el elemento más valioso de
toda la interfaz de cara al jurado. Demuestra en un toque que el número no es magia.

---

## Fuentes

- Crucian et al. (2016), incidencia de síntomas clínicos en vuelo orbital de larga duración: https://pmc.ncbi.nlm.nih.gov/articles/PMC5098747
- NASA NTRS, revisión de eventos médicos basada en IMM (Exp. 1–28/29): https://ntrs.nasa.gov/api/citations/20160012380/downloads/20160012380.pdf
- National Academies, *Safe Passage: Astronaut Care for Exploration Missions*: https://www.nationalacademies.org/read/10218/chapter/5
- NASA, evaluación de riesgo médico para misión a Marte: https://www.nasa.gov/wp-content/uploads/2026/08/medical-risk-assessment-for-an-accelerated-and-standard-mars-mission.pdf
