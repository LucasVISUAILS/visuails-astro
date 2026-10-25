/**
 * VISUAILS — de laptop in de opening, als kant-en-klare standen
 *   node tests/laptop-standen.test.mjs        (na `npm run build`)
 * ══════════════════════════════════════════════════════════════════════════════
 * WAAROM DEZE TOETS BESTAAT — 15 OKTOBER 2026
 * ══════════════════════════════════════════════════════════════════════════════
 * Lucas, 08:12: *"De laptop animatie op de beginpagina sectie is nog steeds heel
 * erg buggy en bij elke volgende foto in de reeks loopt hij ontzettend vast en
 * stotterd de foto nogal (…) gebeurt overigens op pc en telefoon. Dit moet echt
 * gefixt worden."* Op zijn telefoon werd het scherm wit.
 *
 * Oorzaak: een nagebouwd scherm in 3D met maskers, dat bij elke wissel opnieuw
 * getekend moest worden. Nu staat elke stand er als foto (src/data/halStanden.js,
 * gemaakt met scripts/laptop-standen.mjs). Gemeten met CPU 4× trager: frames
 * boven 50 ms van 58 naar 8 op 1440 px en van 26 naar 0 op een telefoon.
 *
 * 08:14: de catalogbeelden op hun eigen 1:1. 08:12: in stap 2 viel de broek op de
 * telefoon deels achter het lijstje. 08:30: "with the pen" en "by hand" weg, één
 * zin in de uitleg.
 *
 * Deze toets bewaakt:
 *   1. elke stand ligt er, in elke breedte, op de maat van de foto, met AVIF;
 *   2. de foto's horen bij de bron (de vingerafdruk), anders: draai het script;
 *   3. de bron bestaat niet op de site (geen /laptop-bron/ in dist);
 *   4. de live laptop heeft geen 3D, geen masker en geen geforceerd opmeten;
 *   5. in de browser: de wissel werkt, en in stap 2 raken broek en lijstje elkaar
 *      niet, van 320 tot 1440 px.
 */
import http from 'node:http';
import { metVisIn } from './lib/vis-in.mjs';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { alleStanden, standNaam, STAND_BREEDTES } from '../src/data/halStanden.js';
import { vingerafdruk, BRON_JSON } from '../scripts/lib/laptopbron.mjs';
import { FOTO } from '../src/data/halLaptop.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const MAP = path.join(ROOT, 'public', 'img', 'hal', 'stand');
let pass = 0, fail = 0;
function ok(naam, cond, extra = '') {
  if (cond) pass++; else fail++;
  console.log(`${cond ? ' ok  ' : ' FAIL'} ${naam}${cond || !extra ? '' : ` — ${extra}`}`);
}
const lees = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
process.chdir(ROOT);

console.log('\nVISUAILS — de laptopstanden\n');

/* ── 1 · DE FOTO'S ─────────────────────────────────────────────────────────── */
console.log('1 · elke stand als foto');
const verwacht = [];
for (const lang of ['nl', 'en']) for (const s of alleStanden(lang)) for (const w of STAND_BREEDTES) verwacht.push(`${standNaam(lang, s)}-${w}`);
const mist = verwacht.filter((n) => !fs.existsSync(path.join(MAP, `${n}.webp`)));
ok(`alle ${verwacht.length} standen liggen er als webp (2 talen × ${verwacht.length / 2 / STAND_BREEDTES.length} standen × ${STAND_BREEDTES.length} breedtes)`, mist.length === 0, mist.slice(0, 5).join(', '));
const zonderAvif = verwacht.filter((n) => fs.existsSync(path.join(MAP, `${n}.webp`)) && !fs.existsSync(path.join(MAP, `${n}.avif`)));
ok('  en elk met een AVIF ernaast (anders laat de bouw de <source> weg)', zonderAvif.length === 0, zonderAvif.slice(0, 5).join(', '));
const verkeerd = [];
for (const n of verwacht.filter((x) => fs.existsSync(path.join(MAP, `${x}.webp`)))) {
  const w = Number(n.split('-').pop());
  const m = await sharp(path.join(MAP, `${n}.webp`)).metadata();
  if (m.width !== w || m.height !== Math.round((w * FOTO.h) / FOTO.w)) verkeerd.push(`${n}: ${m.width}×${m.height}`);
}
ok(`  elke foto heeft de verhouding van de laptopfoto (${FOTO.w} × ${FOTO.h}) en zijn eigen breedte`, verkeerd.length === 0, verkeerd.slice(0, 3).join(', '));
const los = fs.readdirSync(MAP).filter((f) => !verwacht.includes(f.replace(/\.(webp|avif)$/, '')));
ok('  er liggen geen standen die niet meer in de reeks zitten', los.length === 0, los.join(', '));
const afdrukken = alleStanden('nl').filter((s) => s.set === 'catalog').map((s) => crypto.createHash('md5').update(fs.readFileSync(path.join(MAP, `${standNaam('nl', s)}-1000.webp`))).digest('hex'));
ok('  de vier catalogstanden zijn vier verschillende foto\'s', new Set(afdrukken).size === afdrukken.length && afdrukken.length === 4, String(afdrukken.length));

