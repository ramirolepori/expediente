# Estado del proyecto

Fuente única de "dónde estamos" para todas las sesiones. **Al terminar una tarea, actualizá este archivo** (mover lo hecho, sumar lo nuevo) en el mismo commit.

Última actualización: 15/11/2026.

## Funcionando en producción

- Salas con código y QR, panel por jugador y tele compartida, tiempo real con Supabase.
- Caso **Hotel Aurora** jugable: 3 sobres, celular navegable, candados, 4 minijuegos, modo traidor.
- Interrogatorios con IA y guardrails (ADR 0002). Límites según la cuota gratis (ADR 0005): 3 s por jugador, 12 por sala por minuto, 150 por partida con contador visible, y ante un 429 del proveedor un aviso amable sin pasar al respaldo.
- Pizarra compartida con hilos y línea de tiempo, notas personales y de equipo, votación y revelación final paso a paso.
- Laboratorio: personaje, ambientaciones, minijuegos y pizarra.
- Documentación para autores: [contrato-de-caso.md](contrato-de-caso.md) y [prompt-autor-de-casos.md](prompt-autor-de-casos.md).

## Pendiente, en orden

1. **Ajustes al Hotel Aurora:** el secreto de Arcimboldo sale muy fácil, las confesiones son bruscas, la opción del móvil nombra ECLIPSE, la opción correcta de Duarte es mucho más larga que las otras.
2. **Voces** (ADR 0009): una sola pista, Piper en la PC anfitriona.
3. Mostrar en la tele las pruebas que se van desbloqueando.
4. Limpieza de salas viejas (cron de Vercel).
5. Ping semanal a Supabase para que no se pause.
6. Tecla de pulsar para hablar (accesibilidad).

Más adelante: modo competitivo, herramienta de autor (etapa 2), casos nuevos, juego online o asincrónico, `imagen` y `roles` en pruebas.

## Esperando decisión de Ramiro (no avanzar sin él)

- **Estilo del personaje:** vectorial o retratos realistas (`/laboratorio/personaje`). Después se conecta al interrogatorio.
- **Ambientaciones:** se ven muy parecidas, quiere darles una vuelta de rosca.
- Mover las soluciones de los casos a Supabase (ADR 0008).

## Problemas conocidos

- GitHub Actions bloqueado por la cuenta (ticket de soporte #5006449). Mientras tanto Vercel corre los tests.
- El e2e falla si se editan archivos durante la corrida (ADR 0007).
- Un amigo de Ramiro está escribiendo un caso nuevo con el prompt de autor.
