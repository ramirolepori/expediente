import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { isDeepStrictEqual } from "node:util";
import { createClient } from "@supabase/supabase-js";
import { leerCasoArchivado, raizArchivados } from "../src/casos/archivados";
import { BUCKET_CASOS, CASOS_OFICIALES, prefijoOficial } from "../src/casos/oficiales";
import { CasoSchema } from "../src/casos/schema";
import { NOMBRE_CAPA, revisarCaso, type ArchivoPaquete } from "../src/motor/validador";

const ICONO = { error: "error", aviso: "aviso", sugerencia: "sugerencia" } as const;
const TIPOS = { ".jpg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" } as const;

function archivosDe(carpeta: string) {
  const out: Record<string, Buffer> = {};
  const recorrer = (d: string) => {
    for (const f of readdirSync(d, { withFileTypes: true })) {
      const ruta = join(d, f.name);
      if (f.isDirectory()) recorrer(ruta);
      else if (f.isFile()) out[relative(carpeta, ruta).split("\\").join("/")] = readFileSync(ruta);
    }
  };
  if (existsSync(carpeta)) recorrer(carpeta);
  return out;
}

function leerOpcional(carpeta: string, archivo: string) {
  const ruta = join(raizArchivados(), "casos", carpeta, archivo);
  return existsSync(ruta) ? readFileSync(ruta, "utf8") : null;
}

function validarPaquetes() {
  return CASOS_OFICIALES.map(({ id, carpeta }) => {
    const datos: unknown = leerCasoArchivado(carpeta);
    const imagenes = archivosDe(join(raizArchivados(), "public", "casos", carpeta));
    const archivos: Record<string, ArchivoPaquete> = Object.fromEntries(
      Object.entries(imagenes).map(([ruta, bytes]) => [ruta, { peso: bytes.length, cabecera: bytes }]),
    );
    const rutaCaja = "minijuegos/caja-fuerte.html";
    if (id === "hotel_aurora" && existsSync(join("public", "casos", carpeta, rutaCaja))) {
      const html = readFileSync(join("public", "casos", carpeta, rutaCaja));
      archivos[rutaCaja] = { peso: html.length, cabecera: html };
    }

    const r = revisarCaso(datos, { origen: id === "vendimia" ? "autor" : "repo", archivos });
    console.log(`\n${r.ok ? "✅" : "❌"} ${carpeta}`);
    r.hallazgos.forEach((h) => console.log(`   ${ICONO[h.nivel]} [${NOMBRE_CAPA[h.capa]}] ${h.donde}: ${h.mensaje}`));
    if (!r.ok || r.caso?.meta.id !== id) throw new Error(`El paquete de ${id} no es válido`);
    if (r.caso.minijuegos.some((m) => m.tipo === "personalizado" && m.config.pagina !== `/casos/hotel-aurora/${rutaCaja}`)) {
      throw new Error(`El paquete de ${id} no puede cargar páginas HTML nuevas`);
    }
    return {
      fila: { id, datos, revision_md: leerOpcional(carpeta, "REVISION.md"), prompts_imagenes_md: leerOpcional(carpeta, "PROMPTS-IMAGENES.md") },
      imagenes,
    };
  });
}

type Modo = "--aplicar" | "--actualizar" | "--verificar-destino";

async function migrar(paquetes: ReturnType<typeof validarPaquetes>, modo: Modo) {
  const soloVerificar = modo === "--verificar-destino";
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const clave = process.env.SUPABASE_SECRET_KEY;
  if (!url || !clave) throw new Error("Configurá NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SECRET_KEY para el entorno de destino");
  const db = createClient(url, clave, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await db.from("casos_oficiales").select("id,datos,revision_md,prompts_imagenes_md").in("id", paquetes.map(({ fila }) => fila.id));
  if (error) throw new Error(`No pude leer casos_oficiales: ${error.message}`);
  const actuales = new Map(data.map((fila) => [fila.id, fila]));
  for (const { fila } of paquetes) {
    const actual = actuales.get(fila.id);
    if (soloVerificar) {
      const caso = CasoSchema.safeParse(actual?.datos);
      if (!caso.success || caso.data.meta.id !== fila.id) throw new Error(`Falta importar un expediente válido para ${fila.id} antes del despliegue`);
    } else if (actual && !isDeepStrictEqual(actual, fila) && modo !== "--actualizar") {
      throw new Error(`${fila.id} ya existe con otros datos; no se sobrescribió nada. Para reemplazarlo con los cambios de casos-oficiales/, usá --actualizar`);
    }
  }

  const bucket = db.storage.from(BUCKET_CASOS);
  for (const { fila, imagenes } of paquetes) {
    for (const [ruta, bytes] of Object.entries(imagenes)) {
      const extension = ruta.slice(ruta.lastIndexOf(".")).toLowerCase() as keyof typeof TIPOS;
      const contentType = TIPOS[extension];
      if (!contentType) throw new Error(`Formato no permitido: ${ruta}`);
      const objeto = prefijoOficial(fila.id) + ruta;
      if (!soloVerificar) await bucket.upload(objeto, bytes, { contentType, upsert: false });
      const respuesta = await fetch(bucket.getPublicUrl(objeto).data.publicUrl, { method: soloVerificar ? "HEAD" : "GET", signal: AbortSignal.timeout(15_000) });
      if (!respuesta.ok || (!soloVerificar && !bytes.equals(Buffer.from(await respuesta.arrayBuffer())))) {
        throw new Error(`No pude verificar ${objeto} sin sobrescribirlo`);
      }
    }
  }

  const faltantes = paquetes.filter(({ fila }) => !actuales.has(fila.id)).map(({ fila }) => fila);
  if (!soloVerificar && faltantes.length) {
    const { error } = await db.from("casos_oficiales").insert(faltantes);
    if (error) throw new Error(`No pude registrar los casos: ${error.message}`);
  }
  if (modo === "--actualizar") {
    for (const { fila } of paquetes) {
      const actual = actuales.get(fila.id);
      if (!actual || isDeepStrictEqual(actual, fila)) continue;
      const { id, ...campos } = fila;
      const { error } = await db.from("casos_oficiales").update(campos).eq("id", id);
      if (error) throw new Error(`No pude actualizar ${id}: ${error.message}`);
      console.log(`Actualizado ${id}`);
    }
  }
  console.log(`\nCasos verificados en ${new URL(url).origin}: ${paquetes.map(({ fila }) => fila.id).join(", ")}`);
}

async function main() {
  const args = process.argv.slice(2);
  const [modo] = args;
  if (args.length > 1 || (modo && modo !== "--aplicar" && modo !== "--actualizar" && modo !== "--verificar-destino")) {
    throw new Error("Usá --aplicar, --actualizar o --verificar-destino");
  }
  const paquetes = validarPaquetes();
  if (modo) await migrar(paquetes, modo);
  else console.log("\nValidación local; no se escribió en Supabase.");
}

main().catch((e: Error) => {
  console.error(e.message);
  process.exitCode = 1;
});
