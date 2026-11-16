import { describe, expect, it } from "vitest";
import { crc32 as crc32Node } from "node:zlib";
import { revisarCaso } from "@/motor/validador";
import ejemplo from "./ejemplo/caso.json";
import { archivosDelKit } from "./kit";
import { crc32, zip } from "./zip";

describe("kit de autor", () => {
  it("el caso de ejemplo pasa el validador como un caso de autor, sin un solo hallazgo", () => {
    const r = revisarCaso(ejemplo, { origen: "autor", archivos: {} });
    expect(r.hallazgos).toEqual([]);
  });

  it("trae todo lo que promete el LEEME y el JSON Schema del contrato real", () => {
    const kit = archivosDelKit();
    for (const f of ["LEEME.md", "PROMPT-INICIAL.md", "GUIA.md", "PIEZAS.md", "REGLAS.md", "contrato-de-caso.md", "caso.schema.json", "ejemplo/caso.json", "ejemplo/REVISION.md", "SKILL.md"]) {
      expect(kit[`kit-autor-expediente/${f}`], f).toBeTruthy();
    }
    const schema = JSON.parse(kit["kit-autor-expediente/caso.schema.json"]!);
    expect(schema.required).toEqual(expect.arrayContaining(["version", "meta", "personajes", "sobres", "resolucion"]));
    expect(kit["kit-autor-expediente/PIEZAS.md"]).toContain("`quebrado`");
  });

  it("arma un zip que se puede leer", () => {
    const z = zip({ "a.txt": "hola", "b/c.txt": "chau" });
    const v = new DataView(z.buffer);
    expect(v.getUint32(0, true)).toBe(0x04034b50);
    expect(v.getUint32(z.length - 22, true)).toBe(0x06054b50);
    expect(v.getUint16(z.length - 22 + 10, true)).toBe(2);
    expect(crc32(new TextEncoder().encode("hola"))).toBe(crc32Node("hola"));
  });
});
