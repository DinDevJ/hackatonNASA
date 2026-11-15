"""Actualización bayesiana de los pesos fisiológicos (implementación de referencia, Python puro, sin dependencias).

Modelo por malestar m (ver README.md, sección "Modelo matemático"):
    x_v  = puntos de desviación de la variable v contra la línea base personal (0..3, solo en la dirección fisiológica)
    η    = β0 + Σ_v β_v · x_v
    P(malestar = 1 | x) = σ(η) = 1 / (1 + e^(−η))
Prior (de la tabla de pesos fisiológicos):
    β_v ~ Normal(κ · prior_media_v, (κ · prior_de_v)²)       con κ = ln(20)/9 ≈ 0.333
    β0  ~ Normal(logit(p0), 1²)                               p0 = probabilidad basal diaria del malestar
Actualización con datos etiquetados (x, y) por aproximación de Laplace:
    β̂   = argmax  Σ [y log σ(η) + (1−y) log(1−σ(η))] − ½ (β−μ)ᵀ Σ⁻¹ (β−μ)
    Σ_post = (Xᵀ W X + Σ⁻¹)⁻¹,  W = diag(p(1−p))
El posterior Normal(β̂, Σ_post) es el prior de la siguiente actualización (aprendizaje secuencial).
Uso: python actualizacion_bayesiana.py   (corre una demostración con datos simulados)
"""
import json, math, pathlib, random

KAPPA = math.log(20) / 9  # peso 3 con desviación extrema (3 puntos) ⇒ momios × 20


def puntos(z, direccion):
    """Puntos de desviación (0–3) como en las escalas de alerta temprana, solo en la dirección fisiológica."""
    if direccion.startswith("↑") and z < 0:
        return 0
    if direccion.startswith("↓") and z > 0:
        return 0
    a = abs(z)
    return 0 if a < 1 else 1 if a < 2 else 2 if a < 3 else 3


def sigmoide(t):
    return 1 / (1 + math.exp(-t)) if t >= 0 else math.exp(t) / (1 + math.exp(t))


def invertir(m):
    """Inversa de una matriz cuadrada (Gauss-Jordan con pivoteo)."""
    n = len(m)
    a = [fila[:] + [1.0 if i == j else 0.0 for j in range(n)] for i, fila in enumerate(m)]
    for c in range(n):
        p = max(range(c, n), key=lambda r: abs(a[r][c]))
        a[c], a[p] = a[p], a[c]
        piv = a[c][c]
        a[c] = [x / piv for x in a[c]]
        for r in range(n):
            if r != c and a[r][c] != 0:
                f = a[r][c]
                a[r] = [x - f * y for x, y in zip(a[r], a[c])]
    return [fila[n:] for fila in a]


def prior_de_tabla(ruta_json, malestar_id, p0):
    """Construye el prior gaussiano (media, covarianza diagonal) de un malestar desde pesos.json."""
    d = json.loads(pathlib.Path(ruta_json).read_text(encoding="utf-8"))
    filas = [f for f in d["pesos"] if f["malestar_id"] == malestar_id]
    nombres = ["intercepto"] + [f["variable"] for f in filas]
    media = [math.log(p0 / (1 - p0))] + [KAPPA * f["prior_media"] for f in filas]
    var = [1.0] + [(KAPPA * f["prior_de"]) ** 2 for f in filas]
    cov = [[var[i] if i == j else 0.0 for j in range(len(var))] for i in range(len(var))]
    direcciones = [f["direccion"] for f in filas]
    return {"nombres": nombres, "media": media, "cov": cov, "direcciones": direcciones}


def actualizar(prior, X, y, iteraciones=50):
    """Posterior gaussiano por Laplace. X: filas de puntos (sin intercepto). Devuelve un nuevo prior."""
    mu, S_inv = prior["media"], invertir(prior["cov"])
    Xc = [[1.0] + list(f) for f in X]
    b = mu[:]
    k = len(b)
    for _ in range(iteraciones):
        p = [sigmoide(sum(bi * xi for bi, xi in zip(b, f))) for f in Xc]
        g = [sum((yi - pi) * f[j] for f, yi, pi in zip(Xc, y, p)) - sum(S_inv[j][l] * (b[l] - mu[l]) for l in range(k)) for j in range(k)]
        H = [[sum(pi * (1 - pi) * f[i] * f[j] for f, pi in zip(Xc, p)) + S_inv[i][j] for j in range(k)] for i in range(k)]
        paso = [sum(r * gi for r, gi in zip(fila, g)) for fila in invertir(H)]
        b = [bi + si for bi, si in zip(b, paso)]
        if max(abs(s) for s in paso) < 1e-8:
            break
    p = [sigmoide(sum(bi * xi for bi, xi in zip(b, f))) for f in Xc]
    H = [[sum(pi * (1 - pi) * f[i] * f[j] for f, pi in zip(Xc, p)) + S_inv[i][j] for j in range(k)] for i in range(k)]
    return {**prior, "media": b, "cov": invertir(H)}


def resumen(post):
    """Peso actualizado en la escala 0–3 y probabilidad de que el efecto sea real (β > 0)."""
    out = []
    for i, n in enumerate(post["nombres"][1:], start=1):
        m, sd = post["media"][i], math.sqrt(post["cov"][i][i])
        p_pos = 0.5 * (1 + math.erf(m / (sd * math.sqrt(2))))
        out.append((n, round(m / KAPPA, 2), round(sd / KAPPA, 2), round(p_pos, 3)))
    return out


if __name__ == "__main__":
    aqui = pathlib.Path(__file__).parent
    # Demostración con datos SIMULADOS: malestar 4 (infección). La "verdad" simulada da más peso a la temperatura
    # y a la FC, y nada a la presión arterial; el prior fisiológico debe moverse hacia ahí con los datos.
    prior = prior_de_tabla(aqui / "pesos.json", 4, p0=0.01)
    verdad = {"fc_reposo": 2.6, "spo2": 0.5, "respiracion": 1.0, "temperatura": 3.0, "presion_arterial": 0.0,
              "sueno": 1.0, "pvt_lapsos": 0.0, "co2_cabina": 0.0, "sintomas": 2.0}
    r = random.Random(7)
    X, y = [], []
    for _ in range(600):
        fila = [r.choice([0, 0, 0, 1, 1, 2, 3]) for _ in prior["nombres"][1:]]
        eta = math.log(0.01 / 0.99) + sum(KAPPA * verdad[n] * x for n, x in zip(prior["nombres"][1:], fila))
        X.append(fila)
        y.append(1 if r.random() < sigmoide(eta) else 0)
    post = actualizar(prior, X, y)
    print(f"Malestar 4 · {len(y)} observaciones simuladas, {sum(y)} positivas")
    print(f"{'variable':18} {'prior':>6} {'post':>6} {'±':>5} {'P(efecto)':>9}")
    for (n, m, sd, pp), pm in zip(resumen(post), prior["media"][1:]):
        print(f"{n:18} {pm / KAPPA:6.2f} {m:6.2f} {sd:5.2f} {pp:9.3f}")
