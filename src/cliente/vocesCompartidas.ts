const camino = (codigo: string, mensaje: string) => `/api/salas/${codigo}/voz/${mensaje}`;

export async function enviarVoz(codigo: string, mensaje: string, token: string, audio: Blob) {
  const r = await fetch(camino(codigo, mensaje), {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: audio,
    signal: AbortSignal.timeout(15_000),
  });
  if (!r.ok) throw new Error(`No se pudo subir la voz (${r.status})`);
}

export async function descargarVoz(codigo: string, mensaje: string, token: string, signal: AbortSignal): Promise<string | Blob> {
  const r = await fetch(camino(codigo, mensaje), { headers: { Authorization: `Bearer ${token}` }, signal });
  if (!r.ok) throw new Error(`No se pudo cargar la voz (${r.status})`);
  if (r.headers.get("content-type")?.includes("application/json")) return (await r.json()).url;
  return r.blob();
}
