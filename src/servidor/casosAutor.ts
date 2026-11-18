import { randomBytes } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { CasoSchema, type Caso } from "@/casos/schema";
import { BYTES_CABECERA } from "@/motor/validador-archivos";
import { revisarCaso, type ArchivoPaquete, type Hallazgo } from "@/motor/validador";
import type { Autor } from "./autores";
import { ErrorSala } from "./salas";

/**
 * Casos de autores en Supabase (ADR 0012): el JSON en la tabla `casos_autor`, las imágenes en el bucket
 * `casos-autores`. El navegador sube las imágenes directo a Storage con URLs firmadas (el límite de Vercel
 * es 4,5 MB por pedido) y después el servidor las vuelve a leer para validarlas de verdad.
 *
 * Estados: borrador (con errores) → validado → privado (se juega por link, con el modelo falso) → publicado
 * (en el catálogo, con el modelo real). Publicar lo decide un moderador o un administrador.
 */
export type EstadoCaso = "borrador" | "validado" | "privado" | "publicado";
export type Revision = "pedida" | "rechazada" | null;

export interface ArchivoCaso {
  ruta: string;
  peso: number;
}

export interface FilaCaso {
  id: string;
  autor: string;
  titulo: string;
  estado: EstadoCaso;
  revision: Revision;
  nota_revision: string | null;
  datos: unknown;
  informe: Hallazgo[];
  archivos: ArchivoCaso[];
  revision_md: string | null;
  creado: string;
  actualizado: string;
}

/** Lo que ve el autor de su caso en la lista (sin el JSON). */
export type ResumenCaso = Omit<FilaCaso, "datos" | "revision_md"> & { autorEmail?: string; autorNombre?: string | null };

const BUCKET = "casos-autores";

/** Una fila sin el JSON del caso (trae la solución) ni el REVISION.md. */
function sinJson(fila: FilaCaso): ResumenCaso {
  const copia: Partial<FilaCaso> = { ...fila };
  delete copia.datos;
  delete copia.revision_md;
  return copia as ResumenCaso;
}
export const PREFIJO_AUTOR = "autor-";
export const casoIdDe = (id: string) => `${PREFIJO_AUTOR}${id}`;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

interface Datos {
  obtener(id: string): Promise<FilaCaso | null>;
  insertar(fila: Omit<FilaCaso, "id" | "creado" | "actualizado">): Promise<FilaCaso>;
  actualizar(id: string, cambios: Partial<FilaCaso>): Promise<FilaCaso>;
  borrar(id: string): Promise<void>;
  listar(filtro: { autor?: string; revision?: Revision; estado?: EstadoCaso }): Promise<ResumenCaso[]>;
  /** URL para subir un archivo: con `token` es de Supabase; sin token, un PUT a nuestra API (login falso) */
  urlSubida(id: string, ruta: string): Promise<{ url: string; token?: string; ruta: string }>;
  /** Peso real y primeros bytes de un archivo ya subido */
  leerArchivo(id: string, ruta: string): Promise<ArchivoPaquete | null>;
  borrarArchivos(id: string, mantener: string[]): Promise<void>;
  urlPublica(id: string): string;
}

const SIN_JSON = "id, autor, titulo, estado, revision, nota_revision, informe, archivos, creado, actualizado, perfiles(email, nombre)";

class DatosSupabase implements Datos {
  constructor(
    private db: SupabaseClient,
    private url: string,
  ) {}

  async obtener(id: string) {
    const { data, error } = await this.db.from("casos_autor").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return data as FilaCaso | null;
  }

  async insertar(fila: Omit<FilaCaso, "id" | "creado" | "actualizado">) {
    const { data, error } = await this.db.from("casos_autor").insert(fila).select("*").single();
    if (error) throw error;
    return data as FilaCaso;
  }

  async actualizar(id: string, cambios: Partial<FilaCaso>) {
    const { data, error } = await this.db
      .from("casos_autor")
      .update({ ...cambios, actualizado: new Date().toISOString() })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return data as FilaCaso;
  }

