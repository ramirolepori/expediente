# Expediente

Plataforma web para resolver casos de investigación en grupo, en el mismo lugar, cada uno con su dispositivo. Arquitectura en [docs/arquitectura.md](docs/arquitectura.md), decisiones en [docs/adr/](docs/adr/README.md) y estado en [docs/estado.md](docs/estado.md). La propuesta original está en [docs/propuesta-plataforma.md](docs/propuesta-plataforma.md).

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
| `npm run validar` | Valida los paquetes archivados de Hotel Aurora y la Vendimia sin conectarse a Supabase |
| `npm run lint` | ESLint |

## Estructura

| Carpeta | Qué hay |
|---|---|
| `src/casos/` | Schema del contrato, ids del catálogo oficial y caso de laboratorio |
| `src/motor/` | Lógica pura del juego: condiciones, reductor de acciones, vista filtrada por jugador, validador, prompts de interrogatorio |
| `src/servidor/` | Almacén de salas, catálogo en Supabase y proveedor de LLM |
| `src/app/api/` | API: crear sala, unirse, acciones, eventos (SSE) e interrogar |
| `src/componentes/` | Interfaz: inicio, lobby, panel del jugador, pantalla compartida |

## Sumar un caso

Armá el paquete siguiendo el [contrato](docs/contrato-de-caso.md) y subilo desde [/autores](https://expediente-lemon.vercel.app/autores) para validarlo, probarlo y pedir su publicación.

## Despliegue (Vercel + Supabase)

1. En un proyecto nuevo, ejecutar [supabase/esquema.sql](supabase/esquema.sql) desde **SQL Editor**. Después, o si el esquema base ya existe, ejecutar [supabase/casos-oficiales.sql](supabase/casos-oficiales.sql).
2. Completar en `.env.local` las tres variables de Supabase (ver `.env.example`).
3. Antes del primer despliegue con el catálogo oficial, seguí [la importación de los casos](#importar-los-casos-oficiales).
4. Cargar las variables en Vercel, iniciar sesión con `npx vercel login` y desplegar con `npx vercel deploy --prod`.

Con Supabase configurado, las salas se guardan en Postgres y el tiempo real usa Supabase Realtime: el servidor solo avisa "hubo un cambio" y cada dispositivo pide su vista filtrada, así la solución nunca viaja por el canal público.

### Importar los casos oficiales

1. Corré `npm run migrar:oficiales` para validar los paquetes sin escribir.
2. Con autorización para el proyecto de destino, exportá `NEXT_PUBLIC_SUPABASE_URL` y `SUPABASE_SECRET_KEY` en la terminal y corré `npm run migrar:oficiales -- --aplicar`. El comando admite reintentos con los mismos datos y no reemplaza filas ni imágenes existentes.
3. Corré `npm run validar -- --verificar-destino` con esas mismas variables. Vercel también hace esta verificación de solo lectura antes del despliegue de producción. Después del despliegue, corré `npm run humo -- <url>`.

Los JSON y documentos de autor van a `casos_oficiales` (sin acceso desde el navegador); las imágenes a `casos-autores/oficiales/`. Los ids de las salas no cambian. La caja fuerte HTML sigue siendo código de la app: la combinación la comprueba el servidor. Quitar los expedientes del árbol actual no los borra del historial público de Git.

Los comandos de desarrollo, validación y tests preparan una copia congelada en `.casos-local/` desde ese historial (o GitHub si el checkout es superficial). Sin Supabase, la app local puede usar esa copia; no se sirve ni se empaqueta en Vercel.

## Cómo se prueba

| Comando | Qué hace | Cuánto tarda |
|---|---|---|
| `npm test` | Tests del motor (reglas, guardrails, vista filtrada) | ~1 s |
| `npm run e2e` | Juega partidas completas en un navegador automático: dos jugadores, la tele, sobres, celular, interrogatorios, candados, votación y salir. Usa salas en memoria y un modelo falso (`LLM_FALSO=1`), así no gasta Gemini ni toca Supabase | ~15 s |
| `npm run humo -- <url>` | Prueba rápida contra un despliegue: responde, guarda salas, abre sobres. Con `--con-modelo` hace una pregunta real | ~8 s |
| `npm run verificar` | Lint, tests, validación de casos y e2e, en ese orden | ~30 s |

El modelo falso responde "Respuesta de prueba" y, si la pregunta incluye `[revelar:clave]`, primero intenta revelar esa clave, para probar los guardrails.

GitHub Actions corre todo esto en cada push a `main`, y la prueba rápida cada vez que Vercel termina un despliegue a producción.
