# 0009. Audio: una sola pista para todos

**Contexto.** Se juega en el mismo lugar. Si cada dispositivo reproduce la voz, suena con eco.

**Decisión.** Una sola pista, con Piper en el navegador (gratis, sin cuota). Cuando la voz suena en la tele, el anfitrión genera el audio y lo comparte; en los otros casos, el dispositivo que reproduce también genera el audio.

- `config.audioEn = "nadie"` (por defecto) apaga las voces; en la pantalla de inicio se avisa que activarlas baja unos 400 MB. `"compartida"`: suena en la primera tele de la sala; si no hay tele, en el anfitrión. `"interrogador"`: en el dispositivo de quien hizo la pregunta. `"todos"` existe en el tipo, pero no se ofrece en la pantalla de inicio porque hace eco.
- El dispositivo que suena muestra el botón "Activar voces": los navegadores no reproducen audio sin un toque previo.
- Runner propio (`src/cliente/piper.ts`) sin dependencias npm: onnxruntime-web 1.31.1 y el fonemizador de Piper se cargan desde jsDelivr con versión fija e integridad (SRI). Los modelos vienen de `rhasspy/piper-voices` en un commit fijo y quedan en la Cache API. Se descartó `@mintplex-labs/piper-tts-web` porque fija el hablante, no deja tocar la velocidad, lee de un espejo sin voces `es_AR` y carga un wasm de otra versión de onnxruntime.
- Qué voz le toca a cada personaje: ver [0013](0013-reparto-de-voces.md). No hay voces masculinas rioplatenses en Piper.
- Con una tele en modo compartido, el anfitrión precarga los modelos y sube cada nueva respuesta como WAV (hasta 3 MB) al bucket privado `voces-salas`. El servidor comprueba el token del anfitrión y la respuesta antes de subir. Solo la primera tele puede pedir el enlace firmado, válido por cinco minutos. El cron diario borra los audios de más de un día.
- Mientras baja un modelo en reproducción local o si falla Piper se usa `speechSynthesis` del navegador. La tele en modo compartido espera hasta 25 s por cada respuesta nueva; si el anfitrión no produce el audio a tiempo, o no se puede reproducir, intenta usar la voz del navegador si está disponible.

**Consecuencias.** La primera vez el dispositivo que genera baja entre 28 y 115 MB por modelo (unos 400 MB para el Hotel Aurora). La pestaña del anfitrión tiene que quedar abierta y poder correr WASM. La tele no descarga modelos para las respuestas del interrogatorio. Esto no cambia el narrador de documentos (ADR 0014). La inferencia corre en el hilo principal con un solo hilo (la app no tiene COOP/COEP). Daniela es CC BY-SA 4.0 y Sharvard CC BY 3.0: el crédito está en `/laboratorio/voces`.
