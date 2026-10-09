/**
 * Único archivo que hay que tocar para añadir, quitar o reordenar proyectos.
 *
 *   src      — ruta SIN extensión dentro de assets/media (main.js añade .webm/.mp4/.webp),
 *              o null para usar un placeholder gris.
 *   type     — 'video' | 'image' | 'placeholder'
 *   title    — rótulo negro de la barra (Figma: SCUFFERS)
 *   subtitle — rótulo gris que va detrás (Figma: NEW YORK FW26)
 *   wide     — (opcional) true: ocupa la fila entera en escritorio (dos cards de ancho,
 *              mismo alto); en móvil, lo mismo que una card normal.
 *   lightbox — (opcional) false: el clic no abre la pieza a pantalla completa.
 *   bar      — (opcional) false: sin barra de rótulos al pasar el ratón.
 *   ratio    — (opcional) proporción del marco, p.ej. '16 / 9'; manda sobre la de la
 *              card, así la pieza tiene el alto de su propio vídeo a cualquier ancho.
 *
 * Ejemplo con material real:
 *   { src: 'assets/media/01', type: 'video', title: 'SCUFFERS', subtitle: 'NEW YORK FW26' }
 *
 * Seis vídeos en filas de dos en escritorio; una columna en móvil. (El boceto de
 * Figma tenía cuatro piezas; el resto se añadió después.)
 */
window.PROJECTS = [
  { src: 'assets/media/04', type: 'video', title: 'BTS of Aron Piper', subtitle: 'on set of the Scuffers campaign' },
  { src: 'assets/media/07', type: 'video', title: 'MARCO POLO, MI MEJOR AMIGO', subtitle: 'DIR CREATIVA, DIRECCIÓN Y COLOR' },
  { src: 'assets/media/06', type: 'video', title: 'Cadena SER', subtitle: 'Video Dept.' },
  { src: 'assets/media/02', type: 'video', title: 'Scuffers New York', subtitle: "Fall Winter 26'" },
  { src: 'assets/media/03', type: 'video', title: 'Scuffers Summer', subtitle: "Season 26'" },
  { src: 'assets/media/05', type: 'video', title: '4theclubture x Casa Pepa', subtitle: 'Video Dept.' },
];
