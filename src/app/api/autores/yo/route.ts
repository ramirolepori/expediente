import { connection } from "next/server";
import { autorDelPedido } from "@/servidor/autores";
import { respuestaError } from "@/servidor/salas";

/** El autor de la sesión, con su rol. */
export async function GET(req: Request) {
  // sin prerender: depende del token de cada pedido
  await connection();
  try {
    return Response.json(await autorDelPedido(req));
  } catch (e) {
    return respuestaError(e);
  }
}
