"use client";

import { useEffect, useState } from "react";
import type { VistaPartida } from "@/motor/vista";
import { BotonSalir, Maquina, Punto, QR, Reloj, useAhora, useUrlSala } from "./comunes";
import { Corcho } from "./Pizarra";
import { Avisos } from "./Avisos";
import { Resultado } from "./Resultado";
import { Voces } from "./Voces";
import { AmbienteSonoro } from "./AmbienteSonoro";
import { NarracionEnTele, ReproductorLectura } from "./Narrador";
import { Documento, iconoPrueba } from "./Documento";
import { Personaje } from "./personaje/Personaje";

const DESTACAR_MS = 25_000;

/** Lo que se ve en la tele: nada privado, todo grande y legible a distancia. */
export function PantallaCompartida({ vista, token, onSalir }: { vista: VistaPartida; token: string; onSalir: () => Promise<void> }) {
  const salir = <BotonSalir onSalir={onSalir} className="fixed top-3 right-4 z-40 opacity-40 hover:opacity-100" />;
  const jugadores = vista.conexiones.filter((c) => c.tipo === "jugador");
  const url = useUrlSala(vista.codigo);
  const ahora = useAhora(5000);
  // lo que ya estaba cuando se abrió la tele no se anima
  const [previos] = useState(() => new Set(Object.values(vista.interrogatorios).flat().map((m) => m.id)));
  // pruebas en el orden en que aparecieron, la más nueva primero; las que ya estaban van en orden inverso del caso
  const [conocidas, setConocidas] = useState(() => vista.pruebas.map((p) => p.id).reverse());
  // pruebas recién desbloqueadas y cuántos mensajes de interrogatorio había en ese momento
  const [destacadas, setDestacadas] = useState<{ ids: string[]; mensajes: number }>({ ids: [], mensajes: 0 });
  const mensajes = Object.values(vista.interrogatorios).flat().length;
  const [mensajesAntes, setMensajesAntes] = useState(mensajes);
  const [ultimas, setUltimas] = useState<string[]>([]);
  const nuevas = vista.pruebas.filter((p) => !conocidas.includes(p.id)).map((p) => p.id);
  if (nuevas.length) {
    setConocidas([...nuevas.toReversed(), ...conocidas]);
    if (conocidas.length) setUltimas(nuevas);
    // no se destacan las del primer sobre (llegan con el arranque y taparían la introducción)
    // ni las que llegan junto con una respuesta (se lee la respuesta; la prueba queda resaltada en la lista)
    if (conocidas.length && mensajes === mensajesAntes) setDestacadas({ ids: nuevas, mensajes });
  }
  if (mensajes !== mensajesAntes) setMensajesAntes(mensajes);
  // ocupan la pantalla un rato, o hasta que alguien pregunte algo
  useEffect(() => {
    if (!destacadas.ids.length) return;
    const t = setTimeout(() => setDestacadas((d) => ({ ...d, ids: [] })), DESTACAR_MS);
    return () => clearTimeout(t);
  }, [destacadas]);

  if (vista.fase === "lobby") {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-8 p-8 text-center">
        {salir}
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
  if (vista.fase === "terminada") {
    return (
      <>
        {salir}
        <Resultado vista={vista} grande />
        <NarracionEnTele vista={vista} />
        <ReproductorLectura grande />
      </>
    );
  }

  // el interrogatorio más reciente es el protagonista de la pantalla
  const activo = Object.entries(vista.interrogatorios)
    .map(([id, ms]) => ({ id, ultimo: ms.at(-1)?.hora ?? 0, ms }))
    .sort((a, b) => b.ultimo - a.ultimo)[0];
  // si nadie interroga hace más de dos minutos, la tele muestra el corcho del equipo
  const interrogando = !!activo && ahora - activo.ultimo < 120_000;
  const personaje = interrogando ? vista.personajes.find((p) => p.id === activo.id) : undefined;
  const autor = (id?: string) => vista.conexiones.find((c) => c.id === id);
  const prueba = (id: string) => vista.pruebas.find((p) => p.id === id);
  const pruebasDestacadas = mensajes === destacadas.mensajes ? destacadas.ids.flatMap((id) => prueba(id) ?? []) : [];
  const recientes = conocidas.slice(0, 6).flatMap((id) => prueba(id) ?? []);
  const capitulo = vista.sobres.findLast((s) => s.abierto);
  const resultadoCapitulo = capitulo?.preguntaCapitulo?.resultado;

  return (
    <main className="grid min-h-dvh grid-rows-[auto_1fr] gap-6 p-6 lg:p-10">
      <NarracionEnTele vista={vista} />
      <ReproductorLectura grande />
      <Avisos vista={vista} grande />
      {salir}
      <header className="flex items-end justify-between gap-6">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-acento">Sala {vista.codigo}</p>
          <h1 className="font-titulo text-4xl lg:text-5xl">{vista.caso.meta.titulo}</h1>
          {vista.hayTraidor && <p className="mt-1 text-lg text-acento">🎭 Hay un traidor entre ustedes</p>}
        </div>
        <div className="flex items-center gap-8 text-suave">
          {vista.recursosRestantes !== null && <span className="text-3xl">🕰 {vista.recursosRestantes} h</span>}
          <Reloj iniciada={vista.iniciada} limiteMin={vista.config.temporizadorMin} grande />
          <Voces vista={vista} token={token} grande />
          <AmbienteSonoro vista={vista} grande />
        </div>
      </header>

      <div className="grid min-h-0 gap-6 lg:grid-cols-[1.5fr_1fr]">
        <section className="flex min-h-0 flex-col rounded-2xl border border-borde bg-panel p-6">
          {pruebasDestacadas.length ? (
            <>
              <p className="text-sm uppercase tracking-widest text-acento">{pruebasDestacadas.length === 1 ? "Nueva prueba en el expediente" : "Nuevas pruebas en el expediente"}</p>
              <div className={`mt-4 grid min-h-0 flex-1 gap-5 overflow-hidden ${pruebasDestacadas.length > 1 ? "md:grid-cols-2" : ""}`}>
                {pruebasDestacadas.slice(0, 4).map((p) => (
                  <div key={p.id} className={`min-h-0 overflow-hidden ${pruebasDestacadas.length <= 2 ? "[zoom:1.3]" : ""}`}>
                    <Documento prueba={p} />
                  </div>
                ))}
              </div>
              {pruebasDestacadas.length > 4 && <p className="mt-3 text-xl text-suave">Y {pruebasDestacadas.length - 4} más en el panel de cada uno.</p>}
            </>
          ) : personaje ? (
            <>
              <p className="text-sm uppercase tracking-widest text-suave">Interrogatorio en curso</p>
              <h2 className="font-titulo text-3xl">{personaje.nombre}</h2>
              <p className="text-acento">{personaje.rol}</p>
              <div className="mt-4 flex min-h-0 flex-1 gap-6">
                {personaje.apariencia && (
                  <div className="w-[min(18rem,35%)] shrink-0 self-start overflow-hidden rounded-xl border border-borde">
                    <Personaje id={personaje.id} apariencia={personaje.apariencia} nombre={personaje.nombre} mensajes={activo.ms} previos={previos} />
                  </div>
                )}
                <div className="min-w-0 flex-1 space-y-4 overflow-hidden">
                  {activo.ms.slice(-6).map((m) =>
                    m.de === "personaje" ? (
                      <p key={m.id} className="papel aparecer rounded-sm p-4 text-2xl leading-snug">
                        <Maquina texto={m.texto} animar={!previos.has(m.id)} />
                      </p>
                    ) : m.de === "jugador" ? (
                      <p key={m.id} className="aparecer flex items-center gap-2 text-xl text-suave">
                        <Punto color={autor(m.autor)?.color ?? "#777"} /> {autor(m.autor)?.apodo}: {m.texto}
                      </p>
                    ) : null,
                  )}
                </div>
              </div>
            </>
          ) : vista.pizarra.items.length > 0 ? (
            <>
              <p className="mb-3 text-sm uppercase tracking-widest text-suave">Pizarra del equipo</p>
              <div className="min-h-0 flex-1">
                <Corcho vista={vista} soloLectura alto="100%" />
              </div>
            </>
          ) : (
            <div className="m-auto max-w-xl text-center text-2xl text-suave">Cuando alguien interrogue a un sospechoso, la charla aparece acá. Si arman la pizarra, también se ve acá.</div>
          )}
        </section>

        <aside className="flex min-h-0 min-w-0 flex-col gap-6">
          {capitulo && (capitulo.resumen || resultadoCapitulo) && (
            <section aria-labelledby="capitulo-en-tele" className="rounded-2xl border border-borde bg-panel p-5">
              <h2 id="capitulo-en-tele" className="font-titulo text-2xl lg:text-3xl">{capitulo.titulo}</h2>
              {capitulo.resumen && (
                <div className="mt-4">
                  <h3 className="mb-1 text-sm uppercase tracking-widest text-suave">Resumen del capítulo</h3>
                  <p className="whitespace-pre-line break-words text-xl leading-snug lg:text-2xl">{capitulo.resumen}</p>
                </div>
              )}
              <div role="status">
                {resultadoCapitulo && (
                  <>
                    <h3 className="mt-4 mb-1 text-sm uppercase tracking-widest text-suave">Cierre del capítulo</h3>
                    <p className="whitespace-pre-line break-words text-xl leading-snug lg:text-2xl">{resultadoCapitulo.cierre}</p>
                    <p className="mt-2 whitespace-pre-line break-words text-xl leading-snug text-acento lg:text-2xl">{resultadoCapitulo.gancho}</p>
                  </>
                )}
              </div>
            </section>
          )}
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
          <section className="rounded-2xl border border-borde bg-panel p-5">
            <h2 className="mb-3 text-lg font-semibold">Expediente ({vista.pruebas.length} pruebas)</h2>
            <ul className="space-y-1.5 text-lg">
              {recientes.map((p) => (
                <li key={p.id} className={`aparecer truncate ${ultimas.includes(p.id) ? "text-acento" : ""}`}>
                  {iconoPrueba(p.tipo)} {p.titulo}
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
