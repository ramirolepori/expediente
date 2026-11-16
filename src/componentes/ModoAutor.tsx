"use client";

import { useCallback, useEffect, useState } from "react";
import { useAutor } from "@/cliente/sesion";
import type { Atajo, InformeAutor, Nodo } from "@/motor/modoAutor";
import type { VistaPartida } from "@/motor/vista";

/**
 * Panel del autor en la sala de prueba (ADR 0012): se muestra solo si quien juega entró a /autores
 * con la cuenta del autor del caso (o de quien modera) y el caso no está publicado.
 */
export function ModoAutor({ vista, token }: { vista: VistaPartida; token: string | null | undefined }) {
  const esDeAutor = vista.caso.meta.id.startsWith("autor-");
  if (!esDeAutor || !token) return null;
  return <PanelAutor vista={vista} token={token} />;
}

type Seccion = "sobres" | "personajes" | "hechos" | "otros";

function PanelAutor({ vista, token }: { vista: VistaPartida; token: string }) {
  const { autor, pedir } = useAutor();
  const [informe, setInforme] = useState<InformeAutor | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [seccion, setSeccion] = useState<Seccion>("sobres");
  const [error, setError] = useState<string | null>(null);
  const url = `/api/salas/${vista.codigo}/autor`;

  // se vuelve a pedir con cada cambio de la partida (la versión sube con cada acción)
  useEffect(() => {
    if (!autor) return;
    let vivo = true;
    pedir(`${url}?token=${encodeURIComponent(token)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => vivo && setInforme(d))
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, [autor, pedir, url, token, vista.version]);

  const atajo = useCallback(
    async (a: Atajo) => {
      setError(null);
      const r = await pedir(url, { method: "POST", body: JSON.stringify({ token, atajo: a }) });
      if (!r.ok) setError((await r.json()).error ?? "No se pudo");
    },
    [pedir, url, token],
  );

  if (!informe) return null;
  const siguiente = informe.sobres.find((s) => s.estado !== "abierto");

  return (
    <>
      <button
        onClick={() => setAbierto(!abierto)}
        aria-expanded={abierto}
        className="fixed bottom-24 left-4 z-40 rounded-full border border-borde bg-panel px-4 py-2 text-sm font-semibold shadow-lg hover:border-acento"
      >
        🛠 Modo autor
      </button>
      {abierto && (
        <aside role="dialog" aria-label="Modo autor" className="fixed inset-y-0 left-0 z-50 flex w-full max-w-md flex-col border-r border-borde bg-panel shadow-2xl">
          <header className="flex items-center justify-between gap-2 border-b border-borde p-4">
            <div>
              <h2 className="font-semibold">🛠 Modo autor</h2>
              <p className="text-xs text-suave">Solo lo ves vos. Los atajos quedan en el registro de la partida.</p>
            </div>
            <button onClick={() => setAbierto(false)} className="rounded-lg border border-borde px-2.5 py-1 text-sm" aria-label="Cerrar el modo autor">
              ✕
            </button>
          </header>
          <div className="flex flex-wrap gap-2 border-b border-borde p-3">
            {siguiente && (
              <button onClick={() => atajo({ tipo: "abrirSobre", sobre: siguiente.id })} className="rounded-lg bg-acento px-3 py-1.5 text-sm font-semibold text-acento-texto">
                Abrir «{siguiente.titulo}»
              </button>
            )}
            {informe.traidor.posible && informe.traidor.es !== vista.yo?.id && (
              <button onClick={() => atajo({ tipo: "serTraidor" })} className="rounded-lg border border-borde px-3 py-1.5 text-sm">
                🎭 Jugar como traidor
              </button>
            )}
          </div>
          <nav className="flex border-b border-borde text-sm">
            {(["sobres", "personajes", "hechos", "otros"] as const).map((s) => (
              <button key={s} onClick={() => setSeccion(s)} className={`flex-1 py-2 capitalize ${seccion === s ? "border-b-2 border-acento font-semibold" : "text-suave"}`}>
                {s === "otros" ? "Candados" : s}
              </button>
            ))}
          </nav>
          {error && <p className="px-4 pt-3 text-sm text-acento">{error}</p>}
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4 text-sm">
            {seccion === "sobres" &&
              informe.sobres.map((s) => (
                <Tarjeta key={s.id} titulo={s.titulo} etiqueta={{ abierto: "Abierto", disponible: "Se puede abrir", cerrado: "Cerrado" }[s.estado]} ok={s.estado !== "cerrado"}>
                  {s.estado !== "abierto" && (
                    <>
                      <p className="text-xs text-suave">Se abre con:</p>
                      <Arbol nodo={s.requisito} />
                      <button onClick={() => atajo({ tipo: "abrirSobre", sobre: s.id })} className="mt-2 rounded-lg border border-borde px-2.5 py-1 text-xs hover:border-acento">
                        Abrirlo ya
                      </button>
                    </>
                  )}
                  {s.pruebas.some((p) => p.desbloqueo && !p.visible) && (
                    <div className="mt-2">
                      <p className="text-xs text-suave">Pruebas que esperan algo más:</p>
                      {s.pruebas
                        .filter((p) => p.desbloqueo && !p.visible)
                        .map((p) => (
                          <div key={p.id} className="mt-1">
                            <p className="font-medium">{p.titulo}</p>
                            <Arbol nodo={p.desbloqueo!} />
                          </div>
                        ))}
                    </div>
                  )}
                </Tarjeta>
              ))}
            {seccion === "personajes" &&
              informe.personajes.map((p) => (
                <Tarjeta key={p.id} titulo={p.nombre} etiqueta={p.disponible ? "Disponible" : "Todavía no"} ok={p.disponible}>
                  {!p.disponible && <Arbol nodo={p.condicion} />}
                  {p.secretos.map((s) => (
                    <div key={s.id} className="mt-2 rounded-lg bg-panel-2/60 p-2">
                      <p className="text-xs">
                        <span className={s.estado === "bloqueado" ? "text-suave" : s.estado === "habilitado" ? "font-semibold text-amber-600 dark:text-amber-400" : "text-ok"}>
                          {s.estado === "bloqueado" ? "🔒 Bloqueado" : s.estado === "habilitado" ? "🔓 Habilitado" : "✓ Ya lo contó"}
                        </span>{" "}
                        · {s.hecho}
                      </p>
                      {s.estado === "bloqueado" && <Arbol nodo={s.cuando} />}
                    </div>
                  ))}
                  {p.mentiras.map((m, i) => (
                    <p key={i} className="mt-1 text-xs text-suave">
                      {m.cayo ? "💥 Ya se le cayó" : "🤥 Sostiene"} la mentira sobre {m.tema}
                    </p>
                  ))}
                  {p.ficha && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs text-suave">Ficha que le llega al modelo ahora</summary>
                      <pre className="mt-1 max-h-72 overflow-auto whitespace-pre-wrap rounded-lg bg-panel-2 p-2 text-[11px] leading-snug">{p.ficha}</pre>
                    </details>
                  )}
                </Tarjeta>
              ))}
            {seccion === "hechos" &&
              informe.hechos.map((h) => (
                <div key={h.id} className="rounded-lg border border-borde p-2">
                  <p className={h.revelado ? "" : "text-suave"}>
                    {h.revelado ? "✓" : "·"} {h.texto}
                  </p>
                  <div className="mt-1 flex items-center justify-between gap-2 text-xs text-suave">
                    <span>
                      <code>{h.id}</code>
                      {h.cuentan.length > 0 && ` · lo cuenta ${h.cuentan.join(", ")}`}
                    </span>
                    {!h.revelado && (
                      <button onClick={() => atajo({ tipo: "revelarHecho", hecho: h.id })} className="rounded border border-borde px-2 py-0.5 hover:border-acento">
                        Revelar
                      </button>
                    )}
                  </div>
                </div>
              ))}
            {seccion === "otros" && (
              <>
                {informe.candados.length === 0 && informe.minijuegos.length === 0 && <p className="text-suave">El caso no tiene candados ni minijuegos.</p>}
                {informe.candados.map((c) => (
                  <Tarjeta key={c.id} titulo={`🔐 ${c.titulo}`} etiqueta={c.abierto ? "Abierto" : c.disponible ? "Disponible" : "Todavía no"} ok={c.abierto || c.disponible}>
                    <p className="text-xs">
                      Código: <code className="font-mono">{c.codigo}</code>
                    </p>
                    {!c.abierto && (
                      <button onClick={() => atajo({ tipo: "abrirCandado", candado: c.id })} className="mt-1 rounded-lg border border-borde px-2.5 py-1 text-xs hover:border-acento">
                        Abrirlo
                      </button>
                    )}
                  </Tarjeta>
                ))}
                {informe.minijuegos.map((m) => (
                  <Tarjeta key={m.id} titulo={`🧩 ${m.titulo}`} etiqueta={m.resuelto ? "Resuelto" : m.disponible ? "Disponible" : "Todavía no"} ok={m.resuelto || m.disponible}>
                    {m.solucion && (
                      <p className="text-xs">
                        Solución: <code className="font-mono">{m.solucion}</code>
                      </p>
                    )}
                    {!m.resuelto && (
                      <button onClick={() => atajo({ tipo: "resolverMinijuego", minijuego: m.id })} className="mt-1 rounded-lg border border-borde px-2.5 py-1 text-xs hover:border-acento">
                        Darlo por resuelto
                      </button>
                    )}
                  </Tarjeta>
                ))}
              </>
            )}
          </div>
        </aside>
      )}
    </>
  );
}

function Tarjeta({ titulo, etiqueta, ok, children }: { titulo: string; etiqueta: string; ok: boolean; children?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-borde p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="font-semibold">{titulo}</p>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${ok ? "bg-ok/15 text-ok" : "bg-panel-2 text-suave"}`}>{etiqueta}</span>
      </div>
      {children && <div className="mt-2">{children}</div>}
    </div>
  );
}

function Arbol({ nodo }: { nodo: Nodo }) {
  return (
    <div className="mt-1">
      <p className={`text-xs ${nodo.cumple ? "text-ok" : "text-acento"}`}>
        {nodo.cumple ? "✓" : "✗"} {nodo.texto}
      </p>
      {nodo.hijos && (
        <div className="ml-3 border-l border-borde pl-2">
          {nodo.hijos.map((h, i) => (
            <Arbol key={i} nodo={h} />
          ))}
        </div>
      )}
    </div>
  );
}
