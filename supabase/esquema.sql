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

-- Autores (ADR 0012). El login es con Supabase Auth (Google y GitHub); estas tablas las usa solo el servidor.
-- Un perfil por usuario que entró alguna vez a /autores.
create table if not exists public.perfiles (
  id      uuid primary key references auth.users (id) on delete cascade,
  email   text not null,
  nombre  text,
  creado  timestamptz not null default now()
);

-- Mails con permiso de moderar (aprobar casos). Los administradores salen de la variable ADMIN_EMAILS de Vercel.
create table if not exists public.moderadores (
  email      text primary key,
  agregado   timestamptz not null default now()
);

alter table public.perfiles enable row level security;
alter table public.moderadores enable row level security;
