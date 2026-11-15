"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { RASGOS_POR_DEFECTO, type Rasgos } from "@/motor/apariencia";
import { EMOCIONES, type Emocion } from "./emociones";

export { EMOCIONES, RASGOS_POR_DEFECTO, type Rasgos };

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
const BOCA_RELLENA = new Set(["abierta", "media", "chica"]);
/** cuánto abre el pico el loro según la boca que tocaría */
const APERTURA_PICO: Partial<Record<keyof typeof BOCAS, number>> = { abierta: 1, media: 0.6, chica: 0.35, sonrisa: 0.15 };

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

/** Proporciones por edad: el cuerpo se achica y la cabeza crece en los más chicos. */
const PROPORCION: Record<Rasgos["edad"], { cuerpo: number; cabeza: number }> = {
  bebe: { cuerpo: 0.7, cabeza: 1.12 },
  nino: { cuerpo: 0.8, cabeza: 1.05 },
  adolescente: { cuerpo: 0.93, cabeza: 1 },
  adulto: { cuerpo: 1, cabeza: 1 },
  mayor: { cuerpo: 1, cabeza: 1 },
};

/** Silueta de la cabeza: contorno, borde de arriba y medio ancho (para acomodar pelo, orejas y sombreros). */
interface Cabeza {
  d: string;
  arriba: number;
  abajo: number; // mentón
  ancho: number;
  ojo: { rx: number; ry: number; iris: number };
  nariz: "larga" | "media" | "chica";
  boca: string; // transformación de la boca
}

function cabezaDe(r: Rasgos): Cabeza {
  if (r.especie === "perro")
    return { d: "M140,150 Q140,98 200,96 Q260,98 260,150 Q264,198 246,224 Q232,262 200,266 Q168,262 154,224 Q136,198 140,150 Z", arriba: 96, abajo: 266, ancho: 60, ojo: { rx: 11, ry: 10, iris: 8 }, nariz: "chica", boca: "translate(0 -2)" };
  if (r.especie === "gato")
    return { d: "M134,172 Q134,112 200,106 Q266,112 266,172 Q266,236 200,256 Q134,236 134,172 Z", arriba: 106, abajo: 256, ancho: 66, ojo: { rx: 12, ry: 10, iris: 12 }, nariz: "chica", boca: "translate(200 222) scale(0.7) translate(-200 -241)" };
  if (r.especie === "loro")
    return { d: "M148,182 Q142,102 200,94 Q258,102 252,182 Q248,240 200,262 Q152,240 148,182 Z", arriba: 94, abajo: 262, ancho: 54, ojo: { rx: 10, ry: 10, iris: 7 }, nariz: "chica", boca: "" };
  if (r.edad === "bebe")
    return { d: "M130,160 Q128,78 200,74 Q272,78 270,160 Q268,238 200,258 Q132,238 130,160 Z", arriba: 74, abajo: 258, ancho: 70, ojo: { rx: 12, ry: 10, iris: 7.5 }, nariz: "chica", boca: "translate(200 233) scale(0.75) translate(-200 -241)" };
  if (r.edad === "nino")
    return { d: "M134,155 Q133,86 200,82 Q267,86 266,155 Q265,230 200,262 Q135,230 134,155 Z", arriba: 82, abajo: 262, ancho: 66, ojo: { rx: 12.5, ry: 9, iris: 6.8 }, nariz: "chica", boca: "translate(200 237) scale(0.85) translate(-200 -241)" };
  const nariz = r.cuerpo === "femenino" || r.edad === "adolescente" ? "media" : "larga";
  const ojo = { rx: 13, ry: 7.5, iris: 6 };
  if (r.cuerpo === "femenino") return { d: "M138,150 Q138,94 200,90 Q262,94 262,150 L260,196 Q252,244 200,266 Q148,244 140,196 Z", arriba: 90, abajo: 266, ancho: 62, ojo, nariz, boca: "" };
  if (r.cuerpo === "neutro") return { d: "M137,150 Q137,94 200,90 Q263,94 263,150 L262,197 Q256,246 200,268 Q144,246 138,197 Z", arriba: 90, abajo: 268, ancho: 63, ojo, nariz, boca: "" };
  return { d: "M136,150 Q136,94 200,90 Q264,94 264,150 L263,198 Q259,248 200,270 Q141,248 137,198 Z", arriba: 90, abajo: 270, ancho: 64, ojo, nariz, boca: "" };
}

