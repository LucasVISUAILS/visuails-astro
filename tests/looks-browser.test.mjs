/**
 * De complete look in het bestelformulier — levering 60, 17 oktober 2026
 * (afvinklijst 38, c-stap1, c-erbij, c-toevoegen, c-look, c-telefoon), in een
 * echte browser op /nl/start/lifestyle en /nl/start/catalog.
 *
 * Wat hier vastligt:
 *   · stap 1: geen keuzelijst meer, één regel onder het aantal; niet bij catalog;
 *   · stap 2: per plek Wij kiezen / Eigen stuk / Uit je bestelling (catalog: twee);
 *     bij Uit je bestelling alleen de stukken die op die plek passen;
 *   · koppelen gaat twee kanten op, een look krijgt een letter, een kaart, een regel
 *     in "Wat je krijgt" en € 50; de beelden gaan met twee per look omhoog;
 *   · de velden die de server leest (look_pN, context_*_pN = look, de notitie);
 *   · wat niet mag (al in een look, meer dan drie) staat uit, met de reden;
 *   · "Haal de look uit elkaar", en "Schoenen toevoegen" (een product erbij);
 *   · de productknoppen van een look als één vorm onder LOOK A;
 *   · de telefoon: de keuzes onder elkaar, geen horizontale scroll.
 * Vraagt een verse build (npm run build).
 */
import { readFileSync, existsSync } from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { metVisIn } from './lib/vis-in.mjs';
import { LADDER } from '../src/data/pricing.js';
import { LOOK_PRIJS } from '../src/data/looks.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
let pass = 0;
let fail = 0;
function ok(name, cond, extra = '') {
  if (cond) pass++; else fail++;
  console.log(`${cond ? ' ok  ' : ' FAIL'} ${name}${cond || !extra ? '' : ` — ${extra}`}`);
}
if (!existsSync(path.join(DIST, 'nl/start/lifestyle/index.html'))) {
  console.log(' FAIL er is geen dist/ — bouw eerst (npx astro build)');
  process.exit(1);
}
const euro = (n) => `€${String(n)}`;
const tarief = (n) => LADDER.lifestyle.find(([lo, hi]) => n >= lo && (hi === null || n <= hi))[2];

