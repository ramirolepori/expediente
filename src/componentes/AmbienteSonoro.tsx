"use client";

import { useEffect, useRef, useState } from "react";
import { atenuar, bus, contexto, despertar, volumen } from "@/cliente/audio";
import { paisajeDe, type Momento } from "@/cliente/paisajes";
import type { VistaPartida } from "@/motor/vista";
import { useLectura } from "./Narrador";
import { usePersonajeSonando } from "./Voces";

const CLAVE = "expediente-ambiente";

function leerPreferencia(): { activo?: boolean; volumen: number } {
  try {
    return { volumen: 0.8, ...JSON.parse(localStorage.getItem(CLAVE) ?? "{}") };
  } catch {
    return { volumen: 0.8 };
  }
}

/**
 * Ambiente, música y efectos de la ambientación (ADR 0015). Suena en la tele, o en el anfitrión si no hay
 * tele; cualquiera lo puede prender o apagar en su dispositivo. Arranca con el primer toque, porque los
 * navegadores no dejan sonar audio antes.
 */
export function AmbienteSonoro({ vista, grande }: { vista: VistaPartida; grande?: boolean }) {
  const paisaje = vista.fase === "lobby" ? undefined : paisajeDe(vista.caso.ambientacion);
  const hayTele = vista.conexiones.some((c) => c.tipo === "pantalla");
  const porDefecto = vista.yo?.tipo === "pantalla" || (!hayTele && !!vista.yo?.anfitrion);
  const [pref, setPref] = useState(leerPreferencia);
  const activo = pref.activo ?? porDefecto;
  const [andando, setAndando] = useState(false);
  const [abierto, setAbierto] = useState(false);
  const lectura = useLectura();
  const personaje = usePersonajeSonando();

  const guardar = (p: { activo?: boolean; volumen: number }) => {
    setPref(p);
    try {
      localStorage.setItem(CLAVE, JSON.stringify(p));
    } catch {}
  };

  // el ambiente y la música mientras esté activo; arrancan con el primer toque si el navegador lo pide
  useEffect(() => {
    if (!paisaje || !activo) return;
    let apagar: (() => void) | null = null;
    let musica: HTMLAudioElement | null = null;
    let vivo = true;
    const arrancar = async () => {
      if (!vivo || apagar || !(await despertar())) return;
      apagar = paisaje.ambiente();
      if (paisaje.musica) {
        musica = new Audio(paisaje.musica);
        musica.loop = true;
        musica.crossOrigin = "anonymous";
        contexto().createMediaElementSource(musica).connect(bus("musica"));
        // si la ambientación todavía no tiene música, el archivo no está y no pasa nada
        musica.play().catch(() => {});
      }
      setAndando(true);
    };
    void arrancar();
    const alTocar = () => void arrancar();
    document.addEventListener("pointerdown", alTocar);
    document.addEventListener("keydown", alTocar);
    return () => {
      vivo = false;
      document.removeEventListener("pointerdown", alTocar);
      document.removeEventListener("keydown", alTocar);
      apagar?.();
      musica?.pause();
      setAndando(false);
    };
  }, [paisaje, activo]);

  useEffect(() => {
    if (andando) volumen(pref.volumen);
  }, [andando, pref.volumen]);

  // cuando habla un personaje o el narrador, el ambiente baja
  useEffect(() => {
    if (andando) atenuar(!!personaje || lectura?.fase === "sonando");
  }, [andando, personaje, lectura?.fase]);

  // efectos para los momentos del juego: se detectan comparando con la vista anterior
  const antes = useRef<{ sobres: number; descubrimientos: number; candados: number; fase: string } | null>(null);
  useEffect(() => {
    const ahora = {
      sobres: vista.sobres.filter((s) => s.abierto).length,
      descubrimientos: vista.descubrimientos.length,
      candados: vista.candados.filter((c) => c.abierto).length,
      fase: vista.fase,
    };
    const previo = antes.current;
    antes.current = ahora;
    if (!previo || !andando || !paisaje) return;
    const m: Momento | null =
      ahora.fase === "terminada" && previo.fase !== "terminada"
        ? "final"
        : ahora.candados > previo.candados
          ? "candado"
          : ahora.descubrimientos > previo.descubrimientos
            ? "revelacion"
            : ahora.sobres > previo.sobres
              ? "sobre"
              : null;
    if (m) paisaje.efecto(m);
  }, [vista, andando, paisaje]);

  if (!paisaje) return null;
  return (
    <div className="relative">
      <button
        onClick={() => setAbierto(!abierto)}
        aria-expanded={abierto}
        aria-label="Sonido ambiente"
        className={`shrink-0 rounded-lg border border-borde ${grande ? "px-4 py-2 text-xl" : "px-2.5 py-1 text-xs"} ${activo ? "text-acento" : "text-suave"}`}
      >
        {activo ? (andando ? "🌧 Ambiente" : "🌧 Tocá para escuchar") : "🔇 Ambiente"}
      </button>
      {abierto && (
        <div className="absolute right-0 z-30 mt-2 w-60 rounded-xl border border-borde bg-panel p-3 text-left text-sm text-texto shadow-xl">
          <label className="flex items-center justify-between gap-2">
            <span>Sonido en este dispositivo</span>
            <input type="checkbox" checked={activo} onChange={(e) => guardar({ ...pref, activo: e.target.checked })} aria-label="Sonido ambiente en este dispositivo" />
          </label>
          <label className="mt-3 block">
            <span className="text-xs text-suave">Volumen</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={pref.volumen}
              onChange={(e) => guardar({ ...pref, volumen: Number(e.target.value) })}
              className="mt-1 w-full accent-[var(--acento)]"
              aria-label="Volumen del ambiente"
            />
          </label>
          <p className="mt-2 text-xs text-suave">{porDefecto ? "Este dispositivo pone el sonido de la sala." : hayTele ? "El sonido de la sala suena en la tele." : "El sonido de la sala suena en el anfitrión."}</p>
        </div>
      )}
    </div>
  );
}
