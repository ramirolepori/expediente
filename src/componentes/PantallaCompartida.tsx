"use client";

import type { VistaPartida } from "@/motor/vista";
import { Punto, QR, Reloj, useUrlSala } from "./comunes";
import { Avisos } from "./Avisos";
import { Resultado } from "./Resultado";

/** Lo que se ve en la tele: nada privado, todo grande y legible a distancia. */
export function PantallaCompartida({ vista }: { vista: VistaPartida }) {
  const jugadores = vista.conexiones.filter((c) => c.tipo === "jugador");
  const url = useUrlSala(vista.codigo);

  if (vista.fase === "lobby") {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-8 p-8 text-center">
        <h1 className="text-4xl font-bold md:text-6xl">{vista.caso.meta.titulo}</h1>
        <div className="flex flex-col items-center gap-8 md:flex-row">
          <div className="rounded-3xl bg-white p-4">
            {url ? <QR url={url} tamano={260} /> : <div className="h-[260px] w-[260px]" />}
          </div>
          <div>
            <p className="text-2xl text-suave">Entrá con el código</p>
            <p className="font-mono text-8xl font-bold tracking-[0.25em]">{vista.codigo}</p>
          </div>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          {jugadores.map((j) => (
            <span key={j.id} className="flex items-center gap-2 rounded-full bg-panel px-4 py-2 text-xl">
              <Punto color={j.color} /> {j.apodo}
            </span>
          ))}
        </div>
      </main>
    );
  }
  if (vista.fase === "terminada") return <Resultado vista={vista} grande />;

  // el interrogatorio más reciente es el protagonista de la pantalla
  const activo = Object.entries(vista.interrogatorios)
    .map(([id, ms]) => ({ id, ultimo: ms.at(-1)?.hora ?? 0, ms }))
    .sort((a, b) => b.ultimo - a.ultimo)[0];
  const personaje = activo && vista.personajes.find((p) => p.id === activo.id);
  const autor = (id?: string) => vista.conexiones.find((c) => c.id === id);

  return (
    <main className="grid min-h-dvh grid-rows-[auto_1fr] gap-6 p-6 lg:p-10">
      <Avisos vista={vista} grande />
      <header className="flex items-end justify-between gap-6">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-acento">Sala {vista.codigo}</p>
          <h1 className="font-titulo text-4xl lg:text-5xl">{vista.caso.meta.titulo}</h1>
        </div>
        <div className="flex items-center gap-8 text-suave">
          {vista.recursosRestantes !== null && <span className="text-3xl">🕰 {vista.recursosRestantes} h</span>}
          <Reloj iniciada={vista.iniciada} limiteMin={vista.config.temporizadorMin} grande />
        </div>
      </header>

      <div className="grid min-h-0 gap-6 lg:grid-cols-[1.5fr_1fr]">
        <section className="flex min-h-0 flex-col rounded-2xl border border-borde bg-panel p-6">
          {personaje ? (
            <>
              <p className="text-sm uppercase tracking-widest text-suave">Interrogatorio en curso</p>
              <h2 className="font-titulo text-3xl">{personaje.nombre}</h2>
              <p className="text-acento">{personaje.rol}</p>
              <div className="mt-4 flex-1 space-y-4 overflow-hidden">
                {activo.ms.slice(-6).map((m) =>
                  m.de === "personaje" ? (
                    <p key={m.id} className="papel aparecer rounded-sm p-4 text-2xl leading-snug">
                      {m.texto}
                    </p>
                  ) : m.de === "jugador" ? (
                    <p key={m.id} className="aparecer flex items-center gap-2 text-xl text-suave">
                      <Punto color={autor(m.autor)?.color ?? "#777"} /> {autor(m.autor)?.apodo}: {m.texto}
                    </p>
                  ) : null,
                )}
              </div>
            </>
          ) : (
            <div className="m-auto max-w-xl text-center text-2xl text-suave">Cuando alguien interrogue a un sospechoso, la charla aparece acá para que la sigan todos.</div>
          )}
        </section>

        <aside className="flex min-h-0 flex-col gap-6">
          <section className="rounded-2xl border border-borde bg-panel p-5">
            <h2 className="mb-3 text-lg font-semibold">Sobres</h2>
            <ul className="space-y-1.5 text-lg">
              {vista.sobres.map((s) => (
                <li key={s.id} className={s.abierto ? "" : "text-suave"}>
                  {s.abierto ? "📂" : "✉️"} {s.titulo}
                </li>
              ))}
            </ul>
          </section>
          <section className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-borde bg-panel p-5">
            <h2 className="mb-3 text-lg font-semibold">Descubrimientos ({vista.descubrimientos.length})</h2>
            <ul className="space-y-2">
              {vista.descubrimientos.slice(-5).reverse().map((h) => (
                <li key={h.id} className="papel aparecer rounded-sm p-3 text-base">
                  📌 {h.texto}
                </li>
              ))}
            </ul>
          </section>
          <section className="rounded-2xl border border-borde bg-panel p-5 text-suave">
            {vista.eventos.slice(-3).reverse().map((e) => (
              <p key={e.id} className="truncate">
                {e.texto}
              </p>
            ))}
          </section>
        </aside>
      </div>
    </main>
  );
}
