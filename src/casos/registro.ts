import { CasoSchema, type Caso } from "./schema";
import hotelAurora from "../../casos/hotel-aurora/caso.json";

/** Catálogo de casos jugables. Para sumar uno: agregarlo acá y correr `npm run validar`. */
const FUENTES: unknown[] = [hotelAurora];

let cache: Map<string, Caso> | null = null;

function catalogo(): Map<string, Caso> {
  if (!cache) {
    cache = new Map();
    for (const f of FUENTES) {
      const caso = CasoSchema.parse(f);
      cache.set(caso.meta.id, caso);
    }
  }
  return cache;
}

export const listarCasos = () => [...catalogo().values()];
export const obtenerCaso = (id: string) => catalogo().get(id);
