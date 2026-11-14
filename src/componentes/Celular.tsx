"use client";

import { useRef, useState } from "react";
import type { Prueba } from "@/casos/schema";

type Datos = NonNullable<Prueba["celular"]>;
type Pantalla =
  | { tipo: "bloqueo" }
  | { tipo: "inicio" }
  | { tipo: "mensajes" }
  | { tipo: "chat"; indice: number }
  | { tipo: "telefono" }
  | { tipo: "correo" }
  | { tipo: "mail"; indice: number }
  | { tipo: "notas" };

const APPS = [
  { id: "mensajes", nombre: "Mensajes", icono: "💬", fondo: "linear-gradient(160deg,#5ef08a,#1fae4e)" },
  { id: "telefono", nombre: "Teléfono", icono: "📞", fondo: "linear-gradient(160deg,#6cf38e,#22b04f)" },
  { id: "correo", nombre: "Correo", icono: "✉️", fondo: "linear-gradient(160deg,#61b8ff,#1a6fe0)" },
  { id: "notas", nombre: "Notas", icono: "📝", fondo: "linear-gradient(160deg,#ffe36b,#f2b705)" },
  { id: "camara", nombre: "Cámara", icono: "📷", fondo: "linear-gradient(160deg,#9aa0a6,#5f6368)" },
  { id: "fotos", nombre: "Fotos", icono: "🖼️", fondo: "linear-gradient(160deg,#fff,#e8e8e8)" },
  { id: "mapas", nombre: "Mapas", icono: "🗺️", fondo: "linear-gradient(160deg,#9be7a8,#4fbf68)" },
  { id: "ajustes", nombre: "Ajustes", icono: "⚙️", fondo: "linear-gradient(160deg,#c9ccd1,#8a8f98)" },
] as const;

