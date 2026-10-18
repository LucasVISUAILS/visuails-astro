/**
 * Twee punten uit afvinklijst 37 op de telefoon — levering 58, 17 oktober 2026.
 *
 * b-wa · de zwevende WhatsApp-knop:
 *   · niet op /contact (daar lag hij over "Chat on WhatsApp") en niet in het
 *     bestelformulier (/start en alles eronder);
 *   · op 390 breed pas zichtbaar na één scherm scrollen (is-wacht);
 *   · daarna nooit zichtbaar boven iets klikbaars (is-weg); gemeten op elke
 *     scrolstand van drie pagina's;
 *   · op een breed scherm verandert er niets.
 *
 * b-start (v37-start = a) · /start op 390 breed:
 *   · de lifestylelooks in een rij om opzij te vegen, elke kaart 80% breed, en de
 *     pagina zelf schuift niet opzij;
 *   · per kaart alleen beeld, naam, zin en "Kies deze look";
 *   · de prijs en de planprijs één keer boven de rij, de proef één keer eronder,
 *     en die proef begint bij de look die in beeld is;
 *   · op 1440 staat alles nog per kaart en zijn de groepsregels weg.
 * Vraagt een verse build (npm run build).
 */
import { readFileSync, existsSync } from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { metVisIn } from './lib/vis-in.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
let pass = 0;
let fail = 0;
function ok(name, cond, extra = '') {
  if (cond) pass++; else fail++;
  console.log(`${cond ? ' ok  ' : ' FAIL'} ${name}${cond || !extra ? '' : ` — ${extra}`}`);
}
const lees = (p) => readFileSync(path.join(DIST, p), 'utf8');

if (!existsSync(path.join(DIST, 'nl/start/index.html'))) {
  console.log(' FAIL er is geen dist/ — bouw eerst (npx astro build)');
  process.exit(1);
}

