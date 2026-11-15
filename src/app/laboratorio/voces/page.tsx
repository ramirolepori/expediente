import { listarCasos } from "@/casos/registro";
import { vocesDelElenco } from "@/motor/voz";
import { Probador } from "./Probador";

/** Las voces de Piper de cada personaje. Solo viajan nombre, rol y voz: nada de la solución. */
export default function Pagina() {
  const personajes = listarCasos().flatMap((c) => {
    const interrogables = c.personajes.filter((p) => p.interrogable);
    const voces = vocesDelElenco(interrogables);
    return interrogables.map((p) => ({ id: `${c.meta.id}/${p.id}`, caso: c.meta.titulo, nombre: p.nombre, rol: p.rol, descripcionVoz: `${p.voz.genero}, ${p.voz.edad}, velocidad ${p.voz.velocidad}${p.voz.tono ? `, ${p.voz.tono}` : ""}`, voz: voces[p.id] }));
  });
  return <Probador personajes={personajes} />;
}
