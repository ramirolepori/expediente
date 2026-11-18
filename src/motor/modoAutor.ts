import type { Caso, Condicion } from "@/casos/schema";
import { evaluar, minijuegoVisible, pruebaVisible } from "./condiciones";
import { construirInstrucciones } from "./interrogatorio";
import { ErrorDeJuego, nuevoId } from "./reductor";
import type { EstadoPartida } from "./tipos";

/**
 * Sala de prueba en modo autor (ADR 0012): lo que solo ve quien escribió el caso mientras lo juega.
 * Por qué está cerrado cada sobre, qué secretos tiene habilitados cada personaje y la ficha exacta
 * que le llega al modelo, más atajos para no tener que jugar todo para probar el final.
 * Trae la solución: nunca pasa por `vistaPara`, lo pide una ruta aparte que exige la cuenta del autor.
 */
export interface Nodo {
  texto: string;
  cumple: boolean;
  hijos?: Nodo[];
}

export function explicar(c: Condicion, estado: EstadoPartida, caso: Caso): Nodo {
  const cumple = evaluar(c, estado, caso);
  switch (c.tipo) {
    case "siempre":
      return { texto: "Desde el principio", cumple };
    case "sobre":
      return { texto: `Abrir el sobre «${caso.sobres.find((s) => s.id === c.sobre)?.titulo ?? c.sobre}»`, cumple };
    case "capitulo":
      return { texto: `Responder la pregunta de «${caso.sobres.find((s) => s.id === c.capitulo)?.titulo ?? c.capitulo}»`, cumple };
    case "prueba":
      return { texto: `Ver la prueba «${caso.pruebas.find((p) => p.id === c.prueba)?.titulo ?? c.prueba}»`, cumple };
    case "hecho":
      return { texto: `Descubrir: ${caso.hechos.find((h) => h.id === c.hecho)?.texto ?? c.hecho} (${c.hecho})`, cumple };
    case "candado":
      return { texto: `Abrir el candado «${caso.candados.find((x) => x.id === c.candado)?.titulo ?? c.candado}»`, cumple };
    case "minijuego":
      return { texto: `Resolver «${caso.minijuegos.find((m) => m.id === c.minijuego)?.titulo ?? c.minijuego}»`, cumple };
    case "todas":
      return { texto: "Todas estas:", cumple, hijos: c.condiciones.map((x) => explicar(x, estado, caso)) };
    case "alguna":
      return { texto: "Alguna de estas:", cumple, hijos: c.condiciones.map((x) => explicar(x, estado, caso)) };
  }
}

export function informeAutor(caso: Caso, estado: EstadoPartida) {
  const revelado = (h: string) => estado.hechosRevelados.includes(h);
  const quienCuenta = (h: string) =>
    caso.personajes.filter((p) => p.sabe.includes(h) || p.secretos.some((s) => s.hecho === h)).map((p) => p.nombre);
  return {
    sobres: caso.sobres.map((s) => ({
      id: s.id,
      titulo: s.titulo,
      estado: estado.sobresAbiertos.includes(s.id) ? ("abierto" as const) : evaluar(s.requisito, estado, caso) ? ("disponible" as const) : ("cerrado" as const),
      requisito: explicar(s.requisito, estado, caso),
      pruebas: caso.pruebas.filter((p) => p.sobre === s.id).map((p) => ({ id: p.id, titulo: p.titulo, visible: pruebaVisible(p.id, estado, caso), desbloqueo: p.desbloqueo ? explicar(p.desbloqueo, estado, caso) : null })),
    })),
    personajes: caso.personajes
      .filter((p) => p.interrogable)
      .map((p) => {
        const disponible = evaluar(p.disponible, estado, caso);
        return {
          id: p.id,
          nombre: p.nombre,
          disponible,
          condicion: explicar(p.disponible, estado, caso),
          secretos: p.secretos.map((s) => ({
            id: s.id,
            hecho: caso.hechos.find((h) => h.id === s.hecho)?.texto ?? s.hecho,
            estado: revelado(s.hecho) ? ("contado" as const) : evaluar(s.cuando, estado, caso) ? ("habilitado" as const) : ("bloqueado" as const),
            cuando: explicar(s.cuando, estado, caso),
          })),
          mentiras: p.mentiras.map((m) => ({ tema: m.tema, cayo: evaluar(m.cae, estado, caso), cae: explicar(m.cae, estado, caso) })),
          // la ficha tal cual se la manda el servidor al modelo en este momento
          ficha: disponible ? construirInstrucciones(caso, p, estado) : null,
        };
      }),
    hechos: caso.hechos.map((h) => ({ id: h.id, texto: h.texto, revelado: revelado(h.id), cuentan: quienCuenta(h.id) })),
    candados: caso.candados.map((c) => ({ id: c.id, titulo: c.titulo, codigo: c.codigo, disponible: evaluar(c.disponible, estado, caso), abierto: estado.candadosAbiertos.includes(c.id) })),
    minijuegos: caso.minijuegos.map((m) => ({
      id: m.id,
      titulo: m.titulo,
      disponible: minijuegoVisible(m.id, estado, caso),
      resuelto: !!estado.minijuegosResueltos?.[m.id],
      solucion: "solucion" in m ? m.solucion : null,
    })),
    traidor: { posible: !!caso.traidor && estado.config.modo === "traidor", es: estado.traidor ?? null },
  };
}

