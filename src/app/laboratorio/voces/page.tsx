import { listarCasos } from "@/casos/registro";
import { Probador } from "./Probador";

/** Las voces de Piper de cada personaje. Solo viajan nombre, rol y voz: nada de la solución. */
export default function Pagina() {
  const personajes = listarCasos().flatMap((c) =>
    c.personajes.filter((p) => p.voz).map((p) => ({ id: `${c.meta.id}/${p.id}`, caso: c.meta.titulo, nombre: p.nombre, rol: p.rol, voz: p.voz! })),
  );
  return <Probador personajes={personajes} />;
}
