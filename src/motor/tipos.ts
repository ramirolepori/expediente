import type { Emocion } from "@/componentes/personaje/emociones";

export type Modo = "cooperativo" | "competitivo" | "traidor";
export type DondeSuena = "nadie" | "compartida" | "interrogador" | "todos";

export interface ConfigPartida {
  modo: Modo;
  /** null = sin límite de horas de investigación */
  recursos: number | null;
  puntaje: boolean;
  ayudas: "ilimitadas" | "limitadas" | "apagadas";
  temporizadorMin: number | null;
  voz: boolean;
  audioEn: DondeSuena;
}

export const CONFIG_POR_DEFECTO: ConfigPartida = {
  modo: "cooperativo",
  recursos: null,
  puntaje: true,
  ayudas: "limitadas",
  temporizadorMin: null,
  voz: true,
  // sin voces por defecto: activarlas baja unos 300 MB en el dispositivo que suena
  audioEn: "nadie",
};

export type TipoConexion = "jugador" | "pantalla";

export interface Conexion {
  id: string;
  tipo: TipoConexion;
  apodo: string;
  color: string;
  anfitrion: boolean;
  ultimaVez: number;
}

export interface Nota {
  id: string;
  autor: string;
  texto: string;
  visibilidad: "privada" | "equipo";
  hora: number;
}

export interface MensajeInterrogatorio {
  id: string;
  de: "jugador" | "personaje" | "sistema";
  /** id de conexión si es jugador */
  autor?: string;
  texto: string;
  /** prueba mostrada al personaje */
  prueba?: string;
  hora: number;
  audioUrl?: string;
  /** emoción con la que respondió el personaje (la elige el modelo) */
  emocion?: Emocion;
}

export interface ResultadoAcusacion {
  respuestas: Record<string, string>;
  autor: string;
  hora: number;
  puntaje: number;
  maximo: number;
  detalle: { pregunta: string; correcta: boolean; puntos: number }[];
  /** solo en modo traidor */
  traidor?: { id: string; votado: string; descubierto: boolean; cumplio: boolean; gana: "equipo" | "traidor" };
}

export type RefPizarra = { tipo: "prueba" | "hecho" | "personaje" | "nota"; id: string };

export interface Pizarra {
  /** tarjetas en el corcho; x e y en porcentaje del tablero (0 a 100) */
  items: { id: string; ref: RefPizarra; x: number; y: number; autor: string }[];
  hilos: { id: string; a: string; b: string; autor: string }[];
  linea: { id: string; ref: RefPizarra; hora: string; autor: string }[];
}

export const PIZARRA_VACIA: Pizarra = { items: [], hilos: [], linea: [] };

export interface Evento {
  id: string;
  hora: number;
  texto: string;
}

export interface EstadoPartida {
  codigo: string;
  casoId: string;
  config: ConfigPartida;
  fase: "lobby" | "jugando" | "terminada";
  creada: number;
  iniciada: number | null;
  conexiones: Record<string, Conexion>;
  sobresAbiertos: string[];
  hechosRevelados: string[];
  candadosAbiertos: string[];
  /** minijuego → conexión que lo resolvió (opcional para salas creadas antes) */
  minijuegosResueltos?: Record<string, string>;
  ayudasUsadas: string[];
  /** personajes con los que ya se habló (cada nuevo cuesta un recurso) */
  personajesVisitados: string[];
  intentosCandado: number;
  notas: Nota[];
  interrogatorios: Record<string, MensajeInterrogatorio[]>;
  /** votos de acusación: conexión → respuestas (opcional para salas creadas antes de la votación) */
  votos?: Record<string, Record<string, string>>;
  /** corcho compartido (opcional para salas creadas antes) */
  pizarra?: Pizarra;
  /** conexión que juega de traidor (modo traidor) */
  traidor?: string | null;
  acusacion: ResultadoAcusacion | null;
  eventos: Evento[];
  version: number;
}

export type Accion =
  | { tipo: "iniciar" }
  | { tipo: "salir" }
  | { tipo: "pizarraColocar"; ref: RefPizarra; x: number; y: number }
  | { tipo: "pizarraMover"; item: string; x: number; y: number }
  | { tipo: "pizarraQuitar"; item: string }
  | { tipo: "pizarraHilo"; a: string; b: string }
  | { tipo: "lineaAgregar"; ref: RefPizarra; hora: string }
  | { tipo: "lineaQuitar"; id: string }
  | { tipo: "abrirSobre"; sobre: string }
  | { tipo: "probarCandado"; candado: string; codigo: string }
  | { tipo: "resolverMinijuego"; minijuego: string; respuesta: string }
  | { tipo: "pedirAyuda" }
  | { tipo: "nota"; texto: string; visibilidad: "privada" | "equipo" }
  | { tipo: "borrarNota"; id: string }
  | { tipo: "votar"; respuestas: Record<string, string> }
  | { tipo: "retirarVoto" }
  | { tipo: "cerrarVotacion" }
  | { tipo: "configurar"; config: Partial<ConfigPartida> };
