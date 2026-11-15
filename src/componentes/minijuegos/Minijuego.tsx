"use client";

import { useEffect, useRef, useState } from "react";
import type { useSala } from "@/cliente/useSala";
import { cesar } from "@/motor/minijuegos";
import type { VistaPartida } from "@/motor/vista";

type Sala = ReturnType<typeof useSala>;
type Datos = VistaPartida["minijuegos"][number];
type Pieza = { id: string; texto: string };

const ICONO: Record<Datos["tipo"], string> = { rompecabezas: "🧩", linea_tiempo: "🕰️", cifrado: "🔐", personalizado: "🎲" };

/** Tarjeta del minijuego dentro del sobre; al tocarla se abre a pantalla completa. */
export const ICONO_MINIJUEGO = ICONO;

export function TarjetaMinijuego({ datos, sala, vista }: { datos: Datos; sala: Sala; vista: VistaPartida }) {
  const [abierto, setAbierto] = useState(false);
  const quien = vista.conexiones.find((c) => c.id === datos.resueltoPor);
  return (
    <>
      <button
        onClick={() => setAbierto(true)}
        className={`papel-entrar flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm ${datos.resueltoPor ? "border-ok/60 bg-panel" : "border-dashed border-acento bg-panel-2"}`}
      >
        <span className="text-2xl">{ICONO[datos.tipo]}</span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">{datos.titulo}</span>
          <span className="block text-xs text-suave">{datos.resueltoPor ? `Resuelto por ${quien?.apodo ?? "alguien"} ✓` : "Minijuego: tocá para jugar"}</span>
        </span>
      </button>
      {abierto && <PanelMinijuego datos={datos} sala={sala} vista={vista} onCerrar={() => setAbierto(false)} />}
    </>
  );
}

function PanelMinijuego({ datos, sala, vista, onCerrar }: { datos: Datos; sala: Sala; vista: VistaPartida; onCerrar: () => void }) {
  const [intento, setIntento] = useState<{ version: number } | null>(null);
  const resuelto = !!datos.resueltoPor;
  // si llegó una vista nueva después del intento y sigue sin resolverse, el intento falló
  const fallo = !!intento && !resuelto && vista.version > intento.version;

  const enviar = async (respuesta: string) => {
    setIntento({ version: vista.version });
    await sala.accion({ tipo: "resolverMinijuego", minijuego: datos.id, respuesta });
  };

  return (
    <div className="fixed inset-0 z-[55] flex flex-col bg-bg/95 backdrop-blur" role="dialog" aria-label={datos.titulo}>
      <div className="flex items-center justify-between gap-3 border-b border-borde px-4 py-3">
        <div className="min-w-0">
          <p className="truncate font-titulo text-xl">
            {ICONO[datos.tipo]} {datos.titulo}
          </p>
          <p className="text-sm text-suave">{datos.descripcion}</p>
        </div>
        <button onClick={onCerrar} className="shrink-0 rounded-lg border border-borde px-3 py-1.5 text-sm">
          Cerrar
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-5">
        <div className="mx-auto max-w-2xl">
          <JuegoMinijuego
            tipo={datos.tipo}
            config={datos.config}
            resuelto={resuelto}
            fallo={fallo}
            intentoClave={intento?.version}
            ambientacion={vista.caso.ambientacion}
            apodo={vista.yo?.apodo ?? ""}
            onEnviar={enviar}
          />
        </div>
      </div>
    </div>
  );
}

/** El juego en sí, sin sala: lo usa el panel del juego y el laboratorio. */
export function JuegoMinijuego({
  tipo,
  config,
  resuelto,
  fallo,
  intentoClave,
  ambientacion,
  apodo,
  onEnviar,
}: {
  tipo: Datos["tipo"];
  config: Datos["config"];
  resuelto: boolean;
  fallo: boolean;
  intentoClave?: number | string;
  ambientacion: string;
  apodo: string;
  onEnviar: (respuesta: string) => void;
}) {
  return (
    <>
      {resuelto && <p className="aparecer mb-4 rounded-xl border border-ok/60 bg-panel p-3 text-center font-semibold text-ok">✓ ¡Resuelto! Lo que destrabó ya está en el expediente.</p>}
      {fallo && (
        <p key={intentoClave} className="temblar mb-4 rounded-xl border border-acento/60 bg-panel p-3 text-center text-acento">
          ✕ No salió. Revisá y probá de nuevo.
        </p>
      )}
      {tipo === "rompecabezas" && <Reordenar piezas={(config as { piezas: Pieza[] }).piezas} estilo="papel" resuelto={resuelto} onEnviar={onEnviar} />}
      {tipo === "linea_tiempo" && <Reordenar piezas={(config as { piezas: Pieza[] }).piezas} estilo="linea" resuelto={resuelto} onEnviar={onEnviar} />}
      {tipo === "cifrado" && <Cifrado config={config as { mensaje: string; pista?: string }} resuelto={resuelto} onEnviar={onEnviar} />}
      {tipo === "personalizado" && <Personalizado config={config as { pagina: string; alto: number }} ambientacion={ambientacion} apodo={apodo} resuelto={resuelto} onEnviar={onEnviar} />}
    </>
  );
}

/**
 * Ordenar piezas: tocá una y después otra para intercambiarlas, o usá las flechas.
 * Sirve para el documento roto (tiras de papel) y para la línea de tiempo.
 */
