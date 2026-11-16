"use client";

import { bus, cadena, contexto, filtro, fuenteRuido, ganancia, nota, rafaga, salida } from "./audio";

/**
 * Paisajes sonoros por ambientación (ADR 0015), generados con Web Audio. Cada uno trae su ambiente en
 * loop, sus efectos para los momentos del juego y el efecto que se le aplica al narrador.
 * Por ahora está noir, el piloto; las demás ambientaciones se suman con la misma forma.
 */
export type Momento = "sobre" | "revelacion" | "candado" | "error" | "final";

export interface Paisaje {
  /** arranca el ambiente y devuelve cómo apagarlo */
  ambiente(): () => void;
  efecto(m: Momento): void;
  /** arma la cadena del narrador: recibe la voz y devuelve el nodo final (ya conectado a la salida) */
  narrador?(voz: AudioNode): () => void;
  /** URL de música opcional; si el archivo no está, no suena nada */
  musica?: string;
}

/** Repite `fn` a intervalos al azar entre `min` y `max` segundos, hasta que se apague. */
function cadaTanto(fn: () => void, min: number, max: number) {
  let t: ReturnType<typeof setTimeout>;
  const siguiente = () => {
    t = setTimeout(() => {
      fn();
      siguiente();
    }, (min + Math.random() * (max - min)) * 1000);
  };
  siguiente();
  return () => clearTimeout(t);
}

/** Noir: lluvia contra el vidrio, el zumbido lejano de la ciudad y algún trueno. */
const noir: Paisaje = {
  // "Moil", de Ruskerdax (CC0): ver public/audio/CREDITOS.md
  musica: "/audio/noir/musica.mp3",
  ambiente() {
    const c = contexto();
    const destino = bus("ambiente");
    const paradas: (() => void)[] = [];

    // lluvia: ruido rosa entre 500 Hz y 5 kHz, con un vaivén lento de intensidad
    const lluvia = fuenteRuido("rosa");
    const vaiven = ganancia(0.55);
    const lfo = c.createOscillator();
    lfo.frequency.value = 0.07;
    const prof = ganancia(0.18);
    lfo.connect(prof).connect(vaiven.gain);
    cadena(lluvia, filtro("highpass", 500), filtro("lowpass", 5000), vaiven, destino);
    lluvia.start();
    lfo.start();
    paradas.push(() => (lluvia.stop(), lfo.stop()));

    // gotas sueltas que pegan en el vidrio
    paradas.push(cadaTanto(() => rafaga(destino, { duracion: 0.04, frecuencia: 2500 + Math.random() * 3000, q: 4, volumen: 0.08 + Math.random() * 0.1 }), 0.08, 0.5));

    // la ciudad: un zumbido grave y apagado
    const ciudad = fuenteRuido("marron");
    cadena(ciudad, filtro("lowpass", 180), ganancia(0.35), destino);
    ciudad.start();
    paradas.push(() => ciudad.stop());

    // un trueno lejano cada tanto
    paradas.push(cadaTanto(() => rafaga(destino, { duracion: 4 + Math.random() * 3, frecuencia: 90, tipoFiltro: "lowpass", ruidoDe: "marron", volumen: 0.5, ataque: 0.6 }), 40, 90));

    return () => paradas.forEach((p) => p());
  },
  efecto(m) {
    const d = bus("efectos");
    if (m === "sobre") {
      // papel que se desliza fuera del sobre
      rafaga(d, { duracion: 0.35, frecuencia: 3200, q: 0.8, volumen: 0.25, ataque: 0.08 });
      rafaga(d, { inicio: 0.25, duracion: 0.25, frecuencia: 2400, q: 0.8, volumen: 0.18, ataque: 0.05 });
    } else if (m === "revelacion") {
      // un acorde menor de piano apagado, como un golpe de escena
      [220, 261.6, 329.6].forEach((f, i) => nota(d, f, { inicio: i * 0.03, duracion: 2.6, tipo: "triangle", volumen: 0.12 }));
      nota(d, 110, { duracion: 3, volumen: 0.1 });
    } else if (m === "candado") {
      rafaga(d, { duracion: 0.05, frecuencia: 4000, q: 6, volumen: 0.4 });
      nota(d, 880, { inicio: 0.06, duracion: 0.6, volumen: 0.08 });
      nota(d, 1318.5, { inicio: 0.14, duracion: 0.8, volumen: 0.06 });
    } else if (m === "error") {
      rafaga(d, { duracion: 0.2, frecuencia: 160, tipoFiltro: "lowpass", ruidoDe: "marron", volumen: 0.5 });
    } else {
      // el final: un acorde largo que se queda en el aire
      [146.8, 174.6, 220, 261.6].forEach((f, i) => nota(d, f, { inicio: i * 0.25, duracion: 6, tipo: "triangle", volumen: 0.1, ataque: 0.4 }));
    }
  },
  narrador(voz) {
    // radio vieja: banda angosta, un poco de saturación y el crujido de fondo
    const c = contexto();
    const saturar = c.createWaveShaper();
    const curva = new Float32Array(256).map((_, i) => Math.tanh(((i / 255) * 2 - 1) * 1.8));
    saturar.curve = curva;
    cadena(voz, filtro("highpass", 320), filtro("lowpass", 3200), filtro("peaking", 1400, 1.2), saturar, ganancia(0.9), salida());
    const crujido = fuenteRuido("blanco");
    cadena(crujido, filtro("bandpass", 2000, 0.6), ganancia(0.012), salida());
    crujido.start();
    const chasquidos = cadaTanto(() => rafaga(salida(), { duracion: 0.012, frecuencia: 3000, q: 2, volumen: 0.05 + Math.random() * 0.08 }), 0.15, 1.2);
    return () => {
      crujido.stop();
      chasquidos();
    };
  },
};

const PAISAJES: Partial<Record<string, Paisaje>> = { noir };

export const paisajeDe = (ambientacion: string | undefined) => (ambientacion ? PAISAJES[ambientacion] : undefined);
