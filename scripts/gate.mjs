/**
 * Gate geométrico: compara el DOM real contra las medidas de Figma.
 *
 *   node scripts/gate.mjs            las dos anchuras de diseño
 *   node scripts/gate.mjs pc         solo escritorio
 *   node scripts/gate.mjs mobile     solo móvil
 *
 * Las referencias salen de docs/figma-spec.md, normalizadas restando el origen
 * del frame (71,47 en escritorio; -457,47 en móvil). Tolerancia: 0.5px.
 *
 * Desviación deliberada del boceto, pedida después de verlo publicado: "Madrid"
 * va CENTRADO (en Figma estaba 15px a la izquierda del centro), y tanto "Madrid"
 * como el rol bajan de 12px a 10px para igualar a la intro, lo que recoloca su
 * línea en y=25.5.
 *
 * Los rótulos de texto se comparan por su borde ANCLADO (izquierdo si van a la
 * izquierda, derecho si van a la derecha): el ancho depende de la fuente que
 * resuelva el navegador y no es una medida que podamos exigir.
 */
import { chromium } from '/Users/hugorodriguezortega/Projects/clients/archive/node_modules/playwright/index.mjs';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const TOL = 0.5;

/* El velo de carga cubre la página ~1.8s: hay que dejarlo terminar antes de
   medir o de simular un hover, o el puntero choca contra él. */
async function waitForLoader(page) {
  await page.waitForSelector('#loader', { state: 'detached', timeout: 8000 }).catch(() => {});
}

const TYPES = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
  '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.webp': 'image/webp',
  '.webm': 'video/webm', '.mp4': 'video/mp4', '.jpg': 'image/jpeg', '.png': 'image/png'
};

/* Referencias de Figma, ya normalizadas al origen del frame. */
const EXPECTED = {
  pc: {
    viewport: { width: 1512, height: 1204 },
    frameHeight: 1204,
    checks: [
      ['.masthead',        { y: 0,    h: 51 }],
      ['.masthead__name',  { x: 16,   y: 24, h: 15 }],
      ['.masthead__place', { centerX: 756, y: 25.5, h: 12 }],
      ['.masthead__role',  { right: 1496, y: 25.5, h: 12 }],
      ['.intro',           { y: 51,   h: 56 }],
      ['.intro__text',     { x: 16,   y: 67, h: 24 }],
      ['.card:nth-child(1) .card__frame', { x: 0,   y: 147, w: 756, h: 486 }],
      ['.card:nth-child(2) .card__frame', { x: 756, y: 147, w: 756, h: 486 }],
      ['.card:nth-child(3) .card__frame', { x: 0,   y: 633, w: 756, h: 486 }],
      ['.card:nth-child(4) .card__frame', { x: 756, y: 633, w: 756, h: 486 }],
      ['.colophon',          { y: 1119, h: 85 }],
      ['.colophon__contact', { x: 12,   y: 1136.5 }],
      ['.colophon__top',     { right: 1500, y: 1136.5 }]
    ],
    /* La barra en hover ocupa los 36px inferiores de su card (en reposo está fuera). */
    hoverBar: { h: 36, bottom: 633 }
  },
  mobile: {
    viewport: { width: 402, height: 2140 },
    frameHeight: 2140,
    checks: [
      ['.masthead',        { y: 0,  h: 47 }],
      ['.masthead__name',  { x: 12, y: 20, h: 15 }],
      ['.masthead__role',  { right: 390, y: 21.5 }],
      ['.intro',           { y: 47, h: 24 }],
      ['.intro__text',     { x: 12, y: 47, h: 24 }],
      ['.card:nth-child(1) .card__frame', { x: 0, y: 111,  w: 402, h: 486 }],
      ['.card:nth-child(2) .card__frame', { x: 0, y: 597,  w: 402, h: 486 }],
      ['.card:nth-child(3) .card__frame', { x: 0, y: 1083, w: 402, h: 486 }],
      ['.card:nth-child(4) .card__frame', { x: 0, y: 1569, w: 402, h: 486 }],
      ['.colophon',          { y: 2055, h: 85 }],
      ['.colophon__contact', { x: 12,   y: 2074 }],
      ['.colophon__top',     { right: 390, y: 2074 }]
    ],
    hoverBar: null
  }
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

/* BASE_URL permite gatear el sitio YA PUBLICADO, no solo la copia local:
   BASE_URL=https://picazoadrian.github.io node scripts/gate.mjs */
const url = process.env.BASE_URL || `http://localhost:${server.address().port}/`;
if (process.env.BASE_URL) console.log(`Gateando ${url}`);

const only = process.argv[2];
const browser = await chromium.launch();
let failures = 0;

for (const [name, spec] of Object.entries(EXPECTED)) {
  if (only && only !== name) continue;

  const context = await browser.newContext({
    viewport: spec.viewport,
    hasTouch: name === 'mobile',
    isMobile: name === 'mobile'
  });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await waitForLoader(page);

  console.log(`\n── ${name}  ${spec.viewport.width}×${spec.viewport.height} ──`);

  for (const [selector, want] of spec.checks) {
    const got = await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {
        x: r.x, y: r.y + window.scrollY, w: r.width, h: r.height,
        right: r.right, centerX: r.x + r.width / 2
      };
    }, selector);

    if (!got) {
      console.log(`FALLA  ${selector} — no existe en el DOM`);
      failures++;
      continue;
    }

    const bad = [];
    for (const [key, value] of Object.entries(want)) {
      const delta = got[key] - value;
      if (Math.abs(delta) > TOL) bad.push(`${key} ${got[key].toFixed(2)} ≠ ${value} (${delta > 0 ? '+' : ''}${delta.toFixed(2)})`);
    }

    if (bad.length) { console.log(`FALLA  ${selector} — ${bad.join(', ')}`); failures++; }
    else console.log(`OK     ${selector}`);
  }

  /* Altura total de la página contra la del frame */
  const docHeight = await page.evaluate(() => document.documentElement.scrollHeight);
  const heightDelta = docHeight - spec.frameHeight;
  if (Math.abs(heightDelta) > TOL) {
    console.log(`FALLA  altura total — ${docHeight} ≠ ${spec.frameHeight} (${heightDelta > 0 ? '+' : ''}${heightDelta})`);
    failures++;
  } else console.log('OK     altura total');

  if (spec.hoverBar) {
    await page.hover('.card:nth-child(1) .card__frame');
    await page.waitForTimeout(800);
    const bar = await page.evaluate(() => {
      const r = document.querySelector('.card__bar').getBoundingClientRect();
      return { h: r.height, bottom: r.bottom + window.scrollY };
    });
    const bad = [];
    if (Math.abs(bar.h - spec.hoverBar.h) > TOL) bad.push(`h ${bar.h.toFixed(2)} ≠ ${spec.hoverBar.h}`);
    if (Math.abs(bar.bottom - spec.hoverBar.bottom) > TOL) bad.push(`bottom ${bar.bottom.toFixed(2)} ≠ ${spec.hoverBar.bottom}`);
    if (bad.length) { console.log(`FALLA  barra en hover — ${bad.join(', ')}`); failures++; }
    else console.log('OK     barra en hover');
  }

  await context.close();
}

await browser.close();
server.close();

console.log(failures ? `\n${failures} desviaciones por encima de ${TOL}px` : `\nTodo dentro de ${TOL}px`);
process.exit(failures ? 1 : 0);