export type InformeAutor = ReturnType<typeof informeAutor>;

export type Atajo =
  | { tipo: "abrirSobre"; sobre: string }
  | { tipo: "revelarHecho"; hecho: string }
  | { tipo: "abrirCandado"; candado: string }
  | { tipo: "resolverMinijuego"; minijuego: string }
  | { tipo: "serTraidor" };

/** Aplica un atajo de autor. Queda en el registro de la partida, así nadie lo confunde con jugar. */
export function aplicarAtajo(estado: EstadoPartida, atajo: Atajo, conexionId: string, caso: Caso): EstadoPartida {
  if (estado.fase !== "jugando") throw new ErrorDeJuego("Los atajos son con la partida en curso");
  const s: EstadoPartida = structuredClone(estado);
  const log = (texto: string) => s.eventos.push({ id: nuevoId(), hora: Date.now(), texto: `🛠 Atajo de autor: ${texto}` });
  switch (atajo.tipo) {
    case "abrirSobre": {
      const sobre = caso.sobres.find((x) => x.id === atajo.sobre);
      if (!sobre) throw new ErrorDeJuego("Ese sobre no existe");
      if (s.sobresAbiertos.includes(sobre.id)) return estado;
      s.sobresAbiertos.push(sobre.id);
      log(`abrió «${sobre.titulo}»`);
      break;
    }
    case "revelarHecho": {
      const hecho = caso.hechos.find((h) => h.id === atajo.hecho);
      if (!hecho) throw new ErrorDeJuego("Ese hecho no existe");
      if (s.hechosRevelados.includes(hecho.id)) return estado;
      s.hechosRevelados.push(hecho.id);
      log(`reveló un hecho (${hecho.id})`);
      break;
    }
    case "abrirCandado": {
      const candado = caso.candados.find((c) => c.id === atajo.candado);
      if (!candado) throw new ErrorDeJuego("Ese candado no existe");
      if (s.candadosAbiertos.includes(candado.id)) return estado;
      s.candadosAbiertos.push(candado.id);
      log(`abrió el candado «${candado.titulo}»`);
      break;
    }
    case "resolverMinijuego": {
      const m = caso.minijuegos.find((x) => x.id === atajo.minijuego);
      if (!m) throw new ErrorDeJuego("Ese minijuego no existe");
      if (s.minijuegosResueltos?.[m.id]) return estado;
      s.minijuegosResueltos = { ...s.minijuegosResueltos, [m.id]: conexionId };
      log(`resolvió «${m.titulo}»`);
      break;
    }
    case "serTraidor": {
      if (!caso.traidor || s.config.modo !== "traidor") throw new ErrorDeJuego("La partida no es en modo traidor");
      s.traidor = conexionId;
      log("ahora juega de traidor");
      break;
    }
  }
  s.version++;
  return s;
}
