import { vistaPara } from "@/motor/vista";
import { almacen, type Sala } from "@/servidor/almacen";
import { autenticar, respuestaError } from "@/servidor/salas";


/** Stream SSE con la vista filtrada para esta conexión, cada vez que la sala cambia. */
export async function GET(req: Request, ctx: RouteContext<"/api/salas/[codigo]/eventos">) {
  try {
    const { codigo } = await ctx.params;
    if (almacen.tipo !== "memoria") return Response.json({ error: "Usar Realtime" }, { status: 410 });
    const token = new URL(req.url).searchParams.get("token");
    const { conexionId, caso, sala } = await autenticar(codigo, token);
    const enc = new TextEncoder();
    let cerrar = () => {};
    const stream = new ReadableStream({
      start(controller) {
        const enviar = (s: Sala) => {
          try {
            controller.enqueue(enc.encode(`data: ${JSON.stringify(vistaPara(caso, s.estado, conexionId))}\n\n`));
          } catch {
            cerrar();
          }
        };
        enviar(sala);
        const desuscribir = almacen.suscribir(codigo, enviar);
        const ping = setInterval(() => {
          try {
            controller.enqueue(enc.encode(`: ping\n\n`));
          } catch {
            cerrar();
          }
        }, 20000);
        cerrar = () => {
          clearInterval(ping);
          desuscribir();
        };
        req.signal.addEventListener("abort", () => {
          cerrar();
          try {
            controller.close();
          } catch {}
        });
      },
      cancel() {
        cerrar();
      },
    });
    return new Response(stream, {
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive" },
    });
  } catch (e) {
    return respuestaError(e);
  }
}
