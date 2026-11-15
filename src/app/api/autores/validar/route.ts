import { autorDelPedido } from "@/servidor/autores";
import { ErrorSala, respuestaError } from "@/servidor/salas";
import { informeParaIA } from "@/motor/informe";
import { revisarCaso, type ArchivoPaquete } from "@/motor/validador";
import { BYTES_CABECERA } from "@/motor/validador-archivos";

const MAX_TEXTO_CASO = 1024 * 1024;
const MAX_ARCHIVOS = 100;

/**
 * Valida un caso de autor (ADR 0012). Llega el caso.json y, de cada imagen, su ruta, su peso y sus primeros bytes:
 * con eso alcanza para revisar formato y tamaño sin pasar el límite de 4,5 MB por pedido de Vercel.
 * shortcut: el peso lo informa el navegador; cuando las imágenes se suban a Storage, se revisan de nuevo allá.
 */
export async function POST(req: Request) {
  try {
    await autorDelPedido(req);
    const form = await req.formData();
    const texto = form.get("caso");
    if (typeof texto !== "string" || !texto.trim()) throw new ErrorSala("Falta el caso.json");
    if (texto.length > MAX_TEXTO_CASO) throw new ErrorSala("El caso.json es demasiado grande");

    const rutas = JSON.parse(String(form.get("rutas") ?? "[]")) as unknown;
    const pesos = JSON.parse(String(form.get("pesos") ?? "[]")) as unknown;
    const blobs = form.getAll("archivo");
    if (!Array.isArray(rutas) || !Array.isArray(pesos) || rutas.length !== blobs.length || pesos.length !== blobs.length) throw new ErrorSala("Los archivos llegaron incompletos");
    if (blobs.length > MAX_ARCHIVOS) throw new ErrorSala(`Son demasiados archivos: el máximo es ${MAX_ARCHIVOS}`);

    const archivos: Record<string, ArchivoPaquete> = {};
    for (let i = 0; i < blobs.length; i++) {
      const blob = blobs[i];
      if (!(blob instanceof Blob) || typeof rutas[i] !== "string" || typeof pesos[i] !== "number") throw new ErrorSala("Los archivos llegaron incompletos");
      archivos[rutas[i]] = { peso: pesos[i], cabecera: new Uint8Array(await blob.slice(0, BYTES_CABECERA).arrayBuffer()) };
    }

    let datos: unknown;
    try {
      datos = JSON.parse(texto);
    } catch (e) {
      const hallazgos = [{ capa: "forma" as const, nivel: "error" as const, donde: "caso.json", mensaje: `no es un JSON válido (${(e as Error).message})` }];
      return Response.json({ ok: false, hallazgos, informe: informeParaIA(hallazgos) });
    }
    const r = revisarCaso(datos, { origen: "autor", archivos });
    return Response.json({ ok: r.ok, titulo: r.caso?.meta.titulo ?? null, hallazgos: r.hallazgos, informe: informeParaIA(r.hallazgos, r.caso?.meta.titulo) });
  } catch (e) {
    return respuestaError(e);
  }
}
