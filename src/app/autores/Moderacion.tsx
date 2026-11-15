"use client";

import { useCallback, useEffect, useState } from "react";
import { Markdown } from "@/componentes/comunes";
import { cuentaHallazgos, Informe } from "./Informe";
import { ESTADOS, linkDePrueba, type CasoAutor } from "./MisCasos";

type Pedir = (url: string, init?: RequestInit) => Promise<Response>;

/** Para moderadores y administradores: casos que piden publicarse y los ya publicados. */
export function Moderacion({ pedir }: { pedir: Pedir }) {
  const [datos, setDatos] = useState<{ pedidos: CasoAutor[]; publicados: CasoAutor[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    const r = await pedir("/api/autores/moderacion");
    const d = await r.json();
    if (r.ok) setDatos(d);
    else setError(d.error ?? "No se pudo cargar");
  }, [pedir]);

  useEffect(() => {
    let vivo = true;
    pedir("/api/autores/moderacion")
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => vivo && (ok ? setDatos(d) : setError(d.error ?? "No se pudo cargar")))
      .catch(() => vivo && setError("No se pudo cargar"));
    return () => {
      vivo = false;
    };
  }, [pedir]);

  return (
    <section className="rounded-2xl border border-borde bg-panel p-5">
      <h2 className="text-lg font-semibold">Revisión de casos</h2>
      <p className="mt-1 text-sm text-suave">
        Antes de publicar: jugalo con el link, leé la solución en el REVISION.md y mirá los avisos del validador. Si algo no cierra, devolvelo con una nota para el autor.
      </p>
      {error && <p className="mt-3 text-sm text-acento">{error}</p>}
      {datos === null && !error && <p className="mt-3 text-sm text-suave">Cargando…</p>}

      {datos && (
        <>
          <h3 className="mt-5 text-sm font-semibold uppercase tracking-wider text-suave">Piden publicarse ({datos.pedidos.length})</h3>
          {datos.pedidos.length === 0 && <p className="mt-2 text-sm text-suave">No hay casos esperando revisión.</p>}
          <ul className="mt-2 space-y-3">
            {datos.pedidos.map((c) => (
              <CasoAModerar key={c.id} caso={c} pedir={pedir} recargar={cargar} />
            ))}
          </ul>

          <h3 className="mt-6 text-sm font-semibold uppercase tracking-wider text-suave">Publicados ({datos.publicados.length})</h3>
          {datos.publicados.length === 0 && <p className="mt-2 text-sm text-suave">Todavía no hay casos de autores en el catálogo.</p>}
          <ul className="mt-2 space-y-3">
            {datos.publicados.map((c) => (
              <CasoAModerar key={c.id} caso={c} pedir={pedir} recargar={cargar} />
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function CasoAModerar({ caso, pedir, recargar }: { caso: CasoAutor; pedir: Pedir; recargar: () => Promise<void> }) {
  const [revision, setRevision] = useState<string | null | undefined>(undefined);
  const [verInforme, setVerInforme] = useState(false);
  const [nota, setNota] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { errores, avisos } = cuentaHallazgos(caso.informe);
  const publicado = caso.estado === "publicado";

  async function abrirRevision() {
    if (revision !== undefined) return setRevision(undefined);
    const r = await pedir(`/api/autores/moderacion/${caso.id}`);
    const d = await r.json();
    if (r.ok) setRevision(d.revision ?? null);
    else setError(d.error ?? "No se pudo abrir");
  }

  async function decidir(decision: "publicar" | "rechazar" | "despublicar") {
    if (decision === "rechazar" && !nota.trim()) return setError("Escribí una nota para que el autor sepa qué cambiar");
    setError(null);
    const r = await pedir(`/api/autores/moderacion/${caso.id}`, { method: "POST", body: JSON.stringify({ decision, nota }) });
    if (!r.ok) return setError((await r.json()).error ?? "No se pudo");
    await recargar();
  }

  const boton = "rounded-lg border border-borde px-3 py-1.5 text-sm transition hover:border-acento disabled:opacity-40";
  return (
    <li className="rounded-xl border border-borde bg-panel-2/40 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${ESTADOS[caso.estado].estilo}`}>{ESTADOS[caso.estado].nombre}</span>
        <h4 className="min-w-0 flex-1 truncate font-semibold">{caso.titulo}</h4>
        <span className="text-xs text-suave">{caso.autorEmail}</span>
      </div>
      <p className="mt-1 text-sm text-suave">
        {errores > 0 ? `${errores} errores del validador. ` : "Sin errores del validador. "}
        {avisos > 0 ? `${avisos} avisos para mirar.` : "Sin avisos."}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <a href={linkDePrueba(caso.id)} target="_blank" rel="noreferrer" className={boton}>
          Jugarlo
        </a>
        <button onClick={abrirRevision} className={boton}>
          {revision !== undefined ? "Ocultar la solución" : "Leer REVISION.md"}
        </button>
        <button onClick={() => setVerInforme(!verInforme)} className={boton}>
          {verInforme ? "Ocultar informe" : "Ver informe"}
        </button>
      </div>
      {revision !== undefined && (
        <div className="prose-caso mt-3 max-h-96 overflow-auto rounded-lg border border-borde bg-panel p-4 text-sm">
          {revision ? <Markdown>{revision}</Markdown> : <p className="text-suave">El autor no subió un REVISION.md.</p>}
        </div>
      )}
      {verInforme && (
        <div className="mt-3">
          <Informe hallazgos={caso.informe} titulo={caso.titulo} />
        </div>
      )}
      <textarea
        value={nota}
        onChange={(e) => setNota(e.target.value)}
        placeholder={publicado ? "Motivo (opcional)" : "Nota para el autor: qué le falta o qué cambiar"}
        aria-label={`Nota sobre ${caso.titulo}`}
        rows={2}
        className="mt-3 w-full rounded-xl border border-borde bg-panel px-3 py-2 text-sm outline-none focus:border-acento"
      />
      <div className="mt-2 flex flex-wrap gap-2">
        {publicado ? (
          <button onClick={() => decidir("despublicar")} className={boton}>
            Sacar del catálogo
          </button>
        ) : (
          <>
            <button onClick={() => decidir("publicar")} disabled={errores > 0} className="rounded-lg bg-acento px-3 py-1.5 text-sm font-semibold text-acento-texto disabled:opacity-40">
              Publicar
            </button>
            <button onClick={() => decidir("rechazar")} className={boton}>
              Devolver al autor
            </button>
          </>
        )}
      </div>
      {error && <p className="mt-2 text-sm text-acento">{error}</p>}
    </li>
  );
}
