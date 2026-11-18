import { connection } from "next/server";
import { Suspense } from "react";
import type { Caso } from "@/casos/schema";
import { Inicio } from "@/componentes/Inicio";
import { casoDeAutor, casosPublicados, PREFIJO_AUTOR } from "@/servidor/casosAutor";
import { oficialesParaCatalogo } from "@/servidor/casosOficiales";

const resumen = (c: Caso, prueba = false) => ({ ...c.meta, ambientacion: c.ambientacion, modos: c.modos, prueba });

export default function Pagina({ searchParams }: PageProps<"/">) {
  return (
    <Suspense fallback={<main className="mx-auto max-w-5xl px-4 py-14 text-suave">Cargando casos…</main>}>
      <Catalogo searchParams={searchParams} />
    </Suspense>
  );
}

/** Los casos oficiales, los de autores publicados y, si vino por link (?caso=autor-…), uno privado de prueba. */
async function Catalogo({ searchParams }: Pick<PageProps<"/">, "searchParams">) {
  // los casos publicados cambian sin deploy: se leen en cada pedido
  await connection();
  const { caso } = await searchParams;
  const [oficiales, publicados, privado] = await Promise.all([
    oficialesParaCatalogo(),
    casosPublicados(),
    typeof caso === "string" && caso.startsWith(PREFIJO_AUTOR) ? casoDeAutor(caso).catch(() => null) : null,
  ]);
  const casos = [...oficiales, ...publicados].map((c) => resumen(c));
  if (privado && !casos.some((c) => c.id === privado.caso.meta.id)) casos.unshift(resumen(privado.caso, privado.dePrueba));
  return <Inicio casos={casos} inicial={casos.find((c) => c.id === caso)?.id} />;
}
