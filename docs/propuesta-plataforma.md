# Propuesta de plataforma: juego de investigación híbrido

Versión 0.1, 14/11/2026. Documento vivo: lo vamos ajustando.

## 1. Visión

Una plataforma web para resolver casos de investigación en grupo (de 2 a 6 personas) **en el mismo lugar físico**, cada uno con su dispositivo. Combina el expediente clásico (documentos, sobres, pruebas) con piezas que solo existen en digital: personajes que se pueden interrogar, pruebas que se desbloquean, una pizarra compartida y un narrador que acompaña.

Principios:

1. **Una sola verdad.** Cada caso tiene una solución fija y la IA nunca la cambia.
2. **Equilibrio de aristas.** Documentos, interrogatorios, análisis de pruebas y deducción pesan parecido. Ninguna mecánica es "el juego".
3. **Cero fricción.** Entrar a una sala con un código, sin registrarse. Todo responsive, primero el celular.
4. **La estética es parte del juego.** Cada caso trae su propia ambientación visual y sonora.
5. **Gratis mientras sea para jugar entre amigos.**

## 2. Qué tomamos de lo que existe

| Idea | De dónde viene | Por qué suma |
|---|---|---|
| Sobres que se abren en orden | Cajas de expediente (Caso Criminal, Hunt A Killer) y tus PDFs | Da ritmo y evita la sobrecarga de información al principio |
| Visitar lugares o personas con un costo | Sherlock Holmes Consulting Detective | Cada decisión pesa (modo con recursos limitados) |
| Base de datos policial con búsqueda | Detective: A Modern Crime Board Game, Her Story | Investigar se siente activo y no es solo leer |
| Escanear un QR para desbloquear contenido | Chronicles of Crime | Encaja perfecto con el modo híbrido presencial |
| Confirmar deducciones parciales | Return of the Obra Dinn | Da feedback sin regalar la solución |
| Confrontar con una prueba | Ace Attorney | El interrogatorio tiene una mecánica concreta y no es solo charlar |
| Interrogatorio con LLM | LLM Noire, Hex Judge, Mystnight | Validado, pero casi todos son de un jugador y con casos generados al vuelo (inconsistentes) |

Lo diferencial nuestro: **multijugador presencial + casos escritos con verdad fija + IA con guardrails**. Casi todo lo que hay con IA es individual y genera el caso en el momento.

## 3. Dispositivos: panel personal y pantalla compartida

Cada dispositivo que entra a la sala elige **qué es**, y todo es configurable:

- **Panel personal (un jugador):** celular, tablet o PC, lo que le resulte cómodo a cada uno. El mismo panel se adapta al tamaño: en el celular va por pestañas (expediente, pizarra, interrogatorio, notas) y en la PC usa varias columnas a la vez.
- **Pantalla compartida (opcional, no es jugador):** muestra la pizarra del caso, el narrador, el reloj, el interrogatorio en curso y el código o QR para unirse. Puede ser:
  - una tele con navegador propio,
  - una PC o notebook conectada por HDMI a la tele,
  - la misma PC de un jugador conectada **dos veces**: una pestaña o ventana con su panel personal y otra con la pantalla compartida, que se lleva a la tele (segunda pantalla o Cast de pestaña).
- Sin pantalla compartida, cada panel tiene su propia vista de pizarra.

**Conexión por pestaña, no por dispositivo.** La identidad (jugador o pantalla compartida) vive en cada pestaña (`sessionStorage` más un token de reconexión), no en el navegador entero. Así la misma PC puede tener el panel de Ramiro y la pantalla compartida a la vez sin que se pisen.

### Audio: una sola pista para todos

Las voces no se generan en cada dispositivo. Cada respuesta hablada se genera **una sola vez** y se reparte:

1. El personaje responde (texto).
2. **Un generador** convierte ese texto en un archivo de audio, con la voz fija del personaje.
3. El archivo se sube a Storage y la URL se difunde por tiempo real a la sala.
4. Cada dispositivo que tiene que sonar lo reproduce. Es exactamente el mismo audio en todos, y queda guardado para volver a escucharlo como prueba.

**Quién genera** (detrás de una interfaz `TtsProvider`, para cambiarlo sin tocar el resto):

