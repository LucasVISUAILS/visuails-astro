/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * DE BEFORE/AFTER-SLIDER SNIJDT DE FOTO ÉCHT AF  ·  npm run test:vergelijker
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Lucas, 1 september 2026: *"De interactieve before/after-slider werkt niet
 * correct."* Hij had gelijk, en de vorm van de fout is het interessante:
 *
 *   het HANDVAT bewoog netjes mee met de muis,
 *   de foto werd nooit afgesneden.
 *
 * Dus alles wat je in de code leest klopte — `--cmp-pos` werd geschreven, de
 * divider stond op de goede plek, geen enkele foutmelding, geen CSP-overtreding.
 * Alleen het ding zelf deed niets.
 *
 * ── DE OORZAAK, EN WAAROM HIJ ZO GOED VERSTOPT ZAT ─────────────────────────
 *
 * In Layout.astro staat een <noscript> met deze regel:
 *
 *     .cmp .cmp-after { animation: none !important; clip-path: inset(0 0 0 50%) !important; }
 *
 * Zonder JavaScript is de slider niet te slepen, dus wordt hij op de helft
 * vastgezet. Precies goed — en de betekenis zit volledig in WAAR hij staat.
 *
 * scripts/stijl-uit-de-pagina.mjs, gebouwd om `style-src 'self'` mogelijk te
 * maken, hees elk <style>-blok uit de pagina naar een gedeelde stylesheet. Ook
 * deze. Daar geldt hij áltijd, en met twee keer !important wint hij van alles.
 * De afsnijding stond dus voor iedereen voorgoed op 50%.
 *
 * ── WAAROM DIT EEN BROWSERTOETS IS EN GEEN BRONTOETS ───────────────────────
 *
 * Een toets die de bron leest, had dit niet gezien: de bron was juist. Een toets
 * die de gebouwde HTML leest, had het ook niet gezien: het blok was correct
 * verplaatst. Wat je nodig hebt is een browser die de cascade uitrekent en een
 * muis die sleept. Deze toets doet dat, en meet niet het handvat maar de
 * AFSNIJDING — want dat is wat een bezoeker ziet, en het handvat loog erover.
 *
 * Muis, vinger, toetsenbord en een resize, want dat waren de vier vragen.
 */
import { existsSync, createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, devices } from 'playwright';
import { buildStaat } from './lib/build.mjs';

let pass = 0, fail = 0;
const check = (naam, kreeg, verwacht) => {
  const ok = JSON.stringify(kreeg) === JSON.stringify(verwacht);
  if (ok) pass++; else fail++;
  console.log(`${ok ? ' ok  ' : 'FAIL '} ${String(naam).padEnd(58)} ${ok ? '' : `verwacht ${JSON.stringify(verwacht)} kreeg ${JSON.stringify(kreeg)}`}`);
};

const DIST = fileURLToPath(new URL('../dist/', import.meta.url));
const staat = buildStaat(new URL('../dist/index.html', import.meta.url));
if (!staat.er || staat.oud) {
  console.log(`\n --   niet gecontroleerd: ${staat.uitleg}`);
  process.exit(0);
}

const EXECUTABLE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const launch = () => chromium.launch(existsSync(EXECUTABLE) ? { executablePath: EXECUTABLE } : {});
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp',
  '.avif': 'image/avif', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2', '.ico': 'image/x-icon',
};
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x');
    const clean = decodeURIComponent(url.pathname).split('/').filter((p) => p && p !== '..');
    let file = join(DIST, ...clean);
    let info = await stat(file).catch(() => null);
    if (info?.isDirectory()) { file = join(file, 'index.html'); info = await stat(file).catch(() => null); }
    if (!info?.isFile()) { res.writeHead(404); res.end('nee'); return; }
    res.writeHead(200, { 'Content-Type': MIME[extname(file).toLowerCase()] || 'application/octet-stream' });
    createReadStream(file).pipe(res);
  } catch { res.writeHead(500); res.end('fout'); }
});
const PORT = await new Promise((r) => server.listen(0, '127.0.0.1', () => r(server.address().port)));
const BASE = `http://127.0.0.1:${PORT}`;
const browser = await launch();

