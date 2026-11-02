/**
 * VISUAILS — de letter en de lucht van 80 op elke publieke pagina (levering 81, 1 november 2026).
 *
 *   node tests/publiek-81.test.mjs        (npm run test:publiek81; draai eerst de build)
 *
 * Lucas, 22:08: "Ga voor nu verder met de rest". Zijn keuzes (22:10): de publieke pagina's (Studio en /admin
 * later), letter + lucht (de opbouw van elke pagina blijft), en Hoe het werkt met de animaties nu op /catalog,
 * /lifestyle en /video. De maten staan in hal.css (blok "LEVERING 81") en docs/RUST-80.md §9.
 *
 *   1 · de bouw: Hoe het werkt staat op de drie dienstpagina's (EN en NL), één dienst per pagina, zonder tabs, met
 *       de uitlegbalk, de woorden uit src/data/hoeHetWerkt.js, één knop naar het formulier van die dienst en de
 *       feiten uit de code (vanafprijs, levertijd); de voorpagina heeft hem niet (daar staat Hoe het werkt kort);
 *   2 · in de browser (1440, 900 en 390 px breed), op veertien publieke pagina's: niets zijwaarts; elke kop in de
 *       kopletter in hoofdletters en hoogstens twee regels; lopende tekst 370, nergens meer DM Sans op 400 of
 *       500; de marge 120 · 75 · 20 px; tussen de secties alleen de maten van de schaal; de opening van een
 *       dienstpagina houdt haar eigen marge (de laptop staat op de grond, tests/grond-79);
 *   3 · Hoe het werkt speelt als je erheen scrolt, en bij minder beweging staat het eindbeeld er meteen.
 */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { buildStaat } from './lib/build.mjs';
import { browserPad } from '../scripts/lib/browserpad.mjs';
import { euro, ladderFloor, levertijdDelen, videoPrijsLabel } from '../src/data/pricing.js';
import { hoeHetWerkt } from '../src/data/hoeHetWerkt.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
let goed = 0, fout = 0;
const ok = (naam, cond, extra = '') => { if (cond) goed++; else fout++; console.log(`${cond ? ' ok  ' : ' FAIL'} ${naam}${cond || !extra ? '' : ` — ${extra}`}`); };

