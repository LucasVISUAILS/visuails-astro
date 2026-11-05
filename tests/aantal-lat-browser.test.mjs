/**
 * VISUAILS — het aantal in het bestelformulier als lat (levering 88, 4 november 2026; lijst 76, B1: a2).
 *
 *   node tests/aantal-lat-browser.test.mjs      (npm run test:aantallat; na de build: leest dist/)
 *
 * Lucas (lijst 75): "Ik wil dat de product hoeveelheid keuze in het bestelformulier veel subtieler word het is nu 1 groot
 * blok en kan veel simpeler en mooier dan dit." Was: een blok met − 1 +, de knopjes 1 · 5 · 10 · 20 en rechts de
 * prijslijst. Nu het getal met het woord en het tarief, een schuif van 1 tot 20 en daaronder de treden (snelknoppen en
 * prijslijst tegelijk).
 *
 *   1 · de bron: geen − / + en geen knopjes meer, wel de schuif en de treden, met de prijzen uit LADDER;
 *   2 · in de browser (catalog en lifestyle, 1440 en 390): het getal, de schuif en de keuzelijst die post lopen gelijk,
 *       met de muis, de pijltjes, typen en de treden; het tarief en het woord kloppen; de trede die geldt staat aan; de
 *       treden passen in de breedte en zijn leesbaar; geen horizontale scroll; geen scriptfouten.
 */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { browserPad } from '../scripts/lib/browserpad.mjs';
import { LADDER, FORM_MAX_PRODUCTS } from '../src/data/pricing.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lees = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
let goed = 0, fout = 0;
const ok = (naam, cond, extra = '') => { if (cond) goed++; else fout++; console.log(`${cond ? ' ok  ' : ' FAIL'} ${naam}${cond || !extra ? '' : ` — ${extra}`}`); };
const euro = (n) => `€${n}`;
const tarief = (soort, n) => LADDER[soort].find(([lo, hi]) => n >= lo && (hi === null || n <= hi))[2];

