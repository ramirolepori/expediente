import type { Personaje, RasgosCaso } from "@/casos/schema";

/** Rasgos completos con los que se dibuja un personaje vectorial. */
export type Rasgos = Required<RasgosCaso>;

export const RASGOS_POR_DEFECTO: Rasgos = {
  especie: "humano",
  cuerpo: "masculino",
  edad: "adulto",
  piel: "#d9a77f",
  pelo: "#3b2f2a",
  ojos: "#4a3426",
  peinado: "corto",
  vello: "ninguno",
  labios: null,
  sombra: null,
  pecas: false,
  arrugas: 0.2,
  anteojos: "ninguno",
  ropa: "traje",
  colorRopa: "#3a3d44",
  colorDetalle: "#e8e4da",
  corbata: "#7a1f1f",
  accesorios: [],
  colorAccesorio: "#b8963e",
};

const PIELES = ["#f1c9a5", "#e0ac84", "#d9a77f", "#c68a5e", "#a86d45", "#8a5434", "#6b3f26", "#f3d2b8"];
const PELOS = ["#1f1915", "#3b2f2a", "#5a3b24", "#7d5532", "#a5713e", "#c9a25f", "#8b2f1c", "#2b2522"];
const CANAS = ["#9a958d", "#c7c2b8", "#e2ded6", "#7b766f"];
const OJOS = ["#4a3426", "#2b2420", "#5b6e3a", "#3d5a78", "#6b4a2a"];
const ROPAS = ["#3a3d44", "#24344d", "#5a2e2e", "#3f4a3a", "#6b5a45", "#2d2d33", "#4b3b5c", "#7a6a55", "#1f4a4a"];
const DETALLES = ["#e8e4da", "#d6dce4", "#efe6cf", "#cfd8c8"];
const LABIOS = ["#a3262e", "#8a3a4a", "#b5474f", "#7a2f3a"];

/** Hash chico y estable: el mismo id da siempre los mismos colores. */
function hash(s: string) {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}

function edadDe(p: Pick<Personaje, "edad" | "voz">): Rasgos["edad"] {
  if (p.edad !== undefined) {
    if (p.edad < 3) return "bebe";
    if (p.edad < 13) return "nino";
    if (p.edad < 19) return "adolescente";
    if (p.edad < 62) return "adulto";
    return "mayor";
  }
  return p.voz.edad === "mayor" ? "mayor" : "adulto";
}

/**
 * Rasgos de un personaje: los que trae el caso y, para lo que falte, valores derivados de su voz y su edad,
 * con colores elegidos por su id para que dos personajes sin datos no salgan iguales.
 */
export function rasgosPara(p: Pick<Personaje, "id" | "edad" | "voz" | "apariencia">): Rasgos {
  const h = hash(p.id);
  const elegir = <T>(lista: readonly T[], sal: number) => lista[(h >>> sal) % lista.length];
  const del = p.apariencia?.rasgos ?? {};
  const edad = del.edad ?? edadDe(p);
  const cuerpo = del.cuerpo ?? (p.voz.genero === "femenino" ? "femenino" : "masculino");
  const chico = edad === "bebe" || edad === "nino";
  const adulto = edad === "adulto" || edad === "mayor";
  const fem = cuerpo === "femenino";

  const peinados: Rasgos["peinado"][] =
    edad === "bebe" ? ["pelusa"] : fem ? ["largo", "melena", "rodete", "cola", "rulos"] : edad === "mayor" ? ["entradas", "calvo", "corto"] : ["corto", "rulos", "rapado", "entradas"];
  const ropas: Rasgos["ropa"][] = edad === "bebe" ? ["enterito"] : chico || edad === "adolescente" ? ["remera", "buzo"] : fem ? ["vestido", "camisa", "traje"] : ["traje", "camisa", "remera"];
  const arrugas = edad === "mayor" ? 0.75 : edad === "adulto" ? Math.min(0.6, Math.max(0.05, ((p.edad ?? 38) - 25) / 55)) : 0;

  const derivados: Rasgos = {
    ...RASGOS_POR_DEFECTO,
    edad,
    cuerpo,
    piel: elegir(PIELES, 0),
    pelo: edad === "mayor" ? elegir(CANAS, 3) : elegir(PELOS, 3),
    ojos: elegir(OJOS, 6),
    peinado: elegir(peinados, 9),
    vello: !fem && adulto ? elegir(["ninguno", "ninguno", "bigote", "barba_corta", "barba"] as const, 12) : "ninguno",
    labios: fem && adulto && h % 3 === 0 ? elegir(LABIOS, 15) : null,
    arrugas,
    anteojos: edad === "mayor" && h % 2 === 0 ? "rectangulares" : "ninguno",
    ropa: elegir(ropas, 18),
    colorRopa: elegir(ROPAS, 21),
    colorDetalle: elegir(DETALLES, 24),
    corbata: !fem && adulto && h % 4 !== 0 ? elegir(["#7a1f1f", "#1f3a5a", "#3a3a3a", "#5a4a1f"] as const, 26) : null,
    accesorios: edad === "bebe" ? ["chupete"] : fem && !chico && h % 2 === 1 ? ["aros"] : [],
  };
  return { ...derivados, ...del };
}

/** Lo que viaja al navegador para dibujar al personaje (la apariencia no es secreta). */
export function aparienciaPublica(p: Pick<Personaje, "id" | "edad" | "voz" | "apariencia">) {
  const retratos = p.apariencia?.retratos;
  return retratos?.neutral ? { retratos, rasgos: null } : { retratos: null, rasgos: rasgosPara(p) };
}

export type AparienciaPublica = ReturnType<typeof aparienciaPublica>;
