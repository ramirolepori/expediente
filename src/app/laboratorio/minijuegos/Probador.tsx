"use client";

import { useState } from "react";
import { ICONO_MINIJUEGO, JuegoMinijuego } from "@/componentes/minijuegos/Minijuego";
import type { VistaPartida } from "@/motor/vista";

type Datos = VistaPartida["minijuegos"][number];

export interface MinijuegoDePrueba {
  casoId: string;
  casoTitulo: string;
  ambientacion: string;
  id: string;
  titulo: string;
  descripcion: string;
  tipo: Datos["tipo"];
  sobre: string;
  modo: string;
  config: Datos["config"];
  solucion: string[];
  destraba: string[];
}

export function Probador({ minijuegos }: { minijuegos: MinijuegoDePrueba[] }) {
  const [elegido, setElegido] = useState(0);
  const [partida, setPartida] = useState(0);
  const [resuelto, setResuelto] = useState(false);
  const [intentos, setIntentos] = useState(0);
  const [fallo, setFallo] = useState(false);
  const [verSolucion, setVerSolucion] = useState(false);
  const m = minijuegos[elegido];

  const reiniciar = (indice = elegido) => {
    setElegido(indice);
    setPartida((p) => p + 1);
    setResuelto(false);
    setFallo(false);
    setIntentos(0);
    setVerSolucion(false);
  };

  const enviar = async (respuesta: string) => {
    setIntentos((i) => i + 1);
    const r = await fetch("/api/laboratorio/minijuego", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ casoId: m.casoId, minijuego: m.id, respuesta }),
    }).then((x) => x.json());
    setResuelto(!!r.correcto);
    setFallo(!r.correcto);
  };

  if (!m) return <main className="mx-auto max-w-5xl px-4 py-10 text-suave">Ningún caso trae minijuegos todavía.</main>;

  return (
    <div data-ambientacion={m.ambientacion} className="ambiente min-h-dvh">
      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[280px_1fr]">
        <aside className="space-y-2">
          <h1 className="font-titulo text-2xl">Minijuegos</h1>
          <p className="text-sm text-suave">Jugalos sueltos, sin armar una sala.</p>
          {minijuegos.map((x, i) => (
            <button
              key={`${x.casoId}-${x.id}`}
              onClick={() => reiniciar(i)}
              className={`block w-full rounded-xl border px-3 py-2 text-left text-sm ${i === elegido ? "border-acento bg-panel-2" : "border-borde bg-panel"}`}
            >
              <span className="font-semibold">
                {ICONO_MINIJUEGO[x.tipo]} {x.titulo}
              </span>
              <span className="block text-xs text-suave">
                {x.casoTitulo} · {x.tipo.replace("_", " ")}
              </span>
            </button>
          ))}
        </aside>

        <section className="min-w-0">
          <div className="rounded-2xl border border-borde bg-panel p-4">
            <p className="text-xs uppercase tracking-widest text-suave">
              {m.casoTitulo} · {m.sobre} · {m.modo}
            </p>
            <h2 className="font-titulo text-2xl">
              {ICONO_MINIJUEGO[m.tipo]} {m.titulo}
            </h2>
            <p className="mt-1 text-sm text-suave">{m.descripcion}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
              <button onClick={() => reiniciar()} className="rounded-lg border border-borde px-3 py-1.5">
                ↺ Reiniciar
              </button>
              <button onClick={() => setVerSolucion((v) => !v)} className="rounded-lg border border-borde px-3 py-1.5">
                {verSolucion ? "Ocultar solución" : "👁 Ver solución"}
              </button>
              <span className="text-suave">Intentos: {intentos}</span>
            </div>
            {verSolucion && (
              <div className="papel mt-3 rounded-sm p-3 text-sm">
                <p className="font-bold">Solución</p>
                <ol className="list-decimal pl-5">
                  {m.solucion.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ol>
                {m.destraba.length > 0 && <p className="mt-2">Destraba: {m.destraba.join(", ")}</p>}
              </div>
            )}
          </div>
          <div className="mt-4">
            <JuegoMinijuego
              key={`${m.casoId}-${m.id}-${partida}`}
              tipo={m.tipo}
              config={m.config}
              resuelto={resuelto}
              fallo={fallo}
              intentoClave={intentos}
              ambientacion={m.ambientacion}
              apodo="Laboratorio"
              onEnviar={enviar}
            />
          </div>
        </section>
      </main>
    </div>
  );
}
