/**
 * VISUAILS — de opening met de scrollvideo en Hoe het werkt (levering 74, 25 oktober 2026;
 * bijgewerkt voor levering 75: de nieuwe indeling, de standen terug, de weg in elkaar geschoven).
 *
 *   node tests/opening-74.test.mjs        (npm run test:opening74; draai eerst de build)
 *
 * Wat hier vastligt (HalOpening.astro, opening.css, VoorpaginaHal.astro):
 *   1 · de beeldreeks: beeld 17 – 133 als AVIF, de still in drie maten, en per beeld de hoeken
 *       van de schermen (src/data/openingSchermen.json);
 *   2 · de pagina: #hoe is de wortel van de uitleg met de tijden van de drie stappen, drie tabs
 *       op één paneel, en per dienst een eigen verhaal (Lucas, 16:28): catalog stuurt, wij
 *       maken (in blok 02 de lagen uit elkaar, het product "gemaakt met AI"), keurt goed;
 *       lifestyle en video kiezen een look, uploaden de foto's van het product, ontvangen.
 *       Nergens "telefoonfoto's" ("een aanname dat de klant alleen met zijn telefoon foto's
 *       maakt");
 *   3 · in de browser, 1440 × 900: niets beweegt bij het laden; aan het eind van de scroll staat
 *       Hoe het werkt helemaal in beeld; de tabs wisselen de dienst (ook met de pijltjes); in stap
 *       02 van catalog staan de lagen even in 3D met de gloed en "Gemaakt met AI", na de uitleg is
 *       het weer vlak (16:40, 16:57); de stroom: één wieltik, één sectie (16:56);
 *   (25 oktober, later: de lagen zonder lijstje en zonder "met de hand", geen tekst onder de
 *       stappen, de maat van stap 02 12,9 s; zie kladblok/LEVERING-74.md)
 *   4 · zonder scrollvideo: de telefoon (390) en minder beweging zetten alles onder elkaar,
 *       zonder zijwaarts scrollen;
 *   5 · geen scriptfouten.
 */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { buildStaat } from './lib/build.mjs';
import { browserPad } from '../scripts/lib/browserpad.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
let goed = 0, fout = 0;
const ok = (naam, cond, extra = '') => { if (cond) goed++; else fout++; console.log(`${cond ? ' ok  ' : ' FAIL'} ${naam}${cond || !extra ? '' : ` — ${extra}`}`); };

const staat = buildStaat(new URL('../dist/index.html', import.meta.url));
if (!staat.er || staat.oud) { console.log(`geen bruikbare build — ${staat.uitleg}`); process.exit(1); }

/* ── 1 · de beeldreeks ───────────────────────────────────────────────────── */
console.log('\n1 · de beeldreeks');
const Q = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/openingSchermen.json'), 'utf8'));
const MAP = path.join(ROOT, 'public/img/hal/opening');
const mist = [];
for (let i = Q.eerste; i <= Q.laatste; i++) if (!fs.existsSync(path.join(MAP, 'f', `${String(i).padStart(3, '0')}.avif`))) mist.push(i);
ok(`beeld ${Q.eerste} tot en met ${Q.laatste} liggen er als AVIF`, Q.eerste === 17 && Q.laatste === 133 && mist.length === 0, mist.slice(0, 5).join(', '));
const totaal = fs.readdirSync(path.join(MAP, 'f')).reduce((s, f) => s + fs.statSync(path.join(MAP, 'f', f)).size, 0);
/* 25 oktober 2026: een beeld dat Claude aflevert, krijgt onderweg "content credentials" (C2PA) mee:
   een uuid-blok van ongeveer 6 kB met wie het bestand leverde. Dat blok blijft erin. De grens geldt
   daarom voor de beelddata zelf (alles behalve uuid-blokken), en het geheel mag 2 MB zijn. */
