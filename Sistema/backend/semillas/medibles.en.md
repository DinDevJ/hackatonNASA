> 🌐 [Español](medibles.md) · **English**

# Sensor-measurable variables: what the catalog says

Team Monarcas · 2026-11-15 · Data: [`medibles.json`](medibles.json) (loaded by the backend at startup; used by the monitoring as an absolute clinical threshold)

The seven variables that the system receives from sensors (smart shirt, watch, cuff), with
what the repo's research catalogs say about each one.

**How to read it**

- **Nothing is from memory.** Every number comes from a file in the repo, and the "Where it
  comes from" column says which file and which row. Anything not in the catalog is marked **not found**.
- **[A]** = NASA threshold or validated in astronauts · **[T]** = terrestrial clinical, not
  validated in microgravity. **All vital-sign thresholds are [T]**: the catalog
  found no public NASA table for them.
- **The system does not diagnose.** It points out what to monitor and which conditions a
  deviation points to; interpretation belongs to the flight surgeon.
- The absolute thresholds **complement** the comparison with the individual's own baseline (LUNNA);
  they do not replace it. The catalog asks for exactly this: "use the crew member's own baseline".

Source abbreviations: **VMA** = `VARIABLES-MEDIDAS-ASTRONAUTAS.csv` · **PV** =
`PADECIMIENTO-VARIABLE.csv` · **cat. 01 / 03 / 04** = files in `variables-diagnostico/`
(with line number) · **index** = `variables-diagnostico/00-indice-priorizado.md`.

> **Where the cited files are today.** `VMA` and `PV` are in [`Planeacion/data/`](../../../Planeacion/data)
> (`variables/VARIABLES-MEDIDAS-ASTRONAUTAS.csv` and `padecimientos/PADECIMIENTO-VARIABLE.csv`), and `iker_variables.csv`
> is now named `variables/VARIABLES-CARDIOBASCULAR.csv`. The **row numbers** in this document correspond to
> the Nov 15 version prior to the reorganization; `PADECIMIENTO-VARIABLE.csv` was edited afterwards, so some
> rows may have moved. The `variables-diagnostico/` folder is intact in the `planeacion-archivo` tag:
> `git checkout planeacion-archivo -- Planeacion/variables-diagnostico`

---

## 1. Who has measured them in flight and how we measure them

All seven are listed as **"yes, in flight"** in the catalog.

| Variable (id) | Actual in-flight equipment | Here | Where it comes from |
|---|---|---|---|
| Heart rate (`04:A4`), bpm | ISS: ALSP automatic cuff (40–200 bpm, ±5%), Polar Heart Rate Monitor 2 (continuous during exercise), BP/ECG, CSA Bio-Monitor (shirt, since Dec 2018). At rest: Holter/ECG. Orion: ECG in the medical kit | Smart shirt with ECG and watch with PPG | VMA row 310 · cat. 04 A4 (l. 27) and table B.1 · VMA row 4 (`01:V3`) |
| SpO2 (`04:A3`), % | ISS kit pulse oximeter (ALSP/AMP), Bio-Monitor. Orion: pulse oximeter in the kit; the value "can be entered manually". Range and accuracy: not found | Watch with red/infrared PPG | VMA row 309 · cat. 04 A3 (l. 26) and B.1 |
| Respiratory rate (`04:A2`), breaths/min | Bio-Monitor (respiratory rate and volume); manual count; ECG + respiratory sensor | Smart-shirt chest band | VMA row 308 · cat. 04 A2 (l. 25) |
| Body temperature (`04:A1`), °C | Disposable oral and skin thermometers from the kits (ISS AMP; Shuttle); forehead heat-flux sensor (Thermolab, ESA/DLR, research); Bio-Monitor: skin temperature | Smart-shirt axillary thermometer | VMA row 307 · cat. 04 A1 (l. 24) and B.1 |
| Systolic (`01:V1`) and diastolic (`X:PAD`) blood pressure, mmHg | ISS: 24-h ambulatory recording with portable equipment; ALSP oscillometric cuff (20–280 mmHg, ±3 mmHg or 2%); BP/ECG; Bio-Monitor. Orion: can be recorded manually | Oscillometric cuff | VMA row 2 · cat. 01 V1 (l. 31) · cat. 04 A5 (l. 28, merged) |
| Mean arterial pressure (`X:PAM`), mmHg | No dedicated equipment or row: derived from systolic and diastolic | Calculated: (sys + 2·dia)/3 | cat. 01 V1 (l. 31) · VMA row 7 (`01:V6` uses mean BP) |

