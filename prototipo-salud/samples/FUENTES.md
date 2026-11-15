# Muestras (procedencia y licencia)

Todas son muestras OFICIALES publicadas dentro de los repositorios clonados en `vendor/` (revisiones en
`vendor/REVISIONES.md`). Se copiaron sin modificar (sha256 abajo). No se descargó ningún dataset con registro.
Uso: pruebas locales, no comerciales, sin redistribución fuera del equipo. Ninguna es de astronautas.

| Archivo | Origen exacto | Licencia / condiciones | Modalidad / vista | Formato | sha256 |
|---|---|---|---|---|---|
| `echoclip_example_video.avi` | `vendor/echo_CLIP/example_video.avi` (https://github.com/echonet/echo_CLIP, commit 23cd327) | Academic Software License de Cedars-Sinai (archivo LICENSE del repo): solo uso educativo/investigación académica o sin fines de lucro, sin transferir a terceros. | Video 2D modo B; vista apical (no verificada por nosotros) | MJPEG 224×224, 113 frames, 30 fps | b50434d04509bcc6dd080095a8f3021e1f6d92c094a598d6a945f0566cc40ce0 |
| `echonet_dynamic_Example1.mp4` | `vendor/dynamic/docs/media/Example1.mp4` (https://github.com/echonet/dynamic, commit e01d029) | El repo trae LICENSE (MIT) y LICENSE.txt (prohíbe redistribución/uso del código y "associated material" sin permiso escrito). El README no indica el origen de este clip; el dataset EchoNet-Dynamic exige Research Use Agreement, así que se usa solo este archivo publicado en el repo, localmente y sin redistribuir. | Video 2D modo B; apical 4 cámaras (A4C) por inspección visual | H.264 582×582, 120 frames, 30 fps | 7a5c13107a2e28b83e6e0b0f68f4682fd869b214a4fecd6206ae5a26b8af5d78 |
| `echonet_dynamic_example_small.mp4` | `vendor/dynamic/docs/media/example_small.mp4` (mismo repo y commit) | Igual que la fila anterior | Video 2D modo B (mismo tipo que Example1, archivo distinto) | H.264 582×582, 120 frames, 30 fps | 34fd7ff392f26a35b623de5108806cc5cac3d6f67112f98df278e4c8f87f6fbd |

Notas:
- `vendor/dynamic/docs/media/0X*.mp4` NO se usan como entrada: son visualizaciones 224×112 con el video original y la
  segmentación superpuesta lado a lado (no son videos crudos).
- La vista se declara manualmente al ejecutar; no hay clasificador de vista verificado en este prototipo.


## Muestras ECG (módulo `ecg`)

**DATOS REALES PÚBLICOS de pacientes hospitalarios (MIT-BIH Arrhythmia Database y MIT-BIH Atrial Fibrillation Database, PhysioNet). NO son de Iker ni de astronautas.**

Son recortes de 180 s, sin pérdida (mismos valores ADC, mismos 2 canales, mismo formato 212), de registros públicos ya descargados en `../datos/ecg`. No son diagnóstico. Acceso abierto sin credenciales ni aceptación de términos previa (según las páginas, consultadas el 2026-11-14).

| Archivo | Origen exacto | Licencia / condiciones | Contenido | Formato | sha256 |
|---|---|---|---|---|---|
| `ecg_normal_mitdb100.hea` | `physionet:mitdb/1.0.0/100` (https://physionet.org/content/mitdb/1.0.0/) | Open Data Commons Attribution License v1.0 (ODC-By 1.0); atribución obligatoria | Cabecera WFDB (2 canales, formato 212) | texto WFDB | b270d5590ce01996b54e4d9fd5e8c94b961e3917bc072d185fcc915007590bf0 |
| `ecg_normal_mitdb100.dat` | `physionet:mitdb/1.0.0/100` (https://physionet.org/content/mitdb/1.0.0/) | Open Data Commons Attribution License v1.0 (ODC-By 1.0); atribución obligatoria | Señal ECG 2 canales, valores ADC idénticos al original | WFDB formato 212 | 81fdaff8a4c839a69fd12f47887ea6d2eb51fa5641ed667eb521179884c4a122 |
| `ecg_normal_mitdb100.atr` | `physionet:mitdb/1.0.0/100` (https://physionet.org/content/mitdb/1.0.0/) | Open Data Commons Attribution License v1.0 (ODC-By 1.0); atribución obligatoria | Anotaciones recortadas (latidos y ritmo) | WFDB annotation | 90159f7e878c0961daa718f96b92ffc34b8c06311e44e917e0407a7b1274248c |
| `ecg_fa_afdb04015.hea` | `physionet:afdb/1.0.0/04015` (https://physionet.org/content/afdb/1.0.0/) | Open Data Commons Attribution License v1.0 (ODC-By 1.0); atribución obligatoria | Cabecera WFDB (2 canales, formato 212) | texto WFDB | a8084e7e5fe609d1254d8f977f246de9c156d82b99b8e25ad48eb0ce4a49222e |
| `ecg_fa_afdb04015.dat` | `physionet:afdb/1.0.0/04015` (https://physionet.org/content/afdb/1.0.0/) | Open Data Commons Attribution License v1.0 (ODC-By 1.0); atribución obligatoria | Señal ECG 2 canales, valores ADC idénticos al original | WFDB formato 212 | 5ca3a2077b94afc6163f9882e88c56e50b4001b51d7c172e9a0e61c7ac043d9a |
| `ecg_fa_afdb04015.atr` | `physionet:afdb/1.0.0/04015` (https://physionet.org/content/afdb/1.0.0/) | Open Data Commons Attribution License v1.0 (ODC-By 1.0); atribución obligatoria | Solo anotaciones de ritmo recortadas (+ ritmo inicial añadido); el original no trae latidos | WFDB annotation | 6eb941ad66de253f256c105a7cb3795b2db10dbfd82c1683b2674862b27417ea |
| `ecg_fa_afdb04015.qrs` | `physionet:afdb/1.0.0/04015` (https://physionet.org/content/afdb/1.0.0/) | Open Data Commons Attribution License v1.0 (ODC-By 1.0); atribución obligatoria | Latidos de detector automático NO auditado | WFDB annotation | 2f016d04797b874c1f3920a3d51ed26407a3d32cf403da174169e385d1e6fdd2 |
| `ecg_extrasistoles_mitdb201.hea` | `physionet:mitdb/1.0.0/201` (https://physionet.org/content/mitdb/1.0.0/) | Open Data Commons Attribution License v1.0 (ODC-By 1.0); atribución obligatoria | Cabecera WFDB (2 canales, formato 212) | texto WFDB | 0954cdb45622cb02bd3277c2e2dac955a06f40188e17aa8b6abd1507670c6dbb |
| `ecg_extrasistoles_mitdb201.dat` | `physionet:mitdb/1.0.0/201` (https://physionet.org/content/mitdb/1.0.0/) | Open Data Commons Attribution License v1.0 (ODC-By 1.0); atribución obligatoria | Señal ECG 2 canales, valores ADC idénticos al original | WFDB formato 212 | 25f0e712c3c8d695e18d7e70e583ccf62f38a968a31b2ebfee1f809c51a3ce3b |
| `ecg_extrasistoles_mitdb201.atr` | `physionet:mitdb/1.0.0/201` (https://physionet.org/content/mitdb/1.0.0/) | Open Data Commons Attribution License v1.0 (ODC-By 1.0); atribución obligatoria | Anotaciones recortadas (latidos y ritmo) | WFDB annotation | 376cfdd23a004b6f0ce3da5b33181c1acd7e12a937f757acef694fdb17a2dced |

### ecg_normal_mitdb100
- Registro 100, MIT-BIH Arrhythmia Database v1.0.0. Canales MLII, V5. 360 Hz.
- Muestras 172800–237600 del original (480–660 s); 64800 muestras = 180 s.
- Ritmo anotado: (N durante todo el segmento (0–180 s).
- Latidos en el segmento: N=230; sin A ni V (ventana elegida por código: la primera alineada a múltiplos de 30 s sin latidos A/V; las anteriores contenían A o V).

### ecg_fa_afdb04015
- Registro 04015, MIT-BIH Atrial Fibrillation Database v1.0.0. Canales ECG1, ECG2. 250 Hz.
- Muestras 130000–175000 del original (520–700 s); 45000 muestras = 180 s.
- Ritmos (tiempos relativos al segmento; verificados con el .atr real): (N 0–13.392 s (13.4 s); (AFIB 13.392–147.428 s (134.0 s); (N 147.428–180 s (32.6 s). En el original: (AFIB en la muestra 133348, (N en 166857.
- El .atr original solo tiene anotaciones de ritmo (sin latidos). `.qrs` recortado: N=359 (detector automático, NO auditado; úsese solo como referencia no verificada).

### ecg_extrasistoles_mitdb201
- Registro 201, MIT-BIH Arrhythmia Database v1.0.0. Canales MLII, V1. 360 Hz.
- Muestras 194400–259200 del original (540–720 s); 64800 muestras = 180 s.
- Ritmos (s relativos): (N 0–14.47; (T 14.47–36.84; (N 36.84–68.09; (T 68.09–79.97; (N 79.97–101.33; (T 101.33–116.31; (N 116.31–121.02; (T 121.02–180 (T = trigeminismo). Sin (AFIB. Ventana elegida por código: la primera alineada a 30 s dentro de 188387–570586 con solo ritmos N/(T y ≥10 V.
- Latidos en el segmento: N=110, V=40, a=2 (aberrado auricular prematuro), x=4 (P no conducida); sin A.

### Cómo se generó
`python samples/crear_muestras_ecg.py` (opcional `--datos RUTA`, por defecto `../datos/ecg`). Usa wfdb 4.3.1 (`rdrecord`/`wrsamp`/`wrann`) y comprueba con `assert` que señal, latidos y ritmos releídos coinciden con el original desplazado.

**Aclaración:** en los tres `.atr` recortados, la anotación de ritmo (símbolo `+`, aux_note con la etiqueta vigente) en la muestra 0 la AÑADIÓ el script para conservar el ritmo vigente al inicio del segmento; no está en esa posición en el original. En las tres es `(N`. El `.qrs` de AFDB es salida de un detector automático no auditada.

### Licencia verificada
Páginas consultadas el 2026-11-14 (WebFetch): https://physionet.org/content/mitdb/1.0.0/ y https://physionet.org/content/afdb/1.0.0/. Ambas muestran la licencia **Open Data Commons Attribution License v1.0** y dicen "Anyone can access the files, as long as they conform to the terms of the specified license" (acceso abierto; el login solo sirve para ver el contacto del autor). Se exige atribución con las citas siguientes.

### Citas requeridas
MIT-BIH Arrhythmia Database (según https://physionet.org/content/mitdb/1.0.0/):
- Moody, G., & Mark, R. (2005). MIT-BIH Arrhythmia Database (version 1.0.0). PhysioNet. RRID:SCR_007345. https://doi.org/10.13026/C2F305
- Moody GB, Mark RG. The impact of the MIT-BIH Arrhythmia Database. IEEE Eng in Med and Biol 20(3):45-50 (2001). PMID: 11446209. https://doi.org/10.1109/51.932724
- Cita estándar de PhysioNet (la página la da ahora así, no como Goldberger et al. 2000): Pollard, T., et al. (2026). PhysioNet as a global platform for biomedical research. Nature Health. https://doi.org/10.1038/s44360-026-00096-z

MIT-BIH Atrial Fibrillation Database (según https://physionet.org/content/afdb/1.0.0/):
- Moody GB, Mark RG. A new method for detecting atrial fibrillation using R-R intervals. Computers in Cardiology 10:227-230 (1983). http://ecg.mit.edu/george/publications/afib-cinc-1983.pdf (sin DOI en la página)
- Dataset DOI v1.0.0: 10.13026/C2MW2D
- Cita estándar de PhysioNet: Pollard, T., Moody, B. E., Lehman, L., Gow, B., Fernandes, C., Xie, C., Johnson, A., Mark, R. G., & Heldt, T. (2026). PhysioNet as a global platform for biomedical research. Nature Health. DOI 10.1038/s44360-026-00096-z

Nota: licencia, política de acceso y citas se contrastaron además contra el HTML de ambas páginas (descargado con `curl` el 2026-11-14, sin iniciar sesión): el texto de la licencia, el DOI de cada base, la cita de Moody & Mark y la cita estándar de PhysioNet (Pollard et al. 2026, Nature Health 1(8):792–795) aparecen literalmente en el bloque "please cite" de cada página.

### Copias de registros completos en la validación
`validacion/ecg/runs/<run_id>/input/` guarda una copia sin modificar de cada registro analizado en la validación del
módulo ECG: 100, 201 y 203 de la MIT-BIH Arrhythmia Database v1.0.0 (`.hea`, `.dat`, `.atr`) y 04015 de la MIT-BIH
Atrial Fibrillation Database v1.0.0 (`.hea`, `.dat`, `.atr`, `.qrs`). Misma licencia (ODC-By 1.0) y mismas citas que
arriba. Son también **datos reales públicos de pacientes hospitalarios, no de Iker ni de astronautas**.
