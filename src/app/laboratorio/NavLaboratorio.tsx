"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const PAGINAS = [
  { href: "/laboratorio", nombre: "Índice" },
  { href: "/laboratorio/personaje", nombre: "Personaje animado" },
  { href: "/laboratorio/ambientaciones", nombre: "Ambientaciones" },
  { href: "/laboratorio/minijuegos", nombre: "Minijuegos" },
];

export function NavLaboratorio() {
  const ruta = usePathname();
  return (
    <nav className="sticky top-0 z-50 border-b border-borde bg-bg/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center gap-1 overflow-x-auto px-4 py-2 text-sm">
        <Link href="/" className="mr-3 shrink-0 text-xs font-semibold uppercase tracking-[0.25em] text-acento">
          ← Expediente
        </Link>
        {PAGINAS.map((p) => (
          <Link
            key={p.href}
            href={p.href}
            className={`shrink-0 rounded-full px-3 py-1.5 ${ruta === p.href ? "bg-acento text-acento-texto" : "text-suave hover:bg-panel-2 hover:text-texto"}`}
          >
            {p.nombre}
          </Link>
        ))}
      </div>
    </nav>
  );
}
