"""
Pasarela Bluetooth de la computadora central.

Busca dispositivos que anuncien el servicio EVA, se conecta a todos, les escribe
la hora, se suscribe a sus tramas y las reenvía al backend.

    pip install -r requirements.txt
    python pasarela_ble.py                         # Bluetooth real
    python pasarela_ble.py --prueba                # sin ESP32: tramas simuladas
    python pasarela_ble.py --asignar 2561=ana --asignar 2817=ana

  ESP32 ──BLE──► esta pasarela ──HTTP──► backend (POST /api/tramas/binaria)
"""
from __future__ import annotations

import argparse
import asyncio
import base64
import json
import math
import random
import struct
import time
import urllib.error
import urllib.request
from collections import deque

from trama_eva import CABECERA, codificar, leer_cabecera

UUID_SERVICIO = "a3c87500-8ed3-4bdf-8a39-a01bebede295"
UUID_DATOS = "a3c87501-8ed3-4bdf-8a39-a01bebede295"
UUID_ESQUEMA = "a3c87502-8ed3-4bdf-8a39-a01bebede295"
UUID_HORA = "a3c87503-8ed3-4bdf-8a39-a01bebede295"

MAX_COLA = 50_000          # tramas guardadas si el backend no responde
cola: deque[bytes] = deque(maxlen=MAX_COLA)
ultimo_seq: dict[int, int] = {}
estadisticas = {"recibidas": 0, "enviadas": 0, "huecos": 0}


def log(*a: object) -> None:
    print(time.strftime("%H:%M:%S"), *a, flush=True)


def recibir(datos: bytes) -> None:
    """Valida la cabecera, detecta tramas perdidas y encola."""
    if len(datos) < CABECERA:
        log(f"⚠ trama corta descartada ({len(datos)} B)")
        return
    c = leer_cabecera(datos)
    # Las notificaciones BLE no tienen acuse: el número de secuencia delata las perdidas.
    previo = ultimo_seq.get(c.id_disp)
    if previo is not None:
        salto = (c.seq - previo) & 0xFFFF
        if salto > 1:
            estadisticas["huecos"] += salto - 1
            log(f"⚠ dispositivo {c.id_disp}: {salto - 1} tramas perdidas (seq {previo} → {c.seq})")
    ultimo_seq[c.id_disp] = c.seq
    estadisticas["recibidas"] += 1
    cola.append(datos)


class ErrorBackend(Exception):
    """El backend respondió con error. El mensaje trae su motivo."""


