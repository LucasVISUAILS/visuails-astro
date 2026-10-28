/**
 * VISUAILS — de voorpagina opnieuw ingedeeld (levering 78, 27 oktober 2026).
 *
 *   node tests/voorpagina-78.test.mjs        (npm run test:voorpagina78; draai eerst de build)
 *
 * Lucas, 16:50: "de homepage van de grond af opnieuw uitgebreid … indelen … goed gebruik maken van
 * ruimte en rust. Alleen de eerste laptop pagina krijgt het scroll effect en daarna scrollt de
 * pagina normaal." Het systeem staat in docs/RUIMTE-EN-RUST.md. Wat hier vastligt:
 *   1 · de pagina: de tablet (HalTablet.astro) met één h1, de still met ?v=, de standen; daarna
 *       Wat we maken (de landingsplek van de foto), Hoe het werkt (HalHoe.astro), de looks, Meer
 *       weten, het €1-blok. Geen label boven de secties behalve "Proef". Niet meer "drie soorten
 *       beeld": wat er verder is, staat onder Wat we maken;
 *   2 · de balk: rechthoekig over de hele breedte, 72 px, wit met een haarlijn, geen glas;
 *   3 · in de browser (1903 × 919 en 1440 × 900): de maten van de opening (48 px onder de balk, de
 *       kop een stap S buiten de tablet), het ene scrolleffect (de foto landt op zijn echte plek,
 *       daarna gewoon scrollen), de stap S in Wat we maken en de trap van Hoe het werkt;
 *   4 · de gloed op de tweede toon: in rust inkt, niets bij het laden, pas na een beweging, één
 *       tegelijk, onder de 5 s;
 *   5 · zonder effect: de telefoon en minder beweging zetten alles onder elkaar; een smaller venster
 *       midden in de vlucht laat niets achter; geen scriptfouten, nergens zijwaarts scrollen.
 */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { buildStaat } from './lib/build.mjs';
import { browserPad } from '../scripts/lib/browserpad.mjs';
import { euro, ladderFloor } from '../src/data/pricing.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
let goed = 0, fout = 0;
const ok = (naam, cond, extra = '') => { if (cond) goed++; else fout++; console.log(`${cond ? ' ok  ' : ' FAIL'} ${naam}${cond || !extra ? '' : ` — ${extra}`}`); };

const staat = buildStaat(new URL('../dist/index.html', import.meta.url));
if (!staat.er || staat.oud) { console.log(`geen bruikbare build — ${staat.uitleg}`); process.exit(1); }