  async borrar(id: string) {
    await this.borrarArchivos(id, []);
    const { error } = await this.db.from("casos_autor").delete().eq("id", id);
    if (error) throw error;
  }

  async listar(filtro: { autor?: string; revision?: Revision; estado?: EstadoCaso }) {
    let q = this.db.from("casos_autor").select(SIN_JSON).order("actualizado", { ascending: false });
    if (filtro.autor) q = q.eq("autor", filtro.autor);
    if (filtro.revision) q = q.eq("revision", filtro.revision);
    if (filtro.estado) q = q.eq("estado", filtro.estado);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []).map(({ perfiles, ...fila }) => {
      const p = (Array.isArray(perfiles) ? perfiles[0] : perfiles) as { email?: string; nombre?: string | null } | null;
      return { ...(fila as unknown as ResumenCaso), autorEmail: p?.email, autorNombre: p?.nombre ?? null };
    });
  }

  async urlSubida(id: string, ruta: string) {
    const camino = `${id}/${ruta}`;
    const { data, error } = await this.db.storage.from(BUCKET).createSignedUploadUrl(camino, { upsert: true });
    if (error) throw error;
    return { url: data.signedUrl, token: data.token, ruta: camino };
  }

  async leerArchivo(id: string, ruta: string) {
    // solo la cabecera: con Range no se baja la imagen entera, y Content-Range trae el peso real
    const r = await fetch(`${this.urlPublica(id)}${encodeURI(ruta)}`, { headers: { Range: `bytes=0-${BYTES_CABECERA - 1}` }, cache: "no-store" });
    if (!r.ok) return null;
    const bytes = new Uint8Array(await r.arrayBuffer()).slice(0, BYTES_CABECERA);
    const total = Number(r.headers.get("content-range")?.split("/")[1] ?? r.headers.get("content-length") ?? bytes.length);
    return { peso: total, cabecera: bytes };
  }

  async borrarArchivos(id: string, mantener: string[]) {
    const todos: string[] = [];
    const recorrer = async (carpeta: string) => {
      const { data } = await this.db.storage.from(BUCKET).list(carpeta, { limit: 1000 });
      for (const o of data ?? []) {
        const camino = `${carpeta}/${o.name}`;
        if (o.id === null) await recorrer(camino);
        else todos.push(camino);
      }
    };
    await recorrer(id);
    const sobran = todos.filter((c) => !mantener.includes(c.slice(id.length + 1)));
    if (sobran.length) await this.db.storage.from(BUCKET).remove(sobran);
  }

  urlPublica(id: string) {
    return `${this.url}/storage/v1/object/public/${BUCKET}/${id}/`;
  }
}

/** Para tests y desarrollo con AUTH_FALSO=1: todo en memoria, y las imágenes se suben y se sirven por nuestra API. */
class DatosFalsos implements Datos {
  private filas = new Map<string, FilaCaso>();
  readonly archivos = new Map<string, { tipo: string; bytes: Uint8Array }>();
  readonly firmas = new Map<string, string>();

