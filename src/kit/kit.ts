import { readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { CasoSchema } from "@/casos/schema";
import ejemplo from "./ejemplo/caso.json";
import { guia, leeme, piezas, promptInicial, reglas, skill } from "./textos";

/** Versión del kit: el commit del deploy (en Vercel) o "local". */
export const versionKit = () => (process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local");

// rutas fijas: así el build solo rastrea estos dos archivos y no todo el proyecto
const leerContrato = () => readFileSync(join(process.cwd(), "docs", "contrato-de-caso.md"), "utf8");
const leerRevisionEjemplo = () => readFileSync(join(process.cwd(), "src", "kit", "ejemplo", "REVISION.md"), "utf8");

/**
 * Los archivos del kit de autor (ADR 0012). Se arma en el build desde el código: el JSON Schema sale
 * del schema real y el contrato de docs/, así lo que baja un autor coincide con lo que la plataforma acepta.
 */
export function archivosDelKit(): Record<string, string> {
  const version = versionKit();
  const contrato = leerContrato();
  return {
    "kit-autor-expediente/LEEME.md": leeme(version),
    "kit-autor-expediente/PROMPT-INICIAL.md": promptInicial(),
    "kit-autor-expediente/GUIA.md": guia(),
    "kit-autor-expediente/PIEZAS.md": piezas(),
    "kit-autor-expediente/REGLAS.md": reglas(),
    "kit-autor-expediente/contrato-de-caso.md": `> En el kit: donde este documento habla del repositorio (\`npm run validar\`, \`src/…\`, \`public/casos/…\`), vos validás y subís en /autores, y las imágenes van en la carpeta de tu caso.\n\n${contrato}`,
    "kit-autor-expediente/caso.schema.json": JSON.stringify(z.toJSONSchema(CasoSchema, { io: "input", unrepresentable: "any" }), null, 2),
    "kit-autor-expediente/ejemplo/caso.json": JSON.stringify(ejemplo, null, 2),
    "kit-autor-expediente/ejemplo/REVISION.md": leerRevisionEjemplo(),
    "kit-autor-expediente/SKILL.md": skill(version),
  };
}
