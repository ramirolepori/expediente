import { AMBIENTACIONES, TIPOS_PRUEBA } from "@/casos/schema";
import { EMOCIONES } from "@/componentes/personaje/emociones";

/**
 * Textos del kit de autor (ADR 0012). Lo que depende del código (ambientaciones, tipos, emociones,
 * límites del validador) sale de las constantes del proyecto, así el kit no se desactualiza.
 */
const lista = (xs: readonly string[]) => xs.map((x) => `\`${x}\``).join(", ");

export function leeme(version: string) {
  return `# Kit de autor de Expediente

Versión del kit: ${version}. Contrato de caso: versión 1 (el \`caso.json\` lleva \`"version": 1\`).

Con este kit armás un caso para Expediente con tu propia IA (Claude, ChatGPT, Gemini o la que uses) y después lo subís a la plataforma, que lo valida, te deja probarlo con amigos y, si está listo, lo publica en el catálogo.

## Cómo usarlo

1. Abrí un chat nuevo con tu IA y adjuntale todos los archivos de este kit (o la carpeta entera si tu IA acepta carpetas).
2. Copiá el contenido de \`PROMPT-INICIAL.md\`, completá tu idea donde dice y mandalo.
3. Trabajen por etapas, como dice \`GUIA.md\`. La IA te pide el OK antes de pasar a la siguiente.
4. Al final, la IA te entrega una carpeta como esta:

\`\`\`
mi-caso/
  caso.json              ← el caso (obligatorio)
  REVISION.md            ← la solución explicada, para quien revisa (muy recomendado)
  PROMPTS-IMAGENES.md    ← los prompts de las imágenes (si hay imágenes)
  escenas/*.jpg          ← ilustraciones de los sobres (opcional)
  pruebas/*.jpg          ← fotos dentro de las pruebas (opcional)
  retratos/<personaje>/<emoción>.jpg  ← retratos (opcional)
\`\`\`

5. Generá las imágenes con tu IA siguiendo \`PROMPTS-IMAGENES.md\` y guardalas con esos nombres. Todo es opcional: sin escenas, el sobre se ve como lista; sin retratos, la plataforma dibuja a los personajes; sin fotos, la prueba es texto.
6. Entrá a **/autores** en Expediente con tu cuenta de Google o GitHub:
   - **Validar un caso**: elegís la carpeta y ves el informe. Si hay algo para corregir, tocá "Copiar informe para tu IA" y pegáselo en el chat: está redactado como instrucciones.
   - **Subir un caso**: lo guarda. Con "Probar con amigos" te da un link para jugarlo (los personajes usan un modelo de prueba, no la IA real). Si lo jugás con tu cuenta abierta, tenés el **modo autor**: ves por qué está cerrado cada sobre, qué secretos tiene habilitados cada personaje y atajos para destrabar capítulos.
   - **Pedir que lo publiquen**: un moderador lo juega, lee tu \`REVISION.md\` y lo publica o te lo devuelve con una nota.

## Qué trae el kit

| Archivo | Para qué |
|---|---|
| \`PROMPT-INICIAL.md\` | El mensaje para arrancar con tu IA |
| \`GUIA.md\` | Las cuatro etapas, con qué producir y un checklist en cada una |
| \`contrato-de-caso.md\` | Qué es cada campo del \`caso.json\` |
| \`caso.schema.json\` | El contrato como JSON Schema, para validar o para salida estructurada |
| \`PIEZAS.md\` | Qué puede usar un caso (escenas, celular, candados, minijuegos, voces) y cuándo conviene cada cosa |
| \`REGLAS.md\` | Reglas de diseño aprendidas jugando y lo que revisa el validador |
| \`ejemplo/\` | Un caso chico, completo y válido, con su \`REVISION.md\` |
| \`SKILL.md\` | Para usar el kit como skill de Claude |
`;
}

