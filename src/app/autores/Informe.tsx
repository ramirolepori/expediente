"use client";

import { useState } from "react";
import { informeParaIA } from "@/motor/informe";
import { NOMBRE_CAPA, type Hallazgo, type Nivel } from "@/motor/validador";

const NIVELES: { nivel: Nivel; titulo: string; estilo: string }[] = [
  { nivel: "error", titulo: "Errores", estilo: "border-acento/40 bg-acento/10 text-acento" },
  { nivel: "aviso", titulo: "Avisos", estilo: "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  { nivel: "sugerencia", titulo: "Sugerencias", estilo: "border-borde bg-panel-2 text-suave" },
];

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

export function cuentaHallazgos(hallazgos: Hallazgo[]) {
  const n = (nivel: Nivel) => hallazgos.filter((h) => h.nivel === nivel).length;
  return { errores: n("error"), avisos: n("aviso"), sugerencias: n("sugerencia") };
}

/** Resumen, botón para copiarle el informe a la IA y la lista de hallazgos por nivel. */
export function Informe({ hallazgos, titulo }: { hallazgos: Hallazgo[]; titulo: string | null }) {
  const [copiado, setCopiado] = useState<boolean | null>(null);
  const { errores, avisos, sugerencias } = cuentaHallazgos(hallazgos);
  const ok = errores === 0;

  async function copiar() {
    try {
      await navigator.clipboard.writeText(informeParaIA(hallazgos, titulo ?? undefined));
      setCopiado(true);
    } catch {
      setCopiado(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className={`flex flex-wrap items-center gap-3 rounded-xl border p-4 ${ok ? "border-ok/40 bg-ok/10" : "border-acento/40 bg-acento/10"}`}>
        <span className="text-2xl" aria-hidden>
          {ok ? "✅" : "🛑"}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{ok ? "Listo para probar" : `${plural(errores, "error", "errores")} para corregir`}</p>
          <p className="text-sm text-suave">
            {titulo ?? "Caso sin título"} · {plural(avisos, "aviso", "avisos")} · {plural(sugerencias, "sugerencia", "sugerencias")}
          </p>
        </div>
        {hallazgos.length > 0 && (
          <button onClick={copiar} className="rounded-xl border border-borde bg-panel px-4 py-2 text-sm font-semibold transition hover:border-acento">
            {copiado ? "¡Copiado!" : "Copiar informe para tu IA"}
          </button>
        )}
      </div>
      {copiado === false && <p className="text-sm text-acento">No pude copiar. Probá de nuevo o desde otro navegador.</p>}

      {NIVELES.map(({ nivel, titulo: nombre, estilo }) => {
        const lista = hallazgos.filter((h) => h.nivel === nivel);
        if (!lista.length) return null;
        return (
          <div key={nivel}>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-suave">
              {nombre} ({lista.length})
            </h3>
            <ul className="mt-2 space-y-2">
              {lista.map((h, i) => (
                <li key={i} className="rounded-xl border border-borde bg-panel-2/50 p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${estilo}`}>{NOMBRE_CAPA[h.capa]}</span>
                    <code className="break-all font-mono text-xs text-suave">{h.donde}</code>
                  </div>
                  <p className="mt-1.5">{h.mensaje[0]!.toUpperCase() + h.mensaje.slice(1)}.</p>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
