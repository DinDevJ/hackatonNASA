"""LUNNA · video de 30 s (horizontal 1920×1080, 30 fps, con música de sintetizadores espaciales).

Vista de corte de la nave, como si le quitáramos la pared lateral: un solo paneo de izquierda a derecha por
cinco cuartos reales (dormitorio, gimnasio, mirador, enfermería-refugio y sala común). Ana, con casco,
despierta, corre, ve la tormenta solar, tiene una emergencia que Lunna atiende y termina sana en la sala.

El mundo es pixel art (640×360 escalado ×3). Encima flota la interfaz REAL de la app: las tarjetas se
dibujan con el HTML y el CSS de maqueta-eva (tema oscuro, textos en inglés) en Edge sin ventana y se pegan
nítidas sobre el video con el vidrio desenfocado de la app. Lunna es el avatar real (luna.js): no habla,
solo cambia de carita y de fase (llena = todo en su normal, nueva = emergencia). Cada tarjeta se empaqueta,
sube a la antena de su cuarto y viaja a Tierra (18 min por trayecto, cola priorizada; la emergencia va con
prioridad 0), como en la sección «Comunicación con Tierra» de la app.

Uso:  python hacer_video.py                   → lunna-video.mp4 en esta carpeta
      python hacer_video.py --cuadros 0,150   → PNG de prueba de esos cuadros (sin audio)
      python hacer_video.py --solo-audio      → rehace solo la música sobre el mp4 ya hecho
Requiere numpy, pillow, imageio-ffmpeg y Microsoft Edge (o Chrome) para dibujar las tarjetas.
"""
import argparse, hashlib, math, os, pathlib, random, shutil, subprocess, sys, tempfile, time, wave
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

AQUI = pathlib.Path(__file__).resolve().parent
MAQUETA = (AQUI.parent / 'maqueta-eva').resolve()
CACHE = pathlib.Path(tempfile.gettempdir()) / 'lunna-video-cache'
FPS, DUR = 30, 30.0
NF = int(DUR * FPS)
AW, AH = 480, 360           # arte (ancho de la vista; el mundo mide 360 de alto)
VY, VH = 46, 270             # franja vertical que ve la cámara
ESC = 4                     # escala de salida
OW, OH = AW * ESC, VH * ESC
SR = 44100
DPR = 2                     # resolución de las tarjetas capturadas


# ============================================================ utilidades
def clamp(x, a, b): return a if x < a else b if x > b else x
def lerp(a, b, u): return a + (b - a) * u
def suave(u): u = clamp(u, 0.0, 1.0); return u * u * (3 - 2 * u)
def seno_io(u): u = clamp(u, 0.0, 1.0); return 0.5 - 0.5 * math.cos(math.pi * u)
def sale(u): u = clamp(u, 0.0, 1.0); return 1 - (1 - u) ** 3
def entre(t, a, b): return clamp((t - a) / (b - a), 0.0, 1.0) if b > a else float(t >= b)
def mezcla(c1, c2, u): return tuple(int(round(lerp(a, b, clamp(u, 0, 1)))) for a, b in zip(c1, c2))
def con_a(c, a): return tuple(c[:3]) + (int(clamp(a, 0, 255)),)
def bezier(p0, pc, p1, u): return tuple((1 - u) ** 2 * a + 2 * (1 - u) * u * b + u * u * c_ for a, b, c_ in zip(p0, pc, p1))


C = dict(
    vacio=(4, 6, 20), blanco=(238, 242, 255), cian=(79, 210, 233), cian2=(140, 236, 255), magenta=(255, 92, 170),
    ambar=(251, 191, 36), rojo=(248, 82, 96), rojo2=(255, 46, 84), verde=(52, 211, 153), oro=(255, 204, 102), rosa=(224, 69, 123),
)

# ============================================================ guion (segundos)
# dormitorio 0–5 · gimnasio 5–10 · mirador 10–15 · enfermería 15–21 · sala común 21–25 · logo 25–30
CUARTOS = [(60, 520), (520, 980), (980, 1440), (1440, 1900), (1900, 2360)]
BH = [60, 520, 980, 1440, 1900, 2360]               # mamparos (cortados) entre cuartos
ANTENAS = [a + 130 for a, _ in CUARTOS]              # antena de cada cuarto, sobre el casco
X = [300, 735, 1185, 1620, 2090]                     # dónde se para Ana en cada cuarto
X_MIN, X_MAX = -240, 2700                            # extensión del mundo dibujado
Y_ANT, Y_CASCO, Y_CORTE_A, Y_INT, Y_TECHO = 26, 56, 70, 84, 98
SUELO, Y_PISO, Y_CORTE_B, Y_FONDO = 262, 276, 290, 306
POD_PIES = (255, 214)                                # pies de Ana acostada en su litera
CAMINATAS = []                                       # ya no camina entre cuartos: cada escena es otro momento del día
KA = 1.35                                            # escala de Ana (la marioneta base mide 66 px)
CICLO_PASO = 40.0 * KA
BPM_GYM = 128.0
T_TORMENTA = (10.8, 12.6)                            # la dosis sube de 23 a 6000 µSv/h
T_COLAPSO, T_LUNNA, T_RECUPERA = 15.8, 17.0, 18.6
T_VIAJE = (25.3, 26.5)                               # Lunna va de la esquina al centro
T_LETRAS = 26.9                                      # aparece LUNNA
T_ACORDE = 27.8                                      # acorde final y subtítulos
T_A, T_B = 0.55, 0.7                                 # paquete: tarjeta → antena → Tierra


SB = [5.0, 10.0, 15.0, 20.0]                         # el centro de cada muro pasa por la cámara en estos segundos
TC = SB
ANCHO_CUARTO = 474                                   # de mamparo a mamparo
MURO = 130                                           # grosor del muro entre cuartos (arte)
PERIODO = ANCHO_CUARTO + MURO
VEL = PERIODO / 5.0                                  # px de arte por segundo: la cámara nunca se detiene
CENTROS = [(a + b) / 2 for a, b in CUARTOS]


FRENO = 0.82                                         # 0 = velocidad pareja · cerca de 1 = casi se detiene al centro del cuarto


def recorrido(t):
    """Posición virtual de la cámara: cruza cada muro a los 5, 10, 15, 20 y 25 s, rápido en los muros y lento en el cuarto."""
    k, u = divmod(t / 5.0, 1.0)
    return PERIODO * (k + u + FRENO * math.sin(2 * math.pi * u) / (2 * math.pi))


def escena_de(t):
    return sum(1 for b in SB if t >= b)


def camara_escena(i, t):
    """x del mundo que ve el centro de la cámara dentro del cuarto i (recorrido virtual con muros gruesos)."""
    return (CUARTOS[i][0] - 7) + (recorrido(t) - (i * PERIODO + MURO / 2))


def camara(t):
    return camara_escena(escena_de(t), t)


def transicion(t):
    return None


def negro(t):
    return 1.0


def ana(t):
    """Estado de Ana en cada escena: pies (x, y), giro del cuerpo, modo y fase."""
    e = dict(x=X[0], y=SUELO, theta=0.0, modo='parada', fase=0.0, u=0.0, temblor=0)
    if t < 5.0:   # en la litera: despierta y se estira sin levantarse
        e.update(x=POD_PIES[0], y=POD_PIES[1], theta=-90.0, modo='acostada')
        if 1.8 <= t < 3.6: e.update(modo='estirar', u=entre(t, 1.8, 3.6))
    elif t < 10.0:
        e.update(x=X[1])
        if 5.3 <= t < 9.7: e.update(modo='correr', fase=(t - 5.3) * 2.4)
    elif t < 15.0:
        e.update(x=X[2], modo='mirar')
        if 11.0 <= t < 12.8: e['temblor'] = 1 if int(t * 18) % 2 else -1
    elif t < 20.0:
        e.update(x=X[3])
        if T_COLAPSO <= t < 19.2:
            k = seno_io(entre(t, T_COLAPSO, T_COLAPSO + 0.5)) * (1 - seno_io(entre(t, T_RECUPERA, 19.2)))
            e.update(modo='pecho', u=k)
    else:
        e.update(x=X[4], modo='feliz')
        if 21.8 <= t < 22.4:
            u = entre(t, 21.8, 22.4)
            e.update(modo='saltofeliz', u=u, y=SUELO - 18 * math.sin(math.pi * u))
    return e


def dosis(t):
    """Tasa de dosis en cabina (µSv/h) durante la tormenta."""
    if t < T_TORMENTA[0]: return 23.0
    return 23.0 * (6000.0 / 23.0) ** seno_io(entre(t, *T_TORMENTA))


def signos(t):
    """SpO₂, pulso y temperatura de Ana en la emergencia (caen y se recuperan)."""
    caida = seno_io(entre(t, T_COLAPSO, T_COLAPSO + 0.9))
    vuelta = seno_io(entre(t, T_RECUPERA, T_RECUPERA + 0.9))
    spo2 = lerp(97, 84, caida) + (95 - 84) * vuelta * caida
    lpm = lerp(78, 119, caida) - (119 - 84) * vuelta * caida
    temp = lerp(36.6, 36.8, caida) - 0.1 * vuelta * caida
    return spo2, lpm, temp


def pulso(t):
    """Pulso de Ana (lpm): sube en la cinta, se asusta con la tormenta y se dispara en la emergencia."""
    if t < 5.6: return 64.0
    if t < 8.4: return lerp(67, 128, seno_io(entre(t, 5.6, 8.2)))
    if t < T_COLAPSO: return lerp(128, 78, seno_io(entre(t, 8.4, 10.4))) + 18 * math.exp(-((t - 11.8) / 0.9) ** 2)
    return signos(t)[1]


_TG = np.arange(0.0, DUR + 1.0, 0.002)
_FASE = np.cumsum(np.array([pulso(x) for x in _TG]) / 60.0 * 0.002)


def fase_pulso(t):
    """Fase del latido (1 = un latido completo); el pico R del ECG cae en la fracción 0,22."""
    return float(np.interp(t, _TG, _FASE))


def latidos(t0, t1):
    """Momentos de cada latido entre t0 y t1 (para el sonido y los anillos que salen del pecho)."""
    m = (_TG >= t0) & (_TG < t1)
    tg, k = _TG[m], np.floor(_FASE[m] - 0.22)
    return [float(x) for x in tg[1:][np.diff(k) > 0]]


def ecg(fase):
    f = fase % 1.0
    if 0.10 < f < 0.14: return -2
    if 0.18 < f < 0.20: return 3
    if 0.20 < f < 0.24: return -11
    if 0.24 < f < 0.27: return 5
    if 0.40 < f < 0.50: return -3
    return 0


