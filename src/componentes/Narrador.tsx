"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { contexto, despertar, salida } from "@/cliente/audio";
import { paisajeDe } from "@/cliente/paisajes";
import { precargar, sintetizar } from "@/cliente/piper";
import { oraciones, SILENCIO } from "@/cliente/voces";
import { guionDe, guionDePrueba, textoParaLeer, type Linea } from "@/motor/narracion";
import type { VistaPartida } from "@/motor/vista";
import type { VozPiper } from "@/motor/voz";

/**
 * El narrador: lee en voz alta un documento, la introducción o la resolución. Cada quien elige en el
 * momento dónde suena: en su dispositivo (para escuchar por separado) o en la tele (para todo el grupo).
 * Se genera oración por oración: la primera suena mientras se prepara la siguiente.
 */
export interface Lectura {
  titulo: string;
  /** de dónde salió (ej. "prueba:x"), para saber si este botón es el que está sonando */
  que: string;
  /** la ambientación del caso: decide el efecto de la voz (radio vieja en noir, por ejemplo) */
  ambientacion?: string;
  partes: { texto: string; voz: VozPiper }[];
}

interface Estado {
  que: string;
  titulo: string;
  fase: "preparando" | "sonando" | "pausa";
  avance: number;
  indice: number;
  total: number;
  frase: string;
  velocidad: number;
}

// ---- reproductor único del dispositivo ----

let estado: Estado | null = null;
const oyentes = new Set<() => void>();
const publicar = (e: Estado | null) => {
  estado = e;
  oyentes.forEach((o) => o());
};
const cambiar = (c: Partial<Estado>) => estado && publicar({ ...estado, ...c });

export function useLectura() {
  return useSyncExternalStore(
    (o) => {
      oyentes.add(o);
      return () => oyentes.delete(o);
    },
    () => estado,
    () => null,
  );
}

let turno = 0;
let velocidad = 1;
let audio: HTMLAudioElement | null = null;
let terminarAudio: (() => void) | null = null;

/**
 * Safari y los celulares solo dejan sonar audio que arrancó con un toque. Se reproduce un silencio
 * dentro del toque y después se reusa el mismo elemento, que ya quedó habilitado.
 */
export function desbloquearAudio() {
  audio ??= new Audio();
  audio.src = SILENCIO;
  void despertar();
  return audio.play().catch(() => {});
}

// el efecto de la ambientación: la voz pasa por Web Audio. Una vez conectado, el elemento ya no suena
// por su cuenta, así que solo se conecta con el contexto andando (si no, se oiría en silencio)
let fuente: MediaElementAudioSourceNode | null = null;
let apagarEfecto: (() => void) | null = null;
function efectoDeVoz(ambientacion: string | undefined) {
  apagarEfecto?.();
  apagarEfecto = null;
  const narrador = paisajeDe(ambientacion)?.narrador;
  if (!fuente && (!narrador || contexto().state !== "running")) return;
  audio ??= new Audio();
  fuente ??= contexto().createMediaElementSource(audio);
  fuente.disconnect();
  if (narrador) apagarEfecto = narrador(fuente);
  else fuente.connect(salida());
}

function reproducirParte(blob: Blob, mio: number): Promise<void> {
  audio ??= new Audio();
  const a = audio;
  const url = URL.createObjectURL(blob);
  return new Promise<void>((resolve, reject) => {
    const fin = () => {
      terminarAudio = null;
      URL.revokeObjectURL(url);
      resolve();
    };
    terminarAudio = fin;
    a.onended = fin;
    a.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No se pudo reproducir"));
    };
    a.src = url;
    a.playbackRate = velocidad;
    if (turno !== mio) return fin();
    a.play().catch(reject);
  });
}

function decirConNavegador(texto: string, voz: VozPiper) {
  return new Promise<void>((resolve) => {
    if (typeof speechSynthesis === "undefined") return resolve();
    const u = new SpeechSynthesisUtterance(texto);
    u.lang = "es-AR";
    u.rate = velocidad / voz.lengthScale;
    u.onend = u.onerror = () => resolve();
    speechSynthesis.speak(u);
  });
}

