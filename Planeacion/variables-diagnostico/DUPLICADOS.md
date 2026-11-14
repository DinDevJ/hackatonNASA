# Registro de duplicados entre catálogos

Barrido automático de los cuatro catálogos buscando la misma medición repetida en
archivos distintos. Hecho el 14 nov 2026 por Julio.

**Por qué importa:** no es el conteo. Es que **dos personas pueden estar investigando la
misma variable** con el tiempo que queda.

---

## Regla aplicada

1. **Nunca se renumera.** Los IDs se conservan: la asignación de Iker y las referencias
   de todos apuntan a ellos.
2. **Canónica = la entrada más completa**, no la del catálogo "temáticamente correcto".
3. La entrada absorbida **no se borra**: su fila se reemplaza por un puntero visible
   `⟶ FUSIONADA en <id>`, y su contenido único se traslada a la canónica.
4. **Las referencias van cualificadas por catálogo.** `[36]` del catálogo 04 no es `[36]`
   del 01. Al fusionar se escribe `[36][45a] · cat. 01: [42][55]`.
5. 🔶 **Solo fusiono lo que cae entero dentro de mi asignación.** Lo que toca variables de
   otra persona se reporta, no se toca.

---

## ✅ Fusionado (ambas variables eran mías)

### 1. Frecuencia respiratoria · `01:V27` → `04:A2`

**Canónica: `04:A2`**, porque traía el umbral (12–18/min clínico terrestre) y el
significado clínico; `01:V27` decía "umbral: no encontrado".

Trasladado a `04:A2`: el método `ECG + sensor respiratorio`, el cambio en vuelo
(**disminuye en vuelo, n = 8**) y las referencias `cat. 01: [42][55]`. Añadido además que
es **estimable desde PPG con ±5,4 rpm** (ver `../Julio/checklist-G1-G6.md` §2).

### 2. Presión arterial · `04:A5` → `01:V1`

**Canónica: `01:V1`**, porque traía el estadiaje completo ACC/AHA y el cambio real en
vuelo (media de 24 h: sistólica −8 ± 2, diastólica −9 ± 2 mmHg, n = 8, días 85–192).
`04:A5` solo tenía `90/60–120/80`.

Trasladado a `01:V1`: la especificación del equipo (**manguito oscilométrico 20–280 mmHg,
±3 mmHg o 2 %**), el significado agudo (**choque séptico o anafilaxia, intolerancia
ortostática**) y las referencias `cat. 04: [27][36][45a]`.

### 4. Masa corporal · `02:V75` → `01:V8`

**Canónica: `01:V8`**, como propuso Julio por el detalle del instrumento. **Leo aceptó**
(14 nov 2026; `02:V75` era suya).

Trasladado a `01:V8`: el segundo equipo (**BMMD** ruso, oscilación de muelle), el umbral
**[A] mantener la pérdida < 3,3 % de la basal**, el cambio en vuelo (**n = 25: −4,4 % BMMD,
−2,8 % SLAMMD**, pérdida en los primeros 30 días y luego estable; 2–5 % en el primer mes) y
las referencias `cat. 02: [5][6][29]`.
*(`02:V35`, pérdida aguda por déficit hídrico, es una variable distinta: no se toca.)*

---

## ⚠️ Reportados, SIN tocar — le toca a su dueño

### 🔴 3. ppCO2 de cabina — **TRIPLICADO**

| ID | Nombre | Dueño |
|---|---|---|
| `01:V87` | Presión parcial de CO2 en cabina | bloque de Iker |
| `03:V77` | Presión parcial de CO2 en cabina | bloque de Iker |
| `04:A23` | ppCO2 de cabina | **mío (G6)** |

Los tres: mmHg, sensores ambientales de la nave, umbral **[A] ≤ 3 mmHg**. Son la misma
medición tres veces.

🔶 Propongo **`04:A23` canónica**: es la única con el detalle del monitor portátil (CDM
0,01–6,0 % vol.) y del monitor personal de CO2. **Iker decide**, son dos suyas.

### 5. FC en reposo · `01:V3` + `03:V18`

`01:V3` es mía · `03:V18` ("Frecuencia cardiaca en reposo / sueño") trae un dato que la
mía no tiene: **durante el sueño, prevuelo 53,3 ± 7,3 lpm**. 🔶 Propongo fusionar en
`01:V3` **conservando ese dato**.
*(`04:A4`, frecuencia cardiaca instantánea, **NO** es duplicado de `01:V3`: una es el
valor puntual y la otra la métrica en reposo. Se quedan separadas.)*

### 6. Temperatura de cabina · `03:V80` + `04:A27`

`03:V80` es de Iker · `04:A27` ("Temperatura y humedad de cabina") es mía y es más
amplia. 🔶 Propongo `04:A27` canónica.

### 7. Calcio sérico · `01:V41` + `02:V14`

Ninguna es mía: `01:V41` del bloque de Iker, `02:V14` del de Fani. **Que lo resuelvan
entre ellos.**
*(`02:V18` calcio urinario y `02:V84` ingesta de calcio son distintas.)*

### 8. HRV · `01:V43` + `03:V17`

**Iker ya lo había detectado él mismo**: `01:V43` dice literalmente *"(ya en vuestro
catálogo)"*. Solo falta cerrarlo.

### 9. ⚪ Temperatura corporal · `03:V47` + `04:A1` — probablemente NO es duplicado

`03:V47` es **temperatura corporal central**; `04:A1` es **temperatura corporal** por
termómetro oral. Métodos distintos y no intercambiables (ver `../Julio/diccionario-de-datos.md`:
la temperatura de piel no es la central). 🔶 **Dejarlas separadas**, pero que `04:A1`
aclare que es oral.

---

## Efecto en los conteos

| | Antes | Después de lo fusionado | Si se cierran los 5 reportados |
|---|---:|---:|---:|
| Variables de los 4 catálogos | 364 | **361** | ~356 |
| Total con las 24 reproductivas | 388 | **385** | ~380 |
| Asignación de Julio | 77 | **75** | — |
| Asignación de Leo | 78 | **77** | — |

🔶 **Nadie debería citar "388 variables" en la presentación** hasta cerrar los cinco
pendientes. El número correcto es mejor argumento que el número grande.

---

## Cómo repetir el barrido

```bash
cd Planeacion/variables-diagnostico
python3 -I - <<'EOF'
import re, glob, unicodedata
def norm(s):
    s = unicodedata.normalize('NFKD', s.lower())
    s = ''.join(c for c in s if not unicodedata.combining(c))
    s = re.sub(r'\(.*?\)', '', s)
    return ' '.join(re.sub(r'[^a-z0-9 ]', ' ', s).split())
rows = {}
for f in sorted(glob.glob('0[1-4]*.md')):
    for L in open(f, encoding='utf-8'):
        m = re.match(r'\s*\|\s*([VA]\d+[a-z]?)\s*\|\s*([^|]+)\|', L)
        if m:
            rows.setdefault(norm(m.group(2)), []).append(f"{f[:2]}:{m.group(1)}")
for k, v in sorted(rows.items()):
    if len(v) > 1 and len({x[:2] for x in v}) > 1:
        print(f"  {', '.join(v):<24} -> {k[:70]}")
EOF
```

⚠️ Solo detecta **nombres idénticos**. Los casos 5, 6 y 9 de arriba salieron buscando
términos sueltos a mano. **Puede haber más duplicados con nombres distintos.**
