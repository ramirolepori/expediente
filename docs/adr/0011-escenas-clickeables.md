# 0011. Escenas ilustradas con puntos que abren pruebas

**Estado.** Implementada como índice visual (15/11/2026). Propuesta por Franco junto con el caso Muerte en la vendimia; Ramiro eligió el camino de piezas opcionales en el contrato en lugar de una interfaz propia por caso.

**Contexto.** Abrir un sobre muestra una lista de pruebas. Para casos armados por capítulos queremos que cada capítulo se vea como un lugar que se investiga: una ilustración con objetos para tocar.

**Decisión.** Cada sobre puede traer una `escena` opcional: una imagen y una lista de puntos `{ prueba, x, y, etiqueta }`. Es un índice visual: tocar un punto abre la misma prueba que su tarjeta. No hay acción nueva en el servidor ni estado nuevo. La escena viaja en la vista solo con el sobre abierto y sin los puntos de pruebas bloqueadas, para no adelantar que ahí hay algo (0001). El validador exige que cada punto apunte a una prueba del mismo sobre. El ✓ de "examinado" es local de cada jugador.

**Consecuencias.** Cualquier caso puede sumar escenas sin tocar código; sin escena, el sobre se ve como antes. La lista de pruebas sigue debajo, así que en celulares chicos se puede jugar sin la imagen. Quedan para más adelante: escena en la tele, exploración con estado compartido (que las pruebas aparezcan al tocar el objeto) y una herramienta del laboratorio para ubicar los puntos.
