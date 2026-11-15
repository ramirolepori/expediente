import type { Conexion, DondeSuena } from "@/motor/tipos";

/**
 * Una sola pista (ADR 0009): decide si este dispositivo pone la voz.
 * Sin `autor` responde si este dispositivo puede llegar a sonar (para mostrar el botón).
 */
export function suenaAca(audioEn: DondeSuena, yo: Conexion, conexiones: Conexion[], autor?: string): boolean {
  if (audioEn === "nadie") return false;
  if (audioEn === "todos") return true;
  if (audioEn === "interrogador") return yo.tipo === "jugador" && (autor === undefined || autor === yo.id);
  // compartida: la primera tele si hay alguna; si no hay tele, el anfitrión
  const tele = conexiones.filter((c) => c.tipo === "pantalla").sort((a, b) => a.id.localeCompare(b.id))[0];
  return tele ? tele.id === yo.id : yo.anfitrion;
}

/** Lo que se dice en voz alta: sin gestos entre asteriscos ni marcas de formato. */
export function textoHablado(texto: string): string {
  return texto
    .replace(/\*[^*]*\*/g, " ")
    .replace(/[*_#>`~]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Parte el texto en oraciones para que el fonemizador devuelva una sola línea por llamada. */
export function oraciones(texto: string): string[] {
  return (texto.match(/[^.!?…]+[.!?…]*/g) ?? []).map((s) => s.trim()).filter(Boolean);
}

/** Audio mono en float32 (-1..1) a un WAV de 16 bits. */
export function wav(pcm: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + pcm.length * 2);
  const v = new DataView(buffer);
  const texto = (offset: number, s: string) => [...s].forEach((c, i) => v.setUint8(offset + i, c.charCodeAt(0)));
  texto(0, "RIFF");
  v.setUint32(4, 36 + pcm.length * 2, true);
  texto(8, "WAVE");
  texto(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); // PCM
  v.setUint16(22, 1, true); // mono
  v.setUint32(24, sampleRate, true);
  v.setUint32(28, sampleRate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  texto(36, "data");
  v.setUint32(40, pcm.length * 2, true);
  pcm.forEach((x, i) => v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, x)) * 0x7fff, true));
  return new Blob([buffer], { type: "audio/wav" });
}
