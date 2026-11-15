"use client";

import dynamic from "next/dynamic";

// la partida de ejemplo usa la hora actual: se arma solo en el navegador
const PizarraLaboratorio = dynamic(() => import("./PizarraLaboratorio"), { ssr: false, loading: () => <p className="p-8 text-suave">Cargando…</p> });

export default function Pagina() {
  return <PizarraLaboratorio />;
}