- **Por defecto, gratis:** el **dispositivo generador** de la sala, por defecto la PC del anfitrión (o la que tenga más potencia), genera con Piper en el navegador. La tele nunca genera, solo reproduce.
- **Alternativa en la nube:** un proveedor de TTS por API (Gemini TTS o el que convenga), para cuando no haya una PC en la sala o se quiera más calidad.

**Dónde suena** (configurable en la partida):

- **Solo pantalla compartida** (recomendado si hay tele): todos escuchan lo mismo desde un parlante, como una escena.
- **Solo quien interroga:** útil sin tele.
- **Todos los dispositivos, sincronizados:** el servidor manda la orden "reproducir en el instante T" (unos 300 ms en el futuro) y cada dispositivo corrige con su desfase de reloj. Sirve para partidas no presenciales. En la misma habitación puede generar eco, por eso no es el modo por defecto.

Unirse: el anfitrión crea la sala y la pantalla compartida (o el anfitrión) muestra un código de 4 o 5 letras y un QR. Se entra con un apodo, sin registrarse. Si alguien recarga o se le corta, vuelve a su lugar.

Mecánicas híbridas que agregan valor (no por sumar):

- **Kit imprimible opcional:** el caso se puede imprimir con QR en las pruebas físicas. Escanearlo desbloquea su versión digital o un análisis forense.
- **Candados con código:** algunos sobres o archivos (el celular de la víctima, una caja fuerte) se abren con un código que sale de cruzar documentos. Es lo mismo que una escape room y premia la deducción.
- **El celular de la víctima como interfaz:** chats, llamadas, fotos y ubicaciones navegables. Es lo que en papel es una tabla de llamadas, pero mucho más inmersivo.
- **Línea de tiempo colaborativa:** arrastrar hechos a una cronología. El juego puede marcar contradicciones si el modo lo permite.

## 4. Guardrails para que la historia no se salga del guion

Por capas, de la más fuerte a la más blanda:

1. **Aislamiento de conocimiento.** El prompt de cada personaje **solo contiene lo que ese personaje sabe**, nunca la solución completa. Un personaje no puede filtrar lo que no conoce. Es la defensa principal.
2. **Hechos con identificador.** Todo hecho relevante es un ID (`hecho.coartada_falsa_marcos`). El personaje revela algo **llamando a una herramienta** (`revelar(hecho_id)`), y el servidor valida las condiciones (por ejemplo, que el grupo ya tenga la prueba con la que lo confrontan). El estado del juego lo lleva el servidor, no el chat.
3. **Secretos con condiciones explícitas.** Cada secreto define cuándo se suelta: prueba mostrada, contradicción detectada, nivel de presión, cantidad de preguntas.
4. **Mentiras guionadas.** Lo que el personaje miente está escrito (qué dice y qué lo hace caer). No improvisa mentiras nuevas.
5. **Improvisación acotada.** Puede improvisar color (el clima, su carácter, qué desayunó) pero no hechos del caso. Ante lo que no está en su ficha: "no sé", "no me acuerdo" o "eso no tiene nada que ver".
6. **Memoria compartida por personaje.** Si le dijo algo a Ana, cuando Pedro le pregunta después responde lo mismo. Es un solo personaje para toda la partida.
7. **Verificador opcional.** Un modelo barato revisa cada respuesta contra la ficha antes de mostrarla. Se puede activar si vemos desvíos.
8. **Validador del caso al cargarlo.** Un script comprueba que la solución sea alcanzable: que cada pista necesaria tenga al menos un camino para desbloquearse, que no queden pistas huérfanas y que no haya contradicciones de horarios.

## 5. El contrato de un caso

Para que la plataforma soporte un caso, este tiene que ser una carpeta con un `caso.json` (validado con un schema) y sus assets.

```
casos/hotel-aurora/
  caso.json
  assets/  (fotos, documentos, audios, mapas)
```

Contenido mínimo:

| Sección | Qué define |
|---|---|
| `meta` | id, título, sinopsis sin spoilers, duración estimada, dificultad, jugadores mín./máx., advertencias de contenido |
| `ambientacion` | una de las ambientaciones soportadas (sección 6) y overrides opcionales |
| `verdad` | culpable(s), móvil, medio, oportunidad y cronología canónica. **Solo el servidor la ve** |
| `hechos` | lista de hechos con ID, para poder referenciarlos desde personajes, pruebas y rúbrica |
| `personajes` | ficha pública, personalidad y forma de hablar, qué sabe (IDs de hechos), secretos con condiciones, mentiras guionadas, voz sugerida |
| `pruebas` | tipo (informe, declaración, chat, registro de llamadas, foto, mapa, audio, objeto), contenido, sobre o fase, condición de desbloqueo, qué rol la ve |
| `sobres` | fases del caso y qué abre cada una |
| `candados` | código, qué abre y de qué pruebas sale |
| `ayudas` | pistas escalonadas (de sutil a casi directa) |
| `resolucion` | preguntas finales (quién, cómo, por qué, y opcionales) y rúbrica de puntaje |
| `roles` (opcional) | forense, archivo, calle, etc. Qué ve cada uno |
| `traidor` (opcional) | qué sabe el cómplice y cuál es su objetivo |
| `modos` | qué modos soporta el caso |

Un caso que no define `roles` o `traidor` simplemente no ofrece esos modos.

## 6. Ambientaciones

La interfaz general (lobby, selección y configuración) es neutra. Al arrancar la partida, la app adopta la ambientación del caso: paleta, tipografías, texturas de papel, plantillas de documentos, sonido ambiente y voz del narrador.

Primera tanda propuesta:

| Ambientación | Look | Ejemplos de tus casos |
|---|---|---|
| **Policial moderno** | Expediente oficial, sellos, fichas limpias | El último partido, La mente en sombra |
| **Noir** | Blanco y negro, máquina de escribir, lluvia, neón | El hotel Aurora |
| **Médico / forense** | Historias clínicas, informes de laboratorio, frío clínico | La mente en sombra (cruza las dos) |
| **Terror / sobrenatural** | Papel envejecido, manchas, sonido inquietante | El susurro del espejo, Hollow Creek |
| **De época** | Victoriano o años 20, sepia, caligrafía | Para casos futuros |

Cada ambientación es un "tema" (tokens de diseño más componentes de documento), así que agregar una nueva no toca la lógica del juego.

## 7. Modos y configuración de partida

Flujo: **elegir caso → cantidad de jugadores → modo → configurar → compartir código → jugar**.

Modos:

- **Cooperativo:** todos contra el caso.
- **Competitivo:** dos equipos con el mismo caso. Gana el que acusa mejor o primero.
- **Traidor:** un jugador es cómplice en secreto y tiene que desviar la investigación sin que lo descubran (solo en casos que lo soportan).
- Más adelante: online puro y asincrónico.

Opciones configurables:

| Opción | Valores |
|---|---|
| Recursos limitados (horas de investigación) | apagado / cantidad |
| Sistema de puntos | apagado / encendido |
| Ayudas del narrador | ilimitadas / limitadas (restan puntos) / apagadas |
| Roles con información asimétrica | apagado / encendido |
| Temporizador | apagado / minutos |
| Confirmación de deducciones parciales | apagado / encendido |
| Interrogatorios | texto / voz |
| Kit imprimible con QR | sí / no |

## 8. Stack gratuito

| Pieza | Elección | Plan gratis y salvedades |
|---|---|---|
| App y hosting | **Next.js + TypeScript en Vercel (Hobby)** | Gratis para uso no comercial |
| Base de datos, archivos y tiempo real | **Supabase (Free)** | Unos 200 usuarios conectados en simultáneo y 500 MB de base, sobra para nosotros. **El proyecto se pausa tras una semana sin uso** y se reactiva desde el panel |
| Login | Supabase Auth anónima | Solo apodo y código de sala, sin registrarse |
| Pizarra colaborativa | Supabase Realtime al principio; **Liveblocks Free** si la pizarra lo pide | Liveblocks: gratis para proyectos personales, 500 salas activas por mes |
| LLM | **Vercel AI SDK** (cambiar de proveedor es una línea) con **Gemini Flash** o **Groq** gratis | Límites diarios que cambian seguido. El plan gratis de Gemini puede usar los datos para entrenar (es ficción, no importa). Claude no tiene API gratuita; queda como opción paga si algún día vale la pena |
| Voz a texto | **Web Speech API** del navegador (gratis, anda en Chrome, Edge y Safari) con fallback a **Whisper en Groq** (plan gratis) | Firefox no soporta la API del navegador |
| Texto a voz | **Piper en el navegador** (WebAssembly, corre en el dispositivo, hay voces en español); fallback a `speechSynthesis` del navegador | Piper descarga el modelo una vez (decenas de MB). Revisar la licencia de cada voz |
| Imágenes de pruebas | Generadas o de bancos libres (Unsplash, Pexels), **preparadas al escribir el caso**, nunca en vivo | Así se mantiene la consistencia |