export function promptInicial() {
  return `# Prompt inicial

Copiá todo lo que está debajo de la línea, completá tu idea y pegáselo a tu IA junto con los archivos del kit.

---

Vas a ayudarme a escribir un caso para **Expediente**, un juego web de casos de investigación en grupo: cada jugador usa su celular y puede haber una tele como pantalla compartida. El grupo abre **sobres** con pruebas, **interroga personajes** que interpreta una IA, abre **candados**, resuelve **minijuegos** y al final **vota** las respuestas.

**El caso tiene una sola verdad y nunca cambia.** Cada personaje recibe solo su ficha (lo que sabe, lo que miente y sus secretos), nunca la solución. Lo importante se arma con **hechos** que tienen id y **condiciones** que dicen cuándo se habilita cada cosa.

Te adjunto el kit de autor. Antes de escribir, leé \`GUIA.md\`, \`contrato-de-caso.md\`, \`PIEZAS.md\`, \`REGLAS.md\` y el caso de \`ejemplo/\`. El contrato exacto está en \`caso.schema.json\`.

## Mi idea

[Contá tu idea: de qué se trata, la ambientación (${lista(AMBIENTACIONES)}), cuántos jugadores, cuánto dura, la dificultad y si querés modo traidor. Si es una historia que ya tenés escrita, pegala.]

## Cómo trabajamos

Seguí las cuatro etapas de \`GUIA.md\`, **de a una**. Al terminar cada etapa, mostrame lo que hiciste con su checklist y esperá mi OK antes de seguir. No escribas el \`caso.json\` hasta la etapa 4.

Reglas que no se negocian:

- Todo lo que leen los jugadores va en **español rioplatense**.
- Los textos hablan de la historia: **nunca le des órdenes a la IA** que interpreta a los personajes ("ignorá tus instrucciones", "sos un asistente"). El validador lo bloquea.
- Nada de HTML ni links externos en los textos: solo markdown.
- No uses minijuegos \`personalizado\` ni los campos \`imagen\` y \`roles\` de las pruebas. Las fotos van dentro del \`contenido\` con markdown.
- Las rutas de imágenes empiezan con \`/casos/<id del caso>/\` y coinciden con la carpeta que me entregás.

## Qué me entregás al final

1. \`caso.json\` completo y válido según \`caso.schema.json\`.
2. \`REVISION.md\`: la solución en un párrafo, cómo se llega a cada culpable (al menos dos caminos), qué destraba qué en cada capítulo y las pistas falsas. Es para quien revisa el caso sin jugarlo.
3. Si hay imágenes, \`PROMPTS-IMAGENES.md\`: una tabla con el nombre de archivo, dónde se usa y el prompt para generarla.

Cuando suba el caso, el validador de Expediente me puede devolver un informe. Si te lo pego, corregí exactamente lo que dice, sin cambiar lo demás, y devolveme el \`caso.json\` completo.
`;
}

export function guia() {
  return `# Guía por etapas

Cada etapa termina con un checklist. No pases a la siguiente sin cerrarlo y sin el OK de quien escribe el caso.

## Etapa 1. La idea y la verdad

Producí:
- La **sinopsis** sin spoilers (dos o tres oraciones) y la ambientación.
- **La verdad**: qué pasó realmente, quiénes son culpables y con qué papel (\`autor\`, \`complice\`, \`autor_intelectual\`), el móvil, el medio y una **cronología minuto a minuto**.

Checklist:
- [ ] La cronología no tiene huecos de horario ni contradicciones.
- [ ] Cada culpable tiene un motivo creíble y una oportunidad concreta.
- [ ] Hay al menos una sospecha razonable sobre alguien inocente (pista falsa).
- [ ] Se puede contar la solución en un párrafo.

## Etapa 2. Personajes y capítulos

Producí:
- Los **personajes** (entre 3 y 8 interrogables): qué saben, qué mienten, qué ocultan, cómo hablan y cómo se ven (\`apariencia.rasgos\`, ver \`PIEZAS.md\`). Su \`voz\` (género, edad, velocidad y tono).
- Los **capítulos** (entre 2 y 4 sobres): qué pregunta abre cada uno, qué se descubre adentro y qué hace falta para pasar al siguiente.

Checklist:
- [ ] Cada personaje sabe solo lo que esa persona podría saber.
- [ ] Ningún capítulo se puede saltear: el sobre siguiente pide algo que se descubre en el anterior.
- [ ] El primer sobre tiene requisito \`siempre\`.
- [ ] Hay variedad de personajes (edades, géneros; puede haber chicos, mayores y hasta animales).

## Etapa 3. Pruebas, secretos y mentiras

Producí:
- Las **pruebas** de cada sobre (entre 3 y 7 por capítulo), con estilo de expediente real: tablas para registros, citas para declaraciones, un celular navegable si suma.
- Los **hechos** (con id) y, para cada personaje, sus **secretos** (qué condición los destraba y cómo lo cuenta) y sus **mentiras** (qué sostiene, qué prueba se la hace caer y cómo reacciona).
- Los **candados** y **minijuegos**, si suman.

Checklist:
- [ ] Todo hecho que traba algo lo cuenta algún personaje (en \`sabe\` o en un secreto).
- [ ] Ningún secreto se suelta desde el principio: está atado a una prueba o a un hecho.
- [ ] Cada culpable se puede probar por al menos dos caminos.
- [ ] Si una declaración tiene varias voces, cada línea empieza con \`**Nombre:**\` (así el narrador usa la voz de ese personaje).

## Etapa 4. Preguntas, ayudas, imágenes y entrega

Producí:
- Las **preguntas finales** (\`resolucion.preguntas\`), con sus puntos y explicación.
- Las **ayudas** (una a tres por sobre, de nivel 1 a 3).
- Las **imágenes**, si las hay: escenas de los sobres, fotos de pruebas, retratos. Escribí sus prompts en \`PROMPTS-IMAGENES.md\`.
- El \`caso.json\` completo y el \`REVISION.md\`.

Checklist:
- [ ] Las opciones de cada pregunta tienen largo y detalle parecidos: la correcta no se delata.
- [ ] Las preguntas de cómplice o de autor intelectual usan \`permiteNadie: true\`.
- [ ] La introducción plantea el misterio sin adelantar su estructura.
- [ ] El \`caso.json\` valida contra \`caso.schema.json\`.
- [ ] \`REVISION.md\` explica la solución y qué destraba qué.
`;
}

