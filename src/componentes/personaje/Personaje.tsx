"use client";

import { useEffect, useState } from "react";
import type { AparienciaPublica } from "@/motor/apariencia";
import type { MensajeInterrogatorio } from "@/motor/tipos";
import { usePersonajeSonando } from "../Voces";
import { PersonajeRetrato } from "./PersonajeRetrato";
import { PersonajeVectorial } from "./PersonajeVectorial";

/** Dibuja al personaje como lo trae el caso: retratos si los hay, si no vectorial. */
export function Personaje({ id, apariencia, nombre, mensajes, previos }: { id: string; apariencia: AparienciaPublica; nombre: string; mensajes: MensajeInterrogatorio[]; previos: Set<string> }) {
  const ultima = mensajes.findLast((m) => m.de === "personaje");
  const emocion = ultima?.emocion ?? "neutral";
  const hablando = useHablando(id, ultima, previos);
  return apariencia.retratos ? (
    <PersonajeRetrato imagenes={apariencia.retratos} emocion={emocion} hablando={hablando} nombre={nombre} />
  ) : (
    <PersonajeVectorial rasgos={apariencia.rasgos} emocion={emocion} hablando={hablando} nombre={nombre} />
  );
}

/** Habla mientras se escribe su última respuesta (si es nueva) o mientras suena su voz. */
function useHablando(personajeId: string, ultima: MensajeInterrogatorio | undefined, previos: Set<string>) {
  const sonando = usePersonajeSonando();
  const nueva = ultima && !previos.has(ultima.id) ? ultima : undefined;
  const [escrita, setEscrita] = useState<string | null>(null);
  const nuevaId = nueva?.id;
  const largo = nueva?.texto.length ?? 0;
  useEffect(() => {
    if (!nuevaId) return;
    // lo que tarda Maquina en escribirla: hasta 120 pasos de 20 ms
    const t = setTimeout(() => setEscrita(nuevaId), Math.min(largo, 120) * 20 + 200);
    return () => clearTimeout(t);
  }, [nuevaId, largo]);
  return sonando === personajeId || (!!nuevaId && escrita !== nuevaId);
}
