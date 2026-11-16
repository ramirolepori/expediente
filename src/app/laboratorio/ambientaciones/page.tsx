"use client";

import { useEffect, useState } from "react";
import { despertar } from "@/cliente/audio";
import { paisajeDe, type Momento } from "@/cliente/paisajes";
import { AMBIENTACIONES, type Ambientacion, type Prueba } from "@/casos/schema";
import { Documento } from "@/componentes/Documento";
import { BotonEscuchar, ReproductorLectura } from "@/componentes/Narrador";
import { oraciones } from "@/cliente/voces";
import { guionDePrueba } from "@/motor/narracion";
import { vocesDeLectura, vocesDelElenco } from "@/motor/voz";

const NOMBRES: Record<Ambientacion, string> = { noir: "Noir", policial: "Policial moderno", medico: "Médico / forense", terror: "Terror", epoca: "De época" };

const PRUEBA: Prueba = {
  id: "muestra",
  titulo: "Informe preliminar",
  tipo: "informe",
  sobre: "s1",
  contenido:
    "**Hora probable de muerte:** entre las 23:20 y las 23:40.\n\n**Duarte:** Yo estuve en mi casa toda la noche, lo juro.\n\n**Inspectora:** Las cámaras dicen otra cosa.\n\n- La puerta no fue forzada.\n- Dos copas sobre la mesa, una con marcas de labial.\n\n| Hora | Movimiento |\n|---|---|\n| 23:12 | Tarjeta de la víctima |\n| 23:19 | Tarjeta maestra AU-0008 |",
};

/** Muestra los mismos componentes del juego en cada ambientación. */
export default function Pagina() {
  const [amb, setAmb] = useState<Ambientacion>("noir");
  return (
    <div data-ambientacion={amb} className="ambiente relative min-h-dvh">
      <div className="ambiente-fx" aria-hidden>
        <div className="fx-1" />
        <div className="fx-2" />
        <div className="fx-3" />
      </div>
      <main className="capa-juego mx-auto max-w-4xl px-4 py-8">
                <h1 className="font-titulo text-4xl">Ambientaciones</h1>
        <div className="mt-4 flex flex-wrap gap-2">
          {AMBIENTACIONES.map((a) => (
            <button key={a} onClick={() => setAmb(a)} className={`rounded-full border px-3 py-1.5 text-sm ${amb === a ? "border-acento bg-acento text-acento-texto" : "border-borde bg-panel"}`}>
              {NOMBRES[a]}
            </button>
          ))}
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <section className="space-y-4">
            <h2 className="font-titulo text-2xl">Sobre 2: Los registros</h2>
            <button className="sobre flex h-28 w-full items-end justify-between px-4 pb-3 text-left font-doc">
              <span className="relative text-sm">Sobre 2</span>
              <span className="relative rounded bg-acento px-2 py-1 font-ui text-xs font-semibold text-acento-texto">Abrir sobre</span>
            </button>
            <div className="flex items-start gap-3 rounded-xl border border-acento/60 bg-panel/95 p-3 shadow-2xl">
              <span className="text-2xl">📎</span>
              <span>
                <span className="block text-sm font-semibold text-acento">Nueva prueba</span>
                <span className="text-sm">Pendrive azul de Julia</span>
              </span>
            </div>
            <div className="space-y-2 rounded-xl border border-borde bg-panel p-3">
              <div className="flex justify-end">
                <p className="max-w-[85%] rounded-2xl rounded-br-sm bg-panel-2 px-3.5 py-2 text-sm">¿Dónde estuvo el domingo a la noche?</p>
              </div>
              <div className="flex justify-start">
                <p className="papel max-w-[85%] rounded-2xl rounded-bl-sm px-3.5 py-2 text-sm">*Se acomoda el saco.* En mi casa, detective. Mirando un partido repetido.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="rounded-xl bg-acento px-4 py-2 font-semibold text-acento-texto">Votar acusación</button>
              <button className="rounded-xl border border-borde px-4 py-2">Pedir una pista</button>
            </div>
          </section>
          <section>
            {/* el narrador con la voz de esta ambientación; "Duarte" es un personaje de muestra */}
            <Documento
              prueba={PRUEBA}
              accion={
                <BotonEscuchar
                  chico
                  lectura={() => {
                    const elenco = [{ id: "duarte", nombre: "Martín Duarte", voz: { genero: "masculino" as const, edad: "adulto" as const, velocidad: 1 } }];
                    const voces = vocesDeLectura(amb, elenco);
                    const duarte = vocesDelElenco(elenco).duarte!;
                    return {
                      que: `muestra-${amb}`,
                      ambientacion: amb,
                      titulo: PRUEBA.titulo,
                      partes: guionDePrueba(PRUEBA, elenco).flatMap((l) =>
                        oraciones(l.texto).map((texto) => ({ texto, voz: l.voz === "narrador" ? voces.narrador : l.voz === "otra" ? voces.otra : duarte })),
                      ),
                    };
                  }}
                />
              }
            />
            <ReproductorLectura />
            <ProbarSonido amb={amb} />
          </section>
        </div>
      </main>
    </div>
  );
}

/** Para escuchar el paisaje sonoro de cada ambientación sin armar una partida. */
function ProbarSonido({ amb }: { amb: Ambientacion }) {
  const paisaje = paisajeDe(amb);
  const [sonando, setSonando] = useState<(() => void) | null>(null);
  useEffect(() => () => sonando?.(), [sonando]);
  if (!paisaje) return <p className="mt-4 text-sm text-suave">Esta ambientación todavía no tiene sonido propio.</p>;
  const efectos: [Momento, string][] = [["sobre", "Abrir sobre"], ["revelacion", "Revelación"], ["candado", "Candado"], ["error", "Código mal"], ["final", "Final"]];
  return (
    <div className="mt-4 flex flex-wrap gap-2 text-sm">
      <button
        onClick={async () => {
          if (sonando) return setSonando(null);
          if (await despertar()) setSonando(() => paisaje.ambiente());
        }}
        className="rounded-lg border border-borde px-3 py-1.5"
      >
        {sonando ? "⏹ Apagar ambiente" : "🌧 Escuchar ambiente"}
      </button>
      {paisaje.musica && <Musica url={paisaje.musica} />}
      {efectos.map(([m, nombre]) => (
        <button key={m} onClick={async () => (await despertar()) && paisaje.efecto(m)} className="rounded-lg border border-borde px-3 py-1.5">
          {nombre}
        </button>
      ))}
    </div>
  );
}

function Musica({ url }: { url: string }) {
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  useEffect(() => () => audio?.pause(), [audio]);
  return (
    <button
      onClick={() => {
        if (audio) return setAudio(null);
        const a = new Audio(url);
        a.loop = true;
        a.volume = 0.5;
        void a.play();
        setAudio(a);
      }}
      className="rounded-lg border border-borde px-3 py-1.5"
    >
      {audio ? "⏹ Apagar música" : "🎷 Escuchar música"}
    </button>
  );
}
