/**
 * Lectura de imágenes para el validador: qué formato es de verdad (por sus primeros bytes, no por la extensión)
 * y qué tamaño tiene. Alcanza con la cabecera del archivo, así el navegador no tiene que subir la imagen entera.
 */
export type Formato = "png" | "jpg" | "webp";

export interface InfoImagen {
  formato: Formato | null;
  ancho?: number;
  alto?: number;
}

/** Cuántos bytes del principio de cada imagen hacen falta para leer formato y tamaño. */
export const BYTES_CABECERA = 32 * 1024;

const u16be = (b: Uint8Array, i: number) => (b[i]! << 8) | b[i + 1]!;
const u32be = (b: Uint8Array, i: number) => ((b[i]! << 24) >>> 0) + (b[i + 1]! << 16) + (b[i + 2]! << 8) + b[i + 3]!;
const u16le = (b: Uint8Array, i: number) => b[i]! | (b[i + 1]! << 8);
const u24le = (b: Uint8Array, i: number) => b[i]! | (b[i + 1]! << 8) | (b[i + 2]! << 16);
const ascii = (b: Uint8Array, i: number, n: number) => String.fromCharCode(...b.subarray(i, i + n));

export function leerImagen(b: Uint8Array): InfoImagen {
  if (b.length >= 24 && u32be(b, 0) === 0x89504e47 && ascii(b, 12, 4) === "IHDR") {
    return { formato: "png", ancho: u32be(b, 16), alto: u32be(b, 20) };
  }
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) {
    // se recorren los segmentos hasta el que trae el tamaño (SOF), salteando los de datos
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) return { formato: "jpg" };
      const marca = b[i + 1]!;
      if (marca === 0xff) {
        i++;
        continue;
      }
      if (marca >= 0xc0 && marca <= 0xcf && marca !== 0xc4 && marca !== 0xc8 && marca !== 0xcc) {
        return { formato: "jpg", alto: u16be(b, i + 5), ancho: u16be(b, i + 7) };
      }
      i += 2 + u16be(b, i + 2);
    }
    return { formato: "jpg" };
  }
  if (b.length >= 30 && ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 4) === "WEBP") {
    const trozo = ascii(b, 12, 4);
    if (trozo === "VP8 ") return { formato: "webp", ancho: u16le(b, 26) & 0x3fff, alto: u16le(b, 28) & 0x3fff };
    if (trozo === "VP8L") {
      const bits = b[21]! | (b[22]! << 8) | (b[23]! << 16) | (b[24]! << 24);
      return { formato: "webp", ancho: (bits & 0x3fff) + 1, alto: ((bits >> 14) & 0x3fff) + 1 };
    }
    if (trozo === "VP8X") return { formato: "webp", ancho: u24le(b, 24) + 1, alto: u24le(b, 27) + 1 };
    return { formato: "webp" };
  }
  return { formato: null };
}

export function extension(ruta: string) {
  const e = ruta.split(".").pop()?.toLowerCase() ?? "";
  return e === "jpeg" ? "jpg" : e;
}