  async obtener(id: string) {
    return structuredClone(this.filas.get(id) ?? null);
  }
  async insertar(fila: Omit<FilaCaso, "id" | "creado" | "actualizado">) {
    const ahora = new Date().toISOString();
    const nueva = { ...fila, id: crypto.randomUUID(), creado: ahora, actualizado: ahora };
    this.filas.set(nueva.id, structuredClone(nueva));
    return nueva;
  }
  async actualizar(id: string, cambios: Partial<FilaCaso>) {
    const fila = { ...this.filas.get(id)!, ...cambios, actualizado: new Date().toISOString() };
    this.filas.set(id, structuredClone(fila));
    return fila;
  }
  async borrar(id: string) {
    this.filas.delete(id);
    await this.borrarArchivos(id, []);
  }
  async listar(filtro: { autor?: string; revision?: Revision; estado?: EstadoCaso }) {
    return [...this.filas.values()]
      .filter((f) => (!filtro.autor || f.autor === filtro.autor) && (!filtro.revision || f.revision === filtro.revision) && (!filtro.estado || f.estado === filtro.estado))
      .sort((a, b) => b.actualizado.localeCompare(a.actualizado))
      .map((f) => ({ ...sinJson(f), autorEmail: f.autor.replace(/^falso-/, "") }));
  }
  async urlSubida(id: string, ruta: string) {
    const firma = randomBytes(12).toString("base64url");
    this.firmas.set(firma, `${id}/${ruta}`);
    return { url: `/api/autores/archivos/${id}/${encodeURI(ruta)}?firma=${firma}`, ruta: `${id}/${ruta}` };
  }
  async leerArchivo(id: string, ruta: string) {
    const a = this.archivos.get(`${id}/${ruta}`);
    return a ? { peso: a.bytes.length, cabecera: a.bytes.slice(0, BYTES_CABECERA) } : null;
  }
  async borrarArchivos(id: string, mantener: string[]) {
    for (const k of [...this.archivos.keys()]) if (k.startsWith(`${id}/`) && !mantener.includes(k.slice(id.length + 1))) this.archivos.delete(k);
  }
  urlPublica(id: string) {
    return `/api/autores/archivos/${id}/`;
  }
}

function crearDatos(): Datos | null {
  const falsos = datosFalsos();
  if (falsos) return falsos;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secreta = process.env.SUPABASE_SECRET_KEY;
  if (url && secreta) return new DatosSupabase(createClient(url, secreta, { auth: { persistSession: false, autoRefreshToken: false } }), url);
  return null;
}

const g = globalThis as unknown as {
  __datosCasos?: Datos | null;
  __datosCasosFalsos?: DatosFalsos;
  __cacheCasos?: Map<string, { hasta: number; caso: Caso; estado: EstadoCaso }>;
};
function datos(): Datos {
  const d = (g.__datosCasos ??= crearDatos());
  if (!d) throw new ErrorSala("Los casos de autores no están configurados", 503);
  return d;
}
/** Solo para la ruta que sirve archivos con el login falso. */
export const datosFalsos = () => {
  if (process.env.AUTH_FALSO !== "1" || process.env.VERCEL) return null;
  return (g.__datosCasosFalsos ??= new DatosFalsos());
};

const IMAGEN = /\.(jpe?g|png|webp)$/i;
const MAX_ARCHIVOS = 100;

/** Sube (o reemplaza) un caso. Devuelve las URLs para subir sus imágenes; el caso queda en borrador hasta confirmarlas. */
export async function guardarCaso(autor: Autor, entrada: { id?: string; texto: string; revisionMd?: string | null; archivos: ArchivoCaso[] }) {
  if (entrada.texto.length > 1024 * 1024) throw new ErrorSala("El caso.json es demasiado grande");
  let crudo: unknown;
  try {
    crudo = JSON.parse(entrada.texto);
  } catch (e) {
    throw new ErrorSala(`El caso.json no es un JSON válido (${(e as Error).message})`);
  }
  const archivos = entrada.archivos.filter((a) => IMAGEN.test(a.ruta) && /^[\w\-./]+$/.test(a.ruta) && !a.ruta.includes(".."));
  if (archivos.length > MAX_ARCHIVOS) throw new ErrorSala(`Son demasiados archivos: el máximo es ${MAX_ARCHIVOS}`);
  const titulo = String((crudo as { meta?: { titulo?: unknown } })?.meta?.titulo ?? "Caso sin título").slice(0, 120);
  const revisionMd = entrada.revisionMd ? entrada.revisionMd.slice(0, 200_000) : null;
  const d = datos();

  const cambios = { titulo, datos: crudo, archivos, revision_md: revisionMd, estado: "borrador" as const, revision: null, nota_revision: null, informe: [] };
  let fila: FilaCaso;
  if (entrada.id) {
    const actual = await propio(autor, entrada.id);
    fila = await d.actualizar(actual.id, cambios);
  } else {
    fila = await d.insertar({ autor: autor.id, ...cambios });
  }
  olvidar(fila.id);
  const subidas = await Promise.all(archivos.map((a) => d.urlSubida(fila.id, a.ruta).then((u) => ({ ...u, archivo: a.ruta }))));
  return { id: fila.id, subidas };
}

