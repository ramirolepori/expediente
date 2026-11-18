import type { EstadoPartida } from "@/motor/tipos";
import { pantallaDeVoces } from "@/motor/voz";
import { almacen } from "@/servidor/almacen";
import { autenticarConexion, ErrorSala, respuestaError } from "@/servidor/salas";
import { leerWav, subirVoz, vozParaReproducir } from "@/servidor/voces";

type Contexto = RouteContext<"/api/salas/[codigo]/voz/[mensaje]">;

const respuesta = (estado: EstadoPartida, id: string) =>
  Object.values(estado.interrogatorios).flat().find((m) => m.id === id && m.de === "personaje");

async function autorizar(req: Request, ctx: Contexto) {
  const { codigo, mensaje } = await ctx.params;
  const token = req.headers.get("authorization")?.match(/^Bearer (\S+)$/i)?.[1] ?? null;
  const { sala, conexionId } = await autenticarConexion(codigo, token);
  const { estado } = sala;
  const tele = pantallaDeVoces(Object.values(estado.conexiones));
  if (estado.fase !== "jugando" || estado.config.audioEn !== "compartida" || !tele) {
    throw new ErrorSala("No hay voces para la pantalla", 403);
  }
  const yo = estado.conexiones[conexionId];
  if (req.method === "POST" ? yo.tipo !== "jugador" || !yo.anfitrion : conexionId !== tele.id) {
    throw new ErrorSala("Esta conexión no tiene acceso a ese audio", 403);
  }
  const m = respuesta(estado, mensaje);
  if (!m) throw new ErrorSala("No existe esa respuesta", 404);
  return { estado, mensaje: m, camino: `${estado.codigo}-${estado.creada}-${m.id}.wav` };
}

export async function POST(req: Request, ctx: Contexto) {
  try {
    const { estado, mensaje, camino } = await autorizar(req, ctx);
    if (!mensaje.audioCompartido) {
      await subirVoz(camino, await leerWav(req));
      await almacen.actualizar(estado.codigo, (sala) => {
        if (sala.estado.creada !== estado.creada || sala.estado.fase !== "jugando") return sala;
        const siguiente = structuredClone(sala.estado);
        const m = respuesta(siguiente, mensaje.id);
        if (!m || m.audioCompartido) return sala;
        m.audioCompartido = true;
        siguiente.version++;
        return { ...sala, estado: siguiente };
      });
    }
    return new Response(null, { status: 204 });
  } catch (e) {
    return respuestaError(e);
  }
}

export async function GET(req: Request, ctx: Contexto) {
  try {
    const { mensaje, camino } = await autorizar(req, ctx);
    if (!mensaje.audioCompartido) throw new ErrorSala("El audio todavía no está disponible", 404);
    return await vozParaReproducir(camino);
  } catch (e) {
    return respuestaError(e);
  }
}