const PELO = {
  corto: "M137,172 Q128,104 168,88 Q200,76 232,88 Q272,104 263,172 Q260,130 246,118 Q224,106 200,108 Q176,106 154,118 Q140,130 137,172 Z",
  entradas: "M137,178 Q130,112 168,93 Q200,80 232,93 Q270,112 263,178 Q259,142 251,128 Q238,113 216,112 Q200,121 184,112 Q162,113 149,128 Q141,142 137,178 Z",
  largo: "M128,240 Q118,110 165,88 Q200,74 235,88 Q282,110 272,240 Q262,160 250,130 Q230,108 200,110 Q170,108 150,130 Q138,160 128,240 Z",
  melena: "M130,218 Q118,104 165,86 Q200,74 235,86 Q282,104 270,218 Q264,222 258,216 Q259,160 248,136 Q230,128 200,134 Q170,128 152,136 Q141,160 142,216 Q136,222 130,218 Z",
  recogido: "M137,168 Q131,100 170,90 Q200,82 230,90 Q269,100 263,168 Q259,124 240,112 Q200,102 160,112 Q141,124 137,168 Z",
};
/** pelo que cae detrás de la cabeza (se dibuja antes de la cara) */
const PELO_ATRAS: Partial<Record<Rasgos["peinado"], ReactNode>> = {
  largo: <path d="M126,230 Q116,110 200,84 Q284,110 274,230 Q278,300 262,322 L138,322 Q122,300 126,230 Z" />,
  cola: <path d="M246,104 Q300,118 294,200 Q292,252 268,266 Q284,200 260,138 Z" />,
  rodete: <circle cx="200" cy="80" r="22" />,
};
const RULOS = [175, 190, 210, 230, 250, 270, 290, 310, 330, 350, 365].map((g) => ({ x: 200 + 68 * Math.cos((g * Math.PI) / 180), y: 152 + 64 * Math.sin((g * Math.PI) / 180) }));

function canal(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return [n >> 16, (n >> 8) & 255, n & 255];
}
function oscurecer(hex: string, f: number) {
  const [r, g, b] = canal(hex).map((v) => Math.max(0, Math.min(255, Math.round(v * f))));
  return `rgb(${r},${g},${b})`;
}
function aclarar(hex: string, t: number) {
  const [r, g, b] = canal(hex).map((v) => Math.round(v + (255 - v) * t));
  return `rgb(${r},${g},${b})`;
}

function Mono({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <g transform={`translate(${x} ${y})`} fill={color} stroke="#1a1210" strokeWidth="1.5" strokeLinejoin="round">
      <path d="M0,0 L-15,-10 L-15,10 Z M0,0 L15,-10 L15,10 Z" />
      <circle r="4.5" />
    </g>
  );
}

/**
 * Personaje ilustrado en SVG, estilo novela gráfica noir: personas de cualquier edad y cuerpo, o animales.
 * Respira, parpadea, mira de reojo y mueve la boca (o el pico) mientras habla.
 */
