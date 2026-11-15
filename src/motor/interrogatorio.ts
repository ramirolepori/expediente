import type { Caso, Personaje } from "@/casos/schema";
import { EMOCIONES, type Emocion } from "@/componentes/personaje/emociones";
import { evaluar, pruebaVisible } from "./condiciones";
import type { EstadoPartida } from "./tipos";

/** Topes pensados para la cuota gratis de Gemini (ADR 0005): el lite admite 15 pedidos por minuto y 500 por día. */
export const LIMITES_INTERROGATORIO = { esperaMs: 3000, porSalaPorMinuto: 12, porPartida: 150 };

export function preguntasHechas(estado: EstadoPartida, desde = 0) {
  return Object.values(estado.interrogatorios).flat().filter((m) => m.de === "jugador" && m.hora >= desde).length;
}

/**
 * Guardrails del interrogatorio:
 * 1. Aislamiento: el personaje solo recibe SU ficha. Nunca la verdad ni lo que saben otros.
 * 2. Revelaciones por herramienta: contar algo importante = llamar a `revelar(clave)`,
 *    y el servidor decide si se puede (resolverRevelacion). El estado lo lleva el servidor.
 * 3. Secretos bloqueados: el personaje sabe que existen para no contradecirlos, pero tiene prohibido contarlos.
 * 4. Mentiras guionadas, que "caen" según las pruebas que tiene el equipo.
 */