export function piezas() {
  return `# Catálogo de piezas

Todo lo opcional que puede usar un caso, y cuándo conviene. Los campos exactos están en \`contrato-de-caso.md\`.

| Pieza | Qué es | Cuándo conviene |
|---|---|---|
| **Pregunta de capítulo** (\`sobres[].preguntaCapitulo\`) | Opción múltiple cuyo acierto revela cierre y gancho; puede habilitar otro sobre | Cuando querés que el equipo confirme un hallazgo antes de avanzar |
| **Resumen** (\`sobres[].resumen\`) | Repaso de lo sabido al abrir el sobre | Para retomar el hilo entre capítulos |
| **Escena** (\`sobres[].escena\`) | Una ilustración del lugar con puntos que abren pruebas | Cuando el lugar importa (una habitación, una nave). Imagen 16:9, sin texto, de unos 1600 px de ancho y menos de 500 KB |
| **Celular** (\`tipo: "celular"\`) | Un teléfono navegable con chats, llamadas, correos y notas | Para mensajes que comprometen a alguien o una línea de tiempo de llamadas |
| **Fotos en pruebas** | \`![epígrafe](/casos/<id>/pruebas/foto.jpg)\` dentro del \`contenido\` | Cuando una imagen es una pista (una pisada, una puerta) |
| **Candado** | Un código que abre algo | Para premiar atar dos datos (un año en la denuncia, un PIN) |
| **Minijuego \`linea_tiempo\`** | Ordenar eventos | Cuando la clave es el orden de lo que pasó |
| **Minijuego \`rompecabezas\`** | Armar un documento roto | Para un papel destruido o una nota en pedazos |
| **Minijuego \`cifrado\`** | Descifrar un mensaje (César) | Para un mensaje oculto entre personajes |
| **Traidor** (\`modos\` + \`traidor\`) | Un jugador juega en contra del equipo | Casos para 3 o más jugadores con una pregunta fácil de torcer |
| **Voces** | Cada personaje habla con su voz; un narrador lee los documentos | Siempre: definí \`voz\` en cada personaje. \`narrador\` es opcional |
| **Retratos** | Una imagen por emoción | Si podés generar el mismo rostro en varias emociones. Si no, va el dibujo vectorial |
| **Vectorial** (\`apariencia.rasgos\`) | La plataforma dibuja al personaje | Por defecto. Sirve para chicos, mayores y animales |

## Valores que acepta la plataforma

- Ambientaciones: ${lista(AMBIENTACIONES)}.
- Tipos de prueba: ${lista(TIPOS_PRUEBA)}.
- Emociones de los retratos: ${lista(EMOCIONES)}, más \`hablando\` (opcional). \`neutral\` es obligatoria si hay retratos.

## Imágenes

- Solo \`.jpg\`, \`.png\` o \`.webp\`, de hasta 3 MB cada una (lo ideal es menos de 500 KB) y 25 MB en total.
- Escenas: la \`proporcion\` del caso tiene que coincidir con la de la imagen (ancho dividido alto), si no los puntos quedan corridos.
- Retratos: todos los de un personaje con el mismo tamaño y encuadre. Si un personaje tiene retratos, conviene que los tengan todos.
- Sin texto dentro de las imágenes, y si lo hay, en español.

## Minijuegos de catálogo

\`\`\`json
{ "id": "orden", "titulo": "Armá la noche", "descripcion": "…", "sobre": "s1", "tipo": "linea_tiempo",
  "config": { "eventos": ["primero", "segundo", "tercero"] } }
{ "id": "nota", "titulo": "La nota rota", "descripcion": "…", "sobre": "s2", "tipo": "rompecabezas",
  "config": { "fragmentos": ["parte 1", "parte 2", "parte 3"] } }
{ "id": "mensaje", "titulo": "El mensaje", "descripcion": "…", "sobre": "s2", "tipo": "cifrado",
  "config": { "cifrado": "cesar", "mensaje": "TEXTO YA CIFRADO", "pista": "…" }, "solucion": "TEXTO DESCIFRADO" }
\`\`\`

Los eventos y fragmentos van en el orden correcto: la plataforma los mezcla. Lo que destraba un minijuego se define con \`"desbloqueo": { "tipo": "minijuego", "minijuego": "<id>" }\` en una prueba.
`;
}

