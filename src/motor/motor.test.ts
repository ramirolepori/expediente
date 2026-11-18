import { describe, expect, it } from "vitest";
import datos from "../../casos/hotel-aurora/caso.json";
import datosVendimia from "../../casos/vendimia/caso.json";
import { CasoSchema } from "@/casos/schema";
import { validarCaso } from "./validador";
import { aplicar, ErrorDeJuego, revelarHecho } from "./reductor";
import { vistaPara } from "./vista";
import { construirInstrucciones, limpiarRespuesta, preguntasHechas, resolverRevelacion } from "./interrogatorio";
import { APICallError, RetryError } from "ai";
import { esCuotaAgotada } from "@/servidor/llm";
import { configPublica, esRespuestaCorrecta } from "./minijuegos";
import { CONFIG_POR_DEFECTO, type Accion, type EstadoPartida } from "./tipos";

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

  it("al salir el anfitrión, el rol pasa a otro jugador", () => {
    const s = aplicar(partida(), { tipo: "salir" }, "a", caso);
    expect(s.conexiones.a).toBeUndefined();
    expect(s.conexiones.b.anfitrion).toBe(true);
    expect(aplicar(s, { tipo: "salir" }, "tv", caso).conexiones.tv).toBeUndefined();
  });

  it("modo traidor: uno solo recibe la ficha y la votación decide quién gana", () => {
    const ahora = Date.now();
    let s = partida();
    // sala nueva en modo traidor con tres jugadores
    s = { ...s, fase: "lobby", sobresAbiertos: [], config: { ...s.config, modo: "traidor" } };
    s.conexiones.c = { id: "c", tipo: "jugador", apodo: "Caro", color: "#00f", anfitrion: false, ultimaVez: ahora };
    s = aplicar(s, { tipo: "iniciar" }, "a", caso);
    const traidor = s.traidor!;
    expect(["a", "b", "c"]).toContain(traidor);
    const conFicha = ["a", "b", "c", "tv"].filter((id) => vistaPara(caso, s, id).fichaTraidor);
    expect(conFicha).toEqual([traidor]);
    expect(JSON.stringify(vistaPara(caso, s, "tv"))).not.toContain(caso.traidor!.rol);

    const base = { autor: "duarte", complice: "alberto", orden: "olazabal", movil: "auditoria", duarte: "ultimatum", copa: "valentina" };
    const inocente = ["a", "b", "c"].find((x) => x !== traidor)!;
    expect(() => aplicar(s, { tipo: "votar", respuestas: base }, "a", caso)).toThrow(ErrorDeJuego);
    for (const id of ["a", "b", "c"]) s = aplicar(s, { tipo: "votar", respuestas: { ...base, traidor: inocente } }, id, caso);
    expect(s.acusacion?.traidor).toMatchObject({ id: traidor, descubierto: false, cumplio: true, gana: "traidor" });
    expect(vistaPara(caso, s, "a").traidorRevelado).toBe(traidor);
  });

  it("modo traidor necesita tres jugadores", () => {
    const s = { ...partida(), fase: "lobby" as const, config: { ...CONFIG_POR_DEFECTO, modo: "traidor" as const } };
    expect(() => aplicar(s, { tipo: "iniciar" }, "a", caso)).toThrow(ErrorDeJuego);
  });

  it("minijuegos: el orden correcto no viaja al navegador y el servidor valida", () => {
    const linea = caso.minijuegos.find((m) => m.id === "reconstruir_noche")!;
    const publica = configPublica(linea, "ABCD") as { piezas: { id: string; texto: string }[] };
    const textosCorrectos = linea.tipo === "linea_tiempo" ? linea.config.eventos : [];
    expect(publica.piezas.map((p) => p.texto)).not.toEqual(textosCorrectos);
    expect(publica.piezas.every((p) => /^p[0-9a-z]+$/.test(p.id))).toBe(true);
    const ordenCorrecto = textosCorrectos.map((t) => publica.piezas.find((p) => p.texto === t)!.id).join(",");
    expect(esRespuestaCorrecta(linea, "ABCD", ordenCorrecto)).toBe(true);
    expect(esRespuestaCorrecta(linea, "ABCD", publica.piezas.map((p) => p.id).join(","))).toBe(false);
    // otra sala ve otros ids: no sirve copiar la respuesta de una partida a otra
    expect(esRespuestaCorrecta(linea, "WXYZ", ordenCorrecto)).toBe(false);
  });

  it("minijuegos: resolver desbloquea su prueba y la vista no trae la solución", () => {
    let s = partida();
    s = aplicar(s, { tipo: "abrirSobre", sobre: "s2_registros" }, "a", caso);
    s = aplicar(s, { tipo: "abrirSobre", sobre: "s3_laboratorio" }, "a", caso);
    expect(JSON.stringify(vistaPara(caso, s, "a"))).not.toContain("41-08-07");
    s = aplicar(s, { tipo: "resolverMinijuego", minijuego: "caja_fuerte", respuesta: "11-22-33" }, "b", caso);
    expect(s.minijuegosResueltos?.caja_fuerte).toBeUndefined();
    s = aplicar(s, { tipo: "resolverMinijuego", minijuego: "caja_fuerte", respuesta: "41 08 07" }, "b", caso);
    expect(s.minijuegosResueltos?.caja_fuerte).toBe("b");
    expect(vistaPara(caso, s, "a").pruebas.map((p) => p.id)).toContain("caja_gerencia");
    s = aplicar(s, { tipo: "resolverMinijuego", minijuego: "nota_cifrada", respuesta: "recuperá todo antes de las nueve, sin ruido" }, "a", caso);
    expect(s.minijuegosResueltos?.nota_cifrada).toBe("a");
  });

  it("pizarra: solo acepta lo que el equipo ve, hilos que se cortan y línea de tiempo", () => {
    let s = partida();
    expect(() => aplicar(s, { tipo: "pizarraColocar", ref: { tipo: "prueba", id: "informe_adn" }, x: 10, y: 10 }, "a", caso)).toThrow(ErrorDeJuego);
    s = aplicar(s, { tipo: "pizarraColocar", ref: { tipo: "prueba", id: "informe_escena" }, x: 10, y: 10 }, "a", caso);
    s = aplicar(s, { tipo: "pizarraColocar", ref: { tipo: "personaje", id: "duarte" }, x: 140, y: -5 }, "b", caso);
    const [p1, p2] = s.pizarra!.items;
    expect(p2).toMatchObject({ x: 100, y: 0 });
    s = aplicar(s, { tipo: "pizarraHilo", a: p1.id, b: p2.id }, "a", caso);
    expect(s.pizarra!.hilos).toHaveLength(1);
    s = aplicar(s, { tipo: "pizarraHilo", a: p2.id, b: p1.id }, "b", caso);
    expect(s.pizarra!.hilos).toHaveLength(0);
    s = aplicar(s, { tipo: "pizarraHilo", a: p1.id, b: p2.id }, "a", caso);
    s = aplicar(s, { tipo: "pizarraQuitar", item: p2.id }, "a", caso);
    expect(s.pizarra!.hilos).toHaveLength(0);
    s = aplicar(s, { tipo: "lineaAgregar", ref: { tipo: "prueba", id: "informe_escena" }, hora: "Lun 02:41" }, "a", caso);
    expect(vistaPara(caso, s, "b").pizarra.linea[0].hora).toBe("Lun 02:41");
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

  it("Valentina no admite ser Arcimboldo solo con lo del primer sobre", () => {
    const s = partida();
    expect(resolverRevelacion(caso, personaje("valentina"), s, "valentina_admite_arcimboldo").ok).toBe(false);
    const conHielo = revelarHecho(s, "hielo_2255", "Esteban Ríos");
    expect(resolverRevelacion(caso, personaje("valentina"), conHielo, "valentina_admite_arcimboldo").ok).toBe(true);
  });

  it("la descripción de un sobre cerrado no viaja hasta que se puede abrir", () => {
    const s = partida();
    const sobres = vistaPara(caso, s, "a").sobres;
    const cerrado = sobres.find((x) => !x.abierto && !x.sePuedeAbrir)!;
    expect(cerrado.descripcion).toBe("");
    expect(sobres.find((x) => x.abierto)!.descripcion).not.toBe("");
  });

  it("cuenta las preguntas de la partida y de la ventana reciente", () => {
    const s = partida();
    s.interrogatorios = {
      carla: [
        { id: "1", de: "jugador", autor: "a", texto: "?", hora: 1000 },
        { id: "2", de: "personaje", texto: "!", hora: 2000 },
        { id: "3", de: "jugador", autor: "b", texto: "?", hora: 70000 },
      ],
      esteban: [{ id: "4", de: "sistema", texto: "x", hora: 80000 }],
    };
    expect(preguntasHechas(s)).toBe(2);
    expect(preguntasHechas(s, 10000)).toBe(1);
    expect(vistaPara(caso, s, "a").preguntasRestantes).toBe(148);
  });

  it("reconoce el 429 del proveedor aunque venga envuelto en reintentos", () => {
    const e429 = new APICallError({ message: "cuota", url: "x", requestBodyValues: {}, statusCode: 429 });
    const e500 = new APICallError({ message: "error", url: "x", requestBodyValues: {}, statusCode: 500 });
    expect(esCuotaAgotada(e429)).toBe(true);
    expect(esCuotaAgotada(new RetryError({ message: "r", reason: "maxRetriesExceeded", errors: [e429] }))).toBe(true);
    expect(esCuotaAgotada(e500)).toBe(false);
    expect(esCuotaAgotada(new Error("timeout"))).toBe(false);
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

describe("Muerte en la vendimia", () => {
  const casoV = CasoSchema.parse(datosVendimia);
  const partidaV = (): EstadoPartida => {
    const s = partida();
    return { ...s, casoId: casoV.meta.id, sobresAbiertos: ["s1_nave"] };
  };

  it("pasa el validador", () => {
    const r = validarCaso(datosVendimia);
    expect(r.errores).toEqual([]);
    expect(r.ok).toBe(true);
  });

  it("la escena solo viaja con el sobre abierto", () => {
    const v = vistaPara(casoV, partidaV(), "a");
    expect(v.sobres.find((s) => s.id === "s1_nave")!.escena?.puntos.length).toBe(5);
    expect(v.sobres.find((s) => s.id === "s2_fiesta")!.escena).toBeNull();
  });

  it("el servidor solo habilita el segundo sobre con un acierto y revela el cierre al equipo", () => {
    const s = partidaV();
    const abrir: Accion = { tipo: "abrirSobre", sobre: "s2_fiesta" };
    const responder = (respuesta: string): Accion => ({ tipo: "responderCapitulo", sobre: "s1_nave", respuesta });
    const [primero, segundo] = vistaPara(casoV, s, "b").sobres;
    expect(primero.resumen).toBe(casoV.sobres[0].resumen);
    expect(primero.preguntaCapitulo).toEqual({
      texto: casoV.sobres[0].preguntaCapitulo!.texto,
      opciones: casoV.sobres[0].preguntaCapitulo!.opciones,
      resultado: null,
      orientacion: null,
    });
    expect(segundo).toMatchObject({ abierto: false, sePuedeAbrir: false, resumen: null, preguntaCapitulo: null });
    expect(() => aplicar(s, abrir, "a", casoV)).toThrow("Todavía no se puede abrir");
    expect(() => aplicar(s, responder("b"), "tv", casoV)).toThrow("Solo los jugadores");
    expect(() => aplicar(s, responder("inventada"), "a", casoV)).toThrow("Elegí una");
    expect(() => aplicar(s, responder("a"), "a", casoV)).toThrow("no encaja con las pistas");
    expect(s.capitulosResueltos).toBeUndefined();

    const resuelta = aplicar(s, responder("b"), "a", casoV);
    expect(aplicar(resuelta, responder("b"), "b", casoV)).toBe(resuelta);
    const vista = vistaPara(casoV, resuelta, "b");
    expect(vista.sobres[0].preguntaCapitulo?.resultado).toEqual({
      cierre: casoV.sobres[0].preguntaCapitulo!.cierre,
      gancho: casoV.sobres[0].preguntaCapitulo!.gancho,
    });
    expect(vista.sobres[1]).toMatchObject({ abierto: false, sePuedeAbrir: true, resumen: null, preguntaCapitulo: null });
    expect(vistaPara(casoV, aplicar(resuelta, abrir, "b", casoV), "a").sobres[1].resumen).toBe(casoV.sobres[1].resumen);
  });

  it.each(["hechos", "minijuegos sin horas"])("se puede llegar a la votación pasando por los cinco capítulos (%s)", (camino) => {
    let s = partidaV();
    if (camino !== "hechos") s.config.recursos = 8;
    const responder = (sobre: string, respuesta: string): Accion => ({ tipo: "responderCapitulo", sobre, respuesta });
    const avanzar = (siguiente: string) => { s = aplicar(s, { tipo: "abrirSobre", sobre: siguiente }, "b", casoV); };
    const intentar = (a: Accion) => aplicar(s, a, "a", casoV);

    expect(() => intentar(responder("s5_vestido", "b"))).toThrow("Todavía no se puede responder");
    expect(vistaPara(casoV, s, "a").preguntas).toEqual([]);
    const votos = Object.fromEntries(casoV.resolucion.preguntas.map((q) => [q.id, q.respuesta]));
    expect(() => intentar({ tipo: "votar", respuestas: votos })).toThrow("Todavía no se habilitó la votación");
    expect(() => intentar({ tipo: "cerrarVotacion" })).toThrow("Todavía no se habilitó la votación");
    s = intentar(responder("s1_nave", "b"));
    avanzar("s2_fiesta");

    expect(vistaPara(casoV, s, "a").sobres[1].preguntaCapitulo?.opciones).toEqual([]);
    expect(() => intentar(responder("s2_fiesta", "c"))).toThrow("Todavía no se puede responder");
    s = camino === "hechos"
      ? revelarHecho(s, "marcos_con_camila", "Camila")
      : { ...s, minijuegosResueltos: { reconstruir_fiesta: "a" } };
    s = intentar(responder("s2_fiesta", "c"));
    avanzar("s3_control");

    if (camino === "hechos") {
      s = revelarHecho(s, "ines_salio", "Inés");
      expect(() => intentar(responder("s3_control", "a"))).toThrow("Todavía no se puede responder");
      s = revelarHecho(s, "ines_vio_sofia", "Inés");
    } else {
      for (let i = 0; i < 8; i++) s = intentar({ tipo: "pedirAyuda" });
      expect(vistaPara(casoV, s, "a").recursosRestantes).toBe(0);
      expect(() => intentar(responder("s3_control", "a"))).toThrow("Todavía no se puede responder");
      const acta = casoV.minijuegos.find((m) => m.id === "acta_ines")!;
      if (acta.tipo !== "rompecabezas") throw new Error("El acta tiene que ser un rompecabezas");
      const piezas = configPublica(acta, s.codigo).piezas!;
      const respuesta = acta.config.fragmentos.map((fragmento) => piezas.find((p) => p.texto === fragmento)!.id).join(",");
      s = intentar({ tipo: "resolverMinijuego", minijuego: acta.id, respuesta });
      expect(s.hechosRevelados).toEqual([]);
    }
    s = intentar(responder("s3_control", "a"));
    avanzar("s4_venta");

    s = camino === "hechos"
      ? revelarHecho(s, "sofia_firmaba", "Raúl")
      : { ...s, minijuegosResueltos: { ...s.minijuegosResueltos, cuaderno_ignacio: "b" } };
    expect(() => intentar(responder("s4_venta", "c"))).toThrow("Todavía no se puede responder");
    s = intentar({ tipo: "probarCandado", candado: "pin_celular", codigo: "030398" });
    s = intentar(responder("s4_venta", "c"));
    avanzar("s5_vestido");

    expect(vistaPara(casoV, s, "a").sePuedeVotar).toBe(false);
    s = intentar(responder("s5_vestido", "b"));
    expect(vistaPara(casoV, s, "a").sePuedeVotar).toBe(true);
    expect(vistaPara(casoV, s, "a").sobres[4].preguntaCapitulo?.resultado?.gancho).toBe("Votación final.");
    s = intentar({ tipo: "votar", respuestas: votos });
    expect(aplicar(s, { tipo: "votar", respuestas: votos }, "b", casoV).fase).toBe("terminada");
  });

  it("la escena no muestra puntos de pruebas bloqueadas", () => {
    const conEscena = structuredClone(datosVendimia) as typeof datosVendimia;
    conEscena.sobres[3].escena = { imagen: "/x.jpg", proporcion: 1.5, puntos: [{ prueba: "celular_ignacio", x: 10, y: 10, etiqueta: "Celular" }] } as never;
    const c = CasoSchema.parse(conEscena);
    const s = { ...partidaV(), sobresAbiertos: ["s1_nave", "s2_fiesta", "s3_control", "s4_venta"] };
    expect(vistaPara(c, s, "a").sobres.find((x) => x.id === "s4_venta")!.escena?.puntos).toEqual([]);
    expect(vistaPara(c, { ...s, candadosAbiertos: ["pin_celular"] }, "a").sobres.find((x) => x.id === "s4_venta")!.escena?.puntos).toHaveLength(1);
  });

  it("el validador rechaza puntos que apuntan a pruebas de otro sobre", () => {
    const malo = structuredClone(datosVendimia) as typeof datosVendimia;
    malo.sobres[0].escena!.puntos[0].prueba = "fotos_camila";
    expect(validarCaso(malo).errores.join(" ")).toContain("es del sobre s2_fiesta");
  });
});
