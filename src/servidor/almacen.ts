import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { EstadoPartida } from "@/motor/tipos";

/**
 * Almacén de salas.
 * - Con SUPABASE_SECRET_KEY: Postgres en Supabase + aviso por Realtime (producción, Vercel).
 * - Sin eso: memoria del proceso (desarrollo local rápido).
 */
export interface Sala {
  estado: EstadoPartida;
  /** token secreto → id de conexión (no viaja nunca a los clientes) */
  tokens: Record<string, string>;
}

type Oyente = (sala: Sala) => void;

export interface Almacen {
  readonly tipo: "memoria" | "supabase";
  obtener(codigo: string): Promise<Sala | null>;
  crear(sala: Sala): Promise<void>;
  /** actualización atómica: fn recibe la sala actual y devuelve la nueva (la misma = sin cambios) */
  actualizar(codigo: string, fn: (sala: Sala) => Sala): Promise<Sala>;
  /** solo en memoria: para el stream SSE local */
  suscribir(codigo: string, oyente: Oyente): () => void;
  /** borra las salas sin escrituras desde `antesDe` (ms); devuelve cuántas borró */
  borrarViejas(antesDe: number): Promise<number>;
}

/** Una sala sin escrituras en este tiempo se da por abandonada (la limpia el cron diario). */
export const INACTIVIDAD_MAXIMA_MS = 24 * 60 * 60 * 1000;

export const canalSala = (codigo: string) => `sala-${codigo}`;

class AlmacenMemoria implements Almacen {
  readonly tipo = "memoria" as const;
  private salas = new Map<string, Sala>();
  private oyentes = new Map<string, Set<Oyente>>();
  /** código → última escritura (ms), como la columna `actualizada` de Supabase */
  private actualizada = new Map<string, number>();

  async obtener(codigo: string) {
    return this.salas.get(codigo) ?? null;
  }
  async crear(sala: Sala) {
    this.salas.set(sala.estado.codigo, sala);
    this.actualizada.set(sala.estado.codigo, Date.now());
  }
  async actualizar(codigo: string, fn: (sala: Sala) => Sala) {
    const actual = this.salas.get(codigo);
    if (!actual) throw new Error("Sala inexistente");
    const nueva = fn(actual);
    if (nueva !== actual) {
      this.salas.set(codigo, nueva);
      this.actualizada.set(codigo, Date.now());
      this.oyentes.get(codigo)?.forEach((o) => o(nueva));
    }
    return nueva;
  }
  suscribir(codigo: string, oyente: Oyente) {
    if (!this.oyentes.has(codigo)) this.oyentes.set(codigo, new Set());
    this.oyentes.get(codigo)!.add(oyente);
    return () => this.oyentes.get(codigo)?.delete(oyente);
  }
  async borrarViejas(antesDe: number) {
    let borradas = 0;
    for (const [codigo, cuando] of this.actualizada) {
      if (cuando >= antesDe) continue;
      this.salas.delete(codigo);
      this.actualizada.delete(codigo);
      this.oyentes.delete(codigo);
      borradas++;
    }
    return borradas;
  }
}

interface Fila {
  codigo: string;
  estado: EstadoPartida;
  tokens: Record<string, string>;
  version: number;
}

class AlmacenSupabase implements Almacen {
  readonly tipo = "supabase" as const;
  constructor(private db: SupabaseClient) {}

  async obtener(codigo: string) {
    const { data, error } = await this.db.from("salas").select("estado,tokens").eq("codigo", codigo).maybeSingle();
    if (error) throw error;
    return data ? { estado: data.estado as EstadoPartida, tokens: data.tokens as Record<string, string> } : null;
  }

  async crear(sala: Sala) {
    const { error } = await this.db.from("salas").insert({ codigo: sala.estado.codigo, estado: sala.estado, tokens: sala.tokens, version: 0 });
    if (error) throw error;
  }

  /** Concurrencia optimista: solo escribe si nadie cambió la fila desde que se leyó; si no, reintenta. */
  async actualizar(codigo: string, fn: (sala: Sala) => Sala) {
    for (let intento = 0; intento < 8; intento++) {
      const { data, error } = await this.db.from("salas").select("codigo,estado,tokens,version").eq("codigo", codigo).maybeSingle<Fila>();
      if (error) throw error;
      if (!data) throw new Error("Sala inexistente");
      const actual: Sala = { estado: data.estado, tokens: data.tokens };
      const nueva = fn(actual);
      if (nueva === actual) return actual;
      const { data: escrita, error: e2 } = await this.db
        .from("salas")
        .update({ estado: nueva.estado, tokens: nueva.tokens, version: data.version + 1, actualizada: new Date().toISOString() })
        .eq("codigo", codigo)
        .eq("version", data.version)
        .select("codigo");
      if (e2) throw e2;
      if (escrita && escrita.length === 1) {
        await this.avisar(codigo, nueva.estado.version);
        return nueva;
      }
      await new Promise((r) => setTimeout(r, 30 + Math.random() * 70));
    }
    throw new Error("La sala está muy ocupada, probá de nuevo");
  }

  /** Avisa a los dispositivos que hubo un cambio. No manda datos: cada uno pide su vista filtrada. */
  private async avisar(codigo: string, version: number) {
    try {
      await this.db.channel(canalSala(codigo)).httpSend("cambio", { version });
    } catch (e) {
      console.error("No se pudo avisar por Realtime", e);
    }
  }

  async borrarViejas(antesDe: number) {
    const { count, error } = await this.db.from("salas").delete({ count: "exact" }).lt("actualizada", new Date(antesDe).toISOString());
    if (error) throw error;
    return count ?? 0;
  }

  suscribir(): () => void {
    throw new Error("En Supabase el tiempo real va por Realtime, no por SSE");
  }
}

function crearAlmacen(): Almacen {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secreta = process.env.SUPABASE_SECRET_KEY;
  if (url && secreta) {
    return new AlmacenSupabase(createClient(url, secreta, { auth: { persistSession: false, autoRefreshToken: false } }));
  }
  if (process.env.VERCEL) throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SECRET_KEY");
  return new AlmacenMemoria();
}

// sobrevive a los recargos en caliente de `next dev`
const g = globalThis as unknown as { __almacen?: Almacen };
export const almacen: Almacen = (g.__almacen ??= crearAlmacen());
