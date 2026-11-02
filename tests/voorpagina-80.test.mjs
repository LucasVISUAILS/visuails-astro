/**
 * VISUAILS — de voorpagina in rust (levering 80, 1 november 2026).
 *
 *   node tests/voorpagina-80.test.mjs        (npm run test:voorpagina80; draai eerst de build)
 *
 * Lucas, 17:05: "eerst groot tekst van wat VISUAILS is en daaronder al licht de laptop in beeld … 1x omlaag
 * scrollen … daarna de hele animatie". Lijst 64 legde de rest vast: de titel "Jouw merk, zoals jij hem ziet.",
 * de vijf kleuren met de grond Wit, koppen in hoofdletters, Wat we maken met weinig informatie, de galerij in
 * plaats van "Kies een look", de logoposter, Hoe het werkt kort, zacht scrollen en het laadscherm. De maten
 * staan in docs/RUST-80.md. Vervangt tests/voorpagina-78.test.mjs (de opening van 78 en 79 bestaat niet meer).
 *
 *   1 · de pagina: de volgorde van de secties, de titel, de links en beelden die moeten bestaan, de prijzen en
 *       de levertijd uit de code, de klant ziet geen €1-link maar Studio, het laadscherm alleen op de voorpagina;
 *   2 · de balk: 56 px, glas (de grond op 72 %, vervaging), het uitklapmenu eronder;
 *   3 · in de browser (1440 × 900, 1920 × 1080, 390 × 844): niets zijwaarts, de titel op zijn maat, koppen
 *       hoogstens twee regels, geen tekst onder 11,5 px; de eerste scroll zet de laptop in het midden;
 *   4 · de galerij en de poster bewegen alleen met het scrollen en staan daarna weer stil; bij minder beweging
 *       niets van dat alles; het laadscherm is weg zodra de pagina er is; geen scriptfouten.
 */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { buildStaat } from './lib/build.mjs';
import { browserPad } from '../scripts/lib/browserpad.mjs';
import { euro, ladderFloor, levertijdDelen } from '../src/data/pricing.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
let goed = 0, fout = 0;
const ok = (naam, cond, extra = '') => { if (cond) goed++; else fout++; console.log(`${cond ? ' ok  ' : ' FAIL'} ${naam}${cond || !extra ? '' : ` — ${extra}`}`); };