/* De afsnijding als getal. Dit is de meting die telt: `clip-path` op de
   bovenste foto, want dat is de lijn die de bezoeker ziet staan. */
const AFSNIJDING = `(() => {
  const c = document.querySelector('.cmp');
  const na = c.querySelector('img.cmp-after');
  const m = /inset\\(0px 0px 0px ([0-9.]+)%\\)/.exec(getComputedStyle(na).clipPath);
  return m ? Math.round(Number(m[1])) : null;
})()`;

/* ══ 1 · SLEPEN MET DE MUIS ════════════════════════════════════════════════ */
console.log('\nslepen met de muis snijdt de foto af');
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  const cmp = page.locator('.cmp').first();
  await cmp.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);

  const box = await cmp.boundingBox();
  const kb = await page.locator('.cmp .cmp-knob').first().boundingBox();
  await page.mouse.move(kb.x + kb.width / 2, kb.y + kb.height / 2);
  await page.mouse.down();

  const gemeten = [];
  for (const f of [0.25, 0.5, 0.75]) {
    await page.mouse.move(box.x + box.width * f, kb.y + kb.height / 2, { steps: 6 });
    await page.waitForTimeout(80);
    gemeten.push(await page.evaluate(AFSNIJDING));
  }
  await page.mouse.up();

  /* NIET "hij is veranderd" maar "hij staat waar de muis staat". Een toets op
     "is niet meer 50" zou groen blijven bij een slider die op 12% blijft hangen. */
  check('de afsnijding volgt de muis', gemeten, [25, 50, 75]);

  /* En het handvat staat op dezelfde lijn. Deze twee liepen uit elkaar en dat
     was de hele bug — het handvat bewoog en de foto niet. */
  const verschil = await page.evaluate(() => {
    const c = document.querySelector('.cmp');
    const r = c.getBoundingClientRect();
    const d = c.querySelector('.cmp-divider').getBoundingClientRect();
    const na = c.querySelector('img.cmp-after');
    const m = /inset\(0px 0px 0px ([0-9.]+)%\)/.exec(getComputedStyle(na).clipPath);
    const snij = r.left + r.width * (Number(m[1]) / 100);
    return Math.round(Math.abs(snij - (d.left + d.width / 2)));
  });
  check('en de streep staat op de snijlijn (≤2px)', verschil <= 2, true);

  /* ── NA EEN RESIZE ────────────────────────────────────────────────────────
     De positie komt uit getBoundingClientRect() op het moment van slepen, dus
     een andere breedte mag geen oude maat achterlaten. */
  await page.setViewportSize({ width: 900, height: 1000 });
  await page.waitForTimeout(250);
  const box2 = await cmp.boundingBox();
  const kb2 = await page.locator('.cmp .cmp-knob').first().boundingBox();
  await page.mouse.move(kb2.x + kb2.width / 2, kb2.y + kb2.height / 2);
  await page.mouse.down();
  await page.mouse.move(box2.x + box2.width * 0.3, kb2.y + kb2.height / 2, { steps: 6 });
  await page.waitForTimeout(80);
  const naResize = await page.evaluate(AFSNIJDING);
  await page.mouse.up();
  check('en na een resize klopt hij nog steeds', naResize, 30);

  await ctx.close();
}

