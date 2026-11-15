# 0002. Personajes con ficha aislada y revelaciones validadas

**Contexto.** La IA tiende a inventar o a cambiar la historia. El caso necesita una sola verdad fija.

**Decisión.** Cada personaje recibe solo su ficha (`sabe`, `mentiras`, secretos habilitados). Para revelar un hecho llama a la herramienta `revelar(clave)` y el servidor decide con las condiciones del caso. Las mentiras traen `cae` y `alCaer` guionados. `limpiarRespuesta` quita etiquetas filtradas.

**Consecuencias.** El progreso del caso nunca depende del texto libre del modelo, solo de hechos con id. Los casos se diseñan como grafo de hechos y condiciones, y el validador comprueba que todo sea alcanzable.
