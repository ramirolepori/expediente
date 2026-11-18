import { z } from "zod";
import { EMOCIONES } from "@/componentes/personaje/emociones";

/**
 * Contrato de un caso. Todo caso que cumpla este schema (y pase el validador)
 * se puede jugar en la plataforma.
 */

export const AMBIENTACIONES = ["policial", "noir", "medico", "terror", "epoca"] as const;

export type Condicion =
  | { tipo: "siempre" }
  | { tipo: "sobre"; sobre: string }
  | { tipo: "capitulo"; capitulo: string }
  | { tipo: "prueba"; prueba: string }
  | { tipo: "hecho"; hecho: string }
  | { tipo: "candado"; candado: string }
  | { tipo: "minijuego"; minijuego: string }
  | { tipo: "todas"; condiciones: Condicion[] }
  | { tipo: "alguna"; condiciones: Condicion[] };

export const CondicionSchema: z.ZodType<Condicion> = z.lazy(() =>
  z.discriminatedUnion("tipo", [
    z.object({ tipo: z.literal("siempre") }),
    z.object({ tipo: z.literal("sobre"), sobre: z.string() }),
    z.object({ tipo: z.literal("capitulo"), capitulo: z.string() }),
    z.object({ tipo: z.literal("prueba"), prueba: z.string() }),
    z.object({ tipo: z.literal("hecho"), hecho: z.string() }),
    z.object({ tipo: z.literal("candado"), candado: z.string() }),
    z.object({ tipo: z.literal("minijuego"), minijuego: z.string() }),
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

const Color = z.string().regex(/^#[0-9a-fA-F]{6}$/, "color en hex de 6 dígitos, ej. #3a3d44");

export const ESPECIES = ["humano", "perro", "gato", "loro"] as const;
export const EDADES_RASGO = ["bebe", "nino", "adolescente", "adulto", "mayor"] as const;
export const PEINADOS = ["corto", "entradas", "calvo", "rapado", "largo", "melena", "rulos", "rodete", "cola", "pelusa"] as const;
export const ROPAS = ["traje", "camisa", "remera", "buzo", "vestido", "uniforme", "delantal", "enterito"] as const;
export const ACCESORIOS = ["aros", "collar", "gorra", "sombrero", "baston", "chupete", "vapeador", "cigarrillo", "moño"] as const;

/** Cómo dibuja la plataforma a un personaje vectorial. Todo es opcional: lo que falta sale de su voz, edad e id. */
export const RasgosSchema = z
  .object({
    especie: z.enum(ESPECIES),
    cuerpo: z.enum(["femenino", "masculino", "neutro"]),
    edad: z.enum(EDADES_RASGO),
    piel: Color.describe("en animales, el pelaje o plumaje"),
    pelo: Color.describe("en animales, manchas, orejas o cresta"),
    ojos: Color,
    peinado: z.enum(PEINADOS),
    vello: z.enum(["ninguno", "bigote", "barba", "barba_corta", "candado"]),
    labios: Color.nullable().describe("labial; null sin maquillaje"),
    sombra: Color.nullable().describe("sombra de ojos; null sin maquillaje"),
    pecas: z.boolean(),
    arrugas: z.number().min(0).max(1),
    anteojos: z.enum(["ninguno", "redondos", "rectangulares", "sol"]),
    ropa: z.enum(ROPAS),
    colorRopa: Color,
    colorDetalle: Color.describe("camisa bajo el saco, cuello, vivos"),
    corbata: Color.nullable(),
    accesorios: z.array(z.enum(ACCESORIOS)),
    colorAccesorio: Color,
  })
  .partial();

export const AparienciaSchema = z.object({
  rasgos: RasgosSchema.optional(),
  /** una imagen por emoción (neutral obligatoria) y opcionalmente "hablando", servidas desde public/casos/<id>/ */
  retratos: z.partialRecord(z.enum([...EMOCIONES, "hablando"]), z.string().startsWith("/")).optional(),
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
  /** retratos del caso o, si no trae, vectorial con estos rasgos (o con rasgos por defecto) */
  apariencia: AparienciaSchema.optional(),
});

/** Escena ilustrada del sobre: una imagen con puntos que abren pruebas al tocarlos. */
export const EscenaSchema = z.object({
  /** imagen servida desde public/ (ej. /casos/vendimia/escenas/nave.jpg) */
  imagen: z.string().startsWith("/"),
  /** proporción de la imagen, ancho/alto (ej. 16/9 → 1.78) */
  proporcion: z.number().positive().default(16 / 9),
  descripcion: z.string().optional().describe("texto alternativo de la imagen"),
  puntos: z
    .array(
      z.object({
        prueba: Id,
        /** posición en porcentaje del ancho y del alto de la imagen */
        x: z.number().min(0).max(100),
        y: z.number().min(0).max(100),
        etiqueta: z.string(),
      }),
    )
    .min(1),
});

export const SobreSchema = z.object({
  id: Id,
  titulo: z.string(),
  descripcion: z.string(),
  /** condición para poder abrirlo (además de abrirlo a mano) */
  requisito: CondicionSchema,
  escena: EscenaSchema.optional(),
  resumen: z.string().trim().min(1).optional(),
  preguntaCapitulo: z.object({
    texto: z.string().trim().min(1),
    opciones: z.array(z.object({ id: Id, texto: z.string().trim().min(1) })).min(2),
    respuesta: Id,
    disponible: CondicionSchema.optional(),
    orientacion: z.string().trim().min(1).optional(),
    cierre: z.string().trim().min(1),
    gancho: z.string().trim().min(1),
  }).optional(),
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

/**
 * Minijuegos: el caso trae los suyos. Los de catálogo solo traen datos; el personalizado trae su propia página.
 * Al resolverse, cualquier cosa del caso puede depender de { tipo: "minijuego", minijuego: id }.
 */
const MinijuegoBase = {
  id: Id,
  titulo: z.string(),
  descripcion: z.string(),
  sobre: Id,
  disponible: CondicionSchema.default({ tipo: "siempre" }),
  /** compartido: todos lo ven resolverse; individual: cada uno lo intenta en su dispositivo */
  modo: z.enum(["individual", "compartido"]).default("individual"),
};

export const MinijuegoSchema = z.discriminatedUnion("tipo", [
  z.object({
    ...MinijuegoBase,
    tipo: z.literal("rompecabezas"),
    /** fragmentos del documento en el orden correcto; la plataforma los mezcla */
    config: z.object({ fragmentos: z.array(z.string()).min(3) }),
  }),
  z.object({
    ...MinijuegoBase,
    tipo: z.literal("linea_tiempo"),
    /** eventos en el orden correcto; la plataforma los mezcla */
    config: z.object({ eventos: z.array(z.string()).min(3) }),
  }),
  z.object({
    ...MinijuegoBase,
    tipo: z.literal("cifrado"),
    config: z.object({
      cifrado: z.enum(["cesar"]),
      mensaje: z.string().describe("texto ya cifrado"),
      pista: z.string().optional(),
    }),
    /** texto descifrado esperado */
    solucion: z.string(),
  }),
  z.object({
    ...MinijuegoBase,
    tipo: z.literal("personalizado"),
    /** página propia del caso, servida desde public/ (ej. /casos/hotel-aurora/minijuegos/caja.html) */
    config: z.object({ pagina: z.string().startsWith("/"), alto: z.number().int().default(520) }),
    /** respuesta que la página tiene que devolver con postMessage */
    solucion: z.string(),
  }),
]);

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
  /** voz de quien lee los documentos en voz alta; si falta, una según la ambientación */
  narrador: VozSchema.optional(),
  introduccion: z.string().describe("lo que lee el grupo al arrancar (markdown)"),
  verdad: VerdadSchema,
  hechos: z.array(HechoSchema),
  personajes: z.array(PersonajeSchema),
  sobres: z.array(SobreSchema).min(1),
  pruebas: z.array(PruebaSchema),
  candados: z.array(CandadoSchema).default([]),
  minijuegos: z.array(MinijuegoSchema).default([]),
  ayudas: z.array(AyudaSchema).default([]),
  resolucion: z.object({
    preguntas: z.array(PreguntaSchema).min(1),
    requisito: CondicionSchema.optional(),
  }),
  modos: z.array(z.enum(["cooperativo", "competitivo", "traidor"])).default(["cooperativo"]),
  traidor: TraidorSchema.optional(),
});

export type Caso = z.infer<typeof CasoSchema>;
export type Personaje = z.infer<typeof PersonajeSchema>;
export type RasgosCaso = z.infer<typeof RasgosSchema>;
export type Prueba = z.infer<typeof PruebaSchema>;
export type Ambientacion = (typeof AMBIENTACIONES)[number];
export type Minijuego = z.infer<typeof MinijuegoSchema>;
