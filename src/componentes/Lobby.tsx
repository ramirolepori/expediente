"use client";

import type { VistaPartida } from "@/motor/vista";
import { Punto, QR, useUrlSala } from "./comunes";

export function Lobby({ vista, onIniciar }: { vista: VistaPartida; onIniciar: () => void }) {
  const jugadores = vista.conexiones.filter((c) => c.tipo === "jugador");
  const pantallas = vista.conexiones.filter((c) => c.tipo === "pantalla");
  const { max } = vista.caso.meta.jugadores;
  const min = vista.config.modo === "traidor" ? Math.max(3, vista.caso.meta.jugadores.min) : vista.caso.meta.jugadores.min;
  const url = useUrlSala(vista.codigo);
  return (
    <main className="mx-auto grid w-full max-w-4xl gap-6 px-4 py-8 md:grid-cols-2">
      <section className="rounded-2xl border border-borde bg-panel p-6 text-center">
        <p className="text-suave">Código de la sala</p>
        <p className="font-mono text-6xl font-bold tracking-[0.3em]">{vista.codigo}</p>
        <div className="mt-5 flex justify-center">
          {url ? <QR url={url} /> : <div className="h-[180px]" />}
        </div>
        <p className="mt-3 break-all text-xs text-suave">{url}</p>
        <button
          onClick={() => window.open(`/sala/${vista.codigo}?pantalla`, "_blank")}
          className="mt-5 w-full rounded-xl border border-borde bg-panel-2 py-2.5 text-sm font-medium"
        >
          📺 Abrir la pantalla compartida en otra ventana
        </button>
        <p className="mt-2 text-xs text-suave">Llevá esa ventana a la tele (segunda pantalla o transmitir pestaña) y seguí jugando desde esta.</p>
      </section>

      <section className="rounded-2xl border border-borde bg-panel p-6">
        <p className="text-xs uppercase tracking-widest text-suave">Caso</p>
        <h1 className="text-2xl font-bold">{vista.caso.meta.titulo}</h1>
        <p className="mt-2 text-sm text-suave">{vista.caso.meta.sinopsis}</p>

        <h2 className="mt-6 font-semibold">
          Jugadores ({jugadores.length}/{max})
        </h2>
        <ul className="mt-2 space-y-1.5">
          {jugadores.map((j) => (
            <li key={j.id} className="flex items-center gap-2">
              <Punto color={j.color} /> {j.apodo}
              {j.anfitrion && <span className="text-xs text-suave">(anfitrión)</span>}
              {vista.yo?.id === j.id && <span className="text-xs text-suave">(vos)</span>}
            </li>
          ))}
        </ul>
        {pantallas.length > 0 && <p className="mt-3 text-sm text-suave">📺 {pantallas.length} pantalla(s) compartida(s) conectada(s)</p>}

        <div className="mt-6 rounded-xl bg-panel-2 p-3 text-xs text-suave">
          Modo {vista.config.modo === "traidor" ? "traidor 🎭 (uno de ustedes juega en contra)" : vista.config.modo} · {vista.config.recursos ? `${vista.config.recursos} horas` : "sin límite de horas"} · ayudas {vista.config.ayudas}
          {vista.config.temporizadorMin ? ` · ${vista.config.temporizadorMin} min` : ""} · micrófono {vista.config.voz ? "sí" : "no"}
        </div>

        {vista.yo?.anfitrion ? (
          <button
            onClick={onIniciar}
            disabled={jugadores.length < min}
            className="mt-6 w-full rounded-xl bg-acento py-3 font-semibold text-acento-texto disabled:opacity-40"
          >
            {jugadores.length < min ? `Esperando jugadores (mínimo ${min})` : "Abrir el caso"}
          </button>
        ) : (
          <p className="mt-6 text-center text-sm text-suave">Esperando a que el anfitrión abra el caso…</p>
        )}
      </section>
    </main>
  );
}