/** Con las imágenes ya en Storage: las relee, valida todo de nuevo y fija el estado. */
export async function confirmarCaso(autor: Autor, id: string) {
  const fila = await propio(autor, id);
  const d = datos();
  const leidos: Record<string, ArchivoPaquete> = {};
  await Promise.all(
    fila.archivos.map(async (a) => {
      const archivo = await d.leerArchivo(id, a.ruta);
      if (archivo) leidos[a.ruta] = archivo;
    }),
  );
  await d.borrarArchivos(id, Object.keys(leidos));
  const r = revisarCaso(fila.datos, { origen: "autor", archivos: leidos });
  const archivos = Object.entries(leidos).map(([ruta, a]) => ({ ruta, peso: a.peso }));
  const actualizada = await d.actualizar(id, { estado: r.ok ? "validado" : "borrador", informe: r.hallazgos, archivos });
  olvidar(id);
  return actualizada;
}

async function propio(autor: Autor, id: string) {
  if (!UUID.test(id)) throw new ErrorSala("Caso inexistente", 404);
  const fila = await datos().obtener(id);
  if (!fila || fila.autor !== autor.id) throw new ErrorSala("Caso inexistente", 404);
  return fila;
}

export const misCasos = (autor: Autor) => datos().listar({ autor: autor.id });

/** El detalle de un caso para su autor o para quien modera: nunca el JSON entero (trae la solución). */
export async function detalleCaso(autor: Autor, id: string) {
  const fila = esModerador(autor) ? await obtenerFila(id) : await propio(autor, id);
  return { ...sinJson(fila), casoId: casoIdDe(fila.id) };
}

async function obtenerFila(id: string) {
  if (!UUID.test(id)) throw new ErrorSala("Caso inexistente", 404);
  const fila = await datos().obtener(id);
  if (!fila) throw new ErrorSala("Caso inexistente", 404);
  return fila;
}

const esModerador = (a: Autor) => a.rol === "admin" || a.rol === "moderador";

/** Lo que puede hacer el autor con su caso. */
export async function accionAutor(autor: Autor, id: string, accion: "probar" | "pedir_publicacion" | "retirar") {
  const fila = await propio(autor, id);
  const d = datos();
  let cambios: Partial<FilaCaso>;
  if (accion === "probar") {
    if (fila.estado === "borrador") throw new ErrorSala("Primero corregí los errores del validador");
    cambios = { estado: fila.estado === "publicado" ? "publicado" : "privado" };
  } else if (accion === "pedir_publicacion") {
    if (fila.estado === "borrador") throw new ErrorSala("Primero corregí los errores del validador");
    if (fila.estado === "publicado") throw new ErrorSala("El caso ya está publicado");
    cambios = { estado: "privado", revision: "pedida", nota_revision: null };
  } else {
    // retirar: sale del catálogo y vuelve a privado
    cambios = { estado: fila.estado === "borrador" ? "borrador" : "privado", revision: null };
  }
  olvidar(id);
  return d.actualizar(id, cambios);
}

export async function borrarCaso(autor: Autor, id: string) {
  const fila = await propio(autor, id);
  olvidar(id);
  await datos().borrar(fila.id);
}

/** Casos que esperan revisión, y publicados, para quien modera. */
export async function casosParaModerar(autor: Autor) {
  if (!esModerador(autor)) throw new ErrorSala("Solo quien modera puede ver esto", 403);
  const d = datos();
  const [pedidos, publicados] = await Promise.all([d.listar({ revision: "pedida" }), d.listar({ estado: "publicado" })]);
  return { pedidos, publicados };
}

