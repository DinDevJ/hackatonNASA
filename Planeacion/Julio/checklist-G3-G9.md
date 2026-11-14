# Checklist cumplido · G3, G4, G5, G7, G8 y G9

Los 54 variables restantes de mi asignación. Con esto quedan **75 de 75 cubiertas**.

✅ verificado · ⚠️ no verificado · 🔴 problema · 🔶 decisión mía

Continuación de `checklist-G1-G6.md`. La escalera de obtención (N0–N4, NT) está
definida allí, §0.

---

## 🔴 Resumen antes de entrar en detalle

Tres resultados cambian el alcance:

1. **G5 (escalas de equipo) está prácticamente muerto por licencias.** Las escalas que
   pide el catálogo son productos comerciales que no podemos distribuir.
2. **La excepción de G8 funcionó: hay glucosa humana real de vuelo espacial.** Con un
   matiz grande: no hay muestras tomadas *en* vuelo.
3. **G7 se cierra en una sola respuesta, como estaba previsto.** 16 variables, un hueco.

---

## G8 · Laboratorio — 7 variables · ✅ la excepción dio fruto

`01:V7` volumen plasmático · `01:V24` HOMA-IR y glucosa · `01:V25` biomarcadores de
estrés oxidativo e inflamación · `01:V26` renina y aldosterona · `01:V30` parámetros de
orina · `01:V51` noradrenalina plasmática · `04:A34` microbiología

### ✅ Lo que encontré en Inspiration4

| Estudio | Contenido | Cubre |
|---|---|---|
| **OSD-575** | Suero: **panel metabólico completo (CMP)** + **arreglos de citoquinas** inmunes y cardiacas | `01:V24` parcial · `01:V25` parcial |
| **OSD-569** | Sangre completa: **hemograma (CBC)**, RNA-seq, WGS | contexto inmune |

⚠️ Una fuente secundaria lista **glucosa** entre los valores del panel, junto a potasio,
sodio y albúmina. **No abrí la página oficial del estudio**: hay que confirmarlo ahí.

### 🔴 Los tres matices que hay que respetar

1. **n = 4.** Cuatro tripulantes. Con eso no se calibra nada; sirve de referencia.
2. 🔴 **No hay muestras tomadas en vuelo.** Siete tomas por persona: **tres antes del
   lanzamiento**, una al día siguiente del regreso (R+1) y tres en recuperación
   (R+45 a R+194). Es **pre y post**, no *durante*.
3. ⚠️ **HOMA-IR necesita glucosa E insulina.** La insulina no está confirmada. Sin ella,
   `01:V24` queda a medias.

🔶 **Qué significa para el producto:** estos datos **no validan un algoritmo de
monitoreo en vuelo**, porque no hay vuelo en ellos. Lo que sí dan son **valores humanos
reales de antes y después de un vuelo espacial**, que es mucho más de lo que tendría un
generador inventado. Úsense para **calibrar el módulo inmune y el rango de glucosa**, y
dígase que son pre/post.

⚠️ Licencia: una fuente de terceros menciona **CC0-1.0**. **Verificar en la página del
estudio antes de usarla.**

### Las otras 5 del grupo: hueco documentado

`01:V7`, `01:V26`, `01:V30`, `01:V51` y `04:A34`. ✅ Iker ya documentó el motivo: en la
ISS las muestras **se congelan y se analizan al regreso**. No hay laboratorio en tiempo
real. **Nivel N4.** Una respuesta, cinco variables.

### Los ocho puntos · G8

