import { listarCasos } from "@/casos/registro";

export async function GET() {
  return Response.json(
    listarCasos().map((c) => ({ ...c.meta, ambientacion: c.ambientacion, modos: c.modos })),
  );
}
