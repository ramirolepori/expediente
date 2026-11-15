import { connection } from "next/server";
import { autorDelPedido } from "@/servidor/autores";
import { guardarCaso, misCasos } from "@/servidor/casosAutor";
import { ErrorSala, respuestaError } from "@/servidor/salas";

/** Los casos del autor que hace el pedido. */
export async function GET(req: Request) {
  await connection();
  try {
    return Response.json({ casos: await misCasos(await autorDelPedido(req)) });
  } catch (e) {
    return respuestaError(e);
  }
}

/**
 * Sube un caso nuevo o reemplaza uno propio (con `id`). Llegan el caso.json, el REVISION.md opcional y la lista
 * de imágenes (ruta y peso); vuelven las URLs firmadas para subirlas directo a Storage. Después: confirmar.
 */
export async function POST(req: Request) {
  try {
    const autor = await autorDelPedido(req);
    const form = await req.formData();
    const texto = form.get("caso");
    if (typeof texto !== "string" || !texto.trim()) throw new ErrorSala("Falta el caso.json");
    const rutas = leerLista(form.get("rutas"));
    const pesos = leerLista(form.get("pesos"));
    if (rutas.length !== pesos.length || rutas.some((r) => typeof r !== "string") || pesos.some((p) => typeof p !== "number")) throw new ErrorSala("Los archivos llegaron incompletos");
    const id = form.get("id");
    const revision = form.get("revision");
    const r = await guardarCaso(autor, {
      id: typeof id === "string" && id ? id : undefined,
      texto,
      revisionMd: typeof revision === "string" ? revision : null,
      archivos: rutas.map((ruta, i) => ({ ruta: ruta as string, peso: pesos[i] as number })),
    });
    return Response.json(r);
  } catch (e) {
    return respuestaError(e);
  }
}

function leerLista(valor: FormDataEntryValue | null): unknown[] {
  try {
    const v = JSON.parse(String(valor ?? "[]"));
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
