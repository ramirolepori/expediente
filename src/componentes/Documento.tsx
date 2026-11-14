"use client";

import type { Prueba } from "@/casos/schema";
import { Markdown } from "./comunes";

const ICONO: Record<string, string> = {
  informe: "📋", declaracion: "🗣️", registro: "🗂️", foto: "📷", objeto: "🧷", documento: "📄", celular: "📱", video: "🎞️", audio: "🎙️", mapa: "🗺️",
};

export const iconoPrueba = (tipo: string) => ICONO[tipo] ?? "📄";

export function Documento({ prueba }: { prueba: Prueba }) {
  return (
    <article className="papel doc-entrar rounded-sm px-5 py-5 sm:px-7">
      <header className="mb-3 flex items-start justify-between gap-3 border-b border-black/20 pb-2">
        <h3 className="text-lg leading-tight">
          {iconoPrueba(prueba.tipo)} {prueba.titulo}
        </h3>
        <span className="sello sello-golpe shrink-0 px-2 py-0.5 text-[10px] uppercase">Evidencia</span>
      </header>
      <div className="text-[0.92rem] leading-relaxed">
        <Markdown>{prueba.contenido}</Markdown>
      </div>
      {prueba.celular && <Celular datos={prueba.celular} />}
    </article>
  );
}

function Celular({ datos }: { datos: NonNullable<Prueba["celular"]> }) {
  return (
    <div className="mx-auto mt-4 max-w-sm rounded-[2rem] border-8 border-neutral-900 bg-neutral-900 font-ui text-[13px] text-neutral-100 shadow-2xl">
      <div className="rounded-[1.4rem] bg-neutral-950 p-3">
        {datos.bloqueo && <p className="mb-3 text-center text-xs text-neutral-400">{datos.bloqueo}</p>}
        {datos.chats.map((c) => (
          <details key={c.contacto} className="mb-2 rounded-xl bg-neutral-900 p-2" open={false}>
            <summary className="cursor-pointer font-semibold">💬 {c.contacto}</summary>
            <div className="mt-2 space-y-1.5">
              {c.mensajes.map((m, i) => (
                <div key={i} className={`flex ${m.de === "victima" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-2xl px-3 py-1.5 ${m.de === "victima" ? "bg-emerald-700" : "bg-neutral-700"}`}>
                    <p>{m.texto}</p>
                    <p className="text-right text-[10px] opacity-60">{m.hora}</p>
                  </div>
                </div>
              ))}
            </div>
          </details>
        ))}
        {datos.llamadas.length > 0 && (
          <details className="mb-2 rounded-xl bg-neutral-900 p-2">
            <summary className="cursor-pointer font-semibold">📞 Llamadas</summary>
            <ul className="mt-2 space-y-1">
              {datos.llamadas.map((l, i) => (
                <li key={i} className="flex justify-between gap-2">
                  <span className={l.tipo === "perdida" ? "text-red-400" : ""}>
                    {l.tipo === "entrante" ? "↙" : l.tipo === "saliente" ? "↗" : "✕"} {l.contacto}
                  </span>
                  <span className="text-neutral-400">
                    {l.hora}
                    {l.duracion ? ` · ${l.duracion}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </details>
        )}
        {datos.correos.length > 0 && (
          <details className="mb-2 rounded-xl bg-neutral-900 p-2">
            <summary className="cursor-pointer font-semibold">✉️ Correos enviados</summary>
            {datos.correos.map((c, i) => (
              <div key={i} className="mt-2 rounded-lg bg-neutral-800 p-2">
                <p className="text-xs text-neutral-400">
                  {c.hora} · para {c.para}
                </p>
                <p className="font-semibold">{c.asunto}</p>
                <p>{c.cuerpo}</p>
              </div>
            ))}
          </details>
        )}
        {datos.notas.length > 0 && (
          <details className="rounded-xl bg-neutral-900 p-2">
            <summary className="cursor-pointer font-semibold">📝 Notas</summary>
            {datos.notas.map((n, i) => (
              <p key={i} className="mt-2 rounded-lg bg-yellow-200/90 p-2 text-neutral-900">
                <span className="text-xs opacity-60">{n.hora}</span> {n.texto}
              </p>
            ))}
          </details>
        )}
      </div>
    </div>
  );
}
