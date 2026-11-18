import { readFileSync } from "node:fs";
import { join } from "node:path";

const REVISION = "3b36866e1ab7ad292541253e84076d83322c4faf";
export const raizArchivados = () => join(process.cwd(), ".casos-local", REVISION);

export function leerCasoArchivado(carpeta: string): unknown {
  return JSON.parse(readFileSync(join(raizArchivados(), "casos", carpeta, "caso.json"), "utf8"));
}
