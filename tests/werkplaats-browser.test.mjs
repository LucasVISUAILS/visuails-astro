/**
 * Het bestelformulier als werkplaats — levering 59, 17 oktober 2026 (afvinklijst 36 B,
 * alles "doen"). Op /start/catalog en /start/lifestyle (en /nl), in een echte browser.
 *
 * Wat hier vastligt:
 *   b-werkplaats  geen topbalk, menu of voet van de site; een eigen balk met de V, de
 *                 stappen, "Hulp nodig?" en de taal; rechts "Wat je krijgt" met het
 *                 totaal en Verder; inloggen als regel; meteen een prijs, bij 1 product.
 *   b-keuzes      01 Stijl (of Look), 02 Aantal met de prijstrap, 03 Gezicht, 04 Levering;
 *                 "Meer opties" is weg.
 *   b-kleur       per hoek een vierkantje in "Wat je krijgt"; het paneel zet de velden
 *                 die er al waren (background, beeld_bg_<id>, beeld_hex_<id>).
 *   b-levering    één zin, vanaf 10 producten de leverdatum; voorrang als schakelaar.
 *   b-stap2       één product tegelijk, met de knoppen bovenaan en Vorig/Volgend.
 *   b-tips        de tipbalk: om de 7 seconden, stil bij minder beweging, weg en terug.
 *   b-telefoon    de stap als pil ("1 van 4"), de balk onderaan met totaal en Verder.
 *   b-weg         kanalen, achtergrondsectie, Meer opties, de doorlooptijden en de
 *                 blokken onder het formulier staan niet meer in beeld.
 * De proef (/test-sample) is geen werkplaats en blijft zoals hij was.
 * Vraagt een verse build (npm run build).
 */
import { readFileSync, existsSync } from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { metVisIn } from './lib/vis-in.mjs';
import { LADDER, VOORRANG, EXTRA_PHOTO_LADDER, WINDOW_THRESHOLD } from '../src/data/pricing.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
let pass = 0;
let fail = 0;
function ok(name, cond, extra = '') {
  if (cond) pass++; else fail++;
  console.log(`${cond ? ' ok  ' : ' FAIL'} ${name}${cond || !extra ? '' : ` — ${extra}`}`);
}
const lees = (p) => readFileSync(path.join(DIST, p), 'utf8');
if (!existsSync(path.join(DIST, 'nl/start/catalog/index.html'))) {
  console.log(' FAIL er is geen dist/ — bouw eerst (npx astro build)');
  process.exit(1);
}
const euro = (n) => `€${String(n)}`;
const tarief = (soort, n) => LADDER[soort].find(([lo, hi]) => n >= lo && (hi === null || n <= hi))[2];

