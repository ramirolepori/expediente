# 0015. Identidad de las ambientaciones: estética propia, sonido y voz del narrador

**Estado.** Decidida (15/11/2026). Piloto hecho en noir, con la música "Moil" (CC0); faltan policial, médico, terror y de época, y los sonidos propios de cada caso.

**Contexto.** Las cinco ambientaciones compartían el mismo armado (papel, botones, tarjetas) y solo cambiaban colores, tipografías y un efecto de fondo sutil, así que se veían parecidas. Tampoco tenían sonido.

**Decisión.**

- **Cada ambientación cambia la forma, no solo el color:** materiales, forma de los componentes (por ejemplo, los radios de borde se redefinen por ambientación), un motivo gráfico y un movimiento propios. Todo vive en `globals.css` bajo `[data-ambientacion="…"]`, sin tocar los componentes.
- **Sonido en tres capas:** ambiente en loop, música y efectos para los momentos del juego (abrir un sobre, una revelación, un candado, un código mal, el final). Ambiente y música bajan cuando habla un personaje o el narrador.
- **El ambiente y los efectos se generan en el navegador con Web Audio:** sin archivos ni licencias. La música va en archivos **CC0** que Ramiro escucha y aprueba antes de sumarlos al repo.
- **Dónde suena:** en la tele, o en el anfitrión si no hay tele. Cada dispositivo lo puede prender o apagar y elegir el volumen; arranca con el primer toque porque los navegadores no dejan sonar antes.
- **El narrador lleva un efecto por ambientación** (radio vieja en noir), además de su voz.
- **Primero un piloto completo en noir**, para validar la dirección antes de hacer las otras cuatro.

**Consecuencias.** `src/cliente/paisajes.ts` define cada paisaje (ambiente, efectos, efecto del narrador y música opcional); una ambientación sin paisaje no suena. El efecto del narrador hace pasar su audio por Web Audio, y solo se conecta con el contexto de audio andando, para no dejarlo mudo. Más adelante un caso podrá traer sus propios sonidos por sobre o por momento.
