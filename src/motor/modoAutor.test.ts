import { describe, expect, it } from "vitest";
import datos from "../../casos/hotel-aurora/caso.json";
import { CasoSchema } from "@/casos/schema";
import { aplicarAtajo, explicar, informeAutor } from "./modoAutor";
import { aplicar, ErrorDeJuego } from "./reductor";
import { CONFIG_POR_DEFECTO, type EstadoPartida } from "./tipos";
import { vistaPara } from "./vista";

const caso = CasoSchema.parse(datos);
const ahora = Date.now();
const lobby: EstadoPartida = {
  codigo: "ABCD", casoId: caso.meta.id, config: { ...CONFIG_POR_DEFECTO }, fase: "lobby", creada: ahora, iniciada: null,
  conexiones: {
    a: { id: "a", tipo: "jugador", apodo: "Autora", color: "#f00", anfitrion: true, ultimaVez: ahora },
    b: { id: "b", tipo: "jugador", apodo: "Beto", color: "#0f0", anfitrion: false, ultimaVez: ahora },
    c: { id: "c", tipo: "jugador", apodo: "Caro", color: "#00f", anfitrion: false, ultimaVez: ahora },
  },
  sobresAbiertos: [], hechosRevelados: [], candadosAbiertos: [], ayudasUsadas: [], personajesVisitados: [],
  intentosCandado: 0, notas: [], interrogatorios: {}, acusacion: null, eventos: [], version: 0,
};
const s = aplicar(lobby, { tipo: "iniciar" }, "a", caso);

describe("modo autor", () => {
  it("explica por qué está cerrado cada sobre, con lo que falta marcado", () => {
    const inf = informeAutor(caso, s);
    const cerrado = inf.sobres.find((x) => x.estado === "cerrado")!;
    const sobre = caso.sobres.find((x) => x.id === cerrado.id)!;
    expect(cerrado.requisito).toEqual(explicar(sobre.requisito, s, caso));
    expect(cerrado.requisito.cumple).toBe(false);
    expect(inf.sobres[0]!.estado).toBe("abierto");
  });

  it("muestra los secretos de cada personaje y la ficha que le llega al modelo", () => {
    const inf = informeAutor(caso, s);
    const conSecretos = inf.personajes.find((p) => p.disponible && p.secretos.length)!;
    expect(conSecretos.ficha).toContain(conSecretos.nombre);
    expect(conSecretos.secretos.every((x) => ["bloqueado", "habilitado", "contado"].includes(x.estado))).toBe(true);
  });

  it("los atajos destraban sin cumplir el requisito y quedan en el registro", () => {
    const cerrado = caso.sobres.find((x) => !s.sobresAbiertos.includes(x.id))!;
    const s2 = aplicarAtajo(s, { tipo: "abrirSobre", sobre: cerrado.id }, "a", caso);
    expect(s2.sobresAbiertos).toContain(cerrado.id);
    expect(s2.eventos.at(-1)!.texto).toContain("Atajo de autor");
    const hecho = caso.hechos[0]!.id;
    expect(aplicarAtajo(s2, { tipo: "revelarHecho", hecho }, "a", caso).hechosRevelados).toContain(hecho);
  });

  it("jugar como traidor solo en modo traidor, y la ficha secreta le llega a quien la pidió", () => {
    expect(() => aplicarAtajo(s, { tipo: "serTraidor" }, "a", caso)).toThrow(ErrorDeJuego);
    const conTraidor = aplicar({ ...lobby, config: { ...lobby.config, modo: "traidor" } }, { tipo: "iniciar" }, "a", caso);
    const s2 = aplicarAtajo(conTraidor, { tipo: "serTraidor" }, "a", caso);
    expect(vistaPara(caso, s2, "a").fichaTraidor).not.toBeNull();
  });

  it("nada del informe del autor viaja en la vista de los jugadores", () => {
    const v = JSON.stringify(vistaPara(caso, s, "b"));
    expect(v).not.toContain(caso.candados.at(-1)!.codigo);
    expect(v).not.toContain("[clave:");
  });
});
