"use client";

import type { Prueba } from "@/casos/schema";
import { Celular } from "./Celular";
import { Markdown } from "./comunes";

const ICONO: Record<string, string> = {
  informe: "📋", declaracion: "🗣️", registro: "🗂️", foto: "📷", objeto: "🧷", documento: "📄", celular: "📱", video: "🎞️", audio: "🎙️", mapa: "🗺️",
};

export const iconoPrueba = (tipo: string) => ICONO[tipo] ?? "📄";

/** `accion`: un control en el encabezado (por ejemplo, escucharlo en voz alta). */
export function Documento({ prueba, accion }: { prueba: Prueba; accion?: React.ReactNode }) {
  return (
    <article className="papel doc-entrar rounded-sm px-5 py-5 sm:px-7">
      <header className="mb-3 flex items-start justify-between gap-3 border-b border-black/20 pb-2">
        <h3 className="text-lg leading-tight">
          {iconoPrueba(prueba.tipo)} {prueba.titulo}
        </h3>
        <span className="flex shrink-0 items-center gap-2">
          {accion}
          <span className="sello sello-golpe px-2 py-0.5 text-[10px] uppercase">Evidencia</span>
        </span>
      </header>
      <div className="text-[0.92rem] leading-relaxed">
        <Markdown>{prueba.contenido}</Markdown>
      </div>
      {prueba.celular && <Celular datos={prueba.celular} />}
    </article>
  );
}