/** Teléfono de la víctima: bloqueo, inicio y apps navegables, con la estética de un celular real. */
export function Celular({ datos }: { datos: Datos }) {
  const [pila, setPila] = useState<Pantalla[]>([{ tipo: "bloqueo" }]);
  const [aviso, setAviso] = useState<string | null>(null);
  const actual = pila[pila.length - 1];
  const ir = (p: Pantalla) => setPila((x) => [...x, p]);
  const volver = () => setPila((x) => (x.length > 2 ? x.slice(0, -1) : x));
  const inicio = () => setPila([{ tipo: "bloqueo" }, { tipo: "inicio" }]);
  const toque = useRef<number | null>(null);

  const abrirApp = (id: string) => {
    if (id === "mensajes" || id === "telefono" || id === "correo" || id === "notas") ir({ tipo: id });
    else {
      setAviso("No hay nada relevante acá");
      setTimeout(() => setAviso(null), 1600);
    }
  };

  const bateriaBaja = datos.bateria <= 10;
  const oscuro = actual.tipo === "bloqueo" || actual.tipo === "inicio";

  return (
    <div className="mx-auto mt-5 w-full max-w-[300px] font-ui select-none" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif" }}>
      <div className="relative rounded-[2.9rem] bg-neutral-900 p-[10px] shadow-[0_25px_50px_rgba(0,0,0,0.5),inset_0_0_0_2px_#3a3a3c]">
        {/* botones laterales */}
        <span className="absolute top-24 -left-[3px] h-8 w-[3px] rounded-l bg-neutral-700" />
        <span className="absolute top-36 -left-[3px] h-12 w-[3px] rounded-l bg-neutral-700" />
        <span className="absolute top-32 -right-[3px] h-16 w-[3px] rounded-r bg-neutral-700" />

        <div className="relative h-[600px] overflow-hidden rounded-[2.3rem] bg-black text-[13px]">
          {/* barra de estado */}
          <div className={`absolute inset-x-0 top-0 z-30 flex h-11 items-center justify-between px-7 text-[13px] font-semibold ${oscuro ? "text-white" : "text-black"}`}>
            <span>{datos.hora}</span>
            <span className="absolute top-2.5 left-1/2 h-[26px] w-[92px] -translate-x-1/2 rounded-full bg-black" />
            <span className="flex items-center gap-1.5">
              <Senal />
              <span className="text-[11px]">4G</span>
              <Bateria nivel={datos.bateria} baja={bateriaBaja} />
            </span>
          </div>

          {actual.tipo === "bloqueo" && (
            <div
              className="absolute inset-0 flex flex-col items-center text-white"
              style={{ background: "radial-gradient(120% 80% at 50% 0%, #2a3550 0%, #121826 55%, #07090f 100%)" }}
              onPointerDown={(e) => (toque.current = e.clientY)}
              onPointerUp={(e) => {
                if (toque.current !== null && toque.current - e.clientY > 40) inicio();
                toque.current = null;
              }}
            >
              <p className="mt-16 text-[15px] font-medium capitalize opacity-80">{datos.fecha ?? ""}</p>
              <p className="text-[76px] leading-none font-semibold tracking-tight">{datos.hora}</p>
              <div className="mt-6 w-full space-y-2 px-3">
                {datos.chats.slice(0, 3).map((c) => {
                  const ultimo = c.mensajes.filter((m) => m.de === "contacto").at(-1);
                  if (!ultimo) return null;
                  return (
                    <div key={c.contacto} className="rounded-2xl bg-white/15 px-3 py-2 backdrop-blur-md">
                      <p className="flex justify-between text-[11px] opacity-70">
                        <span>💬 MENSAJES</span>
                        <span>{ultimo.hora}</span>
                      </p>
                      <p className="font-semibold">{c.contacto}</p>
                      <p className="line-clamp-1 opacity-90">{ultimo.texto}</p>
                    </div>
                  );
                })}
                {bateriaBaja && (
                  <div className="rounded-2xl bg-white/15 px-3 py-2 backdrop-blur-md">
                    <p className="font-semibold">Batería baja</p>
                    <p className="opacity-90">Queda {datos.bateria}% de batería.</p>
                  </div>
                )}
              </div>
              {datos.bloqueo && <p className="mt-3 px-6 text-center text-[11px] opacity-60">{datos.bloqueo}</p>}
              <button onClick={inicio} className="absolute bottom-9 animate-pulse text-[13px] opacity-80">
                Deslizá hacia arriba para abrir
              </button>
              <BarraInicio claro onClick={inicio} />
            </div>
          )}

          {actual.tipo === "inicio" && (
            <div
              className="cel-entrar absolute inset-0 px-5 pt-16 text-white"
              style={{ background: "linear-gradient(170deg, #3b4a6b 0%, #1c2438 50%, #0d1220 100%)" }}
            >
              <div className="grid grid-cols-4 gap-y-5">
                {APPS.map((a) => (
                  <button key={a.id} onClick={() => abrirApp(a.id)} className="flex flex-col items-center gap-1 active:scale-90 transition-transform">
                    <span className="relative flex h-[52px] w-[52px] items-center justify-center rounded-[14px] text-2xl shadow-lg" style={{ background: a.fondo }}>
                      {a.icono}
                      {a.id === "mensajes" && datos.chats.length > 0 && <Insignia n={datos.chats.length} />}
                      {a.id === "telefono" && datos.llamadas.some((l) => l.tipo === "perdida") && <Insignia n={datos.llamadas.filter((l) => l.tipo === "perdida").length} />}
                    </span>
                    <span className="text-[11px]">{a.nombre}</span>
                  </button>
                ))}
              </div>
              {aviso && <p className="aviso absolute inset-x-8 bottom-24 rounded-xl bg-black/70 px-3 py-2 text-center">{aviso}</p>}
              <BarraInicio claro onClick={inicio} />
            </div>
          )}

          {actual.tipo === "mensajes" && (
            <App titulo="Mensajes" onVolver={volver} onInicio={inicio}>
              {datos.chats.map((c, i) => {
                const ultimo = c.mensajes.at(-1);
                return (
                  <button key={c.contacto} onClick={() => ir({ tipo: "chat", indice: i })} className="flex w-full items-center gap-3 border-b border-neutral-200 px-4 py-3 text-left active:bg-neutral-100">
                    <Avatar nombre={c.contacto} />
                    <span className="min-w-0 flex-1">
                      <span className="flex justify-between">
                        <span className="font-semibold">{c.contacto}</span>
                        <span className="text-[11px] text-neutral-400">{ultimo?.hora}</span>
                      </span>
                      <span className="line-clamp-1 text-neutral-500">{ultimo?.texto}</span>
                    </span>
                  </button>
                );
              })}
            </App>
          )}

          {actual.tipo === "chat" && (
            <App titulo={datos.chats[actual.indice].contacto} onVolver={volver} onInicio={inicio} fondo="#e9e4dc">
              <div className="space-y-1.5 p-3">
                {datos.chats[actual.indice].mensajes.map((m, i) => (
                  <div key={i} className={`flex ${m.de === "victima" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[78%] rounded-2xl px-3 py-1.5 shadow-sm ${m.de === "victima" ? "rounded-br-md bg-[#d9fdd3]" : "rounded-bl-md bg-white"}`}>
                      <p className="text-neutral-900">{m.texto}</p>
                      <p className="text-right text-[10px] text-neutral-400">{m.hora}</p>
                    </div>
                  </div>
                ))}
              </div>
            </App>
          )}

          {actual.tipo === "telefono" && (
            <App titulo="Recientes" onVolver={volver} onInicio={inicio}>
              {datos.llamadas.map((l, i) => (
                <div key={i} className="flex items-center gap-3 border-b border-neutral-200 px-4 py-3">
                  <span className="w-5 text-center text-neutral-400">{l.tipo === "entrante" ? "↙" : l.tipo === "saliente" ? "↗" : "✕"}</span>
                  <span className="min-w-0 flex-1">
                    <span className={`block font-semibold ${l.tipo === "perdida" ? "text-red-500" : ""}`}>{l.contacto}</span>
                    <span className="text-[11px] text-neutral-500">
                      {l.tipo === "perdida" ? "Llamada perdida" : l.tipo === "entrante" ? "Entrante" : "Saliente"}
                      {l.duracion ? ` · ${l.duracion}` : ""}
                    </span>
                  </span>
                  <span className="text-[11px] text-neutral-400">{l.hora}</span>
                </div>
              ))}
            </App>
          )}

          {actual.tipo === "correo" && (
            <App titulo="Enviados" onVolver={volver} onInicio={inicio}>
              {datos.correos.map((c, i) => (
                <button key={i} onClick={() => ir({ tipo: "mail", indice: i })} className="block w-full border-b border-neutral-200 px-4 py-3 text-left active:bg-neutral-100">
                  <span className="flex justify-between text-[11px] text-neutral-400">
                    <span>Para: {c.para}</span>
                    <span>{c.hora}</span>
                  </span>
                  <span className="block font-semibold">{c.asunto}</span>
                  <span className="line-clamp-2 text-neutral-500">{c.cuerpo}</span>
                </button>
              ))}
            </App>
          )}

          {actual.tipo === "mail" && (
            <App titulo="Correo" onVolver={volver} onInicio={inicio}>
              <div className="space-y-2 p-4">
                <p className="text-lg font-semibold">{datos.correos[actual.indice].asunto}</p>
                <p className="text-[11px] text-neutral-500">
                  De: {datos.dueno ?? "yo"} · Para: {datos.correos[actual.indice].para} · {datos.correos[actual.indice].hora}
                </p>
                <p className="pt-2 whitespace-pre-wrap">{datos.correos[actual.indice].cuerpo}</p>
              </div>
            </App>
          )}

          {actual.tipo === "notas" && (
            <App titulo="Notas" onVolver={volver} onInicio={inicio} fondo="#fbf6e3">
              {datos.notas.map((n, i) => (
                <div key={i} className="border-b border-amber-200 px-4 py-3">
                  <p className="font-semibold">{n.texto.split("\n")[0]}</p>
                  <p className="text-[11px] text-neutral-500">{n.hora}</p>
                </div>
              ))}
            </App>
          )}
        </div>
      </div>
      <p className="mt-2 text-center text-xs opacity-60">Tocá y navegá el teléfono como uno real</p>
    </div>
  );
}

