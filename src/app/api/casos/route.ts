import { connection } from "next/server";
import { listarCasos } from "@/casos/registro";
import { casosPublicados } from "@/servidor/casosAutor";

export async function GET() {
  await connection();
  const casos = [...listarCasos(), ...(await casosPublicados())];
  return Response.json(casos.map((c) => ({ ...c.meta, ambientacion: c.ambientacion, modos: c.modos })));
}