# ============================================================ pixel: letras del letrero e íconos de emociones
LETRAS = {
    'S': [".####", "#....", "#....", ".###.", "....#", "....#", "####."], 'H': ["#...#", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
    'E': ["#####", "#....", "#....", "####.", "#....", "#....", "#####"], 'L': ["#....", "#....", "#....", "#....", "#....", "#....", "#####"],
    'T': ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.."], 'R': ["####.", "#...#", "#...#", "####.", "#.#..", "#..#.", "#...#"],
}
ICONOS = {
    'corazon': [".##.##.", "#######", "#######", ".#####.", "..###..", "...#..."],
    'zeta': ["#####", "...#.", "..#..", ".#...", "#####"],
    'chispa': ["..#..", "..#..", "##.##", "..#..", "..#.."],
    'excl': ["##", "##", "##", "##", "..", "##"],
    'estrella': ["..#..", ".###.", "#####", ".###.", ".#.#."],
    'gotita': ["..#..", ".###.", "#####", "#####", ".###."],
}
_masc = {}


def mascara(filas, e=1):
    k = (tuple(filas), e)
    if k not in _masc:
        m = np.array([[c == '#' for c in f] for f in filas], np.uint8) * 255
        im = Image.fromarray(m, 'L')
        if e > 1: im = im.resize((im.width * e, im.height * e), Image.NEAREST)
        _masc[k] = im
    return _masc[k]


def pegar(img, col, pos, m):
    """Pega un color con máscara. En lienzos RGB la transparencia del color escala la máscara (se mezcla)."""
    if img.mode == 'RGB':
        a = col[3] if len(col) == 4 else 255
        if a <= 0: return
        if a < 255: m = m.point(lambda v, a=a: v * a // 255)
        col = tuple(col[:3])
    img.paste(col, pos, m)


def icono(img, nombre, x, y, color, e=1):
    m = mascara(ICONOS[nombre], e)
    pegar(img, color if len(color) == 4 else con_a(color, 255), (int(round(x - m.width / 2)), int(round(y - m.height / 2))), m)


def letrero(img, x, y, s, color):
    for ch in s:
        if ch == ' ': x += 4; continue
        m = mascara(LETRAS[ch]); pegar(img, con_a(color, 255), (x, y), m); x += m.width + 1


def capa_alfa(img, rgba_fn, caja):
    """Dibuja algo semitransparente: rgba_fn(draw, x0, y0) sobre una capa del tamaño de caja y la mezcla."""
    x0, y0, x1, y1 = [int(v) for v in caja]
    x0, y0, x1, y1 = max(0, x0), max(0, y0), min(img.width, x1), min(img.height, y1)
    if x1 <= x0 or y1 <= y0: return
    capa = Image.new('RGBA', (x1 - x0, y1 - y0), (0, 0, 0, 0))
    rgba_fn(ImageDraw.Draw(capa), x0, y0)
    if img.mode == 'RGBA': img.alpha_composite(capa, (x0, y0))
    else: img.paste(capa, (x0, y0), capa)


# ============================================================ la nave en corte (estática)
PARED = [((34, 40, 92), (24, 28, 66)), ((22, 58, 74), (14, 38, 52)), ((28, 32, 80), (18, 20, 56)),
         ((46, 64, 102), (32, 46, 80)), ((58, 80, 120), (42, 58, 92))]
CASCO, CASCO_OSC, CASCO_CLARO = (128, 138, 178), (98, 106, 146), (206, 214, 240)
METAL, METAL_OSC = (150, 160, 200), (70, 78, 120)


def construir_mundo():
    im = Image.new('RGBA', (X_MAX - X_MIN, AH), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    W = lambda x: x - X_MIN
    a0, a1 = 40, 2360

    def caja(x0, y0, x1, y1, col, borde=None):
        d.rectangle((W(x0), y0, W(x1), y1), fill=con_a(col, 255), outline=con_a(borde, 255) if borde else None)

    def corte(x0, y0, x1, y1):
        """Pared cortada: gris oscuro con rayado diagonal, como en un plano de corte."""
        w, h = x1 - x0, y1 - y0
        s = Image.new('RGBA', (w, h), (30, 34, 58, 255)); sd = ImageDraw.Draw(s)
        for k in range(-h, w, 6): sd.line((k, h - 1, k + h - 1, 0), fill=(56, 62, 98, 255))
        sd.rectangle((0, 0, w - 1, h - 1), outline=(14, 16, 32, 255))
        im.paste(s, (W(x0), y0))

    # ---- interior de cada cuarto: pared del fondo, techo, zócalo y piso
    for i, (a, b) in enumerate(CUARTOS):
        c0, c1 = PARED[i]
        for y in range(Y_INT, SUELO):
            d.line((W(a), y, W(b), y), fill=con_a(mezcla(c0, c1, (y - Y_INT) / (SUELO - Y_INT)), 255))
        sutil = con_a(mezcla(c1, (0, 0, 0), 0.25), 255)
        for x in range(a + 24, b, 48): d.line((W(x), Y_TECHO + 4, W(x), SUELO - 10), fill=sutil)
        d.line((W(a), 186, W(b), 186), fill=sutil)
        d.line((W(a), 187, W(b), 187), fill=con_a(mezcla(c0, (255, 255, 255), 0.06), 255))
        caja(a, Y_INT, b, Y_TECHO, (40, 46, 92))
        d.line((W(a), Y_TECHO, W(b), Y_TECHO), fill=(22, 26, 58, 255))
        for x in range(a + 34, b - 40, 92):
            caja(x, Y_TECHO - 4, x + 36, Y_TECHO - 1, (214, 234, 255))
        caja(a, SUELO - 8, b, SUELO - 1, mezcla(c1, (0, 0, 0), 0.35))
        for x in range(a + 18, b, 64): caja(x, SUELO - 5, x + 3, SUELO - 4, (80, 220, 240))
        caja(a, SUELO, b, Y_PISO, (64, 72, 120))
        d.line((W(a), SUELO, W(b), SUELO), fill=(150, 168, 228, 255))
        for x in range(a, b, 6): d.line((W(x), SUELO + 3, W(x), Y_PISO - 2), fill=(44, 50, 92, 255))

    # ---- casco: placas exteriores arriba y abajo
    for (y0, y1) in ((Y_CASCO, Y_CORTE_A), (Y_CORTE_B, Y_FONDO)):
        caja(a0, y0, a1, y1, CASCO)
        for x in range(a0, a1, 44): d.line((W(x), y0, W(x), y1), fill=con_a(CASCO_OSC, 255))
        for x in range(a0 + 6, a1, 11):
            d.point((W(x), y0 + 3), fill=(170, 178, 214, 255)); d.point((W(x), y1 - 3), fill=(92, 100, 140, 255))
    d.line((W(a0), Y_CASCO, W(a1), Y_CASCO), fill=con_a(CASCO_CLARO, 255))
    d.line((W(a0), Y_FONDO, W(a1), Y_FONDO), fill=(58, 64, 102, 255))
    caja(a0, Y_CASCO + 8, a1, Y_CASCO + 9, C['cian'])
    caja(a0, Y_FONDO - 9, a1, Y_FONDO - 8, C['rosa'])
    # paredes cortadas: casco de arriba, piso de abajo y mamparos
    corte(a0, Y_CORTE_A, a1, Y_INT)
    corte(a0, Y_PISO, a1, Y_CORTE_B)
    d.line((W(a0), Y_INT - 1, W(a1), Y_INT - 1), fill=(70, 80, 128, 255))
    for i, b in enumerate(BH):
        corte(b - 7, Y_INT, b + 7, Y_PISO)
        if 0 < i < len(BH) - 1:   # puerta abierta en el mamparo
            caja(b - 7, SUELO - 120, b + 7, SUELO - 1, (20, 24, 50))
            caja(b - 7, SUELO - 124, b + 7, SUELO - 120, (112, 122, 170))
            d.line((W(b - 7), SUELO - 120, W(b - 7), SUELO - 1), fill=(90, 100, 150, 255))
            d.line((W(b + 7), SUELO - 120, W(b + 7), SUELO - 1), fill=(90, 100, 150, 255))
            caja(b - 2, SUELO - 132, b + 2, SUELO - 128, C['verde'])
            for y in range(SUELO - 12, SUELO, 4): caja(b - 7, y, b + 7, y + 1, (240, 190, 40))

    # ---- motores a la izquierda
    d.polygon([(W(a0), Y_CASCO), (W(-12), Y_CASCO + 26), (W(-12), Y_FONDO - 26), (W(a0), Y_FONDO)], fill=(104, 112, 150, 255), outline=(58, 64, 102, 255))
    for x in (0, 20): d.line((W(x), Y_CASCO + 20, W(x), Y_FONDO - 20), fill=(84, 92, 130, 255))
    for yc in (128, 234):
        d.polygon([(W(-12), yc - 16), (W(-70), yc - 34), (W(-70), yc + 34), (W(-12), yc + 16)], fill=(86, 92, 126, 255), outline=(44, 48, 78, 255))
        for k in range(3): d.line((W(-26 - k * 14), yc - 20 - k * 4, W(-26 - k * 14), yc + 20 + k * 4), fill=(110, 118, 156, 255))
    # ---- nariz con cabina a la derecha
    pts = [(W(a1 + 230 * math.cos(a)), 181 + 125 * math.sin(a)) for a in np.linspace(-math.pi / 2, math.pi / 2, 40)]
    d.polygon([(W(a1), Y_CASCO)] + pts + [(W(a1), Y_FONDO)], fill=con_a(CASCO, 255), outline=(58, 64, 102, 255))
    for k_ in (0.35, 0.6, 0.82):
        arco = [(W(a1 + 230 * k_ * math.cos(a)), 181 + 125 * math.sin(a)) for a in np.linspace(-math.pi / 2, math.pi / 2, 30)]
        d.line(arco, fill=con_a(CASCO_OSC, 255))
    for yv in (130, 181, 232):
        d.ellipse((W(2398), yv - 7, W(2412), yv + 7), fill=(22, 34, 80, 255), outline=(206, 214, 240, 255))
    d.polygon([(W(2470), 80), (W(2560), 120), (W(2556), 150), (W(2470), 130)], fill=(22, 34, 80, 255), outline=(206, 214, 240, 255))
    d.line((W(2480), 88, W(2530), 110), fill=(120, 200, 255, 255))
    # ---- antenas sobre el casco (una por cuarto) y propulsores de maniobra abajo
    for x in ANTENAS:
        caja(x - 1, Y_ANT + 12, x + 1, Y_CASCO, METAL)
        caja(x - 7, Y_CASCO - 3, x + 7, Y_CASCO - 1, METAL_OSC)
        d.polygon([(W(x - 11), Y_ANT + 6), (W(x - 6), Y_ANT + 15), (W(x + 6), Y_ANT + 18), (W(x + 2), Y_ANT + 11)], fill=(206, 214, 240, 255), outline=(70, 78, 120, 255))
        d.line((W(x - 2), Y_ANT + 12, W(x + 7), Y_ANT + 3), fill=(150, 160, 200, 255))
    for x in range(160, 2300, 230):
        caja(x, Y_FONDO, x + 14, Y_FONDO + 5, METAL_OSC)
        caja(x + 3, Y_FONDO + 5, x + 11, Y_FONDO + 8, (60, 66, 100))

    # ================= cuarto 0 · dormitorio
    d.ellipse((W(282), 122, W(318), 158), fill=(170, 180, 214, 255), outline=(40, 44, 80, 255))
    d.ellipse((W(286), 126, W(314), 154), fill=(0, 0, 0, 0))                      # ojo de buey (Tierra)
    caja(92, 196, 98, SUELO, METAL)                                              # cabecera de la litera
    caja(92, 196, 104, 200, METAL)
    caja(96, 232, 266, 238, METAL_OSC)                                           # base
    caja(98, 238, 102, SUELO, METAL_OSC); caja(260, 238, 264, SUELO, METAL_OSC)
    caja(100, 224, 262, 232, (56, 88, 196))                                      # colchón
    d.line((W(100), 224, W(262), 224), fill=(110, 140, 230, 255))
    caja(102, 214, 128, 224, (200, 212, 255))                                    # almohada
    caja(100, 120, 200, 124, METAL_OSC)                                          # repisa con fotos
    caja(108, 104, 124, 120, (240, 200, 120), (60, 50, 40)); caja(130, 108, 144, 120, (120, 200, 255), (40, 50, 70))
    caja(150, 106, 162, 120, (255, 130, 170), (60, 40, 50)); caja(170, 112, 192, 120, (90, 200, 140))
    caja(340, 150, 374, SUELO - 1, (70, 82, 140), (30, 34, 70))                  # casillero
    d.line((W(357), 152, W(357), SUELO - 3), fill=(40, 46, 90, 255)); caja(352, 200, 355, 210, METAL); caja(359, 200, 362, 210, METAL)
    caja(398, 212, 486, 216, (120, 96, 72))                                      # escritorio
    caja(402, 216, 406, SUELO - 1, (90, 72, 56)); caja(478, 216, 482, SUELO - 1, (90, 72, 56))
    caja(412, 200, 436, 211, (30, 36, 70), (150, 160, 200))                      # tableta
    caja(446, 204, 452, 211, (240, 240, 250)); caja(452, 206, 454, 209, (240, 240, 250))   # taza
    d.line((W(472), 211, W(468), 190), fill=(150, 160, 200, 255)); d.line((W(468), 190, W(478), 186), fill=(150, 160, 200, 255))
    caja(474, 184, 484, 189, (255, 214, 140))                                    # lámpara
    caja(426, 236, 452, 240, (70, 82, 140)); caja(437, 240, 441, SUELO - 1, METAL_OSC)   # banco

    # ================= cuarto 1 · gimnasio
    caja(540, 254, 650, SUELO - 1, (40, 120, 110))                               # tapete
    d.ellipse((W(584), 222, W(616), 254), outline=(150, 160, 200, 255), width=2)  # bicicleta fija
    d.line((W(600), 238, W(586), 208), fill=(150, 160, 200, 255), width=2); d.line((W(600), 238, W(622), 204), fill=(150, 160, 200, 255), width=2)
    caja(578, 204, 594, 208, (40, 40, 60)); caja(616, 200, 630, 204, (40, 40, 60))
    caja(598, 238, 604, 254, METAL_OSC)
    caja(686, 252, 794, SUELO - 1, (36, 42, 78), (20, 22, 50))                    # cinta: base
    caja(792, 196, 796, 252, METAL)                                              # poste y consola
    caja(780, 188, 808, 200, (20, 40, 60), (150, 160, 200))
    caja(866, 150, 870, SUELO - 1, METAL); caja(936, 150, 940, SUELO - 1, METAL)  # rack con barra
    caja(866, 150, 940, 154, METAL)
    caja(858, 196, 948, 199, (200, 206, 230)); caja(862, 186, 868, 209, (224, 69, 123)); caja(938, 186, 944, 209, (224, 69, 123))
    caja(826, 240, 838, SUELO - 1, (79, 210, 233), (30, 60, 80))                  # botella de agua
    caja(560, 120, 640, 168, (16, 40, 54), (52, 211, 153))                       # pantalla de pared
    d.line([(W(566), 152), (W(584), 152), (W(590), 136), (W(598), 160), (W(606), 144), (W(634), 144)], fill=(52, 211, 153, 255))

    # ================= cuarto 2 · mirador
    d.rounded_rectangle((W(1144), 102, W(1416), 228), radius=18, fill=(170, 180, 222, 255), outline=(30, 34, 72, 255))
    d.rounded_rectangle((W(1150), 108, W(1410), 222), radius=14, fill=(0, 0, 0, 0))
    for x in (1236, 1322): caja(x, 108, x + 3, 222, (170, 180, 222))
    d.polygon([(W(1160), 236), (W(1400), 236), (W(1408), 244), (W(1152), 244)], fill=(96, 106, 150, 255))
    caja(1158, 244, 1402, SUELO - 1, (60, 68, 110), (30, 34, 72))                # consola bajo la ventana
    for x in (1176, 1236, 1296, 1356): caja(x, 248, x + 30, 256, (20, 30, 60), (90, 100, 150))
    caja(1010, 236, 1036, 240, (70, 82, 140)); caja(1021, 240, 1025, SUELO - 1, METAL_OSC)   # banco
    caja(1050, 238, 1120, 240, (240, 190, 40))                                   # pasamanos

    # ================= cuarto 3 · enfermería (refugio)
    caja(1452, 100, 1516, 114, (40, 30, 20), C['ambar'])
    letrero(im, W(1456), 104, "SHELTER", C['ambar'])
    caja(1466, 226, 1594, 234, (230, 234, 250), (120, 130, 170))                 # camilla
    caja(1470, 218, 1496, 226, (200, 212, 255))
    caja(1468, 234, 1592, 240, METAL_OSC)
    caja(1474, 240, 1478, SUELO - 4, METAL); caja(1582, 240, 1586, SUELO - 4, METAL)
    d.ellipse((W(1472), SUELO - 6, W(1480), SUELO + 1), fill=(40, 44, 70, 255)); d.ellipse((W(1580), SUELO - 6, W(1588), SUELO + 1), fill=(40, 44, 70, 255))
    caja(1534, 100, 1538, 116, METAL)                                            # monitor colgado
    caja(1488, 116, 1592, 170, (120, 130, 170), (30, 34, 72))
    caja(1838, 128, 1892, 206, (176, 186, 222), (30, 34, 72))                    # botiquín
    d.line((W(1865), 130, W(1865), 204), fill=(120, 130, 170, 255))
    caja(1846, 154, 1858, 176, (236, 240, 255)); caja(1850, 158, 1854, 172, (230, 60, 80)); caja(1846, 163, 1858, 167, (230, 60, 80))
    caja(1700, 236, 1820, SUELO - 1, (150, 160, 196), (30, 34, 72))              # gabinete
    d.line((W(1760), 238, W(1760), SUELO - 2), fill=(110, 120, 160, 255))
    for x in (1560, 1760):
        caja(x - 8, Y_TECHO, x + 8, Y_TECHO + 3, (90, 96, 140))

    # ================= cuarto 4 · sala común
    caja(1934, 232, 2044, SUELO - 1, (40, 104, 124), (20, 50, 70))              # sillón
    caja(1934, 214, 1944, 232, (40, 104, 124), (20, 50, 70))
    caja(1940, 226, 2040, 232, (60, 140, 160))
    caja(2236, 118, 2326, 172, (20, 30, 60), (150, 160, 200))                    # foto de la Tierra en pantalla
    d.ellipse((W(2266), 128, W(2298), 160), fill=(40, 110, 220, 255)); d.ellipse((W(2272), 134, W(2286), 146), fill=(70, 170, 110, 255))
    d.rounded_rectangle((W(1948), 106, W(2080), 188), radius=10, fill=(170, 180, 222, 255), outline=(30, 34, 72, 255))
    d.rounded_rectangle((W(1954), 112, W(2074), 182), radius=8, fill=(0, 0, 0, 0))   # ventana a Marte
    caja(2148, 220, 2292, 224, (200, 210, 236), (100, 110, 150))                 # mesa
    caja(2216, 224, 2224, SUELO - 4, METAL); caja(2200, SUELO - 4, 2240, SUELO - 1, METAL_OSC)
    caja(2166, 214, 2196, 220, (120, 130, 170)); d.ellipse((W(2170), 209, W(2180), 217), fill=(230, 70, 80, 255))
    caja(2183, 211, 2193, 216, (255, 214, 140))
    caja(2236, 206, 2244, 220, (79, 210, 233)); caja(2250, 208, 2258, 220, (255, 160, 90))
    caja(2264, 210, 2276, 220, (240, 240, 250)); caja(2276, 212, 2278, 216, (240, 240, 250))
    for x in (2160, 2276):
        caja(x - 12, 236, x + 12, 240, (70, 82, 140)); caja(x - 2, 240, x + 2, SUELO - 1, METAL_OSC)
    caja(2228, Y_TECHO, 2232, 130, METAL); caja(2218, 130, 2242, 136, (255, 214, 140))
    return im


# ============================================================ astronauta (marioneta pixel)
TRAJE, TRAJE_D, CONT = (234, 238, 250), (188, 196, 228), (28, 32, 72)
BOTA, GUANTE, MOCHILA = (92, 98, 140), (204, 210, 234), (150, 160, 196)
VISOR, VISOR_HL = (22, 30, 88), (120, 220, 255)


def rot(p, ang):
    c, s = math.cos(ang), math.sin(ang)
    return (p[0] * c - p[1] * s, p[0] * s + p[1] * c)


def ik(base, obj, l1, l2, signo):
    dx, dy = obj[0] - base[0], obj[1] - base[1]
    dist = clamp(math.hypot(dx, dy), 0.01, l1 + l2 - 0.01)
    a = math.atan2(dy, dx)
    b = math.acos(clamp((l1 * l1 + dist * dist - l2 * l2) / (2 * l1 * dist), -1, 1))
    j = (base[0] + l1 * math.cos(a + signo * b), base[1] + l1 * math.sin(a + signo * b))
    f = (base[0] + dist * math.cos(a), base[1] + dist * math.sin(a))
    return j, f


def pies_ciclo(f, zancada, alto):
    out = []
    for off in (0.5, 0.0):            # [lejano, cercano]
        ph = (f + off) % 1.0
        if ph < 0.5: x, y = zancada / 2 - ph / 0.5 * zancada, 0.0
        else:
            q = (ph - 0.5) / 0.5
            x, y = -zancada / 2 + q * zancada, -alto * math.sin(math.pi * q)
        out.append((x, y))
    return out


def esqueleto(e, t):
    m, u = e['modo'], e['u']
    lean, caida, bob, mira = 0.0, 0.0, 0.0, 0.0
    pies = [(-3.0, 0.0), (3.0, 0.0)]
    manos = [(-3.0, 16.0), (3.0, 16.0)]         # relativas al hombro: [lejana, cercana]
    if m in ('parada', 'mirar', 'feliz', 'acostada', 'levantando'):
        bob = 0.7 * math.sin(t * 2 * math.pi * 0.6)
    if m == 'feliz':
        manos = [(-7.0, 12.0), (7.0, 12.0)]
        if 22.9 <= t < 24.3:                     # saluda
            w = math.sin((t - 22.9) * 2 * math.pi * 2.5)
            manos = [(-7.0, 12.0), (9 + 4 * w, -16.0)]
    if m == 'trotar':
        f = e['fase']
        pies = pies_ciclo(f, 20.0, 7.0)
        bob = abs(math.sin(2 * math.pi * f)) * 2.0
        lean = 9.0
        s = math.sin(2 * math.pi * f)
        manos = [(-6 * s - 1, 12.0), (6 * s + 1, 12.0)]
    if m == 'correr':
        f = e['fase']
        pies = pies_ciclo(f, 24.0, 10.0)
        bob = abs(math.sin(2 * math.pi * f)) * 3.0
        lean = 13.0
        s = math.sin(2 * math.pi * f)
        manos = [(-8 * s, 9.0 - 3 * abs(s)), (8 * s, 9.0 - 3 * abs(s))]
    if m == 'estirar':
        k = math.sin(math.pi * u)
        manos = [(lerp(-3, -6, k), lerp(16, -17, k)), (lerp(3, 6, k), lerp(16, -17, k))]
        bob = 2 * k
    if m == 'salto':
        pies = [(-4.0, -3.0 * math.sin(math.pi * u)), (5.0, -3.0 * math.sin(math.pi * u))]
    if m == 'saltofeliz':
        k = math.sin(math.pi * u)
        manos = [(-6.0, lerp(12, -15, k)), (6.0, lerp(12, -15, k))]
        pies = [(-3.0, -4 * k), (4.0, -4 * k)]
    if m == 'pecho':
        lean = lerp(0, 18, u) + 3 * u * math.sin(t * 5.0)
        caida = 7 * u
        pies = [(lerp(-3, -6, u), 0.0), (lerp(3, 7, u), 0.0)]
        manos = [(lerp(-3, -1, u), lerp(16, 15, u)), (lerp(3, 7, u), lerp(16, 6, u))]
        mira = -0.8 * u
    if m == 'mirar':
        mira = 1.0
        if e['temblor']:
            lean = -3.0
            manos = [(-5.0, 10.0), (7.0, 8.0)]
    return dict(lean=lean, caida=caida, bob=bob, pies=pies, manos=manos, mira=mira)


def dibujar_astronauta(cv, e, ox, t, color_led):
    """cv: lienzo RGB del arte; ox: x del mundo que cae en la columna 0 del lienzo."""
    k = esqueleto(e, t)
    th = math.radians(e['theta'])
    L = math.radians(k['lean'])
    base_x, base_y = e['x'] - ox + e['temblor'], e['y']

    def G(p):  # local → lienzo
        q = rot((p[0] * KA, p[1] * KA), th)
        return (base_x + q[0], base_y + q[1])

    cadera = (0.0, -24.0 + k['caida'] - k['bob'])
    dirt = (math.sin(L), -math.cos(L))
    frente = (math.cos(L), math.sin(L))
    def mas(p, v, s): return (p[0] + v[0] * s, p[1] + v[1] * s)
    hombro = mas(cadera, dirt, 18)
    cabeza = mas(cadera, dirt, 30)
    d = ImageDraw.Draw(cv, 'RGBA')

    def miembro(a, b, w, col):
        A, B = G(a), G(b)
        d.line((A, B), fill=CONT, width=w + 2)
        for P_ in (A, B):
            d.ellipse((P_[0] - (w + 2) / 2, P_[1] - (w + 2) / 2, P_[0] + (w + 2) / 2, P_[1] + (w + 2) / 2), fill=CONT)
        d.line((A, B), fill=col, width=w)
        for P_ in (A, B):
            d.ellipse((P_[0] - w / 2 + 0.5, P_[1] - w / 2 + 0.5, P_[0] + w / 2 - 0.5, P_[1] + w / 2 - 0.5), fill=col)

    def pierna(pie, col):
        rod, fin = ik(cadera, pie, 12.6, 12.6, -1)
        miembro(cadera, rod, 8, col); miembro(rod, fin, 8, col)
        bx, by = G((fin[0] + 1, fin[1] - 1))
        d.rectangle((bx - 5, by - 4, bx + 7, by + 1), fill=BOTA, outline=CONT)

    def brazo(mano_rel, col):
        h = mas(hombro, dirt, -2)
        codo, fin = ik(h, (h[0] + mano_rel[0], h[1] + mano_rel[1]), 9.0, 9.0, 1)
        miembro(h, codo, 7, col); miembro(codo, fin, 7, col)
        gx, gy = G(fin)
        d.ellipse((gx - 4, gy - 4, gx + 4, gy + 4), fill=GUANTE, outline=CONT)

    def poligono(centro, largo_a, largo_b, ancho_, col, borde=True):
        a = mas(centro, dirt, -largo_a); b = mas(centro, dirt, largo_b)
        pts = [mas(a, frente, -ancho_), mas(a, frente, ancho_), mas(b, frente, ancho_), mas(b, frente, -ancho_)]
        d.polygon([G(p) for p in pts], fill=col, outline=CONT if borde else None)

    brazo(k['manos'][0], TRAJE_D)
    pierna(k['pies'][0], TRAJE_D)
    poligono(mas(mas(cadera, dirt, 12), frente, -9), 9, 9, 4, MOCHILA)
    poligono(mas(cadera, dirt, 9), 11, 11, 7.5, TRAJE)
    poligono(mas(cadera, dirt, 1), 1, 1, 7.5, C['rosa'], borde=False)
    led = G(mas(mas(cadera, dirt, 13), frente, 3))
    d.rectangle((led[0] - 2, led[1] - 1, led[0] + 2, led[1] + 2), fill=color_led)
    pierna(k['pies'][1], TRAJE)
    cx, cy = G(cabeza)
    d.ellipse((cx - 16, cy - 16, cx + 16, cy + 16), fill=CONT)
    d.ellipse((cx - 15, cy - 15, cx + 15, cy + 15), fill=TRAJE)
    franja = [G(mas(mas(cabeza, frente, 10.4 * math.cos(math.radians(f_))), dirt, 10.4 * math.sin(math.radians(f_)))) for f_ in range(100, 165, 8)]
    d.line(franja, fill=C['rosa'], width=3)
    cuello = G(mas(cadera, dirt, 19.5))
    d.ellipse((cuello[0] - 9, cuello[1] - 4, cuello[0] + 9, cuello[1] + 4), fill=GUANTE, outline=CONT)
    vc = mas(mas(cabeza, frente, 3.2 - 0.6 * abs(k['mira'])), dirt, 2.4 * k['mira'])
    pts = [G(mas(mas(vc, frente, 7.4 * math.cos(2 * math.pi * i / 18)), dirt, 6.2 * math.sin(2 * math.pi * i / 18))) for i in range(18)]
    d.polygon(pts, fill=VISOR, outline=CONT)
    d.line((G(mas(mas(vc, frente, 2.5), dirt, 3.5)), G(mas(mas(vc, frente, 5.5), dirt, 1.5))), fill=VISOR_HL, width=3)
    luz = G(mas(cabeza, dirt, 11.5))
    if int(t * 2) % 2 == 0:
        d.rectangle((luz[0] - 1, luz[1] - 1, luz[0] + 1, luz[1] + 1), fill=color_led)
    brazo(k['manos'][1], TRAJE)
    pecho = G(mas(cadera, dirt, 12))
    return dict(cabeza=(cx + ox, cy), pecho=(pecho[0] + ox, pecho[1]), cadera=(G(cadera)[0] + ox, G(cadera)[1]))


def cabeza_mundo(t):
    """Posición del casco en el mundo (para las partículas)."""
    e = ana(t); k = esqueleto(e, t)
    th, L = math.radians(e['theta']), math.radians(k['lean'])
    cad = (0.0, -24.0 + k['caida'] - k['bob'])
    p = (cad[0] + math.sin(L) * 30, cad[1] - math.cos(L) * 30)
    q = rot((p[0] * KA, p[1] * KA), th)
    return (e['x'] + q[0], e['y'] + q[1])


# ============================================================ partículas de emoción (sin estado)
PARTICULAS = []


def programar_particulas():
    r = random.Random(7)
    ps = []
    def add(tipo, t0, vida, x, y, vx, vy, g=0.0, **kw): ps.append(dict(tipo=tipo, t0=t0, vida=vida, x=x, y=y, vx=vx, vy=vy, g=g, **kw))
    for i in range(4):                                          # zzz
        t0 = 0.05 + i * 0.36; hx, hy = cabeza_mundo(t0)
        add('zeta', t0, 1.3, hx + 4, hy - 14, 8, -18, fase=r.random() * 6)
    for i in range(8):                                          # chispas al despertar
        t0 = 2.7; hx, hy = cabeza_mundo(t0); a = i / 8 * 2 * math.pi
        add('chispa', t0, 0.6, hx, hy, math.cos(a) * 36, math.sin(a) * 36, col=C['oro'])
    t0 = 6.0
    while t0 < 8.3:                                             # sudor
        hx, hy = cabeza_mundo(t0)
        add('sudor', t0, 0.7, hx - 6 + r.uniform(-4, 4), hy - 12, r.uniform(-46, -18), r.uniform(-50, -30), g=220.0)
        t0 += r.uniform(0.22, 0.34)
    add('excl', 11.15, 1.5, 0, 0, 0, 0)                         # ¡! en la tormenta
    for i in range(10):                                         # alivio al recuperarse
        t0 = 18.9; hx, hy = cabeza_mundo(t0); a = i / 10 * 2 * math.pi
        add('chispa', t0, 0.7, hx, hy, math.cos(a) * 32, math.sin(a) * 32, col=C['verde'])
    t0 = 22.0
    while t0 < 24.9:                                            # corazones
        hx, hy = cabeza_mundo(t0)
        add('corazon', t0, 1.5, hx + r.uniform(-8, 10), hy - 18, r.uniform(-8, 8), -28, fase=r.random() * 6)
        t0 += r.uniform(0.32, 0.5)
    for i in range(10):                                         # chispas del salto
        t0 = 22.1; hx, hy = cabeza_mundo(t0); a = i / 10 * 2 * math.pi
        add('chispa', t0, 0.6, hx, hy, math.cos(a) * 40, math.sin(a) * 40, col=C['magenta'])
    return ps


def dibujar_particulas(cv, ox, t):
    d = ImageDraw.Draw(cv, 'RGBA')
    for p in PARTICULAS:
        dt = t - p['t0']
        if dt < 0 or dt > p['vida']: continue
        u = dt / p['vida']
        x = p['x'] + p['vx'] * dt - ox
        y = p['y'] + p['vy'] * dt + 0.5 * p['g'] * dt * dt
        a = int(255 * (1 - u * u))
        tp = p['tipo']
        if tp == 'zeta':
            icono(cv, 'zeta', x + 4 * math.sin(dt * 4 + p['fase']), y, con_a(C['cian2'], a), 1 if dt < 0.6 else 2)
        elif tp == 'chispa':
            icono(cv, 'chispa', x, y, con_a(p['col'], a))
        elif tp == 'sudor':
            icono(cv, 'gotita', x, y, con_a(C['cian2'], a)); d.point((x - 1, y), fill=con_a((255, 255, 255), a))
        elif tp == 'corazon':
            icono(cv, 'corazon', x + 5 * math.sin(dt * 3 + p['fase']), y, con_a(C['rosa'] if int(dt * 6) % 2 else C['magenta'], a))
        elif tp == 'excl':
            hx, hy = cabeza_mundo(t)
            s = 2 if dt < 0.15 or dt > 0.3 else 3
            icono(cv, 'excl', hx - ox, hy - 34 - 2 * math.sin(dt * 8), con_a(C['ambar'], 255 if u < 0.85 else int(255 * (1 - u) / 0.15)), s)


def dibujar_efectos_ana(cv, ox, t, info):
    """Delante de Ana: mareo, latidos que salen del pecho y el escaneo de Lunna."""
    e = ana(t)
    if e['modo'] == 'pecho' and e['u'] > 0.5:
        hx, hy = info['cabeza']
        for i in range(3):
            a = t * 5 + i * 2 * math.pi / 3
            icono(cv, 'estrella', hx - ox + math.cos(a) * 19, hy - 22 + math.sin(a) * 5, (255, 214, 90, 255))
        fase = (fase_pulso(t) - 0.22) % 1.0
        rr = 3 + fase * 15
        cx, cy = info['pecho'][0] - ox, info['pecho'][1]
        capa_alfa(cv, lambda dd, x0, y0: dd.ellipse((cx - rr - x0, cy - rr - y0, cx + rr - x0, cy + rr - y0), outline=(255, 80, 96, int(230 * (1 - fase))), width=1), (cx - rr - 2, cy - rr - 2, cx + rr + 3, cy + rr + 3))
    if T_LUNNA <= t < T_LUNNA + 0.8:   # Lunna escanea a Ana
        u = entre(t, T_LUNNA, T_LUNNA + 0.8)
        ys = lerp(170, 262, (math.sin(u * math.pi * 2 - math.pi / 2) + 1) / 2)
        bx0, bx1 = X[3] - ox - 30, X[3] - ox + 36
        capa_alfa(cv, lambda dd, x0, y0: (dd.rectangle((bx0 - x0, ys - 4 - y0, bx1 - x0, ys + 4 - y0), fill=(79, 210, 233, 60)), dd.line((bx0 - x0, ys - y0, bx1 - x0, ys - y0), fill=(200, 250, 255, 235))), (bx0, ys - 5, bx1 + 1, ys + 5))


def dibujar_estela(cv, ox, t):
    e = ana(t)
    if e['modo'] not in ('correr', 'trotar'): return
    d = ImageDraw.Draw(cv, 'RGBA')
    bx = e['x'] - ox
    for i in range(3):
        y = e['y'] - 22 - i * 18
        off = (t * 90 + i * 11) % 16
        d.line((bx - 30 - off, y, bx - 20 - off, y), fill=(200, 230, 255, 150))


# ============================================================ espacio y cosas vivas de la nave
_r = random.Random(3)
ESTRELLAS = [(_r.uniform(0, 2000), _r.uniform(0, AH), _r.choice((1, 1, 1, 2)), _r.random(), _r.choice((0.12, 0.25, 0.45))) for _ in range(900)]
FONDO = None


def fondo_espacio():
    y = np.linspace(0, 1, AH)[:, None, None]
    x = np.linspace(0, 1, AW + 2)[None, :, None]
    base = np.array((4, 6, 20)) * (1 - y) + np.array((8, 12, 36)) * y
    neb = np.exp(-((y - 0.25) ** 2) / 0.02 - ((x - 0.7) ** 2) / 0.3) * np.array((30, 16, 60))
    return Image.fromarray((base + neb).clip(0, 255).astype(np.uint8), 'RGB')


def lejos(wx_, c, k=0.9):
    """x en pantalla (arte) de algo lejano que se ve por una ventana del mundo en wx_."""
    return AW / 2 + (wx_ - c) * k


def intensidad_tormenta(t):
    return seno_io(entre(t, 10.6, 11.8)) * (1 - seno_io(entre(t, 13.2, 14.4)))


def dibujar_exterior(cv, c, ox, t):
    cv.paste(FONDO)
    d = ImageDraw.Draw(cv, 'RGBA')
    for sx, sy, sz, ph, par in ESTRELLAS:
        x = (sx - c * par) % 2000 - 680
        if not -2 <= x <= cv.width + 2: continue
        b = int(110 + 120 * (0.5 + 0.5 * math.sin(t * 2.0 + ph * 20)) * (0.6 + par))
        col = (min(255, b), min(255, b), min(255, b + 30), 255)
        if sz == 1: d.point((x, sy), fill=col)
        else: d.rectangle((x, sy, x + 1, sy + 1), fill=col)
    inten = intensidad_tormenta(t)
    # tormenta solar: partículas que cruzan todo el espacio de derecha a izquierda
    if inten > 0.01:
        rr_ = random.Random(11)
        for i in range(int(30 + 160 * inten)):
            vel = rr_.uniform(180, 420); y0 = rr_.uniform(0, AH); fase = rr_.random()
            x = cv.width + 40 - ((t * vel + fase * 900) % (cv.width + 120))
            largo = int(4 + 10 * inten)
            d.line((x, y0, x + largo, y0 - largo * 0.15), fill=(255, 150 + rr_.randint(0, 90), 60, int(110 + 120 * inten)))
    # escape de los motores
    for yc in (128, 234):
        bx = -70 - ox
        if bx > -200:
            fl = 1 + 0.15 * math.sin(t * 40 + yc)
            capa_alfa(cv, lambda dd, x0, y0, bx=bx, yc=yc, fl=fl: (dd.polygon([(bx - x0, yc - 30 - y0), (bx - 110 * fl - x0, yc - y0), (bx - x0, yc + 30 - y0)], fill=(80, 140, 255, 90)),
                                                                    dd.polygon([(bx - x0, yc - 16 - y0), (bx - 60 * fl - x0, yc - y0), (bx - x0, yc + 16 - y0)], fill=(190, 230, 255, 200))), (bx - 130, yc - 32, bx + 1, yc + 33))


def dibujar_ventanas(cv, c, t):
    """Lo que solo se ve por las ventanas: la Tierra, el Sol de la tormenta y Marte."""
    d = ImageDraw.Draw(cv, 'RGBA')
    # Tierra por el ojo de buey del dormitorio
    ex = lejos(302, c)
    if -20 < ex < cv.width + 20:
        d.ellipse((ex - 5, 136, ex + 5, 146), fill=(40, 120, 230, 255)); d.point((ex - 2, 138), fill=(220, 245, 255, 255)); d.point((ex + 1, 142), fill=(90, 190, 120, 255))
    # Sol por el mirador (crece con la tormenta)
    inten = intensidad_tormenta(t)
    sx, sy = lejos(1330, c), 150
    if -80 < sx < cv.width + 80:
        for rr, col in ((44, (255, 120, 40, 60)), (34, (255, 170, 60, 110)), (26, (255, 214, 120, 255)), (20, (255, 244, 200, 255))):
            rr2 = rr + int(inten * 9 * (1 + math.sin(t * 9)) / 2) if rr > 30 else rr
            capa_alfa(cv, lambda dd, x0, y0, rr2=rr2, col=col: dd.ellipse((sx - rr2 - x0, sy - rr2 - y0, sx + rr2 - x0, sy + rr2 - y0), fill=col), (sx - rr2, sy - rr2, sx + rr2 + 1, sy + rr2 + 1))
    # Marte por la ventana de la sala común
    mx, my = lejos(2016, c), 147
    if -40 < mx < cv.width + 40:
        R = 22
        d.ellipse((mx - R, my - R, mx + R, my + R), fill=(196, 88, 56, 255))
        for (px, py, pr) in ((-9, -5, 6), (6, 8, 5), (12, -9, 4)):
            d.ellipse((mx + px - pr, my + py - pr * 0.6, mx + px + pr, my + py + pr * 0.6), fill=(150, 62, 40, 255))
        d.ellipse((mx - 7, my - R + 1, mx + 7, my - R + 5), fill=(250, 236, 226, 255))
        capa_alfa(cv, lambda dd, x0, y0: dd.pieslice((mx - R - x0, my - R - y0, mx + R - x0, my + R - y0), 300, 120, fill=(20, 8, 20, 110)), (mx - R, my - R, mx + R + 1, my + R + 1))


def dibujar_cuartos(cv, ox, t):
    d = ImageDraw.Draw(cv, 'RGBA')
    X_ = lambda x: x - ox
    visible = lambda a, b: X_(b) > -10 and X_(a) < cv.width + 10
    # ---- dormitorio: tableta y lámpara
    if visible(60, 520):
        d.rectangle((X_(414), 202, X_(434), 209), fill=mezcla((40, 90, 160), (120, 200, 255), 0.5 + 0.5 * math.sin(t * 3)) + (255,))
        if t > 1.6:
            a = int(70 * entre(t, 1.6, 2.2))
            capa_alfa(cv, lambda dd, x0, y0: dd.polygon([(X_(476) - x0, 189 - y0), (X_(492) - x0, 189 - y0), (X_(506) - x0, 212 - y0), (X_(452) - x0, 212 - y0)], fill=(255, 214, 140, a)), (X_(450), 188, X_(508), 213))
    # ---- gimnasio: banda de la cinta, rodillos y consola
    if visible(520, 980):
        corre = 5.6 <= t < 8.4
        off = (t * 150) % 8 if corre else 0
        for i in range(0, 104, 8):
            x = X_(688) + (i - off) % 104
            d.line((x, 252, x + 3, 252), fill=(79, 210, 233, 255) if corre else (70, 80, 120, 255))
        lat = (fase_pulso(t) - 0.2) % 1.0 < 0.15
        for xb in (X_(688), X_(792)):
            d.ellipse((xb - 4, 249, xb + 4, 257), outline=(120, 255, 255, 255) if corre else (60, 120, 140, 255), width=2)
        d.rectangle((X_(782), 190, X_(806), 198), fill=(52, 211, 153, 255) if (corre and lat) else (20, 70, 80, 255))
    # ---- mirador: luz de tormenta y ondas de energía que entran por la ventana
    if visible(980, 1440):
        inten = intensidad_tormenta(t)
        for i, x in enumerate((1176, 1236, 1296, 1356)):
            on = (int(t * 4) + i) % 3 == 0
            d.rectangle((X_(x) + 2, 250, X_(x) + 28, 254), fill=(251, 191, 36, 255) if inten > 0.2 and on else (40, 110, 160, 255))
        if inten > 0.01:
            sx, sy = X_(1330), 150
            for k in range(4):
                rr = ((t * 70 + k * 45) % 200) + 30
                a = int(120 * inten * (1 - (rr - 30) / 200))
                capa_alfa(cv, lambda dd, x0, y0, rr=rr, a=a, k=k: dd.arc((sx - rr - x0, sy - rr - y0, sx + rr - x0, sy + rr - y0), 95, 265, fill=(255, 120 + k * 20, 90, a), width=2),
                          (max(0, sx - rr - 2), max(0, sy - rr - 2), min(cv.width, sx + rr + 2), min(cv.height, sy + rr + 2)))
            a = int(42 * inten * (0.7 + 0.3 * math.sin(t * 10)))
            capa_alfa(cv, lambda dd, x0, y0: dd.rectangle((X_(987) - x0, Y_INT - y0, X_(1433) - x0, Y_PISO - y0), fill=(255, 120, 40, a)), (X_(987), Y_INT, X_(1433), Y_PISO))
            capa_alfa(cv, lambda dd, x0, y0: (dd.line((0 - x0, Y_CASCO - y0, cv.width - x0, Y_CASCO - y0), fill=(255, 170, 80, int(200 * inten))),
                                               dd.line((0 - x0, Y_FONDO - y0, cv.width - x0, Y_FONDO - y0), fill=(255, 150, 70, int(150 * inten)))), (0, Y_CASCO - 1, cv.width, Y_FONDO + 2))
    # ---- enfermería: monitor con ECG, balizas y luz roja
    if visible(1440, 1900):
        crisis = T_COLAPSO <= t < T_RECUPERA + 0.6
        d.rectangle((X_(1492), 120, X_(1588), 166), fill=(6, 12, 30, 255))
        pts = [(X_(1494) + i, 146 + ecg(fase_pulso(t - (92 - i) * 0.02)) * 1.3) for i in range(92)]
        d.line(pts, fill=(255, 80, 96, 255) if crisis else (52, 211, 153, 255), width=1)
        if crisis and int(t * 4) % 2:
            d.rectangle((X_(1578), 124, X_(1584), 136), fill=(255, 80, 96, 255)); d.rectangle((X_(1578), 139, X_(1584), 142), fill=(255, 80, 96, 255))
        for bx in (X_(1560), X_(1760)):
            if crisis:
                on = int(t * 5) % 2
                d.ellipse((bx - 6, Y_TECHO + 2, bx + 6, Y_TECHO + 11), fill=(255, 60, 80, 255) if on else (120, 30, 40, 255))
                ang = math.sin(t * 7) * 0.6
                capa_alfa(cv, lambda dd, x0, y0, bx=bx, ang=ang: dd.polygon([(bx - x0, Y_TECHO + 8 - y0), (bx - 70 + 160 * (ang + 0.6) / 1.2 - x0, SUELO - y0), (bx + 10 + 160 * (ang + 0.6) / 1.2 - x0, SUELO - y0)], fill=(255, 40, 70, 46)), (bx - 90, Y_TECHO, bx + 200, SUELO))
            else:
                d.ellipse((bx - 6, Y_TECHO + 2, bx + 6, Y_TECHO + 11), fill=(90, 100, 150, 255))
        if crisis:
            k = 1.0 if t < T_LUNNA else 0.5
            a = int(80 * k * (0.5 + 0.5 * math.sin(t * 2 * math.pi * 2.2)) * (1 - entre(t, T_RECUPERA, T_RECUPERA + 0.6)))
            capa_alfa(cv, lambda dd, x0, y0: dd.rectangle((X_(1447) - x0, Y_INT - y0, X_(1893) - x0, Y_PISO - y0), fill=(255, 30, 60, a)), (X_(1447), Y_INT, X_(1893), Y_PISO))
    # ---- sala común: luz cálida y vapor de la taza
    if visible(1900, 2360):
        capa_alfa(cv, lambda dd, x0, y0: dd.polygon([(X_(2222) - x0, 136 - y0), (X_(2238) - x0, 136 - y0), (X_(2300) - x0, 222 - y0), (X_(2160) - x0, 222 - y0)], fill=(255, 224, 160, 34)), (X_(2158), 135, X_(2302), 223))
        for i in range(3):
            yy = 206 - ((t * 10 + i * 5) % 14)
            d.point((X_(2268) + math.sin(t * 3 + i) * 2, yy), fill=(230, 240, 255, int(160 * (1 - (206 - yy) / 14))))
    # ---- antenas: luz que parpadea y ondas cuando sale un paquete
    for i, x in enumerate(ANTENAS):
        if not -20 < X_(x) < cv.width + 20: continue
        if int(t * 1.5 + i) % 2 == 0:
            d.rectangle((X_(x) + 6, Y_ANT + 2, X_(x) + 8, Y_ANT + 4), fill=(255, 90, 100, 255))
        for p in PAQUETES:
            if p['ant'] != i: continue
            tA = p['t'] + T_A
            if tA <= t < tA + 0.8:
                u = entre(t, tA, tA + 0.8)
                for k in range(3):
                    rr = 4 + (u * 40 + k * 10) % 34
                    a = int(220 * (1 - rr / 38))
                    capa_alfa(cv, lambda dd, x0, y0, rr=rr, a=a, col=p['color']: dd.arc((X_(x) + 2 - rr - x0, Y_ANT + 10 - rr - y0, X_(x) + 2 + rr - x0, Y_ANT + 10 + rr - y0), 280, 350, fill=con_a(col, a), width=1),
                              (X_(x) - 40, max(0, Y_ANT - 30), X_(x) + 45, Y_ANT + 50))


def dibujar_frente(cv, ox, t, info):
    """Delante de Ana: el saco de dormir, la penumbra del dormitorio y el arnés de la cinta."""
    X_ = lambda x: x - ox
    d = ImageDraw.Draw(cv, 'RGBA')
    if X_(520) > 0:
        if t < 5.0:   # saco de dormir sobre Ana
            d.rounded_rectangle((X_(196), 204, X_(264), 232), radius=6, fill=(56, 92, 196, 255), outline=(30, 40, 100, 255))
            for x in range(206, 260, 10): d.line((X_(x), 206, X_(x), 230), fill=(44, 74, 170, 255))
            d.line((X_(198), 206, X_(262), 206), fill=(120, 150, 240, 255))
        else:
            d.rounded_rectangle((X_(176), 218, X_(262), 230), radius=5, fill=(56, 92, 196, 255), outline=(30, 40, 100, 255))
            d.line((X_(180), 220, X_(258), 220), fill=(120, 150, 240, 255))
        a_n = int(150 * (1 - seno_io(entre(t, 1.2, 2.2))))
        if a_n > 0:
            capa_alfa(cv, lambda dd, x0, y0: dd.rectangle((X_(67) - x0, Y_INT - y0, X_(513) - x0, Y_PISO - y0), fill=(4, 6, 30, a_n)), (X_(67), Y_INT, X_(513), Y_PISO))
    if ana(t)['modo'] == 'correr':   # arnés elástico de la cinta
        hx, hy = info['cadera'][0] - ox, info['cadera'][1]
        for ex in (X_(692), X_(788)):
            d.line((hx, hy, ex, 252), fill=(200, 210, 240, 200))


# ============================================================ interfaz real de la app (Edge sin ventana)
PIEZAS_HTML, PZ = {}, {}


def ic(nombre, cls=''):
    return f'<svg class="ic {cls}"><use href="#i-{nombre}"/></svg>'


def sem(n, txt=''):
    formas = {0: '<circle cx="0" cy="0" r="5.6" class="f-ok"/>', 1: '<rect x="-5.25" y="-5.25" width="10.5" height="10.5" rx="1.5" class="f-ojo"/>',
              2: '<path d="M0,-7 L7,5.6 L-7,5.6Z" class="f-alto"/>'}
    return f'<span class="sem sem-{("ok", "ojo", "alto")[n]}"><svg viewBox="-8 -8 16 16" aria-hidden="true">{formas[n]}</svg>{txt}</span>'


def graf_mini(h, banda, nivel, dir_='bajo'):
    """Mini gráfica «contra tu normal» igual a la de la app (grafNormal con mini = true)."""
    W, H, mi, md, ma, mb = 320, 38, 2, 8, 8, 4
    ext = list(h) + list(banda)
    lo, hi = min(ext), max(ext)
    pad = (hi - lo) * 0.12 or 1
    lo, hi = lo - pad, hi + pad
    x = lambda i: mi + i / (len(h) - 1) * (W - mi - md)
    y = lambda v: ma + (1 - (v - lo) / (hi - lo)) * (H - ma - mb)
    fuera = lambda v: v > banda[1] if dir_ == 'alto' else v < banda[0]
    trazo = ''.join(f'{"L" if i else "M"}{x(i):.1f},{y(v):.1f}' for i, v in enumerate(h))
    puntos = ''.join(f'<circle class="punto {"fuera" if fuera(v) else ""}" cx="{x(i):.1f}" cy="{y(v):.1f}" r="1.8"/>' for i, v in enumerate(h[:-1]))
    color = ('var(--verde)', 'var(--ambar)', 'var(--rojo)')[nivel]
    return (f'<svg class="normal-graf mini" viewBox="0 0 {W} {H}" preserveAspectRatio="none">'
            f'<rect class="banda" x="{mi}" width="{W - mi - md}" y="{y(banda[1]):.1f}" height="{max(1.0, y(banda[0]) - y(banda[1])):.1f}" rx="5"/>'
            f'<path class="trazo" d="{trazo}" vector-effect="non-scaling-stroke"/>{puntos}'
            f'<circle class="hoy" cx="{x(len(h) - 1):.1f}" cy="{y(h[-1]):.1f}" r="3.4" fill="{color}"/></svg>')


def mosaico(nombre, valor, unidad, nivel, serie, banda, ancho, dir_='bajo'):
    return (f'<button class="tarjeta signo" style="width:{ancho}px"><div class="signo-cab"><b>{nombre}</b>{sem(nivel)}</div>'
            f'<div class="signo-v">{valor}<small> {unidad}</small></div>{graf_mini(serie, banda, nivel, dir_)}</button>')


SERIE_SUENO = [6.9, 7.3, 7.1, 7.1, 7.4, 7.3, 7.0, 6.9, 7.1, 6.9, 7.6, 6.0, 5.9, 5.8]


def html_sueno(t):
    return mosaico('Sleep', '5.8', 'h', 1, SERIE_SUENO, (6.02, 8.08), 230)


def html_pulso(t):
    lpm = int(round(max(64, pulso(t))))
    zona = 0 if lpm < 100 else 1 if lpm < 135 else 2
    zs = ''.join(f'<div class="{"on" if i == zona else ""}">{n}</div>' for i, n in enumerate(('Light', 'Moderate', 'Intense')))
    return (f'<div class="tarjeta" style="width:270px;text-align:center"><div style="display:flex;align-items:center;justify-content:center;gap:10px">'
            f'<span class="latido" style="display:inline-flex">{ic("corazon", "ic-lg ic-relleno")}</span><span class="bpm">{lpm}</span><span class="tenue">bpm</span></div>'
            f'<div class="zonas">{zs}</div></div>')


def html_dosis(t):
    v = dosis(t)
    n = 2 if v >= 3000 else 1 if v > 54 else 0
    txt = f'{v:.0f}' if v < 100 else f'{round(v, -1):.0f}' if v < 1000 else f'{round(v, -2):,.0f}'
    return (f'<div class="tarjeta" style="width:300px"><h3>{ic("rayo")} Dose rate now</h3>'
            f'<div class="valor-grande" style="display:flex;flex-wrap:wrap;align-items:baseline;justify-content:center;gap:4px 8px"><b>{txt}</b>'
            f'<span style="font:600 14px var(--letra);color:var(--texto-2)">µSv/h</span>{sem(n, ("In your normal", "Attention", "Go to shelter")[n])}</div>'
            f'<div style="display:grid;grid-template-columns:auto 1fr auto;gap:8px;align-items:center;font-size:12.5px;margin-top:10px">'
            f'<span class="tenue" style="font-size:12.5px">Mission dose</span><div class="barra"><i style="width:9%"></i></div><b>53.8 / 600 mSv</b></div></div>')


def html_emerg(t):
    t = round(t * 10) / 10
    spo2, lpm, temp = signos(t)
    if t < T_LUNNA:
        cab, tit = '', f'{sem(2)}&nbsp;Ana · vital signs dropping'
    elif t < T_RECUPERA:
        cab = (f'<div class="emerg-cab"><span class="emerg-etq">{ic("alerta", "ic-sm")} EMERGENCY</span>'
               f'<span class="emerg-reloj">T+00:{int(t - T_LUNNA) + 1:02d}</span></div>')
        tit = 'Lunna activated emergency mode'
    else:
        cab, tit = '', f'{sem(0)}&nbsp;Vital signs recovering'
    cl = lambda mal, ojo: ' vital-mal' if mal else ' vital-ojo' if ojo else ''
    v = lambda clase, icono_, nombre, val, uni: (f'<div class="vital{clase}"><span class="vital-nom">{ic(icono_, "ic-sm")} {nombre}</span>'
                                                 f'<b class="vital-val">{val}<small> {uni}</small></b></div>')
    return (f'<div class="tarjeta" style="width:340px">{cab}<div style="display:flex;align-items:center;gap:4px;font:650 15px var(--letra);margin:2px 0 10px">{tit}</div>'
            f'<div class="vitales" style="margin-bottom:0">'
            f'{v(cl(spo2 < 90, spo2 < 95), "gota", "SpO₂", f"{spo2:.0f}", "%")}'
            f'{v(cl(lpm > 105, lpm > 90), "corazon", "Heart rate", f"{lpm:.0f}", "bpm")}'
            f'{v("", "fuego", "Temp", f"{temp:.1f}", "°C")}</div></div>')


def html_normal(t):
    return (f'<div style="width:560px"><div style="display:flex;justify-content:center;margin-bottom:10px"><span class="chip" style="font-size:15px;font-weight:650">{sem(0)} All in your normal today</span></div>'
            f'<div style="display:flex;gap:10px">'
            f'{mosaico("SpO₂", "98", "%", 0, [97, 98, 98, 97, 98, 99, 98, 98, 97, 98, 98, 99, 98, 98], (96.2, 99.6), 180)}'
            f'{mosaico("Resting HR", "58", "bpm", 0, [59, 58, 60, 57, 58, 59, 61, 58, 57, 59, 58, 60, 59, 58], (54, 62), 180, "alto")}'
            f'{mosaico("Temp", "36.6", "°C", 0, [36.5, 36.6, 36.6, 36.7, 36.5, 36.6, 36.6, 36.7, 36.6, 36.5, 36.6, 36.7, 36.6, 36.6], (36.2, 37.0), 180, "alto")}'
            f'</div></div>')


def html_chip(hora, lugar):
    return f'<span class="chip" style="font-size:15px;font-weight:600;padding:9px 16px">{ic("hora", "ic-sm")}<b style="font-weight:750">{hora}</b>&nbsp;·&nbsp;{lugar}</span>'


def html_tierra(sub, rojo=False):
    estilo = 'color:#FCA5A5;font-weight:650' if rojo else ''
    return (f'<div class="lista" style="width:330px"><div class="lista-fila lista-fila-fija"><span class="lf-ic" style="--c:#11A3C8">{ic("tierra")}</span>'
            f'<span class="lf-txt"><b>Earth link</b><small style="{estilo}">{sub}</small></span>{ic("antena", "ic-sm")}</div></div>')


def html_paquete(icono_, texto, color, lleno=False):
    estilo = (f'background:{color};border-color:{color};color:#fff' if lleno else f'border-color:{color};color:#EAF0FF')
    return f'<span class="chip" style="font-weight:700;font-size:13px;padding:6px 12px;{estilo}">{ic(icono_, "ic-sm")} {texto}</span>'


def html_luna(cara, fase, tam, acc=''):
    return f'<div class="luna-aqui" data-cara="{cara}" data-fase="{fase}" data-tam="{tam}" data-acc="{acc}"></div>'


TARJETAS = [
    dict(t0=0.6, t1=4.2, ancla=(340, 102), esc=0.9, caja=(250, 140), html=html_sueno),
    dict(t0=5.5, t1=9.2, ancla=(560, 100), esc=0.9, caja=(290, 200), html=html_pulso),
    dict(t0=10.4, t1=14.2, ancla=(1010, 100), esc=0.9, caja=(320, 230), html=html_dosis),
    dict(t0=15.95, t1=19.4, ancla=(1662, 96), esc=0.85, caja=(360, 330), html=html_emerg),
    dict(t0=21.3, t1=24.4, ancla=(2122, 90), esc=0.8, caja=(580, 210), html=html_normal),
]
PAQUETES = [   # t: sale de la tarjeta · ant: cuarto · pieza del paquete
    dict(t=3.0, tarjeta=0, ant=0, pieza='paq0', color=C['cian'], sos=False),
    dict(t=8.15, tarjeta=1, ant=1, pieza='paq1', color=(255, 111, 168), sos=False),
    dict(t=13.1, tarjeta=2, ant=2, pieza='paq2', color=C['ambar'], sos=False),
    dict(t=17.05, tarjeta=3, ant=3, pieza='paq3', color=C['rojo'], sos=True),
    dict(t=23.7, tarjeta=4, ant=4, pieza='paq4', color=C['verde'], sos=False),
]
CHIPS = [(0.6, 4.2, 'chip0'), (5.6, 9.2, 'chip1'), (10.6, 14.2, 'chip2'), (15.6, 19.2, 'chip3'), (20.6, 24.4, 'chip4')]
LUNA_ESTADOS = [(0.0, 'dormida', 0.75, ''), (1.4, 'feliz', 0.75, ''), (5.3, 'energia', 0.85, 'pesa'), (8.8, 'tranquila', 0.75, ''),
                (10.8, 'radiacion', 0.5, ''), (T_COLAPSO, 'alerta', 0.08, ''), (T_LUNNA, 'escaneo', 0.08, ''), (T_LUNNA + 0.8, 'latido', 0.15, ''),
                (T_RECUPERA, 'tranquila', 0.5, ''), (21.4, 'feliz', 1.0, ''), (21.8, 'celebra', 1.0, ''), (22.9, 'feliz', 1.0, '')]


def registrar(html, ancho, alto, clave=None):
    k = clave or 'p' + hashlib.sha1(html.encode('utf-8')).hexdigest()[:14]
    PIEZAS_HTML[k] = (html, ancho, alto)
    return k


def piezas_fijas():
    for i, (hora, lugar) in enumerate((('06:30', 'Crew quarters'), ('08:00', 'Gym'), ('11:04', 'Observation deck'),
                                       ('11:20', 'Med bay · Shelter'), ('13:00', 'Lounge'))):
        registrar(html_chip(hora, lugar), 380, 50, f'chip{i}')
        registrar('<span class="chip" style="font-size:14px;font-weight:750;letter-spacing:.08em;padding:7px 14px">'
                  '<span style="width:10px;height:10px;border-radius:50%;background:#E5484D;box-shadow:0 0 8px #E5484D;display:inline-block"></span>'
                  f'CAM {i + 1}</span>', 160, 46, f'cam{i}')
    registrar(html_tierra('18 min one-way · priority queue'), 340, 80, 'tierra_espera')
    registrar(html_tierra('Sending · arrives in 18 min'), 340, 80, 'tierra_envio')
    registrar(html_tierra('Priority 0 · emergency', True), 340, 80, 'tierra_sos')
    for i, (icono_, texto, color, lleno) in enumerate((('luna', 'Sleep data', '#4FD2E9', False), ('corazon', 'Heart data', '#FF6FA8', False),
                                                       ('rayo', 'Dose data', '#FBBF24', False), ('alerta', 'SOS · priority 0', '#E5484D', True),
                                                       ('check', 'Daily summary', '#34D399', False))):
        registrar(html_paquete(icono_, texto, color, lleno), 220, 46, f'paq{i}')
    for _, cara, fase, acc in LUNA_ESTADOS:
        registrar(html_luna(cara, fase, 64, acc), 84, 96, f'luna_{cara}_{fase}')
    for cara in ('feliz', 'celebra'):
        registrar(html_luna(cara, 1.0, 220), 250, 280, f'lunag_{cara}')
    registrar('<div style="font:800 128px/1.05 var(--letra);letter-spacing:.08em;color:#EEF3FF;white-space:nowrap;'
              'text-shadow:0 0 30px rgba(141,184,255,.55),0 0 2px rgba(255,255,255,.6)">LUNNA</div>', 640, 160, 'logo')
    registrar('<div style="font:650 36px/1.2 var(--letra);color:#8DB8FF;white-space:nowrap">Health on board</div>', 420, 56, 'logo_sub')
    registrar('<div style="font:500 21px/1.2 var(--letra);color:#9BA9CF;white-space:nowrap">Team Monarcas · NASA Space Apps 2026</div>', 520, 36, 'logo_eq')


PAGINA = """<!doctype html><html lang="en" data-tema="oscuro"><head><meta charset="utf-8">
<link rel="stylesheet" href="@@M@@/estilos.css"><link rel="stylesheet" href="@@M@@/cuerpo.css"><link rel="stylesheet" href="@@M@@/tema.css">
<style>
html,body{background:transparent!important;margin:0!important;padding:0!important;overflow:hidden;width:@@W@@px;height:@@H@@px;min-height:0!important}
body::before,body::after{display:none!important;content:none!important}
*,*::before,*::after{animation:none!important;transition:none!important}
.pz{position:absolute}
.pz .tarjeta,.pz .lista{margin:0!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.14),inset 0 -1px 0 rgba(120,170,255,.06)!important}
.pz .chip{box-shadow:none!important}
</style></head><body>
@@PIEZAS@@
<script src="@@M@@/iconos.js"></script><script src="@@M@@/luna.js"></script>
<script>document.querySelectorAll('.luna-aqui').forEach(function(el){LUNA.crear(el,{cara:el.dataset.cara,fase:+el.dataset.fase,accesorio:el.dataset.acc||null,tam:+el.dataset.tam});});</script>
</body></html>"""


def navegador():
    for p in (r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe', r'C:\Program Files\Microsoft\Edge\Application\msedge.exe',
              r'C:\Program Files\Google\Chrome\Application\chrome.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'):
        if os.path.exists(p): return p
    raise SystemExit('Hace falta Microsoft Edge o Google Chrome para dibujar las tarjetas de la app.')


def capturar_pagina(html, w, h, png):
    tmp = pathlib.Path(tempfile.mkdtemp(prefix='lunna-'))
    pag = tmp / 'p.html'; pag.write_text(html, encoding='utf-8')
    salida = tmp / 'p.png'
    subprocess.run([navegador(), '--headless', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--no-default-browser-check',
                    f'--user-data-dir={tmp / "perfil"}', f'--force-device-scale-factor={DPR}', '--default-background-color=00000000',
                    f'--window-size={w},{h}', f'--screenshot={salida}', pag.as_uri()], capture_output=True)
    fin, antes = time.time() + 90, -1
    while time.time() < fin:
        if salida.exists():
            n = salida.stat().st_size
            if n > 0 and n == antes:
                try:
                    with Image.open(salida) as im: im.load()
                    break
                except OSError: pass
            antes = n
        time.sleep(0.5)
    else:
        raise SystemExit('El navegador no generó la captura de las tarjetas.')
    CACHE.mkdir(parents=True, exist_ok=True)
    shutil.copy(salida, png)
    shutil.rmtree(tmp, ignore_errors=True)


def capturar():
    """Acomoda todas las piezas en hojas, las captura (o usa la caché) y recorta cada una."""
    claves = sorted(PIEZAS_HTML)
    ANCHO, ALTO_MAX, M = 1900, 2400, 24
    hojas, actual, x, y, fila = [], [], 0, 0, 0
    for k in claves:
        _, w, h = PIEZAS_HTML[k]
        if x + w + M > ANCHO: x, y, fila = 0, y + fila + M, 0
        if y + h + M > ALTO_MAX and actual:
            hojas.append(actual); actual, x, y, fila = [], 0, 0, 0
        actual.append((k, x + M, y + M, w, h)); x += w + M; fila = max(fila, h)
    if actual: hojas.append(actual)
    url_m = MAQUETA.as_uri()
    for i, hoja in enumerate(hojas):
        alto = max(py + h for _, _, py, _, h in hoja) + M
        cuerpo = ''.join(f'<div class="pz" style="left:{px}px;top:{py}px">{PIEZAS_HTML[k][0]}</div>' for k, px, py, _, _ in hoja)
        html = PAGINA.replace('@@M@@', url_m).replace('@@W@@', str(ANCHO)).replace('@@H@@', str(alto)).replace('@@PIEZAS@@', cuerpo)
        png = CACHE / (hashlib.sha1((html + str(DPR)).encode('utf-8')).hexdigest()[:16] + '.png')
        if not png.exists():
            print(f'  capturando hoja {i + 1}/{len(hojas)} ({len(hoja)} piezas)…', flush=True)
            capturar_pagina(html, ANCHO, alto, png)
        im = Image.open(png).convert('RGBA')
        for k, px, py, w, h in hoja:
            trozo = im.crop(((px - 10) * DPR, (py - 10) * DPR, (px + w + 10) * DPR, (py + h + 10) * DPR))
            bb = trozo.getchannel('A').getbbox()
            PZ[k] = trozo.crop(bb) if bb else trozo


def preparar_piezas():
    piezas_fijas()
    for f in range(NF):
        t = f / FPS
        for tj in TARJETAS:
            if tj['t0'] <= t < tj['t1'] + 0.35: registrar(tj['html'](t), *tj['caja'])
    capturar()


# ============================================================ composición de la interfaz (a 1920×1080)
_escaladas, _mascaras = {}, {}


def pieza(k, esc=1.0):
    q = round(esc, 2)
    if q == 1.0: return PZ[k]
    if (k, q) not in _escaladas:
        im = PZ[k]
        _escaladas[(k, q)] = im.resize((max(1, round(im.width * q)), max(1, round(im.height * q))), Image.LANCZOS)
    return _escaladas[(k, q)]


def colocar(base, k, x, y, esc=1.0, alfa=1.0, vidrio=True, sombra=True):
    """Pega una pieza nítida con vidrio desenfocado detrás (como backdrop-filter) y sombra suave."""
    if alfa <= 0.01: return
    im = pieza(k, esc)
    w, h = im.size
    x, y = int(round(x)), int(round(y))
    clave = (k, round(esc, 2))
    if vidrio or sombra:
        if clave not in _mascaras:
            m = im.getchannel('A').point(lambda v: 255 if v > 6 else 0)
            sh = Image.new('L', (w + 72, h + 72), 0); sh.paste(m, (36, 36)); sh = sh.filter(ImageFilter.GaussianBlur(16))
            _mascaras[clave] = (m, sh)
        m, sh = _mascaras[clave]
        if sombra:
            base.paste((0, 0, 0), (x - 36, y - 36 + 10), sh.point(lambda v, a=alfa: int(v * 0.3 * a)))
        if vidrio:
            reg = base.crop((x, y, x + w, y + h))
            reg = Image.blend(reg, Image.new('RGB', reg.size, (6, 12, 40)), 0.62)
            base.paste(reg, (x, y), m if alfa >= 0.99 else m.point(lambda v, a=alfa: int(v * a)))
    if alfa < 0.99:
        im = im.copy(); im.putalpha(im.getchannel('A').point(lambda v, a=alfa: int(v * a)))
    base.paste(im, (x, y), im)


def a_salida(xw, yw, izq):
    return ((xw - izq) * ESC, (yw - VY) * ESC)


def rect_tarjeta(tj, t, izq):
    k = registrar(tj['html'](t), *tj['caja'])
    im = pieza(k, tj['esc'])
    x, y = a_salida(tj['ancla'][0], tj['ancla'][1], izq)
    return x, y, im.width, im.height


def hud_tierra_pos():
    im = PZ['tierra_espera']
    return OW - 36 - im.width, 24, im.width, im.height


def ruta_paquete(p, t):
    """Posición (x, y), escala y tramo del paquete en el instante t, o None si no está volando."""
    t0 = p['t']; tA = t0 + T_A; tB = tA + T_B
    if not t0 <= t < tB: return None
    tj = TARJETAS[p['tarjeta']]
    x, y, w, h = rect_tarjeta(tj, t0, camara(t0) - AW / 2)
    p0 = (x + w / 2, y + h / 2)
    if t < tA:
        u = sale(entre(t, t0, tA))
        ant = (p0[0] + 90, 150)
        pc = ((p0[0] + ant[0]) / 2, min(p0[1], ant[1]) - 140)
        return bezier(p0, pc, ant, u), lerp(1.3, 1.0, u), 'A'
    u = seno_io(entre(t, tA, tB))
    ant = (p0[0] + 90, 150)
    hx, hy, hw, hh = hud_tierra_pos()
    meta = (hx + 40, hy + hh / 2)
    pc = ((ant[0] + meta[0]) / 2, 30)
    return bezier(ant, pc, meta, u), lerp(1.0, 0.8, u), 'B'


def estado_tierra(t):
    for p in PAQUETES:
        if p['sos'] and p['t'] <= t < 19.6: return 'tierra_sos'
    for p in PAQUETES:
        if p['t'] <= t < p['t'] + T_A + T_B + 1.6: return 'tierra_envio'
    return 'tierra_espera'


def dibujar_luna_hud(base, t):
    i = max(j for j, s in enumerate(LUNA_ESTADOS) if s[0] <= t)
    t_i, cara, fase, _ = LUNA_ESTADOS[i]
    k = f'luna_{cara}_{fase}'
    dt = t - t_i
    pop = 1 + 0.12 * math.sin(math.pi * clamp(dt / 0.3, 0, 1)) if i > 0 else 1.0
    y = 22 + 3 * math.sin(t * 2.0)
    temblor = (2 if int(t * 20) % 2 else -2) if T_COLAPSO <= t < T_LUNNA else 0
    im = pieza(k, pop)
    cx, cy = 36 + PZ[k].width / 2 + temblor, y + PZ[k].height / 2
    if i > 0 and dt < 0.18:   # fundido corto entre caritas
        _, c0, f0, _ = LUNA_ESTADOS[i - 1]
        k0 = f'luna_{c0}_{f0}'
        colocar(base, k0, cx - PZ[k0].width / 2, cy - PZ[k0].height / 2, 1.0, 1 - dt / 0.18, vidrio=False, sombra=False)
    colocar(base, k, cx - im.width / 2, cy - im.height / 2, pop, 1.0 if dt >= 0.18 or i == 0 else dt / 0.18, vidrio=False, sombra=False)


def dibujar_cam(base, t, fin):
    """Ya no se usa: la interfaz de cámara era solo un ejemplo."""
    return
    if t >= 25.3: return
    tr = transicion(t)
    if tr is None: i, a = escena_de(t), 1.0
    else: i, a = (tr[0] if tr[1] < 0.5 else tr[0] + 1), abs(1 - 2 * tr[1])
    k = f'cam{i}'
    colocar(base, k, 36, OH - 36 - PZ[k].height, 1.0, a * (1 - fin) * sale(entre(t, 0.3, 0.7)))
    d = ImageDraw.Draw(base, 'RGBA')
    al = int(150 * (1 - fin))
    for (x, y, sx, sy) in ((24, 24, 1, 1), (OW - 24, 24, -1, 1), (24, OH - 24, 1, -1), (OW - 24, OH - 24, -1, -1)):
        d.line((x, y, x + 60 * sx, y), fill=(230, 240, 255, al), width=3); d.line((x, y, x, y + 60 * sy), fill=(230, 240, 255, al), width=3)


COLOR_DATO = [(79, 210, 233), (255, 111, 168), (251, 191, 36), (248, 82, 96), (52, 211, 153)]


def fuente_dato(i, t):
    """De dónde sale el dato de cada tarjeta, en el mundo: la cabeza (sueño) o el pecho (pulso, dosímetro, signos)."""
    hx, hy = cabeza_mundo(t)
    if t < 5.0: return (hx + 30, hy + 2) if i else (hx, hy)          # acostada: el cuerpo queda a la derecha del casco
    return (hx + 3, hy + 25)


def linea_dato(base, i, t, izq, x, y, tam, alfa):
    """Línea animada desde el sensor en el cuerpo de Ana hasta su tarjeta: los datos viajan por ella."""
    if alfa <= 0.02: return
    w, h = tam
    sx, sy = a_salida(*fuente_dato(i, t), izq)
    ex = x if sx < x else x + w if sx > x + w else sx
    ey = y + h / 2 if (sx < x or sx > x + w) else (y + h if sy > y + h else y)
    col = COLOR_DATO[i]
    capa = Image.new('RGBA', base.size, (0, 0, 0, 0)); d = ImageDraw.Draw(capa)
    largo = math.hypot(ex - sx, ey - sy) or 1
    ux, uy = (ex - sx) / largo, (ey - sy) / largo
    fase = (t * 220) % 28
    k = -fase
    while k < largo:   # guiones que avanzan del cuerpo a la tarjeta
        a0, a1 = max(0, k), min(largo, k + 14)
        if a1 > a0:
            d.line((sx + ux * a0, sy + uy * a0, sx + ux * a1, sy + uy * a1), fill=con_a(col, int(230 * alfa)), width=4)
        k += 28
    r = 9 + 5 * math.sin(t * 8)
    d.ellipse((sx - r - 6, sy - r - 6, sx + r + 6, sy + r + 6), outline=con_a(col, int(150 * alfa)), width=3)
    d.ellipse((sx - 7, sy - 7, sx + 7, sy + 7), fill=con_a(col, int(255 * alfa)), outline=(255, 255, 255, int(220 * alfa)), width=2)
    d.ellipse((ex - 6, ey - 6, ex + 6, ey + 6), fill=con_a(col, int(255 * alfa)))
    brillo = capa.filter(ImageFilter.GaussianBlur(6))
    base.paste(brillo, (0, 0), brillo); base.paste(capa, (0, 0), capa)


def capa_ui(base, t, izq, con_tarjetas=True):
    fin = seno_io(entre(t, 25.0, 25.4))
    dibujar_cam(base, t, fin)
    # tarjetas de la app flotando en cada cuarto
    for tj in (TARJETAS if con_tarjetas else ()):
        if not tj['t0'] <= t < tj['t1'] + 0.3: continue
        ent = sale(entre(t, tj['t0'], tj['t0'] + 0.35)); sal_ = seno_io(entre(t, tj['t1'], tj['t1'] + 0.3))
        alfa = ent * (1 - sal_)
        k = registrar(tj['html'](t), *tj['caja'])
        esc = tj['esc'] * (0.94 + 0.06 * ent)
        x, y = a_salida(tj['ancla'][0], tj['ancla'][1], izq)
        y += (1 - ent) * 20 - sal_ * 14
        linea_dato(base, TARJETAS.index(tj), t, izq, x, y, pieza(k, esc).size, alfa)
        colocar(base, k, x, y, esc, alfa)
    # hora y lugar
    for t0, t1, k in (CHIPS if con_tarjetas else ()):
        if not t0 <= t < t1 + 0.3: continue
        ent = sale(entre(t, t0, t0 + 0.3)); sal_ = seno_io(entre(t, t1, t1 + 0.3))
        colocar(base, k, OW / 2 - PZ[k].width / 2, 30 - (1 - ent) * 16 - sal_ * 10, 1.0, ent * (1 - sal_))
    # enlace con Tierra (arriba a la derecha) y paquetes en vuelo
    if t < 25.4:
        k = estado_tierra(t)
        pulso_ = 0.0
        for p in PAQUETES:
            tB = p['t'] + T_A + T_B
            if tB <= t < tB + 0.4: pulso_ = math.sin(math.pi * (t - tB) / 0.4)
        hx, hy, hw, hh = hud_tierra_pos()
        esc = 1 + 0.06 * pulso_
        colocar(base, k, hx - hw * (esc - 1) / 2, hy - hh * (esc - 1) / 2, esc, sale(entre(t, 0.3, 0.7)) * (1 - fin))
        d = ImageDraw.Draw(base, 'RGBA')
        for p in PAQUETES:
            r = ruta_paquete(p, t)
            if r is None: continue
            for j in range(1, 9):   # estela
                rj = ruta_paquete(p, t - j * 0.03)
                if rj is None: break
                (sx, sy), _, _ = rj
                rad = 7 - j * 0.6
                d.ellipse((sx - rad, sy - rad, sx + rad, sy + rad), fill=con_a(p['color'], int(170 * (1 - j / 9))))
            (px, py), esc, _ = r
            im = pieza(p['pieza'], esc)
            colocar(base, p['pieza'], px - im.width / 2, py - im.height / 2, esc, 1.0, vidrio=False)
    if t < 25.3:
        dibujar_luna_hud(base, t)
    else:
        dibujar_final(base, t)


def dibujar_final(base, t):
    """25,3–30 s: Lunna llena va al centro, brilla y aparece LUNNA."""
    u = seno_io(entre(t, *T_VIAJE))
    kc = 'luna_feliz_1.0'
    p0 = (36 + PZ[kc].width / 2, 22 + PZ[kc].height / 2)
    p1 = (OW / 2, 318)
    cx, cy = bezier(p0, (OW * 0.3, 620), p1, u)
    big = PZ['lunag_feliz']
    esc = lerp(PZ[kc].width / big.width, 0.76, u)
    capa = Image.new('RGBA', base.size, (0, 0, 0, 0)); dc = ImageDraw.Draw(capa)
    if t > T_VIAJE[1] - 0.2:   # anillos de luz
        r0 = big.width * 0.76 * 0.42
        for j in range(3):
            q = ((t - T_VIAJE[1] + 0.2) * 160 + j * 70) % 210
            a = int(150 * (1 - q / 210) * entre(t, T_VIAJE[1] - 0.2, T_VIAJE[1] + 0.2))
            dc.ellipse((cx - r0 - q, cy - r0 - q, cx + r0 + q, cy + r0 + q), outline=(190, 220, 255, a), width=3)
    r_ = random.Random(9)
    for i in range(40):   # chispas
        ang = r_.uniform(0, 2 * math.pi); vel = r_.uniform(120, 420); t0 = T_ACORDE + r_.uniform(-0.1, 0.3)
        if t0 <= t < t0 + 1.2:
            dt = t - t0; rr = 200 + vel * dt
            x, y = cx + math.cos(ang) * rr, cy + math.sin(ang) * rr * 0.7
            dc.rectangle((x - 3, y - 3, x + 3, y + 3), fill=(255, 230, 150, int(230 * (1 - dt / 1.2))))
    capa = capa.filter(ImageFilter.GaussianBlur(1.2))
    base.paste(capa, (0, 0), capa)
    cara = 'lunag_celebra' if T_ACORDE <= t < T_ACORDE + 1.0 else 'lunag_feliz'
    im = pieza(cara, esc)
    colocar(base, cara, cx - im.width / 2, cy - im.height / 2, esc, 1.0, vidrio=False, sombra=False)
    lg = pieza('logo', 0.56)
    y_logo = 540
    y_sub = y_logo + lg.height - 4
    y_eq = y_sub + PZ["logo_sub"].height + 18
    if t > T_LETRAS:   # LUNNA aparece de izquierda a derecha
        rev = sale(entre(t, T_LETRAS, T_LETRAS + 0.6))
        recorte = lg.crop((0, 0, max(1, int(lg.width * rev)), lg.height))
        base.paste(recorte, (int(OW / 2 - lg.width / 2), int(y_logo - 10 * (1 - rev))), recorte)
    if t > T_ACORDE:
        a = sale(entre(t, T_ACORDE, T_ACORDE + 0.4))
        colocar(base, 'logo_sub', OW / 2 - PZ['logo_sub'].width / 2, y_sub + 8 * (1 - a), 1.0, a, vidrio=False, sombra=False)
    if t > T_ACORDE + 0.3:
        colocar(base, 'logo_eq', OW / 2 - PZ['logo_eq'].width / 2, y_eq, 1.0, sale(entre(t, T_ACORDE + 0.3, T_ACORDE + 0.7)), vidrio=False, sombra=False)


# ============================================================ cuadro completo
MUNDO = None
PULSO = 0.0


def luces_ritmo(cv, ox, i, p):
    """Las luces del techo del cuarto laten con el bombo y la caja."""
    if p < 0.03: return
    a, b = CUARTOS[i]
    for x in range(a + 34, b - 40, 92):
        xs = x - ox
        capa_alfa(cv, lambda dd, x0, y0, xs=xs: dd.polygon([(xs - x0, Y_TECHO - y0), (xs + 36 - x0, Y_TECHO - y0), (xs + 62 - x0, SUELO - y0), (xs - 26 - x0, SUELO - y0)],
                                                         fill=(200, 230, 255, int(30 * min(p, 1.2)))), (xs - 28, Y_TECHO, xs + 64, SUELO))
        capa_alfa(cv, lambda dd, x0, y0, xs=xs: dd.rectangle((xs - 2 - x0, Y_TECHO - 6 - y0, xs + 38 - x0, Y_TECHO + 1 - y0), fill=(255, 255, 255, int(170 * min(p, 1.2)))),
                  (xs - 3, Y_TECHO - 7, xs + 40, Y_TECHO + 2))


def render_escena(i, t, con_fondo=False):
    """El cuarto i como una caja cerrada flotando en el espacio (vista de corte).
    Devuelve el cuadro a 1920×1080, la máscara de la caja, la caja en pantalla, izq y (opcional) el fondo solo."""
    c = camara_escena(i, t)
    izq = c - AW / 2
    ox = int(math.floor(izq)); frac = izq - ox
    cv = Image.new('RGB', (AW + 2, AH), (0, 0, 0))
    dibujar_exterior(cv, c, ox, t)
    fondo = cv.copy()
    dibujar_ventanas(cv, c, t)
    trozo = MUNDO.crop((ox - X_MIN, 0, ox - X_MIN + AW + 2, AH))
    cv.paste(trozo, (0, 0), trozo)
    dibujar_cuartos(cv, ox, t)
    luces_ritmo(cv, ox, i, PULSO)
    dibujar_estela(cv, ox, t)
    e = ana(t)
    led = C['rojo'] if T_COLAPSO <= t < T_RECUPERA else C['ambar'] if (10.8 < t < 13.6 or t < 3.4) else C['verde']
    info = dibujar_astronauta(cv, e, ox, t, led)
    dibujar_frente(cv, ox, t, info)
    dibujar_efectos_ana(cv, ox, t, info)
    dibujar_particulas(cv, ox, t)
    a, b = CUARTOS[i]
    x0, x1 = a - 13 - ox, b + 13 - ox
    d = ImageDraw.Draw(cv)
    for xs in (x0, x1 - 6):   # tapas laterales: el cuarto es una caja cerrada
        d.rectangle((xs, Y_CASCO, xs + 6, Y_FONDO), fill=CASCO, outline=(58, 64, 102))
        for y in range(Y_CASCO + 6, Y_FONDO, 11): d.point((xs + 3, y), fill=(170, 178, 214))
    masc = Image.new('L', cv.size, 0); dm = ImageDraw.Draw(masc)
    dm.rectangle((x0, Y_CASCO, x1, Y_FONDO), fill=255)
    lienzo = Image.new('RGB', cv.size, (0, 0, 0)); lienzo.paste(cv, (0, 0), masc)
    o = min(int(round(frac * ESC)), (AW + 2) * ESC - OW)

    def subir(im_):
        arr_ = np.asarray(im_)[VY:VY + VH]
        if arr_.ndim == 3 and negro(t) < 1: arr_ = (arr_ * negro(t)).astype(np.uint8)
        if t > 25.0 and arr_.ndim == 3:   # la nave se oscurece para el logo
            a_ = 0.86 * seno_io(entre(t, 25.0, 25.7))
            arr_ = (arr_ * (1 - a_) + np.array((3, 4, 14)) * a_).astype(np.uint8)
        return np.ascontiguousarray(arr_.repeat(ESC, 0).repeat(ESC, 1)[:, o:o + OW])

    caja = (x0 * ESC - o, 0, (x1 + 1) * ESC - o, OH)
    return subir(lienzo), subir(masc), caja, izq, (subir(fondo) if con_fondo else None)


def muros(L):
    """Fondo con los muros gruesos entre cuartos: caras cortadas con rayado y núcleo oscuro con tubos."""
    im = Image.new('RGB', (OW, OH), (6, 7, 16))
    d = ImageDraw.Draw(im)
    for k in range(len(CUARTOS) + 1):
        v0, v1 = k * PERIODO - MURO / 2, k * PERIODO + MURO / 2
        x0, x1 = (v0 - L) * ESC, (v1 - L) * ESC
        if x1 < -40 or x0 > OW + 40: continue
        d.rectangle((x0, 0, x1, OH), fill=(12, 14, 28))
        for xx in range(int(x0) + 60, int(x1) - 60, 72):          # paneles del núcleo
            d.line((xx, 0, xx, OH), fill=(18, 21, 40), width=4)
        for yy in (300, 330, 760):                                  # tubos que cruzan el muro
            d.rectangle((x0, yy, x1, yy + 14), fill=(28, 32, 58)); d.line((x0, yy, x1, yy), fill=(50, 58, 96), width=2)
        for xc, w in ((x0, 112), (x1 - 112, 112)):                  # caras cortadas, rayadas
            d.rectangle((xc, 0, xc + w, OH), fill=(30, 34, 58))
            for k2 in range(-OH, int(w) + OH, 26):
                d.line((xc + k2, OH, xc + k2 + OH, 0), fill=(52, 58, 94), width=5)
            d.rectangle((xc, 0, xc + w, OH), outline=(14, 16, 32), width=4)
        d.rectangle((x0 + 112, 0, x1 - 112, OH), outline=(20, 24, 46), width=3)
        # tapa la parte del rayado que se salió de la cara
        d.rectangle((x0 - 200, 0, x0 - 1, OH), fill=(6, 7, 16)); d.rectangle((x1 + 1, 0, x1 + 200, OH), fill=(6, 7, 16))
    return im


def cuadro(f):
    global PULSO
    t = f / FPS
    PULSO = pulso_ritmo(t)
    L = recorrido(t) - AW / 2
    img = muros(L)
    for i in range(len(CUARTOS)):
        v0 = i * PERIODO + MURO / 2; v1 = v0 + ANCHO_CUARTO
        if v1 + 8 < L or v0 - 8 > L + AW: continue
        arr, m, _, _, _ = render_escena(i, t)
        img.paste(Image.fromarray(arr), (0, 0), Image.fromarray(m))
    capa_ui(img, t, camara(t) - AW / 2, True)
    arr = np.asarray(img).astype(np.float32)
    if PULSO > 0.02:   # cada golpe de bombo o caja: un respiro de luz y un salto pequeño de cámara
        arr *= 1 + 0.07 * min(PULSO, 1.3)
        dy = int(round(4 * min(PULSO, 1.3)))
        if dy: arr = np.concatenate([arr[dy:], np.repeat(arr[-1:], dy, 0)], 0)
    fundido = entre(t, 0.0, 0.4) * (1 - entre(t, 29.35, 30.0))
    if fundido < 1: arr *= fundido
    return arr.clip(0, 255).astype(np.uint8)


# ============================================================ audio (sintetizadores espaciales)
N_AUD = int(DUR * SR)
MEZ = np.zeros((N_AUD, 2), np.float32)
REV = np.zeros((N_AUD, 2), np.float32)     # envío a la reverb
BEAT = 0.5                                 # 120 BPM, compás de 2 s


def midi(n):
    nombres = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}
    if isinstance(n, (int, float)): return float(n)
    base = nombres[n[0]]; i = 1
    if n[i] == '#': base += 1; i += 1
    elif n[i] == 'b': base -= 1; i += 1
    return 12 * (int(n[i:]) + 1) + base


def hz(n): return 440.0 * 2 ** ((midi(n) - 69) / 12)


def poner(senal, t0, g=1.0, pan=0.0, rev=0.0):
    i0 = int(t0 * SR)
    if i0 >= N_AUD or i0 + len(senal) <= 0: return
    s = np.asarray(senal, np.float32)
    if i0 < 0: s = s[-i0:]; i0 = 0
    s = s[:N_AUD - i0] * g
    a = (clamp(pan, -1, 1) + 1) * math.pi / 4
    MEZ[i0:i0 + len(s), 0] += s * math.cos(a); MEZ[i0:i0 + len(s), 1] += s * math.sin(a)
    if rev:
        REV[i0:i0 + len(s), 0] += s * rev * math.cos(a); REV[i0:i0 + len(s), 1] += s * rev * math.sin(a)


def pb(x, fc, taps=201):
    """Pasa bajos FIR (sinc con ventana)."""
    fc = clamp(fc, 20, SR * 0.45)
    n = np.arange(taps) - (taps - 1) / 2
    h = np.sinc(2 * fc / SR * n) * np.hamming(taps); h /= h.sum()
    return np.convolve(x, h, 'same').astype(np.float32)


def pa(x, fc): return (x - pb(x, fc)).astype(np.float32)


def ruido(dur, semilla=0):
    return np.random.default_rng(semilla).uniform(-1, 1, max(1, int(dur * SR))).astype(np.float32)


def sierra(f, n, det=0.0, fase0=0.0):
    ph = (fase0 + f * 2 ** (det / 12) * np.arange(n) / SR) % 1.0
    return (2 * ph - 1).astype(np.float32)


def seno(f, n): return np.sin(2 * np.pi * f * np.arange(n) / SR).astype(np.float32)


def envolvente(n, a, dur, r):
    t = np.arange(n) / SR
    e = np.minimum(1.0, t / max(a, 1e-3))
    return np.where(t > dur, e * np.clip(1 - (t - dur) / r, 0, 1), e).astype(np.float32)


def pad(notas, t0, dur, g, fc=1200, a=0.6, r=1.4, rev=0.7, ancho=0.7):
    """Colchón de sierras desafinadas y filtradas, abierto en estéreo y con mucha reverb."""
    n = int((dur + r) * SR)
    env_ = envolvente(n, a, dur, r)
    for j, nn in enumerate(notas):
        f = hz(nn)
        x = (sierra(f, n, -0.09, 0.1 * j) + sierra(f, n, 0.0, 0.37) + sierra(f, n, 0.09, 0.71)) / 3
        poner(pb(x, fc) * env_, t0, g, (j / max(1, len(notas) - 1) - 0.5) * ancho, rev)


def pluck(nn, t0, g, fc=2600, dec=7.0, pan=0.0, rev=0.4, eco=0.4):
    """Nota pulsada con eco ping-pong."""
    n = int(0.7 * SR); t = np.arange(n) / SR; f = hz(nn)
    x = pb((0.55 * sierra(f, n) + 0.45 * seno(f, n)) * np.exp(-t * dec), fc)
    poner(x, t0, g, pan, rev)
    if eco:
        for k in range(1, 4): poner(x, t0 + k * 0.375, g * eco ** k, -0.5 if k % 2 else 0.5, rev)


def campana(nn, t0, g, pan=0.0, rev=0.6, dur=1.6):
    """Sin campanitas (no gustaron como notificación): queda muda."""
    return


def bajo(nn, t0, dur, g, fc=420):
    n = int((dur + 0.05) * SR); f = hz(nn)
    poner(pb(0.6 * seno(f, n) + 0.4 * sierra(f, n), fc) * envolvente(n, 0.005, dur, 0.05), t0, g, 0.0, 0.05)


def bombo(t0, g=0.5):
    n = int(0.35 * SR); t = np.arange(n) / SR
    f = 46 + 110 * np.exp(-t * 30)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 8)
    x[:220] += pb(ruido(220 / SR, int(t0 * 1000)), 3000)[:220] * np.linspace(0.4, 0, 220)
    poner(x, t0, g, 0.0, 0.08)


def caja_(t0, g=0.3):
    n = int(0.3 * SR); t = np.arange(n) / SR
    rz = ruido(0.3, int(t0 * 1000))[:n]
    x = (pb(rz, 6500) - pb(rz, 900)) * np.exp(-t * 16) + 0.5 * np.sin(2 * np.pi * 185 * t) * np.exp(-t * 28)
    poner(x, t0, g, 0.05, 0.45)


def charles(t0, g=0.05, pan=0.25):
    rz = ruido(0.06, int(t0 * 997)); t = np.arange(len(rz)) / SR
    poner(pa(rz, 7000) * np.exp(-t * 70), t0, g, pan, 0.1)


def latido_snd(t0, g=0.3):
    for dt_, gg in ((0.0, 1.0), (0.13, 0.7)):
        n = int(0.14 * SR); t = np.arange(n) / SR
        poner(np.sin(2 * np.pi * 55 * t) * np.exp(-t * 26), t0 + dt_, g * gg, 0.0, 0.1)


def impacto(t0, g=0.5):
    bombo(t0, g)
    n = int(1.6 * SR); t = np.arange(n) / SR
    poner(np.sin(2 * np.pi * 38 * t) * np.exp(-t * 2.5), t0, g * 0.6, 0.0, 0.2)
    rz = ruido(1.2, 5); poner(pb(rz, 1800) * np.exp(-np.arange(len(rz)) / SR * 4), t0, g * 0.35, 0.0, 0.8)


def barrido(t0, dur, g, f0, f1, pan=0.0, rev=0.4):
    n = int(dur * SR); f = f0 * (f1 / f0) ** (np.arange(n) / n)
    poner(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * np.arange(n) / n), t0, g, pan, rev)


