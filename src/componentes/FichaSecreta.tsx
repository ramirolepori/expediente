"use client";

import { useState } from "react";
import type { VistaPartida } from "@/motor/vista";

/**
 * Ficha del traidor. Se ve solo mientras se mantiene apretada, para que no la lea quien está al lado.
 */
export function FichaSecreta({ ficha }: { ficha: NonNullable<VistaPartida["fichaTraidor"]> }) {
  const [viendo, setViendo] = useState(false);
  const soltar = () => setViendo(false);
  return (
    <>
      <button
        onPointerDown={() => setViendo(true)}
        onPointerUp={soltar}
        onPointerLeave={soltar}
        onPointerCancel={soltar}
        onKeyDown={(e) => e.key === " " && setViendo(true)}
        onKeyUp={soltar}
        onContextMenu={(e) => e.preventDefault()}
        className="select-none rounded-full border border-borde px-3 py-1 text-sm text-suave"
        aria-label="Mantené apretado para ver tu rol secreto"
      >
        🎭 Rol secreto
      </button>
      {viendo && (
        <div className="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-4">
          <div className="papel aparecer w-full max-w-md rounded-sm p-6">
            <p className="sello mb-3 inline-block px-2 py-0.5 text-xs uppercase">Confidencial</p>
            <h2 className="text-xl">Sos el traidor</h2>
            <p className="mt-2 leading-relaxed">{ficha.rol}</p>
            <h3 className="mt-4 font-bold">Tu objetivo</h3>
            <p className="leading-relaxed">{ficha.objetivo}</p>
            {ficha.sabe.length > 0 && (
              <>
                <h3 className="mt-4 font-bold">Lo que ya sabés</h3>
                <ul>
                  {ficha.sabe.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </>
            )}
            {ficha.consejos.length > 0 && (
              <>
                <h3 className="mt-4 font-bold">Consejos</h3>
                <ul>
                  {ficha.consejos.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </>
            )}
            <p className="mt-4 text-xs opacity-60">Soltá para ocultar.</p>
          </div>
        </div>
      )}
    </>
  );
}
