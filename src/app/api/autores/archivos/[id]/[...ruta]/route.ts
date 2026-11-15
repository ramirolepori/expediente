import { connection } from "next/server";
import { datosFalsos } from "@/servidor/casosAutor";

/**
 * Solo con el login falso (tests y desarrollo): hace de Storage para las imágenes de los casos de autores.
 * En producción las imágenes van a Supabase Storage y esta ruta responde 404.
 */
const TIPOS: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };
const MAX = 3 * 1024 * 1024;

export async function GET(_req: Request, ctx: RouteContext<"/api/autores/archivos/[id]/[...ruta]">) {
  await connection();
  const d = datosFalsos();
  const { id, ruta } = await ctx.params;
  const a = d?.archivos.get(`${id}/${ruta.join("/")}`);
  if (!a) return new Response(null, { status: 404 });
  return new Response(new Blob([a.bytes as BlobPart]), { headers: { "Content-Type": a.tipo } });
}

export async function PUT(req: Request, ctx: RouteContext<"/api/autores/archivos/[id]/[...ruta]">) {
  const d = datosFalsos();
  const { id, ruta } = await ctx.params;
  const camino = `${id}/${ruta.join("/")}`;
  const firma = new URL(req.url).searchParams.get("firma") ?? "";
  if (!d || d.firmas.get(firma) !== camino) return new Response(null, { status: 403 });
  const tipo = TIPOS[camino.split(".").pop()!.toLowerCase()];
  const bytes = new Uint8Array(await req.arrayBuffer());
  if (!tipo || bytes.length > MAX) return new Response(null, { status: 400 });
  d.archivos.set(camino, { tipo, bytes });
  return Response.json({ ok: true });
}
