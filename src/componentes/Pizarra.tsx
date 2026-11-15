"use client";

import { useRef, useState } from "react";
import type { RefPizarra } from "@/motor/tipos";
import type { VistaPartida } from "@/motor/vista";
import { iconoPrueba } from "./Documento";

type Enviar = (a: Parameters<ReturnType<typeof import("@/cliente/useSala").useSala>["accion"]>[0]) => Promise<boolean>;

interface Etiqueta {
  icono: string;
  titulo: string;
  detalle?: string;
}

/** Cómo se muestra cada cosa que se puede llevar a la pizarra. */
export function etiquetar(ref: RefPizarra, vista: VistaPartida): Etiqueta | null {
  if (ref.tipo === "prueba") {
    const p = vista.pruebas.find((x) => x.id === ref.id);
    return p ? { icono: iconoPrueba(p.tipo), titulo: p.titulo } : null;
  }
  if (ref.tipo === "hecho") {
    const h = vista.descubrimientos.find((x) => x.id === ref.id);
    return h ? { icono: "📌", titulo: h.texto } : null;
  }
  if (ref.tipo === "personaje") {
    const p = vista.personajes.find((x) => x.id === ref.id && x.disponible);
    return p ? { icono: "👤", titulo: p.nombre, detalle: p.rol } : null;
  }
  const n = vista.notas.find((x) => x.id === ref.id && x.visibilidad === "equipo");
  return n ? { icono: "📝", titulo: n.texto } : null;
}

/** Todo lo que el equipo tiene a la vista y se puede llevar a la pizarra. */
export function candidatos(vista: VistaPartida): { ref: RefPizarra; etiqueta: Etiqueta }[] {
  const refs: RefPizarra[] = [
    ...vista.personajes.filter((p) => p.disponible).map((p) => ({ tipo: "personaje" as const, id: p.id })),
    ...vista.pruebas.map((p) => ({ tipo: "prueba" as const, id: p.id })),
    ...vista.descubrimientos.map((h) => ({ tipo: "hecho" as const, id: h.id })),
    ...vista.notas.filter((n) => n.visibilidad === "equipo").map((n) => ({ tipo: "nota" as const, id: n.id })),
  ];
  return refs.flatMap((ref) => {
    const etiqueta = etiquetar(ref, vista);
    return etiqueta ? [{ ref, etiqueta }] : [];
  });
}

const mismo = (a: RefPizarra, b: RefPizarra) => a.tipo === b.tipo && a.id === b.id;

/** Lugar para una tarjeta nueva: el punto de una grilla más alejado de las que ya están, para que no se encimen. */
function lugarLibre(items: { x: number; y: number }[]) {
  let mejor = { x: 50, y: 50 };
  let distancia = -1;
  for (let x = 14; x <= 86; x += 18) {
    for (let y = 16; y <= 84; y += 17) {
      const d = items.length ? Math.min(...items.map((i) => Math.hypot(i.x - x, (i.y - y) * 1.4))) : 100 - Math.hypot(x - 50, y - 50);
      if (d > distancia) {
        distancia = d;
        mejor = { x, y };
      }
    }
  }
  return mejor;
}

/**
 * Corcho compartido: tarjetas que se arrastran y hilos rojos entre ellas.
 * La posición se manda al soltar (no en cada movimiento) para no saturar el servidor.
 */
