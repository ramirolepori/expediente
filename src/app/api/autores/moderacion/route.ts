import { connection } from "next/server";
import { autorDelPedido } from "@/servidor/autores";
import { casosParaModerar } from "@/servidor/casosAutor";
import { respuestaError } from "@/servidor/salas";

/** Casos que piden publicarse y los ya publicados: solo para moderadores y administradores. */
export async function GET(req: Request) {
  await connection();
  try {
    return Response.json(await casosParaModerar(await autorDelPedido(req)));
  } catch (e) {
    return respuestaError(e);
  }
}
