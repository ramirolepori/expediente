# Contrato de un caso

Un caso es una carpeta con un `caso.json` que cumple el schema de [src/casos/schema.ts](../src/casos/schema.ts) y pasa `npm run validar`. Si trae minijuegos personalizados o imágenes, esos archivos van en `public/casos/<id-del-caso>/`.

```
casos/<id>/caso.json                      ← el caso (obligatorio)
public/casos/<id>/minijuegos/*.html       ← minijuegos personalizados (opcional)
public/casos/<id>/retratos/**             ← retratos de los personajes (opcional)
src/casos/registro.ts                     ← una línea para sumarlo al catálogo
```

Ejemplo completo y jugable: [casos/hotel-aurora/caso.json](../casos/hotel-aurora/caso.json).

## Idea central

**El caso tiene una sola verdad y la IA nunca la cambia.** Los personajes los interpreta un modelo de lenguaje, pero cada uno recibe **solo su ficha**: lo que sabe, lo que miente y sus secretos. No conoce la solución ni lo que saben los demás. Para contar algo importante, el personaje llama a una herramienta y el servidor decide si en ese momento puede revelarlo. Por eso el caso se arma con **hechos** que tienen id y con **condiciones** que dicen cuándo se habilita cada cosa.

## Condiciones

Casi todo lo que se desbloquea usa una condición:

| Condición | Se cumple cuando |
|---|---|
| `{ "tipo": "siempre" }` | Siempre |
| `{ "tipo": "sobre", "sobre": "s2" }` | El sobre está abierto |
| `{ "tipo": "capitulo", "capitulo": "s2" }` | El equipo acertó la pregunta del sobre `s2` |
| `{ "tipo": "prueba", "prueba": "informe_adn" }` | La prueba está visible en el expediente |
| `{ "tipo": "hecho", "hecho": "duarte_visita" }` | Algún personaje ya reveló ese hecho |
| `{ "tipo": "candado", "candado": "pendrive" }` | El candado se abrió |
| `{ "tipo": "minijuego", "minijuego": "caja_fuerte" }` | El minijuego se resolvió |
| `{ "tipo": "todas", "condiciones": [...] }` | Se cumplen todas |
| `{ "tipo": "alguna", "condiciones": [...] }` | Se cumple al menos una |

Todos los `id` van en minúsculas, con números y guion bajo (`informe_adn`, `s2_registros`).

## Secciones del caso

### `meta`
`id`, `titulo`, `sinopsis` (sin spoilers), `duracionMin`, `dificultad` (`facil`, `media`, `dificil`), `jugadores` (`min` y `max`, hasta 12), `advertencias` (por ejemplo "Muerte violenta") e `inspiracion` (opcional).

### `ambientacion`
Una de `noir`, `policial`, `medico`, `terror` o `epoca`. Cambia toda la estética del juego: colores, tipografías, papel de los documentos y efectos de ambiente.

### `introduccion`
Markdown que lee el grupo al arrancar. Tiene que plantear el misterio **sin adelantar su estructura**: si dice "descubran quién lo ayudó", ya revela que hubo un cómplice.

### `verdad` (solo la ve el servidor, y se revela al final)
`resumen`, `culpables` (cada uno con `personaje`, `papel` entre `autor`, `complice` o `autor_intelectual`, y `detalle`), `movil`, `medio` y `cronologia` (una lista de `{ hora, hecho }`).

### `hechos`
Lista de `{ id, texto }`. Son las piezas de información que los personajes pueden revelar. Cuando se revelan, aparecen en la pizarra como "descubrimientos".

### `personajes`
| Campo | Qué es |
|---|---|
| `id`, `nombre`, `rol`, `edad` | Identidad |
| `descripcion` | Lo que el grupo sabe de esta persona |
| `personalidad`, `formaDeHablar` | Cómo actúa y habla. El modelo usa español rioplatense |
| `interrogable` | Si se lo puede interrogar (por defecto, sí) |
| `disponible` | Condición para poder citarlo |
| `sabe` | Ids de hechos que cuenta libremente si le preguntan |
| `secretos` | `{ id, hecho, cuando, como }`: un hecho que solo suelta si se cumple `cuando`. `como` describe cómo y en qué contexto lo cuenta. El motor ya le pide al personaje que reaccione primero y lo cuente de a partes: no hace falta escribirlo |
| `mentiras` | `{ tema, dice, cae, alCaer }`: lo que sostiene, con qué condición se le cae y qué hace cuando eso pasa |
| `color` | Cosas sin importancia que puede improvisar (fútbol, el clima) |
| `voz` | `genero` (`femenino` o `masculino`), `edad` (`joven`, `adulto` o `mayor`), `velocidad` y `tono`. La usan las voces de Piper |
| `apariencia` | Cómo se ve en el interrogatorio: `retratos` o `rasgos` (ver abajo). Opcional |

#### `apariencia`

Hay dos estilos y conviene usar uno solo por caso:

