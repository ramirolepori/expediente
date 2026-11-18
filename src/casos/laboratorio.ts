import ejemplo from "@/kit/ejemplo/caso.json";
import { CasoSchema, MinijuegoSchema } from "./schema";

export const casoLaboratorio = CasoSchema.parse(ejemplo);
const base = { sobre: "s1_local", modo: "compartido" };

export const minijuegosLaboratorio = MinijuegoSchema.array().parse([
  ...casoLaboratorio.minijuegos,
  { ...base, id: "papel", tipo: "rompecabezas", titulo: "Receta rota", descripcion: "Reconstruí las instrucciones.", config: { fragmentos: ["Medí dos tazas de harina.", "Agregá agua tibia.", "Mezclá hasta formar una masa."] } },
  { ...base, id: "nota", tipo: "cifrado", titulo: "Nota cifrada de muestra", descripcion: "Descifrá el mensaje.", config: { cifrado: "cesar", mensaje: "KROD PXQGR", pista: "Retrocedé tres letras." }, solucion: "HOLA MUNDO" },
  { ...base, id: "caja", tipo: "personalizado", titulo: "Caja fuerte de muestra", descripcion: "Probá el dial con la combinación 01-02-03.", config: { pagina: "/casos/hotel-aurora/minijuegos/caja-fuerte.html" }, solucion: "01-02-03" },
]);