| # | Punto | Respuesta |
|---|---|---|
| 1 | Significado | ✅ Confirmado |
| 2 | Unidades y método | ✅ En los catálogos. Sangre, orina, cultivo |
| 3 | Fuentes y criterios | ✅ **[T]** glucosa en ayunas, cortes ADA: < 100 · 100–125 · ≥ 126 mg/dL |
| 4 | Datasets y licencias | ✅ **OSD-575 y OSD-569 (Inspiration4), datos humanos reales**, vía OSDR y GLOpenAPI. ⚠️ Licencia CC0 sin confirmar |
| 5 | Directa, cálculo, estimación | **Directa en laboratorio.** HOMA-IR es **cálculo** (glucosa × insulina / constante) |
| 6 | Modelos | 🔴 **Ninguno.** No existe modelo que infiera renina o noradrenalina desde un reloj. No es falta de búsqueda: **esa información no está en la muñeca** |
| 7 | Limitaciones | 🔴 Nada en tiempo real a bordo · n = 4 · **sin muestras en vuelo** · insulina sin confirmar |
| 8 | Reproducible | 🔶 Pendiente: el comando de GLOpenAPI contra OSD-575 |

---

## G7 · Ultrasonido e imagen — 16 variables · 🔵 hueco, una sola respuesta

`01:V4`, `01:V5`, `01:V9`–`01:V18`, `01:V20`, `01:V21`, `01:V22`, `01:V49`

**Las dieciséis necesitan un operador entrenado y equipo de vuelo** (GE Vivid-q,
Ultrasound 2): ecocardiografía, Doppler, ultrasonido vascular y medición de grosor
íntima-media. **Nivel N3**, y en la práctica ni siquiera eso: en la ISS el ultrasonido se
hace **guiado desde Tierra** por un especialista.

🔶 **No investigué las dieciséis por separado, y esa es la decisión correcta.** La
respuesta es la misma para todas, y el tiempo vale más en los grupos capturables.

⚠️ No busqué un dataset público y etiquetado de ultrasonido de vuelo espacial. Dado el
hueco de datos humanos que ya documentamos, **asumo que no existe** y lo marco como
supuesto, no como hallazgo.

### 🔶 Pero el reto menciona el ultrasonido, así que algo hay que hacer

La página del reto menciona *"imágenes de ultrasonido"* como entrada válida. Propongo
una **pantalla de diseño** de captura asistida, **marcada como visión futura**: cubre la
relevancia sin prometer lo que no tenemos.

### Los ocho puntos · G7

| # | Punto | Respuesta |
|---|---|---|
| 1 | Significado | ✅ Confirmado: todas son hemodinámica o morfología por imagen |
| 2 | Unidades y método | ✅ mm², mm, cm, mL, %, g. Ecografía y Doppler |
| 3 | Fuentes y criterios | ✅ Hay umbrales **[A]** reales en el catálogo (clasificación de flujo yugular grados 1–4), pero son inútiles sin la imagen |
| 4 | Datasets y licencias | ⚠️ **No buscado.** Supuesto: no existe uno público de vuelo espacial |
| 5 | Directa, cálculo, estimación | **Directa, por imagen.** `01:V49` es un índice **calculado** |
| 6 | Modelos | 🔴 Hay modelos de segmentación ecográfica en general, pero **sin imagen de entrada no sirven de nada.** El cuello de botella es el sensor y el operador, no el algoritmo |
| 7 | Limitaciones | 🔴 Operador entrenado + equipo de vuelo. En la ISS se hace guiado desde Tierra. **Fuera de alcance** |
| 8 | Reproducible | — No aplica |

---

## G9 · Derivadas — 3 variables · ✅ cerrado

`01:V6` resistencia vascular sistémica · `03:V29` fase de misión · `03:V59` horas de trabajo

**Ni sensor ni dataset.** Salen de una fórmula o del calendario. **Nivel: cálculo.**

| ID | Cómo se obtiene |
|---|---|
| `01:V6` | `RVS = (PAM − PVC) / GC`. ⚠️ **Depende de `01:V1` (manguito) y `01:V5` (ecocardiografía)**, así que hereda sus limitaciones: sin gasto cardíaco no hay RVS. **En la práctica, fuera de alcance** |
| `03:V29` | Cuarto 1–4 de la misión. Del calendario. **Trivial, y útil**: permite comparar contra el mismo tramo de misión |
| `03:V59` | Horas planificadas frente a horas reales. Del horario de misión |

