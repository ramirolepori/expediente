"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const clave = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

let cliente: SupabaseClient | null = null;

/** Cliente del navegador, solo para escuchar avisos de Realtime. Nunca lee tablas. */
export function supabaseNavegador(): SupabaseClient | null {
  if (!url || !clave) return null;
  cliente ??= createClient(url, clave, { auth: { persistSession: false, autoRefreshToken: false } });
  return cliente;
}