/* ══ 2 · SLEPEN MET EEN VINGER ═════════════════════════════════════════════ */
console.log('\nslepen met een vinger doet hetzelfde');
{
  const ctx = await browser.newContext({ ...devices['iPhone 13'], isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  const cmp = page.locator('.cmp').first();
  await cmp.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);

  /* touch-action: none op de handvatten is wat het gebaar tot SLEPEN maakt in
     plaats van scrollen — en alleen op de handvatten, want over de foto moet je
     de pagina gewoon kunnen wegvegen. */
  const raak = await page.evaluate(() => ({
    divider: getComputedStyle(document.querySelector('.cmp-divider')).touchAction,
    knob: getComputedStyle(document.querySelector('.cmp-knob')).touchAction,
    foto: getComputedStyle(document.querySelector('img.cmp-after')).touchAction,
  }));
  check('de handvatten vangen het gebaar', [raak.divider, raak.knob], ['none', 'none']);
  check('en de foto laat de pagina scrollen', raak.foto, 'auto');

  const box = await cmp.boundingBox();
  const kb = await page.locator('.cmp .cmp-knob').first().boundingBox();
  const vinger = (type, x, y) => page.evaluate(({ t, cx, cy }) => {
    const doel = t === 'pointerdown' ? document.elementFromPoint(cx, cy) : document;
    doel.dispatchEvent(new PointerEvent(t, {
      pointerId: 1, pointerType: 'touch', clientX: cx, clientY: cy,
      bubbles: true, cancelable: true, isPrimary: true,
    }));
  }, { t: type, cx: x, cy: y });

  await vinger('pointerdown', kb.x + kb.width / 2, kb.y + kb.height / 2);
  const metVinger = [];
  for (const f of [0.2, 0.8]) {
    await vinger('pointermove', box.x + box.width * f, kb.y + kb.height / 2);
    await page.waitForTimeout(80);
    metVinger.push(await page.evaluate(AFSNIJDING));
  }
  await vinger('pointerup', 0, 0);
  check('de afsnijding volgt de vinger', metVinger, [20, 80]);
  await ctx.close();
}

/* ══ 3 · EN MET HET TOETSENBORD ════════════════════════════════════════════ */
console.log('\nde knop is met de pijltjes te bedienen');
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await page.locator('.cmp').first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  const knop = page.locator('.cmp .cmp-knob').first();
  await knop.focus();
  const start = await page.evaluate(AFSNIJDING);
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  await page.waitForTimeout(150);
  check('twee keer pijl-links is tien procent naar links', await page.evaluate(AFSNIJDING), start - 10);
  /* role="slider" belooft dat aria-valuenow de stand draagt; een schermlezer die
     de oude waarde voorleest is erger dan geen waarde. */
  check('en aria-valuenow draagt diezelfde stand',
    Number(await knop.getAttribute('aria-valuenow')), start - 10);
  await ctx.close();
}

/* ══ 4 · DE <noscript>-REGEL STAAT ER NOG, EN STAAT ER NOG STEEDS BINNEN ═══ */
console.log('\nde regel voor bezoekers zonder JavaScript blijft waar hij hoort');
{
  const html = await (await fetch(`${BASE}/`)).text();
  const noscript = /<noscript>([\s\S]*?)<\/noscript>/.exec(html);
  check('er is een <noscript>-blok', Boolean(noscript), true);
  check('en de vastzetregel staat erin',
    /\.cmp \.cmp-after \{[^}]*clip-path: inset\(0 0 0 50%\) !important/.test(noscript?.[1] || ''), true);

  /* EN NERGENS ANDERS. Dit is de toets die de fout van 1 september tegenhoudt:
     dezelfde regel buiten de <noscript> geldt altijd, en dan staat de slider
     voor iedereen stil. */
  const buiten = html.replace(/<noscript>[\s\S]*?<\/noscript>/g, '');
  check('en niet daarbuiten', /clip-path: inset\(0 0 0 50%\) !important/.test(buiten), false);

  const bladen = await Promise.all(
    [...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(async (m) => (await fetch(`${BASE}${m[1]}`)).text())
  );
  check('en in geen enkele stylesheet',
    bladen.filter((c) => /clip-path: ?inset\(0 0 0 50%\) ?!important/.test(c)).length, 0);
}

await browser.close();

/* Windows: process.exit() vlak na browser.close() struikelt in libuv

   ("Assertion failed: !(handle->flags & UV_HANDLE_CLOSING), src\\win\\async.c")

   omdat de pipes van Chromium nog aan het sluiten zijn. Eén tik wachten

   laat ze dichtgaan; de uitslag verandert er niet door — 4 sept 2026. */

await new Promise((r) => setTimeout(r, 300));
server.close();
console.log(`\n${pass}/${pass + fail} geslaagd`);
process.exit(fail ? 1 : 0);
