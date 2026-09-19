---
name: project_medidas_figma
description: Geometría real del portfolio de Adrián Picazo medida por API, y las rarezas del diseño que hay que replicar tal cual.
metadata:
  type: project
---

Medido por API (`scripts/figma-ingest.mjs`), no copiado del panel de Figma. La tabla completa
está en `docs/figma-spec.md`; aquí queda lo que condiciona decisiones.

## Los tres nodos

| Nodo | Qué es | Tamaño |
|---|---|---|
| `2:66` | Escritorio | 1512 × 1204 |
| `9:167` | Móvil | 402 × 2140 |
| `2:46` | El componente de card, con sus dos variantes | 793.5 × 1034 |

Origen de coordenadas en el canvas: `(71, 47)` en escritorio y `(-457, 47)` en móvil. Hay que
restarlo a todo lo que venga de la API.

## Rarezas del diseño que se replican tal cual

- **"Madrid" NO está centrado.** Está en x=720.5 de 1512; el centro real serían 736. Un
  `space-between` lo movería 15px y rompería el gate. Va posicionado por su x en %.
- **Dos tipografías mezcladas.** "ADRIÁN PICAZO®" es Helvetica Neue; el resto, Inter. En móvil
  "Director | Editor | Color" también pasa a Helvetica Neue y baja de 12px a 10px.
- **Márgenes laterales distintos.** El header usa 16px y el footer y la barra usan 12px.
- **La barra está dibujada FUERA de su card**, justo debajo, y en el render de Figma se ve
  solapando la card siguiente. En la web vive dentro del marco con `overflow: hidden` y en
  reposo está oculta, que es el comportamiento pedido.
- **Cuatro piezas**, no seis: 2×2 a sangre en escritorio (cards de 756×486, sin gaps), una
  columna en móvil (402×486).
- La altura de card es 486 en ambas anchuras, así que el aspect-ratio cambia entre escritorio
  (756/486) y móvil (402/486). No es un ratio único.
- La imagen del boceto es 953px de ancho dentro de una card de 756: encuadre `cover` con
  `object-position: 56.35%` en escritorio. Con material real se usará `center`.

## Gates

- `node scripts/gate.mjs` — geométrico, tolerancia 0.5px. Pasa en las dos anchuras.
- `node scripts/visual.mjs [pc|mobile]` — diff contra el PNG del nodo. 0.42% en escritorio y
  0.59% en móvil, todo antialiasing de texto y bordes de contraste por el reescalado.
- `node scripts/behaviour.mjs` — hover, toggle táctil y lightbox.
