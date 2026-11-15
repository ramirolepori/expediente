import { connection } from "next/server";
import { agregarModerador, exigirAdmin, listarModeradores, quitarModerador } from "@/servidor/autores";
import { respuestaError } from "@/servidor/salas";

/** Moderadores: solo un administrador los ve y los cambia. */
export async function GET(req: Request) {
  // sin prerender: depende del token de cada pedido
  await connection();
  try {
    await exigirAdmin(req);
    return Response.json({ moderadores: await listarModeradores() });
  } catch (e) {
    return respuestaError(e);
  }
}

export async function POST(req: Request) {
  try {
    await exigirAdmin(req);
    const { email } = await req.json();
    await agregarModerador(String(email ?? ""));
    return Response.json({ moderadores: await listarModeradores() });
  } catch (e) {
    return respuestaError(e);
  }
}

export async function DELETE(req: Request) {
  try {
    await exigirAdmin(req);
    const { email } = await req.json();
    await quitarModerador(String(email ?? ""));
    return Response.json({ moderadores: await listarModeradores() });
  } catch (e) {
    return respuestaError(e);
  }
}