/** REVISION.md del caso: la solución explicada, solo para quien modera. */
export async function revisionDelCaso(autor: Autor, id: string) {
  if (!esModerador(autor)) throw new ErrorSala("Solo quien modera puede ver esto", 403);
  return (await obtenerFila(id)).revision_md;
}

export async function moderar(autor: Autor, id: string, decision: "publicar" | "rechazar" | "despublicar", nota?: string) {
  if (!esModerador(autor)) throw new ErrorSala("Solo quien modera puede hacer esto", 403);
  const fila = await obtenerFila(id);
  if (decision === "publicar" && (fila.estado === "borrador" || fila.informe.some((h) => h.nivel === "error"))) throw new ErrorSala("El caso tiene errores del validador");
  const cambios: Partial<FilaCaso> =
    decision === "publicar"
      ? { estado: "publicado", revision: null, nota_revision: nota?.slice(0, 2000) || null }
      : decision === "rechazar"
        ? { revision: "rechazada", nota_revision: nota?.slice(0, 2000) || null }
        : { estado: "privado", revision: null, nota_revision: nota?.slice(0, 2000) || null };
  olvidar(id);
  return datos().actualizar(id, cambios);
}

// ---- jugar ----

const VIDA_CACHE_MS = 30_000;
const cache = () => (g.__cacheCasos ??= new Map());
const olvidar = (id: string) => cache().delete(id);

/** Las rutas del caso (/casos/<id>/...) pasan a apuntar a su carpeta en Storage. */
function conRutasDeStorage(datosCaso: unknown, metaId: string, base: string) {
  return JSON.parse(JSON.stringify(datosCaso).split(`/casos/${metaId}/`).join(base));
}

/**
 * Un caso de autor listo para jugar, si se puede jugar: privado (por link) o publicado.
 * Devuelve si es de prueba, para usar el modelo falso en lugar de la cuota de Gemini.
 */
export async function casoDeAutor(casoId: string): Promise<{ caso: Caso; dePrueba: boolean } | null> {
  if (!casoId.startsWith(PREFIJO_AUTOR)) return null;
  const id = casoId.slice(PREFIJO_AUTOR.length);
  if (!UUID.test(id)) return null;
  const guardado = cache().get(id);
  if (guardado && guardado.hasta > Date.now()) return { caso: guardado.caso, dePrueba: guardado.estado !== "publicado" };
  const d = datos();
  const fila = await d.obtener(id);
  if (!fila || (fila.estado !== "privado" && fila.estado !== "publicado")) return null;
  const parsed = CasoSchema.safeParse(fila.datos);
  if (!parsed.success) return null;
  const caso = CasoSchema.parse(conRutasDeStorage(fila.datos, parsed.data.meta.id, d.urlPublica(id)));
  caso.meta.id = casoId;
  cache().set(id, { hasta: Date.now() + VIDA_CACHE_MS, caso, estado: fila.estado });
  return { caso, dePrueba: fila.estado !== "publicado" };
}

/**
 * Si quien pide puede usar el modo autor en una sala de este caso: tiene que ser su autor (o moderar),
 * y el caso tiene que estar sin publicar (en un caso publicado los atajos serían trampa).
 */
export async function puedeUsarModoAutor(autor: Autor, casoId: string) {
  if (!casoId.startsWith(PREFIJO_AUTOR)) return false;
  const id = casoId.slice(PREFIJO_AUTOR.length);
  if (!UUID.test(id)) return false;
  const fila = await datos().obtener(id);
  return !!fila && fila.estado !== "publicado" && (fila.autor === autor.id || esModerador(autor));
}

export async function casosPublicados(): Promise<Caso[]> {
  const d = g.__datosCasos ?? (g.__datosCasos = crearDatos());
  if (!d) return [];
  try {
    const filas = await d.listar({ estado: "publicado" });
    const casos = await Promise.all(filas.map((f) => casoDeAutor(casoIdDe(f.id))));
    return casos.flatMap((c) => (c ? [c.caso] : []));
  } catch (e) {
    // si Supabase falla, el catálogo sigue con los casos del repo
    console.error(e);
    return [];
  }
}
