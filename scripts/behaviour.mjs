/**
 * Comprueba el comportamiento, no el pixel: hover en escritorio, toggle táctil,
 * lightbox y scroll. Complementa a measure.mjs.
 *
 *   node scripts/behaviour.mjs
 */
import { chromium } from '/Users/hugorodriguezortega/Projects/clients/archive/node_modules/playwright/index.mjs';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
/* El velo de carga cubre la página ~1.8s: hay que dejarlo terminar antes de
   medir o de simular un hover, o el puntero choca contra él. */
async function waitForLoader(page) {
  await page.waitForSelector('#loader', { state: 'detached', timeout: 8000 }).catch(() => {});
}

const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml' };

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
const url = `http://localhost:${server.address().port}/`;

const results = [];
const check = (name, pass, detail = '') => results.push({ name, pass, detail });

const browser = await chromium.launch();

/* --- Escritorio: puntero fino --- */
const desktop = await browser.newContext({ viewport: { width: 1512, height: 982 }, hasTouch: false });
const page = await desktop.newPage();
/* --- Pantalla de carga: se mide ANTES de esperar a que se retire --- */
await page.goto(url, { waitUntil: 'domcontentloaded' });

const loaderAtStart = await page.evaluate(() => {
  const el = document.getElementById('loader');
  if (!el) return null;
  const sq = el.querySelector('.loader__square');
  const s = getComputedStyle(sq);
  const box = sq.getBoundingClientRect();
  return {
    covers: getComputedStyle(el).position === 'fixed',
    animation: s.animationName + ' ' + s.animationDuration + ' ' + s.animationTimingFunction,
    centered: Math.abs((box.x + box.width / 2) - window.innerWidth / 2) < 1
  };
});

check('el velo de carga cubre la pantalla', !!loaderAtStart && loaderAtStart.covers);
check('el cuadrado está centrado', !!loaderAtStart && loaderAtStart.centered);
check('gira con la curva del hover', !!loaderAtStart &&
  loaderAtStart.animation.includes('loader-spin') &&
  loaderAtStart.animation.includes('cubic-bezier(0.16, 1, 0.3, 1)'),
  loaderAtStart ? loaderAtStart.animation : '');

await waitForLoader(page);
check('el velo se retira solo', await page.locator('#loader').count() === 0);

const contact = await page.evaluate(() => {
  const a = document.querySelector('.colophon__contact');
  return { tag: a.tagName, href: a.getAttribute('href'), rel: a.getAttribute('rel') };
});
const cursor = await page.evaluate(() => {
  const html = document.documentElement;
  const dot = document.getElementById('cursor');
  const s = getComputedStyle(dot);
  const link = getComputedStyle(document.querySelector('.colophon__contact'));
  return {
    active: html.classList.contains('has-custom-cursor'),
    size: s.width + '×' + s.height,
    round: s.borderRadius,
    hidesNative: getComputedStyle(document.body).cursor,
    linkColor: link.color,
    linkDecoration: link.textDecorationLine
  };
});

check('cursor a medida activo', cursor.active);
check('mide 10px y es redondo', cursor.size === '10px×10px' && cursor.round === '50%', cursor.size + ' r' + cursor.round);
check('oculta el puntero del sistema', cursor.hidesNative === 'none', cursor.hidesNative);
check('Contact me sin azul ni subrayado',
  cursor.linkColor === 'rgb(0, 0, 0)' && cursor.linkDecoration === 'none',
  cursor.linkColor + ' / ' + cursor.linkDecoration);

/* El punto se vuelve blanco sobre lo pulsable */
await page.mouse.move(400, 400);          // sobre una card
await page.waitForTimeout(120);
const overCard = await page.evaluate(() => document.getElementById('cursor').classList.contains('is-interactive'));
await page.mouse.move(700, 80);           // zona muerta del header
await page.waitForTimeout(120);
const overNothing = await page.evaluate(() => document.getElementById('cursor').classList.contains('is-interactive'));
check('se vuelve blanco sobre lo pulsable', overCard && !overNothing, `card:${overCard} vacío:${overNothing}`);

