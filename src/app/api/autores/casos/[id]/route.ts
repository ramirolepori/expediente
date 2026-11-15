import { connection } from "next/server";
import { autorDelPedido } from "@/servidor/autores";
import { accionAutor, borrarCaso, confirmarCaso, detalleCaso } from "@/servidor/casosAutor";
import { ErrorSala, respuestaError } from "@/servidor/salas";

export async function GET(req: Request, ctx: RouteContext<"/api/autores/casos/[id]">) {
  await connection();
  try {
    const { id } = await ctx.params;
    return Response.json(await detalleCaso(await autorDelPedido(req), id));
  } catch (e) {
    return respuestaError(e);
  }
}

const ACCIONES = ["confirmar", "probar", "pedir_publicacion", "retirar"] as const;

/** confirmar (después de subir las imágenes), probar (link privado), pedir_publicacion o retirar. */
export async function POST(req: Request, ctx: RouteContext<"/api/autores/casos/[id]">) {
  try {
    const autor = await autorDelPedido(req);
    const { id } = await ctx.params;
    const { accion } = (await req.json()) as { accion?: string };
    if (!ACCIONES.includes(accion as (typeof ACCIONES)[number])) throw new ErrorSala("Acción desconocida");
    if (accion === "confirmar") await confirmarCaso(autor, id);
    else await accionAutor(autor, id, accion as "probar" | "pedir_publicacion" | "retirar");
    return Response.json(await detalleCaso(autor, id));
  } catch (e) {
    return respuestaError(e);
  }
}

export async function DELETE(req: Request, ctx: RouteContext<"/api/autores/casos/[id]">) {
  try {
    const { id } = await ctx.params;
    await borrarCaso(await autorDelPedido(req), id);
    return Response.json({ ok: true });
  } catch (e) {
    return respuestaError(e);
  }
}
