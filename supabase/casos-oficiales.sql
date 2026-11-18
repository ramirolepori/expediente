-- ADR 0012: catálogo oficial. Solo el servidor lee los expedientes completos.
create table if not exists public.casos_oficiales (
  id text primary key,
  datos jsonb not null check ((datos #>> '{meta,id}') is not distinct from id),
  revision_md text,
  prompts_imagenes_md text
);

alter table public.casos_oficiales enable row level security;
revoke all on table public.casos_oficiales from public, anon, authenticated;
grant select, insert on table public.casos_oficiales to service_role;
