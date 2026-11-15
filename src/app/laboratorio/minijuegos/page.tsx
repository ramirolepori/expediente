import { listarCasos } from "@/casos/registro";
import { configPublica } from "@/motor/minijuegos";
import { Probador, type MinijuegoDePrueba } from "./Probador";

/** Todos los minijuegos de todos los casos, para jugarlos sueltos y revisar su calidad. */
export default function Pagina() {
  const minijuegos: MinijuegoDePrueba[] = listarCasos().flatMap((caso) =>
    caso.minijuegos.map((m) => ({
      casoId: caso.meta.id,
      casoTitulo: caso.meta.titulo,
      ambientacion: caso.ambientacion,
      id: m.id,
      titulo: m.titulo,
      descripcion: m.descripcion,
      tipo: m.tipo,
      sobre: caso.sobres.find((s) => s.id === m.sobre)?.titulo ?? m.sobre,
      modo: m.modo,
      // misma semilla que usa la API del laboratorio para validar
      config: configPublica(m, "LABORATORIO"),
      solucion:
        m.tipo === "rompecabezas" ? m.config.fragmentos : m.tipo === "linea_tiempo" ? m.config.eventos : [m.solucion],
      destraba: caso.pruebas.filter((p) => JSON.stringify(p.desbloqueo ?? {}).includes(`"minijuego":"${m.id}"`)).map((p) => p.titulo),
    })),
  );
  return <Probador minijuegos={minijuegos} />;
}