The ISS kit inventory comes from the 2011 CHeCS hardware catalog, which
cat. 04 itself describes as an "old inventory, part of it already replaced".

---

## 2. Thresholds

| Variable | Amber | Red | Type | Source cited by the catalog | Where it comes from |
|---|---|---|---|---|---|
| Heart rate | > 100 bpm at rest | not found | [T] | Range 60–100 bpm (MedlinePlus); inappropriate sinus tachycardia: resting > 100 bpm and 24-h mean > 90 (HRS 2015 consensus) | cat. 04 A4 (l. 27) · cat. 01 V3 (l. 33) |
| SpO2 | ≤ 92% ("contact") | ≤ 88% ("immediate attention") | [T], unofficial proposal | MedlinePlus, pulse oximetry | cat. 04 A3 (l. 26) and C.5 · index §2.2 |
| Respiratory rate | > 18 breaths/min | not found | [T] | Range 12–18/min (MedlinePlus) | cat. 04 A2 (l. 25) |
| Temperature | ≥ 39.4 °C sustained | ≥ 40.6 °C | [T], unofficial proposal | MedlinePlus, fever (oral values) | cat. 04 A1 (l. 24) and C.5 |
| Systolic blood pressure | < 90 or ≥ 140 mmHg | < 70 **[A]** or > 180 mmHg | [T] | ACC/AHA categories (via CDC); acute range 90/60–120/80 (MedlinePlus); < 70 = presyncope | cat. 01 V1 (l. 31) and V47 (l. 93) |
| Diastolic blood pressure | < 60 or ≥ 90 mmHg | > 120 mmHg | [T] | Same as systolic | cat. 01 V1 (l. 31) |
| Mean arterial pressure | — | — | — | **No threshold in the catalog** | — |

