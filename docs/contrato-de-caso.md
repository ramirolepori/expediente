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
`{ id, titulo, descripcion, requisito }`. El primero tiene que tener `requisito: { "tipo": "siempre" }`. Lo habitual es que cada sobre pida el anterior.

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

### `modos` y `traidor`
`modos` puede tener `cooperativo` y `traidor` (`competitivo` todavía no existe). Si incluye `traidor`, el caso tiene que traer `traidor`: `rol` (en segunda persona), `objetivo` (con `texto`, la `pregunta` que quiere torcer y la `respuesta` que quiere que voten, que no puede ser la correcta), `sabe` (ids de hechos) y `consejos`.

## Qué revisa `npm run validar`

- Que el JSON cumpla el schema.
- Que no haya ids duplicados y que toda referencia apunte a algo que existe.
- Que todo hecho usado en una condición lo pueda revelar algún personaje (con `sabe` o con un secreto).
- Que, jugando "perfecto", se pueda abrir todo: cada sobre, prueba, candado, minijuego, personaje y secreto. Si algo queda trabado, lo marca como inalcanzable.
- Que la ficha del traidor sea coherente.
- Que los retratos tengan `neutral` y que sus archivos existan en `public/`. Avisa si el caso mezcla personajes con retratos y vectoriales.

## Cómo probarlo

1. `npm run validar` hasta que dé ✅.
2. `npm run dev` y jugarlo con dos pestañas (cada una es un jugador).
3. Sus minijuegos se pueden probar sueltos en `/laboratorio/minijuegos`.
4. `npm run e2e` corre partidas automáticas con un modelo falso, sin gastar cuota de Gemini.
