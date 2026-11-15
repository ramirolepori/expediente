import { BYTES_CABECERA } from "@/motor/validador-archivos";

/** Lo que el autor eligió con el selector de carpeta, ordenado como lo espera el servidor. */
export interface Paquete {
  caso: File;
  revision: File | null;
  /** archivos que no son texto, con su ruta relativa a la carpeta del caso.json */
  archivos: { ruta: string; archivo: File }[];
}

// lo que no es parte del paquete jugable no se manda (REVISION.md va aparte)
const IGNORAR = /(^|\/)\.|\.(md|txt|json)$/i;
const rutaDe = (f: File) => f.webkitRelativePath || f.name;

export function leerPaquete(elegidos: File[]): Paquete | string {
  const caso = elegidos.filter((f) => rutaDe(f).split("/").pop() === "caso.json").sort((a, b) => rutaDe(a).length - rutaDe(b).length)[0];
  if (!caso) return "No encontré un caso.json en lo que elegiste";
  const base = rutaDe(caso).slice(0, -"caso.json".length);
  const dentro = elegidos.filter((f) => f !== caso && rutaDe(f).startsWith(base));
  return {
    caso,
    revision: dentro.find((f) => rutaDe(f).slice(base.length).toUpperCase() === "REVISION.MD") ?? null,
    archivos: dentro.filter((f) => !IGNORAR.test(rutaDe(f).slice(base.length))).map((f) => ({ ruta: rutaDe(f).slice(base.length), archivo: f })),
  };
}

/** Pedido para validar sin guardar: el caso.json y, de cada imagen, su ruta, su peso y su cabecera. */
export async function pedidoDeValidacion(p: Paquete) {
  const form = new FormData();
  form.append("caso", await p.caso.text());
  form.append("rutas", JSON.stringify(p.archivos.map((a) => a.ruta)));
  form.append("pesos", JSON.stringify(p.archivos.map((a) => a.archivo.size)));
  p.archivos.forEach((a) => form.append("archivo", a.archivo.slice(0, BYTES_CABECERA)));
  return form;
}

export const nombreDe = (elegidos: File[]) => elegidos[0]?.webkitRelativePath.split("/")[0] || elegidos[0]?.name;
