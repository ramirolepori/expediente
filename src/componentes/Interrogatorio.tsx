"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { useSala } from "@/cliente/useSala";
import type { VistaPartida } from "@/motor/vista";
import { Maquina, Punto } from "./comunes";

type Sala = ReturnType<typeof useSala>;

/* Reconocimiento de voz del navegador (Chrome, Edge, Safari). En Firefox no existe y se oculta el botón. */
type Reconocimiento = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
};
function crearReconocimiento(): Reconocimiento | null {
  const w = window as unknown as { SpeechRecognition?: new () => Reconocimiento; webkitSpeechRecognition?: new () => Reconocimiento };
  const C = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  if (!C) return null;
  const r = new C();
  r.lang = "es-AR";
  r.interimResults = true;
  r.continuous = true;
  return r;
}

export function Interrogatorio({ sala, vista }: { sala: Sala; vista: VistaPartida }) {
  const [elegido, setElegido] = useState<string | null>(null);
  const personaje = vista.personajes.find((p) => p.id === elegido);

  if (!personaje) {
    return (
      <div>
        <p className="mb-4 text-sm text-suave">
          Elegí a quién interrogar. Pueden mostrarle pruebas del expediente para confrontarlo.
          {vista.recursosRestantes !== null && " Citar a alguien nuevo cuesta una hora de investigación."}
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {vista.personajes.map((p) => (
            <button
              key={p.id}
              disabled={!p.disponible}
              onClick={() => setElegido(p.id)}
              className="rounded-xl border border-borde bg-panel p-4 text-left transition hover:border-acento disabled:cursor-not-allowed disabled:opacity-40"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="font-titulo text-lg">{p.disponible ? p.nombre : "???"}</p>
                {p.visitado && <span className="text-xs text-suave">ya citado</span>}
              </div>
              <p className="text-sm text-acento">{p.disponible ? p.rol : "Todavía no hay motivos para citar a esta persona"}</p>
              {p.disponible && <p className="mt-1 line-clamp-2 text-xs text-suave">{p.descripcion}</p>}
            </button>
          ))}
        </div>
      </div>
    );
  }
  return <Chat sala={sala} vista={vista} personajeId={personaje.id} onVolver={() => setElegido(null)} />;
}

function Chat({ sala, vista, personajeId, onVolver }: { sala: Sala; vista: VistaPartida; personajeId: string; onVolver: () => void }) {
  const personaje = vista.personajes.find((p) => p.id === personajeId)!;
  const mensajes = vista.interrogatorios[personajeId] ?? [];
  // los mensajes que ya estaban al abrir el chat no se animan
  const [previos] = useState(() => new Set(mensajes.map((m) => m.id)));
  const [texto, setTexto] = useState("");
  const [prueba, setPrueba] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [escuchando, setEscuchando] = useState(false);
  const hayReconocimiento = useSyncExternalStore(
    () => () => {},
    () => crearReconocimiento() !== null,
    () => false,
  );
  const vozDisponible = vista.config.voz && hayReconocimiento;
  const rec = useRef<Reconocimiento | null>(null);
  const fin = useRef<HTMLDivElement>(null);
  const conexion = (id?: string) => vista.conexiones.find((c) => c.id === id);
  const ultimo = mensajes.at(-1);
  const esperando = enviando || ultimo?.de === "jugador";

  useEffect(() => {
    fin.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [mensajes.length]);

  async function enviar(t = texto) {
    if ((!t.trim() && !prueba) || enviando) return;
    setEnviando(true);
    const ok = await sala.interrogar(personajeId, t, prueba || undefined);
    setEnviando(false);
    if (ok) {
      setTexto("");
      setPrueba("");
    }
  }

  function empezarAHablar() {
    const r = crearReconocimiento();
    if (!r) return;
    let acumulado = "";
    r.onresult = (e) => {
      acumulado = Array.from(e.results).map((x) => x[0].transcript).join(" ");
      setTexto(acumulado);
    };
    r.onend = () => {
      setEscuchando(false);
      if (acumulado.trim()) enviar(acumulado);
    };
    rec.current = r;
    setEscuchando(true);
    r.start();
  }

  return (
    <div className="flex h-[calc(100dvh-9.5rem)] flex-col lg:h-[calc(100dvh-5rem)]">
      <div className="mb-3 flex items-center gap-3">
        <button onClick={onVolver} className="rounded-lg border border-borde px-3 py-1.5 text-sm">
          ← Volver
        </button>
        <div className="min-w-0">
          <p className="truncate font-titulo text-lg leading-tight">{personaje.nombre}</p>
          <p className="truncate text-xs text-suave">{personaje.rol}</p>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto rounded-xl border border-borde bg-panel p-3">
        {mensajes.length === 0 && <p className="py-8 text-center text-sm text-suave">{personaje.nombre} espera sentado/a del otro lado de la mesa.</p>}
        {mensajes.map((m) => {
          if (m.de === "sistema") return <p key={m.id} className="text-center text-xs text-acento">{m.texto}</p>;
          const delPersonaje = m.de === "personaje";
          const c = conexion(m.autor);
          return (
            <div key={m.id} className={`aparecer flex ${delPersonaje ? "justify-start" : "justify-end"}`}>
              <div className={`max-w-[85%] rounded-2xl px-3.5 py-2 ${delPersonaje ? "papel rounded-bl-sm" : "rounded-br-sm bg-panel-2"}`}>
                {!delPersonaje && (
                  <p className="mb-0.5 flex items-center gap-1.5 text-[11px] text-suave">
                    <Punto color={c?.color ?? "#777"} /> {c?.apodo}
                  </p>
                )}
                {m.prueba && <p className="mb-1 text-xs text-acento">📎 Muestra: {vista.pruebas.find((p) => p.id === m.prueba)?.titulo}</p>}
                <p className="whitespace-pre-wrap text-[0.95rem]">{delPersonaje ? <Maquina texto={m.texto} animar={!previos.has(m.id)} /> : m.texto}</p>
              </div>
            </div>
          );
        })}
        {esperando && <p className="text-sm italic text-suave">{personaje.nombre} piensa la respuesta…</p>}
        <div ref={fin} />
      </div>

      <form
        className="mt-3 space-y-2"
        onSubmit={(e) => {
          e.preventDefault();
          enviar();
        }}
      >
        <select value={prueba} onChange={(e) => setPrueba(e.target.value)} className="w-full rounded-lg border border-borde bg-panel px-3 py-2 text-sm">
          <option value="">📎 Mostrar una prueba (opcional)</option>
          {vista.pruebas.map((p) => (
            <option key={p.id} value={p.id}>
              {p.titulo}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          {vozDisponible && (
            <button
              type="button"
              onPointerDown={empezarAHablar}
              onPointerUp={() => rec.current?.stop()}
              onPointerLeave={() => escuchando && rec.current?.stop()}
              className={`shrink-0 select-none rounded-xl px-4 text-xl ${escuchando ? "bg-acento text-acento-texto" : "border border-borde bg-panel"}`}
              title="Mantené apretado para hablar"
              aria-label="Mantené apretado para hablar"
            >
              🎙️
            </button>
          )}
          <input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder={escuchando ? "Escuchando…" : "Preguntale algo…"}
            className="min-w-0 flex-1 rounded-xl border border-borde bg-panel px-4 py-3 outline-none focus:border-acento"
          />
          <button disabled={esperando || (!texto.trim() && !prueba)} className="shrink-0 rounded-xl bg-acento px-5 font-semibold text-acento-texto disabled:opacity-40">
            Enviar
          </button>
        </div>
      </form>
    </div>
  );
}
