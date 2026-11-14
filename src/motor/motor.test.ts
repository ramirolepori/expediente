import { describe, expect, it } from "vitest";
import datos from "../../casos/hotel-aurora/caso.json";
import { CasoSchema } from "@/casos/schema";
import { validarCaso } from "./validador";
import { aplicar, ErrorDeJuego, revelarHecho } from "./reductor";
import { vistaPara } from "./vista";
import { construirInstrucciones, limpiarRespuesta, resolverRevelacion } from "./interrogatorio";
import { CONFIG_POR_DEFECTO, type EstadoPartida } from "./tipos";

const caso = CasoSchema.parse(datos);
const personaje = (id: string) => caso.personajes.find((p) => p.id === id)!;

function partida(): EstadoPartida {
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
  return aplicar(base, { tipo: "iniciar" }, "a", caso);
}

describe("Hotel Aurora", () => {
  it("pasa el validador", () => {
    const r = validarCaso(datos);
    expect(r.errores).toEqual([]);
    expect(r.ok).toBe(true);
  });

  it("al iniciar solo abre el primer sobre y respeta el orden", () => {
    const s = partida();
    expect(s.sobresAbiertos).toEqual(["s1_escena"]);
    expect(() => aplicar(s, { tipo: "abrirSobre", sobre: "s3_laboratorio" }, "a", caso)).toThrow(ErrorDeJuego);
    const s2 = aplicar(s, { tipo: "abrirSobre", sobre: "s2_registros" }, "b", caso);
    expect(s2.sobresAbiertos).toContain("s2_registros");
  });

  it("la pantalla compartida no puede jugar", () => {
    expect(() => aplicar(partida(), { tipo: "pedirAyuda" }, "tv", caso)).toThrow(ErrorDeJuego);
  });

  it("la vista nunca filtra la verdad ni los códigos mientras se juega", () => {
    const s = partida();
    const json = JSON.stringify(vistaPara(caso, s, "a"));
    expect(json).not.toContain("ECLIPSE07");
    expect(json).not.toContain("C27\"");
    expect(json).not.toContain("estranguló");
    expect(json).not.toContain("BLOQUEADO");
    expect(vistaPara(caso, s, "a").verdad).toBeNull();
  });

  it("los personajes bloqueados no revelan su nombre", () => {
    const v = vistaPara(caso, partida(), "a");
    const julian = v.personajes.find((p) => p.id === "julian")!;
    expect(julian.disponible).toBe(false);
    expect(julian.nombre).toBe("???");
    expect(JSON.stringify(v)).not.toContain("Olazábal");
  });

  it("las notas privadas solo las ve su autor", () => {
    let s = partida();
    s = aplicar(s, { tipo: "nota", texto: "sospecho del gerente", visibilidad: "privada" }, "a", caso);
    s = aplicar(s, { tipo: "nota", texto: "ver ascensor", visibilidad: "equipo" }, "a", caso);
    expect(vistaPara(caso, s, "a").notas).toHaveLength(2);
    expect(vistaPara(caso, s, "b").notas).toHaveLength(1);
    expect(vistaPara(caso, s, "tv").notas).toHaveLength(1);
  });

  it("los candados validan el código", () => {
    let s = partida();
    s = revelarHecho(s, "carla_sobre", "Carla");
    s = aplicar(s, { tipo: "probarCandado", candado: "pendrive", codigo: "B12" }, "a", caso);
    expect(s.candadosAbiertos).not.toContain("pendrive");
    s = aplicar(s, { tipo: "probarCandado", candado: "pendrive", codigo: " c27 " }, "a", caso);
    expect(s.candadosAbiertos).toContain("pendrive");
    expect(vistaPara(caso, s, "a").pruebas.map((p) => p.id)).toContain("mensaje_julia");
  });

  it("un secreto bloqueado se rechaza hasta tener la prueba", () => {
    let s = partida();
    expect(resolverRevelacion(caso, personaje("duarte"), s, "duarte_confiesa_visita").ok).toBe(false);
    s = aplicar(s, { tipo: "abrirSobre", sobre: "s2_registros" }, "a", caso);
    expect(resolverRevelacion(caso, personaje("duarte"), s, "duarte_confiesa_visita")).toEqual({ ok: true, hecho: "duarte_visita" });
    expect(resolverRevelacion(caso, personaje("duarte"), s, "clave_inventada").ok).toBe(false);
  });

  it("limpia las marcas internas que el modelo copie en la respuesta", () => {
    expect(limpiarRespuesta("¡Yo no fui! Esa hora ya estaba en mi casa, [clave: matias_no_estaba] me fui a las 19.")).toBe(
      "¡Yo no fui! Esa hora ya estaba en mi casa, me fui a las 19.",
    );
    expect(limpiarRespuesta("(BLOQUEADO) No sé nada.")).toBe("No sé nada.");
  });

  it("cada personaje recibe solo su ficha", () => {
    const s = partida();
    const prompt = construirInstrucciones(caso, personaje("esteban"), s);
    expect(prompt).toContain("corbata dorada");
    expect(prompt).not.toContain("estranguló");
    expect(prompt).not.toContain("Olazábal");
    const julian = construirInstrucciones(caso, personaje("julian"), s);
    expect(julian).toContain("(BLOQUEADO)");
  });

  it("la acusación se decide por votación", () => {
    const base = { autor: "julian", complice: "alberto", orden: "olazabal", movil: "auditoria", duarte: "ultimatum", copa: "valentina" };
    let s = aplicar(partida(), { tipo: "votar", respuestas: { ...base, duarte: "mato" } }, "a", caso);
    expect(s.fase).toBe("jugando");
    expect(() => aplicar(s, { tipo: "cerrarVotacion" }, "b", caso)).toThrow(ErrorDeJuego);
    // Beto vota distinto en "duarte": empate 1 a 1, desempata la anfitriona (Ana)
    s = aplicar(s, { tipo: "votar", respuestas: base }, "b", caso);
    expect(s.fase).toBe("terminada");
    expect(s.acusacion?.respuestas.duarte).toBe("mato");
    expect(s.acusacion?.puntaje).toBe(90);
    expect(vistaPara(caso, s, "a").verdad?.culpables).toHaveLength(3);
  });

  it("el anfitrión puede cerrar con la mitad de los votos", () => {
    const r = { autor: "julian", complice: "alberto", orden: "olazabal", movil: "auditoria", duarte: "ultimatum", copa: "valentina" };
    let s = aplicar(partida(), { tipo: "votar", respuestas: r }, "b", caso);
    s = aplicar(s, { tipo: "cerrarVotacion" }, "a", caso);
    expect(s.acusacion?.puntaje).toBe(100);
  });

  it("no se puede votar con preguntas sin responder", () => {
    expect(() => aplicar(partida(), { tipo: "votar", respuestas: { autor: "julian" } }, "a", caso)).toThrow(ErrorDeJuego);
  });
});
