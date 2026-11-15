"use client";

import { useEffect, useId, useState } from "react";
import { EMOCIONES, type Emocion } from "./emociones";

/** Rasgos que un caso define por personaje. Todos tienen valores por defecto. */
export interface Rasgos {
  piel: string;
  pelo: string;
  peinado: "corto" | "entradas" | "calvo" | "largo";
  bigote: boolean;
  barba: boolean;
  anteojos: boolean;
  arrugas: number; // 0 a 1
  traje: string;
  camisa: string;
  corbata: string | null;
  accesorio: "vapeador" | "cigarrillo" | null;
}

export const RASGOS_POR_DEFECTO: Rasgos = {
  piel: "#d9a77f",
  pelo: "#3b2f2a",
  peinado: "corto",
  bigote: false,
  barba: false,
  anteojos: false,
  arrugas: 0.2,
  traje: "#3a3d44",
  camisa: "#e8e4da",
  corbata: "#7a1f1f",
  accesorio: null,
};

interface Pose {
  cejaIzq: { y: number; r: number };
  cejaDer: { y: number; r: number };
  parpado: number; // 0 abierto, 1 cerrado
  boca: keyof typeof BOCAS;
  mirada: { x: number; y: number };
  cabeza: { r: number; y: number };
  frente: number; // arrugas de la frente, 0 a 1
  sudor?: boolean;
  lagrima?: boolean;
}

const BOCAS = {
  neutral: "M182,241 Q200,244 218,241",
  apretada: "M184,241 Q200,241 216,241",
  sonrisa: "M182,240 Q206,247 222,236",
  triste: "M182,246 Q200,237 218,246",
  mueca: "M182,245 Q192,238 200,241 Q210,238 218,245",
  abierta: "M187,238 Q200,231 213,238 Q214,254 200,256 Q186,254 187,238 Z",
  media: "M186,240 Q200,236 214,240 Q212,248 200,249 Q188,248 186,240 Z",
  chica: "M190,240 Q200,238 210,240 Q208,245 200,246 Q192,245 190,240 Z",
} as const;

const POSES: Record<Emocion, Pose> = {
  neutral: { cejaIzq: { y: 0, r: 0 }, cejaDer: { y: 0, r: 0 }, parpado: 0.32, boca: "neutral", mirada: { x: 0, y: 0 }, cabeza: { r: 0, y: 0 }, frente: 0.2 },
  nervioso: { cejaIzq: { y: -3, r: -9 }, cejaDer: { y: -3, r: 9 }, parpado: 0.15, boca: "apretada", mirada: { x: -2, y: 1 }, cabeza: { r: 1, y: 0 }, frente: 0.7, sudor: true },
  enojado: { cejaIzq: { y: 4, r: 13 }, cejaDer: { y: 4, r: -13 }, parpado: 0.38, boca: "mueca", mirada: { x: 0, y: 0 }, cabeza: { r: 0, y: 3 }, frente: 0.3 },
  triste: { cejaIzq: { y: -2, r: -15 }, cejaDer: { y: -2, r: 15 }, parpado: 0.4, boca: "triste", mirada: { x: 0, y: 3 }, cabeza: { r: -3, y: 3 }, frente: 0.6 },
  sorprendido: { cejaIzq: { y: -9, r: 0 }, cejaDer: { y: -9, r: 0 }, parpado: 0, boca: "abierta", mirada: { x: 0, y: -1 }, cabeza: { r: 0, y: -3 }, frente: 1 },
  evasivo: { cejaIzq: { y: 1, r: 4 }, cejaDer: { y: -2, r: -2 }, parpado: 0.42, boca: "apretada", mirada: { x: 6, y: 1 }, cabeza: { r: 5, y: 0 }, frente: 0.3 },
  confiado: { cejaIzq: { y: 1, r: 3 }, cejaDer: { y: -6, r: -5 }, parpado: 0.45, boca: "sonrisa", mirada: { x: 0, y: 0 }, cabeza: { r: -3, y: -1 }, frente: 0.2 },
  quebrado: { cejaIzq: { y: -2, r: -17 }, cejaDer: { y: -2, r: 17 }, parpado: 0.58, boca: "triste", mirada: { x: 0, y: 4 }, cabeza: { r: -6, y: 6 }, frente: 0.8, lagrima: true },
};

