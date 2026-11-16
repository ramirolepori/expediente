"use client";

import { useEffect, useRef, useState } from "react";
import type { useSala } from "@/cliente/useSala";
import type { VistaPartida } from "@/motor/vista";
import { BotonSalir, Markdown, Punto, QR, Reloj, useUrlSala } from "./comunes";
import { AmbienteSonoro } from "./AmbienteSonoro";
import { ModoAutor } from "./ModoAutor";
import { BotonEscuchar, lecturaDe, ReproductorLectura } from "./Narrador";
import { Documento, iconoPrueba } from "./Documento";
import { Avisos } from "./Avisos";
import { FichaSecreta } from "./FichaSecreta";
import { Interrogatorio } from "./Interrogatorio";
import { Voces } from "./Voces";
import { Corcho, LineaDeTiempo } from "./Pizarra";
import { TarjetaMinijuego } from "./minijuegos/Minijuego";
import { Lobby } from "./Lobby";
import { Escena } from "./Escena";
import { Resultado } from "./Resultado";

type Sala = ReturnType<typeof useSala>;

/** Código, QR y tele a mano con la partida empezada, para sumar gente o una pantalla. */
function Sumar({ codigo }: { codigo: string }) {
  const url = useUrlSala(codigo);
  return (
    <details className="relative">
      <summary className="cursor-pointer list-none hover:text-acento">➕ Sumar</summary>
      <div className="absolute right-0 z-30 mt-2 w-64 rounded-2xl border border-borde bg-panel p-4 text-center shadow-xl">
        <p className="text-xs text-suave">Código de la sala</p>
        <p className="font-mono text-3xl font-bold tracking-[0.3em] text-texto">{codigo}</p>
        <div className="mt-3 flex justify-center">{url ? <QR url={url} tamano={140} /> : <div className="h-[140px]" />}</div>
        <button onClick={() => window.open(`/sala/${codigo}?pantalla`, "_blank")} className="mt-3 w-full rounded-xl border border-borde bg-panel-2 py-2 text-sm font-medium text-texto">
          📺 Abrir la pantalla compartida
        </button>
      </div>
    </details>
  );
}
/** Escuchar en voz alta: acá o, si hay tele, en la tele para todos (se elige en el momento). */
function Escuchar({ que, sala, vista, chico }: { que: string; sala: Sala; vista: VistaPartida; chico?: boolean }) {
  const hayTele = vista.conexiones.some((c) => c.tipo === "pantalla");
  return <BotonEscuchar chico={chico} lectura={() => lecturaDe(que, vista)} enTele={hayTele ? () => void sala.accion({ tipo: "narrar", que }) : undefined} />;
}

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
  // pruebas que el jugador ya vio con la pestaña Expediente abierta (para el contador)
  const [pruebasVistas, setPruebasVistas] = useState<string[]>([]);
  if (pestana === "expediente" && vista.pruebas.some((p) => !pruebasVistas.includes(p.id))) {
    setPruebasVistas(vista.pruebas.map((p) => p.id));
  }
  const sinVer = vista.pruebas.filter((p) => !pruebasVistas.includes(p.id)).length;

  if (vista.fase === "lobby") {
    return (
      <>
        <Lobby vista={vista} onIniciar={() => sala.accion({ tipo: "iniciar" })} />
        <div className="pb-6 text-center">
          <BotonSalir onSalir={sala.salir} />
        </div>
        {sala.error && <p className="pb-6 text-center text-sm text-acento">{sala.error}</p>}
      </>
    );
  }
  if (vista.fase === "terminada") {
    return (
      <>
        <Resultado vista={vista} escuchar={<Escuchar que="resolucion" sala={sala} vista={vista} />} />
        <ReproductorLectura />
        <div className="pb-10 text-center">
          <BotonSalir onSalir={sala.salir} pedirConfirmacion={false} className="rounded-xl border border-borde px-4 py-2" />
        </div>
      </>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <Avisos vista={vista} />
      <ReproductorLectura />
      <ModoAutor vista={vista} token={sala.token} />
      {/* barra lateral en pantallas grandes, barra inferior en celulares */}
      <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-borde bg-panel/95 backdrop-blur lg:sticky lg:top-0 lg:h-dvh lg:w-56 lg:shrink-0 lg:flex-col lg:border-t-0 lg:border-r lg:bg-panel lg:p-3">
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
            <span className="relative text-lg lg:text-base">
              {p.icono}
              {p.id === "expediente" && sinVer > 0 && pestana !== "expediente" && (
                <span className="absolute -top-1.5 -right-2.5 min-w-4 rounded-full bg-acento px-1 text-center text-[10px] leading-4 font-bold text-acento-texto">{sinVer}</span>
              )}
            </span>
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
            {vista.fichaTraidor && <FichaSecreta ficha={vista.fichaTraidor} />}
            {vista.recursosRestantes !== null && <span title="Horas de investigación">🕰 {vista.recursosRestantes} h</span>}
            <Reloj iniciada={vista.iniciada} limiteMin={vista.config.temporizadorMin} />
            <Voces vista={vista} />
            <AmbienteSonoro vista={vista} />
            <Sumar codigo={vista.codigo} />
            <BotonSalir onSalir={sala.salir} />
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
          {pestana === "pizarra" && <Pizarra sala={sala} vista={vista} />}
          {pestana === "notas" && <Notas sala={sala} vista={vista} />}
          {pestana === "resolver" && <Resolver sala={sala} vista={vista} />}
        </main>
      </div>
    </div>
  );
}

