"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabaseAutores } from "@/cliente/sesion";
import type { Hallazgo } from "@/motor/validador";
import { cuentaHallazgos, Informe } from "./Informe";
import { leerPaquete } from "./paquete";
import { SelectorCarpeta } from "./Validador";

type Pedir = (url: string, init?: RequestInit) => Promise<Response>;

export interface CasoAutor {
  id: string;
  titulo: string;
  estado: "borrador" | "validado" | "privado" | "publicado";
  revision: "pedida" | "rechazada" | null;
  nota_revision: string | null;
  informe: Hallazgo[];
  archivos: { ruta: string; peso: number }[];
  actualizado: string;
  autorEmail?: string;
}

export const ESTADOS: Record<CasoAutor["estado"], { nombre: string; estilo: string; ayuda: string }> = {
  borrador: { nombre: "Borrador", estilo: "bg-panel-2 text-suave border border-borde", ayuda: "Tiene errores: corregilos con tu IA y volvé a subirlo." },
  validado: { nombre: "Validado", estilo: "bg-ok/15 text-ok border border-ok/40", ayuda: "Pasó el validador. Ya lo podés probar con amigos." },
  privado: { nombre: "Privado", estilo: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/40", ayuda: "Se juega con el link, con el modelo de prueba." },
  publicado: { nombre: "Publicado", estilo: "bg-acento text-acento-texto", ayuda: "Está en el catálogo para todos." },
};

export const linkDePrueba = (id: string) => `${location.origin}/?caso=autor-${id}`;

/**
 * Sube un caso: guarda el JSON, sube cada imagen directo a Storage con su URL firmada
 * (o a nuestra API con el login falso) y pide confirmar, que relee todo y valida de verdad.
 */
async function subir(pedir: Pedir, elegidos: File[], id: string | undefined, avance: (t: string) => void): Promise<string> {
  const paquete = leerPaquete(elegidos);
  if (typeof paquete === "string") throw new Error(paquete);
  avance("Guardando el caso…");
  const form = new FormData();
  form.append("caso", await paquete.caso.text());
  if (paquete.revision) form.append("revision", await paquete.revision.text());
  form.append("rutas", JSON.stringify(paquete.archivos.map((a) => a.ruta)));
  form.append("pesos", JSON.stringify(paquete.archivos.map((a) => a.archivo.size)));
  if (id) form.append("id", id);
  const r = await pedir("/api/autores/casos", { method: "POST", body: form });
  const d = (await r.json()) as { id: string; subidas: { url: string; token?: string; ruta: string; archivo: string }[]; error?: string };
  if (!r.ok) throw new Error(d.error ?? "No se pudo guardar");

  let hechas = 0;
  for (const s of d.subidas) {
    avance(`Subiendo imágenes ${++hechas} de ${d.subidas.length}…`);
    const archivo = paquete.archivos.find((a) => a.ruta === s.archivo)!.archivo;
    if (s.token) {
      const { error } = await supabaseAutores()!.storage.from("casos-autores").uploadToSignedUrl(s.ruta, s.token, archivo, { upsert: true, contentType: archivo.type });
      // un archivo que no se pudo subir lo marca el validador al confirmar
      if (error) console.warn(s.archivo, error.message);
    } else {
      await fetch(s.url, { method: "PUT", body: archivo, headers: { "Content-Type": archivo.type || "application/octet-stream" } });
    }
  }
  avance("Validando…");
  const c = await pedir(`/api/autores/casos/${d.id}`, { method: "POST", body: JSON.stringify({ accion: "confirmar" }) });
  if (!c.ok) throw new Error((await c.json()).error ?? "No se pudo validar");
  return d.id;
}

export function MisCasos({ pedir }: { pedir: Pedir }) {
  const nuevo = useRef<HTMLInputElement>(null);
  const [casos, setCasos] = useState<CasoAutor[] | null>(null);
  const [abierto, setAbierto] = useState<string | null>(null);
  const [avance, setAvance] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    const r = await pedir("/api/autores/casos");
    const d = await r.json();
    if (r.ok) setCasos(d.casos);
    else setError(d.error ?? "No se pudieron cargar tus casos");
  }, [pedir]);

  useEffect(() => {
    let vivo = true;
    pedir("/api/autores/casos")
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => vivo && (ok ? setCasos(d.casos) : setError(d.error ?? "No se pudieron cargar tus casos")))
      .catch(() => vivo && setError("No se pudieron cargar tus casos"));
    return () => {
      vivo = false;
    };
  }, [pedir]);

  async function subirCarpeta(lista: FileList | null, id?: string) {
    const elegidos = [...(lista ?? [])];
    if (!elegidos.length) return;
    setError(null);
    try {
      const nuevoId = await subir(pedir, elegidos, id, setAvance);
      await cargar();
      setAbierto(nuevoId);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setAvance(null);
    }
  }

  return (
    <section className="rounded-2xl border border-borde bg-panel p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Mis casos</h2>
          <p className="mt-1 text-sm text-suave">Subí la carpeta del caso para guardarlo, probarlo con amigos y pedir que lo publiquemos.</p>
        </div>
        <button onClick={() => nuevo.current?.click()} disabled={!!avance} className="rounded-xl bg-acento px-4 py-2.5 text-sm font-semibold text-acento-texto disabled:opacity-40">
          Subir un caso
        </button>
        <SelectorCarpeta ref={nuevo} etiqueta="Carpeta del caso a subir" onElegir={(l) => subirCarpeta(l)} />
      </div>

      {avance && <p className="mt-4 animate-pulse text-sm text-suave">{avance}</p>}
      {error && <p className="mt-4 text-sm text-acento">{error}</p>}

      {casos === null && !error && <p className="mt-4 text-sm text-suave">Cargando…</p>}
      {casos?.length === 0 && (
        <div className="mt-4 rounded-xl border border-dashed border-borde px-5 py-8 text-center">
          <p className="text-3xl" aria-hidden>
            🗂️
          </p>
          <p className="mt-2 font-medium">Todavía no subiste casos</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-suave">Cuando el validador te dé el visto bueno, subí la carpeta acá.</p>
        </div>
      )}
      <ul className="mt-4 space-y-3">
        {casos?.map((c) => (
          <TarjetaCaso
            key={c.id}
            caso={c}
            abierto={abierto === c.id}
            alternar={() => setAbierto(abierto === c.id ? null : c.id)}
            pedir={pedir}
            ocupado={!!avance}
            actualizar={(l) => subirCarpeta(l, c.id)}
            recargar={cargar}
          />
        ))}
      </ul>
    </section>
  );
}

