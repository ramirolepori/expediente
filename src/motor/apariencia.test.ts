import { describe, expect, it } from "vitest";
import { rasgosPara, aparienciaPublica } from "./apariencia";
import { leerRespuesta, limpiarRespuesta, respuestaEnHistorial } from "./interrogatorio";

const voz = (genero: "femenino" | "masculino", edad: "joven" | "adulto" | "mayor" = "adulto") => ({ genero, edad, velocidad: 1 });

describe("rasgos por defecto", () => {
  it("salen de la voz y la edad", () => {
    const ana = rasgosPara({ id: "ana", edad: 40, voz: voz("femenino") });
    expect(ana).toMatchObject({ especie: "humano", cuerpo: "femenino", edad: "adulto", vello: "ninguno" });
    expect(rasgosPara({ id: "beto", voz: voz("masculino", "mayor") })).toMatchObject({ cuerpo: "masculino", edad: "mayor", arrugas: 0.75 });
    expect(rasgosPara({ id: "nene", edad: 8, voz: voz("masculino", "joven") })).toMatchObject({ edad: "nino", arrugas: 0, vello: "ninguno", corbata: null });
    expect(rasgosPara({ id: "bebe", edad: 1, voz: voz("femenino", "joven") })).toMatchObject({ edad: "bebe", peinado: "pelusa", ropa: "enterito", accesorios: ["chupete"] });
  });

  it("dos personajes sin datos no salen iguales", () => {
    const a = rasgosPara({ id: "testigo", voz: voz("masculino") });
    const b = rasgosPara({ id: "portero", voz: voz("masculino") });
    expect(a).not.toEqual(b);
    expect(rasgosPara({ id: "testigo", voz: voz("masculino") })).toEqual(a); // estables
  });

  it("lo que trae el caso manda sobre lo derivado", () => {
    const r = rasgosPara({ id: "firulais", voz: voz("masculino"), apariencia: { rasgos: { especie: "perro", piel: "#b98a56", cuerpo: "neutro" } } });
    expect(r).toMatchObject({ especie: "perro", piel: "#b98a56", cuerpo: "neutro" });
  });

  it("con retratos no se mandan rasgos", () => {
    const retratos = { neutral: "/casos/x/neutral.jpg" };
    expect(aparienciaPublica({ id: "a", voz: voz("femenino"), apariencia: { retratos } })).toEqual({ retratos, rasgos: null });
    expect(aparienciaPublica({ id: "a", voz: voz("femenino") }).rasgos?.cuerpo).toBe("femenino");
  });
});

describe("emoción en la respuesta del modelo", () => {
  it("se lee y se saca del texto", () => {
    expect(leerRespuesta("[emocion: nervioso] Yo no estuve ahí.")).toEqual({ emocion: "nervioso", texto: "Yo no estuve ahí." });
    expect(leerRespuesta("[Emoción: Quebrado] *Baja la vista.* Fui yo.")).toEqual({ emocion: "quebrado", texto: "*Baja la vista.* Fui yo." });
  });

  it("sin etiqueta o con una emoción inventada queda neutral", () => {
    expect(leerRespuesta("No sé nada.")).toEqual({ emocion: "neutral", texto: "No sé nada." });
    expect(leerRespuesta("[emocion: feliz] Hola.")).toEqual({ emocion: "neutral", texto: "Hola." });
  });

  it("limpia también las otras marcas internas", () => {
    expect(leerRespuesta("[emocion: evasivo] [clave: x] Pregúntele a otro.").texto).toBe("Pregúntele a otro.");
    expect(limpiarRespuesta("Sí. [emocion: triste]")).toBe("Sí.");
  });

  it("el historial le devuelve la etiqueta al modelo", () => {
    expect(respuestaEnHistorial({ texto: "Hola.", emocion: "confiado" })).toBe("[emocion: confiado] Hola.");
    expect(respuestaEnHistorial({ texto: "Hola." })).toBe("Hola.");
  });
});

describe("validador de apariencia", () => {
  it("avisa mezclas, exige neutral y revisa los archivos", async () => {
    const { validarCaso } = await import("./validador");
    const datos = structuredClone((await import("../../casos/hotel-aurora/caso.json")).default) as { personajes: { apariencia?: unknown }[] };
    datos.personajes[0].apariencia = { retratos: { nervioso: "/casos/hotel-aurora/retratos/duarte/nervioso.jpg" } };
    const r = validarCaso(datos, () => false);
    expect(r.errores).toContain('personaje duarte: los retratos necesitan al menos "neutral"');
    expect(r.errores).toContain("personaje duarte: no existe el retrato public/casos/hotel-aurora/retratos/duarte/nervioso.jpg");
    expect(r.avisos.some((a) => a.includes("un solo estilo"))).toBe(true);
  });
});
