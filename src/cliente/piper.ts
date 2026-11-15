"use client";

import type { VozPiper } from "@/motor/voz";
import { oraciones, wav } from "./voces";

/**
 * Piper en el navegador (ADR 0009). onnxruntime y el fonemizador se cargan desde jsDelivr con
 * versión fija e integridad, y solo cuando alguien activa las voces. Los modelos vienen de
 * rhasspy/piper-voices en un commit fijo y quedan guardados con la Cache API.
 */
const ORT = {
  src: "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.31.1/dist/ort.wasm.min.js",
  integrity: "sha256-uKeMQIxA2mX9yLoIRveylI6SpMbWsjzI5BZeQorZVEM=",
  base: "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.31.1/dist/",
};
const FONEMIZADOR = {
  src: "https://cdn.jsdelivr.net/npm/@diffusionstudio/piper-wasm@1.0.0/build/piper_phonemize.js",
  integrity: "sha256-/vDC/EQtJP3vXHx8w31dojFEB2QP4Rqxv+NHxyPf8Zs=",
  base: "https://cdn.jsdelivr.net/npm/@diffusionstudio/piper-wasm@1.0.0/build/",
};
const MODELOS = "https://huggingface.co/rhasspy/piper-voices/resolve/6b9cfaacb4fb2e02a9621227e3c1a48bec9710c3/es/";
const CACHE = "expediente-voces-v1";

type Tensor = unknown;
interface Ort {
  env: { wasm: { wasmPaths: string; numThreads: number } };
  Tensor: new (tipo: string, datos: BigInt64Array | Float32Array, forma: number[]) => Tensor;
  InferenceSession: { create(modelo: ArrayBuffer, opciones: object): Promise<Sesion> };
}
interface Sesion {
  run(feeds: Record<string, Tensor>): Promise<{ output: { data: Float32Array } }>;
}
interface ConfigModelo {
  espeak: { voice: string };
  inference: { noise_scale: number; noise_w: number };
  audio: { sample_rate: number };
}
interface ModuloFonemizador {
  callMain(args: string[]): void;
}
type CrearFonemizador = (opciones: {
  print: (linea: string) => void;
  printErr: (linea: string) => void;
  locateFile: (archivo: string) => string;
}) => Promise<ModuloFonemizador>;

const global = () => window as unknown as { ort?: Ort; createPiperPhonemize?: CrearFonemizador };

const scripts = new Map<string, Promise<void>>();
function cargarScript({ src, integrity }: { src: string; integrity: string }) {
  if (!scripts.has(src)) {
    scripts.set(
      src,
      new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.src = src;
        s.integrity = integrity;
        s.crossOrigin = "anonymous";
        s.onload = () => resolve();
        s.onerror = () => {
          scripts.delete(src);
          reject(new Error(`No se pudo cargar ${src}`));
        };
        document.head.appendChild(s);
      }),
    );
  }
  return scripts.get(src)!;
}

async function ort(): Promise<Ort> {
  await cargarScript(ORT);
  const o = global().ort!;
  o.env.wasm.wasmPaths = ORT.base;
  // con varios hilos hace falta aislamiento entre orígenes (COOP/COEP), que la app no tiene
  o.env.wasm.numThreads = 1;
  return o;
}

type Progreso = (cargado: number, total: number) => void;

/** Baja un archivo o lo saca de la caché. La Cache API no existe fuera de HTTPS: ahí se baja siempre. */
async function bajar(url: string, progreso?: Progreso): Promise<ArrayBuffer> {
  const cache = typeof caches === "undefined" ? null : await caches.open(CACHE).catch(() => null);
  const guardado = await cache?.match(url);
  if (guardado) return guardado.arrayBuffer();
  const r = await fetch(url);
  if (!r.ok || !r.body) throw new Error(`No se pudo bajar ${url} (${r.status})`);
  const total = Number(r.headers.get("content-length")) || 0;
  const partes: Uint8Array[] = [];
  let cargado = 0;
  const lector = r.body.getReader();
  for (;;) {
    const { done, value } = await lector.read();
    if (done) break;
    partes.push(value);
    cargado += value.length;
    progreso?.(cargado, total);
  }
  const datos = await new Blob(partes as BlobPart[]).arrayBuffer();
  await cache?.put(url, new Response(datos.slice(0))).catch(() => {});
  return datos;
}

