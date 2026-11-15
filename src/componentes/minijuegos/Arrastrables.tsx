"use client";

import { useRef, useState } from "react";

type Pieza = { id: string; texto: string };

/** Número pseudoaleatorio estable a partir de un texto (para desparramar igual en cada render). */
function azar(semilla: string) {
  let h = 2166136261;
  for (let i = 0; i < semilla.length; i++) h = Math.imul(h ^ semilla.charCodeAt(i), 16777619);
  return ((h >>> 0) % 1000) / 1000;
}

/**
 * Papel roto: los pedazos están desparramados sobre una mesa y se arrastran libremente
 * (mantener apretado y mover). Al comprobar, cuenta el orden de arriba hacia abajo.
 */
export function MesaPapeles({ piezas, resuelto, onEnviar }: { piezas: Pieza[]; resuelto: boolean; onEnviar: (r: string) => void }) {
  const mesa = useRef<HTMLDivElement>(null);
  const altoMesa = Math.max(360, piezas.length * 78 + 140);
  const [pos, setPos] = useState(() =>
    Object.fromEntries(
      piezas.map((p, i) => [
        p.id,
        {
          // cada pedazo en su franja (ya vienen mezclados), corrido y girado al azar: desordenados pero sin encimarse
          x: 2 + azar(p.id + "x") * 26,
          y: 3 + (i * 88) / piezas.length + azar(p.id + "y") * 4,
          r: (azar(p.id + "r") - 0.5) * 6,
        },
      ]),
    ) as Record<string, { x: number; y: number; r: number }>,
  );
  const [capas, setCapas] = useState(piezas.map((p) => p.id));
  const [agarrada, setAgarrada] = useState<{ id: string; dx: number; dy: number } | null>(null);

  const enPorcentaje = (e: React.PointerEvent) => {
    const r = mesa.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 };
  };

  const comprobar = () => {
    const orden = [...piezas].sort((a, b) => pos[a.id].y - pos[b.id].y).map((p) => p.id);
    onEnviar(orden.join(","));
  };

  return (
    <div>
      <p className="mb-3 text-sm text-suave">Mantené apretado un pedazo y arrastralo. Armá la hoja de arriba hacia abajo y apretá Comprobar.</p>
      <div ref={mesa} className="mesa-madera relative w-full touch-none overflow-hidden rounded-xl" style={{ height: altoMesa }}>
        {piezas.map((p) => {
          const q = pos[p.id];
          const levantada = agarrada?.id === p.id;
          return (
            <div
              key={p.id}
              role="button"
              tabIndex={0}
              aria-label={`Pedazo: ${p.texto}`}
              onPointerDown={(e) => {
                if (resuelto) return;
                (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                const m = enPorcentaje(e);
                setAgarrada({ id: p.id, dx: m.x - q.x, dy: m.y - q.y });
                setCapas((c) => [...c.filter((x) => x !== p.id), p.id]);
              }}
              onPointerMove={(e) => {
                if (!levantada) return;
                const m = enPorcentaje(e);
                setPos((s) => ({ ...s, [p.id]: { ...s[p.id], x: Math.min(30, Math.max(0, m.x - agarrada!.dx)), y: Math.min(92, Math.max(0, m.y - agarrada!.dy)) } }));
              }}
              onPointerUp={() => {
                if (!levantada) return;
                // al soltarlo se endereza un poco, como un papel que se acomoda
                setPos((s) => ({ ...s, [p.id]: { ...s[p.id], r: s[p.id].r * 0.35 } }));
                setAgarrada(null);
              }}
              onKeyDown={(e) => {
                if (resuelto || (e.key !== "ArrowUp" && e.key !== "ArrowDown")) return;
                e.preventDefault();
                const d = e.key === "ArrowUp" ? -4 : 4;
                setPos((s) => ({ ...s, [p.id]: { ...s[p.id], y: Math.min(92, Math.max(0, s[p.id].y + d)) } }));
              }}
              className={`papel tira-rota absolute w-[70%] px-5 py-3 font-doc text-sm sm:text-base ${resuelto ? "" : "cursor-grab active:cursor-grabbing"}`}
              style={{
                left: `${q.x}%`,
                top: `${q.y}%`,
                transform: `rotate(${levantada ? 0 : q.r}deg) scale(${levantada ? 1.04 : 1})`,
                transition: levantada ? "transform 0.1s" : "transform 0.25s, box-shadow 0.2s",
                zIndex: capas.indexOf(p.id) + 1,
                boxShadow: levantada ? "0 18px 30px rgba(0,0,0,0.45)" : undefined,
              }}
            >
              {p.texto}
            </div>
          );
        })}
      </div>
      {!resuelto && (
        <button onClick={comprobar} className="mt-5 w-full rounded-xl bg-acento py-3 font-semibold text-acento-texto">
          Comprobar
        </button>
      )}
    </div>
  );
}

