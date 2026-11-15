"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAutor, type Proveedor } from "@/cliente/sesion";
import type { Autor } from "@/servidor/autores";
import { Validador } from "./Validador";

const NOMBRE_PROVEEDOR: Record<Proveedor, string> = { google: "Google", github: "GitHub" };
const NOMBRE_ROL = { admin: "Administrador", moderador: "Moderador", autor: "Autor" } as const;
const ESTILO_ROL = {
  admin: "bg-acento text-acento-texto",
  moderador: "bg-ok text-white",
  autor: "bg-panel-2 text-texto border border-borde",
} as const;

const PASOS = [
  { titulo: "Armalo con tu IA", texto: "Bajás el kit con la guía, el contrato y un caso de ejemplo, y lo trabajás con Claude, ChatGPT o la que uses." },
  { titulo: "Subilo y validalo", texto: "El validador revisa que se pueda resolver, que no haya spoilers y que todo esté en su lugar." },
  { titulo: "Probalo con amigos", texto: "Lo jugás en una sala privada por link antes de mostrarlo." },
  { titulo: "Lo sumamos al catálogo", texto: "Un moderador lo revisa y, si está listo, lo publica." },
];

export function PanelAutores() {
  const { config, autor, cargando, error, entrar, entrarFalso, salir, pedir } = useAutor();

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:py-14">
      <Link href="/" className="text-sm text-suave hover:text-acento">
        ← Volver al inicio
      </Link>

      <header className="mt-6">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-acento">Expediente · Autores</p>
        <h1 className="mt-2 text-3xl font-bold sm:text-5xl">Creá un caso para Expediente</h1>
        <p className="mt-3 max-w-2xl text-suave">
          Escribís la historia con tu propia IA siguiendo nuestro kit. La plataforma la valida, la probás con amigos y, cuando está lista, la sumamos al
          catálogo.
        </p>
      </header>

      {cargando ? (
        <div className="mt-10 h-40 animate-pulse rounded-2xl border border-borde bg-panel" aria-label="Cargando" />
      ) : autor ? (
        <div className="mt-10 space-y-6">
          <Perfil autor={autor} salir={salir} />
          <Validador pedir={pedir} />
          <MisCasos />
          {autor.rol === "admin" && <Moderadores pedir={pedir} />}
        </div>
      ) : (
        <div className="mt-10 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <ComoFunciona />
          <Login config={config} entrar={entrar} entrarFalso={entrarFalso} error={error} />
        </div>
      )}
      {autor && error && <p className="mt-3 text-sm text-acento">{error}</p>}
    </main>
  );
}

