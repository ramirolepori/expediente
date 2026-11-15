import type { Personaje } from "@/casos/schema";

/** Una voz de Piper: modelo de rhasspy/piper-voices/es, hablante si el modelo trae varios, y cómo se dice. */
export interface VozPiper {
  modelo: string;
  hablante?: number;
  /** cuánto estirar el habla (mayor = más lento) */
  lengthScale: number;
  /** altura del tono: 0.9 suena 10% más grave (se logra reproduciendo el audio a otra frecuencia de muestreo) */
  altura: number;
  /** multiplica la variación de entonación y ritmo del modelo: menos es más monótono */
  expresividad: number;
}

type Genero = Personaje["voz"]["genero"];

interface Base {
  modelo: string;
  hablante?: number;
  /** tono medio medido sobre la misma frase, en Hz */
  f0: number;
}

/**
 * Voces base por género, de la más grave a la más aguda. El género sale de medir el tono de cada
 * modelo, no del nombre: "claude" (es_MX) es una voz de mujer y antes les tocaba a los hombres adultos.
 */
export const BASES: Record<Genero, Base[]> = {
  masculino: [
    { modelo: "es_ES/davefx/medium/es_ES-davefx-medium", f0: 119 },
    { modelo: "es_ES/carlfm/x_low/es_ES-carlfm-x_low", f0: 118 },
    { modelo: "es_ES/sharvard/medium/es_ES-sharvard-medium", hablante: 0, f0: 129 },
    { modelo: "es_MX/ald/medium/es_MX-ald-medium", f0: 167 },
  ],
  femenino: [
    { modelo: "es_MX/claude/high/es_MX-claude-high", f0: 182 },
    { modelo: "es_AR/daniela/high/es_AR-daniela-high", f0: 188 },
    { modelo: "es_ES/sharvard/medium/es_ES-sharvard-medium", hablante: 1, f0: 210 },
  ],
};

/** Hasta dónde puede ir el tono de cada género sin que un hombre suene a mujer ni al revés. */
export const RANGO_F0: Record<Genero, [number, number]> = { masculino: [85, 150], femenino: [165, 255] };

const EDAD = { mayor: 0, adulto: 1, joven: 2 } as const;
const ALTURA_EDAD = { mayor: 0.92, adulto: 1, joven: 1.06 } as const;
const GRAVE = /grave|ronc|seco|calm|frí|fri|formal/i;
const AGUDO = /agitad|nervios|alegre|tens|quebrad/i;
const MONOTONO = /calm|frí|fri|formal|seco|controlad/i;

const gravedad = (v: Personaje["voz"]) => EDAD[v.edad] + (v.tono && GRAVE.test(v.tono) ? -0.5 : 0) + (v.tono && AGUDO.test(v.tono) ? 0.5 : 0);

/**
 * Reparte las voces de un elenco para que nadie suene igual: por género, del más grave al más agudo
 * (edad y tono del caso), cada uno toma la siguiente voz base y un tono escalonado. Se calcula sobre
 * el elenco entero, así la voz de alguien no cambia cuando aparece otro personaje.
 */
export function vocesDelElenco(personajes: Pick<Personaje, "id" | "voz">[]): Record<string, VozPiper> {
  const voces: Record<string, VozPiper> = {};
  for (const genero of ["masculino", "femenino"] as const) {
    const grupo = personajes.filter((p) => p.voz.genero === genero).sort((a, b) => gravedad(a.voz) - gravedad(b.voz) || a.id.localeCompare(b.id));
    const [min, max] = RANGO_F0[genero];
    grupo.forEach(({ id, voz }, i) => {
      const base = BASES[genero][i % BASES[genero].length];
      const escalon = grupo.length > 1 ? i / (grupo.length - 1) - 0.5 : 0;
      const altura = Math.min(max / base.f0, Math.max(min / base.f0, ALTURA_EDAD[voz.edad] + escalon * 0.12));
      voces[id] = {
        modelo: base.modelo,
        ...(base.hablante !== undefined && { hablante: base.hablante }),
        lengthScale: 1 / voz.velocidad,
        altura: Math.round(altura * 1000) / 1000,
        expresividad: voz.tono && AGUDO.test(voz.tono) ? 1.3 : voz.tono && MONOTONO.test(voz.tono) ? 0.7 : 1,
      };
    });
  }
  return voces;
}

/** Tono que se escucha con esta voz, en Hz. */
export const f0De = (v: VozPiper) => Math.round(Object.values(BASES).flat().find((b) => b.modelo === v.modelo && b.hablante === v.hablante)!.f0 * v.altura);