const zonderUuid = (f) => {
  const b = fs.readFileSync(f); let i = 0, uuid = 0;
  while (i + 8 <= b.length) { const n = b.readUInt32BE(i); if (n < 8) break; if (b.toString('latin1', i + 4, i + 8) === 'uuid') uuid += n; i += n; }
  return b.length - uuid;
};
const data = fs.readdirSync(path.join(MAP, 'f')).reduce((s, f) => s + zonderUuid(path.join(MAP, 'f', f)), 0);
ok(`  de beelddata samen hooguit 1,6 MB (${(data / 1048576).toFixed(2)} MB; met credentials ${(totaal / 1048576).toFixed(2)} MB, hooguit 2)`, data <= 1.6 * 1048576 && totaal <= 2 * 1048576);
ok('de still in 1800, 2700 en 3600, als AVIF en WebP', [1800, 2700, 3600].every((w) => ['avif', 'webp'].every((x) => fs.existsSync(path.join(MAP, `still-${w}.${x}`)))));
ok('  de oude maten (1200, 1600, 2400) zijn weg', [1200, 1600, 2400].every((w) => !fs.existsSync(path.join(MAP, `still-${w}.webp`))));
ok('de schermen: laptop in twee talen en de telefoon', ['scherm-nl-laptop', 'scherm-en-laptop', 'scherm-telefoon'].every((n) => fs.existsSync(path.join(MAP, `${n}.avif`))));
ok('per beeld de hoeken van de schermen en de donkerte van de klep', Q.w === 2352 && Q.h === 903 && Q.b.length === Q.laatste + 1 && Q.d.length === Q.laatste + 1 && Q.d.every((d) => d >= 0 && d <= 1));
/* levering 75: het hele videobeeld met de armen doorgetrokken; de kern is het videobeeld zelf */
ok('  de kern (het videobeeld zelf) en de onderkant van de hand staan erbij', Q.kern && Q.kern.w > 1000 && Q.kern.x + Q.kern.w <= Q.w && Q.hand > 400 && Q.hand < Q.kern.h, JSON.stringify(Q.kern));
/* levering 75 (23:35): "de mogelijkheden van de laptop en het wisselen van scherm … ik wil dit terug" */
for (const taal of ['nl', 'en']) {
  const lap = fs.readdirSync(path.join(MAP, 'scherm')).filter((f) => new RegExp(`^${taal}-(catalog|lifestyle|video)-\\d+\\.webp$`).test(f));
  ok(`  ${taal}: een laptopscherm per stand (de webshop, het Instagram-bericht, de clip)`, lap.length >= 9 && ['catalog', 'lifestyle', 'video'].every((d) => lap.some((f) => f.includes(`-${d}-`))), lap.join(' '));
  ok(`  ${taal}:   en elk scherm is anders`, new Set(lap.map((f) => fs.readFileSync(path.join(MAP, 'scherm', f)).toString('base64').slice(-4000))).size === lap.length);
}