/**
 * Lista que se ordena arrastrando: al mover una tarjeta, las demás se corren para hacerle lugar.
 * Las flechas quedan como alternativa con teclado o para quien prefiera tocar.
 */
export function ListaArrastrable({ piezas, resuelto, onEnviar }: { piezas: Pieza[]; resuelto: boolean; onEnviar: (r: string) => void }) {
  const [orden, setOrden] = useState(piezas);
  const refs = useRef<(HTMLLIElement | null)[]>([]);
  const [arrastre, setArrastre] = useState<{ desde: number; inicioY: number; dy: number; hacia: number; rects: DOMRect[] } | null>(null);

  const mover = (a: number, b: number) => {
    if (b < 0 || b >= orden.length) return;
    setOrden((o) => {
      const n = [...o];
      const [x] = n.splice(a, 1);
      n.splice(b, 0, x);
      return n;
    });
  };

  const desplazamiento = (k: number) => {
    if (!arrastre || k === arrastre.desde) return 0;
    const alto = arrastre.rects[arrastre.desde].height + 12;
    if (arrastre.desde < k && k <= arrastre.hacia) return -alto;
    if (arrastre.hacia <= k && k < arrastre.desde) return alto;
    return 0;
  };

  return (
    <div>
      <p className="mb-3 text-sm text-suave">Mantené apretada una tarjeta y arrastrala a su lugar, del primero al último.</p>
      <ol className="relative space-y-3 border-l-2 border-acento/50 pl-6">
        {orden.map((p, i) => {
          const esLaArrastrada = arrastre?.desde === i;
          return (
            <li
              key={p.id}
              ref={(el) => {
                refs.current[i] = el;
              }}
              className="relative flex touch-none items-stretch gap-2 select-none"
              style={{
                transform: `translateY(${esLaArrastrada ? arrastre!.dy : desplazamiento(i)}px)`,
                transition: esLaArrastrada ? "none" : "transform 0.2s ease",
                zIndex: esLaArrastrada ? 10 : 1,
              }}
              onPointerDown={(e) => {
                if (resuelto || (e.target as HTMLElement).closest("button")) return;
                (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                const rects = refs.current.slice(0, orden.length).map((el) => el!.getBoundingClientRect());
                setArrastre({ desde: i, inicioY: e.clientY, dy: 0, hacia: i, rects });
              }}
              onPointerMove={(e) => {
                if (!esLaArrastrada) return;
                const dy = e.clientY - arrastre!.inicioY;
                const centro = arrastre!.rects[i].top + arrastre!.rects[i].height / 2 + dy;
                let hacia = 0;
                arrastre!.rects.forEach((r, k) => {
                  if (k !== i && r.top + r.height / 2 < centro) hacia++;
                });
                setArrastre({ ...arrastre!, dy, hacia });
              }}
              onPointerUp={() => {
                if (esLaArrastrada && arrastre!.hacia !== i) mover(i, arrastre!.hacia);
                setArrastre(null);
              }}
              onPointerCancel={() => setArrastre(null)}
            >
              <span className="absolute -left-[31px] top-4 h-3 w-3 rounded-full bg-acento" />
              <div
                className={`flex-1 rounded-xl border bg-panel px-4 py-3 ${resuelto ? "border-borde" : "cursor-grab border-borde active:cursor-grabbing"} ${
                  esLaArrastrada ? "border-acento shadow-2xl" : ""
                }`}
              >
                <span className="mr-2 font-mono text-xs text-suave">{i + 1}.</span>
                {p.texto}
              </div>
              {!resuelto && (
                <span className="flex flex-col justify-center gap-1">
                  <button onClick={() => mover(i, i - 1)} aria-label="Subir" className="rounded border border-borde px-2 text-sm">
                    ▲
                  </button>
                  <button onClick={() => mover(i, i + 1)} aria-label="Bajar" className="rounded border border-borde px-2 text-sm">
                    ▼
                  </button>
                </span>
              )}
            </li>
          );
        })}
      </ol>
      {!resuelto && (
        <button onClick={() => onEnviar(orden.map((p) => p.id).join(","))} className="mt-5 w-full rounded-xl bg-acento py-3 font-semibold text-acento-texto">
          Comprobar
        </button>
      )}
    </div>
  );
}