const closeIcon = await page.evaluate(() => {
  const svg = document.querySelector('.lightbox__close svg');
  if (!svg) return null;
  return getComputedStyle(svg).strokeWidth;
});
check('la X de cerrar es de trazo fino', closeIcon === '0.75px', closeIcon || 'no hay svg');

const nameFont = await page.evaluate(() => {
  const s = getComputedStyle(document.querySelector('.masthead__name'));
  return s.fontFamily.split(',')[0].replace(/["']/g, '') + ' / ' + s.textTransform;
});
check('el nombre va en Inter y en mayúscula', nameFont === 'Inter / uppercase', nameFont);

check('Contact me enlaza a LinkedIn',
  contact.tag === 'A' && contact.href === 'https://www.linkedin.com/in/adrian-picazo/' && contact.rel === 'noopener',
  contact.href || '');

const barY = async () => page.evaluate(() => {
  const bar = document.querySelector('.card__bar');
  const frame = document.querySelector('.card__frame');
  return bar.getBoundingClientRect().top - frame.getBoundingClientRect().bottom;
});

/* Las pruebas del cursor han paseado el ratón por encima de una card: hay que
   dejar que la barra termine de bajar antes de medir el estado de reposo. */
await page.mouse.move(2, 2);
await page.waitForTimeout(800);

const restingOffset = await barY();
check('barra oculta en reposo', restingOffset > -1, `offset ${restingOffset.toFixed(1)}px`);

await page.hover('.card__frame');
await page.waitForTimeout(900);
const hoverOffset = await barY();
check('barra sube en hover', hoverOffset < -30, `offset ${hoverOffset.toFixed(1)}px`);

await page.mouse.move(5, 5);
await page.waitForTimeout(900);
const backOffset = await barY();
check('barra vuelve al salir', backOffset > -1, `offset ${backOffset.toFixed(1)}px`);

const easing = await page.evaluate(() => {
  const s = getComputedStyle(document.querySelector('.card__bar'));
  return s.transitionDuration + ' ' + s.transitionTimingFunction;
});
check('curva 600ms expo-out', easing.includes('0.6s') && easing.includes('0.16, 1, 0.3, 1'), easing);

await page.click('.card__frame');
await page.waitForTimeout(200);
check('lightbox abre en escritorio', !(await page.locator('#lightbox').isHidden()));

await page.keyboard.press('Escape');
await page.waitForTimeout(200);
check('Escape cierra el lightbox', await page.locator('#lightbox').isHidden());

await page.click('.card__frame');
await page.waitForTimeout(150);
await page.click('#lightbox', { position: { x: 5, y: 5 } });
await page.waitForTimeout(200);
check('clic fuera cierra el lightbox', await page.locator('#lightbox').isHidden());

/* --- Táctil: sin puntero fino --- */
const touch = await browser.newContext({
  viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true
});
const mobile = await touch.newPage();
await mobile.goto(url, { waitUntil: 'networkidle' });
await waitForLoader(mobile);

await mobile.tap('.card__frame');
await mobile.waitForTimeout(800);
check('1er toque abre la barra', await mobile.locator('.card').first().evaluate((el) => el.classList.contains('is-open')));

await mobile.tap('.card__frame');
await mobile.waitForTimeout(800);
check('2º toque la cierra', !(await mobile.locator('.card').first().evaluate((el) => el.classList.contains('is-open'))));

await mobile.locator('.card').nth(0).tap();
await mobile.locator('.card').nth(1).tap();
await mobile.waitForTimeout(400);
const openCount = await mobile.locator('.card.is-open').count();
check('solo una barra abierta a la vez', openCount === 1, `${openCount} abiertas`);

check('sin lightbox en táctil', await mobile.locator('#lightbox').isHidden());

await browser.close();
server.close();

let failed = 0;
for (const r of results) {
  if (!r.pass) failed++;
  console.log(`${r.pass ? 'OK  ' : 'FALLA'}  ${r.name}${r.detail ? '  (' + r.detail + ')' : ''}`);
}
console.log(`\n${results.length - failed}/${results.length} comprobaciones pasan`);
process.exit(failed ? 1 : 0);
