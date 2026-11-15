import { z } from "zod";

/**
 * Contrato de un caso. Todo caso que cumpla este schema (y pase el validador)
 * se puede jugar en la plataforma.
 */

export const AMBIENTACIONES = ["policial", "noir", "medico", "terror", "epoca"] as const;

export type Condicion =
  | { tipo: "siempre" }
  | { tipo: "sobre"; sobre: string }
  | { tipo: "prueba"; prueba: string }
  | { tipo: "hecho"; hecho: string }
  | { tipo: "candado"; candado: string }
  | { tipo: "todas"; condiciones: Condicion[] }
  | { tipo: "alguna"; condiciones: Condicion[] };

export const CondicionSchema: z.ZodType<Condicion> = z.lazy(() =>
  z.discriminatedUnion("tipo", [
    z.object({ tipo: z.literal("siempre") }),
    z.object({ tipo: z.literal("sobre"), sobre: z.string() }),
    z.object({ tipo: z.literal("prueba"), prueba: z.string() }),
    z.object({ tipo: z.literal("hecho"), hecho: z.string() }),
    z.object({ tipo: z.literal("candado"), candado: z.string() }),
    z.object({ tipo: z.literal("todas"), condiciones: z.array(CondicionSchema).min(1) }),
    z.object({ tipo: z.literal("alguna"), condiciones: z.array(CondicionSchema).min(1) }),
  ]),
);

const Id = z.string().regex(/^[a-z0-9_]+$/, "ids en minúscula, números y guion bajo");

export const HechoSchema = z.object({
  id: Id,
  texto: z.string(),
});

const MensajeChat = z.object({
  hora: z.string(),
  de: z.enum(["victima", "contacto"]),
  texto: z.string(),
});

export const CelularSchema = z.object({
  bloqueo: z.string().optional().describe("texto extra de la pantalla de bloqueo"),
  hora: z.string().default("00:00").describe("hora que muestra el teléfono"),
  fecha: z.string().optional().describe("fecha de la pantalla de bloqueo, ej. 'lunes 15 de abril'"),
  bateria: z.number().int().min(0).max(100).default(50),
  dueno: z.string().optional().describe("nombre que aparece como dueño, ej. 'Julia'"),
  chats: z.array(z.object({ contacto: z.string(), mensajes: z.array(MensajeChat) })).default([]),
  llamadas: z
    .array(
      z.object({
        hora: z.string(),
        contacto: z.string(),
        tipo: z.enum(["entrante", "saliente", "perdida"]),
        duracion: z.string().optional(),
      }),
    )
    .default([]),
  correos: z
    .array(z.object({ hora: z.string(), para: z.string(), asunto: z.string(), cuerpo: z.string() }))
    .default([]),
  notas: z.array(z.object({ hora: z.string(), texto: z.string() })).default([]),
});

export const TIPOS_PRUEBA = [
  "informe",
  "declaracion",
  "registro",
  "foto",
  "objeto",
  "documento",
  "celular",
  "video",
  "audio",
  "mapa",
] as const;

export const PruebaSchema = z.object({
  id: Id,
  titulo: z.string(),
  tipo: z.enum(TIPOS_PRUEBA),
  sobre: Id,
  /** condición extra además de que el sobre esté abierto */
  desbloqueo: CondicionSchema.optional(),
  /** markdown */
  contenido: z.string(),
  imagen: z.string().optional(),
  celular: CelularSchema.optional(),
  /** si se define, solo esos roles la ven (modo roles) */
  roles: z.array(Id).optional(),
});

export const SecretoSchema = z.object({
  id: Id,
  hecho: Id,
  /** cuándo puede soltarlo: el servidor lo valida */
  cuando: CondicionSchema,
  /** cómo lo cuenta y qué tiene que pasar en la charla para que lo diga */
  como: z.string(),
});

export const MentiraSchema = z.object({
  tema: z.string(),
  dice: z.string(),
  /** con qué prueba o hecho se le cae la mentira */
  cae: CondicionSchema,
  alCaer: z.string(),
});

export const VozSchema = z.object({
  genero: z.enum(["femenino", "masculino"]),
  edad: z.enum(["joven", "adulto", "mayor"]),
  velocidad: z.number().min(0.5).max(2).default(1),
  tono: z.string().optional(),
});

