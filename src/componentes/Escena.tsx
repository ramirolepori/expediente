"use client";

import type { VistaPartida } from "@/motor/vista";

type EscenaVista = NonNullable<VistaPartida["sobres"][number]["escena"]>;

/**
 * Escena ilustrada de un sobre: la imagen con un círculo por cada prueba ya visible.
 * Tocar un círculo abre la prueba igual que su tarjeta de la lista.
 */
export function Escena({
  escena,
  abierta,
  vistas,
  onAbrir,
}: {
  escena: EscenaVista;
  abierta: string | null;
  vistas: string[];
  onAbrir: (prueba: string) => void;
}) {
  const examinados = escena.puntos.filter((p) => vistas.includes(p.prueba)).length;
  return (
    <figure className="mb-3">
      <div className="escena relative overflow-hidden rounded-xl border border-borde bg-black" style={{ aspectRatio: escena.proporcion }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={escena.imagen} alt={escena.descripcion} className="absolute inset-0 h-full w-full object-cover" draggable={false} />
        {escena.puntos.map((p) => {
          const vista = vistas.includes(p.prueba);
          const activa = abierta === p.prueba;
          return (
            <button
              key={p.prueba}
              onClick={() => onAbrir(p.prueba)}
              aria-label={p.etiqueta}
              className={`punto-escena ${vista ? "vista" : ""} ${activa ? "activa" : ""}`}
              style={{ left: `${p.x}%`, top: `${p.y}%` }}
            >
              <span aria-hidden="true">{vista ? "✓" : "?"}</span>
              <span className="etiqueta-escena">{p.etiqueta}</span>
            </button>
          );
        })}
      </div>
      <figcaption className="mt-1.5 text-xs text-suave">
        Examinaron {examinados} de {escena.puntos.length} puntos de la escena. Tocá los círculos para investigar.
      </figcaption>
    </figure>
  );
}
