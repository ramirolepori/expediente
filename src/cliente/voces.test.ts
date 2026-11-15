import { describe, expect, it } from "vitest";
import type { Conexion } from "@/motor/tipos";
import { oraciones, suenaAca, textoHablado, wav } from "./voces";

const c = (id: string, tipo: Conexion["tipo"], anfitrion = false): Conexion => ({ id, tipo, apodo: id, color: "#000", anfitrion, ultimaVez: 0 });
const ana = c("ana", "jugador", true);
const beto = c("beto", "jugador");
const tele = c("tv", "pantalla");

describe("voces", () => {
  it("con audio en la compartida suena solo la tele, o el anfitrión si no hay tele", () => {
    expect(suenaAca("compartida", tele, [ana, beto, tele])).toBe(true);
    expect(suenaAca("compartida", ana, [ana, beto, tele])).toBe(false);
    expect(suenaAca("compartida", ana, [ana, beto])).toBe(true);
    expect(suenaAca("compartida", beto, [ana, beto])).toBe(false);
    const tele2 = c("aa", "pantalla");
    expect(suenaAca("compartida", tele, [ana, tele, tele2])).toBe(false);
  });

  it("sin voces no suena nadie", () => {
    expect(suenaAca("nadie", tele, [ana, tele])).toBe(false);
    expect(suenaAca("nadie", ana, [ana], "ana")).toBe(false);
  });

  it("con audio en quien interroga suena solo el autor de la pregunta", () => {
    expect(suenaAca("interrogador", beto, [ana, beto, tele], "beto")).toBe(true);
    expect(suenaAca("interrogador", ana, [ana, beto, tele], "beto")).toBe(false);
    expect(suenaAca("interrogador", tele, [ana, beto, tele])).toBe(false);
    expect(suenaAca("interrogador", ana, [ana, beto])).toBe(true);
  });

  it("no lee los gestos ni las marcas de formato", () => {
    expect(textoHablado("*Se acomoda la corbata.* No sé de qué **me** habla.")).toBe("No sé de qué me habla.");
    expect(oraciones("Hola. ¿Qué querés? Nada… bueno")).toEqual(["Hola.", "¿Qué querés?", "Nada…", "bueno"]);
  });

  it("arma un WAV mono de 16 bits", async () => {
    const b = new Uint8Array(await wav(new Float32Array([0, 1, -1]), 22050).arrayBuffer());
    expect(b.length).toBe(44 + 6);
    expect(String.fromCharCode(...b.slice(0, 4))).toBe("RIFF");
    const v = new DataView(b.buffer);
    expect(v.getUint32(24, true)).toBe(22050);
    expect(v.getInt16(46, true)).toBe(0x7fff);
  });
});
