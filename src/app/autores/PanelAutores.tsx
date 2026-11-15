"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAutor, type Proveedor } from "@/cliente/sesion";

const NOMBRE_PROVEEDOR: Record<Proveedor, string> = { google: "Google", github: "GitHub" };
const NOMBRE_ROL = { admin: "Administrador", moderador: "Moderador", autor: "Autor" } as const;

export function PanelAutores() {
  const { config, autor, cargando, error, entrar, entrarFalso, salir, pedir } = useAutor();
  const [emailFalso, setEmailFalso] = useState("");

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-14">
      <Link href="/" className="text-sm text-suave hover:text-acento">
        ← Volver al inicio
      </Link>
      <h1 className="mt-4 text-3xl font-bold sm:text-4xl">Creá un caso para Expediente</h1>
      <p className="mt-3 text-suave">
        Armás el caso con tu propia IA siguiendo nuestro kit, lo subís, el validador te dice qué arreglar y, cuando está listo, lo revisamos para sumarlo al
        catálogo.
      </p>

      <section className="mt-8 rounded-2xl border border-borde bg-panel p-5">
        {cargando ? (
          <p className="text-suave">Cargando…</p>
        ) : autor ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold">Hola, {autor.nombre ?? autor.email}</p>
              <p className="text-sm text-suave">
                {autor.email} · {NOMBRE_ROL[autor.rol]}
              </p>
            </div>
            <button onClick={salir} className="rounded-lg border border-borde px-3 py-1.5 text-sm">
              Salir
            </button>
          </div>
        ) : (
          <div>
            <h2 className="font-semibold">Entrá con tu cuenta</h2>
            <p className="mt-1 text-sm text-suave">La cuenta es solo para escribir casos. Para jugar no hace falta.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {config?.proveedores.map((p) => (
                <button key={p} onClick={() => entrar(p)} className="rounded-xl bg-acento px-4 py-2.5 font-semibold text-acento-texto">
                  Entrar con {NOMBRE_PROVEEDOR[p]}
                </button>
              ))}
            </div>
            {config?.falso && (
              <form
                className="mt-4 flex flex-wrap gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (emailFalso.trim()) entrarFalso(emailFalso);
                }}
              >
                <input
                  value={emailFalso}
                  onChange={(e) => setEmailFalso(e.target.value)}
                  placeholder="mail@prueba.test"
                  aria-label="Mail para el login de prueba"
                  className="min-w-0 flex-1 rounded-xl border border-borde bg-panel-2 px-3 py-2"
                />
                <button className="rounded-xl border border-borde px-4 py-2">Entrar (modo prueba)</button>
              </form>
            )}
            {config && !config.falso && config.proveedores.length === 0 && <p className="mt-3 text-sm text-suave">Las cuentas todavía no están configuradas.</p>}
          </div>
        )}
        {error && <p className="mt-3 text-sm text-acento">{error}</p>}
      </section>

      {autor && (
        <section className="mt-6 rounded-2xl border border-borde bg-panel p-5">
          <h2 className="font-semibold">Mis casos</h2>
          <p className="mt-1 text-sm text-suave">Pronto vas a poder bajar el kit de autor, subir tus casos y validarlos acá.</p>
        </section>
      )}

      {autor?.rol === "admin" && <Moderadores pedir={pedir} />}
    </main>
  );
}

function Moderadores({ pedir }: { pedir: (url: string, init?: RequestInit) => Promise<Response> }) {
  const [lista, setLista] = useState<string[] | null>(null);
  const [nuevo, setNuevo] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function llamar(init?: RequestInit) {
    setError(null);
    const r = await pedir("/api/autores/moderadores", init);
    const d = await r.json();
    if (r.ok) setLista(d.moderadores);
    else setError(d.error ?? "No se pudo");
    return r.ok;
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
    <section className="mt-6 rounded-2xl border border-borde bg-panel p-5">
      <h2 className="font-semibold">Moderadores</h2>
      <p className="mt-1 text-sm text-suave">Pueden aprobar casos para el catálogo. Los administradores se definen en la configuración del servidor.</p>
      <ul className="mt-3 space-y-1.5">
        {lista?.length === 0 && <li className="text-sm text-suave">Todavía no hay moderadores.</li>}
        {lista?.map((m) => (
          <li key={m} className="flex items-center justify-between gap-2 rounded-lg bg-panel-2 px-3 py-1.5 text-sm">
            <span className="truncate">{m}</span>
            <button onClick={() => llamar({ method: "DELETE", body: JSON.stringify({ email: m }) })} className="text-suave hover:text-acento" aria-label={`Quitar a ${m}`}>
              Quitar
            </button>
          </li>
        ))}
      </ul>
      <form
        className="mt-3 flex flex-wrap gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          if (nuevo.trim() && (await llamar({ method: "POST", body: JSON.stringify({ email: nuevo }) }))) setNuevo("");
        }}
      >
        <input
          value={nuevo}
          onChange={(e) => setNuevo(e.target.value)}
          placeholder="mail@ejemplo.com"
          aria-label="Mail del nuevo moderador"
          className="min-w-0 flex-1 rounded-xl border border-borde bg-panel-2 px-3 py-2"
        />
        <button className="rounded-xl border border-borde px-4 py-2">Agregar</button>
      </form>
      {error && <p className="mt-2 text-sm text-acento">{error}</p>}
    </section>
  );
}
