"use client";

/**
 * Sonido de la ambientación (ADR 0015): ambiente en loop, música y efectos, cada uno en su bus,
 * con un volumen general. El ambiente y los efectos se generan acá con Web Audio (sin archivos ni
 * licencias); la música, si la hay, es un archivo. Cuando habla alguien, todo baja un poco.
 */
type Bus = "ambiente" | "musica" | "efectos";

let ctx: AudioContext | null = null;
let maestro: GainNode | null = null;
let ducking: GainNode | null = null;
const buses = new Map<Bus, GainNode>();
const VOLUMEN_BUS: Record<Bus, number> = { ambiente: 0.55, musica: 0.35, efectos: 0.7 };

export function contexto(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext();
    maestro = ctx.createGain();
    maestro.gain.value = 0.8;
    maestro.connect(ctx.destination);
    ducking = ctx.createGain();
    ducking.connect(maestro);
    for (const b of ["ambiente", "musica"] as const) {
      const g = ctx.createGain();
      g.gain.value = VOLUMEN_BUS[b];
      g.connect(ducking);
      buses.set(b, g);
    }
    // los efectos no se atenúan cuando habla alguien: son cortos y marcan algo que pasó
    const ef = ctx.createGain();
    ef.gain.value = VOLUMEN_BUS.efectos;
    ef.connect(maestro);
    buses.set("efectos", ef);
  }
  return ctx;
}

export const bus = (b: Bus) => (contexto(), buses.get(b)!);
/** Salida general: la usa el narrador para sumarse al volumen de la sala. */
export const salida = () => (contexto(), maestro!);

/** Los navegadores arrancan el audio suspendido hasta un toque. */
export async function despertar() {
  const c = contexto();
  if (c.state === "suspended") await c.resume().catch(() => {});
  return c.state === "running";
}

export function volumen(v: number) {
  const c = contexto();
  maestro!.gain.setTargetAtTime(Math.max(0, Math.min(1, v)), c.currentTime, 0.05);
}

/** Baja ambiente y música mientras habla un personaje o el narrador. */
export function atenuar(si: boolean) {
  const c = contexto();
  ducking!.gain.setTargetAtTime(si ? 0.3 : 1, c.currentTime, si ? 0.15 : 0.6);
}

// ---- piezas para sintetizar ----

const buffers = new Map<string, AudioBuffer>();

/** Ruido de varios colores, en un buffer que se reusa en loop. */
export function ruido(tipo: "blanco" | "rosa" | "marron", segundos = 4): AudioBuffer {
  const c = contexto();
  const clave = `${tipo}-${segundos}`;
  if (buffers.has(clave)) return buffers.get(clave)!;
  const b = c.createBuffer(1, c.sampleRate * segundos, c.sampleRate);
  const d = b.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0, ultimo = 0;
  for (let i = 0; i < d.length; i++) {
    const w = Math.random() * 2 - 1;
    if (tipo === "blanco") d[i] = w;
    else if (tipo === "rosa") {
      b0 = 0.99765 * b0 + w * 0.099;
      b1 = 0.963 * b1 + w * 0.2965;
      b2 = 0.57 * b2 + w * 1.0526;
      d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.18;
    } else {
      ultimo = (ultimo + 0.02 * w) / 1.02;
      d[i] = ultimo * 3.5;
    }
  }
  buffers.set(clave, b);
  return b;
}

export function fuenteRuido(tipo: "blanco" | "rosa" | "marron") {
  const s = contexto().createBufferSource();
  s.buffer = ruido(tipo);
  s.loop = true;
  return s;
}

export function filtro(tipo: BiquadFilterType, frecuencia: number, q = 0.7) {
  const f = contexto().createBiquadFilter();
  f.type = tipo;
  f.frequency.value = frecuencia;
  f.Q.value = q;
  return f;
}

export function ganancia(v: number) {
  const g = contexto().createGain();
  g.gain.value = v;
  return g;
}

/** Conecta una cadena de nodos en orden y devuelve el primero y el último. */
export function cadena(...nodos: AudioNode[]) {
  for (let i = 0; i < nodos.length - 1; i++) nodos[i]!.connect(nodos[i + 1]!);
  return { entrada: nodos[0]!, salida: nodos[nodos.length - 1]! };
}

/** Una nota con envolvente: ataque, caída y cola. Para los efectos. */
export function nota(destino: AudioNode, frecuencia: number, { inicio = 0, duracion = 1.2, tipo = "sine" as OscillatorType, volumen: vol = 0.3, ataque = 0.01 } = {}) {
  const c = contexto();
  const t = c.currentTime + inicio;
  const o = c.createOscillator();
  o.type = tipo;
  o.frequency.value = frecuencia;
  const g = c.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + ataque);
  g.gain.exponentialRampToValueAtTime(0.0001, t + duracion);
  o.connect(g).connect(destino);
  o.start(t);
  o.stop(t + duracion + 0.05);
}

/** Un golpe de ruido filtrado: papel, clic, trueno. */
export function rafaga(destino: AudioNode, { inicio = 0, duracion = 0.15, frecuencia = 3000, q = 1, volumen: vol = 0.4, tipoFiltro = "bandpass" as BiquadFilterType, ruidoDe = "blanco" as "blanco" | "rosa" | "marron", ataque = 0.005 } = {}) {
  const c = contexto();
  const t = c.currentTime + inicio;
  const s = c.createBufferSource();
  s.buffer = ruido(ruidoDe);
  const f = filtro(tipoFiltro, frecuencia, q);
  const g = c.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + ataque);
  g.gain.exponentialRampToValueAtTime(0.0001, t + duracion);
  s.connect(f).connect(g).connect(destino);
  s.start(t, Math.random() * 2);
  s.stop(t + duracion + 0.05);
}
