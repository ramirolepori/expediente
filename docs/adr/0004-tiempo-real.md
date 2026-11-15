# 0004. Tiempo real con aviso sin datos

**Contexto.** Los canales de Supabase Realtime son públicos para quien conozca el nombre, y cada jugador ve cosas distintas.

**Decisión.** El servidor manda por broadcast solo "hubo un cambio" (`httpSend`). Cada dispositivo pide `/api/salas/[codigo]/vista`. En local, sin Supabase, se usa memoria + SSE con el mismo contrato.

**Consecuencias.** Un pedido extra por cambio y por dispositivo, a cambio de no filtrar nada por el canal. Escrituras con concurrencia optimista sobre `version`.