const staat = buildStaat(new URL('../dist/index.html', import.meta.url));
if (!staat.er || staat.oud) { console.log(`geen bruikbare build — ${staat.uitleg}`); process.exit(1); }
const bestaat = (url) => { const p = url.split('?')[0].replace(/^\//, ''); return fs.existsSync(path.join(DIST, p)) || fs.existsSync(path.join(DIST, p, 'index.html')); };
const lees = (p) => fs.readFileSync(path.join(DIST, p), 'utf8');
const tekst = (s) => s.replace(/<[^>]+>/g, ' ').replace(/&#39;|&rsquo;|&#x27;|’/g, '’').replace(/&amp;/g, '&').replace(/&nbsp;|&#160;/g, ' ').replace(/\s+/g, ' ').trim();
const schoon = (s) => tekst(s).replace(/'/g, '’');

/* ── 1 · de bouw ─────────────────────────────────────────────────────────── */
console.log('\n1 · Hoe het werkt op de dienstpagina\'s');
const [snelEn, traagEn] = levertijdDelen('unattended', 'en');
const [snelNl, traagNl] = levertijdDelen('unattended', 'nl');
for (const dienst of ['catalog', 'lifestyle', 'video']) {
  for (const taal of ['en', 'nl']) {
    const pre = taal === 'nl' ? 'nl/' : '';
    const h = lees(`${pre}${dienst}/index.html`);
    const at = h.indexOf('id="hoe"');
    const begin = h.lastIndexOf('<section', at);
    const blok = at > 0 ? h.slice(begin, h.indexOf('</section>', at)) : '';
    const kop = (/<section\b[^>]*>/.exec(blok) || [''])[0];
    ok(`${taal} /${dienst}: één Hoe het werkt, voor deze dienst (data-dienst="${dienst}"), vast, zonder tabs`,
      (h.match(/id="hoe"/g) || []).length === 1 && /\bdata-o-hoe\b/.test(kop) && kop.includes(`data-dienst="${dienst}"`) && /\bis-vast\b/.test(kop) && !/data-o-tabs/.test(blok), kop.slice(0, 200));
    ok(`${taal} /${dienst}:   met de uitlegbalk (data-uitleg, de balk met de pauzeknop)`, /\bdata-uitleg\b/.test(kop) && /data-uitleg-maat="\d+ \d+ \d+"/.test(kop) && /data-uitleg-balk/.test(blok));
    const W = hoeHetWerkt(taal);
    const zinnen = dienst === 'catalog' ? W.uitlegZinnen : dienst === 'lifestyle' ? W.uitlegLifestyle : W.uitlegVideo;
    const t = schoon(blok);
    ok(`${taal} /${dienst}:   de drie zinnen van de uitleg uit src/data/hoeHetWerkt.js`, zinnen.every((z) => t.includes(schoon(z)) || blok.includes(z)), zinnen.filter((z) => !t.includes(schoon(z))).join(' | ').slice(0, 200));
    const starts = [...blok.matchAll(/href="([^"]*\/start\/[^"]*)"/g)].map((m) => m[1]);
    const doel = `/${pre}start/${dienst}/`;
    ok(`${taal} /${dienst}:   één knop, naar ${doel} (bestaat)`, starts.length === 1 && starts[0] === doel && bestaat(doel), starts.join(' '));
    const vanaf = dienst === 'video' ? videoPrijsLabel(taal, { hoofdletter: true }) : `${taal === 'nl' ? 'Vanaf' : 'From'} ${euro(ladderFloor(dienst), taal)}`;
    const [snel, traag] = taal === 'nl' ? [snelNl, traagNl] : [snelEn, traagEn];
    const feiten = schoon((/<ul class="h-feiten"[\s\S]*?<\/ul>/.exec(blok) || [''])[0]);
    ok(`${taal} /${dienst}:   de feiten uit de code: "${vanaf}", de levertijd, geen minimum`,
      feiten.includes(vanaf) && feiten.includes(traag ? `${snel}, ${traag}` : snel) && feiten.includes(taal === 'nl' ? 'Geen minimum' : 'No minimum'), feiten);
  }
}
for (const p of ['index.html', 'nl/index.html']) {
  const h = lees(p);
  ok(`${p}: de voorpagina heeft Hoe het werkt kort, niet de lange met de animaties`, !/data-o-hoe/.test(h) && /<section class="w8"/.test(h));
}
{
  const vp = fs.readFileSync(path.join(ROOT, 'src/components/VoorpaginaHal.astro'), 'utf8');
  const hd = fs.readFileSync(path.join(ROOT, 'src/components/HalHoeDienst.astro'), 'utf8');
  ok('de woorden staan op één plek: VoorpaginaHal en HalHoeDienst lezen src/data/hoeHetWerkt.js', /from '\.\.\/data\/hoeHetWerkt\.js'/.test(vp) && /from '\.\.\/data\/hoeHetWerkt\.js'/.test(hd));
  ok('  CatalogHal, LifestyleHal en VideoHal zetten HalHoeDienst met hun eigen dienst', ['Catalog', 'Lifestyle', 'Video'].every((n) => new RegExp(`<HalHoeDienst lang=\\{lang\\} dienst="${n.toLowerCase()}"`).test(fs.readFileSync(path.join(ROOT, `src/components/${n}Hal.astro`), 'utf8'))));
}

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
async function nieuweContext(breed, hoog, stil) {
  const ctx = await browser.newContext({ viewport: { width: breed, height: hoog }, reducedMotion: stil ? 'reduce' : 'no-preference' });
  await ctx.addCookies([KEUZE]);
  await ctx.route('**/account/me**', (r) => r.fulfill({ status: 401, contentType: 'application/json', body: 'null' }));
  await ctx.route('**/api/**', (r) => r.fulfill({ status: 204, body: '' }));
  await ctx.route(/\.(mp4|webm)(\?|$)/, (r) => r.fulfill({ status: 204, body: '' }));
  return ctx;
}
async function open(ctx, pad) {
  const page = await ctx.newPage();
  const fouten = [];
  page.on('pageerror', (e) => fouten.push(String(e).slice(0, 200)));
  await page.goto(BASIS + pad, { waitUntil: 'load' });
  await page.evaluate(() => Promise.all([document.fonts.load('700 40px "VISUAILS Display"'), document.fonts.load('370 16px "DM Sans"'), document.fonts.ready]));
  await page.waitForTimeout(150);
  return { page, fouten };
}

/* ── 2 · de letter en de lucht ───────────────────────────────────────────── */
console.log('\n2 · de letter en de lucht, in de browser');
const PAGINAS = ['/about/', '/nl/catalog/', '/lifestyle/', '/nl/video/', '/pricing/', '/nl/how-it-works/', '/faq/', '/nl/gallery/', '/contact/', '/lifestyle/dunes/', '/nl/editions/', '/ai-act/', '/studio/', '/404.html'];
const RAND = { 1440: 120, 900: 75, 390: 20 };
const LUCHT = { groot: [213, 160, 64, 56, 40, 24], klein: [120, 90, 48, 40, 36, 32, 24] };
for (const breed of [1440, 900, 390]) {
  const ctx = await nieuweContext(breed, 900, true);
  const mis = { zij: [], hoofd: [], regels: [], dik: [], rand: [], lucht: [], fout: [] };
  let koppen = 0;
  for (const pad of PAGINAS) {
    const { page, fouten } = await open(ctx, pad);
    const m = await page.evaluate(() => {
      const pag = document.querySelector('.h-pagina:not(.h-voor)');
      const probe = (ouder) => { const s = document.createElement('div'); s.style.cssText = 'position:absolute;visibility:hidden;width:var(--h-rand)'; ouder.appendChild(s); const w = s.getBoundingClientRect().width; s.remove(); return Math.round(w * 10) / 10; };
      const koppen = [...document.querySelectorAll('main h1, main h2, main h3, main .h-kop')].filter((e, i, a) => a.indexOf(e) === i).filter((e) => {
        const s = getComputedStyle(e); const r = e.getBoundingClientRect();
        return /VISUAILS Display/.test(s.fontFamily.split(',')[0]) && r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && !e.classList.contains('h-proef-kop') && !e.closest('[aria-hidden="true"]');
      }).map((e) => { const s = getComputedStyle(e); return { t: e.textContent.trim().replace(/\s+/g, ' ').slice(0, 50), kop: e.classList.contains('h-kop'), tt: s.textTransform, regels: Math.round(e.getBoundingClientRect().height / parseFloat(s.lineHeight)) }; });
      const dik = [];
      for (const e of document.querySelectorAll('main *')) {
        if (e.closest('svg, option, select, [aria-hidden="true"]') || e.tagName === 'OPTION') continue;
        if (![...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
        const s = getComputedStyle(e);
        if (!/DM Sans/.test(s.fontFamily.split(',')[0])) continue;
        if (s.fontWeight === '400' || s.fontWeight === '500') dik.push(`${s.fontWeight} ${e.tagName}.${String(e.className).split(' ')[0]}`);
      }
      const lucht = pag ? [...pag.querySelectorAll('.h-sec')].map((e) => [Math.round(parseFloat(getComputedStyle(e).paddingTop)), String(e.className).split(' ').slice(0, 2).join('.')]) : [];
      const open = document.querySelector('.h-dienst-open');
      return { zij: document.documentElement.scrollWidth > innerWidth + 1, body: getComputedStyle(document.body).fontWeight, rand: pag ? probe(pag) : -1, open: open ? probe(open) : null, koppen, dik: [...new Set(dik)], lucht };
    });
    if (m.zij) mis.zij.push(pad);
    koppen += m.koppen.length;
    for (const k of m.koppen) {
      if (k.kop && k.tt !== 'uppercase') mis.hoofd.push(`${pad} «${k.t}»`);
      if (k.regels > 2) mis.regels.push(`${pad} [${k.regels}] «${k.t}»`);
    }
    if (m.body !== '370' || m.dik.length) mis.dik.push(`${pad} body ${m.body} ${m.dik.slice(0, 3).join(', ')}`);
    if (Math.abs(m.rand - RAND[breed]) > 0.6) mis.rand.push(`${pad} ${m.rand}`);
    if (m.open !== null && m.open !== (breed > 1180 ? 40 : breed > 900 ? 28 : 16)) mis.rand.push(`${pad} opening ${m.open}`);
    const toegestaan = breed > 900 ? LUCHT.groot : LUCHT.klein;
    for (const [px, naam] of m.lucht) if (!toegestaan.includes(px)) mis.lucht.push(`${pad} ${naam} ${px}`);
    if (fouten.length) mis.fout.push(`${pad} ${fouten[0]}`);
    await page.close();
  }
  ok(`${breed}: niets schuift zijwaarts (${PAGINAS.length} pagina's)`, !mis.zij.length, mis.zij.join(' '));
  ok(`${breed}:   elke kop in de kopletter in hoofdletters (${koppen} koppen)`, koppen >= 50 && !mis.hoofd.length, mis.hoofd.slice(0, 4).join(' | '));
  ok(`${breed}:   elke kop hoogstens twee regels`, !mis.regels.length, mis.regels.slice(0, 4).join(' | '));
  ok(`${breed}:   lopende tekst 370; nergens DM Sans op 400 of 500`, !mis.dik.length, mis.dik.slice(0, 3).join(' | '));
  ok(`${breed}:   de marge ${RAND[breed]} px; de opening van een dienstpagina houdt de hare`, !mis.rand.length, mis.rand.join(' | '));
  ok(`${breed}:   tussen de secties alleen de maten van de schaal (${(breed > 900 ? LUCHT.groot : LUCHT.klein).join(' · ')})`, !mis.lucht.length, mis.lucht.slice(0, 4).join(' | '));
  ok(`${breed}:   geen scriptfout`, !mis.fout.length, mis.fout.join(' | '));
  await ctx.close();
}

/* ── 3 · Hoe het werkt speelt ────────────────────────────────────────────── */
console.log('\n3 · Hoe het werkt speelt');
for (const stil of [false, true]) {
  const ctx = await nieuweContext(1440, 900, stil);
  for (const pad of ['/nl/catalog/', '/lifestyle/', '/nl/video/']) {
    const { page, fouten } = await open(ctx, pad);
    const voor = await page.evaluate(() => document.querySelector('#hoe').dataset.uitlegStaat || '');
    await page.evaluate(() => { const e = document.querySelector('#hoe'); scrollTo(0, e.getBoundingClientRect().top + scrollY - 60); });
    await page.waitForTimeout(1500);
    const na = await page.evaluate(() => document.querySelector('#hoe').dataset.uitlegStaat || '');
    if (stil) ok(`${pad} (minder beweging): het eindbeeld staat er meteen, zonder te spelen`, na !== 'speelt', `${voor} → ${na}`);
    else ok(`${pad}: wacht tot je erheen scrolt, en speelt dan`, voor !== 'speelt' && na === 'speelt', `${voor} → ${na}`);
    ok(`${pad}:   geen scriptfout`, !fouten.length, fouten.join(' | '));
    await page.close();
  }
  await ctx.close();
}

await browser.close();
server.close();
console.log(`\n${goed} goed, ${fout} fout`);
process.exit(fout ? 1 : 0);
