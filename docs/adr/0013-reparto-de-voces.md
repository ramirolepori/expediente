# 0013. Reparto de voces por elenco, con el género medido

**Contexto.** Con un modelo de Piper por género y edad (ADR 0009), varios personajes sonaban igual y los hombres adultos (Martín Duarte, Tomás Bertoldi) tenían voz de mujer: el modelo `es_MX-claude-high` es una voz femenina. El nombre del modelo no dice el género y las fichas de rhasspy/piper-voices tampoco.

**Decisión.**

- El género de cada modelo se decide midiendo su tono medio (F0) sobre la misma frase. Hombres: Davefx (~119 Hz), Carlfm (~118 Hz), Sharvard hablante 0 (~129 Hz) y Ald (~167 Hz). Mujeres: Claude (~182 Hz), Daniela (~188 Hz) y Sharvard hablante 1 (~210 Hz). Las MLS (es_ES) son mujeres de calidad baja y quedaron afuera.
- `vocesDelElenco` (`src/motor/voz.ts`) reparte sobre el elenco interrogable entero: por género, del personaje más grave al más agudo (edad, y `tono` con palabras como "grave" o "nervioso"), cada uno toma la siguiente voz base y una altura de tono escalonada. Así la voz de alguien no cambia cuando se desbloquea otro personaje, y la vista solo manda la voz de los disponibles.
- La altura se logra sin procesar audio: se genera con `length_scale` multiplicado por la altura y el WAV se escribe con la frecuencia de muestreo multiplicada por lo mismo. La altura se limita para que el tono final quede entre 85 y 150 Hz en hombres y entre 165 y 255 Hz en mujeres. Un test lo verifica para todos los elencos.
- `tono` también mueve la expresividad (`noise_scale` y `noise_w`): más con "nervioso" o "agitado", menos con "calmo" o "formal". La `velocidad` sigue yendo a `length_scale`.
- `VozPiper` (modelo, hablante, velocidad, altura, expresividad) no depende de un personaje: una voz de narrador puede ser otro `VozPiper` armado con `BASES`.

**Consecuencias.** Seis modelos en vez de cuatro: unos 400 MB para el Hotel Aurora y 345 MB para la Vendimia. Carlfm es de calidad baja (16 kHz) y se escucha más opaco, lo que también ayuda a distinguirlo. Con más de cuatro hombres o tres mujeres en un caso se repite una voz base, pero con otra altura de tono.
