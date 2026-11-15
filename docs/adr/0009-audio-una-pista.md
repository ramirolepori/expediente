# 0009. Audio: una sola pista para todos

**Contexto.** Se juega en el mismo lugar. Si cada dispositivo reproduce la voz, suena con eco.

**Decisión.** Una sola pista: el dispositivo que reproduce también genera el audio, con Piper en el navegador (gratis, sin cuota). No se sube audio a ningún lado.

- `config.audioEn = "nadie"` (por defecto) apaga las voces; en la pantalla de inicio se avisa que activarlas baja unos 400 MB. `"compartida"`: suena en la primera tele de la sala; si no hay tele, en el anfitrión. `"interrogador"`: en el dispositivo de quien hizo la pregunta. `"todos"` existe en el tipo, pero no se ofrece en la pantalla de inicio porque hace eco.
- El dispositivo que suena muestra el botón "Activar voces": los navegadores no reproducen audio sin un toque previo.
- Runner propio (`src/cliente/piper.ts`) sin dependencias npm: onnxruntime-web 1.31.1 y el fonemizador de Piper se cargan desde jsDelivr con versión fija e integridad (SRI), y solo al activar las voces. Los modelos vienen de `rhasspy/piper-voices` en un commit fijo y quedan en la Cache API. Se descartó `@mintplex-labs/piper-tts-web` porque fija el hablante, no deja tocar la velocidad, lee de un espejo sin voces `es_AR` y carga un wasm de otra versión de onnxruntime.
- Qué voz le toca a cada personaje: ver [0013](0013-reparto-de-voces.md). No hay voces masculinas rioplatenses en Piper.
- Mientras baja un modelo, o si Piper falla, se usa `speechSynthesis` del navegador.

**Consecuencias.** La primera vez el dispositivo que suena baja entre 28 y 115 MB por modelo (unos 400 MB para el Hotel Aurora). La tele tiene que poder correr wasm: una pestaña en una PC anda, un Smart TV puede no andar. La inferencia corre en el hilo principal con un solo hilo (la app no tiene COOP/COEP). Daniela es CC BY-SA 4.0 y Sharvard CC BY 3.0: el crédito está en `/laboratorio/voces`.

**Deuda técnica.** Generar en la PC del anfitrión, subir el audio a Supabase Storage y que la tele solo reproduzca. Haría falta para teles que no corren wasm y para volver a escuchar una respuesta como prueba.