/* ── 1 · IN DE HTML ─────────────────────────────────────────────────────────── */
console.log('\n1 · stap 1 (c-stap1)');
{
  const ls = readFileSync(path.join(DIST, 'nl/start/lifestyle/index.html'), 'utf8');
  const cat = readFileSync(path.join(DIST, 'nl/start/catalog/index.html'), 'utf8');
  ok('lifestyle: geen keuzelijst "Zitten er outfits bij?"', !/name="outfit_count"/.test(ls) && !/data-pl-outfit/.test(ls));
  ok('  maar één regel onder het aantal, met de prijs per look', /data-pl-lookzin/.test(ls) && /Stukken die samen gedragen worden\?/.test(ls) && /€50 per look/.test(ls));
  ok('  met het tekentje (twee vlakken) en de uitleg achter een vraagteken', /class="wk-paartje"/.test(ls) && /In een complete look zijn alle stukken hoofdzaak/.test(ls));
  ok('catalog: geen regel over looks', !/data-pl-lookzin/.test(cat));
  ok('de proef: ook niet', !/data-pl-lookzin/.test(readFileSync(path.join(DIST, 'nl/test-sample/index.html'), 'utf8')));
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

async function open(pad, breed, aantal) {
  const ctx = await browser.newContext({ viewport: { width: breed, height: 900 }, locale: 'nl-NL' });
  await ctx.addCookies([{ name: 'vis_consent', value: KEUZE, url: `http://127.0.0.1:${PORT}` }]);
  await ctx.route('**/api/**', (r) => r.fulfill({ status: 204, body: '' }));
  await ctx.route('**/account/me**', (r) => r.fulfill({ status: 401, contentType: 'application/json', body: 'null' }));
  const page = await ctx.newPage();
  const fouten = [];
  page.on('pageerror', (e) => fouten.push(e.message));
  await page.goto(`http://127.0.0.1:${PORT}${pad}`, { waitUntil: 'load' });
  await page.waitForSelector('#pl-form.is-live', { timeout: 15000 });
  await page.fill('[data-pl-qty-input]', String(aantal));
  await page.waitForTimeout(150);
  await page.evaluate(() => {
    const s = document.querySelector('input[name="style"]');
    if (s && !document.querySelector('input[name="style"]:checked')) { s.checked = true; s.dispatchEvent(new Event('change', { bubbles: true })); }
    const m = document.querySelector('input[name="model"]');
    if (m && !document.querySelector('input[name="model"]:checked')) { m.checked = true; m.dispatchEvent(new Event('change', { bubbles: true })); }
  });
  await page.click(breed <= 900 ? '.wk-onder [data-pl-next]' : '.wk-krijg [data-pl-next]');
  await page.waitForTimeout(250);
  return { ctx, page, fouten };
}
const zetSoort = (page, i, naam, soort) => page.evaluate(([i, naam, soort]) => {
  const k = document.querySelectorAll('.pu-card')[i];
  const n = k.querySelector('.pu-name'); n.value = naam; n.dispatchEvent(new Event('change', { bubbles: true }));
  const s = k.querySelector('.pu-soort-sel'); s.value = soort; s.dispatchEvent(new Event('change', { bubbles: true }));
}, [i, naam, soort]);
const naar = async (page, i) => { await page.click(`[data-pl-rail-knop] >> nth=${i}`); await page.waitForTimeout(120); };
const velden = (page) => page.evaluate(() => Object.fromEntries([...new FormData(document.querySelector('#pl-form')).entries()].filter(([k]) => /^(look_|context_)/.test(k))));
const tekst = (page, sel) => page.evaluate((s) => (document.querySelector(s)?.textContent || '').replace(/\s+/g, ' ').trim(), sel);
const knop = (kaart, plek, k) => `#pu-kaart-${kaart} [data-wk-plek="${plek}"][data-wk-k="${k}"]`;
const stuk = (kaart, plek, q) => `#pu-kaart-${kaart} [data-wk-plek="${plek}"][data-wk-stuk="${q}"]`;
const leesbaar = (page, sel) => page.evaluate((s) => {
  const rgba = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return [0, 0, 0, 0]; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; };
  const lum = (c) => { const [r, g, b] = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  let slechtst = null;
  for (const el of document.querySelectorAll(s)) {
    if (el.closest('[hidden]') || !el.checkVisibility() || !el.textContent.trim()) continue;
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

try {
  /* ── 2a · DE LOOK SAMENSTELLEN ─────────────────────────────────────────── */
  console.log('\n2a · hoodie, broek en sneaker (c-erbij, c-look)');
  {
    const { ctx, page, fouten } = await open('/nl/start/lifestyle/', 1440, 3);
    await zetSoort(page, 0, 'Hoodie zwart', 'top');
    await zetSoort(page, 1, 'Wijde broek', 'trousers');
    await zetSoort(page, 2, 'Sneaker zwart', 'shoes');
    await naar(page, 1);
    ok('de broek: twee plekken, schoenen en top', (await page.locator('#pu-kaart-p2 .wk-plek .wk-plek-naam b').allTextContents()).join(',') === 'Schoenen,Top');
    ok('  per plek drie keuzes, op Wij kiezen', (await page.locator('#pu-kaart-p2 .wk-drie').first().locator('button').evaluateAll((b) => b.map((x) => `${x.dataset.wkK}${x.getAttribute('aria-pressed') === 'true' ? '*' : ''}`))).join(',') === 'wij*,eigen,uit');
    ok('  met "+ €50" bij Uit je bestelling', /\+ €50/.test(await tekst(page, knop('p2', 'top', 'uit'))));
    ok('  Wij kiezen zegt wat wij erbij zetten', /effen/.test(await tekst(page, '#pu-kaart-p2 [data-wk-plek-rij="top"] .wk-plek-paneel')));
    await page.click(knop('p2', 'top', 'uit'));
    ok('Uit je bestelling: alleen de top past (de sneaker niet)', (await page.locator('#pu-kaart-p2 [data-wk-plek-rij="top"] [data-wk-stuk]').evaluateAll((b) => b.map((x) => x.dataset.wkStuk))).join(',') === 'p1');
    ok('  en "Een top toevoegen" met de prijs van het vierde product', /Een top toevoegen/.test(await tekst(page, '#pu-kaart-p2 [data-wk-plek-rij="top"] [data-wk-toe]')) && (await tekst(page, '#pu-kaart-p2 [data-wk-plek-rij="top"] [data-wk-toe]')).includes(euro(tarief(4))));
    ok('  de uitleg: een complete look', /Een complete look\./.test(await tekst(page, '#pu-kaart-p2 [data-wk-plek-rij="top"] .wk-plek-paneel')));
    await page.click(stuk('p2', 'top', 'p1'));
    ok('de hoodie op Top: look A', (await velden(page)).look_p1 === 'A' && (await velden(page)).look_p2 === 'A');
    ok('  en de knop zegt nu "look A"', /look A/.test(await tekst(page, knop('p2', 'top', 'uit'))));
    ok('  het totaal: 3 × €109 + €50', (await tekst(page, '.wk-krijg [data-pl-total]')) === euro(3 * tarief(3) + LOOK_PRIJS), await tekst(page, '.wk-krijg [data-pl-total]'));
    ok('  "Complete looks 1 × €50" en 14 beelden', (await tekst(page, '[data-wk-sum-looks]')) === `1 × ${euro(LOOK_PRIJS)}` && (await tekst(page, '[data-pl-bo-beelden]')) === '14');
    ok('  met een regel per look boven de rijen', /Look A · 2 stukken/.test(await tekst(page, '[data-wk-looks]')) && /Twee beelden van de hele look erbij/.test(await tekst(page, '[data-wk-looks]')));
    ok('  de kaart van de look onder de plekken', /Een complete look/.test(await tekst(page, '#pu-kaart-p2 .wk-lookkaart')) && /Hoodie zwart en Wijde broek, samen gedragen door één model\./.test(await tekst(page, '#pu-kaart-p2 .wk-lookkaart')));
    await page.click(knop('p2', 'shoes', 'uit'));
    await page.click(stuk('p2', 'shoes', 'p3'));
    const v = await velden(page);
    ok('de sneaker erbij: drie stukken in look A', [v.look_p1, v.look_p2, v.look_p3].join() === 'A,A,A' && /Look A · 3 stukken/.test(await tekst(page, '#pu-kaart-p2 .wk-lookkaart')));
    ok('  de velden: "look" waar een stuk uit de look staat', v.context_top_p2 === 'look' && v.context_shoes_p2 === 'look' && v.context_bottom_p1 === 'look' && v.context_bottom_p3 === 'look' && v.context_underlayer_p1 === 'ours', JSON.stringify(v));
    ok('  het totaal blijft één look: €50 en niet €100', (await tekst(page, '.wk-krijg [data-pl-total]')) === euro(3 * tarief(3) + LOOK_PRIJS));
    await naar(page, 0);
    ok('bij de hoodie staat de broek vanzelf op Broek of rok (twee kanten op)', (await page.getAttribute(stuk('p1', 'bottom', 'p2'), 'aria-pressed')) === 'true' && /In deze look/.test(await tekst(page, stuk('p1', 'bottom', 'p2'))));
    ok('  en Eronder blijft Wij kiezen', (await page.getAttribute(knop('p1', 'underlayer', 'wij'), 'aria-pressed')) === 'true');
    await page.fill('#pu-kaart-p1 [data-wk-look-notitie]', 'Hoodie los over de tailleband');
    ok('de notitie gaat mee als look_notitie_A', (await velden(page)).look_notitie_A === 'Hoodie los over de tailleband');
    ok('  en staat ook bij de andere stukken', await page.evaluate(() => document.querySelector('#pu-kaart-p2 [data-wk-look-notitie]').value) === 'Hoodie los over de tailleband');
    ok('de productknoppen: één vorm onder LOOK A', JSON.stringify(await page.locator('.pu-rail li').evaluateAll((l) => l.map((x) => x.dataset.wkLookPos || '-'))) === '["eerst","midden","laatst"]'
      && (await page.evaluate(() => getComputedStyle(document.querySelector('.pu-rail li[data-wk-look-pos="eerst"]'), '::before').content)) === '"Look A"');
    for (const sel of ['.wk-plek-naam b', '.wk-plek-naam small', '.wk-drie button', '.wk-drie button i', '.wk-uitleg', '.wk-stuk b', '.wk-stuk small', '.wk-lookkaart-kop p', '.wk-lookkaart-wie', '.wk-lookkaart li span', '.wk-lookkaart-notitie span', '.wk-lookkaart-uit', '.wk-lookregel b', '.wk-lookregel small', '.wk-draagt-zin']) {
      const l = await leesbaar(page, sel);
      ok(`${sel}: contrast ≥ 4,5 en tekst ≥ 11,5 px`, !!l && l.ratio >= 4.5 && l.px >= 11.5, JSON.stringify(l));
    }
    /* Een vierde stuk: de broek zit al in look A, en de look is vol. */
    await page.click('[data-pl-add]');
    await page.waitForTimeout(200);
    await zetSoort(page, 3, 'Tweede hoodie', 'top');
    await naar(page, 3);
    await page.click(knop('p4', 'bottom', 'uit'));
    ok('een vierde stuk: de broek staat uit, "Zit al in look A"', await page.isDisabled(stuk('p4', 'bottom', 'p2')) && /Zit al in look A/.test(await tekst(page, stuk('p4', 'bottom', 'p2'))));
    await naar(page, 0);
    await page.click(knop('p1', 'underlayer', 'uit'));
    ok('  en onder de hoodie mag hij niet meer: de look is vol', await page.isDisabled(stuk('p1', 'underlayer', 'p4')) && /hooguit drie stukken/.test(await tekst(page, stuk('p1', 'underlayer', 'p4'))));
    await page.click('#pu-kaart-p1 [data-wk-uit-elkaar]');
    const na = await velden(page);
    ok('"Haal de look uit elkaar": geen look meer, alles terug op Wij kiezen', !na.look_p1 && !na.look_p2 && !na.look_p3 && na.context_bottom_p1 === 'ours' && na.context_top_p2 === 'ours', JSON.stringify(na));
    ok('  en het totaal zonder look', (await tekst(page, '.wk-krijg [data-pl-total]')) === euro(4 * tarief(4)) && !(await page.locator('[data-wk-rij-looks]').isVisible()));
    ok('geen scriptfouten', fouten.length === 0, fouten.join(' | '));
    await ctx.close();
  }

  /* ── 2b · EEN STUK TOEVOEGEN ───────────────────────────────────────────── */
  console.log('\n2b · "Schoenen toevoegen" (c-toevoegen)');
  {
    const { ctx, page, fouten } = await open('/nl/start/lifestyle/', 1440, 1);
    await zetSoort(page, 0, 'Wijde broek', 'trousers');
    await page.click(knop('p1', 'shoes', 'uit'));
    await page.click('#pu-kaart-p1 [data-wk-plek-rij="shoes"] [data-wk-toe]');
    await page.waitForTimeout(200);
    const v = await velden(page);
    ok('er komt een product bij, met het aantal', (await page.inputValue('[data-pl-qty-input]')) === '2' && (await page.locator('.pu-card').count()) === 2);
    ok('  het is van de soort schoenen', await page.evaluate(() => document.querySelectorAll('.pu-soort-sel')[1].value) === 'shoes');
    ok('  en zit meteen in de look', v.look_p1 === 'A' && v.look_p2 === 'A' && v.context_shoes_p1 === 'look' && v.context_bottom_p2 === 'look', JSON.stringify(v));
    ok('  de klant blijft bij het product waar hij was', await page.evaluate(() => !document.querySelector('#pu-kaart-p1').hidden));
    ok('  en het totaal loopt mee: 2 × €109 + €50', (await tekst(page, '.wk-krijg [data-pl-total]')) === euro(2 * tarief(2) + LOOK_PRIJS));
    ok('geen scriptfouten', fouten.length === 0, fouten.join(' | '));
    await ctx.close();
  }

  /* ── 2c · EIGEN STUK EN CATALOG ────────────────────────────────────────── */
  console.log('\n2c · eigen stuk, en catalog zonder looks');
  {
    const { ctx, page, fouten } = await open('/nl/start/catalog/', 1440, 2);
    await zetSoort(page, 0, 'Broek', 'trousers');
    ok('catalog: twee keuzes per plek, geen "Uit je bestelling"', (await page.locator('#pu-kaart-p1 .wk-drie').first().locator('button').evaluateAll((b) => b.map((x) => x.dataset.wkK))).join(',') === 'wij,eigen');
    ok('  en geen zin over looks', !/complete look/.test(await tekst(page, '#pu-kaart-p1 .wk-draagt-zin')));
    ok('  het vakje voor een eigen stuk staat er nog niet', !(await page.locator('#pu-kaart-p1 [data-wk-plek-rij="shoes"] .wk-plek-eigen').isVisible()));
    await page.click(knop('p1', 'shoes', 'eigen'));
    ok('Eigen stuk: het vakje en de uitleg verschijnen', await page.locator('#pu-kaart-p1 [data-wk-plek-rij="shoes"] .wk-plek-eigen .pu-slot').isVisible() && /niet als product gefotografeerd/.test(await tekst(page, '#pu-kaart-p1 [data-wk-plek-rij="shoes"] .wk-plek-eigen')));
    ok('  zonder foto blijft het veld "ours"', (await velden(page)).context_shoes_p1 === 'ours');
    ok('  en er gaan geen lookvelden mee', !Object.entries(await velden(page)).some(([k, x]) => /^look_p/.test(k) && x));
    ok('geen scriptfouten', fouten.length === 0, fouten.join(' | '));
    await ctx.close();
  }

  /* ── 2d · DE TELEFOON ──────────────────────────────────────────────────── */
  console.log('\n2d · de telefoon (c-telefoon)');
  {
    const { ctx, page, fouten } = await open('/nl/start/lifestyle/', 390, 2);
    await zetSoort(page, 0, 'Hoodie', 'top');
    await zetSoort(page, 1, 'Broek', 'trousers');
    await page.click(knop('p1', 'bottom', 'uit'));
    await page.click(stuk('p1', 'bottom', 'p2'));
    ok('de keuzes onder elkaar, 48 px hoog', await page.evaluate(() => { const d = document.querySelector('#pu-kaart-p1 .wk-drie'); const b = d.querySelector('button'); return getComputedStyle(d).flexDirection === 'column' && Math.round(b.getBoundingClientRect().height) === 48; }));
    ok('de balk onderaan telt de look mee', (await tekst(page, '.wk-onder [data-pl-total]')) === euro(2 * tarief(2) + LOOK_PRIJS) && /10 beelden/.test(await tekst(page, '[data-wk-onder-zin]')));
    ok('geen horizontale scroll', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    ok('geen scriptfouten', fouten.length === 0, fouten.join(' | '));
    await ctx.close();
  }
} finally {
  await browser.close();
  server.close();
}

console.log(`\n${pass}/${pass + fail} geslaagd`);
process.exit(fail ? 1 : 0);
