"use client";

import { useRef, useState } from "react";
import type { Hallazgo } from "@/motor/validador";
import { Informe } from "./Informe";
import { leerPaquete, nombreDe, pedidoDeValidacion } from "./paquete";

type Pedir = (url: string, init?: RequestInit) => Promise<Response>;

/** Valida sin guardar: para ir y venir con la IA rápido, antes de subir el caso. */
export function Validador({ pedir }: { pedir: Pedir }) {
  const carpeta = useRef<HTMLInputElement>(null);
  const soloJson = useRef<HTMLInputElement>(null);
  const [nombre, setNombre] = useState<string | null>(null);
  const [resultado, setResultado] = useState<{ titulo: string | null; hallazgos: Hallazgo[] } | null>(null);
  const [validando, setValidando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function elegir(lista: FileList | null) {
    const elegidos = [...(lista ?? [])];
    if (!elegidos.length) return;
    setNombre(nombreDe(elegidos) ?? null);
    setError(null);
    const paquete = leerPaquete(elegidos);
    if (typeof paquete === "string") return setError(paquete);
    setValidando(true);
    try {
      const r = await pedir("/api/autores/validar", { method: "POST", body: await pedidoDeValidacion(paquete) });
      const d = await r.json();
      if (!r.ok) setError(d.error ?? "No se pudo validar");
      else setResultado(d);
    } catch {
      setError("No se pudo validar. Revisá tu conexión y probá de nuevo");
    } finally {
      setValidando(false);
    }
  }

  return (
    <section className="rounded-2xl border border-borde bg-panel p-5">
      <h2 className="text-lg font-semibold">Validar un caso</h2>
      <p className="mt-1 text-sm text-suave">
        Elegí la carpeta del caso, con el <code className="font-mono text-xs">caso.json</code> y sus imágenes. El validador revisa que se pueda resolver, que no haya spoilers
        y que todo esté en su lugar. Si encuentra algo, copiás el informe y se lo pasás a tu IA. Validar no guarda nada.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <button onClick={() => carpeta.current?.click()} disabled={validando} className="rounded-xl bg-acento px-4 py-2.5 text-sm font-semibold text-acento-texto disabled:opacity-40">
          Elegir la carpeta del caso
        </button>
        <button onClick={() => soloJson.current?.click()} disabled={validando} className="rounded-xl border border-borde px-4 py-2.5 text-sm transition hover:border-acento disabled:opacity-40">
          Solo el caso.json
        </button>
        <SelectorCarpeta ref={carpeta} etiqueta="Carpeta del caso" onElegir={elegir} />
        <input
          ref={soloJson}
          type="file"
          className="hidden"
          aria-label="Archivo caso.json"
          accept=".json,application/json"
          onChange={(e) => {
            void elegir(e.target.files);
            e.target.value = "";
          }}
        />
      </div>
      <p className="mt-2 text-xs text-suave">
        Después de cada cambio, volvé a elegir la carpeta.
        {nombre && <> Último: {nombre}.</>}
      </p>

      {validando && <p className="mt-4 animate-pulse text-sm text-suave">Validando…</p>}
      {error && <p className="mt-4 text-sm text-acento">{error}</p>}
      {resultado && !validando && (
        <div className="mt-5">
          <Informe hallazgos={resultado.hallazgos} titulo={resultado.titulo} />
        </div>
      )}
    </section>
  );
}

/** Input oculto que elige una carpeta entera. El reset permite volver a elegir la misma. */
export function SelectorCarpeta({ ref, etiqueta, onElegir }: { ref: React.Ref<HTMLInputElement>; etiqueta: string; onElegir: (l: FileList | null) => void }) {
  return (
    <input
      ref={ref}
      type="file"
      className="hidden"
      aria-label={etiqueta}
      {...{ webkitdirectory: "" }}
      multiple
      onChange={(e) => {
        onElegir(e.target.files);
        e.target.value = "";
      }}
    />
  );
}
