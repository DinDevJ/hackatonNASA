# Validación externa: Inspiration4 (OSDR, abierto)

PROVISIONAL. No es un diagnóstico. Datos **reales** (no SIMULADO) de los 4 civiles de Inspiration4 (C001–C004; 3 días en órbita, 2021-09-16 → 2021-09-18 UTC).

## Fuentes (acceso público, sin registro ni acuerdo de uso)
| OSDR | Archivo | Variables del motor |
|---|---|---|
| [OSD-569](https://osdr.nasa.gov/bio/repo/data/studies/OSD-569) (LSDS-7) | `LSDS-7_Complete_Blood_Count_CBC.upload_SUBMITTED.csv` | 04:A10 leucocitos, 01:V98 linfocitos abs., 01:V99 neutrófilos abs., 01:V60 plaquetas, 01:V108 Hb, 01:V109 Hto |
| [OSD-575](https://osdr.nasa.gov/bio/repo/data/studies/OSD-575) (LSDS-8) | `LSDS-8_Comprehensive_Metabolic_Panel_CMP.upload_SUBMITTED.csv` | 01:V39 potasio, 02:V31 sodio, 02:V14 calcio |
| OSD-575 (LSDS-8) | `LSDS-8_Multiplex_serum.cardiovascular.EvePanel_SUBMITTED.csv` | 04:A13 PCR (pg/mL → mg/L) |

El metadato OSDR no declara una licencia explícita; la descarga es pública. **No se suben los crudos al repo**: el script los descarga.
No hay en OSDR datos abiertos de FC, HRV ni SpO2 de Inspiration4 (los del Apple Watch están en Jones et al. 2024, no como archivo abierto en OSDR); no se usó nada controlado (LSDA/LSAH/OSDR restringido).
Puntos: PRE L-92, L-44, L-3 · POST R+1, R+45, R+82, R+194 (no hay sangre en vuelo en estos archivos). Fechas calculadas desde lanzamiento/amerizaje; la hora de extracción no se reporta.

## Uso
```bash
cd prototipo-salud
python -m validacion.inspiration4 --dir /tmp/i4_osdr --json /tmp/i4_resultado.json
```
Evalúa de forma acumulada en cada punto, con estado temporal (no toca `eva.db`). Corre dos configuraciones: la por defecto y una de **sensibilidad** con `n0_min = 3` (el motor exige 5 puntos prevuelo, Coskun 2021).

## Resultados (corrida 2026-11-15)
- 278 filas nativas, 0 rechazadas por la puerta de calidad.
- **Configuración por defecto:** 80/80 celdas GRIS en todos los puntos. Con 3 extracciones prevuelo no hay base personal (n0 < 5) y los laboratorios no tienen referencia poblacional en el motor; el motor se niega a colorear en vez de inventar.
- **Sensibilidad n0_min = 3:** en R+1 marca potasio ↓ (C002 z −3.5, C003 z −2.4; C003 = 3.0 mmol/L, bajo el rango del laboratorio 3.5–5.3) y leucocitos ↓ en C003 (z −8.8 con 7.0 ×10³/µL, dentro de rango: la desviación prevuelo con 3 puntos es muy pequeña, lo que muestra por qué el motor pide ≥ 5). Ningún padecimiento sale ROJO; solo P17 AMARILLO en C004 en R+194.
- **Bandera del laboratorio (Quest, en el mismo archivo):** en R+1 solo el potasio de C003 (3.0) está fuera de rango; el motor lo detecta en la sensibilidad.
- **Dato dudoso en la fuente:** C003 L-92 trae plaquetas 12.9 y neutrófilos 10.1 (incompatibles con los demás puntos; probable error de unidades). La puerta de calidad no lo rechaza (es valor posible).

## Qué reportó el estudio
- Jones et al. 2024, *Nature* 632:1155 ([doi:10.1038/s41586-024-07648-x](https://doi.org/10.1038/s41586-024-07648-x)): casi todos los cambios volvieron a la línea base tras el regreso; misiones cortas sin riesgo significativo.
- Kim et al. 2024, *Nat Commun* 15:4954 ([doi:10.1038/s41467-024-49211-2](https://doi.org/10.1038/s41467-024-49211-2)): proporciones celulares estables en el vuelo, también en el CBC.
- Houerbi et al. 2024, *Nat Commun* 15:4862: cambios agudos en R+1 en coagulación, activación plaquetaria e inflamación medidos con proteómica (no con las variables del motor).

Concordancia: el motor no levanta ningún ROJO en R+1, consistente con lo reportado. Límite: es concordancia por ausencia de alertas, con n = 4, sin datos en vuelo y sin vitales.
