import { casoLaboratorio, minijuegosLaboratorio } from "@/casos/laboratorio";
import { esRespuestaCorrecta } from "@/motor/minijuegos";

/** Valida respuestas de minijuegos sueltos, para probarlos en el laboratorio sin armar una sala. */
export async function POST(req: Request) {
  const { casoId, minijuego, respuesta } = await req.json();
  const m = casoId === casoLaboratorio.meta.id ? minijuegosLaboratorio.find((x) => x.id === minijuego) : undefined;
  if (!m) return Response.json({ error: "Minijuego inexistente" }, { status: 404 });
  return Response.json({ correcto: esRespuestaCorrecta(m, SEMILLA_LABORATORIO, String(respuesta ?? "")) });
}

const SEMILLA_LABORATORIO = "LABORATORIO";
