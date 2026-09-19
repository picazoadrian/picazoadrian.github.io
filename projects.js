/**
 * Único archivo que hay que tocar para añadir, quitar o reordenar proyectos.
 *
 *   src    — ruta SIN extensión dentro de assets/media (main.js añade .webm/.mp4/.webp),
 *            o null para usar un placeholder gris numerado.
 *   type   — 'video' | 'image' | 'placeholder'
 *   title  — línea principal de la barra del hover
 *   subtitle — línea secundaria
 *
 * Ejemplo con material real:
 *   { src: 'assets/media/01', type: 'video', title: 'Skechers New York', subtitle: 'Fall Winter 26' }
 */
window.PROJECTS = [
  { src: null, type: 'placeholder', title: 'Project One',   subtitle: 'Season 00' },
  { src: null, type: 'placeholder', title: 'Project Two',   subtitle: 'Season 00' },
  { src: null, type: 'placeholder', title: 'Project Three', subtitle: 'Season 00' },
  { src: null, type: 'placeholder', title: 'Project Four',  subtitle: 'Season 00' },
  { src: null, type: 'placeholder', title: 'Project Five',  subtitle: 'Season 00' },
  { src: null, type: 'placeholder', title: 'Project Six',   subtitle: 'Season 00' },
];
