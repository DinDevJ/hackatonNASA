/**
 * Página "Reloj en vivo": frecuencia cardiaca del HUAWEI WATCH 5 por Web Bluetooth.
 *  - Conexión y decodificación: HeartRateMonitor y parseHeartRateMeasurement de Julio (sin modificar).
 *  - Conversión al contrato del equipo: mi adaptador (02:V53 intensidad de sesión).
 *  - Modo demo: paquetes sintéticos con el mismo formato que el reloj (flags 0x06/0x04 + FC 8 bits),
 *    decodificados por el mismo parser. Sus lecturas salen marcadas como simuladas.
 */
import {
  HeartRateMonitor,
  isWebBluetoothAvailable,
  parseHeartRateMeasurement,
  type HeartRateSample,
} from "../../../../Julio/codigo/heart-rate.js";
import type { AstronautVariableReading, SalidaTipo } from "../contrato.js";
import { filtrar, intensidadSesion, type MuestraFC } from "../reloj/huawei-watch5.js";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const VENTANA_S = 120;

type Origen = "reloj" | "demo";
let origen: Origen | null = null;
let monitor: HeartRateMonitor | null = null;
let demoTimer: number | null = null;
let rrVisto = false;
const historial: HeartRateSample[] = [];
let sesion: HeartRateSample[] | null = null;
let sesionInicio: Date | null = null;
let ultimaSalida: SalidaTipo | null = null;

// ---------- Estado en pantalla ----------
function estado(texto: string, tono: "ok" | "aviso" | "error" | "neutro" = "neutro") {
  const e = $("estado");
  e.textContent = texto;
  e.dataset["tono"] = tono;
}

function botones() {
  const conectado = origen !== null;
  $<HTMLButtonElement>("conectar").disabled = conectado || !isWebBluetoothAvailable();
  $<HTMLButtonElement>("demo").disabled = conectado;
  $<HTMLButtonElement>("desconectar").disabled = !conectado;
  $<HTMLButtonElement>("iniciar").disabled = !conectado || sesion !== null;
  $<HTMLButtonElement>("terminar").disabled = sesion === null;
}

function alRecibir(m: HeartRateSample) {
  historial.push(m);
  const corte = Date.now() - VENTANA_S * 1000;
  while (historial.length && historial[0]!.receivedAt.getTime() < corte) historial.shift();
  if (sesion) sesion.push(m);
  if (m.rrIntervalsMs.length) rrVisto = true;

  $("bpm").textContent = String(m.bpm);
  const piel = $("piel");
  piel.textContent = m.sensorContact === null ? "El reloj no informa contacto" : m.sensorContact ? "Sensor en contacto con la piel" : "Correa floja: lectura descartada";
  piel.dataset["tono"] = m.sensorContact === false ? "error" : "ok";
  $("rr").textContent = rrVisto ? "Llegan intervalos RR: se podría calcular HRV" : "Sin intervalos RR → sin HRV en vivo";
  $("crudo").textContent = [...m.raw].map((b) => b.toString(16).padStart(2, "0")).join(" ");

  const { validas, sinContacto, artefactos } = filtrar(historial);
  const v = validas.map((x) => x.bpm);
  $("n").textContent = String(historial.length);
  $("validas").textContent = String(validas.length);
  $("descartadas").textContent = String(sinContacto + artefactos);
  $("rango").textContent = v.length ? `${Math.min(...v)}–${Math.max(...v)}` : "—";
  if (sesion && sesionInicio) {
    $("sesion-info").textContent = `Grabando: ${sesion.length} muestras · ${Math.round((Date.now() - sesionInicio.getTime()) / 1000)} s`;
  }
  dibujar();
}

// ---------- Gráfica de los últimos 2 minutos ----------
function dibujar() {
  const c = $<HTMLCanvasElement>("grafica");
  const dpr = window.devicePixelRatio || 1;
  const w = c.clientWidth;
  const h = c.clientHeight;
  if (c.width !== w * dpr) { c.width = w * dpr; c.height = h * dpr; }
  const g = c.getContext("2d")!;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, w, h);
  const css = getComputedStyle(document.documentElement);
  const color = css.getPropertyValue("--acento").trim();
  const tenue = css.getPropertyValue("--linea").trim();
  const malo = css.getPropertyValue("--error").trim();
  const ahora = Date.now();
  const x = (t: number) => w - ((ahora - t) / (VENTANA_S * 1000)) * w;
  const ys = historial.map((m) => m.bpm);
  const lo = Math.min(50, ...ys) - 5;
  const hi = Math.max(120, ...ys) + 5;
  const y = (b: number) => h - ((b - lo) / (hi - lo)) * h;
  g.strokeStyle = tenue;
  g.lineWidth = 1;
  g.font = "11px system-ui";
  g.fillStyle = tenue;
  for (const b of [60, 100, 140, 180]) {
    if (b < lo || b > hi) continue;
    g.beginPath(); g.moveTo(0, y(b)); g.lineTo(w, y(b)); g.stroke();
    g.fillText(String(b), 4, y(b) - 3);
  }
  g.strokeStyle = color;
  g.lineWidth = 2;
  g.beginPath();
  let empezado = false;
  for (const m of historial) {
    if (m.sensorContact === false) { empezado = false; continue; }
    const px = x(m.receivedAt.getTime());
    const py = y(m.bpm);
    if (!empezado) { g.moveTo(px, py); empezado = true; } else g.lineTo(px, py);
  }
  g.stroke();
  g.fillStyle = malo;
  for (const m of historial) if (m.sensorContact === false) g.fillRect(x(m.receivedAt.getTime()) - 1.5, h - 8, 3, 6);
}