console.log('\n1 · de bron');
const flow = lees('src/components/order/OrderFlow.astro');
ok('geen − / + en geen knopjes 1 · 5 · 10 · 20 meer (ook hun stijl en teksten niet)', !/data-pl-qty-dec|data-pl-qty-inc|pl-qty-chip|pl-qty-btn|qtyQuick/.test(flow.replace(/\{\/\*[\s\S]*?\*\/\}/g, '')));
ok('de schuif (1 tot het maximum) en de treden onder de schuif', /type="range" class="pl-qty-schuif" min="1" max=\{maxProducts\}/.test(flow) && /<div class="pl-qty-lat">[\s\S]*?data-wk-trap/.test(flow));
ok('het getalveld draagt nog steeds de eis (data-pl-req) en de schuif niet', /data-pl-qty-input\s+data-pl-req="1"/.test(flow) && !/data-pl-qty-lat[^>]*data-pl-req/.test(flow));
const pipe = lees('src/scripts/pipeline.js');
ok('bindQty laat de schuif en het veld elkaar volgen', /const lat = q\('\[data-pl-qty-lat\]', box\)/.test(pipe) && /lat\.addEventListener\('input'/.test(pipe));
const DIST = path.join(ROOT, 'dist');
if (!fs.existsSync(path.join(DIST, 'nl', 'start', 'catalog', 'index.html'))) { ok('dist/nl/start/catalog bestaat (eerst de build)', false); process.exit(1); }

console.log('\n2 · in de browser');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.avif': 'image/avif', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json', '.woff2': 'font/woff2' };
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
const fouten = [];
try {
  for (const [soort, pad] of [['catalog', '/nl/start/catalog/'], ['lifestyle', '/nl/start/lifestyle/']]) {
    for (const breed of [1440, 390]) {
      const tag = `${soort} ${breed}`;
      const page = await browser.newPage({ viewport: { width: breed, height: 900 } });
      page.on('pageerror', (e) => fouten.push(`${tag}: ${e.message}`));
      await page.goto(BASIS + pad, { waitUntil: 'load' });
      await page.evaluate(() => { document.getElementById('cc-bar')?.remove(); document.querySelector('.wa-launcher')?.remove(); });
      await page.locator('.wk-blok-aantal').scrollIntoViewIfNeeded();
      const st = () => page.evaluate(() => ({
        n: document.querySelector('[data-pl-qty-input]').value, lat: document.querySelector('[data-pl-qty-lat]').value,
        sel: document.querySelector('select[name=products]').value, nu: (document.querySelector('.wk-trap li.is-nu')?.textContent || '').trim(),
        tarief: document.querySelector('[data-pl-qty-tarief]').textContent.trim(), woord: document.querySelector('[data-pl-qty-woord]').textContent.trim(),
        p: document.querySelector('[data-pl-qty-lat]').style.getPropertyValue('--p'),
      }));
      const s0 = await st();
      ok(`${tag}: begint op 1 product, ${euro(tarief(soort, 1))} per product, trede 1–4 aan`, s0.n === '1' && s0.lat === '1' && s0.sel === '1' && /^1–4/.test(s0.nu) && s0.tarief === `${euro(tarief(soort, 1))} per product` && s0.woord === 'product', JSON.stringify(s0));
      await page.click('.wk-trap [data-pl-qty-set="10"]'); await page.waitForTimeout(120);
      const s1 = await st();
      ok(`${tag}: de trede 10–19 aanklikken zet 10, met ${euro(tarief(soort, 10))}`, s1.n === '10' && s1.lat === '10' && s1.sel === '10' && /^10–19/.test(s1.nu) && s1.tarief === `${euro(tarief(soort, 10))} per product` && s1.woord === 'producten', JSON.stringify(s1));
      await page.focus('[data-pl-qty-lat]'); await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight'); await page.waitForTimeout(120);
      const s2 = await st();
      ok(`${tag}: twee keer het pijltje: 12, de lijn tot 57,9 %`, s2.n === '12' && s2.sel === '12' && Math.abs(parseFloat(s2.p) - (11 / 19) * 100) < 0.1, JSON.stringify(s2));
      await page.fill('[data-pl-qty-input]', '4'); await page.waitForTimeout(120);
      const s3 = await st();
      ok(`${tag}: 4 typen zet de schuif op 4`, s3.lat === '4' && s3.sel === '4' && /^1–4/.test(s3.nu), JSON.stringify(s3));
      const r = await page.locator('[data-pl-qty-lat]').boundingBox();
      await page.mouse.click(r.x + 11 + (r.width - 22) * (19 / 19), r.y + r.height / 2); await page.waitForTimeout(120);
      const s4 = await st();
      ok(`${tag}: helemaal rechts klikken: ${FORM_MAX_PRODUCTS}, ${euro(tarief(soort, FORM_MAX_PRODUCTS))}`, s4.n === String(FORM_MAX_PRODUCTS) && s4.sel === String(FORM_MAX_PRODUCTS) && s4.tarief === `${euro(tarief(soort, FORM_MAX_PRODUCTS))} per product`, JSON.stringify(s4));
      /* de treden: binnen de lat, niet over elkaar, leesbaar */
      const m = await page.evaluate(() => {
        const lat = document.querySelector('.pl-qty-lat').getBoundingClientRect();
        const kn = [...document.querySelectorAll('.pl-qty-lat .wk-trap button')].map((b) => b.getBoundingClientRect());
        const overlap = kn.some((a, i) => kn.some((b, j) => j > i && a.right > b.left + 1 && b.right > a.left + 1));
        const binnen = kn.every((b) => b.left >= lat.left - 1 && b.right <= lat.right + 1);
        const span = getComputedStyle(document.querySelector('.pl-qty-lat .wk-trap li:not(.is-nu) span'));
        return { overlap, binnen, px: parseFloat(span.fontSize), kleur: span.color, sw: document.documentElement.scrollWidth, vw: innerWidth };
      });
      ok(`${tag}: de treden passen naast elkaar in de lat, tekst ≥ 11,5 px in grijs`, !m.overlap && m.binnen && m.px >= 11.5 && m.kleur === 'rgb(99, 105, 116)', JSON.stringify(m));
      ok(`${tag}: geen horizontale scroll`, m.sw <= m.vw, JSON.stringify(m));
      const hint = await page.evaluate(() => { const h = document.querySelector('.pl-qty-onder > .hint:not(.pl-outfit-note)'); return h ? getComputedStyle(h).display : 'geen'; });
      ok(`${tag}: "Tot 20 producten …" staat niet meer onder de lat (de lat zegt het)`, hint === 'none' || hint === 'geen', hint);
      await page.close();
    }
  }
  ok('geen scriptfouten', fouten.length === 0, fouten.slice(0, 3).join(' | '));
} finally {
  await browser.close();
  server.close();
}
console.log(`\n${goed} goed, ${fout} fout`);
process.exit(fout ? 1 : 0);
