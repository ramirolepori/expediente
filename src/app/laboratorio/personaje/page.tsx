import { readdirSync } from "node:fs";
import { join } from "node:path";
import { Comparacion } from "./Comparacion";

/** Página de prueba para comparar las dos formas de mostrar al personaje interrogado. */
export default function Pagina() {
  let archivos: string[] = [];
  try {
    archivos = readdirSync(join(process.cwd(), "public/retratos/alberto"));
  } catch {}
  const imagenes = Object.fromEntries(
    archivos.filter((a) => /\.(png|jpe?g|webp)$/i.test(a)).map((a) => [a.replace(/\.[^.]+$/, ""), `/retratos/alberto/${a}`]),
  );
  return <Comparacion imagenes={imagenes} />;
}
