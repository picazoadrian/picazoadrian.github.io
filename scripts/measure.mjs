/**
 * Arnés de verificación: abre el sitio a una anchura dada y devuelve la geometría real
 * del DOM más un screenshot. Es la mitad "código" de los dos gates del pixel-loop;
 * la otra mitad son las medidas de Figma en docs/figma-spec.md.
 *
 *   node scripts/measure.mjs [anchura] [alto] [etiqueta]
 */
import { chromium } from '/Users/hugorodriguezortega/Projects/clients/archive/node_modules/playwright/index.mjs';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const WIDTH = Number(process.argv[2] || 1512);
const HEIGHT = Number(process.argv[3] || 982);
const LABEL = process.argv[4] || `${WIDTH}x${HEIGHT}`;

const TYPES = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
  '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.webp': 'image/webp',
  '.webm': 'video/webm', '.mp4': 'video/mp4', '.jpg': 'image/jpeg', '.png': 'image/png'
};

const server = createServer(async (req, res) => {
  const path = normalize(decodeURIComponent(req.url.split('?')[0]));
  const file = join(ROOT, path === '/' ? 'index.html' : path);
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404).end('not found');
  }
});

await new Promise((r) => server.listen(0, r));
const port = server.address().port;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT } });

const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

await page.goto(`http://localhost:${port}/`, { waitUntil: 'networkidle' });
await page.waitForSelector('#loader', { state: 'detached', timeout: 8000 }).catch(() => {});
await page.evaluate(() => document.fonts.ready);

const measured = await page.evaluate(() => {
  const box = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: +r.x.toFixed(2), y: +r.y.toFixed(2), w: +r.width.toFixed(2), h: +r.height.toFixed(2) };
  };
  return {
    header: box('.site-header'),
    headerName: box('.site-header__name'),
    grid: box('.grid'),
    firstCard: box('.card'),
    firstBar: box('.card__bar'),
    footer: box('.site-footer'),
    cards: document.querySelectorAll('.card').length,
    docWidth: document.documentElement.scrollWidth,
    horizontalScroll: document.documentElement.scrollWidth > window.innerWidth
  };
});

await page.screenshot({ path: join(ROOT, 'docs', `render-${LABEL}.png`), fullPage: true });
await browser.close();
server.close();

console.log(JSON.stringify({ label: LABEL, viewport: { WIDTH, HEIGHT }, ...measured, errors }, null, 2));
