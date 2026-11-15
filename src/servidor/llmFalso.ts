import { MockLanguageModelV4 } from "ai/test";

/**
 * Modelo falso para tests (LLM_FALSO=1): responde al instante, sin gastar cuota.
 * Si la pregunta incluye "[revelar:clave]", primero llama a la herramienta revelar con esa clave,
 * así los tests pueden ejercitar las revelaciones y los guardrails del servidor.
 */
export function modeloFalso() {
  const uso = {
    inputTokens: { total: 1, noCache: 1, cacheRead: undefined, cacheWrite: undefined },
    outputTokens: { total: 1, text: 1, reasoning: undefined },
  };
  return new MockLanguageModelV4({
    provider: "falso",
    modelId: "falso",
    doGenerate: async (opciones) => {
      const mensajes = opciones.prompt;
      const ultimo = mensajes.at(-1);
      const sistema = mensajes.find((m) => m.role === "system");
      const nombre = typeof sistema?.content === "string" ? (sistema.content.match(/^Sos ([^,:]+)/)?.[1] ?? "Personaje") : "Personaje";

      if (ultimo?.role === "tool") {
        const resultado = JSON.stringify(ultimo.content);
        const permitido = resultado.includes('"permitido":true');
        return {
          content: [{ type: "text", text: permitido ? `${nombre}: Está bien, les cuento lo que sé.` : `${nombre}: No tengo nada que decir sobre eso.` }],
          finishReason: { unified: "stop", raw: undefined },
          usage: uso,
          warnings: [],
        };
      }

      const textoUsuario = ultimo?.role === "user" ? ultimo.content.map((p) => (p.type === "text" ? p.text : "")).join(" ") : "";
      const clave = textoUsuario.match(/\[revelar:([a-z0-9_]+)\]/)?.[1];
      if (clave) {
        return {
          content: [{ type: "tool-call", toolCallId: `falso-${Date.now()}`, toolName: "revelar", input: JSON.stringify({ clave }) }],
          finishReason: { unified: "tool-calls", raw: undefined },
          usage: uso,
          warnings: [],
        };
      }
      return {
        content: [{ type: "text", text: `${nombre}: Respuesta de prueba.` }],
        finishReason: { unified: "stop", raw: undefined },
        usage: uso,
        warnings: [],
      };
    },
  });
}