def zumbido(t0, dur, g=0.12):
    """Soplo de aire filtrado que cruza de izquierda a derecha (cambio de cámara, caminatas)."""
    w = pb(ruido(dur, int(t0 * 77)), 1400) * np.sin(np.linspace(0, np.pi, int(dur * SR))) ** 2
    mitad = len(w) // 2
    poner(w[:mitad], t0, g, -0.6, 0.3); poner(w[mitad:], t0 + mitad / SR, g, 0.6, 0.3)


def alarma(t0, dur, g):
    n = int(dur * SR); t = np.arange(n) / SR
    f = np.where((t // 0.25) % 2 == 0, hz('A4'), hz('E5')) * (1 + 0.006 * np.sin(2 * np.pi * 6 * t))
    x = 2 * ((np.cumsum(f) / SR) % 1) - 1
    poner(pb(x, 2400) * envolvente(n, 0.02, dur - 0.05, 0.05), t0, g, 0.0, 0.35)


def pasos(t0, t1, g=0.06):
    """Pisadas suaves, con paneo según dónde va Ana en pantalla."""
    t, ultimo = t0, None
    while t < t1:
        e = ana(t)
        if e['modo'] in ('trotar', 'correr'):
            k = int(e['fase'] * 2)
            if ultimo is not None and k != ultimo:
                x_pant = e['x'] - camara(t) + AW / 2
                n = ruido(0.05, int(t * 1000)); tt = np.arange(len(n)) / SR
                poner(pb(n, 900) * np.exp(-tt * 70), t, g, clamp((x_pant / AW) * 1.4 - 0.7, -0.8, 0.8))
            ultimo = k
        t += 1 / 240


def golpes():
    """Golpes de batería (y latidos e impactos) en la rejilla de 120 BPM: suenan y se ven en el video."""
    g = []
    for k in range(int(DUR / BEAT)):
        t = k * BEAT; n = k % 4
        if 4.0 <= t < 5.0: g.append((t, 'bombo', 0.45))
        elif 5.0 <= t < 9.75:
            g.append((t, 'bombo', 0.7))
            if n in (1, 3): g.append((t, 'caja', 1.0))
        elif 10.0 <= t < 14.75:
            if n == 0: g.append((t, 'bombo', 0.7))
            if n == 2: g.append((t, 'caja', 1.0))
        elif 18.6 <= t < 19.75:
            if n == 0: g.append((t, 'bombo', 0.5))
            if n == 2: g.append((t, 'caja', 0.7))
        elif 20.0 <= t < 25.0:
            if n in (0, 2): g.append((t, 'bombo', 0.6))
            if n in (1, 3): g.append((t, 'caja', 0.9))
    g += [(tb, 'latido', 0.45) for tb in latidos(15.9, 18.6)]
    g += [(T_COLAPSO, 'impacto', 1.5), (T_ACORDE, 'final', 1.6)]
    return sorted(g)


GOLPES = golpes()


def pulso_ritmo(t):
    p = 0.0
    for tg, _, w in GOLPES:
        if tg <= t < tg + 0.5: p = max(p, w * math.exp(-(t - tg) / 0.11))
    return p


def fft_conv(x, h):
    n = len(x) + len(h) - 1; N = 1 << (n - 1).bit_length()
    return np.fft.irfft(np.fft.rfft(x, N) * np.fft.rfft(h, N), N)[:len(x)].astype(np.float32)


def respuesta_reverb(dur=2.8, rt=2.4):
    t = np.arange(int(dur * SR)) / SR
    canales = []
    for k in range(2):
        rz = pb(ruido(dur, 900 + k)[:len(t)] * np.exp(-6.9 * t / rt), 5200)
        rz[:int(0.018 * SR)] = 0
        canales.append(rz / np.sqrt((rz ** 2).sum()))
    return np.stack(canales, 1)


def componer():
    MEZ[:] = 0; REV[:] = 0
    # ---------------- batería y latidos (los mismos golpes que hacen latir la imagen)
    for tg, tipo, w in GOLPES:
        if tipo == 'bombo': bombo(tg, 0.5 * w)
        elif tipo == 'caja': caja_(tg, 0.28 * w)
        elif tipo == 'latido': latido_snd(tg, 0.32)
        elif tipo == 'impacto': impacto(tg, 0.45)
        elif tipo == 'final': impacto(tg, 0.35); caja_(tg, 0.25)
    for k in range(int(DUR / (BEAT / 2))):
        t = k * BEAT / 2
        if 5.0 <= t < 9.75 or 20.0 <= t < 25.0: charles(t, 0.05 if k % 2 else 0.03)
        elif 10.0 <= t < 14.5 and k % 2: charles(t, 0.025)
    # ---------------- 0–4,4 s · despertar: colchón suave, notas con eco y campanitas
    pad(['C3', 'G3', 'B3', 'D4', 'E4'], 0.0, 4.8, 0.05, fc=900, a=1.2, r=1.0)
    arp = ['C5', 'G5', 'B5', 'E5', 'D5', 'G5', 'B5', 'E6']
    for i in range(18): pluck(arp[i % 8], 0.3 + i * 0.25, 0.03, fc=2200, pan=0.3 * math.sin(i), eco=0.35)
    for i, n_ in enumerate(['G5', 'C6', 'E6']): campana(n_, 1.5 + i * 0.1, 0.04)
    for i, n_ in enumerate(['E6', 'G6']): campana(n_, 2.7 + i * 0.08, 0.03)
    bajo('C2', 1.6, 1.0, 0.06); bajo('A1', 2.6, 1.0, 0.06); bajo('G1', 3.6, 0.8, 0.06)
    # ---------------- 4,4–9,6 s · gimnasio: bajo en corcheas, arpegio rápido y batería
    for t0, acorde, raiz in ((4.0, ['F3', 'A3', 'C4', 'E4'], 'F1'), (6.0, ['G3', 'B3', 'D4', 'E4'], 'G1'), (8.0, ['A3', 'C4', 'E4', 'B4'], 'A1')):
        ini = max(t0, 5.0)
        pad(acorde, ini, t0 + 2.0 - ini, 0.04, fc=1500, a=0.15, r=0.6)
        for k in range(8):
            tk = t0 + k * 0.25
            if 5.0 <= tk < 9.75: bajo(raiz if k % 2 == 0 else midi(raiz) + 12, tk, 0.2, 0.08)
        for k in range(16):
            tk = t0 + k * 0.125
            if 5.0 <= tk < 9.75: pluck(midi(acorde[k % 4]) + 12, tk, 0.018, fc=3000, dec=10, pan=0.4 * math.sin(k), eco=0)
    for tb in latidos(5.6, 8.6): campana('C7', tb, 0.012, 0.35, 0.2, dur=0.2)                 # un pitido por latido
    # ---------------- 9,6–15,8 s · tormenta: menor y oscuro, dron grave, Geiger y subida de ruido
    pad(['D3', 'F3', 'A3', 'C4'], 9.7, 2.3, 0.05, fc=700, a=0.8, r=0.5)
    pad(['A#2', 'D3', 'F3', 'A3'], 12.0, 2.0, 0.05, fc=750, a=0.3, r=0.5)
    pad(['A2', 'E3', 'A3', 'C#4'], 14.0, 1.8, 0.045, fc=650, a=0.3, r=0.4)
    n = int(6.1 * SR); poner(seno(hz('D1'), n) * envolvente(n, 1.0, 5.8, 0.3), 9.7, 0.09)
    for k, n_ in enumerate(['D5', 'F5', 'A5', 'C6'] * 4 + ['A#4', 'D5', 'F5', 'A5'] * 4):
        pluck(n_, 10.0 + k * 0.125, 0.02, fc=1800, pan=0.3 * math.sin(k), eco=0.3)
    rz = ruido(2.0, 8); poner(pb(rz, 2500) * np.linspace(0, 1, len(rz)) ** 2, 10.6, 0.18, 0.0, 0.4)
    barrido(10.6, 2.0, 0.02, 200, 1600)
    r_ = random.Random(21); t = 10.3
    while t < 13.4:
        poner(ruido(0.004, int(t * 1e4)) * 0.8, t, 0.06, 0.55)
        t += r_.expovariate(2 + 40 * math.log(dosis(t) / 23.0) / math.log(6000 / 23.0))
    campana('E6', 11.6, 0.05); campana('A#5', 11.75, 0.05)
    # ---------------- 14,5–20,5 s · emergencia: golpe, alarma, ostinato tenso y latidos; Lunna lo calma
    pad(['A2', 'E3'], 14.5, 1.3, 0.04, fc=500, a=0.4, r=0.3)
    alarma(16.0, 1.0, 0.05)
    t, i = T_COLAPSO, 0
    while t < T_RECUPERA:
        bajo('E1' if i % 2 == 0 else 'F1', t, 0.08, 0.07 if t < T_LUNNA else 0.04, fc=300)
        i += 1; t += 0.125
    for i, n_ in enumerate(['C6', 'E6', 'G6', 'C7']): campana(n_, T_LUNNA + i * 0.08, 0.05, rev=0.7)
    barrido(T_LUNNA, 0.75, 0.03, 400, 1600, 0.0, 0.5)                                            # escaneo
    pad(['A3', 'C4', 'E4'], T_LUNNA + 0.3, T_RECUPERA - T_LUNNA - 0.3, 0.04, fc=900, a=0.4, r=0.4)
    pad(['A2', 'E3', 'A3', 'C#4', 'E4'], T_RECUPERA, 0.9, 0.05, fc=1400, a=0.2, r=0.4)
    pad(['D3', 'A3', 'D4', 'F#4'], T_RECUPERA + 0.9, 1.5, 0.05, fc=1600, a=0.3, r=0.8)
    for i, n_ in enumerate(['A5', 'C#6', 'E6']): campana(n_, 18.9 + i * 0.07, 0.03)
    for i, n_ in enumerate(['D5', 'F#5', 'A5', 'D6', 'A5', 'F#5']): pluck(n_, 19.6 + i * 0.25, 0.025, pan=0.3 * math.sin(i), eco=0.35)
    # ---------------- 20,5–25 s · sala común: mayor y luminoso
    pad(['F3', 'A3', 'C4', 'E4', 'G4'], 20.0, 2.0, 0.045, fc=1700, a=0.5, r=0.4)
    pad(['C3', 'G3', 'B3', 'E4'], 22.0, 2.0, 0.045, fc=1700, a=0.2, r=0.4)
    pad(['D3', 'F3', 'A3', 'C4', 'E4'], 24.0, 1.3, 0.045, fc=1500, a=0.2, r=0.8)
    tk = 20.0
    while tk < 25.0:
        raiz = 'F1' if tk < 22 else 'E1' if tk < 24 else 'D1'
        bajo(raiz if int(tk / 0.25) % 2 == 0 else midi(raiz) + 12, tk, 0.2, 0.07)
        tk += 0.25
    mel = ['A5', 'C6', 'E6', 'D6', 'C6', 'A5', 'G5', 'A5', 'C6', 'D6', 'E6', 'G6', 'E6', 'D6', 'C6', 'A5']
    for k, n_ in enumerate(mel): pluck(n_, 21.0 + k * 0.25, 0.028, pan=0.3 * math.sin(k), eco=0.3)
    barrido(21.8, 0.25, 0.04, 300, 900)                                                          # salto
    for p_ in PARTICULAS:
        if p_['tipo'] == 'corazon': campana(random.Random(int(p_['t0'] * 100)).choice(['C7', 'D7', 'E7', 'G7', 'A7']), p_['t0'], 0.012, 0.3)
    # ---------------- 25–30 s · logo
    zumbido(25.0, 0.8, 0.1)
    pad(['C3', 'G3', 'B3', 'D4', 'E4', 'G4'], 25.0, 4.3, 0.05, fc=1300, a=1.4, r=0.8, rev=0.9)
    arp = ['C4', 'E4', 'G4', 'B4', 'D5', 'E5', 'G5', 'B5', 'D6', 'E6', 'G6', 'B6']
    paso = (T_VIAJE[1] - T_VIAJE[0]) / len(arp)
    for i, n_ in enumerate(arp): pluck(n_, T_VIAJE[0] + i * paso, 0.03, pan=-0.5 + i / len(arp), eco=0.3)
    r_ = random.Random(4); t = T_VIAJE[1]
    while t < T_ACORDE:
        campana(r_.choice(['C6', 'E6', 'G6', 'B6', 'D7']), t, 0.012, r_.uniform(-0.6, 0.6)); t += 0.12
    for i, n_ in enumerate(['C6', 'D6', 'E6', 'G6', 'C7']): campana(n_, T_LETRAS + i * 0.12, 0.03, -0.6 + i * 0.3)
    pad(['C2', 'C3', 'G3', 'C4', 'E4', 'B4', 'D5'], T_ACORDE, 1.6, 0.06, fc=2200, a=0.02, r=1.0, rev=0.9)
    campana('G6', T_ACORDE + 0.1, 0.03); campana('C7', T_ACORDE + 0.3, 0.03)
    # ---------------- interfaz, paquetes a Tierra, emociones y cambios de cámara
    for tj in TARJETAS: campana('E6', tj['t0'], 0.03, 0.3); campana('B6', tj['t0'] + 0.05, 0.02, 0.3)
    for t0, _, _ in CHIPS: campana('G5', t0, 0.015, 0.0, 0.3, dur=0.4)
    for p_ in PAQUETES:
        tA = p_['t'] + T_A; tB = tA + T_B
        if p_['sos']:
            for dt_ in (0.0, 0.12): campana('A5', p_['t'] + dt_, 0.05, 0.0, 0.3, dur=0.3)
        else:
            pass
        for i, n_ in enumerate(['E6', 'G6', 'B6']): campana(n_, tA + i * 0.06, 0.015, 0.4, 0.4, dur=0.3)   # antena
        rz = ruido(0.5, int(tA * 100)); poner(pb(rz, 2000) * np.linspace(1, 0, len(rz)), tA, 0.03, 0.6, 0.4)
        campana('E6', tB, 0.035, 0.7); campana('B6', tB + 0.07, 0.035, 0.7)                     # llega a Tierra
    for p_ in PARTICULAS:
        if p_['tipo'] == 'excl': campana('B5', p_['t0'], 0.04); campana('E6', p_['t0'] + 0.08, 0.04)
    for b_ in SB + [25.0]: zumbido(b_ - 0.4, 0.8, 0.1)                                        # la cámara atraviesa la pared
    pasos(0, 25, 0.06)
    # ---------------- mezcla final: seco + reverb, saturación suave y fundidos
    m = MEZ + 0.8 * np.stack([fft_conv(REV[:, k], respuesta_reverb()[:, k]) for k in range(2)], 1)
    pico = np.max(np.abs(m)) or 1
    m = np.tanh(m / pico * 2.0) / np.tanh(2.0) * 0.8
    fin = int(29.2 * SR)
    m[fin:] *= np.linspace(1, 0, N_AUD - fin)[:, None]
    m[:int(0.05 * SR)] *= np.linspace(0, 1, int(0.05 * SR))[:, None]
    return m


def guardar_wav(m, ruta):
    with wave.open(str(ruta), 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((np.clip(m, -1, 1) * 32767).astype('<i2').tobytes())


# ============================================================ principal
def main():
    global MUNDO, PARTICULAS, FONDO
    ap = argparse.ArgumentParser()
    ap.add_argument('--cuadros', default='')
    ap.add_argument('--carpeta', default=str(AQUI), help='dónde guardar los PNG de --cuadros')
    ap.add_argument('--salida', default=str(AQUI / 'lunna-video.mp4'))
    ap.add_argument('--solo-audio', action='store_true', help='rehace solo la música y la monta sobre el video ya renderizado')
    args = ap.parse_args()
    PARTICULAS = programar_particulas()
    import imageio_ffmpeg
    ff = imageio_ffmpeg.get_ffmpeg_exe()
    wav = AQUI / '_audio.wav'
    if args.solo_audio:
        guardar_wav(componer(), wav)
        tmp = pathlib.Path(args.salida).with_suffix('.tmp.mp4')
        subprocess.run([ff, '-y', '-loglevel', 'error', '-i', args.salida, '-i', str(wav), '-map', '0:v', '-map', '1:a', '-c:v', 'copy',
                        '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', str(tmp)], check=True)
        tmp.replace(args.salida); wav.unlink(missing_ok=True)
        print('audio montado en', args.salida)
        return
    MUNDO = construir_mundo()
    FONDO = fondo_espacio()
    print('preparando las tarjetas de la app…', flush=True)
    preparar_piezas()
    print(f'  {len(PZ)} piezas listas', flush=True)
    if args.cuadros:
        for f in [int(x) for x in args.cuadros.split(',')]:
            Image.fromarray(cuadro(f)).save(pathlib.Path(args.carpeta) / f'prueba_{f:04d}.png')
            print('cuadro', f, flush=True)
        return
    guardar_wav(componer(), wav)
    print('audio listo', flush=True)
    cmd = [ff, '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{OW}x{OH}', '-r', str(FPS), '-i', '-',
           '-i', str(wav), '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-tune', 'animation',
           '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', args.salida]
    pr = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    for f in range(NF):
        pr.stdin.write(cuadro(f).tobytes())
        if f % 60 == 0: print(f'cuadro {f}/{NF}', flush=True)
    pr.stdin.close(); pr.wait()
    wav.unlink(missing_ok=True)
    print('listo:', args.salida)


if __name__ == '__main__':
    main()
