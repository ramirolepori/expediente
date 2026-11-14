import { generateText, isStepCount, tool, type ModelMessage } from "ai";
import { z } from "zod";
import { evaluar } from "@/motor/condiciones";
import { construirInstrucciones, limpiarRespuesta, resolverRevelacion, textoPrueba } from "@/motor/interrogatorio";
import { nuevoId, recursosRestantes, revelarHecho } from "@/motor/reductor";
import type { MensajeInterrogatorio } from "@/motor/tipos";
import { almacen, type Sala } from "@/servidor/almacen";
import { modelosInterrogatorio } from "@/servidor/llm";
import { autenticar, ErrorSala, respuestaError } from "@/servidor/salas";

export const maxDuration = 60;

const LIMITES = { esperaMs: 3000, preguntasPorPartida: 300 };

function agregarMensaje(codigo: string, personajeId: string, m: MensajeInterrogatorio) {
  return almacen.actualizar(codigo, (s): Sala => {
    const estado = structuredClone(s.estado);
    (estado.interrogatorios[personajeId] ??= []).push(m);
    estado.version++;
    return { ...s, estado };
  });
}

export async function POST(req: Request, ctx: RouteContext<"/api/salas/[codigo]/interrogar">) {
  try {
    const { codigo } = await ctx.params;
    const { token, personaje: personajeId, texto, prueba } = await req.json();
    const { conexionId, caso, sala } = await autenticar(codigo, token);
    const yo = sala.estado.conexiones[conexionId];
    if (yo.tipo !== "jugador") throw new ErrorSala("Solo los jugadores interrogan");
    if (sala.estado.fase !== "jugando") throw new ErrorSala("La partida no está en curso");
    const personaje = caso.personajes.find((p) => p.id === personajeId && p.interrogable);
    if (!personaje) throw new ErrorSala("Esa persona no existe", 404);
    if (!evaluar(personaje.disponible, sala.estado, caso)) throw new ErrorSala("Todavía no tienen motivos para citar a esa persona");
    const pregunta = String(texto ?? "").trim().slice(0, 800);
    if (!pregunta && !prueba) throw new ErrorSala("Escribí una pregunta");
    const anexoPrueba = prueba ? textoPrueba(caso, sala.estado, String(prueba)) : null;
    if (prueba && !anexoPrueba) throw new ErrorSala("Esa prueba no está en el expediente");

    // validar límites, cobrar la hora y registrar la pregunta en una sola escritura atómica,
    // así dos preguntas simultáneas no pueden saltarse los límites
    const actual = await almacen.actualizar(codigo, (sl): Sala => {
      const todos = Object.values(sl.estado.interrogatorios).flat();
      const ahora = Date.now();
      const ultimoMio = todos.filter((m) => m.de === "jugador" && m.autor === conexionId).at(-1);
      if (ultimoMio && ahora - ultimoMio.hora < LIMITES.esperaMs) throw new ErrorSala("Esperá unos segundos antes de la próxima pregunta", 429);
      const ultimoAca = sl.estado.interrogatorios[personaje.id]?.at(-1);
      if (ultimoAca?.de === "jugador" && ahora - ultimoAca.hora < 60000) throw new ErrorSala(`${personaje.nombre} todavía está respondiendo`, 429);
      if (todos.filter((m) => m.de === "jugador").length >= LIMITES.preguntasPorPartida) {
        throw new ErrorSala("Llegaron al máximo de preguntas de la partida", 429);
      }
      const estado = structuredClone(sl.estado);
      if (!estado.personajesVisitados.includes(personaje.id)) {
        const restantes = recursosRestantes(estado);
        if (restantes !== null && restantes <= 0) throw new ErrorSala("No quedan horas de investigación para citar a alguien nuevo");
        estado.personajesVisitados.push(personaje.id);
      }
      (estado.interrogatorios[personaje.id] ??= []).push({
        id: nuevoId(), de: "jugador", autor: conexionId, texto: pregunta, prueba: prueba || undefined, hora: ahora,
      });
      estado.version++;
      return { ...sl, estado };
    });

    const modelos = modelosInterrogatorio();
    if (!modelos) {
      await agregarMensaje(codigo, personaje.id, {
        id: nuevoId(), de: "sistema", hora: Date.now(),
        texto: "Falta configurar la clave del modelo (GOOGLE_GENERATIVE_AI_API_KEY en .env.local) para que los personajes respondan.",
      });
      return Response.json({ error: "Modelo no configurado" }, { status: 503 });
    }

    const apodos = Object.fromEntries(Object.values(actual.estado.conexiones).map((c) => [c.id, c.apodo]));
    const historial: ModelMessage[] = (actual.estado.interrogatorios[personaje.id] ?? [])
      .filter((m) => m.de !== "sistema")
      .slice(-30)
      .map((m) => {
        if (m.de === "personaje") return { role: "assistant", content: m.texto };
        const extra = m.prueba ? `\n${textoPrueba(caso, actual.estado, m.prueba) ?? ""}` : "";
        return { role: "user", content: `[${apodos[m.autor ?? ""] ?? "Detective"}]: ${m.texto}${extra}` };
      });

    const revelar = tool({
      description: "Registrar que contás algo marcado con [clave: ...] en tu ficha. Llamala antes de contarlo.",
      inputSchema: z.object({ clave: z.string() }),
      execute: async ({ clave }) => {
        const s = (await almacen.obtener(codigo))!;
        const r = resolverRevelacion(caso, personaje, s.estado, clave);
        if (!r.ok) return { permitido: false, indicacion: r.motivo };
        await almacen.actualizar(codigo, (x) => {
          const estado = revelarHecho(x.estado, r.hecho, personaje.nombre);
          return estado === x.estado ? x : { ...x, estado };
        });
        return { permitido: true };
      },
    });

    let respuestaModelo = "";
    for (const opcion of modelos) {
      try {
        const resultado = await generateText({
          model: opcion.modelo,
          system: construirInstrucciones(caso, personaje, actual.estado),
          messages: historial,
          temperature: 0.6,
          stopWhen: isStepCount(4),
          providerOptions: opcion.providerOptions as Parameters<typeof generateText>[0]["providerOptions"],
          abortSignal: AbortSignal.timeout(opcion.timeoutMs),
          tools: { revelar },
        });
        respuestaModelo = resultado.text.trim();
        if (respuestaModelo) break;
      } catch (e) {
        console.warn(`Interrogatorio: ${opcion.nombre} falló (${e instanceof Error ? e.name : "error"}), probando el siguiente`);
      }
    }
    if (!respuestaModelo) {
      await agregarMensaje(codigo, personaje.id, {
        id: nuevoId(), de: "sistema", hora: Date.now(),
        texto: `${personaje.nombre} no responde ahora (el modelo está saturado). Probá de nuevo en unos segundos.`,
      });
      return Response.json({ error: "Sin respuesta del modelo" }, { status: 503 });
    }

    // red de seguridad: el modelo a veces copia las etiquetas internas de la ficha en su respuesta
    const respuesta = limpiarRespuesta(respuestaModelo) || "*Se queda en silencio.*";
    await agregarMensaje(codigo, personaje.id, { id: nuevoId(), de: "personaje", texto: respuesta, hora: Date.now() });
    return Response.json({ ok: true });
  } catch (e) {
    return respuestaError(e);
  }
}
