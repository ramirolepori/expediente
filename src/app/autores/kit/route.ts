import { archivosDelKit } from "@/kit/kit";
import { zip } from "@/kit/zip";

/** Descarga del kit de autor. Sin datos por pedido: se genera una vez en el build de cada deploy. */
export function GET() {
  return new Response(new Blob([zip(archivosDelKit()) as BlobPart]), {
    headers: { "Content-Type": "application/zip", "Content-Disposition": 'attachment; filename="kit-autor-expediente.zip"' },
  });
}