function TarjetaCaso({
  caso,
  abierto,
  alternar,
  pedir,
  ocupado,
  actualizar,
  recargar,
}: {
  caso: CasoAutor;
  abierto: boolean;
  alternar: () => void;
  pedir: Pedir;
  ocupado: boolean;
  actualizar: (l: FileList | null) => void;
  recargar: () => Promise<void>;
}) {
  const carpeta = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const { errores, avisos } = cuentaHallazgos(caso.informe);
  const estado = ESTADOS[caso.estado];

  async function accion(nombre: "probar" | "pedir_publicacion" | "retirar") {
    setError(null);
    const r = await pedir(`/api/autores/casos/${caso.id}`, { method: "POST", body: JSON.stringify({ accion: nombre }) });
    if (!r.ok) setError((await r.json()).error ?? "No se pudo");
    await recargar();
  }

  async function borrar() {
    if (!confirm(`Borrar "${caso.titulo}" con sus imágenes? No se puede deshacer.`)) return;
    const r = await pedir(`/api/autores/casos/${caso.id}`, { method: "DELETE" });
    if (!r.ok) setError((await r.json()).error ?? "No se pudo borrar");
    await recargar();
  }

  async function copiarLink() {
    try {
      await navigator.clipboard.writeText(linkDePrueba(caso.id));
      setCopiado(true);
    } catch {
      setError("No pude copiar el link");
    }
  }

  const boton = "rounded-lg border border-borde px-3 py-1.5 text-sm transition hover:border-acento disabled:opacity-40";
  return (
    <li className="rounded-xl border border-borde bg-panel-2/40 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${estado.estilo}`}>{estado.nombre}</span>
        {caso.revision === "pedida" && <span className="rounded-full border border-borde px-2.5 py-0.5 text-xs">Esperando revisión</span>}
        {caso.revision === "rechazada" && <span className="rounded-full border border-acento/40 px-2.5 py-0.5 text-xs text-acento">Hay cambios para hacer</span>}
        <h3 className="min-w-0 flex-1 truncate font-semibold">{caso.titulo}</h3>
        <span className="text-xs text-suave">{new Date(caso.actualizado).toLocaleDateString("es-AR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
      </div>
      <p className="mt-1 text-sm text-suave">
        {estado.ayuda} {errores > 0 && `${errores} ${errores === 1 ? "error" : "errores"}. `}
        {avisos > 0 && `${avisos} ${avisos === 1 ? "aviso" : "avisos"}.`}
      </p>
      {caso.nota_revision && (
        <p className="mt-2 rounded-lg border border-borde bg-panel p-3 text-sm">
          <span className="font-semibold">Nota de quien revisó:</span> {caso.nota_revision}
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <button onClick={alternar} className={boton}>
          {abierto ? "Ocultar informe" : "Ver informe"}
        </button>
        <button onClick={() => carpeta.current?.click()} disabled={ocupado} className={boton}>
          Subir una versión nueva
        </button>
        <SelectorCarpeta ref={carpeta} etiqueta={`Nueva versión de ${caso.titulo}`} onElegir={actualizar} />
        {caso.estado === "validado" && (
          <button onClick={() => accion("probar")} className={boton}>
            Probar con amigos
          </button>
        )}
        {(caso.estado === "privado" || caso.estado === "publicado") && (
          <>
            <a href={linkDePrueba(caso.id)} className={boton}>
              Jugarlo
            </a>
            <button onClick={copiarLink} className={boton}>
              {copiado ? "¡Link copiado!" : "Copiar link para amigos"}
            </button>
          </>
        )}
        {(caso.estado === "validado" || caso.estado === "privado") && caso.revision !== "pedida" && (
          <button onClick={() => accion("pedir_publicacion")} className={boton}>
            Pedir que lo publiquen
          </button>
        )}
        {(caso.estado === "publicado" || caso.revision === "pedida") && (
          <button onClick={() => accion("retirar")} className={boton}>
            {caso.estado === "publicado" ? "Sacar del catálogo" : "Cancelar el pedido"}
          </button>
        )}
        <button onClick={borrar} className={`${boton} text-suave hover:text-acento`}>
          Borrar
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-acento">{error}</p>}
      {abierto && (
        <div className="mt-4">
          <Informe hallazgos={caso.informe} titulo={caso.titulo} />
        </div>
      )}
    </li>
  );
}
