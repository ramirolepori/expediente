import { randomBytes } from "node:crypto";
import { ErrorDeJuego, nuevoId } from "@/motor/reductor";
import { CONFIG_POR_DEFECTO, type ConfigPartida, type TipoConexion } from "@/motor/tipos";
import { almacen, type Sala } from "./almacen";
import { casoDeAutor } from "./casosAutor";
import { obtenerOficial } from "./casosOficiales";

const LETRAS = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // sin I ni O para no confundir
const COLORES = ["#e4572e", "#29a3a3", "#f3a712", "#8e7dbe", "#7bb661", "#e86a92", "#4f8fd6", "#c9a227"];

export class ErrorSala extends Error {
  constructor(msg: string, public status = 400) {
    super(msg);
  }
}

/**
 * El caso de una sala: oficial o de un autor (ADR 0012). Los de autor sin publicar son de prueba
 * y se juegan con el modelo falso, para no gastar la cuota de Gemini.
 */
export async function casoDeSala(casoId: string) {
  const oficial = await obtenerOficial(casoId).catch(() => { throw new ErrorSala("No se pudo cargar el caso", 503); });
  if (oficial) return { caso: oficial, dePrueba: false };
  const deAutor = await casoDeAutor(casoId).catch(() => null);
  if (!deAutor) throw new ErrorSala("Ese caso no existe o ya no se puede jugar", 404);
  return deAutor;
}

export async function crearSala(casoId: string, config?: Partial<ConfigPartida>) {
  await casoDeSala(casoId);
  let codigo = "";
  do {
    codigo = Array.from({ length: 4 }, () => LETRAS[Math.floor(Math.random() * LETRAS.length)]).join("");
  } while (await almacen.obtener(codigo));
  await almacen.crear({
    tokens: {},
    estado: {
      codigo,
      casoId,
      config: { ...CONFIG_POR_DEFECTO, ...config },
      fase: "lobby",
      creada: Date.now(),
      iniciada: null,
      conexiones: {},
      sobresAbiertos: [],
      hechosRevelados: [],
      candadosAbiertos: [],
      ayudasUsadas: [],
      personajesVisitados: [],
      intentosCandado: 0,
      notas: [],
      interrogatorios: {},
      acusacion: null,
      eventos: [],
      version: 0,
    },
  });
  return codigo;
}

export async function unirse(codigo: string, apodo: string, tipo: TipoConexion, token?: string) {
  const sala = await almacen.obtener(codigo);
  if (!sala) throw new ErrorSala("No existe una sala con ese código", 404);
  if (token && sala.tokens[token]) {
    return { token, conexionId: sala.tokens[token] };
  }
  const { caso } = await casoDeSala(sala.estado.casoId);
  const nombre = apodo.trim().slice(0, 24) || (tipo === "pantalla" ? "Pantalla" : "");
  if (!nombre) throw new ErrorSala("Elegí un apodo");
  const jugadores = Object.values(sala.estado.conexiones).filter((c) => c.tipo === "jugador");
  if (tipo === "jugador" && jugadores.length >= caso.meta.jugadores.max) {
    throw new ErrorSala(`El caso admite hasta ${caso.meta.jugadores.max} jugadores`);
  }
  if (tipo === "jugador" && jugadores.some((j) => j.apodo.toLowerCase() === nombre.toLowerCase())) {
    throw new ErrorSala("Ya hay alguien con ese apodo");
  }
  const nuevoToken = randomBytes(18).toString("base64url");
  const conexionId = nuevoId();
  await almacen.actualizar(codigo, (s): Sala => {
    const estado = structuredClone(s.estado);
    estado.conexiones[conexionId] = {
      id: conexionId,
      tipo,
      apodo: nombre,
      color: tipo === "pantalla" ? "#9a9a9a" : COLORES[jugadores.length % COLORES.length],
      anfitrion: tipo === "jugador" && jugadores.length === 0,
      ultimaVez: Date.now(),
    };
    estado.eventos.push({ id: nuevoId(), hora: Date.now(), texto: tipo === "pantalla" ? "Se conectó una pantalla compartida" : `${nombre} se sumó a la investigación` });
    estado.version++;
    return { estado, tokens: { ...s.tokens, [nuevoToken]: conexionId } };
  });
  return { token: nuevoToken, conexionId };
}

export async function autenticarConexion(codigo: string, token: string | null) {
  const sala = await almacen.obtener(codigo);
  if (!sala) throw new ErrorSala("No existe una sala con ese código", 404);
  const conexionId = token ? sala.tokens[token] : undefined;
  if (!conexionId || !sala.estado.conexiones[conexionId]) throw new ErrorSala("No estás en esta sala", 401);
  return { sala, conexionId };
}

export async function autenticar(codigo: string, token: string | null) {
  const { sala, conexionId } = await autenticarConexion(codigo, token);
  const { caso, dePrueba } = await casoDeSala(sala.estado.casoId);
  return { sala, conexionId, caso, dePrueba };
}

export function respuestaError(e: unknown) {
  if (e instanceof ErrorSala) return Response.json({ error: e.message }, { status: e.status });
  if (e instanceof ErrorDeJuego) return Response.json({ error: e.message }, { status: 400 });
  console.error(e);
  return Response.json({ error: "Error inesperado" }, { status: 500 });
}