const staat = buildStaat(new URL('../dist/index.html', import.meta.url));
if (!staat.er || staat.oud) { console.log(`geen bruikbare build — ${staat.uitleg}`); process.exit(1); }
const bestaat = (url) => { const p = url.split('?')[0].replace(/^\//, ''); return fs.existsSync(path.join(DIST, p)) || fs.existsSync(path.join(DIST, p, 'index.html')); };

/* ── 1 · de pagina ───────────────────────────────────────────────────────── */
console.log('\n1 · de pagina');
for (const [pad, taal] of [['index.html', 'en'], ['nl/index.html', 'nl']]) {
  const h = fs.readFileSync(path.join(DIST, pad), 'utf8');
  const tekst = (s) => s.replace(/<[^>]+>/g, ' ').replace(/&#39;|&rsquo;|’/g, '’').replace(/\s+/g, ' ').trim();
  const h1 = (/<h1\b[\s\S]*?<\/h1>/.exec(h) || [''])[0];
  ok(`${taal}: één h1, de titel in twee regels (lijst 64: "Zoals jij hem ziet")`, (h.match(/<h1\b/g) || []).length === 1 && /<h1\b[^>]*class="[^"]*\bo8-kop\b/.test(h1)
    && tekst(h1) === (taal === 'nl' ? 'Jouw merk, zoals jij hem ziet.' : 'Your brand, as you see it.'), tekst(h1));
  const plek = (re) => { const m = re.exec(h); return m ? m.index : -1; };
  const volg = [plek(/class="o8"|class="o8 /), plek(/<section class="m8" id="maken"/), plek(/<section class="g8" id="looks"/), plek(/<section class="p8"/), plek(/<section class="w8"/), plek(/class="h-sec h-weten v-weten/), plek(/<section class="h-proef/)];
  ok(`${taal}: de volgorde: opening, Wat we maken, galerij, poster, Hoe het werkt, Meer weten, €1-blok`, volg.every((x, i) => x > 0 && (i === 0 || x > volg[i - 1])), volg.join(' '));
  ok(`${taal}:   de oude opening, de looks en de lange Hoe het werkt zijn weg`, !/data-lb-podium|class="h-sec h-looks|class="h-sec o-hoe/.test(h));
  /* Wat we maken: de vanafprijzen uit de code, de links bestaan */
  const m8 = h.slice(plek(/<section class="m8"/), plek(/<section class="g8"/));
  const vanaf = taal === 'nl' ? 'vanaf' : 'from';
  ok(`${taal}: Wat we maken: drie diensten met hun vanafprijs uit de code (${euro(ladderFloor('catalog'), taal)}, ${euro(ladderFloor('lifestyle'), taal)})`,
    (m8.match(/class="m8-dienst"/g) || []).length === 3 && m8.includes(`${vanaf} ${euro(ladderFloor('catalog'), taal)}`) && m8.includes(`${vanaf} ${euro(ladderFloor('lifestyle'), taal)}`));
  const m8links = [...m8.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
  ok(`${taal}:   alle links in Wat we maken bestaan (${m8links.length})`, m8links.length >= 7 && m8links.every(bestaat), m8links.filter((l) => !bestaat(l)).join(' '));
  /* de galerij */
  const g8 = h.slice(plek(/<section class="g8"/), plek(/<section class="p8"/));
  /* de build zet een style-attribuut om in een klasse (vs-…): daarom [^"]* na g8-tegel */
  const tegels = [...g8.matchAll(/<a class="g8-tegel[^"]*" href="([^"]+)"[^>]*>/g)];
  const echt = tegels.filter((m) => !/data-g8-kopie/.test(m[0]));
  ok(`${taal}: de galerij: 21 beelden (12 lifestyle, 9 catalog), elk een link naar zijn look die bestaat`, echt.length === 21 && echt.every((m) => bestaat(m[1])), echt.filter((m) => !bestaat(m[1])).map((m) => m[1]).join(' '));
  ok(`${taal}:   de kopieën doen niet mee voor een schermlezer of de tab-toets`, tegels.filter((m) => /data-g8-kopie/.test(m[0])).every((m) => /aria-hidden="true"/.test(m[0]) && /tabindex="-1"/.test(m[0])));
  const bronnen = [...g8.matchAll(/<(?:img|source)\b[^>]*>/g)].flatMap((m) => [...m[0].matchAll(/\s(?:src|srcset)="([^"]+)"/g)]).flatMap((m) => m[1].split(',').map((s) => s.trim().split(' ')[0]));
  ok(`${taal}:   elk beeld en elke veeg staat in public (${new Set(bronnen).size})`, bronnen.length > 40 && bronnen.every((b) => fs.existsSync(path.join(ROOT, 'public', b))), bronnen.filter((b) => !fs.existsSync(path.join(ROOT, 'public', b))).slice(0, 3).join(' '));
  /* de poster */
  const p8 = h.slice(plek(/<section class="p8"/), plek(/<section class="w8"/));
  ok(`${taal}: de poster: het V-merk uit de sprite (#markglyph), de regel als h2, de foto en de look bestaan`, /<use href="#markglyph"/.test(p8) && /<h2 id="p8-kop"/.test(p8)
    && ['', '-w1200', '-w1560'].every((s) => fs.existsSync(path.join(ROOT, 'public', `img/lifestyle-phone-made-04${s}.webp`))) && bestaat((/class="p8-look" href="([^"]+)"/.exec(p8) || [, '/x'])[1]));
  /* Hoe het werkt, kort: de levertijd uit de code */
  const [snel, traag] = levertijdDelen('unattended', taal);
  const w8 = h.slice(plek(/<section class="w8"/), plek(/class="h-sec h-weten/));
  ok(`${taal}: Hoe het werkt: drie stappen in één regel, de levertijd uit de code`, (w8.match(/class="w8-stap"/g) || []).length === 3 && tekst(w8).includes(traag ? `${snel}, ${traag}.` : `${snel}.`) && bestaat((/class="w8-link" href="([^"]+)"/.exec(w8) || [, '/x'])[1]), tekst(w8).slice(0, 160));
  /* lijst 64, knoppen: de klant ziet andere knoppen */
  const acties = (/<p class="o8-acties">[\s\S]*?<\/p>/.exec(h) || [''])[0];
  ok(`${taal}: de €1-link alleen voor wie nog niet bestelde; een klant ziet de link naar Studio`, /href="[^"]*test-sample[^"]*" data-vis-uit/.test(acties) && /href="\/account" data-vis-klant-in hidden/.test(acties), acties.slice(0, 400));
  /* het laadscherm alleen hier */
  ok(`${taal}: het laadscherm: de klasse vóór de eerste verf, het V-merk, de noodrem`, h.indexOf("classList.add('vl8-aan')") > 0 && h.indexOf("classList.add('vl8-aan')") < h.indexOf('<body') && /<div class="vl8" id="vl8"/.test(h) && /getoond\?open\(\):ruim\(\)|getoond \? open\(\) : ruim\(\)/.test(h));
  ok(`${taal}:   koppen in de nieuwe secties hebben de kopletter-klasse`, ['m8-kop', 'g8-kop', 'p8-kop'].every((k) => new RegExp(`class="h-kop ${k}"`).test(h)));
}
{
  const h = fs.readFileSync(path.join(DIST, 'pricing/index.html'), 'utf8');
  ok('het laadscherm staat op geen andere pagina (/pricing)', !/vl8/.test(h));
}
const bron = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
ok('de opening vangt het wiel vóór het zachte scrollen (capture)', /addEventListener\('wheel', opWiel, \{ passive: false, capture: true \}\)/.test(bron('src/components/HalOpening80.astro')));
ok('zacht scrollen staat in Layout en alleen voor een muiswiel', /import '\.\.\/scripts\/zachtscrollen\.js'/.test(bron('src/layouts/Layout.astro')) && /function isMuiswiel/.test(bron('src/scripts/zachtscrollen.js')));
ok('de letter heeft de gewichten 300 – 700 (lopende tekst 370)', /font-family: 'DM Sans'; font-style: normal; font-weight: 300 700;/.test(bron('src/styles/hal.css')) && /\.h-voor \{ font-weight: 370; \}/.test(bron('src/styles/voorpagina-80.css')));
ok('docs/RUST-80.md beschrijft de secties, het scrollen en het laadscherm', ['## 7 · De secties na de opening', '## 8 · Zacht scrollen en het laadscherm'].every((k) => bron('docs/RUST-80.md').includes(k)));
{
  const v = JSON.parse(bron('src/data/laptopVideo.json'));
  ok('de laptopvideo: 111 beelden met de hoeken van de schermen, en de bestanden staan er', v.beelden === 111 && v.schermen.length === 111
    && [1280, 1920, 2560].every((b) => fs.existsSync(path.join(ROOT, `public/img/hal/laptop-video/laptop-80-${b}.mp4`))));
}

/* ── de browser ──────────────────────────────────────────────────────────── */
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.avif': 'image/avif', '.png': 'image/png', '.json': 'application/json', '.woff2': 'font/woff2', '.mp4': 'video/mp4', '.webm': 'video/webm' };
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
  const page = await ctx.newPage();
  const fouten = [];
  page.on('pageerror', (e) => fouten.push(String(e).slice(0, 200)));
  await page.route('**/account/me**', (r) => r.fulfill({ status: 401, contentType: 'application/json', body: 'null' }));
  await page.route('**/api/**', (r) => r.fulfill({ status: 204, body: '' }));
  await page.route(/\.(mp4|webm)(\?|$)/, (r) => r.fulfill({ status: 204, body: '' }));
  await page.goto(BASIS + pad, { waitUntil: 'load' });
  await page.evaluate(() => Promise.all([document.fonts.load('700 40px "VISUAILS Display"'), document.fonts.load('400 16px "DM Sans"')]));
  await page.waitForTimeout(600);
  return { ctx, page, fouten };
}
const dicht = (a, b, d = 1.5) => Math.abs(a - b) <= d;

/* ── 2 · de balk ─────────────────────────────────────────────────────────── */
console.log('\n2 · de balk');
{
  const { ctx, page, fouten } = await open('/nl/');
  const b = await page.evaluate(() => { const k = document.querySelector('.site-header'), n = k.querySelector('.nav'); const r = k.getBoundingClientRect(), c = getComputedStyle(k); return { top: r.top, w: r.width, h: n.getBoundingClientRect().height, bg: c.backgroundColor, glas: c.backdropFilter || c.webkitBackdropFilter }; });
  ok('56 px hoog over de hele breedte, de grond op 72 % met vervaging (vloeibaar glas)', b.top === 0 && b.w === 1440 && dicht(b.h, 56, 0.5) && /rgba\(251, 252, 255, 0\.72\)/.test(b.bg) && /blur\(20px\)/.test(b.glas), JSON.stringify(b));
  await page.locator('.site-header .nav-trigger').first().hover();
  await page.waitForTimeout(500);
  const menu = await page.evaluate(() => { const n = document.querySelector('.site-header .has-menu:hover .nav-menu'); return n ? n.getBoundingClientRect().top : null; });
  ok('  een uitklapmenu hangt 8 px onder de balk (niet erdoorheen)', menu !== null && dicht(menu, 64, 1), String(menu));
  await page.mouse.move(700, 600);
  /* langzamer dan 350 ms geladen: dan opent het logo de pagina eerst (± 1,4 s); daarna is het weg */
  await page.waitForFunction(() => !document.getElementById('vl8') && !document.documentElement.classList.contains('vl8-aan'), null, { timeout: 4000 }).catch(() => {});
  const vl = await page.evaluate(() => !document.getElementById('vl8') && !document.documentElement.classList.contains('vl8-aan'));
  ok('het laadscherm is weg zodra de pagina er is', vl);
  ok('  geen scriptfout', fouten.length === 0, fouten.join(' | '));
  await ctx.close();
}

/* ── 3 · de maten ────────────────────────────────────────────────────────── */
for (const [breed, hoog] of [[1440, 900], [1920, 1080], [390, 844]]) {
  console.log(`\n3 · ${breed} × ${hoog}`);
  const { ctx, page, fouten } = await open('/nl/', { breed, hoog });
  const m = await page.evaluate(() => {
    const kop = document.querySelector('.o8-kop');
    /* de kop van het €1-blok telt niet: daar staat de reuzen-€1 in */
    const koppen = [...document.querySelectorAll('.h-voor h2')].filter((e) => e.offsetParent && !e.classList.contains('sr-only') && !e.classList.contains('h-proef-kop')).map((e) => { const fs = parseFloat(getComputedStyle(e).fontSize), lh = parseFloat(getComputedStyle(e).lineHeight) || fs; return [e.textContent.trim().slice(0, 30), Math.round(e.getBoundingClientRect().height / lh)]; });
    const klein = [];
    const w = document.createTreeWalker(document.querySelector('.h-voor'), NodeFilter.SHOW_TEXT);
    let n; while ((n = w.nextNode())) { const t = n.textContent.trim(); const el = n.parentElement; if (!t || !el.offsetParent || el.closest('.sr-only,[aria-hidden="true"]')) continue; const fs = parseFloat(getComputedStyle(el).fontSize); if (fs < 11.5) klein.push(`${t.slice(0, 20)} ${fs}`); }
    return { sw: document.documentElement.scrollWidth, vw: document.documentElement.clientWidth, fs: parseFloat(getComputedStyle(kop).fontSize), regels: Math.round(kop.getBoundingClientRect().height / (parseFloat(getComputedStyle(kop).fontSize) * 0.92)), koppen, klein };
  });
  ok('niets zijwaarts', m.sw <= m.vw, `${m.sw} > ${m.vw}`);
  ok(`de titel op twee regels, ${breed >= 1100 ? '104 px' : 'tussen 30 en 76 px'}`, m.regels === 2 && (breed >= 1100 ? dicht(m.fs, 104, 0.5) : m.fs >= 30 && m.fs <= 76), JSON.stringify([m.fs, m.regels]));
  ok('elke kop hoogstens twee regels', m.koppen.every(([, r]) => r <= 2), JSON.stringify(m.koppen.filter(([, r]) => r > 2)));
  ok('geen tekst kleiner dan 11,5 px', m.klein.length === 0, m.klein.slice(0, 4).join(' | '));
  if (breed >= 1100) {
    /* de eerste scroll: de laptop helemaal in beeld, de foto in het midden onder de balk */
    await page.mouse.move(breed / 2, hoog / 2);
    await page.mouse.wheel(0, 120);
    await page.waitForTimeout(1500);
    const s1 = await page.evaluate(() => { const f = document.querySelector('.o8-foto').getBoundingClientRect(); return { y: scrollY, midden: (f.top + f.bottom) / 2, gewenst: 56 + (innerHeight - 56) / 2 }; });
    ok('de eerste scroll zet de laptop in het midden onder de balk', s1.y > 100 && dicht(s1.midden, s1.gewenst, 3), JSON.stringify(s1));
  }
  /* de galerij: stil, dan beweegt hij met het scrollen, en daarna staat hij weer stil */
  const g = await page.evaluate(() => Math.round(scrollY + document.querySelector('[data-g8]').getBoundingClientRect().top));
  await page.evaluate((y) => window.scrollTo(0, y - 200), g);
  await page.waitForTimeout(900);
  const t0 = await page.evaluate(() => [...document.querySelectorAll('[data-g8-baan]')].map((b) => getComputedStyle(b).transform));
  await page.evaluate(async () => { for (let i = 0; i < 12; i++) { window.scrollBy(0, 40); await new Promise((r) => requestAnimationFrame(r)); } });
  await page.waitForTimeout(1500);
  const t1 = await page.evaluate(() => [...document.querySelectorAll('[data-g8-baan]')].map((b) => getComputedStyle(b).transform));
  await page.waitForTimeout(400);
  const t2 = await page.evaluate(() => [...document.querySelectorAll('[data-g8-baan]')].map((b) => getComputedStyle(b).transform));
  const x = (t) => t.map((s) => Number((/matrix\([^,]+,[^,]+,[^,]+,[^,]+,\s*([-\d.]+)/.exec(s) || [, 0])[1]));
  const [a0, b0] = x(t0), [a1, b1] = x(t1);
  ok('de galerij: rij 1 schuift naar links en rij 2 naar rechts als je naar beneden scrolt', a1 < a0 || a1 - a0 > 1000, JSON.stringify([a0, a1, b0, b1]));
  ok('  en staat daarna weer stil (geen lus)', JSON.stringify(t1) === JSON.stringify(t2), JSON.stringify([t1, t2]));
  /* de poster: aan het eind van de baan vult de foto het scherm en staat de look erbij */
  const p = await page.evaluate(() => { const b = document.querySelector('[data-p8-baan]').getBoundingClientRect(); return { top: Math.round(scrollY + b.top), h: Math.round(b.height) }; });
  await page.evaluate(([t, hh]) => window.scrollTo(0, t + hh - innerHeight), [p.top, p.h]);
  await page.waitForTimeout(1600);
  const pe = await page.evaluate(() => ({ eind: document.querySelector('[data-p8]').classList.contains('is-eind'), sticky: getComputedStyle(document.querySelector('[data-p8-podium]')).position, top: document.querySelector('[data-p8-podium]').getBoundingClientRect().top }));
  ok('de poster: het podium blijft staan, en aan het eind staat de look van de foto erbij', pe.eind && pe.sticky === 'sticky' && dicht(pe.top, 0, 1), JSON.stringify(pe));
  ok('  geen scriptfout', fouten.length === 0, fouten.join(' | '));
  await ctx.close();
}

/* ── 4 · minder beweging ─────────────────────────────────────────────────── */
console.log('\n4 · minder beweging');
{
  const { ctx, page, fouten } = await open('/nl/', { stil: true });
  const m = await page.evaluate(() => ({ g8: document.querySelector('[data-g8]').classList.contains('g8-aan'), p8: document.querySelector('[data-p8]').classList.contains('p8-aan'), rij: getComputedStyle(document.querySelector('.g8-rij')).overflowX, kopie: getComputedStyle(document.querySelector('.g8-tegel[data-g8-kopie]')).display, o8: document.documentElement.classList.contains('o8-aan') }));
  ok('geen scrolleffecten: de rijen scrollen zelf, zonder kopieën; de poster staat stil; de opening glijdt niet', !m.g8 && !m.p8 && m.rij === 'auto' && m.kopie === 'none' && !m.o8, JSON.stringify(m));
  ok('  geen scriptfout', fouten.length === 0, fouten.join(' | '));
  await ctx.close();
}

await browser.close();
server.close();
console.log(`\n${goed} goed, ${fout} fout`);
process.exit(fout ? 1 : 0);
