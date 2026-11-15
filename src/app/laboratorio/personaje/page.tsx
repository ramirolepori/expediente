import { readdirSync } from "node:fs";
import { join } from "node:path";
import { obtenerCaso } from "@/casos/registro";
import { rasgosPara } from "@/motor/apariencia";
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
  const aurora = (obtenerCaso("hotel_aurora")?.personajes ?? []).map((p) => ({ titulo: p.nombre, rasgos: rasgosPara(p) }));
  return <Comparacion imagenes={imagenes} aurora={aurora} />;
}