/** Lee una lectura de punta a punta. Si ya había otra sonando, la corta. */
export async function leer(lectura: Lectura): Promise<"ok" | "bloqueado"> {
  detener();
  const mio = ++turno;
  const partes = lectura.partes;
  efectoDeVoz(lectura.ambientacion);
  publicar({ que: lectura.que, titulo: lectura.titulo, fase: "preparando", avance: 0, indice: 0, total: partes.length, frase: "", velocidad });
  let conPiper = true;
  try {
    await precargar([...new Set(partes.map((p) => p.voz.modelo))], (f) => turno === mio && cambiar({ avance: f }));
  } catch (e) {
    console.warn("Narrador: no se pudieron bajar las voces, uso la del navegador", e);
    conPiper = false;
  }
  const generar = (i: number) => (conPiper ? sintetizar(partes[i]!.texto, partes[i]!.voz).catch(() => null) : Promise.resolve(null));
  let siguiente = partes.length ? generar(0) : null;
  try {
    for (let i = 0; i < partes.length; i++) {
      const blob = await siguiente;
      if (turno !== mio) return "ok";
      siguiente = i + 1 < partes.length ? generar(i + 1) : null;
      cambiar({ fase: estado?.fase === "pausa" ? "pausa" : "sonando", indice: i, frase: partes[i]!.texto });
      await esperarPausa(mio);
      if (turno !== mio) return "ok";
      if (blob) await reproducirParte(blob, mio);
      else await decirConNavegador(partes[i]!.texto, partes[i]!.voz);
    }
  } catch (e) {
    if (turno === mio) publicar(null);
    // el navegador no dejó arrancar el audio sin un toque (la tele, por ejemplo)
    return (e as Error).name === "NotAllowedError" ? "bloqueado" : "ok";
  }
  if (turno === mio) publicar(null);
  return "ok";
}

let reanudar: (() => void) | null = null;
function esperarPausa(mio: number) {
  if (estado?.fase !== "pausa" || turno !== mio) return Promise.resolve();
  return new Promise<void>((r) => (reanudar = r));
}

export function pausar() {
  if (!estado || estado.fase === "pausa") return;
  audio?.pause();
  if (typeof speechSynthesis !== "undefined") speechSynthesis.pause();
  cambiar({ fase: "pausa" });
}

export function continuar() {
  if (estado?.fase !== "pausa") return;
  cambiar({ fase: "sonando" });
  if (audio?.src && audio.paused && terminarAudio) void audio.play().catch(() => {});
  if (typeof speechSynthesis !== "undefined") speechSynthesis.resume();
  reanudar?.();
  reanudar = null;
}

export function detener() {
  turno++;
  apagarEfecto?.();
  apagarEfecto = null;
  audio?.pause();
  terminarAudio?.();
  reanudar?.();
  reanudar = null;
  if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
  publicar(null);
}

export function cambiarVelocidad() {
  velocidad = velocidad >= 1.5 ? 1 : velocidad + 0.25;
  if (audio) audio.playbackRate = velocidad;
  cambiar({ velocidad });
}

// ---- de la vista a una lectura ----

function aPartes(lineas: Linea[], vista: Pick<VistaPartida, "lectura" | "personajes">): Lectura["partes"] {
  const vozDe = (l: Linea): VozPiper =>
    l.voz === "narrador" ? vista.lectura.narrador : l.voz === "otra" ? vista.lectura.otra : (vista.personajes.find((p) => p.id === (l.voz as { personaje: string }).personaje)?.voz ?? vista.lectura.narrador);
  return lineas.flatMap((l) => oraciones(l.texto).map((texto) => ({ texto, voz: vozDe(l) })));
}

/** Arma la lectura de "introduccion", "resolucion" o "prueba:<id>" con lo que hay en la vista. */
export function lecturaDe(que: string, vista: VistaPartida): Lectura | null {
  const personajes = vista.personajes.filter((p) => p.disponible).map((p) => ({ id: p.id, nombre: p.nombre }));
  const ambientacion = vista.caso.ambientacion;
  if (que === "introduccion") return { que, ambientacion, titulo: "Introducción", partes: aPartes(guionDe(vista.caso.introduccion, personajes), vista) };
  if (que === "resolucion" && vista.verdad) {
    const lineas: Linea[] = [
      { voz: "narrador", texto: textoParaLeer(vista.verdad.resumen) },
      ...vista.verdad.cronologia.map((c) => ({ voz: "narrador" as const, texto: textoParaLeer(`A las ${c.hora}: ${c.hecho}`) })),
    ];
    return { que, ambientacion, titulo: "La resolución", partes: aPartes(lineas, vista) };
  }
  if (que.startsWith("prueba:")) {
    const prueba = vista.pruebas.find((p) => p.id === que.slice("prueba:".length));
    if (prueba) return { que, ambientacion, titulo: prueba.titulo, partes: aPartes(guionDePrueba(prueba, personajes), vista) };
  }
  return null;
}

// ---- interfaz ----

/**
 * Botón "Escuchar". Si hay tele y este dispositivo es de un jugador, pregunta en el momento dónde
 * suena: acá (cada uno por su lado) o en la tele (para todos). `enTele` manda la lectura a la tele.
 */
