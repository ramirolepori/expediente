@AGENTS.md

# Expediente: guía para sesiones

Juego web de casos de investigación en grupo, cada jugador con su dispositivo y una tele opcional. Producción en Vercel, repo público `ramirolepori/expediente`.

## Antes de arrancar una tarea

1. Leé [docs/estado.md](docs/estado.md): qué está hecho, qué sigue y qué espera decisión de Ramiro.
2. Para entender el código: [docs/arquitectura.md](docs/arquitectura.md). Para el porqué de las cosas: [docs/adr/](docs/adr/README.md).
3. Si tocás casos: [docs/contrato-de-caso.md](docs/contrato-de-caso.md) y `src/casos/schema.ts`.

## Reglas del proyecto

- **Todo gratis** (ADR 0003). No sumar servicios pagos ni configurar facturación.
- **La solución nunca viaja al cliente** (ADR 0001). Todo dato nuevo pasa por `src/motor/vista.ts`.
- **Cuota de Gemini** (ADR 0005): cada llamada nueva al LLM cuenta contra 15 RPM / 500 RPD. Para probar, `LLM_FALSO=1`.
- **Next.js 16**: leé `node_modules/next/dist/docs/` antes de usar APIs de Next (ver AGENTS.md).
- **Docs:** `docs/` documenta lo construido. Ideas y propuestas de mejora se charlan en el chat, no en archivos.
- Lo que leen los jugadores va en español rioplatense.
- Lo que esté en "Esperando decisión de Ramiro" no se avanza sin él.

## Verificar y entregar

- `npm test`, `npm run validar`, `npm run lint`. Si tocaste UI o flujo: `pkill -f "next dev -p 3100"; rm -rf .next-e2e test-results; npm run e2e` y no edites archivos mientras corre.
- Cambios visibles: revisalos en el navegador (laboratorio o partida con dos pestañas).
- Commit y push a `main` despliega solo (Vercel corre tests y validación antes de compilar). Después: `npm run humo` (prueba https://expediente-lemon.vercel.app).
- Al cerrar la tarea: actualizá `docs/estado.md`, y si tomaste una decisión de diseño que cambia algo, sumá una ADR en `docs/adr/`.
