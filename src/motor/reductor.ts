import type { Caso } from "@/casos/schema";
import { evaluar } from "./condiciones";
import type { Accion, EstadoPartida, Evento } from "./tipos";

export class ErrorDeJuego extends Error {}

let contador = 0;
export const nuevoId = () => `${Date.now().toString(36)}${(contador++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

function evento(texto: string): Evento {
  return { id: nuevoId(), hora: Date.now(), texto };
}

export const normalizarCodigo = (s: string) => s.replace(/[\s-]/g, "").toUpperCase();

/** recursos restantes, o null si la partida no los limita */
export function recursosRestantes(estado: EstadoPartida): number | null {
  if (estado.config.recursos == null) return null;
  return estado.config.recursos - estado.personajesVisitados.length - estado.ayudasUsadas.length;
}

/**
 * Aplica una acción de un jugador. Devuelve el estado nuevo (inmutable) o tira ErrorDeJuego.
 * El servidor es el único que corre esto: los clientes solo mandan acciones.
 */
export function aplicar(estado: EstadoPartida, accion: Accion, autorId: string, caso: Caso): EstadoPartida {
  const autor = estado.conexiones[autorId];
  if (!autor || autor.tipo !== "jugador") throw new ErrorDeJuego("Solo los jugadores pueden hacer eso");
  const s: EstadoPartida = structuredClone(estado);
  const log = (t: string) => s.eventos.push(evento(t));

  if (accion.tipo !== "nota" && accion.tipo !== "borrarNota" && accion.tipo !== "configurar" && accion.tipo !== "iniciar") {
    if (s.fase !== "jugando") throw new ErrorDeJuego("La partida no está en curso");
  }

  switch (accion.tipo) {
    case "configurar": {
      if (s.fase !== "lobby") throw new ErrorDeJuego("La partida ya empezó");
      if (!autor.anfitrion) throw new ErrorDeJuego("Solo el anfitrión configura la partida");
      s.config = { ...s.config, ...accion.config };
      break;
    }
    case "iniciar": {
      if (s.fase !== "lobby") throw new ErrorDeJuego("La partida ya empezó");
      if (!autor.anfitrion) throw new ErrorDeJuego("Solo el anfitrión abre el caso");
      const jugadores = Object.values(s.conexiones).filter((c) => c.tipo === "jugador").length;
      if (jugadores < caso.meta.jugadores.min) throw new ErrorDeJuego(`Hacen falta al menos ${caso.meta.jugadores.min} jugadores`);
      s.fase = "jugando";
      s.iniciada = Date.now();
      for (const sobre of caso.sobres) {
        if (sobre.requisito.tipo === "siempre") s.sobresAbiertos.push(sobre.id);
      }
      log(`${autor.apodo} abrió el caso`);
      break;
    }
    case "abrirSobre": {
      const sobre = caso.sobres.find((x) => x.id === accion.sobre);
      if (!sobre) throw new ErrorDeJuego("Ese sobre no existe");
      if (s.sobresAbiertos.includes(sobre.id)) return estado;
      if (!evaluar(sobre.requisito, s, caso)) throw new ErrorDeJuego("Todavía no se puede abrir ese sobre");
      s.sobresAbiertos.push(sobre.id);
      log(`${autor.apodo} abrió «${sobre.titulo}»`);
      break;
    }
    case "probarCandado": {
      const candado = caso.candados.find((c) => c.id === accion.candado);
      if (!candado || !evaluar(candado.disponible, s, caso)) throw new ErrorDeJuego("Ese candado no está disponible");
      if (s.candadosAbiertos.includes(candado.id)) return estado;
      s.intentosCandado++;
      if (normalizarCodigo(accion.codigo) !== normalizarCodigo(candado.codigo)) {
        log(`${autor.apodo} probó un código en «${candado.titulo}» y no funcionó`);
        break;
      }
      s.candadosAbiertos.push(candado.id);
      log(`🔓 ${autor.apodo} abrió «${candado.titulo}»`);
      break;
    }
    case "pedirAyuda": {
      if (s.config.ayudas === "apagadas") throw new ErrorDeJuego("Las ayudas están desactivadas en esta partida");
      const restantes = recursosRestantes(s);
      if (restantes !== null && restantes <= 0) throw new ErrorDeJuego("No quedan horas de investigación");
      const ayuda = caso.ayudas
        .filter((a) => !s.ayudasUsadas.includes(a.id) && evaluar(a.disponible, s, caso))
        .sort((a, b) => a.nivel - b.nivel)[0];
      if (!ayuda) throw new ErrorDeJuego("No hay ayudas disponibles por ahora");
      s.ayudasUsadas.push(ayuda.id);
      log(`${autor.apodo} pidió una ayuda al comisario`);
      break;
    }
    case "nota": {
      const texto = accion.texto.trim().slice(0, 2000);
      if (!texto) throw new ErrorDeJuego("La nota está vacía");
      s.notas.push({ id: nuevoId(), autor: autorId, texto, visibilidad: accion.visibilidad, hora: Date.now() });
      break;
    }
    case "borrarNota": {
      const nota = s.notas.find((n) => n.id === accion.id);
      if (!nota) return estado;
      if (nota.autor !== autorId) throw new ErrorDeJuego("Solo podés borrar tus notas");
      s.notas = s.notas.filter((n) => n.id !== accion.id);
      break;
    }
    case "acusar": {
      let puntaje = 0;
      let maximo = 0;
      const detalle = caso.resolucion.preguntas.map((p) => {
        const correcta = accion.respuestas[p.id] === p.respuesta;
        maximo += p.puntos;
        if (correcta) puntaje += p.puntos;
        return { pregunta: p.id, correcta, puntos: correcta ? p.puntos : 0 };
      });
      if (s.config.puntaje && s.config.ayudas === "limitadas") puntaje -= s.ayudasUsadas.length * 3;
      s.acusacion = { respuestas: accion.respuestas, autor: autorId, hora: Date.now(), puntaje: Math.max(0, puntaje), maximo, detalle };
      s.fase = "terminada";
      log(`${autor.apodo} presentó la acusación final`);
      break;
    }
  }
  s.version++;
  return s;
}

/** Usado solo por el servidor de interrogatorios, después de validar la condición del secreto. */
export function revelarHecho(estado: EstadoPartida, hecho: string, quien: string): EstadoPartida {
  if (estado.hechosRevelados.includes(hecho)) return estado;
  const s = structuredClone(estado);
  s.hechosRevelados.push(hecho);
  s.eventos.push(evento(`🗝️ ${quien} reveló algo importante`));
  s.version++;
  return s;
}