/* ── 1 · IN DE HTML ─────────────────────────────────────────────────────────── */
console.log('\n1 · de pagina zelf');
for (const p of ['nl/start/catalog/index.html', 'start/catalog/index.html', 'nl/start/lifestyle/index.html', 'start/lifestyle/index.html']) {
  const h = lees(p);
  ok(`/${p.replace('index.html', '')}: geen topbalk, lade of voet van de site`, !/class="site-header/.test(h) && !/class="mobile-nav/.test(h) && !/class="site-footer/.test(h));
  ok('  wel de balk van de werkplaats en body.werkplaats', /class="wk-balk"/.test(h) && /<body class="[^"]*\bwerkplaats\b/.test(h));
  const blokken = [...h.matchAll(/data-wk-blok="([a-z]+)"/g)].map((m) => m[1]);
  ok('  vier blokken in de goede volgorde', JSON.stringify(blokken) === JSON.stringify(['stijl', 'aantal', 'gezicht', 'levering']), blokken.join(','));
  ok('  geen "Meer opties", geen doorlooptijden, geen blokken onder het formulier', !/data-pl-meeropties/.test(h) && !/class="pl-levels/.test(h) && !/of-gelijk/.test(h) && !/of-slot/.test(h));
  ok('  het inlogblok bovenaan is een regel onder Verder', /class="wk-inloggen" data-acct="out"/.test(h));
}
{
  const h = lees('nl/start/catalog/index.html');
  const opslag = h.slice(h.indexOf('class="wk-opslag"'));
  ok('catalog: de kanalen en de achtergrond staan nog in het formulier, verborgen', /name="channels"/.test(opslag) && /name="background"/.test(opslag));
  ok('  een vierkantje per hoek in "Wat je krijgt"', (h.match(/data-wk-kleur="(front|back|detail|worn)"/g) || []).length === 4);
  const ls = lees('nl/start/lifestyle/index.html');
  ok('lifestyle: geen kleur per hoek', !/data-wk-kleur=/.test(ls) && !/data-wk-paneel/.test(ls));
  const proef = lees('nl/test-sample/index.html');
  ok('de proef is geen werkplaats', /class="site-header/.test(proef) && !/class="wk-balk"/.test(proef) && !/<body class="[^"]*\bwerkplaats\b/.test(proef));
}

/* ── 2 · IN DE BROWSER ──────────────────────────────────────────────────────── */
const { chromium } = await import('playwright');
const { browserPad } = await import('../scripts/lib/browserpad.mjs');
let PORT = 0;
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  const f = path.join(DIST, p);
  if (!f.startsWith(DIST) || !existsSync(f)) { res.writeHead(404); res.end(); return; }
  const ext = path.extname(f);
  res.writeHead(200, { 'content-type': { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.avif': 'image/avif', '.woff2': 'font/woff2', '.jpg': 'image/jpeg', '.png': 'image/png', '.pdf': 'application/pdf' }[ext] || 'application/octet-stream' });
  res.end(readFileSync(f));
});
await new Promise((r) => server.listen(0, () => { PORT = server.address().port; r(); }));
const browser = metVisIn(await chromium.launch({ executablePath: browserPad() }));
const KEUZE = encodeURIComponent(JSON.stringify({ version: 1, analytics: false, at: '2026-10-17T00:00:00.000Z' }));

async function open(pad, breed, { klok = false, rustig = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width: breed, height: 900 }, locale: 'nl-NL', reducedMotion: rustig ? 'reduce' : 'no-preference' });
  await ctx.addCookies([{ name: 'vis_consent', value: KEUZE, url: `http://127.0.0.1:${PORT}` }]);
  /* De laatste route gaat voor: eerst de algemene, dan de agenda. */
  await ctx.route('**/api/**', (r) => r.fulfill({ status: 204, body: '' }));
  await ctx.route('**/api/capacity**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, reason: 'ok', windows: [{ start: '2026-10-26', end: '2026-10-27' }], from: '2026-10-26', earlier: false, more: false }) }));
  await ctx.route('**/account/me**', (r) => r.fulfill({ status: 401, contentType: 'application/json', body: 'null' }));
  const page = await ctx.newPage();
  const fouten = [];
  page.on('pageerror', (e) => fouten.push(e.message));
  if (klok) await page.clock.install();
  await page.goto(`http://127.0.0.1:${PORT}${pad}`, { waitUntil: 'load' });
  await page.waitForSelector('#pl-form.is-live', { timeout: 15000 });
  await page.waitForTimeout(klok ? 0 : 250);
  return { ctx, page, fouten };
}
const veld = (page, naam) => page.evaluate((n) => new FormData(document.querySelector('#pl-form')).getAll(n).join('|'), naam);
const tekst = (page, sel) => page.evaluate((s) => (document.querySelector(s)?.textContent || '').replace(/\s+/g, ' ').trim(), sel);
/* checkVisibility en niet getClientRects: de inhoud van een dichte <details> houdt in
   Chromium zijn vakken (content-visibility: hidden), maar is niet te zien. */
const zicht = (page, sel) => page.evaluate((s) => { const el = document.querySelector(s); return !!el && !el.closest('[hidden]') && el.checkVisibility({ visibilityProperty: true, opacityProperty: true }); }, sel);
const zetAantal = async (page, n) => { await page.fill('[data-pl-qty-input]', String(n)); await page.waitForTimeout(150); };
const geenScroll = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
const leesbaar = (page, sel) => page.evaluate((s) => {
  const rgba = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return [0, 0, 0, 0]; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; };
  const lum = (c) => { const [r, g, b] = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  let slechtst = null;
  for (const el of document.querySelectorAll(s)) {
    if (el.closest('[hidden]') || !el.getClientRects().length || !el.textContent.trim()) continue;
    let bg = [255, 255, 255, 1];
    for (let n = el; n; n = n.parentElement) { const b = rgba(getComputedStyle(n).backgroundColor); if (b[3] > 0.99) { bg = b; break; } }
    const fg = rgba(getComputedStyle(el).color);
    const mix = fg.slice(0, 3).map((v, i) => v * fg[3] + bg[i] * (1 - fg[3]));
    const [a, b] = [lum(mix), lum(bg.slice(0, 3))];
    const ratio = Math.round(((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)) * 100) / 100;
    const px = parseFloat(getComputedStyle(el).fontSize);
    slechtst = { ratio: Math.min(ratio, slechtst ? slechtst.ratio : 99), px: Math.min(px, slechtst ? slechtst.px : 99) };
  }
  return slechtst;
}, sel);
async function leesbaarOk(page, sel, label) {
  const l = await leesbaar(page, sel);
  ok(`${label}: ${sel} contrast ≥ 4,5 en tekst ≥ 11,5 px`, !!l && l.ratio >= 4.5 && l.px >= 11.5, JSON.stringify(l));
}
const kies = (page, naam) => page.evaluate((n) => {
  const r = document.querySelector(`.pl-step.is-current input[name="${n}"]`);
  if (r && !document.querySelector(`input[name="${n}"]:checked`)) { r.checked = true; r.dispatchEvent(new Event('change', { bubbles: true })); }
}, naam);

try {
  /* ── 2a · CATALOG OP EEN BREED SCHERM ───────────────────────────────────── */
  console.log('\n2a · catalog, 1440 breed');
  {
    const { ctx, page, fouten } = await open('/nl/start/catalog/', 1440);
    ok('meteen een prijs, bij 1 product (b-werkplaats)', (await page.inputValue('[data-pl-qty-input]')) === '1' && (await tekst(page, '.wk-krijg [data-pl-total]')) === euro(tarief('catalog', 1)), await tekst(page, '.wk-krijg [data-pl-total]'));
    ok('  de trede van 1 product staat aan', /^1–4/.test(await tekst(page, '.wk-trap li.is-nu')), await tekst(page, '.wk-trap li.is-nu'));
    ok('  en "Producten" zegt aantal × tarief', (await tekst(page, '[data-wk-sum-producten]')) === `1 × ${euro(tarief('catalog', 1))}`);
    ok('  de knop rechts zegt waar hij heen gaat', (await tekst(page, '.wk-krijg [data-wk-verder-t]')) === 'Verder naar je foto’s');
    ok('  de stappen in de balk', (await page.locator('.wk-balk .pl-rail li:not([hidden]) .pl-rail-t').allTextContents()).join(' / ') === 'Wat je bestelt / Je foto’s / Je gegevens / Betalen');
    ok('  de taal wisselt naar dezelfde pagina', (await page.getAttribute('.wk-taal', 'href')) === '/start/catalog/');
    ok('  de V gaat naar de homepage', (await page.getAttribute('.wk-merk', 'href')) === '/nl/');
    ok('  geen "Meer opties", geen kanalen en geen achtergrondsectie in beeld', !(await zicht(page, '[data-pl-ch]')) && !(await zicht(page, '[data-pl-bg]')) && !(await zicht(page, '[data-pl-ratio]')));

    await zetAantal(page, WINDOW_THRESHOLD);
    ok(`vanaf ${WINDOW_THRESHOLD} producten: de zin over de leverdatum`, /^Vanaf 10 producten kies je na je gegevens een leverdatum/.test(await tekst(page, '[data-wk-lever-t]')), await tekst(page, '[data-wk-lever-t]'));
    ok('  de trede 10–19 staat aan', /^10–19/.test(await tekst(page, '.wk-trap li.is-nu')));
    ok('  en de leverdatum is een stap in de balk', (await page.locator('.wk-balk .pl-rail li:not([hidden]) .pl-rail-t').allTextContents()).includes('Leverdatum'));
    await zetAantal(page, 5);
    ok('onder de 10 weer de gewone zin', /^Zodra het klaar is/.test(await tekst(page, '[data-wk-lever-t]')));

    await page.click('.wk-voorrang-rij');
    const netto = 5 * tarief('catalog', 5);
    const vr = Math.min(VOORRANG.plafond, Math.max(VOORRANG.bodem, Math.ceil(netto * VOORRANG.deel)));
    ok('voorrang als schakelaar: het veld staat aan', (await veld(page, 'voorrang')) === '1');
    ok(`  de regel "Voorrang" en het totaal tellen hem mee (${euro(vr)})`, (await tekst(page, '[data-wk-sum-voorrang]')) === euro(vr) && (await tekst(page, '.wk-krijg [data-pl-total]')) === euro(netto + vr), `${await tekst(page, '[data-wk-sum-voorrang]')} ${await tekst(page, '.wk-krijg [data-pl-total]')}`);

    /* De kleur per hoek. */
    await page.click('[data-wk-kleur="back"]');
    ok('het vierkantje van de achterkant opent het paneel', await zicht(page, '[data-wk-paneel]') && (await page.getAttribute('[data-wk-kleur="back"]', 'aria-expanded')) === 'true');
    ok('  met wit, lichtgrijs, beige en een eigen kleur', (await page.locator('[data-wk-paneel] [data-wk-c]').evaluateAll((b) => b.map((x) => x.dataset.wkC))).join(',') === '#FFFFFF,#F5F5F5,#EDE4D8,eigen');
    await page.click('[data-wk-paneel] [data-wk-c="#EDE4D8"]');
    ok('  beige: de achterkant krijgt een eigen achtergrond, de rest blijft wit', (await veld(page, 'beeld_bg_back')) === '#EDE4D8' && (await veld(page, 'background')) === 'white', `${await veld(page, 'beeld_bg_back')} ${await veld(page, 'background')}`);
    ok('  en het paneel is dicht, de blik terug op het vierkantje', !(await zicht(page, '[data-wk-paneel]')) && (await page.evaluate(() => document.activeElement?.dataset.wkKleur)) === 'back');
    await page.click('[data-wk-kleur="front"]');
    await page.click('[data-wk-paneel] [data-wk-c="#F5F5F5"]');
    ok('lichtgrijs op de voorkant: de bestelling wordt lichtgrijs', (await veld(page, 'background')) === 'light-grey' && (await veld(page, 'background_hex')) === '#F5F5F5');
    ok('  de achterkant blijft beige, detail en model blijven wit', (await veld(page, 'beeld_bg_back')) === '#EDE4D8' && (await veld(page, 'beeld_bg_detail')) === '#FFFFFF' && (await veld(page, 'beeld_bg_worn')) === '#FFFFFF', `${await veld(page, 'beeld_bg_detail')} ${await veld(page, 'beeld_bg_worn')}`);
    ok('  het vak van elke hoek kleurt mee', (await page.evaluate(() => ['front', 'back'].map((id) => document.querySelector(`[data-wk-kleur="${id}"]`).style.getPropertyValue('--bo-bg')))).join(',') === '#F5F5F5,#EDE4D8');
    await page.click('[data-wk-kleur="detail"]');
    await page.click('[data-wk-paneel] [data-wk-c="eigen"]');
    await page.fill('[data-wk-eigen-hex]', 'xyz');
    await page.click('[data-wk-eigen-zet]');
    ok('een eigen kleur die geen hexcode is: de melding', await zicht(page, '[data-wk-eigen-fout]'));
    await page.fill('[data-wk-eigen-hex]', 'E7E1F7');
    await page.keyboard.press('Enter');
    ok('  een goede hexcode: eigen kleur op het detail', (await veld(page, 'beeld_bg_detail')) === 'eigen' && (await veld(page, 'beeld_hex_detail')) === '#E7E1F7', `${await veld(page, 'beeld_bg_detail')} ${await veld(page, 'beeld_hex_detail')}`);
    await page.click('[data-wk-kleur="worn"]');
    ok('  de noot over Amazon staat in het paneel', /Amazon.*#FFFFFF/.test(await tekst(page, '.wk-paneel-amazon')));
    await page.keyboard.press('Escape');
    ok('  Esc sluit het paneel', !(await zicht(page, '[data-wk-paneel]')) && (await page.evaluate(() => document.activeElement?.dataset.wkKleur)) === 'worn');

    /* De vorm en een extra hoek. */
    await page.click('[data-wk-vorm="portrait45"]');
    ok('de vorm 4:5 zet het veld ratio', (await veld(page, 'ratio')) === 'portrait45' && (await page.getAttribute('[data-wk-vorm="portrait45"]', 'aria-pressed')) === 'true');
    const voor = await tekst(page, '.wk-krijg [data-pl-total]');
    await page.click('[data-wk-hoek-open]');
    ok('"Een hoek erbij" opent het paneel met de hoeken', await zicht(page, '[data-wk-hoeken]') && await zicht(page, '[data-wk-hoeken] [data-pl-angles]'));
    await page.locator('[data-wk-hoeken] input[name="angle_three-quarter"]').check({ force: true });
    await page.click('[data-wk-hoeken-dicht]');
    ok('  Klaar sluit het; de hoek staat erbij in "Wat je krijgt"', !(await zicht(page, '[data-wk-hoeken]')) && await zicht(page, '[data-bo-hoek="three-quarter"]'));
    const per = EXTRA_PHOTO_LADDER.find(([lo, hi]) => 5 >= lo && (hi === null || 5 <= hi))[2];
    ok(`  en het totaal telt hem mee (5 × ${euro(per)})`, voor !== (await tekst(page, '.wk-krijg [data-pl-total]')) && (await tekst(page, '[data-wk-hoek-prijs]')) === `${euro(per)} per product`, `${voor} → ${await tekst(page, '.wk-krijg [data-pl-total]')}`);
    ok('  met zijn eigen vierkantje', await zicht(page, '[data-wk-kleur="three-quarter"]'));

    /* Hulp nodig? */
    await page.click('.wk-hulp-knop');
    ok('"Hulp nodig?" opent WhatsApp, mail en de FAQ', await zicht(page, '.wk-hulp-paneel') && /wa\.me\//.test(await page.getAttribute('.wk-hulp-a >> nth=0', 'href')) && /^mailto:/.test(await page.getAttribute('.wk-hulp-a >> nth=1', 'href')));
    ok('  de taal staat in de balk, niet in het paneel', await zicht(page, '.wk-taal') && !(await zicht(page, '.wk-hulp-taal')));
    await page.keyboard.press('Escape');
    ok('  Esc sluit hem', !(await page.evaluate(() => document.querySelector('[data-wk-hulp]').open)) && !(await zicht(page, '.wk-hulp-paneel')));

    for (const sel of ['.wk-label', '.wk-zin', '.wk-trap li', '.wk-rijen dt', '.wk-krijg .bo-totaal-s', '.wk-inloggen', '.wk-kleur-noot', '.wk-voorrang-t small', '.wk-lever-zin', '.pl-rail-t']) await leesbaarOk(page, sel, '1440');
    ok('geen horizontale scroll', await geenScroll(page));

    /* Naar stap 2 met de knop rechts. */
    await kies(page, 'model');
    await page.click('.wk-krijg [data-pl-next]');
    await page.waitForTimeout(300);
    ok('Verder rechts gaat naar stap 2', (await page.evaluate(() => document.querySelector('.pl-step.is-current')?.dataset.plStep)) === '2');
    ok('  en zegt daar "Verder naar je gegevens"', (await tekst(page, '.wk-krijg [data-wk-verder-t]')) === 'Verder naar je gegevens');
    ok('  stap 2: één product in beeld, de andere vier in de pagina', (await page.evaluate(() => { const k = [...document.querySelectorAll('.pu-card')]; return [k.length, k.filter((x) => !x.hidden).length]; })).join() === '5,1');
    ok('  Vorig product kan nog niet, "Product 1 van 5"', (await page.isDisabled('[data-wk-vorige]')) && (await tekst(page, '[data-wk-bladeren-t]')) === 'Product 1 van 5');
    await page.click('[data-wk-volgende]');
    ok('  Volgend product: product 2, ook in de knoppen bovenaan', (await page.evaluate(() => [...document.querySelectorAll('.pu-card')].findIndex((k) => !k.hidden))) === 1 && (await page.evaluate(() => [...document.querySelectorAll('[data-pl-rail-knop]')].findIndex((k) => k.classList.contains('is-nu')))) === 1);
    /* 0/4: voor, achter, detail en de extra driekwart; het beeld op een model wordt niet geüpload. */
    const knop2 = await page.evaluate(() => { const k = document.querySelectorAll('[data-pl-rail-knop]')[1]; return ['[data-wk-rail-nr]', '[data-wk-rail-naam]', '[data-wk-rail-tel]', '[data-pl-rail-naam]'].map((s) => k.querySelector(s).textContent.trim()); });
    ok('  de knoppen dragen nummer, naam en telling', knop2.slice(0, 3).join(' · ') === '02 · Product 2 · 0/4', knop2.join(' · '));
    ok('  en voor een schermlezer alleen de naam (de rest is aria-hidden)', knop2[3] === 'Product 2' && await page.evaluate(() => ['[data-wk-rail-nr]', '[data-wk-rail-naam]', '[data-wk-rail-tel]'].every((s) => document.querySelectorAll('[data-pl-rail-knop]')[1].querySelector(s).getAttribute('aria-hidden') === 'true')));
    ok('  de tipbalk staat onderin, en niet over "Wat je krijgt"', await zicht(page, '[data-wk-tipbalk]') && await page.evaluate(() => document.querySelector('[data-wk-tipbalk]').getBoundingClientRect().right <= document.querySelector('.wk-krijg').getBoundingClientRect().left));
    const t1 = await tekst(page, '[data-wk-tip-t]');
    await page.click('[data-wk-tip-volgende]');
    ok('  de volgende tip', (await tekst(page, '[data-wk-tip-t]')) !== t1);
    await page.click('[data-wk-tip-weg]');
    ok('  het kruisje verbergt hem, "Toon de tips weer" staat bovenaan', !(await zicht(page, '[data-wk-tipbalk]')) && await zicht(page, '[data-wk-tips-terug]'));
    await page.click('[data-wk-tips-terug]');
    ok('  en zet hem terug', await zicht(page, '[data-wk-tipbalk]') && !(await zicht(page, '[data-wk-tips-terug]')));
    await leesbaarOk(page, '.wk-tip-t', 'stap 2');
    await leesbaarOk(page, '.pu-rail-knop', 'stap 2');
    ok('geen scriptfouten', fouten.length === 0, fouten.join(' | '));
    await ctx.close();
  }

  /* ── 2b · DE TIPS LOPEN, EN BIJ MINDER BEWEGING NIET ───────────────────── */
  console.log('\n2b · de klok van de tipbalk');
  for (const rustig of [false, true]) {
    const { ctx, page } = await open('/nl/start/catalog/', 1440, { klok: true, rustig });
    await page.clock.runFor(500);
    await kies(page, 'model');
    await page.click('.wk-krijg [data-pl-next]');
    await page.clock.runFor(500);
    const t1 = await tekst(page, '[data-wk-tip-t]');
    await page.clock.runFor(7200);
    const t2 = await tekst(page, '[data-wk-tip-t]');
    ok(rustig ? 'minder beweging: de tip blijft staan' : 'na 7 seconden de volgende tip', rustig ? t1 === t2 : t1 !== t2, `${t1} → ${t2}`);
    await ctx.close();
  }

  /* ── 2c · DE TELEFOON ──────────────────────────────────────────────────── */
  console.log('\n2c · de telefoon, 390 breed');
  {
    const { ctx, page, fouten } = await open('/nl/start/catalog/', 390);
    ok('de stap als pil: "1 van 4"', (await page.evaluate(() => getComputedStyle(document.querySelector('.pl-rail-item.is-current'), '::after').content)) === '" · 1 van 4"');
    ok('  de andere stappen staan er niet', (await page.locator('.wk-balk .pl-rail li').evaluateAll((l) => l.filter((x) => getComputedStyle(x).display !== 'none').length)) === 1);
    ok('de balk onderaan met het totaal en Verder', await zicht(page, '.wk-onder') && (await tekst(page, '.wk-onder [data-pl-total]')) === euro(tarief('catalog', 1)) && await zicht(page, '.wk-onder [data-pl-next]'));
    ok('  en de regel eronder: beelden en excl. btw', /^4 beelden · excl\. btw$/.test(await tekst(page, '[data-wk-onder-zin]')), await tekst(page, '[data-wk-onder-zin]'));
    ok('"Wat je krijgt" staat onder de keuzes, zonder eigen Verder', await zicht(page, '.wk-krijg') && !(await zicht(page, '.wk-krijg [data-pl-next]')) && await page.evaluate(() => document.querySelector('.wk-krijg').getBoundingClientRect().top > document.querySelector('.wk-blok-levering').getBoundingClientRect().top));
    ok('de gezichten schuiven opzij', await page.evaluate(() => { const g = document.querySelector('.wk-blok-gezicht .mp-grid'); return g.scrollWidth > g.clientWidth + 20; }));
    ok('geen horizontale scroll', await geenScroll(page));
    await page.click('.wk-hulp-knop');
    ok('de taal staat op de telefoon in "Hulp nodig?"', !(await zicht(page, '.wk-taal')) && await zicht(page, '.wk-hulp-taal') && (await page.getAttribute('.wk-hulp-taal', 'href')) === '/start/catalog/' && (await page.getAttribute('.wk-hulp-taal', 'lang')) === 'en');
    ok('  het paneel past op het scherm', await page.evaluate(() => { const r = document.querySelector('.wk-hulp-paneel').getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.bottom <= innerHeight; }));
    await page.keyboard.press('Escape');
    await page.click('[data-wk-kleur="back"]');
    ok('het kleurpaneel past op het scherm', await page.evaluate(() => { const r = document.querySelector('[data-wk-paneel]').getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.bottom <= innerHeight; }));
    await page.keyboard.press('Escape');
    await kies(page, 'model');
    await page.click('.wk-onder [data-pl-next]');
    await page.waitForTimeout(300);
    ok('Verder onderaan gaat naar stap 2', (await page.evaluate(() => document.querySelector('.pl-step.is-current')?.dataset.plStep)) === '2');
    ok('  de tipbalk zonder pauzeknop, met het kruisje', await zicht(page, '[data-wk-tipbalk]') && !(await zicht(page, '[data-wk-tip-pauze]')) && await zicht(page, '[data-wk-tip-weg]'));
    ok('  boven de balk onderaan', await page.evaluate(() => document.querySelector('[data-wk-tipbalk]').getBoundingClientRect().bottom <= document.querySelector('.wk-onder').getBoundingClientRect().top));
    ok('geen scriptfouten', fouten.length === 0, fouten.join(' | '));
    await ctx.close();
  }

  /* ── 2d · LIFESTYLE ────────────────────────────────────────────────────── */
  console.log('\n2d · lifestyle, 1440 breed');
  {
    const { ctx, page, fouten } = await open('/nl/start/lifestyle/', 1440);
    ok('lifestyle: 01 heet Look', (await tekst(page, '#wk-h-stijl')) === 'Welke look?');
    ok('  de vijf vormen van lifestyle', (await page.locator('[data-wk-vorm]').count()) === 5);
    ok('  "Look" staat nog te kiezen', (await tekst(page, '[data-wk-sum-look]')) === 'Nog kiezen');
    await page.evaluate(() => { const r = document.querySelector('input[name="style"][value="glow"]') || document.querySelector('input[name="style"]'); r.checked = true; r.dispatchEvent(new Event('change', { bubbles: true })); });
    ok('  na een keuze staat de look erbij', (await tekst(page, '[data-wk-sum-look]')) !== 'Nog kiezen');
    ok('  meteen een prijs, bij 1 product', (await tekst(page, '.wk-krijg [data-pl-total]')) === euro(tarief('lifestyle', 1)));
    ok('geen scriptfouten', fouten.length === 0, fouten.join(' | '));
    await ctx.close();
  }

  /* ── 2e · ENGELS ───────────────────────────────────────────────────────── */
  console.log('\n2e · Engels');
  {
    const { ctx, page, fouten } = await open('/start/catalog/', 1440);
    ok('en: de stappen', (await page.locator('.wk-balk .pl-rail li:not([hidden]) .pl-rail-t').allTextContents()).join(' / ') === 'What you order / Your photos / Your details / Pay');
    ok('en: Verder heet "On to your photos"', (await tekst(page, '.wk-krijg [data-wk-verder-t]')) === 'On to your photos');
    ok('en: de taal wisselt naar /nl', (await page.getAttribute('.wk-taal', 'href')) === '/nl/start/catalog/');
    ok('geen scriptfouten', fouten.length === 0, fouten.join(' | '));
    await ctx.close();
  }
} finally {
  await browser.close();
  server.close();
}

console.log(`\n${pass}/${pass + fail} geslaagd`);
process.exit(fail ? 1 : 0);
