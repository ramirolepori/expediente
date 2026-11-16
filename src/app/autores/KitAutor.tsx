"use client";

import { useState } from "react";
import { promptInicial } from "@/kit/textos";

/** El kit de autor: la descarga y el prompt inicial para copiar sin bajar nada. */
export function KitAutor() {
  const [copiado, setCopiado] = useState<boolean | null>(null);

  async function copiar() {
    // solo lo que va debajo de la línea: es lo que se pega en la IA
    const texto = promptInicial().split("\n---\n")[1]!.trim();
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
    } catch {
      setCopiado(false);
    }
  }

  return (
    <section className="rounded-2xl border border-borde bg-panel p-5">
      <h2 className="text-lg font-semibold">Kit de autor</h2>
      <p className="mt-1 text-sm text-suave">
        La guía por etapas, el contrato del caso, las reglas de diseño, un caso de ejemplo y el prompt para arrancar. Adjuntáselo a tu IA (Claude, ChatGPT, Gemini) y trabajen de a una
        etapa. Se actualiza con cada versión de la plataforma.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <a href="/autores/kit" download className="rounded-xl bg-acento px-4 py-2.5 text-sm font-semibold text-acento-texto">
          ⬇️ Bajar el kit (.zip)
        </a>
        <button onClick={copiar} className="rounded-xl border border-borde px-4 py-2.5 text-sm transition hover:border-acento">
          {copiado ? "¡Prompt copiado!" : "Copiar el prompt inicial"}
        </button>
      </div>
      {copiado === false && <p className="mt-2 text-sm text-acento">No pude copiar. Está en el kit, en PROMPT-INICIAL.md.</p>}
    </section>
  );
}
