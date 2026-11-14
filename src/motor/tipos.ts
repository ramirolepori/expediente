export type Modo = "cooperativo" | "competitivo" | "traidor";
export type DondeSuena = "compartida" | "interrogador" | "todos";

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
  audioEn: "compartida",
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
}

export interface ResultadoAcusacion {
  respuestas: Record<string, string>;
  autor: string;
  hora: number;
  puntaje: number;
  maximo: number;
  detalle: { pregunta: string; correcta: boolean; puntos: number }[];
}

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
  ayudasUsadas: string[];
  /** personajes con los que ya se habló (cada nuevo cuesta un recurso) */
  personajesVisitados: string[];
  intentosCandado: number;
  notas: Nota[];
  interrogatorios: Record<string, MensajeInterrogatorio[]>;
  /** votos de acusación: conexión → respuestas (opcional para salas creadas antes de la votación) */
  votos?: Record<string, Record<string, string>>;
  acusacion: ResultadoAcusacion | null;
  eventos: Evento[];
  version: number;
}

export type Accion =
  | { tipo: "iniciar" }
  | { tipo: "salir" }
  | { tipo: "abrirSobre"; sobre: string }
  | { tipo: "probarCandado"; candado: string; codigo: string }
  | { tipo: "pedirAyuda" }
  | { tipo: "nota"; texto: string; visibilidad: "privada" | "equipo" }
  | { tipo: "borrarNota"; id: string }
  | { tipo: "votar"; respuestas: Record<string, string> }
  | { tipo: "retirarVoto" }
  | { tipo: "cerrarVotacion" }
  | { tipo: "configurar"; config: Partial<ConfigPartida> };
