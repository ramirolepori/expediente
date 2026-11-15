# 0005. Flash Lite principal y cuota del plan gratis

**Contexto.** `gemini-2.5-flash` no está disponible para cuentas nuevas. Los Flash actuales con herramientas tardan 10 a 30 s en el plan gratis. Límites vistos en AI Studio (15/11/2026):

| Modelo | RPM | TPM | RPD |
|---|---|---|---|
| gemini-3.1-flash-lite | 15 | 250K | 500 |
| Flash (3.6 / 3.8) | 5 | 250K | 20 |

**Decisión.** `gemini-3.1-flash-lite` como principal (responde en 1 a 3 s) y un Flash como respaldo con `thinkingLevel: "low"`. Configurable con `MODELO_LLM` y `MODELO_LLM_RESPALDO`.

**Consecuencias.** El respaldo se agota con 20 pedidos por día. Con 6 jugadores se puede pasar el límite por minuto del lite. Por eso los topes viven en `LIMITES_INTERROGATORIO` (`src/motor/interrogatorio.ts`): 12 preguntas por sala por minuto y 150 por partida, unas 3 partidas por día. Si el proveedor devuelve 429 no se prueba el respaldo, que se agotaría igual de rápido: el personaje "pide un minuto". Cualquier uso nuevo del LLM tiene que contarse contra estos números. Para probar sin gastar cuota: `LLM_FALSO=1`.
