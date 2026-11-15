import type { Caso } from "@/casos/schema";
import { evaluar, minijuegoVisible, pruebaVisible } from "./condiciones";
import { esRespuestaCorrecta } from "./minijuegos";
import { PIZARRA_VACIA, type Accion, type EstadoPartida, type Evento, type RefPizarra } from "./tipos";

export class ErrorDeJuego extends Error {}

let contador = 0;
export const nuevoId = () => `${Date.now().toString(36)}${(contador++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

function evento(texto: string): Evento {
  return { id: nuevoId(), hora: Date.now(), texto };
}

export const normalizarCodigo = (s: string) => s.replace(/[\s-]/g, "").toUpperCase();

const LIMITE_PIZARRA = { items: 60, hilos: 120, linea: 80 };
const acotar = (n: number) => Math.min(100, Math.max(0, Number.isFinite(n) ? n : 50));

/** Solo se puede llevar a la pizarra lo que el equipo ya tiene a la vista. */
function validarRef(ref: RefPizarra, s: EstadoPartida, caso: Caso) {
  const ok =
    (ref.tipo === "prueba" && pruebaVisible(ref.id, s, caso)) ||
    (ref.tipo === "hecho" && s.hechosRevelados.includes(ref.id)) ||
    (ref.tipo === "personaje" && !!caso.personajes.find((p) => p.id === ref.id && p.interrogable && evaluar(p.disponible, s, caso))) ||
    (ref.tipo === "nota" && s.notas.some((n) => n.id === ref.id && n.visibilidad === "equipo"));
  if (!ok) throw new ErrorDeJuego("Eso no está disponible para la pizarra");
}

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
  if (accion.tipo === "salir" && autor) return salir(estado, autorId);
  if (!autor || autor.tipo !== "jugador") throw new ErrorDeJuego("Solo los jugadores pueden hacer eso");
  const s: EstadoPartida = structuredClone(estado);
  const log = (t: string) => s.eventos.push(evento(t));

  if (accion.tipo !== "nota" && accion.tipo !== "borrarNota" && accion.tipo !== "configurar" && accion.tipo !== "iniciar" && accion.tipo !== "narrar") {
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
      if (s.config.modo === "traidor") {
        if (!caso.traidor) throw new ErrorDeJuego("Este caso no tiene modo traidor");
        if (jugadores < 3) throw new ErrorDeJuego("El modo traidor necesita al menos 3 jugadores");
        const candidatos = Object.values(s.conexiones).filter((c) => c.tipo === "jugador");
        s.traidor = candidatos[Math.floor(Math.random() * candidatos.length)].id;
      }
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
    case "pizarraColocar": {
      validarRef(accion.ref, s, caso);
      const pz = (s.pizarra ??= structuredClone(PIZARRA_VACIA));
      if (pz.items.some((i) => i.ref.tipo === accion.ref.tipo && i.ref.id === accion.ref.id)) return estado;
      if (pz.items.length >= LIMITE_PIZARRA.items) throw new ErrorDeJuego("La pizarra está llena");
      pz.items.push({ id: nuevoId(), ref: accion.ref, x: acotar(accion.x), y: acotar(accion.y), autor: autorId });
      break;
    }
    case "pizarraMover": {
      const item = s.pizarra?.items.find((i) => i.id === accion.item);
      if (!item) return estado;
      item.x = acotar(accion.x);
      item.y = acotar(accion.y);
      break;
    }
    case "pizarraQuitar": {
      if (!s.pizarra?.items.some((i) => i.id === accion.item)) return estado;
      s.pizarra.items = s.pizarra.items.filter((i) => i.id !== accion.item);
      s.pizarra.hilos = s.pizarra.hilos.filter((h) => h.a !== accion.item && h.b !== accion.item);
      break;
    }
    case "pizarraHilo": {
      const pz = s.pizarra;
      if (!pz || accion.a === accion.b || !pz.items.some((i) => i.id === accion.a) || !pz.items.some((i) => i.id === accion.b)) {
        throw new ErrorDeJuego("Elegí dos tarjetas de la pizarra");
      }
      // tocar el mismo par otra vez corta el hilo
      const existe = pz.hilos.find((h) => (h.a === accion.a && h.b === accion.b) || (h.a === accion.b && h.b === accion.a));
      if (existe) pz.hilos = pz.hilos.filter((h) => h !== existe);
      else {
        if (pz.hilos.length >= LIMITE_PIZARRA.hilos) throw new ErrorDeJuego("Demasiados hilos en la pizarra");
        pz.hilos.push({ id: nuevoId(), a: accion.a, b: accion.b, autor: autorId });
      }
      break;
    }
    case "lineaAgregar": {
      validarRef(accion.ref, s, caso);
      const hora = accion.hora.trim().slice(0, 24);
      if (!hora) throw new ErrorDeJuego("Poné una hora, por ejemplo 'Dom 23:12'");
      const pz = (s.pizarra ??= structuredClone(PIZARRA_VACIA));
      if (pz.linea.length >= LIMITE_PIZARRA.linea) throw new ErrorDeJuego("La línea de tiempo está llena");
      pz.linea.push({ id: nuevoId(), ref: accion.ref, hora, autor: autorId });
      break;
    }
    case "lineaQuitar": {
      if (!s.pizarra?.linea.some((l) => l.id === accion.id)) return estado;
      s.pizarra.linea = s.pizarra.linea.filter((l) => l.id !== accion.id);
      break;
    }
    case "resolverMinijuego": {
      const m = caso.minijuegos.find((x) => x.id === accion.minijuego);
      if (!m || !minijuegoVisible(m.id, s, caso)) throw new ErrorDeJuego("Ese minijuego no está disponible");
      if (s.minijuegosResueltos?.[m.id]) return estado;
      if (!esRespuestaCorrecta(m, s.codigo, String(accion.respuesta ?? "").slice(0, 2000))) {
        log(`${autor.apodo} intentó «${m.titulo}» y no salió`);
        break;
      }
      s.minijuegosResueltos = { ...(s.minijuegosResueltos ?? {}), [m.id]: autorId };
      log(`🧩 ${autor.apodo} resolvió «${m.titulo}»`);
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
    case "votar": {
      const faltan = caso.resolucion.preguntas.filter((p) => !accion.respuestas[p.id]);
      if (faltan.length) throw new ErrorDeJuego("Respondé todas las preguntas antes de votar");
      if (s.traidor && !accion.respuestas.traidor) throw new ErrorDeJuego("Votá también quién es el traidor");
      s.votos = { ...(s.votos ?? {}), [autorId]: accion.respuestas };
      log(`🗳️ ${autor.apodo} votó la acusación`);
      const jugadores = Object.values(s.conexiones).filter((c) => c.tipo === "jugador");
      if (jugadores.every((j) => s.votos![j.id])) resolverAcusacion(s, caso, log);
      break;
    }
    case "retirarVoto": {
      if (!s.votos?.[autorId]) return estado;
      const { [autorId]: _, ...resto } = s.votos;
      void _;
      s.votos = resto;
      log(`${autor.apodo} retiró su voto`);
      break;
    }
    case "narrar": {
      // mandar a leer en la tele: solo lo que el grupo ya tiene a la vista
      const que = accion.que;
      if (que !== null) {
        const ok =
          (que === "introduccion" && s.fase === "jugando") ||
          (que === "resolucion" && s.fase === "terminada") ||
          (que.startsWith("prueba:") && s.fase === "jugando" && pruebaVisible(que.slice("prueba:".length), s, caso));
        if (!ok) throw new ErrorDeJuego("Eso no se puede leer ahora");
      }
      s.narracion = que === null ? null : { id: nuevoId(), que, por: autorId };
      break;
    }
    case "cerrarVotacion": {
      if (!autor.anfitrion) throw new ErrorDeJuego("Solo el anfitrión puede cerrar la votación");
      const jugadores = Object.values(s.conexiones).filter((c) => c.tipo === "jugador").length;
      const votos = Object.keys(s.votos ?? {}).length;
      if (votos < Math.ceil(jugadores / 2)) throw new ErrorDeJuego("Tiene que votar al menos la mitad del equipo");
      resolverAcusacion(s, caso, log);
      break;
    }
  }
  s.version++;
  return s;
}

/** Saca una conexión de la sala. Si era el anfitrión, el rol pasa al jugador que entró primero. */
function salir(estado: EstadoPartida, id: string): EstadoPartida {
  const s: EstadoPartida = structuredClone(estado);
  const quien = s.conexiones[id];
  delete s.conexiones[id];
  if (s.votos) delete s.votos[id];
  if (quien.anfitrion) {
    const siguiente = Object.values(s.conexiones).find((c) => c.tipo === "jugador");
    if (siguiente) siguiente.anfitrion = true;
  }
  s.eventos.push(evento(quien.tipo === "pantalla" ? "Se desconectó una pantalla compartida" : `${quien.apodo} salió de la partida`));
  s.version++;
  return s;
}

/**
 * Cierra la votación: por cada pregunta gana la respuesta más votada.
 * Si hay empate, desempata el voto del anfitrión (o el primero que votó).
 */
function resolverAcusacion(s: EstadoPartida, caso: Caso, log: (t: string) => void) {
  const votos = s.votos ?? {};
  const anfitrion = Object.values(s.conexiones).find((c) => c.anfitrion)?.id;
  const orden = Object.keys(votos).sort((a, b) => (a === anfitrion ? -1 : b === anfitrion ? 1 : 0));
  const respuestas: Record<string, string> = {};
  for (const p of caso.resolucion.preguntas) {
    const cuenta = new Map<string, number>();
    for (const v of orden) cuenta.set(votos[v][p.id], (cuenta.get(votos[v][p.id]) ?? 0) + 1);
    let mejor = "";
    let max = 0;
    for (const v of orden) {
      const r = votos[v][p.id];
      if ((cuenta.get(r) ?? 0) > max) {
        max = cuenta.get(r)!;
        mejor = r;
      }
    }
    respuestas[p.id] = mejor;
  }
  let puntaje = 0;
  let maximo = 0;
  const detalle = caso.resolucion.preguntas.map((p) => {
    const correcta = respuestas[p.id] === p.respuesta;
    maximo += p.puntos;
    if (correcta) puntaje += p.puntos;
    return { pregunta: p.id, correcta, puntos: correcta ? p.puntos : 0 };
  });
  if (s.config.puntaje && s.config.ayudas === "limitadas") puntaje -= s.ayudasUsadas.length * 3;
  s.acusacion = { respuestas, autor: anfitrion ?? orden[0], hora: Date.now(), puntaje: Math.max(0, puntaje), maximo, detalle };
  if (s.traidor && caso.traidor) {
    // el traidor gana si el equipo votó lo que él buscaba y no lo descubrieron
    const cuenta = new Map<string, number>();
    for (const v of orden) if (votos[v].traidor) cuenta.set(votos[v].traidor, (cuenta.get(votos[v].traidor) ?? 0) + 1);
    let votado = "";
    let max = 0;
    for (const v of orden) {
      const r = votos[v].traidor;
      if (r && (cuenta.get(r) ?? 0) > max) {
        max = cuenta.get(r)!;
        votado = r;
      }
    }
    const descubierto = votado === s.traidor;
    const cumplio = respuestas[caso.traidor.objetivo.pregunta] === caso.traidor.objetivo.respuesta;
    s.acusacion.traidor = { id: s.traidor, votado, descubierto, cumplio, gana: cumplio && !descubierto ? "traidor" : "equipo" };
  }
  s.fase = "terminada";
  log("⚖️ El equipo presentó la acusación final");
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
