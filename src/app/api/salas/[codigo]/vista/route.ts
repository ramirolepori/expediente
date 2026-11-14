import { vistaPara } from "@/motor/vista";
import { autenticar, respuestaError } from "@/servidor/salas";

/** Vista filtrada para esta conexión. El cliente la pide cada vez que Realtime avisa un cambio. */
export async function GET(req: Request, ctx: RouteContext<"/api/salas/[codigo]/vista">) {
  try {
    const { codigo } = await ctx.params;
    const token = new URL(req.url).searchParams.get("token");
    const { conexionId, caso, sala } = await autenticar(codigo, token);
    return Response.json(vistaPara(caso, sala.estado, conexionId), { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return respuestaError(e);
  }
}
