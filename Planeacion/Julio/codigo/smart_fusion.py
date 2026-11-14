"""
Smart Fusion: estimación de frecuencia respiratoria a partir del PPG.

Implementa la estructura descrita por Karlen et al., "Multiparameter Respiratory
Rate Estimation From the Photoplethysmogram" (IEEE TBME):

  1. Del PPG se extraen tres variaciones inducidas por la respiración:
       RIFV  variación de la frecuencia   (intervalo latido a latido)
       RIIV  variación de la intensidad   (valor del pico, deriva de línea base)
       RIAV  variación de la amplitud     (pico menos valle precedente)
  2. Cada serie da su propia estimación de frecuencia respiratoria.
  3. Las tres se fusionan promediándolas.
  4. Se calcula la desviación estándar entre las tres y se descartan las
     ventanas con desviación alta: el estimador dice "no sé" por sí solo.

AVISO DE HONESTIDAD
  Karlen usa "Incremental-Merge Segmentation" (IMS) para la detección de latidos.
  No verifiqué la especificación del IMS, así que aquí se usa una detección de
  picos estándar. Esto es "Smart Fusion tal como está descrito", no una
  reimplementación verificada del artículo original.

  El umbral de descarte tampoco se pudo verificar en el artículo, así que este
  módulo lo deja como parámetro y el script de validación lo determina
  empíricamente sobre datos reales.

Sin dependencias de aprendizaje automático: sólo numpy y scipy.signal.
"""
from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from scipy import signal as sig

# Banda respiratoria plausible en reposo: 6 a 36 respiraciones por minuto.
RESP_BAND_HZ = (0.1, 0.6)
# Frecuencia a la que se remuestrean las tres series antes del análisis espectral.
RESAMPLE_HZ = 4.0


@dataclass(frozen=True)
class WindowEstimate:
    """Estimación de una ventana, con su propia medida de confianza."""

    t_center_s: float
    rr_rifv: float | None
    rr_riiv: float | None
    rr_riav: float | None
    rr_fused: float | None
    """Media de las tres. None si la ventana se descarta."""
    sd_between: float | None
    """Desviación estándar entre las tres estimaciones, en resp/min."""
    n_beats: int
    discarded: bool
    reason: str = ""


def _bandpass(x: np.ndarray, fs: float, lo: float, hi: float, order: int = 2) -> np.ndarray:
    nyq = fs / 2.0
    lo_n, hi_n = max(lo / nyq, 1e-6), min(hi / nyq, 0.99)
    if lo_n >= hi_n:
        return x
    b, a = sig.butter(order, [lo_n, hi_n], btype="band")
    return sig.filtfilt(b, a, x)


def detect_beats(ppg: np.ndarray, fs: float) -> tuple[np.ndarray, np.ndarray]:
    """
    Detecta picos sistólicos y el valle que precede a cada uno.

    Devuelve (índices de pico, índices de valle). Un valle vale -1 si no se
    encontró, y esos latidos se excluyen del cálculo de RIAV.
    """
    # Banda del pulso cardiaco: 0.5 a 8 Hz (30 a 480 lpm, holgado a propósito).
    filt = _bandpass(ppg, fs, 0.5, 8.0, order=2)
    # Distancia mínima entre latidos: 0.3 s, es decir un máximo de 200 lpm.
    peaks, _ = sig.find_peaks(filt, distance=int(0.3 * fs))
    troughs = np.full(peaks.shape, -1, dtype=int)
    for i, p in enumerate(peaks):
        lo = peaks[i - 1] if i > 0 else max(0, p - int(fs))
        if p > lo:
            troughs[i] = lo + int(np.argmin(filt[lo:p]))
    return peaks, troughs