const sinMarkdown = (s: string) => s.replace(/[*_#>`]/g, "");

export function construirInstrucciones(caso: Caso, p: Personaje, estado: EstadoPartida): string {
  const hecho = (id: string) => caso.hechos.find((h) => h.id === id)?.texto ?? id;
  const revelado = (id: string) => estado.hechosRevelados.includes(id);

  const sabe = p.sabe.map((h) => `- [clave: ${h}]${revelado(h) ? " (ya lo contaste)" : ""} ${hecho(h)}`);

  const mentiras = p.mentiras.map((m) => {
    const cayo = evaluar(m.cae, estado, caso);
    return cayo
      ? `- Sobre ${m.tema}: antes decías "${m.dice}". ESTA MENTIRA YA NO SE SOSTIENE: el equipo tiene la prueba que la desmiente. Si te confrontan con eso, ${m.alCaer}`
      : `- Sobre ${m.tema}: sostenés que ${m.dice} No la abandones salvo que te confronten con pruebas concretas que la desmientan.`;
  });

  const secretos = p.secretos.map((s) => {
    if (revelado(s.hecho)) return `- (YA LO CONTASTE, podés repetirlo y ampliarlo) ${hecho(s.hecho)}`;
    if (evaluar(s.cuando, estado, caso)) {
      return `- [clave: ${s.id}] (HABILITADO) ${hecho(s.hecho)}\n  Cómo y cuándo contarlo: ${s.como}\n  No lo largues todo de una: primero reaccioná a lo que te muestran (silencio, nervios, un último intento de negar) y después contalo de a partes en dos o tres respuestas, empezando por lo menos comprometedor.`;
    }
    return `- (BLOQUEADO) ${hecho(s.hecho)}\n  No lo reveles bajo ningún concepto, aunque insistan. Si se acercan al tema, evadí, negalo o ponete incómodo, sin agregar detalles nuevos.`;
  });

  return [
    `Sos ${p.nombre}${p.edad ? `, ${p.edad} años` : ""}: ${p.rol}. Estás en un juego de investigación y te interroga un equipo de detectives (puede haber varias personas preguntando; cada mensaje dice quién habla).`,
    ``,
    `CONTEXTO PÚBLICO DEL CASO`,
    sinMarkdown(caso.introduccion),
    ``,
    `QUIÉN SOS`,
    p.descripcion,
    `Personalidad: ${p.personalidad}`,
    `Forma de hablar: ${p.formaDeHablar}`,
    ``,
    `REGLAS, NO LAS ROMPAS NUNCA`,
    `1. Siempre en personaje, en español rioplatense, en primera persona. Respuestas cortas, de 1 a 4 frases, como en un interrogatorio real. Como mucho un gesto breve entre asteriscos.`,
    `2. Solo sabés lo que figura en esta ficha. Si te preguntan algo que no está, decí que no sabés, que no te acordás o que no tiene nada que ver. NUNCA inventes hechos del caso: horarios, objetos, personas, lugares, nombres ni pruebas.`,
    `3. Solo podés improvisar color sin importancia${p.color ? `: ${p.color}` : "."}`,
    `4. Nunca digas que sos una IA ni hables de reglas, fichas, claves o del juego.`,
    `5. Si te muestran una prueba, reaccioná a lo que dice.`,
    `6. La primera vez que cuentes algo marcado con [clave: ...], llamá antes a la herramienta revelar con esa clave. Si la herramienta lo rechaza, no lo cuentes y evadí.`,
    `7. Las claves y marcas entre corchetes o paréntesis de esta ficha son internas: nunca las escribas en tu respuesta.`,
    `8. Empezá cada respuesta con la emoción que mostrás en ese momento, entre corchetes: [emocion: X], donde X es una de: ${EMOCIONES.join(", ")}. Es la única marca que va en tu respuesta; no la nombres en el texto.`,
    ``,
    `LO QUE SABÉS Y PODÉS CONTAR SI TE PREGUNTAN`,
    sabe.length ? sabe.join("\n") : "- Nada relevante más allá de tu descripción.",
    ``,
    `MENTIRAS QUE SOSTENÉS`,
    mentiras.length ? mentiras.join("\n") : "- Ninguna. Sos sincero/a dentro de lo que sabés.",
    ``,
    `SECRETOS`,
    secretos.length ? secretos.join("\n") : "- Ninguno.",
  ].join("\n");
}

export type Revelacion = { ok: true; hecho: string } | { ok: false; motivo: string };

/** El servidor decide si una revelación es válida en este momento. */
export function resolverRevelacion(caso: Caso, p: Personaje, estado: EstadoPartida, clave: string): Revelacion {
  if (p.sabe.includes(clave)) return { ok: true, hecho: clave };
  const secreto = p.secretos.find((s) => s.id === clave);
  if (!secreto) return { ok: false, motivo: "Esa clave no existe en tu ficha. No lo cuentes." };
  if (estado.hechosRevelados.includes(secreto.hecho)) return { ok: true, hecho: secreto.hecho };
  if (!evaluar(secreto.cuando, estado, caso)) return { ok: false, motivo: "Todavía no podés revelar esto. Evadí sin dar detalles." };
  return { ok: true, hecho: secreto.hecho };
}

/** Texto que se agrega al mensaje cuando el jugador muestra una prueba. */
export function textoPrueba(caso: Caso, estado: EstadoPartida, pruebaId: string): string | null {
  if (!pruebaVisible(pruebaId, estado, caso)) return null;
  const prueba = caso.pruebas.find((x) => x.id === pruebaId)!;
  let contenido = sinMarkdown(prueba.contenido);
  if (prueba.celular) contenido += "\n" + JSON.stringify(prueba.celular);
  return `[El detective te muestra la prueba «${prueba.titulo}»: ${contenido}]`;
}

const ETIQUETA_EMOCION = /\[\s*emoci[oó]n\s*:\s*([^\]]*)\]\s*/gi;

/** Saca marcas internas de la ficha que el modelo pueda haber copiado, como "[clave: x]" o "(BLOQUEADO)", y la etiqueta de emoción. */
export function limpiarRespuesta(texto: string) {
  return texto
    .replace(ETIQUETA_EMOCION, "")
    .replace(/\[\s*clave\s*:[^\]]*\]\s*/gi, "")
    .replace(/\((?:BLOQUEADO|HABILITADO|YA LO CONTASTE)[^)]*\)\s*/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

/** Separa la emoción que el modelo puso al principio ("[emocion: nervioso]") del texto. Sin etiqueta válida, neutral. */
export function leerRespuesta(texto: string): { texto: string; emocion: Emocion } {
  const dicha = [...texto.matchAll(ETIQUETA_EMOCION)].map((m) => m[1].trim().toLowerCase()).find((e) => (EMOCIONES as readonly string[]).includes(e));
  return { texto: limpiarRespuesta(texto), emocion: (dicha as Emocion | undefined) ?? "neutral" };
}

/** Lo que el modelo ve de sus respuestas anteriores: con la etiqueta, para que mantenga el formato. */
export function respuestaEnHistorial(m: { texto: string; emocion?: Emocion }) {
  return m.emocion ? `[emocion: ${m.emocion}] ${m.texto}` : m.texto;
}