/* ── 2 · de pagina ───────────────────────────────────────────────────────── */
console.log('\n2 · de pagina');
for (const [pad, taal] of [['index.html', 'en'], ['nl/index.html', 'nl']]) {
  const h = fs.readFileSync(path.join(DIST, pad), 'utf8');
  const hoe = (/<section class="o-hoe h-hoe" id="hoe"[^>]*>/.exec(h) || [''])[0];
  ok(`${taal}: #hoe is de wortel van de uitleg, met de tijden van de drie stappen`, /data-uitleg\b/.test(hoe) && hoe.includes('data-uitleg-maat="2250 5200 2250"') && hoe.includes('data-dienst="catalog"'), hoe);
  const tabs = [...h.matchAll(/<button type="button" role="tab" id="o-tab-(\w+)"[^>]*>/g)];
  ok(`${taal}:   drie tabs (catalog, lifestyle, video) op één paneel`, tabs.map((m) => m[1]).join() === 'catalog,lifestyle,video' && tabs.every((m) => m[0].includes('aria-controls="o-blokken"')) && /<div class="o-blokken" id="o-blokken" role="tabpanel" aria-labelledby="o-tab-catalog"/.test(h));
  ok(`${taal}:   de eerste tab gekozen, de andere met tabindex -1`, /id="o-tab-catalog"[^>]*aria-selected="true"[^>]*tabindex="0"/.test(h) && /id="o-tab-video"[^>]*aria-selected="false"[^>]*tabindex="-1"/.test(h));
  const blokken = h.slice(h.indexOf('id="o-blokken"'), h.indexOf('class="o-voet"'));
  ok(`${taal}:   de drie stappen in het paneel, met hun animaties`, (blokken.match(/<li class="h-stap h-in[^"]*"/g) || []).length === 3 && blokken.includes('h-stuur-lijst') && blokken.includes('o-ont-stapel') && !blokken.includes('h-maak') && blokken.includes('h-keur-rij'));
  for (const d of ['catalog', 'lifestyle', 'video']) {
    const v = (blokken.match(new RegExp(`data-v="${d}"`, 'g')) || []).length;
    ok(`${taal}:   ${d}: een variant in blok 02 en in blok 03`, v >= 2, String(v));
  }
  const ontleed = [...blokken.matchAll(/<figure class="h-well o-ontleed" data-v="(\w+)"[\s\S]*?<\/figure>/g)];
  /* 16:57: geen lagenlijst en geen "met de hand"-labels meer, alleen "Gemaakt met AI" bij de gloed */
  ok(`${taal}:   catalog: in blok 02 de drie lagen, zonder lijstje, alleen bij catalog`, ontleed.length === 1 && ontleed[0][1] === 'catalog' && (ontleed[0][0].match(/class="o-ont-laag/g) || []).length === 3 && !/<li[ >]/.test(ontleed[0][0]));
  const namen = (d) => [...blokken.matchAll(new RegExp(`<h3 class="h-stap-naam"[^>]*>[\\s\\S]*?<span data-v="${d}"[^>]*>([^<]+)<`, 'g'))].map((m) => m[1]);
  ok(`${taal}:   lifestyle: kies je look, upload je foto's, ontvang je beelden`, namen('lifestyle').join(' | ') === (taal === 'nl' ? 'Kies je look | Upload je foto’s | Ontvang je beelden' : 'Pick your look | Upload your photos | Get your images'), namen('lifestyle').join(' | '));
  ok(`${taal}:   video: dezelfde stappen, de voorbeelden volgen binnenkort`, namen('video').length === 3 && /o-binnenkort/.test(blokken) && /(Voorbeeldclips volgen binnenkort|Example clips coming soon)/.test(blokken));
  ok(`${taal}:   lifestyle: de look die in stap 1 gekozen wordt, komt in stap 3 terug (Flash)`, /<li class="is-gekozen[^"]*"[^>]*>[\s\S]*?<b>Flash<\/b>/.test(blokken) && /(4 beelden in Flash|4 images in Flash)/.test(blokken));
  /* in de tekst die je leest; de alt-tekst van de voorbeeldfoto's beschrijft die foto's zelf (voorbeeldset.js) */
  ok(`${taal}:   nergens "telefoonfoto's" in de tekst van Hoe het werkt`, !/telefoonfoto|phone photo/i.test(h.slice(h.indexOf('id="hoe"'), h.indexOf('class="o-acties"')).replace(/\salt="[^"]*"/g, '')));
  ok(`${taal}:   catalog: het product is de gekozen laag, met "${taal === 'nl' ? 'Gemaakt met AI' : 'Made with AI'}" eronder`, /class="o-ont-laag o-ont-los is-gekozen/.test(ontleed[0]?.[0] || '') && /<span class="o-ont-ai">(Gemaakt met AI|Made with AI)<\/span>/.test(ontleed[0]?.[0] || ''));
  /* 16:57: "wees hier voortaan streng op" — in wat je op de voorpagina leest (de FAQ-antwoorden in
     de gestructureerde data tellen niet: dat is de FAQ zelf) */
  const lees = h.replace(/<script[\s\S]*?<\/script>/g, '').replace(/\salt="[^"]*"/g, '');
  ok(`${taal}:   nergens "met de hand" of "handwerk" op de voorpagina`, !/met de hand|handwerk|handmatig|by hand|handwork/i.test(lees));
  /* 16:56: "De teksten mogen weg onder de stappen … dit soort onnodige tekst, ook op andere plekken
     op de homepage kunnen weg" */
  ok(`${taal}:   geen regel tekst onder de stappen, geen zin in de kaarten van Wat we maken`, !/class="h-stap-regel/.test(blokken) && !/class="h-dk-zin/.test(h));
  /* levering 76 (Lucas, 12:29): "De format sectie mag wel subtiel/klein toegevoegd worden aan how it
     works animatie": geen eigen sectie meer, de formaten klein in stap 3 (catalog 1:1 · 4:5 · 3:4,
     lifestyle 4:5 · 9:16 · 16:9), met de zin voor een schermlezer */
  const fmtRij = (h.match(/<span class="o-fmt h-glas" aria-hidden="true">([\s\S]*?)<\/span>/g) || []).map((x) => x.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
  ok(`${taal}:   Formaten: geen eigen sectie meer, klein in stap 3 (${fmtRij.join(' | ')})`, !/class="h-sec h-fmt/.test(h) && fmtRij.length === 2 && fmtRij[0] === '1:1 4:5 3:4' && fmtRij[1] === '4:5 9:16 16:9' && (h.match(/(In het formaat dat jij kiest|In the format you choose): /g) || []).length === 2, fmtRij.join(' | '));
  ok(`${taal}: de kop één h1 met de hele zin als naam, het accentwoord twee keer verborgen`, (h.match(/<h1\b/g) || []).length === 1 && /<h1 id="h-h1" class="o-kop"[^>]*aria-label="[^"]+"/.test(h) && /class="o-acc" data-o-acc aria-hidden="true"/.test(h));
  const stand = (/<div class="o-stand"[\s\S]*?<\/div>/.exec(h) || [''])[0];
  ok(`${taal}: de standen: naam en teller, de streep, vorige en volgende, pauze`, /data-o-naam>/.test(stand) && /data-o-teller>1 \/ 9</.test(stand) && /data-o-streep/.test(stand) && (stand.match(/data-o-stap="-?1"/g) || []).length === 2 && /data-o-pauze aria-pressed="false"/.test(stand), stand.slice(0, 300));
  const sj = JSON.parse((/<script type="application\/json" data-o-standen>([\s\S]*?)<\/script>/.exec(h) || [, '{}'])[1]);
  ok(`${taal}:   negen standen, elk met een laptop- en een telefoonscherm dat bestaat`, sj.standen?.length === 9 && sj.standen.every((x) => fs.existsSync(path.join(ROOT, 'public', `${x.lap}.webp`)) && fs.existsSync(path.join(ROOT, 'public', `${x.tel}.webp`))), JSON.stringify(sj).slice(0, 200));
  ok(`${taal}: de still in drie maten, de grootste 3600 breed`, /<img class="o-still"[^>]*width="3600"/.test(h) && /still-1800\.webp 1800w, \/img\/hal\/opening\/still-2700\.webp 2700w, \/img\/hal\/opening\/still-3600\.webp 3600w/.test(h));
  ok(`${taal}: de uitlegbalk en de knoppen onder de blokken`, /class="o-voet" data-o-voet>\s*<div class="u-balk"/.test(h) && /class="o-acties">\s*<p class="h-acties">/.test(h));
}

/* ── 3, 4, 5 · in de browser ─────────────────────────────────────────────── */
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
const KEUZE = { name: 'vis_consent', value: encodeURIComponent(JSON.stringify({ version: 1, analytics: false, at: '2026-10-25T00:00:00.000Z' })), url: BASIS };
async function open(pad, { breed = 1440, hoog = 900, stil = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width: breed, height: hoog }, reducedMotion: stil ? 'reduce' : 'no-preference' });
  await ctx.addCookies([KEUZE]);
  const page = await ctx.newPage();
  const fouten = [];
  page.on('pageerror', (e) => fouten.push(String(e).slice(0, 200)));
  await page.route('**/account/me**', (r) => r.fulfill({ status: 401, contentType: 'application/json', body: 'null' }));
  await page.route('**/api/**', (r) => r.fulfill({ status: 204, body: '' }));
  await page.goto(BASIS + pad, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);
  return { ctx, page, fouten };
}
const naar = async (page, y) => { await page.evaluate((y) => { document.documentElement.classList.remove('o-klik'); window.scrollTo(0, y); }, y); await page.waitForTimeout(400); };

console.log('\n3 · in de browser, 1440 × 900');
{
  const { ctx, page, fouten } = await open('/nl/');
  const rust = await page.evaluate(() => ({
    aan: document.body.classList.contains('o-aan'),
    podium: document.querySelector('[data-o-podium]').offsetHeight,
    ademt: document.querySelector('[data-o-podium]').classList.contains('o-ademt'),
    kop: (() => { const r = document.querySelector('[data-o-kop]').getBoundingClientRect(); return r.bottom <= innerHeight && r.top >= 0; })(),
    lede: document.querySelector('[data-o-lede]').getBoundingClientRect().bottom <= innerHeight,
    doek: getComputedStyle(document.querySelector('[data-o-doek]')).visibility,
  }));
  ok('in rust: de scrollvideo staat aan en het podium is 3 schermhoogtes', rust.aan && Math.abs(rust.podium - 900 * 3) < 2, JSON.stringify(rust));
  /* levering 75 (23:35): "de foto groot maar wel gecentreerd, goed in verhouding en niet dat het
     het hele beeld vult en zet de kop eronder"; de kop links op de rand van de laptop */
  const maat = await page.evaluate(() => {
    const r = (s) => document.querySelector(s).getBoundingClientRect();
    const lap = r('[data-o-lap]'), fon = r('[data-o-fon]'), kop = r('[data-o-kop]'), beeld = r('[data-o-beeld]'), rij = r('[data-o-rij]');
    const Q = { w: beeld.width / 2352 };
    const fs = parseFloat(getComputedStyle(document.querySelector('[data-o-kop]')).fontSize);
    return { extra: Math.round(90 * Q.w), midden: Math.round((lap.left + fon.right) / 2), breed: Math.round(fon.right - lap.left), kopLinks: Math.round(kop.left), lapLinks: Math.round(lap.left), kopRechts: Math.round(kop.right), rijRechts: Math.round(rij.right), fonRechts: Math.round(fon.right),
      kopTop: Math.round(kop.top), handOnder: Math.round(beeld.top + 580.3 * Q.w), regels: Math.round(kop.height / (fs * 1.0)), fs, lapTop: Math.round(lap.top), balk: Math.round(document.querySelector('.site-header .nav').getBoundingClientRect().bottom) };
  });
  /* levering 76 (26 oktober): "Voor mijn gevoel is het nog krap": hoogstens 48 % (was 58 %), en
     lucht tussen de balk en de laptop en tussen de hand en de kop */
  ok('  de apparaten in het midden, op hoogstens 48 % van de breedte', Math.abs(maat.midden - 720) <= 4 && maat.breed <= 1440 * 0.48 + 2 && maat.breed >= 1440 * 0.36, JSON.stringify(maat));
  ok('  lucht onder de balk (28 – 120 px) en tussen de hand en de kop (minstens 24 px)', maat.lapTop - maat.balk >= 28 && maat.lapTop - maat.balk <= 120 && maat.kopTop >= maat.handOnder + 24, JSON.stringify(maat));
  /* tot net voorbij de telefoon (90 px van de reeks, nog in het wit vóór de rechterarm) */
  ok('  de kop op één regel, links op de rand van de laptop, tot net voorbij de telefoon', maat.regels === 1 && Math.abs(maat.kopLinks - maat.lapLinks) <= 3 && maat.kopRechts <= maat.rijRechts + 1 && Math.abs(maat.rijRechts - maat.fonRechts - maat.extra) <= 3 && maat.fs >= 40, JSON.stringify(maat));
  ok('  de kop en de zin staan in het eerste scherm', rust.kop && rust.lede, JSON.stringify(rust));
  ok('  niets beweegt bij het laden: de still staat er, het woord ademt nog niet', rust.doek === 'hidden' && !rust.ademt, JSON.stringify(rust));
  await page.mouse.move(400, 400);
  await page.waitForTimeout(200);
  ok('  na de eerste beweging ademt het woord', await page.evaluate(() => document.querySelector('[data-o-podium]').classList.contains('o-ademt')));
  /* de standen: een klik op volgende zet de tweede stand neer (pas als hij binnen is) */
  await page.click('[data-o-stap="1"]');
  const tweede = await page.waitForFunction(() => document.querySelector('[data-o-teller]').textContent === '2 / 9' && document.querySelector('[data-o-lap] .o-st.is-nu img')?.complete, null, { timeout: 8000 }).then(() => true, () => false);
  const st = await page.evaluate(() => ({ teller: document.querySelector('[data-o-teller]').textContent, nu: document.querySelectorAll('[data-o-lap] .o-st.is-nu').length, pauze: document.querySelector('[data-o-pauze]').getAttribute('aria-pressed'), loopt: document.querySelector('[data-o-podium]').classList.contains('o-loopt') }));
  ok('de standen: volgende zet de tweede stand neer, en daarna loopt het niet meer vanzelf', tweede && st.nu === 1 && st.pauze === 'true' && !st.loopt, JSON.stringify(st));
  await page.click('[data-o-stap="-1"]');
  await page.waitForTimeout(300);
  ok('  vorige gaat terug naar de eerste', await page.evaluate(() => document.querySelector('[data-o-teller]').textContent === '1 / 9'));
  await naar(page, 900 * 1.6 * 0.3);
  /* de reeks laadt pas na de still; onder last (de hele toetsreeks tegelijk) kan dat even duren */
  const doek = await page.waitForFunction(() => getComputedStyle(document.querySelector('[data-o-doek]')).visibility === 'visible', null, { timeout: 8000 }).then(() => true, () => false);
  ok('halverwege de video: het canvas toont de reeks', doek);
  /* levering 76: "de tekst weg word gesneden op een VISUAILS style manier tijdens dat de laptop ook
     verdwijnt en dan heel kort wit scherm dan komt de tekst op de nieuwe plek terecht met een
     soortgelijk effect en komen de elementen tevoorschijn" */
  await naar(page, 900 * 1.6 * 0.46);
  const snede = await page.evaluate(() => ({ kop: document.querySelector('[data-o-kop]').style.clipPath, lede: document.querySelector('[data-o-lede]').style.clipPath, mes: Number(getComputedStyle(document.querySelector('[data-o-mes]')).opacity), beeld: Number(getComputedStyle(document.querySelector('[data-o-beeld]')).opacity), titel: document.querySelector('#h-hoe').style.clipPath }));
  ok('terwijl de laptop weggaat: één snede op 53° door kop en zin, met het mes erbij', /^polygon\(/.test(snede.kop) && /^polygon\(/.test(snede.lede) && snede.mes > 0.5 && snede.beeld > 0.9 && /^inset\(0(px)? 100%/.test(snede.titel), JSON.stringify(snede));
  const hoek = await page.evaluate(() => { const m = /polygon\(([-\d.]+)px -48px.*?, ([-\d.]+)px calc\(100% \+ 48px\)\)/.exec(document.querySelector('[data-o-kop]').style.clipPath); const h = document.querySelector('[data-o-kop]').getBoundingClientRect().height + 96; return m ? (Number(m[1]) - Number(m[2])) / h : null; });
  ok('  de snede loopt 0,75 × de hoogte opzij (53,13°, de snede van de V)', hoek !== null && Math.abs(hoek - 0.75) < 0.01, String(hoek));
  await naar(page, 900 * 1.6 * 0.69);
  const wit = await page.evaluate(() => ({ beeld: Number(getComputedStyle(document.querySelector('[data-o-beeld]')).opacity), kop: document.querySelector('[data-o-kop]').style.clipPath, titel: document.querySelector('#h-hoe').style.clipPath, tabs: Number(getComputedStyle(document.querySelector('[data-o-tabs]')).opacity), standen: getComputedStyle(document.querySelector('[data-o-stand]')).visibility }));
  ok('  daarna even alleen wit: het beeld, de kop en Hoe het werkt zijn er geen van allen', wit.beeld < 0.02 && /100%\)$/.test(wit.kop) && /^inset\(0(px)? 100%/.test(wit.titel) && wit.tabs === 0 && wit.standen === 'hidden', JSON.stringify(wit));
  await naar(page, 900 * 1.6 * 0.745);
  const terug = await page.evaluate(() => ({ titel: document.querySelector('#h-hoe').style.clipPath, mes: Number(getComputedStyle(document.querySelector('[data-o-mes-in]')).opacity) }));
  ok('  dan legt dezelfde snede de kop van Hoe het werkt bloot', /^polygon\(/.test(terug.titel) && terug.mes > 0.3, JSON.stringify(terug));
  await naar(page, 900 * 1.6);
  await page.waitForTimeout(500);
  const land = await page.evaluate(() => {
    const hoe = document.querySelector('#hoe'), voet = hoe.querySelector('.o-voet').getBoundingClientRect();
    const blok = [...hoe.querySelectorAll('.h-stap')].map((e) => e.getBoundingClientRect());
    return {
      geland: document.body.classList.contains('o-geland'), binnen: document.body.classList.contains('o-binnen'),
      voetOnder: Math.round(voet.bottom), blokken: blok.length, opEenRij: blok.every((b) => Math.abs(b.top - blok[0].top) < 1),
      label: document.querySelector('[data-o-label]').textContent, kopWeg: /100%\)$/.test(document.querySelector('[data-o-kop]').style.clipPath),
      titel: document.querySelector('#h-hoe').style.clipPath === '' && document.querySelector('[data-o-pil]').style.clipPath === '',
      hoe: getComputedStyle(document.querySelector('[data-o-kopdeel]')).opacity,
      beeld: getComputedStyle(hoe).getPropertyValue('--o-beeld').trim(),
    };
  });
  ok('aan het eind: geland, en Hoe het werkt staat helemaal in beeld', land.geland && land.binnen && land.voetOnder <= 900, JSON.stringify(land));
  ok('  drie blokken naast elkaar, de beelden gemeten op de ruimte (180 – 300 px)', land.blokken === 3 && land.opEenRij && parseFloat(land.beeld) >= 180 && parseFloat(land.beeld) <= 300 && land.hoe === '1', JSON.stringify(land));
  ok('  het label is het accentwoord zonder punt, de kop is weg, de titel staat helemaal', land.label === 'Zonder shoot' && land.kopWeg && land.titel, JSON.stringify(land));
  await page.click('#o-tab-lifestyle');
  await page.waitForTimeout(300);
  const ls = await page.evaluate(() => ({ dienst: document.querySelector('#hoe').dataset.dienst, sel: document.querySelector('#o-tab-lifestyle').getAttribute('aria-selected'), paneel: document.querySelector('#o-blokken').getAttribute('aria-labelledby'), zicht: [...document.querySelectorAll('#hoe [data-v]')].filter((e) => getComputedStyle(e).display !== 'none').map((e) => e.dataset.v) }));
  ok('een klik op Lifestyle: de dienst wisselt, alleen de lifestyle-varianten staan', ls.dienst === 'lifestyle' && ls.sel === 'true' && ls.paneel === 'o-tab-lifestyle' && ls.zicht.length >= 2 && ls.zicht.every((v) => v.split(' ').includes('lifestyle')), JSON.stringify(ls));
  await page.focus('#o-tab-lifestyle');
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(200);
  ok('  met het pijltje naar Video, en de focus gaat mee', await page.evaluate(() => document.querySelector('#hoe').dataset.dienst === 'video' && document.activeElement?.id === 'o-tab-video'));
  await page.keyboard.press('Home');
  await page.waitForTimeout(200);
  await page.evaluate(() => document.querySelector('#hoe')._u?.stop());
  await page.waitForTimeout(1600);
  const klaar = await page.evaluate(() => {
    const o = document.querySelector('#hoe .o-ontleed[data-v="catalog"]');
    return { dienst: document.querySelector('#hoe').dataset.dienst, ontleed: getComputedStyle(o).visibility === 'visible' && Number(getComputedStyle(o).opacity) === 1, vlak: getComputedStyle(o.querySelector('.o-ont-stapel')).transform === 'none', maak: !document.querySelector('#hoe .h-maak') };
  });
  /* 16:40: "… en dan weer in elkaar word gezogen en vlak is en door gaat naar de andere stap";
     levering 75: de lagen zijn het enige beeld van stap 2 en landen vlak op hun plek (geen wissel) */
  ok('na de uitleg (catalog): de lagen staan vlak op hun plek, het handwerk is weg', klaar.dienst === 'catalog' && klaar.ontleed && klaar.vlak && klaar.maak, JSON.stringify(klaar));
  /* midden in stap 02: de animaties op hun hoogtepunt gezet (de tijden zijn procenten van 5,2 s) */
  await page.evaluate(() => document.querySelector('#hoe')._u?.opnieuw());
  await page.waitForTimeout(2900);
  const drie = await page.evaluate(() => {
    const hoe = document.querySelector('#hoe');
    const anims = document.getAnimations().filter((a) => /^o-ont-|^o-ont/.test(a.animationName || ''));
    for (const a of anims) { a.pause(); a.currentTime = 5200 * 0.52; }
    const o = hoe.querySelector('.o-ontleed[data-v="catalog"]');
    const stapel = getComputedStyle(o.querySelector('.o-ont-stapel')).transform;
    const gloed = getComputedStyle(o.querySelector('.o-ont-los img')).filter;
    const ai = Number(getComputedStyle(o.querySelector('.o-ont-ai')).opacity);
    const uit = { s2: hoe.classList.contains('u-s2'), n: anims.length, zicht: getComputedStyle(o).visibility, stapel, gloed, ai };
    for (const a of anims) a.play();
    return uit;
  });
  ok('midden in stap 02: de lagen gekanteld in 3D, een gloed in blauw uur om het product, "Gemaakt met AI"', drie.s2 && drie.n >= 3 && drie.zicht === 'visible' && /^matrix3d/.test(drie.stapel) && /drop-shadow\(rgba\(37, 80, 139/.test(drie.gloed) && drie.ai > 0.9, JSON.stringify(drie));
  ok('  geen scriptfout', fouten.length === 0, fouten.join(' | '));
  await ctx.close();
}

/* 16:56: "Elke scroll = volgende sectie klopt tot en met de services/producten. Hierna … normaal
   doorscrollen." Alleen op de computer. */
console.log('\n3b · de stroom: één wieltik, één sectie');
{
  const { ctx, page, fouten } = await open('/nl/');
  await page.mouse.move(400, 400);
  const stand = () => page.evaluate(() => {
    const kop = (s) => { const e = document.querySelector(s); return e ? Math.round(e.querySelector('.h-sec-kop').getBoundingClientRect().top) : null; };
    return { y: Math.round(scrollY), maken: kop('#maken'), zweeft: [...document.querySelectorAll('.is-zweeft')].map((e) => e.id || e.className.split(' ')[1]), melding: !!document.querySelector('.h-melding.is-open') };
  });
  await page.mouse.wheel(0, 120); await page.waitForTimeout(3600);
  const a = await stand();
  ok('één tik vanaf het begin: de video speelt en Hoe het werkt staat er', a.y > 900 * 1.5 && a.zweeft.includes('hoe'), JSON.stringify(a));
  /* levering 76: Formaten is geen stop meer (het zit in stap 3); na Hoe het werkt komt Wat we maken */
  await page.mouse.wheel(0, 120); await page.waitForTimeout(1700);
  const c = await stand();
  ok('nog één: Wat we maken, de kop net onder de balk, het blok zweeft', c.maken > 60 && c.maken < 140 && c.zweeft.length === 1 && c.zweeft.includes('maken'), JSON.stringify(c));
  ok('  de €1-melding ligt er niet overheen', !c.melding, JSON.stringify(c));
  await page.mouse.wheel(0, 120); await page.waitForTimeout(700);
  const d = await stand();
  ok('daarna gewoon scrollen (een tik is een tik)', d.y > c.y && d.y - c.y < 400, JSON.stringify(d));
  await page.mouse.wheel(0, -120); await page.waitForTimeout(1700);
  await page.mouse.wheel(0, -120); await page.waitForTimeout(1700);
  const e = await stand();
  ok('terug omhoog: weer Wat we maken of Hoe het werkt', (e.maken > 60 && e.maken < 140) || e.zweeft.includes('hoe'), JSON.stringify(e));
  ok('  geen scriptfout', fouten.length === 0, fouten.join(' | '));
  await ctx.close();
}

console.log('\n3c · een laag scherm (1280 × 600) speelt de video, en Hoe het werkt past');
{
  const { ctx, page, fouten } = await open('/nl/', { breed: 1280, hoog: 600 });
  const aan = await page.evaluate(() => document.body.classList.contains('o-aan'));
  await naar(page, 600 * 1.6);
  await page.waitForTimeout(400);
  const r = await page.evaluate(() => ({ voet: Math.round(document.querySelector('#hoe .o-voet').getBoundingClientRect().bottom), kop: Math.round(document.querySelector('#hoe .o-hoe-kop').getBoundingClientRect().top), balk: Math.round(document.querySelector('.site-header .nav').getBoundingClientRect().bottom) }));
  ok('de video staat aan en Hoe het werkt staat tussen de balk en de onderrand', aan && r.voet <= 600 && r.kop > r.balk, JSON.stringify(r));
  ok('  geen scriptfout', fouten.length === 0, fouten.join(' | '));
  await ctx.close();
}

console.log('\n4 · zonder scrollvideo');
/* levering 75: Hoe het werkt is compacter, dus 1280 × 600 speelt nu wel (zie 3c); pas lager niet meer */
for (const [naam, opt] of [['telefoon (390)', { breed: 390, hoog: 844 }], ['minder beweging (1440)', { stil: true }], ['een laag scherm (1280 × 520)', { breed: 1280, hoog: 520 }]]) {
  const { ctx, page, fouten } = await open('/nl/', opt);
  const r = await page.evaluate(() => ({
    stil: document.body.classList.contains('o-stil'), aan: document.body.classList.contains('o-aan'),
    zijwaarts: document.documentElement.scrollWidth > innerWidth,
    hoeOnder: (() => { const k = document.querySelector('[data-o-lede]').getBoundingClientRect(), h = document.querySelector('#hoe').getBoundingClientRect(); return h.top >= k.bottom; })(),
    ontleed: getComputedStyle(document.querySelector('#hoe .o-ontleed[data-v="catalog"]')).visibility,
  }));
  ok(`${naam}: alles onder elkaar, Hoe het werkt onder de kop, niet zijwaarts`, r.stil && !r.aan && r.hoeOnder && !r.zijwaarts, JSON.stringify(r));
  if (opt.stil) ok('  minder beweging: meteen de eindstand, met de lagen uit elkaar', r.ontleed === 'visible', JSON.stringify(r));
  ok('  geen scriptfout', fouten.length === 0, fouten.join(' | '));
  await ctx.close();
}

await browser.close();
server.close();
console.log(`\n${goed}/${goed + fout} geslaagd`);
process.exit(fout ? 1 : 0);