// ---------- Conexión real ----------
async function conectar() {
  try {
    monitor = new HeartRateMonitor();
    monitor.onSample(alRecibir);
    monitor.onDisconnect(() => { estado("El reloj se desconectó", "aviso"); detener(); });
    estado("Elige el reloj en la ventana del navegador…");
    await monitor.connect();
    origen = "reloj";
    estado(`Conectado: ${monitor.deviceName ?? "reloj"}`, "ok");
  } catch (e) {
    monitor = null;
    estado(`No se pudo conectar: ${(e as Error).message}`, "error");
  }
  botones();
}

// ---------- Modo demo ----------
function iniciarDemo() {
  origen = "demo";
  let bpm = 72;
  let t = 0;
  demoTimer = window.setInterval(() => {
    t++;
    const objetivo = t % 90 < 45 ? 72 : 135; // alterna reposo y esfuerzo
    bpm = Math.max(45, Math.min(190, Math.round(bpm + (objetivo - bpm) * 0.08 + (Math.random() - 0.5) * 4)));
    const flags = t % 37 === 0 ? 0x04 : 0x06; // de vez en cuando, correa floja
    alRecibir(parseHeartRateMeasurement(new DataView(new Uint8Array([flags, bpm]).buffer)));
  }, 1000);
  estado("MODO DEMO: paquetes sintéticos con el formato del WATCH 5", "aviso");
  botones();
}

function detener() {
  if (demoTimer !== null) window.clearInterval(demoTimer);
  demoTimer = null;
  monitor?.disconnect();
  monitor = null;
  origen = null;
  if (sesion) terminarSesion();
  botones();
}

// ---------- Sesión → contrato del equipo ----------
function iniciarSesion() {
  sesion = [];
  sesionInicio = new Date();
  $("resultado").hidden = true;
  $("sesion-info").textContent = "Grabando…";
  botones();
}

function terminarSesion() {
  const muestras = sesion ?? [];
  const desde = sesionInicio ?? new Date();
  sesion = null;
  sesionInicio = null;
  const edad = Number($<HTMLInputElement>("edad").value) || 30;
  const etiqueta = $<HTMLInputElement>("etiqueta").value.trim() || "sesión";
  const demo = origen === "demo" || muestras.length === 0;
  let lecturas: AstronautVariableReading[] = intensidadSesion(muestras as MuestraFC[], edad, etiqueta);
  if (demo) {
    lecturas = lecturas.map((l) => ({
      ...l,
      origen_dato: "simulado_controlado",
      fuente_referencia: "Modo demo de la página del reloj (paquetes sintéticos con el formato del HUAWEI WATCH 5)",
      observaciones: `SIMULADO. ${l.observaciones ?? ""}`,
    }));
  }
  const fecha = desde.toISOString().slice(0, 19).replace(/[:T]/g, "-");
  ultimaSalida = {
    generado: new Date().toISOString(),
    tipo: "A",
    sujetos: [{ sujeto: `${demo ? "DEMO" : "WATCH5"}-${fecha}`, lecturas }],
  };
  const cuerpo = $("tabla-cuerpo");
  cuerpo.replaceChildren(
    ...lecturas.map((l) => {
      const tr = document.createElement("tr");
      for (const v of [l.id, l.nombre.split(" — ")[1] ?? l.nombre, `${l.valor ?? "—"} ${l.unidad}`]) {
        const td = document.createElement("td");
        td.textContent = v;
        tr.append(td);
      }
      return tr;
    }),
  );
  $("sesion-info").textContent = lecturas.length
    ? `Sesión cerrada: ${muestras.length} muestras${demo ? " (DEMO)" : ""}`
    : `Sesión demasiado corta (${muestras.length} muestras): hace falta al menos 1 minuto de FC válida`;
  $("resultado").hidden = lecturas.length === 0;
  descargarCrudo.muestras = muestras;
  botones();
}

function descargar(nombre: string, contenido: string, tipo: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([contenido], { type: tipo }));
  a.download = nombre;
  a.click();
  URL.revokeObjectURL(a.href);
}

const descargarCrudo = { muestras: [] as HeartRateSample[] };

// ---------- Arranque ----------
window.addEventListener("DOMContentLoaded", () => {
  if (!isWebBluetoothAvailable()) {
    estado("Este navegador no tiene Web Bluetooth. Usa Chrome o Edge (no Safari/iOS). El modo demo sí funciona.", "error");
  } else {
    estado("Listo para conectar");
  }
  $("conectar").addEventListener("click", conectar);
  $("demo").addEventListener("click", iniciarDemo);
  $("desconectar").addEventListener("click", () => { estado("Desconectado"); detener(); });
  $("iniciar").addEventListener("click", iniciarSesion);
  $("terminar").addEventListener("click", terminarSesion);
  $("bajar-json").addEventListener("click", () => {
    if (ultimaSalida) descargar(`${ultimaSalida.sujetos[0]!.sujeto}.json`, JSON.stringify(ultimaSalida, null, 2), "application/json");
  });
  $("bajar-csv").addEventListener("click", () => {
    const filas = descargarCrudo.muestras.map((m) => `${m.receivedAt.toISOString()},${m.bpm},${m.sensorContact ?? ""},${[...m.raw].map((b) => b.toString(16).padStart(2, "0")).join(" ")}`);
    descargar("muestras-reloj.csv", ["timestamp,bpm,contacto_piel,bytes", ...filas].join("\n"), "text/csv");
  });
  window.addEventListener("resize", dibujar);
  botones();
  dibujar();
});
