# Revisión y propuestas de mejora

Versión 1, 14/11/2026. Sale de jugar una partida completa en producción (https://expediente-lemon.vercel.app) con dos jugadores y una pantalla compartida, y de revisar el código.

## 1. Lo que ya anda bien

- Crear sala, unirse por código o QR, pantalla compartida y tiempo real entre dispositivos (el cambio llega en menos de 2 segundos).
- Interrogatorios de 2 a 7 segundos. Los personajes sostienen sus mentiras hasta que les muestran la prueba (Duarte cedió recién con las cámaras de su edificio) y no inventan hechos.
- Las revelaciones desbloquean pruebas (Carla entregó el pendrive) y aparecen en la tele al instante.
- Candados, horas de investigación, puntaje y pantalla de resultados.
- Despliegue automático: cada push a `main` sale a producción.

## 2. Bugs que encontré y ya corregí

| Bug | Arreglo |
|---|---|
| En "Resolver" aparecían los nombres de personajes bloqueados (Julián, Olazábal): spoiler directo. Además viajaban en los datos al navegador | Un personaje no disponible llega como "???" hasta que se desbloquea o termina la partida. Test agregado |
| Si el código de un candado era incorrecto, no pasaba nada en pantalla | Aviso "Código incorrecto" con la cantidad de intentos |

## 3. Mejoras, por prioridad

### Alta: fricción y reglas

1. **Crear sala no te une.** El anfitrión crea la sala y después tiene que escribir el apodo en otra pantalla. Pedir el apodo junto con la configuración y entrar directo al lobby.
2. **No hay avisos de novedades.** Cuando Carla entregó el pendrive, nada lo avisó: hay que ir a buscarlo al expediente. Sumar avisos emergentes ("📎 Nueva prueba: Pendrive azul", "📌 Descubrimiento nuevo") y un contador en la pestaña Expediente.
3. **Cualquier jugador puede acusar solo** y terminar la partida para todos. Pasar a una acusación por votación: cada uno propone, se ve quién votó qué y se confirma con mayoría o con el anfitrión.
4. **Opciones que todavía no existen.** "Competitivo" y "Interrogatorios por voz" aparecen en la configuración, pero no están implementados. Ocultarlos hasta que estén.
5. **Límite de uso.** Cualquiera con el código puede mandar interrogatorios sin freno y gastar la cuota gratuita de Gemini. Agregar un límite por sala y por jugador (por ejemplo, una pregunta cada 3 segundos y un tope por partida).

### Media: profundidad del juego

6. **Pizarra de verdad.** Hoy es una lista. Pasar a un corcho donde se arrastran pruebas, descubrimientos y personajes, con hilos rojos entre ellos y compartido en tiempo real. Sumar una línea de tiempo donde se ordenan los hechos.
7. **Ajustes al Hotel Aurora.** Algunas condiciones son muy laxas. El secreto "Valentina es Arcimboldo" queda habilitado desde el arranque, porque el celular de Julia está en el sobre 1. Conviene exigir el análisis del labial o que la confronten con el correo. Algunas confesiones son abruptas (Duarte pasa de negar a entregar la carpeta en una frase): darle más texto a `alCaer` para que el quiebre sea gradual.
8. **Pantalla compartida.** Los resultados finales se ven chicos en una tele. Sumar una secuencia de cierre pensada para la tele (ver sección 4) y mostrar ahí las pruebas que se van desbloqueando.
9. **Voces de los personajes.** Pendiente del MVP. Una sola pista generada y repartida a la sala (sección 3 de la propuesta).

### Baja: mantenimiento

10. **Limpieza de salas viejas.** La tabla crece con cada partida. Un cron de Vercel que borre salas de más de 7 días.
11. **Supabase se pausa tras una semana sin uso** en el plan gratuito. La primera partida después de una pausa va a fallar hasta reactivarlo. Opciones: un ping semanal automático o reactivarlo a mano.
12. **Tests de punta a punta.** Hoy hay tests del motor (10). Sumar una prueba automática que juegue una partida en el navegador antes de cada despliegue.
13. **Accesibilidad.** El botón de hablar solo funciona con el mouse o el dedo. Sumar una tecla, y respetar `prefers-reduced-motion` cuando lleguen las animaciones.

## 4. Animaciones

### En la plataforma

Con la librería Motion (gratuita, para React):

- **Sobres:** la solapa se abre y los documentos se deslizan como papeles.
- **Pruebas nuevas:** entran a la mesa con el sello "EVIDENCIA" que cae con un golpe seco.
- **Respuestas de los personajes:** aparecen como texto de máquina de escribir, al ritmo de la voz cuando la haya.
- **Candados:** el candado vibra cuando el código es incorrecto y se abre con un clic cuando es correcto.
- **Revelaciones:** destello, la tarjeta del descubrimiento vuela al corcho y suena un acorde.
- **Cierre del caso, pensado para la tele:** se revela pregunta por pregunta con suspenso, y al final aparece la ficha policial del culpable.
- **Ambiente noir:** lluvia sobre la ventana, humo y una lámpara que se balancea en la sala de interrogatorios. Todo en CSS o canvas, liviano.

### El personaje interrogado

La idea es que en el interrogatorio se vea a la persona: su cara, sus gestos y cómo reacciona. Estas son las opciones:

| Opción | Cómo se ve | Costo | Esfuerzo | Contras |
|---|---|---|---|---|
| **A. Retrato animado con expresiones** (recomendada) | Retrato ilustrado en clave noir, encuadrado como en una sala de interrogatorio, con 6 a 8 expresiones por personaje (neutral, nervioso, enojado, triste, sorprendido, evasivo) | Gratis en tiempo de juego. Las imágenes se generan una vez, al escribir el caso | Medio | No es 3D. El movimiento es sutil, no actuado |
| **B. Personaje vectorial con Rive** | Ilustración 2D articulada, con gestos y labios que siguen la voz por máquina de estados | Runtime gratuito (MIT). El editor gratis exporta con marca de agua | Alto: hay que armar cada personaje en el editor | Mucho trabajo de arte por personaje |
| **C. Cabeza 3D en el navegador** ([TalkingHead](https://github.com/TonAldo48/TalkingHead), Three.js) | Busto 3D con expresiones faciales y sincronía de labios | Gratis (código abierto) | Alto: un modelo 3D por personaje y ajustar la estética noir | Pesado para una tele. Riesgo de que se vea "de muñeco" |
| **D. Avatares realistas por API** (Tavus, HeyGen LiveAvatar, D-ID) | Video realista de una persona hablando en tiempo real | Pago. Lo gratuito ronda los 20 minutos por mes | Bajo | No entra en "gratis": se agota en una partida |
| **E. Clips de video por emoción** | Videos cortos en bucle (respira, mira de reojo, se cruza de brazos) generados al escribir el caso | Gratis al jugar; generarlos puede costar | Medio | Los labios no siguen el texto exacto |

**Recomendación: A ahora, con E como mejora futura.** Cómo funcionaría:

1. **Al escribir el caso** (herramienta de autor): por cada personaje se genera una hoja de expresiones con el mismo rostro, ropa y luz, más 2 o 3 cuadros de boca. Se guardan como assets del caso. El schema suma `personaje.retrato` con las expresiones disponibles.
2. **En cada respuesta**, el modelo también devuelve la emoción y un gesto (por ejemplo `nervioso` y `se acomoda el cuello`), usando la misma herramienta que ya valida las revelaciones. No suma costo.
3. **En pantalla:** el retrato cambia de expresión con un fundido y tiene movimiento de reposo permanente: respiración, parpadeo, un leve balanceo, humo del cigarrillo y la luz de la lámpara. Cuando revela un secreto, la cámara se acerca de golpe. Con voz, la boca se mueve según el volumen del audio, analizado en el navegador.
4. **En la tele**, el personaje ocupa media pantalla y el texto aparece debajo, como subtítulo.

Esto anda en una tele modesta, mantiene la estética de cada caso y se puede mejorar después con clips de video (E) sin cambiar la lógica.

**Lo que hay que validar antes de construirlo:** qué generador de imágenes usamos para las hojas de expresiones y si mantiene el mismo rostro entre expresiones. Propongo hacer un prototipo con un solo personaje (Alberto Mansilla) para verlo funcionando antes de hacerlo para todos.

## Fuentes

- [TalkingHead (Three.js, lip sync)](https://github.com/TonAldo48/TalkingHead) · [HeadAudio](https://github.com/kyr0/HeadAudio)
- [Rive para personajes](https://rive.app/use-cases/character-animation) · [Lip sync con máquina de estados de Rive](https://dev.to/uianimation/how-to-build-real-time-ai-lip-sync-using-rive-state-machine-viseme-data-26o7) · [Visemas de Duolingo](https://blog.duolingo.com/world-character-visemes)
- [Licencia del SDK de Live2D](https://www.live2d.com/en/sdk/license/)
- [Comparativa de avatares en tiempo real](https://medium.com/@ggarciabernardo/the-live-avatar-landscape-apis-transport-and-subjective-evaluation-of-10-leading-providers-5b5b6e8a54dc) · [Precios de avatares 2026](https://vegavid.com/blog/compare-pricing-leading-ai-avatar-services)