export const PersonajeSchema = z.object({
  id: Id,
  nombre: z.string(),
  rol: z.string(),
  edad: z.number().int().optional(),
  descripcion: z.string().describe("lo que el grupo sabe de esta persona"),
  personalidad: z.string(),
  formaDeHablar: z.string(),
  interrogable: z.boolean().default(true),
  disponible: CondicionSchema.default({ tipo: "siempre" }),
  /** hechos que conoce y puede contar libremente si le preguntan */
  sabe: z.array(Id).default([]),
  secretos: z.array(SecretoSchema).default([]),
  mentiras: z.array(MentiraSchema).default([]),
  /** cosas de color que puede improvisar sin afectar el caso */
  color: z.string().optional(),
  voz: VozSchema,
});

export const SobreSchema = z.object({
  id: Id,
  titulo: z.string(),
  descripcion: z.string(),
  /** condición para poder abrirlo (además de abrirlo a mano) */
  requisito: CondicionSchema,
});

export const CandadoSchema = z.object({
  id: Id,
  titulo: z.string(),
  descripcion: z.string(),
  disponible: CondicionSchema,
  /** se compara normalizado: sin espacios, mayúsculas */
  codigo: z.string(),
  pista: z.string(),
});

export const AyudaSchema = z.object({
  id: Id,
  disponible: CondicionSchema,
  nivel: z.number().int().min(1).max(3),
  texto: z.string(),
});

export const PreguntaSchema = z.object({
  id: Id,
  texto: z.string(),
  tipo: z.enum(["personaje", "opcion"]),
  opciones: z.array(z.object({ id: Id, texto: z.string() })).optional(),
  /** en preguntas de personaje, ofrece "Nadie" como respuesta (para no adelantar que hubo cómplices) */
  permiteNadie: z.boolean().default(false),
  /** id de personaje u opción correcta ("nadie" si corresponde) */
  respuesta: Id,
  puntos: z.number().int().positive(),
  explicacion: z.string(),
});

export const VerdadSchema = z.object({
  resumen: z.string(),
  culpables: z.array(
    z.object({
      personaje: Id,
      papel: z.enum(["autor", "complice", "autor_intelectual"]),
      detalle: z.string(),
    }),
  ),
  movil: z.string(),
  medio: z.string(),
  cronologia: z.array(z.object({ hora: z.string(), hecho: z.string() })),
});

/** Rol secreto del modo traidor: un jugador recibe esta ficha y juega en contra del equipo. */
export const TraidorSchema = z.object({
  rol: z.string().describe("quién es en la historia, en segunda persona"),
  objetivo: z.object({
    texto: z.string(),
    /** pregunta de la resolución que el traidor quiere torcer */
    pregunta: Id,
    /** respuesta que el traidor quiere que el equipo vote */
    respuesta: Id,
  }),
  /** hechos que conoce desde el arranque */
  sabe: z.array(Id).default([]),
  consejos: z.array(z.string()).default([]),
});

export const CasoSchema = z.object({
  version: z.literal(1),
  meta: z.object({
    id: Id,
    titulo: z.string(),
    sinopsis: z.string(),
    duracionMin: z.number().int(),
    dificultad: z.enum(["facil", "media", "dificil"]),
    jugadores: z.object({ min: z.number().int().min(1), max: z.number().int().max(12) }),
    advertencias: z.array(z.string()).default([]),
    inspiracion: z.string().optional(),
  }),
  ambientacion: z.enum(AMBIENTACIONES),
  introduccion: z.string().describe("lo que lee el grupo al arrancar (markdown)"),
  verdad: VerdadSchema,
  hechos: z.array(HechoSchema),
  personajes: z.array(PersonajeSchema),
  sobres: z.array(SobreSchema).min(1),
  pruebas: z.array(PruebaSchema),
  candados: z.array(CandadoSchema).default([]),
  ayudas: z.array(AyudaSchema).default([]),
  resolucion: z.object({ preguntas: z.array(PreguntaSchema).min(1) }),
  modos: z.array(z.enum(["cooperativo", "competitivo", "traidor"])).default(["cooperativo"]),
  traidor: TraidorSchema.optional(),
});

export type Caso = z.infer<typeof CasoSchema>;
export type Personaje = z.infer<typeof PersonajeSchema>;
export type Prueba = z.infer<typeof PruebaSchema>;
export type Ambientacion = (typeof AMBIENTACIONES)[number];
