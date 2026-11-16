import { connection } from "next/server";
import { aplicarAtajo, informeAutor, type Atajo } from "@/motor/modoAutor";
import { almacen } from "@/servidor/almacen";
import { autorDelPedido } from "@/servidor/autores";
import { puedeUsarModoAutor } from "@/servidor/casosAutor";
import { autenticar, ErrorSala, respuestaError } from "@/servidor/salas";

/**
 * Modo autor de una sala de prueba (ADR 0012). Pide las dos cosas: estar en la sala (token de la conexión)
 * y la cuenta del autor del caso (Authorization). Devuelve la solución, así que nunca va en la vista.
 */
async function permiso(req: Request, codigo: string, token: string | null) {
  const [sala, autor] = await Promise.all([autenticar(codigo, token), autorDelPedido(req)]);
  if (!(await puedeUsarModoAutor(autor, sala.sala.estado.casoId))) throw new ErrorSala("El modo autor es solo para quien escribió el caso, y mientras no esté publicado", 403);
  return sala;
}

export async function GET(req: Request, ctx: RouteContext<"/api/salas/[codigo]/autor">) {
  await connection();
  try {
    const { codigo } = await ctx.params;
    const { sala, caso } = await permiso(req, codigo, new URL(req.url).searchParams.get("token"));
    return Response.json(informeAutor(caso, sala.estado), { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return respuestaError(e);
  }
}

const ATAJOS = ["abrirSobre", "revelarHecho", "abrirCandado", "resolverMinijuego", "serTraidor"];

export async function POST(req: Request, ctx: RouteContext<"/api/salas/[codigo]/autor">) {
  try {
    const { codigo } = await ctx.params;
    const { token, atajo } = (await req.json()) as { token?: string; atajo?: Atajo };
    if (!atajo || !ATAJOS.includes(atajo.tipo)) throw new ErrorSala("Atajo desconocido");
    const { conexionId, caso } = await permiso(req, codigo, token ?? null);
    await almacen.actualizar(codigo, (s) => {
      const estado = aplicarAtajo(s.estado, atajo, conexionId, caso);
      return estado === s.estado ? s : { ...s, estado };
    });
    return Response.json({ ok: true });
  } catch (e) {
    return respuestaError(e);
  }
}
