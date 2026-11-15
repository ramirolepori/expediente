import type { Caso } from "@/casos/schema";
import { aparienciaPublica } from "./apariencia";
import { evaluar, minijuegoVisible, pruebaVisible, pruebasVisibles } from "./condiciones";
import { LIMITES_INTERROGATORIO, preguntasHechas } from "./interrogatorio";
import { configPublica } from "./minijuegos";
import { recursosRestantes } from "./reductor";
import type { EstadoPartida } from "./tipos";
import { vocesDeLectura, vocesDelElenco } from "./voz";

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
    sobres: caso.sobres.map((s) => {
      const abierto = estado.sobresAbiertos.includes(s.id);
      const sePuedeAbrir = evaluar(s.requisito, estado, caso);
      return {
        id: s.id,
        titulo: s.titulo,
        // la descripción suele resumir lo que el grupo ya descubrió: viaja recién cuando el sobre se puede abrir
        descripcion: abierto || sePuedeAbrir ? s.descripcion : "",
        abierto,
        sePuedeAbrir,
        // la escena solo viaja con el sobre abierto, y sin los puntos de pruebas todavía bloqueadas
        // (un círculo de más adelantaría que ahí hay algo)
        escena:
          abierto && s.escena
            ? {
                imagen: s.escena.imagen,
                proporcion: s.escena.proporcion,
                descripcion: s.escena.descripcion ?? s.titulo,
                puntos: s.escena.puntos.filter((pt) => pruebaVisible(pt.prueba, estado, caso)),
              }
            : null,
      };
    }),
    pruebas: estado.fase === "lobby" ? [] : pruebasVisibles(estado, caso),
    // voces para leer documentos en voz alta, y lo que alguien mandó a leer en la tele
    lectura: vocesDeLectura(caso.ambientacion, caso.personajes.filter((p) => p.interrogable), caso.narrador),
    narracion: estado.narracion ?? null,
    // un personaje todavía no disponible no revela ni su nombre (sería un spoiler)
    personajes: caso.personajes
      .filter((p) => p.interrogable)
      .map((p, _, interrogables) => {
        const disponible = terminada || evaluar(p.disponible, estado, caso);
        return disponible
          ? { id: p.id, nombre: p.nombre, rol: p.rol, edad: p.edad, descripcion: p.descripcion, voz: vocesDelElenco(interrogables)[p.id], apariencia: aparienciaPublica(p), disponible: true, visitado: estado.personajesVisitados.includes(p.id) }
          : { id: p.id, nombre: "???", rol: "", edad: undefined, descripcion: "", voz: undefined, apariencia: undefined, disponible: false, visitado: false };
      }),
    descubrimientos: caso.hechos.filter((h) => estado.hechosRevelados.includes(h.id)),
    candados: caso.candados
      .filter((c) => evaluar(c.disponible, estado, caso))
      .map((c) => ({ id: c.id, titulo: c.titulo, descripcion: c.descripcion, abierto: estado.candadosAbiertos.includes(c.id) })),
    minijuegos: caso.minijuegos
      .filter((m) => estado.fase !== "lobby" && minijuegoVisible(m.id, estado, caso))
      .map((m) => ({
        id: m.id,
        titulo: m.titulo,
        descripcion: m.descripcion,
        sobre: m.sobre,
        modo: m.modo,
        tipo: m.tipo,
        config: configPublica(m, estado.codigo),
        resueltoPor: estado.minijuegosResueltos?.[m.id] ?? null,
      })),
    ayudas: caso.ayudas.filter((a) => estado.ayudasUsadas.includes(a.id)).map((a) => ({ id: a.id, texto: a.texto })),
    recursosRestantes: recursosRestantes(estado),
    notas: estado.notas.filter((n) => n.visibilidad === "equipo" || n.autor === conexionId),
    interrogatorios: estado.interrogatorios,
    preguntasRestantes: Math.max(0, LIMITES_INTERROGATORIO.porPartida - preguntasHechas(estado)),
    eventos: estado.eventos.slice(-60),
    preguntas: caso.resolucion.preguntas.map((p) => ({
      id: p.id,
      texto: p.texto,
      tipo: p.tipo,
      opciones: p.opciones,
      permiteNadie: p.permiteNadie,
      ...(terminada ? { respuesta: p.respuesta, explicacion: p.explicacion } : {}),
    })),
    pizarra: estado.pizarra ?? { items: [], hilos: [], linea: [] },
    votos: estado.votos ?? {},
    // la ficha secreta solo le llega al traidor; el resto ni sabe quién es hasta el final
    fichaTraidor:
      caso.traidor && estado.traidor && conexionId === estado.traidor
        ? {
            rol: caso.traidor.rol,
            objetivo: caso.traidor.objetivo.texto,
            sabe: caso.traidor.sabe.map((h) => caso.hechos.find((x) => x.id === h)?.texto ?? h),
            consejos: caso.traidor.consejos,
          }
        : null,
    hayTraidor: !!estado.traidor,
    traidorRevelado: terminada ? (estado.traidor ?? null) : null,
    acusacion: estado.acusacion,
    verdad: terminada ? caso.verdad : null,
  };
}

export type VistaPartida = ReturnType<typeof vistaPara>;