/* ── 1 · de pagina ───────────────────────────────────────────────────────── */
console.log('\n1 · de pagina');
for (const [pad, taal] of [['index.html', 'en'], ['nl/index.html', 'nl']]) {
  const h = fs.readFileSync(path.join(DIST, pad), 'utf8');
  const lees = h.replace(/<script[\s\S]*?<\/script>/g, '').replace(/\salt="[^"]*"/g, '');
  ok(`${taal}: één h1, de kop van de tablet, met de hele zin als naam en de tweede toon in .l`, (h.match(/<h1\b/g) || []).length === 1 && /<h1 id="h-h1" class="t-kop h-kop" data-t-kop aria-label="[^"]+">/.test(h) && /<span class="l" aria-hidden="true">/.test(h.slice(h.indexOf('<h1'), h.indexOf('</h1>'))));
  ok(`${taal}: de tablet, het scherm en de vliegende foto`, ['data-t-podium', 'data-t-tablet', 'data-t-beeld', 'data-t-plek', 'data-t-vlieg', 'data-t-doel'].every((a) => new RegExp(`${a}[\\s>=]`).test(h)));
  ok(`${taal}: de still in drie maten met ?v= (levering 77), de grootste 3600 breed`, /<img class="t-still"[^>]*width="3600"/.test(h) && /still-1800\.webp\?v=[0-9a-f]{10} 1800w, \/img\/hal\/opening\/still-2700\.webp\?v=[0-9a-f]{10} 2700w, \/img\/hal\/opening\/still-3600\.webp\?v=[0-9a-f]{10} 3600w/.test(h));
  const stand = h.slice(h.indexOf('class="t-stand"'), h.indexOf('data-t-standen'));
  ok(`${taal}: de standen: naam en teller, de streep, vorige en volgende, pauze`, /data-t-naam>/.test(stand) && /data-t-teller>1 \/ 9</.test(stand) && /data-t-streep/.test(stand) && (stand.match(/data-t-stap="-?1"/g) || []).length === 2 && /data-t-pauze[^>]*aria-pressed="false"/.test(stand), stand.slice(0, 300));
  const sj = JSON.parse((/<script type="application\/json" data-t-standen>([\s\S]*?)<\/script>/.exec(h) || [, '{}'])[1]);
  ok(`${taal}:   negen standen, elk met een laptop- en een telefoonscherm dat bestaat`, sj.standen?.length === 9 && sj.standen.every((x) => fs.existsSync(path.join(ROOT, 'public', `${x.lap}.webp`)) && fs.existsSync(path.join(ROOT, 'public', `${x.tel}.webp`))));
  /* de volgorde: de tablet, dan Wat we maken (de foto landt daar), dan Hoe het werkt, de looks, Meer weten, het €1-blok */
  const plek = (re) => { const m = re.exec(h); return m ? m.index : -1; };
  const volg = [plek(/data-t-podium/), plek(/<section class="h-sec h-maken v-maken t-na" id="maken"/), plek(/<section class="h-sec o-hoe h-hoe v-hoe" id="hoe"/), plek(/class="h-sec h-looks/), plek(/class="h-sec h-weten v-weten/), plek(/<section class="h-proef/)];
  ok(`${taal}: de volgorde: tablet, Wat we maken, Hoe het werkt, looks, Meer weten, €1-blok`, volg.every((x, i) => x > 0 && (i === 0 || x > volg[i - 1])), volg.join(' '));
  ok(`${taal}:   Wat we maken heeft de landingsplek met de drie soorten als lagen`, /<div class="h-pv-beeld v-maken-beeld" data-h-pv-vak data-t-doel>/.test(h) && ['catalog', 'lifestyle', 'video'].every((d) => new RegExp(`class="h-pv-laag h-pv-${d}`).test(h)));
  /* Lucas, 16:50: "de klant [moet] niet het idee … krijgen dat dit het enige is wat hij van VISUAILS kan verwachten" */
  ok(`${taal}: niet meer "drie soorten beeld"`, !/Drie soorten beeld|Three kinds of image|Krijg catalog, lifestyle en video terug|Get catalog, lifestyle and video back/.test(lees));
  const ook = (/<div class="v-ook[^"]*"[\s\S]*?<\/div>/.exec(h) || [''])[0];
  const links = [...ook.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
  ok(`${taal}:   onder Wat we maken wat er verder is: vier links en "vraag het ons"`, links.length === 5 && links.every((l) => fs.existsSync(path.join(DIST, l.replace(/^\//, ''), 'index.html'))), links.join(' '));
  const meta = (/<meta name="description" content="([^"]*)"/.exec(h) || [, ''])[1];
  ok(`${taal}:   ook de zin voor Google noemt niet alleen catalog en lifestyle`, meta.length > 60 && meta.length <= 152 && !/^Catalog/i.test(meta), meta);
  /* Lucas, 28 oktober: "vanaf" is ook daar de onderste trede, zoals op de pagina (tests/vanaf-bedragen) */
  ok(`${taal}:   en zijn "vanaf" is de onderste trede (${euro(ladderFloor('catalog'), taal)}), net als op de pagina`, meta.includes(`${taal === 'nl' ? 'Vanaf' : 'From'} ${euro(ladderFloor('catalog'), taal)}`), meta);
  /* RUIMTE-EN-RUST §5: een label alleen als het iets zegt */
  const voor = h.slice(h.indexOf('class="h-pagina h-voor"'), h.indexOf('class="site-footer'));
  const zonderProef = voor.replace(/<section class="h-proef[\s\S]*?<\/section>/g, '');
  ok(`${taal}: geen label boven de secties, alleen "Proef" bij het €1-blok`, !/<p class="h-pil/.test(zonderProef) && /<section class="h-proef[\s\S]*?<p class="h-pil[^>]*><span>(Proef|Trial)<\/span>/.test(voor));
  ok(`${taal}: nergens "met de hand" of "handwerk"`, !/met de hand|handwerk|handmatig|by hand|handwork/i.test(lees));
}
const css = (f) => fs.readFileSync(path.join(ROOT, 'src/styles', f), 'utf8');
ok('tablet.css: het scrolleffect alleen met html.t-aan, de telefoon zonder', /html\.t-aan \.t-vast \{ position: sticky/.test(css('tablet.css')) && /@media \(max-width: 900px\)/.test(css('tablet.css')));
ok('voorpagina-78.css: de stap S is 0,75 × de sectiekop (de snede van 53,13°)', /--v-s: calc\(var\(--v-f\) \* \.75\)/.test(css('voorpagina-78.css')));
ok('docs/RUIMTE-EN-RUST.md staat er, met de vier regels van de stap', (() => { const d = fs.readFileSync(path.join(ROOT, 'docs/RUIMTE-EN-RUST.md'), 'utf8'); return ['R1', 'R2', 'R3', 'R4'].every((r) => d.includes(`**${r} ·`)); })());

/* ── de browser ──────────────────────────────────────────────────────────── */
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.avif': 'image/avif', '.png': 'image/png', '.json': 'application/json', '.woff2': 'font/woff2' };
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
const KEUZE = { name: 'vis_consent', value: encodeURIComponent(JSON.stringify({ version: 1, analytics: false, at: '2026-10-27T00:00:00.000Z' })), url: BASIS };
async function open(pad, { breed = 1440, hoog = 900, stil = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width: breed, height: hoog }, reducedMotion: stil ? 'reduce' : 'no-preference' });
  await ctx.addCookies([KEUZE]);
  const page = await ctx.newPage();
  const fouten = [];
  page.on('pageerror', (e) => fouten.push(String(e).slice(0, 200)));
  await page.route('**/account/me**', (r) => r.fulfill({ status: 401, contentType: 'application/json', body: 'null' }));
  await page.route('**/api/**', (r) => r.fulfill({ status: 204, body: '' }));
  await page.goto(BASIS + pad, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.load('700 40px "VISUAILS Display"'));
  await page.waitForTimeout(500);
  return { ctx, page, fouten };
}
const naar = async (page, y) => { await page.evaluate((y) => window.scrollTo(0, y), y); await page.waitForTimeout(350); };
const rect = (page, s) => page.evaluate((s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }; }, s);
const dicht = (a, b, d = 1.5) => Math.abs(a - b) <= d;

/* ── 2 · de balk ─────────────────────────────────────────────────────────── */
console.log('\n2 · de balk');
{
  const { ctx, page, fouten } = await open('/nl/');
  const b = await page.evaluate(() => { const k = document.querySelector('.site-header'), n = k.querySelector('.nav'); const r = k.getBoundingClientRect(), c = getComputedStyle(k), cn = getComputedStyle(n); return { top: r.top, l: r.left, w: r.width, h: n.getBoundingClientRect().height, bg: c.backgroundColor, schaduw: c.boxShadow, glas: cn.backdropFilter + getComputedStyle(n, '::before').display, rond: c.borderRadius }; });
  ok('rechthoekig over de hele breedte: bovenaan, 72 px, wit, een haarlijn, geen glas', b.top === 0 && b.l === 0 && b.w === 1440 && dicht(b.h, 72, 0.5) && b.bg === 'rgb(255, 255, 255)' && /rgb\(230, 232, 236\)/.test(b.schaduw) && !/blur/.test(b.glas) && b.rond === '0px', JSON.stringify(b));
  await page.locator('.site-header .nav-trigger').first().hover();
  await page.waitForTimeout(500);
  const m = await rect(page, '.site-header .has-menu:hover .nav-menu');
  ok('  een uitklapmenu hangt 8 px onder de haarlijn (niet erdoorheen)', m && dicht(m.t, 80, 1), JSON.stringify(m));
  ok('  geen scriptfout', fouten.length === 0, fouten.join(' | '));
  await ctx.close();
}

/* ── 3 · de opening en het ene scrolleffect ─────────────────────────────── */
for (const [breed, hoog] of [[1903, 919], [1440, 900]]) {
  console.log(`\n3 · in de browser, ${breed} × ${hoog}`);
  const { ctx, page, fouten } = await open('/nl/', { breed, hoog });
  const r0 = await page.evaluate(() => {
    const q = (s) => document.querySelector(s).getBoundingClientRect();
    const tab = q('[data-t-tablet]'), kop = q('[data-t-kop]'), lede = q('[data-t-lede]'), stand = q('[data-t-stand]');
    const k = document.querySelector('[data-t-kop]'); const fs = parseFloat(getComputedStyle(k).fontSize);
    return { aan: document.documentElement.classList.contains('t-aan'), tabTop: tab.top, tabL: tab.left, tabR: tab.right, tabB: tab.bottom, ratio: tab.width / tab.height, kopL: kop.left, kopR: kop.right, regels: Math.round(kop.height / fs), fs, ledeL: lede.left, standR: stand.right, rijOnder: Math.max(lede.bottom, stand.bottom), gloeit: document.querySelectorAll('.is-gloeit').length, loopt: document.querySelector('[data-t-podium]').classList.contains('t-loopt') };
  });
  ok('het scrolleffect staat aan', r0.aan, JSON.stringify(r0));
  ok('  de tablet 48 px onder de balk, liggend 3 : 2, in het midden', dicht(r0.tabTop, 120) && dicht(r0.ratio, 1.5, 0.01) && dicht((r0.tabL + r0.tabR) / 2, breed / 2, 1), JSON.stringify(r0));
  ok('  de kop op één regel, een stap S (0,75 × de kop) links buiten de tablet, rechts binnen de tablet', r0.regels === 1 && dicht(r0.tabL - r0.kopL, 0.75 * r0.fs, 1.5) && r0.kopR <= r0.tabR + 1 && r0.fs >= 40, JSON.stringify(r0));
  ok('  de zin en de standen op de lijn van de tablet, en alles in het eerste scherm', dicht(r0.ledeL, r0.tabL) && dicht(r0.standR, r0.tabR) && r0.rijOnder <= hoog, JSON.stringify(r0));
  ok('  niets beweegt bij het laden: geen gloed, de standen lopen nog niet', r0.gloeit === 0 && !r0.loopt, JSON.stringify(r0));
  const weg = await page.evaluate(() => Math.ceil(innerHeight * 0.9));
  await naar(page, Math.round(weg * 0.5));
  const half = await page.evaluate(() => ({ vlieg: !document.querySelector('[data-t-vlieg]').hidden, doel: getComputedStyle(document.querySelector('[data-t-doel]')).opacity, kopie: document.querySelector('[data-t-vlieg-doel] .h-pv-laag')?.className || '' }));
  ok('halverwege: de foto vliegt, de echte plek is nog leeg, en hij landt op een kopie van dezelfde soort', half.vlieg && half.doel === '0' && /h-pv-(catalog|lifestyle|video)/.test(half.kopie), JSON.stringify(half));
  await naar(page, Math.round(weg * 0.95));
  const v = await rect(page, '[data-t-vlieg]'), d = await rect(page, '[data-t-doel]');
  ok('  vlak voor het eind ligt de foto precies op zijn plek in Wat we maken', v && d && ['l', 't', 'w', 'h'].every((k) => dicht(v[k], d[k], 1)), JSON.stringify({ v, d }));
  await naar(page, weg);
  const eind = await page.evaluate(() => ({ vlieg: document.querySelector('[data-t-vlieg]').hidden, doel: getComputedStyle(document.querySelector('[data-t-doel]')).opacity, weg: document.querySelector('[data-t-vast]').classList.contains('t-weg'), top: document.querySelector('[data-t-doel]').getBoundingClientRect().top }));
  ok('aan het eind: de echte foto staat er, 48 px onder de balk; de tablet is weg', eind.vlieg && eind.doel === '1' && eind.weg && dicht(eind.top, 120), JSON.stringify(eind));
  await naar(page, weg + 300);
  const verder = await page.evaluate(() => document.querySelector('[data-t-doel]').getBoundingClientRect().top);
  ok('  daarna scrolt de pagina gewoon (300 px scrollen is 300 px)', dicht(eind.top - verder, 300, 1), String(verder));
  /* review 78: het spoor van het podium (190svh) lag over Wat we maken en ving elke klik */
  await naar(page, weg + 2);
  const klik = await page.evaluate(() => ['[data-h-pv-kies="1"]', '.v-maken-tekst .h-knop', '.v-ook-rij a'].every((s) => { const e = document.querySelector(s); const q = e.getBoundingClientRect(); const x = document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2); return !!x && (x === e || e.contains(x)); }));
  ok('  na het effect is alles in Wat we maken te klikken (de soorten, de knop, de links)', klik);
  /* R2: de tekst naast het beeld in het midden van het beeld, en dan S hoger */
  const r2 = await page.evaluate(() => { const b = document.querySelector('.v-maken-beeld').getBoundingClientRect(), t = document.querySelector('.v-maken-tekst').getBoundingClientRect(); const s = parseFloat(getComputedStyle(document.querySelector('#h-maken')).fontSize) * 0.75; return { beeld: (b.top + b.bottom) / 2, tekst: (t.top + t.bottom) / 2, s }; });
  ok('Wat we maken: de tekst in het midden van het beeld en dan een stap S hoger (R2)', dicht(r2.beeld - r2.tekst, r2.s, 2), JSON.stringify(r2));
  /* R1: de kop hangt, de rest staat S naar rechts */
  const r1 = await page.evaluate(() => { const k = document.querySelector('#h-maken').getBoundingClientRect(), n = document.querySelector('.v-maken-tekst .v-na-kop').getBoundingClientRect(); const s = parseFloat(getComputedStyle(document.querySelector('#h-maken')).fontSize) * 0.75; return { d: n.left - k.left, s }; });
  ok('  de kop hangt: alles eronder staat een stap S naar rechts (R1)', dicht(r1.d, r1.s, 1), JSON.stringify(r1));
  /* R4: de drie stappen als trap */
  await page.locator('#hoe').evaluate((e) => e.scrollIntoView({ block: 'start' }));
  await page.waitForTimeout(300);
  const trap = await page.evaluate(() => { const s = parseFloat(getComputedStyle(document.querySelector('#h-maken')).fontSize) * 0.75; return { s, t: [...document.querySelectorAll('#hoe .h-stappen > .h-stap')].map((e) => e.getBoundingClientRect().top) }; });
  ok('Hoe het werkt: de drie stappen als trap, elk een stap S lager (R4)', trap.t.length === 3 && dicht(trap.t[1] - trap.t[0], trap.s, 1) && dicht(trap.t[2] - trap.t[1], trap.s, 1), JSON.stringify(trap));
  ok('  nergens zijwaarts scrollen', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  ok('  geen scriptfout', fouten.length === 0, fouten.join(' | '));
  await ctx.close();
}

/* ── 4 · de gloed op de tweede toon ─────────────────────────────────────── */
console.log('\n4 · de gloed op de tweede toon');
{
  const { ctx, page, fouten } = await open('/nl/');
  const rust = await page.evaluate(() => [...document.querySelectorAll('.h-kop .l')].filter((e) => !e.closest('.h-proef, .h-lk-slot')).map((e) => getComputedStyle(e).color));
  ok('in rust staat de tweede toon in inkt, net als de eerste', rust.length >= 4 && rust.every((c) => c === 'rgb(11, 15, 23)'), rust.join(' '));
  await page.waitForTimeout(2500);
  ok('  zonder beweging van de bezoeker gloeit er niets', await page.evaluate(() => document.querySelectorAll('.is-gloeit').length === 0));
  await page.mouse.move(500, 500);
  const kwam = await page.waitForFunction(() => document.querySelectorAll('.h-kop .l.is-gloeit').length === 1, null, { timeout: 4000 }).then(() => true, () => false);
  const g = await page.evaluate(() => { const e = document.querySelector('.is-gloeit'); const a = e?.getAnimations()[0]; return { n: document.querySelectorAll('.is-gloeit').length, naam: a?.animationName, duur: a?.effect.getTiming().duration, keer: a?.effect.getTiming().iterations }; });
  ok('na de eerste beweging: één kop gloeit, één keer, korter dan 5 s (WCAG 2.2.2)', kwam && g.n === 1 && g.naam === 'h-gloed' && g.duur < 5000 && g.keer === 1, JSON.stringify(g));
  ok('  geen scriptfout', fouten.length === 0, fouten.join(' | '));
  await ctx.close();
  const stil = await open('/nl/', { stil: true });
  await stil.page.mouse.move(500, 500);
  await stil.page.waitForTimeout(2500);
  ok('minder beweging: geen gloed', await stil.page.evaluate(() => document.querySelectorAll('.is-gloeit').length === 0));
  await stil.ctx.close();
}

/* ── 5 · zonder effect ───────────────────────────────────────────────────── */
console.log('\n5 · zonder scrolleffect');
for (const [naam, opt] of [['telefoon (390)', { breed: 390, hoog: 844 }], ['telefoon (320)', { breed: 320, hoog: 640 }], ['minder beweging (1440)', { stil: true }]]) {
  const { ctx, page, fouten } = await open('/nl/', opt);
  const r = await page.evaluate(() => {
    const t = document.querySelector('[data-t-tablet]').getBoundingClientRect(), m = document.querySelector('#maken').getBoundingClientRect(), p = document.querySelector('[data-t-podium]').getBoundingClientRect();
    return { aan: document.documentElement.classList.contains('t-aan'), onder: m.top >= p.bottom - 1, zijwaarts: document.documentElement.scrollWidth > innerWidth, ratio: t.width / t.height, breed: t.width, vw: innerWidth };
  });
  ok(`${naam}: geen effect, Wat we maken onder de tablet, niet zijwaarts`, !r.aan && r.onder && !r.zijwaarts, JSON.stringify(r));
  if (!opt.stil) ok(`  de tablet 4 : 3 over de breedte`, dicht(r.ratio, 4 / 3, 0.01) && dicht(r.breed, r.vw - 32, 1), JSON.stringify(r));
  ok('  geen scriptfout', fouten.length === 0, fouten.join(' | '));
  await ctx.close();
}
{
  const { ctx, page, fouten } = await open('/nl/');
  await naar(page, 400);
  await page.setViewportSize({ width: 800, height: 900 });
  await page.waitForTimeout(500);
  const r = await page.evaluate(() => ({ aan: document.documentElement.classList.contains('t-aan'), vlieg: document.querySelector('[data-t-vlieg]').hidden, doel: document.querySelector('[data-t-doel]').style.opacity, tablet: document.querySelector('[data-t-tablet]').style.cssText, tekst: getComputedStyle(document.querySelector('[data-t-tekst]')).visibility, plek: getComputedStyle(document.querySelector('[data-t-plek]')).visibility, zijwaarts: document.documentElement.scrollWidth > innerWidth }));
  ok('een smaller venster midden in de vlucht: het effect gaat uit en laat niets achter (ook de kop en de zin weer zichtbaar)', !r.aan && r.vlieg && r.doel === '' && r.tablet === '' && r.tekst === 'visible' && r.plek === 'visible' && !r.zijwaarts, JSON.stringify(r));
  ok('  geen scriptfout', fouten.length === 0, fouten.join(' | '));
  await ctx.close();
}

/* review 78: op een laptop viel de zin onder het scherm, en op 901 – 1100 px liep het beeld over de tekst */
console.log('\n6 · laptops en smalle vensters');
for (const [breed, hoog] of [[1366, 657], [1280, 700], [1440, 790], [1536, 730], [1280, 600], [1024, 768]]) {
  for (const pad of ['/nl/', '/']) {
    const { ctx, page, fouten } = await open(pad, { breed, hoog });
    const r = await page.evaluate(() => { const l = document.querySelector('.t-lede'), lr = l.getBoundingClientRect(); const lh = parseFloat(getComputedStyle(l).lineHeight); const onder = ['.t-lede', '.t-stand', '[data-t-pauze]'].map((s) => document.querySelector(s).getBoundingClientRect().bottom); return { regels: Math.round(lr.height / lh), onder: Math.round(Math.max(...onder)), vh: innerHeight }; });
    ok(`${breed} × ${hoog} ${pad}: de zin in twee regels, de zin, de standen en de pauzeknop in het eerste scherm`, r.regels <= 2 && r.onder <= r.vh && fouten.length === 0, JSON.stringify(r));
    await ctx.close();
  }
}
for (const [breed, hoog] of [[901, 900], [1024, 1366]]) {
  const { ctx, page } = await open('/nl/', { breed, hoog, stil: true });
  const r = await page.evaluate(() => { const q = (s) => document.querySelector(s).getBoundingClientRect(); const b = q('.v-maken-beeld'), t = q('#h-maken'), vl = q('.v-looks-beeld'), pod = q('.v-looks-podium'), lt = q('.v-looks-tekst'); return { beeld: Math.round(b.right), kop: Math.round(t.left), podIn: pod.left >= vl.left - 1 && pod.right <= vl.right + 1, looksTekst: Math.round(lt.right), vlak: Math.round(vl.left) }; });
  ok(`${breed} × ${hoog}: het beeld van Wat we maken naast de tekst, het beeld van de looks binnen zijn vlak`, r.beeld < r.kop && r.podIn && r.looksTekst < r.vlak, JSON.stringify(r));
  await ctx.close();
}

await browser.close();
server.close();
console.log(`\n${goed}/${goed + fout} geslaagd`);
process.exit(fout ? 1 : 0);
