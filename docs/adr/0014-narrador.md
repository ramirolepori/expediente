# 0014. Narrador: lectura en voz alta, con el lugar elegido en el momento

**Contexto.** Algunos casos traen mucha documentación y leer todo se vuelve pesado, sobre todo en grupo. Ya teníamos voces de personajes con Piper en el navegador (ADR 0009 y 0013), pero una sola pista configurada al crear la sala. Para leer documentos, Ramiro pidió que cada uno pueda elegir dónde suena sin configurarlo antes: varias personas sin auriculares pueden querer escuchar documentos distintos al mismo tiempo.

**Decisión.**

- **Botón "Escuchar"** en cada documento, en la introducción y en la resolución. Si hay tele conectada, pregunta en el momento: "En este dispositivo" o "En la tele, para todos". Sin tele, suena acá. No depende de la configuración de audio de la sala.
- **En la tele** viaja solo qué leer (`narrar` con `introduccion`, `resolucion` o `prueba:<id>`), no el texto: la tele arma la lectura con su propia vista, y el servidor valida que el grupo ya tenga eso a la vista. Si el navegador de la tele no deja arrancar audio sin un toque, muestra un botón grande.
- **Varias voces solo si el autor las marca:** una línea que empieza con `**Nombre:**` la dice ese personaje, si el nombre coincide con uno disponible (nombre completo, id o un nombre que no se repita). Todo lo demás lo lee el narrador, que es lo más robusto. En los chats del celular se alternan la voz del dueño y la del contacto.
- **El narrador** usa una voz base que el elenco no use, según la ambientación (grave y lento en noir y terror, una voz de mujer en médico y de época). Un caso puede traer el suyo con el campo opcional `narrador`.
- **Texto para el oído:** abreviaturas, horas, fechas, porcentajes y separadores de miles se reescriben antes de sintetizar; las tablas se leen por filas y las fotos por su epígrafe.
- **Oración por oración:** la primera suena mientras se genera la siguiente. Con pausa, velocidad (1×, 1,25×, 1,5×) y una barra que muestra la frase que se está leyendo.

**Consecuencias.** La pista única de ADR 0009 sigue para las respuestas de los personajes; el narrador es aparte y cada dispositivo tiene su propio reproductor. Si en la tele está sonando un personaje y llega una lectura, pueden pisarse: no lo resolvemos hasta ver que pase. Leer en la tele necesita que la tele pueda correr Piper, igual que las voces.
