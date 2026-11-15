# 0001. Servidor autoritativo y vista filtrada

**Contexto.** Es un juego de deducción: si la solución, los secretos o los códigos llegan al navegador, se pueden ver con las herramientas de desarrollo.

**Decisión.** Todo cambio de estado pasa por el reductor del servidor (`aplicar`). Al cliente solo viaja `vistaPara(caso, estado, conexion)`, que nunca incluye `verdad`, secretos, mentiras, códigos ni personajes todavía no disponibles (se muestran como "???"). La ficha del traidor solo le llega al traidor.

**Consecuencias.** Toda funcionalidad nueva que muestre datos del caso tiene que pasar por `vista.ts` y revisarse contra spoilers. El motor es lógica pura y se testea sin red.
