/**
 * VISUAILS — de schakelaars, het vinkje, de pauzeknop, grijs naar inkt en een lichtere poster (levering 83,
 * 2 november 2026).
 *
 *   node tests/beweging-83.test.mjs        (npm run test:beweging83; draai eerst de build)
 *
 * Lijst 68 (Lucas, 2 november, 04:12): schakel = a (het inktblok glijdt, 240 ms op de kleine golf), klein = ja
 * (het vinkje in twee stappen, de pauzeknop wordt een driehoek), grijs = a (per woord, alleen "Jij stuurt. Wij
 * maken. Jij keurt goed." op de voorpagina), en de logoposter lichter (gemeten in lijst 68).
 *
 *   1 · de bronnen: schakel.js in HalBeweging, de vier schakelaars; pauze-m en afspelen-m met dezelfde opbouw en
 *       precies de hoekpunten van het kit; het vinkje in twee lagen; de woorden van Hoe het werkt kort los;
 *   2 · de schakelaars in de browser (/faq op 1440 en 390, /gallery): één kopie per rij, zonder haakjes (geen
 *       aria-, data-, id of invoervelden), het venster glijdt naar de nieuwe keuze en staat er na 240 ms precies
 *       op; in de rij zelf staat de gekozen knop niet in inkt; bij minder beweging springt het venster;
 *   3 · de pauzeknop gaat over (het pad tussenin is geen van beide) en eindigt precies op afspelen;
 *   4 · het vinkje (elk vakje, en dat van de fotogids): eerst het korte been, 110 ms later het lange; het vakje meteen
 *       inkt; uitvinken is meteen weg;
 *   5 · grijs naar inkt: grijs onderaan het scherm, woord voor woord inkt, helemaal inkt op 45 %; bij minder
 *       beweging meteen inkt;
 *   6 · de poster: waar de V al het scherm dekt, zet scrollen de stijl van de poster niet meer opnieuw.
 */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
import { buildStaat } from './lib/build.mjs';
import { browserPad } from '../scripts/lib/browserpad.mjs';
import { IKOON } from '../src/data/iconen.js';
import { SCHAKELS } from '../src/scripts/schakel.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const lees = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
let goed = 0, fout = 0;
const ok = (naam, cond, extra = '') => { if (cond) goed++; else fout++; console.log(`${cond ? ' ok  ' : ' FAIL'} ${naam}${cond || !extra ? '' : ` — ${extra}`}`); };

const staat = buildStaat(new URL('../dist/index.html', import.meta.url));
if (!staat.er || staat.oud) { console.log(`geen bruikbare build — ${staat.uitleg}`); process.exit(1); }

