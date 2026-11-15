"use client";

import { useEffect, useState } from "react";
import type { Emocion } from "./emociones";

/**
 * Personaje con retratos (imágenes generadas una vez al escribir el caso).
 * Cambia de expresión con un fundido, respira, tiene deriva de cámara y la luz de la lámpara.
 * Si existe la imagen "hablando", alterna con ella mientras habla.
 */
export function PersonajeRetrato({
  imagenes,
  emocion = "neutral",
  hablando = false,
  impacto = 0,
  nombre,
}: {
  imagenes: Partial<Record<Emocion | "hablando", string>>;
  emocion?: Emocion;
  hablando?: boolean;
  impacto?: number;
  nombre: string;
}) {
  const [bocaAbierta, setBocaAbierta] = useState(false);
  const actual = imagenes[emocion] ? emocion : "neutral";

  useEffect(() => {
    if (!hablando || !imagenes.hablando || actual !== "neutral") return;
    const id = setInterval(() => setBocaAbierta((b) => !b), 140 + Math.random() * 60);
    return () => {
      clearInterval(id);
      setTimeout(() => setBocaAbierta(false), 0);
    };
  }, [hablando, imagenes.hablando, actual]);

  const visible = hablando && bocaAbierta && actual === "neutral" ? "hablando" : actual;

  return (
    <div key={impacto} className={`relative overflow-hidden bg-black ${impacto ? "personaje-impacto" : ""}`} style={{ width: "100%", aspectRatio: "4 / 5" }}>
      <div className={`absolute inset-0 retrato-deriva`}>
        <div className={`absolute inset-0 ${hablando ? "retrato-habla" : "retrato-respira"}`}>
          {Object.entries(imagenes).map(([clave, src]) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={clave}
              src={src}
              alt={clave === visible ? `${nombre}, expresión ${clave}` : ""}
              className="absolute inset-0 h-full w-full object-cover"
              style={{ opacity: clave === visible ? 1 : 0, transition: clave === "hablando" || visible === "hablando" ? "opacity 0.05s" : "opacity 0.45s ease" }}
            />
          ))}
        </div>
      </div>
      {/* luz de lámpara y viñeta */}
      <div className="lampara-titila pointer-events-none absolute inset-0" style={{ background: "radial-gradient(ellipse at 50% -10%, rgba(255,230,170,0.22), transparent 60%)" }} />
      <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.6) 100%)" }} />
    </div>
  );
}
