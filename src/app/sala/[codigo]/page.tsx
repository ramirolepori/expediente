import { Suspense } from "react";
import { Sala } from "@/componentes/Sala";

async function Contenido({ params, searchParams }: PageProps<"/sala/[codigo]">) {
  const { codigo } = await params;
  const sp = await searchParams;
  return <Sala codigo={codigo.toUpperCase()} tipo={sp.pantalla !== undefined ? "pantalla" : "jugador"} />;
}

export default function PaginaSala(props: PageProps<"/sala/[codigo]">) {
  return (
    <Suspense fallback={<p className="p-8 text-center text-suave">Cargando…</p>}>
      <Contenido {...props} />
    </Suspense>
  );
}
