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

-- Casos de autores (ADR 0012). El JSON vive acá y nunca viaja entero al navegador: lo carga el servidor.
-- Estados: borrador (tiene errores), validado (sin errores), privado (se juega por link para probarlo)
-- y publicado (en el catálogo). `revision` marca el pedido de publicación y lo que decidió quien modera.
create table if not exists public.casos_autor (
  id             uuid primary key default gen_random_uuid(),
  autor          uuid not null references public.perfiles (id) on delete cascade,
  titulo         text not null,
  estado         text not null default 'borrador' check (estado in ('borrador', 'validado', 'privado', 'publicado')),
  revision       text check (revision in ('pedida', 'rechazada')),
  nota_revision  text,
  datos          jsonb not null,
  informe        jsonb not null default '[]'::jsonb,
  archivos       jsonb not null default '[]'::jsonb,
  revision_md    text,
  creado         timestamptz not null default now(),
  actualizado    timestamptz not null default now()
);

alter table public.casos_autor enable row level security;

create index if not exists casos_autor_autor_idx on public.casos_autor (autor);
create index if not exists casos_autor_estado_idx on public.casos_autor (estado);

-- Imágenes de los casos de autores: lectura pública (las rutas llevan el id del caso, que no se adivina),
-- escritura solo con URLs firmadas que da el servidor. Hasta 3 MB y solo jpg, png o webp.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('casos-autores', 'casos-autores', true, 3145728, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