const BOCAS_HABLANDO: (keyof typeof BOCAS)[] = ["media", "chica", "abierta", "chica", "media", "neutral"];

function oscurecer(hex: string, f: number) {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v * f)));
  return `rgb(${c(n >> 16)},${c((n >> 8) & 255)},${c(n & 255)})`;
}

/**
 * Personaje ilustrado en SVG, estilo novela gráfica noir.
 * Respira, parpadea, mira de reojo y mueve la boca mientras habla.
 */
export function PersonajeVectorial({
  rasgos: parciales,
  emocion = "neutral",
  hablando = false,
  impacto = 0,
}: {
  rasgos?: Partial<Rasgos>;
  emocion?: Emocion;
  hablando?: boolean;
  /** cambiá este número para disparar el acercamiento de cámara (por ejemplo, en una confesión) */
  impacto?: number;
}) {
  const r = { ...RASGOS_POR_DEFECTO, ...parciales };
  const pose = POSES[emocion];
  const id = useId().replace(/:/g, "");
  const [parpadeo, setParpadeo] = useState(false);
  const [vistazo, setVistazo] = useState({ x: 0, y: 0 });
  const [bocaHablando, setBocaHablando] = useState(0);

  // parpadeo a intervalos irregulares, como una persona
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const ciclo = () => {
      t = setTimeout(() => {
        setParpadeo(true);
        setTimeout(() => setParpadeo(false), 130);
        ciclo();
      }, 2200 + Math.random() * 3800);
    };
    ciclo();
    return () => clearTimeout(t);
  }, []);

  // miradas de reojo; los nerviosos y evasivos miran más seguido
  useEffect(() => {
    const frecuencia = emocion === "nervioso" || emocion === "evasivo" ? 1400 : 3800;
    const id = setInterval(() => {
      const mira = Math.random() < 0.55;
      setVistazo(mira ? { x: (Math.random() - 0.5) * 8, y: (Math.random() - 0.5) * 3 } : { x: 0, y: 0 });
    }, frecuencia + Math.random() * 800);
    return () => clearInterval(id);
  }, [emocion]);

  // la boca se mueve mientras habla
  useEffect(() => {
    if (!hablando) return;
    const id = setInterval(() => setBocaHablando((b) => (b + 1 + Math.floor(Math.random() * 2)) % BOCAS_HABLANDO.length), 105);
    return () => clearInterval(id);
  }, [hablando]);

  const boca = hablando && emocion !== "sorprendido" ? BOCAS_HABLANDO[bocaHablando] : pose.boca;
  const parpado = parpadeo ? 1 : pose.parpado;
  const mx = pose.mirada.x + vistazo.x;
  const my = pose.mirada.y + vistazo.y;
  const sombraPiel = oscurecer(r.piel, 0.78);
  const trans = "transform 0.4s cubic-bezier(0.3, 0.8, 0.3, 1)";
  const caja = { transformBox: "fill-box" as const, transformOrigin: "center", transition: trans };

  return (
    <div key={impacto} className={impacto ? "personaje-impacto" : ""} style={{ width: "100%", aspectRatio: "4 / 5" }}>
      <svg viewBox="60 62 280 350" className="h-full w-full" role="img" aria-label={`Personaje, expresión ${emocion}`}>
        <defs>
          <radialGradient id={`lampara-${id}`} cx="50%" cy="0%" r="85%">
            <stop offset="0%" stopColor="#f7e7b4" stopOpacity="0.55" />
            <stop offset="45%" stopColor="#7d6a45" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#000" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`sombra-${id}`} x1="0" x2="1">
            <stop offset="0%" stopColor="#000" stopOpacity="0" />
            <stop offset="48%" stopColor="#000" stopOpacity="0.05" />
            <stop offset="56%" stopColor="#000" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#000" stopOpacity="0.78" />
          </linearGradient>
          <clipPath id={`ojoI-${id}`}>
            <ellipse cx="173" cy="167" rx="13" ry="7.5" />
          </clipPath>
          <clipPath id={`ojoD-${id}`}>
            <ellipse cx="227" cy="167" rx="13" ry="7.5" />
          </clipPath>
          <clipPath id={`cara-${id}`}>
            <path d="M136,150 Q136,94 200,90 Q264,94 264,150 L263,198 Q259,248 200,270 Q141,248 137,198 Z" />
          </clipPath>
        </defs>

        {/* sala de interrogatorio */}
        <rect width="400" height="500" fill="#0b0b0d" />
        <rect width="400" height="500" fill={`url(#lampara-${id})`} className="lampara-titila" />

        <g className="respirar">
          {/* cuerpo */}
          <path d="M30,500 Q40,350 146,318 L200,342 L254,318 Q360,350 370,500 Z" fill={r.traje} />
          <path d="M146,318 L178,410 L200,342 Z" fill={oscurecer(r.traje, 0.75)} />
          <path d="M254,318 L222,410 L200,342 Z" fill={oscurecer(r.traje, 0.6)} />
          <path d="M168,302 L200,346 L232,302 L228,284 L172,284 Z" fill={r.camisa} />
          {r.corbata && <path d="M193,318 L207,318 L213,410 L200,432 L187,410 Z" fill={r.corbata} />}
          <rect x="172" y="250" width="56" height="52" fill={sombraPiel} />

          {/* cabeza */}
          <g style={{ ...caja, transformOrigin: "50% 90%", transform: `rotate(${pose.cabeza.r}deg) translateY(${pose.cabeza.y}px)` }}>
            <g className="balanceo">
              <ellipse cx="136" cy="182" rx="10" ry="19" fill={sombraPiel} stroke="#1a1210" strokeWidth="2.5" />
              <ellipse cx="264" cy="182" rx="10" ry="19" fill={oscurecer(r.piel, 0.55)} stroke="#1a1210" strokeWidth="2.5" />
              <path d="M136,150 Q136,94 200,90 Q264,94 264,150 L263,198 Q259,248 200,270 Q141,248 137,198 Z" fill={r.piel} stroke="#1a1210" strokeWidth="3" strokeLinejoin="round" />

              {/* arrugas */}
              <g stroke={sombraPiel} strokeWidth="2" fill="none" strokeLinecap="round" style={{ opacity: Math.min(1, pose.frente * 0.6 + r.arrugas * 0.6), transition: "opacity 0.4s" }}>
                <path d="M165,124 Q200,118 235,124" />
                <path d="M170,133 Q200,128 230,133" />
              </g>
              <g stroke={sombraPiel} strokeWidth="1.6" fill="none" strokeLinecap="round" opacity={r.arrugas}>
                <path d="M152,170 L146,166 M152,174 L146,176" />
                <path d="M248,170 L254,166 M248,174 L254,176" />
                <path d="M163,180 Q173,184 183,180" />
                <path d="M217,180 Q227,184 237,180" />
                <path d="M178,218 Q172,236 180,250" />
                <path d="M222,218 Q228,236 220,250" />
              </g>

              {/* ojos */}
              {[
                { cx: 173, clip: `ojoI-${id}` },
                { cx: 227, clip: `ojoD-${id}` },
              ].map((o) => (
                <g key={o.cx} clipPath={`url(#${o.clip})`}>
                  <ellipse cx={o.cx} cy="167" rx="13" ry="7.5" fill="#f2ede4" />
                  <g style={{ transition: "transform 0.25s ease", transform: `translate(${mx}px, ${my}px)` }}>
                    <circle cx={o.cx} cy="167" r="5.6" fill="#2b2420" />
                    <circle cx={o.cx + 1.8} cy="165.2" r="1.4" fill="#fff" opacity="0.8" />
                  </g>
                  <rect x={o.cx - 15} y="150" width="30" height="17" fill={r.piel} style={{ transition: parpadeo ? "transform 0.06s" : "transform 0.3s", transform: `translateY(${-14 + parpado * 16}px)` }} />
                  <rect x={o.cx - 15} y="170" width="30" height="10" fill={r.piel} style={{ transition: "transform 0.3s", transform: `translateY(${4 - Math.min(parpado, 0.5) * 6}px)` }} />
                </g>
              ))}
              <g stroke="#1a1210" strokeWidth="2.2" fill="none" strokeLinecap="round">
                <path d="M159,161 Q173,153 187,161" />
                <path d="M213,161 Q227,153 241,161" />
              </g>
              <g stroke={sombraPiel} strokeWidth="1.8" fill="none" strokeLinecap="round" opacity={0.4 + r.arrugas * 0.6}>
                <path d="M162,177 Q173,182 184,177" />
                <path d="M216,177 Q227,182 238,177" />
              </g>
              {r.anteojos && (
                <g fill="none" stroke="#1a1a1a" strokeWidth="3">
                  <rect x="155" y="155" width="36" height="24" rx="6" />
                  <rect x="209" y="155" width="36" height="24" rx="6" />
                  <path d="M191,165 Q200,160 209,165" />
                </g>
              )}

              {/* cejas */}
              <path d="M157,151 Q172,142 189,148" stroke={oscurecer(r.pelo, 0.85)} strokeWidth="6.5" strokeLinecap="round" fill="none" style={{ ...caja, transform: `translateY(${pose.cejaIzq.y}px) rotate(${pose.cejaIzq.r}deg)` }} />
              <path d="M211,148 Q228,142 243,151" stroke={oscurecer(r.pelo, 0.85)} strokeWidth="6.5" strokeLinecap="round" fill="none" style={{ ...caja, transform: `translateY(${pose.cejaDer.y}px) rotate(${pose.cejaDer.r}deg)` }} />

              {/* nariz */}
              <path d="M201,160 L193,204 Q201,212 211,205" stroke={sombraPiel} strokeWidth="2.5" fill="none" strokeLinecap="round" />
              <path d="M201,160 L211,205 Q206,209 200,208 Z" fill={sombraPiel} opacity="0.35" />

              {/* boca y bigote */}
              <path
                d={BOCAS[boca]}
                fill={boca === "abierta" || boca === "media" || boca === "chica" ? "#3a1714" : "none"}
                stroke="#5a2a24"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {r.barba && <path d="M146,208 Q150,262 200,286 Q250,262 254,208 Q240,250 200,262 Q160,250 146,208 Z" fill={r.pelo} opacity="0.85" />}
              {r.bigote && <path d="M166,231 Q183,212 200,221 Q217,212 234,231 Q217,238 200,231 Q183,238 166,231 Z" fill={oscurecer(r.pelo, 0.85)} stroke="#1a1210" strokeWidth="2" />}

              {/* pelo */}
              {r.peinado !== "calvo" && (
                <path
                  d={
                    r.peinado === "entradas"
                      ? "M137,178 Q130,112 168,93 Q200,80 232,93 Q270,112 263,178 Q259,142 251,128 Q238,113 216,112 Q200,121 184,112 Q162,113 149,128 Q141,142 137,178 Z"
                      : r.peinado === "largo"
                        ? "M128,240 Q118,110 165,88 Q200,74 235,88 Q282,110 272,240 Q262,160 250,130 Q230,108 200,110 Q170,108 150,130 Q138,160 128,240 Z"
                        : "M137,172 Q128,104 168,88 Q200,76 232,88 Q272,104 263,172 Q260,130 246,118 Q224,106 200,108 Q176,106 154,118 Q140,130 137,172 Z"
                  }
                  fill={r.pelo}
                  stroke="#1a1210"
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                />
              )}
              {r.peinado === "calvo" && (
                <g fill={r.pelo}>
                  <path d="M137,182 Q134,150 146,134 Q141,160 144,188 Z" />
                  <path d="M263,182 Q266,150 254,134 Q259,160 256,188 Z" />
                </g>
              )}

              {/* sudor y lágrima */}
              {pose.sudor && <path className="gota" d="M246,128 Q252,140 246,146 Q240,140 246,128 Z" fill="#cfe3f2" opacity="0.85" />}
              {pose.lagrima && <path className="gota" d="M182,178 Q187,190 182,195 Q177,190 182,178 Z" fill="#cfe3f2" opacity="0.9" />}

              {/* luz dura de un costado: el sello noir */}
              <g clipPath={`url(#cara-${id})`}>
                <rect x="130" y="80" width="140" height="220" fill={`url(#sombra-${id})`} />
              </g>
            </g>
          </g>

          {/* accesorio */}
          {r.accesorio && (
            <g className="humo" opacity="0.5" fill="none" stroke="#cfd6d8" strokeWidth="5" strokeLinecap="round">
              <path d="M150,248 Q138,226 150,206 Q162,186 148,166" />
              <path d="M140,236 Q128,214 138,196" />
            </g>
          )}
        </g>

        {/* borde de la mesa */}
        <rect x="0" y="392" width="400" height="30" fill="#140f0b" />
        <rect x="0" y="390" width="400" height="3" fill="#3a2c20" />
      </svg>
    </div>
  );
}

export { EMOCIONES };
