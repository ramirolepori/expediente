"use client";

import Link from "next/link";
import { useState } from "react";
import { useSala } from "@/cliente/useSala";
import type { TipoConexion } from "@/motor/tipos";
import { PanelJugador } from "./PanelJugador";
import { PantallaCompartida } from "./PantallaCompartida";

export function Sala({ codigo, tipo }: { codigo: string; tipo: TipoConexion }) {
  const sala = useSala(codigo, tipo);
  const { vista } = sala;

  if (!sala.listo) return null;
  if (!sala.token) return <Unirse codigo={codigo} tipo={tipo} onUnirse={sala.unirse} error={sala.error} />;
  if (!vista) return <p className="p-8 text-center text-suave">Conectando…</p>;

  const ambientacion = vista.fase === "lobby" ? undefined : vista.caso.ambientacion;
  return (
    <div data-ambientacion={ambientacion} className="ambiente flex min-h-dvh flex-col">
      {!sala.conectado && <div className="bg-acento py-1 text-center text-xs text-acento-texto">Reconectando…</div>}
      {tipo === "pantalla" ? <PantallaCompartida vista={vista} /> : <PanelJugador sala={sala} vista={vista} />}
    </div>
  );
}

function Unirse({ codigo, tipo, onUnirse, error }: { codigo: string; tipo: TipoConexion; onUnirse: (a: string) => Promise<void>; error: string | null }) {
  const [apodo, setApodo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const enviar = async (nombre: string) => {
    setEnviando(true);
    await onUnirse(nombre);
    setEnviando(false);
  };
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4">
      <Link href="/" className="mb-8 text-xs font-semibold uppercase tracking-[0.3em] text-acento">
        Expediente
      </Link>
      <p className="text-suave">Sala</p>
      <p className="font-mono text-5xl font-bold tracking-[0.3em]">{codigo}</p>
      {tipo === "pantalla" ? (
        <>
          <p className="mt-6 text-suave">Esta pestaña va a mostrar el tablero que ven todos. No cuenta como jugador.</p>
          <button onClick={() => enviar("Pantalla")} disabled={enviando} className="mt-6 rounded-xl bg-acento py-3 font-semibold text-acento-texto">
            Conectar como pantalla compartida
          </button>
        </>
      ) : (
        <form
          className="mt-6 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            enviar(apodo);
          }}
        >
          <label className="block">
            <span className="mb-1 block font-medium">Tu apodo</span>
            <input
              autoFocus
              value={apodo}
              onChange={(e) => setApodo(e.target.value.slice(0, 24))}
              className="w-full rounded-xl border border-borde bg-panel px-4 py-3 text-lg outline-none focus:border-acento"
              placeholder="Ej.: Ramiro"
            />
          </label>
          <button disabled={!apodo.trim() || enviando} className="w-full rounded-xl bg-acento py-3 font-semibold text-acento-texto disabled:opacity-40">
            Entrar a la investigación
          </button>
          <p className="text-center text-sm text-suave">
            ¿Querés usar este dispositivo como tele?{" "}
            <Link className="underline" href={`/sala/${codigo}?pantalla`}>
              Conectalo como pantalla compartida
            </Link>
          </p>
        </form>
      )}
      {error && <p className="mt-4 text-sm text-acento">{error}</p>}
    </main>
  );
}
