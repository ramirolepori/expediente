# 0007. Pruebas sin simular partidas en producción

**Contexto.** Probar a mano en producción gasta cuota de Gemini y ensucia Supabase.

**Decisión.** Vitest para el motor, Playwright e2e con salas en memoria y modelo falso (puerto 3100, `.next-e2e`), `npm run humo -- <url>` contra un despliegue, y `npm run validar` para los casos. Vercel corre tests y validación antes de compilar.

**Consecuencias.** El e2e falla si se editan archivos mientras corre (el servidor de desarrollo recompila). Antes de correrlo: `pkill -f "next dev -p 3100"; rm -rf .next-e2e test-results`.