**How they were coded** (our own decisions about the catalog's numbers; the details are in
each variable's `nota` field):

1. If the catalog gives an explicit alert criterion, that one is used (SpO2, temperature, blood pressure).
2. If it only gives a reference range, its boundary is used as amber **only in the
   direction that the catalog associates with some condition** (high HR and RR).
3. **Catalog boundaries that are not used as alerts**, because they would fire on
   normal values of a trained adult at rest:
   - HR < 60 bpm. The same catalog records 53.3 ± 7.3 bpm in sleeping astronauts (cat. 03 V18).
   - RR < 12 breaths/min. The catalog says RR decreases in flight.
   - Temperature < 36.5 °C, and "fever likely if oral > 37.2–37.5 °C": core
     temperature rises ~1 °C in flight, so that cutoff would fire on normal values.
   - "Elevated" blood pressure (120–129) and stage 1 (130–139 or 80–89).
4. **Nuances that change the interpretation:**
   - The < 70 mmHg [A] was defined for the post-landing orthostatic test, not for
     rest in flight; here it is a safety floor.
   - The temperature values are oral and the smart shirt measures in the axilla; the catalog does not
     give the equivalence.
   - NASA sets the oxygen limit on inspired air (target PIO2 145–155 mmHg,
     minimum 127), not on SpO2. The index warns that watch SpO2 overestimates
     in hypoxemia: it must not be the only alert.
   - In flight, blood pressure drops (§3): the 90/60 boundary ends up closer to normal values.
5. **Exact limit value.** The catalog's "≤" and "≥" criteria are inclusive, but the
   system compares with "less than / greater than": a reading equal to the limit (SpO2 of 92% or 88%,
   systolic of 140) does not trigger the threshold.

---

## 3. Expected change in microgravity

| Variable | What the catalog says | n | Source | Where it comes from |
|---|---|---|---|---|
| Heart rate (resting) | No change in flight; relative bradycardia in long flights compared with short ones. Asleep: 53.3 ± 7.3 bpm before flight, no change in flight | 8 astronauts + 8 cosmonauts; sleep: Xu 2013 | Norsk 2015; Baevsky 2007; Xu 2013 | cat. 01 V3 (l. 33) · cat. 03 V18 (l. 38) |
| SpO2 | **not found** | — | — | cat. 04 A3 |
| Respiratory rate | Decreases; **magnitude not found** | 8 | Baevsky 2007; Bio-Monitor | cat. 04 A2 (l. 25) |
| Temperature | Resting **core** temperature rises gradually by ~1 °C over 2.5 months | 11 (ISS) | Stahn 2017 | cat. 04 A1 (l. 24) · cat. 03 V47 (l. 90) |
| Systolic blood pressure | 24-h mean: −8 ± 2 mmHg (days 85–192). Another study: 120 ± 10 → 106 ± 9 mmHg | 8 | Norsk 2015 / Fu 2019 | cat. 01 V1 (l. 31) |
| Diastolic blood pressure | 24-h mean: −9 ± 2 mmHg | 8 | Norsk 2015 | cat. 01 V1 (l. 31) |
| Mean arterial pressure | 24-h mean: −10 ± 3 mmHg | 8 | Norsk 2015 | cat. 01 V1 (l. 31) |

- These are all ISS data (low Earth orbit) from 8–11 people: they provide guidance but do not predict an individual.
- The +1 °C refers to **core** temperature (forehead sensor). It is not interchangeable with an
  axillary or oral reading.
- The catalog does not state whether "±" is standard deviation or standard error, nor does it assign each blood-pressure
  figure to a study; the attribution to Norsk 2015 is inferred (same n = 8 as row V2).

### Compared with LUNNA's current priors (`semillas/inicial.json`, orbit)

| Variable | Current prior | Catalog | Result |
|---|---|---|---|
| Heart rate | 0%, "no verified population change" | "No change in flight" (n = 8 + 8) | The value matches. The source text falls short: the catalog does report the data point |
| SpO2 | 0%, non-informative | not found | Consistent |
| Respiratory rate | 0% | Decreases, no magnitude | No number to use; the prior centered on 0 does not reflect the known direction |
| Temperature | +1.0 °C | ~+1 °C core (n = 11) | Matches, but it is applied to an axillary thermometer (the prior itself notes this) |
| Systolic blood pressure | −6.7% (= −8/120) | −8 ± 2 mmHg | Same origin. The 120 in the denominator is an assumption; the second study (−14 mmHg) is not used |
| Diastolic blood pressure | −11.25% (= −9/80) | −9 ± 2 mmHg | Same origin. The 80 is an assumption |
| Mean arterial pressure | −9.3%, derived from systolic and diastolic | −10 ± 3 mmHg, direct data point | **Discrepancy:** the prior does not use the catalog's direct data point |

Between-person, between-mission and day-to-day dispersion (τ₀, σ): **not in the
catalog**; in `inicial.json` they are assumptions and are labeled as such.

---

## 4. Which conditions each variable contributes to

Each cell: **weight · direction · evidence level**. It is not a diagnosis: it indicates in which
conditions a deviation in that variable carries weight.

| Condition | HR | SpO2 | RR | Temperature | Blood pressure |
|---|---|---|---|---|---|
| P01 Arrhythmia / atrial fibrillation | — | 1 ↓ C | — | — | 1 ↓ C |
| P02 Deconditioning and orthostatic intolerance | — | — | — | — | 1 ↓ C |
| P03 Hypoxia / respiratory problem | 2 ↑ B | **3 ↓ A** | **3 ↑ B** | — | 1 ↑/↓ C |
| P04 Infection, fever or immune dysregulation | 2 ↑ A | 1 ↓ B | 1 ↑ B | **3 ↑ B** | 1 ↓ B |
| P05 Sleep loss and circadian misalignment | 1 ↑ C | — | — | — | — |
| P06 Fatigue and cognitive impairment | 1 ↑ C | — | — | — | — |
| P07 CO2 exposure / headache | 1 ↑ C | — | 2 ↑ C | — | — |
| P08 Acute radiation from a solar event | 1 ↑ C | — | — | 1 ↑ C | — |
| P09 Stress / behavioral health | 1 ↑ C | — | 1 ↑ C | — | 1 ↑ C |
| P10 Decompression sickness after EVA | 1 ↑ C | 1 ↓ C | 1 ↑ C | — | 1 ↓ C |
| **Where it comes from (PV, rows)** | 33, 41, 66, 97, 128, 142, 158, 187 | 3, 34, 42, 188 | 35, 43, 129, 159, 189 | 44, 143 | 4, 23, 36, 45, 160, 190 |

- **Weight:** 1 associated marker · 2 direct causal link · 3 the variable is the mechanism.
  **Evidence:** A relationship measured with a number · B mechanism documented in a source ·
  C the team's physiological judgment, without a direct source (legend in `Leo/modelo-pesos/README.md`).
- **17 of the 25 links are level C.** The A and B links cite Smith 2013 (NEWS score),
  Mishra 2020 (watch-detected infection) and Call 2005 (fever in influenza, LR+ 1.8,
  labeled "terrestrial"). No weight in this table is validated in astronauts
  (`Leo/modelo-pesos/README.md`).
- The HR column uses the rows of `01:V3` (resting HR): PV has no rows for `04:A4`.
- The catalog treats systolic and diastolic as a single variable (`01:V1`) and does not link
  mean arterial pressure to any condition.

---

## 5. What the catalog does NOT have

1. **No [A] threshold for in-flight vital signs.** NASA-STD-3001 refers to "clinically
   accepted values" and to non-public program documents (cat. 04 C.5; index §4).
2. A red threshold for HR and RR. Thresholds for bradycardia, low respiratory rate and
   hypothermia.
3. A threshold, conditions and a dedicated row for mean arterial pressure.
4. The magnitude of the in-flight decrease in respiratory rate. The in-flight change in SpO2.
5. The equivalence between axillary, oral and core temperature. How long "sustained" lasts in the
   fever criterion.
6. Whether the blood-pressure "±" is standard deviation or standard error, and which study each
   figure comes from.
7. Between-person dispersion and day-to-day variability for any of the seven.
8. Transit, Moon or Mars data: everything measured comes from the ISS.
9. Accuracy of the flight pulse oximeter. The summary that supports the notice about watch
   SpO2 (`RESUMEN-MAESTRO.md`) is not in the repo.
10. A condition–variable link for instantaneous HR (`04:A4`).

**Reliability notices inherited by this document** (index §5): many articles were
read only as abstracts via the PubMed or Europe PMC API; the first author of
reference [63] in cat. 01 (HR > 100 bpm criterion) was recorded from memory, although the URL
was opened; the SpO2 thresholds are a terrestrial clinical proposal, not an official one.

---

## 6. Future sensor-measurable candidates (not implemented)

| Candidate (id) | Measured in flight | Our sensor | What the catalog supports | Threshold | Where it comes from |
|---|---|---|---|---|---|
| HR variability: RMSSD, SDNN, LF/HF (`01:V43`, `03:V17`) | Yes: Holter during sleep (n = 7), Bio-Monitor | Smart-shirt ECG (RR intervals) | Reduced in flight during sleep (n = 7); another row says the bands are unchanged (n = 8): **the two entries disagree** and the duplicate remains open. Contributes to P09 (weight 2, C) | No cutoff; use the individual's own baseline. Terrestrial norms: RMSSD 42 ± 15 ms, SDNN 50 ± 16 ms | VMA rows 44 and 235 · cat. 01 V43 (l. 80) · cat. 03 V17 (l. 37) · PV row 178 · `Iker/iker_variables.csv` row 14 |
| Irregular rhythm / atrial fibrillation (`01:V31`) | Yes: 48-h Holter (n = 13, no cases) | Smart-shirt ECG | Contributes to P01 with weight 3, evidence A. Only as an irregular-rhythm flag, not a diagnosis | No numeric threshold | VMA row 32 · cat. 01 V31 (l. 68) · PV row 2 · `iker_variables.csv` row 2 |
| QTc interval (`01:V34`) | Yes: Holter (n = 3) | Smart-shirt ECG | QTc > 440 ms appears in the first month of long-duration flight. Contributes to P01 (weight 2, B) | [T] 450/460 ms; risk ≥ 500. [A] > 440 ms in the astronaut study | VMA row 35 · cat. 01 V34 (l. 71) · PV row 8 |
| Pulse wave transit time (`01:V23`) | Yes: cosmonauts, 162–196 days | Smart-shirt ECG + watch PPG | Decreases in flight (n = 8); magnitude not found | not found | VMA row 24 · cat. 01 V23 (l. 53) |
| Nocturnal blood pressure dip (`01:V2`) | Yes: 24-h recording | Cuff with scheduled readings | Dip of 8 ± 3 mmHg, preserved in flight (n = 8) | not found | VMA row 3 · cat. 01 V2 (l. 32) |
| Stand test: blood pressure drop and HR rise (`01:V47`, `01:V48`) | Only before and after flight (requires gravity) | Cuff + smart shirt | Contributes to P02 (weight 3, A and weight 2, B). Applicable at landing or on the surface | [T] drop ≥ 20/10 mmHg; [T] ≥ 30 bpm; [A] systolic < 70 = presyncope | VMA rows 48 and 49 · cat. 01 V47–V48 (l. 93–94) · PV rows 16 and 17 |
| Sleep by actigraphy (`03:V30`, `03:V31`) | Yes: Actiwatch | Watch accelerometer | ISS: mean of 6.09 h, 43.8% of nights < 6 h (n = 21) | [T] 7–9 h; < 6 h is associated with worse performance | VMA rows 248 and 249 · cat. 03 V30–V31 (l. 66–67) |

Known limitation for the first three: according to `Leo/modelo-pesos/README.md`, the team's
watch does not send RR intervals; they would have to come from the smart-shirt ECG.
