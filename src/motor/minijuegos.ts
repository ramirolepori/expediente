import type { Minijuego } from "@/casos/schema";

/** Hash corto y estable (FNV-1a). Sirve para dar ids opacos a las piezas: el orden correcto no viaja al navegador. */
function hash(texto: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

const piezaId = (semilla: string, indice: number) => `p${hash(`${semilla}:${indice}`)}`;

/** Mezcla determinística por sala: todos los jugadores ven el mismo desorden, y nunca el orden correcto. */
function mezclar<T>(items: T[], semilla: string): T[] {
  const out = [...items];
  let s = parseInt(hash(semilla), 36) || 1;
  const azar = () => ((s = Math.imul(s ^ (s >>> 15), 2246822507) ^ Math.imul(s ^ (s >>> 13), 3266489909)) >>> 0) / 2 ** 32;
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(azar() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  // si quedó en el orden original, se rota uno
  if (out.every((x, i) => x === items[i])) out.push(out.shift()!);
  return out;
}

/** Normaliza respuestas de texto: sin tildes, sin signos, en mayúsculas. */
export function normalizarRespuesta(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase();
}

/** Lo que ve el navegador: la config sin la solución, con las piezas mezcladas y con ids opacos. */
export function configPublica(m: Minijuego, codigoSala: string) {
  const semilla = `${codigoSala}:${m.id}`;
  switch (m.tipo) {
    case "rompecabezas":
      return { piezas: mezclar(m.config.fragmentos.map((texto, i) => ({ id: piezaId(semilla, i), texto })), semilla) };
    case "linea_tiempo":
      return { piezas: mezclar(m.config.eventos.map((texto, i) => ({ id: piezaId(semilla, i), texto })), semilla) };
    case "cifrado":
      return { cifrado: m.config.cifrado, mensaje: m.config.mensaje, pista: m.config.pista };
    case "personalizado":
      return { pagina: m.config.pagina, alto: m.config.alto };
  }
}

/** El servidor decide si la respuesta resuelve el minijuego. */
export function esRespuestaCorrecta(m: Minijuego, codigoSala: string, respuesta: string) {
  const semilla = `${codigoSala}:${m.id}`;
  switch (m.tipo) {
    case "rompecabezas":
      return respuesta === m.config.fragmentos.map((_, i) => piezaId(semilla, i)).join(",");
    case "linea_tiempo":
      return respuesta === m.config.eventos.map((_, i) => piezaId(semilla, i)).join(",");
    case "cifrado":
    case "personalizado":
      return normalizarRespuesta(respuesta) === normalizarRespuesta(m.solucion);
  }
}

/** Utilidad del cifrado César, compartida por el minijuego y por la herramienta de autor. */
export function cesar(texto: string, desplazamiento: number) {
  const abc = "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ";
  return texto
    .toUpperCase()
    .split("")
    .map((c) => {
      const i = abc.indexOf(c);
      return i < 0 ? c : abc[(i + desplazamiento + abc.length * 10) % abc.length];
    })
    .join("");
}