interface Modelo {
  sesion: Sesion;
  config: ConfigModelo;
}
const modelos = new Map<string, Promise<Modelo>>();
const listos = new Set<string>();

function modelo(ruta: string, progreso?: Progreso): Promise<Modelo> {
  if (!modelos.has(ruta)) {
    const carga = (async () => {
      const o = await ort();
      const config = JSON.parse(new TextDecoder().decode(await bajar(`${MODELOS}${ruta}.onnx.json`))) as ConfigModelo;
      const sesion = await o.InferenceSession.create(await bajar(`${MODELOS}${ruta}.onnx`, progreso), { executionProviders: ["wasm"] });
      listos.add(ruta);
      return { sesion, config };
    })();
    carga.catch(() => modelos.delete(ruta));
    modelos.set(ruta, carga);
  }
  return modelos.get(ruta)!;
}

export const modeloListo = (ruta: string) => listos.has(ruta);

/** Baja de antemano los modelos que va a usar el caso. El progreso suma los bytes de todos. */
export async function precargar(rutas: string[], progreso: (fraccion: number) => void) {
  const avance = new Map<string, [number, number]>();
  const informar = () => {
    const [c, t] = [...avance.values()].reduce(([a, b], [x, y]) => [a + x, b + y], [0, 0]);
    if (t) progreso(c / t);
  };
  await Promise.all(
    rutas.map((r) =>
      modelo(r, (c, t) => {
        avance.set(r, [c, t]);
        informar();
      }),
    ),
  );
  progreso(1);
}

async function fonemas(texto: string, voz: string): Promise<number[]> {
  await cargarScript(FONEMIZADOR);
  const lineas: string[] = [];
  const m = await global().createPiperPhonemize!({
    print: (l) => lineas.push(l),
    printErr: (l) => console.warn("Piper:", l),
    locateFile: (archivo) => FONEMIZADOR.base + archivo,
  });
  m.callMain(["-l", voz, "--input", JSON.stringify([{ text: texto }]), "--espeak_data", "/espeak-ng-data"]);
  return lineas.flatMap((l) => (JSON.parse(l) as { phoneme_ids: number[] }).phoneme_ids);
}

/** Genera el audio de una respuesta con la voz del personaje. */
export async function sintetizar(texto: string, voz: VozPiper): Promise<Blob> {
  const o = await ort();
  const { sesion, config } = await modelo(voz.modelo);
  const partes: Float32Array[] = [];
  for (const oracion of oraciones(texto)) {
    const ids = await fonemas(oracion, config.espeak.voice);
    if (!ids.length) continue;
    const { output } = await sesion.run({
      input: new o.Tensor("int64", BigInt64Array.from(ids, BigInt), [1, ids.length]),
      input_lengths: new o.Tensor("int64", BigInt64Array.from([BigInt(ids.length)]), [1]),
      // se genera más lento o más rápido en proporción a la altura, que al reproducirlo a otra frecuencia lo compensa
      scales: new o.Tensor("float32", Float32Array.from([config.inference.noise_scale * voz.expresividad, voz.lengthScale * voz.altura, config.inference.noise_w * voz.expresividad]), [3]),
      ...(voz.hablante !== undefined && { sid: new o.Tensor("int64", BigInt64Array.from([BigInt(voz.hablante)]), [1]) }),
    });
    partes.push(output.data);
  }
  const todo = new Float32Array(partes.reduce((n, p) => n + p.length, 0));
  partes.reduce((offset, p) => (todo.set(p, offset), offset + p.length), 0);
  return wav(todo, Math.round(config.audio.sample_rate * voz.altura));
}
