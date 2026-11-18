import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { raizArchivados } from "@/casos/archivados";
import { CASOS_OFICIALES } from "@/casos/oficiales";
import { usaCasosLocales } from "@/servidor/casosOficiales";

const TIPOS = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" } as const;

export async function GET(_req: Request, ctx: RouteContext<"/api/casos-locales/[id]/[...ruta]">) {
  const { id, ruta } = await ctx.params;
  const oficial = CASOS_OFICIALES.find((c) => c.id === id);
  const extension = ruta.at(-1)?.split(".").at(-1) as keyof typeof TIPOS;
  if (!usaCasosLocales() || !oficial || !ruta.every((parte) => /^[\w-]+(?:\.[\w-]+)?$/.test(parte)) || !Object.hasOwn(TIPOS, extension)) {
    return new Response(null, { status: 404 });
  }
  const bytes = await readFile(join(raizArchivados(), "public", "casos", oficial.carpeta, ...ruta)).catch(() => null);
  return bytes ? new Response(new Uint8Array(bytes), { headers: { "Content-Type": TIPOS[extension] } }) : new Response(null, { status: 404 });
}
