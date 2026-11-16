/**
 * VISUAILS — op de telefoon staat alles in het midden, op elke pagina (levering 108, kaartveld fase 4; lijst 114, lijst 115).
 * Lucas (lijst 114): "Telefoon content centreren geldt overigens voor alles, behalve hele specifieke uitzonderingen."
 * Wat hier vastligt, op 390 px:
 *   1 · telefoon-115.css en kaart-108.css zitten in de Layout;
 *   2 · per pagina: de kop, het label en de eerste knop staan in het midden (hun midden binnen 6 px van het midden van het
 *       scherm), de tekst staat in het midden, de kaarten zijn 88 % breed;
 *   3 · de uitzonderingen blijven links: de velden van een formulier, de vragen met een plus, en de regels van een lijst met
 *       vinkjes (die lijst zelf staat als groep in het midden);
 *   4 · de voet is de uitzondering (22:31): links, met Wat we maken en Bedrijf naast elkaar;
 *   5 · nergens loopt iets buiten het scherm (geen horizontale scroll).
 *   node tests/telefoon-midden-115-browser.test.mjs        (eerst de build)
 */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { browserPad } from '../scripts/lib/browserpad.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let goed = 0, fout = 0;
const ok = (naam, cond, extra = '') => { if (cond) goed++; else fout++; console.log(`${cond ? ' ok  ' : ' FAIL'} ${naam}${cond || !extra ? '' : ` — ${extra}`}`); };

console.log('\nVISUAILS — de telefoon: alles in het midden (levering 108)\n\n1 · de opmaak');
const layout = fs.readFileSync(path.join(ROOT, 'src/layouts/Layout.astro'), 'utf8');
ok('telefoon-115.css en kaart-108.css zitten in de Layout', /telefoon-115\.css/.test(layout) && /kaart-108\.css/.test(layout));

