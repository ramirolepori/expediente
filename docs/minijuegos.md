# Minijuegos

Cada caso puede traer sus propios minijuegos en `caso.json` → `minijuegos`. Al resolverse, cualquier cosa del caso puede depender de la condición `{ "tipo": "minijuego", "minijuego": "<id>" }` (lo habitual: una prueba con ese `desbloqueo`).

## Campos comunes

| Campo | Qué es |
|---|---|
| `id` | Identificador (minúsculas, números y `_`) |
| `titulo`, `descripcion` | Lo que ve el jugador |
| `sobre` | Sobre donde aparece (tiene que estar abierto) |
| `disponible` | Condición extra para mostrarlo (por defecto, siempre) |
| `modo` | `individual` o `compartido` |
| `tipo` | Uno de los de abajo |
| `config` | Datos según el tipo |
| `solucion` | Solo en `cifrado` y `personalizado` |

La respuesta la valida el servidor. En `rompecabezas` y `linea_tiempo` la plataforma mezcla las piezas y les da ids opacos por sala, así el orden correcto no viaja al navegador.

## Tipos de catálogo

**`rompecabezas`**: un documento roto en tiras. `config.fragmentos`: los pedazos en el orden correcto.

**`linea_tiempo`**: ordenar hechos. `config.eventos`: los hechos en el orden correcto. Conviene no incluir las horas, para que haya que cruzar pruebas.

**`cifrado`**: descifrar un mensaje con una rueda de César. `config.mensaje` (ya cifrado), `config.pista` (opcional), `solucion` (el texto en claro). La comparación ignora tildes, espacios y signos.

## Tipo `personalizado`

El caso trae su propia página: `config.pagina` (ruta dentro de `public/`, por ejemplo `/casos/hotel-aurora/minijuegos/caja-fuerte.html`) y `config.alto` en píxeles. La plataforma la abre en un iframe aislado (`sandbox="allow-scripts"`), así que la página no puede tocar el resto del juego.

Contrato de mensajes:

```js
// la plataforma le manda el contexto al cargar y cada vez que cambia
{ tipo: "expediente:contexto", ambientacion: "noir", apodo: "Ana", resuelto: false }

// la página avisa la respuesta del jugador
parent.postMessage({ tipo: "expediente:respuesta", respuesta: "41-08-07" }, "*");
```

Si la respuesta coincide con `solucion` (sin tildes, espacios ni signos), el minijuego queda resuelto para toda la sala y la plataforma le vuelve a mandar el contexto con `resuelto: true` (la caja fuerte del Hotel Aurora lo usa para abrir la puerta). Si no coincide, la plataforma muestra "No salió".

Ejemplo completo: `public/casos/hotel-aurora/minijuegos/caja-fuerte.html`.

## Validación

`npm run validar` revisa que el sobre exista, que las condiciones apunten a cosas reales y que, resolviendo todo lo resoluble, el caso se pueda terminar.
