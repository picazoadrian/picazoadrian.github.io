/**
 * Gate visual: compara el render propio contra el PNG del nodo de Figma.
 *
 *   node scripts/visual.mjs [pc|mobile]
 *
 * Como la v1 lleva placeholders grises, para comparar se inyecta en caliente la
 * imagen original del boceto (docs/figma-source-image.png). No se toca el sitio:
 * la inyección vive solo en esta página de prueba.
 *
 * El diff se calcula dentro de Chromium con canvas, sin dependencias. Deja en
 * docs/ el render y un mapa de diferencias en rojo.
 *
 * Diferencia ESPERADA: en Figma la barra blanca está dibujada por fuera de su
 * card y se ve solapando la siguiente; en la web, en reposo, está oculta. Esas
 * franjas de 36px salen marcadas y no son un defecto.
 */
import { chromium } from '/Users/hugorodriguezortega/Projects/clients/archive/node_modules/playwright/index.mjs';
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const WHICH = process.argv[2] || 'pc';

const VARIANTS = {
  pc:     { w: 1512, h: 1204, figma: 'figma-2-66.png',  objectPosition: '56.35% center' },
  mobile: { w: 402,  h: 2140, figma: 'figma-9-167.png', objectPosition: '20.15% center' }
};
const V = VARIANTS[WHICH];

const TYPES = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
  '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png'
};

const server = createServer(async (req, res) => {
  const path = normalize(decodeURIComponent(req.url.split('?')[0]));
  const file = join(ROOT, path === '/' ? 'index.html' : path);
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404).end('not found'); }
});
await new Promise((r) => server.listen(0, r));
const base = `http://localhost:${server.address().port}/`;

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: V.w, height: V.h },
  hasTouch: WHICH === 'mobile',
  isMobile: WHICH === 'mobile'
});
await page.goto(base, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);

/* Sustituye los placeholders por la foto del boceto, con el encuadre de Figma */
await page.evaluate((objectPosition) => {
  document.querySelectorAll('.card__media--placeholder').forEach((el) => {
    const img = document.createElement('img');
    img.className = 'card__media';
    img.src = 'docs/figma-source-image.png';
    img.style.objectPosition = objectPosition;
    el.replaceWith(img);
  });
}, V.objectPosition);
await page.waitForTimeout(600);

const ownPath = join(ROOT, 'docs', `visual-own-${WHICH}.png`);
await page.screenshot({ path: ownPath, fullPage: true });

/* Diff en canvas: el PNG de Figma viene a escala 2, se reescala al viewport */
const diff = await page.evaluate(async ({ own, figma, w, h }) => {
  const load = (src) => new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

  const draw = (img) => {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, w, h);
    return ctx.getImageData(0, 0, w, h);
  };

  const [a, b] = await Promise.all([load(own), load(figma)]);
  const pa = draw(a).data;
  const pb = draw(b).data;

  const out = document.createElement('canvas');
  out.width = w; out.height = h;
  const octx = out.getContext('2d');
  const map = octx.createImageData(w, h);

  let differing = 0;
  const rows = new Array(h).fill(0);

  for (let i = 0; i < pa.length; i += 4) {
    const delta = Math.abs(pa[i] - pb[i]) + Math.abs(pa[i + 1] - pb[i + 1]) + Math.abs(pa[i + 2] - pb[i + 2]);
    const bad = delta > 45;
    if (bad) { differing++; rows[Math.floor((i / 4) / w)]++; }
    map.data[i] = bad ? 255 : pa[i];
    map.data[i + 1] = bad ? 0 : pa[i + 1];
    map.data[i + 2] = bad ? 0 : pa[i + 2];
    map.data[i + 3] = bad ? 255 : 60;
  }

  octx.putImageData(map, 0, 0);

  /* Bandas de filas con más de un 20% de píxeles distintos: dónde se concentra */
  const bands = [];
  let start = null;
  rows.forEach((count, y) => {
    const hot = count > w * 0.2;
    if (hot && start === null) start = y;
    if (!hot && start !== null) { bands.push([start, y - 1]); start = null; }
  });
  if (start !== null) bands.push([start, h - 1]);

  return {
    percent: +(differing / (pa.length / 4) * 100).toFixed(2),
    bands: bands.filter(([a2, b2]) => b2 - a2 >= 2),
    png: out.toDataURL('image/png')
  };
}, {
  own: `docs/visual-own-${WHICH}.png`,
  figma: `docs/${V.figma}`,
  w: V.w,
  h: V.h
});

await writeFile(
  join(ROOT, 'docs', `visual-diff-${WHICH}.png`),
  Buffer.from(diff.png.split(',')[1], 'base64')
);

await browser.close();
server.close();

console.log(`${WHICH}: ${diff.percent}% de píxeles distintos`);
console.log('Bandas donde se concentra la diferencia (y inicio–fin):');
diff.bands.forEach(([a, b]) => console.log(`  ${a}–${b}  (${b - a + 1}px de alto)`));
console.log(`\ndocs/visual-diff-${WHICH}.png`);
