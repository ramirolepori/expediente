import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { validarCaso } from "../src/motor/validador";

const dir = join(process.cwd(), "casos");
let falla = false;
for (const carpeta of readdirSync(dir)) {
  const archivo = join(dir, carpeta, "caso.json");
  if (!existsSync(archivo)) continue;
  const r = validarCaso(JSON.parse(readFileSync(archivo, "utf8")));
  console.log(`\n${r.ok ? "✅" : "❌"} ${carpeta}`);
  r.errores.forEach((e) => console.log(`   error: ${e}`));
  r.avisos.forEach((a) => console.log(`   aviso: ${a}`));
  if (!r.ok) falla = true;
}
process.exit(falla ? 1 : 0);
