# Estado del proyecto

Fuente única de "dónde estamos" para todas las sesiones. **Al terminar una tarea, actualizá este archivo** (mover lo hecho, sumar lo nuevo) en el mismo commit.

Última actualización: 15/11/2026.

## Funcionando en producción

- Salas con código y QR, panel por jugador y tele compartida, tiempo real con Supabase. Con la partida empezada se puede sumar una tele o un jugador: el botón "➕ Sumar" del encabezado muestra código, QR y abre la tele. En modo traidor el traidor se sortea al abrir el caso, así que quien entra tarde nunca lo es.
- Caso **Hotel Aurora** jugable: 3 sobres, celular navegable, candados, 4 minijuegos, modo traidor. Valentina ya no admite ser Arcimboldo con lo del primer sobre (necesita el labial, o el celular más el testimonio del hielo) y las opciones del móvil y de Duarte tienen largo parecido, sin nombrar ECLIPSE.
- Interrogatorios con IA y guardrails (ADR 0002). Un secreto habilitado se cuenta de a partes, después de una reacción, no todo de golpe. Límites según la cuota gratis (ADR 0005): 3 s por jugador, 12 por sala por minuto, 150 por partida con contador visible, y ante un 429 del proveedor un aviso amable sin pasar al respaldo.
- La tele muestra las pruebas recién desbloqueadas durante 25 s (o hasta que alguien pregunte) y una lista del expediente con las más nuevas arriba. Las del primer sobre y las que llegan con una respuesta no se destacan, solo se resaltan en la lista.
- Pizarra compartida con hilos y línea de tiempo, notas personales y de equipo, votación y revelación final paso a paso.
- Micrófono en el interrogatorio (Web Speech API; en Firefox no aparece): se mantiene apretado el botón 🎙️, la barra espaciadora (si el foco no está en un campo, botón o link) o Enter/Espacio con el botón enfocado, y al soltar se envía. Un aviso visible y para lectores de pantalla dice que está escuchando, y un texto de ayuda nombra la tecla.
- Voces de los personajes con Piper en el navegador (ADR 0009): una sola pista, en la tele o en el anfitrión (o en quien pregunta), elegidas al crear la sala (por defecto, sin voces) y activadas con un botón. Respaldo con la voz del navegador mientras bajan los modelos.
- Limpieza de salas viejas: un cron diario de Vercel (8:00 UTC, `vercel.json`) llama a `/api/cron/limpiar`, que borra las salas sin escrituras hace más de 24 h (columna `actualizada`). Pide `CRON_SECRET` cargada en Vercel; sin esa variable la ruta rechaza todo. La misma consulta diaria mantiene activo Supabase Free, que pausa a los 7 días sin actividad: no hace falta un ping aparte.
- Personajes dibujados en el interrogatorio del panel y en la tele (ADR 0010): retratos si el caso los trae, si no vectorial con los `rasgos` del caso o con rasgos por defecto según voz, edad e id. El vectorial cubre mujeres, hombres y personas no binarias, de bebés a mayores, y perros, gatos y loros. La emoción la elige el modelo en cada respuesta (etiqueta `[emocion: X]`, sin llamadas extra) y el personaje mueve la boca mientras se escribe la respuesta o suena su voz. El Hotel Aurora trae rasgos para sus nueve personajes.
- Laboratorio: personaje (muestrario de variedad y el elenco del Hotel Aurora), ambientaciones, minijuegos, pizarra y voces.
- Documentación para autores: [contrato-de-caso.md](contrato-de-caso.md) y [prompt-autor-de-casos.md](prompt-autor-de-casos.md).

## Pendiente, en orden

Nada por ahora.

Deuda técnica: generar las voces en el anfitrión y repartirlas por Supabase Storage, para teles que no corren wasm (ADR 0009).

Más adelante: modo competitivo, herramienta de autor (etapa 2, incluye cómo se consiguen los retratos), casos nuevos, juego online o asincrónico, `imagen` y `roles` en pruebas.

## Esperando decisión de Ramiro (no avanzar sin él)

- **Ambientaciones:** se ven muy parecidas, quiere darles una vuelta de rosca.
- Mover las soluciones de los casos a Supabase (ADR 0008).

## Problemas conocidos

- GitHub Actions bloqueado por la cuenta (ticket de soporte #5006449). Mientras tanto Vercel corre los tests.
- El e2e falla si se editan archivos durante la corrida (ADR 0007).
- Un amigo de Ramiro está escribiendo un caso nuevo con el prompt de autor.