/* ── 1 · de bronnen ──────────────────────────────────────────────────────── */
console.log('\n1 · de bronnen');
ok('HalBeweging zet de schakelaars (schakel.js) op elke pagina behalve de voorpagina', /import \{ schakelaars \} from '\.\.\/scripts\/schakel\.js'/.test(lees('src/components/HalBeweging.astro')) && /schakelaars\(\);/.test(lees('src/components/HalBeweging.astro')));
ok('  vier schakelaars: de FAQ, de galerijpillen, de formaten, Leveringen | Alle beelden', ['.h-faq-index', '.h-gl-pillen', '.h-fmt-knoppen', '.h-gl-wissel'].every((r) => SCHAKELS.some((s) => s.rij === r)));
const pt = (d) => d.split(/(?=M)/).map((s) => (s.match(/-?\d+(?:\.\d+)?/g) || []).length / 2);
ok('pauze-m en afspelen-m: dezelfde opbouw (drie stukken, evenveel punten)', JSON.stringify(pt(IKOON['pauze-m'])) === JSON.stringify(pt(IKOON['afspelen-m'])) && pt(IKOON['pauze-m']).length === 3, `${pt(IKOON['pauze-m'])} / ${pt(IKOON['afspelen-m'])}`);
const hoeken = (d) => new Set((d.match(/-?\d+(?:\.\d+)?[ ,]-?\d+(?:\.\d+)?/g) || []).map((p) => p.split(/[ ,]/).map((x) => (+x).toFixed(2)).join(',')));
const alleIn = (a, b) => [...hoeken(a)].every((p) => hoeken(b).has(p));
ok('  en elk eindbeeld bevat alle hoekpunten van het icoon uit het kit', alleIn(IKOON.pauze, IKOON['pauze-m']) && alleIn(IKOON.afspelen, IKOON['afspelen-m']));
const glob = lees('src/styles/global.css');
ok('het vinkje in twee lagen: het korte been meteen, het lange na 110 ms', /input\[type="checkbox"\]::before \{ border-bottom-color: var\(--accent-on\); \}/.test(glob) && /input\[type="checkbox"\]:checked::after \{ visibility: visible; transition: visibility 0s linear 110ms; \}/.test(glob));
ok('  en het vakje vervaagt bij aanvinken niet (meteen inkt)', /input\[type="checkbox"\]:checked \{ transition: none; \}/.test(glob));
ok('de pauzeregels hangen onder body.hal', !/html body \.(ik-m|u-balk)|html body \[/.test(lees('src/styles/hal.css')));
const hk = lees('dist/nl/index.html');
ok('Hoe het werkt kort: elk woord los (w8-w), de zin is dezelfde', (hk.match(/class="w8-w"/g) || []).length >= 6);

/* ── de browser ──────────────────────────────────────────────────────────── */
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.avif': 'image/avif', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json', '.woff2': 'font/woff2', '.mp4': 'video/mp4', '.webm': 'video/webm' };
const server = http.createServer((q, r) => {
  let f = path.join(DIST, decodeURIComponent(q.url.split('?')[0]));
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(r);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const BASIS = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ executablePath: browserPad() });
const KEUZE = { name: 'vis_consent', value: encodeURIComponent(JSON.stringify({ version: 1, analytics: false, at: '2026-11-01T00:00:00.000Z' })), url: BASIS };
async function open(pad, { breed = 1440, hoog = 900, stil = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width: breed, height: hoog }, reducedMotion: stil ? 'reduce' : 'no-preference' });
  await ctx.addCookies([KEUZE]);
  await ctx.route('**/api/**', (r) => r.fulfill({ status: 204, body: '' }));
  const page = await ctx.newPage();
  const fouten = [];
  page.on('pageerror', (e) => fouten.push(String(e).slice(0, 200)));
  await page.goto(BASIS + pad, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
  return { ctx, page, fouten };
}
/* het venster van de kopie, en de rechthoek van de gekozen knop, in de maat van de kopie */
const VENSTER = (rij) => {
  const r = document.querySelector(`${rij}:not(.sk-kopie)`);
  const k = r.querySelector(':scope > .sk-kopie');
  const cp = getComputedStyle(k).clipPath;
  const getallen = (cp.split(' round ')[0].match(/-?[\d.]+(?=px)/g) || []).map(Number);
  if (cp.startsWith('inset(')) {
    /* inset(boven rechts onder links round …), zoals een marge: 1 tot 4 maten */
    const [t, r2 = t, b = t, l = r2] = getallen;
    const K = k.getBoundingClientRect();
    return { x: l, y: t, w: K.width - l - r2, h: K.height - t - b };
  }
  const xs = getallen.filter((_, i) => i % 2 === 0), ys = getallen.filter((_, i) => i % 2 === 1);
  return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
};
const DOEL = ({ rij, knop }) => {
  const r = document.querySelector(`${rij}:not(.sk-kopie)`);
  const k = r.querySelector(':scope > .sk-kopie').getBoundingClientRect();
  const aan = [...r.querySelectorAll(knop)].filter((b) => !b.closest('.sk-kopie')).find((b) => b.getAttribute('aria-selected') === 'true' || b.getAttribute('aria-pressed') === 'true' || (b.htmlFor && document.getElementById(b.htmlFor)?.checked));
  const a = aan.getBoundingClientRect();
  return { x: a.left - k.left, y: a.top - k.top, w: a.width, h: a.height };
};
const gelijk = (a, b, m = 1.5) => ['x', 'y', 'w', 'h'].every((k) => Math.abs(a[k] - b[k]) <= m);

