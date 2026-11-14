# Expediente

Plataforma web para resolver casos de investigación en grupo, en el mismo lugar, cada uno con su dispositivo. Diseño completo en [docs/propuesta-plataforma.md](docs/propuesta-plataforma.md).

## Correr en local

```bash
npm install
cp .env.example .env.local   # y pegar la clave de Gemini
npm run dev -- -H 0.0.0.0
```

Abrí `http://localhost:3000`. Los celulares en la misma WiFi entran escaneando el QR del lobby (usa la IP de la red automáticamente).

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm test` | Tests del motor (reglas, guardrails, vista filtrada) |
| `npm run validar` | Valida todos los casos de `casos/` (schema, referencias, que se pueda resolver) |
| `npm run lint` | ESLint |

## Estructura

| Carpeta | Qué hay |
|---|---|
| `casos/<caso>/caso.json` | Los casos. Tienen que cumplir `src/casos/schema.ts` |
| `src/casos/` | Schema del contrato de caso y registro del catálogo |
| `src/motor/` | Lógica pura del juego: condiciones, reductor de acciones, vista filtrada por jugador, validador, prompts de interrogatorio |
| `src/servidor/` | Almacén de salas (hoy en memoria), servicio de salas y proveedor de LLM |
| `src/app/api/` | API: crear sala, unirse, acciones, eventos (SSE) e interrogar |
| `src/componentes/` | Interfaz: inicio, lobby, panel del jugador, pantalla compartida |

## Sumar un caso

1. Crear `casos/<id>/caso.json` siguiendo el schema.
2. Registrarlo en `src/casos/registro.ts`.
3. `npm run validar` hasta que dé ✅.

## Despliegue (Vercel + Supabase)

1. En Supabase, abrir **SQL Editor**, pegar [supabase/esquema.sql](supabase/esquema.sql) y ejecutarlo.
2. Completar en `.env.local` las tres variables de Supabase (ver `.env.example`).
3. `npx vercel login` (una sola vez).
4. Cargar las variables en Vercel y desplegar: `npx vercel deploy --prod`.

Con Supabase configurado, las salas se guardan en Postgres y el tiempo real usa Supabase Realtime: el servidor solo avisa "hubo un cambio" y cada dispositivo pide su vista filtrada, así la solución nunca viaja por el canal público.