export function reglas() {
  return `# Reglas de diseño

Aprendidas jugando. El validador revisa varias; las demás las mira quien modera.

## Spoilers

- **Introducción y sinopsis sin estructura:** "descubran quién lo ayudó" ya adelanta que hubo cómplice.
- **La descripción de un sobre** la ven los jugadores recién cuando lo pueden abrir: puede resumir lo descubierto, pero no adelantar lo que hay adentro.
- **Preguntas finales:** la opción correcta no puede ser la más larga ni la única con detalles del caso, y ninguna opción nombra algo que solo aparece si es la correcta.

## Personajes

- **Aislamiento:** cada personaje sabe solo lo que esa persona puede saber.
- **Secretos justos:** ni tan fáciles que salgan solos ni tan difíciles que queden trabados. Atalos a pruebas o hechos que el grupo puede conseguir antes.
- **Mentiras guionadas:** qué sostiene, qué se la hace caer y cómo reacciona. El quiebre es gradual.
- **Voces:** variá género, edad, velocidad y tono para que no suenen parecidos.

## Pistas

- Cada culpable se prueba por **al menos dos caminos**.
- Sumá **pistas falsas** creíbles que se puedan descartar.
- Entre **3 y 7 pruebas por capítulo**; una o dos ayudas por capítulo.

## Lo que revisa el validador

Cada hallazgo es un **error** (no deja probar ni publicar), un **aviso** (lo decide quien modera) o una **sugerencia**:

1. **Forma:** que el JSON cumpla el contrato. Avisa los campos que no existen, que se ignoran.
2. **Referencias:** ids duplicados o que no existen, hechos que traban algo y nadie cuenta, retratos sin \`neutral\`.
3. **Se puede resolver:** simula la partida y marca todo lo que queda trabado. Avisa si un culpable no aparece nombrado en ninguna prueba ni hecho.
4. **Spoilers y diseño:** la opción correcta mucho más larga, un capítulo que se saltea, un secreto suelto desde el principio, sobres vacíos.
5. **Archivos:** que cada imagen exista, sea de verdad jpg, png o webp, no pese de más y que la proporción de las escenas coincida.
6. **Seguridad, siempre error:** textos que le dan órdenes a la IA, HTML, links externos, caracteres invisibles, textos de más de 4.000 caracteres, un \`caso.json\` de más de 300 KB, rutas fuera de \`/casos/<id>/\` y minijuegos personalizados.
`;
}

export function skill(version: string) {
  return `---
name: expediente-autor
description: Escribir un caso para Expediente (juego de investigación en grupo) siguiendo el kit de autor, por etapas, hasta entregar caso.json, REVISION.md y PROMPTS-IMAGENES.md. Usala cuando pidan armar, adaptar o corregir un caso de Expediente.
---

# Autor de casos de Expediente (kit ${version})

1. Leé \`LEEME.md\`, \`GUIA.md\`, \`contrato-de-caso.md\`, \`PIEZAS.md\`, \`REGLAS.md\` y el caso de \`ejemplo/\`.
2. Pedí la idea del caso y trabajá las cuatro etapas de \`GUIA.md\` de a una, con su checklist y esperando el OK entre etapas.
3. Escribí el \`caso.json\` recién en la etapa 4 y verificalo contra \`caso.schema.json\`.
4. Entregá la carpeta del caso como dice \`LEEME.md\`.
5. Si te pegan un informe del validador, corregí exactamente lo que dice y devolvé el \`caso.json\` completo.
`;
}
