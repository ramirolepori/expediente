import type { Caso, Condicion } from "@/casos/schema";
import type { EstadoPartida } from "./tipos";

type EstadoMinimo = Pick<EstadoPartida, "sobresAbiertos" | "capitulosResueltos" | "hechosRevelados" | "candadosAbiertos" | "minijuegosResueltos">;

export function evaluar(cond: Condicion, estado: EstadoMinimo, caso: Caso): boolean {
  switch (cond.tipo) {
    case "siempre":
      return true;
    case "sobre":
      return estado.sobresAbiertos.includes(cond.sobre);
    case "capitulo":
      return estado.capitulosResueltos?.includes(cond.capitulo) ?? false;
    case "hecho":
      return estado.hechosRevelados.includes(cond.hecho);
    case "candado":
      return estado.candadosAbiertos.includes(cond.candado);
    case "minijuego":
      return !!estado.minijuegosResueltos?.[cond.minijuego];
    case "prueba":
      return pruebaVisible(cond.prueba, estado, caso);
    case "todas":
      return cond.condiciones.every((c) => evaluar(c, estado, caso));
    case "alguna":
      return cond.condiciones.some((c) => evaluar(c, estado, caso));
  }
}

export function preguntaCapituloDisponible(sobre: Caso["sobres"][number], estado: EstadoMinimo, caso: Caso): boolean {
  const pregunta = sobre.preguntaCapitulo;
  return !!pregunta && estado.sobresAbiertos.includes(sobre.id) &&
    (!pregunta.disponible || evaluar(pregunta.disponible, estado, caso));
}

export function votacionDisponible(caso: Caso, estado: EstadoMinimo): boolean {
  return !caso.resolucion.requisito || evaluar(caso.resolucion.requisito, estado, caso);
}

export function pruebaVisible(id: string, estado: EstadoMinimo, caso: Caso): boolean {
  const prueba = caso.pruebas.find((p) => p.id === id);
  if (!prueba) return false;
  if (!estado.sobresAbiertos.includes(prueba.sobre)) return false;
  return prueba.desbloqueo ? evaluar(prueba.desbloqueo, estado, caso) : true;
}

export function pruebasVisibles(estado: EstadoMinimo, caso: Caso) {
  return caso.pruebas.filter((p) => pruebaVisible(p.id, estado, caso));
}

export function minijuegoVisible(id: string, estado: EstadoMinimo, caso: Caso): boolean {
  const m = caso.minijuegos.find((x) => x.id === id);
  if (!m || !estado.sobresAbiertos.includes(m.sobre)) return false;
  return evaluar(m.disponible, estado, caso);
}