function ComoFunciona() {
  return (
    <section>
      <h2 className="text-xl font-semibold">Cómo funciona</h2>
      <ol className="mt-4 space-y-3">
        {PASOS.map((p, i) => (
          <li key={p.titulo} className="flex gap-4 rounded-2xl border border-borde bg-panel p-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-panel-2 font-mono text-sm font-bold text-acento">{i + 1}</span>
            <div>
              <p className="font-semibold">{p.titulo}</p>
              <p className="mt-0.5 text-sm text-suave">{p.texto}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Login({
  config,
  entrar,
  entrarFalso,
  error,
}: {
  config: ReturnType<typeof useAutor>["config"];
  entrar: (p: Proveedor) => void;
  entrarFalso: (email: string) => void;
  error: string | null;
}) {
  const [emailFalso, setEmailFalso] = useState("");
  const sinConfigurar = config && !config.falso && config.proveedores.length === 0;

  return (
    <section className="h-fit rounded-2xl border border-borde bg-panel p-6 lg:sticky lg:top-6">
      <h2 className="text-lg font-semibold">Entrá con tu cuenta</h2>
      <p className="mt-1 text-sm text-suave">Es solo para escribir casos. Para jugar no hace falta.</p>

      <div className="mt-5 space-y-2.5">
        {config?.proveedores.map((p) => (
          <button
            key={p}
            onClick={() => entrar(p)}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-borde bg-panel-2 px-4 py-3 font-semibold transition hover:border-acento"
          >
            <LogoProveedor proveedor={p} />
            Entrar con {NOMBRE_PROVEEDOR[p]}
          </button>
        ))}
      </div>

      {config?.falso && (
        <form
          className="mt-5 border-t border-dashed border-borde pt-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (emailFalso.trim()) entrarFalso(emailFalso);
          }}
        >
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-suave">Modo prueba</p>
          <div className="flex gap-2">
            <input
              value={emailFalso}
              onChange={(e) => setEmailFalso(e.target.value)}
              placeholder="mail@prueba.test"
              aria-label="Mail para el login de prueba"
              className="min-w-0 flex-1 rounded-xl border border-borde bg-panel-2 px-3 py-2 outline-none focus:border-acento"
            />
            <button className="rounded-xl bg-acento px-4 py-2 text-sm font-semibold text-acento-texto">Entrar (modo prueba)</button>
          </div>
        </form>
      )}

      {sinConfigurar && <p className="mt-4 text-sm text-suave">Las cuentas todavía no están configuradas.</p>}
      {error && <p className="mt-4 text-sm text-acento">{error}</p>}
      <p className="mt-5 text-xs text-suave">Solo guardamos tu nombre y tu mail, para saber quién escribió cada caso.</p>
    </section>
  );
}

function Perfil({ autor, salir }: { autor: Autor; salir: () => void }) {
  return (
    <section className="flex flex-wrap items-center gap-4 rounded-2xl border border-borde bg-panel p-5">
      <Iniciales texto={autor.nombre ?? autor.email} grande />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-lg font-semibold">Hola, {autor.nombre ?? autor.email.split("@")[0]}</p>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${ESTILO_ROL[autor.rol]}`}>{NOMBRE_ROL[autor.rol]}</span>
        </div>
        <p className="truncate text-sm text-suave">{autor.email}</p>
      </div>
      <button onClick={salir} className="rounded-xl border border-borde px-4 py-2 text-sm transition hover:border-acento">
        Salir
      </button>
    </section>
  );
}

function MisCasos() {
  return (
    <section className="rounded-2xl border border-borde bg-panel p-5">
      <h2 className="text-lg font-semibold">Mis casos</h2>
      <div className="mt-4 rounded-xl border border-dashed border-borde px-5 py-8 text-center">
        <p className="text-3xl" aria-hidden>
          🗂️
        </p>
        <p className="mt-2 font-medium">Todavía no tenés casos</p>
        <p className="mx-auto mt-1 max-w-md text-sm text-suave">Muy pronto vas a poder bajar el kit de autor y guardar tus casos acá para probarlos con amigos.</p>
      </div>
    </section>
  );
}

function Moderadores({ pedir }: { pedir: (url: string, init?: RequestInit) => Promise<Response> }) {
  const [lista, setLista] = useState<string[] | null>(null);
  const [nuevo, setNuevo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  async function llamar(init?: RequestInit) {
    setError(null);
    setOcupado(true);
    try {
      const r = await pedir("/api/autores/moderadores", init);
      const d = await r.json();
      if (r.ok) setLista(d.moderadores);
      else setError(d.error ?? "No se pudo");
      return r.ok;
    } finally {
      setOcupado(false);
    }
  }

  useEffect(() => {
    let vivo = true;
    pedir("/api/autores/moderadores")
      .then((r) => r.json())
      .then((d) => vivo && setLista(d.moderadores ?? []));
    return () => {
      vivo = false;
    };
  }, [pedir]);

  return (
    <section className="rounded-2xl border border-borde bg-panel p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold">Moderadores</h2>
        {lista && lista.length > 0 && <span className="text-sm text-suave">{lista.length}</span>}
      </div>
      <p className="mt-1 text-sm text-suave">Pueden aprobar casos para el catálogo. Los administradores se definen en la configuración del servidor.</p>

      <form
        className="mt-4 flex gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          if (nuevo.trim() && (await llamar({ method: "POST", body: JSON.stringify({ email: nuevo }) }))) setNuevo("");
        }}
      >
        <input
          type="email"
          value={nuevo}
          onChange={(e) => setNuevo(e.target.value)}
          placeholder="mail@ejemplo.com"
          aria-label="Mail del nuevo moderador"
          className="min-w-0 flex-1 rounded-xl border border-borde bg-panel-2 px-3 py-2 outline-none focus:border-acento"
        />
        <button disabled={ocupado || !nuevo.trim()} className="rounded-xl bg-acento px-4 py-2 text-sm font-semibold text-acento-texto disabled:opacity-40">
          Agregar
        </button>
      </form>
      {error && <p className="mt-2 text-sm text-acento">{error}</p>}

      <ul className="mt-4 divide-y divide-borde">
        {lista === null && <li className="py-3 text-sm text-suave">Cargando…</li>}
        {lista?.length === 0 && <li className="py-3 text-sm text-suave">Todavía no hay moderadores.</li>}
        {lista?.map((m) => (
          <li key={m} className="flex items-center gap-3 py-2.5">
            <Iniciales texto={m} />
            <span className="min-w-0 flex-1 truncate text-sm">{m}</span>
            <button
              onClick={() => llamar({ method: "DELETE", body: JSON.stringify({ email: m }) })}
              disabled={ocupado}
              className="rounded-lg px-2.5 py-1 text-sm text-suave transition hover:bg-panel-2 hover:text-acento disabled:opacity-40"
              aria-label={`Quitar a ${m}`}
            >
              Quitar
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Iniciales({ texto, grande }: { texto: string; grande?: boolean }) {
  const letras = texto
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
  return (
    <span
      aria-hidden
      className={`flex shrink-0 items-center justify-center rounded-full bg-panel-2 font-semibold text-acento ${grande ? "h-12 w-12 text-lg" : "h-8 w-8 text-xs"}`}
    >
      {letras}
    </span>
  );
}

function LogoProveedor({ proveedor }: { proveedor: Proveedor }) {
  if (proveedor === "github")
    return (
      <svg viewBox="0 0 16 16" className="h-5 w-5" fill="currentColor" aria-hidden>
        <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
      </svg>
    );
  return (
    <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}