/* ── 2 · HOREN DE FOTO'S BIJ DE BRON? ───────────────────────────────────────── */
console.log('\n2 · de foto\'s horen bij de bron');
const bron = JSON.parse(fs.readFileSync(path.join(ROOT, BRON_JSON), 'utf8'));
const nu = await vingerafdruk(ROOT);
ok(`de schermen zijn niet veranderd sinds de foto's (${bron.vingerafdruk}); anders: npm run laptop-standen`, bron.vingerafdruk === nu, `nu ${nu}`);

/* ── 3 · DE BRON STAAT NIET OP DE SITE ──────────────────────────────────────── */
console.log('\n3 · de bron is geen pagina van de site');
ok('dist/laptop-bron/ bestaat niet', !fs.existsSync(path.join(DIST, 'laptop-bron')));
ok('  getStaticPaths geeft alleen iets met LAPTOP_BRON=1', /if \(process\.env\.LAPTOP_BRON !== '1'\) return \[\];/.test(lees('src/pages/laptop-bron/[lang].astro')));

/* ── 4 · DE LIVE LAPTOP ─────────────────────────────────────────────────────── */
console.log('\n4 · de laptop op de site');
const comp = lees('src/components/HalLaptop.astro');
const code = comp.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
ok('HalLaptop.astro: geen matrix3d, geen laag met schermen', !/matrix3d|hl-laag|hl-scherm/.test(code));
ok('  geen `offsetWidth` om iets opnieuw te laten beginnen (dwingt opmeten af)', !/offsetWidth/.test(code));
ok('  en de naam krijgt niet de klasse van het wisselwoord (h-wissel maakte hem violet)', !/classList\.(add|remove)\('h-wissel'\)/.test(code));
const css = lees('src/styles/hal.css');
ok('hal.css: een stand is pas in de opmaak als hij klaar is, en alleen is-nu is zichtbaar', css.includes('.hal .hl-stand { position: absolute; inset: 0; width: 100%; height: 100%; display: none; opacity: 0;') && css.includes('.hal .hl-stand.is-klaar { display: block; }') && css.includes('.hal .hl-stand.is-nu { opacity: 1; }'));
ok('  de catalogbeelden staan in een vierkant vak, op hun eigen 1:1 (08:14)', /\.hal \.sc-hoofd \{[^}]*width: 860px; height: 860px;/.test(css) && /\.hal \.sc-hoofd img \{[^}]*inset: 0; width: 100%; height: 100%; object-fit: cover;/.test(css));
for (const [pagina, aantal] of [['index.html', alleStanden('en').length], ['nl/index.html', alleStanden('nl').length], ['catalog/index.html', alleStanden('en', ['catalog']).length], ['nl/lifestyle/index.html', alleStanden('nl', ['lifestyle']).length]]) {
  const h = fs.readFileSync(path.join(DIST, pagina), 'utf8');
  const doos = h.slice(h.indexOf('data-hl-doos'), h.indexOf('hl-bel hl-bel-lap'));
  const imgs = [...doos.matchAll(/<img[^>]*data-hl-stand="(\d+)"[^>]*>/g)].map((m) => m[0]);
  ok(`${pagina}: ${aantal} standen`, imgs.length === aantal, String(imgs.length));
  ok(`  de eerste staat er meteen (is-nu, eager, voorrang), de rest wacht (lazy)`, /is-nu is-klaar/.test(imgs[0] || '') && /loading="eager"/.test(imgs[0] || '') && /fetchpriority="high"/.test(imgs[0] || '') && imgs.slice(1).every((i) => /loading="lazy"/.test(i) && !/is-klaar/.test(i)));
  ok('  elke stand met een AVIF-bron, en op een telefoon hooguit de foto van 1600', (doos.match(/<source type="image\/avif"/g) || []).length === aantal && imgs.every((i) => i.includes('sizes="(max-width: 900px) 120vw, (max-width: 1503px) 93vw, 1400px"')));
  ok('  geen 3D en geen masker meer in de pagina', !/matrix3d|masker-laptop|masker-fon/.test(h));
}

/* ── 5 · IN DE BROWSER ──────────────────────────────────────────────────────── */
console.log('\n5 · in de browser');
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.webp': 'image/webp', '.avif': 'image/avif', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.json': 'application/json', '.jpg': 'image/jpeg' };
const server = http.createServer((q, r) => {
  let p = decodeURIComponent(new URL(q.url, 'http://x').pathname);
  let f = path.join(DIST, p);
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(r);
});
await new Promise((r) => server.listen(0, r));
const PORT = server.address().port;
const { chromium } = await import('playwright');
const EXE = '/opt/pw-browsers/chromium';
const browser = metVisIn(await chromium.launch(fs.existsSync(EXE) ? { executablePath: EXE } : {}));
const KEUZE = { name: 'vis_consent', value: encodeURIComponent(JSON.stringify({ version: 1, analytics: false, at: '2026-10-15T00:00:00.000Z' })), domain: 'localhost', path: '/' };
async function open(url, breed, hoog = 900) {
  const ctx = await browser.newContext({ viewport: { width: breed, height: hoog } });
  await ctx.addCookies([KEUZE]).catch(() => {});
  const page = await ctx.newPage();
  const fouten = [];
  page.on('pageerror', (e) => fouten.push(String(e).slice(0, 200)));
  await page.route('**/account/me**', (r) => r.fulfill({ status: 401, contentType: 'application/json', body: 'null' }));
  await page.route('**/api/**', (r) => r.fulfill({ status: 204, body: '' }));
  await page.route(/^https?:\/\/(?!localhost)/, (r) => r.abort());
  await page.goto(`http://localhost:${PORT}${url}`, { waitUntil: 'load' });
  return { ctx, page, fouten };
}

