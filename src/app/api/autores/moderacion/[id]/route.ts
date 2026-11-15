import { connection } from "next/server";
import { autorDelPedido } from "@/servidor/autores";
import { moderar, revisionDelCaso } from "@/servidor/casosAutor";
import { ErrorSala, respuestaError } from "@/servidor/salas";

/** El REVISION.md del caso (la solución explicada), para revisarlo antes de publicar. */
export async function GET(req: Request, ctx: RouteContext<"/api/autores/moderacion/[id]">) {
  await connection();
  try {
    const { id } = await ctx.params;
    return Response.json({ revision: await revisionDelCaso(await autorDelPedido(req), id) });
  } catch (e) {
    return respuestaError(e);
  }
}

const DECISIONES = ["publicar", "rechazar", "despublicar"] as const;

export async function POST(req: Request, ctx: RouteContext<"/api/autores/moderacion/[id]">) {
  try {
    const autor = await autorDelPedido(req);
    const { id } = await ctx.params;
    const { decision, nota } = (await req.json()) as { decision?: string; nota?: string };
    if (!DECISIONES.includes(decision as (typeof DECISIONES)[number])) throw new ErrorSala("Decisión desconocida");
    await moderar(autor, id, decision as (typeof DECISIONES)[number], typeof nota === "string" ? nota : undefined);
    return Response.json({ ok: true });
  } catch (e) {
    return respuestaError(e);
  }
}
