import { respuestaError, unirse } from "@/servidor/salas";

export async function POST(req: Request, ctx: RouteContext<"/api/salas/[codigo]/unirse">) {
  try {
    const { codigo } = await ctx.params;
    const { apodo, tipo, token } = await req.json();
    const r = await unirse(codigo.toUpperCase(), String(apodo ?? ""), tipo === "pantalla" ? "pantalla" : "jugador", token);
    return Response.json(r);
  } catch (e) {
    return respuestaError(e);
  }
}
