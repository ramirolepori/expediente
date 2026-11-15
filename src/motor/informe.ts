import { NOMBRE_CAPA, type Hallazgo, type Nivel } from "./validador";

const TITULO: Record<Nivel, string> = {
  error: "Errores (obligatorios: sin esto el caso no se puede probar ni publicar)",
  aviso: "Avisos (conviene resolverlos; si alguno es a propósito, explicalo en REVISION.md)",
  sugerencia: "Sugerencias (opcionales)",
};

/** El informe redactado como instrucciones, para pegárselo a la IA con la que el autor arma el caso. */
export function informeParaIA(hallazgos: Hallazgo[], titulo?: string) {
  const cuenta = (n: Nivel) => hallazgos.filter((h) => h.nivel === n).length;
  const nombre = titulo ? `"${titulo}"` : "el caso";
  if (hallazgos.length === 0) return `El validador de Expediente revisó ${nombre} y no encontró nada para corregir.`;

  const partes = [
    `El validador de Expediente revisó ${nombre} y encontró ${cuenta("error")} errores, ${cuenta("aviso")} avisos y ${cuenta("sugerencia")} sugerencias.`,
    "Corregí caso.json siguiendo esta lista, en orden. Cada punto dice dónde está el problema usando los ids del caso. No cambies ids ni partes que no aparezcan en la lista, y respetá el contrato del kit de autor. Cuando termines, devolveme el caso.json completo y contame en una línea qué cambiaste en cada punto.",
  ];
  for (const nivel of ["error", "aviso", "sugerencia"] as const) {
    const lista = hallazgos.filter((h) => h.nivel === nivel);
    if (!lista.length) continue;
    partes.push(`## ${TITULO[nivel]}\n\n${lista.map((h, i) => `${i + 1}. [${NOMBRE_CAPA[h.capa]}] En \`${h.donde}\`: ${h.mensaje}.`).join("\n")}`);
  }
  return partes.join("\n\n");
}
