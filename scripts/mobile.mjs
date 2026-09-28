/**
 * Gate de vídeo en móvil: cada card con vídeo que se ve al entrar tiene que estar
 * reproduciéndose o, como mínimo, enseñando el indicador de carga. Un frame
 * quieto sin indicador es justo el fallo que vio Hugo en móviles reales.
 *
 *   node scripts/mobile.mjs                       contra http://localhost:8000/
 *   node scripts/mobile.mjs https://picazoadrian.github.io/
 *
 * La emulación de Playwright deja hacer autoplay a todo, así que se simulan las
 * políticas de los móviles de verdad:
 *   none      navegador móvil normal
 *   webview   navegador integrado de app (Instagram, WhatsApp): solo hay autoplay
 *             si el <video> lleva los ATRIBUTOS muted y playsinline
 *   lowpower  iPhone en ahorro de batería: ningún play() sin un toque. Se exige
 *             indicador antes del toque y reproducción después.
 */
import pw from '/Users/hugorodriguezortega/Projects/clients/archive/node_modules/playwright/index.js';
const { chromium, webkit, devices } = pw;

const URL = process.argv[2] || 'http://localhost:8000/';
const TARGETS = [
  ['iPhone · WebKit', webkit, devices['iPhone 14'], {}],
  ['Pixel · Chrome', chromium, devices['Pixel 7'], { channel: 'chrome' }],
];
const POLICIES = ['none', 'webview', 'lowpower'];

function simulatePolicy(policy) {
  const play = HTMLMediaElement.prototype.play;
  let activated = false;
  addEventListener('touchend', () => {
    activated = true;
    setTimeout(() => { activated = false; }, 1000);
  }, true);
  HTMLMediaElement.prototype.play = function () {
    const blocked = (policy === 'webview' && !(this.hasAttribute('muted') && this.hasAttribute('playsinline')))
      || (policy === 'lowpower' && !activated);
    return blocked ? Promise.reject(new DOMException(policy, 'NotAllowedError')) : play.call(this);
  };
}

const readCards = (page) => page.evaluate(() => [...document.querySelectorAll('.card')]
  .map((card, i) => {
    const frame = card.querySelector('.card__frame');
    const video = card.querySelector('video');
    const rect = frame.getBoundingClientRect();
    return {
      n: i + 1,
      visible: rect.top < innerHeight && rect.bottom > 0,
      video: !!video,
      playing: !!video && !video.paused && video.currentTime > 0,
      loader: frame.classList.contains('is-buffering'),
    };
  })
  .filter((c) => c.visible && c.video));

let failures = 0;
const check = (label, ok, detail) => {
  if (!ok) failures++;
  console.log(`${ok ? 'OK   ' : 'FALLA'}  ${label}  (${detail})`);
};

for (const [name, type, device, options] of TARGETS) {
  const browser = await type.launch(options);
  for (const policy of POLICIES) {
    const context = await browser.newContext({ ...device });
    const page = await context.newPage();
    await page.addInitScript(simulatePolicy, policy);
    await page.goto(URL, { waitUntil: 'load' });
    await page.waitForTimeout(6000);

    const before = await readCards(page);
    for (const c of before) {
      check(`${name} · ${policy} · card ${c.n} se mueve o avisa`, c.playing || c.loader,
        c.playing ? 'reproduciendo' : c.loader ? 'indicador de carga' : 'frame quieto sin indicador');
    }

    if (policy === 'lowpower') {
      await page.touchscreen.tap(200, 30);
      await page.waitForTimeout(2500);
      for (const c of await readCards(page)) {
        check(`${name} · lowpower · card ${c.n} arranca con el primer toque`, c.playing, c.playing ? 'reproduciendo' : 'sigue parado');
      }
    }
    await context.close();
  }
  await browser.close();
}

console.log(failures ? `\n${failures} comprobaciones fallan` : '\nTodas las comprobaciones pasan');
process.exit(failures ? 1 : 0);
