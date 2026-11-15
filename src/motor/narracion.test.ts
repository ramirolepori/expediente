import { describe, expect, it } from "vitest";
import datos from "../../casos/hotel-aurora/caso.json";
import { CasoSchema } from "@/casos/schema";
import { guionCelular, guionDe, personajeDeMarca, textoParaLeer } from "./narracion";
import { aplicar, ErrorDeJuego } from "./reductor";
import { CONFIG_POR_DEFECTO, type EstadoPartida } from "./tipos";
import { vistaPara } from "./vista";
import { BASES, vocesDeLectura, vocesDelElenco } from "./voz";

const caso = CasoSchema.parse(datos);
const elenco = [
  { id: "md", nombre: "Martín Duarte" },
  { id: "valentina", nombre: "Valentina Ruiz" },
  { id: "matias", nombre: "Matías Duarte" },
];

describe("narrador: guion", () => {
  it("prepara el texto para el oído", () => {
    expect(textoParaLeer("El Dr. Paz llegó a las 21:40 y se fue 21:05")).toBe("El doctor Paz llegó a las 21 40 y se fue 21 y 5.");
    expect(textoParaLeer("Pagó $1.500 el 15/04/2025, un 30% más")).toBe("Pagó $1500 el 15 del 4 de 2025, un 30 por ciento más.");
    expect(textoParaLeer("Llegó a las 23:00 — tarde")).toBe("Llegó a las 23 en punto, tarde.");
  });

  it("encuentra al personaje de una marca por nombre completo, id o un nombre que no se repite", () => {
    expect(personajeDeMarca("Martín Duarte", elenco)).toBe("md");
    expect(personajeDeMarca("valentina", elenco)).toBe("valentina");
    expect(personajeDeMarca("Martin", elenco)).toBe("md");
    // "Duarte" lo comparten dos: mejor el narrador que adivinar
    expect(personajeDeMarca("Duarte", elenco)).toBeNull();
    expect(personajeDeMarca("Nota del perito", elenco)).toBeNull();
  });

  it("lee con la voz del personaje lo que el autor marcó, y el resto con el narrador", () => {
    const g = guionDe(
      "# Declaración\n\n**Valentina:** Yo no salí del salón.\n**Inspector:** ¿Segura?\n**Martín Duarte**: Miente.\n\n- Una copa rota\n- ![Foto 2: la terraza](/x.jpg)\n\n| Hora | Quién |\n|---|---|\n| 21:40 | Ruiz |",
      elenco,
    );
    expect(g).toEqual([
      { voz: "narrador", texto: "Declaración." },
      { voz: { personaje: "valentina" }, texto: "Yo no salí del salón." },
      { voz: "narrador", texto: "Inspector: ¿Segura?" },
      { voz: { personaje: "md" }, texto: "Miente." },
      { voz: "narrador", texto: "Una copa rota. Foto 2: la terraza. Hora, Quién. 21 40, Ruiz." },
    ]);
  });

  it("en el celular alterna la voz del dueño y la del contacto", () => {
    const g = guionCelular(
      { dueno: "Julia", hora: "00:00", bateria: 50, chats: [{ contacto: "Valentina", mensajes: [{ hora: "1", de: "victima", texto: "Hola" }, { hora: "2", de: "contacto", texto: "Chau" }] }], llamadas: [], correos: [], notas: [] },
      elenco,
    );
    expect(g.map((l) => l.voz)).toEqual(["narrador", "narrador", "otra", { personaje: "valentina" }]);
  });
});

describe("narrador: voces", () => {
  it("el narrador no comparte voz base con ningún personaje cuando hay bases libres", () => {
    const personajes = caso.personajes.filter((p) => p.interrogable);
    const elencoVoces = Object.values(vocesDelElenco(personajes));
    const { narrador, otra } = vocesDeLectura("noir", personajes.slice(0, 2));
    expect(BASES.masculino.some((b) => b.modelo === narrador.modelo)).toBe(true);
    expect(BASES.femenino.some((b) => b.modelo === otra.modelo && b.hablante === otra.hablante)).toBe(true);
    const chico = Object.values(vocesDelElenco(personajes.slice(0, 2)));
    expect(chico.some((v) => v.modelo === narrador.modelo && v.hablante === narrador.hablante)).toBe(false);
    expect(elencoVoces.length).toBeGreaterThan(0);
  });

  it("el caso puede traer su propio narrador", () => {
    expect(BASES.femenino.some((b) => b.modelo === vocesDeLectura("noir", [], { genero: "femenino", edad: "adulto", velocidad: 1 }).narrador.modelo)).toBe(true);
  });
});

describe("narrador: leer en la tele", () => {
  const ahora = Date.now();
  const base: EstadoPartida = {
    codigo: "ABCD", casoId: caso.meta.id, config: { ...CONFIG_POR_DEFECTO }, fase: "lobby", creada: ahora, iniciada: null,
    conexiones: {
      a: { id: "a", tipo: "jugador", apodo: "Ana", color: "#f00", anfitrion: true, ultimaVez: ahora },
      b: { id: "b", tipo: "jugador", apodo: "Beto", color: "#0f0", anfitrion: false, ultimaVez: ahora },
      tv: { id: "tv", tipo: "pantalla", apodo: "TV", color: "#999", anfitrion: false, ultimaVez: ahora },
    },
    sobresAbiertos: [], hechosRevelados: [], candadosAbiertos: [], ayudasUsadas: [], personajesVisitados: [],
    intentosCandado: 0, notas: [], interrogatorios: {}, acusacion: null, eventos: [], version: 0,
  };
  const s = aplicar(base, { tipo: "iniciar" }, "a", caso);
  const visible = vistaPara(caso, s, "a").pruebas[0]!.id;
  const oculta = caso.pruebas.find((p) => !s.sobresAbiertos.includes(p.sobre))!.id;

  it("un jugador manda a leer lo que el grupo ya ve, y la tele lo recibe en la vista", () => {
    const s2 = aplicar(s, { tipo: "narrar", que: `prueba:${visible}` }, "b", caso);
    expect(vistaPara(caso, s2, "tv").narracion).toMatchObject({ que: `prueba:${visible}`, por: "b" });
    expect(aplicar(s2, { tipo: "narrar", que: null }, "a", caso).narracion).toBeNull();
  });

  it("no deja leer una prueba que todavía no se abrió ni la resolución antes del final", () => {
    expect(() => aplicar(s, { tipo: "narrar", que: `prueba:${oculta}` }, "a", caso)).toThrow(ErrorDeJuego);
    expect(() => aplicar(s, { tipo: "narrar", que: "resolucion" }, "a", caso)).toThrow(ErrorDeJuego);
    expect(() => aplicar(s, { tipo: "narrar", que: "introduccion" }, "tv", caso)).toThrow(ErrorDeJuego);
  });
});