🔶 `03:V59` es más valioso de lo que parece: **la diferencia entre lo planificado y lo
real es un indicador de sobrecarga que no necesita ningún sensor**, y alimenta la regla
de fatiga de nuestro escenario del día 112.

---

## G4 · Escalas individuales — 12 variables · ⚠️ el problema es la licencia

`03:V53` KSS · `03:V54` Samn-Perelli · `03:V55` escalas visuales · `03:V56` NASA-TLX ·
`03:V57` Bedford · `03:V58` Borg CR10 · `03:V60` carga de trabajo · `01:V28` edema
facial · `04:A6` cefalea · `04:A7` síntomas por CO2 · `04:A8` congestión · `04:A9` mal
de adaptación

### Estado de licencias — el punto 4 del checklist, que es el que importa aquí

| Instrumento | Licencia | Veredicto |
|---|---|---|
| **NASA-TLX** (`03:V56`) | ✅ **De NASA Ames** | ✅ **Usar.** Versión **Raw TLX**: 6 sliders en vez de 15 comparaciones |
| **Escalas visuales 0–100** (`03:V55`, `03:V60`) | ✅ **No hay instrumento que licenciar**: es un slider | ✅ **Usar.** Y además ✅ están **entre los mejores predictores del PVT en la ISS** |
| **Checklists de síntomas** (`01:V28`, `04:A6`–`A9`) | ✅ Propios | ✅ **Usar**, rotulados 🔶 como nuestros |
| **KSS** (`03:V53`) | ⚠️ **No verificada** | ⚠️ Confirmar antes de incluir |
| **Samn-Perelli** (`03:V54`) | ⚠️ No verificada | ⚠️ Confirmar |
| **Bedford** (`03:V57`) | ⚠️ No verificada | ⚠️ Confirmar |
| **Borg CR10** (`03:V58`) | 🔴 **No verificada, y hay motivo para sospechar.** Las escalas de Borg se asocian a *Borg Perception* y su uso puede requerir licencia | 🔴 **No incluir** sin confirmarlo |

🔶 **Recomendación:** armar G4 con **NASA-TLX + escalas visuales + checklists propios**.
Las tres están limpias, y la primera **es de NASA**, lo que además luce en el pitch. Las
cuatro de licencia dudosa se dejan fuera hasta confirmarlas: **no vale la pena arriesgar
una reclamación por una escala que un slider sustituye.**

### Los ocho puntos · G4

| # | Punto | Respuesta |
|---|---|---|
| 1 | Significado | ✅ Confirmado |
| 2 | Unidades | ✅ KSS 1–9 · Samn-Perelli 1–7 · TLX 6 subescalas 0–100 · Bedford 1–10 · Borg 0–10 · escalas visuales 0–100 |
| 3 | Fuentes y criterios | ✅ **[T]** KSS > 6 se asocia a deterioro. ⚠️ Iker documentó que **no existe punto de corte validado en astronautas para ninguna escala clínica**: se compara contra la línea base propia |
| 4 | Datasets y licencias | ✅ **Hecho, y es el hallazgo del grupo** (tabla arriba) |
| 5 | Directa, cálculo, estimación | **Autoinforme.** Raw TLX es el **promedio** de las seis subescalas |
| 6 | Modelos | 🔴 Ninguno, **por definición**: nadie puede inferir cómo se siente alguien desde un sensor. Pretenderlo sería justo lo que prometimos no hacer |
| 7 | Limitaciones | 🔴 Depende de la adherencia · ⚠️ sin cortes validados en astronautas · 🔴 **sesgo de autoinforme**: un tripulante puede responder "bien" si sabe que lo lee un compañero (esto ya está en la decisión de privacidad de Katy) |
| 8 | Reproducible | 🔶 Pendiente: el JSON de definición de los ítems |

---

## G5 · Escalas de equipo — 8 variables · 🔴 bloqueado por licencia

`03:V21` cohesión · `03:V22` clima de grupo (GES, WES) · `03:V23` desplazamiento de
tensión · `03:V24` conflicto diádico · `03:V25` seguridad psicológica · `03:V26`
eficacia del equipo · `03:V27` apoyo social · `03:V28` proximidad e interacción