### Voz en el MVP

- **Pulsar para hablar:** se mantiene apretado un botón, se habla y se suelta. Evita que el micrófono capte la charla de la mesa.
- **Voz a texto:** Web Speech API. Si el navegador no la soporta (Firefox), se graba el audio y se transcribe con Whisper en Groq.
- **Texto a voz:** cada personaje tiene una voz asignada en el caso (voz, velocidad y tono). Se genera una sola vez y se reparte a la sala (ver "Audio: una sola pista para todos" en la sección 3).
- **El texto siempre queda:** cada respuesta hablada también aparece transcripta, para releerla y citarla como prueba.

## 9. Casos: origen y herramienta de autor

**Origen.** Tus PDFs (los comprados y los generados) son inspiración: de ahí salen casos propios, transformados, con lo que haga falta agregado o sacado para la versión interactiva. Otras fuentes de tramas: MuSR (CC BY 4.0) y policiales de dominio público.

**Herramienta de autor con IA.** Es el camino para tener catálogo:

1. **Entrada:** un PDF, un texto o una idea suelta, más la ambientación elegida.
2. **Extracción:** la IA identifica víctima, sospechosos, hechos, cronología y solución.
3. **Reestructuración:** muchos casos fuente (como Hotel Aurora) son narrativos y el propio texto deduce y revela. La herramienta separa **lo que pasó** (verdad) de **lo que el jugador puede descubrir** (pruebas, declaraciones, secretos con condiciones) y propone dónde agregar mecánicas: candados, celular de la víctima, confrontaciones.
4. **Borrador** de `caso.json` con los assets necesarios listados (fotos, documentos, voces).
5. **Validación automática** (sección 4, capa 8).
6. **Playtest simulado:** un agente juega el caso como detective y reporta si se puede resolver, si es demasiado fácil o si hay un camino trabado.
7. **Revisión humana** en un editor: aprobás, corregís y publicás el caso en la plataforma.

Por etapas: primero el schema, el validador y un script de conversión (con él convertimos Hotel Aurora); después el editor web y el playtest simulado.

## 10. MVP

1. Lobby: crear sala, código y QR, unirse con apodo, elegir caso, modo cooperativo y configuración básica.
2. Dispositivos configurables: panel personal en cualquier dispositivo y pantalla compartida opcional.
3. Expediente por sobres, con el contrato de caso y su validador.
4. Pizarra compartida y notas privadas y de equipo.
5. Interrogatorio por texto **y por voz**, con guardrails (capas 1 a 6).
6. Un candado con código y el celular de la víctima.
7. Acusación final con puntaje.
8. Ambientación noir (la del caso de prueba) más la interfaz neutra.
9. **Caso de prueba: Hotel Aurora**, transformado al formato de la plataforma.
10. Herramienta de autor, etapa 1: schema, validador y script de conversión.

Después: roles, modo traidor, modo competitivo, más ambientaciones, kit imprimible con QR, editor web de casos, playtest simulado y casos nuevos.

## 11. Decisiones tomadas

- Pantalla compartida **opcional y configurable**. El panel personal anda en cualquier dispositivo.
- **Voz entra en el MVP.**
- Caso de prueba: **Hotel Aurora**. Los casos nuevos vienen después.
- Herramienta de autor con IA como pieza propia de la plataforma.

## 12. Lo que vas a tener que hacer vos (cuando lleguemos)

- Crear las cuentas gratuitas: Vercel, Supabase, Google AI Studio (clave de Gemini) y Groq.
- Cargar las claves como variables de entorno en Vercel y en un `.env.local`, nunca en el código.
