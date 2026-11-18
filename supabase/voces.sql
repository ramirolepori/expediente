-- Voces efímeras de interrogatorios. La aplicación sube con la clave secreta y da URLs de lectura
-- firmadas solo a la pantalla de la sala. No hay políticas para acceso directo desde el navegador.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('voces-salas', 'voces-salas', false, 3145728, array['audio/wav'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
