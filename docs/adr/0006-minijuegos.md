# 0006. Minijuegos de catálogo y personalizados

**Contexto.** Cada caso quiere sus propios minijuegos, sin tocar la plataforma.

**Decisión.** Tipos de catálogo que solo traen datos (`rompecabezas`, `linea_tiempo`, `cifrado`) y un tipo `personalizado`: una página HTML del caso en `public/casos/<id>/` dentro de un iframe con `sandbox="allow-scripts"`, que habla por `postMessage`. El servidor valida la respuesta. Las piezas usan ids opacos por sala. Detalle en [../minijuegos.md](../minijuegos.md).

**Consecuencias.** Un caso puede traer cualquier minijuego sin cambiar código. La página no puede leer nada de la app. Se prueban sueltos en `/laboratorio/minijuegos`.
