"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { Accion, TipoConexion } from "@/motor/tipos";
import type { VistaPartida } from "@/motor/vista";
import { supabaseNavegador } from "./supabase";

/**
 * La identidad vive por pestaña (sessionStorage) y por tipo: así una misma PC puede tener
 * abierto el panel personal y la pantalla compartida a la vez sin que se pisen.
 */
const clave = (codigo: string, tipo: TipoConexion) => `expediente:${codigo}:${tipo}`;

function leerToken(codigo: string, tipo: TipoConexion): string | null {
  try {
    return sessionStorage.getItem(clave(codigo, tipo));
  } catch {
    return null;
  }
}

export function useSala(codigo: string, tipo: TipoConexion) {
  // undefined = todavía no se leyó (render del servidor)
  const guardado = useSyncExternalStore(
    () => () => {},
    () => leerToken(codigo, tipo),
    () => undefined,
  );
  const [propio, setToken] = useState<string | null | undefined>(undefined);
  const token = propio !== undefined ? propio : guardado;
  const listo = token !== undefined;
  const [vista, setVista] = useState<VistaPartida | null>(null);
  const [conectado, setConectado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fuente = useRef<EventSource | null>(null);

  // Tiempo real. Con Supabase: escuchar avisos de cambio y pedir la vista filtrada.
  // Sin Supabase (desarrollo local): stream SSE del servidor.
  useEffect(() => {
    if (!token) return;
    const q = `token=${encodeURIComponent(token)}`;
    const olvidarToken = (status: number) => {
      try {
        sessionStorage.removeItem(clave(codigo, tipo));
      } catch {}
      setToken(null);
      setError(status === 404 ? "La sala ya no existe." : null);
    };

    const sb = supabaseNavegador();
    if (sb) {
      let activo = true;
      let pidiendo = false;
      let pendiente = false;
      const pedirVista = async () => {
        if (pidiendo) {
          pendiente = true;
          return;
        }
        pidiendo = true;
        try {
          const r = await fetch(`/api/salas/${codigo}/vista?${q}`, { cache: "no-store" });
          if (r.status === 401 || r.status === 404) return olvidarToken(r.status);
          if (r.ok && activo) {
            const v = (await r.json()) as VistaPartida;
            setVista((actual) => (actual && actual.version > v.version ? actual : v));
          }
        } catch {
          // sin red: el próximo aviso o el sondeo lo reintenta
        } finally {
          pidiendo = false;
          if (pendiente && activo) {
            pendiente = false;
            pedirVista();
          }
        }
      };
      const canal = sb
        .channel(`sala-${codigo}`)
        .on("broadcast", { event: "cambio" }, () => pedirVista())
        .subscribe((estado) => {
          setConectado(estado === "SUBSCRIBED");
          if (estado === "SUBSCRIBED") pedirVista();
        });
      pedirVista();
      // red de seguridad por si se pierde un aviso
      const sondeo = setInterval(pedirVista, 15000);
      const alVolver = () => document.visibilityState === "visible" && pedirVista();
      document.addEventListener("visibilitychange", alVolver);
      return () => {
        activo = false;
        clearInterval(sondeo);
        document.removeEventListener("visibilitychange", alVolver);
        sb.removeChannel(canal);
      };
    }

    const es = new EventSource(`/api/salas/${codigo}/eventos?${q}`);
    fuente.current = es;
    es.onopen = () => setConectado(true);
    es.onmessage = (e) => {
      setVista(JSON.parse(e.data));
      setConectado(true);
    };
    es.onerror = () => {
      setConectado(false);
      fetch(`/api/salas/${codigo}/vista?${q}`)
        .then((r) => {
          if (r.status === 401 || r.status === 404) {
            es.close();
            olvidarToken(r.status);
          }
        })
        .catch(() => {});
    };
    return () => es.close();
  }, [codigo, tipo, token]);

  /** después de una acción propia, no esperar al aviso para ver el resultado */
  const refrescar = useCallback(async () => {
    if (!token || !supabaseNavegador()) return;
    const r = await fetch(`/api/salas/${codigo}/vista?token=${encodeURIComponent(token)}`, { cache: "no-store" });
    if (r.ok) {
      const v = (await r.json()) as VistaPartida;
      setVista((actual) => (actual && actual.version > v.version ? actual : v));
    }
  }, [codigo, token]);

  const unirse = useCallback(
    async (apodo: string) => {
      setError(null);
      const r = await fetch(`/api/salas/${codigo}/unirse`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apodo, tipo }),
      });
      const datos = await r.json();
      if (!r.ok) {
        setError(datos.error);
        return;
      }
      try {
        sessionStorage.setItem(clave(codigo, tipo), datos.token);
      } catch {}
      setToken(datos.token);
    },
    [codigo, tipo],
  );

  const accion = useCallback(
    async (a: Accion, alError?: (mensaje: string) => void) => {
      const r = await fetch(`/api/salas/${codigo}/accion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, accion: a }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        (alError ?? setError)(d.error ?? "No se pudo");
        return false;
      }
      setError(null);
      refrescar();
      return true;
    },
    [codigo, token, refrescar],
  );

  const interrogar = useCallback(
    async (personaje: string, texto: string, prueba?: string) => {
      const r = await fetch(`/api/salas/${codigo}/interrogar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, personaje, texto, prueba }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        if (r.status !== 503) setError(d.error ?? "No se pudo");
        return false;
      }
      setError(null);
      refrescar();
      return true;
    },
    [codigo, token, refrescar],
  );

  const salir = useCallback(async () => {
    if (token) {
      await fetch(`/api/salas/${codigo}/accion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, accion: { tipo: "salir" } }),
      }).catch(() => {});
    }
    try {
      sessionStorage.removeItem(clave(codigo, tipo));
    } catch {}
  }, [codigo, tipo, token]);

  return { listo, token, vista, conectado, error, setError, unirse, accion, interrogar, salir };
}
