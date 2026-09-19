# Changelog

## [Sin publicar]

### Añadido
- Réplica del diseño de Figma, verificada: geometría dentro de 0,5px en las dos anchuras de
  diseño (1512 y 402), diff visual del 0,42% y 0,59% —solo rasterizado de texto— y 11/11 en
  las pruebas de comportamiento.
- Header con los tres rótulos en su posición real, intro, grid de cuatro piezas a sangre
  (2×2 en escritorio, una columna en móvil) y pie con vuelta al inicio.
- Barra blanca de descripción: sube al pasar el ratón en 600 ms con
  `cubic-bezier(0.16, 1, 0.3, 1)` y baja con la misma curva; en táctil, toggle por toque.
- Lightbox de escritorio, con cierre por Escape, clic fuera o aspa.
- Carga diferida de vídeo con `IntersectionObserver`, en loop permanente una vez arranca.
- Inter autoalojada (48 KB), sin depender de un CDN.
- `scripts/`: ingesta del diseño por API REST, gate geométrico, gate visual, pruebas de
  comportamiento y pipeline de encodeado de vídeo.

### Pendiente
- Enlace de LinkedIn en "Contact me" (ahora el rótulo se muestra sin enlace activo).
- Material real: fotos y vídeos de los proyectos, y sus títulos definitivos.
- `og:image` para la previsualización al compartir el enlace.