{
  const { ctx, page, fouten } = await open('/nl/', 1440);
  await page.waitForTimeout(800);
  const voor = await page.evaluate(() => ({ nu: [...document.querySelectorAll('[data-hl-stand]')].findIndex((f) => f.classList.contains('is-nu')), naam: document.querySelector('[data-hl-naam]').textContent }));
  await page.click('[data-hl-stap="1"]');
  await page.waitForFunction((v) => [...document.querySelectorAll('[data-hl-stand]')].findIndex((f) => f.classList.contains('is-nu')) !== v, voor.nu, { timeout: 8000 }).catch(() => {});
  const na = await page.evaluate(() => {
    const f = [...document.querySelectorAll('[data-hl-stand]')];
    const n = f.findIndex((x) => x.classList.contains('is-nu'));
    return { nu: n, geladen: f[n].complete && f[n].naturalWidth > 0, zichtbaar: getComputedStyle(f[n]).display !== 'none', teller: document.querySelector('[data-hl-teller]').textContent, naamKlasse: document.querySelector('[data-hl-naam]').className };
  });
  ok('een klik op verder: de volgende foto is geladen, in de opmaak en zichtbaar', na.nu === (voor.nu + 1) % 9 && na.geladen && na.zichtbaar, JSON.stringify(na));
  ok('  de teller loopt mee, en de naam blijft gewoon inkt (geen h-wissel)', na.teller === `${na.nu + 1} / 9` && !/h-wissel/.test(na.naamKlasse), JSON.stringify(na));
  ok('  geen scriptfout', fouten.length === 0, fouten.join(' | '));
  await ctx.close();
}

/* Stap 2: de rechterpijp (op 569 van 760 in het beeld) en de linkerrand van het
   lijstje, op telefoonbreedtes en op de drie kolommen van 1024. */
for (const lang of ['nl', 'en']) for (const breed of [320, 360, 390, 430, 1024, 1440]) {
  const { ctx, page, fouten } = await open(lang === 'nl' ? '/nl/' : '/', breed);
  await page.evaluate(() => document.querySelector('#hoe')?.scrollIntoView());
  await page.waitForTimeout(250);
  await page.evaluate(() => document.querySelector('#hoe')?._u?.stop());
  await page.waitForTimeout(200);
  const r = await page.evaluate(() => {
    const v = document.querySelector('#hoe .h-maak-vlak').getBoundingClientRect();
    const l = document.querySelector('#hoe .h-lagen').getBoundingClientRect();
    const f = document.querySelector('#hoe .h-maak').getBoundingClientRect();
    const s = Math.min(v.width, v.height); const x0 = v.left + (v.width - s) / 2;
    return { gat: Math.round(l.left - (x0 + (s * 569) / 760)), binnen: l.right <= f.right + 0.5 && l.bottom <= f.bottom + 0.5 && l.top >= f.top - 0.5, onder: [...document.querySelectorAll('#hoe .h-lagen li')].map((li) => li.textContent.trim()).join(' | ') };
  });
  ok(`${lang} ${breed}px: stap 2, ${r.gat} px tussen de pijp en het lijstje, en het lijstje staat in het vak`, r.gat >= 8 && r.binnen, JSON.stringify(r));
  if (breed === 390) ok(`${lang}:   geen "met de pen" of "met de hand" meer in het lijstje (08:30)`, !/met de pen|met de hand|with the pen|by hand/i.test(r.onder), r.onder);
  if (fouten.length) ok(`${lang} ${breed}px: geen scriptfout`, false, fouten.join(' | '));
  await ctx.close();
}
const voorpagina = fs.readFileSync(path.join(DIST, 'nl/index.html'), 'utf8');
ok('NL: de uitleg van stap 2 is één zin over nakijken en afwerken (08:30)', voorpagina.includes('Elk beeld kijken we zorgvuldig na en werken we met de hand af, zodat je hele set dezelfde professionele uitstraling heeft: als een fotostudio, maar sneller, en jij houdt tijd over voor je merk.'));
ok('EN: idem', fs.readFileSync(path.join(DIST, 'index.html'), 'utf8').includes('We check every image carefully and finish it by hand, so your whole set has the same professional look: like a photo studio, only faster, and you keep your time for your brand.'));

await browser.close();
server.close();
console.log(`\n${pass}/${pass + fail} geslaagd`);
process.exit(fail ? 1 : 0);
