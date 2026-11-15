import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { ErrorSala } from "./salas";

/**
 * Cuentas de autor (ADR 0012). El navegador entra con Google o GitHub por Supabase Auth y manda
 * su token en `Authorization: Bearer`. Acá se valida contra Supabase y se calcula el rol.
 * - Administradores: los mails de la variable ADMIN_EMAILS (separados por coma). No viven en el repo.
 * - Moderadores: los mails de la tabla `moderadores`, que maneja un administrador.
 * - Con AUTH_FALSO=1 (tests y desarrollo, nunca en Vercel) se acepta el token `falso:<mail>`.
 */
export type Rol = "admin" | "moderador" | "autor";

export interface Autor {
  id: string;
  email: string;
  nombre: string | null;
  rol: Rol;
}

const normalizar = (email: string) => email.trim().toLowerCase();

export function administradores(valor = process.env.ADMIN_EMAILS ?? ""): string[] {
  return valor.split(",").map(normalizar).filter(Boolean);
}

export function rolDe(email: string, admins: string[], moderadores: string[]): Rol {
  const e = normalizar(email);
  if (admins.includes(e)) return "admin";
  if (moderadores.includes(e)) return "moderador";
  return "autor";
}

/** Formato mínimo de un mail: alcanza para no guardar basura, el login real lo valida Supabase. */
export function mailValido(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) && email.length <= 254;
}

interface Datos {
  verificar(token: string): Promise<{ id: string; email: string; nombre: string | null } | null>;
  guardarPerfil(autor: Omit<Autor, "rol">): Promise<void>;
  moderadores(): Promise<string[]>;
  agregarModerador(email: string): Promise<void>;
  quitarModerador(email: string): Promise<void>;
}

class DatosSupabase implements Datos {
  constructor(private db: SupabaseClient) {}

  async verificar(token: string) {
    const { data, error } = await this.db.auth.getUser(token);
    if (error || !data.user?.email) return null;
    const meta = data.user.user_metadata as { full_name?: string; name?: string } | undefined;
    return { id: data.user.id, email: normalizar(data.user.email), nombre: meta?.full_name ?? meta?.name ?? null };
  }

  async guardarPerfil(a: Omit<Autor, "rol">) {
    const { error } = await this.db.from("perfiles").upsert({ id: a.id, email: a.email, nombre: a.nombre });
    if (error) throw error;
  }

  async moderadores() {
    const { data, error } = await this.db.from("moderadores").select("email").order("email");
    if (error) throw error;
    return (data ?? []).map((m) => m.email as string);
  }

  async agregarModerador(email: string) {
    const { error } = await this.db.from("moderadores").upsert({ email });
    if (error) throw error;
  }

  async quitarModerador(email: string) {
    const { error } = await this.db.from("moderadores").delete().eq("email", email);
    if (error) throw error;
  }
}

class DatosFalsos implements Datos {
  private mods = new Set<string>();

  async verificar(token: string) {
    if (!token.startsWith("falso:")) return null;
    const email = normalizar(token.slice("falso:".length));
    return mailValido(email) ? { id: `falso-${email}`, email, nombre: email.split("@")[0] } : null;
  }
  async guardarPerfil() {}
  async moderadores() {
    return [...this.mods].sort();
  }
  async agregarModerador(email: string) {
    this.mods.add(email);
  }
  async quitarModerador(email: string) {
    this.mods.delete(email);
  }
}

function crearDatos(): Datos | null {
  if (process.env.AUTH_FALSO === "1" && !process.env.VERCEL) return new DatosFalsos();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secreta = process.env.SUPABASE_SECRET_KEY;
  if (url && secreta) return new DatosSupabase(createClient(url, secreta, { auth: { persistSession: false, autoRefreshToken: false } }));
  return null;
}

// sobrevive a los recargos en caliente de `next dev`
const g = globalThis as unknown as { __datosAutores?: Datos | null };
const datos = () => (g.__datosAutores ??= crearDatos());

/** Quién hace el pedido. Tira 401 sin sesión válida. Guarda o actualiza su perfil. */
export async function autorDelPedido(req: Request): Promise<Autor> {
  const d = datos();
  if (!d) throw new ErrorSala("Las cuentas de autor no están configuradas", 503);
  const token = req.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
  const usuario = token ? await d.verificar(token) : null;
  if (!usuario) throw new ErrorSala("Tenés que entrar con tu cuenta", 401);
  await d.guardarPerfil(usuario);
  return { ...usuario, rol: rolDe(usuario.email, administradores(), await d.moderadores()) };
}

export async function exigirAdmin(req: Request): Promise<Autor> {
  const autor = await autorDelPedido(req);
  if (autor.rol !== "admin") throw new ErrorSala("Solo un administrador puede hacer esto", 403);
  return autor;
}

export const listarModeradores = () => datos()!.moderadores();

export async function agregarModerador(email: string) {
  const e = normalizar(email);
  if (!mailValido(e)) throw new ErrorSala("Ese mail no es válido");
  await datos()!.agregarModerador(e);
}

export const quitarModerador = (email: string) => datos()!.quitarModerador(normalizar(email));
