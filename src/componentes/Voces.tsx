"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { VistaPartida } from "@/motor/vista";
import { modeloListo, precargar, sintetizar } from "@/cliente/piper";
import { SILENCIO, suenaAca, textoHablado } from "@/cliente/voces";
import { descargarVoz, enviarVoz } from "@/cliente/vocesCompartidas";
import { BASES, pantallaDeVoces, type VozPiper } from "@/motor/voz";

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

const VOZ_POR_DEFECTO: VozPiper = { modelo: BASES.masculino[0].modelo, lengthScale: 1, altura: 1, expresividad: 1 };

/** Con la Web Speech API del navegador: mientras baja el modelo de Piper o si Piper falla. */
function decirConNavegador(texto: string, voz: VozPiper, signal: AbortSignal) {
  return new Promise<void>((resolve) => {
    if (signal.aborted || typeof speechSynthesis === "undefined") return resolve();
    const u = new SpeechSynthesisUtterance(texto);
    u.lang = "es-AR";
    u.rate = 1 / voz.lengthScale;
    u.pitch = voz.altura;
    const terminar = () => {
      signal.removeEventListener("abort", cancelar);
      resolve();
    };
    const cancelar = () => {
      speechSynthesis.cancel();
      terminar();
    };
    signal.addEventListener("abort", cancelar, { once: true });
    u.onend = u.onerror = terminar;
    speechSynthesis.speak(u);
  });
}

async function reproducir(a: HTMLAudioElement, fuente: Blob | string, signal: AbortSignal) {
  if (signal.aborted) return;
  const url = typeof fuente === "string" ? fuente : URL.createObjectURL(fuente);
  try {
    await new Promise<void>((resolve, reject) => {
      let cerrado = false;
      const cerrar = (error?: Error) => {
        if (cerrado) return;
        cerrado = true;
        signal.removeEventListener("abort", cancelar);
        a.onended = a.onerror = null;
        if (error) reject(error);
        else resolve();
      };
      const cancelar = () => {
        a.pause();
        cerrar();
      };
      signal.addEventListener("abort", cancelar, { once: true });
      a.onended = () => cerrar();
      a.onerror = () => cerrar(new Error("No se pudo reproducir"));
      a.src = url;
      a.play()?.catch(cerrar);
    });
  } finally {
    if (typeof fuente !== "string") URL.revokeObjectURL(url);
  }
}

async function decirLocal(texto: string, voz: VozPiper, audio: HTMLAudioElement, signal: AbortSignal) {
  if (!modeloListo(voz.modelo)) {
    // la primera vez que habla alguien con un modelo nuevo: se baja en segundo plano
    precargar([voz.modelo], () => {}).catch(() => {});
    return decirConNavegador(texto, voz, signal);
  }
  try {
    await reproducir(audio, await sintetizar(texto, voz), signal);
  } catch (e) {
    console.warn("Voces: Piper falló, uso la voz del navegador", e);
    await decirConNavegador(texto, voz, signal);
  }
}

function respuestas(vista: VistaPartida) {
  return Object.entries(vista.interrogatorios).flatMap(([personajeId, mensajes]) =>
    mensajes.flatMap((m, i) => m.de === "personaje" ? [{
      m, personajeId,
      autor: mensajes.slice(0, i).findLast((x) => x.de === "jugador")?.autor,
      voz: vista.personajes.find((p) => p.id === personajeId)?.voz ?? VOZ_POR_DEFECTO,
    }] : []),
  ).sort((a, b) => a.m.hora - b.m.hora);
}

const modelos = (vista: VistaPartida) => [...new Set(vista.personajes.flatMap((p) => p.voz ? [p.voz.modelo] : []))];

/** Con tele, el anfitrión genera pero no reproduce. No depende del botón de la tele. */
export function GeneradorVoces({ vista, token }: { vista: VistaPartida; token: string }) {
  const [vistas] = useState(() => new Set(respuestas(vista).map(({ m }) => m.id)));
  const cola = useRef(Promise.resolve());
  const hayTele = !!pantallaDeVoces(vista.conexiones);
  const rutas = modelos(vista).join(",");

  useEffect(() => {
    if (hayTele && rutas) precargar(rutas.split(","), () => {}).catch(() => {});
  }, [hayTele, rutas]);

  useEffect(() => {
    for (const { m, voz } of respuestas(vista)) {
      if (vistas.has(m.id)) continue;
      vistas.add(m.id);
      if (vista.fase !== "jugando" || !hayTele || m.audioCompartido) continue;
      const texto = textoHablado(m.texto);
      if (!texto) continue;
      cola.current = cola.current
        .then(async () => enviarVoz(vista.codigo, m.id, token, await sintetizar(texto, voz)))
        .catch((e) => console.warn("Voces: no se pudo preparar el audio de la tele", e));
    }
  }, [vista, vistas, hayTele, token]);

  return null;
}