const DIST = path.join(ROOT, 'dist');
if (!fs.existsSync(path.join(DIST, 'nl', 'index.html'))) { ok('dist/nl/index.html bestaat (eerst de build)', false); process.exit(1); }
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.avif': 'image/avif', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json', '.woff2': 'font/woff2', '.mp4': 'video/mp4' };
const server = http.createServer((q, r) => {
  let f = path.join(DIST, decodeURIComponent(q.url.split('?')[0]));
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  if (!f.startsWith(DIST) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(r);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const BASIS = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ executablePath: browserPad() });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
await ctx.addInitScript(() => { window.__kvUit = true; });

const PAGINAS = ['/nl/catalog/', '/nl/lifestyle/', '/nl/video/', '/nl/pricing/', '/nl/start/', '/nl/test-sample/', '/nl/about/', '/nl/faq/',
  '/nl/plans/', '/nl/editions/', '/nl/hooks/', '/nl/gallery/', '/nl/how-it-works/', '/catalog/', '/plans/'];
console.log('\n2 · per pagina, op 390 px');
for (const pad of PAGINAS) {
  const page = await ctx.newPage();
  await page.goto(`${BASIS}${pad}`, { waitUntil: 'load' });
  const m = await page.evaluate(() => {
    const mid = innerWidth / 2;
    const af = (e) => { if (!e) return null; const r = e.getBoundingClientRect(); return Math.round((r.left + r.right) / 2 - mid); };
    const main = document.querySelector('.h-pagina:not(.h-voor)');
    const h1 = main?.querySelector('h1');
    const pil = main?.querySelector('.h-pil');
    const knop = main?.querySelector('.h-acties .h-knop, .h-acties a');
    const tekst = [...(main?.querySelectorAll('.h-sec-kop h2, .h-lede, .h-sec-kop p:not(.h-pil)') || [])].filter((e) => e.getBoundingClientRect().height > 0);
    const links = tekst.filter((e) => getComputedStyle(e).textAlign !== 'center').map((e) => e.className || e.tagName);
    const kaarten = [...document.querySelectorAll('.h-pagina:not(.h-voor) :is(.h-proef > .h-proef-woord, .h-lk-slot)')].filter((e) => e.getBoundingClientRect().width > 0 && !e.querySelector('h1'))   /* een kaart met de kop van de pagina erop houdt de volle breedte */
      .map((e) => { const r = e.getBoundingClientRect(), cs = getComputedStyle(e.parentElement); const binnen = e.parentElement.getBoundingClientRect().width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight); return Math.round((r.width / binnen) * 100); });   /* van de kolom binnen de rand */
    const vinken = [...document.querySelectorAll('.h-pagina :is(.h-pr-vinken, .lm-vinkjes, .h-bm-vink, .checklist) > li')].filter((e) => e.getBoundingClientRect().height > 0)
      .map((e) => getComputedStyle(e).textAlign);
    const vragen = [...document.querySelectorAll('.h-pagina .dc-sum')].filter((e) => e.getBoundingClientRect().height > 0).map((e) => getComputedStyle(e).textAlign);
    const velden = [...document.querySelectorAll('.h-pagina form label')].filter((e) => e.getBoundingClientRect().height > 0).map((e) => getComputedStyle(e).textAlign);
    return { h1: af(h1), pil: af(pil), knop: af(knop), links, kaarten, vinken, vragen, velden, breed: document.documentElement.scrollWidth };
  });
  ok(`${pad}: de kop, het label en de eerste knop in het midden (${m.h1} / ${m.pil} / ${m.knop} px)`, [m.h1, m.pil, m.knop].every((v) => v === null || Math.abs(v) <= 6));
  ok(`${pad}: de koppen en lopende zinnen van de secties staan in het midden`, m.links.length === 0, m.links.slice(0, 4).join(', '));
  if (m.kaarten.length) ok(`${pad}: de kaarten zijn 88 % breed (${m.kaarten.join(', ')})`, m.kaarten.every((w) => w >= 86 && w <= 90));
  if (m.vinken.length) ok(`${pad}: de regels met een vinkje blijven links (${m.vinken.length})`, m.vinken.every((a) => a === 'left' || a === 'start'));
  if (m.vragen.length) ok(`${pad}: de vragen met een plus blijven links (${m.vragen.length})`, m.vragen.every((a) => a === 'left' || a === 'start'));
  if (m.velden.length) ok(`${pad}: de velden van het formulier blijven links (${m.velden.length})`, m.velden.every((a) => a === 'left' || a === 'start'));
  ok(`${pad}: niets loopt buiten het scherm (${m.breed} px)`, m.breed <= 390);
  await page.close();
}

console.log('\n4 · de voet: de uitzondering, links en in twee kolommen (Lucas, 22:31)');
{
  const page = await ctx.newPage();
  await page.goto(`${BASIS}/nl/about/`, { waitUntil: 'load' });
  const v = await page.evaluate(() => {
    const f = document.querySelector('.site-footer'), grid = f.querySelector('.footer-grid').getBoundingClientRect();
    const r = (e) => e.getBoundingClientRect();
    const cols = [...f.querySelectorAll('.footer-col')].map(r);
    return {
      links: Math.round(r(f.querySelector('.brand')).left - grid.left),
      uitlijning: [...f.querySelectorAll('.footer-brand p, .footer-h, .footer-col a, .footer-bottom > span')].map((e) => getComputedStyle(e).textAlign),
      naast: Math.abs(cols[0].top - cols[1].top) < 2 && cols[1].left > cols[0].right,
      contact: Math.round(cols[2].width), breed: Math.round(grid.width),
    };
  });
  ok(`de voet: het logo staat links (${v.links} px van de rand)`, Math.abs(v.links) <= 2);
  ok('de voet: de tekst staat links', v.uitlijning.every((a) => a === 'left' || a === 'start'), [...new Set(v.uitlijning)].join(','));
  ok('de voet: Wat we maken en Bedrijf staan naast elkaar', v.naast);
  ok(`de voet: Contact loopt over de hele breedte (${v.contact} van ${v.breed} px)`, v.contact >= v.breed - 2);
  await page.close();
}

await browser.close(); server.close();
console.log(`\n${goed} goed, ${fout} fout`);
process.exit(fout ? 1 : 0);
