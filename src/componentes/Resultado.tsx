"use client";

import { useEffect, useState } from "react";
import type { VistaPartida } from "@/motor/vista";

const PAUSA_MS = 1600;

/** Cierre del caso. Si la acusación es reciente, se revela pregunta por pregunta con suspenso. */
export function Resultado({ vista, grande }: { vista: VistaPartida; grande?: boolean }) {
  const a = vista.acusacion;
  const total = vista.preguntas.length;
  const [paso, setPaso] = useState(total);
  const [puntos, setPuntos] = useState(a?.puntaje ?? 0);

  // depende de la hora (un número) y no del objeto: cada vista nueva trae otro objeto y reiniciaría la revelación
  const horaAcusacion = a?.hora;
  useEffect(() => {
    if (!horaAcusacion) return;
    const reciente = Date.now() - horaAcusacion < 90000;
    const reducir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reciente || reducir) return;
    let actual = 0;
    const inicio = setTimeout(() => {
      setPaso(0);
      setPuntos(0);
    }, 0);
    const id = setInterval(() => {
      actual++;
      setPaso(actual);
      if (actual >= total) clearInterval(id);
    }, PAUSA_MS);
    return () => {
      clearTimeout(inicio);
      clearInterval(id);
    };
  }, [horaAcusacion, total]);

  // el puntaje sube como un contador cuando terminan de revelarse las respuestas
  const puntajeFinal = a?.puntaje ?? 0;
  useEffect(() => {
    if (paso < total || puntos >= puntajeFinal) return;
    const id = setInterval(() => setPuntos((p) => Math.min(puntajeFinal, p + Math.max(1, Math.ceil(puntajeFinal / 30)))), 30);
    return () => clearInterval(id);
  }, [puntajeFinal, paso, total, puntos]);

  if (!a || !vista.verdad) return null;
  const nombre = (id: string) => vista.personajes.find((p) => p.id === id)?.nombre ?? id;
  const terminado = paso >= total;
  const resuelto = a.puntaje >= a.maximo * 0.7;

  return (
    <main className={`mx-auto w-full px-4 py-8 ${grande ? "max-w-6xl" : "max-w-3xl"}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-acento">Caso cerrado</p>
          <h1 className={`font-titulo ${grande ? "text-6xl" : "text-4xl"}`}>{vista.caso.meta.titulo}</h1>
          {vista.config.puntaje && (
            <p className={`mt-4 font-mono tabular-nums ${grande ? "text-6xl" : "text-3xl"}`}>
              {terminado ? puntos : "··"} <span className="text-suave">/ {a.maximo} puntos</span>
            </p>
          )}
        </div>
        {terminado && (
          <span key="veredicto" className={`sello sello-golpe mt-2 shrink-0 px-3 py-1 font-bold uppercase ${grande ? "text-3xl" : "text-lg"}`}>
            {resuelto ? "Caso resuelto" : "Sin resolver"}
          </span>
        )}
      </div>

      {!terminado && (
        <button onClick={() => setPaso(total)} className="mt-4 text-sm text-suave underline">
          Saltar al resultado
        </button>
      )}

      <div className="mt-6 space-y-3">
        {vista.preguntas.slice(0, Math.min(paso + 1, total)).map((p, i) => {
          const d = a.detalle.find((x) => x.pregunta === p.id);
          const elegida = a.respuestas[p.id];
          const texto = (id?: string) => (p.tipo === "personaje" ? nombre(id ?? "") : p.opciones?.find((o) => o.id === id)?.texto ?? id);
          const revelada = i < paso;
          return (
            <div key={p.id} className={`revelar rounded-xl border bg-panel p-4 ${revelada ? (d?.correcta ? "border-ok/60" : "border-acento/60") : "border-borde"}`}>
              <p className={`font-semibold ${grande ? "text-2xl" : ""}`}>
                {revelada ? (d?.correcta ? "✅" : "❌") : "⏳"} {p.texto}
              </p>
              <p className={`mt-1 ${grande ? "text-xl" : "text-sm"}`}>
                El equipo dijo: <strong>{texto(elegida)}</strong>
                {revelada && !d?.correcta && (
                  <>
                    {" "}
                    · Era: <strong>{texto(p.respuesta)}</strong>
                  </>
                )}
              </p>
              {revelada && <p className={`mt-1 text-suave ${grande ? "text-lg" : "text-sm"}`}>{p.explicacion}</p>}
            </div>
          );
        })}
      </div>

      {terminado && (
        <section className="papel revelar mt-8 rounded-sm p-6">
          <h2 className={grande ? "text-3xl" : "text-xl"}>Lo que realmente pasó</h2>
          <p className={`mt-3 leading-relaxed ${grande ? "text-xl" : ""}`}>{vista.verdad.resumen}</p>
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
      )}
    </main>
  );
}
