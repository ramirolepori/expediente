"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CONFIG_POR_DEFECTO, type ConfigPartida } from "@/motor/tipos";

interface CasoResumen {
  id: string;
  titulo: string;
  sinopsis: string;
  duracionMin: number;
  dificultad: string;
  jugadores: { min: number; max: number };
  advertencias: string[];
  ambientacion: string;
  modos: string[];
}

/** modos con lógica implementada; el resto no se ofrece todavía */
const MODOS_LISTOS = ["cooperativo", "traidor"];

const NOMBRE_AMBIENTACION: Record<string, string> = {
  noir: "Noir",
  policial: "Policial",
  medico: "Médico",
  terror: "Terror",
  epoca: "De época",
};

export function Inicio({ casos }: { casos: CasoResumen[] }) {
  const router = useRouter();
  const [codigo, setCodigo] = useState("");
  const [elegido, setElegido] = useState<string | null>(casos[0]?.id ?? null);
  const [config, setConfig] = useState<ConfigPartida>(CONFIG_POR_DEFECTO);
  const [cargando, setCargando] = useState(false);
  const [apodo, setApodo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const caso = casos.find((c) => c.id === elegido);

  async function crear() {
    if (!elegido) return;
    setCargando(true);
    setError(null);
    const r = await fetch("/api/salas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ casoId: elegido, config }),
    });
    const d = await r.json();
    if (!r.ok) {
      setCargando(false);
      return setError(d.error);
    }
    // el anfitrión entra directo al lobby, sin pasar por la pantalla de apodo
    const u = await fetch(`/api/salas/${d.codigo}/unirse`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apodo, tipo: "jugador" }),
    });
    const datos = await u.json();
    if (u.ok) {
      try {
        sessionStorage.setItem(`expediente:${d.codigo}:jugador`, datos.token);
      } catch {}
    }
    router.push(`/sala/${d.codigo}`);
  }

  const set = <K extends keyof ConfigPartida>(k: K, v: ConfigPartida[K]) => setConfig((c) => ({ ...c, [k]: v }));

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:py-14">
      <header className="mb-10">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-acento">Expediente</p>
        <h1 className="mt-2 text-3xl font-bold sm:text-5xl">Casos para resolver en grupo</h1>
        <p className="mt-3 max-w-2xl text-suave">
          Cada uno con su celu, tablet o compu. Si tienen una tele, conéctenla como pantalla compartida.
        </p>
      </header>

      <section className="mb-10 rounded-2xl border border-borde bg-panel p-5">
        <h2 className="font-semibold">¿Ya hay una partida?</h2>
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (codigo.trim().length >= 4) router.push(`/sala/${codigo.trim().toUpperCase()}`);
          }}
        >
          <input
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.toUpperCase().slice(0, 4))}
            placeholder="CÓDIGO"
            aria-label="Código de la sala"
            className="w-36 rounded-xl border border-borde bg-panel-2 px-4 py-3 text-center font-mono text-xl tracking-[0.3em] uppercase outline-none focus:border-acento"
          />
          <button className="rounded-xl bg-acento px-5 font-semibold text-acento-texto disabled:opacity-40" disabled={codigo.length < 4}>
            Unirme
          </button>
        </form>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-semibold">Nueva partida</h2>
        <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          <div className="space-y-3">
            {casos.map((c) => (
              <button
                key={c.id}
                onClick={() => setElegido(c.id)}
                className={`block w-full rounded-2xl border p-5 text-left transition ${
                  elegido === c.id ? "border-acento bg-panel ring-2 ring-acento/30" : "border-borde bg-panel hover:border-suave"
                }`}
              >
                <div className="flex flex-wrap items-center gap-2 text-xs text-suave">
                  <span className="rounded-full bg-panel-2 px-2 py-0.5">{NOMBRE_AMBIENTACION[c.ambientacion] ?? c.ambientacion}</span>
                  <span>{c.duracionMin} min</span>
                  <span>·</span>
                  <span>
                    {c.jugadores.min} a {c.jugadores.max} jugadores
                  </span>
                  <span>·</span>
                  <span className="capitalize">dificultad {c.dificultad}</span>
                </div>
                <h3 className="mt-2 text-lg font-bold">{c.titulo}</h3>
                <p className="mt-1 text-sm text-suave">{c.sinopsis}</p>
                {c.advertencias.length > 0 && <p className="mt-2 text-xs text-suave">Contiene: {c.advertencias.join(", ")}</p>}
              </button>
            ))}
          </div>

          <div className="h-fit rounded-2xl border border-borde bg-panel p-5">
            <h3 className="font-semibold">Configuración</h3>
            <div className="mt-4 space-y-4 text-sm">
              <Campo etiqueta="Tu apodo">
                <input
                  value={apodo}
                  onChange={(e) => setApodo(e.target.value.slice(0, 24))}
                  placeholder="Ej.: Ramiro"
                  className="sel"
                />
              </Campo>
              <Campo etiqueta="Modo">
                <select className="sel" value={config.modo} onChange={(e) => set("modo", e.target.value as ConfigPartida["modo"])}>
                  {(caso?.modos ?? ["cooperativo"]).filter((m) => MODOS_LISTOS.includes(m)).map((m) => (
                    <option key={m} value={m}>
                      {m === "traidor" ? "Traidor (3 o más jugadores)" : m[0].toUpperCase() + m.slice(1)}
                    </option>
                  ))}
                </select>
              </Campo>
              <Campo etiqueta="Horas de investigación" ayuda="Citar a alguien nuevo o pedir ayuda cuesta una hora">
                <select className="sel" value={config.recursos ?? ""} onChange={(e) => set("recursos", e.target.value ? Number(e.target.value) : null)}>
                  <option value="">Sin límite</option>
                  <option value="8">8 horas</option>
                  <option value="10">10 horas</option>
                  <option value="12">12 horas</option>
                </select>
              </Campo>
              <Campo etiqueta="Ayudas del comisario">
                <select className="sel" value={config.ayudas} onChange={(e) => set("ayudas", e.target.value as ConfigPartida["ayudas"])}>
                  <option value="limitadas">Restan puntos</option>
                  <option value="ilimitadas">Libres</option>
                  <option value="apagadas">Sin ayudas</option>
                </select>
              </Campo>
              <Campo etiqueta="Temporizador">
                <select className="sel" value={config.temporizadorMin ?? ""} onChange={(e) => set("temporizadorMin", e.target.value ? Number(e.target.value) : null)}>
                  <option value="">Sin tiempo</option>
                  <option value="60">60 minutos</option>
                  <option value="90">90 minutos</option>
                  <option value="120">120 minutos</option>
                </select>
              </Campo>
              <Campo
                etiqueta="Voces de los personajes"
                ayuda={
                  config.audioEn === "nadie"
                    ? "Los personajes responden solo por escrito"
                    : "Ojo: la primera vez se bajan unos 300 MB en el dispositivo que suena. Se activan ahí con el botón 🔇"
                }
              >
                <select className="sel" value={config.audioEn} onChange={(e) => set("audioEn", e.target.value as ConfigPartida["audioEn"])}>
                  <option value="nadie">Sin voces</option>
                  <option value="compartida">En la tele (o en el anfitrión si no hay)</option>
                  <option value="interrogador">En el dispositivo de quien pregunta</option>
                </select>
              </Campo>
              <Interruptor etiqueta="Sistema de puntos" valor={config.puntaje} onChange={(v) => set("puntaje", v)} />
              <Interruptor etiqueta="Preguntar por micrófono" valor={config.voz} onChange={(v) => set("voz", v)} />
            </div>
            {error && <p className="mt-4 text-sm text-acento">{error}</p>}
            <button
              onClick={crear}
              disabled={!elegido || cargando || !apodo.trim()}
              className="mt-6 w-full rounded-xl bg-acento py-3 font-semibold text-acento-texto disabled:opacity-40"
            >
              {cargando ? "Creando…" : "Crear sala"}
            </button>
          </div>
        </div>
      </section>
      <a href="/autores" className="mt-10 block rounded-2xl border border-borde bg-panel p-5 transition hover:border-acento">
        <p className="font-semibold">✍️ Escribí tu propio caso</p>
        <p className="mt-1 text-sm text-suave">Armalo con tu IA y nuestro kit de autor, validalo y sumalo al catálogo.</p>
      </a>
      <footer className="mt-12 border-t border-borde pt-4 text-sm text-suave">
        <a href="/laboratorio" className="hover:text-acento">
          🧪 Laboratorio de diseño
        </a>
      </footer>
      <style>{`.sel{width:100%;border-radius:.75rem;border:1px solid var(--borde);background:var(--panel-2);padding:.6rem .75rem;color:var(--texto)}`}</style>
    </main>
  );
}

function Campo({ etiqueta, ayuda, children }: { etiqueta: string; ayuda?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block font-medium">{etiqueta}</span>
      {children}
      {ayuda && <span className="mt-1 block text-xs text-suave">{ayuda}</span>}
    </label>
  );
}

function Interruptor({ etiqueta, valor, onChange }: { etiqueta: string; valor: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!valor)} className="flex w-full items-center justify-between" aria-pressed={valor}>
      <span className="font-medium">{etiqueta}</span>
      <span className={`relative h-6 w-11 rounded-full transition ${valor ? "bg-acento" : "bg-panel-2 border border-borde"}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${valor ? "left-[22px]" : "left-0.5"}`} />
      </span>
    </button>
  );
}
