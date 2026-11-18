import { almacen, INACTIVIDAD_MAXIMA_MS } from "@/servidor/almacen";
import { borrarVocesViejas } from "@/servidor/voces";

/**
 * Cron diario de Vercel (vercel.json): borra las salas abandonadas. Vercel manda `Authorization: Bearer $CRON_SECRET`.
 * También mantiene vivo Supabase Free, que pausa los proyectos con 7 días sin actividad: la consulta corre
 * todos los días aunque no haya nada para borrar. Por eso no hay un ping aparte.
 */
export async function GET(request: Request) {
  const secreto = process.env.CRON_SECRET;
  if (!secreto || request.headers.get("authorization") !== `Bearer ${secreto}`) {
    return new Response("No autorizado", { status: 401 });
  }
  const ahora = Date.now();
  const [borradas] = await Promise.all([almacen.borrarViejas(ahora - INACTIVIDAD_MAXIMA_MS), borrarVocesViejas(ahora)]);
  return Response.json({ borradas });
}
