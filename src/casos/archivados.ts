import { readFileSync } from "node:fs";
import { join } from "node:path";

// La arma `scripts/preparar-casos.mjs`: la copia congelada del historial más los cambios de `casos-oficiales/`.
export const raizArchivados = () => join(process.cwd(), ".casos-local", "actual");

export function leerCasoArchivado(carpeta: string): unknown {
  return JSON.parse(readFileSync(join(raizArchivados(), "casos", carpeta, "caso.json"), "utf8"));
}
