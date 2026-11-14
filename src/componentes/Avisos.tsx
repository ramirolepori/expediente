"use client";

import { useEffect, useState } from "react";
import type { VistaPartida } from "@/motor/vista";

interface Aviso {
  id: string;
  icono: string;
  titulo: string;
  texto: string;
}

const DURACION_MS = 6000;

/** Detecta lo que apareció entre una vista y la siguiente: pruebas, descubrimientos y candados abiertos. */
function novedades(antes: VistaPartida, ahora: VistaPartida): Aviso[] {
  if (antes.fase !== "jugando" || ahora.fase !== "jugando") return [];
  const out: Aviso[] = [];
  const pruebasAntes = new Set(antes.pruebas.map((p) => p.id));
  const nuevas = ahora.pruebas.filter((p) => !pruebasAntes.has(p.id));
  const sobre = ahora.sobres.find((x) => x.abierto && !antes.sobres.find((y) => y.id === x.id)?.abierto);
  if (sobre && nuevas.length > 1) {
    // abrir un sobre trae muchas pruebas juntas: un solo aviso en lugar de una pila
    out.push({ id: `s-${sobre.id}`, icono: "📂", titulo: sobre.titulo, texto: `${nuevas.length} pruebas nuevas en el expediente` });
  } else {
    for (const p of nuevas) out.push({ id: `p-${p.id}`, icono: "📎", titulo: "Nueva prueba", texto: p.titulo });
  }
  const hechosAntes = new Set(antes.descubrimientos.map((h) => h.id));
  for (const h of ahora.descubrimientos) {
    if (!hechosAntes.has(h.id)) out.push({ id: `h-${h.id}`, icono: "📌", titulo: "Descubrimiento", texto: h.texto });
  }
  const abiertosAntes = new Set(antes.candados.filter((c) => c.abierto).map((c) => c.id));
  for (const c of ahora.candados) {
    if (c.abierto && !abiertosAntes.has(c.id)) out.push({ id: `c-${c.id}`, icono: "🔓", titulo: "Candado abierto", texto: c.titulo });
  }
  return out;
}

export function Avisos({ vista, grande }: { vista: VistaPartida; grande?: boolean }) {
  const [anterior, setAnterior] = useState(vista);
  const [avisos, setAvisos] = useState<Aviso[]>([]);

  // ajuste de estado al cambiar la vista (patrón recomendado por React en lugar de un efecto)
  if (vista !== anterior) {
    const nuevos = novedades(anterior, vista);
    setAnterior(vista);
    if (nuevos.length) setAvisos((a) => [...a.filter((x) => !nuevos.some((n) => n.id === x.id)), ...nuevos].slice(-4));
  }

  if (!avisos.length) return null;
  return (
    <div
      className={`pointer-events-none fixed inset-x-0 z-50 flex flex-col items-center gap-2 px-4 ${grande ? "bottom-8" : "top-14 lg:left-56"}`}
      aria-live="polite"
    >
      {avisos.map((a) => (
        <Tarjeta key={a.id} aviso={a} grande={grande} onFin={() => setAvisos((x) => x.filter((y) => y.id !== a.id))} />
      ))}
    </div>
  );
}

function Tarjeta({ aviso: a, grande, onFin }: { aviso: Aviso; grande?: boolean; onFin: () => void }) {
  useEffect(() => {
    const t = setTimeout(onFin, DURACION_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <button
      onClick={onFin}
      className={`aviso pointer-events-auto flex w-full items-start gap-3 rounded-xl border border-acento/60 bg-panel/95 text-left shadow-2xl backdrop-blur ${grande ? "max-w-2xl p-5" : "max-w-md p-3"}`}
    >
      <span className={grande ? "text-4xl" : "text-2xl"}>{a.icono}</span>
      <span className="min-w-0">
        <span className={`block font-semibold text-acento ${grande ? "text-xl" : "text-sm"}`}>{a.titulo}</span>
        <span className={`line-clamp-2 ${grande ? "text-2xl" : "text-sm"}`}>{a.texto}</span>
      </span>
    </button>
  );
}