export function Corcho({ vista, enviar, soloLectura, alto = "min(70vh, 640px)" }: { vista: VistaPartida; enviar?: Enviar; soloLectura?: boolean; alto?: string }) {
  const tablero = useRef<HTMLDivElement>(null);
  const [arrastre, setArrastre] = useState<{ id: string; x: number; y: number; movio: boolean } | null>(null);
  const [modo, setModo] = useState<"mover" | "conectar">("mover");
  const [elegido, setElegido] = useState<string | null>(null);
  const [agregando, setAgregando] = useState(false);
  const pz = vista.pizarra;
  const items = pz.items
    .map((i) => ({ ...i, ...(arrastre?.id === i.id ? { x: arrastre.x, y: arrastre.y } : {}), etiqueta: etiquetar(i.ref, vista) }))
    .filter((i) => i.etiqueta);
  const posicion = (id: string) => items.find((i) => i.id === id);

  const aPorcentaje = (e: React.PointerEvent) => {
    const r = tablero.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 };
  };

  const tocar = (id: string) => {
    if (soloLectura || !enviar) return;
    if (modo === "conectar") {
      if (!elegido) return setElegido(id);
      if (elegido !== id) enviar({ tipo: "pizarraHilo", a: elegido, b: id });
      return setElegido(null);
    }
    setElegido(elegido === id ? null : id);
  };

  const libres = candidatos(vista).filter((c) => !pz.items.some((i) => mismo(i.ref, c.ref)));

  return (
    <div className={soloLectura ? "h-full" : ""}>
      {!soloLectura && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-borde p-0.5 text-sm">
            {(["mover", "conectar"] as const).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setModo(m);
                  setElegido(null);
                }}
                className={`rounded-md px-3 py-1 ${modo === m ? "bg-acento text-acento-texto" : "text-suave"}`}
              >
                {m === "mover" ? "✋ Mover" : "🧵 Conectar"}
              </button>
            ))}
          </div>
          <button onClick={() => setAgregando((a) => !a)} className="rounded-lg border border-borde bg-panel-2 px-3 py-1.5 text-sm">
            ＋ Agregar ({libres.length})
          </button>
          {elegido && modo === "mover" && (
            <button
              onClick={() => {
                enviar?.({ tipo: "pizarraQuitar", item: elegido });
                setElegido(null);
              }}
              className="rounded-lg border border-acento px-3 py-1.5 text-sm text-acento"
            >
              Quitar de la pizarra
            </button>
          )}
          <span className="text-xs text-suave">{modo === "conectar" ? (elegido ? "Ahora tocá la otra tarjeta" : "Tocá dos tarjetas para unirlas con un hilo (otra vez lo corta)") : "Arrastrá las tarjetas para acomodarlas"}</span>
        </div>
      )}

      {agregando && !soloLectura && (
        <div className="mb-3 max-h-64 overflow-y-auto rounded-xl border border-borde bg-panel p-2">
          {libres.length === 0 && <p className="p-2 text-sm text-suave">Ya está todo en la pizarra.</p>}
          <div className="grid gap-1 sm:grid-cols-2">
            {libres.map((c) => (
              <button
                key={`${c.ref.tipo}-${c.ref.id}`}
                onClick={() => enviar?.({ tipo: "pizarraColocar", ref: c.ref, ...lugarLibre(pz.items) })}
                className="truncate rounded-lg px-2 py-1.5 text-left text-sm hover:bg-panel-2"
              >
                {c.etiqueta.icono} {c.etiqueta.titulo}
              </button>
            ))}
          </div>
        </div>
      )}

      <div ref={tablero} className="corcho relative w-full touch-none overflow-hidden rounded-xl" style={{ height: alto }}>
        <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
          {pz.hilos.map((h) => {
            const a = posicion(h.a);
            const b = posicion(h.b);
            if (!a || !b) return null;
            const caida = Math.min(14, Math.hypot(a.x - b.x, a.y - b.y) * 0.18);
            return (
              <path
                key={h.id}
                d={`M${a.x},${a.y} Q${(a.x + b.x) / 2},${(a.y + b.y) / 2 + caida} ${b.x},${b.y}`}
                fill="none"
                stroke="#b3171c"
                strokeWidth="2.2"
                vectorEffect="non-scaling-stroke"
                className="hilo"
              />
            );
          })}
        </svg>
        {items.length === 0 && <p className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-black/60">Agregá pruebas, personajes y descubrimientos, y conectalos con hilos.</p>}
        {items.map((i, n) => (
          <div
            key={i.id}
            onPointerDown={(e) => {
              if (soloLectura || modo !== "mover") return;
              (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
              setArrastre({ id: i.id, x: i.x, y: i.y, movio: false });
            }}
            onPointerMove={(e) => {
              if (arrastre?.id !== i.id) return;
              const p = aPorcentaje(e);
              setArrastre({ id: i.id, x: Math.min(97, Math.max(3, p.x)), y: Math.min(95, Math.max(5, p.y)), movio: true });
            }}
            onPointerUp={() => {
              if (arrastre?.id === i.id && arrastre.movio) enviar?.({ tipo: "pizarraMover", item: i.id, x: arrastre.x, y: arrastre.y });
              else tocar(i.id);
              setArrastre(null);
            }}
            onPointerCancel={() => setArrastre(null)}
            className={`papel tarjeta-pizarra absolute select-none px-2 pt-3 pb-2 leading-snug ${soloLectura ? "w-48 text-sm xl:w-56 xl:text-base" : "w-32 text-[11px] sm:w-40 sm:text-xs"} ${
              soloLectura ? "" : modo === "mover" ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"
            } ${elegido === i.id ? "ring-2 ring-acento" : ""}`}
            style={{ left: `${i.x}%`, top: `${i.y}%`, transform: `translate(-50%, -50%) rotate(${((n * 37) % 7) - 3}deg)`, zIndex: arrastre?.id === i.id ? 20 : 1 }}
          >
            <span className="chinche" aria-hidden />
            <span className="line-clamp-4 block">
              {i.etiqueta!.icono} {i.etiqueta!.titulo}
            </span>
            {i.etiqueta!.detalle && <span className="block opacity-60">{i.etiqueta!.detalle}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

/** "Sáb 22:07" → número ordenable. Sin día, va según la hora. */
function claveHora(hora: string) {
  const dias = ["sab", "dom", "lun", "mar", "mie", "jue", "vie"];
  const h = hora.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const dia = dias.findIndex((d) => h.includes(d));
  const m = h.match(/(\d{1,2})[:.](\d{2})/);
  return (dia < 0 ? 0 : dia) * 1440 + (m ? Number(m[1]) * 60 + Number(m[2]) : 0);
}

/** Línea de tiempo compartida: cualquier cosa del expediente con una hora, ordenada sola. */
export function LineaDeTiempo({ vista, enviar, soloLectura }: { vista: VistaPartida; enviar?: Enviar; soloLectura?: boolean }) {
  const opciones = candidatos(vista);
  const [elegido, setElegido] = useState(0);
  const [hora, setHora] = useState("");
  const entradas = vista.pizarra.linea
    .map((l) => ({ ...l, etiqueta: etiquetar(l.ref, vista) }))
    .filter((l) => l.etiqueta)
    .sort((a, b) => claveHora(a.hora) - claveHora(b.hora));

  return (
    <div>
      {!soloLectura && (
        <form
          className="mb-4 flex flex-col gap-2 rounded-xl border border-borde bg-panel p-3 sm:flex-row"
          onSubmit={async (e) => {
            e.preventDefault();
            const o = opciones[elegido];
            if (!o) return;
            // se limpia enseguida para poder seguir cargando; si falla, se recupera lo escrito
            const escrita = hora;
            setHora("");
            if (!(await enviar?.({ tipo: "lineaAgregar", ref: o.ref, hora: escrita }))) setHora(escrita);
          }}
        >
          <select value={elegido} onChange={(e) => setElegido(Number(e.target.value))} className="min-w-0 flex-1 rounded-lg border border-borde bg-panel-2 px-3 py-2 text-sm" aria-label="Qué sumar a la línea de tiempo">
            {opciones.map((o, i) => (
              <option key={`${o.ref.tipo}-${o.ref.id}`} value={i}>
                {o.etiqueta.icono} {o.etiqueta.titulo.slice(0, 70)}
              </option>
            ))}
          </select>
          <input value={hora} onChange={(e) => setHora(e.target.value)} placeholder="Dom 23:12" aria-label="Hora" className="w-full rounded-lg border border-borde bg-panel-2 px-3 py-2 text-sm sm:w-32" />
          <button disabled={!hora.trim() || !opciones.length} className="rounded-lg bg-acento px-4 py-2 text-sm font-semibold text-acento-texto disabled:opacity-40">
            Sumar
          </button>
        </form>
      )}
      {entradas.length === 0 && <p className="text-sm text-suave">Sumá hechos con su hora para reconstruir la noche.</p>}
      <ol className="relative space-y-3 border-l-2 border-acento/50 pl-6">
        {entradas.map((l) => (
          <li key={l.id} className="aparecer relative">
            <span className="absolute -left-[31px] top-2 h-3 w-3 rounded-full bg-acento" />
            <div className="flex items-start gap-3 rounded-xl border border-borde bg-panel p-3">
              <span className="shrink-0 rounded bg-panel-2 px-2 py-0.5 font-mono text-xs">{l.hora}</span>
              <span className="min-w-0 flex-1 text-sm">
                {l.etiqueta!.icono} {l.etiqueta!.titulo}
              </span>
              {!soloLectura && (
                <button onClick={() => enviar?.({ tipo: "lineaQuitar", id: l.id })} className="shrink-0 text-xs text-suave hover:text-acento" aria-label="Quitar de la línea de tiempo">
                  ✕
                </button>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