/* ── IN DE HTML: WAAR DE KNOP STAAT ─────────────────────────────────────────── */
console.log('\nde zwevende knop, per pagina');
for (const [p, moet] of [
  ['nl/index.html', true], ['index.html', true], ['nl/pricing/index.html', true],
  ['nl/contact/index.html', false], ['contact/index.html', false],
  ['nl/start/index.html', false], ['start/index.html', false],
  ['nl/start/lifestyle/index.html', false], ['start/catalog/index.html', false], ['nl/start/plan/index.html', false],
]) {
  ok(`${moet ? 'wel' : 'niet'} op /${p.replace(/index\.html$/, '')}`, /class="wa-launcher/.test(lees(p)) === moet);
}

/* ── IN DE BROWSER ──────────────────────────────────────────────────────────── */
const { chromium } = await import('playwright');
const { browserPad } = await import('../scripts/lib/browserpad.mjs');
let PORT = 0;
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  const f = path.join(DIST, p);
  if (!f.startsWith(DIST) || !existsSync(f)) { res.writeHead(404); res.end(); return; }
  const ext = path.extname(f);
  res.writeHead(200, { 'content-type': { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.avif': 'image/avif', '.woff2': 'font/woff2', '.jpg': 'image/jpeg', '.png': 'image/png' }[ext] || 'application/octet-stream' });
  res.end(readFileSync(f));
});
await new Promise((r) => server.listen(0, () => { PORT = server.address().port; r(); }));
const browser = metVisIn(await chromium.launch({ executablePath: browserPad() }));
const KEUZE = encodeURIComponent(JSON.stringify({ version: 1, analytics: false, at: '2026-10-17T00:00:00.000Z' }));

async function open(pad, breed) {
  const ctx = await browser.newContext({ viewport: { width: breed, height: 844 }, locale: 'nl-NL' });
  await ctx.addCookies([{ name: 'vis_consent', value: KEUZE, url: `http://127.0.0.1:${PORT}` }]);
  await ctx.route('**/api/**', (r) => r.fulfill({ status: 204, body: '' }));
  await ctx.route('**/account/me**', (r) => r.fulfill({ status: 401, contentType: 'application/json', body: '{}' }));
  const page = await ctx.newPage();
  const fouten = [];
  page.on('pageerror', (e) => fouten.push(e.message));
  await page.goto(`http://127.0.0.1:${PORT}${pad}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(250);
  return { ctx, page, fouten };
}

/* Waar de knop staat, of hij te zien is, en wat er op zijn vaste plek onder ligt. */
const meet = (page) => page.evaluate(() => {
  const d = document.querySelector('.wa-dock');
  const k = d && d.querySelector('.wa-launcher');
  if (!k) return null;
  const cs = getComputedStyle(k);
  const w = k.offsetWidth, h = k.offsetHeight;
  const x0 = innerWidth - parseFloat(cs.right) - w, y0 = innerHeight - parseFloat(cs.bottom) - h;
  const KLIK = 'a[href], button, input, select, textarea, summary, label, [role="button"]';
  const onder = [[x0 + w / 2, y0 + h / 2], [x0 + 6, y0 + 6], [x0 + w - 6, y0 + h - 6]]
    .flatMap(([x, y]) => document.elementsFromPoint(x, y))
    .filter((el) => !d.contains(el)).map((el) => el.closest(KLIK)).find(Boolean);
  const r = k.getBoundingClientRect();
  const zichtbaar = r.left < innerWidth - 1 && parseFloat(cs.opacity) > 0.01 && cs.pointerEvents !== 'none';
  return { wacht: d.classList.contains('is-wacht'), weg: d.classList.contains('is-weg'), zichtbaar, onder: onder ? `${onder.tagName.toLowerCase()} ${onder.textContent.trim().slice(0, 30)}` : '' };
});

try {
  console.log('\nde knop op de telefoon (390 × 844)');
  for (const pad of ['/nl/', '/nl/pricing/', '/nl/lifestyle/']) {
    const { ctx, page, fouten } = await open(pad, 390);
    const boven = await meet(page);
    ok(`${pad}: bovenaan nog niet te zien`, boven && boven.wacht && !boven.zichtbaar, JSON.stringify(boven));
    const H = await page.evaluate(() => document.documentElement.scrollHeight);
    let gezien = 0;
    const fout = [];
    for (let y = 900; y < H - 844; y += 151) {
      await page.evaluate((yy) => window.scrollTo(0, yy), y);
      await page.waitForTimeout(90);
      const m = await meet(page);
      if (m.zichtbaar) gezien++;
      if (m.zichtbaar && m.onder) fout.push(`${y}: ${m.onder}`);
    }
    ok(`${pad}: na één scherm wel te zien (${gezien} standen)`, gezien > 3, String(gezien));
    ok(`${pad}: nooit boven iets klikbaars`, fout.length === 0, fout.slice(0, 4).join(' | '));
    ok(`${pad}: geen scriptfouten`, fouten.length === 0, fouten.join(' | '));
    await ctx.close();
  }
  {
    const { ctx, page } = await open('/nl/', 1440);
    const m = await meet(page);
    ok('1440: de knop staat er meteen, zoals altijd', m && !m.wacht && !m.weg && m.zichtbaar, JSON.stringify(m));
    await ctx.close();
  }

  console.log('\n/start op de telefoon');
  for (const [pad, taal] of [['/nl/start/', 'nl'], ['/start/', 'en']]) {
    const { ctx, page, fouten } = await open(pad, 390);
    const s = await page.evaluate(() => {
      const zicht = (el) => !!el && el.getClientRects().length > 0 && getComputedStyle(el).display !== 'none' && !el.closest('[hidden]');
      const g = document.querySelector('[data-st-groep="lifestyle"]');
      const rij = g.querySelector('[data-st-rij]');
      const kaarten = [...rij.querySelectorAll('[data-st-look]')];
      const k0 = kaarten[0];
      return {
        breed: document.documentElement.scrollWidth, vw: innerWidth,
        rij: [getComputedStyle(rij).overflowX, rij.scrollWidth > rij.clientWidth + 100],
        aandeel: kaarten.map((k) => Math.round((k.getBoundingClientRect().width / rij.clientWidth) * 100)),
        tweedeGluurt: kaarten[1].getBoundingClientRect().left < innerWidth && getComputedStyle(kaarten[1]).opacity === '1',
        inKaart: ['.h-st-beeld', '.h-st-naam', '.h-st-zin', '[data-st-kies]', '.h-st-tarief', '.h-st-abo', '[data-st-proef]', '.h-st-meer'].map((sel) => zicht(k0.querySelector(sel))),
        prijs: [...g.querySelectorAll('.h-st-groep-prijs [data-vis-klant="niet-abonnee"]')].filter(zicht).map((p) => p.textContent.replace(/\s+/g, ' ').trim()),
        prijsBoven: g.querySelector('.h-st-groep-prijs').getBoundingClientRect().bottom <= rij.getBoundingClientRect().top,
        proef: [...g.querySelectorAll('.h-st-groep-proef a')].filter(zicht).map((a) => [a.textContent.trim(), a.getAttribute('href')]),
        proefOnder: g.querySelector('.h-st-groep-proef').getBoundingClientRect().top >= rij.getBoundingClientRect().bottom,
        tarieven: [...document.querySelectorAll('.h-st-kies .h-st-tarief, .h-st-kies .h-st-abo')].filter(zicht).length,
      };
    });
    ok(`${taal}: de pagina schuift niet opzij`, s.breed === s.vw, `${s.breed} > ${s.vw}`);
    ok(`${taal}: de lifestylelooks staan in een veegrij`, s.rij[0] === 'auto' && s.rij[1], JSON.stringify(s.rij));
    ok(`${taal}: elke kaart 80% breed`, s.aandeel.every((a) => a >= 72 && a <= 80), s.aandeel.join(' / '));
    ok(`${taal}: de volgende look gluurt erbij, zichtbaar`, s.tweedeGluurt);
    ok(`${taal}: per kaart beeld, naam, zin en Kies deze look, en verder niets`, JSON.stringify(s.inKaart) === JSON.stringify([true, true, true, true, false, false, false, false]), JSON.stringify(s.inKaart));
    ok(`${taal}: de prijs en de planprijs één keer, boven de rij`, s.prijs.length === 2 && /€\s?49/.test(s.prijs[0]) && /(abonnement|plan)/.test(s.prijs[1]) && s.prijsBoven, JSON.stringify(s.prijs));
    ok(`${taal}: de proef één keer, onder de rij, bij de eerste look`, s.proef.length === 1 && /€1/.test(s.proef[0][0]) && /style=dunes$/.test(s.proef[0][1]) && s.proefOnder, JSON.stringify(s.proef));
    ok(`${taal}: op heel /start precies vier prijsregels (twee per groep)`, s.tarieven === 4, String(s.tarieven));
    await page.evaluate(() => { const r = document.querySelector('[data-st-rij]'); r.scrollTo({ left: r.querySelectorAll('[data-st-look]')[2].offsetLeft - 16 }); });
    await page.waitForTimeout(400);
    const na = await page.evaluate(() => document.querySelector('[data-st-groep="lifestyle"] [data-st-groep-proef]').getAttribute('href'));
    ok(`${taal}: na vegen naar de derde look begint de proef daar`, /style=glow$/.test(na), na);
    ok(`${taal}: geen scriptfouten`, fouten.length === 0, fouten.join(' | '));
    await ctx.close();
  }
  {
    const { ctx, page } = await open('/nl/start/', 1440);
    const s = await page.evaluate(() => {
      const zicht = (el) => !!el && el.getClientRects().length > 0 && getComputedStyle(el).display !== 'none';
      const rij = document.querySelector('[data-st-rij]');
      return {
        grid: getComputedStyle(rij).display,
        groep: [...document.querySelectorAll('.h-st-groep-prijs, .h-st-groep-proef')].filter(zicht).length,
        perKaart: [...document.querySelectorAll('.h-st-look .h-st-tarief[data-vis-klant="niet-abonnee"]')].filter(zicht).length,
      };
    });
    ok('1440: de looks in het raster, de groepsregels weg, de prijs per kaart', s.grid === 'grid' && s.groep === 0 && s.perKaart === 5, JSON.stringify(s));
    await ctx.close();
  }
} finally {
  await browser.close();
  server.close();
}

console.log(`\n${pass}/${pass + fail} geslaagd`);
process.exit(fail ? 1 : 0);