try {
  /* ── 2 · de schakelaars ── */
  console.log('\n2 · de schakelaars');
  for (const breed of [1440, 390]) {
    const { ctx, page, fouten } = await open('/nl/faq/', { breed });
    const k = await page.evaluate(() => {
      const kopie = document.querySelector('.h-faq-index:not(.sk-kopie) > .sk-kopie');
      const haakjes = kopie ? [kopie, ...kopie.querySelectorAll('*')].flatMap((e) => [...e.attributes].map((a) => a.name)).filter((n) => n === 'id' || n === 'href' || n === 'role' || n.startsWith('data-') || (n.startsWith('aria-') && n !== 'aria-hidden')) : ['geen kopie'];
      return { n: document.querySelectorAll('.sk-kopie').length, verborgen: kopie?.getAttribute('aria-hidden') === 'true' && kopie.inert, haakjes: [...new Set(haakjes)], knoppen: kopie?.querySelectorAll('.sk-k').length, echt: document.querySelectorAll('[data-faq-tab]').length };
    });
    ok(`${breed} /faq: één kopie, aria-hidden en inert, zonder haakjes, met evenveel knoppen`, k.n === 1 && k.verborgen && !k.haakjes.length && k.knoppen === k.echt, JSON.stringify(k));
    await page.evaluate(() => document.querySelector('.h-faq-index').scrollIntoView({ block: 'center' }));
    await page.waitForTimeout(200);
    const voor = await page.evaluate(VENSTER, '.h-faq-index');
    await page.locator('.h-faq-index:not(.sk-kopie) [data-faq-tab]').nth(3).click();
    await page.waitForTimeout(70);
    const onderweg = await page.evaluate(VENSTER, '.h-faq-index');
    await page.waitForTimeout(400);
    const na = await page.evaluate(VENSTER, '.h-faq-index');
    const doel = await page.evaluate(DOEL, { rij: '.h-faq-index', knop: '.h-faq-tab' });
    ok(`${breed} /faq: het venster glijdt (na 70 ms tussen de oude en de nieuwe tab) en staat er na 240 ms precies op`, !gelijk(onderweg, voor) && !gelijk(onderweg, doel) && gelijk(na, doel), `${JSON.stringify(voor)} → ${JSON.stringify(onderweg)} → ${JSON.stringify(na)} doel ${JSON.stringify(doel)}`);
    const rij = await page.evaluate(() => { const t = document.querySelector('.h-faq-index:not(.sk-kopie) [data-faq-tab][aria-selected="true"]'); const s = getComputedStyle(t); return { bg: s.backgroundColor, kleur: s.color }; });
    ok(`${breed} /faq:   de gekozen tab in de rij zelf staat niet in inkt (de inkt is het venster)`, rij.bg !== 'rgb(15, 18, 23)' && rij.kleur === 'rgb(15, 18, 23)', JSON.stringify(rij));
    /* het blok blijft één blok: halverwege, over de ruimte tussen twee tabs, is het venster inkt */
    const vorm = await page.evaluate(() => { const k = document.querySelector('.h-faq-index:not(.sk-kopie) > .sk-kopie'); const s = getComputedStyle(k); return { grond: s.backgroundColor, cp: s.clipPath }; });
    ok(`${breed} /faq:   rechte tabs: de kopie heeft inkt als grond en het venster de ronde hoeken van de tab`, vorm.grond === 'rgb(15, 18, 23)' && /^inset\(.* round /.test(vorm.cp), JSON.stringify(vorm));
    await page.locator('.h-faq-index:not(.sk-kopie) [data-faq-tab]').nth(0).click();
    const tussen = await page.evaluate(() => {
      const r = document.querySelector('.h-faq-index:not(.sk-kopie)'), k = r.querySelector(':scope > .sk-kopie');
      const a = k.getAnimations().find((x) => x.transitionProperty === 'clip-path');
      if (!a) return null;
      a.pause(); a.currentTime = 120;
      return true;
    });
    /* op de telefoon scrolt een tab de pagina naar de vragen: eerst laten uitlopen (het venster blijft stilstaan op 120 ms) */
    await page.waitForTimeout(800);
    const w = await page.evaluate(VENSTER, '.h-faq-index');
    const gat = await page.evaluate((w) => {
      const r = document.querySelector('.h-faq-index:not(.sk-kopie)'), K = r.querySelector(':scope > .sk-kopie').getBoundingClientRect();
      const tabs = [...r.querySelectorAll('.h-faq-tab')].filter((t) => !t.closest('.sk-kopie')).map((t) => t.getBoundingClientRect());
      /* een strook tussen twee tabs die binnen het venster valt (op de telefoon: tussen twee tabs naast elkaar of onder elkaar) */
      for (let i = 0; i + 1 < tabs.length; i++) {
        const a = tabs[i], b = tabs[i + 1];
        if (b.top >= a.bottom - 1) {
          const y = (a.bottom + b.top) / 2 - K.top, x0 = Math.max(a.left, b.left) - K.left, x1 = Math.min(a.right, b.right) - K.left;
          const x = Math.max(x0, w.x) + 12;
          if (b.top - a.bottom >= 2 && y > w.y + 2 && y < w.y + w.h - 2 && x < Math.min(x1, w.x + w.w) - 12) return { x, y };
        } else if (b.left >= a.right - 1) {
          const x = (a.right + b.left) / 2 - K.left, y = Math.max(a.top, w.y + K.top) - K.top + 10;
          if (b.left - a.right >= 2 && x > w.x + 2 && x < w.x + w.w - 2 && y < w.y + w.h - 4) return { x, y };
        }
      }
      return null;
    }, w);
    let pixel = null;
    /* een foto van de kopie zelf (zijn rechthoek), en daarin het punt in de strook (gat is in de maat van de kopie) */
    if (gat) { const png = PNG.sync.read(await page.locator('.h-faq-index:not(.sk-kopie) > .sk-kopie').screenshot()); const i = (Math.round(gat.y) * png.width + Math.round(gat.x)) * 4; pixel = [png.data[i], png.data[i + 1], png.data[i + 2]]; }
    ok(`${breed} /faq:   halverwege, waar het venster over de ruimte tussen twee tabs glijdt, is het inkt (het blok breekt niet open)`, tussen && gat && pixel && pixel.every((c) => c < 60), JSON.stringify({ tussen, w, gat, pixel }));
    ok(`${breed} /faq:   geen scriptfout`, !fouten.length, fouten.join(' | '));
    await ctx.close();
  }
  {
    const { ctx, page } = await open('/nl/faq/', { stil: true });
    await page.locator('.h-faq-index:not(.sk-kopie) [data-faq-tab]').nth(2).click();
    await page.waitForTimeout(30);
    const [v, d] = await Promise.all([page.evaluate(VENSTER, '.h-faq-index'), page.evaluate(DOEL, { rij: '.h-faq-index', knop: '.h-faq-tab' })]);
    ok('minder beweging: het venster springt meteen naar de keuze', gelijk(v, d), `${JSON.stringify(v)} ${JSON.stringify(d)}`);
    await ctx.close();
  }
  {
    const { ctx, page, fouten } = await open('/nl/gallery/');
    await page.evaluate(() => document.querySelector('.h-gl-pillen').scrollIntoView({ block: 'center' }));
    await page.waitForTimeout(200);
    await page.locator('[data-gl-dienst]').nth(2).click();
    await page.waitForTimeout(400);
    const [v, d] = await Promise.all([page.evaluate(VENSTER, '.h-gl-pillen'), page.evaluate(DOEL, { rij: '.h-gl-pillen', knop: '.h-gl-pil' })]);
    ok('/gallery: de dienstpillen (met de snede): het venster staat op de gekozen pil', gelijk(v, d), `${JSON.stringify(v)} ${JSON.stringify(d)}`);
    const vorm = await page.evaluate(() => (getComputedStyle(document.querySelector('.h-gl-pillen:not(.sk-kopie) > .sk-kopie')).clipPath.match(/px/g) || []).length);
    ok('  het venster heeft vier punten (de vorm van de pil, met de snede)', vorm === 8, String(vorm));
    ok('  en de kopie heeft geen grond: de kier tussen de pillen is de snede, ook onderweg', await page.evaluate(() => getComputedStyle(document.querySelector('.h-gl-pillen:not(.sk-kopie) > .sk-kopie')).backgroundColor === 'rgba(0, 0, 0, 0)'));
    await page.locator('label[for="gw-alles"]').click();
    await page.waitForTimeout(400);
    const [v2, d2] = await Promise.all([page.evaluate(VENSTER, '.h-gl-wissel'), page.evaluate(DOEL, { rij: '.h-gl-wissel', knop: '.h-gl-seg' })]);
    ok('/gallery: Leveringen | Alle beelden (rondjes): het venster volgt het aangevinkte rondje', gelijk(v2, d2), `${JSON.stringify(v2)} ${JSON.stringify(d2)}`);
    ok('  de kopie heeft geen eigen rondjes (twee in de groep, niet vier) en Alle beelden staat open', await page.evaluate(() => document.querySelectorAll('input[name="gal-weergave"]').length === 2 && document.getElementById('gw-alles').checked));
    ok('  geen scriptfout', !fouten.length, fouten.join(' | '));
    await ctx.close();
  }

  /* ── 3 · de pauzeknop ── */
  console.log('\n3 · de pauzeknop');
  {
    const { ctx, page, fouten } = await open('/nl/catalog/');
    await page.evaluate(() => { const e = document.querySelector('#hoe'); scrollTo(0, e.getBoundingClientRect().top + scrollY - 60); });
    await page.waitForTimeout(1200);
    const d = () => page.evaluate(() => getComputedStyle(document.querySelector('.u-balk .ik-m')).d);
    const voor = await d();
    await page.locator('[data-uitleg-knop]').first().click();
    await page.waitForTimeout(90);
    const midden = await d();
    await page.waitForTimeout(400);
    const na = await d();
    const norm = (s) => (s.match(/-?\d+(?:\.\d+)?/g) || []).map((x) => (+x).toFixed(1)).join(' ');
    ok('de uitlegbalk: pauze gaat over in afspelen (tussenin geen van beide, daarna precies afspelen-m)', norm(voor) === norm(IKOON['pauze-m']) && norm(midden) !== norm(voor) && norm(midden) !== norm(na) && norm(na) === norm(IKOON['afspelen-m']), `${norm(voor).slice(0, 40)} | ${norm(midden).slice(0, 40)} | ${norm(na).slice(0, 40)}`);
    ok('  de oude iconen staan uit, het overgaande pad staat aan', await page.evaluate(() => getComputedStyle(document.querySelector('.u-balk .u-ik-speel')).display === 'none' && getComputedStyle(document.querySelector('.u-balk .u-ik-m')).display === 'block'));
    ok('  geen scriptfout', !fouten.length, fouten.join(' | '));
    await ctx.close();
  }

  /* ── 4 · het vinkje ── */
  console.log('\n4 · het vinkje');
  {
    const { ctx, page } = await open('/nl/upload-guidelines/');
    /* Elk vakje van de site (global.css), hier dat van de cookiekeuze. Klikken en lezen in één taak van de pagina:
       wat de browser dan geeft, is het eerste beeld na de klik. */
    await page.evaluate(() => document.getElementById('cc-prefs').showModal());
    const vak = await page.evaluate(async () => {
      const v = document.getElementById('cc-analytics');
      if (v.checked) v.click();
      const lagen = () => [getComputedStyle(v, '::before').visibility, getComputedStyle(v, '::after').visibility].join(' ');
      const leeg = lagen();
      v.click();
      const meteen = lagen(), grondMeteen = getComputedStyle(v).backgroundColor;
      await new Promise((r) => setTimeout(r, 220));
      const later = lagen(), grondLater = getComputedStyle(v).backgroundColor;
      v.click();
      const uit = lagen();
      return { leeg, meteen, later, uit, grondMeteen, grondLater, zichtbaar: v.getBoundingClientRect().width > 0 && getComputedStyle(v).opacity === '1' };
    });
    ok('elk vakje (de cookiekeuze): eerst het korte been, 110 ms later het lange; uitvinken is meteen weg', vak.zichtbaar && vak.leeg === 'hidden hidden' && vak.meteen === 'visible hidden' && vak.later === 'visible visible' && vak.uit === 'hidden hidden', JSON.stringify(vak));
    ok('  het vakje staat bij aanvinken meteen op inkt (het korte been is meteen te zien)', vak.grondMeteen === vak.grondLater, `${vak.grondMeteen} → ${vak.grondLater}`);
    await page.evaluate(() => document.getElementById('cc-prefs').close());
    /* de fotogids: een eigen vakje met het vinkje uit het kit */
    await page.locator('.h-ug-vraag').first().scrollIntoViewIfNeeded();
    const gids = await page.evaluate(async () => {
      const i = document.querySelector('.h-ug-vraag input'), v = i.parentElement.querySelector('.h-ug-vakje');
      const stand = () => { const s = getComputedStyle(v); return { grond: s.backgroundColor, kleur: s.color, knip: getComputedStyle(v.querySelector('svg')).clipPath }; };
      const voor = stand();
      i.click();
      const meteen = stand();
      await new Promise((r) => setTimeout(r, 220));
      const later = stand();
      i.click();
      const uit = stand();
      return { voor, meteen, later, uit };
    });
    ok('de fotogids: eerst het korte been (de linkerhelft van het vinkje), 110 ms later het hele; het vakje meteen inkt en het vinkje meteen wit', /^inset\(/.test(gids.meteen.knip) && gids.later.knip === 'none' && gids.meteen.grond === gids.later.grond && gids.meteen.kleur === gids.later.kleur && gids.voor.grond !== gids.later.grond, JSON.stringify(gids));
    ok('  uitvinken: het vinkje is meteen weg', gids.uit.kleur === 'rgba(0, 0, 0, 0)', JSON.stringify(gids.uit));
    await ctx.close();
  }

  /* ── 5 · grijs naar inkt ── */
  console.log('\n5 · grijs naar inkt');
  for (const stil of [false, true]) {
    const { ctx, page } = await open('/nl/', { stil });
    const stand = async (f) => {
      await page.evaluate((f) => { const r = document.querySelector('.w8-regel'); scrollTo(0, r.getBoundingClientRect().top + scrollY - innerHeight * f); }, f);
      await page.waitForTimeout(450);
      return page.evaluate(() => [...document.querySelectorAll('.w8-w')].map((w) => (getComputedStyle(w).color === 'rgb(15, 18, 23)' ? 1 : 0)).join(''));
    };
    const s = [await stand(0.92), await stand(0.62), await stand(0.4)];
    if (stil) ok('minder beweging: meteen inkt', s.every((x) => !x.includes('0')), s.join(' '));
    else ok('grijs onderaan het scherm, woord voor woord inkt (van links), helemaal inkt op 40 %', /^0+$/.test(s[0]) && /^1+0+$/.test(s[1]) && /^1+$/.test(s[2]), s.join(' '));
    await ctx.close();
  }

  /* ── 6 · de poster ── */
  console.log('\n6 · de poster');
  {
    const { ctx, page, fouten } = await open('/nl/');
    const baan = await page.evaluate(() => { const r = document.querySelector('[data-p8]').getBoundingClientRect(); return { top: r.top + scrollY, h: r.height }; });
    await page.evaluate((b) => scrollTo(0, b.top + (b.h - innerHeight) * 0.6), baan);
    await page.waitForTimeout(800);
    const n = await page.evaluate(async (b) => {
      const p8 = document.querySelector('[data-p8]');
      let tel = 0; const mo = new MutationObserver((m) => { tel += m.length; }); mo.observe(p8, { attributes: true, attributeFilter: ['style'] });
      for (let i = 0; i < 12; i++) { scrollBy(0, 24); await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); }
      await new Promise((r) => setTimeout(r, 500)); mo.disconnect(); return tel;
    }, baan);
    ok('waar de V het scherm al dekt: scrollen zet de stijl van de poster niet opnieuw', n === 0, `${n} keer`);
    ok('  geen scriptfout', !fouten.length, fouten.join(' | '));
    await ctx.close();
  }
} finally {
  await browser.close();
  server.close();
}
console.log(`\n${goed} goed, ${fout} fout`);
process.exit(fout ? 1 : 0);
