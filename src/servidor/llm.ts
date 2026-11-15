import { google } from "@ai-sdk/google";
import { APICallError, RetryError, type LanguageModel } from "ai";

/**
 * Modelos para los interrogatorios, en orden de preferencia.
 * Si el principal no responde a tiempo (o falla), se prueba el siguiente.
 * Variables: GOOGLE_GENERATIVE_AI_API_KEY, y opcionales MODELO_LLM y MODELO_LLM_RESPALDO.
 */
export interface OpcionModelo {
  modelo: LanguageModel;
  nombre: string;
  timeoutMs: number;
  providerOptions?: Record<string, Record<string, never> | Record<string, unknown>>;
}

/** `falso`: casos de autor sin publicar (ADR 0012), que se prueban sin gastar la cuota compartida. */
export async function modelosInterrogatorio({ falso = false } = {}): Promise<OpcionModelo[] | null> {
  if (falso || process.env.LLM_FALSO === "1") {
    const { modeloFalso } = await import("./llmFalso");
    return [{ modelo: modeloFalso(), nombre: "falso", timeoutMs: 5000 }];
  }
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) return null;
  // el lite responde en 1-3 s de forma estable; el flash es mejor actor pero en el plan gratis tarda 10-30 s
  const principal = process.env.MODELO_LLM ?? "gemini-3.1-flash-lite";
  const respaldo = process.env.MODELO_LLM_RESPALDO ?? "gemini-3.5-flash";
  return [
    { modelo: google(principal), nombre: principal, timeoutMs: 20000 },
    {
      modelo: google(respaldo),
      nombre: respaldo,
      timeoutMs: 35000,
      providerOptions: { google: { thinkingConfig: { thinkingLevel: "low" } } },
    },
  ];
}

/** El proveedor rechazó el pedido por cuota (429). Puede venir envuelto en el RetryError de los reintentos. */
export function esCuotaAgotada(e: unknown): boolean {
  const error = RetryError.isInstance(e) ? e.lastError : e;
  return APICallError.isInstance(error) && error.statusCode === 429;
}