function Reordenar({ piezas, estilo, resuelto, onEnviar }: { piezas: Pieza[]; estilo: "papel" | "linea"; resuelto: boolean; onEnviar: (r: string) => void }) {
  const [orden, setOrden] = useState(piezas);
  const [elegida, setElegida] = useState<number | null>(null);
  const mover = (a: number, b: number) => {
    if (b < 0 || b >= orden.length) return;
    setOrden((o) => {
      const n = [...o];
      [n[a], n[b]] = [n[b], n[a]];
      return n;
    });
  };
  const tocar = (i: number) => {
    if (elegida === null) return setElegida(i);
    if (elegida !== i) mover(elegida, i);
    setElegida(null);
  };
  return (
    <div>
      <p className="mb-3 text-sm text-suave">Tocá una pieza y después otra para intercambiarlas, o usá las flechas.</p>
      <ol className={estilo === "linea" ? "relative space-y-3 border-l-2 border-acento/50 pl-6" : "space-y-1"}>
        {orden.map((p, i) => (
          <li key={p.id} className="flex items-stretch gap-2">
            {estilo === "linea" && <span className="absolute -left-[7px] mt-4 h-3 w-3 rounded-full bg-acento" />}
            <button
              disabled={resuelto}
              onClick={() => tocar(i)}
              className={`flex-1 text-left transition ${
                estilo === "papel" ? "papel tira-rota px-4 py-3 font-doc" : "rounded-xl border border-borde bg-panel px-4 py-3"
              } ${elegida === i ? "ring-2 ring-acento" : ""}`}
              style={estilo === "papel" ? { transform: `rotate(${((i * 53) % 5) - 2}deg)` } : undefined}
            >
              {estilo === "linea" && <span className="mr-2 font-mono text-xs text-suave">{i + 1}.</span>}
              {p.texto}
            </button>
            {!resuelto && (
              <span className="flex flex-col justify-center gap-1">
                <button onClick={() => mover(i, i - 1)} aria-label="Subir" className="rounded border border-borde px-2 text-sm">
                  ▲
                </button>
                <button onClick={() => mover(i, i + 1)} aria-label="Bajar" className="rounded border border-borde px-2 text-sm">
                  ▼
                </button>
              </span>
            )}
          </li>
        ))}
      </ol>
      {!resuelto && (
        <button onClick={() => onEnviar(orden.map((p) => p.id).join(","))} className="mt-5 w-full rounded-xl bg-acento py-3 font-semibold text-acento-texto">
          Comprobar
        </button>
      )}
    </div>
  );
}

/** Descifrador César: una rueda que corre el alfabeto y muestra el mensaje en vivo. */
function Cifrado({ config, resuelto, onEnviar }: { config: { mensaje: string; pista?: string }; resuelto: boolean; onEnviar: (r: string) => void }) {
  const [desplazamiento, setDesplazamiento] = useState(0);
  const [respuesta, setRespuesta] = useState("");
  const descifrado = cesar(config.mensaje, -desplazamiento);
  return (
    <div className="space-y-4">
      <div className="papel rounded-sm p-5 text-center font-doc text-xl tracking-[0.2em]">{config.mensaje}</div>
      {config.pista && <p className="text-sm text-suave">💡 {config.pista}</p>}
      <div className="rounded-xl border border-borde bg-panel p-4">
        <label className="block text-sm font-semibold">
          Rueda de descifrado: corrimiento {desplazamiento}
          <input type="range" min={0} max={26} value={desplazamiento} onChange={(e) => setDesplazamiento(Number(e.target.value))} className="mt-2 w-full accent-[var(--acento)]" />
        </label>
        <p className="mt-3 font-mono text-lg tracking-[0.15em] break-words">{descifrado}</p>
      </div>
      {!resuelto && (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            onEnviar(respuesta);
          }}
        >
          <input value={respuesta} onChange={(e) => setRespuesta(e.target.value)} placeholder="Mensaje descifrado" className="min-w-0 flex-1 rounded-xl border border-borde bg-panel px-4 py-3 uppercase" />
          <button className="rounded-xl bg-acento px-5 font-semibold text-acento-texto">Comprobar</button>
        </form>
      )}
    </div>
  );
}

/**
 * Minijuego propio del caso: su página corre aislada en un iframe y se comunica con mensajes.
 * Contrato: la plataforma manda { tipo: "expediente:contexto", ambientacion, apodo, resuelto };
 * la página responde { tipo: "expediente:respuesta", respuesta } cuando el jugador termina.
 */
function Personalizado({
  config,
  ambientacion,
  apodo,
  resuelto,
  onEnviar,
}: {
  config: { pagina: string; alto: number };
  ambientacion: string;
  apodo: string;
  resuelto: boolean;
  onEnviar: (r: string) => void;
}) {
  const marco = useRef<HTMLIFrameElement>(null);
  const enviarContexto = () => marco.current?.contentWindow?.postMessage({ tipo: "expediente:contexto", ambientacion, apodo, resuelto }, "*");
  useEffect(() => {
    const escuchar = (e: MessageEvent) => {
      if (e.source !== marco.current?.contentWindow) return;
      if (e.data?.tipo === "expediente:respuesta" && typeof e.data.respuesta === "string") onEnviar(e.data.respuesta);
    };
    window.addEventListener("message", escuchar);
    return () => window.removeEventListener("message", escuchar);
  }, [onEnviar]);
  useEffect(() => {
    enviarContexto();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resuelto]);
  return (
    <iframe
      ref={marco}
      src={config.pagina}
      onLoad={enviarContexto}
      sandbox="allow-scripts"
      title="Minijuego"
      className="w-full rounded-xl border border-borde bg-black"
      style={{ height: config.alto }}
    />
  );
}
