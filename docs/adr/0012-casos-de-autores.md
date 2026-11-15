# 0012. Casos de cualquier autor: kit, cuentas, Supabase y moderación

**Estado.** Decidida (15/11/2026), sin implementar. Reemplaza a la 0008 para los casos nuevos.

**Contexto.** Queremos que cualquiera pueda armar un caso con su propia IA (Claude, ChatGPT, Gemini) por fuera de la plataforma, y después subirlo, validarlo y publicarlo. El caso de Franco mostró que una IA externa arma casos compatibles cuando tiene el contrato, el validador y un formato de entrega claro. También que cada caso puede tener su impronta usando las piezas opcionales del contrato (escenas, capítulos, retratos o vectorial, minijuegos), sin interfaces propias por caso.

**Decisión.**

- **Kit de autor descargable** desde una página `/autores`, con un acceso secundario desde el inicio. Trae una guía por etapas (idea y verdad, personajes y capítulos, pruebas con secretos y mentiras, preguntas, ayudas e imágenes), el contrato en markdown y como JSON Schema, el catálogo de piezas, las reglas de diseño aprendidas, un caso de ejemplo y un prompt inicial para copiar. Se genera desde el código en cada deploy, así coincide siempre con lo que la plataforma acepta, y declara la versión del contrato. El mismo kit funciona como skill del proyecto.
- **Formato de entrega fijo:** la carpeta del caso con `caso.json`, imágenes, `REVISION.md` (la solución y la lógica de cada capítulo, para quien revisa) y `PROMPTS-IMAGENES.md`.
- **Imágenes y retratos los genera el autor con su IA**, siguiendo la guía del kit. La plataforma solo los valida (formato, proporción, tamaño y peso) y nunca genera imágenes. Todo es opcional: sin escena el sobre se ve como lista, sin retratos va el vectorial y sin fotos la prueba es texto. En el laboratorio habrá un editor para ubicar los puntos de las escenas sobre la imagen.
- **Cuentas de autor** con Supabase Auth (link mágico por mail, sin contraseñas).
- **Los casos nuevos viven en Supabase:** el JSON en una tabla y las imágenes en Storage, y se cargan del lado del servidor. Así la solución deja de estar a la vista en el repo público.
- **Estados de un caso:** borrador (subido, con errores), validado, privado (se juega por link para probarlo) y publicado (en el catálogo). Nada llega al catálogo sin la aprobación de Ramiro o de los moderadores que él elija: hacen falta roles de administrador y moderador.
- **El contenido de un caso es dato no confiable:** su texto va a los prompts de los personajes, así que el validador y los guardrails tienen que frenar instrucciones dirigidas al modelo. También hay límites de tamaño, solo formatos de imagen seguros y markdown sin HTML.
- **Cuota de Gemini solo para producción.** El validador y la sala de prueba usan el modelo falso.

**Consecuencias.** El validador pasa a ser la puerta de entrada de todo caso: forma, resolubilidad, spoilers, peso de las imágenes y contenido sospechoso. El Storage gratis de Supabase (1 GB) alcanza para unos 500 casos con imágenes. Los casos que ya están en el repo (Hotel Aurora y Muerte en la vendimia) siguen ahí hasta migrarlos a Supabase. Más adelante, cada usuario podrá usar su propia clave y su modelo para no depender de la cuota compartida; esa clave nunca se guarda en claro en nuestro servidor.