export function Voces({ vista, grande, token }: { vista: VistaPartida; grande?: boolean; token?: string }) {
  if (!vista.yo || vista.fase !== "jugando" || !suenaAca(vista.config.audioEn, vista.yo, vista.conexiones)) return null;
  return <ControlVoces vista={vista} grande={grande} remoto={vista.config.audioEn === "compartida" ? token : undefined} />;
}

function ControlVoces({ vista, grande, remoto }: { vista: VistaPartida; grande?: boolean; remoto?: string }) {
  const [activa, setActiva] = useState<AbortController | null>(null);
  const [avance, setAvance] = useState<number | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const escuchadas = useRef(new Set<string>());
  const cola = useRef(Promise.resolve());
  const listas = useRef(new Set<string>());

  useEffect(() => () => activa?.abort(), [activa]);

  useEffect(() => {
    const a = audio.current;
    if (!activa || !vista.yo || !a) return;
    const { signal } = activa;
    const nuevas = respuestas(vista);
    if (remoto) listas.current = new Set(nuevas.filter(({ m }) => m.audioCompartido).map(({ m }) => m.id));
    for (const { m, personajeId, autor, voz } of nuevas) {
      if (escuchadas.current.has(m.id)) continue;
      escuchadas.current.add(m.id);
      if (!suenaAca(vista.config.audioEn, vista.yo, vista.conexiones, autor)) continue;
      const texto = textoHablado(m.texto);
      if (!texto) continue;
      const hasta = Date.now() + 25_000;
      cola.current = cola.current.then(async () => {
        try {
          // Espera una actualización de la sala, sin pedir el archivo hasta que exista.
          while (remoto && !listas.current.has(m.id) && Date.now() < hasta && !signal.aborted) {
            await new Promise((r) => setTimeout(r, 250));
          }
          if (signal.aborted) return;
          marcarSonando(personajeId);
          if (!remoto) return await decirLocal(texto, voz, a, signal);
          if (listas.current.has(m.id)) {
            try {
              return await reproducir(a, await descargarVoz(vista.codigo, m.id, remoto, signal), signal);
            } catch {}
          }
          await decirConNavegador(texto, voz, signal);
        } finally {
          marcarSonando(null);
        }
      }).catch(() => {});
    }
  }, [activa, vista, remoto]);

  function activar() {
    // lo que ya se dijo antes de activar no se lee
    for (const m of Object.values(vista.interrogatorios).flat()) escuchadas.current.add(m.id);
    const sesion = new AbortController();
    setActiva(sesion);
    const a = (audio.current ??= new Audio());
    a.src = SILENCIO;
    a.play()?.catch(() => {});
    if (remoto) return;
    setAvance(0);
    precargar(modelos(vista), (n) => { if (!sesion.signal.aborted) setAvance(n); })
      .catch((e) => console.warn("Voces: no se pudieron bajar los modelos, uso la voz del navegador", e))
      .finally(() => { if (!sesion.signal.aborted) setAvance(null); });
  }

  function apagar() {
    activa?.abort();
    setActiva(null);
    setAvance(null);
  }

  const texto = !activa ? "🔇 Activar voces" : avance !== null ? `🔊 Bajando voces ${Math.round(avance * 100)}%` : "🔊 Voces";
  return (
    <button
      onClick={activa ? apagar : activar}
      aria-pressed={!!activa}
      title={activa ? "Apagar las voces" : "Los personajes responden en voz alta en este dispositivo"}
      className={`shrink-0 rounded-lg border border-borde ${grande ? "px-4 py-2 text-xl" : "px-2.5 py-1 text-xs"} ${activa ? "text-acento" : ""}`}
    >
      {texto}
    </button>
  );
}
