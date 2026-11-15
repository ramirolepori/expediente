import { google } from "@ai-sdk/google";
import type { LanguageModel } from "ai";

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

export async function modelosInterrogatorio(): Promise<OpcionModelo[] | null> {
  if (process.env.LLM_FALSO === "1") {
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
