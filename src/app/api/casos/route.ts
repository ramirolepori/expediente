import { connection } from "next/server";
import { casosPublicados } from "@/servidor/casosAutor";
import { oficialesParaCatalogo } from "@/servidor/casosOficiales";

export async function GET() {
  await connection();
  const [oficiales, publicados] = await Promise.all([oficialesParaCatalogo(), casosPublicados()]);
  const casos = [...oficiales, ...publicados];
  return Response.json(casos.map((c) => ({ ...c.meta, ambientacion: c.ambientacion, modos: c.modos })));
}
