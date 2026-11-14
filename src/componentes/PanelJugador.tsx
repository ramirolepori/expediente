"use client";

import { useEffect, useRef, useState } from "react";
import type { useSala } from "@/cliente/useSala";
import type { VistaPartida } from "@/motor/vista";
import { Markdown, Punto, Reloj } from "./comunes";
import { Documento, iconoPrueba } from "./Documento";
import { Interrogatorio } from "./Interrogatorio";
import { Lobby } from "./Lobby";
import { Resultado } from "./Resultado";

type Sala = ReturnType<typeof useSala>;
type Pestana = "expediente" | "interrogar" | "pizarra" | "notas" | "resolver";

const PESTANAS: { id: Pestana; nombre: string; icono: string }[] = [
  { id: "expediente", nombre: "Expediente", icono: "🗂️" },
  { id: "interrogar", nombre: "Interrogar", icono: "🗣️" },
  { id: "pizarra", nombre: "Pizarra", icono: "📌" },
  { id: "notas", nombre: "Notas", icono: "📝" },
  { id: "resolver", nombre: "Resolver", icono: "⚖️" },
];

export function PanelJugador({ sala, vista }: { sala: Sala; vista: VistaPartida }) {
  const [pestana, setPestana] = useState<Pestana>("expediente");

  if (vista.fase === "lobby") {
    return (
      <>
        <Lobby vista={vista} onIniciar={() => sala.accion({ tipo: "iniciar" })} />
        {sala.error && <p className="pb-6 text-center text-sm text-acento">{sala.error}</p>}
      </>
    );
  }
  if (vista.fase === "terminada") return <Resultado vista={vista} />;

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      {/* barra lateral en pantallas grandes, barra inferior en celulares */}
      <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-borde bg-panel/95 backdrop-blur lg:static lg:w-56 lg:flex-col lg:border-t-0 lg:border-r lg:bg-panel lg:p-3">
        <div className="hidden px-2 pb-4 lg:block">
          <p className="font-titulo text-lg leading-tight">{vista.caso.meta.titulo}</p>
          <p className="mt-1 text-xs text-suave">Sala {vista.codigo}</p>
        </div>
        {PESTANAS.map((p) => (
          <button
            key={p.id}
            onClick={() => setPestana(p.id)}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] lg:flex-none lg:flex-row lg:gap-3 lg:rounded-lg lg:px-3 lg:py-2.5 lg:text-sm ${
              pestana === p.id ? "text-acento lg:bg-panel-2" : "text-suave"
            }`}
          >
            <span className="text-lg lg:text-base">{p.icono}</span>
            {p.nombre}
          </button>
        ))}
      </nav>

      <div className="flex-1 pb-20 lg:pb-0">
        <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-borde bg-bg/90 px-4 py-2.5 backdrop-blur">
          <div className="flex min-w-0 items-center gap-2">
            {vista.yo && <Punto color={vista.yo.color} />}
            <span className="truncate text-sm">{vista.yo?.apodo}</span>
          </div>
          <div className="flex items-center gap-4 text-sm text-suave">
            {vista.recursosRestantes !== null && <span title="Horas de investigación">🕰 {vista.recursosRestantes} h</span>}
            <Reloj iniciada={vista.iniciada} limiteMin={vista.config.temporizadorMin} />
          </div>
        </header>
        {sala.error && (
          <button onClick={() => sala.setError(null)} className="w-full bg-acento/15 px-4 py-2 text-left text-sm text-acento">
            {sala.error} ✕
          </button>
        )}
        <main className="mx-auto w-full max-w-4xl px-4 py-5">
          {pestana === "expediente" && <Expediente sala={sala} vista={vista} />}
          {pestana === "interrogar" && <Interrogatorio sala={sala} vista={vista} />}
          {pestana === "pizarra" && <Pizarra vista={vista} />}
          {pestana === "notas" && <Notas sala={sala} vista={vista} />}
          {pestana === "resolver" && <Resolver sala={sala} vista={vista} />}
        </main>
      </div>
    </div>
  );
}

function Expediente({ sala, vista }: { sala: Sala; vista: VistaPartida }) {
  const [abierta, setAbierta] = useState<string | null>(null);
  const [codigos, setCodigos] = useState<Record<string, string>>({});
  const doc = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (abierta) doc.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [abierta]);
  return (
    <div className="space-y-6">
      <details className="papel rounded-sm px-5 py-4" open={vista.sobres.filter((s) => s.abierto).length === 1}>
        <summary className="cursor-pointer text-lg">📜 Introducción al caso</summary>
        <div className="mt-2 leading-relaxed">
          <Markdown>{vista.caso.introduccion}</Markdown>
        </div>
      </details>

      {vista.sobres.map((s) => {
        const pruebas = vista.pruebas.filter((p) => p.sobre === s.id);
        return (
          <section key={s.id}>
            <div className="mb-3 flex items-end justify-between gap-3">
              <div>
                <h2 className="font-titulo text-xl">{s.titulo}</h2>
                <p className="text-sm text-suave">{s.descripcion}</p>
              </div>
              {!s.abierto && (
                <button
                  disabled={!s.sePuedeAbrir}
                  onClick={() => sala.accion({ tipo: "abrirSobre", sobre: s.id })}
                  className="shrink-0 rounded-lg bg-acento px-3 py-2 text-sm font-semibold text-acento-texto disabled:opacity-30"
                >
                  {s.sePuedeAbrir ? "Abrir sobre" : "🔒 Cerrado"}
                </button>
              )}
            </div>
            {s.abierto && (
              <div className="grid gap-2 sm:grid-cols-2">
                {pruebas.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setAbierta(abierta === p.id ? null : p.id)}
                    className={`rounded-xl border px-4 py-3 text-left text-sm transition ${abierta === p.id ? "border-acento bg-panel-2" : "border-borde bg-panel hover:border-suave"}`}
                  >
                    {iconoPrueba(p.tipo)} {p.titulo}
                  </button>
                ))}
              </div>
            )}
            {pruebas.some((p) => p.id === abierta) && (
              <div ref={doc} className="mt-4 scroll-mt-16">
                <Documento prueba={pruebas.find((p) => p.id === abierta)!} />
              </div>
            )}
          </section>
        );
      })}

      {vista.candados.length > 0 && (
        <section>
          <h2 className="mb-3 font-titulo text-xl">Candados</h2>
          <div className="space-y-2">
            {vista.candados.map((c) => (
              <div key={c.id} className="rounded-xl border border-borde bg-panel p-4">
                <p className="font-semibold">
                  {c.abierto ? "🔓" : "🔒"} {c.titulo}
                </p>
                <p className="text-sm text-suave">{c.descripcion}</p>
                {!c.abierto && (
                  <form
                    className="mt-3 flex gap-2"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      await sala.accion({ tipo: "probarCandado", candado: c.id, codigo: codigos[c.id] ?? "" });
                      setCodigos((x) => ({ ...x, [c.id]: "" }));
                    }}
                  >
                    <input
                      value={codigos[c.id] ?? ""}
                      onChange={(e) => setCodigos((x) => ({ ...x, [c.id]: e.target.value }))}
                      className="min-w-0 flex-1 rounded-lg border border-borde bg-panel-2 px-3 py-2 font-mono uppercase"
                      placeholder="Código"
                    />
                    <button className="rounded-lg bg-acento px-4 text-sm font-semibold text-acento-texto">Probar</button>
                  </form>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {vista.config.ayudas !== "apagadas" && (
        <section className="rounded-xl border border-dashed border-borde p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold">El comisario</h2>
              <p className="text-sm text-suave">{vista.config.ayudas === "limitadas" ? "Cada ayuda resta 3 puntos." : "Ayudas libres."}</p>
            </div>
            <button onClick={() => sala.accion({ tipo: "pedirAyuda" })} className="rounded-lg border border-borde bg-panel-2 px-3 py-2 text-sm">
              Pedir una pista
            </button>
          </div>
          {vista.ayudas.map((a) => (
            <p key={a.id} className="mt-3 rounded-lg bg-panel-2 p-3 text-sm">
              💡 {a.texto}
            </p>
          ))}
        </section>
      )}
    </div>
  );
}

function Pizarra({ vista }: { vista: VistaPartida }) {
  return (
    <div className="grid gap-6 md:grid-cols-[1.4fr_1fr]">
      <section>
        <h2 className="mb-3 font-titulo text-xl">Descubrimientos</h2>
        {vista.descubrimientos.length === 0 && <p className="text-sm text-suave">Todavía nada. Lo que confiesen o cuenten los interrogados aparece acá.</p>}
        <div className="grid gap-3 sm:grid-cols-2">
          {vista.descubrimientos.map((h, i) => (
            <div key={h.id} className="papel aparecer rounded-sm p-3 text-sm" style={{ transform: `rotate(${((i * 37) % 5) - 2}deg)` }}>
              📌 {h.texto}
            </div>
          ))}
        </div>
      </section>
      <section>
        <h2 className="mb-3 font-titulo text-xl">Bitácora</h2>
        <ol className="space-y-2 text-sm">
          {[...vista.eventos].reverse().map((e) => (
            <li key={e.id} className="flex gap-2">
              <span className="shrink-0 font-mono text-xs text-suave">{new Date(e.hora).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}</span>
              <span>{e.texto}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

function Notas({ sala, vista }: { sala: Sala; vista: VistaPartida }) {
  const [texto, setTexto] = useState("");
  const [visibilidad, setVisibilidad] = useState<"privada" | "equipo">("privada");
  const autor = (id: string) => vista.conexiones.find((c) => c.id === id);
  return (
    <div className="space-y-5">
      <form
        className="rounded-xl border border-borde bg-panel p-4"
        onSubmit={async (e) => {
          e.preventDefault();
          if (await sala.accion({ tipo: "nota", texto, visibilidad })) setTexto("");
        }}
      >
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          rows={3}
          placeholder="Hipótesis, contradicciones, horarios…"
          className="w-full resize-y rounded-lg border border-borde bg-panel-2 p-3 outline-none focus:border-acento"
        />
        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="flex rounded-lg border border-borde p-0.5 text-sm">
            {(["privada", "equipo"] as const).map((v) => (
              <button type="button" key={v} onClick={() => setVisibilidad(v)} className={`rounded-md px-3 py-1 ${visibilidad === v ? "bg-acento text-acento-texto" : "text-suave"}`}>
                {v === "privada" ? "🔒 Privada" : "👥 Equipo"}
              </button>
            ))}
          </div>
          <button disabled={!texto.trim()} className="rounded-lg bg-acento px-4 py-2 text-sm font-semibold text-acento-texto disabled:opacity-40">
            Guardar
          </button>
        </div>
      </form>
      <ul className="space-y-2">
        {[...vista.notas].reverse().map((n) => (
          <li key={n.id} className="rounded-xl border border-borde bg-panel p-3">
            <div className="mb-1 flex items-center gap-2 text-xs text-suave">
              <Punto color={autor(n.autor)?.color ?? "#777"} />
              {autor(n.autor)?.apodo} · {n.visibilidad === "privada" ? "🔒 privada" : "👥 equipo"}
              {n.autor === vista.yo?.id && (
                <button onClick={() => sala.accion({ tipo: "borrarNota", id: n.id })} className="ml-auto hover:text-acento">
                  borrar
                </button>
              )}
            </div>
            <p className="whitespace-pre-wrap text-sm">{n.texto}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Resolver({ sala, vista }: { sala: Sala; vista: VistaPartida }) {
  const [respuestas, setRespuestas] = useState<Record<string, string>>({});
  const [confirmar, setConfirmar] = useState(false);
  const completas = vista.preguntas.every((p) => respuestas[p.id]);
  return (
    <div className="space-y-4">
      <p className="text-sm text-suave">La acusación es una sola y termina la partida para todos. Pónganse de acuerdo antes de enviarla.</p>
      {vista.preguntas.map((p) => (
        <fieldset key={p.id} className="rounded-xl border border-borde bg-panel p-4">
          <legend className="px-1 font-semibold">{p.texto}</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {(p.tipo === "personaje" ? vista.personajes.map((x) => ({ id: x.id, texto: x.nombre })) : (p.opciones ?? [])).map((o) => (
              <label key={o.id} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${respuestas[p.id] === o.id ? "border-acento bg-panel-2" : "border-borde"}`}>
                <input type="radio" name={p.id} className="accent-[var(--acento)]" checked={respuestas[p.id] === o.id} onChange={() => setRespuestas((r) => ({ ...r, [p.id]: o.id }))} />
                {o.texto}
              </label>
            ))}
          </div>
        </fieldset>
      ))}
      {!confirmar ? (
        <button disabled={!completas} onClick={() => setConfirmar(true)} className="w-full rounded-xl bg-acento py-3 font-semibold text-acento-texto disabled:opacity-40">
          Presentar acusación
        </button>
      ) : (
        <div className="rounded-xl border border-acento p-4 text-center">
          <p className="font-semibold">¿Seguros? No hay vuelta atrás.</p>
          <div className="mt-3 flex justify-center gap-2">
            <button onClick={() => setConfirmar(false)} className="rounded-lg border border-borde px-4 py-2">
              Volver
            </button>
            <button onClick={() => sala.accion({ tipo: "acusar", respuestas })} className="rounded-lg bg-acento px-4 py-2 font-semibold text-acento-texto">
              Sí, acusar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
