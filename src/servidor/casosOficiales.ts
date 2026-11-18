import { createClient } from "@supabase/supabase-js";
import { leerCasoArchivado } from "@/casos/archivados";
import { BUCKET_CASOS, CASOS_OFICIALES, prefijoOficial } from "@/casos/oficiales";
import { CasoSchema, type Caso } from "@/casos/schema";

const VIDA_CACHE_MS = 30_000;
let cache: { hasta: number; casos: Promise<Caso[]> } | undefined;

export const usaCasosLocales = () => !process.env.VERCEL && !process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.SUPABASE_SECRET_KEY;

export function cargarCasoOficial(datos: unknown, id: string, imagenes: string): Caso | null {
  const oficial = CASOS_OFICIALES.find((c) => c.id === id);
  const parsed = CasoSchema.safeParse(datos);
  if (!oficial || !parsed.success || parsed.data.meta.id !== id) return null;
  const caso = parsed.data;
  const prefijo = `/casos/${oficial.carpeta}/`;
  const imagen = (ruta: string) => (ruta.startsWith(prefijo) ? imagenes + ruta.slice(prefijo.length) : ruta);
  const markdown = (texto: string) => texto.replace(/(!\[[^\]]*\]\(\s*<?)([^)\s>]+)/g, (_m, inicio: string, ruta: string) => inicio + imagen(ruta));

  caso.introduccion = markdown(caso.introduccion);
  for (const sobre of caso.sobres) if (sobre.escena) sobre.escena.imagen = imagen(sobre.escena.imagen);
  for (const prueba of caso.pruebas) {
    if (prueba.imagen) prueba.imagen = imagen(prueba.imagen);
    prueba.contenido = markdown(prueba.contenido);
  }
  for (const personaje of caso.personajes) {
    const retratos = personaje.apariencia?.retratos;
    if (retratos) personaje.apariencia!.retratos = Object.fromEntries(Object.entries(retratos).map(([emocion, ruta]) => [emocion, imagen(ruta)]));
  }
  // La única página ejecutable es la caja fuerte que ya sirve la aplicación, no Storage.
  if (caso.minijuegos.some((m) => m.tipo === "personalizado" &&
    (id !== "hotel_aurora" || m.config.pagina !== "/casos/hotel-aurora/minijuegos/caja-fuerte.html"))) return null;
  return caso;
}

async function consultarOficiales(): Promise<Caso[]> {
  if (usaCasosLocales()) {
    return CASOS_OFICIALES.flatMap(({ id, carpeta }) => {
      const caso = cargarCasoOficial(leerCasoArchivado(carpeta), id, `/api/casos-locales/${id}/`);
      return caso ? [caso] : [];
    });
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const clave = process.env.SUPABASE_SECRET_KEY;
  if (!url || !clave) return [];
  const db = createClient(url, clave, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await db.from("casos_oficiales").select("id,datos").in("id", CASOS_OFICIALES.map(({ id }) => id));
  if (error) throw error;
  const bucket = db.storage.from(BUCKET_CASOS);
  return CASOS_OFICIALES.flatMap(({ id }) => {
    const fila = data.find((f) => f.id === id);
    const caso = fila && cargarCasoOficial(fila.datos, id, bucket.getPublicUrl(prefijoOficial(id)).data.publicUrl);
    return caso ? [caso] : [];
  });
}

export async function listarOficiales(): Promise<Caso[]> {
  if (!cache || cache.hasta <= Date.now()) {
    const casos = consultarOficiales().catch((e) => {
      cache = undefined;
      throw e;
    });
    cache = { hasta: Date.now() + VIDA_CACHE_MS, casos };
  }
  return cache.casos;
}

export async function obtenerOficial(id: string) {
  if (!CASOS_OFICIALES.some((c) => c.id === id)) return undefined;
  return (await listarOficiales()).find((c) => c.meta.id === id);
}

export const oficialesParaCatalogo = () => listarOficiales().catch((e) => {
  console.error("No se pudieron cargar los casos oficiales", e);
  return [];
});
