"use client";

import { useState } from "react";
import { precargar, sintetizar } from "@/cliente/piper";
import { vozPiper, type VozPersonaje } from "@/cliente/voces";

type Personaje = { id: string; caso: string; nombre: string; rol: string; voz: VozPersonaje };

const FRASE = "Ya le dije todo lo que sé, detective. Esa noche no subí al sexto piso.";

export function Probador({ personajes }: { personajes: Personaje[] }) {
  const [frase, setFrase] = useState(FRASE);
  const [estado, setEstado] = useState<Record<string, string>>({});
  const [audios, setAudios] = useState<Record<string, string>>({});

  async function probar(p: Personaje) {
    const decir = (texto: string) => setEstado((e) => ({ ...e, [p.id]: texto }));
    const voz = vozPiper(p.voz);
    decir("Generando…");
    const inicio = performance.now();
    try {
      // el progreso solo llega si el modelo no estaba guardado en este navegador
      await precargar([voz.modelo], (f) => f < 1 && decir(`Bajando el modelo de esta voz (solo la primera vez): ${Math.round(f * 100)}%`));
      decir("Generando…");
      const audio = await sintetizar(frase, voz);
      setAudios((a) => ({ ...a, [p.id]: URL.createObjectURL(audio) }));
      setEstado((e) => ({ ...e, [p.id]: `Listo en ${((performance.now() - inicio) / 1000).toFixed(1)} s` }));
    } catch (err) {
      setEstado((e) => ({ ...e, [p.id]: `Error: ${err instanceof Error ? err.message : err}` }));
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="font-titulo text-4xl">Voces</h1>
      <p className="mt-2 text-sm text-suave">
        Piper en el navegador, con el modelo que le toca a cada personaje según su género y edad, y su velocidad. Hay cuatro modelos (entre 60 y 115 MB cada uno) y varios personajes comparten el mismo: cada modelo se baja una sola vez y queda guardado en este navegador.
      </p>
      <textarea value={frase} onChange={(e) => setFrase(e.target.value)} rows={2} className="mt-4 w-full rounded-xl border border-borde bg-panel p-3" aria-label="Frase de prueba" />
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {personajes.map((p) => (
          <div key={p.id} className="rounded-xl border border-borde bg-panel p-4" data-personaje={p.id}>
            <p className="font-titulo text-lg">{p.nombre}</p>
            <p className="text-xs text-suave">
              {p.rol} · {p.voz.genero}, {p.voz.edad}, velocidad {p.voz.velocidad}
            </p>
            <p className="mt-1 font-mono text-[11px] text-suave">{vozPiper(p.voz).modelo.split("/").at(-1)}</p>
            <button onClick={() => probar(p)} className="mt-3 rounded-lg bg-acento px-3 py-1.5 text-sm font-semibold text-acento-texto">
              Generar
            </button>
            {estado[p.id] && <p className="mt-2 text-xs text-suave" role="status">{estado[p.id]}</p>}
            {audios[p.id] && <audio controls src={audios[p.id]} className="mt-2 w-full" />}
          </div>
        ))}
      </div>
      <p className="mt-8 text-xs text-suave">
        Voces de rhasspy/piper-voices: Daniela (es_AR, CC BY-SA 4.0), Claude y Ald (es_MX), Davefx (es_ES, CC0).
      </p>
    </main>
  );
}
