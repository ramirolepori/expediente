"use client";

import { useState } from "react";
import { casoLaboratorio as caso } from "@/casos/laboratorio";
import { Corcho, LineaDeTiempo } from "@/componentes/Pizarra";
import { aplicar, ErrorDeJuego } from "@/motor/reductor";
import { CONFIG_POR_DEFECTO, type Accion, type EstadoPartida } from "@/motor/tipos";
import { vistaPara } from "@/motor/vista";

/** Partida de mentira con el motor real: sobres 1 y 2 abiertos, algunos descubrimientos y una nota de equipo. */
function partidaDePrueba(conEjemplo: boolean): EstadoPartida {
  const ahora = Date.now();
  let s: EstadoPartida = {
    codigo: "LABO",
    casoId: caso.meta.id,
    config: CONFIG_POR_DEFECTO,
    fase: "jugando",
    creada: ahora,
    iniciada: ahora,
    conexiones: {
      yo: { id: "yo", tipo: "jugador", apodo: "Laboratorio", color: "#e4572e", anfitrion: true, ultimaVez: ahora },
    },
    sobresAbiertos: ["s1_local", "s2_noche"],
    hechosRevelados: ["elena_cumple", "tito_campera", "tito_vio"],
    candadosAbiertos: [],
    ayudasUsadas: [],
    personajesVisitados: [],
    intentosCandado: 0,
    notas: [{ id: "nota1", autor: "yo", texto: "Comparar las declaraciones con el registro de la alarma.", visibilidad: "equipo", hora: ahora }],
    interrogatorios: {},
    acusacion: null,
    eventos: [],
    version: 0,
  };
  if (conEjemplo) {
    const acciones: Accion[] = [
      { tipo: "pizarraColocar", ref: { tipo: "personaje", id: "elena" }, x: 30, y: 25 },
      { tipo: "pizarraColocar", ref: { tipo: "prueba", id: "registro_alarma" }, x: 70, y: 22 },
      { tipo: "pizarraColocar", ref: { tipo: "hecho", id: "tito_vio" }, x: 50, y: 55 },
      { tipo: "pizarraColocar", ref: { tipo: "personaje", id: "tito" }, x: 20, y: 75 },
      { tipo: "pizarraColocar", ref: { tipo: "nota", id: "nota1" }, x: 78, y: 72 },
      { tipo: "lineaAgregar", ref: { tipo: "hecho", id: "elena_cumple" }, hora: "Vie 21:00" },
      { tipo: "lineaAgregar", ref: { tipo: "hecho", id: "tito_campera" }, hora: "Vie 22:30" },
      { tipo: "lineaAgregar", ref: { tipo: "hecho", id: "tito_vio" }, hora: "Vie 22:43" },
    ];
    for (const a of acciones) s = aplicar(s, a, "yo", caso);
    const [a, b, c] = s.pizarra!.items;
    s = aplicar(s, { tipo: "pizarraHilo", a: a.id, b: b.id }, "yo", caso);
    s = aplicar(s, { tipo: "pizarraHilo", a: a.id, b: c.id }, "yo", caso);
  }
  return s;
}

export default function PizarraLaboratorio() {
  const [estado, setEstado] = useState(() => partidaDePrueba(true));
  const [vistaActual, setVistaActual] = useState<"corcho" | "linea" | "tele">("corcho");
  const [error, setError] = useState<string | null>(null);
  const vista = vistaPara(caso, estado, "yo");

  // mismo contrato que en el juego, pero el motor corre acá mismo, sin servidor
  const enviar = async (accion: Accion) => {
    try {
      setEstado((s) => aplicar(s, accion, "yo", caso));
      setError(null);
      return true;
    } catch (e) {
      setError(e instanceof ErrorDeJuego ? e.message : "Error inesperado");
      return false;
    }
  };

  return (
    <div data-ambientacion={caso.ambientacion} className="ambiente min-h-dvh">
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="font-titulo text-3xl">Pizarra</h1>
        <p className="mt-1 text-sm text-suave">Corcho, hilos y línea de tiempo con el motor real del juego, sin armar una sala. Los sobres 1 y 2 están abiertos.</p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-borde p-0.5 text-sm">
            {(
              [
                ["corcho", "📌 Corcho"],
                ["linea", "🕰️ Línea de tiempo"],
                ["tele", "📺 Cómo se ve en la tele"],
              ] as const
            ).map(([id, nombre]) => (
              <button key={id} onClick={() => setVistaActual(id)} className={`rounded-md px-3 py-1.5 ${vistaActual === id ? "bg-acento text-acento-texto" : "text-suave"}`}>
                {nombre}
              </button>
            ))}
          </div>
          <button onClick={() => setEstado(partidaDePrueba(true))} className="rounded-lg border border-borde px-3 py-1.5 text-sm">
            Cargar ejemplo
          </button>
          <button onClick={() => setEstado(partidaDePrueba(false))} className="rounded-lg border border-borde px-3 py-1.5 text-sm">
            Vaciar
          </button>
        </div>
        {error && <p className="mt-3 text-sm text-acento">{error}</p>}
        <div className="mt-5">
          {vistaActual === "corcho" && <Corcho vista={vista} enviar={enviar} />}
          {vistaActual === "linea" && <LineaDeTiempo vista={vista} enviar={enviar} />}
          {vistaActual === "tele" && (
            <div className="rounded-2xl border border-borde bg-panel p-6" style={{ height: "min(80vh, 760px)" }}>
              <p className="mb-3 text-sm uppercase tracking-widest text-suave">Pizarra del equipo</p>
              <div className="h-[calc(100%-2rem)]">
                <Corcho vista={vista} soloLectura alto="100%" />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
