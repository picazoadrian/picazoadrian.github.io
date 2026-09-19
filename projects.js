/**
 * Único archivo que hay que tocar para añadir, quitar o reordenar proyectos.
 *
 *   src      — ruta SIN extensión dentro de assets/media (main.js añade .webm/.mp4/.webp),
 *              o null para usar un placeholder gris.
 *   type     — 'video' | 'image' | 'placeholder'
 *   title    — rótulo negro de la barra (Figma: SCUFFERS)
 *   subtitle — rótulo gris que va detrás (Figma: NEW YORK FW26)
 *
 * Ejemplo con material real:
 *   { src: 'assets/media/01', type: 'video', title: 'SCUFFERS', subtitle: 'NEW YORK FW26' }
 *
 * El boceto tiene cuatro piezas: dos filas de dos en escritorio, una columna en móvil.
 */
window.PROJECTS = [
  { src: null, type: 'placeholder', title: 'SCUFFERS', subtitle: 'NEW YORK FW26' },
  { src: null, type: 'placeholder', title: 'SCUFFERS', subtitle: 'NEW YORK FW26' },
  { src: null, type: 'placeholder', title: 'SCUFFERS', subtitle: 'NEW YORK FW26' },
  { src: null, type: 'placeholder', title: 'SCUFFERS', subtitle: 'NEW YORK FW26' },
];
