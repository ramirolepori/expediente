import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { NOMBRE_CAPA, revisarCaso, type ArchivoPaquete } from "../src/motor/validador";

/** Valida los casos del repo con las mismas capas que usan los autores. Los archivos salen de public/casos/<id>/. */
const dir = join(process.cwd(), "casos");
const ICONO = { error: "error", aviso: "aviso", sugerencia: "sugerencia" } as const;

function archivosDe(carpeta: string): Record<string, ArchivoPaquete> {
  const out: Record<string, ArchivoPaquete> = {};
  if (!existsSync(carpeta)) return out;
  const recorrer = (d: string) => {
    for (const f of readdirSync(d)) {
      const ruta = join(d, f);
      if (statSync(ruta).isDirectory()) recorrer(ruta);
      else out[relative(carpeta, ruta).split("\\").join("/")] = { peso: statSync(ruta).size, cabecera: new Uint8Array(readFileSync(ruta)) };
    }
  };
  recorrer(carpeta);
  return out;
}

let falla = false;
for (const carpeta of readdirSync(dir)) {
  const archivo = join(dir, carpeta, "caso.json");
  if (!existsSync(archivo)) continue;
  const datos = JSON.parse(readFileSync(archivo, "utf8"));
  const r = revisarCaso(datos, { origen: "repo", archivos: archivosDe(join(process.cwd(), "public", "casos", carpeta)) });
  console.log(`\n${r.ok ? "✅" : "❌"} ${carpeta}`);
  r.hallazgos.forEach((h) => console.log(`   ${ICONO[h.nivel]} [${NOMBRE_CAPA[h.capa]}] ${h.donde}: ${h.mensaje}`));
  if (!r.ok) falla = true;
}
process.exit(falla ? 1 : 0);
