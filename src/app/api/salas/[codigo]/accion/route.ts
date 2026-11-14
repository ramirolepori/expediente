import { aplicar } from "@/motor/reductor";
import type { Accion } from "@/motor/tipos";
import { almacen } from "@/servidor/almacen";
import { autenticar, respuestaError } from "@/servidor/salas";

export async function POST(req: Request, ctx: RouteContext<"/api/salas/[codigo]/accion">) {
  try {
    const { codigo } = await ctx.params;
    const { token, accion } = (await req.json()) as { token: string; accion: Accion };
    const { conexionId, caso } = await autenticar(codigo, token);
    await almacen.actualizar(codigo, (s) => {
      const estado = aplicar(s.estado, accion, conexionId, caso);
      return estado === s.estado ? s : { ...s, estado };
    });
    return Response.json({ ok: true });
  } catch (e) {
    return respuestaError(e);
  }
}
