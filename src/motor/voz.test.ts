import { describe, expect, it } from "vitest";
import { leerCasoArchivado } from "@/casos/archivados";
import { CASOS_OFICIALES } from "@/casos/oficiales";
import { CasoSchema } from "@/casos/schema";
import { BASES, RANGO_F0, f0De, vocesDelElenco } from "./voz";

type Genero = "femenino" | "masculino";
const GENEROS: Genero[] = ["femenino", "masculino"];
const EDADES = ["joven", "adulto", "mayor"] as const;
const TONOS = [undefined, "grave y seco", "nervioso", "calmo y frío", "alegre"];
const casos = CASOS_OFICIALES.map(({ carpeta }) => CasoSchema.parse(leerCasoArchivado(carpeta)));

const generoDe = (modelo: string, hablante?: number) => GENEROS.filter((g) => BASES[g].some((b) => b.modelo === modelo && b.hablante === hablante));

describe("voces de los personajes", () => {
  it("el género del caso siempre elige una voz de ese género, con tono de ese género", () => {
    // "claude" es una mujer: le tocaba a Martín Duarte y a todos los hombres adultos
    expect(BASES.masculino.map((b) => b.modelo).join()).not.toMatch(/claude|daniela/);
    // elencos de todos los tamaños y combinaciones, más los casos reales
    const sinteticos = [1, 2, 5, 9].map((n) =>
      Array.from({ length: n }, (_, i) => ({
        id: `p${i}`,
        voz: { genero: GENEROS[i % 2], edad: EDADES[i % 3], velocidad: 1, tono: TONOS[i % TONOS.length] },
      })),
    );
    const reales = casos.map((c) => c.personajes);
    for (const elenco of [...sinteticos, ...reales]) {
      const voces = vocesDelElenco(elenco);
      for (const p of elenco) {
        const v = voces[p.id];
        expect(generoDe(v.modelo, v.hablante), p.id).toEqual([p.voz.genero]);
        const [min, max] = RANGO_F0[p.voz.genero];
        expect(f0De(v), p.id).toBeGreaterThanOrEqual(min);
        expect(f0De(v), p.id).toBeLessThanOrEqual(max);
      }
    }
  });

  it("en cada caso, dos personajes no comparten voz base y tono parecido", () => {
    for (const caso of casos) {
      const voces = vocesDelElenco(caso.personajes);
      const ids = Object.keys(voces);
      for (const a of ids)
        for (const b of ids.filter((x) => x > a)) {
          const [va, vb] = [voces[a], voces[b]];
          const mismaBase = va.modelo === vb.modelo && va.hablante === vb.hablante;
          if (mismaBase) expect(Math.abs(f0De(va) - f0De(vb)), `${caso.meta.id}: ${a} y ${b}`).toBeGreaterThanOrEqual(15);
        }
    }
  });

  it("la voz de cada uno no depende del orden del elenco y respeta la velocidad del caso", () => {
    const elenco = casos[0].personajes;
    expect(vocesDelElenco([...elenco].reverse())).toEqual(vocesDelElenco(elenco));
    const v = vocesDelElenco([{ id: "a", voz: { genero: "masculino", edad: "mayor", velocidad: 0.8 } }]).a;
    expect(v.lengthScale).toBe(1.25);
  });
});
