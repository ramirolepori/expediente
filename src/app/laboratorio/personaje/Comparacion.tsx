"use client";

import { useState } from "react";
import { EMOCIONES, type Emocion } from "@/componentes/personaje/emociones";
import { PersonajeRetrato } from "@/componentes/personaje/PersonajeRetrato";
import { PersonajeVectorial, type Rasgos } from "@/componentes/personaje/PersonajeVectorial";
import { rasgosPara } from "@/motor/apariencia";

const ALBERTO: Partial<Rasgos> = {
  edad: "mayor",
  piel: "#cf9d78",
  pelo: "#9a958d",
  peinado: "entradas",
  vello: "bigote",
  arrugas: 0.75,
  colorRopa: "#4a4b4f",
  colorDetalle: "#ddd6c6",
  corbata: "#5a1c1c",
  accesorios: ["vapeador"],
};

/** Muestrario: tipos de cuerpo, edades, ropa, accesorios y animales. */
const EJEMPLOS: { titulo: string; rasgos: Partial<Rasgos> }[] = [
  {
    titulo: "Periodista",
    rasgos: { cuerpo: "femenino", piel: "#e0ac84", pelo: "#1f1915", peinado: "melena", labios: "#a3262e", ropa: "camisa", colorRopa: "#2d2d33", corbata: null, accesorios: ["aros"], arrugas: 0.1 },
  },
  { titulo: "Médica", rasgos: { cuerpo: "femenino", piel: "#8a5434", pelo: "#1f1915", peinado: "rodete", ropa: "delantal", colorRopa: "#3d5a78", corbata: null, anteojos: "redondos", arrugas: 0.25 } },
  {
    titulo: "Comisario",
    rasgos: {
      piel: "#c68a5e",
      pelo: "#2b2522",
      peinado: "corto",
      vello: "barba",
      ropa: "uniforme",
      colorRopa: "#24344d",
      corbata: "#1a1a1a",
      accesorios: ["gorra"],
      colorAccesorio: "#1d2a3e",
      arrugas: 0.35,
    },
  },
  {
    titulo: "Persona no binaria",
    rasgos: {
      cuerpo: "neutro",
      edad: "adolescente",
      piel: "#f1c9a5",
      pelo: "#4b3b5c",
      peinado: "rapado",
      ropa: "buzo",
      colorRopa: "#1f4a4a",
      colorDetalle: "#efe6cf",
      pecas: true,
      accesorios: ["aros"],
      colorAccesorio: "#c7c2b8",
    },
  },
  { titulo: "Adolescente", rasgos: { edad: "adolescente", piel: "#a86d45", pelo: "#1f1915", peinado: "rulos", ropa: "remera", colorRopa: "#7a6a55", corbata: null } },
  {
    titulo: "Nena",
    rasgos: { cuerpo: "femenino", edad: "nino", piel: "#f3d2b8", pelo: "#a5713e", peinado: "cola", ropa: "remera", colorRopa: "#8a3a4a", pecas: true, accesorios: ["moño"], colorAccesorio: "#d6dce4" },
  },
  {
    titulo: "Nene",
    rasgos: { edad: "nino", piel: "#6b3f26", pelo: "#1f1915", peinado: "corto", ropa: "buzo", colorRopa: "#3f4a3a", colorDetalle: "#efe6cf", accesorios: ["gorra"], colorAccesorio: "#a3262e" },
  },
  {
    titulo: "Bebé",
    rasgos: { edad: "bebe", piel: "#e0ac84", pelo: "#7d5532", peinado: "pelusa", ropa: "enterito", colorRopa: "#d6dce4", colorDetalle: "#3d5a78", accesorios: ["chupete"], colorAccesorio: "#5b8fc9" },
  },
  {
    titulo: "Abuela",
    rasgos: {
      cuerpo: "femenino",
      edad: "mayor",
      piel: "#f1c9a5",
      pelo: "#e2ded6",
      peinado: "rodete",
      ropa: "vestido",
      colorRopa: "#4b3b5c",
      anteojos: "rectangulares",
      arrugas: 0.85,
      accesorios: ["collar"],
      colorAccesorio: "#e8e4da",
    },
  },
  {
    titulo: "Abuelo",
    rasgos: {
      edad: "mayor",
      piel: "#c68a5e",
      pelo: "#c7c2b8",
      peinado: "calvo",
      vello: "bigote",
      ropa: "camisa",
      colorRopa: "#6b5a45",
      corbata: null,
      arrugas: 0.9,
      accesorios: ["baston", "sombrero"],
      colorAccesorio: "#3b2f2a",
    },
  },
  {
    titulo: "Empresario",
    rasgos: { piel: "#d9a77f", pelo: "#5a3b24", peinado: "entradas", vello: "candado", anteojos: "sol", colorRopa: "#2d2d33", corbata: "#5a4a1f", arrugas: 0.4, accesorios: ["cigarrillo"] },
  },
  { titulo: "Perro", rasgos: { especie: "perro", piel: "#b98a56", pelo: "#5a3b24", ojos: "#3a2414", accesorios: ["collar"], colorAccesorio: "#a3262e" } },
  { titulo: "Gato", rasgos: { especie: "gato", piel: "#9a958d", pelo: "#4a4642", ojos: "#8fae3a", accesorios: ["moño"], colorAccesorio: "#3d5a78" } },
  { titulo: "Loro", rasgos: { especie: "loro", piel: "#3f9a4a", pelo: "#d9b44a", ojos: "#d9b44a" } },
];

