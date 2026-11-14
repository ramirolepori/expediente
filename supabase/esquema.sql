-- Expediente: tabla de salas. Pegar y ejecutar en Supabase → SQL Editor.
-- Solo el servidor (clave secreta) accede; RLS activado sin políticas bloquea el acceso público.

create table if not exists public.salas (
  codigo      text primary key,
  estado      jsonb not null,
  tokens      jsonb not null default '{}'::jsonb,
  version     integer not null default 0,
  actualizada timestamptz not null default now()
);

alter table public.salas enable row level security;

create index if not exists salas_actualizada_idx on public.salas (actualizada);
