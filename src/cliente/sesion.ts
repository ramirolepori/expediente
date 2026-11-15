"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Autor } from "@/servidor/autores";

/**
 * Sesión de autor en el navegador (ADR 0012). Con Supabase: login con Google o GitHub (flujo PKCE),
 * la sesión queda guardada en este navegador y su token viaja en cada pedido. Con el login falso
 * (AUTH_FALSO=1, solo tests y desarrollo) el token es `falso:<mail>`.
 */
export type Proveedor = "google" | "github";

const CLAVE_FALSA = "expediente-autor-falso";
let cliente: SupabaseClient | null = null;

function supabaseAutores(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const clave = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !clave) return null;
  // storageKey propio: el otro cliente (Realtime de las salas) no guarda sesión
  cliente ??= createClient(url, clave, { auth: { flowType: "pkce", persistSession: true, detectSessionInUrl: true, storageKey: "expediente-autores" } });
  return cliente;
}

function leerFalso(): string | null {
  try {
    return localStorage.getItem(CLAVE_FALSA);
  } catch {
    return null;
  }
}

interface Config {
  falso: boolean;
  proveedores: Proveedor[];
}

export function useAutor() {
  const [config, setConfig] = useState<Config | null>(null);
  const [token, setToken] = useState<string | null>(null);
  // el autor queda atado al token con el que se pidió: si cambia o se borra el token, deja de valer
  const [perfil, setPerfil] = useState<{ token: string; autor: Autor } | null>(null);
  const autor = token && perfil?.token === token ? perfil.autor : null;
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // cómo se puede entrar y si ya hay una sesión guardada
  useEffect(() => {
    let vivo = true;
    fetch("/api/autores/config")
      .then((r) => r.json() as Promise<Config>)
      .then(async (c) => {
        if (!vivo) return;
        setConfig(c);
        if (c.falso) {
          setToken(leerFalso());
          return;
        }
        const sb = supabaseAutores();
        const { data } = (await sb?.auth.getSession()) ?? { data: { session: null } };
        if (vivo) setToken(data.session?.access_token ?? null);
      })
      .catch(() => vivo && setError("No se pudo cargar el login"))
      .finally(() => vivo && setCargando(false));
    const sub = supabaseAutores()?.auth.onAuthStateChange((_evento, sesion) => setToken(sesion?.access_token ?? null));
    return () => {
      vivo = false;
      sub?.data.subscription.unsubscribe();
    };
  }, []);

  const pedir = useCallback(
    (url: string, init: RequestInit = {}) =>
      fetch(url, { ...init, headers: { "Content-Type": "application/json", ...init.headers, ...(token ? { Authorization: `Bearer ${token}` } : {}) } }),
    [token],
  );

  // con token, el servidor dice quién sos y qué rol tenés
  useEffect(() => {
    if (!token) return;
    let vivo = true;
    pedir("/api/autores/yo")
      .then(async (r) => {
        const d = await r.json();
        if (!vivo) return;
        if (r.ok) setPerfil({ token, autor: d as Autor });
        else setError(d.error ?? "No se pudo entrar");
      })
      .catch(() => vivo && setError("No se pudo entrar"));
    return () => {
      vivo = false;
    };
  }, [token, pedir]);

  const entrar = useCallback(async (proveedor: Proveedor) => {
    setError(null);
    const sb = supabaseAutores();
    if (!sb) return setError("El login no está configurado");
    const { error: e } = await sb.auth.signInWithOAuth({ provider: proveedor, options: { redirectTo: `${location.origin}/autores` } });
    if (e) setError("No se pudo abrir el login");
  }, []);

  const entrarFalso = useCallback((email: string) => {
    setError(null);
    const t = `falso:${email.trim().toLowerCase()}`;
    try {
      localStorage.setItem(CLAVE_FALSA, t);
    } catch {}
    setToken(t);
  }, []);

  const salir = useCallback(async () => {
    try {
      localStorage.removeItem(CLAVE_FALSA);
    } catch {}
    await supabaseAutores()?.auth.signOut();
    setToken(null);
  }, []);

  return { config, autor, cargando: cargando || (!!token && !autor && !error), error, entrar, entrarFalso, salir, pedir };
}
