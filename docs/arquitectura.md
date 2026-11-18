# Arquitectura

Cómo está armado Expediente hoy. Las decisiones y su porqué están en [adr/](adr/). El estado y lo que sigue, en [estado.md](estado.md).

## Piezas

```
navegador (panel del jugador / tele)
   │  POST /api/salas/[codigo]/accion        → acción del jugador
   │  POST /api/salas/[codigo]/interrogar    → pregunta a un personaje
   │  GET  /api/salas/[codigo]/vista         → su vista filtrada
   ▼
src/app/api/*  ──►  src/servidor/salas.ts  ──►  src/motor/*  (lógica pura)
                         │
                         ├─ almacen.ts: Supabase (tabla salas) o memoria en local
                         └─ llm.ts: Gemini (o modelo falso con LLM_FALSO=1)
```

| Carpeta | Qué hay |
|---|---|
| `casos_oficiales` (Supabase) | Expedientes oficiales; solo el servidor lee las filas. Contrato en [contrato-de-caso.md](contrato-de-caso.md) |
| `src/casos/registro.ts` | Catálogo de casos |
| `src/motor/` | Lógica pura y testeable: `condiciones` (evaluar), `reductor` (`aplicar` acciones), `vista` (`vistaPara`, lo único que viaja al cliente), `validador` (las seis capas, con `validador-archivos`, `validador-seguridad` e `informe` para la IA del autor), `interrogatorio` (prompt, revelaciones, limpieza, emoción), `minijuegos`, `narracion` (guion para leer documentos en voz alta), `modoAutor` (informe y atajos de la sala de prueba), `apariencia` (rasgos por defecto de los personajes) |
| `src/servidor/` | `almacen` (Supabase con concurrencia optimista por `version`, o memoria + SSE), `salas`, `llm`, `llmFalso`, `autores` (cuentas y roles: valida el token de Supabase Auth, admin por `ADMIN_EMAILS`, moderadores en tabla, login falso con `AUTH_FALSO=1`), `casosAutor` (casos de autores en la tabla `casos_autor` y el bucket `casos-autores`: subir, confirmar, estados, moderación y cargarlos para jugar; `salas.casoDeSala` los usa junto con los del repo) |
| `src/cliente/audio.ts`, `paisajes.ts` | Sonido de la ambientación: buses de ambiente, música y efectos con Web Audio, y un paisaje por ambientación (ambiente, efectos y efecto del narrador) |
| `src/kit/` | Kit de autor: textos (`textos.ts`, con valores sacados del schema), caso de ejemplo, `zip.ts` (zip sin compresión) y `kit.ts`, que arma los archivos; lo sirve `/autores/kit`, prerenderizado en el build |
| `src/app/api/` | Rutas: salas, unirse, accion, eventos (SSE local), vista, interrogar, casos, red, laboratorio, cron/limpiar (cron diario de Vercel, borra salas sin escrituras hace 24 h) |
| `src/componentes/` | UI: Inicio, Sala, Lobby, PanelJugador (Expediente / Interrogar / Pizarra / Notas / Resolver), PantallaCompartida, Resultado, Celular, Pizarra, minijuegos, personaje (`Personaje` elige entre `PersonajeRetrato` y `PersonajeVectorial`) |
| `src/app/laboratorio/` | Páginas para revisar diseño sin jugar: personaje, ambientaciones, minijuegos, pizarra |
| `src/app/globals.css` | Tokens por ambientación (`noir`, `policial`, `medico`, `terror`, `epoca`) y animaciones |
| `public/casos/hotel-aurora/` | Caja fuerte HTML de la aplicación, sin la combinación |
| `e2e/`, `scripts/` | Playwright, prueba de humo, validador de casos |

## Flujo de una acción

1. El cliente manda la acción con su token (identidad por pestaña en `sessionStorage`, clave `expediente:{codigo}:{tipo}`).
2. `almacen.actualizar` lee la sala, corre `aplicar` del reductor y guarda si `version` no cambió (si cambió, reintenta).
3. Avisa "hubo un cambio" (Supabase Realtime broadcast o SSE en local). El aviso no lleva datos.
4. Cada dispositivo pide `/vista` y recibe solo lo que le corresponde.

## Interrogatorio

- `construirInstrucciones` arma el prompt con la ficha del personaje: lo que sabe, sus mentiras y los secretos que hoy puede soltar. Nunca la verdad ni lo que saben otros.
- El modelo tiene una herramienta `revelar(clave)`; `resolverRevelacion` decide si corresponde según las condiciones del caso. Si se revela, el hecho pasa a `hechosRevelados`.
- `limpiarRespuesta` borra etiquetas que el modelo filtre en el texto.
- Emoción: el prompt le pide al personaje empezar cada respuesta con `[emocion: X]`. `leerRespuesta` la separa del texto (sin etiqueta válida, `neutral`) y se guarda en el mensaje (`emocion`); el historial se la devuelve al modelo para que mantenga el formato. No hay llamadas extra (ADR 0010).
- Apariencia: la vista manda `apariencia` de cada personaje disponible: los `retratos` del caso o los `rasgos` completos que arma `rasgosPara` (lo del caso más defaults por voz, edad e id). `Personaje.tsx` lo dibuja con la emoción del último mensaje y "hablando" mientras se escribe la respuesta o mientras suena su voz (`usePersonajeSonando` de `Voces.tsx`). Se ve en el chat del panel y en la tele.
- Límites (atómicos dentro de `actualizar`): 3 s entre preguntas de un jugador, una pregunta a la vez por personaje, 12 por sala por minuto y 150 por partida (`LIMITES_INTERROGATORIO`). La vista manda `preguntasRestantes` para el contador.
- Modelos: `gemini-3.1-flash-lite` principal (20 s) y Flash de respaldo (35 s). Cuota gratis en [adr/0005](adr/0005-modelos-y-cuota-gemini.md).
- Voces: `Voces.tsx` pone en cola las respuestas nuevas. En modo compartido, si hay tele, el anfitrión genera los WAV con Piper y los sube al bucket privado `voces-salas` vía `/api/salas/[codigo]/voz/[mensaje]`. La vista indica cuándo están listos, y la primera tele pide URLs firmadas y los reproduce sin Piper. Si no hay tele o el modo es local, el dispositivo que reproduce también genera. Qué voz usa cada uno lo decide `vocesDelElenco` sobre el elenco entero y viaja en la vista como `voz`. Detalle en [adr/0009](adr/0009-audio-una-pista.md) y [adr/0013](adr/0013-reparto-de-voces.md).

## Entornos

| Entorno | Almacén | Modelo |
|---|---|---|
| `npm run dev` sin variables de Supabase | memoria + SSE | Gemini o falso |
| e2e (puerto 3100, `NEXT_DIST_DIR=.next-e2e`) | memoria | falso (`LLM_FALSO=1`) |
| Producción (Vercel) | Supabase | Gemini |

Vercel corre `npm test && npm run validar && npm run build` antes de cada despliegue (`vercel.json`).
