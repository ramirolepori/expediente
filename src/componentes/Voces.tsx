"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { VistaPartida } from "@/motor/vista";
import { modeloListo, precargar, sintetizar } from "@/cliente/piper";
import { suenaAca, textoHablado, vozPiper, type VozPersonaje } from "@/cliente/voces";

/** Qué personaje está sonando ahora en este dispositivo, para que su dibujo mueva la boca. */
let sonando: string | null = null;
const oyentes = new Set<() => void>();
function marcarSonando(personajeId: string | null) {
  sonando = personajeId;
  oyentes.forEach((o) => o());
}
export function usePersonajeSonando() {
  return useSyncExternalStore(
    (o) => {
      oyentes.add(o);
      return () => oyentes.delete(o);
    },
    () => sonando,
    () => null,
  );
}

const VOZ_POR_DEFECTO: VozPersonaje = { genero: "masculino", edad: "adulto", velocidad: 1 };

/** Con la Web Speech API del navegador: mientras baja el modelo de Piper o si Piper falla. */
function decirConNavegador(texto: string, voz: VozPersonaje) {
  return new Promise<void>((resolve) => {
    if (typeof speechSynthesis === "undefined") return resolve();
    const u = new SpeechSynthesisUtterance(texto);
    u.lang = "es-AR";
    u.rate = voz.velocidad;
    u.onend = u.onerror = () => resolve();
    speechSynthesis.speak(u);
  });
}

async function reproducir(audio: Blob) {
  const url = URL.createObjectURL(audio);
  try {
    const a = new Audio(url);
    await new Promise<void>((resolve, reject) => {
      a.onended = () => resolve();
      a.onerror = () => reject(new Error("No se pudo reproducir"));
      a.play().catch(reject);
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function decir(texto: string, voz: VozPersonaje) {
  const piper = vozPiper(voz);
  if (!modeloListo(piper.modelo)) {
    // la primera vez que habla alguien con un modelo nuevo: se baja en segundo plano
    precargar([piper.modelo], () => {}).catch(() => {});
    return decirConNavegador(texto, voz);
  }
  try {
    await reproducir(await sintetizar(texto, piper));
  } catch (e) {
    console.warn("Voces: Piper falló, uso la voz del navegador", e);
    await decirConNavegador(texto, voz);
  }
}

/**
 * Pone en voz alta las respuestas de los personajes en el dispositivo que corresponde (ADR 0009).
 * Los navegadores no reproducen audio sin un toque previo, por eso hay que activarlas a mano.
 */
export function Voces({ vista, grande }: { vista: VistaPartida; grande?: boolean }) {
  const [estado, setEstado] = useState<"apagadas" | "bajando" | "activas">("apagadas");
  const [avance, setAvance] = useState(0);
  const escuchadas = useRef(new Set<string>());
  const cola = useRef(Promise.resolve());
  const yo = vista.yo;

  useEffect(() => {
    if (estado === "apagadas" || !yo) return;
    for (const [personajeId, mensajes] of Object.entries(vista.interrogatorios)) {
      mensajes.forEach((m, i) => {
        if (m.de !== "personaje" || escuchadas.current.has(m.id)) return;
        escuchadas.current.add(m.id);
        const autor = mensajes.slice(0, i).findLast((x) => x.de === "jugador")?.autor;
        if (!suenaAca(vista.config.audioEn, yo, vista.conexiones, autor)) return;
        const texto = textoHablado(m.texto);
        const voz = vista.personajes.find((p) => p.id === personajeId)?.voz ?? VOZ_POR_DEFECTO;
        if (!texto) return;
        cola.current = cola.current
          .then(() => (marcarSonando(personajeId), decir(texto, voz)))
          .catch(() => {})
          .finally(() => marcarSonando(null));
      });
    }
  }, [estado, vista.interrogatorios, vista.config.audioEn, vista.conexiones, vista.personajes, yo]);

  if (!yo || vista.fase !== "jugando" || !suenaAca(vista.config.audioEn, yo, vista.conexiones)) return null;

  function activar() {
    // lo que ya se dijo antes de activar no se lee
    for (const m of Object.values(vista.interrogatorios).flat()) escuchadas.current.add(m.id);
    setEstado("bajando");
    const rutas = [...new Set(vista.personajes.flatMap((p) => (p.voz ? [vozPiper(p.voz).modelo] : [])))];
    precargar(rutas, setAvance)
      .catch((e) => console.warn("Voces: no se pudieron bajar los modelos, uso la voz del navegador", e))
      .finally(() => setEstado((s) => (s === "bajando" ? "activas" : s)));
  }

  function apagar() {
    setEstado("apagadas");
    if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
  }

  const texto = estado === "apagadas" ? "🔇 Activar voces" : estado === "bajando" ? `🔊 Bajando voces ${Math.round(avance * 100)}%` : "🔊 Voces";
  return (
    <button
      onClick={estado === "apagadas" ? activar : apagar}
      aria-pressed={estado !== "apagadas"}
      title={estado === "apagadas" ? "Los personajes responden en voz alta en este dispositivo" : "Apagar las voces"}
      className={`shrink-0 rounded-lg border border-borde ${grande ? "px-4 py-2 text-xl" : "px-2.5 py-1 text-xs"} ${estado === "apagadas" ? "" : "text-acento"}`}
    >
      {texto}
    </button>
  );
}