export function BotonEscuchar({ lectura, enTele, chico }: { lectura: () => Lectura | null; enTele?: () => void; chico?: boolean }) {
  const actual = useLectura();
  const [eligiendo, setEligiendo] = useState(false);
  const caja = useRef<HTMLSpanElement>(null);
  const [mia, setMia] = useState<string | null>(null);
  const sonandoAca = !!actual && actual.que === mia;

  useEffect(() => {
    if (!eligiendo) return;
    const cerrar = (e: PointerEvent) => !caja.current?.contains(e.target as Node) && setEligiendo(false);
    document.addEventListener("pointerdown", cerrar);
    return () => document.removeEventListener("pointerdown", cerrar);
  }, [eligiendo]);

  function aca() {
    setEligiendo(false);
    const l = lectura();
    if (!l) return;
    setMia(l.que);
    void desbloquearAudio();
    void leer(l);
  }

  const clase = `inline-flex items-center gap-1 rounded-lg border border-current/30 ${chico ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm"} hover:border-current`;
  return (
    <span ref={caja} className="relative inline-block font-sans">
      <button
        type="button"
        onClick={() => (sonandoAca ? detener() : enTele ? setEligiendo(!eligiendo) : aca())}
        className={clase}
        aria-label={sonandoAca ? "Dejar de escuchar" : "Escuchar en voz alta"}
        aria-expanded={enTele ? eligiendo : undefined}
      >
        {sonandoAca ? "⏹ Detener" : "🔊 Escuchar"}
      </button>
      {eligiendo && (
        <span role="menu" className="absolute right-0 z-30 mt-1 flex w-48 flex-col overflow-hidden rounded-xl border border-borde bg-panel text-left text-sm text-texto shadow-lg">
          <button role="menuitem" type="button" onClick={aca} className="px-3 py-2 text-left hover:bg-panel-2">
            📱 En este dispositivo
          </button>
          <button
            role="menuitem"
            type="button"
            onClick={() => {
              setEligiendo(false);
              enTele?.();
            }}
            className="px-3 py-2 text-left hover:bg-panel-2"
          >
            📺 En la tele, para todos
          </button>
        </span>
      )}
    </span>
  );
}

/** Barra fija abajo mientras se lee: qué se lee, la frase actual y los controles. */
export function ReproductorLectura({ grande }: { grande?: boolean }) {
  const e = useLectura();
  if (!e) return null;
  const boton = `rounded-lg border border-borde ${grande ? "px-4 py-2 text-lg" : "px-2.5 py-1 text-sm"} hover:border-acento`;
  return (
    <div role="region" aria-label="Lectura en voz alta" className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-4">
      <div className={`flex w-full max-w-2xl items-center gap-3 rounded-2xl border border-borde bg-panel/95 p-3 shadow-xl backdrop-blur ${grande ? "text-lg" : "text-sm"}`}>
        <span className="text-2xl" aria-hidden>
          🎙️
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{e.titulo}</p>
          <p className="line-clamp-2 text-suave">
            {e.fase === "preparando" ? `Preparando la voz… ${Math.round(e.avance * 100)}%` : e.frase}
          </p>
        </div>
        <span className="hidden text-xs text-suave sm:inline">
          {Math.min(e.indice + 1, e.total)}/{e.total}
        </span>
        <button onClick={cambiarVelocidad} className={boton} aria-label="Cambiar la velocidad">
          {e.velocidad}×
        </button>
        <button onClick={e.fase === "pausa" ? continuar : pausar} disabled={e.fase === "preparando"} className={`${boton} disabled:opacity-40`} aria-label={e.fase === "pausa" ? "Seguir" : "Pausar"}>
          {e.fase === "pausa" ? "▶" : "⏸"}
        </button>
        <button onClick={detener} className={boton} aria-label="Dejar de escuchar">
          ⏹
        </button>
      </div>
    </div>
  );
}

/**
 * En la tele: lee lo que un jugador mandó. Si el navegador no deja arrancar el audio sin un toque,
 * muestra un botón grande para tocar una vez.
 */
export function NarracionEnTele({ vista }: { vista: VistaPartida }) {
  const [bloqueada, setBloqueada] = useState<Lectura | null>(null);
  const ultima = useRef<string | null>(null);
  const pedido = vista.narracion;

  useEffect(() => {
    if (!pedido || pedido.id === ultima.current) {
      if (!pedido && ultima.current) {
        ultima.current = null;
        detener();
      }
      return;
    }
    ultima.current = pedido.id;
    const l = lecturaDe(pedido.que, vista);
    if (!l) return;
    void leer(l).then((r) => r === "bloqueado" && setBloqueada(l));
  }, [pedido, vista]);

  if (!bloqueada) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
      <button
        onClick={() => {
          void desbloquearAudio();
          void leer(bloqueada);
          setBloqueada(null);
        }}
        className="rounded-2xl bg-acento px-8 py-6 text-2xl font-semibold text-acento-texto shadow-xl"
      >
        🔊 Tocá para escuchar «{bloqueada.titulo}»
      </button>
    </div>
  );
}
