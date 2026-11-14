"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import QRCode from "qrcode";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function Markdown({ children }: { children: string }) {
  return <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>;
}

export function QR({ url, tamano = 180 }: { url: string; tamano?: number }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    QRCode.toDataURL(url, { margin: 1, width: tamano * 2, color: { dark: "#111111", light: "#ffffff" } }).then(setSrc);
  }, [url, tamano]);
  // eslint-disable-next-line @next/next/no-img-element
  return src ? <img src={src} alt={`QR para unirse: ${url}`} width={tamano} height={tamano} className="rounded-lg" /> : <div style={{ width: tamano, height: tamano }} />;
}

export function useAhora(intervalo = 1000) {
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now()), intervalo);
    return () => clearInterval(t);
  }, [intervalo]);
  return ahora;
}

export function Reloj({ iniciada, limiteMin, grande }: { iniciada: number | null; limiteMin: number | null; grande?: boolean }) {
  const ahora = useAhora();
  if (!iniciada) return null;
  const transcurrido = Math.floor((ahora - iniciada) / 1000);
  const segundos = limiteMin ? Math.max(0, limiteMin * 60 - transcurrido) : transcurrido;
  const mm = String(Math.floor(segundos / 60)).padStart(2, "0");
  const ss = String(segundos % 60).padStart(2, "0");
  const urgente = limiteMin != null && segundos < 300;
  return (
    <span className={`font-mono tabular-nums ${grande ? "text-4xl" : "text-sm"} ${urgente ? "text-acento" : ""}`} title={limiteMin ? "Tiempo restante" : "Tiempo transcurrido"}>
      {limiteMin ? "⏳" : "⏱"} {mm}:{ss}
    </span>
  );
}

/** URL para unirse. Si la app se abrió como localhost, usa la IP de la red para que funcione desde los celulares. */
export function useUrlSala(codigo: string) {
  const origenNavegador = useSyncExternalStore(
    () => () => {},
    () => window.location.origin,
    () => null,
  );
  const esLocal = origenNavegador !== null && /\/\/(localhost|127\.0\.0\.1)(:|$)/.test(origenNavegador);
  const [origenRed, setOrigenRed] = useState<string | null>(null);
  useEffect(() => {
    if (!esLocal) return;
    const { port, protocol, origin } = window.location;
    fetch("/api/red")
      .then((r) => r.json())
      .then((d) => setOrigenRed(d.ip ? `${protocol}//${d.ip}${port ? `:${port}` : ""}` : origin))
      .catch(() => setOrigenRed(origin));
  }, [esLocal]);
  const origen = esLocal ? origenRed : origenNavegador;
  return origen ? `${origen}/sala/${codigo}` : null;
}

export function Punto({ color }: { color: string }) {
  return <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color }} />;
}

/**
 * Texto que se escribe solo, como una máquina de escribir.
 * Tarda como mucho unos 2,5 segundos aunque el texto sea largo, y respeta "reducir movimiento".
 */
export function Maquina({ texto, animar, className = "" }: { texto: string; animar: boolean; className?: string }) {
  const [n, setN] = useState(animar ? 0 : texto.length);
  useEffect(() => {
    if (!animar) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const t = setTimeout(() => setN(texto.length), 0);
      return () => clearTimeout(t);
    }
    const paso = Math.max(1, Math.ceil(texto.length / 120));
    const id = setInterval(() => {
      setN((x) => {
        if (x + paso >= texto.length) clearInterval(id);
        return Math.min(texto.length, x + paso);
      });
    }, 20);
    return () => clearInterval(id);
  }, [animar, texto]);
  return <span className={`${className} ${n < texto.length ? "cursor-maquina" : ""}`}>{texto.slice(0, n)}</span>;
}