def _rr_from_series(t: np.ndarray, y: np.ndarray) -> float | None:
    """
    Frecuencia respiratoria dominante de una serie irregular, en resp/min.

    Remuestrea a malla uniforme, filtra a la banda respiratoria y toma el pico
    del espectro.
    """
    if len(t) < 8:
        return None
    y = np.asarray(y, dtype=float)
    if not np.all(np.isfinite(y)) or np.ptp(y) == 0:
        return None

    dur = t[-1] - t[0]
    if dur < 10.0:  # menos de 10 s no resuelve la banda respiratoria
        return None

    grid = np.arange(t[0], t[-1], 1.0 / RESAMPLE_HZ)
    y_u = np.interp(grid, t, y)
    y_u = y_u - np.mean(y_u)
    y_u = _bandpass(y_u, RESAMPLE_HZ, *RESP_BAND_HZ, order=2)

    # Espectro con ventana de Hann y relleno de ceros para afinar la resolución.
    n = int(2 ** np.ceil(np.log2(max(len(y_u) * 4, 256))))
    spec = np.abs(np.fft.rfft(y_u * np.hanning(len(y_u)), n=n))
    freqs = np.fft.rfftfreq(n, d=1.0 / RESAMPLE_HZ)

    band = (freqs >= RESP_BAND_HZ[0]) & (freqs <= RESP_BAND_HZ[1])
    if not np.any(band) or np.all(spec[band] == 0):
        return None
    return float(freqs[band][int(np.argmax(spec[band]))] * 60.0)


def smart_fusion(
    ppg: np.ndarray,
    fs: float,
    window_s: float = 32.0,
    step_s: float = 1.0,
    sd_threshold: float = 4.0,
    min_beats: int = 8,
) -> list[WindowEstimate]:
    """
    Recorre la señal por ventanas y devuelve una estimación por ventana.

    `sd_threshold` es el umbral de descarte por desacuerdo entre las tres
    estimaciones, en resp/min. El valor por defecto de 4.0 es el que se cita en
    la literatura secundaria; NO está verificado en el artículo original.
    """
    ppg = np.asarray(ppg, dtype=float)
    peaks, troughs = detect_beats(ppg, fs)
    if len(peaks) < min_beats:
        return []

    t_beats = peaks / fs
    riiv_all = ppg[peaks]
    riav_all = np.where(troughs >= 0, ppg[peaks] - ppg[np.maximum(troughs, 0)], np.nan)
    rifv_all = np.diff(t_beats, prepend=t_beats[0] - np.median(np.diff(t_beats)))

    out: list[WindowEstimate] = []
    total_s = len(ppg) / fs
    for start in np.arange(0.0, max(total_s - window_s, 0.0) + 1e-9, step_s):
        end = start + window_s
        sel = (t_beats >= start) & (t_beats < end)
        n_beats = int(np.sum(sel))
        center = start + window_s / 2.0

        if n_beats < min_beats:
            out.append(WindowEstimate(center, None, None, None, None, None, n_beats,
                                      True, "pocos latidos"))
            continue

        t_w = t_beats[sel]
        ok = ~np.isnan(riav_all[sel])
        ests = {
            "rifv": _rr_from_series(t_w, rifv_all[sel]),
            "riiv": _rr_from_series(t_w, riiv_all[sel]),
            "riav": _rr_from_series(t_w[ok], riav_all[sel][ok]) if np.sum(ok) >= 8 else None,
        }
        vals = [v for v in ests.values() if v is not None]

        if len(vals) < 3:
            out.append(WindowEstimate(center, ests["rifv"], ests["riiv"], ests["riav"],
                                      None, None, n_beats, True,
                                      "menos de 3 estimaciones válidas"))
            continue

        sd = float(np.std(vals, ddof=0))
        if sd > sd_threshold:
            out.append(WindowEstimate(center, ests["rifv"], ests["riiv"], ests["riav"],
                                      None, sd, n_beats, True,
                                      f"desacuerdo SD={sd:.1f}"))
            continue

        out.append(WindowEstimate(center, ests["rifv"], ests["riiv"], ests["riav"],
                                  float(np.mean(vals)), sd, n_beats, False))
    return out
