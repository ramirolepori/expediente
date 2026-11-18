import { createClient } from "@supabase/supabase-js";
import { ErrorSala } from "./salas";

const LIMITE = 3 * 1024 * 1024;
const RETENCION_MS = 24 * 60 * 60 * 1000;
const memoria = new Map<string, { audio: Blob; creada: number }>();
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secreta = process.env.SUPABASE_SECRET_KEY;
const bucket = url && secreta
  ? createClient(url, secreta, { auth: { persistSession: false, autoRefreshToken: false } }).storage.from("voces-salas")
  : null;

export async function leerWav(req: Request) {
  if (req.headers.get("content-type") !== "audio/wav") throw new ErrorSala("Se esperaba audio WAV", 415);
  if (Number(req.headers.get("content-length")) > LIMITE) throw new ErrorSala("El audio supera los 3 MB", 413);
  const lector = req.body?.getReader();
  if (!lector) throw new ErrorSala("Falta el audio");
  const partes: Uint8Array<ArrayBuffer>[] = [];
  let bytes = 0;
  for (;;) {
    const { done, value } = await lector.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > LIMITE) {
      await lector.cancel();
      throw new ErrorSala("El audio supera los 3 MB", 413);
    }
    partes.push(value);
  }
  const blob = new Blob(partes, { type: "audio/wav" });
  const cabecera = new TextDecoder().decode(await blob.slice(0, 12).arrayBuffer());
  if (bytes <= 44 || !cabecera.startsWith("RIFF") || !cabecera.endsWith("WAVE")) {
    throw new ErrorSala("El WAV no es válido");
  }
  return blob;
}

export async function subirVoz(camino: string, audio: Blob) {
  if (!bucket) {
    if (!memoria.has(camino)) memoria.set(camino, { audio, creada: Date.now() });
    return;
  }
  const { error } = await bucket.upload(camino, audio, { contentType: audio.type, cacheControl: "0", upsert: false });
  // Si se cortó la red después de subir, el reintento puede publicar el mismo audio.
  if (error && error.status !== 409 && error.statusCode !== "Duplicate") throw error;
}

export async function vozParaReproducir(camino: string) {
  const headers = { "Cache-Control": "no-store" };
  if (!bucket) {
    const voz = memoria.get(camino);
    if (!voz) throw new ErrorSala("El audio no está disponible", 404);
    return new Response(voz.audio, { headers: { ...headers, "Content-Type": voz.audio.type } });
  }
  const { data, error } = await bucket.createSignedUrl(camino, 5 * 60);
  if (error) throw new ErrorSala("El audio no está disponible", 404);
  return Response.json({ url: data.signedUrl }, { headers });
}

export async function borrarVocesViejas(ahora = Date.now()) {
  const antesDe = ahora - RETENCION_MS;
  if (!bucket) {
    for (const [camino, voz] of memoria) if (voz.creada < antesDe) memoria.delete(camino);
    return;
  }
  const limit = 100;
  for (;;) {
    const { data, error } = await bucket.list("", { limit, sortBy: { column: "created_at", order: "asc" } });
    if (error) throw error;
    const viejas = data.filter((voz) => voz.created_at && Date.parse(voz.created_at) < antesDe).map((voz) => voz.name);
    if (viejas.length) {
      const { error } = await bucket.remove(viejas);
      if (error) throw error;
    }
    if (viejas.length < limit) return;
  }
}
