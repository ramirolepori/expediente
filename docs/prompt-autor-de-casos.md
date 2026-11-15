# Prompt para escribir un caso nuevo

Copiá todo lo que está entre las líneas y pegáselo a Claude (Claude Code dentro del repo, o Claude.ai adjuntando los archivos que menciona).

---

Vas a escribir un caso nuevo para **Expediente**, una plataforma web para resolver casos de investigación en grupo, en el mismo lugar y cada uno con su dispositivo. Opcionalmente hay una tele como pantalla compartida.

## Cómo es el juego

- El grupo abre **sobres** con pruebas (informes, registros, declaraciones, un celular navegable), **interroga personajes** interpretados por una IA, abre **candados** con códigos, resuelve **minijuegos**, arma una **pizarra** con hilos y una línea de tiempo, y al final **vota** las respuestas.
- Hay un modo **traidor**: un jugador recibe una ficha secreta y juega en contra del equipo.
- **El caso tiene una sola verdad y la IA nunca la cambia.** Cada personaje recibe solo su ficha (lo que sabe, sus mentiras y sus secretos), nunca la solución. Para revelar algo, el personaje llama a una herramienta y el servidor decide si puede hacerlo según las condiciones del caso. Por eso todo se arma con hechos que tienen id y condiciones que habilitan cosas.

## Antes de escribir, leé esto

- El schema, que es la fuente de verdad: https://github.com/ramirolepori/expediente/blob/main/src/casos/schema.ts
- El contrato explicado: https://github.com/ramirolepori/expediente/blob/main/docs/contrato-de-caso.md
- Los minijuegos: https://github.com/ramirolepori/expediente/blob/main/docs/minijuegos.md
- Un caso completo de ejemplo: https://github.com/ramirolepori/expediente/blob/main/casos/hotel-aurora/caso.json
- Un minijuego personalizado de ejemplo: https://github.com/ramirolepori/expediente/blob/main/public/casos/hotel-aurora/minijuegos/caja-fuerte.html

Si tenés el repo clonado, leé esos mismos archivos localmente.

## Mi idea para el caso

[Contá acá la idea: de qué se trata, la ambientación (noir, policial, médico, terror o de época), la cantidad de jugadores, la duración, la dificultad y si querés modo traidor. Si es un caso existente que querés adaptar, pegalo o adjuntalo.]

## Cómo lo vamos a trabajar

1. **Primero la verdad.** Proponeme qué pasó realmente: víctima, culpables con su papel, móvil, medio y una cronología minuto a minuto. Tiene que ser coherente, sin huecos de horario ni contradicciones. Esperá mi OK antes de seguir.
2. **Después el diseño.** Mostrame un resumen con:
   - Personajes, con lo que cada uno sabe, miente y oculta.
   - Las pistas falsas.
   - Cómo se reparten las pruebas en 2 a 4 sobres.
   - Qué destraba qué: qué prueba hace caer cada mentira y habilita cada secreto.
   - Candados, minijuegos y las preguntas finales.
3. **Recién ahí** escribí el `caso.json` completo y los archivos extra.

## Reglas de diseño

- **Introducción sin spoilers:** que no revele la estructura del caso ("quién lo ayudó" ya adelanta que hubo cómplice).
- **Aislamiento de conocimiento:** a cada personaje ponele en `sabe` y `secretos` solo lo que esa persona puede saber. Nada más.
- **Secretos con condiciones justas:** que se destraben con pruebas o con hechos que el grupo puede conseguir antes, ni tan fácil que salgan solos ni tan difícil que queden trabados. El `como` describe cómo y en qué contexto lo cuenta.
- **Mentiras guionadas:** cada mentira dice qué sostiene el personaje, qué prueba se la hace caer (`cae`) y cómo reacciona cuando cae (`alCaer`). Que el quiebre sea gradual, no de una frase.
- **Cadena de pistas:** cada culpable tiene que poder probarse con al menos dos caminos (pruebas, secretos, minijuegos). Sumá pistas falsas creíbles que se puedan descartar.
- **Pruebas con estilo de expediente real:** usá tablas para registros, citas para declaraciones y bloques de código para logs de sistemas. Si hay un celular, aprovechá chats, llamadas, correos y notas.
- **Minijuegos:** usá los de catálogo donde sumen (`rompecabezas`, `linea_tiempo`, `cifrado`). Si querés algo distinto, armá uno `personalizado` como página HTML autocontenida, sin dependencias externas, que entre sin scroll en su `alto` y respete el contrato de mensajes de `docs/minijuegos.md`. Cada minijuego destraba una prueba con `desbloqueo: { "tipo": "minijuego", ... }`.
- **Preguntas finales sin pistas involuntarias:** las opciones tienen que tener largo y detalle parecidos, y ninguna puede nombrar algo que solo aparece si es la correcta. Usá `permiteNadie: true` en preguntas de cómplice o de autor intelectual.
- **Ayudas:** de dos a tres por sobre, de nivel 1 (sutil) a 3 (casi directo).
- **Modo traidor (si lo usás):** el objetivo del traidor tiene que ser una respuesta incorrecta pero creíble, con consejos para sembrar sospechas sin delatarse.
- **Apariencia:** a cada personaje ponele `apariencia.rasgos` a partir de su descripción (edad, cuerpo, peinado, ropa, accesorios; puede ser un animal). Los valores están en `docs/contrato-de-caso.md`. Si el caso trae retratos, que los traigan todos los personajes, con `neutral` como mínimo.
- **Español rioplatense** en todo lo que leen los jugadores.
- **No uses** `imagen` ni `roles` en las pruebas, ni el modo `competitivo`: todavía no están implementados.

## Qué entregar

1. `casos/<id>/caso.json`.
2. Si hay minijuegos personalizados: `public/casos/<id>/minijuegos/<nombre>.html`. Si hay retratos: `public/casos/<id>/retratos/<personaje>/<emocion>.jpg`.
3. La línea para registrarlo en `src/casos/registro.ts`: el import del JSON y sumarlo a `FUENTES`.
4. Si tenés acceso al repo: corré `npm run validar` y arreglá todo hasta que dé ✅. Después corré `npm test` y `npm run e2e`.
5. Un resumen corto de la solución y de cómo se llega a ella, para quien revise el caso sin jugarlo.

---