- **Retratos:** `"retratos": { "neutral": "/casos/<carpeta>/retratos/duarte/neutral.jpg", "nervioso": "...", "hablando": "..." }`. Una imagen por emoción, con `neutral` obligatoria; las emociones que falten muestran la neutral. `hablando` (opcional) alterna con la neutral mientras habla. Los archivos van en `public/casos/<carpeta>/`.
- **Vectorial:** si no hay retratos, la plataforma lo dibuja. Con `"rasgos": { ... }` se elige cómo; todo es opcional y lo que falta sale de `voz.genero`, `edad` y `voz.edad`, con colores que dependen del `id` (dos personajes sin datos no salen iguales).

| Rasgo | Valores |
|---|---|
| `especie` | `humano` (por defecto), `perro`, `gato`, `loro` |
| `cuerpo` | `femenino`, `masculino`, `neutro` |
| `edad` | `bebe`, `nino`, `adolescente`, `adulto`, `mayor`: cambia las proporciones de cara y cuerpo |
| `piel`, `pelo`, `ojos` | Colores hex (`#c68a5e`). En animales, `piel` es el pelaje o plumaje y `pelo` las manchas, orejas o cresta |
| `peinado` | `corto`, `entradas`, `calvo`, `rapado`, `largo`, `melena`, `rulos`, `rodete`, `cola`, `pelusa` |
| `vello` | `ninguno`, `bigote`, `barba`, `barba_corta`, `candado` |
| `labios`, `sombra` | Maquillaje: color hex o `null` |
| `pecas`, `arrugas` | `true`/`false`; de 0 a 1 |
| `anteojos` | `ninguno`, `redondos`, `rectangulares`, `sol` |
| `ropa` | `traje`, `camisa`, `remera`, `buzo`, `vestido`, `uniforme`, `delantal`, `enterito` |
| `colorRopa`, `colorDetalle`, `corbata` | Colores (camisa bajo el saco, vivos); `corbata: null` sin corbata |
| `accesorios`, `colorAccesorio` | Lista entre `aros`, `collar`, `gorra`, `sombrero`, `baston`, `chupete`, `vapeador`, `cigarrillo`, `moño` |

Todas las combinaciones se ven en `/laboratorio/personaje`. La emoción la elige el modelo en cada respuesta (`neutral`, `nervioso`, `enojado`, `triste`, `sorprendido`, `evasivo`, `confiado` o `quebrado`): no hace falta escribirla en el caso.

### `sobres`
`{ id, titulo, descripcion, requisito, escena, resumen, preguntaCapitulo }`. El primero tiene que tener `requisito: { "tipo": "siempre" }`. Lo habitual es que cada sobre pida el anterior. La `descripcion` recién se muestra cuando el sobre se puede abrir.

Cada sobre puede tener estas dos piezas opcionales:

- `resumen`: texto plano que aparece al abrir el sobre. Repasá lo que el grupo ya sabe, sin adelantar la respuesta.
- `preguntaCapitulo`: `{ texto, opciones, respuesta, cierre, gancho, disponible?, orientacion? }`. Incluí al menos dos opciones `{ id, texto }` con ids distintos y poné en `respuesta` el id correcto. Al abrir el sobre, el grupo ve la pregunta; si definís `disponible`, las opciones esperan a que se cumpla esa condición (por ejemplo, un hecho clave o un minijuego). Mientras tanto, `orientacion` puede dar una pista de cómo seguir. Cualquier jugador puede responder para el equipo; se puede volver a intentar si falla. El `cierre` confirma lo descubierto y el `gancho` anticipa lo que sigue; se muestran recién al acertar.

Para trabar el sobre siguiente hasta que el grupo acierte, poné en su `requisito` una condición `capitulo` con el id del sobre anterior. Una vez habilitado, el grupo abre el sobre a mano. Los casos sin estas piezas mantienen sus requisitos de siempre.

`escena` (opcional) es una ilustración del lugar con puntos para tocar. Cada punto abre una prueba del mismo sobre:

```json
"escena": {
  "imagen": "/casos/<id>/escenas/nave.jpg",
  "proporcion": 1.79,
  "descripcion": "Texto alternativo de la imagen",
  "puntos": [{ "prueba": "puerta_nave", "x": 86, "y": 52, "etiqueta": "Barra de la puerta" }]
}
```

`x` e `y` van en porcentaje del ancho y el alto de la imagen. Los puntos de pruebas que todavía no se desbloquearon no se muestran. La imagen va en `public/casos/<id>/escenas/`, en 16:9, sin texto y comprimida (menos de 300 KB). La lista de pruebas sigue apareciendo debajo de la escena.

Las pruebas pueden traer imágenes dentro del `contenido` con markdown: `![epígrafe](/casos/<id>/pruebas/foto.jpg)`.

### `pruebas`
| Campo | Qué es |
|---|---|
| `id`, `titulo` | Identidad |
| `tipo` | `informe`, `declaracion`, `registro`, `foto`, `objeto`, `documento`, `celular`, `video`, `audio` o `mapa`. Por ahora todas se muestran como documento con su ícono, salvo `celular` |
| `sobre` | En qué sobre está |
| `desbloqueo` | Condición extra (por ejemplo, que un personaje revele un hecho o que se abra un candado) |
| `contenido` | Markdown: tablas, listas, citas y bloques de código |
| `celular` | Solo para `tipo: "celular"`: `hora`, `fecha`, `bateria`, `dueno`, `chats` (con `contacto` y `mensajes`, cada uno con `hora`, `de` como `victima` o `contacto`, y `texto`), `llamadas`, `correos` y `notas`. Se muestra como un teléfono navegable |
| `imagen`, `roles` | Previstos, pero todavía no se usan |

