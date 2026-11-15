import { listarCasos } from "@/casos/registro";
import { casosPublicados } from "@/servidor/casosAutor";

export async function GET() {
  const casos = [...listarCasos(), ...(await casosPublicados())];
  return Response.json(casos.map((c) => ({ ...c.meta, ambientacion: c.ambientacion, modos: c.modos })));
}
