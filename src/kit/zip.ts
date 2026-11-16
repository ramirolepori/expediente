/**
 * Un .zip mínimo sin compresión (método "stored"): alcanza para un kit de textos y evita una dependencia.
 * La fecha de los archivos es fija, así el mismo contenido da siempre el mismo zip.
 */
const TABLA = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(datos: Uint8Array) {
  let c = 0xffffffff;
  for (const b of datos) c = TABLA[(c ^ b) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

export function zip(archivos: Record<string, string | Uint8Array>): Uint8Array {
  const enc = new TextEncoder();
  const locales: Uint8Array[] = [];
  const centrales: Uint8Array[] = [];
  let offset = 0;
  const FECHA = (1 << 5) | 1; // 1980-01-01
  for (const [nombre, contenido] of Object.entries(archivos)) {
    const datos = typeof contenido === "string" ? enc.encode(contenido) : contenido;
    const nom = enc.encode(nombre);
    const crc = crc32(datos);
    const local = new Uint8Array(30 + nom.length);
    const l = new DataView(local.buffer);
    l.setUint32(0, 0x04034b50, true);
    l.setUint16(4, 20, true);
    l.setUint16(6, 0x0800, true); // nombres en UTF-8
    l.setUint16(12, FECHA, true);
    l.setUint32(14, crc, true);
    l.setUint32(18, datos.length, true);
    l.setUint32(22, datos.length, true);
    l.setUint16(26, nom.length, true);
    local.set(nom, 30);
    const central = new Uint8Array(46 + nom.length);
    const c = new DataView(central.buffer);
    c.setUint32(0, 0x02014b50, true);
    c.setUint16(4, 20, true);
    c.setUint16(6, 20, true);
    c.setUint16(8, 0x0800, true);
    c.setUint16(14, FECHA, true);
    c.setUint32(16, crc, true);
    c.setUint32(20, datos.length, true);
    c.setUint32(24, datos.length, true);
    c.setUint16(28, nom.length, true);
    c.setUint32(42, offset, true);
    central.set(nom, 46);
    locales.push(local, datos);
    centrales.push(central);
    offset += local.length + datos.length;
  }
  const tamCentral = centrales.reduce((n, x) => n + x.length, 0);
  const fin = new Uint8Array(22);
  const f = new DataView(fin.buffer);
  f.setUint32(0, 0x06054b50, true);
  f.setUint16(8, centrales.length, true);
  f.setUint16(10, centrales.length, true);
  f.setUint32(12, tamCentral, true);
  f.setUint32(16, offset, true);
  const partes = [...locales, ...centrales, fin];
  const out = new Uint8Array(partes.reduce((n, x) => n + x.length, 0));
  partes.reduce((o, x) => (out.set(x, o), o + x.length), 0);
  return out;
}
