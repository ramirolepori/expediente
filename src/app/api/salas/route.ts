import { crearSala, respuestaError } from "@/servidor/salas";

export async function POST(req: Request) {
  try {
    const { casoId, config } = await req.json();
    const codigo = await crearSala(String(casoId), config);
    return Response.json({ codigo });
  } catch (e) {
    return respuestaError(e);
  }
}