function Expediente({ sala, vista }: { sala: Sala; vista: VistaPartida }) {
  const [abierta, setAbierta] = useState<string | null>(null);
  // pruebas que este jugador ya abrió (marca con ✓ los puntos de la escena)
  const [examinadas, setExaminadas] = useState<string[]>([]);
  const [codigos, setCodigos] = useState<Record<string, string>>({});
  // intentos enviados desde este dispositivo; si el candado sigue cerrado, el último falló
  const [fallidos, setFallidos] = useState<Record<string, number>>({});
  const doc = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (abierta) doc.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [abierta]);
  return (
    <div className="space-y-6">
      <details className="papel rounded-sm px-5 py-4" open={vista.sobres.filter((s) => s.abierto).length === 1}>
        <summary className="cursor-pointer text-lg">📜 Introducción al caso</summary>
        <div className="mt-2 flex justify-end">
          <Escuchar que="introduccion" sala={sala} vista={vista} chico />
        </div>
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
            </div>
            {!s.abierto && (
              <button
                disabled={!s.sePuedeAbrir}
                onClick={() => sala.accion({ tipo: "abrirSobre", sobre: s.id })}
                className="sobre flex h-28 w-full max-w-sm items-end justify-between px-4 pb-3 text-left font-doc"
              >
                <span className="relative text-sm">{s.titulo.split(":")[0]}</span>
                <span className="relative rounded bg-acento px-2 py-1 font-ui text-xs font-semibold text-acento-texto">
                  {s.sePuedeAbrir ? "Abrir sobre" : "🔒 Cerrado"}
                </span>
              </button>
            )}
            {s.abierto && s.escena && (
              <Escena
                escena={s.escena}
                abierta={abierta}
                vistas={examinadas}
                onAbrir={(id) => {
                  setAbierta(id);
                  setExaminadas((v) => (v.includes(id) ? v : [...v, id]));
                }}
              />
            )}
            {s.abierto && (
              <div className="grid gap-2 sm:grid-cols-2">
                {pruebas.map((p, i) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setAbierta(abierta === p.id ? null : p.id);
                      setExaminadas((v) => (v.includes(p.id) ? v : [...v, p.id]));
                    }}
                    style={{ animationDelay: `${Math.min(i, 10) * 60}ms` }}
                    className={`papel-entrar rounded-xl border px-4 py-3 text-left text-sm transition ${abierta === p.id ? "border-acento bg-panel-2" : "border-borde bg-panel hover:border-suave"}`}
                  >
                    {iconoPrueba(p.tipo)} {p.titulo}
                  </button>
                ))}
              </div>
            )}
            {s.abierto && vista.minijuegos.some((m) => m.sobre === s.id) && (
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {vista.minijuegos
                  .filter((m) => m.sobre === s.id)
                  .map((m) => (
                    <TarjetaMinijuego key={m.id} datos={m} sala={sala} vista={vista} />
                  ))}
              </div>
            )}
            {pruebas.some((p) => p.id === abierta) && (
              <div ref={doc} className="mt-4 scroll-mt-16">
                <Documento prueba={pruebas.find((p) => p.id === abierta)!} accion={<Escuchar que={`prueba:${abierta}`} sala={sala} vista={vista} chico />} />
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
              <div key={`${c.id}-${fallidos[c.id] ?? 0}`} className={`rounded-xl border border-borde bg-panel p-4 ${!c.abierto && (fallidos[c.id] ?? 0) > 0 ? "temblar" : ""}`}>
                <p className="font-semibold">
                  {c.abierto ? <span className="abrir-candado">🔓</span> : "🔒"} {c.titulo}
                </p>
                <p className="text-sm text-suave">{c.descripcion}</p>
                {!c.abierto && (
                  <form
                    className="mt-3 flex gap-2"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const ok = await sala.accion({ tipo: "probarCandado", candado: c.id, codigo: codigos[c.id] ?? "" });
                      setCodigos((x) => ({ ...x, [c.id]: "" }));
                      if (ok) setFallidos((x) => ({ ...x, [c.id]: (x[c.id] ?? 0) + 1 }));
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
                {!c.abierto && (fallidos[c.id] ?? 0) > 0 && (
                  <p key={fallidos[c.id]} className="aparecer mt-2 text-sm text-acento">
                    ✕ Código incorrecto{(fallidos[c.id] ?? 0) > 1 ? ` (${fallidos[c.id]} intentos)` : ""}
                  </p>
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

function Pizarra({ sala, vista }: { sala: Sala; vista: VistaPartida }) {
  const [vistaPizarra, setVistaPizarra] = useState<"corcho" | "linea" | "bitacora">("corcho");
  return (
    <div>
      <div className="mb-4 flex rounded-lg border border-borde p-0.5 text-sm">
        {(
          [
            ["corcho", "📌 Corcho"],
            ["linea", "🕰️ Línea de tiempo"],
            ["bitacora", "📜 Descubrimientos"],
          ] as const
        ).map(([id, nombre]) => (
          <button key={id} onClick={() => setVistaPizarra(id)} className={`flex-1 rounded-md px-3 py-1.5 ${vistaPizarra === id ? "bg-acento text-acento-texto" : "text-suave"}`}>
            {nombre}
          </button>
        ))}
      </div>
      {vistaPizarra === "corcho" && <Corcho vista={vista} enviar={sala.accion} />}
      {vistaPizarra === "linea" && <LineaDeTiempo vista={vista} enviar={sala.accion} />}
      {vistaPizarra === "bitacora" && <Bitacora vista={vista} />}
    </div>
  );
}

function Bitacora({ vista }: { vista: VistaPartida }) {
  return (
    <div className="grid gap-6 md:grid-cols-[1.4fr_1fr]">
      <section>
        <h2 className="mb-3 font-titulo text-xl">Descubrimientos</h2>
        {vista.descubrimientos.length === 0 && <p className="text-sm text-suave">Todavía nada. Lo que confiesen o cuenten los interrogados aparece acá.</p>}
        <div className="grid gap-3 sm:grid-cols-2">
          {vista.descubrimientos.map((h, i) => (
            <div key={h.id} className="papel chincheta rounded-sm p-3 text-sm" style={{ "--r": `${((i * 37) % 5) - 2}deg` } as React.CSSProperties}>
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
  const yo = vista.yo?.id ?? "";
  const miVoto = vista.votos[yo];
  const [respuestas, setRespuestas] = useState<Record<string, string>>(miVoto ?? {});
  const jugadores = vista.conexiones.filter((c) => c.tipo === "jugador");
  const votaron = jugadores.filter((j) => vista.votos[j.id]);
  const completas = vista.preguntas.every((p) => respuestas[p.id]) && (!vista.hayTraidor || !!respuestas.traidor);
  const cambiado = JSON.stringify(respuestas) !== JSON.stringify(miVoto ?? {});
  const puedeCerrar = vista.yo?.anfitrion && votaron.length >= Math.ceil(jugadores.length / 2);
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-borde bg-panel p-4">
        <p className="text-sm text-suave">
          Cada uno vota su acusación. Cuando votan todos, se presenta la respuesta más votada de cada pregunta (si hay empate, desempata el anfitrión).
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {jugadores.map((j) => (
            <span key={j.id} className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-sm ${vista.votos[j.id] ? "bg-panel-2" : "border border-dashed border-borde text-suave"}`}>
              <Punto color={j.color} /> {j.apodo} {vista.votos[j.id] ? "✓" : "…"}
            </span>
          ))}
        </div>
      </div>
      {vista.preguntas.map((p) => (
        <fieldset key={p.id} className="rounded-xl border border-borde bg-panel p-4">
          <legend className="px-1 font-semibold">{p.texto}</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {(p.tipo === "personaje"
              ? [...vista.personajes.filter((x) => x.disponible).map((x) => ({ id: x.id, texto: x.nombre })), ...(p.permiteNadie ? [{ id: "nadie", texto: "Nadie" }] : [])]
              : (p.opciones ?? [])).map((o) => {
              const quienes = jugadores.filter((j) => vista.votos[j.id]?.[p.id] === o.id);
              return (
                <label key={o.id} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${respuestas[p.id] === o.id ? "border-acento bg-panel-2" : "border-borde"}`}>
                  <input type="radio" name={p.id} className="accent-[var(--acento)]" checked={respuestas[p.id] === o.id} onChange={() => setRespuestas((r) => ({ ...r, [p.id]: o.id }))} />
                  <span className="flex-1">{o.texto}</span>
                  <span className="flex gap-0.5" title={quienes.map((q) => q.apodo).join(", ")}>
                    {quienes.map((q) => (
                      <Punto key={q.id} color={q.color} />
                    ))}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
      ))}
      {vista.hayTraidor && (
        <fieldset className="rounded-xl border border-acento/60 bg-panel p-4">
          <legend className="px-1 font-semibold">🎭 ¿Quién es el traidor?</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {jugadores
              .filter((j) => j.id !== yo)
              .map((j) => {
                const quienes = jugadores.filter((x) => vista.votos[x.id]?.traidor === j.id);
                return (
                  <label key={j.id} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${respuestas.traidor === j.id ? "border-acento bg-panel-2" : "border-borde"}`}>
                    <input type="radio" name="traidor" className="accent-[var(--acento)]" checked={respuestas.traidor === j.id} onChange={() => setRespuestas((r) => ({ ...r, traidor: j.id }))} />
                    <Punto color={j.color} />
                    <span className="flex-1">{j.apodo}</span>
                    <span className="flex gap-0.5">
                      {quienes.map((q) => (
                        <Punto key={q.id} color={q.color} />
                      ))}
                    </span>
                  </label>
                );
              })}
          </div>
        </fieldset>
      )}
      <div className="sticky bottom-20 flex flex-col gap-2 rounded-xl border border-borde bg-bg/95 p-3 backdrop-blur lg:bottom-4">
        <div className="flex gap-2">
          <button
            disabled={!completas || (!!miVoto && !cambiado)}
            onClick={() => sala.accion({ tipo: "votar", respuestas })}
            className="flex-1 rounded-xl bg-acento py-3 font-semibold text-acento-texto disabled:opacity-40"
          >
            {miVoto ? (cambiado ? "Cambiar mi voto" : "Ya votaste ✓") : completas ? "Votar esta acusación" : "Respondé todas las preguntas"}
          </button>
          {miVoto && (
            <button onClick={() => sala.accion({ tipo: "retirarVoto" })} className="rounded-xl border border-borde px-4 text-sm">
              Retirar
            </button>
          )}
        </div>
        {vista.yo?.anfitrion && (
          <button
            disabled={!puedeCerrar}
            onClick={() => sala.accion({ tipo: "cerrarVotacion" })}
            className="rounded-xl border border-acento py-2 text-sm text-acento disabled:opacity-40"
          >
            Cerrar votación ahora ({votaron.length}/{jugadores.length} votos)
          </button>
        )}
      </div>
    </div>
  );
}