export function PersonajeVectorial({
  rasgos: parciales,
  emocion = "neutral",
  hablando = false,
  impacto = 0,
  nombre = "Personaje",
}: {
  rasgos?: Partial<Rasgos>;
  emocion?: Emocion;
  hablando?: boolean;
  /** cambiá este número para disparar el acercamiento de cámara (por ejemplo, en una confesión) */
  impacto?: number;
  nombre?: string;
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

  const humano = r.especie === "humano";
  const tiene = (a: Rasgos["accesorios"][number]) => r.accesorios.includes(a);
  const cab = cabezaDe(r);
  const prop = humano ? PROPORCION[r.edad] : { cuerpo: 1, cabeza: 1 };
  // el mentón baja hasta dejar un cuello proporcionado al cuerpo (48 de alto en un adulto)
  const dy = humano ? 420 - 150 * prop.cuerpo - (270 + (cab.abajo - 270) * prop.cabeza) : { perro: 24, gato: 40, loro: 44 }[r.especie];
  const OY = 167;
  const { rx, ry, iris } = cab.ojo;

  const boca = hablando && emocion !== "sorprendido" ? BOCAS_HABLANDO[bocaHablando] : pose.boca;
  const parpado = parpadeo ? 1 : pose.parpado;
  const mx = pose.mirada.x + vistazo.x;
  const my = pose.mirada.y + vistazo.y;
  const sombraPiel = oscurecer(r.piel, 0.78);
  const colorParpado = r.especie === "loro" ? "#f4f1ea" : r.piel;
  const colorCeja = humano ? oscurecer(r.pelo, 0.85) : oscurecer(r.pelo, 0.7);
  const trans = "transform 0.4s cubic-bezier(0.3, 0.8, 0.3, 1)";
  const caja = { transformBox: "fill-box" as const, transformOrigin: "center", transition: trans };
  const sx = cab.ancho / 64;
  const sy = (180 - cab.arriba) / 90;
  const sobreCabeza = `translate(200 180) scale(${sx} ${sy}) translate(-200 -180)`;
  const hw = r.cuerpo === "femenino" ? 44 : r.cuerpo === "neutro" ? 49 : 54;
  const torso = `M${84 - hw},500 Q${94 - hw},350 ${200 - hw},318 Q200,310 ${200 + hw},318 Q${306 + hw},350 ${316 + hw},500 Z`;

  // la cabeza y el pelo de atrás comparten transformación, así se mueven juntos
  const enCabeza = (hijos: ReactNode) => (
    <g transform={`translate(0 ${dy}) translate(200 270) scale(${prop.cabeza}) translate(-200 -270)`}>
      <g style={{ transition: trans, transformBox: "view-box", transformOrigin: "200px 262px", transform: `rotate(${pose.cabeza.r}deg) translateY(${pose.cabeza.y}px)` }}>
        <g className="balanceo" style={{ transformBox: "view-box", transformOrigin: "200px 262px" }}>
          {hijos}
        </g>
      </g>
    </g>
  );

  return (
    <div key={impacto} className={impacto ? "personaje-impacto" : ""} style={{ width: "100%", aspectRatio: "4 / 5" }}>
      <svg viewBox="60 62 280 350" className="h-full w-full" role="img" aria-label={`${nombre}, expresión ${emocion}`}>
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
          {[173, 227].map((cx) => (
            <clipPath key={cx} id={`ojo${cx}-${id}`}>
              <ellipse cx={cx} cy={OY} rx={rx} ry={ry} />
            </clipPath>
          ))}
          <clipPath id={`cara-${id}`}>
            <path d={cab.d} />
          </clipPath>
        </defs>

        {/* sala de interrogatorio */}
        <rect width="400" height="500" fill="#0b0b0d" />
        <rect width="400" height="500" fill={`url(#lampara-${id})`} className="lampara-titila" />

        <g className="respirar">
          {humano && PELO_ATRAS[r.peinado] && enCabeza(<g transform={sobreCabeza} fill={oscurecer(r.pelo, 0.8)} stroke="#1a1210" strokeWidth="2.5">{PELO_ATRAS[r.peinado]}</g>)}

          {/* cuerpo */}
          <g transform={`translate(200 420) scale(${prop.cuerpo}) translate(-200 -420)`}>
            {humano ? (
              <Ropa r={r} torso={torso} piel={r.piel} />
            ) : r.especie === "loro" ? (
              <g>
                <path d="M128,500 Q122,370 168,316 Q200,300 232,316 Q278,370 272,500 Z" fill={r.piel} />
                <path d="M128,500 Q116,396 162,330 Q150,420 172,500 Z" fill={oscurecer(r.piel, 0.75)} />
                <path d="M272,500 Q284,396 238,330 Q250,420 228,500 Z" fill={oscurecer(r.piel, 0.55)} />
              </g>
            ) : (
              <g>
                <path d="M86,500 Q92,366 158,334 Q200,322 242,334 Q308,366 314,500 Z" fill={r.piel} />
                <path d="M170,336 Q200,440 230,336 Q200,348 170,336 Z" fill={aclarar(r.piel, 0.35)} />
              </g>
            )}
            {r.especie !== "loro" && <rect x={humano ? 200 - hw + 26 : 166} y="200" width={humano ? 2 * (hw - 26) : 68} height={humano ? 102 : 140} fill={humano ? sombraPiel : oscurecer(r.piel, 0.85)} />}
            {tiene("collar") &&
              (humano ? (
                <g>
                  <path d="M180,300 Q200,330 220,300" fill="none" stroke={r.colorAccesorio} strokeWidth="2.5" />
                  <circle cx="200" cy="329" r="4.5" fill={r.colorAccesorio} />
                </g>
              ) : (
                <g>
                  <path d="M164,300 Q200,316 236,300 L236,313 Q200,329 164,313 Z" fill={r.colorAccesorio} stroke="#1a1210" strokeWidth="2" />
                  <circle cx="200" cy="330" r="7" fill="#d9b44a" stroke="#1a1210" strokeWidth="1.5" />
                </g>
              ))}
            {tiene("moño") && !humano && <Mono x={200} y={318} color={r.colorAccesorio} />}
            {tiene("baston") && (
              <g>
                <path d="M298,336 Q298,314 314,314 Q330,314 330,336 L330,400" fill="none" stroke={r.colorAccesorio} strokeWidth="7" strokeLinecap="round" />
                <ellipse cx="330" cy="352" rx="11" ry="13" fill={r.piel} stroke="#1a1210" strokeWidth="2" />
              </g>
            )}
          </g>

          {/* cabeza */}
          {enCabeza(
            <>
              {/* lo que va detrás de la cara: orejas y cresta */}
              {humano && (
                <>
                  <ellipse cx={200 - cab.ancho} cy="182" rx="10" ry="19" fill={sombraPiel} stroke="#1a1210" strokeWidth="2.5" />
                  <ellipse cx={200 + cab.ancho} cy="182" rx="10" ry="19" fill={oscurecer(r.piel, 0.55)} stroke="#1a1210" strokeWidth="2.5" />
                </>
              )}
              {r.especie === "gato" &&
                [0, 1].map((i) => (
                  <g key={i} transform={i ? "translate(400 0) scale(-1 1)" : undefined}>
                    <path d="M140,148 L148,76 L192,112 Z" fill={i ? oscurecer(r.piel, 0.7) : r.piel} stroke="#1a1210" strokeWidth="2.5" strokeLinejoin="round" />
                    <path d="M151,136 L155,94 L181,115 Z" fill="#e3a0a0" />
                  </g>
                ))}
              {r.especie === "loro" && <path d="M184,100 Q174,70 196,60 Q194,80 200,96 Z M200,96 Q206,64 226,64 Q212,82 212,100 Z" fill={r.pelo} stroke="#1a1210" strokeWidth="2" />}

              <path d={cab.d} fill={r.piel} stroke="#1a1210" strokeWidth="3" strokeLinejoin="round" />

              {/* marcas de la cara: manchas, hocico, máscara */}
              {r.especie === "perro" && (
                <>
                  <ellipse cx="229" cy="158" rx="22" ry="18" fill={r.pelo} opacity="0.85" />
                  <ellipse cx="200" cy="226" rx="36" ry="30" fill={aclarar(r.piel, 0.35)} />
                </>
              )}
              {r.especie === "gato" && (
                <>
                  <path d="M190,112 l2,18 M200,110 v20 M210,112 l-2,18" stroke={r.pelo} strokeWidth="4" strokeLinecap="round" />
                  <ellipse cx="189" cy="214" rx="13" ry="10" fill={aclarar(r.piel, 0.4)} />
                  <ellipse cx="211" cy="214" rx="13" ry="10" fill={aclarar(r.piel, 0.4)} />
                </>
              )}
              {r.especie === "loro" && [173, 227].map((cx) => <ellipse key={cx} cx={cx} cy={OY} rx="22" ry="18" fill="#f4f1ea" />)}
              {humano && (r.edad === "bebe" || r.edad === "nino") && [160, 240].map((cx) => <ellipse key={cx} cx={cx} cy="206" rx="12" ry="7" fill="#e8806f" opacity="0.3" />)}
              {r.pecas && (
                <g fill={oscurecer(r.piel, 0.68)}>
                  {[[166, 196], [174, 202], [158, 202], [234, 196], [226, 202], [242, 202], [182, 196], [218, 196]].map(([x, y]) => (
                    <circle key={`${x}-${y}`} cx={x} cy={y} r="1.7" />
                  ))}
                </g>
              )}

              {/* arrugas */}
              <g stroke={sombraPiel} strokeWidth="2" fill="none" strokeLinecap="round" style={{ opacity: Math.min(1, pose.frente * 0.6 + r.arrugas * 0.6), transition: "opacity 0.4s" }}>
                <path d="M165,124 Q200,118 235,124" />
                <path d="M170,133 Q200,128 230,133" />
              </g>
              {humano && (
                <g stroke={sombraPiel} strokeWidth="1.6" fill="none" strokeLinecap="round" opacity={r.arrugas}>
                  <path d="M152,170 L146,166 M152,174 L146,176" />
                  <path d="M248,170 L254,166 M248,174 L254,176" />
                  <path d="M163,180 Q173,184 183,180" />
                  <path d="M217,180 Q227,184 237,180" />
                  <path d="M178,218 Q172,236 180,250" />
                  <path d="M222,218 Q228,236 220,250" />
                </g>
              )}

              {/* ojos */}
              {r.sombra && [173, 227].map((cx) => <ellipse key={cx} cx={cx} cy={OY - ry - 2} rx={rx + 2} ry="6" fill={r.sombra!} opacity="0.55" />)}
              {[173, 227].map((cx) => (
                <g key={cx} clipPath={`url(#ojo${cx}-${id})`}>
                  <ellipse cx={cx} cy={OY} rx={rx} ry={ry} fill="#f2ede4" />
                  <g style={{ transition: "transform 0.25s ease", transform: `translate(${mx}px, ${my}px)` }}>
                    <circle cx={cx} cy={OY} r={iris} fill={r.ojos} />
                    {r.especie === "gato" ? <ellipse cx={cx} cy={OY} rx="2.4" ry={ry * 0.85} fill="#120d0b" /> : <circle cx={cx} cy={OY} r={iris * 0.55} fill="#120d0b" />}
                    <circle cx={cx + iris * 0.32} cy={OY - iris * 0.32} r={iris * 0.24} fill="#fff" opacity="0.8" />
                  </g>
                  <rect x={cx - rx - 2} y={OY - 3 * ry - 1} width={2 * rx + 4} height={2 * ry} fill={colorParpado} style={{ transition: parpadeo ? "transform 0.06s" : "transform 0.3s", transform: `translateY(${parpado * (2 * ry + 1)}px)` }} />
                  <rect x={cx - rx - 2} y={OY + ry - 1} width={2 * rx + 4} height={2 * ry} fill={colorParpado} style={{ transition: "transform 0.3s", transform: `translateY(${-Math.min(parpado, 0.5) * ry * 0.7}px)` }} />
                </g>
              ))}
              <g stroke="#1a1210" strokeWidth="2.2" fill="none" strokeLinecap="round">
                {[173, 227].map((cx) => (
                  <path key={cx} d={`M${cx - rx - 1},${OY - ry * 0.8} Q${cx},${OY - ry - 6.5} ${cx + rx + 1},${OY - ry * 0.8}`} />
                ))}
                {humano && r.cuerpo === "femenino" && r.edad !== "bebe" && <path d={`M${173 - rx - 1},${OY - ry * 0.8} l-5,-4 M${227 + rx + 1},${OY - ry * 0.8} l5,-4`} />}
              </g>
              {humano && (
                <g stroke={sombraPiel} strokeWidth="1.8" fill="none" strokeLinecap="round" opacity={0.25 + r.arrugas * 0.75}>
                  <path d="M162,177 Q173,182 184,177" />
                  <path d="M216,177 Q227,182 238,177" />
                </g>
              )}
              {r.anteojos === "redondos" && (
                <g fill="none" stroke="#1a1a1a" strokeWidth="3">
                  <circle cx="173" cy={OY} r="17" />
                  <circle cx="227" cy={OY} r="17" />
                  <path d={`M190,${OY - 2} Q200,${OY - 7} 210,${OY - 2}`} />
                </g>
              )}
              {(r.anteojos === "rectangulares" || r.anteojos === "sol") && (
                <g fill={r.anteojos === "sol" ? "#111" : "none"} fillOpacity="0.88" stroke="#1a1a1a" strokeWidth="3">
                  <rect x="155" y={OY - 12} width="36" height="24" rx="6" />
                  <rect x="209" y={OY - 12} width="36" height="24" rx="6" />
                  <path d={`M191,${OY - 2} Q200,${OY - 7} 209,${OY - 2}`} fill="none" />
                </g>
              )}

              {/* cejas */}
              <path d="M157,151 Q172,142 189,148" stroke={colorCeja} strokeWidth={humano ? (r.edad === "bebe" ? 3.5 : 6.5) : 4.5} strokeLinecap="round" fill="none" style={{ ...caja, transform: `translateY(${pose.cejaIzq.y}px) rotate(${pose.cejaIzq.r}deg)` }} />
              <path d="M211,148 Q228,142 243,151" stroke={colorCeja} strokeWidth={humano ? (r.edad === "bebe" ? 3.5 : 6.5) : 4.5} strokeLinecap="round" fill="none" style={{ ...caja, transform: `translateY(${pose.cejaDer.y}px) rotate(${pose.cejaDer.r}deg)` }} />

              {/* nariz */}
              {humano && cab.nariz === "larga" && (
                <>
                  <path d="M201,160 L193,204 Q201,212 211,205" stroke={sombraPiel} strokeWidth="2.5" fill="none" strokeLinecap="round" />
                  <path d="M201,160 L211,205 Q206,209 200,208 Z" fill={sombraPiel} opacity="0.35" />
                </>
              )}
              {humano && cab.nariz === "media" && <path d="M201,176 L195,203 Q201,209 209,204" stroke={sombraPiel} strokeWidth="2.5" fill="none" strokeLinecap="round" />}
              {humano && cab.nariz === "chica" && <path d="M194,200 Q201,206 208,200" stroke={sombraPiel} strokeWidth="2.5" fill="none" strokeLinecap="round" />}
              {r.especie === "perro" && (
                <>
                  <ellipse cx="200" cy="206" rx="13" ry="9" fill="#1a1210" />
                  <path d="M200,215 L200,236" stroke="#1a1210" strokeWidth="2.5" />
                </>
              )}
              {r.especie === "gato" && (
                <>
                  <path d="M193,201 L207,201 L200,209 Z" fill="#d98a8a" stroke="#1a1210" strokeWidth="1.5" strokeLinejoin="round" />
                  <path d="M178,212 L140,204 M178,218 L138,222 M222,212 L260,204 M222,218 L262,222" stroke="#e8e2d6" strokeWidth="1.6" strokeLinecap="round" opacity="0.8" />
                </>
              )}

              {/* boca, pico o chupete */}
              {r.especie === "loro" ? (
                <g stroke="#1a1210" strokeWidth="2" strokeLinejoin="round">
                  <path d="M184,212 Q200,220 214,212 Q212,232 200,238 Q188,232 184,212 Z" fill="#4a443e" style={{ transition: "transform 0.1s", transform: `translateY(${(APERTURA_PICO[boca] ?? 0) * 9}px)` }} />
                  <path d="M178,190 Q200,174 222,190 Q228,222 204,248 Q208,226 200,216 Q188,212 178,190 Z" fill="#2e2a26" />
                </g>
              ) : tiene("chupete") && humano ? (
                <g transform={cab.boca}>
                  <ellipse cx="200" cy="241" rx="17" ry="10" fill={r.colorAccesorio} stroke="#1a1210" strokeWidth="2" />
                  <circle cx="200" cy="246" r="6" fill="none" stroke={oscurecer(r.colorAccesorio, 0.7)} strokeWidth="3" />
                </g>
              ) : (
                <path
                  d={BOCAS[boca]}
                  transform={cab.boca}
                  fill={BOCA_RELLENA.has(boca) ? "#3a1714" : "none"}
                  stroke={r.labios ?? (humano ? "#5a2a24" : "#1a1210")}
                  strokeWidth={r.labios ? 4.5 : 3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
              {humano && r.vello === "barba" && <path d="M146,208 Q150,262 200,286 Q250,262 254,208 Q240,250 200,262 Q160,250 146,208 Z" fill={r.pelo} opacity="0.85" />}
              {humano && r.vello === "barba_corta" && <path d="M142,200 Q148,264 200,282 Q252,264 258,200 Q246,252 200,262 Q154,252 142,200 Z" fill={r.pelo} opacity="0.3" />}
              {humano && r.vello === "candado" && <path d="M186,252 Q200,262 214,252 Q212,270 200,274 Q188,270 186,252 Z" fill={oscurecer(r.pelo, 0.85)} stroke="#1a1210" strokeWidth="1.5" />}
              {humano && (r.vello === "bigote" || r.vello === "candado") && (
                <path d="M166,231 Q183,212 200,221 Q217,212 234,231 Q217,238 200,231 Q183,238 166,231 Z" fill={oscurecer(r.pelo, 0.85)} stroke="#1a1210" strokeWidth="2" />
              )}
              {humano && tiene("aros") &&
                [200 - cab.ancho, 200 + cab.ancho].map((x) => <circle key={x} cx={x} cy="204" r="5" fill="none" stroke={r.colorAccesorio} strokeWidth="2.5" />)}

              {/* pelo y lo que va sobre la cabeza */}
              <g transform={sobreCabeza}>
                {humano && <Peinado r={r} />}
                {tiene("moño") && humano && <Mono x={240} y={102} color={r.colorAccesorio} />}
                {tiene("gorra") && (
                  <g stroke="#1a1210" strokeWidth="2.5" strokeLinejoin="round">
                    <path d="M136,138 Q136,80 200,76 Q264,80 264,138 Z" fill={r.colorAccesorio} />
                    <ellipse cx="200" cy="138" rx="74" ry="10" fill={oscurecer(r.colorAccesorio, 0.7)} />
                  </g>
                )}
                {tiene("sombrero") && (
                  <g stroke="#1a1210" strokeWidth="2.5" strokeLinejoin="round">
                    <ellipse cx="200" cy="120" rx="98" ry="15" fill={oscurecer(r.colorAccesorio, 0.8)} />
                    <path d="M148,120 Q146,74 200,70 Q254,74 252,120 Z" fill={r.colorAccesorio} />
                    <path d="M148,106 Q200,112 252,106 L252,118 Q200,124 148,118 Z" fill="#1a1210" opacity="0.7" stroke="none" />
                  </g>
                )}
              </g>

              {r.especie === "perro" &&
                [0, 1].map((i) => (
                  <path key={i} transform={i ? "translate(400 0) scale(-1 1)" : undefined} d="M150,110 Q112,104 104,166 Q100,214 126,224 Q142,196 148,150 Z" fill={i ? oscurecer(r.pelo, 0.75) : r.pelo} stroke="#1a1210" strokeWidth="2.5" strokeLinejoin="round" />
                ))}

              {/* sudor y lágrima */}
              {pose.sudor && <path className="gota" d="M246,128 Q252,140 246,146 Q240,140 246,128 Z" fill="#cfe3f2" opacity="0.85" />}
              {pose.lagrima && <path className="gota" d="M182,178 Q187,190 182,195 Q177,190 182,178 Z" fill="#cfe3f2" opacity="0.9" />}

              {/* luz dura de un costado: el sello noir */}
              <g clipPath={`url(#cara-${id})`}>
                <rect x="120" y="60" width="160" height="240" fill={`url(#sombra-${id})`} />
              </g>
            </>,
          )}

          {/* humo del cigarrillo o el vapeador */}
          {humano && tiene("cigarrillo") && (
            <g transform={`translate(0 ${dy})`}>
              <path d="M214,244 L238,252" stroke="#eee" strokeWidth="4" strokeLinecap="round" />
              <circle cx="239" cy="252" r="2.5" fill="#e25b2a" />
            </g>
          )}
          {humano && (tiene("cigarrillo") || tiene("vapeador")) && (
            <g className="humo" opacity="0.5" fill="none" stroke="#cfd6d8" strokeWidth="5" strokeLinecap="round" transform={`translate(0 ${dy})`}>
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

function Peinado({ r }: { r: Rasgos }) {
  const trazo = { fill: r.pelo, stroke: "#1a1210", strokeWidth: 2.5, strokeLinejoin: "round" as const };
  switch (r.peinado) {
    case "calvo":
      return (
        <g fill={r.pelo}>
          <path d="M137,182 Q134,150 146,134 Q141,160 144,188 Z" />
          <path d="M263,182 Q266,150 254,134 Q259,160 256,188 Z" />
        </g>
      );
    case "pelusa":
      return <path d="M186,84 q4,-14 13,-5 M200,80 q6,-14 14,-3 M174,92 q2,-11 11,-7" fill="none" stroke={r.pelo} strokeWidth="3.5" strokeLinecap="round" />;
    case "rapado":
      return <path d={PELO.corto} {...trazo} opacity="0.55" />;
    case "rulos":
      return (
        <g {...trazo}>
          <path d={PELO.corto} />
          {RULOS.map((p) => (
            <circle key={`${p.x}`} cx={p.x} cy={p.y} r="17" />
          ))}
        </g>
      );
    case "rodete":
    case "cola":
      return <path d={PELO.recogido} {...trazo} />;
    default:
      return <path d={PELO[r.peinado]} {...trazo} />;
  }
}

function Ropa({ r, torso, piel }: { r: Rasgos; torso: string; piel: string }) {
  const c = r.colorRopa;
  const borde = { stroke: "#1a1210", strokeWidth: 2, strokeLinejoin: "round" as const };
  const corbata = r.corbata && <path d="M193,318 L207,318 L213,410 L200,432 L187,410 Z" fill={r.corbata} />;
  switch (r.ropa) {
    case "traje":
      return (
        <g>
          <path d={torso} fill={c} />
          <path d="M146,318 L178,410 L200,342 Z" fill={oscurecer(c, 0.75)} />
          <path d="M254,318 L222,410 L200,342 Z" fill={oscurecer(c, 0.6)} />
          <path d="M168,302 L200,346 L232,302 L228,284 L172,284 Z" fill={r.colorDetalle} />
          {corbata}
        </g>
      );
    case "camisa":
    case "uniforme":
      return (
        <g>
          <path d={torso} fill={c} />
          <path d="M200,326 L200,500" stroke={oscurecer(c, 0.7)} strokeWidth="2" />
          {corbata}
          <path d="M172,296 L200,328 L186,340 L164,310 Z M228,296 L200,328 L214,340 L236,310 Z" fill={oscurecer(c, 0.9)} {...borde} />
          {r.ropa === "uniforme" && (
            <g {...borde}>
              <rect x="128" y="318" width="34" height="10" rx="3" fill={oscurecer(c, 0.7)} />
              <rect x="238" y="318" width="34" height="10" rx="3" fill={oscurecer(c, 0.7)} />
              <path d="M240,362 L252,356 L264,362 L262,378 L252,386 L242,378 Z" fill={r.colorAccesorio} />
            </g>
          )}
        </g>
      );
    case "remera":
    case "enterito":
      return (
        <g>
          <path d={torso} fill={c} />
          <path d="M174,302 Q200,330 226,302 Z" fill={oscurecer(piel, 0.78)} />
          <path d="M174,303 Q200,330 226,303" fill="none" stroke={r.ropa === "enterito" ? r.colorDetalle : oscurecer(c, 0.7)} strokeWidth={r.ropa === "enterito" ? 6 : 4} />
          {r.ropa === "enterito" && [352, 382].map((y) => <circle key={y} cx="200" cy={y} r="4" fill={r.colorDetalle} />)}
        </g>
      );
    case "buzo":
      return (
        <g>
          <path d={torso} fill={c} />
          <path d="M146,322 Q150,290 176,290 Q200,318 224,290 Q250,290 254,322 Q200,352 146,322 Z" fill={oscurecer(c, 0.78)} {...borde} />
          <path d="M190,332 L188,378 M210,332 L212,378" stroke={r.colorDetalle} strokeWidth="3" strokeLinecap="round" />
        </g>
      );
    case "vestido":
      return (
        <g>
          <path d={torso} fill={c} />
          <path d="M168,310 Q200,376 232,310 Z" fill={piel} />
          <path d="M168,311 Q200,376 232,311" fill="none" stroke={r.colorDetalle} strokeWidth="3" />
        </g>
      );
    case "delantal":
      return (
        <g>
          <path d={torso} fill="#ecebe6" />
          <path d="M168,302 L200,384 L232,302 Z" fill={c} />
          {corbata}
          <path d="M168,302 L200,384 L184,430 L148,330 Z M232,302 L200,384 L216,430 L252,330 Z" fill="#d9d7cf" {...borde} />
          <rect x="128" y="420" width="40" height="28" fill="none" stroke="#b9b7af" strokeWidth="2" />
          <rect x="140" y="408" width="5" height="22" rx="2" fill={r.colorAccesorio} />
        </g>
      );
  }
}