### `candados`
`{ id, titulo, descripcion, disponible, codigo, pista }`. El código se compara sin espacios ni guiones y en mayúsculas. Lo que abre se define con `desbloqueo: { "tipo": "candado", ... }` en las pruebas.

### `minijuegos`
Ver [docs/minijuegos.md](minijuegos.md). Hay tres tipos de catálogo (`rompecabezas`, `linea_tiempo` y `cifrado`) y uno `personalizado`, que es una página HTML propia del caso dentro de un iframe aislado.

### `ayudas`
`{ id, disponible, nivel, texto }`, con nivel de 1 (sutil) a 3 (casi directo). El grupo las pide al "comisario" y, según la configuración, restan puntos.

### `resolucion.preguntas`
Las preguntas que el equipo vota al final. Cada una tiene `id`, `texto`, `tipo` (`personaje` u `opcion`), `opciones` (si es de opción), `respuesta`, `puntos` y `explicacion`. Con `permiteNadie: true`, una pregunta de personaje ofrece "Nadie", así no se adelanta que hubo cómplices. Ojo con las pistas involuntarias: la opción correcta no puede ser la única larga ni la única con detalles del caso.

`resolucion.requisito` es opcional. Usá una condición `capitulo` si querés habilitar la votación recién después de que el grupo acierte la pregunta del último sobre.

### `narrador` (opcional) y diálogos con voces
`narrador` es una `voz` (`genero`, `edad`, `velocidad`, `tono`) para quien lee los documentos en voz alta; si falta, se elige una según la ambientación. Para que una línea de un documento la diga un personaje con su voz, empezala con su nombre en negrita: `**Martín Duarte:** Yo estuve en mi casa.` (también vale el id o un nombre que no se repita). Lo que no está marcado lo lee el narrador.

### `modos` y `traidor`
`modos` puede tener `cooperativo` y `traidor` (`competitivo` todavía no existe). Si incluye `traidor`, el caso tiene que traer `traidor`: `rol` (en segunda persona), `objetivo` (con `texto`, la `pregunta` que quiere torcer y la `respuesta` que quiere que voten, que no puede ser la correcta), `sabe` (ids de hechos) y `consejos`.

## Qué revisa el validador

El mismo validador corre con `npm run validar` (casos del repo) y en `/autores` (casos de autores, con cuenta). Revisa seis capas y cada hallazgo es un **error** (bloquea probar y publicar), un **aviso** (lo decide quien modera) o una **sugerencia**:

1. **Forma:** que el JSON cumpla el schema y su `version`. Avisa los campos que no son del contrato, que se ignoran.
2. **Referencias:** ids duplicados, referencias a cosas que no existen, hechos usados en condiciones que ningún personaje cuenta, retratos sin `neutral` y la ficha del traidor.
3. **Se puede resolver:** jugando "perfecto" se tiene que poder abrir todo: cada sobre, prueba, candado, minijuego, personaje y secreto. Avisa si un culpable no aparece nombrado en ninguna prueba ni hecho que se pueda descubrir.
4. **Spoilers y diseño:** la opción correcta bastante más larga que las demás, un capítulo que se abre sin pasar por el anterior, un secreto que se suelta desde el principio, sobres vacíos o con demasiadas pruebas, y mezcla de retratos con vectoriales.
5. **Archivos:** que cada imagen (escenas, `imagen` de pruebas, imágenes dentro del markdown y retratos) exista, sea jpg, png o webp de verdad, no pese de más y, en las escenas, que su proporción coincida con `proporcion`. Avisa las imágenes que sobran.
6. **Seguridad**, siempre error: textos que le dan órdenes al modelo, HTML, links externos, caracteres invisibles, textos de más de 4.000 caracteres, un caso.json de más de 300 KB y rutas fuera de `/casos/<id>/`. Los casos de autores no pueden traer minijuegos personalizados.

## Cómo subirlo (autores)

En `/autores`, con tu cuenta, "Subir un caso" recibe la carpeta con `caso.json`, las imágenes (con las mismas rutas relativas que usa el caso después de `/casos/<id>/`) y, si lo tenés, `REVISION.md` con la solución explicada para quien revisa. Si pasa el validador queda **validado**; con "Probar con amigos" pasa a **privado** y se juega con su link usando el modelo de prueba. Cuando está listo, "Pedir que lo publiquen": un moderador lo revisa y lo **publica** o te lo devuelve con una nota.

## Cómo probarlo

1. `npm run validar` hasta que dé ✅.
2. `npm run dev` y jugarlo con dos pestañas (cada una es un jugador).
3. Sus minijuegos se pueden probar sueltos en `/laboratorio/minijuegos`.
4. `npm run e2e` corre partidas automáticas con un modelo falso, sin gastar cuota de Gemini.
