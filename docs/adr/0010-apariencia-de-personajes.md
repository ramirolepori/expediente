# 0010. Apariencia de los personajes: retratos o vectorial, y emoción desde el modelo

**Contexto.** El interrogatorio era solo texto. En `/laboratorio/personaje` se compararon dos estilos: retratos realistas (una imagen por emoción) y un vectorial SVG animado. El vectorial estaba pensado para hombres adultos de traje.

**Decisión.** Ramiro eligió: retratos si el caso los trae, vectorial generado por la plataforma si no.

- Contrato: `personaje.apariencia = { rasgos?, retratos? }`. Con `retratos.neutral` se usa `PersonajeRetrato`; si no, `PersonajeVectorial`. El validador exige `neutral` y que existan los archivos, y avisa si un caso mezcla los dos estilos.
- Rasgos extensibles, todos opcionales: especie (humano, perro, gato, loro), cuerpo (femenino, masculino, neutro), edad (bebé a mayor, cambia proporciones), peinados, vello, maquillaje, ropa, anteojos y accesorios. `rasgosPara` completa lo que falta a partir de `voz.genero`, `edad` y `voz.edad`, con colores elegidos por un hash del `id`.
- La apariencia no es secreta, pero viaja solo para personajes disponibles: los bloqueados siguen siendo "???" (ADR 0001).
- Emoción: el modelo empieza cada respuesta con `[emocion: X]`, que el servidor separa del texto y guarda en el mensaje. Se descartó una herramienta `emocion()` porque puede sumar un paso más del modelo, y una segunda llamada para clasificar porque gasta cuota (ADR 0005). Si el modelo no pone la etiqueta, queda `neutral`.
- "Hablando": mientras se escribe la respuesta en pantalla o mientras suena la voz de Piper en ese dispositivo.

**Consecuencias.** Un caso sin `apariencia` igual se ve con personajes distintos. Sumar un rasgo nuevo es agregar el valor al schema y su dibujo en `PersonajeVectorial`. Cómo se consiguen los retratos (si los genera la herramienta de autor o los trae el autor) queda para cuando se defina la herramienta de autor.
