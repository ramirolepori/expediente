"use client";

import type { VistaPartida } from "@/motor/vista";

export function Resultado({ vista, grande }: { vista: VistaPartida; grande?: boolean }) {
  const a = vista.acusacion;
  if (!a || !vista.verdad) return null;
  const nombre = (id: string) => vista.personajes.find((p) => p.id === id)?.nombre ?? id;
  return (
    <main className={`mx-auto w-full px-4 py-8 ${grande ? "max-w-6xl" : "max-w-3xl"}`}>
      <p className="text-xs uppercase tracking-[0.3em] text-acento">Caso cerrado</p>
      <h1 className={`font-titulo ${grande ? "text-6xl" : "text-4xl"}`}>{vista.caso.meta.titulo}</h1>
      {vista.config.puntaje && (
        <p className={`mt-4 font-mono ${grande ? "text-5xl" : "text-3xl"}`}>
          {a.puntaje} <span className="text-suave">/ {a.maximo} puntos</span>
        </p>
      )}
      <div className="mt-6 space-y-3">
        {vista.preguntas.map((p) => {
          const d = a.detalle.find((x) => x.pregunta === p.id);
          const elegida = a.respuestas[p.id];
          const texto = (id?: string) => (p.tipo === "personaje" ? nombre(id ?? "") : p.opciones?.find((o) => o.id === id)?.texto ?? id);
          return (
            <div key={p.id} className="rounded-xl border border-borde bg-panel p-4">
              <p className="font-semibold">
                {d?.correcta ? "✅" : "❌"} {p.texto}
              </p>
              <p className="mt-1 text-sm">
                Respondieron: <strong>{texto(elegida)}</strong>
                {!d?.correcta && (
                  <>
                    {" "}
                    · Correcto: <strong>{texto(p.respuesta)}</strong>
                  </>
                )}
              </p>
              <p className="mt-1 text-sm text-suave">{p.explicacion}</p>
            </div>
          );
        })}
      </div>
      <section className="papel mt-8 rounded-sm p-6">
        <h2 className="text-xl">Lo que realmente pasó</h2>
        <p className="mt-3 leading-relaxed">{vista.verdad.resumen}</p>
        <details className="mt-4">
          <summary className="cursor-pointer">Cronología completa</summary>
          <table className="mt-2">
            <tbody>
              {vista.verdad.cronologia.map((c, i) => (
                <tr key={i}>
                  <td className="whitespace-nowrap">{c.hora}</td>
                  <td>{c.hecho}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      </section>
    </main>
  );
}