function App({ titulo, onVolver, onInicio, fondo = "#ffffff", children }: { titulo: string; onVolver: () => void; onInicio: () => void; fondo?: string; children: React.ReactNode }) {
  return (
    <div className="cel-app absolute inset-0 flex flex-col text-neutral-900" style={{ background: fondo }}>
      <div className="flex shrink-0 items-end gap-2 border-b border-black/10 bg-white/90 px-3 pt-12 pb-2 backdrop-blur">
        <button onClick={onVolver} className="text-[15px] text-[#0a84ff]">
          ‹ Atrás
        </button>
        <p className="flex-1 truncate pr-12 text-center text-[15px] font-semibold">{titulo}</p>
      </div>
      <div className="flex-1 overflow-y-auto pb-8">{children}</div>
      <BarraInicio onClick={onInicio} />
    </div>
  );
}

function BarraInicio({ claro, onClick }: { claro?: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} aria-label="Ir al inicio" className="absolute inset-x-0 bottom-0 z-20 flex h-6 items-center justify-center">
      <span className={`h-[5px] w-28 rounded-full ${claro ? "bg-white/80" : "bg-black/70"}`} />
    </button>
  );
}

function Avatar({ nombre }: { nombre: string }) {
  return <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-neutral-300 to-neutral-400 font-semibold text-white">{nombre[0]}</span>;
}

function Insignia({ n }: { n: number }) {
  return <span className="absolute -top-1.5 -right-1.5 min-w-5 rounded-full bg-red-500 px-1 text-center text-[11px] leading-5 font-semibold text-white">{n}</span>;
}

function Senal() {
  return (
    <span className="flex items-end gap-[2px]" aria-hidden>
      {[4, 6, 8, 10].map((h, i) => (
        <span key={h} className={`w-[3px] rounded-sm bg-current ${i === 3 ? "opacity-30" : ""}`} style={{ height: h }} />
      ))}
    </span>
  );
}

function Bateria({ nivel, baja }: { nivel: number; baja: boolean }) {
  return (
    <span className="flex items-center" aria-label={`Batería ${nivel}%`}>
      <span className="relative h-[11px] w-[22px] rounded-[3px] border border-current/60 p-[1px]">
        <span className={`block h-full rounded-[1px] ${baja ? "bg-red-500" : "bg-current"}`} style={{ width: `${Math.max(nivel, 6)}%` }} />
      </span>
      <span className="ml-[1px] h-1 w-[2px] rounded-r bg-current/60" />
    </span>
  );
}