def http(metodo: str, url: str, cuerpo: object | None = None) -> object:
    datos = json.dumps(cuerpo).encode() if cuerpo is not None else None
    req = urllib.request.Request(url, data=datos, method=metodo,
                                 headers={"content-type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        # Mostrar el motivo que da el backend, no sólo el código.
        try:
            motivo = json.loads(e.read()).get("error", "")
        except Exception:  # noqa: BLE001
            motivo = ""
        raise ErrorBackend(f"{metodo} {url} -> {e.code}: {motivo or e.reason}") from None


async def reenviar(backend: str) -> None:
    """Vacía la cola hacia el backend en lotes. Si falla, reintenta sin perder nada."""
    espera = 0.5
    while True:
        await asyncio.sleep(espera)
        if not cola:
            continue
        lote = [cola.popleft() for _ in range(min(len(cola), 500))]
        try:
            r = await asyncio.to_thread(http, "POST", f"{backend}/api/tramas/binaria",
                                        {"b64": [base64.b64encode(t).decode() for t in lote]})
            estadisticas["enviadas"] += len(lote)
            if r.get("rechazos"):
                log("⚠ el backend rechazó:", r["rechazos"][:3])
            espera = 0.5
        except (urllib.error.URLError, OSError, ErrorBackend) as e:
            cola.extendleft(reversed(lote))          # vuelven al frente, en orden
            espera = min(espera * 2, 10)
            log(f"backend no disponible ({e}); {len(cola)} tramas en espera, reintento en {espera:.0f} s")


async def conectar(dispositivo, conectados: set[str]) -> None:
    from bleak import BleakClient

    nombre = dispositivo.name or dispositivo.address
    try:
        async with BleakClient(dispositivo) as cliente:
            log(f"✓ conectado a {nombre}")
            # 1. Hora: el ESP32 no tiene reloj; sin esto no puede sellar sus tramas.
            await cliente.write_gatt_char(UUID_HORA, struct.pack("<I", int(time.time())), response=True)
            # 2. Qué manda: el dispositivo se autodescribe.
            esquema = await cliente.read_gatt_char(UUID_ESQUEMA)
            log(f"  esquema de {nombre}: {bytes(esquema).decode(errors='replace')}")
            # 3. Tramas.
            await cliente.start_notify(UUID_DATOS, lambda _c, d: recibir(bytes(d)))
            while cliente.is_connected:
                await asyncio.sleep(1)
    except Exception as e:  # noqa: BLE001 - cualquier fallo de radio: se reintenta
        log(f"✗ {nombre}: {e}")
    finally:
        conectados.discard(dispositivo.address)
        log(f"desconectado de {nombre}; se reintentará")


async def buscar() -> None:
    from bleak import BleakScanner

    conectados: set[str] = set()
    log("buscando dispositivos EVA…")
    while True:
        encontrados = await BleakScanner.discover(timeout=5, service_uuids=[UUID_SERVICIO])
        for d in encontrados:
            if d.address not in conectados:
                conectados.add(d.address)
                asyncio.create_task(conectar(d, conectados))
        await asyncio.sleep(3)


async def prueba() -> None:
    """Sin hardware: genera las mismas tramas que el firmware del ESP32."""
    A = [("u8", 1), ("u8", 1), ("i16", 0.01)]
    B = [("u8", 1), ("u8", 1), ("u8", 1)]
    seq = {2561: 0, 2817: 0}
    log("modo prueba: simulando un EVA HUB (dispositivos 2561 y 2817)")
    while True:
        t = int(time.time())
        recibir(codificar(2561, 3, seq[2561], t, A,
                          [62 + 3 * math.sin(t / 60) + random.gauss(0, 1), 98 + random.gauss(0, 0.3), 36.6]))
        recibir(codificar(2817, 4, seq[2817], t, B,
                          [14 + random.gauss(0, 0.5), 115 + random.gauss(0, 2), 75 + random.gauss(0, 1.5)]))
        seq[2561] += 1
        seq[2817] += 1
        await asyncio.sleep(1)


async def informar() -> None:
    while True:
        await asyncio.sleep(15)
        e = estadisticas
        log(f"recibidas {e['recibidas']} · enviadas {e['enviadas']} · perdidas {e['huecos']} · en cola {len(cola)}")


async def principal() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--backend", default="http://localhost:8787")
    ap.add_argument("--prueba", action="store_true", help="sin hardware: tramas simuladas")
    ap.add_argument("--asignar", action="append", default=[], metavar="ID=TRIPULANTE",
                    help="asigna un dispositivo a un tripulante al arrancar (p. ej. 2561=ana)")
    a = ap.parse_args()

    try:
        http("GET", f"{a.backend}/api/salud")
    except (urllib.error.URLError, OSError) as e:
        raise SystemExit(f"No responde el backend en {a.backend} ({e}). ¿Está corriendo `npm start`?")
    for par in a.asignar:
        disp, trip = par.split("=")
        try:
            http("POST", f"{a.backend}/api/asignaciones", {"dispositivo": int(disp), "tripulante": trip})
        except ErrorBackend as e:
            raise SystemExit(f"No se pudo asignar {disp} a {trip}: {e}")
        log(f"dispositivo {disp} asignado a {trip}")

    tareas = [reenviar(a.backend), informar(), prueba() if a.prueba else buscar()]
    await asyncio.gather(*tareas)


if __name__ == "__main__":
    try:
        asyncio.run(principal())
    except KeyboardInterrupt:
        print("\npasarela detenida")
