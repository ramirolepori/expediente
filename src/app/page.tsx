import { listarCasos } from "@/casos/registro";
import { Inicio } from "@/componentes/Inicio";

export default function Pagina() {
  const casos = listarCasos().map((c) => ({ ...c.meta, ambientacion: c.ambientacion, modos: c.modos }));
  return <Inicio casos={casos} />;
}