/** Dos personajes sin apariencia en el caso: salen de su voz y su edad, con colores según el id. */
const SIN_DATOS = [
  { titulo: "Sin datos: «testigo» (mujer, 45)", rasgos: rasgosPara({ id: "testigo", edad: 45, voz: { genero: "femenino", edad: "adulto", velocidad: 1 } }) },
  { titulo: "Sin datos: «portero» (hombre, mayor)", rasgos: rasgosPara({ id: "portero", voz: { genero: "masculino", edad: "mayor", velocidad: 1 } }) },
];

const FRASES: Partial<Record<Emocion, string>> = {
  neutral: "Lamento lo ocurrido, detective. Era una clienta exigente, pero educada.",
  nervioso: "Yo... no recuerdo haber subido a esa hora. La maestra la usa cualquiera.",
  enojado: "¿Me estás tomando examen, pibe? Mi trabajo es gerenciar, no pasear por los pisos.",
  confiado: "Usted no sabe en qué agujero se está metiendo, Varela.",
  evasivo: "Debió ser alguno de mantenimiento. Pregúntele al electricista.",
  quebrado: "Si no lo hacía yo, lo hacía otro. Y el otro no iba a ser mi hijo con una tarjeta.",
};

export function Comparacion({ imagenes, aurora }: { imagenes: Record<string, string>; aurora: { titulo: string; rasgos: Rasgos }[] }) {
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
        <h1 className="font-titulo text-3xl">Personajes</h1>
        <p className="mt-1 text-sm text-suave">
          Si el caso trae retratos se usan esos; si no, la plataforma dibuja un vectorial con los rasgos del caso (o con rasgos por defecto). Las emociones y el botón de hablar valen para todos.
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          {EMOCIONES.map((e) => (
            <button
              key={e}
              onClick={() => setEmocion(e)}
              className={`rounded-full border px-3 py-1.5 text-sm capitalize ${emocion === e ? "border-acento bg-acento text-acento-texto" : "border-borde bg-panel"}`}
            >
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

        <h2 className="mt-8 font-titulo text-2xl">Alberto Mansilla: dos estilos</h2>
        <div className="mt-3 grid gap-6 md:grid-cols-2">
          <section>
            <h2 className="mb-2 font-semibold">A. Vectorial animado</h2>
            <div className="overflow-hidden rounded-2xl border border-borde">
              <PersonajeVectorial rasgos={ALBERTO} emocion={emocion} hablando={hablando} impacto={impacto} nombre="Alberto Mansilla" />
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

        {[
          { titulo: "Variedad vectorial", testId: "muestrario", lista: [...EJEMPLOS, ...SIN_DATOS] },
          { titulo: "Hotel Aurora", testId: "aurora", lista: aurora },
        ].map((g) => (
          <section key={g.testId}>
            <h2 className="mt-10 font-titulo text-2xl">{g.titulo}</h2>
            <div data-testid={g.testId} className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {g.lista.map((e) => (
                <figure key={e.titulo}>
                  <div className="overflow-hidden rounded-xl border border-borde">
                    <PersonajeVectorial rasgos={e.rasgos} emocion={emocion} hablando={hablando} impacto={impacto} nombre={e.titulo} />
                  </div>
                  <figcaption className="mt-1 text-xs text-suave">{e.titulo}</figcaption>
                </figure>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
