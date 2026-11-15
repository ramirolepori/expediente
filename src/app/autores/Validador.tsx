"use client";

import { useRef, useState } from "react";
import { NOMBRE_CAPA, type Hallazgo, type Nivel } from "@/motor/validador";
import { BYTES_CABECERA } from "@/motor/validador-archivos";

interface Resultado {
  ok: boolean;
  titulo: string | null;
  hallazgos: Hallazgo[];
  informe: string;
}

const NIVELES: { nivel: Nivel; titulo: string; estilo: string }[] = [
  { nivel: "error", titulo: "Errores", estilo: "border-acento/40 bg-acento/10 text-acento" },
  { nivel: "aviso", titulo: "Avisos", estilo: "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  { nivel: "sugerencia", titulo: "Sugerencias", estilo: "border-borde bg-panel-2 text-suave" },
];

// lo que no es parte del paquete jugable no se manda
const IGNORAR = /(^|\/)\.|\.(md|txt|json)$/i;

/** Arma el pedido: el caso.json entero y, de cada otro archivo, ruta relativa, peso y cabecera. */
function armarPedido(archivos: File[]): { form: FormData; caso: File } | string {
  const rutaDe = (f: File) => f.webkitRelativePath || f.name;
  const caso = archivos.filter((f) => rutaDe(f).split("/").pop() === "caso.json").sort((a, b) => rutaDe(a).length - rutaDe(b).length)[0];
  if (!caso) return "No encontré un caso.json en lo que elegiste";
  const base = rutaDe(caso).slice(0, -"caso.json".length);
  const form = new FormData();
  const rutas: string[] = [];
  const pesos: number[] = [];
  for (const f of archivos) {
    const ruta = rutaDe(f);
    if (f === caso || !ruta.startsWith(base) || IGNORAR.test(ruta.slice(base.length))) continue;
    rutas.push(ruta.slice(base.length));
    pesos.push(f.size);
    form.append("archivo", f.slice(0, BYTES_CABECERA));
  }
  form.append("rutas", JSON.stringify(rutas));
  form.append("pesos", JSON.stringify(pesos));
  return { form, caso };
}

export function Validador({ pedir }: { pedir: (url: string, init?: RequestInit) => Promise<Response> }) {
  const carpeta = useRef<HTMLInputElement>(null);
  const soloJson = useRef<HTMLInputElement>(null);
  const [elegidos, setElegidos] = useState<File[]>([]);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [validando, setValidando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  async function validar(archivos: File[]) {
    setError(null);
    setCopiado(false);
    const pedido = armarPedido(archivos);
    if (typeof pedido === "string") return setError(pedido);
    setValidando(true);
    try {
      pedido.form.append("caso", await pedido.caso.text());
      const r = await pedir("/api/autores/validar", { method: "POST", body: pedido.form });
      const d = await r.json();
      if (!r.ok) setError(d.error ?? "No se pudo validar");
      else setResultado(d);
    } catch {
      setError("No se pudo validar. Revisá tu conexión y probá de nuevo");
    } finally {
      setValidando(false);
    }
  }

  function elegir(lista: FileList | null) {
    const archivos = [...(lista ?? [])];
    if (!archivos.length) return;
    setElegidos(archivos);
    void validar(archivos);
  }

  async function copiar() {
    if (!resultado) return;
    try {
      await navigator.clipboard.writeText(resultado.informe);
      setCopiado(true);
    } catch {
      setError("No pude copiar. Seleccioná el informe a mano");
    }
  }

  const cuenta = (n: Nivel) => resultado?.hallazgos.filter((h) => h.nivel === n).length ?? 0;
  const nombreElegido = elegidos[0]?.webkitRelativePath.split("/")[0] || elegidos[0]?.name;

  return (
    <section className="rounded-2xl border border-borde bg-panel p-5">
      <h2 className="text-lg font-semibold">Validar un caso</h2>
      <p className="mt-1 text-sm text-suave">
        Elegí la carpeta del caso, con el <code className="font-mono text-xs">caso.json</code> y sus imágenes. El validador revisa que se pueda resolver, que no haya spoilers
        y que todo esté en su lugar. Si encuentra algo, copiás el informe y se lo pasás a tu IA.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <button onClick={() => carpeta.current?.click()} disabled={validando} className="rounded-xl bg-acento px-4 py-2.5 text-sm font-semibold text-acento-texto disabled:opacity-40">
          Elegir la carpeta del caso
        </button>
        <button onClick={() => soloJson.current?.click()} disabled={validando} className="rounded-xl border border-borde px-4 py-2.5 text-sm transition hover:border-acento disabled:opacity-40">
          Solo el caso.json
        </button>
        <input ref={carpeta} type="file" className="hidden" aria-label="Carpeta del caso" {...{ webkitdirectory: "" }} multiple onChange={(e) => { elegir(e.target.files); e.target.value = ""; }} />
        <input ref={soloJson} type="file" className="hidden" aria-label="Archivo caso.json" accept=".json,application/json" onChange={(e) => { elegir(e.target.files); e.target.value = ""; }} />
      </div>
      <p className="mt-2 text-xs text-suave">
        Después de cada cambio, volvé a elegir la carpeta.
        {nombreElegido && <> Último: {nombreElegido}.</>}
      </p>

      {validando && <p className="mt-4 animate-pulse text-sm text-suave">Validando…</p>}
      {error && <p className="mt-4 text-sm text-acento">{error}</p>}

      {resultado && !validando && (
        <div className="mt-5 space-y-4">
          <div className={`flex flex-wrap items-center gap-3 rounded-xl border p-4 ${resultado.ok ? "border-ok/40 bg-ok/10" : "border-acento/40 bg-acento/10"}`}>
            <span className="text-2xl" aria-hidden>
              {resultado.ok ? "✅" : "🛑"}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{resultado.ok ? "Listo para probar" : `${cuenta("error")} ${cuenta("error") === 1 ? "error" : "errores"} para corregir`}</p>
              <p className="text-sm text-suave">
                {resultado.titulo ?? "Caso sin título"} · {cuenta("aviso")} {cuenta("aviso") === 1 ? "aviso" : "avisos"} · {cuenta("sugerencia")}{" "}
                {cuenta("sugerencia") === 1 ? "sugerencia" : "sugerencias"}
              </p>
            </div>
            {resultado.hallazgos.length > 0 && (
              <button onClick={copiar} className="rounded-xl border border-borde bg-panel px-4 py-2 text-sm font-semibold transition hover:border-acento">
                {copiado ? "¡Copiado!" : "Copiar informe para tu IA"}
              </button>
            )}
          </div>

          {NIVELES.map(({ nivel, titulo, estilo }) => {
            const lista = resultado.hallazgos.filter((h) => h.nivel === nivel);
            if (!lista.length) return null;
            return (
              <div key={nivel}>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-suave">
                  {titulo} ({lista.length})
                </h3>
                <ul className="mt-2 space-y-2">
                  {lista.map((h, i) => (
                    <li key={i} className="rounded-xl border border-borde bg-panel-2/50 p-3 text-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${estilo}`}>{NOMBRE_CAPA[h.capa]}</span>
                        <code className="break-all font-mono text-xs text-suave">{h.donde}</code>
                      </div>
                      <p className="mt-1.5">{h.mensaje[0]!.toUpperCase() + h.mensaje.slice(1)}.</p>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