### 🔴 El veredicto, verificado

**GES y WES son productos comerciales de Mind Garden.** Verificado en su propio sitio:

- **GES**: licencia de administración, **mínimo 50 unidades**; precios por volumen desde
  **$1,10** (1 000) hasta **$0,39** (50 000)
- **WES**: licencia de alojamiento **$2,75**, **mínimo 20 unidades**
- Mind Garden es explícito: *"los ítems del instrumento, las instrucciones, el manual,
  el informe individual, el informe grupal y cualquier otra información descriptiva
  están protegidos por derechos de autor y sólo pueden usarse con compra o permiso
  escrito"*
- Su alojamiento en línea es **"sólo para fines de investigación"**

🔴 **`03:V22` no se puede distribuir en un producto.** Y `03:V23` (desplazamiento de
tensión) se apoya en POMS, GES y WES, así que **arrastra el mismo problema**.

### 🔶 Qué hacer con G5

Tres opciones honestas, y recomiendo la primera:

1. ✅ **Dejar G5 fuera del producto y decir por qué.** *"Las escalas validadas de clima
   de equipo son instrumentos comerciales con licencia; no las distribuimos sin
   comprarlas."* **Eso es rigor, y es exactamente lo que el punto 4 del checklist
   existe para detectar.**
2. 🔶 Ítems propios, breves, **declarados como no validados**. Sirven para la
   demostración, no para investigación.
3. ⚪ `03:V28` (proximidad e interacción) es el único que **no es un cuestionario**: se
   mide con *sociometric badges*. No lo bloquea la licencia, pero **sí el hardware**, que
   no tenemos.

### Los ocho puntos · G5

| # | Punto | Respuesta |
|---|---|---|
| 1 | Significado | ✅ Confirmado |
| 2 | Unidades | ✅ Subescalas, recuentos diarios, tiempo de proximidad |
| 3 | Fuentes y criterios | ✅ Usadas en ISS, Mir y análogos (HFBP-EM). Sin cortes operativos públicos |
| 4 | Datasets y licencias | 🔴 **Hecho, y bloquea el grupo.** GES y WES son de pago (precios arriba) |
| 5 | Directa, cálculo, estimación | Autoinforme, salvo `03:V28` que es sensor |
| 6 | Modelos | 🔴 Ninguno. Y **aunque existiera, inferir conflicto entre tripulantes desde sensores es una línea que no debemos cruzar** sin consentimiento explícito |
| 7 | Limitaciones | 🔴 **Licencia comercial** · hardware ausente para `03:V28` · ⚠️ dato muy sensible: la privacidad de Katy aplica entera |
| 8 | Reproducible | — No aplica: no se implementa |

---

## G3 · Pruebas funcionales — 8 variables

`01:V8` masa corporal · `01:V19` VO2máx · `01:V46` bipedestación · `01:V50` presíncope ·
`01:V52` carga de fluidos y sal · `01:V53` prenda de compresión · `04:A1` temperatura ·
`04:A29` audiometría

### Escalera por variable

| ID | Nivel | Cómo, y qué lo limita |
|---|---|---|
| `04:A29` | **N0 (teléfono)** | 🔥 **Audiometría por app (EarQ).** Implementable en la PWA. ⚠️ Necesita auriculares y ambiente silencioso; sin calibrar no da dB absolutos, pero **sí detecta cambios contra la propia línea base**, que es justo lo que hacemos |
| `04:A1` | **N2** | Termómetro oral. ⚠️ **No confundir con temperatura de piel ni central.** ✅ Útil: la central sube ~1 °C en vuelo largo (n = 11) |
| `01:V8` | **NT / N3** | **SLAMMD**: en microgravedad no se pesa, se mide **masa inercial**. Equipo de la nave. ✅ **[A]** alerta si baja más de **3,3 %** de la basal |
| `01:V52` · `01:V53` | **N2** | Registro manual. Protocolo de reentrada. Triviales de implementar |
| `01:V46` · `01:V50` | **N2, sólo con gravedad** | Igual que G2: **no aplican en tránsito**. Van al modo de transición de gravedad |
| `01:V19` | **N3 → N1 posible** | Cicloergómetro con análisis de gases. **Pero hay salida**: existen protocolos clásicos de estimación de VO2máx desde FC en ejercicio submáximo, y `02:V52` (de Leo) es justo esa medida. ⚠️ No verifiqué cuál protocolo ni su error. **Vale la pena mirarlo: convierte un N3 en un N1** |

