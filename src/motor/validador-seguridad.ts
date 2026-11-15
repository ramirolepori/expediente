/**
 * Capa de seguridad del validador (ADR 0012). El texto de un caso es dato no confiable: va a los prompts
 * de los personajes y a la pantalla de los jugadores. Todo lo que encuentra esta capa es error y bloquea.
 */

/** Más largo que esto, un solo texto ya no es contenido de un caso. Los casos actuales no pasan de 1.100. */
export const MAX_TEXTO = 4000;
/** Tamaño máximo del caso.json. Los actuales pesan unos 55 KB. */
export const MAX_CASO_BYTES = 300 * 1024;

// Frases que le hablan al modelo en lugar de a los jugadores. Se buscan sin tildes y en minúscula.
const INSTRUCCIONES_AL_MODELO: [RegExp, string][] = [
  [/\b(ignora|ignore|ignoren|olvida|olvidate|olvide|forget|disregard|omiti)\b.{0,40}\b(instrucciones|indicaciones|directivas|prompt|instructions)\b/, "pide ignorar instrucciones"],
  [/\b(system ?prompt|prompt del sistema|prompt de sistema|mensaje del sistema|developer message)\b/, "menciona el prompt del sistema"],
  [/\b(sos|eres|you are|actua como|actuas como|act as)\s+(un |una |an? )?(asistente|assistant|ia\b|ai\b|chatgpt|gemini|claude|modelo de lenguaje|language model)/, "le dice al personaje que es una IA o un asistente"],
  [/\b(a partir de ahora|desde ahora|from now on)\b.{0,40}\b(responde|respondes|ignora|deci|decis|sos|eres|you)\b/, "intenta cambiar las reglas a partir de un momento"],
  [/\b(revela|revelale|conta|contale|deci|decile|reveal|tell)\b.{0,30}\b(la solucion|el culpable|la verdad del caso|the solution|the culprit)\b/, "pide revelar la solución"],
  [/\b(jailbreak|modo desarrollador|developer mode|do anything now)\b/, "intenta saltear los límites del modelo"],
  [/<\|[a-z_]+\|>|\[\/?inst\]|<\/?(system|assistant|user)>|^#{1,3}\s*(system|instrucciones|instructions)\b/m, "imita el formato interno de un modelo"],
];

const SIN_TILDES = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// caracteres invisibles o que invierten el sentido del texto: sirven para esconder instrucciones
const INVISIBLES = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f​-‏‪-‮⁠-⁤⁦-⁩﻿]/;
const HTML = /<\s*\/?\s*[a-z][a-z0-9-]*(\s[^>]*)?\/?\s*>|<!--/i;
const ESQUEMA_PELIGROSO = /\b(javascript|vbscript|data|file)\s*:/i;
const LINK = /\bhttps?:\/\/|\bwww\.[a-z0-9-]+\.[a-z]/i;

export interface ProblemaTexto {
  donde: string;
  mensaje: string;
}

/** Recorre todos los textos del JSON tal como vino (antes del schema, así nada se escapa). */
export function revisarTextos(datos: unknown): ProblemaTexto[] {
  const problemas: ProblemaTexto[] = [];
  const visitar = (x: unknown, donde: string) => {
    if (typeof x === "string") return revisarTexto(x, donde, problemas);
    if (Array.isArray(x)) return x.forEach((v, i) => visitar(v, `${donde}[${i}]`));
    if (x && typeof x === "object") {
      for (const [k, v] of Object.entries(x)) {
        if (INVISIBLES.test(k) || HTML.test(k)) problemas.push({ donde: donde || "caso", mensaje: `la clave "${k.slice(0, 40)}" tiene caracteres no permitidos` });
        visitar(v, donde ? `${donde}.${k}` : k);
      }
    }
  };
  visitar(datos, "");
  return problemas;
}

function revisarTexto(texto: string, donde: string, out: ProblemaTexto[]) {
  if (texto.length > MAX_TEXTO) out.push({ donde, mensaje: `el texto tiene ${texto.length} caracteres; el máximo es ${MAX_TEXTO}. Partilo o resumilo` });
  if (INVISIBLES.test(texto)) out.push({ donde, mensaje: "tiene caracteres invisibles o de control. Sacalos" });
  if (HTML.test(texto)) out.push({ donde, mensaje: "tiene HTML. Usá solo markdown (negrita, cursiva, listas, citas)" });
  if (ESQUEMA_PELIGROSO.test(texto)) out.push({ donde, mensaje: "tiene un enlace de tipo javascript:, data: o file:. Sacalo" });
  else if (LINK.test(texto)) out.push({ donde, mensaje: "tiene un link externo. Los casos no pueden enlazar a otras páginas" });
  const plano = SIN_TILDES(texto);
  for (const [patron, que] of INSTRUCCIONES_AL_MODELO) {
    if (patron.test(plano)) out.push({ donde, mensaje: `parece una instrucción para la IA (${que}). Los textos del caso tienen que hablar de la historia, no darle órdenes al modelo` });
  }
}

/** Una ruta de archivo segura: dentro de la carpeta del caso, sin subir de carpeta ni caracteres raros. */
export function rutaSegura(ruta: string, idCaso: string) {
  return ruta.startsWith(`/casos/${idCaso}/`) && !ruta.includes("..") && !ruta.includes("//") && /^[\w\-./]+$/.test(ruta);
}
