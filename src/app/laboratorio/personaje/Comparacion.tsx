"use client";

import { useState } from "react";
import { EMOCIONES, type Emocion } from "@/componentes/personaje/emociones";
import { PersonajeRetrato } from "@/componentes/personaje/PersonajeRetrato";
import { PersonajeVectorial } from "@/componentes/personaje/PersonajeVectorial";

const ALBERTO = {
  piel: "#cf9d78",
  pelo: "#9a958d",
  peinado: "entradas" as const,
  bigote: true,
  arrugas: 0.75,
  traje: "#4a4b4f",
  camisa: "#ddd6c6",
  corbata: "#5a1c1c",
  accesorio: "vapeador" as const,
};

const FRASES: Partial<Record<Emocion, string>> = {
  neutral: "Lamento lo ocurrido, detective. Era una clienta exigente, pero educada.",
  nervioso: "Yo... no recuerdo haber subido a esa hora. La maestra la usa cualquiera.",
  enojado: "¿Me estás tomando examen, pibe? Mi trabajo es gerenciar, no pasear por los pisos.",
  confiado: "Usted no sabe en qué agujero se está metiendo, Varela.",
  evasivo: "Debió ser alguno de mantenimiento. Pregúntele al electricista.",
  quebrado: "Si no lo hacía yo, lo hacía otro. Y el otro no iba a ser mi hijo con una tarjeta.",
};

export function Comparacion({ imagenes }: { imagenes: Record<string, string> }) {
  const [emocion, setEmocion] = useState<Emocion>("neutral");
  const [hablando, setHablando] = useState(false);
  const [impacto, setImpacto] = useState(0);
  const hayRetratos = Object.keys(imagenes).length > 0;

  const hablar = () => {
    setHablando(true);
    setTimeout(() => setHablando(false), 3200);
  };

  return (
    <main data-ambientacion="noir" className="ambiente min-h-dvh px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <p className="text-xs uppercase tracking-[0.3em] text-acento">Laboratorio</p>
        <h1 className="font-titulo text-3xl">Alberto Mansilla: dos estilos</h1>
        <p className="mt-1 text-sm text-suave">Mismas emociones, mismas animaciones. Probá cada emoción, hacelo hablar y probá la confesión.</p>

        <div className="mt-5 flex flex-wrap gap-2">
          {EMOCIONES.map((e) => (
            <button key={e} onClick={() => setEmocion(e)} className={`rounded-full border px-3 py-1.5 text-sm capitalize ${emocion === e ? "border-acento bg-acento text-acento-texto" : "border-borde bg-panel"}`}>
              {e}
            </button>
          ))}
          <button onClick={hablar} className="rounded-full border border-borde bg-panel-2 px-3 py-1.5 text-sm">
            🗣️ Hacer hablar
          </button>
          <button
            onClick={() => {
              setEmocion("quebrado");
              setImpacto((i) => i + 1);
              hablar();
            }}
            className="rounded-full border border-acento px-3 py-1.5 text-sm text-acento"
          >
            💥 Confesión
          </button>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <section>
            <h2 className="mb-2 font-semibold">A. Vectorial animado</h2>
            <div className="overflow-hidden rounded-2xl border border-borde">
              <PersonajeVectorial rasgos={ALBERTO} emocion={emocion} hablando={hablando} impacto={impacto} />
            </div>
            <p className="mt-2 text-xs text-suave">Gratis, misma cara siempre, todo se anima (cejas, ojos, párpados, boca). Se ve ilustrado.</p>
          </section>
          <section>
            <h2 className="mb-2 font-semibold">B. Retratos realistas</h2>
            <div className="overflow-hidden rounded-2xl border border-borde">
              {hayRetratos ? (
                <PersonajeRetrato imagenes={imagenes} emocion={emocion} hablando={hablando} impacto={impacto} nombre="Alberto Mansilla" />
              ) : (
                <div className="flex aspect-[4/5] items-center justify-center p-8 text-center text-suave">Todavía no hay retratos generados.</div>
              )}
            </div>
            <p className="mt-2 text-xs text-suave">
              Imágenes generadas una vez por caso. Se ve más real; el movimiento es más sutil.
              {hayRetratos && ` Expresiones disponibles: ${Object.keys(imagenes).join(", ")}.`}
            </p>
          </section>
        </div>

        <p className="papel mt-6 rounded-sm p-4 text-lg">{FRASES[emocion] ?? "…"}</p>
      </div>
    </main>
  );
}