✅ Umbrales **[A]** reales para este grupo: VO2máx mínimo en misión **≥ 32,9** mL/kg/min
(EVA en microgravedad) y **≥ 36,5** (en superficie); capacidad aeróbica y fuerza
**≥ 80 %** de la línea base.

### Los ocho puntos · G3

| # | Punto | Respuesta |
|---|---|---|
| 1 | Significado | ✅ Confirmado. **Hallazgo: `01:V46` y `01:V50` son de transición de gravedad**, no de uso diario |
| 2 | Unidades y método | ✅ kg · mL·min⁻¹·kg⁻¹ · °C · dB HL · mL · mmHg |
| 3 | Fuentes y criterios | ✅ **El grupo con más umbrales [A] oficiales después de G6** (arriba) |
| 4 | Datasets y licencias | ⚠️ No buscados. 🔶 Baja prioridad: son protocolos, no series de datos |
| 5 | Directa, cálculo, estimación | **Directa:** A1, V8, V52, V53, A29. **Estimable:** V19 desde FC submáxima |
| 6 | Modelos | ✅ **Uno prometedor:** VO2máx desde FC submáxima, que convierte `01:V19` de N3 a N1. ⚠️ Sin verificar |
| 7 | Limitaciones | ⚠️ A29 sin calibrar no da dB absolutos · V8 necesita equipo de la nave · V46/V50 sólo con gravedad · V19 necesita ergómetro, salvo que la estimación funcione |
| 8 | Reproducible | 🔶 Pendiente: el generador de tonos para la audiometría |

---

## Cobertura final de mi asignación

| Grupo | Vars | Estado |
|---|---:|---|
| G1 wearable | 7 | ✅ Cerrado, **con código verificado** |
| G2 manguito | 3 | ✅ Cerrado |
| G6 telemetría | 11 | ✅ Cerrado |
| G3 pruebas funcionales | 8 | ✅ Cerrado, 1 modelo por verificar |
| G4 escalas individuales | 12 | ✅ Cerrado, 4 licencias por confirmar |
| G5 escalas de equipo | 8 | 🔴 **Bloqueado por licencia**, documentado |
| G7 ultrasonido | 16 | 🔵 Hueco documentado |
| G8 laboratorio | 7 | ✅ 2 con datos reales, 5 hueco documentado |
| G9 derivadas | 3 | ✅ Cerrado |
| **Total** | **75** | **75 de 75** |

### 🔶 Lo que yo le diría al equipo

De mis 75 variables, **sólo unas 25 son obtenibles a bordo** con lo que tenemos. El
resto son huecos con motivo: equipo que no existe, laboratorio que no vuela, licencias
que no compramos.

**Eso no es un fracaso del inventario: es el resultado.** Y dicho así, en una diapositiva
de limitaciones, vale más que una tabla de 388 celdas rellenas a medias.

---

## Fuentes

- NASA OSDR, misión SpaceX Inspiration4: https://osdr.nasa.gov/bio/repo/data/missions/SpaceX%20Inspiration4
- Inspiration4, guía de acceso a los datos (*npj Microgravity*): https://www.nature.com/articles/s41526-024-00393-5
- OSD-569, sangre completa: https://osdr.nasa.gov/bio/repo/data/studies/OSD-569
- Mind Garden, licencia de la Group Environment Scale: https://www.mindgarden.com/746-ges-license-to-administer.html
- Mind Garden, licencia de la Work Environment Scale: https://www.mindgarden.com/220-wes-real-transform-survey-hosting.html
