import type { Caso } from "@/casos/schema";
import { evaluar, pruebasVisibles } from "./condiciones";
import { recursosRestantes } from "./reductor";
import type { EstadoPartida } from "./tipos";

/**
 * Lo único que viaja al navegador. Nunca incluye la verdad, los secretos,
 * las mentiras ni los códigos de los candados mientras la partida está en curso.
 */
export function vistaPara(caso: Caso, estado: EstadoPartida, conexionId: string | null) {
  const yo = conexionId ? (estado.conexiones[conexionId] ?? null) : null;
  const terminada = estado.fase === "terminada";
  return {
    codigo: estado.codigo,
    fase: estado.fase,
    config: estado.config,
    iniciada: estado.iniciada,
    version: estado.version,
    yo,
    conexiones: Object.values(estado.conexiones),
    caso: {
      meta: caso.meta,
      ambientacion: caso.ambientacion,
      introduccion: caso.introduccion,
    },
    sobres: caso.sobres.map((s) => ({
      id: s.id,
      titulo: s.titulo,
      descripcion: s.descripcion,
      abierto: estado.sobresAbiertos.includes(s.id),
      sePuedeAbrir: evaluar(s.requisito, estado, caso),
    })),
    pruebas: estado.fase === "lobby" ? [] : pruebasVisibles(estado, caso),
    // un personaje todavía no disponible no revela ni su nombre (sería un spoiler)
    personajes: caso.personajes
      .filter((p) => p.interrogable)
      .map((p) => {
        const disponible = terminada || evaluar(p.disponible, estado, caso);
        return disponible
          ? { id: p.id, nombre: p.nombre, rol: p.rol, edad: p.edad, descripcion: p.descripcion, disponible: true, visitado: estado.personajesVisitados.includes(p.id) }
          : { id: p.id, nombre: "???", rol: "", edad: undefined, descripcion: "", disponible: false, visitado: false };
      }),
    descubrimientos: caso.hechos.filter((h) => estado.hechosRevelados.includes(h.id)),
    candados: caso.candados
      .filter((c) => evaluar(c.disponible, estado, caso))
      .map((c) => ({ id: c.id, titulo: c.titulo, descripcion: c.descripcion, abierto: estado.candadosAbiertos.includes(c.id) })),
    ayudas: caso.ayudas.filter((a) => estado.ayudasUsadas.includes(a.id)).map((a) => ({ id: a.id, texto: a.texto })),
    recursosRestantes: recursosRestantes(estado),
    notas: estado.notas.filter((n) => n.visibilidad === "equipo" || n.autor === conexionId),
    interrogatorios: estado.interrogatorios,
    eventos: estado.eventos.slice(-60),
    preguntas: caso.resolucion.preguntas.map((p) => ({
      id: p.id,
      texto: p.texto,
      tipo: p.tipo,
      opciones: p.opciones,
      ...(terminada ? { respuesta: p.respuesta, explicacion: p.explicacion } : {}),
    })),
    acusacion: estado.acusacion,
    verdad: terminada ? caso.verdad : null,
  };
}

export type VistaPartida = ReturnType<typeof vistaPara>;
