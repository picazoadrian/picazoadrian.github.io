# Adrián Picazo — portfolio

Sitio estático, sin build ni dependencias. Se publica en GitHub Pages desde la rama `main`.

## Cómo se ve en local

```bash
python3 -m http.server 8000
# http://localhost:8000
```

Abrir el `index.html` con doble clic también funciona: no hay `fetch` ni módulos.

## Cómo se añade un proyecto

1. Encodear la pieza:

   ```bash
   ./scripts/encode.sh ~/ruta/al/video.mov 01
   ```

   Deja `assets/media/01.webm`, `01.mp4` y `01.webp` (poster).

2. Añadir una línea en `projects.js`:

   ```js
   { src: 'assets/media/01', type: 'video', title: 'Skechers New York', subtitle: 'Fall Winter 26' }
   ```

El grid se pinta solo a partir de ese array. No hay que tocar el HTML.

Para una foto en vez de un vídeo: `type: 'image'` y un `.webp` con el mismo nombre base.
Con `type: 'placeholder'` y `src: null` sale un bloque gris numerado.

## Comportamiento

- **Desktop**: la barra blanca sube al pasar el ratón (600 ms, `cubic-bezier(0.16, 1, 0.3, 1)`)
  y baja con la misma curva al salir. Al hacer clic, la pieza se abre a pantalla completa.
- **Táctil**: el primer toque sube la barra, el segundo la baja. No hay pantalla completa.
- **Vídeo**: arranca 200 px antes de entrar en pantalla y se queda en loop silencioso.
- Todo respeta `prefers-reduced-motion`.

## Estructura

```
index.html      estructura y metadatos
styles.css      estilos (los valores con la nota FIGMA se calibran contra el diseño)
projects.js     los datos de los proyectos — el único archivo del día a día
main.js         grid, hover/toggle, lightbox, carga de vídeo, scroll
scripts/        pipeline de encodeado
docs/           especificación medida del diseño de Figma
```
